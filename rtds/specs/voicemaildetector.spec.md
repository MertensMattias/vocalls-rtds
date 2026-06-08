---
status: implemented
catalog:
  operation: "voicemaildetector"
  legacy: false
  pattern: "hand-built / non-v2 (LLM-classified)"
  component: "voicemaildetector.js"
  componentMark: "✅"
  runtimeCell: "⬜ not a routing-table operation"
  seed: "⬜"
---

# Operation Spec — voicemaildetector

> **Hand-built / non-v2 reference component.** This is the canonical hand-built
> mxGraph component cited throughout [component-mxgraph.md](../../conventions/component-mxgraph.md).
> It is **not** a routing-table RTDS operation — it has no `__configJSON` /
> `__rtParams` / `__rtOutcome` pipeline, no Operation Type, and is not registered
> in `rtds_2_runtime.js`. It is excluded from the operations catalog by design
> (`scripts/gen_catalog.py` lists it as a footnote, not a row; `scripts/check_lockstep.py`
> skips it from the component-has-spec assertion). This spec documents its actual
> behaviour for reference only.

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| Component name | `voicemaildetector`                                            |
| Pattern        | Hand-built composite — speech recognition + LLM classification (no HTTP-op pipeline) |
| Target file    | `rtds/components/voicemaildetector.js`                         |
| Registration   | None — invoked as a Designer component, not via the routing table |

## Business purpose

Decide what happened when an **outbound** call was answered: is it a human, a
voicemail/IVR, an unreachable number, or an automated call-screening assistant
(e.g. iOS call screening)? The component listens to the answered leg, builds a
short conversation transcript, and uses an LLM classifier to bucket the answer
into one of five categories, then routes the call to the matching output. It can
optionally leave a recorded message when it detects voicemail.

## Inputs (operator properties)

Configured via `PropertiesDefinition` (not a `__configJSON` Params bag). The
master `Variables` seeds the scalar defaults; the text properties are
multi-language.

| Property                | Type     | Default                                   | Description                                                                 |
| ----------------------- | -------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| `__minTimeout`          | number (ms) | `4000`                                 | Minimum wait for speech on the answered leg.                                |
| `__maxTimeout`          | number (ms) | `20000`                                | Maximum speech-capture duration.                                            |
| `__skipIfInbound`       | boolean  | `true`                                    | Skip detection on inbound calls (only meaningful on outbound legs).         |
| `__welcomeMessage`      | text (multiLanguage) | "Hello. Can you hear me?"      | Spoken on silence to elicit a response.                                     |
| `__replyToScreeningAI`  | text (multiLanguage) | "Hello, this is …"             | Reply used when an automated call-screening assistant is detected.          |
| `__recordMessage`       | text (multiLanguage) | (optional)                     | When set, the message left in voicemail after a voicemail is detected.      |
| `__terminationKeywords` | text (multiLanguage) | "thank you, thanks, saved, …"  | Keywords that signal the voicemail accepted the message.                    |

`__outputVariable` (`&= voicemailDetectedLanguage`) carries the detected
language back to the flow via the documented `&=` placeholder binding.

## Behaviour

1. **Init + dispatch** — detect bot type (chatbot vs voicebot) and call direction;
   skip to `call_answered` for chatbots, and skip via a pause when inbound and
   `__skipIfInbound` is set.
2. **Speech capture** — a `recognize` node (NLP engine `Embedding`) listens for
   `__minTimeout`–`__maxTimeout`, hinting voicemail/beep/IVR keywords; a no-input
   counter retries.
3. **Build transcript** — a script node walks `context.speakFlow` to assemble the
   Bot/User conversation history.
4. **LLM classify** — an embedded `component` node (AzureOpenAI `gpt-4.1-nano`,
   temperature `0.0`) classifies the transcript into one of: `0` not classified,
   `1` voicemail, `2` not exists / unreachable, `3` not available, `4` call
   answered (human), `5` call-screening message. It returns `{ category, language }`.
5. **Branch** — a `case` node routes on the category. Category `1` optionally plays
   `__recordMessage` and records the voicemail (a second `recognize` node);
   category `5` runs additional LLM classifiers to decide whether a human came on
   the line, looping until it resolves to human or hold.

## Outputs

Routed by **named output node**, not `NextStep_*` keys (no routing-table contract):

| Output node     | Taken when                                                       |
| --------------- | ---------------------------------------------------------------- |
| `voicemail`     | Voicemail / IVR detected (after optional message recording).     |
| `not_exists`    | Number unreachable / not in service.                             |
| `not_available` | Subscriber unavailable (busy, out of coverage, no instruction).  |
| `call_answered` | Human answered, or call-screening resolved to a human.           |

There is no `NextStep` / `NextStep_Failure` contract; the unclassified (`0`) path
falls through to the default case branch.

## External calls

No RTDS HTTP API calls. Classification is performed by embedded LLM `component`
nodes (Azure OpenAI) plus Vocalls speech `recognize` nodes. `__environment` is
hardcoded to `"acc"` in several embedded component nodes.

## Convention debt (flagged 2026-06-08)

- **Bare `log_debug` calls** (5: lines ~235, 807, 843, 944, 1153) — should be
  `Logger.debug` per [conventions/logging.md](../../conventions/logging.md).
- `__environment` is hardcoded to `"acc"` inside embedded nodes rather than
  bound from the env library — externalise as part of any future cleanup.
- No `RTDS_OP_*` usage (verified clean).

## Notes

- This component is intentionally **out of the operations catalog and lockstep
  param-parity checks** — it is a hand-built reference, not a generated v2
  operation. Do not add it to `ROW_ORDER` in `scripts/gen_catalog.py`.
