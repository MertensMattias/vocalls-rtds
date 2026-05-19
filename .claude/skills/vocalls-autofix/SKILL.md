---
name: vocalls-autofix
description: >
  Node module registry of deterministic slot-map autofix rules. Loaded by
  `core/validatorRunner.js` via `require()` and invoked once per validation
  run as `applyAll(slotMap, findings, ctx) → { mutated, applied, logs }`.
  Not a subagent — there is no LLM in the loop.
---

# vocalls-autofix

## What this is

A pure-function registry under `rules/` plus an `applyAll` driver in
`rules/index.js`. The validator runner calls it once after Mode 1 emits
findings; rules rewrite the in-memory `slotMap` for the `autofixable: true`
subset. The runner re-runs Mode 1 once on the result (rules are idempotent
and orthogonal — a second pass is never useful). Each rule exports
`{ name, matches(finding), apply(slotMap, finding, ctx?) → { changed, mutated, log } }`;
`ctx` is opt-in (only `untranslated-marker-shape` reads `ctx.primaryLanguage`).

## Rules

| File | Trigger CheckId | What it does |
|---|---|---|
| `action-messages-shape.js` | `action_messages_shape` | Rewraps flat `{success, failure}` into `{default: {success, failure}}` |
| `cdb-logs-canonical.js` | `cdb_logs_structure` | Rewraps flat string action keys into `{default: {success}}`; refuses the case-level `.default` fallback |
| `untranslated-marker-shape.js` | `language_completeness` | Fills missing non-primary-language keys with `[<LANG>_UNTRANSLATED]`; idempotent; reads `ctx.primaryLanguage` |

`applyAll` pre-filters findings by `autofixable: true`, then dispatches the
first matching rule. Orphan autofixable findings (no rule matched) are
recorded in `logs` as `no-rule: <check> at <location>`.

## Quality bar

Rules must be pure (no I/O, no side effects) and idempotent. A rule that
cannot apply (location not present, value already canonical, refused by a
guard) returns `{ changed: false, mutated: slotMap, log: ... }`. Adding a
rule: copy an existing one, register it in `rules/index.js#RULES`, and pin
the behavior with a block in `tests/validator/mode2-autofix-rules.test.js`.
