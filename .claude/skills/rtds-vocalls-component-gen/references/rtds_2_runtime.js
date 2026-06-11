// ===========================================================================
// Unified operation registry (plug-and-play dispatch)
// ===========================================================================
//
// Every operation Type in the catalogue is registered here, either as:
//   - 'js'  kind: a JS handler that runs inline and returns { nextStepId }.
//           Only real implementations are registered -- there are no mock
//           advancers. A Type with no real handler yet stays unregistered,
//           and runStep skips it to its NextStep with a warning.
//   - 'gui' kind: a Vocalls GUI component reached via the matching exitKey.
//           The runtime stops at these and hands the call off to the canvas.
//
// To plug in a new handler, add one line:
//     registerRtdsOperation('NewType', executeNewType);
//
// RTDS_OPERATIONS and RTDS_EXIT_KEYS below are kept as **read-only views**
// over RTDS_REGISTRY for back-compat with code that consulted them directly.

/**
 * Unified dispatch registry. Each entry maps an operation Type string to its
 * routing entry:
 *   - `{ kind: 'js',  handler: Function }` for JS-handled types
 *   - `{ kind: 'gui', exitKey: string  }` for GUI-exit types
 *
 * Populated by registerRtdsOperation / registerRtdsExit at library init time.
 * Do not mutate directly -- use the register* functions.
 *
 * @type {Map<string, {kind: string, handler?: Function, exitKey?: string}>}
 */
RTDS_REGISTRY = new Map();

/**
 * Upper bound on the number of dispatch steps a single runStep run may take
 * before it aborts as a runaway/cycle (see the budget check in runStep). The
 * cap spans sync and async hops of one run. Sized generously so no legitimate
 * flow -- including retry/reprompt loops that revisit nodes -- can hit it,
 * while still terminating a true cycle (e.g. NextStep pointing back at itself)
 * in bounded time instead of hanging the call leg.
 * @type {number}
 */
RTDS_MAX_STEPS = 1000;

/**
 * Finalization-mode flag. Set true by finalizeFrom (from the platform's
 * onCallResult termination callback) so runStep filters out GUI-exit operations
 * and runs only the JS-inline data tail. Defaults false for every live call;
 * never reset (finalization is terminal -- the global scope is discarded at
 * session end). Also declared in the master-layer Variables property so a fresh
 * session always starts with it false.
 * @type {boolean}
 */
RTDS_finalizing = false;

/**
 * Unified-outcome staging globals, shared by JS twins and GUI components.
 * A JS handler assigns __rtParams (resolved config, via setupConfig) and stages
 * __rtOutcome (a Params key name); the engine resolves _rtNextStep =
 * getValue(__rtParams, __rtOutcome, '') after the handler settles. Seeded here
 * so the engine can read them even before any handler has run (a bare
 * undeclared read would throw, not yield undefined). A component re-seeds them
 * in its master-layer Variables, exactly like RTDS_finalizing.
 * @type {Object}
 */
__rtParams = {};
/** @type {string} */
__rtOutcome = "nextStep";

/**
 * Read-only view over RTDS_REGISTRY filtered to JS-handled types.
 * Maps Type string -> handler function. Kept for back-compat.
 * @type {Map<string, Function>}
 */
RTDS_OPERATIONS = new Map();

/**
 * Read-only view over RTDS_REGISTRY filtered to GUI-exit types.
 * Maps Type string -> exit-key string. Kept for back-compat.
 * @type {Map<string, string>}
 */
RTDS_EXIT_KEYS = new Map();

/**
 * Registers a JS-handled operation Type. Replaces any existing registration.
 *
 * @param {string}   type    - Operation Type string (e.g. 'Emergency').
 * @param {Function} handler - function (op) -> { nextStepId: ?string }.
 * @returns {void}
 */
function registerRtdsOperation(type, handler) {
  RTDS_REGISTRY.set(type, { kind: "js", handler: handler });
  RTDS_OPERATIONS.set(type, handler);
  RTDS_EXIT_KEYS.delete(type);
}

/**
 * Registers a GUI-exit Type. At handoff the runtime (prepareGuiHandoff) sets
 * RTDS_currentOpId/Type and RTDS_currentOpConfig (the whole op.params object),
 * pre-populates RTDS_nextStepId with the default NextStep, and returns exitKey
 * to Vocalls so the call routes to the matching component.
 *
 * @param {string} type    - Operation Type string (e.g. 'PlayPrompt').
 * @param {string} exitKey - Exit-key string emitted to Vocalls.
 * @returns {void}
 */
function registerRtdsExit(type, exitKey) {
  RTDS_REGISTRY.set(type, { kind: "gui", exitKey: exitKey });
  RTDS_EXIT_KEYS.set(type, exitKey);
  RTDS_OPERATIONS.delete(type);
}

/**
 * @returns {Object} Snapshot of the registry as a plain object, for tests
 *                   and diagnostics. Read-only -- mutation does not propagate.
 */
function getRtdsRegistry() {
  var out = {};
  RTDS_REGISTRY.forEach(function (entry, type) {
    out[type] = {
      kind: entry.kind,
      exitKey: entry.exitKey || null,
    };
  });
  return out;
}

