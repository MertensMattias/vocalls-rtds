# RTDS Vocalls Component Conventions

Source of truth: `sendSms-193bf458.js` (mxGraph flow export of the `sendSms` component).
Out of scope: `handler_source_file/*` — those are PureConnect Interaction Handler and legacy mxGraph files. Their conventions are NOT adopted.

This document lists every observable rule from the example, plus the rules the user explicitly named, plus rules they implied but did not state.

---

## 1. File shape

```
<mxGraphModel ...>
  <root>
    <object ...master-layer attrs... id="vocalls-master-layer">
      <mxCell />
    </object>
    <mxCell id="baselayer" parent="vocalls-master-layer" />
    <object ...input transient... id="0">...</object>
    <object ...output transient... id="6">...</object>
    <object ...init script... id="7">...</object>
    <object ...work script(s)... id="29">...</object>
    <mxCell id="28" ...edge... source="0" target="7" edge="1">...</mxCell>
    <mxCell id="30" ...edge... source="7" target="29" edge="1">...</mxCell>
    <mxCell id="38" ...edge... source="29" target="6" edge="1">...</mxCell>
  </root>
</mxGraphModel>
```

- No `<?xml ... ?>` header.
- Root is `<mxGraphModel>`.
- One `<root>` child.
- Inside `<root>` (order may vary, mirror the example): master-layer `<object>`, the `baselayer` `<mxCell>`, then nodes and edges intermixed. The example places `<object>` nodes and `<mxCell>` edges interleaved; do not enforce strict ordering, but keep a node and the edge that immediately follows it close together for readability.
- No XML comments anywhere.

---

## 2. Master layer (`id="vocalls-master-layer"`)

Carried attributes, in order, exactly as in the example:

```
label, MaxEntryCount, MaxEntryNodeId, SpeechRecognitionEngine,
Code, Extensions, BackgroundNoise, BreathInEffect, Languages,
Variables, PropertiesDefinition, EnableUpdateRelations, AllowGlobalIntent,
Translations, ManualId, RequiredVariables, HintGrammar, LastLanguage,
InfoAboutUser_en, CompanyInformation_en, GeneralKnowledge_en, Translations_en,
id
```

Defaults:

- `label=""`
- `MaxEntryCount=""`, `MaxEntryNodeId=""`, `SpeechRecognitionEngine=""`, `Extensions=""`
- `BackgroundNoise="true"`, `BreathInEffect="true"`
- `EnableUpdateRelations="true"`, `AllowGlobalIntent="false"`
- `Translations=""`, `ManualId=""`, `RequiredVariables=""`, `HintGrammar=""`
- `LastLanguage="default"`
- `InfoAboutUser_en=""`, `CompanyInformation_en=""`, `GeneralKnowledge_en=""`, `Translations_en=""`
- `Languages` defaults to a one-language stub keyed by the chosen language code (the example uses `en`/Wavenet-A; for RTDS Belgian flows default to `nl-BE`/`nl-NL` per project standard).

`Code`, `Variables`, `PropertiesDefinition`: see sections 3, 4, 5.

The master-layer `<object>` always contains exactly one empty child: `<mxCell />`.

Immediately after the master-layer `<object>`, emit:

```xml
<mxCell id="baselayer" parent="vocalls-master-layer" />
```

This is the canvas layer every node and edge `parent="baselayer"` references.

---

## 3. Master-layer `Code` attribute — component-wide globals

This is the home of every shared variable and function used by more than one script node. The pattern:

1. **Default-value declarations** (no `var`, `let`, or `const`):
   ```
   environment = '';
   __apiUrlSendSms = "";
   __rtActive = false;
   __rtSmsTo = "";
   __rtSmsRouting = "";
   __rtTimeout = 10000;
   __rtNextStep_Success = -1;
   __rtNextStep_Failure = -1;
   __rtNextStep = -1;
   ```

