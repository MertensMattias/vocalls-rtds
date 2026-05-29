/**
 * Extract routing configuration from varObj.config.
 * Configuration comes from lineMap (BASE_TEMPLATE.config merged with line-specific overrides).
 *
 * @param {Object} varObj - Call variables object
 * @returns {Object} Routing configuration (supportedLanguages, fallbackLanguage, customerTypes, etc.)
 */
function getRoutingConfig(varObj) {
  if (!varObj || typeof varObj !== "object" || !varObj.config) {
    return {};
  }
  return varObj.config.routing || {};
}

/**
 * Extract session configuration from varObj.config.
 * Configuration comes from lineMap (BASE_TEMPLATE.config merged with line-specific overrides).
 *
 * @param {Object} varObj - Call variables object
 * @returns {Object} Session configuration (persistentKeys, etc.)
 */
function getSessionConfig(varObj) {
  if (!varObj || typeof varObj !== "object" || !varObj.config) {
    return {};
  }
  return varObj.config.session || {};
}

/**
 * Extract debug configuration from varObj.config.
 * Configuration comes from lineMap (BASE_TEMPLATE.config merged with line-specific overrides).
 *
 * @param {Object} varObj - Call variables object
 * @returns {Object} Debug configuration (devNumbers, etc.)
 */
function getDebugConfig(varObj) {
  if (!varObj || typeof varObj !== "object" || !varObj.config) {
    return {};
  }
  return varObj.config.debug || {};
}

/**
 * Convenience wrapper returning the current timestamp in ISO‑8601 UTC format.
 *
 * @returns {string} Current date/time in UTC.
 */
function nowUTC() {
  return new Date().toISOString();
}

/**
 * Returns a global variable if it exists; otherwise the provided default.
 *
 * @param {string}   varName      – Name of the global variable.
 * @param {*}        defaultValue – Fallback value.
 * @param {boolean=} useFalsy     – When `true`, empty string / 0 / false are
 *                                  considered *unset* and the default is used.
 * @returns {*} The resolved value.
 */
function getOrDefault(varName, defaultValue, useFalsy = false) {
  var value =
    typeof globalThis[varName] !== "undefined"
      ? globalThis[varName]
      : undefined;
  return useFalsy
    ? value || defaultValue
    : typeof value === "undefined"
      ? defaultValue
      : value;
}

/**
 * Checks if the input is a valid, non‑empty object *or* array.
 * Returns `true` for:
 *   • objects with ≥ 1 own key
 *   • arrays  with ≥ 1 element
 *
 * @param {*} input – Any JS value to validate.
 * @returns {boolean} `true` when `input` is a non‑empty object/array.
 */
function isValidObject(input) {
  try {
    var isValid =
      input !== null &&
      typeof input === "object" &&
      ((Array.isArray(input) && input.length > 0) ||
        (!Array.isArray(input) && Object.keys(input).length > 0));
    return isValid;
  } catch (e) {
    Logger.debug("isValidObject: exception thrown", { error: e.message });
    return false;
  }
}

/**
 * Returns the value of `key` from `obj`, or `defaultValue` if the key is
 * absent. Case-insensitive lookup: matches whichever own property name
 * lowercases to the same string as `key`. Mirrors the PureConnect
 * `GetAt(values, Find(names, key, 0))` idiom with a default fallback.
 *
 * @param {Object} obj          – Source object.
 * @param {string} key          – Property name to look up (case-insensitive).
 * @param {*}      defaultValue – Value to return when the key is absent.
 * @returns {*}                   Resolved value or `defaultValue`.
 */
function getValue(obj, key, defaultValue) {
  if (!obj || !key) return defaultValue;
  var lowerKey = String(key).toLowerCase();
  for (var propertyName in obj) {
    if (
      obj.hasOwnProperty(propertyName) &&
      String(propertyName).toLowerCase() === lowerKey
    ) {
      return obj[propertyName];
    }
  }
  return defaultValue;
}

/**
 * Like `getValue`, but also treats `""`, `null`, `0`, and `false` as "missing"
 * and falls back to `defaultValue`. Same case-insensitive matching rule.
 *
 * @param {Object} obj          – Source object.
 * @param {string} key          – Property name to look up (case-insensitive).
 * @param {*}      defaultValue – Value to return when the key is absent or falsy.
 * @returns {*}                   Resolved truthy value or `defaultValue`.
 */
