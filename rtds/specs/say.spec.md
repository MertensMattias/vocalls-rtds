---
status: implemented
catalog:
  operation: "say"
  legacy: false
  pattern: "`gui_exit` + say primitive"
  component: "say.js"
  componentMark: "✅"
  runtimeCell: "GUI-exit `play_prompt` (`say`)"
  seed: "✅"
---

# Operation Spec — say (PlayPrompt)

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Operation Type | `say` (camelCase rename of PureConnect `PlayPrompt`)               |
| Component name | `say`                                                              |
| Pattern        | `gui_exit` target — self-contained v2 composite (Script + native `say` primitive) |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_PlayPrompt.xml`             |
| Target file    | `rtds/components/say.js`                                           |
| Exit key       | `play_prompt` (engine: `registerRtdsExit("say", "play_prompt")`)  |

## Business purpose

Speak a prompt to the caller. The routing table identifies the prompt by name (`prompt`) and
prompt-library application (`applicationId`); the caller-facing text per language lives in the
operation-level `ttsMessages` map. The component honours an `active` gate, selects the spoken text
for the current call language, plays it via a native Vocalls `say` (TTS) node, and continues to a
single `nextStep`.

### Inputs (Params)

| Param name      | Type             | Required | Default | Description                                                                                           |
| --------------- | ---------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `active`        | boolean          | yes      | `true`  | If falsy, the operation logs a skip and exits to `nextStep` without speaking. Read with a `true` fallback (run unless explicitly disabled). |
| `applicationId` | number           | no       | —       | Prompt-library application id. Carried for flow/header parity; not used for playback in the TTS path. |
| `prompt`        | string           | yes      | —       | Prompt name/key (e.g. `"Welcome"`). Identifies the library entry; logged as metadata in the TTS path. |
| `nextStep`      | string (step ID) | yes      | —       | The single continuation after the prompt has played (or when inactive).                               |

### Operation-level field (sibling of `params`)

| Field         | Type                       | Required | Description                                                                                          |
| ------------- | -------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `ttsMessages` | `{ "<LANG>": "<text>" }`   | yes (for TTS) | Per-language spoken text, e.g. `{ "NL": "...", "FR": "..." }`. **Not** part of `params` — delivered to the component on `RTDS_currentTtsMessages` by `prepareGuiHandoff`. The component selects `ttsMessages[language]`. |

### Outputs

| Branch key | Taken when                                                       | Fallback |
| ---------- | --------------------------------------------------------------- | -------- |
| `nextStep` | Always — after the prompt plays, or immediately when inactive.   | `''`     |

Single-branch operation: there is no success/failure split. The component stages
`__rtOutcome = 'nextStep'` and resolves it once at the output node via
`_rtNextStep = getValue(__rtParams, __rtOutcome, '')` (empty-string fallback,
[conventions/component-v2.md](../../conventions/component-v2.md) §7–§8).

### Runtime dependency

`say` is a **GUI-exit** Type — the engine routes to it via the `play_prompt` exit key and does **not**
run a JS twin. The spoken text reaches the component only because `prepareGuiHandoff`
([rtds_2_runtime.js](../../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js)) forwards
the operation-level `ttsMessages` onto `context.session.variables.RTDS_currentTtsMessages` (a sibling
of `RTDS_currentOpConfig`). See [runtime-spec.md §3 / §4.8](../docs/runtime-spec.md). This forwarding
is shared infra — it also serves `getLanguage` and any other prompt-playing GUI-exit Type.

### Component structure

Self-contained v2 composite — the canonical four-node trunk with one native `say` primitive between
the work script and the output node. See [`rtds/components/say.js`](../components/say.js).

```
input(0) → init(7) → script(29) → say(101, native TTS) → output(6)
```

`init` (id=7) — normalise `language`, then the universal config resolve:

```js
language = (typeof language === 'string' && language.trim() !== '') ? language.toUpperCase() : 'NL';
__rtOutcome = 'nextStep';
__rtParams  = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[say] config resolved', { params: __rtParams, ttsLangs: Object.keys(__ttsMessages || {}), outcome: __rtOutcome });
```

`script` (id=29) — active gate + language pick; stages the spoken text into `__sayText` for the
primitive (it cannot read `__rtParams` — [node_types.md](../../.claude/skills/rtds-vocalls-component-gen/references/node_types.md) rule #6):

```js
if (!getValue(__rtParams, 'active', true)) {
    Logger.info('[say] skipped -- inactive', { outcome: 'nextStep' });
    return;
}
__sayText = getValue(__ttsMessages, language, '');
if (__sayText === '') {
    Logger.warn('[say] no tts text for language', { language: language, prompt: getValue(__rtParams, 'prompt', '') });
}
__rtOutcome = 'nextStep';
Logger.info('[say] play', { prompt: getValue(__rtParams, 'prompt', ''), language: language, outcome: __rtOutcome });
```

`say` primitive (id=101) — `Type="say"`, `Text="{__sayText}"` (engine-scope `{var}` markup, resolved
at TTS time).

`output` (id=6, `OnEnter`) — resolves the staged outcome once:

```js
_rtNextStep = getValue(__rtParams, __rtOutcome, '');
Logger.info('[say] exit', { outcome: __rtOutcome, nextStep: _rtNextStep });
```

Variables block (component-definition seed; on the canvas instance `__configJSON` /
`__ttsMessages` rebind to `RTDS_currentOpConfig` / `RTDS_currentTtsMessages`):

```js
__configJSON  = { "active": true, "applicationId": 8, "prompt": "Welcome", "nextStep": "00002" };
__ttsMessages = { "NL": "Welkom bij N-Allo. ...", "FR": "Bienvenue chez N-Allo. ..." };
__environment = environment;
__sayText     = '';
__rtOutcome   = 'nextStep';
__rtNextStep &= _rtNextStep;
```

## Scope & out-of-scope (Phase 1)

This component is **Phase 1**: `active` gate + single TTS prompt from `ttsMessages` + single
`nextStep`. The following legacy PlayPrompt behaviours were deliberately dropped from the camelCase
contract and are **out of scope**:

- **`timeInterval` time-window gate** and **escape-key DTMF result branching**
  (`Success` / `Escape` / `QueueEscape` / `Failure`) from the PureConnect handler — would require new
  seed attributes, additional `nextStep_*` outputs, and an embedded `dtmf` primitive.
- **Pre-recorded prompt-library audio playback** keyed by `prompt` / `applicationId` — a different
  mechanism (`play_audio` / audio node), not a TTS `say` node. In Phase 1 those two Params are
  metadata only.

## Open item to verify in Designer

`Text="{__sayText}"` relies on the native `say` node resolving `{var}` against engine scope.
Master-layer vars declared without `var` become global, so this should resolve, but confirm a
`__`-prefixed global is in scope. Fallback: stage the text into a plain flow variable the engine
definitely exposes.
