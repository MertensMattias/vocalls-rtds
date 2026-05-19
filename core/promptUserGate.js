'use strict';

/**
 * core/promptUserGate.js
 *
 * Side-effecting CLI driver for the user-gate flow (DESIGN §10). The
 * gate modules in `core/gates/*` are pure — `formatQuestion`
 * builds the prompt + choices, `applyChoice` transitions state. This
 * driver bridges them to the terminal:
 *
 *   - `--auto: false` (default): print the gate prompt + choice list,
 *     read a line from the injected `readline` interface, return the
 *     selected choice. Re-prompts on unknown input until a valid
 *     choice or EOF.
 *   - `--auto: true`: pick the gate's `defaultChoice`, skip stdin,
 *     append a `{ ts, auto: true, gate, choice }` record to
 *     `<projectDir>/.vocalls/run.log.jsonl`, and return the choice.
 *
 * The readline interface is injected so tests can drive it without
 * mocking stdin. The run-log path is derived from the project root and
 * the constant `RUN_LOG_PATH`; the driver creates the parent directory
 * if missing.
 *
 * Public API:
 *   promptUserGate({ gate, state, projectDir, auto, rl, write }) → Promise<choice>
 *     - `gate`: gate module from `core/gates/*` (must export
 *       formatQuestion, defaultChoice, CHOICES)
 *     - `state`: pipeline state passed to gate.formatQuestion
 *     - `projectDir`: absolute project directory (for run-log path)
 *     - `auto`: boolean; default false
 *     - `rl`: optional readline.Interface; only required when auto=false
 *     - `write`: optional `(text) => void` for prompt output; default
 *       writes to process.stdout. Tests inject a recording sink.
 */

const fs = require('fs');
const path = require('path');

const { RUN_LOG_PATH } = require('./orchestrator-constants');

function appendRunLog(projectDir, entry) {
    const logPath = path.join(projectDir, RUN_LOG_PATH);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
}

function defaultWrite(text) {
    process.stdout.write(text);
}

function questionAsync(rl, prompt) {
    return new Promise((resolve, reject) => {
        try {
            rl.question(prompt, (answer) => resolve(answer));
        } catch (err) {
            reject(err);
        }
    });
}

async function promptUserGate(opts) {
    if (!opts || typeof opts !== 'object') {
        throw new Error('promptUserGate: opts is required');
    }
    const { gate, state, projectDir, auto = false, rl, write } = opts;
    if (!gate || typeof gate.formatQuestion !== 'function') {
        throw new Error(
            'promptUserGate: opts.gate must export formatQuestion'
        );
    }
    if (typeof projectDir !== 'string' || projectDir.length === 0) {
        throw new Error(
            'promptUserGate: opts.projectDir must be a non-empty string'
        );
    }
    const writer = typeof write === 'function' ? write : defaultWrite;
    const { prompt, choices, defaultChoice } = gate.formatQuestion(state);

    if (auto) {
        if (!choices.includes(defaultChoice)) {
            throw new Error(
                `promptUserGate: gate "${gate.GATE_NAME}" defaultChoice "${defaultChoice}" is not in declared choices [${choices.join(', ')}]`
            );
        }
        appendRunLog(projectDir, {
            ts: new Date().toISOString(),
            auto: true,
            gate: gate.GATE_NAME,
            choice: defaultChoice,
        });
        return defaultChoice;
    }

    if (!rl || typeof rl.question !== 'function') {
        throw new Error(
            'promptUserGate: opts.rl (readline.Interface) is required when auto is false'
        );
    }

    writer(prompt + '\n');
    writer(`Choices: ${choices.join(' / ')} [default: ${defaultChoice}]\n`);
    // Re-prompt on unknown input. Empty input picks defaultChoice.
    for (;;) {
        const raw = await questionAsync(rl, '> ');
        const answer = (raw || '').trim();
        if (answer.length === 0) return defaultChoice;
        if (choices.includes(answer)) return answer;
        writer(`Unknown choice "${answer}". Pick one of: ${choices.join(', ')}.\n`);
    }
}

module.exports = { promptUserGate };
