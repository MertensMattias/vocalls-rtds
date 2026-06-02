---
status: implemented
catalog:
  operation: "setVariables"
  legacy: false
  pattern: "`set_attributes`"
  component: "setVariables.js"
  componentMark: "✅"
  runtimeCell: "JS twin `executeSetVariables` (`SetVariables_vocalls`)"
  seed: "✅"
---

# Operation Spec — setVariables (SetVariables)

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Operation Type | `SetVariables`                                                    |
| Component name | `setVariables`                                                    |
| Pattern        | `set_attributes`                                                  |
| Supersedes     | `SetAttributes` / `setAttributes` (this spec is the refactor target) |
| Target files   | `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` (`executeSetVariables`) + `rtds/components/setVariables.js` (canvas twin, lockstep) |

## Why the rename

`SetAttributes` writes flat `varObj[Key] = value`. `SetVariables` keeps that as the
default but generalises the **destination** to a dotted path and the **value** to
its native JSON type. The new name reflects that it sets *variables anywhere in
the reachable scope* — not just flat call-scoped attributes.

`SetAttributes` was a **hard cut** — only `SetVariables` is registered; there is no
back-compat alias (see [Migration](#migration)).

## Business purpose

Write one or more session variables in a single hop. Thread state through the
flow — flag whether the caller authenticated, store a chosen language, persist a
customer-key lookup result, stage routing tokens, or build a nested config bag for
a downstream operation. The destination defaults to the call-scoped store
(`varObj`) but may target `globalThis`, or any reachable object, via dot notation.

### Inputs (Params)

| Param name        | Type    | Required  | Default | Description                                                                                                                                  |
| ----------------- | ------- | --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Active`          | boolean | no        | `false` | Boolean `true`/`false` only. If `false` (or absent), the operation logs a skip and exits to `NextStep`. Universal across operations.          |
| `NextStep`        | string  | yes       | —       | Continuation after the writes (always taken in active mode).                                                                                  |
| `<target path>`   | any     | yes (≥1)  | —       | Every other Param. The **key** is a write target (see [Target resolution](#target-resolution)); the **value** is written with its native JSON type (see [Value typing](#value-typing)). Control keys (`Active`, `NextStep`) are excluded. |

### Outputs

| Branch key | Taken when                | Fallback |
| ---------- | ------------------------- | -------- |
| `NextStep` | Always (the only branch). | `-1`     |

## Target resolution

The Param **key** is a dot-separated path. The first segment selects the **root
object**; the remaining segments are a nested path under that root.

| Key form                  | Root resolved to | Writes                                            |
| ------------------------- | ---------------- | ------------------------------------------------- |
| `customerType`            | `varObj`         | `varObj.customerType` (bare key → varObj)         |
| `varObj.customerType`     | `varObj`         | `varObj.customerType` (explicit, same)            |
| `varObj.auth.verified`    | `varObj`         | `varObj.auth.verified` (nested)                   |
| `globalThis.debugCall`    | `globalThis`     | `globalThis.debugCall`                            |
| `someObj.a.b` (someObj reachable) | `someObj` | `someObj.a.b` (named reachable object)            |
| `auth.verified` (no such root) | `varObj`    | `varObj.auth.verified` (unrecognised root → varObj) |

Rules:

1. **No dot → `varObj`.** A bare key is shorthand for `varObj.<Key>`. This is the
   default and the overwhelmingly common case — see [conventions/storage.md](../../conventions/storage.md):
   *all call-scoped data lives on `varObj`.*
2. **First segment is the root, when it names one.** `varObj`, `globalThis`/`global`,
   or the name of an object **already reachable** in scope. The runtime does **not**
   create a new root global (that would silently mint undeclared globals and bypass the
   `_rt*` namespace discipline). If the first segment names no recognised root, the
   **whole path nests under `varObj`** — e.g. `auth.verified` → `varObj.auth.verified`.
   The only skip-with-warning case is an explicit `globalThis`/`global` that resolves to
   a non-object scope.
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

**The JSON type is authoritative.** A quoted `"123456"` is written as the **string**
`"123456"`; an unquoted `123456` is written as the **number** `123456`. The operator
controls the type by quoting (or not) in the Params JSON — the runtime never re-types a
value.

Only **string** values are processed: trimmed, and token placeholders resolved against
the scope (the same `resolveTokens` substitution the other operations use). A resolved
string **stays a string** — `"n=${count}"` → `"n=5"`, and even a fully-tokened
`"${count}"` resolves to a string, never the number `5`. Booleans, numbers, null,
arrays, and objects pass through untouched.

`Active` is the one coercion: it is read as a strict Boolean (`true`/`false`).

## Runtime handler — `executeSetVariables(op)`

Lives in [rtds_2_runtime.js](../../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js).
Same dispatch contract as the other JS handlers (returns `{ nextStepId }`; the
dispatch model is out of scope for this spec and unchanged by it).

```
function executeSetVariables(op) {
  var params = op.params;
  if (!params) { return { nextStepId: null }; }

  var CONTROL = { active: 1, nextstep: 1 };

  var keys = Object.keys(params);
  var written = 0;
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (CONTROL[String(key).toLowerCase()]) { continue; }

    var raw = getParam(op, key, null);          // unwrap array form, keep native type
    var value = (typeof raw === "string") ? resolveTokens(raw) : raw;  // strings only
    setVariable(key, value);                    // dot-path write (below)
    written++;
  }

  var nextStepId = resolveNextStep(op, null);
  Logger.debug("[RTDS] SetVariables done", { opName: op.name, written: written, nextStep: nextStepId || "(none)" });
  return { nextStepId: nextStepId };
}
```

### `setVariable(path, value)` — the dot-path write helper

Lives in the env library, [rtds_3_vocallsEnv.js](../../projects/rtds-runtime/globalLibraries/active/rtds_3_vocallsEnv.js),
next to `getScoped` (its read-side counterpart). Shipped behavior:

```
function setVariable(path, value) {
  var segments = String(path).split(".");

  // 1. Resolve root. Bare key → varObj. With a dot, the first segment is the
  //    root ONLY when resolveRoot recognises it; otherwise the whole path
  //    nests under varObj.
  var root, startIndex;
  if (segments.length === 1) {
    root = varObj; startIndex = 0;
  } else {
    root = resolveRoot(segments[0]);
    if (root) {
      startIndex = 1;
    } else {
      root = varObj; startIndex = 0;   // unrecognised root → nest under varObj
    }
  }

  if (!root || typeof root !== "object") {
    Logger.warn("[setVariable] unknown or non-object root — skipped", { path: path, root: segments[0] });
    return;
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

`resolveRoot(name)` returns the root object, or `null` when `name` is not a recognised
root (which makes `setVariable` nest under `varObj`):
- `"varObj"` → `varObj`
- `"globalThis"` / `"global"` → the global scope object
- any other name that already exists in scope as an object → that object
- otherwise → `null` (never auto-creates a new root global)

ES5.1 throughout (no `let`/`const`/arrow/`??`; the global-scope pick is the existing
`typeof global !== 'undefined' ? global : globalThis` ladder).

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

var __CONTROL_KEYS = { Active: 1, NextStep: 1 };
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

`SetAttributes` was a **hard cut** to `SetVariables` — there is **no back-compat
alias**. The runtime registers `SetVariables` only:
`registerRtdsOperation('SetVariables', executeSetVariables)`. A routing table that
still emits `SetAttributes` hits the unregistered-type path (runStep skips it to its
`NextStep` with a warning), so routing tables **must** be re-pointed to `SetVariables`.

- Re-point every routing table from `SetAttributes` → `SetVariables` (bare flat keys
  behave identically; the new dot-path / native-type behavior is purely additive).
- `setVariables.js` is the forward component; the old `setAttributes.js` is retained
  only for reference until flows are migrated.

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

## Known limitations / future work

- **Array-index paths** (`list.0.id`) are **not yet supported** — dot segments address
  object keys only. A numeric segment today creates a string-keyed object property
  (`list = { "0": { id: … } }`), not an array slot. Array targeting is a likely future
  enhancement; until then, write whole arrays as a single value
  (`"list": [{ "id": 1 }]`) rather than addressing individual slots.

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
