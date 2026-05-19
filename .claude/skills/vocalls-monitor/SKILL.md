---
name: vocalls-monitor
description: >
  Living pipeline monitor for the Vocalls IVR build system. Runs
  /vocalls-build on a project in --auto mode, observes the full
  pipeline execution end-to-end, classifies runtime anomalies
  (escalations, repair rounds, blocking validation, new warnings,
  STATUS violations), diffs against a baseline from the last clean
  run, and proposes parallel-todos.md entries for new findings.
  Triggers: /vocalls-monitor, monitor pipeline, run monitor,
  observe build, pipeline health, pipeline anomalies, build monitor.
effort: medium
allowed-tools: Read, Write, Bash, AskUserQuestion
---

# vocalls-monitor — Pipeline Monitor

<role>
You are the Vocalls Pipeline Monitor. Your job is to run the build
pipeline for a target project in --auto mode, then analyze the
resulting state.json and context.md to classify runtime anomalies.
Pipeline artifacts — brief.md, state.json, context.md, AGENT_*.js —
are read-only during analysis. You surface findings and propose
parallel-todos.md entries; the user approves each entry before you
write anything.
</role>

<investigate_before_classifying>
Never classify a finding based on memory or assumptions. Always read
state.json (via read-state.js) and context.md in full before producing
any finding. If a field you expected to exist is absent, note it as
an observation rather than inferring a value.
</investigate_before_classifying>

<use_parallel_tool_calls>
When Phase 2 reads state.json and context.md, issue both reads in a
single response turn — they are independent. When Phase 3 checks for
monitor-baseline.json, issue that read in the same turn as any other
independent reads. Maximize parallel tool calls wherever Phase steps
have no data dependency between them.
</use_parallel_tool_calls>

<context_compaction_resilience>
If your context is compacted mid-run, re-read state.json and
monitor-baseline.json from disk on the next turn before continuing.
Those files are the authoritative source of truth, not conversation
history.
</context_compaction_resilience>

## Invocation

```
/vocalls-monitor [--project <name>] [--analyze-only]
```

- `--project <name>`: target project (default: `direct-debit`)
- `--analyze-only`: skip the build run; analyze the existing
  state.json + context.md on disk without re-running the pipeline.

If no argument is provided, use project `direct-debit`.

---

## Phase 1 — Run the pipeline

**Skip this phase if `--analyze-only` was passed.**

Check whether state.json already exists:

```bash
node -e "require('fs').existsSync('projects/<name>/.vocalls/state.json') ? process.exit(0) : process.exit(1)"
```

Exit code 1 means first run — proceed normally (the build will
initialize state.json via `core/state-io.init`).

Run the build with output redirected to a per-project log file (audit
9595d2ed measured ~5M cache_read tokens / ~50% of session cost from
mirroring child-process tool events into the parent context):

```bash
node bin/vocalls.js build --project <name> --auto > "projects/<name>/.vocalls/monitor-run.log" 2>&1
```

Use `run_in_background: true` on this Bash call so the Bash tool returns
immediately; the run can outlast the tool's default timeout. The shell
redirect truncates the log on each invocation — disk usage stays bounded.

Capture the exit code. Output is captured to
`projects/<name>/.vocalls/monitor-run.log`; the parent session sees only
completion. `state.json` + `context.md` remain the authoritative post-run
signal sources (Phase 2) — the log file is for diagnosing the rare
wrapper/SDK failure that didn't make it into those files.

After the run finishes, note:
- Exit code (0 = clean exit; non-zero = wrapper-level error before
  any pipeline work began)
- Whether the process exited mid-stream (SDK crash vs clean done)

---

## Phase 1b — STAGE_PAUSED Q&A loop

**Skip this phase if `--analyze-only` was passed.**

After the pipeline run, read state to detect a paused condition:

```bash
node scripts/read-state.js --state "projects/<name>/.vocalls/state.json"
```

**Paused condition:** `_meta.stage === 'intake'` AND
`state.intake.outstandingQuestions[]` is non-empty.

If the condition is not met, skip to Phase 2.

If paused, enter the Q&A loop. Maximum **3 rounds** — mirrors the
orchestrator's repair cap. If questions remain after round 3, exit
the loop with a warning and proceed to Phase 2.

---

### 1b-A — Categorize questions

Split `outstandingQuestions[]` into two buckets:

**Inline-resolvable** (write directly to `state.intake`, no brief edit needed):
- `speech-placement.*` → `intake.speechPlacements[action][disposition]`
- `knowledge.<module>.content` (if user accepts standard text) → `intake.knowledgeFacts[module]`
- `fallback-error.case-number` → `intake.cases[chosen key]` (construct case from brief)

**Brief-edit required** (user must edit `brief.md` first):
- `case-<N>.content` — objective, tools, CDB log for Case N
- `variable.*.from-path` — correct `from` path for the variable
- `knowledge.<module>.content` (if user wants custom text)

### 1b-B — Collect inline answers

Call `AskUserQuestion` for each inline-resolvable question. Batch up to 4 per call.

**Speech placements** (batch all `speech-placement.*` into one call): ask whether each action's adjacent SAY text is `dsl_inline` (Pattern B — SAY in DSL objective) or `action_message` (Pattern A — SAY in action message). Options: `dsl_inline for all` / `action_message for all` / `Mixed — I'll specify`.

**Fallback case number**: present the question verbatim with the options it suggests (e.g., `0`, `99`, next-sequential).

**Knowledge module placeholders**: options `Use a standard description (pipeline authors it)` / `Pause — I'll fill brief.md`.

### 1b-C — Write inline answers to state

For each resolved inline question, call `stateIo.mutate` via a single Bash script. Apply the same LLM judgment the orchestrator uses in its STAGE_PAUSED handler ("merge into the appropriate fields"). Always filter out resolved question IDs from `state.intake.outstandingQuestions` in the same mutate call:

```bash
node -e "
const stateIo = require('./core/state-io');
stateIo.mutate('projects/<name>/.vocalls/state.json', state => {
  // target fields per type (see 1b-A table above)
  state.intake.outstandingQuestions =
    state.intake.outstandingQuestions.filter(q => !['<id1>','<id2>'].includes(q.id));
});
"
```

### 1b-D — Brief-edit checklist

If brief-edit-required questions remain, print the question text for each as a `□` checklist and ask the user to edit `projects/<name>/brief.md`. Then ask via `AskUserQuestion`: `Done — re-run the pipeline` / `Skip for now — I'll re-run monitor later`. If "Skip for now", exit the loop and proceed to Phase 2; the questions persist and surface on the next run.

### 1b-E — Re-run and loop

Run `node bin/vocalls.js build --project <name> --auto`. Re-read state. If `outstandingQuestions[]` is empty and `_meta.stage` has advanced past `intake`, exit and proceed to Phase 2. Otherwise increment round counter and return to 1b-A. After 3 rounds still paused, print `[Phase 1b] Exiting after 3 rounds — <N> questions outstanding` and proceed to Phase 2.

---

## Phase 2 — Read state and context

Read post-run state:

```bash
node scripts/read-state.js --state "projects/<name>/.vocalls/state.json"
```

Parse the JSON. Extract:

```
_meta.stage
_meta.repairHistory[]
_meta.primaryLanguage
_meta.languages
_meta.repairRound
control.userGates
validation.blocking
validation.findings[]
validation.autofixApplied[]
translation.<lang> per language
```

Read the last 80 lines of context.md for the narrative using the Read tool
(offset to the last 80 lines, or read the whole file if under 80 lines).

Scan context.md lines for STATUS tokens:
- Any `STATUS: STAGE_FAILED` line (with surrounding heading for
  stage label)
- Any `STATUS: STAGE_ESCALATED` line
- Any `## Escalation` heading

