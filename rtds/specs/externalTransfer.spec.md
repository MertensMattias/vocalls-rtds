---
status: spec-only
catalog:
  operation: "externalTransfer"
  legacy: false
  pattern: "composite (`redirect` primitive)"
  component: "externalTransfer.js"
  componentMark: "⏳"
  runtimeCell: "⬜ not registered"
  seed: "⬜"
---

# Operation Spec — externalTransfer (ExternalTransfer)

| Field          | Value                                                            |
| -------------- | --------------------------------------------------------------- |
| Operation Type | `externalTransfer`                                              |
| Component name | `externalTransfer`                                              |
| Pattern        | composite — native `redirect` primitive (linear-with-failure-branch) |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_ExternalTransfer.xml`     |
| Target file    | `rtds/components/externalTransfer.js` (planned)                 |

## Business purpose

Transfer the caller to an **external PSTN number** — e.g. the after-hours, overflow, or emergency number a previous operation selected. The operation places an outbound call to the configured number and bridges the caller to it. On a successful transfer the caller's leg is handed off and the flow ends; when the attempt is **not accepted** (busy, no answer, or a transport failure) the flow continues to a fallback step so the caller is not dropped silently. The destination usually comes from the number [`checkSchedule`](scheduler.spec.md) stashed on `RTDS_SchedulerExternalNumber`, but any operator-supplied number works.

### Inputs (Params)

| Param name        | Type             | Required | Default                         | Description                                                                                       |
| ----------------- | ---------------- | -------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `active`          | boolean          | yes      | `true`                          | If falsy, the operation logs a skip and exits to `nextStep` without transferring. Read with a `true` fallback. |
| `phoneNumber`     | string (E.164)   | yes      | `${RTDS_SchedulerExternalNumber}` | The external destination. Defaults to the number stashed by `checkSchedule`; `${name}` is resolved at init by `__setupConfig`. |
| `outboundAni`     | string (E.164)   | no       | —                               | Calling-party number (CLI) presented to the external party. Omitted → platform default.           |
| `timeout`         | number (s)       | no       | `30`                            | No-answer timeout for the outbound attempt.                                                       |
| `nextStep_Failure`| string (step ID) | yes      | —                               | Continuation when the transfer is not accepted (busy / no answer / failed).                       |
| `nextStep`        | string (step ID) | yes      | —                               | Continuation when the operation is inactive or the destination is empty (caller **not** transferred). **Last key in the Params array.** |

### Outputs

| Branch key         | Taken when                                                                 | Fallback |
| ------------------ | ------------------------------------------------------------------------- | -------- |
| `nextStep`         | Operation inactive, or `phoneNumber` resolves empty — caller not transferred. | `''`     |
| `nextStep_Failure` | The transfer was not accepted (busy / no answer / transport failure).      | `''`     |

On a **successful** transfer the caller leg is handed off and terminates — there is no continuation branch (the `redirect` success path ends the leg). The component stages the chosen key into `__rtOutcome` and resolves it **once** at the output node — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`, empty-string fallback ([conventions/component-v2.md](../../conventions/component-v2.md) §7–§8). It never writes `_rtNextStep` mid-flight.

### Transfer (redirect primitive)

This operation does **not** call an HTTP endpoint — the transfer is a native Vocalls telephony action via a `redirect` primitive (see [primitive_examples.md §7.10](../../.claude/skills/rtds-vocalls-component-gen/references/primitive_examples.md)):

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| `Destination`  | `${__transferDest}` — the resolved `phoneNumber`, read from the global scope at transfer time |
| `TransferType` | `blind` (external PSTN hand-off; confirm — see [Open questions](#open-questions)) |
| Success        | caller leg terminates (no outbound edge)                       |
| Not accepted   | the `default` ("not accepted") branch routes to `output`, which resolves `nextStep_Failure` |

### Component structure

Composite — the four-node trunk with a `case` guard and a `redirect` primitive between the work script and the output node.

```
input(0) → init(7) → script(29) → case ─[__doTransfer]→ redirect ─[not accepted]→ output(6)
                                       └─[default: skip]──────────────────────────→ output(6)
                                                          (success → leg terminates)
```

`init` — seed outcome + the transfer flag, resolve config:

```js
__rtOutcome    = 'nextStep';
__doTransfer   = false;
__transferDest = '';
__rtParams     = __setupConfig(__configJSON);
Logger.debug('[externalTransfer] config resolved', { params: __rtParams, outcome: __rtOutcome });
```

`script` (work body) — gate + resolve destination, stage `__rtOutcome`:

```js
if (!getValue(__rtParams, 'active', true)) {
    Logger.info('[externalTransfer] skipped -- inactive', { outcome: __rtOutcome });   // 'nextStep'
    return;
}
__transferDest = String(getValue(__rtParams, 'phoneNumber', ''));
if (!__transferDest) {
    Logger.warn('[externalTransfer] missing destination', { outcome: __rtOutcome });   // 'nextStep'
    return;
}
__rtOutcome  = 'nextStep_Failure';                                                      // not-accepted fallback
__doTransfer = true;
Logger.info('[externalTransfer] transferring', { to: __transferDest, outcome: __rtOutcome });
```

`case` — `__doTransfer == true` → `redirect`; `default` → `output`. `redirect` — `Destination="${__transferDest}"`; success terminates the leg, the not-accepted branch → `output`. `output` — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` and the exit log carrying `{ outcome, nextStep }`.

### Open questions

- **Busy vs. no-answer split.** The PureConnect handler distinguishes `NextStep_Busy` and `NextStep_RNA` via call-progress analysis; the `redirect` primitive exposes a single *not-accepted* branch. Confirm whether the finer split is needed (would require the richer call-analysis outcomes), or whether collapsing both into `nextStep_Failure` is acceptable.
- **`TransferType`** — blind vs. attended for an external hand-off. Confirm.
- **`outboundAni` / CLI presentation** — how the calling-party number is set on the outbound leg (a `redirect` `Parameters` entry?). Confirm the mechanism.
- **Source attributes** — the handler also reads `EmergencyExternalNumber` and a `PhoneNumber` attribute; this spec consolidates to one `phoneNumber` Param defaulting to `${RTDS_SchedulerExternalNumber}`. Confirm Emergency reuses the same operation with its own default.

### Build note

No component exists yet (`componentMark: ⏳`). Building it needs a `redirect`-primitive composite (load `composite.md` + the `redirect` section of `node_types.md`). Add a `ROW_ORDER` entry in `scripts/gen_catalog.py` and run `npm run gen:catalog` once the spec is accepted.
