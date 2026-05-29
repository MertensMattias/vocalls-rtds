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
 *   _rtBaseUrl, _rtGetSourceIdEndpoint
 *
 * ES5.1 — no let/const, no arrow functions. Template literals allowed.
 */

// ===========================================================================
// Unified operation registry (plug-and-play dispatch)
// ===========================================================================
//
// Every operation Type in the catalogue is registered here, either as:
//   - 'js'  kind: a JS handler that runs inline and returns { nextStepId }.
//           Only real implementations are registered — there are no mock
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

RTDS_REGISTRY = new Map();
RTDS_OPERATIONS = new Map();
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
 * Registers a GUI-exit Type. The runtime mirrors op.params to
 * RTDS_OP_<Key> session variables, sets RTDS_currentOpId/Type, and returns
 * exitKey to Vocalls so the call routes to the matching component.
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
 *                   and diagnostics. Read-only — mutation does not propagate.
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
    if (!op || !op.id) {
      log_error(
        "[RTDS] buildOpIndex: operation at index " + i + " has no id — skipped",
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
//   attributes resolve through getScoped (varObj → global); an RTDS_* token
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
  var fallback = getParam(op, "NextStep", null);
  if (fallback) {
    return String(fallback);
  }
  return null;
}

// ===========================================================================
// executeSetAttributes(op)
//   JS-handled operation. Writes each Param onto varObj (the call-scoped
//   store — see conventions/storage.md). Handles LogAttributes as a debug
//   side-effect (not stored), reading values through the getScoped contract.
//   NextStep controls flow only and is never stored. Returns { nextStepId }.
// ===========================================================================

/**
 * @param {Object} op
 * @returns {{ nextStepId: ?string }}
 */
function executeSetAttributes(op) {
  var params = op.params;
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
          var attrVal = getScoped(attrName, "");
          parts.push(attrName + "=" + attrVal);
        }
      }
      Logger.debug("[RTDS] LogAttributes", { attributes: parts.join(" | ") });
      continue;
    }

    var value = resolveTokens(getParam(op, key, null));
    if (value !== null && value !== undefined) {
      varObj[key] = value;
    }
  }

  var nextStepId = resolveNextStep(op, null);
  Logger.debug("[RTDS] SetAttributes done", {
    opName: op.name,
    nextStep: nextStepId ? nextStepId : "(none)",
  });
  return { nextStepId: nextStepId };
}

// ===========================================================================
// prepareGuiHandoff(op)
//   Sets the dispatcher handoff state on context.session.variables:
//   RTDS_currentOpId / RTDS_currentOpType, and pre-populates RTDS_nextStepId
//   with the default NextStep (the component overwrites it with its chosen
//   branching outcome before re-entry).
//
//   The runtime does NOT mirror op.params into session variables. Each GUI
//   component is the source of truth for its own config (Style A components
//   parse their __configJSON via __setupConfig). See the GUI DISPATCH PLAYBOOK
//   in callScripts/main.js §6.
// ===========================================================================

/**
 * @param {Object} op
 * @returns {void}
 */
