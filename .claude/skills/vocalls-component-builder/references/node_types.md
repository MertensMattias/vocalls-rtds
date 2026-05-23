# Vocalls Designer primitive node-Type catalogue

This file is the **vocabulary catalogue** for the Vocalls Designer primitive
nodes that the engine dispatches natively. The source palette is the
right-hand block of
[../../../../rtds_vocalls_operations/components/available_nodes_tempalte.js](../../../../rtds_vocalls_operations/components/available_nodes_tempalte.js).

This file is **catalogue only** — it documents shape, attributes, child
structure, and edge contract per Type. Compositional rules (how to wire
primitives into a v2 component) live in
[operation_bodies/composite.md](operation_bodies/composite.md).

## Universal rules — read first

These apply to every Type below. Ground-truth XML examples for every
Type, plus the master layer / `Languages` / `Translations` blocks and
the canonical 4-node skeleton, live in
[primitive_examples.md](primitive_examples.md) (§7 per-Type examples;
§8 edges; §9 layers & parent references; §10 id-numbering).

1. **Style alias only.** Every primitive's `<mxCell style="...">` uses the
   short alias (`sayNode`, `recognizeNode`, `dtmfInnerNode`, …). Never inline
   the long `rounded=1;arcSize=8;strokeWidth=1;...` form.
2. **Branching-Type children sit under the primitive's parent id.** For
   every branching Type (`recognize`, `dtmf`, `case`, `counter`, `number`,
   `redirect`) the chrome row **and every non-chrome child**'s `<mxCell>`
   carry `parent="<parent-primitive-id>"`, **not** `parent="baselayer"`.
   Only the **primitive's own `<mxCell>`** sits on `baselayer`. This is how
   Designer groups the children visually inside the parent's rounded
   container. Linear-flow Types (`say`, `setvar`, `pause`) have no children
   and their `<mxCell>` sits directly on `baselayer`.
3. **Inner header nodes are visual chrome.** Every branching Type has a
   single `*InnerNode` child (`recognizeInnerNode`, `dtmfInnerNode`,
   `caseInnerNode`, `counterInnerNode`, `numberInnerNode`,
   `redirectInnerNode`) that renders the title row. **It is never an edge
   endpoint.** The chrome row's own id is conventionally `parent_id + 1`
   (see §8 of the structural reference).
4. **Routing is by explicit `<mxCell edge="1">` from the child id — not
   by `DynamicNextId` alone.** On every branching Type, each non-chrome
   child carries `DynamicNextId=""` (empty) and is wired by an explicit
   edge cell:
   ```xml
   <mxCell id="<edge-id>"
           style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;..."
           parent="baselayer"
           source="<child-id>"
           target="<downstream-node-id>"
           edge="1">
     <mxGeometry relative="1" as="geometry" />
   </mxCell>
   ```
   The edge cell's `parent` is always `baselayer` (edges live on the
   canvas), regardless of whether `source`/`target` ids are on
   `baselayer` or inside a primitive container. A child whose
   `DynamicNextId` is empty **and** has no incoming edge sourced from
   its id is a dangling branch — treat as a bug. Earlier docs said
   `DynamicNextId="<target>"` alone was sufficient; that produces
   orphan branches in Designer. Use explicit edges.
5. **Linear-flow Types edge from the parent id.** `say`, `setvar`,
   `pause` have no children; the outbound edge's `source` is the
   primitive's own id.
6. **No `__configJSON` / `__rtParams` plumbing.** Primitives don't read from
   the master `Code`. Their attributes are either string literals
   (`Text="Welcome to..."`) or engine-evaluated expressions
   (`Expression="myVar >= 2"`, `VariableValue="'someValue'"`). The
   `${name}` substitution machinery in `__setupConfig` does **not** run
   against primitive attributes.
7. **No JS shim in the runtime.** `rtds_globalCodeAndHelpers.js` contains
   no helpers for any primitive Type. The Vocalls engine dispatches them
   directly.
8. **Call-leg dependency.** `say` / `recognize` / `dtmf` / `number` /
   `redirect` interact with the active call leg (audio out, speech /
   DTMF in, redirect). They are undefined behaviour if the call has been
   disconnected.
