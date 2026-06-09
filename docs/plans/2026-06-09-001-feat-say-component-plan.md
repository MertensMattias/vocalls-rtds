# Implementation Plan — `say` v2 component (Phase 1)

**Date:** 2026-06-09
**Operation:** `say` (camelCase rename of PureConnect `PlayPrompt`)
**Component:** `rtds/components/say.js` (self-contained v2 composite)
**Scope:** Phase 1 only — `active` gate + single TTS prompt + single `nextStep`. Phase 2 (timeInterval gate, escape-key result branching) and pre-recorded library-audio playback are explicitly **out of scope** (see §7).

---

## 1. What `say` is

`say` is the camelCase rename of the PureConnect `PlayPrompt` handler
([`rtds/pureconnect_handlers/NAllo_RTDS_PlayPrompt.xml`](../../rtds/pureconnect_handlers/NAllo_RTDS_PlayPrompt.xml)).
It speaks a prompt to the caller. The engine already routes it as a **GUI-exit Type**:
[`registerRtdsExit("say", "play_prompt")`](../../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js).

We are building the **self-contained component** variant (the `play_prompt` canvas target),
shaped like [`guardTui.js`](../../rtds/components/guardTui.js): the canonical four-node trunk
(input/init/script/output) with a native `say` primitive embedded between the work script and
the output node. The component does the JS-side `active` gate, language selection, and structured
logging; the native primitive performs the TTS.

### Prompt vs. spoken text — the key data model

- `prompt` (param) = the prompt **name/key** (e.g. `"Welcome"`), plus `applicationId` (prompt-library app id).
- `ttsMessages` (operation-level field, **sibling to `params`**) = the actual spoken content per language:
  `{ "NL": "...", "FR": "..." }`. See [`rtds/samples/n-allo_reception.json`](../../rtds/samples/n-allo_reception.json) op `00001`.

Phase 1 renders `ttsMessages[language]` via a native `say` (TTS) primitive. `prompt`/`applicationId`
are carried as metadata (logged) but are not used for playback in the TTS path.

## 2. Params (from the seed — do not invent)

From [`import_seeds_camelCase.sql`](../../rtds/db_seed/import_seeds_camelCase.sql) (`say` block):

| Param | Type | Required | Notes |
| ----- | ---- | -------- | ----- |
| `active` | bit | yes | Gate. Read with **`true`** fallback (run-unless-disabled). |
| `applicationId` | int | no | Prompt-library application id (metadata in Phase 1). |
| `prompt` | string | yes | Prompt name/key (metadata in Phase 1). |
| `nextStep` | string | yes (`IsNext`) | The only outcome key in Phase 1. |

`ttsMessages` is **not** a dictionary attribute — it is operation-level and already round-trips via
the flow import/export SQL ([`import_flow_from_json_camelCase.sql`](../../rtds/db_seed/import_flow_from_json_camelCase.sql),
[`export_flow_to_json_camelCase.sql`](../../rtds/db_seed/export_flow_to_json_camelCase.sql)). **No dictionary seed change.**

## 3. BLOCKING dependency — runtime must forward `ttsMessages`

[`prepareGuiHandoff`](../../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js) currently
forwards only `op.params` (`vars.RTDS_currentOpConfig = op.params || {}`). It drops `op.ttsMessages`,
so the component has no access to the spoken text. The component is **inert** until this is fixed.

**Change** (in `prepareGuiHandoff`):

```js
vars.RTDS_currentOpConfig = op.params || {};
vars.RTDS_currentTtsMessages = op.ttsMessages || {};   // NEW
```

Rationale for a separate session var (vs. folding into `op.params`): mirrors the JSON's structural
separation and avoids mutating the cached `opIndex` op. This is shared infra — it also unblocks
`getLanguage` and any other prompt-playing type carrying `ttsMessages`.

This is an **engine change** → lockstep doc updates (CLAUDE.md "Change the runtime engine"):
- [`rtds/docs/runtime-spec.md`](../../rtds/docs/runtime-spec.md) — §4.8 `prepareGuiHandoff` description; §3 add a `RTDS_currentTtsMessages` row.
- [`rtds/docs/runtime-architecture.md`](../../rtds/docs/runtime-architecture.md) — handoff narrative.
- `npm run build:skill` — resync the bundled `references/rtds_2_runtime.js` snapshot.

## 4. Component design — `rtds/components/say.js`

