# Runtime helpers — pointer

The bundled RTDS runtime-helper snapshot is
[rtds_globalCodeAndHelpers.js](rtds_globalCodeAndHelpers.js). In **vocalls-rtds**,
the live file is `projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js`.

Read the snapshot (or live file) when you need the source of `Logger`,
`getValue`, `walk`, `hasKey`, `findKey`, `applyDefaults`, `getValueOrFalsy`,
`getOrDefault`, `nowUTC`, `isValidObject`, `getParam`, `resolveTokens`, etc.

Re-sync `references/rtds_globalCodeAndHelpers.js` from the vocalls-rtds repo when
helper behaviour changes.

## What you need to know without reading the file

These are the v2 object-access helpers components use most often:

| Helper                             | Behaviour                                                                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getValue(obj, key, defaultValue)` | Returns `obj[key]` or `defaultValue`. Case-insensitive on the read side.                                                                                   |
| `getValueOrFalsy(obj, key, def)`   | Like `getValue`, but also falls back to `def` when the resolved value is falsy (`""`, `0`, `false`, `null`).                                               |
| `hasKey(obj, key)`                 | Case-insensitive existence test.                                                                                                                            |
| `findKey(obj, predicate)`          | Returns the first key for which `predicate(key, value)` is truthy, or `null`.                                                                              |
| `walk(obj, fn)`                    | Iterates own properties with `fn(key, value)`. Returning `false` stops. **Preserves casing** (this is the write-side helper).                              |
| `applyDefaults(dst, src)`          | Copies own properties of `src` into `dst` for keys `dst` lacks. **Preserves casing**.                                                                       |

**Reads-vs-writes asymmetry (intentional)**: `getValue` / `getValueOrFalsy` /
`hasKey` are case-insensitive so operators can write `__configJSON` keys
however feels natural (`SmsAccountId` vs `smsAccountId` vs `smsaccountid`)
and the component still resolves them. `walk` and `applyDefaults` preserve
the **original casing** of each key — those are write-side operations, and
the operator's chosen casing becomes the output contract. Don't paper over
that asymmetry: case-insensitive matching is a forgiveness layer for input
lookup, not a normalisation pass.

## Logger — the standard logging facade

Every v2 component logs through `Logger`. Do not call `log_debug` /
`log_error` directly. Full discipline lives in
[logging.md](../conventions/logging.md). Cheat sheet:

| Call                                            | Where it goes                   | Use for                                              |
| ----------------------------------------------- | ------------------------------- | ---------------------------------------------------- |
| `Logger.debug(message, context?)`               | Local trace                     | Config dumps, verbose detail.                        |
| `Logger.info(message, context?)`                | Local trace                     | Outcomes a reader of a trace cares about.            |
| `Logger.warn(message, context?)`                | Local trace + EventLog API POST | Handled non-success outcomes (validation, business). |
| `Logger.error(message, context?, errorObj?)`    | Local trace + EventLog API POST | Exceptions, network errors, 5xx responses.           |

- `message` is a short string; lead with `[<componentName>]`.
- `context` is a structured object (sanitised + truncated to ~300 chars
  by Logger). Don't pre-`JSON.stringify` it.
- `errorObj` (error only) — pass the caught Error; Logger extracts `.message`
  and `.stack`.
- Severity is filtered by `Logger.config.activeLevel` (`DEBUG`/`INFO`/`WARN`/`ERROR`).

## Other useful runtime functions (not v2-specific)

- `getOrDefault(varName, defaultValue, useFalsy)` — reads from `global`, not
  from an arbitrary object. Different role from `getValue`.
- `nowUTC()` — ISO-8601 UTC timestamp. Used by HTTP payloads.
- `getParam(op, name, fallback)` — walks an RTDS operation object's
  `Params`. Used by the runtime, not by individual components.
- `resolveTokens(value)` — expands `${var}` placeholders against globals.
  Components do their own substitution inside `__setupConfig` (via
  `String.replace`) — see [params.md](../conventions/params.md). Don't
  call `resolveTokens` from a component.
