# guardTui (KLANTWACHT) callscript -- runtime analysis and target design

Status: revised after review (Variables `&=` writeback semantics corrected)
Scope: the standalone guard TUI callscript (mxGraph source, ConfigName KLANTWACHT),
read against rtds_1_globalConfig.js, rtds_2_runtime.js, rtds_3_vocallsEnv.js and
the component convention in sendSms_example.js.

---

## 1. Current runtime behavior

### 1.1 Flow order

```
input (0)
  -> getEnvironment component (574)          sets environment
  -> api configs (568)                       harness: globals, endpoints
  -> nalOktaAuth component (570)             sets _headers (success or failure both continue)
  -> [rtds] start (567)                      initializeCallFlowContext('full'), varObj ready
  -> init (7)                                __rtParams = __setupConfig(__configJSON)
  -> Validate incoming number (586)          eligibility check (AnyGuardWithPhoneNumberAndConfig)
  -> get agentId (587)                       state lookup (GetGuardByPhoneNumberAndConfig)
  -> case (200)
       denied   -> say ResultDenied (220)            -> output
       failure  -> say ResultError (221)             -> output
       active   -> say CurrentlyActivated (600)      -> pause -> say PromptDeactivate (616)
                   -> dtmf (623): 3 -> toggleDeactivate (635) -> case (450)
                                  no input -> say ResultError (170) -> output
       inactive -> say CurrentlyDeactivated (601)    -> pause -> say PromptActivate (615)
                   -> dtmf (618): 7 -> toggleActivate (637) -> case (550)
                                  no input -> say ResultError (170) -> output
       default  -> output (silent)
case (450): NextStep -> say ResultOnlyActive (461); NextStep_Success -> say ResultDeactivated (460); default -> say ResultError (462)
case (550): NextStep_Success -> say ResultActivated (560); default -> say ResultError (561)
```

### 1.2 Value trace of the next-step mechanism (the core defect)

Node 568 sets a self-referential pointer:

```js
_rtNextStep = "_rtNextStep";
```

All scripts then write through it: `global[_rtNextStep] = <stepId>`.

```
568:  _rtNextStep = "_rtNextStep"             pointer points at itself
586:  global[_rtNextStep] = "00010"           writes global["_rtNextStep"]; pointer destroyed,
                                              _rtNextStep now holds "00010"
586:  global[_rtNextStep] = "00099"           writes stray global "00010"
637:  global[_rtNextStep] = "00011"           writes stray global "00010"
```

Only the FIRST write of the call lands in `_rtNextStep`. Every later write in the
entire call goes to a junk global literally named `"00010"`. `_rtNextStep` stays
frozen at `"00010"`.

Observable symptoms:

- case 550 `_rtNextStep == NextStep_Success` is always false: caller hears
  ResultError even when activation succeeded.
- case 450: same; deactivation success and only-active-member are never spoken.
- case 200 denied/failure branches never fire (their writes went astray); denied
  callers fall through to the default branch and the call ends silently.
- The active/inactive menu branches in case 200 only work by accident, because
  they test `__guardActive` / `__guardTuiGuardId` instead of `_rtNextStep`.

### 1.3 Variables-block bindings (not a defect)

The master-layer Variables block uses the Vocalls binding syntax, not plain JS:

```
__environment = environment;          input:  outer -> component, at entry
__rtBaseUrl = _rtBaseUrl;             input
__rtTui*Endpoint = _rtTui*Endpoint;   input
__rtNextStep &= _rtNextStep;          output: component -> outer, at exit
```

`&=` is the writeback binding: when the component exits, the value of the
component-internal `__rtNextStep` is copied to the embedding flow's
`_rtNextStep`. Consequence for the design: the component's single result
variable is `__rtNextStep` (internal); `_rtNextStep` is owned by the host flow
and is only ever written through this binding. In this standalone harness the
input bindings evaluate before node 568 has set `_rtBaseUrl` etc., which is why
568 re-assigns the `__rt*` variables directly -- harness ordering, correct when
embedded.

### 1.4 Prompt lookup trace (second independent defect)

Say nodes build keys as `'PromptActivate' + '_' + language`. The original 568
set `language = ''` and nothing restored it: `initializeCallFlowContext` writes
`varObj.language = 'NL'` (rtds_1_globalConfig.js:58) but `syncEssentialGlobals`
(rtds_3_vocallsEnv.js:638) does not sync the global `language`. The key became
`'PromptActivate_'`, `getValue` missed, and the default `false` was returned, so
say nodes spoke nothing (or "false").

---

## 2. Defect register

