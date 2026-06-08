# Spec Template — 1–3 Page Vocalls Operation Spec

The output of this skill. Total length target: **1–3 pages** (roughly
40–120 lines of markdown including blank lines). If you're over 3 pages,
re-apply [tool_filter.md](tool_filter.md) — you're including overhead.

The template below uses literal `<placeholders>` for fields you fill in.
Section budgets (in lines) are noted next to each heading.

The canonical reference for this exact shape is
[`rtds/specs/sendSms.spec.md`](../../../rtds/specs/sendSms.spec.md) — when in
doubt, mirror its section order, table columns, and code blocks.

---

## Frontmatter · required

Every spec opens with a YAML frontmatter block so the catalog generator
(`npm run gen:catalog`) can pick it up. `status:` is `implemented` (a
component exists) or `planned`. The `catalog:` block drives the row in
`rtds/docs/operations-catalog.md`.

```markdown
---
status: <implemented | planned>
catalog:
  operation: "<componentName>"
  legacy: false
  pattern: "`<http_call>`"
  component: "<componentName>.js"
  componentMark: "✅"            # ✅ if the component exists, ⏳ if planned
  runtimeCell: "JS twin `execute<Name>` (`<Name>_vocalls`)"  # or "—" if none
  seed: "✅"                      # ✅ if db_seed SQL exists, ⏳ otherwise
---
```

When generating from a handler that has **no** component yet, set
`status: planned`, `componentMark: ⏳`, and `seed: ⏳`.

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
| `Active`          | boolean                       | no       | `true`       | If falsy, the operation logs a skip and exits to `NextStep`. Default `true` (runs unless explicitly disabled with `Active: false`). See the Active-default note below. |
| `Routing`         | string                        | yes      | —            | SMS gateway routing token (provider-specific).                                                              |
| `From`            | string (E.164 or sender name) | yes      | —            | Sender identifier.                                                                                          |
| `To`              | string (E.164)                | yes      | —            | Recipient number. Validated against `__isMobileNumber` (see [http_call.md](../../rtds-vocalls-component-gen/references/operation_bodies/http_call.md)). |
| `Body`            | string (max 1600 chars)       | yes      | —            | Message body. `${name}` placeholders are resolved from `varObj`/`global` at init time by `__setupConfig`.   |
| `SmsAccountId`    | number                        | yes      | —            | RTDS account/identifier the operation posts against.                                                        |
```

Rules:

- One row per Param. Every Param the handler reads via `getValue(__rtParams, '<Key>')` is a row.
- `NextStep_*` keys are **outputs**, not inputs — they go in Section 3.
- The `Active` row is always first.
- Types use Vocalls casing — `string`, `boolean`, `number`, `string (semicolon-delimited list)`, `object`. Not "List of String" or "Numeric".
- Description is one sentence. Mention `${name}` placeholder resolution only if the Param holds operator-templated text.
- Default uses code-fence `\`...\`` for literal values, em-dash for "no default" (= required).
- If the handler reads a Param that has no clear business purpose (looks like a leftover), still list it — note "operator confirm" in the description.

**Active-default note.** The spec states the **target** convention: `Active`
defaults `true` (the operation runs unless explicitly disabled). Per
[conventions/params.md](../../../conventions/params.md), `__setupConfig` does
**not** default `Active` — the read site decides, and `Send`/`guard`-family
components historically default `false` in shipped code. When the shipped
component reads `getValue(__rtParams, 'Active', false)`, keep `true` in this
table and record the gap in the **Convention debt** section (see below), exactly
as [`sendSms.spec.md`](../../../rtds/specs/sendSms.spec.md) does. Don't silently
match the buggy default.

---

## Section 3 — Outputs (NextStep_* branches) · one row per branch, ≤ 15 lines

