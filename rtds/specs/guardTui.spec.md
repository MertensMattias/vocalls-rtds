---
status: implemented
catalog:
  operation: "guardTui"
  legacy: false
  pattern: "`http_call` + multi-node"
  component: "guardTui.js"
  componentMark: "✅"
  runtimeCell: "GUI-exit `guard_tui` (`guardTui_vocalls`)"
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
| `active`          | boolean          | no       | `true`  | If falsy, the operation logs a skip and exits to `nextStep`. Default `true` (runs unless explicitly disabled). The `__configJSON` seed is already `true`, but the runtime read fallback is `false` — **⚠ flagged for a code fix; see [Convention debt](#open-questions--convention-debt-flagged-2026-06-08).** |
| `configId`        | number           | yes      | —       | Guard pool identifier passed to the Guard API.                                                                                        |
| `phoneNumberVar`  | string           | no       | `'ani'` | Name of the session variable holding the caller's phone number (defaults to `varObj.ani`).                                            |
| `timeout`         | number (ms)      | no       | `10000` | HTTP request timeout for each backend call.                                                                                            |
| `configName`      | string           | no       | —       | Carried for flow-header parity; not read by the component runtime.                                                                      |
| `resultCurrentlyActivated_<LANG>` | string | yes | — | State preamble when the caller is already active (e.g. `resultCurrentlyActivated_NL`). Supports `${CustomerProject}` tokens. |
| `resultCurrentlyDeactivated_<LANG>` | string | yes | — | State preamble when the caller is inactive. |
| `promptActivate_<LANG>` | string   | yes      | —       | DTMF prompt offering activation (press 7).                                                                                             |
| `promptDeactivate_<LANG>` | string | yes      | —       | DTMF prompt offering deactivation (press 3).                                                                                           |
| `resultActivated_<LANG>` | string  | yes      | —       | Confirmation prompt after a successful activate.                                                                                      |
| `resultDeactivated_<LANG>` | string | yes      | —       | Confirmation prompt after a successful deactivate.                                                                                    |
| `resultOnlyActive_<LANG>` | string | yes      | —       | Apology when the caller is the last active member and tried to deactivate.                                                             |
| `resultDenied_<LANG>` | string     | yes      | —       | Apology when the caller's number isn't registered for the configured guard pool.                                                       |
| `resultError_<LANG>` | string      | yes      | —       | Apology on technical failure (HTTP error, malformed response, etc.).                                                                   |
| `nextStep`        | string (step ID) | yes      | —       | Continuation when the operation is inactive or the menu has been served and the caller is ready to be released.                       |
| `nextStep_Success`| string (step ID) | yes      | —       | Continuation after a successful activate or deactivate.                                                                                |
| `nextStep_Denied` | string (step ID) | yes      | —       | Continuation when the caller's number was not allowed by the eligibility check.                                                       |
| `nextStep_Failure`| string (step ID) | yes      | —       | Continuation on HTTP / lookup / activation failure.                                                                                    |

### Outputs

| Branch key         | Taken when                                                                                      | Fallback |
| ------------------ | ----------------------------------------------------------------------------------------------- | -------- |
| `nextStep`         | Operation is inactive, or the menu was served and the caller exited cleanly.                    | `''`     |
| `nextStep_Success` | Activation or deactivation succeeded.                                                            | `''`     |
| `nextStep_Denied`  | Eligibility check returned non-true (number not registered for this pool).                       | `''`     |
| `nextStep_Failure` | Any backend call failed, state lookup failed, or the caller exhausted the dtmf retry budget.    | `''`     |

This is a **v2-composite** component: the canonical four-node trunk (input/init/script/output) with embedded say/dtmf/case primitives between the script work and the **single** output node. It follows the unified contract — stages `__rtOutcome` across its script nodes and resolves it once at the output node via `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` (empty-string fallback, [conventions/component-v2.md](../../conventions/component-v2.md) §7–§8).

### External calls

This component makes up to **four** HTTP calls in sequence (two up-front, then one of activate/deactivate per menu pick):

| Step             | Method | URL shape (as shipped)                                                   | Purpose                                                                |
| ---------------- | ------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| eligibility check| GET    | `__rtBaseUrl + __rtTuiCheckAccessEndpoint + '?guardConfigId=' + configId + '&phonenumber=' + ani + '&originGuardId=0'` | `result.response` is `"true"` / `"false"` as a string.            |
| state lookup     | GET    | `__rtBaseUrl + __rtTuiGetStateEndpoint + '?guardConfigId=' + configId + '&phonenumber=' + ani` | `result.response` is an array; reads `[0].guardID` / `guardConfigID` / `guardActive` / `guardName`. |
| activate         | POST   | `__rtBaseUrl + __rtTuiActivateEndpoint + '/' + guardId`                  | `result.response` is `"true"` on success.                              |
| deactivate       | POST   | `__rtBaseUrl + __rtTuiDeactivateEndpoint + '/' + guardId`                | `result.response` is `"true"` on success; `"false"` → only-active-member, routes to `nextStep`. |

All query params are `encodeURIComponent`-escaped. The state-lookup response is `JSON.parse`d when it arrives as a string.

All four endpoint vars are projected into `__rt*Endpoint` variables in the component (`__rtTuiCheckAccessEndpoint`, etc.).

### Component structure

Multi-node component — see [`rtds/components/guardTui.js`](../components/guardTui.js).

- **input** → **init** → **prepare** (eligibility check + state lookup) → **route** (case: denied / failure / menu / no-choice) → **denied** (say) → **error** (say) → **prompt** (say) → **menu** (dtmf: keys 3, 7, no-input, not-recognized) → **toggleDeactivate** (work script) → **routeDeactivate** (case) → result prompts → **toggleActivate** (work script) → **routeActivate** (case) → result prompts → **output**.

`init` (as shipped — normalises `language`, then the universal config resolve):

```js
language = (typeof language === 'string' && language.trim() !== '')
    ? language.toUpperCase()
    : 'NL';

__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
```

The `check access` work body runs the eligibility check (sets `__rtOutcome = 'nextStep_Denied'` when not eligible, `'nextStep_Failure'` on HTTP error, `__guardTuiEligible = true` on success); the `guard status` body then fetches state, sets `__guardTuiGuardId` and resets `__rtOutcome = 'nextStep'` for the menu. The case nodes fan out on `__rtOutcome` / `__guardActive` to the say prompts, the dtmf menu (keys 7/3), and the toggleActivate / toggleDeactivate POST scripts.

`output` (`OnEnter`) — resolves the staged outcome once:

```js
_rtNextStep = getValue(__rtParams, __rtOutcome, '');
Logger.info('[guardTui] exit', { outcome: __rtOutcome, nextStep: _rtNextStep });
```

Variables block:

```js
__configJSON = { "active": true, "configId": 1, "configName": "KLANTWACHT", "phoneNumberVar": "ani", "timeout": 10000, "resultCurrentlyActivated_NL": "...", "resultCurrentlyDeactivated_NL": "...", "promptActivate_NL": "...", "promptDeactivate_NL": "...", "resultActivated_NL": "...", "resultDeactivated_NL": "...", "resultOnlyActive_NL": "...", "resultDenied_NL": "...", "resultError_NL": "...", "nextStep": "00010", "nextStep_Success": "00011", "nextStep_Denied": "00012", "nextStep_Failure": "00099" };
__environment = environment;
__rtBaseUrl = _rtBaseUrl;
__rtTuiCheckAccessEndpoint = _rtTuiCheckAccessEndpoint;
__rtTuiGetStateEndpoint = _rtTuiGetStateEndpoint;
__rtTuiActivateEndpoint = _rtTuiActivateEndpoint;
__rtTuiDeactivateEndpoint = _rtTuiDeactivateEndpoint;
__rtNextStep &= _rtNextStep;
```

### Open questions / convention debt (flagged 2026-06-08)

This spec now matches the shipped component, but the component has two convention gaps worth a follow-up code pass (not fixed here):

- **Bare `log_debug` calls** in the `check access`, `guard status`, `toggleActivate`, and `toggleDeactivate` nodes (8 total). Convention ([conventions/logging.md](../../conventions/logging.md)) requires `Logger.debug` outside the env library. Replace each `log_debug(...)` with `Logger.debug(...)`.
- **Init node omits the `Logger.debug('[guardTui] config resolved', …)` floor log** ([conventions/logging.md](../../conventions/logging.md) three-line floor) and does not re-seed `__rtOutcome` (it relies on the master `Variables` seed `'nextStep_Failure'`). The `check access` body re-stages `__rtOutcome` before use, so behavior is correct, but the init floor log is missing.
- Cross-script work vars (`__guardTuiEligible`, `__guardTuiGuardId`, `__guardActive`, `__guardName`, `_errorMessage`) are assigned in work nodes but not pre-declared in master `Variables` ([conventions/naming.md](../../conventions/naming.md) cross-script rule).
- **`active` read fallback.** The `check access` node reads `getValue(__rtParams, 'active', false)` — default **false**. The target is **true** (run unless explicitly disabled). The `__configJSON` seed is already `true`, but the read fallback should also be `true` to match the convention.
