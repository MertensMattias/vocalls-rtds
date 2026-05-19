// ============================================================================
// AGENT ENGINE - Runtime Engine (ES5.1)
// ============================================================================
//
//
// Exposes as globals:
//   resolveTemplate(template, variables)
//   buildBasePrompt(persona, labels, knowledge, companyInfo, objective, language, options)
//   buildAgentContextFromConfig(runtimeInput, CONFIG, language)
//   buildKnowledge(caseNumber, language, CONFIG)
//   getActionField(actionName, field, lang)
//   getEntityField(actionName, entityName, field, lang)
//   runAction(actionName, disposition, outcome)  // disposition: string|null|'', outcome: required non-empty string
//   hasAction(actionName)
// ============================================================================

// ─── resolveTemplate ─────────────────────────────────────────────────────────
/**
 * Replaces {{key}} placeholders in a template string with values from a variables map.
 * Unmatched placeholders are left as-is.
 * @param {string} template - Template string with {{key}} placeholders.
 * @param {Object} variables - Map of key → value for substitution.
 * @returns {string} Template with all matching placeholders replaced.
 */
function resolveTemplate(template, variables) {
    if (typeof template !== "string") return template;
    if (!variables || typeof variables !== "object") return template;
    return template.replace(/\{\{(\w+)\}\}/g, function (match, key) {
        var val = variables[key];
        return val !== undefined && val !== null ? String(val) : match;
    });
}

function hasTemplateValue(value) {
    return value !== undefined && value !== null && value !== "";
}

function extractTemplateKeys(template) {
    if (typeof template !== "string") return [];

    var keys = [];
    var seen = {};
    var match;
    var re = /\{\{(\w+)\}\}/g;

    while ((match = re.exec(template))) {
        if (!seen[match[1]]) {
            seen[match[1]] = true;
            keys.push(match[1]);
        }
    }

    return keys;
}

/**
 * Filters fact-template lines, keeping only those whose template variables are all
 * present in `variables`. Resolves remaining templates before returning.
 * @param {string[]} factsForLang - Fact lines for the active language.
 * @param {Object} variables - Runtime variable map.
 * @returns {string[]} Resolved fact lines with all required variables present.
 */
function filterFactLines(factsForLang, variables) {
    var filtered = [];
    var vars = variables || {};
    var lines = Array.isArray(factsForLang) ? factsForLang : [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var keys = extractTemplateKeys(line);
        var includeLine = true;

        for (var j = 0; j < keys.length; j++) {
            if (!hasTemplateValue(vars[keys[j]])) {
                includeLine = false;
                break;
            }
        }

        if (includeLine) {
            filtered.push(resolveTemplate(line, vars));
        }
    }

    return filtered;
}

function mergeFactCollections(primaryFacts, secondaryFacts, language) {
    var merged = [];
    var primary = Array.isArray(primaryFacts) ? primaryFacts : safeGet(primaryFacts, language, []);
    var secondary = Array.isArray(secondaryFacts)
        ? secondaryFacts
        : safeGet(secondaryFacts, language, []);
    var i;

    for (i = 0; i < primary.length; i++) {
        merged.push(primary[i]);
    }
    for (i = 0; i < secondary.length; i++) {
        merged.push(secondary[i]);
    }

    return merged;
}

/**
 * Builds the full objective text: resolves the base template, appends filtered
 * facts, and appends the allowed-actions list.
 * @param {string} baseObjective - Raw objective template string.
 * @param {string[]|Object|null} facts - Fact lines (array or language-keyed object).
 * @param {string} language - Active language code.
 * @param {string[]} actions - Allowed action names.
 * @param {Object} CONFIG - Full agent CONFIG object.
 * @param {Object} variables - Runtime variable map.
 * @returns {string} Fully assembled objective text.
 */
function buildObjectiveText(baseObjective, facts, language, actions, CONFIG, variables) {
    var objective = resolveTemplate(baseObjective || "", variables || {});
    var sections = [];
    var factsForLang;
    var filteredFacts;
    var allowedActionsLabel = safeGet(
        CONFIG,
        "labels." + language + ".allowedActions",
        "Allowed actions"
    );

    if (facts) {
        factsForLang = Array.isArray(facts) ? facts : facts[language] || [];
        filteredFacts = filterFactLines(factsForLang, variables);
        if (filteredFacts.length) {
            sections.push(
                safeGet(CONFIG, "labels." + language + ".factsLabel", "Facts") +
                    ":\n" +
                    filteredFacts.join("\n")
            );
        }
    }

    if (actions && actions.length) {
        sections.push(allowedActionsLabel + ": " + actions.join(", ") + ".");
    }

    if (sections.length) {
        objective = objective ? objective + "\n\n" + sections.join("\n\n") : sections.join("\n\n");
    }

    return objective;
}

// ─── buildBasePrompt ─────────────────────────────────────────────────────────
/**
 * Assembles the full system prompt string from its component parts.
 * @param {Object} persona - Persona config for the active language.
 * @param {Object} labels - UI/prompt label strings for the active language.
 * @param {string} knowledge - Pre-built knowledge text.
 * @param {string} companyInfo - Company information text.
 * @param {string} objective - Fully built objective text.
 * @param {string} language - Active language code (e.g. 'NL').
 * @param {Object} [options] - Optional overrides: { callDirection, timeZone, userInfo }.
 * @returns {string} Complete system prompt string.
 */