/**
 * Diagnostic dump of the RTDS dispatch layer: the routing-table header
 * fields parseFlow scattered onto context.session.variables, the registry
 * snapshot, the live dispatcher/handoff state vars, the endpoint globals
 * the runtime POSTs to, and the full operations list expanded out of the
 * RTDS_opIndex Map (which JSON.stringify cannot serialise on its own).
 *
 * Output goes through Logger.debug, so it only prints when activeLevel is
 * DEBUG. Call from a Script node AFTER fetchAndStart has resolved (the
 * RTDS_* vars and opIndex only exist post-parseFlow); the handoff vars
 * (RTDS_currentOpId / RTDS_nextStepId) only populate once runStep reaches a
 * GUI op. Env-layer config (varObj, Logger.config) is dumped separately by
 * Logger.dumpConfig (rtds_3_vocallsEnv.js).
 *
 * @returns {void}
 */
function dumpRtdsState() {
  if (!Logger.shouldLog("DEBUG")) return;
  var v = context.session.variables || {};

  Logger.debug("[rtds] routing table", {
    sourceId: v.RTDS_sourceId || null,
    name: v.RTDS_name || null,
    project: v.RTDS_project || null,
    promptLibrary: v.RTDS_promptLibrary || null,
    supportedLanguages: v.RTDS_supportedLanguages || null,
  });

  Logger.debug(
    "[rtds] registry | " + Logger.sanitizeForLog(getRtdsRegistry(), 4000),
  );

  Logger.debug("[rtds] dispatcher state", {
    currentOpId: v.RTDS_currentOpId || null,
    currentOpType: v.RTDS_currentOpType || null,
    nextStepId: v.RTDS_nextStepId || null,
    error: v.RTDS_error || null,
  });

  Logger.debug("[rtds] endpoints", {
    baseUrl: typeof _rtBaseUrl !== "undefined" ? _rtBaseUrl : null,
    getSourceId:
      typeof _rtGetSourceIdEndpoint !== "undefined"
        ? _rtGetSourceIdEndpoint
        : null,
    sms: typeof _rtSmsEndpoint !== "undefined" ? _rtSmsEndpoint : null,
    mail: typeof _rtMailEndpoint !== "undefined" ? _rtMailEndpoint : null,
  });

  var idx = v.RTDS_opIndex;
  if (idx && typeof idx.forEach === "function") {
    var ops = [];
    idx.forEach(function (op) {
      ops.push(op);
    });
    Logger.debug("[rtds] operations | " + Logger.sanitizeForLog(ops, 10000));
  } else {
    Logger.debug("[rtds] operations | (opIndex not built yet)");
  }
}

// ===========================================================================
// buildOpIndex(operations)
//   Turns the operations array into a Map keyed by id so any operation can
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
    if (!op || !op.id) {
      log_error(
        "[RTDS] buildOpIndex: operation at index " +
          i +
          " has no id -- skipped",
      );
      continue;
    }
    index.set(String(op.id), op);
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
  if (!Array.isArray(json.operations) || json.operations.length === 0) {
    log_error("[RTDS] parseFlow: operations array is missing or empty");
    context.session.variables.RTDS_error = "RTDS_PARSE_ERROR";
    return null;
  }

  context.session.variables.RTDS_sourceId = json.sourceId;
  context.session.variables.RTDS_name = json.name;
  context.session.variables.RTDS_project = json.project;
  context.session.variables.RTDS_promptLibrary = json.promptLibrary;
  context.session.variables.RTDS_supportedLanguages = json.supportedLanguages;
  context.session.variables.RTDS_opIndex = buildOpIndex(json.operations);

  var firstOp = getFirstOperation(json.operations);
  if (!firstOp) {
    context.session.variables.RTDS_error = "RTDS_NO_ENTRY_POINT";
    return null;
  }

  Logger.info("[RTDS] flow parsed", {
    sourceId: json.sourceId,
    name: json.name,
    entryPoint: firstOp.id + " (" + firstOp.name + ")",
    opCount: json.operations.length,
  });

  // DEBUG-only init dump: the full routing table as received, the operation
  // count, and the resolved first step. Logger.debug early-returns when
  // activeLevel isn't DEBUG, so the full-table serialisation cost is skipped
  // (and the trace stays quiet) in normal runs -- guard before sanitising.
  if (Logger.shouldLog("DEBUG")) {
    Logger.debug(
      "[RTDS] init | opCount=" +
        json.operations.length +
        " firstStep=" +
        firstOp.id +
        " (" +
        firstOp.name +
        ")",
    );
    Logger.debug(
      "[RTDS] init | full table | " + Logger.sanitizeForLog(json, 20000),
    );
  }
  return firstOp;
}

// ===========================================================================
// getFirstOperation(operations)
//   Returns the entry-point operation. If multiple carry
//   isFirstOperation === true (valid for FlowJump scenarios), returns the
//   lexicographically lowest id -- zero-padded numeric ids sort correctly.
// ===========================================================================

/**
 * @param {Array<Object>} operations
 * @returns {?Object}
 */
