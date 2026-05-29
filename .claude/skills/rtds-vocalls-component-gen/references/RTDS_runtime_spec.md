# RTDS Runtime — Vocalls JavaScript Handler Spec

**Document type:** Technical specification
**Scope:** JavaScript runtime layer for RTDS routing table execution inside Vocalls
**Related files:**
- The runtime helpers ([rtds_globalCodeAndHelpers.js](rtds_globalCodeAndHelpers.js) — bundled snapshot). See [runtime_pointer.md](runtime_pointer.md).
- `routing_table_api.md` — API that delivers the JSON this runtime consumes
- `NALLO_APP_rtds_schema.md` — database schema reference
- `assembleRoutingTable.js` — DB-to-JSON assembler (reference for JSON shape)

---

## 1. Context and Constraints

### 1.1 What Vocalls is

Vocalls is a contact-centre automation platform built around a GUI flow builder and a JavaScript scripting environment. A Vocalls flow is a graph of nodes. Most nodes are GUI primitives:

- Transfer — route the call to a queue, agent, or external number
- Selection / Menu — collect DTMF input and branch
- Disconnect — end the call
- Play — play an audio prompt
- Condition — evaluate an expression and branch

Script nodes sit alongside these GUI nodes and can read/write session variables, make HTTP requests, and return a string exit key that determines which GUI node to activate next.

### 1.2 JavaScript environment constraints

The Vocalls Script node runs in a sandboxed JS environment. The following are confirmed constraints:

| Feature | Status |
|---|---|
| `var` / `let` / `const` | safe |
| `function` declarations | safe |
| Arrow functions `=>` | safe|
| `for` loops with index | safe |
| `for...of` | not safe — use indexed `for` |
| `Map` / `Set` |  safe |
| Optional chaining `?.` | not safe — use explicit null checks |
| Nullish coalescing `??` | not safe — use explicit checks |
| Template literals `` ` ` `` | safe |
| `Array` methods (sort, filter, push) | safe (ES5+) |
| `Object.keys()` | safe |
| `JSON.parse` / `JSON.stringify` | safe |
| `module.exports` / `require` | does not exist |
| `async` / `await` | does not exist — use `.then()` with `return` |
| `Promise` | does not exist — use built-in task objects |
| Logging | `log_debug()`, `log_warn()`, `log_error()` — no `console.log` |
| HTTP | `httpRequest(url, options)` — returns a task, must be `return`ed |

### 1.3 Shared state — `context.session.variables`

`context.session.variables` is a writable plain object that persists for the duration of the session, including across transfers and node re-entries. It is the primary state store for the RTDS runtime — replacing any concept of a module-level context object.

All RTDS runtime state (opIndex, current step, header fields, error codes) is read from and written to `context.session.variables`.

The `context` object is otherwise read-only session info (`context.phone`, `context.language`, `context.currentNode`, etc.). `context.returnTo` is also writable but is unrelated to RTDS.

### 1.4 What the JSON looks like

The RTDS API (`GET /api/routing-table/:sourceId`) returns a single object:

```json
{
  "SourceId": "+3233389999",
  "Name": "DIGIPOLIS - LPA_ICT_HELPDESK",
  "Project": "LPA ICT",
  "PromptLibrary": "DIGIPOLIS\\LPA\\ICT_HELPDESK",
  "SupportedLanguages": "NL",
  "Operations": [ { "Id": "00000", "Type": "...", "Name": "...", "Params": { ... } }, ... ]
}
```

Each operation has:
- `Id` — zero-padded string key, e.g. `"00000"`
- `Type` — string matching a `Dic_OperationType.Name` value
- `Name` — human-readable label
- `IsFirstOperation` — boolean, true on the entry-point operation(s)
- `Params` — object of typed key/value pairs; values may be scalar or array `[value, ...flags]`
- `TtsMessages` — optional `{ "NL": "...", "FR": "..." }` map (PlayPrompt only)

