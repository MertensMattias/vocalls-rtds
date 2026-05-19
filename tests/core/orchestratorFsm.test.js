'use strict';

const {
    applyResult,
    applyGate,
    needsUserGate,
    shouldNoop,
    onNoop,
} = require('../../core/orchestratorFsm');
const { canonicalHash } = require('../../core/canonicalHash');
const { REPAIR_CAP, STAGES } = require('../../core/orchestrator-constants');

const FIXED_TS = '2026-05-18T00:00:00.000Z';

function baseState(overrides) {
    const meta = {
        schemaVersion: '2',
        project: 'demo',
        primaryLanguage: 'NL',
        languages: ['NL', 'FR', 'DE', 'EN'],
        stage: 'intake',
        status: 'running',
        repairRound: 0,
        repairHistory: [],
        createdAt: FIXED_TS,
        updatedAt: FIXED_TS,
        lastWriter: 'orchestrator',
        inputHashes: { translator: {} },
        ...(overrides && overrides._meta ? overrides._meta : {}),
    };
    return {
        _meta: meta,
        control: {
            userIntent: 'build',
            userGates: {
                designApproval: 'pending',
                qualityGate: 'pending',
                translateGate: 'pending',
            },
        },
        intake: null,
        scenarioDesign: null,
        slotMap: null,
        validation: { lastRun: null, findings: [], blocking: false, autofixApplied: [] },
        translation: { NL: 'pending', FR: 'pending', DE: 'pending', EN: 'pending' },
        ...(overrides && overrides.extra ? overrides.extra : {}),
    };
}

describe('applyResult — STAGE_COMPLETE', () => {
    test('advances cursor and resets repairRound', () => {
        const state = baseState({ _meta: { stage: 'intake', repairRound: 2 } });
        const next = applyResult(state, { token: 'STAGE_COMPLETE', reason: 'ok' }, { now: FIXED_TS });
        expect(next._meta.stage).toBe('scenarioDesign');
        expect(next._meta.repairRound).toBe(0);
        expect(next._meta.status).toBe('running');
    });

    test('terminal stage when completing translate -> done', () => {
        const state = baseState({ _meta: { stage: 'translate' } });
        const next = applyResult(state, { token: 'STAGE_COMPLETE', reason: 'ok' }, { now: FIXED_TS });
        expect(next._meta.stage).toBe('done');
    });

    test('flips the latest unresolved repairHistory entry for the completed stage', () => {
        const state = baseState({
            _meta: {
                stage: 'intake',
                repairRound: 1,
                repairHistory: [
                    { stage: 'intake', round: 1, ts: FIXED_TS, resolved: false, reason: 'repair' },
                ],
            },
        });
        const next = applyResult(state, { token: 'STAGE_COMPLETE', reason: 'ok' }, { now: FIXED_TS });
        expect(next._meta.repairHistory[0].resolved).toBe(true);
    });

    test('does not flip resolved on entries for a different stage', () => {
        const state = baseState({
            _meta: {
                stage: 'scenarioDesign',
                repairHistory: [
                    { stage: 'intake', round: 1, ts: FIXED_TS, resolved: false, reason: 'r' },
                ],
            },
        });
        const next = applyResult(state, { token: 'STAGE_COMPLETE', reason: 'ok' }, { now: FIXED_TS });
        expect(next._meta.repairHistory[0].resolved).toBe(false);
    });

    test('clears gateName/gateReason if set', () => {
        const state = baseState({
            _meta: { stage: 'scenarioDesign', status: 'paused', gateName: 'designApproval', gateReason: 'r' },
        });
        const next = applyResult(state, { token: 'STAGE_COMPLETE', reason: 'ok' }, { now: FIXED_TS });
        expect(next._meta.gateName).toBeUndefined();
        expect(next._meta.gateReason).toBeUndefined();
    });
});

