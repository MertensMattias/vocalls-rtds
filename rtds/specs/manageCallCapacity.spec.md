---
status: spec-only
catalog:
  operation: "manageCallCapacity"
  legacy: false
  pattern: "`condition` (counter-driven)"
  component: null
  componentMark: "⬜"
  runtimeCell: "⬜ not registered"
  seed: "⬜"
---

# Operation Spec — manageCallCapacity (ManageCallCapacity)

| Field          | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| Operation Type | `ManageCallCapacity`                                                   |
| Component name | `manageCallCapacity`                                                   |
| Pattern        | `condition` (counter-driven; consults a distributed counter and branches modulo) |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_ManageCallCapacity.xml` |
| Target file    | `rtds/components/manageCallCapacity.js`             |

## Business purpose

Implement crude rate limiting / load shedding by incrementing a distributed counter and admitting only 1 in N calls (`AllowedCallRatio`). Used to throttle inbound volume when a downstream system is overloaded, or to A/B sample traffic for routing experiments.

### Inputs (Params)

| Param name             | Type             | Required | Default | Description                                                                                                                          |
| ---------------------- | ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Active`               | boolean          | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                            |
| `AllowedCallRatio`     | number (≥1)      | yes      | —       | Admission ratio. `1` admits everything; `N` admits every N-th call.                                                                   |
| `AccumulatorName`      | string           | yes      | —       | Name of the distributed counter (operator-defined).                                                                                   |
| `AccumulatorInstance`  | string           | no       | `'default'` | Instance identifier — allows multiple independent counters under one name.                                                        |
| `Timeout`              | number (ms)      | no       | `2000`  | Lock-acquisition timeout when incrementing the counter.                                                                                |
| `NextStep`             | string (step ID) | yes      | —       | Continuation when the operation is inactive or the counter increment fails (treated as "allow").                                       |
| `NextStep_Allowed`     | string (step ID) | yes      | —       | Continuation when the new counter value `% AllowedCallRatio === 0` (admit).                                                            |
| `NextStep_NotAllowed`  | string (step ID) | yes      | —       | Continuation when the new counter value `% AllowedCallRatio !== 0` (reject — typically routes to an overflow message + Disconnect).   |

### Outputs

| Branch key            | Taken when                                                                                | Fallback |
| --------------------- | ----------------------------------------------------------------------------------------- | -------- |
| `NextStep`            | Operation is inactive, or the counter increment failed (fail-open: treat as admit).        | `-1`     |
| `NextStep_Allowed`    | New counter value modulo `AllowedCallRatio` is zero.                                       | `-1`     |
| `NextStep_NotAllowed` | New counter value modulo `AllowedCallRatio` is non-zero.                                   | `-1`     |

### Component structure

Single-script work body. The counter API is an HTTP call to the runtime's accumulator endpoint.

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[manageCallCapacity] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[manageCallCapacity] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __name = getValue(__rtParams, 'AccumulatorName', '');
var __instance = getValue(__rtParams, 'AccumulatorInstance', 'default');
var __ratio = Number(getValue(__rtParams, 'AllowedCallRatio', 1)) || 1;
if (!__name) { Logger.warn('[manageCallCapacity] missing AccumulatorName', { nextStep: global[_rtNextStep] }); return; }

var __url = __rtBaseUrl + __rtEndpoint + '/' + encodeURIComponent(__name) + '/' + encodeURIComponent(__instance) + '/increment';
var __timeout = getValue(__rtParams, 'Timeout', 2000);

return jsonHttpRequest(__url, { method: 'POST', "timeout": __timeout }, _headers, null).then(
    function (result) {
        if (!result || result.success !== true || typeof result.response !== 'number') {
            Logger.warn('[manageCallCapacity] accumulator failed (fail-open)', { statusCode: result && result.statusCode, nextStep: global[_rtNextStep] });
            return;
        }
        var __count = Number(result.response);
        var __admit = (__count % __ratio) === 0;
        global[_rtNextStep] = getValue(__rtParams, __admit ? 'NextStep_Allowed' : 'NextStep_NotAllowed', -1);
        Logger.info('[manageCallCapacity] evaluated', { count: __count, ratio: __ratio, admit: __admit, nextStep: global[_rtNextStep] });
    },
    function (err) { Logger.error('[manageCallCapacity] request error (fail-open)', { nextStep: global[_rtNextStep] }, err); }
);
```

`output`:

```js
OnEnter: Logger.info('[manageCallCapacity] exit', { nextStep: __rtNextStep });
```

Endpoint variable: `__rtEndpoint = _rtAccumulatorEndpoint` (operator-defined; e.g. `/api/accumulator`).

### Open questions

- The source handler uses PureConnect's in-process IPAccServer lock/increment/unlock primitive — distributed but single-cluster. Confirm the Vocalls deployment has an equivalent endpoint, and whether the operator wants a redis-backed implementation, a Vocalls native counter, or a per-instance in-memory counter (which would not survive failover).
- The decision to "fail open" (admit on counter failure) is the spec's choice — the source handler does the same by falling through to `NextStep` rather than `NextStep_NotAllowed`. Confirm.
- `AccumulatorName` / `AccumulatorInstance` form a composite key. Confirm naming conventions so the operator can locate live counters from dashboards.
