# RTDS-on-Vocalls — Implementation Guide

**Status:** working draft · **Date:** 2026-06-01 · **Audience:** flow authors and integrators porting PureConnect RTDS handlers to Vocalls.

This document describes the RTDS implementation as it stands today: how an operation flows
through a Vocalls component, the full operation/param catalog, and — critically — **what the
runtime enforces versus what is only convention**. For the deeper "why" behind the rules, see
[PROJECT_CONVENTIONS.md](../PROJECT_CONVENTIONS.md).

---

## 1. What this is

RTDS ("Real-Time Decision Service") was a set of PureConnect Interaction Designer handlers.
We are re-implementing each handler as a **Vocalls Designer component** — a self-contained
mxGraph sub-flow that reads an operation's `params`, does its work, and sets the next step.

A call flow is a **routing table**: a JSON object with an ordered list of `operations`. Each
operation names a `type` (which component runs), a `params` object (its configuration), and a
set of `NextStep*` keys (where to go next). The runtime walks the table operation by operation,
using the `_rtNextStep` global each component writes to decide the next hop.

```js
result = {
  sourceId: "+3257351115",
  name: "DIGIPOLIS - LPA_LTSU_GUARD",
  operations: [
    { id: "00000", type: "SetVariables", isFirstOperation: true, params: { /* ... */ } },
    { id: "00066", type: "GuardRouting",  params: { /* ... */ } },
    { id: "00099", type: "Disconnect",    params: {} },
  ],
};
```

---

## 2. How an operation executes (the v2 component shape)

Every RTDS component follows the same "v2" skeleton (the canonical example is `sendSms`). It has
four fixed nodes:

| Node id | Role | What it does |
| ------- | ---- | ------------ |
| `0` | **input** | Entry point. |
| `7` | **init** | `__rtParams = __setupConfig(__configJSON);` — resolve config once. |
| `29` | **work** | The operation logic. Reads params via `getValue`, sets `global[_rtNextStep]`. |
| `6` | **output** | Logs exit with `nextStep`. |

The pipeline inside every component is:

1. **`init`** runs `__setupConfig(__configJSON)` → produces `__rtParams`, a flat, type-coerced,
   placeholder-resolved param map.
2. **`work`** reads each param via `getValue(__rtParams, 'Name', default)` (case-insensitive),
   does its job (often an HTTP call via `jsonHttpRequest`), and assigns the appropriate
   `NextStep*` value to `global[_rtNextStep]`.
3. **`output`** logs the exit.

### `__setupConfig` — the one place params are normalised

`__setupConfig` is shared verbatim across all components. It is the **only** automatic param
processing that happens. Its rules:

| Behaviour | Detail |
| --------- | ------ |
| Envelope unwrap | Accepts a JSON string, a `{ Params: {...} }` wrapper, or a flat object; always yields a flat map. |
| `Active` → boolean | Always coerced with `Boolean(...)`. `"1"`, `true`, `1` → `true`; `""`, `0`, `false`, absent → `false`. |
| `ConfigId` → number | `Number(...) || -1`. |
| `Timeout` → number | `Number(...)`, defaulting to `10000` when empty/null/undefined. |
| All other values | **Type-preserved.** Booleans, numbers, arrays, objects pass through untouched. |
| String placeholders | `${name}` in a string is replaced from `global[name]` (bare identifier only). Unresolved → left raw + a `Logger.warn`. |

> **Placeholder limits (enforced by code):** only **bare identifiers** — `${rtEmailBody}` works,
> `${a.b}` and `${a + b}` do **not** (the regex is `\$\{(\w+)\}`). Substitution uses
> `String.replace`, never `eval`/`new Function` (the runtime disables string-eval).

### Reading params (case-insensitive)

Components read with `getValue(obj, key, default)`, which matches case-insensitively. So
`SendSMS`, `SendSms`, and `sendsms` all resolve to the same value. **Writing** a key (e.g. in
`SetVariables`) preserves the operator's exact casing — nothing is normalised on write.

---

## 3. Operation catalog

Six components exist today. Each entry lists its **operation `type`**, params, and the branches
it can take. "Coercion" notes any non-string handling beyond the universal `__setupConfig` rules.

> Universal across every operation:
> - **`Active`** (boolean, default `false`) — if falsy, the component logs a skip and exits to `NextStep`. No other param is read.
> - **`NextStep`** (step id) — the default/continue continuation. Defaults to `-1` when absent.
> - Reads are case-insensitive; values keep their JSON types.

