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
| `parameters`      | string           | no       | —                               | Semicolon-delimited SIP headers / transfer data attached to the outbound leg, e.g. `X-Context:{headerContext};X-Clir:true;`. Feeds the `redirect` primitive's `Parameters` attribute; `{name}` tokens are resolved by the runtime at transfer time, literals (`true`) pass through. |
| `attendTransfer`  | boolean          | no       | `false`                         | Transfer style: `false` (default) = blind, `true` = attended. The style is a **fixed node setting** (not variable-driven), so the component holds two `redirect` nodes and the `case` routes to the one matching this flag. |
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
| `Parameters`   | the resolved `parameters` Param — semicolon-delimited `Header:value;` pairs (SIP headers / transfer data, e.g. `X-Context:{headerContext};X-Clir:true;`) attached to the outbound INVITE; `{name}` tokens resolved by the engine at transfer time |
| `TransferType` | selected by `attendTransfer` — the component holds **two** `redirect` nodes, one fixed to `blind` and one to `attend`, and the `case` routes to the matching one (the setting is per-node, not variable-driven) |
| Success        | caller leg terminates (no outbound edge)                       |
| Not accepted   | the `default` ("not accepted") branch routes to `output`, which resolves `nextStep_Failure` |

### Component structure

Composite — the four-node trunk with a `case` that picks the transfer style (or skips), feeding one of **two** `redirect` primitives (blind / attend) before the output node.

```
input → init → script → case ┬ [__doTransfer && __attendTransfer] → redirect:attend ┐
                             ├ [__doTransfer]                      → redirect:blind  ┤ success → leg ends
                             └ [default / skip] ───────────────────────────────────→ output
                               each redirect's "not accepted" branch ──────────────→ output
```

`init` — seed outcome + the transfer flag, resolve config:

```js
__rtOutcome      = 'nextStep';
__doTransfer     = false;
__attendTransfer = false;
__transferDest   = '';
__transferParams = '';
__rtParams       = __setupConfig(__configJSON);
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
__transferParams = String(getValue(__rtParams, 'parameters', ''));                      // SIP headers / transfer data
__attendTransfer = getValue(__rtParams, 'attendTransfer', false) === true;              // picks blind vs attend redirect node
__rtOutcome      = 'nextStep_Failure';                                                  // not-accepted fallback
__doTransfer     = true;
Logger.info('[externalTransfer] transferring', { to: __transferDest, attend: __attendTransfer, hasParams: __transferParams !== '', outcome: __rtOutcome });
```

`case` — `__doTransfer && __attendTransfer` → `redirect:attend`; `__doTransfer` → `redirect:blind`; `default` → `output` (skip). Both `redirect` nodes share `Destination="${__transferDest}"` and `Parameters="{__transferParams}"`, differing only in their fixed `TransferType`; success terminates the leg, each not-accepted branch → `output`. `output` — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` with the exit log carrying `{ outcome, nextStep }`.

### Open questions

- **Busy vs. no-answer split.** The PureConnect handler distinguishes `NextStep_Busy` and `NextStep_RNA` via call-progress analysis; the `redirect` primitive exposes a single *not-accepted* branch. Confirm whether the finer split is needed (would require the richer call-analysis outcomes), or whether collapsing both into `nextStep_Failure` is acceptable.
- **Attend-mode node attributes** — `attendTransfer: true` routes to the `redirect` node configured for attended transfer; confirm that node's exact attend-mode settings (consultation leg, retrieve-on-no-answer, etc.) when the component is built.
- **`outboundAni` / CLI presentation** — how the calling-party number is set on the outbound leg (a `redirect` `Parameters` entry?). Confirm the mechanism.
- **Source attributes** — the handler also reads `EmergencyExternalNumber` and a `PhoneNumber` attribute; this spec consolidates to one `phoneNumber` Param defaulting to `${RTDS_SchedulerExternalNumber}`. Confirm Emergency reuses the same operation with its own default.

### Build note

No component exists yet (`componentMark: ⏳`). Building it needs a `redirect`-primitive composite (load `composite.md` + the `redirect` section of `node_types.md`). Add a `ROW_ORDER` entry in `scripts/gen_catalog.py` and run `npm run gen:catalog` once the spec is accepted.