function buildBasePrompt(persona, labels, knowledge, companyInfo, objective, language, options) {
    options = options || {};
    var lines = [];

    function section(title, body) {
        if (!body && body !== 0) return;
        lines.push(title + ":");
        lines.push(body);
        lines.push("");
    }

    lines.push(labels.persona + ":");
    lines.push("");

    lines.push(
        labels.youAre +
            " " +
            (persona.botType || "") +
            " " +
            labels.worksAt +
            " " +
            (persona.companyName || "") +
            " " +
            labels.specs
    );

    lines.push("- " + labels.nameLabel + " " + (persona.name || ""));
    lines.push("- " + labels.genderLabel + " " + (persona.gender || ""));
    lines.push("- " + labels.toneLabel + " " + (persona.tone || ""));
    lines.push("- " + labels.styleLabel + " " + (persona.interactionStyle || ""));
    lines.push("- " + labels.roleLabel + " " + (persona.companyRole || ""));
    lines.push("- " + labels.audienceLabel + " " + (persona.targetCustomer || ""));
    lines.push("- " + labels.functionLabel + " " + (persona.description || ""));
    lines.push("");

    var direction = options.callDirection || "inbound";
    lines.push(direction === "inbound" ? labels.inboundCall : labels.outboundCall);
    lines.push("");

    try {
        var now = typeof getCurrentDialogDate === "function" ? getCurrentDialogDate() : new Date();
        var tz = options.timeZone || "UTC";
        var locale = language ? language.toLowerCase() : "en";
        var dateStr = labels.datePrefix + " " + now.toLocaleDateString(locale, { timeZone: tz });
        var timeStr = labels.timePrefix + " " + now.toLocaleTimeString(locale, { timeZone: tz });
        lines.push(dateStr + ". " + timeStr + ".");
        lines.push("");
    } catch (e) {}

    var genInstructions = labels.generalInstructions + " " + (persona.language || "") + ".";
    if (persona.generalInstructionsExtra) {
        genInstructions += "\n" + persona.generalInstructionsExtra;
    }
    section(labels.rules, genInstructions);

    lines.push(labels.voiceRules);
    lines.push("");

    section(labels.advanced, persona.advancedInstructions);

    if (labels.conversation && labels.conversationList) {
        section(labels.conversation, labels.conversationList);
    }

    section(labels.knowledge, knowledge);
    section(labels.companyInfo + " " + (persona.companyName || ""), companyInfo);

    if (options.userInfo) {
        section(labels.userInfo, options.userInfo);
    }

    section(labels.objectiveLine, objective);

    return lines.join("\n");
}

function getCaseProfile(caseNumber, CONFIG) {
    return safeGet(CONFIG, "caseProfiles." + String(caseNumber), null);
}

// ─── buildAgentContextFromConfig ─────────────────────────────────────────────
/**
 * Builds the runtime agent context from CONFIG and the current call input.
 * Resolves scenario, opening, objective, action definitions, and dialog-control
 * settings for the active case. Falls back to 'fallback_error' if no scenario matches.
 * V4 flat case maps only (caseToOpening, caseToActions, caseToKnowledge).
 * @param {Object} runtimeInput - Call input: { case, variables }.
 * @param {Object} CONFIG - Full agent CONFIG object.
 * @param {string} language - Active language code.
 * @returns {Object} Agent context object.
 */
function buildAgentContextFromConfig(runtimeInput, CONFIG, language) {
    runtimeInput = runtimeInput || {};
    var caseVal =
        runtimeInput["case"] !== undefined
            ? runtimeInput["case"]
            : safeGet(runtimeInput, "variables.case", null);
    var caseKey = caseVal !== null ? String(caseVal) : null;
    var variables = runtimeInput.variables || {};

    // Dialog-control defaults come ONLY from caseToOpening.default.
    // No fallback to CONFIG.messages.<lang>.bargeIn or CONFIG.llm.*
    // (per project convention: single source of truth, leave empty/null if
    // absent from caseToOpening.default).
    var caseToOpeningMap = CONFIG.caseToOpening || {};
    var defaultOpeningEntry = caseToOpeningMap["default"] || {};
    var defaultBargeIn = safeGet(defaultOpeningEntry, "bargeIn", null);
    var defaultDialogControl = safeGet(defaultOpeningEntry, "dialogControl", null);
    var defaultAllowBargeIn = safeGet(defaultOpeningEntry, "allowBargeIn", null);

    var fallbackObjective = safeGet(CONFIG, "scenarios.fallback_error.objective." + language, "");
    var fallbackActions = safeGet(CONFIG, "fallback.actions", []);
    var caseToScenario = CONFIG.caseToScenario || {};
    var scenarioName =
        caseKey !== null
            ? caseToScenario[caseKey] || caseToScenario["default"] || null
            : caseToScenario["default"] || null;
    // refineScenario — optional runtime scenario switch
    if (scenarioName && typeof CONFIG.refineScenario === "function") {
        var refined = CONFIG.refineScenario(scenarioName, variables);
        if (refined && typeof refined === "string" && CONFIG.scenarios[refined]) {
            scenarioName = refined;
        } else if (refined && typeof refined === "string" && !CONFIG.scenarios[refined]) {
            if (typeof log_warn === "function") {
                log_warn(
                    "refineScenario returned unknown scenario: " +
                        refined +
                        ". Keeping: " +
                        scenarioName
                );
            }
        }
    }

    // No scenario found — fallback
    if (!scenarioName || !CONFIG.scenarios[scenarioName]) {
        return {
            error: true,
            scenario: "fallback_error",
            language: language,
            case: caseVal,
            opening: "",
            objective: buildObjectiveText(
                fallbackObjective,
                null,
                language,
                fallbackActions,
                CONFIG,
                variables
            ),
            actionDefinitions: buildActionDefinitions(
                fallbackActions,
                CONFIG.actions || {},
                language
            ),
            bargeIn: defaultBargeIn,
            dialogControl: defaultDialogControl,
            allowBargeIn: defaultAllowBargeIn,
            variables: variables,
            cdb: null,
        };
    }

    var scenario = CONFIG.scenarios[scenarioName];

    // ── Opening: caseToOpening[caseKey][lang]
    var caseToOpening = CONFIG.caseToOpening || {};
    var openingEntry = (caseKey && caseToOpening[caseKey]) || caseToOpening["default"] || {};
    var opening = safeGet(openingEntry, language, "");

    // ── Actions: caseToActions[caseKey]
    var caseToActions = CONFIG.caseToActions || {};
    var actionNames = (caseKey && caseToActions[caseKey]) || caseToActions["default"] || [];

    // ── Objective: scenarios[key].objective[lang]
    var objective = safeGet(scenario, "objective." + language, "");

    // ── Facts: scenarios[key].facts
    var scenarioFacts = scenario.facts || null;
    var openingBargeIn = safeGet(openingEntry, "bargeIn." + language, openingEntry.bargeIn);
    var openingDialogControl = safeGet(openingEntry, "dialogControl", null);
    var openingAllowBargeIn = safeGet(openingEntry, "allowBargeIn", null);

    objective = buildObjectiveText(
        objective,
        scenarioFacts,
        language,
        actionNames,
        CONFIG,
        variables
    );

    return {
        error: false,
        scenario: scenarioName,
        language: language,
        case: caseVal,
        opening: resolveTemplate(opening, variables),
        objective: objective,
        actionDefinitions: buildActionDefinitions(actionNames, CONFIG.actions || {}, language),
        bargeIn:
            openingBargeIn !== null && openingBargeIn !== undefined
                ? openingBargeIn
                : defaultBargeIn,
        dialogControl:
            openingDialogControl !== null && openingDialogControl !== undefined
                ? openingDialogControl
                : defaultDialogControl,
        allowBargeIn:
            openingAllowBargeIn !== null && openingAllowBargeIn !== undefined
                ? openingAllowBargeIn
                : defaultAllowBargeIn,
        variables: variables,
        cdb: null,
    };
}

