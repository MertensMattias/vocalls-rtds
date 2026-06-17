---
status: partial
catalog:
  operation: "flowJump"
  legacy: false
  pattern: "`flow_jump`"
  component: "flowJump.js"
  componentMark: "✅"
  runtimeCell: "⬜ twin `executeFlowJump` deferred (cross-flow re-fetch)"
  seed: "⬜ `operationId` / `nextStep_Failure` deferred"
---

# Operation Spec — flowJump (FlowJump)

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Operation Type | `flowJump`                                                         |
| Component name | `flowJump`                                                         |
| Pattern        | `flow_jump`                                                        |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_FlowJump.xml`               |
| Target files   | `rtds/components/flowJump.js` (canvas reference, **ships now**) + `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` (`executeFlowJump`, **deferred**) |

> **Status — partial (this session ships the component + spec only).** The canvas
> component and this spec are authored now; the runtime twin `executeFlowJump`, its
> contract test, and the `db_seed` Param additions are **deferred** (see
> [Deferred work](#deferred-work)). Until the twin lands, `flowJump` stays an
> unregistered Type — `runStep` skips it to its `nextStep` with a warning, so
> shipping the reference component ahead of the twin is harmless.

## Business purpose

**Swap the active routing table to a different flow.** `flowJump` is the one Type
that does not branch *within* the current flow — it replaces the running flow's
`SourceId` with a different one, re-fetches that flow's routing table, and lands the
caller on the target flow's first operation (or an explicitly named `operationId`).
This is how a call is handed from one routing graph to another mid-session — e.g.
overflow from a line-specific flow into a shared after-hours flow, or a menu choice
that delegates to a wholly separate sub-flow.

It mirrors the PureConnect handler `NAllo_RTDS_FlowJump.xml`: that handler reads a
target `SourceId`; when an `OperationId` is present it lands on that step, otherwise
it looks up the target flow's `FirstOperationID`; then it re-seeds the call's
`RTDS_Path` / `RTDS_ProjectId` / `RTDS_ProjectName` / `RTDS_PromptLibrary` /
`RTDS_SupportedLanguages` from the **target** flow's directory-service attributes.
The runtime analogue of that RTDS_* re-seeding is `parseFlow` overwriting
`RTDS_opIndex` + the `RTDS_*` flow vars when the new table is parsed.

### Why the existing skeleton is wrong

The bundled `operation_bodies/flow_jump.md` skeleton mutates
`context.session.variables.RTDS_sourceId` and clears `RTDS_currentOpId`, then
returns. **That is a no-op against the current runtime.** `runStep`
([rtds_2_runtime.js:517](../../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js))
loops the **in-memory** `RTDS_opIndex` Map and resolves every next step from it; it
never re-reads `RTDS_sourceId` to re-fetch a different flow. Only `fetchAndStart`
([rtds_2_runtime.js:840](../../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js))
fetches + parses a table. The skeleton also defaults `active` to `false`, against the
universal `active: true` convention. The real mechanism is the re-fetch described in
[Runtime-twin contract](#runtime-twin-contract).

### Inputs (Params)

| Param name         | Type    | Required | Default | Description                                                                                                   |
| ------------------ | ------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `active`           | boolean | no       | `true`  | Boolean `true`/`false` only. Runs unless explicitly `active: false` — the universal convention across all operations. |
| `sourceId`         | string  | **yes**  | —       | Target flow's `SourceId` to swap to. The flow whose routing table is re-fetched.                              |
| `operationId`      | string  | no       | `''`    | Explicit landing step Id **in the target flow**. Empty → land on the target's first operation (`FirstOperationID` parity). |
| `nextStep_Failure` | string  | no       | —       | Local landing step **in the current flow** when the jump can't proceed (missing `sourceId`, fetch/parse failure, no entry op in target). |
| `nextStep`         | string  | yes      | —       | Default key (ordered **last**). Taken when **inactive** — a did-nothing skip that stays in the current flow.    |

### Outputs

| Branch key         | Taken when                                                        | Fallback |
| ------------------ | ---------------------------------------------------------------- | -------- |
| `nextStep`         | Inactive skip; **also** staged by the canvas component on a valid jump (success leaves to the target flow, so there is no local success id to resolve). | `''`     |
| `nextStep_Failure` | Missing `sourceId`; (twin) target fetch/parse failure or no entry op. | `''`     |

**There is no `nextStep_Success`.** On a successful cross-flow jump, control transfers
to the target flow's entry op — an Id in a *different* `opIndex`, not a local Params
key. A local `nextStep_Success` would resolve to `''` / a stale step. "Success" is
expressed entirely in the [runtime-twin contract](#runtime-twin-contract) (the twin
returns `{ nextStepId: <target landing id> }` after re-pointing `RTDS_opIndex`), not
as a local branch key.

The canvas component stages `__rtOutcome` in the work body and resolves it **once** at
the output node — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` — with an
empty-string fallback (the shipped v2 contract,
[conventions/component-v2.md](../../conventions/component-v2.md) §8).

