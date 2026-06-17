// Canonical helpers — copy these into the master-layer Code attribute of every
// generated v2 component. In the current (post-camelCase) shape they are THIN
// DELEGATING ALIASES to the runtime env-library globals (rtds_3_vocallsEnv.js),
// not fat inline reimplementations. This is the form shipped in the canonical
// sendSms.js / sendMail.js. See component-v2.md §3 and helpers.md.
//
// Each alias guards `typeof <global> === 'undefined'` (library-not-loaded
// safety net: warn + return undefined) and otherwise forwards every argument
// via `<global>.apply(null, arguments)`. There is NO second implementation to
// drift from the library — the component and the JS twins resolve through the
// exact same global. (Earlier skill revisions inlined a full __setupConfig with
// a `'Active'` PascalCase branch; that diverged from the camelCase `active`
// contract and from the live components — do not reintroduce it.)
//
// All aliases are declared without var/let/const so they become global. This is
// the Vocalls contract for cross-node visibility.
//
// Identifier-prefix rules (load-bearing — see naming.md):
//   __foo  — component-authored: master-layer functions/aliases, the
//            per-component __rtParams / __rtBaseUrl / __rtEndpoint / __rtNextStep
//            globals, AND every var-declared local inside any function/work body.
//   _foo   — platform-supplied flow variables (_rtNextStep, _rtBaseUrl,
//            _rtMailEndpoint, _headers).
//   foo    — runtime/host APIs (global, environment, context, Logger,
//            getValue, activeFlag, setupConfig, extractParams, nowUTC,
//            jsonHttpRequest, ...). The aliases below forward to these.
//
// v2 shape:
//   - No __init splay, no __rt<Key> per-Param consts. Runtime params live on a
//     single per-component object __rtParams, populated in the init node by
//     __rtParams = __setupConfig(__configJSON).
//   - __setupConfig delegates to the global setupConfig, which returns a flat
//     { key: value } map (camelCase keys, no __rt prefix; `active` coerced to a
//     boolean via activeFlag; ${name} tokens resolved via resolveConfigTokens).
//   - Read fields via __getValue(__rtParams, 'key', default) — camelCase key.
//
// Which aliases to emit: ALWAYS __getValue, __activeFlag, __setupConfig (the
// init node calls __setupConfig; the work/output nodes call __getValue;
// __setupConfig coercion needs activeFlag). Add __extractParams, __nowUTC, and
// any op-specific delegate (__isMobileNumber, ...) when the work body uses them.
// Don't emit an alias the component never calls.
//
// When emitting into the XML attribute, encode (matching every shipped
// component — these all use the NUMERIC single-quote entity, never &apos;):
//   '  -> &#39;
//   "  -> &quot;
//   <  -> &lt;
//   >  -> &gt;
//   &  -> &amp;
//   newline -> &#xa;


/**
 * Thin alias for the env-library getValue (case-insensitive object read).
 * Warns and returns undefined if the library has not loaded.
 *
 * @returns {*} getValue(obj, key, defaultValue) result, or undefined if unavailable.
 */
__getValue = function () {
    if (typeof getValue === 'undefined') {
        Logger.warn('[<componentName>] shared function unavailable -- library not loaded', { fn: 'getValue' });
        return undefined;
    }
    return getValue.apply(null, arguments);
};


/**
 * Thin alias for the env-library activeFlag — the single Active-coercion
 * contract: JSON boolean, number 1/0, string '1'/'0'/'true'/'false'
 * (case-insensitive), array form [value, ...flags] unwrapped first; anything
 * else (incl. an unresolved ${...} placeholder) is inactive. The JS twins call
 * activeFlag() directly; the component calls it through this alias, so Active
 * truthiness can never diverge.
 *
 * @returns {boolean} activeFlag(value) result, or undefined if unavailable.
 */
__activeFlag = function () {
    if (typeof activeFlag === 'undefined') {
        Logger.warn('[<componentName>] shared function unavailable -- library not loaded', { fn: 'activeFlag' });
        return undefined;
    }
    return activeFlag.apply(null, arguments);
};


/**
 * Thin alias for the env-library extractParams (normalises an operation config
 * to its flat Params object). Emit only when the component needs it directly.
 *
 * @returns {object} extractParams(config) result, or undefined if unavailable.
 */
__extractParams = function () {
    if (typeof extractParams === 'undefined') {
        Logger.warn('[<componentName>] shared function unavailable -- library not loaded', { fn: 'extractParams' });
        return undefined;
    }
    return extractParams.apply(null, arguments);
};


/**
 * Thin alias for the env-library setupConfig — resolves Params into a flat
 * { key: value } map (camelCase keys; `active` coerced via activeFlag; ${name}
 * tokens resolved via resolveConfigTokens; value TYPE preserved from the JSON,
 * no Number coercion). The init node assigns __rtParams = __setupConfig(__configJSON).
 *
 * @returns {object} setupConfig(config) result, or undefined if unavailable.
 */
__setupConfig = function () {
    if (typeof setupConfig === 'undefined') {
        Logger.warn('[<componentName>] shared function unavailable -- library not loaded', { fn: 'setupConfig' });
        return undefined;
    }
    return setupConfig.apply(null, arguments);
};


/**
 * Thin alias for the env-library nowUTC (ISO-8601 UTC timestamp). Emit only when
 * the work body needs a timestamp (HTTP payloads with plannedTime, ...).
 *
 * @returns {string} nowUTC() result, or undefined if unavailable.
 */
__nowUTC = function () {
    if (typeof nowUTC === 'undefined') {
        Logger.warn('[<componentName>] shared function unavailable -- library not loaded', { fn: 'nowUTC' });
        return undefined;
    }
    return nowUTC.apply(null, arguments);
};
