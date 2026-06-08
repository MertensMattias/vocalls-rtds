# camelCase key migration — RTDS import/export contract

**Date:** 2026-06-08
**Status:** Design approved, pending spec review

## Problem

The RTDS import/export JSON contract uses mixed casing. This is not random — it is a
deliberate two-contract split, documented in
[conventions/casing.md](../../../conventions/casing.md) and
[callflow_json_config_vocalls/MIGRATION_REPORT.md](../../../callflow_json_config_vocalls/MIGRATION_REPORT.md):

| Layer | Today | Where |
| --- | --- | --- |
| Envelope keys, **import side** (request body → SQL importer) | **PascalCase** (`SourceId`, `Operations`, `Id`, `Type`, `Params`, `IsFirstOperation`) | `insert_flow_on_sourceId.sql` (`$.SourceId`…), `DA-HELPDESK.json`, `callflow_json_config_vocalls/*.json` |
| Envelope keys, **runtime side** (fetched table → `parseFlow`) | **camelCase** (`sourceId`, `operations`, `op.id`, `op.params`) | `rtds_2_runtime.js`, swagger *response* schemas |
| **Param names** (inside `params{}`) | **PascalCase by convention**, read case-insensitively (`NextStep_Success`, `SmsAccountId`, `Active`) | SQL dictionary seed, JSON files, components, runtime twins |

Part of the stack (runtime `parseFlow` + swagger response) is already camelCase. The goal is
to converge the **entire** import/export contract on camelCase: envelope keys **and** every
Param name, so the pipeline `JSON file → importer → DB → fetch → runtime` speaks one casing
end to end.

## Goal

Full end-to-end camelCase for the RTDS import/export contract — **keys only**.

- **Depth:** envelope keys + every Param name + operation `Type` values.
- **Reset assumption:** the RTDS database and seed files are being fully reset. No
  backward compatibility, dual-read shims, or DB-row migration scripts are needed.
- **Ownership split:** the SQL importer (`insert_flow_on_sourceId.sql` logic) and the
  dictionary seed (`seed_operations_vocalls_dictionary.sql`) are being rewritten by
  **another team**. This work must converge on the **same** camelCase contract so the JSON
  files produced here still import cleanly. We align *to* that contract; we do not own it.

### Decisions locked during brainstorming

1. **Scope depth:** envelope keys **and** Param names (full end-to-end camelCase).
2. **Transform:** *mechanical lowercasing*, "lower leading acronym run" rule (see below).
   No semantic renaming of keys.
3. **Type names:** apply the same casing transform, **keep** the `_vocalls` suffix.
   (`SetVariables_vocalls → setVariables_vocalls`.) Suffix removal is explicitly a
   separate, later concern.
4. **Value tokens** (`${rtEmailTo}`, `$(rtSmsBody)`, varObj/global names): **untouched.**
   This is strictly a JSON-key migration.
5. **Approach:** codemod script for data + hand-edit for code literals + regenerate for the
   skill bundle, with a printed mapping table as the up-front review gate.
6. **In-place, not a copy.** The original ask mentioned copying `projects/rtds-runtime/`.
   We instead migrate in place on a feature branch: the repo treats `projects/rtds-runtime/`
   as the single committed reference runtime, and git history is the fallback. (Direction
   change from the original request, recorded here explicitly.)

## Transform rule

One deterministic function, `camelCaseKey(key)`, applied **to JSON object keys only** —
never to values, never to free text.

**Algorithm — "lower leading acronym run":**

1. **Underscore-segmented keys** (`NextStep_Success`, `NextStep_Guard_ICT`,
   `PromptActivate_NL`): split on `_`, transform the **first segment only**, rejoin with `_`.
   → `nextStep_Success`, `nextStep_Guard_ICT`, `promptActivate_NL`.
2. **Per segment:** lowercase the leading run of consecutive capitals, but if that run is
   immediately followed by a lowercase letter, leave the **last** capital of the run as the
   start of the next word.
3. **`Type` values:** apply step 2 to the part before `_vocalls`; preserve the suffix.

**Golden examples (confirmed):**

| Input | Output | Note |
| --- | --- | --- |
| `SourceId` | `sourceId` | |
| `Operations` | `operations` | |
| `Params` | `params` | |
| `IsFirstOperation` | `isFirstOperation` | |
| `NextStep_Success` | `nextStep_Success` | first segment only |
| `NextStep_Guard_ICT` | `nextStep_Guard_ICT` | first segment only |
| `PromptActivate_NL` | `promptActivate_NL` | first segment only |
| `IVREvent` | `ivrEvent` | leading acronym run, last cap starts next word |
| `IVRAction` | `ivrAction` | |
| `CC` | `cc` | pure acronym |
| `ANIConfirmation` | `aniConfirmation` | |
| `SmsAccountId` | `smsAccountId` | |
| `OutboundANI` | `outboundANI` | **trailing** acronym untouched |
| `SetVariables_vocalls` | `setVariables_vocalls` | type, suffix preserved |
| `Guard_vocalls` | `guard_vocalls` | |

The acronym rule has genuine edge cases (`OutboundANI`, `IVREvent`). The codemod's first run
prints the full key→key and type→type mapping table so a wrong call is caught **before**
anything is written, and so the SQL team can diff against the exact same table.

## Scope — three tiers

### Tier A — Data (the JSON contract itself)

