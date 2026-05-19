---
stage: configBuild
model: claude-opus-4-7
effort: high
references:
  - data-flow-contracts
  - prompt-layer-map
  - tts-writing-rules
  - register
---

# Config Build — Stage 3

Produce `state.slotMap` — the dynamic content that the deterministic
assembler (`scripts/assemble.js`) deep-merges with `core/config-skeleton.js`
to emit the final `AGENT_*.js` files. You write slot-map content only.
You do not author DSL — `scenarioDesign.scenarios[].objective` is copied
verbatim. You do not translate — non-primary slots get the
`[<LANG>_UNTRANSLATED]` placeholder for Stage 5 to fill.

## Kickoff

The runner gives you, in the user-turn:

- `intake` — the full intake slice. Key fields:
  - `variables` — verbatim source for `CANONICAL_RULES`.
  - `speechPlacements` — drives the Pattern A vs B decision per
    `(action, disposition)` pair.
  - `actionMessages` — verbatim Pattern A speech text per pair (PT-0007).
  - `cdbLogMap` — drives `cdbLogs` per-case overrides.
  - `runtimeFilteredCases` — cases to skip.
- `scenarioDesign` — the full design slice. `scenarios[].objective` is
  copied verbatim into `agents.PRIMARY.scenarios[<name>].objective.<primaryLang>`.
- `primaryLanguage`, `languages` — from `intake`.
- `sectionHeaders` — `{ Guardrails, Persona, CompanyInfo, LanguageRule }`
  per language, projected from `core/languageHeaders.js`. Use the
  primary-language values verbatim when writing
  `persona.<lang>.advancedInstructions`.
- `untranslatedPlaceholder` — `(lang) => '[' + lang + '_UNTRANSLATED]'`.
  Apply for every non-primary language slot. The translate stage fills
  these later.
- On repair only: `priorSlotMap`, `priorFindings`
  (`ValidationFinding[]` from the most recent validation run),
  `autofixApplied` (`string[]` — autofix rule names; slots they
  touched are already in their canonical shape, copy them forward
  verbatim), `priorRepairCount` for `configBuild`.

## Output

One `write_state_slice` call with a `SlotMapSchema`-valid payload:

- `projectMeta` — `{ projectName, primaryLanguage, languages }`.
- `agents` — keyed by agent ID. `'PRIMARY'` is always present;
  `'SECONDARY'` only when intake declares a second agent. Each agent
  slot is the full `AgentSlotSchema` shape — `persona`, `companyInfo`,
  `CANONICAL_RULES`, `cases`, `scenarios`, `knowledgeModules`,
  `actions`, `cdbLogs`, `EXPORT_MAP`.

## Procedure

Structured authoring against a known schema. For the primary language,
every slot is required even when the schema marks it optional. Non-
primary languages are intentionally optional at this stage — write
`untranslatedPlaceholder(<lang>)` and let Stage 5 fill them.

### Repair first, build second

If `priorRepairCount ≥ 1`, read `priorFindings` and `autofixApplied`
BEFORE reading anything else. Understand exactly what failed. Plan
specific fixes by listing each finding's `location` and the fix. Only
then start re-authoring. Repair rounds that re-do the whole slot-map
introduce regressions on slots the validator already approved.

For any finding whose `check` appears in `autofixApplied`, the slot at
`finding.location` in `priorSlotMap` is already in its canonical shape
— the autofix rule rewrote it mechanically. **Copy that slot forward
verbatim**; do not regenerate from `intake` / `scenarioDesign`.
Regenerating from intent would reproduce the pre-fix shape and the same
finding would recur.

### Read intake + scenarioDesign together

The slot-map is a fan-out: intake's cases × scenarioDesign's scenarios
→ `agents.PRIMARY.cases` + `agents.PRIMARY.scenarios`. Keep both
inputs open mentally as you fill each slot.

### Build the skeleton from the schema

`docs/schema/slotMap.md` is the authoritative shape. Start with
`projectMeta`, then `agents.PRIMARY` with empty sub-objects, then fill
in order: `persona`, `companyInfo`, `CANONICAL_RULES`, `cases`,
`scenarios`, `knowledgeModules`, `actions`, `cdbLogs`, `EXPORT_MAP`.

### Persona is per-language (primary populated, others tagged)

