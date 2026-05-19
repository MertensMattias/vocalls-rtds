'use strict';

/**
 * core/languageHeaders.js
 *
 * Canonical section-header strings for the assembled `advancedInstructions`
 * blocks per language. Tier B source of truth (DESIGN §6) — consumed by
 * `core/prompts/projections/configBuild.js` (all languages) and
 * `core/prompts/projections/translate.js` (target language only) via the
 * `sectionHeaders: { Guardrails, Persona, CompanyInfo, LanguageRule }`
 * projection.
 *
 * These strings are NEVER translated at runtime. The configBuild stage
 * writes them verbatim into the slotMap; the translator preserves them
 * across language fan-out. Drift from this table is what the prompt-
 * layer-map drift discipline catches (DESIGN §6 / R7).
 *
 * Origin: ADR-006 voice register and the workflow-main-v2 `language-
 * headers.md` reference (retired). This module is the new single source
 * of truth for the four section headers per language.
 *
 * Public API:
 *   LANGUAGE_HEADERS      -- deep-frozen { NL, FR, DE, EN } -> { Guardrails,
 *                            Persona, CompanyInfo, LanguageRule }
 *   getLanguageHeaders(lang) -> object for the requested language
 */

const LANGUAGE_HEADERS = Object.freeze({
    NL: Object.freeze({
        Guardrails: '# GEDRAGSRICHTLIJNEN',
        Persona: '# PERSONA',
        CompanyInfo: '# BEDRIJFSINFORMATIE',
        LanguageRule: '# TAALREGEL',
    }),
    FR: Object.freeze({
        Guardrails: '# DIRECTIVES DE COMPORTEMENT',
        Persona: '# PERSONA',
        CompanyInfo: "# INFORMATIONS SUR L'ENTREPRISE",
        LanguageRule: '# RÈGLE DE LANGUE',
    }),
    DE: Object.freeze({
        Guardrails: '# VERHALTENSRICHTLINIEN',
        Persona: '# PERSONA',
        CompanyInfo: '# UNTERNEHMENSINFORMATIONEN',
        LanguageRule: '# SPRACHREGEL',
    }),
    EN: Object.freeze({
        Guardrails: '# BEHAVIOUR GUIDELINES',
        Persona: '# PERSONA',
        CompanyInfo: '# COMPANY INFORMATION',
        LanguageRule: '# LANGUAGE RULE',
    }),
});

function getLanguageHeaders(lang) {
    if (!Object.prototype.hasOwnProperty.call(LANGUAGE_HEADERS, lang)) {
        throw new Error(`languageHeaders.getLanguageHeaders: unknown language "${lang}"`);
    }
    return LANGUAGE_HEADERS[lang];
}

module.exports = { LANGUAGE_HEADERS, getLanguageHeaders };
