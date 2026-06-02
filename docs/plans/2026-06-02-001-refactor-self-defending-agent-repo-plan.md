---
title: "refactor: Make vocalls-rtds self-defending against doc/spec/skill drift"
type: refactor
status: active
created: 2026-06-02
depth: deep
---

# refactor: Make vocalls-rtds self-defending against doc/spec/skill drift

## Problem Frame

vocalls-rtds is unusually well-documented for AI agents (clear entry docs, scoped
`conventions/`, a "what to update when you change X" lockstep matrix), but its correctness
rests on **manual discipline agents don't have**. The same fact is duplicated across files
that must be hand-synced, and nothing enforces it. A cold analysis plus direct file reads
confirmed the failure is not hypothetical — it has already happened:

- **The skill's bundled conventions are stale and now teach wrong rules.** Comparing
  `conventions/storage.md` (repo source) with the skill copy at
  `.claude/skills/rtds-vocalls-component-gen/conventions/storage.md` shows real content
  divergence — not the deliberate path-rewrites `scripts/bundle_paths.py` applies:
  - the skill copy still says "outside the **SetAttributes** / varObj contract"; the repo
    moved to **SetVariables** (`setAttributes` is now the 🔒 legacy alias);
  - the skill copy's `RTDS_*` table **omits `RTDS_currentOpConfig`**, which the repo lists;
  - a section heading drifted ("Read contract" vs "Read & write contract").
  An agent invoking the canonical component-generator skill is currently handed outdated
  vocabulary. The bundling model (`cp` → `bundle_paths.py` rewrites paths → commit) *produces
  incorrect agent guidance* and nothing detects it.
- **Operation status is prose, not data.** 33 specs exist, only 8 have components (verified).
  Most specs are aspirational (`⬜` in the catalog) but nothing in the spec itself says so —
  an agent cannot distinguish "designed" from "implemented" without manually cross-referencing
  `rtds/docs/operations-catalog.md`.
- **6-way fan-out per operation, unchecked.** Changing one operation correctly touches:
  component → spec → catalog row → runtime twin (`executeXxx` in `rtds_2_runtime.js`) → seed
  SQL → skill example. No check verifies they agree.
- **No component contract tests.** `projects/rtds-runtime/tests/main.test.js` covers the
  engine; the per-operation branch contract (params in → `_rtNextStep` out) is untested, so a
  wrong branch wiring ships silently.
- **CLAUDE.md / AGENTS.md are hand-maintained twins.** Verified in sync today (differ only by
  title + two sibling sentences), but the "edit one, forget the other" failure mode is live.

**Intended outcome:** every duplicated source of truth becomes either (a) the single source,
or (b) generated build output that an automated check refuses to let drift — backed by a
component contract test and a pre-commit gate, so the first thing that breaks on drift is the
build, not a production call flow.

---

## Scope Boundaries

**In scope:** build/verify tooling under `scripts/`, spec frontmatter + generated catalog,
a component contract-test harness, retiring the deprecated skill, and wiring it all to npm +
a tracked pre-commit hook.

**Non-goals (this product's identity):**
- The runtime engine (`rtds_*.js`), the operation dispatch model, and the
  handler→spec→component review chain are **not** restructured. This work guards them; it does
  not rework them.
- No new operations are implemented. Aspirational specs stay aspirational — they are merely
  *labelled* as such.

### Deferred to Follow-Up Work
- **Type-level Param parity** in the lockstep check. The first pass asserts param-*name*-set
  equality across component/spec/seed; comparing declared types adds parser surface not yet
  worth its weight.
- **Branch-contract tests for GUI-only operations** (those with no runtime twin, e.g.
  `guardRouting`). The harness in U6 tests runtime-twin operations; extracting and executing
  mxGraph node bodies from component XML is a larger, separate effort.
- **CI workflow.** Enforcement is pre-commit by user choice; a GitHub Actions mirror is a
  later addition.
- **Auto-generating components/specs from a single DSL.** Out of scope — would fight the
  deliberate review chain.

---

## Key Technical Decisions

1. **Keep the skill bundle; make it generated, not hand-maintained.**
   `.claude/skills/rtds-vocalls-component-gen/SKILL.md` advertises "Self-contained skill …
   works outside vocalls-rtds," so the bundled copies must physically exist (symlinking or
   referencing repo files breaks portability). The fix is a single generator script that is
   the *only* writer of those copies, plus a check that fails when a committed copy differs
   from what the generator would produce. Rationale: preserves portability while making drift
   detectable. (see origin: `.claude/plans/can-you-analyze-this-velvet-feather.md`)

