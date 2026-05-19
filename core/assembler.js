'use strict';

/**
 * core/assembler.js — Deterministic assembler for AGENT_<ID>.js files.
 *
 * Input: a slot-map emitted by the Config Builder (see
 *   `.claude/skills/vocalls-config-builder/references/slot-map-schema.md`).
 * Output: `{ PRIMARY: <string>, [SECONDARY]: <string> }` — ES5.1-compliant
 *   JavaScript source ready to write to `projects/<name>/callScripts/AGENT_*.js`.
 *
 * Pipeline role: replaces the old "Config Builder emits 43 KB of JS verbatim"
 * step. The builder now emits a ~5-8 KB slot-map; the assembler deep-merges
 * that slot-map with skeleton defaults (from core/config-skeleton.js) and
 * serializes the result to ES5.1 source.
 *
 * Key properties:
 *   - STATIC-DEFAULT paths (CONFIG.labels/messages/llm, persona's
 *     generalInstructionsExtra) are never overridable by the slot-map.
 *     Attempting to do so throws AssemblerError.
 *   - projectRulesAppendix is spliced into the RULES section of
 *     advancedInstructions, before the NATURAL/NATUURLIJK/NATUREL/NATÜRLICH marker.
 *   - Non-primary language slots that the slot-map leaves empty are filled
 *     with `[<LANG>_UNTRANSLATED]` — the Translator later rewrites those.
 *   - Emitted source is ES5.1: var declarations, single-quoted strings,
 *     string concat for multi-line, no arrow / template / let / const.
 */

var SUPPORTED_LANGS = ['NL', 'FR', 'DE', 'EN'];

// All static defaults (llm, labels, messages) now live in AGENT_*.js.
// The blacklist is empty — retained for forward compatibility.
var STATIC_DEFAULT_BLACKLIST = [];

// Per-language markers used to splice projectRulesAppendix into the RULES
// section of advancedInstructions. The appendix is inserted immediately
// before the "\n<natural-marker>:" string.
var NATURAL_MARKER = {
    NL: 'NATUURLIJK:',
    FR: 'NATUREL:',
    DE: 'NATÜRLICH:',
    EN: 'NATURAL:',
};

function AssemblerError(message) {
    var err = new Error(message);
    err.name = 'AssemblerError';
    return err;
}

function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Deep-merge `src` onto `dst` in place.
 *   - Arrays: replace wholesale (never concat).
 *   - Primitives/strings/booleans/numbers/null: replace.
 *   - Objects: recurse.
 * Returns `dst`.
 */
function deepMerge(dst, src) {
    if (!isPlainObject(src)) return dst;
    for (var key in src) {
        if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
        var sv = src[key];
        if (isPlainObject(sv) && isPlainObject(dst[key])) {
            deepMerge(dst[key], sv);
        } else if (isPlainObject(sv)) {
            dst[key] = {};
            deepMerge(dst[key], sv);
        } else if (Array.isArray(sv)) {
            dst[key] = sv.slice();
        } else {
            dst[key] = sv;
        }
    }
    return dst;
}

/**
 * Walk `obj` and collect dotted paths to every leaf. Used by the blacklist
 * guard. Returns an array of strings like ["CONFIG.labels.EN.youAre", ...].
 */
function collectPaths(obj, prefix, out) {
    out = out || [];
    if (isPlainObject(obj)) {
        for (var key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
            var p = prefix ? prefix + '.' + key : key;
            if (isPlainObject(obj[key])) {
                collectPaths(obj[key], p, out);
            } else {
                out.push(p);
            }
        }
    }
    return out;
}

function assertNoBlacklistViolation(slotMap) {
    // Only CONFIG.* paths are checked; the slot-map typically routes via
    // `agents.PRIMARY.*`, so the blacklist only bites when a caller tries
    // to stuff platform defaults into CONFIG.
    if (!slotMap.CONFIG) return;
    var paths = collectPaths({ CONFIG: slotMap.CONFIG }, '', []);
    for (var i = 0; i < paths.length; i++) {
        var p = paths[i];
        for (var j = 0; j < STATIC_DEFAULT_BLACKLIST.length; j++) {
            var bl = STATIC_DEFAULT_BLACKLIST[j];
            if (p === bl || p.indexOf(bl + '.') === 0) {
                throw AssemblerError(
                    'slot-map cannot override STATIC-DEFAULT path ' + p
                );
            }
        }
    }
}

