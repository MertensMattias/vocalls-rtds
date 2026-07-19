---
status: implemented
catalog:
  operation: "menu"
  legacy: false
  pattern: "`gui_exit`"
  component: "menu.js"
  componentMark: "✅"
  runtimeCell: "GUI-exit `menu` (`menu`)"
  seed: "⏳"
---

# Operation Spec — menu (Menu)

| Field          | Value                                                   |
| -------------- | ------------------------------------------------------- |
| Operation Type | `Menu`                                                  |
| Component name | `menu`                                                  |
| Pattern        | `gui_exit` self-contained v2 component — say → `dtmf` capture (all keys funnel to one validator, `_rtDtmf`) → validate against allowed keys → counter-driven retry, resolving to the picked-key branch |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_Menu.xml` |
| Target file    | `rtds/components/menu.js` (built)                       |

## Business purpose

Play a caller a spoken menu and collect a single DTMF keypress, then route the call to the branch mapped for the key they pressed. The flow author defines one branch per offered key (`nextStep_1`, `nextStep_2`, …); the operation plays each key's message, waits for a digit, and hands off to the matching branch. When the caller presses nothing or an unmapped key it re-prompts up to a configured retry budget, and when the budget is exhausted it falls back to a default-choice branch. This is the classic "press 1 for sales, press 2 for support" IVR menu.

All caller-facing message Params are **per-language slots**, resolved the same way as `guardTui`: the base key is suffixed with `'_' + language` at read time (`menuChoiceMessage_1` + `_NL` → `menuChoiceMessage_1_NL`), where `language` is the host global normalised in `init`. Provide one slot per supported language (`_NL`, `_FR`, …); an empty slot plays nothing.

### Inputs (Params)

Message Params below are shown by their **base** key; the runtime reads `base + '_' + language`. Each needs one authored slot per supported language (e.g. `menuChoiceMessage_1_NL`, `menuChoiceMessage_1_FR`).

| Param name                  | Type             | Required | Default | Description                                                                                                                                             |
| --------------------------- | ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `active`                    | boolean          | no       | `true`  | If falsy, the operation logs a skip and exits to `nextStep`. Default `true` (runs unless explicitly disabled with `active: false`).                     |
| `staticMessage_<LANG>`      | string           | no       | —       | Fully-authored menu message for the language. When its slot is non-empty it plays verbatim and **overrides** the per-key message build below. Per-language slot. |
| `menuChoiceMessage_<key>_<LANG>` | string      | no       | —       | Spoken message for pressing key `<key>` (one per offered digit — `1`–`9`, `0`, `*`, `#`). Concatenated in key order to form the menu. An empty slot contributes nothing. Per-language slot. Ignored when `staticMessage` is set. |
| `noChoiceMessage_<LANG>`    | string           | no       | —       | Re-prompt played when the caller presses nothing (timeout) before the next retry. Per-language slot.                                                     |
| `invalidChoiceMessage_<LANG>` | string         | no       | —       | Re-prompt played when the caller presses an unmapped key before the next retry. Per-language slot.                                                       |
| `maxTriesMessage_<LANG>`    | string           | no       | —       | Message played once after the retry budget is exhausted, before routing to the default-choice branch. Per-language slot.                                 |
| `timeout`                   | number (seconds) | no       | `7`     | How long to wait for a keypress on each attempt.                                                                                                        |
| `maxTries`                  | number           | no       | `1`     | Number of collection attempts before giving up and taking the default-choice branch.                                                                    |
| `nextStep`                  | string (step ID) | yes      | —       | Continuation when the operation is inactive (skipped), and the exhaustion fallback when no `nextStep_DefaultChoice` is configured.                       |
| `nextStep_Failure`          | string (step ID) | no       | —       | Continuation on a technical failure of the menu playback/collection.                                                                                    |
| `nextStep_<key>`            | string (step ID) | yes      | —       | Continuation for the caller pressing key `<key>` — one per offered digit (`1`–`9`, `0`, `*`, `#`). The set of these keys with a **non-empty** value defines the valid keypad. |
| `nextStep_DefaultChoice`    | string (step ID) | no       | —       | Continuation taken when the retry budget is exhausted with no valid selection. Excluded from the valid-keys set (it is never a pressable key).           |

