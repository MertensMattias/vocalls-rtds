---
status: spec-only
catalog:
  operation: "scheduler"
  legacy: false
  pattern: "`http_call` composite (single status call → embedded say)"
  component: "checkSchedule.js"
  componentMark: "✅"
  runtimeCell: "⬜ not registered"
  seed: "⬜"
---

# Operation Spec — checkSchedule (Schedule)

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| Operation Type | `schedule`                                                    |
| Component name | `checkSchedule` (matches existing reference at `rtds/components/checkSchedule.js`) |
| Pattern        | `http_call` **composite** — branch by `result.response.action`; single status call (prompt text arrives inline in `ttsMessages[]`) → embedded `say` primitive plays the prompt in-component |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_Scheduler.xml`  |
| Target file    | `rtds/components/checkSchedule.js`          |

## Business purpose

Query the Schedule API for a configured schedule (typically a per-flow open/closed/holiday calendar) and branch on the returned action. Used at the head of a flow to gate inbound traffic by business hours, holidays, or scheduled maintenance windows. When the schedule's action asks for a prompt to be played (`actionPlayPrompt` truthy), the status response carries the prompt text **inline** in `ttsMessages[]`; the operation selects the text for the **call's language** and plays it **inside the component** via an embedded TTS node — no second API call, no downstream prompt hand-off, and nothing staged on an RTDS variable. The schedule decision and the message it announces stay in one operation.

### Inputs (Params)

| Param name              | Type             | Required | Default | Description                                                                                                                          |
| ----------------------- | ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `active`                | boolean          | yes      | `true`  | If falsy, the operation logs a skip and exits to `nextStep`. Read with a `true` fallback (runs unless explicitly disabled with `active: false`). |
| `scheduleId`            | number           | yes      | —       | Integer schedule identifier passed to the Schedule API. Reads are case-insensitive via `getValue`; the component path-encodes the value into the status URL. |
| `timeout`               | number (ms)      | no       | `5000`  | HTTP request timeout for the status call. Component default in `__configJSON` is `5000`; `getValue(..., 'timeout', 10000)` is the read fallback if absent. |
| `nextStep_Open`         | string (step ID) | yes      | —       | Continuation when the schedule reports `Open` (regular hours).                                                                        |
| `nextStep_Closed`       | string (step ID) | no       | `''`    | Continuation when the schedule reports `Closed`.                                                                                       |
| `nextStep_Transfer`     | string (step ID) | no       | `''`    | Internal `Transfer` action; the component stashes the target on `schedulerInternalNumber`.                                       |
| `nextStep_ExternalTransfer` | string (step ID) | no   | `''`    | `ExternalTransfer` action; the component stashes the number on `schedulerExternalNumber`.                                        |
| `nextStep_Disconnect`   | string (step ID) | no       | `''`    | Continuation when the API returns `Disconnect`.                                                                                        |
| `nextStep_Failure`      | string (step ID) | yes      | —       | Continuation on HTTP error of the status call, or unknown/unmapped action.                                                            |
| `nextStep`              | string (step ID) | yes      | —       | Continuation when the operation is inactive, or when the returned action has no matching `nextStep_<Action>` Param. **Always the last key in the Params array.** |

`nextStep_Holiday` (and any other `nextStep_<State>`) is honoured dynamically (`'nextStep_' + action`) even though it is not seeded in `__configJSON`. Workgroup transfers, the legacy `version` selector, and `inQueue`/escape-key handling are **not** part of this operation.

### Outputs

| Branch key             | Taken when                                                                          | Fallback |
| ---------------------- | ----------------------------------------------------------------------------------- | -------- |
| `nextStep`             | Operation inactive, missing `scheduleId`, or the action has no matching branch key. | `''`     |
| `nextStep_Open`        | Status returned `action: "Open"`.                                                   | `''`     |
| `nextStep_Closed`      | Status returned `action: "Closed"`.                                                 | `''`     |
| `nextStep_Transfer`    | Status returned `action: "Transfer"` (internal).                                    | `''`     |
| `nextStep_ExternalTransfer` | Status returned `action: "ExternalTransfer"`.                                  | `''`     |
| `nextStep_Disconnect`  | Status returned `action: "Disconnect"`.                                             | `''`     |
| `nextStep_Failure`     | The status call errored or returned non-success. (An action with **no** matching `nextStep_<Action>` key falls back to `nextStep`, with a warn.) | `''`     |

The set of `nextStep_<State>` Params is open-ended — the operator may add states (e.g. `Lunch`, `Maintenance`) by declaring matching Params and having the schedule API return those names. The component resolves the branch dynamically as `'nextStep_' + action` (spaces stripped).

The branch is decided by the **action** alone. The play-prompt resolve is a side-effect on top of the chosen branch — a failed prompt fetch logs a warn and **does not** change the outcome (the schedule decision still stands). The component stages the chosen key into `__rtOutcome` and resolves it **once** at the output node — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`, empty-string fallback ([conventions/component-v2.md](../../conventions/component-v2.md) §7–§8). It never writes `_rtNextStep` mid-flight.

### External calls

