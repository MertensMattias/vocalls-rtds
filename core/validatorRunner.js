'use strict';

/**
 * core/validatorRunner.js — 5-mode validation driver.
 *
 * Public API:
 *   run({ projectRoot, projectName, intake, slotMap, briefPath })
 *     → { findings, blocking, autofixApplied, mutatedSlotMap, modesRun }
 *
 * The `intake` parameter is the whole `state.intake` slice (Zod-parsed
 * IntakeSchema). It supersedes the prior `primaryLanguage` standalone field;
 * modes 1-4 destructure `intake.primaryLanguage` internally. Mode 5 also
 * consumes `intake.runtimeFilteredCases` (PT-0014) — actions referenced
 * only by runtime-filtered cases are legitimately absent from the assembled
 * config and must not trip brief-fidelity warnings. Future Wave 3 (PT-0007 +
 * PT-0006) consumes `intake.speechPlacements` and `intake.actionMessages`
 * in Mode 4's check_speech_placement.
 *
 * Mode order (per docs/refactor/10-skills-and-agents-design.md §5.4):
 *   1. SCHEMA   — Zod parse of slotMap and assembled AgentConfig
 *   2. AUTOFIX  — apply autofix rules whose finding is autofixable; re-run Mode 1
 *   3. DSL      — LLM judgment on every primary-language objective
 *   4. ASSEMBLY — layer presence + token budget + grounding + register
 *   5. FIDELITY — keyword scan then LLM judgment, only when errors=0
 *
 * Every emitted finding conforms to ValidationFindingSchema.
 */

const fs = require('fs');
const path = require('path');
const { SlotMapSchema } = require('./schema');
const llmJudge = require('./llmJudge');
const { loadAgentFile } = require('./loadAgent');
const { projectPromptFacing } = require('./projections');
const { validate: validateConfig } = require('./configValidator');
const { GROUNDING_LINES } = require('./grounding-line');
const autofixRegistry = require(path.resolve(
    __dirname, '..', '.claude', 'skills', 'vocalls-autofix', 'rules'
));

const DSL_CHECK_REMAP = {
    dsl_structure: 'check_19_dsl_bounds',
    dsl_step_count: 'check_19_dsl_bounds',
    dsl_verb: 'check_19_dsl_bounds',
    dsl_goto_target: 'check_19_dsl_bounds',
};

const UNTRANSLATED_LITERAL = (lang) => `[${lang}_UNTRANSLATED]`;

const TOKEN_BUDGET_WARN = 3500;
const TOKEN_BUDGET_ERROR = 4000;

// Hooks defined in templates/globalLibraries/engie_H_runtimeMapper.js HOOKS
// registry. Keep in sync; runtime registers more via `addHook(name, fn)` so
// unknown names trigger a warning, not an error (runtime silently skips).
const KNOWN_HOOKS = new Set([
    'getDay', 'getMonth', 'getYear', 'getSpokenMonth',
    'toDateOnly', 'addDays', 'toPhoneNumber', 'count',
    'toStringSafe', 'toUpper', 'toLower', 'toBoolean', 'trim',
    'firstItem', 'lastItem', 'addressToSSML',
]);

function approxTokens(s) {
    return Math.ceil((s || '').length / 4);
}

const SCHEMA_PATH_TO_CHECK = [
    { rx: /^agents\.[^.]+\.actions\.[^.]+\.messages/, check: 'action_messages_shape' },
    { rx: /^agents\.[^.]+\.cdbLogs/, check: 'cdb_logs_structure' },
    { rx: /\.(NL|FR|DE|EN)$/, check: 'language_completeness' },
];

function classifyIssue(issue) {
    const dotPath = issue.path.join('.');
    for (const entry of SCHEMA_PATH_TO_CHECK) {
        if (entry.rx.test(dotPath)) return entry.check;
    }
    return 'schema_completeness';
}

function isAutofixable(checkId) {
    return [
        'action_messages_shape',
        'cdb_logs_structure',
        'language_completeness',
    ].includes(checkId);
}