describe('applyResult — STAGE_FAILED', () => {
    test('with routeTo: rewinds cursor, clears that stage hash, increments repairRound, appends history', () => {
        const state = baseState({
            _meta: {
                stage: 'configBuild',
                repairRound: 0,
                inputHashes: { intake: 'abc', scenarioDesign: 'def', configBuild: 'ghi', translator: {} },
            },
        });
        const next = applyResult(
            state,
            { token: 'STAGE_FAILED', reason: 'broken', routeTo: 'intake' },
            { now: FIXED_TS }
        );
        expect(next._meta.stage).toBe('intake');
        expect(next._meta.repairRound).toBe(1);
        expect(next._meta.inputHashes.intake).toBeUndefined();
        expect(next._meta.inputHashes.scenarioDesign).toBe('def');
        expect(next._meta.repairHistory).toHaveLength(1);
        expect(next._meta.repairHistory[0]).toMatchObject({
            stage: 'intake',
            round: 1,
            resolved: false,
            reason: 'broken',
        });
    });

    test('without routeTo: rewinds to current stage, clears current hash', () => {
        const state = baseState({
            _meta: {
                stage: 'validate',
                repairRound: 0,
                inputHashes: { intake: 'a', scenarioDesign: 'b', configBuild: 'c', translator: {} },
            },
        });
        const next = applyResult(state, { token: 'STAGE_FAILED', reason: 'x' }, { now: FIXED_TS });
        expect(next._meta.stage).toBe('validate');
        expect(next._meta.repairRound).toBe(1);
        expect(next._meta.inputHashes.validate).toBeUndefined();
    });

    test('at repairRound = REPAIR_CAP - 1, succeeds: repairRound becomes CAP, hash cleared', () => {
        const state = baseState({
            _meta: {
                stage: 'configBuild',
                repairRound: REPAIR_CAP - 1,
                inputHashes: { intake: 'abc', translator: {} },
            },
        });
        const next = applyResult(
            state,
            { token: 'STAGE_FAILED', reason: 'r', routeTo: 'intake' },
            { now: FIXED_TS }
        );
        expect(next._meta.repairRound).toBe(REPAIR_CAP);
        expect(next._meta.stage).toBe('intake');
        expect(next._meta.status).not.toBe('escalated');
    });

    test('at repairRound >= REPAIR_CAP escalates', () => {
        const state = baseState({
            _meta: { stage: 'validate', repairRound: REPAIR_CAP },
        });
        const next = applyResult(
            state,
            { token: 'STAGE_FAILED', reason: 'cap', routeTo: 'intake' },
            { now: FIXED_TS }
        );
        expect(next._meta.status).toBe('escalated');
        expect(next._meta.stage).toBe('validate');
    });

    test('routeTo: translate preserves the translator hash map (runner pre-clears the failed language)', () => {
        // Per plan U4: on STAGE_FAILED with routeTo='translate', the FSM
        // clears nothing in inputHashes.translator. The runner is
        // responsible for removing only the failed language's entry before
        // reporting failure, so successful languages keep their hashes.
        const state = baseState({
            _meta: {
                stage: 'translate',
                inputHashes: { translator: { FR: 'aa', DE: 'bb', EN: 'cc' } },
            },
        });
        const next = applyResult(
            state,
            { token: 'STAGE_FAILED', reason: 'r', routeTo: 'translate' },
            { now: FIXED_TS }
        );
        expect(next._meta.inputHashes.translator).toEqual({ FR: 'aa', DE: 'bb', EN: 'cc' });
        expect(next._meta.stage).toBe('translate');
        expect(next._meta.repairRound).toBe(1);
    });
});

describe('applyResult — STAGE_NOOP', () => {
    test('returns state unchanged (reference-equal)', () => {
        const state = baseState();
        const next = applyResult(state, { token: 'STAGE_NOOP', reason: 'hash match' }, { now: FIXED_TS });
        expect(next).toBe(state);
    });
});

describe('applyResult — STAGE_PAUSED', () => {
    test('sets status=paused with gateName and gateReason', () => {
        const state = baseState({ _meta: { stage: 'scenarioDesign' } });
        const next = applyResult(
            state,
            { token: 'STAGE_PAUSED', reason: 'design ready', gateName: 'designApproval' },
            { now: FIXED_TS }
        );
        expect(next._meta.status).toBe('paused');
        expect(next._meta.gateName).toBe('designApproval');
        expect(next._meta.gateReason).toBe('design ready');
        expect(next._meta.stage).toBe('scenarioDesign');
    });
});