function getFirstOperation(operations) {
  var candidates = [];
  for (var i = 0; i < operations.length; i++) {
    if (operations[i] && operations[i].isFirstOperation === true) {
      candidates.push(operations[i]);
    }
  }
  if (candidates.length === 0) {
    log_error(
      "[RTDS] getFirstOperation: no operation has isFirstOperation === true",
    );
    return null;
  }
  candidates.sort(function (a, b) {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
  return candidates[0];
}

// ===========================================================================
// getParam(op, name, fallback)
//   Reads a single typed param value from op.params, unwrapping the array
//   form [value, ...flags]. GUI-builder flags (isDisplayed, isEditable) are
//   irrelevant at runtime -- only v[0] is used. Native types preserved.
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
  if (!op || !op.params) {
    return fallback;
  }

  var params = op.params;
  var raw = params[name];

  if (raw === undefined) {
    var lower = String(name).toLowerCase();
    var keys = Object.keys(params);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === lower) {
        raw = params[keys[i]];
        break;
      }
    }
  }

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
// resolveTokens(value)
//   Replaces $(ATTR_NAME) tokens in a string with the current value. Operator
//   attributes resolve through getScoped (varObj -> global); an RTDS_* token
//   falls back to context.session.variables (the dispatcher namespace).
//   Non-string values pass through unchanged. Unresolved tokens become "".
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
    // RTDS_* tokens belong to the dispatcher namespace on
    // context.session.variables (see conventions/storage.md). Resolve them
    // there first so an operator-set varObj/global key of the same name can't
    // shadow them. All other tokens resolve operator data via getScoped.
    if (String(name).indexOf("RTDS_") === 0) {
      var rtdsVal = context.session.variables[name];
      if (rtdsVal !== undefined && rtdsVal !== null) {
        return String(rtdsVal);
      }
      return "";
    }

    var scoped = getScoped(name, null);
    if (scoped !== undefined && scoped !== null) {
      return String(scoped);
    }
    var sessionVal = context.session.variables[name];
    if (sessionVal !== undefined && sessionVal !== null) {
      return String(sessionVal);
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
  var fallback = getParam(op, "nextStep", null);
  if (fallback) {
    return String(fallback);
  }
  return null;
}

// ===========================================================================
// executeSetVariables(op)
//   JS-handled operation (supersedes SetAttributes). Mirrors the canvas
//   component rtds/components/setVariables.js under the unified __rtOutcome
//   contract: builds __rtParams via setupConfig, stages __rtOutcome, and writes
//   each non-control Param to its dot-path target via setVariable -- a bare key
//   lands on varObj (conventions/storage.md), a dotted key targets
//   varObj/globalThis/a named reachable object. Values keep their resolved type.
//   Control keys (active, nextStep) are never stored. The engine resolves
//   _rtNextStep from __rtOutcome after this returns; the handler returns nothing.
//   Active defaults TRUE -- byte-identical to the rtds/components/setVariables.js
//   component (sendSms / sendMail twins + components also default true).
// ===========================================================================

/**
 * @param {Object} op
 * @returns {void}
 */
function executeSetVariables(op) {
  __rtParams = setupConfig(op.params);
  __rtOutcome = "nextStep";

  if (!activeFlag(getValue(__rtParams, "active", true))) {
    Logger.info("[RTDS] SetVariables skipped -- inactive", {
      outcome: __rtOutcome,
    });
    return;
  }

  var CONTROL = { active: 1, nextstep: 1 };
  var written = 0;
  walk(__rtParams, function (key, value) {
    if (CONTROL[String(key).toLowerCase()]) return;
    setVariable(key, value); // dot-path write; varObj by default
    written++;
  });

  Logger.info("[RTDS] SetVariables wrote variables", {
    count: written,
    outcome: __rtOutcome,
  });
  // sync: returns undefined -- engine resolves _rtNextStep from __rtOutcome.
}

// ===========================================================================
// prepareGuiHandoff(op)
//   Sets the dispatcher handoff state on context.session.variables:
//   RTDS_currentOpId / RTDS_currentOpType, RTDS_currentOpConfig (op.params
//   delivered to the component), RTDS_currentTtsMessages (op.ttsMessages — the
//   per-language spoken text for prompt-playing components), and pre-populates
//   RTDS_nextStepId with the default NextStep (the component overwrites it with
//   its chosen branching outcome before re-entry).
// ===========================================================================

/**
 * @param {Object} op
 * @returns {void}
 */
