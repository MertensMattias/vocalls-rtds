'use strict';

/**
 * core/subagentRunner.js
 *
 * The runtime that dispatches one pipeline stage to Claude (or the
 * deterministic stub) and returns a validated dispatch result. The
 * orchestrator (`bin/vocalls.js`) drives the FSM by calling
 * `dispatch(stage, state, deps?)` once per turn, then feeds the
 * returned `{ token, slice?, findings?, routeTo?, reason?, gateName?,
 * perLanguage? }` into `core/orchestratorFsm.js#applyResult`.
 *
 * Two execution paths (DESIGN §7 / §8 / R2):
 *
 *   1. Stub mode — client exposes a `dispatch` function and no
 *      `messages` SDK surface. Used by `core/sdk-stub.js` (in tests and
 *      `VOCALLS_SDK_STUB=1` end-to-end runs) and by test-injected
 *      doubles. Runner delegates: `client.dispatch(stage, state,
 *      extras)` returns the canned aggregated result. No tool-use
 *      loop, no Anthropic calls. For translate stage, `extras` carries
 *      `{ targetLanguage }`.
 *
 *   2. Production mode — client is an Anthropic SDK instance with
 *      `messages.stream({...}).finalMessage()`. Runner builds the
 *      per-stage system prompt + projection + tools and runs the
 *      manual tool-use loop documented in the claude-api skill:
 *      stream `messages.stream({...}).finalMessage()`, inspect the
 *      assistant turn, validate each `tool_use` input against the
 *      stage's Zod schema, feed `tool_result`s back, repeat until
 *      `stop_reason === 'end_turn'`. The required final tool call is
 *      `report_status`, which carries the dispatch result. The
 *      production-mode stream call carries `cache_control: { type:
 *      'ephemeral' }` so the system + tools prefix is cached across
 *      turns (DESIGN §7 invariant).
 *
 * Translator fan-out (DESIGN §F4): when `stage === 'translate'` the
 * runner iterates non-primary languages whose translator hash is
 * stale or missing, dispatching one per-language call each, and
 * aggregates the per-language outcomes. First per-language failure
 * ends the attempt; succeeded languages keep their hashes so the next
 * repair round only retries the failed ones. STAGE_ESCALATED from a
 * per-language dispatch propagates (refusal is not retry-recoverable);
 * STAGE_FAILED becomes the aggregated outcome with the failed lang's
 * translator hash cleared on the in-memory state object.
 *
 * Prompt-cache breakpoint placement (DESIGN §7 / claude-api skill):
 * the stream call carries top-level `cache_control: { type: 'ephemeral'
 * }`, which auto-places the breakpoint on the last cacheable block in
 * the `tools` → `system` → `messages` render order. Each breakpoint
 * walks backward at most 20 content blocks to find a prior cache entry,
 * so any single turn that adds >20 blocks (e.g. an agentic loop with
 * many tool_use / tool_result pairs) will silently miss the cache on
 * the next request. The pipeline's per-stage call shape (one user-turn
 * projection plus at most ~3 tool round-trips before `report_status`)
 * stays well under that window, but the limit is worth knowing if a
 * future stage starts emitting longer turns.
 *
 * Errors are module-prefixed and thrown:
 *   - Unknown stage
 *   - Missing report_status when `stop_reason === 'end_turn'`
 *   - `stop_reason === 'max_tokens'` (truncated tool_use cannot be
 *     safely re-fed; this is fatal)
 *   - max_iterations exceeded
 *   - Anthropic.BadRequestError — detected via `instanceof` when the
 *     SDK is loadable, else via `err.status === 400` (likely a schema
 *     bug; SDK already wraps RateLimit / Overloaded / APIError retries)
 *
 * Public API:
 *   dispatch(stage, state, deps?) → Promise<DispatchResult>
 *     deps fields (all optional):
 *       client        — override SDK client (defaults to getClient())
 *       briefText     — required by the intake projection; runner reads
 *                       state.brief.path if not provided
 *       onTelemetry   — `(event) => void`; called once per Claude turn
 *                       with `{ stage, model, mode, stop_reason,
 *                       usage?, targetLanguage?, turn }`
 *       maxIterations — manual-loop safety cap; default 10
 */

const fs = require('fs');

const { getClient } = require('./sdk-client');
const { loadStage } = require('./prompts/loader');
const { toolsetFor, WriteStateSliceSchema, ReportFindingsSchema, ReportStatusSchema } = require('./stageTools');
const { STAGE_CONFIG, STAGES } = require('./orchestrator-constants');
const { canonicalHash } = require('./canonicalHash');

