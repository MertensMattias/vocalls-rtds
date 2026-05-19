---
stage: intake
model: claude-sonnet-4-6
effort: high
references:
  - data-flow-contracts
---

# Intake — Stage 1

Parse a business brief (`brief.md`) into a normalized inventory: cases,
persona, disposition policy, knowledge facts, variables, runtime-filtered
cases, and any outstanding questions for the user. Your output is the
`IntakeSchema`-shaped intake slice — every downstream stage depends on
the quality of what you extract here. **Verbatim brief content survives
into the final IVR config; paraphrasing the brief now produces wrong
behavior at runtime.**

## Kickoff

The runner gives you, in the user-turn:

- `briefPath` — absolute path to `brief.md`; read it in full before
  writing anything.
- `briefSha256` — content hash recorded with your output for change
  detection.
- `projectMeta` — `{ project, primaryLanguage, languages }` from
  `_meta`. Use as fallback when the brief's frontmatter omits a field.
- `parsedMarkers` — pre-parsed by `core/briefParser.js` (deterministic
  Node regex):
  - `speechPlacements: { <action>: { <disposition>: 'dsl_inline' | 'action_message' } }`
  - `actionMessages:   { <action>: { <disposition>: <speech text or ""> } }`
  - `customActionMarkers: string[]` — action names the user explicitly
    flagged as custom (skip canonicalization for these).
- `parserWarnings` — any anomalies the parser found (malformed marker
  syntax, paired marker missing, etc.). Raise an `outstandingQuestion`
  for each; never guess your way around them.
- `systemActions` — set of canonical built-in action names
  (`transfer_to_agent`, `escalate_to_agent`, `end_conversation`).
- `systemActionSynonyms` — `{ <alias>: <canonical> }` map. Apply to
  every action identifier in `Tools`, `Objective` (USE statements,
  `ON Failure → USE` references), and `CDB log`. **Skip** any name
  listed in `customActionMarkers`.
- On repair only: `priorIntake` (your previous output),
  `userAnswers` (the user's resolution of your prior
  `outstandingQuestions[]`), `priorWarnings`.

## Output

One `write_state_slice` call with an `IntakeSchema`-valid payload. The
tool validates against the schema before persisting; a schema failure
returns a structured error you can recover from in the same turn.

## Procedure

This is a judgment exercise. Read the brief in full, plan, then write
once.

### Cases come first

Build the `cases` map. Each case has `label`, `intent`, `requiresAuth`,
plus optional `knowledgeNeeds`, `actionsRequired`, `notes`, and the
three verbatim brief-content fields documented in [[data-flow-contracts]]
Invariant #7:

- **`opening`** — copy the brief's `**Opening**:` line verbatim per
  case. Empty / `(none)` / missing → empty string `""`. Do not
  paraphrase. Do not synthesize from persona or intent.
- **`objective`** — copy the brief's `**Objective**:` block per case.
  Preserve newlines, branch markers (`IF customer confirms`,
  `ON Success`, `ON Failure`), SAY blocks (verbatim text inside
  `SAY: "..."`), indentation, and `SAY NOTHING` literals. The only
  allowed transformation is action-name canonicalization on action
  identifiers — never SAY content, never surrounding prose, never
  disposition values.
- **`cdbLogMap`** — parse the brief's `**CDB log**:` lines into
  `record(actionName, record(dispositionName, cdbLogId))`. cdbLog IDs
  are **verbatim** from the brief. Disposition names follow the
  priority chain in [[data-flow-contracts]] Invariant #7 — apply it
  rigorously; a malformed disposition name (`"Paid Informed"` with
  space + capital) parses cleanly but breaks downstream cdbLog
  matching.

Case keys are strings, not integers — `'1'`, `'3.1'`, `'10'`. Take them
verbatim from the brief.

### Top-level fields

Copy `projectName`, `primaryLanguage`, `languages`, and `callDirection`
from `brief.md`'s frontmatter (the brief skill emits these — see
`docs/schema/brief.md`). If a frontmatter field is missing or partial,
fall back to `projectMeta`. Default `callDirection` to `'inbound'` when
neither the brief nor state declares it. `languages` MUST include
`primaryLanguage` — the schema's `superRefine` rejects otherwise.

### Action-name canonicalization

Scan `**Tools**:`, `**Objective**:` (USE statements + `ON Failure → USE`
refs), and `**CDB log**:` for action names. Apply `systemActionSynonyms`
verbatim. **Skip** any name in `customActionMarkers`.

