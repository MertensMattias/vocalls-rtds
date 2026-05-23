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

These apply to every Type below.

1. **Style alias only.** Every primitive's `<mxCell style="...">` uses the
   short alias (`sayNode`, `recognizeNode`, `dtmfInnerNode`, …). Never inline
   the long `rounded=1;arcSize=8;strokeWidth=1;...` form.
2. **Edges target child ids on branching Types.** For `recognize`, `dtmf`,
   `case`, `counter`, `number`, `redirect`, the edge `source` is the **child
   object's id** — `reactionGroupNode`, `choiceNode`, `expressionNode`,
   `defaultNode`, `noInputNode`, `notRecognizedNode`. Never edge from the
   parent's id.
3. **Inner header nodes are visual chrome.** Every branching Type has a
   single `*InnerNode` child (`recognizeInnerNode`, `dtmfInnerNode`,
   `caseInnerNode`, `counterInnerNode`, `numberInnerNode`,
   `redirectInnerNode`) that renders the title row. **It is never an edge
   endpoint.**
4. **`DynamicNextId` carries the branch target.** Each non-chrome child has
   `DynamicNextId="<target-node-id>"`. The engine resolves it to route the
   call when that branch fires. A child with `DynamicNextId=""` is a dangling
   branch — treat as a bug.
5. **Linear-flow Types edge from the parent id.** `say`, `setvar`, `pause`
   have no children; the next edge sources directly from the primitive's
   own id.
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
| `DynamicNextId` | no       | Set on outgoing-edge target only if no edge is drawn explicitly.         |

**Style:** `setvarNode`. **Children:** none. **Edge contract:** edges source
from the primitive's own id.

## Type — `say`

Linear-flow TTS / prompt playback.

| Attribute         | Required | Notes                                                              |
| ----------------- | -------- | ------------------------------------------------------------------ |
| `label`           | yes      | Display label, conventionally the prompt text or a short tag.      |
| `Type`            | yes      | `"say"`.                                                            |
| `Text`            | yes      | Spoken text (string literal, may include `${var}` engine markup).  |
| `AltTexts`        | no       | Alternative phrasings; engine picks per `SelectionMode`.            |
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

**Children, in this order**:

1. `recognizeInnerNode` — chrome; never an edge endpoint.
2. One or more `reactionGroupNode` children with `SubType="reactionGroup"`.
   Each has `Grammar`, optional `Sentences`, `Keywords`, `Groups`, `Lemma`,
   `Priority`, `MaxWords`, `OnSelected`, `ShowOption`, `Title`, `Expression`,
   and `DynamicNextId`. The palette also includes an `any_other_key_word`
   reaction-group as a catch-all.
3. One `notRecognizedNode` child with `SubType="notRecognized"` and
   `DynamicNextId`.

**Edge contract:** edges source **from each reaction-group child id** or
**from the `notRecognized` child id**. Never from the parent or the
`recognizeInnerNode` chrome.

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

**Children, in this order**:

1. `caseInnerNode` — chrome.
2. One `defaultNode` with `SubType="default"`, label `"no choice"`, and
   `DynamicNextId`.
3. One or more `expressionNode` children with `SubType="expression"`,
   `Expression="<engine-expression>"` (e.g. `name == 'value'`), and
   `DynamicNextId`.

**Edge contract:** edges source from the `defaultNode` or any
`expressionNode` child id.

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

**Children, in this order**:

1. `counterInnerNode` — chrome.
2. One or more `expressionNode` children with `SubType="expression"`,
   `Expression="<engine-expression>"` (e.g. `">= 2"`, `"== 0"`), and
   `DynamicNextId`.

**Edge contract:** edges source from any `expressionNode` child id.

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

**Children, in this order**:

1. `numberInnerNode` — chrome.
2. One `noInputNode` with `SubType="noInput"` and `DynamicNextId`.
3. One `notRecognizedNode` with `SubType="notRecognized"` and
   `DynamicNextId`.

**Edge contract:** edges source from the `noInput` or `notRecognized` child
id. The "happy path" (a number was collected) falls out of the parent's
implicit next edge — i.e. the engine routes to whatever the parent's
outgoing edge targets when collection succeeded.

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

**Children, in this order**:

1. `redirectInnerNode` — chrome.
2. One `defaultNode` with `SubType="default"`, label `"not accepted"`, and
   `DynamicNextId`.

**Edge contract:** the "accepted" path is terminal for this leg (call moves
on). The "not accepted" branch edges source from the `defaultNode` child id.

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

**Children, in this order**:

1. `dtmfInnerNode` — chrome.
2. One `choiceNode` per key, each with `SubType="choice"`,
   `Key="<digit-or-symbol>"`, label `"<digit-or-symbol>"`, and
   `DynamicNextId`. The palette includes all twelve keys (`0`-`9`, `#`,
   `*`); a real dtmf node typically lists only the keys it wires.
3. One `noInputNode` with `SubType="noInput"` and `DynamicNextId`.

**Edge contract:** edges source from each `choiceNode` child id and from
the `noInputNode` child id.

## Cross-reference

- The palette source file:
  [../../../../rtds_vocalls_operations/components/available_nodes_tempalte.js](../../../../rtds_vocalls_operations/components/available_nodes_tempalte.js).
- Composition rules (how primitives sit between Script and output):
  [operation_bodies/composite.md](operation_bodies/composite.md).
- Style aliases and master-attribute order:
  [conventions.md](conventions.md).
- Pre-delivery checklist (composite-mode section):
  [checklist.md](checklist.md).
