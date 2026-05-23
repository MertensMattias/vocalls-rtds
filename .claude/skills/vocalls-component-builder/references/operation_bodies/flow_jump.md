# Pattern: FlowJump (session-state mutation, no NextStep branching)

`FlowJump` is the one Type that doesn't fit `http_call` / `gui_exit` /
`set_attributes` / `condition`. It replaces the active SourceId so the
next operation lookup happens against a different RTDS flow. There is no
network call and no GUI handoff — just session-variable surgery.

Logging discipline lives in [`../conventions.md §3`](../conventions.md).

## Skeleton

```js
if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[flowJump] skipped — inactive', { nextStep: __rtNextStep });
    return;
}

var __targetSourceId = getValue(__rtParams, 'SourceId', '');
if (!__targetSourceId) {
    global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', -1);
    Logger.warn('[flowJump] missing SourceId', { nextStep: global[_rtNextStep] });
    return;
}

context.session.variables.RTDS_sourceId    = __targetSourceId;
context.session.variables.RTDS_currentOpId = '';
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);
Logger.info('[flowJump] jumped', { sourceId: __targetSourceId, nextStep: global[_rtNextStep] });
```

**Why this shape**

- Clearing `RTDS_currentOpId` forces the runtime to re-resolve "first
  operation" against the new SourceId on re-entry, rather than continuing
  from a stale position.
- The missing-SourceId branch is the one real error path — `warn`
  because it's a caller misconfiguration, not infrastructure failure.
- `sourceId` is the one field worth recording in the success log —
  it's *what* changed, which is the whole point of FlowJump.
- `var __targetSourceId` follows the `__`-prefix-on-every-var rule per
  [conventions.md §5](../conventions.md).

## Params

- `Active` — `true` to fire.
- `SourceId` — the target flow's SourceId. Required.
- `NextStep` — optional landing step in the new flow.
- `NextStep_Failure` — optional landing step if `SourceId` is missing.

See [`../RTDS_runtime_spec.md §1.5`](../RTDS_runtime_spec.md) for the
authoritative Params shape.