describe('applyResult — STAGE_ESCALATED', () => {
    test('sets terminal escalated status', () => {
        const state = baseState();
        const next = applyResult(state, { token: 'STAGE_ESCALATED', reason: 'manual' }, { now: FIXED_TS });
        expect(next._meta.status).toBe('escalated');
    });
});

describe('applyResult — guards', () => {
    test('throws on missing state._meta', () => {
        expect(() => applyResult({}, { token: 'STAGE_COMPLETE', reason: 'r' })).toThrow(
            /^orchestratorFsm\.applyResult:/
        );
    });
    test('throws on missing result.token', () => {
        expect(() => applyResult(baseState(), {})).toThrow(/^orchestratorFsm\.applyResult:/);
    });
    test('throws on unknown token', () => {
        expect(() =>
            applyResult(baseState(), { token: 'STAGE_BANANA', reason: 'r' })
        ).toThrow(/unknown token/);
    });
    test('throws when transitioning from a terminal stage (done)', () => {
        const state = baseState({ _meta: { stage: 'done' } });
        expect(() =>
            applyResult(state, { token: 'STAGE_COMPLETE', reason: 'r' })
        ).toThrow(/terminal state/);
    });
    test('throws when transitioning from terminal status (escalated)', () => {
        // 'escalated' is a status value, never a stage value — pin that the
        // guard catches it via status not stage.
        const state = baseState({ _meta: { stage: 'validate', status: 'escalated' } });
        expect(() =>
            applyResult(state, { token: 'STAGE_COMPLETE', reason: 'r' })
        ).toThrow(/terminal state/);
    });
    test('STAGE_NOOP is allowed even on terminal state (idempotent replay)', () => {
        const done = baseState({ _meta: { stage: 'done' } });
        expect(applyResult(done, { token: 'STAGE_NOOP', reason: 'r' })).toBe(done);
        const escalated = baseState({ _meta: { status: 'escalated' } });
        expect(applyResult(escalated, { token: 'STAGE_NOOP', reason: 'r' })).toBe(escalated);
    });
});

describe('applyResult — STATUS x stage x repairRound cross-product', () => {
    const tokens = ['STAGE_COMPLETE', 'STAGE_FAILED', 'STAGE_NOOP', 'STAGE_PAUSED', 'STAGE_ESCALATED'];
    const rounds = [0, 1, 2, REPAIR_CAP];

    for (const token of tokens) {
        for (const stage of STAGES) {
            for (const round of rounds) {
                test(`${token} @ stage=${stage} repairRound=${round}`, () => {
                    const state = baseState({ _meta: { stage, repairRound: round } });
                    const result = { token, reason: 'x' };
                    if (token === 'STAGE_PAUSED') result.gateName = 'g';
                    const next = applyResult(state, result, { now: FIXED_TS });
                    if (token === 'STAGE_NOOP') {
                        expect(next).toBe(state);
                        return;
                    }
                    expect(next._meta).toBeDefined();
                    if (token === 'STAGE_COMPLETE') {
                        expect(next._meta.repairRound).toBe(0);
                    }
                    if (token === 'STAGE_FAILED' && round >= REPAIR_CAP) {
                        expect(next._meta.status).toBe('escalated');
                    }
                    if (token === 'STAGE_FAILED' && round < REPAIR_CAP) {
                        expect(next._meta.repairRound).toBe(round + 1);
                    }
                    if (token === 'STAGE_PAUSED') {
                        expect(next._meta.status).toBe('paused');
                        expect(next._meta.gateName).toBe('g');
                    }
                    if (token === 'STAGE_ESCALATED') {
                        expect(next._meta.status).toBe('escalated');
                    }
                });
            }
        }
    }
});

describe('applyResult — immutability', () => {
    test('does not mutate the input state object', () => {
        const state = baseState({
            _meta: {
                stage: 'configBuild',
                repairRound: 0,
                inputHashes: { intake: 'abc', translator: {} },
                repairHistory: [],
            },
        });
        const snapshot = JSON.stringify(state);
        applyResult(state, { token: 'STAGE_FAILED', reason: 'r', routeTo: 'intake' }, { now: FIXED_TS });
        expect(JSON.stringify(state)).toBe(snapshot);
    });
});

