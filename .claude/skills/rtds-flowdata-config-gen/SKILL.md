---
name: rtds-flowdata-config-gen
description: Generate a modernized camelCase RTDS callflow JSON config (callflow_json_config/*.json) for a DA call script, from the live-flow metadata in flowData/ (DA_CALLFLOW_METADATA.xlsx + the flow's Vocalls Designer mxGraph XML). Collects messages/prompts, scheduleId/promptLibrary/project IDs, sourceIds, internal/external transfers and flow structure, then emits operations in the current RTDS contract (setVariables, say, checkSchedule, internalTransfer, externalTransfer, disconnect — no emergency, no workgroupTransfer). Trigger on "generate config from flowData", "build json config for DA-...", "modernize this call script", "flowData to config", or any request to produce a callflow_json_config file for a flow that has an XML in flowData/.
---

# RTDS FlowData → Config Generator

Turn a live DA call script (Vocalls Designer flow XML + metadata workbook in
`flowData/`) into a **functional, modernized** routing-table config JSON in
`callflow_json_config/`, shaped like `DIGIPOLIS_DA_HELDPESK_PRD.json`.

**Not this skill:** converting a *legacy PascalCase config JSON* (use
`rtds-callflow-migrator`) or generating *component XML* (use
`rtds-vocalls-component-gen`).

## Inputs

- **Args:** one or more flow names (e.g. `DA-SW-TS`, `DA-LOKET-WONEN`), or
  `all` for every XML in `flowData/` root.
- `flowData/DA_CALLFLOW_METADATA.xlsx` — routing table + ID dictionaries.
- `flowData/<FLOW>.xml` — the flow's mxGraph export. **Never** read
  `flowData/ignore/` — it is excluded input.

## Workflow

### 1. Collect metadata (per flow)

Dump the workbook once:

```
python .claude/skills/rtds-flowdata-config-gen/scripts/dump_xlsx.py flowData/DA_CALLFLOW_METADATA.xlsx
```

Resolve, per flow, using the lookup chain in
[references/metadata-lookups.md](references/metadata-lookups.md):

| Field | Source |
| ----- | ------ |
| `sourceId` | routing sheet: rows whose column E names this flow's XML. Prefer the `-PRD` row; `+` + digits for full numbers, extensions verbatim. List *all* matching rows in the report. |
| `scheduleId` | `Dic_Schedule` row matching the flow's project (e.g. `DIGIPOLIS - SW_SV_2NDLINE`) |
| `promptLibrary` | `Dic_Schedule.PromptLibraryID` → `PromptLibrary.BasePath` |
| `project` | `PromptLibrary.CompanyProjectID` → `CompanyProjectId.IAConfigCustomerName` |

Any ID you cannot resolve → literal `"unknown"` in the config **and** a line in
the report. Never invent IDs.

### 2. Extract the flow

```
python .claude/skills/rtds-flowdata-config-gen/scripts/extract_flow.py flowData/<FLOW>.xml
```

This emits the functional graph as JSON (nodes + edges; layout, global
libraries and component internals already stripped — global libraries are
**ignored by design**). Interpret it with
[references/flow-xml-guide.md](references/flow-xml-guide.md). Collect:

- **Messages/prompts** — every `say` node's `Text` (+ `Text_<lang>` variants).
- **Transfers** — every `redirect` node: `Destination`, `TransferType`,
  `Parameters`.
- **Cognos events** — `script` nodes writing `varObj.ivrEvent` / `ivrAction`.
- **Structure** — edges + `case`/`expression` branches (incl. the
  `apiSuccess` schedule case), the `init` script (`routingKey`).

### 3. Generate operations

Follow the contract in
[references/target-contract.md](references/target-contract.md). Core
modernization rules:

| Legacy (XML) | Modern op |
| ------------ | --------- |
| `init` script (`routingKey`, 9999/CT) | `setVariables` "Call Initialization", `isFirstOperation: true`, with `keysToLog` |
| `ScheduleAPI` script + `apiSuccess` case | `checkSchedule` (branch keys `nextStep_Open/_Closed/_Transfer/_Failure`, guards if present) |
| `ivrEvent`/`ivrAction` script | `setVariables` "Set: Cognos …" |
| `say` node | `say` (+ `ttsMessages` per language) |
| **Emergency block** (`emergencyActive`/`emergencyAction` cases, 1204 scripts, its transfer) | **Omit entirely** — the scheduler replaces emergency. Rewire around it. |
| `redirect` to queue/extension with context headers or attend | `internalTransfer` (was `workgroupTransfer`) |
| `redirect` to phone number / `{_transferNumber}` | `externalTransfer` |
| `hung` | `disconnect` |

### 4. Validate

- Every `nextStep*` value points to an existing op `id`; no orphan ops.
- Exactly one `isFirstOperation: true`; last op(s) are `disconnect`.
- Every op `type` and every param name exists in
  `rtds/db_seed/import_seeds_camelCase.sql` (`@OperationType` /
  `@Attribute`). Params are camelCase; `nextStep` is always the **last**
  key in `params`, after any `nextStep_*` branch keys.
- No `emergency`, `workgroupTransfer`, or `remoteTransfer`/`localTransfer`
  types in the output.
- `python -c "import json; json.load(open('<file>', encoding='utf-8'))"` parses.

### 5. Write output + report

- Write `callflow_json_config/<FLOW with - → _>.json`, **UTF-8 (no BOM)**,
  4-space indent (the UTF-16 PRD file is legacy; new files are UTF-8).
- Report in chat, per flow: sourceId(s) found, scheduleId, promptLibrary,
  project, op count, transfers (internal/external with targets), every
  `"unknown"` left for the user to fill in, and anything skipped (emergency
  blocks, disabled `Status` rows).

## Checklist

- [ ] `flowData/ignore/` untouched
- [ ] Metadata IDs resolved or `"unknown"` + reported
- [ ] All say texts captured into `ttsMessages` (entities decoded, `&#xa;` → `\n`)
- [ ] Emergency block omitted, flow rewired around it
- [ ] Transfers mapped internal/external correctly
- [ ] Validation (step 4) passed
- [ ] UTF-8 output + per-flow report delivered
