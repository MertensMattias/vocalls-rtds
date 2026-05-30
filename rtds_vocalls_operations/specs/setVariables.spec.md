# Operation Spec — setVariables (SetVariables)

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Operation Type | `SetVariables`                                                    |
| Component name | `setVariables`                                                    |
| Pattern        | `set_attributes`                                                  |
| Supersedes     | `SetAttributes` / `setAttributes` (this spec is the refactor target) |
| Target files   | `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` (`executeSetVariables`) + `rtds_vocalls_operations/components/setVariables.js` (canvas twin, lockstep) |

## Why the rename

`SetAttributes` writes flat `varObj[Key] = value`. `SetVariables` keeps that as the
default but generalises the **destination** to a dotted path and the **value** to
its native JSON type. The new name reflects that it sets *variables anywhere in
the reachable scope* — not just flat call-scoped attributes.

`SetAttributes` stays registered as a back-compat alias to `executeSetVariables`
during migration (see [Migration](#migration)).

## Business purpose

Write one or more session variables in a single hop. Thread state through the
flow — flag whether the caller authenticated, store a chosen language, persist a
customer-key lookup result, stage routing tokens, or build a nested config bag for
a downstream operation. The destination defaults to the call-scoped store
(`varObj`) but may target `globalThis`, or any reachable object, via dot notation.

### Inputs (Params)

| Param name        | Type    | Required  | Default | Description                                                                                                                                  |
| ----------------- | ------- | --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Active`          | boolean | no        | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                                     |
| `NextStep`        | string  | yes       | —       | Continuation after the writes (always taken in active mode).                                                                                  |
| `LogAttributes`   | string  | no        | `''`    | `\|`-separated list of variable names whose resolved values are logged at debug level after the writes. Sensitive data should be omitted.      |
| `<target path>`   | any     | yes (≥1)  | —       | Every other Param. The **key** is a write target (see [Target resolution](#target-resolution)); the **value** is written with its native JSON type (see [Value typing](#value-typing)). Control keys (`Active`, `NextStep`, `LogAttributes`) are excluded. |

### Outputs

| Branch key | Taken when                | Fallback |
| ---------- | ------------------------- | -------- |
| `NextStep` | Always (the only branch). | `-1`     |

## Target resolution

The Param **key** is a dot-separated path. The first segment selects the **root
object**; the remaining segments are a nested path under that root.

| Key form                | Root        | Writes                                  |
| ----------------------- | ----------- | --------------------------------------- |
| `customerType`          | `varObj`    | `varObj.customerType` (bare key → varObj) |
| `varObj.customerType`   | `varObj`    | `varObj.customerType` (explicit, same)  |
| `varObj.auth.verified`  | `varObj`    | `varObj.auth.verified` (nested)         |
| `globalThis.debugCall`  | `globalThis`| `globalThis.debugCall`                  |
| `someObj.a.b`           | `someObj`   | `someObj.a.b` (named reachable global)  |

Rules:

1. **No dot → `varObj`.** A bare key is shorthand for `varObj.<Key>`. This is the
   default and the overwhelmingly common case — see [conventions/storage.md](../../conventions/storage.md):
   *all call-scoped data lives on `varObj`.*
2. **First segment is the root.** `globalThis`, `varObj`, or the name of any object
   already reachable in scope (a global). The root must already exist as an object;
   the runtime does **not** create a new root global (that would silently mint
   undeclared globals and bypass the `_rt*` namespace discipline). A non-existent or
   non-object root → skip + `Logger.warn`.
3. **Auto-create intermediates.** Missing intermediate objects along the path are
   vivified as plain objects (lodash-`set` semantics). `varObj.a.b.c` with
   `varObj.a` undefined creates `varObj.a = {}`, `varObj.a.b = {}`, then sets `.c`.
4. **Casing preserved.** Path segments are written with the operator's exact casing
   (write-side rule, [conventions/casing.md](../../conventions/casing.md)). No
   normalisation between read and write.
5. **`_rt*` discipline.** Writing a `globalThis._rtXxx` runtime-owned global from an
   operation is a smell — flag in review, don't hard-block. Operator data belongs on
   `varObj`.

## Value typing

The value is written with **its native JSON type**, taken verbatim from the parsed
Params object. No string coercion.

| Params JSON  | Written value (type)        |
| ------------ | --------------------------- |
| `true`       | `true` (boolean)            |
| `9999`       | `9999` (number)             |
| `null`       | `null`                      |
| `"CT"`       | `"CT"` (string)             |
| `["a","b"]`  | `["a","b"]` (array)         |
| `{ "x": 1 }` | `{ x: 1 }` (object)         |

Only **string** values are processed: trimmed, and `${name}` placeholders resolved
against the scope (the same `resolveTokens` / `__setupConfig` substitution the other
operations use). A resolved string stays a string — `"n=${count}"` → `"n=5"`, never
the number `5`. Booleans, numbers, null, arrays, and objects pass through untouched.

The legacy `ConfigId` → Number and `Timeout` → Number coercions from `__setupConfig`
do **not** apply here (SetVariables has no such control Params); only `Active` is
coerced to Boolean.
Always apply this rule: "123456" = string
123456 = number

## Runtime handler — `executeSetVariables(op)`

Lives in [rtds_2_runtime.js](../../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js).
Same dispatch contract as the other JS handlers (returns `{ nextStepId }`; the
dispatch model is out of scope for this spec and unchanged by it).

```
function executeSetVariables(op) {
  var params = op.params;
  if (!params) { return { nextStepId: null }; }
can 1 be set as true/false boolean? 
  var CONTROL = { active: 1, nextstep: 1, logattributes: 1 };

  var keys = Object.keys(params);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (CONTROL[String(key).toLowerCase()]) { continue; }

    var raw = getParam(op, key, null);          // unwrap array form, keep native type
    var value = (typeof raw === "string") ? resolveTokens(raw) : raw;  // strings only
    setVariable(key, value);                    // dot-path write (below)
  }

  handleLogAttributes(op);                       // debug side-effect, getScoped reads
  var nextStepId = resolveNextStep(op, null);
  Logger.debug("[RTDS] SetVariables done", { opName: op.name, nextStep: nextStepId || "(none)" });
  return { nextStepId: nextStepId };
}
```

### `setVariable(path, value)` — the dot-path write helper

A new helper (env library, `rtds_3_vocallsEnv.js`, next to `getScoped`):

```
function setVariable(path, value) {
  if (value === null || value === undefined) { /* still written — null is a valid value */ }
  var segments = String(path).split(".");

  // 1. Resolve root. No dot → varObj. Else first segment names the root.
  var root, startIndex;
  if (segments.length === 1) {
    root = varObj; startIndex = 0;
  } else {
    root = resolveRoot(segments[0]);   // varObj | globalThis | named reachable object
    if (!root || typeof root !== "object") {
      Logger.warn("[setVariable] unknown or non-object root — skipped", { path: path, root: segments[0] });
      return;
    }
    startIndex = 1;
  }

  // 2. Walk/auto-create intermediates, set leaf.
  var node = root;
  for (var i = startIndex; i < segments.length - 1; i++) {
    var seg = segments[i];
    if (node[seg] === null || typeof node[seg] !== "object") { node[seg] = {}; }
    node = node[seg];
  }
  node[segments[segments.length - 1]] = value;
}
```

`resolveRoot(name)`:
- `"varObj"` → `varObj`
- `"globalThis"` / `"global"` → the global scope object (`global` ?? `globalThis`)
- otherwise → the named property on the global scope **only if it already exists**
  as an object; never auto-created.

ES5.1 throughout (no `let`/`const`/arrow/`??`; the `??` above is shorthand for the
existing `typeof global !== 'undefined' ? global : globalThis` ladder).

## Component twin — `setVariables.js`

The canvas component mirrors the handler in lockstep
([conventions/lockstep.md](../../conventions/lockstep.md)). It reuses
`__setupConfig` for config parsing and adds the same `setVariable` dot-path write in
its `script` node, replacing the flat `varObj[key] = value` loop:

`script` (work body):

```js
if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[setVariables] skipped — inactive', { nextStep: __rtNextStep });
    return;
}

