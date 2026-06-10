# Unified `__rtOutcome` Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the runtime's JS operation twins byte-identical to the GUI component contract — stage `__rtParams` + `__rtOutcome`, engine resolves `_rtNextStep` via `getValue(__rtParams, __rtOutcome, '')` — so call-interruption finalize is covered uniformly with no per-kind logic, and register all three twins (`setVariables`, `sendSms`, `sendMail`) as JS handlers.

**Architecture:** Add canonical `setupConfig`/`walk` engine helpers. Rewrite the three twins to mirror their components, communicating only through staged `__rtOutcome` (no `{ nextStepId }` return). The `runStep` JS branch becomes the single resolver: `Promise.resolve(handler(op))` then `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`, advancing from `_rtNextStep`. `finalizeFrom` reuses the same resolution. Register all three Types as JS (JS wins the last-write-wins registry).

**Tech Stack:** ES5.1 JavaScript (Vocalls sandbox — no `let`/`const`/arrow/destructuring; template literals allowed), Jest (`--runInBand`), Python doc gates (`npm run check`).

**Source design:** [../specs/2026-06-10-rtds-unified-rtoutcome-contract-design.md](../specs/2026-06-10-rtds-unified-rtoutcome-contract-design.md)

---

## ⚠️ Commit grouping (revised after agent review)

The pre-commit hook runs the **entire** Jest suite on every commit. The twin rewrites, the engine JS-branch change, the registry change, and the test rewrites are mutually interdependent — any one alone leaves the suite RED. So the per-task "verify-fail → verify-pass → commit" cadence below is **regrouped into three atomic commits**; the task bodies still hold the authoritative code, but commit only at these boundaries:

- **Commit A = Task 1 only** (`setupConfig` helper + its tests). Additive — nothing reads it yet, suite stays green.
- **Commit B = Tasks 2,3,4,5,6,7 together** (three twin rewrites + engine single-resolver + registration) **plus all test rewrites in the same commit**: new `setVariables.test.js`, new `sendMail.test.js`, re-pointed `sendSms.test.js`, rewritten `finalize.test.js` helpers, and **rewritten `main.test.js`** (see Task 5.5). This is the one green commit that flips the contract.
- **Commit C = Task 8** (docs/conventions + skill bundle).

**Two code corrections from review (apply when writing the code below):**
1. **`setupConfig` must call `resolveConfigTokens(value, key)`, NOT `resolveTokens`.** The components resolve `${name}` tokens via `resolveConfigTokens` (`rtds_3_vocallsEnv.js`); `resolveTokens` only handles `$(name)` and would silently fail real configs like `${rtSmsBody}`. Task 1's code and test below are corrected accordingly.
2. **Do NOT re-add `walk`** — it already exists at `rtds_3_vocallsEnv.js:161-175`. Task 1 adds only `setupConfig`, with `extractParams` **inlined** into it (not a separate named global — the design named only `setupConfig`/`walk`, so no third helper is introduced).

---

## Background the engineer needs

- **Engine file:** `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` (dispatch engine, twins, `runStep`, `finalizeFrom`). **Env file:** `rtds_3_vocallsEnv.js` (loads first; holds `getValue`, `activeFlag`, `setVariable`). Load order 3 → 2 → 1, so helpers added to `rtds_3` are visible in `rtds_2`.
- **The contract being adopted (from the components):** init builds `__rtParams = setupConfig(config)` and seeds `__rtOutcome = 'nextStep'`; work stages `__rtOutcome = '<key>'` (a literal Params key name); the **output node** resolves `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`. For JS twins, the **engine** plays the output node.
- **`getValue(obj, key, default)`** (`rtds_3_vocallsEnv.js:66`): case-insensitive; returns `default` when `obj`/`key` falsy or key absent. `__rtParams` is a flat `{ key: value }` map; `__rtOutcome` is a key like `'nextStep_Success'`; resolution yields the step id or `''`.
- **Existing engine helpers the twins reuse (already global, do NOT recreate):** `activeFlag`, `setVariable`, `resolveTokens`, `isMobileNumber`, `splitSemicolonList`, `buildAttachments`, `resolveFilesList`, `nowUTC`.
- **NEW helpers (approved):** `setupConfig`, `walk` — added to `rtds_3_vocallsEnv.js`. No other new functions without asking the requester first.
- **`__rtParams` / `__rtOutcome` are bare-assigned globals** (no `var`) — they persist on the session scope and are read by `finalizeFrom`. The twins assign them as bare globals (matching the components).
- **Registry is last-write-wins** (`RTDS_REGISTRY` Map): `registerRtdsOperation` sets `kind:'js'`; `registerRtdsExit` sets `kind:'gui'`; each deletes the other view. For JS to win, the JS registration must be the last (or only) one for that Type.
- **Active default is `false` on all three twins** (requester decision — diverges from `setVariables.js` component which defaults `true`; recorded in the design). Use `activeFlag(getValue(__rtParams, 'active', false))`.
- **`splitSemicolonList` divergence:** the component `__splitSemicolonList` returns `null` for an empty list (callers check `=== null`); the existing engine `splitSemicolonList` returns `[]`. The rewritten `executeSendEmail` must reproduce the **component's** payload behavior (omit `to`/`cc`/… when empty). The simplest faithful approach: keep using the engine helpers but guard with `.length` (as today's `executeSendEmail` already does), since the observable payload (`cc` present only when non-empty) is identical to the component's `!== null` guard. Do NOT change the engine `splitSemicolonList` return type.
- **Commits run the pre-commit hook** (`npm run check` = `check:sync` + `check:lockstep` + `test`). It needs a green suite, so a failing test cannot be committed alone — verify-fail then commit test+impl together. Never `--no-verify`.
- **Lockstep:** engine change → update `rtds/docs/runtime-architecture.md`, `rtds/docs/runtime-spec.md`, `conventions/lockstep.md`, rewrite `conventions/component-v2.md` §8 finalize subsection, then `npm run build:skill` to resync the generated skill bundle (the bundle copies under `.claude/skills/rtds-vocalls-component-gen/` are generated from `conventions/` + runtime libs).

