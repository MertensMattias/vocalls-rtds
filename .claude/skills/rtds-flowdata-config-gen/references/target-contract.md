# Target config contract

Live examples (current contract, UTF-8):
- `jsonConfig/digipolis_stad/DA_LOKET_BEVOLKING.json` — minimal flow (init → schedule
  → adhoc → transfer → disconnect), no menu.
- `jsonConfig/digipolis_stad/DA_MPA.json` — flow **with** a DTMF menu.
  ⚠️ Its `menu` op predates the component-native menu shape (text in `ttsMessages` +
  `staticPrompt`) and is **silent at runtime** — do NOT copy its menu op. Use the menu
  shape in this file. Everything else in it is fine.

Authoritative dictionary for types and param names:
`rtds/db_seed/import_seeds_camelCase.sql` (the `('type','param',...)` VALUES tuples).
The importer runs an UNKNOWN_PARAM check and THROWs 54016 on any uncatalogued key, so
every param you emit must exist there. `scripts/validate_config.py` checks this for you.

Legacy note: `oldJsonConfig/DIGIPOLIS_DA_HELDPESK_PRD.json` is the historical golden
file (UTF-16, older shape) — reference only, do not copy verbatim.

## Output location

Write to `jsonConfig/digipolis_stad/<FLOW with - → _>.json`, **UTF-8 (no BOM)**,
4-space indent. Use the `ACC/` or `PRD/` subfolder only when the flow is explicitly an
ACC- or PRD-specific line (the SourceId / metadata says so); otherwise the top-level
`digipolis_stad/` dir.

## Envelope

```json
{
    "sourceId": "+3233387777",
    "name": "DIGIPOLIS - DA_HELPDESK",
    "project": "DIGIPOLIS_CC",
    "promptLibrary": "DIGIPOLIS\\DA\\HELPDESK",
    "supportedLanguages": "NL",
    "operations": [ ... ]
}
```

- `supportedLanguages` from the master layer `Languages` blob (`nl` → `NL`;
  join multiples with `,`).
- Operation envelope keys are camelCase exact-match: `id`, `type`, `name`,
  `isFirstOperation` (first op only), `params`, `ttsMessages`.
- `ttsMessages` is an envelope sibling of `params`, **not** a param — the seed does not
  catalogue it; the runtime folds it into the config `say`/prompt components read.

## Conventions that apply to every operation

- `id`: 5-digit zero-padded string. **Layout = main spine first, then a fixed terminal
  block.** Number the main caller journey in call order, then put all end-of-call ops in
  a terminal block at the bottom (see "Terminal block" below). Ids ascend overall;
  `validate_config.py` checks it. Bands (defaults):
  - **Spine:** `00000` init, `00004` checkSchedule, `0001x` Cognos setVariables
    (Open/Closed/Transfer), `0002x` welcome/AdHoc/PreQueue says, `0003x` menu + its
    choice setVariables, `0005x` menu-choice PreQueue says. The direct Open path always
    runs **AdHoc → PreQueue → internalTransfer** (see "Open-path play sequence" below) —
    e.g. AdHoc `00024` → PreQueue `00025` → internalTransfer `00060`.
  - **Terminal block:** `0006x` internalTransfer ops (queue extensions) → `0007x`
    scheduler Cognos-Transfer + externalTransfer → `0008x` the exception unit
    (`9999`/`DC` Cognos → `Exception_Unexpected` say) → `00100` disconnect.

  A terminal offshoot (the scheduler externalTransfer especially) goes in the terminal
  block even though the schedule case reaches it early — it leads straight to end-of-call,
  so it belongs at the tail, not wedged mid-spine.
- `params.nextStep` is **always the last key**, after all `nextStep_*` branch keys.
  Every `nextStep_*` and `nextStep` must reference an existing op id.
- GUI-editable params use the triplet form `[value, "isDisplayed", "isEditable"]` —
  used for `say.active`, `say.prompt`, transfer `phoneNumber`/`target`.
- `${var}` placeholders resolve session variables at runtime
  (e.g. `"${schedulerTransferNumber}"`).

## Operation shapes

### setVariables — init (first op)

```json
{ "id": "00000", "type": "setVariables", "name": "Call Initialization",
  "isFirstOperation": true,
  "params": {
    "active": true,
    "keysToLog": "[\"customerName\", \"customerProject\", \"routingId\", \"language\", \"ani\", \"dnis\", \"interactionStartTime\", \"routingKey\", \"ivrEvent\", \"ivrAction\" ]",
    "customerName": "DA", "customerProject": "HELPDESK",
    "routingId": "DA-HELPDESK",
    "ivrEvent": "9999", "ivrAction": "CT",
    "nextStep": "00004" } }
```