---

### 3.1 `SetVariables`  *(replaces the old `SetAttributes`)*

Writes operator-supplied values into call scope. **`SetAttributes` was hard-cut to
`SetVariables`** — use the new type.

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `Active` | boolean | `false` | Universal. |
| `NextStep` | step id | — | Universal. |
| *(any other key)* | any | — | Written to call scope via `setVariable(key, value)`. |

**Behaviour & enforcement:**
- Control keys `Active` and `NextStep` are **not** written as variables. **Every other key is.**
- **Bare key → `varObj`.** `customerName: "LPA"` → `varObj.customerName`.
- **Dotted key → nested path.** `"auth.verified": true` → `varObj.auth.verified`. A first segment
  of `globalThis`/`global` targets the global scope; any other already-existing object root is
  honoured, otherwise the whole dotted path nests under `varObj`.
- Native types are preserved; string `${name}` placeholders are resolved.
- **Not enforced:** there is no schema of "allowed" variable names. Anything you put in `params`
  (except `Active`/`NextStep`) becomes a variable.

> **Migration gotcha:** the old `SetAttributes` had a third control key, `LogAttributes`, used by
> that component to configure attribute logging. `SetVariables` has **no** `LogAttributes`
> handling — passing it through would create a session variable literally named `LogAttributes`.
> Drop it on migration; if attribute-logging is still required it must be wired separately.

---

### 3.2 `GuardRouting`

Fetches the active guard list for a config, then loops: dial each guard, play an accept menu,
bridge on accept, otherwise advance. Optional voicemail/SMS/email fallback when the list is
exhausted.

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `Active` | boolean | `false` | Universal. |
| `ConfigId` | number | `-1` | Guard pool id; coerced to Number by `__setupConfig`. |
| `ConfigName` | string | — | Label only. |
| `DialGuard` | boolean | — | Native boolean (was the string `"True"`). |
| `OutboundAni` | string | `""` | Outbound presentation number. |
| `Diversion` | string | `""` | Forwarded on the NestedJob redirect header. |
| `OnHoldAudioUrl` | string (URL) | `""` | Audio played while dialling. Must be a real URL — `${environment}` is substituted. |
| `Timeout` | number | `10000` | Per-guard ring timeout. |
| `RecordVoicemail` | boolean | `false` | Read defensively as `String(...).toLowerCase()==='true'`, so `true` and `"True"` both work. |
| `AcceptCallMenu` | boolean | — | Whether to play the accept menu. |
| `AcceptCallMessage` | string | — | The menu prompt the guard hears. |
| `SendSms` | boolean | — | Enable SMS fallback. |
| `SendMail` | boolean | — | Enable email fallback. |
| `NextStep` | step id | `-1` | Loop/continue + exhausted-list fall-through. |
| `NextStep_Success` | step id | `-1` | A guard accepted (call bridged). |
| `NextStep_Failure` | step id | `-1` | Guard-list lookup failed. |

**Branches:** `NextStep_Failure` (HTTP error / no guards) · `NextStep` (loop / list exhausted) ·
`NextStep_Success` (guard accepted).
**External call:** `GET __rtBaseUrl + _rtActiveGuardByConfigEndpoint + '/' + ConfigId`.
HTTP result shape is `{ success, response }` — the component reads `result.response`.

> **Removed vs. legacy:** `DialGroup` (routing is now per-guard via the redirect node) and
> `OnHoldAudio` (a tenant audio *key*) → renamed/replaced by `OnHoldAudioUrl` (a real URL).

---

### 3.3 `SendSMS`

Sends one SMS via the SMS API.

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `Active` | boolean | `false` | Universal. |
| `To` | string | `""` | Destination. **Validated** — must pass `__isMobileNumber`; otherwise the op logs a warning and exits to `NextStep`. |
| `Routing` | string | `""` | Routing label sent as `routing`. |
| `From` | string | `""` | Sender id. |
| `Body` | string | `""` | Message content. |
| `SmsAccountId` | number | `-1` | Sent as `smsAccountId` (coerced to Number). **Was `ConfigId` in legacy configs.** |
| `Timeout` | number | `10000` | HTTP timeout (ms). |
| `NextStep` | step id | `-1` | Inactive / invalid-number exit. |
| `NextStep_Success` | step id | `-1` | API returned success. |
| `NextStep_Failure` | step id | `-1` | API error / non-success. |

