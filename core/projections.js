'use strict';

/**
 * Projections — strip pipeline artifacts to minimal fields for the next stage.
 *
 * Each projection is a pure function: (artifact) → projectedArtifact
 * They reduce token overhead when passing context between pipeline stages.
 */

const { stripKey } = require('./languageDeletion');

/**
 * Project a CONFIG for the semantic-validator pre-translation dispatch.
 * Strips every non-primary language slot. Keeps _meta.languages for info
 * (the semantic validator uses it to know which languages will be filled later).
 *
 * Pure function — returns a deep-cloned config; does not mutate input.
 *
 * @param {object} config  — the CONFIG object (as exported by AGENT_<id>.js)
 * @returns {object}
 */
const projectForSemanticValidator = (config) => {
    if (!config || typeof config !== 'object') return {};
    const primary = config._meta && config._meta.primaryLanguage;
    if (!primary) return config;
    const languages = (config._meta && config._meta.languages) || [primary];
    let out = config;
    for (const lang of languages) {
        if (lang !== primary) {
            out = stripKey(out, lang);
        }
    }
    // Preserve _meta.languages as info (stripKey did not descend into it because
    // _meta lives under _meta, not under a lang key).
    if (out._meta) {
        out._meta.languages = languages.slice();
    }
    return out;
};

/**
 * Project a CONFIG to just the fields that matter for prompt-facing review
 * (Prompt Reviewer + Semantic Validator). Strips non-primary languages (via
 * projectForSemanticValidator), drops structural/runtime fields, preserves
 * CANONICAL_RULES (needed for Check 16), and serializes refineScenario to
 * source text.
 *
 * @param {object} config  - the CONFIG object (as exported by AGENT_<id>.js)
 * @returns {object}
 */
const projectPromptFacing = (config) => {
    if (!config || typeof config !== 'object') return {};
    const langStripped = projectForSemanticValidator(config);

    const prunedActions = {};
    if (langStripped.actions) {
        for (const name of Object.keys(langStripped.actions)) {
            const a = langStripped.actions[name];
            prunedActions[name] = {
                description: a.description,
                confirmation_message: a.confirmation_message,
                confirmation: a.confirmation,
                entities: a.entities,
                messages: a.messages,
            };
        }
    }

    const out = {
        _meta: langStripped._meta,
        persona: langStripped.persona,
        companyInfo: langStripped.companyInfo,
        caseToOpening: langStripped.caseToOpening,
        caseToScenario: langStripped.caseToScenario,
        caseToActions: langStripped.caseToActions,
        caseToKnowledge: langStripped.caseToKnowledge,
        scenarios: langStripped.scenarios,
        knowledgeModules: langStripped.knowledgeModules,
        fallback: langStripped.fallback,
        CANONICAL_RULES: langStripped.CANONICAL_RULES,
        actions: prunedActions,
        refineScenarioSource:
            typeof config.refineScenario === 'function' ? config.refineScenario.toString() : null,
    };

    return out;
};

module.exports = {
    projectForSemanticValidator,
    projectPromptFacing,
};