### 1.5 Operation types and their Vocalls mapping

The full RTDS operation set spans two categories:

**JS-handled operations** — fully executed inside the Script node; produces a `nextStepId` and loops:

| Type | What it does |
|---|---|
| `SetAttributes` | Write named session variables; always has `NextStep` |
| `Emergency` | Check an emergency flag via HTTP; branches to `NextStep_Transfer`, `NextStep_Disconnect`, `NextStep_Continue`, or `NextStep_Failure` |
| `Schedule` | Check a schedule ID via HTTP; branches to named `NextStep_*` keys |
| `Condition` | Evaluate a queue statistic; branches `NextStep_True` / `NextStep_False` |
| `CheckAttribute` | Compare a session variable value; branches `NextStep_True` / `NextStep_False` |
| `FlowJump` | Replace the active SourceId and restart |
| `IVRLogging` | Write a log record; always has `NextStep` |
| `UpdateSourceId` | Overwrite the call's source ID; always has `NextStep` |
| `SkillUpdate` | Update ACD skill assignments; always has `NextStep` |
| `RESTRequest` / `RESTGet` | Make an HTTP call; branches on result |

**GUI-exit operations** — the Script node writes params to `context.session.variables`, then returns a string exit key that Vocalls uses to route to the matching GUI node:

| Type | GUI node type | Exit key returned |
|---|---|---|
| `WorkgroupTransfer` | Transfer / ACD queue | `"workgroup_transfer"` |
| `ExternalTransfer` | Transfer (external) | `"external_transfer"` |
| `Menu` | Selection / DTMF collect | `"menu"` |
| `LanguageMenu` | Selection (language variant) | `"language_menu"` |
| `PlayPrompt` | Play audio | `"play_prompt"` |
| `PlayAudio` | Play audio (static) | `"play_audio"` |
| `Disconnect` | Disconnect | `"disconnect"` |
| `GuardRouting` | Guard/on-call routing | `"guard_routing"` |
| `GuardTUI` | Guard TUI variant | `"guard_tui"` |
| `Callback` | Callback scheduling | `"callback"` |
| `SendSMS` | SMS dispatch | `"send_sms"` |
| `SendEmail` | Email dispatch | `"send_email"` |

---

## 2. Data Flow

```
Call arrives
    |
    v
[Script node: entry point A]
    |
    +-- httpRequest(RTDS API) --> .then()
    |       parse JSON
    |       parseFlow(json)
    |         --> writes header to context.session.variables
    |         --> builds opIndex, writes to context.session.variables.RTDS_opIndex
    |       getFirstOperation(operations) --> firstOp
    |       runStep(firstOp.Id)
    |         --> JS-handled: execute, get nextStepId, loop
    |         --> GUI-exit:   write RTDS_OP_* params, return exit key string
    |
    v
[GUI Node] executes (transfer, play, menu, ...)
    |
    v
[Script node: entry point B — re-entry]
    |
    +-- resumeFrom(context.session.variables.RTDS_nextStepId)
    |       opIndex already in context.session.variables
    |       runStep(nextStepId) --> loop continues
```

---

## 3. Session Variables Written by the Runtime

All state is stored on `context.session.variables`. No separate "context" object is constructed.

| Variable | Set when | Value |
|---|---|---|
| `RTDS_sourceId` | After parseFlow | Source ID of the active flow |
| `RTDS_name` | After parseFlow | Routing table name |
| `RTDS_project` | After parseFlow | Project name |
| `RTDS_promptLibrary` | After parseFlow | Prompt library path |
| `RTDS_supportedLanguages` | After parseFlow | Language codes |
| `RTDS_opIndex` | After parseFlow | Plain object keyed by operation Id |
| `RTDS_currentOpId` | Before GUI handoff | Id of the operation being handed off |
| `RTDS_currentOpType` | Before GUI handoff | Type of the operation being handed off |
| `RTDS_nextStepId` | Before GUI handoff | Default next step Id (GUI node overwrites this with its outcome) |
| `RTDS_error` | On error | Error code string |
| `RTDS_OP_*` | Before GUI handoff | Prefixed copy of each Param key/value for the GUI node to read |
| Any SetAttributes param key | During SetAttributes | The param value, token-resolved |