function prepareGuiHandoff(op) {
  var vars = context.session.variables;

  vars.RTDS_currentOpId = op.id;
  vars.RTDS_currentOpType = op.type;
  vars.RTDS_currentOpConfig = op.params || {};
  // Operation-level ttsMessages ({ "NL": "...", "FR": "..." }) is a sibling of
  // op.params, not part of it. Forward it on its own session var so prompt-playing
  // GUI components (say, getLanguage, …) can speak the per-language text; absent on
  // non-prompt ops, so default to {}.
  vars.RTDS_currentTtsMessages = op.ttsMessages || {};

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
 * @param {number} [stepBudget] Internal. Remaining dispatch steps before the
 *        loop aborts as a runaway/cycle. Defaults to RTDS_MAX_STEPS on the
 *        first (external) call; threaded through the async re-entry so the cap
 *        spans sync and async hops alike. External callers omit it.
 * @returns {string|Promise<string>} Exit key for the GUI component, or 'disconnect' on error. When a JS handler returns a thenable, returns a promise.
 */
function runStep(startOpId, stepBudget) {
  var opIndex = context.session.variables.RTDS_opIndex;
  if (!opIndex || typeof opIndex.get !== "function") {
    log_error("[RTDS] runStep: RTDS_opIndex is missing or not a Map");
    context.session.variables.RTDS_error = "RTDS_NO_OPINDEX";
    return "disconnect";
  }

  var currentId = startOpId ? String(startOpId) : null;

  // Bounds total dispatch steps to guard against cyclic NextStep chains AND
  // runaway-but-acyclic flows (e.g. a retry/reprompt loop that legitimately
  // revisits a step). We count iterations rather than forbidding node revisits:
  // a node may be legitimately re-entered (join points, retry loops), so
  // "visited once" is NOT a cycle -- only "too many steps without terminating"
  // is. The budget is threaded through the async re-entry below so it spans
  // sync and async hops as one run; without it an async A->B->A loop would
  // recurse forever (each hop a fresh runStep) with no protection.
  var remaining = typeof stepBudget === "number" ? stepBudget : RTDS_MAX_STEPS;

  while (currentId) {
    if (remaining <= 0) {
      log_error(
        "[RTDS] runStep: step budget exhausted at step " +
          currentId +
          " (possible cycle or runaway flow; cap=" +
          RTDS_MAX_STEPS +
          ")",
      );
      context.session.variables.RTDS_error = "RTDS_CYCLE_DETECTED";
      return "disconnect";
    }
    remaining--;

    var current = opIndex.get(currentId);

    if (!current) {
      log_warn('[RTDS] runStep: step "' + currentId + '" not found in opIndex');
      context.session.variables.RTDS_error = "Unknown step: " + currentId;
      return "disconnect";
    }

    var type = current.type;
    var entry = RTDS_REGISTRY.get(type);
    Logger.info("[RTDS] step", {
      id: current.id,
      type: type,
      name: current.name,
      kind: entry ? entry.kind : "unregistered",
    });

    // DEBUG-only per-cycle dump of the operation's full params object. The
    // INFO line above is the always-on summary; this adds the raw config the
    // handler will read. Logger.debug early-returns when activeLevel isn't
    // DEBUG, so this is silent (and the sanitize cost is skipped) in normal
    // runs -- see the shouldLog guard before paying for serialisation.
    if (Logger.shouldLog("DEBUG")) {
      Logger.debug(
        "[RTDS] step params | id=" +
          current.id +
          " type=" +
          type +
          " | " +
          Logger.sanitizeForLog(current.params, 10000),
      );
    }

    // Unregistered type -- no real handler exists for this Type yet. Rather
    // than fail the leg, skip to the op's NextStep with a warning so the
    // flow keeps moving. When the type's handler is later implemented and
    // registered, this branch stops being taken.
    if (!entry) {
      var skipTo = resolveNextStep(current, null);
      Logger.warn("[RTDS] unimplemented operation type -- skipping", {
        type: type,
        step: current.id,
        nextStep: skipTo,
      });
      if (!skipTo) {
        Logger.info("[RTDS] end of flow", { lastStep: current.id });
        return "disconnect";
      }
      currentId = String(skipTo);
      continue;
    }

    // JS-handled operation. The handler stages __rtParams + __rtOutcome (the
    // same contract a GUI component uses); the engine is the SINGLE resolver --
    // after the handler settles it runs the output-node-equivalent line
    // _rtNextStep = getValue(__rtParams, __rtOutcome, '') and advances. The
    // handler's return value is used only for sync-vs-async timing, never for
    // routing: Promise.resolve normalises undefined (sync) and a thenable
    // (async) into one awaitable, so runStep returns a promise for every JS op
    // (sync ops gain one microtask hop). The remaining step budget is carried
    // into the re-entry so the cycle cap spans sync and async hops as one run.
    if (entry.kind === "js") {
      var jsTask;
      try {
        jsTask = Promise.resolve(entry.handler(current));
      } catch (err) {
        log_error(
          "[RTDS] ERROR in " +
            type +
            " step " +
            current.id +
            ": " +
            (err && err.message),
        );
        context.session.variables.RTDS_error = err && err.message;
        return "disconnect";
      }

      var jsCurrentId = current.id;
      return jsTask.then(
        function () {
          _rtNextStep = getValue(__rtParams, __rtOutcome, "");
          if (!_rtNextStep) {
            Logger.info("[RTDS] end of flow", { lastStep: jsCurrentId });
            return "disconnect";
          }
          return runStep(String(_rtNextStep), remaining);
        },
        function (err) {
          log_error(
            "[RTDS] ERROR in async " +
              type +
              " step " +
              jsCurrentId +
              ": " +
              (err && err.message),
          );
          context.session.variables.RTDS_error = err && err.message;
          return "disconnect";
        },
      );
    }

    // GUI-exit operation.
    if (entry.kind === "gui") {
      // Finalization mode (set by onCallResult via finalizeFrom): the
      // interaction is over, there is no live call leg to route to a canvas
      // component, and runStep's return value is not routed. GUI operations are
      // filtered out -- log and stop, dropping the interactive remainder. Only
      // the JS-inline (data) tail runs to completion. See finalizeFrom.
      if (RTDS_finalizing) {
        Logger.info("[RTDS] finalize: stop at GUI node", {
          step: current.id,
          type: type,
        });
        return "disconnect";
      }
      prepareGuiHandoff(current);
      Logger.info("[RTDS] GUI handoff", {
        step: current.id,
        type: type,
        exitKey: entry.exitKey,
      });
      return entry.exitKey;
    }

    // Corrupted entry -- neither 'js' nor 'gui'. Defensive fail.
    log_error(
      '[RTDS] runStep: registry entry for "' +
        type +
        '" has invalid kind=' +
        entry.kind +
        " at step " +
        current.id,
    );
    context.session.variables.RTDS_error = "Corrupted registry entry: " + type;
    return "disconnect";
  }

  return "disconnect";
}

// ===========================================================================
// resumeFrom(nextStepId)
//   Re-entry point after a GUI-exit component completes. GUI components write
//   their chosen outcome Id to the master-layer global _rtNextStep before the
//   Re-Entry Script fires; RTDS_nextStepId (pre-set by prepareGuiHandoff) is
//   the safety-net fallback. opIndex is already on the session.
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
    log_warn("[RTDS] resumeFrom: no nextStepId -- end of flow.");
    return "disconnect";
  }
  Logger.info("[RTDS] resuming", { from: String(nextStepId) });
  return runStep(String(nextStepId));
}

