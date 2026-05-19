> **Last verified against code:** 2026-05-17.
> Rules 1–6 mirror [CLAUDE.md](CLAUDE.md) §1–6 — if they ever diverge, CLAUDE.md wins.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

---

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

---

## 3. Understand the System Before Changing It

**Do not patch locally when the behavior is system-wide.**

Before changing code:

- Identify the full workflow from entry point to final output.
- Find every place where the same concept is defined, mapped, transformed, validated, logged, or rendered.
- Do not implement a change in only one layer if the same concept exists in multiple layers.
- If the workflow is unclear, stop and explain what is unclear before editing.
- Prefer reading more files over guessing.

For every non-trivial change, first produce:

1. **Current flow**
    - Where the workflow starts.
    - Which files/functions participate.
    - What data shape is passed between them.
    - Where the final behavior is produced.

2. **Change impact**
    - Files that must change.
    - Files that probably should not change.
    - Risks or inconsistencies found.

3. **Implementation plan**
    - Small ordered steps.
    - No code yet unless the plan is complete.
    - Mention whether the change is local or repo-wide.

Only after that, implement the minimum required changes.

---

## 4. No Partial Implementations

**A change is not done until all affected paths are updated.**

When modifying workflows, actions, objectives, prompts, configs, mappings, labels, or API contracts:

- Search for all usages before editing.
- Update all affected languages, cases, mappings, tests, examples, and documentation when relevant.
- Do not leave old names, outdated logic, or parallel behavior unless explicitly requested.
- If only part of the repo can be updated safely, say exactly what remains incomplete.
- Never claim completion if related files were not checked.

---

## 5. Plan Before Repo-Wide Edits

**Do not start with code for broad changes.**

For repo-wide changes, first provide a concise plan with:

- Goal
- Assumptions
- Files/areas to inspect
- Expected affected layers
- Proposed edit order
- Validation checks

Wait for approval before applying broad changes.

---

## 6. TODO Protocol (Mandatory)

**Track discovered work in `docs/parallel-todos.md`.**

When you find any bug, risk, inconsistency, optimization opportunity, cleanup, or follow-up task while working:

- Propose adding it to `docs/parallel-todos.md` using the file's entry template and next available `PT-####` id.
- Ask for user approval before writing the TODO entry.
- If approved, append the item to **Inbox** (never rewrite history sections unless explicitly requested).
- Keep entries concise, dated, and actionable: finding, why it matters, proposed change, scope, and acceptance criteria.
- If not approved, do not add the entry; continue with the requested task.
- When a TODO item is completed, move it from its active section to **Completed (with link to change)** in `docs/parallel-todos.md`.
- For work that is not tracked as a TODO item, record it in `docs/workflow-fix-changelog.md`.

Default behavior:

- Surface findings proactively during implementation/review.
- Treat TODO capture as part of completion for non-trivial work, but still gated by explicit user approval.
- Keep both tracking files current: `docs/parallel-todos.md` for TODO lifecycle, `docs/workflow-fix-changelog.md` for non-TODO executed work.

## Repository Overview

This repository is a **Vocalls agent-builder** — a local development environment and simulator for the Vocalls IVR runtime. It builds, validates, and exports production-ready IVR call-agent configs (`AGENT_*.js`) from business briefs, using a Claude-Code-native pipeline driven by `bin/vocalls.js`.

**For the authoritative current-state design** (pipeline FSM, state.json shape, subagent contract, validator modes, extension points), see [docs/solutions/DESIGN.md](docs/solutions/DESIGN.md). The summary below is a quick orientation; DESIGN.md is the deep reference.

### Multi-Project Architecture

Each IVR project lives in `projects/<projectName>/` and is registered in `env.config.json`. Create a new project with `npm run init`.

Every project contains:

- `brief.md` — business requirements source
- `callScript_init/` — global variables and initialization
- `callScripts/AGENT_*.js` — **the final output** (assembled by `scripts/assemble.js` from the slotMap slice in `state.json`)
- `globalLibraries/active/` — shared runtime libraries
- `.vocalls/state.json` — Zod-validated machine state (single source of pipeline truth)
- `.vocalls/context.md` — append-only narrative log (subagent reasoning per turn)

### Pipeline Entry Point

```
node bin/vocalls.js {build|update|validate|translate} --project <name> [--force]
```

`bin/vocalls.js` is a thin wrapper around `@anthropic-ai/claude-agent-sdk`. The orchestrator brain is `.claude/skills/vocalls-build/SKILL.md`, loaded as the SDK system prompt. No pipeline-stage business logic lives in `bin/`; stage transitions, subagent dispatch, repair loops, and user gates all live in the skill prose. `bin/vocalls.js` does own the per-project pipeline lockfile (`core/projectLock.js`, acquired at startup, released on exit/SIGINT/SIGTERM).

Pipeline stages: `intake → scenarioDesign → configBuild → validate → translate → done`. Each stage owns one slice of `state.json`; transitions are deterministic given STATUS tokens emitted by the subagents (`STAGE_COMPLETE`, `STAGE_FAILED`, `STAGE_PAUSED`, `STAGE_ESCALATED`, `STAGE_NOOP`).

