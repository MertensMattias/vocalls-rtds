# shared constants

> AUTO-GENERATED from `core/schema/shared.js` via `npm run schema:docs`. Do not edit.

## SYSTEM_ACTION_SYNONYMS

Confident-synonym rules used by the `vocalls-brief` skill (Phase 2.6) and the
`vocalls-intake` agent to canonicalize non-SYSTEM_ACTION names to one of the
three SYSTEM_ACTIONs (`transfer_to_agent`, `escalate_to_agent`, `end_conversation`).

| Source name | Canonical SYSTEM_ACTION |
|---|---|
| `transfer_to_operator` | `transfer_to_agent` |
| `transfer_to_human` | `transfer_to_agent` |
| `transfer_to_csr` | `transfer_to_agent` |
| `escalate_to_operator` | `escalate_to_agent` |
| `escalate_to_human` | `escalate_to_agent` |