var __CONTROL_KEYS = { Active: 1, NextStep: 1, LogAttributes: 1 };
var __written = 0;

walk(__rtParams, function (key, value) {
    if (__CONTROL_KEYS[key]) return;
    setVariable(key, value);   // dot-path aware; varObj by default
    __written++;
});

global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);
Logger.info('[setVariables] wrote variables', { count: __written, nextStep: global[_rtNextStep] });
```

`__setupConfig` already preserves native JSON types for non-string values and only
substitutes `${name}` in strings — so [Value typing](#value-typing) needs no change
on the component side. `setVariable` is added to the component's master `Code` block
with the same `typeof setVariable === 'undefined'` fallback guard the other helpers
use.

## Migration

- Register **both** Types to the same handler during migration:
  `registerRtdsOperation('SetVariables', executeSetVariables)` and
  `registerRtdsOperation('SetAttributes', executeSetVariables)`. Existing routing
  tables using `SetAttributes` keep working unchanged (a bare flat key still writes
  `varObj[key]`).
- Keep `setAttributes.js` until flows are re-pointed; `setVariables.js` is the
  forward component.
- Remove the `SetAttributes` alias once no routing table references it.

## Examples

```jsonc
// Flat call-scoped writes (identical to old SetAttributes behaviour)
{ "RoutingId": "LPA_ICT_HELPDESK", "IVREvent": 9999, "IsHelpdeskCall": true, "NextStep": "00001" }
//  -> varObj.RoutingId = "LPA_ICT_HELPDESK"  (string)
//  -> varObj.IVREvent  = 9999                 (number)
//  -> varObj.IsHelpdeskCall = true            (boolean)

// Nested + explicit roots
{ "Active": true, "auth.verified": true, "auth.method": "pin",
  "globalThis.debugCall": true, "NextStep": "00002" }
//  -> varObj.auth = { verified: true, method: "pin" }   (auto-created)
//  -> globalThis.debugCall = true

// Placeholder in a string value stays a string
{ "greeting": "Hello ${customerName}", "NextStep": "00003" }
//  -> varObj.greeting = "Hello Alice"   (string; customerName resolved)
```

## Open questions

- **`SetAttributes` alias lifetime** — kept until routing tables migrate; the spec
  registers both Types to one handler. Confirm whether to alias or hard-cut.
  // Hard CUT
- **Array-index paths** (`list.0.id`) — not in scope; dot segments address object
  keys only. Numeric segments would create string-keyed object properties, not array
  slots. Flag if array targeting is ever needed. //USER: Probably

## Notes

- **Storage contract** ([conventions/storage.md](../../conventions/storage.md)):
  `varObj` is the default and correct destination for operator data. `globalThis`
  targeting is supported but exceptional; `_rt*` runtime globals must not be written
  by operators.
- **Reads** elsewhere should still go through `getScoped(key, default)`
  (varObj → global → default). `setVariable` is the write-side counterpart.
- **Lockstep**: the runtime `executeSetVariables` and the canvas `setVariables.js`
  must keep an identical control-key set and the same `setVariable` semantics. Drift
  is invisible until a routing table happens to use a dotted key.
