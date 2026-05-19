---
title: "refactor: orchestrator-workflow implementation"
type: refactor
status: active
date: 2026-05-18
origin: "docs/DESIGN.md (architectural authority)"
supersedes: "[2026-05-18-003-orchestrator-workflow-architecture-plan.md](2026-05-18-003-orchestrator-workflow-architecture-plan.md)"
---

# refactor: orchestrator-workflow implementation

## Summary

Implementation plan for the workflow-tier architecture defined in
[docs/DESIGN.md](../DESIGN.md). DESIGN.md is the architectural
authority — Tier model, prompt loader, projections, FSM contract,
prompt-fidelity guard — and is not re-decided here. This plan owns the
unit-by-unit sequence that takes the repo from its current state
(seven stubs, four missing module groups, one missing schema field,
`core/sdk-stub.js` referenced by tests but absent on disk) to a working
`node bin/vocalls.js build --project <name>` pipeline, with a
mandatory pre-commit `/ce-code-review` gate on every unit.

> **Read [docs/DESIGN.md](../DESIGN.md) first.** Where this plan and
> DESIGN.md conflict, DESIGN.md wins.

Plan 003 ([2026-05-18-003-orchestrator-workflow-architecture-plan.md](2026-05-18-003-orchestrator-workflow-architecture-plan.md))
is superseded by this plan and is preserved as a historical record of
the in-session audit. Its `status:` flips to `superseded` as part of U11.

---

## Problem Frame

The repo is in a half-built state where DESIGN.md is authoritative but
the runtime modules that implement it are stubs. The five stage prompts
and six Tier A references exist but have not been audited against
DESIGN §13. The 9 existing tests under `tests/integration/` were
written against the prior LLM-orchestrator architecture; **they are
deleted in U1 (slate-clearing) and rewritten from scratch in U12 by a
delegated subagent** working from DESIGN.md and the post-U10
implementation. Implementation is built forward from DESIGN.md, not
backward from old tests.

The work is not exploratory: every decision is grounded in DESIGN.md or
verified in the in-session audit captured in plan 003 §Status snapshot.
The risk surface is a high-blast-radius cutover commit (U10) that has
no integration regression net during the cutover (old tests deleted,
new tests not yet written) and the content-audit pass (U11) that may
force prompt edits.

---

## Scope Boundaries

**In scope:**

- Fill 7 stub modules in `core/`
- Add 4 missing module groups: `briefParser`, `languageHeaders`,
  `prompts/loader`, `prompts/projections/*`
- Create `core/sdk-stub.js` (load-bearing for existing tests)
- Create 3 user-gate modules in `core/gates/` + `core/promptUserGate.js`
- Add required `owner` field to `ValidationFindingSchema` and reconcile
  the extra `canonical_rules_unknown_hook` entry in `CheckIdEnum`
- Rewrite `bin/vocalls.js` to export `main(argv, deps)` with injectable
  `sdk` and `cwd` (matches the existing test contract)
- Add unit test suites under `tests/core/` and `tests/bin/` per
  DESIGN §16
- One content-audit pass over the 5 stage prompts + 6 Tier A
  references against DESIGN §13 fidelity-guard rules
- Two minor DESIGN.md honesty edits in U11 (§11.5 link annotations,
  §14 / §11.6.2 `CheckIdEnum` reconciliation)
- Establish the per-commit `/ce-code-review` Review Protocol (see
  §Review Protocol below)

**Deferred to Follow-Up Work:**

- Tier C migrations described in DESIGN §11.6 (`prompt-layer-map` layer
  table, `validation-checks` registry) — DESIGN explicitly defers
- `state.json` archival / growth strategy
- `core/state-io.js` busy-wait cleanup
- The `subfinder ^1.3.1` dependency surfaced by repo research —
  `subfinder` is a subdomain-reconnaissance CLI tool, almost
  certainly an erroneous dependency in an IVR build pipeline (likely
  supply-chain pollution from a template copy). Verify usage,
  remove if unused. Track as a `PT-####` entry per AGENTS.md §6
- Wiring `/ce-code-review` to an actual git pre-commit hook (this plan
  documents the procedural gate; hook automation is a separate
  enhancement)
- **Delete all 9 existing tests under `tests/integration/` (U1
  slate-clearing) and rewrite the integration test suite from scratch
  via a delegated subagent in U12**, working from DESIGN.md + the
  post-U10 implementation. Implementation is not bent around the old
  test fixtures.

**Out of scope:**

- DESIGN.md substantive edits (only honesty fixes in U11)
- `core/schema/*.js` except `validation.js`
- `core/canonicalHash.js`, `core/state-io.js`,
  `core/validatorRunner.js`, `core/assembler.js`,
  `core/assemble-from-state.js`, `core/grounding-line.js` —
  unchanged
- The `vocalls-autofix`, `vocalls-brief`, `vocalls-monitor` skills
  (U11 only verifies `vocalls-brief` imports `core/languageHeaders.js`)
- Pipeline FSM shape (no new stages, no reordering)

---

## Requirements

Requirements traced to DESIGN.md sections. Every R-ID maps to at least
one U-unit below.

- **R1.** FSM transitions are pure functions of `(state, result, opts)`,
  exhaustively unit-testable (DESIGN §4)
- **R2.** Single mutation surface per stage: `write_state_slice`,
  schema-validated against the destination Zod shape before persistence
  (DESIGN §8)
- **R3.** Per-stage model + effort selection lives in code; stage
  frontmatter mirrors for documentation but code wins on drift
  (DESIGN §9)
- **R4.** `brief.md` and `AGENT_*.js` are structurally unreachable
  from any stage's toolset (DESIGN §8)
- **R5.** Stub mode (`VOCALLS_SDK_STUB=1`) drives the entire pipeline
  without a network call (DESIGN §2)
- **R6.** Single source of truth per fact — Tier model (A/B/C) is the
  drift discipline (DESIGN §6, §13)
- **R7.** Prompt cache hit rate ~100% across a stage's lifetime; no
  silent invalidators (DESIGN §7)
- **R8.** `ValidationFindingSchema` carries a required `owner` field
  (DESIGN §14)
- **R9.** `report_status` is the required final tool call of every
  subagent dispatch (DESIGN §8)
- **R10.** User gates run in Node; the LLM is not involved in gate
  flow (DESIGN §10)
- **R11.** Transient errors handled by SDK-native typed exceptions; no
  hand-rolled retry classifier (DESIGN §17)
- **R12.** No drift between tiers; no orphan `[[reference]]` links
  (DESIGN §13)
- **R13.** Every U-unit commit is reviewed by `/ce-code-review` before
  `git commit` lands; critical / error / warning findings block the
  commit. (New — captured in §Review Protocol below.)
- **R14.** The integration test suite is rewritten from scratch in U12
  by a delegated subagent, working against DESIGN.md + the U1–U10
  implementation. The new suite must cover: every FSM transition path,
  per-language translator fan-out, stub-mode end-to-end pipeline,
  user-gate flows, repair-loop semantics, and hash-clear coordination.
  No back-compat with the deleted `tests/integration/*` is required or
  desired.

---

## Key Technical Decisions

**1. Plan supersedes plan 003 rather than amending it.** Plan 003 was
rewritten in-session and remains the audit-of-record. This plan inherits
its findings and adds the Review Protocol + the `sdk-stub` and
`bin/vocalls main()` shape requirements surfaced by repo research.

**2. `core/sdk-stub.js` contract is defined forward from DESIGN.md.**
The stub's surface is whatever the runner (`core/subagentRunner.js`,
U8) needs to dispatch deterministically without a network call —
nothing is reverse-engineered from the deleted integration tests.
Minimum surface: `dispatch(stage, state) → { token, slice?, findings? }`,
`STUB_DISPATCH_LOG`, `resetDispatchLog()`. The U12 subagent will write
tests that consume this surface; if the surface needs to grow (e.g.
per-language translator stubs, env-var failure injection for repair
testing), it grows as a forward design decision, not a fixture match.

**3. `bin/vocalls.js` exports `main(argv, deps)`.** The injectable
`deps` is the contract for U12's new integration tests:
`main(['build','--project','x'], { cwd, sdk: sdkStub })` lets the
subagent test the full pipeline without spawning a subprocess. Auto-run
guard: `if (require.main === module) { main(process.argv.slice(2)).catch(…); }`

**4. Argv parsing is hand-rolled** to match `cli/init.js` and
`cli/validate.js` conventions — no `commander` / `yargs` dependency.
Pattern: `if (args[i] === '--foo') opts.foo = args[++i];`

**5. Module conventions mirrored from existing code:**
- `'use strict';` line 1
- File-header JSDoc block describing purpose + public API
- `module.exports = { name1, name2 }` (no default exports, no ESM)
- 4-space indent, single quotes
- Error throwing: `throw new Error('<module>.<fn>: <msg>')`
- `Object.freeze` for constants

**6. Schema changes regenerate generated docs.** Every commit touching
`core/schema/*.js` runs `npm run schema:docs` and
`npm run schema:jsonschema` (or `schema:check` to verify), and stages
the updated `docs/schema/*.md` and `schemas/*.schema.json` in the same
commit. Drift is caught by `npm run schema:check` in U1's review.

