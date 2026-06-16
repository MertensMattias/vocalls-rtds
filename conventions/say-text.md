# Say / TTS-text conventions

**Scope:** [Component] · **Answers:** *How does a say node read per-language config text? When do I use the `ttsMessages` object vs `<Name>_<LANG>` keys? Why default `''` not `false`? How do I branch a say on an HTTP body?*

A say (TTS) node in a v2 component reads its spoken text out of `__rtParams` — resolved at init. There are **two per-language text shapes**, and which one you use depends on where the text comes from:

| Shape | Used by | Source |
| ----- | ------- | ------ |
| **`ttsMessages` object** — `{ "NL": "…", "FR": "…" }` | **Prompt-playing operations** — any op whose Params carry **`prompt` + `applicationId`** (`say`, future PlayPrompt Types) | A routing-table sibling of `params`, folded into the op config by the runtime (see below) |
| **`<Name>_<LANG>` flat keys** — `resultDenied_NL`, `resultError_FR`, … | Components with a fixed set of authored result prompts (`guardTui`) | Individual Params keys, one per name×language |

The patterns below keep a missing text from being spoken as a literal word and keep say/branch decisions driven by an HTTP body from silently inverting.

## `ttsMessages` object — the prompt-playing contract

If an operation plays a caller-facing prompt — i.e. its Params include **`prompt`** and **`applicationId`** — it carries a sibling **`ttsMessages`** object in the routing table:

```json
{ "id": "00001", "type": "say",
  "params": { "active": true, "applicationId": 11, "prompt": "welcome", "nextStep": "00002" },
  "ttsMessages": { "NL": "Welkom bij N-Allo.", "FR": "Bienvenue chez N-Allo." } }
```

`prepareGuiHandoff` ([rtds_2_runtime.js](rtds_2_runtime.js)) **folds a copy of `ttsMessages` into the op config** (`RTDS_currentOpConfig`, under the `ttsMessages` key) — it is **not** a separate handoff variable. That fold is what makes the text refresh per step: the component re-reads `__configJSON` → `__setupConfig` → `__rtParams` on every loop re-entry, so each prompt op gets its own text. A standalone canvas binding (a separate `__ttsMessages` property) is captured once and replays the **first** op's text on every later prompt in the call — the exact bug this contract avoids.

The component reads and speaks it like this:

```js
// work node: pick the language string, then resolve ${var} tokens on it
var __ttsSource = getValue(__rtParams, 'ttsMessages', null);
__sayText = getValue(__ttsSource, language, '');
if (typeof __sayText === 'string' && __sayText !== '') {
    __sayText = resolveConfigTokens(__sayText, 'ttsMessages.' + language);
}
if (__sayText === '') {
    // nothing to speak for this language -- warn + exit, never speak a literal
    Logger.warn('[say] no tts text for language', { language: language, prompt: getValue(__rtParams, 'prompt', '') });
}
```

Note `__setupConfig` only token-resolves **top-level string** Params, so the nested `ttsMessages` object passes through raw — the component must run `resolveConfigTokens` on the **chosen** language string itself for `${var}` substitution to work (varObj first, then global; bare `${name}` only; unresolved → left raw + warn).

**Rule:** when you author or generate a prompt-playing component (Params have `prompt` + `applicationId`), it MUST carry a `ttsMessages` object and read its spoken text from `getValue(__rtParams, 'ttsMessages', {})[language]` as above — never from a standalone binding, never from a flat `prompt`-keyed string.

## Reading flat `<Name>_<LANG>` text — braced `getValue`, default `''`

For the flat-key shape (fixed authored result prompts, e.g. `guardTui`), a say node reads its text with a braced expression against `__rtParams`, keyed by the normalized `language`:

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

- **[grep]** Does the component have `prompt` + `applicationId` in its Params? If so, does it carry a `ttsMessages` object and read its text from `getValue(__rtParams, 'ttsMessages', {})[language]` (NOT a standalone binding, NOT a flat `prompt` string)?
- **[grep]** Is `${var}` resolution run on the chosen `ttsMessages[language]` string via `resolveConfigTokens` (since `__setupConfig` skips the nested object)?
- **[grep]** Does every say-text read default to `''` (not `false` and not omitted)?
- **[grep]** Is flat per-language text read as `{getValue(__rtParams, '<Key>_' + language, '')}`?
- **[grep]** Is `language` written in exactly one place (the init node), uppercased, defaulting to `'NL'`?
- **[grep]** Is any HTTP-body-driven say/branch decision made with `String(x).toLowerCase() === 'true'` rather than `if (x)` or `!== 'true'`?
