# PureConnect Overhead — The Drop List

These step types are pure PureConnect plumbing. They have no Vocalls
equivalent. **Drop them on first pass** so the remaining steps tell you
the actual business logic.

The keys below are `creatorName` values on `<Step>` elements (or
`creatorName` + a specific value pattern). When you grep a handler, scan
for these and skip the matched steps.

## Always drop — logging & debugging plumbing

| `creatorName`         | Module      | Why it's overhead                                                                                                  |
| --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| `Log Message`         | `Telephony` | Writes to CallLog. Vocalls uses `Logger.{debug,info,warn,error}` and emits exactly three log lines per component.  |
| `Notify Debugger`     | (empty)     | Designer-debug breakpoint. Pure dev tool.                                                                          |
| `NAllo_RTDS_IVRLogging` (as a `Subroutine` call) | — | Cross-handler logging fan-out. Vocalls collapses this to a `Logger.info` line per outcome — never a subroutine call. |

## Always drop — routing-scaffold writes

PureConnect's pre-Vocalls routing model wrote a fistful of `ATTR_*` keys
onto the Call so downstream IVR handlers could pick them up. Vocalls
stores state on `context.session.variables` directly, so all of these
disappear:

| Step shape                                                                                       | Why it's overhead                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Set Attribute` writing `"ATTR_AttendantProfile"` (= `"RTDS"`)                                  | Marks the call as RTDS-routed. Implicit in Vocalls.                                                                                                                            |
| `Set Attribute` writing `"RTDS_Path"`, `"RTDS_ProjectId"`, `"RTDS_ProjectName"`, `"RTDS_PromptLibrary"`, `"RTDS_SupportedLanguages"` | Header bag from `parseFlow`. Vocalls runtime already writes the equivalent (`RTDS_sourceId`, `RTDS_name`, `RTDS_project`, `RTDS_promptLibrary`, `RTDS_supportedLanguages`) per [RTDS_runtime_spec.md §3](../../rtds-vocalls-component-gen/references/RTDS_runtime_spec.md). |
| Any other `Set Attribute` writing a `"RTDS_*"` or `"ATTR_*"` literal not on the component-Params list | Bookkeeping for downstream IVR. No Vocalls equivalent.                                                                                                                         |

**Exception:** a `Set Attribute` whose attribute name is **not** in the
list above AND whose value comes from `GetAt(p_lsAttrValues, Find(p_lsAttrNames, "<Key>", 0))` is a
**business-logic write** — that's `SetAttributes`-pattern behaviour. Keep
it.

## Always drop — directory-service routing-table lookups

| `creatorName` (module `DsLookup`)        | Why it's overhead                                                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `GetDsAttr` reading from `c_sDsRtPath` … | The PureConnect Directory Service routing-table lookup. Replaced wholesale by the Vocalls RTDS HTTP API + `parseFlow`.                  |
| `GetDsAttrs` reading from `c_sDsRtPath` … | Same — bulk-attribute variant.                                                                                                          |
| `ReplaceAttributes`                      | Substitutes `$(TOKEN)` placeholders against the call's attribute bag. In Vocalls this is the runtime helper `resolveTokens(value)`. See [pattern_recognition.md](pattern_recognition.md) — it usually collapses to nothing in the spec because `getValue` returns the resolved value automatically. |
| `Parse String` (delimiter `"|"`)         | Splits a `"a|b|c"` string into a `List of String`. Vocalls reads the same value as a comma- or pipe-delimited string via `splitSemicolonList` / `splitDelimited` helpers — note the splitter in the spec, drop the step. |

## Almost always drop — variable shuffling

| `creatorName` | Pattern                                                                                                                                  | Action                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `Assignment`  | `LHS = p_<x>`, `RHS = GetAt(p_lsAttrValues, Find(p_lsAttrNames, "<Key>", 0))` — i.e. assigning a Param read to a parameter alias.        | Drop. The Vocalls equivalent is the implicit `getValue(__rtParams, '<Key>')` call where the value is consumed.                                  |
| `Assignment`  | `LHS = s<Local>`, `RHS = <expression>` where `s<Local>` is later read by another `Assignment` or `Condition`.                            | Inline mentally. The local is a refactor smell from PureConnect — Vocalls reads Params directly at the consumer.                                |
| `Assignment`  | `LHS = p_sNextStep`, `RHS = "..."` or `RHS = GetAt(...)` — assigning the next step.                                                      | **Keep the value, drop the step.** This tells you which `NextStep_*` is being chosen on this path. Record it as the branch destination.         |
| `Assignment`  | `LHS = b<Flag>`, `RHS = true` / `false`                                                                                                  | Drop. Usually a transient marker (`bFirstOperationId` etc.).                                                                                    |
| `Assignment`  | `LHS = c_<Const>`, `RHS = <constant>`                                                                                                    | Drop — but note the constant if it points outside the handler (URLs, paths).                                                                    |

## Almost always drop — token-resolution round trips

When you see this *exact* pattern:

```
Step A: ReplaceAttributes
        Format String = StrTrimW(GetAt(p_lsAttrValues, Find(p_lsAttrNames, "<Key>", 0)))
        Result String = s<Key>
        Success → Step B
        Failure → Step B

Step B: Assignment
        LHS = s<Key>
        RHS = Test(StrLeft(s<Key>, 2) = "$(", GetAt(p_lsAttrValues, Find(p_lsAttrNames, "<Key>", 0)), s<Key>)
```

… that's the PureConnect "resolve `$(TOKEN)` placeholders, fall back to the raw
value if no token expanded" idiom. In Vocalls this is one read:

```js
var __key = getValue(__rtParams, '<Key>');
```

`getValue` returns the value already token-resolved by the RTDS runtime
([RTDS_runtime_spec.md §4.5 `resolveTokens`](../../rtds-vocalls-component-gen/references/RTDS_runtime_spec.md)).

## Keep — these are business logic

These are not in the drop list. Recognise them as signal:

- **`Condition`** with a non-trivial predicate (not `StrLen > 0` of an absent value). Branches the handler on a value comparison. Maps to Vocalls `Condition` / `CheckAttribute` pattern, or to an inline guard inside another pattern.
- **`Set Attribute`** writing a key that is **not** in the routing-scaffold list, with a value sourced from a Param. Maps to Vocalls `SetAttributes` pattern.
- **Any HTTP-like step** — `URL Encode`, `Web Request`, custom HTTP tool. Maps to `http_call` pattern.
- **`Disconnect` (Telephony)** — terminal handoff. Maps to Vocalls `Disconnect` GUI-exit.
- **`SetReadyState` / workgroup-related Telephony tools** — maps to Vocalls `WorkgroupTransfer` GUI-exit.
- **`Set Attribute` writing `Eic_*` keys** — Vocalls equivalent depends on the key; treat as `SetAttributes` and flag in "Open questions" if you don't recognise it.

## Quick heuristic

If a step's `creatorName` is one of `Log Message`, `Notify Debugger`,
`Assignment` (when LHS is an alias or local), `ReplaceAttributes`, `Parse
String`, `GetDsAttrs`, `GetDsAttr`, or it's a `Set Attribute` writing one
of the routing-scaffold keys — **drop it**.

Apply the filter top-to-bottom on the handler. What's left should fit on
the back of an envelope.
