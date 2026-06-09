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

If both pass and `dialGuard` is true, the component enters the dial loop. After the loop completes — regardless of whether a guard answered — it may offer voicemail capture and prepares notification content in global session variables (`rtSmsTo`, `rtSmsBody`, `rtEmailTo`, `rtEmailBody`, `rtEmailAttachment`) for downstream `sendSms` and `sendMail` operations. It then exits with a routing step that tells the flow what happened next.

### Inputs (Params)

| Param name          | Type             | Required | Default | Description                                                                                                                                                                                                                                |
| ------------------- | ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `active`            | boolean          | no       | `true`  | If falsy, the operation logs a skip and exits to `nextStep`. **⚠ The shipped `getGuards` node reads `getValue(__rtParams, 'active', false)` — default `false`; flagged in [Convention debt](#convention-debt-flagged-2026-06-09).**                           |
| `configId`          | number           | yes      | —       | Guard configuration ID passed to the Guard Module API (`?guardConfigId=`). Determines which guard group is dialed.                                                                                                                         |
| `configName`        | string           | yes      | —       | Display name of the guard group. Used as the header line in SMS and email notification bodies. Supports `${name}` token substitution.                                                                                                      |
| `dialGuard`         | boolean          | yes      | —       | Whether to execute the dial loop. When `false`, skip dialing (notification preparation still runs when implemented). **⚠ Not yet read by the shipped dial-loop path — flagged in [Convention debt](#convention-debt-flagged-2026-06-09).**                    |
| `outboundANI`       | string           | no       | `""`    | Caller ID presented to guards on outbound NestedJob calls. Empty string uses platform default. **Casing is `outboundANI` (acronym uppercase) — matches the case-sensitive seed and production flows; do not write `outboundAni`.**          |
| `diversion`         | string           | no       | `""`    | Optional SIP diversion header value on outbound calls (`diversion:{__diversion}` redirect param).                                                                                                                                          |
| `onHoldAudioUrl`    | string (URL)     | no       | —       | Full URL of audio played to the inbound caller while each guard is being dialed.                                                                                                                                                           |
| `timeout`           | number           | no       | `10000` | Ring / HTTP timeout. Passed to `jsonHttpRequest` as milliseconds in the shipped component; production flows seed `15` (seconds) — confirm intended semantics at the read site.                                                             |
| `recordVoicemail`   | boolean          | no       | `false` | When true and no guard answered, offer the caller voicemail capture (recognize node, max ~60 s).                                                                                                                                           |
| `acceptCallMenu`    | boolean          | no       | `false` | When true, the guard must press 1 to accept after answering. **⚠ Param is catalogued and seeded; accept-menu wiring in the NestedJob redirect is not yet verified in the shipped graph — flagged in [Convention debt](#convention-debt-flagged-2026-06-09).** |
| `acceptCallMessage` | string           | no       | —       | TTS message played to the guard when `acceptCallMenu` is true (e.g. `"Press 1 to accept the call."`). Required when `acceptCallMenu` is true.                                                                                              |
| `sendSms`           | boolean          | no       | `false` | When true, populate `rtSmsTo` and `rtSmsBody` after the dial loop for a downstream `sendSms` operation. **⚠ Notification prep script not yet present in the shipped component — see [Convention debt](#convention-debt-flagged-2026-06-09).**                 |
| `sendMail`          | boolean          | no       | `false` | When true, populate `rtEmailTo` and `rtEmailBody` (and `rtEmailAttachment` when voicemail recorded) for a downstream `sendMail` operation. **⚠ Same as `sendSms`.**                                                                        |
| `nextStep`          | string (step ID) | yes      | —       | Default routing step. Seeded into `__rtOutcome` at `getGuards`. Returned when inactive, when no guards need dialing, or when all guards fail to answer.                                                                                     |
| `nextStep_Success`  | string (step ID) | yes      | —       | Continuation after a guard accepts the call. **⚠ Shipped `dialGuard` / `appendLog` read this Param as PascalCase `NextStep_Success` — won't resolve against the camelCase key; flagged in [Convention debt](#convention-debt-flagged-2026-06-09).** |
| `nextStep_Failure`  | string (step ID) | yes      | —       | Continuation after a fatal Guard API / transport error.                                                                                                                                                                                    |

### Outputs

| Branch key         | Taken when                                                                                                                           | Fallback |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `nextStep`         | Operation inactive; no active guards (shipped: proceeds without failure); all guards tried without success; or default fall-through. | `''`     |
| `nextStep_Success` | A guard answered and was classified as `success` by `__classifyRedirect`.                                                            | `''`     |
| `nextStep_Failure` | Guard API lookup failed (HTTP / transport error).                                                                                    | `''`     |

The component stages the chosen outcome key into `__rtOutcome` across its script nodes and resolves it **once** at the output node — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` ([conventions/component-v2.md](../../conventions/component-v2.md) §7–§8). **⚠ `dialGuard` and `appendLog` currently write `global[_rtNextStep]` mid-flight, and read PascalCase `NextStep_Success` / `NextStep` keys that don't match the camelCase Params — flagged in [Convention debt](#convention-debt-flagged-2026-06-09).**

### Global variables written

Populated for downstream `sendSms` / `sendMail` components. Values are **appended** across call legs when already set.

| Variable            | Type   | Populated when                               | Description                                                                                         |
| ------------------- | ------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `rtSmsTo`           | string | `sendSms` is true                            | Semicolon-separated mobile numbers. Guard who answered is excluded.                                 |
| `rtSmsBody`         | string | `sendSms` is true                            | SMS body: header (`configName` + caller) on first leg, then one block per dial attempt.             |
| `rtEmailTo`         | string | `sendMail` is true                           | Semicolon-separated email addresses. All guards included — no exclusion for the guard who answered. |
| `rtEmailBody`       | string | `sendMail` is true                           | Email body — same structure as SMS body.                                                            |
| `rtEmailAttachment` | string | `recordVoicemail` is true and audio captured | Path or reference to the voicemail recording for `sendMail` `files`.                                |

**Design contract** (from the PureConnect handler). The shipped Vocalls graph builds `__guardLog` but does not yet run the Step 6–7 notification scripts that write these globals.

### Internal variables (component-scoped)

| Variable             | Type       | Description                                                            |
| -------------------- | ---------- | ---------------------------------------------------------------------- |
| `__guardList`        | `object[]` | Guard records from the Guard API (`id`, `name`, `phone`, `email`, …).  |
| `__guardLog`         | `object[]` | Ordered dial-attempt records: `{ name, phone, email, time, outcome }`. |
| `__guardIndex`       | number     | Current index in the dial loop (counter node).                         |
| `__guardCount`       | number     | Length of `__guardList` after normalisation.                           |
| `__guardPickedUp`    | boolean    | Set true when `__classifyRedirect` returns `success`.                  |
| `__transferResult`   | object     | NestedJob redirect result (`ResultVariableName`).                      |
| `__voicemailCapture` | string     | Recognize-node capture for voicemail transcript / audio reference.     |

### External call

| Field        | Value                                                  |
| ------------ | ------------------------------------------------------ |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                           |
| Endpoint var | `_rtActiveGuardByConfigEndpoint` → `__rtGuardEndpoint` |
| Method       | `GET`                                                  |
| Query        | `?guardConfigId=` + `encodeURIComponent(configId)`     |
| Timeout      | `getValue(__rtParams, 'timeout', 10000)` ms            |

**Guard API path (as seeded in runtime `main.js`):**

`GET /digipolisapi-api-${environment}/api/Guard/GetAllCurrentActiveGuardsByGuardConfig`

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

Each guard dial attempt produces exactly one `outcome` in `__guardLog` (via `__classifyRedirect` on the NestedJob `__transferResult`):

| Outcome             | When it occurs                                         | Exits loop early             | Excluded from `rtSmsTo` |
| ------------------- | ------------------------------------------------------ | ---------------------------- | ----------------------- |
| `success`           | Guard answered and accepted (Party2 status not 0/1/4). | Yes — call stays with guard. | Yes                     |
| `no_reaction`       | Party2 status `4` — no answer within timeout.          | No                           | No                      |
| `rejected`          | Party2 status `1` — declined / not accepted.           | No                           | No                      |
| `rejected_voicebox` | Party2 status `0` — voicemail / voicebox.              | No                           | No                      |
| `unknown`           | Missing or malformed `__transferResult`.               | No                           | No                      |

`success` is the only outcome that sets `__guardPickedUp = true` and routes to `nextStep_Success`. All other outcomes advance `__guardIndex` and try the next guard. When the counter exhausts the list, execution continues to voicemail / notification / output.

### Processing logic

Ordered steps the operation performs. Steps marked **(design)** are specified in the PureConnect handler and this document; **(shipped)** reflects the current Vocalls graph.

| Step | Action                                                                                                                                                                                                                                                                           | Exit        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1    | **(shipped)** `init` — `__rtParams = __setupConfig(__configJSON)`; seed `__rtOutcome = 'nextStep'`.                                                                                                                                                                              | → 2         |
| 2    | **(shipped)** If `active` is falsy → log skip, keep `nextStep`.                                                                                                                                                                                                                  | STOP        |
| 3    | **(shipped)** `GET` active guard list by `configId`. On transport failure → `nextStep_Failure`. On empty array → `nextStep` (proceed without guard — **differs from legacy handler which used `nextStep_Failure`**).                                                             | STOP or → 4 |
| 4    | **(shipped)** `hasGuards` case: when `__guardCount > 0`, enter dial loop; otherwise jump to output.                                                                                                                                                                              | → 5 or STOP |
| 5    | **(shipped)** Dial loop (`guardLoop` counter): for each guard — play `onHoldAudioUrl`, NestedJob redirect to `__currentGuardPhone`, classify result, append `__guardLog`. On `success` → `nextStep_Success` and exit loop. **(design)** Skip entirely when `dialGuard` is false. | → 6         |
| 6    | **(design)** Voicemail — when `recordVoicemail` and no `success`, play prompt and capture audio; set `rtEmailAttachment` when audio length > 5 s. **(shipped)** `recordVoicemail` case + recognize node + `prepareMsg` stub present; attachment global not yet wired.            | → 7         |
| 7    | **(design)** SMS prep when `sendSms` — build `rtSmsTo` / `rtSmsBody` from `__guardLog`, exclude successful guard from SMS recipients.                                                                                                                                            | → 8         |
| 8    | **(design)** Email prep when `sendMail` — build `rtEmailTo` / `rtEmailBody`; all guard emails included.                                                                                                                                                                          | → 9         |
| 9    | **(shipped)** `output` — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`.                                                                                                                                                                                                  | STOP        |

#### Outcome reference

| Situation                       | `__rtOutcome` / branch |
| ------------------------------- | ---------------------- |
| Service inactive                | `nextStep`             |
| Guard API error                 | `nextStep_Failure`     |
| No active guards (shipped)      | `nextStep`             |
| All guards tried, none answered | `nextStep`             |
| A guard accepted the call       | `nextStep_Success`     |

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
if (String(getValue(__rtParams, "active", false)).toLowerCase() !== "true") {
  Logger.info("[guard] skipped -- inactive", { outcome: __rtOutcome });
  return;
}
__rtOutcome = "nextStep_Failure";
// GET __rtBaseUrl + __rtGuardEndpoint + '?guardConfigId=' + encodeURIComponent(configId)
// transport failure -> __rtOutcome stays 'nextStep_Failure'
// empty array       -> __rtOutcome = 'nextStep' (proceed, no guards)
// guards found      -> hasGuards case routes into the dial loop
```

> **⚠ Shipped divergences in this node, flagged in [Convention debt](#convention-debt-flagged-2026-06-09):** the `active` read defaults `false` (target `true`); on guards-found the body assigns `__rtOutcome = 'NextStep_Denied'` (PascalCase, uncatalogued — dead because `hasGuards` routes by `__guardCount`, not `__rtOutcome`); and the URL trace uses bare `log_debug`. A retired `guardTui`-shaped eligibility block is also left commented in the node — delete it.

`output` (`OnEnter`):

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
| Exit               | `Logger.info`                  | `[guardRouting] exit`                            |

**⚠** `getGuards` still calls bare `log_debug` for URL tracing — replace with `Logger.debug` per [conventions/logging.md](../../conventions/logging.md).

### Convention debt (flagged 2026-06-09)

This spec states the **target** contract. The shipped `guardRouting.js` graph diverges as follows — keep the target in the body above; fix the code to match:

- **`active` read fallback.** `getGuards` reads `getValue(__rtParams, 'active', false)` — defaults `false`. Target convention: default `true` (run unless explicitly disabled).
- **Mid-flight `_rtNextStep` writes with the wrong key.** `dialGuard` and `appendLog` set `global[_rtNextStep]` before the output node — and they read PascalCase Params `getValue(__rtParams, 'NextStep_Success', '')` / `getValue(__rtParams, 'NextStep', '')`, which never match the camelCase `nextStep_Success` / `nextStep` keys, so the lookups return `''`. The v2 contract resolves `_rtNextStep` **once** at `output` from `__rtOutcome` — remove both mid-flight writes; the dead PascalCase reads disappear with them.
- **`getGuards` stale branch key.** On guards-found, the body assigns `__rtOutcome = 'NextStep_Denied'` (PascalCase, not a catalogued branch). `hasGuards` routes into the dial loop by `__guardCount`, not by `__rtOutcome`, so this value is dead unless the loop falls through to `output` without a `success` — in which case it resolves to `''`. Remove the assignment.
- **Commented-out `guardTui` eligibility block.** `getGuards` carries a large commented `guardTui`-shaped `.then()` (sets `__guardTuiEligible`, `NextStep_Denied`) copied from another component. Delete it — it is misleading dead text.
- **Bare `log_debug`.** `getGuards` calls `log_debug(...)` for URL / result tracing. Use `Logger.debug` per [conventions/logging.md](../../conventions/logging.md).
- **`dialGuard` not enforced.** The dial loop runs whenever `__guardCount > 0`; the Param is never read to skip dialing.
- **Notification prep missing.** Steps 7–8 (`rtSmsTo`, `rtSmsBody`, `rtEmailTo`, `rtEmailBody`, `rtEmailAttachment`) are not implemented in script nodes yet; downstream `sendSms` / `sendMail` ops in production flows expect `${rtEmailTo}` etc. to be populated upstream.
- **Empty guard list.** Shipped code exits to `nextStep` (proceed); the legacy PureConnect handler routed to `nextStep_Failure`. Confirm intended product behaviour.
- **`outboundANI` casing in the component.** The shipped `__configJSON` declares `outboundAni` (camelCase), but the seed dictionary and every production flow use `outboundANI` (acronym uppercase). The importer's param-name check is case-sensitive, so the component default never lines up with a seeded Param. Rename the `__configJSON` key to `outboundANI`.
- **`acceptCallMenu` / `acceptCallMessage`.** Catalogued and seeded; NestedJob accept-menu wiring not verified in the current redirect node parameters.
- **`timeout` units.** Shipped `jsonHttpRequest` is passed `getValue(__rtParams, 'timeout', 10000)` as milliseconds, but production flows seed `15` (intended as seconds). A 15 ms HTTP timeout would fail every lookup — confirm the unit and convert at the read site if flows mean seconds.
