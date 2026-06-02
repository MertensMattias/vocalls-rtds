# Spec Template — 1–3 Page Vocalls Operation Spec

The output of this skill. Total length target: **1–3 pages** (roughly
40–120 lines of markdown including blank lines). If you're over 3 pages,
re-apply [tool_filter.md](tool_filter.md) — you're including overhead.

The template below uses literal `<placeholders>` for fields you fill in.
Section budgets (in lines) are noted next to each heading.

---

```markdown
# Operation Spec — <componentName> (<OperationType>)

| Field              | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| Operation Type     | `<OperationType>`                                        |
| Component name     | `<componentName>` (camelCase)                            |
| Pattern            | `<http_call \| gui_exit \| set_attributes \| condition \| flow_jump>` (per [operation_bodies/INDEX.md](../../rtds-vocalls-component-gen/references/operation_bodies/INDEX.md)) |
| Source handler     | `rtds/pureconnect_handlers/NAllo_RTDS_<X>.xml`  |
| Target file        | `rtds/components/<componentName>.js`  |
```

Header is fixed at ~6 lines (the table). Don't add a blurb above or below.

---

## Section 1 — Business purpose · ~3–6 lines

> One paragraph. State the operator's reason for invoking this operation —
> what real-world thing happens when the flow reaches it. Don't describe
> the implementation. Don't mention PureConnect.

**Good:** "Send an outbound SMS to a configured recipient. The flow uses
this operation to notify a caller (or a third-party number) that a callback
has been scheduled, or to send a routing token the recipient can quote on
a follow-up call."

**Bad:** "The handler walks through 14 steps, starting with the Initiator,
reading the Active attribute, then doing a ReplaceAttributes call on the
Routing attribute, then …" (this is the XML, not the purpose).

---

## Section 2 — Inputs (Params) · ~one row per Param, ≤ 25 lines including header

```markdown
### Inputs (Params)

| Param name        | Type                          | Required | Default      | Description                                                                                                |
| ----------------- | ----------------------------- | -------- | ------------ | ---------------------------------------------------------------------------------------------------------- |
| `Active`          | boolean                       | no       | `false`      | If falsy, the operation logs a skip and exits to `NextStep`. Universal across all operations.              |
| `Routing`         | string                        | yes      | —            | SMS gateway routing token (provider-specific).                                                              |
| `From`            | string (E.164 or sender name) | yes      | —            | Sender identifier.                                                                                          |
| `To`              | string (E.164)                | yes      | —            | Recipient number. Validated against `__isMobileNumber` (see [http_call.md](../../rtds-vocalls-component-gen/references/operation_bodies/http_call.md)). |
| `Body`            | string (max 1600 chars)       | yes      | —            | Message body. Token resolution (`$(...)`) is applied by the runtime.                                        |
| `Reference`       | string                        | no       | `''`         | Optional operator-supplied reference, echoed in the gateway response.                                       |
```

Rules:

- One row per Param. Every Param the handler reads via `getValue(__rtParams, '<Key>')` is a row.
- `NextStep_*` keys are **outputs**, not inputs — they go in Section 3.
- The `Active` row is always first.
- Types use Vocalls casing — `string`, `boolean`, `number`, `string (pipe-delimited list)`, `object`. Not "List of String" or "Numeric".
- Description is one sentence. Mention token resolution only if relevant.
- Default uses code-fence `\`...\`` for literal values, em-dash for "no default" (= required).
- If the handler reads a Param that has no clear business purpose (looks like a leftover), still list it — note "operator confirm" in the description.

---

## Section 3 — Outputs (NextStep_* branches) · one row per branch, ≤ 15 lines

```markdown
### Outputs

| Branch key         | Taken when                                                       | Fallback if Param missing |
| ------------------ | ---------------------------------------------------------------- | ------------------------- |
| `NextStep`         | Operation is inactive (`Active` falsy) — skipped.                | `-1`                      |
| `NextStep_Success` | SMS gateway returned `success: true`.                            | `-1`                      |
| `NextStep_Failure` | Gateway returned a non-success or the HTTP call errored.         | `-1`                      |
```

Rules:

- Order is always: `NextStep`, then `NextStep_Failure`, then operation-specific keys (`NextStep_Success`, `NextStep_True`, `NextStep_False`, `NextStep_Transfer`, `NextStep_Disconnect`, `NextStep_Continue`, `NextStep_<State>`, …).
- "Taken when" is one short sentence. No PureConnect terminology.
- Fallback is what `getValue(__rtParams, '<Key>', -1)` resolves to when the Param isn't present. Almost always `-1`.

For **GUI-exit operations**, this section also names the exit-key string
the work body returns:

```markdown
### Outputs

Exit key returned to Vocalls: `"workgroup_transfer"`.

| Branch key  | Taken when                              | Fallback |
| ----------- | --------------------------------------- | -------- |
| `NextStep`  | Operation is inactive — skipped.        | `-1`     |
```

