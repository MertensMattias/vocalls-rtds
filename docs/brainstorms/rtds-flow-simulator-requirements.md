---
date: 2026-06-03
topic: rtds-flow-simulator
---

# RTDS Flow Simulator (run production runtime, mock only API + GUI handoffs)

## Summary

A repeatable RTDS flow simulator that runs the **production** runtime and handler
code end-to-end against a real authoring-format flow file, mocking only the two true
external boundaries — **API requests** and **GUI handoffs** — and emitting a readable
trace. It replaces the throwaway `tmp_sim_flow.js` harness that has been hand-rebuilt
repeatedly, and gives a deterministic "does this flow wire up and dispatch correctly"
check usable by hand and in CI.

---

## Problem Frame

There is no first-class way to run a routing-table flow through the runtime locally.
The existing `npm run simulate` (`cli/simulate.js`) loads the libraries and runs
`main.js`, but its `stub` HTTP mode (`core/minimalVocallsCore.js`) returns a
**fetch-shaped** response (`{ status, ok, json() }`), while the RTDS runtime
(`fetchAndStart`, `parseFlow`) expects the **Vocalls shape**
(`{ success, statusCode, response }`). So the one call every flow run depends on — the
routing-table fetch — cannot be stubbed usefully by the current simulator.

The recurring cost: to actually watch a flow dispatch, a throwaway Node harness has
been written by hand at least three times in a single working session. Each rebuild
re-derives the same boilerplate — load libraries via `core/loader`, seed a session via
`vocalls_session_init/vocallsContext`, hand-roll a correctly-shaped `jsonHttpRequest`,
convert the PascalCase flow file to the camelCase the runtime reads, register the
`SetVariables` twin to drive past the first GUI exit, and print a trace. The work is
real, repeated, and thrown away every time.

---

## Actors

- A1. Developer: runs the simulator locally to confirm a flow parses, dispatches, and
  reaches a terminal state; reads the trace to debug runtime/handler behavior.
- A2. RTDS runtime (production code under test): `fetchAndStart` → `parseFlow` →
  `runStep` → `resumeFrom`, the registry, `setupConfig`, and the JS handlers — all run
  unmodified.
- A3. Simulator harness (the mock boundary): serves the routing-table + other API
  responses, and intercepts GUI-exit handoffs to auto-advance the flow.

---

## Key Flows

- F1. Simulate a flow end-to-end
  - **Trigger:** developer runs the simulator pointed at a
    `callflow_json_config_vocalls/*.json` flow file.
  - **Actors:** A1, A2, A3.
  - **Steps:**
    1. Harness loads the production libraries + `main.js` into a seeded session
       (reusing `core/loader` + `vocalls_session_init/vocallsContext`).
    2. Harness installs a Vocalls-shaped `jsonHttpRequest`
       (`{ success, statusCode, response }`).
    3. Production `fetchAndStart` requests the routing table; the harness serves the
       chosen flow file, run through the **flow adapter** (authoring PascalCase →
       runtime camelCase), logging that the adapter ran.
    4. Production `runStep` dispatches inline JS ops for real.
    5. On a GUI-exit op, the harness records the handoff (exit key, op id, mirrored
       params) and auto-advances via `resumeFrom()` on the op's default NextStep.
    6. Loop continues until a terminal exit (`disconnect`) or end-of-flow.
  - **Outcome:** a trace listing steps visited, exit keys, `varObj` writes, and any
    errors; non-zero/clearly-flagged result if the runtime logged an error.
  - **Covered by:** R1, R2, R3, R4, R5, R6, R7.

---

## Requirements

**Execution boundary (what is real vs mocked)**
- R1. Run the production runtime and handler code unmodified: `fetchAndStart`,
  `parseFlow`, `runStep`, `resumeFrom`, the registry, `setupConfig`, and the JS
  handlers. The simulator must not fork or re-implement runtime logic.
- R2. Mock **only** two boundaries: outbound API requests and GUI handoffs. Everything
  reachable without crossing those boundaries executes real code.

**API mocking**
- R3. Provide a `jsonHttpRequest` in the Vocalls result shape
  (`{ success, statusCode, response }`) — not the current fetch shape — so
  `fetchAndStart` and the handlers see what production sends.
- R4. The chosen flow file IS the routing-table mock: the simulator serves it for the
  routing-table fetch automatically. Other endpoints (SMS, mail, guard, schedule)
  resolve to per-URL fixtures when provided, else a generic success default.

**Flow adapter**
- R5. Convert the authoring-format flow file (PascalCase: `SourceId`, `Operations`,
  `Type`, `Params`, `IsFirstOperation`) into the runtime/production API shape
  (camelCase: `sourceId`, `operations`, `type`, `params`, `isFirstOperation`) via a
  **named, tested adapter** that **logs that it ran**. Malformed input must fail loudly,
  not silently produce an empty flow.

**GUI handoff mocking**
- R6. When `runStep`/`resumeFrom` returns a GUI exit key, record the handoff (exit key,
  op id, params the runtime mirrored) and auto-advance by calling `resumeFrom()` on the
  op's default NextStep — no human input, fully deterministic.

**Output**
- R7. Emit a readable trace: steps visited (id, type, kind), exit keys, `varObj` writes,
  GUI handoffs recorded, and any error-level logs. The result must make "did this flow
  run cleanly" obvious at a glance.

---

## Acceptance Examples

