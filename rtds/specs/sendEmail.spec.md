---
status: implemented
catalog:
  operation: "sendEmail"
  legacy: false
  pattern: "`http_call`"
  component: "sendMail.js"
  componentMark: "✅"
  runtimeCell: "JS twin `executeSendEmail` (`SendMail_vocalls`)"
  seed: "✅"
---

# Operation Spec — sendMail (SendEmail)

| Field          | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| Operation Type | `SendEmail`                                                   |
| Component name | `sendMail`                                                    |
| Pattern        | `http_call`                                                   |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_SendEmail.xml` |
| Target file    | `rtds/components/sendMail.js` (already exists — this spec is the reference shape) |

## Business purpose

Send an outbound email via the RTDS mail gateway with optional CC/BCC, file attachments, base64-encoded inline payloads, and a configurable priority. Used for notifications, summary emails, and after-call recap deliveries.

### Inputs (Params)

| Param name         | Type                              | Required | Default | Description                                                                                                                       |
| ------------------ | --------------------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Active`           | boolean                           | no       | `true`  | If falsy, the operation logs a skip and exits to `NextStep`. Default `true` (runs unless explicitly disabled). **⚠ The shipped `sendMail.js` currently defaults `false` — flagged for a code fix; see [Convention debt](#convention-debt).** |
| `From`             | string (email address)            | yes      | —       | Sender address.                                                                                                                    |
| `To`               | string (`;`-separated emails)     | yes      | —       | Recipient list.                                                                                                                    |
| `Cc`               | string (`;`-separated emails)     | no       | `''`    | CC recipients. Omitted from the payload when empty.                                                                                |
| `Bcc`              | string (`;`-separated emails)     | no       | `''`    | BCC recipients. Omitted from the payload when empty.                                                                               |
| `Subject`          | string                            | no       | `''`    | Email subject line.                                                                                                                |
| `Body`             | string                            | no       | `''`    | Email body. May contain `${name}` placeholders resolved by `__setupConfig`.                                                        |
| `Priority`         | number (1, 2, 3)                  | no       | `2`     | 1 = high, 2 = normal, 3 = low. Out-of-range values coerce to `2`.                                                                  |
| `Files`            | string (`;`-separated file paths) | no       | `''`    | File-attachment paths. Each is checked with `fileExists` before sending; missing files are skipped silently.                       |
| `AttachmentNames`  | string (`;`-separated filenames)  | no       | `''`    | Filenames matched 1:1 with `AttachmentData` to form `{ fileName, fileData }` payload entries.                                       |
| `AttachmentData`   | string (`;`-separated base64)     | no       | `''`    | Base64-encoded file payloads matched 1:1 with `AttachmentNames`.                                                                    |
| `CustomerKey`      | string                            | no       | `''`    | Optional operator-supplied tracking key. Trimmed and omitted when empty.                                                            |
| `Timeout`          | number (ms)                       | no       | `10000` | HTTP request timeout.                                                                                                              |
| `NextStep`         | string (step ID)                  | yes      | —       | Continuation when the operation is inactive or required fields are missing.                                                        |
| `NextStep_Success` | string (step ID)                  | yes      | —       | Continuation when the gateway returned `success: true`.                                                                            |
| `NextStep_Failure` | string (step ID)                  | yes      | —       | Continuation on any non-success or transport-level failure.                                                                        |

### Outputs

| Branch key         | Taken when                                                       | Fallback |
| ------------------ | ---------------------------------------------------------------- | -------- |
| `NextStep`         | Operation is inactive (skip — outcome stays `NextStep`).         | `''`     |
| `NextStep_Failure` | `From` empty, `To` empty, gateway non-success, or HTTP error.    | `''`     |
| `NextStep_Success` | Mail gateway returned `success: true`.                           | `''`     |

The component stages `__rtOutcome` and resolves it **once** at the output node — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` — empty-string fallback ([conventions/component-v2.md](../../conventions/component-v2.md) §7–§8). Note: validation failures (`From`/`To` empty) route to `NextStep_Failure`, not `NextStep` — the work body pivots to `NextStep_Failure` immediately after the Active guard.

### External call

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                        |
| Endpoint var | `_rtMailEndpoint` → `__rtEndpoint`                  |
| Method       | `POST`                                             |
| Timeout      | `getValue(__rtParams, 'Timeout', 10000)` ms        |

Payload shape (omitted keys are dropped, not sent as empty):

```json
{
  "from":        "<From>",
  "subject":     "<Subject>",
  "to":          ["<email1>", "<email2>"],
  "body":        "<Body>",
  "priority":    <1|2|3>,
  "cc":          ["..."],
  "bcc":         ["..."],
  "files":       ["/path/that/exists.pdf"],
  "attachments": [{ "fileName": "...", "fileData": "<base64>" }],
  "customerKey": "<trimmed value>"
}
```

### Component structure

Standard `http_call` shape. The component declares three helpers in the master `Code` block: `__splitSemicolonList`, `__buildAttachments`, and `__resolveFilesList`.

`init` (seeds `__rtOutcome = 'NextStep'`; master `Variables` pre-seeds `'NextStep_Failure'`):

```js
__rtOutcome = 'NextStep';
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[sendMail] config resolved', { params: __rtParams, outcome: __rtOutcome });
```

`script` (work body) — `From` and `To` are validated **separately** (distinct warn logs); list payload fields are added only when `__splitSemicolonList` / helper returns non-`null` (empty input → `null`, so the key is dropped). Stages `__rtOutcome`, never writes `_rtNextStep` mid-flight:

```js
if (String(getValue(__rtParams, 'Active', true)).toLowerCase() !== 'true') {   // target: default true
    Logger.info('[sendMail] skipped -- inactive', { outcome: __rtOutcome });
    return;
}

__rtOutcome = 'NextStep_Failure';

var __from = getValue(__rtParams, 'From', '');
if (!__from || String(__from).trim() === '') {
    Logger.warn('[sendMail] From field is empty', { outcome: __rtOutcome });
    return;
}

var __toList = __splitSemicolonList(getValue(__rtParams, 'To', ''));
if (__toList === null) {
    Logger.warn('[sendMail] To field is empty', { outcome: __rtOutcome });
    return;
}

var __ccList = __splitSemicolonList(getValue(__rtParams, 'Cc', ''));
var __bccList = __splitSemicolonList(getValue(__rtParams, 'Bcc', ''));
var __filesList = __resolveFilesList(getValue(__rtParams, 'Files', ''));
var __attachmentsList = __buildAttachments(getValue(__rtParams, 'AttachmentNames', ''), getValue(__rtParams, 'AttachmentData', ''));

var __priority = Number(getValue(__rtParams, 'Priority', 2));
if (__priority !== 1 && __priority !== 2 && __priority !== 3) __priority = 2;

var __customerKey = getValue(__rtParams, 'CustomerKey', '');
__customerKey = (__customerKey && String(__customerKey).trim() !== '') ? String(__customerKey).trim() : null;

var __url = __rtBaseUrl + __rtEndpoint;
var __payload = { from: __from, subject: getValue(__rtParams, 'Subject', ''), to: __toList, body: getValue(__rtParams, 'Body', ''), priority: __priority };
if (__ccList !== null) __payload.cc = __ccList;
if (__bccList !== null) __payload.bcc = __bccList;
if (__filesList !== null) __payload.files = __filesList;
if (__attachmentsList !== null) __payload.attachments = __attachmentsList;
if (__customerKey !== null) __payload.customerKey = __customerKey;

return jsonHttpRequest(__url, { method: 'POST', "timeout": Number(getValue(__rtParams, 'Timeout', 10000)) }, _headers, __payload).then(
    function (result) {
        if (result && result.success === true) {
            __rtOutcome = 'NextStep_Success';
            Logger.info('[sendMail] success', { outcome: __rtOutcome });
            return;
        }
        Logger.warn('[sendMail] request failed', { statusCode: result && result.statusCode, outcome: __rtOutcome });
    },
    function (err) {
        Logger.error('[sendMail] request error', { outcome: __rtOutcome }, err);
    }
);
```

`output` (`OnEnter`):

```js
_rtNextStep = getValue(__rtParams, __rtOutcome, '');
Logger.info('[sendMail] exit', { outcome: __rtOutcome, nextStep: _rtNextStep });
```

### Convention debt (flagged 2026-06-08)

This spec states the **target** contract. The shipped `sendMail.js` conforms except:

- **`Active` default.** The component reads `getValue(__rtParams, 'Active', false)` — default **false**. The target is **true**. Change the component's Active guard to default `true`.

Otherwise conformant: v2 `__rtOutcome` staging, single-resolve at output with the `''` fallback.

### Notes on naming

The component file is `sendMail.js` (without `e`) and the work body logs `[sendMail]`. The operation Type stays `SendEmail` (matching the source handler name). Keep this asymmetry on purpose — the component name has been locked in the codebase.
