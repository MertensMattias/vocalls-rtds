---
status: implemented
catalog:
  operation: "guardRouting"
  legacy: false
  pattern: "`http_call` + multi-node"
  component: "guardRouting.js"
  componentMark: "✅"
  runtimeCell: "GUI-exit `guard_routing` (via `guard_vocalls`)"
  seed: "✅"
---

# Operation Spec — guardRouting (GuardRouting)

| Field          | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| Operation Type | `GuardRouting`                                                    |
| Component name | `guardRouting`                                                    |
| Pattern        | `http_call` + multi-node — fetch the active guard list, then loop: call each guard, play menu, transfer on accept, otherwise advance. Optional post-call SMS / email / voicemail. |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_GuardRouting.xml`  |
| Target file    | `rtds/components/guardRouting.js`              |
| Component style | **Hand-built / non-v2** — governed by [conventions/component-mxgraph.md](../../conventions/component-mxgraph.md), NOT the v2 four-node trunk. It diverges deliberately: an `input → getEnvironment component` entry, an embedded endpoint-config script node (id 319), embedded auth (`nalOktaAuth`, id 321) and `globalLibrary` nodes (ids 329/331/333), and **multiple** output nodes. Routes via direct `global[_rtNextStep]` writes (no `__rtOutcome` staging). Do not hold it to the v2 skeleton. ("Style B" was the old name for this — retired; it used to mean "reads `RTDS_OP_*`", which is now purged.) |

## Business purpose

Find an on-call guard willing to take the call. The runtime fetches the list of currently active guards for the configured pool, iterates through them, and for each:

1. Places an outbound call (with call analysis — detects busy / no-answer / answering machine).
2. Plays a menu prompt: "Press 1 to accept, 2 to decline."
3. On `1`, bridges the inbound caller through to the guard.
4. On `2`, busy, no-answer, or any failure, advances to the next guard.

If the entire list is exhausted, optionally records a voicemail, optionally sends an SMS and/or email to a fallback number/address, then falls through.

> **🔒 Security / config-externalisation debt (flagged 2026-06-08 — unresolved).** The shipped component carries **hardcoded secrets and endpoints in the component source**:
> - **Node 321 (`nalOktaAuth`)**: MS tenant GUID `24139d14-…-ea1d50cf`, OAuth token URL (embedding that tenant GUID), and OAuth client-IDs for both `acc` (`29ff6118-…`) and `prd` (`487c3298-…`) environments — all inline as component defaults.
> - **Node 319 (endpoint-config script)**: the full `_rt*Endpoint` map (`_rtBaseUrl = 'https://api.n-allo.be'` + every API path) hardcoded rather than sourced from the env library.
>
> These must move to the env library / a secrets mechanism, not component defaults. This is a code fix (out of scope for this spec pass) — flagged here with exact node refs so it isn't lost.

### Inputs (Params)

Params below match the **shipped `__configJSON`** in `guardRouting.js` (this table was previously a design draft and has been reconciled to the component).

| Param name           | Type             | Required | Default | Description                                                                                                                          |
| -------------------- | ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `active`             | boolean          | no       | `true`  | If falsy, the operation logs a skip and exits to `nextStep`. Default `true` (runs unless explicitly disabled). **⚠ component reads `active`-fallback `false` — see [Convention debt](#convention-debt).** |
| `configId`           | number           | yes      | `1`     | Guard pool identifier passed to the Guard API.                                                                                        |
| `configName`         | string           | no       | `'KLANTWACHT'` | Pool label; carried for flow-header parity.                                                                                   |
| `dialGuard`          | boolean          | no       | `true`  | Whether to place outbound calls to guards (vs. notify-only).                                                                         |
| `outboundAni`        | string           | no       | `''`    | ANI override for the outbound leg to the guard.                                                                                       |
| `diversion`          | string           | no       | `''`    | Call-diversion code on the outbound leg.                                                                                              |
| `onHoldAudioUrl`     | string (URL)     | no       | `'https://audio-${environment}.n-allo.be/on-hold.wav'` | On-hold audio played to the inbound caller while dialling. **Note: a full URL, not an asset id.** |
| `timeout`            | number (seconds) | no       | `15`    | Per-guard ring timeout before advancing to the next guard.                                                                           |
| `acceptCallMenu`     | boolean          | no       | `true`  | Whether to play the accept/decline DTMF menu to the guard.                                                                           |
| `acceptCallMessage`  | string           | no       | `'Press 1 to accept the call.'` | The accept-menu prompt text.                                                                                |
| `recordVoicemail`    | boolean          | no       | `true`  | If all guards exhausted, record a voicemail from the caller before continuing.                                                       |
| `sendSms`            | boolean          | no       | `true`  | If all guards exhausted, route on to a downstream SMS hop. **Note the casing — `sendSms`, not `SendSMS`.**                           |
| `sendMail`           | boolean          | no       | `true`  | If all guards exhausted, route on to a downstream email hop.                                                                          |
| `nextStep`           | string (step ID) | yes      | `'00005'` | Continuation when inactive, or all guards tried without success.                                                                    |
| `nextStep_Success`   | string (step ID) | no       | `'00002'` | Continuation on a successful guard accept (the component **does** stage a success branch — see Outputs).                            |
| `nextStep_Failure`   | string (step ID) | no       | `'00099'` | Continuation on HTTP / dial failure.                                                                                                |

**Spec-only params that the shipped component does NOT read** (present in the earlier draft, absent in `guardRouting.js`): `DialGroup`, `RequestTimeout` (HTTP timeout is hardcoded to `10000` in the fetch node), `OnHoldAudio` (replaced by `onHoldAudioUrl`), `SendSMS` (replaced by `sendSms`), `VoicemailPrompt`, `VoicemailMaxSecs`.

### Outputs

| Branch key         | Taken when                                                                          | Fallback |
| ------------------ | ----------------------------------------------------------------------------------- | -------- |
| `nextStep`         | Operation inactive, or guard loop exhausted (with optional voicemail/SMS/email taken). | `''`  |
| `nextStep_Success` | A guard accepted and the inbound caller was bridged through.                         | `''`     |
| `nextStep_Failure` | HTTP error fetching the guard list, or an outbound-dial failure.                     | `''`     |

The component **does** stage a `nextStep_Success` branch (the earlier draft's claim of "no post-success branch" was wrong). Routing **today** is via direct `global[_rtNextStep]` writes in the work scripts (no `__rtOutcome` staging), across **multiple output nodes** each logging `[guardRouting] exit`. The fallback is `''`. The **target** is `__rtOutcome` staging resolved once at output, like every other operation — see [Convention debt](#convention-debt) (this is a larger change here because the graph is multi-output and hand-built).

### External call

| Field        | Value                                                                 |
| ------------ | --------------------------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl` (hardcoded to `https://api.n-allo.be` in node 319 — see security flag) |
| Endpoint var | `_rtActiveGuardByConfigEndpoint` (Digipolis `/Guard/GetAllCurrentActiveGuardsByGuardConfig`), defined in node 319 |
| Method       | `GET`                                                                 |
| Timeout      | hardcoded `10000` ms in the fetch node (no `RequestTimeout` Param)     |
| Auth         | OAuth via the embedded `nalOktaAuth` component (node 321) — see security flag |

