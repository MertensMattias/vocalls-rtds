# Unified `__rtOutcome` contract for JS handlers

**Date:** 2026-06-10
**Status:** Design approved — ready for implementation plan
**Area:** RTDS runtime engine (`rtds_2_runtime.js`, `rtds_3_vocallsEnv.js`), JS operation twins, finalize path
**Supersedes:** [2026-06-10-rtds-finalize-outcome-resolution-design.md](2026-06-10-rtds-finalize-outcome-resolution-design.md) and its plan [../plans/2026-06-10-rtds-finalize-outcome-resolution.md](../plans/2026-06-10-rtds-finalize-outcome-resolution.md). Finalize-path coverage falls out of this contract for free, so the narrower change is no longer implemented on its own.

## Motivation (two intertwined, both explicit)

1. **Close the finalize gap.** When a caller hangs up mid-operation, the end-of-call data tail must resume from the in-flight op's actual outcome. This already works when the in-flight op is a **GUI component** (it stages `__rtParams`/`__rtOutcome`, which `finalizeFrom` re-resolves). It does **not** work when the in-flight op is a **JS handler**, because JS twins never stage those globals — they return `{ nextStepId }` and track nothing. So finalize is blind to JS-handler interruptions, and the narrower finalize fix even risked reading a *stale* prior component's `__rtOutcome`.
2. **One contract for both kinds.** The `__rtParams`/`__rtOutcome` → `_rtNextStep` resolution mechanism was never wrong — it was only applied on the GUI side. Making JS twins speak the identical contract removes the asymmetry at its root: both kinds leave identical state, so finalize needs **zero per-kind logic** and the stale-global hazard disappears. This also deepens the existing `conventions/lockstep.md` rule (twin ↔ component share one contract) to cover outcome/resolution, not just params.

The minimum bug-fix would be "JS handlers stage `__rtParams`/`__rtOutcome`." The full scope below (twins mirror component bodies, shared helpers, engine-as-resolver) is the deliberate consistency investment chosen on top — recorded here so the "why this much" is on the record.

## The unified contract

Every operation — GUI component or JS twin — produces its next step the same way:

- **init-equivalent:** `__rtParams = setupConfig(<config>)`; seed `__rtOutcome = 'nextStep'` (the did-nothing default).
- **work-equivalent:** run validation / payload / branch logic; stage `__rtOutcome = '<key>'` where `<key>` is a literal Params key name (`'nextStep'`, `'nextStep_Success'`, `'nextStep_Failure'`, …).
- **output-equivalent (the single resolver):** `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`.
  - For a **GUI component**, this runs in its own output node (unchanged).
  - For a **JS twin**, the **engine** runs it once, after the handler settles. The engine plays the component's output-node role.

JS twins therefore **return nothing meaningful** — sync twins return `undefined`, async twins return their `jsonHttpRequest(...).then(...)` thenable. They communicate **only** through staged `__rtParams` + `__rtOutcome`. The engine stops reading `result.nextStepId` entirely.

**The return value is used solely for sync-vs-async timing, never for routing.** `Promise.resolve(handler(op))` turns `undefined` (sync) and the thenable (async) into one awaitable; the engine reads the next step from the staged `__rtOutcome` after it settles, *not* from what the handler returned. A sync twin returning `undefined` is correct and complete — `__rtOutcome` is the channel.

## Components & responsibilities

### (a) Shared engine helpers — `rtds_3_vocallsEnv.js` (NEW functions, approved)

- **`setupConfig(config)`** — engine twin of the component `__setupConfig`. Extracts params (JSON string / `{ params }` wrapper / flat object / null→{}), unwraps array-form `[value, ...flags]` → `[0]`, coerces `active` via the global `activeFlag`, trims + token-resolves string values, leaves non-strings typed. Returns a flat resolved `{ key: value }` map. Produces a `__rtParams` byte-equivalent to the component path for the same input.
- **`walk(obj, fn)`** — iterate own properties calling `fn(key, value)`; return `false` from `fn` to stop. Identical to the component inline `walk`.

These become the single shared implementation the twins use. **Components keep their inline copies** (their `typeof X === 'undefined'` fallback guards already defer to a global when present); component de-duplication is a **future follow-up**, out of scope here.

### (b) The three twins — `rtds_2_runtime.js`

Rewritten to mirror their components body-for-body, using the latest component code as the source of truth:

- **`executeSetVariables`** (ref [setVariables.js](../../rtds/components/setVariables.js)): build `__rtParams = setupConfig(op.params)`; seed `__rtOutcome='nextStep'`; if `!activeFlag(getValue(__rtParams,'active',false))` → log skip, return (outcome stays `'nextStep'`); else `walk(__rtParams, ...)` skipping control keys `{ active:1, nextstep:1 }`, `setVariable(key,value)` each; outcome stays `'nextStep'`. Sync — returns `undefined`. Active defaults **false**.
- **`executeSendSms`** (ref [sendSms.js](../../rtds/components/sendSms.js)): seed `'nextStep'`; inactive check `!activeFlag(getValue(__rtParams,'active',false))` → return; invalid `to` (`!isMobileNumber`) → return (stays `'nextStep'`); pivot `__rtOutcome='nextStep_Failure'` before the POST; in `.then` success → `'nextStep_Success'`, gateway-fail/reject → stays `'nextStep_Failure'`. Async — returns the thenable. Active defaults **false**.
- **`executeSendEmail`** (ref [sendMail.js](../../rtds/components/sendMail.js)): same shape as sendSms — seed `'nextStep'`; inactive check `!activeFlag(getValue(__rtParams,'active',false))` → return; precondition (missing From/To) → return; pivot `'nextStep_Failure'` before POST; `.then` success → `'nextStep_Success'`. Async — returns the thenable. Active defaults **false**.

**Active default — uniform `false` across all three twins** (requester decision: "nothing runs unless explicitly active"). `sendSms`/`sendMail` already default `false`, so those mirror their components. **`setVariables` diverges from its component**, which defaults Active **true** (`getValue(__rtParams,'active',true)`) because SetVariables historically always wrote. Under this decision the twin defaults **false**: a `SetVariables` op whose config has **no `Active` key** now **skips (writes nothing)** on the JS path. The dev routing table sets `"active": true` explicitly so that flow is unaffected, but any real config relying on the implicit-true default would silently stop writing. This is a **deliberate behavior change**, recorded so it is not mistaken for drift; `conventions/lockstep.md` param-parity still holds (param *names* match), and the Active-default value is owned by the twin.

Twins use the shared `setupConfig`/`walk`/`getValue`/`activeFlag` — no `resolveNextStep`, no `{ nextStepId }` return, no inline token-resolution loop.

### (c) Engine JS branch — `rtds_2_runtime.js` `runStep`

Replace the current sync/async split + `result.nextStepId` read with a single normalized path:

1. `var task = Promise.resolve(handler(current));` (uniform for sync + async; keep the existing `try/catch` around the call as a backstop).
2. `.then` (and reject arm): run `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`; if truthy, `runStep(String(_rtNextStep), remaining)`; else end-of-flow → `'disconnect'`. Reject arm sets `RTDS_error` and returns `'disconnect'` (as today).

`runStep` thus becomes uniformly async for JS ops (sync ops gain one microtask hop — negligible). The promise chain still propagates up through `finalizeFrom`/`onCallResult`, preserving the platform-await contract for terminal POSTs.

### (d) `finalizeFrom` — `rtds_2_runtime.js`

Uses the same `getValue(__rtParams, __rtOutcome, '')`. **No per-kind logic.** Because every in-flight op (GUI or JS) now leaves `__rtParams`/`__rtOutcome` for the op that was actually running, a call interruption is recovered uniformly. The narrower design's "finalize re-resolves" special-casing and its stale-global hazard are both gone.

## Data flow

**Live (one JS op):** `runStep` → `Promise.resolve(handler(op))` → handler builds `__rtParams`, seeds + stages `__rtOutcome` → engine `.then`: `_rtNextStep = getValue(__rtParams,__rtOutcome,'')` → advance (or end-of-flow on `''`).

**Interruption:** in-flight op already staged `__rtParams` + current `__rtOutcome` (async: the pre-POST `'nextStep_Failure'`). `onCallResult` → `finalizeFrom` → same resolution → resume. Mid-POST drop resolves the failure default → **never re-fires the send (at-most-once)**. Identical for GUI and JS.

## Error handling (mirrors the component contract)

- **Inactive (`Active` resolves false) / validation fail:** stage `'nextStep'` (skip) or `'nextStep_Failure'`, return. No throw. (`Active` defaults `false` on all three twins, so the skip path is taken unless config sets a truthy `Active`.)
- **Async HTTP reject:** handler `.then(onOk, onErr)` error arm leaves `'nextStep_Failure'`. Engine keeps `try/catch` + promise-reject backstop → `RTDS_error` + `'disconnect'`.
- **Resolution miss:** outcome key absent in `__rtParams` → `getValue` returns `''` → engine treats as end-of-flow (same as a component resolving to `''`).

