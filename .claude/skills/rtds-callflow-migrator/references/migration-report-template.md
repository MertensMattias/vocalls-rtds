# Migration report — `<SOURCE_FILE>` → `<OUTPUT_FILE>`

Source: `<path>` (UTF-16 PureConnect, `<N_src>` ops) → Output: `<path>`
(UTF-8 modern camelCase RTDS, `<N_out>` ops). Validated against `dictionary.json`
(generated from `import_seeds_camelCase.sql`) via `scripts/validate_config.py`.

## Status

- [ ] All operation `type`s in the dictionary (no retired types survived)
- [ ] All param keys pass `UNKNOWN_PARAM`
- [ ] All values pass `TYPE_MISMATCH`
- [ ] All `nextStep*` targets resolve (`INVALID_NEXTSTEP`)
- [ ] All `applicationId`s valid (`UNKNOWN_APPLICATION`)
- [ ] `validate_config.py`: `<F>` FAIL, `<W>` WARN

`<N_out>` operations emitted from `<N_src>` source ops. Result:
**<import-ready | blocked: reason | pending [ASK] answers>**.

## Modernization — dropped & rewired ops

### Dropped (retired type, no modern equivalent)
| Src id | Type | Name | Why dropped | Predecessor rewired to |
| --- | --- | --- | --- | --- |
| `00021` | Condition | Check: Staffing | queue-statistics gating, no runtime equivalent | `00060` (transfer) |
| `00003` | Emergency | Check: Adhoc Exception | emergency check retired | `00004` |
| `00070` | Callback | Callback DA HELPDESK | queue-callback retired | `00060` |
| `00082` | SendEmail | Mail-To: DA_KLANTWACHT | guard-notify chain retired | (drop) |

### Rewired (op replaced by a simpler modern op)
| Src id → Out id | From → To | Notes |
| --- | --- | --- |
| `00040`+`00060` → `00060` | WorkgroupTransfer ×2 → one internalTransfer | collapsed same-queue transfers; `target` [ASK]ed |
| `00081` → `00081` | GuardRouting → externalTransfer | guard config → dial the guard number ([ASK]ed) |

## [ASK] values (confirmed with the user)

Values the legacy document could not supply — **each confirmed via the Q/A gate
before writing**; restate the outcome here.

| Out id | Field | Value | Question asked |
| --- | --- | --- | --- |
| `00060` | `target` (internalTransfer) | `570060` | extension covering queue `DA_HELPDESK_V` |
| `00081` | `phoneNumber` (externalTransfer) | `554680` | number for `GuardRouting DA_KLANTWACHT` |
| envelope | `promptLibraryId` | `33` | id for `DIGIPOLIS\DA\HELPDESK` |
| `00099` | `prompt` (disconnect) | `Exception_Unexpected` | target-library key for legacy `Scheduler_ClosedDisconnect.wav` |

## Judgment calls (confirm before production)

### Invented values / defaults (dict-required, absent in source)
| Op id | Type | Field | Value | Basis |
| --- | --- | --- | --- | --- |
| `00000` | setVariables | `customerName` / `customerProject` | `DA` / `HELPDESK` | split `routingId` on `_` |
| `00000` | setVariables | `keysToLog` | `[…]` | remap of legacy `LogAttributes` |
| `00060` | internalTransfer | `parameters` / `attendTransfer` / `timeout` | context-blob / `true` / `30000` | golden-target defaults |

### Dropped keys (not in dictionary)
| Op id | Type | Dropped key | Value | Why |
| --- | --- | --- | --- | --- |
| `00060` | internalTransfer | `QueueName` / `Skills` / `Priority` | `DA_HELPDESK_V` / … | routed downstream at the covering extension |
| `00000` | setVariables | `CallflowId` / `LogAttributes` | `…` | folded into `routingId` / remapped to `keysToLog` |
| `00090` | externalTransfer | `PerformCallAnalysis` / `DiversionReason` | `…` | not dict keys |

### Repaired `nextStep*` targets
| Op id | Branch | Old → New | Reasoning |
| --- | --- | --- | --- |
| `…` | `nextStep` | `00040 → 00060` | old transfer id merged; retargeted to the surviving internalTransfer |

### Placeholders kept verbatim (replace before production)
| Op id | Field | Value | Note |
| --- | --- | --- | --- |
| `00090` | `phoneNumber` | `${schedulerTransferNumber}` | runtime fills from the schedule's actionDetail |
| `<id>` | `to` / `body` | `${rtEmailTo}` / `${rtEmailBody}` | must be set upstream on varObj/global (only if a mail/sms op survived) |

## Import precondition (out of skill scope)

`import_flow_from_json_camelCase.sql` `UNKNOWN_PROJECT` requires
`rtds.Dic_CompanyProject` to already contain the project name(s) this flow
references: **`<project names>`**. The seed does not create them; ensure they exist
in the target DB before import. PromptLibrary is find-or-created by path.