const { buildIntakeProjection } = require('./prompts/projections/intake');
const { buildScenarioDesignProjection } = require('./prompts/projections/scenarioDesign');
const { buildConfigBuildProjection } = require('./prompts/projections/configBuild');
const { buildValidateProjection } = require('./prompts/projections/validate');
const { buildTranslateProjection } = require('./prompts/projections/translate');

const DEFAULT_MAX_ITERATIONS = 10;

// Stub-mode marker preferred over duck-typing. `core/sdk-stub.js` sets
// `__stub__: true`; injected test doubles may declare the same. We
// still fall back to "has dispatch but no messages.stream" so existing
// minimal stubs work, but the explicit flag is the contract.
function isStubClient(client) {
    if (!client) return false;
    if (client.__stub__ === true) return true;
    if (typeof client.dispatch !== 'function') return false;
    const messages = client.messages;
    if (messages && typeof messages.stream === 'function') return false;
    return true;
}

// Detect Anthropic.BadRequestError robustly. instanceof is the SDK's
// official contract, but the SDK may not be loadable in pure stub-mode
// environments; fall back to HTTP status. err.name is intentionally
// NOT used (it can be 'Error' on some thrown shapes).
function isBadRequestError(err) {
    if (!err) return false;
    try {
        const { Anthropic } = require('@anthropic-ai/sdk');
        if (Anthropic && Anthropic.BadRequestError && err instanceof Anthropic.BadRequestError) {
            return true;
        }
    } catch (_loadErr) {
        // SDK not installed — fall through to status check.
    }
    return err.status === 400;
}

function noopTelemetry() {}

function buildProjection(stage, state, deps) {
    switch (stage) {
        case 'intake': {
            const briefText =
                typeof deps.briefText === 'string'
                    ? deps.briefText
                    : fs.readFileSync(state.brief.path, 'utf8');
            return buildIntakeProjection(state, { briefText });
        }
        case 'scenarioDesign':
            return buildScenarioDesignProjection(state);
        case 'configBuild':
            return buildConfigBuildProjection(state);
        case 'validate':
            return buildValidateProjection(state);
        case 'translate':
            // Per-language projection is built by the caller (it needs
            // targetLanguage from deps); this entry point is unused.
            throw new Error(
                'subagentRunner.buildProjection: translate uses per-language buildTranslateProjection; route via dispatchTranslate'
            );
        default:
            throw new Error(
                `subagentRunner.buildProjection: unsupported stage "${stage}"`
            );
    }
}

function validateToolInput(stage, toolName, input) {
    let schema;
    if (toolName === 'write_state_slice') schema = WriteStateSliceSchema[stage];
    else if (toolName === 'report_findings') schema = ReportFindingsSchema;
    else if (toolName === 'report_status') schema = ReportStatusSchema;
    else {
        return {
            ok: false,
            error: `subagentRunner: unknown tool "${toolName}" for stage "${stage}"`,
        };
    }
    if (!schema) {
        return {
            ok: false,
            error: `subagentRunner: no schema for tool "${toolName}" at stage "${stage}"`,
        };
    }
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
        const issues = parsed.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; ');
        return { ok: false, error: `schema validation failed: ${issues}` };
    }
    return { ok: true, value: parsed.data };
}

function aggregateFromStatus(statusInput, capturedSlice, capturedFindings) {
    const out = {
        token: statusInput.token,
        reason: statusInput.reason,
    };
    if (statusInput.routeTo) out.routeTo = statusInput.routeTo;
    if (statusInput.gateName) out.gateName = statusInput.gateName;
    if (capturedSlice !== undefined) out.slice = capturedSlice;
    if (capturedFindings.length > 0) out.findings = capturedFindings;
    return out;
}

// ---------------------------------------------------------------------------
// Manual tool-use loop (single source of truth for production-mode
// dispatch). Used by both non-translate stages and per-language
// translate calls so the cache_control, BadRequestError, max_tokens,
// and report_status invariants live in exactly one place.
// ---------------------------------------------------------------------------

/**
 * Run one production-mode dispatch turn loop.
 *
 * @param {object} args
 * @param {string} args.stage         stage name (used for error messages + schema selection)
 * @param {object} args.projection    Tier B user-turn projection payload
 * @param {object} args.cfg           STAGE_CONFIG[stage] entry
 * @param {object} args.client        Anthropic-shaped client
 * @param {string} args.systemPrompt  cached system prompt
 * @param {Array} args.tools          stage toolset (frozen)
 * @param {boolean} args.allowFindings whether report_findings is part of this stage's contract
 * @param {Function} args.onTelemetry telemetry hook
 * @param {number} args.maxIterations safety cap
 * @param {object} [args.telemetryExtra] extra fields merged into each telemetry event
 * @param {string} [args.errorContext] suffix appended to error messages (e.g. lang="FR")
 * @returns {Promise<DispatchResult>}
 */
