/**
 * rtds_2_runtime.js — RTDS routing-table dispatch
 *
 * Pure RTDS orchestration: fetch the routing table by sourceId, parse it,
 * loop through JS-handled operations inline, and hand GUI-exit operations
 * off to the canvas by mirroring Params into RTDS_OP_* session variables
 * and returning a Type-specific exit key.
 *
 * Loaded SECOND by reverse-alphabetical sort (filename `rtds_2_…` sits
 * between `rtds_3_vocallsEnv.js` and `rtds_1_globalConfig.js`). The
 * env file (loaded first) provides Logger, getValue, jsonHttpRequest's
 * presence guard, etc. The config file (loaded last) provides constVarObj —
 * not consumed by this file, so the back-reference is fine.
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
 * Required platform globals (provided by rtds_3_vocallsEnv.js + Vocalls):
 *   log_debug, log_warn, log_error, jsonHttpRequest, _headers,
 *   _rtBaseUrl, _rtRoutingTableEndpoint
 *
 * ES5.1 — no let/const, no arrow functions, no template literals.
 */

// ===========================================================================
// Unified operation registry (plug-and-play dispatch)
// ===========================================================================
//
// Every operation Type in the catalogue is registered here, either as:
//   - 'js'  kind: a JS handler that runs inline and returns { nextStepId }.
//           Set isMock=true for fallback handlers that just advance the
//           loop; isMock=false for real implementations.
//   - 'gui' kind: a Vocalls GUI component reached via the matching exitKey.
//           The runtime stops at these and hands the call off to the canvas.
//
// To plug in a new real handler, replace its mock with one line:
//     registerRtdsOperation('Emergency', executeEmergency, { isMock: false });
//
// The runtime loop in runStep() does not branch on "real vs mock" —
// everything dispatches uniformly. The isMock flag only drives a small
// info-log so traces show when a leg walked through unimplemented terrain.
//
// RTDS_OPERATIONS and RTDS_EXIT_KEYS below are kept as **read-only views**
// over RTDS_REGISTRY for back-compat with code that consulted them directly.

RTDS_REGISTRY = new Map();
RTDS_OPERATIONS = new Map();
RTDS_EXIT_KEYS = new Map();

// Prefix used when mirroring op.Params into context.session.variables before
// handing off to a GUI-exit component.
OP_VAR_PREFIX = "RTDS_OP_";

/**
 * Registers a JS-handled operation Type. Replaces any existing registration.
 *
 * @param {string}   type    - Operation Type string (e.g. 'Emergency').
 * @param {Function} handler - function (op) -> { nextStepId: ?string }.
 * @param {Object}   [opts]
 * @param {boolean}  [opts.isMock=false] - True if this is a fallback advancer.
 * @returns {void}
 */
function registerRtdsOperation(type, handler, opts) {
  var isMock = !!(opts && opts.isMock);
  RTDS_REGISTRY.set(type, { kind: "js", handler: handler, isMock: isMock });
  RTDS_OPERATIONS.set(type, handler);
  RTDS_EXIT_KEYS.delete(type);
}

/**
 * Registers a GUI-exit Type. The runtime mirrors op.Params to
 * RTDS_OP_<Key> session variables, sets RTDS_currentOpId/Type, and returns
 * exitKey to Vocalls so the call routes to the matching component.
 *
 * @param {string} type    - Operation Type string (e.g. 'PlayPrompt').
 * @param {string} exitKey - Exit-key string emitted to Vocalls.
 * @returns {void}
 */
function registerRtdsExit(type, exitKey) {
  RTDS_REGISTRY.set(type, { kind: "gui", exitKey: exitKey, isMock: false });
  RTDS_EXIT_KEYS.set(type, exitKey);
  RTDS_OPERATIONS.delete(type);
}

/**
 * @returns {Object} Snapshot of the registry as a plain object, for tests
 *                   and diagnostics. Read-only — mutation does not propagate.
 */
function getRtdsRegistry() {
  var out = {};
  RTDS_REGISTRY.forEach(function (entry, type) {
    out[type] = {
      kind: entry.kind,
      isMock: entry.isMock,
      exitKey: entry.exitKey || null,
    };
  });
  return out;
}

