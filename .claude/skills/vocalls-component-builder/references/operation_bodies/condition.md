# Pattern: Condition / CheckAttribute (operator-based branching)

Use for any Type whose work body compares two values and picks
`NextStep_True` or `NextStep_False` based on the result. Reference Types:
`Condition` (compares a runtime statistic) and `CheckAttribute` (compares
a session variable).

Logging discipline lives in [`../conventions.md §3`](../conventions.md).
Two logs is enough: skip (info) and the branch outcome (info).

## Operation-specific helper — `__compareAttr`

This pattern requires a component-scoped helper in master `Code`. Paste it
in after the three canonical helpers, before the work logic:

```js
/**
 * Compares two values using a string operator code. Equality operators use
 * string comparison; ordering operators coerce both sides to Number;
 * 'contains' uses substring match. Logs a warning and returns false for
 * unknown operators.
 *
 * @param {*} lhs - Left-hand-side value.
 * @param {string} op - Operator code: eq, ne, gt, lt, ge, le, contains.
 * @param {*} rhs - Right-hand-side value.
 * @returns {boolean} True if the comparison holds.
 */
__compareAttr = function (lhs, op, rhs) {
    if (op === 'eq') return String(lhs) === String(rhs);
    if (op === 'ne') return String(lhs) !== String(rhs);
    if (op === 'contains') return String(lhs).indexOf(String(rhs)) !== -1;
    var __ln = Number(lhs);
    var __rn = Number(rhs);
    if (op === 'gt') return __ln > __rn;
    if (op === 'lt') return __ln < __rn;
    if (op === 'ge') return __ln >= __rn;
    if (op === 'le') return __ln <= __rn;
    Logger.warn('[__compareAttr] unknown operator', { operator: op });
    return false;
};
```

Function parameters (`lhs`, `op`, `rhs`) stay bare because they mirror the
operator semantics; every `var`-declared local carries `__` per
[conventions.md §5](../conventions.md).

## Skeleton — `CheckAttribute` (lhs is a global by name)

```js
if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[checkAttribute] skipped — inactive', { nextStep: __rtNextStep });
    return;
}

var __lhs = global[getValue(__rtParams, 'Attribute', '')];
var __op  = getValue(__rtParams, 'Operator', 'eq');
var __rhs = getValue(__rtParams, 'Value', '');

var __branchKey = __compareAttr(__lhs, __op, __rhs) ? 'NextStep_True' : 'NextStep_False';
global[_rtNextStep] = getValue(__rtParams, __branchKey, -1);
Logger.info('[checkAttribute] branch', { branch: __branchKey, nextStep: global[_rtNextStep] });
```

## Skeleton — `Condition` (lhs may be a global or a literal)

`Condition` compares a runtime statistic. The `Statistic` Param may be a
global name (look it up) or a literal value (use as-is):

```js
if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[condition] skipped — inactive', { nextStep: __rtNextStep });
    return;
}

var __lhsRaw = getValue(__rtParams, 'Statistic', '');
var __lhs    = global.hasOwnProperty(__lhsRaw) ? global[__lhsRaw] : __lhsRaw;
var __op     = getValue(__rtParams, 'Operator', 'eq');
var __rhs    = getValue(__rtParams, 'Value', '');

var __branchKey = __compareAttr(__lhs, __op, __rhs) ? 'NextStep_True' : 'NextStep_False';
global[_rtNextStep] = getValue(__rtParams, __branchKey, -1);
Logger.info('[condition] branch', { branch: __branchKey, nextStep: global[_rtNextStep] });
```

**Mental model**: this is the v2 mirror of the PureConnect handler
`GetAt(p_lsAttrValues, Find(p_lsAttrNames, "NextStep_True", 0))` — a
name-keyed lookup with a literal default. `getValue` *is* the
`GetAt(...Find(...))` combo.

## Supported operators

| Code       | Behaviour                                                  |
| ---------- | ---------------------------------------------------------- |
| `eq`       | `String(lhs) === String(rhs)`                              |
| `ne`       | `String(lhs) !== String(rhs)`                              |
| `gt`       | `Number(lhs) > Number(rhs)`                                |
| `lt`       | `Number(lhs) < Number(rhs)`                                |
| `ge`       | `Number(lhs) >= Number(rhs)`                               |
| `le`       | `Number(lhs) <= Number(rhs)`                               |
| `contains` | `String(lhs).indexOf(String(rhs)) !== -1`                  |
| (other)    | `Logger.warn` and returns `false`.                         |

## Branch keys

Two: `NextStep_True`, `NextStep_False`. No default `NextStep` — the
operator must configure both branches. If they don't, the missing one
falls through to `-1` (a no-op) which is usually wrong; flag this when
generating.
