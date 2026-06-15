# RTDS Runtime Architecture

How the committed reference runtime under
[`projects/rtds-runtime/`](../../projects/rtds-runtime/) is wired together: the three
global libraries, the dispatch engine, and the contract between JS-handled operations and
the Vocalls canvas.

This document describes **structure and control flow**. It does not restate the coding
rules — storage, logging, casing, reads, and ES5.1 live in
[PROJECT_CONVENTIONS.md](../../PROJECT_CONVENTIONS.md). For the field-level contract
(Params keys, endpoint URLs, exit keys, payload shapes) see the companion
[runtime-spec.md](runtime-spec.md). For the per-operation inventory see
[operations-catalog.md](operations-catalog.md).

## The three global libraries (load order 3 → 2 → 1)

The libraries live in
[`projects/rtds-runtime/globalLibraries/active/`](../../projects/rtds-runtime/globalLibraries/active/)
and are loaded by the platform in **reverse-alphabetical filename order**, which is also the
dependency order:

| Order | File | Responsibility |
| ----- | ---- | -------------- |
| 1st (loaded) | `rtds_3_vocallsEnv.js` | Platform/runtime layer, **not** RTDS-specific. Object-access helpers (`getOrDefault`, `getValue`, `hasKey`, `walk`, `getScoped`, `nowUTC`, …), the `Logger` facade (`debug/info/warn/error/API/configure`), and lifecycle hooks `initializeCallFlowContext(mode)` / `storeSessionVariables()`. Everything declared without `var/let/const` lands on the global scope. |
| 2nd | `rtds_2_runtime.js` | The RTDS dispatch engine. Depends on `Logger` + `getValue` from the env library. Owns the registry, flow parsing, and the run loop. |
| 3rd (loaded last) | `rtds_1_globalConfig.js` | Per-project shape file: `DEFAULT_LOGGED_KEYS` and `constVarObj()` (the call-scoped `varObj` schema). Consumed at runtime, not at parse time, so its late load is fine. |

The numeric suffix encodes the order: `rtds_3_…` sorts highest in the `rtds_` family (loaded
first), `rtds_1_…` sorts lowest (loaded last). When editing, preserve this invariant.

## Dispatch model (`rtds_2_runtime.js`)

### Registry

Every operation Type is registered into a single map, `RTDS_REGISTRY`, as one of two kinds:

- **`js`** — a handler that runs **inline**. Under the unified `__rtOutcome` contract it stages
  `__rtParams` (via `setupConfig`) + `__rtOutcome` (a Params key) and returns nothing meaningful
  (`undefined` sync, or its `jsonHttpRequest` thenable async); the engine resolves
  `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`. Registered via
  `registerRtdsOperation(type, handler)`. `setVariables`, `setAttributes`, `sendSms`, `sendMail`
  are JS twins (JS wins the last-write-wins registry); their canvas components stay the lockstep
  reference but are dormant on the live path.
- **`gui`** — a Vocalls component on the canvas, reached via an **exit key**. Registered via
  `registerRtdsExit(type, exitKey)`. The runtime stops and hands the call off to the GUI.

`RTDS_OPERATIONS` (Type → handler) and `RTDS_EXIT_KEYS` (Type → exit key) are kept as
**read-only views** over `RTDS_REGISTRY` for back-compat. Only real handlers are registered;
a Type with no handler yet stays unregistered and `runStep` skips it to its `NextStep` with a
warning (no mock advancers).

### Entry points

```
Entry A — initial call:    return fetchAndStart(RTDS_sourceId)
Entry B — GUI re-entry:     return resumeFrom(RTDS_nextStepId)
Entry C — call finalized:   return finalizeFrom(RTDS_nextStepId || RTDS_currentOpId)
```

Entry C is the platform termination callback (`onCallResult`, in the master-layer
`Code` property). See **Finalization mode** below.

### Control flow

```mermaid
flowchart TD
    A["Entry A: fetchAndStart(sourceId)"] --> F["HTTP GET routing table\n_rtBaseUrl + _rtGetSourceIdEndpoint"]
    F --> P["parseFlow(json)\n→ ordered ops + RTDS_* header bag"]
    P --> RS["runStep(startOpId)"]
    RS --> L{"RTDS_REGISTRY.get(type)?"}
    L -->|"kind: js"| H["handler stages __rtOutcome\n→ engine resolves _rtNextStep"]
    H --> RS
    L -->|"kind: gui"| G["write RTDS_currentOpConfig (params) + RTDS_currentTtsMessages\nreturn exitKey to canvas"]
    L -->|"unregistered"| W["warn + skip to NextStep"]
    W --> RS
    G --> C["Vocalls GUI component runs\nwrites chosen outcome → _rtNextStep"]
    C --> B["Entry B: resumeFrom(RTDS_nextStepId)"]
    B --> RS
```

- **`fetchAndStart(sourceId)`** — fetches the routing table over HTTP
  (`jsonHttpRequest` against `_rtBaseUrl` + `_rtGetSourceIdEndpoint`, with `_headers`), then
  `parseFlow` → `runStep`.
- **`parseFlow(json)`** — turns the routing-table JSON into an ordered op list and writes the
  `RTDS_*` header bag (sourceId, name, project, promptLibrary, supportedLanguages) into the
  session.
