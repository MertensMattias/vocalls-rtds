# Target config contract

Golden example: `callflow_json_config/DIGIPOLIS_DA_HELDPESK_PRD.json`
(content is canonical; its UTF-16 encoding is legacy — write new files UTF-8).
`callflow_json_config/DA_SW_OMGEVINGEN_2ND_LINE.json` is an earlier generation:
its envelope/say/transfer shapes are right, but it still contains an
`emergency` op — **do not copy that**; emergency is now omitted.

Authoritative dictionary for types and param names:
`rtds/db_seed/import_seeds_camelCase.sql` (`@OperationType`, `@Attribute`).

## Envelope

```json
{
    "sourceId": "+3233387777",
    "name": "DIGIPOLIS - DA_HELPDESK",
    "project": "DA HELPDESK",
    "promptLibrary": "DIGIPOLIS\\DA\\HELPDESK",
    "supportedLanguages": "NL",
    "operations": [ ... ]
}
```

- `supportedLanguages` from the master layer `Languages` blob (`nl` → `NL`;
  join multiples with `,`).
- Operation envelope keys are camelCase exact-match: `id`, `type`, `name`,
  `isFirstOperation` (first op only), `params`, `ttsMessages`.

## Conventions that apply to every operation

- `id`: 5-digit zero-padded string. Conventional bands (follow unless the flow
  forces otherwise): `00000` init, `00001–00003` welcome/exception says,
  `00004` checkSchedule, `00010–00013` Cognos setVariables (Open/Closed/
  Transfer/Failure), `00020s` says, `00040s` scheduler transfer, `00050+`
  menus/branching, `00060s` main transfer, `00080s` guards, `00098/00099`
  error path, `00100` disconnect.
- `params.nextStep` is **always the last key**, after all `nextStep_*` branch
  keys. Every `nextStep_*` and `nextStep` must reference an existing op id.
- GUI-editable params use the triplet form
  `[value, "isDisplayed", "isEditable"]` — used for `say.active`,
  `say.prompt`, transfer `phoneNumber`/`target`.
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
    "nextStep": "00001" } }
```

`routingId` = the XML init script's `varObj.routingKey`.

### setVariables — Cognos event

```json
{ "id": "00010", "type": "setVariables", "name": "Set: Cognos Open",
  "params": { "active": true, "ivrEvent": "1200", "ivrAction": "CT",
              "nextStep": "..." } }
```

Take event/action pairs from the XML scripts. Observed codes: init `9999/CT`;
Open `1200/CT`; Closed `1201/DC`; Transfer `1200|1201/TX`; Guard `1204/GD01`
(Klantwacht) / `1204/GD02` (Systeemwacht); scheduler error → treat as Open
(`1200/CT`).

### say

```json
{ "id": "00001", "type": "say", "name": "Play: Welcome",
  "params": {
    "active": [true, "isDisplayed", "isEditable"],
    "applicationId": 11,
    "prompt": ["Welcome_Welcome", "isDisplayed", "isEditable"],
    "nextStep": "..." },
  "ttsMessages": { "NL": "Welkom bij ..." } }
```

- `applicationId` (prompt application): Scheduler=1, AdHoc=6, Welcome=11,
  Voicemail=12, Info=13, Exception=14 (Emergency=15 is legacy — unused).
- `prompt` name: reuse the library's names when known (golden config), else
  a descriptive `"unknown"`-free guess is NOT allowed — use `"unknown"`.
- `ttsMessages.<LANG>` = the XML `Text` (and `Text_<lang>`), entities decoded,
  `&#xa;`/`<br>` → `\n`.
- An AdHoc message that is off by default gets
  `"active": [false, "isDisplayed", "isEditable"]` — keep the op, disabled.

### checkSchedule

```json
{ "id": "00004", "type": "checkSchedule", "name": "Check: Scheduler",
  "params": {
    "active": true, "applicationId": 1, "scheduleId": 4,
    "nextStep_Open": "00010", "nextStep_Closed": "00011",
    "nextStep_Transfer": "00012", "nextStep_Failure": "00013",
    "nextStep": "00013" } }
```

- Branches from the XML `apiSuccess` case: `'Open'`/`'Closed'`/`'Transfer'`
  expressions; the `default` (Error) branch → `nextStep_Failure` **and**
  `nextStep` (fallback = failure target). Dictionary also allows
  `nextStep_ExternalTransfer`, `nextStep_Disconnect`,
  `nextStep_Guard_ICT/_Klantwacht/_Systeemwacht` when the flow has guard
  paths (see golden config).
- The Transfer branch is followed by an `externalTransfer` whose
  `phoneNumber` is `"${schedulerTransferNumber}"` (runtime fills it from the
  schedule's actionDetail; the XML equivalent was `{_transferNumber}`).

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
    "nextStep_Failure": "...", "nextStep": "..." } }
```

`nextStep_Failure` = the XML redirect's "not accepted" branch (often a
"exceptionally closed" say); `nextStep` = accepted → disconnect.

### externalTransfer

Plain number or scheduler-provided variable, no context payload:

```json
{ "id": "00040", "type": "externalTransfer", "name": "Route-To: <label>",
  "params": {
    "active": true,
    "phoneNumber": ["${schedulerTransferNumber}", "isDisplayed", "isEditable"],
    "outboundANI": "", "parameters": "",
    "attendTransfer": false, "timeout": 30000,
    "nextStep_Failure": "...", "nextStep": "..." } }
```

### disconnect

```json
{ "id": "00100", "type": "disconnect", "name": "RTDS: Disconnect", "params": {} }
```

A prompt-playing variant may carry `"prompt"` (see golden config `00099`).

## Modernization rules (delta vs. the live XML)

1. **Emergency: omit.** Drop the `emergencyActive`/`emergencyAction` cases,
   the 1204 emergency Cognos scripts, the emergency say and its transfer.
   Rewire the predecessor (usually the AdHoc say) straight to the next
   surviving step. The scheduler (checkSchedule + guard/exception says)
   replaces this mechanism.
2. **workgroupTransfer → internalTransfer / externalTransfer** by target kind
   (queue extension + context headers vs. phone number/variable). Never emit
   `workgroupTransfer`, `remoteTransfer`, or `localTransfer` — the latter two
   do not exist in the dictionary.
3. Log-only scripts, `initializeCallFlowContext`, auth `component` nodes,
   `pause`/`label`/`counter` nodes and global libraries produce **no**
   operations.
4. Other node types with a dictionary equivalent map 1:1 (`menu` for DTMF
   choice menus, `getLanguage`, `play`, `condition`, `flowJump`, `callback`,
   `voicemailCallback`) — check their param lists in the seed before emitting.
