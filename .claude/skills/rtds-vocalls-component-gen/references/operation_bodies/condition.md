# Pattern: Condition / CheckAttribute (operator-based branching)

Use for any Type whose work body compares two values and picks
`nextStep_True` or `nextStep_False` based on the result. Reference Types:
`Condition` (compares a runtime statistic) and `CheckAttribute` (compares
a session variable).

Logging discipline lives in [logging.md](../../conventions/logging.md).
Two logs is enough: skip (info) and the branch outcome (info).

**`__rtOutcome` staging.** The work body stages the chosen branch KEY into
the local `__rtOutcome` (plain `=`, the literal camelCase `nextStep_True` /
`nextStep_False` key name); the output node (id=6 OnEnter) resolves it to the
bare flow variable `_rtNextStep` once with
`_rtNextStep = __getValue(__rtParams, __rtOutcome, '');` (fallback `''`, **not**
`global[_rtNextStep]` and **not** `-1`). The work body never writes
`_rtNextStep` directly. See [component-v2.md §6–§8](../../conventions/component-v2.md).

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
[naming.md](../../conventions/naming.md).

## Skeleton — `CheckAttribute` (lhs is a global by name)

```js
if (String(__getValue(__rtParams, 'active', false)).toLowerCase() !== 'true') {
    Logger.info('[checkAttribute] skipped — inactive', { outcome: __rtOutcome });
    return;
}

var __lhs = getScoped(__getValue(__rtParams, 'attribute', ''), '');
var __op  = __getValue(__rtParams, 'operator', 'eq');
var __rhs = __getValue(__rtParams, 'value', '');

var __branchKey = __compareAttr(__lhs, __op, __rhs) ? 'nextStep_True' : 'nextStep_False';
__rtOutcome = __branchKey;
Logger.info('[checkAttribute] branch', { branch: __branchKey, outcome: __rtOutcome });
```

## Skeleton — `Condition` (lhs may be a global or a literal)

`Condition` compares a runtime statistic. The `Statistic` Param may be a
global name (look it up) or a literal value (use as-is):

```js
if (String(__getValue(__rtParams, 'active', false)).toLowerCase() !== 'true') {
    Logger.info('[condition] skipped — inactive', { outcome: __rtOutcome });
    return;
}

var __lhsRaw = __getValue(__rtParams, 'statistic', '');
var __lhs    = global.hasOwnProperty(__lhsRaw) ? getScoped(__lhsRaw, '') : __lhsRaw;
var __op     = __getValue(__rtParams, 'operator', 'eq');
var __rhs    = __getValue(__rtParams, 'value', '');

var __branchKey = __compareAttr(__lhs, __op, __rhs) ? 'nextStep_True' : 'nextStep_False';
__rtOutcome = __branchKey;
Logger.info('[condition] branch', { branch: __branchKey, outcome: __rtOutcome });
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

Two: `nextStep_True`, `nextStep_False`. No default `nextStep` — the
operator must configure both branches. If they don't, the missing one
resolves through `__getValue(__rtParams, __rtOutcome, '')` to the `''`
fallback (a no-op) which is usually wrong; flag this when generating.
