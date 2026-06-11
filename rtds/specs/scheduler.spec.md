---
status: spec-only
catalog:
  operation: "scheduler"
  legacy: false
  pattern: "`http_call` composite (status → prompt resolve → embedded say)"
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
| Pattern        | `http_call` **composite** — branch by `result.response.action`; status call → conditional prompt resolve → embedded `say` primitive plays the prompt in-component |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_Scheduler.xml`  |
| Target file    | `rtds/components/checkSchedule.js`          |

## Business purpose

Query the Schedule API for a configured schedule (typically a per-flow open/closed/holiday calendar) and branch on the returned action. Used at the head of a flow to gate inbound traffic by business hours, holidays, or scheduled maintenance windows. When the schedule's action asks for a prompt to be played (`actionPlayPrompt` true with a `promptId`), the operation resolves the spoken text for the **call's language** and plays it **inside the component** via an embedded TTS node — there is no downstream prompt hand-off and nothing is staged on an RTDS variable. The schedule decision and the message it announces stay in one operation.

### Inputs (Params)

| Param name              | Type             | Required | Default | Description                                                                                                                          |
| ----------------------- | ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `active`                | boolean          | yes      | `true`  | If falsy, the operation logs a skip and exits to `nextStep`. Read with a `true` fallback (runs unless explicitly disabled with `active: false`). |
| `scheduleId`            | number           | yes      | —       | Integer schedule identifier passed to the Schedule API. Reads are case-insensitive via `getValue`; the component path-encodes the value into the status URL. |
| `timeout`               | number (ms)      | no       | `5000`  | HTTP request timeout, applied to **both** the status call and the prompt-resolve call. Component default in `__configJSON` is `5000`; `getValue(..., 'timeout', 10000)` is the read fallback if absent. |
| `nextStep_Open`         | string (step ID) | yes      | —       | Continuation when the schedule reports `Open` (regular hours).                                                                        |
| `nextStep_Closed`       | string (step ID) | no       | `''`    | Continuation when the schedule reports `Closed`.                                                                                       |
| `nextStep_Transfer`     | string (step ID) | no       | `''`    | Internal `Transfer` action; the component stashes the target on `RTDS_SchedulerInternalNumber`.                                       |
| `nextStep_ExternalTransfer` | string (step ID) | no   | `''`    | `ExternalTransfer` action; the component stashes the number on `RTDS_SchedulerExternalNumber`.                                        |
| `nextStep_Disconnect`   | string (step ID) | no       | `''`    | Continuation when the API returns `Disconnect`.                                                                                        |
| `nextStep_Failure`      | string (step ID) | yes      | —       | Continuation on HTTP error of the status call, or unknown/unmapped action.                                                            |
| `nextStep`              | string (step ID) | yes      | —       | Continuation when the operation is inactive, or when the returned action has no matching `nextStep_<Action>` Param. **Always the last key in the Params array.** |

`promptId` is **not** a Param — it is read off the status response and feeds the prompt-resolve call (see [External calls](#external-calls)). `nextStep_Holiday` (and any other `nextStep_<State>`) is honoured dynamically (`'nextStep_' + action`) even though it is not seeded in `__configJSON`. Workgroup transfers, the legacy `version` selector, and `inQueue`/escape-key handling are **not** part of this operation.

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

Two GET calls, **same base URL, different endpoints**. The second is conditional and lives **inside** the first call's success handler.

**1 · Schedule status**

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl`                        |
| Endpoint var | `_rtScheduleEndpoint` → `__rtEndpoint`             |
| Method       | `GET`                                              |
| Timeout      | `Number(getValue(__rtParams, 'timeout', 10000))` ms |

URL shape: `__rtBaseUrl + __rtEndpoint + '/' + encodeURIComponent(scheduleId) + '/status?date=' + encodeURI(<now>)`, where `<now>` is `YYYY-MM-DD HH:MM:SS` (`toISOString` date + `toLocaleTimeString('fr')`). Endpoint resolves to `/api/Schedule` (Swagger: `GET /api/Schedule/{scheduleId}/status`). Response is read off **`result.response`** (the `jsonHttpRequest` `{ success, response }` shape — not `result.body`):

