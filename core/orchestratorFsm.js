'use strict';

/**
 * core/orchestratorFsm.js
 *
 * Pure state machine for the build pipeline. Every transition is a pure
 * function of `(state, input) -> newState`. No I/O, no time, no randomness.
 *
 * The FSM consumes a `ReportStatusSchema` result from `core/stageTools.js`
 * and the current `state` object, and returns the next state. It also
 * answers two read-only questions: `needsUserGate(state)` (is a human gate
 * pending?) and `shouldNoop(state, opts)` (does the input hash match the
 * prior run, allowing us to skip the dispatch?).
 *
 * State mutations (DESIGN §4):
 *
 *   STAGE_COMPLETE  -> advance cursor; reset repairRound; flip resolved on
 *                      unresolved repairHistory entries whose stage matches
 *                      the just-completed stage.
 *   STAGE_FAILED    -> if repairRound < REPAIR_CAP, increment, clear owner
 *                      stage's input hash, rewind cursor, append a
 *                      repairHistory entry. Else escalate.
 *   STAGE_NOOP      -> return state unchanged (caller already decided to skip).
 *   STAGE_PAUSED    -> mark _meta.status='paused' with gateName/gateReason;
 *                      cursor stays on the paused stage.
 *   STAGE_ESCALATED -> set _meta.status='escalated' (terminal).
 *
 * Translator-stage NOOP (DESIGN §F4): for stage='translate', `shouldNoop`
 * requires that every non-primary language in `state._meta.languages` has
 * a matching hash in `inputHashes.translator[lang]`. If even one language's
 * hash is missing or mismatched, the dispatch proceeds and the runner
 * internally skips already-complete languages.
 *
 * Translator-stage repair (plan U4): on STAGE_FAILED with routeTo='translate',
 * the FSM clears NO translator hashes. The runner is responsible for
 * removing only the failed language's entry from
 * inputHashes.translator[lang] before reporting failure, so successful
 * languages keep their hashes and the next dispatch only re-runs the
 * failed one.
 *
 * Schema delta vs DESIGN — TODO(U8): DESIGN §5 places `status` ('idle' |
 * 'running' | 'paused' | 'escalated') and `gateName` under `_meta`, but
 * MetaSchema in core/schema/pipelineState.js does not yet define those
 * fields. The FSM writes them; the runner (U8) is responsible for
 * extending MetaSchema and regenerating docs/schema + schemas/ before
 * the state is persisted. U4 scope (plan §Scope Boundaries) excludes
 * core/schema/*.js changes.
 *
 * Public API:
 *   applyResult(state, result, opts?) -> newState
 *   applyGate(state, gateName, gateResult) -> newState
 *   needsUserGate(state) -> null | { gateName, reason }
 *   shouldNoop(state, opts) -> boolean
 *   onNoop(state) -> newState
 */

const { canonicalHash } = require('./canonicalHash');
const { REPAIR_CAP, STAGES } = require('./orchestrator-constants');

function nextStage(stage) {
    const i = STAGES.indexOf(stage);
    if (i < 0) {
        throw new Error(`orchestratorFsm.nextStage: unknown stage "${stage}"`);
    }
    if (i === STAGES.length - 1) return 'done';
    return STAGES[i + 1];
}

function isTerminal(state) {
    // 'done' is the only terminal _meta.stage value. 'escalated' lives in
    // _meta.status, never in _meta.stage (see STAGES which has 5 entries).
    return state._meta.stage === 'done' || state._meta.status === 'escalated';
}

function nowIso(opts) {
    if (opts && typeof opts.now === 'string' && opts.now.length > 0) return opts.now;
    return new Date().toISOString();
}

function cloneMeta(state) {
    const meta = state._meta;
    return {
        ...meta,
        inputHashes: {
            ...(meta.inputHashes || {}),
            translator: { ...((meta.inputHashes && meta.inputHashes.translator) || {}) },
        },
        repairHistory: (meta.repairHistory || []).map((e) => ({ ...e })),
    };
}

function withMeta(state, meta) {
    return { ...state, _meta: meta };
}

