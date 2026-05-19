# Speech-Placement Classification (Phase 2.7)

Reference for the `vocalls-brief` skill — extracted from SKILL.md.

## Purpose

After action vocabulary is settled, scan the extraction for every
`(action, disposition)` pair that carries customer-facing speech and ask
the user where that speech should live in the final config. The intake
agent (Stage 1) reads the resulting markers and propagates the decision to
the scenario-designer and config-builder via `intake.speechPlacements`.

## Two valid patterns

The same speech content can live in either of two structurally valid
positions in the assembled `AGENT_*.js`:

- **Pattern A — `action_message`.** Speech lives in
  `actions.<action>.messages.<disposition>.success.<lang>`. The runtime
  fires the action, then speaks the per-disposition message. The scenario
  DSL stays terse: just `USE <action>(disposition: ...)`. Best for fixed
  acknowledgments that always play when this disposition succeeds. This is
  the pattern the gold-standard `.claude/CONFIG_PRIMARY.js` uses for
  `send_email_inform_customer` (see
  `.claude/CONFIG_PRIMARY.js:886-991`).

- **Pattern B — `dsl_inline`.** Speech lives inline in the scenario DSL as
  a `SAY` step adjacent to the `USE`. The runtime speaks the SAY from the
  DSL, then fires the action silently (per-disposition `messages` slots
  empty). Best when the speech has conditional logic (nested
  `IF / INFORM`), `{{token}}` runtime references, or position-specific
  framing that the action-message slot cannot express.

The two patterns are NEVER mixed for the same `(action, disposition)` pair
— that produces double-speaking at runtime, which the validator (Mode-4)
hard-fails on.

## Scan for speech-bearing pairs

For each tool / action in the extraction, identify every disposition that
carries customer-facing speech. Speech sources include:

- Verbatim `SAY:` lines adjacent to `USE: <action>` inside
  `cases[*].objectiveLine`.
- `cases[*].refinements[]` that describe a customer-facing message tied to
  an action outcome.
- `tools[*].successMsg` / `tools[*].failureMsg` when populated with
  customer-facing speech (not a terse status string).
- Per-disposition messages in
  `cdbLogs.perCase[*].perAction.<tool>.<disposition>` when the extraction
  captured them.

If the brief has no customer-facing speech around an action (the SAY
NOTHING pattern, bare USE, or SYSTEM_ACTION terse status), no marker is
needed and no question is asked.

## Classify each pair into a recommendation

For each `(action, disposition)` pair carrying speech:

- **(B) recommended — `dsl_inline`.** Speech contains:
  - conditional logic (nested IF/INFORM/ELSE), OR
  - `{{token}}` references that depend on runtime state (e.g.,
    `{{openAmount}}`, `{{partnerName}}`), OR
  - position-specific framing (the speech is a pre-USE narration or a
    post-USE confirmation that depends on the surrounding DSL flow).
- **(A) recommended — `action_message`.** Speech is a single unconditional
  message per disposition with no runtime tokens.
- **Neutral — no recommendation.** Neither rule clearly applies. Present
  both options.

## Ask one question per pair

```
=== Speech Placement Check ===

Case M — action: create_or_modify_mandate (disposition: REACTIVATE)

Customer-facing speech tied to this action's success:
  "Your direct debit has been reactivated. Your next invoice will be
   presented automatically via direct debit."

  + conditional INFORM when {openAmount} > 0:
  "Your currently outstanding balances will be presented automatically
   via direct debit on the scheduled due date..."

Where should this speech live?
  (A) action_message — in actions.create_or_modify_mandate.messages.REACTIVATE.success
      Runtime: USE the action, then speak the message.
      DSL stays terse.
  (B) dsl_inline (recommended) — inline in the scenario DSL as a post-USE SAY step
      Runtime: USE the action, DSL speaks the SAY, then continues.
      Action messages stay empty.
      Recommended because: this speech contains conditional logic ({openAmount} > 0).
```

## Apply choices

For each pair + user choice, record the decision in a staging map. For
`action_message` decisions, ALSO capture the speech text the user is
committing to that pattern — Pattern A needs both the marker AND the text
(PT-0007). The text comes from the speech sample shown in the question
prompt (the verbatim brief content the speech-placement scan extracted);
the user does not type a new text, the skill carries the extracted text
forward. For `dsl_inline` decisions no text is staged — the scenario-
designer reads the speech directly from the verbatim
`intake.cases.<n>.objective` block.

```
placementDecisions = {
  "create_or_modify_mandate": {
    "REACTIVATE": { marker: "dsl_inline" }
  },
  "send_email_inform_customer": {
    "create_change_intervention": {
      marker: "action_message",
      text: "Wij sturen u een bevestigingsmail."
    },
    "cancel_contract": {
      marker: "action_message",
      text: "Wij sturen u een annuleringsmail."
    }
  },
  "notify_billing": {
    "success": { marker: "dsl_inline" }   // generic-fallback disposition from priority chain
  }
}
```

## Disposition naming

Derive disposition names using the SAME 4-step priority chain that the
intake agent applies when parsing `cdbLogMap`. This keeps the marker keys
aligned with the cdbLogMap keys downstream — otherwise the speech-placement
marker for `<action>.success` won't match the cdbLogMap entry the intake
agent writes for the same USE.

The chain is documented as the single source of truth in
`.claude/agents/vocalls-intake.md` → "What you write — Verbatim brief-content
fields → `cdbLogMap`" (steps 1–4). Use it verbatim here.

Do NOT use the literal string `"default"` as a fallback disposition. That
key has a separate meaning in the assembled config (`messages.default`
holds the action's fallback message) and would collide with intake's
priority-chain output.

## Markers emitted by Phase 3

### Placement marker (every classified pair)

```html
<!-- BRIEF: action "<name>" disposition "<value>" — speech-placement: dsl_inline | action_message (confirmed by user on YYYY-MM-DD) -->
```

One comment per `(action, disposition)` pair the user classified. Use the
disposition name from the staging map — derived via the priority chain
above. The em dash (`—`) is required literally.

### Speech-text marker (`action_message` decisions only — PT-0007)

For every pair whose marker is `action_message`, emit a SECOND comment
carrying the speech text verbatim:

```html
<!-- BRIEF: action_message "<name>" disposition "<value>" — "<speech text in primary language>" (confirmed by user on YYYY-MM-DD) -->
```

The text comes from `placementDecisions[<action>][<disposition>].text`
(captured during Phase 2.7's classification). Quoting rules:

- The speech text is wrapped in straight double quotes (`"…"`).
- A literal `"` inside the text is escaped as `\"`.
- A literal `\` inside the text is escaped as `\\`.
- Newlines inside the text are encoded as `\n` (literal backslash + n) so
  the marker stays on one line.
- Empty string is allowed and means "intentional silence under Pattern A"
  — the runtime fires the action and says nothing. Render as `""` between
  the em dashes.

The intake agent (Stage 1) parses these speech-text markers into
`state.intake.actionMessages[<action>][<disposition>]`. The config-builder
copies the value verbatim into
`actions.<action>.messages.<disposition>.success.<primaryLanguage>`. The
translator fills the other-language slots later.

Do NOT emit a speech-text marker for `dsl_inline` decisions — those carry
no Pattern A text. The scenario-designer transcribes their speech from the
verbatim `intake.cases.<n>.objective` directly.
