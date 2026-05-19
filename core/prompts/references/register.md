# Voice register & translation pitfalls

Per-language register (formal vs informal pronoun choice) and common
translation pitfalls. Verbatim section headers and DNT terms are not
here — they are code-projected into stage kickoffs from
`core/languageHeaders.js` and `core/prompts/projections/translate.js`
respectively (drift would be impossible if humans only edit code, not
prose).

## Voice register table

| Language | Default | Override condition | Formal | Informal |
|---|---|---|---|---|
| NL | **Informal** (`je / jij / jouw`) | Brief explicitly specifies `u` register, OR translate stage's primary-text projection shows `u/uw/uwe` ≥ 2× with zero `je/jij` | `u / uw / uwe` | `je / jij / jouw` |
| FR | **Formal** (`vous / votre / vos`) | Brief explicitly specifies `tu` | `vous / votre / vos` | `tu / ton / ta` |
| DE | **Formal** (`Sie / Ihnen / Ihr`) | Brief explicitly specifies `du` | `Sie / Ihnen / Ihr` | `du / dir / dein` |
| EN | Neutral (`you / your`) | — | — | — |

> NL defaults to **informal `je/jij`**. Do NOT use `u` unless the brief
> explicitly requires formal register, or the translate stage's
> evidence-based heuristic above triggers. The intake stage records the
> brief's register choice on `intake.persona.register`
> (`'formal' | 'informal' | undefined`); translate consumes that field
> first, falls back to the heuristic only when intake didn't set it.

## Common pitfalls

| Language | Pitfall | Correct approach |
|---|---|---|
| NL | Using `u` when the brief doesn't specify formal register | Default to `je / jij`; switch to `u` only on explicit brief direction or evidence-based override |
| NL | Mixing `je` and `u` within one slot | Pick one register per slot; never mix |
| FR | Mixing `tu` and `vous` within one persona | Pick one; apply consistently across all slots |
| DE | Mixing `du` and `Sie` within one persona | Default `Sie`; switch only if brief says informal |
| EN | Over-formal phrasing that sounds robotic | Match the persona register described in the brief |
