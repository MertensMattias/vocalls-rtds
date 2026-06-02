# Spec — the unified `__setupConfig` / `__extractParams` helpers

**Status:** design (pre-implementation) · **Scope:** [Component] master-layer · **Stays at component level** (NOT moved to `rtds_2_runtime.js` / `rtds_3_vocallsEnv.js`).

## Why this spec exists

Every v2 component carries `__setupConfig(config)` in its master-layer `Code`. It is the single
place a component turns the operator-authored `__configJSON` into the flat `__rtParams` map that
every work node reads via `getValue(__rtParams, 'Key', default)`. Today the body has **drifted into
three shapes**:

| Shape | Where | Behaviour |
| ----- | ----- | --------- |
| `c9b1d9cd` — stringify | checkSchedule, guardRouting, guardTui, sendMail, sendSms | `String(__params[__key]).trim()` then `resolveConfigTokens`. **Coerces every value to string** — numbers, booleans, arrays, objects all lose their type. No array-form unwrap. |
| `444039f6` — type-preserving | setVariables (post-A3) | Passes non-strings through untouched; resolves tokens only for strings. **No array-form unwrap.** |
| skill-bundle (pre-A3) | `references/canonical_helpers.js`, `references/examples/sendSms.js` | Still the OLD inline `global.hasOwnProperty` substitution (global-only, never `getScoped`). Pre-dates A3. |

Two defects fall out of this drift:

- **B5 — array form not unwrapped.** The DB stores a Param as a scalar **or** as `[value, ...flags]`
  where flags are GUI hints (`isDisplayed` / `isEditable`) — see
  [insert_flow_on_sourceId.sql:274](../db_seed/insert_flow_on_sourceId.sql#L274) and the live sample
  [DA-HELPDESK.json:152](../samples/DA-HELPDESK.json#L152) (`"Prompt": ["AdHoc_Extra","isDisplayed","isEditable"]`).
  The runtime twin already unwraps to `raw[0]`
  ([rtds_2_runtime.js:345](../../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js#L345)).
  Components do **not** — the stringify shape turns the array into `"AdHoc_Extra,isDisplayed,isEditable"`,
  the type-preserving shape keeps the whole array. Both are wrong; only `[0]` is the value.
- **Type loss.** The stringify shape turns a JSON `47` into `"47"` and a JSON `true` into `"true"`.
  Read sites paper over this (`Number(getValue(...))`, `String(getValue(...)).toLowerCase()==='true'`),
  but `getValue(__rtParams,'InQueue',false)` used directly as a truthy test sees `"false"` (truthy) —
  a latent bug. Type-preservation fixes it and matches the twin (`getParam` keeps native number/boolean).

This spec defines **one** body to replace all three, applied identically to every component, kept
in lockstep with the skill bundle and the twin's `getParam`. The resolved design is **maximally
generic**: no per-key special-casing except `Active` (which must become a real boolean). Every other
key is array-unwrapped, then — if it's a string — trimmed and token-resolved; its **type is whatever
the JSON wrote** (`ConfigId: "4"` stays a string, `ConfigId: 4` stays a number). The earlier
`ConfigId`/`Timeout` `Number()` coercions are **removed**.

## `__extractParams(config)` — unchanged, already uniform

Identical across all six components (`d4ff31fd`). Keep as-is. Contract:

```js
__extractParams = function (config) {
    var __parsed = typeof config === 'string' ? JSON.parse(config) : config;
    if (__parsed && typeof __parsed.Params === 'object' && __parsed.Params !== null) return __parsed.Params;
    return __parsed || {};
};
```

| Input | Output |
| ----- | ------ |
| JSON **string** | `JSON.parse(config)` then envelope-unwrap (below). A malformed string throws — intentional, fail loud at init. |
| `{ Params: {...} }` envelope (object) | `.Params` |
| flat `{ Key: value }` object | itself |
| `null` / `undefined` | `{}` |

Note `typeof null === 'object'` is guarded by the explicit `!== null` check, so a `{ Params: null }`
envelope falls through to `return __parsed` (the envelope object), not a crash. Edge case, but pinned.

## `__setupConfig(config)` — the unified body

> **Decisions folded in** (see *Resolved decisions* below): array-form unwrap applies to **every** key
> including `Active`; **no** `ConfigId`/`Timeout` Number coercion — the value's type is whatever the JSON
> wrote (`"23"` is a string, `23` is a number, full stop); `Active` is active for `true` / `1` / `"1"` /
> `"true"`, inactive for `false` / `0` / `"0"` / `"false"` / empty, across all encodings.

```js
/**
 * Component-local alias for the global activeFlag() (rtds_3_vocallsEnv.js) — the
 * single Active-coercion contract (JSON boolean, number 1/0, string
 * "1"/"0"/"true"/"false" case-insensitive, array form unwrapped first; anything
 * else inactive). The JS twins call activeFlag() directly; the component calls it
 * through this alias, so the two paths can never diverge on Active truthiness.
 */
__activeFlag = function (value) {
    return activeFlag(value);
};

__setupConfig = function (config) {
    var __params = __extractParams(config);
    var __result = {};
    var __keys = Object.keys(__params);

    for (var __i = 0; __i < __keys.length; __i++) {
        var __key = __keys[__i];

        // 1. Array-form unwrap [value, ...flags] -> value, for EVERY key.
        //    GUI flags (isDisplayed/isEditable) are runtime-irrelevant; only the
        //    element [0] is the value. Matches the runtime twin's getParam.
        var __value = __params[__key];
        if (Array.isArray(__value)) {
            __value = __value.length ? __value[0] : '';
        }

        // 2. Active: coerce to a real boolean (after unwrap). Never token-resolved.
        if (__key === 'Active') {
            __result.Active = __activeFlag(__value);
            continue;
        }

        // 3. Token resolution + trim: STRINGS ONLY. Non-strings (number, boolean,
        //    null, object) keep their JSON type — the type comes from the data.
        if (typeof __value === 'string') {
            __value = resolveConfigTokens(__value.trim(), __key);
        }

        __result[__key] = __value;
    }

    // Active absent entirely -> let the read site default decide. Do NOT inject a
    // default here: SetVariables defaults true, Send*/guard* default false, and
    // that asymmetry lives at the read site (getValue(__rtParams,'Active',<dflt>)).
    return __result;
};
```

### Behaviour table (the contract every component now shares)

| Param value in `__configJSON` | `__rtParams` value | Notes |
| ----------------------------- | ------------------ | ----- |
| `"hello"` | `"hello"` | trimmed |
| `"  ${rtSmsBody}  "` | `String(getScoped('rtSmsBody'))` | trimmed first, then resolved varObj→global |
| `"${missing}"` | `"${missing}"` (raw) + `Logger.warn` | unresolved kept raw, never silently `""` |
| `47` (number) | `47` (number) | **type preserved** |
| `"47"` (string) | `"47"` (string) | **type preserved** — type is what the JSON wrote |
| `true` (boolean) | `true` (boolean) | preserved |
| `null` | `null` | preserved (not `""`) |
| `["AdHoc","isDisplayed","isEditable"]` | `"AdHoc"` | **B5 unwrap** → `[0]` |
| `[42,"isEditable"]` | `42` (number) | unwrap preserves the element's type |
| `[]` (empty array) | `""` | degenerate (Q3) |
| `{ nested: 1 }` (object) | `{ nested: 1 }` | preserved (setVariables writes nested objects) |
| `"Active": true` | `Active: true` | boolean |
| `"Active": 1` / `"1"` / `["1","isEditable"]` | `Active: true` | number/string/array-form all → true |
| `"Active": 0` / `"0"` / `["0","isEditable"]` | `Active: false` | **fixed** — was wrongly truthy under `Boolean([...])` |
| `"Active": "false"` / `""` / `null` | `Active: false` | |
| `"ConfigId": 4` | `4` (number) | preserved |
| `"ConfigId": "4"` | `"4"` (string) | **preserved as string** — no Number coercion |
| `"Timeout": 30` | `30` (number) | preserved |
| `"Timeout": "30"` | `"30"` (string) | **preserved as string** — read site coerces if it needs a number |

### Resolved decisions

1. **Array unwrap uses `Array.isArray(__value)`** — matches the twin verbatim; the sandbox exposes it
   (the twin already relies on it at [rtds_2_runtime.js:345](../../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js#L345)).
2. **Array unwrap applies to every key, including `Active`** (Q1 resolved). `["0","isEditable"]` → `"0"`
   → `activeFlag("0")` → `false`. Previously `Boolean(["0",...])` was wrongly `true`.
3. **`Active` accepts boolean / number 1·0 / string "1"·"0"·"true"·"false"** (Q2 resolved). The original
   "JSON-boolean-only" idea was reversed against the data: [DA-HELPDESK.json](../samples/DA-HELPDESK.json)
   emits `Active` as `"1"`, `1`, and `["1","isEditable"]` and almost never as a literal boolean, so
   boolean-only would skip nearly every real op. The coercion is the **global `activeFlag()`**
   (`rtds_3_vocallsEnv.js`) — the single Active contract, also called by the JS twins. The component's
   `__activeFlag` is a thin component-local **alias** that just delegates to it, so the GUI and twin paths
   can never diverge on Active truthiness. (The old global was named `isActive` with a `"false"`-is-truthy
   contract; it was renamed to `activeFlag` and rewritten to the strict array-aware contract above.)
4. **No `ConfigId`/`Timeout` Number coercion** — the data type is taken from the JSON, period. A read site
   that needs a number coerces there. Verified safe: `ConfigId` is only used in URL string-concatenation
   (`__rtBaseUrl + endpoint + '/' + ConfigId` — number or string both fine). **`Timeout` read sites must
   coerce** (`Number(getValue(__rtParams,'Timeout',10000))`) because they pass it to `jsonHttpRequest`'s
   `timeout` field — see "Read-site follow-up" below.
5. **Token resolution is strings-only** — a number/boolean/object/array-element can't carry a `${}` token,
   so guarding on `typeof === 'string'` is exactly what preserves type. (A3 setVariables behaviour, generalised.)
6. **`resolveConfigTokens` is a runtime global** (`rtds_3_vocallsEnv.js`), varObj→global via `getScoped`.
   Components call it; no inline fallback (B7 — env library always loads first;
   [loader.js](../../core/loader.js) reverse-alpha, no sandbox bypass).

### Read-site follow-up (Timeout)

Dropping the `Timeout` coercion shifts the number-coercion to the read site. The five HTTP components read
`var __timeout = getValue(__rtParams, 'Timeout', 10000);` and pass `__timeout` straight into
`jsonHttpRequest(__url, { "timeout": __timeout }, ...)`. After this change a JSON `"Timeout": "30"` reaches
that field as the string `"30"`. The dev sandbox ([minimalVocallsCore.js:230](../../core/minimalVocallsCore.js#L230))
ignores it (reads `options.timeoutMs`, not `timeout`), so tests are unaffected, but the real platform field
is unverifiable. **Wrap each Timeout read in `Number(...)`** as part of this change so the contract is
"component preserves type; the one read site that needs a number coerces explicitly". Low-risk, 5 one-line edits.

### Open question still pending

- **Q3 — empty-array `[]`.** Spec says `→ ''`. Almost certainly never emitted; `''` is the chosen degenerate
  value (consistent with "absent string"). Pinned unless you object.

## Lockstep / what to update together

Per [lockstep.md](../../conventions/lockstep.md) and [CLAUDE.md](../../CLAUDE.md) "What to update when you change X":

1. All six live components: `rtds/components/{checkSchedule,guardRouting,guardTui,sendMail,sendSms,setVariables}.js`.
2. Skill reference bodies: `references/canonical_helpers.js`, `references/examples/sendSms.js`,
   `references/examples/sendMail.js`, `assets/template.xml` — then `npm run build:skill`.
3. [conventions/params.md](../../conventions/params.md) — the prose contract (currently says
   "preserves … arrays, and objects", which is only true for the type-preserving shape and never did the
   unwrap; update to this spec).
4. Tests: `projects/rtds-runtime/tests/` — array unwrap, type-preservation, coercions, the Active-array Q1 case.
5. `npm run check` (sync + lockstep + tests) green.
