# Operation Spec — callbackTimeSlot (sub-operation of Callback)

| Field          | Value                                                                |
| -------------- | -------------------------------------------------------------------- |
| Operation Type | n/a (folded into `Callback`)                                         |
| Component name | n/a — kept as a reference for the `pickTimeslot` node inside `callback`. |
| Pattern        | `gui_exit` (multi-node — read out slot list, collect digit, validate) |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_CallbackTimeSlot.xml` |
| Target file    | n/a — do not generate as a standalone component                      |

> **Sub-operation contract — not a standalone operation.** This spec deviates from the regular Inputs / Outputs / Component-structure shape because `Active` and `NextStep_*` are owned by the parent `callback` component. The tables below document the signal-based contract between this node and its parent.

## Business purpose

Read out the available callback timeslots one by one and let the caller pick one by DTMF. Returns the chosen index (1-based) and a success/failed status. In the source repo this is a subroutine so the orchestrator can invoke it after the schedule lookup; in Vocalls it is one of the multi-node steps inside `callback`.

### Inputs (read from session state — set by the parent `callback` component on the schedule-lookup response)

| Source                           | Description                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `__cbTimeslots[]`                | Array of slot objects: `{ choice: '1', startTime: 'ISO', endTime: 'ISO', promptId: 'Slot_HHMM' }`.   |
| `getValue(__rtParams, 'NumberOfSlots')` | Upper bound on slots to read out (defaults to `__cbTimeslots.length`).                       |

### Outputs (signal back to orchestrator)

| Signal                       | Effect on the orchestrator                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `__cbChosenSlot = <index>`   | Caller picked slot `<index>` (1-based, stored as the slot's `choice` field).        |
| `__cbChosenSlot = -1`        | No slot picked (timeout / invalid choice exhausted retries). Orchestrator routes to `NextStep` (treat as declined). |

### Component structure (inside `callback`)

Sequence:

1. **announce** (say) — "We have <N> options".
2. For each slot in `__cbTimeslots` (up to `NumberOfSlots`): **slotPrompt** (say) — plays `slot.promptId`.
3. **collectChoice** (dtmf, max 1 key, valid = each slot's `choice` digit, timeout 7s).
4. **validate** (case):

```js
var __pick = Number(__cbChoiceDigit);
var __slot = null;
for (var __i = 0; __i < __cbTimeslots.length; __i++) {
    if (__cbTimeslots[__i].choice === __cbChoiceDigit) { __slot = __cbTimeslots[__i]; break; }
}
if (__slot) {
    __cbChosenSlot = __pick;
    varObj.cbChosenTimeslot = __slot.choice;
    varObj.cbChosenStart = __slot.startTime;
    varObj.cbChosenEnd = __slot.endTime;
    Logger.info('[callback] slot picked', { slot: __slot.choice, nextStep: __rtNextStep });
} else {
    __cbChosenSlot = -1;
    Logger.info('[callback] no slot picked', { nextStep: __rtNextStep });
}
```

### Open questions

- The source handler reads its inputs from pipe-delimited call-attribute strings (the original PureConnect attribute names). The Vocalls version expects the parent `callback` component to materialise these into `__cbTimeslots[]` as objects. Confirm the parsing happens once (in `callback`'s `fetchSchedule` node) rather than on every entry.
- The source handler has retry logic when an invalid digit is pressed. The spec above assumes the parent's case node handles retries — confirm the retry budget should live on the parent `callback` (`SlotRetries` Param?) rather than here.
- Confirm whether the slot count cap (`NumberOfSlots`) is a hard maximum (silently truncate) or whether the caller should be told "<extra> slots were not played".