**7. Prompt changes regenerate the manifest.** Every commit touching
`core/prompts/*.md` (stage prompts or references) runs
`npm run prompts:hash` and stages the updated
`core/prompts/.manifest.json` in the same commit. Drift is caught by
`npm run prompts:check` in U11's review.

**8. Discovered work routes through AGENTS.md §6.** Any out-of-scope
finding surfaced by `/ce-code-review` during this plan's execution is
recorded as a `PT-####` entry in `docs/parallel-todos.md` (or
`docs/workflow-fix-changelog.md` for untracked one-line fixes) with
user approval. The reviewing agent does not add features mid-unit.

**9. Translator per-language fan-out lives in the runner, not the FSM
(F4 fix).** `core/schema/pipelineState.js` defines
`_meta.inputHashes.translator` as a `LangRecord({NL, FR, DE, EN})` —
per-language hashes, not a single hash. The per-language loop is
implemented entirely inside `subagentRunner.dispatch('translate', state)`:
the FSM's `shouldNoop` and `applyResult` see translate as a single
stage (no per-stage special cases in the FSM body itself); the
translator-aware logic lives in `shouldNoop`'s hash-comparison helper
(it consults a per-language hash record for translate, a scalar hash
elsewhere) and in the runner's dispatch loop.

- The runner iterates `state._meta.languages` (excluding primary). For
  each non-primary language whose `inputHashes.translator[lang]`
  doesn't match the canonical hash of the language's input slice, it
  dispatches Claude once with that language as the focus.
- Each per-language dispatch validates the slice (one language's
  translation block) and calls `write_state_slice` to add
  `state.translation.<lang>` and update
  `state._meta.inputHashes.translator[lang]` atomically.
- After all in-scope languages complete, the runner emits a **single
  aggregated `report_status`** for the whole translate stage:
  `STAGE_COMPLETE` if every language succeeded, `STAGE_FAILED` with
  `routeTo: 'translate'` if any language failed terminally (after
  in-loop retries).
- On `STAGE_FAILED` repair, the FSM increments `repairRound` and clears
  any *failed* language's hash (successful languages retain their
  hashes); the next dispatch's `shouldNoop`-like internal gate skips
  already-complete languages.

`shouldNoop('translate', state)` returns true only if ALL non-primary
language hashes match. The FSM treats translate identically to other
stages; the per-language complexity is encapsulated in U8.

---

## Review Protocol

Every U-unit lands as one atomic commit. Before `git commit`, the
implementer runs `/ce-code-review` against the staged diff. The
protocol is **pre-commit, blocking on critical / error / warning
findings, advisory on suggestion / info findings**.

### Per-unit gating sequence

```
1. Stage the unit's diff:          git add <files>
2. Run review against staged:      /ce-code-review (scope: staged diff)
3. Classify findings:
     - critical | error | warning  → BLOCK. Fix and re-stage, GOTO 2.
     - suggestion | info           → ADVISORY. Author judgment; may
                                     defer to a PT-#### entry per
                                     AGENTS.md §6.
4. Confirm clean review:           review report shows no
                                   critical/error/warning findings
5. Commit:                         git commit -m "..."
6. Verify in-tree integrity:       npm test && npm run schema:check
                                   && npm run prompts:check (per unit)
7. Next unit may begin.
```

### What `/ce-code-review` evaluates (per its skill contract)

- **Correctness:** logic errors, off-by-one, state-machine invariant
  violations, schema mismatches
- **Security:** input validation, injection vectors, secret handling
  (low surface for this refactor but checked)
- **Convention:** matches repo patterns surfaced in §Key Technical
  Decisions §5
- **Test coverage:** every feature-bearing unit's test scenarios from
  the unit's `Test scenarios` field are present and meaningful
- **DESIGN.md alignment:** the diff does not contradict DESIGN.md's
  Tier model, FSM contract, or fidelity guard

### What `/ce-code-review` does NOT do

- It does not run tests. The implementer runs `npm test` separately as
  part of step 6 above.
- It does not regenerate manifests or schema docs. Those are part of
  the commit per decisions §6 and §7.
- It does not modify files. It produces a report; the implementer
  applies fixes and re-runs.

### Escape hatches

- **Severity disagreement.** If the implementer believes a `warning`
  finding is a false positive, they record the rationale as a comment
  in the commit message or as a `PT-####` entry and proceed. The
  reviewer's classification is not overridden silently.
- **Cross-unit findings.** If review surfaces a problem that belongs
  in a future unit, file a `PT-####` and continue. If it belongs in a
  past unit, stop and address before continuing — do not stack
  technical debt across units.

---

## Output Structure

Greenfield additions under `core/` and `tests/`. The per-unit
`**Files:**` sections are authoritative — this tree is a scope
declaration.

```text
core/
├── sdk-stub.js                          # U1 (new)
├── orchestrator-constants.js            # U1 (replace stub)
├── stageTools.js                        # U2 (replace stub)
├── sdk-client.js                        # U3 (replace stub)
├── orchestratorFsm.js                   # U4 (replace stub)
├── briefParser.js                       # U5 (new)
├── languageHeaders.js                   # U5 (new)
├── subagentRunner.js                    # U8 (replace stub)
├── promptUserGate.js                    # U9 (replace stub)
├── gates/
│   ├── designApproval.js                # U9 (new)
│   ├── qualityGate.js                   # U9 (new)
│   └── translateGate.js                 # U9 (new)
├── prompts/
│   ├── loader.js                        # U6 (new)
│   └── projections/
│       ├── intake.js                    # U7 (new)
│       ├── scenarioDesign.js            # U7 (new)
│       ├── configBuild.js               # U7 (new)
│       ├── validate.js                  # U7 (new)
│       └── translate.js                 # U7 (new)
└── schema/
    └── validation.js                    # U1 (modify — add owner)

bin/
└── vocalls.js                           # U10 (rewrite — export main)

tests/
├── core/                                # (new — currently empty)
│   ├── orchestrator-constants.test.js   # U1
│   ├── stageTools.test.js               # U2
│   ├── sdk-client.test.js               # U3
│   ├── sdk-stub.test.js                 # U1
│   ├── orchestratorFsm.test.js          # U4
│   ├── briefParser.test.js              # U5
│   ├── languageHeaders.test.js          # U5
│   ├── subagentRunner.test.js           # U8
│   ├── schema/
│   │   └── validation.test.js           # U1
│   ├── promptUserGate.test.js           # U9
│   ├── gates/
│   │   ├── designApproval.test.js       # U9
│   │   ├── qualityGate.test.js          # U9
│   │   └── translateGate.test.js        # U9
│   └── prompts/
│       ├── loader.test.js               # U6
│       └── projections/
│           ├── intake.test.js           # U7
│           ├── scenarioDesign.test.js   # U7
│           ├── configBuild.test.js      # U7
│           ├── validate.test.js         # U7
│           └── translate.test.js        # U7
└── bin/                                 # (new)
    └── vocalls.test.js                  # U10
```

The 9 existing tests under `tests/integration/` are **deleted in U1**.
A new integration test suite is written from scratch in U12 by a
delegated subagent, against DESIGN.md and the post-U10 implementation.

---

## Phased Delivery

12 units across 6 phases. Each unit is one atomic commit gated by
`/ce-code-review` per the Review Protocol.

| Phase | Units | Description |
|-------|-------|-------------|
| **A. Foundation** | U1, U2, U3 | Schema field, constants, tool surface, SDK stub + client. U1 also **deletes the 9 old `tests/integration/*` files** (slate-clearing). After Phase A, `npm test` is green on the per-unit suites; no integration regression net exists until U12. |
| **B. Pure logic** | U4, U5 | FSM + Tier B sources of truth (briefParser, languageHeaders). No runtime dependency on Phase C/D. |
| **C. Prompt assembly** | U6, U7 | Loader + 5 projections. After Phase C, the runner has everything it needs to dispatch. |
| **D. Runtime + gates** | U8, U9 | subagentRunner (with per-language translator fan-out per F4) + 3 gate modules + promptUserGate. After Phase D, the runner can complete a single stage dispatch end-to-end in stub-mode unit tests. |
| **E. Cutover + audit** | U10, U11 | Rewrite `bin/vocalls.js` (the cutover, gated by stub-mode smoke only — no integration tests during cutover); content audit + DESIGN edits + live rehearsal. |
| **F. Test suite rewrite** | U12 | Delegated subagent writes the new integration test suite from DESIGN.md + the post-U10 implementation. Final regression gate before DoD. |

A new phase begins only after every prior unit has a clean review and
green test run.

---

## Implementation Units

### U1. Schema fix + constants + SDK stub

**Goal:** Unblock the test suite (`core/sdk-stub.js` currently
referenced but absent) and land the schema field + constants every
later unit depends on.

**Requirements advanced:** R3, R8.

**Dependencies:** none.

**Files:**

- `core/schema/validation.js` (modify) — add required `owner` field
  to `ValidationFindingSchema` (Zod enum:
  `intake | scenarioDesign | configBuild`). `translate` is the final
  stage and is never a repair target, so it is not in the owner enum.
  Decide on
  `canonical_rules_unknown_hook` — either document in DESIGN §14 (U11)
  or remove from `CheckIdEnum`. This plan defers the decision to U11
  audit; for U1, leave the enum entry in place and add an inline
  `// TODO U11: reconcile or remove` comment
