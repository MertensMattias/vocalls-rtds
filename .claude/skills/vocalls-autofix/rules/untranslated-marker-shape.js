'use strict';

/**
 * autofix rule: untranslated-marker-shape
 *
 * Fills missing non-primary-language keys with the canonical literal
 * `[<LANG>_UNTRANSLATED]` so the translator's literal-walk has a reliable
 * trigger. Walks the slot-map per agent at a fixed worklist of slot
 * locations whose value shape is QuadLang / MaybeSilentQuadLang.
 *
 * Predicate: key is undefined (not present) for a non-primary language
 * listed in slotMap.projectMeta.languages. Empty-string values on
 * MaybeSilentQuadLang slots are intentional silence and left alone.
 *
 * Trigger: finding.check === 'language_completeness'.
 * Context: rule reads `ctx.primaryLanguage` to skip the primary-language key.
 */

const NAME = 'untranslated-marker-shape';

function matches(finding) {
    return finding && finding.check === 'language_completeness';
}

function deepClone(o) {
    return JSON.parse(JSON.stringify(o));
}

function marker(lang) {
    return `[${lang}_UNTRANSLATED]`;
}

function fillQuadLang(obj, languages, primaryLanguage) {
    if (!obj || typeof obj !== 'object') return 0;
    let count = 0;
    for (const L of languages) {
        if (L === primaryLanguage) continue;
        if (obj[L] === undefined) {
            obj[L] = marker(L);
            count++;
        }
    }
    return count;
}

function fillPersona(personaObj, languages, primaryLanguage) {
    if (!personaObj || typeof personaObj !== 'object') return 0;
    let count = 0;
    for (const L of languages) {
        if (L === primaryLanguage) continue;
        if (personaObj[L] === undefined) {
            personaObj[L] = marker(L);
            count++;
        }
    }
    return count;
}

function fillAgent(agent, languages, primaryLanguage) {
    let count = 0;
    count += fillPersona(agent.persona, languages, primaryLanguage);
    count += fillQuadLang(agent.companyInfo, languages, primaryLanguage);

    const knowledgeModules = agent.knowledgeModules || {};
    for (const key of Object.keys(knowledgeModules)) {
        count += fillQuadLang(knowledgeModules[key], languages, primaryLanguage);
    }

    const cases = agent.cases || {};
    for (const caseNum of Object.keys(cases)) {
        count += fillQuadLang(cases[caseNum].opening, languages, primaryLanguage);
    }

    const scenarios = agent.scenarios || {};
    for (const scenarioKey of Object.keys(scenarios)) {
        count += fillQuadLang(scenarios[scenarioKey].objective, languages, primaryLanguage);
    }

    const actions = agent.actions || {};
    for (const actionName of Object.keys(actions)) {
        const action = actions[actionName];
        count += fillQuadLang(action.description, languages, primaryLanguage);
        count += fillQuadLang(action.confirmation_message, languages, primaryLanguage);

        const entities = action.entities || {};
        for (const entityName of Object.keys(entities)) {
            count += fillQuadLang(entities[entityName].description, languages, primaryLanguage);
        }

        const messages = action.messages || {};
        for (const dispositionKey of Object.keys(messages)) {
            const disposition = messages[dispositionKey];
            if (!disposition || typeof disposition !== 'object') continue;
            count += fillQuadLang(disposition.success, languages, primaryLanguage);
            count += fillQuadLang(disposition.failure, languages, primaryLanguage);
        }
    }

    return count;
}

function apply(slotMap, finding, ctx = {}) {
    if (!matches(finding)) return { changed: false, mutated: slotMap, log: '' };

    const primaryLanguage =
        ctx.primaryLanguage ||
        (slotMap && slotMap.projectMeta && slotMap.projectMeta.primaryLanguage);
    const languages =
        (slotMap && slotMap.projectMeta && slotMap.projectMeta.languages) ||
        (primaryLanguage ? [primaryLanguage] : []);

    if (!primaryLanguage || languages.length <= 1) {
        return {
            changed: false,
            mutated: slotMap,
            log: `${NAME}: noop — no non-primary languages to fill`,
        };
    }

    const next = deepClone(slotMap);
    let filled = 0;
    const agents = next.agents || {};
    for (const agentId of Object.keys(agents)) {
        filled += fillAgent(agents[agentId], languages, primaryLanguage);
    }

    if (filled === 0) {
        return {
            changed: false,
            mutated: slotMap,
            log: `${NAME}: all non-primary slots already present`,
        };
    }
    return {
        changed: true,
        mutated: next,
        log: `${NAME}: filled ${filled} missing non-primary language key(s)`,
    };
}

module.exports = { name: NAME, matches, apply };