`routingId` = the XML init script's `varObj.routingKey`.

### setVariables — Cognos event

```json
{ "id": "00010", "type": "setVariables", "name": "Set: Cognos Open",
  "params": { "active": true, "ivrEvent": "1200", "ivrAction": "CT",
              "nextStep": "..." } }
```

Take event/action pairs from the XML scripts. Observed codes: init `9999/CT`;
Open `1200/CT`; Closed `1201/DC`; Transfer `1200|1201/TX`; DTMF choices `3001+/CT`
(one per key). Scheduler **failure** → treat as Open (see checkSchedule below).

Give each Cognos step a distinct purpose; if two setVariables ops end up with
identical params, collapse them to one and repoint refs (`validate_config.py` WARNs on
duplicates).

### say

`say` plays a single prompt; its **text lives in `ttsMessages`** (the runtime folds it
in, `say.js` reads `ttsMessages[<language>]`). The seed catalogues only 4 say params:
`active`, `applicationId`, `prompt`, `nextStep`.

```json
{ "id": "00055", "type": "say", "name": "Play: PreQueue (Lager)",
  "params": {
    "active": [true, "isDisplayed", "isEditable"],
    "applicationId": 4,
    "prompt": ["PreQueue_KleuterOnderwijs", "isDisplayed", "isEditable"],
    "nextStep": "00060" },
  "ttsMessages": { "NL": "U wordt zo dadelijk doorverbonden." } }
```

- `applicationId` (prompt application): the fixed dictionary in
  [seed-lookups.md](seed-lookups.md) (`Dic_PromptApplication`) — Scheduler=1,
  PreQueue=4, AdHoc=6, Menu=7, Welcome=11, Voicemail=12, Info=13, Exception=14. Pick
  the id whose Name matches the op's role.
- `prompt` name: resolve from the flow's transcript (see
  [prompt-keys.md](prompt-keys.md)); use `"unknown"` only when no key matches, and
  report it.
- `ttsMessages.<LANG>` = the resolved transcript text (or the XML `Text` if no
  transcript), entities decoded, `&#xa;`/`<br>` → space or `\n`.
- An AdHoc message that is off by default gets
  `"active": [false, "isDisplayed", "isEditable"]` — keep the op, disabled.

**Open-path play sequence (AdHoc → PreQueue → internalTransfer).** Every flow whose
Open path reaches an `internalTransfer` plays, in this order: the **AdHoc** say
(`applicationId` 6), then a **PreQueue** say (`applicationId` 4), then the
`internalTransfer`. Never wire AdHoc straight to the transfer.

- The PreQueue say is **always emitted**, even when the source flow has no PreQueue
  prompt. When the source supplies one, keep it active. When it does **not**, insert a
  standard disabled PreQueue say — same "keep the op, disabled" pattern as AdHoc:

  ```json
  { "id": "00025", "type": "say", "name": "Play: PreQueue",
    "params": {
      "active": [false, "isDisplayed", "isEditable"],
      "applicationId": 4,
      "prompt": ["PreQueue_PreQueue", "isDisplayed", "isEditable"],
      "nextStep": "00060" },
    "ttsMessages": { "NL": "U wordt zo dadelijk doorverbonden" } }
  ```

  So a caller hears it only where the flow intends to; the op is present (ready to
  enable) everywhere else. `PreQueue_PreQueue` on `applicationId` 4 is the standard
  fallback key — do **not** use `applicationId` 13 (Info) for a PreQueue prompt.
- A source AdHoc that routes directly to the transfer is repointed at the PreQueue say,
  and the PreQueue say routes to the `internalTransfer`.

**Generic exception say (default op).** Add a standard say (id in the `0007x` band)
carrying `Exception_Unexpected` — "Wegens onvoorziene storingen kunnen wij momenteel uw
oproep niet beantwoorden. Gelieve ons te verontschuldigen en op een later tijdstip
terug te bellen." — because transfers point their `nextStep_Failure` at it. This is a
Vocalls-side failure message, unrelated to the scheduler.

### checkSchedule

```json
{ "id": "00004", "type": "checkSchedule", "name": "Check: Scheduler",
  "params": {
    "active": true, "applicationId": 1, "scheduleId": 4,
    "nextStep_Open": "00010", "nextStep_Closed": "00011",
    "nextStep_Transfer": "00012",
    "nextStep_Failure": "00010",
    "nextStep": "00010" } }
```

