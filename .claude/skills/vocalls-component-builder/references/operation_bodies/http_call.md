# Pattern: HTTP-calling operation

Use for any Type whose work body issues a `jsonHttpRequest`. The shape is
the same in every case — what varies is the payload, the branch keys, and
sometimes how the success result selects among multiple branches.

Logging discipline lives in [`../conventions.md §3`](../conventions.md).
Three log lines is the floor: skip (info), terminal outcome (info/warn/error).
Don't add intermediate "checking..." / "calling..." logs — the init-node
debug dump covers the "why".

## Skeleton

```js
// 1. Pre-assign the "did nothing" default outcome.
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[<componentName>] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

// 2. (Optional) Precondition guards. Don't log "checking..." — just return
//    with a warn if the guard fails. See "Precondition guards" below.

// 3. Pre-assign the failure outcome BEFORE the network call.
global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', -1);

var __url = __rtBaseUrl + __rtEndpoint;
var __method = 'POST';
var __timeout = getValue(__rtParams, 'Timeout', 10000);
var __payload = { /* operation-specific */ };

return jsonHttpRequest(__url, { method: __method, "timeout": __timeout }, _headers, __payload).then(
    function (result) {
        if (result && result.success === true) {
            global[_rtNextStep] = getValue(__rtParams, 'NextStep_Success', -1);
            Logger.info('[<componentName>] success', { nextStep: global[_rtNextStep] });
            return;
        }
        Logger.warn('[<componentName>] request failed', {
            statusCode: result && result.statusCode,
            nextStep: global[_rtNextStep]
        });
    },
    function (err) {
        Logger.error('[<componentName>] request error', { nextStep: global[_rtNextStep] }, err);
    }
);
```

**Variable-prefix reminder**: every `var`-declared local carries the `__`
prefix — `__url`, `__method`, `__timeout`, `__payload`, plus whatever
guard-locals you introduce (`__to`, `__from`, `__customerKey`, …). See
[conventions.md §5](../conventions.md). Function parameter names
(`result`, `err`) and the `catch (e)` binding stay bare.

**Why this shape**

- The default-outcome pre-assignment in step 1 means *every* path through the
  function leaves a sensible `global[_rtNextStep]` — even early returns from
  guards.
- Step 3 pre-assigns failure *before* the network call. If the callbacks
  never fire (timeout, host kill), we still end up on the failure branch.
- Both `.then` callbacks are always populated.
- `Logger.warn` for a handled non-success (the server answered, just with a
  failure); `Logger.error` with the caught error for an exception. Both
  POST to the EventLog API.
- The `nextStep` field is on every terminal log so traces stitch together.

## Branch selection variants

**Two-branch (success/failure)** — most operations. Use the skeleton as-is.

**Multi-branch via result.status** — `Emergency`:

```js
function (result) {
    if (!result || result.success !== true) {
        Logger.warn('[emergency] request failed', {
            statusCode: result && result.statusCode,
            nextStep: global[_rtNextStep]
        });
        return;
    }
    var __status = String(result.status || '').toLowerCase();
    var __branchKey = __status === 'transfer'   ? 'NextStep_Transfer'
                    : __status === 'disconnect' ? 'NextStep_Disconnect'
                    :                             'NextStep_Continue';
    global[_rtNextStep] = getValue(__rtParams, __branchKey, -1);
    Logger.info('[emergency] success', { status: __status, nextStep: global[_rtNextStep] });
},
```

**Dynamic branch via result + hasKey** — `Schedule`:

```js
function (result) {
    if (!result || result.success !== true) {
        Logger.warn('[schedule] request failed', { nextStep: global[_rtNextStep] });
        return;
    }
    var __state = String(result.state || '').replace(/\s+/g, '');
    var __key = 'NextStep_' + __state;
    if (hasKey(__rtParams, __key)) {
        global[_rtNextStep] = getValue(__rtParams, __key, -1);
        Logger.info('[schedule] success', { state: __state, nextStep: global[_rtNextStep] });
    } else {
        Logger.warn('[schedule] no branch for state', { state: __state, nextStep: global[_rtNextStep] });
    }
},
```

**GET with result stored** — `RESTGet`:

```js
function (result) {
    if (result && result.success === true) {
        var __resultVar = getValue(__rtParams, 'ResultVar', '');
        if (__resultVar) global[__resultVar] = result.body;
        global[_rtNextStep] = getValue(__rtParams, 'NextStep_Success', -1);
        Logger.info('[restGet] success', { nextStep: global[_rtNextStep] });
        return;
    }
    Logger.warn('[restGet] request failed', {
        statusCode: result && result.statusCode,
        nextStep: global[_rtNextStep]
    });
},
```

## Precondition guards (step 2)

Use only when an input is worth validating client-side. Don't log
"checking X" — just return with a warn if the guard fails:

```js
var __to = getValue(__rtParams, 'To', '');
if (!__to || !__isMobileNumber(__to)) {
    Logger.warn('[sendSms] invalid phone number', { to: __to, nextStep: global[_rtNextStep] });
    return;     // leaves global[_rtNextStep] on the "did nothing" default
}
```

`__isMobileNumber` is an operation-specific helper. It lives in the master
`Code` block of the component that needs it. The canonical implementation:

```js
/**
 * Validates that a string is a plausible mobile phone number.
 * Strips spaces/dashes/parens/dots and rewrites a leading 00 as +.
 * Accepts E.164 and bare national (7-15 digits).
 *
 * @param {string} phone - Raw user-supplied phone number.
 * @returns {boolean} True if the normalised number matches one of the patterns.
 */
__isMobileNumber = function (phone) {
    if (phone == null || phone === '') return false;
    var __normalized = String(phone).replace(/[\s\-().]/g, '');
    if (__normalized.indexOf('00') === 0) __normalized = '+' + __normalized.slice(2);
    var __intl = /^\+[1-9]\d{6,14}$/;
    var __national = /^[1-9]\d{6,14}$/;
    return __intl.test(__normalized) || __national.test(__normalized);
};
```

## Worked example — sendSms (the live v2 reference)

This is the actual body of [`sendSms.js`](../../../../rtds/components/sendSms.js)'s
script node (id=29). Diff against this when in doubt.

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[sendSms] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __to = getValue(__rtParams, 'To', '');
if (!__to || !__isMobileNumber(__to)) {
    Logger.warn('[sendSms] invalid phone number', { to: __to, nextStep: global[_rtNextStep] });
    return;
}

global[_rtNextStep] = getValue(__rtParams, 'NextStep_Failure', -1);

var __url = __rtBaseUrl + __rtEndpoint;
var __method = 'POST';
var __timeout = getValue(__rtParams, 'Timeout', 10000);
var __payload = {
    smsAccountId: Number(getValue(__rtParams, 'SmsAccountId', -1)),
    routing:      getValue(__rtParams, 'Routing', ''),
    from:         getValue(__rtParams, 'From', ''),
    to:           __to,
    content:      getValue(__rtParams, 'Body', ''),
    plannedTime:  nowUTC()
};

return jsonHttpRequest(__url, { method: __method, "timeout": __timeout }, _headers, __payload).then(
    function (result) {
        if (result && result.success === true) {
            global[_rtNextStep] = getValue(__rtParams, 'NextStep_Success', -1);
            Logger.info('[sendSms] success', { nextStep: global[_rtNextStep] });
            return;
        }
        Logger.warn('[sendSms] request failed', {
            statusCode: result && result.statusCode,
            nextStep: global[_rtNextStep]
        });
    },
    function (err) {
        Logger.error('[sendSms] request error', { nextStep: global[_rtNextStep] }, err);
    }
);
```

## Per-Type checklist

| Need                       | Source                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| URL (`base` + `endpoint`)  | Master `Variables` declares `__rtBaseUrl = _rtBaseUrl; __rtEndpoint = _rt<TypePrefix>Endpoint;`        |
| Method                     | Usually POST; RESTGet is GET; RESTRequest takes it from Params.                                       |
| Payload shape              | `RTDS_runtime_spec.md §1.5`. Don't invent fields.                                                     |
| Branch keys                | `RTDS_runtime_spec.md §1.5`. Two-branch is most common; emergency/schedule are multi-branch.          |
| Result inspection          | Most Types: `result.success === true`. Emergency: `result.status`. Schedule: `result.state`.          |
| Precondition guards        | Only if the spec calls for one (sendSms validates `To`).                                              |
