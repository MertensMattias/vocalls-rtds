# Migration rules — legacy PureConnect → camelCase RTDS callflow

The authoritative param contract is `dictionary.json` (generated from
`import_seeds_camelCase.sql`). This file captures the **transforms** that turn a
legacy document into something that passes that contract. It distills the
hand-migration documented in `callflow_json_config_vocalls_acc/MIGRATION_REPORT.md`.

Most of the work is mechanical camelCasing; the per-type renames, value
transforms, and judgment calls below are the parts that are *not* mechanical.

---

## 1. Encoding & envelope

- Legacy files are **UTF-16 with a BOM**; emit **UTF-8**, 2-space indent, trailing `\n`.
- Envelope keys → camelCase, fixed output order:
  `sourceId, name, projectId, project, promptLibraryId, promptLibrary, supportedLanguages, operations`.
  - `promptLibraryId` → `""` if absent (importer find-or-creates by project).
  - `projectId` is informational; `""` when the source carries none.
- Per-op keys → camelCase, fixed order: `id, type, name, isFirstOperation, params`.

## 2. Key camelCasing rule ("lower leading acronym run")

Transform the **first** underscore segment only; preserve the rest verbatim.
(Same algorithm as `scripts/camelcase_keys.py` `_camel_segment`.)

- Lowercase a single leading capital: `Source→source`, `Outbound→outbound`.
- An all-caps segment lowercases fully: `CC→cc`, `NL→nl`.
- A run of ≥2 caps followed by lowercase keeps the last cap as the next word's
  start: `IVREvent→ivrEvent`, `ANIConfirmation→aniConfirmation`.
- Trailing acronyms are left by the segment rule: `OutboundANI→outboundANI`.
- Underscore branch keys: only the head changes —
  `NextStep_Success→nextStep_Success`, `NextStep_Guard_Klantwacht→nextStep_Guard_Klantwacht`.

## 3. Operation `Type` renames

Strip any `_vocalls` suffix, then map (every result must be in
`dictionary.json.operationTypes`):

| Legacy `Type` | New `type` |
| --- | --- |
| `SetAttributes` | `setVariables` |
| `SendEmail` | `sendMail` |
| `SendSMS` | `sendSms` |
| `GuardRouting` | `guard` |
| `GuardTUI` | `guardTui` |
| `PlayPrompt` | `say` |
| `PlayAudio` | `play` |
| `LanguageMenu` | `getLanguage` |
| `Menu` | `menu` |
| `Condition` | `condition` |
| `Emergency` | `emergency` |
| `Schedule` | `checkSchedule` |
| `FlowJump` | `flowJump` |
| `Callback` | `callback` |
| `WorkgroupTransfer` | `workgroupTransfer` |
| `ExternalTransfer` | `externalTransfer` |
| `Disconnect` | `disconnect` |

> `condition`, `emergency`, `checkSchedule`, `flowJump` are catalogued (import is
> clean) but **not runtime-registered** — runStep currently skips them to their
> `nextStep` with a warning. Migrate them normally; note it in the report.

## 4. Value transforms (all types)

- **bit → boolean**: `Active: 1 → active: true`, `0 → false`. (Dict `type:"bit"`.)
- **`active` default**: on every non-`disconnect` op where the source omits
  `Active`, emit `active: true` (legacy config rarely set it and historically
  always ran; absent = active). It is the first param in dict order for most types.
- **int → number**: numeric strings for `type:"int"` params become bare numbers
  (`ConfigId:"1" → configId:1`). Non-numeric → leave as string and flag.
- **Array → scalar**: legacy `[value,"isDisplayed","isEditable"]` UI-flag forms
  (seen on some `Prompt`/`Active` params) collapse to the scalar `value`.
- **Tokens** `$(ATTR_x)` → `${rt*}`:
  `$(ATTR_EmailTo)→${rtEmailTo}`, `EmailBody→${rtEmailBody}`,
  `EmailAttachment→${rtEmailAttachment}`, `SMSTo→${rtSmsTo}`, `SMSBody→${rtSmsBody}`.
  ⚠️ These must be populated upstream before the op runs or the placeholder ships
  literally — flag each in the report.

## 5. Per-type param renames, drops, and added defaults

Keys not listed here camelCase straight through (`ConfigName→configName`,
`Statistic→statistic`, `Operator→operator`, `QueueName→queueName`, …). After
transform, **any key not in `dictionary.json` for that type is an `UNKNOWN_PARAM`** —
either it has a rename below, or it is dropped (and reported), or the conversion
fails. Cross-check every output key against the dictionary.

**setVariables** (from `SetAttributes`)
- `IVREvent→ivrEvent`, `IVRAction→ivrAction`, `RoutingId→routingId`.
- **Drop** `CallflowId` (not in dict), `LogAttributes` (PureConnect Cognos
  pipe-list, no runtime consumer).
