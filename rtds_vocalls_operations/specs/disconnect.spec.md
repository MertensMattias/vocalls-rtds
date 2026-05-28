# Operation Spec — disconnect (Disconnect)

| Field          | Value                                                            |
| -------------- | ---------------------------------------------------------------- |
| Operation Type | `Disconnect`                                                     |
| Component name | `disconnect`                                                     |
| Pattern        | `gui_exit` (terminal — call is released, no downstream step)     |
| Source handler | `rtds_pureconnect_handlers/handlers/NAllo_RTDS_Disconnect.xml`   |
| Target file    | `rtds_vocalls_operations/components/disconnect.js`               |

## Business purpose

Hang up the call. Used as the terminal hand-off at the end of any flow that should release the caller — after a "thank you, goodbye" prompt, after a successful transfer confirmation, or as the disconnect target on Emergency / Schedule / Guard branches.

### Inputs (Params)

| Param name | Type    | Required | Default | Description                                                                                |
| ---------- | ------- | -------- | ------- | ------------------------------------------------------------------------------------------ |
| `Active`   | boolean | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.  |

### Outputs

| Branch key | Taken when                                                                                                  | Fallback |
| ---------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| `NextStep` | Operation is inactive — skipped. (When active, the component routes into the Vocalls Disconnect GUI node and the call is released; no downstream step ID applies.) | `-1`     |

The active branch leaves the work script and routes via the component's internal edge to a Vocalls Disconnect node — there is no further `NextStep_*` to resolve.

### Component structure

Single-script work body matching the `sendSms` / `setAttributes` shape:

- **input** (transient) → **init** (script) → **script** (work) → **output** (transient).

`init` (canonical, shared by every component):

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[disconnect] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[disconnect] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

Logger.info('[disconnect] handoff', { nextStep: global[_rtNextStep] });
```

`output` (transient):

```js
OnEnter: Logger.info('[disconnect] exit', { nextStep: __rtNextStep });
```

Variables block:

```js
__configJSON = { "Active": false, "NextStep": "00099" };
__environment = environment;
__rtNextStep &= _rtNextStep;
```

(No `__rtBaseUrl` / `__rtEndpoint` — Disconnect makes no HTTP call.)

### Open questions

- The source handler conditionally plays a `Prompt` Param (pipe-delimited list) before disconnecting, via a cross-handler call to `NAllo_RTDS_Play`. In Vocalls, prompt-playing is a separate `PlayPrompt` operation upstream — confirm the flow author will model "say goodbye, then hang up" as two operations rather than folding the prompt into `Disconnect`.
- Once the prompt logic moves upstream, `Disconnect` has no Params beyond `Active`. Confirm this is the desired contract.
