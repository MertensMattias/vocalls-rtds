# Migration rules — legacy PureConnect → modern camelCase RTDS callflow

The authoritative param contract is `dictionary.json` (generated from
`import_seeds_camelCase.sql`). This file captures the **transforms** that turn a
legacy PureConnect document into a **modernized** config that both imports cleanly
and behaves at runtime.

**This is a modernization, not a 1:1 port.** The legacy corpus was authored for
PureConnect Interaction Designer, which had operation types (Condition, Emergency,
GuardRouting, Callback, PlayAudio) and queue-statistics routing that the RTDS
runtime deliberately **retired** — they carry no component and are not in the
dictionary. A faithful mechanical rename would emit dead types and fail the
validation gate. So the migrator does what a human migrator did by hand: it keeps
the caller-meaningful spine, **drops or rewires** the retired machinery, and puts
the handful of values it cannot derive from the source (queue extensions, guard
numbers) in front of the user.

The reference for the *target behaviour* is the sibling skill
`rtds-flowdata-config-gen` — its `references/target-contract.md` describes the same
12-type contract and the same modernization moves (Emergency omitted, scheduler
prompts not re-emitted, WorkgroupTransfer → internalTransfer). This skill applies
those moves to a **legacy JSON document** instead of a flow's mxGraph XML.

Worked example of the whole transform: legacy
`oldJsonConfig/DIGIPOLIS_DA_HELDPESK_PRD.json` (41 ops) →
`jsonConfig/DA_HELPDESK_PRD_3233387777_V4.json` (17 ops). Read both side by side
before migrating a new file — the target is the golden shape.

---

## 1. Encoding & envelope

- Legacy files are **UTF-16 with a BOM** (some are UTF-8-BOM); emit **UTF-8**,
  2-space indent, trailing `\n`.
- Envelope keys → camelCase, fixed output order:
  `sourceId, name, projectId, project, promptLibraryId, promptLibrary, supportedLanguages, operations`.
  - `sourceId` keeps its literal source value including a leading `+` (`+3233387777`).
  - `projectId` passes through when present; `""` when the source carries none.
  - `promptLibrary` keeps its backslash path verbatim (`DIGIPOLIS\\DA\\HELPDESK`).
  - `promptLibraryId` has **no source** in the legacy document — it is a numeric id
    resolved from the library name (the golden HELPDESK is `"33"`). **[ASK] the
    user** for it (§7), or leave `""` and report it (the importer find-or-creates
    the library by the `promptLibrary` path, so `""` still imports).

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

## 3. Operation `Type` mapping — keep, rename, drop, or rewire

The dictionary defines **12 live types**: `setVariables, say, checkSchedule, menu,
guardTui, guard, disconnect, flowJump, sendSms, externalTransfer, internalTransfer,
sendMail`. Every emitted `type` must be one of these. Legacy types split three ways:

### 3a. Direct renames (the type survives)

| Legacy `Type` | New `type` | Notes |
| --- | --- | --- |
| `SetAttributes` | `setVariables` | Cognos event/action + init |
| `PlayPrompt` | `say` | prompt op; text → `ttsMessages` (§6) |
| `Schedule` | `checkSchedule` | branch keys pass through (§5) |
| `ExternalTransfer` | `externalTransfer` | to a number / scheduler variable |
| `WorkgroupTransfer` | `internalTransfer` | **rewired**, see §4 |
| `Disconnect` | `disconnect` | keeps its `prompt` (§5) |
| `SendSMS` | `sendSms` | only if kept (usually dropped, §3c) |
| `SendEmail` | `sendMail` | only if kept (usually dropped, §3c) |
| `GuardTUI` | `guardTui` | rare in this corpus |
| `Menu` | `menu` | DTMF menu; message shape per target-contract.md |
| `FlowJump` | `flowJump` | |
| `GuardRouting` | `guard` **or rewire** | see §3c — usually collapses to an `externalTransfer` |

Strip any `_vocalls` type suffix before mapping.

### 3b. Dropped types (no modern equivalent — omit + rewire + report)

These PureConnect types are **retired**. Do not emit them, do not try to rename
them — the dictionary has no slot and the validator hard-fails
`emergency`/`workgroupTransfer`/`remoteTransfer`/`localTransfer`. Drop the op,
**rewire its predecessor to the next surviving op on the caller's happy path**, and
list every drop in the report.

