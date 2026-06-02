---
status: implemented
catalog:
  operation: "guardRouting"
  legacy: false
  pattern: "`http_call` + multi-node"
  component: "guardRouting.js"
  componentMark: "✅"
  runtimeCell: "GUI-exit `guard_routing` (via `Guard_vocalls`)"
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
| Component style | **Hand-built / Style B** — governed by [conventions/component-mxgraph.md](../../conventions/component-mxgraph.md), NOT the v2 four-node trunk. It diverges deliberately: an `input → getEnvironment component` entry, an embedded endpoint-config script node, and embedded auth / globalLibrary nodes. Do not hold it to the v2 skeleton. Open follow-ups: move the node-319 endpoint map into the env library; externalise the node-321 hardcoded client-IDs / token-URL / tenant-GUID. |

## Business purpose

Find an on-call guard willing to take the call. The runtime fetches the list of currently active guards for the configured pool, iterates through them, and for each:

1. Places an outbound call (with call analysis — detects busy / no-answer / answering machine).
2. Plays a menu prompt: "Press 1 to accept, 2 to decline."
3. On `1`, bridges the inbound caller through to the guard.
4. On `2`, busy, no-answer, or any failure, advances to the next guard.

If the entire list is exhausted, optionally records a voicemail, optionally sends an SMS and/or email to a fallback number/address, then falls through.

### Inputs (Params)

| Param name           | Type             | Required | Default | Description                                                                                                                          |
| -------------------- | ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Active`             | boolean          | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                            |
| `ConfigId`           | string           | yes      | —       | Guard pool identifier passed to the Guard API.                                                                                        |
| `DialGroup`          | string           | yes      | —       | Dial group (outbound line group) used to place calls to the guards.                                                                   |
| `Timeout`            | number (seconds) | no       | `30`    | Per-guard ring timeout before giving up on that guard and trying the next.                                                            |
| `RequestTimeout`     | number (ms)      | no       | `10000` | HTTP timeout when fetching the guard list.                                                                                            |
| `OnHoldAudio`        | string           | no       | `''`    | Audio asset played to the inbound caller while the runtime is dialling guards.                                                        |
| `SendSMS`            | boolean          | no       | `false` | If true and all guards declined / no-answered, send an SMS to a fallback number (Params on a downstream `SendSMS` operation).         |
| `SendMail`           | boolean          | no       | `false` | If true and all guards exhausted, send a notification email (Params on a downstream `SendEmail` operation).                           |
| `RecordVoicemail`    | boolean          | no       | `false` | If true and all guards exhausted, record a voicemail from the caller before continuing.                                               |
| `VoicemailPrompt`    | string           | no       | `''`    | Prompt played before voicemail recording.                                                                                              |
| `VoicemailMaxSecs`   | number           | no       | `120`   | Maximum voicemail duration in seconds.                                                                                                |
| `NextStep`           | string (step ID) | yes      | —       | Continuation when the operation is inactive, or all guards have been tried without success.                                           |
| `NextStep_Failure`   | string (step ID) | no       | `-1`    | Continuation on HTTP error fetching the guard list.                                                                                    |

### Outputs

| Branch key         | Taken when                                                                          | Fallback |
| ------------------ | ----------------------------------------------------------------------------------- | -------- |
| `NextStep`         | Operation inactive, or guard loop exhausted (with optional voicemail/SMS/email taken). | `-1`  |
| `NextStep_Failure` | HTTP error fetching the guard list.                                                  | `-1`     |

A successful guard accept ends the IVR session (the inbound caller is bridged to the guard's leg). There is no post-success branch.

### External call

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                        |
| Endpoint var | `_rtGuardEndpoint` → `__rtEndpoint`                 |
| Method       | `GET`                                              |
| Timeout      | `getValue(__rtParams, 'RequestTimeout', 10000)` ms |

URL shape: `__rtBaseUrl + __rtEndpoint + '/' + ConfigId + '/active'`.

Expected response:

```json
{
  "success": true,
  "statusCode": 200,
  "body": [
    { "id": "...", "phoneNumber": "+32...", "name": "..." },
    ...
  ]
}
```

### Component structure

Multi-node component (most complex in the operation catalog — borrows the shape from `guardTui` but extends it with an outbound dial + transfer per iteration).

- **input** → **init** → **fetch** (http_call to load the guard list) → **loop** (per-guard) → **dial-outbound** → **menu-prompt** → **dtmf-collect** → **case** (1 = transfer, 2/busy/RNA = next guard) → **transfer** (terminal) → **exhausted** (case node) → **voicemail / sendSMS / sendMail** (optional) → **output**.

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
__guardIndex = 0;
__guardList = [];
__guardId = '';
Logger.debug('[guardRouting] config resolved', { params: __rtParams });
```

`fetch` (work script):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[guardRouting] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __cfg = getValue(__rtParams, 'ConfigId', '');
if (!__cfg) { Logger.warn('[guardRouting] missing ConfigId', { nextStep: global[_rtNextStep] }); return; }

global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', -1);

var __url = __rtBaseUrl + __rtEndpoint + '/' + encodeURIComponent(__cfg) + '/active';
var __timeout = getValue(__rtParams, 'RequestTimeout', 10000);

return jsonHttpRequest(__url, { method: 'GET', "timeout": __timeout }, _headers, null).then(
    function (result) {
        if (!result || result.success !== true || !Array.isArray(result.response)) {
            Logger.warn('[guardRouting] fetch failed', { statusCode: result && result.statusCode, nextStep: global[_rtNextStep] });
            return;
        }
        __guardList = result.response;
        global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);
        Logger.info('[guardRouting] list ready', { count: __guardList.length, nextStep: global[_rtNextStep] });
    },
    function (err) { Logger.error('[guardRouting] fetch error', { nextStep: global[_rtNextStep] }, err); }
);
```

The dial / menu / transfer / loop logic is wired through the mxGraph's case nodes — the component-builder skill will materialise each as a separate `script` / `dtmf` / `case` / `say` node, similar to how `guardTui.js` is structured.

`output`:

```js
OnEnter: Logger.info('[guardRouting] exit', { nextStep: __rtNextStep });
```

### Open questions

- The source handler embeds a `SendSMS` / `SendMail` / `RecordVoicemail` post-call fallback. The Vocalls version treats these as flags that *enable* a downstream operation hop — i.e. when all guards are exhausted, the component sets `_rtNextStep` to a step ID the flow author has wired to a `sendSms`/`sendMail`/voicemail operation. Confirm this is preferred over folding the post-call behaviour into the GuardRouting component itself.
- The source handler's failover (Unknown Host / Timeout / Connection Failure → fallback path) wraps the entire HTTP call. The Vocalls work body collapses these into `NextStep_Failure`. Confirm whether the operator needs distinct branches for transient vs. permanent HTTP failures.
- The source handler also invokes `DialPlanEx` for outbound phone number normalisation. Confirm Vocalls' outbound dial step accepts E.164 directly or whether a number-normalisation helper is needed.
- Per-iteration call analysis (Busy / NoAnswer / Intercept / Machine / Fax / NoLines / Disconnect / Failure / Canceled / Declined) collapses to a single "next guard" branch in the spec. Confirm this is OK — the source handler may have operator-specific logging hooks per outcome that the Vocalls version should preserve via `Logger.info('[guardRouting] guard outcome', { outcome, guardId })`.
- This is the largest handler in scope (~2400 lines of XML). The first cut of the component will need a code-review pass to verify the mxGraph case/edge layout actually matches the loop semantics.