// ===========================================================================
// finalizeFrom(nextStepId)
//   End-of-call entry point, called from the platform's termination callback
//   (onCallResult). Runs the remaining flow from nextStepId in FINALIZATION
//   MODE: it sets the RTDS_finalizing flag, then reuses the normal runStep
//   engine. While the flag is set, runStep's GUI-exit branch filters out
//   caller-facing operations -- it logs and stops instead of handing off, since
//   the call leg is gone -- so only the JS-inline (data) tail of the flow runs:
//   the call-report SendEmail / SendSMS, attribute writes, and API calls that
//   the caller's hangup cut short.
//
//   The flag is never cleared: finalization is the terminal mode of the call,
//   and the global scope is discarded when the session ends. There is no live
//   call after this, so no path that must see runStep behave normally again.
//
//   Returns whatever runStep returns. When an async JS handler (SendSMS /
//   SendEmail) is in the tail, that is a promise; onCallResult returns it so the
//   platform awaits it before tearing the session down -- which is what makes
//   those terminal POSTs reliably complete rather than fire-and-forget.
// ===========================================================================

/**
 * @param {string|number|null} nextStepId
 * @returns {string|Promise<string>|undefined} The runStep result ('disconnect'
 *   or a promise of it), or undefined when there is no resume point.
 */
function finalizeFrom(nextStepId) {
  if (
    nextStepId === undefined ||
    nextStepId === null ||
    nextStepId === "" ||
    nextStepId === -1
  ) {
    log_warn("[RTDS] finalizeFrom: no resume point -- nothing to finalize.");
    return undefined;
  }
  RTDS_finalizing = true;
  Logger.info("[RTDS] finalizing", { from: String(nextStepId) });
  return runStep(String(nextStepId));
}

// ===========================================================================
// fetchAndStart(sourceId)
//   Entry A -- fetches the routing table for sourceId, parses it, and routes
//   to the entry-point operation. Used by the initial Script node on every
//   call. URL: _rtBaseUrl + _rtGetSourceIdEndpoint + '?sourceId=' + encodeURIComponent(sourceId).
//   Both globals must be set by the platform-init layer before this runs.
// ===========================================================================

/**
 * @param {string} sourceId
 * @returns {Promise<string>|string} Exit key (or a promise resolving to one).
 */
// function fetchAndStart(sourceId) {
//   if (!sourceId) {
//     log_error("[RTDS] fetchAndStart: sourceId is empty");
//     context.session.variables.RTDS_error = "RTDS_NO_SOURCE_ID";
//     return "disconnect";
//   }
//   var url =
//     _rtBaseUrl +
//     _rtGetSourceIdEndpoint +
//     "?sourceId=" +
//     encodeURIComponent(sourceId);
//   Logger.info("[RTDS] fetching routing table", { sourceId: sourceId });
//   return jsonHttpRequest(url, { method: "GET" }, _headers)
//     .withTimeout(10000)
//     .then(
//       function (rawResult) {
//         var result = rawResult;
//         if (typeof result === "string") {
//           try {
//             result = JSON.parse(result);
//           } catch (parseErr) {
//             log_error(
//               "[RTDS] fetchAndStart: envelope parse failed | " +
//                 parseErr.message,
//             );
//             context.session.variables.RTDS_error = "RTDS_RESULT_PARSE_ERROR";
//             return "disconnect";
//           }
//         }

//         if (!result || result.success !== true || result.statusCode !== 200) {
//           var status = result && result.statusCode;
//           log_error("[RTDS] fetchAndStart: API failure | status=" + status);
//           context.session.variables.RTDS_error =
//             "RTDS_API_ERROR_" + (status || "UNKNOWN");
//           return "disconnect";
//         }

//         var body = result.response;
//         if (typeof body === "string") {
//           try {
//             body = JSON.parse(body);
//           } catch (parseErr) {
//             log_error(
//               "[RTDS] fetchAndStart: body parse failed | " + parseErr.message,
//             );
//             context.session.variables.RTDS_error = "RTDS_PARSE_ERROR";
//             return "disconnect";
//           }
//         }

//         Logger.info("[RTDS] routing table received", {
//           sourceId: sourceId,
//           name: body && body.name,
//         });

//         var firstOp = parseFlow(body);
//         if (!firstOp) {
//           log_error("[RTDS] fetchAndStart: no entry operation");
//           context.session.variables.RTDS_error = "RTDS_NO_ENTRY_POINT";
//           return "disconnect";
//         }
//         return runStep(firstOp.id);
//       },
//       function (err) {
//         var errMsg = err && err.message ? err.message : String(err);
//         log_error("[RTDS] fetchAndStart: request rejected | " + errMsg);
//         context.session.variables.RTDS_error = "RTDS_REQUEST_ERROR";
//         return "disconnect";
//       },
//     );
// }

