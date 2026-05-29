# JSON-property casing

**Scope:** [All] · **Answers:** *How do I read `op.params` keys? camelCase or PascalCase?*

Two layers, two rules.

## Envelope keys — camelCase, exact match

The routing-table API ships **camelCase** envelope keys: `op.id`, `op.name`, `op.type`, `op.params`, `op.isFirstOperation`, `json.operations`, `json.sourceId`, `json.name`, `json.project`, `json.promptLibrary`, `json.supportedLanguages`. Runtime code (`rtds_2_runtime.js`) reads these as-is — exact match.

The envelope is the **API contract** with the routing-tables service. Don't mix casing here. Reading `op.Id` (PascalCase) instead of `op.id` returns `undefined` and silently breaks flow dispatch.

## Param names — PascalCase by convention, case-insensitive on read

Param names inside `op.params` are written by operators in **PascalCase**: `Active`, `NextStep`, `NextStep_Failure`, `NextStep_Success`, `Timeout`, `ConfigId`, `LogAttributes`, plus operation-specific keys like `To`, `Body`, `RoutingId`, `ScheduleID`, `PhoneNumberVar`.

**Reads of Param names are case-insensitive.** A Param written as `Active`, `active`, or `ACTIVE` must resolve to the same value. Casing of Param names is a stylistic preference, not a contract — readers normalise. This means:

- Always read Params through `getValue(__rtParams, 'Active', false)` / `getParam(op, 'Active', null)` / `hasKey(__rtParams, 'NextStep_' + action)`. These are case-insensitive.
- Never read with bracket-syntax exact match (`__rtParams['Active']`, `op.params.Active`). That would lock the read to a single casing and break if a routing-table response uses a different one.
- `getParam(op, name, fallback)` in [rtds_2_runtime.js:280-296](../references/rtds_2_runtime.js#L280-L296) implements the case-insensitive fallback for the runtime side. `getValue` / `hasKey` in the env library do the same for components.

## Write-side: preserve casing

`walk(obj, fn)` and direct assignments to `varObj[key]` **preserve the operator's casing**. Whatever casing the operator typed in `__configJSON` becomes the output contract — downstream components reading that key with `getValue(varObj, 'RoutingId', ...)` will find it whether the operator wrote `routingId`, `RoutingId`, or `ROUTINGID`, because the read is case-insensitive. No normalisation pass between read and write.

## Reflect on

- **[grep]** Does code read envelope keys (`op.id`, `json.operations`, ...) with exact camelCase match?
- **[grep]** Does code read Param names with `getValue` / `getParam` / `hasKey` rather than bracket exact-match?
- **[judgment]** Does any write normalise the casing of a key the operator typed? It shouldn't.