// ─── buildKnowledge ───────────────────────────────────────────────────────────
/**
 * Builds the knowledge block for a case by joining its assigned knowledge modules.
 * @param {number|string|null} caseNumber - Active case number.
 * @param {string} language - Active language code.
 * @param {Object} CONFIG - Full agent CONFIG object.
 * @returns {string} Newline-separated knowledge module text, or empty string.
 */
function buildKnowledge(caseNumber, language, CONFIG) {
    var modules = CONFIG.knowledgeModules || {};
    var caseMap = CONFIG.caseToKnowledge || {};
    var caseKey = caseNumber !== null ? String(caseNumber) : null;
    var moduleNames = (caseKey && caseMap[caseKey]) || caseMap["default"] || [];
    var parts = [];
    var i;

    for (i = 0; i < moduleNames.length; i++) {
        var modName = moduleNames[i];
        var mod = modules[modName];
        if (mod && mod[language]) {
            parts.push("[" + modName + "]\n" + mod[language]);
        }
    }

    return parts.join("\n\n");
}

// ─── getActionField / getEntityField ─────────────────────────────────────────
/**
 * @param {string} actionName - Action name in CONFIG.actions.
 * @param {string} field - Field on the action (e.g. 'description', 'confirmation_message').
 * @param {string} lang - Language code.
 * @returns {string} Field value for the language, or empty string.
 */
function getActionField(actionName, field, lang) {
    return safeGet(getCurrentAgentConfig(), "actions." + actionName + "." + field, {})[lang] || "";
}

/**
 * @param {string} actionName - Action name in CONFIG.actions.
 * @param {string} entityName - Entity name within the action.
 * @param {string} field - Field on the entity.
 * @param {string} lang - Language code.
 * @returns {string} Field value for the language, or empty string.
 */
function getEntityField(actionName, entityName, field, lang) {
    return (
        safeGet(
            getCurrentAgentConfig(),
            "actions." + actionName + ".entities." + entityName + "." + field,
            {}
        )[lang] || ""
    );
}

/**
 * Resolves an entity's description to a plain string for the active language.
 * Handles string, language-keyed object, and legacy flat-object shapes.
 * @param {string|Object} entity - Entity definition.
 * @param {string} language - Active language code.
 * @returns {string} Resolved description or empty string.
 */
function resolveEntityDescription(entity, language) {
    if (!entity) return "";

    if (typeof entity === "string") {
        return entity;
    }

    if (entity.description && typeof entity.description === "object") {
        return safeGet(entity.description, language, "");
    }

    if (entity.description && typeof entity.description === "string") {
        return entity.description;
    }

    if (typeof entity === "object" && safeGet(entity, language, null)) {
        return safeGet(entity, language, "");
    }

    return "";
}

/**
 * Builds a flat action-definitions map from CONFIG.actions, resolving all
 * language-specific fields and entity descriptions for the active language.
 * @param {string[]} actionNames - Allowed action names for this case.
 * @param {Object} actionsConfig - CONFIG.actions object.
 * @param {string} language - Active language code.
 * @returns {Object} Map of actionName → resolved definition.
 */
function buildActionDefinitions(actionNames, actionsConfig, language) {
    var result = {};
    for (var i = 0; i < actionNames.length; i++) {
        var name = actionNames[i];
        var def = actionsConfig[name];
        if (!def) continue;

        var rawEntities = def.entities || {};
        var resolvedEntities = {};
        for (var entityName in rawEntities) {
            if (!rawEntities.hasOwnProperty(entityName)) continue;
            var entity = rawEntities[entityName];
            resolvedEntities[entityName] = {
                description: resolveEntityDescription(entity, language),
                required: !!safeGet(entity, "required", false),
            };
        }

        result[name] = {
            description: safeGet(def, "description." + language, ""),
            confirmation_message: safeGet(def, "confirmation_message." + language, ""),
            confirmation: def.confirmation,
            entities: resolvedEntities,
            messages: def.messages || {},
        };
    }
    return result;
}

// ─── hasAction ────────────────────────────────────────────────────────────────
/**
 * @param {string} actionName - Action name to check.
 * @returns {boolean} True if the action is defined in the current agent context.
 */
function hasAction(actionName) {
    var defs =
        typeof agentContext !== "undefined" && agentContext && agentContext.actionDefinitions
            ? agentContext.actionDefinitions
            : {};
    return defs.hasOwnProperty(actionName);
}

// ─── Action result (message + CDB) ────────────────────────────────────────────
function _runAction_logError(msg) {
    if (typeof log_error === "function") {
        log_error(msg);
        return;
    }
    if (typeof logError === "function") {
        logError(msg);
        return;
    }
}

function _runAction_fail(msg) {
    _runAction_logError(msg);
    throw new Error(msg);
}

