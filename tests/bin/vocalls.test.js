'use strict';

/**
 * tests/bin/vocalls.test.js — unit suite for the orchestrator entry binary.
 *
 * Most tests inject an in-memory `stateIo` so we exercise the orchestrator
 * loop, FSM transitions, and gate handling without coupling to the on-disk
 * Zod superRefine (which requires slice contents the stub doesn't produce).
 * One persistence test exercises the real state-io.read/mutate path on
 * disk with a state shape that stays at the start stage (escalation /
 * argument-validation paths).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { main, parseArgs } = require('../../bin/vocalls');

const FIXED_TS = '2026-05-18T00:00:00.000Z';

function buildState({ project = 'demo', languages = ['NL'] } = {}) {
    return {
        _meta: {
            schemaVersion: '2',
            project,
            primaryLanguage: languages[0],
            languages,
            stage: 'intake',
            status: 'idle',
            repairRound: 0,
            repairHistory: [],
            createdAt: FIXED_TS,
            updatedAt: FIXED_TS,
            lastWriter: 'orchestrator',
            inputHashes: { translator: {} },
        },
        brief: { path: '/dev/null/brief.md', sha256: 'a'.repeat(64) },
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
    };
}

function makeMemoryStateIo(initialState) {
    let current = JSON.parse(JSON.stringify(initialState));
    return {
        read() {
            return JSON.parse(JSON.stringify(current));
        },
        mutate(_path, mutator) {
            const draft = JSON.parse(JSON.stringify(current));
            const ret = mutator(draft);
            current = ret === undefined ? draft : ret;
            return JSON.parse(JSON.stringify(current));
        },
        get current() { return current; },
    };
}

function makeStubSdk(perStage = {}) {
    const log = [];
    const sdk = {
        __stub__: true,
        dispatch(stage, state, extras) {
            log.push({ stage, extras: extras || null });
            const fn = perStage[stage];
            if (typeof fn === 'function') return fn(stage, state, extras);
            return { token: 'STAGE_COMPLETE', reason: `stub:${stage}` };
        },
    };
    return { sdk, log };
}

function mkTmpRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'vocalls-bin-'));
}

function cleanup(dir) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_e) { /* ignore */ }
}

describe('bin/vocalls — parseArgs', () => {
    test('parses command + --project + flags', () => {
        const o = parseArgs(['build', '--project', 'demo', '--auto', '--force']);
        expect(o.command).toBe('build');
        expect(o.project).toBe('demo');
        expect(o.auto).toBe(true);
        expect(o.force).toBe(true);
        expect(o.resume).toBe(false);
    });

    test('--resume flag is accepted', () => {
        const o = parseArgs(['build', '--project', 'demo', '--resume']);
        expect(o.resume).toBe(true);
    });

    test('--help short-circuits', () => {
        const o = parseArgs(['--help']);
        expect(o.help).toBe(true);
    });

    test('unexpected positional throws', () => {
        expect(() => parseArgs(['build', 'extra'])).toThrow(/unexpected argument/);
    });
});

describe('bin/vocalls — argument validation', () => {
    test('missing --project exits 2', async () => {
        const cwd = mkTmpRoot();
        try {
            const { exitCode } = await main(['build'], { cwd });
            expect(exitCode).toBe(2);
        } finally {
            cleanup(cwd);
        }
    });

    test('unknown command exits 2', async () => {
        const cwd = mkTmpRoot();
        try {
            const { exitCode } = await main(['mystery', '--project', 'demo'], { cwd });
            expect(exitCode).toBe(2);
        } finally {
            cleanup(cwd);
        }
    });

    test('--help exits 0', async () => {
        const { exitCode } = await main(['--help']);
        expect(exitCode).toBe(0);
    });

    test('missing state file exits 1 (real state-io)', async () => {
        const cwd = mkTmpRoot();
        try {
            // No projects/demo/.vocalls/state.json on disk → state-io.read throws.
            const { exitCode } = await main(['build', '--project', 'demo'], { cwd });
            expect(exitCode).toBe(1);
        } finally {
            cleanup(cwd);
        }
    });
});

