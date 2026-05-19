'use strict';

const designApproval = require('../../../core/gates/designApproval');

function pausedAtDesign(overrides = {}) {
    return {
        _meta: {
            schemaVersion: '2',
            project: 'demo',
            primaryLanguage: 'NL',
            languages: ['NL', 'FR'],
            stage: 'scenarioDesign',
            status: 'paused',
            gateName: 'designApproval',
            gateReason: 'designApproval requested',
            repairRound: 0,
            repairHistory: [],
            createdAt: '2026-05-19T00:00:00.000Z',
            updatedAt: '2026-05-19T00:00:00.000Z',
            inputHashes: { intake: 'a1', scenarioDesign: 'b2' },
            ...overrides,
        },
        scenarioDesign: {
            scenarios: { greeting: { /* … */ }, escalate: {} },
            caseToScenario: { 1: 'greeting', 2: 'escalate', 3: 'greeting' },
        },
        control: {
            userGates: {
                designApproval: 'pending',
                qualityGate: 'pending',
                translateGate: 'pending',
            },
        },
    };
}

describe('designApproval — formatQuestion', () => {
    test('returns { prompt, choices, defaultChoice } with at least 2 choices including the default', () => {
        const r = designApproval.formatQuestion(pausedAtDesign());
        expect(typeof r.prompt).toBe('string');
        expect(r.prompt.length).toBeGreaterThan(0);
        expect(r.choices).toEqual(['accept', 'revise']);
        expect(r.defaultChoice).toBe('accept');
        expect(r.choices).toContain(r.defaultChoice);
    });

    test('prompt mentions scenario and case counts', () => {
        const r = designApproval.formatQuestion(pausedAtDesign());
        expect(r.prompt).toMatch(/Scenarios drafted: 2/);
        expect(r.prompt).toMatch(/Cases mapped: 3/);
    });

    test('two calls with same input yield byte-equal output (pure)', () => {
        const a = designApproval.formatQuestion(pausedAtDesign());
        const b = designApproval.formatQuestion(pausedAtDesign());
        expect(a).toEqual(b);
    });

    test('throws on missing _meta', () => {
        expect(() => designApproval.formatQuestion({})).toThrow(
            /^gates\.designApproval\.formatQuestion:/
        );
    });
});

describe('designApproval — applyChoice', () => {
    test('accept advances to configBuild', () => {
        const next = designApproval.applyChoice(pausedAtDesign(), 'accept');
        expect(next._meta.stage).toBe('configBuild');
        expect(next._meta.status).toBe('running');
        expect(next._meta.gateName).toBeUndefined();
        expect(next.control.userGates.designApproval).toBe('approved');
    });

    test('revise rewinds to scenarioDesign, clears inputHashes.scenarioDesign, increments repairRound', () => {
        const start = pausedAtDesign();
        const next = designApproval.applyChoice(start, 'revise');
        expect(next._meta.stage).toBe('scenarioDesign');
        expect(next._meta.status).toBe('running');
        expect(next._meta.inputHashes.scenarioDesign).toBeUndefined();
        expect(next._meta.inputHashes.intake).toBe('a1');
        expect(next._meta.repairRound).toBe(1);
        expect(next.control.userGates.designApproval).toBe('revised');
    });

    test('does not mutate the input state', () => {
        const start = pausedAtDesign();
        const snapshot = JSON.stringify(start);
        designApproval.applyChoice(start, 'accept');
        expect(JSON.stringify(start)).toBe(snapshot);
    });

    test('unknown choice throws', () => {
        expect(() => designApproval.applyChoice(pausedAtDesign(), 'maybe')).toThrow(
            /unknown choice "maybe"/
        );
    });

    test('non-string choice throws', () => {
        expect(() => designApproval.applyChoice(pausedAtDesign(), null)).toThrow(
            /choice must be a string/
        );
    });
});
