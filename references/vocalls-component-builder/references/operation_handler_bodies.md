# Operation handler bodies — worked examples

For each RTDS operation Type, this file gives:

- The `script` (work) node body in source form (un-XML-encoded).
- The expected `__rt*` declarations to add to master `Code`.
- The `__configJSON` shape to put in master `Variables`.
- The branching exits (additional `output` transients) and their `OnEnter` payloads.

All bodies use the canonical conventions: bare assignments for shared helpers, `var` for locals, single quotes encoded as `&apos;`, `log_debug`/`log_warn`/`log_error` for logging, both `.then` callbacks for HTTP, `global[__nextStep] = ...` to write outcome.

Every function — canonical helper, operation-specific helper, and the per-component `__<componentName>` work function — must carry a basic JSDoc block (description + `@param` for each argument + `@returns`). The script-node bodies shown below are bodies, not function declarations, so they have no JSDoc of their own; but when wrapped into `__<componentName> = function () { ... };` inside master `Code`, the wrapper takes a JSDoc block. Example:

```js
/**
 * SendSMS operation. Validates the recipient, posts the message to the SMS
 * gateway, and writes the success/failure step Id to global[__nextStep].
 *
 * @returns {*} The async task from jsonHttpRequest, or undefined when the
 *              operation short-circuits on a precondition failure.
 */
__sendSMS = function () {
    // body as shown in §sendSms below
};
```

---

## SetAttributes

JS-handled. Walks Params, writes each (token-resolved) to `context.session.variables[key]`. `LogAttributes` is logged but not stored. `NextStep` is the flow-control only.

### `__rt*` declarations

None operation-specific. Use `__rtNextStep = -1;` only (no Success/Failure split — SetAttributes has a single outcome).

### `__configJSON` shape

```js
{
    "LogAttributes": "RTDS_ProjectName|Eic_RemoteId|ATTR_RoutingId",
    "CallflowId": "LPA_ICT_HELPDESK",
    "RoutingId": "LPA_ICT_HELPDESK",
    "IVREvent": "9999",
    "IVRAction": "CT",
    "NextStep": "00001"
}
```

### Script body

```js
var params = __extractParams(__configJSON);
if (!params) {
    log_warn('[SetAttributes] no params — exiting');
    global[__nextStep] = '';
    return;
}

var keys = Object.keys(params);
for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key === 'NextStep') { continue; }

    if (key === 'LogAttributes') {
        var attrNames = String(params[key]).split('|');
        var parts = [];
        for (var j = 0; j < attrNames.length; j++) {
            var n = attrNames[j].replace(/^\s+|\s+$/g, '');
            if (n) {
                var v = context.session.variables[n];
                if (v === undefined || v === null) { v = global[n]; }
                parts.push(n + '=' + (v !== undefined && v !== null ? v : ''));
            }
        }
        log_debug('[SetAttributes] LogAttributes: ' + parts.join(' | '));
        continue;
    }

    var raw = params[key];
    var resolved = (typeof raw === 'string' && raw.indexOf('$(') !== -1)
        ? raw.replace(/\$\(([^)]+)\)/g, function (m, name) {
            var sv = context.session.variables[name];
            if (sv !== undefined && sv !== null) { return String(sv); }
            var gv = global[name];
            return (gv !== undefined && gv !== null) ? String(gv) : '';
          })
        : raw;
    context.session.variables[key] = resolved;
}

global[__nextStep] = (params.NextStep !== undefined && params.NextStep !== null)
    ? String(params.NextStep)
    : '';
log_debug('[SetAttributes] done. NextStep=' + global[__nextStep]);
```

### Outputs

Single output. No extra transients.

---

## CheckAttribute

JS-handled. Compares a session variable against a value using an operator. Branches to `NextStep_True` or `NextStep_False`.

### `__rt*` declarations

```js
__rtAttributeName = '';
__rtAttributeValue = '';
__rtOperator = 'eq';
__rtNextStep_True = -1;
__rtNextStep_False = -1;
__rtNextStep = -1;
```

### `__configJSON` shape

```js
{
    "AttributeName": "ATTR_Language",
    "AttributeValue": "NL",
    "Operator": "eq",
    "NextStep_True": "00010",
    "NextStep_False": "00020"
}
```

### Operation-specific helper (master `Code`)

```js
/**
 * Compares two values using a string operator code. Equality operators use
 * string comparison; ordering operators coerce both sides to Number. Logs a
 * warning and returns false for unknown operators.
 *
 * @param {*} lhs - Left-hand-side value (typically the resolved attribute).
 * @param {string} op - Operator code: 'eq', 'ne', 'gt', 'lt', 'ge', or 'le'.
 * @param {*} rhs - Right-hand-side value (typically the configured target).
 * @returns {boolean} True if the comparison holds.
 */
__compareAttr = function (lhs, op, rhs) {
    if (op === 'eq') { return String(lhs) === String(rhs); }
    if (op === 'ne') { return String(lhs) !== String(rhs); }
    var ln = Number(lhs), rn = Number(rhs);
    if (op === 'gt') { return ln > rn; }
    if (op === 'lt') { return ln < rn; }
    if (op === 'ge') { return ln >= rn; }
    if (op === 'le') { return ln <= rn; }
    log_warn('[CheckAttribute] unknown operator: ' + op);
    return false;
};
```

