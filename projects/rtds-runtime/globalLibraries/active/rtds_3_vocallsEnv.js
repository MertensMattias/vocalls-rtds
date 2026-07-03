/**

// ============================================================================
// OBJECT-ACCESS HELPERS
// ============================================================================

/**
 * @returns {string} Current date/time in ISO-8601 UTC.
 */
function nowUTC() {
  return new Date().toISOString();
}

/**
 * Returns a global variable if it exists; otherwise the provided default.
 *
 * @param {string}   varName      - Name of the global variable.
 * @param {*}        defaultValue - Fallback value.
 * @param {boolean=} useFalsy     - When true, empty string / 0 / false are
 *                                  considered unset and the default is used.
 * @returns {*}
 */
function getOrDefault(varName, defaultValue, useFalsy) {
  if (useFalsy === undefined) {
    useFalsy = false;
  }
  var value =
    typeof globalThis[varName] !== "undefined"
      ? globalThis[varName]
      : undefined;
  if (useFalsy) {
    return value || defaultValue;
  }
  return typeof value === "undefined" ? defaultValue : value;
}

/**
 * Checks if the input is a non-empty object or array.
 *
 * @param {*} input
 * @returns {boolean}
 */
function isValidObject(input) {
  try {
    return (
      input !== null &&
      typeof input === "object" &&
      ((Array.isArray(input) && input.length > 0) ||
        (!Array.isArray(input) && Object.keys(input).length > 0))
    );
  } catch (e) {
    return false;
  }
}

/**
 * Returns the value of `key` from `obj`, or `defaultValue` if absent.
 * Case-insensitive lookup. Mirrors PureConnect GetAt(values, Find(names, key, 0))
 * with a default fallback.
 *
 * @param {Object} obj
 * @param {string} key
 * @param {*}      defaultValue
 * @returns {*}
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
 * Like getValue, but also treats "" / null / 0 / false as missing.
 *
 * @param {Object} obj
 * @param {string} key
 * @param {*}      defaultValue
 * @returns {*}
 */
function getValueOrFalsy(obj, key, defaultValue) {
  var v = getValue(obj, key);
  return v || defaultValue;
}

/**
 * Coerces an Active param value to a boolean activation decision, across every
 * encoding the dictionary emits: a real boolean passes through; number 1 / 0 ->
 * true / false; string "1" / "true" -> true and "0" / "false" / "" -> false
 * (case-insensitive); an array form [value, ...flags] is unwrapped to its first
 * element first. Anything else (including an unresolved "${toggle}" placeholder)
 * is inactive -- a config error fails closed (skip) rather than running an op
 * with broken config. See conventions/params.md.
 *
 * This is the single Active-coercion contract. The JS twins (executeSetVariables
 * / executeSendSms / executeSendEmail) call it directly, and the GUI components
 * call it through the component-local __activeFlag alias (which just delegates
 * here), so Active truthiness can never diverge between the two paths.
 *
 * @param {*} value - The resolved Active value (boolean, string, number, array).
 * @returns {boolean}
 */