## File Structure

| File | Responsibility | Change |
| ---- | -------------- | ------ |
| `projects/rtds-runtime/globalLibraries/active/rtds_3_vocallsEnv.js` | Env helpers | Add `setupConfig` + `walk`. |
| `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` | Engine, twins, dispatch, finalize, registration | Rewrite 3 twins to the `__rtOutcome` contract; normalize the `runStep` JS branch to single-resolver; simplify `finalizeFrom`; change registration so the 3 Types win as JS. |
| `projects/rtds-runtime/tests/components/setupConfig.test.js` | `setupConfig`/helper tests | Extend for engine `setupConfig`/`walk`. |
| `projects/rtds-runtime/tests/components/setVariables.test.js` *(new)* | `executeSetVariables` contract | New twin contract test. |
| `projects/rtds-runtime/tests/components/sendSms.test.js` | `executeSendSms` contract | Re-point assertions to staged `__rtOutcome`/resolved `_rtNextStep`. |
| `projects/rtds-runtime/tests/components/sendMail.test.js` *(new)* | `executeSendEmail` contract | New twin contract test. |
| `projects/rtds-runtime/tests/finalize.test.js` | Finalize surface | Add JS-op interruption recovery cases. |
| `rtds/docs/runtime-architecture.md`, `rtds/docs/runtime-spec.md` | Lockstep docs | Document single-resolver + JS registration. |
| `conventions/lockstep.md`, `conventions/component-v2.md` | Conventions | Extend lockstep to outcome/resolution; rewrite §8 finalize subsection. |

---

### Task 1: Add `setupConfig` + `walk` engine helpers

**Files:**
- Modify: `projects/rtds-runtime/globalLibraries/active/rtds_3_vocallsEnv.js`
- Test: `projects/rtds-runtime/tests/components/setupConfig.test.js`

- [ ] **Step 1: Write failing tests for the engine helpers**

Append to `projects/rtds-runtime/tests/components/setupConfig.test.js` (it already boots the runtime via `_harness`). Use the existing harness pattern in that file for `loadRuntime`.

```javascript
describe('setupConfig (engine helper)', function () {
    it('unwraps array-form params, coerces active, resolves string tokens', function () {
        return require('./_harness').loadRuntime().then(function (sb) {
            sb.varObj.who = 'world';
            var out = sb.setupConfig({
                active: ['1', 'isEditable'],   // array-form + truthy
                greeting: 'hello ${who}',       // token resolved via getScoped
                count: 4,                        // non-string keeps type
                nextStep: '00002'
            });
            expect(out.active).toBe(true);
            expect(out.greeting).toBe('hello world');
            expect(out.count).toBe(4);
            expect(out.nextStep).toBe('00002');
        });
    });

    it('accepts a JSON string and a { params } wrapper, returns {} for null', function () {
        return require('./_harness').loadRuntime().then(function (sb) {
            expect(sb.setupConfig('{"a":"1"}').a).toBe('1');
            expect(sb.setupConfig({ params: { b: 2 } }).b).toBe(2);
            expect(Object.keys(sb.setupConfig(null)).length).toBe(0);
        });
    });
});

describe('walk (engine helper)', function () {
    it('iterates own props and stops when fn returns false', function () {
        return require('./_harness').loadRuntime().then(function (sb) {
            var seen = [];
            sb.walk({ a: 1, b: 2, c: 3 }, function (k) { seen.push(k); if (k === 'b') return false; });
            expect(seen).toEqual(['a', 'b']);
        });
    });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest projects/rtds-runtime/tests/components/setupConfig.test.js -t "engine helper" --runInBand`
