// ---------------------------------------------------------------------------
// RTDS Runtime — loaded from fest flow master layer (functions only; no auto entry)
// ---------------------------------------------------------------------------

RTDS_OPERATIONS = new Map([
    ['SetAttributes', executeSetAttributes]
]);

RTDS_EXIT_KEYS = new Map([
    ['WorkgroupTransfer', 'workgroup_transfer'],
    ['ExternalTransfer', 'external_transfer'],
    ['Menu', 'menu'],
    ['LanguageMenu', 'language_menu'],
    ['PlayPrompt', 'play_prompt'],
    ['PlayAudio', 'play_audio'],
    ['Disconnect', 'disconnect'],
    ['GuardRouting', 'guard_routing'],
    ['GuardTUI', 'guard_tui'],
    ['Callback', 'callback'],
    ['SendSMS', 'send_sms'],
    ['SendEmail', 'send_email']
]);

OP_VAR_PREFIX = 'RTDS_OP_';

function getRtdsGlobalScope() {
    if (typeof global !== 'undefined') {
        return global;
    }
    if (typeof globalThis !== 'undefined') {
        return globalThis;
    }
    return null;
}

function buildOpIndex(operations) {
    var index = new Map();
    for (var i = 0; i < operations.length; i++) {
        var op = operations[i];
        if (!op.Id) {
            log_error('[RTDS] buildOpIndex: operation at index ' + i + ' has no Id — skipped');
            continue;
        }
        index.set(op.Id, op);
    }
    return index;
}

function parseFlow(json) {
    if (!json || typeof json !== 'object') {
        log_error('[RTDS] parseFlow: json is null or not an object');
        context.session.variables.RTDS_error = 'RTDS_PARSE_ERROR';
        return null;
    }

    if (!Array.isArray(json.Operations) || json.Operations.length === 0) {
        log_error('[RTDS] parseFlow: Operations array is missing or empty');
        context.session.variables.RTDS_error = 'RTDS_PARSE_ERROR';
        return null;
    }

    context.session.variables.RTDS_sourceId = json.SourceId;
    context.session.variables.RTDS_name = json.Name;
    context.session.variables.RTDS_project = json.Project;
    context.session.variables.RTDS_promptLibrary = json.PromptLibrary;
    context.session.variables.RTDS_supportedLanguages = json.SupportedLanguages;

    var opIndex = buildOpIndex(json.Operations);
    context.session.variables.RTDS_opIndex = opIndex;

    var firstOp = getFirstOperation(json.Operations);
    if (!firstOp) {
        context.session.variables.RTDS_error = 'RTDS_NO_ENTRY_POINT';
        return null;
    }

    log_debug('[RTDS] Flow parsed. SourceId=' + json.SourceId + ' EntryPoint=' + firstOp.Id + ' (' + firstOp.Name + ')');
    return firstOp;
}

function getFirstOperation(operations) {
    var candidates = [];

    for (var i = 0; i < operations.length; i++) {
        if (operations[i].IsFirstOperation === true) {
            candidates.push(operations[i]);
        }
    }

    if (candidates.length === 0) {
        log_error('[RTDS] getFirstOperation: no operation has IsFirstOperation === true');
        return null;
    }

    candidates.sort(function (a, b) {
        if (a.Id < b.Id) return -1;
        if (a.Id > b.Id) return 1;
        return 0;
    });

    return candidates[0];
}

function getParam(op, name, fallback) {
    if (fallback === undefined) { fallback = null; }
    if (!op.Params) { return fallback; }

    var raw = op.Params[name];
    if (raw === undefined || raw === null) { return fallback; }

    var value = Array.isArray(raw) ? raw[0] : raw;

    if (typeof value === 'number') { return value; }
    if (typeof value === 'boolean') { return value; }
    if (value === '' || value === null || value === undefined) { return fallback; }
    return value;
}

function setGlobal(name, value) {
    if (value === null || value === undefined) { return; }
    var scope = getRtdsGlobalScope();
    if (scope) {
        scope[name] = value;
        return;
    }
    (new Function('v', name + ' = v'))(value);
}