### Script body

```js
global[__nextStep] = __rtNextStep_False;

var current = context.session.variables[__rtAttributeName];
if (current === undefined || current === null) { current = global[__rtAttributeName]; }

var matched = __compareAttr(current, __rtOperator, __rtAttributeValue);
log_debug('[CheckAttribute] ' + __rtAttributeName + ' ' + __rtOperator + ' ' + __rtAttributeValue + ' => ' + matched);

global[__nextStep] = matched ? __rtNextStep_True : __rtNextStep_False;
```

### Outputs

Two extra `output` transients, ids `10` and `11`:

- `<object label="true" Type="transient" Kind="output" OnEnter="log_debug('[CheckAttribute] -> true');" id="10">...</object>`
- `<object label="false" Type="transient" Kind="output" OnEnter="log_debug('[CheckAttribute] -> false');" id="11">...</object>`

Edges from script (id 29) to each output, with edge ids `40` and `41`.

---

## Condition

JS-handled. Reads a queue statistic via HTTP, compares with an operator, branches `NextStep_True` / `NextStep_False`. Skeleton like CheckAttribute plus an HTTP call.

### `__rt*` declarations

```js
__rtQueueName = '';
__rtStatistic = '';
__rtOperator = 'gt';
__rtValue = 0;
__rtTimeout = 10000;
__rtNextStep_True = -1;
__rtNextStep_False = -1;
__rtNextStep = -1;
```

### `__configJSON` shape

```js
{
    "Active": true,
    "QueueName": "LPA_ICT",
    "Statistic": "ActiveCalls",
    "Operator": "gt",
    "Value": 5,
    "Timeout": 5000,
    "NextStep_True": "00040",
    "NextStep_False": "00050"
}
```

### Script body (sketch)

```js
global[__nextStep] = __rtNextStep_False;
if (!__rtActive) {
    log_debug('[Condition] Inactive — defaulting to false branch');
    return;
}

var url = __rtBaseUrl + __rtEndpoint + '?queue=' + encodeURIComponent(__rtQueueName) + '&stat=' + encodeURIComponent(__rtStatistic);

return jsonHttpRequest(url, { method: 'GET' }, _headers, null)
    .withTimeout(__rtTimeout)
    .then(function (result) {
        if (!result || result.success !== true || result.statusCode < 200 || result.statusCode >= 300) {
            log_error('[Condition] HTTP failure - ' + JSON.stringify(result));
            global[__nextStep] = __rtNextStep_False;
            return __rtNextStep_False;
        }
        var current = (result.body && result.body.value !== undefined) ? result.body.value : null;
        var matched = __compareAttr(current, __rtOperator, __rtValue);
        log_debug('[Condition] ' + current + ' ' + __rtOperator + ' ' + __rtValue + ' => ' + matched);
        global[__nextStep] = matched ? __rtNextStep_True : __rtNextStep_False;
        return matched ? __rtNextStep_True : __rtNextStep_False;
    }, function (err) {
        log_error('[Condition] request error - ' + JSON.stringify(err));
        global[__nextStep] = __rtNextStep_False;
        return __rtNextStep_False;
    });
```

### Outputs

Two extra outputs (`true`, `false`) as in CheckAttribute.

---

## FlowJump

JS-handled. Replaces `RTDS_sourceId` with a new value. The runtime is then expected to re-fetch the routing table for the new source.

### `__rt*` declarations

```js
__rtNewSourceId = '';
__rtNextStep = -1;
```

### `__configJSON` shape

```js
{
    "NewSourceId": "+3233380000",
    "NextStep": "00001"
}
```

### Script body

```js
if (!__rtNewSourceId) {
    log_warn('[FlowJump] empty NewSourceId — staying on current flow');
    global[__nextStep] = __rtNextStep;
    return;
}

context.session.variables.RTDS_sourceId = __rtNewSourceId;
log_debug('[FlowJump] RTDS_sourceId -> ' + __rtNewSourceId);

// The runtime entry point A re-runs after this; nextStep here is just for trace.
global[__nextStep] = __rtNextStep;
```

### Outputs

Single output.

---

## IVRLogging

JS-handled. Writes an IVR log record. Implementation may be local (`log_debug` only) or HTTP POST to a logging endpoint.

### `__rt*` declarations

```js
__rtMessage = '';
__rtSeverity = 'info';
__rtNextStep = -1;
```

### `__configJSON` shape

