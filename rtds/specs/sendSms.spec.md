---
status: implemented
catalog:
  operation: "sendSms"
  legacy: false
  pattern: "`http_call`"
  component: "sendSms.js"
  componentMark: "✅"
  runtimeCell: "JS twin `executeSendSms` (`SendSms_vocalls`)"
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
| `Active`        | boolean                       | no       | `true`  | If falsy, the operation logs a skip and exits to `NextStep`. Default `true` (the operation runs unless explicitly disabled with `Active: false`). **⚠ The shipped `sendSms.js` currently defaults `false` — flagged for a code fix; see [Convention debt](#convention-debt).** |
| `Routing`       | string                        | yes      | —       | SMS gateway routing token (provider-specific, e.g. `LPA_DEV`).                                              |
| `From`          | string (E.164 or sender name) | yes      | —       | Sender identifier. Either an E.164 number or an alphanumeric short-code (e.g. `8850`).                      |
| `To`            | string (E.164)                | yes      | —       | Recipient number. Validated against `__isMobileNumber` before sending.                                     |
| `Body`          | string (max 1600 chars)       | yes      | —       | Message body. `${name}` placeholders are resolved from `global` by `__setupConfig`.                         |
| `SmsAccountId`  | number                        | yes      | —       | RTDS SMS account ID.                                                                                        |
| `Timeout`       | number (ms)                   | no       | `10000` | HTTP request timeout.                                                                                       |
| `NextStep`      | string (step ID)              | yes      | —       | Continuation when the operation is inactive.                                                                |
| `NextStep_Success` | string (step ID)           | yes      | —       | Continuation when the gateway returned `success: true`.                                                     |
| `NextStep_Failure` | string (step ID)           | yes      | —       | Continuation on any non-success (invalid number, gateway error, or transport-level failure).                |

### Outputs

| Branch key         | Taken when                                                       | Fallback |
| ------------------ | ---------------------------------------------------------------- | -------- |
| `NextStep`         | Operation is inactive, or the `To` number is invalid (skip).     | `''`     |
| `NextStep_Success` | SMS gateway returned `success: true`.                            | `''`     |
| `NextStep_Failure` | Gateway returned a non-success or the HTTP call errored.         | `''`     |

The component stages the chosen outcome key into `__rtOutcome` and resolves it **once** at the output node — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` — with an empty-string fallback ([conventions/component-v2.md](../../conventions/component-v2.md) §7–§8). It never writes `_rtNextStep` mid-flight.

### External call

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                        |
| Endpoint var | `_rtSmsEndpoint` → `__rtEndpoint`                   |
| Method       | `POST`                                             |
| Timeout      | `getValue(__rtParams, 'Timeout', 10000)` ms        |

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

`init` (seeds `__rtOutcome` to the did-nothing default `'NextStep'`; master `Variables` pre-seeds `'NextStep_Failure'` as the safety net):

```js
__rtOutcome = 'NextStep';
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[sendSms] config resolved', { params: __rtParams, outcome: __rtOutcome });
```

`script` (work body) — stages `__rtOutcome`, never writes `_rtNextStep` mid-flight:

```js
if (String(getValue(__rtParams, 'Active', true)).toLowerCase() !== 'true') {   // target: default true
    Logger.info('[sendSms] skipped -- inactive', { outcome: __rtOutcome });
    return;
}

var __to = getValue(__rtParams, 'To', '');
if (!__to || !__isMobileNumber(__to)) {
    Logger.warn('[sendSms] invalid phone number', { to: __to, outcome: __rtOutcome });
    return;
}

__rtOutcome = 'NextStep_Failure';

var __url = __rtBaseUrl + __rtEndpoint;
var __method = 'POST';
var __timeout = Number(getValue(__rtParams, 'Timeout', 10000));
var __payload = {
    smsAccountId: Number(getValue(__rtParams, 'SmsAccountId', -1)),
    routing:      getValue(__rtParams, 'Routing', ''),
    from:         getValue(__rtParams, 'From', ''),
    to:           __to,
    content:      getValue(__rtParams, 'Body', ''),
    plannedTime:  nowUTC()
};

return jsonHttpRequest(__url, { method: __method, "timeout": __timeout }, _headers, __payload).then(
    function (result) {
        if (result && result.success === true) {
            __rtOutcome = 'NextStep_Success';
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

- **`Active` default.** The component reads `getValue(__rtParams, 'Active', false)` — default **false**. The target is **true** (run unless explicitly disabled). Change the component's Active guard to default `true` to match the convention.

Otherwise the component is conformant: v2 `__rtOutcome` staging, single-resolve at output with the `''` fallback.
