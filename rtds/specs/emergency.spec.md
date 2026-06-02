---
status: spec-only
catalog:
  operation: "emergency"
  legacy: false
  pattern: "`http_call` (multi-branch)"
  component: null
  componentMark: "⬜"
  runtimeCell: "⬜ not registered"
  seed: "⬜"
---

# Operation Spec — emergency (Emergency)

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| Operation Type | `Emergency`                                                    |
| Component name | `emergency`                                                    |
| Pattern        | `http_call` (multi-branch — branch by `result.action`)         |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_Emergency.xml`  |
| Target file    | `rtds/components/emergency.js`              |

## Business purpose

Check whether an emergency event is currently active for the configured emergency profile and route the caller accordingly: transfer to an emergency external number, disconnect with an announcement, or continue the normal flow. Used at the head of a flow so that incidents (outages, business interruption, evacuation) can be announced and the call handled without a manual re-config.

### Inputs (Params)

| Param name             | Type                  | Required | Default | Description                                                                                                                            |
| ---------------------- | --------------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Active`               | boolean               | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                              |
| `EmergencyId`          | string                | yes      | —       | Emergency profile identifier — passed to the Emergency API to resolve the current state.                                                |
| `Reference`            | string                | no       | `''`    | Operator-supplied tag echoed in the API request (for audit).                                                                            |
| `PhoneNumber`          | string (E.164)        | no       | `''`    | Override destination for the `Transfer` action. If empty, the destination is taken from the API response.                              |
| `Prompt`               | string                | no       | `''`    | Prompt played before the action takes effect (announcement / explanation). Resolved upstream by a `PlayPrompt` operation if needed.    |
| `Timeout`              | number (ms)           | no       | `10000` | HTTP request timeout.                                                                                                                  |
| `NextStep`             | string (step ID)      | yes      | —       | Continuation when the operation is inactive.                                                                                            |
| `NextStep_Continue`    | string (step ID)      | yes      | —       | Continuation when the API returned `action: "Continue"` (no emergency active).                                                          |
| `NextStep_Transfer`    | string (step ID)      | yes      | —       | Continuation when the API returned `action: "Transfer"` (after the runtime hands off to the configured external transfer).             |
| `NextStep_Disconnect`  | string (step ID)      | yes      | —       | Continuation when the API returned `action: "Disconnect"` (typically routed straight to a `Disconnect` operation).                     |
| `NextStep_Failure`     | string (step ID)      | yes      | —       | Continuation on HTTP error, missing required Params, or unknown action.                                                                 |

### Outputs

| Branch key            | Taken when                                                                                | Fallback |
| --------------------- | ----------------------------------------------------------------------------------------- | -------- |
| `NextStep`            | Operation is inactive — skipped.                                                          | `-1`     |
| `NextStep_Continue`   | API returned `action: "Continue"`.                                                        | `-1`     |
| `NextStep_Transfer`   | API returned `action: "Transfer"`.                                                        | `-1`     |
| `NextStep_Disconnect` | API returned `action: "Disconnect"`.                                                      | `-1`     |
| `NextStep_Failure`    | API returned an unknown action, returned a non-success, or the HTTP call errored.         | `-1`     |

### External call

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                        |
| Endpoint var | `_rtEmergencyEndpoint` → `__rtEndpoint`             |
| Method       | `GET`                                              |
| Timeout      | `getValue(__rtParams, 'Timeout', 10000)` ms        |

URL shape: `__rtBaseUrl + __rtEndpoint + '/' + EmergencyId + '/state'`.

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "body": {
    "action": "Continue" | "Transfer" | "Disconnect",
    "phoneNumber": "+32...",          // only on Transfer
    "promptId": "Emergency_Closed"     // optional
  }
}
```

### Component structure

Standard `http_call` shape with a switch on `result.response.action`.

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[emergency] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[emergency] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __id = getValue(__rtParams, 'EmergencyId', '');
if (!__id) {
    Logger.warn('[emergency] missing EmergencyId', { nextStep: global[_rtNextStep] });
    return;
}

global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', -1);

var __url = __rtBaseUrl + __rtEndpoint + '/' + encodeURIComponent(__id) + '/state';
var __timeout = getValue(__rtParams, 'Timeout', 10000);

return jsonHttpRequest(__url, { method: 'GET', "timeout": __timeout }, _headers, null).then(
    function (result) {
        if (!result || result.success !== true || !result.response) {
            Logger.warn('[emergency] api failed', { statusCode: result && result.statusCode, nextStep: global[_rtNextStep] });
            return;
        }
        var __action = String(result.response.action || '');
        if (__action === 'Continue') {
            global[_rtNextStep] = getValue(__rtParams, 'NextStep_Continue', -1);
        } else if (__action === 'Transfer') {
            global[_rtNextStep] = getValue(__rtParams, 'NextStep_Transfer', -1);
            setVariable('PhoneNumber', result.response.phoneNumber || getValue(__rtParams, 'PhoneNumber', ''));
        } else if (__action === 'Disconnect') {
            global[_rtNextStep] = getValue(__rtParams, 'NextStep_Disconnect', -1);
        } else {
            Logger.warn('[emergency] unknown action', { action: __action, nextStep: global[_rtNextStep] });
            return;
        }
        Logger.info('[emergency] action', { action: __action, nextStep: global[_rtNextStep] });
    },
    function (err) { Logger.error('[emergency] request error', { nextStep: global[_rtNextStep] }, err); }
);
```

`output`:

```js
OnEnter: Logger.info('[emergency] exit', { nextStep: __rtNextStep });
```

### Open questions

- The source handler also handles "RTDS Compatibility Check" for an older response shape that used a single boolean field. Confirm that the modern API always returns `{ action, ... }` and the compatibility branch can be dropped.
- On `Transfer`, the source handler picks up an external phone number from the response. Modelling here is to set `varObj.PhoneNumber` (call-scoped) so a downstream `ExternalTransfer` operation can pick it up via `getScoped('PhoneNumber')`. Confirm whether the operator wants a dedicated `OutputAttribute` Param instead.
- The source handler plays an emergency prompt before acting, via `NAllo_RTDS_Play`. The Vocalls flow models prompt-playing as a separate `PlayPrompt` upstream — confirm the flow author will model "announce, then act" as two operations.
- The source has a `NAllo_SelectAnonymousTrunk` helper for outbound-line selection. That's PureConnect telephony concern — confirm Vocalls handles trunk selection internally.
