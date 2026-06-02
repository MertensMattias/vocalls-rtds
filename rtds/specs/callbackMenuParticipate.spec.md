# Operation Spec — callbackMenuParticipate (sub-operation of Callback)

| Field          | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Operation Type | n/a (folded into `Callback`)                                                |
| Component name | n/a — kept as a reference for the `offerParticipation` node inside `callback`. |
| Pattern        | `gui_exit` (multi-node — play prompt, collect single digit, branch on `1`/`2`) |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_CallbackMenuParticipate.xml` |
| Target file    | n/a — do not generate as a standalone component                             |

> **Sub-operation contract — not a standalone operation.** This spec deviates from the regular Inputs / Outputs / Component-structure shape because `Active` and `NextStep_*` are owned by the parent `callback` component. The tables below document the signal-based contract between this node and its parent.

## Business purpose

The "Would you like a callback?" menu. Plays the offer prompt, collects a single DTMF key, and signals the orchestrator whether the caller wants in (`1`) or out (`2`). In the source repo this is its own subroutine so the orchestrator and any custom entry point can invoke it; in Vocalls it is one of the multi-node steps inside `callback`.

### Inputs (read from session state — set by the parent `callback` component)

| Source                                 | Description                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `getValue(__rtParams, 'PromptFolder')` | Prompt-library subfolder containing `CB_Offer.wav` (or equivalent).                          |
| `__cbEscape` (session flag)            | If truthy, auto-select option `1` without playing the prompt — used when an upstream node has already confirmed the offer (escape-key shortcut). |

### Outputs (signal back to orchestrator)

| Signal                       | Effect on the orchestrator                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `__cbParticipate = true`     | Caller pressed `1` (or auto-selected). Orchestrator continues into `inputPhoneNumber`.    |
| `__cbParticipate = false`    | Caller pressed `2` (or any other DTMF), or the dtmf node timed out. Orchestrator routes to `NextStep` (caller declined). |

The orchestrator's downstream case node reads `__cbParticipate` and branches accordingly. There is no `NextStep_*` written by this sub-node directly.

### Component structure (inside `callback`)

Three nodes in series:

1. **prompt** (say) — plays `PromptFolder + 'CB_Offer'` (skipped if `__cbEscape` truthy).
2. **collect** (dtmf, max 1 key, valid `12`, timeout 7s).
3. **decision** (case):

```js
__cbParticipate = (__cbDigit === '1' || __cbEscape === true);
Logger.info('[callback] participation', { participate: __cbParticipate, nextStep: __rtNextStep });
```

### Open questions

- Confirm `CB_Offer.wav` is the correct asset name or whether it should be Param-driven (e.g. an `OfferPrompt` Param on the parent `callback`).
- The escape-flag shortcut (`__cbEscape`) is a niche behaviour from the source handler — confirm whether any flow actually uses it or whether the spec can drop it.
- Confirm the valid-key set is `12` rather than a configurable list.
