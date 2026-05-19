# DESIGN — Vocalls SDK Workflow

> Authoritative architecture reference. Read this before touching code.
> Implementation sequence and per-unit rationale live in
> [`docs/plans/2026-05-18-003-orchestrator-workflow-architecture-plan.md`](docs/plans/2026-05-18-003-orchestrator-workflow-architecture-plan.md).
> Refactor map (what migrates from `workflow-main-v2` and where it
> lands) is in §11.

## 1. Purpose

Turn a `brief.md` for a Vocalls IVR project into a validated,
translated `callScripts/AGENT_<id>.js` bundle. The pipeline is fully
specified — five deterministic stages with repair loops and user gates
— so the orchestrator is **plain Node code**, not an LLM. Claude is
called once per stage with typed tool schemas via the official Anthropic
SDK.

## 2. Goals / Non-Goals

**Goals**

- Deterministic, exhaustively unit-testable FSM (no prose interpretation).
- One mutation surface per stage (`write_state_slice`), Zod-validated
  against the target schema before persistence.
- Per-stage model + effort selection, picked in code.
- Structural protection of `brief.md` and `AGENT_*.js` (no tool can edit
  them).
- Stub mode (`VOCALLS_SDK_STUB=1`) drives the entire pipeline without a
  network call, so every state transition has an integration test.
- **Single source of truth per fact.** Anywhere the same data lives in
  both code and prose is a drift surface; we eliminate them.

**Non-goals**

- LLM-driven orchestration (retired — see plan 003 §Problem Frame).
- `@anthropic-ai/claude-agent-sdk` (retired — workflow tier wants direct
  API).
- Managed Agents (vocalls is a local CLI).
- Custom retry/error classifiers (SDK throws typed exceptions; we catch
  them).

## 3. Architecture at a glance

```
bin/vocalls.js                 # CLI entry; parses flags, runs orchestrate()
  │
  ▼
core/orchestratorFsm.js        # pure state machine (no I/O, no LLM)
  │   applyResult / needsUserGate / applyGate / shouldNoop
  ▼
core/subagentRunner.js         # per-stage dispatch
  │   client.messages.create() + manual tool-use loop
  ▼
core/sdk-client.js             # @anthropic-ai/sdk wrapper + VOCALLS_SDK_STUB
  │
  ├── core/stageTools.js              # Zod schemas → JSON-schema tools
  ├── core/prompts/loader.js          # frontmatter+references → cached system prompt
  ├── core/prompts/projections/*.js   # per-stage live data → user-turn kickoff
  ├── core/prompts/<stage>.md         # 5 system prompts (cached per stage)
  ├── core/prompts/references/*.md    # shared reference docs (Tier A; see §6)
  └── core/orchestrator-constants.js  # model/effort/CAP/timeouts

core/state-io.js               # atomic read/write of .vocalls/state.json
core/canonicalHash.js          # input hashing — drives shouldNoop()
core/validatorRunner.js        # invokes deterministic modes 1, 2, 4 + autofix
core/briefParser.js            # deterministic regex parser for brief.md markers
core/languageHeaders.js        # canonical per-language section headers
core/grounding-line.js         # canonical per-language grounding strings
core/gates/*.js                # user-gate functions (pure)

projects/<name>/               # one IVR project per folder
  ├── brief.md                 # business requirements (immutable from pipeline)
  ├── callScripts/AGENT_*.js   # FINAL output (assembled from slotMap)
  ├── globalLibraries/active/  # shared runtime
  └── .vocalls/state.json      # single source of truth for this project
       run.log.jsonl           # append-only telemetry
       context.md              # narrative log
```

## 4. Pipeline FSM

```
intake → scenarioDesign → [designApproval gate] → configBuild → validate
                                                                  │
                       ┌──────────────────────────────────────────┤
                       ▼ findings.severity = error                │
                  repairRound++                                   ▼ ok
                  clear hash of owner stage                    translate
                  routeTo: owner                                  │
                                                                  ▼
                                                                done
```

| Transition        | Trigger                                  | Effect                                                                                  |
| ----------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `STAGE_COMPLETE`  | Stage finished; output schema valid      | Advance cursor; reset `repairRound`; flip `resolved`                                    |
| `STAGE_FAILED`    | Stage cannot proceed                     | If `repairRound < CAP`, increment + clear owner-stage hash + route. Otherwise escalate. |
| `STAGE_NOOP`      | Input hash matches last run AND `!force` | Cursor unchanged                                                                        |
| `STAGE_PAUSED`    | Gate required (e.g. designApproval)      | Emit gate-pending; orchestrator prompts user                                            |
| `STAGE_ESCALATED` | CAP exhausted or refusal                 | Terminal                                                                                |

