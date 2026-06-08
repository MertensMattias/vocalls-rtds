---
name: vocalls-handler-spec
description: Produce or refresh a Vocalls-flavoured RTDS operation spec (e.g. `rtds/specs/sendSms.spec.md`) in the current `__rtOutcome` staging contract. Two modes. CREATE mode translates a PureConnect Interaction Designer handler XML (`rtds/pureconnect_handlers/NAllo_RTDS_*.xml`) into a 1–3 page spec capturing business intent, Params, NextStep_* outputs, external calls, and the init/script/output component structure. UPDATE mode takes an existing `rtds/specs/*.spec.md` and rewrites it to the latest conventions and standards — fixing stale forms (`global[_rtNextStep]` mid-flight, `-1` fallback, `Active` default false, `return '<exit_key>'`) and adding a Convention-debt note where the shipped component diverges. Uses Vocalls terminology (Type, Params, NextStep_*, __rtParams, __rtOutcome, _rtNextStep, getValue, _rtBaseUrl). Output feeds the sibling `rtds-vocalls-component-gen` skill. Trigger for CREATE when the user points at a PureConnect handler XML and asks for a spec, summary, "translation", "RTDS spec", "component spec", "design doc", "input for the component builder", "port this handler to Vocalls", "decode this handler", "what does this handler do", or "give me the Vocalls version". Trigger for UPDATE when the user points at a `rtds/specs/*.spec.md` and asks to "update this spec", "refactor the spec", "bring this spec to the latest standard", "modernize the spec", "fix the spec conventions", "is this spec up to date", or "apply the latest conventions". Do not trigger on Vocalls XML components (`rtds/components/*.js`) — those go through the rtds-vocalls-component-gen skill directly.
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

The canonical output shape is [`rtds/specs/sendSms.spec.md`](../../../rtds/specs/sendSms.spec.md).
Everything this skill writes — whether created fresh or refreshed — must match
its section order and the v2 `__rtOutcome` staging contract.

## Two modes

This skill operates in one of two modes. Pick the mode from what the user
points at:

| Mode | Input | What it does | Process |
| ---- | ----- | ------------ | ------- |
| **CREATE** | A PureConnect handler XML (`rtds/pureconnect_handlers/NAllo_RTDS_*.xml`) | Translate the handler into a new spec at `rtds/specs/<componentName>.spec.md`. | Steps 1–6 below. |
| **UPDATE** | An existing spec (`rtds/specs/*.spec.md`), plus its sibling component if one exists | Audit the spec against the current contract and rewrite it to the latest standard, preserving authored business prose. | "Update mode" section below. |

If the input is ambiguous (the user says "the sendSms spec" without a verb),
ask which mode they want. A handler path → CREATE; a spec path → UPDATE.

## When to use this skill

Trigger when the user:

- Points at a file in `rtds/pureconnect_handlers/` (e.g.
  `NAllo_RTDS_SendSMS.xml`, `NAllo_RTDS_Disconnect.xml`) and asks for a
  spec, summary, design doc, or "translation" (CREATE).
- Says "port this handler to Vocalls", "give me the Vocalls version",
  "extract the logic", "what does this handler do" (CREATE).
- Points at a `rtds/specs/*.spec.md` and asks to "update this spec",
  "refactor the spec", "bring it to the latest standard", "modernize the
  spec", "fix the spec conventions", "apply the latest conventions", or "is
  this spec up to date" (UPDATE).
