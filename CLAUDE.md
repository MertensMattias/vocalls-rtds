# CLAUDE.md

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

1. **Current flow** — where the workflow starts, which files/functions participate, what data shape is passed between them, where the final behavior is produced.
2. **Change impact** — files that must change, files that probably should not change, risks or inconsistencies found.
3. **Implementation plan** — small ordered steps, no code yet unless the plan is complete, mention whether the change is local or repo-wide.

Only after that, implement the minimum required changes.

---

## 4. No Partial Implementations

A change is not done until all affected paths are updated. When modifying workflows, actions, objectives, prompts, configs, mappings, labels, or API contracts:

- Search for all usages before editing.
- Update all affected languages, cases, mappings, tests, examples, and documentation when relevant.
- Do not leave old names, outdated logic, or parallel behavior unless explicitly requested.
- If only part of the repo can be updated safely, say exactly what remains incomplete.
- Never claim completion if related files were not checked.

---

## 5. Plan Before Repo-Wide Edits

Do not start with code for broad changes. Provide a concise plan with: goal, assumptions, files/areas to inspect, expected affected layers, proposed edit order, validation checks. Wait for approval before applying broad changes.

---

## Repository Overview

This repository is the **next-generation Vocalls agent-builder**, restructured around the workflow-tier architecture spec in [`docs/plans/2026-05-18-003-orchestrator-workflow-architecture-plan.md`](docs/plans/2026-05-18-003-orchestrator-workflow-architecture-plan.md). Read that plan first — it is the authoritative design.

**Headline difference from `workflow-main-v2`:** the pipeline is no longer driven by an LLM orchestrator reading a 574-line skill prompt. The orchestrator is plain Node code (`bin/vocalls.js` + `core/orchestratorFsm.js`) that calls Claude once per stage via the direct Anthropic SDK with typed tool schemas. No `vocalls-build` skill. No 5 sub-agent prose files. No `@anthropic-ai/claude-agent-sdk` dependency.

### Status

The repository is **initialized but not yet operational**. The project-management surface (`npm run init`, `switch`, `validate`, `simulate`, `export`) works against `templates/` and `env.config.json`. The shared infrastructure (state.json I/O, canonical hashing, Zod schemas, validator modes 1–5, `vocalls-autofix`, `vocalls-brief`, `vocalls-monitor`) is migrated and unchanged. The orchestrator and per-stage runner are stubs awaiting plan 003 U1–U10.

### Multi-Project Architecture

Each IVR project lives in `projects/<projectName>/` and is registered in `env.config.json`. Create a new project with `npm run init`.

Every project contains:

- `brief.md` — business requirements source
- `callScript_init/` — global variables and initialization
- `callScripts/AGENT_*.js` — **the final output** (assembled by `scripts/assemble.js` from the slotMap slice in `state.json`)
- `globalLibraries/active/` — shared runtime libraries
- `.vocalls/state.json` — Zod-validated machine state (single source of pipeline truth)
- `.vocalls/context.md` — append-only narrative log

### Pipeline Entry Point (planned)

```
node bin/vocalls.js {build|update|validate|translate} --project <name>
```

Stages: `intake → scenarioDesign → configBuild → validate → translate → done`. Each stage owns one slice of `state.json`; transitions are deterministic functions of `(stage, status, repairRound, findings)` enforced in `core/orchestratorFsm.js`. Per-stage model/effort selection lives in `core/orchestrator-constants.js`. The typed tool surface (`report_status`, `report_findings`, `write_state_slice`) lives in `core/stageTools.js`. Per-stage system prompts live in `core/prompts/<stage>.md`.

### CLI Commands

| Command                                 | Purpose                                          |
| --------------------------------------- | ------------------------------------------------ |
| `npm run init`                          | Create and register a new project from templates |
| `npm run switch -- <name>`              | Set the active project                           |
| `npm run validate -- --project <name>`  | Run schema/cross-field validation on `AGENT_*.js` |
| `npm run simulate -- --project <name>`  | Run the IVR simulator against the project        |
| `npm run export -- --project <name>`    | Bundle for Vocalls platform                      |
| `npm run vocalls -- build --project X`  | Drive the pipeline (stub until plan 003 U6)      |
| `npm test`                              | Run Jest test suite                              |
| `npm run schema:check`                  | Verify `docs/schema/*` matches `core/schema/*`   |
| `npm run format`                        | Format with Prettier                             |

Supporting scripts (invoked by the runner once U3 lands):

- `scripts/assemble.js --project <name>` — assembles slotMap into `AGENT_*.js`
- `scripts/run-validator.js --state <path> --project <name>` — runs validator modes 1–5
- `scripts/write-prompt-projection.js --project <name>` — CLI wrapper around `core/projections.js`

### Schema source of truth

`core/schema/*.js` (Zod 4) defines every artifact shape — Intake, ScenarioDesign, SlotMap, AgentConfig, ValidationFinding, PipelineState. `docs/schema/*.md` and `schemas/*.schema.json` are auto-generated by `scripts/gen-docs.js` + `scripts/gen-jsonschema.js`. `npm run schema:check` fails CI on drift.

### Skills

The only skills shipped with this repo are the ones plan 003 §Scope marks "unchanged":

- `.claude/skills/vocalls-autofix/` — deterministic slot-map autofix rules; invoked inline by the validator
- `.claude/skills/vocalls-brief/` — brief.md generation from Visio/PDF/Lucidchart source files
- `.claude/skills/vocalls-monitor/` — pipeline anomaly monitor (observational; consumes `.vocalls/state.json` and `.vocalls/run.log.jsonl`)

The retired `vocalls-build` skill and the 5 `vocalls-{intake,scenario-designer,config-builder,validator,translator}.md` agents are **not** in this repo — their content moves into `core/prompts/<stage>.md` when plan 003 U4/U7 lands.

### Documented solutions

`docs/solutions/` — append-only knowledge store of past learnings, organized by category subfolder (`best-practices/`, `architecture-patterns/`, …). New entries are added via `/ce-compound` after a problem is solved.
