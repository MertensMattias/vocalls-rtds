---
status: spec-only
catalog:
  operation: "internalTransfer"
  legacy: false
  pattern: "composite (`redirect` primitive)"
  component: "internalTransfer.js"
  componentMark: "✅"
  runtimeCell: "⬜ not registered"
  seed: "⬜"
---

# Operation Spec — internalTransfer (InternalTransfer)

| Field          | Value                                                              |
| -------------- | ----------------------------------------------------------------- |
| Operation Type | `internalTransfer`                                                |
| Component name | `internalTransfer`                                                |
| Pattern        | composite — native `redirect` primitive (linear-with-failure-branch) |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_WorkgroupTransfer.xml` (reframed: workgroup → internal target) |
| Target file    | `rtds/components/internalTransfer.js` (planned)                   |

## Business purpose

Transfer the caller to an **internal destination** — an agent, extension, or internal route inside the contact centre. This is the modern replacement for the legacy workgroup transfer: there is **no** ACD-queue / skills / priority logic, just a direct internal hand-off. On success the caller's leg is handed off and the flow ends; when the destination does not accept the call the flow continues to a fallback step. The destination usually comes from the value [`checkSchedule`](scheduler.spec.md) stashed on `schedulerInternalNumber`, but any operator-supplied internal target works.

### Inputs (Params)

| Param name        | Type             | Required | Default                          | Description                                                                                  |
| ----------------- | ---------------- | -------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| `active`          | boolean          | yes      | `true`                           | If falsy, the operation logs a skip and exits to `nextStep` without transferring. Read with a `true` fallback. |
| `target`          | string           | yes      | `${schedulerInternalNumber}` | The internal destination (extension / agent / internal route). Defaults to the value stashed by `checkSchedule`; `${name}` is resolved at init by `__setupConfig`. |
| `parameters`      | string           | no       | —                                | Semicolon-delimited SIP headers / transfer data attached to the internal leg, e.g. `X-Context:{headerContext};X-Clir:true;`. Feeds the `redirect` primitive's `Parameters` attribute (alongside any `line:`-route endpoint header); `{name}` tokens are resolved by the runtime at transfer time, literals pass through. |
| `attendTransfer`  | boolean          | no       | `false`                          | Transfer style: `false` (default) = blind, `true` = attended. The style is a **fixed node setting** (not variable-driven), so the component holds two `redirect` nodes and the `case` routes to the one matching this flag. |
| `timeout`         | number (s)       | no       | `30`                             | No-answer timeout for the internal attempt.                                                  |
| `nextStep_Failure`| string (step ID) | yes      | —                                | Continuation when the transfer is not accepted (unavailable / no answer / failed).           |
| `nextStep`        | string (step ID) | yes      | —                                | Continuation when the operation is inactive or the target is empty (caller **not** transferred). **Last key in the Params array.** |

### Outputs

| Branch key         | Taken when                                                              | Fallback |
| ------------------ | ---------------------------------------------------------------------- | -------- |
| `nextStep`         | Operation inactive, or `target` resolves empty — caller not transferred. | `''`     |
| `nextStep_Failure` | The transfer was not accepted (agent unavailable / no answer / failure). | `''`     |

On a **successful** transfer the caller leg is handed off and terminates — no continuation branch. The component stages the chosen key into `__rtOutcome` and resolves it **once** at the output node — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`, empty-string fallback ([conventions/component-v2.md](../../conventions/component-v2.md) §7–§8). It never writes `_rtNextStep` mid-flight.

### Transfer (redirect primitive)