// ─── runAction ────────────────────────────────────────────────────────────────
/**
 * Resolves the message and CDB log key for a completed action.
 * @param {string} actionName - Non-empty action name in CONFIG.actions.
 * @param {string|null} disposition - Disposition key; null/'' → 'default'.
 * @param {string} outcome - Required non-empty outcome key (trimmed, case-preserved).
 * @returns {{ result: string, say?: string }} result = outcome, say = resolved message (omitted if empty/silent).
 * @sideeffect Writes the resolved cdbLogKey to varObj.cdb.cdbLog and global cdbLog.
 */
function runAction(actionName, disposition, outcome) {
    // ── Input validation ──────────────────────────────────────────────────────
    if (typeof actionName !== "string" || !actionName) {
        _runAction_fail(
            'runAction: invalid actionName (expected non-empty string); action="' + actionName + '"'
        );
    }

    if (disposition !== null && disposition !== undefined && disposition !== "") {
        if (typeof disposition !== "string") {
            _runAction_fail(
                'runAction: disposition must be a string, null, or empty; action="' +
                    actionName +
                    '" got type=' +
                    typeof disposition
            );
        }
    }

    if (outcome === null || outcome === undefined || outcome === "") {
        _runAction_fail(
            'runAction: outcome is required (non-empty string); action="' + actionName + '"'
        );
    }
    if (typeof outcome !== "string") {
        _runAction_fail(
            'runAction: outcome must be a string; action="' +
                actionName +
                '" got type=' +
                typeof outcome
        );
    }

    // Trim outcome — do NOT lowercase (CONFIG keys are case-sensitive)
    var resolvedOutcome = outcome.replace(/^\s+|\s+$/g, "");
    if (!resolvedOutcome) {
        _runAction_fail('runAction: outcome is empty after trimming; action="' + actionName + '"');
    }

    // Resolve disposition: null/''/undefined → 'default'
    var d =
        disposition && typeof disposition === "string"
            ? disposition.replace(/^\s+|\s+$/g, "") || "default"
            : "default";

    // ── Context ───────────────────────────────────────────────────────────────
    var ctx = typeof agentContext !== "undefined" && agentContext ? agentContext : {};
    var cfg = getCurrentAgentConfig();
    var caseVal = ctx["case"] !== undefined ? ctx["case"] : 0;
    var language = ctx.language || "NL";
    var variables = ctx.variables || {};
    var caseKey = String(caseVal);

    // ── Action lookup ─────────────────────────────────────────────────────────
    var action = cfg && cfg.actions ? cfg.actions[actionName] : null;
    if (!action) {
        _runAction_fail(
            'runAction: unknown action "' +
                actionName +
                '" in CONFIG.actions' +
                '; disposition="' +
                d +
                '" outcome="' +
                resolvedOutcome +
                '" case="' +
                caseKey +
                '" lang="' +
                language +
                '"'
        );
    }

    // ── Message resolution ────────────────────────────────────────────────────
    // messages[d][outcome][lang] || messages.default[outcome][lang]
    // Empty string is a valid template (intentional silent outcome).
    // Throws only if both disposition-specific and default miss (per ADR-009).
    var msgs = action.messages || {};
    var template;
    var dispMsgs = msgs[d];
    if (
        dispMsgs &&
        dispMsgs[resolvedOutcome] &&
        dispMsgs[resolvedOutcome][language] !== undefined
    ) {
        template = dispMsgs[resolvedOutcome][language];
    } else {
        var defMsgs = msgs["default"];
        if (
            defMsgs &&
            defMsgs[resolvedOutcome] &&
            defMsgs[resolvedOutcome][language] !== undefined
        ) {
            template = defMsgs[resolvedOutcome][language];
        } else {
            _runAction_fail(
                'runAction: missing message template for action="' +
                    actionName +
                    '" disposition="' +
                    d +
                    '" outcome="' +
                    resolvedOutcome +
                    '"' +
                    ' lang="' +
                    language +
                    '" case="' +
                    caseKey +
                    '"'
            );
        }
    }
    var message = resolveTemplate(template, variables || {});

    // ── CDB resolution ────────────────────────────────────────────────────────
    // cdbLogs[caseKey][action][d][outcome] || cdbLogs[caseKey].default || cdbLogs.default.default
    // Only throws on catastrophic miss (no case default anywhere).
    var cdbLogs = cfg && cfg.cdbLogs ? cfg.cdbLogs : null;
    if (!cdbLogs || typeof cdbLogs !== "object") {
        _runAction_fail(
            "runAction: CONFIG.cdbLogs missing or invalid" +
                '; action="' +
                actionName +
                '" disposition="' +
                d +
                '" outcome="' +
                resolvedOutcome +
                '" case="' +
                caseKey +
                '"'
        );
    }

    var caseEntry = cdbLogs[caseKey] || cdbLogs["default"] || null;
    if (!caseEntry || typeof caseEntry !== "object") {
        _runAction_fail(
            'runAction: cdbLogs has no entry for case="' +
                caseKey +
                '" and no "default" fallback' +
                '; action="' +
                actionName +
                '" disposition="' +
                d +
                '" outcome="' +
                resolvedOutcome +
                '"'
        );
    }

    var cdbLogKey;
    var actionCdb = caseEntry[actionName];
    if (actionCdb && typeof actionCdb === "object") {
        // Canonical shape: cdbLogs[case][action][disposition][outcome]
        var dispCdb = actionCdb[d];
        if (dispCdb && typeof dispCdb === "object" && dispCdb[resolvedOutcome] !== undefined) {
            cdbLogKey = dispCdb[resolvedOutcome];
        } else {
            // Soft-fallback: disposition/outcome miss → case default
            cdbLogKey = caseEntry["default"];
            if (cdbLogKey === undefined) {
                // Case default also missing — fall back to global default
                var globalDefault = cdbLogs["default"];
                cdbLogKey = globalDefault ? globalDefault["default"] : undefined;
            }
        }
    } else {
        // No action entry — soft-fallback to case default
        cdbLogKey = caseEntry["default"];
        if (cdbLogKey === undefined) {
            var globalDef = cdbLogs["default"];
            cdbLogKey = globalDef ? globalDef["default"] : undefined;
        }
    }

    if (cdbLogKey === undefined) {
        _runAction_fail(
            'runAction: cdbLogs catastrophic miss — no case default for case="' +
                caseKey +
                '"' +
                '; action="' +
                actionName +
                '" disposition="' +
                d +
                '" outcome="' +
                resolvedOutcome +
                '" lang="' +
                language +
                '"'
        );
    }

    // ── Side effects ──────────────────────────────────────────────────────────
    try {
        if (typeof varObj !== "undefined" && varObj) {
            varObj.cdb = varObj.cdb || {};
            varObj.cdb.cdbLog = cdbLogKey;
        }
    } catch (e) {}
    try {
        if (typeof cdbLog !== "undefined") {
            cdbLog = cdbLogKey;
        }
    } catch (e) {}

    // ── Return shape ──────────────────────────────────────────────────────────
    var ret = { result: resolvedOutcome };
    if (message !== "") {
        ret.say = message;
    }
    return ret;
}