/**
 * Splice projectRulesAppendix bullets into the RULES section of an
 * advancedInstructions string. Bullets are inserted immediately before
 * the "\n<natural-marker>:" line for the given language.
 *
 * If no natural marker can be found, the appendix is appended to the end.
 */
function spliceRulesAppendix(advancedInstructions, lang, bullets) {
    if (!bullets || bullets.length === 0) return advancedInstructions;
    var marker = NATURAL_MARKER[lang];
    var bulletsText = bullets
        .map(function (b) {
            return '- ' + b;
        })
        .join('\n');
    if (marker && advancedInstructions.indexOf('\n' + marker) !== -1) {
        return advancedInstructions.replace(
            '\n' + marker,
            '\n' + bulletsText + '\n\n' + marker
        );
    }
    return advancedInstructions + '\n' + bulletsText;
}

/**
 * Build the final persona[lang] object for an agent by merging:
 *   1. STATIC-DEFAULT generalInstructionsExtra and advancedInstructions
 *      (from skeleton's PERSONA_DEFAULTS).
 *   2. Slot-map persona[lang] fields (name, tone, description, companyRole,
 *      companyName, gender, botType, targetCustomer, interactionStyle, language).
 *   3. projectRulesAppendix[lang] bullets spliced into advancedInstructions.
 */
function buildPersonaForLang(lang, primaryLanguage, slotPersona, personaDefaults) {
    var slot = slotPersona && slotPersona[lang] ? slotPersona[lang] : {};
    var appendix =
        slotPersona && slotPersona.projectRulesAppendix && slotPersona.projectRulesAppendix[lang]
            ? slotPersona.projectRulesAppendix[lang]
            : null;

    // Default stubs for STATIC-PROJECT fields — filled with
    // [<LANG>_UNTRANSLATED] when the slot-map omits a non-primary language.
    var isPrimary = lang === primaryLanguage;
    var untrans = '[' + lang + '_UNTRANSLATED]';
    function orUntrans(v, fallback) {
        if (typeof v === 'string' && v.length > 0) return v;
        if (isPrimary) return fallback;
        return untrans;
    }

    var out = {
        name: orUntrans(slot.name, 'REPLACE_WITH_AGENT_NAME'),
        companyName: orUntrans(slot.companyName, 'REPLACE_WITH_COMPANY_NAME'),
        description: orUntrans(slot.description, 'REPLACE_WITH_DESCRIPTION'),
        tone: orUntrans(slot.tone, 'professional'),
        companyRole: orUntrans(slot.companyRole, 'REPLACE_WITH_ROLE'),
        gender: slot.gender || defaultGender(lang),
        botType: slot.botType || defaultBotType(lang),
        targetCustomer: slot.targetCustomer || defaultTargetCustomer(lang),
        interactionStyle: slot.interactionStyle || defaultInteractionStyle(lang),
        language: slot.language || defaultLanguageName(lang),
        generalInstructionsExtra: personaDefaults[lang].generalInstructionsExtra,
        advancedInstructions: spliceRulesAppendix(
            personaDefaults[lang].advancedInstructions,
            lang,
            appendix
        ),
    };
    return out;
}

function defaultGender(lang) {
    return {
        NL: 'vrouwelijk',
        FR: 'féminin',
        DE: 'weiblich',
        EN: 'female',
    }[lang];
}
function defaultBotType(lang) {
    return {
        NL: 'klantendienstmedewerker',
        FR: 'agent du service client',
        DE: 'Kundenservice-Mitarbeiterin',
        EN: 'customer service agent',
    }[lang];
}
function defaultTargetCustomer(lang) {
    return {
        NL: 'klanten',
        FR: 'clients',
        DE: 'Kunden',
        EN: 'customers',
    }[lang];
}
function defaultInteractionStyle(lang) {
    return {
        NL: 'korte zinnen, directe communicatie, één vraag per keer',
        FR: 'phrases courtes, communication directe, une question à la fois',
        DE: 'kurze Sätze, direkte Kommunikation, eine Frage nach der anderen',
        EN: 'short sentences, direct communication, one question at a time',
    }[lang];
}
function defaultLanguageName(lang) {
    return { NL: 'Nederlands', FR: 'Français', DE: 'Deutsch', EN: 'English' }[lang];
}