2. **Reuse `scripts/bundle_paths.py`'s `REPLACEMENTS` as the one rewrite source.** The new
   build and check scripts import that table rather than copying it, so the rewrite rules
   can't themselves drift.

3. **Spec frontmatter is the single source of operation status; the catalog is generated.**
   `rtds/docs/operations-catalog.md` becomes build output of `gen_catalog.py`, and the
   lockstep check fails if the committed catalog differs from a fresh generation — a stale
   catalog can no longer silently lie.

4. **Param-parity parser must decode XML-entity-encoded `__configJSON` and tolerate `&=`.**
   Component config lives inside mxGraph XML as `__configJSON = {…}` with `&#xa;`, `&amp;`,
   `&#39;` entities and the Vocalls `&=` placeholder-binding operator (intentional, not a
   typo). The parser extracts param *names* (keys), not a strict JSON parse.

5. **The contract test targets the runtime twin, not the mxGraph component.** `core/testHelpers.js`
   (`runScript`) already loads/sandboxes runtime JS with HTTP-stub + log + `varObj` capture,
   but it runs *call scripts*, not mxGraph XML. The runtime twin (`executeSendSms`, registered
   in `rtds_2_runtime.js`) is plain JS exercising the same params-in → `_rtNextStep`-out
   contract the catalog claims must stay in lockstep — so it is the right, reusable test
   surface for the worked example.

6. **Retiring the deprecated skill is low-risk.** Grep confirmed the only `vocalls-component-builder`
   references are *inside that skill itself* plus one historical mention in
   `rtds-vocalls-component-gen/DEPLOY.md` and an old `.claude/plans/` file. The repo-root docs
   (`CLAUDE.md`, `PROJECT_CONVENTIONS.md`, `conventions/anti-patterns.md`) carry **no live
   links**, so deletion needs only the DEPLOY.md mention cleaned up.

---

## High-Level Technical Design

*This illustrates the intended data-flow and is directional guidance for review, not
implementation specification. The implementing agent should treat it as context, not code to
reproduce.*

```
SINGLE SOURCE                         GENERATED + DRIFT-CHECKED
─────────────                         ─────────────────────────
conventions/*.md, PROJECT_CONV.   ──► .claude/skills/.../conventions/*  (check_skill_sync)
CLAUDE.md (+ shared entry)        ──► AGENTS.md                          (check_skill_sync)
rtds/specs/*.spec.md frontmatter  ──► rtds/docs/operations-catalog.md    (check_lockstep)

CONTRACT (no generation — cross-checked for agreement)
────────
rtds/components/X.js  ◄─ names ─►  spec Params table  ◄─ names ─►  seed Dic_Attribute
spec frontmatter `runtime:`  ◄─ matches ─►  register{Operation,Exit}() in rtds_2_runtime.js
runtime twin executeX  ◄─ params in / _rtNextStep out ─►  jest contract test

GATE: scripts/hooks/pre-commit ─► npm run check ─► check_skill_sync + check_lockstep + jest
```

---

## Implementation Units

Units are dependency-ordered. The **sequencing rule**: all one-time regenerations and the
deprecated-skill cleanup land *before* the pre-commit hook is installed (U9), so the first
hook-enforced commit is already green.

### U1. Retire the deprecated `vocalls-component-builder` skill

**Goal:** Remove the deprecated skill and the one live cross-reference to it, shrinking the
surface an agent can wander into.
**Dependencies:** none.
**Files:**
- delete `.claude/skills/vocalls-component-builder/` (entire tree)
- modify `.claude/skills/rtds-vocalls-component-gen/DEPLOY.md` (drop the historical mention)
**Approach:** Re-run the grep for `vocalls-component-builder` across `*.md` first to confirm
no repo-root doc grew a live link since planning. Repoint/remove the DEPLOY.md mention, delete
the directory. The stale `.claude/plans/*-twinkling-truffle.md` reference is an old plan
artifact outside the repo tree — leave it.
**Patterns to follow:** the skill's own `SKILL.md` already declares itself deprecated; this
just completes the retirement.
**Test scenarios:** Test expectation: none — file/directory removal, no behavioral change.
Verification covers it.
**Verification:** `grep -ri vocalls-component-builder` over the repo returns no live
documentation links (only the out-of-tree old plan file may remain).

### U2. Fold the bundle recipe into one generator script

**Goal:** Make a single script the *only* writer of the skill's bundled copies, absorbing the
manual `DEPLOY.md` `cp` recipe and the existing path-rewrite step.
**Dependencies:** none (can run parallel to U1).
**Files:**
- create `scripts/build_skill_bundle.py`
- modify `.claude/skills/rtds-vocalls-component-gen/scripts/bundle_paths.py` (export
  `REPLACEMENTS` cleanly for import; keep its standalone `main()` working)