function fetchAndStart(sourceId) {
  if (!sourceId) {
    log_error("[RTDS] fetchAndStart: sourceId is empty");
    context.session.variables.RTDS_error = "RTDS_NO_SOURCE_ID";
    return "disconnect";
  }

  var useDevBody =
    typeof _devBody !== "undefined" && _devBody !== null && _devBody !== "";

  if (useDevBody) {
    Logger.info(
      "[RTDS] fetchAndStart: _devBody detected, skipping API request",
      { sourceId: sourceId },
    );

    var devBody = _devBody;
    if (typeof devBody === "string") {
      try {
        devBody = JSON.parse(devBody);
      } catch (parseErr) {
        log_error(
          "[RTDS] fetchAndStart: _devBody parse failed | " + parseErr.message,
        );
        context.session.variables.RTDS_error = "RTDS_DEVBODY_PARSE_ERROR";
        return "disconnect";
      }
    }

    Logger.info("[RTDS] fetchAndStart: using _devBody routing table", {
      sourceId: sourceId,
      name: devBody && devBody.name,
    });

    var devFirstOp = parseFlow(devBody);
    if (!devFirstOp) {
      log_error("[RTDS] fetchAndStart: no entry operation in _devBody");
      context.session.variables.RTDS_error = "RTDS_NO_ENTRY_POINT";
      return "disconnect";
    }

    return runStep(devFirstOp.id);
  }

  Logger.info(
    "[RTDS] fetchAndStart: no _devBody detected, using API response",
    { sourceId: sourceId },
  );

  var url =
    _rtBaseUrl +
    _rtGetSourceIdEndpoint +
    "?sourceId=" +
    encodeURIComponent(sourceId);

  Logger.info("[RTDS] fetching routing table", { sourceId: sourceId });

  return jsonHttpRequest(url, { method: "GET" }, _headers)
    .withTimeout(10000)
    .then(
      function (rawResult) {
        var result = rawResult;
        if (typeof result === "string") {
          try {
            result = JSON.parse(result);
          } catch (parseErr) {
            log_error(
              "[RTDS] fetchAndStart: envelope parse failed | " +
                parseErr.message,
            );
            context.session.variables.RTDS_error = "RTDS_RESULT_PARSE_ERROR";
            return "disconnect";
          }
        }

        if (!result || result.success !== true || result.statusCode !== 200) {
          var status = result && result.statusCode;
          log_error("[RTDS] fetchAndStart: API failure | status=" + status);
          context.session.variables.RTDS_error =
            "RTDS_API_ERROR_" + (status || "UNKNOWN");
          return "disconnect";
        }

        var body = result.response;
        if (typeof body === "string") {
          try {
            body = JSON.parse(body);
          } catch (parseErr) {
            log_error(
              "[RTDS] fetchAndStart: body parse failed | " + parseErr.message,
            );
            context.session.variables.RTDS_error = "RTDS_PARSE_ERROR";
            return "disconnect";
          }
        }

        Logger.info("[RTDS] routing table received from API", {
          sourceId: sourceId,
          name: body && body.name,
        });

        var firstOp = parseFlow(body);
        if (!firstOp) {
          log_error("[RTDS] fetchAndStart: no entry operation");
          context.session.variables.RTDS_error = "RTDS_NO_ENTRY_POINT";
          return "disconnect";
        }
        return runStep(firstOp.id);
      },
      function (err) {
        var errMsg = err && err.message ? err.message : String(err);
        log_error("[RTDS] fetchAndStart: request rejected | " + errMsg);
        context.session.variables.RTDS_error = "RTDS_REQUEST_ERROR";
        return "disconnect";
      },
    );
}

// ===========================================================================
// Condition / Emergency / Schedule / FlowJump
//   Not implemented yet. These previously shipped as mock handlers that read
//   dev-fixture globals (_devStatistics, _devEmergencyOutcomes,
//   _devScheduleStates, _devFixtures) and picked a defensible branch. The
//   mocks and their fixture-reading bodies have been removed; until each has
//   a real data source wired in, the Type stays unregistered and runStep
//   skips it to NextStep with a warning. Re-add an executeXxx here (returning
//   { nextStepId }) plus a registerRtdsOperation line below when implementing.
// ===========================================================================

// ===========================================================================
// executeSendSms(op)  /  executeSendEmail(op)
//   Async JS handlers. Each POSTs to the RTDS gateway and resolves to
//   { nextStepId } once the gateway responds, so runStep can branch on the
//   real outcome (Success / Failure). Ported from the GUI components
//   rtds/components/sendSms.js and sendMail.js -- same
//   payload shape, same branch semantics, same Timeout default (10000 ms).
//
//   Branch contract (both):
//     - inactive / invalid input   -> NextStep        (skip)
//     - gateway success === true   -> NextStep_Success
//     - any non-success or reject  -> NextStep_Failure
//
//   Endpoint globals (set by the platform-init layer / callScripts/main.js):
//     _rtBaseUrl, _rtSmsEndpoint, _rtMailEndpoint, _headers.
// ===========================================================================

