# Operation Spec — callbackAddRecord (sub-operation of Callback)

| Field          | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| Operation Type | n/a (folded into `Callback` — see [callback.spec.md](callback.spec.md)) |
| Component name | n/a — kept as a *reference* describing the contract for the `createRecord` node inside the `callback` component. |
| Pattern        | `http_call`                                                            |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_CallbackAddRecord.xml`  |
| Target file    | n/a — do not generate as a standalone component                        |

> **Sub-operation contract — not a standalone operation.** This spec deviates from the regular Inputs / Outputs / Component-structure shape because `Active` and `NextStep_*` are owned by the parent `callback` component. The tables below document the signal-based contract between this node and its parent.

## Business purpose

Persist a confirmed callback record to the Callback API. In PureConnect this is a separate subroutine because the orchestrator (`NAllo_RTDS_Callback`) and the per-context entry points (`CallbackInputPhoneNumber`, `CallbackTimeSlot`) all needed to call it from different code paths. In Vocalls this collapses into the `callback` component's final HTTP call.

This spec documents the API contract and Param surface so that the `callback` component's `createRecord` node can be implemented and tested independently. It is **not** an operator-facing Vocalls operation.

### Inputs (read from `__rtParams` on the parent `callback` component or from session state)

| Param name           | Source                                  | Description                                                                                  |
| -------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `ConfigId`           | parent `callback` Param                 | Callback service ID — drives the API URL.                                                     |
| `PhoneNumber`        | session var (`varObj.cbPhoneNumber`)    | Customer phone number to call back. Set earlier in the flow by the input/confirm node.       |
| `ChosenTimeslot`     | session var (`varObj.cbChosenTimeslot`) | Timeslot identifier picked by the caller.                                                     |
| `Description`        | session var (operator-supplied or `''`) | Free-text description of the callback (reason / context).                                     |
| `InheritSkills`      | parent `callback` Param                 | If true, copy the inbound interaction's ACD skills onto the outbound callback.               |
| `InheritPriority`    | parent `callback` Param                 | If true, copy the inbound interaction's ACD priority onto the outbound callback.             |
| `CustomerKey`        | parent `callback` Param                 | Optional operator-supplied tracking key.                                                      |
| `CustomAttributes`   | parent `callback` Param                 | Pipe-delimited list of `Key=Value` extras merged into the API payload.                       |
| `Timeout`            | parent `callback` Param                 | HTTP request timeout (defaults to parent's `Timeout`).                                       |

### External call

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                        |
| Endpoint var | `_rtCallbackEndpoint` → `__rtCallbackEndpoint`      |
| Method       | `POST`                                             |

URL shape: `__rtBaseUrl + __rtCallbackEndpoint + '/' + ConfigId + '/record'`.

Payload skeleton:

```json
{
  "phoneNumber":  "<PhoneNumber>",
  "timeslot":     "<ChosenTimeslot>",
  "description":  "<Description>",
  "scheduled":    { "from": "<ISO-8601 UTC>", "to": "<ISO-8601 UTC>" },
  "inheritSkills": true | false,
  "inheritPriority": true | false,
  "customerKey": "<CustomerKey or null>",
  "custom": { "<k>": "<v>", ... }
}
```

Expected response: `{ "success": true | false, "statusCode": <number>, ... }`. Success branch is taken iff `result.success === true`.

### Implementation note (work-body sketch, internal to `callback`)

```js
var __url = __rtBaseUrl + __rtCallbackEndpoint + '/' + encodeURIComponent(getValue(__rtParams, 'ConfigId', '')) + '/record';
var __payload = __buildCallbackPayload(getScoped('cbPhoneNumber', ''), getScoped('cbChosenTimeslot', ''), __rtParams);

return jsonHttpRequest(__url, { method: 'POST', "timeout": getValue(__rtParams, 'Timeout', 10000) }, _headers, __payload).then(
    function (result) {
        if (result && result.success === true) {
            global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);
            Logger.info('[callback] created', { nextStep: global[_rtNextStep] });
            return;
        }
        global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', -1);
        Logger.warn('[callback] create failed', { statusCode: result && result.statusCode, nextStep: global[_rtNextStep] });
    },
    function (err) {
        global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', -1);
        Logger.error('[callback] create error', { nextStep: global[_rtNextStep] }, err);
    }
);
```

`__buildCallbackPayload` is an operation-specific helper (in the master `Code` block of `callback.js`) that assembles the payload, including the inherited-skills / inherited-priority resolution and the `CustomAttributes` parse.

### Open questions

- The source handler defaults the `scheduled` field to `{ from: 9999-12-31, to: 9999-12-31 }` when no timeslot is chosen — a sentinel that the backend treats as "schedule asap". Confirm Vocalls' API accepts that or whether the operator wants the spec to require an explicit timeslot.
- The source handler reads inherited skills from `Custom_AcdSkills` (a session attribute set elsewhere). Confirm Vocalls' runtime exposes the inbound ACD skills via a similar mechanism, or whether the `inheritSkills` flag needs to be wired to a backend lookup.
- `CustomAttributes` is operator-defined free-form data. Confirm whether it should be a JSON string Param (rather than pipe-delimited) for clarity.
