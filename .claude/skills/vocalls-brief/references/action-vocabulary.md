# Action Vocabulary Classification (Phase 2.6)

Reference for the `vocalls-brief` skill — extracted from SKILL.md.

## Purpose

Before writing `brief.md`, resolve every non-canonical action name the user
will see in the file. The intake agent (Stage 1) expects each action name in
`**Tools**:`, `**Objective**:` USE statements, and `**CDB log**:` rows to be
either:

- a SYSTEM_ACTION — `transfer_to_agent`, `escalate_to_agent`,
  `end_conversation` (no question needed); or
- canonicalized to a SYSTEM_ACTION via a confident-synonym rule; or
- explicitly confirmed as a custom action via a marker comment in
  `brief.md`.

This phase asks the user one question per unique non-canonical action name
and writes a marker for every "custom" decision.

## Scan extraction for action names

Build the unique set of non-canonical action names referenced anywhere in
the extraction object: `tools[*].name`, every USE statement inside
`cases[*].objectiveLine`, every `cases[*].toolRefs[]`, every key in
`cdbLogs.perCase[*].perAction`. Exclude SYSTEM_ACTIONS (`transfer_to_agent`,
`escalate_to_agent`, `end_conversation`). Carry the occurrence count and the
list of cases each name appears in.

## Classify each name into a recommendation mode

For each unique non-canonical name, classify by three recommendation modes
(the question is always asked; the recommendation reduces friction for the
dominant case but never removes user choice):

- **(A) recommended — obvious synonym.** Name matches a confident-synonym
  rule. Recommendation is to canonicalize. The full mapping table is the
  single source of truth in `core/schema/shared.js` → `SYSTEM_ACTION_SYNONYMS`
  (rendered in `docs/schema/shared.md`).

- **(B) recommended — clearly domain-specific.** Name fits no SYSTEM_ACTION
  synonym pattern AND clearly describes a non-routing action (sending an
  email, creating a record, etc.). Recommendation is to keep as custom.
  Examples: `send_email_inform_customer`, `notify_billing`,
  `create_or_modify_mandate`, `new_direct_debit`, `inform_customer`.

- **Neutral — both plausible.** Name could be either a routing synonym OR a
  distinct queue. Present both options without recommendation. Example:
  `escalate_to_backoffice` (could be a synonym for `escalate_to_agent`, OR
  a distinct backoffice queue with its own destination).

## Ask one question per unique name

For each name, surface the question in chat using the same blocking-question
pattern as Phase 2 Q&A. Show occurrence count and the cases where it
appears. Always present both options; show the recommendation suffix
("(recommended)") only for modes (A) and (B):

```
=== Action Vocabulary Check ===

Found action name "transfer_to_operator" (4 occurrences in cases 2, 4, 5, 7)
  (A) Canonical (recommended) — rename to: transfer_to_agent
  (B) Custom action — keep as: transfer_to_operator (you will need to define it)

Found action name "send_email_inform_customer" (1 occurrence in case M)
  (A) Canonical — rename to: <no plausible SYSTEM_ACTION mapping>
  (B) Custom action (recommended) — keep as: send_email_inform_customer

Found action name "escalate_to_backoffice" (1 occurrence in case 17)
  (A) Canonical — rename to: escalate_to_agent
  (B) Custom action — keep as: escalate_to_backoffice (you will need to define it)
```

Group all questions in a single batch when possible. Each unique name
counts as exactly one question regardless of how many cases use it — apply
the user's choice across ALL occurrences (Tools, Objective, CDB log) in the
extraction object before writing brief.md.

## Apply choices to the extraction object

For each name + user choice:

- **Choice (A) — canonicalize.** Rewrite every occurrence in the extraction
  object: `tools[*].name`, every USE in `cases[*].objectiveLine`, every
  entry in `cases[*].toolRefs[]`, every key in
  `cdbLogs.perCase[*].perAction`. No marker is written — the canonical
  name carries its own meaning.
- **Choice (B) — custom.** Leave every occurrence unchanged. Stage a marker
  for Phase 3 to write at the end of `brief.md` (collected in the
  "Markers" section).

## Question budget

These vocabulary questions are independent of the 15-question Phase 2 cap.
A brief with many synonyms still produces only one question per *unique*
name, so the worst case is bounded by the action surface, not the case
count.

## Marker emitted by Phase 3

For each Phase 2.6 "custom action" decision (choice B) Phase 3 writes:

```html
<!-- BRIEF: custom action "<name>" confirmed by user on YYYY-MM-DD -->
```

One comment per confirmed custom action. Do NOT write a marker for
canonicalized names (choice A) — those already lost their original spelling
when Phase 2.6 rewrote the extraction object.
