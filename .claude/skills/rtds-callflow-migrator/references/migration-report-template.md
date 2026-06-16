# Migration report — `<SOURCE_FILE>` → `<OUTPUT_FILE>`

Source: `<path>` (UTF-16 PureConnect) → Output: `<path>` (UTF-8 camelCase RTDS).
Validated against `dictionary.json` (generated from `import_seeds_camelCase.sql`).

## Status

- [ ] All operation `type`s in the dictionary
- [ ] All param keys pass `UNKNOWN_PARAM`
- [ ] All values pass `TYPE_MISMATCH`
- [ ] All `nextStep*` targets resolve (`INVALID_NEXTSTEP`)
- [ ] All `applicationId`s valid (`UNKNOWN_APPLICATION`)

`<N>` operations migrated. Result: **<import-ready | blocked: reason>**.

## Judgment calls (confirm before production)

### Invented values
| Op id | Field | Value | Basis |
| --- | --- | --- | --- |
| `00000` | `customerName` / `customerProject` | `DA` / `KLANTWACHT` | split `routingId` on first `_` |

### Dropped keys (not in dictionary)
| Op id | Type | Dropped key | Value | Why |
| --- | --- | --- | --- | --- |
| `00000` | setVariables | `LogAttributes` | `…` | Cognos pipe-list, no runtime consumer |
| `00000` | setVariables | `CallflowId` | `…` | not a dict key |
| `00001` | guard | `DialGroup` | `…` | SIP trunk, not a dict key |

### Added defaults (dict-required, absent in source)
| Op id | Type | Field | Default | Confirm |
| --- | --- | --- | --- | --- |
| `00001` | guard | `outboundANI` | `""` | real outbound ANI? |
| `00001` | guard | `acceptCallMessage` | `"Press 1 to accept the call."` | wording? |

### Repaired `nextStep*` targets
| Op id | Branch | Old → New | Reasoning |
| --- | --- | --- | --- |
| `…` | `nextStep_Success` | `00067 → 00081` | old id removed; retargeted to the flow's mail op |

### Placeholders kept verbatim (replace before production)
| Op id | Field | Value | Note |
| --- | --- | --- | --- |
| `00001` | `onHoldAudioUrl` | `TENANT_DA_GUARD` | legacy audio NAME, not a URL |
| `00002` | `to` / `body` | `${rtEmailTo}` / `${rtEmailBody}` | must be set upstream on varObj/global |

## Runtime notes

- Catalogued-but-not-yet-registered types present: `<condition/emergency/checkSchedule/flowJump or none>`
  — runStep skips these to their `nextStep` with a warning until handlers are wired.

## Import precondition (out of skill scope)

`import_flow_from_json_camelCase.sql` `UNKNOWN_PROJECT` requires
`rtds.Dic_CompanyProject` to already contain the project name(s) this flow
references: **`<project names>`**. The seed does not create them; ensure they
exist in the target DB before import. PromptLibrary is find-or-created.