describe('bin/vocalls — stub-mode end-to-end (in-memory stateIo)', () => {
    test('build with single primary language runs all five stages and reaches "done"', async () => {
        const stateIo = makeMemoryStateIo(buildState({ languages: ['NL'] }));
        const { sdk, log } = makeStubSdk({
            translate: () => ({ token: 'STAGE_NOOP', reason: 'no non-primary langs' }),
        });
        const { exitCode, finalState } = await main(
            ['build', '--project', 'demo', '--auto'],
            { cwd: mkTmpRoot(), sdk, stateIo, briefText: '# brief' }
        );
        expect(exitCode).toBe(0);
        expect(finalState._meta.stage).toBe('done');
        // The runner's dispatchTranslate short-circuits to STAGE_NOOP
        // without calling client.dispatch when no non-primary languages
        // need translation. So 'translate' does NOT appear in the SDK
        // call log — but the orchestrator still advances stage past it.
        expect(log.map((e) => e.stage)).toEqual([
            'intake', 'scenarioDesign', 'configBuild', 'validate',
        ]);
    });

    test('STAGE_NOOP from runner is treated as STAGE_COMPLETE (stage advances)', async () => {
        const stateIo = makeMemoryStateIo(buildState({ languages: ['NL'] }));
        const { sdk } = makeStubSdk({
            intake: () => ({ token: 'STAGE_NOOP', reason: 'hash match' }),
            translate: () => ({ token: 'STAGE_NOOP', reason: 'noop' }),
        });
        const { finalState } = await main(
            ['build', '--project', 'demo', '--auto'],
            { cwd: mkTmpRoot(), sdk, stateIo }
        );
        expect(finalState._meta.stage).toBe('done');
    });
});

describe('bin/vocalls — user gates', () => {
    test('--auto answers a STAGE_PAUSED gate via defaultChoice', async () => {
        const stateIo = makeMemoryStateIo(buildState({ languages: ['NL'] }));
        const { sdk } = makeStubSdk({
            scenarioDesign: () => ({
                token: 'STAGE_PAUSED',
                reason: 'designApproval gate',
                gateName: 'designApproval',
            }),
            translate: () => ({ token: 'STAGE_NOOP', reason: 'noop' }),
        });
        const cwd = mkTmpRoot();
        try {
            const { exitCode, finalState } = await main(
                ['build', '--project', 'demo', '--auto'],
                { cwd, sdk, stateIo, briefText: '# brief' }
            );
            expect(exitCode).toBe(0);
            expect(finalState._meta.stage).toBe('done');
            expect(finalState.control.userGates.designApproval).toBe('approved');
        } finally {
            cleanup(cwd);
        }
    });

    test('translateGate decline finishes without running translate dispatch', async () => {
        const stateIo = makeMemoryStateIo(buildState({ languages: ['NL', 'FR'] }));
        const dispatched = [];
        const { sdk } = makeStubSdk({
            validate: () => ({
                token: 'STAGE_PAUSED',
                reason: 'translateGate',
                gateName: 'translateGate',
            }),
        });
        const trackingSdk = {
            __stub__: true,
            dispatch(stage, state, extras) {
                dispatched.push(stage);
                return sdk.dispatch(stage, state, extras);
            },
        };
        const declineGate = {
            GATE_NAME: 'translateGate',
            CHOICES: ['accept', 'decline'],
            DEFAULT_CHOICE: 'decline',
            formatQuestion() {
                return {
                    prompt: 'translate?',
                    choices: ['accept', 'decline'],
                    defaultChoice: 'decline',
                };
            },
        };
        const cwd = mkTmpRoot();
        try {
            const { exitCode, finalState } = await main(
                ['build', '--project', 'demo', '--auto'],
                {
                    cwd,
                    sdk: trackingSdk,
                    stateIo,
                    briefText: '# brief',
                    gateModules: { translateGate: declineGate },
                }
            );
            expect(exitCode).toBe(0);
            expect(finalState._meta.stage).toBe('done');
            expect(dispatched).not.toContain('translate');
            expect(finalState.control.userGates.translateGate).toBe('declined');
        } finally {
            cleanup(cwd);
        }
    });
});

