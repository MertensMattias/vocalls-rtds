---
status: spec-only
catalog:
  operation: "callerDataEntry"
  legacy: false
  pattern: "`gui_exit` (multi-node)"
  component: null
  componentMark: "⬜"
  runtimeCell: "⬜ not registered"
  seed: "⬜"
---

# Operation Spec — callerDataEntry (CallerDataEntry)

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Operation Type | `CallerDataEntry`                                                  |
| Component name | `callerDataEntry`                                                  |
| Pattern        | `gui_exit` (multi-node — prompts, dtmf collect, optional readback confirmation, retry loop) |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_CallerDataEntry.xml` |
| Target file    | `rtds/components/callerDataEntry.js`             |

## Business purpose

Prompt the caller to key in a numeric value (PIN, customer ID, callback number, etc.), validate it against a min/max-length range, optionally read it back digit-by-digit for confirmation, and store the result on a named session variable. Retry on no-input or invalid input up to `MaxTries`.

### Inputs (Params)

| Param name              | Type                          | Required | Default | Description                                                                                                                            |
| ----------------------- | ----------------------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Active`                | boolean                       | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                              |
| `Prompt`                | string (pipe-delimited list)  | yes      | —       | Prompt(s) played before listening for input.                                                                                            |
| `InputLengthMin`        | number                        | no       | `1`     | Minimum digit count required to accept the entry.                                                                                       |
| `InputLengthMax`        | number                        | no       | `32`    | Maximum digit count. Collection auto-stops when reached.                                                                                |
| `TerminationCharacter`  | string (single digit)         | no       | `'#'`   | DTMF key that ends collection early. `''` disables.                                                                                     |
| `Timeout`               | number (seconds)              | no       | `7.0`   | Inter-digit timeout.                                                                                                                    |
| `MaxTries`              | number                        | no       | `1`     | Maximum collection attempts before failing.                                                                                             |
| `NoInputPrompt`         | string                        | no       | `''`    | Played on timeout when re-prompting.                                                                                                    |
| `InvalidInputPrompt`    | string                        | no       | `''`    | Played when entry is shorter than `InputLengthMin` or contains invalid keys, before the next attempt.                                  |
| `MaxTriesPrompt`        | string                        | no       | `''`    | Played once after retries are exhausted, before routing to `NextStep_Failure`.                                                          |
| `Readback`              | boolean                       | no       | `false` | If true, after a successful collection, plays back the digits and offers a yes/no menu to confirm.                                      |
| `ReadbackPrompt`        | string                        | no       | `''`    | Played before the digit-by-digit readback.                                                                                              |
| `ReadbackMenu`          | string                        | no       | `''`    | Prompt asking "press 1 to confirm, 2 to re-enter".                                                                                       |
| `ReadbackMenuOptionOK`  | string (digit)                | no       | `'1'`   | DTMF key that confirms the entry.                                                                                                       |
| `ReadbackMenuOptionNOK` | string (digit)                | no       | `'2'`   | DTMF key that rejects the entry and restarts the collection loop.                                                                       |
| `OutputAttribute`       | string                        | yes      | —       | Name of the call-scoped key on `varObj` that receives the collected digits.                                                            |
| `NextStep`              | string (step ID)              | yes      | —       | Continuation after a successful entry (and confirmed readback, if enabled).                                                             |
| `NextStep_Failure`      | string (step ID)              | no       | `-1`    | Continuation when retries are exhausted or readback was rejected on the last attempt.                                                   |

### Outputs

| Branch key         | Taken when                                                                       | Fallback |
| ------------------ | -------------------------------------------------------------------------------- | -------- |
| `NextStep`         | Operation is inactive, or the caller entered a valid value (and confirmed it).   | `-1`     |
| `NextStep_Failure` | Retries exhausted or the caller rejected the readback on the last attempt.       | `-1`     |

### Component structure

Multi-node composite component (work script + Vocalls primitive nodes + optional readback sub-loop).

### Node graph