/**
 * Convert a slot-map `cases` object into the four DYNAMIC maps that live on
 * an agent: caseToOpening, caseToScenario, caseToActions, caseToKnowledge.
 */
function expandCases(slotCases, primaryLanguage, languages) {
    var caseToOpening = {};
    var caseToScenario = {};
    var caseToActions = {};
    var caseToKnowledge = {};
    if (!isPlainObject(slotCases)) {
        return {
            caseToOpening: caseToOpening,
            caseToScenario: caseToScenario,
            caseToActions: caseToActions,
            caseToKnowledge: caseToKnowledge,
        };
    }
    for (var caseKey in slotCases) {
        if (!Object.prototype.hasOwnProperty.call(slotCases, caseKey)) continue;
        var c = slotCases[caseKey] || {};
        // Opening: slot-map provides { <lang>: 'text' } (plus optional bargeIn etc.)
        if (c.opening) {
            var openingEntry = {};
            for (var i = 0; i < languages.length; i++) {
                var lang = languages[i];
                if (typeof c.opening[lang] === 'string') {
                    openingEntry[lang] = c.opening[lang];
                } else {
                    openingEntry[lang] =
                        lang === primaryLanguage ? '' : '[' + lang + '_UNTRANSLATED]';
                }
            }
            // Optional extras preserved as-is.
            if (c.opening.bargeIn) openingEntry.bargeIn = c.opening.bargeIn;
            if (c.opening.dialogControl) openingEntry.dialogControl = c.opening.dialogControl;
            if (typeof c.opening.allowBargeIn === 'boolean')
                openingEntry.allowBargeIn = c.opening.allowBargeIn;
            caseToOpening[caseKey] = openingEntry;
        }
        if (typeof c.scenario === 'string') caseToScenario[caseKey] = c.scenario;
        if (Array.isArray(c.actions)) caseToActions[caseKey] = c.actions.slice();
        if (Array.isArray(c.knowledge)) caseToKnowledge[caseKey] = c.knowledge.slice();
    }
    return {
        caseToOpening: caseToOpening,
        caseToScenario: caseToScenario,
        caseToActions: caseToActions,
        caseToKnowledge: caseToKnowledge,
    };
}

/**
 * Ensure every per-language map under `node` has an entry for every language
 * in `languages`. Missing entries become `[<LANG>_UNTRANSLATED]` for strings
 * and empty arrays for array-valued slots.
 */
function fillLanguageGaps(value, primaryLanguage, languages) {
    if (Array.isArray(value)) {
        return value.map(function (v) {
            return fillLanguageGaps(v, primaryLanguage, languages);
        });
    }
    if (!isPlainObject(value)) return value;

    // Detect "per-language leaf" shape: every own key is a language code.
    var keys = Object.keys(value);
    var isLangMap = keys.length > 0 && keys.every(function (k) {
        return SUPPORTED_LANGS.indexOf(k) !== -1;
    });

    if (isLangMap) {
        for (var i = 0; i < languages.length; i++) {
            var lang = languages[i];
            if (!(lang in value) || typeof value[lang] === 'undefined') {
                value[lang] = '[' + lang + '_UNTRANSLATED]';
            } else if (Array.isArray(value[lang])) {
                // Per-language array of strings — keep but untag missing primary/non-primary
            }
        }
        return value;
    }

    for (var k in value) {
        if (!Object.prototype.hasOwnProperty.call(value, k)) continue;
        value[k] = fillLanguageGaps(value[k], primaryLanguage, languages);
    }
    return value;
}

// ----------------------------------------------------------------------------
// Emitter: serialize a merged agent tree to ES5.1 source.
// ----------------------------------------------------------------------------

function emitString(s) {
    // Escape backslashes, then single quotes, then control chars, then close in single quotes.
    // Keep newlines as-is in output by splitting on \n and joining with ' +\n    '.
    // The emitter itself wraps multi-line strings with string concatenation.
    var escaped = s
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
    return "'" + escaped + "'";
}

function emitMultiLineString(s, indent) {
    if (s.indexOf('\n') === -1) return emitString(s);
    var lines = s.split('\n');
    var parts = [];
    for (var i = 0; i < lines.length; i++) {
        var escapedLine = lines[i].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        if (i < lines.length - 1) {
            parts.push("'" + escapedLine + "\\n'");
        } else {
            parts.push("'" + escapedLine + "'");
        }
    }
    return parts.join('\n' + indent + '+ ');
}

var IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
var ES5_RESERVED = {
    default: true,
    for: true,
    if: true,
    else: true,
    while: true,
    return: true,
    var: true,
    function: true,
    new: true,
    delete: true,
    in: true,
    of: true,
    true: true,
    false: true,
    null: true,
    undefined: true,
    'this': true,
    'typeof': true,
    'instanceof': true,
    'void': true,
    'do': true,
    'switch': true,
    'case': true,
    'break': true,
    'continue': true,
    'throw': true,
    'try': true,
    'catch': true,
    'finally': true,
    'class': true,
    'const': true,
    'let': true,
    'yield': true,
    'export': true,
    'import': true,
    'super': true,
    'extends': true,
    'debugger': true,
    'with': true,
    'enum': true,
};

function emitKey(key) {
    if (typeof key === 'number') return emitString(String(key));
    var s = String(key);
    if (IDENT_RE.test(s) && !ES5_RESERVED[s]) return s;
    return emitString(s);
}

/**
 * Recursively emit a value as ES5.1 source.
 */
function emitValue(value, indent) {
    if (value === null) return 'null';
    var t = typeof value;
    if (t === 'undefined') return 'undefined';
    if (t === 'boolean') return value ? 'true' : 'false';
    if (t === 'number') return String(value);
    if (t === 'string') return emitMultiLineString(value, indent + '    ');
    if (t === 'function') {
        // Preserve raw function source. Caller is responsible for ensuring
        // ES5.1 compliance of the function body.
        return value.toString();
    }
    if (Array.isArray(value)) return emitArray(value, indent);
    if (isPlainObject(value)) return emitObject(value, indent);
    return emitString(String(value));
}

function emitArray(arr, indent) {
    if (arr.length === 0) return '[]';
    // Short arrays of primitives inline.
    var allPrimitive = arr.every(function (v) {
        return v === null || ['boolean', 'number', 'string'].indexOf(typeof v) !== -1;
    });
    if (allPrimitive) {
        var inlineLen = 0;
        var inlineParts = arr.map(function (v) {
            var s = emitValue(v, indent);
            inlineLen += s.length + 2;
            return s;
        });
        if (inlineLen < 80) return '[' + inlineParts.join(', ') + ']';
    }
    var innerIndent = indent + '    ';
    var parts = arr.map(function (v) {
        return innerIndent + emitValue(v, innerIndent);
    });
    return '[\n' + parts.join(',\n') + '\n' + indent + ']';
}

function emitObject(obj, indent) {
    var keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    var innerIndent = indent + '    ';
    var lines = keys.map(function (k) {
        return innerIndent + emitKey(k) + ': ' + emitValue(obj[k], innerIndent);
    });
    return '{\n' + lines.join(',\n') + '\n' + indent + '}';
}

// ----------------------------------------------------------------------------
// Public: assembleAgentFile(slotMap) -> { PRIMARY, [SECONDARY] }
// ----------------------------------------------------------------------------

