# Operation Spec — playAudio (PlayAudio)

| Field          | Value                                                            |
| -------------- | ---------------------------------------------------------------- |
| Operation Type | `PlayAudio`                                                      |
| Component name | `playAudio`                                                      |
| Pattern        | `gui_exit` (projects Params to session vars, then a downstream PlayAudio GUI node consumes them) |
| Source handler | `rtds_pureconnect_handlers/handlers/NAllo_RTDS_PlayAudio.xml`    |
| Target file    | `rtds_vocalls_operations/components/playAudio.js`                |

## Business purpose

Play a pre-recorded audio file (hold music, a recorded announcement, a notification jingle) to the caller and continue to the next step. Differs from `PlayPrompt` in that the source is a static audio asset by name, not a TTS prompt resolved against the prompt library.

### Inputs (Params)

| Param name    | Type    | Required | Default | Description                                                                                                                |
| ------------- | ------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `Active`      | boolean | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                  |
| `AudioSource` | string  | yes      | —       | Audio asset identifier resolved by the runtime (e.g. a `.wav` filename or library key).                                    |
| `Timeout`     | number  | no       | `0`     | Maximum playback duration in seconds. `0` plays the file to completion.                                                    |
| `InQueue`     | boolean | no       | `false` | If true, the runtime listens for the configured queue-escape DTMF key during playback.                                     |

### Outputs

| Branch key | Taken when                                                  | Fallback |
| ---------- | ----------------------------------------------------------- | -------- |
| `NextStep` | Operation is inactive or playback completed normally.       | `-1`     |

The component sets `_rtNextStep` to the configured `NextStep` and exits. The downstream PlayAudio GUI node owns the playback and the queue-escape listener.

### Component structure

Single-script work body matching the canonical shape.

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[playAudio] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[playAudio] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __source = getValue(__rtParams, 'AudioSource', '');
if (!__source || String(__source).trim() === '') {
    Logger.warn('[playAudio] missing AudioSource', { nextStep: global[_rtNextStep] });
    return;
}

Logger.info('[playAudio] handoff', { source: __source, nextStep: global[_rtNextStep] });
```

`output`:

```js
OnEnter: Logger.info('[playAudio] exit', { nextStep: __rtNextStep });
```

Variables block:

```js
__configJSON = { "Active": false, "AudioSource": "", "Timeout": 0, "InQueue": false, "NextStep": "00099" };
__environment = environment;
__rtNextStep &= _rtNextStep;
```

### Open questions

- The source handler returns a richer `Result` (`Success` / `Escape` / `QueueEscape` / `Tone` / `Timeout` / `Failure` / `Attribute`). Vocalls' downstream `PlayAudio` GUI node likely collapses these into a single continue branch — confirm whether any branch (e.g. tone-detected interrupt) needs a dedicated `NextStep_*` Param.
- Tone-detection (frequency monitoring) is a niche PureConnect feature. Confirm whether the operator needs it preserved in Vocalls.