---

## 4. Functions

### 4.1 `buildOpIndex(operations)`

Converts the `Operations` array into a plain object keyed by `Id`:

```js
var opIndex = {};
for (var i = 0; i < operations.length; i++) {
  opIndex[operations[i].Id] = operations[i];
}
```

Stored in `context.session.variables.RTDS_opIndex`. Looked up by every subsequent `runStep` call without re-fetching or re-parsing.

### 4.2 `parseFlow(json)`

Validates the JSON, writes all header fields and `RTDS_opIndex` to `context.session.variables`, then returns the first operation object (or `null` on error). Error code written to `context.session.variables.RTDS_error`.

### 4.3 `getFirstOperation(operations)`

Scans the `Operations` array for entries where `IsFirstOperation === true`. If multiple exist (valid for FlowJump scenarios), sorts by `Id` lexicographically and returns the lowest. Returns `null` if none found.

### 4.4 `getParam(op, name, fallback)`

Reads a single typed param value, unwrapping the array form `[value, ...flags]`. The flags (`isDisplayed`, `isEditable`) are GUI-builder metadata and are irrelevant at runtime — only `v[0]` is used.

### 4.5 `resolveTokens(value)`

Replaces `$(ATTR_NAME)` tokens in string param values with the corresponding value from `context.session.variables`. Non-string values pass through unchanged. Unresolved tokens become empty string.

### 4.6 `resolveNextStep(op, resultKey)`

Resolution order:
1. If `resultKey` is provided and `op.Params[resultKey]` is set, return it.
2. Fall back to `op.Params.NextStep`.
3. Return `null` (triggers end-of-flow).

### 4.7 `executeSetAttributes(op)`

Iterates `op.Params`:
- Skips `NextStep` (flow control only, not stored).
- For `LogAttributes`: splits on `"|"`, reads each named variable from `context.session.variables`, logs with `log_debug`.
- For all other keys: resolves tokens and writes to `context.session.variables[key]`.

Returns `{ nextStepId }`.

### 4.8 `prepareGuiHandoff(op)`

Before returning an exit key, writes all `op.Params` to `context.session.variables` with the `RTDS_OP_` prefix (tokens resolved), sets `RTDS_currentOpId`, `RTDS_currentOpType`, and pre-populates `RTDS_nextStepId` with the default `NextStep`. The GUI node reads `RTDS_OP_*` to configure itself and overwrites `RTDS_nextStepId` with its branching outcome.

### 4.9 `runStep(startOpId)`

Core dispatch loop. Takes an operation Id string, looks it up in `context.session.variables.RTDS_opIndex`, and dispatches:

- JS-handled type: calls the handler, gets `nextStepId`, advances `currentId`, continues the `while` loop.
- GUI-exit type: calls `prepareGuiHandoff`, returns the exit key string.
- Unknown type: logs warning, writes `RTDS_error`, returns `"disconnect"`.
- Missing step: logs warning, writes `RTDS_error`, returns `"disconnect"`.
- No next step: returns `"disconnect"` (normal end-of-flow).

Implemented as a `while` loop (not recursion) to avoid stack overflow on long JS-handled chains.

### 4.10 `resumeFrom(nextStepId)`

Re-entry point after a GUI node completes. The GUI node must have written the chosen outcome Id into `context.session.variables.RTDS_nextStepId`. `resumeFrom` reads that value and calls `runStep`. The `RTDS_opIndex` is already in session — no re-fetch required.

---

## 5. SetAttributes — Detailed Behaviour