function activeFlag(value) {
  if (Object.prototype.toString.call(value) === "[object Array]") {
    value = value.length ? value[0] : false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  var s = String(value).trim().toLowerCase();
  return s === "1" || s === "true";
}

/**
 * Case-insensitive existence check.
 *
 * @param {Object} obj
 * @param {string} key
 * @returns {boolean}
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
 * Returns the first own-property key for which predicate(key, value) is
 * truthy, or null if none match.
 *
 * @param {Object}   obj
 * @param {Function} predicate - function (key, value) -> boolean
 * @returns {?string}
 */
function findKey(obj, predicate) {
  if (!obj) return null;
  for (var key in obj) {
    if (obj.hasOwnProperty(key) && predicate(key, obj[key])) return key;
  }
  return null;
}

/**
 * Iterates own properties of obj, calling fn(key, value) for each. Return
 * false from fn to stop the walk. Preserves original key casing.
 *
 * @param {Object}   obj
 * @param {Function} fn - function (key, value) -> any. Return false to stop.
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
 * Copies own properties of src into dst for keys dst does not already have.
 * Preserves original casing. Returns dst.
 *
 * @param {Object} dst
 * @param {Object} src
 * @returns {Object}
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
 * paths.
 *
 * @param {?Object} obj
 * @param {string}  path - Dot notation path (e.g. "a.b.c").
 * @returns {*} Resolved value or undefined.
 */
function getNestedValue(obj, path) {
  if (typeof path !== "string") return undefined;
  var parts = path.split(".");
  var acc = obj;
  for (var i = 0; i < parts.length; i++) {
    if (acc && acc[parts[i]] !== undefined) {
      acc = acc[parts[i]];
    } else {
      return undefined;
    }
  }
  return acc;
}

/**
 * Reads operator-set call-scoped data with the RTDS scope contract:
 * prefers varObj[key] (case-insensitive), falls back to exact-case
 * global[key], then returns defaultValue. This is the single read path for
 * attributes that SetAttributes / components write -- see conventions/storage.md.
 *
 * @param {string} key
 * @param {*}      defaultValue
 * @returns {*}
 */
function getScoped(key, defaultValue) {
  if (defaultValue === undefined) {
    defaultValue = null;
  }
  if (!key) {
    return defaultValue;
  }
  var vo = typeof varObj !== "undefined" ? varObj : null;
  if (vo && hasKey(vo, key)) {
    return getValue(vo, key, defaultValue);
  }
  var scope = null;
  if (typeof global !== "undefined") {
    scope = global;
  } else if (typeof globalThis !== "undefined") {
    scope = globalThis;
  }
  if (scope && scope[key] !== undefined && scope[key] !== null) {
    return scope[key];
  }
  return defaultValue;
}

/**
 * Substitutes ${name} and dot-path ${a.b.c} placeholders in a string using the
 * RTDS scope contract: the FIRST segment resolves via getScoped (varObj first,
 * then global); any remaining segments are walked as plain nested properties
 * (getNestedValue semantics -- a stored falsy leaf still substitutes). Bare or
 * dot-notation identifiers only -- each segment must be identifier-shaped; no
 * expressions. A placeholder that resolves nowhere is left raw and a warn is
 * logged (silent "" substitution hides config typos). This is the single
 * token-resolution path shared by every component's __setupConfig and by the
 * runtime twins, so init-time token resolution can never diverge between a GUI
 * component and its JS handler. Uses String.replace, NOT new Function -- the
 * Vocalls runtime disables string-eval.
 *
 * @param {string} raw    - The raw value possibly containing ${name} tokens.
 * @param {string} keyName - The Param key, for the unresolved-placeholder log.
 * @returns {string} The string with resolved placeholders; unresolved ones kept raw.
 */
function resolveConfigTokens(raw, keyName) {
  if (typeof raw !== "string" || raw.indexOf("${") === -1) {
    return raw;
  }
  // Sentinel no real stored value can equal, so getScoped's "absent" branch is
  // distinguishable from a legitimately stored null / empty / falsy value.
  var MISSING = " __rtUnresolved ";
  return raw.replace(
    /\$\{([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\}/g,
    function (match, path) {
      var parts = path.split(".");
      // First segment resolves via the scope contract (varObj-first, then global).
      var sub = getScoped(parts[0], MISSING);
      if (sub !== MISSING) {
        // Walk remaining segments as nested properties. A missing segment is
        // unresolved (left raw + warn); a stored falsy leaf still substitutes --
        // the !== undefined guard distinguishes the two.
        for (var i = 1; i < parts.length; i++) {
          if (
            sub !== null &&
            sub !== undefined &&
            sub[parts[i]] !== undefined
          ) {
            sub = sub[parts[i]];
          } else {
            sub = MISSING;
            break;
          }
        }
      }
      if (sub !== MISSING) {
        return String(sub);
      }
      Logger.warn("[resolveConfigTokens] unresolved placeholder", {
        key: keyName,
        placeholder: path,
      });
      return match;
    },
  );
}

/**
 * Normalises an operation's raw config into a flat Params object. Accepts the
 * three shapes a component instance can bind into __configJSON:
 *   - a JSON string  -> parsed first;
 *   - an envelope { params: {...} } -> the params sub-object;
 *   - an already-flat Params object -> itself;
 *   - null / undefined -> {}.
 * Never returns null. This is the single Params-extraction path shared by every
 * GUI component (previously the component-local __extractParams) so the shape
 * normalisation can never diverge between components.
 *
 * @param {string|Object} config - Raw operation config.
 * @returns {Object} Flat Params object, never null.
 */
function extractParams(config) {
  var parsed = typeof config === "string" ? JSON.parse(config) : config;
  if (parsed && typeof parsed.params === "object" && parsed.params !== null) {
    return parsed.params;
  }
  return parsed || {};
}

/**
 * Resolves a raw operation config into a flat { Key: value } map ready for a
 * component's work body. The value's TYPE is preserved as authored -- no Number
 * coercion ('4' stays a string, 4 stays a number). Per key:
 *   - array-form [value, ...flags] is unwrapped to its first element (matches
 *     getParam; the GUI flags isDisplayed/isEditable are runtime-irrelevant);
 *   - the `active` key is coerced to a real boolean via activeFlag;
 *   - every other STRING value is trimmed and has ${name} / ${a.b} placeholders
 *     resolved via resolveConfigTokens (varObj-first scope contract; String.replace,
 *     never new Function -- the Vocalls runtime disables string-eval);
 *   - non-strings pass through with their type intact.
 * `active` absent is NOT defaulted here -- the read site decides (SetVariables
 * defaults true, Send/guard default false). This is the single config-resolution
 * path shared by every GUI component (previously the component-local __setupConfig),
 * so init-time resolution can never diverge between a component and its JS twin.
 *
 * @param {string|Object} config - Raw operation config (see extractParams).
 * @returns {Object} Map of Key -> resolved value (no __rt prefix; v2 shape).
 */
function setupConfig(config) {
  var params = extractParams(config);
  var result = {};
  var keys = Object.keys(params);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = params[key];
    if (Array.isArray(value)) {
      value = value.length ? value[0] : "";
    }
    if (key === "active") {
      result.active = activeFlag(value);
      continue;
    }
    if (typeof value === "string") {
      value = resolveConfigTokens(value.replace(/^\s+|\s+$/g, ""), key);
    }
    result[key] = value;
  }
  return result;
}

/**
 * Resolves the explicit root named by the first segment of a dot-path, when
 * that segment is one the operator can name as a root:
 *   "varObj"               -> varObj
 *   "globalThis" / "global" -> the global scope object
 *   any other name that already exists in scope as an object -> that object
 * Returns null when the first segment is NOT a recognised root keyword and is
 * NOT an already-reachable object. In that case setVariable falls back to
 * treating the whole path as nested under varObj (e.g. "auth.verified" ->
 * varObj.auth.verified) -- see specs/setVariables.spec.md Target resolution.
 * The runtime never auto-creates a brand-new root global (that would mint
 * undeclared globals and bypass the _rt* discipline, see conventions/storage.md).
 *
 * @param {string} name - The first dot-path segment.
 * @returns {?Object} The resolved root object, or null when not a named root.
 */
function resolveRoot(name) {
  var scope = null;
  if (typeof global !== "undefined") {
    scope = global;
  } else if (typeof globalThis !== "undefined") {
    scope = globalThis;
  }
  if (name === "varObj") {
    return typeof varObj !== "undefined" ? varObj : null;
  }
  if (name === "globalThis" || name === "global") {
    return scope;
  }
  if (scope && scope[name] && typeof scope[name] === "object") {
    return scope[name];
  }
  return null;
}

/**
 * Write-side counterpart to getScoped. Writes value at a dot-separated path.
 * A bare key (no dot) targets varObj -- the default call-scoped store. With a
 * dot, the first segment is used as the root only when it names a recognised
 * root (varObj | globalThis | global | an already-reachable object); otherwise
 * the whole path is nested under varObj ("auth.verified" -> varObj.auth.verified).
 * Only an explicit "globalThis"/"global" naming a non-object scope is skipped
 * with a warning. Missing intermediate objects are auto-created (lodash-set
 * semantics). Path segments keep the operator's exact casing -- no normalisation.
 * See specs/setVariables.spec.md and conventions/storage.md.
 *
 * @param {string} path  - Bare key or dot-separated target path.
 * @param {*}      value - The value to write (native type preserved).
 * @returns {void}
 */
function setVariable(path, value) {
  var segments = String(path).split(".");

  var root, startIndex;
  if (segments.length === 1) {
    root = typeof varObj !== "undefined" ? varObj : null;
    startIndex = 0;
  } else {
    root = resolveRoot(segments[0]);
    if (root) {
      startIndex = 1;
    } else {
      // First segment is not a recognised root -- treat the whole path as
      // nested under varObj (the default call-scoped store).
      root = typeof varObj !== "undefined" ? varObj : null;
      startIndex = 0;
    }
  }

  if (!root || typeof root !== "object") {
    Logger.warn("[setVariable] unknown or non-object root -- skipped", {
      path: path,
      root: segments[0],
    });
    return;
  }

  var node = root;
  for (var i = startIndex; i < segments.length - 1; i++) {
    var seg = segments[i];
    if (node[seg] === null || typeof node[seg] !== "object") {
      node[seg] = {};
    }
    node = node[seg];
  }
  node[segments[segments.length - 1]] = value;
}

// ============================================================================
// varObj-SHAPE READERS
// ============================================================================

/**
 * @param {Object} vo - The varObj for the current call.
 * @returns {Object} Routing config (supportedLanguages, fallbackLanguage, ...).
 */
function getRoutingConfig(vo) {
  if (!vo || typeof vo !== "object" || !vo.config) return {};
  return vo.config.routing || {};
}

/**
 * @param {Object} vo
 * @returns {Object} Session config (persistentKeys, ...).
 */
function getSessionConfig(vo) {
  if (!vo || typeof vo !== "object" || !vo.config) return {};
  return vo.config.session || {};
}

/**
 * @param {Object} vo
 * @returns {Object} Debug config (devNumbers, ...).
 */
function getDebugConfig(vo) {
  if (!vo || typeof vo !== "object" || !vo.config) return {};
  return vo.config.debug || {};
}

// ============================================================================
// LOGGER
// ============================================================================

/**
 * Structured logger for the Vocalls JS environment.
 * Levels (ascending): DEBUG < INFO < WARN < ERROR.
 * WARN and ERROR events are also POSTed to the EventLog API.
 * DEBUG and INFO are local-only (log_debug sink).
 * Configure via Logger.configure({ activeLevel: 'WARN' }).
 */
Logger = {
  config: {
    enabled: true,
    activeLevel: "DEBUG",
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

  /** @param {string} severity 'DEBUG'|'INFO'|'WARN'|'ERROR' @returns {boolean} */
  shouldLog: function (severity) {
    var levels = ["DEBUG", "INFO", "WARN", "ERROR"];
    var activeIndex = levels.indexOf(this.config.activeLevel);
    var requestIndex = levels.indexOf(severity);
    if (activeIndex === -1) {
      activeIndex = 1;
    }
    return requestIndex >= activeIndex;
  },

  isSuccessStatus: function (status) {
    var numericStatus = parseInt(status, 10);
    if (isNaN(numericStatus)) return false;
    return numericStatus >= 200 && numericStatus < 300;
  },

  /** @param {*} obj @param {number} [maxSize] @returns {string} */
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
      if (maxSize <= truncMarkerLen) return "{}";
      var maxContentSize = maxSize - truncMarkerLen;
      if (json.length > maxSize)
        return json.substring(0, maxContentSize) + truncMarker;
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
      if (trace.length > 3000) return trace.substring(0, 3000) + "...";
      return trace;
    } catch (e) {
      return null;
    }
  },

  getTimestamp: function () {
    return new Date().toISOString();
  },

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

  categorizeError: function (error, ctx) {
    var category = {
      type: "UNKNOWN",
      source: "APPLICATION",
      severity: "ERROR",
    };
    if (ctx && ctx.errorCategory) category.type = ctx.errorCategory;
    if (ctx && ctx.errorSource) category.source = ctx.errorSource;
    var status = ctx && ctx.status;
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
      if (!ctx || !ctx.errorCategory) {
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
      (!ctx || !ctx.errorCategory)
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

  buildEventDetail: function (params) {
    var eventType = params.eventType;
    var severity = params.severity;
    var message = params.message;
    if (message === null || typeof message === "undefined") {
      message = "";
    } else {
      message = String(message);
    }
    var ctx = params.context || {};
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
      var errorCategory = this.categorizeError(error, ctx);
      extras.errorType = errorCategory.type;
      extras.errorSource = errorCategory.source;
      extras.errorSeverity = errorCategory.severity;
      if (error.message) extras.errorMessage = error.message;
      if (error.name) extras.errorName = error.name;
    }
    if (ctx && typeof ctx === "object") {
      for (var key in ctx) {
        if (
          Object.prototype.hasOwnProperty.call(ctx, key) &&
          key !== "endpoint" &&
          key !== "method" &&
          key !== "status" &&
          key !== "duration"
        ) {
          extras[key] = ctx[key];
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
      endpoint: ctx.endpoint || null,
      method: ctx.method || null,
      statusCode: typeof ctx.status === "number" ? ctx.status : null,
      duration:
        typeof ctx.duration === "number" ? Math.round(ctx.duration) : null,
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
    if (typeof _headers === "undefined" || !_headers) _headers = {};
    return jsonHttpRequest(
      apiUrl,
      { method: "POST", timeout: this.config.timeout },
      _headers,
      requestBody,
    ).then(
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
   * Debug logging -- local trace only.
   * @param {string} message
   * @param {Object} [ctx]
   */
  debug: function (message, ctx) {
    ctx = ctx || {};
    if (!this.shouldLog("DEBUG")) return;
    var msg = "[Logger:DEBUG] " + message;
    if (ctx && typeof ctx === "object" && Object.keys(ctx).length > 0) {
      msg += " | Context: " + this.sanitizeForLog(ctx, 300);
    }
    log_debug(msg);
  },

  /**
   * Info logging -- local trace; production-visible.
   * @param {string} message
   * @param {Object} [ctx]
   */
  info: function (message, ctx) {
    ctx = ctx || {};
    if (!this.shouldLog("INFO")) return;
    var msg = "[Logger:INFO] " + message;
    if (ctx && typeof ctx === "object" && Object.keys(ctx).length > 0) {
      msg += " | Context: " + this.sanitizeForLog(ctx, 300);
    }
    log_debug(msg);
  },

  /**
   * Warning logging -- local + posted to EventLog API.
   * @param {string} message
   * @param {Object} [ctx]
   */
  warn: function (message, ctx) {
    ctx = ctx || {};
    if (!this.shouldLog("WARN")) return;
    var msg = "[Logger:WARN] " + message;
    if (ctx && typeof ctx === "object" && Object.keys(ctx).length > 0) {
      msg += " | Context: " + this.sanitizeForLog(ctx, 300);
    }
    log_debug(msg);
    return this.postEventToAPI(
      this.buildEventDetail({
        eventType: "LOGGED",
        severity: "WARN",
        message: message,
        context: ctx,
      }),
    );
  },

  /**
   * Error logging -- local + posted to EventLog API. Pass the caught error
   * as errorObj so Logger captures the stack.
   * @param {string} message
   * @param {Object} [ctx]
   * @param {Error|Object} [errorObj]
   */
  error: function (message, ctx, errorObj) {
    ctx = ctx || {};
    if (!this.shouldLog("ERROR")) return;
    var msg = "[Logger:ERROR] " + message;
    if (errorObj && errorObj.message) msg += " | Error: " + errorObj.message;
    if (ctx && typeof ctx === "object" && Object.keys(ctx).length > 0) {
      msg += " | Context: " + this.sanitizeForLog(ctx, 300);
    }
    if (errorObj && errorObj.stack) {
      var stack = this.extractStack(errorObj);
      if (stack) msg += " | Stack: " + stack;
    }
    log_error(msg);
    return this.postEventToAPI(
      this.buildEventDetail({
        eventType: "LOGGED",
        severity: "ERROR",
        message: message,
        context: ctx,
        error: errorObj,
      }),
    );
  },

  /**
   * API-call logging -- derives error vs success from status code.
   * @param {string} message
   * @param {Object} ctx - endpoint, status, duration, etc.
   * @param {Error|Object} [errorObj]
   */
  API: function (message, ctx, errorObj) {
    ctx = ctx || {};
    var status = typeof ctx.status === "number" ? ctx.status : null;
    var isError =
      !!errorObj || (status !== null && !this.isSuccessStatus(status));
    var msg = "[Logger:API" + (isError ? "_ERROR" : "") + "] " + message;
    msg += " | Status: " + (status !== null ? status : "N/A");
    if (ctx.endpoint) msg += " | Endpoint: " + ctx.endpoint;
    if (ctx.duration) msg += " | Duration: " + ctx.duration + "ms";
    if (errorObj && errorObj.message) msg += " | Error: " + errorObj.message;
    log_debug(msg);
    if (isError) {
      return this.postEventToAPI(
        this.buildEventDetail({
          eventType: "API_ERROR",
          severity: "ERROR",
          message: message,
          context: ctx,
          error: errorObj,
        }),
      );
    } else if (this.config.logAllApiCalls) {
      return this.postEventToAPI(
        this.buildEventDetail({
          eventType: "API_CALL",
          severity: "INFO",
          message: message,
          context: ctx,
          error: null,
        }),
      );
    }
  },

  /**
   * Runtime reconfiguration with validation.
   * Example: Logger.configure({ activeLevel: 'WARN' });
   * @param {Object} config
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
        if (isValid) this.config[key] = value;
      }
    }
    if (this.config.activeLevel === "DEBUG") {
      log_debug(
        "[Logger] Configuration updated: " + this.sanitizeForLog(config),
      );
    }
  },

  /**
   * Diagnostic dump of the env-layer config: the call-scoped varObj, the
   * Logger's own config, the DEFAULT_LOGGED_KEYS list, and the three
   * varObj.config.* sub-trees (routing / session / debug). Output goes
   * through Logger.debug, so it only prints when activeLevel is DEBUG --
   * call Logger.configure({ activeLevel: 'DEBUG' }) first if needed.
   *
   * Call from a Script node AFTER initializeCallFlowContext has run, or
   * varObj is still the pre-init value. RTDS dispatch state is dumped
   * separately by dumpRtdsState (rtds_2_runtime.js).
   *
   * @returns {void}
   */
  dumpConfig: function () {
    if (!this.shouldLog("DEBUG")) return;
    var vo = typeof varObj !== "undefined" ? varObj : null;
    this.debug("[config] varObj | " + this.sanitizeForLog(vo, 10000));
    this.debug(
      "[config] Logger.config | " + this.sanitizeForLog(this.config, 10000),
    );
    var keys =
      typeof DEFAULT_LOGGED_KEYS !== "undefined" ? DEFAULT_LOGGED_KEYS : null;
    this.debug(
      "[config] DEFAULT_LOGGED_KEYS | " + this.sanitizeForLog(keys, 2000),
    );
    this.debug(
      "[config] routing | " + this.sanitizeForLog(getRoutingConfig(vo), 4000),
    );
    this.debug(
      "[config] session | " + this.sanitizeForLog(getSessionConfig(vo), 4000),
    );
    this.debug(
      "[config] debug | " + this.sanitizeForLog(getDebugConfig(vo), 4000),
    );
  },
};

// ============================================================================
// CALL-FLOW LIFECYCLE
// ============================================================================

/**
 * initializeCallFlowContext -- Vocalls flow init Script node.
 * Builds varObj from constVarObj() (see rtds_1_globalConfig.js) and syncs
 * essential globals. Handles the session-restore path when an earlier leg
 * already stashed a varObj on context.session.variables.varObj.
 *
 * @param {string} [mode] - 'full' for a fresh init; '' to honour session restore.
 * @returns {void}
 */
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

  var applyVarObjDefaults = function () {
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

  // ---- Session restore ----
  if (sessionHasVarObj) {
    Logger.info("initializeCallFlowContext: Session Restore");
    varObj = sessionVarObj;
    applyVarObjDefaults();
    syncEssentialGlobals();
    Logger.info("initializeCallFlowContext: Complete (session restore path)");
    return;
  }

  // ---- New call ----
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
  applyVarObjDefaults();

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

  var dbgConfig = getDebugConfig(varObj) || {};
  var devNumbers = dbgConfig.devNumbers || [];

  if (typeof debug !== "undefined" && debug) {
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

/**
 * Stashes the current varObj into context.session.variables.varObj so the
 * next leg's initializeCallFlowContext picks it up via the session-restore
 * path. Sets _storedTimestamp + redirect flag.
 *
 * @returns {void}
 */
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

// ============================================================================
// END-OF-CALL FINALISERS
//   onCallEnd is the modular finaliser slot the platform termination callback
//   (onCallResult) runs after the finalize data tail. Add a finaliser by
//   pushing one finalize(...) line into onCallEnd -- no edit to the callback.
//
//   The redirect gate: varObj.redirect === true means this leg is tearing down
//   to hand off to a GUI component, NOT a real end-of-call (applyVarObjDefaults
//   sets it false on a fresh/restored leg; storeSessionVariables sets it true
//   on handoff). finalize() consults it per-finaliser via runOnRedirect, so a
//   finaliser like KeyLog skips on a handoff while a future one can opt in.
// ============================================================================

/**
 * Run one finaliser with the redirect gate and fault isolation.
 *
 * @param {string} name - label for trace logging
 * @param {Function} fn - the finaliser; may return a promise or undefined
 * @param {boolean} runOnRedirect - true to run even on a redirect (handoff) leg
 * @returns {*} whatever fn returns (often a promise), or undefined when skipped
 *              or when fn throws
 */
function finalize(name, fn, runOnRedirect) {
  var isRedirect =
    typeof varObj !== "undefined" && varObj && varObj.redirect === true;
  if (isRedirect && !runOnRedirect) {
    log_debug("[finalize] skip " + name + " (redirect leg)");
    return undefined;
  }
  try {
    return fn();
  } catch (e) {
    log_error("[finalize] " + name + " threw | " + (e && e.message));
    return undefined;
  }
}

/**
 * Fold a list of mixed values into a single promise that resolves once every
 * thenable in the list has settled. Non-thenables are ignored. Returns
 * undefined when nothing async was scheduled, so a fully-synchronous finalise
 * pass adds no microtask.
 *
 * @param {Array} list
 * @returns {Object|undefined} a thenable, or undefined when nothing is pending
 */
function _awaitAll(list) {
  var pending = [];
  if (list) {
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (item && typeof item.then === "function") {
        pending.push(item);
      }
    }
  }
  if (pending.length === 0) {
    return undefined;
  }
  var chained = pending[0];
  for (var j = 1; j < pending.length; j++) {
    (function (next) {
      chained = chained.then(
        function () {
          return next;
        },
        function () {
          return next;
        },
      );
    })(pending[j]);
  }
  return chained;
}

/**
 * Modular end-of-call slot. One finalize(...) line per finaliser; the third
 * arg opts a finaliser into running on a redirect (handoff) leg. Returns a
 * promise the platform awaits, or undefined when nothing async ran.
 *
 * @returns {Object|undefined}
 */
function onCallEnd() {
  Logger.debug(
    "[onCallEnd] varObj | " +
      Logger.sanitizeForLog(
        typeof varObj !== "undefined" ? varObj : null,
        10000,
      ),
  );
  var pending = [];
  pending.push(finalize("KeyLog", KeyLog, false)); // skip on redirect
  // Future finalisers -- one line each, e.g.:
  //   pending.push(finalize("CdbLog", CdbLog, false));
  //   pending.push(finalize("HeartbeatPing", HeartbeatPing, true)); // runs on redirect too
  return _awaitAll(pending);
}

/**
 * KeyLog -- POST a snapshot of the call's configured keysToLog attributes to
 * the IVR API at end-of-call. Reads the per-flow keysToLog list (written onto
 * varObj by the first setVariables op) and the value of each named key via
 * getScoped. No keysToLog, or no resolvable values, means no POST.
 *
 * Pure build + POST: the redirect gate lives in finalize(), not here, so KeyLog
 * stays reusable and testable in isolation.
 *
 * @returns {Object|undefined} the request promise, or undefined when skipped
 */
function KeyLog() {
  var names = getScoped("keysToLog", null);
  if (!names || typeof names.length !== "number" || names.length === 0) {
    log_debug("[KeyLog] no keysToLog -- skipping");
    return undefined;
  }

  var keys = [];
  for (var i = 0; i < names.length; i++) {
    var keyName = names[i];
    if (!keyName) {
      continue;
    }
    var value = getScoped(keyName, null);
    if (value === null || value === undefined) {
      continue;
    }
    keys.push({ name: String(keyName), value: value });
  }

  if (keys.length === 0) {
    log_debug("[KeyLog] keysToLog set but no values resolved -- skipping");
    return undefined;
  }

  var body = {
    callIdKey: Logger.getCallIdKey(),
    routingId: Logger.getRoutingId(),
    keys: keys,
  };

  var timeout = 10000;
  try {
    return jsonHttpRequest(
      _rtBaseUrl + _rtKeyLogEndpoint,
      { method: "POST", timeout: timeout },
      _headers,
      body,
    ).then(
      function (result) {
        log_debug("[KeyLog] POST ok | keys=" + keys.length);
        return { success: true, response: result };
      },
      function (error) {
        log_error(
          "[KeyLog] POST failed | " + (error && (error.message || error)),
        );
        return { success: false, error: error };
      },
    );
  } catch (e) {
    log_error("[KeyLog] request threw | " + (e && e.message));
    return undefined;
  }
}