async function run({ projectRoot, projectName, intake, slotMap, briefPath }) {
    if (!intake || typeof intake !== 'object') {
        throw new Error('validatorRunner.run: intake (object) is required');
    }
    const primaryLanguage = intake.primaryLanguage;
    if (!primaryLanguage) {
        throw new Error('validatorRunner.run: intake.primaryLanguage is required');
    }
    const runtimeFilteredCases = Array.isArray(intake.runtimeFilteredCases)
        ? intake.runtimeFilteredCases
        : [];

    const modesRun = [];
    let findings = [];
    let mutated = slotMap;
    const autofixApplied = [];

    let mode1 = await runMode1Schema(mutated);
    modesRun.push('schema');

    if (mode1.some((f) => f.autofixable)) {
        const a = await runMode2Autofix(mutated, mode1, { primaryLanguage });
        if (a.applied.length > 0) {
            mutated = a.mutated;
            autofixApplied.push(...a.applied);
            mode1 = await runMode1Schema(mutated);
        }
    }
    modesRun.push('autofix');
    findings = findings.concat(mode1);

    const mode3 = await runMode3Dsl(mutated, primaryLanguage);
    modesRun.push('dsl');
    findings = findings.concat(mode3);

    const mode4 = await runMode4Assembly({ projectRoot, projectName, primaryLanguage, intake });
    modesRun.push('assembly');
    findings = findings.concat(mode4);

    const errorsSoFar = findings.filter((f) => f.severity === 'error');
    if (errorsSoFar.length === 0) {
        const briefText = fs.readFileSync(briefPath, 'utf8');
        const assembledPrimary = buildAssembledPrimary({ projectRoot, projectName });
        const mode5 = await runMode5Fidelity({
            briefText,
            slotMap: mutated,
            primaryLanguage,
            runtimeFilteredCases,
            assembledPrimary,
        });
        modesRun.push('fidelity');
        findings = findings.concat(mode5);
    }

    const blocking = findings.some((f) => f.severity === 'error' && f.autofixable === false);
    return { findings, blocking, autofixApplied, mutatedSlotMap: mutated, modesRun };
}

async function runMode1Schema(slotMap) {
    const parse = SlotMapSchema.safeParse(slotMap);
    if (parse.success) return [];
    return parse.error.issues.map((issue) => {
        const check = classifyIssue(issue);
        const dotPath = issue.path.join('.') || 'slotMap';
        return {
            check,
            severity: 'error',
            location: dotPath,
            detail: issue.message,
            autofixable: isAutofixable(check),
        };
    });
}

async function runMode2Autofix(slotMap, findings, ctx = {}) {
    return autofixRegistry.applyAll(slotMap, findings, ctx);
}

async function runMode3Dsl(slotMap, primaryLanguage) {
    const findings = [];
    const agents = slotMap.agents || {};
    for (const [agentId, agent] of Object.entries(agents)) {
        const scenarios = (agent && agent.scenarios) || {};
        for (const [scenarioKey, scenario] of Object.entries(scenarios)) {
            const objective =
                scenario && scenario.objective && scenario.objective[primaryLanguage];
            if (typeof objective !== 'string') continue;
            if (objective.trim() === UNTRANSLATED_LITERAL(primaryLanguage)) continue;
            const judged = await llmJudge.judgeDsl({
                agentId,
                scenarioKey,
                language: primaryLanguage,
                objective,
                type: scenario.type || null,
            });
            for (const f of judged || []) findings.push(f);
        }
    }
    return findings;
}

/**
 * Detect whether a scenario objective contains a SAY adjacent to USE <action>.
 *
 * "Adjacent" is heuristic: look within ±200 characters of each `USE <action>`
 * occurrence for a SAY token. This matches the brief skill's Pattern B
 * (`dsl_inline`) shape — SAY emitted in the DSL right before or after USE —
 * without requiring a precise AST. PT-0006 mode (b)/(d) detection.
 */
