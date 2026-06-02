# Reference — NAllo_RTDS_Play.xml (internal helper, not a Vocalls operation)

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| Operation Type | n/a (helper subroutine called by other handlers)              |
| Component name | n/a                                                            |
| Pattern        | n/a                                                            |
| Source handler | `rtds_pureconnect_handlers/handlers/NAllo_RTDS_Play.xml`       |
| Target file    | n/a — do not generate as a Vocalls component                   |

## What this handler does (PureConnect side)

`NAllo_RTDS_Play` is the shared prompt-playback subroutine for the entire RTDS family. Other handlers (`Menu`, `PlayPrompt`, `LanguageMenu`, `CallbackMenuParticipate`, etc.) invoke it to:

1. Resolve a prompt name to a `.wav` path using:
   - `RTDS_PromptLibrary` (the configured prompt library)
   - `RTDS_PromptFolder` (the per-flow subfolder)
   - the caller's selected language (`EN`/`FR`/`DE`/`NL`)
2. Optionally branch to synthetic-speech helpers (`NAllo_Play_DigitString`, `NAllo_Play_DateTime`, `NAllo_Play_Amount`) for digit / datetime / amount readback.
3. Play the resolved `.wav` (after a `FileGetStat` existence check).
4. Optionally collect DTMF concurrently (timeout, valid-key list, escape-key, termination-key).
5. Return a result code (`Success` / `Escape` / `Tone` / `Timeout` / `Failure` / `InvalidInput`) and the collected digits.

## Why this isn't a Vocalls operation

Vocalls' prompt-playing is owned by GUI nodes (`PlayPrompt`, `PlayAudio`, `Menu`, `LanguageMenu`, etc.). There is no cross-component "play helper" — each operation that needs to play a prompt has its own `say` / `dtmf` node combination in its mxGraph. Prompt resolution (library + folder + language) is handled by the Vocalls runtime through the per-operation `Languages` settings on the master `mxCell`.

The synthetic-speech helpers (digit string, datetime, amount) collapse to Vocalls' built-in TTS — `LANGUAGE` and `TTS_VOICE` resolve to a configured voice, and operators key in human-friendly text rather than spelling out per-digit prompts.

## Recommendation

Do not port `NAllo_RTDS_Play`. Any handler that called this subroutine has its prompt-playback expressed inside its own multi-node Vocalls component, using `say` / `dtmf` / `playprompt` GUI nodes:

- `PlayPrompt` operation → `say` node + optional escape-key listener.
- `Menu` operation → `say` node (intro) + `dtmf` node + per-retry `say` nodes.
- `CallerDataEntry` operation → `say` node (prompt) + `dtmf` node + per-retry `say` nodes + optional digit-by-digit readback.
- Synthetic readback (digits / datetime / amount) → Vocalls' built-in TTS in the `say` node text.

Flag in "Open questions" of any spec whose source handler invokes `NAllo_RTDS_Play` (the spec author has done this already in `disconnect`, `playPrompt`, `menu`, etc.).

### Open questions

- Confirm Vocalls' built-in number-to-speech and datetime-to-speech cover the operator's needs, or whether per-digit / per-segment WAV libraries need to be carried forward.
- Confirm the `EN`/`FR`/`DE`/`NL` language switching is automatic from the operation-level `Languages` configuration, not per-prompt.
