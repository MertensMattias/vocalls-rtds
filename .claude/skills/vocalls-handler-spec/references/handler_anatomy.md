# PureConnect Handler — Anatomy & Walking Order

A PureConnect handler is a flat XML file with three top-level concerns:

```
<Handler name="..." category="...">
  <Steps>
    <Step id="N" type="..." creatorModule="..." creatorName="..." label="..." ...>
      <Parameters>...</Parameters>
      <ExitPaths>
        <ExitPath label="..." returnValue="..." targetStepID="..."/>
      </ExitPaths>
    </Step>
    ...
  </Steps>
  <Variables>
    <Variable name="..." typeName="..." .../>
  </Variables>
</Handler>
```

The control flow is encoded entirely in the `targetStepID` attribute on
`<ExitPath>` — there's no linear order. To walk the handler you start at
the Initiator (`type="Initiator"`) and follow `targetStepID` references.

## What each element gives you

### `<Handler>` element

- **`name`** — the handler name. Strip the `NAllo_RTDS_` prefix and you have the candidate Vocalls operation Type. Verify against [tool_to_vocalls_type.md](tool_to_vocalls_type.md).
- **`category`** — almost always `"NAllo RTDS"`. Carries no signal.
- **`description`** / **`version`** — ignore.

### `<Steps>` block

Each `<Step>` has these attributes:

| Attribute | What it means | Signal? |
| --------- | ------------- | ------- |
| `id` | Numeric ID used as the link target. | Plumbing — names a node, not its purpose. |
| `type` | `Initiator`, `Tool`, `Subroutine`. | Yes — see below. |
| `creatorModule` | The Designer toolbox the step came from (`Telephony`, `DsLookup`, empty for built-ins like `Assignment` / `Condition`). | Yes — combined with `creatorName` it identifies the step. |
| `creatorName` | The tool name (`Assignment`, `Condition`, `Disconnect`, `GetDsAttrs`, `Parse String`, `Set Attribute`, `ReplaceAttributes`, `Log Message`, `Notify Debugger`, …). | **The main signal.** Maps to a Vocalls Type or to "drop me" via [tool_filter.md](tool_filter.md). |
| `label` | A free-text label the developer typed. | Often. The label is what the original author intended the step to *mean* — e.g. `"sSMSRouting"`, `"Active = Yes?"`, `"p_NextStep"`. Read it. |
| `notes` | Free-text notes — usually a copy/paste of the expression. | Sometimes. Skim once. |
| `left` / `top` / `right` / `bottom` | Geometry. | Ignore. |

### `<Parameters>` inside a `<Step>`

Each `<Parameter>` carries:

- **`name`** — for tool-built parameters; `LHS` / `RHS` for `Assignment`, `Condition` for `Condition`, the parameter label for tools.
- **`value`** — the expression actually used. **Read this.**
- **`label`** — human-readable role of the parameter slot.
- **`typeName`** — `String`, `List of String`, `CallId`, `Boolean`, `Numeric`, `Integer`.

### `<ExitPaths>` inside a `<Step>`

Each `<ExitPath>` is one outgoing edge:

- **`label`** — `Start`, `Next`, `True`, `False`, `Success`, `Failure`. The branch name.
- **`returnValue`** — numeric return code, ignore.
- **`targetStepID`** — the next step's `id`. **Missing or empty `targetStepID` = terminal edge** (no outgoing connection in the graphical handler). Terminal edges with non-trivial labels (`Failure`, `Next` on the final step) usually correspond to a Vocalls `NextStep_*` branch.

### `<Variables>` block

