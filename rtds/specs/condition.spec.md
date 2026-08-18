---
status: implemented
catalog:
  operation: "condition"
  legacy: false
  pattern: "`local_eval` + `http_call` (queue tier)"
  component: "condition.js"
  componentMark: "✅"
  runtimeCell: "JS twin `executeCondition` (`condition`)"
  seed: "✅"
---

# Operation Spec — condition (Condition)

| Field          | Value                                                                                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operation Type | `condition`                                                                                                                                                                                                          |
| Component name | `condition`                                                                                                                                                                                                          |
| Pattern        | `local_eval` + `http_call` (queue tier)                                                                                                                                                                              |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_Condition.xml` (reworked — see [Divergences](#divergences-from-the-source-handler))                                                                                            |
| Target files   | `rtds/components/condition.js` (canvas twin, lockstep) + `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` (`executeCondition`) + `rtds_3_vocallsEnv.js` (`evaluateCondition`, shared predicate body) |

## Business purpose

Branch the flow on a runtime value. `condition` is the catalogue's generic
predicate primitive: it resolves a left-hand operand from one of three tiers,
compares it against a configured target with a configured operator, and routes
to a true branch or a false branch:

1. **Variable tier** (`statistic` empty) — `value`, usually a `${var}`
   placeholder read from the call scope. Segment routing (`${customerType}` eq
   `B2B`), retry gates, presence checks (isEmpty).
2. **Clock tier** (`statistic: "time"` / `"date"`) — the current time as an
   `HHMM` integer (14:59 → `1459`) or date as `YYYYMMDD`, platform-local
   (Europe/Brussels in production). Business-hours gates (`time` lt `1500`).
3. **Queue tier** (any other `statistic`) — a live wallboard statistic for the
   configured `queue`, fetched from the Tringer panel API. Overflow gates
   (`waiting` gt `39` on `DA_HELPDESK_V`).

The operation **fails safe**: any evaluation that cannot produce a confident
`true` — unknown operator, non-numeric operand under an ordering operator,
missing `queue`, failed or unresolvable stats lookup — lands on the false
branch, never a dead end.

### Inputs (Params)

| Param name       | Type    | Required | Default | Description                                                                                                                                                                                                                                                                                    |
| ---------------- | ------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `active`         | boolean | yes      | `true`  | Skip guard (the universal `activeFlag` contract). Inactive skips evaluation and takes `nextStep`.                                                                                                                                                                                              |
| `statistic`      | string  | no       | `''`    | Left-operand selector: empty → `value`; `time` / `date` → clock tier; anything else → wallboard field name for the queue tier (`waiting`, `longest_wait`, `received`, `answered`, `abandoned`, `accessibility` — matched case-insensitively, underscores ignored, so `longestWait` works too). |
| `queue`          | string  | no       | `''`    | Queue name for the queue tier (replaces legacy `Workgroup`). Required when `statistic` names a wallboard field; missing → warn + false.                                                                                                                                                        |
| `value`          | string  | no       | `''`    | Left-hand operand for the variable tier. Usually a `${var}` placeholder, resolved varObj-first at init by `setupConfig`. Ignored when `statistic` is set.                                                                                                                                      |
| `operator`       | string  | yes      | `''`    | One of `eq`, `ne`, `gt`, `lt`, `ge`, `le`, `contains`, `notContains`, `isEmpty` (matched case-insensitively). Unknown → warn + false.                                                                                                                                                          |
| `compareTo`      | string  | no       | `''`    | Right-hand operand (legacy `Value`). Ignored by `isEmpty`. May itself be a `${var}` placeholder.                                                                                                                                                                                               |
| `timeout`        | int     | no       | `5000`  | HTTP timeout (ms) for the queue-tier stats request only.                                                                                                                                                                                                                                       |
| `nextStep_True`  | string  | yes      | —       | Branch taken when the predicate evaluates true.                                                                                                                                                                                                                                                |
| `nextStep_False` | string  | yes      | —       | Branch taken when the predicate evaluates false (also the fail-safe landing).                                                                                                                                                                                                                  |
| `nextStep`       | string  | yes      | —       | Taken when inactive; also the fallback when the staged branch key is absent. **Always the last key in the Params array.**                                                                                                                                                                      |

**Legacy Param mapping** (for the callflow migrator): `Statistic` →
`statistic` (`CallsWaiting` → `waiting`, `Time` → `time`, `Date` → `date`),
`Workgroup` → `queue`, `Value` → `compareTo`, `NextStep_True` / `NextStep_False`
unchanged in name, camelCased.

### Outputs

| Branch key       | Taken when                                                     | Fallback |
| ---------------- | -------------------------------------------------------------- | -------- |
| `nextStep_True`  | The predicate evaluates true.                                  | `''`     |
| `nextStep_False` | The predicate evaluates false, including every fail-safe path. | `''`     |
| `nextStep`       | The operation is inactive.                                     | `''`     |

The canvas component stages the chosen branch key into `__rtOutcome` (init seeds
`'nextStep'`; the work body pivots to `'nextStep_False'` **before** evaluating and
only a true predicate promotes to `'nextStep_True'`) and resolves it once at the
output node — `_rtNextStep = __getValue(__rtParams, __rtOutcome, '')` — never
writing `_rtNextStep` mid-flight
([conventions/component-v2.md](../../conventions/component-v2.md) §7–§8).

## Operator semantics — `evaluateCondition(value, operator, compareTo)`

The predicate lives in **one shared body**,
[rtds_3_vocallsEnv.js](../../projects/rtds-runtime/globalLibraries/active/rtds_3_vocallsEnv.js)
`evaluateCondition`, called by the JS twin directly and by the component through
its `__evaluateCondition` alias — the same single-body doctrine as `activeFlag` /
`setupConfig`, so the two paths cannot diverge.

| Operator                   | Rule                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `eq` / `ne`                | Numeric compare when **both** sides parse as finite numbers (`'007' eq '7'` → true); otherwise case-insensitive string compare. |
| `gt` / `lt` / `ge` / `le`  | Numeric only. Either side non-numeric → warn + **false** (fail-safe).                                                           |
| `contains` / `notContains` | Case-insensitive substring test of `compareTo` in `value`.                                                                      |
| `isEmpty`                  | True when `value` trims to `''`. `compareTo` ignored.                                                                           |
| anything else              | Warn + **false** (fail-safe).                                                                                                   |

The variable and clock tiers are pure in-memory evaluation. Clock values come
from the shared `clockStatistic(kind[, date])` helper; wallboard fields are
extracted by the shared `extractQueueStatistic(list, queue, statistic)` helper
(`mm:ss` durations such as `longest_wait: "01:30"` convert to total seconds —
`90`).

## External call — wallboard queue statistics (queue tier only)

| Field   | Value                                                                        |
| ------- | ---------------------------------------------------------------------------- |
| URL var | `_rtQueueStatsUrl` (full absolute URL — this API lives outside `_rtBaseUrl`) |
| Extra   | `_rtQueueStatsCompanyId` (query param `company_id`)                          |
| Method  | GET                                                                          |
| Query   | `?queues=<queue>&company_id=<companyId>`                                     |
| Timeout | `timeout` Param, default `5000` ms                                           |

Response — array of queue objects; the entry is matched on `name`
case-insensitively:

```jsonc
[
  {
    "name": "SW_TS",
    "waiting": 0,
    "longest_wait": "00:00",
    "received": 18,
    "answered": 18,
    "abandoned": 0,
    "accessibility": 100,
  },
]
```

A non-success result, a missing queue, or an unresolvable field logs a warn and
evaluates false (`nextStep_False`).

## Runtime handler — `executeCondition(op)`

Lives in [rtds_2_runtime.js](../../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js),
registered as `registerRtdsOperation("condition", executeCondition)`. Same
dispatch contract as the other JS twins (returns `{ nextStepId }`, or — queue
tier only — a thenable resolving `{ nextStepId }`, like the Send\* twins). It
mirrors the component's node pipeline through the shared env-library functions:
`setupConfig` (the init-node twin — trims strings, resolves `${var}` varObj-first,
preserves native types), `activeFlag`, `evaluateCondition`, `clockStatistic`,
and `extractQueueStatistic`; the branch id resolves through `resolveNextStep`,
which falls back to `nextStep` when the chosen branch key is absent.

**Token note:** params resolve through `setupConfig` (`${var}` placeholders),
matching the component's init node exactly — not through the legacy `$(ATTR)`
`resolveTokens` path the older twins use for their own payload fields.

**Async note (queue tier):** the variable and clock tiers are synchronous. The
queue tier returns the `jsonHttpRequest` chain as a thenable resolving
`{ nextStepId }`, like the Send\* twins; `runStep` chains on it directly — never
wrapping it in a native `Promise`, so what reaches the engine stays the
platform's own thenable — and the engine awaits a result returned to it. Queue
gating therefore works mid-call, in production and simulator alike (see
`rtds/docs/runtime-spec.md` §4.10).

## Component twin — `condition.js`

v2-simple, cloned from `setVariables.js`. Master `Code` aliases: `__getValue`,
`__activeFlag`, `__extractParams`, `__setupConfig`, `__evaluateCondition`,
`__clockStatistic`, `__extractQueueStatistic`. Master `Variables` binds
`__rtQueueStatsUrl = _rtQueueStatsUrl;` and
`__rtQueueStatsCompanyId = _rtQueueStatsCompanyId;` for the queue tier, and
seeds `__rtOutcome = 'nextStep';` as the load-time safety net (the init node
re-seeds it on every entry; the load-time value only matters if init itself
fails, where it prevents a stale `__rtOutcome` from a previous component
leaking into the output-node resolve).

`init` (id 7):

```js
__rtOutcome = "nextStep";

