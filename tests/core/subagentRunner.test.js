'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const { dispatch } = require('../../core/subagentRunner');
const sdkStub = require('../../core/sdk-stub');
const { canonicalHash } = require('../../core/canonicalHash');
const { STAGE_CONFIG } = require('../../core/orchestrator-constants');

const defaultFixtures = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '..', '__fixtures__', 'sdk-stub-fixtures.json'),
        'utf8'
    )
);

function writeTempBrief() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vocalls-runner-'));
    const brief = path.join(dir, 'brief.md');
    fs.writeFileSync(brief, '---\nproject: demo\nprimary: NL\n---\n# body\n', 'utf8');
    return { dir, brief };
}

function baseState(briefPath, overrides = {}) {
    return {
        _meta: {
            schemaVersion: '2',
            project: 'demo',
            primaryLanguage: 'NL',
            languages: ['NL', 'FR', 'DE', 'EN'],
            stage: 'intake',
            status: 'running',
            repairRound: 0,
            repairHistory: [],
            createdAt: '2026-05-19T00:00:00.000Z',
            updatedAt: '2026-05-19T00:00:00.000Z',
            inputHashes: {},
            ...overrides,
        },
        brief: { path: briefPath, sha256: 'aaa' },
        control: { userGates: {} },
    };
}

// --- Fake streaming Anthropic client (for prod-path tests) ---
//
// Implements the minimal `client.messages.stream({...}).finalMessage()`
// interface. Tests pass an array of canned assistant turns; each
// stream call pops one and returns it as the finalMessage. Tests can
// also inspect `calls` to assert how many times stream was invoked.
function fakeAnthropic(turns) {
    const calls = [];
    const queue = turns.slice();
    return {
        calls,
        messages: {
            stream(opts) {
                calls.push(opts);
                const turn = queue.shift();
                if (!turn) {
                    throw new Error('fakeAnthropic: turn queue exhausted');
                }
                return {
                    async finalMessage() {
                        return turn;
                    },
                };
            },
        },
    };
}

function tu(id, name, input) {
    return { type: 'tool_use', id, name, input };
}

function assistantTurn(blocks, stop_reason = 'tool_use', usage) {
    return {
        stop_reason,
        content: blocks,
        usage: usage || { input_tokens: 1, output_tokens: 1 },
    };
}

