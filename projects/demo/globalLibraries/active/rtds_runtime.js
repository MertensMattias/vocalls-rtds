/**
 * rtds_runtime.js — RTDS routing-table runtime for Vocalls
 *
 * Pure RTDS orchestration: fetch the routing table by sourceId, parse it,
 * loop through JS-handled operations inline, and hand GUI-exit operations
 * off to the canvas by mirroring Params into RTDS_OP_* session variables
 * and returning a Type-specific exit key.
 *
 * No Logger, no initializeCallFlowContext, no platform-wide helpers — those
 * live in rtds_globalCodeAndHelpers.js. This file only contains the RTDS
 * dispatch surface.
 *
 * Contract
 * --------
 *   Entry A (initial call entry):
 *     return fetchAndStart(context.session.variables.RTDS_sourceId);
 *
 *   Entry B (re-entry after a GUI node completes):
 *     return resumeFrom(context.session.variables.RTDS_nextStepId);
 *
 * Op routing:
 *   - JS-handled type (in RTDS_OPERATIONS): handler runs inline, returns
 *     { nextStepId }, runStep loops to the next op.
 *   - GUI-exit type (in RTDS_EXIT_KEYS): Params mirrored to session as
 *     RTDS_OP_<Key>, exit key string returned to Vocalls. Re-entry happens
 *     through resumeFrom(RTDS_nextStepId).
 *
 * Required platform globals (provided by rtds_globalCodeAndHelpers.js):
 *   log_debug, log_warn, log_error, jsonHttpRequest, _headers,
 *   _rtBaseUrl, _rtRoutingTableEndpoint
 */


// ===========================================================================
// Dispatch tables
// ===========================================================================

// JS-handled operations — run inline in the Script node. Add new handlers
// here as their executeXxx implementations land.
RTDS_OPERATIONS = new Map([
    ['SetAttributes', executeSetAttributes]
    // Future: ['Emergency', executeEmergency], ['Schedule', executeSchedule], ...
]);

// GUI-exit operations — runtime mirrors Params to session, returns this
// exit key string, and Vocalls routes the call to the matching component.
RTDS_EXIT_KEYS = new Map([
    ['WorkgroupTransfer', 'workgroup_transfer'],
    ['ExternalTransfer',  'external_transfer'],
    ['Menu',              'menu'],
    ['LanguageMenu',      'language_menu'],
    ['PlayPrompt',        'play_prompt'],
    ['PlayAudio',         'play_audio'],
    ['Disconnect',        'disconnect'],
    ['GuardRouting',      'guard_routing'],
    ['GuardTUI',          'guard_tui'],
    ['Callback',          'callback'],
    ['SendSMS',           'send_sms'],
    ['SendEmail',         'send_email']
]);

// Prefix used when mirroring op.Params into context.session.variables
// before handing off to a GUI-exit component.
OP_VAR_PREFIX = 'RTDS_OP_';


// ===========================================================================
// buildOpIndex(operations)
//   Turns the Operations array into a Map keyed by Id so any operation can
//   be looked up in O(1).
// ===========================================================================

function buildOpIndex(operations) {
    var index = new Map();
    for (var i = 0; i < operations.length; i++) {
        var op = operations[i];
        if (!op || !op.Id) {
            log_error('[RTDS] buildOpIndex: operation at index ' + i + ' has no Id — skipped');
            continue;
        }
        index.set(String(op.Id), op);
    }
    return index;
}


// ===========================================================================
// parseFlow(json)
//   Validates the API response. Writes header fields and the opIndex into
//   context.session.variables. Returns the first operation, or null on error.
// ===========================================================================

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

    context.session.variables.RTDS_sourceId          = json.SourceId;
    context.session.variables.RTDS_name              = json.Name;
    context.session.variables.RTDS_project           = json.Project;
    context.session.variables.RTDS_promptLibrary     = json.PromptLibrary;
    context.session.variables.RTDS_supportedLanguages = json.SupportedLanguages;
    context.session.variables.RTDS_opIndex           = buildOpIndex(json.Operations);

    var firstOp = getFirstOperation(json.Operations);
    if (!firstOp) {
        context.session.variables.RTDS_error = 'RTDS_NO_ENTRY_POINT';
        return null;
    }

    log_debug('[RTDS] parseFlow ok | sourceId=' + json.SourceId +
              ' entryPoint=' + firstOp.Id + ' (' + firstOp.Name + ')');
    return firstOp;
}


