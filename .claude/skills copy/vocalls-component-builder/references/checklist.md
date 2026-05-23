# Pre-delivery checklist (v2)

Run through every item before delivering a generated component. Diff against
[../../../../rtds_vocalls_operations/components/sendSms.js](../../../../rtds_vocalls_operations/components/sendSms.js)
when anything looks off — it is the structural source of truth.

## Master layer

- [ ] Master-layer attribute order matches §1.1 of [conventions.md](conventions.md) exactly.
- [ ] `id` is `vocalls-master-layer`.
- [ ] `Languages` contains the project default (`nl-BE`, `isDefault: true`).
- [ ] `BackgroundNoise="true"`, `BreathInEffect="true"`,
      `EnableUpdateRelations="true"`, `AllowGlobalIntent="false"`.

## Master `Code`

- [ ] Starts with `__rtParams = {};`.
- [ ] Contains the three canonical helpers (`__makeLocalNodeId`,
      `__extractParams`, `__setupConfig`) verbatim from
      [canonical_helpers.js](canonical_helpers.js).
- [ ] **No `__resolveTemplate`** in master `Code` (uses `new Function` —
      the runtime disables string-eval).
- [ ] `__setupConfig` substitutes `${name}` via `String.replace` —
      not via `new Function` or `eval`.
- [ ] **Does not** contain `__init` (v1 helper; gone in v2).
- [ ] Every operation-specific helper carries its own JSDoc block.
- [ ] **No** work-function helper — work logic lives inline in the script
      node (id=29).

## Master `Variables`

- [ ] `__configJSON = { ... };` with the Params shape and placeholder
      defaults.
- [ ] `__environment = environment;`
- [ ] HTTP operations declare `__rtBaseUrl = _rtBaseUrl;` and
      `__rtEndpoint = _rt<TypePrefix>Endpoint;`.
- [ ] `__rtNextStep &= _rtNextStep;` (binding operator, not a typo — see
      conventions §1.4).

## Master `PropertiesDefinition`

- [ ] Exactly three entries: `__configJSON`, `__environment`, `__nextStep`.
- [ ] **No** `__outputVar` entry (v1 had it; v2 removed it).
- [ ] `__configJSON.maxLength = 5000`.
- [ ] `__environment.defaultValue = "environment"`.
- [ ] `__nextStep.defaultValue = "_rtNextStep"`.

## Node graph

- [ ] Four objects (`input`, `init`, `script`, `output`) with ids
      `0`, `7`, `29`, `6` respectively (bare numeric strings).
- [ ] Geometry matches §1.6 of [conventions.md](conventions.md) exactly.
- [ ] Style aliases used: `transientNode`, `scriptNode`.
- [ ] No long inline `rounded=1;arcSize=8;strokeWidth=1;...` styles on any
      node.

## Edges

- [ ] Three edges: `28` (0→7), `30` (7→29), `38` (29→6).
- [ ] Each edge uses the bare orthogonal style string from §1.6.
- [ ] No `startArrow`, `startFill`, or `strokeColor` overrides.
- [ ] No `entryX/entryY` overrides.

## Init node body

- [ ] Exactly three lines: `__rtParams = __setupConfig(__configJSON)`,
      `_headers` guard, `Logger.debug` of `__rtParams`.
- [ ] Log prefix `[<componentName>]` matches the work-node log prefix.

## Script (work) node body

- [ ] First statement assigns the default next step:
      `global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);`
      (or branch-specific variant for non-linear operations).
- [ ] `Active` guard: `if (!getValue(__rtParams, 'Active', false)) { ... return; }`.
- [ ] All Param reads go through `getValue` / `getValueOrFalsy` / `hasKey`.
- [ ] HTTP operations: failure default set **before** the network call,
      success branch sets success default inside the `.then` success callback.
- [ ] HTTP operations: **both** `.then` callbacks present; error callback
      uses `Logger.error(msg, ctx, err)` (passes the caught error as 3rd arg).

## Logging (see [conventions.md §3](conventions.md))

- [ ] All logging goes through `Logger.{debug,info,warn,error}` — no bare
      `log_debug` / `log_error` calls.
- [ ] Init node uses `Logger.debug` with `{ params: __rtParams }`.
- [ ] Skip-on-inactive uses `Logger.info` with `{ nextStep }`.
- [ ] Terminal outcomes carry `nextStep` in `context`.
- [ ] Handled non-success outcomes use `Logger.warn` (validation, 4xx,
      `result.success === false`, branch fell back to default).
- [ ] Exceptions / network errors / 5xx use `Logger.error` with the caught
      error as the 3rd argument.
- [ ] No `JSON.stringify` inside `context` — Logger sanitises and truncates.
- [ ] No intermediate "checking..." / "calling..." log lines.
- [ ] No secrets in `context` (auth headers, tokens, PII).

## Output node

- [ ] `OnEnter='Logger.info(&apos;[<componentName>] exit&apos;, { nextStep: __rtNextStep });'`

## XML encoding

- [ ] All JS attribute bodies use `&#xa;` for newlines.
- [ ] JS single quotes encoded as `&apos;`.
- [ ] Angle brackets in JS encoded as `&lt;` / `&gt;`.
- [ ] Ampersands in JS encoded as `&amp;` (including in `&=`).
- [ ] No XML comments anywhere.
- [ ] No banner separators (`// =====`, `// -----`) in the JS source.

## Identifier prefix rule (see [conventions.md §5](conventions.md))

- [ ] Every `var`-declared local — in master-`Code` helpers AND in the
      script work-node body — carries the `__` prefix. No bare
      `var separator`, `var keys`, `var i`, `var url`, `var payload`,
      `var toList`, `var nextStepId`, `var written`, `var lhs/op/rhs`.
- [ ] Function parameter names and `catch (e)` bindings stay bare (they
      mirror API contracts, not `var` declarations).
- [ ] No identifier in component code starts with a single `_` unless it
      is a platform-supplied flow variable (`_rtNextStep`, `_rtBaseUrl`,
      `_rtMailEndpoint`, `_headers`).

## Cross-component sanity

- [ ] No v1 patterns: no `__rt<Key>` splay; no `__init`; no `__outputVar`;
      no per-Param declarations in master `Code`; no per-Param logs in init.
- [ ] No work-function helper in master `Code`.
- [ ] Log prefix `[<componentName>]` consistent across init + work + output.
- [ ] Diff against `sendSms.js`: master-attribute order, geometry, edge ids,
      `PropertiesDefinition` entries.
