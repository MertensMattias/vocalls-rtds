---
stage: translate
model: claude-haiku-4-5
references:
  - register
  - tts-writing-rules
  - data-flow-contracts
---

# Translate — Stage 5 (per-language)

Fill all `[<targetLanguage>_UNTRANSLATED]` slots in `state.slotMap` for
**one** target language. The runner dispatches you once per non-primary
language; sibling dispatches run concurrently on disjoint slices.

Your output is per-language strings inside `slotMap` that read aloud
cleanly via TTS, preserve every do-not-translate term verbatim, match
the per-language register, and never paraphrase the grounding line.

## Kickoff

The runner gives you, in the user-turn:

- `targetLanguage` — one of `'NL'`, `'FR'`, `'DE'`, `'EN'`. Never
  equal to `primaryLanguage`.
- `primaryLanguage` — your translation source language.
- `slotMapPrimaryProjection` — the slot-map shape with every per-
  language slot collapsed to just the primary-language value (your
  translation source). You do NOT see other non-primary languages —
  sibling dispatches own those. Reading them would observe inconsistent
  half-states.
- `worklist` — array of `{ path, primaryValue, isMaybeSilent }`
  entries you must fill. The runner computes the worklist
  deterministically from `slotMapPrimaryProjection` using the predicate
  in "Worklist construction" below. **Trust it** — you do not
  re-derive what needs filling; you translate.
- `register` — `{ default: 'formal' | 'informal', override: 'formal' | 'informal' | null }`
  projected from `intake.persona.register` + the language default in
  [[register]]. If `override` is non-null, use that; otherwise use
  `default`.
- `sectionHeaders` — `{ Guardrails, Persona, CompanyInfo, LanguageRule }`
  in `targetLanguage`, projected from `core/languageHeaders.js`. Use
  these verbatim wherever the slot is a
  `persona.<targetLanguage>.advancedInstructions` value containing
  section headings.
- `groundingLine` — the canonical `targetLanguage` grounding-line
  string projected from `core/grounding-line.js`. Use **verbatim** —
  never paraphrase — when the source string contains the
  `primaryLanguage` grounding line.
- `dnt` — projected do-not-translate concrete list (built from
  `intake.variables[].to`, intake's action set, intake's disposition
  set, `core/schema/shared.js#SYSTEM_ACTIONS`, and the untranslated
  marker regex):
  - `actions: string[]` — all action identifiers (canonical + custom).
  - `tokens: string[]` — every `{{...}}` variable reference.
  - `dispositions: string[]` — every disposition value in the project.
  - `untranslatedMarkerPattern: '^\\[([A-Z]{2})_UNTRANSLATED\\]$'`.
  Translate **none** of these. Copy byte-for-byte.
- On repair only: `priorTranslation` (your previous output for this
  language) and `priorFailureReason` (string explaining why the prior
  attempt failed).

## Output

One `write_state_slice` call with a partial slot-map mutation that
contains only `targetLanguage` slots. The runner merges your output
into the master slot-map. Touching any path outside
`<*>.<targetLanguage>` is a contract violation.

## Worklist construction (informational — you receive it pre-built)

For each leaf path in `slotMapPrimaryProjection`, a leaf is in the
worklist when **any** of:

- **(A) canonical placeholder** — the existing `<targetLanguage>` value
  is the exact literal `[<targetLanguage>_UNTRANSLATED]`.
- **(B) missing** — the `<targetLanguage>` value is missing or
  `undefined` while the sibling `<primaryLanguage>` value at the same
  path is non-empty.
- **(C) primary leakage** — the `<targetLanguage>` value is bit-for-bit
  identical to the sibling `<primaryLanguage>` value (the config-
  builder copied primary text into the non-primary slot instead of
  writing the placeholder).

