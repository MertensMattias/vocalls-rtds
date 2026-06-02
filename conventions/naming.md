# Variable naming — the `__` prefix

**Scope:** [Component] · **Answers:** *Which variables need the `__` prefix? When do I use bare names?*

## The three prefix buckets

Component identifiers fall into three visually-distinct buckets:

| Prefix | What |
| ------ | ---- |
| `__`   | Component-authored. Per-component globals (`__rtParams`, `__rtBaseUrl`, `__rtEndpoint`, `__rtNextStep`), every master-layer function (`__makeLocalNodeId`, `__setupConfig`, `__splitSemicolonList`, …), **and every `var`-declared local inside any function or work-node body** (`var __separator`, `var __keys`, `var __i`, `var __url`, `var __payload`, …). No exceptions. |
| `_`    | Platform-supplied flow variables (`_rtNextStep`, `_rtBaseUrl`, `_rtMailEndpoint`, `_headers`). See [storage.md](storage.md) for the `_rt*` family. |
| (none) | Runtime/host APIs (`global`, `environment`, `context`, `Logger`, `getValue`, `walk`, `hasKey`, `jsonHttpRequest`, `fileExists`, `nowUTC`, `varObj`). |

Keeping the three buckets visually distinct makes it trivial to tell at a glance whether an identifier is component-owned or runtime-provided. **Bare `var x` inside a component breaks that contract.**

## The `__` rule in detail

Every `var`-declared local inside component code carries the `__` prefix: `__params`, `__keys`, `__i`, `__raw`, `__resolved`, `__url`, `__timeout`, `__payload`, `__written`, etc. This namespaces component locals away from operator-defined names that might leak into globals via `${name}` substitution.

## Exceptions — kept bare

Function-signature bindings, not `var` locals:

- `walk` callback parameters: `function (key, value) { ... }`.
- `.then` callback parameters: `function (result) { ... }`, `function (err) { ... }`.
- `replace` callback parameters: still local — **do** prefix them: `function (__match, __name) { ... }`.

## Helpers — declared without `var`

Master-Code helpers and operation-specific helpers are bare globals:

```js
__makeLocalNodeId = function (nodeId) { ... };
__isMobileNumber  = function (phone)  { ... };
```

This is how Vocalls cross-node visibility works — `var` would scope the helper to the current script node only.

## Cross-script-node state

State that spans multiple script nodes (e.g. `__guardTuiGuardId` in [guardTui.js](../rtds/components/guardTui.js)) **should** be pre-declared in the master `Variables` block so its lifecycle is visible. Lazy assignment at first write is a smell — the variable becomes invisible to a reader scanning master `Variables`.

## Reflect on

- **[grep]** Does every `var` local carry `__`?
- **[grep]** Are helper declarations bare globals (no `var`)?
- **[judgment]** Are cross-script state holders pre-declared in master `Variables`?
