'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const { promptUserGate } = require('../../core/promptUserGate');
const designApproval = require('../../core/gates/designApproval');

function makeProjectDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'vocalls-promptUserGate-'));
}

function pausedAtDesign() {
    return {
        _meta: {
            primaryLanguage: 'NL',
            languages: ['NL'],
            stage: 'scenarioDesign',
            status: 'paused',
            gateName: 'designApproval',
            repairRound: 0,
            inputHashes: {},
        },
        scenarioDesign: { scenarios: { x: {} }, caseToScenario: { 1: 'x' } },
        control: { userGates: {} },
    };
}

// Minimal fake readline.Interface: answers are pre-queued; question()
// pops the next and feeds it to the callback.
function fakeReadline(answers) {
    const queue = answers.slice();
    return {
        question(prompt, cb) {
            if (queue.length === 0) {
                throw new Error('fakeReadline: queue exhausted');
            }
            const next = queue.shift();
            // Defer so the caller sees promptUserGate's loop yield.
            setImmediate(() => cb(next));
        },
    };
}

describe('promptUserGate — auto mode', () => {
    test('returns defaultChoice and appends a {auto:true, gate, choice} record to run.log.jsonl', async () => {
        const projectDir = makeProjectDir();
        try {
            const choice = await promptUserGate({
                gate: designApproval,
                state: pausedAtDesign(),
                projectDir,
                auto: true,
            });
            expect(choice).toBe(designApproval.DEFAULT_CHOICE);

            const logPath = path.join(projectDir, '.vocalls', 'run.log.jsonl');
            const log = fs.readFileSync(logPath, 'utf8').trim().split('\n');
            expect(log).toHaveLength(1);
            const entry = JSON.parse(log[0]);
            expect(entry.auto).toBe(true);
            expect(entry.gate).toBe('designApproval');
            expect(entry.choice).toBe(designApproval.DEFAULT_CHOICE);
            expect(typeof entry.ts).toBe('string');
        } finally {
            fs.rmSync(projectDir, { recursive: true, force: true });
        }
    });

    test('creates the .vocalls/ directory if missing', async () => {
        const projectDir = makeProjectDir();
        try {
            await promptUserGate({
                gate: designApproval,
                state: pausedAtDesign(),
                projectDir,
                auto: true,
            });
            expect(fs.existsSync(path.join(projectDir, '.vocalls'))).toBe(true);
        } finally {
            fs.rmSync(projectDir, { recursive: true, force: true });
        }
    });
});

describe('promptUserGate — interactive mode (injected readline)', () => {
    test('returns the user-selected choice when valid', async () => {
        const projectDir = makeProjectDir();
        try {
            const writes = [];
            const choice = await promptUserGate({
                gate: designApproval,
                state: pausedAtDesign(),
                projectDir,
                auto: false,
                rl: fakeReadline(['revise']),
                write: (t) => writes.push(t),
            });
            expect(choice).toBe('revise');
            expect(writes.join('')).toMatch(/accept \/ revise/);
        } finally {
            fs.rmSync(projectDir, { recursive: true, force: true });
        }
    });

    test('blank input picks defaultChoice', async () => {
        const projectDir = makeProjectDir();
        try {
            const choice = await promptUserGate({
                gate: designApproval,
                state: pausedAtDesign(),
                projectDir,
                auto: false,
                rl: fakeReadline(['']),
                write: () => {},
            });
            expect(choice).toBe(designApproval.DEFAULT_CHOICE);
        } finally {
            fs.rmSync(projectDir, { recursive: true, force: true });
        }
    });

    test('re-prompts on unknown input until a valid choice is given', async () => {
        const projectDir = makeProjectDir();
        try {
            const writes = [];
            const choice = await promptUserGate({
                gate: designApproval,
                state: pausedAtDesign(),
                projectDir,
                auto: false,
                rl: fakeReadline(['nope', 'maybe', 'accept']),
                write: (t) => writes.push(t),
            });
            expect(choice).toBe('accept');
            expect(writes.join('')).toMatch(/Unknown choice "nope"/);
            expect(writes.join('')).toMatch(/Unknown choice "maybe"/);
        } finally {
            fs.rmSync(projectDir, { recursive: true, force: true });
        }
    });

    test('does NOT append to run.log.jsonl in interactive mode', async () => {
        const projectDir = makeProjectDir();
        try {
            await promptUserGate({
                gate: designApproval,
                state: pausedAtDesign(),
                projectDir,
                auto: false,
                rl: fakeReadline(['accept']),
                write: () => {},
            });
            const logPath = path.join(projectDir, '.vocalls', 'run.log.jsonl');
            expect(fs.existsSync(logPath)).toBe(false);
        } finally {
            fs.rmSync(projectDir, { recursive: true, force: true });
        }
    });

    test('throws if auto is false and no readline provided', async () => {
        const projectDir = makeProjectDir();
        try {
            await expect(
                promptUserGate({
                    gate: designApproval,
                    state: pausedAtDesign(),
                    projectDir,
                    auto: false,
                })
            ).rejects.toThrow(/readline.Interface/);
        } finally {
            fs.rmSync(projectDir, { recursive: true, force: true });
        }
    });
});

describe('promptUserGate — input guards', () => {
    test('throws when gate is missing formatQuestion', async () => {
        await expect(
            promptUserGate({ gate: {}, projectDir: '/tmp', auto: true })
        ).rejects.toThrow(/formatQuestion/);
    });

    test('throws when projectDir is empty', async () => {
        await expect(
            promptUserGate({ gate: designApproval, projectDir: '', auto: true })
        ).rejects.toThrow(/projectDir/);
    });
});