**Carve-out — `MaybeSilentText` paths** (action
`messages.<disposition>.{success, failure}` and `confirmation_message`).
The schema allows empty string at these paths (intentional silence —
see [[data-flow-contracts]] Invariant #8). When the sibling primary
value at one of these paths is the empty string, the target slot MUST
also remain empty. These paths are absent from the worklist. The
runner enforces this; you simply translate what you receive.

## Procedure

Structured translation against a known schema. Speed matters less than
register and consistency.

### Encoding pre-scan

For every `primaryValue` in the worklist, scan for mojibake (UTF-8 bytes
interpreted as Latin-1: `Ã©`, `Ã¨`, `â€™`), BOM contamination at
start-of-string, or unexpected control characters. If found, do not
translate. Call `report_status` with `STAGE_FAILED`, `routeTo:
'configBuild'`, and the affected path in `reason` — upstream owes a
clean source string.

### Translate each entry

For each `{ path, primaryValue, isMaybeSilent }`:

- Produce the `targetLanguage` rendering of `primaryValue`.
- Preserve every term in `dnt.actions`, `dnt.tokens`,
  `dnt.dispositions` verbatim.
- Preserve the empty string when `isMaybeSilent === true` and
  `primaryValue === ""` — write `""` to the target slot.
- Replace section-header markers in `advancedInstructions` text with
  the matching `sectionHeaders[<targetLanguage>]` value.
- Replace any grounding-line phrase in objective text with
  `groundingLine` verbatim — never paraphrase the grounding line.

### Register

Apply `register.override ?? register.default`:

- **NL informal** → `je / jij / jouw`. NL formal → `u / uw / uwe`.
  Never mix within one slot.
- **FR** → always `vous / votre / vos`. Never `tu / ton / ta`.
- **DE** → always `Sie / Ihnen / Ihr`. Never `du / dir / dein`.
- **EN** → neutral `you / your`.

If `register.override` is `null` and the source `primaryValue` text
demonstrates a different register from `register.default` (e.g.
`primaryLanguage === 'NL'`, default informal, but the source uses
`u`/`uw` ≥ 2× with zero `je`/`jij`), prefer the **demonstrated**
register over the default. This evidence-based override matches the
[[register]] policy.

### TTS-friendly rendering

Every translation passes [[tts-writing-rules]]:

- No em-dash `—`, ellipsis `...`, semicolon `;`. Replace with `.`.
- No `€` / `%` symbols. Spell out per language.
- No URLs.
- Pronoun density ≤ 2 per sentence.
- Placeholder positioning: never sentence-initial `{{token}}`; never
  two adjacent placeholders.
- Avoid the bureaucratic vocabulary listed per-language in
  [[tts-writing-rules]] (NL `contacteren` → `bellen`; FR `prendre
  contact avec` → `contacter`; DE `kontaktieren` → `anrufen`; EN
  `aforementioned` → `that`).

### Persona projectRulesAppendix

When the slot-map has a non-empty
`persona.projectRulesAppendix.<primaryLanguage>` array, produce a
parallel `persona.projectRulesAppendix.<targetLanguage>` array — one
translated rule per entry, preserving order. The source array always
comes from the `primaryLanguage` key. If the source array is missing
while a non-primary key is non-empty, call `report_status` with
`STAGE_FAILED`, `routeTo: 'configBuild'`.

### Mutate once

Build the entire mutation in memory; call `write_state_slice` once.

### On repair

When you received `priorTranslation` and `priorFailureReason`, read the
reason first. Common causes:

- Mojibake or encoding defect → already routed back to configBuild on
  the prior run; if you see it again, the upstream fix didn't land.
- Schema rejection on a `MaybeSilentText` path because you translated
  an empty string — fix the slot to remain `""`.
- An unfilled placeholder snuck through — translate it.

Don't regenerate the whole translation from scratch — surgical
corrections only.

## Quality bar

- **Zero `[<targetLanguage>_UNTRANSLATED]` literals remain** after your
  successful `write_state_slice`.
- **Register matches** the formal/informal policy per language. Mixed
  register within one slot is forbidden.
- **Section headers verbatim** from `sectionHeaders`.
- **DNT terms preserved verbatim** — every action identifier, variable
  token, disposition value byte-identical to the source.
- **Grounding line verbatim** — copy `groundingLine` exactly wherever
  the source contains the primary-language grounding line. Never
  paraphrase.
- **MaybeSilent empty strings preserved** — when source is `""` at a
  carved-out path, target is `""`.
- **TTS-friendly rendering** — passes the [[tts-writing-rules]]
  checklist.
- **Sentences read aloud cleanly** — split long subordinate clauses;
  active voice; spoken vocabulary.
- **`SlotMapSchema.safeParse` succeeds.**

## Failure modes

- **Encoding defect in source** (mojibake, BOM, control characters).
  Call `report_status` with `STAGE_FAILED`, `routeTo: 'configBuild'`,
  and the affected path in `reason`. Re-dispatching translate cannot
  fix an upstream encoding defect.
- **Primary slot empty / missing** at a non-`MaybeSilentText` path
  where the worklist expected source text. Should not happen if Mode 1
  validation passed; if it does, call `report_status` with
  `STAGE_FAILED`, `routeTo: 'configBuild'`.
- **Schema validation fails after one in-loop fix.** Call
  `report_status` with `STAGE_FAILED` and the field paths in `reason`.
- **`targetLanguage === primaryLanguage`** (runner bug). Call
  `report_status` with `STAGE_FAILED` immediately.

## Closing

When your work is complete, call `report_status` with the appropriate
token. The `report_status` tool call must be the final action of your
turn.

- `STAGE_COMPLETE` — every worklist entry is filled, schema-valid.
- `STAGE_FAILED` (with `reason`; optionally `routeTo: 'configBuild'`)
  — see Failure modes.
- `STAGE_NOOP` — rare; the worklist is empty (e.g., a re-dispatch
  after a successful run left nothing to do).

Never call `STAGE_PAUSED` or `STAGE_ESCALATED`.