- On the first op, add `customerName`/`customerProject` by splitting `routingId`
  on the first `_` (judgment call — see §7).

**guard** (from `GuardRouting`)
- `OnHoldAudio→onHoldAudioUrl`, `SendSMS→sendSms`, `SendMail→sendMail`.
- **Drop** `DialGroup` (SIP trunk, not a dict key).
- Add dict-required-but-absent: `outboundANI:""`, `diversion:""`, and
  `acceptCallMessage` (e.g. `"Press 1 to accept the call."`).

**sendMail** (from `SendEmail`)
- `CC→cc`, `Attachment→files`, `Importance:"Normal"→priority:2`
  (`"High"→1`, `"Low"→3` if seen).
- Add: `bcc:""`, `attachmentNames:""`, `attachmentData:""`, `customerKey:""`,
  `timeout:10000`.

**sendSms** (from `SendSMS`)
- `ConfigId→smsAccountId`. (`Routing→routing` mechanically.)
- Add: `timeout:5000`.

**say** (from `PlayPrompt`) / **play** (from `PlayAudio`)
- `ApplicationId→applicationId`, `AudioSource→audioSource` mechanically.
- A `say`/`play` whose `applicationId` is not in `promptApplicationIds` throws
  `UNKNOWN_APPLICATION` — flag, do not invent an id.

**disconnect**
- Terminal. Legacy `Prompt` has no dict slot → reduce to bare `params:{}` and
  flag the dropped prompt (matches the migrated siblings).

For the wider types (`condition`, `emergency`, `checkSchedule`, `callback`,
`externalTransfer`, `menu`, `workgroupTransfer`) the legacy params map cleanly by
camelCasing — confirm each against `dictionary.json` (e.g. `externalTransfer`
keeps `phoneNumber/outboundANI/attendTransfer/timeout`; legacy
`PerformCallAnalysis`/`DiversionReason`/`PhoneNumber` map or drop accordingly).

## 6. Branch keys & ordering

- Emit every op's params **strictly in `dictionary.json` order** for its type,
  including params you invented or defaulted (place them at their dict position,
  not where you happened to add them). This is the `Dic_Attribute.Ord` order the
  SQL exporter uses, so the output round-trips diff-clean through import→export.
- `nextStep*` keys are the dictionary's `branch:true` params. They sort **last**
  within each op, in dict order, with the bare `nextStep` the very last key.
- Dynamic branch keys (`menu.nextStep_0..9`, `checkSchedule.nextStep_Guard_*`)
  are catalogued verbatim — keep their casing after the head transform.

> Note: a few hand-migrated files in `callflow_json_config_vocalls_*/` have minor
> param-order quirks (e.g. `setVariables` emits `customerName, customerProject`
> before `routingId`). Prefer **dict order** — it is the canonical, round-trippable
> contract; the hand files are not authoritative on ordering.

## 7. Judgment calls — apply best-effort, flag every one

These are *not* mechanical. Do them, but record each in the migration report so a
human can confirm:

1. **Invented `customerName`/`customerProject`** — split the first op's
   `routingId` on the first `_` (`DA_KLANTWACHT → customerName:"DA",
   customerProject:"KLANTWACHT"`).
2. **Dropped keys** — `CallflowId`, `DialGroup`, `LogAttributes`, a terminal
   `disconnect` `Prompt`, and any other un-dictionaried key. List name + value.
3. **Added defaults** — every dict-required param absent in the source that you
   filled (`outboundANI:""`, `acceptCallMessage`, `timeout`, mail/sms extras).
4. **Repaired `nextStep*` targets** — any branch pointing at a non-existent op
   `id`. Repair to the intended id (state your reasoning) so `INVALID_NEXTSTEP`
   passes; if it's genuinely dead code, say so.
5. **Placeholders kept verbatim** — e.g. `onHoldAudioUrl` carrying a legacy audio
   NAME (`"TENANT_DA_GUARD"`) rather than a URL; `${rt*}` tokens whose upstream
   producer is unconfirmed. Flag as "replace before production".
6. **Project precondition** — list the `project` name(s) referenced. The
   importer's `UNKNOWN_PROJECT` check needs `rtds.Dic_CompanyProject` to already
   contain them; the seed does not create them. Out of this skill's scope, but
   the report must surface it.

## 8. Validation gate (before claiming success)

Mirror `import_flow_from_json_camelCase.sql` against `dictionary.json`:

- `UNKNOWN_PARAM` — every output param key ∈ `attributes[type]` names.
- `TYPE_MISMATCH` — value matches the param's `type` (bit→bool, int→number, else string).
- `INVALID_NEXTSTEP` — every `branch:true` value resolves to an op `id` in the flow.
- `UNKNOWN_APPLICATION` — every `applicationId` ∈ `promptApplicationIds`.

If any fail and you cannot legitimately fix it, **report and stop** — do not emit
a file you claim is import-ready.
