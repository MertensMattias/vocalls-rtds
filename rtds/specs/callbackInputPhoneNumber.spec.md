---
status: spec-only
catalog:
  operation: "callbackInputPhoneNumber"
  legacy: false
  pattern: "`gui_exit` (multi-node)"
  component: null
  componentMark: "⬜"
  runtimeCell: "⬜ not registered"
  seed: "⬜"
---

# Operation Spec — callbackInputPhoneNumber (sub-operation of Callback)

| Field          | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Operation Type | n/a (folded into `Callback`)                                                |
| Component name | n/a — kept as a reference for the `inputPhoneNumber` node inside `callback`. |
| Pattern        | `gui_exit` (multi-node — confirm-ANI sub-menu, optional manual-input loop)   |
| Source handler | `rtds/pureconnect_handlers/Nallo_RTDS_CallbackInputPhoneNumber.xml` |
| Target file    | n/a — do not generate as a standalone component                             |

> **Sub-operation contract — not a standalone operation.** This spec deviates from the regular Inputs / Outputs / Component-structure shape because `Active` and `NextStep_*` are owned by the parent `callback` component. The tables below document the signal-based contract between this node and its parent.

## Business purpose

Resolve the callback target phone number. Two paths:

1. **ANI path** — if `CallbackOnANI` is true and the caller's ANI passes classification (matches an allowed phone-number rule), play "Should we call you back on <ANI>?" and accept `1`/`2`. On confirm, use the ANI; on decline, fall through to manual input.
2. **Manual input path** — if `AllowManualInput` is true and ANI didn't resolve, play "Please enter the number to call you back, then press #"; collect digits; read them back digit-by-digit; ask "Is this correct? Press 1 to confirm, 2 to re-enter"; loop up to `ManualInputRetries`.

Returns the chosen number (or signals failure). In the source repo this is its own subroutine; in Vocalls it is one of the multi-node steps inside `callback`.

### Inputs (read from parent `callback` Params and session state)

| Source                                  | Description                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| `getValue(__rtParams, 'CallbackOnANI')` | Whether to offer the ANI-based path first.                                    |
| `getValue(__rtParams, 'AllowManualInput')` | Whether to fall through to manual entry.                                   |
| `getValue(__rtParams, 'ManualInputRetries')` | Max manual-entry attempts.                                                |
| `getValue(__rtParams, 'ANIClassifications')` | Pipe-delimited classification rules used for ANI validation.              |
| `getValue(__rtParams, 'LocationFilter')` | Geographic filter for both ANI and manual numbers.                            |
| `varObj.ani` or `global[ANIAttribute]`   | Caller's number.                                                              |

### Outputs (signal back to orchestrator)

| Signal                       | Effect on the orchestrator                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `__cbPhoneNumber = '<E.164>'` | Resolved callback target. Orchestrator continues into `pickTimeslot`.                            |
| `__cbPhoneNumber = ''`        | Neither path succeeded (ANI invalid + manual exhausted or disabled). Orchestrator routes to `NextStep` (caller could not be served). |

### Component structure (inside `callback`)

Branching:

1. **classifyAni** (work script — optional HTTP call to the Callback API or local rule eval) — sets `__cbAniValid` boolean.
2. **routeAniManual** (case):
   - `CallbackOnANI && __cbAniValid` → **confirmAni** sub-flow.
   - `AllowManualInput`         → **manualInput** sub-flow.
   - else                       → set `__cbPhoneNumber = ''` and exit.
3. **confirmAni** (say + dtmf + case): "Call you back on <ANI>? Press 1 yes, 2 no". On `1` → `__cbPhoneNumber = ani`; on `2` → fall through to **manualInput** if allowed, else exit empty.
4. **manualInput** (say + dtmf + readback + case loop, capped at `ManualInputRetries`):
   - Prompt → collect digits → validate length + classification + location → readback → confirm.
   - On confirm → `__cbPhoneNumber = <collected>`; on reject → loop; on retry exhaust → exit empty.

`Logger.info` lines at each branch decision (`'[callback] using ANI'`, `'[callback] manual confirmed'`, `'[callback] manual exhausted'`).

### Open questions

- The source handler calls a custom `NAllo_CallbackCheckANI` subroutine that validates the ANI against rules and location. Vocalls should either (a) call the Callback API to classify, or (b) implement the rule eval in JS using regex Params. Pick one and document the decision in the parent `callback` spec's Open questions.
- The source handler uses `NAllo_RTDS_Play` for digit-by-digit readback (per-digit prompt assets `Digit_0.wav`…`Digit_9.wav`). Vocalls' built-in number-to-speech is a simpler default — confirm.
- The `CallbackOnANI = true, AllowManualInput = false` combination means "ANI only, no manual fallback". Confirm this is supported (the orchestrator silently routes to `NextStep` when ANI is invalid in that case).
- The retry counter (`ManualInputRetries`) is shared with the `Menu` operation's `MaxTries` shape. Confirm naming consistency.