`REPAIR_CAP = 3`. All transitions are pure functions in
[`core/orchestratorFsm.js`](core/orchestratorFsm.js) — covered by a
`STATUS × stage × repairRound` cross-product test.

## 5. State contract

`.vocalls/state.json` is the single source of truth. Every stage owns
exactly one slice; nothing else mutates it.

```ts
{
  _meta: {
    stage: 'intake' | 'scenarioDesign' | 'configBuild' | 'validate' | 'translate' | 'done',
    status: 'idle' | 'running' | 'paused' | 'escalated',
    repairRound: 0..3,
    inputHashes: { intake?: sha256, scenarioDesign?: sha256, ... },
    repairHistory: [{ stage, round, owner, resolved, ts }]
  },
  intake?:         IntakeSchema,
  scenarioDesign?: ScenarioDesignSchema,
  slotMap?:        SlotMapSchema,
  validation?:     { findings: ValidationFinding[], lastRunAt },
  translation?:    { languages: { [code]: 'pending' | 'inProgress' | 'complete' | 'failed' } }
}
```

Schemas live in [`core/schema/*.js`](core/schema/) (Zod 4) and are the
authoritative shape. `docs/schema/*.md` and `schemas/*.schema.json` are
generated by [`scripts/gen-docs.js`](scripts/gen-docs.js) +
[`scripts/gen-jsonschema.js`](scripts/gen-jsonschema.js);
`npm run schema:check` fails CI on drift.

## 6. Tier model for reference content (drift discipline)

**The single most important architectural rule in this repo.** Every
fact lives in exactly one place. We classify content into three tiers
and route each fact to the correct tier; cross-tier duplication is the
drift surface we design out.

### Tier A — Pure principles / grammar (markdown stays)

Content humans deliberately author and edit. No code mirror, no live
data, no derivation. Edits to Tier A reflect intentional policy
changes. Tier A files are loaded by
[`core/prompts/loader.js`](core/prompts/loader.js) per the stage
prompt's `references:` frontmatter list, concatenated verbatim into
the cached system prompt.

