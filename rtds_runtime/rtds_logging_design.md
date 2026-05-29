# RTDS Logging Design - simple alternative

Author: design draft, pre-implementation
Status: awaiting approval before code changes
Replaces: v1 (registry + LogPublisher abstraction) - rejected as over-engineered
Scope: `rtds_2_runtime.js`, `rtds_3_vocallsEnv.js`, plus the voice-flow master node `Code` property in `rtds_runtime_main_sourceCode.js`

---

## 1. Goal

Add KeyLog, SegmentLog, and finalize EventLog wiring, in the exact style of the existing reference handler (`KeyLog` / `SendResponse` shown in production). No buffers except the segment array. No abstraction layers. No features not asked for.

---

## 2. Constraints (re-stated from approval round)

- Voice-critical environment - stability and predictability over flexibility.
- Style must match `rtds_3_vocallsEnv.js` and the production reference. ES5.1, `var`, no arrow functions, no Lifecycle/Publisher abstractions.
- No buffers anywhere EXCEPT one array for SegmentLog, accumulated during the call.
- EventLog stays as-is - `Logger.warn` / `Logger.error` / `Logger.API` already POST per call. No batching.
- KeyLog is built inline at fire time from globals + `DEFAULT_LOGGED_KEYS`. No buffer.
- SegmentLog is the array `varObj._segmentLog`, populated during `runStep`, POSTed once at end-of-call.

---

## 3. What changes from v1

| v1 (rejected) | v2 (this) |
|---|---|
| `LogPublisher` module owning three buffers | No publisher. Three plain functions. |
| `Lifecycle` registry over platform callbacks | No registry. `onCallEnd` is one function with sequential calls. |
| Event batching on `varObj._eventBuffer` | Removed. Logger keeps posting per call (current behavior). |
| Idempotency via `_inFlight` + `_sent` flags inside Publisher | `_endFlowSemaphore` global int, mirroring the production reference. |
| Both `flushSegments` and `flushKeys` from a registered handler | Direct `KeyLog(); SegmentLog();` calls in `onCallEnd`. |

The data model becomes: one array, three functions, one callback.

---

## 4. Reference style I'm matching

The production reference shows exactly the idiom to copy:

- Standalone top-level function per log stream.
- `var _body = { ... }` built inline from globals.
- Environment switch resolved into `_endpoint` at the top of the function.
- `jsonHttpRequest(endpoint, { method, timeout }, _headers, _body)` wrapped in `try`/`catch` for the call-site error, with `.then(success, failure)` for the async outcome.
- `log_debug` / `log_error` directly - no Logger abstraction inside these functions (Logger is for the runtime trace, not for these terminal POSTs).
- `_endFlowSemaphore++` as the only idempotency guard.

I deviate from the reference in exactly one place: endpoint construction. The reference uses pre-built `_keyLogAPI_PRD` / `_keyLogAPI_ACC` constants; the rest of `rtds_runtime_main_sourceCode.js` already follows a different convention - `_rtBaseUrl + '/xxapi-' + environment + '/api/yy'` - built in the api-configs script node (id `294`). To "blend in with the rtds code" I add `_rtKeyLogEndpoint` and `_rtSegmentLogEndpoint` to that script node and reference them from the new functions. This keeps endpoint definitions all in one place.

---

## 5. Data placement

One array on `varObj`. That's it.

```
varObj._segmentLog = []      // array of SegmentLogDetail objects
```

Why on `varObj` and not a flat global like `language`:
- It survives GUI handoffs for free via `storeSessionVariables()` / `initializeCallFlowContext` session restore.
- It's reset on the fresh-call path of `applyVarObjDefaults` so a recycled global scope never leaks segments from a prior call.

`_endFlowSemaphore` is a flat global declared in the master-node `Variables` property (alongside the existing `result`, `env`, `debug`, etc.), reset implicitly on every fresh session.

KeyLog has no persistent state - it reads from the same globals (`language`, `dnis`, `ani`, `customerName`, `customerProject`, `interactionStartTime`, `routingId`) that `syncEssentialGlobals` in `initializeCallFlowContext` already populates.

---

## 6. Functions to add to `rtds_3_vocallsEnv.js`

