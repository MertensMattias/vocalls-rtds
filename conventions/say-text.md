# Say / TTS-text conventions

**Scope:** [Component] · **Answers:** *How does a say node read per-language config text? Why default `''` not `false`? How do I branch a say on an HTTP body?*

A say (TTS) node in a v2 component reads its spoken text out of `__rtParams` — the per-language config-text keys resolved at init. The patterns below keep a missing text from being spoken as a literal word and keep say/branch decisions driven by an HTTP body from silently inverting.

## Reading per-language text — braced `getValue`, default `''`

A say node reads its text with a braced expression against `__rtParams`, keyed by the normalized `language`:

```
{getValue(__rtParams, '<Key>_' + language, '')}
```

The leading `{...}` is the Vocalls engine's **TTS-time markup** (evaluated by the engine when it speaks the node) — not `${name}` init-time substitution. The two are different mechanisms; see [params.md](params.md#name-is-not-name) for the side-by-side, and the `<Name>_<LANG>` config-text-key convention (LANG uppercase) in the same file.

The default is **`''`, never `false`**. A missing or unresolved per-language text must fall back to an empty string so the engine speaks nothing — a `false` default plays the literal word "false" (or the boolean coerced to text) through TTS, which is never what you want. This holds for `say.Text`, `say.AltTexts`, and any other TTS-rendered attribute.

## `language` — normalized once, in the init node

`language` is normalized **once, in the init node**, and **no other node writes it**. Keep the runtime-supplied value when it's set, uppercase it, and default to `'NL'`:

```js
language = language ? String(language).toUpperCase() : 'NL';
```

Because the config-text keys are stored `<Name>_<LANG>` with LANG uppercase, the say-site read `'<Key>_' + language` lines up after this normalization. `getValue` is case-insensitive on read, so a stray case still matches — but normalizing once keeps the contract obvious and stops every downstream node re-deciding the language.

## API-truthiness — `String(x).toLowerCase() === 'true'`

When a say node, or any branch decision, is driven by an HTTP response body, compare it with:

```js
if (String(x).toLowerCase() === 'true') { /* truthy */ }
```

The body comes back as a string. Neither alternative is safe:

- `if (x)` — the string `"false"` is a non-empty string, so it's **truthy**. The decision inverts silently.
- `x !== 'true'` — when the value arrives as a real boolean `true`, the strict string compare fails, so the branch is taken when it shouldn't be.

`String(x).toLowerCase() === 'true'` handles both the string form (`"true"`, `"True"`, `"TRUE"`) and a coerced boolean. Use it for any say/branch decision whose input is an HTTP body.

## Reflect on

- **[grep]** Does every say-text read default to `''` (not `false` and not omitted)?
- **[grep]** Is per-language text read as `{getValue(__rtParams, '<Key>_' + language, '')}`?
- **[grep]** Is `language` written in exactly one place (the init node), uppercased, defaulting to `'NL'`?
- **[grep]** Is any HTTP-body-driven say/branch decision made with `String(x).toLowerCase() === 'true'` rather than `if (x)` or `!== 'true'`?
