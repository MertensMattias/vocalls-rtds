# RTDS Finalize-Path Outcome Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a caller hangs up while a GUI component is mid-execution, recover the component's staged `__rtOutcome` so the end-of-call data tail runs from the component's actual chosen branch instead of a stale default.

**Architecture:** Engine-side resolution on the finalize path only. `finalizeFrom` (in `rtds_2_runtime.js`) re-resolves the in-flight component's staged outcome via `getValue(__rtParams, __rtOutcome, '')` and promotes a non-empty result onto `_rtNextStep` *before* choosing the resume point. Components are unchanged — they still stage `__rtOutcome` and resolve once at their own output node for the normal path. The shared `runStep` engine is reused; finalize adds only this re-resolution plus the existing `RTDS_finalizing` mode flag.

**Tech Stack:** ES5.1 JavaScript (Vocalls sandbox constraints — no `let`/`const`/arrow/etc.), Jest (`--runInBand`), Python doc-generation gates (`npm run check`).

---

## Background the engineer needs

- **The runtime engine** lives in `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js`. It loads after `rtds_3_vocallsEnv.js` (which defines the global `getValue`) — so `finalizeFrom` may call `getValue` directly.
- **`getValue(obj, key, defaultValue)`** (`rtds_3_vocallsEnv.js:66`) is a case-insensitive lookup that returns `defaultValue` when `obj`/`key` are falsy or the key is absent.
- **`__rtParams`** is a flat `{ key: value }` map a component builds in its init node (`__rtParams = __setupConfig(__configJSON)`). **`__rtOutcome`** is a Params *key name* (e.g. `'nextStep'`, `'nextStep_Success'`, `'nextStep_Failure'`). Both are **bare-assigned globals** (no `var`) that persist on the session scope; they reflect the *most recently entered* component. Resolving `getValue(__rtParams, __rtOutcome, '')` yields the real next-step id, or `''` if the outcome key isn't present.
- **`finalizeFrom(nextStepId)`** (current body, `rtds_2_runtime.js:753-766`) guards against a missing resume point, sets `RTDS_finalizing = true`, logs, and calls `runStep`. The `onCallResult` callback (master-layer `Code` in `callScripts/main_sourceCode.js`) computes `resumeAt = RTDS_nextStepId || RTDS_currentOpId` and passes it to `finalizeFrom`.
- **The fix is purely additive inside `finalizeFrom`.** No change to `runStep`, `resumeFrom`, `onCallResult`, or any component.
- **ES5.1 only.** Use `var`, function expressions, no arrow functions, no template-literal-free string ops needed here.
- **Tests** live in `projects/rtds-runtime/tests/finalize.test.js` and boot a real sandbox via `tests/components/_harness.js` (`h.loadRuntime()`), then register test-only op types. The sandbox exposes `setVariable`, `getScoped`, `buildOpIndex`, `registerRtdsOperation`, `registerRtdsExit`, `finalizeFrom`, and `context.session.variables`.
- **Commits trigger a pre-commit hook** (`npm run check` = `check:sync` + `check:lockstep` + `test`). Engine changes are in the lockstep set, so the design's doc updates (runtime-architecture.md / runtime-spec.md) must land too or the lockstep gate may flag drift. Run `npm test` directly during development for speed; let the hook run the full gate at commit time.

---

## File Structure

| File | Responsibility | Change |
| ---- | -------------- | ------ |
| `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` | Dispatch engine; `finalizeFrom` entry point | Add finalize-path re-resolution of `__rtOutcome` → `_rtNextStep` inside `finalizeFrom`. |
| `projects/rtds-runtime/tests/finalize.test.js` | Jest contract tests for the finalize surface | Add a `describe` block covering re-resolution, fallback, and sentinel cases. |
| `rtds/docs/runtime-architecture.md` | How the runtime is wired (lockstep doc) | Document the finalize-path re-resolution step. |
| `rtds/docs/runtime-spec.md` | Field-level runtime contract (lockstep doc) | Note `finalizeFrom` re-resolves `__rtOutcome`/`__rtParams` onto `_rtNextStep`. |

The convention change (`conventions/component-v2.md` §8) and the design doc were already committed in a prior step — they are **not** part of this plan.