// ===========================================================================
// getFirstOperation(operations)
//   Returns the entry-point operation. If multiple carry
//   IsFirstOperation === true (valid for FlowJump scenarios), returns the
//   lexicographically lowest Id — zero-padded numeric Ids sort correctly.
// ===========================================================================

function getFirstOperation(operations) {
    var candidates = [];
    for (var i = 0; i < operations.length; i++) {
        if (operations[i] && operations[i].IsFirstOperation === true) {
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


// ===========================================================================
// getParam(op, name, fallback)
//   Reads a single typed param value from op.Params, unwrapping the array
//   form [value, ...flags]. GUI-builder flags (isDisplayed, isEditable) are
//   irrelevant at runtime — only v[0] is used. Native types preserved.
// ===========================================================================

function getParam(op, name, fallback) {
    if (fallback === undefined) { fallback = null; }
    if (!op || !op.Params) { return fallback; }

    var raw = op.Params[name];
    if (raw === undefined || raw === null) { return fallback; }

    var value = Array.isArray(raw) ? raw[0] : raw;

    if (typeof value === 'number')  { return value; }
    if (typeof value === 'boolean') { return value; }
    if (value === '' || value === null || value === undefined) { return fallback; }
    return value;
}


// ===========================================================================
// setGlobal(name, value)
//   Writes a resolved param value directly to global[name]. Type is whatever
//   JSON.parse produced — no coercion.
// ===========================================================================

function setGlobal(name, value) {
    if (value === null || value === undefined) { return; }
    global[name] = value;
}


// ===========================================================================
// resolveTokens(value)
//   Replaces $(ATTR_NAME) tokens in a string with the current value. Lookup
//   order: context.session.variables first, then global. Non-string values
//   pass through unchanged. Unresolved tokens become empty string.
// ===========================================================================

function resolveTokens(value) {
    if (typeof value !== 'string') { return value; }

    return value.replace(/\$\(([^)]+)\)/g, function (match, name) {
        var sessionVal = context.session.variables[name];
        if (sessionVal !== undefined && sessionVal !== null) {
            return String(sessionVal);
        }
        var globalVal = global[name];
        if (globalVal !== undefined && globalVal !== null) {
            return String(globalVal);
        }
        return '';
    });
}


// ===========================================================================
// resolveNextStep(op, resultKey)
//   Returns the next-operation Id string. Checks resultKey first
//   (e.g. "NextStep_Open"), falls back to "NextStep". Null when neither set.
// ===========================================================================

function resolveNextStep(op, resultKey) {
    if (resultKey) {
        var specific = getParam(op, resultKey, null);
        if (specific) { return String(specific); }
    }
    var fallback = getParam(op, 'NextStep', null);
    if (fallback) { return String(fallback); }
    return null;
}


// ===========================================================================
// executeSetAttributes(op)
//   JS-handled operation. Writes Params into global via setGlobal. Handles
//   LogAttributes as a debug side-effect (not stored). NextStep controls
//   flow only and is never stored. Returns { nextStepId }.
// ===========================================================================

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
                        attrVal = global[attrName];
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


// ===========================================================================
// prepareGuiHandoff(op)
//   Writes RTDS_OP_<Key> mirrors of op.Params to context.session.variables
//   so the matching GUI-exit component can read its config. Sets
//   RTDS_currentOpId / RTDS_currentOpType. Pre-populates RTDS_nextStepId
//   with the default NextStep; the component overwrites this with its
//   chosen branching outcome before re-entry. Old RTDS_OP_* keys from a
//   prior step are wiped first so a missing Param doesn't leak through.
// ===========================================================================

function prepareGuiHandoff(op) {
    var vars = context.session.variables;

    var oldKeys = Object.keys(vars);
    for (var k = 0; k < oldKeys.length; k++) {
        if (oldKeys[k].indexOf(OP_VAR_PREFIX) === 0) {
            delete vars[oldKeys[k]];
        }
    }

    if (op.Params) {
        var keys = Object.keys(op.Params);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            vars[OP_VAR_PREFIX + key] = resolveTokens(getParam(op, key, null));
        }
    }

    vars.RTDS_currentOpId   = op.Id;
    vars.RTDS_currentOpType = op.Type;

    var defaultNext = resolveNextStep(op, null);
    if (defaultNext) {
        vars.RTDS_nextStepId = defaultNext;
    }
}


// ===========================================================================
// runStep(startOpId)
//   Core dispatch loop. Reads opIndex from context.session.variables, loops
//   through JS-handled operations inline, returns an exit key when a
//   GUI-exit type is reached.
// ===========================================================================

function runStep(startOpId) {
    var opIndex = context.session.variables.RTDS_opIndex;
    if (!opIndex || typeof opIndex.get !== 'function') {
        log_error('[RTDS] runStep: RTDS_opIndex is missing or not a Map');
        context.session.variables.RTDS_error = 'RTDS_NO_OPINDEX';
        return 'disconnect';
    }

    var currentId = startOpId ? String(startOpId) : null;

    while (currentId) {
        var current = opIndex.get(currentId);

        if (!current) {
            log_warn('[RTDS] runStep: step "' + currentId + '" not found in opIndex');
            context.session.variables.RTDS_error = 'Unknown step: ' + currentId;
            return 'disconnect';
        }

        var type = current.Type;
        log_debug('[RTDS] Step ' + current.Id + ' | Type: ' + type + ' | Name: ' + current.Name);

        // JS-handled operation
        if (RTDS_OPERATIONS.has(type)) {
            var result;
            try {
                result = RTDS_OPERATIONS.get(type)(current);
            } catch (err) {
                log_error('[RTDS] ERROR in ' + type + ' step ' + current.Id + ': ' + (err && err.message));
                context.session.variables.RTDS_error = err && err.message;
                return 'disconnect';
            }

            var nextStepId = result && result.nextStepId;
            if (!nextStepId) {
                log_debug('[RTDS] No NextStep after step ' + current.Id + ' — end of flow.');
                return 'disconnect';
            }
            currentId = String(nextStepId);
            continue;
        }

        // GUI-exit operation
        if (RTDS_EXIT_KEYS.has(type)) {
            var exitKey = RTDS_EXIT_KEYS.get(type);
            prepareGuiHandoff(current);
            log_debug('[RTDS] GUI handoff step ' + current.Id + ' (' + type + ') -> exit key: "' + exitKey + '"');
            return exitKey;
        }

        // Unknown type
        log_warn('[RTDS] Unhandled operation type "' + type + '" at step ' + current.Id);
        context.session.variables.RTDS_error = 'Unhandled operation type: ' + type;
        return 'disconnect';
    }

    return 'disconnect';
}


// ===========================================================================
// resumeFrom(nextStepId)
//   Re-entry point after a GUI-exit component completes. The component must
//   have written its chosen outcome Id into RTDS_nextStepId before this
//   Script node fires. opIndex is already on the session.
// ===========================================================================

function resumeFrom(nextStepId) {
    if (nextStepId === undefined || nextStepId === null || nextStepId === '' || nextStepId === -1) {
        log_warn('[RTDS] resumeFrom: no nextStepId — end of flow.');
        return 'disconnect';
    }
    return runStep(String(nextStepId));
}


// ===========================================================================
// fetchAndStart(sourceId)
//   Entry A — fetches the routing table for sourceId, parses it, and routes
//   to the entry-point operation. Used by the initial Script node on every
//   call. Endpoint shape: _rtBaseUrl + _rtRoutingTableEndpoint + sourceId.
//   Both globals must be set by the platform-init layer before this runs.
// ===========================================================================

function fetchAndStart(sourceId) {
    if (!sourceId) {
        log_error('[RTDS] fetchAndStart: sourceId is empty');
        context.session.variables.RTDS_error = 'RTDS_NO_SOURCE_ID';
        return 'disconnect';
    }

    var url = _rtBaseUrl + _rtRoutingTableEndpoint + encodeURIComponent(sourceId);
    log_debug('[RTDS] fetchAndStart: GET ' + url);

    return jsonHttpRequest(url, { method: 'GET' }, _headers).then(
        function (result) {
            if (!result || result.success !== true) {
                var status = result && result.statusCode;
                log_error('[RTDS] fetchAndStart: API failure | status=' + status);
                context.session.variables.RTDS_error = 'RTDS_API_ERROR_' + (status || 'UNKNOWN');
                return 'disconnect';
            }
            var body = result.body;
            if (typeof body === 'string') {
                try { body = JSON.parse(body); }
                catch (parseErr) {
                    log_error('[RTDS] fetchAndStart: JSON.parse failed | ' + parseErr.message);
                    context.session.variables.RTDS_error = 'RTDS_PARSE_ERROR';
                    return 'disconnect';
                }
            }
            var firstOp = parseFlow(body);
            if (!firstOp) { return 'disconnect'; }
            return runStep(firstOp.Id);
        },
        function (err) {
            log_error('[RTDS] fetchAndStart: request error | ' + (err && err.message));
            context.session.variables.RTDS_error = 'RTDS_REQUEST_ERROR';
            return 'disconnect';
        }
    );
}
