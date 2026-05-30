# Operation Spec — condition (Condition)

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| Operation Type | `Condition`                                                    |
| Component name | `condition`                                                    |
| Pattern        | `condition`                                                    |
| Source handler | `rtds_pureconnect_handlers/handlers/NAllo_RTDS_Condition.xml`  |
| Target file    | `rtds_vocalls_operations/components/condition.js`              |

## Business purpose

Read a workgroup / queue statistic at the current moment, compare it to a configured value with a configured operator, and branch True / False. Used inside an ACD flow to decide e.g. "is the queue empty?", "is there an agent logged in?", "are we under the wait-time threshold?", or as a time-of-day predicate.

### Inputs (Params)

| Param name        | Type                          | Required | Default | Description                                                                                                                                            |
| ----------------- | ----------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Active`          | boolean                       | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                                              |
| `Statistic`       | string (enum)                 | yes      | —       | One of `TimeInQueue`, `PositionInQueue`, `EstimatedWaitTime`, `CallsWaiting`, `AgentsLoggedIn`, `AgentsAvailable`, `AgentsOnNonACDCalls`, `CurrentTime`, `CurrentDate`. |
| `Workgroup`       | string                        | yes (for queue-stats) | — | ACD workgroup the statistic is evaluated against. Ignored for `CurrentTime` / `CurrentDate`.                                                          |
| `Operator`        | string (enum)                 | yes      | —       | `eq`, `ne`, `gt`, `lt`, `ge`, `le`. Numeric operators only meaningful on numeric statistics.                                                            |
| `Value`           | string                        | yes      | —       | Comparison RHS. Parsed as a number for numeric statistics, as `HHMM` for `CurrentTime`, as `YYYYMMDD` for `CurrentDate`.                                |
| `NextStep`        | string (step ID)              | yes      | —       | Continuation when the operation is inactive or the statistic lookup fails. Universal across operations.                                                |
| `NextStep_True`   | string (step ID)              | yes      | —       | Continuation when the comparison is true.                                                                                                              |
| `NextStep_False`  | string (step ID)              | yes      | —       | Continuation when the comparison is false.                                                                                                             |

### Outputs

| Branch key        | Taken when                                                          | Fallback |
| ----------------- | ------------------------------------------------------------------- | -------- |
| `NextStep`        | Operation is inactive, or the statistic lookup failed.              | `-1`     |
| `NextStep_True`   | The comparison evaluated to true.                                   | `-1`     |
| `NextStep_False`  | The comparison evaluated to false.                                  | `-1`     |

### Component structure

Single-script work body. The statistic lookup happens via Vocalls' queue-stats helper (typically `context.queueStats[workgroup][statistic]`) — the exact runtime API is operator-specific.

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[condition] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[condition] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __stat = getValue(__rtParams, 'Statistic', '');
var __op = String(getValue(__rtParams, 'Operator', 'eq')).toLowerCase();
var __rhs = getValue(__rtParams, 'Value', '');
var __workgroup = getValue(__rtParams, 'Workgroup', '');

var __lhs;
try { __lhs = __readStatistic(__workgroup, __stat); }
catch (e) { Logger.warn('[condition] statistic lookup failed', { statistic: __stat, workgroup: __workgroup, nextStep: global[_rtNextStep] }); return; }

var __isMatch = __compareAttr(__lhs, __op, __rhs, __statTypeOf(__stat));
global[_rtNextStep] = getValue(__rtParams, __isMatch ? 'NextStep_True' : 'NextStep_False', -1);
Logger.info('[condition] evaluated', { statistic: __stat, op: __op, lhs: __lhs, rhs: __rhs, match: __isMatch, nextStep: global[_rtNextStep] });
```

`output`:

```js
OnEnter: Logger.info('[condition] exit', { nextStep: __rtNextStep });
```

The two operation-specific helpers (`__readStatistic`, `__statTypeOf`) live in the master `Code` block alongside the canonical `__compareAttr` helper (per [operation_bodies/condition.md](../../.claude/skills/rtds-vocalls-component-gen/references/operation_bodies/condition.md)). `__statTypeOf` returns `'number'`, `'time'`, or `'date'` so `__compareAttr` knows how to parse `__rhs`.

### Open questions

- The source handler distinguishes "queue statistic" (ACD lookups) from "interaction statistic" (per-call lookups). The Vocalls runtime may expose these through different APIs — confirm which statistics are available and whether the `Workgroup` Param needs to become optional/absent for interaction stats.
- The source handler delegates `AgentsOnNonACDCalls` to a subroutine (`NAllo_GetUsersOnNonACDCalls`). Confirm whether Vocalls has this metric natively or whether the operator needs a custom counter.
- `CurrentTime` / `CurrentDate` evaluation is timezone-sensitive. Confirm the runtime's clock.
