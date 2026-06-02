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
| `Active`        | boolean                       | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                  |
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
| `NextStep`         | Operation is inactive, or the `To` number is invalid (skip).     | `-1`     |
| `NextStep_Success` | SMS gateway returned `success: true`.                            | `-1`     |
| `NextStep_Failure` | Gateway returned a non-success or the HTTP call errored.         | `-1`     |

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

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[sendSms] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[sendSms] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __to = getValue(__rtParams, 'To', '');
if (!__to || !__isMobileNumber(__to)) {
    Logger.warn('[sendSms] invalid phone number', { to: __to, nextStep: global[_rtNextStep] });
    return;
}

global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', -1);

var __url = __rtBaseUrl + __rtEndpoint;
var __timeout = getValue(__rtParams, 'Timeout', 10000);
var __payload = {
    smsAccountId: Number(getValue(__rtParams, 'SmsAccountId', -1)),
    routing:      getValue(__rtParams, 'Routing', ''),
    from:         getValue(__rtParams, 'From', ''),
    to:           __to,
    content:      getValue(__rtParams, 'Body', ''),
    plannedTime:  nowUTC()
};

return jsonHttpRequest(__url, { method: 'POST', "timeout": __timeout }, _headers, __payload).then(
    function (result) {
        if (result && result.success === true) {
            global[_rtNextStep] = getValue(__rtParams, 'NextStep_Success', -1);
            Logger.info('[sendSms] success', { nextStep: global[_rtNextStep] });
            return;
        }
        Logger.warn('[sendSms] request failed', { statusCode: result && result.statusCode, nextStep: global[_rtNextStep] });
    },
    function (err) {
        Logger.error('[sendSms] request error', { nextStep: global[_rtNextStep] }, err);
    }
);
```

`output`:

```js
OnEnter: Logger.info('[sendSms] exit', { nextStep: __rtNextStep });
```

### Open questions

None — this spec captures the existing reference component verbatim.
