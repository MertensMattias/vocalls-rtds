# Helper library surface

**Scope:** [All] · **Answers:** *Which helpers exist? Where are they defined? Why do components inline copies?*

The Vocalls env library [rtds_3_vocallsEnv.js](../references/rtds_3_vocallsEnv.js) is the source of truth for cross-cutting helpers. Public surface (declared without `var`/`let`/`const` so they land on the global scope):

| Helper                                      | Purpose                                                     |
| ------------------------------------------- | ----------------------------------------------------------- |
| `getOrDefault(varName, default, useFalsy?)` | Read a global with a default fallback.                      |
| `isValidObject(input)`                      | True if non-empty object or array.                          |
| `getValue(obj, key, default?)`              | Case-insensitive read.                                      |
| `getValueOrFalsy(obj, key, default?)`       | Like `getValue`, treats `""`/`0`/`null`/`false` as missing. |
| `hasKey(obj, key)`                          | Case-insensitive existence check.                           |
| `findKey(obj, predicate)`                   | First own key where `predicate(key, value)` is truthy.      |
| `walk(obj, fn)`                             | Iterate own props; `fn` returning `false` stops.            |
| `applyDefaults(dst, src)`                   | Copy `src`'s keys into `dst` only where missing.            |
| `getNestedValue(obj, "a.b.c")`              | Safe nested read.                                           |
| `getScoped(key, default?)`                  | varObj-first, then global, then default.                    |
| `nowUTC()`                                  | `new Date().toISOString()`.                                 |

## Component inline fallbacks

Components declare local fallback copies of `getValue`, `walk`, `hasKey`, `nowUTC` guarded by `typeof <name> === 'undefined'` checks in the master `Code`:

```js
if (typeof getValue === 'undefined') {
    getValue = function (obj, key, defaultValue) { /* ... */ };
}
```

This is intentional so a component still functions in a sandbox that didn't load the env library. **The fallback copies must match the env-library version verbatim.** If you change the helper in the library, change every component's inline copy too.

## Reflect on

- **[grep]** Is the file using a helper not in this list?
- **[judgment]** Is the helper missing from the env library? Either add it (and update inline copies) or remove the call.
- **[grep]** Do component inline copies still match the env-library definitions?
