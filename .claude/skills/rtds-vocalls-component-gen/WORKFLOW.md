# Workflow — RTDS Vocalls component generator

Agent methodology. **Do not duplicate convention text** — link
[conventions/](conventions/) and [PROJECT_CONVENTIONS.md](PROJECT_CONVENTIONS.md).

---

## Purpose

| In scope | Out of scope |
| -------- | ------------ |
| One v2 RTDS operation component per run | Legacy handler XML |
| Optional Designer primitives (composite) | v1 — [anti-patterns.md](conventions/anti-patterns.md) |
| Port handler *intent* into Vocalls shape | Hand-built-only — [component-mxgraph.md](conventions/component-mxgraph.md) |

---

## Step 0 — Inputs

| Input | Used for |
| ----- | -------- |
| `componentName` (camelCase) | Log prefix, filename |
| RTDS **Type** | Pattern file |
| **Params** | `__configJSON` — **never invent keys** |
| Branching / exit keys | Work body |
| HTTP: `_rtBaseUrl`, `_rt*Endpoint` | Variables — **never invent URLs** |

Types/Params: [RTDS_runtime_spec.md](references/RTDS_runtime_spec.md) or user context.

---

## What to load (tiers)

**Lazy-load only.** Do not read all of `conventions/` up front.

### Tier A — every job

| File | Why |
| ---- | --- |
| [conventions/component-v2.md](conventions/component-v2.md) | Shape, master layer |
| [canonical_helpers.js](references/canonical_helpers.js) | Three helpers verbatim |
| [sendSms.js](references/examples/sendSms.js) | Guarded fallbacks + ground truth |
| [template.xml](assets/template.xml) | Skeleton |

Skim [PROJECT_CONVENTIONS.md](PROJECT_CONVENTIONS.md) **tl;dr** (five rules only).

### Tier B — one work pattern

[operation_bodies/INDEX.md](references/operation_bodies/INDEX.md) → load **one** of:
`http_call.md` | `gui_exit.md` | `set_attributes.md` | `condition.md` | `flow_jump.md`

`component-v2.md` §7 is **HTTP-only** — use Tier B for the actual work body.

### Tier C — composite only

Primitives between script id=29 and output id=6:

| File | Why |
| ---- | --- |
| [component-mxgraph.md](conventions/component-mxgraph.md) | Wiring |
| [composite.md](references/operation_bodies/composite.md) | On top of Tier B |
| [node_types.md](references/node_types.md) | Attributes |
| [primitive_examples.md](references/primitive_examples.md) | XML ground truth |
| [voicemaildetector.js](references/examples/voicemaildetector.js) | Full composite ref |

### Tier D — on demand

`params.md` | `logging.md` | `naming.md` | `encoding.md` | `runtime_pointer.md` | `anti-patterns.md` — all under [conventions/](conventions/) except `runtime_pointer.md`.

---

## Steps 1–7

### 1 — Conventions + template

Tier A + [template.xml](assets/template.xml).

### 2 — Master `Code`

[component-v2.md §3](conventions/component-v2.md):

1. `__rtParams = {};`
2. [canonical_helpers.js](references/canonical_helpers.js) verbatim
3. Guarded fallbacks from [sendSms.js](references/examples/sendSms.js) master `Code` — [helpers.md](conventions/helpers.md)
4. Op helpers from Tier B only
5. No work-function helper (inline in id=29)

[encoding.md](conventions/encoding.md) for XML attributes.

### 3 — Variables / PropertiesDefinition

[component-v2.md §4–§5](conventions/component-v2.md). `__rtNextStep &= _rtNextStep`.

### 4 — Graph

[component-v2.md §1](conventions/component-v2.md). Composite: Tier C.

### 5 — Init + work

Init: [component-v2.md §6](conventions/component-v2.md). Work: Tier B skeleton.

### 6 — Layout

```bash
python scripts/layout_component.py <path-to-component.js>
```

### 7 — Validate

[checklist.md](references/checklist.md) + [anti-patterns.md](conventions/anti-patterns.md).

---

## Decision tree

```
Primitives 29→6?
├─ No  → Tier A + one Tier B → checklist
└─ Yes → Tier A + C + one Tier B → layout → checklist

HTTP → http_call | GUI → gui_exit | Set attrs → set_attributes | Compare → condition | FlowJump → flow_jump
```

---

## Agent rules

1. Conventions win — link, don't paraphrase rule blocks into XML.
2. Lazy tiers — not the whole bundle per job.
3. No invented Params, exit keys, endpoints.
4. No write-side casing normalisation — [casing.md](conventions/casing.md).
5. v2 only — [anti-patterns.md](conventions/anti-patterns.md).
