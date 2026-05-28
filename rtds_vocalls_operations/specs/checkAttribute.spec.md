# Operation Spec — checkAttribute (CheckAttribute)

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Operation Type | `CheckAttribute`                                                   |
| Component name | `checkAttribute`                                                   |
| Pattern        | `condition`                                                        |
| Source handler | `rtds_pureconnect_handlers/handlers/NAllo_RTDS_CheckAttribute.xml` |
| Target file    | `rtds_vocalls_operations/components/checkAttribute.js`             |

## Business purpose

Read a session variable (or any global), compare it to a configured value with a configured operator, and branch True / False / Failure. Used to gate flow behaviour on caller-supplied data (caller ID, account-type flag, language preference, IVR state).

### Inputs (Params)

| Param name        | Type                          | Required | Default | Description                                                                                                                                  |
| ----------------- | ----------------------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Active`          | boolean                       | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep_Failure` (treat-as-failure). Universal across operations.                          |
| `AttributeName`   | string                        | yes      | —       | Name of the session variable to read. Supports `${name}` substitution from `global` at config-resolution time (handled by `__setupConfig`). |
| `Operator`        | string (enum)                 | yes      | —       | `eq`, `ne` (any type). `gt`, `lt`, `ge`, `le` (integer/`string-as-int` only).                                                                  |
| `Value`           | string                        | yes      | —       | Comparison RHS.                                                                                                                              |
| `ValueDataType`   | string (enum)                 | no       | `'string'` | One of `string`, `integer`, `boolean`. Controls parse rules.                                                                                |
| `NextStep_True`   | string (step ID)              | yes      | —       | Continuation when the comparison is true.                                                                                                    |
| `NextStep_False`  | string (step ID)              | yes      | —       | Continuation when the comparison is false.                                                                                                   |
| `NextStep_Failure`| string (step ID)              | no       | `-1`    | Continuation when the attribute is missing, the data type cannot be parsed, or the operator is invalid.                                       |

### Outputs

| Branch key         | Taken when                                                          | Fallback |
| ------------------ | ------------------------------------------------------------------- | -------- |
| `NextStep_True`    | The comparison evaluated to true.                                   | `-1`     |
| `NextStep_False`   | The comparison evaluated to false.                                  | `-1`     |
| `NextStep_Failure` | Attribute missing / parse error / operator invalid; or operation is inactive. | `-1`     |

### Component structure

Single-script work body.

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[checkAttribute] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[checkAttribute] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __name = getValue(__rtParams, 'AttributeName', '');
if (!__name) {
    Logger.warn('[checkAttribute] missing AttributeName', { nextStep: global[_rtNextStep] });
    return;
}

if (!global.hasOwnProperty(__name)) {
    Logger.info('[checkAttribute] attribute not set', { attribute: __name, nextStep: global[_rtNextStep] });
    return;
}

var __op = String(getValue(__rtParams, 'Operator', 'eq')).toLowerCase();
var __rhs = getValue(__rtParams, 'Value', '');
var __type = String(getValue(__rtParams, 'ValueDataType', 'string')).toLowerCase();
var __lhs = global[__name];

var __match;
try { __match = __compareTyped(__lhs, __op, __rhs, __type); }
catch (e) { Logger.warn('[checkAttribute] compare failed', { attribute: __name, op: __op, type: __type, nextStep: global[_rtNextStep] }, e); return; }

global[_rtNextStep] = getValue(__rtParams, __match ? 'NextStep_True' : 'NextStep_False', -1);
Logger.info('[checkAttribute] evaluated', { attribute: __name, op: __op, lhs: __lhs, rhs: __rhs, match: __match, nextStep: global[_rtNextStep] });
```

`output`:

```js
OnEnter: Logger.info('[checkAttribute] exit', { nextStep: __rtNextStep });
```

The `__compareTyped` helper is operation-specific and lives in the master `Code` block: it coerces both sides per `__type`, rejects `gt/lt/ge/le` on non-numeric types (returns thrown), and applies case-insensitive equality on strings.

### Open questions

- The source handler defaults `p_sNextStep` to `NextStep_Failure` on entry, which makes "missing attribute" effectively a failure rather than a false. Confirm this is the desired contract (alternative: treat missing as False).
- `${name}` substitution in `AttributeName` is documented as supported (the source uses `ReplaceAttributes`). The Vocalls version handles this through `__setupConfig`'s placeholder pass — confirm token resolution happens *before* the attribute name reaches the work body.
- Boolean comparison in the source accepts the literal strings `"true"`/`"false"` and the numerics `"1"`/`"0"`. Confirm Vocalls' `__compareTyped` should be lenient on the same inputs.
