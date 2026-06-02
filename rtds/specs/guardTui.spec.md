---
status: implemented
catalog:
  operation: "guardTui"
  legacy: false
  pattern: "`http_call` + multi-node"
  component: "guardTui.js"
  componentMark: "✅"
  runtimeCell: "GUI-exit `guard_tui` (`GuardTui_vocalls`)"
  seed: "✅"
---

# Operation Spec — guardTui (GuardTUI)

| Field          | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| Operation Type | `GuardTUI`                                                    |
| Component name | `guardTui`                                                    |
| Pattern        | `http_call` + multi-node — check eligibility, fetch state, play activate/deactivate menu, post on selection |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_GuardTUI.xml`  |
| Target file    | `rtds/components/guardTui.js` (already exists — this spec is the reference shape) |

## Business purpose

Self-service guard administration line. A guard calls in, the operation checks whether their phone number is registered for the configured guard pool, looks up their current activate/deactivate state, and offers a DTMF menu — press 7 to activate, 3 to deactivate. The only-active-member case is handled gracefully (the system refuses to deactivate the last active guard).

### Inputs (Params)

| Param name        | Type             | Required | Default | Description                                                                                                                          |
| ----------------- | ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Active`          | boolean          | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                            |
| `ConfigId`        | number           | yes      | —       | Guard pool identifier passed to the Guard API.                                                                                        |
| `PhoneNumberVar`  | string           | no       | `'ani'` | Name of the session variable holding the caller's phone number (defaults to `varObj.ani`).                                            |
| `Timeout`         | number (ms)      | no       | `10000` | HTTP request timeout for each backend call.                                                                                            |
| `Prompt`          | string           | yes      | —       | DTMF menu prompt. e.g. "To activate this number, press 7. To deactivate this number, press 3."                                       |
| `ResultActivated` | string           | yes      | —       | Confirmation prompt after a successful activate.                                                                                      |
| `ResultDeactivated`| string          | yes      | —       | Confirmation prompt after a successful deactivate.                                                                                    |
| `ResultOnlyActive`| string           | yes      | —       | Apology prompt when the caller is the last active member and tried to deactivate.                                                     |
| `ResultDenied`    | string           | yes      | —       | Apology prompt when the caller's number isn't registered for the configured guard pool.                                               |
| `ResultError`     | string           | yes      | —       | Apology prompt on any technical failure (HTTP error, malformed response, etc.).                                                       |
| `NextStep`        | string (step ID) | yes      | —       | Continuation when the operation is inactive or the menu has been served and the caller is ready to be released.                       |
| `NextStep_Success`| string (step ID) | yes      | —       | Continuation after a successful activate or deactivate.                                                                                |
| `NextStep_Denied` | string (step ID) | yes      | —       | Continuation when the caller's number was not allowed by the eligibility check.                                                       |
| `NextStep_Failure`| string (step ID) | yes      | —       | Continuation on HTTP / lookup / activation failure.                                                                                    |

### Outputs

| Branch key         | Taken when                                                                                      | Fallback |
| ------------------ | ----------------------------------------------------------------------------------------------- | -------- |
| `NextStep`         | Operation is inactive, or the menu was served and the caller exited cleanly.                    | `-1`     |
| `NextStep_Success` | Activation or deactivation succeeded.                                                            | `-1`     |
| `NextStep_Denied`  | Eligibility check returned non-true (number not registered for this pool).                       | `-1`     |
| `NextStep_Failure` | Any backend call failed, state lookup failed, or the caller exhausted the dtmf retry budget.    | `-1`     |

### External calls

This component makes up to **four** HTTP calls in sequence (two up-front, then one of activate/deactivate per menu pick):

| Step             | Method | URL shape                                                                | Purpose                                                                |
| ---------------- | ------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| eligibility check| GET    | `__rtBaseUrl + __rtTuiCheckAccessEndpoint + '/' + ConfigId + '/' + ani + '/0'` | Body returns `"true"` / `"false"` as a string.                          |
| state lookup     | GET    | `__rtBaseUrl + __rtTuiGetStateEndpoint + '/' + ani + '/' + ConfigId`     | Body returns `{ id: <guardId>, ... }`.                                  |
| activate         | POST   | `__rtBaseUrl + __rtTuiActivateEndpoint + '/' + guardId`                  | Body returns `"true"` on success.                                       |
| deactivate       | POST   | `__rtBaseUrl + __rtTuiDeactivateEndpoint + '/' + guardId`                | Body returns `"true"` on success, `"false"` on only-active-member case. |

All four endpoint vars are projected into `__rt*Endpoint` variables in the component (`__rtTuiCheckAccessEndpoint`, etc.).

### Component structure

Multi-node component — see [`rtds/components/guardTui.js`](../components/guardTui.js).

- **input** → **init** → **prepare** (eligibility check + state lookup) → **route** (case: denied / failure / menu / no-choice) → **denied** (say) → **error** (say) → **prompt** (say) → **menu** (dtmf: keys 3, 7, no-input, not-recognized) → **toggleDeactivate** (work script) → **routeDeactivate** (case) → result prompts → **toggleActivate** (work script) → **routeActivate** (case) → result prompts → **output**.

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
__guardTuiGuardId = '';
Logger.debug('[guardTui] config resolved', { params: __rtParams });
```

The `prepare` work body runs the eligibility check + state lookup, sets `__guardTuiGuardId` on success, and uses the case `route` node to fan out to `NextStep_Denied`, `NextStep_Failure`, the prompt-and-menu branch, or the no-choice (skip) branch.

`output`:

```js
OnEnter: Logger.info('[guardTui] exit', { nextStep: __rtNextStep });
```

Variables block:

```js
__configJSON = { "Active": false, "ConfigId": "", "PhoneNumberVar": "ani", "Timeout": 10000, "Prompt": "...", "ResultActivated": "...", "ResultDeactivated": "...", "ResultOnlyActive": "...", "ResultDenied": "...", "ResultError": "...", "NextStep": "00010", "NextStep_Success": "00011", "NextStep_Denied": "00012", "NextStep_Failure": "00099" };
__environment = environment;
__rtBaseUrl = _rtBaseUrl;
__rtTuiCheckAccessEndpoint = _rtTuiCheckAccessEndpoint;
__rtTuiGetStateEndpoint = _rtTuiGetStateEndpoint;
__rtTuiActivateEndpoint = _rtTuiActivateEndpoint;
__rtTuiDeactivateEndpoint = _rtTuiDeactivateEndpoint;
__rtNextStep &= _rtNextStep;
```

### Open questions

None — this spec captures the existing reference component verbatim.
