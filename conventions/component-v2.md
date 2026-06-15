# Component shape (v2 — skill-generated RTDS operations)

**Scope:** [Component] · **Answers:** *What does a v2 RTDS operation component look like? Four-node skeleton, master Code composition, work-body patterns.*

**Canonical reference:** [sendSms.js](../rtds/components/sendSms.js) and [sendMail.js](../rtds/components/sendMail.js). Every new RTDS operation component matches the shape below.

For the *primitive wiring* used when a v2 component embeds Designer primitives (case/recognize/component) between Script and output, see [component-mxgraph.md](component-mxgraph.md).

## 0. The one contract every component shares

Every v2 component follows **one** input/validation/output contract, regardless of how the engine reaches it (JS-twin-backed op like `sendSms`, or GUI-exit target like `guardTui`). The stages below are identical across components; only operation-specific detail (which preconditions, how many endpoints, how many `NextStep_*` outcomes) varies.

| Stage | Contract |
| ----- | -------- |
| **Input — master `Variables`** | Seed `__configJSON` (literal default Params), `__environment = environment`, `__rtBaseUrl = _rtBaseUrl`, one or more `__rt<Op>Endpoint = _rt<Op>Endpoint` bindings, the `__rtOutcome` seed, and `__rtNextStep &= _rtNextStep` (Designer placeholder-binding — see §4). |
| **Input — `PropertiesDefinition`** | Three operator-facing props: `__configJSON`, `__environment`, `__nextStep` (§5). |
| **Init node** | `__rtParams = __setupConfig(__configJSON)`; `if (!_headers) { _headers = {}; }`; seed `__rtOutcome = 'NextStep'` — the did-nothing default (§6). Op-specific extras allowed (a `Logger.debug`; `language` normalisation). |
| **Validation / work** | Active guard → return leaving `__rtOutcome = 'NextStep'`. Precondition checks → warn + return. Pivot `__rtOutcome = 'NextStep_Failure'` before any network call. `jsonHttpRequest(...).then(success, error)` with a mandatory error callback; success stages the chosen `NextStep_*` key (§7). |
| **Output node** | `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` then a `Logger.info('[<name>] exit', …)` — byte-identical across components except the log tag, fallback `''` (§8). |
| **Helpers (master `Code`)** | Shared: `__makeLocalNodeId`, `__extractParams`, `__activeFlag`, `__setupConfig`, + guarded fallbacks for `getValue/walk/nowUTC/hasKey/getScoped/resolveConfigTokens`. Op-specific helpers (`__isMobileNumber`, …) as needed (§3). |

A component **never** writes per-key `RTDS_OP_*` and **never** `return`s an exit key — GUI-exit routing is performed by the engine (`prepareGuiHandoff` writes `RTDS_currentOpConfig` and emits the exit key). See §7.

## 1. Node graph — four nodes, three edges

| id   | label  | Type      | Kind   | style           | geometry                 |
| ---- | ------ | --------- | ------ | --------------- | ------------------------ |
| `0`  | input  | transient | input  | `transientNode` | `(252.5, -350, 130, 40)` |
| `7`  | init   | script    | —      | `scriptNode`    | `(233.5, -220, 168, 80)` |
| `29` | script | script    | —      | `scriptNode`    | `(233.5, -60, 168, 80)`  |
| `6`  | output | transient | output | `transientNode` | `(252.5, 110, 130, 40)`  |

Edges: `28` (0→7), `30` (7→29), `38` (29→6). All bare orthogonal:

```
edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;
```

Composite mode (Designer primitives between id=29 and id=6): the four canonical ids and their geometry stay; edge `38` is replaced by a primitive chain ending at id=6. See [component-mxgraph.md](component-mxgraph.md).

## 2. Master-layer attributes — order matters

```
label, MaxEntryCount, MaxEntryNodeId, SpeechRecognitionEngine, Code,
Extensions, BackgroundNoise, BreathInEffect, Languages, Variables,
PropertiesDefinition, EnableUpdateRelations, AllowGlobalIntent, Translations,
ManualId, RequiredVariables, HintGrammar, LastLanguage, InfoAboutUser_nl,
CompanyInformation_nl, GeneralKnowledge_nl, Translations_nl, Sections, id
```

