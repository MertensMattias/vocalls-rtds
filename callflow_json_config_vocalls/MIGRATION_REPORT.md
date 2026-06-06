# Callflow config migration — legacy PureConnect → RTDS `_vocalls` routing tables

Source: [`callflow_json_config/`](../callflow_json_config/) (10 files, UTF-16, PureConnect schema).
Target: this folder (`callflow_json_config_vocalls/`), UTF-8, **DB-importer schema** consumed by
[`insert_flow_on_sourceId.sql`](../rtds/db_seed/insert_flow_on_sourceId.sql) (`POST /api/routing-table/import`).
The importer writes `rtds.RoutingTable`/`Operation`/`Attribute`; the runtime later fetches the
regenerated table over HTTP (`fetchAndStart`/`parseFlow`, which re-emits camelCase).

> **Contract note:** there are two envelope-casing contracts in this repo. The **importer**
> reads **PascalCase** (`$.SourceId`, `$.Operations`, `$.Id/$.Type/$.Params`); the **runtime
> `parseFlow`** reads **camelCase** (`json.sourceId`, `op.id`). These files target the **importer**,
> so they are PascalCase. Param keys are validated by the importer against
> [`seed_operations_vocalls_dictionary.sql`](../rtds/db_seed/seed_operations_vocalls_dictionary.sql)
> — an unknown key throws `UNKNOWN_PARAM` (54016).

## Status

- ✅ **Pilot done:** `DIGIPOLIS_DA_KLANTWACHT_GUARD_PRD.json` — 5 ops.
- ✅ **GUARD & TUI batch done (7 files):** the 3 full guard flows + 4 self-service TUI flows. See the per-file table below.
- ⬜ Remaining 2 files: the two helpdesk flows (`DA_HELDPESK`, `LPA_ICT_HELDPESK`) — larger, contain unmapped types, still pending.

All 8 migrated files validated together: well-formed JSON, PascalCase envelope, **every Param key present in the dictionary** (no `UNKNOWN_PARAM`), no duplicate `Id`s, and every `NextStep*` target resolves to a real node in the same flow.

### GUARD & TUI batch — per-file

| Output file | SourceId | Shape | Ops | Notes |
| --- | --- | --- | --- | --- |
| `DIGIPOLIS_DA_KLANTWACHT_GUARD_PRD.json` | +3281800050 | guard | 5 | pilot |
| `DIGIPOLIS_DA_SYSTEEMWACHT_GUARD_PRD.json` | +3281800051 | guard | 5 | `DialGuard:false`, `AcceptCallMenu:false`, ConfigId 2 |
| `DIGIPOLIS_LPA_ICT_GUARD_PRD.json` | +3271690036 | guard | 5 | source Disconnect `Id:"0098"` typo **repaired → "00098"** to match the SMS `NextStep` |
| `DIGIPOLIS_LPA_LTSU_GUARD_PRD.json` | +3271690037 | guard | 5 | source file in the folder was a corrupted ICT copy; rebuilt from the **correct source you supplied** (`+3271690037`, ConfigId 4). `_TODO` dropped. |
| `DIGIPOLIS_DA_KLANTWACHT_TUI_PRD.json` | +3271690040 | tui | 5 | ConfigId 1 |
| `DIGIPOLIS_DA_SYSTEEMWACHT_TUI_PRD.json` | +3271690039 | tui | 5 | ConfigId 2 |
| `DIGIPOLIS_LPA_ICT_GUARD_TUI_PRD.json` | +3271690041 | tui | 5 | ConfigId 3 |
| `DIGIPOLIS_LPA_LTSU_GUARD_TUI_PRD.json` | +3271690038 | tui | 5 | ConfigId 4 |

### TUI flows — `GuardTUI_vocalls` mapping

Legacy TUI ops carried only `Active / ConfigId / ConfigName / NextStep* `. The `GuardTUI_vocalls`
dictionary (and `rtds/components/guardTui.js`) require the spoken slots and a `NextStep_Denied`
branch, so each was filled from the **component's own `__configJSON` defaults**:

| Added key | Source of value | Why |
| --- | --- | --- |
| `PhoneNumberVar: "ani"` | component default | which var holds the caller number to (de)activate |
| `Timeout: 10000` | component default | DTMF/HTTP timeout |
| `ResultCurrentlyActivated_NL`, `ResultCurrentlyDeactivated_NL`, `PromptActivate_NL`, `PromptDeactivate_NL`, `ResultActivated_NL`, `ResultDeactivated_NL`, `ResultOnlyActive_NL`, `ResultDenied_NL`, `ResultError_NL` | `sourceCode_guardTui.js` / KLANTWACHT template | per-language spoken slots; component resolves `base + '_' + language` |
| `NextStep_Denied` | mapped to the legacy **Failure** node | the component branches on `denied`; legacy had no such branch, so denied falls through to the Cognos-failure node |

