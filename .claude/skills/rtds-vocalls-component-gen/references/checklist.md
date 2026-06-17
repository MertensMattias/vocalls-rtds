# Pre-delivery checklist (v2)

Run through every item before delivering a generated component. Diff against
[examples/sendSms.js](examples/sendSms.js)
when anything looks off — it is the structural source of truth.

## Master layer

- [ ] Master-layer attribute order matches §2 of [component-v2.md](../conventions/component-v2.md) exactly.
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
      component-v2.md §4).

## Master `PropertiesDefinition`

- [ ] Exactly three entries: `__configJSON`, `__environment`, `__nextStep`.
- [ ] **No** `__outputVar` entry (v1 had it; v2 removed it).
- [ ] `__configJSON.maxLength = 5000`.
- [ ] `__environment.defaultValue = "environment"`.
- [ ] `__nextStep.defaultValue = "_rtNextStep"`.

## Node graph

- [ ] Four objects (`input`, `init`, `script`, `output`) with ids
      `0`, `7`, `29`, `6` respectively (bare numeric strings).
- [ ] Geometry matches §1 of [component-v2.md](../conventions/component-v2.md) exactly.
- [ ] Style aliases used: `transientNode`, `scriptNode`.
- [ ] No long inline `rounded=1;arcSize=8;strokeWidth=1;...` styles on any
      node.

## Edges

- [ ] Three edges: `28` (0→7), `30` (7→29), `38` (29→6).
- [ ] Each edge uses the bare orthogonal style string from §1.
- [ ] No `startArrow`, `startFill`, or `strokeColor` overrides.
- [ ] No `entryX/entryY` overrides.

## Init node body

- [ ] Exactly four lines: `__rtOutcome = 'nextStep';` (the did-nothing default
      seed), `__rtParams = __setupConfig(__configJSON)`, `_headers` guard,
      `Logger.debug` of `__rtParams`.
- [ ] Log prefix `[<componentName>]` matches the work-node log prefix.

## Script (work) node body

- [ ] First statement re-stages the default outcome KEY:
      `__rtOutcome = 'nextStep';` (camelCase; or branch-specific variant). The
      work body **stages** `__rtOutcome` with plain `=` and the literal
      camelCase Params key name — it never writes `_rtNextStep` directly (the
      output node resolves it once). **GUI-exit *target* components are NOT an
      exception** — they are ordinary v2 components that stage `__rtOutcome`;
      no component body ever `return`s an exit key (the engine's
      `prepareGuiHandoff` emits it).
- [ ] `active` guard:
      `if (String(__getValue(__rtParams, 'active', false)).toLowerCase() !== 'true') { ... return; }`.
- [ ] All Param reads go through the `__`-aliased delegates
      (`__getValue` / `__getValueOrFalsy` / `hasKey`) with camelCase key names.
- [ ] HTTP operations: `__rtOutcome = 'nextStep_Failure';` staged **before**
      the network call, success branch stages `__rtOutcome = 'nextStep_Success';`
      inside the `.then` success callback.
- [ ] HTTP operations: **both** `.then` callbacks present; error callback
      uses `Logger.error(msg, ctx, err)` (passes the caught error as 3rd arg).
- [ ] HTTP body truthiness checks use `String(x).toLowerCase() === 'true'`,
      never bare `if (x)` or strict `!== 'true'`.

## Logging (see [logging.md](../conventions/logging.md))

- [ ] All logging goes through `Logger.{debug,info,warn,error}` — no bare
      `log_debug` / `log_error` calls.
- [ ] Init node uses `Logger.debug` with `{ params: __rtParams }`.
- [ ] Skip-on-inactive uses `Logger.info` with `{ outcome: __rtOutcome }`
      (GUI-exit *target* skip uses `{ outcome: 'nextStep' }`).
- [ ] Work-body terminal outcomes carry `outcome: __rtOutcome` in
      `context` (not `nextStep`); the resolved `nextStep` is logged once
      at the output node.
- [ ] Handled non-success outcomes use `Logger.warn` (validation, 4xx,
      `result.success === false`, branch fell back to default).
- [ ] Exceptions / network errors / 5xx use `Logger.error` with the caught
      error as the 3rd argument.
- [ ] No `JSON.stringify` inside `context` — Logger sanitises and truncates.
- [ ] No intermediate "checking..." / "calling..." log lines.
- [ ] No secrets in `context` (auth headers, tokens, PII).

## Output node

- [ ] Resolves the staged outcome **once**:
      `_rtNextStep = __getValue(__rtParams, __rtOutcome, '');`
      then `Logger.info('[<componentName>] exit', { outcome: __rtOutcome, nextStep: _rtNextStep });`
      (XML-encoded). The write target is the bare flow variable `_rtNextStep`
      (placeholder-bound to the engine global via `__rtNextStep &= _rtNextStep`),
      **not** `global[_rtNextStep]`, and the fallback is `''` (**not** `-1`).
      This is the **only** place the step id is written. GUI-exit *target*
      components are **not** an exception — they are ordinary v2 components that
      stage `__rtOutcome` and resolve here like any other; the exit key that
      routes to them is emitted by the engine's `prepareGuiHandoff`, never
      returned by a component body.

## XML encoding