- Branches from the XML `apiSuccess` case: `Open` / `Closed` / `Transfer`.
- **Failure collapses into Open.** Point `nextStep_Failure` (and the default
  `nextStep`) at the **Open** Cognos step — do NOT emit a separate "Scheduler Error
  (treat as Open)" op. A scheduler error is an operational failure, not a distinct
  caller state, so it should behave exactly like Open; one fewer op to keep in sync.
- Seed also allows `nextStep_ExternalTransfer`, `nextStep_Disconnect`, and
  `nextStep_Guard_ICT/_Klantwacht/_Systeemwacht` when the flow has those paths.
- The Transfer branch is followed by an `externalTransfer` whose `phoneNumber` is
  `"${schedulerTransferNumber}"` (runtime fills it from the schedule's actionDetail;
  the XML equivalent was `{_transferNumber}`).

**The scheduler plays its own Closed/Exception/… prompts.** `checkSchedule` is a
composite op: when the schedule action asks for a prompt, the API returns the text
inline and the component speaks it via an embedded say (`rtds/specs/scheduler.spec.md`).
So do **not** create a `say` op for any `Scheduler_*` message, and route the Closed
branch straight to `disconnect` (or a transfer). See
[prompt-keys.md](prompt-keys.md) → "`Scheduler_*` → NOT a routing-table op".

(Type name is `checkSchedule` — matches the seed and the shipped component. The spec
header calls it `schedule`; the seed/component/config name `checkSchedule` is correct.)

### menu (DTMF choice menu)

The `menu` component builds its spoken prompt from the **message Params**
`staticMessage_<LANG>` / `menuChoiceMessage_<key>_<LANG>` — it does **not** read
`ttsMessages`. Putting the menu text in `ttsMessages` makes the menu silent at runtime.

```json
{ "id": "00030", "type": "menu", "name": "Menu: Inschrijvingen Onderwijs",
  "params": {
    "active": true,
    "staticMessage_NL": "Welkom bij de helpdesk Meld je aan. Voor vragen over inschrijven in het kleuter of lager onderwijs, druk 1. Voor vragen over inschrijven in het secundair onderwijs, druk twee. Voor vragen over inschrijven in het buitengewoon onderwijs, druk 3.",
    "invalidChoiceMessage_NL": "We hebben uw keuze niet herkend. Probeer opnieuw alstublieft.",
    "maxTriesMessage_NL": "U wordt zo dadelijk doorverbonden.",
    "timeout": 8000,
    "maxTries": 2,
    "nextStep_1": "00031",
    "nextStep_2": "00032",
    "nextStep_3": "00033",
    "nextStep_DefaultChoice": "00031",
    "nextStep": "00031" } }
```

- Message text: give a whole-menu `staticMessage_<LANG>` (from the transcript
  `Menu_Main`), **or** per-key `menuChoiceMessage_<key>_<LANG>` segments — not both;
  `staticMessage` wins when present. Re-prompt slots map from the transcript:
  `Menu_WrongChoice → invalidChoiceMessage_<LANG>`,
  `Menu_NoMoreTries → maxTriesMessage_<LANG>` (see [prompt-keys.md](prompt-keys.md)).
- `timeout`: **milliseconds** (component default 10000). Harvest from the source `dtmf`
  node's `Timeout`. `maxTries`: from the retry `counter`'s `< N` expression.
- `nextStep_<key>` for each offered digit (`1`-`9`, `0`, `*`, `#`); a non-empty value
  defines the keypad. `nextStep_DefaultChoice` = the no-input/exhaustion fallback.
- `applicationId`/`staticPrompt` are seed-catalogued legacy-import compat keys that the
  component does **not** consume at runtime — omit them unless a legacy importer needs
  them; they never drive playback.
- Full param contract + component internals: `rtds/specs/menu.spec.md`,
  `rtds/components/menu.js`.

### internalTransfer (replaces workgroupTransfer)

Queue/workgroup/Tringer extension, context headers, usually attended:

```json
{ "id": "00060", "type": "internalTransfer", "name": "Route-To: <queue>",
  "params": {
    "active": true,
    "target": ["570060", "isDisplayed", "isEditable"],
    "parameters": "{\r\n                    \"callIdKey\": \"${callIdKey}\",\r\n                    \"customerName\": \"${customerName}\",\r\n                    \"customerProject\": \"${customerProject}\"\r\n                }",
    "attendTransfer": true,
    "timeout": 30000,
    "nextStep_Failure": "00080", "nextStep": "00100" } }
```

