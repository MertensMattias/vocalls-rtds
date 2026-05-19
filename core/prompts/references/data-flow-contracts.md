# Data-flow contracts

Cross-cutting invariants the pipeline relies on but no single stage owns
end-to-end. This reference describes each contract; the stage prompts
([[intake]], [[scenarioDesign]], [[configBuild]], [[validate]],
[[translate]]) describe the procedures that uphold it.

## Invariant #7 — Verbatim brief content survives intake

`IntakeSchema.CaseSchema` carries three brief-derived fields per case
that downstream stages treat as **read-only, never paraphrased**:

| Field | Source in brief.md | Behaviour |
|---|---|---|
| `opening` | `**Opening**:` line | Copied verbatim. `(none)` / blank / missing → empty string `""`. |
| `objective` | `**Objective**:` block | Preserved including newlines, branch markers (`IF customer confirms`, `ON Success`, `ON Failure`), SAY blocks (verbatim text inside `SAY: "..."`), indentation, and `SAY NOTHING` literals. |
| `cdbLogMap` | `**CDB log**:` lines | Parsed into `record(actionName, record(dispositionName, cdbLogId))`. cdbLog IDs verbatim from the brief; disposition names derived (chain below). |

**The one allowed transformation:** action-name canonicalization on
action identifiers (USE statements, `ON Failure → USE` references,
`entity: disposition = "..."` action references) per
`SYSTEM_ACTION_SYNONYMS` in `core/schema/shared.js`. Surrounding prose,
SAY content, and disposition values are never modified. A custom-action
marker in `brief.md` (grammar in `core/briefParser.js`) suppresses
canonicalization on the named action.

**Disposition-name derivation** (intake walks this in order):

1. **Explicit entity disposition** — `entity: disposition = "<value>"`
   adjacent to the USE → use that value verbatim as the inner key.
2. **SAY/branch context** — derive a short, snake_case label from the
   SAY text or branch label above the USE (e.g.,
   `IF customer confirms (paid) → SAY "...you have paid..."` produces
   disposition `paid_informed`).
3. **Generic fallback** — `success`, `failure`, `path_a`, `path_b`.
4. **Ambiguity** — when multiple cdbLogs map to the same action and the
   chain above cannot disambiguate, raise an `outstandingQuestion`
   blocking `scenarioDesign` rather than guessing.

Both outer (action) and inner (disposition) keys are `NonEmptyString`
only — snake_case is convention enforced by intake's canonicalization
pass, not by the schema. A malformed disposition name (e.g., `"Paid
Informed"` with space + capital) parses successfully but breaks
downstream cdbLog matching, so apply the priority chain rigorously.

## Invariant #8 — Speech placement is user-decided, marker-driven

When a brief carries customer-facing speech tied to an action outcome,
placement is structurally ambiguous between two patterns:

- **Pattern A — `action_message`**: speech lives in
  `actions.<action>.messages.<disposition>.success.<lang>`. DSL contains
  a bare `USE` with no adjacent SAY.
- **Pattern B — `dsl_inline`**: speech lives in the scenario DSL as a
  SAY adjacent to the USE.
  `actions.<action>.messages.<disposition>` is empty for that triple.

Stage 0 (`vocalls-brief` skill) resolves the ambiguity once per `(action,
disposition)` pair and writes the decision as an HTML marker in
`brief.md`. Marker grammar lives in `core/briefParser.js`; the
deterministic Node parser runs before intake dispatch and populates
`state.intake.speechPlacements` and `state.intake.actionMessages` from
parsed markers. The intake LLM never parses marker syntax — it consumes
the already-parsed slices in its kickoff.

**Propagation:**

1. **intake** parses every placement marker into
   `intake.speechPlacements[<name>][<value>]`. For each `'action_message'`
   placement, intake ALSO parses the paired speech-text marker into
   `intake.actionMessages[<name>][<value>]`. If the brief carries speech
   around an `(action, disposition)` pair with no placement marker,
   intake raises an `outstandingQuestion` blocking `scenarioDesign` —
   never guesses placement. If a placement marker says `action_message`
   but no paired speech-text marker exists, intake raises an
   `outstandingQuestion` (mirror handling). `IntakeSchema.superRefine`
   enforces that every `actionMessages` entry has a matching
   `'action_message'` marker in `speechPlacements`.
2. **scenarioDesign** consults `intake.speechPlacements` per USE. For
   `dsl_inline`, emit the SAY verbatim at the brief's position; for
   `action_message`, emit only the bare USE.
3. **configBuild** for Pattern A: copies `intake.actionMessages[<a>][<d>]`
   verbatim into `actions.<a>.messages.<d>.success.<primaryLanguage>`
   and writes `[<LANG>_UNTRANSLATED]` placeholders into the other-
   language slots for the translator to fill later. For Pattern B:
   leaves the action-message slot empty. **Empty string** in
   `intake.actionMessages[<a>][<d>]` is the **MaybeSilent sentinel** —
   preserved verbatim ("intentional Pattern A silence" — valid
   configuration). If a marker says `action_message` but
   `intake.actionMessages` has no entry for the pair, configBuild fails
   the stage (the only `action_message` failure mode left there).
4. **validate** Mode 4 enforces consistency via `check_speech_placement`
   — see [[validation-checks]].

`SAY NOTHING → USE` blocks and bare USEs with no surrounding speech need
no marker.

**Marker-aware double-speak check** (`check_speech_placement`, four
failure modes — all `severity: 'error'`, `autofixable: false`):

| # | Trigger | Failure |
|---|---|---|
| (a) | `dsl_inline` + `messages[d].success.<primary>` non-empty | DOUBLE-SPEAK |
| (b) | `dsl_inline` + no SAY adjacent to USE `<a>` in any scenario | SILENT-WHEN-SPEAK-EXPECTED |
| (c) | `action_message` + `messages[d].success.<primary>` is the literal `[<LANG>_UNTRANSLATED]` placeholder | MISSING-ACTION-MESSAGE |
| (d) | `action_message` + SAY adjacent to USE `<a>` in any scenario | DOUBLE-SPEAK |

Mode (c) specifically detects the UNTRANSLATED placeholder — not empty
string. Empty string under Pattern A is the MaybeSilent sentinel for
intentional silence. "Adjacent" is the ±200-character window heuristic
in `core/validatorRunner.js#hasAdjacentSay`.

## Invariant #9 — Transcribe-first scenario design

`scenarioDesign` decides per case:

- **`intake.cases[n].objective` non-empty** → **TRANSCRIBE**. Render the
  brief's literal flow into valid DSL syntax. Do not paraphrase,
  consolidate, or invent.
- **`intake.cases[n].objective` empty** → **AUTHOR** using
  `cases[n].intent` and the DSL ruleset
  ([[ivr-objective-dsl-ruleset]]). Invention is allowed only here.

See [[ivr-objective-dsl-ruleset]] Parts 1–3 for DSL syntax and per-type
structure.
