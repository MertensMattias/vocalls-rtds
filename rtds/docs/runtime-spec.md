# RTDS Runtime — Vocalls JavaScript Handler Spec

**Document type:** Technical specification
**Scope:** JavaScript runtime layer for RTDS routing table execution inside Vocalls
**Related files:**
- `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` — implementation produced by this spec (with `rtds_3_vocallsEnv.js` for shared helpers)
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
| Arrow functions `=>` | not safe — use function expressions |
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
| Logging | `Logger.debug/info/warn/error(message, ctx)` from `rtds_3_vocallsEnv.js`. The raw Vocalls globals `log_debug`, `log_warn`, `log_error` are the sink used by Logger internally. |
| HTTP | `jsonHttpRequest(url, options, headers, body).withTimeout(ms)` — returns a task, must be `return`ed. Used via `fetchAndStart()` wrapper; not called directly from Script nodes. |

### 1.3 Shared state — `context.session.variables`

`context.session.variables` is a writable plain object that persists for the duration of the session, including across transfers and node re-entries. It is the primary state store for the RTDS runtime — replacing any concept of a module-level context object.

All RTDS runtime state (opIndex, current step, header fields, error codes) is read from and written to `context.session.variables`.

The `context` object is otherwise read-only session info (`context.phone`, `context.language`, `context.currentNode`, etc.). `context.returnTo` is also writable but is unrelated to RTDS.

### 1.4 What the JSON looks like

The RTDS API (`GET /api/routing-table/source?sourceId=...`) returns a single object:

```json
{
  "sourceId": "+3233389999",
  "name": "DIGIPOLIS - LPA_ICT_HELPDESK",
  "project": "LPA ICT",
  "promptLibrary": "DIGIPOLIS\\LPA\\ICT_HELPDESK",
  "supportedLanguages": "NL",
  "operations": [ { "id": "00000", "type": "...", "name": "...", "isFirstOperation": true, "params": { ... } }, ... ]
}
```

Each operation has:
- `id` — zero-padded string key, e.g. `"00000"`
- `type` — string matching a `Dic_OperationType.Name` value
- `name` — human-readable label
- `isFirstOperation` — boolean, true on the entry-point operation(s)
- `params` — object of typed key/value pairs; values may be scalar or array `[value, ...flags]`
- `ttsMessages` — optional `{ "NL": "...", "FR": "..." }` map of per-language spoken text. Present on
  **any prompt-playing operation** — i.e. one whose `params` carry `prompt` + `applicationId` (`say`,
  and any future PlayPrompt-style Type). It is a **sibling** of `params` in the routing table, not a
  member. The runtime folds a copy into the op config at handoff (see §4.8) so prompt components read
  it from their resolved config; `${var}` placeholders in the text are resolved by the component.

### 1.5 Operation types and their Vocalls mapping

The full RTDS operation set spans two categories:

**JS-handled operations** — fully executed inside the Script node; stages `__rtOutcome` and the engine resolves `_rtNextStep`, then loops:

| Type | What it does | Status |
|---|---|---|
| `SetVariables` | Write named variables to dot-path targets (varObj by default); always has `NextStep` | Implemented |
| `SendSMS` | POST to RTDS gateway; branches `NextStep_Success` / `NextStep_Failure` / `NextStep` | Implemented |
| `SendEmail` | POST to RTDS gateway; branches `NextStep_Success` / `NextStep_Failure` / `NextStep` | Implemented |
| `Emergency` | Check an emergency flag via HTTP; branches to `NextStep_Transfer`, `NextStep_Disconnect`, `NextStep_Continue`, or `NextStep_Failure` | Not yet implemented — runStep skips to NextStep with a warning |
| `Schedule` | Check a schedule ID via HTTP; branches to named `NextStep_*` keys | Not yet implemented — runStep skips to NextStep with a warning |
| `Condition` | Evaluate a queue statistic; branches `NextStep_True` / `NextStep_False` | Not yet implemented — runStep skips to NextStep with a warning |
| `CheckAttribute` | Compare a session variable value; branches `NextStep_True` / `NextStep_False` | Not yet implemented — runStep skips to NextStep with a warning |
| `FlowJump` | Replace the active SourceId and restart | Not yet implemented — runStep skips to NextStep with a warning |
| `IVRLogging` | Write a log record; always has `NextStep` | Not yet implemented — runStep skips to NextStep with a warning |
| `UpdateSourceId` | Overwrite the call's source ID; always has `NextStep` | Not yet implemented — runStep skips to NextStep with a warning |
| `SkillUpdate` | Update ACD skill assignments; always has `NextStep` | Not yet implemented — runStep skips to NextStep with a warning |
| `RESTRequest` / `RESTGet` | Make an HTTP call; branches on result | Not yet implemented — runStep skips to NextStep with a warning |