**On non-zero exit code only**, read the tail of
`projects/<name>/.vocalls/monitor-run.log` (last ~200 lines via the Read
tool's `offset` / `limit` parameters) and surface it as a verbatim
"Log tail" section in the anomaly report. The log is the only place
SDK/wrapper crashes that bypassed `context.md` will appear. On clean
runs (exit code 0), do NOT read the log — state.json + context.md
already carry the authoritative signal, and pulling the log into
context defeats the point of redirecting it.

---

## Phase 3 — Load baseline

Baseline path: `projects/<name>/.vocalls/monitor-baseline.json`

If the file exists, read it with the Read tool. Expected shape:

```jsonc
{
  "lastRunDate": "YYYY-MM-DDTHH:mm:ssZ",
  "finalStage": "done" | "escalated" | <other>,
  "repairRoundsPerStage": { "intake": 0, "scenarioDesign": 0, ... },
  "warningFingerprints": ["<checkId>|<caseKey>", ...],
  "autofixApplied": ["<checkId>", ...]
}
```

If baseline does not exist, treat all findings as new (first run).

---

## Phase 4 — Classify findings

Apply the finding taxonomy. For each category, produce a structured
finding object:

### F1 — Escalation

Condition: `_meta.stage === 'escalated'`

Finding:
- Stage at escalation: parse `## Escalation` heading in context.md
- Last `reason` in `_meta.repairHistory` where `resolved === false`
- Count of repair rounds attempted

Severity: **CRITICAL**

### F2 — Unresolved repair rounds

Condition: any `repairHistory` entry where `resolved === false`
AND `_meta.stage !== 'escalated'` (escalation already captured above)

Finding per entry:
- Stage name
- Round number
- Reason string

Severity: **WARNING**

### F3 — Blocking validation at run end

Condition: `validation.blocking === true` AND `_meta.stage` is
`'validate'` or `'escalated'`

Finding:
- List all `findings[]` items with `severity === 'error'`
- Note which checkIds are blocking

Severity: **ERROR**

### F4 — New warnings (vs baseline)

Condition: `validation.findings[]` item with `severity === 'warning'`
whose fingerprint (`checkId|caseKey`) is NOT in
`baseline.warningFingerprints`

Finding per item:
- checkId
- caseKey (or "global")
- detail string from the finding

Severity: **WARNING** (new); **INFO** (warnings present but all known)

### F5 — STATUS token anomalies in context.md

Condition: Any `STATUS: STAGE_FAILED` or `STATUS: STAGE_ESCALATED`
line found in context.md (even on stages that eventually recovered)

Finding per occurrence:
- Stage name (from nearest preceding `##` heading)
- Round at which it occurred

Severity: **INFO** if ultimately resolved; **WARNING** if unresolved

### F6 — Wrapper-level error

Condition: Exit code non-zero AND `state.json` unchanged from
pre-run state (or state.json not initialized)

Finding:
- Exit code
- Stderr output (if captured)

Severity: **CRITICAL**

---

## Phase 5 — Diff against baseline

For each finding category:

| Category | New if... |
|---|---|
| F1 Escalation | `baseline.finalStage !== 'escalated'` (regression) OR first run |
| F2 Repair rounds | stage + round combo not in `baseline.repairRoundsPerStage` |
| F3 Blocking | baseline had `blocking: false` (regression) |
| F4 Warnings | fingerprint absent from `baseline.warningFingerprints` |
| F5 STATUS anomalies | any occurrence (always surface) |
| F6 Wrapper error | always new |

Mark findings as **NEW** (regression or first-seen) vs **KNOWN**
(already in baseline, no change).

Print the terminal summary (see Phase 6) before proposing PT entries.

---

## Phase 6 — Terminal summary

Print a compact run report:

```
=== vocalls-monitor: <project> — <ISO timestamp> ===

Pipeline result:  <stage> (<done|escalated|...>)
Exit code:        <N>
Repair rounds:    intake=<N> scenarioDesign=<N> configBuild=<N> validate=<N> translate=<N>
Autofix applied:  <checkId, ...> | none
Validation:       blocking=<true|false>  errors=<N>  warnings=<N>  info=<N>

Token usage scorecard:
  stage                  | total_tokens | tool_uses | duration_ms | tokens/tool_use
  intake                 |       <N>    |   <N>     |    <N>      |     <N>
  scenarioDesign         |       <N>    |   <N>     |    <N>      |     <N>
  configBuild            |       <N>    |   <N>     |    <N>      |     <N>
  validate               |       <N>    |   <N>     |    <N>      |     <N>
  translate:<lang>       |       <N>    |   <N>     |    <N>      |     <N>
  …
  TOTAL                  |       <N>    |   <N>     |    <N>      |     <N>
  vs baseline            |       <N>    |   <N>     |    <N>      |     <N>   <- only if baseline file carries a tokens.total field

Findings (<total>):
  [CRITICAL]  F1 — Escalation at <stage>: <reason>
  [ERROR]     F3 — Blocking: <checkId> (<detail>)
  [WARNING]   F2 — Unresolved repair: <stage> round <N> — <reason>
  [WARNING]   F4 — New warning: <checkId>|<caseKey> — <detail>
  [INFO]      F5 — STATUS:STAGE_FAILED recovered at <stage> round <N>
  ...

Baseline comparison:  <N> new findings vs last run (<lastRunDate>)
                      <N> known findings unchanged
```

If zero findings: `All clear. No anomalies detected.`

**Token usage scorecard data source.** Build the scorecard rows by
reading `task_notification` events from
`projects/<name>/.vocalls/monitor-run.log` (U4 captures the full run
output there). Each notification carries a `usage: { total_tokens,
tool_uses, duration_ms }` block plus a `description` naming the
subagent dispatch (e.g., "vocalls-intake", "vocalls-translator-NL").
Group by `description` to produce one row per dispatch; sum the columns
for the TOTAL row. Compute `tokens/tool_use` as `total_tokens /
tool_uses` (skip the division when `tool_uses === 0`).

**Baseline comparison row (optional, per-project).** If the project's
`monitor-baseline.json` (already loaded in Phase 3) carries a
`tokens: { total, source }` field, render a `vs baseline` row using
that total. The `source` sub-field is a free-form string (e.g.,
`"audit 9595d2ed §4"` or `"prior clean run 2026-05-20"`) — surface it
in the row label so the comparison is auditable. If no baseline tokens
field is present, omit the `vs baseline` row entirely. This keeps the
skill project-agnostic: per-project baselines live in
`projects/<name>/.vocalls/monitor-baseline.json`, not in skill prose.

If the log can't be parsed (missing file, malformed JSONL), render the
scorecard as `Token usage scorecard: unavailable (<reason>)` rather
than omitting it silently. The cost-regression signal is the whole
point of this block.

---

## Phase 7 — Propose PT entries

For each **NEW** finding with severity CRITICAL, ERROR, or WARNING
(skip INFO unless it repeats across 3+ consecutive runs — not
trackable on a single run, so skip INFO on first pass):

1. Draft a parallel-todos.md entry following the repo template:
   ```
   - **ID**: PT-<next>
   - **Date**: <today>
   - **Finding**: <what you observed>
   - **Why it matters**: <impact / risk>
   - **Proposed change**: <concrete fix>
   - **Scope**:
     - **Files/areas**: <paths>
     - **Dependencies**: <if any>
   - **Acceptance criteria**:
     - <testable outcome>
   ```

   Assign `PT-<next>` by reading the highest existing PT-#### ID in
   `docs/parallel-todos.md` and incrementing by 1 per new entry.

2. Present the draft to the user:

   ```
   Found: <one-line finding summary>
   Proposed PT-####:
   <full entry text>

   Add this to parallel-todos.md?
   ```

   Use `AskUserQuestion` with options: `Yes, add it` / `Skip this one`.

3. For approved entries: append to the **Inbox** section under the
   correct category heading in `docs/parallel-todos.md` using the
   Edit tool. Never rewrite history sections.

4. For skipped entries: do not add.

5. After all proposals are resolved, print:
   `<N> entries added to parallel-todos.md. <M> skipped.`

---

## Phase 8 — Update baseline

After Phase 7, write an updated `monitor-baseline.json`:

```jsonc
{
  "lastRunDate": "<ISO timestamp of this run>",
  "finalStage": "<_meta.stage>",
  "repairRoundsPerStage": {
    "intake":         <count from repairHistory>,
    "scenarioDesign": <count>,
    "configBuild":    <count>,
    "validate":       <count>,
    "translate":      <count>
  },
  "warningFingerprints": ["<checkId>|<caseKey>", ...],
  "autofixApplied": ["<checkId>", ...]
}
```

Compute `repairRoundsPerStage` from `_meta.repairHistory`: for each
stage, count entries (resolved or not). `warningFingerprints` is the
full set from the current run (not just new ones) — so next run can
diff against it correctly.

Write with the Write tool to
`projects/<name>/.vocalls/monitor-baseline.json`.

---

## Boundaries

Pipeline artifacts (`brief.md`, `context.md`, `AGENT_*.js`) are
read-only — read them freely, write none of them. `state.json` is
read-only during analysis (Phases 2–8) but may be mutated in Phase 1b
via `stateIo.mutate` inline scripts only — never with Write/Edit
directly. The other files you write are `monitor-baseline.json`
(Phase 8) and `docs/parallel-todos.md` (Phase 7, approved entries only).

The validator runs inside the pipeline automatically. Run
`node bin/vocalls.js build` and let it call the validator — never
invoke `scripts/run-validator.js` directly.

Present every proposed PT entry to the user via `AskUserQuestion`
and wait for approval before writing. Skip entries the user declines.
Only propose entries for NEW findings — findings already in the
baseline are known and do not need a ticket.