function hasAdjacentSay(objective, action) {
    if (typeof objective !== 'string' || !objective) return false;
    // ActionName regex already forbids regex metacharacters (^[a-z][a-z0-9_]*$),
    // so direct interpolation is safe.
    const useRe = new RegExp(`\\bUSE\\s+${action}\\b`, 'g');
    let m;
    while ((m = useRe.exec(objective)) !== null) {
        const start = Math.max(0, m.index - 200);
        const end = Math.min(objective.length, m.index + 200);
        if (/\bSAY\b/.test(objective.slice(start, end))) return true;
    }
    return false;
}

/**
 * Mode 4 marker-aware double-speak check (PT-0006).
 *
 * For each (action, disposition) marker in intake.speechPlacements, emit a
 * check_speech_placement finding when the assembled config disagrees with the
 * brief author's decision:
 *
 *   (a) dsl_inline + actions.<a>.messages.<d>.success.<primary> non-empty →
 *       DOUBLE-SPEAK (DSL SAY + action message both fire at runtime)
 *   (b) dsl_inline + no SAY adjacent to USE <a> in any scenario objective →
 *       SILENT-WHEN-SPEAK-EXPECTED (marker says speech-in-DSL but DSL is silent)
 *   (c) action_message + actions.<a>.messages.<d>.success.<primary> is the
 *       literal [<LANG>_UNTRANSLATED] placeholder (config-builder writes this
 *       when intake.actionMessages has no entry for the pair) →
 *       MISSING-ACTION-MESSAGE
 *   (d) action_message + SAY adjacent to USE <a> in any scenario objective →
 *       DOUBLE-SPEAK
 *
 * Empty string in messages.<d>.success.<primary> is NOT mode (c) — it is the
 * MaybeSilent sentinel meaning "intentional silence under Pattern A" and is a
 * valid configuration.
 */
function checkSpeechPlacement({ projection, intake, primaryLanguage }) {
    const findings = [];
    if (!intake || !intake.speechPlacements) return findings;
    const placements = intake.speechPlacements;
    const untranslatedMarker = UNTRANSLATED_LITERAL(primaryLanguage);

    // Pre-scan all scenario objectives for hasAdjacentSay results per action.
    // Cached because each action may be checked under multiple dispositions.
    const adjacentSayCache = new Map();
    function anyScenarioHasAdjacentSay(action) {
        if (adjacentSayCache.has(action)) return adjacentSayCache.get(action);
        const scenarios = projection.scenarios || {};
        for (const scenario of Object.values(scenarios)) {
            const objective = scenario && scenario.objective && scenario.objective[primaryLanguage];
            if (hasAdjacentSay(objective, action)) {
                adjacentSayCache.set(action, true);
                return true;
            }
        }
        adjacentSayCache.set(action, false);
        return false;
    }

    for (const [action, dispositionMap] of Object.entries(placements)) {
        if (!dispositionMap || typeof dispositionMap !== 'object') continue;
        for (const [disposition, marker] of Object.entries(dispositionMap)) {
            const actionEntry = (projection.actions || {})[action] || {};
            const messages = actionEntry.messages || {};
            const dispMessages = messages[disposition] || {};
            const successField = dispMessages.success || {};
            const messageText = successField[primaryLanguage];
            const isUntranslated = messageText === untranslatedMarker;
            const isEmpty = messageText === '' || messageText === undefined;
            const hasRealText = !isEmpty && !isUntranslated;
            const adjacentSay = anyScenarioHasAdjacentSay(action);
            const location = `actions.${action}.messages.${disposition}`;

            if (marker === 'dsl_inline') {
                if (hasRealText) {
                    findings.push({
                        check: 'check_speech_placement',
                        severity: 'error',
                        location,
                        detail:
                            `Pattern B (dsl_inline) marker for ${action}/${disposition} but ` +
                            `actions.${action}.messages.${disposition}.success.${primaryLanguage} ` +
                            `is non-empty. Both DSL SAY and action message would fire — double-speak.`,
                        autofixable: false,
                    });
                }
                if (!adjacentSay) {
                    findings.push({
                        check: 'check_speech_placement',
                        severity: 'error',
                        location,
                        detail:
                            `Pattern B (dsl_inline) marker for ${action}/${disposition} but no SAY ` +
                            `adjacent to USE ${action} in any scenario objective. Speech is silent ` +
                            `at runtime — marker says inline but DSL is missing the SAY.`,
                        autofixable: false,
                    });
                }
            } else if (marker === 'action_message') {
                if (isUntranslated) {
                    findings.push({
                        check: 'check_speech_placement',
                        severity: 'error',
                        location,
                        detail:
                            `Pattern A (action_message) marker for ${action}/${disposition} but ` +
                            `actions.${action}.messages.${disposition}.success.${primaryLanguage} ` +
                            `is the ${untranslatedMarker} placeholder. ` +
                            `intake.actionMessages.${action}.${disposition} was empty when ` +
                            `the config-builder ran — re-run intake with the speech text captured.`,
                        autofixable: false,
                    });
                }
                if (adjacentSay) {
                    findings.push({
                        check: 'check_speech_placement',
                        severity: 'error',
                        location,
                        detail:
                            `Pattern A (action_message) marker for ${action}/${disposition} but a ` +
                            `SAY appears adjacent to USE ${action} in a scenario objective. ` +
                            `Both action message and DSL SAY would fire — double-speak.`,
                        autofixable: false,
                    });
                }
            }
        }
    }
    return findings;
}

