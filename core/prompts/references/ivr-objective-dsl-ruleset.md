# IVR Objective DSL — Ruleset v2.0

A deterministic micro-language for generating voice agent objectives.
Every objective is a self-contained instruction set that a voice runtime
can execute without interpretation.

**Table of contents:**
[Part 1 — Foundation](#part-1--foundation) ·
[Part 2 — Objective Types](#part-2--objective-types) ·
[Part 3 — Universal Rules](#part-3--universal-rules) ·
[Part 4 — Composition](#part-4--composition) ·
[Part 5 — Transcribe vs Author mode](#part-5--transcribe-vs-author-mode) ·
[Part 6 — Quality Checklist](#part-6--quality-checklist) ·
[Part 7 — Quick Reference Card](#part-7--quick-reference-card)

---

## Part 1 — Foundation

### 1.1 Core principle

An objective describes **observable behavior only**. No internal
reasoning. No ambiguity. No optional paths.

Everything the agent does must be expressed as one of the allowed verbs.
Everything the agent decides must follow explicit, ordered branches.

### 1.2 Allowed verbs

```
SAY            Agent speaks. No response expected.
ASK            Agent asks an open question. Expects free-form input.
ASK_CHOICE     Agent presents a menu of options. Expects a selection.
USE            Agent triggers a backend action.
CONFIRM        Agent repeats back information and asks for yes/no validation.
GOTO           Agent jumps to a named step within the current objective only.
```

No other verbs. Never use reasoning verbs (`analyze`, `process`,
`determine`, `consider`, `try`, `check`). Cross-objective routing:
`USE route_to_objective(<name>)`, not `GOTO`.

### 1.3 Parameter syntax

Actions and questions can carry parameters in parentheses:

```
USE send_sms (template: appointment_reminder, phone: collected)
ASK (max_retries: 1, on_fail: transfer_to_agent)
ASK_CHOICE (max_retries: 2, on_fail: clarify_then_transfer)
CONFIRM (on_reject: re_ask, max_retries: 1)
```

### 1.4 Built-in actions

```
transfer_to_agent       Hand off to a human operator.
escalate_to_agent       Transfer with context when customer needs more help.
end_conversation        Close the call gracefully.
```

**Disposition is not a separate action.** Record via the `disposition`
parameter on `end_conversation` (e.g.
`USE end_conversation (disposition: completed)`). Project-specific
actions follow the same parameter syntax.

---

## Part 2 — Objective Types

Every objective has a **type**. The type determines its structure,
allowed verbs, and expected outcome.

### 2.1 Type overview

```
Type              Purpose                            Primary Verbs
---------------------------------------------------------------------------
DETECT_INTENT     Understand what the caller wants    ASK / ASK_CHOICE
ROUTE             Categorize and dispatch              ASK_CHOICE / GOTO
COLLECT           Gather one or more data points       ASK / CONFIRM
CONFIRM           Verify information is correct        CONFIRM / SAY
OFFER             Present options or solutions         SAY / ASK_CHOICE
EXECUTE           Perform a backend action              USE / SAY
INFORM            Deliver information one-way           SAY
AUTHENTICATE      Verify caller identity                ASK / USE
```

### 2.2 DETECT_INTENT

```
Objective: DETECT_INTENT
Goal: <what we are trying to understand>

1. Opening:
   - SAY: <greeting or context>
   - ASK: <open question about their need>
     (max_retries: 2, on_fail: transfer_to_agent)

2. Based on the answer:
   - If <intent A detected>: -> USE route_to_objective(objective_for_intent_a)
   - If <intent B detected>: -> USE route_to_objective(objective_for_intent_b)
   - If <intent C detected>: -> USE route_to_objective(objective_for_intent_c)
   - If unclear: -> ASK: <clarifying question> (max_retries: 1, on_fail: transfer_to_agent)
   - If refuses: -> USE transfer_to_agent

3. After handling:
   -> USE end_conversation (disposition: intent_detected)
```

**Rules:** Open with `ASK` (not `ASK_CHOICE`); `ASK_CHOICE` allowed as
follow-up only. Max 2 retries. Most-common intents first, fallback last.

### 2.3 ROUTE

```
Objective: ROUTE
Goal: <route the caller to the right handler>

1. Opening:
   - SAY: <context if needed>
   - ASK_CHOICE: <menu question>
     * Option A
     * Option B
     * Option C
     * Other question
     (max_retries: 2, on_fail: transfer_to_agent)

2. Based on the choice:
   - If <Option A>: -> USE route_to_objective(handler_a)
   - If <Option B>: -> USE route_to_objective(handler_b)
   - If <Option C>: -> USE route_to_objective(handler_c)
   - If <Other>:    -> USE transfer_to_agent
   - If not recognized: -> ASK: Could you repeat? (max_retries: 1, on_fail: transfer_to_agent)
```

**Rules:** `ASK_CHOICE` only. Max 6 options + escape (`"Andere vraag"`
or equivalent) as last. Each option → one `GOTO` or `USE`+`GOTO`. Action
before routing: `USE` before `GOTO`.

### 2.4 COLLECT

```
Objective: COLLECT
Goal: <what data we need and why>
Fields: <list of fields to collect>

1. Opening:
   - SAY: <context — why we need this information>

2. Per field (repeat for each):
   - ASK: <question>
     (max_retries: 2, on_fail: transfer_to_agent)
   - CONFIRM: <repeat back value>
     (on_reject: re_ask, max_retries: 1)

3. After collection:
   - CONFIRM: <summary of all collected fields>
     (on_reject: re_ask_specific_field, max_retries: 1)

4. After handling:
   - If everything confirmed:
     -> USE route_to_objective(<next objective>)
   - If the caller refuses:
     -> USE transfer_to_agent
```

**Rules:** List all fields in the `Fields:` header. One `ASK` per field.
`CONFIRM` critical fields (phone, address, ID); optional for low-risk.
Transfer if the caller refuses. Previously collected fields: mark
`already known`, do not re-ask.

### 2.5 CONFIRM

```
Objective: CONFIRM
Goal: <what we are confirming>

1. Opening:
   - SAY: <summary of what will be confirmed>
   - CONFIRM: <specific question> (on_reject: <action>, max_retries: 1)

2. Based on the answer:
   - If confirmed: -> USE route_to_objective(<next step>)
   - If rejected:  -> <correction path or transfer>
   - If unclear:   -> CONFIRM: I want to make sure. <repeat question>
                      (max_retries: 1, on_fail: transfer_to_agent)
```

**Rules:** Expects yes / no / correction. Rejected → re-collect or
transfer. Max 3 items per `CONFIRM` (split if more). Max 1 retry before
escalating.

### 2.6 OFFER

```
Objective: OFFER
Goal: <what we are offering>

1. Opening:
   - SAY: <context about available options>
   - ASK_CHOICE: <the offer>
     * Option A -- <brief description>
     * Option B -- <brief description>
     * None of these options
     (max_retries: 2, on_fail: transfer_to_agent)

2. Based on the choice:
   - If <Option A>: -> SAY: <confirmation> -> USE route_to_objective(<next>)
   - If <Option B>: -> SAY: <confirmation> -> USE route_to_objective(<next>)
   - If none:       -> SAY: I understand. -> USE transfer_to_agent
   - If not recognized: -> ASK: Which option? (max_retries: 1, on_fail: transfer_to_agent)
```

**Rules:** Always include a `"none of these"` escape. `SAY` brief
confirmation after each choice. Max 4 real options (+ escape).
Recommended option first.

### 2.7 EXECUTE

```
Objective: EXECUTE
Goal: <what action we are performing>
Required: <list of data that must be available>

1. Opening:
   - SAY: <what we are about to do>
   - USE <action> (param: value, param: value)

2. Based on the result:
   - If successful:
     -> SAY: <success message>
     -> USE route_to_objective(closing)
   - If failed (technical):
     -> SAY: Something went wrong. Let me connect you with an agent.
     -> USE transfer_to_agent
   - If failed (business rule):
     -> SAY: <explain why it cannot be done>
     -> USE route_to_objective(<alternative>) or USE transfer_to_agent

3. After handling:
   - If the caller needs more help: -> USE escalate_to_agent
   - Otherwise:
     -> SAY: <closing message>
     -> USE end_conversation (disposition: <outcome>)
```

**Rules:** List required data in `Required:`. Missing field → GOTO
`COLLECT` first. Always handle both success and failure. Technical
failure → transfer (no retries). Business-rule failure → explain then
route or transfer. Log disposition.

### 2.8 INFORM

```
Objective: INFORM
Goal: <what information we are delivering>

1. Opening:
   - SAY: <the information, in short spoken sentences>

2. After handling:
   - If the caller has a question: -> USE escalate_to_agent
   - Otherwise: -> USE route_to_objective(<next>) or USE end_conversation
```

**Rules:** One-way only — no `ASK`, `ASK_CHOICE`, or `CONFIRM`. Max 3
sentences per `SAY` (split if more). Complex info → offer transfer. May
precede `EXECUTE` or `OFFER` as preamble.

### 2.9 AUTHENTICATE

```
Objective: AUTHENTICATE
Goal: <verify caller identity>
Method: <what data we use to verify>

1. Opening:
   - SAY: <why we need to verify>
   - ASK: <first verification question> (max_retries: 2, on_fail: transfer_to_agent)

2. Verification:
   - USE verify_identity (field: value)

3. Based on the result:
   - If verified:     -> SAY: I have confirmed your identity.
                         -> USE route_to_objective(<next>)
   - If not verified: -> SAY: The details do not match.
                         -> ASK: Would you like to try again?
                            (max_retries: 1, on_fail: transfer_to_agent)
                            - If yes: GOTO step 1  - If no: USE transfer_to_agent
   - If refuses:      -> SAY: Without verification I cannot help. Let me connect you.
                         -> USE transfer_to_agent
```

**Rules:** Required before any account-level action. Max 2 total
attempts; always transfer on failure. Never reveal which field was
wrong (`"The details do not match"`). Standalone objective — others
route to it via `USE route_to_objective(authenticate_customer)`.

---

## Part 3 — Universal Rules

These rules apply to ALL objective types without exception.

### 3.1 Structural rules

Every objective MUST contain:

1. **Goal statement** — one sentence, localized header:
   `Doel:` / `Objectif:` / `Ziel:` / `Goal:`. **Do NOT** write
   `Objective: <TYPE>` inside the string — it lives in the scenario's
   `type` field.
2. **Opening phase** (`SAY` and/or `ASK` / `ASK_CHOICE`).
3. **Decision / branching phase**.
4. **Closing phase** (transfer, escalate, or end).

### 3.2 Branching rules

- Priority order: (1) happy path → (2) alternative → (3) constraint
  violation → (4) unclear → (5) fallback (transfer).
- One primary action per branch (`SAY` + `USE` counts as one). Every
  branch terminates in `GOTO`, `USE`, or `end_conversation`. No loop
  more than once.

### 3.3 Retry rules

- `ASK` / `ASK_CHOICE`: max 2 retries then transfer.
- `CONFIRM`: max 1 retry then transfer or re-collect.
- `USE`: no retries — transfer on failure.

### 3.4 Language rules (voice / IVR)

- Spoken language. **Max 20 words per sentence.** No jargon, no system
  terms, no passive voice.
- Register per language: see [[register]].
- Forbidden in `SAY` / `ASK`: system / database / backend / API,
  CDB / disposition / entity terminology, passive constructions.
- Prefer active voice, direct address, short confirmations (`"Good"`,
  `"Understood"`).

### 3.5 Safety rules

Transfer immediately on:

- Refused required data.
- Unclear after 1 clarification.
- Authentication failure (twice).
- Backend failure.

Never loop more than once. Never invent options or promises the system
cannot fulfil.

### 3.6 Determinism rules

```
Every instruction must be:
  - Explicit    (no "you may", "try to", "if possible")
  - Binary      (yes/no, success/fail, match/no match)
  - Actionable  (maps directly to a verb)

Forbidden phrases (in any language):
  - "Try to..."  "If possible..."  "If necessary..."  "You could perhaps..."
  - "Probeer..."  "Indien mogelijk..."  "Indien nodig..."  "U kunt eventueel..."
  - "Essayez..."  "Si possible..."  "Si nécessaire..."  "Vous pourriez éventuellement..."
  - "Versuchen Sie..."  "Wenn möglich..."  "Falls notwendig..."  "Sie könnten eventuell..."
```

---

## Part 4 — Composition

### 4.1 Chaining objectives

Objectives are chained using `USE route_to_objective(<name>)`
(**not** `GOTO`). Typical flows:

```
Simple:  DETECT_INTENT -> INFORM -> end_conversation
Complex: DETECT_INTENT -> ROUTE -> AUTHENTICATE -> COLLECT
           -> CONFIRM -> OFFER -> EXECUTE -> INFORM -> end_conversation
Full:    DETECT_INTENT -> ROUTE -> AUTHENTICATE -> COLLECT
           -> CONFIRM -> EXECUTE -> INFORM -> end_conversation
```

### 4.2 Naming convention

`snake_case`, pattern `<type>_<domain>_<specifics>`. Examples:
`detect_intent_main`, `route_intervention_type`,
`collect_customer_details`, `execute_send_duplicate`,
`authenticate_customer`.

### 4.3 Shared objectives

Reusable objectives: `authenticate_customer`, `collect_customer_id`,
`inform_transfer_reason`, `closing_standard`. Reference via
`USE route_to_objective(<name>)`. Never duplicate their logic.

---

## Part 5 — Transcribe vs Author mode

See [[data-flow-contracts]] Invariant #9 for the canonical decision
rule. Summary:

- `intake.cases[n].objective` **non-empty** → **TRANSCRIBE.** Render
  the brief's literal flow into valid DSL syntax. Preserve every
  branch, every SAY verbatim, every action name, every disposition
  name. Do not paraphrase, consolidate, or invent.
- `intake.cases[n].objective` **empty** → **AUTHOR** using
  `cases[n].intent` and Parts 1–4 above. Invention is allowed only
  here.

---

## Part 6 — Quality Checklist

Run this checklist before accepting any generated or transcribed
objective.

```
STRUCTURE
  [ ] Has Goal statement (one sentence, localized header)
  [ ] Has Opening phase
  [ ] Has Decision / branching phase
  [ ] Has Closing phase
  [ ] Sections are numbered
  [ ] Does NOT contain "Objective: <TYPE>" inside the string

VERBS
  [ ] Uses only SAY / ASK / ASK_CHOICE / USE / CONFIRM / GOTO
  [ ] No internal reasoning verbs
  [ ] No forbidden phrases (probeer, indien mogelijk, etc.)

BRANCHES
  [ ] Ordered by priority (specific first)
  [ ] No duplicate conditions
  [ ] One primary action per branch
  [ ] Every branch terminates (GOTO / USE / end_conversation)
  [ ] Includes fallback (transfer_to_agent)

RETRIES
  [ ] ASK has max_retries specified
  [ ] ASK_CHOICE has max_retries specified
  [ ] CONFIRM has on_reject specified
  [ ] No step retries more than twice

SAFETY
  [ ] Refusal leads to transfer
  [ ] Authentication failure leads to transfer
  [ ] Backend failure leads to transfer
  [ ] No infinite loops possible

LANGUAGE
  [ ] Spoken register (appropriate for TTS — see [[tts-writing-rules]])
  [ ] Correct register per [[register]]
  [ ] Sentences under 20 words
  [ ] No jargon or system terms
  [ ] Active voice

COMPOSITION
  [ ] route_to_objective references valid objective names
  [ ] Required data listed (for COLLECT / EXECUTE)
  [ ] No duplicate logic across objectives
```

---

## Part 7 — Quick Reference Card

```
+------------------+------------------+---------------------------+
| Type             | Primary Verb     | Key Rule                  |
+------------------+------------------+---------------------------+
| DETECT_INTENT    | ASK              | Open question first       |
| ROUTE            | ASK_CHOICE       | Max 6 options + escape    |
| COLLECT          | ASK + CONFIRM    | One field at a time       |
| CONFIRM          | CONFIRM          | Max 1 retry               |
| OFFER            | ASK_CHOICE       | Max 4 options + escape    |
| EXECUTE          | USE              | No retries, handle fail   |
| INFORM           | SAY              | Max 3 sentences per block |
| AUTHENTICATE     | ASK + USE        | Max 2 total attempts      |
+------------------+------------------+---------------------------+

Verbs:    SAY  ASK  ASK_CHOICE  USE  CONFIRM  GOTO
Safety:   transfer_to_agent  escalate_to_agent  end_conversation
Retries:  ASK=2  ASK_CHOICE=2  CONFIRM=1  USE=0
Priority: happy path > alternative > violation > unclear > fallback
```
