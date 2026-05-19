# Validation checks

Single source of truth for every `CheckId` the validator emits. Every
finding parses against `ValidationFindingSchema` (see
`docs/schema/validation.md` and `core/schema/validation.js`).

## Finding shape (canonical)

```ts
{
  check: CheckId,
  severity: 'error' | 'warning' | 'info',
  location: string,        // dot-path into state.slotMap (or 'brief.<x>')
  detail: string,
  suggestion?: string,     // present when autofixable, optional otherwise
  autofixable: boolean,
  owner: 'intake' | 'scenarioDesign' | 'configBuild' | 'translate'
}
```

`owner` names the stage that should repair the finding when it blocks.
Routing is mechanical: the FSM reads `owner`, clears that stage's input
hash, and re-dispatches.

## Mode-to-check matrix

| Mode | Driver | Checks emitted |
|---|---|---|
| 1 | Schema (Zod, deterministic) | `schema_completeness`, `language_completeness`, `action_messages_shape`, `cdb_logs_structure` |
| 2 | Autofix (Node, deterministic — see [[vocalls-autofix]]) | none (mutates slot-map then re-runs Mode 1) |
| 3 | DSL conformance (LLM judgment) | `check_19_dsl_bounds` |
| 4 | Assembly hygiene (Node + cross-field) | `check_13_disposition_coverage`, `check_18_prompt_assembly`, `check_kq_knowledge_grounding`, `check_speech_placement`, `canonical_rules_unknown_hook`, `pqr_register`, `pqr_tts_register` |
| 5 | Brief fidelity (keyword + LLM judgment) | `brief_fidelity` (gated on Modes 1–4 producing 0 errors) |

## Mode 1 checks

### `schema_completeness`
- **Severity:** error · **Autofixable:** no · **Owner:** `configBuild`
- Every required key in `SlotMapSchema` is present and non-null.
- Example failure: `agents.PRIMARY.actions.send_email.confirmation`
  missing.

### `language_completeness`
- **Severity:** error · **Autofixable:** yes (`untranslated-marker-shape`) · **Owner:** `configBuild`
- Every per-language slot's value (when present) is a non-empty string or
  the language's `[<LANG>_UNTRANSLATED]` marker. Cross-language tag
  leakage is rejected by `PerLangText` / `MaybeSilentText` refines in
  `core/schema/shared.js`.
- Empty-string values on `MaybeSilentText` slots are intentional silence
  and left alone.
- The schema permits partial-language values during config-build
  (`QuadLang` keys are `.optional()`). The full-coverage invariant —
  every per-language slot populated for every project language — is
  enforced only after the translate stage completes.

### `action_messages_shape`
- **Severity:** error · **Autofixable:** yes (`action-messages-shape`) · **Owner:** `configBuild`
- Every action's `messages` has the canonical
  `{ default: { success, failure } }` shape (plus optional disposition
  keys).

### `cdb_logs_structure`
- **Severity:** error · **Autofixable:** yes (`cdb-logs-canonical`) · **Owner:** `configBuild`
- `cdbLogs` follows the disposition-keyed shape; no flat string action
  entries.

## Mode 3 checks

### `check_19_dsl_bounds`
- **Severity:** error · **Autofixable:** no · **Owner:** `scenarioDesign`
- Primary-language objectives obey the full Part 6 checklist from
  [[ivr-objective-dsl-ruleset]]: allowed verbs only; forbidden phrases
  absent; type-specific structure (DETECT_INTENT opens with ASK; ROUTE
  ≤ 6 options + escape; COLLECT one field per ASK; AUTHENTICATE ≤ 2
  attempts); branch order; retry parameters present; every branch
  terminates in `GOTO` / `USE` / `end_conversation`.
- DSL fixes need scenario-designer judgment.

## Mode 4 checks

### `check_13_disposition_coverage`
- **Severity:** error · **Autofixable:** no · **Owner:** `configBuild`
- For every action name referenced in any scenario's DSL,
  `messages.default[outcome]` exists for every outcome the scenario
  produces.

### `check_18_prompt_assembly`
- **Severity:** warning at > 3500 approx tokens; error at > 4000 · **Autofixable:** no · **Owner:** `configBuild`
- Assembled (case × primaryLanguage) prompt token count.