(GUI-exit operations route via the exit key, not by `NextStep_*`. They
only have the `NextStep` fallback for the inactive case.)

---

## Section 4 — External calls · only for `http_call` pattern, ≤ 12 lines

Omit this section entirely if the pattern is not `http_call`.

```markdown
### External call

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                        |
| Endpoint var | `_rtSmsEndpoint` → `__rtEndpoint`                   |
| Method       | `POST`                                             |
| Timeout      | `getValue(__rtParams, 'Timeout', 10000)` ms        |

Payload skeleton:

\`\`\`json
{
  "routing":   "<Routing>",
  "from":      "<From>",
  "to":        "<To>",
  "body":      "<Body>",
  "reference": "<Reference>"
}
\`\`\`

Expected response: `{ "success": true | false, "statusCode": <number>, ... }`.
Success branch is taken iff `result.success === true`.
```

Rules:

- Payload uses literal JSON; `<Param>` placeholders show which Param feeds which field.
- Don't include actual URLs unless the handler clearly states them. Use `_rt<TypePrefix>Endpoint` symbolically.
- If you don't know the response shape, write `Response: TBD — confirm with operator` and put a bullet under "Open questions".

---

## Section 5 — Pattern + work-body sketch · ≤ 25 lines

State the pattern (one line) and a tight JS sketch in Vocalls style:

```markdown
### Work-body sketch

Pattern: `http_call` (see [operation_bodies/http_call.md](../../rtds-vocalls-component-gen/references/operation_bodies/http_call.md)).

\`\`\`js
// Pre-assign the "skipped" default outcome.
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[sendSms] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

// Pre-assign failure before the network call.
global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', -1);

var __url = __rtBaseUrl + __rtEndpoint;
var __payload = {
    routing:   getValue(__rtParams, 'Routing'),
    from:      getValue(__rtParams, 'From'),
    to:        getValue(__rtParams, 'To'),
    body:      getValue(__rtParams, 'Body'),
    reference: getValue(__rtParams, 'Reference', '')
};

return jsonHttpRequest(__url, { method: 'POST', timeout: 10000 }, _headers, __payload).then(
    function (result) {
        if (result && result.success === true) {
            global[_rtNextStep] = getValue(__rtParams, 'NextStep_Success', -1);
            Logger.info('[sendSms] success', { nextStep: global[_rtNextStep] });
            return;
        }
        Logger.warn('[sendSms] gateway failure', {
            statusCode: result && result.statusCode,
            nextStep: global[_rtNextStep]
        });
    },
    function (err) {
        Logger.error('[sendSms] request error', { nextStep: global[_rtNextStep] }, err);
    }
);
\`\`\`
```

Rules:

- The sketch is **not** the final component — it's a sketch the component-builder skill will polish (add JSDoc, fold into the master `Code`, etc.).
- Identifiers must follow [terminology.md → Identifier discipline](terminology.md). Every `var` carries `__`.
- The three log lines are always present and always carry `nextStep`. No precondition logs.
- Both `.then` callbacks are populated for HTTP operations.
- For `gui_exit`, end with `return '<exit_key>';`.
- For `condition`, end with `global[_rtNextStep] = getValue(__rtParams, __isMatch ? 'NextStep_True' : 'NextStep_False', -1);`.
- For `flow_jump`, the sketch writes `context.session.variables.RTDS_sourceId` and signals re-entry.

---

## Section 6 — Open questions / divergences · ≤ 10 lines

```markdown
### Open questions

- The source handler calls `NAllo_RTDS_IVRLogging` as a subroutine; Vocalls
  has no subroutine equivalent. Confirm the operator wants the log line
  collapsed into `Logger.info(...)` rather than an explicit logging hop.
- The handler's `Reference` Param is read but never written into the
  payload in the source. Treating it as a payload field — please confirm.
- The retry policy is implicit in PureConnect (the engine retries on
  network failure). Vocalls does not retry — flag if this matters.
```

Use bullets. Each bullet is one question or one explicit divergence.

If everything translated cleanly, this section says:

```markdown
### Open questions

None.
```

---

## Validation gate

Before saving, re-read [terminology.md → Disallowed in spec prose](terminology.md).
The disallowed-word list is the easiest way to catch leakage.

## Anti-patterns in the spec

- **Step-by-step transcription.** The spec is a re-statement, not a translation.
- **Listing every variable in the `<Variables>` block.** Most are intermediate locals — they don't belong in Inputs.
- **Naming branches by PureConnect ExitPath labels** (`True`, `False`, `Success`, `Failure`) instead of by their `NextStep_*` key.
- **Writing the work-body sketch in PureConnect dialect** — `GetAt`, `Find`, `StrLen`, `Test()` are leaks.
- **Including `<Set Attribute>` writes for routing-scaffold keys** in the Outputs or Inputs table.
- **A 4+ page spec.** You're including overhead.