## Registration — all three twins dispatch as JS (requester decision)

`RTDS_REGISTRY` is a `Map` keyed by Type, **last-write-wins**: `registerRtdsOperation(type,…)` sets `{ kind:'js' }` and deletes any exit view; `registerRtdsExit(type,…)` sets `{ kind:'gui' }` and deletes any JS view. A Type is therefore **either** JS **or** GUI at dispatch, never both.

`setVariables`, `sendSms`, and `sendMail` are to dispatch as **JS handlers** (inline twins win). Concretely, in the registration block at the bottom of `rtds_2_runtime.js`:

- Ensure `registerRtdsOperation('setVariables', executeSetVariables)`, `registerRtdsOperation('sendSms', executeSendSms)`, `registerRtdsOperation('sendMail', executeSendEmail)` are present and run **after** (or instead of) the competing `registerRtdsExit('setVariables'|'sendSms'|'sendMail', …)` lines. Cleanest is to **remove** those three exit registrations so there is no silently-overridden line.
- **Check `setAttributes`:** it currently maps to the `set_variables` exit (`registerRtdsExit('setAttributes','set_variables')`). Decide during implementation whether `setAttributes` also becomes a JS op (`registerRtdsOperation('setAttributes', executeSetVariables)`) or stays a GUI exit — do not orphan it. (It shares the `executeSetVariables` handler, so JS-registering it is the consistent choice.)

**Behavioral consequences (intended):**
- On **live calls**, these Types execute inline in `runStep`; their canvas components (`rtds/components/setVariables.js`, `sendSms.js`, `sendMail.js`) are no longer reached for these Types. The components remain the lockstep reference but become dormant on the live path.
- On the **finalize path**, these ops now **run** (JS handlers are not filtered; only GUI exits are). This is what makes the call-report SMS/email actually send on call interruption — the original finalize gap closes here, not via special-casing.
- Because `sendSms`/`sendMail` now run on the **live** path (not just the finalize tail), their twins are load-bearing for real calls; the "mirror the component exactly" conversion and its tests are correctness-critical, not latent.

## Testing

- **Twin contract tests** (`tests/components/setVariables.test.js`, `sendSms.test.js`, new `sendMail.test.js`): each twin stages the correct `__rtOutcome` per branch; engine resolves `_rtNextStep` to the matching `op.params` step id. Re-point existing assertions from `out.nextStepId` to staged `__rtOutcome` / resolved `_rtNextStep`.
- **Shared-helper tests:** `setupConfig` output byte-equivalent to the component `__setupConfig` for the same input (array unwrap, `active` coercion, token resolution); `walk` iteration + early-stop.
- **Engine JS-branch test:** a sync twin and an async twin both resolve via `getValue(__rtParams,__rtOutcome,'')`; async returns a promise `runStep` awaits.
- **Finalize tests** (`finalize.test.js`): GUI-op and JS-op interruptions both recover via the same resolution; the old stale-global case is moot.
- **Regression:** full `npm run check` (`check:sync`, `check:lockstep` param parity, all suites).

## Migration & lockstep

- Engine change → update `rtds/docs/runtime-architecture.md`, `rtds/docs/runtime-spec.md`.
- Extend `conventions/lockstep.md`: twin ↔ component parity now covers **outcome/resolution** (stage `__rtOutcome`, engine resolves), not just params.
- Rewrite `conventions/component-v2.md` §8 finalize subsection: replace "finalize re-resolves" framing with "the engine is the single resolver for JS ops; GUI and JS leave identical state."
- `npm run build:skill` to resync the generated bundle.
- Mark the two superseded docs as superseded (header note) and reconcile.

## Out of scope

- **De-duplicating component inline helpers** against the new engine `setupConfig`/`walk` (future follow-up; the fallback guards already permit it).
- Renaming `__rtOutcome` → `_rtOutcome` (considered earlier; not adopted).

(Note: registering `sendSms`/`sendMail` as JS handlers was previously out of scope; it is now **in scope** — see the Registration section above.)

## Open question for implementation

If, while mirroring a component body, a simplification appears that would apply to **both** the twin and the component, surface it for a decision rather than applying it (standing instruction from the requester). Likewise, any **new** helper beyond `setupConfig`/`walk` must be asked about first.
