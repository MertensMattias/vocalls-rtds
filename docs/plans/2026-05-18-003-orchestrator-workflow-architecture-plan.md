---
title: "refactor: orchestrator-as-workflow — implementation plan"
type: refactor
status: draft
date: 2026-05-18
origin: "in-session architectural reframe 2026-05-18; design captured in docs/DESIGN.md"
---

# refactor: orchestrator-as-workflow — implementation plan

## Summary

Implementation plan for the workflow-tier architecture defined in
[docs/DESIGN.md](../DESIGN.md). The architecture itself — Tier model,
prompt loader, projections, FSM contract, prompt-fidelity guard — is
authoritative there. This plan is **only** the unit-by-unit sequence
that takes the repo from its current state (stubs + populated prompts +
real schemas) to a working `node bin/vocalls.js build --project <name>`
pipeline.

> **Read [docs/DESIGN.md](../DESIGN.md) first.** This plan does not
> repeat architectural rationale. Where this plan and DESIGN.md
> conflict, DESIGN.md wins; raise a PR to fix the plan.

---

## Status snapshot (verified 2026-05-18)

**Real and populated** (do not rebuild):

- [docs/DESIGN.md](../DESIGN.md) — 665 lines, authoritative architecture
- All 5 stage prompts under [core/prompts/](../../core/prompts/) (229–360
  lines each, frontmatter with `references:` lists)
- All 6 Tier A references in
  [core/prompts/references/](../../core/prompts/references/)
- [core/prompts/.manifest.json](../../core/prompts/.manifest.json) +
  `prompts:hash` / `prompts:check` scripts in
  [package.json](../../package.json)
- [core/grounding-line.js](../../core/grounding-line.js)
- [core/schema/](../../core/schema/) — `agentConfig`, `brief`, `index`,
  `intake`, `pipelineState`, `scenarioDesign`, `shared`, `slotMap`,
  `status`, `validation` all real
- `core/schema/shared.js` — `UNTRANSLATED_RE`, `SYSTEM_ACTION_SYNONYMS`
- `core/schema/slotMap.js` — `SYSTEM_ACTIONS`
- `tests/integration/` — 9 tests including hash-check, repair,
  translator, orchestrator-smoke
- `@anthropic-ai/sdk ^0.81.0` in `dependencies`; no
  `@anthropic-ai/claude-agent-sdk`
- `.claude/agents/` empty (correctly retired); `.claude/skills/` has
  only `vocalls-{autofix, brief, monitor}`

**Stub** (`__stub__: true`, to be implemented):

- [core/orchestratorFsm.js](../../core/orchestratorFsm.js)
- [core/subagentRunner.js](../../core/subagentRunner.js)
- [core/stageTools.js](../../core/stageTools.js)
- [core/orchestrator-constants.js](../../core/orchestrator-constants.js)
- [core/sdk-client.js](../../core/sdk-client.js)
- [core/promptUserGate.js](../../core/promptUserGate.js)
- [bin/vocalls.js](../../bin/vocalls.js)

**Missing entirely** (DESIGN.md describes them; they do not yet exist):

- `core/briefParser.js` (DESIGN §11.3, §11.5; load-bearing for intake)
- `core/languageHeaders.js` (DESIGN §11.3, §11.5)
- `core/prompts/loader.js` (DESIGN §7; required by `subagentRunner`)
- `core/prompts/projections/` directory + 5 per-stage projection files
  (DESIGN §6 Tier B, §11.5)
- `core/gates/{designApproval,qualityGate,translateGate}.js`
- `tests/core/`, `tests/bin/` directories

**Known drift to fix in this plan:**

- `ValidationFindingSchema` lacks the required `owner` field (DESIGN
  §14). → U1.
- `CheckIdEnum` has a 13th entry (`canonical_rules_unknown_hook`) not
  listed in DESIGN.md §11.6.2 or §14. → U10 reconciles (either
  document or remove).
- DESIGN §11.5 renders markdown links to `core/briefParser.js` and
  `core/languageHeaders.js` as if they exist; they don't. → U10
  annotates `(planned)` next to those entries until U4 lands.

---

## Scope

**In scope** — the work to make the pipeline operational against
DESIGN.md's surface:

- Implement 7 stub modules above
- Add 4 missing module groups: `briefParser`, `languageHeaders`,
  `prompts/loader`, `prompts/projections/*`
- Add 4 missing files in `core/gates/` + `core/promptUserGate.js`
- Add `owner` field to `ValidationFindingSchema`
- Rewrite [bin/vocalls.js](../../bin/vocalls.js) as the Node-orchestrated
  workflow driver