function assembleAgent(agentId, slotAgent, defaults, personaDefaults, systemActionDefaults, fallbackErrorScenario, projectMeta) {
    var primaryLanguage = projectMeta.primaryLanguage;
    var languages = projectMeta.languages;

    var agent = {
        _meta: {
            version: '4.0',
            agentId: agentId,
            projectName: projectMeta.projectName,
            primaryLanguage: primaryLanguage,
            languages: languages.slice(),
        },
        persona: {},
        companyInfo: {},
        CANONICAL_RULES: slotAgent.CANONICAL_RULES
            ? slotAgent.CANONICAL_RULES.slice()
            : [{ from: '_apiResult.caseNumber', to: 'case' }],
        EXPORT_MAP: isPlainObject(slotAgent.EXPORT_MAP) ? cloneDeep(slotAgent.EXPORT_MAP) : {},
        fallback: { actions: ['transfer_to_agent'] },
        caseToOpening: { default: defaultOpening(languages) },
        caseToScenario: { default: 'fallback_error' },
        caseToActions: {
            default: ['transfer_to_agent', 'escalate_to_agent', 'end_conversation'],
        },
        caseToKnowledge: { default: [] },
        scenarios: { fallback_error: cloneDeep(fallbackErrorScenario) },
        knowledgeModules: {},
        actions: {},
        cdbLogs: {},
    };

    // STATIC-DEFAULT fields — injected from skeleton, never overridable by slot-map.
    agent.llm = cloneDeep(defaults.llm);
    agent.labels = cloneDeep(defaults.labels);
    agent.messages = cloneDeep(defaults.messages);

    // Persona per language.
    for (var i = 0; i < languages.length; i++) {
        var lang = languages[i];
        agent.persona[lang] = buildPersonaForLang(
            lang,
            primaryLanguage,
            slotAgent.persona || {},
            personaDefaults
        );
    }

    // companyInfo per language.
    var slotCI = slotAgent.companyInfo || {};
    for (var j = 0; j < languages.length; j++) {
        var l = languages[j];
        agent.companyInfo[l] = typeof slotCI[l] === 'string' && slotCI[l].length > 0
            ? slotCI[l]
            : l === primaryLanguage
              ? 'REPLACE_WITH_COMPANY_INFO'
              : '[' + l + '_UNTRANSLATED]';
    }

    // Cases -> four maps.
    if (slotAgent.cases) {
        var expanded = expandCases(slotAgent.cases, primaryLanguage, languages);
        deepMerge(agent.caseToOpening, expanded.caseToOpening);
        deepMerge(agent.caseToScenario, expanded.caseToScenario);
        deepMerge(agent.caseToActions, expanded.caseToActions);
        deepMerge(agent.caseToKnowledge, expanded.caseToKnowledge);
    }
    // Allow direct overrides for caseTo* too (for rare cases where the slot
    // map wants to set a raw map).
    if (slotAgent.caseToOpening) deepMerge(agent.caseToOpening, slotAgent.caseToOpening);
    if (slotAgent.caseToScenario) deepMerge(agent.caseToScenario, slotAgent.caseToScenario);
    if (slotAgent.caseToActions) deepMerge(agent.caseToActions, slotAgent.caseToActions);
    if (slotAgent.caseToKnowledge) deepMerge(agent.caseToKnowledge, slotAgent.caseToKnowledge);

    // Scenarios.
    if (slotAgent.scenarios) {
        for (var sk in slotAgent.scenarios) {
            if (!Object.prototype.hasOwnProperty.call(slotAgent.scenarios, sk)) continue;
            agent.scenarios[sk] = cloneDeep(slotAgent.scenarios[sk]);
        }
    }
    // Fill language gaps within scenarios.
    fillLanguageGaps(agent.scenarios, primaryLanguage, languages);

    // knowledgeModules.
    if (slotAgent.knowledgeModules) {
        for (var kk in slotAgent.knowledgeModules) {
            if (!Object.prototype.hasOwnProperty.call(slotAgent.knowledgeModules, kk)) continue;
            agent.knowledgeModules[kk] = cloneDeep(slotAgent.knowledgeModules[kk]);
        }
    }
    fillLanguageGaps(agent.knowledgeModules, primaryLanguage, languages);

    // actions — start with system action defaults, then merge slot-map actions.
    for (var sysName in systemActionDefaults) {
        if (!Object.prototype.hasOwnProperty.call(systemActionDefaults, sysName)) continue;
        agent.actions[sysName] = cloneDeep(systemActionDefaults[sysName]);
    }
    if (slotAgent.actions) {
        for (var an in slotAgent.actions) {
            if (!Object.prototype.hasOwnProperty.call(slotAgent.actions, an)) continue;
            if (!agent.actions[an]) agent.actions[an] = {};
            deepMerge(agent.actions[an], slotAgent.actions[an]);
        }
    }
    fillLanguageGaps(agent.actions, primaryLanguage, languages);

    // cdbLogs — straight deep-merge.
    if (slotAgent.cdbLogs) deepMerge(agent.cdbLogs, slotAgent.cdbLogs);

    return agent;
}

function defaultOpening(languages) {
    var text = {
        NL: 'Waarmee kan ik u helpen?',
        FR: 'Comment puis-je vous aider ?',
        DE: 'Wie kann ich Ihnen helfen?',
        EN: 'How can I help you today?',
    };
    var out = {};
    for (var i = 0; i < languages.length; i++) {
        out[languages[i]] = text[languages[i]] || '';
    }
    out.bargeIn = {};
    for (var j = 0; j < languages.length; j++) out.bargeIn[languages[j]] = [];
    out.dialogControl = 'default';
    out.allowBargeIn = false;
    return out;
}