- [ ] All JS attribute bodies use `&#xa;` for newlines.
- [ ] JS single quotes encoded as `&#39;` (the numeric entity every shipped
      component uses — **not** `&apos;`; don't mix the two).
- [ ] Angle brackets in JS encoded as `&lt;` / `&gt;`.
- [ ] Ampersands in JS encoded as `&amp;` (including in `&=`).
- [ ] No XML comments anywhere.
- [ ] No banner separators (`// =====`, `// -----`) in the JS source.

## Identifier prefix rule (see [naming.md](../conventions/naming.md))

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

## Composite-mode additions (only if `composite.md` was used)

Apply these **in addition to** every item above. If no Vocalls Designer
primitives were emitted between the Script (id=29) and the output (id=6),
skip this section.

- [ ] The four canonical ids (`0`, `7`, `29`, `6`) and their geometry are
      unchanged from §1 of [component-v2.md](../conventions/component-v2.md).
- [ ] The two canonical pre-Script edges are present: `28` (0→7) and
      `30` (7→29). Edge `38` (29→6) is replaced by a chain that ends at
      id=6.
- [ ] Primitive, child, and edge ids are **unique integers** within the
      file. No rigid ≥100 / ≥200 rule (replaced — that historical
      convention does not match production components). Chrome row ids
      are conventionally `parent_id + 1`.
- [ ] Every primitive uses its style alias (`sayNode`, `setvarNode`,
      `pauseNode`, `recognizeNode`, `caseNode`, `counterNode`,
      `numberNode`, `redirectNode`, `dtmfNode`) and every child uses
      its alias (`recognizeInnerNode`, `reactionGroupNode`,
      `notRecognizedNode`, `dtmfInnerNode`, `choiceNode`, `noInputNode`,
      `caseInnerNode`, `expressionNode`, `defaultNode`,
      `counterInnerNode`, `numberInnerNode`, `redirectInnerNode`). No
      inline rounded-rect styles anywhere.
- [ ] **Every non-chrome child of a branching primitive has an explicit
      `<mxCell edge="1" parent="baselayer" source="<child-id>" target="<dest-id>">`.**
      Routing by `DynamicNextId` alone is not sufficient — those
      children carry `DynamicNextId=""` and rely on the explicit edge.
      A child with both an empty `DynamicNextId` AND no incoming edge
      from its id is an orphan branch (will render as disconnected in
      Designer).
- [ ] **Every composite-mode edge pins both ends** (`exit*` source
      anchor + `entry*` target anchor). The only anchor-free edges in a
      well-formed component are the canonical `28` (0→7), `30` (7→29),
      and `38` (29→6, non-composite Style A only). Pick the pair that
      matches the source/target geometry — see [node_types.md §Universal
      rule 10](node_types.md) for the three common patterns and the
      mixed-pair escape hatch.
- [ ] Edges source from **child ids** on `recognize`, `dtmf`, `case`,
      `counter`, `number`, `redirect`. Linear-flow Types (`say`,
      `setvar`, `pause`) edge from the parent id. Inner-header nodes
      (`*InnerNode`) are **never** edge endpoints.
- [ ] **Branching-Type children's `<mxCell>` carry
      `parent="<parent-primitive-id>"`** (the parent primitive's own
      id), not `parent="baselayer"`. Only the primitive's own
      `<mxCell>` and edge cells sit on `baselayer`. Edge cells always
      use `parent="baselayer"` regardless of where their `source`/`target`
      ids physically sit.
- [ ] Every primitive branch reaches the output node (id=6) directly or
      transitively. No dead ends, no loops back into the Script (id=29)
      or the init node (id=7).
- [ ] Bounded retry loops: any primitive whose failure branch points
      back to an earlier primitive sets `MaxEntryCount` and
      `MaxEntryNodeId="6"`.
- [ ] **The Script (id=29) work body is identical to its plain-pattern
      equivalent.** No `__makeLocalNodeId('<primitive-id>')` calls; no
      primitive ids returned as exit keys. The Script still stages
      `__rtOutcome` for a routing-table next step (resolved once at the
      output node) — it never returns a GUI-exit key; that routing is the
      engine's job (see
      [operation_bodies/gui_exit.md](operation_bodies/gui_exit.md)).
- [ ] Primitive attribute values (`Text`, `Expression`, `VariableName`,
      `VariableValue`, `Destination`, `Grammar`, etc.) are **not** JS
      and do **not** carry the `__` prefix. JS inside `OnEnter` /
      `OnLeave` blocks **does** follow §5 (every `var`-declared local
      carries `__`).
- [ ] `__configJSON` / `__rtParams` does **not** drive primitive
      attribute values. `${name}` markup in primitive attributes is for
      the engine, not for `__setupConfig`.
- [ ] Output node's `OnEnter` log
      (`Logger.info('[<componentName>] exit', { outcome: __rtOutcome, nextStep: _rtNextStep });`,
      after resolving `_rtNextStep = __getValue(__rtParams, __rtOutcome, '');`
      — bare `_rtNextStep`, `''` fallback) is the single exit-trace event. It
      fires once on the way out, regardless of which primitive branch was taken.
- [ ] Diff against [operation_bodies/composite.md](operation_bodies/composite.md)
      worked example: explicit-edge rule, parent-id rule, and
      free-integer numbering all hold.