async function runMode4Assembly({ projectRoot, projectName, primaryLanguage, intake }) {
    const findings = [];
    const callScriptsDir = path.join(projectRoot, 'projects', projectName, 'callScripts');
    const files = fs.readdirSync(callScriptsDir).filter((f) => /^AGENT_[A-Z0-9_]+\.js$/.test(f));
    for (const f of files) {
        const agent = loadAgentFile(path.join(callScriptsDir, f));
        const projection = projectPromptFacing(agent);
        // PT-0006: marker-aware double-speak check.
        findings.push(...checkSpeechPlacement({ projection, intake, primaryLanguage }));
        const cases = projection.caseToScenario || {};
        for (const caseNum of Object.keys(cases)) {
            const scenarioKey = cases[caseNum];
            const scenario = projection.scenarios && projection.scenarios[scenarioKey];
            const objective =
                scenario &&
                scenario.objective &&
                scenario.objective[primaryLanguage];
            const opening =
                projection.caseToOpening &&
                projection.caseToOpening[caseNum] &&
                projection.caseToOpening[caseNum][primaryLanguage];
            const tokens = approxTokens(`${objective || ''}\n${opening || ''}`);
            if (tokens > TOKEN_BUDGET_ERROR) {
                findings.push({
                    check: 'check_18_prompt_assembly',
                    severity: 'error',
                    location: `agents.PRIMARY.cases.${caseNum}`,
                    detail: `Assembled prompt = ${tokens} tokens (max ${TOKEN_BUDGET_ERROR}).`,
                    autofixable: false,
                });
            } else if (tokens > TOKEN_BUDGET_WARN) {
                findings.push({
                    check: 'check_18_prompt_assembly',
                    severity: 'warning',
                    location: `agents.PRIMARY.cases.${caseNum}`,
                    detail: `Assembled prompt = ${tokens} tokens (warn at ${TOKEN_BUDGET_WARN}).`,
                    autofixable: false,
                });
            }
            const knowledge = (projection.caseToKnowledge && projection.caseToKnowledge[caseNum]) || [];
            if (knowledge.length > 0) {
                const phrase = GROUNDING_LINES[primaryLanguage];
                if (!phrase || !objective || !objective.includes(phrase)) {
                    findings.push({
                        check: 'check_kq_knowledge_grounding',
                        severity: 'error',
                        location: `agents.PRIMARY.cases.${caseNum}`,
                        detail: `Knowledge case missing grounding-line phrase for ${primaryLanguage}.`,
                        autofixable: false,
                    });
                }
            }
            // TODO(phase-e): emit pqr_register and pqr_tts_register findings here once the
            // PQR detection patterns are consolidated into validation-checks.md (Task 16).
        }

        const rules = projection.CANONICAL_RULES || [];
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            const hooks = (rule && rule.hook) || [];
            for (const hookName of hooks) {
                if (!KNOWN_HOOKS.has(hookName)) {
                    findings.push({
                        check: 'canonical_rules_unknown_hook',
                        severity: 'warning',
                        location: `agents.PRIMARY.CANONICAL_RULES[${i}].hook`,
                        detail: `Unknown hook "${hookName}" on rule { from: "${rule.from}", to: "${rule.to}" }; runtime will silently skip it.`,
                        autofixable: false,
                    });
                }
            }
        }

        // Cross-field residual via core/configValidator.
        const cvIssues = validateConfig(agent) || [];
        for (const i of cvIssues) {
            const remapped = DSL_CHECK_REMAP[i.check] || i.check;
            findings.push({
                check: remapped,
                severity: i.severity || 'warning',
                location: i.location,
                detail: i.detail,
                autofixable: false,
            });
        }
    }
    return findings;
}

