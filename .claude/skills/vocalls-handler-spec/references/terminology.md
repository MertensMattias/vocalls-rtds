# Terminology — Vocalls In, PureConnect Out

The spec is written in **Vocalls vocabulary** so the downstream
[rtds-vocalls-component-gen](../../rtds-vocalls-component-gen/SKILL.md)
skill can consume it without a translation pass. This is a quick
substitution sheet for the Step 6 validation sweep in [SKILL.md](../SKILL.md).

## Vocabulary table

| PureConnect term (do not use)                                            | Vocalls term (use)                                                                                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Handler                                                                  | Operation / Component                                                                                             |
| Handler name (`NAllo_RTDS_<X>`)                                          | Operation Type (`<X>`)                                                                                            |
| Initiator                                                                | (The Operation's input interface — defined by the Params bag)                                                     |
| Step / Tool / Subroutine                                                 | (Internal to the work node — the spec doesn't enumerate them)                                                     |
| `lsAttrNames` / `lsAttrValues`                                           | `Params` (the operation's parameter bag — read with `getValue`)                                                   |
| `GetAt(p_lsAttrValues, Find(p_lsAttrNames, "X", 0))`                     | `getValue(__rtParams, 'X')` (or `getValueOrFalsy` / `hasKey` / `walk`)                                            |
| `p_sNextStep`                                                            | Staged as `__rtOutcome` (the chosen `NextStep_*` key); resolved once at the output node into the flow var `_rtNextStep` |
| `p_lsAttrNames` / `p_lsAttrValues`                                       | `__rtParams` (built once in the init node by `__rtParams = __setupConfig(__configJSON)`)                          |
| `Interaction1`                                                           | (Implicit — Vocalls runtime owns the call object)                                                                 |
| `c_sDsRtPath`                                                            | (Gone — Vocalls fetches via the RTDS HTTP API)                                                                    |
| `c_s<BaseUrl>` (handler constant)                                        | `__rtBaseUrl` (component global, sourced from flow var `_rtBaseUrl`)                                              |
| HTTP endpoint constant (`c_s<Type>Endpoint`)                             | `__rtEndpoint` (component global, sourced from flow var `_rt<TypePrefix>Endpoint`)                                |
| `ATTR_AttendantProfile`, `RTDS_Path`, `RTDS_ProjectId`, etc.             | (Drop — the Vocalls runtime owns the equivalent state on `context.session.variables` directly)                    |
| `Set Attribute` (writing a Param-sourced key)                            | `walk(context.session.variables, key, value)` (the `SetAttributes` pattern's writer)                              |
| `Log Message` (writes to CallLog)                                        | `Logger.info` / `Logger.warn` / `Logger.error` — three log lines per operation, terminal-only                     |
| `Notify Debugger`                                                        | (Gone — use `Logger.debug` if you want a trace point, never a separate step)                                      |
| `IVRLogging` subroutine call                                             | Same — collapses to a single `Logger.*` line; no subroutine                                                       |
| Branch label (`True`, `False`, `Success`, `Failure`, `Next`)             | `NextStep_<Branch>` key on the Params bag (`NextStep_True`, `NextStep_False`, `NextStep_Success`, `NextStep_Failure`, `NextStep`) |
| `ExitPath`                                                               | (Internal — the spec only documents the resolved `NextStep_*` per branch)                                         |
| `ReplaceAttributes` / `$(TOKEN)` resolution                              | (Implicit — `getValue` reads are already token-resolved by `resolveTokens`)                                       |
| `Parse String` with delimiter                                            | Note in Param description as "pipe-delimited list" — the splitter is internal to the component                    |
| `Test(condition, ifTrue, ifFalse)` (PureConnect's ternary)               | `(condition) ? ifTrue : ifFalse` — but only inside JS sketches, not in prose                                      |
| `StrEqlNoCase(a, b)`                                                     | `a.toLowerCase() === b.toLowerCase()` (in JS sketches) — but normally absorbed by `getValue` boolean coercion     |
| `StrLen(x) > 0`                                                          | "is non-empty" (in prose); `!!x` in JS sketches                                                                   |
| `GetHead(list)`                                                          | `list[0]` (in JS sketches)                                                                                        |
| `StrTrimW(x)`                                                            | `x.trim()` (in JS sketches)                                                                                       |
| Routing-table lookup (`GetDsAttrs` against `c_sDsRtPath`)                | (Gone — replaced by the Vocalls RTDS HTTP API — see [RTDS_runtime_spec.md §2](../../rtds-vocalls-component-gen/references/RTDS_runtime_spec.md)) |
| "Active = Yes?" guard                                                    | "Skip if `Active` is falsy" — the universal inactive-guard at the top of every work body                          |
| Transfer timeout (ring timeout) Param                                    | `timeout` Param → `redirect` node's `Timeout="{__transferTimeout}"` attribute. **Document as wired** — not an open question. |
| Calling-party number / CLI / ANI on a transfer leg                       | `outboundAni` Param → `P-Asserted-Identity:<number>;` SIP header appended to `parameters` via `__appendPAssertedIdentity`. **Document as wired** — not an open question. |
| Attend vs blind transfer toggle                                          | Two `redirect` nodes (`TransferType="attend"` / `"blind"`) behind a `case` on staged `__doTransfer` / `__attendTransfer`. `TransferType` is a fixed node setting, not a runtime value. |

## Identifier discipline

When the spec includes a JS work-body sketch, identifiers MUST follow
[naming.md](../../rtds-vocalls-component-gen/conventions/naming.md):

| Prefix      | Use for                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `__`        | Component-authored: `__rtParams`, `__rtOutcome`, `__rtBaseUrl`, `__rtEndpoint`, `__rtNextStep`, `__configJSON`, `__setupConfig`, every local var (`__url`, `__payload`, `__to`, `__keys`, …) |
| `_`         | Platform-supplied flow variables: `_rtNextStep`, `_rtBaseUrl`, `_rt<TypePrefix>Endpoint`, `_headers`                                                          |
| (no prefix) | Runtime/host APIs: `global`, `environment`, `context`, `Logger`, `getValue`, `walk`, `hasKey`, `jsonHttpRequest`, `nowUTC`                                    |

If a sketch contains a bare `var x = …;` without the `__` prefix, the
component builder will reject it. The double-underscore is load-bearing —
see [vocalls-component-double-underscore-prefix.md](../../../../../C:/Users/merte/.claude/projects/c--Users-merte-dev-vocalls-rtds/memory/vocalls-component-double-underscore-prefix.md) (memory).

### The outcome-staging trio — don't confuse the three

| Identifier      | What it is                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| `__rtOutcome`   | Component-internal **staged outcome key** — the literal Params key *name* (`'NextStep'`, `'NextStep_Success'`, `'NextStep_Failure'`, `'NextStep_<State>'`, …). Seeded `'NextStep'` in the init node; the work body assigns it with a plain `=`, at most once per path. |
| `_rtNextStep`   | The engine's **flow variable** (bare, leading single underscore). Written **once**, at the output node, via `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`. Never written mid-flight. **Never** `global[_rtNextStep] = …`. |
| `__rtNextStep`  | The component-scoped mirror of `_rtNextStep`, kept in sync by the master-`Variables` line `__rtNextStep &= _rtNextStep` (placeholder-binding `&=`). It is **not** the resolution target — don't assign to it in the work body. |

A spec's "Component structure" section shows `__rtOutcome` staged in the
`script` body and resolved to `_rtNextStep` in the `output` body. If a sketch
writes `global[_rtNextStep]`, uses a `-1` fallback, or `return`s an exit key,
it's on the old contract — fix it.

## Naming the operation

The spec header names the operation in **camelCase** matching the
`<componentName>` placeholder used throughout the component-builder
skill:

- `NAllo_RTDS_SendSMS` → `sendSms`
- `NAllo_RTDS_Disconnect` → `disconnect`
- `NAllo_RTDS_FlowJump` → `flowJump`
- `NAllo_RTDS_WorkgroupTransfer` → `workgroupTransfer`
- `NAllo_RTDS_CheckAttribute` → `checkAttribute`

This name appears in `Logger.*` calls as `[<componentName>]`, in the
output-node `OnEnter` log, and in the saved spec file's name. The full
operation Type (PascalCase) appears in the header table as the
"Operation Type" field.

## Disallowed in spec prose

Never let these leak past Step 6's validation sweep:

- `lsAttrNames`, `lsAttrValues`, `p_lsAttrNames`, `p_lsAttrValues`
- `GetAt`, `Find`, `StrEqlNoCase`, `StrTrimW`, `StrLen`, `StrLeft`, `Test()` (as a PureConnect call), `GetHead`
- `c_sDsRtPath`, `c_sDsCachePath`
- `ATTR_*` literals
- `CallLog`, `Notify Debugger`, `ReplaceAttributes`, `Parse String`, `Assignment`, `creatorModule`, `creatorName`, "Step ID"
- "Initiator" (the PureConnect kind — Vocalls uses Params)
- "Subroutine" (the PureConnect kind — Vocalls components are not subroutines)

**Also disallowed — the retired (pre-`__rtOutcome`) contract.** These are not
PureConnect terms, but they encode the old output convention and must not appear
in a current spec:

- `global[_rtNextStep] = …` mid-flight (the work body stages `__rtOutcome`; only the `output` node writes, and it writes the bare `_rtNextStep`)
- a `-1` fallback on a `getValue(__rtParams, …)` step-id read (the fallback is `''`)
- `Active` defaulting to `false` in the spec's Inputs table (target is `true`; record shipped-code divergence in "Convention debt")
- `return '<exit_key>';` in a gui_exit work body (the engine emits the exit key via `prepareGuiHandoff`)
- a work-node log carrying `{ nextStep: … }` (work logs carry `{ outcome: __rtOutcome }`)

If you genuinely cannot describe a behaviour without one of these,
that's a sign the behaviour doesn't have a clean Vocalls equivalent.
Document it in the "Open questions / divergences" section of the spec
with the original PureConnect term scoped to that section only.
