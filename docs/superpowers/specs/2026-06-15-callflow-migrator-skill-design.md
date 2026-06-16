# Callflow migrator skill — legacy PureConnect JSON → camelCase RTDS, seed-synced

Date: 2026-06-15
Status: design (approved pending spec review)

## Context

The repo migrated 10 callflow configs from the legacy **PureConnect** JSON schema
(`callflow_json_config/` — UTF-16, PascalCase keys, `$(ATTR_*)` tokens, array-with-UI-flags
param values) to the new **camelCase RTDS routing-table contract**
(`callflow_json_config_vocalls_acc/` + `_prd/`, UTF-8) consumed by
[`import_flow_from_json_camelCase.sql`](../../../rtds/db_seed/import_flow_from_json_camelCase.sql)
and validated against the dictionary seed
[`import_seeds_camelCase.sql`](../../../rtds/db_seed/import_seeds_camelCase.sql). That migration
was done by hand and documented in
[`callflow_json_config_vocalls_acc/MIGRATION_REPORT.md`](../../../callflow_json_config_vocalls_acc/MIGRATION_REPORT.md).

The user wants this repeatable as an **agent skill**: hand it any old PureConnect config, get the
new camelCase config out. Critically, the new contract is defined by the **seed dictionary** — an
unknown param key throws `UNKNOWN_PARAM (54016)` at import — so the skill must stay in lockstep with
`import_seeds_camelCase.sql` as operation types and params evolve. The existing
`rtds-vocalls-component-gen` skill already solves "keep a skill bundle in sync with repo sources" via
a generator (`build:skill`) + drift check (`check:sync`) + pre-commit gate; this design reuses that
pattern.

### Decisions captured from brainstorming
- **Input** = full legacy PureConnect migration (not the lighter PascalCase-only key codemod).
- **Self-update** = generated dictionary artifact + sync-check (the repo pattern), not live SQL parsing.
- **Judgment calls** = convert best-effort **and** emit a per-file report flagging every risky decision.
- **Validation** = full importer-rule validation against the dictionary before claiming success.

## Architecture

Three decoupled units:

### 1. Generator — `scripts/gen_migration_dictionary.py`
Parses `rtds/db_seed/import_seeds_camelCase.sql` into a bundled, machine-readable
`dictionary.json`. Reuses and extends the proven regex from
[`check_lockstep.py`](../../../scripts/check_lockstep.py) `seed_param_names_by_optype()` to capture,
per operation type: param name, data type (`bit`/`int`/`string`), `IsRequired`, and `IsNext`
(branch-key) flags. Also extracts the `Dic_OperationType` name list and `Dic_PromptApplication` ids
(for `applicationId`/`UNKNOWN_APPLICATION` checks).

**Declaration order is load-bearing.** The hand-migrated outputs (and the SQL exporter
`export_flow_to_json_camelCase.sql`) emit params in the **seed's `Dic_Attribute` declaration order**,
not the legacy input order and not alphabetical — verified against
`callflow_json_config_vocalls_prd/DIGIPOLIS_DA_KLANTWACHT_GUARD_PRD.json` (guard params come out
`active, configId, configName, dialGuard, outboundANI, diversion, onHoldAudioUrl, timeout,
recordVoicemail, acceptCallMenu, acceptCallMessage, sendSms, sendMail, nextStep_Success,
nextStep_Failure, nextStep` — exactly the dict rows, branch keys grouped last, bare `nextStep` final).
The generator must therefore preserve the SQL row order, and `dictionary.json` must use an **ordered**
representation (an array of attribute objects, not a plain object — Python `dict` insertion order is
preserved on round-trip, but an explicit array is unambiguous for downstream consumers).

Output shape (sketch — `attributes[type]` is an **ordered array**):
```json
{
  "generatedFrom": "rtds/db_seed/import_seeds_camelCase.sql",
  "operationTypes": ["setVariables", "guard", "sendMail", "sendSms", "..."],
  "promptApplicationIds": [11, 12, 13, 14, 15],
  "attributes": {
    "guard": [
      { "name": "active",           "type": "bit",    "required": true,  "branch": false },
      { "name": "configId",         "type": "int",    "required": true,  "branch": false },
      { "name": "nextStep_Success", "type": "string", "required": true,  "branch": true  },
      { "name": "nextStep",         "type": "string", "required": true,  "branch": true  }
    ]
  }
}
```
Wired as `npm run gen:migration-dict`, and **folded into the existing `build:skill` chain** so a
single `npm run build:skill` refreshes the component-gen bundle *and* this dictionary.

### 2. Sync-check
Extend `scripts/check_skill_sync.py` to regenerate `dictionary.json` in memory and fail if the
committed copy drifted (newline-insensitive compare, same as the existing manifest checks). This is
already chained into `npm run check` (`check:sync && check:lockstep && npm test`) and the pre-commit
hook, so the bundled dictionary **cannot silently fall behind the seeds**.

### 3. Skill bundle — `.claude/skills/rtds-callflow-migrator/`
```
rtds-callflow-migrator/
├── SKILL.md                          # trigger description + workflow
├── references/
│   ├── migration-rules.md            # transform rules (distilled from MIGRATION_REPORT.md)
│   ├── dictionary.json               # GENERATED — the seed contract (do not hand-edit)
│   └── migration-report-template.md  # per-file report skeleton
└── (no scripts of its own; conversion is the agent reading rules + dictionary)
```

