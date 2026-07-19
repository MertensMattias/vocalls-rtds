# Prompt-library keys — resolving `say`/`menu` text from the TTS transcripts

A generated config must name a real prompt (`say.prompt`, `menu.staticPrompt`) and
carry the canonical spoken text. Those live in the per-project TTS transcripts, not in
the flow XML. This reference explains how to resolve them, and — crucially — which
messages the flow must **not** carry because another component plays them.

Skip this file only if the flow has no transcript; then every `say.prompt` stays
`"unknown"` and the text comes from the XML `Text` (still a valid, if unpolished,
config).

## Where the transcripts live

```
jsonConfig/digipolis_tts_messages/markdown/TTS_transcripties_<DOMAIN>*.md
```

Each is a markdown table, one row per prompt:

```
| Prompt key                      | TTS-tekst                                   |
| ------------------------------- | ------------------------------------------- |
| MELDJEAAN/NL/Menu_Main          | Welkom bij de helpdesk Meld je aan. ...     |
| MELDJEAAN/NL/PreQueue_...        | U wordt zo dadelijk doorverbonden.          |
```

Key format is `<PROJECT>/<LANG>/<Category>_<Name>`. In the config:
- `prompt` (or `menu.staticPrompt`) = `<Category>_<Name>` — the project/lang prefix stripped.
- `ttsMessages.<LANG>` (for `say`) / the menu message Param (for `menu`) = the row's text, verbatim.

## Flow → transcript domain

The domain code is the *project*, which is **not** the flow name. Resolve it from the
flow's project segment. Confirmed map for the current flows:

| Flow(s) | Domain code | Transcript |
| ------- | ----------- | ---------- |
| `DA-CC-MELDJEAAN` | `CC` | `TTS_transcripties_CC*.md` |
| `DA-LOKET-*` (BEVOLKING, WONEN, SAH, NATIONALITEIT, BURGERLIJKESTAND, MIGRATIE, …) | `DL` | `TTS_transcripties_DL*.md` |
| `DA-MPA` | `GAPA` | `TTS_transcripties_GAPA*.md` |
| `DA-PM-*` (ALGEMEEN, ZIEKTE) | `PM` | `TTS_transcripties_PM*.md` |
| `DA-SW-LEZ*`, `DA-SW-OMGEVING*` | `SW` | `TTS_transcripties_SW*.md` |
| `DA-SW-TS` (technische storing) | `technische_storing` | `TTS_transcripties_technische_storing*.md` |
| Contact-center shared | `SCC` | `TTS_transcripties_SCC*.md` |

If a flow's domain is not in this table, run `resolve_prompt_keys.py --domain <guess>`
— on a miss it prints the available domain codes — and **confirm the domain in the
report** before wiring keys. Never guess silently.

## The resolver script

`scripts/resolve_prompt_keys.py` parses a transcript deterministically (so the Dutch
text is copied exactly, every run) and can rank candidate keys per op role.

```bash
# every key + text for a domain
python .../scripts/resolve_prompt_keys.py --domain CC

# decision-ready Q/A for a flow's op roles
python .../scripts/resolve_prompt_keys.py --domain CC --qa \
    --roles "welcome,menu,prequeue lager,prequeue middelbaar,prequeue buitengewoon,menuwrong,menuretry,exception"
```

`--qa` emits, per role: the recommended key, its text, a confidence (`high|medium|low`
from the score gap), a `decision` of `auto` or `confirm`, and up to three
alternatives — plus a rendered block you paste into the report. Roles tagged `[AUTO]`
are clear matches you can apply silently; `[ASK]` roles are genuine judgement calls to
put in front of the user (see "The Q/A decision flow" below).

Role names are free-text; useful ones: `welcome`, `adhoc`, `prequeue <label>`,
`menu`, `menuwrong` (→ WrongChoice), `menuretry` (→ NoMoreTries), `exception`, `queue`.

## The Q/A decision flow (present this to the user)

The whole point is to make the message decisions a **quick confirm**, not a research
task. After extracting the flow, gather the op roles that need a prompt, run
`--qa --roles ...`, and present the rendered block to the user roughly like:

