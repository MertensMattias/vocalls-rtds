'use strict';

/**
 * core/prompts/projections/scenarioDesign.js
 *
 * Tier B user-turn payload builder for the scenarioDesign stage
 * (DESIGN §6, plan U7). Pure function: `(state) → projectedBlock`.
 *
 * The scenario designer authors DSL in the primary language only. The
 * grounding line and section headers projected here are the canonical
 * primary-language strings (from `core/grounding-line.js` and
 * `core/languageHeaders.js`); the translator copies them verbatim into
 * sibling languages later (DESIGN §F4).
 *
 * Inputs:
 *   state — `PipelineState` (reads `._meta.primaryLanguage`, `._meta.languages`)
 *
 * Output:
 *   {
 *     groundingLine: string,                  // primary-language grounding sentence
 *     sectionHeaders: { [lang]: { Guardrails, Persona, CompanyInfo, LanguageRule } },
 *   }
 *
 * Public API:
 *   buildScenarioDesignProjection(state) → projectedBlock
 */

const { getGroundingLine } = require('../../grounding-line');
const { LANGUAGE_HEADERS } = require('../../languageHeaders');

function buildScenarioDesignProjection(state) {
    if (!state || !state._meta) {
        throw new Error(
            'prompts.projections.scenarioDesign: state._meta is required'
        );
    }
    const primary = state._meta.primaryLanguage;
    const languages = state._meta.languages;
    if (typeof primary !== 'string') {
        throw new Error(
            'prompts.projections.scenarioDesign: state._meta.primaryLanguage must be a string'
        );
    }
    if (!Array.isArray(languages) || languages.length === 0) {
        throw new Error(
            'prompts.projections.scenarioDesign: state._meta.languages must be a non-empty array'
        );
    }

    const sectionHeaders = {};
    for (const lang of languages) {
        if (!Object.prototype.hasOwnProperty.call(LANGUAGE_HEADERS, lang)) {
            throw new Error(
                `prompts.projections.scenarioDesign: unknown language "${lang}" in state._meta.languages`
            );
        }
        sectionHeaders[lang] = { ...LANGUAGE_HEADERS[lang] };
    }

    return {
        groundingLine: getGroundingLine(primary),
        sectionHeaders,
    };
}

module.exports = { buildScenarioDesignProjection };
