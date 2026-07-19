---
name: rtds-callflow-migrator
description: Convert a legacy PureConnect callflow config JSON into a modernized camelCase RTDS routing-table config, validate it against the seed dictionary, and emit a per-file migration report. Use whenever the user asks to migrate, convert, port, modernize, or upgrade an old callflow config to the new format; points at a file in oldJsonConfig/ or any UTF-16 / PascalCase PureConnect callflow JSON (keys like SourceId, Operations, Params; Types like SetAttributes, GuardRouting, Condition, Emergency, WorkgroupTransfer, PlayPrompt, SendEmail, SendSMS; tokens like $(ATTR_EmailTo)); or mentions the callflow camelCase contract, import_seeds_camelCase.sql, or the callflow MIGRATION_REPORT. Operates on whole callflow config DOCUMENTS (envelope + operations array) — NOT single Vocalls component XML (use rtds-vocalls-component-gen) and NOT operation specs (use vocalls-handler-spec).
---

# RTDS Callflow Migrator

Converts a **legacy PureConnect callflow config** (UTF-16, PascalCase, `$(ATTR_*)`
tokens, retired op types) into a **modernized camelCase RTDS routing-table config**
that imports via `import_flow_from_json_camelCase.sql`, validates against the seed
dictionary `import_seeds_camelCase.sql`, and **behaves at runtime**.

**This is a modernization, not a mechanical 1:1 port.** PureConnect had operation
types the RTDS runtime retired — `Condition` (queue-statistics gating), `Emergency`,
`Callback`, `PlayAudio`, and the `GuardRouting`+`SendEmail`+`SendSMS` guard-notify
chain. They carry no component and are absent from the dictionary; emitting them
would fail the validation gate. So the migrator does what a human migrator did by
hand: it keeps the caller-meaningful spine, **drops or rewires** the retired
machinery, and **[ASK]s the user** for the handful of values the legacy document
cannot supply (queue extensions, guard numbers).

**Golden example (source → output):**
`oldJsonConfig/DIGIPOLIS_DA_HELDPESK_PRD.json` (41 ops) →
`jsonConfig/DA_HELPDESK_PRD_3233387777_V4.json` (17 ops). Read both side by side —
the output is the shape to reproduce.

**Sibling skill:** `rtds-flowdata-config-gen` produces the **same** modern contract
from a flow's mxGraph XML instead of a legacy JSON. Its
`references/target-contract.md` is the authority on the target *shapes* (op layout,
terminal block, exception unit, triplet form, `ttsMessages`) — consult it; this
skill reuses those shapes.

**Not for:** single Vocalls component mxGraph XML (→ `rtds-vocalls-component-gen`);
operation specs (→ `vocalls-handler-spec`); loading JSON into the DB (the SQL
importer does that).

---

## The contract is the seed dictionary

The output format is *defined* by `references/dictionary.json`, generated from
`rtds/db_seed/import_seeds_camelCase.sql`. An unknown param key throws
`UNKNOWN_PARAM (54016)` at import, so **every output key must exist in the dictionary
for its operation type.** The dictionary gives you, per type: allowed param names in
**canonical declaration order** (order is load-bearing — step 6), each param's data
`type` (`bit`/`int`/`string`), `required`, and `branch` (whether it is a `nextStep*`
key), plus the valid `operationTypes` and `promptApplicationIds`.

The **12 live types**: `setVariables, say, checkSchedule, menu, guardTui, guard,
disconnect, flowJump, sendSms, externalTransfer, internalTransfer, sendMail`.

Always read `references/dictionary.json` before converting — it is the current truth,
regenerated whenever the seeds change. Do not hard-code param lists from the docs.

---

## Workflow (per file)

Read **[references/migration-rules.md](references/migration-rules.md)** for the full
transform tables (renames, drops, rewires, value transforms, the [ASK] gate). The
pipeline:

1. **Read** — detect a UTF-16/UTF-8 BOM and decode accordingly; parse JSON.
2. **Envelope → camelCase** — `SourceId→sourceId` (keep the leading `+`),
   `Operations→operations`, per-op `Id/Type/Name/IsFirstOperation/Params`. Fixed
   output order: `sourceId, name, projectId, project, promptLibraryId, promptLibrary,
   supportedLanguages, operations`. `promptLibraryId` has no source — [ASK] or `""`.