```
Prompt-key decisions (reply 'ok' to accept all, or a number to change):

  1. [ASK ] welcome        -> Menu_Main   (low; multiple plausible keys)
       "Welkom bij de helpdesk Meld je aan. Voor vragen over inschrijven ..."
        alt: Menu_MainInschrijvingen | Menu_MainOld
  2. [AUTO] menuwrong      -> Menu_WrongChoice   (high; clear match)
  ...
```

- `[AUTO]` picks are applied unless the user overrides.
- `[ASK]` picks need a yes/override — these are where transcripts offer several near-
  synonyms (e.g. which `PreQueue_*`) or where the greeting could be its own say or
  folded into the menu.
- Accept `ok` (take all recommendations), a number + a key (override one), or a free-text
  key. Then wire the chosen `prompt` + text into the ops and note the applied set in the
  report's **Decisions** section.

This flow *replaces* hand-matching — the user skims a short list and confirms, instead
of reading the whole transcript.

## Op-type-specific placement — READ THIS, it is the common bug

Where the text goes depends on the op type. Two rules that look similar but differ:

### `say` → text in the `ttsMessages` envelope key

The runtime folds a `say` op's `ttsMessages` into the config the component reads
(`prepareGuiHandoff`), and `say.js` speaks `ttsMessages[<language>]`. So:

```json
{ "id": "00055", "type": "say", "name": "Play: PreQueue (Lager)",
  "params": { "active": [true,"isDisplayed","isEditable"], "applicationId": 4,
              "prompt": ["PreQueue_KleuterOnderwijs","isDisplayed","isEditable"],
              "nextStep": "00060" },
  "ttsMessages": { "NL": "U wordt zo dadelijk doorverbonden." } }
```

`ttsMessages` is an **envelope sibling of `params`**, not a param — the seed does not
catalogue it, and `validate_config.py` whitelists it.

### `menu` → text in the message *Params*, NOT `ttsMessages`

The `menu` component (`rtds/components/menu.js`) builds its spoken prompt **only** from
the Params `staticMessage_<LANG>` / `menuChoiceMessage_<key>_<LANG>`. It never reads
`ttsMessages`. A menu whose text sits in `ttsMessages` is **silent at runtime** — the
config looks fine and even imports, but the caller hears nothing. `validate_config.py`
FAILs this (`menu ... has NO announce text`). See `target-contract.md` → "menu" for the
full shape. Map the transcript keys like so:

| Transcript key | Menu Param |
| -------------- | ---------- |
| `Menu_Main` | `staticMessage_<LANG>` (whole-menu text; wins when present) |
| per-choice line | `menuChoiceMessage_<key>_<LANG>` |
| `Menu_WrongChoice` | `invalidChoiceMessage_<LANG>` |
| `Menu_NoMoreTries` | `maxTriesMessage_<LANG>` |

### `Scheduler_*` → NOT a routing-table op at all

The `Scheduler_*` family (`Scheduler_ClosedDisconnect`, `Scheduler_HolidayDisconnect`,
`Scheduler_ExceptionDisconnect`, the Zomer/Kerst variants, …) is played by the
**scheduler component itself**. `checkSchedule` is composite: on a Closed/Exception/…
action the Schedule API returns the prompt text inline and the component speaks it via
an embedded `say` node — "the schedule decision and the message it announces stay in
one operation" (`rtds/specs/scheduler.spec.md`).

So the generator must **never** create a `say` op carrying a `Scheduler_*` message, and
the scheduler's Closed/Disconnect branches route straight to `disconnect` (or a
transfer), not to a message-replay say. The resolver tags these keys `isScheduler:true`
and demotes them so a say-role never picks one; if one is the only match, that is a
signal the say should be **dropped**, not wired. Report any such drop.

The one generic exception say (`Exception_Unexpected`, "Wegens onvoorziene
storingen…") is different — it is the Vocalls-side transfer-failure message
(`internalTransfer.nextStep_Failure → 00070`) and is a keeper, added by default. It is
not a `Scheduler_*` key.
