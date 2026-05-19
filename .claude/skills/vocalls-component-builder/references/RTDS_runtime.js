// ---------------------------------------------------------------------------
// RTDS Runtime — Vocalls Script node
// ---------------------------------------------------------------------------


RTDS_OPERATIONS = new Map([
    ['SetAttributes', executeSetAttributes]
    // Future: ['Emergency', executeEmergency], ['Schedule', executeSchedule], ...
]);

// GUI-exit types: write params to session, return exit key string to Vocalls.
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

// Prefix written to session before every GUI handoff.
OP_VAR_PREFIX = 'RTDS_OP_';


// ---------------------------------------------------------------------------
// 1. buildOpIndex(operations)
//    Turns the Operations array into a Map keyed by Id so any
//    operation can be looked up in O(1) by its Id string.
// ---------------------------------------------------------------------------

function buildOpIndex(operations) {
    var index = new Map();
    for (var i = 0; i < operations.length; i++) {
        var op = operations[i];
        if (!op.Id) {
            log_error(`[RTDS] buildOpIndex: operation at index ${i} has no Id — skipped`);
            continue;
        }
        index.set(op.Id, op);
    }
    return index;
}


// ---------------------------------------------------------------------------
// 2. parseFlow(json)
//    Validates and splits the API response.
//    Writes header fields and the opIndex into context.session.variables.
//    Returns the firstOp object, or null on error.
// ---------------------------------------------------------------------------

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

    // Store header fields individually — plain strings, safe across nodes.
    context.session.variables.RTDS_sourceId = json.SourceId;
    context.session.variables.RTDS_name = json.Name;
    context.session.variables.RTDS_project = json.Project;
    context.session.variables.RTDS_promptLibrary = json.PromptLibrary;
    context.session.variables.RTDS_supportedLanguages = json.SupportedLanguages;

    // Build and store the operation index.
    var opIndex = buildOpIndex(json.Operations);
    context.session.variables.RTDS_opIndex = opIndex;

    // Find and return the first operation.
    var firstOp = getFirstOperation(json.Operations);
    if (!firstOp) {
        context.session.variables.RTDS_error = 'RTDS_NO_ENTRY_POINT';
        return null;
    }

    log_debug('[RTDS] Flow parsed. SourceId=' + json.SourceId + ' EntryPoint=' + firstOp.Id + ' (' + firstOp.Name + ')');
    return firstOp;
}


// ---------------------------------------------------------------------------
// 3. getFirstOperation(operations)
//    Returns the entry-point operation from the Operations array.
//    If multiple have IsFirstOperation === true, returns the one with the
//    lexicographically lowest Id (zero-padded IDs sort correctly this way).
// ---------------------------------------------------------------------------

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

    // Sort lexicographically by Id — safe for zero-padded numeric strings.
    candidates.sort(function (a, b) {
        if (a.Id < b.Id) return -1;
        if (a.Id > b.Id) return 1;
        return 0;
    });

    return candidates[0];
}


// ---------------------------------------------------------------------------
// 4. getParam(op, name, fallback)
//    Reads a typed param value from op.Params, unwrapping the array form
//    [value, ...flags]. Flags (isDisplayed, isEditable) are GUI-builder
//    metadata and are ignored at runtime — only v[0] is used.
//    Type is preserved as-is (number stays number, string stays string).
// ---------------------------------------------------------------------------

function getParam(op, name, fallback) {
    if (fallback === undefined) { fallback = null; }
    if (!op.Params) { return fallback; }

    var raw = op.Params[name];
    if (raw === undefined || raw === null) { return fallback; }

    // Unwrap array form [value, ...flags].
    var value = Array.isArray(raw) ? raw[0] : raw;

    // Preserve the native type: number, boolean, or string.
    // Matches the __getValue + transformation pattern — no coercion needed
    // when the JSON already carries the correct type.
    if (typeof value === 'number') { return value; }
    if (typeof value === 'boolean') { return value; }
    if (value === '' || value === null || value === undefined) { return fallback; }
    return value;
}


