# Operation Spec — sendMail (SendEmail)

| Field          | Value                                                         |
| -------------- | ------------------------------------------------------------- |
| Operation Type | `SendEmail`                                                   |
| Component name | `sendMail`                                                    |
| Pattern        | `http_call`                                                   |
| Source handler | `rtds_pureconnect_handlers/handlers/NAllo_RTDS_SendEmail.xml` |
| Target file    | `rtds_vocalls_operations/components/sendMail.js` (already exists — this spec is the reference shape) |

## Business purpose

Send an outbound email via the RTDS mail gateway with optional CC/BCC, file attachments, base64-encoded inline payloads, and a configurable priority. Used for notifications, summary emails, and after-call recap deliveries.

### Inputs (Params)

| Param name         | Type                              | Required | Default | Description                                                                                                                       |
| ------------------ | --------------------------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `Active`           | boolean                           | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                         |
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
| `NextStep`         | Operation is inactive, or `From`/`To` is empty (skip).           | `-1`     |
| `NextStep_Success` | Mail gateway returned `success: true`.                           | `-1`     |
| `NextStep_Failure` | Gateway returned a non-success or the HTTP call errored.         | `-1`     |

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

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[sendMail] config resolved', { params: __rtParams });
```

`script` (work body) — see the existing component at `rtds_vocalls_operations/components/sendMail.js` line 85. The body:

1. Pre-assigns `NextStep` as the skip outcome.
2. Skips on inactive.
3. Validates `From` is non-empty and `To` parses into a non-empty list (both → log warn + return on `NextStep`).
4. Pre-assigns `NextStep_Failure` before the network call.
5. Builds Cc / Bcc / Files / Attachments / CustomerKey conditionally — only adds the key to the payload when non-empty.
6. Coerces `Priority` to `1|2|3`, defaulting invalid values to `2`.
7. Issues `jsonHttpRequest`. Success branch on `result.success === true`; otherwise `Logger.warn` + leave the failure default; transport error → `Logger.error`.

`output`:

```js
OnEnter: Logger.info('[sendMail] exit', { nextStep: __rtNextStep });
```

### Open questions

None — this spec captures the existing reference component verbatim.

### Notes on naming

The component file is `sendMail.js` (without `e`) and the work body logs `[sendMail]`. The operation Type stays `SendEmail` (matching the source handler name). Keep this asymmetry on purpose — the component name has been locked in the codebase.
