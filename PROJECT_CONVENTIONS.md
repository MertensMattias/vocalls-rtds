# Project Conventions — vocalls-rtds

**v0.2 — 2026-05-28**

This document is the **reflection benchmark** for the repo. Every file, component, and feature should match what's written here. When a decision in this document and a file in the repo disagree, *one of them is wrong* — flag it and resolve it before continuing.

This is the **routing doc**. Detailed rules live in [`conventions/`](conventions/). Read this file end-to-end (it's short). Load a deep ref only when you need the detail.

---

## tl;dr — the five rules every file must satisfy

1. **Storage**: call-scoped user data goes on `varObj`. New runtime globals carry the `_rt*` prefix. See [conventions/storage.md](conventions/storage.md).
2. **Logging**: always `Logger.{debug,info,warn,error,API}` with structured `(message, contextObj, errorObj?)`. Never bare `log_*` outside the Logger implementation. See [conventions/logging.md](conventions/logging.md).
3. **Casing**: routing-table envelope keys are camelCase exact-match (`op.id`, `op.params`); Param names are PascalCase by convention but read case-insensitively via `getValue` / `getParam` / `hasKey`. See [conventions/casing.md](conventions/casing.md).
4. **Reads**: operator data is read via `getScoped(key, default)` (varObj → global → default). Bare `global[key]` reads for user data are wrong. See [conventions/storage.md](conventions/storage.md).
5. **ES5.1**: no `let`/`const`/arrow/async/spread/destructuring/string-eval anywhere — runtime, components, tests. Template literals are the only modern syntax allowed. See [conventions/es5.md](conventions/es5.md).

If a file passes these five, it's 80% of the way to consistent.

---

## Decision tree — where to look

Pick the row that matches what you're doing.

| I'm writing / changing …                                            | Start here                                                                                                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A new v2 RTDS operation component (sendSms-shaped)                  | [conventions/component-v2.md](conventions/component-v2.md) (+ tl;dr rules above)                                                            |
| A v2 RTDS component that needs Designer primitives                  | [conventions/component-v2.md](conventions/component-v2.md) + [conventions/component-mxgraph.md](conventions/component-mxgraph.md)           |
| A hand-built Designer component (no RTDS operation Type)            | [conventions/component-mxgraph.md](conventions/component-mxgraph.md)                                                                        |
| A runtime library change (`rtds_2_runtime.js`, `rtds_3_vocallsEnv.js`, …) | [conventions/storage.md](conventions/storage.md) + [conventions/logging.md](conventions/logging.md) + [conventions/casing.md](conventions/casing.md) |
| A JS-handled operation twin in the runtime (`executeXxx`)           | [conventions/lockstep.md](conventions/lockstep.md) (does the canvas component exist? keep them aligned)                                     |
| A new helper for the env library                                    | [conventions/helpers.md](conventions/helpers.md)                                                                                            |
| A test                                                              | [conventions/tests.md](conventions/tests.md)                                                                                                |
| A spec doc, README, or onboarding doc                               | See "Documentation" below — link to this file, don't repeat conventions                                                                     |
| Anything that touches `__configJSON` / `${name}` placeholders       | [conventions/params.md](conventions/params.md)                                                                                              |
| Anything where I need to know which category a component is         | [conventions/components-by-category.md](conventions/components-by-category.md)                                                              |
| Reviewing a component and want the list of known wrong moves        | [conventions/anti-patterns.md](conventions/anti-patterns.md)                                                                                |

When in doubt, ask: *which file is the canonical example?* sendSms / sendMail for v2 components; voicemaildetector for hand-built; the runtime libraries for runtime code.

---

## Tag legend

Each conventions file declares its scope in its header:

- **[All]** — applies everywhere (runtime libs, components, tests, docs).
- **[Runtime]** — libraries under `projects/<name>/globalLibraries/active/`.
- **[Component]** — files under `rtds_vocalls_operations/components/`.
- **[Test]** — files under `projects/<name>/tests/`.
- **[Doc]** — per-operation specs and skill references.

Use the tags to skip irrelevant sections when reviewing a file.

---

## Reflection checklist

Copy this into your scratch when reviewing a file. Each row is one rule from one conventions file. The **Check** column tells you whether it's mechanically checkable (grep / type / structural) or judgement (semantic — needs an agent to reason about intent).

| #   | Rule                                                                                                            | Scope         | Check       | Ref                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------- | ----------- | ------------------------------------------------------------------------- |
| 1.1 | User data writes go to `varObj`, not bare `global[...]`                                                         | [All]         | grep        | [storage.md](conventions/storage.md)                                      |
| 1.2 | New runtime-owned globals carry the `_rt` prefix                                                                | [Runtime]     | grep        | [storage.md](conventions/storage.md)                                      |
| 1.3 | Operator-data reads go via `getScoped(...)`, not bare `global[...]`                                             | [All]         | grep        | [storage.md](conventions/storage.md)                                      |
| 2.1 | Envelope keys read with exact camelCase (`op.id`, `json.operations`)                                            | [All]         | grep        | [casing.md](conventions/casing.md)                                        |
| 2.2 | Param names read via `getValue` / `getParam` / `hasKey`, not bracket exact-match                                | [All]         | grep        | [casing.md](conventions/casing.md)                                        |
| 2.3 | No write normalises the casing of a key the operator typed                                                      | [All]         | judgment    | [casing.md](conventions/casing.md)                                        |
| 3.1 | Every helper call resolves against `rtds_3_vocallsEnv.js` (or the component's inline fallback)                  | [All]         | grep        | [helpers.md](conventions/helpers.md)                                      |
| 3.2 | Component inline helper fallbacks match the env-library definitions verbatim                                    | [Component]   | grep        | [helpers.md](conventions/helpers.md)                                      |
| 4.1 | No bare `log_debug` / `log_warn` / `log_error` outside `rtds_3_vocallsEnv.js`                                   | [All]         | grep        | [logging.md](conventions/logging.md)                                      |
| 4.2 | Every outcome and exit log carries `nextStep`                                                                   | [Component]   | grep        | [logging.md](conventions/logging.md)                                      |
| 4.3 | Component log floor is three lines (config-resolved, outcome, exit)                                             | [Component]   | judgment    | [logging.md](conventions/logging.md)                                      |
| 4.4 | Calls are structured `(message, contextObj, errorObj?)` — no `\|`-concatenated strings                          | [All]         | judgment    | [logging.md](conventions/logging.md)                                      |
| 5.1 | v2 component has the four canonical ids `0`/`7`/`29`/`6`                                                        | [Component]   | grep        | [component-v2.md](conventions/component-v2.md)                            |
| 5.2 | Master-attribute order matches the canonical 23-attribute list                                                  | [Component]   | grep        | [component-v2.md](conventions/component-v2.md)                            |
| 5.3 | Master `Code` composition: `__rtParams={}` → 3 canonical helpers → guarded fallbacks → op-specific helpers      | [Component]   | judgment    | [component-v2.md](conventions/component-v2.md)                            |
| 5.4 | Init body is the universal three lines                                                                          | [Component]   | grep        | [component-v2.md](conventions/component-v2.md)                            |
| 5.5 | Output node logs exit with `nextStep`                                                                           | [Component]   | grep        | [component-v2.md](conventions/component-v2.md)                            |
| 6.1 | Visible nodes parent to `baselayer`; only the two root cells (`vocalls-master-layer` + `baselayer`) above       | [Component]   | grep        | [component-mxgraph.md](conventions/component-mxgraph.md)                  |
| 6.2 | Compound children (case/recognize/component rows) parent to the compound parent's id                            | [Component]   | grep        | [component-mxgraph.md](conventions/component-mxgraph.md)                  |
| 6.3 | Edges into compound nodes target the parent id; edges out of branches source the child id                       | [Component]   | grep        | [component-mxgraph.md](conventions/component-mxgraph.md)                  |
| 6.4 | Every edge anchors both `exit*` and `entry*` (except the canonical v2 anchor-free edges)                        | [Component]   | grep        | [component-mxgraph.md](conventions/component-mxgraph.md)                  |
| 6.5 | Annotation texts have `connectable=0;allowArrows=0;`                                                            | [Component]   | grep        | [component-mxgraph.md](conventions/component-mxgraph.md)                  |
| 7.1 | Every `var` local in component code carries `__` prefix                                                         | [Component]   | grep        | [naming.md](conventions/naming.md)                                        |
| 7.2 | Helpers declared without `var` (bare globals)                                                                   | [Component]   | grep        | [naming.md](conventions/naming.md)                                        |
| 7.3 | Cross-script state holders pre-declared in master `Variables`                                                   | [Component]   | judgment    | [naming.md](conventions/naming.md)                                        |
| 8.1 | `__setupConfig` matches the canonical version from `canonical_helpers.js`                                       | [Component]   | grep        | [params.md](conventions/params.md)                                        |
| 8.2 | No `${expression}` or `${a.b}` — only bare-identifier placeholders                                              | [Component]   | grep        | [params.md](conventions/params.md)                                        |
| 9.1 | No `let` / `const` / `=>` / `async` / `await` / `...` / destructuring                                           | [All]         | grep        | [es5.md](conventions/es5.md)                                              |
| 9.2 | No `new Function(...)` / `eval(...)`                                                                            | [All]         | grep        | [es5.md](conventions/es5.md)                                              |
| 10.1| JS-in-XML uses `&apos;`, `&quot;`, `&lt;`, `&gt;`, `&amp;`, `&#xa;`. No mixing `&apos;` with `&#39;`            | [Component]   | grep        | [encoding.md](conventions/encoding.md)                                    |
| 11.1| If the operation has a runtime twin AND a Vocalls component, both share one contract                            | [All]         | judgment    | [lockstep.md](conventions/lockstep.md)                                    |
| 12.1| Test routing-table stubs use camelCase envelope keys                                                            | [Test]        | grep        | [tests.md](conventions/tests.md)                                          |
| 12.2| Sandbox assertions read `result.sandbox.varObj.X`, not `result.sandbox.X`, for RTDS-set values                  | [Test]        | grep        | [tests.md](conventions/tests.md)                                          |

A future lint script can run all the `grep` rows mechanically. The `judgment` rows always need a human or agent reasoning about intent.

---

## Documentation hierarchy

This is the source of truth for forward-looking conventions. Other docs inherit:

- **[CLAUDE.md](CLAUDE.md)** — repo-root quick reference. Mentions PROJECT_CONVENTIONS.md and the top-five rules, but defers detail here.
- **[AGENTS.md](AGENTS.md)** — sibling of CLAUDE.md using the cross-vendor agent-config convention. Same content.
- **[.claude/skills/vocalls-component-builder/references/conventions.md](.claude/skills/vocalls-component-builder/references/conventions.md)** — component-shape detail for the skill that generates components. When the skill's conventions disagree with this doc, **this doc wins** and the skill ref gets a fix.
- **`rtds_vocalls_operations/specs/<componentName>.spec.md`** — per-operation business spec (purpose, inputs, outputs, branches). Inherits storage / logging / casing from this doc.
- **`docs/solutions/`** — postmortems and durable learnings from solved problems. Managed by `/ce-compound`.

Per-operation specs **link to this document** for storage / logging / casing rules instead of repeating them. Duplicated convention text drifts; pointers don't.

---

## Open questions / pending decisions

A running list of conventions still being decided. Each entry is either resolved (date) or open. When resolved, fold the conclusion into the relevant conventions file and remove the entry.

- **`_rtNextStep` on varObj?** The flow-control target is currently on global. **Decision: stays on global** (confirmed 2026-05-28).
- **Per-Param scope opt-out for SetAttributes?** **Decision: no opt-out, default is varObj** (confirmed 2026-05-28).
- **Should the runtime's `fetchAndStart` use structured `Logger.error` or bare `log_error`?** Production sync downgraded structured calls to concatenated strings. Open — depends on whether the regression was intentional.
- **`getScoped` in the env library** — currently absent (production sync). `guardTui.js` and `checkSchedule.js` call it. Open — pending re-application.
- **General-purpose layout pass for skill-generated components beyond the v2 trunk** — proposed approach: band-based topological layout (annotate nodes with `data-layout` lane/sequence at generation time, then deterministic geometry pass). Open — pending concrete use case the v2 trunk can't handle.

---

## How to update this document

- A new convention starts as a row in the **Open questions** section.
- When the decision is firm, fold it into the relevant `conventions/<topic>.md` file and remove the open-question entry.
- If the convention doesn't fit any existing topic, add a new `conventions/<topic>.md` and a row in the **Reflection checklist** + **Decision tree** above.
- Bump the version line at the top with the date.