function prepareGuiHandoff(op) {
  var vars = context.session.variables;

  vars.RTDS_currentOpId = op.id;
  vars.RTDS_currentOpType = op.type;

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

  // Guards the synchronous dispatch loop against cyclic NextStep chains
  // (e.g. an unimplemented step whose NextStep points back at itself or forms
  // a loop among unregistered/registered steps). Without this a cycle spins
  // forever and hangs the call leg with no disconnect.
  var visited = {};

  while (currentId) {
    if (visited[currentId]) {
      log_error("[RTDS] runStep: cycle detected at step " + currentId);
      context.session.variables.RTDS_error = "RTDS_CYCLE_DETECTED";
      return "disconnect";
    }
    visited[currentId] = true;

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

    // Unregistered type — no real handler exists for this Type yet. Rather
    // than fail the leg, skip to the op's NextStep with a warning so the
    // flow keeps moving. When the type's handler is later implemented and
    // registered, this branch stops being taken.
    if (!entry) {
      var skipTo = resolveNextStep(current, null);
      Logger.warn("[RTDS] unimplemented operation type — skipping", {
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

    // JS-handled operation.
    if (entry.kind === "js") {
      var result;
      try {
        result = entry.handler(current);
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

      // Async handler — returns a thenable resolving to { nextStepId }.
      // Chain off it and resume the loop from the resolved step. The whole
      // call to runStep then resolves to a promise of the exit key, exactly
      // like fetchAndStart does. Synchronous handlers fall through unchanged.
      if (result && typeof result.then === "function") {
        return result.then(
          function (resolved) {
            var asyncNext = resolved && resolved.nextStepId;
            if (!asyncNext) {
              Logger.info("[RTDS] end of flow", { lastStep: current.id });
              return "disconnect";
            }
            return runStep(String(asyncNext));
          },
          function (err) {
            log_error(
              "[RTDS] ERROR in async " +
                type +
                " step " +
                current.id +
                ": " +
                (err && err.message),
            );
            context.session.variables.RTDS_error = err && err.message;
            return "disconnect";
          },
        );
      }

      var nextStepId = result && result.nextStepId;
      if (!nextStepId) {
        Logger.info("[RTDS] end of flow", { lastStep: current.id });
        return "disconnect";
      }
      currentId = String(nextStepId);
      continue;
    }

    // GUI-exit operation.
    if (entry.kind === "gui") {
      prepareGuiHandoff(current);
      Logger.info("[RTDS] GUI handoff", {
        step: current.id,
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
//   call. Endpoint shape: _rtBaseUrl + _rtGetSourceIdEndpoint + sourceId.
//   Both globals must be set by the platform-init layer before this runs.
// ===========================================================================

/**
 * @param {string} sourceId
 * @returns {Promise<string>|string} Exit key (or a promise resolving to one).
 */
function fetchAndStart(sourceId) {
  if (!sourceId) {
    log_error("[RTDS] fetchAndStart: sourceId is empty");
    context.session.variables.RTDS_error = "RTDS_NO_SOURCE_ID";
    return "disconnect";
  }
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

        Logger.info("[RTDS] routing table received", {
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
//   rtds_vocalls_operations/components/sendSms.js and sendMail.js — same
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
 * @param {Object} op
 * @returns {{ nextStepId: ?string }|Promise<{ nextStepId: ?string }>}
 */
function executeSendSms(op) {
  var skipNext = resolveNextStep(op, null);

  if (!getParam(op, "Active", false)) {
    Logger.info("[RTDS] SendSMS skipped — inactive", { nextStep: skipNext });
    return { nextStepId: skipNext };
  }

  var to = String(resolveTokens(getParam(op, "To", "")));
  if (!to || !isMobileNumber(to)) {
    Logger.warn("[RTDS] SendSMS invalid phone number", {
      to: to,
      nextStep: skipNext,
    });
    return { nextStepId: skipNext };
  }

  var failureNext = resolveNextStep(op, "NextStep_Failure") || skipNext;
  var successNext = resolveNextStep(op, "NextStep_Success") || skipNext;

  if (typeof _rtSmsEndpoint === "undefined" || !_rtSmsEndpoint) {
    Logger.error("[RTDS] SendSMS endpoint not configured", {
      nextStep: failureNext,
    });
    return { nextStepId: failureNext };
  }

  var url = _rtBaseUrl + _rtSmsEndpoint;
  var timeout = Number(getParam(op, "Timeout", 10000)) || 10000;
  var payload = {
    smsAccountId: Number(getParam(op, "SmsAccountId", -1)),
    routing: resolveTokens(getParam(op, "Routing", "")),
    from: resolveTokens(getParam(op, "From", "")),
    to: to,
    content: resolveTokens(getParam(op, "Body", "")),
    plannedTime: nowUTC(),
  };

  if (typeof _headers === "undefined" || !_headers) _headers = {};

  return jsonHttpRequest(
    url,
    { method: "POST", timeout: timeout },
    _headers,
    payload,
  ).then(
      function (result) {
        if (result && result.success === true) {
          Logger.info("[RTDS] SendSMS success", { nextStep: successNext });
          return { nextStepId: successNext };
        }
        Logger.warn("[RTDS] SendSMS gateway failure", {
          statusCode: result && result.statusCode,
          nextStep: failureNext,
        });
        return { nextStepId: failureNext };
      },
      function (err) {
        Logger.error(
          "[RTDS] SendSMS request error",
          { nextStep: failureNext },
          err,
        );
        return { nextStepId: failureNext };
      },
    );
}

/**
 * @param {Object} op
 * @returns {{ nextStepId: ?string }|Promise<{ nextStepId: ?string }>}
 */
function executeSendEmail(op) {
  var skipNext = resolveNextStep(op, null);

  if (!getParam(op, "Active", false)) {
    Logger.info("[RTDS] SendEmail skipped — inactive", { nextStep: skipNext });
    return { nextStepId: skipNext };
  }

  var from = String(resolveTokens(getParam(op, "From", ""))).replace(
    /^\s+|\s+$/g,
    "",
  );
  var to = splitSemicolonList(resolveTokens(getParam(op, "To", "")));
  if (!from || to.length === 0) {
    Logger.warn("[RTDS] SendEmail missing From or To", {
      from: from,
      toCount: to.length,
      nextStep: skipNext,
    });
    return { nextStepId: skipNext };
  }

  var failureNext = resolveNextStep(op, "NextStep_Failure") || skipNext;
  var successNext = resolveNextStep(op, "NextStep_Success") || skipNext;

  if (typeof _rtMailEndpoint === "undefined" || !_rtMailEndpoint) {
    Logger.error("[RTDS] SendEmail endpoint not configured", {
      nextStep: failureNext,
    });
    return { nextStepId: failureNext };
  }

  var priority = Number(getParam(op, "Priority", 2));
  if (priority !== 1 && priority !== 2 && priority !== 3) priority = 2;

  var payload = {
    from: from,
    subject: resolveTokens(getParam(op, "Subject", "")),
    to: to,
    body: resolveTokens(getParam(op, "Body", "")),
    priority: priority,
  };

  var cc = splitSemicolonList(resolveTokens(getParam(op, "Cc", "")));
  if (cc.length) payload.cc = cc;
  var bcc = splitSemicolonList(resolveTokens(getParam(op, "Bcc", "")));
  if (bcc.length) payload.bcc = bcc;
  var files = resolveFilesList(resolveTokens(getParam(op, "Files", "")));
  if (files.length) payload.files = files;
  var attachments = buildAttachments(
    getParam(op, "AttachmentNames", ""),
    getParam(op, "AttachmentData", ""),
  );
  if (attachments.length) payload.attachments = attachments;
  var customerKey = String(
    resolveTokens(getParam(op, "CustomerKey", "")),
  ).replace(/^\s+|\s+$/g, "");
  if (customerKey) payload.customerKey = customerKey;

  var url = _rtBaseUrl + _rtMailEndpoint;
  var timeout = Number(getParam(op, "Timeout", 10000)) || 10000;

  if (typeof _headers === "undefined" || !_headers) _headers = {};

  return jsonHttpRequest(
    url,
    { method: "POST", timeout: timeout },
    _headers,
    payload,
  ).then(
      function (result) {
        if (result && result.success === true) {
          Logger.info("[RTDS] SendEmail success", { nextStep: successNext });
          return { nextStepId: successNext };
        }
        Logger.warn("[RTDS] SendEmail gateway failure", {
          statusCode: result && result.statusCode,
          nextStep: failureNext,
        });
        return { nextStepId: failureNext };
      },
      function (err) {
        Logger.error(
          "[RTDS] SendEmail request error",
          { nextStep: failureNext },
          err,
        );
        return { nextStepId: failureNext };
      },
    );
}

// ===========================================================================
// REGISTRATION — wires every catalogue Type into RTDS_REGISTRY.
//
// Only real handlers are registered. A Type with no real handler yet is left
// unregistered; runStep skips it to its NextStep with a warning (see the
// "unimplemented operation type" branch in runStep). To add one:
//   1. Implement executeXxx above (returns { nextStepId }).
//   2. Add a registerRtdsOperation('Type', executeXxx) line below.
// The runtime loop is untouched in either case.
// ===========================================================================

// --- Real JS handlers ---
// SetAttributes writes operator attributes onto varObj. SendSMS / SendEmail
// run inline as async JS handlers (POST to the RTDS gateway, branch on the
// response) — same payload + branch contract as the canvas components in
// rtds_vocalls_operations/components/. Condition / Emergency / Schedule /
// FlowJump are NOT registered yet: they need real data sources wired in and
// will be added back with correct implementations.
registerRtdsOperation("SetAttributes", executeSetAttributes);
registerRtdsOperation("SendSMS", executeSendSms);
registerRtdsOperation("SendEmail", executeSendEmail);

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
