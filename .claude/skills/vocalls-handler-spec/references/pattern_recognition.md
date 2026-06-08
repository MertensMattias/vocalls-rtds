# Recurring PureConnect Idioms — and What They Really Mean

The PureConnect handler authors used a small vocabulary of idioms over
and over. Once you recognise them, you can collapse 5–10 XML steps into a
single line of Vocalls intent.

## 1. The Param-read idiom

**Shape (in one or more `<Parameter value="...">` expressions):**

```
GetAt(p_lsAttrValues, Find(p_lsAttrNames, "<Key>", 0))
```

**Vocalls meaning:** Read Param `<Key>` from the Params bag.

**Spec equivalent:** `getValue(__rtParams, '<Key>')`.

**How to extract Params from a handler:** grep for `Find(p_lsAttrNames,
"` and collect the literal `<Key>` from each match. Every unique key is a
Vocalls Param. (Use `Grep -o` with the regex
`Find\(p_lsAttrNames,\s*&quot;[^&]+&quot;` and dedupe.)

## 2. The "Active = Yes?" guard

**Shape:**

```
Step: Condition
  Condition value = not StrEqlNoCase(GetAt(p_lsAttrValues, Find(p_lsAttrNames, "Active", 0)), "0")
                 or not StrEqlNoCase(GetAt(p_lsAttrValues, Find(p_lsAttrNames, "Active", 0)), "False")
  ExitPaths:
    True  → <main flow>
    False → <skip flow that sets p_sNextStep = "NextStep" and exits>
```

**Vocalls meaning:** "Skip the operation if the Param `Active` is falsy."
The double-negative-with-`StrEqlNoCase` is PureConnect's way of writing
"value is not in `{ '0', 'False' }` — i.e. it's enabled".