describe('needsUserGate', () => {
    test('returns gate info when status=paused and gateName set', () => {
        const state = baseState({
            _meta: { stage: 'scenarioDesign', status: 'paused', gateName: 'designApproval', gateReason: 'rev' },
        });
        expect(needsUserGate(state)).toEqual({ gateName: 'designApproval', reason: 'rev' });
    });
    test('returns null when status != paused', () => {
        const state = baseState({ _meta: { stage: 'intake', status: 'running' } });
        expect(needsUserGate(state)).toBeNull();
    });
    test('returns null when paused but no gateName', () => {
        const state = baseState({ _meta: { status: 'paused' } });
        expect(needsUserGate(state)).toBeNull();
    });
});

describe('applyGate — designApproval', () => {
    test("choice=accept advances to configBuild and records 'approved'", () => {
        const state = baseState({
            _meta: { stage: 'scenarioDesign', status: 'paused', gateName: 'designApproval' },
        });
        const next = applyGate(state, 'designApproval', { choice: 'accept', now: FIXED_TS });
        expect(next._meta.stage).toBe('configBuild');
        expect(next._meta.status).toBe('running');
        expect(next._meta.gateName).toBeUndefined();
        expect(next.control.userGates.designApproval).toBe('approved');
    });

    test("choice=revise rewinds to scenarioDesign, clears its hash, increments repairRound, records 'revised'", () => {
        const state = baseState({
            _meta: {
                stage: 'scenarioDesign',
                status: 'paused',
                gateName: 'designApproval',
                repairRound: 0,
                inputHashes: { scenarioDesign: 'hash', translator: {} },
            },
        });
        const next = applyGate(state, 'designApproval', { choice: 'revise', now: FIXED_TS });
        expect(next._meta.stage).toBe('scenarioDesign');
        expect(next._meta.repairRound).toBe(1);
        expect(next._meta.inputHashes.scenarioDesign).toBeUndefined();
        expect(next.control.userGates.designApproval).toBe('revised');
    });

    test('rejects unknown choice', () => {
        const state = baseState({ _meta: { status: 'paused', gateName: 'designApproval' } });
        expect(() => applyGate(state, 'designApproval', { choice: 'maybe' })).toThrow(
            /designApproval/
        );
    });
});

describe('applyGate — qualityGate', () => {
    test('choice=accept advances and records approved', () => {
        const state = baseState({
            _meta: { stage: 'validate', status: 'paused', gateName: 'qualityGate' },
        });
        const next = applyGate(state, 'qualityGate', { choice: 'accept', now: FIXED_TS });
        expect(next._meta.stage).toBe('translate');
        expect(next.control.userGates.qualityGate).toBe('approved');
    });

    test('choice=revise routes to gateResult.routeTo', () => {
        const state = baseState({
            _meta: { stage: 'validate', status: 'paused', gateName: 'qualityGate', repairRound: 0 },
        });
        const next = applyGate(state, 'qualityGate', {
            choice: 'revise',
            routeTo: 'intake',
            now: FIXED_TS,
        });
        expect(next._meta.stage).toBe('intake');
        expect(next.control.userGates.qualityGate).toBe('revised');
    });
});

describe('applyGate — translateGate', () => {
    test('choice=accept advances stage from validate to translate', () => {
        const state = baseState({
            _meta: { stage: 'validate', status: 'paused', gateName: 'translateGate' },
        });
        const next = applyGate(state, 'translateGate', { choice: 'accept', now: FIXED_TS });
        expect(next._meta.stage).toBe('translate');
        expect(next._meta.status).toBe('running');
        expect(next._meta.gateName).toBeUndefined();
        expect(next.control.userGates.translateGate).toBe('approved');
    });

    test('choice=accept rejects unsupported choice', () => {
        const state = baseState({
            _meta: { stage: 'validate', status: 'paused', gateName: 'translateGate' },
        });
        expect(() => applyGate(state, 'translateGate', { choice: 'revise' })).toThrow(
            /translateGate/
        );
    });

    test('choice=decline jumps to done', () => {
        const state = baseState({
            _meta: { stage: 'validate', status: 'paused', gateName: 'translateGate' },
        });
        const next = applyGate(state, 'translateGate', { choice: 'decline', now: FIXED_TS });
        expect(next._meta.stage).toBe('done');
        expect(next.control.userGates.translateGate).toBe('declined');
    });
});