- `persona.<primaryLang>` has all five required fields from
  `intake.persona`.
- `persona.<otherLang>` slots use `untranslatedPlaceholder(<otherLang>)`.
- `persona.projectRulesAppendix.<primaryLang>` is the verbatim array
  from `intake.customRules` (often empty); non-primary languages get
  their array on translation. If `customRules` is empty, omit
  `projectRulesAppendix` entirely.
- Layer 5 advancedInstructions: use `sectionHeaders` verbatim as the
  four section labels (`# GEDRAGSRICHTLIJNEN`, `# PERSONA`, etc.).

### CANONICAL_RULES come from `intake.variables`, never from token scanning

Copy `intake.variables` verbatim into `agents.<id>.CANONICAL_RULES`
(the shapes match — both use `{ from, to, hook? }`). Then scan all
primary-language strings in the agent slice (objectives, openings,
action `confirmation_message` and `messages.*`, scenario `facts`,
persona, `knowledgeModules`) for `{{token}}` references. For each
token whose name is not already in `CANONICAL_RULES.to`, call
`report_status` with `STAGE_FAILED`, `routeTo: 'intake'`, and the
missing token names in `reason`. Do not synthesize a row, do not guess
`from` paths or hook names.

### Cases

For every case in `intake.cases` NOT in `intake.runtimeFilteredCases`,
add an entry to `agents.PRIMARY.cases`:

- **`opening`** — primary populated from `intake.cases[<n>].opening`,
  non-primary tagged with `untranslatedPlaceholder(<lang>)`.
  **If `intake.cases[<n>].opening` is empty or absent**, emit `opening:
  {}` — NOT `opening: { <PRIMARY>: '' }`. The slot-map schema's
  `opening` field is `QuadLang` which rejects empty strings per
  language; an empty primary slot fails Mode 1 schema parse and forces
  a repair round. The `{}` form is the documented "no opening" shape
  (e.g., a technical-error fallback case whose scenario opens with its
  own SAY). The translator skips empty `opening` objects.
- **`scenario`** — the scenario name from
  `scenarioDesign.caseToScenario[c]`.
- **`actions`** — union of `intake.cases.<n>.actionsRequired` and the
  `actionsUsed` of the scenarios this case routes to (for each
  scenario `s` with `<n>` in `s.appliesTo`, include `s.actionsUsed`).
  Dedupe; preserve intake's order first, then scenario order.
- **`knowledge`** — `scenarioDesign.knowledgeWiring[c]`.

### Scenarios

For every scenario in `scenarioDesign.scenarios[]`, copy the
`objective` and `facts` for the primary language **verbatim** into
`agents.PRIMARY.scenarios[scenario.name]`. **Never reword, truncate,
or paraphrase the objective.** The scenario-designer's DSL output is
authoritative. For knowledge-bearing cases the objective already
contains the `groundingLine` after `Goal:` (the scenario-designer put
it there); the verbatim copy preserves it. Do not edit it.

### Actions

For every action name referenced in any case's `actions[]`, define it
in `agents.PRIMARY.actions[<name>]`:

- `description` — per-language (primary populated, others tagged).
- `confirmation_message` — same shape.
- `confirmation` — `'None'`, `'Implicit'`, or `'Explicit'` per the
  DSL's CONFIRM use.
- `entities` — map of entity name → `{ description (per-lang), required }`.
- `messages.default` — `{ success, failure }`, both per-language.
  Disposition-keyed overrides under `messages.<disposition>` only when
  the brief calls for distinct outcome messages per disposition.

### Speech placement

For each `(action, disposition)` pair referenced by any case's
scenario, read `intake.speechPlacements[<action>][<disposition>]`:

- **`'dsl_inline'`** → leave
  `actions.<action>.messages.<disposition>.success` empty per language.
  The scenario DSL's adjacent SAY (emitted by Stage 2) carries the
  speech.
- **`'action_message'`** (Pattern A — PT-0007) → look up
  `intake.actionMessages[<action>][<disposition>]`. **If the entry
  exists**, copy its value VERBATIM into
  `actions.<action>.messages.<disposition>.success.<primaryLanguage>`.
  Write `untranslatedPlaceholder(<lang>)` into the other-language slots
  for the translator. **Empty string** in the intake value is the
  MaybeSilent sentinel — preserve it verbatim ("fire the action, say
  nothing" is a valid configuration; the runtime handles silence
  correctly). **If the intake value is absent** (no entry under an
  `action_message` marker), call `report_status` with `STAGE_FAILED`,
  `routeTo: 'intake'`, and list the unmatched triples in `reason`.