- Add the missing unit-test suites (`tests/core/*`, `tests/bin/*`)
  required by DESIGN §16
- One content-audit pass over the 5 stage prompts + 6 Tier A
  references against DESIGN §13 fidelity-guard rules

**Out of scope** — unchanged by this plan:

- DESIGN.md itself (only two honesty edits in U10; no substantive
  rewrites)
- All `core/schema/*.js` except `validation.js`
- [core/grounding-line.js](../../core/grounding-line.js),
  [core/canonicalHash.js](../../core/canonicalHash.js),
  [core/state-io.js](../../core/state-io.js),
  [core/validatorRunner.js](../../core/validatorRunner.js),
  [core/assembler.js](../../core/assembler.js),
  [core/assemble-from-state.js](../../core/assemble-from-state.js)
- The `vocalls-autofix`, `vocalls-brief`, `vocalls-monitor` skills
- Pending Tier C migrations described in DESIGN §11.6 (the
  `prompt-layer-map` and `validation-checks` Tier C moves are
  explicitly deferred there; respect that)
- `state.json` archival / growth strategy (deferred, low priority)
- `core/state-io.js` busy-wait (DESIGN §17 acknowledges; deferred)

---

## Implementation Units

Each unit is one atomic commit. U1–U6 are foundation modules with no
runtime dependency on the runner; U7 is the cutover; U8–U10 close the
gap and verify.

### U1. `ValidationFindingSchema.owner` + constants foundation

**Goal:** Schema and constants both ready before any consumer compiles.

**Files:**

- `core/schema/validation.js` — add required `owner` field
  (`z.enum(['intake', 'scenarioDesign', 'configBuild', 'translate'])`),
  re-export
- `core/orchestrator-constants.js` — replace stub with: `REPAIR_CAP=3`,
  `STAGES`, `STAGE_CONFIG` (per-stage model/effort/maxTokens/timeoutMs
  per DESIGN §9), `RETRY_MAX_ATTEMPTS=3`, `RUN_LOG_PATH`
- `tests/core/orchestrator-constants.test.js` (new) — invariants
- `tests/core/schema/validation.test.js` (new) — `owner` required;
  enum membership

**Dependencies:** none.

**Acceptance:** schema:check passes; the new `owner` field is required
in every emitted finding from this commit forward.

### U2. `core/stageTools.js` — typed tool surface

**Goal:** Zod schemas + `toolsetFor(stage)` returning the JSON-Schema
array the Anthropic SDK expects.

**Files:**

