#!/usr/bin/env node

'use strict';

/**
 * bin/vocalls.js — orchestrator entry point.
 *
 * Drives the build pipeline by polling the FSM in a loop:
 *
 *   while stage !== 'done' && status !== 'escalated':
 *     - if needsUserGate(state) → run the gate via promptUserGate,
 *       persist applyGate(...) outcome, continue.
 *     - else dispatch the current stage via subagentRunner.dispatch,
 *       feed the result into applyResult, persist.
 *     - on STAGE_NOOP (runner short-circuited) → treat as STAGE_COMPLETE
 *       so the stage cursor advances (FSM's applyResult on STAGE_NOOP is
 *       a no-op by contract; the orchestrator is responsible for
 *       advancing past a hash-match skip).
 *
 * Plain side-effecting Node code. No skill prompts. No agent SDK.
 *
 * Public API:
 *   main(argv, deps?) → Promise<{ exitCode, finalState }>
 *     argv:  ['<command>', '--project', '<name>', ...flags]
 *     commands: build | update | validate | translate
 *     flags:    --auto | --force | --resume | --help | -h
 *
 *     deps fields (all optional — injection seam for tests):
 *       cwd          override process.cwd()
 *       sdk          inject an Anthropic-shaped client (production loop)
 *                    or a stub-mode client; defaults to sdkClient.getClient()
 *       briefText    bypass reading state.brief.path (handed to the runner)
 *       rl           injected readline.Interface for non-auto gate prompts
 *       write        prompt-writer sink for tests
 *       log          telemetry sink; default writes to stderr
 *       fsm          override orchestratorFsm (testing)
 *       runner       override subagentRunner ({ dispatch })
 *       stateIo      override state-io ({ read, mutate })
 *       gateModules  { designApproval, qualityGate, translateGate } overrides
 *
 *   main returns `{ exitCode, finalState }`. The CLI wrapper at the
 *   bottom of this file translates that into process.exit().
 */

const path = require('path');
const fs = require('fs');
const readline = require('readline');

const orchestratorFsm = require('../core/orchestratorFsm');
const subagentRunner = require('../core/subagentRunner');
const sdkClient = require('../core/sdk-client');
const stateIoMod = require('../core/state-io');
const { promptUserGate } = require('../core/promptUserGate');
const { RUN_LOG_PATH } = require('../core/orchestrator-constants');

const designApprovalGate = require('../core/gates/designApproval');
const qualityGate = require('../core/gates/qualityGate');
const translateGate = require('../core/gates/translateGate');

const VALID_COMMANDS = Object.freeze(['build', 'update', 'validate', 'translate']);
const STATE_FILE_REL = '.vocalls/state.json';
const MAX_LOOP_ITERATIONS = 64;

const HELP = [
    'Usage: node bin/vocalls.js <command> --project <name> [flags]',
    '',
    'Commands:',
    '  build        Run the pipeline through every stage (intake → translate)',
    '  update       Re-run from the first stage whose input hash is stale',
    '  validate     Drive the loop until the validate gate / completion',
    '  translate    Drive the loop until translate completion',
    '',
    'Flags:',
    '  --project <name>  Project name (required; must exist under projects/)',
    '  --auto            Auto-answer user gates with defaultChoice',
    '  --force           Disable input-hash NOOP short-circuit',
    '  --resume          Continue from the persisted state (default behavior;',
    '                    accepted for symmetry)',
    '  --help, -h        Print this notice',
].join('\n');

function parseArgs(argv) {
    const args = Array.isArray(argv) ? argv.slice() : [];
    const opts = {
        command: null,
        project: null,
        auto: false,
        force: false,
        resume: false,
        help: false,
    };
    while (args.length > 0) {
        const tok = args.shift();
        if (tok === '--help' || tok === '-h') {
            opts.help = true;
            continue;
        }
        if (tok === '--auto') { opts.auto = true; continue; }
        if (tok === '--force') { opts.force = true; continue; }
        if (tok === '--resume') { opts.resume = true; continue; }
        if (tok === '--project') {
            opts.project = args.shift();
            continue;
        }
        if (!opts.command) {
            opts.command = tok;
            continue;
        }
        throw new Error(`vocalls.main: unexpected argument "${tok}"`);
    }
    return opts;
}

function resolveProjectDir(cwd, project) {
    return path.join(cwd, 'projects', project);
}

function escalatedState(state) {
    return state._meta.status === 'escalated';
}

function isDone(state) {
    return state._meta.stage === 'done';
}

function gateModuleFor(gateName, gateModules) {
    const g = gateModules[gateName];
    if (!g) {
        throw new Error(`vocalls.main: no gate module registered for "${gateName}"`);
    }
    return g;
}

function appendRunLog(projectDir, entry) {
    const logPath = path.join(projectDir, RUN_LOG_PATH);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
}

async function runGate(state, gate, projectDir, opts, rl, write) {
    const gateModule = gate;
    const choice = await promptUserGate({
        gate: gateModule,
        state,
        projectDir,
        auto: opts.auto,
        rl,
        write,
    });
    return choice;
}