function getValueOrFalsy(obj, key, defaultValue) {
  var v = getValue(obj, key);
  return v || defaultValue;
}

/**
 * Case-insensitive existence check. Returns `true` when any own property of
 * `obj` lowercases to the same string as `key`.
 *
 * @param {Object} obj – Source object.
 * @param {string} key – Property name to test (case-insensitive).
 * @returns {boolean}    `true` when the key exists.
 */
function hasKey(obj, key) {
  if (!obj || !key) return false;
  var lowerKey = String(key).toLowerCase();
  for (var propertyName in obj) {
    if (
      obj.hasOwnProperty(propertyName) &&
      String(propertyName).toLowerCase() === lowerKey
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Returns the first own-property key in `obj` for which
 * `predicate(key, value)` is truthy, or `null` if none match.
 *
 * @param {Object}   obj       – Source object.
 * @param {Function} predicate – `function (key, value) -> boolean`.
 * @returns {?string}            Matching key or `null`.
 */
function findKey(obj, predicate) {
  if (!obj) return null;
  for (var key in obj) {
    if (obj.hasOwnProperty(key) && predicate(key, obj[key])) return key;
  }
  return null;
}

/**
 * Iterates own properties of `obj`, calling `fn(key, value)` for each.
 * Returning `false` from `fn` stops the walk. Preserves original key casing
 * (this is a write-side helper; the operator's chosen casing is the contract).
 *
 * @param {Object}   obj – Source object.
 * @param {Function} fn  – `function (key, value) -> any`. Return `false` to stop.
 * @returns {void}
 */
function walk(obj, fn) {
  if (!obj) return;
  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    if (fn(key, obj[key]) === false) return;
  }
}

/**
 * Copies own properties of `src` into `dst` for keys `dst` does not already
 * have. Preserves original casing (write-side helper). Returns `dst`.
 *
 * @param {Object} dst – Destination object (mutated).
 * @param {Object} src – Source object.
 * @returns {Object}     `dst`.
 */
function applyDefaults(dst, src) {
  if (!dst || !src) return dst;
  for (var key in src) {
    if (src.hasOwnProperty(key) && !dst.hasOwnProperty(key)) {
      dst[key] = src[key];
    }
  }
  return dst;
}

/**
 * Retrieves a nested property using dot notation without throwing on invalid
 * paths.  Similar to `getPath` but implemented inline for performance.
 *
 * @param {?Object} obj  – Source object.
 * @param {string}  path – Dot notation path (e.g. `a.b.c`).
 * @returns {*}  Resolved value or `undefined`.
 */
function getNestedValue(obj, path) {
  if (typeof path !== "string") return undefined;
  return path
    .split(".")
    .reduce(
      (acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined),
      obj,
    );
}

// ============================================================================
// varObj schema
// ============================================================================

function constVarObj() {
  return {
    // ============================================================================
    // CORE CONTEXT
    // ============================================================================

    environment: getOrDefault("environment", "acc", true),
    routingId: "TEST_TEST_PROJECT",
    callIdKey: getOrDefault("callIdKey", context.callInfo.callGuid, true),
    interactionStartTime: getOrDefault(
      "interactionStartTime",
      new Date().toISOString(),
      true,
    ),
    customerName: "TEST",
    customerProject: "TEST_PROJECT",

    language: context.language.substring(0, 2).toUpperCase(),

    // ============================================================================
    // CALL DATA
    // ============================================================================
    ani: getOrDefault("ani", null, true), // caller number
    dnis: getOrDefault("dnis", null, true), // dialed number
    debugCall: false, // derived from devNumbers or debug flag

    // ============================================================================
    // DEBUG CONFIG
    // ============================================================================
    debugConfig: {
      devNumbers: [], // array of phone numbers triggering debugCall
    },

    // ============================================================================
    // LOGGING FLAGS
    // ============================================================================
    logVarActive: true,

    // ============================================================================
    // FLOW CONTROL
    // ============================================================================
    redirect: false, // used for session restore / redirect logic

    // ============================================================================
    // SESSION METADATA
    // ============================================================================
    _storedTimestamp: 0, // used for session restore comparison
  };
}

// ============================================================================
// LOGGER
// ============================================================================
Logger = {
  config: {
    enabled: true,
    activeLevel: "DEBUG", // DEBUG, INFO, WARN, ERROR
    timeout: 10000,
    maxBodySize: 10000,
    apiBaseUrl: "https://api.n-allo.be",
    apiPath: "/api/EventLog",
    defaultEnvironment: "prd",
    logAllApiCalls: true,
    buildApiUrl: function (env) {
      return (
        this.apiBaseUrl +
        "/ivrapi-" +
        (env || this.defaultEnvironment) +
        this.apiPath
      );
    },
  },

  resolvedPromise: function (value) {
    return {
      then: function (success) {
        return success(value);
      },
    };
  },

  shouldLog: function (severity) {
    var levels = ["DEBUG", "INFO", "WARN", "ERROR"];
    var activeIndex = levels.indexOf(this.config.activeLevel);
    var requestIndex = levels.indexOf(severity);
    if (activeIndex === -1) {
      activeIndex = 1;
    }
    return requestIndex >= activeIndex;
  },

  // FIX: parseInt absorbs string status codes; numeric range check is unambiguous
  isSuccessStatus: function (status) {
    var numericStatus = parseInt(status, 10);
    if (isNaN(numericStatus)) return false;
    return numericStatus >= 200 && numericStatus < 300;
  },

  sanitizeForLog: function (obj, maxSize) {
    maxSize = maxSize || this.config.maxBodySize;
    if (obj === null) return "null";
    if (typeof obj === "undefined") return "undefined";
    try {
      var replacer = function (key, value) {
        if (typeof value === "function") {
          return "[Function: " + (value.name || "anonymous") + "]";
        }
        return value;
      };
      var json = JSON.stringify(obj, replacer);
      if (!json || json === "null") return "{}";
      var truncMarker = "... (truncated)";
      var truncMarkerLen = truncMarker.length;
      if (maxSize <= truncMarkerLen) {
        return "{}";
      }
      var maxContentSize = maxSize - truncMarkerLen;
      if (json.length > maxSize) {
        return json.substring(0, maxContentSize) + truncMarker;
      }
      return json;
    } catch (e) {
      return "[Unserializable: " + e.message + "]";
    }
  },

  extractStack: function (err) {
    if (!err || !err.stack) return null;
    try {
      var lines = err.stack.split("\n").slice(0, 10);
      var trace = lines.join("\n");
      if (trace.length > 3000) {
        return trace.substring(0, 3000) + "...";
      }
      return trace;
    } catch (e) {
      return null;
    }
  },

  getTimestamp: function () {
    return new Date().toISOString();
  },

  // FIX: coerce callIdKey/routingId to string before posting
  getCallIdKey: function () {
    var vo = typeof varObj !== "undefined" ? varObj : null;
    if (vo && vo.callIdKey) return String(vo.callIdKey);
    if (vo && vo.CallIdKey) return String(vo.CallIdKey);
    if (typeof callIdKey !== "undefined" && callIdKey) return String(callIdKey);
    if (typeof _callIdKey !== "undefined" && _callIdKey)
      return String(_callIdKey);
    return null;
  },

  getRoutingId: function () {
    var vo = typeof varObj !== "undefined" ? varObj : null;
    if (vo && vo.routingId) return String(vo.routingId);
    if (vo && vo.RoutingId) return String(vo.RoutingId);
    if (typeof routingId !== "undefined" && routingId) return String(routingId);
    if (typeof _routingId !== "undefined" && _routingId)
      return String(_routingId);
    return null;
  },

  categorizeError: function (error, context) {
    var category = {
      type: "UNKNOWN",
      source: "APPLICATION",
      severity: "ERROR",
    };
    if (context && context.errorCategory) {
      category.type = context.errorCategory;
    }
    if (context && context.errorSource) {
      category.source = context.errorSource;
    }
    var status = context && context.status;
    if (status && typeof status === "number") {
      var statusMap = {
        408: { type: "TIMEOUT", source: "NETWORK" },
        504: { type: "TIMEOUT", source: "NETWORK" },
        503: { type: "SERVICE_UNAVAILABLE", source: "API" },
        429: { type: "RATE_LIMIT", source: "API" },
        404: { type: "NOT_FOUND", source: "REQUEST" },
        401: { type: "AUTH_ERROR", source: "REQUEST" },
        403: { type: "AUTH_ERROR", source: "REQUEST" },
      };
      if (!context || !context.errorCategory) {
        if (statusMap[status]) {
          category.type = statusMap[status].type;
          category.source = statusMap[status].source;
        } else if (status >= 500) {
          category.type = "SERVER_ERROR";
          category.source = "API";
        } else if (status >= 400) {
          category.type = "CLIENT_ERROR";
          category.source = "REQUEST";
        }
      }
    }
    if (
      error &&
      (!status || typeof status !== "number") &&
      (!context || !context.errorCategory)
    ) {
      var errorName = error.name || "";
      var errorMsg = (error.message || "").toLowerCase();
      if (
        errorName === "TypeError" ||
        errorName === "ReferenceError" ||
        errorName === "SyntaxError"
      ) {
        category.type =
          errorName === "SyntaxError" ? "PARSING_ERROR" : "CODE_ERROR";
        category.source = "APPLICATION";
        category.severity = "CRITICAL";
      } else if (
        errorName === "TimeoutError" ||
        errorMsg.indexOf("timeout") !== -1
      ) {
        category.type = "TIMEOUT";
        category.source = "NETWORK";
      } else if (
        errorMsg.indexOf("network") !== -1 ||
        errorMsg.indexOf("connection") !== -1
      ) {
        category.type = "NETWORK_ERROR";
        category.source = "NETWORK";
      }
    }
    return category;
  },

  /**
   * @param {Object} params
   * @param {string} params.eventType - LOGGED | API_ERROR | API_CALL
   * @param {string} params.severity  - DEBUG | INFO | WARN | ERROR
   * @param {string} params.message
   * @param {Object} params.context
   * @param {Error|Object} [params.error]
   * @returns {Object} EventDetail
   */
  buildEventDetail: function (params) {
    var eventType = params.eventType;
    var severity = params.severity;
    var message = params.message;
    if (message === null || typeof message === "undefined") {
      message = "";
    } else {
      message = String(message);
    }
    var context = params.context || {};
    var error = params.error;
    var err = null;
    var stack = null;
    if (error) {
      if (error instanceof Error) {
        err = error;
      } else if (typeof error === "object" && error.message) {
        err = error;
      } else {
        err = new Error(String(error));
      }
    }
    if (severity === "ERROR" && err) {
      stack = this.extractStack(err);
    }
    var extras = {};
    if (error) {
      var errorCategory = this.categorizeError(error, context);
      extras.errorType = errorCategory.type;
      extras.errorSource = errorCategory.source;
      extras.errorSeverity = errorCategory.severity;
      if (error.message) extras.errorMessage = error.message;
      if (error.name) extras.errorName = error.name;
    }
    if (context && typeof context === "object") {
      for (var key in context) {
        if (
          Object.prototype.hasOwnProperty.call(context, key) &&
          key !== "endpoint" &&
          key !== "method" &&
          key !== "status" &&
          key !== "duration"
        ) {
          extras[key] = context[key];
        }
      }
    }
    return {
      eventType: eventType || null,
      severity: severity || null,
      message: message,
      stackTrace: stack,
      segment:
        (typeof segmentState !== "undefined" &&
          segmentState &&
          segmentState.currentSegment) ||
        null,
      segmentResult:
        (typeof segmentState !== "undefined" &&
          segmentState &&
          segmentState.segmentResult) ||
        null,
      endpoint: context.endpoint || null,
      method: context.method || null,
      statusCode: typeof context.status === "number" ? context.status : null,
      // FIX: round to int32 as required by API schema
      duration:
        typeof context.duration === "number"
          ? Math.round(context.duration)
          : null,
      extrasJSON: this.sanitizeForLog(extras),
      eventTimestamp: this.getTimestamp(),
      createdBy: "",
    };
  },

  postEventToAPI: function (eventObj) {
    if (!this.config.enabled) {
      return this.resolvedPromise({ success: true, skipped: true });
    }
    var vo = typeof varObj !== "undefined" ? varObj : null;
    var env =
      (vo && vo.environment) ||
      (typeof environment !== "undefined" && environment) ||
      this.config.defaultEnvironment;
    var apiUrl = this.config.buildApiUrl(env);
    var requestBody = {
      callIdKey: this.getCallIdKey(),
      routingId: this.getRoutingId(),
      events: [eventObj],
    };
    var self = this;
    return jsonHttpRequest(apiUrl, { method: "POST" }, _headers, requestBody)
      .withTimeout(this.config.timeout)
      .then(
        function (result) {
          return { success: true, response: result };
        },
        function (error) {
          log_debug(
            "[Logger] postEventToAPI error | " + self.sanitizeForLog(error),
          );
          return { success: false, error: error };
        },
      );
  },

  /**
   * Debug logging - local only
   * @param {string} message
   * @param {Object} [context]
   */
  debug: function (message, context) {
    context = context || {};
    if (!this.shouldLog("DEBUG")) return;
    var msg = "[Logger:DEBUG] " + message;
    if (
      context &&
      typeof context === "object" &&
      Object.keys(context).length > 0
    ) {
      msg += " | Context: " + this.sanitizeForLog(context, 300);
    }
    log_debug(msg);
  },

  /**
   * Info logging - local only
   * @param {string} message
   * @param {Object} [context]
   */
  info: function (message, context) {
    context = context || {};
    if (!this.shouldLog("INFO")) return;
    var msg = "[Logger:INFO] " + message;
    if (
      context &&
      typeof context === "object" &&
      Object.keys(context).length > 0
    ) {
      msg += " | Context: " + this.sanitizeForLog(context, 300);
    }
    log_debug(msg);
  },

  /**
   * Warning logging - local + API
   * @param {string} message
   * @param {Object} [context]
   */
  warn: function (message, context) {
    context = context || {};
    if (!this.shouldLog("WARN")) return;
    var msg = "[Logger:WARN] " + message;
    if (
      context &&
      typeof context === "object" &&
      Object.keys(context).length > 0
    ) {
      msg += " | Context: " + this.sanitizeForLog(context, 300);
    }
    log_debug(msg);
    this.postEventToAPI(
      this.buildEventDetail({
        eventType: "LOGGED",
        severity: "WARN",
        message: message,
        context: context,
      }),
    );
  },

  /**
   * Error logging - local + API with full error details
   * @param {string} message
   * @param {Object} [context]
   * @param {Error|Object} [errorObj]
   */
  error: function (message, context, errorObj) {
    context = context || {};
    if (!this.shouldLog("ERROR")) return;
    var msg = "[Logger:ERROR] " + message;
    if (errorObj && errorObj.message) {
      msg += " | Error: " + errorObj.message;
    }
    if (
      context &&
      typeof context === "object" &&
      Object.keys(context).length > 0
    ) {
      msg += " | Context: " + this.sanitizeForLog(context, 300);
    }
    if (errorObj && errorObj.stack) {
      var stack = this.extractStack(errorObj);
      if (stack) {
        msg += " | Stack: " + stack;
      }
    }
    log_error(msg);
    this.postEventToAPI(
      this.buildEventDetail({
        eventType: "LOGGED",
        severity: "ERROR",
        message: message,
        context: context,
        error: errorObj,
      }),
    );
  },

  /**
   * API call logging - determines error vs success from status code
   * @param {string} message
   * @param {Object} context - endpoint, status, duration, etc.
   * @param {Error|Object} [errorObj]
   */
  API: function (message, context, errorObj) {
    context = context || {};
    var status = typeof context.status === "number" ? context.status : null;
    // FIX: only treat as error if errorObj is set or status is present and not 2xx
    // (null status + no errorObj = success, not an error)
    var isError =
      !!errorObj || (status !== null && !this.isSuccessStatus(status));
    var msg = "[Logger:API" + (isError ? "_ERROR" : "") + "] " + message;
    msg += " | Status: " + (status !== null ? status : "N/A");
    if (context.endpoint) {
      msg += " | Endpoint: " + context.endpoint;
    }
    if (context.duration) {
      msg += " | Duration: " + context.duration + "ms";
    }
    if (errorObj && errorObj.message) {
      msg += " | Error: " + errorObj.message;
    }
    log_debug(msg);
    if (isError) {
      this.postEventToAPI(
        this.buildEventDetail({
          eventType: "API_ERROR",
          severity: "ERROR",
          message: message,
          context: context,
          error: errorObj,
        }),
      );
    } else if (this.config.logAllApiCalls) {
      this.postEventToAPI(
        this.buildEventDetail({
          eventType: "API_CALL",
          severity: "INFO",
          message: message,
          context: context,
          error: null,
        }),
      );
    }
  },

  /**
   * Configure logger at runtime with validation
   * @param {Object} config
   * @example Logger.configure({ activeLevel: "WARN" });
   */
  configure: function (config) {
    if (!config || typeof config !== "object") return;
    var validLevels = ["DEBUG", "INFO", "WARN", "ERROR"];
    var stringKeys = ["apiBaseUrl", "apiPath", "defaultEnvironment"];
    for (var key in config) {
      if (
        Object.prototype.hasOwnProperty.call(config, key) &&
        Object.prototype.hasOwnProperty.call(this.config, key)
      ) {
        var value = config[key];
        var isValid = true;
        if (key === "activeLevel") {
          if (validLevels.indexOf(value) === -1) {
            log_debug(
              "[Logger] Invalid activeLevel: " + value + ", defaulting to INFO",
            );
            value = "INFO";
          }
        } else if (key === "timeout" || key === "maxBodySize") {
          if (typeof value !== "number" || value <= 0) {
            log_debug(
              "[Logger] Invalid number for " +
                key +
                ": " +
                value +
                ", keeping current: " +
                this.config[key],
            );
            isValid = false;
          }
        } else if (key === "enabled" || key === "logAllApiCalls") {
          if (typeof value !== "boolean") {
            log_debug(
              "[Logger] Invalid boolean for " +
                key +
                ": " +
                value +
                ", keeping current: " +
                this.config[key],
            );
            isValid = false;
          }
        } else if (stringKeys.indexOf(key) !== -1) {
          if (typeof value !== "string") {
            log_debug(
              "[Logger] Invalid string for " +
                key +
                ": " +
                value +
                ", keeping current: " +
                this.config[key],
            );
            isValid = false;
          }
        }
        if (isValid) {
          this.config[key] = value;
        }
      }
    }
    if (this.config.activeLevel === "DEBUG") {
      log_debug(
        "[Logger] Configuration updated: " + this.sanitizeForLog(config),
      );
    }
  },
};

// ============================================================================
// INITIALIZE CALL FLOW CONTEXT
// ============================================================================

function initializeCallFlowContext(mode) {
  mode = mode || "";

  Logger.info(
    "initializeCallFlowContext: Starting initialization (mode: " + mode + ")",
  );

  var isNewer = function (a, b) {
    var aVal = a !== undefined && a !== null ? a : 0;
    var bVal = b !== undefined && b !== null ? b : 0;
    return aVal > bVal;
  };

  var syncEssentialGlobals = function () {
    environment = varObj.environment;
    routingId = varObj.routingId;
    customerName = varObj.customerName;
    customerProject = varObj.customerProject;

    if (varObj.ani !== undefined) ani = varObj.ani;
    if (varObj.dnis !== undefined) dnis = varObj.dnis;
    if (varObj.debugCall !== undefined) debugCall = varObj.debugCall;

    Logger.info(
      "initializeCallFlowContext: Globals synced - " +
        customerName +
        "/" +
        customerProject,
    );
  };

  var applyDefaults = function () {
    varObj.redirect = false;

    if (varObj.logVarActive === undefined) varObj.logVarActive = true;
    if (varObj.logSegmentActive === undefined) varObj.logSegmentActive = true;
    if (varObj.logCdbActive === undefined) varObj.logCdbActive = true;
    if (varObj.speechHistoryActive === undefined)
      varObj.speechHistoryActive = true;
    if (varObj.speechLoggingActive === undefined)
      varObj.speechLoggingActive = true;
    if (varObj.useLLMIntentDetection === undefined)
      varObj.useLLMIntentDetection = false;
  };

  var parseSip = function (uri) {
    if (typeof uri !== "string") return "unknown";

    var match = uri.match(/^sip:([^@;]+)/);
    return match ? match[1] : "unknown";
  };

  var sessionVarObj = getNestedValue(context, "session.variables.varObj");

  var localVarObjTs = getNestedValue(varObj, "_storedTimestamp") || 0;
  var sessionVarObjTs = getNestedValue(sessionVarObj, "_storedTimestamp") || 0;

  var sessionHasVarObj = isNewer(sessionVarObjTs, localVarObjTs);

  Logger.debug(
    "initializeCallFlowContext: Session check - varObj: " + sessionHasVarObj,
  );

  // ============================================================================
  // SESSION RESTORE
  // ============================================================================
  if (sessionHasVarObj) {
    Logger.info("initializeCallFlowContext: Session Restore");

    varObj = sessionVarObj;

    applyDefaults();
    syncEssentialGlobals();

    Logger.info("initializeCallFlowContext: Complete (session restore path)");
    return;
  }

  // ============================================================================
  // NEW CALL
  // ============================================================================
  Logger.info("initializeCallFlowContext: New Call");

  if (typeof constVarObj !== "function") {
    Logger.error(
      "initializeCallFlowContext: Critical dependency constVarObj missing",
      {},
      null,
    );
    throw new Error(
      "initializeCallFlowContext: Critical dependency constVarObj missing",
    );
  }

  varObj = constVarObj();

  applyDefaults();

  var callInfo = getNestedValue(context, "callInfo") || {};
  var fromUri = callInfo.fromUri || "";
  var toUri = callInfo.toUri || "";

  ani = parseSip(fromUri);
  dnis = parseSip(toUri);

  var direction = callInfo.direction || "";

  if (direction === "outbound") {
    var tmpAni = ani;
    ani = dnis;
    dnis = tmpAni;
  }

  var debugConfig = getDebugConfig(varObj) || {};
  var devNumbers = debugConfig.devNumbers || [];

  if (debug) {
    debugCall = true;
  } else {
    debugCall = devNumbers.indexOf(ani) !== -1;
  }

  varObj.ani = ani;
  varObj.dnis = dnis;
  varObj.debugCall = debugCall;

  Logger.info(
    "initializeCallFlowContext: ANI/DNIS extracted - ANI: " +
      ani +
      ", DNIS: " +
      dnis +
      ", debugCall: " +
      debugCall,
  );

  syncEssentialGlobals();

  Logger.info("initializeCallFlowContext: Complete (fresh creation path)");
}

// ============================================================================
// STORE SESSION VARIABLES - MINIMAL VERSION
// ============================================================================
function storeSessionVariables() {
  var timestamp = Date.now();

  if (!context.session.variables) {
    context.session.variables = {};
  }

  varObj._storedTimestamp = timestamp;
  varObj.redirect = true;

  context.session.variables.varObj = varObj;

  Logger.info(
    "storeSessionVariables: stored varObj to session (ts: " + timestamp + ")",
  );
}

// ===========================================================================
// RTDS RUNTIME — DISPATCH TABLES AND HANDLERS
// ===========================================================================

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
// getRtdsGlobalScope()
//    Returns the active global scope object. In real Vocalls this is the
//    IVR's operational variable scope; in Node VM sandbox it's globalThis.
//    Returns null if neither is reachable, in which case callers fall back
//    to (new Function(...))-based assignment.
// ---------------------------------------------------------------------------

function getRtdsGlobalScope() {
    if (typeof global !== 'undefined') {
        return global;
    }
    if (typeof globalThis !== 'undefined') {
        return globalThis;
    }
    return null;
}


// ---------------------------------------------------------------------------
// buildOpIndex(operations)
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
// parseFlow(json)
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
// getFirstOperation(operations)
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
// getParam(op, name, fallback)
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
    if (typeof value === 'number') { return value; }
    if (typeof value === 'boolean') { return value; }
    if (value === '' || value === null || value === undefined) { return fallback; }
    return value;
}


// ---------------------------------------------------------------------------
// setGlobal(name, value)
//     Writes a resolved param value to the operational scope.
//     Uses getRtdsGlobalScope() when reachable; falls back to a Function-based
//     assignment so the runtime works inside Node VM sandboxes that don't
//     expose `global`. Type is whatever JSON.parse produced — no coercion.
// ---------------------------------------------------------------------------

function setGlobal(name, value) {
    if (value === null || value === undefined) { return; }
    var scope = getRtdsGlobalScope();
    if (scope) {
        scope[name] = value;
        return;
    }
    (new Function('v', name + ' = v'))(value);
}


// ---------------------------------------------------------------------------
// resolveTokens(value)
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


// ---------------------------------------------------------------------------
// resolveNextStep(op, resultKey)
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
// executeSetAttributes(op)
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
                        var scope = getRtdsGlobalScope();
                        attrVal = scope ? scope[attrName] : undefined;
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
// prepareGuiHandoff(op)
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
// runStep(startOpId)
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
// resumeFrom(nextStepId)
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