- Wants the input artifact for `rtds-vocalls-component-gen` and starts
  with a PureConnect handler rather than a fresh design (CREATE).

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
3. **Inputs (Params)** — table: Param name, type, required, default, description. One row per Param. `Active` first, default `true`. **No PureConnect-isms** — don't mention `lsAttrValues` or `GetAt`.
4. **Outputs (NextStep_* keys)** — table: branch key, when taken, `Fallback`. Always start with `NextStep` then `NextStep_Failure`, then the operation-specific keys. Fallback is always `''`. Add the "stages `__rtOutcome` … resolves once at the output node" note after the table.
5. **External calls** — only if pattern is `http_call`. URL shape, method, payload skeleton, expected `result` shape. Skip section otherwise.
6. **Component structure (init / script / output)** — name the pattern from
   [operation_bodies/INDEX.md](../rtds-vocalls-component-gen/references/operation_bodies/INDEX.md), then the three node bodies in the **v2 `__rtOutcome` staging contract**: `init` seeds `__rtOutcome = 'NextStep'` + `__setupConfig`; `script` stages `__rtOutcome = '<key>'` (plain `=`, `Logger` carrying `{ outcome: __rtOutcome }`, never `_rtNextStep` mid-flight); `output` resolves once via `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`. This is *not* the final component XML — it's enough for the rtds-vocalls-component-gen skill to take it from here.
7. **Open questions / divergences from the source** — bullet list. Anything in the PureConnect handler that doesn't have a clean Vocalls equivalent, anything you skipped on purpose, anything the user needs to confirm.
8. **Convention debt** — only when a component already exists and diverges from the target (most often `Active` defaulting `false` in shipped code). Omit otherwise.

**Length discipline.** 1–3 pages, *not* a full handler dump. If you find
yourself approaching 4 pages, you're including PureConnect plumbing —
re-apply Step 2.

### Step 6 — Validate

Sweep the draft against [terminology.md](references/terminology.md).
Quick check:

- No mention of `lsAttrNames`, `lsAttrValues`, `GetAt`, `Find`, `StrEqlNoCase`, `Test()`, `StrLen`, `c_sDsRtPath`, `ATTR_*`, `CallLog`, `Notify Debugger`, `ReplaceAttributes`, `Parse String`, `Assignment`, `creatorModule`, `creatorName`, "Step ID", "Initiator", "Subroutine" (the PureConnect kind).
- All identifiers carry the right Vocalls prefix per
  [naming.md](../rtds-vocalls-component-gen/conventions/naming.md):
  `__rtParams`, `__rtOutcome`, `__rtBaseUrl`, `__rtEndpoint`, `__rtNextStep`,
  `__configJSON`, `_rtNextStep`, `_rtBaseUrl`, `_headers`.
- Every NextStep key is named (no "and a few other branches…").
- Pattern matches the table in
  [operation_bodies/INDEX.md](../rtds-vocalls-component-gen/references/operation_bodies/INDEX.md).
- **Outcome contract:** `init` seeds `__rtOutcome = 'NextStep'`; `script` stages `__rtOutcome` (never `_rtNextStep`/`global[_rtNextStep]` mid-flight) with `{ outcome: __rtOutcome }` logs; `output` resolves once via `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` (empty-string fallback, **not** `-1`) and logs both `{ outcome, nextStep }`. No `return '<exit_key>'` for gui_exit. See the "Disallowed — retired contract" list in [terminology.md](references/terminology.md).

## Update mode — refresh an existing spec to the latest standard

Use this mode when the input is an existing `rtds/specs/*.spec.md` (not a
handler XML) and the user asks to update / refactor / modernize it. The goal is
a high-quality spec in the **current** conventions, with authored business prose
preserved. There is no handler to walk — skip the CREATE-mode triage,
filter, and pattern-recognition steps.

**Reading order for this mode:** [spec_template.md](references/spec_template.md)
(the canonical target shape) + [terminology.md](references/terminology.md). Read
the sibling `rtds/components/<name>.js` if it exists. Do **not** load
`handler_anatomy.md` / `tool_filter.md` — there's no handler involved.

### Step U1 — Read the spec and its sibling component

Open the target spec and, if present, `rtds/components/<componentName>.js`. The
component is ground truth for what the operation actually does today — payload
shape, branch keys, validation, and (importantly) the shipped `Active` default.

### Step U2 — Audit against the current contract

Check the spec against the latest standard. The common drift points (all visible
to a grep) are:

- **Frontmatter present?** `status:` + the `catalog:` block (see spec_template.md). Add it if missing.
- **`Active` row default `true`?** Target is `true`. If it reads `false`, fix the table to `true` and capture the shipped-code gap in Convention debt (Step U3).
- **Outputs `Fallback` column is `''`?** Replace any `-1` with `''`. Rename a `Fallback if Param missing` header to `Fallback`.
- **`__rtOutcome` staging present?** The Outputs table carries the "stages … resolves once at the output node" note; the structure section shows init/script/output.
- **Init seeds `'NextStep'`?** Not `'NextStep_Failure'`.
- **Output writes bare `_rtNextStep`?** `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` — never `global[_rtNextStep] = …`.
- **Logs carry `outcome`?** Work-node logs `{ outcome: __rtOutcome }`; exit log `{ outcome, nextStep }`. No mid-flight `{ nextStep }`.
- **gui_exit:** no `return '<exit_key>'`; the engine emits the exit key via `prepareGuiHandoff`.
- **Section shape** matches sendSms.spec.md: Header → Business purpose → Inputs → Outputs → External call (http_call only) → Component structure → (Open questions) → Convention debt.

### Step U3 — Rewrite, preserving authored prose

Rewrite the mechanical sections to the target shape. **Preserve** the authored
"Business purpose" paragraph and any operator-confirmed Param descriptions — only
restructure/normalize, don't re-invent intent. Where the **shipped component**
still diverges from the target (most often `Active` default `false`), keep the
target convention in the body and record the gap in a **Convention debt (flagged
&lt;today&gt;)** section, exactly as [sendSms.spec.md](../../../rtds/specs/sendSms.spec.md)
does. Don't silently encode the buggy default.

### Step U4 — Validate and save

Run the same Step 6 validation sweep. Confirm before overwriting. After saving,
if the `catalog:` frontmatter changed, remind the user to run
`npm run gen:catalog` (per CLAUDE.md, the catalog is generated from spec
frontmatter). If a Param name changed, `npm run check:lockstep` verifies
component/spec/seed parity.

## Output

**CREATE mode** — save the generated spec at
`rtds/specs/<componentName>.spec.md` (sibling of the future component output
under `rtds/components/`). Use camelCase `<componentName>` (e.g. `sendSms`,
`disconnect`, `flowJump`) matching
[naming.md](../rtds-vocalls-component-gen/conventions/naming.md). Ask before
overwriting an existing spec.

**UPDATE mode** — rewrite the spec in place at its existing path; confirm before
overwriting.

Either way, provide a path link to the saved file. If the `catalog:` frontmatter
changed, remind the user to run `npm run gen:catalog`. If the user asks "now
build the component", chain to
[rtds-vocalls-component-gen](../rtds-vocalls-component-gen/SKILL.md).

## Things to avoid

- **Don't transcribe the handler step-by-step.** The spec is a re-statement, not a translation. If the spec reads like an annotated XML dump, you've kept the plumbing.
- **Don't invent Params.** If a key isn't read in the handler, it's not a Param. List unknowns in "Open questions" instead.
- **Don't invent endpoint URLs or HTTP payloads.** Derive them from the handler's HTTP step (if any) or mark them as "TBD — confirm with operator".
- **Don't use PureConnect terminology** in the spec body — that's the whole point of this skill. The PureConnect names appear *only* in the header ("Source handler" path) and the "Open questions" section if there's an unresolvable divergence.
- **Don't emit the retired outcome contract.** No `global[_rtNextStep]` mid-flight, no `-1` fallback, no `Active` default `false` in the Inputs table, no `return '<exit_key>'` for gui_exit, no `{ nextStep }` on work-node logs. Current contract: stage `__rtOutcome`, resolve once at the output node to bare `_rtNextStep` with the `''` fallback. See [terminology.md](references/terminology.md).
- **Don't exceed 3 pages.** If you're over, you're including overhead.
- **Don't emit Vocalls component XML.** That's the next skill's job. This skill outputs only the spec.
- **Don't (UPDATE mode) re-invent the business purpose.** Preserve the authored prose; only normalize the mechanical sections.
- **Don't silently match a buggy shipped default.** When the component diverges from the target convention, state the target and flag the gap in Convention debt.
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