## Component structure — `flowJump.js`

Standard v2 four-node shape (input `id=0` → init `id=7` → work `id=29` → output
`id=6`, geometry per [component-v2.md](../../conventions/component-v2.md) §1) with
three bare orthogonal edges. It differs from `sendSms` only in master `Variables`
(the Params set + `__rtEndpoint = _rtGetSourceIdEndpoint`) and the work body. There
is **no HTTP call and no `RTDS_sourceId` mutation in the canvas component** — the
component validates the jump and stages an outcome; the live re-fetch is the twin's
job (same lockstep-reference pattern as `sendSms` / `setVariables`, whose JS twins are
the live path while their canvas components remain the reference).

**Master `Variables`** (the Params as `__configJSON`, plus the endpoint the twin
re-fetches from, carried for documentation/lockstep):

```js
__configJSON = {
    "active": true,
    "sourceId": "${rtFlowJumpSourceId}",
    "operationId": "",
    "nextStep_Failure": "00099",
    "nextStep": "00012"
};
__environment = environment;
__rtBaseUrl   = _rtBaseUrl;
__rtEndpoint  = _rtGetSourceIdEndpoint;
__rtOutcome   = 'nextStep_Failure';
__rtNextStep &= _rtNextStep;
```

**`init` (`id=7`)** — universal four lines; seeds the did-nothing default:

```js
__rtOutcome = 'nextStep';
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[flowJump] config resolved', { params: __rtParams, outcome: __rtOutcome });
```

**`script` (`id=29`)** — validate, stage outcome, log the jump intent:

```js
if (String(__getValue(__rtParams, 'active', true)).toLowerCase() !== 'true') {
    Logger.info('[flowJump] skipped -- inactive', { outcome: __rtOutcome });
    return;
}

var __targetSourceId = __getValue(__rtParams, 'sourceId', '');
if (!__targetSourceId) {
    __rtOutcome = 'nextStep_Failure';
    Logger.warn('[flowJump] missing sourceId', { outcome: __rtOutcome });
    return;
}

var __operationId = __getValue(__rtParams, 'operationId', '');

// Cross-flow jump intent. The runtime twin (executeFlowJump) does the actual
// re-fetch + re-parse and continues runStep in the new flow. This component is
// the lockstep reference: it validates and stages a locally-resolvable outcome.
// Success leaves this flow, so there is no local success step -- stage 'nextStep'.
__rtOutcome = 'nextStep';
Logger.info('[flowJump] jump', {
    sourceId: __targetSourceId,
    operationId: __operationId || '(firstOperation)',
    outcome: __rtOutcome
});
```

**`output` (`id=6`, `OnEnter`)** — single resolution point:

```js
_rtNextStep = getValue(__rtParams, __rtOutcome, '');
Logger.info('[flowJump] exit', { outcome: __rtOutcome, nextStep: _rtNextStep });
```

The component conforms to the v2 §7/§8 `__rtOutcome` staging contract: init seeds
`'nextStep'`, the missing-`sourceId` guard pivots to `'nextStep_Failure'`, the valid
path stages `'nextStep'`, and the output node resolves once. It never writes
`_rtNextStep` mid-flight and never mutates `RTDS_sourceId` / `RTDS_currentOpId`.

## External call

| Aspect    | Value                                                                          |
| --------- | ------------------------------------------------------------------------------ |
| Base URL  | `_rtBaseUrl` → `__rtBaseUrl`                                                    |
| Endpoint  | `_rtGetSourceIdEndpoint` → `__rtEndpoint`                                       |
| Method    | `GET`                                                                           |
| URL       | `_rtBaseUrl + _rtGetSourceIdEndpoint + '?sourceId=' + encodeURIComponent(sourceId)` |

This is the **same fetch `fetchAndStart` uses** (including the `_devBody` dev-fixture
short-circuit). The canvas component carries the endpoint binding for lockstep, but
the **twin** performs the fetch.

## Runtime-twin contract

> Authoritative for the deferred `executeFlowJump`. Implement against this.