////////////////////////////////////////////////////////////
// ============================================================================
// Agent Engine (ES5.1)
// Manages agent initialisation and active agent state.
//
// Globals exposed:
//   safeGet(obj, path, def)
//   setRuntimeContext(input)
//   initAgent(agentConfig, lang, caseValue)
//   getCurrentAgentConfig()
// ============================================================================

/**
 * Safe deep property accessor. Returns `def` when any segment of `path` is missing.
 * @param {Object} obj - Root object.
 * @param {string} path - Dot-separated property path (e.g. 'a.b.c').
 * @param {*} def - Default value returned when the path is missing or undefined.
 * @returns {*} Value at path, or def.
 */
function safeGet(obj, path, def) {
    var parts, cur, i;
    if (!obj || typeof path !== "string" || !path) {
        return def;
    }
    parts = path.split(".");
    cur = obj;
    for (i = 0; i < parts.length; i++) {
        if (cur == null || typeof cur !== "object" || !(parts[i] in cur)) {
            return def;
        }
        cur = cur[parts[i]];
    }
    return cur === undefined ? def : cur;
}

// ─── Agent state ─────────────────────────────────────────────────────────────

var agentVariables = {};
var _runtimeContext = null;
var _activeConfig = null;

/**
 * Stores the runtime call input so it can be used by initAgent and canonical extraction.
 * @param {Object} input - Runtime input object ({ _apiResult, varObj, ... }).
 */
function setRuntimeContext(input) {
    _runtimeContext = input;
}

function _runCanonicals(agentConfig) {
    var rules = safeGet(agentConfig, "CANONICAL_RULES", []);
    var extraction, key;
    if (
        !rules.length ||
        typeof RuntimeMapper === "undefined" ||
        typeof RuntimeMapper.extract !== "function"
    ) {
        return;
    }
    extraction = RuntimeMapper.extract(_runtimeContext, rules, {
        onCollision: "overwrite",
        skipNull: true,
    });
    if (extraction && extraction.values) {
        for (key in extraction.values) {
            if (extraction.values.hasOwnProperty(key) && extraction.values[key] !== undefined) {
                agentVariables[key] = extraction.values[key];
            }
        }
    }
}

/**
 * @returns {Object} The currently active agent CONFIG object set by initAgent.
 */
function getCurrentAgentConfig() {
    return _activeConfig;
}

// ─── initAgent ────────────────────────────────────────────────────────────────
/**
 * Initializes an agent: runs canonical extraction, builds agent context, and sets
 * all platform globals (agentContext, agentPersona, opening, __actionDefinitions, etc.).
 * @param {Object} agentConfig - AGENT_* CONFIG object.
 * @param {string} lang - Active language code.
 * @param {string|number|null} caseValue - Case override; null = derive from canonicals.
 * @returns {Object} The built agent context.
 */
function initAgent(agentConfig, lang, caseValue) {
    var resolvedCase, ctx, persona, exportMap;

    if (caseValue !== null && caseValue !== undefined) {
        resolvedCase = String(caseValue);
    } else {
        _runCanonicals(agentConfig);
        resolvedCase =
            agentVariables["case"] !== undefined && agentVariables["case"] !== null
                ? String(agentVariables["case"])
                : null;
    }

    ctx = buildAgentContextFromConfig(
        { case: resolvedCase, variables: agentVariables },
        agentConfig,
        lang
    );
    ctx.agentName = safeGet(agentConfig, "_meta.agentId", "");
    ctx.variables = agentVariables;
    ctx.opening = resolveTemplate(ctx.opening, agentVariables);
    ctx.objective = resolveTemplate(ctx.objective, agentVariables);

    persona = agentConfig.persona ? agentConfig.persona[lang] : null;
    if (persona) {
        persona.allowBargeIn = ctx.allowBargeIn === "true" || ctx.allowBargeIn === true;
        if (typeof stopVoiceDetection !== "function") {
            persona.allowBargeIn = false;
        }
    }

    exportMap = safeGet(agentConfig, "EXPORT_MAP", null);
    if (
        exportMap &&
        typeof RuntimeMapper !== "undefined" &&
        typeof RuntimeMapper.exportToGlobals === "function"
    ) {
        RuntimeMapper.exportToGlobals(ctx, exportMap, { overwrite: true });
    }

    __actionDefinitions = ctx.actionDefinitions || {};
    __gpt_bargeIn = ctx.bargeIn;
    __gpt_dialogControlOnEntry = ctx.dialogControl;
    agentPersona = persona;
    agentContext = ctx;
    opening = ctx.opening;
    _activeConfig = agentConfig;

    return ctx;
}

/////////////////////////////////////////////////////////////////