**Branches:** `NextStep` (inactive or invalid `To`) · `NextStep_Success` · `NextStep_Failure`.
**External call:** `POST __rtBaseUrl + _rtSmsEndpoint`.

---

### 3.4 `SendEmail`  *(component file `sendMail.js`)*

Sends an email via the mail API.

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `Active` | boolean | `false` | Universal. |
| `From` | string | `""` | **Required** — empty → warn + exit to `NextStep`. |
| `To` | string (`;`-list) | `""` | **Required** — empty → warn + exit. Split on `;`. |
| `Subject` | string | `""` | |
| `Body` | string | `""` | |
| `Cc` | string (`;`-list) | `""` | Omitted from payload when empty. **Was `CC` in legacy.** |
| `Bcc` | string (`;`-list) | `""` | Omitted when empty. |
| `Files` | string (`;`-list of URLs) | `""` | Attachment URLs. |
| `AttachmentNames` / `AttachmentData` | string | `""` | Inline attachment pair. **Replaces legacy `Attachment`.** |
| `Priority` | number | `2` | 1 high / 2 normal / 3 low; anything else → `2`. **Replaces legacy `Importance`.** |
| `CustomerKey` | string | `""` | Omitted from payload when empty. |
| `Timeout` | number | `10000` | HTTP timeout (ms). |
| `NextStep` | step id | `-1` | Inactive / missing `From`/`To`. |
| `NextStep_Success` | step id | `-1` | API success. |
| `NextStep_Failure` | step id | `-1` | API error / non-success. |

**Branches:** `NextStep` (inactive / missing required field) · `NextStep_Success` ·
`NextStep_Failure`. **External call:** `POST __rtBaseUrl + _rtMailEndpoint`.

---

### 3.5 `CheckSchedule`

Looks up an open/closed schedule and routes accordingly.

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `Active` | boolean | `false` | Universal. |
| `ScheduleID` | string | — | Schedule to evaluate (placeholder-resolvable). |
| `Version` | string | `"1"` | Schedule version. |
| `InQueue` | boolean | `false` | In-queue evaluation flag. |
| `Timeout` | number | `5000` | HTTP timeout (ms). |
| `NextStep` | step id | — | Default continuation. |
| `NextStep_Open` | step id | — | Schedule open. |
| `NextStep_Closed` | step id | — | Schedule closed. |
| `NextStep_Disconnect` | step id | — | Disconnect disposition. |
| `NextStep_Transfer` | step id | — | Transfer disposition. |
| `NextStep_ExternalTransfer` | step id | — | External transfer. |
| `NextStep_WorkgroupTransfer` | step id | — | Workgroup transfer. |
| `NextStep_Failure` | step id | — | Lookup failed. |

**External call:** `_rtScheduleEndpoint`.

---

### 3.6 `GuardTUI`

Telephone UI for a guard to (de)activate their own number against a config.

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `Active` | boolean | `false` | Universal. |
| `ConfigId` | string | `""` | Guard config. |
| `PhoneNumberVar` | string | `"ani"` | Which variable holds the caller's number. |
| `Timeout` | number | `10000` | HTTP timeout (ms). |
| `Prompt` | string | menu text | DTMF prompt (7 = activate, 3 = deactivate). |
| `ResultActivated` / `ResultDeactivated` / `ResultOnlyActive` / `ResultDenied` / `ResultError` | string | (defaults) | Spoken results per outcome. |
| `NextStep` | step id | — | Default. |
| `NextStep_Success` | step id | — | (De)activation succeeded. |
| `NextStep_Denied` | step id | — | Caller not allowed. |
| `NextStep_Failure` | step id | — | Technical error. |

**External calls:** `_rtTuiCheckAccessEndpoint`, `_rtTuiGetStateEndpoint`,
`_rtTuiActivateEndpoint`, `_rtTuiDeactivateEndpoint`.

---

### 3.7 `Disconnect`

Terminal hang-up. No component; `params: {}`. Ends the call.

---

## 4. What is enforced vs. what is convention

This is the part to internalise: **there is no schema validation of RTDS operation params at
runtime or build time.** The `npm run validate` / `core/configValidator.js` path validates the
*LLM CONFIG pipeline* (agent prompts), **not** routing-table operation params. Param correctness
is whatever the component's own code chooses to enforce.

