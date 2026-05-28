# Operation Spec — flowJump (FlowJump)

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| Operation Type | `FlowJump`                                                     |
| Component name | `flowJump`                                                     |
| Pattern        | `flow_jump`                                                    |
| Source handler | `rtds_pureconnect_handlers/handlers/NAllo_RTDS_FlowJump.xml`   |
| Target file    | `rtds_vocalls_operations/components/flowJump.js`               |

## Business purpose

Redirect the caller into a different RTDS flow definition, optionally landing on a specific operation. Used to fork into sub-flows (e.g. a shared "language picker" flow, or a tenant-specific overflow flow) and to chain configuration changes without re-routing at the queue level.

### Inputs (Params)

| Param name           | Type                          | Required | Default | Description                                                                                                                          |
| -------------------- | ----------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Active`             | boolean                       | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                            |
| `SourceId`           | string                        | yes      | —       | Target RTDS source ID to fetch and run.                                                                                               |
| `OperationId`        | string (step ID)              | no       | `''`    | Specific operation within the target flow. If empty, the runtime uses the target flow's `FirstOperationID`.                          |
| `ProjectId`          | string                        | no       | `''`    | Optional project tag — written to session.                                                                                            |
| `ProjectName`        | string                        | no       | `''`    | Optional project name — written to session.                                                                                           |
| `PromptLibrary`      | string                        | no       | `''`    | Optional prompt-library identifier — written to session so downstream prompts resolve against the new library.                       |
| `SupportedLanguages` | string (pipe-delimited list)  | no       | `''`    | Optional language list — written to session.                                                                                          |
| `NextStep`           | string (step ID)              | yes      | —       | Continuation when the operation is inactive or the target flow could not be resolved.                                                 |
| `NextStep_Failure`   | string (step ID)              | no       | `-1`    | Continuation when the runtime cannot resolve the target source ID or `OperationId` is not found.                                      |

### Outputs

| Branch key         | Taken when                                                                | Fallback |
| ------------------ | ------------------------------------------------------------------------- | -------- |
| `NextStep`         | Operation is inactive — skipped. (Successful jump replaces the next-step logic with the target flow's operation, so `NextStep` is only used when the operation does nothing.) | `-1`     |
| `NextStep_Failure` | Target source ID not found, or `OperationId` not in target flow.          | `-1`     |

On a successful jump, the work body sets `global[_rtNextStep]` to the resolved target operation ID and additionally re-stamps session vars (`RTDS_sourceId`, `RTDS_project`, `RTDS_promptLibrary`, `RTDS_supportedLanguages`, `RTDS_firstOperationId`). The runtime's dispatcher picks up the new source ID on the next operation lookup.

### Component structure

Single-script work body. Optionally makes an HTTP call to the runtime's flow-resolver endpoint to confirm the source ID exists and to fetch `FirstOperationID` when `OperationId` is empty.

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[flowJump] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[flowJump] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __sourceId = getValue(__rtParams, 'SourceId', '');
if (!__sourceId) { Logger.warn('[flowJump] missing SourceId', { nextStep: global[_rtNextStep] }); return; }

global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', -1);

var __operationId = getValue(__rtParams, 'OperationId', '');
var __url = __rtBaseUrl + __rtEndpoint + '/' + encodeURIComponent(__sourceId);
var __timeout = getValue(__rtParams, 'Timeout', 10000);

return jsonHttpRequest(__url, { method: 'GET', "timeout": __timeout }, _headers, null).then(
    function (result) {
        if (!result || result.success !== true || !result.body) {
            Logger.warn('[flowJump] resolve failed', { sourceId: __sourceId, statusCode: result && result.statusCode, nextStep: global[_rtNextStep] });
            return;
        }
        var __body = result.body;
        global.RTDS_sourceId = __sourceId;
        if (__body.projectId)         global.RTDS_project = __body.projectId;
        if (__body.promptLibrary)     global.RTDS_promptLibrary = __body.promptLibrary;
        if (__body.supportedLanguages) global.RTDS_supportedLanguages = __body.supportedLanguages;

        var __target = __operationId || String(__body.firstOperationId || '');
        if (!__target) { Logger.warn('[flowJump] no target operation', { sourceId: __sourceId, nextStep: global[_rtNextStep] }); return; }

        global[_rtNextStep] = __target;
        Logger.info('[flowJump] jumped', { sourceId: __sourceId, target: __target, nextStep: global[_rtNextStep] });
    },
    function (err) { Logger.error('[flowJump] resolve error', { nextStep: global[_rtNextStep] }, err); }
);
```

`output`:

```js
OnEnter: Logger.info('[flowJump] exit', { nextStep: __rtNextStep });
```

Endpoint variable: `__rtEndpoint = _rtFlowResolveEndpoint` (e.g. `/api/flow`).

### Open questions

- The source handler reads from PureConnect's Directory Services routing-table cache. The Vocalls version assumes a REST endpoint that returns the target flow's metadata. Confirm the endpoint shape, and confirm whether the runtime can be told "use a cached flow" (skip the HTTP call).
- The source handler explicitly calls `NAllo_RTDS_IVRLogging` with action `SetBasePath`. The Vocalls version collapses this to the `Logger.info('[flowJump] jumped', …)` line. Confirm.
- The `ProjectId`, `ProjectName`, `PromptLibrary`, `SupportedLanguages` Params are *override inputs* in the source handler (operator can hard-code them on the flow) but also fields the runtime computes from the target flow's metadata. The work body above prefers the runtime values — confirm this priority order.
- Confirm `RTDS_firstOperationId` is the correct session key name in Vocalls' runtime spec (the memory snapshot says the runtime writes `RTDS_sourceId`, `RTDS_name`, `RTDS_project`, `RTDS_promptLibrary`, `RTDS_supportedLanguages`).