describe('subagentRunner — stub-mode passthrough', () => {
    beforeEach(() => sdkStub.resetDispatchLog());

    test('dispatch("intake") returns the canned aggregated fixture', async () => {
        const tmp = writeTempBrief();
        try {
            const result = await dispatch(
                'intake',
                baseState(tmp.brief),
                { client: sdkStub }
            );
            expect(result).toEqual(defaultFixtures.intake);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('fires the telemetry hook in stub mode', async () => {
        const tmp = writeTempBrief();
        const events = [];
        try {
            await dispatch('scenarioDesign', baseState(tmp.brief), {
                client: sdkStub,
                onTelemetry: (e) => events.push(e),
            });
            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({ stage: 'scenarioDesign', mode: 'stub' });
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('throws on unknown stage', async () => {
        const tmp = writeTempBrief();
        try {
            await expect(
                dispatch('nope', baseState(tmp.brief), { client: sdkStub })
            ).rejects.toThrow(/unknown stage "nope"/);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('throws when state._meta is missing', async () => {
        await expect(
            dispatch('intake', { brief: {} }, { client: sdkStub })
        ).rejects.toThrow(/state\._meta is required/);
    });
});

describe('subagentRunner — production-loop invariants', () => {
    test('streamOpts always include cache_control: ephemeral (DESIGN §7)', async () => {
        const tmp = writeTempBrief();
        try {
            const client = fakeAnthropic([
                assistantTurn(
                    [tu('s', 'report_status', { token: 'STAGE_COMPLETE', reason: 'ok' })],
                    'end_turn'
                ),
            ]);
            await dispatch('intake', baseState(tmp.brief), { client });
            expect(client.calls[0].cache_control).toEqual({ type: 'ephemeral' });
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('cfg.thinking is forwarded when set (scenarioDesign)', async () => {
        const tmp = writeTempBrief();
        try {
            const state = baseState(tmp.brief, {
                stage: 'scenarioDesign',
                primaryLanguage: 'NL',
                languages: ['NL'],
            });
            const client = fakeAnthropic([
                assistantTurn(
                    [tu('s', 'report_status', { token: 'STAGE_COMPLETE', reason: 'ok' })],
                    'end_turn'
                ),
            ]);
            await dispatch('scenarioDesign', state, { client });
            expect(client.calls[0].thinking).toBeDefined();
            expect(client.calls[0].thinking).toEqual(STAGE_CONFIG.scenarioDesign.thinking);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('cfg.thinking and cfg.effort are both omitted for translate stage (Haiku 4.5 supports neither)', async () => {
        const tmp = writeTempBrief();
        try {
            // Translate stage uses Haiku 4.5, which rejects output_config.effort
            // and is not documented to support adaptive thinking — the stage
            // config declares neither, and the runner's `if (cfg.xxx)` gates
            // must keep both off the stream payload.
            const state = baseState(tmp.brief, {
                stage: 'translate',
                primaryLanguage: 'NL',
                languages: ['NL', 'FR'],
            });
            const client = fakeAnthropic([
                assistantTurn(
                    [
                        tu('a', 'write_state_slice', {
                            NL: 'complete',
                            FR: 'complete',
                            DE: 'pending',
                            EN: 'pending',
                        }),
                        tu('b', 'report_status', { token: 'STAGE_COMPLETE', reason: 'ok' }),
                    ],
                    'end_turn'
                ),
            ]);
            await dispatch('translate', state, { client });
            expect(client.calls[0].thinking).toBeUndefined();
            expect(client.calls[0].output_config).toBeUndefined();
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('cfg.effort is forwarded as output_config.effort (intake → high)', async () => {
        const tmp = writeTempBrief();
        try {
            const client = fakeAnthropic([
                assistantTurn(
                    [tu('s', 'report_status', { token: 'STAGE_COMPLETE', reason: 'ok' })],
                    'end_turn'
                ),
            ]);
            await dispatch('intake', baseState(tmp.brief), { client });
            expect(client.calls[0].output_config).toEqual({
                effort: STAGE_CONFIG.intake.effort,
            });
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('cfg.effort reads per-stage (scenarioDesign → xhigh, distinct from intake)', async () => {
        const tmp = writeTempBrief();
        try {
            const state = baseState(tmp.brief, {
                stage: 'scenarioDesign',
                primaryLanguage: 'NL',
                languages: ['NL'],
            });
            const client = fakeAnthropic([
                assistantTurn(
                    [tu('s', 'report_status', { token: 'STAGE_COMPLETE', reason: 'ok' })],
                    'end_turn'
                ),
            ]);
            await dispatch('scenarioDesign', state, { client });
            expect(client.calls[0].output_config).toEqual({
                effort: STAGE_CONFIG.scenarioDesign.effort,
            });
            expect(STAGE_CONFIG.scenarioDesign.effort).not.toEqual(
                STAGE_CONFIG.intake.effort
            );
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('stop_reason="max_tokens" is fatal (truncated tool_use cannot be re-fed)', async () => {
        const tmp = writeTempBrief();
        try {
            const client = fakeAnthropic([assistantTurn([], 'max_tokens')]);
            await expect(
                dispatch('intake', baseState(tmp.brief), { client })
            ).rejects.toThrow(/stop_reason='max_tokens'/);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('BadRequestError is rewrapped with stage + turn context (status 400 fallback)', async () => {
        const tmp = writeTempBrief();
        try {
            const badErr = Object.assign(new Error('schema bug'), { status: 400 });
            const client = {
                messages: {
                    stream() {
                        return {
                            async finalMessage() {
                                throw badErr;
                            },
                        };
                    },
                },
            };
            await expect(
                dispatch('intake', baseState(tmp.brief), { client })
            ).rejects.toThrow(/BadRequestError at stage "intake" turn 0/);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('non-BadRequest errors propagate raw (not rewrapped)', async () => {
        const tmp = writeTempBrief();
        try {
            const someErr = new Error('network timeout');
            const client = {
                messages: {
                    stream() {
                        return {
                            async finalMessage() {
                                throw someErr;
                            },
                        };
                    },
                },
            };
            await expect(
                dispatch('intake', baseState(tmp.brief), { client })
            ).rejects.toBe(someErr);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('malformed tool_use block (missing id) throws fatally', async () => {
        const tmp = writeTempBrief();
        try {
            const client = fakeAnthropic([
                assistantTurn(
                    [{ type: 'tool_use', name: 'report_status', input: { token: 'STAGE_COMPLETE', reason: 'ok' } }],
                    'tool_use'
                ),
            ]);
            await expect(
                dispatch('intake', baseState(tmp.brief), { client })
            ).rejects.toThrow(/malformed tool_use block/);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('text blocks alongside tool_use are preserved in history without being treated as tool calls', async () => {
        const tmp = writeTempBrief();
        try {
            const client = fakeAnthropic([
                assistantTurn(
                    [
                        { type: 'text', text: 'thinking aloud about the brief' },
                        tu('s', 'report_status', { token: 'STAGE_COMPLETE', reason: 'ok' }),
                    ],
                    'end_turn'
                ),
            ]);
            const r = await dispatch('intake', baseState(tmp.brief), { client });
            expect(r.token).toBe('STAGE_COMPLETE');
            // The single assistant turn's content was pushed to history verbatim.
            expect(client.calls).toHaveLength(1);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('telemetry event forwards usage from the SDK response', async () => {
        const tmp = writeTempBrief();
        try {
            const events = [];
            const client = fakeAnthropic([
                assistantTurn(
                    [tu('s', 'report_status', { token: 'STAGE_COMPLETE', reason: 'ok' })],
                    'end_turn',
                    { input_tokens: 7, output_tokens: 11, cache_read_input_tokens: 5 }
                ),
            ]);
            await dispatch('intake', baseState(tmp.brief), {
                client,
                onTelemetry: (e) => events.push(e),
            });
            expect(events[0].usage).toEqual({
                input_tokens: 7,
                output_tokens: 11,
                cache_read_input_tokens: 5,
            });
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });
});

describe('subagentRunner — validate stage: report_findings capture', () => {
    function validateState(briefPath) {
        return baseState(briefPath, {
            stage: 'validate',
            primaryLanguage: 'NL',
            languages: ['NL'],
        });
    }

    test('report_findings entries accumulate into the dispatch result', async () => {
        const tmp = writeTempBrief();
        try {
            const findings = [
                {
                    check: 'check_19_dsl_bounds',
                    severity: 'error',
                    owner: 'scenarioDesign',
                    location: 'scenarios.x.objective',
                    detail: 'broken USE',
                    autofixable: false,
                },
                {
                    check: 'brief_fidelity',
                    severity: 'warning',
                    owner: 'intake',
                    location: 'cases.1.opening',
                    detail: 'paraphrased opening',
                    autofixable: false,
                },
            ];
            const client = fakeAnthropic([
                assistantTurn(
                    [
                        tu('a', 'report_findings', { findings }),
                        tu('b', 'report_status', { token: 'STAGE_PAUSED', gateName: 'qualityGate', reason: 'findings need review' }),
                    ],
                    'end_turn'
                ),
            ]);
            const r = await dispatch('validate', validateState(tmp.brief), { client });
            expect(r.token).toBe('STAGE_PAUSED');
            expect(r.gateName).toBe('qualityGate');
            expect(r.findings).toEqual(findings);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('report_findings is rejected at stages where it is not allowed (intake)', async () => {
        const tmp = writeTempBrief();
        try {
            const client = fakeAnthropic([
                // Turn 1: intake attempts report_findings — should be rejected.
                assistantTurn(
                    [tu('a', 'report_findings', { findings: [] })],
                    'tool_use'
                ),
                // Turn 2: intake corrects and ends turn.
                assistantTurn(
                    [tu('b', 'report_status', { token: 'STAGE_COMPLETE', reason: 'ok' })],
                    'end_turn'
                ),
            ]);
            const r = await dispatch('intake', baseState(tmp.brief), { client });
            expect(r.token).toBe('STAGE_COMPLETE');
            // Turn 2's user message should contain an is_error tool_result.
            const turn2User = client.calls[1].messages.find(
                (m) =>
                    m.role === 'user' &&
                    Array.isArray(m.content) &&
                    m.content[0] &&
                    m.content[0].type === 'tool_result'
            );
            expect(turn2User.content[0].is_error).toBe(true);
            expect(turn2User.content[0].content).toMatch(/report_findings is not allowed/);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });
});

describe('subagentRunner — manual loop with fake streaming client', () => {
    test('happy path: write_state_slice + report_status → STAGE_COMPLETE', async () => {
        const tmp = writeTempBrief();
        try {
            const slice = {
                projectName: 'demo',
                primaryLanguage: 'NL',
                languages: ['NL'],
                callDirection: 'inbound',
                cases: {},
                dispositionPolicy: 'default',
                persona: {
                    name: 'P',
                    companyName: 'C',
                    description: 'd',
                    tone: 't',
                    companyRole: 'r',
                },
            };
            const client = fakeAnthropic([
                assistantTurn(
                    [
                        tu('a', 'write_state_slice', slice),
                        tu('b', 'report_status', {
                            token: 'STAGE_COMPLETE',
                            reason: 'ok',
                        }),
                    ],
                    'end_turn'
                ),
            ]);
            const r = await dispatch('intake', baseState(tmp.brief), { client });
            expect(r.token).toBe('STAGE_COMPLETE');
            expect(r.slice).toEqual(expect.objectContaining({ projectName: 'demo' }));
            expect(client.calls).toHaveLength(1);
            // R3: model and effort come from STAGE_CONFIG, not from frontmatter
            expect(client.calls[0].model).toBe(STAGE_CONFIG.intake.model);
            expect(client.calls[0].max_tokens).toBe(STAGE_CONFIG.intake.maxTokens);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('schema violation → first tool_result is_error, then succeeds', async () => {
        const tmp = writeTempBrief();
        try {
            const goodSlice = {
                projectName: 'demo',
                primaryLanguage: 'NL',
                languages: ['NL'],
                callDirection: 'inbound',
                cases: {},
                dispositionPolicy: 'default',
                persona: {
                    name: 'P',
                    companyName: 'C',
                    description: 'd',
                    tone: 't',
                    companyRole: 'r',
                },
            };
            const client = fakeAnthropic([
                // Turn 1: malformed slice (missing required fields)
                assistantTurn(
                    [tu('a', 'write_state_slice', { projectName: 'demo' })],
                    'tool_use'
                ),
                // Turn 2: corrected slice + report_status, end_turn
                assistantTurn(
                    [
                        tu('b', 'write_state_slice', goodSlice),
                        tu('c', 'report_status', {
                            token: 'STAGE_COMPLETE',
                            reason: 'ok after fix',
                        }),
                    ],
                    'end_turn'
                ),
            ]);
            const r = await dispatch('intake', baseState(tmp.brief), { client });
            expect(r.token).toBe('STAGE_COMPLETE');
            expect(r.slice).toEqual(expect.objectContaining({ projectName: 'demo' }));
            expect(client.calls).toHaveLength(2);
            // Turn 2's messages must include the assistant turn-1 reply
            // and the is_error tool_result.
            const turn2Messages = client.calls[1].messages;
            const userMsgWithToolResult = turn2Messages.find(
                (m) =>
                    m.role === 'user' &&
                    Array.isArray(m.content) &&
                    m.content[0] &&
                    m.content[0].type === 'tool_result'
            );
            expect(userMsgWithToolResult).toBeTruthy();
            expect(userMsgWithToolResult.content[0].is_error).toBe(true);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('missing report_status at end_turn → throws', async () => {
        const tmp = writeTempBrief();
        try {
            const client = fakeAnthropic([
                assistantTurn([], 'end_turn'),
            ]);
            await expect(
                dispatch('intake', baseState(tmp.brief), { client })
            ).rejects.toThrow(/missing report_status/);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('stop_reason=refusal → synthesizes STAGE_ESCALATED', async () => {
        const tmp = writeTempBrief();
        try {
            const client = fakeAnthropic([
                assistantTurn([], 'refusal'),
            ]);
            const r = await dispatch('intake', baseState(tmp.brief), { client });
            expect(r).toEqual({ token: 'STAGE_ESCALATED', reason: 'refusal' });
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('max_iterations exceeded → throws', async () => {
        const tmp = writeTempBrief();
        try {
            // Each turn keeps stop_reason='tool_use' so the loop never exits.
            // Provide 3 turns and cap maxIterations at 2.
            const turns = [];
            for (let i = 0; i < 3; i++) {
                turns.push(assistantTurn([], 'tool_use'));
            }
            const client = fakeAnthropic(turns);
            await expect(
                dispatch('intake', baseState(tmp.brief), { client, maxIterations: 2 })
            ).rejects.toThrow(/max_iterations \(2\) exceeded/);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('telemetry hook fires once per turn with stage + model + stop_reason', async () => {
        const tmp = writeTempBrief();
        try {
            const events = [];
            const client = fakeAnthropic([
                assistantTurn(
                    [
                        tu('a', 'report_status', { token: 'STAGE_PAUSED', gateName: 'outstandingQuestions', reason: 'q' }),
                    ],
                    'end_turn'
                ),
            ]);
            await dispatch('intake', baseState(tmp.brief), {
                client,
                onTelemetry: (e) => events.push(e),
            });
            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({
                stage: 'intake',
                model: STAGE_CONFIG.intake.model,
                mode: 'live',
                stop_reason: 'end_turn',
            });
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });
});

describe('subagentRunner — translate fan-out (stub mode)', () => {
    function stateForTranslate(briefPath, overrides) {
        return baseState(briefPath, {
            primaryLanguage: 'NL',
            languages: ['NL', 'FR', 'DE', 'EN'],
            stage: 'translate',
            ...(overrides || {}),
        });
    }

    function makeStubTranslate(perLang) {
        // perLang: { FR: 'STAGE_COMPLETE', DE: 'STAGE_COMPLETE', ... }
        return {
            dispatch(stage, _state, opts) {
                if (stage !== 'translate') {
                    return { token: 'STAGE_COMPLETE', reason: 'stub' };
                }
                const lang = (opts && opts.targetLanguage) || 'UNKNOWN';
                const token = perLang[lang] || 'STAGE_COMPLETE';
                return { token, reason: `stub ${lang}` };
            },
        };
    }

    test('all 3 non-primary languages need translation → 3 calls, aggregate STAGE_COMPLETE', async () => {
        const tmp = writeTempBrief();
        try {
            const events = [];
            const client = makeStubTranslate({});
            const r = await dispatch(
                'translate',
                stateForTranslate(tmp.brief),
                { client, onTelemetry: (e) => events.push(e) }
            );
            expect(r.token).toBe('STAGE_COMPLETE');
            const translateEvents = events.filter((e) => e.targetLanguage);
            expect(translateEvents).toHaveLength(3);
            expect(translateEvents.map((e) => e.targetLanguage).sort()).toEqual(['DE', 'EN', 'FR']);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('1 of 3 languages already fresh → 2 calls (skip the matching one)', async () => {
        const tmp = writeTempBrief();
        try {
            const events = [];
            const client = makeStubTranslate({});
            const state = stateForTranslate(tmp.brief);
            // Pre-compute the canonical input hash for FR and store it
            // in state._meta.inputHashes.translator so that lang is
            // considered fresh.
            const frHash = canonicalHash({
                slotMap: state.slotMap,
                primaryLanguage: 'NL',
                targetLanguage: 'FR',
            });
            state._meta.inputHashes = { translator: { FR: frHash } };

            const r = await dispatch('translate', state, {
                client,
                onTelemetry: (e) => events.push(e),
            });
            expect(r.token).toBe('STAGE_COMPLETE');
            const langs = events
                .filter((e) => e.targetLanguage)
                .map((e) => e.targetLanguage)
                .sort();
            expect(langs).toEqual(['DE', 'EN']);
            expect(langs).not.toContain('FR');
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('1 of 3 languages fails → STAGE_FAILED with routeTo and the failed lang hash cleared', async () => {
        const tmp = writeTempBrief();
        try {
            const client = makeStubTranslate({ DE: 'STAGE_FAILED' });
            const state = stateForTranslate(tmp.brief);
            // Seed all 3 with stale hashes so all would dispatch.
            state._meta.inputHashes = {
                translator: { FR: 'stale', DE: 'stale', EN: 'stale' },
            };
            const r = await dispatch('translate', state, { client });
            expect(r.token).toBe('STAGE_FAILED');
            expect(r.routeTo).toBe('translate');
            // The failed lang's hash should be cleared in-state.
            expect(state._meta.inputHashes.translator.DE).toBeUndefined();
            // FR's hash is preserved (it succeeded before DE failed).
            expect(state._meta.inputHashes.translator.FR).toBe('stale');
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('all languages already fresh → 0 calls, STAGE_NOOP', async () => {
        const tmp = writeTempBrief();
        try {
            const events = [];
            const client = makeStubTranslate({});
            const state = stateForTranslate(tmp.brief);
            const slotMap = state.slotMap;
            const translator = {};
            for (const lang of ['FR', 'DE', 'EN']) {
                translator[lang] = canonicalHash({
                    slotMap,
                    primaryLanguage: 'NL',
                    targetLanguage: lang,
                });
            }
            state._meta.inputHashes = { translator };

            const r = await dispatch('translate', state, {
                client,
                onTelemetry: (e) => events.push(e),
            });
            expect(r.token).toBe('STAGE_NOOP');
            expect(events.filter((e) => e.targetLanguage)).toHaveLength(0);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('per-language throw clears the failed lang hash before returning STAGE_FAILED', async () => {
        const tmp = writeTempBrief();
        try {
            const client = {
                __stub__: true,
                dispatch(stage, _state, opts) {
                    if (stage === 'translate' && opts && opts.targetLanguage === 'FR') {
                        throw new Error('boom');
                    }
                    return { token: 'STAGE_COMPLETE', reason: 'ok' };
                },
            };
            const state = stateForTranslate(tmp.brief);
            state._meta.inputHashes = { translator: { FR: 'stale', DE: 'stale', EN: 'stale' } };
            const r = await dispatch('translate', state, { client });
            expect(r.token).toBe('STAGE_FAILED');
            expect(state._meta.inputHashes.translator.FR).toBeUndefined();
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('per-language STAGE_ESCALATED propagates (refusal is not retry-recoverable)', async () => {
        const tmp = writeTempBrief();
        try {
            const client = {
                __stub__: true,
                dispatch(stage, _state, opts) {
                    if (stage === 'translate' && opts && opts.targetLanguage === 'DE') {
                        return { token: 'STAGE_ESCALATED', reason: 'refusal' };
                    }
                    return { token: 'STAGE_COMPLETE', reason: 'ok' };
                },
            };
            const state = stateForTranslate(tmp.brief);
            state._meta.inputHashes = { translator: { FR: 'stale', DE: 'stale', EN: 'stale' } };
            const r = await dispatch('translate', state, { client });
            expect(r.token).toBe('STAGE_ESCALATED');
            expect(r.routeTo).toBeUndefined();
            expect(state._meta.inputHashes.translator.DE).toBeUndefined();
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('STAGE_NOOP carries perLanguage: [] for shape consistency', async () => {
        const tmp = writeTempBrief();
        try {
            const client = makeStubTranslate({});
            const state = stateForTranslate(tmp.brief);
            const slotMap = state.slotMap;
            const translator = {};
            for (const lang of ['FR', 'DE', 'EN']) {
                translator[lang] = canonicalHash({
                    slotMap,
                    primaryLanguage: 'NL',
                    targetLanguage: lang,
                });
            }
            state._meta.inputHashes = { translator };
            const r = await dispatch('translate', state, { client });
            expect(r.token).toBe('STAGE_NOOP');
            expect(r.perLanguage).toEqual([]);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });
});

describe('subagentRunner — translate fan-out (production loop, single language)', () => {
    test('happy-path live dispatchPerLanguage: write_state_slice + report_status', async () => {
        const tmp = writeTempBrief();
        try {
            const state = baseState(tmp.brief, {
                stage: 'translate',
                primaryLanguage: 'NL',
                languages: ['NL', 'FR'],
            });
            const client = fakeAnthropic([
                assistantTurn(
                    [
                        tu('a', 'write_state_slice', {
                            NL: 'complete',
                            FR: 'complete',
                            DE: 'pending',
                            EN: 'pending',
                        }),
                        tu('b', 'report_status', {
                            token: 'STAGE_COMPLETE',
                            reason: 'lang FR translated',
                        }),
                    ],
                    'end_turn'
                ),
            ]);
            const r = await dispatch('translate', state, { client });
            expect(r.token).toBe('STAGE_COMPLETE');
            expect(r.perLanguage).toHaveLength(1);
            expect(r.perLanguage[0].lang).toBe('FR');
            // cache_control was on the live stream call.
            expect(client.calls[0].cache_control).toEqual({ type: 'ephemeral' });
            // Telemetry carried targetLanguage.
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });

    test('live BadRequestError in dispatchPerLanguage surfaces through fan-out (with lang context)', async () => {
        const tmp = writeTempBrief();
        try {
            const state = baseState(tmp.brief, {
                stage: 'translate',
                primaryLanguage: 'NL',
                languages: ['NL', 'FR'],
            });
            const badErr = Object.assign(new Error('schema bug'), { status: 400 });
            const client = {
                messages: {
                    stream() {
                        return {
                            async finalMessage() {
                                throw badErr;
                            },
                        };
                    },
                },
            };
            const r = await dispatch('translate', state, { client });
            expect(r.token).toBe('STAGE_FAILED');
            expect(r.routeTo).toBe('translate');
            expect(r.reason).toMatch(/lang="FR"/);
            expect(r.reason).toMatch(/BadRequestError/);
        } finally {
            fs.rmSync(tmp.dir, { recursive: true, force: true });
        }
    });
});
