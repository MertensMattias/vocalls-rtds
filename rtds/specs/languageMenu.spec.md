---
status: spec-only
catalog:
  operation: "languageMenu"
  legacy: false
  pattern: "`gui_exit` (multi-node)"
  component: null
  componentMark: "⬜"
  runtimeCell: "GUI-exit `language_menu` (`LanguageMenu_vocalls`)"
  seed: "⬜"
---

# Operation Spec — languageMenu (LanguageMenu)

| Field          | Value                                                            |
| -------------- | ---------------------------------------------------------------- |
| Operation Type | `LanguageMenu`                                                   |
| Component name | `languageMenu`                                                   |
| Pattern        | `gui_exit` (multi-node — play prompts, collect DTMF, store choice on a session var) |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_LanguageMenu.xml` |
| Target file    | `rtds/components/languageMenu.js`             |

## Business purpose

Offer the caller a choice of languages via a DTMF menu, store the picked language on the session, and continue. If only one language is configured, auto-select it without prompting. Used at the head of multilingual flows so every downstream prompt resolves against the caller's preferred language.

### Inputs (Params)

| Param name      | Type                          | Required | Default       | Description                                                                                                          |
| --------------- | ----------------------------- | -------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Active`        | boolean                       | no       | `false`       | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                            |
| `Languages`     | string (pipe-delimited list)  | yes      | —             | Ordered list of language codes (e.g. `nl|fr|en`). Position in the list maps to DTMF digit (1-based).                |
| `StaticPrompt`  | string (pipe-delimited list)  | no       | `''`          | Pre-recorded menu prompt(s) listing the choices. Plays once before listening.                                        |
| `DynamicPrompt` | string                        | no       | `''`          | Per-choice prompt template. Used when `StaticPrompt` is empty — runtime substitutes the language code into the prompt name. |
| `Timeout`       | number (seconds)              | no       | `5.0`         | Inter-digit timeout.                                                                                                  |
| `MaxTries`      | number                        | no       | `1`           | Maximum collection attempts.                                                                                          |
| `OutputAttribute` | string                      | no       | `'ChosenLanguage'` | Name of the call-scoped key on `varObj` that receives the selected language code.                                |
| `NextStep`      | string (step ID)              | yes      | —             | Continuation step after the language has been recorded (or after the auto-select).                                   |

### Outputs

| Branch key | Taken when                                                                                       | Fallback |
| ---------- | ------------------------------------------------------------------------------------------------ | -------- |
| `NextStep` | Operation is inactive, the language list is single-entry (auto-selected), or the caller picked a valid choice. | `-1`     |

The chosen language code is written to `varObj[OutputAttribute]` (default `ChosenLanguage`); downstream prompts read it implicitly through the runtime's language resolver (`getScoped`). Branch selection is single-target — the language *value* changes session state, not the next-step ID.

### Component structure

Multi-node composite component (mirrors `menu`).

### Node graph

| id (canonical) | label       | Type        | Role                                                                                       |
| -------------- | ----------- | ----------- | ------------------------------------------------------------------------------------------ |
| `0`            | `input`     | `transient` | Component entry.                                                                            |
| `7`            | `init`      | `script`    | Config-resolution + split `Languages` into `__lmLanguages`.                                 |
| `29`           | `prepare`   | `script`    | Active guard + `NextStep` pre-assign + single-language auto-select short-circuit.           |
| (≥100)         | `prompt`    | `say`       | Plays `StaticPrompt`, or per-language `DynamicPrompt` template substituted from `__lmLanguages`. |
| (≥100)         | `collect`   | `dtmf`      | Collects a single digit; valid set = `1..__lmLanguages.length`; timeout = `Timeout` Param.  |
| (≥100)         | `route`     | `case`      | Maps `__lmDigit` → array index → writes `varObj[OutputAttribute]`.                          |
| `6`            | `output`    | `transient` | OnEnter exit log.                                                                            |

Edges: `0 → 7 → 29 → prompt → collect → route → 6`. The case node assigns `varObj[OutputAttribute]` as a side-effect; routing remains single-target (`NextStep`).

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
__lmLanguages = String(getValue(__rtParams, 'Languages', '')).split('|');
__lmTry = 0;
Logger.debug('[languageMenu] config resolved', { params: __rtParams, languages: __lmLanguages });
```

`prepare` (work script — short-circuit when only one language is configured):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[languageMenu] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

if (__lmLanguages.length <= 1) {
    var __auto = (__lmLanguages[0] || '').trim();
    if (__auto) {
        varObj[getValue(__rtParams, 'OutputAttribute', 'ChosenLanguage')] = __auto;
        Logger.info('[languageMenu] auto-selected', { language: __auto, nextStep: global[_rtNextStep] });
    }
    return;
}
```

The case node after the dtmf collect assigns:

```js
var __idx = Number(__lmDigit) - 1;
if (__idx >= 0 && __idx < __lmLanguages.length) {
    varObj[getValue(__rtParams, 'OutputAttribute', 'ChosenLanguage')] = __lmLanguages[__idx].trim();
}
```

`output`:

```js
OnEnter: Logger.info('[languageMenu] exit', { nextStep: __rtNextStep });
```

### Open questions

- The source handler also adjusts the language of internal "intercom party" calls. Vocalls treats internal calls outside the operator-facing flow — confirm this can be dropped or whether the language hand-off needs an extra hook.
- The source handler logs the picked language via `NAllo_RTDS_IVRLogging`. The Vocalls version collapses that to a `Logger.info` line — confirm.
- Per-choice `Prompt_<digit>` Params (like `menu`) are not used here — the `DynamicPrompt` Param holds a template instead. Confirm the template substitution mechanism.
