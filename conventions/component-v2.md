# Component shape (v2 — skill-generated RTDS operations)

**Scope:** [Component] · **Answers:** *What does a v2 RTDS operation component look like? Four-node skeleton, master Code composition, work-body patterns.*

**Canonical reference:** [sendSms.js](../rtds/components/sendSms.js) and [sendMail.js](../rtds/components/sendMail.js). Every new RTDS operation component matches the shape below.

For the *primitive wiring* used when a v2 component embeds Designer primitives (case/recognize/component) between Script and output, see [component-mxgraph.md](component-mxgraph.md).

## 1. Node graph — four nodes, three edges

| id   | label  | Type      | Kind   | style           | geometry                 |
| ---- | ------ | --------- | ------ | --------------- | ------------------------ |
| `0`  | input  | transient | input  | `transientNode` | `(252.5, -350, 130, 40)` |
| `7`  | init   | script    | —      | `scriptNode`    | `(233.5, -220, 168, 80)` |
| `29` | script | script    | —      | `scriptNode`    | `(233.5, -60, 168, 80)`  |
| `6`  | output | transient | output | `transientNode` | `(252.5, 110, 130, 40)`  |

Edges: `28` (0→7), `30` (7→29), `38` (29→6). All bare orthogonal:

```
edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;
```

Composite mode (Designer primitives between id=29 and id=6): the four canonical ids and their geometry stay; edge `38` is replaced by a primitive chain ending at id=6. See [component-mxgraph.md](component-mxgraph.md).

## 2. Master-layer attributes — order matters

```
label, MaxEntryCount, MaxEntryNodeId, SpeechRecognitionEngine, Code,
Extensions, BackgroundNoise, BreathInEffect, Languages, Variables,
PropertiesDefinition, EnableUpdateRelations, AllowGlobalIntent, Translations,
ManualId, RequiredVariables, HintGrammar, LastLanguage, InfoAboutUser_en,
CompanyInformation_en, GeneralKnowledge_en, Translations_en, id
```

`id` is always `vocalls-master-layer`. `BackgroundNoise="true"`, `BreathInEffect="true"`, `EnableUpdateRelations="true"`, `AllowGlobalIntent="false"`.

See [sendSms.js:17-43](../rtds/components/sendSms.js#L17-L43) for the canonical attribute set.

### Languages — default is Dutch (Belgium)

The default project language is **Dutch (Belgium) — `nl-BE`**, marked `isDefault: true`. Other entries are added on demand. Empty string fields (`ttsVoiceName`, `ttsEngine`, `ttsPitch`, `ttsSpeed`, `ttsVolume`) are **preserved as `''`** — don't drop them. See the `Languages=` attribute in [sendSms.js:26](../rtds/components/sendSms.js#L26).

## 3. Master `Code` — composition

In order, separated by blank lines:

1. `__rtParams = {};` — bare declaration, no `var`.
2. The three canonical helpers from [canonical_helpers.js](../.claude/skills/rtds-vocalls-component-gen/references/canonical_helpers.js), verbatim with JSDoc: `__makeLocalNodeId`, `__extractParams`, `__setupConfig`.
3. `typeof <name> === 'undefined'`-guarded fallbacks for `getValue`, `walk`, plus `hasKey` / `nowUTC` if the work body uses them. See [helpers.md](helpers.md) for why.
4. Operation-specific helpers, JSDoc'd, `__` prefixed (`__isMobileNumber`, `__splitSemicolonList`, `__compareAttr`, …).
5. **No work-function helper.** Work logic is inline in the script node body.

Every function carries a JSDoc block (description + `@param` + `@returns`), even one-liners.

## 4. Master `Variables`

```js
__configJSON = { /* Params with placeholder defaults */ };
__environment = environment;
__rtBaseUrl   = _rtBaseUrl;                 // HTTP ops only
__rtEndpoint  = _rt<TypePrefix>Endpoint;    // HTTP ops only
__rtNextStep &= _rtNextStep;
```

`&=` is the **documented placeholder-binding operator** — it keeps `__rtNextStep` synced with the flow variable `_rtNextStep`. Use it only on `__rtNextStep`. Everywhere else, `=`.

See [sendSms.js:27](../rtds/components/sendSms.js#L27) for the canonical encoded form.

## 5. Master `PropertiesDefinition`

Three entries, in this order: `__configJSON`, `__environment`, `__nextStep`. No `__outputVar`.

See [sendSms.js:28](../rtds/components/sendSms.js#L28).

## 6. Init node body — universal

Three lines, always:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[<componentName>] config resolved', { params: __rtParams });
```

## 7. Work node body — per pattern

Patterns live in [.claude/skills/rtds-vocalls-component-gen/references/operation_bodies/](../.claude/skills/rtds-vocalls-component-gen/references/operation_bodies/): `http_call.md`, `gui_exit.md`, `set_attributes.md`, `condition.md`, `flow_jump.md`, plus `composite.md` modifier. The work body:

1. Sets default `NextStep` first: `global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);`.
2. Active guard — early return + info-level "skipped — inactive" log if `!Active`.
3. Validates inputs — warn-level log and return for any failed precondition.
4. Re-defaults to failure before any HTTP call: `global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', -1);`.
5. Builds payload, fires `jsonHttpRequest(...).then(success, error)`. **Error callback is mandatory.**
6. Three log lines total: skipped (info) / validation (warn) / outcome (info, warn, or error).

## 8. Output node

```
OnEnter='Logger.info(&apos;[<componentName>] exit&apos;, { nextStep: __rtNextStep });'
```

See [sendSms.js:98](../rtds/components/sendSms.js#L98).

## Reflect on

- **[grep]** Does the component have exactly the four canonical ids (`0`/`7`/`29`/`6`)?
- **[grep]** Master-attribute order matches §2?
- **[judgment]** Master `Code` composition matches §3?
- **[grep]** Init body is the universal three lines?
- **[grep]** Output node logs exit with `nextStep`?