Re-running the pipeline is idempotent: each producer stage records a canonical sha256 of its inputs at `_meta.inputHashes.<stage>`, and the orchestrator emits `STAGE_NOOP` itself when the recorded hash matches the recomputed input hash (no subagent dispatch, no token spend). `--force` clears every entry in `_meta.inputHashes` before stage advancement so every stage re-runs. See [DESIGN.md §4 principle 11](docs/solutions/DESIGN.md) for the full content-addressed-pipeline contract.

### CLI Commands

| Command                                                  | Purpose                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run init`                                           | Create and register a new project from templates                                     |
| `npm run vocalls -- build --project <name> [--force]`    | Run the full Claude-Code-native pipeline; `--force` clears `_meta.inputHashes`       |
| `npm run vocalls -- update --project <name> [--force]`   | Re-enter the pipeline after a brief edit (shares the build execution path)           |
| `npm run vocalls -- validate --project <name>`           | Re-run only the `validate` stage of the Claude-Code-native pipeline                  |
| `npm run vocalls -- translate --project <name>`          | Re-run only the `translate` stage (fans out the four non-primary languages)          |
| `npm run validate -- --project <name>`                   | Legacy CLI: schema/cross-field validation on assembled `AGENT_*.js` (no LLM)         |
| `npm run simulate -- --project <name>`                   | Run the IVR simulator against the project                                            |
| `npm test`                                               | Run Jest test suite (first step is `npm run schema:check`)                           |
| `npm run schema:check`                                   | Verify `docs/schema/*` matches `core/schema/*`                                       |
| `npm run format`                                         | Format with Prettier                                                                 |

Supporting scripts (invoked by the orchestrator / subagents via Bash, not directly by the workflow):

- `scripts/read-state.js --state <path>` — reads and Zod-validates `state.json`, prints it as JSON; the orchestrator's FSM cursor on every turn
- `scripts/write-slot-map.js --state <path> --project <name>` — writes `state.slotMap` to `<projectDir>/.vocalls/slot-map.json` (called by the orchestrator before `assemble.js`)
- `scripts/assemble.js --project <name>` — assembles `slot-map.json` into `callScripts/AGENT_*.js`
- `scripts/run-validator.js --state <path> --project <name>` — runs the 5-mode validator driver (`core/validatorRunner.js`)
- `scripts/write-prompt-projection.js --project <name>` — produces `config-prompt-projection.json` (validator sidecar; the pipeline itself uses the in-process helper in `core/projections.js`)
- `scripts/gen-docs.js`, `scripts/gen-jsonschema.js` — regenerate `docs/schema/*.md` and `schemas/*.schema.json` from `core/schema/*.js`
- `scripts/sha256.js`, `scripts/token-report.js`, `scripts/vsdx-extract.py` — utility scripts (hash a file; usage report; extract text from Visio sources)

### Templates

`templates/` contains the canonical project skeleton that `npm run init` copies into new projects. When changing shared runtime behavior (global libraries, call script structure), edit `templates/` and sync to existing projects manually.

### Schema source of truth

`core/schema/*.js` (Zod 4) defines every artifact shape — Intake, ScenarioDesign, SlotMap, AgentConfig, ValidationFinding, PipelineState. `docs/schema/*.md` and `schemas/*.schema.json` are auto-generated by `scripts/gen-docs.js` + `scripts/gen-jsonschema.js`. `npm run schema:check` fails CI on drift.

### Skills and Agents

**Agents** (`.claude/agents/`) — five subagents, one per pipeline stage. Each agent owns one `state.json` slice end-to-end (one-file-per-worker rule):

- `vocalls-intake.md` — brief.md → `state.intake`
- `vocalls-scenario-designer.md` — `state.intake` → `state.scenarioDesign`
- `vocalls-config-builder.md` — design + intake → `state.slotMap`
- `vocalls-validator.md` — schema parse, cross-field, DSL conformance, brief fidelity (Modes 1–5)
- `vocalls-translator.md` — fills non-primary language slots

**Skills** (`.claude/skills/`) — four folders:

- `vocalls-build/` — orchestrator brain (system prompt for `bin/vocalls.js`)
- `vocalls-brief/` — brief generation from Visio/PDF/CSV/MD source files
- `vocalls-autofix/` — deterministic fixes invoked inline by the validator (Mode 2)
- `vocalls-monitor/` — living pipeline monitor: runs `/vocalls-build` in `--auto` mode, classifies anomalies, diffs against the last clean baseline, and proposes `parallel-todos.md` entries

**References** (`.claude/skills/references/`) — eleven reference documents (DSL ruleset, TTS rules, grounding line, language headers, prompt layer map, validation checks, sub-agent contract, data-flow contracts, do-not-translate, brief-markers, stage-hash-check). `grounding-line.md` is auto-generated from `core/grounding-line.js`; the rest are hand-authored. Consult before modifying agent prose or validator logic. Full list and roles: [DESIGN.md §3](docs/solutions/DESIGN.md).

### Documented solutions

`docs/solutions/` — append-only knowledge store of past learnings, organized by category subfolder. Today the populated categories are `architecture-patterns/` and `best-practices/`; more (e.g. `workflow-issues/`, `runtime-errors/`, `design-patterns/`) are added as they accumulate. The directory also contains the authoritative `DESIGN.md`, `INDEX.md`, and `PRD.md`. Each compounded entry is a markdown file with YAML frontmatter (`module`, `tags`, `problem_type`, `component`). New entries are added via `/ce-compound` after a problem is solved; browse via [docs/solutions/INDEX.md](docs/solutions/INDEX.md).