| Legacy `Type` | Why dropped | Rewire |
| --- | --- | --- |
| `Condition` | queue-statistics gating (AgentsLoggedIn / CallsWaiting / Time on a `Workgroup`) has no runtime equivalent | route the predecessor to the branch the flow took when the condition was **true on the happy path** — usually the transfer. Collapse the whole condition chain to the single surviving next op. Report each dropped `Condition` with its `Statistic`/`Operator`/`Value`. |
| `Emergency` | emergency-prompt check retired | rewire predecessor (usually an AdHoc say) straight to the next surviving step; drop the emergency say + its transfer + the `1204` emergency Cognos scripts |
| `Callback` | queue-callback offer retired | rewire predecessor to the op the callback's rejected/continue branch pointed at (the caller stays in the transfer path) |
| `PlayAudio` | hold-music / audio-file playback retired as a routing op | drop; if it sat inline on the spine, rewire through it |

### 3c. Rewired types (the op is replaced by a different, simpler op)

- **`GuardRouting` → `externalTransfer` to the guard's phone number.** In this
  corpus the guard path is: `checkSchedule` already emits
  `nextStep_Guard_Klantwacht` / `nextStep_Guard_Systeemwacht` branches (they are in
  the **source** Schedule op — do not invent them), each pointing at a small unit:
  a Cognos `setVariables` (`1204`/`GD01` or `GD02`) → the guard transfer. The legacy
  `GuardRouting` op (with `ConfigId`/`OnHoldAudio`/`DialGuard`/`RecordVoicemail`/…)
  becomes a plain `externalTransfer` whose `phoneNumber` is the **guard line's
  number** — a value the source does **not** contain. **[ASK] the user for it**
  (§7). Its trailing `SendEmail`/`SendSMS` notification ops are **dropped**.
- **`SendEmail` / `SendSMS` as guard/transfer notifications → dropped.** The modern
  guard path is just the transfer; the mail/SMS call-report machinery is retired.
  Keep a `sendMail`/`sendSms` op **only** if it is a caller-facing send on the main
  spine (rare); if in doubt, [ASK]. Report every dropped notification op.

> If a legacy type is not in any table above, it has no modern home: drop it,
> rewire, and report. Never emit a `type` absent from `dictionary.json.operationTypes`.

## 4. `WorkgroupTransfer` → `internalTransfer` (the highest-impact rewire)

Legacy `WorkgroupTransfer` routes to a **named queue** (`QueueName`, e.g.
`DA_HELPDESK_V`) with `Skills`/`Priority`/`EscapeKey`. In the modern contract the
queueing/skills routing happens **downstream at the covering extension**, not in the
config — so the queue becomes an `internalTransfer` to the **extension that covers
that queue**.

- `target` = the covering **extension** (numeric, e.g. `570060`), in triplet form
  `["570060", "isDisplayed", "isEditable"]`. The source has no extension — **[ASK]
  the user** for the `QueueName → extension` mapping (§7).
- **Drop** `QueueName`, `Skills`, `Priority`, `EscapeKey`, `NextStep_EscapeKey`
  (no dict slot) — and report all of them.
- Fill dict params the source lacks:
  - `parameters` = the context-header JSON blob (callIdKey / customerName /
    customerProject) — copy the shape from the golden target verbatim.
  - `attendTransfer: true` (queue transfers are attended).
  - `timeout: 30000`.
  - `nextStep_Failure` = the transfer-not-accepted path (in the golden HELPDESK it
    is the terminal `disconnect`; in flows with an exception unit it points there).
  - `nextStep` = accepted → `disconnect`.