The two trailing **Cognos** `SetAttributes` nodes (success `IVREvent 1200 / IVRAction CT`,
failure `9999 / DC`) → `SetVariables_vocalls` with `IvrEvent`/`IvrAction`. `Active:true` added.

> ⚠️ **Spoken text is still English placeholder** (`*_NL` suffix, English copy). Replace with Dutch
> copy (or add `*_FR` / `*_DE` dictionary rows) before production.

### ⚠️ Data-quality findings in the source files

1. **`DIGIPOLIS_LPA_LTSU_GUARD_PRD.json` in the source folder was a corrupted ICT copy** — same
   `SourceId +3271690036` / `Name "LPA_ICT_GUARD"` / `ConfigId 3` as the ICT flow, so importing it
   would have collided on SourceId. **Resolved:** you supplied the correct LTSU source
   (`SourceId +3271690037`, `ConfigId 4`, `PromptLibrary DIGIPOLIS\LPA\LTSU`); the migrated file now
   uses those values and the `_TODO` suffix was dropped. All 8 SourceIds are now unique.
2. **`LPA_ICT_GUARD` Disconnect Id typo.** Source Disconnect node was `Id:"0098"` while the SMS step
   pointed at `"00098"` — a dangling jump. Repaired the Disconnect `Id` to `"00098"`.
3. **Leading spaces in legacy ids/names** (`" DA_KLANTWACHT_TUI"`, `" LPA_ICT_GUARD"`). Trimmed.

## The migration rules applied

### 1. Envelope keys → PascalCase (importer contract)
The importer reads `$.SourceId / Name / ProjectId / Project / PromptLibraryId / PromptLibrary / SupportedLanguages / Operations`, and per-op `$.Id / Type / Name / IsFirstOperation / Params`. Added the importer-required header fields `ProjectId` (from the source file) and `PromptLibraryId` (left `""` — the importer find-or-creates the library by `CompanyProjectID`, so the id is optional on input).