async function runManualLoop(args) {
    const {
        stage,
        projection,
        cfg,
        client,
        systemPrompt,
        tools,
        allowFindings,
        onTelemetry,
        maxIterations,
        telemetryExtra,
        errorContext,
    } = args;

    const messages = [{ role: 'user', content: JSON.stringify(projection) }];
    let capturedSlice;
    const capturedFindings = [];
    let capturedStatus;

    for (let turn = 0; turn < maxIterations; turn++) {
        const streamOpts = {
            model: cfg.model,
            max_tokens: cfg.maxTokens,
            system: systemPrompt,
            messages,
            tools,
            cache_control: { type: 'ephemeral' },
        };
        if (cfg.effort) streamOpts.output_config = { effort: cfg.effort };
        if (cfg.thinking) streamOpts.thinking = cfg.thinking;

        let message;
        try {
            const stream = client.messages.stream(streamOpts);
            message = await stream.finalMessage();
        } catch (err) {
            if (isBadRequestError(err)) {
                throw new Error(
                    `subagentRunner.dispatch: BadRequestError at stage "${stage}"${errorContext ? ' ' + errorContext : ''} turn ${turn}: ${err.message || String(err)}`
                );
            }
            throw err;
        }

        onTelemetry({
            stage,
            model: cfg.model,
            mode: 'live',
            stop_reason: message.stop_reason,
            usage: message.usage,
            turn,
            ...(telemetryExtra || {}),
        });

        if (message.stop_reason === 'refusal') {
            return { token: 'STAGE_ESCALATED', reason: 'refusal' };
        }
        if (message.stop_reason === 'max_tokens') {
            throw new Error(
                `subagentRunner.dispatch: stop_reason='max_tokens' at stage "${stage}"${errorContext ? ' ' + errorContext : ''} turn ${turn}; tool_use output truncated and cannot be safely re-fed`
            );
        }

        const contentBlocks = Array.isArray(message.content) ? message.content : [];
        const toolResults = [];
        for (const block of contentBlocks) {
            if (!block || block.type !== 'tool_use') continue;
            // Guard malformed tool_use blocks before we use their ids
            // downstream (a missing tool_use_id corrupts the next turn).
            if (typeof block.id !== 'string' || typeof block.name !== 'string') {
                throw new Error(
                    `subagentRunner.dispatch: malformed tool_use block (missing id or name) at stage "${stage}"${errorContext ? ' ' + errorContext : ''} turn ${turn}`
                );
            }
            const v = validateToolInput(stage, block.name, block.input);
            if (!v.ok) {
                toolResults.push({
                    type: 'tool_result',
                    tool_use_id: block.id,
                    is_error: true,
                    content: v.error,
                });
                continue;
            }
            if (block.name === 'write_state_slice') {
                capturedSlice = v.value;
            } else if (block.name === 'report_findings') {
                if (!allowFindings) {
                    toolResults.push({
                        type: 'tool_result',
                        tool_use_id: block.id,
                        is_error: true,
                        content: `report_findings is not allowed at stage "${stage}"`,
                    });
                    continue;
                }
                for (const f of v.value.findings) capturedFindings.push(f);
            } else if (block.name === 'report_status') {
                capturedStatus = v.value;
            }
            toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: 'ok',
            });
        }

        messages.push({ role: 'assistant', content: contentBlocks });
        if (toolResults.length > 0) {
            messages.push({ role: 'user', content: toolResults });
        }

        if (message.stop_reason === 'end_turn') {
            if (!capturedStatus) {
                throw new Error(
                    `subagentRunner.dispatch: missing report_status at stop_reason='end_turn' (stage="${stage}"${errorContext ? ' ' + errorContext : ''})`
                );
            }
            return aggregateFromStatus(capturedStatus, capturedSlice, capturedFindings);
        }
        // stop_reason === 'tool_use' (or other non-terminal): continue.
    }

    throw new Error(
        `subagentRunner.dispatch: max_iterations (${maxIterations}) exceeded at stage "${stage}"${errorContext ? ' ' + errorContext : ''}`
    );
}

async function dispatchSingleStage(stage, state, deps, client, onTelemetry) {
    const { systemPrompt } = loadStage(stage);
    const projection = buildProjection(stage, state, deps);
    const tools = toolsetFor(stage);
    const cfg = STAGE_CONFIG[stage];
    const maxIterations =
        typeof deps.maxIterations === 'number' ? deps.maxIterations : DEFAULT_MAX_ITERATIONS;
    return runManualLoop({
        stage,
        projection,
        cfg,
        client,
        systemPrompt,
        tools,
        allowFindings: stage === 'validate',
        onTelemetry,
        maxIterations,
    });
}

// ---------------------------------------------------------------------------
// Translator fan-out
// ---------------------------------------------------------------------------