- modify `.claude/skills/rtds-vocalls-component-gen/DEPLOY.md` (reduce to: run the generator;
  never hand-edit bundled `conventions/`/`references/`)
**Approach:** The script copies the repo sources the skill bundles — the 14 `conventions/*.md`,
`PROJECT_CONVENTIONS.md`, `references/examples/{sendSms,sendMail,voicemaildetector}.js`, and
the runtime snapshots listed in `DEPLOY.md` — into the skill, then applies the imported
`REPLACEMENTS`. Prepend a generated-file banner (`<!-- GENERATED by
scripts/build_skill_bundle.py — edit the repo source, not this copy -->`) to each bundled
markdown copy so an agent opening a copy is told where the real source is. Idempotent: running
twice produces no diff.
**Patterns to follow:** `scripts/bundle_paths.py` (path handling, `TEXT` suffix set, UTF-8
`newline="\n"` writes).
**Test scenarios:** Test expectation: none directly — exercised by U3's check and the U2
verification below (a generator without a checker has no assertable behavior yet).
**Verification:** Running `python scripts/build_skill_bundle.py` twice yields an empty `git
diff` on the second run; the regenerated `storage.md` copy now reads "SetVariables" and
includes `RTDS_currentOpConfig`; every bundled markdown copy carries the banner.

### U3. Skill-bundle drift check

**Goal:** Fail the build when a committed skill copy differs from what the generator would
produce. Also covers the CLAUDE.md → AGENTS.md generation (U4).
**Dependencies:** U2 (shares the transform), U4 (AGENTS.md generation).
**Files:**
- create `scripts/check_skill_sync.py`
**Approach:** Re-run the U2 transform in memory for every bundled file and compare against the
committed copy; collect and report each `DRIFTED` path, exit non-zero if any. A naive byte
`diff` is wrong because path hops differ by design — normalize via the shared `REPLACEMENTS`
first (same code path U2 uses). Include the AGENTS.md check (regenerate from the CLAUDE.md
source in memory, compare).
**Patterns to follow:** import and reuse `build_skill_bundle.py`'s transform function — do not
re-implement it.
**Test scenarios:**
- Happy path: on a freshly built bundle, exits 0 with an "in sync" summary.
- Drift detected: hand-edit one bundled `conventions/*.md` copy → exits non-zero naming that
  exact file.
- Re-sync: re-running `build_skill_bundle.py` restores green.
- AGENTS.md drift: edit `CLAUDE.md` source without regenerating → check fails naming
  `AGENTS.md`.
**Verification:** the three drift scenarios above behave as described when run by hand.

### U4. Generate AGENTS.md from a single entry source

**Goal:** Eliminate the CLAUDE.md/AGENTS.md hand-sync by generating AGENTS.md.
**Dependencies:** none (consumed by U3).
**Files:**
- create `scripts/gen_agents_md.py`
- modify `AGENTS.md` (becomes generated output; add generated-file banner)
- possibly create `_agent-entrypoint.md` (shared body) — or treat `CLAUDE.md` as the source
  and transform the title + sibling sentences; pick whichever yields the smaller diff
**Approach:** Verified the two files differ only by the H1 title and two "sibling" sentences.
Generator reads the source, swaps the title, and substitutes the sibling pointer line.
**Patterns to follow:** the existing sibling-pointer sentences in both files define the exact
substitution.
**Test scenarios:**
- Happy path: generating AGENTS.md from an unchanged source reproduces the committed file
  byte-for-byte.
- Drift: covered by U3's AGENTS.md scenario.
**Verification:** `python scripts/gen_agents_md.py` produces an empty `git diff` on the
current repo.

### U5. Add status frontmatter to specs; generate the catalog

