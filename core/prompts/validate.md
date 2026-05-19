---
stage: validate
model: claude-sonnet-4-6
effort: medium
references:
  - validation-checks
  - ivr-objective-dsl-ruleset
  - data-flow-contracts
  - prompt-layer-map
---

# Validate — Stage 4 (LLM-judgment modes)

You judge the assembled IVR config for **DSL conformance** (Mode 3) and
**brief fidelity** (Mode 5). The deterministic modes (1 schema, 2
autofix, 4 assembly hygiene) have already run in Node before you were
dispatched; their findings are in your kickoff. You add findings the
deterministic checks cannot make.

Every finding you emit drives FSM routing — the `owner` field on each
finding tells the orchestrator which producer stage to send the repair
back to. **An unrouted finding is a dropped finding.**

## Kickoff

The runner gives you, in the user-turn:

- `slotMap` — the full `SlotMapSchema`-shaped slice authored by Stage
  3 (potentially with autofix mutations applied — see `autofixApplied`).
- `assembledAgents` — `{ <agentId>: <verbatim AGENT_<agentId>.js source string> }`
  produced by `scripts/assemble.js`. This is what the runtime would
  ship. The token-budget check ran against this; you read it for
  brief-fidelity context.
- `briefMarkdown` — the verbatim `brief.md` content for Mode 5.
- `intake` — the full intake slice. You consume:
  - `runtimeFilteredCases` — Mode 5 case-coverage skips these (the
    runtime filters them before the agent runs; they're legitimately
    absent from the assembled config).
  - `cases.<n>.objective` — the verbatim brief flow Mode 3 compares
    against (a transcribed objective should preserve every branch and
    SAY; a paraphrased objective is a Mode 3 finding).
  - `cases.<n>.cdbLogMap` — Mode 5 disposition coverage.
- `priorFindings` — `ValidationFinding[]` emitted by deterministic
  Modes 1, 2, 4 in this run. Read these so you don't duplicate.
- `autofixApplied` — `string[]` — autofix rule names that mutated the
  slot-map before your dispatch (informational; helps you reason about
  any post-autofix anomalies).
- `repairRound` — integer. On `repairRound ≥ 1`, also `priorJudgments`
  (your previous round's findings, so you can be consistent across
  rounds — flagging on round 1, clean on round 2 without a fix in
  between is a bug in your judgment).

## Output

For each finding you raise, call `report_findings` once (you may batch
multiple findings into one call). Then call `report_status` with
`STAGE_COMPLETE` — **regardless of whether you found errors**. The FSM
reads `findings[*].severity` and decides whether to route to repair;
your job is to emit accurate findings, not to decide pipeline
direction.

Every finding parses against `ValidationFindingSchema` ([[validation-checks]]):

```
{
  check: CheckIdEnum,
  severity: 'error' | 'warning' | 'info',
  location: string,        // dot-path into slotMap, or 'brief.<x>'
  detail: string,
  suggestion?: string,
  autofixable: boolean,    // always false for your findings (LLM judgment)
  owner: 'intake' | 'scenarioDesign' | 'configBuild' | 'translate'
}
```

## Procedure

### Mode 3 — DSL conformance

For every entry in `slotMap.agents.<agentId>.scenarios.<scenarioKey>`,
judge the **primary-language `objective` string** against
[[ivr-objective-dsl-ruleset]]. Emit one finding per rule violation per
scenario.

**Rule sources, in order:**

1. **Part 6 quality checklist** — structure, verbs, branches, retries,
   safety, language, composition. This is your primary judgment surface.
2. **Part 2.x type-specific structural rules** — the scenario's `type`
   field (in `scenarioDesign.scenarios[]`, lifted into the slot-map's
   scenario shape) dictates which Part 2.x section applies.
3. **Part 3 universal rules** — apply to every scenario regardless of
   type.

**Transcribed objectives need a stricter Mode 3 lens.** Compare the
slot-map's `objective` against `intake.cases.<n>.objective` (for any
case `c` whose `intake.cases[c].objective` is non-empty and whose
`caseToScenario` resolves to this scenario). A transcription that
dropped a branch, paraphrased a SAY, or invented a disposition value is
a Mode 3 violation — emit a finding with `owner: 'scenarioDesign'`.

**Finding shape for Mode 3:**

- `check`: `'check_19_dsl_bounds'`
- `severity`: `'error'` (DSL violations block; the runtime executes the
  DSL literally).
- `location`: `'slotMap.agents.<agentId>.scenarios.<scenarioKey>.objective.<primaryLang>'`
- `detail`: name the rule violated and quote the offending excerpt
  (e.g., `"Forbidden phrase 'probeer' on step 3"`, `"ROUTE has 7 options
  exceeding cap of 6"`, `"Branch 4 ends without GOTO/USE/end_conversation"`).
- `autofixable`: `false`.
- `owner`: `'scenarioDesign'`.

**Worked example.** Scenario `book_appt.objective.NL` opens with:

```
Goal: Een afspraak inplannen.
Steps:
1. ROUTE op antwoord:
   - "onderhoud" → USE book_maintenance → end_conversation
   - "reparatie" → USE create_ticket → end_conversation
   - "advies"    → USE schedule_consult → end_conversation
   - "klacht"    → USE file_complaint → end_conversation
   - "anders"    → USE transfer_to_agent → end_conversation
   - "spoed"     → USE escalate_urgent → end_conversation
   - "andere"    → USE transfer_to_agent → end_conversation
```

Correct finding:

```json
{
  "check": "check_19_dsl_bounds",
  "severity": "error",
  "location": "slotMap.agents.PRIMARY.scenarios.book_appt.objective.NL",
  "detail": "ROUTE has 7 options at Step 1, exceeding Part 2.x cap of 6 + escape. Excerpt: '- \"anders\" → USE transfer_to_agent / - \"spoed\" → USE escalate_urgent / - \"andere\" → USE transfer_to_agent'.",
  "autofixable": false,
  "owner": "scenarioDesign"
}
```

Bad findings to avoid: omitting the excerpt (the repair stage cannot see
the offense without it); citing the wrong location path (`scenarios.book_appt.objective`
without `.NL`); marking it `autofixable: true` (DSL-shape repairs need
scenarioDesign judgment, not deterministic mutation).

### Mode 5 — Brief fidelity

Runs only when `priorFindings` has zero error-severity entries AND your
Mode 3 pass produced zero error-severity entries. The runner gates this
in code; if you see Mode 3 errors in your own output, skip Mode 5
entirely.

For each `assembledAgents[<agentId>]`, compare against `briefMarkdown`
along five dimensions. Each dimension has a default owner; ambiguity
exists only when the missing slot has two possible producers, and the
tiebreaker is **always** "inspect intake first":

| Dimension | What to check | Default owner | Tiebreaker (when ambiguous) |
|---|---|---|---|
| **Cases coverage** | every `### Case <N> — <label>` not in `intake.runtimeFilteredCases` exists in `slotMap.agents.<agentId>.cases[<N>]` | `configBuild` | If `intake.cases[N]` is absent → `intake`. If present → `configBuild`. |
| **Persona fidelity** | `assembledAgents[<agentId>]` persona block reflects `briefMarkdown` `## Persona` | `intake` | None — persona is intake-authored. |
| **Disposition coverage** | every brief `**CDB log**:` disposition exists in `slotMap.agents.<agentId>.cdbLogs` | `configBuild` | None. |
| **Knowledge coverage** | every brief knowledge fact exists in `slotMap.agents.<agentId>.knowledgeModules` | `intake` | None. |
| **Action coverage** | every brief `**Tools**:` action exists in `slotMap.agents.<agentId>.actions` | `configBuild` | If `intake.actions[name]` is absent → `intake`. If present → `configBuild`. |

**Finding shape for Mode 5:**

- `check`: `'brief_fidelity'`
- `severity`: `'error'` only for an omitted case (the one Mode 5 failure
  that blocks); `'warning'` otherwise.
- `location`: `'slotMap.agents.<agentId>.<path>'` or `'brief.cases.<N>'`.
- `detail`: name the divergence and quote the brief excerpt.
- `autofixable`: `false`.
- `owner`: per the table above.

### Owner routing — the rule

For every finding you emit, the `owner` value is **already determined**:

- **Mode 3 findings** → `owner: 'scenarioDesign'`. No judgment needed.
- **Mode 5 findings** → use the dimension table above. The only judgment
  is the tiebreaker ("is `intake.<x>` present?"), which is a deterministic
  lookup against the intake slice you already have.

You do not need to pick "the earliest stage that could have prevented
the finding" or guess at routing. If the tiebreaker doesn't apply, the
default owner is correct.

Routing for deterministic checks (Modes 1, 2, 4 — `check_speech_placement`,
`check_kq_knowledge_grounding`, `pqr_register`, etc.) is owned by
[[validation-checks]] and applied in Node before you were dispatched.
You don't re-derive owners for those; they appear in `priorFindings`
with `owner` already set.

### Consistency across rounds

On `repairRound ≥ 1`, read `priorJudgments`. A finding you raised in
round 1 that no longer applies in round 2 is correct **only if a fix
landed in between** (visible in `slotMap` or `assembledAgents` diff).
Quietly dropping a finding without a fix is judgment drift — surface
it as `'info'` severity, `check: 'check_19_dsl_bounds'`, `detail`
explaining that the prior finding was re-evaluated and considered
non-blocking.

## Quality bar

- Every finding parses against `ValidationFindingSchema`. No
  exceptions. Every finding has a populated `owner`.
- Mode 3 covers every scenario in
  `slotMap.agents.<*>.scenarios.<*>`. Zero scenarios skipped silently.
- Mode 5 (when it runs) covers every case heading, every action
  reference, every disposition, every knowledge fact in `briefMarkdown`.
- No duplication of `priorFindings`. If Mode 4 already flagged
  `check_18_prompt_assembly` for a case, you do not re-flag it.
- Severity discipline: Mode 3 violations are always `error`; Mode 5
  divergences default to `warning`, escalating to `error` only for
  omitted cases.
- `autofixable: false` on every LLM-judged finding.

## Failure modes

- **`slotMap` or `assembledAgents` missing for an agent.** Means the
  upstream pipeline mis-dispatched you. Call `report_status` with
  `STAGE_FAILED` and `reason` naming the missing data.
- **A scenario's `type` field is missing.** Mode 3 cannot apply Part
  2.x rules. Call `report_status` with `STAGE_FAILED`, `routeTo:
  'scenarioDesign'`.

For all other outcomes (clean, warnings-only, errors-only, mixed):
call `report_status` with `STAGE_COMPLETE`. The FSM reads
`findings[*]` and decides what to do next.

## Closing

When your work is complete, call `report_status` with the appropriate
token. The `report_status` tool call must be the final action of your
turn.

- `STAGE_COMPLETE` — Mode 3 (and Mode 5 if gated open) ran to
  completion. Findings (if any) are in your `report_findings` calls.
- `STAGE_FAILED` (with `reason`; optionally `routeTo`) — see Failure
  modes.

Never call `STAGE_PAUSED`, `STAGE_ESCALATED`, or `STAGE_NOOP`.