**One** GET call — the status response carries everything, including the prompt text.

**Schedule status**

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                        |
| Endpoint var | `_rtScheduleEndpoint` → `__rtEndpoint`             |
| Method       | `GET`                                              |
| Timeout      | `Number(getValue(__rtParams, 'timeout', 10000))` ms |

URL shape: `__rtBaseUrl + __rtEndpoint + '/' + encodeURIComponent(scheduleId) + '/status?date=' + encodeURIComponent(<now>)`, where `<now>` is ISO-8601 UTC to whole seconds (`toISOString().substring(0, 19) + 'Z'`, e.g. `2026-06-12T12:07:42Z`). Endpoint resolves to `/api/Schedule` (Swagger: `GET /api/Schedule/{scheduleId}/status`). Response is read off **`result.response`** (the `jsonHttpRequest` `{ success, response }` shape — not `result.body`):

```json
{
  "scheduleId": 4039,
  "isOpen": true,                       // line status, logged as open/closed
  "action": "Open",                     // "Open" | "Closed" | "Transfer" | "ExternalTransfer" | "Disconnect" | ... — drives the branch
  "actionPlayPrompt": 1,                // truthy: a prompt should be played
  "actionPromptName": "Scheduler_TestPromptDavy",  // prompt name, logged only
  "reason": "",
  "actionDetail": "",                   // transfer target on Transfer / ExternalTransfer
  "inputDate": "2026-06-12T12:07:42Z",
  "ttsMessages": [                      // inline per-language prompt text
    { "dicPromptLanguageId": 1, "text": "Dit is een test prompt" }
  ],
  "extraTime": false
}
```

When `actionPlayPrompt` is truthy and `ttsMessages[]` is non-empty, the component folds `ttsMessages[]` into a per-language text map using the `dicPromptLanguageId` → language-code mapping stored in the **`_rtPromptLanguageMap` global** (bound into the component as `__rtLangMap`; inline default if the global is absent):

| `dicPromptLanguageId` | 1    | 2    | 3    | 4    |
| --------------------- | ---- | ---- | ---- | ---- |
| language code         | `NL` | `FR` | `DE` | `EN` |

It then selects the text for the **call's `language`** (the runtime global, uppercased in `init`) into `__sayText`, and the embedded `say` node speaks it. Nothing is written to an RTDS variable — the spoken text lives only on the component-local `__sayText`.

Side-effects the component writes via `setVariable` (for the downstream transfer node): `schedulerInternalNumber` (on `Transfer`) and `schedulerExternalNumber` (on `ExternalTransfer`) — distinct variables so internal vs. external destinations stay separable.

### Component structure

Composite `http_call`: the four-node trunk with a `case` branch that plays an embedded `say` primitive **only when** a prompt was resolved.

```
input(0) → init(7) → script(29) → case(110) ─[__sayText != '']→ say(101) → output(6)
                                          └─[default: no prompt]──────────→ output(6)
```

`init` (id=7) — normalise `language`, seed `__rtOutcome`, resolve config:

```js
language = (typeof language === 'string' && language.trim() !== '') ? language.toUpperCase() : 'NL';
__rtOutcome = 'nextStep';
__sayText   = '';
__rtParams  = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[checkSchedule] config resolved', { params: __rtParams, outcome: __rtOutcome });
```

`script` (id=29, work body) — stages `__rtOutcome`, resolves `__sayText`; never writes `_rtNextStep` mid-flight:

```js
if (!getValue(__rtParams, 'active', true)) {
    Logger.info('[checkSchedule] skipped -- inactive', { outcome: __rtOutcome });
    return;
}

var __scheduleId = getValue(__rtParams, 'scheduleId', '');
if (__scheduleId === '' || __scheduleId === null || __scheduleId === undefined) {
    Logger.warn('[checkSchedule] missing scheduleId', { outcome: __rtOutcome });
    return;
}

__rtOutcome = 'nextStep_Failure';                            // pivot before the network call

var __method = 'GET';
var __timeout = Number(getValue(__rtParams, 'timeout', 10000));
var __headers = _headers;
var __dt = new Date().toISOString().substring(0, 19) + 'Z';
var __endpoint = __rtBaseUrl + __rtEndpoint + '/' + encodeURIComponent(__scheduleId) + '/status';
var __queryParameters = '?date=' + encodeURIComponent(__dt);

Logger.debug('[checkSchedule] status request', { url: __endpoint + __queryParameters, method: __method, timeout: __timeout });

var __compRequest = jsonHttpRequest(
    __endpoint + __queryParameters,
    { method: __method, timeout: __timeout },
    __headers
);

return __compRequest.then(
    function (result) {
        if (!result || result.success !== true) {
            Logger.warn('[checkSchedule] status request failed', { url: __endpoint + __queryParameters, statusCode: result && result.statusCode, error: result && result.error, outcome: __rtOutcome });
            return;
        }
        var __res    = result.response || {};
        var __action = String(__res.action || '').replace(/\s+/g, '');
        var __isOpen = __res.isOpen === true || __res.isOpen === 'true' || __res.isOpen === 1 || __res.isOpen === '1';
        Logger.info('[checkSchedule] schedule result', { line: __isOpen ? 'open' : 'closed', action: __action });

        var __actionLower = __action.toLowerCase();
        if (__actionLower === 'transfer') {
            setVariable('schedulerInternalNumber', String(__res.actionDetail || ''));
        } else if (__actionLower === 'externaltransfer') {
            setVariable('schedulerExternalNumber', String(__res.actionDetail || ''));
        }

        var __key = 'nextStep_' + __action;                  // dynamic branch by action name
        __rtOutcome = hasKey(__rtParams, __key) ? __key : 'nextStep';
        Logger.info('[checkSchedule] branch', { action: __action, outcome: __rtOutcome });

        // play-prompt path: select the call-language text from the inline ttsMessages[] (non-fatal)
        var __play     = __res.actionPlayPrompt === true || __res.actionPlayPrompt === 'true' || __res.actionPlayPrompt === 1 || __res.actionPlayPrompt === '1';
        var __messages = __res.ttsMessages || [];
        if (!__play || !__messages.length) {
            return;
        }
        var __langMap = (typeof __rtLangMap === 'object' && __rtLangMap !== null) ? __rtLangMap : { 1: 'NL', 2: 'FR', 3: 'DE', 4: 'EN' };
        var __tts = {};
        for (var __i = 0; __i < __messages.length; __i++) {
            var __code = __langMap[__messages[__i].dicPromptLanguageId] || '';
            if (__code) { __tts[__code] = String(__messages[__i].text || ''); }
        }
        __sayText = getValue(__tts, language, '');
        Logger.info('[checkSchedule] prompt resolved', { promptName: String(__res.actionPromptName || ''), language: language, hasText: __sayText !== '', outcome: __rtOutcome });
    },
    function (err) {
        Logger.error('[checkSchedule] status request error', { url: __endpoint + __queryParameters, outcome: __rtOutcome }, err);
    }
);
```

`case` (id=110) + `say` primitive (id=101) — the `case` tests `__sayText != ''`; the matching branch routes to the `say` node (`Type="say"`, `Text="{Speech.ssml(__sayText)}"`), while the `default` ("no prompt") branch goes straight to `output`. So the prompt is spoken only when one was actually resolved — no empty-text no-op. Same `say` idiom as [say.js](../components/say.js).

`output` (id=6, `OnEnter`) — resolves the staged outcome once:

```js
_rtNextStep = getValue(__rtParams, __rtOutcome, '');
Logger.info('[checkSchedule] exit', { outcome: __rtOutcome, nextStep: _rtNextStep });
```

Master `Variables` seed (`nextStep` last in the Params array; `__sayText`, the endpoint, and the language map pre-declared):

```js
__configJSON = {
    "active": true,
    "scheduleId": "${rtScheduleId}",
    "timeout": 5000,
    "nextStep_Open": "00011",
    "nextStep_Closed": "00021",
    "nextStep_Transfer": "00051",
    "nextStep_ExternalTransfer": "00052",
    "nextStep_Disconnect": "00041",
    "nextStep_Failure": "00099",
    "nextStep": "00012"
};
__environment      = environment;
__rtBaseUrl        = _rtBaseUrl;
__rtEndpoint       = _rtScheduleEndpoint;
__rtLangMap        = _rtPromptLanguageMap;
__sayText          = '';
__rtOutcome        = 'nextStep';
__rtNextStep      &= _rtNextStep;
```

### Open questions

- **Transfer-target variable names.** Internal `Transfer` → `schedulerInternalNumber`, `ExternalTransfer` → `schedulerExternalNumber` (distinct per request). ✅ Confirmed — [internalTransfer](internalTransfer.spec.md) defaults `target` to `${schedulerInternalNumber}` and [externalTransfer](externalTransfer.spec.md) defaults `phoneNumber` to `${schedulerExternalNumber}`, resolved from varObj at their init.
- **`say` in-component play.** `{Speech.ssml(__sayText)}` relies on the native `say` node resolving the master-layer global at TTS time — well-precedented in [say.js](../components/say.js) / [voicemaildetector.js](../components/voicemaildetector.js); confirm on first Designer import.
- The source handler logs the action via `NAllo_RTDS_IVRLogging`; the Vocalls version collapses that to `Logger.info` — confirmed.

### Resolved from the prior draft

The previous spec's open questions are settled: the language map lives on the **`_rtPromptLanguageMap` global** (`1:NL, 2:FR, 3:DE, 4:EN`; inline default in the component if the global is absent — no dictionary call); `version` and `inQueue` are **dropped**; `scheduleId` is an **integer**; workgroup transfers are removed; and the prompt is **played in-component** (no `RTDS_currentTtsMessages` hand-off). The earlier two-call shape (status + `_rtPromptEndpoint` prompt resolve by `promptId`) is **retired** — the status response now ships the prompt text inline in `ttsMessages[]`, so the component makes exactly one request. The shipped `checkSchedule.js` is regenerated to this contract in the same change (v2 `__rtOutcome` staging, `active` read-fallback `true`, embedded `say`).
