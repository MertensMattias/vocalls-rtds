# Operation Spec — callback (Callback)

| Field          | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| Operation Type | `Callback`                                                    |
| Component name | `callback`                                                    |
| Pattern        | `http_call` + multi-node — fetch the schedule, offer participation menu, collect timeslot + phone number, persist callback record |
| Source handler | `rtds_pureconnect_handlers/handlers/NAllo_RTDS_Callback.xml`  |
| Target file    | `rtds_vocalls_operations/components/callback.js`              |

## Business purpose

Orchestrate the "I don't want to wait — call me back" experience end to end. Validates whether the caller's ANI (or a manually entered number) qualifies for callback under the operator's rules; offers a yes/no menu; if yes, fetches available timeslots from the Callback API and lets the caller pick one; then submits the callback record to the API and disconnects.

In Vocalls this is the single externally-visible Callback operation — the four `Callback*` sub-handlers in the source repository (`CallbackAddRecord`, `CallbackMenuParticipate`, `CallbackTimeSlot`, `CallbackInputPhoneNumber`) collapse into internal nodes of this component.

### Inputs (Params)

| Param name             | Type                          | Required | Default | Description                                                                                                                          |
| ---------------------- | ----------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Active`               | boolean                       | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                            |
| `ConfigId`             | string                        | yes      | —       | Callback service configuration identifier — drives schedule lookup and which queue receives the eventual call-out.                    |
| `CallbackOnANI`        | boolean                       | no       | `true`  | If true, offer to call the caller back on their detected ANI without asking. If false, always go to manual input.                    |
| `AllowManualInput`     | boolean                       | no       | `true`  | If true, allow the caller to key in a different number (manually) when ANI is invalid or refused.                                    |
| `ANIAttribute`         | string                        | no       | `'ani'` | Name of the session variable holding the caller's number (defaults to `varObj.ani`).                                                  |
| `ANIClassifications`   | string (pipe-delimited list)  | no       | `''`    | Phone-number classification rule list (operator-defined; e.g. `Mobile|Benelux`). The runtime validates ANI against these before offering. |
| `LocationFilter`       | string                        | no       | `''`    | Geographic filter (country/region) restricting eligible numbers.                                                                       |
| `PromptFolder`         | string                        | no       | `''`    | Prompt-library subfolder for callback prompts.                                                                                        |
| `NumberOfSlots`        | number                        | no       | `3`     | How many timeslot options to read out to the caller.                                                                                  |
| `ManualInputRetries`   | number                        | no       | `3`     | Max attempts for the manual phone number entry sub-flow.                                                                              |
| `Timeout`              | number (ms)                   | no       | `10000` | HTTP timeout for the Callback API calls.                                                                                              |
| `NextStep`             | string (step ID)              | yes      | —       | Continuation when the operation is inactive, or when the callback was offered but the caller declined or the record was persisted and the call should be released cleanly. |
| `NextStep_Failure`       | string (step ID)              | yes      | —       | Continuation on Callback API error or invalid configuration.                                                                          |

### Outputs

| Branch key       | Taken when                                                                                | Fallback |
| ---------------- | ----------------------------------------------------------------------------------------- | -------- |
| `NextStep`       | Operation inactive, caller declined, callback record successfully persisted, or no slots were available. | `-1`    |
| `NextStep_Failure` | Callback API failed, schedule fetch failed, or required Params were missing.              | `-1`     |

### External calls

| Step              | Method | URL shape                                                                  | Purpose                                            |
| ----------------- | ------ | -------------------------------------------------------------------------- | -------------------------------------------------- |
| schedule lookup   | GET    | `__rtBaseUrl + __rtCallbackEndpoint + '/' + ConfigId + '/schedule'`         | Returns available timeslots.                       |
| ANI classifier    | GET    | `__rtBaseUrl + __rtCallbackEndpoint + '/' + ConfigId + '/classify?ani=...'` | Returns boolean — is this ANI a permitted callback target?         |
| create record     | POST   | `__rtBaseUrl + __rtCallbackEndpoint + '/' + ConfigId + '/record'`           | Persists the callback record. Body has timeslot + phone number.    |

Endpoint variable: `__rtCallbackEndpoint = _rtCallbackEndpoint`.

### Component structure

Multi-node component — mirrors `guardTui` in shape but with deeper nesting because of the participation menu + timeslot menu + phone-input loop.

`init` (canonical):

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
__cbTimeslots = [];
__cbChosenSlot = -1;
__cbPhoneNumber = '';
__cbAttempt = 0;
Logger.debug('[callback] config resolved', { params: __rtParams });
```

Body sequence (each is a separate node):

1. **fetchSchedule** (work script) — eligibility + schedule lookup. On error → `NextStep_Failure`. On no slots → `NextStep`.
2. **offerParticipation** (say + dtmf + case) — "press 1 to confirm, 2 to decline". On `2` → `NextStep`. On `1` → continue.
3. **inputPhoneNumber** (case + collect loop) — if `CallbackOnANI` and ANI passes classification, skip; otherwise loop up to `ManualInputRetries` collecting + confirming a number. On exhausted retries → `NextStep`.
4. **pickTimeslot** (say + dtmf + case) — read out up to `NumberOfSlots` slots; collect choice; loop on retry. On no choice → `NextStep`.
5. **createRecord** (work script — `http_call`) — POST the callback. On success → `Logger.info('[callback] created')` + `NextStep`. On error → `NextStep_Failure`.

`output`:

```js
OnEnter: Logger.info('[callback] exit', { nextStep: __rtNextStep });
```

### Open questions

- The source family is split across `Callback`, `CallbackMenuParticipate`, `CallbackTimeSlot`, `CallbackInputPhoneNumber`, `CallbackAddRecord` — five handlers. The Vocalls version folds all five into this one component. Confirm this is the desired shape (the alternative is a `callbackInputPhoneNumber` and `callbackTimeSlot` helper that the orchestrator wires up, but cross-component reuse is not idiomatic in Vocalls).
- The source handler calls `NAllo_CallbackCheckANI` (a custom subroutine outside the RTDS family) to validate the ANI against `ANIClassifications`. The Vocalls version should call the Callback API for classification; confirm the endpoint exists.
- The source handler ends with a `Disconnect` call after a successful callback record. The Vocalls version uses `NextStep` and expects the flow author to wire a `Disconnect` operation downstream. Confirm.
- "Customer key", "Skills inheritance", "Priority inheritance" are advanced Params from the source `CallbackAddRecord` helper — confirm whether the operator wants them exposed on the orchestrator (and listed here as Params) or whether they default to runtime-discovered values.