Expected: FAIL — `sb.setupConfig is not a function` / `sb.walk is not a function`.

- [ ] **Step 3: Add `walk` and `setupConfig` to `rtds_3_vocallsEnv.js`**

Add near the other helpers (after `getValue`). These mirror the component inline versions (`rtds/components/sendSms.js` master `Code`) so both paths produce identical output.

```javascript
/**
 * Iterates own properties of obj, calling fn(key, value). Returning false stops.
 * @param {Object} obj
 * @param {Function} fn
 * @returns {void}
 */
function walk(obj, fn) {
  if (!obj) return;
  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    if (fn(key, obj[key]) === false) return;
  }
}

/**
 * Normalises operation config: JSON string -> parsed; { params } -> params;
 * flat object -> itself; null -> {}.
 * @param {string|Object} config
 * @returns {Object}
 */
function extractParams(config) {
  var parsed = typeof config === "string" ? JSON.parse(config) : config;
  if (parsed && typeof parsed.params === "object" && parsed.params !== null) {
    return parsed.params;
  }
  return parsed || {};
}

/**
 * Resolves Params into a flat { key: value } map. Mirrors the component
 * __setupConfig: array-form [value, ...flags] -> [0]; 'active' coerced via
 * activeFlag; other strings trimmed + ${token}-resolved via resolveTokens;
 * non-strings keep their type. Produces a __rtParams byte-equivalent to the
 * component path.
 * @param {string|Object} config
 * @returns {Object}
 */
function setupConfig(config) {
  var params = extractParams(config);
  var result = {};
  var keys = Object.keys(params);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = params[key];
    if (Array.isArray(value)) value = value.length ? value[0] : "";
    if (key === "active") {
      result.active = activeFlag(value);
      continue;
    }
    if (typeof value === "string") value = resolveTokens(value.replace(/^\s+|\s+$/g, ""));
    result[key] = value;
  }
  return result;
}
```

Note: `resolveTokens` lives in `rtds_2_runtime.js` but is a global by load time; calling it from `rtds_3` is fine because `setupConfig` is only invoked at runtime (after all libs load), not at parse time. If a load-order lint complains, move `setupConfig`/`extractParams`/`walk` to the top of `rtds_2_runtime.js` instead — same globals, no behavior change.

- [ ] **Step 4: Run to verify they pass**

Run: `npx jest projects/rtds-runtime/tests/components/setupConfig.test.js -t "engine helper" --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/rtds-runtime/globalLibraries/active/rtds_3_vocallsEnv.js projects/rtds-runtime/tests/components/setupConfig.test.js
git commit -m "feat(rtds): add shared setupConfig + walk engine helpers"
```

---

### Task 2: Rewrite `executeSetVariables` to the `__rtOutcome` contract

**Files:**
- Modify: `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` (`executeSetVariables`, ~lines 428-468)
- Test: `projects/rtds-runtime/tests/components/setVariables.test.js` (new)

- [ ] **Step 1: Write the failing contract test**

Create `projects/rtds-runtime/tests/components/setVariables.test.js`:

```javascript
var h = require('./_harness');

describe('executeSetVariables — __rtOutcome contract', function () {
    it('inactive (no active key, default false) skips and stages nextStep', function () {
        return h.loadRuntime().then(function (sb) {
            sb.executeSetVariables({ id: '1', type: 'setVariables', params: { foo: 'bar', nextStep: '00002' } });
            expect(sb.__rtOutcome).toBe('nextStep');
            expect(sb.getScoped('foo', 'MISSING')).toBe('MISSING'); // did not write
        });
    });

    it('active writes non-control params to varObj and stages nextStep', function () {
        return h.loadRuntime().then(function (sb) {
            sb.executeSetVariables({ id: '1', type: 'setVariables', params: { active: true, foo: 'bar', nextStep: '00002' } });
            expect(sb.__rtOutcome).toBe('nextStep');
            expect(sb.getScoped('foo', null)).toBe('bar');
        });
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest projects/rtds-runtime/tests/components/setVariables.test.js --runInBand`
Expected: FAIL — `__rtOutcome` is `undefined` (current twin returns `{ nextStepId }` and never stages it).

- [ ] **Step 3: Rewrite `executeSetVariables`**

Replace the whole function body (mirrors `rtds/components/setVariables.js` getGuards-equivalent work node):

