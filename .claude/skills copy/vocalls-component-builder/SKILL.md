---
name: rtds-vocalls-component-builder
description: Generate Vocalls Designer mxGraph component XML for an RTDS operation, following the v2 object-pattern conventions (sendSms-shaped). Use whenever the user asks to build, scaffold, generate, or convert an RTDS operation handler into a Vocalls component, references files in rtds_pureconnect_handlers/handlers/ or rtds_vocalls_operations/components/, mentions operation types like SetAttributes, Condition, CheckAttribute, FlowJump, Emergency, Schedule, WorkgroupTransfer, PlayPrompt, SendSMS, SendEmail etc., or asks for a Vocalls flow component that follows the "sendSms conventions" or the "v2 conventions". Trigger this skill anytime the user wants a new RTDS-operation-shaped Vocalls component, even if they don't explicitly say "skill" or "generate" — anything resembling "make me a Condition component" or "produce the XML for the Emergency operation" triggers this.
---

# RTDS Vocalls Component Builder (v2)

This skill produces a Vocalls Designer mxGraph component XML for a single
RTDS operation, following the **v2 object-pattern** conventions established
by the reference [sendSms.js](../../../rtds_vocalls_operations/components/sendSms.js).
The skill is **not** for legacy PureConnect Interaction Handler XML and
**not** for the older mxGraph components in `handler_source_file/`.

The output is a self-contained `<mxGraphModel>` document that drops into
Vocalls Designer as a reusable component.

## When to use this skill

Trigger when the user:

- Asks to generate, build, scaffold, or convert an RTDS operation into a
  Vocalls component.
- References an operation Type from the catalogue in
  [references/operation_bodies/INDEX.md](references/operation_bodies/INDEX.md).
- Points at a legacy handler XML in `rtds_pureconnect_handlers/handlers/`
  and asks to port it.
- Asks for "a component following the sendSms conventions" or "the v2
  conventions".

## Reading order

Load files lazily — never read every reference. The order below is the
default sequence; skip files that don't apply.

**Always (every invocation)**
1. [references/conventions.md](references/conventions.md) — component shape, rules, the things you have to get right.
2. [references/canonical_helpers.js](references/canonical_helpers.js) — the three helpers that go in every master `Code`.
3. [assets/template.xml](assets/template.xml) — skeleton with placeholders.

**When generating the work body**
4. [references/operation_bodies/INDEX.md](references/operation_bodies/INDEX.md) — decision tree from Type to pattern file.
5. One file from [references/operation_bodies/](references/operation_bodies/) — one of `http_call.md`, `gui_exit.md`, `set_attributes.md`, `condition.md`, `flow_jump.md`. Load only the one that matches.

**When in doubt about the runtime API or the v2 helpers**
6. [references/runtime_pointer.md](references/runtime_pointer.md) — pointer to the live `rtds_globalCodeAndHelpers.js`, with a cheat sheet for `getValue` / `walk` / `hasKey` etc.

**Reference only (rarely needed)**
- [references/RTDS_runtime_spec.md](references/RTDS_runtime_spec.md) — operation catalogue + Params semantics. Consult when you don't know what Params a given Type accepts.
- [references/example_sendSms.xml](references/example_sendSms.xml) — v1 historical sample (kept for diffing only; do not copy patterns from it).
- [references/checklist.md](references/checklist.md) — pre-delivery sweep.
- [scripts/encode_for_xml_attr.py](scripts/encode_for_xml_attr.py) — pipe JS source through this script (`python encode_for_xml_attr.py < input.js`) to get the `&apos;` / `&quot;` / `&#xa;` encoding right when emitting a `Code` attribute body. Optional — the encoding rules are simple enough to do by hand for short blocks.

## Core inputs

Ask the user (or read from context) for these before generating:

1. **Component / operation name** — camelCase, e.g. `condition`, `sendSms`,
   `flowJump`. Used as the log prefix (`[<componentName>]`).
2. **RTDS operation Type** — one of the Types from the runtime spec.
   Determines which per-Type body file to load.
3. **Params shape** — the operation's `Params` object as JSON. The user may
   provide it, point at an example flow, or ask the skill to derive it from
   `RTDS_runtime_spec.md`.
4. **Branching** — for JS-handled operations, the list of `NextStep_*` keys
   the operation produces. For GUI-exit operations, the exit-key string is
   fixed (see the per-Type body file).
5. **External calls** — if the operation calls HTTP, the base URL and
   endpoint variables (`_rtBaseUrl`, `_rt<TypePrefix>Endpoint`).

If any of these are missing and not derivable, ask the user before
generating. Do not invent endpoints, base URLs, or branching schemas.

## Process

### Step 1 — Read conventions + template

Read `references/conventions.md` first. Then open `assets/template.xml` —
it's the structural starting point with `{{placeholders}}` for the parts
that vary per Type.

### Step 2 — Master-layer `Code`

Compose by concatenating, in order:

1. **`__rtParams = {};`** — declare the runtime params object. No
   `var/let/const`.
2. **The three canonical helpers**, verbatim from
   `references/canonical_helpers.js`:
   - `__makeLocalNodeId`
   - `__extractParams`
   - `__setupConfig` (handles `${name}` placeholder substitution — see [conventions.md §2.1](references/conventions.md))
3. **Zero or more operation-specific helpers** — only if the work body
   references them. The pattern files in `references/operation_bodies/`
   inline the helpers they need (`__compareAttr` is in `condition.md`,
   `__isMobileNumber` is in `http_call.md`). Copy them from there.