**Goal:** Make operation status machine-readable in each spec, and turn the catalog into
generated output.
**Dependencies:** none functionally; do after U1 to avoid churn.
**Files:**
- modify `rtds/specs/*.spec.md` (33 files — add YAML frontmatter)
- create `scripts/gen_catalog.py`
- modify `rtds/docs/operations-catalog.md` (becomes generated; add generated-file banner)
**Approach:** Add frontmatter to each spec seeded from the current catalog
(✅→`implemented`, ⬜→`spec-only`, 🔒→`legacy`, the `_*`/runtime-internal specs→`non-operation`):
```
---
operation: sendSms
operationType: SendSMS
pattern: http_call
status: implemented        # implemented | spec-only | legacy | non-operation
component: rtds/components/sendSms.js   # or null
runtime: executeSendSms                  # twin name, GUI-exit key, or null
seed: true
---
```
The human-readable header table in each spec body stays; frontmatter is the machine source.
`gen_catalog.py` regenerates the full catalog (operations table, legend, the
"Canonical hand-built example" and "Runtime-internal / non-operation" sections) from
frontmatter. **Critical:** the regenerated catalog must reproduce the existing file
byte-for-byte for the *current* data, or U6's "catalog matches generator" check will fail on
day one — capture the current section ordering and wording exactly.
**Patterns to follow:** the current `rtds/docs/operations-catalog.md` table shape and the spec
header tables (e.g. `rtds/specs/sendSms.spec.md`) supply both the data and the output format.
**Test scenarios:**
- Round-trip: generating the catalog from current frontmatter reproduces the committed
  `operations-catalog.md` byte-for-byte.
- Status flip: changing one spec's `status:` changes exactly that row's marks on regeneration.
- Enum guard: an unknown `status:` value is reported, not silently emitted.
**Verification:** `python scripts/gen_catalog.py` yields an empty `git diff` after the
frontmatter is added and the catalog regenerated once.

### U6. Component contract-test harness + worked sendSms test

**Goal:** Give the params-in → `_rtNextStep`-out branch contract a real test, reusing existing
sandbox machinery.
**Dependencies:** none functionally; lands with the checks.
**Files:**
- create `projects/rtds-runtime/tests/components/_harness.js`
- create `projects/rtds-runtime/tests/components/sendSms.test.js`
- create `scripts/gen_component_test.py` *or* `projects/rtds-runtime/tests/components/_template.js`
  (failing-by-default stub for new operations)