`executeFlowJump(op)` is registered with
`registerRtdsOperation('flowJump', executeFlowJump)` near the other JS twins
([rtds_2_runtime.js:1251](../../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js)),
and is removed from the "not implemented" block
([rtds_2_runtime.js:958](../../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js)).
Because the re-fetch is async (`jsonHttpRequest`), it returns a **thenable**; the
`runStep` JS branch already supports that — it does
`result.then(function (resolved) { return runStep(String(resolved.nextStepId)); })`
([rtds_2_runtime.js:594-624](../../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js)).

Steps:

1. `rtParams = setupConfig(op.params)` (init-node twin: same shared config contract).
2. **Inactive** (`getValue(rtParams, "active", true)` false) → resolve synchronously
   `{ nextStepId: getValue(rtParams, "nextStep", -1) }`. (Stay in the current flow.)
3. Empty `sourceId` → `Logger.warn`, set `RTDS_error`, return
   `{ nextStepId: getValue(rtParams, "nextStep_Failure", -1) }`.
4. Read `operationId = getValue(rtParams, "operationId", "")`.
5. **Re-fetch + re-parse** the target table via the `fetchAndStart` fetch path
   (honouring `_devBody`), then `parseFlow(targetBody)` — which **replaces**
   `RTDS_opIndex` and the `RTDS_*` flow vars with the target's (runtime analogue of
   the PureConnect RTDS_* re-seeding).
6. Landing id = `operationId` when non-empty, else the entry op returned by
   `parseFlow` / `getFirstOperation`.
7. Resolve `{ nextStepId: <landing id> }` so `runStep` continues **in the new index**.
   On fetch/parse failure or no entry op → set `RTDS_error` (as `fetchAndStart` does)
   and resolve `{ nextStepId: getValue(rtParams, "nextStep_Failure", -1) }`.

**Contrast with `fetchAndStart`.** `fetchAndStart` ends `return runStep(firstOp.id)`
because it is the top-level entry point. `executeFlowJump` must **not** call `runStep`
itself — it resolves `{ nextStepId }` and lets the existing `runStep` `.then` drive
the next hop (calling `runStep` here would double-drive the loop). To keep both paths
in lockstep, **extract a shared `fetchAndParse(sourceId) -> thenable<firstOp>`** from
`fetchAndStart` and have both call it.

The twin falls back to `-1` (runtime numeric sentinel) where the canvas component
falls back to `''` at its output node — these differ by design (runtime return vs
string store), not drift, exactly as documented for the other twins.

## Deferred work

1. **Twin** — implement `executeFlowJump(op)` in `rtds_2_runtime.js` per
   [Runtime-twin contract](#runtime-twin-contract) (thenable; re-fetch + re-parse;
   resolve `{ nextStepId }`); remove `FlowJump` from the not-implemented block.
2. **Registration** — `registerRtdsOperation('flowJump', executeFlowJump)`.
3. **Refactor** — extract `fetchAndParse(sourceId)` from `fetchAndStart` so the entry
   point and the twin share one fetch/parse path.
4. **Contract test** — `projects/rtds-runtime/tests/components/flowJump.test.js`,
   mirroring the `sendSms` / `setVariables` twin tests: inactive → `nextStep`;
   missing `sourceId` → `nextStep_Failure`; valid jump with a `_devBody` fixture
   re-points `RTDS_opIndex` and lands on the target first-op (no `operationId`) and on
   an explicit `operationId`.
5. **db_seed** — extend the `flowJump` block in
   `rtds/db_seed/import_seeds_camelCase.sql` (currently only `active` + `sourceId`):
   add `operationId` (string, optional), `nextStep_Failure` (string, optional,
   nextStep-flag), `nextStep` (string, required, last). New Param names need matching
   `Dic_Attribute` rows or the import's `UNKNOWN_PARAM` check throws `54016`.
6. **Catalog** — add `"flowJump"` to `ROW_ORDER` in `scripts/gen_catalog.py`, then
   `npm run gen:catalog`; flip `runtimeCell` / `seed` / `status` in this frontmatter
   when the twin + seed land; verify with `npm run check:lockstep`.
7. **Skill bundle** — if `flowJump.js` becomes canonical, `npm run build:skill`, and
   correct `operation_bodies/flow_jump.md` to the twin-driven shape (it currently
   teaches the dead `RTDS_sourceId` mutation and `active: false`).

## Notes

- **Lockstep** ([conventions/lockstep.md](../../conventions/lockstep.md)): once the
  twin lands, `executeFlowJump` and `flowJump.js` must keep an identical Param set and
  branch contract. Until then the component is reference-only.
- **`active` default `true`** ([params](../specs/setVariables.spec.md)): both paths
  default `true`; only `active: false` skips.
- **Casing**: envelope keys camelCase; Param names read case-insensitively via
  `getValue` ([conventions/casing.md](../../conventions/casing.md)).
