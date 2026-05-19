# {name} — {companyName} brief

<!-- brief.md — primary input to the Vocalls CONFIG pipeline.
     Fill every section. Remove placeholder lines when done.
     Shared config (Persona through Tools) goes at the top.
     Each case gets its own self-contained block below — referencing tools by name. -->

---

## Persona

<!-- Identity fields for this agent. name and companyName are identical across all languages.
     tone, companyRole, description, and companyInfo are the EN source;
     the Translator fills NL/FR/DE automatically.
     botType, targetCustomer, and interactionStyle are optional overrides;
     omit them to use the pipeline defaults. -->

**name**: Dena
**companyName**: ENGIE
**tone**: friendly, knowledgeable, professional but warm
**companyRole**: {one short phrase — e.g. "residential and business energy assistant"}
**description**: {one identity sentence — e.g. "Dena helps ENGIE customers obtain duplicates of invoices and payment documents."}
**companyInfo**: {2–4 sentences about the company and what this service does for callers — e.g. "ENGIE is one of Belgium's largest energy suppliers, delivering electricity and gas to residential and business customers nationwide. This service helps callers manage invoices, payments, and contract details over the phone." EN source — Translator fills NL/FR/DE.}

**Primary language**: REPLACE_WITH_PRIMARY_LANGUAGE
**Languages**: REPLACE_WITH_LANGUAGES
**Gender**: female
**Call direction**: inbound
**Purpose**: {one sentence — pipeline context note; not injected into the assembled prompt — e.g. "Handles billing, payment, and meter-reading questions for ENGIE residential customers."}

<!-- Optional overrides — omit any line to use the pipeline default -->

**botType**: {e.g. "customer service agent" — defaults to "customer service agent" if omitted}
**targetCustomer**: {e.g. "ENGIE customers" — defaults to "customers" if omitted}
**interactionStyle**: {e.g. "short sentences, direct communication, one question at a time" — defaults to that if omitted}

---

## Guardrails

<!-- Universal behavioral rules always active across all cases.
     Do not name specific cases here — keep rules universal.
     Pipeline context only — NOT injected into the prompt directly. -->

- {e.g. "Never execute an action without explicit customer confirmation"}
- {e.g. "Always offer to transfer to a human agent if the customer is unsatisfied"}
- {e.g. "Do not discuss topics outside the scope of this service"}

## Project rules

<!-- Optional. Injected as additional bullet lines inside the RULES section of the prompt.
     Remove section entirely if not needed. -->

- {project-specific rule}

---

## Knowledge

<!-- Named, reusable knowledge blocks. Referenced by name in case blocks below.
     Write content in the primary language — pipeline translates automatically.
     Conditional modules: append [when: variableName = value] to the heading. -->

### {module_name}

{Free text content — product descriptions, policy text, option lists, FAQ content.}

### {module_name} [when: {variable} = {value}]

{Content injected only when the runtime variable matches the value.}

---

## Variables

<!-- Maps API response fields to runtime variable names used in openings, facts,
     and refinement conditions. Defined once here — referenced by name in cases.

Available hooks:
  toBoolean       "1"/"true"/"yes" -> true; else false
  toStringSafe    any value -> string (null-safe)
  toLower / toUpper / trim
  toDateOnly      ISO datetime -> date string (YYYY-MM-DD)
  getDay / getMonth / getYear / getSpokenMonth
  count           array -> integer count
  firstItem / lastItem
  addressToSSML   address string -> SSML-formatted spoken address -->

| From (API path)         | To (variable)  | Hook                       |
| ----------------------- | -------------- | -------------------------- |
| {\_apiResult.fieldName} | {variableName} |                            |
| {\_apiResult.fieldName} | {variableName} | toBoolean                  |
| {\_apiResult.fieldName} | {variableName} | toDateOnly, getSpokenMonth |

---

## Tools

<!-- Custom tools available to the agent. Defined once here, referenced by name in case blocks.
     System tools (transfer_to_agent, escalate_to_agent, end_conversation) are added
     automatically by the pipeline — do not list them here.
     Each tool is defined once even if used across many cases. -->

### {tool_name}

**When**: {Natural language — when should the agent call this tool?}
**Silent**: {yes — no spoken output after execution | no — agent speaks after execution}
**Confirm**: {none — no confirmation needed
| implicit — "{Announcement phrase. Agent announces then proceeds.}"
| explicit — "{Yes/no question. Agent waits for customer answer before proceeding.}"}
**Success**: {Global default: what the agent says after the tool succeeds. The pipeline
uses this when the Objective does not provide a richer case-specific message.
If every case that uses this tool has the same success speech, define it here
and omit it from the Objective. If cases vary, write the per-case message in
the Objective using ON Success: SAY "..." and leave this as a fallback.}
**Failure**: {Global default: what the agent says if the tool fails. Same rules as Success.}
**Entities**:

- {entity_name}: {type} — {description} [required]
- {entity_name}: {type} — {description}

### {tool_name}

**When**: {When to call.}
**Silent**: no
**Confirm**: explicit — "{Confirmation question?}"
**Success**: {Global default success message. See first tool block for full guidance.}
**Failure**: {Global default failure message. See first tool block for full guidance.}
**Entities**:

- {entity_name}: {type} — {description} [required]

---

## Cases

<!-- One block per case. Each block references tools defined above.
     Use **Tools**: to list which tools are active for this case.
     Pin a fixed entity value with [entity: value] when the tool always uses the same value
     in this case — e.g. `create_mandate [sepaMandateAction: REACTIVATE]`.
     Keep fallback_error as the very last block. -->

### Case {N} — {human-readable label}

<!-- Replace {N} with the case number from the Vocalls routing diagram. -->

**Opening**: {First sentence spoken to the customer when this case loads. Leave empty if none.
Use {{variableName}} to inject runtime data.}

**Objective**:
{Describe the agent's conversational flow for this case in plain language.
Write in the primary language. Use workflow keywords where helpful — the pipeline
extracts and places each piece automatically:

FLOW keywords (stay in the objective): - SAY / say / inform "..." — what the agent says during the conversation - ASK "..." — a question the agent poses to the customer - THEN action_name — trigger this action (confirmation text always
comes from the Tools **Confirm**: field) - customer confirms / declines — branch based on customer response - if unclear / off-topic — fallback branch

OUTCOME keywords (extracted from objective → placed in CONFIG action fields): - ON Success: SAY "..." → actions[name].messages.success - ON Failure: SAY "..." → actions[name].messages.failure - [disposition: X]: SAY "..." → actions[name].dispositions[X]

SCENARIO-FLOW speech (stays in objective even when after an action):
Any conditional speech driven by a runtime variable rather than the tool's
own result — e.g. "if {{openAmount}} > 0: additionally say '...'" — this
is scenario-flow content, not a tool outcome message.

The pipeline uses semantic understanding — exact keywords are not required. Writing
"if it works: tell the customer their account has been updated." is recognized the
same as "ON Success: SAY '...'".

You do NOT need to pre-split content between this section and the Tools section.
Write what the agent should do naturally. The pipeline handles placement.}

**Knowledge**: {module_name}, {module_name}

<!-- List knowledge module names defined in ## Knowledge. Write (none) if not applicable. -->

**Facts**:

<!-- Runtime data shown to the customer. {{variableName}} must match the Variables table. -->

- {Spoken label}: {{variableName}}
- {Spoken label}: {{variableName}} [when: {variable} = {value}]

**Refinement**:

<!-- Route to a different case based on runtime variable value. First match wins. -->

- when {variable} = {value} -> Case {M}
- when {variable} = {value} AND {variable2} = {value2} -> Case {M2}

**CDB log**: {cdbLogN}

<!-- One log ID per case. The Config Builder maps this to the canonical
     cdbLogs[case] shape: `{ default: 'cdbLogN', <action>: { default: { success: 'cdbLogN' } } }`.
     System actions (transfer_to_agent, end_conversation) get cdbLogOperator /
     cdbLogEX defaults automatically. Per-disposition overrides (e.g.
     end_conversation split into completed vs. declined) are authored
     directly in the generated AGENT_*.js — not in the brief. -->

**Tools**: {tool_name}, {tool_name} [entity: value], {tool_name}

<!-- List tool names from ## Tools above.
     Append [entity: value] to pin a fixed entity value for this case only.
     Example: create_or_modify_mandate [sepaMandateAction: REACTIVATE], submit_mandate_code -->

---

### Case {N} — {human-readable label}

**Opening**: {Opening line, or leave empty.}

**Objective**:
{Step-by-step goal description.}

**Knowledge**: (none)

**Facts**:

- {Spoken label}: {{variableName}}

**Refinement**:

- when {variable} = {value} -> Case {M}

**CDB log**: {cdbLogN}

**Tools**: {tool_name} [entity: value], {tool_name}

---

### fallback_error

<!-- Reserved block — always last. Do not remove or rename. -->

**Opening**: (none)

**Objective**: Say one short sentence about a technical error and transfer immediately. Do not wait for a response.

**Knowledge**: (none)

**Facts**: (none)

**Refinement**: (none)

**CDB log**: cdbLogEX

**Tools**: transfer_to_agent

---

## CDB Logs

<!-- Global fallback log only. Per-case CDB logs are declared inline above.
     Remove section if not needed. -->

**Fallback log**: {cdbLogEX}