4. **No work-function helper.** Work logic lives inline in the script node
   (id=29). This is intentional — see `sendSms.js`.

Every function carries a JSDoc block (description + `@param` + `@returns`),
even one-liners. Encode the block as an XML attribute: `'` → `&apos;`,
`"` → `&quot;`, `<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;`, newlines →
`&#xa;`. Indent JS with 4 spaces.

### Step 3 — Master-layer `Variables`

```js
__configJSON = { ...Params with placeholder defaults... };
__environment = environment;
__rtBaseUrl   = _rtBaseUrl;                   // HTTP operations only
__rtEndpoint  = _rt<TypePrefix>Endpoint;      // HTTP operations only
__rtNextStep &= _rtNextStep;
```

The `&=` is the documented placeholder-binding operator. Not a typo.

### Step 4 — Master-layer `PropertiesDefinition`

Exactly three entries, in this order: `__configJSON`, `__environment`,
`__nextStep`. No `__outputVar` (v1 had it; v2 removed it).

### Step 5 — Node graph

Four nodes (`input` id=0, `init` id=7, `script` id=29, `output` id=6),
three edges (`28` 0→7, `30` 7→29, `38` 29→6). Geometry, styles, and edge
strings are pinned in `references/conventions.md` §1.6.

Output node `OnEnter`: `Logger.info('[<componentName>] exit', { nextStep: __rtNextStep });`.

### Step 6 — Init + script node Codes

The **init node body** is universal — exactly three lines:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[<componentName>] config resolved', { params: __rtParams });
```

The **script (work) node body** comes from one of five pattern files in
`references/operation_bodies/`. Read
[references/operation_bodies/INDEX.md](references/operation_bodies/INDEX.md)
to pick the right one, then load just that file:

| Pattern file                                                                  | Covers                                                              |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [operation_bodies/http_call.md](references/operation_bodies/http_call.md)     | `SendSMS`, `RESTRequest`, `RESTGet`, `SkillUpdate`, `Emergency`, `Schedule`, any HTTP-calling Type |
| [operation_bodies/gui_exit.md](references/operation_bodies/gui_exit.md)       | All 11 GUI-exit Types (`WorkgroupTransfer`, `Menu`, `Disconnect`, ...). Includes the Type → exit-key lookup table. |
| [operation_bodies/set_attributes.md](references/operation_bodies/set_attributes.md) | `SetAttributes` and any setVariables-style attribute-projection Type |
| [operation_bodies/condition.md](references/operation_bodies/condition.md)     | `Condition`, `CheckAttribute`                                       |
| [operation_bodies/flow_jump.md](references/operation_bodies/flow_jump.md)     | `FlowJump`                                                          |

All Param reads go through `getValue` / `getValueOrFalsy` / `hasKey` /
`walk` from the global helpers library. Never inline a manual loop.

### Step 7 — Validate

Sweep through `references/checklist.md` before delivering. The high-cost
mistakes (wrong master-attribute order, missing JSDoc, missing error
callback, v1 `__rt<Key>` splay sneaking back in) are all listed there.

## File layout

```
vocalls-component-builder/
├── SKILL.md                                (this file)
├── references/
│   ├── conventions.md                      v2 component rules
│   ├── checklist.md                        Pre-delivery sweep
│   ├── canonical_helpers.js                The three master-Code helpers
│   ├── runtime_pointer.md                  Pointer to live rtds_globalCodeAndHelpers.js + v2-helper cheat sheet
│   ├── example_sendSms.xml                 v1 historical sample (diff only — do not copy patterns)
│   ├── RTDS_runtime_spec.md                Operation catalogue + Params semantics
│   └── operation_bodies/
│       ├── INDEX.md                        Decision tree from Type to pattern
│       ├── http_call.md                    HTTP-calling Types (+ inlined __isMobileNumber)
│       ├── gui_exit.md                     11 GUI-exit Types (+ Type → exit-key table)
│       ├── set_attributes.md               SetAttributes / setVariables
│       ├── condition.md                    Condition / CheckAttribute (+ inlined __compareAttr)
│       └── flow_jump.md                    FlowJump (one-off pattern)
├── assets/
│   └── template.xml                        Skeleton with {{placeholders}}
└── scripts/
    └── encode_for_xml_attr.py              JS → XML-attribute encoder (pipe JS through this)
```

## Output

Save the generated component XML to the user's workspace at
`rtds_vocalls_operations/components/<componentName>.js`, overwriting only
after asking. Provide a path link.

## Things to avoid

- **Don't use v1 patterns**: no `__rt<Key>` splay, no `__init`, no
  `__outputVar`, no per-Param master-`Code` declarations, no per-Param init
  logs.
- **Don't copy from `references/rtds/handlers/` or legacy
  `component_source_file/`** — those are retired.
- **Don't invent endpoint URLs, RTDS Params keys, or GUI-exit keys** —
  derive them from `RTDS_runtime_spec.md` and the per-Type body file.
- **Don't use `function name(...) {}` declarations** for component-scoped
  helpers — bare `name = function (...) { ... };` only.
- **Don't omit the JSDoc block** above any function declaration.
- **Don't add XML comments** or banner separators.
- **Don't omit the error callback** on `.then(...)`.
- **Don't introduce a case-normalisation pass** between `getValue` reads
  and `walk` writes — the asymmetry is intentional.
