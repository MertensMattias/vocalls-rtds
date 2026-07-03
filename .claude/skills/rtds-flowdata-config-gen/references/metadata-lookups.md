# DA_CALLFLOW_METADATA.xlsx — sheets and lookup chain

Dump with `scripts/dump_xlsx.py`. Four sheets:

## 1. `DA_CALLFLOW_METADATA` (routing table)

Columns: `Name | Module | Status | SourceId | <flow-XML name> | | `

- Column E names the flow XML in `flowData/` (e.g. `DA-SW-OMGEVING-2NDLINE`).
  One XML can be referenced by several rows (test line, `-PRD` line, internal
  extension) — collect them all; the `-PRD` row's SourceId is the primary.
- `Name` prefix `=>` = full number (format as `+<digits>` in the config,
  e.g. `3233387777` → `"+3233387777"`); prefix `>` = internal extension
  (keep verbatim, e.g. `580002`). `rtds_v9` in column E means the line
  already runs the new runtime — no XML to convert.
- Skip `Status = Disabled` rows (report them).

## 2. `Dic_Schedule`

Columns: `DicScheduleID | Name | GroupName | DefaultActionID | ProjectID | PromptLibraryID | ...`

- `scheduleId` = `DicScheduleID` of the row whose `Name` matches the flow's
  customer/project (e.g. `DIGIPOLIS - DA_HELPDESK` → 4,
  `DIGIPOLIS - SW_SV_2NDLINE` → 133). Match on the flow's project segment
  (`SW_LEZ`, `PM_INFOPLUS_ZIEKTE`, `LPA_ICT_HELPDESK`, ...).
- No match → `scheduleId: "unknown"` + report. Do not guess.

## 3. `PromptLibrary`

Columns: `PromptLibraryID | CompanyProjectID | BasePath | ...`

- `promptLibrary` = `BasePath` (e.g. `DIGIPOLIS\DA\HELPDESK`) of the
  `PromptLibraryID` referenced by the matched `Dic_Schedule` row. In JSON,
  escape backslashes: `"DIGIPOLIS\\DA\\HELPDESK"`.

## 4. `CompanyProjectId`

Columns: `CompanyProjectID | IAConfigCustomerName | ...`

- `project` = `IAConfigCustomerName` for the `CompanyProjectID` on the
  matched `PromptLibrary` row (e.g. 127 → `DA HELPDESK`).
- Envelope `customerName` / `customerProject` in the init op: split the
  routing project (`DA` + `HELPDESK`) the way the golden config does.

## Chain summary

```
flow XML name ──(sheet 1, col E)──▶ Name/SourceId rows
project segment ──(Dic_Schedule.Name)──▶ scheduleId, PromptLibraryID
PromptLibraryID ──(PromptLibrary)──▶ promptLibrary BasePath, CompanyProjectID
CompanyProjectID ──(CompanyProjectId)──▶ project name
```