For a non-canonical name that fits no confident rule AND is not in
`customActionMarkers` (e.g., `notify_billing` in a brief that didn't go
through Stage 0), raise an `outstandingQuestion` blocking `configBuild`:

> `action.<name>` — "Action `<name>` is not in SYSTEM_ACTIONS
> (`transfer_to_agent`, `escalate_to_agent`, `end_conversation`) and
> has no user confirmation marker in brief.md. Classify it: canonical
> synonym of which SYSTEM_ACTION, or custom action requiring a
> definition? Re-run `/vocalls-brief` to add the marker, or hand-edit
> `brief.md`."

Apply canonicalization to `actionsRequired[]`, action identifiers in
`objective`, and `cdbLogMap` keys. Never to surrounding prose, SAY
blocks, or disposition values.

### Branch-SAY consistency

For each branch in `cases.<n>.objective` that carries a verbatim SAY,
sanity-check the SAY's customer-state assumption against the branch
label. Example: branch `IF customer confirms (has paid)` carrying SAY
`"...you must pay your outstanding balance..."` describes someone who
hasn't paid — the SAY contradicts the branch. Raise an
`outstandingQuestion` blocking `scenarioDesign`:

> `branch-say.<case>.<label-slug>` — "Case `<n>`: branch label
> `<label>` appears inconsistent with SAY content `<excerpt>`. Confirm
> the brief is correct as written, or flag for swap."

This is a contextual check, not a regex. Only flag clear contradictions
— minor phrasing differences (formal vs. colloquial, brand-voice
deviation) are NOT flagged. Do NOT flag `IF customer wants help` with
SAY `"I'd be happy to assist you"`. DO flag `IF customer has already
paid` carrying SAY about an unpaid balance.

### Silent-guard cases

Some cases the runtime filters before the agent runs (typically
authentication-failure or misrouted-call dispositions). Add their case
numbers to `runtimeFilteredCases`. The config-builder skips slot-map
generation for those cases; the validator's Mode 5 fidelity check
excludes them from its brief-coverage scan.

### Persona

`persona.name`, `companyName`, `description`, `tone`, `companyRole` are
all required and all non-empty. `companyInfo` is optional; source it
from the brief's `**companyInfo**:` line in `## Persona` (2–4 sentences
for callers). When the brief has no `**companyInfo**:` line, omit the
field — do not invent content.