Three top-level functions, placed below `storeSessionVariables`. Sketches (final form will use `var`, no template literals, matching library convention):

### 6.1 `recordSegment(detail)` - called once per `runStep` iteration

```javascript
function recordSegment(detail) {
    if (!varObj || varObj.logSegmentActive === false) { return; }
    if (!varObj._segmentLog) { varObj._segmentLog = []; }
    varObj._segmentLog.push(detail);
}
```

That is the entire helper. No batching, no async, no flush threshold. The runtime pushes onto an array.

### 6.2 `SegmentLog()` - POSTs the array at end-of-call

Body shape matches the reference exactly. Builds `_body.segments` from `varObj._segmentLog`, POSTs to `_rtBaseUrl + _rtSegmentLogEndpoint`, logs success/failure with `log_debug` / `log_error`, returns the promise. Clears `varObj._segmentLog = []` after the POST is initiated so a double-fire cannot resend the same rows.

### 6.3 `KeyLog()` - POSTs a snapshot of `DEFAULT_LOGGED_KEYS` at end-of-call

Body shape matches the reference. Iterates `DEFAULT_LOGGED_KEYS`, reads each value from the global scope via the existing `getRtdsGlobalScope()` helper (or directly from `varObj` - they are kept in sync by `syncEssentialGlobals`). Skips keys whose value is `undefined` or `null`. POSTs to `_rtBaseUrl + _rtKeyLogEndpoint`.

The `keys` array structure is exactly the swagger `KeyDetail` shape:
```
[{ name: 'language', value: 'NL' }, { name: 'ani', value: '+32...' }, ...]
```

No buffer, no accumulation. Built at fire time.

---

## 7. Change to `rtds_2_runtime.js`

One call inserted into `runStep`, immediately after the existing `Logger.info('[RTDS] step', ...)` block and before dispatch. The segment is finalised after dispatch with the resolved `nextStepId` or `exitKey`. Conceptually:

```javascript
var segStart = nowUTC();
// ... existing dispatch (js handler or gui exit) ...
recordSegment({
    segmentName: current.name || current.id,
    segmentType: current.type,
    segmentResult: resultLabel,   // nextStepId, exitKey, or error label
    nextSegment: resultLabel,
    segmentObj: JSON.stringify(current.params || {}),
    startTimestamp: segStart,
    endTimestamp: nowUTC(),
    createdBy: ''
});
```

`recordSegment` is no-op-safe (it self-initializes the array, respects `logSegmentActive`). One call, one place. No flush from inside the runtime.

---

## 8. Change to `rtds_runtime_main_sourceCode.js`

Two edits:

### 8.1 api-configs script node (id `294`)

Add two endpoint constants, in the same style as the existing ones:

```javascript
_rtKeyLogEndpoint = '/ivrapi-' + environment + '/api/KeyLog';
_rtSegmentLogEndpoint = '/ivrapi-' + environment + '/api/SegmentLog';
```

(EventLog endpoint already exists implicitly inside `Logger.config.buildApiUrl` - it stays self-contained.)

### 8.2 master-node `Code` property (currently empty, line 3)

Declare the Vocalls termination callback. The body is sequential, not registry-driven - future features add a line, not a registration. The `_endFlowSemaphore` guard mirrors the reference exactly:

```javascript
function onCallEnd(callResult) {
    if (_endFlowSemaphore > 0) { return; }
    _endFlowSemaphore++;
    KeyLog();
    SegmentLog();
    // Future finalisers go here: JSON finaliser, etc. One line per addition.
}
```

Also add `_endFlowSemaphore = 0;` to the master-node `Variables` property so it is declared up front.

That is the entire onCallEnd. No registry, no try/catch around individual handlers (each function has its own try/catch around the HTTP call, same as the reference). If KeyLog or SegmentLog throws synchronously before its own try/catch, the semaphore is already incremented so the platform's potential retry of onCallEnd is still guarded - but `KeyLog` would not run a second time. That is the acceptable tradeoff.

---

## 9. EventLog - no change to behavior

`Logger.warn` / `Logger.error` / `Logger.API` keep posting per-event as they already do. The only optional cleanup: in `buildEventDetail`, the placeholder lookup

