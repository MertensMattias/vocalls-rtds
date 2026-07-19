---
name: rtds-flowdata-config-gen
description: Generate a modernized camelCase RTDS callflow JSON config (jsonConfig/digipolis_stad/*.json) for a DA call script, from the live-flow metadata in flowData/ (DA_CALLFLOW_METADATA.xlsx + the flow's Vocalls Designer mxGraph XML) and the project's TTS transcript. Collects messages/prompts, scheduleId/promptLibrary/project IDs, sourceIds, internal/external transfers and flow structure, resolves real prompt-library keys, then emits operations in the current RTDS contract (setVariables, say, checkSchedule, menu, internalTransfer, externalTransfer, disconnect — no emergency, no workgroupTransfer). Trigger on "generate config from flowData", "build json config for DA-...", "modernize this call script", "flowData to config", or any request to produce a jsonConfig file for a flow that has an XML in flowData/.
---

# RTDS FlowData → Config Generator

Turn a live DA call script (Vocalls Designer flow XML + metadata workbook in
`flowData/`, plus the project's TTS transcript) into a **functional, modernized,
runtime-correct** routing-table config JSON in `jsonConfig/digipolis_stad/`.

The goal is a config that not only *imports* but *behaves* — every prompt actually
plays, every branch resolves, the scheduler and menu contracts are honoured, and the
few genuine judgement calls are put in front of the user rather than guessed.

**Not this skill:** converting a *legacy PascalCase config JSON* (use
`rtds-callflow-migrator`) or generating *component XML* (use
`rtds-vocalls-component-gen`).

## Inputs

- **Args:** one or more flow names (e.g. `DA-SW-TS`, `DA-LOKET-WONEN`), or
  `all` for every XML in `flowData/` root.
- `flowData/DA_CALLFLOW_METADATA.xlsx` — routing table + ID dictionaries.
- `flowData/<FLOW>.xml` — the flow's mxGraph export. **Never** read
  `flowData/ignore/` — it is excluded input.
- `jsonConfig/digipolis_tts_messages/markdown/TTS_transcripties_<DOMAIN>*.md` — the
  project's prompt-library keys + canonical text (see step 2).

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
| `scheduleId` | `Dic_Schedule` row matching the flow's project |
| `promptLibrary` | `Dic_Schedule.PromptLibraryID` → `PromptLibrary.BasePath` |
| `project` | `PromptLibrary.CompanyProjectID` → `CompanyProjectId.IAConfigCustomerName` |

Any ID you cannot resolve → literal `"unknown"` in the config **and** a line in
the report. Never invent IDs.

### 2. Resolve prompt keys (the flow's messages)

The flow's real prompt names + text live in the project's TTS transcript, not the XML.
Resolve the flow to its domain code and run the resolver in Q/A mode:

```
python .claude/skills/rtds-flowdata-config-gen/scripts/resolve_prompt_keys.py \
    --domain <DOMAIN> --qa --roles "<roles for this flow>"
```

The flow→domain map and the full mechanism are in
[references/prompt-keys.md](references/prompt-keys.md). Roles are free-text, one per
prompt-playing op — e.g. `welcome`, `adhoc`, `prequeue lager`, `menu`, `menuwrong`,
`menuretry`, `exception`. The script returns, per role, a recommended key + text + an
`auto`/`confirm` decision + alternatives, and a rendered Q/A block.

**STOP here and get the `[ASK]` decisions confirmed before continuing.** Present the
rendered Q/A block and wait for the user to accept (`ok`) or override. Do **not**
finalize a config with an unresolved `[ASK]` prompt-key pick — these are the choices
where the transcript offers several near-synonyms or where a greeting could be its own
say vs. folded into the menu, and guessing them silently is how the wrong prompt ships.
This gate is deliberate: an unattended/batch run pauses here rather than auto-applying —
that is the safety, not a limitation. Apply `[AUTO]` picks directly (they're clear
matches). If the flow has no transcript, prompts stay `"unknown"` (text from the XML
`Text`), which you note — that needs no confirmation.

Why a hard stop and not "pick the best and note it": a buried best-guess reads as a
decision already made, so nobody re-checks it. Stopping forces the one quick human
confirm that keeps the prompts correct.

Two placement rules that bite (full detail in
[references/prompt-keys.md](references/prompt-keys.md)):
- `say` text goes in the **`ttsMessages`** envelope key.
- `menu` text goes in the **message Params** (`staticMessage_*` /
  `menuChoiceMessage_*`), never `ttsMessages` — else the menu is silent.
- `Scheduler_*` keys are **not** wired onto any say — the scheduler plays them itself.

### 3. Extract the flow

```
python .claude/skills/rtds-flowdata-config-gen/scripts/extract_flow.py flowData/<FLOW>.xml
```

Emits the functional graph as JSON (`{master, nodes, edges}`; layout, global libraries,
component internals stripped). Interpret it with
[references/flow-xml-guide.md](references/flow-xml-guide.md). Collect: say
messages/prompts; transfers (`redirect` → internal/external); Cognos events (`script`
setting `varObj.ivrEvent`/`ivrAction`); DTMF menu (`dtmf`+`choice`+`counter` →
`menu`, harvesting `timeout`/`maxTries`/keys); structure (edges + `case` branches, the
`apiSuccess` schedule case, the `init` `routingKey`).

### 4. Generate operations

Follow the contract in
[references/target-contract.md](references/target-contract.md). The **authoritative**
param names, data types, and `applicationId` values come from the seed —
[references/seed-lookups.md](references/seed-lookups.md) shows how to read
`rtds/db_seed/import_seeds_camelCase.sql` and carries the verified `applicationId`
dictionary (Scheduler=1, PreQueue=4, AdHoc=6, Menu=7, Welcome=11, Info=13,
Exception=14, …). Consult it whenever you're unsure a param exists or which
`applicationId` an op needs. Core mapping:

| Legacy (XML) | Modern op |
| ------------ | --------- |
| `init` script (`routingKey`, 9999/CT) | `setVariables` "Call Initialization", `isFirstOperation: true`, with `keysToLog` |
| `ScheduleAPI` + `apiSuccess` case | `checkSchedule` (`nextStep_Open/_Closed/_Transfer`; **`nextStep_Failure` and `nextStep` → the Open step**, no separate error op) |
| `ivrEvent`/`ivrAction` script | `setVariables` "Set: Cognos …" |
| `say` node | `say` (text in `ttsMessages`) — **unless** it plays a `Scheduler_*` message on the scheduler's closed path, then **drop it** and route that branch to `disconnect` |
| `dtmf`+`choice`+`counter` | `menu` (text in `staticMessage_*`/`menuChoiceMessage_*`, `timeout` ms, `maxTries`) |
| Emergency block | **Omit** — rewire around it |
| `redirect` to queue/extension w/ context/attend | `internalTransfer` (in terminal block; `nextStep_Failure` → the exception unit) |
| `redirect` to number / `{_transferNumber}` | `externalTransfer` |
| transfer failure / "not accepted" | **exception unit**: Cognos `9999`/`DC` setVariables → `Exception_Unexpected` say → `disconnect` |
| `hung` | `disconnect` (normal ends go here directly — no Cognos marker) |

**Number the ops: main spine first, terminal block at the bottom.** Number the *main
caller journey* in call order (`00000` init → `00004` schedule → Cognos → welcome →
menu → choices → PreQueue says), then place all **end-of-call ops in a fixed terminal
block** at the bottom of the JSON, in this order — see target-contract.md for the worked
example:

1. `internalTransfer` ops (queue-extension transfers) — top of the terminal block (`0006x`)
2. scheduler Cognos-Transfer setVariables + its `externalTransfer` (`${schedulerTransferNumber}`) (`0007x`)
3. the **exception unit** (`0008x`): a `setVariables` Cognos `9999`/`DC` ("Unknown
   Exception / Disconnect") → the `Exception_Unexpected` say → `disconnect`
4. `disconnect` (`00100`)

This is why a scheduler `externalTransfer` belongs near the end, not wedged mid-spine
even though the schedule case reaches it early — it is a terminal offshoot. Ids still
ascend overall. Collapse any two `setVariables` ops with identical params into one.

**The exception unit (the `nextStep_Failure` target).** Transfers point their
`nextStep_Failure` at the **Cognos `9999`/`DC` setVariables** op, which sets the
Unknown-Exception marker, then flows to the `Exception_Unexpected` say, then
`disconnect`. So the failure path is: `…nextStep_Failure → 9999/DC setVariables →
Exception_Unexpected say → disconnect`. **All other disconnects go straight to
`disconnect`** — a normal Closed/accepted-completion path does **not** set a Cognos
marker; only the exception path does. (Precedent: the TUI configs' `00099` `9999/DC` →
`00100`.)

### 5. Validate

Run the validator — it replaces the hand-checks and catches the runtime-silent bugs:

```
python .claude/skills/rtds-flowdata-config-gen/scripts/validate_config.py jsonConfig/digipolis_stad/<FLOW>.json
```

It checks: JSON parses; single `isFirstOperation`; every `nextStep*` resolves; ids
ascend; every op reachable from the first; last op `disconnect`; no retired types
(`emergency`/`workgroupTransfer`/`remoteTransfer`/`localTransfer`); `nextStep` is the
last param key; **every param is catalogued in the seed** (else the importer THROWs
54016); **menu ops can actually announce text** (not silent); no duplicate setVariables.
It also **WARNs** on the semantic smells that unattended runs miss: a say that
duplicates a downstream menu greeting (double-play), a prompt-key category that disagrees
with its `applicationId` (e.g. a `PreQueue_*` key on the Exception application), one
prompt key reused across several says, and a setVariables logging a non-end-of-call
Cognos code straight into disconnect. Fix every `[FAIL]`; each `[WARN]` is a Decisions
item — resolve it or surface it in the report.

### 6. Write output + report

- Write `jsonConfig/digipolis_stad/<FLOW with - → _>.json` (or the `ACC`/`PRD`
  subfolder for an explicitly env-specific line), **UTF-8 (no BOM)**, 4-space indent.
- Report in chat, per flow: sourceId(s), scheduleId, promptLibrary, project, op count,
  transfers (internal/external with targets), the validator summary, and a
  **Decisions** section (below).

**Decisions section** — always include when any judgement call was made; frame as
"here's what I chose and why, confirm or correct". Every validator `[WARN]` maps to a
Decisions line. Triggers:
- Prompt-key picks that were `[ASK]` / multi-candidate / left `"unknown"` (these were
  already confirmed in step 2's gate — restate the outcome here).
- **One prompt key reused across several says** (e.g. three PreQueue announcements all
  on `Adhoc_Transfer`) — confirm one prompt fits all branches, or that per-branch keys
  are wanted but absent from the transcript.
- **Prompt-key category vs `applicationId` mismatch** (e.g. `PreQueue_NoStaffingDisconnect`
  on the Exception application) — accept the fallback or note a missing `Exception_*` key.
- Any say dropped because it duplicated a scheduler prompt or a downstream menu greeting
  (double-play) — name which and why.
- No-input/default Cognos code choice (source may use a transfer-timeout code like
  `1201/TX`; a choice code like `3001/CT` may be wanted — show the source, ask).
- Menu `nextStep_Failure` (technical failure) vs `nextStep_DefaultChoice` (no-input) —
  if both point at the same op, say so; they are distinct events.
- Transfer classification that fell back to `"unknown"` attend/blind.
- Any `"unknown"` id (metadata not resolved).

## Checklist

- [ ] `flowData/ignore/` untouched
- [ ] Metadata IDs resolved or `"unknown"` + reported
- [ ] Prompt keys resolved from the transcript (Q/A); **stopped and got every `[ASK]`
      pick confirmed** before finalizing
- [ ] `say` text in `ttsMessages`; `menu` text in `staticMessage_*`/`menuChoiceMessage_*`
- [ ] No `say` op carries a `Scheduler_*` message; scheduler failure → Open (no `00013`)
- [ ] Emergency omitted, flow rewired; transfers mapped internal/external correctly
- [ ] Menu `timeout` (ms) + `maxTries` harvested from the `dtmf`/`counter`
- [ ] Main spine numbered first; **terminal block at the bottom** (internalTransfers →
      scheduler transfer → exception unit `9999/DC`+`Exception_Unexpected` → disconnect)
- [ ] Transfer `nextStep_Failure` → the exception unit; other ends → `disconnect` direct
- [ ] No duplicate ops
- [ ] `validate_config.py` passes (no FAILs); every `[WARN]` resolved or in Decisions
- [ ] UTF-8 output in `jsonConfig/digipolis_stad/` + per-flow report with Decisions