Composite, [`composite.md`](../../.claude/skills/rtds-vocalls-component-gen/references/operation_bodies/composite.md)
Variant A (linear prefix):

```
input(0) ──28──► init(7) ──30──► script(29) ──100──► say(101) ──102──► output(6)
```

Canonical ids `0/7/29/6` and edges `28/30` never move; canonical edge `38` is replaced by `100`
(29→101) + `102` (101→6). The `say` primitive is linear (edges source from its own id; no children).
Both new edges anchor **both** ends (vertical-trunk pair `exitX=0.5;exitY=1` → `entryX=0.5;entryY=0`).

### Master `Variables`

```js
__configJSON  = { "active": true, "applicationId": 8, "prompt": "Welcome", "nextStep": "00002" };
__ttsMessages = { "NL": "Welkom bij N-Allo. ...", "FR": "Bienvenue chez N-Allo. ..." };  // literal seed
__environment = environment;
__sayText     = '';                 // cross-script: set in work(29), read by say primitive(101)
__rtOutcome   = 'nextStep';         // camelCase, matches the param key
__rtNextStep &= _rtNextStep;        // placeholder-binding operator — only here
```

On the **canvas instance** (in `main_sourceCode.js`), both config vars rebind to the live engine
state, exactly as the shipped components do
([`main_sourceCode.js` `__configJSON="context.session.variables.RTDS_currentOpConfig"`](../../projects/rtds-runtime/callScripts/main_sourceCode.js)):
- `__configJSON="context.session.variables.RTDS_currentOpConfig"`
- `__ttsMessages="context.session.variables.RTDS_currentTtsMessages"`

### Master `Code`

`__rtParams = {};` + the four canonical helpers verbatim
([`canonical_helpers.js`](../../.claude/skills/rtds-vocalls-component-gen/references/canonical_helpers.js):
`__makeLocalNodeId`, `__extractParams`, `__activeFlag`, `__setupConfig`) + `typeof`-guarded fallbacks
for `getValue`/`hasKey`/`getScoped`/`resolveConfigTokens` (+ `walk`/`nowUTC`). No HTTP helper, no
op-specific helper.

### `PropertiesDefinition`

Three entries: `__configJSON`, `__environment`, `__nextStep`. (`__ttsMessages` is bound like the
`__rt*` vars — not an operator-facing property.)

### Init node (7)

```js
language = (typeof language === 'string' && language.trim() !== '') ? language.toUpperCase() : 'NL';
__rtOutcome = 'nextStep';
__rtParams  = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[say] config resolved', { params: __rtParams, ttsLangs: Object.keys(__ttsMessages || {}), outcome: __rtOutcome });
```

### Work node (29)

```js
if (!getValue(__rtParams, 'active', true)) {
    Logger.info('[say] skipped — inactive', { outcome: 'nextStep' });
    return;
}
__sayText = getValue(__ttsMessages, language, '');     // getValue is case-insensitive (NL/nl)
if (__sayText === '') {
    Logger.warn('[say] no tts text for language', { language: language, prompt: getValue(__rtParams, 'prompt', '') });
}
__rtOutcome = 'nextStep';
Logger.info('[say] play', { prompt: getValue(__rtParams, 'prompt', ''), language: language, outcome: __rtOutcome });
```

### `say` primitive (101)