function clearInputHash(meta, stage) {
    // For non-translate stages, drop the recorded hash so the next dispatch
    // re-runs the stage. For 'translate', the FSM clears NOTHING: the runner
    // (U8) is responsible for clearing only the failed language's entry in
    // inputHashes.translator[lang] before reporting STAGE_FAILED, so the
    // already-successful languages keep their hashes and the next dispatch
    // re-runs only the failed language (plan U4, DESIGN §F4 per-language
    // fan-out idempotency).
    if (stage === 'translate') return meta;
    const hashes = { ...meta.inputHashes };
    delete hashes[stage];
    return { ...meta, inputHashes: hashes };
}

function flipResolvedFor(meta, stage) {
    const history = meta.repairHistory.map((e) => {
        if (e.stage === stage && e.resolved === false) {
            return { ...e, resolved: true };
        }
        return e;
    });
    return { ...meta, repairHistory: history };
}

function applyComplete(state, _result, opts) {
    const meta = cloneMeta(state);
    const completed = meta.stage;
    let next = meta;
    next = flipResolvedFor(next, completed);
    next.stage = nextStage(completed);
    next.repairRound = 0;
    // TODO(U8): _meta.status / _meta.gateName / _meta.gateReason are not
    // declared on MetaSchema; extending the schema (and regenerating
    // docs/schema + schemas/) is U8's responsibility. See JSDoc header.
    next.status = 'running';
    delete next.gateName;
    delete next.gateReason;
    next.updatedAt = nowIso(opts);
    return withMeta(state, next);
}

function applyFailed(state, result, opts) {
    const meta = cloneMeta(state);
    if (meta.repairRound >= REPAIR_CAP) {
        meta.status = 'escalated';
        meta.updatedAt = nowIso(opts);
        return withMeta(state, meta);
    }
    const owner = result.routeTo || meta.stage;
    let next = clearInputHash(meta, owner);
    next.stage = owner;
    next.repairRound = meta.repairRound + 1;
    next.status = 'running';
    next.repairHistory = [
        ...next.repairHistory,
        {
            stage: owner,
            round: next.repairRound,
            ts: nowIso(opts),
            resolved: false,
            reason: result.reason,
        },
    ];
    delete next.gateName;
    delete next.gateReason;
    next.updatedAt = nowIso(opts);
    return withMeta(state, next);
}

function applyPaused(state, result, opts) {
    const meta = cloneMeta(state);
    meta.status = 'paused';
    meta.gateName = result.gateName;
    meta.gateReason = result.reason;
    meta.updatedAt = nowIso(opts);
    return withMeta(state, meta);
}

function applyEscalated(state, _result, opts) {
    const meta = cloneMeta(state);
    meta.status = 'escalated';
    meta.updatedAt = nowIso(opts);
    return withMeta(state, meta);
}

function applyResult(state, result, opts) {
    if (!state || !state._meta) {
        throw new Error('orchestratorFsm.applyResult: state._meta is required');
    }
    if (!result || typeof result.token !== 'string') {
        throw new Error('orchestratorFsm.applyResult: result.token is required');
    }
    // STAGE_NOOP is always safe — replaying it against a terminal state is
    // a benign no-op. Every other token is blocked from terminal states so
    // we never accidentally transition out of 'done' or out of 'escalated'.
    if (result.token === 'STAGE_NOOP') return state;
    if (isTerminal(state)) {
        throw new Error(
            `orchestratorFsm.applyResult: cannot transition from terminal state (stage="${state._meta.stage}", status="${state._meta.status}")`
        );
    }
    switch (result.token) {
        case 'STAGE_COMPLETE':
            return applyComplete(state, result, opts);
        case 'STAGE_FAILED':
            return applyFailed(state, result, opts);
        case 'STAGE_PAUSED':
            return applyPaused(state, result, opts);
        case 'STAGE_ESCALATED':
            return applyEscalated(state, result, opts);
        default:
            throw new Error(
                `orchestratorFsm.applyResult: unknown token "${result.token}"`
            );
    }
}

function needsUserGate(state) {
    if (!state || !state._meta) return null;
    if (state._meta.status !== 'paused') return null;
    if (typeof state._meta.gateName !== 'string' || state._meta.gateName.length === 0) {
        return null;
    }
    return {
        gateName: state._meta.gateName,
        reason: state._meta.gateReason || '',
    };
}

function setGateRecord(state, key, value) {
    const control = state.control || {};
    const userGates = (control && control.userGates) || {};
    return {
        ...state,
        control: {
            ...control,
            userGates: { ...userGates, [key]: value },
        },
    };
}