### Enforced by component code (will actually change behaviour)

| Rule | Where | Effect if violated |
| ---- | ----- | ------------------ |
| `Active` falsy → skip | every component | Operation does nothing, exits to `NextStep`. |
| `__setupConfig` coercions (`Active`→bool, `ConfigId`→num, `Timeout`→num) | every component | Wrong-typed values are silently coerced. |
| `${name}` resolves only bare identifiers, never `eval` | `__setupConfig` | `${a.b}`/expressions stay literal; a warning is logged. |
| Unresolved `${name}` | `__setupConfig` | Left raw + `Logger.warn`; **not** an error. |
| `SendSMS.To` must be a mobile number | `sendSms` work | Skips send, exits to `NextStep` with a warning. |
| `SendEmail.From` / `SendEmail.To` required | `sendMail` work | Skips send, exits to `NextStep` with a warning. |
| `SendEmail.Priority` ∈ {1,2,3} | `sendMail` work | Anything else forced to `2`. |
| Missing `NextStep*` | `getValue(..., -1)` | Falls back to `-1` (no next hop) — flow effectively stops. |

### Convention only (no runtime check — a linter/agent reviews these)

| Convention | Consequence of ignoring |
| ---------- | ----------------------- |
| Param names are **PascalCase**. | Reads are case-insensitive, so it *works*, but drifts from the catalog. |
| Routing-table envelope keys are exact **camelCase** (`op.id`, `op.params`). | These are read exact-match — wrong casing here **does** break (e.g. `Params` vs `params`). |
| Call-scoped data on `varObj`; runtime globals prefixed `_rt`. | Storage rule 1/2 — judgment-checked, not enforced. |
| Structured `Logger.{debug,info,warn,error}` with `(msg, ctx, err?)`. | Logging rule — judgment-checked. |
| ES5.1 only (no `let`/`const`/arrow/`async`/spread/destructuring/`eval`). | **This one is real:** the Vocalls sandbox rejects non-ES5.1 at runtime. Mechanically grep-checkable; see [conventions/es5.md](../conventions/es5.md). |
| v2 component structure (ids `0`/`7`/`29`/`6`, 23-attribute master order, etc.). | Component won't match the canonical shape; Designer may still load it. |

> **Bottom line for flow authors:** a typo in a **param name** is silent (you get the default).
> A typo in an **envelope key** (`params`, `id`, `type`, `operations`) breaks the table. A
> non-ES5.1 construct in component code breaks at runtime. Everything else in the conventions is
> reviewed, not enforced.

---

## 5. Endpoints & globals

Components resolve their API base and endpoint from `_rt*` globals set in the runtime config
(`api configs` script / `rtds_1_globalConfig`):

| Global | Purpose |
| ------ | ------- |
| `_rtBaseUrl` | `https://api.n-allo.be` |
| `_rtSmsEndpoint` / `_rtMailEndpoint` | SMS / mail APIs |
| `_rtScheduleEndpoint` | schedule lookup |
| `_rtActiveGuardByConfigEndpoint` / `_rtAnyGuardWithPhoneAndConfEndpoint` | guard routing |
| `_rtTuiCheckAccessEndpoint` / `_rtTuiGetStateEndpoint` / `_rtTuiActivateEndpoint` / `_rtTuiDeactivateEndpoint` | guard TUI |
| `_rtNextStep` | name of the variable that receives the next step id |

Each endpoint string interpolates `${environment}` (e.g. `/smsapi-${environment}/api/Send`).

---

## 6. Worked example

A complete migrated routing table lives at
[projects/rtds-runtime/callScripts/guardJsonFlow.latest.js](../projects/rtds-runtime/callScripts/guardJsonFlow.latest.js).
It shows `SetVariables` → `GuardRouting` → `SendEmail` → `SendSMS` → `Disconnect` on the latest
param shapes, with inline comments explaining each legacy→new change.

---

## 7. References

- [PROJECT_CONVENTIONS.md](../PROJECT_CONVENTIONS.md) — the source of truth for all conventions.
- `rtds_vocalls_operations/specs/<name>.spec.md` — per-operation business specs.
- `rtds_vocalls_operations/components/<name>.js` — the component XML (the real contract).
- [conventions/params.md](../conventions/params.md) — `__configJSON` / placeholder rules.
- [conventions/es5.md](../conventions/es5.md) — the one mechanically-enforced syntax rule.