describe('applyGate — guards', () => {
    test('throws on unknown gateName', () => {
        const state = baseState();
        expect(() => applyGate(state, 'somethingElse', { choice: 'accept' })).toThrow(
            /unknown gateName/
        );
    });
    test('throws on missing gateResult.choice', () => {
        const state = baseState();
        expect(() => applyGate(state, 'designApproval', {})).toThrow(
            /^orchestratorFsm\.applyGate:/
        );
    });
});

describe('shouldNoop — non-translate stages', () => {
    test('returns true when stored hash matches canonicalHash of inputSlice', () => {
        const slice = { a: 1, b: 2 };
        const recorded = canonicalHash(slice);
        const state = baseState({
            _meta: { stage: 'intake', inputHashes: { intake: recorded, translator: {} } },
        });
        expect(shouldNoop(state, { inputSlice: slice })).toBe(true);
    });

    test('returns false when hash differs', () => {
        const state = baseState({
            _meta: { stage: 'intake', inputHashes: { intake: 'wrong', translator: {} } },
        });
        expect(shouldNoop(state, { inputSlice: { a: 1 } })).toBe(false);
    });

    test('returns false when no recorded hash', () => {
        const state = baseState({ _meta: { stage: 'intake', inputHashes: { translator: {} } } });
        expect(shouldNoop(state, { inputSlice: { a: 1 } })).toBe(false);
    });

    test('returns false when inputSlice is not provided', () => {
        const state = baseState({
            _meta: { stage: 'intake', inputHashes: { intake: 'h', translator: {} } },
        });
        expect(shouldNoop(state, {})).toBe(false);
    });

    test('force=true overrides matching hash', () => {
        const slice = { a: 1 };
        const recorded = canonicalHash(slice);
        const state = baseState({
            _meta: { stage: 'intake', inputHashes: { intake: recorded, translator: {} } },
        });
        expect(shouldNoop(state, { inputSlice: slice, force: true })).toBe(false);
    });
});

describe('shouldNoop — translate stage (F4 per-language fan-out)', () => {
    test('returns true only when every non-primary language hash matches', () => {
        const sliceFR = { lang: 'FR', text: 'bonjour' };
        const sliceDE = { lang: 'DE', text: 'hallo' };
        const sliceEN = { lang: 'EN', text: 'hello' };
        const state = baseState({
            _meta: {
                stage: 'translate',
                primaryLanguage: 'NL',
                languages: ['NL', 'FR', 'DE', 'EN'],
                inputHashes: {
                    translator: {
                        FR: canonicalHash(sliceFR),
                        DE: canonicalHash(sliceDE),
                        EN: canonicalHash(sliceEN),
                    },
                },
            },
        });
        expect(
            shouldNoop(state, {
                translatorInputs: { FR: sliceFR, DE: sliceDE, EN: sliceEN },
            })
        ).toBe(true);
    });

    test('returns false if any non-primary language hash is missing', () => {
        const sliceFR = { x: 1 };
        const state = baseState({
            _meta: {
                stage: 'translate',
                primaryLanguage: 'NL',
                languages: ['NL', 'FR', 'DE'],
                inputHashes: { translator: { FR: canonicalHash(sliceFR) } },
            },
        });
        expect(
            shouldNoop(state, { translatorInputs: { FR: sliceFR, DE: { y: 2 } } })
        ).toBe(false);
    });

    test('returns false if any non-primary language hash mismatches', () => {
        const sliceFR = { x: 1 };
        const sliceDE = { y: 2 };
        const state = baseState({
            _meta: {
                stage: 'translate',
                primaryLanguage: 'NL',
                languages: ['NL', 'FR', 'DE'],
                inputHashes: {
                    translator: { FR: canonicalHash(sliceFR), DE: 'mismatch' },
                },
            },
        });
        expect(
            shouldNoop(state, { translatorInputs: { FR: sliceFR, DE: sliceDE } })
        ).toBe(false);
    });

    test('returns true when languages contains only the primary (no non-primary work)', () => {
        const state = baseState({
            _meta: {
                stage: 'translate',
                primaryLanguage: 'NL',
                languages: ['NL'],
                inputHashes: { translator: {} },
            },
        });
        expect(shouldNoop(state, {})).toBe(true);
    });
});

