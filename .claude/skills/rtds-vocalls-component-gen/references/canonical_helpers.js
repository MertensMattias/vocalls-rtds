// Canonical helpers — copy these verbatim into the master-layer Code attribute
// of every generated v2 component. They are the foundation every operation
// builds on.
//
// All three are declared without var/let/const so they become global. This is
// the Vocalls contract for cross-node visibility.
//
// Identifier-prefix rules (load-bearing — see naming.md):
//   __foo  — component-authored: master-layer functions, the per-component
//            __rtParams / __rtBaseUrl / __rtEndpoint / __rtNextStep globals,
//            AND every var-declared local inside any function in this file.
//   _foo   — platform-supplied flow variables (_rtNextStep, _rtBaseUrl,
//            _rtMailEndpoint, _headers).
//   foo    — runtime/host APIs (global, environment, context, Logger,
//            getValue, walk, hasKey, jsonHttpRequest, fileExists, nowUTC).
//
// Function parameter names follow the API contract they implement and may
// stay bare (e.g. getValue(obj, key, defaultValue) keeps the runtime
// signature). All var-declared locals MUST carry the __ prefix — no
// exceptions.
//
// Convention: every function carries a basic JSDoc block (description + @param +
// @returns). This is mandatory for every function the skill emits, not just
// the non-obvious ones.
//
// v2 shape:
//   - No __init splay. Runtime params live on a single per-component object
//     __rtParams, populated by __setupConfig(__configJSON).
//   - __setupConfig returns a flat { Key: value } map (no __rt prefix).
//   - Read fields via getValue(__rtParams, 'Key', default) — provided by the
//     global helpers library (rtds_globalCodeAndHelpers.js). See
//     runtime_pointer.md.
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
    if (!context.currentNode.id) return nodeId;

    var __separator = '-';
    var __output = context.currentNode.id.split(__separator);

    __output[__output.length - 1] = nodeId;
    return __output.join(__separator);
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
    var __parsed = typeof config === 'string' ? JSON.parse(config) : config;
    if (__parsed && typeof __parsed.Params === 'object' && __parsed.Params !== null) {
        return __parsed.Params;
    }
    return __parsed || {};
};


/**
 * Resolves Params into a flat { Key: value } map (v2 shape — no __rt prefix).
 *
 * Rules:
 *   - Active is coerced to Boolean (never template-substituted).
 *   - Every other Param is trimmed, then ${name} placeholders are substituted
 *     against `global`. Bare names only (\w+) — no expressions, no dotted
 *     paths. Unresolved placeholders are left as the literal "${name}" and
 *     logged at warn level.
 *   - ConfigId is coerced to Number (falls back to -1 on empty/NaN).
 *   - Timeout  is coerced to Number (falls back to 10000 on empty).
 *
 * The returned object is assigned to the per-component global `__rtParams`
 * in the init node, and read via getValue(__rtParams, 'Key', default) from
 * the work node.
 *
 * Substitution uses String.prototype.replace — no `new Function`, no `eval`.
 * The Vocalls runtime disables string-eval, which is why template-literal
 * evaluation is not an option here. See logging.md.5.
 *
 * @param {string|object} config - Raw operation config (see __extractParams).
 * @returns {object} Map of Key -> resolved value.
 */
__setupConfig = function (config) {
    var __params = __extractParams(config);
    var __result = {};

    __result.Active = typeof __params.Active === 'boolean'
        ? __params.Active
        : Boolean(__params.Active);

    var __keys = Object.keys(__params);
    for (var __i = 0; __i < __keys.length; __i++) {
        var __key = __keys[__i];
        if (__key === 'Active') { continue; }

        var __raw = (__params[__key] !== undefined && __params[__key] !== null)
            ? String(__params[__key]).trim()
            : '';

        var __resolved;
        if (__raw.indexOf('${') !== -1) {
            __resolved = __raw.replace(/\$\{(\w+)\}/g, function (__match, __name) {
                if (global.hasOwnProperty(__name)) { return String(global[__name]); }
                Logger.warn('[__setupConfig] unresolved placeholder', { key: __key, placeholder: __name });
                return __match;
            });
        } else {
            __resolved = __raw;
        }

        if (__key === 'ConfigId') {
            __resolved = Number(__resolved) || -1;
        } else if (__key === 'Timeout') {
            __resolved = __resolved !== '' ? Number(__resolved) : 10000;
        }

        __result[__key] = __resolved;
    }

    return __result;
};
