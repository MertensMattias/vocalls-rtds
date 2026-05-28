# Operation Spec — menu (Menu)

| Field          | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| Operation Type | `Menu`                                                     |
| Component name | `menu`                                                     |
| Pattern        | `gui_exit` (multi-node — work script collects digit via a Vocalls dtmf node, then routes via a case node by digit) |
| Source handler | `rtds_pureconnect_handlers/handlers/NAllo_RTDS_Menu.xml`   |
| Target file    | `rtds_vocalls_operations/components/menu.js`               |

## Business purpose

Present a DTMF menu to the caller: play one or more prompts (optionally prefixed by `"Press <digit>"` per choice), collect a single key press, and route to the per-choice `NextStep_<digit>`. Supports a static intro prompt, per-choice dynamic prompts, no-input and invalid-input retry prompts, a max-tries limit, a configurable timeout, and a default-choice fallback.

### Inputs (Params)

| Param name              | Type                          | Required | Default | Description                                                                                                                              |
| ----------------------- | ----------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Active`                | boolean                       | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                                |
| `StaticPrompt`          | string (pipe-delimited list)  | no       | `''`    | Pre-recorded menu intro prompt(s). If non-empty, plays once before listening — per-choice `Prompt_<digit>` entries are then suppressed.   |
| `Prompt_<digit>`        | string                        | no       | `''`    | Per-choice prompt played in iteration order (`Prompt_1`, `Prompt_2`, …). Each plays only when `StaticPrompt` is empty.                   |
| `Timeout`               | number (seconds)              | no       | `7.0`   | Inter-digit timeout in seconds. `0` resolves to the runtime default (`7.0`).                                                              |
| `MaxTries`              | number                        | no       | `1`     | Maximum collection attempts before falling back to `NextStep_DefaultChoice`.                                                              |
| `NoChoicePrompt`        | string                        | no       | `''`    | Played on timeout when re-prompting (i.e. before the next attempt).                                                                       |
| `InvalidChoicePrompt`   | string                        | no       | `''`    | Played when the caller pressed a key outside the valid set, before the next attempt.                                                      |
| `MaxTriesPrompt`        | string                        | no       | `''`    | Played once after all retries are exhausted, before routing to `NextStep_DefaultChoice`.                                                  |
| `NextStep_<digit>`      | string (step ID)              | yes (≥1) | —       | Per-choice next-step ID. One Param per valid digit. The set of `NextStep_<digit>` Params defines the valid-key list.                      |
| `NextStep_DefaultChoice`| string (step ID)              | no       | `-1`    | Fallback after `MaxTries` exceeded.                                                                                                       |

### Outputs

| Branch key                 | Taken when                                                            | Fallback |
| -------------------------- | --------------------------------------------------------------------- | -------- |
| `NextStep`                 | Operation is inactive — skipped.                                      | `-1`     |
| `NextStep_<digit>`         | Caller pressed `<digit>` within the valid-key set.                    | `-1`     |
| `NextStep_DefaultChoice`   | Caller exceeded `MaxTries` without a valid press.                     | `-1`     |

### Component structure

Multi-node component (mirrors `guardTui` shape — work script + dtmf node + case routing + retry-prompt say nodes).

- **input** → **init** → **prepare** (work script) → **prompt** (say) → **collect** (dtmf) → **route** (case) → **say** nodes per retry/fallback → **output**.

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
__menuTry = 0;
__menuValidKeys = '';
Logger.debug('[menu] config resolved', { params: __rtParams });
```

`prepare` (work script — sets the active default and builds the valid-key string from the `NextStep_<digit>` keys):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[menu] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

walk(__rtParams, function (__key) {
    if (__key.indexOf('NextStep_') === 0 && __key !== 'NextStep_DefaultChoice') {
        __menuValidKeys += __key.slice('NextStep_'.length);
    }
});
Logger.info('[menu] prepared', { validKeys: __menuValidKeys });
```

`route` (case node, after dtmf collects `__menuDigit`):

| Case expression                                                  | Routed to                  |
| ---------------------------------------------------------------- | -------------------------- |
| `__menuDigit && __menuValidKeys.indexOf(__menuDigit) !== -1`      | assign `NextStep_<digit>`  |
| `__menuTry >= getValue(__rtParams, 'MaxTries', 1)`                | assign `NextStep_DefaultChoice` then play `MaxTriesPrompt` |
| default (timeout/invalid, retries remain)                         | play retry prompt, loop to `collect` |

The success assignment in the case node sets `global[_rtNextStep] = getValue(__rtParams, 'NextStep_' + __menuDigit, -1)`.

`output`:

```js
OnEnter: Logger.info('[menu] exit', { nextStep: __rtNextStep });
```

Variables block (representative):

```js
__configJSON = { "Active": false, "StaticPrompt": "", "Timeout": 7, "MaxTries": 1, "NextStep_DefaultChoice": "", "NextStep": "00099" };
__environment = environment;
__rtNextStep &= _rtNextStep;
```

### Open questions

- The source handler decides "valid keys" from the suffix of every `NextStep_<digit>` Param it finds (excluding `NextStep_DefaultChoice`). Confirm Vocalls' Menu component uses the same rule rather than a separate `ValidKeys` Param.
- The source handler logs the chosen digit via `NAllo_RTDS_IVRLogging`. The Vocalls version collapses that to `Logger.info('[menu] chose', { digit: ... })` inside the case node — confirm.
- The retry behaviour (re-prompt with `NoChoicePrompt` or `InvalidChoicePrompt`, then loop) requires a back-edge from the say node to the dtmf node. Confirm the dtmf node's `MaxTries` budget is enforced via `__menuTry` rather than the dtmf node's built-in counter.