| File                                                   | Owner content                                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `core/prompts/references/ivr-objective-dsl-ruleset.md` | DSL grammar (verbs, types, structure, quality checklist)                                                         |
| `core/prompts/references/tts-writing-rules.md`         | TTS style guide; per-language vocabulary                                                                         |
| `core/prompts/references/data-flow-contracts.md`       | Cross-stage invariants (#7 verbatim brief, #8 speech placement, #9 transcribe-first)                             |
| `core/prompts/references/register.md`                  | Voice register table + common pitfalls                                                                           |
| `core/prompts/references/prompt-layer-map.md`          | 13-layer prompt narrative + Pattern A/B explanation (Tier A _for now_; layer table migrates to Tier C — see §11) |
| `core/prompts/references/validation-checks.md`         | CheckId catalog (Tier A _for now_; migrates to Tier C — see §11)                                                 |

### Tier B — Code-projected at dispatch time (no markdown reference)

Live data that changes per project / per run. The loader builds a
concrete block at dispatch time from current `state` + code constants
and injects it in the **user-turn** (so the cached system prompt stays
stable, but every dispatch sees fresh data). The LLM consumes the
concrete list, never an abstract class taxonomy.

| Projection                                                              | Source(s) of truth                                                                                | Consumed by                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `systemActions: Set<string>`                                            | `core/schema/slotMap.js#SYSTEM_ACTIONS`                                                           | intake                                               |
| `systemActionSynonyms: { [alias]: canonical }`                          | `core/schema/shared.js#SYSTEM_ACTION_SYNONYMS`                                                    | intake                                               |
| `parsedMarkers` (speechPlacements, actionMessages, customActionMarkers) | `core/briefParser.js` run before intake dispatch                                                  | intake                                               |
| `parserWarnings`                                                        | `core/briefParser.js`                                                                             | intake                                               |
| `groundingLine: string`                                                 | `core/grounding-line.js` (one per language)                                                       | scenarioDesign, translate                            |
| `sectionHeaders: { Guardrails, Persona, CompanyInfo, LanguageRule }`    | `core/languageHeaders.js`                                                                         | configBuild (all languages), translate (target only) |
| `register: { default, override }`                                       | [[register]] defaults + `intake.persona.register`                                                 | translate                                            |
| `untranslatedPlaceholder: (lang) => string`                             | `core/schema/shared.js#UNTRANSLATED_RE`                                                           | configBuild                                          |
| `dnt: { actions, tokens, dispositions, untranslatedMarkerPattern }`     | `intake.variables[].to`, intake actions, intake dispositions, `SYSTEM_ACTIONS`, `UNTRANSLATED_RE` | translate                                            |
| `worklist: { path, primaryValue, isMaybeSilent }[]`                     | `slotMap` + `MaybeSilentText` carve-out                                                           | translate                                            |

Per-stage projection logic lives in
[`core/prompts/projections/<stage>.js`](core/prompts/projections/) —
pure functions of `(state, code constants) → projectedBlock`.

### Tier C — Auto-generated markdown (`do not hand-edit`)

Markdown derived from code by `scripts/gen-docs.js`. Single source of
truth lives in code (constants, Zod schemas, JSDoc); markdown is a
build artifact. Edits to the `.md` are caught by `npm run schema:check`.
Migrations to this tier are listed in §11.

| File                                                                               | Source of truth                          |
| ---------------------------------------------------------------------------------- | ---------------------------------------- |
| `docs/schema/intake.md` (and other schema docs)                                    | `core/schema/*.js`                       |
| `schemas/*.schema.json`                                                            | `core/schema/*.js`                       |
| _(future — see §11)_ `core/prompts/references/grounding-line.md` (if reintroduced) | `core/grounding-line.js#GROUNDING_LINES` |

## 7. Prompt assembly — `core/prompts/loader.js`

The loader resolves a stage prompt into the **system prompt** the
runner sends to Claude. The shape:

```
┌───────────────────── system prompt (CACHED per stage) ───────────────────┐
│                                                                          │
│  <body of core/prompts/<stage>.md, frontmatter stripped>                 │
│                                                                          │
│  ---                                                                     │
│  ## References                                                           │
│                                                                          │
│  <body of references[0].md verbatim>                                     │
│                                                                          │
│  ---                                                                     │
│                                                                          │
│  <body of references[1].md verbatim>                                     │
│                                                                          │
│  ...                                                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

The **user-turn** carries the projection (Tier B) plus the
state-slice the stage consumes:

```
┌───────────────────── user-turn (per-dispatch, NOT cached) ───────────────┐
│                                                                          │
│  ## Stage inputs                                                         │
│  <JSON code block: the state slice this stage reads>                     │
│                                                                          │
│  ## Projected                                                            │
│  <JSON code block: the projection block from projections/<stage>.js>     │
│                                                                          │
│  ## Kickoff                                                              │
│  Begin. Call write_state_slice (and report_findings for validate) as     │
│  needed; close with report_status.                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Loader algorithm (pseudo)

```js
function loadStage(stage) {
  const { frontmatter, body } = parseFrontmatter(
    readFile(`core/prompts/${stage}.md`),
  );
  const refs = frontmatter.references.map((name) =>
    readFile(`core/prompts/references/${name}.md`).trim(),
  );
  const systemPrompt = [body.trim(), "## References", ...refs].join(
    "\n\n---\n\n",
  );
  return { systemPrompt, model: frontmatter.model, effort: frontmatter.effort };
}

function buildKickoff(stage, state) {
  const slice = stageInputSlice(stage, state); // per-stage shape
  const projected = projectFor(stage, state); // from projections/<stage>.js
  return renderUserTurn({ slice, projected });
}
```

### Prompt caching invariant

Stage system prompts are **stable per stage across all runs** (only
content changes are deliberate edits to `<stage>.md` or its
references). Use top-level `cache_control: { type: 'ephemeral' }` per
`shared/prompt-caching.md`. Expected hit rate after a project's first
run is ~100% for the life of the project.

**Cache invalidators to avoid:**

- Timestamps or UUIDs anywhere in `<stage>.md` or its references.
- Reordering `references:` (changes the prefix bytes).
- Adding a `Date.now()` to the user-turn projection (would invalidate
  message-level cache too if breakpoints are placed there — they are
  not; the user-turn is intentionally uncached).

## 8. Subagent runner & typed tool surface

Each stage gets three tools, all defined as Zod schemas in
[`core/stageTools.js`](core/stageTools.js):

| Tool                | Purpose                                                                                |
| ------------------- | -------------------------------------------------------------------------------------- |
| `write_state_slice` | Persist this stage's output slice (schema-validated against the destination Zod shape) |
| `report_findings`   | (validate only) Emit a `ValidationFinding[]` (each with `owner` for FSM routing)       |
| `report_status`     | **Required final call** — `{ token, reason, routeTo?, gateName? }`                     |

The runner uses a manual tool-use loop per
`shared/tool-use-concepts.md` §Manual Agentic Loop. Loop exits on
`stop_reason: 'end_turn'` AND a `report_status` was observed. Missing
`report_status` → hard error. Schema-violation on `write_state_slice`
→ `tool_result` with `is_error: true` returned to the model, which
gets one in-loop retry.

`brief.md` and `AGENT_*.js` are unreachable from any stage: there is no
`bash`, `edit`, or file-write tool in any stage's toolset. Protection
is structural.

## 9. Per-stage model & effort

Stored in [`core/orchestrator-constants.js`](core/orchestrator-constants.js)
under `STAGE_CONFIG`. Each `<stage>.md` frontmatter mirrors these for
documentation; the runner reads `STAGE_CONFIG` (code wins on drift).

| Stage            | Model               | Effort   | Rationale                                              |
| ---------------- | ------------------- | -------- | ------------------------------------------------------ |
| `intake`         | `claude-sonnet-4-6` | `high`   | Upstream parsing; downstream depends on its quality    |
| `scenarioDesign` | `claude-opus-4-7`   | `xhigh`  | Hardest creative step (DSL authoring)                  |
| `configBuild`    | `claude-opus-4-7`   | `high`   | Mechanical-but-complex assembly                        |
| `validate`       | `claude-sonnet-4-6` | `medium` | LLM judgment over deterministic-validator output       |
| `translate`      | `claude-haiku-4-5`  | `low`    | Constrained string substitution; cheap; parallelizable |

All requests use `thinking: { type: 'adaptive' }`. **No `temperature`,
`top_p`, `top_k`, `budget_tokens`** — removed on Opus 4.7 (would 400);
deprecated on Opus 4.6 / Sonnet 4.6.

## 10. User gates

[`core/gates/<name>.js`](core/gates/) exports
`formatQuestion(state) → { prompt, choices, defaultChoice }` and
`applyChoice(state, choice) → newState`. Pure functions, unit-testable.
[`core/promptUserGate.js`](core/promptUserGate.js) is the CLI driver
(`readline`). In `--auto` mode, the default choice is taken and logged.

The LLM is **not** involved in gate flow. Gates known today:
`designApproval`, `qualityGate`, `translateGate`.

## 11. Migration map — from `workflow-main-v2`

Everything in `workflow-main-v2/.claude/{skills,agents}` that this
repo replaces, and where it lands. Plan 003 prescribes the timing;
this section is the destination map.

### 11.1 Retired entirely (replaced by code)

| Source (lines)                                          | Replaced by                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `.claude/skills/vocalls-build/SKILL.md` (574)           | [`bin/vocalls.js`](bin/vocalls.js) + [`core/orchestratorFsm.js`](core/orchestratorFsm.js) |
| `.claude/skills/references/stage-hash-check.md` (89)    | `core/orchestratorFsm.js#shouldNoop` + [`core/canonicalHash.js`](core/canonicalHash.js)   |
| `.claude/skills/references/sub-agent-contract.md` (127) | Typed tool surface in `core/stageTools.js` — contract enforced structurally               |

### 11.2 Five sub-agent files → 5 stage prompts (already extracted)

Each `.claude/agents/vocalls-<X>.md` body had three classes of content:

1. **Orchestration scaffolding** — STATUS lines, Bash invocations,
   Agent dispatch, hash-check reminders, `state.json` read/write
   prose, `_meta.inputHashes` plumbing. **Deleted entirely** —
   structurally enforced by the tool surface and FSM.
2. **Reference material** — DSL ruleset citations, layer map,
   validation-checks catalog. **Moved to Tier A `.md` references**
   (see §11.4).
3. **Domain reasoning** — what the stage actually does. **Refactored
   into [`core/prompts/<stage>.md`](core/prompts/)** with explicit
   kickoff descriptions of the projected Tier B blocks.

| Source (lines)                                      | Target                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `.claude/agents/vocalls-intake.md` (495)            | [`core/prompts/intake.md`](core/prompts/intake.md)                 |
| `.claude/agents/vocalls-scenario-designer.md` (394) | [`core/prompts/scenarioDesign.md`](core/prompts/scenarioDesign.md) |
| `.claude/agents/vocalls-config-builder.md` (360)    | [`core/prompts/configBuild.md`](core/prompts/configBuild.md)       |
| `.claude/agents/vocalls-validator.md` (220)         | [`core/prompts/validate.md`](core/prompts/validate.md)             |
| `.claude/agents/vocalls-translator.md` (337)        | [`core/prompts/translate.md`](core/prompts/translate.md)           |

### 11.3 Tier B migrations — code-projected, no markdown reference

These references existed in `workflow-main-v2` as `.md` files. In this
repo they are **gone** from the reference set; the loader builds them
at dispatch time from live state + code constants.

| Retired markdown reference (lines)              | Replaced by Tier B projection                                      | Source(s) of truth                                                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `do-not-translate.md` (26)                      | `dnt` projection in translate user-turn                            | `intake.variables[].to`, intake's action set, intake's disposition set, `core/schema/slotMap.js#SYSTEM_ACTIONS`, `core/schema/shared.js#UNTRANSLATED_RE` |
| `brief-markers.md` (87)                         | `parsedMarkers` + `parserWarnings` projection in intake user-turn  | `core/briefParser.js` (deterministic Node regex)                                                                                                         |
| `grounding-line.md` (14, auto-gen)              | `groundingLine` projection in scenarioDesign + translate user-turn | `core/grounding-line.js#GROUNDING_LINES`                                                                                                                 |
| section-header table from `language-headers.md` | `sectionHeaders` projection in configBuild + translate user-turn   | `core/languageHeaders.js` (new — see §11.5)                                                                                                              |

The remaining content from `language-headers.md` (voice register table

- pitfalls) lives at `core/prompts/references/register.md` (Tier A).

### 11.4 Tier A retained references

These survive as `.md` because they are pure principles. Minor edits
applied to remove dead cross-references to retired skills and fix
discovered drift artifacts.

| Source                                                | New home                                               | Edits applied                                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `references/ivr-objective-dsl-ruleset.md` (449)       | `core/prompts/references/ivr-objective-dsl-ruleset.md` | TOC fixed (Part 5 was missing); Part 0 (transcribe-vs-author) merged into Part 5                                      |
| `references/tts-writing-rules.md` (168)               | `core/prompts/references/tts-writing-rules.md`         | `[[language-headers]]` → `[[register]]`                                                                               |
| `references/data-flow-contracts.md` (142)             | `core/prompts/references/data-flow-contracts.md`       | Invariant #10 dropped (validator implementation coupling, not data flow); `[[brief-markers]]` → `core/briefParser.js` |
| `references/prompt-layer-map.md` (69)                 | `core/prompts/references/prompt-layer-map.md`          | `[[language-headers]]` → `[[register]]`; `[[brief-markers]]` → `core/briefParser.js`                                  |
| `references/validation-checks.md` (173)               | `core/prompts/references/validation-checks.md`         | `[[language-headers]]` → `[[register]]`; `owner` field added per check                                                |
| `references/language-headers.md` (32) → `register.md` | `core/prompts/references/register.md`                  | Section-header table removed (now Tier B in `core/languageHeaders.js`); voice register + pitfalls retained            |

### 11.5 New code modules to add

| File                                                              | Owns                                                                                                                                                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`core/briefParser.js`](core/briefParser.js)                      | Deterministic marker regex (custom-action, speech-placement, action_message text) + YAML frontmatter parse. Runs before intake dispatch. JSDoc carries the grammar (the only place it exists).                        |
| [`core/languageHeaders.js`](core/languageHeaders.js)              | `{ NL, FR, DE, EN }` × `{ Guardrails, Persona, CompanyInfo, LanguageRule }` constants. Imported by config-builder projection, translate projection, **and the `vocalls-brief` skill** (one source for all consumers). |
| [`core/prompts/loader.js`](core/prompts/loader.js)                | Frontmatter parse + reference concatenation; returns `{ systemPrompt, model, effort }`.                                                                                                                               |
| [`core/prompts/projections/intake.js`](core/prompts/projections/) | Builds `{ systemActions, systemActionSynonyms, parsedMarkers, parserWarnings }`.                                                                                                                                      |
| `core/prompts/projections/scenarioDesign.js`                      | Builds `{ groundingLine, sectionHeaders }`.                                                                                                                                                                           |
| `core/prompts/projections/configBuild.js`                         | Builds `{ sectionHeaders, untranslatedPlaceholder }`.                                                                                                                                                                 |
| `core/prompts/projections/validate.js`                            | Trivial — passes through `priorFindings`, `autofixApplied`.                                                                                                                                                           |
| `core/prompts/projections/translate.js`                           | Builds `{ dnt, sectionHeaders, register, groundingLine, worklist, slotMapPrimaryProjection }`.                                                                                                                        |

