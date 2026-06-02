---
name: vocalls-handler-spec
description: Translate a PureConnect Interaction Designer handler XML (e.g. `rtds/pureconnect_handlers/NAllo_RTDS_*.xml`) into a 1–3 page Vocalls-flavoured spec that captures the handler's business intent, inputs, outputs, branches, and any external calls — using Vocalls component terminology (Type, Params, NextStep_*, GUI-exit key, __rtParams, __rtNextStep, getValue, walk, _rtBaseUrl). The output is consumable as the input to the sibling `rtds-vocalls-component-gen` skill. Trigger this skill whenever the user points at a PureConnect handler XML and asks for a spec, a summary, a "translation", an "RTDS spec", a "component spec", a "design doc", an "input for the component builder", or says "I want to port this handler to Vocalls". Also trigger on phrasings like "decode this handler", "what does this handler do", "extract the logic from this handler XML", or "give me the Vocalls version" when the source is a PureConnect handler. Do not trigger on Vocalls XML components (`rtds/components/*.js`) — those go through the rtds-vocalls-component-gen skill directly.
---

# Vocalls Handler Spec Generator

This skill consumes a single PureConnect Interaction Designer handler XML
file and emits a **1–3 page spec** that re-states the handler's purpose in
Vocalls terminology. The spec is meant to feed the
[rtds-vocalls-component-gen](../rtds-vocalls-component-gen/SKILL.md)
skill, so the section headings, identifier names, and concepts must already
match what that skill expects.

The skill is **not** a line-by-line XML translator. It filters out
PureConnect plumbing, recognises the recurring idioms, and tells the reader
what the handler *means* — not what each `<Step>` does.

## When to use this skill

Trigger when the user:

- Points at a file in `rtds/pureconnect_handlers/` (e.g.
  `NAllo_RTDS_SendSMS.xml`, `NAllo_RTDS_Disconnect.xml`) and asks for a
  spec, summary, design doc, or "translation".
- Says "port this handler to Vocalls", "give me the Vocalls version",
  "extract the logic", "what does this handler do".
- Wants the input artifact for `rtds-vocalls-component-gen` and starts
  with a PureConnect handler rather than a fresh design.

Do **not** trigger when:

- The source is already a Vocalls component XML (`rtds/components/*.js`) — that's the component-builder skill's input shape, not ours.
- The user wants the actual Vocalls component XML emitted — chain to
  `rtds-vocalls-component-gen` after the spec is approved.

## Reading order

Load files lazily — never read every reference. The order below is the
default sequence; skip files that don't apply to the handler in front of
you.

**Always (every invocation)**

1. [references/handler_anatomy.md](references/handler_anatomy.md) — what a handler XML contains and how to walk it efficiently (Initiator → ExitPaths → Steps).
2. [references/tool_filter.md](references/tool_filter.md) — the PureConnect overhead list. Filter aggressively before reading.
3. [references/pattern_recognition.md](references/pattern_recognition.md) — recurring idioms (lsAttrNames/lsAttrValues lookup, `$(TOKEN)`, Active=Yes? guard, ReplaceAttributes round-trip, ExitPaths fan-out) and what they really mean.
4. [references/tool_to_vocalls_type.md](references/tool_to_vocalls_type.md) — the mapping table from PureConnect `creatorName` → Vocalls operation Type and the Params each Type carries.
5. [references/terminology.md](references/terminology.md) — the Vocalls vocabulary the spec MUST use.
6. [references/spec_template.md](references/spec_template.md) — the 1–3 page output template with section budgets.

**Reference only (rarely needed)**

- [references/example_disconnect_spec.md](references/example_disconnect_spec.md) — worked example from `NAllo_RTDS_Disconnect.xml`. Consult for tone/length calibration only.

## Core inputs

Read or ask the user for these before generating:

1. **Handler XML path** — typically `rtds/pureconnect_handlers/NAllo_RTDS_<Name>.xml`. The skill operates on exactly one file at a time.
2. **Target operation Type** (optional) — if the user already knows which Vocalls Type the handler maps to (e.g. `SendSMS`, `Condition`), accept it. Otherwise derive it from the handler name + the mapping table.
3. **Out-of-band context** (optional) — the user may attach a brief, a Lucidchart export, or a previous spec that explains *why* the handler exists. Use it to fill the "Business purpose" section if the XML alone is ambiguous.

If the handler is small (< 100 lines) and the Type is unambiguous, generate the spec without asking. For ambiguous handlers (`Guard*`, `Events`, anything with cross-handler subroutine fan-out), ask the user to confirm the target Type before generating.

## Process

### Step 1 — Triage the XML

Open the handler with `Read`. Look at:

- **`<Handler name="..." category="...">`** — handler name. Strip the
  `NAllo_RTDS_` prefix → that's the candidate Vocalls Type (e.g.
  `NAllo_RTDS_SendSMS` → `SendSMS`). Confirm against
  [tool_to_vocalls_type.md](references/tool_to_vocalls_type.md).
- **Initiator step (`type="Initiator"`)** — its `<Parameters>` block lists the handler's **inputs**. These map directly to the Vocalls Params object. The standard PureConnect signature `(Interaction Id, lsAttrNames, lsAttrValues, p_sNextStep, ...)` is **plumbing** — only the operation-specific extras matter (e.g. SendSMS adds `p_bNextStepForced`; FlowJump adds `p_sDsPath` + `bFirstOperationId`).
- **`<Variables>` block** — anything beginning with `p_` is a parameter alias; anything starting with `ls`/`s`/`b` is a local; anything starting with `c_s` is a constant (e.g. `c_sDsRtPath`). Constants matter for the spec; locals usually don't.
- **Step count** — `<Step>` element count gives a rough complexity gauge. < 10 = trivial; 10–30 = standard; > 30 = complex flow (likely fans out via subroutines).

### Step 2 — Filter out the overhead

Apply [tool_filter.md](references/tool_filter.md). Drop every step that is:

- Logging plumbing — `Log Message`, `Notify Debugger`, `IVRLogging` subroutine calls used purely for tracing.
- Routing scaffolding — `Set Attribute` calls writing `ATTR_AttendantProfile`, `RTDS_Path`, `RTDS_ProjectId`, `RTDS_ProjectName`, `RTDS_PromptLibrary`, `RTDS_SupportedLanguages`, `CallLog`. These belong to the legacy PureConnect routing model and have no Vocalls equivalent (Vocalls handles routing via `context.session.variables` directly).
- Variable shuffling — `Assignment` steps that just rename `p_*` to local vars, or vice versa.
- `Parse String` / `ReplaceAttributes` round-trips used purely to dereference `$(TOKEN)` placeholders — these collapse to a single Vocalls `getValue` + `resolveTokens` call.
- `GetDsAttrs` / `GetDsAttr` calls against `c_sDsRtPath` — that's PureConnect's directory-services routing-table lookup, which is replaced by the Vocalls RTDS API entirely.

What remains after filtering is the **business logic**: validations,
external HTTP calls, branch comparisons, GUI handoffs, and the
`NextStep_*` mapping.

### Step 3 — Recognise the pattern

With the filtered steps in hand, pick one of the five Vocalls operation
patterns from
[`../rtds-vocalls-component-gen/references/operation_bodies/INDEX.md`](../rtds-vocalls-component-gen/references/operation_bodies/INDEX.md):

| If the filtered handler does this …                         | Vocalls pattern  |
| ----------------------------------------------------------- | ---------------- |
| Calls an external HTTP endpoint (SMS, REST, schedule, …)    | `http_call`      |
| Writes Params and hands off to a downstream GUI node        | `gui_exit`       |
| Reads Params and writes them to session variables           | `set_attributes` |
| Picks True/False based on a comparison                      | `condition`      |
| Mutates session-level routing state (jump to another flow)  | `flow_jump`      |

Use the heuristic in
[pattern_recognition.md](references/pattern_recognition.md) when more than
one pattern looks plausible.

### Step 4 — Derive Params + branches

Walk the filtered tree once more and collect:

- **Params** — every key the handler reads via the `GetAt(p_lsAttrValues, Find(p_lsAttrNames, "Key", 0))` idiom is a Vocalls Param. Note the type if obvious (`StrLen` → string, `Test(...)` → boolean, `StrEqlNoCase` → string equality, etc.). The `Active` Param is on most handlers — keep it.
- **Branches** — every `<ExitPath>` of an Initiator-reachable step with `targetStepID=""` (terminal) or a path that loops back to the Initiator-output corresponds to a Vocalls `NextStep_*` key. The two universal ones are `NextStep` (default success) and `NextStep_Failure` (catch-all). HTTP operations typically add `NextStep_Success`. Condition/CheckAttribute add `NextStep_True` / `NextStep_False`. Emergency uses `NextStep_Transfer`, `NextStep_Disconnect`, `NextStep_Continue`, `NextStep_Failure`.
- **External calls** — note the base URL constant (typically `c_sBaseUrl`-shaped) and the endpoint name. In Vocalls these become `__rtBaseUrl` + `__rt<TypePrefix>Endpoint`.

### Step 5 — Write the spec

Follow [spec_template.md](references/spec_template.md). The template is
1–3 pages with fixed section budgets:

1. **Header** — name, target Type, source handler path, pattern. ~6 lines.
2. **Business purpose** — one paragraph. Why this handler exists from the operator's perspective.
3. **Inputs (Params)** — table: Param name, type, required, description, default. One row per Param. **No PureConnect-isms** — don't mention `lsAttrValues` or `GetAt`.
4. **Outputs (NextStep_* keys)** — table: branch key, when taken, default if missing. Always start with `NextStep` then `NextStep_Failure`, then the operation-specific keys.
5. **External calls** — only if pattern is `http_call`. URL shape, method, payload skeleton, expected `result` shape. Skip section otherwise.
6. **Pattern + work-body sketch** — name the pattern from
   [operation_bodies/INDEX.md](../rtds-vocalls-component-gen/references/operation_bodies/INDEX.md), then a 5–15 line JS sketch in Vocalls style (`getValue(__rtParams, …)`, `global[_rtNextStep] = …`, `Logger.info('[<componentName>] …', { nextStep: … })`). This is *not* the final component code — it's enough for the rtds-vocalls-component-gen skill to take it from here.
7. **Open questions / divergences from the source** — bullet list. Anything in the PureConnect handler that doesn't have a clean Vocalls equivalent, anything you skipped on purpose, anything the user needs to confirm.

**Length discipline.** 1–3 pages, *not* a full handler dump. If you find
yourself approaching 4 pages, you're including PureConnect plumbing —
re-apply Step 2.

### Step 6 — Validate

Sweep the draft against [terminology.md](references/terminology.md).
Quick check:

- No mention of `lsAttrNames`, `lsAttrValues`, `GetAt`, `Find`, `StrEqlNoCase`, `Test()`, `StrLen`, `c_sDsRtPath`, `ATTR_*`, `CallLog`, `Notify Debugger`, `ReplaceAttributes`, `Parse String`, `Assignment`, `creatorModule`, `creatorName`, "Step ID", "Initiator", "Subroutine" (the PureConnect kind).
- All identifiers carry the right Vocalls prefix per
  [naming.md](../rtds-vocalls-component-gen/conventions/naming.md):
  `__rtParams`, `__rtBaseUrl`, `__rtEndpoint`, `__rtNextStep`,
  `__configJSON`, `_rtNextStep`, `_rtBaseUrl`, `_headers`.
- Every NextStep key is named (no "and a few other branches…").
- Pattern matches the table in
  [operation_bodies/INDEX.md](../rtds-vocalls-component-gen/references/operation_bodies/INDEX.md).
- Logger lines (if shown in the sketch) carry `{ nextStep: … }`.

## Output

Save the generated spec to the user's workspace at:

- `rtds/specs/<componentName>.spec.md` (sibling of the future component output under `rtds/components/`)

Use camelCase `<componentName>` (e.g. `sendSms`, `disconnect`, `flowJump`)
matching the convention from
[naming.md](../rtds-vocalls-component-gen/conventions/naming.md).
Ask before overwriting an existing spec.

Provide a path link to the saved file. If the user asks "now build the
component", chain to
[rtds-vocalls-component-gen](../rtds-vocalls-component-gen/SKILL.md).

## Things to avoid

- **Don't transcribe the handler step-by-step.** The spec is a re-statement, not a translation. If the spec reads like an annotated XML dump, you've kept the plumbing.
- **Don't invent Params.** If a key isn't read in the handler, it's not a Param. List unknowns in "Open questions" instead.
- **Don't invent endpoint URLs or HTTP payloads.** Derive them from the handler's HTTP step (if any) or mark them as "TBD — confirm with operator".
- **Don't use PureConnect terminology** in the spec body — that's the whole point of this skill. The PureConnect names appear *only* in the header ("Source handler" path) and the "Open questions" section if there's an unresolvable divergence.
- **Don't exceed 3 pages.** If you're over, you're including overhead.
- **Don't emit Vocalls component XML.** That's the next skill's job. This skill outputs only the spec.
- **Don't load `references/example_disconnect_spec.md` by default** — only when you need calibration.

## File layout

```
vocalls-handler-spec/
├── SKILL.md                          (this file)
└── references/
    ├── handler_anatomy.md            How to walk a PureConnect handler XML efficiently
    ├── tool_filter.md                The overhead-drop list (logging, ATTR_*, ReplaceAttributes, GetDsAttrs, ...)
    ├── pattern_recognition.md        Recurring idioms and what they really mean
    ├── tool_to_vocalls_type.md       Mapping table: creatorName → Vocalls operation Type
    ├── terminology.md                Vocalls vocabulary the spec MUST use
    ├── spec_template.md              1–3 page output template
    └── example_disconnect_spec.md    Worked example (calibration only)
```
