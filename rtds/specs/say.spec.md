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
| `ttsMessages` | `{ "<LANG>": "<text>" }`   | yes (for TTS) | Per-language spoken text, e.g. `{ "NL": "...", "FR": "..." }`. In the routing table it is a **sibling** of `params`, not a member. `prepareGuiHandoff` **folds a copy into** `RTDS_currentOpConfig` (under the reserved `ttsMessages` key) so it refreshes through `__configJSON` → `__setupConfig` on every loop re-entry; the component reads it via `getValue(__rtParams, 'ttsMessages', …)` and selects `[language]`, then resolves `${var}` tokens on the chosen string via `resolveConfigTokens` (varObj first). This folded config is the **only** prompt-text channel — there is no separate `RTDS_currentTtsMessages` var. |

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
([rtds_2_runtime.js](../../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js)) **folds the
operation-level `ttsMessages` into `RTDS_currentOpConfig`** (under the `ttsMessages` key) — the **single**
prompt-text channel, with no separate handoff var. The fold is what makes the text refresh per step: the
component re-reads `__configJSON` (→ `__rtParams`) on every loop re-entry. A standalone canvas binding
(the retired `RTDS_currentTtsMessages` approach) is captured once and goes **stale** across successive
`say` ops in the same call — it kept the first op's text, the bug this contract fixes. See
[runtime-spec.md §3 / §4.8](../docs/runtime-spec.md). This fold is shared infra — it serves **any
prompt-playing GUI-exit Type** (one whose Params carry `prompt` + `applicationId`), e.g. `getLanguage`.

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
Logger.debug('[say] config resolved', { params: __rtParams, ttsLangs: Object.keys(getValue(__rtParams, 'ttsMessages', {}) || {}), outcome: __rtOutcome });
```

`script` (id=29) — active gate + language pick; stages the spoken text into `__sayText` for the
primitive (it cannot read `__rtParams` — [node_types.md](../../.claude/skills/rtds-vocalls-component-gen/references/node_types.md) rule #6):

```js
if (!getValue(__rtParams, 'active', true)) {
    Logger.info('[say] skipped -- inactive', { outcome: 'nextStep' });
    return;
}
// ttsMessages is folded into the op config by the runtime, so it refreshes every re-entry.
// It is the SOLE tts source (no standalone __ttsMessages fallback). __setupConfig only
// token-resolves top-level strings, so ${var} placeholders are resolved on the chosen
// language string here via resolveConfigTokens (varObj first, then global).
var __ttsSource = getValue(__rtParams, 'ttsMessages', null);
__sayText = getValue(__ttsSource, language, '');
if (typeof __sayText === 'string' && __sayText !== '') {
    __sayText = resolveConfigTokens(__sayText, 'ttsMessages.' + language);
}
if (__sayText === '') {
    Logger.warn('[say] no tts text for language', { language: language, prompt: getValue(__rtParams, 'prompt', '') });
}
__rtOutcome = 'nextStep';
Logger.info('[say] play', { prompt: getValue(__rtParams, 'prompt', ''), language: language, outcome: __rtOutcome });
```

`say` primitive (id=101) — `Type="say"`, `Text="{Speech.ssml(__sayText)}"`. The `Speech.ssml(...)`
wrapper tells the TTS engine to interpret the text as SSML (matching the shipped
[voicemaildetector.js](../components/voicemaildetector.js) say nodes); the engine-scope `{...}`
expression resolves the master-layer global `__sayText` at TTS time.

`output` (id=6, `OnEnter`) — resolves the staged outcome once:

```js
_rtNextStep = getValue(__rtParams, __rtOutcome, '');
Logger.info('[say] exit', { outcome: __rtOutcome, nextStep: _rtNextStep });
```

Variables block (component-definition seed; on the canvas instance `__configJSON` rebinds to
`RTDS_currentOpConfig`, which now carries `ttsMessages` folded in). The standalone `__ttsMessages`
seed is kept only as shape documentation — **no node reads it**; the spoken text is read from
`__rtParams.ttsMessages`:

```js
__configJSON  = { "active": true, "applicationId": 11, "prompt": "Welcome", "nextStep": "00002" };
__ttsMessages = { "NL": "Welkom bij N-Allo. ...", "FR": "Bienvenue chez N-Allo. ..." };  // inert: doc only
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

## TTS / SSML

The spoken text (`ttsMessages[language]`, staged into `__sayText`) is rendered through
`Text="{Speech.ssml(__sayText)}"`, so **SSML markup in the `ttsMessages` values is supported** — e.g.
`<break time="500ms"/>`, `<prosody rate="slow">…</prosody>`. The RTDS pipeline carries it intact:
`prepareGuiHandoff` folds the object into the op config, and the component XML holds only the
`{Speech.ssml(__sayText)}` placeholder — never the literal markup. `${var}` placeholders **are**
resolved: `__setupConfig` skips the nested `ttsMessages` object (it only resolves top-level strings),
so the work node runs `resolveConfigTokens` on the chosen language string itself (varObj first, then
global) before staging it into `__sayText`. Two authoring caveats:

- **JSON escaping** — SSML attribute quotes must be valid JSON: `"NL": "… <break time=\"500ms\"/> …"`
  (or use single-quoted SSML attributes to avoid escaping). When authored directly in the seed SQL
  (`import_flow_from_json_camelCase.sql`), single quotes additionally double (`''`) per SQL literal rules.
- **Reserved characters** — once SSML is active, literal `&` / `<` in the spoken text must be escaped
  (`&amp;` / `&lt;`).

`${var}` tokens in the chosen `ttsMessages[language]` string **are** interpolated: the work node runs
`resolveConfigTokens` on it (varObj first, then global; bare `${name}` only, no expressions). An
unresolved placeholder is left raw and a warn is logged — never silently blanked.

## Open item to verify in Designer

The `{Speech.ssml(__sayText)}` expression relies on the native `say` node resolving a master-layer
`__`-global at TTS time. This is the same idiom the shipped
[voicemaildetector.js](../components/voicemaildetector.js) uses (`{Speech.ssml(__welcomeMessage)}`),
so it is well-precedented — confirm on first Designer import. Fallback: stage the text into a plain
flow variable the engine definitely exposes.
