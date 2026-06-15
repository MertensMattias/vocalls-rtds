# Storage discipline — `varObj` is the default scope

**Scope:** [All] · **Answers:** _Where do I put call-scoped data? When is `global` allowed?_

All call-scoped data lives on `varObj`. It is the only store that:

- Persists across session restore (`storeSessionVariables` mirrors it into `context.session.variables.varObj`).
- Has a stable schema defined in [rtds_1_globalConfig.js](../projects/rtds-runtime/globalLibraries/active/rtds_1_globalConfig.js) (`constVarObj()`).
- Is the agreed contract for components and the runtime to communicate user data through.

## Globals — the `_rt*` family

RTDS runtime state lives on a family of `_rt*`-prefixed globals. **`_rt` is the namespace marker for RTDS-runtime variables**: when adding a new runtime-owned global, prefix it with `_rt` so the family stays visually distinct from operator data on `varObj` and from per-component locals on `__`.

The `_rt*` family includes — at minimum — flow-control plumbing, HTTP scaffolding, and the per-environment endpoint table. The list grows as the runtime grows; treat anything `_rt*` as runtime-owned and outside the SetVariables / varObj contract.

| Global                     | Role                         | Notes                                                                                                                                                                                                                                                                                                              |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `_rtNextStep`              | Flow-control plumbing        | The platform reads `global[_rtNextStep]` to advance the flow. v2 components write the _next-step id_ once at the output node via a bare `_rtNextStep = …` (placeholder-bound to the global by `__rtNextStep &= _rtNextStep`), never `global[_rtNextStep] = …` directly. See [component-v2.md §8](component-v2.md). |
| `_rtConfig`                | Project-wide config bag      | Loaded once per call leg.                                                                                                                                                                                                                                                                                          |
| `_rtBaseUrl`               | RTDS API base URL            | Set per `environment`.                                                                                                                                                                                                                                                                                             |
| `_rt<Type>Endpoint`        | Per-operation endpoint paths | `_rtSmsEndpoint`, `_rtMailEndpoint`, `_rtScheduleEndpoint`, `_rtTuiCheckAccessEndpoint`, `_rtRoutingTableEndpoint`, … One per HTTP-calling Type.                                                                                                                                                                   |
| Other `_rt*` runtime state | Future runtime additions     | New runtime globals **must** carry the `_rt` prefix.                                                                                                                                                                                                                                                               |

Non-`_rt` platform globals also live on `global` — they pre-date the prefix convention and stay where they are:

| Global                                                 | Owner            | Notes                                                                                                                                                                                                                                                           |
| ------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_headers`                                             | Vocalls platform | HTTP header bag, initialised by `if (!_headers) { _headers = {}; }` in every init body.                                                                                                                                                                         |
| `environment`, `language`                              | Vocalls platform | Synced **from** varObj at init time by `initializeCallFlowContext`; read by the platform. Components don't write these.                                                                                                                                         |
| `context.session.variables.RTDS_*`                     | RTDS dispatcher  | `RTDS_sourceId`, `RTDS_opIndex`, `RTDS_currentOpId`, `RTDS_currentOpType`, `RTDS_currentOpConfig`, `RTDS_nextStepId`, `RTDS_error`. Lives on `context.session.variables`, not `global`.                                                                         |
| `__configJSON`, `__rtParams`, `__<componentName><Key>` | Per-component    | Component-scoped state — never user data. The `__rt` prefix on a _component-scoped_ var means "this is a component's local view of an RTDS global" (e.g. `__rtBaseUrl`, `__rtEndpoint`, `__rtNextStep`). Don't confuse it with the bare-`_rt*` runtime globals. |

**Everything else goes on `varObj`** — operator-set attributes (`RoutingId`, `customerType`, `IVREvent`, …), cross-component scratch (`schedulerExternalNumber`, `rtPromptList`, …), guard tokens, language overrides, anything else a downstream operation needs to read across components or session restores.

## Read & write contract

Reads of operator-set data go through `getScoped(key, defaultValue)`:

- `getScoped` prefers `varObj[key]` (case-insensitive), falls back to exact-case `global[key]`, then returns `defaultValue`.
- Reads of operation Params (the operator's `__configJSON`) go through `getValue(__rtParams, 'Key', default)` — these are component-local and don't need fallback.

Bare `varObj[key]` reads in components are valid only when no `global` fallback is needed (e.g. when reading a key that's guaranteed to exist on varObj at that point in the flow). When in doubt, use `getScoped`.

Writes of operator data go through `setVariable(path, value)` — the write-side counterpart to `getScoped`. A bare key targets `varObj`; a dotted path targets `varObj` / `globalThis` / a named reachable object, auto-creating intermediates and preserving the value's native type. This is what `SetVariables` (and its component twin) uses. See [setVariables.spec.md](../rtds/specs/setVariables.spec.md).

## Reflect on

- **[grep]** Does the file write user data to `global[...]`? Should be on `varObj` unless the variable is in the `_rt*` family or the non-`_rt` platform-globals table.
- **[grep]** Does any new runtime-owned global skip the `_rt` prefix? If yes, rename.
- **[grep]** Does it read operator data with bare `global[...]`? Should be `getScoped(...)`.
