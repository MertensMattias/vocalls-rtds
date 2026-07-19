# Reading the flowData mxGraph XMLs

Each `flowData/<FLOW>.xml` is a Vocalls Designer canvas export of the *live*
legacy flow. Run `scripts/extract_flow.py <xml>` — it returns
`{master, nodes, edges}` with layout/global-library/component-internals
stripped. Interpret as follows.

## Master layer

- `master.Variables` — flow-scoped defaults (`adhocWelcome = false;
  emergencyActive = false; transferNumber = ''; ...`). Use to decide default
  `active` flags (e.g. AdHoc say off by default).
- `master.Languages` — language map (`nl` → envelope
  `supportedLanguages: "NL"`; TTS voice info is not carried into the config).

## Node types → what to collect

| Type | Meaning | Collect |
| ---- | ------- | ------- |
| `start`, `dial` | entry chain | ordering only |
| `script` label `init` | sets `varObj.routingKey`, ivrEvent 9999/CT | `routingId`, init Cognos pair |
| `script` label `ScheduleAPI` | calls `schedulingApi`; sets `apiSuccess`, `_transferNumber` | becomes `checkSchedule` |
| `script` label `event: NNNN action: XX` | Cognos marker | becomes `setVariables` |
| `script` label `Log` / `initializeCallFlowContext` | plumbing | nothing |
| `say` | prompt playback | `Text` (+`Text_<lang>`), label; becomes `say` + `ttsMessages`. **BUT** if it plays a scheduler closed/holiday/exception message on the scheduler's closed path, **drop it** — the scheduler plays that in-component (see below). |
| `case` + child `expression`/`default` | branch on variable | flow structure; `apiSuccess` case = schedule branches; `adhocWelcome` case = whether AdHoc say plays; `emergency*` cases = **dropped** |
| `redirect` (+ child `attend`/`blind`/`default "not accepted"`) | transfer | `Destination`, `TransferType`, `Parameters`; becomes internal/externalTransfer; the `default` child's outgoing edge = `nextStep_Failure` |
| `hung` | hangup | becomes `disconnect` (dedupe: one disconnect op can serve many hung nodes) |
| `component` (nalOktaAuth, getEnvironment) + `transient` outputs | API auth plumbing | nothing — the runtime handles auth |
| `dtmf` (+ `choice`/`noInput` children) + retry `counter` (MELDJEAAN, MPA) | DTMF menu | becomes `menu` — harvest as below |
| `setvar` (MPA) | variable write | fold into a `setVariables` op |

## DTMF menu → `menu` op (harvest carefully)

A DTMF menu in the XML is a `dtmf` node with `choice` children (one per key) and a
`noInput` child, usually preceded by a `say` that reads the options and followed by a
retry `counter`. Map it to a single `menu` op:

- Each `choice` node's `Key` → a `nextStep_<key>` branch (wired to whatever that
  choice's edge leads to). The set of offered keys = the choices present.
- The `noInput` child + the retry `counter` → `nextStep_DefaultChoice` (the
  no-input/exhaustion fallback).
- The `dtmf` node's `Timeout` attribute → `menu.timeout` (**milliseconds**).
- The retry `counter`'s `< N` expression → `menu.maxTries` (N).
- The menu's spoken text (from the preceding say's `Text`, or the transcript
  `Menu_Main`) → **`staticMessage_<LANG>`**, or per-key lines →
  `menuChoiceMessage_<key>_<LANG>`. **Not `ttsMessages`** — the menu component does not
  read it (see [target-contract.md](target-contract.md) → menu). Re-prompt says in the
  loop (`Menu_WrongChoice` / `Menu_NoMoreTries`) → `invalidChoiceMessage_<LANG>` /
  `maxTriesMessage_<LANG>`.

## Scheduler plays its own prompts — drop scheduler says

`checkSchedule` is composite: on a Closed/Holiday/Exception action the Schedule API
returns the prompt text inline and the component speaks it via an embedded say
(`rtds/specs/scheduler.spec.md`). So a source `say` node that plays a `Scheduler_*`
message (closed/holiday/exception "we're gesloten…") and sits on the scheduler's closed
branch is **already covered by the scheduler** — drop the say, wire that branch to
`disconnect`. Do not create a routing-table `say` for a `Scheduler_*` message. (The
generic Vocalls-side transfer-failure say, `Exception_Unexpected`, is different — keep
it.)

## Edges

`edges[]` (`source` → `target`) define `nextStep` wiring. Edges out of a
`case` originate from its child `expression`/`default` rows; edges out of a
`redirect` from the redirect itself (success) and its `default` child
(failure/not-accepted).

## Transfer classification

- `Destination` = 6-digit extension (`570031`, `578032`) **and/or**
  `Parameters` carries context headers (`X-Context: {...}`) **and/or**
  `TransferType="attend"` → **internalTransfer** (queue/Tringer workgroup).
- `Destination` = `{_transferNumber}` / `{transferNumber}` / full phone
  number, no context payload → **externalTransfer**
  (`{_transferNumber}` → `"${schedulerTransferNumber}"`).
- `TransferType`: `attend` → `attendTransfer: true`, `blind` → `false`,
  `Unspecified` → look at the sibling attend/blind child nodes; if still
  ambiguous use `"unknown"` and report.

## Text cleanup

Attribute values are XML-entity encoded: decode `&#39;` `&quot;` `&amp;`
`&#xa;` (newline). In `label` values strip HTML (`<br>` → `\n`,
`<font>`/`<span>` tags → drop). `Text` is the authoritative prompt text
(labels may truncate or annotate).