/**
 * Validates that a string is a plausible mobile phone number. Strips
 * spaces/dashes/parens/dots and rewrites a leading 00 as +. Accepts E.164
 * and bare national (7-15 digits).
 *
 * @param {string} phone
 * @returns {boolean}
 */
function isMobileNumber(phone) {
  if (phone == null || phone === "") return false;
  var normalized = String(phone).replace(/[\s\-().]/g, "");
  if (normalized.indexOf("00") === 0) normalized = "+" + normalized.slice(2);
  var intl = /^\+[1-9]\d{6,14}$/;
  var national = /^[1-9]\d{6,14}$/;
  return intl.test(normalized) || national.test(normalized);
}

/**
 * Splits a ';'-separated list into a trimmed, non-empty array (never null).
 *
 * @param {string} raw
 * @returns {Array<string>}
 */
function splitSemicolonList(raw) {
  var out = [];
  if (!raw || String(raw).trim() === "") return out;
  var parts = String(raw).split(";");
  for (var i = 0; i < parts.length; i++) {
    var t = parts[i].replace(/^\s+|\s+$/g, "");
    if (t) out.push(t);
  }
  return out;
}

/**
 * Zips ';'-separated filenames and base64 payloads into a
 * [{ fileName, fileData }] array. Pairs missing either half are dropped.
 *
 * @param {string} rawNames
 * @param {string} rawData
 * @returns {Array<Object>}
 */
function buildAttachments(rawNames, rawData) {
  var out = [];
  if (!rawNames || !rawData) return out;
  var names = String(rawNames).split(";");
  var datas = String(rawData).split(";");
  var len = names.length < datas.length ? names.length : datas.length;
  for (var i = 0; i < len; i++) {
    var name = names[i].replace(/^\s+|\s+$/g, "");
    var data = datas[i].replace(/^\s+|\s+$/g, "");
    if (name && data) out.push({ fileName: name, fileData: data });
  }
  return out;
}

/**
 * Splits a ';'-separated list of file paths, keeping only those that
 * fileExists confirms. Returns [] when fileExists is unavailable.
 *
 * @param {string} raw
 * @returns {Array<string>}
 */
function resolveFilesList(raw) {
  var out = [];
  if (!raw || String(raw).trim() === "") return out;
  if (typeof fileExists !== "function") return out;
  var parts = String(raw).split(";");
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].replace(/^\s+|\s+$/g, "");
    if (!p) continue;
    try {
      if (fileExists(p)) out.push(p);
    } catch (e) {}
  }
  return out;
}

/**
 * Mirrors rtds/components/sendSms.js under the unified __rtOutcome contract.
 * Builds __rtParams via setupConfig, stages __rtOutcome ('nextStep' /
 * 'nextStep_Success' / 'nextStep_Failure'), and returns the jsonHttpRequest
 * thenable; the engine resolves _rtNextStep from __rtOutcome after it settles.
 * The pre-POST 'nextStep_Failure' pivot gives at-most-once on interruption (a
 * mid-POST hang-up finalizes the failure default, never re-firing the send).
 *
 * @param {Object} op
 * @returns {void|Promise<void>}
 */
function executeSendSms(op) {
  __rtParams = setupConfig(op.params);
  __rtOutcome = "nextStep";

  if (!activeFlag(getValue(__rtParams, "active", true))) {
    Logger.info("[RTDS] SendSMS skipped -- inactive", { outcome: __rtOutcome });
    return;
  }

  var to = getValue(__rtParams, "to", "");
  if (!to || !isMobileNumber(to)) {
    Logger.warn("[RTDS] SendSMS invalid phone number", {
      to: to,
      outcome: __rtOutcome,
    });
    return;
  }

  __rtOutcome = "nextStep_Failure";

  if (typeof _rtSmsEndpoint === "undefined" || !_rtSmsEndpoint) {
    Logger.error("[RTDS] SendSMS endpoint not configured", {
      outcome: __rtOutcome,
    });
    return;
  }
  if (typeof _headers === "undefined" || !_headers) _headers = {};

  var url = _rtBaseUrl + _rtSmsEndpoint;
  var timeout = Number(getValue(__rtParams, "timeout", 10000)) || 10000;
  var payload = {
    smsAccountId: Number(getValue(__rtParams, "smsAccountId", -1)),
    routing: getValue(__rtParams, "routing", ""),
    from: getValue(__rtParams, "from", ""),
    to: to,
    content: getValue(__rtParams, "body", ""),
    plannedTime: nowUTC(),
  };

  return jsonHttpRequest(
    url,
    { method: "POST", timeout: timeout },
    _headers,
    payload,
  ).then(
    function (result) {
      if (result && result.success === true) {
        __rtOutcome = "nextStep_Success";
        Logger.info("[RTDS] SendSMS success", { outcome: __rtOutcome });
        return;
      }
      Logger.warn("[RTDS] SendSMS gateway failure", {
        statusCode: result && result.statusCode,
        outcome: __rtOutcome,
      });
    },
    function (err) {
      Logger.error(
        "[RTDS] SendSMS request error",
        { outcome: __rtOutcome },
        err,
      );
    },
  );
}