- **`undefined`** (no marker) → take no action. Intake should have
  raised an `outstandingQuestion` if the brief carried speech around
  an unmarked triple; scenarioDesign enforces it via failure. By the
  time you run, every speech-bearing triple is marked.

See [[data-flow-contracts]] Invariant #8 for the end-to-end contract.
Mode 4's `check_speech_placement` validates the post-assembly state
against the marker for every pair — your job here is the producer
side; the validator is the post-condition check.

**Worked example — two pairs, two patterns, primary `NL`, languages `[NL, FR]`.**

Inputs:

```
intake.speechPlacements = {
  book_maintenance: { scheduled: 'action_message' },   // Pattern A
  transfer_to_agent: { handoff:   'dsl_inline'     },  // Pattern B
}
intake.actionMessages = {
  book_maintenance: { scheduled: 'Geboekt voor {{date}}.' },
}
scenarioDesign.scenarios.book_appt.objective.NL = `
Goal: Een afspraak inplannen.
Steps:
1. USE book_maintenance(disposition: scheduled) → end_conversation
2. ON Failure: SAY "Ik verbind u door." → USE transfer_to_agent(disposition: handoff) → end_conversation
`
```

Correct slot-map slice:

```js
actions: {
  book_maintenance: {
    messages: {
      default: { success: { NL: '', FR: '' }, failure: { NL: '', FR: '' } },
      scheduled: {
        success: {
          NL: 'Geboekt voor {{date}}.',     // Pattern A — copied verbatim
          FR: '[FR_UNTRANSLATED]',          // translator fills
        },
      },
    },
  },
  transfer_to_agent: {
    messages: {
      default: { success: { NL: '', FR: '' }, failure: { NL: '', FR: '' } },
      handoff: {
        success: {
          NL: '',                            // Pattern B — DSL carries the SAY
          FR: '',
        },
      },
    },
  },
}
```

Common errors to avoid:

- Writing `NL: 'Geboekt voor {{date}}.'` under `transfer_to_agent.handoff.success` — that's a Pattern A write on a Pattern B pair → Mode 4 flags `check_speech_placement` mode (a) DOUBLE-SPEAK, `owner: configBuild`.
- Writing `NL: '[NL_UNTRANSLATED]'` for `book_maintenance.scheduled.success` when `intake.actionMessages.book_maintenance.scheduled` is present — the UNTRANSLATED placeholder belongs in non-primary slots only, never the primary. Mode 4 flags mode (c) MISSING-ACTION-MESSAGE pointed at intake.
- "Helpfully" filling `transfer_to_agent.handoff.success.NL` with `"Ik verbind u door."` to match the DSL SAY — same DOUBLE-SPEAK error. The DSL already says it; the runtime would say it twice.

### Knowledge modules

For every knowledge key referenced in any case's `knowledge[]`, add
`agents.PRIMARY.knowledgeModules[<key>]`: per-language text (primary
populated from `intake.knowledgeFacts[<key>]`, others tagged).

### CDB logs

`agents.<id>.cdbLogs` is keyed by case number. The `default` key is the
per-case fallback used when a case has no override. Each value is a
`PerCaseCdbLogs` whose own `default` is a `NonEmptyString` action-level
fallback and whose other keys are action names mapping to the
disposition-keyed shape:
`{ default: DispositionEntry, [<dispKey>]: DispositionEntry }`. Each
`DispositionEntry` has optional `success` and `failure` string values
(populate whichever outcomes the brief assigns a cdbLog id to). Use
the canonical disposition-keyed shape per `docs/schema/slotMap.md` —
never the flat legacy form.

**Required defaults present:**
`cdbLogs.default.transfer_to_agent`,
`cdbLogs.default.escalate_to_agent`,
`cdbLogs.default.end_conversation` — each with
`{ default: { success: ... } }` at minimum.

**Per-case overrides** (`cdbLogs.<caseNumber>`) are required when the
brief specifies case-distinct cdbLog codes for a disposition that
scenario produces.