**Approach:** Reuse `core/testHelpers.js` (`runScript` — HTTP stubs, log capture, `varObj`).
Because components are mxGraph XML (not call scripts), the harness drives the **runtime twin**:
a tiny call script (or direct invocation through the loaded runtime) calls
`executeSendSms` with a params object and asserts the resulting `_rtNextStep`. The template
stub asserts a deliberately failing expectation so a newly-scaffolded operation's contract
test is red until written.
**Execution note:** Write the `sendSms` contract test first (test-first), then the harness it
needs — the test defines the harness surface.
**Patterns to follow:** `projects/rtds-runtime/tests/main.test.js` (stub URLs, duck-typed Map
check, `testHelpers` usage); the `sendSms` spec's three branches
(NextStep / NextStep_Success / NextStep_Failure).
**Test scenarios (the sendSms contract test itself):**
- Covers AE (sendSms spec). Active=false → exits to `NextStep` (skip path), no HTTP call.
- Active=true, gateway `success:true` → `NextStep_Success`.
- Active=true, gateway failure response → `NextStep_Failure`.
- Active=true, invalid `To` number → `NextStep_Failure` without calling the gateway.
- Template stub: fails by default until an implementer fills it in.
**Verification:** `npm test` runs the new `tests/components/` files (already matched by
`jest.config.js` `testMatch` — confirm, don't change); the sendSms test passes; the template
stub fails.

### U7. Lockstep contract check

**Goal:** Turn the documented-but-manual lockstep rules into a failing check across catalog,
specs, components, seed, and runtime registry.
**Dependencies:** U5 (frontmatter + generated catalog).
**Files:**
- create `scripts/check_lockstep.py`
**Approach:** Assert, with precise "X says A, Y says B" messages:
1. committed `operations-catalog.md` is byte-identical to `gen_catalog.py` output;
2. every `rtds/components/X.js` has a spec whose frontmatter `component:` names it and
   `status: implemented`;
3. every spec `runtime:` claim matches a `registerRtdsOperation`/`registerRtdsExit` line in
   `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` — **allowing aliases**
   (e.g. both `SetVariables_vocalls` and `SetAttributes_vocalls` map to `executeSetVariables`);
   `spec-only` specs have no registration;
4. **param-name parity** for each `implemented` operation: component `__configJSON` keys ==
   spec Params-table names == seed `Dic_Attribute` rows in
   `rtds/db_seed/seed_operations_vocalls_dictionary.sql` (the `@Attribute` VALUES block,
   `OperationType → AttributeName`). The component-side parser decodes XML entities and
   tolerates `&=` (see Decision 4); compares *names* only.
**Patterns to follow:** the seed file's `@Attribute` INSERT block (lines ~107–126); the
registry block in `rtds_2_runtime.js` (lines ~1072–1087); the spec Params tables.
**Test scenarios:**
- Happy path: green on the current repo after U5.
- Stale catalog: edit the committed catalog by hand → fails on assertion 1.
- Param drift: rename a key in `rtds/components/sendSms.js` `__configJSON` → fails on assertion
  4 naming component-vs-spec.
- Runtime claim drift: change a spec `runtime:` to a non-existent twin → fails on assertion 3.
- Alias tolerance: `SetAttributes_vocalls` aliasing `executeSetVariables` does **not** trip
  assertion 3.
**Verification:** each scenario above behaves as described when run by hand.

### U8. Wire npm scripts

**Goal:** One-command verification surface.
**Dependencies:** U2, U3, U5, U7 (the scripts they create).
**Files:**
- modify `package.json` (`scripts` block)
**Approach:** Add:
```
"build:skill":   "python scripts/build_skill_bundle.py",
"gen:catalog":   "python scripts/gen_catalog.py",
"gen:agents":    "python scripts/gen_agents_md.py",
"check:sync":    "python scripts/check_skill_sync.py",
"check:lockstep":"python scripts/check_lockstep.py",
"check":         "npm run check:sync && npm run check:lockstep && npm test"
```
**Patterns to follow:** existing `scripts` entries (node-invoked CLIs); these are
python-invoked. Note Windows/Unix `python` vs `python3` — match what `bundle_paths.py` assumes.
**Test scenarios:** Test expectation: none — config wiring; verified by running the scripts.
**Verification:** `npm run check` runs all three legs and exits 0 on the regenerated repo.

### U9. Tracked pre-commit hook (install LAST)

**Goal:** Block commits that introduce drift.
**Dependencies:** U8, and all one-time regenerations (U1–U7) committed green first.
**Files:**
- create `scripts/hooks/pre-commit`
- create `scripts/hooks/install.sh` (sets `git config core.hooksPath scripts/hooks`)
- modify `README.md` (one line: run the installer once)
**Approach:** The hook runs `npm run check`. Keep it fast; if `check:lockstep` is slow, scope
it to operations whose files are staged. Install only after the repo is already green so the
first enforced commit passes.
**Patterns to follow:** standard `core.hooksPath` pattern; no husky dependency (repo has no
node hook tooling today).
**Test scenarios:** Test expectation: none (shell glue) — verified end-to-end below.
**Verification:** after `bash scripts/hooks/install.sh`, `git config core.hooksPath` returns
`scripts/hooks`; staging a deliberately drifted skill copy and attempting a commit is blocked
by the hook; reverting the drift lets the commit through.

---

## System-Wide Impact

- **Agents (primary beneficiary):** read generated copies that can no longer silently lie;
  one fewer (deprecated) skill to wander into; specs self-declare implementation status.
- **Maintainers:** gain `npm run check` and a pre-commit gate; lose the need to remember the
  6-way manual fan-out — the check names exactly what's out of sync.
- **No runtime/production impact:** nothing here touches `rtds_*.js`, components' behavior, or
  exported call flows. The seed SQL, swagger, and handlers are read, not modified.

---

## Verification (end-to-end)

1. `npm run build:skill` then `npm run check:sync` → green; regenerated `storage.md` says
   "SetVariables" and includes `RTDS_currentOpConfig`. Hand-edit a bundled copy → `check:sync`
   fails naming it; rebuild → green.
2. `npm run gen:catalog` → empty `git diff`. Flip a spec `status:` → `check:lockstep` fails
   until regenerated.
3. `npm run gen:agents` → empty `git diff`. Edit `CLAUDE.md` source → `check:sync` fails
   naming `AGENTS.md`.
4. `npm run check:lockstep` → green; introduce a `sendSms` `__configJSON` key rename → fails
   with a precise component-vs-spec message; alias case does not trip.
5. `npm test` → engine tests still pass; `sendSms` contract test passes; template stub fails.
6. `npm run check` → green end-to-end. After `install.sh`, staging a drifting change blocks
   the commit; `git config core.hooksPath` confirms install.
7. `grep -ri vocalls-component-builder` → no live doc links remain.

---

## Deferred Implementation Notes (resolve at execution time)

- Exact `python` vs `python3` invocation in npm scripts (depends on the contributor's PATH;
  match `bundle_paths.py`'s shebang assumption — confirm on this Windows box).
- Whether U4 uses a shared `_agent-entrypoint.md` or treats `CLAUDE.md` as source — decide by
  which yields the smaller, clearer diff once editing.
- The precise mechanism U6's harness uses to invoke the runtime twin (thin call-script wrapper
  vs. direct sandbox call) — settle when writing the failing test first.
- Exact catalog section ordering/wording for byte-identical regeneration (U5) — capture from
  the live file during implementation.
