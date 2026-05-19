'use strict';

const {
    buildIntakeProjection,
} = require('../../../../core/prompts/projections/intake');
const { SYSTEM_ACTIONS } = require('../../../../core/schema/slotMap');
const {
    SYSTEM_ACTION_SYNONYMS,
} = require('../../../../core/schema/shared');

function baseState() {
    return {
        _meta: {
            schemaVersion: '2',
            project: 'demo',
            primaryLanguage: 'NL',
            languages: ['NL', 'FR'],
            stage: 'intake',
            repairRound: 0,
            inputHashes: {},
        },
        brief: { path: '/tmp/brief.md', sha256: 'abc123' },
    };
}

const EM_DASH = '—';

function placement(action, disposition, kind) {
    return (
        `<!-- BRIEF: action "${action}" disposition "${disposition}" ${EM_DASH} ` +
        `speech-placement: ${kind} (confirmed by user on 2026-05-18) -->`
    );
}

describe('intake projection — shape', () => {
    test('exposes the six expected keys', () => {
        const r = buildIntakeProjection(baseState(), { briefText: '' });
        expect(Object.keys(r).sort()).toEqual(
            [
                'briefPath',
                'briefSha256',
                'parsedMarkers',
                'parserWarnings',
                'systemActions',
                'systemActionSynonyms',
            ].sort()
        );
    });

    test('briefPath/briefSha256 come from state.brief', () => {
        const r = buildIntakeProjection(baseState(), { briefText: '' });
        expect(r.briefPath).toBe('/tmp/brief.md');
        expect(r.briefSha256).toBe('abc123');
    });
});

describe('intake projection — schema-sourced data', () => {
    test('systemActions matches SYSTEM_ACTIONS membership (slotMap.js)', () => {
        const r = buildIntakeProjection(baseState(), { briefText: '' });
        expect(new Set(r.systemActions)).toEqual(SYSTEM_ACTIONS);
    });

    test('systemActionSynonyms matches SYSTEM_ACTION_SYNONYMS (shared.js)', () => {
        const r = buildIntakeProjection(baseState(), { briefText: '' });
        expect(r.systemActionSynonyms).toEqual({ ...SYSTEM_ACTION_SYNONYMS });
    });
});

describe('intake projection — parsedMarkers from parseBrief', () => {
    test('parsedMarkers contains the keys parseBrief returns', () => {
        const brief = placement('send_email', 'REACTIVATE', 'dsl_inline');
        const r = buildIntakeProjection(baseState(), { briefText: brief });
        expect(Object.keys(r.parsedMarkers).sort()).toEqual(
            [
                'actionMessages',
                'customActionMarkers',
                'frontmatter',
                'parserWarnings',
                'speechPlacements',
            ].sort()
        );
        expect(r.parsedMarkers.speechPlacements).toEqual({
            send_email: { REACTIVATE: 'dsl_inline' },
        });
    });

    test('parserWarnings is an array (possibly empty)', () => {
        const r = buildIntakeProjection(baseState(), { briefText: '' });
        expect(Array.isArray(r.parserWarnings)).toBe(true);
        expect(r.parserWarnings).toEqual([]);
    });

    test('parserWarnings mirrors parseBrief warnings on malformed input', () => {
        const brief = '<!-- BRIEF: garbage shape here -->';
        const r = buildIntakeProjection(baseState(), { briefText: brief });
        expect(r.parserWarnings.length).toBeGreaterThan(0);
        expect(r.parsedMarkers.parserWarnings).toEqual(r.parserWarnings);
    });
});

describe('intake projection — purity', () => {
    test('two calls with the same input return deep-equal output', () => {
        const brief = placement('a', 'X', 'dsl_inline');
        const a = buildIntakeProjection(baseState(), { briefText: brief });
        const b = buildIntakeProjection(baseState(), { briefText: brief });
        expect(a).toEqual(b);
    });

    test('mutating the result does not affect subsequent calls', () => {
        const r1 = buildIntakeProjection(baseState(), { briefText: '' });
        r1.systemActions.push('mutation');
        r1.parserWarnings.push('mutation');
        const r2 = buildIntakeProjection(baseState(), { briefText: '' });
        expect(r2.systemActions).not.toContain('mutation');
        expect(r2.parserWarnings).not.toContain('mutation');
    });
});

describe('intake projection — input guards', () => {
    test('throws when state is missing', () => {
        expect(() =>
            buildIntakeProjection(null, { briefText: '' })
        ).toThrow(/^prompts\.projections\.intake:/);
    });

    test('throws when deps.briefText is missing', () => {
        expect(() => buildIntakeProjection(baseState(), {})).toThrow(
            /^prompts\.projections\.intake:/
        );
    });
});
