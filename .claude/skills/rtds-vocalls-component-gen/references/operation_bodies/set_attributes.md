# Pattern: SetVariables (formerly SetAttributes)

Use for any Type whose work body's job is to **write Param values out to
global variables**. The reference Type is `SetVariables` — the canonical name
that hard-cut and superseded `SetAttributes` (which now survives only as the
`SetAttributes_vocalls` registry alias routing to the same `set_variables`
exit). The same pattern applies to any thin attribute-projection operation.

Logging discipline lives in [logging.md](../../conventions/logging.md).
Two logs is enough: skip (info) and the terminal outcome (info).
Per-key logs inside the walk are noise — the init-node debug dump
already shows what's being written.

## Skeleton

```js
if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[<componentName>] skipped — inactive', { nextStep: __rtNextStep });
    return;
}

var __CONTROL_KEYS = { Active: 1, NextStep: 1, LogAttributes: 1 };
var __written = 0;

walk(__rtParams, function (key, value) {
    if (__CONTROL_KEYS[key]) return;
    global[key] = value;
    __written++;
});

global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);
Logger.info('[<componentName>] wrote attributes', { count: __written, nextStep: global[_rtNextStep] });
```

**Why this shape**

- `walk` **preserves casing** on the write side; `getValue` is
  case-insensitive on the read side. That asymmetry is deliberate — the
  operator's chosen casing in `__configJSON` becomes the output contract
  (`customerType`, `language`, etc.). Do not normalise it.
- `__CONTROL_KEYS` skips keys that have meaning to the component itself
  (the `Active` flag, the `NextStep` Id, optional `LogAttributes` toggle).
  Extend this map if you add new control keys. The `__` prefix is
  mandatory per [naming.md](../../conventions/naming.md) — every
  `var`-declared local in component code carries it. `walk`'s callback
  parameters (`key`, `value`) stay bare because they're function-signature
  bindings.
- The `count` field in the outcome log is the one number worth recording —
  a "wrote attributes" line with `count: 0` is a real signal that the
  Params shape is wrong.
- `NextStep` is assigned **after** the walk — if the walk throws, the
  flow hasn't advanced.

## Params

Whatever the operator wants to set. There is no fixed schema — that's the
point of `SetVariables`. The runtime spec
[`../RTDS_runtime_spec.md §3`](../RTDS_runtime_spec.md) covers how the
written globals interact with the rest of the call.
