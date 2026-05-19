---
name: rtds-vocalls-component-builder
description: Generate Vocalls Designer mxGraph component XML for an RTDS operation, following the example conventions (sendSms-shaped). Use whenever the user asks to build, scaffold, generate, or convert an RTDS operation handler into a Vocalls component, references files in handler_source_file/, mentions operation types like SetAttributes, Condition, CheckAttribute, FlowJump, Emergency, Schedule, WorkgroupTransfer, PlayPrompt, SendSMS etc., or asks for a Vocalls flow component that follows the "sendSms conventions" or the "example source" conventions. Make sure to use this skill anytime the user wants a new RTDS-operation-shaped Vocalls component, even if they don't explicitly say "skill" or "generate" — anything resembling "make me a Condition component" or "produce the XML for the Emergency operation" triggers this.
---

# RTDS Vocalls Component Builder

This skill produces a Vocalls Designer mxGraph component XML for a single RTDS operation, following the conventions established by the reference `sendSms` component. The skill is **not** for legacy PureConnect Interaction Handler XML and **not** for the older mxGraph components in `handler_source_file/` — both of those use conventions that have been retired.

The output is a self-contained `<mxGraphModel>` document that drops into Vocalls Designer as a reusable component.

## When to use this skill

Trigger when the user:

- Asks to generate, build, scaffold, or convert an RTDS operation into a Vocalls component.
- References an operation Type (`SetAttributes`, `Emergency`, `Schedule`, `Condition`, `CheckAttribute`, `FlowJump`, `IVRLogging`, `UpdateSourceId`, `SkillUpdate`, `RESTRequest`, `RESTGet`, `WorkgroupTransfer`, `ExternalTransfer`, `Menu`, `LanguageMenu`, `PlayPrompt`, `PlayAudio`, `Disconnect`, `GuardRouting`, `GuardTUI`, `Callback`, `SendSMS`, `SendEmail`).
- Points at a legacy handler XML in `handler_source_file/` and asks to port it.
- Asks for "a component following the sendSms conventions" or "the new conventions" or "example source conventions".

## Core inputs

Ask the user (or read from context) for these before generating:

1. **Component / operation name** — e.g. `condition`, `sendSms`, `flowJump`. This becomes the component-scoped function name (`__condition`, etc.) and the `__rt<Name><Key>` prefix when params collide.
2. **RTDS operation Type** — one of the types from the runtime spec. Determines the Params schema and the outcome branches.
3. **Params shape** — the operation's `Params` object. The user may provide this as JSON, point at an example flow, or ask the skill to derive it from `RTDS_runtime_spec.md` (section 1.5 / 5).
4. **Branching** — for JS-handled operations, the list of `NextStep_*` keys the operation produces. For GUI-exit operations, the canonical exit-key string.
5. **External calls** — if the operation calls HTTP, the base URL variable (`_rt<Name>BaseUrl`) and endpoint path variable (`_rt<Name>Endpoint`).

If any of these are missing and not derivable, ask the user before generating. Do not invent endpoints, base URLs, or branching schemas.

## Process

Follow these steps in order. Don't skip steps to save time — the conventions are dense and one missing piece (e.g. master-layer attribute order, wrong style alias) makes the output look wrong in Designer.

### Step 1 — Read the conventions and template

The skill bundle includes:

- `references/conventions.md` — every rule extracted from the example, including the rules the user named (variable naming, function declaration style) and the ones that had to be inferred (output `OnEnter` work, init-node reset block, both `.then` callbacks). Read this first.
- `assets/template.xml` — the skeleton component XML with placeholders. This is the structural starting point.
- `references/example_sendSms.xml` — the original example flow export. Diff against this when in doubt — it is the source of truth.
- `references/RTDS_runtime_spec.md` — operation Type catalogue, Params semantics, error handling rules.
- `references/RTDS_runtime.js` — reference implementations of `getParam`, `resolveTokens`, `resolveNextStep`, `executeSetAttributes`, `prepareGuiHandoff`. Use these to derive the per-operation work-node body.

### Step 2 — Build the master-layer `Code`

Compose the master `Code` attribute by concatenating, in this order:

1. **Default declarations** for every `__rt<Key>` and `__rt<Name><Key>` variable the operation reads. Use the operation's Params keys as the source. Initialise with safe defaults: `""` for strings, `-1` for numeric Ids, `false` for booleans, `10000` for timeouts.
2. **The five canonical helpers** — copy verbatim from `references/canonical_helpers.js`:
   - `__makeLocalNodeId`
   - `__resolveTemplate`
   - `__extractParams`
   - `__setupConfig`
   - `__init`
3. **Operation-specific helpers** — if the operation needs them (e.g. `__isMobileNumber` for SendSMS, an operator-eval helper for Condition / CheckAttribute, a token-walker for SetAttributes). Look at `references/operation_specific_helpers/` for a few worked examples.
4. **The work function** `__<componentName>` — the actual operation logic. For JS-handled types it sets `global[__nextStep]` to the resolved next step and returns. For GUI-exit types it writes `RTDS_OP_*` to `context.session.variables` and returns the exit key string.

Every function — canonical helper, operation-specific helper, and the work function — must be preceded by a basic JSDoc block (`/** ... */` with a description, one `@param {type} name - description` per argument, and one `@returns {type} description` or `@returns {void}`). No "trivial signature" exemption. The canonical helpers in `references/canonical_helpers.js` already carry their JSDoc — copy them verbatim and add equivalent blocks for any operation-specific helpers and the work function you generate.