/**
 * Factory for a JS mock handler. The returned function tries the supplied
 * branch keys in order (typically the "least disruptive" outcome first)
 * and falls back to 'NextStep'. Records the mock hit on
 * context.session.variables.RTDS_mockOpsHit.
 *
 * @param {string}        type        - The op Type the mock stands in for.
 * @param {Array<string>} branchKeys  - Ordered list of NextStep_* keys to try.
 * @returns {Function} A handler matching the executeXxx contract.
 */
function __makeMockJsHandler(type, branchKeys) {
  return function (op) {
    var nextStepId = null;
    for (var i = 0; i < branchKeys.length; i++) {
      nextStepId = resolveNextStep(op, branchKeys[i]);
      if (nextStepId) {
        break;
      }
    }
    if (!nextStepId) {
      nextStepId = resolveNextStep(op, null);
    }

    Logger.info("[RTDS] mock " + type, {
      opId: op.Id,
      chosenBranch: branchKeys[0] || "NextStep",
      nextStep: nextStepId,
    });
    return { nextStepId: nextStepId };
  };
}

// ===========================================================================
// getRtdsGlobalScope()
//   Returns the active global scope object. In real Vocalls this is the IVR's
//   operational variable scope; in Node VM sandbox it's globalThis. Returns
//   null if neither is reachable, in which case setGlobal falls back to a
//   Function-based assignment.
// ===========================================================================

/**
 * @returns {?Object} Global scope object or null.
 */
function getRtdsGlobalScope() {
  if (typeof global !== "undefined") return global;
  if (typeof globalThis !== "undefined") return globalThis;
  return null;
}

// ===========================================================================
// buildOpIndex(operations)
//   Turns the Operations array into a Map keyed by Id so any operation can
//   be looked up in O(1).
// ===========================================================================

/**
 * @param {Array<Object>} operations
 * @returns {Map<string, Object>}
 */
