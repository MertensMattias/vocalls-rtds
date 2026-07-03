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
| `say` | prompt playback | `Text` (+`Text_<lang>`), label; becomes `say` + `ttsMessages` |
| `case` + child `expression`/`default` | branch on variable | flow structure; `apiSuccess` case = schedule branches; `adhocWelcome` case = whether AdHoc say plays; `emergency*` cases = **dropped** |
| `redirect` (+ child `attend`/`blind`/`default "not accepted"`) | transfer | `Destination`, `TransferType`, `Parameters`; becomes internal/externalTransfer; the `default` child's outgoing edge = `nextStep_Failure` |
| `hung` | hangup | becomes `disconnect` (dedupe: one disconnect op can serve many hung nodes) |
| `component` (nalOktaAuth, getEnvironment) + `transient` outputs | API auth plumbing | nothing — the runtime handles auth |
| `choice`/`dtmf`/`noInput` (MELDJEAAN, MPA) | DTMF menu | becomes `menu` (check seed params) |
| `setvar` (MPA) | variable write | fold into a `setVariables` op |

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