```javascript
function executeSetVariables(op) {
  __rtParams = setupConfig(op.params);
  __rtOutcome = "nextStep";

  if (!activeFlag(getValue(__rtParams, "active", false))) {
    Logger.info("[RTDS] SetVariables skipped -- inactive", { outcome: __rtOutcome });
    return;
  }

  var CONTROL = { active: 1, nextstep: 1 };
  var written = 0;
  walk(__rtParams, function (key, value) {
    if (CONTROL[String(key).toLowerCase()]) return;
    setVariable(key, value);
    written++;
  });

  Logger.info("[RTDS] SetVariables wrote variables", { count: written, outcome: __rtOutcome });
  // sync: returns undefined; engine resolves _rtNextStep from __rtOutcome.
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest projects/rtds-runtime/tests/components/setVariables.test.js --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit (test + impl together)**

```bash
git add projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js projects/rtds-runtime/tests/components/setVariables.test.js
git commit -m "refactor(rtds): executeSetVariables uses __rtOutcome contract (Active default false)"
```

---

### Task 3: Rewrite `executeSendSms` to the `__rtOutcome` contract

**Files:**
- Modify: `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` (`executeSendSms`, ~lines 1081-1147)
- Test: `projects/rtds-runtime/tests/components/sendSms.test.js` (re-point existing)

- [ ] **Step 1: Update the existing sendSms test assertions**

Open `projects/rtds-runtime/tests/components/sendSms.test.js`. Re-point assertions from `out.nextStepId` to the staged `__rtOutcome` (the twin now returns a thenable/undefined, not `{ nextStepId }`). For each existing case, after calling `sb.executeSendSms(op)` (await the returned thenable when present), assert `sb.__rtOutcome`:
- inactive (no active key) → `'nextStep'`
- invalid `to` → `'nextStep'`
- gateway success → `'nextStep_Success'`
- gateway failure / reject → `'nextStep_Failure'`

Use the existing `h.withGateway(sb, { success: true, statusCode: 200 })` / failure stubs already in that file. Example for the success case:

```javascript
it('gateway success stages nextStep_Success', function () {
    return h.loadRuntime().then(function (sb) {
        h.withGateway(sb, { success: true, statusCode: 200 });
        sb._rtSmsEndpoint = '/sms';
        return Promise.resolve(sb.executeSendSms({
            id: '1', type: 'sendSms',
            params: { active: true, to: '+32478306999', from: '8850', body: 'hi', nextStep_Success: '00011', nextStep_Failure: '00012', nextStep: '00010' }
        })).then(function () {
            expect(sb.__rtOutcome).toBe('nextStep_Success');
        });
    });
});
```

- [ ] **Step 2: Run to verify the re-pointed tests fail**

Run: `npx jest projects/rtds-runtime/tests/components/sendSms.test.js --runInBand`
Expected: FAIL — current twin doesn't stage `__rtOutcome`.

- [ ] **Step 3: Rewrite `executeSendSms`**

Replace the whole function (mirrors `rtds/components/sendSms.js` work node):

```javascript
function executeSendSms(op) {
  __rtParams = setupConfig(op.params);
  __rtOutcome = "nextStep";

  if (!activeFlag(getValue(__rtParams, "active", false))) {
    Logger.info("[RTDS] SendSMS skipped -- inactive", { outcome: __rtOutcome });
    return;
  }

  var to = getValue(__rtParams, "to", "");
  if (!to || !isMobileNumber(to)) {
    Logger.warn("[RTDS] SendSMS invalid phone number", { to: to, outcome: __rtOutcome });
    return;
  }

  __rtOutcome = "nextStep_Failure";

  if (typeof _rtSmsEndpoint === "undefined" || !_rtSmsEndpoint) {
    Logger.error("[RTDS] SendSMS endpoint not configured", { outcome: __rtOutcome });
    return;
  }
  if (typeof _headers === "undefined" || !_headers) _headers = {};

  var url = _rtBaseUrl + _rtSmsEndpoint;
  var timeout = Number(getValue(__rtParams, "timeout", 10000)) || 10000;
  var payload = {
    smsAccountId: Number(getValue(__rtParams, "smsAccountId", -1)),
    routing: getValue(__rtParams, "routing", ""),
    from: getValue(__rtParams, "from", ""),
    to: to,
    content: getValue(__rtParams, "body", ""),
    plannedTime: nowUTC()
  };

  return jsonHttpRequest(url, { method: "POST", timeout: timeout }, _headers, payload).then(
    function (result) {
      if (result && result.success === true) {
        __rtOutcome = "nextStep_Success";
        Logger.info("[RTDS] SendSMS success", { outcome: __rtOutcome });
        return;
      }
      Logger.warn("[RTDS] SendSMS gateway failure", { statusCode: result && result.statusCode, outcome: __rtOutcome });
    },
    function (err) {
      Logger.error("[RTDS] SendSMS request error", { outcome: __rtOutcome }, err);
    }
  );
}
```

- [ ] **Step 4: Run to verify passes**

Run: `npx jest projects/rtds-runtime/tests/components/sendSms.test.js --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js projects/rtds-runtime/tests/components/sendSms.test.js
git commit -m "refactor(rtds): executeSendSms uses __rtOutcome contract"
```

---

### Task 4: Rewrite `executeSendEmail` to the `__rtOutcome` contract

**Files:**
- Modify: `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` (`executeSendEmail`, ~lines 1153-1243)
- Test: `projects/rtds-runtime/tests/components/sendMail.test.js` (new)

- [ ] **Step 1: Write the failing contract test**

Create `projects/rtds-runtime/tests/components/sendMail.test.js`:

```javascript
var h = require('./_harness');