function languagesNeedingTranslation(state) {
    const meta = state._meta || {};
    const primary = meta.primaryLanguage;
    const all = Array.isArray(meta.languages) ? meta.languages : [];
    const hashes = (meta.inputHashes && meta.inputHashes.translator) || {};
    const out = [];
    for (const lang of all) {
        if (lang === primary) continue;
        const inputHash = canonicalHash({
            slotMap: state.slotMap,
            primaryLanguage: primary,
            targetLanguage: lang,
        });
        if (hashes[lang] !== inputHash) out.push(lang);
    }
    return out;
}

async function dispatchPerLanguage(state, deps, client, onTelemetry, targetLanguage) {
    if (isStubClient(client)) {
        const result = client.dispatch('translate', state, { targetLanguage });
        onTelemetry({
            stage: 'translate',
            mode: 'stub',
            targetLanguage,
            stop_reason: 'stub',
        });
        return result;
    }

    const { systemPrompt } = loadStage('translate');
    const projection = buildTranslateProjection(state, { targetLanguage });
    const tools = toolsetFor('translate');
    const cfg = STAGE_CONFIG.translate;
    const maxIterations =
        typeof deps.maxIterations === 'number' ? deps.maxIterations : DEFAULT_MAX_ITERATIONS;
    return runManualLoop({
        stage: 'translate',
        projection,
        cfg,
        client,
        systemPrompt,
        tools,
        allowFindings: false,
        onTelemetry,
        maxIterations,
        telemetryExtra: { targetLanguage },
        errorContext: `lang="${targetLanguage}"`,
    });
}

// On per-language failure, clear the language's translator hash on
// the in-memory state so the FSM's next dispatch round retries the
// failed language (DESIGN §F4). The state passed to the runner is a
// clone owned by the orchestrator; mutating it here is the contract.
function clearTranslatorHash(state, lang) {
    if (!state._meta) return;
    if (!state._meta.inputHashes) return;
    if (!state._meta.inputHashes.translator) return;
    delete state._meta.inputHashes.translator[lang];
}

async function dispatchTranslate(state, deps, client, onTelemetry) {
    const targets = languagesNeedingTranslation(state);
    if (targets.length === 0) {
        onTelemetry({ stage: 'translate', mode: 'noop', stop_reason: 'all-languages-fresh' });
        return {
            token: 'STAGE_NOOP',
            reason: 'all non-primary languages already have matching translator hashes',
            perLanguage: [],
        };
    }

    const perLanguage = [];
    for (const lang of targets) {
        let result;
        try {
            result = await dispatchPerLanguage(state, deps, client, onTelemetry, lang);
        } catch (err) {
            clearTranslatorHash(state, lang);
            return {
                token: 'STAGE_FAILED',
                routeTo: 'translate',
                reason: `translate lang="${lang}" threw: ${err.message}`,
                perLanguage,
            };
        }
        perLanguage.push({ lang, result });

        // Refusal is not retry-recoverable — propagate STAGE_ESCALATED
        // rather than rewriting it to STAGE_FAILED (which would burn
        // through REPAIR_CAP).
        if (result.token === 'STAGE_ESCALATED') {
            clearTranslatorHash(state, lang);
            return {
                token: 'STAGE_ESCALATED',
                reason: `translate lang="${lang}": ${result.reason || 'escalated'}`,
                perLanguage,
            };
        }
        if (result.token !== 'STAGE_COMPLETE') {
            clearTranslatorHash(state, lang);
            return {
                token: 'STAGE_FAILED',
                routeTo: 'translate',
                reason: `translate lang="${lang}" returned ${result.token}`,
                perLanguage,
            };
        }
    }

    return {
        token: 'STAGE_COMPLETE',
        reason: `translated ${targets.length} language(s): ${targets.join(', ')}`,
        perLanguage,
    };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

async function dispatch(stage, state, deps) {
    if (typeof stage !== 'string' || !STAGES.includes(stage)) {
        throw new Error(`subagentRunner.dispatch: unknown stage "${stage}"`);
    }
    if (!state || !state._meta) {
        throw new Error('subagentRunner.dispatch: state._meta is required');
    }
    const d = deps || {};
    const client = d.client || getClient();
    const onTelemetry = typeof d.onTelemetry === 'function' ? d.onTelemetry : noopTelemetry;

    if (stage === 'translate') {
        return dispatchTranslate(state, d, client, onTelemetry);
    }

    if (isStubClient(client)) {
        const result = client.dispatch(stage, state);
        onTelemetry({ stage, mode: 'stub', stop_reason: 'stub' });
        return result;
    }

    return dispatchSingleStage(stage, state, d, client, onTelemetry);
}

module.exports = { dispatch };