| id (canonical) | label             | Type        | Role                                                                                            |
| -------------- | ----------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `0`            | `input`           | `transient` | Component entry.                                                                                 |
| `7`            | `init`            | `script`    | Canonical config-resolution init body + reset `__cdeTry` / `__cdeDigits`.                       |
| `29`           | `prepare`         | `script`    | Active guard + pre-assign `NextStep_Failure` as the in-flight default.                          |
| (≥100)         | `prompt`          | `say`       | Plays `Prompt` (and the per-retry `NoInputPrompt` / `InvalidInputPrompt` on back-edges).        |
| (≥100)         | `collect`         | `dtmf`      | Collects digits; `min/max` from `InputLengthMin/Max`; `termination` from `TerminationCharacter`. |
| (≥100)         | `validate`        | `case`      | If length ≥ `InputLengthMin`, write `varObj[OutputAttribute]` and set `NextStep`. Else retry.   |
| (≥100)         | `retryNI`         | `say`       | `NoInputPrompt` then back-edge to `collect`. (Conditional.)                                     |
| (≥100)         | `retryIC`         | `say`       | `InvalidInputPrompt` then back-edge to `collect`. (Conditional.)                                |
| (≥100)         | `maxTries`        | `say`       | `MaxTriesPrompt` once before falling through with `NextStep_Failure`.                           |
| (≥100)         | `readbackPrompt`  | `say`       | (Optional) plays `ReadbackPrompt` then digit-by-digit readback of `__cdeDigits`.                |
| (≥100)         | `readbackMenu`    | `say`       | (Optional) plays `ReadbackMenu` ("1 to confirm, 2 to re-enter").                                |
| (≥100)         | `readbackCollect` | `dtmf`      | (Optional) collects single digit from `{ReadbackMenuOptionOK, ReadbackMenuOptionNOK}`.          |
| (≥100)         | `readbackRoute`   | `case`      | (Optional) OK → fall through to `output`; NOK → reset `__cdeDigits` and back-edge to `collect`. |
| `6`            | `output`          | `transient` | OnEnter exit log.                                                                                |

Edges (high level): `0 → 7 → 29 → prompt → collect → validate`; on success: `validate → [readback*] → 6`; on retry: `validate → retryNI/retryIC → collect`; on exhaustion: `validate → maxTries → 6`.

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
__cdeTry = 0;
__cdeDigits = '';
Logger.debug('[callerDataEntry] config resolved', { params: __rtParams });
```

`prepare` (work script — pre-assigns the failure default before the collect loop):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', -1);

if (!getValue(__rtParams, 'Active', false)) {
    global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);
    Logger.info('[callerDataEntry] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}
```

`collect-validate` (case node after dtmf):

```js
var __min = Number(getValue(__rtParams, 'InputLengthMin', 1));
if (__cdeDigits.length >= __min) {
    varObj[getValue(__rtParams, 'OutputAttribute', 'CallerData')] = __cdeDigits;
    global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);
    Logger.info('[callerDataEntry] collected', { length: __cdeDigits.length, nextStep: global[_rtNextStep] });
}
```

The retry path re-enters the dtmf node with `InvalidInputPrompt` or `NoInputPrompt` in front of it, until `__cdeTry >= MaxTries`.

`output`:

```js
OnEnter: Logger.info('[callerDataEntry] exit', { nextStep: __rtNextStep });
```

### Open questions

- The source handler plays per-digit prompts (`Digit_0.wav` … `Digit_9.wav`) during readback. Confirm Vocalls' built-in number-to-speech is acceptable instead, or whether the operator needs a configurable prompt prefix.
- The source handler logs the collected value via `NAllo_RTDS_IVRLogging`. Confirm whether logging is desired — many entries are sensitive (PIN, account number); a `LogValue: boolean` Param may need to be added.
- The two readback options (`ReadbackMenuOptionOK` / `ReadbackMenuOptionNOK`) overlap with the global Menu pattern. Confirm whether they should remain as Params or be hard-coded to `1`/`2`.
