---
status: spec-only
catalog:
  operation: "internalTransfer"
  legacy: false
  pattern: "composite (`redirect` primitive)"
  component: "internalTransfer.js"
  componentMark: "⏳"
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

Transfer the caller to an **internal destination** — an agent, extension, or internal route inside the contact centre. This is the modern replacement for the legacy workgroup transfer: there is **no** ACD-queue / skills / priority logic, just a direct internal hand-off. On success the caller's leg is handed off and the flow ends; when the destination does not accept the call the flow continues to a fallback step. The destination usually comes from the value [`checkSchedule`](scheduler.spec.md) stashed on `RTDS_SchedulerInternalNumber`, but any operator-supplied internal target works.

### Inputs (Params)

| Param name        | Type             | Required | Default                          | Description                                                                                  |
| ----------------- | ---------------- | -------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| `active`          | boolean          | yes      | `true`                           | If falsy, the operation logs a skip and exits to `nextStep` without transferring. Read with a `true` fallback. |
| `target`          | string           | yes      | `${RTDS_SchedulerInternalNumber}` | The internal destination (extension / agent / internal route). Defaults to the value stashed by `checkSchedule`; `${name}` is resolved at init by `__setupConfig`. |
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
| `Destination`  | the internal target directly (`${__transferDest}`), **or** a `line:` route with the endpoint passed in `Parameters` (`X-Vocalls-Party2-Endpoint:{__transferDest}`), per the [guardRouting.v2.js](../components/guardRouting.v2.js) precedent |
| `TransferType` | `attend` (internal attended hand-off; confirm)                                          |
| Success        | caller leg terminates (no outbound edge)                                                 |
| Not accepted   | the `default` branch routes to `output`, which resolves `nextStep_Failure`               |

### Component structure

Composite — the four-node trunk with a `case` guard and a `redirect` primitive between the work script and the output node (identical shape to [externalTransfer.spec.md](externalTransfer.spec.md), only the destination semantics differ).

```
input(0) → init(7) → script(29) → case ─[__doTransfer]→ redirect ─[not accepted]→ output(6)
                                       └─[default: skip]──────────────────────────→ output(6)
                                                          (success → leg terminates)
```

`init` — seed `__rtOutcome = 'nextStep'`, `__doTransfer = false`, `__transferDest = ''`, then `__setupConfig`.

`script` (work body) — active gate, resolve `target` into `__transferDest`; if inactive or empty leave `__rtOutcome = 'nextStep'` and return; otherwise stage `__rtOutcome = 'nextStep_Failure'` and set `__doTransfer = true`. Work-node logs carry `{ outcome: __rtOutcome }`.

`case` → `redirect` → `output` resolves the staged outcome once (`{ outcome, nextStep }`).

### Open questions

- **Internal addressing.** Is the internal destination a bare extension/number on `Destination`, or a `line:<route>` with the endpoint in `redirect.Parameters` (as [guardRouting.v2.js](../components/guardRouting.v2.js) does for its guard transfer)? This drives the `redirect` shape.
- **Dropped workgroup behaviour.** The legacy `NAllo_RTDS_WorkgroupTransfer` did skills validation, ACD priority, queue-timeout, and DTMF escape-key handling — all **out of scope** here per the "no workgroups" decision. Confirm `internalTransfer` is a plain internal redirect with none of that.
- **`TransferType`** — attended vs. blind for an internal hand-off. Confirm.
- **Not-accepted granularity** — the `redirect` primitive exposes a single not-accepted branch; confirm collapsing all internal failure modes into `nextStep_Failure` is acceptable.

### Build note

No component exists yet (`componentMark: ⏳`). Building it needs a `redirect`-primitive composite (load `composite.md` + the `redirect` section of `node_types.md`). Add a `ROW_ORDER` entry in `scripts/gen_catalog.py` and run `npm run gen:catalog` once the spec is accepted.
