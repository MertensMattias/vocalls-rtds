# 13-Layer prompt map

The Vocalls runtime assembles the **agent's system prompt at call time**
by concatenating these 13 layers in order. This is the definitive layer
map. The config-builder writes layers 2–12 (each from a specific slot in
the slot-map); the runtime injects layers 1 and 13.

## Layer table

| Layer | Name | Source field in CONFIG |
|---|---|---|
| 1 | Language instruction + grounding line | Runtime-injected; not in CONFIG |
| 2 | General Instructions | `persona[lang].generalInstructionsExtra` |
| 3 | Persona | `persona[lang]`: name, companyName, description, companyRole, tone |
| 4 | Company Info | `companyInfo[lang]` |
| 5 | Advanced Instructions | `persona[lang].advancedInstructions` (4 sections — see [[register]]) |
| 6 | Scenario Objective | `scenarios[key].objective[lang]` |
| 7 | Facts | `scenarios[key].facts[lang]` (lines whose `{{variable}}` are in CANONICAL_RULES) |
| 8 | Knowledge Modules | `knowledgeModules[key]` for each key in `caseToKnowledge[caseNum]` |
| 9 | Actions | Per-case `actions[name].description[lang]` + `confirmation_message[lang]` for each name in `caseToActions[caseNum]`. Plus the action-message slot `actions[name].messages[disposition].success[lang]` under Pattern A — see below. |
| 10 | Opening | `caseToOpening[caseNum][lang]` (fallback: `caseToOpening.default[lang]`) |
| 11 | CANONICAL_RULES | `CANONICAL_RULES[]` — variable transformation rules |
| 12 | Platform voice messages | `CONFIG.messages[lang]` (repeat, noInput, waitShort, wait, etc.) |
| 13 | Runtime variables | Injected by Vocalls at call time from telephony metadata; not in CONFIG |

## Layer notes

- **Layers 1 and 13** are runtime-injected. They cannot be validated from
  CONFIG. Assume they are always present. Exclude them from emptiness
  checks.
- **Layer 7 (Facts)** may be empty after variable filtering — not an error.
- **Layer 8 (Knowledge)** is absent when `caseToKnowledge[caseNum]` is
  empty — not an error; the module is simply not injected.
- **Layers 11 and 12** are structural / platform layers. Verify they are
  non-empty at the schema level (`CANONICAL_RULES` is a non-empty array;
  `CONFIG.messages` exists with at least one language key). Do not
  simulate their content.

## Layer 9 — speech placement (Pattern A vs Pattern B)

Customer-facing speech tied to an `(action, disposition)` pair lives in
**exactly one** of two positions:

- **Pattern A — `action_message`**: speech lives in
  `actions[name].messages[disposition].success[lang]`. The runtime fires
  the action, then speaks the per-disposition message. Source:
  `intake.actionMessages[name][disposition]` copied verbatim by the
  config-builder into the primary-language slot; other languages filled
  by the translator. The scenario DSL stays terse with just
  `USE <name>(disposition: ...)`.
- **Pattern B — `dsl_inline`**: speech lives in the scenario DSL as a
  SAY adjacent to the USE. The
  `actions[name].messages[disposition].success[lang]` slot is left empty
  (or holds the MaybeSilent empty-string sentinel). Source: the verbatim
  `intake.cases[n].objective` block; the scenario-designer transcribes
  the SAY directly.

The choice is user-decided once per pair via a marker in `brief.md`
(grammar in `core/briefParser.js`) and propagated through
`intake.speechPlacements`. The validator's
`check_speech_placement` ([[validation-checks]]) enforces marker
consistency post-assembly. Empty string in the Pattern A slot is the
MaybeSilent sentinel for intentional silence ("fire the action, say
nothing") and is a valid configuration.

## Cross-references

- Canonical grounding-line strings (Layer 1): generated from
  `core/grounding-line.js` and injected into stage prompts at load time.
- Per-language register table (Layers 3, 5, 6, 9, 10): see
  [[register]].
- Per-language TTS vocabulary (Layers 6, 9, 10, 12): see
  [[tts-writing-rules]].
- Token-budget assembly procedure for Layers 2–12: see
  [[validation-checks]] → `check_18_prompt_assembly`.
