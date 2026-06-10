# Pattern: SetVariables (formerly SetAttributes)

Use for any Type whose work body's job is to **write Param values out to
global variables**. The reference Type is `SetVariables` — the canonical name
that hard-cut and superseded `SetAttributes` (which now survives only as the
`SetAttributes` registry alias routing to the same `set_variables`
exit). The same pattern applies to any thin attribute-projection operation.

Logging discipline lives in [logging.md](../../conventions/logging.md).
Two logs is enough: skip (info) and the terminal outcome (info).
Per-key logs inside the walk are noise — the init-node debug dump
already shows what's being written.

**`__rtOutcome` staging.** The work body stages an outcome KEY into the
local `__rtOutcome` (plain `=`, the literal Params key name); the output
node (id=6 OnEnter) resolves it to `global[_rtNextStep]` once with
`global[_rtNextStep] = getValue(__rtParams, __rtOutcome, -1);`. Init
pre-stages `__rtOutcome = 'NextStep_Failure';`, so the success key is only
staged **after** the walk — if the walk throws, the staged failure stands
and the flow hasn't advanced.

## Skeleton

```js
__rtOutcome = 'NextStep';

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[<componentName>] skipped — inactive', { outcome: __rtOutcome });
    return;
}

var __CONTROL_KEYS = { Active: 1, NextStep: 1, LogAttributes: 1 };
var __written = 0;

__rtOutcome = 'NextStep_Failure';

walk(__rtParams, function (key, value) {
    if (__CONTROL_KEYS[key]) return;
    global[key] = value;
    __written++;
});

__rtOutcome = 'NextStep';
Logger.info('[<componentName>] wrote attributes', { count: __written, outcome: __rtOutcome });
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
- The `'NextStep'` outcome is staged **after** the walk — if the walk
  throws, the failure outcome staged by init (and re-staged before the
  walk) stands, so the flow hasn't advanced.

## Params

Whatever the operator wants to set. There is no fixed schema — that's the
point of `SetVariables`. The runtime spec
[`../RTDS_runtime_spec.md §3`](../RTDS_runtime_spec.md) covers how the
written globals interact with the rest of the call.
