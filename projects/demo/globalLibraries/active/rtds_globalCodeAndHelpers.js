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

  _sendEventsToAPI: function (events, retryAttempt) {
    retryAttempt = retryAttempt || 0;
    var vo = typeof varObj !== "undefined" ? varObj : null;
    var env =
      (vo && vo.environment) ||
      (typeof environment !== "undefined" && environment) ||
      this.config.defaultEnvironment;
    var apiUrl = this.config.buildApiUrl(env);
    var requestBody = {
      callIdKey: this.getCallIdKey(),
      routingId: this.getRoutingId(),
      events: events,
    };
    var self = this;
    log_debug(
      "[Logger] _sendEventsToAPI request | url: " +
        apiUrl +
        " | body: " +
        self.sanitizeForLog(requestBody),
    );
    return jsonHttpRequest(apiUrl, { method: "POST" }, _headers, requestBody)
      .withTimeout(this.config.timeout)
      .then(
        function (result) {
          log_debug(
            "[Logger] _sendEventsToAPI response | " +
              self.sanitizeForLog(result),
          );
          return {
            success: true,
            error: null,
            retriesExceeded: false,
            retryAttempt: retryAttempt,
            response: result,
          };
        },
        function (error) {
          log_debug(
            "[Logger] _sendEventsToAPI error | " + self.sanitizeForLog(error),
          );
          if (retryAttempt < self.config.flushRetryCount) {
            return self._sendEventsToAPI(events, retryAttempt + 1);
          }
          return {
            success: false,
            error: error,
            retriesExceeded: true,
            retryAttempt: retryAttempt,
          };
        },
      );
  },

  postEventToAPI: function (eventObj) {
    if (!this.config.enabled) {
      return this.resolvedPromise({ success: true, skipped: true });
    }
    var hasContext =
      typeof context !== "undefined" &&
      context.session &&
      context.session.variables;
    var effectiveBufferEnabled = this.config.bufferEnabled && hasContext;
    if (!effectiveBufferEnabled) {
      return this._sendEventsToAPI([eventObj], 0);
    }
    var severity = eventObj.severity || "";
    var isError = severity === "ERROR";
    if (isError && this.config.bufferFlushOnError) {
      this.addToBuffer(eventObj);
      return this.flushBuffer();
    }
    this.addToBuffer(eventObj);
    return this.resolvedPromise({
      success: true,
      buffered: true,
      bufferSize: this.getBufferSize(),
    });
  },

  getBuffer: function () {
    if (
      typeof context !== "undefined" &&
      context.session &&
      context.session.variables
    ) {
      if (!context.session.variables._loggerBuffer) {
        context.session.variables._loggerBuffer = [];
      }
      return context.session.variables._loggerBuffer;
    }
    return null;
  },

  clearBuffer: function () {
    if (
      typeof context !== "undefined" &&
      context.session &&
      context.session.variables
    ) {
      context.session.variables._loggerBuffer = [];
    }
  },

  getBufferSize: function () {
    var buffer = this.getBuffer();
    return buffer ? buffer.length : 0;
  },

  addToBuffer: function (eventObj) {
    if (!this.config.bufferEnabled) {
      return false;
    }
    var buffer = this.getBuffer();
    if (!buffer || !Array.isArray(buffer)) {
      return false;
    }
    buffer.push(eventObj);
    if (buffer.length >= this.config.bufferMaxSize) {
      this.flushBuffer();
    }
    return true;
  },

  flushBuffer: function () {
    var buffer = this.getBuffer();
    if (!buffer || buffer.length === 0) {
      return this.resolvedPromise({
        success: true,
        skipped: true,
        message: "Buffer empty",
      });
    }
    if (!this.config.enabled) {
      this.clearBuffer();
      return this.resolvedPromise({
        success: true,
        skipped: true,
        message: "Logger disabled",
      });
    }
    var eventsToSend = [];
    for (var i = 0; i < buffer.length; i++) {
      eventsToSend.push(buffer[i]);
    }
    this.clearBuffer();
    if (this.config.activeLevel === "DEBUG") {
      this.debug("Logger: Flushing buffer", {
        bufferSize: eventsToSend.length,
      });
    }
    var self = this;
    return this._sendEventsToAPI(eventsToSend, 0).then(function (result) {
      if (
        !result.success &&
        result.retriesExceeded &&
        self.config.activeLevel === "DEBUG"
      ) {
        self.debug("Logger: Buffer flush failed after all retries", {
          eventsCount: eventsToSend.length,
          retryAttempt: result.retryAttempt,
        });
      }
      return result;
    });
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
        } else if (key === "bufferMaxSize" || key === "flushRetryCount") {
          if (typeof value !== "number" || value < 0) {
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
        } else if (
          key === "enabled" ||
          key === "logAllApiCalls" ||
          key === "bufferEnabled" ||
          key === "bufferFlushOnError" ||
          key === "bufferFlushOnCallEnd"
        ) {
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

  if (cdbLog) {
    resolveCdbDicId(cdbLog);
  }

  varObj._storedTimestamp = timestamp;
  varObj.redirect = true;

  context.session.variables.varObj = varObj;

  Logger.info(
    "storeSessionVariables: stored varObj to session (ts: " + timestamp + ")",
  );
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
