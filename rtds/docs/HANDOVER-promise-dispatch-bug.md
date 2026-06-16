# Handover — RTDS dispatch returns a Promise the Vocalls engine can't await

**Date:** 2026-06-12
**Branch:** `feat/unified-rtoutcome-contract`
**Status:** RESOLVED 2026-06-12 — Option A implemented. `runStep` resolves sync handlers inline
(plain string across the engine boundary) and chains only genuine thenables; an async op on the
interactive path now logs a warn (`[RTDS] async JS op on the interactive path`). Applied to both
`rtds_2_runtime.js` and the embedded twin in `main_sourceCode.js` (master-layer `Code`); the
entry-node `372` fix is retained. Regression tests: `main.test.js` ("plain exit-key string" +
"warns when an async handler") — full suite green. Docs synced (`runtime-spec.md` §4.9,
`runtime-architecture.md`). Remaining: manual verify on the live guardTui flow (§5 step 6).
**Symptom owner:** live `guardTui` flow (DIGIPOLIS LPA_ICT_GUARD_TUI) hangs up instead of running the guardTUI component.

---

## 1. Problem

On the live Vocalls platform, an inbound `guardTui` call reaches the central dispatch `case` node, logs
`RTDS_currentOpConfig`, and then **falls through to the `no choice` default → disconnect**. The interactive
`guardTui` component never executes; the call hangs up and only the end-of-call data tail runs.

### Root cause

The runtime dispatch engine (`runStep`) returns a **native ES `Promise`** to the Vocalls flow engine, but the
Vocalls engine only knows how to await **its own Task thenable** (the `{ task, id, Timeout }` object produced by
`jsonHttpRequest(...).withTimeout(...)`). When a Script node returns a native Promise, the engine wraps it in a
Task and **stringifies the inner Promise instead of awaiting it**.

Live log proof (the `result` the case node switches on):

```json
{"task":{"id":1,"status":"RanToCompletion","result":{"Index":2,"Name":"[object Promise]"}},"id":1,"Timeout":10000}
```

`result.Name === "[object Promise]"` — a native Promise was stringified, never resolved. So
`result == 'guard_tui'` is false for every branch in the `case` node, and the flow takes `no choice` → disconnect.

### Where the native Promise comes from

`projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js`, the `runStep` JS-handler branch (~L615):

```js
if (entry.kind === "js") {
    var jsTask;
    jsTask = Promise.resolve(entry.handler(current));   // ← native Promise on EVERY JS op
    ...
    return jsTask.then(function () {                     // ← runStep returns a native Promise
        _rtNextStep = getValue(__rtParams, __rtOutcome, "");
        ...
        return runStep(String(_rtNextStep), remaining);
    }, ...);
}
```

The entry operation of every flow is `setVariables` (`00000`), which is **JS-handled and fully synchronous**
(no I/O). But because of `Promise.resolve(...)`, `runStep` wraps it in a native Promise anyway and returns that
Promise across the engine boundary — where it gets stringified.

### Why it worked before

