# RTDS Demo Runtime Analysis

Audit of the demo call flow and the libraries the simulator engine loads when running `npm run simulate`. Goal: surface real bugs, ES5.1 portability issues, and design gaps before the runtime moves into production use.

## Files in scope

Loaded order at simulate time, per `core/loader.js:502-528` (`collectScriptList`):

1. `projects/demo/callScript_init/globalCode.js` (init)
2. `projects/demo/callScript_init/globalVariables.js` (init)
3. `projects/demo/globalLibraries/active/*.js` — **reverse alphabetical** (`loader.js:467-489`). For the demo: `rtds_globalConfig.js`, then `rtds_globalCodeAndHelpers.js`.
4. `projects/demo/callScripts/main.js` (user script)

The two files that establish the runtime — `rtds_globalConfig.js` and `rtds_globalCodeAndHelpers.js` — are loaded in that reverse-alpha order. That happens to be the correct dependency order here (config before helpers), but it is coincidental and brittle: see G2.

---

## Bugs

### B1 — `cdbLog` undefined in `storeSessionVariables` ([rtds_globalCodeAndHelpers.js:992-1011](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L992-L1011))

```js
function storeSessionVariables() {
    var timestamp = Date.now();
    if (!context.session.variables) { context.session.variables = {}; }
    if (cdbLog) {                       // <-- ReferenceError
        resolveCdbDicId(cdbLog);
    }
    ...
}
```

Neither `cdbLog` nor `resolveCdbDicId` exists in the loaded set. `globalVariables.js` defines `varObj.cdb.cdbLog = 'cdbLog1'` but never a bare `cdbLog` global. Any call to `storeSessionVariables()` throws `ReferenceError: cdbLog is not defined`. Symptom is dormant only because `main.js` never calls it.

**Fix:** use `typeof cdbLog !== 'undefined' && cdbLog` for the guard, and either implement `resolveCdbDicId` or remove the block.

### B2 — `constVarObj` defined twice; first definition silently lost

- `rtds_globalConfig.js:12-56` declares `function constVarObj() { ... }` returning a simple shape.
- `rtds_globalCodeAndHelpers.js:118-166` redeclares the same function with a richer shape (reads `context.callInfo.callGuid`, `context.language`, calls `getOrDefault`).

Reverse-alpha load order means **helpers** (later, second declaration) wins — by accident. If anyone renames either file or adds a library whose name sorts between them, the winning definition flips silently.

Also both definitions call `context.language.substring(0, 2)` and the helpers version calls `context.callInfo.callGuid` with no `typeof`/null guards. With the simulator seed in `vocallsContext.js` the calls succeed, but any call where `context.callInfo` is unset will throw.

**Fix:** delete the stub in `rtds_globalConfig.js` (the helpers version is the real one); guard the property reads.

### B3 — `globalCode.js` references `logInfo` before it exists ([projects/demo/callScript_init/globalCode.js:23](projects/demo/callScript_init/globalCode.js#L23))

```js
logInfo('globalCode: session initialized');
```