// ============================================================================
// RUNTIMEMAPPER - CANONICAL EXTRACTION + GLOBAL EXPORT (Vocalls ES5.1)
// ============================================================================
//
// Purpose
// -------
// Provide a reusable, self-service agnostic mechanism to:
//
// 1) Extract canonical (flat) runtime variables from nested API payloads
//    using declarative rules.
// 2) Support conditional extraction (when / whenEquals / whenIn / whenAll / whenAny).
// 3) Support transformation hooks.
// 4) Merge extracted values into agentContext.variables.
// 5) Export selected variables to globals for {variable} interpolation.
//
// ES5.1 Compatible
// ============================================================================

function safeStringify(value) {
    try {
        return JSON.stringify(value);
    } catch (e) {
        return "[unstringifiable]";
    }
}

var RuntimeMapper = (function (globalScope) {
    function getPath(obj, path) {
        if (!obj || !path) return undefined;
        var parts = path.split(".");
        var cur = obj;
        for (var i = 0; i < parts.length; i++) {
            if (cur === null || cur === undefined) return undefined;
            cur = cur[parts[i]];
        }
        return cur;
    }

    function extractIsoDateParts(value) {
        var match;
        if (!value || typeof value !== "string") return null;

        match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            return {
                year: parseInt(match[1], 10),
                month: parseInt(match[2], 10),
                day: parseInt(match[3], 10),
            };
        }

        return null;
    }

    function parseIsoDateSafe(value) {
        var t;
        if (!value || typeof value !== "string") return null;
        t = Date.parse(value);
        if (isNaN(t)) return null;
        return new Date(t);
    }

    function getBusinessDateParts(value) {
        var literalParts = extractIsoDateParts(value);
        var parsed;
        if (literalParts) return literalParts;

        parsed = parseIsoDateSafe(value);
        if (!parsed) return null;

        return {
            year: parsed.getUTCFullYear(),
            month: parsed.getUTCMonth() + 1,
            day: parsed.getUTCDate(),
        };
    }

    function evaluateSingleCondition(condition, inputObj) {
        var v;
        var i;

        if (!condition) return true;

        if (condition.when) {
            return !!getPath(inputObj, condition.when);
        }

        if (condition.whenEquals && condition.whenEquals.path) {
            return getPath(inputObj, condition.whenEquals.path) === condition.whenEquals.value;
        }

        if (
            condition.whenIn &&
            condition.whenIn.path &&
            condition.whenIn.values &&
            condition.whenIn.values.length
        ) {
            v = getPath(inputObj, condition.whenIn.path);
            for (i = 0; i < condition.whenIn.values.length; i++) {
                if (v === condition.whenIn.values[i]) return true;
            }
            return false;
        }

        if (condition.whenNotNull) {
            v = getPath(inputObj, condition.whenNotNull);
            return v !== null && v !== undefined;
        }

        if (condition.whenAll && condition.whenAll.length) {
            for (i = 0; i < condition.whenAll.length; i++) {
                if (!evaluateSingleCondition(condition.whenAll[i], inputObj)) return false;
            }
            return true;
        }

        if (condition.whenAny && condition.whenAny.length) {
            for (i = 0; i < condition.whenAny.length; i++) {
                if (evaluateSingleCondition(condition.whenAny[i], inputObj)) return true;
            }
            return false;
        }

        return true;
    }

    function shouldExtract(rule, inputObj) {
        if (!rule) return false;
        return evaluateSingleCondition(rule, inputObj);
    }

    var HOOKS = {
        getDay: function (value) {
            var parts = getBusinessDateParts(value);
            return parts ? parts.day : null;
        },

        getSpokenMonth: function (value, _rule, inputObj) {
            var language;
            var parts;
            var monthIndex;
            var months;
            var lang;

            if (!value) return null;

            language = (inputObj && inputObj.varObj && inputObj.varObj.language) || "EN";
            parts = extractIsoDateParts(value);
            if (!parts) return null;

            monthIndex = parts.month - 1;
            if (monthIndex < 0 || monthIndex > 11) return null;

            months = {
                NL: [
                    "januari",
                    "februari",
                    "maart",
                    "april",
                    "mei",
                    "juni",
                    "juli",
                    "augustus",
                    "september",
                    "oktober",
                    "november",
                    "december",
                ],
                FR: [
                    "janvier",
                    "fevrier",
                    "mars",
                    "avril",
                    "mai",
                    "juin",
                    "juillet",
                    "aout",
                    "septembre",
                    "octobre",
                    "novembre",
                    "decembre",
                ],
                DE: [
                    "Januar",
                    "Februar",
                    "Marz",
                    "April",
                    "Mai",
                    "Juni",
                    "Juli",
                    "August",
                    "September",
                    "Oktober",
                    "November",
                    "Dezember",
                ],
                EN: [
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                ],
            };

            lang = months[language] ? language : "EN";
            return months[lang][monthIndex];
        },

        getMonth: function (value) {
            var parts = getBusinessDateParts(value);
            return parts ? parts.month : null;
        },

        getYear: function (value) {
            var parts = getBusinessDateParts(value);
            return parts ? parts.year : null;
        },

        toDateOnly: function (value) {
            var parts = getBusinessDateParts(value);
            var mStr;
            var dStr;

            if (!parts) return null;

            mStr = (parts.month < 10 ? "0" : "") + parts.month;
            dStr = (parts.day < 10 ? "0" : "") + parts.day;

            return parts.year + "-" + mStr + "-" + dStr;
        },

        addDays: function (value, rule) {
            var days = rule && typeof rule.addDays === "number" ? rule.addDays : 0;
            var parsed = parseIsoDateSafe(value);
            var result;
            var mStr;
            var dStr;

            if (!parsed) return null;

            result = new Date(parsed.getTime() + days * 86400000);

            mStr = (result.getUTCMonth() + 1 < 10 ? "0" : "") + (result.getUTCMonth() + 1);
            dStr = (result.getUTCDate() < 10 ? "0" : "") + result.getUTCDate();

            return result.getUTCFullYear() + "-" + mStr + "-" + dStr;
        },

        toPhoneNumber: function (value) {
            if (typeof value !== "string") return null;

            const digits = value.replace(/\D/g, "");

            if (digits.length === 9) {
                // 9 digits : 3 + 2 + 2 + 2
                return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
            }

            if (digits.length === 10) {
                // 10 digits : pairs of 2
                return digits.match(/.{2}/g).join(" ");
            }

            // for unsupported lengths, return input
            return value;
        },

        count: function (value) {
            return value && Array.isArray(value) ? value.length : 0;
        },

        toStringSafe: function (value) {
            if (value === null || value === undefined) return "";
            return value.toString();
        },

        toUpper: function (value) {
            if (value === null || value === undefined) return "";
            return value.toString().toUpperCase();
        },

        toLower: function (value) {
            if (value === null || value === undefined) return "";
            return value.toString().toLowerCase();
        },

        toBoolean: function (value) {
            if (value === null || value === undefined) return false;
            if (typeof value === "boolean") return value;
            if (typeof value === "string") {
                var normalized = value.toLowerCase();
                if (normalized === "true" || normalized === "1" || normalized === "yes")
                    return true;
                if (
                    normalized === "false" ||
                    normalized === "0" ||
                    normalized === "no" ||
                    normalized === ""
                )
                    return false;
            }
            return !!value;
        },

        trim: function (value) {
            if (value === null || value === undefined) return "";
            return value.toString().replace(/^\s+|\s+$/g, "");
        },

        firstItem: function (value) {
            return value && Array.isArray(value) && value.length ? value[0] : null;
        },

        lastItem: function (value) {
            return value && Array.isArray(value) && value.length ? value[value.length - 1] : null;
        },

        addressToSSML: function (value, rule, inputObj) {
            var language;
            var BUS_LABEL;
            var busLabel;
            var speed;
            var VALID_SPEEDS;
            var rate;
            var ABBR;
            var FR_PARTICLES;
            var parts;
            var line;
            var city;

            if (!value || typeof value !== "object") {
                return "";
            }

            language = (inputObj && inputObj.varObj && inputObj.varObj.language) || "NL";

            BUS_LABEL = { NL: "bus", FR: "bo\u00eete", DE: "Wohnung", EN: "unit" };
            busLabel = BUS_LABEL[language] || BUS_LABEL.NL;

            speed = (rule && rule.speed) || "medium";
            VALID_SPEEDS = { "x-slow": 1, slow: 1, medium: 1, fast: 1, "x-fast": 1 };
            rate = VALID_SPEEDS[speed] ? speed : "medium";

            ABBR = {
                "AV.": "Avenue",
                "AVE.": "Avenue",
                "BD.": "Boulevard",
                "BLVD.": "Boulevard",
                "SQ.": "Square",
                "PL.": "Place",
                "IMP.": "Impasse",
                "ALL.": "All\u00e9e",
                "CHEM.": "Chemin",
                "RTE.": "Route",
                "PASS.": "Passage",
                "GAL.": "Galerie",
                "SENT.": "Sentier",
                "CIT.": "Cit\u00e9",
                "RES.": "R\u00e9sidence",
                "R\u00c9S.": "R\u00e9sidence",
                "DOM.": "Domaine",
                "GEN.": "G\u00e9n\u00e9ral",
                "PROF.": "Professeur",
                "DR.": "Docteur",
                "MGR.": "Monseigneur",
                "ST-": "Saint-",
                "ST.": "Saint",
                "STE-": "Sainte-",
                "STE.": "Sainte",
            };

            FR_PARTICLES = {
                de: 1,
                du: 1,
                des: 1,
                la: 1,
                le: 1,
                les: 1,
                au: 1,
                aux: 1,
                en: 1,
                et: 1,
                sur: 1,
            };

            function expandAbbr(str) {
                var words = str.split(" ");
                var result = [];
                var i;
                for (i = 0; i < words.length; i++) {
                    result.push(ABBR[words[i].toUpperCase()] || ABBR[words[i]] || words[i]);
                }
                return result.join(" ");
            }

            function toTitleCaseFR(str) {
                var words = str.toLowerCase().split(" ");
                var result = [];
                var i;
                for (i = 0; i < words.length; i++) {
                    if (i === 0 || !FR_PARTICLES[words[i]]) {
                        result.push(words[i].charAt(0).toUpperCase() + words[i].slice(1));
                    } else {
                        result.push(words[i]);
                    }
                }
                return result.join(" ");
            }

            function cardinal(val) {
                return '<say-as interpret-as="cardinal">' + val + "</say-as>";
            }

            parts = [];

            if (value.street) {
                line = toTitleCaseFR(expandAbbr(value.street));
                if (value.houseNumber) {
                    line += " " + cardinal(value.houseNumber);
                }
                parts.push(line);
            }

            if (value.supplement) {
                parts.push(busLabel + " " + value.supplement);
            }

            if (value.postalCode) {
                city = value.city ? " " + toTitleCaseFR(value.city) : "";
                parts.push(cardinal(value.postalCode) + city);
            }

            return '<prosody rate="' + rate + '">' + parts.join(", ") + "</prosody>";
        },

        buildCaseId: function (value, _rule, _inputObj) {
            var api = value || {};
            var mandate = api.mandate || {};
            var bank = api.bankData || {};
            var eMandateInfo = api.eMandateInfo || {};

            var seg1 = api.caseNumber != null ? String(api.caseNumber) : "0";
            var seg2 = bank.caseNumber != null ? String(bank.caseNumber) : "0";
            var seg3 = bank.caseNumber === 1 && bank.usedForOtherMandate === true ? "1" : "0";
            var seg4 =
                typeof mandate.status === "string" &&
                mandate.status.toUpperCase() === "ACTIVE"
                    ? "1"
                    : "0";
            var seg5 = eMandateInfo.caseNumber != null ? String(eMandateInfo.caseNumber) : "0";

            return seg1 + "." + seg2 + "." + seg3 + "." + seg4 + "." + seg5;
        },
    };

    function applyHook(rule, rawValue, inputObj, outputObj) {
        if (!rule || !rule.hook) return rawValue;

        var hookSpec = rule.hook;
        var hookNames = Array.isArray(hookSpec) ? hookSpec : [hookSpec];
        var value = rawValue;
        var i;
        var hookName;
        var hookFn;

        for (i = 0; i < hookNames.length; i++) {
            hookName = hookNames[i];
            hookFn = HOOKS[hookName];
            if (typeof hookFn !== "function") {
                continue;
            }
            value = hookFn(value, rule, inputObj, outputObj);
        }

        return value;
    }

    /**
     * Registers a custom transformation hook for use in extraction rules.
     * @param {string} name - Hook name referenced in rule.hook.
     * @param {function} fn - Hook: fn(value, rule, inputObj, outputObj) → transformed value.
     * @returns {boolean} True if registered successfully.
     */
    function addHook(name, fn) {
        if (typeof name !== "string" || !name) return false;
        if (typeof fn !== "function") return false;
        HOOKS[name] = fn;
        return true;
    }

    function logExtractMeta(meta) {
        if (typeof log_debug === "function") {
            log_debug("RuntimeMapper.extract meta: " + safeStringify(meta));
            return;
        }

        if (typeof Logger !== "undefined" && Logger && typeof Logger.debug === "function") {
            Logger.debug("RuntimeMapper.extract meta", meta);
        }
    }

    /**
     * Extracts values from inputObj using a declarative rules array.
     * @param {Object} inputObj - Source object (e.g. runtimeContext).
     * @param {Array} rules - Extraction rules: [{ from, to, hook?, when?, ... }].
     * @param {Object} [options] - { onCollision: 'keepFirst'|'overwrite', skipNull, log }.
     * @returns {{ values: Object, meta: Object }} Extracted values and extraction metadata.
     */
    function extract(inputObj, rules, options) {
        options = options || {};
        var onCollision = options.onCollision || "keepFirst";
        var skipNull = !!options.skipNull;
        var enableLog = !!options.log;
        var output = {};
        var meta = {
            extracted: [],
            skippedByCondition: [],
            missing: [],
            collisions: [],
            hookErrors: [],
        };
        var i;
        var rule;
        var rawValue;
        var finalValue;

        if (!rules || !rules.length) {
            return { values: output, meta: meta };
        }

        for (i = 0; i < rules.length; i++) {
            rule = rules[i];
            if (!rule || !rule.from || !rule.to) continue;

            if (!shouldExtract(rule, inputObj)) {
                meta.skippedByCondition.push(rule.to);
                continue;
            }

            rawValue = getPath(inputObj, rule.from);
            if (rawValue === undefined) {
                meta.missing.push(rule.from);
                continue;
            }

            try {
                finalValue = applyHook(rule, rawValue, inputObj, output);
            } catch (e) {
                meta.hookErrors.push({
                    to: rule.to,
                    hook: rule.hook,
                    message: e && e.message ? e.message : "hook error",
                });
                continue;
            }

            if (finalValue === undefined) {
                meta.skippedByCondition.push(rule.to);
                continue;
            }

            if (skipNull && finalValue === null) {
                meta.skippedByCondition.push(rule.to);
                continue;
            }

            if (output.hasOwnProperty(rule.to)) {
                meta.collisions.push({ key: rule.to, from: rule.from });
                if (onCollision === "overwrite") {
                    output[rule.to] = finalValue;
                }
            } else {
                output[rule.to] = finalValue;
            }

            meta.extracted.push(rule.to);
        }

        if (enableLog) {
            logExtractMeta(meta);
        }

        return { values: output, meta: meta };
    }

    /**
     * Merges extracted values into agentContext.variables.
     * @param {Object} agentContext - Agent context to update in place.
     * @param {Object} extractedValues - Key-value map from extract().values.
     * @returns {boolean} True on success, false if agentContext is falsy.
     */
    function applyToAgentContext(agentContext, extractedValues) {
        var key;
        if (!agentContext) return false;

        if (!agentContext.variables || typeof agentContext.variables !== "object") {
            agentContext.variables = {};
        }

        for (key in extractedValues) {
            if (!extractedValues.hasOwnProperty(key)) continue;
            agentContext.variables[key] = extractedValues[key];
        }

        return true;
    }

    /**
     * Exports agentContext.variables to global scope using a declarative name map.
     * @param {Object} agentContext - Agent context with a .variables map.
     * @param {Object} exportMap - { runtimeKey: globalName } mapping.
     * @param {Object} [options] - { overwrite: boolean, logEach: boolean, prefix: string }.
     * @returns {{ success: boolean, exported: number }}
     */
    function exportToGlobals(agentContext, exportMap, options) {
        options = options || {};
        var overwrite = options.overwrite !== false;
        var logEach = !!options.logEach;
        var prefix = options.prefix || "";
        var rv;
        var count = 0;
        var runtimeKey;
        var value;
        var globalName;

        if (!agentContext || !agentContext.variables) {
            return { success: false, exported: 0 };
        }

        rv = agentContext.variables;

        for (runtimeKey in exportMap) {
            if (!exportMap.hasOwnProperty(runtimeKey)) continue;
            if (!rv.hasOwnProperty(runtimeKey)) continue;

            value = rv[runtimeKey];
            if (value === null || value === undefined) continue;

            globalName = prefix + exportMap[runtimeKey];

            if (!overwrite && typeof globalScope[globalName] !== "undefined") {
                continue;
            }

            globalScope[globalName] = value;
            count++;

            if (logEach) {
                if (typeof log_debug === "function") {
                    log_debug(
                        "RuntimeMapper.export: " +
                            runtimeKey +
                            " -> " +
                            globalName +
                            " = " +
                            safeStringify(value)
                    );
                } else if (
                    typeof Logger !== "undefined" &&
                    Logger &&
                    typeof Logger.debug === "function"
                ) {
                    Logger.debug("RuntimeMapper.export: " + runtimeKey + " -> " + globalName, {
                        value: value,
                    });
                }
            }
        }

        return { success: true, exported: count };
    }

    return {
        extract: extract,
        applyToAgentContext: applyToAgentContext,
        exportToGlobals: exportToGlobals,
        addHook: addHook,
        hooks: HOOKS,
    };
})(this);