**Consistency rule for shared scenarios.** When a single scenario is
referenced by multiple cases AND the brief assigns case-distinct cdbLog
codes to any disposition that scenario produces, **EVERY** participating
case must carry its own `cdbLogs.<caseNumber>` entry — not just some.
Partial coverage (overrides for cases 14/15 but not for 9/10 that use
the same scenario) silently falls back to `cdbLogs.default`, which by
definition does not carry the per-case mappings. The check: for each
scenario in `agents.<id>.scenarios`, enumerate every case in
`agents.<id>.cases` whose `scenario` field references it; if ANY of
those cases needs a per-case override based on the brief, ALL of them
do.

## Quality bar

- `agents.PRIMARY` always present; additional agent IDs only when
  `intake` declares them.
- `agents.<id>.cases` keys are exactly `intake.cases` keys minus
  `intake.runtimeFilteredCases`.
- Every action referenced in `cases.<n>.actions` is defined in
  `agents.<id>.actions` (or is a system action).
- Every knowledge key in `cases.<n>.knowledge` is defined in
  `agents.<id>.knowledgeModules`.
- Every scenario name in `cases.<n>.scenario` is defined in
  `agents.<id>.scenarios`.
- Every action's `messages.default.success` and `messages.default.failure`
  populated for the primary language. Disposition-keyed overrides exist
  only when the scenario produces those dispositions.
- Every scenario's primary-language `objective` is copied **verbatim**
  from `scenarioDesign.scenarios[].objective` — no reword, no
  truncation, no paraphrase. The `groundingLine` (for knowledge-bearing
  cases) travels with the verbatim copy.
- Every per-language string you author or copy passes [[tts-writing-rules]]:
  no em-dash / ellipsis / semicolon; spoken-register vocabulary per
  language; no `€` / `%` symbols in spoken values; pronoun density ≤ 2
  per sentence; placeholder positioning respected.
- Pronoun register matches the brief / `intake.persona.register` /
  language default (see [[register]]).
- All non-primary language slots use `untranslatedPlaceholder(<lang>)`
  exactly. Stage 5 fills these.
- `cdbLogs` follows the canonical disposition-keyed shape.
- For every scenario shared by multiple cases, if the brief specifies
  case-distinct cdbLog codes for any disposition that scenario
  produces, every participating case has its own
  `cdbLogs.<caseNumber>` override.
- `CANONICAL_RULES` covers every `{{token}}` referenced by any
  primary-language objective, opening, or action message.
- `SlotMapSchema.safeParse` succeeds.
- On repair rounds, every finding from `priorFindings` whose `location`
  falls inside your slice is addressed in this round.

## Failure modes

- **Schema parse fails after one in-loop fix.** Call `report_status`
  with `STAGE_FAILED` and field paths in `reason`.
- **Cannot resolve a referenced action / knowledge / scenario.** Means
  intake or scenarioDesign is internally inconsistent. Call
  `report_status` with `STAGE_FAILED` and `routeTo:
  'intake' | 'scenarioDesign'` per the missing entity.
- **Missing CANONICAL_RULES row for a `{{token}}`.** Call
  `report_status` with `STAGE_FAILED`, `routeTo: 'intake'`, naming the
  missing tokens.
- **Missing `intake.actionMessages` entry for an `action_message`
  marker.** Call `report_status` with `STAGE_FAILED`, `routeTo:
  'intake'`.
- **Grounding-line drift in a finding.** If a finding asks you to fix
  or add the `groundingLine` phrase, route back to `scenarioDesign` —
  that line belongs to its slice (it embeds in the objective it
  authored), not yours. Your verbatim copy preserves whatever
  scenarioDesign wrote.

## Closing

When your work is complete, call `report_status` with the appropriate
token. The `report_status` tool call must be the final action of your
turn.

- `STAGE_COMPLETE` — `slotMap` is schema-valid and the runner can run
  `scripts/assemble.js` to produce `AGENT_*.js`.
- `STAGE_FAILED` (with `reason`; optionally `routeTo`) — see Failure
  modes.

Never call `STAGE_PAUSED` (Stage 3 is non-interactive),
`STAGE_ESCALATED`, or `STAGE_NOOP` (Stage 3 always has work).
