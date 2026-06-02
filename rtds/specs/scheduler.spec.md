# Operation Spec — checkSchedule (Schedule)

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| Operation Type | `Schedule`                                                     |
| Component name | `checkSchedule` (matches existing reference at `rtds/components/checkSchedule.js`) |
| Pattern        | `http_call` (multi-branch — branch by `result.body.action`)    |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_Scheduler.xml`  |
| Target file    | `rtds/components/checkSchedule.js`          |

## Business purpose

Query the Schedule API for a configured schedule (typically a per-flow open/closed/holiday calendar) and branch on the returned action. Used at the head of a flow to gate inbound traffic by business hours, holidays, or scheduled maintenance windows.

### Inputs (Params)

| Param name              | Type             | Required | Default | Description                                                                                                                          |
| ----------------------- | ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Active`                | boolean          | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                            |
| `ScheduleId`            | string           | yes      | —       | Schedule identifier passed to the Schedule API.                                                                                       |
| `Reference`             | string           | no       | `''`    | Operator tag echoed in the API request.                                                                                               |
| `Timeout`               | number (ms)      | no       | `10000` | HTTP request timeout.                                                                                                                 |
| `NextStep`              | string (step ID) | yes      | —       | Continuation when the operation is inactive.                                                                                          |
| `NextStep_Open`         | string (step ID) | yes      | —       | Continuation when the schedule reports `Open` (regular hours).                                                                        |
| `NextStep_Closed`       | string (step ID) | no       | `-1`    | Continuation when the schedule reports `Closed`.                                                                                       |
| `NextStep_Holiday`      | string (step ID) | no       | `-1`    | Continuation when the schedule reports `Holiday`.                                                                                      |
| `NextStep_Transfer`     | string (step ID) | no       | `-1`    | Continuation when the API returns `Transfer` (out-of-hours forward).                                                                  |
| `NextStep_Disconnect`   | string (step ID) | no       | `-1`    | Continuation when the API returns `Disconnect`.                                                                                        |
| `NextStep_Failure`      | string (step ID) | yes      | —       | Continuation on HTTP error or unknown action.                                                                                          |

### Outputs

| Branch key             | Taken when                                                                          | Fallback |
| ---------------------- | ----------------------------------------------------------------------------------- | -------- |
| `NextStep`             | Operation is inactive — skipped.                                                    | `-1`     |
| `NextStep_Open`        | API returned `action: "Open"`.                                                      | `-1`     |
| `NextStep_Closed`      | API returned `action: "Closed"`.                                                    | `-1`     |
| `NextStep_Holiday`     | API returned `action: "Holiday"`.                                                   | `-1`     |
| `NextStep_Transfer`    | API returned `action: "Transfer"`.                                                  | `-1`     |
| `NextStep_Disconnect`  | API returned `action: "Disconnect"`.                                                | `-1`     |
| `NextStep_Failure`     | API returned an unknown action, a non-success, or the HTTP call errored.            | `-1`     |

The actual set of `NextStep_<State>` Params is open-ended — the operator may add more states (e.g. `Lunch`, `Maintenance`) by declaring matching Params and updating the schedule API to return those state names.

### External call

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                        |
| Endpoint var | `_rtScheduleEndpoint` → `__rtEndpoint`              |
| Method       | `GET`                                              |
| Timeout      | `getValue(__rtParams, 'Timeout', 10000)` ms        |

URL shape: `__rtBaseUrl + __rtEndpoint + '/' + ScheduleId + '/status'`.

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "body": {
    "action": "Open" | "Closed" | "Holiday" | "Transfer" | "Disconnect",
    "promptId": "Schedule_Closed",  // optional
    "phoneNumber": "+32..."          // only on Transfer
  }
}
```

### Component structure

Standard `http_call` shape with a dynamic branch lookup (`NextStep_<Action>` resolution is done by name).

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[checkSchedule] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[checkSchedule] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __id = getValue(__rtParams, 'ScheduleId', '');
if (!__id) {
    Logger.warn('[checkSchedule] missing ScheduleId', { nextStep: global[_rtNextStep] });
    return;
}

global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', -1);

var __url = __rtBaseUrl + __rtEndpoint + '/' + encodeURIComponent(__id) + '/status';
var __timeout = getValue(__rtParams, 'Timeout', 10000);

return jsonHttpRequest(__url, { method: 'GET', "timeout": __timeout }, _headers, null).then(
    function (result) {
        if (!result || result.success !== true || !result.body) {
            Logger.warn('[checkSchedule] api failed', { statusCode: result && result.statusCode, nextStep: global[_rtNextStep] });
            return;
        }
        var __action = String(result.body.action || '');
        var __branch = getValue(__rtParams, 'NextStep_' + __action, -1);
        if (__branch === -1) {
            Logger.warn('[checkSchedule] unmapped action', { action: __action, nextStep: global[_rtNextStep] });
            return;
        }
        global[_rtNextStep] = __branch;
        Logger.info('[checkSchedule] action', { action: __action, nextStep: global[_rtNextStep] });
    },
    function (err) { Logger.error('[checkSchedule] request error', { nextStep: global[_rtNextStep] }, err); }
);
```

`output`:

```js
OnEnter: Logger.info('[checkSchedule] exit', { nextStep: __rtNextStep });
```

### Open questions

- The source handler maintains a `Version` field on the Params (`"0"|"1"|"2"`) to switch between an old and a new API shape. Confirm the modern shape is the only one in scope and the Version Param can be dropped.
- On `Transfer`, the API returns a phone number. As with `Emergency`, the spec stashes it on `global.PhoneNumber` for a downstream `ExternalTransfer` — confirm whether an explicit `OutputAttribute` Param is preferred.
- The source handler also calls `NAllo_RTDS_IVRLogging` to log the action. The Vocalls version collapses that to `Logger.info` — confirm.
