---
name: rtds-callflow-migrator
description: Convert a legacy PureConnect callflow config JSON into the new camelCase RTDS routing-table contract, validate it against the seed dictionary, and emit a per-file migration report. Use whenever the user asks to migrate, convert, port, or upgrade an old callflow config to the new format; points at a file in callflow_json_config/ or any UTF-16 / PascalCase PureConnect callflow JSON (keys like SourceId, Operations, Params; Types like SetAttributes, GuardRouting, SendEmail, SendSMS, PlayPrompt; tokens like $(ATTR_EmailTo)); or mentions the callflow camelCase contract, import_seeds_camelCase.sql, or the callflow MIGRATION_REPORT. Operates on whole callflow config DOCUMENTS (envelope + operations array) — NOT single Vocalls component XML (use rtds-vocalls-component-gen for that) and NOT operation specs (use vocalls-handler-spec).
---

# RTDS Callflow Migrator

Converts a **legacy PureConnect callflow config** (UTF-16, PascalCase, `$(ATTR_*)`
tokens, array-with-UI-flags param values) into the **new camelCase RTDS
routing-table contract** consumed by `import_flow_from_json_camelCase.sql` and
validated against the seed dictionary `import_seeds_camelCase.sql`.

**Golden output shape:** `rtds/samples/n-allo_reception.json` (and any file in
`callflow_json_config_vocalls_prd/`).

**Not for:** single Vocalls component mxGraph XML (→ `rtds-vocalls-component-gen`);
operation specs (→ `vocalls-handler-spec`); loading JSON into the DB (the SQL
importer does that).

---

## The contract is the seed dictionary

The new format is *defined* by `references/dictionary.json`, generated from
`rtds/db_seed/import_seeds_camelCase.sql`. An unknown param key throws
`UNKNOWN_PARAM (54016)` at import, so **every output key must exist in the
dictionary for its operation type.** The dictionary gives you, per type:

- the allowed param names, **in canonical declaration order** (order is
  load-bearing — see step 7),
- each param's data `type` (`bit`/`int`/`string`), `required`, and `branch`
  (whether it is a `nextStep*` key),
- the valid `operationTypes` and `promptApplicationIds`.

Always read `references/dictionary.json` before converting — it is the current
truth, regenerated whenever the seeds change. Do not hard-code the param lists
from this doc; they are illustrative.

---

## Workflow (per file)

Read **[references/migration-rules.md](references/migration-rules.md)** for the
full transform tables. The pipeline:

1. **Read** — detect a UTF-16 BOM and decode accordingly; parse JSON.
2. **Envelope + keys → camelCase** — `SourceId→sourceId`, `Operations→operations`,
   per-op `Id/Type/Name/IsFirstOperation/Params`. Underscore keys transform the
   first segment only (`NextStep_Success→nextStep_Success`).
3. **Rename operation types** — `SetAttributes→setVariables`, `GuardRouting→guard`,
   `SendEmail→sendMail`, `SendSMS→sendSms`, `PlayPrompt→say`, … (table in
   migration-rules.md). Strip any `_vocalls` suffix. Every result must be in
   `dictionary.json.operationTypes`.
4. **Remap params + transform values** — per-type key renames
   (`OnHoldAudio→onHoldAudioUrl`, `CC→cc`, `Attachment→files`,
   `ConfigId→smsAccountId` on sendSms, …), `Importance:"Normal"→priority:2`,
   array `[value,"isDisplayed","isEditable"]`→scalar `value`, `bit`→boolean,
   `int`→number, tokens `$(ATTR_EmailTo)→${rtEmailTo}`.
5. **Apply judgment calls — and flag every one** (see migration-rules.md §
   "Judgment calls"): split `routingId` on the first `_` into
   `customerName`/`customerProject` on the first op; **drop** keys not in the
   dictionary (`CallflowId`, `DialGroup`, `LogAttributes`); add
   dictionary-required-but-absent params with safe defaults; repair dangling
   `nextStep*` targets; keep unresolved placeholders (e.g. a legacy
   `onHoldAudioUrl` NAME) verbatim. Each of these is a line in the report.
6. **Validate against `dictionary.json`** (mirrors the SQL importer):
   - `UNKNOWN_PARAM` — every param key exists in the dict for its type.
   - `TYPE_MISMATCH` — each value conforms to its dict `type`.
   - `INVALID_NEXTSTEP` — every `branch` value resolves to an op `id` in the flow.
   - `UNKNOWN_APPLICATION` — every `applicationId` ∈ `promptApplicationIds`.
   **Do not claim success while any check fails.** Fix or report and stop.
7. **Reorder to canonical declaration order** — emit each op's `params` in the
   dictionary's order for that type (branch keys grouped last, bare `nextStep`
   final); envelope keys as `sourceId, name, projectId, project, promptLibraryId,
   promptLibrary, supportedLanguages, operations`; per-op keys as `id, type,
   name, isFirstOperation, params`. Discard the legacy order — this is what makes
   the output diff-clean against an import→export round-trip.
8. **Write** UTF-8 JSON (2-space indent, trailing newline), shaped like
   `rtds/samples/n-allo_reception.json`.
9. **Emit the migration report** — fill
   [references/migration-report-template.md](references/migration-report-template.md):
   every dropped key, invented value, repaired target, and placeholder needing
   human confirmation, plus the referenced project names (the importer's
   `UNKNOWN_PROJECT` check needs those rows to pre-exist — out of this skill's scope).

---

## Output location

Unless the user says otherwise, write the converted file next to the new-format
siblings with the environment suffix the user names (`callflow_json_config_vocalls_acc/`
or `_prd/`), and print the report inline (offer to save it as `<name>.migration.md`).

## Keeping this skill current

`references/dictionary.json` is **generated** — never hand-edit it. When the seeds
change, run `npm run gen:migration-dict` (or `npm run build:skill`). `npm run
check:sync` (and the pre-commit hook) fails if the committed dictionary drifted
from `import_seeds_camelCase.sql`, so the skill cannot silently fall behind.
