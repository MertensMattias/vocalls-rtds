# Language Audit — Apply Choice & Translation Quality (Phase 2.5)

Reference for the `vocalls-brief` skill — extracted from SKILL.md Phase 2.5.

## Apply user choice

After the mismatch report prompts the user:

- **yes** — translate every flagged chunk into `primaryLanguage`. Replace
  the extracted value in the extraction object with the translation. Tag
  the chunk with `translated: true, sourceLang: '<DETECTED_LANG>'` so
  Phase 3 can emit the marker.
- **no** — do not translate. Tag each flagged chunk with
  `langMismatch: '<DETECTED_LANG>'` so Phase 3 can emit a review marker.
  Do not modify the value.
- **select** — list the language groups numerically (one number per
  detected language, not per chunk), e.g.

  ```
  Select groups to translate (comma-separated, or 'all' / 'none'):
    1. NL  (4 chunks across persona, cases, knowledge, tool)
    2. FR  (1 chunk in Case 3)
  ```

  Translate only the chunks in selected groups; treat unselected chunks
  as **no**.

## Translation quality rules

When translating any chunk:

- Preserve every `{placeholder}` token verbatim (e.g. `{caseNumber}`,
  `{customerName}`, `{_apiResult.field}`).
- Preserve tool names, case identifiers (`Case 1`, `fallback_error`),
  CDB log IDs (`cdbLog4`, `cdbLogEX`), and variable names unchanged —
  these are identifiers, not prose.
- Preserve any IF / THEN / ELSE / AND / OR pseudocode keywords as-is
  when they appear in objectives; translate only the surrounding prose.
- Match register and tone to `persona.tone` (e.g. formal vs. informal
  address — in NL/DE the formal/informal distinction matters; in FR pick
  `vous` for professional tones).
- For opening lines: keep the conversational length similar to the
  source — do not expand a 6-word greeting into a 20-word one.
- Do not invent content. If the source chunk is ambiguous, translate
  literally and let the human reviewer adjust.

After translation: the extraction object holds the translated text;
the original source-language content is not retained inline (the marker
in Phase 3 is the only audit trail). If the user wants the original
preserved alongside, they can re-run with `no` and translate manually.
