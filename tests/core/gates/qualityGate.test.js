'use strict';

const qualityGate = require('../../../core/gates/qualityGate');

function pausedAtValidate(overrides = {}) {
    return {
        _meta: {
            schemaVersion: '2',
            project: 'demo',
            primaryLanguage: 'NL',
            languages: ['NL'],
            stage: 'validate',
            status: 'paused',
            gateName: 'qualityGate',
            gateReason: 'findings exceed budget',
            repairRound: 0,
            repairHistory: [],
            createdAt: '2026-05-19T00:00:00.000Z',
            updatedAt: '2026-05-19T00:00:00.000Z',
            inputHashes: { intake: 'a1', scenarioDesign: 'b2', configBuild: 'c3', validate: 'd4' },
            ...overrides,
        },
        validation: {
            lastRun: '2026-05-19T00:00:00.000Z',
            findings: [
                { check: 'mode3.dsl', severity: 'error', message: 'broken USE', path: ['scenarios', 'x', 'objective'] },
                { check: 'mode5.fidelity', severity: 'warning', message: 'paraphrased opening', path: ['cases', '1', 'opening'] },
                { check: 'mode1.schema', severity: 'info', message: 'cosmetic' },
            ],
            blocking: true,
            autofixApplied: [],
        },
        control: {
            userGates: {
                designApproval: 'approved',
                qualityGate: 'pending',
                translateGate: 'pending',
            },
        },
    };
}

describe('qualityGate — formatQuestion', () => {
    test('returns { prompt, choices, defaultChoice }', () => {
        const r = qualityGate.formatQuestion(pausedAtValidate());
        expect(r.choices).toEqual(['accept', 'revise']);
        expect(r.defaultChoice).toBe('revise');
        expect(r.choices).toContain(r.defaultChoice);
    });

    test('prompt summarizes findings by severity', () => {
        const r = qualityGate.formatQuestion(pausedAtValidate());
        expect(r.prompt).toMatch(/errors: 1/);
        expect(r.prompt).toMatch(/warnings: 1/);
        expect(r.prompt).toMatch(/info: 1/);
    });

    test('prompt lists top blocking findings only (error + warning)', () => {
        const r = qualityGate.formatQuestion(pausedAtValidate());
        expect(r.prompt).toMatch(/\[error\] mode3\.dsl/);
        expect(r.prompt).toMatch(/\[warning\] mode5\.fidelity/);
        expect(r.prompt).not.toMatch(/\[info\] mode1\.schema/);
    });

    test('two calls with same input yield byte-equal output (pure)', () => {
        expect(qualityGate.formatQuestion(pausedAtValidate())).toEqual(
            qualityGate.formatQuestion(pausedAtValidate())
        );
    });

    test('throws on missing _meta', () => {
        expect(() => qualityGate.formatQuestion({})).toThrow(
            /^gates\.qualityGate\.formatQuestion:/
        );
    });

    test('empty findings → zero counts in prompt', () => {
        const s = pausedAtValidate();
        s.validation.findings = [];
        const r = qualityGate.formatQuestion(s);
        expect(r.prompt).toMatch(/errors: 0/);
        expect(r.prompt).toMatch(/warnings: 0/);
    });
});

describe('qualityGate — applyChoice', () => {
    test('accept advances stage (validate → translate)', () => {
        const next = qualityGate.applyChoice(pausedAtValidate(), 'accept');
        expect(next._meta.stage).toBe('translate');
        expect(next._meta.status).toBe('running');
        expect(next.control.userGates.qualityGate).toBe('approved');
    });

    test('revise rewinds to current stage (validate) and increments repairRound', () => {
        const next = qualityGate.applyChoice(pausedAtValidate(), 'revise');
        expect(next._meta.stage).toBe('validate');
        expect(next._meta.repairRound).toBe(1);
        expect(next._meta.inputHashes.validate).toBeUndefined();
        expect(next._meta.inputHashes.configBuild).toBe('c3');
    });

    test('revise honours explicit routeTo', () => {
        const next = qualityGate.applyChoice(pausedAtValidate(), 'revise', {
            routeTo: 'configBuild',
        });
        expect(next._meta.stage).toBe('configBuild');
        expect(next._meta.inputHashes.configBuild).toBeUndefined();
    });

    test('does not mutate the input state', () => {
        const start = pausedAtValidate();
        const snapshot = JSON.stringify(start);
        qualityGate.applyChoice(start, 'accept');
        expect(JSON.stringify(start)).toBe(snapshot);
    });

    test('unknown choice throws', () => {
        expect(() => qualityGate.applyChoice(pausedAtValidate(), 'skip')).toThrow(
            /unknown choice "skip"/
        );
    });
});