Guard-list response is read off **`result.response`** (the `jsonHttpRequest` `{ success, response }` shape — not `result.body`); it is an array of active-guard records (id / phone number / name fields).

### Component structure

Hand-built, multi-node, **non-v2** component — the most complex in the catalog. The description below reflects the **shipped** `guardRouting.js` (the earlier draft `init` / `fetch` code blocks were aspirational and have been removed; read the component for exact bodies).

Actual node shape (decoded from the mxGraph):

- **input (0)** → **init (7)** (`__setupConfig`, `Logger.debug`) → **getGuards (29)** (HTTP fetch of the active-guard list; `.then`/error) → **hasGuards (case)** → **guardLoop (counter)** → **dialGuard (script)** → **redirect (NestedJob outbound)** → **appendLog (script)** → **answered (case)** → loop-back or → **recordVoicemail (case)** → say/recognize → **prepareMsg (script)** → **output**.
- Embedded infrastructure nodes (the non-v2 divergence): **getEnvironment** (`Type="component"`, id 326/325), **nalOktaAuth** (`Type="component"`, id 321 — OAuth), endpoint-config **script (id 319)**, and three **globalLibrary** nodes (ids 329/331/333: `rtds_1_globalConfig` / `rtds_2_runtime` / `rtds_3_vocallsEnv`).
- **Multiple output nodes** (ids 6, 726, 737), each logging `[guardRouting] exit`.

Routing is by **direct `global[_rtNextStep]` writes** in the work scripts (`getGuards`, `dialGuard`, `appendLog`, `prepareMsg`) — there is no `__rtOutcome` staging and no single output-node resolution. Logging is clean (`Logger.*` throughout; no bare `log_*`). No `RTDS_OP_*` usage.

### Convention debt (flagged 2026-06-08)

This spec states the **target** contract; the hand-built `guardRouting.js` diverges on:

1. **`active` read fallback `false` → `true`.** The fetch node reads `getValue(__rtParams, 'active', false)`; target is `true`.
2. **`__rtOutcome` staging.** The component routes via direct `global[_rtNextStep]` writes across multiple output nodes. The target is single-resolve `__rtOutcome` staging ([conventions/component-v2.md](../../conventions/component-v2.md) §7–§8) — a larger refactor here given the multi-output, hand-built graph; track as a follow-up rather than a quick fix.
3. **Hardcoded secrets / endpoints** (nodes 319/321) — see the 🔒 security flag above. Highest priority.

(Logging is already clean — `Logger.*` throughout, no bare `log_*`; no `RTDS_OP_*`.)

### Open questions

- The source handler embeds a `SendSMS` / `SendMail` / `RecordVoicemail` post-call fallback. The Vocalls version treats these as flags that *enable* a downstream operation hop — i.e. when all guards are exhausted, the component sets `_rtNextStep` to a step ID the flow author has wired to a `sendSms`/`sendMail`/voicemail operation. Confirm this is preferred over folding the post-call behaviour into the GuardRouting component itself.
- The source handler's failover (Unknown Host / Timeout / Connection Failure → fallback path) wraps the entire HTTP call. The Vocalls work body collapses these into `nextStep_Failure`. Confirm whether the operator needs distinct branches for transient vs. permanent HTTP failures.
- The source handler also invokes `DialPlanEx` for outbound phone number normalisation. Confirm Vocalls' outbound dial step accepts E.164 directly or whether a number-normalisation helper is needed.
- Per-iteration call analysis (Busy / NoAnswer / Intercept / Machine / Fax / NoLines / Disconnect / Failure / Canceled / Declined) collapses to a single "next guard" branch in the spec. Confirm this is OK — the source handler may have operator-specific logging hooks per outcome that the Vocalls version should preserve via `Logger.info('[guardRouting] guard outcome', { outcome, guardId })`.
- This is the largest handler in scope (~2400 lines of XML). The first cut of the component will need a code-review pass to verify the mxGraph case/edge layout actually matches the loop semantics.
