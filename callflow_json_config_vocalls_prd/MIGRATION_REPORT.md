# Callflow config migration — legacy PureConnect → RTDS camelCase routing tables

Source: [`callflow_json_config/`](../callflow_json_config/) (10 files, UTF-16, PureConnect schema).
Target: this folder (`callflow_json_config_vocalls/`), UTF-8, **camelCase RTDS contract** consumed by
[`import_flow_from_json_camelCase.sql`](../rtds/db_seed/import_flow_from_json_camelCase.sql). Param keys
are validated against the camelCase dictionary
[`import_seeds_camelCase.sql`](../rtds/db_seed/import_seeds_camelCase.sql) — an unknown key throws
`UNKNOWN_PARAM` (54016), an unresolved `nextStep*` target throws `INVALID_NEXTSTEP`.

> **Contract (camelCase, single envelope).** Both the importer (`import_flow_from_json_camelCase.sql`)
> and the runtime `parseFlow` read **camelCase**: header keys (`sourceId`, `name`, `operations`),
> per-op keys (`id`, `type`, `name`, `isFirstOperation`, `params`), every operation **type** value, and
> every **param** name. This supersedes the earlier two-contract (PascalCase-importer) plan and the
> temporary `_vocalls` type suffix, both now dropped. The canonical shape is
> [`rtds/samples/n-allo_reception.json`](../rtds/samples/n-allo_reception.json).

## Status

- ✅ **All 10 flows migrated and validated** against `import_seeds_camelCase.sql`: well-formed JSON,
  camelCase envelope + types + params, **every param key in the dictionary** (no `UNKNOWN_PARAM`), no
  duplicate `id`s, and every `nextStep*` target resolves to a node in the same flow.
- ✅ GUARD & TUI batch (8 files) — done previously, re-validated here against the camelCase dictionary.
- ✅ **Helpdesk batch (2 files) — done in this pass:** `DA_HELDPESK` (41 ops) and `LPA_ICT_HELDPESK`
  (34 ops). These are the flows that exercise the prompt/menu/condition/emergency/schedule types and
  the semantic renames below.

### Per-file

| Output file | sourceId | Ops | Notes |
| --- | --- | --- | --- |
| `DIGIPOLIS_DA_KLANTWACHT_GUARD_PRD.json` | +3257351122 | 5 | guard |
| `DIGIPOLIS_DA_SYSTEEMWACHT_GUARD_PRD.json` | +3257351123 | 5 | guard; `dialGuard:false`, `acceptCallMenu:false`, configId 2 |
| `DIGIPOLIS_LPA_ICT_GUARD_PRD.json` | +3257351120 | 5 | guard |
| `DIGIPOLIS_LPA_LTSU_GUARD_PRD.json` | +3271690037 | 5 | guard, configId 4. **sourceId placeholder `+xxx` repaired → `+3271690037`** (the value the report names as the correct LTSU source, and the target of the ICT helpdesk `flowJump`). |
| `DIGIPOLIS_DA_KLANTWACHT_TUI_PRD.json` | +3271690040 | 5 | tui, configId 1 |
| `DIGIPOLIS_DA_SYSTEEMWACHT_TUI_PRD.json` | +3271690039 | 5 | tui, configId 2 |
| `DIGIPOLIS_LPA_ICT_GUARD_TUI_PRD.json` | +3257351121 | 5 | tui, configId 3 |
| `DIGIPOLIS_LPA_LTSU_GUARD_TUI_PRD.json` | +3271690038 | 5 | tui, configId 4 |
| `DIGIPOLIS_DA_HELDPESK_PRD.json` | +3233387777 | 41 | **NEW.** helpdesk: say/play/emergency/checkSchedule/condition/workgroupTransfer/callback/guard×2/sendMail×2/sendSms×2/externalTransfer/disconnect |
| `DIGIPOLIS_LPA_ICT_HELDPESK_PRD.json` | +3233389999 | 34 | **NEW** (renamed from source `..._PROD_CURRENT.json`). helpdesk: say/emergency/checkSchedule/condition/menu/flowJump/guard×2/sendMail×2/sendSms×2/externalTransfer/workgroupTransfer/disconnect |

All 10 `sourceId`s are unique.