`id` is always `vocalls-master-layer`. `BackgroundNoise="true"`, `BreathInEffect="true"`, `EnableUpdateRelations="true"`, `AllowGlobalIntent="false"`, `Sections="[]"`. The `InfoAboutUser_*` / `CompanyInformation_*` / `GeneralKnowledge_*` / `Translations_*` suffix tracks the **default project language** (`_nl` for the canonical components); a multi-language component (e.g. [guardTui.js](../rtds/components/guardTui.js)) repeats the `InfoAboutUser_*` group per language (`_nl`, `_fr`, `_de`, `_en`).

See [sendSms.js:17-43](../rtds/components/sendSms.js#L17-L43) for the canonical attribute set.

### Languages — default is Dutch (Belgium)

The default project language is **Dutch (Belgium) — `nl-BE`**, marked `isDefault: true`. Other entries are added on demand. Empty string fields (`ttsVoiceName`, `ttsEngine`, `ttsPitch`, `ttsSpeed`, `ttsVolume`) are **preserved as `''`** — don't drop them. See the `Languages=` attribute in [sendSms.js:26](../rtds/components/sendSms.js#L26).

## 3. Master `Code` — composition

In order, separated by blank lines:

1. `__rtParams = {};` — bare declaration, no `var`.
2. The canonical helpers from [canonical_helpers.js](../.claude/skills/rtds-vocalls-component-gen/references/canonical_helpers.js), verbatim with JSDoc: `__makeLocalNodeId`, `__extractParams`, `__activeFlag`, `__setupConfig`. `__activeFlag` is a thin alias to the global `activeFlag()` (the single Active contract) — it has no fallback of its own; the env library always provides `activeFlag`.
3. `typeof <name> === 'undefined'`-guarded fallbacks. `__setupConfig` **depends on** `getValue`, `hasKey`, `getScoped`, and `resolveConfigTokens`, so emit guarded fallbacks for all four (plus `walk` / `nowUTC` / `resolveRoot` / `setVariable` when the work body uses them) — a component must run `__setupConfig` correctly even if the env library is absent. See [helpers.md](helpers.md) for why.
4. Operation-specific helpers, JSDoc'd, `__` prefixed (`__isMobileNumber`, `__splitSemicolonList`, `__compareAttr`, …).
5. **No work-function helper.** Work logic is inline in the script node body.

Every function carries a JSDoc block (description + `@param` + `@returns`), even one-liners.

## 4. Master `Variables`

```js
__configJSON = { /* Params with placeholder defaults */ };
__environment = environment;
__rtBaseUrl   = _rtBaseUrl;                 // HTTP ops only
__rtEndpoint  = _rt<TypePrefix>Endpoint;    // HTTP ops only
__rtOutcome   = 'NextStep_Failure';         // cross-script outcome key; staged in init, read at output
__rtNextStep &= _rtNextStep;
```

`__rtOutcome` is cross-script state (staged in init/work, read at the output node), so it is pre-declared here per the [naming.md](naming.md) cross-script rule. The init node re-stages it (§6); it is **not** an operator-facing property (no `PropertiesDefinition` entry — see §5).

**The `__rtOutcome` seed is mandatory for EVERY v2 component** — not just HTTP ops like [sendSms.js](../rtds/components/sendSms.js). It is the load-time safety net for any path that reaches the output node without running the init node, so a composite/redirect component ([externalTransfer.js](../rtds/components/externalTransfer.js), [internalTransfer.js](../rtds/components/internalTransfer.js)) carries it exactly like an HTTP op. A transfer/redirect component that does nothing on its happy path may seed the *did-nothing* default `__rtOutcome = 'nextStep';` rather than `'NextStep_Failure'` — pick the op's no-op outcome key (see [externalTransfer.js:27](../rtds/components/externalTransfer.js#L27)).

**Master `Variables` carries ONLY cross-script declarations** — the things that must exist before *any* node runs: `__configJSON`, `__environment`, the optional `__rtBaseUrl` / `__rt<Op>Endpoint` bindings (HTTP ops only), `__rtOutcome`, and `__rtNextStep &= _rtNextStep`. **Per-execution WORKING vars belong in the init node body only** (§6) — do not also declare them in master `Variables`. For a transfer/redirect component the working vars `__transferDest`, `__transferParams`, `__transferResult`, `__doTransfer`, `__attendTransfer`, `__transferTimeout` (and `__outboundAni` when there's a CLI Param) are pre-declared **only** in the init node — declaring them again in master `Variables` is redundant over-seeding. The shipped [externalTransfer.js:27](../rtds/components/externalTransfer.js#L27) / [internalTransfer.js:27](../rtds/components/internalTransfer.js#L27) `Variables` blocks hold only the cross-script set; the transfer working vars are init-only ([externalTransfer.js:68](../rtds/components/externalTransfer.js#L68)).

`&=` is the **documented placeholder-binding operator** — it keeps `__rtNextStep` synced with the flow variable `_rtNextStep`. Use it only on `__rtNextStep`. Everywhere else, `=`.

Keep the `&=` line in master `Variables` for every component — it keeps `__rtNextStep` synced with the flow variable `_rtNextStep` at no cost, and the engine reads `global[_rtNextStep]` on re-entry. It is **not** the resolution path. The step id is resolved **once at the output node** via `_rtNextStep = getValue(__rtParams, __rtOutcome, '')` (a bare assignment to the placeholder-bound flow variable, **not** `global[_rtNextStep] = …`; see §7–§8) — the work body never writes the step id mid-flight. This holds for *every* v2 component, whether it is reached as a JS-twin-backed op (e.g. [sendSms.js](../rtds/components/sendSms.js)) or as a GUI-exit target (e.g. [guardTui.js](../rtds/components/guardTui.js), the `guard_tui` target): both are self-contained components on the same contract.

See [sendSms.js:27](../rtds/components/sendSms.js#L27) for the canonical encoded form.

## 5. Master `PropertiesDefinition`

Three entries, in this order: `__configJSON`, `__environment`, `__nextStep`. No `__outputVar`.

See [sendSms.js:28](../rtds/components/sendSms.js#L28).

## 6. Init node body — universal

Four lines, always (note the init seed is `'NextStep'`, not `'NextStep_Failure'` — see below):

```js
__rtOutcome = 'NextStep';
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[<componentName>] config resolved', { params: __rtParams, outcome: __rtOutcome });
```

`__rtOutcome` is the component-internal **outcome key** — the literal Params key *name* (`'NextStep'`, `'NextStep_Success'`, `'NextStep_Denied'`, `'NextStep_Failure'`, `'NextStep_<State>'`, …) of the branch this execution chose. The init node seeds it to `'NextStep'` (the did-nothing default), so a component that returns before reaching the work body's network pivot exits as a no-op rather than a failure — this matches the shipped [sendSms.js](../rtds/components/sendSms.js) and [sendMail.js](../rtds/components/sendMail.js). The master `Variables` block (§4) separately seeds `'NextStep_Failure'` as a load-time safety net for any path that never runs the init node. The work node pivots to `'NextStep_Failure'` before any network call and stages the chosen key on success (§7); the output node resolves it to `_rtNextStep` (§8). `language` is also normalised here — see [say-text.md](say-text.md).

## 7. Work node body — per pattern

Patterns live in [.claude/skills/rtds-vocalls-component-gen/references/operation_bodies/](../.claude/skills/rtds-vocalls-component-gen/references/operation_bodies/): `http_call.md`, `gui_exit.md`, `set_attributes.md`, `condition.md`, `flow_jump.md`, plus `composite.md` modifier.

The work body **stages an outcome key** into `__rtOutcome` — it never writes `_rtNextStep` mid-flight. Each path assigns `__rtOutcome = '<NextStepKey>';` with a plain `=` (not `global[...]` indirection), the literal Params key *name*, at most once per execution path. `__rtOutcome` was seeded to `'NextStep'` in the init node (§6); the work body pivots it to `'NextStep_Failure'` before any network call, so a failure after that point already exits as failure. The output node (§8) is the single place that resolves the key to a step id. In order, the work body:

1. Active guard — early return + info-level "skipped — inactive" log if `!Active`. The skipped path sets `__rtOutcome = 'NextStep';` (the did-nothing default) before returning.
2. Validates inputs — warn-level log and return for any failed precondition. A validation failure leaves (or sets) `__rtOutcome = 'NextStep_Failure';`.
3. Builds payload, fires `jsonHttpRequest(...).then(success, error)`. **Error callback is mandatory.** The success callback sets `__rtOutcome` to the chosen branch key (`'NextStep_Success'`, `'NextStep_<State>'`, the default `'NextStep'`, …); the error callback leaves it at `'NextStep_Failure'` (or sets it explicitly).
4. Three log lines total: skipped (info) / validation (warn) / outcome (info, warn, or error). Work-body logs carry `outcome` (the staged key); see [logging.md](logging.md).

**GUI-exit routing is the engine's job, not a component pattern.** When the routing table hits a GUI-exit Type, the **runtime** (`prepareGuiHandoff` in `rtds_2_runtime.js`) writes `RTDS_currentOpConfig` (the whole `op.params` object) plus `RTDS_currentOpId/Type`, pre-populates `RTDS_nextStepId`, and emits the Type's exit key — routing the call to the matching canvas component. The **target** component (e.g. [guardTui.js](../rtds/components/guardTui.js) for `guard_tui`) is then a normal self-contained v2 component: it reads `__configJSON → __rtParams`, stages `__rtOutcome`, and resolves once at the output node — exactly like an HTTP-call component. A component work body never writes per-key `RTDS_OP_*` and never `return`s an exit key. See [.claude/skills/rtds-vocalls-component-gen/references/operation_bodies/gui_exit.md](../.claude/skills/rtds-vocalls-component-gen/references/operation_bodies/gui_exit.md).

## 8. Output node

The output node `OnEnter` is the **single place** the staged outcome key is resolved to a step id and written to the engine's flow variable. Two lines:

```js
_rtNextStep = getValue(__rtParams, __rtOutcome, '');
Logger.info('[<componentName>] exit', { outcome: __rtOutcome, nextStep: _rtNextStep });
```

The write target is the bare flow variable `_rtNextStep`, **not** `global[_rtNextStep]` — `_rtNextStep` is placeholder-bound to the engine global via the `__rtNextStep &= _rtNextStep` line in master `Variables` (§4), so a plain assignment to `_rtNextStep` is what the engine reads on re-entry. The exit-key fallback is `''` (empty string). Both forms match the shipped components [sendSms.js:99](../rtds/components/sendSms.js#L99), [sendMail.js:98](../rtds/components/sendMail.js#L98) and [guardTui.js:401](../rtds/components/guardTui.js#L401), which are the source of truth for the contract.

The engine routes on the resolved `_rtNextStep` value; the staging in `__rtOutcome` is purely component-internal. The exit log carries **both** the staged `outcome` and the resolved `nextStep`.

Every v2 component resolves `__rtOutcome` here — including GUI-exit *target* components (§7). The exit key itself is emitted by the engine's `prepareGuiHandoff`, not by any component.

### One outcome contract for GUI components and JS twins

`__rtOutcome` and `__rtParams` are bare-assigned (no `var`) and pre-declared (master `Variables` for a component; seeded as engine globals in `rtds_2_runtime.js`), so they persist on the session global for the life of the call — the `__` prefix is a naming convention, not a real scope.

Both kinds of operation express their branch identically: stage `__rtOutcome` (a literal Params key) over a `__rtParams` map built by `setupConfig` / `__setupConfig`, then resolve `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`. The **only** difference is *where* the resolution runs:

- a **GUI component** resolves at its own output node (the line above);
- a **JS twin** stages `__rtOutcome` and the **runtime engine** (`runStep`'s JS branch) resolves once after the handler settles — the engine is the single resolver, playing the output-node role. A twin never resolves `_rtNextStep` itself and never returns `{ nextStepId }`.

Because every in-flight op leaves the same `__rtParams` / `__rtOutcome` state, **call-interruption finalize needs no per-kind logic**: `finalizeFrom` re-runs the flow from the resume point in finalization mode and the JS branch resolves the staged outcome during that run. (See [lockstep.md](lockstep.md) → outcome/resolution parity.)

## Reflect on

- **[grep]** Does the component have exactly the four canonical ids (`0`/`7`/`29`/`6`)?
- **[grep]** Master-attribute order matches §2?
- **[grep]** Master `Variables` carries only the cross-script set (incl. the mandatory `__rtOutcome` seed) — per-execution working vars (`__transferDest`, `__transferTimeout`, …) are init-node-only, not re-declared in `Variables` (§4)?
- **[judgment]** Master `Code` composition matches §3?
- **[grep]** Init body is the universal four lines (incl. `__rtOutcome = 'NextStep';`)?
- **[grep]** Work body stages `__rtOutcome = '<key>'` with plain `=` and never writes `_rtNextStep` mid-flight?
- **[grep]** Output node resolves `__rtOutcome` to `_rtNextStep` (bare, not `global[_rtNextStep]`) with the `''` fallback and logs both `outcome` and `nextStep`?
- **[judgment]** `__rtOutcome` / `__rtParams` left as persisting bare-assigned globals (no `var`, pre-declared in master `Variables`) so GUI and JS ops leave identical state and call-interruption finalize is covered uniformly (§8 → one outcome contract)?
- **[grep]** No component work body writes per-key `RTDS_OP_*` or `return`s an exit key — GUI-exit routing is the engine's job (`prepareGuiHandoff`)?
