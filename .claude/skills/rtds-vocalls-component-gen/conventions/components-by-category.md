# Components by category

**Scope:** [Component] · **Answers:** *Is this component v2 or hand-built? Which conventions file applies?*

| Component                                                           | Category                                                | Notes                                                                                                                                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sendSms.js`, `sendMail.js`, `setAttributes.js`, `checkSchedule.js` | v2 RTDS operation                                       | Canonical four-node skeleton; written to be skill-generated or hand-aligned to that shape. Apply [component-v2.md](component-v2.md).                                                                        |
| `guardTui.js`                                                       | v2 RTDS composite                                       | Four canonical ids plus primitive children for the menu legs. Apply [component-v2.md](component-v2.md) for the master layer; apply [component-mxgraph.md](component-mxgraph.md) for the primitive wiring.   |
| `voicemaildetector.js`                                              | Hand-built composite                                    | **The canonical reference example for [component-mxgraph.md](component-mxgraph.md).** Operator-authored in Designer; not skill-generated. No `__configJSON`, no RTDS operation Type.                        |
| `engieGetLanguage.js`                                               | Hand-built composite                                    | Same category as voicemaildetector — Designer-authored, no `__configJSON`. Less complete reference than voicemaildetector.                                                                                  |
| `available_nodes_tempalte.js`                                       | Template / scratch                                      | Filename typo (`tempalte` → `template`). Not a live component. Delete or rename.                                                                                                                            |

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
