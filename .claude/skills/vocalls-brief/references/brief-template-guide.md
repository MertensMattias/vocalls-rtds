# brief.md Template Guide

Reference for the vocalls-brief skill. Describes every section of brief.md, field formats,
and allowed values. Used by the skill to produce correctly structured output.

## Contents

- [Structure overview](#structure-overview)
- [Persona](#section-persona)
- [Guardrails](#section-guardrails)
- [Knowledge](#section-knowledge)
- [Variables](#section-variables)
- [Tools](#section-tools) — global tool definitions
- [Cases](#section-cases) — case blocks that reference tools by name
- [CDB Logs](#section-cdb-logs)
- [Markers](#section-markers) — user decisions recorded by `/vocalls-brief`
- [Canonical action vocabulary](#canonical-action-vocabulary) — SYSTEM_ACTIONS + canonicalization rules
- [Annotation syntax](#annotation-syntax)
- [Mapping from old format](#mapping-from-old-format)

---

## Structure overview

The brief has two zones:

**Shared config (top)** — defined once, applies across all cases:

```
Persona -> Guardrails -> Project rules -> Knowledge -> Variables -> Tools
```

**Case blocks (bottom)** — one block per case, referencing shared config by name:

```
## Cases
  ### Case N — Label    (one block per case, plus fallback_error at the end)
```

There are no separate `## Scenarios` sections. Each `### Case N` block is fully
self-contained: opening, objective, knowledge references, facts, refinement routing,
CDB log, and a list of which tools are active for that case.

Tools are defined globally in `## Tools` and referenced by name inside case blocks.
This avoids repeating the same tool definition across many cases.

---

## Section: Persona

Fields written as `**fieldName**: value` on separate lines.

| Field              | Format                              | Notes                                                                                              |
| ------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `name`             | Plain string                        | Bot display name. Same across all languages.                                                       |
| `companyName`      | Plain string                        | Same across all languages.                                                                         |
| `tone`             | Plain string                        | e.g. "professional and empathetic"                                                                 |
| `companyRole`      | Short phrase                        | e.g. "residential and business energy assistant"                                                   |
| `description`      | One sentence                        | "[name] handles [domain] for [companyName] [customer type]."                                       |
| `companyInfo`      | 2-4 sentences                       | Describes company and service for callers. Injected as Layer 4 of the assembled prompt — see `.claude/skills/references/prompt-layer-map.md`. |
| `Primary language` | `NL` / `FR` / `DE` / `EN`           | Language objectives are authored in                                                                |
| `Languages`        | Comma-separated                     | Subset of NL, FR, DE, EN                                                                           |
| `Call direction`   | `inbound` / `outbound` / `callback` | Default: inbound                                                                                   |

The brief skill elicits only the fields above; every field has a corresponding slot in `IntakeSchema` (PersonaSchema + top-level intake). Fields without a schema slot are intentionally not asked — past iterations elicited `gender` and `purpose` which had no consumer and were silently dropped at intake parse. Do not re-introduce ghost fields here without first adding the corresponding schema slot and prompt-layer wiring.

---

## Section: Guardrails

Two sub-sections, both bullet lists.

**`## Guardrails`** — universal behavioral rules. **Human reference only** — not parsed
by the intake agent, not injected into the assembled prompt. Authors may keep notes here
for the human review pass, but the brief skill does NOT elicit content for this section
(no Q&A question) and the intake agent does not read it. To enforce a behavioral rule at
runtime, put it under `## Project rules` instead.

**`## Project rules`** — injected as additional bullet lines inside the RULES section
of `advancedInstructions` by the Config Builder (via `intake.customRules`). Omit entirely
if not needed.

```markdown
## Guardrails

- Never execute an action without explicit customer confirmation.
- Always offer to transfer to a human agent if the customer is unsatisfied.

## Project rules

- Always mention the invoice month when offering to send a duplicate.
```

---

## Section: Knowledge

Named content blocks. One `### heading` per module. Optional conditional triggers.

```markdown
## Knowledge

### module_name

Free text content in the primary language.

### module_name [when: variableName = value]

Conditional content — injected only when variable matches value.
```

Omit section entirely if no knowledge modules found.

---

## Section: Variables

Table mapping API response paths to runtime variable names with optional hooks.

```markdown
## Variables

| From (API path)       | To (variable) | Hook                       |
| --------------------- | ------------- | -------------------------- |
| \_apiResult.fieldName | variableName  |                            |
| \_apiResult.fieldName | variableName  | toBoolean                  |
| \_apiResult.fieldName | variableName  | toDateOnly, getSpokenMonth |
```

Available hooks: `toBoolean`, `toStringSafe`, `toLower`, `toUpper`, `trim`, `toDateOnly`,
`getDay`, `getMonth`, `getYear`, `getSpokenMonth`, `count`, `firstItem`, `lastItem`, `addressToSSML`

Omit section if no variables found.

---

## Section: Tools

Custom tools used by the agent. **Defined once here, referenced by name in case blocks.**
System tools (`transfer_to_agent`, `escalate_to_agent`, `end_conversation`) are added
automatically by the pipeline — do not list them here.

One `### tool_name` block per tool:

```markdown
## Tools

### tool_name

**When**: Natural language — when should the agent call this tool?
**Silent**: yes | no
**Confirm**: none
| implicit — "Announcement phrase. Agent announces then proceeds."
| explicit — "Yes/no question. Agent waits for customer answer."
**Success**: What the agent says after the tool succeeds.
**Failure**: What the agent says if the tool fails. Should offer to transfer.
**Entities**:

- entity_name: type — description [required]
- entity_name: type — description
```

### Tool field rules

| Field      | Values                                                    | Notes                                                  |
| ---------- | --------------------------------------------------------- | ------------------------------------------------------ |
| `When`     | Natural language                                          | Describes the trigger condition                        |
| `Silent`   | `yes` / `no`                                              | yes = no spoken output after execution                 |
| `Confirm`  | `none` / `implicit — "phrase"` / `explicit — "question?"` | Confirmation mode                                      |
| `Success`  | String                                                    | Agent speech on tool success                           |
| `Failure`  | String                                                    | Agent speech on tool failure; should offer to transfer |
| `Entities` | Bulleted list                                             | `- name: type — description [required]`                |

`Entities` is optional — omit the sub-section if the tool takes no entities.

> **Pipeline contract:** of the rows above only `Entities` is a structured carrier
> (case `**Tools**: name [entity: value]` syntax). The `When`, `Silent`, `Confirm`,
> `Success`, and `Failure` rows are human-readable documentation for the catalogue;
> the pipeline's structured carriers for the same information are the per-case
> verbatim `**Objective**:` block and the Phase 2.7 speech-placement markers.
> Authors may write these fields for human reviewers, but the brief skill does NOT
> elicit them and the intake agent does NOT parse them as discrete fields.

### Conditional confirmation phrases

When the same tool is called via different channels with different announcement phrases,
use sub-bullets under `**Confirm**:`:

```markdown
**Confirm**: explicit
  - SMS path: "The mobile number on file is {{mobileNumber}}. Send the activation code to this number?"
  - Email path: "Shall I send the activation code to your email address {{emailAddress}}?"
```

The sub-bullet labels are human-readable context only — the Config Builder reads the full
`Confirm` field as free text and passes it to the Scenario Designer for normalization.

---

## Section: Cases

One `### Case N — Label` block per case. Blocks are separated by `---`.
The `### fallback_error` block is always last.

### Case block structure

```markdown
### Case {N} — {human-readable label}

**Opening**: {One sentence, preferably a question, spoken to open the call. Use {{variableName}} for runtime values.
Write (none) if the case has no scripted opening — the objective drives the dialog from the start.}

**Objective**:
{Natural language description of the agent's goal and behavioral rules.
Written in the primary language. Structure as a behavioral spec:

- One headline sentence stating the goal
- Step-by-step: what to ask, what to confirm, when to act, how to handle refusal/silence
- Explicit tool invocation rules (which tools need confirmation, which are silent)
- Exit behavior: end_conversation / escalate_to_agent / transfer_to_agent and when}

**Knowledge**: module_name, module_name

<!-- Write (none) if no knowledge modules apply. -->

**Facts**:

- Spoken label: {{variableName}}
- Spoken label: {{variableName}} [when: variable = value]
  <!-- Write (none) if no facts for this case. -->

**Refinement**:

- when variable = value -> Case M
- when variable = value AND variable2 = value2 -> Case M2
  <!-- Write (none) if this case does not branch. -->

**CDB log**: cdbLogN

**Tools**: tool_name, tool_name [entity: value], tool_name

<!-- List tool names from ## Tools. See tool reference syntax below. -->
```

### Tool reference syntax inside case blocks

Case blocks reference tools by name. The pipeline looks up the full tool definition
from `## Tools`. Two forms are allowed:

**Plain reference** — tool used with its default entity values as defined in `## Tools`:

```
**Tools**: send_duplicate_partial, submit_mandate_code
```

**Pinned entity reference** — tool used with a fixed entity value specific to this case.
Use when the same tool is called with different values across cases:

```
**Tools**: create_or_modify_mandate [sepaMandateAction: REACTIVATE], submit_mandate_code
```

Multiple pins are comma-separated inside the brackets:

```
**Tools**: create_or_modify_mandate [sepaMandateAction: EMANDATE_SMS, channel: primary]
```

The intake agent reads pinned values as `candidateEntities` overrides for that case.
A tool referenced in a case but not defined in `## Tools` is flagged as an issue.

### Objective field guidance

The Objective is the core authoring field. It replaces the old one-liner `Goal`.
Content is used directly by the Config Builder to compose `scenario.objective`.

**Format flexibility:** The `**Objective**:` field accepts any writing style — prose description, pseudocode, IF/THEN decision trees, SAY:/ON Success → patterns, or a mix. The Scenario Designer normalizes whatever is written here into a clean objective. You do not need to format it as numbered steps — write in whatever way feels natural.

Examples of valid objective formats:

- Prose: "Inform customer about their direct debit status. If they want to change it, collect their IBAN and confirm before executing."
- Pseudocode: "if customer confirms → call new_direct_debit; else → end_conversation"
- Natural language: "Ask if they want email or post. Confirm choice. Send the duplicate invoice accordingly."

Write it as a behavioral spec in the primary language:

```
Doel: help de klant kiezen tussen uitstel van betaling en een afbetalingsplan.
- Vraag naar de voorkeur als de klant nog niet gekozen heeft.
- Na keuze: bevestig de keuze in 1 korte zin.
- Vraag daarna expliciet: 'Zal ik dit nu voor u regelen?'
- Pas na expliciete bevestiging: roep de juiste tool aan.
- Bij weigering van beide opties: transfer_to_agent.
- Bij geen antwoord of onduidelijk: stel 1 verduidelijkingsvraag.
  Bij opnieuw onduidelijk: transfer_to_agent.
- Aan het einde: als klant niet tevreden: escalate_to_agent. Anders: end_conversation.
IMPORTANT: geen actie zonder expliciete bevestiging (behalve end_conversation).
```

### fallback_error block

Always the last case block. Content is fixed — copy verbatim:

```markdown
### fallback_error

**Opening**: (none)

**Objective**: Say one short sentence about a technical error and transfer immediately. Do not wait for a response.

**Knowledge**: (none)

**Facts**: (none)

**Refinement**: (none)

**CDB log**: cdbLogEX

**Tools**: transfer_to_agent
```

Note: `transfer_to_agent` is a system tool, but it is listed here because `fallback_error`
has no custom tools and needs to name the exit action explicitly for the pipeline.

---

## Section: CDB Logs

Optional global section for the fallback log only. Per-case CDB logs are declared
inline using the `**CDB log**:` field inside each case block.

```markdown
## CDB Logs

**Fallback log**: cdbLogEX
```

Omit entirely if all CDB log IDs are confirmed inline per case.

### Per-tool and per-disposition CDB log syntax

When a case uses tools that produce different log outcomes, extend the `**CDB log**:`
field with indented lines below the case default:

**Tool-level override** — applies to all dispositions of that tool:

```
**CDB log**: cdbLog3
  send_email_inform_customer: success=cdbLog3, failure=cdbLogEx
  transfer_to_agent: success=cdbLogOperator
```

**Tool + disposition-specific** — when the tool has a `disposition` entity and each
value maps to a different log ID:

```
**CDB log**: cdbLog6
  inform_customer[awaiting_technician]: success=cdbLog4
  inform_customer[defect_after_intervention]: success=cdbLog5
  inform_customer: success=cdbLog6, failure=cdbLogEx
  transfer_to_agent: success=cdbLogOperator
```

Syntax rules:
- `  tool_name: success=logId, failure=logId` — tool default (all dispositions)
- `  tool_name[disposition_value]: success=logId` — specific disposition override
- Either `success` or `failure` may be omitted when that outcome uses the case default
- Two spaces of indentation; tool name must match the name in `## Tools` exactly

The CONFIG assembles these into `cdbLogs[caseNumber][toolName][dispositionValue]`.
The global `default` entry (transfer/escalate → `cdbLogOperator`, end_conversation →
`cdbLogEX`) is auto-injected by the pipeline — do not specify it in the brief.

---

## Section: Markers

Optional final section. Records every user decision the `/vocalls-brief`
skill captured during Phase 2.6 (action vocabulary) and Phase 2.7 (speech
placement). The intake agent (Stage 1) parses these markers by regex and
propagates the decisions to downstream stages via `intake.cases.*` (action
canonicalization) and `intake.speechPlacements` (placement).

Layout:

```markdown
## Markers

<!-- These comments record user decisions from /vocalls-brief.
     The intake agent reads them on the next pipeline run.
     Do not delete them; do not rewrite them by hand. -->

<!-- BRIEF: custom action "escalate_to_backoffice" confirmed by user on 2026-05-11 -->
<!-- BRIEF: custom action "send_email_inform_customer" confirmed by user on 2026-05-11 -->

<!-- BRIEF: action "send_email_inform_customer" disposition "create_change_intervention" — speech-placement: action_message (confirmed by user on 2026-05-11) -->
<!-- BRIEF: action "create_or_modify_mandate" disposition "REACTIVATE" — speech-placement: dsl_inline (confirmed by user on 2026-05-11) -->
```

### Marker formats (stable contract)

**Action-canonicalization marker.** Written when the user confirms an
action name should remain custom (choice B in Phase 2.6). Format:

```html
<!-- BRIEF: custom action "<name>" confirmed by user on YYYY-MM-DD -->
```

- `<name>` is the unmodified action name as it appears in `**Tools**:`,
  `**Objective**:`, and `**CDB log**:`.
- One marker per confirmed custom name. No marker is written when the user
  picked "canonical" — that decision lost the original spelling.

Intake parses this with a regex anchored on the literal prefix:

```
/^<!-- BRIEF: custom action "([^"]+)" confirmed by user on (\d{4}-\d{2}-\d{2}) -->$/m
```

**Speech-placement marker.** Written for every `(action, disposition)`
pair the user classified in Phase 2.7. Format:

```html
<!-- BRIEF: action "<name>" disposition "<value>" — speech-placement: dsl_inline | action_message (confirmed by user on YYYY-MM-DD) -->
```

- `<name>` is the canonicalized action name (after Phase 2.6).
- `<value>` is the disposition name — derived via the 4-step priority chain
  documented in `.claude/agents/vocalls-intake.md` "What you write —
  `cdbLogMap`" (explicit `entity: disposition = "..."` line, SAY/branch
  context, generic fallback `success`/`failure`/`path_a`/`path_b`, or
  outstanding question on ambiguity). The literal string `"default"` is
  NEVER used as a disposition fallback — that key has a separate meaning
  in the assembled config (`messages.default`).
- The em dash (`—`) between `<value>"` and `speech-placement:` is required
  literally. Stage 1's intake parses with a regex anchored on the literal
  prefix:

```
/^<!-- BRIEF: action "([^"]+)" disposition "([^"]+)" — speech-placement: (dsl_inline|action_message) \(confirmed by user on (\d{4}-\d{2}-\d{2})\) -->$/m
```

### When to omit the section

If the brief uses only SYSTEM_ACTIONS (`transfer_to_agent`,
`escalate_to_agent`, `end_conversation`) AND no action carries
customer-facing speech (SAY NOTHING, bare USE, or terse status only),
no markers are produced and `## Markers` is omitted entirely. The intake
agent treats an absent section the same as an empty section.

### Order

Action-canonicalization markers first, then speech-placement markers
grouped by action name. Each marker is one line.

### Hand-editing

Manually editing markers is supported but discouraged. The skill regenerates
them every run; user-added markers survive if the comment format matches
exactly. To remove a marker, re-run `/vocalls-brief` and pick the opposite
choice, or delete the comment by hand (the next pipeline run will then
either canonicalize the name or raise an `outstandingQuestion`).

---

## Canonical action vocabulary

The intake schema (`core/schema/intake.js`) defines three SYSTEM_ACTIONS
that the runtime treats as implicit — no `**Tools**:` entry needed, no
custom action definition required, no marker needed:

| SYSTEM_ACTION | Purpose |
|---|---|
| `transfer_to_agent` | Hand the call to a live human agent. Used for off-topic, errors, explicit human requests, and persistent ambiguity. |
| `escalate_to_agent` | Escalate to a human agent at the end of a flow (e.g., customer unsatisfied, complaint). |
| `end_conversation` | Terminate the call cleanly after delivering the right information. |

Action names that are NOT in SYSTEM_ACTIONS fall into two categories:

### Canonical synonyms — auto-canonicalized

When `/vocalls-brief` sees a confident-synonym source name during Phase 2.6,
it recommends canonicalization (choice A). If the user accepts, the name is
rewritten across the extraction object before brief.md is written.

Single source of truth for the synonym mapping: `core/schema/shared.js` →
`SYSTEM_ACTION_SYNONYMS` (rendered in `docs/schema/shared.md`). Both the
brief skill and the intake agent read this constant — adding a new rule
requires editing only `shared.js`.

The same canonicalization rules also apply at intake time as a fallback
for briefs that did not go through the `/vocalls-brief` skill (hand-
authored, edited after generation, legacy briefs).

### Custom actions — require user confirmation

Any other non-canonical name (e.g., `escalate_to_backoffice`,
`send_email_inform_customer`, `notify_billing`,
`create_or_modify_mandate`) is treated as a custom action when the user
confirms it in Phase 2.6 with choice B. The skill writes the
`custom action` marker. The downstream config-builder must then define
the action in `agents.<id>.actions{}` or emit STAGE_FAILED.

### Adding a new canonical synonym rule

Edit `core/schema/shared.js` → `SYSTEM_ACTION_SYNONYMS` and run
`npm run schema:docs` to regenerate `docs/schema/shared.md`. The brief
skill (Phase 2.6) and the intake agent both source the table from that
constant — no duplicated prose to update.

---

## Annotation syntax

Use HTML comments inline for fields that need human review:

| Situation                    | Annotation                                                  |
| ---------------------------- | ----------------------------------------------------------- |
| Extracted, medium confidence | `<!-- BRIEF: extracted from filename — verify -->`          |
| Not found in any source      | `<!-- BRIEF: not found in source files — fill manually -->` |
| Extracted, low confidence    | `<!-- BRIEF: low confidence — verify carefully -->`         |

---

## Minimum valid brief

A brief is valid if it contains:

- `## Persona` with at minimum: `name`, `companyName`, `Primary language`, `Languages`
- `## Cases` with at least one `### Case N` block and `### fallback_error`

All other sections are optional but commonly used.

---

## Mapping from old format (pre-v2)

| Old location                                       | New location                                 |
| -------------------------------------------------- | -------------------------------------------- |
| `## Cases / ### Case N / **Scenario**:`            | Removed — case and scenario are one block    |
| `## Cases / ### Case N / **Opening**:`             | `### Case N / **Opening**:`                  |
| `## Cases / ### Case N / **Refinement**:`          | `### Case N / **Refinement**:`               |
| `## Scenarios / ### name / **Goal**:`              | `### Case N / **Objective**:`                |
| `## Scenarios / ### name / **Knowledge modules**:` | `### Case N / **Knowledge**:`                |
| `## Scenarios / ### name / **Facts**:`             | `### Case N / **Facts**:`                    |
| `## Scenarios / ### name / **Tools**:`             | `### Case N / **Tools**:` (names only)       |
| `## Tools / ### tool_name / **Scenarios**:`        | Removed — tool defined once in `## Tools`    |
| `## Tools / ### tool_name / ...`                   | `## Tools / ### tool_name / ...` (unchanged) |
| `## CDB Logs / table row`                          | `### Case N / **CDB log**:`                  |
