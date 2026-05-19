'use strict';

/**
 * core/prompts/projections/configBuild.js
 *
 * Tier B user-turn payload builder for the configBuild stage
 * (DESIGN §6, plan U7). Pure function: `(state) → projectedBlock`.
 *
 * The config builder writes slot-map content in every language but
 * leaves non-primary slots filled with `[<LANG>_UNTRANSLATED]` for the
 * translator to fill in stage 5. The section headers and the placeholder
 * helper are projected here so the builder doesn't recompute them.
 *
 * Inputs:
 *   state — `PipelineState` (reads `._meta.languages`)
 *
 * Output:
 *   {
 *     sectionHeaders: { [lang]: { Guardrails, Persona, CompanyInfo, LanguageRule } },
 *     untranslatedPlaceholder: (lang) => `[${lang}_UNTRANSLATED]`,
 *   }
 *
 * Public API:
 *   buildConfigBuildProjection(state) → projectedBlock
 */

const { LANGUAGE_HEADERS } = require('../../languageHeaders');

function untranslatedPlaceholder(lang) {
    if (typeof lang !== 'string' || lang.length === 0) {
        throw new Error(
            'prompts.projections.configBuild.untranslatedPlaceholder: lang must be a non-empty string'
        );
    }
    return `[${lang}_UNTRANSLATED]`;
}

function buildConfigBuildProjection(state) {
    if (!state || !state._meta) {
        throw new Error(
            'prompts.projections.configBuild: state._meta is required'
        );
    }
    const languages = state._meta.languages;
    if (!Array.isArray(languages) || languages.length === 0) {
        throw new Error(
            'prompts.projections.configBuild: state._meta.languages must be a non-empty array'
        );
    }

    const sectionHeaders = {};
    for (const lang of languages) {
        if (!Object.prototype.hasOwnProperty.call(LANGUAGE_HEADERS, lang)) {
            throw new Error(
                `prompts.projections.configBuild: unknown language "${lang}" in state._meta.languages`
            );
        }
        sectionHeaders[lang] = { ...LANGUAGE_HEADERS[lang] };
    }

    return {
        sectionHeaders,
        untranslatedPlaceholder,
    };
}

module.exports = { buildConfigBuildProjection, untranslatedPlaceholder };
