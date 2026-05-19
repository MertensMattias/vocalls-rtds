'use strict';

const translateGate = require('../../../core/gates/translateGate');

function pausedAtTranslate(overrides = {}) {
    return {
        _meta: {
            schemaVersion: '2',
            project: 'demo',
            primaryLanguage: 'NL',
            languages: ['NL', 'FR', 'DE'],
            stage: 'validate',
            status: 'paused',
            gateName: 'translateGate',
            gateReason: 'pre-translate confirmation',
            repairRound: 0,
            repairHistory: [],
            createdAt: '2026-05-19T00:00:00.000Z',
            updatedAt: '2026-05-19T00:00:00.000Z',
            inputHashes: {},
            ...overrides,
        },
        control: {
            userGates: {
                designApproval: 'approved',
                qualityGate: 'approved',
                translateGate: 'pending',
            },
        },
    };
}

describe('translateGate — formatQuestion', () => {
    test('returns { prompt, choices, defaultChoice }', () => {
        const r = translateGate.formatQuestion(pausedAtTranslate());
        expect(r.choices).toEqual(['accept', 'decline']);
        expect(r.defaultChoice).toBe('accept');
        expect(r.choices).toContain(r.defaultChoice);
    });

    test('prompt names the non-primary languages', () => {
        const r = translateGate.formatQuestion(pausedAtTranslate());
        expect(r.prompt).toMatch(/Primary language: NL/);
        expect(r.prompt).toMatch(/FR, DE/);
    });

    test('handles primary-only configurations', () => {
        const r = translateGate.formatQuestion(
            pausedAtTranslate({ languages: ['NL'] })
        );
        expect(r.prompt).toMatch(/no sibling languages/);
    });

    test('two calls with same input yield byte-equal output (pure)', () => {
        expect(translateGate.formatQuestion(pausedAtTranslate())).toEqual(
            translateGate.formatQuestion(pausedAtTranslate())
        );
    });
});

describe('translateGate — applyChoice', () => {
    test('accept advances stage (validate → translate)', () => {
        const next = translateGate.applyChoice(pausedAtTranslate(), 'accept');
        expect(next._meta.stage).toBe('translate');
        expect(next._meta.status).toBe('running');
        expect(next.control.userGates.translateGate).toBe('approved');
    });

    test('decline marks pipeline done without running translate', () => {
        const next = translateGate.applyChoice(pausedAtTranslate(), 'decline');
        expect(next._meta.stage).toBe('done');
        expect(next._meta.status).toBe('running');
        expect(next._meta.gateName).toBeUndefined();
        expect(next.control.userGates.translateGate).toBe('declined');
    });

    test('does not mutate the input state', () => {
        const start = pausedAtTranslate();
        const snapshot = JSON.stringify(start);
        translateGate.applyChoice(start, 'accept');
        expect(JSON.stringify(start)).toBe(snapshot);
    });

    test('unknown choice throws', () => {
        expect(() => translateGate.applyChoice(pausedAtTranslate(), 'maybe')).toThrow(
            /unknown choice "maybe"/
        );
    });
});