## Migration rules applied

### 1. Envelope + keys → camelCase
`sourceId / name / projectId / project / promptLibraryId / promptLibrary / supportedLanguages /
operations`, and per-op `id / type / name / isFirstOperation / params`. `promptLibraryId` left `""`
(the importer find-or-creates the library by project). `projectId` is informational (the importer
resolves `CompanyProjectID` by project **name**); the ICT helpdesk source carried none, so it is `""`.

### 2. Operation type names → camelCase + semantic renames
Matched to the dictionary in `import_seeds_camelCase.sql` and the runtime registry
([rtds_2_runtime.js](../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js)):

| Legacy `Type` | New `type` | Runtime status |
| --- | --- | --- |
| `SetAttributes` | `setVariables` | ✅ GUI-exit `set_variables` (+ `setAttributes` alias) |
| `SendEmail` | `sendMail` | ✅ GUI-exit `send_mail` + component |
| `SendSMS` | `sendSms` | ✅ GUI-exit `send_sms` + component |
| `GuardRouting` | `guard` | ✅ GUI-exit `guard_routing` + component |
| `GuardTUI` | `guardTui` | ✅ GUI-exit `guard_tui` + component |
| `PlayPrompt` | `say` | ✅ GUI-exit `play_prompt` (semantic rename; native `say`) |
| `PlayAudio` | `play` | ✅ GUI-exit `play_audio` (semantic rename) |
| `LanguageMenu` | `getLanguage` | ✅ GUI-exit `language_menu` (semantic rename; not used by these flows) |
| `Menu` | `menu` | ✅ GUI-exit `menu` |
| `WorkgroupTransfer` | `workgroupTransfer` | ✅ GUI-exit `workgroup_transfer` |
| `ExternalTransfer` | `externalTransfer` | ✅ GUI-exit `external_transfer` |
| `Callback` | `callback` | ✅ GUI-exit `callback` |
| `Disconnect` | `disconnect` | ✅ GUI-exit (terminal) |
| `Schedule` | `checkSchedule` | ⚠️ catalogued + component exists, **not runtime-registered** → runStep skips to `nextStep` |
| `Condition` | `condition` | ⚠️ catalogued, **not runtime-registered** → skips to `nextStep` |
| `Emergency` | `emergency` | ⚠️ catalogued, **not runtime-registered** → skips to `nextStep` |
| `FlowJump` | `flowJump` | ⚠️ catalogued, **not runtime-registered** → skips to `nextStep` |

> The helpdesk flows reference `condition`, `emergency`, `checkSchedule`, `flowJump`, which the runtime
> currently **skips to their default `nextStep` with a warning** (cataloguing unblocks import; wiring
> the handlers is separate work). The files are NOT given a `_TODO` suffix — the dictionary now
> catalogues every type, so the **import** is clean; only **runtime execution** of those four is pending.

### 3. Tokens `$(ATTR_x)` → `${rt*}`
`$(ATTR_EmailTo)→${rtEmailTo}`, `EmailBody→${rtEmailBody}`, `EmailAttachment→${rtEmailAttachment}`,
`SMSTo→${rtSmsTo}`, `SMSBody→${rtSmsBody}`. ⚠️ These must be populated upstream (on `varObj`/`global`)
before the mail/SMS op runs, or the placeholder ships literally.

### 4. Param-key remaps and value transforms
- **setVariables** (from `SetAttributes`): `IVREvent→ivrEvent`, `IVRAction→ivrAction`, `RoutingId→routingId`.
  `CallflowId` **dropped** (not in dict); `LogAttributes` **dropped** (PureConnect Cognos pipe-list, no
  runtime consumer). On the first op, `customerName`/`customerProject` added by splitting `routingId` on
  the first `_` (parity with the GUARD/TUI files).
- **guard** (from `GuardRouting`): `OnHoldAudio→onHoldAudioUrl`, `SendSMS→sendSms`, `SendMail→sendMail`.
  `DialGroup` **dropped** (SIP trunk, not a dict key). Added `outboundANI:""`, `diversion:""`,
  `acceptCallMessage` (dict-required, absent in source).