### 11.6 Pending Tier C migrations (planned, not yet executed)

Two references are currently Tier A but should become Tier C
(auto-generated from code). They are kept as hand-edited markdown
_for now_ to ship the initial pipeline, with the migration plan below.

#### 11.6.1 `prompt-layer-map.md` — Layer table → Tier C

**Current state:** the 13-row layer table is hand-edited in
`core/prompts/references/prompt-layer-map.md`. The validator's
`core/projections.js#projectPromptFacing` references these layers by
index; an edit to one without the other causes silent drift.

**Target state:**

1. Declare the layer set in `core/promptLayers.js`:
   ```js
   const LAYERS = Object.freeze([
     {
       index: 1,
       name: "Language instruction + grounding line",
       source: "runtime",
       notes: "Runtime-injected; not in CONFIG",
     },
     {
       index: 2,
       name: "General Instructions",
       source: "persona[lang].generalInstructionsExtra",
     },
     // ...
   ]);
   ```
2. `core/validatorRunner.js` and `core/projections.js` import from
   `LAYERS` instead of hardcoding indices.
3. `scripts/gen-docs.js` regenerates the layer table at the top of
   `core/prompts/references/prompt-layer-map.md` from `LAYERS`,
   preserving the surrounding hand-edited prose (notes, Pattern A/B
   discussion).