```json
{
  "action": "Open" | "Closed" | "Transfer" | "ExternalTransfer" | "Disconnect" | "...",
  "isOpen": true,                       // logged as open/closed
  "actionDetail": "+32...",             // transfer target on Transfer / ExternalTransfer
  "actionPlayPrompt": true,             // optional: a prompt should be played
  "promptId": 4231                      // prompt to resolve when actionPlayPrompt (integer)
}
```

**2 · Prompt resolve** — only when `actionPlayPrompt` is truthy **and** `promptId` is present

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Base URL var | `_rtBaseUrl` → `__rtBaseUrl` (same base as call 1) |
| Endpoint var | `_rtPromptEndpoint` → `__rtPromptEndpoint`         |
| Method       | `GET`                                              |
| Timeout      | same `timeout` as the status call                  |

URL shape: `__rtBaseUrl + __rtPromptEndpoint + '/' + encodeURIComponent(promptId)`. Endpoint resolves to `/api/prompt` (Swagger: `GET /api/prompt/{promptId}`). Response is an **array** of prompt objects; element `[0]` carries the per-language versions:

```json
[
  {
    "promptId": 4231,
    "name": "Schedule_Closed",
    "promptVersions": [
      { "dicPromptLanguageId": 1, "text": "Wij zijn momenteel gesloten." },
      { "dicPromptLanguageId": 2, "text": "Nous sommes actuellement fermés." }
    ]
  }
]
```

The component folds `promptVersions[]` into a per-language text map using a **static** `dicPromptLanguageId` → language-code mapping — no dictionary API call:

| `dicPromptLanguageId` | 1    | 2    | 3    | 44   |
| --------------------- | ---- | ---- | ---- | ---- |
| language code         | `NL` | `FR` | `DE` | `EN` |

It then selects the text for the **call's `language`** (the runtime global, uppercased in `init`) into `__sayText`, and the embedded `say` node speaks it. Nothing is written to an RTDS variable — the spoken text lives only on the component-local `__sayText`.

Side-effects the component writes via `setVariable` (for the downstream transfer node): `RTDS_SchedulerInternalNumber` (on `Transfer`) and `RTDS_SchedulerExternalNumber` (on `ExternalTransfer`) — distinct variables so internal vs. external destinations stay separable.

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

var __now = new Date();
var __dt  = __now.toISOString().substring(0, 10) + ' ' + __now.toLocaleTimeString('fr');
var __statusUrl = __rtBaseUrl + __rtEndpoint + '/' + encodeURIComponent(__scheduleId) + '/status?date=' + encodeURI(__dt);
var __timeout   = Number(getValue(__rtParams, 'timeout', 10000));