- AE1. **Covers R1, R3, R4, R5.** Given a `callflow_json_config_vocalls/*.json` whose
  first op is `SetVariables_vocalls`, when simulated, then the production `fetchAndStart`
  receives the adapted (camelCase) flow as a `{ success, statusCode, response }`
  response, `parseFlow` builds the op index, and the run reaches the first op without a
  shape-mismatch error.
- AE2. **Covers R6.** Given a flow that reaches a GUI-exit op (e.g. `GuardTUI_vocalls`),
  when the engine returns its exit key, then the simulator records the handoff and
  resumes on that op's default NextStep, continuing until a terminal `disconnect`.
- AE3. **Covers R5.** Given a flow file with a malformed/missing `Operations` array,
  when simulated, then the adapter reports a clear error rather than serving an empty
  flow that disconnects silently.
- AE4. **Covers R7.** Given a clean run, when it completes, then the trace shows the
  ordered steps, the final exit key, representative `varObj` writes with native types
  preserved, and "0 errors"; a run with a runtime error surfaces it distinctly.

---

## Success Criteria

- A developer can simulate any `callflow_json_config_vocalls/*.json` flow with a single
  command (or one small documented entry point) and read a clear pass/trace — without
  hand-writing a harness.
- The throwaway `tmp_sim_flow.js` pattern is retired; the same capability is a committed,
  repeatable tool.
- A downstream implementer can build this from the requirements without inventing the
  mock boundary: it is unambiguous that only API + GUI handoffs are mocked, the flow file
  is the routing-table source, the adapter direction is authoring→runtime, and GUI exits
  auto-advance on default NextStep.

---

## Scope Boundaries

- **Not running real components.** GUI handoffs are mocked at the exit-key boundary; the
  actual mxGraph canvas components (`rtds/components/*.js`) are not loaded or executed.
  Executing component XML would need a component executor — much larger scope, deferred.
- **Auto-advance only; no branch selection.** v1 always takes the default NextStep at GUI
  exits. Scripted per-op outcomes and interactive DTMF/branch selection are deferred
  (see Dependencies / Assumptions for the coverage consequence).
- **Not changing the production runtime or the flow files** to resolve the casing gap —
  the adapter bridges authoring format to runtime shape; `parseFlow` stays as-is
  (verified correct against the production Swagger).
- **Not replacing `npm run simulate` for CONFIG/prompt simulation.** This is an RTDS
  flow-dispatch simulator; the existing prompt/CONFIG simulation path is separate.

---

## Key Decisions

- Run production code, mock two boundaries (API + GUI): keeps fidelity high and the tool
  honest — it tests real dispatch/handler/config logic, not a re-implementation.
- Flow file is the routing-table mock: mirrors the established hand-built workflow and
  removes per-flow fixture authoring for the one universal call.
- Auto-advance default NextStep at GUI exits: deterministic and CI-friendly; accepts that
  alternate GUI branches aren't exercised in v1.
- PascalCase→camelCase is an **adapter, not a bug fix**: verified `parseFlow` matches the
  production API contract (`RoutingTableFullViewModel`, camelCase, in
  `rtds/api_swagger/routingtable_rtds_swagger.json`). The `callflow_json_config_vocalls/`
  files are authoring-tool/Designer exports in PascalCase, so a one-way adapter is the
  correct bridge — but it is named, tested, and logged so the format gap stays visible.

---

## Dependencies / Assumptions

- Reuses existing infrastructure: `core/loader` (script load order), `vocalls_session_init/vocallsContext`
  (session seed), and the production runtime libraries. No new runtime dependencies expected.
- The current `core/minimalVocallsCore.js` `stub` mode (fetch-shaped, `stubs/<url>.json`)
  is the wrong shape for RTDS; this simulator supplies its own Vocalls-shaped HTTP mock
  rather than relying on it. Whether to also fix/retire the existing stub mode is open
  (see Outstanding Questions).
- **Coverage consequence of auto-advance (assumption made explicit):** because GUI exits
  always take the default NextStep, caller-input branches (DTMF menus, GuardTUI
  success/denied) are not exercised. This simulator proves dispatch + config + non-GUI
  handler logic end-to-end; alternate GUI-branch coverage requires the deferred
  scripted-outcomes mode.
- `callflow_json_config_vocalls/*.json` are authoring-tool exports (confirmed with the
  user); the adapter assumes that PascalCase authoring shape as its input contract.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R3, R4][Technical] Should this ship as a new `cli/simulate.js` flag/mode
  (e.g. `--flow <path>`) reusing its arg/loader plumbing, or as a separate `cli` entry
  point / harness module? Decide during planning from the existing CLI structure.
- [Affects R3][Technical] Should the existing `core/minimalVocallsCore.js` `stub` mode be
  fixed/extended to emit the Vocalls shape (and `stubs/` reused for the per-endpoint
  fixtures in R4), or left untouched with the simulator providing its own mock? Resolve
  against the core's current consumers during planning.
- [Affects R5][Technical] Where should the flow adapter live so it is reusable by anything
  else ingesting `callflow_json_config_vocalls/*` exports (not simulator-private)?
- [Affects R6][Needs research] How does the simulator obtain each GUI op's "default
  NextStep" at handoff time — from `prepareGuiHandoff`'s `RTDS_nextStepId`, or by reading
  the op's `NextStep` param directly? Confirm against the handoff state the runtime sets.