__rtParams = __setupConfig(__configJSON);
if (!_headers) {
  _headers = {};
}
Logger.debug("[condition] config resolved", {
  params: __rtParams,
  outcome: __rtOutcome,
});
```

`script` (id 29, work body) — tier dispatch; the outcome pivots to
`'nextStep_False'` before any evaluation, and only a true predicate promotes it:

```js
if (!__activeFlag(__getValue(__rtParams, "active", true))) {
  Logger.info("[condition] skipped -- inactive", { outcome: __rtOutcome });
  return;
}

__rtOutcome = "nextStep_False";

var __operator = String(__getValue(__rtParams, "operator", ""));
var __compareTo = String(__getValue(__rtParams, "compareTo", ""));
var __statistic = String(__getValue(__rtParams, "statistic", "")).trim();

if (__statistic === "") {
  var __value = String(__getValue(__rtParams, "value", ""));
  if (__evaluateCondition(__value, __operator, __compareTo)) {
    __rtOutcome = "nextStep_True";
  }
  Logger.info("[condition] evaluated", {
    statistic: __statistic,
    value: __value,
    operator: __operator,
    compareTo: __compareTo,
    outcome: __rtOutcome,
  });
  return;
}

var __statLower = __statistic.toLowerCase();
if (__statLower === "time" || __statLower === "date") {
  var __clock = __clockStatistic(__statLower);
  if (__clock !== null) {
    if (__evaluateCondition(__clock, __operator, __compareTo)) {
      __rtOutcome = "nextStep_True";
    }
  }
  Logger.info("[condition] evaluated", {
    statistic: __statistic,
    value: __clock,
    operator: __operator,
    compareTo: __compareTo,
    outcome: __rtOutcome,
  });
  return;
}