`logInfo` is added to the sandbox by `core/minimalVocallsCore.js:83-88` — so it does exist when `globalCode.js` runs. But the same file defines `isValidObject` ([globalCode.js:12-14](projects/demo/callScript_init/globalCode.js#L12-L14)) which gets immediately shadowed by the richer one in `rtds_globalCodeAndHelpers.js:82-94`. The first one is dead code. Same shadowing pattern as B2.

### B4 — `executeSetAttributes` writes `LogAttributes` lookups against `global` but the sandbox isn't ES5-quite-global

[rtds_globalCodeAndHelpers.js:1242-1264](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1242-L1264) does:

```js
var attrVal = context.session.variables[attrName];
if (attrVal === undefined || attrVal === null) {
    attrVal = global[attrName];
}
```

In `vm.createContext`-based loading (`loader.js:373`), bare assignments land on the context object (which is the same object `global` resolves to inside the sandbox), but only after the script runs. The first SetAttributes op (`00000`) sets `RoutingId` etc. via `setGlobal(name, value)` → `global[name] = value` — that works. But the **second** SetAttributes (`00001`, line 75-80 of `main.js`) uses tokens like `$(RoutingId)`, and `resolveTokens` reads them via `global[name]` ([rtds_globalCodeAndHelpers.js:1192](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1192)). For this to work, `global` must be the same object that bare-assigned variables land on. In the Node `vm` sandbox model, that's true only when `global` is set to the sandbox object — and nothing in `minimalVocallsCore.js` or `loader.js` (visible portion) explicitly assigns `sandbox.global = sandbox`.

If `global` is the Node `global` instead of the sandbox context, `resolveTokens` will silently return `''` for every token in production-shaped flows. The demo happens to pass because `RoutingId` etc. are also written to `varObj` indirectly via `syncEssentialGlobals`, but `GreetingPrefix` and `OperatorQueue` (lines 75-80 in main.js) **are not** — and the output banner at main.js:194 reads them via `typeof X !== 'undefined'`, which would print `(unset)` if the global write didn't actually land. Worth a quick simulate-run to confirm; if `(unset)` shows up for `GreetingPrefix`/`OperatorQueue`, this bug is live.

**Fix:** in `createSandbox`, do `sandbox.global = sandbox;` before `vm.createContext(sandbox)`. Also have `setGlobal` and `resolveTokens` agree on the same target object — pass an explicit `scope` argument rather than relying on an implicit `global`.

### B5 — `Logger.config.flushRetryCount` / `bufferEnabled` / `bufferMaxSize` referenced but never declared

[rtds_globalCodeAndHelpers.js:477](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L477) checks `if (retryAttempt < self.config.flushRetryCount)`, but `Logger.config` ([line 172-189](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L172-L189)) never sets `flushRetryCount`, `bufferEnabled`, `bufferMaxSize`, `bufferFlushOnError`, or `bufferFlushOnCallEnd`. Result: every API error retries `undefined` times (`retryAttempt < undefined` is `false`), so the retry branch never fires. Buffering paths (`addToBuffer` line 545, `flushBuffer` line 560) compare against `undefined` — `buffer.length >= undefined` is always false → the auto-flush never triggers; `effectiveBufferEnabled` at line 498 is always falsy → buffering is silently disabled.

`Logger.configure` ([line 759-841](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L759-L841)) *validates* these keys, so they're presumably meant to be set elsewhere, but neither `globalVariables.js` nor `main.js` calls `Logger.configure`. End result: half of `Logger` is dead code by default.

**Fix:** add defaults to `Logger.config` (e.g. `flushRetryCount: 0, bufferEnabled: false, bufferMaxSize: 50, bufferFlushOnError: true, bufferFlushOnCallEnd: true`) so behavior is deterministic without an explicit `configure`.

### B6 — Numeric `IVREvent: '9999'` in main.js is a string

[main.js:67](projects/demo/callScripts/main.js#L67) sets `IVREvent: '9999'` (string). `executeSetAttributes` writes that to `global.IVREvent` as-is. The downstream consumer (not present in the demo) likely expects a number. Same for `IVRAction: 'CT'` which is fine, but `RoutingId` etc. all become strings. If any consumer does `IVREvent === 9999` it will silently fail. Style choice rather than a bug per se, but worth flagging: the runtime says "Type is preserved as-is (number stays number, string stays string)" ([line 1156-1159](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1156-L1159)), so the *operation* schema should drive whether `IVREvent` is `9999` or `'9999'`. The current shape doesn't match the documented intent.

### B7 — `parseFlow` writes header fields without null-checks

[rtds_globalCodeAndHelpers.js:1082-1086](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1082-L1086):

```js
context.session.variables.RTDS_sourceId = json.SourceId;
context.session.variables.RTDS_name = json.Name;
context.session.variables.RTDS_project = json.Project;
context.session.variables.RTDS_promptLibrary = json.PromptLibrary;
context.session.variables.RTDS_supportedLanguages = json.SupportedLanguages;
```

Any of these can be `undefined`. Downstream reads via `context.session.variables.RTDS_sourceId || ''` would handle that, but `prepareGuiHandoff` ([line 1278-1298](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1278-L1298)) writes `undefined` values straight into session via `OP_VAR_PREFIX + key`, and `runEntryPointA` ([main.js:128-129](projects/demo/callScripts/main.js#L128-L129)) reads `context.phone` which isn't set anywhere — `seed.callInfo` only sets `fromUri`/`toUri`. Result: `context.session.variables.RTDS_sourceId` ends up as `undefined` or `''` depending on `varObj.ani`.

In the demo this is masked because the JSON has all five fields, but the runtime spec says fields are optional.

**Fix:** assign each only when defined, or pre-default to `''`.

### B8 — `runStep` swallows the difference between "JS op error" and "unhandled type"

Both branches in [rtds_globalCodeAndHelpers.js:1308-1361](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1308-L1361) return `'disconnect'` and write a string into `RTDS_error`. The caller can't distinguish "unknown step Id" (1318) from "exception inside SetAttributes" (1331-1332) from "operation type not in tables" (1356) from "ran out of NextSteps" (1338). For a production runtime that needs to drive different fallback flows, this is too coarse.

**Fix:** introduce structured `RTDS_error` codes (`UNKNOWN_STEP`, `OP_EXCEPTION`, `UNHANDLED_TYPE`, `END_OF_FLOW`) and let the caller's outer handler branch on them.

### B9 — `LogAttributes` parser splits raw value with no token resolution

[rtds_globalCodeAndHelpers.js:1244](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1244):

```js
var attrNames = String(params[key]).split('|');
```

If `LogAttributes` is itself a token reference (`'$(SomeListVar)'`), the literal string `'$(SomeListVar)'` gets split into a single-element array and used as the attribute name. The other params get `resolveTokens(getParam(...))` first, but `LogAttributes` is special-cased and skips it.

**Fix:** wrap with `resolveTokens(String(params[key]))` before the `.split('|')`.

### B10 — `getNestedValue` uses arrow function — fails ES5.1 transform

[rtds_globalCodeAndHelpers.js:104-112](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L104-L112):

```js
function getNestedValue(obj, path) {
    if (typeof path !== "string") return undefined;
    return path
        .split(".")
        .reduce(
            (acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined),
            obj,
        );
}
```

`loader.js:36` only converts `let`/`const` → `var`. It does **not** rewrite arrow functions. Production Vocalls is ES5.1 (per `CLAUDE.md`). This file will fail to validate / parse in the real engine. Same pattern in `Logger.sanitizeForLog` ([line 221](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L221)) — that one uses `function`, so it's fine — but the arrow at line 109 is a hard incompatibility.

Other ES2015+ features used in this file that may break ES5.1:

- **Template literals (backticks)** at lines 1053, 1316, 1322, 1330, 1338, 1350, 1355 — `loader.js`'s transformer doesn't rewrite these either. They are valid in the Node simulator (which runs Node 18+) but will fail Vocalls validation.
- **`new Map([...])`** at line 1017, 1023 — Map is ES2015. Whether the Vocalls runtime supports it depends on the engine version; the CLAUDE.md note says ES5.1.
- **Default param `useFalsy = false`** at line 61 — ES2015 default parameter syntax.

**Fix:** run `core/configValidator.js` over the file and fix every ES5.1 violation. Replace arrow `reduce` with a `function (acc, part) {...}`, replace template literals with `+` concatenation, replace `Map` with a plain object lookup (`var RTDS_OPERATIONS = { SetAttributes: executeSetAttributes };` plus an `RTDS_OPERATIONS[type]` test). The `let`/`const`-only transformer in `loader.js` gives a false sense of security — it doesn't catch any of these.

### B11 — `Logger.error` calls `extractStack(errorObj)` after already checking `errorObj.stack`

[rtds_globalCodeAndHelpers.js:688-693](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L688-L693):

```js
if (errorObj && errorObj.stack) {
    var stack = this.extractStack(errorObj);
    if (stack) { msg += " | Stack: " + stack; }
}
```

`extractStack` does its own `err.stack` check ([line 244-256](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L244-L256)) — redundant guard. Minor.

### B12 — `Logger.getCallIdKey` / `getRoutingId` use `String()` on `null`

[line 270, 281](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L270): the final `return null;` is fine, but every earlier branch does `String(vo.callIdKey)` etc. — and `vo.callIdKey` is checked truthy first (`if (vo && vo.callIdKey)`), so this is correct. But `callIdKey` is initialised to `'00000000-0000-0000-0000-000000000000'` in `globalVariables.js:20` — that string is truthy. So every log call carries the all-zeros UUID by default; whether that's an acceptable sentinel or a footgun is a policy question. Worth flagging because the Logger's API events will all carry the same fake callId until something assigns a real one.

### B13 — `globalVariables.js` overwrites `varObj.language` unconditionally at end of file

[globalVariables.js:211-215](projects/demo/callScript_init/globalVariables.js#L211-L215):

```js
if (context && context.language) {
    varObj.language = context.language;
} else {
    varObj.language = 'NL';
}
```

This runs before `initializeCallFlowContext` ([main.js:114](projects/demo/callScripts/main.js#L114)). Then `initializeCallFlowContext` calls `varObj = constVarObj()` ([line 943](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L943)), which **replaces** `varObj` with a fresh object via `constVarObj()`. The fresh object sets `language: context.language.substring(0, 2).toUpperCase()` (line 135). So the assignment at the top of `globalVariables.js` is thrown away on the "new call" branch.

It is preserved only on the "session restore" branch (line 915-925), where the old `varObj` is loaded from session storage. So the initial `varObj.language` is a default that only sticks if you skip the new-call path. Confusing.

**Fix:** delete the `varObj.language = context.language` block in `globalVariables.js`; let `constVarObj` own it.

---

## Gaps

### G1 — No ES5.1 enforcement on `rtds_*` libraries

`loader.js:35-37` is the only ES5.1 transform: `let`/`const` → `var`. Everything else (arrow fns, template literals, `Map`, default params, destructuring, spread) passes through untouched. `core/configValidator.js` is referenced as the validator (per `CLAUDE.md`), but `loader.js:336-360` only validates non-userScript files and only emits warnings — it never blocks. So `rtds_globalCodeAndHelpers.js` could ship with any modern syntax and the simulator would happily run it. Vocalls runtime won't.

**Fix:** make `npm run validate` block; have it scan for arrow fns, template literals, `Map`/`Set`, default params, spread, destructuring, `class`, `async/await`. Run it as a pre-commit hook.

### G2 — Library load order is "reverse alphabetical" — a footgun

`loader.js:467-489` sorts and reverses. The current naming (`rtds_globalConfig` before `rtds_globalCodeAndHelpers` because `Helpers` > `Config` reversed) is fragile. Add a new library called `rtds_aSomething.js` and the load order silently shifts.

**Fix:** use an explicit ordering list in `env.config.json` (e.g. `globalLibrariesOrder: ['rtds_globalConfig.js', 'rtds_globalCodeAndHelpers.js']`) and fall back to alphabetical only when unspecified. Document the rule prominently.

### G3 — Only `SetAttributes` is wired into `RTDS_OPERATIONS`

[rtds_globalCodeAndHelpers.js:1017-1020](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1017-L1020): the comment promises `Emergency`, `Schedule`, etc. but only `SetAttributes` is registered. The 11 other operation types fall through to "Unhandled operation type" → disconnect. For the demo that's fine, but the runtime spec lists handlers for at least `Emergency`, `Schedule`, `Condition`, `CheckAttribute`, `FlowJump`, `IVRLogging`, `UpdateSourceId`, `SkillUpdate`, `RESTRequest`, `RESTGet` as JS-handled.

**Fix:** implement and register them. Each is a self-contained pure function returning `{ nextStepId }`.

### G4 — `runStep` has no max-iteration guard

The `while (currentId)` loop ([line 1312](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1312)) is bounded only by encountering a GUI-exit, a null `NextStep`, or an unknown step. A cycle in the flow JSON (e.g. `00001 → 00002 → 00001`) hangs forever and consumes the call's CPU budget.

**Fix:** add a `var maxIterations = 1000;` guard with a counter; log + disconnect on overflow.

### G5 — No reentrancy / state-clearing on session restore

`initializeCallFlowContext` restores `varObj` from session if the timestamps say so ([line 915-925](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L915-L925)), but does **not** restore `context.session.variables.RTDS_opIndex` from where the JSON came. After a session restore, `runStep` will throw the first time it does `opIndex.get(currentId)` because `opIndex` is null. The whole RTDS flow assumes "always entered via parseFlow → runStep within one segment".

**Fix:** either re-parse the flow on session restore (requires storing the JSON in session), or document the constraint explicitly.

### G6 — `prepareGuiHandoff` doesn't clear stale `RTDS_OP_*` keys

[line 1278-1298](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1278-L1298) writes new `RTDS_OP_*` keys but leaves old ones from the previous handoff in session. If op A had `Param1` and op B doesn't, `RTDS_OP_Param1` leaks into the GUI node for B.

**Fix:** at the top of `prepareGuiHandoff`, iterate `context.session.variables`, delete keys starting with `OP_VAR_PREFIX`.

### G7 — `getParam` treats `0` and `false` as set, but treats `''` as unset

[line 1158](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1158):

```js
if (value === '' || value === null || value === undefined) { return fallback; }
```

`Active: false` correctly survives (boolean branch returns earlier). But an intentionally empty string param falls back to `null`. The "Type is preserved as-is" comment says otherwise. Decision needed: do empty strings mean "unset" or "intentionally empty"?

### G8 — `resolveTokens` returns `''` for unknown tokens — silently lossy

[line 1196](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1196): unknown `$(NAME)` becomes `''`. A typo in a token name produces an empty value with no warning. Hard to debug.

**Fix:** `log_warn` (or `log_debug` with a count) when a token can't be resolved.

### G9 — `main.js` mixes `Logger.info` and `log_debug` — output channels diverge

`Logger.info` writes via `log_debug` ([line 638](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L638)) at the local layer, but also fires `postEventToAPI` for `warn`/`error` only. `info` is local-only ([line 627-639](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L627-L639)). `main.js` uses `Logger.info` for banner output and `log_debug` for runtime traces — same channel locally, different channel remotely. Worth being explicit about: "everything below INFO is suppressed in production; if you want it in the API log, use Logger.warn".

### G10 — `main.js:202-208` mixes test instrumentation with production code

```js
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production' && context && context.session) {
    context.session.variables.scriptName = 'main';
    ...
}
```

`process.env.NODE_ENV` is a Node-ism. In the Vocalls production sandbox `process` won't exist, so the block is correctly skipped. But the comment says "guarded so production stays untouched" — the actual guard works only because `process` is undefined, not because `NODE_ENV !== 'production'`. Tighten the comment, or move the test instrumentation to `projects/demo/tests/`.

### G11 — `_apiResult` set in `globalVariables.js:200-204` is never read

Defined but unused in the demo flow. Likely a leftover from a copied template.

### G12 — `varObj.config.intents.combinations` and friends are dead config

The intents config block ([globalVariables.js:114-145](projects/demo/callScript_init/globalVariables.js#L114-L145)) defines elaborate `combinations`, `applicationOrder`, `segments`, `metaKeys` — none of which are referenced anywhere in the loaded code. If this is reserved for a future feature, fine; if not, prune.

### G13 — `getOrDefault` uses ES6 default parameter

[line 61](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L61): `function getOrDefault(varName, defaultValue, useFalsy = false)` — ES2015 default param. Same ES5.1 issue as B10/G1.

---

## Improvements (low risk, high clarity)

### I1 — Replace `String()` coercion in `Logger.getCallIdKey` with explicit conversion + null guard

The current shape (line 263-271) is fine but the chain of four fallbacks reads like an apology for missing init. Consider a single initializer in `initializeCallFlowContext` that ensures `varObj.callIdKey` is always set, then have `getCallIdKey` just return it.

### I2 — Co-locate the RTDS dispatch tables with the handlers

`RTDS_OPERATIONS`, `RTDS_EXIT_KEYS`, `OP_VAR_PREFIX` sit at line 1017-1039, **above** the helpers they reference (`executeSetAttributes` is defined later at line 1229). JavaScript hoists function *declarations* but not `Map`s — the `new Map([['SetAttributes', executeSetAttributes]])` initializer runs immediately, and `executeSetAttributes` exists at that point because function declarations hoist. Works today, but the readability cost is real. Move the dispatch tables to the bottom of the file or wrap them in a lazy initializer.

### I3 — Move `RTDS_*` constants into a dedicated file

`RTDS_OPERATIONS`, `RTDS_EXIT_KEYS`, `OP_VAR_PREFIX` are configuration, not implementation. Putting them in `rtds_globalConfig.js` makes the file actually live up to its name (right now it's just `DEFAULT_LOGGED_KEYS` + a duplicate `constVarObj` — see B2). This also fixes the dependency-order fragility (G2).

### I4 — `executeSetAttributes` should log every assignment, not just NextStep

[line 1267](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1267) logs only the next-step resolution. The per-key writes go through `setGlobal` silently. For a runtime that's supposed to be inspectable, every write should `log_debug` `'[RTDS] set ' + key + ' = ' + value`. Cheap to add, huge debugging payoff.

### I5 — Replace the `if (debug) debugCall = true` toggle with a documented mode

[line 965-969](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L965-L969): `debug` is a bare global set in `main.js:39`. Whether it's `true` or `false` flips `debugCall` for every call. This is fine as a dev override, but it's not documented as such. Make it explicit: `varObj.debugMode = 'all' | 'devNumbers' | 'off'`.

### I6 — Add a JSDoc-typed `RTDS_error` enum

Pairs with B8. Document the legal values once, reference everywhere.

### I7 — `parseFlow` should validate every op has a unique Id

[line 1048-1059](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1048-L1059): `buildOpIndex` warns about ops with no Id but silently lets duplicates overwrite earlier entries in the Map. Worth a `log_warn` (or hard fail) when `index.has(op.Id)` before setting.

### I8 — `prepareGuiHandoff` should resolve tokens for the GUI-side variables too

It does — `resolveTokens(getParam(...))` at line 1284. ✅ Already correct.

### I9 — `main.js` swallows the `parseFlow` failure path inconsistently

[main.js:143-146](projects/demo/callScripts/main.js#L143-L146):

```js
var firstOp = parseFlow(json);
if (!firstOp) { return 'disconnect'; }
return runStep(firstOp.Id);
```

`parseFlow` already sets `RTDS_error` on failure. The `return 'disconnect'` here is correct — but the wrapping `runEntryPointA()` returns it as if it were an exit key; the caller (`var exitKeyA = runEntryPointA();`) logs it but doesn't act on it. Compare with `runStep`, which the runtime treats the same way. For the demo, fine. For production: `main.js` should branch on `RTDS_error` before deciding to call `resumeFrom`.

### I10 — `globalCode.js` is mostly noise

[projects/demo/callScript_init/globalCode.js](projects/demo/callScript_init/globalCode.js): 23 lines, the only useful work is `if (!context.session.variables) context.session.variables = {};`. The `isValidObject` definition is shadowed (B3) and `logInfo` works because of the sandbox. Consider folding the one useful line into `globalVariables.js` and deleting `globalCode.js`.

---

## Suggested fix order

1. **B10 + G1 + G13** — the demo is one Vocalls deploy away from a hard syntax-error. Strip arrow fns, template literals, default params, `Map`. Make the validator block.
2. **B4** — verify with a simulate run whether `GreetingPrefix`/`OperatorQueue` actually appear in the final log. If `(unset)`, fix the sandbox `global` aliasing.
3. **B2 + I3** — single source of truth for `constVarObj`; move RTDS constants to config file.
4. **B5** — set Logger config defaults so retries/buffer behaviour is deterministic.
5. **B1, B11, B12, B13, G11, G12, I10** — cleanup; mostly removing dead code.
6. **G3 + G4** — implement the remaining RTDS handlers and add the iteration guard before any real flow ships.
7. **B8 + I6** — structured `RTDS_error` codes.
8. **G2, G5, G6, G8** — observability and re-entry safety, ahead of production rollout.

---

## What's working well

- `parseFlow` / `runStep` / `resumeFrom` separation matches the runtime-spec contract cleanly; the dispatch-table pattern (`RTDS_OPERATIONS`, `RTDS_EXIT_KEYS`) is the right shape.
- `resolveTokens` correctly distinguishes session vs. global scope.
- `executeSetAttributes` correctly skips `NextStep` and treats `LogAttributes` as a side-effect.
- The `IsFirstOperation` resolver ([getFirstOperation, line 1112-1134](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L1112-L1134)) handles the multi-candidate case with deterministic lexicographic sort — good.
- `Logger.categorizeError` is thorough and the API-event posting flow is well-structured.
- `main.js` is well-commented as a runnable example of both entry points (A and B).