// ---------------------------------------------------------------------------
// 4a. setGlobal(name, value)
//     Writes a resolved param value directly to global[name].
//     Type is whatever JSON.parse produced — no coercion applied.
// ---------------------------------------------------------------------------

function setGlobal(name, value) {
    if (value === null || value === undefined) { return; }
    global[name] = value;
}


// ---------------------------------------------------------------------------
// 5. resolveTokens(value)
//    Replaces $(ATTR_NAME) tokens in a string with the current value.
//    Lookup order: context.session.variables first, then global directly.
//    Non-string values pass through unchanged.
// ---------------------------------------------------------------------------

function resolveTokens(value) {
    if (typeof value !== 'string') { return value; }

    return value.replace(/\$\(([^)]+)\)/g, function (match, name) {
        // Check engine / session scope first (RTDS_ keys and any session-level vars).
        var sessionVal = context.session.variables[name];
        if (sessionVal !== undefined && sessionVal !== null) {
            return String(sessionVal);
        }
        // Fall back to global scope.
        var globalVal = global[name];
        if (globalVal !== undefined && globalVal !== null) {
            return String(globalVal);
        }
        return '';
    });
}


// ---------------------------------------------------------------------------
// 6. resolveNextStep(op, resultKey)
//    Returns the next operation Id string.
//    Checks resultKey param first (e.g. "NextStep_Open"), falls back to "NextStep".
//    Returns null if neither is present.
// ---------------------------------------------------------------------------

function resolveNextStep(op, resultKey) {
    if (resultKey) {
        var specific = getParam(op, resultKey, null);
        if (specific) { return String(specific); }
    }

    var fallback = getParam(op, 'NextStep', null);
    if (fallback) { return String(fallback); }

    return null;
}


// ---------------------------------------------------------------------------
// 7. executeSetAttributes(op)
//    Writes Params into global via setGlobal (operational scope).
//    Handles LogAttributes as a log side-effect (not stored).
//    NextStep is never stored — it controls flow only.
//    Returns { nextStepId }.
// ---------------------------------------------------------------------------

function executeSetAttributes(op) {
    var params = op.Params;
    if (!params) {
        return { nextStepId: null };
    }

    var keys = Object.keys(params);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];

        // Flow control only — not stored.
        if (key === 'NextStep') { continue; }

        // LogAttributes: pipe-delimited list of attribute names to log.
        if (key === 'LogAttributes') {
            var attrNames = String(params[key]).split('|');
            var parts = [];
            for (var j = 0; j < attrNames.length; j++) {
                var attrName = attrNames[j].replace(/^\s+|\s+$/g, ''); // trim
                if (attrName) {
                    // Check session scope first, fall back to global scope.
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

        // All other params: resolve tokens and write to operational scope.
        var value = resolveTokens(getParam(op, key, null));
        setGlobal(key, value);
    }

    var nextStepId = resolveNextStep(op, null);
    log_debug('[RTDS] SetAttributes "' + op.Name + '" done. NextStep=' + (nextStepId ? nextStepId : '(none)'));
    return { nextStepId: nextStepId };
}


// ---------------------------------------------------------------------------
// 8. prepareGuiHandoff(op)
//    Writes prefixed param values to context.session.variables before handing
//    off to a GUI node. The GUI node reads RTDS_OP_* to configure itself.
// ---------------------------------------------------------------------------

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

    // Pre-populate RTDS_nextStepId with the default NextStep.
    // The GUI node overwrites this with its branching outcome.
    var defaultNext = resolveNextStep(op, null);
    if (defaultNext) {
        context.session.variables.RTDS_nextStepId = defaultNext;
    }
}


// ---------------------------------------------------------------------------
// 9. runStep(startOpId)
//    Core dispatch loop. Reads startOpId from context.session.variables.RTDS_opIndex.
//    Loops through JS-handled operations internally.
//    Returns an exit key string when a GUI-exit type is reached.
// ---------------------------------------------------------------------------