### Outputs

Engine exit key (emitted by `prepareGuiHandoff`, routes to this component): `"menu"`.

| Branch key               | Taken when                                                                      | Fallback |
| ------------------------ | ------------------------------------------------------------------------------- | -------- |
| `nextStep`               | Operation is inactive — skipped.                                                | `''`     |
| `nextStep_Failure`       | The menu playback/collection failed technically.                                | `''`     |
| `nextStep_<key>`         | The caller pressed the mapped key `<key>`.                                      | `''`     |
| `nextStep_DefaultChoice` | `__menuTries` reached `maxTries` without a valid keypress (timeout/invalid on every attempt). Falls back to `nextStep` when unconfigured. | `''`     |

The component stages the chosen outcome key into `__rtOutcome` and resolves it **once** at the output node — `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` — with an empty-string fallback ([conventions/component-v2.md](../../conventions/component-v2.md) §7–§8). It never writes `_rtNextStep` mid-flight.

### Component structure

Pattern: `gui_exit` self-contained v2 component (the guardTui case-2 shape — see [operation_bodies/gui_exit.md](../../.claude/skills/rtds-vocalls-component-gen/references/operation_bodies/gui_exit.md)). The engine emits the `"menu"` exit key via `prepareGuiHandoff` to route the call to this component; the component then does its own DTMF collection and outcome resolution.

**Capture via the `dtmf` primitive, all keys funnelled to one validator.** The environment restriction is on *routing* 12 keys to 12 distinct canvas targets — not on the `dtmf` primitive itself. So the component uses a native `dtmf` primitive whose twelve `choiceNode` children (`1`–`9`, `0`, `*`, `#`) plus `noInput` child **all edge to a single `validate` script**; each choice's `OnSelected` deposits its key into the platform flow variable **`_rtDtmf`** (a no-input/timeout leaves it empty). The component's own **validate** script then decides what the digit means against the runtime-built `__allowedKeys` set. This keeps the offered keypad data-driven (from the Params) rather than hard-wired on the canvas. The `dtmf` node carries `MaxEntryCount`/`MaxEntryNodeId="6"` as a bounded-loop backstop for the retry cycle.

**Node trunk:**

```
input → init → build (script) → announce (say: joined menu messages)
      → capture (dtmf primitive, all keys → _rtDtmf)
      → validate (script: is _rtDtmf in __allowedKeys?)
      → route (case on __rtOutcome / __menuInvalid)
           ├─ valid    → output                       (nextStep_<digit> staged)
           └─ invalid  → tries (counter on __menuTries)
                             ├─ under budget → reprompt (say) → capture   (loop back)
                             └─ at budget    → maxTries (say) → output     (nextStep_DefaultChoice staged)
```

Caller-facing messages follow the `guardTui` per-language mechanism: the `say` nodes read `{__getValue(__rtParams, '<baseKey>' + '_' + language, '')}`, and `init` normalises the host `language` global exactly as `guardTui` does.

`init` (normalises `language`, then seeds `__rtOutcome` to the did-nothing default `'nextStep'`; master `Variables` pre-seeds `'nextStep_Failure'` as the safety net):

```js
language = (typeof language === 'string' && language.trim() !== '')
    ? language.toUpperCase()
    : 'NL';

__rtOutcome = 'nextStep';
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[menu] config resolved', { params: __rtParams, language: language, outcome: __rtOutcome });
```

`build` (script) — active guard, then compute the keypad, messages, and budget once. Leaves `__rtOutcome = 'nextStep'` (the did-nothing default); the outcome is only staged after a keypress is validated:

```js
if (String(getValue(__rtParams, 'active', true)).toLowerCase() !== 'true') {
    Logger.info('[menu] skipped -- inactive', { outcome: __rtOutcome });
    return;
}

// __allowedKeys: every 'nextStep_<key>' (except 'nextStep_DefaultChoice') with
// a NON-EMPTY value. A digit NOT in this set -- including one whose slot is
// empty -- counts as an invalid keypress.
__allowedKeys  = __collectMenuKeys(__rtParams);           // e.g. ['1','2','3','5']
__messages     = __buildMenuMessages(__rtParams, __allowedKeys, language);
__announceText = __joinMessages(__messages);              // trims segments, single-space join
__maxTries     = Number(getValue(__rtParams, 'maxTries', 1));
__menuTries    = 0;                                       // counter var; the `tries` node reads it
__menuInvalid  = false;

Logger.info('[menu] menu built', { allowedKeys: __allowedKeys, maxTries: __maxTries, outcome: __rtOutcome });
```

`announce` (say) plays the built menu as a single well-formed sentence via `Text="{Speech.ssml(__announceText)}"`. `__announceText` is staged in `build` by `__joinMessages` (trims each segment, drops empties, single-space join) so the per-key slots read as one clean prompt regardless of authored trailing/leading whitespace.

`capture` (`dtmf` primitive) — the twelve `choiceNode` children each set `_rtDtmf` in their `OnSelected` and edge to `validate`; the `noInput` child also edges to `validate` leaving `_rtDtmf` empty. `Timeout` maps to the `timeout` Param. A no-input / timeout leaves `_rtDtmf` empty, which the `validate` script treats as an invalid attempt.

`validate` (script, runs on the edge out of `capture`) — check the captured digit against `__allowedKeys`; stage the branch on a hit, or flag invalid and bump the try counter on a miss. Never writes `_rtNextStep`:

```js
var __digit = String(_rtDtmf == null ? '' : _rtDtmf);

if (__digit && __isAllowedKey(__digit, __allowedKeys)) {
    __rtOutcome = 'nextStep_' + __digit;                  // stage the picked-key branch
    __menuInvalid = false;
    Logger.info('[menu] key accepted', { key: __digit, outcome: __rtOutcome });
    return;
}

// miss: empty (timeout/no-input) OR a digit not in __allowedKeys
__menuInvalid = true;
__menuTries = __menuTries + 1;
// pre-resolve the reprompt so the reprompt say node reads ONE deterministic
// expression: noChoiceMessage on a timeout, invalidChoiceMessage otherwise.
__repromptKey = __digit ? 'invalidChoiceMessage' : 'noChoiceMessage';
Logger.info('[menu] invalid keypress', { key: __digit, tries: __menuTries, maxTries: __maxTries, outcome: __rtOutcome });
```

`route` (case) — fan out on the validate result:

- `__rtOutcome != 'nextStep'` (a `nextStep_<digit>` was staged) → **output**.
- `__menuInvalid` (miss) → **tries** (the counter node).

`tries` (counter, `VariableName="__menuTries"`) — one `expressionNode`:

- `__menuTries >= __maxTries` → **maxTries** say node → then stage the default and go to **output**.
- fall-through (under budget) → **reprompt** say node → loop the edge back to **capture**.

The **reprompt** say node reads `{__getValue(__rtParams, __repromptKey + '_' + language, '')}` — `noChoiceMessage_<language>` on a timeout, `invalidChoiceMessage_<language>` on an unmapped key (`__repromptKey` is staged in `validate` above). The **maxTries** say node plays `maxTriesMessage_<language>`; its `OnLeave` (or a tiny script node before `output`) stages the default:

```js
__rtOutcome = 'nextStep_DefaultChoice';
Logger.info('[menu] default choice -- retries exhausted', { tries: __menuTries, outcome: __rtOutcome });
```

`output` (`OnEnter`) — resolves the staged outcome once:

```js
_rtNextStep = getValue(__rtParams, __rtOutcome, '');
Logger.info('[menu] exit', { outcome: __rtOutcome, nextStep: _rtNextStep });
```