```markdown
### Outputs

| Branch key         | Taken when                                                       | Fallback |
| ------------------ | ---------------------------------------------------------------- | -------- |
| `NextStep`         | Operation is inactive (`Active` falsy) — skipped.                | `''`     |
| `NextStep_Success` | SMS gateway returned `success: true`.                            | `''`     |
| `NextStep_Failure` | Gateway returned a non-success or the HTTP call errored.         | `''`     |

The component stages the chosen outcome key into `__rtOutcome` and resolves it
**once** at the output node — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` —
with an empty-string fallback ([conventions/component-v2.md §7–§8](../../../conventions/component-v2.md)).
It never writes `_rtNextStep` mid-flight.
```

Rules:

- Order is always: `NextStep`, then `NextStep_Failure`, then operation-specific keys (`NextStep_Success`, `NextStep_True`, `NextStep_False`, `NextStep_Denied`, `NextStep_Transfer`, `NextStep_Disconnect`, `NextStep_Continue`, `NextStep_<State>`, …).
- "Taken when" is one short sentence. No PureConnect terminology.
- Fallback is what `getValue(__rtParams, __rtOutcome, '')` resolves to when the staged key's Param isn't present. Always `''` (empty string) — **never `-1`**.
- Always include the two-line "stages … resolves once at the output node" note after the table.

For **GUI-exit target operations**, the routing happens in two steps. The engine
(`prepareGuiHandoff`) emits the Type's **exit key**, which routes the call to the
target component on the canvas. That target is an ordinary v2 component: it stages
`__rtOutcome` and resolves to `_rtNextStep` at its own output node, exactly like an
HTTP-call component. The component **does not** `return` an exit key.

```markdown
### Outputs

Engine exit key (emitted by `prepareGuiHandoff`, routes to this component): `"guard_tui"`.

| Branch key         | Taken when                                          | Fallback |
| ------------------ | --------------------------------------------------- | -------- |
| `NextStep`         | Operation is inactive — skipped.                    | `''`     |
| `NextStep_Failure` | Eligibility/state lookup failed.                    | `''`     |
| `NextStep_Denied`  | Caller is not eligible.                             | `''`     |
```

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

## Section 5 — Component structure (init / script / output) · ≤ 40 lines

State the pattern (one line), then show the three node bodies — `init`,
`script` (work body), `output` — in the **v2 `__rtOutcome` staging contract**.
This mirrors the "Component structure" section of
[`sendSms.spec.md`](../../../rtds/specs/sendSms.spec.md). It is *not* the final
component XML — the [rtds-vocalls-component-gen](../../rtds-vocalls-component-gen/SKILL.md)
skill folds it into the master `Code` and emits the mxGraph — but the three
bodies must already be contract-correct.

```markdown
### Component structure

Pattern: `http_call` (see [operation_bodies/http_call.md](../../rtds-vocalls-component-gen/references/operation_bodies/http_call.md)).

`init` (seeds `__rtOutcome` to the did-nothing default `'NextStep'`; master `Variables` pre-seeds `'NextStep_Failure'` as the safety net):

\`\`\`js
__rtOutcome = 'NextStep';
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[<componentName>] config resolved', { params: __rtParams, outcome: __rtOutcome });
\`\`\`

`script` (work body) — stages `__rtOutcome`, never writes `_rtNextStep` mid-flight:

\`\`\`js
if (String(getValue(__rtParams, 'Active', true)).toLowerCase() !== 'true') {   // target: default true
    Logger.info('[<componentName>] skipped -- inactive', { outcome: __rtOutcome });
    return;
}

// ... precondition checks: warn + return, leaving __rtOutcome = 'NextStep' ...

__rtOutcome = 'NextStep_Failure';   // pivot before the network call

var __url = __rtBaseUrl + __rtEndpoint;
var __timeout = Number(getValue(__rtParams, 'Timeout', 10000));
var __payload = { /* fields from getValue(__rtParams, '<Key>', '') */ };

return jsonHttpRequest(__url, { method: 'POST', "timeout": __timeout }, _headers, __payload).then(
    function (result) {
        if (result && result.success === true) {
            __rtOutcome = 'NextStep_Success';
            Logger.info('[<componentName>] success', { outcome: __rtOutcome });
            return;
        }
        Logger.warn('[<componentName>] request failed', { statusCode: result && result.statusCode, outcome: __rtOutcome });
    },
    function (err) {
        Logger.error('[<componentName>] request error', { outcome: __rtOutcome }, err);
    }
);
\`\`\`

`output` (`OnEnter`) — resolves the staged outcome once:

\`\`\`js
_rtNextStep = getValue(__rtParams, __rtOutcome, '');
Logger.info('[<componentName>] exit', { outcome: __rtOutcome, nextStep: _rtNextStep });
\`\`\`
```

