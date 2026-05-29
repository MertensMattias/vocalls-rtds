# Hand-built mxGraph patterns

**Scope:** [Component] · **Answers:** *How do I structure mxGraph XML when the component grows beyond the v2 four-node skeleton? Cell types, compound nodes, edges, labels, annotations.*

**Canonical reference:** [voicemaildetector.js](../rtds_vocalls_operations/components/voicemaildetector.js) — a 1804-line hand-authored composite that demonstrates every wiring pattern below.

For the v2 four-node skeleton itself, see [component-v2.md](component-v2.md). This file covers the *additional* patterns that show up when a component is hand-authored in Designer or when a v2 component embeds Designer primitives.

## 1. The two top-level cells

Every component starts with two `<mxCell>` entries that are not part of the visible graph — they define the structural root:

```xml
<object ... id="vocalls-master-layer">
  <mxCell />
</object>
<mxCell id="baselayer" parent="vocalls-master-layer" />
```

See [voicemaildetector.js:17-41](../rtds_vocalls_operations/components/voicemaildetector.js#L17-L41).

Every visible node carries `parent="baselayer"`. The master-layer cell holds the component-wide attributes (`Code`, `Variables`, `PropertiesDefinition`, …); the baselayer cell is the visible drawing surface. Don't change these ids, don't nest extra layers, don't reparent visible nodes to `vocalls-master-layer`.

## 2. Node ids — freely-allocated, no numbering scheme

Node ids in hand-built components are **freely-allocated unique integers**. The voicemaildetector uses `0`, `8`, `9`, `14–17`, `25`, `28–29`, `32–44`, `54–57`, `72–74`, `84–124`, and so on — no zones, no ranges, no "main flow vs children" split. Ids are just whatever the Designer assigned as nodes were dropped on the canvas.

This is different from skill-generated v2 components, which pin the four canonical ids (`0`/`7`/`29`/`6`) and use them as visual anchors. In hand-built mode, **only the input node is conventionally `id="0"`** — and even that's a soft convention.

## 3. Two kinds of cells — what holds what

| Cell kind                                                                 | When                                                                                                                                                                                          | Holds                                                                                                                                                                         |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<object ...>` wrapping an `<mxCell style="..." parent="..." vertex="1">` | Every **node** the user drops on the canvas — `input`, `init`, `say`, `recognize`, `case`, `script`, `label`, `transient` (output), `component`, primitives like `setvar`, `counter`, `pause`. | The `<object>` carries the node's semantic attributes (`label`, `Type`, `Code`, `OnEnter`, `Text`, `Expression`, ...). The inner `<mxCell>` carries the styling and geometry. |
| Bare `<mxCell>` with `edge="1"`                                           | Every **edge** between two nodes.                                                                                                                                                             | `source=` and `target=` reference node ids; `style=` defines the orthogonal routing + entry/exit anchors.                                                                     |
| Bare `<mxCell>` with `vertex="1"`, no wrapper `<object>`                  | **Annotation text** (section headers in the canvas).                                                                                                                                          | `value=` carries the HTML-formatted text; `style=` typically includes `connectable=0;allowArrows=0;` so the annotation can't accidentally be wired into the flow.             |

Children of compound nodes (`caseInnerNode`, `expressionNode`, `defaultNode`, `recognizeInnerNode`, `notRecognizedNode`, `noInputNode`, `reactionGroupNode`, `componentInnerNode`) are also `<object>`-wrapped — but their inner `<mxCell>` carries `parent="<parent-node-id>"` (not `"baselayer"`), and their geometry is **relative to the parent node**, not the canvas.

## 4. Compound nodes — `case`, `recognize`, `component`

Three Designer primitives have an internal child layout: `case`, `recognize`, and `component`. Their child rows are `<object>` cells with `parent="<parent-id>"`.

### `case`

See [voicemaildetector.js:245-322](../rtds_vocalls_operations/components/voicemaildetector.js#L245-L322) for the canonical shape.

Rules:
- Child `<mxCell>` carries `parent="<case-node-id>"`, **not** `parent="baselayer"`.
- Geometry is parent-local (`x="10"`, `y` increments by 30 per row).
- First child is the chrome (`caseInnerNode`) — always present, no `label`/`SubType`.
- Second child is the default branch (`SubType="default"`, `style="defaultNode"`).
- Subsequent children are `SubType="expression"` with `Expression="..."` and `style="expressionNode"`. Their `label` is conventionally the same as the `Expression` string for readability.
- Every branch child carries `DynamicNextId=""` — wiring happens through outbound edges.

### `recognize`

See [voicemaildetector.js:670-756](../rtds_vocalls_operations/components/voicemaildetector.js#L670-L756) for the canonical shape.

Rules:
- Chrome row first (`recognizeInnerNode`).
- Then the three fixed children: `SubType="notRecognized"` ("no match"), `SubType="reactionGroup"` (named reaction with `Keywords` / `Sentences` / `Grammar`), `SubType="noInput"` ("no input"). Order: notRecognized → reactionGroup(s) → noInput. Multiple `reactionGroup` children are valid.
- Recognize-level config attributes (`Timeout`, `MinTimeout`, `Language`, `VariableName`, `SpeechRecognition`, `NLPEngine`, …) live on the **parent** object, not the children.

### `component`

See [voicemaildetector.js:608-653](../rtds_vocalls_operations/components/voicemaildetector.js#L608-L653) for the canonical shape (the GPT classifier).

Rules:
- The `Type="component"` node is an embedded reusable component instance (referenced by `ComponentGuid`). It has exactly **one** child (`style="componentInnerNode"`) labelled by what the embedded component exposes (e.g. `Prompt`).
- All instance configuration lives on the parent as attributes prefixed `__` (`__gptProvider`, `__temperature`, `__outputVariable`, …) and the multilingual prompt slots prefixed `mlctp___prompt_<lang>`.
- `SingleInput` / `SingleOutput` are integer ids identifying which embedded node receives the call and which one routes back out.
- `EnableUpdateRelations="true"`, `AllowGlobalIntent="false"` are inherited from the embedded component.

## 5. Edges — how nodes are connected

Every edge is a bare `<mxCell edge="1">` at the baselayer. See [voicemaildetector.js:174-183](../rtds_vocalls_operations/components/voicemaildetector.js#L174-L183) for one canonical form.

**Edge styles in active use** (counts from voicemaildetector):

| Use                       | Style fragment                                                              |
| ------------------------- | --------------------------------------------------------------------------- |
| Vertical trunk            | `exitX=0.5;exitY=1;…;entryX=0.5;entryY=0;…` (bottom of source → top of target) |
| Left-incoming horizontal  | `exitX=0;exitY=0.5;…;entryX=0.5;entryY=0;…`                                 |
| Rightward branch          | `exitX=1;exitY=0.5;…` (orthogonal router picks the entry)                   |
| Anchor-free vertical      | `exitX=0.5;exitY=1;…` with no `entry*` (reserved for v2 canonical edges)    |

**Rule: pin both `exit*` (source) and `entry*` (target) on every edge** except the topmost trunk edge into the init node. The bare anchor-free style (no `entry*`) is reserved for the three canonical edges of a skill-generated v2 component. In hand-built composite components, anchor both ends — otherwise Designer auto-routes through mid-edges, producing a tangle.

### Edge source/target semantics

- **Non-compound nodes** (input, init, script, say, transient outputs, …) — `source=`/`target=` reference the node id directly.
- **Compound nodes** (case, recognize, component) — edges **into** the compound point at the parent id (`target="35"` enters the case node at its chrome row). Edges **out** of a branch point from the **child** id (`source="40"` for the `expressionNode` branch labelled `__callAnswerCategory == 1`). The chrome rows (`caseInnerNode`, `recognizeInnerNode`, `componentInnerNode`) never appear as edge `source` — only the branch children do.

**Edge ids**: like node ids, freely-allocated unique integers. No scheme — they're interspersed with node ids.

## 6. Label nodes — named anchors inside the flow

`Type="label"` nodes (`labelNode` style) act as named anchor points inside the flow. They're transient routing markers — same shape as a `transient` node (130×40), but `Kind` is absent and they're **not** flow inputs or outputs.

See [voicemaildetector.js:333-372](../rtds_vocalls_operations/components/voicemaildetector.js#L333-L372) for the two label nodes (`picked by AI`, `regular voicemail`).

Use them to:
- Give a meaningful name to a branch convergence point.
- Document a position in the flow that the canvas would otherwise label only by its incoming edge.

## 7. Transient outputs — the named exit ports

Every component exit is a `Type="transient"` node with `Kind="output"`. See [voicemaildetector.js:94-173](../rtds_vocalls_operations/components/voicemaildetector.js#L94-L173) for the four exits (`voicemail`, `not exists`, `not available`, `call answered`).

Rules:
- `label` is the exit-key string that the runtime returns to the surrounding flow (`voicemail`, `not exists`, ...).
- `Title` is the same string — used by Designer as the display title.
- `Kind="output"` for exits, `Kind="input"` for the single entry.
- Geometry is 130×40 (same as the v2 input/output nodes).
- Optional: a `Text`/`Text_<lang>` attribute on an output node makes Vocalls speak that message as the flow exits — the `call answered` output in voicemaildetector does this.

## 8. Primitive attributes — what is and isn't JS

Vocalls Designer primitive nodes (`say`, `recognize`, `dtmf`, `case`, `counter`, `number`, `redirect`, `pause`, `setvar`) do not have a `Code` attribute. Their behaviour comes from string-valued *configuration attributes* the engine reads directly:

| Attribute                                                                                                  | Content                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Text`, `AltTexts`                                                                                         | Spoken text. Plain string; `{var}` TTS-time markup is resolved by the engine, **not** by `__setupConfig`. No JS expressions.                  |
| `Expression`                                                                                               | Engine-evaluated expression on `case` / `counter` / `expressionNode` children. The engine — not the component — interprets it.                |
| `VariableName`                                                                                             | Bare identifier resolved against the engine scope. No `__` prefix; not JS.                                                                    |
| `VariableValue`                                                                                            | Engine-evaluated expression. Single-quoted string literals for string values (`'someValue'`).                                                 |
| `Destination`, `Grammar`, `Keywords`, `Sentences`, `HintKeywords`, `HintGrammar`                           | Plain string content. No JS.                                                                                                                  |
| `Key`, `Timeout`, `MinTimeout`, `Interval`, `SubmitCode`, `Priority`, `SimilarityTreshold`, `NoiseDistance` | Scalar string-encoded values. No JS.                                                                                                          |
| `DynamicNextId`                                                                                            | Id string of the target node. Resolved by the engine, not by component code.                                                                  |
| `OnEnter`, `OnLeave`                                                                                       | **JS** run by the engine on entry / leave. The `__` prefix rule from [naming.md](naming.md) applies to every `var`-declared local inside.     |

So: primitive *attribute values* are not JS and are not subject to the `__` prefix rule (`Text="Welcome"`, `VariableName="myVar"`, `Expression="name == 'value'"` all stay as-is). Anything inside `OnEnter` or `OnLeave` **is** JS and follows [naming.md](naming.md) — every `var`-declared local carries `__`, JSDoc applies, etc.

**Don't try to substitute `${name}` placeholders in primitive attributes via `__setupConfig`.** Primitive attributes are read by the engine, not by component JS. `${name}` resolution inside `Text`, `Expression`, `VariableValue`, etc. is the engine's job (when it does it at all) — not `__setupConfig`'s. See [params.md](params.md) for which mechanism resolves which placeholder syntax.

## 9. Annotation text — section headers in the canvas

The voicemaildetector embeds visual section headers as bare `<mxCell vertex="1">` elements with an HTML `value=` and a no-interaction style. See [voicemaildetector.js:210-218](../rtds_vocalls_operations/components/voicemaildetector.js#L210-L218).

Key flags: `connectable=0` (no edges can attach) and `allowArrows=0` (no arrow handles on hover). Use these for any decorative text — never give it an `<object>` wrapper or a node `Type`. They exist only for the canvas reader, not the flow runtime.

## 10. Geometry — no shared grid

Hand-built components don't follow the v2 single-column trunk layout. Voicemaildetector spans `x` from `-140` to `1750+` and `y` from `-220` to `3170+`. Nodes are clustered by logical phase: the trunk runs roughly down `x=213`, with side clusters for each branch's downstream work.

**Do not run `scripts/layout_component.py` against a hand-built component** — that script rewrites geometry to the single-column trunk layout, which would destroy a Designer-authored canvas. The layout pass is for skill-generated v2 components only.

## 11. When to follow component-v2 vs component-mxgraph

| Situation                                                                                                       | Pattern                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Building an RTDS operation component (Style A — `Code` master `__configJSON`, JS work body, four-node skeleton) | [component-v2.md](component-v2.md) — canonical ids `0`/`7`/`29`/`6` and the trunk layout.                                                                          |
| Building a composite RTDS operation (Style A + Designer primitives between Script and output)                   | [component-v2.md](component-v2.md) for the master layer and canonical ids; **this file** for the primitive wiring (case/recognize shapes, edge anchoring, etc.).   |
| Building a hand-authored Designer component without an RTDS operation                                           | **This file** — no `__configJSON`, no `__rtNextStep`, free-form geometry, freely-allocated ids. Master `Code` and `Variables` are minimal or empty.                |

## Reflect on

- **[grep]** Visible nodes parented to `baselayer`, only the two root cells above?
- **[grep]** Compound children (case rows, recognize children, component inner) parented to the compound parent's id, not to baselayer?
- **[grep]** Do edges into compound nodes target the parent id, while edges out of branches source the child id?
- **[grep]** Does every edge anchor both `exit*` and `entry*` unless it's a canonical v2 anchor-free edge?
- **[grep]** Are annotation texts marked with `connectable=0;allowArrows=0;`?
- **[judgment]** For a hand-built component, are you avoiding `layout_component.py` (v2-only)?
