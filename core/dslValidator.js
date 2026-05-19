'use strict';

const { DSL_STEP_COUNT, OPTION_PICKER_SCENARIO_TYPES } = require('./validatorConfig');

const GOAL_PREFIXES = ['Goal:', 'Doel:', 'Objectif:', 'Objectif :', 'Objectif\u00A0:', 'Ziel:'];
const DSL_VERBS = ['SAY', 'ASK', 'ASK_CHOICE', 'USE', 'CONFIRM', 'GOTO', 'CALL', 'READ'];
const STEP_RE = /^\d+\.\s+(.+)/;
const DSL_VERB_TOKEN_RE = /\b(SAY|ASK|ASK_CHOICE|USE|CONFIRM|GOTO|CALL|READ)\b/;
const GOTO_TOKEN_RE = /\bGOTO\s+([A-Za-z_][A-Za-z0-9_]*)/g;

const issue = (check, severity, location, detail) => ({ check, severity, location, detail });

/**
 * Parse an objective body into ordered steps with their continuation lines.
 *
 * A "step" is a line starting with `<digit>.<space>` (per STEP_RE). A "continuation"
 * is an indented or bullet-prefixed line that follows a step and belongs to it
 * structurally — e.g. the `- If A: USE ...` branches under
 * `1. Based on the customer's response`. The parser preserves these branches
 * so PT-0013's prose-header EXECUTE template doesn't trip the verb-presence
 * check: the step's body lacks a DSL verb, but its branches do not — the
 * objective is structurally valid.
 *
 * Returns: Array<{ stepLine: string, continuationLines: string[] }>
 */
function parseStepEntries(text) {
    const rawLines = text.split(/\\n|\n/);
    const entries = [];
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (!STEP_RE.test(trimmed)) continue;
        const entry = { stepLine: trimmed, continuationLines: [] };
        for (let j = i + 1; j < rawLines.length; j++) {
            const next = rawLines[j];
            const nextTrim = next.trim();
            if (!nextTrim) continue;
            if (STEP_RE.test(nextTrim)) break; // next numbered step → end of this entry
            // Continuation if the line is indented (leading whitespace in raw)
            // OR begins with a bullet/list marker after trim.
            const indented = /^\s/.test(next);
            const bulleted = /^[-•*]/.test(nextTrim);
            if (indented || bulleted) {
                entry.continuationLines.push(nextTrim);
            } else {
                break; // non-indented, non-bullet, non-step → block ends
            }
        }
        entries.push(entry);
    }
    return entries;
}

function entryHasDslVerb(entry) {
    const m = STEP_RE.exec(entry.stepLine);
    if (!m) return false;
    const stepBodyUpper = m[1].toUpperCase();
    if (DSL_VERBS.some((v) => stepBodyUpper.startsWith(v))) return true;
    // Step body itself lacks a leading DSL verb; accept the step if any
    // continuation line contains a DSL verb token (handles the prose-header
    // numbered-bullet-tree EXECUTE template — PT-0013).
    for (const cont of entry.continuationLines) {
        const contBody = cont.replace(/^[-•*]\s*/, '').toUpperCase();
        if (DSL_VERB_TOKEN_RE.test(contBody)) return true;
    }
    return false;
}

/**
 * Validate a single objective string against the IVR DSL.
 * Returns an array of issue objects.
 *
 * @param {string} text     - The objective string
 * @param {string} location - Dot-path for issue reporting (e.g. "scenarios.main.objective.NL")
 * @returns {object[]}
 */