`register` is optional. Set it explicitly only when the brief's
`## Persona` section says so (e.g., "Address the caller formally /
informally"). Otherwise leave it `undefined` — the translate stage
applies the language default (see `core/prompts/references/register.md`).

### Disposition policy

Capture the brief's disposition rules into `dispositionPolicy` as a
single non-empty string. If the brief is silent, infer from the cases
(every case has at least one terminal disposition).

### Knowledge facts

Short factual key-value items go into `knowledgeFacts`. Longer
narrative knowledge belongs in the scenario-designer's
`knowledgeWiring` — leave it out of intake.

### Project rules — verbatim

Extract the brief's `## Project rules` bullet list into `customRules` —
one entry per bullet, verbatim, trimmed of the leading `- `. These are
global rules ("MUST always confirm amounts", "MUST NOT promise refund
without escalation") that the config-builder injects into the persona
via `projectRulesAppendix`. If the section is missing or empty, leave
the default `[]`. Do not synthesize rules from cases, persona tone, or
disposition policy.

### Variables — verbatim

Extract the brief's `## Variables` table into `variables` — one
`{ from, to, hook? }` entry per row:

- `from` — the API path (column 1).
- `to` — the variable name the runtime binds (column 2).
- `hook` — array of named transformers (column 3, split on `+` or
  whitespace; omit when blank or `(none)`).

The config-builder projects this verbatim into
`slotMap.agents.<id>.CANONICAL_RULES`. If the section is missing or
empty, leave the default `[]`. Do not invent rows, do not guess hook
names, do not infer entries from `{{token}}` references in objectives.
If a row's `from` cell starts with `<!-- BRIEF: not found` (the brief
skill emits this when the source files don't carry the value), copy the
row anyway with the marker text as `from`; downstream stages will
surface it to the user.

### Speech placements & action messages

These come pre-parsed in `parsedMarkers.speechPlacements` and
`parsedMarkers.actionMessages`. Copy them into the corresponding intake
fields. **You do not parse markers** — the deterministic parser already
did that; doing it again here is a drift surface.

If `parserWarnings` contains a marker anomaly, translate it into an
`outstandingQuestion` blocking `scenarioDesign` (use the parser's
suggested wording when present). See [[data-flow-contracts]] Invariant
#8 for the speech-placement contract end-to-end.

### Ambiguity → questions, never invented values

If a required field cannot be determined from the brief and a reasonable
default does not exist, write an entry into `outstandingQuestions[]`:

- `id` — a stable slug (`'persona.companyRole'`, `'case-3.disposition'`).
- `question` — the question you'd ask a human, in plain prose.
- `blocksStage` — `'scenarioDesign'` or `'configBuild'`.
- `deferralCount` — 0 for new questions (the orchestrator increments
  it across rounds; see "On repair" below).

Then call `report_status` with token `STAGE_PAUSED` and `gateName:
'outstandingQuestions'`. Never invent a value to avoid pausing.

### On repair

When you received `priorIntake` + `userAnswers`:

1. Read your prior reasoning from `priorIntake.outstandingQuestions`
   first.
2. Reconcile `userAnswers` against those questions. Drop questions the
   user answered; keep questions the user explicitly deferred (their
   `deferralCount` was incremented by the orchestrator); raise new
   questions only if the user's answers reveal new gaps.
3. **Preserve `deferralCount` verbatim** when re-emitting an unresolved
   question (match by `id`). Only set `deferralCount: 0` for genuinely
   new questions raised this round. Overwriting `deferralCount` on
   every run erases the deferral history and defeats the escalation
   cap.
4. Do not regenerate the entire intake from scratch on repair. Preserve
   fields the user already implicitly approved by not contesting them.

### Brief-vs-state primary-language conflict

When the brief's `primaryLanguage` differs from
`projectMeta.primaryLanguage`, **the brief wins** (it is the
human-authored source of truth; `_meta` is the `npm run init`
default). Write the brief value to `intake.primaryLanguage`; the
orchestrator copies it forward to `_meta` at stage transition. Do not
pause or raise a question on this conflict.

## Quality bar

- **Coverage.** Every case in the brief becomes an entry in
  `intake.cases`. Cases dropped silently (no `runtimeFilteredCases`
  entry, no `outstandingQuestions[]` entry explaining why) is the
  worst failure — downstream stages cannot recover what you didn't
  capture.
- **Filter accuracy.** `runtimeFilteredCases ⊂ cases` keys. Every
  entry is a real case the runtime filters; never a hand-wave to drop
  work.
- **Persona completeness.** All five required persona fields non-empty.
- **Verbatim brief content.** `cases.<n>.opening`, `cases.<n>.objective`,
  and `cases.<n>.cdbLogMap` follow the verbatim rules and disposition-
  derivation priority chain. Zero paraphrase of opening or objective.
  Zero invented cdbLog IDs.
- **No invented values.** Anything you couldn't confidently extract is
  in `outstandingQuestions[]` with `id`, `question`, `blocksStage`,
  `deferralCount`.
- **Parsed markers carried forward.** Every entry in
  `parsedMarkers.speechPlacements` and `parsedMarkers.actionMessages`
  appears in the corresponding intake field. Every `parserWarnings`
  entry has a matching `outstandingQuestion`.
- **`deferralCount` preserved across repair rounds.**
- **Schema parse succeeds on first attempt.** If the
  `write_state_slice` tool returns a schema error, fix the offending
  paths and retry once. Repeated rejection on the same dispatch =
  `STAGE_FAILED`.

## Failure modes

- **Brief unparseable** (file missing, malformed markdown beyond
  recovery). Call `report_status` with `STAGE_FAILED` and a `reason`
  describing what you tried and what failed.
- **Required field cannot be filled and cannot be questioned** (e.g.
  `primaryLanguage` not in brief frontmatter AND no project default).
  Rare; call `report_status` with `STAGE_FAILED` rather than guessing.
- **Schema validation fails after one in-loop fix.** Call
  `report_status` with `STAGE_FAILED` and field paths in `reason`.

## Closing

When your work is complete, call `report_status` with the appropriate
token. The `report_status` tool call must be the final action of your
turn.

- `STAGE_COMPLETE` — `intake` is schema-valid, `outstandingQuestions`
  is empty.
- `STAGE_PAUSED` (`gateName: 'outstandingQuestions'`) — `intake` is
  partially populated; the user must answer at least one question.
- `STAGE_FAILED` (with `reason`) — see Failure modes.

Never call `STAGE_ESCALATED` or `STAGE_NOOP` from intake.