| Prefix | What it is | Spec relevance |
| ------ | ---------- | -------------- |
| `p_*` | Parameter to the handler (subroutine arg). | Defines the handler's **inputs** — these become Vocalls Params. The standard ones (`p_lsAttrNames`, `p_lsAttrValues`, `p_sNextStep`) are *plumbing* — see below. |
| `c_s*` / `c_b*` | Constants. | Carries one signal: `c_sDsRtPath` indicates the handler reads the PureConnect routing table — that lookup goes away in Vocalls. |
| `ls*` | Local "List of String". | Plumbing 90% of the time (intermediate storage for `Parse String`, `GetDsAttrs`, etc.). |
| `s*` / `b*` / `n*` | Local primitives. | Usually plumbing. Read the label to be sure. |
| `Interaction1` | The Call ID variable. | Always present, always ignored. |

## The standard initiator signature

Every `NAllo_RTDS_*` handler has the same Initiator parameter list:

```
(Interaction Id, Attribute Names, Attribute Values, Next Step, ...)
  ↓               ↓                 ↓                  ↓
Interaction1      p_lsAttrNames     p_lsAttrValues    p_sNextStep
```

This is **plumbing**. The actual operation inputs are read from
`p_lsAttrValues` by index using `GetAt(p_lsAttrValues, Find(p_lsAttrNames,
"<Key>", 0))`. So:

- The two list parameters are the operation's **Param bag** in serialised form. Each `Find(p_lsAttrNames, "<Key>", 0)` followed by `GetAt(p_lsAttrValues, ...)` reads one Param. **Every distinct `"<Key>"` literal in the handler is a Vocalls Param.**
- The `p_sNextStep` output is the resolved next-step ID. In Vocalls the component stages the chosen branch as `__rtOutcome` and resolves it once at the output node into the flow variable `_rtNextStep` (the engine reads `global[_rtNextStep]` on re-entry). The spec doesn't write `p_sNextStep` per branch — it lists each `NextStep_*` key in the Outputs table.
- Extra parameters past index 3 (e.g. `p_bNextStepForced` on SendSMS, `p_sDsPath` and `bFirstOperationId` on FlowJump) are operation-specific. Note them as Params with a comment in the spec.

## Walking order — recommended approach

1. **Read `<Handler name>` and the Initiator's `<Parameters>` block.** That gives you the handler name + the operation-specific extras. Stop and decide the target Vocalls Type before going further.
2. **Read all `<Variables>`.** Note the constants (`c_*`). Skip the locals on first pass.
3. **Grep the file for `Find(p_lsAttrNames, "..."` (or open it in your head).** Every unique key literal is a Param. List them.
4. **Walk from Initiator → ExitPaths.** Follow `targetStepID`. For each step, decide:
   - Is it overhead? → [tool_filter.md](tool_filter.md). Skip.
   - Is it an idiom? → [pattern_recognition.md](pattern_recognition.md). Collapse it.
   - Is it business logic? → Note what it does and which Vocalls Type concept it maps to.
5. **Identify the terminal exit paths.** Every `ExitPath` with no `targetStepID` (or with a `targetStepID` that points to the Initiator's "Start" lineage) is a branch the handler can exit through. Map each to a `NextStep_*` key.
6. **Identify external calls.** If you see any HTTP step (rare in current PureConnect handlers — they tend to call `GetDsAttrs` on the directory service instead), note the URL pattern.

If a handler is small (< 100 lines like `Disconnect.xml`), steps 1–3 + a
single linear pass are enough. For complex handlers (FlowJump, the
multi-handler `*Guard*` chain, `Events`), the targetStepID walk is
mandatory because steps are not in numeric order.

## Anti-patterns when reading

- **Don't read step bodies in document order.** PureConnect Designer rearranges step IDs based on Cartesian position on the canvas — the IDs are not control-flow order.
- **Don't trust the `notes` field as documentation.** It's almost always a stale paste of an expression. Read the `value` of the relevant `<Parameter>` instead.
- **Don't enumerate `<Variables>` to list inputs.** Most variables are intermediate locals. Inputs are defined by the Initiator's `<Parameters>` and by which `"<Key>"` literals appear in `Find(p_lsAttrNames, ...)` calls.
