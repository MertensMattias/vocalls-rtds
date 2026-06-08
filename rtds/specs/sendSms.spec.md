---
status: implemented
catalog:
  operation: "sendSms"
  legacy: false
  pattern: "`http_call`"
  component: "sendSms.js"
  componentMark: "✅"
  runtimeCell: "JS twin `executeSendSms` (`sendSms_vocalls`)"
  seed: "✅"
---

# Operation Spec — sendSms (SendSMS)

| Field          | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| Operation Type | `SendSMS`                                                   |
| Component name | `sendSms`                                                   |
| Pattern        | `http_call`                                                 |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_SendSMS.xml` |
| Target file    | `rtds/components/sendSms.js` (already exists — this spec is the reference shape) |

## Business purpose

Send an outbound SMS to a configured recipient via the RTDS SMS gateway. The flow uses this operation to notify a caller (or a third-party number) that a callback has been scheduled, to send a routing token the recipient can quote on a follow-up call, or to fan out broadcast messages from the IVR.

### Inputs (Params)

| Param name      | Type                          | Required | Default | Description                                                                                                |
| --------------- | ----------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `active`        | boolean                       | no       | `true`  | If falsy, the operation logs a skip and exits to `nextStep`. Default `true` (the operation runs unless explicitly disabled with `active: false`). **⚠ The shipped `sendSms.js` currently defaults `false` — flagged for a code fix; see [Convention debt](#convention-debt).** |
| `routing`       | string                        | yes      | —       | SMS gateway routing token (provider-specific, e.g. `LPA_DEV`).                                              |
| `from`          | string (E.164 or sender name) | yes      | —       | Sender identifier. Either an E.164 number or an alphanumeric short-code (e.g. `8850`).                      |
| `to`            | string (E.164)                | yes      | —       | Recipient number. Validated against `__isMobileNumber` before sending.                                     |
| `body`          | string (max 1600 chars)       | yes      | —       | Message body. `${name}` placeholders are resolved from `global` by `__setupConfig`.                         |
| `smsAccountId`  | number                        | yes      | —       | RTDS SMS account ID.                                                                                        |
| `timeout`       | number (ms)                   | no       | `10000` | HTTP request timeout.                                                                                       |
| `nextStep`      | string (step ID)              | yes      | —       | Continuation when the operation is inactive.                                                                |
| `nextStep_Success` | string (step ID)           | yes      | —       | Continuation when the gateway returned `success: true`.                                                     |
| `nextStep_Failure` | string (step ID)           | yes      | —       | Continuation on any non-success (invalid number, gateway error, or transport-level failure).                |

### Outputs

| Branch key         | Taken when                                                       | Fallback |
| ------------------ | ---------------------------------------------------------------- | -------- |
| `nextStep`         | Operation is inactive, or the `to` number is invalid (skip).     | `''`     |
| `nextStep_Success` | SMS gateway returned `success: true`.                            | `''`     |
| `nextStep_Failure` | Gateway returned a non-success or the HTTP call errored.         | `''`     |

The component stages the chosen outcome key into `__rtOutcome` and resolves it **once** at the output node — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` — with an empty-string fallback ([conventions/component-v2.md](../../conventions/component-v2.md) §7–§8). It never writes `_rtNextStep` mid-flight.

### External call

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                        |
| Endpoint var | `_rtSmsEndpoint` → `__rtEndpoint`                   |
| Method       | `POST`                                             |
| Timeout      | `getValue(__rtParams, 'timeout', 10000)` ms        |

Payload shape:

```json
{
  "smsAccountId": <SmsAccountId>,
  "routing":      "<Routing>",
  "from":         "<From>",
  "to":           "<To>",
  "content":      "<Body>",
  "plannedTime":  "<ISO-8601 UTC, from nowUTC()>"
}
```

Expected response: `{ "success": true | false, "statusCode": <number>, ... }`. Success branch is taken iff `result.success === true`.

### Component structure

Standard `http_call` shape (this is the canonical reference component).

`init` (seeds `__rtOutcome` to the did-nothing default `'nextStep'`; master `Variables` pre-seeds `'nextStep_Failure'` as the safety net):

```js
__rtOutcome = 'nextStep';
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[sendSms] config resolved', { params: __rtParams, outcome: __rtOutcome });
```

`script` (work body) — stages `__rtOutcome`, never writes `_rtNextStep` mid-flight:

```js
if (String(getValue(__rtParams, 'active', true)).toLowerCase() !== 'true') {   // target: default true
    Logger.info('[sendSms] skipped -- inactive', { outcome: __rtOutcome });
    return;
}

var __to = getValue(__rtParams, 'to', '');
if (!__to || !__isMobileNumber(__to)) {
    Logger.warn('[sendSms] invalid phone number', { to: __to, outcome: __rtOutcome });
    return;
}

__rtOutcome = 'nextStep_Failure';

var __url = __rtBaseUrl + __rtEndpoint;
var __method = 'POST';
var __timeout = Number(getValue(__rtParams, 'timeout', 10000));
var __payload = {
    smsAccountId: Number(getValue(__rtParams, 'smsAccountId', -1)),
    routing:      getValue(__rtParams, 'routing', ''),
    from:         getValue(__rtParams, 'from', ''),
    to:           __to,
    content:      getValue(__rtParams, 'body', ''),
    plannedTime:  nowUTC()
};

return jsonHttpRequest(__url, { method: __method, "timeout": __timeout }, _headers, __payload).then(
    function (result) {
        if (result && result.success === true) {
            __rtOutcome = 'nextStep_Success';
            Logger.info('[sendSms] success', { outcome: __rtOutcome });
            return;
        }
        Logger.warn('[sendSms] request failed', { statusCode: result && result.statusCode, outcome: __rtOutcome });
    },
    function (err) {
        Logger.error('[sendSms] request error', { outcome: __rtOutcome }, err);
    }
);
```

`output` (`OnEnter`) — resolves the staged outcome once:

```js
_rtNextStep = getValue(__rtParams, __rtOutcome, '');
Logger.info('[sendSms] exit', { outcome: __rtOutcome, nextStep: _rtNextStep });
```

### Convention debt (flagged 2026-06-08)

This spec states the **target** contract. The shipped `sendSms.js` conforms except:

- **`active` default.** The component reads `getValue(__rtParams, 'active', false)` — default **false**. The target is **true** (run unless explicitly disabled). Change the component's `active` guard to default `true` to match the convention.

Otherwise the component is conformant: v2 `__rtOutcome` staging, single-resolve at output with the `''` fallback.
