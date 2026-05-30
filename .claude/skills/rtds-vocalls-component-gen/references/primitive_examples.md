# Primitive examples — Style A composite components

A grounded example collection for Vocalls Designer mxGraph nodes a
Style A component can host. Every example is reduced from a production
reference and verified against [component-v2.md](../conventions/component-v2.md),
[node_types.md](node_types.md), and
[operation_bodies/composite.md](operation_bodies/composite.md).

This file's job is to show **what the XML actually looks like** for
each piece of a component — master layer, the Languages / Translations
machinery, the four-node graph skeleton, and per-Type primitive nodes
— so you can ground every wiring decision in real markup.

Policy lives in the other reference files; only ground-truth XML
lives here.

**Sources** (read-only; do not edit these from the skill):

- [engieGetLanguage.js](examples/engieGetLanguage.js)
  — production reference. The component as a whole is Style B
  (multi-output, native composite with Engine `globalIntent` +
  `component` Types). Style A reuses the primitive shapes
  (`transient`, `script`, `say`, `case`, `counter`, `recognize`) but
  not the multi-output / native-composite machinery. Anything from
  that file not shown below is intentionally excluded — see [§8 Out
  of scope](#8-out-of-scope).
- [available_nodes_template.js](examples/available_nodes_template.js)
  — palette template. Source for Types Engie doesn't instantiate
  (`setvar`, `pause`, `number`, `redirect`, `dtmf`) and for confirming
  attribute defaults.
- [sendSms.js](examples/sendSms.js)
  — Style A baseline. Master layer + canonical 4-node skeleton.

---

## Contents

1. [mxGraphModel root + root-block order](#1-mxgraphmodel-root)
2. [Master layer (Style A)](#2-master-layer)
3. [Languages block](#3-languages)
4. [Translations block](#4-translations)
5. [`${name}` vs `{name}` — two different substitution mechanisms](#5-substitution)
6. [Canonical 4-node skeleton + 3 edges](#6-canonical-skeleton)
7. Per-Type primitive examples
   - 7.1 [`transient` — input + output](#71-transient)
   - 7.2 [`script`](#72-script)
   - 7.3 [`say` (linear-flow TTS)](#73-say)
   - 7.4 [`setvar`](#74-setvar)
   - 7.5 [`pause`](#75-pause)
   - 7.6 [`case` (branching)](#76-case)
   - 7.7 [`counter` (branching)](#77-counter)
   - 7.8 [`recognize` (branching)](#78-recognize)
   - 7.9 [`number` (branching)](#79-number)
   - 7.10 [`redirect` (linear-with-failure-branch)](#710-redirect)
   - 7.11 [`dtmf` (branching)](#711-dtmf)
8. [Edges — shape and wiring rules](#7-edges)
9. [Layers and `parent` references](#9-layers-and-parent-references)
10. [Id-numbering observations](#10-id-numbering)
11. [Out of scope (Style B only)](#11-out-of-scope)

---

## 1. mxGraphModel root

Universal across every component. `dx` / `dy` reflect the canvas
viewport at save time and may vary per file; everything else is
constant.

```xml
<mxGraphModel
  dx="5645"
  dy="4413"
  grid="1"
  gridSize="10"
  guides="1"
  tooltips="1"
  connect="1"
  arrows="1"
  fold="1"
  page="1"
  pageScale="1"
  pageWidth="850"
  pageHeight="1100"
>
  <root> … </root>
</mxGraphModel>
```

### Root-block order

Inside `<root>`:

1. Exactly one **master-layer `<object>`** with `id="vocalls-master-layer"`
   (see [§2](#2-master-layer)).
2. One `<mxCell id="baselayer" parent="vocalls-master-layer" />` —
   the layer every visible node sits on.
3. All non-master `<object>` nodes and `<mxCell edge="1">` edges
   intermixed, in author/save order. The parser does not require
   nodes to precede edges.

---

## 2. Master layer

The master-layer `<object>` is where every component-scoped global
lives — the canonical helpers (`__makeLocalNodeId`, `__extractParams`,
`__setupConfig`), the `__configJSON` Params object, environment
bindings, properties exposed to the flow author, and the `Languages`
/ `Translations` blocks. Its `id` is always `vocalls-master-layer`
and it sits at the top of `<root>`.

The **Style A** attribute set and order are pinned in
[component-v2.md §2–§5](../conventions/component-v2.md):

```xml
<object
  label=""
  MaxEntryCount=""
  MaxEntryNodeId=""
  SpeechRecognitionEngine=""
  Code='__rtParams = {};&#xa;&#xa;/* __makeLocalNodeId … */&#xa;/* __extractParams … */&#xa;/* __setupConfig … */'
  Extensions=""
  BackgroundNoise="true"
  BreathInEffect="true"
  Languages="{…JSON-like block, see §3…}"
  Variables='__configJSON = {…};&#xa;__environment = environment;&#xa;__rtBaseUrl = _rtBaseUrl;&#xa;__rtEndpoint = _rt&lt;TypePrefix&gt;Endpoint;&#xa;__rtNextStep &amp;= _rtNextStep;'
  PropertiesDefinition='[ {__configJSON…}, {__environment…}, {__nextStep…} ]'
  EnableUpdateRelations="true"
  AllowGlobalIntent="false"
  Translations=""
  ManualId=""
  RequiredVariables=""
  HintGrammar=""
  LastLanguage="default"
  InfoAboutUser_en=""
  CompanyInformation_en=""
  GeneralKnowledge_en=""
  Translations_en=""
  id="vocalls-master-layer"
>
  <mxCell />
</object>
```

Key facts you have to get right:

- `id="vocalls-master-layer"` — fixed.
- The closing `<mxCell />` (empty self-closing cell) is required.
- `BackgroundNoise="true"`, `BreathInEffect="true"`,
  `EnableUpdateRelations="true"` — always `"true"`.
- `AllowGlobalIntent="false"` — **always `"false"` for Style A**.
  (The production reference sets `"true"`; that's Style B and out
  of scope — see §11.)
- `Code` holds the three canonical helpers verbatim plus any
  operation-specific helpers. See
  [canonical_helpers.js](canonical_helpers.js).
- `Variables` declares the per-component globals; the `&=` operator
  on `__rtNextStep` is the documented placeholder-binding form
  ([component-v2.md](../conventions/component-v2.md) §4). Not a typo.
- `PropertiesDefinition` has exactly three entries ([component-v2.md](../conventions/component-v2.md) §5).
- `Translations`, `Translations_<lang>` — see §4. Style A uses these
  for prompts spoken via `{name}` markup in `say.Text`. Use them only
  if your component speaks; pure HTTP components can leave them empty.
- `Languages` — see §3. Style A defaults to a single locale
  `nl-BE`, marked `isDefault: true`.

For the live skeleton, copy
[`assets/template.xml`](../assets/template.xml). It has
`{{operation_specific_helpers}}`, `{{configJSON_default}}`,
`{{operation_variable_refs}}`, `{{operation_work_body}}`, and
`{{componentName}}` placeholders to fill in.

---

## 3. Languages

`Languages` is a JSON-like string (single-quoted keys; written on one
line in the XML attribute) listing the locales the component speaks
in. Each locale carries its TTS configuration.

### Style A default — single locale

```
{
  'nl': {
    'isDefault':             true,
    'languageName':          'Dutch (Belgium)',
    'ttsLanguageCode':       'nl-BE',
    'ttsVoiceName':          '',
    'ttsEngine':             '',
    'ttsPitch':              '',
    'ttsSpeed':              '',
    'ttsVolume':             '',
    'prosodyBaseEnabled':    true,
    'prosodyContourEnabled': false
  }
}
```

In the XML attribute it's collapsed to one line and XML-encoded
(`&apos;` for `'`). The template carries this default verbatim.

### Adding more locales

If the component speaks in more than one locale, add additional
entries — same field set, **exactly one `isDefault: true`**, empty
strings for fields you want the engine defaults for:

```
{
  'nl': { 'isDefault': true,  'languageName': 'Dutch (Belgium)', 'ttsLanguageCode': 'nl-BE', … },
  'fr': { 'isDefault': false, 'languageName': 'French',          'ttsLanguageCode': 'fr-BE', 'ttsEngine': 'ElevenLabs', 'ttsVoiceName': 'fr-BE-Luc', … },
  'en': { 'isDefault': false, 'languageName': 'English',         'ttsLanguageCode': 'en-GB', 'ttsEngine': 'ElevenLabs', 'ttsVoiceName': 'en-GB-Luke', … }
}
```

Field reference:

| Field                   | Type    | Notes                                                      |
| ----------------------- | ------- | ---------------------------------------------------------- |
| `isDefault`             | boolean | Exactly one locale carries `true`.                          |
| `languageName`          | string  | Human-readable label.                                       |
| `ttsLanguageCode`       | string  | BCP-47 locale (`nl-BE`, `fr-BE`, `en-GB`, `de-DE`).         |
| `ttsVoiceName`          | string  | Voice id at the chosen engine. `""` lets the engine default.|
| `ttsEngine`             | string  | `Google` / `Microsoft` / `ElevenLabs`. `""` = engine default.|
| `ttsPitch` / `ttsSpeed` / `ttsVolume` | string  | Per-locale prosody overrides. `""` = engine default. |
| `prosodyBaseEnabled`    | boolean | Independent per locale.                                     |
| `prosodyContourEnabled` | boolean | Independent per locale.                                     |

For each non-default locale you list, **also add empty
`Translations_<lang>=""` and `Text_<lang>` / `AltTexts_<lang>` slots
on every `say` node** (see §4 and §7.3) — Designer expects the slots
to exist even when blank.

---

## 4. Translations

Translation keys are an alternative to literal `Text` on `say` nodes
— they let you store all the prompts the component speaks in the
master layer and reference them by name from each `say.Text`. The
engine resolves the key when the `say` node plays (see §5).

### `Translations` attribute (default locale)

A semicolon-terminated list of `key = 'value'` assignments, one per
prompt:

```
Translations="guardTuiPrompt = 'Your number is currently activated for {configName}. Press 3 to deactivate.';
              guardTuiResult = 'Your number is successfully {action} for {configName}.';
              guardTuiFailed = 'Sorry, we could not process your request.';"
```

Single quotes on the right; semicolons between assignments. Key names
are bare identifiers (no quotes, no `__` prefix, no `${...}` wrappers
— this is master-layer JS scope but evaluated by the engine, not by
`__setupConfig`).

The values may contain `{name}` markup that the engine resolves
**again** at TTS time against the engine scope — useful when a prompt
needs a variable the component writes during execution (see §5).

### Per-locale `Translations_<lang>` attributes

For every non-default locale in `Languages`, the engine reads
`Translations_<lang>` for that locale's prompts. They have the same
shape as `Translations`:

```
Translations_fr="guardTuiPrompt = 'Votre numéro est actuellement activé pour {configName}. Appuyez sur 3 pour désactiver.';
                 guardTuiResult = 'Votre numéro est {action} pour {configName}.';
                 guardTuiFailed = 'Désolé, nous n'avons pas pu traiter votre demande.';"
```

If a `Translations_<lang>` slot is empty (`""`), the engine falls
back to the default-locale `Translations` for that key.

### When to use Translations vs literal Text

| Approach                | When to use                                                |
| ----------------------- | ---------------------------------------------------------- |
| Literal `Text="…"`      | One-locale component, prompt doesn't change at runtime.     |
| `Translations` + `{key}` | Multi-locale component, OR a single-locale component where the prompt embeds a runtime variable (`{configName}`). |

For a typical Style A RTDS-operation component (HTTP call, gui_exit,
condition, etc.) you usually don't speak at all — leave `Translations`
and `Translations_<lang>` empty. They become load-bearing only when
the component embeds a `say` primitive in composite mode.

---

## 5. Substitution

There are **two different `…name…` substitution mechanisms**, with
different syntaxes and different evaluation times. Mixing them up is
the most common source of "the prompt printed the literal text
`${callerName}`" bugs.

### `${name}` — runtime resolution against globals

- **Syntax**: `${bareIdentifier}` — leading `$`, curly braces, bare
  identifier inside.
- **Resolved by**: the runtime — at *init-node execution time* by
  `__setupConfig` for every value in `__configJSON`; potentially also
  by the engine when reading certain primitive attributes that name
  global variables (e.g. `redirect.Destination`).
- **Scope**: the global `global` object.
- **Used in**:
  - `__configJSON` values (whole-string or partial substitution —
    see [params.md](../conventions/params.md)).
  - `redirect.Destination` and similar attributes that point at
    runtime-resolved values.
- **Unresolved**: leaves the literal `${name}` and logs
  `Logger.warn` — silent `""` substitution would create silent bugs.

Example — `__configJSON`:

```jsonc
{
    "To":   "${rtSmsTo}",                                  // whole string -> String(global.rtSmsTo)
    "Body": "Hello ${callerName}, ref ${ref}",             // partial -> "Hello Alice, ref 42"
    "From": "8850"                                         // literal, no substitution
}
```

Example — `redirect.Destination`:

```xml
<object Type="redirect" Destination="${rtTransferNumber}" …>
```

### `{name}` — Say-node TTS-time resolution

- **Syntax**: `{bareIdentifier}` — curly braces only, no `$`, bare
  identifier inside.
- **Resolved by**: the engine's TTS renderer — at the moment the
  `say` node speaks (or another engine consumer that supports TTS
  markup).
- **Scope**: the engine scope at speak time. The most common
  resolution path is **against the master `Translations` /
  `Translations_<lang>` block** for the active locale, so the
  rendered text becomes the value of that key. The engine then
  applies a second pass over the resolved string to substitute any
  `{name}` references against engine variables in scope (so a
  translation value like `'Hello {callerName}'` will pick up
  `callerName` from engine scope when spoken).
- **Used in**:
  - `say.Text`, `say.AltTexts`.
  - `Translations` values, recursively (see above).

Example — `say.Text` pointing at a translation key:

```xml
<object Type="say"
        Text="{guardTuiPrompt}"
        SelectionMode="temporary"
        … >
```

…with the master `Translations` block providing:

```
Translations="guardTuiPrompt = 'Welcome {callerName}, press 3 to deactivate.';"
```

At TTS time the engine resolves `{guardTuiPrompt}` to the translation
value, then resolves `{callerName}` against engine scope. Caller hears
"Welcome Alice, press 3 to deactivate."

Example — `say.Text` with a direct engine-variable reference (no
translation indirection):

```xml
<object Type="say"
        Text="Your reference is {reference}."
        … >
```

At TTS time the engine resolves `{reference}` against engine scope.
No master `Translations` key required.

### Decision table

| You need…                                                         | Use         | Where                                       |
| ----------------------------------------------------------------- | ----------- | ------------------------------------------- |
| Resolve a flow / session global once at init time, into Params    | `${name}`   | `__configJSON` value                        |
| Pass a flow-resolved value into a `redirect` destination          | `${name}`   | `redirect.Destination`                      |
| Speak a prompt that varies by locale                              | `{key}`     | `say.Text` → `Translations` / `Translations_<lang>` |
| Speak a prompt that embeds a runtime variable                     | `{var}`     | `say.Text` directly, or in a `Translations` value |
| Run a JS expression                                               | neither     | Put it in a `script` node; write to `global` first |

### What neither will do

- ❌ **No expressions** — `${user.name}`, `${count + 1}`,
  `${a || b}`, `${user?.email}` are not recognised. Only bare
  identifiers.
- ❌ **No JS templates** — the runtime disables `new Function` and
  `eval`. If you need an expression, compute it in a `script` node
  and write the result to a global first.
- ❌ **`__setupConfig` does not run against primitive attributes** —
  `${var}` markup inside `say.Text` or `case.Expression` is **not**
  resolved by `__setupConfig`; only the engine sees primitive
  attributes. If you need a `${var}` in a primitive attribute, use
  `redirect.Destination` (which the engine resolves) or compute the
  value in a `script` and write a global the engine reads.

---

## 6. Canonical skeleton

Every Style A component has exactly these four nodes and three edges
(geometry, ids, styles pinned in [component-v2.md §1](../conventions/component-v2.md)):

| id | role        | Type        | Kind   | style           | geometry                 |
| -- | ----------- | ----------- | ------ | --------------- | ------------------------ |
| 0  | input       | `transient` | input  | `transientNode` | `(252.5, -350, 130, 40)` |
| 7  | init        | `script`    | —      | `scriptNode`    | `(233.5, -220, 168, 80)` |
| 29 | work script | `script`    | —      | `scriptNode`    | `(233.5, -60, 168, 80)`  |
| 6  | output      | `transient` | output | `transientNode` | `(252.5, 110, 130, 40)`  |

Edges: `28` (0→7), `30` (7→29), `38` (29→6). In composite mode, edge
`38` is replaced by a chain of edges that ends at id=6.

The skeleton's XML is in [assets/template.xml](../assets/template.xml).
The per-Type examples below show what gets added **between** id=29
and id=6.

---

## 7. Per-Type primitive examples

Every example below is a single `<object>` (the primitive) plus its
child rows where applicable. For branching Types, the chrome row and
non-chrome children carry `<mxCell parent="<parent-primitive-id>">`.
The primitive's own `<mxCell>` and every edge sit on
`parent="baselayer"`.

### 7.1 `transient`

Used for the canonical input (id=0) and the canonical output (id=6).
**Style A components are single-output** — multi-output topology is
Style B and out of scope.

#### Input (canonical id=0)

```xml
<object
  label="input"
  Type="transient"
  OnEnter=""
  OnLeave=""
  MaxEntryCount=""
  MaxEntryNodeId=""
  DynamicNextId=""
  Title="input"
  Kind="input"
  DynamicNextTabGuid=""
  Parameters=""
  id="0"
>
  <mxCell style="transientNode" parent="baselayer" vertex="1">
    <mxGeometry x="252.5" y="-350" width="130" height="40" as="geometry" />
  </mxCell>
</object>
```

#### Output (canonical id=6)

```xml
<object
  label="output"
  Type="transient"
  OnEnter="Logger.info(&apos;[&lt;componentName&gt;] exit&apos;, { nextStep: __rtNextStep });"
  OnLeave=""
  MaxEntryCount=""
  MaxEntryNodeId=""
  DynamicNextId=""
  Title="output"
  Kind="output"
  DynamicNextTabGuid=""
  Parameters=""
  id="6"
>
  <mxCell style="transientNode" parent="baselayer" vertex="1">
    <mxGeometry x="252.5" y="110" width="130" height="40" as="geometry" />
  </mxCell>
</object>
```

`OnEnter` on the output is the single exit-trace event
([component-v2.md](../conventions/component-v2.md) §8). It fires once regardless of which upstream branch reached it.
Replace `<componentName>` with the camelCase component name.

### 7.2 `script`

Used for the canonical init (id=7) and work (id=29) nodes, and
optionally for a **second** script node in composite mode (e.g.
issuing a follow-up HTTP call after a DTMF collect).

```xml
<object
  label="script"
  Type="script"
  OnEnter=""
  OnLeave=""
  DynamicNextId=""
  Code="…JS encoded as XML attribute…"
  MaxEntryNodeId=""
  MaxEntryCount=""
  DynamicNextTabGuid=""
  id="29"
>
  <mxCell style="scriptNode" parent="baselayer" vertex="1">
    <mxGeometry x="233.5" y="-60" width="168" height="80" as="geometry" />
  </mxCell>
</object>
```

- id=7 init-node `Code` is universal (three lines — conventions §2).
- id=29 work-node `Code` is one of five Script-body patterns; see
  [operation_bodies/INDEX.md](operation_bodies/INDEX.md).
- A second script node in composite mode gets any free integer id
  and the same `scriptNode` style. Pick a useful `label` (e.g.
  `"toggle"`, `"deactivate"`).
- XML-attribute encoding rules for `Code`: conventions §6.

### 7.3 `say`

Linear-flow TTS prompt. Edge sources from this node's own id.

```xml
<object
  label="prompt"
  Type="say"
  OnEnter=""
  OnLeave=""
  DynamicNextId=""
  Text="{guardTuiPrompt}"
  AltTexts=""
  SelectionMode="temporary"
  MaxEntryCount=""
  MaxEntryNodeId=""
  Language=""
  Voice=""
  DynamicNextTabGuid=""
  ContinueAfter="1000"
  WaitForPrevious="true"
  Cache="true"
  EscapeXML="false"
  id="101"
>
  <mxCell style="sayNode" parent="baselayer" vertex="1">
    <mxGeometry x="243.5" y="105" width="166" height="80" as="geometry" />
  </mxCell>
</object>
```

Notes:

- `Text` here uses **`{key}` markup** — the engine resolves
  `{guardTuiPrompt}` at TTS time against the master `Translations` /
  `Translations_<lang>` block for the active locale. See §4 + §5.
- `Text` can also be a literal string (`Text="Press 3 to deactivate."`)
  if the prompt is fixed and single-locale; in that case
  `Translations` isn't involved.
- `Text` can also embed engine variables directly
  (`Text="Hello {callerName}."`) — the engine resolves `{callerName}`
  against engine scope at TTS time.
- Do **not** put `${var}` in `say.Text` expecting `__setupConfig` to
  resolve it — `__setupConfig` doesn't see primitive attributes. Use
  `{var}` instead (see §5).
- `Language=""` lets the call's current locale pick the voice.
- `OnEnter` / `OnLeave` are JS run by the engine. Any `var` inside
  carries the `__` prefix (conventions §5).

#### Multi-locale: per-locale Text / AltTexts slots (optional)

If your component speaks in more than one locale and you want
per-locale Text **overrides** that bypass the `Translations` block,
the production reference shows that Designer also accepts
`Text_<lang>` / `AltTexts_<lang>` slots on `say`:

```xml
<object Type="say"
        Text="{guardTuiPrompt}"
        Text_nl="{guardTuiPrompt}"  AltTexts_nl=""
        Text_fr="{guardTuiPrompt}"  AltTexts_fr=""
        Text_en="{guardTuiPrompt}"  AltTexts_en=""
        … >
```

For Style A, prefer keeping the prompts in the master `Translations` /
`Translations_<lang>` block and pointing `Text` at a single `{key}`.
The per-locale `Text_<lang>` slots are a Style B pattern; only reach
for them if you need a different prompt per locale that doesn't share
a single key.

### 7.4 `setvar`

Linear-flow variable writer. No children, no chrome.

```xml
<object
  label="menuMode = 'activate'"
  Type="setvar"
  OnEnter=""
  OnLeave=""
  DynamicNextId=""
  VariableName="menuMode"
  VariableValue="'activate'"
  MaxEntryNodeId=""
  MaxEntryCount=""
  id="105"
>
  <mxCell style="setvarNode" parent="baselayer" vertex="1">
    <mxGeometry x="690" y="-270" width="130" height="80" as="geometry" />
  </mxCell>
</object>
```

- `VariableName` is the bare identifier (no quotes, no `__` prefix
  — primitive attributes are not JS, conventions §5a).
- `VariableValue` is engine-evaluated; quote string literals with
  single quotes (`'activate'`).

### 7.5 `pause`

Linear-flow timed silence. No children.

```xml
<object
  label="1000ms"
  Type="pause"
  OnEnter=""
  OnLeave=""
  DynamicNextId=""
  Interval="1000"
  MaxEntryNodeId=""
  MaxEntryCount=""
  id="106"
>
  <mxCell style="pauseNode" parent="baselayer" vertex="1">
    <mxGeometry x="690" y="-400" width="130" height="80" as="geometry" />
  </mxCell>
</object>
```

`Interval` is **milliseconds**, string-encoded.

### 7.6 `case`

Branching engine-evaluated expression switch.

```xml
<!-- parent on baselayer -->
<object label="" Type="case"
        OnEnter="" OnLeave=""
        MaxEntryNodeId="" MaxEntryCount=""
        id="436">
  <mxCell style="caseNode" parent="baselayer" vertex="1">
    <mxGeometry x="587.5" y="960" width="160" height="216" as="geometry" />
  </mxCell>
</object>

<!-- chrome (parent="436") -->
<object id="437">
  <mxCell style="caseInnerNode" parent="436" vertex="1">
    <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
  </mxCell>
</object>

<!-- expression children (parent="436") -->
<object label="menuMode == 'activate'" SubType="expression"
        Expression="menuMode == 'activate'" DynamicNextId="" id="439">
  <mxCell style="expressionNode" parent="436" vertex="1">
    <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
  </mxCell>
</object>
<object label="menuMode == 'deactivate'" SubType="expression"
        Expression="menuMode == 'deactivate'" DynamicNextId="" id="445">
  <mxCell style="expressionNode" parent="436" vertex="1">
    <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
  </mxCell>
</object>

<!-- default child (parent="436") -->
<object label="no choice" SubType="default" DynamicNextId="" id="438">
  <mxCell style="defaultNode" parent="436" vertex="1">
    <mxGeometry x="10" y="176" width="140" height="30" as="geometry" />
  </mxCell>
</object>

<!-- edges — every non-chrome child needs one -->
<mxCell id="..." style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"
        parent="baselayer" source="439" target="<dest-id>" edge="1">
  <mxGeometry relative="1" as="geometry" /></mxCell>
<mxCell id="..." style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"
        parent="baselayer" source="445" target="<dest-id>" edge="1">
  <mxGeometry relative="1" as="geometry" /></mxCell>
<mxCell id="..." style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"
        parent="baselayer" source="438" target="<dest-id>" edge="1">
  <mxGeometry relative="1" as="geometry" /></mxCell>
```

Rules:

- Parent on `baselayer`; chrome + every expression + default on
  `parent="436"`. `*InnerNode` is chrome — never an edge endpoint.
- Every non-chrome child carries `DynamicNextId=""` and is wired by
  an explicit edge (node_types.md Universal rule #4).
- `Expression` is engine-evaluated against the engine scope; it may
  reference variables set by earlier `setvar` / `script` / master
  `Variables` (e.g. `menuMode`, `__maxTries`).

### 7.7 `counter`

Branching expression switch keyed off a counter variable.

```xml
<!-- parent (baselayer) -->
<object label="" Type="counter"
        OnEnter="" OnLeave=""
        MaxEntryNodeId="" MaxEntryCount=""
        VariableName="" id="432">
  <mxCell style="counterNode" parent="baselayer" vertex="1">
    <mxGeometry x="246" y="580" width="160" height="126" as="geometry" />
  </mxCell>
</object>

<!-- chrome (parent="432") -->
<object id="433">
  <mxCell style="counterInnerNode" parent="432" vertex="1">
    <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
  </mxCell>
</object>

<!-- expression child (parent="432") -->
<object label="&gt;= __maxTries" SubType="expression"
        Expression="&gt;= __maxTries" DynamicNextId="" id="434">
  <mxCell style="expressionNode" parent="432" vertex="1">
    <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
  </mxCell>
</object>

<!-- edges -->
<!-- threshold-met branch (sources from the expressionNode child) -->
<mxCell id="..." style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"
        parent="baselayer" source="434" target="<failure-dest>" edge="1">
  <mxGeometry relative="1" as="geometry" /></mxCell>
<!-- "under threshold" fall-through (sources from the counter parent id) -->
<mxCell id="..." style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"
        parent="baselayer" source="432" target="<retry-dest>" edge="1">
  <mxGeometry relative="1" as="geometry" /></mxCell>
```

Rules:

- One chrome row + N `expressionNode` children. No `default` child
  (unlike `case`).
- The expression typically references a master-`Variables` integer
  (`__maxTries`) — that's how a retry-bound is wired in composite
  retry loops (composite.md Variant C).
- Children's `<mxCell>` use `parent="<counter-parent-id>"`.
- Each `expressionNode` gets an explicit edge. The **fall-through**
  path (predicate did not match) sources from the counter parent's
  own id.

### 7.8 `recognize`

Branching speech-recognition collector.

```xml
<!-- parent (baselayer) -->
<object label="" Type="recognize"
        OnEnter="" OnLeave=""
        Timeout="15000" MinTimeout="10000"
        ExpectedSpeechType="default"
        SimilarityTreshold="0.4" NoiseDistance="0.05"
        ReactionType="fast"
        SpeechRecognition="Microsoft"
        NLPEngine="Embedding"
        MaxEntryCount="" MaxEntryNodeId=""
        VariableName="" HintKeywords="" HintGrammar="" Wait=""
        id="468">
  <mxCell style="recognizeNode" parent="baselayer" vertex="1">
    <mxGeometry x="245" y="240" width="163" height="280" as="geometry" />
  </mxCell>
</object>

<!-- chrome (parent="468") -->
<object id="469">
  <mxCell style="recognizeInnerNode" parent="468" vertex="1">
    <mxGeometry x="10" y="16" width="143" height="40" as="geometry" />
  </mxCell>
</object>

<!-- reactionGroup children (parent="468") -->
<object label="yes" SubType="reactionGroup"
        Priority="0.8" Lemma="true"
        Grammar="" Sentences="yes.&#xa;yeah." Keywords="yes,yeah" Groups=""
        OnSelected="" Context="true" Description="affirmative"
        Synonyms="false" ApplyWhen="" Weight="1" Notes=""
        DynamicNextId="" id="470">
  <mxCell style="reactionGroupNode" parent="468" vertex="1">
    <mxGeometry x="10" y="56" width="143" height="30" as="geometry" />
  </mxCell>
</object>
<object label="no" SubType="reactionGroup"
        Priority="0.8" Lemma="true"
        Grammar="" Sentences="no.&#xa;nope." Keywords="no,nope" Groups=""
        OnSelected="" Context="true" Description="negative"
        Synonyms="false" ApplyWhen="" Weight="1" Notes=""
        DynamicNextId="" id="471">
  <mxCell style="reactionGroupNode" parent="468" vertex="1">
    <mxGeometry x="10" y="86" width="143" height="30" as="geometry" />
  </mxCell>
</object>

<!-- terminating notRecognized (parent="468") -->
<object label="no match" SubType="notRecognized" DynamicNextId="" id="472">
  <mxCell style="notRecognizedNode" parent="468" vertex="1">
    <mxGeometry x="10" y="180" width="143" height="30" as="geometry" />
  </mxCell>
</object>

<!-- edges -->
<mxCell id="..." parent="baselayer" source="470" target="<yes-dest>"      edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="..." parent="baselayer" source="471" target="<no-dest>"       edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="..." parent="baselayer" source="472" target="<fallback-dest>" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"><mxGeometry relative="1" as="geometry"/></mxCell>
```

Rules:

- Parent on `baselayer`. Chrome + every `reactionGroupNode` + the
  `notRecognizedNode` all on `<mxCell parent="468">`.
- Each `reactionGroupNode` and the `notRecognizedNode` get an
  explicit edge sourced from the child's own id.
- The production reference adds per-locale slots on `reactionGroup`
  (`Keywords_<lang>`, `Sentences_<lang>`, `Description_<lang>`,
  `Groups_<lang>`, `QuickReply_<lang>`) — that's Style B
  localisation and out of scope (see §11). Style A uses the bare
  fields.
- `SimilarityTreshold` is the engine's spelling (missing `h`). Don't
  "fix" it.

### 7.9 `number`

Branching DTMF numeric collector with submit-code termination.

```xml
<!-- parent (baselayer) -->
<object label="" Type="number"
        OnEnter="" OnLeave="" DynamicNextId=""
        Timeout="15000" MinTimeout=""
        SubmitCode="#"
        VariableName="myNumber"
        MaxEntryNodeId="" MaxEntryCount=""
        id="22">
  <mxCell style="numberNode" parent="baselayer" vertex="1">
    <mxGeometry x="960" y="390" width="160" height="126" as="geometry" />
  </mxCell>
</object>

<!-- chrome (parent="22") -->
<object id="23">
  <mxCell style="numberInnerNode" parent="22" vertex="1">
    <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
  </mxCell>
</object>

<!-- fall-throughs (parent="22") -->
<object label="no input" SubType="noInput" DynamicNextId="" id="24">
  <mxCell style="noInputNode" parent="22" vertex="1">
    <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
  </mxCell>
</object>
<object label="no match" SubType="notRecognized" DynamicNextId="" id="25">
  <mxCell style="notRecognizedNode" parent="22" vertex="1">
    <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
  </mxCell>
</object>

<!-- edges -->
<mxCell id="..." parent="baselayer" source="24" target="<noInput-dest>" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="..." parent="baselayer" source="25" target="<noMatch-dest>" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="..." parent="baselayer" source="22" target="<success-dest>" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"><mxGeometry relative="1" as="geometry"/></mxCell>
```

Rules:

- `SubmitCode` is the DTMF key that terminates collection (typically
  `"#"`).
- `VariableName` is a bare identifier; the engine writes the
  collected digit string to it.
- Two fall-through children (`noInput`, `notRecognized`), each with
  an explicit edge.
- **Happy path edges from the parent id** — no child for "collected
  successfully"; the engine routes to the parent's outgoing edge when
  collection succeeds.

### 7.10 `redirect`

Transfer the call. Linear-with-failure-branch.

```xml
<!-- parent (baselayer) -->
<object label="" Type="redirect"
        OnEnter="" OnLeave=""
        Destination="${rtTransferNumber}"
        Parameters=""
        MaxEntryCount="" MaxEntryNodeId=""
        id="18">
  <mxCell style="redirectNode" parent="baselayer" vertex="1">
    <mxGeometry x="950" y="591" width="160" height="120" as="geometry" />
  </mxCell>
</object>

<!-- chrome (parent="18") -->
<object id="19">
  <mxCell style="redirectInnerNode" parent="18" vertex="1">
    <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
  </mxCell>
</object>

<!-- failure-branch child (parent="18") -->
<object label="not accepted" SubType="default" DynamicNextId="" id="20">
  <mxCell style="defaultNode" parent="18" vertex="1">
    <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
  </mxCell>
</object>

<!-- only the failure branch gets an edge; success path terminates the call leg -->
<mxCell id="..." parent="baselayer" source="20" target="<failure-dest>" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"><mxGeometry relative="1" as="geometry"/></mxCell>
```

Rules:

- `Destination` is either a literal (`"+420"`) or a `${var}`
  placeholder. `${var}` here resolves at runtime against the global
  scope — see §5.
- The "accepted" path is terminal for this leg (no outbound edge
  from the parent or chrome).
- The `defaultNode` child (label `"not accepted"`) fires when the
  transfer is rejected and needs an explicit edge.

### 7.11 `dtmf`

Per-key DTMF dispatcher.

```xml
<!-- parent (baselayer) -->
<object label="" Type="dtmf"
        OnEnter="" OnLeave=""
        Timeout="15000" MinTimeout=""
        MaxEntryCount="" MaxEntryNodeId=""
        id="102">
  <mxCell style="dtmfNode" parent="baselayer" vertex="1">
    <mxGeometry x="1300" y="130" width="160" height="200" as="geometry" />
  </mxCell>
</object>

<!-- chrome (parent="102") -->
<object id="103">
  <mxCell style="dtmfInnerNode" parent="102" vertex="1">
    <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
  </mxCell>
</object>

<!-- choice children (parent="102") — list only keys you actually wire -->
<object label="3" SubType="choice" Key="3" DynamicNextId="" id="202">
  <mxCell style="choiceNode" parent="102" vertex="1">
    <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
  </mxCell>
</object>
<object label="7" SubType="choice" Key="7" DynamicNextId="" id="203">
  <mxCell style="choiceNode" parent="102" vertex="1">
    <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
  </mxCell>
</object>

<!-- fall-throughs (parent="102") -->
<object label="no input" SubType="noInput" DynamicNextId="" id="204">
  <mxCell style="noInputNode" parent="102" vertex="1">
    <mxGeometry x="10" y="116" width="140" height="30" as="geometry" />
  </mxCell>
</object>
<object label="no match" SubType="notRecognized" DynamicNextId="" id="205">
  <mxCell style="notRecognizedNode" parent="102" vertex="1">
    <mxGeometry x="10" y="146" width="140" height="30" as="geometry" />
  </mxCell>
</object>

<!-- edges -->
<mxCell id="120" parent="baselayer" source="202" target="<key-3-dest>"   edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="121" parent="baselayer" source="203" target="<key-7-dest>"   edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="122" parent="baselayer" source="204" target="<no-input-dest>" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="123" parent="baselayer" source="205" target="<no-match-dest>" edge="1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"><mxGeometry relative="1" as="geometry"/></mxCell>
```

Rules:

- Children: chrome + N `choiceNode` (one per key you actually wire)
  + `noInputNode` + optionally `notRecognizedNode`.
- Every non-chrome child gets an explicit edge from its id.
  `DynamicNextId="<target>"` alone is not enough — Designer will
  render the branch as disconnected.

---

## 8. Edges

Every edge is an `<mxCell edge="1">` (not an `<object>`) with
`parent="baselayer"`, `source="<id>"`, `target="<id>"`.

```xml
<mxCell
  id="362"
  style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
  parent="baselayer"
  source="348"
  target="352"
  edge="1"
>
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

The style is a semicolon-separated key/value list:

- `edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;`
  is the universal prefix.
- `exitX/exitY/exitDx/exitDy` pin the **source** anchor on the
  source node's bounding box: `0.5/1` = bottom-centre, `1/0.5` =
  right-middle, `0/0.5` = left-middle.
- `entryX/entryY/entryDx/entryDy` pin the **target** anchor on the
  target node's bounding box.
- Either pair can be omitted; the engine auto-routes that side.

The canonical edges (`28`, `30`, `38`) use the bare orthogonal style
with no entry/exit overrides — see
[component-v2.md §1](../conventions/component-v2.md).

### Hand-routed waypoints

A handful of edges add explicit waypoints to control routing:

```xml
<mxGeometry relative="1" as="geometry">
  <Array as="points">
    <mxPoint x="810" y="1031" />
    <mxPoint x="810" y="190" />
  </Array>
</mxGeometry>
```

Waypoints are optional and purely visual — they don't change which
nodes the edge connects.

### Dangling-end edges — do not emit

Some saves carry `<mxPoint as="sourcePoint">` or `<mxPoint as="targetPoint">`
instead of `source`/`target` id attributes. These are in-progress
author work and have no runtime meaning. **Do not emit dangling-end
edges from this skill.** Every generated edge must have real
`source` and `target` ids.

### Edges vs `DynamicNextId`

This is the load-bearing rule:

- On branching primitives (`recognize`, `dtmf`, `case`, `counter`,
  `number`, `redirect`) every non-chrome child carries
  `DynamicNextId=""` and is wired by an explicit `<mxCell edge="1">`
  sourced from the **child's** id.
- On linear-flow primitives (`say`, `setvar`, `pause`) the outbound
  edge sources from the **primitive's own** id.

A child whose `DynamicNextId` is empty AND has no incoming edge from
its id is a dangling branch — Designer will render it as
disconnected. Always emit the edge cell.

### Inner-chrome nodes are never edge endpoints

`*InnerNode` objects (`caseInnerNode`, `counterInnerNode`,
`recognizeInnerNode`, `dtmfInnerNode`, `numberInnerNode`,
`redirectInnerNode`) are purely visual. None should appear as
`source` or `target` on any edge.

---

## 9. Layers and `parent` references

Two layer types in use:

1. **`baselayer`** — the canvas. Declared once:
   ```xml
   <mxCell id="baselayer" parent="vocalls-master-layer" />
   ```
   Every primitive's own `<mxCell>` and every edge cell carry
   `parent="baselayer"`.
2. **Branching-primitive containers** — a primitive parent's id is
   used as the `parent` value on its chrome row and on every
   non-chrome child's `<mxCell>`. So a `case` with id=436 has chrome
   + expression + default children all on `parent="436"`, **not**
   `parent="baselayer"`.

Edges always carry `parent="baselayer"`, regardless of whether their
`source` / `target` ids sit on `baselayer` or inside a primitive
container.

---

## 10. Id-numbering

Observed conventions (descriptive, not prescriptive):

- The input node uses `id="0"`. The other canonical ids (`7`, `29`,
  `6`) are pinned by [component-v2.md](../conventions/component-v2.md) §1.
- All other ids are **freely-allocated unique integers** within the
  file. There is no rigid "primitives ≥ 100 / children ≥ 200" rule
  (an earlier convention that does not match production).
- Chrome rows usually use the next id after their parent (parent=22
  → chrome=23; parent=102 → chrome=103; parent=436 → chrome=437).
  Helpful diff-readability convention, not a parser requirement.
- Edges share the same integer namespace as objects. No edge id in a
  well-formed file collides with any object id.
- A `start` node id `vocalls-0-0` may appear in flow files but
  **not** in a component — components use `transient Kind="input"`
  (id=0) as their entry.

---

## 11. Out of scope

The Style B native-composite material in the production reference is
**deliberately omitted** because it does not apply to the Style A
RTDS-operation component this skill builds:

| Style B element                                            | Why it's out of scope |
| ---------------------------------------------------------- | --------------------- |
| Multi-output topology (5× `Kind="output"` transients)      | component-v2.md §1 pins exactly one output (id=6). |
| `Type="globalIntent"`                                       | Style B unified DTMF + speech dispatcher; not in Style A primitive catalogue. |
| `Type="component"` (embedded reusable sub-component)       | Style B composition mechanism (`ComponentGuid`, `SingleInput`/`SingleOutput`, `mlctp___*` training pairs). |
| `AllowGlobalIntent="true"` on master                        | Style A master is always `"false"` (component-v2.md §2). |
| Master `Code=" &#xa;"` (whitespace only, no helpers)       | Style A master `Code` always carries the three canonical helpers (component-v2.md §3). |
| Master `Variables="__maxTries = 2;"` with no `__configJSON` | Style A always declares `__configJSON`, `__environment`, and `__rtNextStep &= _rtNextStep`. |
| Non-canonical node ids (e.g. script id=12, no init at id=7)| Style A pins the canonical 4-node skeleton (component-v2.md §1). |
| Per-locale `Text_<lang>` / `AltTexts_<lang>` on `say`      | Allowed but discouraged for Style A — prefer the `Translations` + `{key}` pattern (see §4 and §7.3). |
| Per-locale `Keywords_<lang>` etc. on `reactionGroup`        | Style B localisation. Style A uses the bare fields. |
| `Languages` with multiple locales + mixed TTS engines      | Style A defaults to single locale `nl-BE`; add locales only if the component genuinely needs them (see §3). |

If a future Style A component genuinely needs one of the above
(e.g. real multi-locale prompts), flag it during planning — the
convention will need a Style A extension, not a copy-paste from
Engie.