| ID | Location | Defect | Effect |
|----|----------|--------|--------|
| D1 | node 568 + all scripts | `_rtNextStep = "_rtNextStep"` self-pointer; writes via `global[_rtNextStep]` | Only first write lands; all case routing broken (1.2) |
| D2 | node 568 | `language = ''`, never restored; init syncs only varObj.language | All `_<lang>` prompt lookups miss (1.4) |
| D3 | say 560 | Text lacks `{ }` braces | Speaks the literal code string instead of evaluating |
| D4 | all say lookups | `getValue(..., false)` default | Misses produce boolean false as TTS text; use `''` |
| D5 | say 170 | Key `'ResultError'` without `_<lang>` suffix | Key does not exist (only ResultError_NL); always misses |
| D6 | node 568 | Stray bare statement `__rtTuiCheckAccessEndpoint` before its assignment | No-op at best; aborts the rest of the script if the runtime throws on undeclared reads |
| D7 | node 29 | Orphaned legacy script (old combined check+state) with no incoming edge | Dead code; confuses maintenance |
| D8 | case 200 (204, 591) | Requires `typeof __guardTuiGuardId === 'number'` | API may return string ids; brittle; normalize with Number() once |
| D9 | node 7 init | `${CustomerProject}` in ResultCurrentlyActivated resolves once at init, while varObj.customerProject is still the default 'RTDS_RUNTIME' | Spoken text contains the wrong project name |

Withdrawn from an earlier draft: `__rtNextStep &= _rtNextStep;` and the
Variables-block input copies are NOT defects -- they are Vocalls binding syntax
(section 1.3). Do not delete them.

---

## 3. Target design

### 3.1 Principle

Scripts record WHICH outcome happened (a key). The actual step id is resolved
from `__rtParams` exactly once, at the output node, into the component-internal
result variable. The `&=` binding exports it to the host on exit. Case nodes
compare literal strings and never touch the config.

### 3.2 Contract

```
__rtOutcome   component-internal outcome key. Allowed values, exactly the
              Params key names:
              'NextStep' | 'NextStep_Success' | 'NextStep_Denied' | 'NextStep_Failure'
              Initialized to 'NextStep_Failure' in init (safe default: any
              unhandled path exits as failure). Each script assigns it directly
              (plain `=`), at most once per execution path. No global[...]
              indirection.

__rtNextStep  component-internal resolved step id. Written in exactly ONE
              place: output node OnEnter. Exported to the host flow at exit by
              the Variables writeback binding `__rtNextStep &= _rtNextStep;`.

_rtNextStep   host-flow variable that receives the result via the writeback.
              Never written directly by any component node. The harness (568)
              declares it empty: `_rtNextStep = '';`.
```

Output node OnEnter:

```js
__rtNextStep = getValue(__rtParams, __rtOutcome, '');
if (!__rtNextStep) {
    Logger.warn('[guardTui] outcome key unresolved, falling back to failure', { outcome: __rtOutcome });
    __rtNextStep = getValue(__rtParams, 'NextStep_Failure', '');
}
Logger.info('[guardTui] exit', { outcome: __rtOutcome, nextStep: __rtNextStep });
```

Case expressions become:

```js
__rtOutcome == 'NextStep_Denied'      // case 200
__rtOutcome == 'NextStep_Failure'
__rtOutcome == 'NextStep_Success'     // cases 450, 550
__rtOutcome == 'NextStep'             // case 450 only-active-member
```

The `global[__nextStep]` name-indirection pattern remains reserved for the
generic reusable RTDS component (sendSms_example.js), where the embedding flow
chooses the output variable name. Inside this component the `&=` binding
already does the export, so no indirection is needed.

### 3.3 Naming conventions (decided)

| Prefix | Meaning | Examples |
|--------|---------|----------|
| `__` | Component-internal working variable; meaningless outside the component | `__rtParams`, `__rtOutcome`, `__rtNextStep`, `__guardTuiGuardId` |
| `_` | Host-flow contract variable; crosses the component boundary via bindings | `_rtNextStep` (receives `__rtNextStep` via `&=`), `_rtBaseUrl`, `_headers`, `_errorMessage` |
| none | Platform/runtime global owned by Vocalls or the rtds libraries | `language`, `varObj`, `environment`, `context` |

Rules:

1. Never assign to a no-prefix platform global from a callscript node, except
   through the documented init path (rule 5 below for `language`).
2. `__rtOutcome` values are the literal Params key names, not invented synonyms
   ('success', 'ok', ...). One vocabulary, greppable against __configJSON.
3. Guard state globals keep the component prefix: `__guardTuiGuardId`,
   `__guardActive`, `__guardName`, `__guardConfigID`. Normalize the id once:
   `__guardTuiGuardId = Number(__resultObj[0].guardID) || 0;` and test
   `__guardTuiGuardId > 0` (drops the typeof check, fixes D8).
