# Logging discipline

**Scope:** [All] · **Answers:** *When do I use Logger.info vs warn vs error? Why is bare `log_debug` forbidden?*

`Logger` is the standard logging facade. Live at [rtds_3_vocallsEnv.js](../projects/rtds-runtime/globalLibraries/active/rtds_3_vocallsEnv.js).

```js
Logger.debug(message, context?)            // local trace only
Logger.info (message, context?)            // local trace; production-visible
Logger.warn (message, context?)            // local + POSTs to EventLog API
Logger.error(message, context?, errorObj?) // local + POSTs to EventLog API; serialises errorObj
Logger.API  (message, context?)            // API-trace channel; used by the runtime's HTTP entry paths
```

- `message` — short string, prefixed with `[<componentName>]` or `[RTDS]` so traces are greppable.
- `context` — small structured object; Logger sanitises and truncates at ~300 chars.
- `errorObj` — the caught `Error`; Logger extracts `.message` and `.stack`. Don't `JSON.stringify` it.

## `log_debug` / `log_warn` / `log_error` — Logger-internal only

Bare `log_debug` / `log_warn` / `log_error` are the **Vocalls platform primitives** that `Logger` calls under the hood. They write directly to the platform's stdout/EventLog channel without severity filtering, without context-object sanitisation, and without the `[<componentName>]` prefix convention.

**Only the `Logger` implementation itself is allowed to call them.** Component code, runtime handlers (`executeSetVariables`, `prepareGuiHandoff`, `runStep`, `fetchAndStart`, etc.), tests, and project scripts call `Logger.*` exclusively. There is no `log_info` — `Logger.info` maps internally to whichever primitive the platform exposes.

The existing bare `log_error("foo | " + bar)` calls in `fetchAndStart` (post-production-sync) are a regression: they were structured `Logger.error(..., {...})` previously and should be reverted. Treat any non-Logger `log_*` call outside `rtds_3_vocallsEnv.js` as a code smell.

## Component log floor

Three log lines is the floor per component. Most don't need a fourth:

| Event           | Level                     | Where                                                                  |
| --------------- | ------------------------- | ---------------------------------------------------------------------- |
| Config resolved | `debug`                   | End of init node body. Full `__rtParams` dump silences per-Param logs. |
| Outcome         | `info` / `warn` / `error` | Terminal point of the work node.                                       |
| Exit            | `info`                    | Output node `OnEnter`.                                                 |

The `nextStep` field is non-negotiable on outcome and exit logs. It's how traces stitch from one component to the next.

## Level selection

- **info** — happy-path outcome; also "skipped — inactive".
- **warn** — caller's fault (validation rejected, 4xx, `result.success === false`, fell to default branch).
- **error** — our fault (exception, network error, 5xx). Pass the `Error` as `errorObj`.

## Reflect on

- **[grep]** Any bare `log_debug` / `log_warn` / `log_error` calls outside `rtds_3_vocallsEnv.js`?
- **[judgment]** Are component logs limited to the three-line floor?
- **[grep]** Does every outcome and exit log carry `nextStep`?
- **[judgment]** Are calls structured with `(message, contextObj, errorObj?)` or bare strings with `|` concatenation?
