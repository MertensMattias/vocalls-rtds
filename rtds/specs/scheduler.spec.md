---
status: spec-only
catalog:
  operation: "scheduler"
  legacy: false
  pattern: "`http_call` (multi-branch)"
  component: "checkSchedule.js"
  componentMark: "✅"
  runtimeCell: "⬜ not registered"
  seed: "⬜"
---

# Operation Spec — checkSchedule (Schedule)

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| Operation Type | `Schedule`                                                     |
| Component name | `checkSchedule` (matches existing reference at `rtds/components/checkSchedule.js`) |
| Pattern        | `http_call` (multi-branch — branch by `result.response.action`)    |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_Scheduler.xml`  |
| Target file    | `rtds/components/checkSchedule.js`          |

## Business purpose

Query the Schedule API for a configured schedule (typically a per-flow open/closed/holiday calendar) and branch on the returned action. Used at the head of a flow to gate inbound traffic by business hours, holidays, or scheduled maintenance windows.

### Inputs (Params)

| Param name              | Type             | Required | Default | Description                                                                                                                          |
| ----------------------- | ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Active`                | boolean          | no       | `true`  | If falsy, the operation logs a skip and exits to `NextStep`. Default `true` (runs unless explicitly disabled). **⚠ component reads `Active`-fallback `false` — see [Convention debt](#convention-debt).** |
| `ScheduleId`            | string           | yes      | —       | Schedule identifier passed to the Schedule API. Canonical name is `ScheduleId`. **⚠ the shipped component uses `ScheduleID` (uppercase `ID`)** — reads are case-insensitive via `getValue`, so it works, but the component key should be renamed to `ScheduleId`. |
| `Version`               | string           | no       | `'1'`   | API-shape selector carried from the source handler. (See open questions — likely droppable.)                                          |
| `InQueue`               | boolean          | no       | `false` | When true and the API returns a play-prompt action, also sets `rtPromptEscapeKey` from `getScoped('RTDS_EscapeKey')`.                 |
| `Timeout`               | number (ms)      | no       | `5000`  | HTTP request timeout. Component default in `__configJSON` is `5000`; `getValue(..., 'Timeout', 10000)` is the read fallback if absent. |
| `NextStep`              | string (step ID) | yes      | —       | Continuation when the operation is inactive, or when the returned action has no matching `NextStep_<Action>` Param.                   |
| `NextStep_Open`         | string (step ID) | yes      | —       | Continuation when the schedule reports `Open` (regular hours).                                                                        |
| `NextStep_Closed`       | string (step ID) | no       | `''`    | Continuation when the schedule reports `Closed`.                                                                                       |
| `NextStep_Transfer`     | string (step ID) | no       | `''`    | `Transfer` action; the component stashes the number in `varObj.SchedulerExternalNumber`.                                              |
| `NextStep_ExternalTransfer` | string (step ID) | no   | `''`    | `ExternalTransfer` action (same external-number stash as `Transfer`).                                                               |
| `NextStep_WorkgroupTransfer` | string (step ID) | no  | `''`    | `WorkgroupTransfer` action; stashes `varObj.SchedulerWorkgroup`.                                                                     |
| `NextStep_Disconnect`   | string (step ID) | no       | `''`    | Continuation when the API returns `Disconnect`.                                                                                        |
| `NextStep_Failure`      | string (step ID) | yes      | —       | Continuation on HTTP error or unknown/unmapped action.                                                                                 |

`NextStep_Holiday` is **not** in the shipped component's `__configJSON` defaults — branch resolution is dynamic (`'NextStep_' + action`), so any `NextStep_<State>` the operator declares is honoured (incl. `Holiday`), but it is not seeded by default. The `Reference` Param from the original spec is not present in the component.

### Outputs

| Branch key             | Taken when                                                                          | Fallback |
| ---------------------- | ----------------------------------------------------------------------------------- | -------- |
| `NextStep`             | Operation inactive, missing `ScheduleId`, or the action has no matching branch key. | `''`     |
| `NextStep_Open`        | API returned `action: "Open"`.                                                      | `''`     |
| `NextStep_Closed`      | API returned `action: "Closed"`.                                                    | `''`     |
| `NextStep_Transfer` / `NextStep_ExternalTransfer` | API returned `Transfer` / `ExternalTransfer`.            | `''`     |
| `NextStep_WorkgroupTransfer` | API returned `WorkgroupTransfer`.                                             | `''`     |
| `NextStep_Disconnect`  | API returned `action: "Disconnect"`.                                                | `''`     |
| `NextStep_Failure`     | Non-success or the HTTP call errored. (An action with **no** matching `NextStep_<Action>` key falls back to `NextStep`, with a warn.) | `''`     |

The set of `NextStep_<State>` Params is open-ended — the operator may add more states (e.g. `Lunch`, `Maintenance`) by declaring matching Params and having the schedule API return those state names. The component resolves the branch dynamically as `'NextStep_' + action` (spaces stripped).

The **target** routing is `__rtOutcome` staging resolved once at the output node — `global[_rtNextStep] = getValue(__rtParams, __rtOutcome, '')` — like every other v2 component ([conventions/component-v2.md](../../conventions/component-v2.md) §7–§8). See [Convention debt](#convention-debt) for the gap.

### External call

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                        |
| Endpoint var | `_rtScheduleEndpoint` → `__rtEndpoint`              |
| Method       | `GET`                                              |
| Timeout      | `Number(getValue(__rtParams, 'Timeout', 10000))` ms |

URL shape: `__rtBaseUrl + __rtEndpoint + '/' + encodeURIComponent(ScheduleId) + '/status?date=' + encodeURI(<now>)` where `<now>` is `YYYY-MM-DD HH:MM:SS` (`toISOString` date + `toLocaleTimeString('fr')`). (Shipped component currently reads the key as `ScheduleID`.)

Response is read off **`result.response`** (the `jsonHttpRequest` `{ success, response }` shape — not `result.body`):

```json
{
  "action": "Open" | "Closed" | "Transfer" | "ExternalTransfer" | "WorkgroupTransfer" | "Disconnect" | "...",
  "isOpen": true,                       // logged as open/closed
  "actionDetail": "+32...",             // external number on (External)Transfer
  "actionTransferWorkgroup": "sales",   // workgroup on WorkgroupTransfer
  "actionPlayPrompt": true,             // optional: stage a prompt
  "actionPromptName": "Schedule_Closed" // prompt id when actionPlayPrompt
}
```

Side-effects the component writes via `setVariable` before branching: `SchedulerExternalNumber` (on Transfer/ExternalTransfer), `SchedulerWorkgroup` (on WorkgroupTransfer), and `rtPromptList` (+ `rtPromptEscapeKey` when `InQueue`) when `actionPlayPrompt` is set.

### Component structure

Four-node `http_call` shape with a **dynamic** branch lookup (`'NextStep_' + action`). The block below shows the **shipped** body (currently direct-write `global[_rtNextStep]`); the **target** is `__rtOutcome` staging resolved once at output — see [Convention debt](#convention-debt).

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[checkSchedule] config resolved', { params: __rtParams });
```

`script` (work body) — currently shipped (direct-write; target is `__rtOutcome` staging):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', '');

if (!getValue(__rtParams, 'Active', true)) {   // target: default true (shipped: false)
    Logger.info('[checkSchedule] skipped -- inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __scheduleId = getValue(__rtParams, 'ScheduleId', '');   // target key: ScheduleId (shipped: ScheduleID)
if (!__scheduleId) {
    Logger.warn('[checkSchedule] missing ScheduleId', { nextStep: global[_rtNextStep] });
    return;
}

global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', '');

var __now = new Date();
var __dt  = __now.toISOString().substring(0, 10) + ' ' + __now.toLocaleTimeString('fr');
var __url = __rtBaseUrl + __rtEndpoint + '/' + encodeURIComponent(__scheduleId) + '/status?date=' + encodeURI(__dt);
var __timeout = Number(getValue(__rtParams, 'Timeout', 10000));

var __request = null;
try {
    __request = jsonHttpRequest(__url, { 'timeout': +__timeout }, _headers);
} catch (e) {
    Logger.error('[checkSchedule] request threw', { url: __url, nextStep: global[_rtNextStep] }, e);
    return;
}

return __request.then(
    function (result) {
        if (!result || result.success !== true) {
            Logger.warn('[checkSchedule] request failed', { url: __url, statusCode: result && result.statusCode, nextStep: global[_rtNextStep] });
            return;
        }
        var __response = result.response || {};
        var __action = String(__response.action || '').replace(/\s+/g, '');
        var __actionLower = __action.toLowerCase();
        // ... setVariable side-effects for transfer / workgroup / play-prompt ...
        var __key = 'NextStep_' + __action;
        if (hasKey(__rtParams, __key)) {
            global[_rtNextStep] = getValue(__rtParams, __key, '');
            Logger.info('[checkSchedule] success', { action: __action, nextStep: global[_rtNextStep] });
        } else {
            global[_rtNextStep] = getValue(__rtParams, 'NextStep', '');
            Logger.warn('[checkSchedule] no branch for action', { action: __action, nextStep: global[_rtNextStep] });
        }
    },
    function (err) { Logger.error('[checkSchedule] request error', { url: __url, nextStep: global[_rtNextStep] }, err); }
);
```

`output` (`OnEnter`) — **target** is to resolve the staged outcome once (shipped: logs only, because the work body already wrote `_rtNextStep` direct):

```js
// target:
global[_rtNextStep] = getValue(__rtParams, __rtOutcome, '');
Logger.info('[checkSchedule] exit', { outcome: __rtOutcome, nextStep: global[_rtNextStep] });

// shipped today:
Logger.info('[checkSchedule] exit', { nextStep: __rtNextStep });
```

### Convention debt (flagged 2026-06-08)

This spec states the **target** contract. The shipped `checkSchedule.js` must be migrated to match on three points:

1. **`__rtOutcome` staging.** The component writes `global[_rtNextStep]` directly in the work body and the output node only logs (0 uses of `__rtOutcome`). Migrate to staging `__rtOutcome` and resolving once at output, like the other v2 components ([conventions/component-v2.md](../../conventions/component-v2.md) §7–§8).
2. **`Active` read fallback `false` → `true`.** Component reads `getValue(__rtParams, 'Active', false)`; target is `true`.
3. **Param key `ScheduleID` → `ScheduleId`.** Rename the `__configJSON` key and read to the canonical `ScheduleId` (reads are case-insensitive so behavior is unaffected; this is a naming-consistency fix).

### Open questions

- The source handler maintains a `Version` field on the Params (`"0"|"1"|"2"`) to switch between an old and a new API shape. Confirm the modern shape is the only one in scope and the Version Param can be dropped.
- On `Transfer`, the API returns a phone number. As with `Emergency`, the spec stashes it on `global.PhoneNumber` for a downstream `ExternalTransfer` — confirm whether an explicit `OutputAttribute` Param is preferred.
- The source handler also calls `NAllo_RTDS_IVRLogging` to log the action. The Vocalls version collapses that to `Logger.info` — confirm.