4. Add `<!-- AUTOGENERATED-START: layer-table -->` /
   `<!-- AUTOGENERATED-END: layer-table -->` markers around the
   generated block; `gen-docs.js` only rewrites between markers.
5. `npm run schema:check` extends to detect hand-edits inside the
   markers.

**When to execute:** after the pipeline is operational and the first
real edit to layer order or naming is requested. Don't migrate
prophylactically.

#### 11.6.2 `validation-checks.md` — CheckId catalog → Tier C

**Current state:** the per-check catalog is hand-edited markdown. The
`CheckIdEnum` in `core/schema/validation.js` is the runtime authority;
the markdown describes severity / autofixable / owner / detail. Drift
already happened in `workflow-main-v2` (the original had `pqr_register`
and `pqr_tts_register` listed as "Documented but not yet emitted"
TODOs even though they were in `CheckIdEnum`).

**Target state:**

1. Co-locate each check's metadata with its implementation.
   `core/checks/<checkId>.js` exports:
   ```js
   module.exports = {
     check: 'check_19_dsl_bounds',
     mode: 3,
     severity: 'error',
     autofixable: false,
     defaultOwner: 'scenarioDesign',
     description: '...',                    // markdown body
     run(slotMap, intake, assembled) { ... } // for deterministic checks
   };
   ```