var __queue = String(__getValue(__rtParams, "queue", ""));
if (!__queue) {
  Logger.warn("[condition] queue statistic without queue -- false", {
    statistic: __statistic,
    outcome: __rtOutcome,
  });
  return;
}
var __timeout = __getValue(__rtParams, "timeout", 5000);
var __url =
  __rtQueueStatsUrl +
  "?queues=" +
  encodeURIComponent(__queue) +
  "&company_id=" +
  encodeURIComponent(String(__rtQueueStatsCompanyId));
return jsonHttpRequest(
  __url,
  { method: "GET", timeout: __timeout },
  _headers,
).then(
  function (result) {
    if (!result || result.success !== true) {
      Logger.warn("[condition] stats request failed -- false", {
        statusCode: result ? result.statusCode : null,
        outcome: __rtOutcome,
      });
      return;
    }
    var __stat = __extractQueueStatistic(result.response, __queue, __statistic);
    if (__stat !== null) {
      if (__evaluateCondition(__stat, __operator, __compareTo)) {
        __rtOutcome = "nextStep_True";
      }
    }
    Logger.info("[condition] evaluated", {
      statistic: __statistic,
      value: __stat,
      operator: __operator,
      compareTo: __compareTo,
      outcome: __rtOutcome,
    });
  },
  function (err) {
    Logger.error(
      "[condition] stats request error -- false",
      { outcome: __rtOutcome },
      err,
    );
  },
);
```

`output` (id 6, `OnEnter`):

```js
_rtNextStep = __getValue(__rtParams, __rtOutcome, "");
Logger.info("[condition] exit", {
  outcome: __rtOutcome,
  nextStep: _rtNextStep,
});
```

## Examples

```jsonc
// Segment routing (variable tier)
{ "active": true, "value": "${customerType}", "operator": "eq", "compareTo": "B2B",
  "nextStep_True": "00010", "nextStep_False": "00020", "nextStep": "00030" }

