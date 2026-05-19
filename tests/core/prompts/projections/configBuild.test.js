'use strict';

const {
    buildConfigBuildProjection,
    untranslatedPlaceholder,
} = require('../../../../core/prompts/projections/configBuild');
const {
    LANGUAGE_HEADERS,
} = require('../../../../core/languageHeaders');

function baseState(languages = ['NL', 'FR', 'DE', 'EN']) {
    return { _meta: { primaryLanguage: 'NL', languages } };
}

describe('configBuild projection — section headers', () => {
    test('populated for every language in state._meta.languages', () => {
        const r = buildConfigBuildProjection(baseState());
        for (const lang of ['NL', 'FR', 'DE', 'EN']) {
            expect(r.sectionHeaders[lang]).toEqual({ ...LANGUAGE_HEADERS[lang] });
        }
    });

    test('subset languages produce subset entries (no extras)', () => {
        const r = buildConfigBuildProjection(baseState(['NL', 'EN']));
        expect(Object.keys(r.sectionHeaders).sort()).toEqual(['EN', 'NL']);
    });
});

describe('configBuild projection — untranslatedPlaceholder', () => {
    test('is a function returning the canonical placeholder', () => {
        const r = buildConfigBuildProjection(baseState());
        expect(typeof r.untranslatedPlaceholder).toBe('function');
        expect(r.untranslatedPlaceholder('FR')).toBe('[FR_UNTRANSLATED]');
        expect(r.untranslatedPlaceholder('NL')).toBe('[NL_UNTRANSLATED]');
        expect(r.untranslatedPlaceholder('EN')).toBe('[EN_UNTRANSLATED]');
    });

    test('throws on empty / non-string argument', () => {
        expect(() => untranslatedPlaceholder('')).toThrow(
            /^prompts\.projections\.configBuild\.untranslatedPlaceholder:/
        );
        expect(() => untranslatedPlaceholder(null)).toThrow(
            /^prompts\.projections\.configBuild\.untranslatedPlaceholder:/
        );
    });
});

describe('configBuild projection — purity', () => {
    test('two calls return deep-equal sectionHeaders', () => {
        const a = buildConfigBuildProjection(baseState());
        const b = buildConfigBuildProjection(baseState());
        expect(a.sectionHeaders).toEqual(b.sectionHeaders);
    });

    test('mutating sectionHeaders does not affect subsequent calls', () => {
        const r = buildConfigBuildProjection(baseState());
        r.sectionHeaders.FR.Persona = 'mutated';
        const r2 = buildConfigBuildProjection(baseState());
        expect(r2.sectionHeaders.FR.Persona).toBe('# PERSONA');
    });
});

describe('configBuild projection — guards', () => {
    test('throws when _meta is missing', () => {
        expect(() => buildConfigBuildProjection({})).toThrow(
            /^prompts\.projections\.configBuild:/
        );
    });

    test('throws on unknown language', () => {
        expect(() =>
            buildConfigBuildProjection(baseState(['NL', 'PT']))
        ).toThrow(/unknown language "PT"/);
    });
});