- `core/stageTools.js` — replace stub:
  - `ReportStatusSchema` (discriminated union over `token`)
  - `ReportFindingsSchema` (uses U1's `ValidationFindingSchema`)
  - `WriteStateSliceSchema` (per-stage; routes to `IntakeSchema`,
    `ScenarioDesignSchema`, `SlotMapSchema`, etc.)
  - `toolsetFor(stage)` → `[{name, description, input_schema}, …]`
- `tests/core/stageTools.test.js` (new) — Zod ↔ JSON-Schema round-trip
  determinism; per-stage toolset has correct membership

**Dependencies:** U1.

**Acceptance:** `toolsetFor('validate')` includes all three tools;
`toolsetFor('translate')` excludes `report_findings`; JSON-Schema
output is byte-stable across runs (sorted keys).

### U3. `core/orchestratorFsm.js` — pure state machine

**Goal:** Every transition expressible as a pure function of
`(state, result, opts)`, exhaustively tested.

**Files:**

- `core/orchestratorFsm.js` — replace stub. Exports:
  - `applyResult(state, result, opts)` → newState
  - `needsUserGate(state)` → `null | {gateName, reason}`
  - `applyGate(state, gateName, gateResult)` → newState
  - `shouldNoop(state, opts)` → boolean (consults
    `_meta.inputHashes[stage]` via [core/canonicalHash.js](../../core/canonicalHash.js))
- `tests/core/orchestratorFsm.test.js` (new) — exhaustive
  `STATUS × stage × repairRound` cross-product (~100 cases);
  hash-clear-on-repair atomicity; `repairHistory.resolved` flip on
  COMPLETE-after-repair; CAP exhaustion → escalate

**Dependencies:** U1, U2 (for `ReportStatusSchema.token` literal set).

**Acceptance:** the existing integration-test substrate
(`tests/integration/hash-check-*.test.js`, `repair-clears-hash.test.js`,
`translator-hash-*.test.js`) passes when routed through this FSM —
without modification.

### U4. `core/briefParser.js` + `core/languageHeaders.js`

**Goal:** The two missing Tier B sources of truth.

**Files:**

- `core/briefParser.js` (new) — deterministic Node regex parser:
  - YAML frontmatter
  - Custom-action markers
  - Speech-placement markers
  - `action_message` text blocks
  - Returns `{ frontmatter, speechPlacements, actionMessages,
    customActionMarkers, parserWarnings }`
  - JSDoc carries the marker grammar (single source of truth)
- `core/languageHeaders.js` (new) — `{ NL, FR, DE, EN } × { Guardrails,
  Persona, CompanyInfo, LanguageRule }` constants. Imported by
  `core/prompts/projections/configBuild.js` and `translate.js` (U6),
  **and** by `.claude/skills/vocalls-brief` (verify the brief skill
  starts importing from here in U10).
- `tests/core/briefParser.test.js` (new) — marker regex coverage;
  malformed-marker → warning; BOM + mojibake edge cases
- `tests/core/languageHeaders.test.js` (new) — exhaustive 4×4 matrix

**Dependencies:** U1 (parser warnings flow into intake's findings
schema downstream).

**Risk note:** the marker grammar is implicit in the prior
`workflow-main-v2` references (the retired `brief-markers.md`). U4
must surface it explicitly in the parser's JSDoc — the grammar dies
nowhere else.

### U5. `core/prompts/loader.js`

**Goal:** Frontmatter + reference concatenation; the cached-system-prompt
builder. Without this, U7's runner cannot dispatch.

**Files:**

- `core/prompts/loader.js` (new) — exports
  `loadStage(stage) → { systemPrompt, model, effort, tools }`. Reads
  `core/prompts/<stage>.md`, parses YAML frontmatter, concatenates
  `references[*].md` verbatim with the separator described in DESIGN
  §7. Validates each reference exists; throws if a `[[ref]]` link
  resolves to a missing file.
- `tests/core/prompts/loader.test.js` (new) — `loadStage('intake')`
  produces a byte-stable system prompt across N invocations
  (cache-safety); reordering `references:` changes prefix bytes (a
  reminder, not a test failure); missing-reference throws.

**Dependencies:** none beyond U1.

**Acceptance:** `loadStage(stage)` output is byte-equal between two
back-to-back calls (no `Date.now()`, no env-derived strings).

### U6. `core/prompts/projections/*` — 5 per-stage projections

**Goal:** Tier B's user-turn payload builders. The runner injects these
**after** the cached system prompt so caching stays intact.

**Files:**

- `core/prompts/projections/intake.js` (new) — builds
  `{ systemActions, systemActionSynonyms, parsedMarkers,
  parserWarnings, briefPath, briefSha256 }`. Sources: `core/schema/
  slotMap.js#SYSTEM_ACTIONS`, `core/schema/shared.js#SYSTEM_ACTION_SYNONYMS`,
  `core/briefParser.js` (U4), `core/canonicalHash.js`.
- `core/prompts/projections/scenarioDesign.js` (new) —
  `{ groundingLine, sectionHeaders }`. Sources:
  `core/grounding-line.js#GROUNDING_LINES`, `core/languageHeaders.js`.
- `core/prompts/projections/configBuild.js` (new) —
  `{ sectionHeaders, untranslatedPlaceholder }`. Sources:
  `core/languageHeaders.js`, `core/schema/shared.js#UNTRANSLATED_RE`.
- `core/prompts/projections/validate.js` (new) — trivial passthrough
  of `{ priorFindings, autofixApplied }`.
- `core/prompts/projections/translate.js` (new) —
  `{ dnt, sectionHeaders, register, groundingLine, worklist,
  slotMapPrimaryProjection }`.
- `tests/core/prompts/projections/<stage>.test.js` (new, 5 files) —
  each projection is a pure `(state) → block` function; same input →
  same output; no `Date.now()`/`Math.random()`.

**Dependencies:** U4 (briefParser, languageHeaders), U1.

### U7. `core/sdk-client.js` + `core/subagentRunner.js`

**Goal:** The runtime. Manual tool-use loop per
`shared/tool-use-concepts.md` §Manual Agentic Loop. Stub mode preserved
for tests.

**Files:**

- `core/sdk-client.js` — replace stub:
  `getClient() → new Anthropic({maxRetries: 3, …})`; when
  `VOCALLS_SDK_STUB=1`, returns a fixture-driven stub
- `core/subagentRunner.js` — replace stub. Exports `dispatch(stage,
  state)` → validated `{token, owner?, routeTo?, slice?, findings?}`.
  Manual tool-use loop:
  - Load system prompt via `loader.loadStage(stage)` (U5)
  - Build user-turn via `projections[stage](state)` (U6)
  - `client.messages.create({system, messages, tools, ...,
    cache_control: {type: 'ephemeral'}})`
  - On `tool_use`: Zod-validate input → execute → return tool_result
    (`is_error: true` on schema violation, allowing in-loop retry)
  - On `stop_reason: 'end_turn'`: require `report_status` was observed
  - On `Anthropic.{RateLimitError, OverloadedError, APIError}`: retry
    via SDK native (does not consume `repairRound`)
  - On `stop_reason: 'refusal'`: map to `STAGE_ESCALATED`
- `tests/core/sdk-client.test.js` (new) — stub-mode wiring
- `tests/core/subagentRunner.test.js` (new) — stub-mode dispatch;
  schema-violation in-loop retry; transient-error retry success

**Dependencies:** U1, U2, U5, U6.

### U8. `core/gates/*` + `core/promptUserGate.js`

**Goal:** User-gate flow in Node — pure formatter + pure applier per
gate, plus a `readline` CLI driver respecting `--auto`.

**Files:**

- `core/gates/designApproval.js` (new) — `{ formatQuestion, applyChoice }`
- `core/gates/qualityGate.js` (new) — same shape
- `core/gates/translateGate.js` (new) — same shape
- `core/promptUserGate.js` — replace stub. `readline`-based prompt;
  on `--auto`, picks `defaultChoice` and logs `{auto: true}` to
  `.vocalls/run.log.jsonl`
- `tests/core/gates/{designApproval,qualityGate,translateGate}.test.js`
  (new) — purity tests; default-choice correctness in `--auto`

**Dependencies:** U1 (constants); U3 (`applyGate` consumer).

### U9. `bin/vocalls.js` rewrite — the cutover

**Goal:** The actual entry point. Node-orchestrated workflow loop.
Highest-blast-radius commit in this plan; reversible via `git revert`.

**Files:**

- `bin/vocalls.js` — replace stub with `main()` + `orchestrate(state,
  options)`. Loop sketched in DESIGN §3:
  ```
  while (state._meta.stage !== 'done' && !escalated):
      gate = orchestratorFsm.needsUserGate(state)
      if (gate) { state = await applyGate(...); continue }
      if (orchestratorFsm.shouldNoop(state, {force})) {
          state = onNoop(state); continue
      }
      result = await subagentRunner.dispatch(stage, state)
      state = orchestratorFsm.applyResult(state, result, {force})
  ```
- `tests/bin/vocalls.test.js` (new) — CLI flag parsing; `--auto`
  no-prompt flow; stub-mode end-to-end smoke on `direct-debit`

**Dependencies:** U3, U7, U8.

**Acceptance:** the existing 9 integration tests in
`tests/integration/` pass without modification. `VOCALLS_SDK_STUB=1
node bin/vocalls.js build --project direct-debit --auto` exits 0 and
produces a `state.json` byte-comparable to the known-good fixture
(record the baseline in `tests/integration/__fixtures__/` if not
present).

### U10. Content audit + DESIGN.md honesty edits + e2e rehearsal

**Goal:** Close the "treat everything as stub until analyzed" loop.
This is the gate that catches DESIGN.md drift and prompt regressions
before the architecture is declared done.

**Steps (one commit per group, in order):**

1. **Audit the 5 stage prompts** in [core/prompts/](../../core/prompts/)
   against DESIGN §13 reviewer checklist:
   - No drift-prone phrases (`the current list of …`, `CRITICAL:`,
     `YOU MUST` in caps without justification)
   - No `[[ref]]` links that don't resolve under
     `core/prompts/references/`
   - No references to retired files (`SKILL.md`,
     `sub-agent-contract.md`, `brief-markers.md`,
     `do-not-translate.md`, `language-headers.md`)
   - Every domain rule traceable to a validator check or runtime
     behavior
   - Frontmatter `model` / `effort` matches
     `STAGE_CONFIG` (U1)
   - File hash in [core/prompts/.manifest.json](../../core/prompts/.manifest.json)
     matches `npm run prompts:hash`
2. **Audit the 6 Tier A references** in
   [core/prompts/references/](../../core/prompts/references/) against
   the same checklist. Confirm edits described in DESIGN §11.4
   (TOC fix in `ivr-objective-dsl-ruleset.md`, invariant #10 dropped
   from `data-flow-contracts.md`, `[[language-headers]] → [[register]]`
   in `tts-writing-rules.md` + `prompt-layer-map.md` +
   `validation-checks.md`, `owner` field present in
   `validation-checks.md` rows) are actually applied.
3. **DESIGN.md honesty edits** — two minor fixes:
   - §11.5 table: annotate `core/briefParser.js` and
     `core/languageHeaders.js` entries — they are now real (post-U4),
     so confirm links resolve.
   - §11.6.2 or §14: reconcile `CheckIdEnum`'s 13th entry
     (`canonical_rules_unknown_hook`) — either document it as a
     deterministic check or remove it from the enum.
4. **`.claude/skills/vocalls-brief` import check** — confirm it imports
   `core/languageHeaders.js` (U4) for section-header strings. If it
   inlines them, fix the drift now.
5. **Live-SDK rehearsal** — one end-to-end run with no `--auto` and no
   stub against the `direct-debit` project. Compare resulting
   `state.json` and assembled `callScripts/AGENT_*.js` against the
   baseline. Record in `docs/plans/2026-05-18-003-rehearsal.md`.

**Dependencies:** U1–U9 must be landed.

---

## Test strategy

Per DESIGN §16. New unit suites land alongside each unit (listed above).
The existing 9 integration tests under
[tests/integration/](../../tests/integration/) are the regression net —
they assert `state.json` invariants that U3's FSM enforces by
construction, so they should pass after U9 without modification.

CI gate: `npm test && npm run schema:check && npm run prompts:check`.

One **live-SDK rehearsal** is required before DoD #4 below — stub mode
covers structure, not Claude behavior.

---

## Risks and mitigations

**U4's marker grammar is implicit in the retired skill.**
`workflow-main-v2`'s `brief-markers.md` is the only place the parser
grammar lived. Mitigation: U4's JSDoc must spell out every marker
shape; review the prior reference content before writing the parser.

**The 5 stage prompts are populated but unaudited.** They reference
DESIGN-correct frontmatter but their bodies haven't been checked
against the §13 fidelity guard. Mitigation: U10 is the audit pass; do
not skip it. Findings may produce edits to prompt bodies (which would
invalidate `.manifest.json`, so re-run `npm run prompts:hash` at the
end).

**`tests/core/` is empty.** Every U from U1–U8 adds its own test
suite; the absence of a baseline means breakage is silent until a
suite lands. Mitigation: do not merge a U-commit without its test
suite green.

**U9 is the cutover and the riskiest commit.** Mitigation: U1–U8 ship
as additive modules; U9 is the one that wires them into the entry
point. If U9 ships and produces wrong outputs, `git revert` U9
restores the stub `bin/vocalls.js` while U1–U8 stay intact.

**Per-stage prompt caching has lower hit rate than predicted.**
Mitigation: verify via `response.usage.cache_read_input_tokens` in the
U10 rehearsal log. If miss rate is unexpectedly high, audit the loader
output for silent invalidators (timestamps, reordering, drift in
references).

**DESIGN.md edits in U10 cause prompt drift that escapes
`prompts:check`.** DESIGN.md isn't tracked by the prompt manifest.
Mitigation: U10 keeps DESIGN edits scoped to §11.5 / §11.6.2 / §14
honesty fixes — no edits to §13 fidelity guard or §6 Tier model in
this plan.

---

## Definition of Done

1. U1–U10 landed atomically (one commit per unit; U10 may be split
   into 1–5 sub-commits per step)
2. `npm test && npm run schema:check && npm run prompts:check` green
3. `VOCALLS_SDK_STUB=1 node bin/vocalls.js build --project direct-debit
   --auto` exits 0 on a fresh `state.json`
4. One live-SDK rehearsal on `direct-debit` end-to-end succeeds; the
   resulting `callScripts/AGENT_*.js` matches the recorded baseline
   (modulo timestamps and run-id)
5. DESIGN.md §11.5 + §14 reflect the post-U4 / post-U1 reality (no
   broken markdown links; `owner` field documented; `CheckIdEnum` 13th
   entry resolved)
6. `core/prompts/.manifest.json` updated and committed after any prompt
   edit during U10
7. This plan's `status:` flips to `complete` in frontmatter

---

## Operational notes

- **State.json schema unchanged.** Existing project `.vocalls/state.json`
  files remain readable through U1's `owner`-field addition (the field
  is required on new findings but old findings are not retroactively
  validated).
- **Rollback story.** Each U is one commit. U9 is the cutover; revert
  U9 to restore the stub binary while keeping U1–U8 modules.
- **No project-side changes.** `projects/<name>/brief.md`,
  `callScripts/`, `globalLibraries/` are untouched.
- **Deferred items.** Tier C migrations (DESIGN §11.6), `state.json`
  archival, `state-io.js` busy-wait — explicitly out of scope; track
  separately when they become hot.