4. Config text keys: `<Name>_<LANG>` with LANG uppercase (PromptActivate_NL).
   Lookup is case-insensitive via getValue, but files stay uppercase.
5. `language` is normalized once, in the init node: keep the runtime value when
   set, uppercase it, default 'NL'. No other node writes `language`.

### 3.4 Say node conventions

1. Text is always a braced expression: `{getValue(__rtParams, '<Key>_' + language, '')}`.
2. Default is always `''`, never `false`.
3. API truthiness: compare HTTP response bodies with
   `String(__resultObj).toLowerCase() === 'true'`. Neither `if (__resultObj)`
   (string "false" is truthy) nor `__resultObj !== 'true'` (boolean true fails
   a strict string compare) is safe.
4. Tokens like `${CustomerProject}` that must reflect call-time state are NOT
   baked into __configJSON defaults resolved at init; either resolve them at
   speak time or ensure varObj is final before `__setupConfig` runs (D9 -- for
   KLANTWACHT, set varObj.customerProject before init node 7).

---

## 4. Migration spec (per node)

| Node | Change |
|------|--------|
| master Variables | No change. `=` lines are input bindings, `&=` is the output writeback (1.3). |
| 568 api configs | `_rtNextStep = "_rtNextStep";` -> `_rtNextStep = '';` (host output declaration). Delete stray bare `__rtTuiCheckAccessEndpoint` line (D6). Must not write `language`. |
| 7 init | Add `__rtOutcome = 'NextStep_Failure';` and `__rtNextStep = '';`. Normalize `language` (3.3 rule 5). |
| 586 validate | Replace every `global[_rtNextStep] = getValue(__rtParams, 'X', '')` with `__rtOutcome = 'X';`. Paths: inactive -> 'NextStep'; missing config/ani -> 'NextStep_Failure'; HTTP fail -> stays 'NextStep_Failure'; response not true -> 'NextStep_Denied'; eligible -> leave 'NextStep_Failure' staged until 587 confirms. Log `outcome` instead of nextStep. |
| 587 get agentId | Same replacement. Success -> `__rtOutcome = 'NextStep';`. Normalize `__guardTuiGuardId = Number(...) || 0` (D8). |
| 635 toggleDeactivate | Delete commented-out legacy block. Failure -> 'NextStep_Failure'; response true -> 'NextStep_Success'; response false (only active member) -> 'NextStep'. Truthiness per 3.4 rule 3. |
| 637 toggleActivate | Failure -> 'NextStep_Failure'; success -> 'NextStep_Success'. Truthiness per 3.4 rule 3. |
| case 200 | `__rtOutcome == 'NextStep_Denied'`, `__rtOutcome == 'NextStep_Failure'`, `__guardActive && __guardTuiGuardId > 0`, `!__guardActive && __guardTuiGuardId > 0`, default. |
| case 450 | `__rtOutcome == 'NextStep'` (only-active), `__rtOutcome == 'NextStep_Success'`, default. |
| case 550 | `__rtOutcome == 'NextStep_Success'`, default. |
| say 560 | Add braces (D3). |
| say 170 | Key -> `'ResultError' + '_' + language` (D5). |
| all say nodes | Default `false` -> `''` (D4). |
| output 6 | OnEnter: resolution block from 3.2 (single writer of `__rtNextStep`). |
| node 29 | Delete, including its edge to case 200 (D7). |

Order of edits: 568 first, then init, then the four scripts, then cases, then
says, then output, then delete node 29. The script (586/587/635/637) and case
edits must land in the same pass -- a leftover `global[_rtNextStep]` write
alongside the new contract reintroduces the stray-global bug.

---

## 5. Validation checklist

1. Grep the callscript XML for `global[_rtNextStep]` -- zero hits.
2. Grep for `language = ''` and `_rtNextStep = "_rtNextStep"` -- zero hits.
3. Case Expression attributes contain no `getValue(__rtParams` -- cases compare
   `__rtOutcome` literals (or guard flags) only.
4. Every say Text matches `{getValue(__rtParams, '<Key>_' + language, '')}`.
5. Single writer: `__rtNextStep =` appears only in output node OnEnter (plus
   the `''` initialization in init).
6. Test calls (acc): eligible+activate (hear ResultActivated, exit 00011),
   eligible+deactivate as only member (hear ResultOnlyActive, exit 00010),
   denied number (hear ResultDenied, exit 00012), API down (hear ResultError,
   exit 00099), no DTMF input (hear ResultError, exit 00099).
7. Log assertions per test call: exactly one `[guardTui] exit` line with
   matching `{ outcome, nextStep }`; no `unresolved placeholder` warnings; no
   stray globals named like step ids ("00010") in the session dump.