const validateObjective = (text, location, scenarioKeys) => {
    const issues = [];

    if (typeof text !== 'string' || !text.trim()) {
        return [issue('dsl_structure', 'error', location, 'Objective is empty or not a string')];
    }

    const lines = text.split(/\\n|\n/).map((l) => l.trim()).filter(Boolean);

    const hasGoal = lines.some((l) => GOAL_PREFIXES.some((p) => l.startsWith(p)));
    if (!hasGoal) {
        issues.push(issue('dsl_structure', 'error', location, `Objective missing a Goal: line (one of: ${GOAL_PREFIXES.join(', ')})`));
    }

    const stepEntries = parseStepEntries(text);

    // Step-count cap — shared between CLI and semantic validators via validatorConfig.
    // option_picker-family scenarios (including intent_router*) get a higher cap.
    const scenarioKey = typeof location === 'string' ? (location.split('.')[1] || '') : '';
    const isOptionPicker = [...OPTION_PICKER_SCENARIO_TYPES].some((t) => scenarioKey.startsWith(t));
    const maxSteps = isOptionPicker ? DSL_STEP_COUNT.optionPickerMax : DSL_STEP_COUNT.max;

    if (stepEntries.length === 0) {
        issues.push(issue('dsl_structure', 'error', location, 'Objective has no numbered steps'));
    } else if (stepEntries.length < DSL_STEP_COUNT.min) {
        issues.push(issue('dsl_step_count', 'warning', location, `Objective has only ${stepEntries.length} step; expected ${DSL_STEP_COUNT.min}–${maxSteps}`));
    } else if (stepEntries.length > maxSteps) {
        issues.push(issue('dsl_step_count', 'warning', location, `Objective has ${stepEntries.length} steps; maximum is ${maxSteps}`));
    }

    const verblessEntries = stepEntries.filter((entry) => !entryHasDslVerb(entry));
    if (verblessEntries.length > 0) {
        issues.push(issue('dsl_verb', 'warning', location, `${verblessEntries.length} step(s) do not start with a DSL verb (${DSL_VERBS.join(', ')})`));
    }

    // GOTO target existence — scan step bodies AND continuation branches so
    // routes referenced inside `- If A: GOTO target` survive (PT-0013).
    if (scenarioKeys && scenarioKeys.size > 0) {
        for (const entry of stepEntries) {
            const m = STEP_RE.exec(entry.stepLine);
            if (!m) continue;
            const stepBody = m[1].trim();
            for (const gm of stepBody.matchAll(GOTO_TOKEN_RE)) {
                if (!scenarioKeys.has(gm[1])) {
                    issues.push(issue('dsl_goto_target', 'error', location, `GOTO target '${gm[1]}' is not a scenario key`));
                }
            }
            for (const cont of entry.continuationLines) {
                const contBody = cont.replace(/^[-•*]\s*/, '');
                for (const gm of contBody.matchAll(GOTO_TOKEN_RE)) {
                    if (!scenarioKeys.has(gm[1])) {
                        issues.push(issue('dsl_goto_target', 'error', location, `GOTO target '${gm[1]}' is not a scenario key`));
                    }
                }
            }
        }
    }

    return issues;
};

const UNTRANSLATED_TAG_RE = /^(?:\[UNTRANSLATED\]|\[[A-Z]{2}_UNTRANSLATED\])$/;

const isUntranslatedSlot = (text) => {
    if (typeof text !== 'string') return false;
    return UNTRANSLATED_TAG_RE.test(text.trim());
};

/**
 * Validate all scenario objectives in a CONFIG for DSL compliance.
 *
 * @param {object} agentConfig
 * @returns {object[]} Array of issue objects
 */
const validateDsl = (agentConfig) => {
    const issues = [];
    const scenarios = agentConfig?.scenarios ?? {};
    const scenarioKeys = new Set(Object.keys(scenarios));
    const languages = agentConfig?._meta?.languages ?? [];

    for (const [key, scenario] of Object.entries(scenarios)) {
        if (key === 'fallback_error') continue;
        for (const lang of languages) {
            const text = scenario?.objective?.[lang];
            if (!isUntranslatedSlot(text) && typeof text === 'string' && text.trim()) {
                const loc = `scenarios.${key}.objective.${lang}`;
                issues.push(...validateObjective(text, loc, scenarioKeys));
            }
        }
    }

    return issues;
};

module.exports = { validateObjective, validateDsl, isUntranslatedSlot, UNTRANSLATED_TAG_RE, DSL_VERBS, GOAL_PREFIXES };
