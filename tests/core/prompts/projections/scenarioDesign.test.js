'use strict';

const {
    buildScenarioDesignProjection,
} = require('../../../../core/prompts/projections/scenarioDesign');
const {
    LANGUAGE_HEADERS,
} = require('../../../../core/languageHeaders');
const { GROUNDING_LINES } = require('../../../../core/grounding-line');

function baseState(overrides = {}) {
    return {
        _meta: {
            primaryLanguage: 'NL',
            languages: ['NL', 'FR', 'DE', 'EN'],
            ...overrides,
        },
    };
}

describe('scenarioDesign projection — grounding line', () => {
    test('returns the canonical primary-language grounding line', () => {
        const r = buildScenarioDesignProjection(baseState());
        expect(r.groundingLine).toBe(GROUNDING_LINES.NL);
    });

    test('switches when primaryLanguage changes', () => {
        const r = buildScenarioDesignProjection(
            baseState({ primaryLanguage: 'FR' })
        );
        expect(r.groundingLine).toBe(GROUNDING_LINES.FR);
    });
});

describe('scenarioDesign projection — section headers', () => {
    test('contains an entry per language in state._meta.languages', () => {
        const r = buildScenarioDesignProjection(baseState());
        expect(Object.keys(r.sectionHeaders).sort()).toEqual(
            ['DE', 'EN', 'FR', 'NL'].sort()
        );
    });

    test('each entry matches LANGUAGE_HEADERS', () => {
        const r = buildScenarioDesignProjection(baseState());
        for (const lang of ['NL', 'FR', 'DE', 'EN']) {
            expect(r.sectionHeaders[lang]).toEqual({ ...LANGUAGE_HEADERS[lang] });
        }
    });

    test('subset languages produce subset headers', () => {
        const r = buildScenarioDesignProjection(
            baseState({ languages: ['NL', 'EN'], primaryLanguage: 'NL' })
        );
        expect(Object.keys(r.sectionHeaders).sort()).toEqual(['EN', 'NL']);
    });
});

describe('scenarioDesign projection — purity', () => {
    test('two calls return deep-equal output', () => {
        expect(buildScenarioDesignProjection(baseState())).toEqual(
            buildScenarioDesignProjection(baseState())
        );
    });

    test('mutating result does not affect subsequent calls', () => {
        const r = buildScenarioDesignProjection(baseState());
        r.sectionHeaders.NL.Persona = 'mutated';
        const r2 = buildScenarioDesignProjection(baseState());
        expect(r2.sectionHeaders.NL.Persona).toBe('# PERSONA');
    });
});

describe('scenarioDesign projection — guards', () => {
    test('throws on missing _meta', () => {
        expect(() => buildScenarioDesignProjection({})).toThrow(
            /^prompts\.projections\.scenarioDesign:/
        );
    });

    test('throws on unknown language in _meta.languages', () => {
        expect(() =>
            buildScenarioDesignProjection({
                _meta: { primaryLanguage: 'NL', languages: ['NL', 'PT'] },
            })
        ).toThrow(/unknown language "PT"/);
    });

    test('throws on empty languages array', () => {
        expect(() =>
            buildScenarioDesignProjection({
                _meta: { primaryLanguage: 'NL', languages: [] },
            })
        ).toThrow(/non-empty array/);
    });
});