**Assembly procedure** for each `caseNumber × primaryLanguage` pair:

1. Resolve `caseToScenario[caseNumber]` to get the scenario key.
2. Collect content for Layers 2–12 per [[prompt-layer-map]].
3. **Emptiness check** — non-conditional layers (2, 3, 4, 5, 6, 9, 10):
   error if empty/undefined. Layers 7 and 8 may be empty. Layers 11 and
   12: flag only if the field is absent from CONFIG.
4. **Unresolved token check** — scan Layers 6 and 10 for `{{token}}`;
   verify each exists as a `to` value in `CANONICAL_RULES`.
5. **Action coverage check** — every action name in
   `caseToActions[caseNum]` has an entry in Layer 9.
6. **Token budget check** — sum character lengths of Layers 2–12,
   divide by 4; warn at > 3500 tokens (~14,000 chars), error at > 4000
   tokens (~16,000 chars). Note: `CONFIG.llm.maxTokens` controls
   response generation, not prompt size.

### `check_kq_knowledge_grounding`
- **Severity:** error · **Autofixable:** no · **Owner:** `scenarioDesign`
- For any case with non-empty `caseToKnowledge[c]`, the assembled
  objective contains the language-specific grounding-line phrase from
  `core/grounding-line.js`.
- The grounding line is part of the LLM-authored objective;
  scenarioDesign re-authors on repair.

### `check_speech_placement`
- **Severity:** error · **Autofixable:** no · **Owner:** route per failure mode below
- For each `(action, disposition)` marker in `intake.speechPlacements`,
  the assembled state must agree with the marker:

| # | Trigger | Detail | Owner of fix |
|---|---|---|---|
| (a) | `dsl_inline` + `messages[d].success.<primary>` non-empty | DOUBLE-SPEAK | `configBuild` |
| (b) | `dsl_inline` + no SAY adjacent to USE `<a>` in any scenario | SILENT-WHEN-SPEAK-EXPECTED | `scenarioDesign` |
| (c) | `action_message` + `messages[d].success.<primary>` is the literal `[<LANG>_UNTRANSLATED]` placeholder | MISSING-ACTION-MESSAGE | `intake` |
| (d) | `action_message` + SAY adjacent to USE `<a>` in any scenario | DOUBLE-SPEAK | `scenarioDesign` |

Mode (c) detects the UNTRANSLATED placeholder, **not** empty string.
Empty string under Pattern A is the MaybeSilent sentinel for intentional
silence ([[data-flow-contracts]] Invariant #8). "Adjacent" is the
±200-character window heuristic in
`core/validatorRunner.js#hasAdjacentSay`.

### `canonical_rules_unknown_hook`
- **Severity:** warning · **Autofixable:** no · **Owner:** `intake`
- Every `hook` name on every `CANONICAL_RULES[i]` entry is present in
  the runtime `HOOKS` registry. Unknown hooks are silently skipped at
  runtime, so the variable will bind to its raw API value instead of the
  transformed one — usually a bug.
- Author must fix the brief's `## Variables` table (rename to a known
  hook, drop the hook column, or register the custom hook via runtime
  `addHook(name, fn)`).

### `pqr_register`
- **Severity:** warning · **Autofixable:** no · **Owner:** `configBuild`
- Primary-language pronouns are consistent within an objective (NL
  informal `je/jij/jouw` OR formal `u/uw` — never mixed; FR always
  `vous/votre`; DE always `Sie/Ihr`).
- See [[register]] for the canonical register table.

### `pqr_tts_register`
- **Severity:** warning · **Autofixable:** no · **Owner:** `configBuild`
- SAY/ASK/ASK_CHOICE bodies don't use written-register vocab listed in
  [[tts-writing-rules]] (e.g. NL `contacteren`, `verstrekken`; FR
  `prendre contact avec`; DE `Intervention`, `kontaktieren`; EN
  `aforementioned`).

## Mode 5 checks

### `brief_fidelity`
- **Severity:** warning (informational); error only on omitted cases · **Autofixable:** no · **Owner:** depends on finding kind
- Cases / actions / knowledge / persona / disposition policy mentioned
  in `brief.md` are reflected in the slot-map.
- Mode 5 runs only when Modes 1–4 produced 0 errors.