Cross-node work vars (`__allowedKeys`, `__messages`, `__announceText`, `__maxTries`, `__menuTries`, `__menuInvalid`, `__repromptKey`) are assigned in the `build` / `validate` scripts and must be pre-declared in the master `Variables` block so engine scope (the `announce` say node, the `route` case, the `tries` counter expression, and the `reprompt` say node's text expression) sees them.

Sample `__configJSON` (two languages, two live choices):

```json
{
    "active": true,
    "staticMessage_NL": "Druk 1, voor facturatie. Druk 2, om je verhuis door te geven",
    "staticMessage_FR": "",

    "menuChoiceMessage_1_NL": "Druk 1, voor facturatie.",
    "menuChoiceMessage_2_NL": "Druk 2, om je verhuis door te geven",
    "menuChoiceMessage_1_FR": "Appuyez sur 1 pour la facturation.",
    "menuChoiceMessage_2_FR": "Appuyez sur 2 pour signaler votre déménagement.",

    "timeout": 5,
    "maxTries": 2,

    "invalidChoiceMessage_NL": "Je keuze werd niet herkend, probeer opnieuw aub.",
    "invalidChoiceMessage_FR": "Votre choix n'a pas été reconnu, veuillez réessayer.",
    "noChoiceMessage_NL": "",
    "noChoiceMessage_FR": "",
    "maxTriesMessage_NL": "Ik heb je keuze nog niet herkend.",
    "maxTriesMessage_FR": "Je n'ai pas encore pris connaissance de votre choix.",

    "nextStep_1": "0007",
    "nextStep_2": "0008",
    "nextStep_3": "0009",
    "nextStep_5": "0010",
    "nextStep": "0010"
}
```

The unused key slots (`menuChoiceMessage_3_*` … `_#_*`, `nextStep_4`, `nextStep_6`…`nextStep_#`) are carried in the operator's authored config as `""` — `__collectMenuKeys` filters them out, so only `1`, `2`, `3`, `5` are offered. Above they are elided for brevity.

### Helpers

The scripts above call four component-local helpers — `__collectMenuKeys`,
`__buildMenuMessages`, and `__joinMessages` (in `build`), and `__isAllowedKey` (in `validate`).
They are specified in full here (written fresh — no prior implementation exists in the repo) so the downstream
[rtds-vocalls-component-gen](../../.claude/skills/rtds-vocalls-component-gen/SKILL.md) skill
can fold them verbatim into the component's master `Code` block. All four are pure compute:
they stage no `__rtOutcome` and never write `_rtNextStep`. ES5.1 only; every local carries
the `__` prefix.

`__collectMenuKeys(__params)` — the offered keypad. A Param named `nextStep_<key>` (except
`nextStep_DefaultChoice`, the exhaustion fallback, which is never a pressable key) defines
one valid key **only when its value is non-empty** — the config carries a full `nextStep_1`…`nextStep_#`
grid with the unused keys left `""`, so the empty ones are filtered out. The pressable key is
everything after the `nextStep_` prefix (a single char for `1`–`9`/`0`/`*`/`#`):

```js
function __collectMenuKeys(__params) {
    var __keys = [];
    var __k;
    var __key;
    for (__k in __params) {
        if (!__params.hasOwnProperty(__k)) { continue; }
        if (__k.indexOf('nextStep_') !== 0) { continue; }
        if (__k === 'nextStep_DefaultChoice') { continue; }
        if (!getValue(__params, __k, '')) { continue; }   // skip empty (unused) branches
        __key = __k.substring('nextStep_'.length);
        if (__key) { __keys.push(__key); }
    }
    return __keys;
}
```

`__buildMenuMessages(__params, __validKeys, __language)` — the ordered message list for the
active language. A non-empty `staticMessage_<language>` slot overrides the per-key build
entirely; otherwise each offered key contributes its `menuChoiceMessage_<key>_<language>`
slot (empty slots are skipped, matching the `""` entries in the config). Message keys are
read `base + '_' + language`, exactly like `guardTui`:

```js
function __buildMenuMessages(__params, __validKeys, __language) {
    var __static = getValue(__params, 'staticMessage_' + __language, '');
    if (__static) { return [__static]; }
    var __messages = [];
    var __i;
    var __seg;
    for (__i = 0; __i < __validKeys.length; __i++) {
        __seg = getValue(__params, 'menuChoiceMessage_' + __validKeys[__i] + '_' + __language, '');
        if (__seg) { __messages.push(__seg); }
    }
    return __messages;
}
```

`__joinMessages(__messages)` — assemble the ordered segment list into one well-formed sentence
run. Trims each segment (leading/trailing whitespace), drops empties, and joins the survivors
with exactly one space, so authored trailing/leading whitespace or the single-`staticMessage`
path never produce double or missing spaces:

```js
function __joinMessages(__messages) {
    var __parts = [];
    var __i;
    var __seg;
    for (__i = 0; __i < __messages.length; __i++) {
        __seg = String(__messages[__i] == null ? '' : __messages[__i]).replace(/^\s+|\s+$/g, '');
        if (__seg) { __parts.push(__seg); }
    }
    return __parts.join(' ');
}
```

`__isAllowedKey(__digit, __allowedKeys)` — membership test for the captured `_rtDtmf` digit
against the runtime-built keypad. A digit not in the set (including an empty capture from a
timeout) is not allowed, so `validate` treats it as an invalid attempt:

```js
function __isAllowedKey(__digit, __allowedKeys) {
    if (!__digit) { return false; }
    var __i;
    for (__i = 0; __i < __allowedKeys.length; __i++) {
        if (__allowedKeys[__i] === __digit) { return true; }
    }
    return false;
}
```

### Open questions / divergences from the source

- **`dtmf` primitive as capture, funnelled to one validator.** The `dtmf` primitive's twelve `choiceNode` children (plus `noInput`) all edge to a single `validate` script; each choice's `OnSelected` writes `_rtDtmf`, and `validate` checks it against `__allowedKeys`. The environment restriction was on routing 12 keys to 12 distinct targets — funnelling every key to one validator is fine, so the primitive **is** used (resolved). Confirm `*`/`#` are capturable digits in the target environment and that the `timeout` Param units (seconds) match the `dtmf` node's `Timeout` semantics.
- **Variable-arity branch keys.** The valid keypad is discovered at runtime from the `nextStep_<key>` Param family — a key is offered only when its `nextStep_<key>` value is non-empty (see `__collectMenuKeys` above). A pressed digit not in that set — including one whose slot is empty — is handled as an invalid keypress. Confirm the flow author is comfortable with runtime-discovered branches.
- **Retry / re-prompt loop.** The re-prompt loop is hand-built inside the component: the `validate` script increments `__menuTries`, a `counter` node (`VariableName="__menuTries"`) branches on `__menuTries >= __maxTries`, the under-budget path plays `noChoiceMessage_<language>` (timeout) or `invalidChoiceMessage_<language>` (unmapped key) and loops back to the capture node, and the at-budget path plays `maxTriesMessage_<language>` then stages `nextStep_DefaultChoice`. Confirm the counter increment lives in the script (engine reads the var; increments are external, per the `counter` contract).
- **`staticMessage` vs per-key messages.** A non-empty `staticMessage_<language>` slot replaces the whole generated menu. Confirm the operator still wants the static-override path, or whether every deployment now authors per-key `menuChoiceMessage_<key>_<language>` slots.
- **Per-language slots.** Every caller-facing message resolves as `base + '_' + language` (the `guardTui` mechanism). Provide one slot per supported language; missing/empty slots play nothing. Confirm the supported language set (`NL`, `FR` shown in the sample config).
- **No `nextStep_Success`.** The source has no generic success branch — success *is* the pressed-key branch. Confirmed omitted from Outputs; flag if a catch-all success continuation is wanted.