Two consecutive `WorkgroupTransfer` ops to the **same** queue (e.g. a "with
callback" and a "plain" variant) collapse to **one** `internalTransfer`; repoint
refs and report the collapse.

## 5. Value transforms & per-type param handling

### bit / int / tokens
- **bit → boolean**: `Active:1 → active:true`, `0 → false`. Legacy `Active` in
  triplet form (`["1","isEditable"]`, `[1,"isDisplayed","isEditable"]`) → read the
  first element.
- **`active` default**: on every non-`disconnect` op where the source omits
  `Active`, emit `active: true` (legacy config rarely set it and historically always
  ran; absent = active).
- **int → number**: numeric strings for `type:"int"` params become bare numbers
  (`ScheduleID:"1" → scheduleId:1` — note the case fold `ScheduleID→scheduleId`).
- **Tokens** `$(ATTR_x)` → `${rt*}` on any surviving mail/sms op:
  `$(ATTR_EmailTo)→${rtEmailTo}`, `EmailBody→${rtEmailBody}`, `SMSTo→${rtSmsTo}`, …
  Flag each — it must be populated upstream or the placeholder ships literally.

### Triplet (GUI-editable) form — PRESERVE, do not collapse
Legacy `[value, "isDisplayed", "isEditable"]` (and `["1","isEditable"]`) is the
**GUI-editable** marker the Vocalls Designer round-trips. The modern config
**keeps** it on the params that are editable in the Designer:
- `say.active`, `say.prompt`
- `internalTransfer.target`, `externalTransfer.phoneNumber`

Emit `[value, "isDisplayed", "isEditable"]` (normalise the flags to exactly
`"isDisplayed", "isEditable"`; a legacy 2-element `["1","isEditable"]` becomes the
3-element form). Everywhere else (Cognos `setVariables`, `checkSchedule`, `timeout`,
`scheduleId`, …) values are **bare scalars**. When unsure whether a param is
triplet-form, copy the golden target: it is the authority on which keys wear the
triplet.

### Per-type specifics

**setVariables** (from `SetAttributes`)
- `IVREvent→ivrEvent`, `IVRAction→ivrAction`, `RoutingId→routingId`.
- **Drop** `CallflowId` (folded into `routingId`).
- `LogAttributes` (a PureConnect pipe-delimited list of raw attribute names, e.g.
  `RTDS_ProjectName|Eic_RemoteId|ATTR_RoutingId|…`) → **`keysToLog`**, a JSON-string
  array of the modern **camelCase logical** keys (`["customerName","customerProject",
  "routingId","language","ani","dnis","interactionStartTime","routingKey","ivrEvent",
  "ivrAction"]`). This is a **semantic remap**, not a field-for-field rename — the
  golden `keysToLog` is the canonical list; copy it verbatim unless the flow clearly
  logs a different set, and report if you change it.
- On the **first** op ("Call Initialization", `isFirstOperation:true`): take
  `routingId`, normalise `_`→`-` (`DA_HELPDESK → DA-HELPDESK`), and split the two
  halves into `customerName`/`customerProject` (`"DA"`/`"HELPDESK"`). Add
  `active:true` (the legacy init usually had no `Active`).

**say** (from `PlayPrompt`)
- `ApplicationId→applicationId` (bare number). A `say` whose `applicationId` is not
  in `promptApplicationIds` throws `UNKNOWN_APPLICATION` — flag, do not invent.
- The prompt **name** goes in `prompt` (triplet form); the prompt **text** goes in
  the `ttsMessages` envelope sibling (§6).
- A message that is off by default (an AdHoc placeholder) keeps
  `active: [false, "isDisplayed", "isEditable"]` — keep the op, disabled.
- **Open path is always AdHoc → PreQueue → internalTransfer.** Emit a PreQueue say
  (`applicationId` 4) between the AdHoc say and every `internalTransfer`; never wire
  AdHoc straight to the transfer. If the source has no PreQueue prompt, insert the
  standard `PreQueue_PreQueue` say with `active: [false, …]` (disabled — kept, not
  played). Full shape in target-contract.md → "Open-path play sequence".

**checkSchedule** (from `Schedule`)
- `ScheduleID→scheduleId`, `ApplicationId→applicationId`.
- Branch keys pass through the head transform:
  `NextStep_Open/_Closed/_Transfer/_Guard_Klantwacht/_Guard_Systeemwacht/_Failure`.
  These are catalogued in the dictionary — keep the ones the source has.
- The `Transfer` branch leads to an `externalTransfer` whose `phoneNumber` is
  `"${schedulerTransferNumber}"` (runtime fills it from the schedule's actionDetail).

**externalTransfer** (from `ExternalTransfer`, and from rewired `GuardRouting`)
- Keeps `phoneNumber` (triplet), `outboundANI`, `parameters`, `attendTransfer`,
  `timeout`. **Drop** `PerformCallAnalysis`, `DiversionReason`, and the legacy
  `NextStep_Busy`/`NextStep_RNA` branches (fold both into `nextStep_Failure`).
- A source `ExternalTransfer` with an **empty** `PhoneNumber` on the scheduler
  Transfer path → `phoneNumber: ["${schedulerTransferNumber}", …]`.

**disconnect** (from `Disconnect`)
- Terminal. The dictionary **allows** `prompt` (and `applicationId`) on disconnect —
  so a legacy disconnect that named a closing prompt **keeps** it:
  `params: { "prompt": "Exception_Unexpected" }`. A legacy disconnect with **no**
  `Params` → `params: {}`. (This differs from the retired 1:1 rule that stripped the
  prompt — the modern golden keeps it.)
- The legacy `Prompt` value is often a **`.wav` filename**
  (`"Scheduler_ClosedDisconnect.wav"`); strip the `.wav` suffix and resolve to a
  prompt-library **key** — this is a prompt-key resolution, see §7.

## 6. `ttsMessages` — the message text lives OUTSIDE `params`

`ttsMessages` is an **envelope sibling of `params`**, not a param — the seed does
not catalogue it; the runtime folds it into what the `say`/`disconnect` component
speaks. Every `say` (and any `disconnect` that speaks) carries:

```json
"ttsMessages": { "NL": "Welkom bij Digipolis helpdesk." }
```

Source the text from the legacy op's `Text`/message field (entities decoded,
`&#xa;`/`<br>` → space or `\n`). If the legacy op has no inline text, the text is a
value you cannot derive — leave a short placeholder and [ASK]/report it. The
`validate_config.py` whitelists `ttsMessages`; it is not an `UNKNOWN_PARAM`.

## 7. Values the source cannot supply — [ASK] the user (Q/A), never guess

The modernization introduces a few values with **no source in the legacy document**.
Guessing them silently ships a broken flow (a transfer to the wrong extension is
worse than a visible gap). Collect them and **stop for a Q/A confirmation** before
writing — mirror the sibling skill's `[ASK]` gate. Ask, per file, in one batch:

1. **Queue → extension** (WorkgroupTransfer): "The queue `DA_HELPDESK_V` becomes an
   internalTransfer — what extension covers it?" One question per distinct
   `QueueName`.
2. **Guard line number** (rewired GuardRouting): "`GuardRouting DA_KLANTWACHT`
   becomes an externalTransfer — what number should it dial?" One per guard config.
3. **promptLibraryId**: "What is the numeric prompt-library id for
   `DIGIPOLIS\DA\HELPDESK`?" (or accept `""` and let the importer resolve by path).
4. **Prompt-key rewrites**: the legacy prompt names don't always match the target
   library's keys (`Exception_ExceptionAntwerpenBe → Exeption_Telefonie`, a `.wav`
   filename → a key). When a legacy prompt name has no obvious target-library key,
   surface the legacy value and ask for the intended key; keep the legacy value
   verbatim and report it if unresolved.