### 2. Type names → `<Type>_vocalls` (the registry keys)
From `registerRtdsOperation` / `registerRtdsExit` ([rtds_2_runtime.js:1083-1098](../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js#L1083)):

| Legacy `Type` | New `type` | Runtime status |
| --- | --- | --- |
| `SetAttributes` | `SetVariables_vocalls` | ✅ JS twin (per your instruction — not `SetAttributes_vocalls`, though that alias also exists) |
| `SendEmail` | `SendMail_vocalls` | ✅ JS twin + component |
| `SendSMS` | `SendSms_vocalls` | ✅ JS twin + component |
| `GuardRouting` | `Guard_vocalls` | ✅ GUI-exit `guard_routing` + component |
| `GuardTUI` | `GuardTui_vocalls` | ✅ GUI-exit `guard_tui` + component |
| `Disconnect` | `Disconnect_vocalls` | ✅ GUI-exit (terminal) |
| `WorkgroupTransfer` | `WorkgroupTransfer_vocalls` | ⚠️ exit registered, **no component** |
| `ExternalTransfer` | `ExternalTransfer_vocalls` | ⚠️ exit registered, **no component** |
| `PlayPrompt` | `PlayPrompt_vocalls` | ⚠️ exit registered, **no component** (native `say`) |
| `PlayAudio` | `PlayAudio_vocalls` | ⚠️ exit registered, **no component** (native `say`) |
| `Menu` | `Menu_vocalls` | ⚠️ exit registered, **no component** (native `dtmf`) |
| `Callback` | `Callback_vocalls` | ⚠️ exit registered, **no component** |
| `Condition` | `Condition_vocalls` | ❌ **not registered, no component, spec-only** |
| `Emergency` | `Emergency_vocalls` | ❌ **not registered, no component, spec-only** |
| `Schedule` | `CheckSchedule_vocalls` | ⚠️ component [checkSchedule.js](../rtds/components/checkSchedule.js) exists but **not registered** |
| `FlowJump` | `FlowJump_vocalls` | ❌ **not registered, spec-only** |

Files containing any ❌/⚠️-unregistered type (the two helpdesk flows) will be written with a **`_TODO` filename suffix** so it's obvious they reference types the runtime will currently *skip to NextStep with a warning*.

### 3. Tokens `$(ATTR_x)` → `${rtX}`
Per your choice, renamed to the `_rt`-style `${name}` vars the existing components ship with. ⚠️ **Token-syntax caveat:** `${name}` is the *component* path (`resolveConfigTokens`); the runtime *JS twins* that consume an imported table resolve **`$(NAME)`** instead (`resolveTokens`, [rtds_2_runtime.js:375](../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js#L375)). If these ops execute as JS twins rather than GUI components, the tokens must be `$(rtEmailTo)`. Confirm the execution path per op before import.

| Legacy | New |
| --- | --- |
| `$(ATTR_EmailTo)` | `${rtEmailTo}` |
| `$(ATTR_EmailBody)` | `${rtEmailBody}` |
| `$(ATTR_EmailAttachment)` | `${rtEmailAttachment}` |
| `$(ATTR_SMSTo)` | `${rtSmsTo}` |
| `$(ATTR_SMSBody)` | `${rtSmsBody}` |

⚠️ **These vars must be populated upstream** (on `varObj` or `global`) before the mail/SMS op runs, or `resolveConfigTokens` leaves them raw and logs a warn — the placeholder ships literally.

### 4. Param-key remaps

**SendEmail → SendMail_vocalls** ([sendMail.js](../rtds/components/sendMail.js) contract):
| Legacy | New | Note |
| --- | --- | --- |
| `CC` | `Cc` | casing (read is case-insensitive, normalised for clarity) |
| `Importance: "Normal"` | `Priority: 2` | component expects numeric 1/2/3; Normal→2 |
| `Attachment: $(ATTR_EmailAttachment)` | `Files: ${rtEmailAttachment}` | component splits `;`-list of file paths (`Files`), or `AttachmentNames`+`AttachmentData` for base64. **Assumed file paths** — change to AttachmentNames/Data if it's base64 |
| *(added)* | `Timeout: 10000` | component default; not in source |

**SendSMS → SendSms_vocalls** ([sendSms.js](../rtds/components/sendSms.js) contract):
| Legacy | New | Note |
| --- | --- | --- |
| `ConfigId: 47` | `SmsAccountId: 47` | component key for the SMS account |
| `Routing` | `Routing` | unchanged |
| *(added)* | `Timeout: 5000` | component default; not in source |

**GuardRouting → Guard_vocalls** (dictionary keys for `Guard_vocalls`):
| Legacy | New | Note |
| --- | --- | --- |
| `SendSMS` / `SendMail` | `SendSms` / `SendMail` | casing → dictionary keys |
| `OnHoldAudio: "TENANT_DA_GUARD"` | `OnHoldAudioUrl: "https://audio-${environment}.n-allo.be/on-hold.wav"` | matched the reference example (`insert_flow_on_sourceId.sql`); the dictionary key expects a **URL**, not the legacy audio-source name. ⚠️ confirm the real URL |
| `DialGroup: "SIP_TO_..."` | *(dropped)* | not a dictionary key → would throw `UNKNOWN_PARAM`. Legacy SIP trunk routing; the guard models the outbound leg via `OutboundAni`/`Diversion` (both added, empty) |
| *(added)* | `OutboundAni: ""`, `Diversion: ""`, `AcceptCallMessage: "..."` | dictionary keys present in the reference example |

**SetAttributes → SetVariables_vocalls** (dictionary keys only — importer throws `UNKNOWN_PARAM` otherwise):
| Legacy | New | Note |
| --- | --- | --- |
| `IVREvent` | `IvrEvent` | dictionary uses `IvrEvent` casing |
| `IVRAction` | `IvrAction` | dictionary uses `IvrAction` casing |
| `RoutingId` | `RoutingId` | unchanged (dictionary key) |
| `CallflowId` | *(dropped)* | ⚠️ **not in the dictionary** for `SetVariables_vocalls` → would throw `UNKNOWN_PARAM`. Mapped instead to `CustomerName`/`CustomerProject` (split from the routing id), matching the reference example. Re-add `CallflowId` to the dictionary if it must be preserved |
| `LogAttributes` | *(dropped)* | dictionary *does* allow `LogAttributes`, but the value is a PureConnect Cognos pipe-list with no runtime consumer — omitted. Re-add verbatim if Cognos logging is still needed |
| *(added)* | `Active: true`, `CustomerName`, `CustomerProject` | dictionary keys from the reference example |

### 5. Encoding
Source UTF-16 (BOM + null-spaced bytes) → output UTF-8.

## Open items to confirm on the pilot

1. **`OnHoldAudioUrl`** — keep the legacy `TENANT_DA_GUARD` audio-source name, or map to a real URL?
2. **`Files` vs `AttachmentNames/Data`** — is `$(ATTR_EmailAttachment)` a file *path* or base64 data?
3. **`DialGroup` drop** — confirm the SIP trunk group isn't needed by the new guard component.
4. **`SmsAccountId`** — confirm `47` is the account id (legacy called it `ConfigId`).
