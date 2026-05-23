# RTDS Vocalls Component Conventions (v2)

This document captures the rules a generated v2 component must satisfy. The
structural source of truth is [rtds_vocalls_operations/components/sendSms.js](../../../../rtds_vocalls_operations/components/sendSms.js).
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

Use style aliases only (`transientNode`, `scriptNode`) — never the long
inline rounded-rect style.

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

### 2.1 `${name}` placeholders in `__configJSON`

`__setupConfig` substitutes `${name}` placeholders in any Param value
against the `global` scope before assigning `__rtParams`. Both whole-string
and partial substitution are supported:

```jsonc
{
    "To":      "${rtSmsTo}",                       // whole string -> String(global.rtSmsTo)
    "Body":    "Hello ${callerName}, your ref is ${ref}",  // partial -> "Hello Alice, your ref is 42"
    "From":    "8850"                              // no placeholder -> "8850"
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
  the work node and write to `global` first.

**Unresolved placeholders** — if `global` doesn't carry a `name`, the
placeholder is left raw (`"${name}"` survives into `__rtParams`) and a
`Logger.warn` records the key + placeholder name. The component continues;
downstream `getValue` will see the literal text. This is intentional —
silently substituting `""` for missing variables creates silent bugs.

**Active is never substituted** — `__setupConfig` coerces it to Boolean
directly. A `${someToggle}` value in `Active` becomes `Boolean("${someToggle}")`
which is `true`, almost certainly not what you wanted. Keep `Active`
literal.

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
- **No arrow functions, no template literals** in component code. The
  runtime is ES5.1 and additionally disables `new Function`/`eval` —
  string-eval is what gives you "Eval of strings is disabled in this
  runtime". For `${var}` substitution use `String.replace` (see §2.1);
  for everything else, compute in plain JS.

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
