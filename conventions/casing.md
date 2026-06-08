# JSON-property casing

**Scope:** [All] · **Answers:** *How are `op.params` keys cased? camelCase, everywhere.*

The whole import/export contract is **camelCase** — envelope keys *and* Param names. One rule, two reinforcing layers. (The contract spelling is fixed by [docs/superpowers/plans/camelcase-mapping-table.md](../docs/superpowers/plans/camelcase-mapping-table.md), shared with the SQL importer/dictionary; the codemod is `scripts/camelcase_keys.py`.)

## Envelope keys — camelCase, exact match

The routing-table API ships **camelCase** envelope keys: `op.id`, `op.name`, `op.type`, `op.params`, `op.isFirstOperation`, `json.operations`, `json.sourceId`, `json.name`, `json.project`, `json.promptLibrary`, `json.supportedLanguages`. Runtime code (`rtds_2_runtime.js`) reads these as-is — exact match.

The envelope is the **API contract** with the routing-tables service. Don't mix casing here. Reading `op.Id` (PascalCase) instead of `op.id` returns `undefined` and silently breaks flow dispatch.

## Param names — camelCase, case-insensitive on read

Param names inside `op.params` are **camelCase**: `active`, `nextStep`, `nextStep_Failure`, `nextStep_Success`, `timeout`, `configId`, plus operation-specific keys like `to`, `body`, `routingId`, `scheduleID`, `phoneNumberVar`. The underscore-suffixed branch keys keep their suffix segment as-is (`nextStep_Success`, not `nextStepSuccess`).

**Reads of Param names remain case-insensitive** — defense in depth, not a licence to mix casing. A Param written as `active`, `Active`, or `ACTIVE` resolves to the same value, but the **contract is camelCase** and all artifacts are written that way. This means:

- Always read Params through `getValue(__rtParams, 'active', false)` / `getParam(op, 'active', null)` / `hasKey(__rtParams, 'nextStep_' + action)`. These are case-insensitive, and the literal you pass should be the camelCase contract name.
- Never read with bracket-syntax exact match (`__rtParams['active']`, `op.params.active`). That would lock the read to a single casing.
- `getParam(op, name, fallback)` in [rtds_2_runtime.js](../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js) implements the case-insensitive fallback for the runtime side. `getValue` / `hasKey` in the env library do the same for components.

## Write-side: preserve casing

`walk(obj, fn)` and direct assignments to `varObj[key]` **preserve the operator's casing**. Whatever casing the operator typed in `__configJSON` becomes the output contract — downstream components reading that key with `getValue(varObj, 'routingId', ...)` will find it whether the operator wrote `routingId`, `RoutingId`, or `ROUTINGID`, because the read is case-insensitive. No normalisation pass between read and write. New flows are authored camelCase per the contract.

## Reflect on

- **[grep]** Does code read envelope keys (`op.id`, `json.operations`, ...) with exact camelCase match?
- **[grep]** Does code read Param names with `getValue` / `getParam` / `hasKey` rather than bracket exact-match, passing the camelCase contract name?
- **[judgment]** Does any write normalise the casing of a key the operator typed? It shouldn't.