**Spec equivalent (the work body's Active guard):**

```js
if (String(getValue(__rtParams, 'Active', true)).toLowerCase() !== 'true') {
    Logger.info('[<componentName>] skipped -- inactive', { outcome: __rtOutcome });
    return;
}
```

The did-nothing default (`__rtOutcome = 'NextStep'`) is **staged in the init
node**, so the skipped path falls through to `'NextStep'` automatically. The
guard reads `Active` with a target default of `true` (runs unless disabled), and
logs the staged `outcome`, never `nextStep` (no step id exists until the output
node). See
[http_call.md](../../rtds-vocalls-component-gen/references/operation_bodies/http_call.md)
and [component-v2.md §6–§8](../../../conventions/component-v2.md).

## 3. The `$(TOKEN)` round-trip

**Shape:**

```
Step A: DsLookup/ReplaceAttributes
  Format String = StrTrimW(GetAt(p_lsAttrValues, Find(p_lsAttrNames, "<Key>", 0)))
  Result String = s<Key>

Step B: Assignment
  LHS = s<Key>
  RHS = Test(StrLeft(s<Key>, 2) = "$(",
             GetAt(p_lsAttrValues, Find(p_lsAttrNames, "<Key>", 0)),
             s<Key>)
```

**Vocalls meaning:** "Read Param `<Key>`; if the value still starts with
`$(`, fall back to the raw Param value; otherwise use the resolved value."
This was needed in PureConnect because token resolution happened in a
separate step. In Vocalls the runtime resolves tokens during the read
(see [RTDS_runtime_spec.md §4.5 `resolveTokens`](../../rtds-vocalls-component-gen/references/RTDS_runtime_spec.md)).

**Spec equivalent:** drop the round-trip, document the value as a single
Param read.

## 4. The `Parse String` delimiter splitter

**Shape:**

```
Step: DsLookup/Parse String
  String to Parse = GetAt(p_lsAttrValues, Find(p_lsAttrNames, "<Key>", 0))
  Delimiter Charater(s) = "|"
  List of Parsed Strings = ls<Key>
```

**Vocalls meaning:** the Param `<Key>` is a `|`-delimited list. Vocalls
handles this with `__splitDelimitedList(getValue(__rtParams, '<Key>'),
'|')` or similar — see [canonical_helpers.js](../../rtds-vocalls-component-gen/references/canonical_helpers.js).

**Spec equivalent:** note the Param as `type: string (pipe-delimited
list)` in the Inputs table. Don't show the split as a separate step.

## 5. The "next-step assignment" terminal

**Shape:**

```
Step: Assignment
  LHS = p_sNextStep
  RHS = GetAt(p_lsAttrValues, Find(p_lsAttrNames, "NextStep[_<Branch>]", 0))

  ExitPath: Next → (no targetStepID, or target is an output stub)
```

**Vocalls meaning:** the handler is taking the `<Branch>` branch — assign
the value of Param `NextStep[_<Branch>]` (which is the operation ID of the
next step) to the runtime's next-step variable.

**Spec equivalent:** every distinct `"NextStep_<Branch>"` literal you find
across all such Assignment steps becomes a row in the Outputs table. In the work
body, the chosen branch is **staged** into `__rtOutcome` (a plain `=`, the
literal key name), not written to the step variable:

```js
__rtOutcome = 'NextStep_<Branch>';
```

The output node is the single place that resolves it:
`_rtNextStep = getValue(__rtParams, __rtOutcome, '')`. Never write
`_rtNextStep` (or `global[_rtNextStep]`) mid-flight, and never use a `-1`
fallback.

## 6. The "Success/Failure" fan-out

**Shape (typical of `GetDsAttrs`, `ReplaceAttributes`, custom HTTP):**

```
Step: <Tool>
  ExitPaths:
    Success → Step X
    Failure → Step Y (terminal, or "fallback")
```

**Vocalls meaning:** Success branch executes the happy path; Failure branch
falls through to whatever `NextStep_Failure` is set to. In Vocalls this is
the `.then(successCallback, errorCallback)` pair on `jsonHttpRequest`, or
a `try/catch` guarding a synchronous step.

**Spec equivalent:** in the work-body sketch, show the `.then(...)` with
both callbacks populated and the failure branch logged with
`Logger.warn` (handled failure — the server answered with a non-success)
or `Logger.error` (transport-level failure / exception). See
[logging.md](../../rtds-vocalls-component-gen/conventions/logging.md).

## 7. The cross-handler subroutine call

**Shape:**

```
Step: Subroutine (creatorName = NAllo_RTDS_<OtherHandler>)
  Parameters: Interaction1, p_lsAttrNames, p_lsAttrValues, ...
  ExitPath: Next → ...
```

**Vocalls meaning:** PureConnect handlers chain into each other for
cross-cutting concerns (`NAllo_RTDS_IVRLogging`, `NAllo_RTDS_Play`,
`NAllo_RTDS_Guard*`). In Vocalls there is **no equivalent** — each
operation is a self-contained component. Cross-cutting concerns are
handled by:

- Logging → `Logger.*` calls in the work body.
- Prompt-playing → the operation that needs prompts is a `gui_exit`
  `PlayPrompt` operation, configured upstream by the flow author.
- Guards → modelled as separate operations in the flow, not as
  invocations from inside another operation.

**Spec equivalent:** if you encounter a subroutine call to another `NAllo_RTDS_*`,
**flag it in "Open questions"**. The translation almost certainly needs
the flow author to re-decompose the work.

## 8. The "p_sNextStep = '' then later assigned" pattern

**Shape:**

```
Step (early): Assignment
  LHS = p_sNextStep
  RHS = ""

Step (later): Assignment
  LHS = p_sNextStep
  RHS = GetAt(p_lsAttrValues, Find(p_lsAttrNames, "<NextStepKey>", 0))
```

**Vocalls meaning:** "Default the next step to empty (= signal the parent
to look up its own fallback), then later override with the explicit
branch value." This is PureConnect's equivalent of the v2 init seed
`__rtOutcome = 'NextStep'` — the did-nothing default that the work body
later overrides by staging a more specific `'NextStep_<Branch>'` key.

**Spec equivalent:** the empty default maps to the **`NextStep`** Param
(no suffix), staged as `__rtOutcome = 'NextStep'` in the init node (see
[http_call.md](../../rtds-vocalls-component-gen/references/operation_bodies/http_call.md)).
Note `NextStep` in the Outputs table without a special branch label.

## How to use this file

When walking a filtered handler (overhead already dropped per
[tool_filter.md](tool_filter.md)), match the remaining clusters against
these eight idioms. The cluster collapses to one line of Vocalls intent
plus one row in the Params or Outputs table.

If a cluster doesn't match any idiom, that's genuine novel business
logic. Describe it in plain language under "Business purpose" and put a
1–3 line JS sketch in the work-body section.