Encode the whole block as an XML attribute: replace `<`, `>`, `&`, `"`, `'` with their XML entities; newlines become `&#xa;`; indent inside the JS with 4 spaces. Single-quote JS strings, encoded as `&apos;`. JSDoc blocks survive the encoding unchanged except for their newlines (`&#xa;`).

### Step 3 — Build the master-layer `Variables`

One line per consumer-facing input. Always include:

- `__configJSON = { ... };` — full Params shape with placeholder defaults.
- `__environment = environment;`

Then operation-specific references to system globals: `__rt<Name>BaseUrl = _rt<Name>BaseUrl;`, `__rt<Name>Endpoint = _rt<Name>Endpoint;`, etc.

### Step 4 — Build the master-layer `PropertiesDefinition`

JSON array. Always include the four canonical entries (`__configJSON`, `__environment`, `__nextStep`, `__outputVar`). Add operation-specific entries only when there is a user-overridable knob beyond the Params JSON.

### Step 5 — Emit the node skeleton

For most operations, the three-script-node skeleton:

```
input (id=0, transient)
   -> init (id=7, script) — reset __rt* defaults, call __init(__configJSON), log resolved values
      -> script (id=29, script) — operation work
         -> output (id=6, transient) — OnEnter logs __outputVar
```

Edges: `28` (0->7), `30` (7->29), `38` (29->6). Bare orthogonal edges, no `startArrow`. Use `entryX/entryY` overrides only on edge `28`.

For multi-outcome operations (Condition, CheckAttribute, Emergency, RESTRequest), emit one additional `output` transient per outcome (labels: `true`, `false`, `success`, `failure`, `transfer`, `disconnect`, `continue`, ...), each with its own `OnEnter` setting the outcome flag. Add edges from the work script to each output.

Use style aliases (`transientNode`, `scriptNode`) — never the long inline rounded-rect style.

The template's master `Code` carries five placeholders the skill must fill:

- `{{__rt_default_declarations}}` — one `__rt<Key> = <default>;` line per operation Param.
- `{{ComponentName}}` — the operation's TypePrefix (used by `__init` for the second candidate variable name).
- `{{operation_specific_helpers}}` — operation-specific helper functions (each preceded by its own JSDoc block).
- `{{operation_work_jsdoc}}` — JSDoc block for the per-component work function. Always required; no empty default.
- `{{componentName}}` / `{{operation_work_body}}` — the work function name and body.

### Step 6 — Fill the `init` and `script` node Codes

The `init` node body always:

1. Re-declares all `__rt*` defaults explicitly (idempotent reset). Yes, redundantly with the master `Code` declarations — this guards re-entry.
2. Initialises `_headers` if missing.
3. Calls `__init(__configJSON)`.
4. Logs every resolved `__rt*` value.

The `script` node body always:

1. Pre-assigns the default next-step outcome: `global[_rtNextStep] = __rtNextStep;` (or `global[__nextStep]` if the component exposes the configurable name).
2. Guards `__rtActive` and any other preconditions; logs and returns early when false.
3. Sets the failure default before any network call: `global[_rtNextStep] = __rtNextStep_Failure;`.
4. Issues the work (HTTP, comparison, branching) and assigns the outcome step Id to `global[__outputVar]` (or `global[__nextStep]`) in the success / error callback.

For HTTP work: `jsonHttpRequest(url, options, headers, payload).withTimeout(ms).then(successFn, errorFn)`. Both callbacks always populated. Success requires `result.success === true && result.statusCode >= 200 && result.statusCode < 300`. Serialise errors with `JSON.stringify`.

### Step 7 — Validate against the checklist

Before delivering, run through `references/checklist.md`:

- Master-layer attribute set matches exactly.
- All ids bare numeric strings.
- Style aliases used.
- No `arcSize=8`, `strokeWidth=1`, `startArrow`, `startFill`, `strokeColor` on script nodes or edges.
- Single-line elements; no XML comments.
- `&#xa;` newlines inside `Code`; `&apos;` for JS string quotes.
- Both `.then` callbacks present.
- Output `OnEnter` does work (sets outcome flag, logs).
- Every `__rt*` declared in master `Code` and reset in `init`.

## File layout reference

```
rtds-vocalls-component-builder/
SKILL.md                                (this file)
references/
  conventions.md                        Full convention rules
  checklist.md                          Pre-delivery checklist
  example_sendSms.xml                   The reference flow export
  RTDS_runtime_spec.md                  Operation catalogue + semantics
  RTDS_runtime.js                       Reference JS implementations
  canonical_helpers.js                  The five master-Code helpers, ready to paste
  operation_handler_bodies.md           Per-Type worked examples for the script node
  operation_specific_helpers/           Per-operation helper snippets
assets/
  template.xml                          Skeleton with {{placeholders}}
scripts/
  encode_for_xml_attr.py                Helper for JS-to-XML-attribute encoding
```

## Output

Save the generated component XML to the user's workspace folder (the `rtds_vocalls_development` directory) under `component_source_file/<componentName>.xml`, overwriting any existing file with that name only after asking. Provide a `computer://` link.

## Things to avoid

- Don't copy any patterns from `handler_source_file/*.xml` — those are legacy.
- Don't copy any patterns from the existing `component_source_file/*.xml` either — those are critiqued in `component_quality_instructions.md` and use the wrong style.
- Don't invent endpoint URLs or RTDS Params keys not present in the runtime spec.
- Don't use `function name(...) {}` for shared helpers — only `name = function (...) { ... };`.
- Don't omit the JSDoc block above any function declaration — every helper and the work function get one.
- Don't add XML comments or banner separators.
- Don't omit the second `.then` (error) callback.