- **`runStep(startOpId)`** — the loop. For each op it looks up the registry: a `js` entry runs
  inline — a sync handler (returns `undefined`) is resolved on the spot and the loop continues,
  so a sync-only path hands Vocalls a plain exit-key string; an async handler (returns a
  thenable — the Send* HTTP twins) is chained off, so `runStep` returns a promise. Either way
  the engine resolves `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` after the handler
  settles (the engine is the single resolver, playing the component output-node role); a `gui`
  entry stops the loop. Async handlers are expected only in the finalize tail: the live Vocalls
  engine cannot await a native Promise (it stringifies it to `"[object Promise]"` and the
  dispatch `case` node disconnects), so an async op on the interactive path logs a warn.
- **`resumeFrom(nextStepId)`** — re-entry after a GUI node completes; resumes `runStep` at the
  step the component selected.
- **`getParam(op, name, fallback)`** — case-insensitive Param read on the runtime side
  (mirrors `getValue`/`hasKey` on the component side; see
  [casing](../../conventions/casing.md)).

## JS-inline vs GUI-exit, and `_rtNextStep`

- **JS-inline** operations (e.g. `SetVariables`, `SendSms`, `SendMail`) execute entirely in the
  runtime: they stage `__rtParams` + `__rtOutcome` and the engine resolves `_rtNextStep`; the
  loop never leaves `rtds_2_runtime.js`.
- **GUI-exit** operations hand off via `prepareGuiHandoff`, which writes the whole Params object to
  `RTDS_currentOpConfig` (plus `RTDS_currentOpId/Type`, the per-language `RTDS_currentTtsMessages`
  spoken-text map for prompt-playing components, and a default `RTDS_nextStepId`) and returns a
  Type-specific **exit key** string to Vocalls. The matching canvas target runs — a native Designer
  node (transfer / menu / disconnect / …), or a self-contained v2 component such as `guard_tui`
  ([guardTui.js](../components/guardTui.js)) that reads `RTDS_currentOpConfig` like any other
  component. It writes its chosen outcome Id into the master-layer global **`_rtNextStep`**, and the
  call re-enters through `resumeFrom(RTDS_nextStepId)`. The engine does **not** write per-key
  `RTDS_OP_*` variables.

A GUI component and its JS twin (where both exist) must keep the **same payload + branch
contract** — this is the lockstep rule (see [lockstep](../../conventions/lockstep.md)). Three
twins exist today: `executeSendSms` / `executeSendEmail` / `executeSetVariables` in
`rtds_2_runtime.js` alongside `rtds/components/sendSms.js` / `sendMail.js` / `setVariables.js`.

## Finalization mode (`RTDS_finalizing` + `finalizeFrom`)

When an interaction terminates (caller hangup, drop, error, transfer), the RTDS flow stops
wherever it was. Any operations the routing table placed *after* the caller-facing node —
the call-report `SendEmail` / `SendSMS`, attribute writes, an API call — never run. The
platform termination callback closes that gap.

- **`onCallResult()`** (master-layer `Code` property) fires on every end-of-call path. Guarded
  by `_endFlowSemaphore` (idempotent), it resumes from `RTDS_nextStepId || RTDS_currentOpId`
  (both staged by `prepareGuiHandoff`) via `finalizeFrom` and **returns the resulting task** so
  the platform awaits it.
- **`finalizeFrom(nextStepId)`** sets the **`RTDS_finalizing`** flag, then reuses the normal
  `runStep` engine — there is no separate loop. While the flag is set, `runStep`'s GUI-exit
  branch is **filtered**: instead of `prepareGuiHandoff` + an exit key, it logs
  `[RTDS] finalize: stop at GUI node` and stops. There is no live call leg post-termination, so
  a caller-facing component cannot run and an exit key would route nowhere. Only the JS-inline
  (data) tail runs to completion.
- The flag is **never cleared** — finalization is the terminal mode of the call and the global
  scope is discarded at session end. It defaults `false` for every live call (declared in
  `rtds_2_runtime.js` and the master-layer `Variables`), so live-call dispatch is unaffected.
- When an async JS handler (SendSMS / SendEmail) is in the tail, `runStep` resolves to a
  promise; `onCallResult` returns it, so the platform holds teardown until the terminal POSTs
  complete — reliably, not fire-and-forget.

## The `varObj` store

Call-scoped user data lives on the global **`varObj`**, whose schema is `constVarObj()` in
`rtds_1_globalConfig.js`. `initializeCallFlowContext(mode)` builds a fresh `varObj` once per
call leg.

- **Reads:** `getScoped(key, default)` resolves `varObj` → global → default.
- **Writes:** `setVariable(path, value)` — a bare key targets `varObj`; a dotted path can target
  `globalThis` or a named reachable object, auto-creating intermediates and preserving native
  type. This is what `SetVariables` (and its component twin) uses.

Storage rules (where data belongs, the `_rt*` prefix for new runtime globals) are in
[storage](../../conventions/storage.md).

## Logging

`Logger` (defined in `rtds_3_vocallsEnv.js`) is the only sanctioned logging surface:
`Logger.debug / info / warn / error / API`, each taking a message plus a structured context
object. `DEFAULT_LOGGED_KEYS` (in `rtds_1_globalConfig.js`) lists the `varObj` attributes
auto-included in default log payloads. Never call bare `log_*` outside the Logger
implementation — see [logging](../../conventions/logging.md).

## Required platform globals

`rtds_2_runtime.js` assumes these are provided by `rtds_3_vocallsEnv.js` and the Vocalls
platform: `log_debug`, `log_warn`, `log_error`, `jsonHttpRequest`, `_headers`, `_rtBaseUrl`,
`_rtGetSourceIdEndpoint`.

## ES5.1 sandbox

All runtime and component code runs in the Vocalls ES5.1 sandbox: no `let`/`const`/arrow/
async/spread/destructuring and no string-eval (`new Function`). Template literals are allowed.
See [es5](../../conventions/es5.md).