`SKILL.md` description is written "pushy" for triggering: fires on "convert/migrate this callflow
config", "old config to new format", references to `callflow_json_config/`, PureConnect JSON, or the
PascalCase→camelCase callflow contract.

## Conversion workflow (per file, in `SKILL.md`)

1. **Read** — handle UTF-16 BOM input, parse JSON.
2. **Envelope + keys → camelCase** — `SourceId→sourceId`, etc. (the "lower leading acronym run" rule
   already implemented in `scripts/camelcase_keys.py` `_camel_segment`; first underscore segment only).
3. **Type rename** — `SetAttributes→setVariables`, `SendEmail→sendMail`, `SendSMS→sendSms`,
   `GuardRouting→guard`, `PlayPrompt→say`, … (full table in `migration-rules.md`); strip any
   `_vocalls` suffix.
4. **Param remap + value transforms** — per-type, from MIGRATION_REPORT.md §4: e.g.
   `OnHoldAudio→onHoldAudioUrl`, `CC→cc`, `Importance:"Normal"→priority:2`, `Attachment→files`,
   `ConfigId→smsAccountId` (sendSms); array `[value,"isDisplayed","isEditable"]`→scalar `value`;
   `bit`→boolean, `int`→number; tokens `$(ATTR_EmailTo)→${rtEmailTo}`.
5. **Judgment calls (best-effort, all flagged)** — split `routingId` on first `_` →
   `customerName`/`customerProject` on the first op; drop un-dictionaried keys (`CallflowId`,
   `DialGroup`, `LogAttributes`); add dict-required-but-absent params with safe defaults
   (`outboundANI:""`, `acceptCallMessage`, `timeout`); repair dangling `nextStep*` targets; keep
   placeholders (`onHoldAudioUrl` legacy NAME) verbatim and flag.
6. **Validate against `dictionary.json`** (mirrors `import_flow_from_json_camelCase.sql`):
   `UNKNOWN_PARAM` (every key in dict for its type), `TYPE_MISMATCH` (value conforms to dict type),
   `INVALID_NEXTSTEP` (every branch target resolves to an op id in the same flow), `UNKNOWN_APPLICATION`
   (`applicationId` ∈ promptApplicationIds). **Do not claim success if any fail.**
7. **Reorder to canonical declaration order** — emit each op's `params` in the dictionary's
   `Dic_Attribute` order (branch keys grouped last, bare `nextStep` final); emit the envelope keys in
   the fixed contract order (`sourceId, name, projectId, project, promptLibraryId, promptLibrary,
   supportedLanguages, operations`) and per-op keys as `id, type, name, isFirstOperation, params`.
   Legacy input order is **discarded** — this is what makes the output diff-clean against an
   import→export round-trip. Any param present after transform but absent from the dict for that type
   surfaces in step 6 as `UNKNOWN_PARAM` rather than being silently appended.
8. **Write** UTF-8 JSON, shaped like
   [`rtds/samples/n-allo_reception.json`](../../../rtds/samples/n-allo_reception.json).
9. **Emit per-file migration report** — every dropped key, invented value, repaired target, and
   placeholder needing human confirmation (template bundled). Mirrors MIGRATION_REPORT.md style.

## Reuse
- Seed-parse regex: `scripts/check_lockstep.py` `seed_param_names_by_optype()`.
- camelCase key rule: `scripts/camelcase_keys.py` `_camel_segment` / `camel_case_key` / `camel_case_type`.
- Bundle/sync/gate machinery: `build_skill_bundle.py`, `check_skill_sync.py`, pre-commit hook.
- Rules source-of-truth: `callflow_json_config_vocalls_acc/MIGRATION_REPORT.md`.
- Golden output shape: `rtds/samples/n-allo_reception.json`.

## Relationship to existing skills
Distinct from `rtds-vocalls-component-gen` (generates mxGraph **component** XML for one operation)
and `vocalls-handler-spec` (writes operation **specs**). This skill operates on whole **callflow
config JSON documents** (envelope + operations array), converting legacy→new. The trigger
description must be scoped tightly to callflow-config conversion so it does not compete with the
component-gen skill.

## Out of scope
- Loading configs into the DB (the SQL importer does that).
- Runtime wiring of catalogued-but-unregistered types (`condition`/`emergency`/`checkSchedule`/`flowJump`).
- `Dic_CompanyProject` seeding (precondition the importer needs, not produced here).

## Verification
- `npm run gen:migration-dict` produces `dictionary.json`; `npm run check:sync` passes; deliberately
  edit the committed `dictionary.json` and confirm `check:sync` fails (drift guard works).
- Round-trip: run the skill on a legacy file in `callflow_json_config/` and diff the output against
  the hand-migrated sibling in `callflow_json_config_vocalls_prd/` — should match modulo documented
  judgment calls.
- Negative: feed a config with a bogus param/type/nextStep and confirm the skill reports the
  matching `UNKNOWN_PARAM`/`TYPE_MISMATCH`/`INVALID_NEXTSTEP` and refuses success.
- Seed-evolution: add a param row to `import_seeds_camelCase.sql`, regenerate, confirm it appears in
  `dictionary.json` and the skill now accepts that param.