2. **Function declarations** in `name = function (...) { ... };` form — never `function name(...) {}`, never `var name = function ...`, never arrow form for declarations:
   ```
   __makeLocalNodeId = function (nodeId) { ... };
   __resolveTemplate = function (tpl, scope) { ... };
   __extractParams = function (config) { ... };
   __setupConfig = function (config) { ... };
   __init = function (config) { ... };
   __isMobileNumber = function (phone) { ... };
   __sendSMS = function () { ... };
   ```

The example places **every shared helper here**, including operation-specific work (`__sendSMS`). The per-node `script` node can call the helper or inline a slim version.

### 3.1 Standard helper functions present in the example

| Function | Purpose |
|---|---|
| `__makeLocalNodeId(nodeId)` | Replaces the last `-`-separated segment of `context.currentNode.id` with `nodeId`. Builds a sibling node id when components are nested. |
| `__resolveTemplate(tpl, scope)` | Evaluates a string as a JS template literal against a scope object. Uses `new Function(keys.join(','), 'return `' + tpl + '`').apply(null, vals)`. Falls back to raw on error. |
| `__extractParams(config)` | Accepts a flat params object, a string-encoded JSON, or an RTDS `{ Params: { ... } }` operation. Always returns the flat `Params` object. |
| `__setupConfig(config)` | Pure version of `__init` — returns a `{ __rt<Key>: value }` map without mutating globals. `ConfigId` coerced to `Number`, `Timeout` coerced to `Number`, `Active` coerced to `Boolean`. |
| `__init(config)` | Walks params, looks for `__rt<Key>` then `__rt<Type><Key>` (e.g. `__rtSmsBody`) on `global`, and writes resolved values. Whole-string `${var}` templates are resolved against `global`; partial templates are left raw with a `log_debug`. |

`__sendSMS` and `__isMobileNumber` are operation-specific. For other operations, replace these with the analogue (`__condition`, `__checkAttr`, `__flowJump`, ...).

### 3.2 Encoding inside the `Code=""` attribute