3. **Classify every op** (migration-rules.md §3): **rename** the survivors
   (`SetAttributes→setVariables`, `PlayPrompt→say`, `Schedule→checkSchedule`,
   `ExternalTransfer→externalTransfer`, `Disconnect→disconnect`); **rewire**
   `WorkgroupTransfer→internalTransfer` (§4) and `GuardRouting→externalTransfer`
   (§3c); **drop + rewire** the retired types (`Condition`, `Emergency`, `Callback`,
   `PlayAudio`, guard-notify `SendEmail`/`SendSMS`), rewiring each dropped op's
   predecessor to the next surviving op. Every emitted `type` must be in
   `dictionary.json.operationTypes`.
4. **Remap params + transform values** (§5): per-type key renames, drop
   un-dictionaried keys (`QueueName`/`Skills`/`Priority`, `CallflowId`,
   `PerformCallAnalysis`, …), `bit→bool`, `int→number` (with case-fold like
   `ScheduleID→scheduleId`), tokens `$(ATTR_x)→${rt*}`. **Preserve the triplet form**
   `[value,"isDisplayed","isEditable"]` on `say.active/prompt` and transfer
   `target`/`phoneNumber` — do **not** collapse it. Put `say` text in the
   `ttsMessages` envelope sibling (§6), never in `params`.
5. **[ASK] gate — collect the gaps, then stop** (§7). The modernization introduces
   values the legacy document cannot supply: **queue→extension** for each
   `internalTransfer`, the **guard line number** for each rewired `GuardRouting`,
   the **promptLibraryId**, any **prompt-key rewrite** the target library needs, and
   any **ambiguous drop**. Present them as one numbered Q/A block and **wait for the
   user** before writing. Guessing a transfer target silently ships a broken flow, so
   this hard stop is the safety — an unattended run pauses here rather than inventing.
   Apply everything the source *does* contain directly; the gate is only for the gaps.
6. **Reorder to canonical order + fixed layout** — emit each op's `params` in the
   dictionary's order for its type (branch keys last, bare `nextStep` final). Number
   the main caller spine first, then the fixed terminal block (internalTransfer queue
   extensions → scheduler Cognos-Transfer + externalTransfer → guard units →
   exception unit → `disconnect`); ids ascend overall. See the golden target and
   target-contract.md's "Terminal block".
7. **Validate** — run the bundled validator (mirrors the SQL importer + the runtime
   smells):
   ```
   python .claude/skills/rtds-callflow-migrator/scripts/validate_config.py <output.json>
   ```
   It checks `UNKNOWN_PARAM`, `TYPE_MISMATCH`, `INVALID_NEXTSTEP`,
   `UNKNOWN_APPLICATION`, no retired types, ascending ids, single `isFirstOperation`,
   reachability, `nextStep` last, terminal disconnect, silent menus. **Fix every
   `[FAIL]`; each `[WARN]` is a report line.** Do not claim an import-ready file while
   any check fails — report and stop.
8. **Write** UTF-8 JSON (2-space indent, trailing newline), shaped like the golden
   target.
9. **Emit the migration report** — fill
   [references/migration-report-template.md](references/migration-report-template.md):
   every dropped op, rewire, invented/[ASK]ed value, repaired target, and placeholder
   needing human confirmation, plus the referenced project name(s) (the importer's
   `UNKNOWN_PROJECT` check needs those rows to pre-exist — out of this skill's scope).

---

## Output location

Unless the user says otherwise, write the converted file to `jsonConfig/` (the modern
config tree, alongside the golden target), naming it for the flow + environment the
source declares. Print the report inline (offer to save it as `<name>.migration.md`).

## Keeping this skill current

`references/dictionary.json` is **generated** — never hand-edit it. When the seeds
change, run `npm run gen:migration-dict` (or `npm run build:skill`). `npm run
check:sync` (and the pre-commit hook) fails if the committed dictionary drifted from
`import_seeds_camelCase.sql`, so the skill cannot silently fall behind. The bundled
`scripts/validate_config.py` reads the seed **live**, so it never drifts either.