`SetAttributes` is the most common operation type. It initialises routing state before every branching decision.

### 5.1 What it writes

Given:
```json
{
  "Id": "00000",
  "Type": "SetAttributes",
  "IsFirstOperation": true,
  "Params": {
    "LogAttributes": "RTDS_ProjectName|Eic_RemoteId|ATTR_RoutingId",
    "CallflowId": "LPA_ICT_HELPDESK",
    "RoutingId": "LPA_ICT_HELPDESK",
    "IVREvent": "9999",
    "IVRAction": "CT",
    "NextStep": "00001"
  }
}
```

The runtime:
1. Reads `LogAttributes`, splits on `|`, logs current values from `context.session.variables` (most empty at this point).
2. Writes to `context.session.variables`: `CallflowId`, `RoutingId`, `IVREvent`, `IVRAction`.
3. Returns `{ nextStepId: "00001" }`.
4. Loop advances to operation `"00001"` (type `Emergency`).

### 5.2 Token resolution

Param values containing `$(ATTR_NAME)` are resolved against `context.session.variables` before being written. Example:

```json
"To": "$(ATTR_EmailTo)"
```

Becomes `context.session.variables["To"] = context.session.variables["ATTR_EmailTo"]` (or empty string if not set).

---

## 6. Error Handling

| Situation | Behaviour |
|---|---|
| RTDS API unreachable or non-200 | `log_error`, write `RTDS_error`, return `"disconnect"` |
| JSON parse failure | `log_error`, write `RTDS_error`, return `"disconnect"` |
| No `IsFirstOperation` operation | `log_error`, write `RTDS_error = 'RTDS_NO_ENTRY_POINT'`, return `"disconnect"` |
| `nextStepId` not in opIndex | `log_warn`, write `RTDS_error`, return `"disconnect"` |
| Unknown `Type` in dispatch | `log_warn`, write `RTDS_error`, return `"disconnect"` |
| `null` nextStepId | Return `"disconnect"` (normal end-of-flow, no error) |
| Exception inside a handler | `log_error`, write `RTDS_error = err.message`, return `"disconnect"` |

---

## 7. Entry Points (Script node code)

### Entry point A — initial call entry

```js
return httpRequest(
  'https://rtds-api.internal/api/routing-table/' + context.session.variables.RTDS_sourceId,
  { method: 'GET' }
).then(function(response) {
  if (response.statusCode !== 200) {
    log_error('[RTDS] API returned ' + response.statusCode);
    context.session.variables.RTDS_error = 'API_ERROR_' + response.statusCode;
    return 'disconnect';
  }
  var json = JSON.parse(response.body);
  var firstOp = parseFlow(json);
  if (!firstOp) { return 'disconnect'; }
  return runStep(firstOp.Id);
});
```

`RTDS_sourceId` must be set in `context.session.variables` before this Script node is entered (e.g. from a prior SetVar node that maps the inbound phone number to a SourceId).

### Entry point B — re-entry after a GUI node

```js
return resumeFrom(context.session.variables.RTDS_nextStepId);
```

The GUI node must write the chosen outcome step Id into `context.session.variables.RTDS_nextStepId` before this Script node is entered.

---

## 8. Out of Scope — Future Iterations

The following operation types follow the same architectural pattern as `SetAttributes` but require additional handler logic. They return `"disconnect"` via the unknown-type fallback until implemented:

- `Emergency` — HTTP call to check an emergency flag; multi-branch result
- `Schedule` — HTTP call to evaluate a schedule; multi-branch result
- `Condition` — Vocalls queue statistic evaluation; `NextStep_True` / `NextStep_False`
- `CheckAttribute` — session variable comparison; `NextStep_True` / `NextStep_False`
- `FlowJump` — replace `RTDS_sourceId`, re-fetch JSON, restart loop
- All GUI-exit types — wiring defined in dispatch table, handoff logic implemented; GUI nodes not yet wired in the Vocalls canvas
