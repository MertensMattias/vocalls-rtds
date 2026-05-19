'use strict';

const {
    LANGUAGE_HEADERS,
    getLanguageHeaders,
} = require('../../core/languageHeaders');

const REQUIRED_LANGS = ['NL', 'FR', 'DE', 'EN'];
const REQUIRED_KEYS = ['Guardrails', 'Persona', 'CompanyInfo', 'LanguageRule'];

describe('LANGUAGE_HEADERS — 4x4 matrix', () => {
    test('exposes exactly the four supported languages', () => {
        expect(Object.keys(LANGUAGE_HEADERS).sort()).toEqual(
            REQUIRED_LANGS.slice().sort()
        );
    });

    for (const lang of REQUIRED_LANGS) {
        test(`${lang} has all four section keys with non-empty strings`, () => {
            const entry = LANGUAGE_HEADERS[lang];
            expect(Object.keys(entry).sort()).toEqual(REQUIRED_KEYS.slice().sort());
            for (const key of REQUIRED_KEYS) {
                expect(typeof entry[key]).toBe('string');
                expect(entry[key].length).toBeGreaterThan(0);
            }
        });
    }
});

describe('LANGUAGE_HEADERS — canonical phrasings (pins ADR-006 strings)', () => {
    test('NL canonical headers', () => {
        expect(LANGUAGE_HEADERS.NL).toEqual({
            Guardrails: '# GEDRAGSRICHTLIJNEN',
            Persona: '# PERSONA',
            CompanyInfo: '# BEDRIJFSINFORMATIE',
            LanguageRule: '# TAALREGEL',
        });
    });
    test('FR canonical headers (with apostrophe in CompanyInfo)', () => {
        expect(LANGUAGE_HEADERS.FR.CompanyInfo).toBe(
            "# INFORMATIONS SUR L'ENTREPRISE"
        );
    });
    test('DE canonical headers', () => {
        expect(LANGUAGE_HEADERS.DE.Guardrails).toBe('# VERHALTENSRICHTLINIEN');
    });
    test('EN canonical headers', () => {
        expect(LANGUAGE_HEADERS.EN.LanguageRule).toBe('# LANGUAGE RULE');
    });
});

describe('LANGUAGE_HEADERS — deep-frozen', () => {
    test('top-level is frozen', () => {
        expect(Object.isFrozen(LANGUAGE_HEADERS)).toBe(true);
    });
    test('each per-language record is frozen', () => {
        for (const lang of REQUIRED_LANGS) {
            expect(Object.isFrozen(LANGUAGE_HEADERS[lang])).toBe(true);
        }
    });
    test('reassigning a frozen value is a no-op in strict mode (writeable=false)', () => {
        'use strict';
        // We are in strict mode at the file level, so attempts to assign
        // through the frozen reference throw. Use a try/catch around the
        // throwing assignment so the test verifies the throw rather than
        // crashing on first encounter.
        expect(() => {
            LANGUAGE_HEADERS.NL.Persona = 'mutated';
        }).toThrow();
        expect(LANGUAGE_HEADERS.NL.Persona).toBe('# PERSONA');
    });
});

describe('getLanguageHeaders', () => {
    test('returns the same frozen reference each time', () => {
        expect(getLanguageHeaders('NL')).toBe(LANGUAGE_HEADERS.NL);
        expect(getLanguageHeaders('NL')).toBe(getLanguageHeaders('NL'));
    });
    test('throws module-prefixed error on unknown language', () => {
        expect(() => getLanguageHeaders('PT')).toThrow(
            /^languageHeaders\.getLanguageHeaders:/
        );
    });
});
