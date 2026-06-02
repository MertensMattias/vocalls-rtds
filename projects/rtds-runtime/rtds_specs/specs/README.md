# Vocalls Operation Specs — Translated from PureConnect Handlers

This folder contains a 1–3 page Vocalls-flavoured spec for every handler in `rtds_pureconnect_handlers/handlers/`. Specs are written in Vocalls vocabulary (Params, `__rtParams`, `getValue`, `_rtNextStep`) — not PureConnect (`lsAttrNames`, `GetAt`, `creatorName`).

Each spec is the input contract for the [rtds-vocalls-component-gen](../../.claude/skills/rtds-vocalls-component-gen/SKILL.md) skill that generates the matching `rtds_vocalls_operations/components/<name>.js` mxGraph component.

## Inventory

### Operations that map to a Vocalls component

| Pattern          | Spec | Component (when generated) |
| ---------------- | ---- | -------------------------- |
| `gui_exit` (terminal) | [disconnect.spec.md](disconnect.spec.md) | `disconnect.js` |
| `gui_exit`       | [playPrompt.spec.md](playPrompt.spec.md) | `playPrompt.js` |
| `gui_exit`       | [playAudio.spec.md](playAudio.spec.md) | `playAudio.js` |
| `gui_exit` (multi-node) | [menu.spec.md](menu.spec.md) | `menu.js` |
| `gui_exit` (multi-node) | [languageMenu.spec.md](languageMenu.spec.md) | `languageMenu.js` |
| `gui_exit`       | [workgroupTransfer.spec.md](workgroupTransfer.spec.md) | `workgroupTransfer.js` |
| `gui_exit`       | [externalTransfer.spec.md](externalTransfer.spec.md) | `externalTransfer.js` |
| `gui_exit` (multi-node) | [callerDataEntry.spec.md](callerDataEntry.spec.md) | `callerDataEntry.js` |
| `http_call`      | [sendSms.spec.md](sendSms.spec.md) | `sendSms.js` (exists) |
| `http_call`      | [sendEmail.spec.md](sendEmail.spec.md) | `sendMail.js` (exists) |
| `http_call`      | [emergency.spec.md](emergency.spec.md) | `emergency.js` |
| `http_call`      | [scheduler.spec.md](scheduler.spec.md) | `checkSchedule.js` (exists) |
| `condition`      | [condition.spec.md](condition.spec.md) | `condition.js` |
| `condition`      | [checkAttribute.spec.md](checkAttribute.spec.md) | `checkAttribute.js` |
| `condition`      | [manageCallCapacity.spec.md](manageCallCapacity.spec.md) | `manageCallCapacity.js` |
| `set_attributes` | [setVariables.spec.md](setVariables.spec.md) | `setVariables.js` |
| `set_attributes` (superseded) | [setAttributes.spec.md](setAttributes.spec.md) — replaced by `setVariables` | `setAttributes.js` (legacy, retained for reference) |
| `http_call` (or `set_attributes`) | [ivrLogging.spec.md](ivrLogging.spec.md) | `ivrLogging.js` |
| `set_attributes` (variant) | [updateSourceId.spec.md](updateSourceId.spec.md) | `updateSourceId.js` |
| `flow_jump`      | [flowJump.spec.md](flowJump.spec.md) | `flowJump.js` |
| `gui_exit` (thin) | [guard.spec.md](guard.spec.md) | `guard.js` |
| `http_call` + multi-node | [guardRouting.spec.md](guardRouting.spec.md) | `guardRouting.js` |
| `http_call` + multi-node | [guardTui.spec.md](guardTui.spec.md) | `guardTui.js` (exists) |
| `http_call` + multi-node | [callback.spec.md](callback.spec.md) | `callback.js` |

### Sub-operations — reference contracts folded into a parent component

These are *not* standalone Vocalls operations. They document the API contract for nodes inside the `callback` orchestrator so the component-builder skill can implement and test each node independently.

| Sub-operation | Folded into | Spec |
| ------------- | ----------- | ---- |
| Add callback record           | `callback`'s `createRecord` node      | [callbackAddRecord.spec.md](callbackAddRecord.spec.md) |
| Participation menu (yes/no)   | `callback`'s `offerParticipation` node | [callbackMenuParticipate.spec.md](callbackMenuParticipate.spec.md) |
| Timeslot picker               | `callback`'s `pickTimeslot` node      | [callbackTimeSlot.spec.md](callbackTimeSlot.spec.md) |
| Phone-number input            | `callback`'s `inputPhoneNumber` node  | [callbackInputPhoneNumber.spec.md](callbackInputPhoneNumber.spec.md) |

### Handlers without a Vocalls operation equivalent

These have no operator-facing Vocalls operation. The spec explains why and where the functionality moved (or recommends dropping it).

| Spec | Reason |
| ---- | ------ |
| [queueHandling.spec.md](queueHandling.spec.md) | Runtime bridge — Vocalls handles queue re-entry natively. |
| [events.spec.md](events.spec.md) | IC-server notification dispatcher — not exposed to Vocalls flows. |
| [_nalloRtds.spec.md](_nalloRtds.spec.md) | Top-level dispatcher — Vocalls runtime owns this responsibility. |
| [_play.spec.md](_play.spec.md) | Shared prompt-playback helper — Vocalls components own playback per-operation. |
| [_promptLibraryGetDirList.spec.md](_promptLibraryGetDirList.spec.md) | Filesystem listing — admin tooling concern, not a flow operation. |

## How to use a spec

1. Read it end-to-end (≤ 3 pages).
2. Resolve every entry in "Open questions" with the operator.
3. Hand the spec to the `rtds-vocalls-component-gen` skill: it will generate or refresh `rtds_vocalls_operations/components/<name>.js` to match.
4. Validate the generated component via `npm run validate` and the `vocalls-prompt-validator` skill.

## Conventions

All specs follow the canonical component shape:

- **init script** (id=7): `__rtParams = __setupConfig(__configJSON); if (!_headers) { _headers = {}; } Logger.debug('[<name>] config resolved', { params: __rtParams });`
- **work script** (id=29): Active guard → pre-assigned next-step → real work → log line.
- **output transient** (id=6): `OnEnter="Logger.info('[<name>] exit', { nextStep: __rtNextStep });"`

Identifiers: every `var`-declared local carries `__`. Every `Logger.*` line carries `{ nextStep: … }`. Every Param read uses `getValue(__rtParams, '<Key>', <default>)`.

Reference components: [sendSms.js](../components/sendSms.js), [sendMail.js](../components/sendMail.js), [setAttributes.js](../components/setAttributes.js), [guardTui.js](../components/guardTui.js).
