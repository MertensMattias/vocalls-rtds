# Mapping Table — PureConnect Handler → Vocalls Operation Type

The handler **name** is the primary signal. The handler's **dominant
business step** (after [tool_filter.md](tool_filter.md) drops the
overhead) is the confirmation signal. When they disagree, ask the user.

## By handler name

The current `rtds/pureconnect_handlers/` set maps as follows.
Where the Vocalls Type uses a different name from the handler, the new
name is **bold**.

| PureConnect handler                       | Vocalls Type            | Vocalls pattern                                                                  | Notes                                                                                                                 |
| ----------------------------------------- | ----------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `NAllo_RTDS.xml`                          | (the runtime itself)    | n/a                                                                              | The top-level dispatcher. Vocalls equivalent is the Script-node entry points in [RTDS_runtime_spec.md §7](../../rtds-vocalls-component-gen/references/RTDS_runtime_spec.md). Don't spec this — it's not an operation. |
| `NAllo_RTDS_Disconnect.xml`               | `Disconnect`            | `gui_exit` (terminal — no `RTDS_nextStepId`)                                     | Hangs up. Optional prompt before disconnect.                                                                          |
| `NAllo_RTDS_SendSMS.xml`                  | `SendSMS`               | `http_call`                                                                      | Calls SMS gateway. Active/Routing/From/To/Body/Reference Params.                                                       |
| `NAllo_RTDS_SendEmail.xml`                | `SendEmail`             | `gui_exit` (or `http_call` depending on operator deployment — confirm)            | The handler shape decides — if it issues an HTTP call, it's `http_call`; if it hands off to a downstream Email GUI node, it's `gui_exit`. |
| `NAllo_RTDS_Condition.xml`                | `Condition`             | `condition`                                                                      | Reads a queue statistic or session variable, compares, branches `NextStep_True`/`NextStep_False`.                       |
| `NAllo_RTDS_CheckAttribute.xml`           | `CheckAttribute`        | `condition`                                                                      | Compares a session variable; same branch shape as `Condition`.                                                         |
| `NAllo_RTDS_FlowJump.xml`                 | `FlowJump`              | `flow_jump`                                                                      | Mutates `RTDS_sourceId` and re-fetches the routing table. The handler also writes a fistful of header attributes — most are routing scaffold (drop). |
| `NAllo_RTDS_Emergency.xml`                | `Emergency`             | `http_call` (multi-branch via `result.status`)                                   | Branches: `NextStep_Transfer`, `NextStep_Disconnect`, `NextStep_Continue`, `NextStep_Failure`.                          |
| `NAllo_RTDS_Scheduler.xml`                | `Schedule`              | `http_call` (dynamic branch via `result.state`)                                  | Branches by state name.                                                                                                |
| `NAllo_RTDS_WorkgroupTransfer.xml`        | `WorkgroupTransfer`     | `gui_exit`                                                                       | Exit key `"workgroup_transfer"`.                                                                                       |
| `NAllo_RTDS_ExternalTransfer.xml`         | `ExternalTransfer`      | `gui_exit`                                                                       | Exit key `"external_transfer"`.                                                                                        |
| `NAllo_RTDS_Menu.xml`                     | `Menu`                  | `gui_exit`                                                                       | Exit key `"menu"`.                                                                                                     |
| `NAllo_RTDS_LanguageMenu.xml`             | `LanguageMenu`          | `gui_exit`                                                                       | Exit key `"language_menu"`.                                                                                            |
| `NAllo_RTDS_PlayPrompt.xml`               | `PlayPrompt`            | `gui_exit`                                                                       | Exit key `"play_prompt"`.                                                                                              |
| `NAllo_RTDS_PlayAudio.xml`                | `PlayAudio`             | `gui_exit`                                                                       | Exit key `"play_audio"`.                                                                                               |
| `NAllo_RTDS_Play.xml`                     | (no Vocalls equivalent) | n/a                                                                              | Helper subroutine — Vocalls flows model prompt-playing as `PlayPrompt`/`PlayAudio` operations, not as a callable helper. Flag in "Open questions". |
| `NAllo_RTDS_PromptLibrary_GetDirList.xml` | (no Vocalls equivalent) | n/a                                                                              | Filesystem listing — out of scope for Vocalls operations. Flag in "Open questions".                                    |
| `NAllo_RTDS_IVRLogging.xml`               | `IVRLogging`            | `http_call` *or* `set_attributes` (see operation_bodies/INDEX.md)                | If the handler issues an HTTP write to a logging endpoint → `http_call`. If it's purely a client-side `Set Attribute` → `set_attributes` with one key (`Message`). |
| `NAllo_RTDS_UpdateSourceId.xml`           | `UpdateSourceId`        | `flow_jump` (variant)                                                            | A trimmed-down FlowJump that only updates `RTDS_sourceId` without re-fetching the whole flow.                          |
| `NAllo_RTDS_Callback.xml`                 | `Callback`              | `gui_exit`                                                                       | Exit key `"callback"`.                                                                                                 |
| `NAllo_RTDS_CallbackAddRecord.xml`        | (sub-operation of `Callback`) | likely `http_call`                                                          | A helper — almost certainly folded into `Callback`'s work body in Vocalls. Confirm with user.                          |
| `NAllo_RTDS_CallbackMenuParticipate.xml`  | (sub-operation of `Callback` — `Menu` variant) | `gui_exit`                                                  | Operator confirm.                                                                                                      |
| `NAllo_RTDS_CallbackTimeSlot.xml`         | (sub-operation of `Callback`) | likely `gui_exit` or `set_attributes`                                       | Operator confirm.                                                                                                      |
| `NAllo_RTDS_CallerDataEntry.xml`          | `CallerDataEntry`       | `gui_exit` (likely) — exit key `"caller_data_entry"`                             | Not in the canonical 11 — confirm with user.                                                                           |
| `NAllo_RTDS_Events.xml`                   | (event dispatch glue)   | n/a                                                                              | Cross-handler event router. Flag in "Open questions" — Vocalls handles events differently.                              |
| `NAllo_RTDS_ExternalTransfer.xml`         | `ExternalTransfer`      | `gui_exit`                                                                       | (Same row as above — handler name is unambiguous.)                                                                     |
| `NAllo_RTDS_Guard.xml`                    | (Guard family)          | `condition` or `gui_exit`                                                        | Operator-availability check. Confirm whether it's a routing condition or a downstream-handoff.                          |
| `NAllo_RTDS_GuardRouting.xml`             | `GuardRouting`          | `gui_exit`                                                                       | Exit key `"guard_routing"`.                                                                                            |
| `NAllo_RTDS_GuardTUI.xml`                 | `GuardTUI`              | `gui_exit`                                                                       | Exit key `"guard_tui"`.                                                                                                |
| `NAllo_RTDS_ManageCallCapacity.xml`       | (capacity-control)      | `condition` (likely)                                                             | Probably reads a capacity counter and branches. Operator confirm.                                                      |
| `NAllo_RTDS_PlayAudio.xml`                | `PlayAudio`             | `gui_exit`                                                                       | (Duplicate row — confirmed.)                                                                                           |
| `NAllo_RTDS_QueueHandling.xml`            | (queue-state operation) | likely `condition` or `http_call`                                                | Operator confirm — the name suggests a poll loop, which doesn't translate cleanly.                                      |