- `core/sdk-stub.js` (new) — `{ dispatch(stage, state),
  STUB_DISPATCH_LOG, resetDispatchLog() }`. Fixture-driven; reads
  pre-canned tool-call sequences indexed by stage from a JSON map
  shipped at `tests/__fixtures__/sdk-stub-fixtures.json`
- `core/orchestrator-constants.js` (replace stub) — exports
  `REPAIR_CAP=3`, `STAGES`, `STAGE_CONFIG` (per-stage model / effort /
  maxTokens / timeoutMs per DESIGN §9), `RETRY_MAX_ATTEMPTS=3`,
  `RUN_LOG_PATH='.vocalls/run.log.jsonl'`.
  **Required `STAGE_CONFIG` values (per claude-api skill guidance for
  Opus 4.7):**
  - `intake`:         `{ model: 'claude-sonnet-4-6', effort: 'high',   maxTokens: 32000 }`
  - `scenarioDesign`: `{ model: 'claude-opus-4-7',   effort: 'xhigh',  maxTokens: 64000, thinking: { type: 'adaptive', display: 'summarized' } }`
  - `configBuild`:    `{ model: 'claude-opus-4-7',   effort: 'high',   maxTokens: 64000, thinking: { type: 'adaptive', display: 'summarized' } }`
  - `validate`:       `{ model: 'claude-sonnet-4-6', effort: 'medium', maxTokens: 32000 }`
  - `translate`:      `{ model: 'claude-haiku-4-5',  effort: 'low',    maxTokens: 16000 }`
  Rationale: 64K is the claude-api skill's recommended starting point
  for `xhigh`/`max` effort ("start at 64K and tune from there") and a
  sensible normal ceiling for `high` agentic stages too. 32K covers
  intake parsing + validate findings without crowding. 16K is enough
  for per-language translate output. All stages stay well under model
  ceilings (Opus 4.7: 128K; Sonnet 4.6: 64K; Haiku 4.5: 64K). **All
  stages exceed 16K so streaming is required** — see U7 step 5
  (`messages.stream()` + `.finalMessage()`; bare `messages.create()`
  at >16K hits SDK HTTP timeouts).
  `display: 'summarized'` on Opus 4.7 is required to capture thinking
  content in `run.log.jsonl` — the 4.7 default is `omitted`, which
  streams empty thinking blocks silently
- `tests/core/schema/validation.test.js` (new)
- `tests/core/sdk-stub.test.js` (new)
- `tests/core/orchestrator-constants.test.js` (new)
- `tests/__fixtures__/sdk-stub-fixtures.json` (new) — minimal canned
  sequences for each stage's happy path
- `docs/schema/*.md` and `schemas/*.schema.json` (regenerated; staged
  in the same commit)
- `tests/integration/*` (**delete all 9 files**) — these were written
  against the prior LLM-orchestrator architecture and would constrain
  the new implementation. The replacement suite is U12's deliverable.

**Approach:**

Add `owner` as a required Zod enum on `ValidationFindingSchema`.
Re-export. Constants module exposes everything as `Object.freeze(…)`.
SDK stub is a fixture-driven dispatch table — pass a stage name + state
slice, look up the canned tool sequence, return as if the LLM had
issued those calls. The runner (U8) uses this same surface in stub
mode, so the stub's contract has to match the real client's.

**Patterns to follow:** `core/grounding-line.js` for frozen-constant
shape; `core/state-io.js` for module-prefixed errors and JSDoc header.

**Test scenarios:**

- `validation.test.js`:
  - Finding without `owner` field → Zod throws
  - Finding with `owner: 'intake'` → parses
  - Finding with `owner: 'unknown'` → Zod throws
  - Finding with `owner: 'translate'` → Zod throws (translate is the
    final stage, not a repair target)
  - All three allowed values accepted
- `sdk-stub.test.js`:
  - `dispatch('intake', state)` returns the canned sequence from the
    fixture; `STUB_DISPATCH_LOG` records the call
  - `resetDispatchLog()` empties the log
  - `dispatch('intake', state)` is deterministic across two calls
  - Missing fixture for a stage → throws with module-prefixed message
- `orchestrator-constants.test.js`:
  - `REPAIR_CAP === 3`
  - `STAGE_CONFIG.intake.model === 'claude-sonnet-4-6'`
  - `STAGE_CONFIG.scenarioDesign.effort === 'xhigh'`
  - `STAGE_CONFIG.translate.model === 'claude-haiku-4-5'`
  - `STAGES` is an immutable array of 5 strings in pipeline order
  - All exports are `Object.freeze`'d

**Verification:**

- `npm run schema:check` passes (no drift between code and generated
  docs)
- `npm test` runs to completion (previously could not because of
  missing `sdk-stub.js`)
- `/ce-code-review` returns no critical/error/warning findings on the
  staged diff

---

### U2. `core/stageTools.js` — typed tool surface

**Goal:** Zod schemas + `toolsetFor(stage)` returning the JSON-Schema
array the Anthropic SDK expects, with byte-stable output for caching.

**Requirements advanced:** R2, R9.

**Dependencies:** U1 (uses `ValidationFindingSchema` with `owner`).

**Files:**