9. **Id-numbering is freely-allocated unique integers.** There is **no**
   rigid "primitives ≥ 100, children ≥ 200" rule — that was a historical
   convention that does not match production components. The only
   numbering rules are: ids are unique integers within the file; the
   canonical 4-node skeleton uses `0`/`7`/`29`/`6` and edges `28`/`30`;
   chrome row ids are conventionally `parent_id + 1` (e.g. parent=102 →
   chrome=103). Pick any free integers for the rest. See
   [primitive_examples.md §10](primitive_examples.md).
10. **Edge anchor pattern depends on the visual relationship.** Pair an
    `exit*` on the source's bounding box with the matching `entry*` on
    the target's bounding box. The three most common patterns observed
    in production components (e.g. [voicemaildetector.js](../../../../rtds_vocalls_operations/components/voicemaildetector.js)):

    | Relationship                                                                                         | `exit*` (source side)        | `entry*` (target side)      |
    | ---------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------- |
    | **Vertical trunk** — next downstream node directly below in the same column (script→say, say→dtmf, dtmf-child→output) | `exitX=0.5;exitY=1` (bottom-centre) | `entryX=0.5;entryY=0` (top-centre) |
    | **Rightward side branch** — child routes to a node positioned to the right of the source            | `exitX=1;exitY=0.5` (right-mid)    | `entryX=0;entryY=0.5` (left-mid)   |
    | **Leftward side branch / loop-back** — child routes to a node on the left, or an earlier trunk node  | `exitX=0;exitY=0.5` (left-mid)     | `entryX=1;entryY=0.5` (right-mid) or `entryX=0;entryY=0.5` (loop-back into a node's left side) |

    These three cover the typical cases. Production reference files
    also use mixed pairs (e.g. `0.5/0 → 1/0.5`, `1/0.5 → 0.5/0`) when
    the geometry calls for them — pick any `exit*` / `entry*` pair that
    visually matches where the source node sits relative to the target
    node. The rule is *anchor both ends explicitly*; the exact pair is
    a function of layout.

    The canonical edges `28` (0→7), `30` (7→29), and `38` (29→6, when
    it exists in a non-composite component) are **anchor-free** by
    convention — they use only `exitX=0.5;exitY=1` with no `entry*`
    overrides (see [conventions.md §1.6](conventions.md)). Every other
    edge in a composite component **must specify both ends** so the
    router does not auto-route into a node's middle, which produces
    crossing lines.

    Default if uncertain: use **vertical-trunk pair** (`0.5/1` →
    `0.5/0`). Reserve horizontal anchors for nodes that visibly sit to
    the side of the source.

## Type — `setvar`

Linear-flow variable writer.

| Attribute       | Required | Notes                                                                    |
| --------------- | -------- | ------------------------------------------------------------------------ |
| `label`         | yes      | Display label, conventionally `name = 'value'`.                          |
| `Type`          | yes      | `"setvar"`.                                                              |
| `VariableName`  | yes      | Bare identifier resolved against the engine scope.                       |
| `VariableValue` | yes      | Engine-evaluated expression (single quotes for string literals).         |
| `OnEnter`       | no       | JS run on entry (rare; if present, `__` prefix applies inside).          |
| `OnLeave`       | no       | JS run on leave (rare).                                                  |
| `DynamicNextId` | no       | Conventionally `""`; the outbound edge from this primitive's own id is the routing.|

**Style:** `setvarNode`. **Children:** none. **Edge contract:** edges
source from the primitive's own id (`<mxCell parent="baselayer">`).

## Type — `say`

Linear-flow TTS / prompt playback.

| Attribute         | Required | Notes                                                              |
| ----------------- | -------- | ------------------------------------------------------------------ |
| `label`           | yes      | Display label, conventionally the prompt text or a short tag.      |
| `Type`            | yes      | `"say"`.                                                            |
| `Text`            | yes      | Spoken text. Either a literal string, or `{key}` resolved by the engine at TTS time against master `Translations` / `Translations_<lang>`, or `{var}` resolved at TTS time against engine scope. **Not** `${var}` — that's runtime-against-globals (used by `__setupConfig`), not Say-node markup. See [primitive_examples.md §5](primitive_examples.md). |
| `AltTexts`        | no       | Alternative phrasings; same `{...}` markup as `Text`. Engine picks per `SelectionMode`. |
| `SelectionMode`   | no       | Typically `"temporary"`. Controls `AltTexts` selection.             |
| `Language`        | no       | Override TTS language (otherwise inherits master `Languages`).      |
| `Voice`           | no       | Override TTS voice.                                                 |
| `MaxEntryCount`   | no       | Cap re-entries to the node.                                         |
| `MaxEntryNodeId`  | no       | Target if `MaxEntryCount` is exceeded.                              |
| `OnEnter`         | no       | JS run on entry. The palette example sets `context.returnTo` here. |
| `OnLeave`         | no       | JS run on leave.                                                    |

**Style:** `sayNode`. **Children:** none. **Edge contract:** edges source
from the primitive's own id.

## Type — `pause`

Linear-flow timed silence.

| Attribute       | Required | Notes                                                |
| --------------- | -------- | ---------------------------------------------------- |
| `label`         | yes      | Conventionally `<n>ms` (e.g. `"1000ms"`).             |
| `Type`          | yes      | `"pause"`.                                            |
| `Interval`      | yes      | Pause duration in **milliseconds** (string-encoded). |
| `DynamicNextId` | no       | See universal rules.                                  |
| `OnEnter`       | no       | JS run on entry.                                      |
| `OnLeave`       | no       | JS run on leave.                                      |

**Style:** `pauseNode`. **Children:** none. **Edge contract:** edges source
from the primitive's own id.

## Type — `recognize`

Branching speech-recognition collector.

| Parent attribute       | Required | Notes                                                                  |
| ---------------------- | -------- | ---------------------------------------------------------------------- |
| `Type`                 | yes      | `"recognize"`.                                                          |
| `Timeout`              | yes      | Overall recognition timeout in ms.                                      |
| `MinTimeout`           | no       | Minimum recognition window in ms.                                       |
| `ExpectedSpeechType`   | no       | E.g. `"default"`. Engine-specific tuning.                               |
| `SpeechConfigParams`   | no       | Engine-specific extra config.                                           |
| `SimilarityTreshold`   | no       | Lemma-match similarity floor (e.g. `"0.4"`). **Note spelling.**         |
| `NoiseDistance`        | no       | Background-noise tolerance (e.g. `"0.05"`).                             |
| `MaxWords`             | no       | Cap on words consumed.                                                  |
| `ReactionType`         | no       | `"normal"` etc.                                                         |
| `VariableName`         | no       | Session-variable name that receives the matched group / sentence.       |
| `HintKeywords`         | no       | Comma-separated hints to bias the recogniser.                           |
| `HintGrammar`          | no       | Grammar hint.                                                           |
| `Wait`                 | no       | Wait-before-listen window.                                              |
| `SpeechRecognition`    | no       | Engine override.                                                        |
| `ResponseAudio`        | no       | `"true"` / `"false"`.                                                   |
| `NLPEngine`            | no       | E.g. `"Embedding"`.                                                     |
| `MaxEntryCount`        | no       | Re-entry cap.                                                           |
| `MaxEntryNodeId`       | no       | Target if cap is exceeded.                                              |

**Style:** `recognizeNode`.

**Children, in this order** (each child's `<mxCell parent="<recognize-id>">`,
**not** `parent="baselayer"`):

1. `recognizeInnerNode` — chrome; never an edge endpoint.
2. One or more `reactionGroupNode` children with `SubType="reactionGroup"`.
   Each has `Grammar`, optional `Sentences`, `Keywords`, `Groups`, `Lemma`,
   `Priority`, `MaxWords`, `OnSelected`, `ShowOption`, `Title`, `Expression`.
   `DynamicNextId=""`; routing is by explicit edge (Universal rule #4).
3. One `notRecognizedNode` child with `SubType="notRecognized"`.
   `DynamicNextId=""`; routing is by explicit edge.

**Edge contract:** for every non-chrome child, emit an explicit
`<mxCell edge="1" parent="baselayer" source="<child-id>" target="<dest-id>">`.
Never source an edge from the parent id, the `recognizeInnerNode` chrome,
or rely on `DynamicNextId` alone.

## Type — `case`

Branching engine-evaluated expression switch.

| Parent attribute   | Required | Notes                       |
| ------------------ | -------- | --------------------------- |
| `Type`             | yes      | `"case"`.                   |
| `OnEnter`          | no       | JS run on entry.            |
| `OnLeave`          | no       | JS run on leave.            |
| `MaxEntryCount`    | no       | Re-entry cap.               |
| `MaxEntryNodeId`   | no       | Target if cap exceeded.     |

**Style:** `caseNode`.

**Children, in this order** (each child's `<mxCell parent="<case-id>">`,
**not** `parent="baselayer"`):

1. `caseInnerNode` — chrome.
2. One or more `expressionNode` children with `SubType="expression"` and
   `Expression="<engine-expression>"` (e.g. `name == 'value'`).
   `DynamicNextId=""`; routing is by explicit edge (Universal rule #4).
3. One `defaultNode` with `SubType="default"`, label `"no choice"`.
   `DynamicNextId=""`; routing is by explicit edge.

The `default` child is typically emitted **after** the expression children
in the production reference; either order parses, but consistent ordering
helps reviewers spot dangling branches.

**Edge contract:** every non-chrome child gets an explicit
`<mxCell edge="1" parent="baselayer" source="<child-id>" target="<dest-id>">`.

## Type — `counter`

Branching expression switch keyed off a counter variable.

| Parent attribute   | Required | Notes                                                                  |
| ------------------ | -------- | ---------------------------------------------------------------------- |
| `Type`             | yes      | `"counter"`.                                                            |
| `VariableName`     | yes      | Name of the counter variable (engine reads it; increments are external).|
| `OnEnter`          | no       | JS run on entry.                                                        |
| `OnLeave`          | no       | JS run on leave.                                                        |
| `MaxEntryCount`    | no       | Re-entry cap.                                                           |
| `MaxEntryNodeId`   | no       | Target if cap exceeded.                                                 |

**Style:** `counterNode`.

**Children, in this order** (each child's `<mxCell parent="<counter-id>">`,
**not** `parent="baselayer"`):

1. `counterInnerNode` — chrome.
2. One or more `expressionNode` children with `SubType="expression"` and
   `Expression="<engine-expression>"` (e.g. `">= __maxTries"`, `"== 0"`).
   `DynamicNextId=""`; routing is by explicit edge.

Note: the `Expression` is engine-evaluated against engine scope. It may
reference master-`Variables` identifiers (e.g. `__maxTries`) — engine
scope sees those.

**Edge contract:** every `expressionNode` child gets an explicit
`<mxCell edge="1" parent="baselayer" source="<child-id>" target="<dest-id>">`.
The counter's fall-through (predicate did not match) routes via an
edge sourced from the counter parent's own id.

## Type — `number`

Branching DTMF-collected numeric input.

| Parent attribute   | Required | Notes                                                                  |
| ------------------ | -------- | ---------------------------------------------------------------------- |
| `Type`             | yes      | `"number"`.                                                             |
| `Timeout`          | yes      | Collection timeout in ms.                                               |
| `MinTimeout`       | no       | Minimum collection window in ms.                                        |
| `SubmitCode`       | yes      | DTMF key that ends collection (typically `"#"`).                        |
| `VariableName`     | yes      | Session-variable name that receives the collected string.               |
| `MaxEntryCount`    | no       | Re-entry cap.                                                           |
| `MaxEntryNodeId`   | no       | Target if cap exceeded.                                                 |
| `OnEnter`          | no       | JS run on entry.                                                        |
| `OnLeave`          | no       | JS run on leave.                                                        |

**Style:** `numberNode`.

**Children, in this order** (each child's `<mxCell parent="<number-id>">`,
**not** `parent="baselayer"`):

1. `numberInnerNode` — chrome.
2. One `noInputNode` with `SubType="noInput"`. `DynamicNextId=""`;
   routing is by explicit edge.
3. One `notRecognizedNode` with `SubType="notRecognized"`.
   `DynamicNextId=""`; routing is by explicit edge.

**Edge contract:** the `noInput` and `notRecognized` children each get an
explicit `<mxCell edge="1" parent="baselayer" source="<child-id>" target="<dest-id>">`.
The "happy path" (a number was collected) flows along an edge sourced from
the **parent's own id** — no child for it. The variable assignment **is**
the success-path side effect.

## Type — `redirect`

Linear-with-failure-branch call redirect.

| Parent attribute  | Required | Notes                                                                  |
| ----------------- | -------- | ---------------------------------------------------------------------- |
| `Type`            | yes      | `"redirect"`.                                                           |
| `Destination`     | yes      | Target number (e.g. `"+420"`) or `${var}` placeholder.                  |
| `Parameters`      | no       | Extra parameters passed to the redirect (engine-specific).              |
| `MaxEntryCount`   | no       | Re-entry cap.                                                           |
| `MaxEntryNodeId`  | no       | Target if cap exceeded.                                                 |
| `OnEnter`         | no       | JS run on entry.                                                        |
| `OnLeave`         | no       | JS run on leave.                                                        |

**Style:** `redirectNode`.

**Children, in this order** (each child's `<mxCell parent="<redirect-id>">`,
**not** `parent="baselayer"`):

1. `redirectInnerNode` — chrome.
2. One `defaultNode` with `SubType="default"`, label `"not accepted"`.
   `DynamicNextId=""`; routing is by explicit edge.

**Edge contract:** the "accepted" path is terminal for this leg (call moves
on; no outbound edge from the parent or chrome is required). The "not
accepted" branch gets an explicit
`<mxCell edge="1" parent="baselayer" source="<default-id>" target="<dest-id>">`.

## Type — `dtmf`

Branching per-key DTMF dispatcher.

| Parent attribute   | Required | Notes                              |
| ------------------ | -------- | ---------------------------------- |
| `Type`             | yes      | `"dtmf"`.                          |
| `Timeout`          | yes      | Collection timeout in ms.          |
| `MinTimeout`       | no       | Minimum collection window in ms.   |
| `MaxEntryCount`    | no       | Re-entry cap.                      |
| `MaxEntryNodeId`   | no       | Target if cap exceeded.            |
| `OnEnter`          | no       | JS run on entry.                   |
| `OnLeave`          | no       | JS run on leave.                   |

**Style:** `dtmfNode`.

**Children, in this order** (each child's `<mxCell parent="<dtmf-id>">`,
**not** `parent="baselayer"`):

1. `dtmfInnerNode` — chrome.
2. One `choiceNode` per key, each with `SubType="choice"`,
   `Key="<digit-or-symbol>"`, label `"<digit-or-symbol>"`.
   `DynamicNextId=""`; routing is by explicit edge.
   The palette includes all twelve keys (`0`-`9`, `#`, `*`); a real
   `dtmf` node typically lists only the keys it actually wires.
3. One `noInputNode` with `SubType="noInput"`. `DynamicNextId=""`;
   routing is by explicit edge.
4. Optionally one `notRecognizedNode` with `SubType="notRecognized"`
   (palette omits it; production components frequently include it).
   Same routing rule.

**Edge contract:** every `choiceNode`, `noInputNode`, and any optional
`notRecognizedNode` child gets an explicit
`<mxCell edge="1" parent="baselayer" source="<child-id>" target="<dest-id>">`.

## Cross-reference

- Ground-truth XML examples for layout, parent references, and edge
  wiring: [primitive_examples.md](primitive_examples.md).
- The palette source file:
  [../../../../rtds_vocalls_operations/components/available_nodes_tempalte.js](../../../../rtds_vocalls_operations/components/available_nodes_tempalte.js).
- Composition rules (how primitives sit between Script and output):
  [operation_bodies/composite.md](operation_bodies/composite.md).
- Style aliases and master-attribute order:
  [conventions.md](conventions.md).
- Pre-delivery checklist (composite-mode section):
  [checklist.md](checklist.md).