function resolveTokens(value) {
    if (typeof value !== 'string') { return value; }

    return value.replace(/\$\(([^)]+)\)/g, function (match, name) {
        var sessionVal = context.session.variables[name];
        if (sessionVal !== undefined && sessionVal !== null) {
            return String(sessionVal);
        }
        var scope = getRtdsGlobalScope();
        var globalVal = scope ? scope[name] : undefined;
        if (globalVal === undefined) {
            try {
                globalVal = (new Function('return typeof ' + name + ' !== "undefined" ? ' + name + ' : undefined;'))();
            } catch (ignore) {
                globalVal = undefined;
            }
        }
        if (globalVal !== undefined && globalVal !== null) {
            return String(globalVal);
        }
        return '';
    });
}

function resolveNextStep(op, resultKey) {
    if (resultKey) {
        var specific = getParam(op, resultKey, null);
        if (specific) { return String(specific); }
    }

    var fallback = getParam(op, 'NextStep', null);
    if (fallback) { return String(fallback); }

    return null;
}

function executeSetAttributes(op) {
    var params = op.Params;
    if (!params) {
        return { nextStepId: null };
    }

    var keys = Object.keys(params);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];

        if (key === 'NextStep') { continue; }

        if (key === 'LogAttributes') {
            var attrNames = String(params[key]).split('|');
            var parts = [];
            for (var j = 0; j < attrNames.length; j++) {
                var attrName = attrNames[j].replace(/^\s+|\s+$/g, '');
                if (attrName) {
                    var attrVal = context.session.variables[attrName];
                    if (attrVal === undefined || attrVal === null) {
                        var scope = getRtdsGlobalScope();
                        attrVal = scope ? scope[attrName] : undefined;
                    }
                    parts.push(attrName + '=' + (attrVal !== undefined && attrVal !== null ? attrVal : ''));
                }
            }
            log_debug('[RTDS] LogAttributes: ' + parts.join(' | '));
            continue;
        }

        var value = resolveTokens(getParam(op, key, null));
        setGlobal(key, value);
    }

    var nextStepId = resolveNextStep(op, null);
    log_debug('[RTDS] SetAttributes "' + op.Name + '" done. NextStep=' + (nextStepId ? nextStepId : '(none)'));
    return { nextStepId: nextStepId };
}

function prepareGuiHandoff(op) {
    var params = op.Params;
    if (params) {
        var keys = Object.keys(params);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = resolveTokens(getParam(op, key, null));
            context.session.variables[OP_VAR_PREFIX + key] = value;
        }
    }

    context.session.variables.RTDS_currentOpId = op.Id;
    context.session.variables.RTDS_currentOpType = op.Type;

    var defaultNext = resolveNextStep(op, null);
    if (defaultNext) {
        context.session.variables.RTDS_nextStepId = defaultNext;
    }
}

function runStep(startOpId) {
    var opIndex = context.session.variables.RTDS_opIndex;
    var currentId = startOpId;

    while (currentId) {
        var current = opIndex.get(currentId);

        if (!current) {
            log_warn('[RTDS] runStep: step "' + currentId + '" not found in opIndex');
            context.session.variables.RTDS_error = 'Unknown step: ' + currentId;
            return 'disconnect';
        }

        var type = current.Type;
        log_debug('[RTDS] Step ' + current.Id + ' | Type: ' + type + ' | Name: ' + current.Name);

        if (RTDS_OPERATIONS.has(type)) {
            var result;
            try {
                result = RTDS_OPERATIONS.get(type)(current);
            } catch (err) {
                log_error('[RTDS] ERROR in ' + type + ' step ' + current.Id + ': ' + err.message);
                context.session.variables.RTDS_error = err.message;
                return 'disconnect';
            }

            var nextStepId = result.nextStepId;

            if (!nextStepId) {
                log_debug('[RTDS] No NextStep after step ' + current.Id + ' — end of flow.');
                return 'disconnect';
            }

            currentId = nextStepId;
            continue;
        }

        if (RTDS_EXIT_KEYS.has(type)) {
            var exitKey = RTDS_EXIT_KEYS.get(type);
            prepareGuiHandoff(current);
            log_debug('[RTDS] GUI handoff step ' + current.Id + ' (' + type + ') -> exit key: "' + exitKey + '"');
            return exitKey;
        }

        log_warn('[RTDS] Unhandled operation type "' + type + '" at step ' + current.Id);
        context.session.variables.RTDS_error = 'Unhandled operation type: ' + type;
        return 'disconnect';
    }

    return 'disconnect';
}

function resumeFrom(nextStepId) {
    if (!nextStepId) {
        log_warn('[RTDS] resumeFrom: no nextStepId — end of flow.');
        return 'disconnect';
    }
    return runStep(nextStepId);
}