async function runMode5Fidelity({ briefText, slotMap, primaryLanguage, runtimeFilteredCases, assembledPrimary }) {
    void primaryLanguage; // reserved for future per-language fidelity scoping
    const findings = [];
    const filtered = new Set(
        Array.isArray(runtimeFilteredCases) ? runtimeFilteredCases.map(String) : []
    );

    const caseHeadingRe = /^###\s+Case\s+([^\s—-]+)\s*[—-]\s*(.+)$/gim;
    const cases = (slotMap.agents && slotMap.agents.PRIMARY && slotMap.agents.PRIMARY.cases) || {};
    const caseKeys = new Set(Object.keys(cases));
    let m;
    while ((m = caseHeadingRe.exec(briefText)) !== null) {
        const caseNum = m[1];
        const label = m[2].trim();
        // PT-0014: cases the intake marked as runtime-filtered before assembly
        // are legitimately absent from the assembled config. Do not flag them.
        if (filtered.has(String(caseNum))) continue;
        if (!caseKeys.has(caseNum)) {
            findings.push({
                check: 'brief_fidelity',
                severity: 'warning',
                location: `brief.cases.${label.replace(/\s+/g, '_').toLowerCase()}`,
                detail: `Brief mentions "${label}" (Case ${caseNum}) but no entry in agents.PRIMARY.cases.`,
                autofixable: false,
            });
        }
    }

    const judged = await llmJudge.judgeBriefFidelity({
        briefText,
        assembledPrimary,
        runtimeFilteredCases: Array.from(filtered),
    });
    for (const f of judged || []) findings.push(f);

    return findings;
}

function buildAssembledPrimary({ projectRoot, projectName }) {
    const callScriptsDir = path.join(projectRoot, 'projects', projectName, 'callScripts');
    const files = fs
        .readdirSync(callScriptsDir)
        .filter((f) => /^AGENT_[A-Z0-9_]+\.js$/.test(f));
    const primaryFile = files.find((f) => /^AGENT_PRIMARY\.js$/.test(f)) || files[0];
    if (!primaryFile) {
        throw new Error(`buildAssembledPrimary: no AGENT_*.js in ${callScriptsDir}`);
    }
    const agent = loadAgentFile(path.join(callScriptsDir, primaryFile));
    return JSON.stringify(projectPromptFacing(agent));
}

module.exports = {
    run,
    runMode1Schema,
    runMode2Autofix,
    runMode3Dsl,
    runMode4Assembly,
    runMode5Fidelity,
    buildAssembledPrimary,
    checkSpeechPlacement,
    hasAdjacentSay,
};
