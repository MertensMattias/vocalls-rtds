# Pattern: HTTP-calling operation

Use for any Type whose work body issues a `jsonHttpRequest`. The shape is
the same in every case — what varies is the payload, the branch keys, and
sometimes how the success result selects among multiple branches.

**`__rtOutcome` staging.** The work body never writes `global[_rtNextStep]`.
It **stages** an outcome KEY — the literal Params key name — into the local
`__rtOutcome` (plain `=`, at most once per path). The output node (id=6
OnEnter) resolves that key to `global[_rtNextStep]` exactly once with
`global[_rtNextStep] = getValue(__rtParams, __rtOutcome, -1);`. The init
node (id=7) pre-stages `__rtOutcome = 'NextStep_Failure';` before the work
body runs. So every branch below assigns `__rtOutcome`, never the engine's
`global[_rtNextStep]`.

Logging discipline lives in [logging.md](../../conventions/logging.md).
Three log lines is the floor: skip (info), terminal outcome (info/warn/error).
Don't add intermediate "checking..." / "calling..." logs — the init-node
debug dump covers the "why".

## Skeleton

```js
// 1. Stage the "did nothing" default outcome.
__rtOutcome = 'NextStep';

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[<componentName>] skipped — inactive', { outcome: __rtOutcome });
    return;
}

// 2. (Optional) Precondition guards. Don't log "checking..." — just return
//    with a warn if the guard fails. See "Precondition guards" below.

// 3. Stage the failure outcome BEFORE the network call.
__rtOutcome = 'NextStep_Failure';

var __url = __rtBaseUrl + __rtEndpoint;
var __method = 'POST';
var __timeout = getValue(__rtParams, 'Timeout', 10000);
var __payload = { /* operation-specific */ };

return jsonHttpRequest(__url, { method: __method, "timeout": __timeout }, _headers, __payload).then(
    function (result) {
        if (result && result.success === true) {
            __rtOutcome = 'NextStep_Success';
            Logger.info('[<componentName>] success', { outcome: __rtOutcome });
            return;
        }
        Logger.warn('[<componentName>] request failed', {
            statusCode: result && result.statusCode,
            outcome: __rtOutcome
        });
    },
    function (err) {
        Logger.error('[<componentName>] request error', { outcome: __rtOutcome }, err);
    }
);
```

**Variable-prefix reminder**: every `var`-declared local carries the `__`
prefix — `__url`, `__method`, `__timeout`, `__payload`, plus whatever
guard-locals you introduce (`__to`, `__from`, `__customerKey`, …). See
[naming.md](../../conventions/naming.md). Function parameter names
(`result`, `err`) and the `catch (e)` binding stay bare.

**Why this shape**

- The default-outcome staging in step 1 means *every* path through the
  function leaves a sensible `__rtOutcome` — even early returns from
  guards. The output node resolves it to `global[_rtNextStep]` once.
- Step 3 stages failure *before* the network call. If the callbacks
  never fire (timeout, host kill), we still end up on the failure branch.
- Both `.then` callbacks are always populated.
- `Logger.warn` for a handled non-success (the server answered, just with a
  failure); `Logger.error` with the caught error for an exception. Both
  POST to the EventLog API.
- The `outcome` field is on every terminal log so traces stitch together;
  the resolved `nextStep` is logged once at the output node.

## Branch selection variants

**Two-branch (success/failure)** — most operations. Use the skeleton as-is.

**Multi-branch via result.status** — `Emergency`:

```js
function (result) {
    if (!result || result.success !== true) {
        Logger.warn('[emergency] request failed', {
            statusCode: result && result.statusCode,
            outcome: __rtOutcome
        });
        return;
    }
    var __status = String(result.status || '').toLowerCase();
    var __branchKey = __status === 'transfer'   ? 'NextStep_Transfer'
                    : __status === 'disconnect' ? 'NextStep_Disconnect'
                    :                             'NextStep_Continue';
    __rtOutcome = __branchKey;
    Logger.info('[emergency] success', { status: __status, outcome: __rtOutcome });
},
```

**Dynamic branch via result + hasKey** — `Schedule`:

```js
function (result) {
    if (!result || result.success !== true) {
        Logger.warn('[schedule] request failed', { outcome: __rtOutcome });
        return;
    }
    var __state = String(result.state || '').replace(/\s+/g, '');
    var __key = 'NextStep_' + __state;
    if (hasKey(__rtParams, __key)) {
        __rtOutcome = __key;
        Logger.info('[schedule] success', { state: __state, outcome: __rtOutcome });
    } else {
        Logger.warn('[schedule] no branch for state', { state: __state, outcome: __rtOutcome });
    }
},
```

**GET with result stored** — `RESTGet`:

```js
function (result) {
    if (result && result.success === true) {
        var __resultVar = getValue(__rtParams, 'ResultVar', '');
        if (__resultVar) global[__resultVar] = result.body;
        __rtOutcome = 'NextStep_Success';
        Logger.info('[restGet] success', { outcome: __rtOutcome });
        return;
    }
    Logger.warn('[restGet] request failed', {
        statusCode: result && result.statusCode,
        outcome: __rtOutcome
    });
},
```

## Precondition guards (step 2)

Use only when an input is worth validating client-side. Don't log
"checking X" — just return with a warn if the guard fails:

```js
var __to = getValue(__rtParams, 'To', '');
if (!__to || !__isMobileNumber(__to)) {
    Logger.warn('[sendSms] invalid phone number', { to: __to, outcome: __rtOutcome });
    return;     // leaves __rtOutcome on the "did nothing" default ('NextStep')
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

This is the actual body of [`sendSms.js`](examples/sendSms.js)'s
script node (id=29). Diff against this when in doubt.

```js
__rtOutcome = 'NextStep';

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[sendSms] skipped — inactive', { outcome: __rtOutcome });
    return;
}

var __to = getValue(__rtParams, 'To', '');
if (!__to || !__isMobileNumber(__to)) {
    Logger.warn('[sendSms] invalid phone number', { to: __to, outcome: __rtOutcome });
    return;
}

__rtOutcome = 'NextStep_Failure';

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
            __rtOutcome = 'NextStep_Success';
            Logger.info('[sendSms] success', { outcome: __rtOutcome });
            return;
        }
        Logger.warn('[sendSms] request failed', {
            statusCode: result && result.statusCode,
            outcome: __rtOutcome
        });
    },
    function (err) {
        Logger.error('[sendSms] request error', { outcome: __rtOutcome }, err);
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