- **sendMail** (from `SendEmail`): `CC→cc`, `Importance:"Normal"→priority:2`, `Attachment→files`. Added
  `bcc/attachmentNames/attachmentData/customerKey:""`, `timeout:10000`.
- **sendSms** (from `SendSMS`): `ConfigId→smsAccountId`. Added `timeout:5000`.
- **Array→scalar:** legacy `[value,"isDisplayed","isEditable"]` param forms (e.g. `prompt`, `active` on
  some `say` ops) flattened to the scalar `value`, matching `n-allo_reception.json`.
- **Type coercion:** `bit` params → JSON boolean, `int` params → JSON number (no `TYPE_MISMATCH`).
- `active` defaulted to `true` on non-`disconnect` ops where the source omitted it (optional in the dict).

### 5. Encoding
Source UTF-16 (BOM) → output UTF-8.

## Data-quality findings & repairs in the source files

1. **`LPA_LTSU_GUARD` sourceId was the placeholder `+xxx`** → repaired to **`+3271690037`** (the report's
   stated LTSU source and the target of the ICT helpdesk `flowJump`). All 10 sourceIds are now unique.
2. **ICT helpdesk dangling jumps.** The inline `LPA_LTSU_GUARD` block (ops 00080–00082) is orphaned —
   the flow `flowJump`s to `+3271690037` at op 00066 before reaching them — and its `nextStep*` pointed
   at non-existent ids `00067`/`00068` (leftovers from when the LTSU guard was inline at those ids).
   Repaired to the flow's own mail/sms ids (`00067→00081`, `00068→00082`) so every target resolves; the
   ops remain unreachable (harmless dead code, superseded by the standalone LTSU flow).
3. **`onHoldAudioUrl` carries the legacy audio-source NAME** (`"TENANT_DA_GUARD"`) on the helpdesk
   guards, not a URL. Kept verbatim from source — ⚠️ replace with the real on-hold URL before production
   (the standalone GUARD files use a placeholder URL).
4. **`LPA_ICT_GUARD_TUI` terminal disconnect carried a stray TTS block** (`applicationId:20` — not a
   seeded prompt application; `prompt`/`ttsMessages` with a lowercase `nl` key and the prompt *filename*
   as the spoken text). It was absent from the PureConnect source and inconsistent with the other three
   TUI flows, and would have thrown `UNKNOWN_APPLICATION`. Reduced to a bare terminal `disconnect`
   (`params: {}`), matching source and siblings.

## Import readiness

Validated statically against the importer rules in `import_flow_from_json_camelCase.sql`
(`UNKNOWN_PARAM`, `TYPE_MISMATCH`, `INVALID_NEXTSTEP`, TTS application/language) and the camelCase
dictionary: **all 10 flows + `rtds/samples/n-allo_reception.json` pass.** Run order: seed first
(`import_seeds_camelCase.sql`), then each flow through `import_flow_from_json_camelCase.sql`.

**Precondition (not provided by the seed):** the importer's `UNKNOWN_PROJECT` check requires
`rtds.Dic_CompanyProject` to already contain the project names these flows reference — **`NALLO`**,
**`DA HELPDESK`**, **`LPA ICT`**. `import_seeds_camelCase.sql` seeds OperationType / PromptApplication /
PromptLanguage / AttributeType / Attribute only, **not** `Dic_CompanyProject`; those project rows must
pre-exist in the target DB (or be seeded separately). The PromptLibrary is find-or-created by the importer.

## Open items to confirm

1. **`onHoldAudioUrl`** — supply the real on-hold audio URL (helpdesk guards still carry `TENANT_DA_GUARD`).
2. **`files` vs `attachmentNames`/`attachmentData`** — is `${rtEmailAttachment}` a file *path* (current
   mapping, `files`) or base64 data?
3. **`smsAccountId 47`** — confirm `47` is the SMS account id (legacy `ConfigId`).
4. **GUARD/TUI sourceIds** — the 8 pre-existing files use a `+3257351120–123` / `+3271690037–041` range
   that differs from the source PureConnect exports; confirm these reassignments are intended.
5. **Runtime wiring** — `condition` / `emergency` / `checkSchedule` / `flowJump` are catalogued but not
   yet runtime-registered (runStep skips them); wire handlers before these flows run end-to-end.
