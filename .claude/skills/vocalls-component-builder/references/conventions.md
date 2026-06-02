# RTDS Vocalls Component Conventions (v2)

This document captures the rules a generated v2 component must satisfy. The
structural source of truth is [rtds/components/sendSms.js](../../../../rtds/components/sendSms.js).
When this document and the live `sendSms.js` disagree, the live file wins —
flag the gap and update this document.

---

## 1. Component shape — what every component has

### 1.1 Master-layer attributes, in order

```
label, MaxEntryCount, MaxEntryNodeId, SpeechRecognitionEngine, Code,
Extensions, BackgroundNoise, BreathInEffect, Languages, Variables,
PropertiesDefinition, EnableUpdateRelations, AllowGlobalIntent, Translations,
ManualId, RequiredVariables, HintGrammar, LastLanguage, InfoAboutUser_en,
CompanyInformation_en, GeneralKnowledge_en, Translations_en, id
```

The `id` is always `vocalls-master-layer`. `BackgroundNoise` and
`BreathInEffect` are always `"true"`. `EnableUpdateRelations` is always
`"true"`. `AllowGlobalIntent` is always `"false"`.

### 1.2 Languages

Default project language is **Dutch (Belgium) — `nl-BE`**, marked
`isDefault: true`. Other entries are added on demand. Empty string fields
(`ttsVoiceName`, `ttsEngine`, `ttsPitch`, `ttsSpeed`, `ttsVolume`) are
preserved as `''`.

### 1.3 Master `Code` — composition

In this order, separated by blank lines:

1. **`__rtParams = {};`** — declare the per-component runtime params object.
   No `var/let/const` — Vocalls cross-node visibility requires bare globals.
2. **The three canonical helpers** from [canonical_helpers.js](canonical_helpers.js),
   copied verbatim with their JSDoc:
   - `__makeLocalNodeId`
   - `__extractParams`
   - `__setupConfig`
3. **Zero or more operation-specific helpers** — only when the work node body
   needs them (e.g. `__isMobileNumber`, `__compareAttr`). Each carries its
   own JSDoc block. Operation-specific helpers are inlined in the pattern
   files in [operation_bodies/](operation_bodies/) — `__compareAttr` lives
   in `condition.md`, `__isMobileNumber` lives in `http_call.md`.
4. **No work-function helper.** The work logic lives **inline in the script
   node body** (id=29). This is intentional — see `sendSms.js`.

### 1.4 Master `Variables`

```js
__configJSON = { /* operation Params with placeholder defaults */ };
__environment = environment;
__rtBaseUrl   = _rtBaseUrl;        // when the operation calls HTTP
__rtEndpoint  = _rt<TypePrefix>Endpoint;  // when the operation calls HTTP
__rtNextStep &= _rtNextStep;
```

The `&=` operator is the **documented placeholder-binding form** — it binds
the component-scoped `__rtNextStep` to the flow variable `_rtNextStep` so the
two stay in sync. It is **not** a typo for `=`. Use `&=` only on
`__rtNextStep` (and any future binding-style globals); use `=` everywhere else.

### 1.5 Master `PropertiesDefinition`

Three entries, in this order:

| Name            | controlType | defaultValue    | Notes                           |
| --------------- | ----------- | --------------- | ------------------------------- |
| `__configJSON`  | `text`      | —               | `maxLength: 5000`               |
| `__environment` | `text`      | `"environment"` | `maxLength: 100`                |
| `__nextStep`    | `text`      | `"_rtNextStep"` | `maxLength: 100`                |

No `__outputVar` (v1 had it; v2 removed it — the work body assigns to
`global[_rtNextStep]` directly).

### 1.6 Node graph

Four nodes, three edges, identical for every component:

| id  | label  | Type      | Kind   | style           | geometry                 |
| --- | ------ | --------- | ------ | --------------- | ------------------------ |
| 0   | input  | transient | input  | `transientNode` | `(252.5, -350, 130, 40)` |
| 7   | init   | script    | —      | `scriptNode`    | `(233.5, -220, 168, 80)` |
| 29  | script | script    | —      | `scriptNode`    | `(233.5, -60, 168, 80)`  |
| 6   | output | transient | output | `transientNode` | `(252.5, 110, 130, 40)`  |

Edges: `28` (0→7), `30` (7→29), `38` (29→6). All bare orthogonal
(`edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;`).
No `entryX/entryY` overrides. No `startArrow`, `startFill`, or `strokeColor`.

**The anchor-free style is a privilege reserved for these three
canonical edges.** Every additional edge added in composite mode
(§4a) — i.e. any edge replacing `38` (29→6), and every branch edge
from a primitive child — **must** pin both `exit*` (source side) and
`entry*` (target side). The three pairings (vertical trunk, rightward
side branch, leftward / loop-back) live in [node_types.md §Universal
rule 10](node_types.md). Pinning both ends keeps Designer from
auto-routing into mid-edges, which is the visual giveaway of a
generated component.

Use style aliases only (`transientNode`, `scriptNode`) — never the long
inline rounded-rect style.

**Layout pass.** Don't hand-pick coordinates for primitive nodes added
in composite mode (§4a). After the XML is on disk, run the deterministic
layout script:

```bash
python .claude/skills/vocalls-component-builder/scripts/layout_component.py \
  rtds/components/<componentName>.js
```