```js
{
    "Message": "Call routed to LPA_ICT",
    "Severity": "info",
    "NextStep": "00060"
}
```

### Script body (local-only variant)

```js
var line = '[IVRLogging] [' + __rtSeverity + '] ' + __rtMessage;
if (__rtSeverity === 'warn') { log_warn(line); }
else if (__rtSeverity === 'error') { log_error(line); }
else { log_debug(line); }

global[__nextStep] = __rtNextStep;
```

### Outputs

Single output.

---

## UpdateSourceId

JS-handled. Like FlowJump but does not re-fetch — just rewrites `RTDS_sourceId` for downstream consumers.

### Script body

```js
if (!__rtNewSourceId) {
    log_warn('[UpdateSourceId] empty NewSourceId — skipping');
    global[__nextStep] = __rtNextStep;
    return;
}

context.session.variables.RTDS_sourceId = __rtNewSourceId;
log_debug('[UpdateSourceId] RTDS_sourceId -> ' + __rtNewSourceId);

global[__nextStep] = __rtNextStep;
```

---

## RESTRequest / RESTGet

JS-handled. Generic HTTP call with configurable method, URL, headers, body. Branches on success / failure.

### `__rt*` declarations

```js
__rtUrl = '';
__rtMethod = 'GET';
__rtBody = null;
__rtRequestHeaders = {};
__rtTimeout = 10000;
__rtNextStep_Success = -1;
__rtNextStep_Failure = -1;
__rtNextStep = -1;
```

### Script body

```js
global[__nextStep] = __rtNextStep_Failure;
if (!__rtUrl) {
    log_warn('[RESTRequest] empty URL — failing');
    return;
}

var headers = _headers;
var k = Object.keys(__rtRequestHeaders);
for (var i = 0; i < k.length; i++) { headers[k[i]] = __rtRequestHeaders[k[i]]; }

return jsonHttpRequest(__rtUrl, { method: __rtMethod }, headers, __rtBody)
    .withTimeout(__rtTimeout)
    .then(function (result) {
        if (result && result.success === true && result.statusCode >= 200 && result.statusCode < 300) {
            log_debug('[RESTRequest] success - ' + result.statusCode);
            global[__nextStep] = __rtNextStep_Success;
            return __rtNextStep_Success;
        }
        log_error('[RESTRequest] failure - ' + JSON.stringify(result));
        global[__nextStep] = __rtNextStep_Failure;
        return __rtNextStep_Failure;
    }, function (err) {
        log_error('[RESTRequest] request error - ' + JSON.stringify(err));
        global[__nextStep] = __rtNextStep_Failure;
        return __rtNextStep_Failure;
    });
```

---

## GUI-exit operations (WorkgroupTransfer, Menu, PlayPrompt, ...)

GUI-exit. The script writes all Params to `context.session.variables` with the `RTDS_OP_` prefix and returns the exit-key string.

### Script body template

```js
var params = __extractParams(__configJSON);
var keys = Object.keys(params);
for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var raw = params[key];
    var resolved = (typeof raw === 'string' && raw.indexOf('$(') !== -1)
        ? raw.replace(/\$\(([^)]+)\)/g, function (m, name) {
            var sv = context.session.variables[name];
            if (sv !== undefined && sv !== null) { return String(sv); }
            var gv = global[name];
            return (gv !== undefined && gv !== null) ? String(gv) : '';
          })
        : raw;
    context.session.variables['RTDS_OP_' + key] = resolved;
}

context.session.variables.RTDS_currentOpId = __rtCurrentOpId;
context.session.variables.RTDS_currentOpType = __rtCurrentOpType;
context.session.variables.RTDS_nextStepId = (params.NextStep !== undefined && params.NextStep !== null)
    ? String(params.NextStep)
    : '';

global[__nextStep] = '<EXIT_KEY>';   // e.g. 'workgroup_transfer'
return '<EXIT_KEY>';
```

### Exit keys (from RTDS_runtime_spec.md §1.5)

| Type | Exit key |
|---|---|
| WorkgroupTransfer | `workgroup_transfer` |
| ExternalTransfer | `external_transfer` |
| Menu | `menu` |
| LanguageMenu | `language_menu` |
| PlayPrompt | `play_prompt` |
| PlayAudio | `play_audio` |
| Disconnect | `disconnect` |
| GuardRouting | `guard_routing` |
| GuardTUI | `guard_tui` |
| Callback | `callback` |
| SendSMS | `send_sms` |
| SendEmail | `send_email` |

---

## Pattern reference — sendSms (the example)

The sendSms component is the original reference. Its work body is reproduced here for direct comparison:

```js
global[_rtNextStep] = __rtNextStep;

if (!__rtActive) {
    log_debug('[sendSms] Inactive.');
    return;
}
if (!__rtSmsTo || __rtSmsTo.trim() === '') {
    log_debug('[sendSms] SmsTo field is 