function buildOpIndex(operations) {
  var index = new Map();
  for (var i = 0; i < operations.length; i++) {
    var op = operations[i];
    if (!op || !op.Id) {
      log_error(
        "[RTDS] buildOpIndex: operation at index " + i + " has no Id — skipped",
      );
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

/**
 * @param {Object} json - Parsed routing-table JSON.
 * @returns {?Object} First operation, or null on error.
 */
function parseFlow(json) {
  if (!json || typeof json !== "object") {
    log_error("[RTDS] parseFlow: json is null or not an object");
    context.session.variables.RTDS_error = "RTDS_PARSE_ERROR";
    return null;
  }
  if (!Array.isArray(json.Operations) || json.Operations.length === 0) {
    log_error("[RTDS] parseFlow: Operations array is missing or empty");
    context.session.variables.RTDS_error = "RTDS_PARSE_ERROR";
    return null;
  }

  context.session.variables.RTDS_sourceId = json.SourceId;
  context.session.variables.RTDS_name = json.Name;
  context.session.variables.RTDS_project = json.Project;
  context.session.variables.RTDS_promptLibrary = json.PromptLibrary;
  context.session.variables.RTDS_supportedLanguages = json.SupportedLanguages;
  context.session.variables.RTDS_opIndex = buildOpIndex(json.Operations);

  var firstOp = getFirstOperation(json.Operations);
  if (!firstOp) {
    context.session.variables.RTDS_error = "RTDS_NO_ENTRY_POINT";
    return null;
  }

  Logger.info("[RTDS] flow parsed", {
    sourceId: json.SourceId,
    name: json.Name,
    entryPoint: firstOp.Id + " (" + firstOp.Name + ")",
    opCount: json.Operations.length,
  });
  return firstOp;
}

// ===========================================================================
// getFirstOperation(operations)
//   Returns the entry-point operation. If multiple carry
//   IsFirstOperation === true (valid for FlowJump scenarios), returns the
//   lexicographically lowest Id — zero-padded numeric Ids sort correctly.
// ===========================================================================

/**
 * @param {Array<Object>} operations
 * @returns {?Object}
 */
function getFirstOperation(operations) {
  var candidates = [];
  for (var i = 0; i < operations.length; i++) {
    if (operations[i] && operations[i].IsFirstOperation === true) {
      candidates.push(operations[i]);
    }
  }
  if (candidates.length === 0) {
    log_error(
      "[RTDS] getFirstOperation: no operation has IsFirstOperation === true",
    );
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

/**
 * @param {Object} op
 * @param {string} name
 * @param {*}      [fallback=null]
 * @returns {*}
 */
function getParam(op, name, fallback) {
  if (fallback === undefined) {
    fallback = null;
  }
  if (!op || !op.Params) {
    return fallback;
  }

  var raw = op.Params[name];
  if (raw === undefined || raw === null) {
    return fallback;
  }

  var value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }
  return value;
}

// ===========================================================================
// setGlobal(name, value)
//   Writes a resolved param value to the operational global scope. Uses
//   getRtdsGlobalScope() when reachable; falls back to a Function-based
//   assignment so the runtime works inside Node VM sandboxes that don't
//   expose `global`. Type is whatever JSON.parse produced — no coercion.
// ===========================================================================

/**
 * @param {string} name
 * @param {*}      value
 * @returns {void}
 */
function setGlobal(name, value) {
  if (value === null || value === undefined) {
    return;
  }
  var scope = getRtdsGlobalScope();
  if (scope) {
    scope[name] = value;
    return;
  }
  new Function("v", name + " = v")(value);
}

// ===========================================================================
// resolveTokens(value)
//   Replaces $(ATTR_NAME) tokens in a string with the current value. Lookup
//   order: context.session.variables first, then global scope. Non-string
//   values pass through unchanged. Unresolved tokens become empty string.
// ===========================================================================

/**
 * @param {*} value
 * @returns {*}
 */
function resolveTokens(value) {
  if (typeof value !== "string") {
    return value;
  }

  return value.replace(/\$\(([^)]+)\)/g, function (match, name) {
    var sessionVal = context.session.variables[name];
    if (sessionVal !== undefined && sessionVal !== null) {
      return String(sessionVal);
    }
    var scope = getRtdsGlobalScope();
    var globalVal = scope ? scope[name] : undefined;
    if (globalVal === undefined) {
      try {
        globalVal = new Function(
          "return typeof " +
            name +
            ' !== "undefined" ? ' +
            name +
            " : undefined;",
        )();
      } catch (ignore) {
        globalVal = undefined;
      }
    }
    if (globalVal !== undefined && globalVal !== null) {
      return String(globalVal);
    }
    return "";
  });
}

// ===========================================================================
// resolveNextStep(op, resultKey)
//   Returns the next-operation Id string. Checks resultKey first
//   (e.g. "NextStep_Open"), falls back to "NextStep". Null when neither set.
// ===========================================================================

/**
 * @param {Object} op
 * @param {?string} resultKey
 * @returns {?string}
 */
function resolveNextStep(op, resultKey) {
  if (resultKey) {
    var specific = getParam(op, resultKey, null);
    if (specific) {
      return String(specific);
    }
  }
  var fallback = getParam(op, "NextStep", null);
  if (fallback) {
    return String(fallback);
  }
  return null;
}

// ===========================================================================
// executeSetAttributes(op)
//   JS-handled operation. Writes Params into global via setGlobal. Handles
//   LogAttributes as a debug side-effect (not stored). NextStep controls
//   flow only and is never stored. Returns { nextStepId }.
// ===========================================================================

/**
 * @param {Object} op
 * @returns {{ nextStepId: ?string }}
 */
function executeSetAttributes(op) {
  var params = op.Params;
  if (!params) {
    return { nextStepId: null };
  }

  var keys = Object.keys(params);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];

    if (key === "NextStep") {
      continue;
    }

    if (key === "LogAttributes") {
      var attrNames = String(params[key]).split("|");
      var parts = [];
      for (var j = 0; j < attrNames.length; j++) {
        var attrName = attrNames[j].replace(/^\s+|\s+$/g, "");
        if (attrName) {
          var attrVal = context.session.variables[attrName];
          if (attrVal === undefined || attrVal === null) {
            var scope = getRtdsGlobalScope();
            attrVal = scope ? scope[attrName] : undefined;
          }
          parts.push(
            attrName +
              "=" +
              (attrVal !== undefined && attrVal !== null ? attrVal : ""),
          );
        }
      }
      log_debug("[RTDS] LogAttributes: " + parts.join(" | "));
      continue;
    }

    var value = resolveTokens(getParam(op, key, null));
    setGlobal(key, value);
  }

  var nextStepId = resolveNextStep(op, null);
  log_debug(
    '[RTDS] SetAttributes "' +
      op.Name +
      '" done. NextStep=' +
      (nextStepId ? nextStepId : "(none)"),
  );
  return { nextStepId: nextStepId };
}

// ===========================================================================
// prepareGuiHandoff(op)
//   Writes RTDS_OP_<Key> mirrors of op.Params to context.session.variables so
//   the matching GUI-exit component can read its config. Sets
//   RTDS_currentOpId / RTDS_currentOpType. Pre-populates RTDS_nextStepId with
//   the default NextStep; the component overwrites this with its chosen
//   branching outcome before re-entry. Old RTDS_OP_* keys from a prior step
//   are wiped first so a missing Param doesn't leak through.
// ===========================================================================

/**
 * @param {Object} op
 * @returns {void}
 */
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

  vars.RTDS_currentOpId = op.Id;
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

/**
 * @param {string|number} startOpId
 * @returns {string} Exit key for the GUI component, or 'disconnect' on error.
 */
function runStep(startOpId) {
  var opIndex = context.session.variables.RTDS_opIndex;
  if (!opIndex || typeof opIndex.get !== "function") {
    log_error("[RTDS] runStep: RTDS_opIndex is missing or not a Map");
    context.session.variables.RTDS_error = "RTDS_NO_OPINDEX";
    return "disconnect";
  }

  var currentId = startOpId ? String(startOpId) : null;

  while (currentId) {
    var current = opIndex.get(currentId);

    if (!current) {
      log_warn('[RTDS] runStep: step "' + currentId + '" not found in opIndex');
      context.session.variables.RTDS_error = "Unknown step: " + currentId;
      return "disconnect";
    }

    var type = current.Type;
    var entry = RTDS_REGISTRY.get(type);
    Logger.info("[RTDS] step", {
      id: current.Id,
      type: type,
      name: current.Name,
      kind: entry ? entry.kind : "unregistered",
      isMock: entry ? entry.isMock : false,
    });

    // Unregistered type — should be impossible if the registration block
    // at the bottom of this file covers the catalogue. Treat as an error.
    if (!entry) {
      log_error(
        '[RTDS] runStep: type "' +
          type +
          '" not in RTDS_REGISTRY at step ' +
          current.Id,
      );
      context.session.variables.RTDS_error =
        "Unregistered operation type: " + type;
      return "disconnect";
    }

    // JS-handled operation (real or mock).
    if (entry.kind === "js") {
      var result;
      try {
        result = entry.handler(current);
      } catch (err) {
        log_error(
          "[RTDS] ERROR in " +
            type +
            " step " +
            current.Id +
            ": " +
            (err && err.message),
        );
        context.session.variables.RTDS_error = err && err.message;
        return "disconnect";
      }

      var nextStepId = result && result.nextStepId;
      if (!nextStepId) {
        Logger.info("[RTDS] end of flow", { lastStep: current.Id });
        return "disconnect";
      }
      currentId = String(nextStepId);
      continue;
    }

    // GUI-exit operation.
    if (entry.kind === "gui") {
      prepareGuiHandoff(current);
      Logger.info("[RTDS] GUI handoff", {
        step: current.Id,
        type: type,
        exitKey: entry.exitKey,
      });
      return entry.exitKey;
    }

    // Corrupted entry — neither 'js' nor 'gui'. Defensive fail.
    log_error(
      '[RTDS] runStep: registry entry for "' +
        type +
        '" has invalid kind=' +
        entry.kind,
    );
    context.session.variables.RTDS_error = "Corrupted registry entry: " + type;
    return "disconnect";
  }

  return "disconnect";
}

// ===========================================================================
// resumeFrom(nextStepId)
//   Re-entry point after a GUI-exit component completes. The component must
//   have written its chosen outcome Id into RTDS_nextStepId before this
//   Script node fires. opIndex is already on the session.
// ===========================================================================

/**
 * @param {string|number|null} nextStepId
 * @returns {string}
 */
function resumeFrom(nextStepId) {
  if (
    nextStepId === undefined ||
    nextStepId === null ||
    nextStepId === "" ||
    nextStepId === -1
  ) {
    log_warn("[RTDS] resumeFrom: no nextStepId — end of flow.");
    return "disconnect";
  }
  Logger.info("[RTDS] resuming", { from: String(nextStepId) });
  return runStep(String(nextStepId));
}

// ===========================================================================
// fetchAndStart(sourceId)
//   Entry A — fetches the routing table for sourceId, parses it, and routes
//   to the entry-point operation. Used by the initial Script node on every
//   call. Endpoint shape: _rtBaseUrl + _rtRoutingTableEndpoint + sourceId.
//   Both globals must be set by the platform-init layer before this runs.
// ===========================================================================

/**
 * @param {string} sourceId
 * @returns {Promise<string>|string} Exit key (or a promise resolving to one).
 */
/**
 * @param {string} sourceId
 * @returns {Promise<string>|string} Exit key (or a promise resolving to one).
 */
/**
 * @param {string} sourceId
 * @returns {Promise<string>|string} Exit key (or a promise resolving to one).
 */
/**
 * @param {string} sourceId
 * @returns {Promise<string>|string} Exit key (or a promise resolving to one).
 */
/**
 * @param {string} sourceId
 * @returns {Promise<string>|string} Exit key (or a promise resolving to one).
 */
function fetchAndStart(sourceId) {
  if (!sourceId) {
    Logger.error("[RTDS] fetchAndStart: sourceId is empty");
    context.session.variables.RTDS_error = "RTDS_NO_SOURCE_ID";
    return "disconnect";
  }
  var url =
    _rtBaseUrl +
    _rtGetSourceIdEndpoint +
    "?sourceId=" +
    encodeURIComponent(sourceId);
  Logger.API("[RTDS] fetching routing table", { sourceId: sourceId, url: url });
  return jsonHttpRequest(url, { method: "GET" }, _headers)
    .withTimeout(10000)
    .then(
      function (rawResult) {
        var result = rawResult;
        if (typeof result === "string") {
          try {
            result = JSON.parse(result);
          } catch (parseErr) {
            Logger.error("[RTDS] fetchAndStart: envelope parse failed", {
              error: parseErr.message,
              raw: rawResult,
            });
            context.session.variables.RTDS_error = "RTDS_RESULT_PARSE_ERROR";
            return "disconnect";
          }
        }

        if (!result || result.success !== true || result.statusCode !== 200) {
          var status = result && result.statusCode;
          Logger.error("[RTDS] fetchAndStart: API failure", {
            sourceId: sourceId,
            status: status,
          });
          Logger.debug("[RTDS] fetchAndStart: failure result", {
            result: result,
          });
          context.session.variables.RTDS_error =
            "RTDS_API_ERROR_" + (status || "UNKNOWN");
          return "disconnect";
        }

        var body = result.response;
        if (typeof body === "string") {
          try {
            body = JSON.parse(body);
          } catch (parseErr) {
            Logger.error("[RTDS] fetchAndStart: body parse failed", {
              error: parseErr.message,
              raw: result.response,
            });
            context.session.variables.RTDS_error = "RTDS_PARSE_ERROR";
            return "disconnect";
          }
        }

        Logger.API("[RTDS] routing table received", {
          sourceId: sourceId,
          status: result.statusCode,
          name: body && body.name,
        });
        Logger.debug("[RTDS] fetchAndStart: success body", { body: body });

        var firstOp = parseFlow(body);
        if (!firstOp) {
          Logger.error("[RTDS] fetchAndStart: no entry operation", {
            sourceId: sourceId,
          });
          context.session.variables.RTDS_error = "RTDS_NO_ENTRY_POINT";
          return "disconnect";
        }
        return runStep(firstOp.Id);
      },
      function (err) {
        var errMsg = err && err.message ? err.message : String(err);
        Logger.error("[RTDS] fetchAndStart: request rejected", {
          sourceId: sourceId,
          url: url,
          error: errMsg,
        });
        context.session.variables.RTDS_error = "RTDS_REQUEST_ERROR";
        return "disconnect";
      },
    );
}

// ===========================================================================
// executeCondition(op)
//   JS-handled. Evaluates a numeric predicate against a per-workgroup stat
//   table. Reads Statistic, Workgroup, Operator, Value. Branches via
//   NextStep_True / NextStep_False.
//
//   Live source in production: queue-stat API (CallsWaiting, AgentsLoggedIn).
//   In this example: the dev-only global _devStatistics[Workgroup][Statistic]
//   stands in. Returning the same { nextStepId } shape keeps the swap point
//   confined to the stat lookup.
// ===========================================================================

/**
 * @param {Object} op
 * @returns {{ nextStepId: ?string }}
 */
function executeCondition(op) {
  var statistic = getParam(op, "Statistic", "");
  var workgroup = getParam(op, "Workgroup", "");
  var operator = String(getParam(op, "Operator", "eq")).toLowerCase();
  var rawValue = getParam(op, "Value", 0);
  var threshold = Number(rawValue);

  var liveValue = null;
  var stats = typeof _devStatistics !== "undefined" ? _devStatistics : null;
  if (stats && stats[workgroup] && stats[workgroup][statistic] !== undefined) {
    liveValue = Number(stats[workgroup][statistic]);
  }

  var predicate = false;
  if (liveValue === null || isNaN(liveValue) || isNaN(threshold)) {
    log_warn(
      "[RTDS] Condition: missing stat value | workgroup=" +
        workgroup +
        " statistic=" +
        statistic,
    );
  } else {
    if (operator === "gt") predicate = liveValue > threshold;
    else if (operator === "lt") predicate = liveValue < threshold;
    else if (operator === "ge") predicate = liveValue >= threshold;
    else if (operator === "le") predicate = liveValue <= threshold;
    else if (operator === "eq") predicate = liveValue === threshold;
    else if (operator === "ne") predicate = liveValue !== threshold;
    else {
      log_warn(
        '[RTDS] Condition: unknown operator "' +
          operator +
          '" — treating as false',
      );
    }
  }

  var nextStepId = resolveNextStep(
    op,
    predicate ? "NextStep_True" : "NextStep_False",
  );
  Logger.info("[RTDS] Condition", {
    workgroup: workgroup,
    statistic: statistic,
    operator: operator,
    threshold: threshold,
    live: liveValue,
    predicate: predicate,
    nextStep: nextStepId,
  });
  return { nextStepId: nextStepId };
}

// ===========================================================================
// executeEmergency(op)
//   JS-handled. Reads EmergencyId, consults the outcome table for that id,
//   branches via NextStep_<outcome> where outcome is one of:
//     Transfer | Disconnect | Continue | Failure
//   Default outcome when no entry is present: 'Continue' (least disruptive).
//
//   Live source in production: emergency-config API. In this example:
//   _devEmergencyOutcomes[EmergencyId].
// ===========================================================================

/**
 * @param {Object} op
 * @returns {{ nextStepId: ?string }}
 */
function executeEmergency(op) {
  if (!getParam(op, "Active", false)) {
    var skipNext = resolveNextStep(op, null);
    Logger.info("[RTDS] Emergency skipped — inactive", { nextStep: skipNext });
    return { nextStepId: skipNext };
  }

  var emergencyId = getParam(op, "EmergencyId", "");
  var outcomes =
    typeof _devEmergencyOutcomes !== "undefined" ? _devEmergencyOutcomes : {};
  var outcome = outcomes[emergencyId] || "Continue";

  var nextStepId = resolveNextStep(op, "NextStep_" + outcome);
  if (!nextStepId) {
    nextStepId = resolveNextStep(op, null);
  }

  Logger.info("[RTDS] Emergency", {
    emergencyId: emergencyId,
    outcome: outcome,
    nextStep: nextStepId,
  });
  return { nextStepId: nextStepId };
}

// ===========================================================================
// executeSchedule(op)
//   JS-handled. Reads ScheduleID, consults the state table, branches via
//   NextStep_<state> where state is operator-defined (Open, Closed,
//   Guard_ICT, Transfer, …). Falls back to NextStep on unknown state.
//
//   Live source in production: scheduler API. In this example:
//   _devScheduleStates[ScheduleID].
// ===========================================================================

/**
 * @param {Object} op
 * @returns {{ nextStepId: ?string }}
 */
function executeSchedule(op) {
  var scheduleId = String(getParam(op, "ScheduleID", ""));
  var states =
    typeof _devScheduleStates !== "undefined" ? _devScheduleStates : {};
  var state = states[scheduleId] || "";

  var branchKey = state ? "NextStep_" + state : null;
  var nextStepId = branchKey ? resolveNextStep(op, branchKey) : null;
  if (!nextStepId) {
    nextStepId = resolveNextStep(op, "NextStep_Failure");
  }
  if (!nextStepId) {
    nextStepId = resolveNextStep(op, null);
  }

  Logger.info("[RTDS] Schedule", {
    scheduleId: scheduleId,
    state: state || "(no fixture)",
    nextStep: nextStepId,
  });
  return { nextStepId: nextStepId };
}

// ===========================================================================
// executeFlowJump(op)
//   JS-handled. Replaces the current op index with the routing table for a
//   different SourceId, then returns the first op of the new flow so the
//   outer runStep loop continues seamlessly into it.
//
//   Live source in production: fetchAndStart(sourceId) → parseFlow. In this
//   example: _devFixtures[sourceId] holds the routing-table JSON. When no
//   fixture is registered, the handler returns null (runStep treats that as
//   end-of-flow and routes the call to disconnect).
// ===========================================================================

/**
 * @param {Object} op
 * @returns {{ nextStepId: ?string }}
 */
function executeFlowJump(op) {
  var sourceId = getParam(op, "SourceId", "");
  if (!sourceId) {
    log_error("[RTDS] FlowJump: missing SourceId");
    return { nextStepId: null };
  }

  var fixtures = typeof _devFixtures !== "undefined" ? _devFixtures : null;
  var nextFlow = fixtures ? fixtures[sourceId] : null;
  if (!nextFlow) {
    log_warn(
      "[RTDS] FlowJump: no fixture for sourceId " + sourceId + " — ending leg",
    );
    context.session.variables.RTDS_error =
      "RTDS_FLOWJUMP_NO_FIXTURE_" + sourceId;
    return { nextStepId: null };
  }

  Logger.info("[RTDS] FlowJump", { sourceId: sourceId });
  var firstOp = parseFlow(nextFlow);
  if (!firstOp) {
    return { nextStepId: null };
  }
  return { nextStepId: firstOp.Id };
}

// ===========================================================================
// REGISTRATION — wires every catalogue Type into RTDS_REGISTRY.
//
// Real handlers (defined above) register with isMock=false. Mocks use
// __makeMockJsHandler with an ordered list of NextStep_* keys to try.
// To promote a mock to a real handler:
//   1. Implement executeXxx above (returns { nextStepId }).
//   2. Replace its registerRtdsOperation line below with the real handler
//      and { isMock: false }.
// The runtime loop is untouched in either case.
// ===========================================================================

// --- Real JS handlers ---
// SetAttributes is the only fully production-implemented handler in this
// project. The other four (Condition / Emergency / Schedule / FlowJump)
// have function bodies defined further up the file, but they read from
// dev-fixture globals (_devStatistics etc.) which only exist in the
// development project. Until each one has a real data-source wired in,
// they ship as MOCKS — promoting one is a single-line edit below.
registerRtdsOperation("SetAttributes", executeSetAttributes, { isMock: false });

// --- JS-side mocks ---
// Each mock picks the most defensible NextStep_<key> branch so the loop
// keeps advancing. Promote any of these to a real handler by editing its
// line to reference the executeXxx function above with { isMock: false }.
registerRtdsOperation(
  "Emergency",
  __makeMockJsHandler("Emergency", ["NextStep_Continue"]),
  { isMock: true },
);
registerRtdsOperation(
  "Schedule",
  __makeMockJsHandler("Schedule", ["NextStep_Open"]),
  { isMock: true },
);
registerRtdsOperation(
  "Condition",
  __makeMockJsHandler("Condition", ["NextStep_True"]),
  { isMock: true },
);
registerRtdsOperation(
  "FlowJump",
  __makeMockJsHandler("FlowJump", []), // no NextStep_* keys — ends the leg
  { isMock: true },
);

// --- GUI-exit Types — handled by Vocalls components on the canvas ---
registerRtdsExit("WorkgroupTransfer", "workgroup_transfer");
registerRtdsExit("ExternalTransfer", "external_transfer");
registerRtdsExit("Menu", "menu");
registerRtdsExit("LanguageMenu", "language_menu");
registerRtdsExit("PlayPrompt", "play_prompt");
registerRtdsExit("PlayAudio", "play_audio");
registerRtdsExit("Disconnect", "disconnect");
registerRtdsExit("GuardRouting", "guard_routing");
registerRtdsExit("GuardTUI", "guard_tui");
registerRtdsExit("Callback", "callback");
registerRtdsExit("SendSMS", "send_sms");
registerRtdsExit("SendEmail", "send_email");

Logger.info("[RTDS] registry initialised", {
  types: RTDS_REGISTRY.size,
  jsReal: (function () {
    var n = 0;
    RTDS_REGISTRY.forEach(function (e) {
      if (e.kind === "js" && !e.isMock) n++;
    });
    return n;
  })(),
  jsMock: (function () {
    var n = 0;
    RTDS_REGISTRY.forEach(function (e) {
      if (e.kind === "js" && e.isMock) n++;
    });
    return n;
  })(),
  gui: (function () {
    var n = 0;
    RTDS_REGISTRY.forEach(function (e) {
      if (e.kind === "gui") n++;
    });
    return n;
  })(),
});
