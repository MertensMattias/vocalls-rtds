'use strict';

/**
 * tests/integration/__fixtures__/minimal-slotmap.js
 *
 * Builds a minimal valid SlotMap (per core/schema/slotMap.js) for the smoke
 * test. Primary language NL is populated; FR, DE, EN slots use the literal
 * '[<LANG>_UNTRANSLATED]' marker until the (stubbed) translator fills them.
 */

const UNTRANSLATED = (lang) => `[${lang}_UNTRANSLATED]`;

function quad(primary, primaryLang) {
    const out = {};
    for (const lang of ['NL', 'FR', 'DE', 'EN']) {
        out[lang] = lang === primaryLang ? primary : UNTRANSLATED(lang);
    }
    return out;
}

function maybeSilentQuad(primary, primaryLang) {
    return quad(primary, primaryLang);
}

function buildMinimalSlotMap(intake, scenarioDesign) {
    const primaryLang = intake.primaryLanguage;

    const persona = {};
    for (const lang of ['NL', 'FR', 'DE', 'EN']) {
        persona[lang] =
            lang === primaryLang
                ? {
                      name: intake.persona.name,
                      companyName: intake.persona.companyName,
                      description: intake.persona.description,
                      tone: intake.persona.tone,
                      companyRole: intake.persona.companyRole,
                  }
                : UNTRANSLATED(lang);
        // PersonaPerLang is z.union(PersonaPrimary, z.string().min(1))
    }

    // Build cases slot map
    const cases = {};
    for (const [caseNum, c] of Object.entries(intake.cases)) {
        const scenarioKey = scenarioDesign.caseToScenario[caseNum];
        cases[caseNum] = {
            opening: quad(`Hallo, ik ben ${intake.persona.name}.`, primaryLang),
            scenario: scenarioKey,
            actions: c.actionsRequired,
            knowledge: c.knowledgeNeeds,
        };
    }

    // Build scenarios slot map
    const scenarios = {};
    for (const sc of scenarioDesign.scenarios) {
        scenarios[sc.name] = {
            objective: quad(sc.objective, primaryLang),
            facts: { [primaryLang]: sc.facts || [] },
        };
    }

    // Build knowledge modules from intake.knowledgeFacts
    const knowledgeModules = {};
    for (const [key, fact] of Object.entries(intake.knowledgeFacts || {})) {
        knowledgeModules[key] = quad(fact, primaryLang);
    }

    // Build actions from intake.cases[*].actionsRequired (deduped)
    const actionNames = new Set();
    for (const c of Object.values(intake.cases)) {
        for (const a of c.actionsRequired) actionNames.add(a);
    }
    const actions = {};
    for (const name of actionNames) {
        actions[name] = {
            description: quad(`Voer ${name} uit.`, primaryLang),
            confirmation_message: maybeSilentQuad('', primaryLang),
            confirmation: 'None',
            entities: {},
            messages: {
                default: {
                    success: maybeSilentQuad('OK.', primaryLang),
                    failure: maybeSilentQuad('Helaas.', primaryLang),
                },
            },
        };
    }

    // Build cdbLogs — PerCaseCdbLogs requires `default: NonEmptyString` plus
    // action-name keys whose values are ActionCdbLogShape
    // ({ default: { success?, failure? } } + disposition catchall). Per
    // ADR-007 (slotMap.js), flat strings at the action level are invalid.
    const cdbLogs = { default: 'log_default' };
    for (const name of actionNames) {
        cdbLogs[name] = { default: { success: 'log_' + name } };
    }

    return {
        projectMeta: {
            projectName: intake.projectName,
            primaryLanguage: primaryLang,
            languages: intake.languages,
        },
        agents: {
            PRIMARY: {
                persona,
                companyInfo: quad(`${intake.persona.companyName} info.`, primaryLang),
                CANONICAL_RULES: [],
                cases,
                scenarios,
                knowledgeModules,
                actions,
                cdbLogs: {
                    [intake.persona.name || 'agent']: cdbLogs,
                },
                EXPORT_MAP: {},
            },
        },
    };
}

module.exports = buildMinimalSlotMap;