5. **Ambiguous drops**: any `SendEmail`/`SendSMS`/`Condition`/`Callback` where it is
   not obvious the caller path is unaffected — surface it and confirm the drop.
6. **Unresolved `${rt*}` tokens** whose upstream producer is unconfirmed.

Present these as a numbered Q/A block, wait for answers, apply them, then write.
Everything the source **does** contain (renames, branch wiring, Cognos codes,
schedule branches) you apply directly — the [ASK] gate is only for the genuine gaps.

## 8. Branch keys & ordering

- Emit every op's params **strictly in `dictionary.json` order** for its type,
  including invented/defaulted params (place them at their dict position). This is
  the `Dic_Attribute.Ord` order the SQL exporter uses, so the output round-trips
  diff-clean through import→export.
- `nextStep*` keys are the dictionary's `branch:true` params. They sort **last**
  within each op, in dict order, with the bare `nextStep` the very last key.
- **Op ids & layout:** main caller spine numbered first in call order, then a fixed
  terminal block at the bottom (internalTransfer queue extensions → scheduler
  Cognos-Transfer + externalTransfer → guard units → exception unit → `disconnect`).
  Ids ascend overall. See the golden target and target-contract.md's "Terminal
  block" for the worked layout.

## 9. Validation gate (before claiming success)

Run `scripts/validate_config.py <file>` (bundled) — it mirrors
`import_flow_from_json_camelCase.sql` against the seed and catches the runtime-silent
bugs:

- `UNKNOWN_PARAM` — every output param key ∈ the type's dict names (`ttsMessages`
  whitelisted).
- `TYPE_MISMATCH` — value matches the param's `type` (bit→bool, int→number, else string).
- `INVALID_NEXTSTEP` — every `branch:true` value resolves to an op `id` in the flow.
- `UNKNOWN_APPLICATION` — every `applicationId` ∈ `promptApplicationIds`.
- **No retired types** — `emergency`/`workgroupTransfer`/`remoteTransfer`/`localTransfer`
  must not survive.
- ids ascend, one `isFirstOperation`, reachability, `nextStep` last, terminal disconnect.

Fix every `[FAIL]`. Each `[WARN]` is a report line (a judgment call to confirm). **Do
not claim an import-ready file while any check fails** — report and stop instead.