```javascript
segment: (typeof segmentState !== 'undefined' && segmentState && segmentState.currentSegment) || null
```

becomes

```javascript
segment: (varObj && varObj._segmentLog && varObj._segmentLog.length > 0)
    ? varObj._segmentLog[varObj._segmentLog.length - 1].segmentName
    : null
```

so a Logger event records which segment was active when it fired. Same change for `segmentResult`. This is the only Logger edit - the rest of the file is untouched.

---

## 10. Trade-offs vs v1

What we lose:
- Generic extensibility for future lifecycle callbacks. If five more features all want to hook onCallEnd, they add five lines instead of registering. At five lines, it's still readable; at twenty, we'd refactor.
- Event batching - 10x more HTTP calls than v1 in a chatty call. Accepted because Logger is already production-tested in this shape, and voice-critical means "do not change what works".

What we gain:
- ~100 fewer lines of code.
- Identical structural style to the production reference - reviewers can read it without context switching.
- No new abstractions to learn or maintain.
- One file (`rtds_3_vocallsEnv.js`) holds all three logging functions and is the only library file that grows meaningfully.
- Failure modes are pointwise: a KeyLog network failure cannot cascade into SegmentLog because they are independent function calls.

What stays open:
- If future onCallEnd tasks ever require ordering control, fault isolation between handlers, or skipping a handler conditionally, the registry pattern from v1 is the obvious refactor target. Until then, sequential calls are the simpler answer.

---

## 11. Assumptions

1. `onCallEnd(callResult)` is called by the platform on every termination path the runtime cares about, as documented. `onSessionEnd` is the documented backstop and is left unwired.
2. `_endFlowSemaphore` resets to `0` at session start because it is declared in the master-node `Variables`. If the platform reuses session state across calls (unlikely for IVR sessions), we add an explicit reset in `initializeCallFlowContext`.
3. `DEFAULT_LOGGED_KEYS` corresponds 1:1 with names available either on `varObj` or in the global scope. Operators editing the list keep this invariant.
4. The `jsonHttpRequest` `.then(success, failure)` shape behaves identically to its use in the production reference - fire-and-forget, no blocking the call termination.
5. Vocalls does not reorder or coalesce calls to `onCallEnd`. If it does, `_endFlowSemaphore` handles the re-entry case.

If any of these is wrong, flag now.

---

## 12. Implementation order

1. `rtds_3_vocallsEnv.js` - add `recordSegment`, `KeyLog`, `SegmentLog` functions. Reset `_segmentLog` array in `applyVarObjDefaults`. Update `Logger.buildEventDetail` `segment` / `segmentResult` lookup to read from `varObj._segmentLog` tail.
2. `rtds_2_runtime.js` - add `recordSegment` call to `runStep` after each dispatch.
3. `rtds_runtime_main_sourceCode.js` - add two endpoint constants to the api-configs script node (id `294`), populate the master-node `Code` property with `onCallEnd`, add `_endFlowSemaphore = 0;` to master-node `Variables`.

Each step is independently testable. Step 1 ships the new functions without firing them. Step 2 starts populating the segment array. Step 3 wires the platform callback.

---

## 13. Validation checks before declaring done

1. Place a `Logger.warn` mid-flow and a `Logger.error` mid-flow - confirm each posts its own EventLog event immediately, as before. No change from current behavior.
2. Run a flow with SetAttributes -> Condition (mock) -> SendSMS GUI handoff -> Disconnect - confirm `/api/SegmentLog` receives one POST with four rows in the array.
3. Confirm `/api/KeyLog` receives one POST with one row per set key in `DEFAULT_LOGGED_KEYS`.
4. Confirm `onCallEnd` fired twice by the platform results in one KeyLog POST, one SegmentLog POST (semaphore guard works).
5. Confirm a GUI handoff -> resume cycle preserves the segment array across `storeSessionVariables` / session restore (varObj round-trip).
6. Confirm a Logger event fired after at least one segment has been recorded carries the correct `segment` / `segmentResult` fields.
7. Confirm the runtime does not call `KeyLog` or `SegmentLog` itself - all final POSTs come from `onCallEnd`, not from `runStep`.

---

End of design draft. Approve, push back, or amend - then I write code.
