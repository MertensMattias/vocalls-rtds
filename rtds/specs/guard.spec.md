---
status: spec-only
catalog:
  operation: "guard"
  legacy: false
  pattern: "`gui_exit` (dispatcher → GuardRouting)"
  component: null
  componentMark: "—"
  runtimeCell: "GUI-exit `guard_routing` (`Guard_vocalls`)"
  seed: "✅"
---

# Operation Spec — guard (Guard)

| Field          | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Operation Type | `Guard`                                                    |
| Component name | `guard`                                                    |
| Pattern        | `gui_exit` (thin dispatcher into the downstream GuardRouting component) |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_Guard.xml`  |
| Target file    | `rtds/components/guard.js`              |

## Business purpose

Entry-point for the on-call-guard ("standby agent") feature. Validates whether the guard service is active for this flow and, if so, hands control to the `GuardRouting` operation that fans out the guard search (try each guard in turn, place an outbound call, transfer the caller on accept, fall through on decline/no-answer). The thin wrapper exists so flow authors can drop a single Guard node into their flow without configuring the much heavier GuardRouting Params manually.

### Inputs (Params)

| Param name  | Type             | Required | Default | Description                                                                                |
| ----------- | ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------ |
| `Active`    | boolean          | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.  |
| `GuardId`   | string (pipe-delimited config) | yes | — | Pre-built guard configuration. Contains the guard pool ID, the per-guard list, timeouts, dial groups, and any post-call switches (SMS, email, voicemail). Format is operator-defined — typically `<configId>|<dialGroup>|<timeout>|<flags>`. |
| `NextStep`  | string (step ID) | yes      | —       | Continuation when the guard search ultimately fails (no guard accepted within the loop budget) or the operation is inactive. |

### Outputs

| Branch key  | Taken when                                                                                  | Fallback |
| ----------- | ------------------------------------------------------------------------------------------- | -------- |
| `NextStep`  | Operation is inactive, the guard search ran but no guard accepted, or `GuardId` was unparseable. | `-1`     |

A successful guard accept terminates the IVR session by bridging the caller to the guard — there is no in-IVR continuation.

### Component structure

Single-script work body that splits `GuardId` into its constituent fields, projects them as session vars, then sets `_rtNextStep` to a sentinel that the downstream `guardRouting` component picks up.

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[guard] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[guard] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __guardId = getValue(__rtParams, 'GuardId', '');
if (!__guardId) { Logger.warn('[guard] missing GuardId', { nextStep: global[_rtNextStep] }); return; }

var __parts = String(__guardId).split('|');
global.RTDS_OP_GuardConfigId = __parts[0] || '';
global.RTDS_OP_GuardDialGroup = __parts[1] || '';
global.RTDS_OP_GuardTimeout = __parts[2] || '';
global.RTDS_OP_GuardFlags = __parts[3] || '';

Logger.info('[guard] handoff', { configId: global.RTDS_OP_GuardConfigId, nextStep: global[_rtNextStep] });
```

`output`:

```js
OnEnter: Logger.info('[guard] exit', { nextStep: __rtNextStep });
```

### Open questions

- The pipe-delimited `GuardId` format is operator-conventional, not a stable contract. Confirm the field order (`configId | dialGroup | timeout | flags`) — the spec assumes that order but the source handler reads fields by position without naming them.
- The source handler is a thin wrapper that delegates to `NAllo_RTDS_GuardRouting`. In Vocalls there is no cross-component subroutine call; instead, the flow author wires this `guard` node directly to a `guardRouting` node. Confirm this is the intended flow shape rather than folding everything into one component.
- The `Active` check in the source allows the value `"No"` or `"0"` to mean inactive. The Vocalls `__setupConfig` coerces `Active` via `Boolean(...)`. Confirm `"No"` is acceptable as an inactive trigger (it would coerce truthy by `Boolean`).
- Confirm whether `Guard` should also accept individual Params (`ConfigId`, `DialGroup`, `Timeout`) directly, bypassing the pipe-delimited `GuardId`.
