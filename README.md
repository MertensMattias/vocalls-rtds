# vocalls-sdk-workflow

Vocalls IVR build pipeline — **workflow-tier architecture**. Generates production-ready IVR call-agent configs (`AGENT_*.js`) from business briefs.

This repo is the successor to `workflow-main-v2`. It replaces the prose-driven LLM orchestrator with a code-driven workflow that calls Claude per stage via the official `@anthropic-ai/sdk`.

**See [`docs/plans/2026-05-18-003-orchestrator-workflow-architecture-plan.md`](docs/plans/2026-05-18-003-orchestrator-workflow-architecture-plan.md) for the full architecture spec.**

---

## Status

**Initialized.** Project-management surface and shared infrastructure are in place; the orchestrator and per-stage runner (plan 003 U1–U10) are stubs awaiting implementation.

| Surface | State |
|---------|-------|
| Project management (`npm run init`, `switch`, `validate`, `simulate`, `export`, etc.) | Ready |
| Templates (`templates/`) | Ready |
| Shared infra (`core/state-io.js`, `canonicalHash.js`, `schema/*`, validator modes 1–5, `vocalls-autofix` skill) | Ready |
| Pipeline orchestrator (`bin/vocalls.js`) | **Stub** — prints "not yet implemented" |
| In-code FSM (`core/orchestratorFsm.js`) | **Stub** (plan 003 U2) |
| Subagent runner (`core/subagentRunner.js`) | **Stub** (plan 003 U3) |
| Per-stage prompts (`core/prompts/*.md`) | **Stub** (plan 003 U4 + U7) |
| User gates (`core/gates/`) | **Stub** (plan 003 U5) |

---

## Quick start (project management)

```bash
npm install
npm run init                                 # interactive — scaffolds projects/<name>/
npm run switch -- <name>                     # set active project
npm run validate -- --project <name>         # ES5/schema check on AGENT_*.js (once built)
npm run simulate -- --project <name>         # local sandbox simulation
npm run export -- --project <name>           # bundle for Vocalls platform
```

The build pipeline itself (`npm run build` / `npm run vocalls`) is **not yet wired**. Until plan 003 U6 lands, this command will print a notice pointing at the plan doc.

---

## Architecture (one paragraph)

The vocalls pipeline has a fully-specified state space (`intake → scenarioDesign → configBuild → validate → translate → done`) with deterministic transitions. That's a **workflow**, not an agent. `bin/vocalls.js` will be a ~300-line Node FSM. Each stage dispatches a single `client.messages.create()` call to Claude through `core/subagentRunner.js` with a typed tool surface (`report_status`, `report_findings`, `write_state_slice`) defined in `core/stageTools.js`. Per-stage model/effort selection lives in `core/orchestrator-constants.js`. State persistence stays in `core/state-io.js` (unchanged). Validator modes 1–5 stay in `core/validatorRunner.js` (unchanged).

---

## Repository layout

```
bin/vocalls.js                 Pipeline entry (stub — plan 003 U6)
cli/                           Project management: init, switch, validate, simulate, export, ...
core/
├── orchestratorFsm.js         FSM transitions (stub — plan 003 U2)
├── subagentRunner.js          Per-stage SDK loop (stub — plan 003 U3)
├── stageTools.js              Typed tool schemas (stub — plan 003 U1)
├── orchestrator-constants.js  Stage list, REPAIR_CAP, per-stage model/effort (stub — plan 003 U1)
├── prompts/                   Per-stage Markdown system prompts (stubs — plan 003 U4/U7)
├── gates/                     User-gate flow (stub — plan 003 U5)
├── state-io.js                State.json read/write (unchanged)
├── canonicalHash.js           Input-hash canonicalization (unchanged)
├── schema/                    Zod schemas (Intake, ScenarioDesign, SlotMap, etc.)
├── validatorRunner.js         Validator modes 1–5 (unchanged)
└── ...
scripts/                       assemble, run-validator, gen-docs, gen-jsonschema, ...
templates/                     Project skeleton copied by `npm run init`
projects/<name>/               Per-project workspaces (created by `npm run init`)
.claude/skills/
├── vocalls-autofix/           Deterministic slot-map autofix rules (unchanged)
├── vocalls-brief/             brief.md generation from VSDX/PDF/Lucidchart (unchanged)
└── vocalls-monitor/           Pipeline anomaly monitor (unchanged)
docs/plans/                    Architecture plans (the live spec is 2026-05-18-003)
```