function applyGate(state, gateName, gateResult) {
    if (!state || !state._meta) {
        throw new Error('orchestratorFsm.applyGate: state._meta is required');
    }
    if (!gateResult || typeof gateResult.choice !== 'string') {
        throw new Error('orchestratorFsm.applyGate: gateResult.choice is required');
    }
    const choice = gateResult.choice;
    switch (gateName) {
        case 'designApproval': {
            if (choice === 'accept') {
                const advanced = applyComplete(
                    state,
                    { token: 'STAGE_COMPLETE', reason: 'gate:designApproval accepted' },
                    gateResult
                );
                return setGateRecord(advanced, 'designApproval', 'approved');
            }
            if (choice === 'revise') {
                const reverted = applyFailed(
                    state,
                    {
                        token: 'STAGE_FAILED',
                        reason: 'gate:designApproval revise',
                        routeTo: 'scenarioDesign',
                    },
                    gateResult
                );
                return setGateRecord(reverted, 'designApproval', 'revised');
            }
            throw new Error(
                `orchestratorFsm.applyGate: designApproval requires choice 'accept' or 'revise', got "${choice}"`
            );
        }
        case 'qualityGate': {
            if (choice === 'accept') {
                const advanced = applyComplete(
                    state,
                    { token: 'STAGE_COMPLETE', reason: 'gate:qualityGate accepted' },
                    gateResult
                );
                return setGateRecord(advanced, 'qualityGate', 'approved');
            }
            if (choice === 'revise') {
                const routeTo = gateResult.routeTo || state._meta.stage;
                const reverted = applyFailed(
                    state,
                    {
                        token: 'STAGE_FAILED',
                        reason: 'gate:qualityGate revise',
                        routeTo,
                    },
                    gateResult
                );
                return setGateRecord(reverted, 'qualityGate', 'revised');
            }
            throw new Error(
                `orchestratorFsm.applyGate: qualityGate requires choice 'accept' or 'revise', got "${choice}"`
            );
        }
        case 'translateGate': {
            if (choice === 'accept') {
                const advanced = applyComplete(
                    state,
                    { token: 'STAGE_COMPLETE', reason: 'gate:translateGate accepted' },
                    gateResult
                );
                return setGateRecord(advanced, 'translateGate', 'approved');
            }
            if (choice === 'decline') {
                const meta = cloneMeta(state);
                meta.stage = 'done';
                meta.status = 'running';
                meta.repairRound = 0;
                delete meta.gateName;
                delete meta.gateReason;
                meta.updatedAt = nowIso(gateResult);
                return setGateRecord(withMeta(state, meta), 'translateGate', 'declined');
            }
            throw new Error(
                `orchestratorFsm.applyGate: translateGate requires choice 'accept' or 'decline', got "${choice}"`
            );
        }
        default:
            throw new Error(`orchestratorFsm.applyGate: unknown gateName "${gateName}"`);
    }
}

function shouldNoop(state, opts) {
    if (!state || !state._meta) {
        throw new Error('orchestratorFsm.shouldNoop: state._meta is required');
    }
    const force = !!(opts && opts.force);
    if (force) return false;
    const stage = state._meta.stage;
    const hashes = (state._meta.inputHashes || {});
    if (stage === 'translate') {
        const primary = state._meta.primaryLanguage;
        const all = state._meta.languages || [];
        const nonPrimary = all.filter((l) => l !== primary);
        const translator = hashes.translator || {};
        const inputs = (opts && opts.translatorInputs) || {};
        if (nonPrimary.length === 0) return true;
        for (const lang of nonPrimary) {
            const recorded = translator[lang];
            if (typeof recorded !== 'string' || recorded.length === 0) return false;
            if (!Object.prototype.hasOwnProperty.call(inputs, lang)) return false;
            if (canonicalHash(inputs[lang]) !== recorded) return false;
        }
        return true;
    }
    const recorded = hashes[stage];
    if (typeof recorded !== 'string' || recorded.length === 0) return false;
    if (!opts || !Object.prototype.hasOwnProperty.call(opts, 'inputSlice')) return false;
    return canonicalHash(opts.inputSlice) === recorded;
}

function onNoop(state) {
    if (!state || !state._meta) {
        throw new Error('orchestratorFsm.onNoop: state._meta is required');
    }
    return state;
}

module.exports = {
    applyResult,
    applyGate,
    needsUserGate,
    shouldNoop,
    onNoop,
};