`nextStep_Failure` = the XML redirect's "not accepted" branch — points at the **exception
unit** (`00080`, below); `nextStep` = accepted → `disconnect` directly (no Cognos marker).

### externalTransfer

Plain number or scheduler-provided variable, no context payload:

```json
{ "id": "00070", "type": "externalTransfer", "name": "Route-To: Scheduler Transfer Number",
  "params": {
    "active": true,
    "phoneNumber": ["${schedulerTransferNumber}", "isDisplayed", "isEditable"],
    "outboundANI": "", "parameters": "",
    "attendTransfer": false, "timeout": 30000,
    "nextStep_Failure": "00100", "nextStep": "00100" } }
```

### The exception unit (`nextStep_Failure` target)

A transfer failure ("not accepted") is logged and announced before hanging up. This is a
three-op unit at the tail — the **only** disconnect path that sets a Cognos marker:

```json
{ "id": "00080", "type": "setVariables", "name": "Set: Cognos Unknown Exception",
  "params": { "active": true, "ivrEvent": "9999", "ivrAction": "DC", "nextStep": "00081" } },
{ "id": "00081", "type": "say", "name": "Play: Exception",
  "params": {
    "active": [true, "isDisplayed", "isEditable"],
    "applicationId": 14,
    "prompt": ["Exception_Unexpected", "isDisplayed", "isEditable"],
    "nextStep": "00100" },
  "ttsMessages": { "NL": "Wegens onvoorziene storingen kunnen wij momenteel uw oproep niet beantwoorden. Gelieve ons te verontschuldigen en op een later tijdstip terug te bellen." } },
```

Transfers point `nextStep_Failure` at `00080` (the `9999`/`DC` op), which flows to the
`Exception_Unexpected` say (`00081`) → `disconnect`. Every **other** end-of-call path
(Closed, accepted-transfer completion, scheduler externalTransfer end) goes to
`00100` **directly** — no Cognos marker. Precedent: the TUI configs' `00099` `9999`/`DC`
→ `00100`.

### disconnect

```json
{ "id": "00100", "type": "disconnect", "name": "RTDS: Disconnect", "params": {} }
```

## Terminal block — worked ordering

The bottom of every config is a fixed block, in this order (a scheduler-less flow just
omits the rows it doesn't have):

```
0006x  internalTransfer  (queue extensions; nextStep_Failure -> 00080)
0007x  setVariables Cognos-Transfer + externalTransfer (scheduler ${schedulerTransferNumber})
00080  setVariables Cognos 9999/DC  (Unknown Exception)   |  exception unit
00081  say Exception_Unexpected (applicationId 14)         |  (only marker-setting disconnect)
00100  disconnect
```

## Modernization rules (delta vs. the live XML)

1. **Emergency: omit.** Drop the `emergencyActive`/`emergencyAction` cases, the 1204
   emergency Cognos scripts, the emergency say and its transfer. Rewire the predecessor
   (usually the AdHoc say) straight to the next surviving step.
2. **Scheduler prompts: don't re-emit.** A source `say` that plays a scheduler
   closed/holiday/exception message on the scheduler's closed path → **drop it**; wire
   that branch to `disconnect`. The scheduler plays those in-component.
3. **Scheduler failure: collapse into Open** — no separate `00013` op.
4. **workgroupTransfer → internalTransfer / externalTransfer** by target kind (queue
   extension + context headers vs. phone number/variable). Never emit
   `workgroupTransfer`, `remoteTransfer`, or `localTransfer`.
5. Log-only scripts, `initializeCallFlowContext`, auth `component` nodes,
   `pause`/`label`/`counter` nodes and global libraries produce **no** operations.
6. `menu` for DTMF choice menus — component-native message shape above (not
   `ttsMessages`). Other node types with a dictionary equivalent map 1:1 — check their
   param lists in the seed before emitting.
7. **Open path always AdHoc → PreQueue → internalTransfer.** Emit a PreQueue say
   (`applicationId` 4) between the AdHoc say and every `internalTransfer`. If the source
   has no PreQueue prompt, insert the standard `PreQueue_PreQueue` say with
   `"active": [false, …]` (disabled — kept, not played). See "Open-path play sequence"
   in the `say` section.
7. **Validate** with `scripts/validate_config.py <file>` before writing the report —
   it catches uncatalogued params, dangling refs, non-ascending ids, unreachable ops,
   silent menus, and duplicate ops.