It centres the trunk (input → init → script → primitives → output) on
x=317.5 and stacks them vertically with a 40px gap. Off-trunk branch
destinations (anything a `dtmf` choice / `recognize` reactionGroup /
`case` expression edges to that isn't itself on the trunk) get placed
in a right column next to the branching primitive. The script only
edits the `<mxGeometry>` lines — quotes, encoding, and the rest of
the file are byte-preserved. See SKILL.md Step 6b.

### 1.7 Output node

`OnEnter='Logger.info(&apos;[&lt;componentName&gt;] exit&apos;, { nextStep: __rtNextStep });'`.
The output node's entire job is to record the resolved next step on the way
out. Logger.info is used (not debug) because the exit step is a load-bearing
piece of information when reading traces.

---

## 2. Init node body — universal

Exactly three lines for every component:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[<componentName>] config resolved', { params: __rtParams });
```

No per-Param declarations. No per-Param logs. No `__rt<Key>` splay. The init
log is `debug` (not `info`) because config dump is verbose and only useful
when you're already drilling in.

### 2.1 `${name}` placeholders — runtime resolution against globals

`${name}` is a **runtime substitution mechanism** that resolves a bare
identifier against the `global` scope at the moment the carrying string
is read. In a Style A component this fires in two places:

1. **At init time, in `__setupConfig`**, against every value in
   `__configJSON`. The init node runs `__setupConfig` which calls
   `String.replace` over each Param value, looking up matched names in
   `global`. The resolved values land in `__rtParams`. This is the most
   common use.
2. **At engine read time**, against primitive attributes whose semantics
   support it — most notably `redirect.Destination`. When the engine
   actually consumes the attribute (the moment the call is transferred),
   it resolves `${name}` against `global` the same way `__setupConfig`
   does — so a `Destination="${rtTransferNumber}"` works whether
   `rtTransferNumber` was set in the main flow or in an earlier
   component.

Both whole-string and partial substitution are supported. Pattern is
`${\w+}` — bare identifiers only.

```jsonc
{
    "To":   "${rtSmsTo}",                                  // whole string -> String(global.rtSmsTo)
    "Body": "Hello ${callerName}, your ref is ${ref}",     // partial -> "Hello Alice, your ref is 42"
    "From": "8850"                                         // no placeholder -> "8850"
}
```

**The contract** (what `${name}` will and won't do):

- ✅ **Bare variable names only** — `${rtSmsBody}`, `${callerName}`,
  `${RTDS_currentOpId}`. Pattern is `${\w+}` (letters, digits, underscore).
- ✅ **Partial substitution** — multiple placeholders can appear in one
  string; non-placeholder text around them is preserved.
- ✅ **Whole-string substitution** — `"${rtSmsBody}"` resolves to the
  value, not the stringified form.
- ❌ **No expressions** — `${user.name}`, `${count + 1}`, `${a || b}`,
  `${user?.email}` won't work. Only bare identifiers.
- ❌ **No JS templates** — the Vocalls runtime disables string-eval
  (`new Function`, `eval`). `__setupConfig` uses `String.replace`, not
  template-literal evaluation. If you need an expression, compute it in
  a script node and write to `global` first.
- ❌ **Not the same as `{name}`** — `{name}` (no `$`, curly braces only)
  is the engine's TTS-time markup for `say.Text` / `say.AltTexts` /
  `Translations` values. The two are different mechanisms with
  different evaluation times and different scopes. See
  [primitive_examples.md §5](primitive_examples.md) for the side-by-side.

**Unresolved placeholders** — if `global` doesn't carry a `name`,
`__setupConfig` leaves the placeholder raw (`"${name}"` survives into
`__rtParams`) and a `Logger.warn` records the key + placeholder name.
The component continues; downstream `getValue` sees the literal text.
This is intentional — silently substituting `""` for missing variables
creates silent bugs.

**`Active` is never substituted** — `__setupConfig` coerces it to
Boolean directly. A `${someToggle}` value in `Active` becomes
`Boolean("${someToggle}")` which is `true`, almost certainly not what
you wanted. Keep `Active` literal.

---

## 3. Logging discipline

`Logger` is the standard logging facade for every v2 component. Live at
[`projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js`](../../../../projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js).
Do **not** use bare `log_debug` / `log_error` calls in component code — they
bypass severity filtering and the EventLog API.

### 3.1 The four levels

```js
Logger.debug(message, context?)            // local trace only
Logger.info (message, context?)            // local trace; production-visible
Logger.warn (message, context?)            // local + POSTs to EventLog API
Logger.error(message, context?, errorObj?) // local + POSTs to EventLog API; serialises errorObj
```

- `message` — short string. Lead with `[<componentName>]` so traces are greppable.
- `context` — small structured object. Logger sanitises and truncates at ~300 chars.
- `errorObj` — the caught Error. Logger extracts `.message` and `.stack`. Don't `JSON.stringify` it first.

### 3.2 What to log — minimum

Three log lines is the floor. Most components don't need a fourth.

| Event              | Level   | Where                                                  | Why                                                                |
| ------------------ | ------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| Config resolved    | `debug` | End of init node body.                                 | Full `__rtParams` dump — silences the need for per-Param logs.     |
| Outcome            | `info` / `warn` / `error` | Terminal point of the work node.    | Records *what happened* and *which next step* the call goes to.    |
| Exit               | `info`  | Output node `OnEnter`.                                 | Confirms the resolved next step on the way out.                    |

**The `nextStep` field is non-negotiable on outcome and exit logs.** It's
the single field that stitches one component's trace to the next.

That's it. No "entering function", no "calling jsonHttpRequest", no
per-precondition log lines. The init-node debug dump already covers the
"why" for anything you'd be tempted to add.

### 3.3 Level selection — quick rules

- **`info`** — happy-path outcome. Also "inactive — skipped" if the
  operator wants to see that a deliberately-disabled step ran.
- **`warn`** — the operation produced a non-success outcome the caller
  should know about (validation rejected, 4xx, `result.success === false`,
  branch fell back to default). Posted to EventLog.
- **`error`** — the operation failed because of infrastructure
  (exception, network error, 5xx). Pass the error as `errorObj` so Logger
  captures the stack. Posted to EventLog.

Rule of thumb: if the failure was *the caller's fault* (bad data) →
`warn`. If it was *our fault* (timeout, exception) → `error`.

### 3.4 What not to do

- **Don't `JSON.stringify`** what you pass to `context` — Logger does it.
- **Don't add a precondition log** — the next terminal log line (warn for
  a bad input, info for inactive) already explains why the component
  stopped. A separate "checking phone number..." line is noise.
- **Don't log secrets** — `context` is truncated for length but not
  redacted. Keep authorization headers, tokens, and free-text user input
  (PII) out.

---

## 4. Work node body — patterns by operation kind

Read Params with [getValue](runtime_pointer.md) (or
`getValueOrFalsy`/`hasKey`/`walk`). Log outcomes with `Logger.{info,warn,error}`
per §3.

The five recognised work-body shapes live in [operation_bodies/](operation_bodies/):

| Pattern             | Covers                                                                       |
| ------------------- | ---------------------------------------------------------------------------- |
| `http_call.md`      | `SendSMS`, `RESTRequest`, `RESTGet`, `SkillUpdate`, `Emergency`, `Schedule`. |
| `gui_exit.md`       | 11 GUI-exit Types — `WorkgroupTransfer`, `Menu`, `Disconnect`, etc.          |
| `set_attributes.md` | `SetAttributes` and any setVariables-style attribute-projection Type.        |
| `condition.md`      | `Condition`, `CheckAttribute`.                                               |
| `flow_jump.md`      | `FlowJump`.                                                                  |

See [operation_bodies/INDEX.md](operation_bodies/INDEX.md) for the decision
tree. Each pattern file carries the skeleton, its rationale, variants, and a
worked example with Logger calls already wired in.

### 4a. Composite components — primitives between Script and output

The canonical 4-node graph (§1.6) is the **floor**, not the ceiling. A
component may host one or more Vocalls Designer primitive nodes (`say`,
`recognize`, `dtmf`, `case`, `counter`, `number`, `redirect`, `pause`,
`setvar`) **between the Script (id=29) and the output (id=6)**, provided:

- The four canonical ids (`0`, `7`, `29`, `6`) and their geometry are
  unchanged. The init and output node bodies are unchanged.
- The Script body is selected from one of the five Script-body patterns
  (§4) and **emitted unchanged**. No `__makeLocalNodeId('<primitive-id>')`
  calls; no primitive ids returned as exit keys. The runtime handles the
  handoff into the primitive chain — the component just defines the
  topology.
- Every primitive branch reaches the output node (id=6) directly or
  transitively. The output's `OnEnter` log fires once on the way out.
- Primitive, child, and edge ids are **freely-allocated unique
  integers** within the file. Earlier docs imposed a rigid "primitives
  ≥ 100, children ≥ 200" rule; that does not match production
  components. The only fixed numbering is the canonical quartet
  (`0`/`7`/`29`/`6`) and the canonical pre-Script edges `28` (0→7) and
  `30` (7→29). Edge `38` (29→6) is replaced by a chain that ends at
  id=6. Chrome row ids are conventionally `parent_id + 1`.
- Per-Type attribute reference is [node_types.md](node_types.md).
  Composition rules and worked examples are
  [operation_bodies/composite.md](operation_bodies/composite.md).

**Edge contract (load-bearing — failures here produce orphan branches
in Designer):**

- Routing is by **explicit `<mxCell edge="1">` sourced from each
  non-chrome child id** — not by `DynamicNextId` alone. Every
  reaction-group, choice, expression, default, noInput, and
  notRecognized child carries `DynamicNextId=""` and is paired with an
  explicit edge cell whose `parent="baselayer"`, `source="<child-id>"`,
  `target="<dest-id>"`.
- Edges never source from the parent id of a branching Type, and never
  from the `*InnerNode` chrome.
- Linear-flow Types (`say`, `setvar`, `pause`) edge from the parent's
  own id; they have no children.
- **Branching-Type children's `<mxCell>` use
  `parent="<parent-primitive-id>"`**, not `parent="baselayer"`. Only
  the primitive's own `<mxCell>` and edge cells sit on `baselayer`.

---

## 5. JS conventions

- **Identifier-prefix rules (load-bearing — every var inside a component
  carries `__`):**

  | Prefix | What                                                                                                   |
  | ------ | ------------------------------------------------------------------------------------------------------ |
  | `__`   | Component-authored. The per-component globals (`__rtParams`, `__rtBaseUrl`, `__rtEndpoint`, `__rtNextStep`), every master-layer function (`__makeLocalNodeId`, `__setupConfig`, `__splitSemicolonList`, …), **and every `var`-declared local inside any function or work-node body** (`var __separator`, `var __keys`, `var __i`, `var __url`, `var __payload`, …). No exceptions. |
  | `_`    | Platform-supplied flow variables (`_rtNextStep`, `_rtBaseUrl`, `_rtMailEndpoint`, `_headers`).         |
  | (none) | Runtime/host APIs (`global`, `environment`, `context`, `Logger`, `getValue`, `walk`, `hasKey`, `jsonHttpRequest`, `fileExists`, `nowUTC`).                                                                  |

  Keeping the three buckets visually distinct makes it trivial to tell at
  a glance whether an identifier is component-owned or runtime-provided.
  Bare `var x` inside a component breaks that contract.

  **Function parameters** follow the API contract they implement and may
  stay bare (e.g. `getValue(obj, key, defaultValue)` keeps the runtime
  helper's signature; the inline-on-master helpers' `(nodeId)`,
  `(tpl, scope)`, `(config)` mirror what the runtime expects). All
  `var`-declared locals MUST carry `__` regardless.

- **Functions are assigned to bare globals**: `name = function (...) { ... };`.
  Never `function name(...) {}` for component-scoped helpers — `function`
  declarations don't survive cross-node visibility the same way.
  (Exception: the global helpers library `rtds_globalCodeAndHelpers.js` uses
  `function name() {}` declarations because it's loaded at runtime startup.)
- **Every function carries JSDoc** — description, one `@param` per arg, one
  `@returns`. No exemptions.
- **String quotes**: single quotes in JS source; encoded as `&apos;` in the
  XML attribute.
- **Locals use `var`** — never `let`/`const`. The runtime is ES5.1.
- **No arrow functions** in component code. **Template literals are allowed**
  for string building (e.g. flow-variable endpoint paths in `main.js`).
  The runtime disables `new Function`/`eval` — string-eval is what gives
  you "Eval of strings is disabled in this runtime". For `${name}` Param
  placeholders in `__configJSON`, use `String.replace` (see §2.1); that is
  separate from JS template literals.

### 5a. Primitive node attributes — what is and isn't JS

Vocalls Designer primitive nodes (`say`, `recognize`, `dtmf`, `case`,
`counter`, `number`, `redirect`, `pause`, `setvar`; see [node_types.md](node_types.md))
do not have a `Code` attribute. Their behaviour comes from string-valued
*configuration attributes* the engine reads directly:

| Attribute              | Content                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Text`, `AltTexts`     | Spoken text. Plain string; `${var}` markup is resolved by the engine, **not** by `__setupConfig`. No JS expressions.                          |
| `Expression`           | Engine-evaluated expression on `case` / `counter` / `expressionNode` children. The engine — not the component — interprets it.                |
| `VariableName`         | Bare identifier resolved against the engine scope. No `__` prefix; not JS.                                                                    |
| `VariableValue`        | Engine-evaluated expression. Single-quoted string literals for string values (`'someValue'`).                                                  |
| `Destination`, `Grammar`, `Keywords`, `Sentences`, `HintKeywords`, `HintGrammar` | Plain string content. No JS.                                                                |
| `Key`, `Timeout`, `MinTimeout`, `Interval`, `SubmitCode`, `Priority`, `SimilarityTreshold`, `NoiseDistance` | Scalar string-encoded values. No JS.                                |
| `DynamicNextId`        | Id string of the target node. Resolved by the engine, not by component code.                                                                  |
| `OnEnter`, `OnLeave`   | **JS** run by the engine on entry / leave. The `__` prefix rule (§5) applies to every `var`-declared local **inside** these blocks.            |

So: primitive *attribute values* are not JS and are not subject to the
`__` prefix rule (`Text="Welcome"`, `VariableName="myVar"`,
`Expression="name == 'value'"` all stay as-is). Anything inside `OnEnter`
or `OnLeave` **is** JS and follows §5 — every `var`-declared local
carries `__`, JSDoc applies if you declare a function, etc.

---

## 6. XML attribute encoding

When emitting a JS block into a `Code`, `Variables`, or `OnEnter` attribute:

| Source char | Encoded as |
| ----------- | ---------- |
| `'`         | `&apos;`   |
| `"`         | `&quot;`   |
| `<`         | `&lt;`     |
| `>`         | `&gt;`     |
| `&`         | `&amp;`    |
| newline     | `&#xa;`    |

The outer attribute delimiter is a single quote when the JS body contains
double quotes (more readable), or vice versa. Match `sendSms.js`'s choice
per attribute.

Indent inside JS with 4 spaces. Encode JS-string single quotes as `&apos;`.

---

## 7. Things to avoid

- **Don't use the v1 `__rt<Key>` / `__rt<TypePrefix><Key>` splay.** Use
  `__rtParams` + `getValue` instead.
- **Don't redeclare `__init`** in the master `Code` — it's gone.
- **Don't add a `__outputVar` PropertyDefinition** — gone in v2.
- **Don't copy from `handler_source_file/` or legacy
  `component_source_file/`** — those are retired.
- **Don't invent endpoint URLs, RTDS Params keys, or exit keys** — derive
  them from `RTDS_runtime_spec.md` and the per-Type file in
  [operation_bodies/](operation_bodies/).
- **Don't add XML comments** or banner separators.
- **Don't omit the error callback** on `.then(...)` — always pair success
  and error.
- **Don't use bare `log_debug` / `log_error`** in component code. Use
  `Logger.{debug,info,warn,error}` instead (see §3). Bare calls bypass
  severity filtering and don't post warns/errors to the EventLog API.
- **Don't omit the `nextStep` field** from terminal log lines (success,
  failure, skip, exit) — it's what stitches a trace together across
  components.