**Out of scope for this plan (tracked in the design doc's Follow-up):** registering the `sendSms` / `sendMail` JS twins. Today only `setVariables` runs as a JS handler; `sendSms` / `sendMail` are GUI exits, which `runStep` filters out in finalize mode — so this plan recovers the resume point and reaches the data tail, but the call-report SMS/email won't *send* until the `executeSendSms` / `executeSendEmail` twins are re-registered (a separate effort). This plan does **not** change the registration block.

---

### Task 1: Add re-resolution tests (failing first)

These tests assert the *new* behaviour against the current `finalizeFrom`, which does not yet re-resolve — so they must fail before Task 2.

**Files:**
- Modify/Test: `projects/rtds-runtime/tests/finalize.test.js`

- [ ] **Step 1: Add the new describe block**

Append this block to `projects/rtds-runtime/tests/finalize.test.js`, immediately before the final closing of the file (after the existing `describe('onCallResult — termination callback ...')` block). It reuses the file's existing `boot`, `install`, and `dataOp` helpers.

```javascript
describe('finalizeFrom — recovers a mid-component staged outcome', function () {
    // Simulate a GUI component that was in flight when the caller hung up:
    // __rtParams holds the resolved config (outcome-key -> step id), __rtOutcome
    // holds the branch the component had chosen, but the component never reached
    // its output node so _rtNextStep / RTDS_nextStepId are stale.
    function stageInFlight(sb, params, outcome) {
        sb.__rtParams = params;
        sb.__rtOutcome = outcome;
    }

    it('resolves __rtOutcome via __rtParams and runs that branch (not the stale default)', function () {
        return boot().then(function (sb) {
            install(sb, [
                dataOp('SUCCESS', 'FromSuccess', 's', null),
                dataOp('DEFAULT', 'FromDefault', 'd', null)
            ]);
            // Component chose Success; its params map the outcome key to step 'SUCCESS'.
            stageInFlight(sb, { nextStep: 'DEFAULT', nextStep_Success: 'SUCCESS' }, 'nextStep_Success');

            // onCallResult would pass the STALE default ('DEFAULT') as the resume point.
            var out = sb.finalizeFrom('DEFAULT');

            expect(out).toBe('disconnect');
            expect(sb.getScoped('FromSuccess', null)).toBe('s');        // recovered branch ran
            expect(sb.getScoped('FromDefault', 'MISSING')).toBe('MISSING'); // stale default did NOT run
        });
    });

    it('leaves the passed resume point untouched when the outcome key is absent from params', function () {
        return boot().then(function (sb) {
            install(sb, [dataOp('PASSED', 'FromPassed', 'p', null)]);
            // Outcome names a key that is NOT in params -> getValue returns '' -> no override.
            stageInFlight(sb, { nextStep: 'PASSED' }, 'nextStep_Missing');

            var out = sb.finalizeFrom('PASSED');

            expect(out).toBe('disconnect');
            expect(sb.getScoped('FromPassed', null)).toBe('p');         // fell back to passed resume point
        });
    });

    it('is a no-op when __rtParams / __rtOutcome are absent (non-component finalize)', function () {
        return boot().then(function (sb) {
            install(sb, [dataOp('PASSED', 'FromPassed', 'p', null)]);
            // Ensure neither global is defined on the sandbox.
            delete sb.__rtParams;
            delete sb.__rtOutcome;

            var out = sb.finalizeFrom('PASSED');

            expect(out).toBe('disconnect');
            expect(sb.getScoped('FromPassed', null)).toBe('p');         // unchanged behaviour
        });
    });

    it('does not override when the resolved id is empty (outcome points at an empty-string param)', function () {
        return boot().then(function (sb) {
            install(sb, [dataOp('PASSED', 'FromPassed', 'p', null)]);
            stageInFlight(sb, { nextStep: 'PASSED', nextStep_Success: '' }, 'nextStep_Success');

            var out = sb.finalizeFrom('PASSED');

            expect(out).toBe('disconnect');
            expect(sb.getScoped('FromPassed', null)).toBe('p');         // '' is treated as "no resolution"
        });
    });
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx jest projects/rtds-runtime/tests/finalize.test.js -t "recovers a mid-component staged outcome" --runInBand`

Expected: The first test (`resolves __rtOutcome ...`) FAILS — `finalizeFrom('DEFAULT')` runs the stale `DEFAULT` op, so `FromDefault` is `'d'` and `FromSuccess` is missing, failing the assertions. (The other three describe the no-op/fallback cases, which already hold under current behaviour and may pass — that is fine; the first failing test proves the gap.)

- [ ] **Step 3: Do NOT commit yet**

This repo's pre-commit hook runs the full test suite (`npm run check` → `test`), so a commit containing a failing test would be rejected — and bypassing the hook (`--no-verify`) is not allowed. The failing run in Step 2 is the TDD evidence; the tests get committed together with the implementation in Task 2 Step 5. Leave the new tests staged-or-unstaged in the working tree and proceed to Task 2.

---

### Task 2: Implement finalize-path re-resolution

**Files:**
- Modify: `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` (the `finalizeFrom` function, currently lines ~753-766)

- [ ] **Step 1: Read the current `finalizeFrom` body**

Run: open `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` and locate `function finalizeFrom(nextStepId) {`. Current body:

```javascript
function finalizeFrom(nextStepId) {
  if (
    nextStepId === undefined ||
    nextStepId === null ||
    nextStepId === "" ||
    nextStepId === -1
  ) {
    log_warn("[RTDS] finalizeFrom: no resume point -- nothing to finalize.");
    return undefined;
  }
  RTDS_finalizing = true;
  Logger.info("[RTDS] finalizing", { from: String(nextStepId) });
  return runStep(String(nextStepId));
}
```

- [ ] **Step 2: Add the re-resolution block**

Replace the body so the re-resolution runs *before* the missing-resume-point guard (so a recovered outcome can supply a resume point even when the passed `nextStepId` is empty). Use this exact replacement:

```javascript
function finalizeFrom(nextStepId) {
  // Finalize-path outcome recovery: when the caller hangs up before the in-flight
  // GUI component reaches its output node, the component has staged __rtOutcome
  // (a Params key name) and __rtParams (the resolved config) as persisting bare
  // globals, but _rtNextStep / RTDS_nextStepId are stale. Re-resolve the staged
  // outcome to a real step id -- the same getValue(__rtParams, __rtOutcome, '')
  // the component's output node would have run -- and prefer it as the resume
  // point. Byte-identical to the output-node resolution (conventions/component-v2.md
  // §8 Finalize-path resolution); keep the two in lockstep. typeof-guarded so a
  // non-component finalize (globals absent) is an exact no-op.
  if (
    typeof __rtParams !== "undefined" &&
    typeof __rtOutcome !== "undefined"
  ) {
    var recovered = getValue(__rtParams, __rtOutcome, "");
    if (recovered) {
      Logger.info("[RTDS] finalize: recovered in-flight outcome", {
        outcome: __rtOutcome,
        nextStep: String(recovered),
      });
      nextStepId = recovered;
    }
  }

  if (
    nextStepId === undefined ||
    nextStepId === null ||
    nextStepId === "" ||
    nextStepId === -1
  ) {
    log_warn("[RTDS] finalizeFrom: no resume point -- nothing to finalize.");
    return undefined;
  }
  RTDS_finalizing = true;
  Logger.info("[RTDS] finalizing", { from: String(nextStepId) });
  return runStep(String(nextStepId));
}
```

- [ ] **Step 3: Run the Task 1 tests to verify they now pass**

Run: `npx jest projects/rtds-runtime/tests/finalize.test.js -t "recovers a mid-component staged outcome" --runInBand`

Expected: All four tests in the new describe block PASS.

- [ ] **Step 4: Run the full finalize suite to verify no regression**

Run: `npx jest projects/rtds-runtime/tests/finalize.test.js --runInBand`

Expected: All tests PASS — the existing finalize cases (happy path, GUI filtering, cycle guard, async tail await, `onCallResult` idempotency, missing-resume guard) are unaffected. In particular, the `'no-ops ... for: undefined/null/""/-1'` guard tests still pass because those tests never set `__rtParams`/`__rtOutcome`, so the new block is a no-op and the original guard fires as before.

- [ ] **Step 5: Commit the tests and implementation together**

Both the Task 1 tests and this implementation are committed together (the pre-commit hook requires a green suite, so they cannot be split):

```bash
git add projects/rtds-runtime/tests/finalize.test.js projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js
git commit -m "feat(rtds): finalizeFrom recovers a mid-component staged outcome on call interruption"
```

---

### Task 3: Verify the guard-tests interaction (cross-check, no new code)

The existing `finalizeFrom — guard on missing resume point` block asserts that `undefined/null/''/-1` resume points no-op *and stay out of finalize mode*. Confirm the new re-resolution block does not accidentally promote a stale global from a previous test and break that expectation.

**Files:**
- Test: `projects/rtds-runtime/tests/finalize.test.js` (verify only)

- [ ] **Step 1: Confirm `boot()` does not seed `__rtParams`/`__rtOutcome`**

Run: `npx jest projects/rtds-runtime/tests/finalize.test.js -t "guard on missing resume point" --runInBand`

Expected: All four parametrised guard tests PASS. `boot()` calls `h.loadRuntime()` which creates a fresh sandbox per test; `__rtParams`/`__rtOutcome` are not set by these tests, so `typeof __rtParams === 'undefined'` holds and the new block is skipped — the original guard returns `undefined` and `RTDS_finalizing` stays `false`.

- [ ] **Step 2: If any guard test fails, add an explicit reset**

Only if Step 1 fails: in the `boot()` function in `finalize.test.js`, after `sb.RTDS_finalizing = false;`, add:

```javascript
        delete sb.__rtParams;
        delete sb.__rtOutcome;
```

Then re-run Step 1. (Expected: not needed — a fresh sandbox per test means no leakage. This step exists only as a documented safety net.)

- [ ] **Step 3: Commit if Step 2 was needed**

```bash
git add projects/rtds-runtime/tests/finalize.test.js
git commit -m "test(rtds): reset in-flight outcome globals between finalize tests"
```

(Skip this commit if Step 2 was not needed.)

---

### Task 4: Update the lockstep docs

The engine change touches the lockstep set (per `CLAUDE.md`: "Change the runtime engine → update `rtds/docs/runtime-architecture.md`, `rtds/docs/runtime-spec.md`").

**Files:**
- Modify: `rtds/docs/runtime-architecture.md`
- Modify: `rtds/docs/runtime-spec.md`

- [ ] **Step 1: Find the finalize/end-of-call section in runtime-architecture.md**

Run: `grep -n "finalizeFrom\|finaliz\|onCallResult\|RTDS_finalizing" rtds/docs/runtime-architecture.md`

Read the matched section to match its prose style and heading level.

- [ ] **Step 2: Add the re-resolution note to runtime-architecture.md**

In the finalize/end-of-call subsection, add a paragraph (adapt heading level to the surrounding text):

```markdown
On the finalize path, before choosing its resume point, `finalizeFrom` re-resolves
the in-flight component's staged outcome — `getValue(__rtParams, __rtOutcome, '')`,
the same resolution a component's output node performs — and prefers a non-empty
result as the resume step. This recovers the component's actual chosen branch when
the caller hangs up before the component reached its output node (so `_rtNextStep` /
`RTDS_nextStepId` are stale). It is `typeof`-guarded, so a finalize with those
globals absent is an exact no-op. Components are unchanged; this resolution lives in
the engine and runs only on the finalize path.
```

- [ ] **Step 3: Add the field-contract note to runtime-spec.md**

Run: `grep -n "finalizeFrom\|finaliz\|_rtNextStep\|RTDS_nextStepId" rtds/docs/runtime-spec.md`

In the `finalizeFrom` / resume-point area, add:

```markdown
- `finalizeFrom` re-resolves `getValue(__rtParams, __rtOutcome, '')` and, when the
  result is a non-empty id, uses it as the resume point in preference to the passed
  `nextStepId` (which `onCallResult` derives from `RTDS_nextStepId || RTDS_currentOpId`).
  Empty result or absent globals → passed resume point is used unchanged.
```

- [ ] **Step 4: Run the lockstep + full check gate**

Run: `npm run check`

Expected: `check:sync` PASS, `check:lockstep` PASS (the 5 pre-existing param-parity warnings are report-only and unrelated), `test` — all suites PASS.

- [ ] **Step 5: Commit the docs**

```bash
git add rtds/docs/runtime-architecture.md rtds/docs/runtime-spec.md
git commit -m "docs(rtds): document finalize-path outcome re-resolution in runtime docs"
```

---

### Task 5: Final full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full check gate one more time**

Run: `npm run check`

Expected: all gates green; `Tests: <n> passed`.

- [ ] **Step 2: Confirm the working tree is clean for this feature**

Run: `git status --short`

Expected: no uncommitted changes under `projects/rtds-runtime/` or `rtds/docs/` from this feature (pre-existing unrelated modified files from other branches' work may remain — do not touch them).

---

## Self-Review Notes

- **Spec coverage:** Design "Files touched" table → Tasks 2 (engine), 1 (tests), 4 (runtime-architecture.md + runtime-spec.md). The convention §8 edit + design doc were committed earlier and are correctly excluded. Design "Test plan" items 1-4 map to Task 1's four tests (mid-component resolve / fallback-absent / sentinel-stale recovery / empty-result no-op) plus Task 2 Step 4's regression check of existing cases.
- **`''` no-op nuance** (the self-review tightening in the spec): covered by the `if (recovered)` truthiness check in Task 2 Step 2 and the dedicated "empty-string param" test in Task 1.
- **Name consistency:** `finalizeFrom`, `__rtParams`, `__rtOutcome`, `_rtNextStep`, `getValue`, `RTDS_finalizing`, `RTDS_nextStepId`, `RTDS_currentOpId` used identically across all tasks and match the current code.
- **No placeholders:** every code step shows complete code; every run step shows the exact command and expected outcome.