function cloneDeep(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(cloneDeep);
    var out = {};
    for (var k in v) {
        if (Object.prototype.hasOwnProperty.call(v, k)) out[k] = cloneDeep(v[k]);
    }
    return out;
}

function emitRefineScenarioSource() {
    return (
        'function (scenarioName, variables) {\n' +
        '        variables = variables || {};\n' +
        '        return scenarioName;\n' +
        '    }'
    );
}

function emitAgentFile(agentVarName, agent) {
    var indent = '';
    // Re-order the agent so that refineScenario is emitted as raw code between
    // caseToScenario and caseToActions (mirrors the legacy skeleton layout).
    var orderedKeys = [
        '_meta',
        'CANONICAL_RULES',
        'EXPORT_MAP',
        'persona',
        'companyInfo',
        'caseToOpening',
        'caseToScenario',
        // refineScenario injected manually between caseToScenario and caseToActions
        'caseToActions',
        'caseToKnowledge',
        'scenarios',
        'knowledgeModules',
        'actions',
        'cdbLogs',
        'fallback',
        'llm',
        'messages',
        'labels',
    ];
    var inner = '    ';
    var parts = [];
    for (var i = 0; i < orderedKeys.length; i++) {
        var k = orderedKeys[i];
        if (!(k in agent)) continue;
        parts.push(inner + emitKey(k) + ': ' + emitValue(agent[k], inner));
        if (k === 'caseToScenario') {
            parts.push(inner + 'refineScenario: ' + emitRefineScenarioSource());
        }
    }
    // Bare global assignment (no `var`) mirrors the existing skeleton / legacy
    // AGENT_*.js files; the Vocalls sandbox registers these as globals.
    return '/* global ' + agentVarName + ' */\n\n' +
        agentVarName + ' = {\n' + parts.join(',\n') + '\n};\n';
}

function assembleAgentFile(slotMap) {
    if (!isPlainObject(slotMap)) throw AssemblerError('slot-map must be an object');
    assertNoBlacklistViolation(slotMap);

    var projectMeta = slotMap.projectMeta || {};
    if (!projectMeta.projectName) projectMeta.projectName = 'REPLACE_WITH_PROJECT_NAME';
    if (!projectMeta.primaryLanguage) projectMeta.primaryLanguage = 'NL';
    if (!projectMeta.languages || !projectMeta.languages.length) {
        projectMeta.languages = [projectMeta.primaryLanguage];
    }

    var buildDefaults = require('./config-skeleton');
    var defaults = buildDefaults({
        projectName: projectMeta.projectName,
        primaryLanguage: projectMeta.primaryLanguage,
        languages: projectMeta.languages,
    });

    var agents = slotMap.agents || {};
    var out = {};

    if (agents.PRIMARY) {
        var primary = assembleAgent(
            'PRIMARY',
            agents.PRIMARY,
            defaults.AGENT_PRIMARY,
            defaults._personaDefaults,
            defaults._systemActionDefaults,
            defaults._fallbackErrorScenario,
            projectMeta
        );
        out.PRIMARY = emitAgentFile('AGENT_PRIMARY', primary);
    } else {
        // If no PRIMARY provided, emit an empty-shell PRIMARY so the file is still
        // loadable. This keeps the pipeline moving even with a minimal slot-map.
        var primaryShell = assembleAgent(
            'PRIMARY',
            {},
            defaults.AGENT_PRIMARY,
            defaults._personaDefaults,
            defaults._systemActionDefaults,
            defaults._fallbackErrorScenario,
            projectMeta
        );
        out.PRIMARY = emitAgentFile('AGENT_PRIMARY', primaryShell);
    }

    if (agents.SECONDARY) {
        var secondary = assembleAgent(
            'SECONDARY',
            agents.SECONDARY,
            defaults.AGENT_SECONDARY,
            defaults._personaDefaults,
            defaults._systemActionDefaults,
            defaults._fallbackErrorScenario,
            projectMeta
        );
        out.SECONDARY = emitAgentFile('AGENT_SECONDARY', secondary);
    }

    return out;
}

module.exports = {
    assembleAgentFile: assembleAgentFile,
    AssemblerError: AssemblerError,
    STATIC_DEFAULT_BLACKLIST: STATIC_DEFAULT_BLACKLIST,
    // Exposed for testing:
    _deepMerge: deepMerge,
    _spliceRulesAppendix: spliceRulesAppendix,
    _emitValue: emitValue,
};