This is a **regression from commit `b3b2b63`** ("refactor(rtds): unify JS twins onto the __rtOutcome contract;
engine is sole resolver", 2026-06-11). Before that commit, the JS branch ran synchronous handlers **inline**:

```js
result = entry.handler(current);          // sync handler returned { nextStepId }
...
currentId = String(result.nextStepId);    // loop inline — no Promise
continue;
```

…and only **async** handlers (`sendSms`/`sendMail`) returned a thenable that `runStep` chained off. So on the
interactive entry path, `runStep` returned a **plain string** (`"guard_tui"`) and the engine routed it fine.

`b3b2b63` changed the line to `Promise.resolve(entry.handler(current))` so sync and async twins share one
`__rtOutcome` resolution path. Good intent (unifies SendSMS/SendEmail with SetVariables), but it forced a native
Promise onto the synchronous entry path — which is the boundary the Vocalls engine can't await.

### Platform constraint (important)

`jsonHttpRequest` is built on `fetch` + `Promise` (`core/minimalVocallsCore.js` L187-293) and the prod Vocalls
equivalent uses its own async Task. **There is no synchronous/blocking HTTP on this platform**, and `async/await`
is banned in the ES5.1 sandbox (`minimalVocallsCore.js` L475). Therefore network ops (`sendSms`/`sendMail`)
**cannot** be made truly synchronous — they must hand a thenable to the engine and let it resume on resolution.

Crucially, on the live flow the async sends only ever run in the **finalize tail** (`onCallResult` →
`finalizeFrom`, after hang-up), whose return value is awaited by the platform and is **not** routed by the
`case` node. The interactive path before the GUI handoff contains only I/O-free `setVariables`.

---

## 2. What has already been done

- **Partial fix applied** (uncommitted, dirty file): `main_sourceCode.js` node `372` was a `Type="setvar"`
  node assigning `result = fetchAndStart(...)` with **no `return`**. It is now a `Type="script"` node with
  `Code="result = fetchAndStart(...);\nreturn result;"` — matching the working re-entry node `428`.
  This was necessary (a setvar node can never hand the value back to the engine) but **not sufficient**: with
  `return result;` in place, the engine now receives the native Promise and stringifies it to `"[object Promise]"`
  (the second live log). The real fix is in the engine, below.
- `rtds_2_runtime.js` is **unchanged**.

---

## 3. Possible solutions

### Option A — Sync interactive path / async finalize tail (RECOMMENDED)

Restore the pre-`b3b2b63` sync-fast-path in `runStep`'s JS branch: branch on whether the handler returned a
thenable.

```js
if (entry.kind === "js") {
    var handlerResult;
    try { handlerResult = entry.handler(current); }
    catch (err) { /* log; return "disconnect"; */ }

    // Async handler (sendSms/sendMail — only reached during finalize):
    if (handlerResult && typeof handlerResult.then === "function") {
        return handlerResult.then(function () {
            _rtNextStep = getValue(__rtParams, __rtOutcome, "");
            if (!_rtNextStep) return "disconnect";
            return runStep(String(_rtNextStep), remaining);   // keep budget thread
        }, function (err) { /* log; */ return "disconnect"; });
    }

    // Sync handler (setVariables — interactive path): resolve inline, never a Promise.
    _rtNextStep = getValue(__rtParams, __rtOutcome, "");
    if (!_rtNextStep) { Logger.info("[RTDS] end of flow", { lastStep: current.id }); return "disconnect"; }
    currentId = String(_rtNextStep);
    continue;
}
```

- **Result:** `fetchAndStart`/`resumeFrom` return a plain string on the interactive path → engine routes
  `"guard_tui"` → bug fixed. `finalizeFrom` keeps the thenable chain → terminal sends still awaited.
- **Keeps** the `__rtOutcome` contract, all components, specs, seeds, catalog.
- **Pros:** smallest change; restores known-good behavior; honest about the platform's async I/O model.
- **Cons:** reintroduces a tiny bit of per-kind branching (the thing `b3b2b63` removed). Latent risk: if a future
  flow ever places an HTTP op (`sendSms`/`sendMail`) **before** a GUI handoff on the live path, that op returns a
  promise into the interactive engine and the bug class returns. Mitigate with an assert/guard.

### Option B — Wrap `runStep`'s engine-facing return in a Vocalls Task

Keep the all-Promise internals, but convert the native Promise to a Vocalls-awaitable Task at the boundary
(`fetchAndStart`/`resumeFrom` return), so the engine can await it.

- **Pros:** preserves `b3b2b63`'s uniform async model.
- **Cons:** requires knowing the prod Vocalls API for constructing/wrapping a Task from a native Promise — **not
  verifiable from this repo**. Higher unknown. Could also just re-wrap into the same Task type and still not
  resolve if the engine doesn't recursively await. Needs platform confirmation first.

### Option C — Rewrite `runStep` on Vocalls Task primitives end-to-end

Replace `Promise.resolve`/`.then` throughout the engine with Vocalls Task primitives.

- **Cons:** largest blast radius; touches the lockstep contract and both async twins; same platform-API unknown as
  B. Not justified for this bug.

---

## 4. Recommendation

**Option A.** It directly restores the behavior that worked before 2026-06-11, is the smallest change, and is
truthful about the platform: fully synchronous on the live interactive dispatch (all that's needed for the bug),
async only in the terminal tail (which the platform requires and `onCallResult` already awaits). Options B/C
should only be considered if there's a product reason to run HTTP ops mid-interaction, and both need prod Vocalls
Task-API confirmation that this repo can't provide.

---

## 5. Implementation checklist (for Option A)

1. Edit `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` — `runStep` JS branch (~L615) per the
   snippet above. **Keep the `remaining` budget threaded into the async re-entry.**
2. Mirror the same change in the embedded twin: `projects/rtds-runtime/callScripts/main_sourceCode.js` master-layer
   `Code` (the `runStep` function inside the big `Code='...'` attribute on the `vocalls-master-layer` object).
3. Keep the already-applied node `372` fix (`Type="script"` + `return result;`).
4. `npm run build:skill` — resync the bundled `references/rtds_2_runtime.js` snapshot (per CLAUDE.md lockstep).
5. Run the gate tests:
   - `projects/rtds-runtime/tests/main.test.js` (smoke / dispatch)
   - `projects/rtds-runtime/tests/finalize.test.js` (end-of-call async tail)
   - `projects/rtds-runtime/tests/components/*` (assert on `__rtOutcome`; `_harness.js` already wraps in
     `Promise.resolve(...).then(...)`, tolerant of sync `undefined`)
   - Expected: green. `npm run check:lockstep` is unaffected (param-name parity only).
6. Manual verify on the live/sim guardTui flow: the `case` node should log a `guard_tui` match and route to the
   guardTUI component instead of `no choice` → disconnect. The `"[object Promise]"` line should be gone.

---

## 6. Key references

| Item | Location |
| ---- | -------- |
| Engine JS branch (the fix site) | `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` ~L615 |
| Embedded twin (mirror the fix) | `projects/rtds-runtime/callScripts/main_sourceCode.js` (master-layer `Code`) |
| Entry node already fixed | `main_sourceCode.js` node `id="372"` (now `Type="script"`, `return result;`) |
| Re-entry node (correct reference shape) | `main_sourceCode.js` node `id="428"` (`Type="script"`, `return result;`) |
| Dispatch `case` node (where it falls through) | `main_sourceCode.js` node `id="378"` |
| Regression commit | `b3b2b63` — "unify JS twins onto the __rtOutcome contract; engine is sole resolver" |
| Async runnable reference + design notes | `projects/rtds-runtime/callScripts/main.js` (S3/S4/S6 banners) |
| HTTP/thenable model | `core/minimalVocallsCore.js` L187-293 (`attachTimeoutThenable`, `jsonHttpRequest`) |
| Lockstep rules | `CLAUDE.md` → "What to update when you change X"; `scripts/check_lockstep.py` |

---

## 7. Open question for the next owner

`b3b2b63`'s commit message claims the all-Promise path made "call-interruption finalize covered uniformly with
no per-kind logic." The pre-refactor code **already** had the async thenable branch for the sends, so finalize was
already covered where it mattered (the async ops). Sync ops have no I/O to interrupt. Confirm this reading before
committing Option A so the "uniformity" rationale isn't silently lost.
