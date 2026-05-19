# Canonical Grounding Line

> AUTO-GENERATED from `core/grounding-line.js` via `npm run schema:docs`. Do not edit.

**Contract:** PQR Criterion 6 requires this sentence verbatim in every scenario objective that has a KNOWLEDGE block. **Scenario-designer** authors the line into the primary-language objective immediately after the `Goal:` line and before the first numbered step; not numbered itself. **Config-builder** copies the objective verbatim — the line travels with the verbatim copy. **Translator** uses the exact target-language phrase from the table below — no paraphrase.

| Language | Grounding line |
|----------|---------------|
| NL | Beantwoord de vraag van de klant uitsluitend op basis van de informatie in het KENNIS-blok hierboven. Verzin niets en voeg geen informatie toe die daar niet in staat. |
| FR | Repondez a la question du client uniquement sur la base des informations du bloc CONNAISSANCES ci-dessus. N'inventez rien et n'ajoutez aucune information qui n'y figure pas. |
| DE | Beantworten Sie die Frage des Kunden ausschliesslich auf Grundlage der Informationen im WISSEN-Block oben. Erfinden Sie nichts und fugen Sie keine Informationen hinzu, die dort nicht enthalten sind. |
| EN | Answer the customer's question using only the information in the KNOWLEDGE block above. Do not infer, add, or invent anything not explicitly stated there. |

These strings are the canonical source for PQR Criterion 6 (knowledge grounding) and must match the table in `prompt-layer-map.md` exactly.