/**
 * Mirrors rtds/components/sendMail.js under the unified __rtOutcome contract.
 * Builds __rtParams via setupConfig, stages __rtOutcome, and returns the
 * jsonHttpRequest thenable; the engine resolves _rtNextStep from __rtOutcome
 * after it settles. Pre-POST 'nextStep_Failure' pivot gives at-most-once on
 * interruption. Optional payload fields (cc/bcc/files/attachments/customerKey)
 * are included only when non-empty -- observably identical to the component's
 * "!== null" guards.
 *
 * @param {Object} op
 * @returns {void|Promise<void>}
 */
function executeSendEmail(op) {
  __rtParams = setupConfig(op.params);
  __rtOutcome = "nextStep";

  if (!activeFlag(getValue(__rtParams, "active", true))) {
    Logger.info("[RTDS] SendEmail skipped -- inactive", {
      outcome: __rtOutcome,
    });
    return;
  }

  var from = String(getValue(__rtParams, "from", "")).replace(/^\s+|\s+$/g, "");
  var to = splitSemicolonList(getValue(__rtParams, "to", ""));
  if (!from || to.length === 0) {
    Logger.warn("[RTDS] SendEmail missing From or To", {
      from: from,
      toCount: to.length,
      outcome: __rtOutcome,
    });
    return;
  }

  __rtOutcome = "nextStep_Failure";

  if (typeof _rtMailEndpoint === "undefined" || !_rtMailEndpoint) {
    Logger.error("[RTDS] SendEmail endpoint not configured", {
      outcome: __rtOutcome,
    });
    return;
  }
  if (typeof _headers === "undefined" || !_headers) _headers = {};

  var priority = Number(getValue(__rtParams, "priority", 2));
  if (priority !== 1 && priority !== 2 && priority !== 3) priority = 2;

  var payload = {
    from: from,
    subject: getValue(__rtParams, "subject", ""),
    to: to,
    body: getValue(__rtParams, "body", ""),
    priority: priority,
  };

  var cc = splitSemicolonList(getValue(__rtParams, "cc", ""));
  if (cc.length) payload.cc = cc;
  var bcc = splitSemicolonList(getValue(__rtParams, "bcc", ""));
  if (bcc.length) payload.bcc = bcc;
  var files = resolveFilesList(getValue(__rtParams, "files", ""));
  if (files.length) payload.files = files;
  var attachments = buildAttachments(
    getValue(__rtParams, "attachmentNames", ""),
    getValue(__rtParams, "attachmentData", ""),
  );
  if (attachments.length) payload.attachments = attachments;
  var customerKey = String(getValue(__rtParams, "customerKey", "")).replace(
    /^\s+|\s+$/g,
    "",
  );
  if (customerKey) payload.customerKey = customerKey;

  var url = _rtBaseUrl + _rtMailEndpoint;
  var timeout = Number(getValue(__rtParams, "timeout", 10000)) || 10000;

  return jsonHttpRequest(
    url,
    { method: "POST", timeout: timeout },
    _headers,
    payload,
  ).then(
    function (result) {
      if (result && result.success === true) {
        __rtOutcome = "nextStep_Success";
        Logger.info("[RTDS] SendEmail success", { outcome: __rtOutcome });
        return;
      }
      Logger.warn("[RTDS] SendEmail gateway failure", {
        statusCode: result && result.statusCode,
        outcome: __rtOutcome,
      });
    },
    function (err) {
      Logger.error(
        "[RTDS] SendEmail request error",
        { outcome: __rtOutcome },
        err,
      );
    },
  );
}

// ===========================================================================
// REGISTRATION -- wires every catalogue Type into RTDS_REGISTRY.
//
// Only real handlers are registered. A Type with no real handler yet is left
// unregistered; runStep skips it to its NextStep with a warning (see the
// "unimplemented operation type" branch in runStep). To add one:
//   1. Implement executeXxx above (returns { nextStepId }).
//   2. Add a registerRtdsOperation('Type', executeXxx) line below.
// The runtime loop is untouched in either case.
// ===========================================================================

// --- JS twins (inline handlers, unified __rtOutcome contract) ---
// setVariables / setAttributes / sendSms / sendMail dispatch as inline JS twins:
// each stages __rtParams + __rtOutcome and the engine resolves _rtNextStep (see
// runStep's JS branch). The registry is last-write-wins, so registering these as
// JS (and NOT as GUI exits) makes the JS path win. Their canvas components
// (rtds/components/) remain the lockstep reference but are no longer reached on
// the live path for these Types. setAttributes shares executeSetVariables.
registerRtdsOperation("setVariables", executeSetVariables);
registerRtdsOperation("setAttributes", executeSetVariables);
registerRtdsOperation("sendSms", executeSendSms);
registerRtdsOperation("sendMail", executeSendEmail);

// --- GUI-exit Types -- handled by Vocalls components on the canvas ---
registerRtdsExit("workgroupTransfer", "workgroup_transfer");
registerRtdsExit("externalTransfer", "external_transfer");
registerRtdsExit("menu", "menu");
registerRtdsExit("getLanguage", "language_menu");
registerRtdsExit("say", "play_prompt");
registerRtdsExit("play", "play_audio");
registerRtdsExit("disconnect", "disconnect");
registerRtdsExit("guard", "guard_routing");
registerRtdsExit("guardTui", "guard_tui");
registerRtdsExit("callback", "callback");

Logger.info("[RTDS] registry initialised", {
  types: RTDS_REGISTRY.size,
  js: (function () {
    var n = 0;
    RTDS_REGISTRY.forEach(function (e) {
      if (e.kind === "js") n++;
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