Rules — the v2 contract ([conventions/component-v2.md §6–§8](../../../conventions/component-v2.md)):

- **`init` seeds `__rtOutcome = 'NextStep'`** (the did-nothing default), then `__setupConfig`, the `_headers` guard, and a `Logger.debug` carrying `{ params, outcome }`.
- **`script` stages `__rtOutcome` only** — assign `__rtOutcome = '<NextStepKey>';` with a plain `=`, the literal Params key name, at most once per path. Active guard leaves `'NextStep'`; pivot to `'NextStep_Failure'` before any network call; success sets the chosen key. **Never write `_rtNextStep` (or `global[_rtNextStep]`) mid-flight.**
- **`output` resolves once** — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` (bare `_rtNextStep`, empty-string fallback), then the exit log carrying **both** `{ outcome, nextStep }`.
- Work-node logs carry `{ outcome: __rtOutcome }`, never `nextStep` (no step id exists until the output node).
- Both `.then` callbacks are populated for HTTP operations; the error callback is mandatory.
- Identifiers follow [terminology.md → Identifier discipline](terminology.md). Every `var` carries `__`.
- **Per-pattern endings:**
  - `gui_exit` *target* — same three-node shape; the engine emits the exit key via `prepareGuiHandoff`. The component **does not** `return` an exit key.
  - `condition` — the `script` stages `__rtOutcome = __isMatch ? 'NextStep_True' : 'NextStep_False';`; `output` resolves it the same way.
  - `flow_jump` — the `script` writes `context.session.variables.RTDS_sourceId` and stages its outcome key; `output` resolves as usual.

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

## Section 7 — Convention debt · only when the shipped component diverges · ≤ 8 lines

Include this section **only** when a component already exists
(`status: implemented`) and it diverges from the target contract this spec
states. The spec always documents the *target*; this section records where the
shipped code hasn't caught up yet, so the gap is tracked rather than silently
encoded. Omit the section entirely when the component is fully conformant or
doesn't exist yet.

```markdown
### Convention debt (flagged <YYYY-MM-DD>)

This spec states the **target** contract. The shipped `<componentName>.js` conforms except:

- **`Active` default.** The component reads `getValue(__rtParams, 'Active', false)` — default **false**. The target is **true** (run unless explicitly disabled). Change the component's Active guard to default `true` to match the convention.

Otherwise the component is conformant: v2 `__rtOutcome` staging, single-resolve at output with the `''` fallback.
```

The most common debt today is the `Active` default (shipped `Send`/`guard`
components default `false`; target is `true`). When the shipped component is
already fully conformant, replace the bullet list with a single line: *"The
shipped `<componentName>.js` is fully conformant — no debt."* and consider
dropping the section.

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
- **Stale outcome contract.** Writing `global[_rtNextStep] = …` mid-flight, a `-1` fallback, `Active` default `false`, or `return '<exit_key>'` for gui_exit. The current contract is `__rtOutcome` staging + a single `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` at the output node, `''` fallback, `Active` target `true`.
- **Logging the wrong field.** Work-node logs carry `{ outcome: __rtOutcome }`, not `{ nextStep }`. Only the exit log carries both.
