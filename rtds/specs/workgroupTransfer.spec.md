# Operation Spec — workgroupTransfer (WorkgroupTransfer)

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Operation Type | `WorkgroupTransfer`                                                |
| Component name | `workgroupTransfer`                                                |
| Pattern        | `gui_exit` (projects Params to session vars, then a downstream WorkgroupTransfer GUI node performs the blind transfer) |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_WorkgroupTransfer.xml` |
| Target file    | `rtds/components/workgroupTransfer.js`           |

## Business purpose

Blind-transfer the caller into an ACD workgroup queue with optional skill requirements, priority, and an in-queue timeout. Used to hand the caller off to a human agent at the end of an IVR branch.

### Inputs (Params)

| Param name           | Type                          | Required | Default | Description                                                                                              |
| -------------------- | ----------------------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `Active`             | boolean                       | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                |
| `QueueName`          | string                        | yes      | —       | ACD workgroup name (must exist and be queue-enabled).                                                    |
| `Skills`             | string (pipe-delimited list)  | no       | `''`    | Required skills for the queued interaction. Each must exist in the ACD configuration.                    |
| `Priority`           | number                        | no       | `0`     | ACD priority. Higher = sooner.                                                                            |
| `Timeout`            | number (seconds)              | no       | `0`     | Maximum queue wait. `0` = no timeout.                                                                     |
| `EscapeKey`          | string (single digit)         | no       | `''`    | DTMF key that lets the caller leave the queue early.                                                      |
| `NextStep`           | string (step ID)              | yes      | —       | Continuation if the operation is inactive or the transfer is rejected by the runtime.                     |
| `NextStep_Timeout`   | string (step ID)              | no       | `-1`    | Continuation when the queue timeout fires.                                                                |
| `NextStep_EscapeKey` | string (step ID)              | no       | `-1`    | Continuation when the caller presses `EscapeKey` while in queue.                                          |

### Outputs

| Branch key            | Taken when                                                                                                  | Fallback |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| `NextStep`            | Operation is inactive, the workgroup is invalid, or the transfer is rejected by the runtime before queueing. | `-1`     |
| `NextStep_Timeout`    | Queue wait exceeded `Timeout`.                                                                              | `-1`     |
| `NextStep_EscapeKey`  | Caller pressed `EscapeKey` while in queue.                                                                  | `-1`     |

A successful transfer ends the IVR session — there is no post-success continuation in the IVR's address space.

### Component structure

Single-script work body (validates and projects Params; the downstream WorkgroupTransfer GUI node owns the actual transfer side-effect).

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[workgroupTransfer] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[workgroupTransfer] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __queue = getValue(__rtParams, 'QueueName', '');
if (!__queue || String(__queue).trim() === '') {
    Logger.warn('[workgroupTransfer] missing QueueName', { nextStep: global[_rtNextStep] });
    return;
}

Logger.info('[workgroupTransfer] handoff', { queue: __queue, nextStep: global[_rtNextStep] });
```

`output`:

```js
OnEnter: Logger.info('[workgroupTransfer] exit', { nextStep: __rtNextStep });
```

Variables block:

```js
__configJSON = { "Active": false, "QueueName": "", "Skills": "", "Priority": 0, "Timeout": 0, "EscapeKey": "", "NextStep": "00099", "NextStep_Timeout": "00099", "NextStep_EscapeKey": "00099" };
__environment = environment;
__rtNextStep &= _rtNextStep;
```

### Open questions

- The source handler validates each skill against the ACD directory before appending it. The Vocalls runtime may not have an equivalent skill-existence check — confirm whether unknown skills are silently dropped or surface as `NextStep`.
- The source handler calls a `CSSurveyEntryPoint` subroutine after a successful transfer when the workgroup is non-empty. This is an after-call survey hook — confirm whether the operator needs it preserved (probably yes for compliance) and whether it should sit on the Vocalls WorkgroupTransfer GUI node or as a separate post-transfer operation.
- The hardcoded `"VIVAQUA_MOVE_PHONE_V"` special case in the source is operator-specific and not modelled here. Confirm it can be dropped.
