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
//            getValue, walk, hasKey, activeFlag, jsonHttpRequest, fileExists,
//            nowUTC).
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
//     runtime env library (rtds_3_vocallsEnv.js). See runtime_pointer.md.
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
 * Component-local alias for the global activeFlag() (rtds_3_vocallsEnv.js) — the
 * single Active-coercion contract: JSON boolean, number 1/0, string
 * '1'/'0'/'true'/'false' (case-insensitive), array form [value, ...flags]
 * unwrapped first; anything else (incl. an unresolved ${...} placeholder) is
 * inactive. The JS twins call activeFlag() directly; the component calls it
 * through this alias, so Active truthiness can never diverge. activeFlag is a
 * runtime global (the env library always loads first), so this alias needs no
 * fallback of its own.
 *
 * @param {*} value
 * @returns {boolean}
 */
__activeFlag = function (value) {
    return activeFlag(value);
};


/**
 * Resolves Params into a flat { Key: value } map (v2 shape — no __rt prefix).
 * The value's TYPE is whatever the JSON wrote — no Number coercion ('4' stays a
 * string, 4 stays a number).
 *
 * Per key:
 *   - Array-form [value, ...flags] is unwrapped to its first element (matches the
 *     runtime twin getParam; the GUI flags isDisplayed / isEditable are
 *     runtime-irrelevant). [] -> ''.
 *   - Active is then coerced to a real boolean via __activeFlag (never
 *     token-substituted). Active absent: NOT defaulted here — the read site
 *     decides (SetVariables true, Send and guard default false).
 *   - Every other STRING value is trimmed and has ${name} placeholders resolved
 *     via resolveConfigTokens (varObj first, then global; bare names only;
 *     String.replace, never new Function). Non-strings (number, boolean, null,
 *     object) pass through with their type intact. Unresolved placeholders are
 *     left raw and logged at warn level.
 *
 * The returned object is assigned to the per-component global `__rtParams`
 * in the init node, and read via getValue(__rtParams, 'Key', default) from
 * the work node. A read site that needs Timeout/ConfigId as a number coerces
 * there (e.g. Number(getValue(__rtParams, 'Timeout', 10000))).
 *
 * @param {string|object} config - Raw operation config (see __extractParams).
 * @returns {object} Map of Key -> resolved value.
 */
__setupConfig = function (config) {
    var __params = __extractParams(config);
    var __result = {};
    var __keys = Object.keys(__params);
    for (var __i = 0; __i < __keys.length; __i++) {
        var __key = __keys[__i];
        var __value = __params[__key];
        if (Array.isArray(__value)) __value = __value.length ? __value[0] : '';
        if (__key === 'Active') { __result.Active = __activeFlag(__value); continue; }
        if (typeof __value === 'string') __value = resolveConfigTokens(__value.trim(), __key);
        __result[__key] = __value;
    }
    return __result;
};