- **Don't introduce case-normalisation passes** between read and write.
  `getValue` is case-insensitive on the read side; `walk` and
  `applyDefaults` preserve casing on the write side. That asymmetry is
  intentional — the operator's chosen key casing is the output contract.
- **Don't inline the long rounded-rect style** on a Vocalls primitive
  node. Use the style alias (`sayNode`, `recognizeNode`, `dtmfInnerNode`,
  …). See [node_types.md](node_types.md).
- **Don't make a `*InnerNode` an edge endpoint.** Inner header nodes
  (`recognizeInnerNode`, `dtmfInnerNode`, `caseInnerNode`,
  `counterInnerNode`, `numberInnerNode`, `redirectInnerNode`) are visual
  chrome only. Edges on branching primitives source from the non-chrome
  child ids (`reactionGroupNode`, `choiceNode`, `expressionNode`,
  `defaultNode`, `noInputNode`, `notRecognizedNode`).
- **Don't connect a primitive branch back into the Script (id=29) or
  the init node (id=7).** Composite-mode primitives flow forward toward
  the output (id=6). Retry loops route between primitives, never back
  through the Script. See [operation_bodies/composite.md](operation_bodies/composite.md).
- **Don't try to substitute `${name}` placeholders in primitive
  attributes via `__setupConfig`.** Primitive attributes are read by the
  engine, not by component JS. `${name}` resolution inside `Text`,
  `Expression`, `VariableValue`, etc. is the engine's job (when it does
  it at all) — not `__setupConfig`'s.