2. `core/schema/validation.js#CheckIdEnum` is generated from
   `Object.keys(checks)` at module load — `CheckIdEnum` is no longer a
   hand-maintained literal list.
3. `core/validatorRunner.js` discovers Mode 1/2/4 checks by importing
   the registry; the runner stops listing them inline.
4. `scripts/gen-docs.js` renders
   `core/prompts/references/validation-checks.md` from the registry —
   mode-to-check matrix, per-check sections, finding shape. The file
   becomes `do not hand-edit`.

**When to execute:** when adding the next new check (whichever check
that is — the migration is one commit's worth of work, and pays for
itself the moment a check needs metadata in two places).

## 12. Skills (the only ones in this repo)

| Skill             | Role                                                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vocalls-brief`   | brief.md generation from Visio / PDF / Lucidchart source files. **Must import `core/languageHeaders.js` for any section-header strings it writes** — drift between Stage 0 and Stage 1+ is silent and corrosive. |
| `vocalls-autofix` | Deterministic slot-map autofix rules (Node module, loaded by `core/validatorRunner.js` via `require`)                                                                                                            |
| `vocalls-monitor` | Pipeline anomaly monitor; reads `state.json` + `run.log.jsonl`                                                                                                                                                   |

The retired `vocalls-build` skill and 5 `vocalls-<stage>` agent files
are **not** in this repo.

## 13. Prompt fidelity guard — **read before editing any prompt or reference**

**The stage prompts and Tier A references define the IVR config that
ships to production. Do not skip them, summarize them, defer them, or
treat them as "documentation." They are the program the LLM executes.**

Rules every contributor follows when touching anything under
[`core/prompts/`](core/prompts/):

1. **Domain rules are non-negotiable.** Every "do not paraphrase the
   brief," "every branch terminates in GOTO/USE/end_conversation,"
   "verbatim grounding line per language" rule earns its place by
   preventing a specific runtime failure. Removing one to make a
   prompt shorter creates an outage. If a rule looks redundant to you,
   it's not — find the validator check that enforces it and read why.

2. **No drift between tiers.** If you find the same fact in both a
   Tier A markdown file and a code constant, that's a bug. Pick the
   tier per §6 and delete the duplicate:
   - Live data / per-project values → Tier B (code projection).
   - Catalogs derived from code (CheckIdEnum, layer indices) → Tier C
     (auto-generated, in-marker).
   - Pure principles humans deliberate over → Tier A (hand-edited
     markdown).

3. **References are loaded verbatim by `core/prompts/loader.js`.** A
   Tier A reference is **part of the system prompt** of every stage
   that lists it under `references:`. Edits to a reference change the
   behavior of every stage that loads it. Treat reference edits with
   the same scrutiny as stage prompt edits.
   - A per-file SHA manifest at `core/prompts/.manifest.json` is the
     drift detector. `npm run prompts:hash` regenerates it after an
     intentional edit; `npm run prompts:check` fails CI when the
     working tree diverges. A silent reference edit invalidates the
     prompt cache (cache key = rendered system bytes); the manifest
     turns "the cache silently went cold" into a CI failure that names
     the file.

4. **Drift-prone phrases to avoid in any prompt or reference:**
   - "the current list of …" / "the latest …" — date-anchored
     language rots.
   - "always", "never" without justification — Opus 4.7 follows
     literally; an unjustified absolute will overtrigger.
   - "CRITICAL:", "YOU MUST" (caps) — Opus 4.7's bar for these is
     higher than 4.6's; use plain instruction unless you need the
     model to refuse a competing instruction.
   - Cross-references to retired files (`SKILL.md`, `sub-agent-contract.md`,
     `stage-hash-check.md`, `brief-markers.md`, `do-not-translate.md`,
     `language-headers.md`).
   - Code-projected facts (`SYSTEM_ACTIONS`, grounding-line strings,
     section headers) hardcoded inline — they belong in Tier B.

5. **Adding a new stage prompt or reference:**
   - Decide the tier (A / B / C) before writing a single line.
   - For Tier A: write the file, add frontmatter `references:` entry
     in every stage that needs it; verify the loader concatenates it.
   - For Tier B: add the projection function in
     `core/prompts/projections/<stage>.js`; document the shape in the
     stage prompt's "Kickoff" section.
   - For Tier C: add the code source-of-truth, add the gen-docs
     section with `<!-- AUTOGENERATED-START -->` markers, add the
     `schema:check` assertion.

6. **Reviewer checklist for any PR touching `core/prompts/`:**
   - [ ] No same-fact-in-two-tiers duplication.
   - [ ] All `[[reference-name]]` links resolve to a real file under
         `core/prompts/references/`.
   - [ ] No references to retired files (see list in #4 above).
   - [ ] If a Tier C file was edited inside its `<!-- AUTOGENERATED -->`
         markers, the corresponding code constant was edited too.
   - [ ] If you added a forbidden phrase / hard rule / quality
         criterion, you can name the validator check or runtime
         behavior that would otherwise fail without it.
   - [ ] `npm run prompts:hash` re-run and the updated
         `core/prompts/.manifest.json` committed.

## 14. Validator integration

[`core/validatorRunner.js`](core/validatorRunner.js) runs the
deterministic modes (1 schema, 2 autofix, 4 assembly hygiene) in Node
**before** the validate stage's LLM is dispatched. The LLM only judges
the two LLM-judgment modes (3 DSL conformance, 5 brief fidelity) and
adds findings.

Findings carry `{ check, severity, location, detail, suggestion?,
autofixable, owner }`. The `owner` field is **required** (added to
`ValidationFindingSchema` in plan 003 U4) — it tells the FSM which
producer stage to route a repair to. Routing is mechanical: clear
that stage's input hash, increment `repairRound`, dispatch.

## 15. Logging & telemetry

`.vocalls/run.log.jsonl` — append-only, one event per line:

- Per-request: `{ ts, stage, model, usage, cache, durationMs }`.
- Per-transition: `{ ts, from, to, token, repairRound }`.
- Per-gate: `{ ts, gate, choice, auto }`.

Written via an SDK middleware hook (~30 lines), not per-event
plumbing. Read by `.claude/skills/vocalls-monitor` to surface
anomalies.

## 16. Testing strategy

| Layer                                      | What it covers                                               |
| ------------------------------------------ | ------------------------------------------------------------ |
| `tests/core/orchestratorFsm.test.js`       | Exhaustive `STATUS × stage × repairRound`                    |
| `tests/core/stageTools.test.js`            | Zod ↔ JSON-schema round-trip; per-stage toolset shape        |
| `tests/core/subagentRunner.test.js`        | Stub-mode dispatch; schema-violation retry; rate-limit retry |
| `tests/core/briefParser.test.js`           | Marker regex coverage; mojibake + BOM edge cases             |
| `tests/core/prompts/loader.test.js`        | Frontmatter + reference concat; cache-friendly determinism   |
| `tests/core/prompts/projections/*.test.js` | Each projection is a pure `(state) → block` function         |
| `tests/core/gates/*.test.js`               | Gate question / apply purity                                 |
| `tests/integration/*.test.js`              | End-to-end over `.vocalls/state.json` (stub mode)            |
| `tests/bin/vocalls.test.js`                | CLI flag parsing; `--auto` no-prompt flow                    |

All integration tests run under `VOCALLS_SDK_STUB=1` — no network, no
non-determinism. CI gate: `npm test && npm run schema:check && npm run prompts:check`.

## 17. Error handling

| Source                                | Handler                                                   |
| ------------------------------------- | --------------------------------------------------------- |
| `Anthropic.RateLimitError` (429)      | SDK `maxRetries: 3` exponential backoff; not a repair     |
| `Anthropic.OverloadedError` (529)     | Same                                                      |
| `Anthropic.APIError` (5xx)            | Same                                                      |
| `Anthropic.BadRequestError` (400)     | Fatal — surface to user (schema / SDK bug)                |
| Zod validation on tool input          | Return `tool_result` with `is_error: true`; in-loop retry |
| `report_status` missing on `end_turn` | Hard error — fail the dispatch                            |
| `stop_reason: 'refusal'`              | Map to `STAGE_ESCALATED`                                  |
| Repair `CAP` exhausted                | `STAGE_ESCALATED`                                         |

## 18. Project layout

```
bin/                 # CLI entry
cli/                 # project-management commands (init, switch, …)
core/                # FSM, runner, schemas, prompts, tools
core/schema/         # Zod 4 — authoritative
core/prompts/        # per-stage system prompts + references + projections + loader
core/prompts/references/  # Tier A markdown (DSL ruleset, TTS rules, data-flow-contracts, register, prompt-layer-map, validation-checks)
core/prompts/projections/ # Tier B code projections (one file per stage)
core/gates/          # user-gate functions
scripts/             # assemble, run-validator, gen-docs, gen-jsonschema
schemas/             # generated JSON Schema (do not hand-edit)
docs/schema/         # generated markdown (do not hand-edit)
docs/plans/          # active and completed implementation plans
docs/solutions/      # append-only learnings (via /ce-compound)
projects/<name>/     # one IVR project per folder
.claude/skills/      # vocalls-brief, vocalls-autofix, vocalls-monitor
tests/               # mirrors source tree
```

## 19. References

- [`docs/plans/2026-05-18-003-orchestrator-workflow-architecture-plan.md`](docs/plans/2026-05-18-003-orchestrator-workflow-architecture-plan.md) — implementation units U1–U10
- [`CLAUDE.md`](CLAUDE.md) — engineering rules and CLI commands
- `claude-api` skill: workflow tier, manual tool-use loop, prompt
  caching, model migration, Opus 4.7 specifics