async function main(argv, deps = {}) {
    const cwd = deps.cwd || process.cwd();
    let opts;
    try {
        opts = parseArgs(argv);
    } catch (err) {
        process.stderr.write(`${err.message}\n\n${HELP}\n`);
        return { exitCode: 2, finalState: null };
    }
    if (opts.help) {
        process.stdout.write(`${HELP}\n`);
        return { exitCode: 0, finalState: null };
    }
    if (!opts.command || !VALID_COMMANDS.includes(opts.command)) {
        process.stderr.write(
            `vocalls.main: unknown command "${opts.command || ''}"\n\n${HELP}\n`
        );
        return { exitCode: 2, finalState: null };
    }
    if (!opts.project || typeof opts.project !== 'string') {
        process.stderr.write(`vocalls.main: --project <name> is required\n\n${HELP}\n`);
        return { exitCode: 2, finalState: null };
    }

    const projectDir = deps.projectDir || resolveProjectDir(cwd, opts.project);
    const statePath = path.join(projectDir, STATE_FILE_REL);

    const fsm = deps.fsm || orchestratorFsm;
    const runner = deps.runner || subagentRunner;
    const stateIo = deps.stateIo || stateIoMod;
    const gateModules = Object.assign(
        {
            designApproval: designApprovalGate,
            qualityGate: qualityGate,
            translateGate: translateGate,
        },
        deps.gateModules || {}
    );
    const sdk = deps.sdk || sdkClient.getClient();
    const write = typeof deps.write === 'function' ? deps.write : (text) => process.stdout.write(text);
    const log = typeof deps.log === 'function' ? deps.log : (msg) => process.stderr.write(`${msg}\n`);

    let state;
    try {
        state = stateIo.read(statePath);
    } catch (err) {
        process.stderr.write(`vocalls.main: ${err.message}\n`);
        return { exitCode: 1, finalState: null };
    }

    // Readline only when interactive gates may fire.
    let rl = deps.rl;
    let ownsRl = false;
    if (!opts.auto && !rl) {
        rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        ownsRl = true;
    }

    const telemetry = (evt) => {
        appendRunLog(projectDir, { ts: new Date().toISOString(), kind: 'telemetry', ...evt });
    };

    const dispatchDeps = { client: sdk, onTelemetry: telemetry };
    if (deps.briefText) dispatchDeps.briefText = deps.briefText;

    let exitCode = 0;
    try {
        for (let i = 0; i < MAX_LOOP_ITERATIONS; i++) {
            if (isDone(state) || escalatedState(state)) break;

            const gate = fsm.needsUserGate(state);
            if (gate) {
                const gateModule = gateModuleFor(gate.gateName, gateModules);
                const choice = await runGate(state, gateModule, projectDir, opts, rl, write);
                state = stateIo.mutate(statePath, (s) =>
                    fsm.applyGate(s, gate.gateName, { choice })
                );
                continue;
            }

            const stage = state._meta.stage;
            let result;
            try {
                result = await runner.dispatch(stage, state, dispatchDeps);
            } catch (err) {
                log(`vocalls.main: dispatch threw at stage "${stage}": ${err.message}`);
                throw err;
            }

            // STAGE_NOOP from the runner means "this stage's work is already
            // current at the recorded input hash". Advance the cursor as if
            // STAGE_COMPLETE so the loop progresses. FSM's applyResult on
            // STAGE_NOOP is a no-op by contract (see orchestratorFsm JSDoc).
            const tokenForFsm =
                result.token === 'STAGE_NOOP'
                    ? { token: 'STAGE_COMPLETE', reason: result.reason || 'noop:hash-match' }
                    : result;

            state = stateIo.mutate(statePath, (s) =>
                fsm.applyResult(s, tokenForFsm, { force: opts.force })
            );
        }
        if (!isDone(state) && !escalatedState(state)) {
            throw new Error(
                `vocalls.main: loop exceeded ${MAX_LOOP_ITERATIONS} iterations without reaching done/escalated (stage="${state._meta.stage}", status="${state._meta.status || 'idle'}")`
            );
        }
    } catch (err) {
        process.stderr.write(`vocalls.main: ${err.message}\n`);
        exitCode = 1;
    } finally {
        if (ownsRl && rl && typeof rl.close === 'function') {
            try { rl.close(); } catch (_e) { /* ignore */ }
        }
    }

    if (exitCode === 0 && escalatedState(state)) {
        process.stderr.write(
            `vocalls.main: pipeline escalated (project="${opts.project}")\n`
        );
        exitCode = 3;
    }

    return { exitCode, finalState: state };
}

if (require.main === module) {
    main(process.argv.slice(2)).then(
        ({ exitCode }) => process.exit(exitCode),
        (err) => {
            process.stderr.write(`vocalls.main: ${err.message}\n`);
            process.exit(1);
        }
    );
}

module.exports = { main, parseArgs, VALID_COMMANDS };
