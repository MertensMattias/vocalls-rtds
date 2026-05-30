# Param shape and `${name}` placeholders

**Scope:** [Component] · **Answers:** *What can I put in __configJSON? How does ${name} substitution work?*

Param values in `__configJSON` can be any JSON type. `__setupConfig` preserves booleans, numbers, null, arrays, and objects. String values are trimmed and have `${name}` placeholders resolved against `global` (bare identifiers only — no expressions, no dot-notation, no template-literal evaluation).

## Special-cased coercions in `__setupConfig`

- `Active` → `Boolean(__params.Active)` (never substituted).
- `ConfigId` → `Number(...) || -1`.
- `Timeout` → `Number(...) || 10000`.

## Unresolved placeholders

Unresolved `${name}` placeholders survive into `__rtParams` as raw text, and `Logger.warn('[__setupConfig] unresolved placeholder', {...})` fires. **Silently substituting `""` for missing variables creates silent bugs — don't.**

## The `${name}` contract — what it will and won't do

`${name}` is a **runtime substitution mechanism** that resolves a bare identifier against the `global` scope at the moment the carrying string is read. In a Style A component this fires in two places:

1. **At init time, in `__setupConfig`** — against every value in `__configJSON`. The init node runs `__setupConfig` which calls `String.replace` over each Param value, looking up matched names in `global`. The resolved values land in `__rtParams`. Most common use.
2. **At engine read time** — against primitive attributes whose semantics support it (most notably `redirect.Destination`). When the engine actually consumes the attribute (e.g. the moment the call is transferred), it resolves `${name}` against `global` the same way `__setupConfig` does.

Both whole-string and partial substitution are supported. Pattern is `${\w+}` — bare identifiers only.

```jsonc
{
    "To":   "${rtSmsTo}",                                  // whole string -> String(global.rtSmsTo)
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
- ❌ **`Active` is never substituted** — `__setupConfig` coerces it to Boolean directly. A `${someToggle}` value in `Active` becomes `Boolean("${someToggle}")` which is `true`, almost certainly not what you wanted. Keep `Active` literal.

## `${name}` is not `{name}`

`${name}` (with `$`) is **not** the same as `{name}` (no `$`).

- `${name}` — runtime substitution against `global`. Fires inside `__setupConfig` at init time, or by the engine at read time for select primitive attributes (above).
- `{name}` — Vocalls engine's TTS-time markup for `say.Text` / `say.AltTexts` / `Translations`. Different mechanism, different evaluation time, different scope. See the worked side-by-side in [primitive_examples.md §5](../.claude/skills/rtds-vocalls-component-gen/references/primitive_examples.md).

## Reflect on

- **[grep]** Does `__setupConfig` match the canonical one from [canonical_helpers.js](../.claude/skills/rtds-vocalls-component-gen/references/canonical_helpers.js)?
- **[grep]** Any Param value using `${expression}` instead of `${bareName}`?
- **[judgment]** Are unresolved placeholders silently defaulted to `""`?
