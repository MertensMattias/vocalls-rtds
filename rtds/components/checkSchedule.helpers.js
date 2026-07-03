/* ============================================================================
 * checkSchedule component — helper dependency bundle
 * ----------------------------------------------------------------------------
 * Every shared library function the checkSchedule.js component depends on, in
 * dependency order, copied verbatim from:
 *   projects/rtds-runtime/globalLibraries/active/rtds_3_vocallsEnv.js
 *
 * The component itself references these through `__`-prefixed delegating
 * aliases (__getValue, __activeFlag, __extractParams, __setupConfig, __hasKey,
 * __setVariable) which just forward to the functions below.
 *
 * Direct calls from the component:
 *   getValue, activeFlag, extractParams, setupConfig, hasKey, setVariable
 * Transitive (pulled in by the above):
 *   setupConfig -> extractParams, activeFlag, resolveConfigTokens
 *   resolveConfigTokens -> getScoped (-> hasKey, getValue)
 *   setVariable -> resolveRoot
 *
 * Ambient platform globals (NOT included — provided by the Vocalls runtime):
 *   Logger, jsonHttpRequest, varObj, global / globalThis
 * ============================================================================ */

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