- The attribute value is XML-escaped: `<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;`, `"` → `&quot;`, `'` → `&apos;` (or `&#39;` — the example mixes both; prefer `&apos;`).
- Newlines inside the attribute are encoded as `&#xa;`.
- The example mixes `&#xa;` entity newlines with real XML line breaks inside long attribute values (see node id `29`'s `Code`). Both render the same in Monaco. When generating, use `&#xa;` only — it is unambiguous and round-trips through reformatters.
- Indentation inside `Code` is 4 spaces.
- String literals: prefer single quotes encoded as `&apos;`. Use `&quot;` only when the string itself contains an apostrophe or when the property name is a JSON-shaped key.

---

## 4. Master-layer `Variables` attribute — flow-level inputs

These are the variables the **consumer of the component** sets when dropping the component into a flow. They surface in the Designer property pane via `PropertiesDefinition` (section 5).

Format: one assignment per line, terminated with `;`, optional whitespace between blocks. Default values may be literals or references to other globals.

Example:

```
__configJSON = {
    "Active": false,
    "To": "+32478306999",
    "Routing": "LPA_DEV",
    "From": "8850",
    "Body": "${rtSmsBody}",
    "SmsAccountId": 47,
    "Timeout": 5000,
    "NextStep_Success": "00011",
    "NextStep_Failure": "00099",
    "NextStep": "00012"
};
__environment = environment;
__rtBaseUrl = _rtSmsBaseUrl;
__rtEndpoint = _rtSmsEndpoint;
__rtNextStep &= _rtNextStep;
```

Rules:

- `__configJSON` is the canonical name for the operation's `Params` object, surfaced as JSON in the GUI. Treat its keys as the operation's Params schema.
- Use references to system-scope `_rt*` variables (e.g. `_rtSmsBaseUrl`) so the call-site can wire environment-specific URLs centrally.
- The `&=` operator seen on `__rtNextStep &= _rtNextStep;` is a typo-prone form. When generating, use plain `=`. (Confirm with the user before "fixing" any existing instances.)
- Do not declare runtime working variables (`__rtSmsTo`, etc.) here — those live in master `Code`. Only inputs the Designer user is meant to override go in `Variables`.

---

## 5. Master-layer `PropertiesDefinition` attribute

JSON array. One entry per `Variables` entry that should be surfaced to the Designer property pane.

Entry shape:

```json
{
  "name": "__configJSON",
  "title": "Operation config (JSON)",
  "hint": "Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.",
  "controlSettings": {
    "controlType": "text",
    "maxLength": 5000,
    "dataType": "string",
    "readonly": false
  }
}
```

Standard control types observed:

- `"text"` — free string / multi-line JSON.
- `"environment"` — env selector with `defaultValue` (e.g. `"acc"`).
- `"dropdown"` — enum (not used in this example, documented in the project quality-instructions).

Every component should expose at least these four properties:

1. `__configJSON` — the operation Params JSON.
2. `__environment` — `"environment"` control type, default `"acc"`.
3. `__nextStep` — name of the session variable that receives the next step Id. Default `"_nextStep"`.
4. `__outputVar` — name of the session variable that receives the operation result. Default `"result"`.

---

## 6. Naming conventions (canonical)

| Prefix | Scope | Example |
|---|---|---|
| `__name` | Component-scope (private to this component) | `__rtSmsTo`, `__sendSMS`, `__configJSON` |
| `_name` | System-scope (global, shared across components) | `_headers`, `_baseUrl`, `_rtSmsBaseUrl`, `_nextStep` |
| `name` | Plain global, no underscore — application-wide config | `environment`, `global`, `context` |

Sub-conventions extracted from the example (not stated by the user but consistent):

- `__rt<ParamKey>` — runtime-resolved value of an operation Param. Lives in component scope. Populated by `__init`.
- `__rt<Type><ParamKey>` — same, narrower name when a generic key collides with another component's variable (e.g. `__rtSmsBody` instead of `__rtBody`).
- `_rt<Type><Suffix>` — system-scope reference variables fed in from the flow (e.g. `_rtSmsBaseUrl`, `_rtSmsEndpoint`).
- `__rtNextStep`, `__rtNextStep_Success`, `__rtNextStep_Failure` — outcome step Ids. `_Success`/`_Failure` follow the RTDS Params convention literally.
- `_nextStep` — the default session-variable name to receive the chosen next step Id.

### 6.1 Function declaration style (explicit user rule)

All component-scope functions are declared as assignments without `var`/`let`/`const`, and every declaration carries a basic JSDoc block immediately above it:

```js
/**
 * Extracts the requested keys from a JSON payload and returns a flat object.
 *
 * @param {object} jsonData - The parsed payload to read from.
 * @param {string[]} keysToRetrieve - List of keys to copy onto the result.
 * @returns {object} A new object containing only the requested keys.
 */
__processData = function (jsonData, keysToRetrieve) {
    // ...
};
```

Never:

- `function __processData(...) { ... }`
- `var __processData = function (...) { ... };`
- `const __processData = (...) => { ... };`

This pattern places the function on `global` (the implicit global object) which is the Vocalls runtime contract for cross-node visibility.

The JSDoc rule has no "non-obvious only" exemption — even one-line helpers get a JSDoc block. The block must describe what the function does, document every parameter (`@param {type} name - description`), and declare the return shape (`@returns {type} description`, or `@returns {void}` when nothing is returned).

---

## 7. Node taxonomy and ids

| Node id | Type | Label | Role |
|---|---|---|---|
| `0` | `transient` (Kind="input") | `input` | Component entry |
| `6` | `transient` (Kind="output") | `output` | Component exit; `OnEnter` logs `__outputVar` |
| `7` | `script` | `init` | Reset `__rt*` defaults, call `__init(__configJSON)`, log resolved values |
| `29` | `script` | `script` | The work — operation-specific logic; sets `global[__nextStep]` and returns or assigns `global[__outputVar]` |

Additional nodes — added per operation as required:

- Additional `script` nodes for multi-step work (one node per logical phase).
- `case` swimlanes for branching.
- `counter` swimlanes for retry loops (project quality-instructions §9).
- Additional `transient` outputs for distinct exit outcomes (`success`, `failure`, `true`, `false`, etc.) when the component reports multi-way outcomes.

Ids are bare numeric strings. Start at `0` for input, then assign monotonically. Edge ids share the same numeric space.

---

## 8. Node attribute sets

### 8.1 Transient (input / output)

```xml
<object label="input" Type="transient" OnEnter="" OnLeave=""
        MaxEntryCount="" MaxEntryNodeId="" DynamicNextId=""
        Title="input" Kind="input" id="0">
  <mxCell style="transientNode" parent="baselayer" vertex="1">
    <mxGeometry x="252.5" y="-150" width="130" height="40" as="geometry" />
  </mxCell>
</object>
```

- `style="transientNode"` — short alias. (The legacy handler XML emits the long inline rounded-rect style; the example uses the alias. Adopt the alias.)
- `label`, `Title`, `Kind` all match: `"input"` or `"output"`.
- Default size: `130 x 40`.
- Output node carries an `OnEnter` that does work (the example logs `__outputVar`); when an output reports a specific outcome (success/failure/true/false), set the outcome flag in `OnEnter` (project quality-instructions §12).
- Output node may carry `Parameters=""` when it publishes values to the caller; input does not.

### 8.2 Script (`Type="script"`)

```xml
<object label="init" Type="script" OnEnter="" OnLeave=""
        DynamicNextId="" Code="..." MaxEntryNodeId="" MaxEntryCount=""
        DynamicNextTabGuid="" id="7">
  <mxCell style="scriptNode" parent="baselayer" vertex="1">
    <mxGeometry x="233.5" width="168" height="80" as="geometry" />
  </mxCell>
</object>
```

- `style="scriptNode"` — short alias (no inline rounded-rect style, no `arcSize=8`, no `strokeWidth=1`).
- Default size: `168 x 80`.
- `Code` carries the node body, XML-escaped, `&#xa;`-newlined.
- `OnEnter` / `OnLeave` left empty unless the node has true enter/leave hooks (rare in RTDS components).

### 8.3 Case / counter / setvar / other GUI primitives

Follow project quality-instructions §8–§10 for these. They're not present in the sendSms example beyond the implicit fact that they may exist; treat the existing project conventions doc as authoritative for those shapes.

---

## 9. Edges

```xml
<mxCell id="28"
        style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
        parent="baselayer" source="0" target="7" edge="1">
  <mxGeometry relative="1" as="geometry">
    <mxPoint x="317.5" y="-400" as="sourcePoint" />
    <mxPoint x="317.5" y="-240" as="targetPoint" />
  </mxGeometry>
</mxCell>
```

- Default style — verbatim:
  `edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;`
- Add `entryX/entryY/entryDx/entryDy` only when overriding the default top-center entry port (the example does this on the input edge id `28`).
- Never emit `startArrow`, `startFill`, or `strokeColor` on edges.
- `<mxGeometry>` may carry `<mxPoint as="sourcePoint">` / `as="targetPoint">` for explicit routing — optional, omit if you don't have coordinates.
- `source` and `target` reference `<object>` element ids (not `<mxCell>` ids).

---

## 10. Script body conventions

### 10.1 Init node

The `init` script's body always:

1. Re-declares all `__rt*` defaults explicitly (idempotent reset).
2. Initialises `_headers` if missing:
   ```js
   if (!_headers) {
       _headers = {};
   }
   ```
3. Calls `__init(__configJSON)`.
4. Logs every resolved `__rt*` value via `log_debug`.

This pattern guarantees the work-node sees consistent state regardless of session re-entry order.

### 10.2 Work node

The work node's body always:

1. Writes the default next-step outcome up front:
   ```js
   global[_rtNextStep] = __rtNextStep;
   ```
   (or `global[__nextStep]` depending on which name the component exposes — the example uses `_rtNextStep` in id `29`'s body.)
2. Guards `__rtActive` and other preconditions; logs and returns early when false.
3. Sets the failure default before the network call:
   ```js
   global[_rtNextStep] = __rtNextStep_Failure;
   ```
4. Issues `jsonHttpRequest(url, options, headers, payload)` (or `httpRequest` for non-JSON) and returns the task chained with `.then(success, error)`.
5. Both `.then` callbacks are populated. The success callback inspects `result.success` and `result.statusCode` and assigns the appropriate outcome step Id; the error callback assigns the failure step Id.

### 10.3 HTTP rules

- `jsonHttpRequest(url, options, headers, payload)` returns a task — must be `return`ed.
- `.withTimeout(ms)` chained immediately after.
- Success check: `result.success === true && result.statusCode >= 200 && result.statusCode < 300`.
- On any non-success, the work node:
  - Logs with `log_error(...)`.
  - Assigns `global[__outputVar] = __rtNextStep_Failure;` (or the equivalent failure outcome).
- The success callback returns the outcome step Id; the error callback returns the failure step Id. (Both `return`s let Vocalls observe the resolution.)

### 10.4 Logging

- Prefix: `'[componentName]'` (square brackets, no colon inside the brackets). Example: `'[SendSMS]: entered function'`.
- Levels: `log_debug` for trace, `log_warn` for recoverable issues, `log_error` for failures.
- Serialize objects with `JSON.stringify(...)`; never log raw objects.
- The project-level runtime code uses `'[RTDS] ...'` — keep that exact bracket form for runtime handlers and adopt `'[ComponentName] ...'` per component (preserving the bracket).

### 10.5 Template resolution

- Strings of the form `${varName}` are evaluated.
- `__init` only resolves whole-string templates (regex `^\$\{([^}]+)\}$`). Partial templates are left as-is and emit a `log_debug`.
- `__resolveTemplate` (used in `__setupConfig`) evaluates *any* template literal by constructing `new Function(keys.join(','), 'return \`' + tpl + '\`')`. This is more permissive but requires `scope` to be trusted.
- Default behaviour for the skill: use `__init`-style resolution unless the operation explicitly needs concatenated templates.

---

## 11. The three-script-node skeleton

Every component the skill emits should start from this skeleton:

```
input (id=0, transient)
   |
   v
init (id=7, script) — resets __rt* defaults, calls __init(__configJSON)
   |
   v
script (id=29, script) — operation logic; sets global[__nextStep]
   |
   v
output (id=6, transient) — OnEnter logs __outputVar
```

Add additional nodes between `init` and `output` for multi-phase operations.

Add additional `output` transients (each with its own outcome label in `OnEnter`) when the component reports multi-way outcomes (e.g. `true` / `false` / `failure`).

---

## 12. Mapping RTDS operation Type → component shape

The skill takes an operation Type (and optionally a legacy handler XML) and emits a component. The mapping:

### 12.1 JS-handled operations

Three-script-node skeleton. The `script` body executes the operation locally and sets `global[__nextStep]`.

| RTDS Type | Outcomes (NextStep keys) | Logic in `script` |
|---|---|---|
| `SetAttributes` | `NextStep` | Walk Params, write each to `global[key]` (token-resolved), skip `LogAttributes` and `NextStep`. Log `LogAttributes` values. |
| `Emergency` | `NextStep_Transfer`, `NextStep_Disconnect`, `NextStep_Continue`, `NextStep_Failure` | HTTP GET emergency flag, branch on result |
| `Schedule` | `NextStep_*` per schedule outcome | HTTP GET schedule eval, branch |
| `Condition` | `NextStep_True`, `NextStep_False` | Read queue stat, compare via operator from Params, branch |
| `CheckAttribute` | `NextStep_True`, `NextStep_False` | Read session variable, compare to value, branch |
| `FlowJump` | (re-fetch) | Set `RTDS_sourceId` to new value, return exit key that re-enters the runtime |
| `IVRLogging` | `NextStep` | Write log record (HTTP or local), continue |
| `UpdateSourceId` | `NextStep` | Set `RTDS_sourceId` |
| `SkillUpdate` | `NextStep` | Update ACD skill assignments |
| `RESTRequest` / `RESTGet` | branch on HTTP outcome | Generic HTTP call with configurable method/url/headers/body |

### 12.2 GUI-exit operations

Same three-script-node skeleton but the `script` body:

1. Writes all `op.Params` to `context.session.variables` with `RTDS_OP_` prefix (per project quality §22 / runtime spec §4.8).
2. Sets `RTDS_currentOpId`, `RTDS_currentOpType`, `RTDS_nextStepId`.
3. Returns the matching exit key string from the runtime spec table.

| RTDS Type | Exit key |
|---|---|
| `WorkgroupTransfer` | `"workgroup_transfer"` |
| `ExternalTransfer` | `"external_transfer"` |
| `Menu` | `"menu"` |
| `LanguageMenu` | `"language_menu"` |
| `PlayPrompt` | `"play_prompt"` |
| `PlayAudio` | `"play_audio"` |
| `Disconnect` | `"disconnect"` |
| `GuardRouting` | `"guard_routing"` |
| `GuardTUI` | `"guard_tui"` |
| `Callback` | `"callback"` |
| `SendSMS` | `"send_sms"` |
| `SendEmail` | `"send_email"` |

---

## 13. Rules extracted but not explicitly stated by the user

Recording these so future generators do not have to re-derive them.

1. **Function bodies use `var` for locals.** Only the declaration of the function itself omits `var`; everything inside uses `var`.
2. **No `function name(...)` declarations.** Even at the top of master `Code`. Always `name = function (...) { ... };`.
3. **`global` is the implicit globals bag.** `global[varName] = value` is the canonical write; `global.hasOwnProperty(name)` the canonical existence check.
4. **`__init` looks up two candidate variable names per Param key.** First `__rt<Key>`, then `__rt<Type><Key>`. Used to disambiguate when generic key names collide.
5. **The `${var}` template grammar has two flavours**: whole-string-only (`__init` uses `^\$\{...\}$`) and inline (`__resolveTemplate` builds a `new Function`). Pick `__init` unless the component genuinely needs concatenation in a Param value.
6. **Output `OnEnter` carries the diagnostic log** (`log_debug('__outputVar: ' + __outputVar)`). When a component has multiple outputs, each output sets a different outcome flag in its `OnEnter` and logs it.
7. **The init node re-declares every `__rt*` default explicitly** even though the master `Code` already declares them. This is intentional: it ensures clean state on re-entry within the same session.
8. **Both `.then(success, error)` callbacks always populate.** Never `.then(success)` with no error callback.
9. **Errors are serialized**: `log_error('[X] failed - ' + JSON.stringify(err))`, not `err.message`.
10. **Comments inside `Code`** use `//` single-line. **Every function declaration carries a basic JSDoc block** (`/** ... */` with description + `@param` for each argument + `@returns`) — this applies to canonical helpers, operation-specific helpers, and the per-component `__<componentName>` work function. No "trivial signature" escape hatch. No banner comments.
11. **Compact single-line elements** in the XML output. No multi-line attribute layouts. No XML comments.
12. **All ids are bare numeric strings.** Edge ids share the node id numeric space — pick monotonically.

---

## 14. Quick generation checklist

When generating a new component:

1. Choose component name (e.g. `condition`, `flowJump`, `workgroupTransfer`).
2. Build the master-layer attribute set with reference defaults (section 2).
3. Populate master `Code` with:
   - `__rt*` default declarations (per the operation's Params keys).
   - The five canonical helpers: `__makeLocalNodeId`, `__resolveTemplate`, `__extractParams`, `__setupConfig`, `__init`.
   - Operation-specific helpers and the `__<componentName>` work function.
4. Populate master `Variables` with:
   - `__configJSON` (the operation's full Params shape, with placeholder defaults).
   - `__environment = e