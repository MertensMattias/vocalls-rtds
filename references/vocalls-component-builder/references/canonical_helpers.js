// Canonical helpers — copy these verbatim into the master-layer Code attribute
// of every generated component. They are the foundation every operation builds on.
//
// All five are declared without var/let/const so they become global. This is the
// Vocalls contract for cross-node visibility. Locals inside each function use var.
//
// Convention: every function carries a basic JSDoc block (description + @param +
// @returns). This is mandatory for every function the skill emits, not just the
// non-obvious ones.
//
// When emitting into the XML attribute, encode:
//   '  -> &apos;     (preferred for JS strings)
//   "  -> &quot;
//   <  -> &lt;
//   >  -> &gt;
//   &  -> &amp;
//   newline -> &#xa;


/**
 * Replaces the last '-'-separated segment of context.currentNode.id with the
 * supplied nodeId. Used when a parent component needs to address a child node
 * by its short id rather than the fully-qualified one Vocalls assigns at run
 * time. Returns the original nodeId untouched when context.currentNode.id is
 * not set (e.g. during isolated unit tests).
 *
 * @param {string|number} nodeId - The short id to splice into the current node path.
 * @returns {string} The fully-qualified node id, or the original nodeId if no path is set.
 */
__makeLocalNodeId = function (nodeId) {
    if (nodeId !== null && nodeId !== undefined) nodeId = nodeId.toString();
    if (!context.currentNode.id)
        return nodeId;

    var separator = '-';
    var output = context.currentNode.id.split(separator);

    output[output.length - 1] = nodeId;
    return output.join(separator);
};


/**
 * Evaluates a string as a JS template literal using variables from `scope`.
 * Use only with trusted, platform-controlled inputs — this constructs a
 * `new Function(...)` and executes the template. Returns the raw template
 * string unchanged when evaluation throws.
 *
 * @param {string} tpl - Template literal body (no backticks).
 * @param {object} scope - Map of variable names to values made available in the template.
 * @returns {string} The evaluated template string.
 */
__resolveTemplate = function (tpl, scope) {
    var keys = Object.keys(scope);
    var vals = [];
    for (var i = 0; i < keys.length; i++) {
        vals.push(scope[keys[i]]);
    }
    return new Function(keys.join(','), 'return `' + tpl + '`').apply(null, vals);
};


/**
 * Normalises operation config. Accepts:
 *   - a JSON string -> parsed
 *   - an RTDS operation object { Params: {...} } -> returns Params
 *   - a flat Params object -> returned as-is
 *   - null/undefined -> returns {}
 *
 * @param {string|object} config - The raw operation config to normalise.
 * @returns {object} The flat Params object, never null.
 */
__extractParams = function (config) {
    var parsed = typeof config === 'string' ? JSON.parse(config) : config;
    if (parsed && typeof parsed.Params === 'object' && parsed.Params !== null) {
        return parsed.Params;
    }
    return parsed || {};
};


/**
 * Pure version of __init — returns a map of resolved __rt* values rather than
 * mutating globals. Useful in unit tests and in components that want to
 * preview the resolved config before committing.
 *
 * Rules:
 *   - Active is coerced to Boolean (never template-evaluated).
 *   - Every other Param is trimmed, then template-resolved against `callScope`
 *     if it contains '${'. Falls back to raw on resolve failure.
 *   - ConfigId is coerced to Number (falls back to __rtConfigId).
 *   - Timeout is coerced to Number (falls back to __rtTimeout when empty).
 *
 * @param {string|object} config - Raw operation config (see __extractParams).
 * @returns {object} Map of '__rt<Key>' -> resolved value.
 */
var callScope = {};

__setupConfig = function (config) {
    var params = __extractParams(config);
    var result = {};

    result.__rtActive = typeof params.Active === 'boolean'
        ? params.Active
        : Boolean(params.Active);

    var keys = Object.keys(params);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key === 'Active') { continue; }

        var raw = (params[key] !== undefined && params[key] !== null)
            ? String(params[key]).trim()
            : '';

        var resolved;
        if (raw.indexOf('${') !== -1) {
            try {
                resolved = __resolveTemplate(raw, callScope);
            } catch (e) {
                log_debug('[__setupConfig] Template resolve failed for key "' + key + '", falling back to raw. Error: ' + e.message);
                resolved = raw;
            }
        } else {
            resolved = raw;
        }

        if (key === 'ConfigId') {
            resolved = Number(resolved) || __rtConfigId;
        } else if (key === 'Timeout') {
            resolved = resolved !== '' ? Number(resolved) : __rtTimeout;
        }

        result['__rt' + key] = resolved;
    }

    return result;
};


/**
 * Walks the Params object and writes resolved values into the corresponding
 * global __rt<Key> or __rt<TypePrefix><Key> variable.
 *
 * Lookup order per Param key (e.g. "Body" with TypePrefix "Sms"):
 *   1. "__rt"    + key  ->  __rtBody
 *   2. "__rt<TypePrefix>" + key  ->  __rtSmsBody
 * First candidate that exists as an own property of `global` wins; if neither
 * exists the Param is skipped.
 *
 * Templates: only whole-string '${var}' references are resolved. Partial /
 * concatenated templates are left raw and logged at debug level — the runtime
 * is forgiving here because most callers stick to whole-string substitution.
 *
 * REPLACE the literal 'TypePrefix' below with the operation prefix at
 * generation time. For sendSms it's 'Sms'; for SetAttributes it's '' (skip
 * the second candidate); for Condition it could be 'Cond'.
 *
 * @param {string|object} config - Raw operation config (see __extractParams).
 * @returns {void} Mutates `global` in place; returns nothing.
 */
__init = function (config) {
    var params = __extractParams(config);

    for (var key in params) {
        if (!params.hasOwnProperty(key)) { continue; }

        var candidates = ['__rt' + key, '__rtTypePrefix' + key];
        var targetVar = null;
        for (var i = 0; i < candidates.length; i++) {
            if (global.hasOwnProperty(candidates[i])) {
                targetVar = candidates[i];
                break;
            }
        }
        if (targetVar === null) { continue; }

        var raw = (params[key] !== null && params[key] !== undefined)
            ? String(params[key])
            : '';

        if (raw.indexOf('${') !== -1) {
            var match = raw.match(/^\$\{([^}]+)\}$/);
            if (match && global.hasOwnProperty(match[1])) {
                global[targetVar] = String(global[match[1]]);
            } else {
                log_debug('[__init] Could not resolve template "' + raw + '" for 