- `core/stageTools.js` (replace stub) — exports
  `ReportStatusSchema` (discriminated union over `token`),
  `ReportFindingsSchema` (array of U1's `ValidationFindingSchema`),
  `WriteStateSliceSchema` (per-stage union routing to the right
  slice schema), `toolsetFor(stage)` returning
  `[{name, description, input_schema}, …]`
- `tests/core/stageTools.test.js` (new)

**Approach:**

`ReportStatusSchema` is the structural replacement for the prior
STATUS-line contract. Five discriminated-union members:
`STAGE_COMPLETE`, `STAGE_FAILED` (with optional `routeTo`),
`STAGE_NOOP`, `STAGE_PAUSED` (with `gateName`), `STAGE_ESCALATED`.
`toolsetFor` returns a deterministic array (sorted by `name`,
`input_schema` keys sorted) so prompt cache stays valid across runs.

**Patterns to follow:** `core/schema/intake.js` for Zod composition
and discriminated-union usage; `core/schema/shared.js` for primitive
imports.

**Test scenarios:**

- `ReportStatusSchema.parse({token: 'STAGE_COMPLETE', reason: 'ok'})`
  succeeds
- `ReportStatusSchema.parse({token: 'STAGE_FAILED', reason: 'x'})`
  succeeds; `routeTo` optional
- `ReportStatusSchema.parse({token: 'STAGE_FAILED', reason: 'x',
  routeTo: 'unknown'})` throws
- `ReportStatusSchema.parse({token: 'STAGE_PAUSED', reason: 'x'})`
  throws (missing `gateName`)
- `toolsetFor('intake')` returns exactly 2 tools (`write_state_slice`,
  `report_status`) — validate stage has no `report_findings`
- `toolsetFor('validate')` returns 3 tools including `report_findings`
- `toolsetFor('translate')` excludes `report_findings`
- `toolsetFor('intake')` output is byte-equal across two calls
  (JSON.stringify with sorted keys) — cache-stability check
- `WriteStateSliceSchema` for `intake` validates an `IntakeSchema`
  payload and rejects a `ScenarioDesignSchema` payload

**Verification:**

- `npm test` green
- `/ce-code-review` clean

---

### U3. `core/sdk-client.js` — Anthropic SDK wrapper

**Goal:** Thin wrapper that returns the real Anthropic client in
production and the stub from U1 in `VOCALLS_SDK_STUB=1` mode.

**Requirements advanced:** R5, R11.

**Dependencies:** U1 (sdk-stub).

**Files:**

- `core/sdk-client.js` (replace stub) — exports
  `getClient(opts?) → { messages: { create(…) }, dispatch?(…) }`.
  Production path: `new Anthropic({ maxRetries: 3 })`. Stub path:
  returns the `core/sdk-stub.js` surface
- `tests/core/sdk-client.test.js` (new)

**Approach:**

`getClient` reads `process.env.VOCALLS_SDK_STUB` once at call time.
The two return shapes both expose `messages.create(…)` for the runner
to call uniformly; the stub's `create` reads the fixture and returns
a synthesized response. SDK-native `maxRetries` covers 408/409/429/5xx
via typed exceptions: `Anthropic.RateLimitError` (429),
`Anthropic.OverloadedError` (529), and `Anthropic.APIError` (catch-all
parent). Catch from most specific to least specific. The typed
exception classes are documented in the claude-api skill's
`shared/error-codes.md` for both Python and TypeScript SDKs.

**Patterns to follow:** `core/state-io.js` for module-header JSDoc.

**Test scenarios:**

- `VOCALLS_SDK_STUB=1` → `getClient()` returns the stub surface;
  identity-checked against `core/sdk-stub`
- `VOCALLS_SDK_STUB` unset → returns an instance with
  `messages.create` callable (don't actually call it in unit tests —
  smoke only)
- Env flag changes between calls → `getClient()` honors the latest
  value (no caching at module-load time)

**Verification:**

- `npm test` green
- `/ce-code-review` clean

---

### U4. `core/orchestratorFsm.js` — pure state machine

**Goal:** Every transition expressed as a pure function. Exhaustively
unit-testable.

**Requirements advanced:** R1.

**Dependencies:** U1 (constants for `REPAIR_CAP`, `STAGES`), U2
(`ReportStatusSchema.token` literals drive the FSM's input enum).

**Files:**

- `core/orchestratorFsm.js` (replace stub) — exports
  `applyResult(state, result, opts) → newState`,
  `needsUserGate(state) → null | {gateName, reason}`,
  `applyGate(state, gateName, gateResult) → newState`,
  `shouldNoop(state, opts) → boolean`,
  `onNoop(state) → newState`
- `tests/core/orchestratorFsm.test.js` (new)

**Approach:**

Pure functions. `applyResult` switches on `result.token`:
- `STAGE_COMPLETE` → advance cursor, reset `repairRound`, flip
  `repairHistory[*].resolved` for the resolved stage
- `STAGE_FAILED` → if `repairRound < REPAIR_CAP` and `routeTo` is set,
  increment `repairRound`, clear the owner stage's hash atomically,
  rewind cursor to `routeTo`; else escalate
- `STAGE_NOOP` → return state unchanged
- `STAGE_PAUSED` → set `_meta.status = 'paused'` with `gateName`
- `STAGE_ESCALATED` → terminal

`shouldNoop` consults `core/canonicalHash.js` against
`state._meta.inputHashes[stage]` and the current input slice; returns
`!force && hash matches`.

**Translator-stage special handling (per Key Technical Decision §9 /
F4):** for `stage === 'translate'`, `shouldNoop` returns true only if
*every* non-primary language in `state._meta.languages` has a matching
hash in `inputHashes.translator[lang]`. If any single language has a
mismatched hash, `shouldNoop` returns false and the dispatch proceeds
(the runner internally skips already-complete languages). The FSM
otherwise treats `translate` identically to other stages — no FSM
shape change.

**Patterns to follow:** existing FSM-style modules use bare functions
+ frozen const tables; `core/canonicalHash.js` for hash comparison.

**Technical design — directional, not implementation:**

```
applyResult(state, result, opts) =>
  switch (result.token):
    STAGE_COMPLETE: advance; resolved=true on prior repair entries
    STAGE_FAILED:
      if repairRound >= REPAIR_CAP: return escalated(state)
      if routeTo: clear inputHashes[routeTo]; rewind cursor
      else: clear inputHashes[currentStage]; rewind to currentStage
      increment repairRound; append repairHistory entry
    STAGE_NOOP: return state
    STAGE_PAUSED: set _meta.status='paused', _meta.gateName=…
    STAGE_ESCALATED: set _meta.status='escalated'; terminal
```

**Test scenarios:**

- Exhaustive `STATUS × stage × repairRound` cross-product
  (5 tokens × 5 stages × 4 repair values = 100 cases). For each:
  assert `_meta.stage`, `_meta.status`, `_meta.repairRound`,
  `_meta.inputHashes`, `_meta.repairHistory` are the expected post-state
- `applyResult(state, {token: 'STAGE_COMPLETE', ...})` on a state with
  `repairRound > 0` flips the latest unresolved `repairHistory` entry
  to `resolved: true`
- `applyResult(state, {token: 'STAGE_FAILED', routeTo: 'intake'})`
  when `state._meta.stage = 'configBuild'` and `repairRound = 0` →
  cursor rewinds to `intake`, `inputHashes.intake` cleared,
  `repairRound = 1`, new `repairHistory` entry appended with
  `owner: 'intake'`
- `applyResult(state, {token: 'STAGE_FAILED', routeTo: 'intake'})`
  when `repairRound = REPAIR_CAP - 1` → `repairRound = REPAIR_CAP`,
  hash cleared, transition succeeds
- `applyResult(state, {token: 'STAGE_FAILED', ...})` when
  `repairRound >= REPAIR_CAP` → escalated
- `needsUserGate(state)` returns `{gateName: 'designApproval'}` when
  `_meta.stage = 'scenarioDesign'` and `_meta.status = 'paused'` with
  `gateName`
- `applyGate(state, 'designApproval', {choice: 'accept'})` advances to
  next stage; `{choice: 'revise'}` rewinds and clears
- `shouldNoop(state, {force: false})` returns true when
  `inputHashes[stage]` matches current input hash
- `shouldNoop(state, {force: true})` returns false even when hashes
  match
- `onNoop(state)` returns state with the same `_meta.stage` and
  identical `inputHashes`; does not mutate the input state object
  (identity-like transition, no side effects)
- `shouldNoop({_meta: {stage: 'translate', languages: ['NL','FR'],
  inputHashes: {translator: {NL: 'abc', FR: 'def'}}}, ...})` returns
  true only when both `NL` and `FR` hashes match canonical input hash
- `shouldNoop` for translate returns false when even one non-primary
  language's hash is missing or mismatched
- `applyResult(state, {token: 'STAGE_FAILED', routeTo: 'translate'})`
  preserves *successful* language hashes in
  `inputHashes.translator[*]` (clears nothing — the runner already
  cleared the failed language's hash before reporting failure)

**Verification:**

- Per-unit `tests/core/orchestratorFsm.test.js` covers all 100+ FSM
  transition scenarios above
- `/ce-code-review` clean

---

### U5. `core/briefParser.js` + `core/languageHeaders.js`

**Goal:** Two missing Tier B sources of truth. The briefParser carries
the marker grammar in JSDoc (single source of truth).

**Requirements advanced:** R6.

**Dependencies:** none.

**Files:**

- `core/briefParser.js` (new) — exports
  `parseBrief(briefText) → { frontmatter, speechPlacements,
  actionMessages, customActionMarkers, parserWarnings }`. JSDoc
  describes the marker grammar (frontmatter YAML, custom-action
  markers, speech-placement markers, `action_message` blocks)
- `core/languageHeaders.js` (new) — `Object.freeze({ NL: {...}, FR:
  {...}, DE: {...}, EN: {...} })` with `{ Guardrails, Persona,
  CompanyInfo, LanguageRule }` per language
- `tests/core/briefParser.test.js` (new)
- `tests/core/languageHeaders.test.js` (new)

**Approach:**

briefParser is regex-based, deterministic, no LLM. Recover gracefully:
malformed markers go to `parserWarnings` (which intake's projection
surfaces as `outstandingQuestions`), not thrown errors. languageHeaders
is a static 4×4 frozen constant. Both are pure modules.

**Risk:** the marker grammar lives only here. Surface it explicitly in
JSDoc — list every marker shape with an example. If a marker is
missing from the JSDoc, future maintainers cannot reconstruct it.

**Patterns to follow:** `core/grounding-line.js` for the frozen-table
pattern (`Object.freeze({ NL: '…', FR: '…', … })`).

**Test scenarios:**

- `parseBrief` on a well-formed brief returns the expected shapes for
  all five output fields
- Frontmatter parses YAML correctly; missing frontmatter → empty object
  + warning
- Speech-placement marker `<<action:disposition>>` parses; malformed
  variant `<<action:>>` produces a warning, not a throw
- Action message block `<<action_message:foo>>...<</action_message>>`
  parses content verbatim
- Unpaired markers produce a warning
- Custom-action markers (`<<custom_action:foo>>`) are collected into
  `customActionMarkers`
- BOM-prefixed input parses
- Mojibake (UTF-8 mis-decoded to Latin-1) produces a recoverable
  warning, not a crash
- `languageHeaders.NL.Guardrails` is a non-empty string
- `languageHeaders` is deep-frozen (mutation attempt is a no-op or
  throws in strict mode)
- All four languages have all four section headers (4×4 matrix is
  complete)

**Verification:**

- `npm test` green
- `/ce-code-review` clean

---

### U6. `core/prompts/loader.js`

**Goal:** The cached-system-prompt builder. Frontmatter parse +
reference concatenation. Without this, the runner cannot dispatch.

**Requirements advanced:** R7, R12.

**Dependencies:** none beyond existing `core/prompts/*.md` files.

**Files:**

- `core/prompts/loader.js` (new) — exports
  `loadStage(stage) → { systemPrompt, model, effort, references }`.
  Reads `core/prompts/<stage>.md`, parses YAML frontmatter (use the
  same parser as briefParser if YAML lib not present — or a minimal
  inline parser; do not add a YAML dependency), concatenates
  `references[*].md` verbatim per DESIGN §7 layout
- `tests/core/prompts/loader.test.js` (new)

**Approach:**

The loader returns a byte-stable system prompt for a given stage. Any
non-determinism (timestamps, env-derived strings, dict iteration order
sensitivity) silently breaks prompt caching, so the test suite asserts
byte-equality across two consecutive calls.

Missing reference → throws with module-prefixed error. Missing stage
file → throws.

**Patterns to follow:** `core/state-io.js` for file-read error
handling.

**Naming note:** `core/loader.js` already exists as an unrelated
project-loader module (`loadEnvConfig`, `loadProjectConfig`). This new
`core/prompts/loader.js` lives at a different subpath; do not modify
`core/loader.js` during U6.

**Test scenarios:**

- `loadStage('intake')` returns `{ systemPrompt, model, effort,
  references }` with `model === 'claude-sonnet-4-6'` and
  `effort === 'high'`
- `loadStage('intake').systemPrompt` is byte-equal to a second call's
  output (cache-stability)
- Stage prompt body is concatenated first; references follow in
  frontmatter-declared order
- `loadStage` for an unknown stage → throws
- Missing reference file (e.g. delete `register.md` temporarily) →
  throws
- The system-prompt output contains the literal body of each declared
  reference (substring assertion)

**Verification:**

- `npm test` green
- `/ce-code-review` clean

---

### U7. `core/prompts/projections/*` — 5 per-stage projections

**Goal:** Tier B user-turn payload builders. Pure
`(state) → projectedBlock` functions.

**Requirements advanced:** R6.

**Dependencies:** U1 (constants), U5 (briefParser, languageHeaders).

**Files:**

- `core/prompts/projections/intake.js` (new) — builds
  `{ systemActions, systemActionSynonyms, parsedMarkers,
  parserWarnings, briefPath, briefSha256 }`
- `core/prompts/projections/scenarioDesign.js` (new) —
  `{ groundingLine, sectionHeaders }`
- `core/prompts/projections/configBuild.js` (new) —
  `{ sectionHeaders, untranslatedPlaceholder }`
- `core/prompts/projections/validate.js` (new) — passthrough of
  `{ priorFindings, autofixApplied }`
- `core/prompts/projections/translate.js` (new) —
  `{ dnt, sectionHeaders, register, groundingLine, worklist,
  slotMapPrimaryProjection }`
- `tests/core/prompts/projections/*.test.js` (new — 5 files)

**Approach:**

Each projection is a pure function. Same `(state, code constants)`
input → byte-equal output. No `Date.now()`, no `Math.random()`, no
file I/O inside the projection (intake's `briefSha256` is read once
upstream and passed in via state). Each projection lives in its own
file to keep diffs small and reviews focused.

**Patterns to follow:** `core/grounding-line.js` export style; pure
function module pattern from `core/canonicalHash.js`.

**Test scenarios (per file, scoped to that stage):**

- `intake.test.js`:
  - Output contains all six expected keys
  - `systemActions` matches
    `core/schema/slotMap.js#SYSTEM_ACTIONS` membership
  - `parsedMarkers` shape matches what U5's `parseBrief` returns
  - `parserWarnings` is an array (possibly empty)
  - Pure: two calls with same input → byte-equal output
- `scenarioDesign.test.js`:
  - `groundingLine` matches the language from
    `core/grounding-line.js`
  - `sectionHeaders` matches U5's `languageHeaders` for the project's
    languages
- `configBuild.test.js`:
  - `sectionHeaders` populated for every language in
    `state._meta.languages`
  - `untranslatedPlaceholder` is a function returning
    `[XX_UNTRANSLATED]` strings
- `validate.test.js`:
  - Passthrough of `priorFindings` and `autofixApplied`
  - Empty when no prior findings
- `translate.test.js`:
  - `dnt` contains intake's variables, action set, disposition set,
    `SYSTEM_ACTIONS`, and `UNTRANSLATED_RE`
  - `worklist` is non-empty when slotMap is populated
  - All projections pure: byte-equal output across calls

**Verification:**

- `npm test` green
- `/ce-code-review` clean

---

### U8. `core/subagentRunner.js` — manual tool-use loop

**Goal:** The runtime. Manual tool-use loop per `claude-api` skill's
manual-agentic-loop pattern. Stub mode preserved end-to-end.

**Requirements advanced:** R2, R4, R5, R9, R11.

**Dependencies:** U1, U2, U3, U6, U7.

**Files:**

- `core/subagentRunner.js` (replace stub) — exports
  `dispatch(stage, state, deps?)` → validated
  `{ token, owner?, routeTo?, slice?, findings? }`
- `tests/core/subagentRunner.test.js` (new)

**Approach:**

For each dispatch:

1. `loadStage(stage)` (U6) → `{ systemPrompt, model, effort }`
2. `projections[stage](state)` (U7) → projection block
3. `toolsetFor(stage)` (U2) → tools array
4. Build messages: `[{ role: 'user', content: <projection + kickoff> }]`
5. Call `const stream = client.messages.stream({ model, max_tokens,
   system: systemPrompt, messages, tools, thinking:
   STAGE_CONFIG[stage].thinking, cache_control: { type: 'ephemeral' } })`
   then `const message = await stream.finalMessage()`. **Always use
   `messages.stream()` + `.finalMessage()`**, never bare
   `messages.create()` — per the claude-api skill, `max_tokens > 16K`
   without streaming hits SDK HTTP timeouts, and every stage in
   `STAGE_CONFIG` exceeds 16K. Top-level `cache_control` auto-places
   on the last cacheable block (system + tools cached together by
   prefix-match; user-turn projection deliberately uncached). Verify
   cache hits via `message.usage.cache_read_input_tokens` in the run
   log
6. Manual loop:
   - On `tool_use`: Zod-validate input (U2's schemas). If validation
     fails, return `tool_result` with `is_error: true` and the schema
     error message; LLM retries within the same loop
   - On `tool_use` for `report_status`: capture, continue loop until
     `stop_reason: 'end_turn'`
   - On `stop_reason: 'end_turn'` with no `report_status` observed →
     throw `subagentRunner.dispatch: missing report_status`
   - On `stop_reason: 'refusal'` → return synthesized
     `{ token: 'STAGE_ESCALATED', reason: 'refusal' }`
7. SDK-native retry handles `Anthropic.RateLimitError` (429),
   `Anthropic.OverloadedError` (529), and `Anthropic.APIError`
   (catch-all parent for 408/409/4xx/5xx) without consuming
   `repairRound`. Catch from most specific to least specific.
8. `Anthropic.BadRequestError` → fatal, surfaces to caller (likely
   means a schema bug)

Loop has a `max_iterations` safety net (default 10) — exceeding it
throws.

**Patterns to follow:** `core/validatorRunner.js` for orchestration
style with deps injection; `core/sdk-stub.js` (U1) for the dispatch
contract the runner relies on.

**Translator per-language fan-out (per Key Technical Decision §9 /
F4):** when `dispatch(stage, state)` is called with `stage === 'translate'`,
the runner does NOT make a single Claude call. Instead it iterates
`state._meta.languages` excluding the primary:

```
async function dispatchTranslate(state, deps) {
  const targets = languagesNeedingTranslation(state)  // filters by per-lang hash
  const results = []
  for (const lang of targets) {
    try {
      const r = await dispatchPerLanguage('translate', state, lang, deps)
      // r writes state.translation[lang] and updates inputHashes.translator[lang]
      results.push({ lang, ok: true })
    } catch (err) {
      // Clear the FAILED language's hash so next attempt retries it
      clearTranslatorHash(state, lang)
      results.push({ lang, ok: false, err })
      break  // first failure ends the attempt; FSM repairs
    }
  }
  if (results.every(r => r.ok)) {
    return { token: 'STAGE_COMPLETE', reason: '...' }
  } else {
    return { token: 'STAGE_FAILED', reason: '...', routeTo: 'translate' }
  }
}
```

Note: `dispatchTranslate` is internal to the runner — the FSM and
caller still see a single `dispatch('translate', state)` returning one
status. Sequential iteration is the default; if latency matters,
`Promise.all` is safe because per-language slices don't overlap (each
writes to `state.translation[lang]` only).

**Design decision — failure handling.** The pseudocode above
short-circuits on the first per-language failure. The alternative is
continue-and-aggregate (attempt all languages; report the aggregate at
the end). Trade-offs:

- **Short-circuit (current):** simpler; failed language clears its
  hash; next repair attempt skips already-complete languages via
  `shouldNoop`. Risk: a transient FR failure prevents NL from being
  attempted this turn even if NL was going to succeed.
- **Continue-and-aggregate:** every language is attempted each turn;
  succeeded ones write their slice + hash; only failed languages
  need retry on the next pass. Risk: a fundamental misconfiguration
  burns N×Claude calls per turn before failing.

This plan ships short-circuit (cheaper failure mode); revisit during
U12 if test coverage exposes a real cost of partial attempts.

**Test scenarios:**

- Stub-mode dispatch for `intake` returns a result matching the
  pre-canned fixture
- Tool-input schema violation (force a malformed `write_state_slice`
  in the stub fixture) → first tool_result has `is_error: true`;
  second iteration succeeds; final result reflects the corrected slice
- Missing `report_status` in the stub sequence → throws with
  module-prefixed error
- `STAGE_ESCALATED` synthesized when stub injects `stop_reason:
  'refusal'`
- `max_iterations` exceeded → throws
- `dispatch('intake', state)` writes to the runner's per-request
  telemetry hook (verify via stub log)
- Per-stage model selection is read from `STAGE_CONFIG`, not from
  prompt frontmatter (frontmatter mirrors for documentation only,
  per Key Technical Decision §3)
- `dispatch('translate', state)` with 3 non-primary languages all
  needing translation → 3 internal Claude calls; aggregated single
  `STAGE_COMPLETE` returned
- `dispatch('translate', state)` where one of 3 languages has a
  matching `inputHashes.translator[lang]` → 2 internal Claude calls
  (skip the matching one); aggregated `STAGE_COMPLETE`
- `dispatch('translate', state)` where 1 of 3 languages fails
  terminally → returns `STAGE_FAILED` with `routeTo: 'translate'`; the
  failed language's hash is cleared in state before return
- `dispatch('translate', state)` with all languages already complete
  (all hashes match) → 0 internal Claude calls; returns
  `STAGE_NOOP`

**Verification:**

- `tests/core/subagentRunner.test.js` covers all dispatch scenarios
  above (stub-mode, no live SDK)
- `/ce-code-review` clean

---

### U9. `core/gates/*` + `core/promptUserGate.js`

**Goal:** User-gate flow in Node — pure formatter + applier per gate,
plus a `readline` CLI driver respecting `--auto`.

**Requirements advanced:** R10.

**Dependencies:** U1 (constants).

**Files:**

- `core/gates/designApproval.js` (new) — exports
  `formatQuestion(state) → { prompt, choices, defaultChoice }` and
  `applyChoice(state, choice) → newState`
- `core/gates/qualityGate.js` (new) — same shape
- `core/gates/translateGate.js` (new) — same shape
- `core/promptUserGate.js` (replace stub) — `readline`-based prompt.
  On `--auto`, picks `defaultChoice` and logs `{ auto: true, gate,
  choice }` to `.vocalls/run.log.jsonl`
- `tests/core/gates/designApproval.test.js` (new)
- `tests/core/gates/qualityGate.test.js` (new)
- `tests/core/gates/translateGate.test.js` (new)
- `tests/core/promptUserGate.test.js` (new) — covers the side-effecting
  driver with an injected `readline` interface and a temp
  `run.log.jsonl` write path

**Approach:**

Each gate is a pair of pure functions. The `formatQuestion` builder
reads from `state` to render the prompt + choices. The `applyChoice`
function returns a new state with no I/O. `promptUserGate` is the only
side-effecting module — it imports the readline interface and writes
to the run log.

**Patterns to follow:** `core/state-io.js` for atomic file-append
patterns (used by the auto-log writer).

**Test scenarios:**

- `designApproval.formatQuestion(state)` returns `{prompt, choices,
  defaultChoice}` with at least 2 choices including the default
- `designApproval.applyChoice(state, 'accept')` advances to
  `configBuild`
- `designApproval.applyChoice(state, 'revise')` rewinds to
  `scenarioDesign`, clears `inputHashes.scenarioDesign`, increments
  `repairRound`
- Same shape for `qualityGate` and `translateGate`
- Pure: two `formatQuestion` calls with same input → byte-equal output
- Pure: `applyChoice` does not mutate the input state object
- Unknown choice → throws
- `promptUserGate` with `--auto: true` picks `defaultChoice` and
  appends `{auto: true, gate, choice}` to `run.log.jsonl`
- `promptUserGate` with `--auto: false` and an injected readline
  interface returns the user's choice (no real stdin)

**Verification:**

- `npm test` green
- `/ce-code-review` clean

---

### U10. `bin/vocalls.js` rewrite — the cutover

**Goal:** Replace the stub binary with the Node-orchestrated workflow
loop. Highest-blast-radius commit; reversible via `git revert`.

**Requirements advanced:** R1, R5, R10.

**Dependencies:** U1–U9.

**Files:**

- `bin/vocalls.js` (rewrite) — exports
  `main(argv, { cwd?, sdk? } = {})`; auto-runs only when
  `require.main === module`. CLI argv: `build | update | validate |
  translate`, `--project <name>`, `--auto`, `--force`, `--resume`
- `tests/bin/vocalls.test.js` (new)

**Approach:**

```
async function main(argv, deps = {}) {
  const cwd = deps.cwd || process.cwd();
  const opts = parseArgs(argv);
  const sdk = deps.sdk || sdkClient.getClient();
  let state = await stateIo.read(cwd, opts.project);
  while (state._meta.stage !== 'done' && !escalated(state)) {
    const gate = fsm.needsUserGate(state);
    if (gate) {
      const choice = await promptUserGate(state, gate, { auto: opts.auto });
      state = await stateIo.update(s => fsm.applyGate(s, gate.gateName, choice));
      continue;
    }
    if (fsm.shouldNoop(state, { force: opts.force })) {
      state = await stateIo.update(s => fsm.onNoop(s));
      continue;
    }
    const result = await runner.dispatch(state._meta.stage, state, { sdk });
    state = await stateIo.update(s => fsm.applyResult(s, result, { force: opts.force }));
  }
  reportFinal(state);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(err => {
    console.error('vocalls.main:', err.message);
    process.exit(1);
  });
}
```

The `deps` injection is the contract that U12's new integration tests
will rely on. Do not pin `getClient` at module top — read it inside
`main` so tests can inject a stub.

**Patterns to follow:** `cli/init.js` and `cli/validate.js` argv
parsing.

**Test scenarios:**

- `main(['build', '--project', 'direct-debit'], { cwd, sdk: stub })`
  exits cleanly with `state._meta.stage === 'done'` against the stub
- `main(['build', '--project', 'direct-debit', '--auto'])` answers
  gates without prompting
- `--force` causes `shouldNoop` to return false even when hashes match
- Missing `--project` → exits with module-prefixed error
- Unknown command → exits non-zero with usage notice
- Stub-mode end-to-end runs every stage in order
- A repair loop (stub injects `STAGE_FAILED` once, then
  `STAGE_COMPLETE`) completes without escalation when
  `repairRound < REPAIR_CAP`
- A repair loop that hits `REPAIR_CAP` escalates

**Verification:**

- `VOCALLS_SDK_STUB=1 node bin/vocalls.js build --project direct-debit
  --auto` exits 0 on a fresh state (stub-mode smoke is the only
  integration regression net during U10 — old tests are gone, new
  tests come in U12)
- `tests/bin/vocalls.test.js` (this unit's own suite) green
- `/ce-code-review` clean

---

### U11. Content audit + DESIGN edits + live rehearsal

**Goal:** Close the "treat everything as stub until analyzed" loop.
Catches DESIGN.md drift and prompt regressions before the architecture
is declared done. Post-flight of U10 by user direction.

**Requirements advanced:** R6, R7, R12.

**Dependencies:** U1–U10 must be landed.

**Files (modify):**

- `core/prompts/intake.md`, `scenarioDesign.md`, `configBuild.md`,
  `validate.md`, `translate.md` — edits as audit surfaces
- `core/prompts/references/data-flow-contracts.md`,
  `ivr-objective-dsl-ruleset.md`, `prompt-layer-map.md`, `register.md`,
  `tts-writing-rules.md`, `validation-checks.md` — edits as audit
  surfaces
- `core/prompts/.manifest.json` — regenerated via
  `npm run prompts:hash`
- `docs/DESIGN.md` — §11.5 annotations (links resolve post-U5),
  §14 / §11.6.2 reconciliation of `canonical_rules_unknown_hook` (U1's
  TODO)
- `core/schema/validation.js` — remove or document the extra
  `CheckIdEnum` entry per the §14 reconciliation
- `docs/plans/2026-05-18-003-orchestrator-workflow-architecture-plan.md`
  — frontmatter `status: superseded`
- `docs/plans/2026-05-18-004-…-plan.md` (this file) —
  `status: complete`
- `docs/plans/2026-05-18-004-rehearsal-direct-debit.md` (new) —
  recorded live-SDK rehearsal output

**Approach (may split into 2–4 sub-commits as audit findings dictate;
each sub-commit gated by `/ce-code-review` per the Review Protocol):**

1. **Stage-prompt audit** (one commit). Apply DESIGN §13 reviewer
   checklist to each of the 5 stage prompts: no drift-prone phrases
   (`the current list of …`, `CRITICAL:`, `YOU MUST` in caps without
   justification), no orphan `[[ref]]` links, no references to retired
   files (`SKILL.md`, `sub-agent-contract.md`, `brief-markers.md`,
   `do-not-translate.md`, `language-headers.md`), frontmatter `model` /
   `effort` matches `STAGE_CONFIG`. Regenerate manifest.
2. **Reference audit** (one commit). Apply DESIGN §13 to each of the 6
   Tier A references. Confirm edits described in DESIGN §11.4 (TOC fix
   in `ivr-objective-dsl-ruleset.md`, invariant #10 dropped from
   `data-flow-contracts.md`, `[[language-headers]] → [[register]]`
   substitutions, `owner` column present in `validation-checks.md`).
   Regenerate manifest.
3. **DESIGN.md honesty edits + CheckIdEnum reconciliation** (one
   commit). §11.5 table annotation for the now-existing `briefParser.js`
   and `languageHeaders.js` entries. §14 / §11.6.2 reconciliation of
   `canonical_rules_unknown_hook`: either document it as a valid
   deterministic check or remove it from `CheckIdEnum`. Regenerate
   schema docs.
4. **`.claude/skills/vocalls-brief` import check** (one commit if any
   edit needed). Confirm the brief skill imports
   `core/languageHeaders.js` for section-header strings; fix any
   inlined drift.
5. **Live-SDK rehearsal** (one commit). One end-to-end run with no
   `--auto` and no stub against the `direct-debit` project. Compare
   resulting `state.json` and assembled `callScripts/AGENT_*.js`
   against the baseline. Record in
   `docs/plans/2026-05-18-004-rehearsal-direct-debit.md`. Per-stage
   checks against `run.log.jsonl`:
   - **Cache hits.** Verify `response.usage.cache_read_input_tokens > 0`
     on the *second* request to each stage. **Pay special attention to
     `translate`** (uses Haiku 4.5, which requires a ~4096-token
     minimum cacheable prefix per the claude-api skill; the translate
     prompt + 3 references is borderline). If `cache_read_input_tokens`
     is 0 for translate, the system prompt is below the threshold —
     either add a Tier A reference to push it over, or accept the
     no-cache cost and document it.
   - **Token-count re-baseline.** Run `client.messages.countTokens()`
     against `claude-opus-4-7` on the actual `scenarioDesign` and
     `configBuild` system prompts; the same input text counts higher
     on 4.7 than on 4.6 per the claude-api migration guide. If counts
     are within 10% of the configured `maxTokens`, bump
     `STAGE_CONFIG.<stage>.maxTokens` before declaring DoD (Sonnet 4.6
     and Haiku 4.5 cap at 64K; Opus 4.7 caps at 128K — STAGE_CONFIG
     already sits at the relevant ceiling for the Opus 4.7 stages).
   - **Thinking visibility.** Confirm Opus 4.7 thinking blocks in
     `run.log.jsonl` have non-empty `thinking` text — if empty, the
     `display: 'summarized'` field is missing from `STAGE_CONFIG`
     (U1 regression).
6. **Plan 003 status flip** (one commit). Set 003 to `superseded`.
   (This plan's `status: complete` flip moves to U12's final
   sub-commit.)

**Execution note:** Each sub-commit goes through `/ce-code-review`
independently. The rehearsal sub-commit's review focuses on whether
the recorded output is a valid baseline, not on prose changes.

**Test scenarios (per sub-commit):**

- Stage-prompt audit: `npm run prompts:check` green after manifest
  regeneration; no `[[orphan]]` strings remain in any prompt
- Reference audit: `npm run prompts:check` green; substring checks for
  the DESIGN §11.4-prescribed edits pass
- DESIGN edits: `npm run schema:check` green if CheckIdEnum changed
- Rehearsal: `state.json` is structurally identical to baseline; only
  timestamps and run IDs differ; assembled `AGENT_*.js` matches
  baseline byte-equal modulo timestamps

**Verification:**

- `npm test && npm run schema:check && npm run prompts:check` green
- Live rehearsal output recorded
- Definition of Done checks (below) all pass
- `/ce-code-review` clean on every sub-commit

---

### U12. Integration test suite — delegated subagent rewrite

**Goal:** A fresh integration test suite for `tests/integration/`,
written from scratch by a delegated subagent working from DESIGN.md +
the U1–U11 implementation + the U11 live-rehearsal baseline. Final
regression gate before DoD.

**Requirements advanced:** R14. Indirectly: R1–R12 (the suite enforces
them post-hoc).

**Dependencies:** U1–U11 must be landed. The implementation must be
real, the prompts and references audited, and the live rehearsal
recorded (the subagent uses the recorded baseline as a reference
oracle).

**Files (created by the subagent, reviewed by the human):**

- `tests/integration/fsm-transitions.test.js` (new) — exhaustive FSM
  cross-product against the live runtime (not the pure FSM unit, which
  U4 already covers — this is the FSM *as wired into the orchestrator
  loop* in `bin/vocalls.js`)
- `tests/integration/stub-pipeline-e2e.test.js` (new) — full pipeline
  in stub mode for `direct-debit`, asserting state.json *structure*
  evolution (stages advance in order, per-slice schemas validate, hash
  fields populate correctly) and assembled `AGENT_*.js` *structural*
  conformance (every CONFIG layer present, valid Zod shape, no orphan
  references). **Avoid byte-equality assertions** — they codify
  arbitrary runtime artifacts (timestamps, generation order, optional
  field ordering) as required behavior and recreate exactly the
  drift-from-design problem the old test suite had.
- `tests/integration/repair-loops.test.js` (new) — repair-round
  semantics: stub injects `STAGE_FAILED` at each producer stage;
  asserts hash-clear, repair-round increment, repairHistory.resolved
  flip, CAP-exhaustion escalation
- `tests/integration/translator-fanout.test.js` (new) — per-language
  fan-out per F4: 3 non-primary languages, one partially complete, one
  failing; asserts per-language hash management and the aggregated
  `STAGE_*` semantics described in Key Technical Decision §9
- `tests/integration/user-gates.test.js` (new) — designApproval,
  qualityGate, translateGate end-to-end behavior, both interactive
  (mocked readline) and `--auto`
- `tests/integration/__fixtures__/` (new directory) — any fixtures the
  suite needs; subagent decides shape

**Approach — dispatch instructions for the subagent:**

The human implementer dispatches a single subagent (via `Agent` tool /
equivalent) with this brief:

```
You are writing the integration test suite for the vocalls-sdk-workflow
build pipeline from scratch. The OLD test suite was deleted in U1 and
should not be referenced.

Authoritative sources, in order of precedence:
1. docs/DESIGN.md — the architecture. Every assertion you write must
   trace to a section in DESIGN.md. Add `// DESIGN §X.Y: <claim>`
   comments on non-obvious assertions.
2. docs/plans/2026-05-18-004-…-plan.md — implementation plan, esp.
   Key Technical Decision §9 (translator fan-out / F4) and §Review
   Protocol.
3. The implemented code under core/ and bin/. Do NOT bend tests around
   accidental behaviors — if the code does X but DESIGN says Y, file a
   PT-#### entry per AGENTS.md §6 and write the test against Y. Do
   not silently codify bugs.
4. docs/plans/2026-05-18-004-rehearsal-direct-debit.md — the U11 live
   rehearsal output. Use this as a **sanity check** for assertions you
   ground in DESIGN.md (does the live SDK actually produce what
   DESIGN.md says it should?). It is NOT a reference oracle — do not
   write byte-equality assertions against it. If the rehearsal diverges
   from DESIGN.md, that's a bug to file as PT-####, not a quirk to
   codify in tests.

Required coverage:
- Every FSM transition path (STAGE_COMPLETE, STAGE_FAILED w/ and w/o
  routeTo, STAGE_NOOP, STAGE_PAUSED, STAGE_ESCALATED) × every producer
  stage × repairRound boundary conditions
- Per-language translator fan-out: all-complete (NOOP), partial-skip,
  partial-fail-repair, full-success
- Hash-clear coordination on repair (only the failed stage's hash
  clears; downstream untouched)
- repairHistory.resolved flip on COMPLETE-after-repair
- User gates: each gate's default-choice + revise path; --auto flow
- Stub-mode full pipeline e2e on direct-debit matching U11 rehearsal
  baseline
- CLI flag handling: --force, --auto, --resume, --project
- Error paths: missing project, unknown command, missing brief.md

Test framework: Jest (already in package.json). Patterns:
- Stub mode: VOCALLS_SDK_STUB=1 + bin.main(argv, {sdk: stub, cwd})
- Hash assertions: compare against core/canonicalHash.js output
- File assertions: byte-equal modulo timestamps + run-id (use a
  normalizing regex)

Naming: tests/integration/<topic>-<scope>.test.js, kebab-case.
Conventions: same as existing tests/core/ (jest describe/test,
expect().toBe / .toEqual, no deep-equal lib).

Constraints:
- Do not modify any file under core/, bin/, or docs/DESIGN.md
- Do not regenerate manifests or schema docs
- Do not run `git commit` — produce the test files for review
- Each new test file is one commit when reviewed and merged

Report back: list of test files created, brief coverage summary
(which surfaces the suite covers — FSM transitions, runner dispatch
incl. translator fan-out, gate flows, stub-mode end-to-end, repair
loops, CLI flags, error paths), and any DESIGN.md ambiguities or
implementation deviations surfaced during writing (these become PT-####
entries). Do **not** force a per-R-ID coverage matrix — some
requirements (e.g. R10 "gates run in Node", R11 "SDK-native retry")
are architectural truths that a meaningful integration test cannot
directly assert. Coverage is judged by surface adequacy, not by R-ID
checklist.
```

The subagent's deliverable is reviewed by the human via
`/ce-code-review` before merge. The human verifies:

- Every assertion traces to DESIGN.md (`// DESIGN §X.Y` annotations
  present on non-obvious checks)
- No assertion was written backward from observed behavior without
  DESIGN backing
- Coverage matrix is complete (every R-ID enforced by at least one
  test file)

**Test scenarios (the test files themselves):** see Files above. The
human implementer does not write these scenarios in advance — the
subagent designs them from DESIGN.md.

**Final sub-commit (after subagent commits land):**

- **This plan's status flip.** Set this plan's `status: complete` in
  frontmatter. This is the only manual edit by the human in U12.

**Verification:**

- `npm test` green (the new integration suite is now the regression
  net)
- `npm run schema:check && npm run prompts:check` green
- Coverage matrix from the subagent report covers R1–R14
- `/ce-code-review` clean on every subagent-produced commit + the
  final plan-status-flip commit

---

## Test Strategy

Per DESIGN §16, layered three ways:

**Layer 1 — Per-unit unit tests (every U-unit, gated by /ce-code-review):**

Each U-unit lands its own unit suite under `tests/core/` or `tests/bin/`.
These cover the unit's own contract in isolation (pure-function FSM,
schema validation, projection determinism, stub dispatch, gate logic,
runner manual-tool-use loop). Passing assertions for every scenario
listed in the unit's `Test scenarios` field is required for merge.
`npm test` green across the whole suite at every commit.

**Layer 2 — Stub-mode smoke (U10 verification):**

`VOCALLS_SDK_STUB=1 node bin/vocalls.js build --project direct-debit
--auto` exits 0 against a fresh `state.json`. This is the **only**
integration-level regression check during U1–U11 — old
`tests/integration/*` are deleted in U1, new ones don't land until
U12.

**Layer 3 — Live rehearsal (U11):**

One end-to-end live-SDK run on `direct-debit` succeeds; outputs match
the recorded baseline (modulo timestamps); cache hit confirmed per
U11 sub-commit 5. The rehearsal output is also the *baseline reference*
the U12 subagent will use when writing the new integration suite.

**Layer 4 — New integration test suite (U12):**

A delegated subagent writes `tests/integration/*.test.js` from scratch,
working from DESIGN.md + the U1–U10 implementation + the U11 rehearsal
baseline. Coverage requirements: see U12.

CI command: `npm test && npm run schema:check && npm run prompts:check`.

---

## System-Wide Impact

| Affected | Effect |
|---|---|
| Existing 9 `tests/integration/*` | **Deleted in U1.** Replaced from scratch by U12's subagent-written suite. |
| `tests/integration/__fixtures__/` | Existing fixtures (`minimal-slotmap.js`) deleted with the tests; U1 adds new `sdk-stub-fixtures.json` under `tests/__fixtures__/`. The U12 subagent may add new fixtures as needed. |
| `tests/integration/*.test.js` (new) | Written from scratch in U12 by a delegated subagent (see R14 + U12). |
| `docs/schema/*.md`, `schemas/*.schema.json` | Regenerated by U1, U11 (schema:docs and jsonschema scripts) |
| `core/prompts/.manifest.json` | Regenerated by U11 sub-commits |
| `.claude/skills/vocalls-brief` | U11 sub-commit may edit if it inlines section headers (drift); otherwise untouched |
| `docs/plans/2026-05-18-003-…-plan.md` | `status:` flips to `superseded` in U11 |
| `docs/DESIGN.md` | Two honesty edits in U11 (§11.5 link annotations, §14 / §11.6.2 reconciliation); no §13 / §6 rewrites |
| Existing `core/` modules (canonicalHash, state-io, validatorRunner, assembler, grounding-line, schema/*) | Unchanged. |
| Project state.json files | Forward-compatible. `owner` field is required on new findings; old findings are not retroactively validated. |
| `package.json` dependencies | No changes in U1–U12. `subfinder` audit is a deferred PT entry. |

---

## Dependencies / Prerequisites

- Node `>= 18.18.0` (already pinned)
- `@anthropic-ai/sdk ^0.81.0` (already pinned)
- `zod ^4.4.3` (already pinned)
- `jest ^29.7.0` (already pinned)
- For the U11 live rehearsal: an active `ANTHROPIC_API_KEY` and at
  least one project (`projects/direct-debit/`) with a populated
  `brief.md`
- The `/ce-code-review` skill must be installed and invokable from
  the user's harness for the Review Protocol

---

## Risk Analysis & Mitigation

| Risk | Mitigation |
|---|---|
| **U5's marker grammar is implicit in retired references.** The `workflow-main-v2` `brief-markers.md` (89 lines) is the only documented source for the marker syntax. If the grammar is not surfaced in `core/briefParser.js` JSDoc, future maintainers cannot reconstruct it. | U5's review explicitly checks JSDoc completeness against `workflow-main-v2/.claude/skills/references/brief-markers.md` (if accessible) and the retired prior agent files. Implementer reads them before writing the parser. |
| **U10 cutover ships without an integration regression net.** Old tests are deleted in U1; new tests don't arrive until U12. A regression in U10 that escapes unit-test coverage will not be caught until U12's subagent-written suite runs. | (a) The per-unit unit-test suites (Layer 1) are exhaustive enough that most logic regressions surface there. (b) U10's stub-mode smoke (Layer 2) catches structural breakage. (c) U11's live rehearsal (Layer 3) catches semantic drift against the recorded baseline. (d) `git revert U10` is the rollback if catastrophic. (e) U12's subagent prioritizes coverage of U10-introduced surfaces (`main(argv, deps)` contract, stub-mode end-to-end, repair loops) to retroactively catch anything missed. |
| **U12 subagent writes tests that pass against incorrect behavior.** A subagent writing tests against the post-U10 implementation could codify bugs as correct behavior. | The subagent must reference DESIGN.md (not just observed behavior) for every test assertion. Each assertion includes a comment citing the DESIGN.md section it enforces. `/ce-code-review` on the U12 commit checks for DESIGN traceability. The U11 live rehearsal baseline gives the subagent a second authoritative reference. |
| **Stage prompts have hidden drift from DESIGN §13 fidelity guard.** They were populated outside this plan; the audit hasn't run yet. | U11's audit is mandatory. Any finding produces a sub-commit that updates the prompt + regenerates the manifest, gated by `/ce-code-review`. |
| **Prompt caching has lower hit rate than predicted.** Silent invalidators (timestamps, env-derived strings, reordering) would force every request to re-process the system prompt. | U11 rehearsal verifies via `response.usage.cache_read_input_tokens`. If miss rate is high, audit U6's loader output for non-determinism. |
| **`/ce-code-review` produces a flood of advisory `suggestion` findings that slow velocity.** | Advisory findings don't block by user-confirmed call-out. The author may defer them to PT-#### entries per AGENTS.md §6. The protocol is intentionally weighted toward velocity on suggestion-level findings. |
| **`canonical_rules_unknown_hook` resolution is deferred to U11.** Until then, the enum carries an undocumented entry. | U1 adds a TODO comment pointing at U11; the reconciliation is part of U11's DESIGN edits sub-commit. |
| **`subfinder ^1.3.1` dependency is unexplained.** Repo research flagged it as unusual. | Logged as a `PT-####` in `docs/parallel-todos.md` per AGENTS.md §6 protocol; not blocking this plan. |
| **Cross-unit findings during review surface a problem that belongs in an already-landed unit.** | Per Review Protocol Escape hatches: stop, fix the prior unit (potentially `git revert` + re-land), then continue. Do not stack technical debt across units. |

---

## Documentation Plan

- **DESIGN.md** — two honesty edits in U11 (§11.5 link annotations,
  §14 / §11.6.2 `CheckIdEnum` reconciliation). No structural changes.
- **plan 003** — `status: superseded` in U11.
- **This plan (004)** — `status: complete` in U11 once DoD passes.
- **`docs/parallel-todos.md`** — new PT-#### entries as discovered work
  surfaces (e.g., `subfinder` audit). Per AGENTS.md §6, each entry
  requires user approval before writing.
- **`docs/plans/2026-05-18-004-rehearsal-direct-debit.md`** — new file
  in U11 sub-commit 5; records the live-SDK rehearsal.
- **`docs/solutions/`** — currently empty. Seed during implementation
  via `/ce-compound` after notable findings (FSM edge cases, manual
  tool-loop surprises, cache invalidators discovered live). This is
  encouraged but not a DoD gate.

---

## Operational Notes

- **State.json schema is forward-compatible.** U1's `owner` field is
  required on new findings only; old findings under
  `state.validation.findings` are not retroactively validated.
- **Rollback story.** Each U is one commit. U10 is the cutover; revert
  U10 to restore the stub binary while keeping U1–U9 modules. U11
  sub-commits are individually reversible.
- **No project-side changes.** `projects/<name>/brief.md`,
  `callScripts/`, `globalLibraries/` are untouched in any unit.
- **Deferred items.** Tier C migrations (DESIGN §11.6),
  `state.json` archival, `state-io.js` busy-wait, `subfinder` audit —
  explicitly out of scope. Track separately when they become hot.
- **Review Protocol applies in this session and every future
  session** working off this plan. If `/ce-code-review` is unavailable
  for some reason, the unit pauses — do not bypass the gate.

---

## Definition of Done

The implementation is complete when:

1. U1–U12 landed atomically (one commit per unit; U11 may split into
   up to 6 sub-commits; U12's subagent may produce multiple commits
   reviewed independently)
2. Every commit's `/ce-code-review` returned no critical / error /
   warning findings before the commit landed
3. `npm test && npm run schema:check && npm run prompts:check` green
4. `VOCALLS_SDK_STUB=1 node bin/vocalls.js build --project direct-debit
   --auto` exits 0 on a fresh `state.json`
5. One live-SDK rehearsal on `direct-debit` end-to-end succeeded; the
   resulting `callScripts/AGENT_*.js` matches the recorded baseline
   (modulo timestamps and run-id); cache-read hit rate >= 90% from
   stage 2 onward
6. **U12's new integration test suite passes** and covers the FSM
   transition surface, runner dispatch (incl. translator per-language
   fan-out), gate flows, stub-mode end-to-end, repair loops, CLI flags,
   and error paths. Coverage judged by surface adequacy, not per-R-ID
   checklist.
7. DESIGN.md §11.5 + §14 reflect post-U5 / post-U1 reality
8. `core/prompts/.manifest.json` regenerated and committed after U11
   prompt edits
9. Plan 003 frontmatter: `status: superseded`
10. This plan's frontmatter: `status: complete` (set in U12's final
   sub-commit)