// Queue overflow gate (legacy "Check: MaxQueue" -- CallsWaiting > 39 on DA_HELPDESK_V)
{ "active": true, "statistic": "waiting", "queue": "DA_HELPDESK_V", "operator": "gt",
  "compareTo": "39", "nextStep_True": "00097", "nextStep_False": "00024", "nextStep": "00024" }

// Business-hours gate (legacy "Check: Time" -- before 15:00)
{ "active": true, "statistic": "time", "operator": "lt", "compareTo": "1500",
  "nextStep_True": "00040", "nextStep_False": "00060", "nextStep": "00060" }

// Presence check
{ "active": true, "value": "${accountNumber}", "operator": "isEmpty", "compareTo": "",
  "nextStep_True": "00050", "nextStep_False": "00060", "nextStep": "00060" }
```

## Divergences from the source handler

The legacy handler was an ACD-statistics gate; this operation is a deliberate
rework, not a port:

- **Statistic vocabulary modernised.** Legacy PureConnect ACD selectors map to
  the Tringer wallboard fields (`CallsWaiting` → `waiting`,
  `LongestWaitTime` → `longest_wait`); `Workgroup` became `queue`. Wallboard
  fields pass through by name, so new fields the API grows work without code
  changes. Legacy selectors with no wallboard equivalent (queue position,
  estimated wait, agent counts) resolve to null → false until the API exposes
  them.
- **Threshold renamed.** Legacy `Value` (the right-hand side) is `compareTo`;
  the modern `value` key is the _left_-hand operand of the variable tier.
- **Operator set extended.** Legacy supported the six ordering/equality
  operators; `contains` / `notContains` / `isEmpty` are new.
- **Raw boolean result not exported.** Legacy exposed the predicate result as a
  separate output variable; here the outcome is expressed only through the
  branch taken. Use `setVariables` first if the flow needs the value persisted.
- **Fail-safe carried forward.** The legacy pre-set false default becomes the
  `'nextStep_False'` pivot staged before evaluation.

### Open questions

- **`longest_wait` format** is assumed `mm:ss` → converted to total seconds
  (`"01:30"` → `90`). If the wallboard emits `hh:mm` for long waits, the
  conversion (in `extractQueueStatistic`) needs a revisit.
- **`_rtQueueStatsCompanyId`** is seeded `1` from the example request; confirm
  the per-environment value.
