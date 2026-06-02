---
status: spec-only
catalog:
  operation: "ivrLogging"
  legacy: false
  pattern: "`http_call`"
  component: null
  componentMark: "⬜"
  runtimeCell: "⬜ not registered"
  seed: "⬜"
---

# Operation Spec — ivrLogging (IVRLogging)

| Field          | Value                                                            |
| -------------- | ---------------------------------------------------------------- |
| Operation Type | `IVRLogging`                                                     |
| Component name | `ivrLogging`                                                     |
| Pattern        | `http_call` (writes to the RTDS logging endpoint) — see "Open questions" for the alternative `set_attributes` framing |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_IVRLogging.xml`   |
| Target file    | `rtds/components/ivrLogging.js`               |

## Business purpose

Append a structured event to the call's IVR audit trail. Used to record significant flow milestones (caller entered queue X, caller chose option Y, system fell back to overflow Z) so post-call analytics and live monitoring dashboards can reconstruct what happened.

### Inputs (Params)

| Param name   | Type                          | Required | Default       | Description                                                                                                                          |
| ------------ | ----------------------------- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Active`     | boolean                       | no       | `false`       | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                            |
| `Action`     | string (enum)                 | yes      | —             | One of `AddLog`, `ExtraLog`, `SetBasePath`, `Disconnect`, `FlowJump`. Selects the log shape and persistence path.                     |
| `Parameter`  | string                        | no       | `''`          | Action-specific payload: for `AddLog` / `ExtraLog`, the message string; for `SetBasePath`, the routing path.                          |
| `Timeout`    | number (ms)                   | no       | `5000`        | HTTP request timeout (`http_call` shape).                                                                                             |
| `NextStep`   | string (step ID)              | yes      | —             | Continuation after the log write (or skip).                                                                                           |

### Outputs

| Branch key  | Taken when                                                          | Fallback |
| ----------- | ------------------------------------------------------------------- | -------- |
| `NextStep`  | Always (fail-open: a log write failure must not stall the flow).    | `-1`     |

### External call

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                        |
| Endpoint var | `_rtLogEndpoint` → `__rtEndpoint`                   |
| Method       | `POST`                                             |
| Timeout      | `getValue(__rtParams, 'Timeout', 5000)` ms         |

Payload skeleton:

```json
{
  "callId":   "<implicit, from context>",
  "action":   "AddLog" | "ExtraLog" | "SetBasePath" | "Disconnect" | "FlowJump",
  "value":    "<Parameter>",
  "ts":       "<ISO-8601 UTC, from nowUTC()>"
}
```

### Component structure

Standard `http_call` shape.

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[ivrLogging] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[ivrLogging] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __action = String(getValue(__rtParams, 'Action', ''));
if (!__action) { Logger.warn('[ivrLogging] missing Action', { nextStep: global[_rtNextStep] }); return; }

var __url = __rtBaseUrl + __rtEndpoint;
var __timeout = getValue(__rtParams, 'Timeout', 5000);
var __payload = {
    action: __action,
    value:  getValue(__rtParams, 'Parameter', ''),
    ts:     nowUTC()
};

return jsonHttpRequest(__url, { method: 'POST', "timeout": __timeout }, _headers, __payload).then(
    function (result) {
        if (result && result.success === true) {
            Logger.info('[ivrLogging] persisted', { action: __action, nextStep: global[_rtNextStep] });
            return;
        }
        Logger.warn('[ivrLogging] persist failed (fail-open)', { action: __action, statusCode: result && result.statusCode, nextStep: global[_rtNextStep] });
    },
    function (err) { Logger.error('[ivrLogging] persist error (fail-open)', { nextStep: global[_rtNextStep] }, err); }
);
```

`output`:

```js
OnEnter: Logger.info('[ivrLogging] exit', { nextStep: __rtNextStep });
```

### Open questions

- The source handler writes to two SQL stored procedures (`sp_AddIVRLog`, `AttributeLogging`) via PureConnect's `LogCustomPassthrough`, and maintains two call attributes (`RTDS_IVRLogging`, `RTDS_ATTRLogging_Seq`) as in-memory buffers. The Vocalls version assumes a REST logging endpoint instead. Confirm whether the operator wants:
  1. REST endpoint (this spec), or
  2. Pure `set_attributes` style (write to local session attributes that an out-of-band collector ships to SQL), or
  3. Both (write locally for the current call, also POST so the central log is live).
- The `SetBasePath` action is meaningful only inside `FlowJump`'s scope — confirm whether the operator wants it as a separate Param-driven branch, or whether `FlowJump` should emit its own implicit log entry.
- `Disconnect` and `FlowJump` actions look like markers that PureConnect's logger needed; in Vocalls they collapse into the corresponding operation's own `Logger.info('[disconnect] exit', ...)` / `[flowJump]` lines and may not need a separate `IVRLogging` call. Confirm whether to retain them.
- Reference component file does not yet exist — generate from this spec via `rtds-vocalls-component-gen` once contracts are confirmed.