**GUI-exit operations** — the Script node sets dispatcher state on `context.session.variables`, then returns a string exit key that Vocalls uses to route to the matching GUI node:

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

---

## 2. Data Flow

```
Call arrives
    |
    v
[Script node: entry point A]
    |
    +-- fetchAndStart(sourceId)
    |       jsonHttpRequest(_rtBaseUrl + _rtGetSourceIdEndpoint + '?sourceId=...')
    |       .withTimeout(_rtFetchTimeoutMs = 2000)
    |       parse JSON
    |       on success: write Storage fallback cache (rtdsConfig_<sourceId>.json)
    |       on transient failure (timeout/rejection/5xx/parse):
    |         serve cached config if fresh (< _rtConfigCacheMaxAgeMs), else
    |         retry once .withTimeout(_rtFetchRetryTimeoutMs = 10000)
    |       on 4xx: disconnect (authoritative; cache never served)
    |       parseFlow(json)
    |         --> writes header to context.session.variables
    |         --> builds opIndex, writes to context.session.variables.RTDS_opIndex
    |       getFirstOperation(operations) --> firstOp
    |       runStep(firstOp.id)
    |         --> JS-handled: execute, get nextStepId, loop
    |         --> GUI-exit:   write RTDS_currentOpConfig, return exit key string
    |         --> JS-handled: execute, get nextStepId, loop
    |         --> GUI-exit:   write RTDS_currentOpConfig, return exit key string
    |
    v
[GUI Node] executes (transfer, play, menu, ...)
    |
    v
[Script node: entry point B — re-entry]
    |
    +-- resumeFrom(_rtNextStep || context.session.variables.RTDS_nextStepId)
    |       opIndex already in context.session.variables
    |       runStep(nextStepId) --> loop continues
    |       Note: _rtNextStep takes priority over GUI outcome
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
| `RTDS_opIndex` | After parseFlow | Map<string, Object> keyed by operation id |
| `RTDS_currentOpId` | Before GUI handoff | Id of the operation being handed off |
| `RTDS_currentOpType` | Before GUI handoff | Type of the operation being handed off |
| `RTDS_currentOpConfig` | Before GUI handoff | The op's whole `params` object (the GUI component reads it to configure itself), **plus** the op's `ttsMessages` folded in under the `ttsMessages` key (`{}` when the op carries none). This is the **single** prompt-text channel — there is no separate ttsMessages var |
| `RTDS_nextStepId` | Before GUI handoff | Default next step Id (GUI node overwrites this with its outcome) |
| `RTDS_error` | On error | Error code string. Written **only** on paths that return `'disconnect'` — a cache-served call leaves it unset (end-of-call log classifiers read it) |
| `RTDS_configSource` | After a successful `fetchAndStart` | `'api'` (fresh fetch) or `'cache'` (served from the Storage fallback) |
| Any SetVariables target | During SetVariables | Written to `varObj` by default (or a dotted target) via `setVariable`; native JSON type preserved, strings token-resolved |

---

## 4. Functions

### 4.1 `buildOpIndex(operations)`

Converts the `operations` array into a `Map` keyed by the stringified `id`:

```js
var index = new Map();
for (var i = 0; i < operations.length; i++) {
  var op = operations[i];
  if (!op || !op.id) { continue; } // logs an error and skips id-less ops
  index.set(String(op.id), op);
}
```

Stored in `context.session.variables.RTDS_opIndex` (a `Map<string, Object>`). Looked up by every subsequent `runStep` call (`opIndex.get(currentId)`) without re-fetching or re-parsing.

### 4.2 `parseFlow(json)`

Validates the JSON, writes all header fields and `RTDS_opIndex` to `context.session.variables`, then returns the first operation object (or `null` on error). Error code written to `context.session.variables.RTDS_error`.
The function uses camelCase field names (`json.sourceId`, `json.name`, `json.project`, `json.promptLibrary`, `json.supportedLanguages`, `json.operations`) matching the API response.

### 4.3 `getFirstOperation(operations)`

Scans the `operations` array for entries where `isFirstOperation === true`. If multiple exist (valid for FlowJump scenarios), sorts by `id` lexicographically and returns the lowest. Returns `null` if none found.

### 4.4 `getParam(op, name, fallback)`

Reads a single typed param value, unwrapping the array form `[value, ...flags]`. The flags (`isDisplayed`, `isEditable`) are GUI-builder metadata and are irrelevant at runtime — only `v[0]` is used. Performs case-insensitive fallback scan of `op.params` keys.

### 4.5 `resolveTokens(value)`

Replaces `$(ATTR_NAME)` tokens in string param values. Resolution follows the scope contract:
- An `RTDS_*` token resolves from `context.session.variables` (the dispatcher namespace).
- Any other token resolves operator data via `getScoped(name)` (varObj → global), then falls back to `context.session.variables`.

Non-string values pass through unchanged. Unresolved tokens become empty string.

### 4.6 `resolveNextStep(op, resultKey)`

Resolution order:
1. If `resultKey` is provided and `op.params[resultKey]` is set, return it.
2. Fall back to `op.params.NextStep`.
3. Return `null` (triggers end-of-flow).

### 4.7 `executeSetVariables(op)`

Unified `__rtOutcome` contract (mirrors `rtds/components/setVariables.js`). Builds `__rtParams = setupConfig(op.params)`, seeds `__rtOutcome = 'nextStep'`, then:
- **Active defaults `true`** — `if (!activeFlag(getValue(__rtParams, 'active', true)))` skips (logs, returns; outcome stays `'nextStep'`). Byte-identical to the `setVariables.js` component; only an explicit falsey `Active` skips.
- Otherwise `walk(__rtParams, …)` skips the control keys `active` / `nextStep` (case-insensitive) and writes every other key via `setVariable(key, value)` — a bare key lands on `varObj`, a dotted key targets `varObj` / `globalThis` / a named reachable object (see §4.11). Values keep the type `setupConfig` resolved.

Returns nothing (sync `undefined`). The engine resolves `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` after it returns.

### 4.8 `prepareGuiHandoff(op)`

Before returning an exit key, sets the dispatcher handoff state on `context.session.variables`:
- `RTDS_currentOpId` = `op.id`
- `RTDS_currentOpType` = `op.type`
- `RTDS_currentOpConfig` = a **shallow copy** of `op.params` (the whole config object; the GUI node reads it to configure itself) **with `op.ttsMessages` folded in under the `ttsMessages` key** (`{}` when absent). The copy means `op.params` — the cached routing-table object reused for the whole call — is never mutated. Prompt-playing components (`say`, and any op whose Params carry `prompt` + `applicationId`) read the per-language spoken text from `__rtParams.ttsMessages` and resolve `${var}` tokens on the chosen string. There is **no** separate `RTDS_currentTtsMessages` var: a standalone canvas binding is captured once and replays the first op's text on every later prompt in the call.
- `RTDS_nextStepId` = the default `NextStep` (the GUI node overwrites this with its branching outcome before re-entry).

The runtime does **not** mirror params into per-key `RTDS_OP_*` session variables — the GUI node reads `RTDS_currentOpConfig` instead.

### 4.9 `runStep(startOpId)`

Core dispatch loop. Takes an operation id string, looks it up in `context.session.variables.RTDS_opIndex` (`opIndex.get(currentId)`), and dispatches:

- JS-handled type: the handler runs inline. A **sync** handler (returns `undefined` — e.g. `setVariables`) is resolved immediately: the engine — the **single resolver** — runs `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` and advances `currentId` (or ends the flow on `''`), so a sync-only path returns the exit key as a **plain string**. An **async** handler (returns a thenable — the Send* HTTP twins) is chained off; the same resolver line runs after it settles and `runStep` returns a promise of the exit key. The thenable branch is expected only under `RTDS_finalizing` (the finalize tail, where the platform awaits the return): the prod Vocalls engine cannot await a native Promise — it stringifies it (`"[object Promise]"`) and the dispatch `case` node falls through to disconnect — so an async op on the interactive path logs a warn. The handler's return value is used only for sync-vs-async timing, never routing. `Active` defaults `true` on the JS twins.
- GUI-exit type: calls `prepareGuiHandoff`, returns the exit key string.
- **Unregistered type** (no real handler yet — e.g. `Emergency`, `Schedule`): logs a warning and **skips to the op's `NextStep`**, continuing the loop. Only when there is no `NextStep` does it end the flow (`"disconnect"`).
- Missing step (id not in opIndex): logs warning, writes `RTDS_error`, returns `"disconnect"`.
- No next step: returns `"disconnect"` (normal end-of-flow).

Implemented as a `while` loop (not recursion) to avoid stack overflow on long JS-handled chains. A **step budget** (`RTDS_MAX_STEPS`, threaded through async re-entries so it spans sync and async hops as one run) bounds total dispatch steps; exhausting it writes `RTDS_error = 'RTDS_CYCLE_DETECTED'` and returns `"disconnect"`, so a cyclic `NextStep` chain (including among unregistered types) cannot hang the call leg, while bounded retry/reprompt revisits of a node still run.

### 4.10 `resumeFrom(nextStepId)`

Re-entry point after a GUI node completes. The GUI node must have written the chosen outcome Id into `context.session.variables.RTDS_nextStepId`. `resumeFrom` reads that value and calls `runStep`. The `RTDS_opIndex` is already in session — no re-fetch required.

### 4.11 `setVariable(path, value)` — and `getScoped(key, default)`

Defined in `rtds_3_vocallsEnv.js`; the matched write/read pair for operator data.

- **`setVariable(path, value)`** — write side. A bare key (no dot) targets `varObj`, the default call-scoped store. With a dot, the first segment is the root **only when it names one** (`varObj`, `globalThis`/`global`, or an already-reachable object); otherwise the whole path nests under `varObj` (`auth.verified` → `varObj.auth.verified`). Missing intermediate objects are auto-created. The value's native type is preserved; segment casing is kept verbatim. See `specs/setVariables.spec.md`.
- **`getScoped(key, default)`** — read side. Prefers `varObj[key]` (case-insensitive), falls back to exact-case `global[key]`, then `default`.

---

## 5. SetVariables — Detailed Behaviour

`SetVariables` is the most common operation type. It initialises routing state before every branching decision.

### 5.1 What it writes

Given:
```json
{
  "id": "00000",
  "type": "SetVariables",
  "isFirstOperation": true,
  "params": {
    "CallflowId": "LPA_ICT_HELPDESK",
    "RoutingId": "LPA_ICT_HELPDESK",
    "IVREvent": "9999",
    "IVRAction": "CT",
    "NextStep": "00001"
  }
}
```

The runtime:
1. Writes to `varObj` (via `setVariable`): `CallflowId`, `RoutingId`, `IVREvent`, `IVRAction` — each with its native JSON type (`IVREvent` stays a string `"9999"` because it is quoted; an unquoted `9999` would stay a number).
2. Returns `{ nextStepId: "00001" }`.
3. Loop advances to operation `"00001"` (type `Emergency`).

### 5.2 Token resolution

String param values containing `$(ATTR_NAME)` are resolved (see §4.5) before being written. Example:

```json
"To": "$(ATTR_EmailTo)"
```

Becomes `varObj.To = <resolved ATTR_EmailTo>` (or empty string if not set). The resolved value stays a string.

---

## 6. Error Handling

| Situation | Behaviour |
|---|---|
| Routing-table fetch: timeout / rejection / 5xx / parse failure (transient) | Serve the Storage fallback cache if fresh; on cache miss retry once at `_rtFetchRetryTimeoutMs`; only if the retry also fails: `log_error`, write `RTDS_error`, return `"disconnect"` |
| Routing-table fetch: 4xx (authoritative) | `log_error`, write `RTDS_error = 'RTDS_API_ERROR_<status>'`, return `"disconnect"` — the cache is never served |
| Other RTDS API unreachable or non-200 | `Logger.error`, write `RTDS_error`, return `"disconnect"` |
| JSON parse failure | `Logger.error`, write `RTDS_error`, return `"disconnect"` |
| No `isFirstOperation` operation | `Logger.error`, write `RTDS_error = 'RTDS_NO_ENTRY_POINT'`, return `"disconnect"` |
| `nextStepId` not in opIndex | `Logger.warn`, write `RTDS_error`, return `"disconnect"` |
| Unknown `type` in dispatch | `Logger.warn`, write `RTDS_error`, return `"disconnect"` |
| `null` nextStepId | Return `"disconnect"` (normal end-of-flow, no error) |
| Exception inside a handler | `Logger.error`, write `RTDS_error = err.message`, return `"disconnect"` |

---

## 7. Entry Points (Script node code)

### Entry point A — initial call entry

```js
return fetchAndStart(context.session.variables.RTDS_sourceId);
```

`RTDS_sourceId` must be set in `context.session.variables` before this Script node is entered (e.g. from a prior SetVar node that maps the inbound phone number to a SourceId).

### Entry point B — re-entry after a GUI node

```js
return resumeFrom(_rtNextStep || context.session.variables.RTDS_nextStepId);
```

The GUI node must write the chosen outcome step Id into `context.session.variables.RTDS_nextStepId` before this Script node is entered.

### Entry point C — call finalization (`onCallResult`)

The platform termination callback, declared in the master-layer `Code` property (not a Script node). Fires on every end-of-call path:

```js
function onCallResult() {
    if (_endFlowSemaphore > 0) { return; }
    _endFlowSemaphore++;
    var resumeAt = context.session.variables.RTDS_nextStepId
                || context.session.variables.RTDS_currentOpId;
    return finalizeFrom(resumeAt);
    // Sequential finaliser slot (separate effort): KeyLog(); SegmentLog();
}
```

`finalizeFrom` sets the **`RTDS_finalizing`** flag and reuses `runStep`. While finalizing, `runStep` filters out GUI-exit operations (logs `[RTDS] finalize: stop at GUI node` and stops — no live call leg to route to a canvas component) and runs only the JS-inline data tail: the call-report `SendEmail` / `SendSMS`, attribute writes, API calls. **Returning** the task makes the platform await it, so async terminal POSTs complete reliably.

`_endFlowSemaphore` (idempotency, starts `0`) and `RTDS_finalizing` (starts `false`) are declared in the master-layer `Variables` property. `RTDS_finalizing` is never reset — finalization is terminal and the global scope is discarded at session end.

To reach the tail, the routing table must place data-only ops after the last caller-facing node, chained via `NextStep`, terminating at a node with no `NextStep` (or a GUI node, which is the natural logged stop).

---

## 8. Unimplemented Operation Types

The following operation types follow the same architectural pattern as `SetVariables` but require additional handler logic. The runtime skips them (logs a warning and continues to `NextStep`) until implemented:

- `Emergency` — HTTP call to check an emergency flag; multi-branch result
- `Schedule` — HTTP call to evaluate a schedule; multi-branch result
- `Condition` — Vocalls queue statistic evaluation; `NextStep_True` / `NextStep_False`
- `CheckAttribute` — session variable comparison; `NextStep_True` / `NextStep_False`
- `FlowJump` — replace `RTDS_sourceId`, re-fetch JSON, restart loop
- All GUI-exit types — wiring defined in dispatch table, handoff logic implemented; GUI nodes not yet wired in the Vocalls canvas


---

## 9. Implementation File Structure

The RTDS runtime is organized into two complementary files:

### `rtds_3_vocallsEnv.js` (Library module)

Cross-cutting platform utilities (loaded first):
- `Logger` — wrapper around Vocalls' raw `log_debug/warn/error` globals with structured logging
- Object-access helpers: `getValue`, `hasKey`, `walk`, `getScoped`, `setVariable`, `nowUTC`, …
- `initializeCallFlowContext(mode)` — seeds `varObj` and syncs essential globals

### `rtds_2_runtime.js` (RTDS dispatch)

Contains all core functions used by the two entry points (A and B):
- `fetchAndStart(sourceId)` — fetches the routing table over `jsonHttpRequest`, parses it, and starts dispatch
- `parseFlow(json)` — validates and caches the routing table
- `buildOpIndex(operations)` — creates the operation lookup `Map`
- `getFirstOperation(operations)` — finds the entry-point operation
- `runStep(opId)` — main dispatch loop
- `resumeFrom(nextStepId)` — re-entry handler after GUI nodes
- Handler functions: `executeSetVariables(op)`, `executeSendSms(op)`, `executeSendEmail(op)`
- `prepareGuiHandoff(op)` — bridges JS and GUI layers
- Configuration globals (`_rtBaseUrl`, `_rtGetSourceIdEndpoint`, …) are set by `callScripts/main.js`

All state is stored on `context.session.variables`, enabling stateless re-entry across call transfers and node interruptions.
