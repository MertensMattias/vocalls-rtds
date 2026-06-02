# Param shape and `${name}` placeholders

**Scope:** [Component] · **Answers:** *What can I put in __configJSON? How does ${name} substitution work?*

Param values in `__configJSON` can be any JSON type. **The resolved value's type is whatever the JSON wrote** — `"4"` stays a string, `4` stays a number; `__setupConfig` does no Number coercion. The full per-key contract is specified in [specs/_setupConfig.spec.md](../rtds/specs/_setupConfig.spec.md). In short, for each key `__setupConfig`:

1. **Unwraps the array form** `[value, ...flags]` to its first element. The dictionary may emit a Param as `["AdHoc", "isDisplayed", "isEditable"]`; only `[0]` is the value (the trailing flags are GUI hints, runtime-irrelevant). `[]` → `''`. This matches the runtime twin's `getParam`.
2. **Coerces `Active`** to a real boolean via the global `activeFlag()` (after unwrap): `true` / `1` / `"1"` / `"true"` → active; `false` / `0` / `"0"` / `"false"` / empty / anything else → inactive. The component reaches it through the thin `__activeFlag` alias (which just delegates to the global), and the JS twins call `activeFlag()` directly — one contract, no drift. `Active` is never token-substituted.
3. **Resolves `${name}` in string values** (only strings) — trims, then substitutes via the shared `resolveConfigTokens(raw, key)` helper. Non-strings (number, boolean, null, object) pass through with their type intact.

`Active` is **not** defaulted when absent — the read site decides (`SetVariables` defaults `true`, `Send`/`guard` default `false`).

## No Number coercion — coerce at the read site

`__setupConfig` does **not** force `ConfigId`/`Timeout` to Number (an earlier version did). A read site that needs a number coerces explicitly — e.g. the HTTP components wrap the timeout read as `Number(getValue(__rtParams, 'Timeout', 10000))` before passing it to `jsonHttpRequest`. `ConfigId` is used in URL string-concatenation and needs no coercion.

## Unresolved placeholders

Unresolved `${name}` placeholders survive into `__rtParams` as raw text, and `Logger.warn('[__setupConfig] unresolved placeholder', {...})` fires. **Silently substituting `""` for missing variables creates silent bugs — don't.**

## The `${name}` contract — what it will and won't do

`${name}` is a **runtime substitution mechanism** that resolves a bare identifier at the moment the carrying string is read. In a Style A component this fires in two places:

1. **At init time, in `__setupConfig`** — against every value in `__configJSON`. The init node runs `__setupConfig`, which delegates each Param value to the shared `resolveConfigTokens(raw, key)` helper (`rtds_3_vocallsEnv.js`). That helper resolves matched names via `getScoped` — **`varObj` first, then `global`** — using `String.replace` (never `new Function`). The resolved values land in `__rtParams`. Most common use. This is the single token-resolution path; the runtime twins resolve the same way, so a GUI component and its JS handler can't diverge at init time.
2. **At engine read time** — against primitive attributes whose semantics support it (most notably `redirect.Destination`). When the engine actually consumes the attribute (e.g. the moment the call is transferred), it resolves `${name}` against `global`. **Note the asymmetry:** init-time resolution is `varObj`-first (via `getScoped`); engine-read-time resolution is `global`-only (the engine has no `varObj` view). For a name that exists on both with different values, the two sites can resolve differently — keep engine-read placeholders (`redirect.Destination`, etc.) backed by a `global`, or write the same value to both.

Both whole-string and partial substitution are supported. Pattern is `${\w+}` — bare identifiers only.

```jsonc
{
    "To":   "${rtSmsTo}",                                  // whole string -> String(getScoped('rtSmsTo'))  (varObj first, then global)
    "Body": "Hello ${callerName}, your ref is ${ref}",     // partial -> "Hello Alice, your ref is 42"
    "From": "8850"                                         // no placeholder -> "8850"
}
```

**What works:**

- ✅ **Bare variable names only** — `${rtSmsBody}`, `${callerName}`, `${RTDS_currentOpId}`. Pattern is `${\w+}` (letters, digits, underscore).
- ✅ **Partial substitution** — multiple placeholders in one string; non-placeholder text around them is preserved.
- ✅ **Whole-string substitution** — `"${rtSmsBody}"` resolves to the value (typed `String(...)`), not the stringified form.

**What doesn't work:**

- ❌ **No expressions** — `${user.name}`, `${count + 1}`, `${a || b}`, `${user?.email}` won't work. Only bare identifiers.
- ❌ **No JS templates** — the Vocalls runtime disables string-eval (`new Function`, `eval`). `__setupConfig` uses `String.replace`, not template-literal evaluation. If you need an expression, compute it in a script node and write to `global` first.
- ❌ **`Active` is never substituted** — `__setupConfig` coerces it to a real boolean via `__activeFlag` directly. A `${someToggle}` value in `Active` is treated as the string `"${someToggle}"`, which `__activeFlag` reads as inactive (not `"1"`/`"true"`) — almost certainly not what you wanted. Keep `Active` a literal boolean / `1`·`0` / `"1"`·`"0"`.

## `${name}` is not `{name}`

`${name}` (with `$`) is **not** the same as `{name}` (no `$`).

- `${name}` — runtime substitution against `global`. Fires inside `__setupConfig` at init time, or by the engine at read time for select primitive attributes (above).
- `{name}` — Vocalls engine's TTS-time markup for `say.Text` / `say.AltTexts` / `Translations`. Different mechanism, different evaluation time, different scope. See the worked side-by-side in [primitive_examples.md §5](../.claude/skills/rtds-vocalls-component-gen/references/primitive_examples.md).

## Reflect on

- **[grep]** Does `__setupConfig` match the canonical one from [canonical_helpers.js](../.claude/skills/rtds-vocalls-component-gen/references/canonical_helpers.js)?
- **[grep]** Any Param value using `${expression}` instead of `${bareName}`?
- **[judgment]** Are unresolved placeholders silently defaulted to `""`?
