"use strict";

/**
 * core/slotMapProjection.js — schema-driven projection of a slot-map down to a
 * single language.
 *
 * primaryLanguageProjection(slotMap, primaryLanguage):
 *   At every QuadLang and MaybeSilentQuadLang leaf in core/schema/slotMap.js,
 *   keep only the `<primaryLanguage>` key. Also keep
 *   `persona.projectRulesAppendix.<primaryLanguage>` and
 *   `persona.<primaryLanguage>` (the per-lang persona top-level entries).
 *   All other language keys are dropped.
 *
 *   Used by the translator hash-check: hashing the primary-language projection
 *   yields a stable cache key whose value changes only when the primary
 *   language content (the translator's input) changes — see
 *   docs/plans/2026-05-17-001-refactor-content-addressed-pipeline-stages-plan.md U1.
 *
 * The walker is schema-driven: it walks to the exact locations in slotMap.js
 * where QuadLang / MaybeSilentQuadLang shapes appear, rather than detecting
 * those shapes by inspecting values at runtime.
 *
 * Pure function. No I/O.
 */

// Pick a single language key from a QuadLang-shaped object. Drops the other
// three language keys. Preserves the value at <primary> as-is (empty string
// and `[<LANG>_UNTRANSLATED]` placeholders pass through unchanged).
function projectLangKeyed(obj, primary) {
    if (obj === null || obj === undefined || typeof obj !== "object") return obj;
    const out = {};
    if (Object.prototype.hasOwnProperty.call(obj, primary)) {
        out[primary] = obj[primary];
    }
    return out;
}

function projectActionEntity(entity, primary) {
    return {
        description: projectLangKeyed(entity.description, primary),
        required: entity.required,
    };
}

function projectOutcomeMessages(messages, primary) {
    const out = {};
    if (messages.success !== undefined) {
        out.success = projectLangKeyed(messages.success, primary);
    }
    if (messages.failure !== undefined) {
        out.failure = projectLangKeyed(messages.failure, primary);
    }
    return out;
}

function projectActionMessages(messages, primary) {
    const out = {};
    for (const key of Object.keys(messages)) {
        out[key] = projectOutcomeMessages(messages[key], primary);
    }
    return out;
}

function projectAction(action, primary) {
    const entitiesIn = action.entities || {};
    const entitiesOut = {};
    for (const name of Object.keys(entitiesIn)) {
        entitiesOut[name] = projectActionEntity(entitiesIn[name], primary);
    }
    return {
        description: projectLangKeyed(action.description, primary),
        confirmation_message: projectLangKeyed(action.confirmation_message, primary),
        confirmation: action.confirmation,
        entities: entitiesOut,
        messages: projectActionMessages(action.messages, primary),
    };
}

function projectCase(c, primary) {
    return {
        opening: projectLangKeyed(c.opening, primary),
        scenario: c.scenario,
        actions: c.actions,
        knowledge: c.knowledge,
    };
}

function projectScenario(s, primary) {
    return {
        objective: projectLangKeyed(s.objective, primary),
        // facts is lang-keyed arrays — same projection rule.
        facts: projectLangKeyed(s.facts, primary),
    };
}

function projectPersona(persona, primary) {
    if (!persona || typeof persona !== "object") return persona;
    const out = {};
    // Persona top-level lang keys (NL/FR/DE/EN). Each value is either a
    // PersonaPrimary object or an UNTRANSLATED-style string. Keep only the
    // primary-language entry.
    if (Object.prototype.hasOwnProperty.call(persona, primary)) {
        out[primary] = persona[primary];
    }
    if (persona.projectRulesAppendix !== undefined) {
        out.projectRulesAppendix = projectLangKeyed(persona.projectRulesAppendix, primary);
    }
    return out;
}

function projectAgent(agent, primary) {
    const casesOut = {};
    for (const caseNum of Object.keys(agent.cases || {})) {
        casesOut[caseNum] = projectCase(agent.cases[caseNum], primary);
    }
    const scenariosOut = {};
    for (const key of Object.keys(agent.scenarios || {})) {
        scenariosOut[key] = projectScenario(agent.scenarios[key], primary);
    }
    const knowledgeOut = {};
    for (const key of Object.keys(agent.knowledgeModules || {})) {
        knowledgeOut[key] = projectLangKeyed(agent.knowledgeModules[key], primary);
    }
    const actionsOut = {};
    for (const name of Object.keys(agent.actions || {})) {
        actionsOut[name] = projectAction(agent.actions[name], primary);
    }
    return {
        persona: projectPersona(agent.persona, primary),
        companyInfo: projectLangKeyed(agent.companyInfo, primary),
        CANONICAL_RULES: agent.CANONICAL_RULES,
        cases: casesOut,
        scenarios: scenariosOut,
        knowledgeModules: knowledgeOut,
        actions: actionsOut,
        cdbLogs: agent.cdbLogs,
        EXPORT_MAP: agent.EXPORT_MAP,
    };
}

function primaryLanguageProjection(slotMap, primaryLanguage) {
    if (!slotMap || typeof slotMap !== "object") {
        throw new Error("primaryLanguageProjection: slotMap must be an object");
    }
    if (typeof primaryLanguage !== "string" || primaryLanguage.length === 0) {
        throw new Error("primaryLanguageProjection: primaryLanguage must be a non-empty string");
    }
    const agentsOut = {};
    for (const id of Object.keys(slotMap.agents || {})) {
        agentsOut[id] = projectAgent(slotMap.agents[id], primaryLanguage);
    }
    return {
        projectMeta: slotMap.projectMeta,
        agents: agentsOut,
    };
}

module.exports = { primaryLanguageProjection };
