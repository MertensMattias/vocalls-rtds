# Pattern: FlowJump (session-state mutation, no NextStep branching)

`FlowJump` is the one Type that doesn't fit `http_call` / `gui_exit` /
`set_attributes` / `condition`. It replaces the active SourceId so the
next operation lookup happens against a different RTDS flow. There is no
network call and no GUI handoff — just session-variable surgery.

Logging discipline lives in [logging.md](../../conventions/logging.md).

**`__rtOutcome` staging.** The work body stages an outcome KEY into the
local `__rtOutcome` (plain `=`, the literal camelCase Params key name); the
output node (id=6 OnEnter) resolves it to the bare flow variable `_rtNextStep`
once with `_rtNextStep = __getValue(__rtParams, __rtOutcome, '');` (fallback
`''`, **not** `global[_rtNextStep]` and **not** `-1`). Init seeds the
did-nothing default `'nextStep'`; the missing-SourceId guard pivots to
`'nextStep_Failure'`; the success path stages `'nextStep'`. See
[component-v2.md §6–§8](../../conventions/component-v2.md).

## Skeleton

```js
if (String(__getValue(__rtParams, 'active', false)).toLowerCase() !== 'true') {
    Logger.info('[flowJump] skipped — inactive', { outcome: __rtOutcome });
    return;
}

var __targetSourceId = __getValue(__rtParams, 'sourceId', '');
if (!__targetSourceId) {
    __rtOutcome = 'nextStep_Failure';
    Logger.warn('[flowJump] missing sourceId', { outcome: __rtOutcome });
    return;
}

context.session.variables.RTDS_sourceId    = __targetSourceId;
context.session.variables.RTDS_currentOpId = '';
__rtOutcome = 'nextStep';
Logger.info('[flowJump] jumped', { sourceId: __targetSourceId, outcome: __rtOutcome });
```

**Why this shape**

- Clearing `RTDS_currentOpId` forces the runtime to re-resolve "first
  operation" against the new SourceId on re-entry, rather than continuing
  from a stale position.
- The missing-SourceId branch is the one real error path — `warn`
  because it's a caller misconfiguration, not infrastructure failure. It
  pivots to the `'nextStep_Failure'` outcome.
- `sourceId` is the one field worth recording in the success log —
  it's *what* changed, which is the whole point of FlowJump.
- `var __targetSourceId` follows the `__`-prefix-on-every-var rule per
  [naming.md](../../conventions/naming.md).

## Params

- `active` — `true` to fire.
- `sourceId` — the target flow's SourceId. Required.
- `nextStep` — optional landing step in the new flow.
- `nextStep_Failure` — optional landing step if `sourceId` is missing.

See [`../RTDS_runtime_spec.md §1.5`](../RTDS_runtime_spec.md) for the
authoritative Params shape.
