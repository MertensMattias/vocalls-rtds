---
status: implemented
catalog:
  operation: "sendEmail"
  legacy: false
  pattern: "`http_call`"
  component: "sendMail.js"
  componentMark: "✅"
  runtimeCell: "JS twin `executeSendEmail` (`sendMail`)"
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
| `active`           | boolean                           | no       | `true`  | If falsy, the operation logs a skip and exits to `nextStep`. Default `true` (runs unless explicitly disabled). |
| `from`             | string (email address)            | yes      | —       | Sender address.                                                                                                                    |
| `to`               | string (`;`-separated emails)     | yes      | —       | Recipient list.                                                                                                                    |
| `cc`               | string (`;`-separated emails)     | no       | `''`    | CC recipients. Omitted from the payload when empty.                                                                                |
| `bcc`              | string (`;`-separated emails)     | no       | `''`    | BCC recipients. Omitted from the payload when empty.                                                                               |
| `subject`          | string                            | no       | `''`    | Email subject line.                                                                                                                |
| `body`             | string                            | no       | `''`    | Email body. May contain `${name}` placeholders resolved by `__setupConfig`.                                                        |
| `priority`         | number (1, 2, 3)                  | no       | `2`     | 1 = high, 2 = normal, 3 = low. Out-of-range values coerce to `2`.                                                                  |
| `files`            | string (`;`-separated file paths) | no       | `''`    | File-attachment paths. Each is checked with `fileExists` before sending; missing files are skipped silently.                       |
| `attachmentNames`  | string (`;`-separated filenames)  | no       | `''`    | Filenames matched 1:1 with `attachmentData` to form `{ fileName, fileData }` payload entries.                                       |
| `attachmentData`   | string (`;`-separated base64)     | no       | `''`    | Base64-encoded file payloads matched 1:1 with `attachmentNames`.                                                                    |
| `customerKey`      | string                            | no       | `''`    | Optional operator-supplied tracking key. Trimmed and omitted when empty.                                                            |
| `timeout`          | number (ms)                       | no       | `10000` | HTTP request timeout.                                                                                                              |
| `nextStep`         | string (step ID)                  | yes      | —       | Continuation when the operation is inactive or required fields are missing.                                                        |
| `nextStep_Success` | string (step ID)                  | yes      | —       | Continuation when the gateway returned `success: true`.                                                                            |
| `nextStep_Failure` | string (step ID)                  | yes      | —       | Continuation on any non-success or transport-level failure.                                                                        |

### Outputs

| Branch key         | Taken when                                                       | Fallback |
| ------------------ | ---------------------------------------------------------------- | -------- |
| `nextStep`         | Operation is inactive (skip — outcome stays `nextStep`).         | `''`     |
| `nextStep_Failure` | `from` empty, `to` empty, gateway non-success, or HTTP error.    | `''`     |
| `nextStep_Success` | Mail gateway returned `success: true`.                           | `''`     |

The component stages `__rtOutcome` and resolves it **once** at the output node — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` — empty-string fallback ([conventions/component-v2.md](../../conventions/component-v2.md) §7–§8). Note: validation failures (`from`/`to` empty) route to `nextStep_Failure`, not `nextStep` — the work body pivots to `nextStep_Failure` immediately after the Active guard.

### External call

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                        |
| Endpoint var | `_rtMailEndpoint` → `__rtEndpoint`                  |
| Method       | `POST`                                             |
| Timeout      | `getValue(__rtParams, 'timeout', 10000)` ms        |

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

`init` (seeds `__rtOutcome = 'nextStep'`; master `Variables` pre-seeds `'nextStep_Failure'`):

```js
__rtOutcome = 'nextStep';
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[sendMail] config resolved', { params: __rtParams, outcome: __rtOutcome });
```

`script` (work body) — `from` and `to` are validated **separately** (distinct warn logs); list payload fields are added only when `__splitSemicolonList` / helper returns non-`null` (empty input → `null`, so the key is dropped). Stages `__rtOutcome`, never writes `_rtNextStep` mid-flight:

```js
if (String(getValue(__rtParams, 'active', true)).toLowerCase() !== 'true') {   // target: default true
    Logger.info('[sendMail] skipped -- inactive', { outcome: __rtOutcome });
    return;
}

__rtOutcome = 'nextStep_Failure';

var __from = getValue(__rtParams, 'from', '');
if (!__from || String(__from).trim() === '') {
    Logger.warn('[sendMail] From field is empty', { outcome: __rtOutcome });
    return;
}

var __toList = __splitSemicolonList(getValue(__rtParams, 'to', ''));
if (__toList === null) {
    Logger.warn('[sendMail] To field is empty', { outcome: __rtOutcome });
    return;
}

var __ccList = __splitSemicolonList(getValue(__rtParams, 'cc', ''));
var __bccList = __splitSemicolonList(getValue(__rtParams, 'bcc', ''));
var __filesList = __resolveFilesList(getValue(__rtParams, 'files', ''));
var __attachmentsList = __buildAttachments(getValue(__rtParams, 'attachmentNames', ''), getValue(__rtParams, 'attachmentData', ''));

var __priority = Number(getValue(__rtParams, 'priority', 2));
if (__priority !== 1 && __priority !== 2 && __priority !== 3) __priority = 2;

var __customerKey = getValue(__rtParams, 'customerKey', '');
__customerKey = (__customerKey && String(__customerKey).trim() !== '') ? String(__customerKey).trim() : null;

var __url = __rtBaseUrl + __rtEndpoint;
var __payload = { from: __from, subject: getValue(__rtParams, 'subject', ''), to: __toList, body: getValue(__rtParams, 'body', ''), priority: __priority };
if (__ccList !== null) __payload.cc = __ccList;
if (__bccList !== null) __payload.bcc = __bccList;
if (__filesList !== null) __payload.files = __filesList;
if (__attachmentsList !== null) __payload.attachments = __attachmentsList;
if (__customerKey !== null) __payload.customerKey = __customerKey;

return jsonHttpRequest(__url, { method: 'POST', "timeout": Number(getValue(__rtParams, 'timeout', 10000)) }, _headers, __payload).then(
    function (result) {
        if (result && result.success === true) {
            __rtOutcome = 'nextStep_Success';
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

### Convention debt — resolved 2026-06-11

The `active`-default debt is **closed**: `sendMail.js` (and the runtime twin `executeSendEmail`) now read `getValue(__rtParams, 'active', true)`, matching this spec's target. The operation also now dispatches as an **inline JS twin** (registered via `registerRtdsOperation`), not a GUI exit — the canvas component remains the lockstep reference. Otherwise conformant: v2 `__rtOutcome` staging, single-resolve at output with the `''` fallback.

### Notes on naming

The component file is `sendMail.js` (without `e`) and the work body logs `[sendMail]`. The operation Type stays `SendEmail` (matching the source handler name). Keep this asymmetry on purpose — the component name has been locked in the codebase.