return jsonHttpRequest(__statusUrl, { 'timeout': +__timeout }, _headers).then(
    function (result) {
        if (!result || result.success !== true) {
            Logger.warn('[checkSchedule] status request failed', { url: __statusUrl, statusCode: result && result.statusCode, outcome: __rtOutcome });
            return;
        }
        var __res    = result.response || {};
        var __action = String(__res.action || '').replace(/\s+/g, '');
        var __isOpen = __res.isOpen === true || __res.isOpen === 'true' || __res.isOpen === 1 || __res.isOpen === '1';
        Logger.info('[checkSchedule] schedule result', { line: __isOpen ? 'open' : 'closed', action: __action });

        var __actionLower = __action.toLowerCase();
        if (__actionLower === 'transfer') {
            setVariable('RTDS_SchedulerInternalNumber', String(__res.actionDetail || ''));
        } else if (__actionLower === 'externaltransfer') {
            setVariable('RTDS_SchedulerExternalNumber', String(__res.actionDetail || ''));
        }

        var __key = 'nextStep_' + __action;                  // dynamic branch by action name
        __rtOutcome = hasKey(__rtParams, __key) ? __key : 'nextStep';
        Logger.info('[checkSchedule] branch', { action: __action, outcome: __rtOutcome });

        // play-prompt path: resolve text from the returned promptId and stage __sayText (non-fatal)
        var __play     = __res.actionPlayPrompt === true || __res.actionPlayPrompt === 'true' || __res.actionPlayPrompt === 1 || __res.actionPlayPrompt === '1';
        var __promptId = __res.promptId;
        if (!__play || __promptId === null || __promptId === undefined || __promptId === '') {
            return;
        }
        var __promptUrl = __rtBaseUrl + __rtPromptEndpoint + '/' + encodeURIComponent(__promptId);
        return jsonHttpRequest(__promptUrl, { 'timeout': +__timeout }, _headers).then(
            function (pres) {
                if (!pres || pres.success !== true) {
                    Logger.warn('[checkSchedule] prompt fetch failed', { promptId: __promptId, statusCode: pres && pres.statusCode, outcome: __rtOutcome });
                    return;                                  // keep the action branch
                }
                var __prompt   = (pres.response && pres.response[0]) || {};
                var __versions = __prompt.promptVersions || [];
                var __langMap  = { 1: 'NL', 2: 'FR', 3: 'DE', 44: 'EN' };
                var __tts = {};
                for (var __i = 0; __i < __versions.length; __i++) {
                    var __code = __langMap[__versions[__i].dicPromptLanguageId] || '';
                    if (__code) { __tts[__code] = String(__versions[__i].text || ''); }
                }
                __sayText = getValue(__tts, language, '');
                Logger.info('[checkSchedule] prompt resolved', { promptId: __promptId, language: language, hasText: __sayText !== '', outcome: __rtOutcome });
            },
            function (perr) { Logger.warn('[checkSchedule] prompt fetch error', { promptId: __promptId, outcome: __rtOutcome }, perr); }
        );
    },
    function (err) {
        Logger.error('[checkSchedule] status request error', { url: __statusUrl, outcome: __rtOutcome }, err);
    }
);
```

`case` (id=110) + `say` primitive (id=101) — the `case` tests `__sayText != ''`; the matching branch routes to the `say` node (`Type="say"`, `Text="{Speech.ssml(__sayText)}"`), while the `default` ("no prompt") branch goes straight to `output`. So the prompt is spoken only when one was actually resolved — no empty-text no-op. Same `say` idiom as [say.js](../components/say.js).

`output` (id=6, `OnEnter`) — resolves the staged outcome once:

```js
_rtNextStep = getValue(__rtParams, __rtOutcome, '');
Logger.info('[checkSchedule] exit', { outcome: __rtOutcome, nextStep: _rtNextStep });
```

Master `Variables` seed (`nextStep` last in the Params array; `__sayText` and the two endpoints pre-declared):

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
__rtPromptEndpoint = _rtPromptEndpoint;
__sayText          = '';
__rtOutcome        = 'nextStep';
__rtNextStep      &= _rtNextStep;
```

### Open questions

- **Transfer-target variable names.** Internal `Transfer` → `RTDS_SchedulerInternalNumber`, `ExternalTransfer` → `RTDS_SchedulerExternalNumber` (distinct per request). Confirm these names match what the downstream transfer node reads.
- **`say` in-component play.** `{Speech.ssml(__sayText)}` relies on the native `say` node resolving the master-layer global at TTS time — well-precedented in [say.js](../components/say.js) / [voicemaildetector.js](../components/voicemaildetector.js); confirm on first Designer import.
- The source handler logs the action via `NAllo_RTDS_IVRLogging`; the Vocalls version collapses that to `Logger.info` — confirmed.

### Resolved from the prior draft

The previous spec's open questions are settled: language map is **static** (`1:NL, 2:FR, 3:DE, 44:EN`, no dictionary call); `version` and `inQueue` are **dropped**; the **base URL is unchanged** (only the endpoints differ — `_rtScheduleEndpoint` vs. `_rtPromptEndpoint`); `scheduleId` is an **integer**; workgroup transfers are removed; and the prompt is **played in-component** (no `RTDS_currentTtsMessages` hand-off). The shipped `checkSchedule.js` is regenerated to this contract in the same change (v2 `__rtOutcome` staging, `active` read-fallback `true`, embedded `say`).
