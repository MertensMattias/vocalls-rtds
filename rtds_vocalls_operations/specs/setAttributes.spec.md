# Operation Spec — setAttributes (SetAttributes)

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Operation Type | `SetAttributes`                                                    |
| Component name | `setAttributes`                                                    |
| Pattern        | `set_attributes`                                                   |
| Source handler | `rtds_pureconnect_handlers/handlers/NAllo_RTDS_SetAttributes.xml`  |
| Target file    | `rtds_vocalls_operations/components/setAttributes.js` (already exists — this spec is the reference shape) |

## Business purpose

Write one or more session variables in a single hop. Used to thread state through the flow — flag whether the caller authenticated, store a chosen language, persist a customer-key lookup result, or stage routing tokens for downstream operations.

### Inputs (Params)

| Param name       | Type             | Required | Default | Description                                                                                                                          |
| ---------------- | ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Active`         | boolean          | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                            |
| `NextStep`       | string (step ID) | yes      | —       | Continuation after the writes (always taken in active mode).                                                                          |
| `LogAttributes`  | boolean          | no       | `false` | If true, the per-attribute write is logged at info level. If false (default), only the summary count is logged. Reserved for sensitive data. |
| `<any other key>`| any              | yes (≥1) | —       | Every other Param is written verbatim: `global[<Key>] = <Value>`. Control keys (`Active`, `NextStep`, `LogAttributes`) are excluded.   |

### Outputs

| Branch key  | Taken when                              | Fallback |
| ----------- | --------------------------------------- | -------- |
| `NextStep`  | Always (the only branch).               | `-1`     |

### Component structure

Single-script work body (canonical reference component).

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[setAttributes] config resolved', { params: __rtParams });
```

`script` (work body):

```js
if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[setAttributes] skipped — inactive', { nextStep: __rtNextStep });
    return;
}

var __CONTROL_KEYS = { Active: 1, NextStep: 1, LogAttributes: 1 };
var __written = 0;

walk(__rtParams, function (key, value) {
    if (__CONTROL_KEYS[key]) return;
    global[key] = value;
    __written++;
});

global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);
Logger.info('[setAttributes] wrote attributes', { count: __written, nextStep: global[_rtNextStep] });
```

`output`:

```js
OnEnter: Logger.info('[setAttributes] exit', { nextStep: __rtNextStep });
```

### Open questions

None — this spec captures the existing reference component verbatim.

### Notes

- The source handler also filters out PureConnect-specific prefixes (`Type`, `snCreated`, `snModified`, `Eic_*`, `RTDS_*`, `Custom_*`, `ATTR_*`). The Vocalls version writes everything not in `__CONTROL_KEYS` directly. Any operator-side filtering needs to be done by *not configuring* those keys on the operation's Params, not by the component.
- `LogAttributes` is in the contract but is *not* currently wired up in the reference component. If the operator wants per-write logging, extend the `walk` callback to emit `Logger.info('[setAttributes] wrote', { key, value })` when `LogAttributes` is true. Flag as a known divergence.