describe('shouldNoop — guards', () => {
    test('throws when state._meta missing', () => {
        expect(() => shouldNoop({}, {})).toThrow(/^orchestratorFsm\.shouldNoop:/);
    });
});

describe('onNoop', () => {
    test('returns the same state reference', () => {
        const state = baseState();
        expect(onNoop(state)).toBe(state);
    });
    test('throws when state._meta missing', () => {
        expect(() => onNoop({})).toThrow(/^orchestratorFsm\.onNoop:/);
    });
});

describe('immutability across all FSM entry points', () => {
    const cases = [
        ['STAGE_COMPLETE', { token: 'STAGE_COMPLETE', reason: 'r' }, { stage: 'intake', repairRound: 1, repairHistory: [{ stage: 'intake', round: 1, ts: FIXED_TS, resolved: false, reason: 'r' }] }],
        ['STAGE_PAUSED', { token: 'STAGE_PAUSED', reason: 'r', gateName: 'designApproval' }, { stage: 'scenarioDesign' }],
        ['STAGE_ESCALATED', { token: 'STAGE_ESCALATED', reason: 'r' }, { stage: 'validate' }],
    ];
    for (const [name, result, metaOverride] of cases) {
        test(`applyResult ${name} does not mutate input state`, () => {
            const state = baseState({ _meta: metaOverride });
            const snapshot = JSON.stringify(state);
            applyResult(state, result, { now: FIXED_TS });
            expect(JSON.stringify(state)).toBe(snapshot);
        });
    }

    test('applyGate designApproval accept does not mutate input state', () => {
        const state = baseState({
            _meta: { stage: 'scenarioDesign', status: 'paused', gateName: 'designApproval' },
        });
        const snapshot = JSON.stringify(state);
        applyGate(state, 'designApproval', { choice: 'accept', now: FIXED_TS });
        expect(JSON.stringify(state)).toBe(snapshot);
    });

    test('applyGate translateGate decline does not mutate input state', () => {
        const state = baseState({
            _meta: { stage: 'validate', status: 'paused', gateName: 'translateGate' },
        });
        const snapshot = JSON.stringify(state);
        applyGate(state, 'translateGate', { choice: 'decline', now: FIXED_TS });
        expect(JSON.stringify(state)).toBe(snapshot);
    });
});

describe('cross-product stage-cursor invariants (strengthens the 100-case loop)', () => {
    // The bulk cross-product above asserts shape; these targeted cases pin
    // the specific cursor transitions the FSM is responsible for.
    test('STAGE_COMPLETE advances cursor by exactly one position for every non-terminal stage', () => {
        const transitions = [
            ['intake', 'scenarioDesign'],
            ['scenarioDesign', 'configBuild'],
            ['configBuild', 'validate'],
            ['validate', 'translate'],
            ['translate', 'done'],
        ];
        for (const [from, to] of transitions) {
            const state = baseState({ _meta: { stage: from } });
            const next = applyResult(state, { token: 'STAGE_COMPLETE', reason: 'r' }, { now: FIXED_TS });
            expect(next._meta.stage).toBe(to);
        }
    });

    test('STAGE_FAILED without routeTo keeps cursor on the current stage', () => {
        for (const stage of STAGES) {
            const state = baseState({ _meta: { stage, repairRound: 0 } });
            const next = applyResult(state, { token: 'STAGE_FAILED', reason: 'r' }, { now: FIXED_TS });
            expect(next._meta.stage).toBe(stage);
        }
    });

    test('STAGE_PAUSED keeps cursor on the current stage for every pipeline stage', () => {
        for (const stage of STAGES) {
            const state = baseState({ _meta: { stage } });
            const next = applyResult(
                state,
                { token: 'STAGE_PAUSED', reason: 'r', gateName: 'g' },
                { now: FIXED_TS }
            );
            expect(next._meta.stage).toBe(stage);
        }
    });

    test('STAGE_ESCALATED keeps cursor and sets terminal status', () => {
        for (const stage of STAGES) {
            const state = baseState({ _meta: { stage } });
            const next = applyResult(state, { token: 'STAGE_ESCALATED', reason: 'r' }, { now: FIXED_TS });
            expect(next._meta.stage).toBe(stage);
            expect(next._meta.status).toBe('escalated');
        }
    });
});