`Type="say"`, `style="sayNode"`, `Text="{__sayText}"` (engine-scope `{var}` markup — **not** `${}`;
see [`node_types.md`](../../.claude/skills/rtds-vocalls-component-gen/references/node_types.md) rule #6),
on `baselayer`, with explicit anchored edges `100` (29→101) and `102` (101→6).

### Output node (6)

```js
_rtNextStep = getValue(__rtParams, __rtOutcome, '');
Logger.info('[say] exit', { outcome: __rtOutcome, nextStep: _rtNextStep });
```

## 5. Convention guardrails (bake in from the start)

Lessons flagged in [`guardTui.spec.md`](../../rtds/specs/guardTui.spec.md) "convention debt" — avoid them here:
- `Logger.debug/info/warn` everywhere; **no bare `log_debug`**.
- Init carries the floor `Logger.debug('[say] config resolved', …)`.
- Pre-declare every cross-script var (`__sayText`, `__rtOutcome`) in master `Variables`.
- `active` read fallback = **`true`**.
- Work body **never** writes `RTDS_OP_*`, **never** `return`s an exit key, **never** writes
  `_rtNextStep` mid-flight — resolved once at the output node.
- camelCase outcome keys (`'nextStep'`), matching the seed param names.

## 6. Files to create / change

| Artifact | Action |
| -------- | ------ |
| `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` | **edit** `prepareGuiHandoff` (forward `ttsMessages`) — *blocking, do first* |
| `rtds/docs/runtime-spec.md`, `rtds/docs/runtime-architecture.md` | update for the handoff change + new session var |
| `rtds/components/say.js` | create (composite, §4) |
| `rtds/specs/say.spec.md` | create — note TTS-via-`ttsMessages`; `prompt`/`applicationId` metadata; dropped legacy behaviour; `catalog:` frontmatter |
| `scripts/gen_catalog.py` | add a `say` `ROW_ORDER` entry |
| `rtds/db_seed/import_seeds_camelCase.sql` | **no change** (Phase 1) |
| `projects/rtds-runtime/tests/components/say.test.js` | create contract test |
| runtime registration | verify `registerRtdsExit("say","play_prompt")` stays; **no** `registerRtdsOperation` twin |

## 7. Out of scope (Phase 1)

- **Phase 2** — `timeInterval` time-window gate (JS in init) and escape-key DTMF result branching
  (`nextStep_Escape` / `nextStep_Failure` via an embedded `dtmf` primitive). Requires new dictionary
  seed attributes, spec branch table, and a `dtmf` primitive + edges.
- **Pre-recorded library-audio playback** (the literal PlayPrompt behaviour using `prompt`/`applicationId`
  against the prompt library) — a different mechanism (audio / `play_audio` node), not a TTS `say` node.

## 8. Open item to verify in Designer

`Text="{__sayText}"` relies on the native `say` node resolving `{var}` against engine scope. Master-layer
vars declared without `var` become global, so this *should* resolve, but node_types.md documents only
`{key}`/`{var}` — confirm a `__`-prefixed global is in scope. Fallback: write `__sayText` to a plain
flow variable the engine definitely exposes.

## 9. Build & verify

1. Edit `prepareGuiHandoff` (§3); update runtime docs.
2. Generate `say.js` (§4) following the skill WORKFLOW steps 2–5.
3. `python .claude/skills/rtds-vocalls-component-gen/scripts/layout_component.py rtds/components/say.js`
   (don't hand-place primitive geometry).
4. Author `say.spec.md`; add the `gen_catalog.py` row; `npm run gen:catalog`.
5. `npm run build:skill` (resync runtime snapshot + any bundle); `npm run check`; `npm run check:lockstep`.
6. Add + run the Jest contract test (assert: active gate skips to `nextStep`; correct language text
   selected from `ttsMessages`; outcome resolves to `nextStep`).
7. Designer smoke-test the `{__sayText}` binding (§8) against the n-allo `Say: Welcome` sample.

## 10. Reference flow & test fixtures

Validated against [`rtds/samples/n-allo_reception.json`](../../rtds/samples/n-allo_reception.json)
(`supportedLanguages: "NL|FR"`). **All five `say` operations are Phase-1-shaped** — `active` gate,
single `prompt` name, single `nextStep`, `ttsMessages{NL,FR}`; no escape keys, no `timeInterval`, no
result branching. Phase 1 fully covers this flow. Use these as the contract-test cases:

| op id | name | `applicationId` | `prompt` | `nextStep` |
| ----- | ---- | --------------- | -------- | ---------- |
| `00001` | Say: Welcome | 8 | `Welcome` | `00002` |
| `00051` | Queue: Message 1 | 5 | `Waitmessage01` | `00052` |
| `00052` | Play: NoBodyAvailable | 5 | `NoBodyAvailable` | `00091` |
| `00093` | Play: Voicemail Error | 9 | `error` | `00094` |
| `00094` | play: voicemail disconnect | 9 | `disconnect` | `00100` |

Notes from the flow:
- `getLanguage` (`00002`) also carries `ttsMessages` → the `prepareGuiHandoff` change (§3) benefits it
  too; this is shared infra, not say-specific.
- Every `say` has an `applicationId` pointing at the prompt library — the production system plays
  library audio keyed by `prompt`. **Phase 1 TTS-only renders `ttsMessages` instead and ignores the
  library** (the accepted simplification; library-audio playback remains the §7 out-of-scope item).
- `say 00001` (Welcome) runs **before** `getLanguage` (`00002`), so it plays in the default language
  (`NL`) — expected flow design, not a component concern.
