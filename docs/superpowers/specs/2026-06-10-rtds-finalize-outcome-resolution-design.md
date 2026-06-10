# RTDS finalize-path outcome resolution

**Date:** 2026-06-10
**Status:** Design approved — ready for implementation plan
**Area:** RTDS runtime engine (`rtds_2_runtime.js`), `__rtOutcome` staging contract

## Problem

When a caller hangs up **while a GUI component is mid-execution**, the data tail that
should run on call termination (call-report SendSMS / SendEmail, attribute writes)
does not run from the right place — in practice, it does not run at all.

The platform's `onCallResult` termination callback already exists and works: it
guards against double-fire (`_endFlowSemaphore`), picks a resume point, and calls
`finalizeFrom(resumeAt)`, which sets `RTDS_finalizing = true` and re-runs `runStep`
in finalization mode (GUI nodes filtered out, only the JS-inline data tail runs).
This is covered by `tests/finalize.test.js` and passes.

The gap is **the resume point**, not the finalize engine.

## Root cause

v2 components use the `__rtOutcome` staging contract:

- **init node** stages a safe default outcome key, e.g. `__rtOutcome = 'nextStep'`,
  and builds `__rtParams = __setupConfig(__configJSON)`.
- **work body** reassigns `__rtOutcome` to the chosen branch key
  (`'nextStep_Success'`, `'nextStep_Failure'`, …) — a Params **key name**, not a step id.
- **output node** resolves once, in its `OnEnter`:
  `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` — turning the key into a real step id.

`__rtOutcome` is a *key name*. Converting it to a step id requires `getValue(__rtParams, …)`,
and that resolution lives **only at the component's output node**. If the caller drops
*before* the component reaches its output node:

- `_rtNextStep` is stale (holds a previous value or the `"_rtNextStep"` sentinel),
- `RTDS_nextStepId` holds only the **pre-staged default** from `prepareGuiHandoff`,
- `__rtOutcome` holds the component's **actual** chosen branch — but nothing resolved it.

So `onCallResult` resumes from the wrong/default step and the outcome-specific data
tail never runs.

## Options considered

| Option | Idea | Verdict |
| ------ | ---- | ------- |
| **A — engine-side resolution** | `finalizeFrom` re-resolves `getValue(__rtParams, __rtOutcome, '')` itself before choosing the resume point. | **Chosen.** One writer, one resolver, zero per-component edits. |
| **B — resolve after every branch** | Paste the resolution line after every `__rtOutcome =` assignment in every component. | Rejected. Huge surface area (incl. inside async `.then` and loop bodies), breaks the "one writer / one resolution point" convention, easy to miss a branch. |
| **B′ — resolve in each node's `OnEnter`** | Resolve once per node at entry, keeping `_rtNextStep` current. | Considered, then rejected in favour of A: still touches every node of every component; A achieves the same with no component edits. |

### Why A is mechanically sound (the key finding)

`__rtParams` and `__rtOutcome` are assigned **without `var`** (bare assignment) and are
pre-declared in each component's master-layer `Variables`. In the Vocalls sandbox a bare
assignment lands on the **global scope** — the `__` prefix is a *naming convention*
("treat as component-local"), not a real lexical scope. Mechanically these vars **persist
on the session global** for the life of the call, exactly like `_rtNextStep`.

They are **single-slot** globals: each component overwrites them, so at interruption time
they reflect the **most recently entered component** — precisely the one that was in flight.
That is exactly the outcome we want to recover.

### Async / loop correctness (resolved by A's timing)

A resolves at finalize time using whatever `__rtOutcome` the in-flight component last
committed:

- **Async body, outcome flips mid-flight** (`guardRouting` `getGuards`): the body pivots
  `__rtOutcome` to `'nextStep_Failure'` *before* the HTTP call, then back to `'nextStep'`
  inside `.then` on success. A drop mid-lookup recovers whatever was committed at that
  instant — a drop during the request should **not** fire the failure tail; the prior
  committed default governs. Correct.
- **Loop re-entry** (`guardRouting` `appendLog`, staged per attempt): `__rtOutcome` always
  holds the most recent completed attempt's outcome. Correct by construction.

## Decision

Keep `__rtOutcome` / `__rtParams` named as-is (no rename to `_rtOutcome`). Add
engine-side re-resolution on the **finalize path only**: `finalizeFrom`, before choosing
its resume point, re-resolves the in-flight component's staged outcome via
`getValue(__rtParams, __rtOutcome, '')` and sets `_rtNextStep` when that yields a real
step id. Guard with `typeof` checks so it is a no-op when the globals are absent.

Components are **unchanged**: they still stage `__rtOutcome` and resolve once at their own
output node for the normal (non-interrupted) path. The engine only re-resolves on the
finalize path.

## Files touched

| File | Change |
| ---- | ------ |
| `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` | In `finalizeFrom`, before choosing the resume point, re-resolve `__rtOutcome` → step id via `getValue(__rtParams, __rtOutcome, '')`. Set `_rtNextStep` **only when the result is a non-empty truthy id** (`getValue(..., '')` returns `''` for a missing key — treat `''` as "no resolution, leave `_rtNextStep` untouched"). `typeof` guards on both globals so absent globals are a no-op. |
| `projects/rtds-runtime/tests/finalize.test.js` | New cases: (a) drop mid-component resolves the staged `__rtOutcome` to the correct data tail; (b) clean fallback when `__rtParams` / `__rtOutcome` are absent; (c) absent/sentinel `_rtNextStep` still recovers via the re-resolution. |
| `conventions/component-v2.md` (§8) | Add a **Finalize-path resolution** subsection + checklist line documenting the engine re-resolution. |
| `rtds/docs/runtime-architecture.md`, `rtds/docs/runtime-spec.md` | Document the finalize-path re-resolution (lockstep: engine-engine change). |

After editing the repo `conventions/` source and the runtime engine, run:

- `npm run build:skill` — the skill bundle (`conventions/`, bundled runtime snapshot) is
  **generated**; resync it after editing the source.
- `npm run check` — runs the lockstep / validation gates (engine change touches the
  lockstep set).

## Test plan

`tests/finalize.test.js` (Jest, self-contained runtime boot):

1. **Mid-component drop resolves the staged outcome.** Stage `__rtParams` with a
   `nextStep_Success` key → a data op; set `__rtOutcome = 'nextStep_Success'`; leave
   `_rtNextStep` stale. Assert `finalizeFrom` runs the success tail, not the default.
2. **Fallback when globals absent.** No `__rtParams` / `__rtOutcome` → behaviour is the
   current `RTDS_nextStepId || RTDS_currentOpId` path, unchanged.
3. **Sentinel `_rtNextStep` recovered.** `_rtNextStep === '_rtNextStep'` (or empty) but a
   valid `__rtOutcome` / `__rtParams` present → re-resolution supplies the real step.
4. **Existing finalize cases stay green** (GUI filtering, cycle guard, async tail await,
   `onCallResult` idempotency).

## Out of scope

- Renaming `__rtOutcome` → `_rtOutcome` (considered; not adopted this round).
- Any change to the live-call (`resumeFrom`) path — only the finalize path changes.
- Sequential finaliser slot (`KeyLog()` / `SegmentLog()`) — separate effort.
