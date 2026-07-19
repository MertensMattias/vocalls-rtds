# Seed lookups — the authoritative dictionary

`rtds/db_seed/import_seeds_camelCase.sql` is the source of truth for **which op types
exist, which params each type allows, and their data types**. The RTDS importer runs an
UNKNOWN_PARAM check and THROWs 54016 on any uncatalogued key, so a config that uses a
param not in the seed will fail to import. When in doubt about a param name or type,
grep the seed — don't guess. `scripts/validate_config.py` checks every emitted param
against this file automatically, but consulting it while generating avoids the round-trip.

## How to read the seed

Param catalogue rows look like:

```sql
('say',   'active',        'bit', 1, 0, 0, 0),
('say',   'applicationId', 'int', 0, 0, 0, 0),
('menu',  'staticMessage_NL', 'string', 0, 0, 0, 0),
```

Columns: `(type, param, dataType, IsRequired, IsNext, IsDisplayed, IsEditable)`.
`IsNext = 1` marks a step-id / branch key (the `nextStep*` family). Quick greps:

```bash
grep -nE "^\s*\('say'"           rtds/db_seed/import_seeds_camelCase.sql   # all say params
grep -nE "^\s*\('checkSchedule'" rtds/db_seed/import_seeds_camelCase.sql   # schedule branches
grep -nE "^\s*\('menu'"          rtds/db_seed/import_seeds_camelCase.sql   # menu message + branch params
```

Emitted-type param cheat-sheet (verify against the seed if the contract has moved):

| Type | Non-branch params | Branch params (`IsNext`) |
| ---- | ----------------- | ------------------------ |
| `setVariables` | `active`, `routingId`, `customerName`, `customerProject`, `ivrEvent`, `ivrAction`, `keysToLog`, … | `nextStep` |
| `say` | `active`, `applicationId`, `prompt` | `nextStep` |
| `checkSchedule` | `active`, `applicationId`, `scheduleId`, `timeout` | `nextStep_Open/_Closed/_Transfer/_ExternalTransfer/_Disconnect/_Guard_*/_Failure`, `nextStep` |
| `menu` | `active`, `applicationId`, `staticPrompt`, `staticMessage_<LANG>`, `menuChoiceMessage_<key>_<LANG>`, `noChoiceMessage_<LANG>`, `invalidChoiceMessage_<LANG>`, `maxTriesMessage_<LANG>`, `timeout`, `maxTries` | `nextStep_<0-9/*/#>`, `nextStep_DefaultChoice`, `nextStep_Failure`, `nextStep` |
| `internalTransfer` | `active`, `target`, `parameters`, `attendTransfer`, `timeout` | `nextStep_Failure`, `nextStep` |
| `externalTransfer` | `active`, `phoneNumber`, `outboundANI`, `parameters`, `attendTransfer`, `timeout` | `nextStep_Failure`, `nextStep` |
| `disconnect` | (`{}`; a prompt-playing variant may carry `prompt`/`applicationId`) | — |

`ttsMessages` is **not** in the seed — it is an envelope sibling of `params` that the
runtime folds in for prompt-playing ops. Do not treat it as a param.

## `applicationId` — the prompt-application dictionary

`applicationId` on a `say`/`menu`/`checkSchedule` op selects the *prompt application*
(which prompt library / file-prefix bucket the prompt belongs to). The values are a
fixed dictionary — `rtds/db_seed/Dic_PromptApplication.tsv` — with production IDs kept
verbatim (not a 1..N collapse). Use these exact ids:

| id | Name | FilePrefix | use for |
| -- | ---- | ---------- | ------- |
| 1  | Scheduler | Scheduler | `checkSchedule` |
| 2  | Callback  | CB        | callback flows |
| 3  | Survey    | Survey    | survey flows |
| 4  | PreQueue  | PreQueue  | pre-transfer "u wordt doorverbonden" says |
| 5  | Queue     | Queue     | in-queue wait says |
| 6  | AdHocMessages | AdHoc | AdHoc says (usually off by default) |
| 7  | Menu      | Menu      | `menu` ops |
| 11 | Welcome   | Welcome   | welcome say |
| 12 | Voicemail | Voicemail | voicemail |
| 13 | Info      | Info      | informational says |
| 14 | Exception | Exception | the generic exception/failure say |
| 15 | Emergency | Emergency | (legacy — emergency is omitted; unused) |
| 16 | Disconnect | Disconnect | prompt-playing disconnect variant |

(There is no id 8/9/10 — the dictionary is sparse by design.) Pick the id whose Name
matches the op's role: a PreQueue announcement → 4, the menu → 7, the welcome → 11, the
generic exception → 14. If a say's role doesn't map cleanly, note it in the report
rather than guessing an id.