function runStep(startOpId) {
    var opIndex = context.session.variables.RTDS_opIndex;
    var currentId = startOpId;

    while (currentId) {
        var current = opIndex.get(currentId);

        if (!current) {
            log_warn(`[RTDS] runStep: step "${currentId}" not found in opIndex`);
            context.session.variables.RTDS_error = 'Unknown step: ' + currentId;
            return 'disconnect';
        }

        var type = current.Type;
        log_debug(`[RTDS] Step ${current.Id} | Type: ${type} | Name: ${current.Name}`);

        // ---- JS-handled operation ----
        if (RTDS_OPERATIONS.has(type)) {
            var result;
            try {
                result = RTDS_OPERATIONS.get(type)(current);
            } catch (err) {
                log_error(`[RTDS] ERROR in ${type} step ${current.Id}: ${err.message}`);
                context.session.variables.RTDS_error = err.message;
                return 'disconnect';
            }

            var nextStepId = result.nextStepId;

            if (!nextStepId) {
                log_debug(`[RTDS] No NextStep after step ${current.Id} — end of flow.`);
                return 'disconnect';
            }

            currentId = nextStepId;
            continue;
        }

        // ---- GUI-exit operation ----
        if (RTDS_EXIT_KEYS.has(type)) {
            var exitKey = RTDS_EXIT_KEYS.get(type);
            prepareGuiHandoff(current);
            log_debug(`[RTDS] GUI handoff step ${current.Id} (${type}) -> exit key: "${exitKey}"`);
            return exitKey;
        }

        // ---- Unknown type ----
        log_warn(`[RTDS] Unhandled operation type "${type}" at step ${current.Id}`);
        context.session.variables.RTDS_error = 'Unhandled operation type: ' + type;
        return 'disconnect';
    }

    return 'disconnect';
}


// ---------------------------------------------------------------------------
// 10. resumeFrom(nextStepId)
//     Re-entry point after a GUI node completes.
//     Reads RTDS_nextStepId from context.session.variables, then continues
//     the runStep loop. opIndex is already in context.session.variables.
// ---------------------------------------------------------------------------

function resumeFrom(nextStepId) {
    if (!nextStepId) {
        log_warn('[RTDS] resumeFrom: no nextStepId — end of flow.');
        return 'disconnect';
    }
    return runStep(nextStepId);
}


// ---------------------------------------------------------------------------
// ENTRY POINT A — Initial call entry
//
// Paste this block into the Vocalls Script node that runs first on call entry.
// It sets RTDS_sourceId from the inbound phone number (context.phone), fetches
// the routing table from the RTDS API, parses the flow, and runs the first step.
// ---------------------------------------------------------------------------

context.session.variables.RTDS_sourceId = context.phone;

log_debug('[RTDS] Entry Point A — sourceId=' + context.session.variables.RTDS_sourceId);

return jsonHttpRequest(
  'https://rtds-api.internal/api/routing-table/' + context.session.variables.RTDS_sourceId,
  { method: 'GET' }
).then(function(response) {
  if (response.statusCode !== 200) {
    log_error('[RTDS] API returned ' + response.statusCode + ' for sourceId=' + context.session.variables.RTDS_sourceId);
    context.session.variables.RTDS_error = 'API_ERROR_' + response.statusCode;
    return 'disconnect';
  }

  var json;
  try {
    json = JSON.parse(response.body);
  } catch (err) {
    log_error('[RTDS] JSON.parse failed: ' + err.message);
    context.session.variables.RTDS_error = 'RTDS_PARSE_ERROR';
    return 'disconnect';
  }

  var firstOp = parseFlow(json);
  if (!firstOp) { return 'disconnect'; }

  return runStep(firstOp.Id);
});


// ---------------------------------------------------------------------------
// ENTRY POINT B — Re-entry after a GUI node completes
//
// Paste this block into the Vocalls Script node wired after every GUI node.
// The GUI node must write the chosen outcome step Id into
// context.session.variables.RTDS_nextStepId before this node is entered.
// ---------------------------------------------------------------------------

// return resumeFrom(context.session.variables.RTDS_nextStepId);
