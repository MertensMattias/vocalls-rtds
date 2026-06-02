# Operation Spec — externalTransfer (ExternalTransfer)

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Operation Type | `ExternalTransfer`                                                 |
| Component name | `externalTransfer`                                                 |
| Pattern        | `gui_exit` (projects Params to session vars, then a downstream ExternalTransfer GUI node performs the outbound + bridge) |
| Source handler | `rtds_pureconnect_handlers/handlers/NAllo_RTDS_ExternalTransfer.xml` |
| Target file    | `rtds_vocalls_operations/components/externalTransfer.js`            |

## Business purpose

Place an outbound call to an external phone number, optionally perform call analysis (busy/no-answer/answering-machine detection), and bridge the caller in. Used for off-net forwarding, after-hours redirects, and emergency hand-offs.

### Inputs (Params)

| Param name              | Type                  | Required | Default | Description                                                                                                                          |
| ----------------------- | --------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Active`                | boolean               | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                            |
| `PhoneNumber`           | string (E.164 / dial) | yes      | —       | Destination phone number (E.164 preferred). The runtime applies the configured dial plan.                                            |
| `OutboundANI`           | string                | no       | `''`    | Calling-line identity presented to the destination. If empty, the runtime's default is used.                                          |
| `PerformCallAnalysis`   | boolean               | no       | `true`  | If true, detect busy / no-answer / answering machine before bridging.                                                                 |
| `Timeout`               | number (seconds)      | no       | `30`    | Maximum time to wait for the called party to answer before declaring no-answer.                                                       |
| `DiversionReason`       | number (0–255)        | no       | `8`     | SIP diversion code (8 = deflection / call-forward unconditional).                                                                     |
| `NextStep`              | string (step ID)      | yes      | —       | Continuation after a successful answer + bridge (the IVR loses the caller here — typically points to a no-op disconnect).             |
| `NextStep_Busy`         | string (step ID)      | no       | `-1`    | Continuation when the destination is busy.                                                                                            |
| `NextStep_RNA`          | string (step ID)      | no       | `-1`    | Continuation when the destination did not answer within `Timeout`.                                                                    |

### Outputs

| Branch key       | Taken when                                                          | Fallback |
| ---------------- | ------------------------------------------------------------------- | -------- |
| `NextStep`       | Operation is inactive, call answered and bridged, or `PhoneNumber` is missing. | `-1`     |
| `NextStep_Busy`  | Destination returned busy.                                          | `-1`     |
| `NextStep_RNA`   | Destination did not answer within `Timeout`.                        | `-1`     |

The source handler also distinguishes "intercept", "machine", "fax", "no lines", "disconnect", and "failure" outcomes. These collapse into `NextStep` (handled internally by the ExternalTransfer GUI node, which selects the appropriate downstream behaviour) unless the operator asks for finer branching.

### Component structure

Single-script work body. The downstream ExternalTransfer GUI node owns the dial / call-analysis / bridge side-effects.

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[externalTransfer] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[externalTransfer] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __number = getValue(__rtParams, 'PhoneNumber', '');
if (!__number || !__isPhoneNumber(__number)) {
    Logger.warn('[externalTransfer] invalid PhoneNumber', { phoneNumber: __number, nextStep: global[_rtNextStep] });
    return;
}

Logger.info('[externalTransfer] handoff', { phoneNumber: __number, nextStep: global[_rtNextStep] });
```

`output`:

```js
OnEnter: Logger.info('[externalTransfer] exit', { nextStep: __rtNextStep });
```

`__isPhoneNumber` is an operation-specific helper in the master `Code` block (style matches `__isMobileNumber` in `sendSms`, but accepts both mobile and fixed-line numbers).

Variables block:

```js
__configJSON = { "Active": false, "PhoneNumber": "", "OutboundANI": "", "PerformCallAnalysis": true, "Timeout": 30, "DiversionReason": 8, "NextStep": "00099", "NextStep_Busy": "00099", "NextStep_RNA": "00099" };
__environment = environment;
__rtNextStep &= _rtNextStep;
```

### Open questions

- The source handler probes three Params in priority order (`SchedulerExternalNumber`, `EmergencyExternalNumber`, `PhoneNumber`) to discover the destination. That fall-back chain is operator-specific routing — confirm the Vocalls version uses a single `PhoneNumber` Param and that upstream operations (`Schedule`, `Emergency`) project their numbers onto the canonical `PhoneNumber` key.
- The richer outcome set (intercept, machine, fax, no-lines, disconnect, failure) is currently collapsed into `NextStep`. Confirm whether `NextStep_AnsweringMachine` is needed for any flow.
- The source handler captures and restores the original hold audio around the outbound attempt. Confirm whether the Vocalls runtime preserves hold audio automatically across an outbound bridge attempt.
