# Operation Spec — playPrompt (PlayPrompt)

| Field          | Value                                                            |
| -------------- | ---------------------------------------------------------------- |
| Operation Type | `PlayPrompt`                                                     |
| Component name | `playPrompt`                                                     |
| Pattern        | `gui_exit` (projects Params to session vars, then a downstream PlayPrompt GUI node consumes them) |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_PlayPrompt.xml`   |
| Target file    | `rtds/components/playPrompt.js`               |

## Business purpose

Play one or more TTS prompts to the caller and continue to the next step. Used for greetings, announcements, queue messages, and any informational utterance that does not need to capture caller input. Optionally gated by a time-of-day window so the same node can be dormant outside business hours, and optionally listens for the queue-escape DTMF key when invoked from inside a queue.

### Inputs (Params)

| Param name      | Type                          | Required | Default | Description                                                                                                                  |
| --------------- | ----------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Active`        | boolean                       | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                    |
| `Prompt`        | string (pipe-delimited list)  | yes      | —       | One or more prompt IDs/strings to play, joined with `|`. Resolved against the prompt library by the runtime.                 |
| `TimeInterval`  | string (`HHMM-HHMM`)          | no       | `''`    | Active time window. If set, the operation only plays the prompt when current time is inside the window; otherwise skipped.   |
| `InQueue`       | boolean                       | no       | `false` | If true, the downstream PlayPrompt GUI node listens for the configured queue-escape DTMF key during playback.                |
| `NextStep`      | string (step ID)              | yes      | —       | Continuation after playback (or skip). Universal across operations.                                                           |

### Outputs

| Branch key | Taken when                                                                                                  | Fallback |
| ---------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| `NextStep` | Operation is inactive, `Prompt` is empty, outside the `TimeInterval` window, or playback completed normally. | `-1`     |

The component sets `_rtNextStep` to the configured `NextStep` and exits. The downstream PlayPrompt GUI node owns the playback side-effect and the queue-escape listener.

### Component structure

Single-script work body matching the canonical shape:

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[playPrompt] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[playPrompt] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __prompt = getValue(__rtParams, 'Prompt', '');
if (!__prompt || String(__prompt).trim() === '') {
    Logger.info('[playPrompt] skipped — no prompt', { nextStep: global[_rtNextStep] });
    return;
}

var __interval = getValue(__rtParams, 'TimeInterval', '');
if (__interval && !__isInsideTimeInterval(__interval)) {
    Logger.info('[playPrompt] skipped — outside time interval', { interval: __interval, nextStep: global[_rtNextStep] });
    return;
}

Logger.info('[playPrompt] handoff', { nextStep: global[_rtNextStep] });
```

`output`:

```js
OnEnter: Logger.info('[playPrompt] exit', { nextStep: __rtNextStep });
```

Variables block:

```js
__configJSON = { "Active": false, "Prompt": "", "TimeInterval": "", "InQueue": false, "NextStep": "00099" };
__environment = environment;
__rtNextStep &= _rtNextStep;
```

An operation-specific helper `__isInsideTimeInterval(raw)` lives in the master `Code` block — it parses `HHMM-HHMM` and compares against the runtime's local clock (style matches `__isMobileNumber` in `sendSms`).

### Open questions

- The source handler returns a `Result` string (`Success`, `Escape`, `QueueEscape`) — Vocalls' downstream `PlayPrompt` GUI node decides the post-playback branch internally. Confirm whether the flow author needs an explicit `NextStep_Escape` Param to differentiate the queue-escape branch.
- `TimeInterval` evaluation uses local time-of-day in `HHMM` format. Confirm the timezone the runtime should evaluate against (operator-local vs. UTC).