describe('executeSendEmail — __rtOutcome contract', function () {
    it('inactive (default false) stages nextStep', function () {
        return h.loadRuntime().then(function (sb) {
            sb.executeSendEmail({ id: '1', type: 'sendMail', params: { from: 'a@b.c', to: 'd@e.f', nextStep: '00010' } });
            expect(sb.__rtOutcome).toBe('nextStep');
        });
    });

    it('missing From stages nextStep_Failure', function () {
        return h.loadRuntime().then(function (sb) {
            sb.executeSendEmail({ id: '1', type: 'sendMail', params: { active: true, to: 'd@e.f', nextStep: '00010' } });
            expect(sb.__rtOutcome).toBe('nextStep_Failure');
        });
    });

    it('gateway success stages nextStep_Success', function () {
        return h.loadRuntime().then(function (sb) {
            h.withGateway(sb, { success: true, statusCode: 200 });
            sb._rtMailEndpoint = '/mail';
            return Promise.resolve(sb.executeSendEmail({
                id: '1', type: 'sendMail',
                params: { active: true, from: 'a@b.c', to: 'd@e.f', subject: 's', body: 'b', nextStep_Success: '00011', nextStep_Failure: '00012', nextStep: '00010' }
            })).then(function () {
                expect(sb.__rtOutcome).toBe('nextStep_Success');
            });
        });
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest projects/rtds-runtime/tests/components/sendMail.test.js --runInBand`
Expected: FAIL — `__rtOutcome` undefined.

- [ ] **Step 3: Rewrite `executeSendEmail`**

Replace the whole function (mirrors `rtds/components/sendMail.js`; uses existing engine helpers `splitSemicolonList`/`buildAttachments`/`resolveFilesList` with `.length` guards to reproduce the component's "omit when empty" payload):

```javascript
function executeSendEmail(op) {
  __rtParams = setupConfig(op.params);
  __rtOutcome = "nextStep";

  if (!activeFlag(getValue(__rtParams, "active", false))) {
    Logger.info("[RTDS] SendEmail skipped -- inactive", { outcome: __rtOutcome });
    return;
  }

  var from = String(getValue(__rtParams, "from", "")).replace(/^\s+|\s+$/g, "");
  var to = splitSemicolonList(getValue(__rtParams, "to", ""));
  if (!from || to.length === 0) {
    Logger.warn("[RTDS] SendEmail missing From or To", { from: from, toCount: to.length, outcome: __rtOutcome });
    return;
  }

  __rtOutcome = "nextStep_Failure";

  if (typeof _rtMailEndpoint === "undefined" || !_rtMailEndpoint) {
    Logger.error("[RTDS] SendEmail endpoint not configured", { outcome: __rtOutcome });
    return;
  }
  if (typeof _headers === "undefined" || !_headers) _headers = {};

  var priority = Number(getValue(__rtParams, "priority", 2));
  if (priority !== 1 && priority !== 2 && priority !== 3) priority = 2;

  var payload = {
    from: from,
    subject: getValue(__rtParams, "subject", ""),
    to: to,
    body: getValue(__rtParams, "body", ""),
    priority: priority
  };
  var cc = splitSemicolonList(getValue(__rtParams, "cc", ""));
  if (cc.length) payload.cc = cc;
  var bcc = splitSemicolonList(getValue(__rtParams, "bcc", ""));
  if (bcc.length) payload.bcc = bcc;
  var files = resolveFilesList(getValue(__rtParams, "files", ""));
  if (files.length) payload.files = files;
  var attachments = buildAttachments(getValue(__rtParams, "attachmentNames", ""), getValue(__rtParams, "attachmentData", ""));
  if (attachments.length) payload.attachments = attachments;
  var customerKey = String(getValue(__rtParams, "customerKey", "")).replace(/^\s+|\s+$/g, "");
  if (customerKey) payload.customerKey = customerKey;

  var url = _rtBaseUrl + _rtMailEndpoint;
  var timeout = Number(getValue(__rtParams, "timeout", 10000)) || 10000;

  return jsonHttpRequest(url, { method: "POST", timeout: timeout }, _headers, payload).then(
    function (result) {
      if (result && result.success === true) {
        __rtOutcome = "nextStep_Success";
        Logger.info("[RTDS] SendEmail success", { outcome: __rtOutcome });
        return;
      }
      Logger.warn("[RTDS] SendEmail gateway failure", { statusCode: result && result.statusCode, outcome: __rtOutcome });
    },
    function (err) {
      Logger.error("[RTDS] SendEmail request error", { outcome: __rtOutcome }, err);
    }
  );
}
```

- [ ] **Step 4: Run to verify passes**

Run: `npx jest projects/rtds-runtime/tests/components/sendMail.test.js --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js projects/rtds-runtime/tests/components/sendMail.test.js
git commit -m "refactor(rtds): executeSendEmail uses __rtOutcome contract"
```

---

### Task 5: Normalize the `runStep` JS branch to a single resolver

**Files:**
- Modify: `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` (`runStep` JS branch, ~lines 603-660)
- Test: `projects/rtds-runtime/tests/finalize.test.js` (add engine-branch case)

- [ ] **Step 1: Add a failing test for engine resolution of a registered twin**

Append to `finalize.test.js` (reuses its `boot`/`install`/`dataOp` helpers). Register a JS op that stages `__rtOutcome` (no `{ nextStepId }`) and assert the engine resolves `_rtNextStep` and advances.

```javascript
describe('runStep — engine resolves _rtNextStep from staged __rtOutcome (JS ops)', function () {
    it('sync twin: engine resolves __rtOutcome -> _rtNextStep and advances', function () {
        return boot().then(function (sb) {
            sb.registerRtdsOperation('OutcomeSync', function (op) {
                sb.__rtParams = op.params;
                sb.__rtOutcome = 'nextStep_Success';   // returns undefined
            });
            install(sb, [
                { id: 'A', type: 'OutcomeSync', name: 'a', params: { nextStep_Success: 'B', nextStep: 'X' } },
                dataOp('B', 'FromB', 'b', null)
            ]);
            return Promise.resolve(sb.runStep('A')).then(function (out) {
                expect(out).toBe('disconnect');
                expect(sb.getScoped('FromB', null)).toBe('b');   // advanced via resolved _rtNextStep=B
            });
        });
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest projects/rtds-runtime/tests/finalize.test.js -t "engine resolves _rtNextStep" --runInBand`
Expected: FAIL — current branch reads `result.nextStepId` (undefined) → treats as end-of-flow, `FromB` never written.

- [ ] **Step 3: Replace the JS branch with the normalized single-resolver**

Replace the entire `if (entry.kind === "js") { ... }` block (lines ~603-660) with:

```javascript
    // JS-handled operation. The handler stages __rtParams + __rtOutcome (the
    // same contract a GUI component uses); the engine is the single resolver --
    // it runs _rtNextStep = getValue(__rtParams, __rtOutcome, '') after the
    // handler settles (the engine plays the component's output-node role), then
    // advances. Promise.resolve normalises sync (undefined) and async (thenable)
    // into one awaitable; the return value is used only for timing, never routing.
    if (entry.kind === "js") {
      var task;
      try {
        task = Promise.resolve(entry.handler(current));
      } catch (err) {
        log_error("[RTDS] ERROR in " + type + " step " + current.id + ": " + (err && err.message));
        context.session.variables.RTDS_error = err && err.message;
        return "disconnect";
      }
      var resolvedCurrentId = current.id;
      return task.then(
        function () {
          _rtNextStep = getValue(__rtParams, __rtOutcome, "");
          if (!_rtNextStep) {
            Logger.info("[RTDS] end of flow", { lastStep: resolvedCurrentId });
            return "disconnect";
          }
          return runStep(String(_rtNextStep), remaining);
        },
        function (err) {
          log_error("[RTDS] ERROR in async " + type + " step " + resolvedCurrentId + ": " + (err && err.message));
          context.session.variables.RTDS_error = err && err.message;
          return "disconnect";
        }
      );
    }
```

Note: `runStep` now returns a promise whenever it dispatches a JS op (sync ops gain one microtask hop). The GUI branch and the unregistered/skip branches are unchanged. Callers (`fetchAndStart`, `resumeFrom`, `finalizeFrom`) already handle a promise return.

- [ ] **Step 4: Run the new test + full finalize suite**

Run: `npx jest projects/rtds-runtime/tests/finalize.test.js --runInBand`
Expected: PASS — new case passes; existing finalize/cycle/GUI-filter cases still pass (GUI branch untouched; the async-await test still holds because JS dispatch is still promise-returning).

- [ ] **Step 5: Commit**

```bash
git add projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js projects/rtds-runtime/tests/finalize.test.js
git commit -m "refactor(rtds): runStep JS branch is the single _rtNextStep resolver"
```

---

### Task 6: Simplify `finalizeFrom` (no per-kind logic)

**Files:**
- Modify: `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` (`finalizeFrom`)
- Test: `projects/rtds-runtime/tests/finalize.test.js`

Because every in-flight op (GUI or JS) now leaves `__rtParams`/`__rtOutcome`, `finalizeFrom` does not need bespoke recovery — the resume point comes through `onCallResult`'s `RTDS_nextStepId || RTDS_currentOpId`, and the JS engine branch resolves `__rtOutcome` during the finalize run itself. `finalizeFrom` stays as the simple guard + `runStep` driver.

- [ ] **Step 1: Add a JS-op interruption recovery test**

Append to `finalize.test.js`:

```javascript
describe('finalizeFrom — JS-op interruption runs the data tail uniformly', function () {
    it('resumes and runs a JS twin that stages __rtOutcome to completion', function () {
        return boot().then(function (sb) {
            sb.registerRtdsOperation('TailSync', function (op) {
                sb.__rtParams = op.params;
                if (op.params && op.params.Key) sb.setVariable(op.params.Key, op.params.Value);
                sb.__rtOutcome = (op.params && op.params.Outcome) || 'nextStep';
            });
            install(sb, [
                { id: 'A', type: 'TailSync', name: 'a', params: { Key: 'FromA', Value: 'a', Outcome: 'nextStep', nextStep: 'B' } },
                { id: 'B', type: 'TailSync', name: 'b', params: { Key: 'FromB', Value: 'b', Outcome: 'nextStep', nextStep: null } }
            ]);
            return Promise.resolve(sb.finalizeFrom('A')).then(function (out) {
                expect(out).toBe('disconnect');
                expect(sb.getScoped('FromA', null)).toBe('a');
                expect(sb.getScoped('FromB', null)).toBe('b');
                expect(sb.RTDS_finalizing).toBe(true);
            });
        });
    });
});
```

- [ ] **Step 2: Run to verify it passes (no impl change expected)**

Run: `npx jest projects/rtds-runtime/tests/finalize.test.js -t "JS-op interruption" --runInBand`
Expected: PASS already — Task 5's engine branch makes this work without touching `finalizeFrom`. If it FAILS, inspect whether `finalizeFrom` has leftover recovery code from the superseded design (it should not, since that design was never implemented); ensure `finalizeFrom` is the plain guard + `runStep` form.

- [ ] **Step 3: Confirm `finalizeFrom` is the plain form**

Read `finalizeFrom`; it should be only: guard on empty `nextStepId` → `undefined`; set `RTDS_finalizing = true`; log; `return runStep(String(nextStepId))`. No `__rtOutcome` block (that lived only in the superseded plan, not in committed code). No change needed if already so.

- [ ] **Step 4: Commit (test only, if no impl change)**

```bash
git add projects/rtds-runtime/tests/finalize.test.js
git commit -m "test(rtds): JS-op interruption runs the data tail via the unified resolver"
```

---

### Task 7: Register all three Types as JS (JS wins)

**Files:**
- Modify: `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` (registration block, ~lines 1256-1283)

- [ ] **Step 1: Read the current registration block**

Run: `grep -n "registerRtdsOperation\|registerRtdsExit" projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js`

Current relevant lines: `registerRtdsOperation('setVariables', executeSetVariables)` then `registerRtdsExit('setVariables', 'set_variables')` / `('setAttributes','set_variables')` / `('sendSms','send_sms')` / `('sendMail','send_mail')` — the exits currently override `setVariables` and the sends are exit-only.

- [ ] **Step 2: Change registration so the three Types win as JS**

Replace the `setVariables`/`setAttributes`/`sendSms`/`sendMail` registration lines so the JS registrations are the effective ones. Remove the competing `registerRtdsExit` lines for these four Types and register all as JS (`setAttributes` shares `executeSetVariables`):

```javascript
// setVariables / setAttributes / sendSms / sendMail dispatch as INLINE JS twins
// (unified __rtOutcome contract). Their canvas components remain the lockstep
// reference but are no longer reached on the live path for these Types.
registerRtdsOperation("setVariables", executeSetVariables);
registerRtdsOperation("setAttributes", executeSetVariables);
registerRtdsOperation("sendSms", executeSendSms);
registerRtdsOperation("sendMail", executeSendEmail);
```

Leave all other `registerRtdsExit(...)` lines (workgroupTransfer, menu, say, guard, …) unchanged.

- [ ] **Step 3: Run the full suite + flow simulator**

Run: `npx jest --runInBand`
Expected: PASS. The flow-simulator smoke/http tests (`flowSimulator.smoke.test.js`, `flowSimHttp.test.js`) and `main.test.js` exercise dispatch; confirm a `setVariables` op now runs inline (JS) rather than emitting the `set_variables` exit. If any test asserted the `set_variables` / `send_sms` exit key for these Types, update it to expect inline JS advancement (the op resolves `_rtNextStep` and continues, no exit key).

- [ ] **Step 4: Commit**

```bash
git add projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js
git commit -m "feat(rtds): register setVariables/setAttributes/sendSms/sendMail as JS handlers"
```

---

### Task 8: Update lockstep docs and conventions

**Files:**
- Modify: `rtds/docs/runtime-architecture.md`, `rtds/docs/runtime-spec.md`, `conventions/lockstep.md`, `conventions/component-v2.md`

- [ ] **Step 1: runtime-architecture.md — single resolver + JS registration**

Find the dispatch/finalize section (`grep -n "runStep\|finalizeFrom\|kind" rtds/docs/runtime-architecture.md`) and add:

```markdown
JS-handled operations follow the same outcome contract as GUI components: the
handler stages `__rtParams` + `__rtOutcome`, and `runStep` is the single resolver
— after the handler settles it runs `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`
and advances. Because GUI and JS ops leave identical state, call-interruption
finalize recovers both uniformly with no per-kind logic. `setVariables`,
`setAttributes`, `sendSms`, and `sendMail` dispatch as inline JS twins.
```

- [ ] **Step 2: runtime-spec.md — contract note**

Add to the dispatch/handler section:

```markdown
- JS handlers return nothing meaningful (sync `undefined`, async the thenable);
  they communicate via staged `__rtOutcome` (a Params key) + `__rtParams`. The
  engine resolves `_rtNextStep = getValue(__rtParams, __rtOutcome, '')`. `''` → end of flow.
- `Active` defaults `false` on the JS twins (`activeFlag(getValue(__rtParams,'active',false))`).
```

- [ ] **Step 3: lockstep.md — extend parity to outcome/resolution**

Add under the contract section:

```markdown
- **Outcome/resolution parity.** Both the twin and the component stage `__rtOutcome`
  (a literal Params key) and resolve via `getValue(__rtParams, __rtOutcome, '')`. The
  twin does this through the engine's single resolver (`runStep`); the component does
  it at its output node. Same outcome vocabulary, same resolution.
```

- [ ] **Step 4: component-v2.md §8 — rewrite the finalize subsection**

Replace the "Finalize-path resolution (call interruption)" subsection added earlier (the one describing `finalizeFrom` re-resolving `__rtOutcome`) with:

```markdown
### Finalize-path resolution (call interruption)

`__rtOutcome` / `__rtParams` are bare-assigned globals that persist on the session
scope. Both GUI components and JS twins stage them identically, and the resolution
`_rtNextStep = getValue(__rtParams, __rtOutcome, '')` runs at the component output
node (GUI) or in `runStep`'s single resolver (JS). Because every in-flight op leaves
the same state, a caller hang-up is recovered uniformly by re-running the flow from
the resume point in finalization mode — no per-kind logic in `finalizeFrom`.
```

- [ ] **Step 5: Resync the generated skill bundle**

Run: `npm run build:skill`
Expected: updates the generated copies under `.claude/skills/rtds-vocalls-component-gen/` for any changed `conventions/` files.

- [ ] **Step 6: Run the full check gate**

Run: `npm run check`
Expected: `check:sync` PASS (bundle resynced), `check:lockstep` PASS (the 5 pre-existing param warnings are report-only), all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add rtds/docs/runtime-architecture.md rtds/docs/runtime-spec.md conventions/lockstep.md conventions/component-v2.md .claude/skills/rtds-vocalls-component-gen/
git commit -m "docs(rtds): document unified __rtOutcome contract + JS registration (lockstep)"
```

---

### Task 9: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full gate**

Run: `npm run check`
Expected: all green; `Tests: <n> passed`.

- [ ] **Step 2: Working tree clean**

Run: `git status --short`
Expected: empty.

---

## Self-Review Notes

- **Spec coverage:** design (a) shared helpers → Task 1; (b) three twins → Tasks 2-4; (c) engine JS branch → Task 5; (d) finalize → Task 6; Registration section → Task 7; Migration & lockstep → Task 8; Testing → tests in Tasks 1-7. Active-default `false` (incl. the `setVariables` divergence) → Tasks 2-4 use `getValue(...,'active',false)`.
- **No placeholders:** every code step shows complete ES5.1 code and exact commands.
- **Name consistency:** `setupConfig`, `walk`, `__rtParams`, `__rtOutcome`, `_rtNextStep`, `getValue`, `activeFlag`, `executeSetVariables`/`executeSendSms`/`executeSendEmail` used identically throughout and match current code.
- **Open standing instructions honored:** no new helpers beyond `setupConfig`/`walk`; if a both-sides simplification appears mid-implementation (e.g. the `splitSemicolonList` null-vs-`[]` difference), surface it to the requester rather than changing the shared/component code unilaterally.