Pure data; the codemod rewrites keys mechanically:

- 8 × `callflow_json_config_vocalls/*.json`
- `rtds/samples/DA-HELPDESK.json`
- the embedded `@JsonPayload` sample literal inside `rtds/db_seed/insert_flow_on_sourceId.sql`
  *(the importer logic is the SQL team's; we touch only the illustrative payload so it does
  not contradict the new contract — flagged, not silently assumed)*

### Tier B — Code that names those keys as string literals

Functionally these still work (reads are case-insensitive via `getParam`/`getValue`), but the
literals must match the data so the code is honest and future greps don't lie:

- `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` — envelope reads already
  camelCase; ~40 `getParam(op, "…")` literals, the `executeXxx` twin param strings, and the
  `registerRtdsOperation`/`registerRtdsExit('…_vocalls')` registry keys
- 6 components — `getValue(__rtParams, '…')` literals **and** the master-attribute `Name=`
  strings in the mxGraph XML (operator-facing Param names):
  `rtds/components/sendSms.js`, `sendMail.js`, `setVariables.js`, `guardTui.js`,
  `guardRouting.js`, `checkSchedule.js`
- `cli/simulate-flow.js`

### Tier C — Docs / specs / generated artifacts

Describe the contract; must not contradict it:

- `conventions/casing.md` + `PROJECT_CONVENTIONS.md` — rewrite the "Param names are PascalCase
  by convention" rule to "camelCase"; bump the version line
- 7 × `rtds/specs/*.spec.md`
- `rtds/docs/*` — `runtime-spec.md`, `operations-catalog.md`, `runtime-architecture.md`,
  `logging-design.md`
- `rtds/api_swagger/*.json` — the **request-body** schemas (the response is already camelCase)
- tests under `projects/rtds-runtime/tests/`
- the skill bundle `.claude/skills/rtds-vocalls-component-gen/` — **regenerated, never
  hand-edited** (`npm run build:skill`)

### Explicitly out of scope

- The SQL importer **logic** and the dictionary **seed** (SQL team owns — we align *to* them).
- Value tokens (`${rtEmailTo}` etc.) and any runtime varObj/global names.
- `_vocalls` suffix removal.

## Execution flow & ordering

Each step is verifiable before the next.

1. **Write the codemod** (`scripts/camelcase_keys.py`): the `camelCaseKey` function + a
   JSON-walker that rewrites keys only (preserving key order, indentation, UTF-8). First run
   is `--dry-run --print-mapping`: emits the full distinct key→key and type→type table. **This
   table is reviewed and shared with the SQL team before anything is written** — it is the
   golden artifact / contract.
2. **Apply to Tier A.** Run the codemod over the 9 JSON files + the embedded SQL sample. Byte
   stable except keys.
3. **Verify Tier A in isolation:** well-formed JSON, no duplicate keys, every `nextStep*` value
   resolves to a real `id` in its flow, every param key present in the (camelCase) dictionary
   contract. Reuses the validation the MIGRATION_REPORT already describes.
4. **Update Tier B** by hand, guided by the step-1 mapping table (not a blind codemod — these
   sit inside JS-in-XML and need care with `&apos;` encoding per
   [conventions/encoding.md](../../../conventions/encoding.md)).
5. **Regenerate** catalog + skill bundle (`npm run gen:catalog`, `npm run build:skill`). Never
   hand-edit generated output.
6. **Update Tier C** docs (conventions, specs, swagger request schemas).
7. **Golden verification gate:** `npm run check` (lockstep + conventions), then `npm test`
   (Jest). `scripts/check_lockstep.py` verifies param-name parity across component/spec/seed and
   fails loudly if any tier drifted.

**Error handling / rollback:** in-place on a feature branch; git is the fallback. If the golden
mapping table reveals an acronym call we disagree with, fix the rule in step 1 and re-run —
nothing downstream has happened yet.

## Cross-team dependency

The single thing this migration cannot unilaterally finalize: the camelCase keys must match
byte-for-byte what the SQL team's rewritten importer + dictionary accept. The acronym edge cases
(`outboundANI`, `ivrEvent`, `aniConfirmation`) are exactly where two independent "camelCase it"
efforts silently diverge.

How the design neutralizes it:

- The **step-1 mapping table is shared with the SQL team as the contract** before Tier A is
  applied. Not "both sides camelCase independently and hope" — "this table is the spec; build
  the importer/dictionary to it."
- If they have already frozen a different rule, the table surfaces the conflict immediately and
  we adjust the single `camelCaseKey` function.
- `npm run check:lockstep` verifies parity **within this repo**. Cross-system parity is verified
  at **import time** (`UNKNOWN_PARAM` 54016 / `UNKNOWN_OPERATION_TYPE` 54015 throw on mismatch).

## Acceptance criteria ("done")

1. All migrated JSON files import into the freshly-reset DB with **no** `UNKNOWN_PARAM` /
   `UNKNOWN_OPERATION_TYPE` errors.
2. The runtime fetches and dispatches the migrated flows (camelCase envelope already supported
   by `parseFlow`).
3. `npm run check` passes (lockstep + conventions).
4. `npm test` passes (Jest).
5. The step-1 mapping table is committed as the shared contract artifact.
6. No PascalCase key remains in the import/export contract surface (verified by grep over Tier A
   + the Param-name literals in Tier B).