A native Vocalls telephony action via a `redirect` primitive — no HTTP call. Two plausible addressing shapes (confirm — see [Open questions](#open-questions)):

| Field          | Value                                                                                   |
| -------------- | --------------------------------------------------------------------------------------- |
| `Destination`  | `__transferDest` — a **bare** global name (not `${...}`); the engine reads the named global at transfer time (mirrors [guardRouting.v2.js](../components/guardRouting.v2.js) `Destination="__currentGuardPhone"`). The resolved value can be a bare extension/number **or** a `line:<route>` literal — an operator who needs a line route sets the `target` Param to `line:<route>` and carries the endpoint header in `parameters` (e.g. `X-Vocalls-Party2-Endpoint:{ext}`). So the component does not branch on addressing shape; `target` decides it. |
| `Parameters`   | the resolved `parameters` Param — semicolon-delimited `Header:value;` pairs (SIP headers / transfer data, e.g. `X-Context:{headerContext};X-Clir:true;`), combined with any `line:`-route endpoint header; `{name}` tokens resolved by the engine at transfer time |
| `TransferType` | selected by `attendTransfer` — the component holds **two** `redirect` nodes (`blind` / `attend`) and the `case` routes to the matching one (the setting is per-node, not variable-driven) |
| Success        | caller leg terminates (no outbound edge)                                                 |
| Not accepted   | the `default` branch routes to `output`, which resolves `nextStep_Failure`               |

### Component structure

Composite — the four-node trunk with a `case` that picks the transfer style (or skips), feeding one of **two** `redirect` primitives (blind / attend) before the output node (identical shape to [externalTransfer.spec.md](externalTransfer.spec.md), only the destination semantics differ).

```
input → init → script → case ┬ [__doTransfer && __attendTransfer] → redirect:attend ┐
                             ├ [__doTransfer]                      → redirect:blind  ┤ success → leg ends
                             └ [default / skip] ───────────────────────────────────→ output
                               each redirect's "not accepted" branch ──────────────→ output
```

`init` — seed `__rtOutcome = 'nextStep'`, `__doTransfer = false`, `__attendTransfer = false`, `__transferDest = ''`, `__transferParams = ''`, then `__setupConfig`.

`script` (work body) — active gate, resolve `target` into `__transferDest`, `parameters` into `__transferParams`, and `attendTransfer` into `__attendTransfer`; if inactive, empty, or still carrying an unresolved `${...}` token leave `__rtOutcome = 'nextStep'` and return; otherwise stage `__rtOutcome = 'nextStep_Failure'` and set `__doTransfer = true`. Work-node logs carry `{ outcome: __rtOutcome }`.

`case` — `__doTransfer && __attendTransfer` → `redirect:attend`; `__doTransfer` → `redirect:blind`; `default` → `output`. Both `redirect` nodes share `Destination="__transferDest"` (bare global name) and `Parameters="{__transferParams}"`, differing only in their fixed `TransferType` (`attend` vs `blind`); success terminates the leg, each not-accepted branch → `output`, which resolves the staged outcome once (`{ outcome, nextStep }`).

### Open questions

- **Internal addressing.** Resolved by deferring to the operator: `Destination="__transferDest"` carries whatever `target` resolves to — a bare extension/number, or a `line:<route>` literal with the endpoint header in `parameters`. The component does **not** hard-code either shape. Confirm this is the intended contract (vs. the component always forcing a `line:` route).
- **Dropped workgroup behaviour.** The legacy `NAllo_RTDS_WorkgroupTransfer` did skills validation, ACD priority, queue-timeout, and DTMF escape-key handling — all **out of scope** here per the "no workgroups" decision. Confirm `internalTransfer` is a plain internal redirect with none of that.
- **Attend-mode node attributes** — `attendTransfer: true` routes to the `redirect` node carrying `TransferType="attend"` (✅ confirmed from [guardRouting.v2.js](../components/guardRouting.v2.js):947); the blind node uses `TransferType="blind"` (assumed counterpart — confirm spelling). Extra attend-mode settings (consultation leg, retrieve-on-no-answer) are not yet modelled.
- **Not-accepted granularity** — the `redirect` primitive exposes a single not-accepted branch; confirm collapsing all internal failure modes into `nextStep_Failure` is acceptable.

### Build note

Component **built** at [`rtds/components/internalTransfer.js`](../components/internalTransfer.js) — same composite `redirect` graph as [externalTransfer](externalTransfer.spec.md), differing only in the destination Param (`target` ← `${schedulerInternalNumber}`) and the dropped `outboundAni`. Catalogued — `componentMark: ✅` with a `ROW_ORDER` entry in `scripts/gen_catalog.py`. **Still ⬜:** runtime twin (not registered — `runStep` skips straight to `nextStep`), a component contract test under `projects/rtds-runtime/tests/components/`, and seed dictionary/instance SQL in `rtds/db_seed/`.