describe('bin/vocalls — repair loop', () => {
    test('one transient STAGE_FAILED then STAGE_COMPLETE completes the pipeline', async () => {
        const stateIo = makeMemoryStateIo(buildState({ languages: ['NL'] }));
        let intakeCalls = 0;
        const { sdk } = makeStubSdk({
            intake: () => {
                intakeCalls += 1;
                if (intakeCalls === 1) {
                    return { token: 'STAGE_FAILED', reason: 'transient', routeTo: 'intake' };
                }
                return { token: 'STAGE_COMPLETE', reason: 'recovered' };
            },
            translate: () => ({ token: 'STAGE_NOOP', reason: 'noop' }),
        });
        const { exitCode, finalState } = await main(
            ['build', '--project', 'demo', '--auto'],
            { cwd: mkTmpRoot(), sdk, stateIo, briefText: '# brief' }
        );
        expect(exitCode).toBe(0);
        expect(intakeCalls).toBe(2);
        expect(finalState._meta.stage).toBe('done');
        expect(finalState._meta.repairHistory.length).toBe(1);
        expect(finalState._meta.repairHistory[0].resolved).toBe(true);
    });

    test('persistent STAGE_FAILED hitting REPAIR_CAP escalates (exitCode 3)', async () => {
        const stateIo = makeMemoryStateIo(buildState({ languages: ['NL'] }));
        const { sdk } = makeStubSdk({
            intake: () => ({ token: 'STAGE_FAILED', reason: 'permanent', routeTo: 'intake' }),
        });
        const { exitCode, finalState } = await main(
            ['build', '--project', 'demo', '--auto'],
            { cwd: mkTmpRoot(), sdk, stateIo, briefText: '# brief' }
        );
        expect(exitCode).toBe(3);
        expect(finalState._meta.status).toBe('escalated');
    });
});

describe('bin/vocalls — telemetry side effect', () => {
    test('run.log.jsonl is appended once per runner telemetry event', async () => {
        const stateIo = makeMemoryStateIo(buildState({ languages: ['NL'] }));
        const { sdk } = makeStubSdk({
            translate: () => ({ token: 'STAGE_NOOP', reason: 'noop' }),
        });
        // Wrap runner so we can fire onTelemetry once per dispatch.
        const runner = {
            async dispatch(stage, state, deps) {
                if (typeof deps.onTelemetry === 'function') {
                    deps.onTelemetry({ stage, model: 'stub-model', mode: 'stub', turn: 0 });
                }
                return sdk.dispatch(stage, state, {});
            },
        };
        const cwd = mkTmpRoot();
        try {
            await main(['build', '--project', 'demo', '--auto'], {
                cwd, sdk, stateIo, runner, briefText: '# brief',
            });
            const logPath = path.join(cwd, 'projects', 'demo', '.vocalls', 'run.log.jsonl');
            expect(fs.existsSync(logPath)).toBe(true);
            const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter((l) => l.length > 0);
            expect(lines.length).toBe(5);
            const first = JSON.parse(lines[0]);
            expect(first.kind).toBe('telemetry');
            expect(first.stage).toBe('intake');
        } finally {
            cleanup(cwd);
        }
    });
});

describe('bin/vocalls — persistence on disk (real state-io)', () => {
    test('escalated pipeline persists status=escalated to state.json', async () => {
        const cwd = mkTmpRoot();
        const projectDir = path.join(cwd, 'projects', 'demo');
        const stateDir = path.join(projectDir, '.vocalls');
        fs.mkdirSync(stateDir, { recursive: true });
        const briefPath = path.join(projectDir, 'brief.md');
        fs.writeFileSync(briefPath, '# Brief\n');
        const state = buildState({ languages: ['NL'] });
        state.brief.path = briefPath;
        const statePath = path.join(stateDir, 'state.json');
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
        try {
            const { sdk } = makeStubSdk({
                intake: () => ({ token: 'STAGE_FAILED', reason: 'always fails', routeTo: 'intake' }),
            });
            const { exitCode } = await main(['build', '--project', 'demo', '--auto'], {
                cwd, sdk, briefText: '# brief',
            });
            expect(exitCode).toBe(3);
            const persisted = JSON.parse(fs.readFileSync(statePath, 'utf8'));
            expect(persisted._meta.status).toBe('escalated');
            expect(persisted._meta.stage).toBe('intake');
        } finally {
            cleanup(cwd);
        }
    });
});