## By dominant business step

If the handler name is ambiguous or you have an unfamiliar handler, use
this signal:

| Dominant business step (after filtering)                                                  | Pattern          | Likely Vocalls Type                                                  |
| ------------------------------------------------------------------------------------------ | ---------------- | -------------------------------------------------------------------- |
| One Telephony `Disconnect` step.                                                           | `gui_exit`       | `Disconnect`.                                                        |
| One HTTP-flavoured step (custom Web Request tool, or any step posting to a URL).           | `http_call`      | `SendSMS` / `RESTRequest` / `RESTGet` / `SkillUpdate` / `Schedule` / `Emergency` — disambiguate by Params present. |
| One `Condition` with a non-trivial predicate, two terminal branches.                       | `condition`      | `Condition` (queue statistic) or `CheckAttribute` (session variable). Disambiguate by whether the LHS reads `_acdQueueStat*` or a Param. |
| Multiple `Set Attribute` writing non-routing-scaffold keys sourced from Params.            | `set_attributes` | `SetAttributes`.                                                     |
| The handler updates `RTDS_sourceId` (the call's source-flow ID).                           | `flow_jump`      | `FlowJump` (full re-fetch) or `UpdateSourceId` (lightweight variant). |
| Several `Set Attribute` writing `RTDS_OP_*`-shaped keys (Params projected for a GUI node). | `gui_exit`       | The GUI-exit Type whose name matches the keys.                       |

## What Params each Type carries

Confirm a Type by the Param keys you found in the handler (the unique
literal strings in `Find(p_lsAttrNames, "<Key>", 0)` calls). The
authoritative list lives in
[RTDS_runtime_spec.md §1.5](../../rtds-vocalls-component-gen/references/RTDS_runtime_spec.md) and the per-pattern files in
[operation_bodies/](../../rtds-vocalls-component-gen/references/operation_bodies/). A quick reference:

- **All operations**: `Active`, `NextStep`.
- **`SendSMS`**: `Routing`, `From`, `To`, `Body`, `Reference`, `NextStep_Success`, `NextStep_Failure`.
- **`Emergency`**: `Reference`, `NextStep_Transfer`, `NextStep_Disconnect`, `NextStep_Continue`, `NextStep_Failure`.
- **`Schedule`**: `ScheduleId`, plus one `NextStep_<State>` per possible state returned.
- **`Condition` / `CheckAttribute`**: `Attribute`, `Operator`, `Value`, `NextStep_True`, `NextStep_False`.
- **`FlowJump`**: `SourceId`, `OperationId` (optional — empty means "go to first op of new flow"), `NextStep`.
- **`UpdateSourceId`**: `SourceId`, `NextStep`.
- **`SetAttributes`**: arbitrary keys (one Param per session variable written), plus `NextStep`.
- **GUI-exit Types**: operation-specific Params (see the per-Type file in `operation_bodies/`) — the work-body sketch ends by returning the exit-key string.

## If you can't decide

Stop and ask the user. State the two candidates and the evidence for
each. Don't guess — picking the wrong pattern means the downstream
component-builder skill emits the wrong work-node body, and that's
expensive to redo.
