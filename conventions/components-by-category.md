# Components by category

**Scope:** [Component] · **Answers:** *Is this component v2 or hand-built? Which conventions file applies?*

| Component                                                            | Category                                                | Notes                                                                                                                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sendSms.js`, `sendMail.js`, `setVariables.js`, `checkSchedule.js`   | v2 RTDS operation                                       | Canonical four-node skeleton; written to be skill-generated or hand-aligned to that shape. Apply [component-v2.md](component-v2.md). `setVariables.js` superseded the old `setAttributes.js`.               |
| `say.js`                                                             | v2 RTDS operation (prompt-playing)                      | Four-node skeleton; carries a `ttsMessages` object and resolves `${var}` on the chosen language string. Apply [component-v2.md](component-v2.md) + [say-text.md](say-text.md).                              |
| `guardTui.js`                                                        | v2 RTDS composite                                       | Four canonical ids plus primitive children for the menu legs. Apply [component-v2.md](component-v2.md) for the master layer; apply [component-mxgraph.md](component-mxgraph.md) for the primitive wiring.   |
| `externalTransfer.js`, `internalTransfer.js`                        | v2 RTDS composite (redirect/transfer)                   | Four canonical ids plus a `redirect` primitive. Apply [component-v2.md](component-v2.md) + [component-mxgraph.md](component-mxgraph.md) (§4/§8a redirect/transfer conventions).                            |
| `guardRouting.js`                                                    | v2 RTDS operation (hand-built, non-canonical shape)     | Has `__configJSON` but is hand-aligned rather than skill-generated. Apply [component-v2.md](component-v2.md) for the contract; treat the live file as the source of truth for its exact shape.             |
| `voicemaildetector.js`                                               | Hand-built composite                                    | **The canonical reference example for [component-mxgraph.md](component-mxgraph.md).** Operator-authored in Designer; not skill-generated. No `__configJSON`, no RTDS operation Type.                        |
| `engieGetLanguage.js`                                               | Hand-built composite                                    | Same category as voicemaildetector — Designer-authored, no `__configJSON`. Less complete reference than voicemaildetector.                                                                                  |

## Exemption rules

Hand-built components (the [component-mxgraph.md](component-mxgraph.md) category) are exempt from:

- [component-v2.md](component-v2.md) — the four-node skeleton + master `Code` helper bundle don't apply.
- [naming.md](naming.md) — Designer-authored JS in script nodes uses bare names by convention.

They are **not** exempt from:

- [storage.md](storage.md) — varObj rules still apply.
- [logging.md](logging.md) — Logger.* discipline still applies.
- [es5.md](es5.md) — sandbox constraints still apply.
- [encoding.md](encoding.md) — XML entity rules still apply.

## Reflect on

- **[judgment]** Which category does this component fall into? Apply the conventions file pair the table points to.
