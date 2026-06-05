# Variable naming — the `__` prefix

**Scope:** [Component] · **Answers:** *Which variables need the `__` prefix? When do I use bare names?*

## The three prefix buckets

Component identifiers fall into three visually-distinct buckets:

| Prefix | What |
| ------ | ---- |
| `__`   | Component-authored. Per-component globals (`__rtParams`, `__rtOutcome`, `__rtBaseUrl`, `__rtEndpoint`, `__rtNextStep`), every master-layer function (`__makeLocalNodeId`, `__setupConfig`, `__splitSemicolonList`, …), **and every `var`-declared local inside any function or work-node body** (`var __separator`, `var __keys`, `var __i`, `var __url`, `var __payload`, …). No exceptions. |
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

State that spans multiple script nodes (e.g. `__guardTuiGuardId` in [guardTui.js](../rtds/components/guardTui.js), or `__rtOutcome` which the init node stages and the output node resolves) **should** be pre-declared in the master `Variables` block so its lifecycle is visible. Lazy assignment at first write is a smell — the variable becomes invisible to a reader scanning master `Variables`.

## Numeric ids from API responses — normalize once

Ids that come back from an HTTP response (record ids, config ids, member counts, …) arrive untyped — a JSON number, a numeric string (`"42"`), or absent. **Normalize once** with `Number(x) || 0` and test `> 0` for "is this a real id":

```js
var __guardId = Number(getValue(__body, 'GuardId', 0)) || 0;
if (__guardId > 0) { /* real id */ }
```

`Number(x) || 0` collapses `"42"` → `42`, `null` / `undefined` / `""` / `NaN` → `0`. **Don't** gate on `typeof x === 'number'` — a perfectly valid `"42"` from the API fails that check and a `NaN` passes it. Type-of tests on API-supplied ids are brittle; the `Number(x) || 0` + `> 0` pair is the contract. See [anti-patterns.md](anti-patterns.md).

## Reflect on

- **[grep]** Does every `var` local carry `__`?
- **[grep]** Are helper declarations bare globals (no `var`)?
- **[judgment]** Are cross-script state holders pre-declared in master `Variables`?
- **[grep]** Are API-supplied numeric ids normalized with `Number(x) || 0` and tested `> 0` (not `typeof x === 'number'`)?
