---
status: implemented
catalog:
  operation: "guardRouting"
  legacy: false
  pattern: "`http_call` + multi-node"
  component: "guardRouting.js"
  componentMark: "✅"
  runtimeCell: "GUI-exit `guard_routing` (via `guard`)"
  seed: "✅"
---

# Operation Spec — guardRouting (GuardRouting)

| Field          | Value                                                                                   |
| -------------- | --------------------------------------------------------------------------------------- |
| Operation Type | `GuardRouting` (flow JSON type: `guard`)                                                |
| Component name | `guardRouting`                                                                          |
| Pattern        | `http_call` + multi-node — fetch active guards, dial loop, voicemail, notification prep |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_GuardRouting.xml`                                 |
| Target file    | `rtds/components/guardRouting.js` (already exists — this spec is the reference shape)   |

## Business purpose

On-call guard duty for inbound helpdesk calls. The operation fetches the list of currently active guards for a configured guard group from the Guard Module API, then dials each guard in sequence until one accepts the call or every guard has been tried. Before dialing, it runs two gates:

1. **Active check** — is the operation switched on for this interaction?
2. **Guard list check** — does the Guard API return at least one active guard?

If both pass and `dialGuard` is true, the component enters the dial loop. After the loop completes — regardless of whether a guard answered — it may offer voicemail capture and conditionally prepares notification content in global session variables (`rtSmsTo`, `rtSmsBody`, `rtEmailTo`, `rtEmailBody`, `rtEmailAttachment`) for downstream `sendSms` and `sendMail` operations to consume on later flow steps. It then exits with a routing step that tells the flow what happened next.

### Inputs (Params)

| Param name          | Type             | Required | Default | Description                                                                                                                                                                                                                                                                                                |
| ------------------- | ---------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `active`            | boolean          | no       | `true`  | If falsy, the operation logs a skip and exits to `nextStep`. Default `true` (runs unless explicitly disabled with `active: false`). **⚠ The shipped `getGuards` node reads `getValue(__rtParams, 'active', false)` — default `false`; flagged in [Convention debt](#convention-debt-flagged-2026-06-09).** |
| `configId`          | number           | yes      | —       | Guard configuration ID passed to the Guard Module API (`?guardConfigId=`). Determines which guard group is dialed.                                                                                                                                                                                         |
| `configName`        | string           | yes      | —       | Display name of the guard group. Used as the header line in SMS and email notification bodies. Supports `${name}` token substitution.                                                                                                                                                                      |
| `dialGuard`         | boolean          | yes      | —       | Whether to execute the dial loop. When `false`, skip dialing entirely (notification preparation still runs). **⚠ Not yet read by the shipped dial-loop path — flagged in [Convention debt](#convention-debt-flagged-2026-06-09).**                                                                         |
| `outboundANI`       | string           | no       | `""`    | Caller ID presented to guards on outbound NestedJob calls. Empty string uses platform default. **Casing is `outboundANI` (acronym uppercase) — matches the case-sensitive seed and production flows; do not write `outboundAni`.**                                                                         |
| `diversion`         | string           | no       | `""`    | Optional SIP diversion header value on outbound calls (`diversion:{__diversion}` redirect param). For network-level routing on specific trunks.                                                                                                                                                            |
| `onHoldAudioUrl`    | string (URL)     | no       | —       | Full URL of audio played to the inbound caller while each guard is being dialed. Supports `${name}` substitution.                                                                                                                                                                                          |
| `timeout`           | number           | no       | `10000` | Ring / HTTP timeout. **⚠ The shipped component passes this to `jsonHttpRequest` as milliseconds, but production flows seed `15` (seconds). A 15 ms timeout fails every lookup — flagged in [Convention debt](#convention-debt-flagged-2026-06-09).**                                                       |
| `recordVoicemail`   | boolean          | no       | `false` | When true and no guard answered, offer the caller voicemail capture (recognize node, max ~60 s, ≥5 s to count as recorded).                                                                                                                                                                                |
| `acceptCallMenu`    | boolean          | no       | `false` | When true, the guard must press 1 to accept after answering; no press within the timeout is treated as declined. **⚠ Catalogued and seeded; accept-menu wiring in the NestedJob redirect is not yet verified — flagged in [Convention debt](#convention-debt-flagged-2026-06-09).**                        |
| `acceptCallMessage` | string           | no       | —       | TTS message played to the guard when `acceptCallMenu` is true (e.g. `"Press 1 to accept the call."`). Required when `acceptCallMenu` is true. Supports `${name}` substitution.                                                                                                                             |
| `sendSms`           | boolean          | no       | `false` | When true, populate `rtSmsTo` and `rtSmsBody` after the dial loop for a downstream `sendSms` operation. **⚠ Notification prep script not yet present in the shipped component — see [Convention debt](#convention-debt-flagged-2026-06-09).**                                                              |
| `sendMail`          | boolean          | no       | `false` | When true, populate `rtEmailTo` and `rtEmailBody` (and `rtEmailAttachment` when voicemail recorded) for a downstream `sendMail` operation. **⚠ Same as `sendSms`.**                                                                                                                                        |
| `nextStep`          | string (step ID) | yes      | —       | Default routing step. Seeded into `__rtOutcome` at `getGuards`. Returned when inactive, when no guards need dialing, or when all guards fail to answer.                                                                                                                                                    |
| `nextStep_Success`  | string (step ID) | yes      | —       | Continuation after a guard accepts the call.                                                                                                                                                                                                                                                               |
| `nextStep_Failure`  | string (step ID) | yes      | —       | Continuation after a fatal Guard API / transport error.                                                                                                                                                                                                                                                    |

### Outputs

| Branch key         | Taken when                                                                                                                           | Fallback |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `nextStep`         | Operation inactive; no active guards (shipped: proceeds without failure); all guards tried without success; or default fall-through. | `''`     |
| `nextStep_Success` | A guard answered and was classified as `success` by `__classifyRedirect`.                                                            | `''`     |
| `nextStep_Failure` | Guard API lookup failed (HTTP / transport error).                                                                                    | `''`     |

The component stages the chosen outcome key into `__rtOutcome` across its script nodes and resolves it **once** at the output node — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` — with an empty-string fallback ([conventions/component-v2.md](../../conventions/component-v2.md) §7–§8). It never writes `_rtNextStep` mid-flight. **⚠ The shipped `dialGuard` and `appendLog` nodes currently write `global[_rtNextStep]` mid-flight using PascalCase Param keys that never resolve — flagged in [Convention debt](#convention-debt-flagged-2026-06-09).**

### Global variables written

Populated for downstream `sendSms` / `sendMail` operations on later flow steps. Values are **appended** across call legs when already set, so a multi-leg call accumulates one report covering every guard group dialed.

| Variable            | Type   | Populated when                               | Description                                                                                         |
| ------------------- | ------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `rtSmsTo`           | string | `sendSms` is true                            | Semicolon-separated mobile numbers. The guard who answered (`success`) is excluded.                 |
| `rtSmsBody`         | string | `sendSms` is true                            | SMS body: header (`configName` + caller) on the first leg, then one block per dial attempt.         |
| `rtEmailTo`         | string | `sendMail` is true                           | Semicolon-separated email addresses. All guards included — no exclusion for the guard who answered. |
| `rtEmailBody`       | string | `sendMail` is true                           | Email body — same block structure as the SMS body.                                                  |
| `rtEmailAttachment` | string | `recordVoicemail` is true and audio captured | Path / reference to the voicemail recording for the downstream `sendMail` `files` field.            |

**Design contract.** The merge/format mechanics are specified under [Notification body construction](#notification-body-construction). The shipped Vocalls graph builds `__guardLog` and captures voicemail to session variables but does **not** yet run the notification scripts that write these globals — see [Convention debt](#convention-debt-flagged-2026-06-09).

### Internal variables (component-scoped)

The `__` prefix marks a component-local that is not visible outside the component.

| Variable              | Type       | Description                                                            |
| --------------------- | ---------- | ---------------------------------------------------------------------- |
| `__guardList`         | `object[]` | Guard records from the Guard API (`id`, `name`, `phone`, `email`, …).  |
| `__guardLog`          | `object[]` | Ordered dial-attempt records: `{ name, phone, email, time, outcome }`. |
| `__guardIndex`        | number     | Current index in the dial loop (counter node `VariableName`).          |
| `__guardCount`        | number     | Length of `__guardList` after normalisation.                           |
| `__guardPickedUp`     | boolean    | Set true when `__classifyRedirect` returns `success`.                  |
| `__currentGuardPhone` | string     | Phone of the guard being dialed in the current iteration.              |
| `__transferResult`    | object     | NestedJob redirect result (`ResultVariableName`).                      |
| `__voicemailCapture`  | string     | Recognize-node capture for the voicemail transcript / audio reference. |
| `__voicemailRecorded` | boolean    | True when captured audio counts as a voicemail (≥5 s). **(design)**    |

### External call

| Field        | Value                                                  |
| ------------ | ------------------------------------------------------ |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                           |
| Endpoint var | `_rtActiveGuardByConfigEndpoint` → `__rtGuardEndpoint` |
| Method       | `GET`                                                  |
| Query        | `?guardConfigId=` + `encodeURIComponent(configId)`     |
| Timeout      | `getValue(__rtParams, 'timeout', 10000)` ms            |

**Guard API path (as seeded in runtime `main_sourceCode.js`, `api configs` node):**

`GET /digipolisapi-api-${environment}/api/Guard/GetAllCurrentActiveGuardsByGuardConfig?guardConfigId=<configId>`

Response: JSON array of guard objects.

| Field             | Type    | Description                                                  |
| ----------------- | ------- | ------------------------------------------------------------ |
| `id`              | number  | Guard record identifier.                                     |
| `name`            | string  | Display name — used in notification body lines.              |
| `phone`           | string  | Mobile number — dialed in the loop; SMS recipient candidate. |
| `email`           | string  | Email address — mail recipient candidate.                    |
| `active`          | number  | `1` = active.                                                |
| `activeFlag`      | boolean | Active flag as boolean.                                      |
| `dateActivated`   | string  | ISO-8601 activation timestamp.                               |
| `dateDeactivated` | string  | ISO-8601 deactivation timestamp.                             |

Example response:

```json
[
  {
    "id": 109,
    "config": 1,
    "active": 1,
    "activeFlag": true,
    "name": "Mattias Mertens",
    "phone": "0478306999",
    "email": "mattias.mertens@n-allo.be",
    "dateActivated": "2026-03-26T17:06:51.177",
    "dateDeactivated": "2026-03-26T15:14:24.5"
  }
]
```

### Dial outcomes

Each guard dial attempt produces exactly one `outcome` in `__guardLog` (via `__classifyRedirect` on the NestedJob `__transferResult`). The outcome is the `Reason` line in the SMS / email body.

| Outcome             | Party2 status | When it occurs                                                     | Exits loop early             | Excluded from `rtSmsTo` |
| ------------------- | ------------- | ------------------------------------------------------------------ | ---------------------------- | ----------------------- |
| `success`           | other         | Guard answered and accepted (and pressed 1 when `acceptCallMenu`). | Yes — call stays with guard. | Yes                     |
| `no_reaction`       | `4`           | No answer within the ring timeout.                                 | No                           | No                      |
| `rejected`          | `1`           | Declined / accept-menu not satisfied.                              | No                           | No                      |
| `rejected_voicebox` | `0`           | Hit the guard's voicemail / voicebox.                              | No                           | No                      |
| `unknown`           | missing       | Missing or malformed `__transferResult`.                           | No                           | No                      |

`success` is the only outcome that sets `__guardPickedUp = true` and routes to `nextStep_Success`. All other outcomes advance `__guardIndex` and try the next guard. When the counter exhausts the list, execution continues to voicemail / notification / output.

**Recipient effect.** `rtSmsTo` excludes the `success` guard's phone (they already have the call); all other dialed guards remain. `rtEmailTo` includes **every** guard email regardless of outcome.

> **(design)** The legacy design also names a `canceled` outcome (inbound caller hung up before any guard answered → abort the loop early, dial no further guards). The shipped `__classifyRedirect` does not yet emit it. Captured under [Convention debt](#convention-debt-flagged-2026-06-09).

### Processing logic

Ordered steps the operation performs. Steps marked **(shipped)** reflect the current Vocalls graph; **(design)** are specified here and in the legacy handler but not yet in the graph.

| Step | Action                                                                                                                                                                                                                                                                                                | Exit        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1    | **(shipped)** `init` — `__rtParams = __setupConfig(__configJSON)`; seed `__rtOutcome = 'nextStep'`.                                                                                                                                                                                                   | → 2         |
| 2    | **(shipped)** If `active` is falsy → log skip, keep `nextStep`.                                                                                                                                                                                                                                       | STOP        |
| 3    | **(shipped)** `getGuards`: `GET` active guard list by `configId`. On transport failure → `nextStep_Failure`. On empty array → `nextStep` (proceed without guard — **differs from legacy handler, which routed to `nextStep_Failure`**).                                                               | STOP or → 4 |
| 4    | **(shipped)** `hasGuards` case: when `__guardCount > 0`, enter the dial loop; otherwise jump to output.                                                                                                                                                                                               | → 5 or STOP |
| 5    | **(shipped)** Dial loop (`guardLoop` counter): for each guard — play `onHoldAudioUrl`, NestedJob redirect to `__currentGuardPhone` (with `diversion`), `__classifyRedirect`, append `__guardLog`. On `success` → `nextStep_Success`, exit loop. **(design)** Skip entirely when `dialGuard` is false. | → 6         |
| 6    | **(shipped)** `recordVoicemail` case → say prompt + recognize → `prepareMsg`. **(design)** Set `__voicemailRecorded` and `rtEmailAttachment` when captured audio ≥5 s.                                                                                                                                | → 7         |
| 7    | **(design)** SMS prep when `sendSms` — see [Notification body construction](#notification-body-construction). Exclude the `success` guard from `rtSmsTo`.                                                                                                                                             | → 8         |
| 8    | **(design)** Email prep when `sendMail` — see [Notification body construction](#notification-body-construction). All guard emails included.                                                                                                                                                           | → 9         |
| 9    | **(shipped)** `output` — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`.                                                                                                                                                                                                                       | STOP        |

#### Outcome reference

| Situation                       | `__rtOutcome` / branch |
| ------------------------------- | ---------------------- |
| Service inactive                | `nextStep`             |
| Guard API error                 | `nextStep_Failure`     |
| No active guards (shipped)      | `nextStep`             |
| All guards tried, none answered | `nextStep`             |
| A guard accepted the call       | `nextStep_Success`     |

### Notification body construction

**(design)** This is the systematic report-building logic the downstream `sendSms` / `sendMail` operations rely on. It runs after the dial loop, once per flow leg, and **appends** to any globals an earlier leg already set so a single SMS/email covers every guard group dialed during the call.

**SMS prep** — only when `sendSms` is true. **Skip entirely** when `__guardCount === 1` and that single guard's `__guardLog` outcome was `success` (a lone guard who answered needs no notification). Otherwise:

1. **Body delta.** If `rtSmsBody` is empty, seed `smsBodyDelta` with the header line (`configName` + the inbound caller number from `varObj.ani`). If `rtSmsBody` already has content (prior leg), `smsBodyDelta` starts empty — the header is already present.
2. **Per-attempt blocks.** For each entry in `__guardLog`, append to `smsBodyDelta`:
   - `To: <name> on mobile number: <phone>`
   - `Time: <time>`
   - `Reason: <outcome>`
   - _(blank line)_
3. **Voicemail line** (when `recordVoicemail` is true): append `The caller recorded a voicemail, this is sent by mail.` when `__voicemailRecorded`, otherwise `The caller didn't record a voicemail.`
4. **Recipients.** Collect every `phone` from `__guardList`; remove the phone of the `success` guard (if any).
5. **Merge.** `rtSmsTo = rtSmsTo ? rtSmsTo + ';' + recipients : recipients`; `rtSmsBody = rtSmsBody + smsBodyDelta` (or just `smsBodyDelta` when previously empty).
6. Log `Logger.debug('[guardRouting] sms prepared', { recipients: …, outcome: __rtOutcome })`.

**Email prep** — only when `sendMail` is true. Same body structure as SMS, with two differences:

- The voicemail line reads `The caller recorded a voicemail, you'll find the attachment below.` (vs the SMS wording) / `The caller didn't record a voicemail.`
- **No recipient exclusion** — `rtEmailTo` collects every `email` from `__guardList`, including the `success` guard.

Merge `rtEmailTo` / `rtEmailBody` with the same append rule as SMS. When `__voicemailRecorded`, the recording reference is already in `rtEmailAttachment` (set in Step 6) for `sendMail` to attach.

### Template resolution

`${name}` substitution applies to string Params only (`configName`, `acceptCallMessage`, `onHoldAudioUrl`, `outboundANI`). Resolved at init time by `__setupConfig` → `resolveConfigTokens` (`varObj` first, then `global`; bare identifiers only; `String.replace`, never `new Function`). `active` is never substituted. Boolean and number Params pass through with their JSON type intact.

| Prefix   | Scope                                                                   | Example       |
| -------- | ----------------------------------------------------------------------- | ------------- |
| _(none)_ | Global session — set by flow / upstream ops, consumed across components | `rtSmsTo`     |
| `_rt`    | System global — platform endpoint vars                                  | `_rtBaseUrl`  |
| `__`     | Component-local — dial loop state                                       | `__guardList` |

### Component structure

Multi-node v2-composite — see [`rtds/components/guardRouting.js`](../components/guardRouting.js).

**Graph:** input → init → getGuards → hasGuards → (play on-hold → guardLoop counter → dialGuard → NestedJob redirect → appendLog → answered case) → recordVoicemail case → say + recognize → prepareMsg → output.

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) {
  _headers = {};
}
Logger.debug("[guardRouting] config resolved", { params: __rtParams });
```

`getGuards` (work body — stages `__rtOutcome`, never `_rtNextStep`, per the output contract):

```js
__rtOutcome = "nextStep";
if (String(getValue(__rtParams, "active", true)).toLowerCase() !== "true") {
  // target: default true
  Logger.info("[guard] skipped -- inactive", { outcome: __rtOutcome });
  return;
}
__rtOutcome = "nextStep_Failure";

var __endpoint = __rtBaseUrl + __rtGuardEndpoint;
var __query =
  "?guardConfigId=" +
  encodeURIComponent(getValue(__rtParams, "configId", null));

return jsonHttpRequest(
  __endpoint + __query,
  { method: "GET", timeout: Number(getValue(__rtParams, "timeout", 10000)) },
  _headers,
).then(
  function (result) {
    if (!result || result.success !== true) {
      Logger.warn("[guard] lookup failed", {
        statusCode: result && result.statusCode,
        outcome: __rtOutcome,
      });
      return; // __rtOutcome stays 'nextStep_Failure'
    }
    var __guards = result.response;
    if (Object.prototype.toString.call(__guards) !== "[object Array]") {
      __guards = [];
    }
    __guardList = __guards;
    __guardCount = __guards.length;
    // guards found OR empty both proceed -> 'nextStep'; the hasGuards case routes on __guardCount.
    __rtOutcome = "nextStep";
    Logger.info("[guard] guards resolved", {
      count: __guardCount,
      outcome: __rtOutcome,
    });
  },
  function (err) {
    Logger.error("[guard] lookup error", { outcome: __rtOutcome }, err); // stays 'nextStep_Failure'
  },
);
```

`output` (`OnEnter`) — resolves the staged outcome once:

```js
_rtNextStep = getValue(__rtParams, __rtOutcome, "");
Logger.info("[guardRouting] exit", {
  outcome: __rtOutcome,
  nextStep: _rtNextStep,
});
```

Variables block (abbreviated):

```js
__configJSON = {
  active: true,
  configId: 1,
  configName: "KLANTWACHT",
  dialGuard: true,
  outboundANI: "",
  diversion: "",
  onHoldAudioUrl: "https://…/on-hold.wav",
  timeout: 10000,
  recordVoicemail: true,
  acceptCallMenu: true,
  acceptCallMessage: "Press 1 to accept the call.",
  sendSms: true,
  sendMail: true,
  nextStep_Success: "00002",
  nextStep_Failure: "00099",
  nextStep: "00005",
};
__environment = environment;
__rtBaseUrl = _rtBaseUrl;
__rtGuardEndpoint = _rtActiveGuardByConfigEndpoint;
__rtNextStep &= _rtNextStep; // placeholder binding to the flow's _rtNextStep var
__guardList = [];
__guardIndex = 0;
__guardCount = 0;
__guardLog = [];
__guardPickedUp = false;
__recordVoicemail = false;
__currentGuardPhone = "";
__transferResult = null;
__voicemailCapture = "";
```

### Example configuration

Production flow shape (`callflow_json_config_vocalls/DIGIPOLIS_DA_KLANTWACHT_GUARD_PRD.json`):

```json
{
  "id": "00001",
  "type": "guard",
  "name": "DA_KLANTWACHT",
  "params": {
    "active": true,
    "configId": 1,
    "configName": "KLANTWACHT",
    "dialGuard": true,
    "outboundANI": "",
    "diversion": "",
    "onHoldAudioUrl": "https://data.freetouse.com/music/tracks/…/file/mp3",
    "timeout": 15,
    "recordVoicemail": true,
    "acceptCallMenu": true,
    "acceptCallMessage": "Press 1 to accept the call.",
    "sendSms": true,
    "sendMail": true,
    "nextStep_Success": "00002",
    "nextStep_Failure": "00002",
    "nextStep": "00002"
  }
}
```

### Logging

| Event              | Level                          | Message key                                      |
| ------------------ | ------------------------------ | ------------------------------------------------ |
| Config resolved    | `Logger.debug`                 | `[guardRouting] config resolved`                 |
| Service inactive   | `Logger.info`                  | `[guard] skipped -- inactive`                    |
| Guard API error    | `Logger.warn` / `Logger.error` | `[guard] lookup failed` / `[guard] lookup error` |
| No active guards   | `Logger.info`                  | `[guard] no active guards -- proceeding`         |
| Guard dialed       | `Logger.info`                  | `[guardRouting] dialing guard`                   |
| Attempt logged     | `Logger.info`                  | `[guardRouting] guard attempt logged`            |
| Voicemail captured | `Logger.info`                  | `[guardRouting] voicemail captured`              |
| SMS prepared       | `Logger.debug`                 | `[guardRouting] sms prepared`                    |
| Email prepared     | `Logger.debug`                 | `[guardRouting] email prepared`                  |
| Exit               | `Logger.info`                  | `[guardRouting] exit`                            |

All logs use `Logger.{debug,info,warn,error}` with a structured context object carrying `{ outcome: __rtOutcome }` on work nodes and `{ outcome, nextStep }` on exit (per [conventions/logging.md](../../conventions/logging.md)). Bare `log_*` calls are disallowed.

### Convention debt (flagged 2026-06-09)

This spec states the **target** contract. The shipped `guardRouting.js` graph diverges as follows — keep the target in the body above; fix the code to match:

- **`active` read fallback.** `getGuards` reads `getValue(__rtParams, 'active', false)` — defaults `false`. Target: default `true` (run unless explicitly disabled).
- **Mid-flight `_rtNextStep` writes with the wrong key.** `dialGuard` and `appendLog` set `global[_rtNextStep]` before the output node — and read PascalCase Params `getValue(__rtParams, 'NextStep_Success', '')` / `getValue(__rtParams, 'NextStep', '')`, which never match the camelCase `nextStep_Success` / `nextStep` keys, so the lookups return `''`. The v2 contract resolves `_rtNextStep` **once** at `output` from `__rtOutcome` — remove both mid-flight writes; the dead PascalCase reads disappear with them.
- **`getGuards` stale branch key.** On guards-found, the body assigns `__rtOutcome = 'NextStep_Denied'` (PascalCase, not a catalogued branch). `hasGuards` routes into the dial loop by `__guardCount`, not by `__rtOutcome`, so this value is dead. Replace with `'nextStep'` (or drop — the seed value already covers it).
- **Commented-out `guardTui` eligibility block.** `getGuards` carries a large commented `guardTui`-shaped `.then()` (sets `__guardTuiEligible`, `NextStep_Denied`) copied from another component. Delete it — it is misleading dead text.
- **Bare `log_debug`.** `getGuards` calls `log_debug(...)` for URL / result tracing. Use `Logger.debug` per [conventions/logging.md](../../conventions/logging.md).
- **`dialGuard` not enforced.** The dial loop runs whenever `__guardCount > 0`; the Param is never read to skip dialing.
- **Notification prep missing.** The SMS/email body construction ([Notification body construction](#notification-body-construction)) is not implemented in script nodes yet — `rtSmsTo`, `rtSmsBody`, `rtEmailTo`, `rtEmailBody`, `rtEmailAttachment` are never written. The shipped `prepareMsg` only stores a voicemail transcript to `guardVoicemailTranscript` / `guardVoicemailRecorded`, not the report globals downstream `sendSms` / `sendMail` consume.
- **`canceled` outcome missing.** `__classifyRedirect` maps Party2 status `0/1/4` and "other → success" but has no caller-hangup (`canceled`) outcome to abort the loop early.
- **Empty guard list.** Shipped code exits to `nextStep` (proceed); the legacy handler routed to `nextStep_Failure`. Confirm intended product behaviour.
- **`outboundANI` casing in the component.** The shipped `__configJSON` declares `outboundAni` (camelCase), but the seed dictionary and every production flow use `outboundANI`. The importer's param-name check is case-sensitive, so the component default never lines up with a seeded Param. Rename the `__configJSON` key to `outboundANI`.
- **`timeout` units.** Shipped `jsonHttpRequest` is passed `getValue(__rtParams, 'timeout', 10000)` as milliseconds, but production flows seed `15` (intended as seconds). Confirm the unit and convert at the read site if flows mean seconds.
- **`acceptCallMenu` / `acceptCallMessage`.** Catalogued and seeded; the press-1-to-accept wiring in the NestedJob redirect node is not verified.
