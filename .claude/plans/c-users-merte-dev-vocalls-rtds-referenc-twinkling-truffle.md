> **⚠️ Legacy / historical (2026-06-08).** This plan predates the unified v2 component contract and describes the retired "Style B" `RTDS_OP_*` GUI-handoff convention (e.g. `RTDS_OP_GuardId`). The live runtime does **not** write per-key `RTDS_OP_*` variables — `prepareGuiHandoff` writes the whole params object to `RTDS_currentOpConfig`, and a GUI-exit target like `guard_tui` is a normal self-contained v2 component (see the shipped [guardTui.js](../../dev/vocalls-rtds/rtds/components/guardTui.js) and [conventions/component-v2.md](../../dev/vocalls-rtds/conventions/component-v2.md)). Kept for historical reference only; do not follow the `RTDS_OP_*` parts.

# GuardTUI Component Specification

## Context

The PureConnect handler [NAllo_RTDS_GuardTUI.xml](references/rtds/handlers/NAllo_RTDS_GuardTUI.xml) implements a self-service TUI (Telephone User Interface) that lets a caller toggle their own "guard duty" (on-call) status for a given configuration. It is part of the legacy NAllo RTDS handler set and is referenced in [RTDS_runtime_spec.md:113](references/rtds/docs/RTDS_runtime_spec.md#L113) as the `GuardTUI` operation type with GUI-exit key `"guard_tui"`.

This document **does not** generate the Vocalls component XML. It converts the handler's business logic into a Style A (self-contained, `__configJSON`-driven, sendSms-shaped) component **technical specification** that a later step can turn into the mxGraph XML using the [vocalls-component-builder skill](.claude/skills/vocalls-component-builder/SKILL.md). The naming, encoding, helper bundle and three-script-node skeleton follow [conventions.md](.claude/skills/vocalls-component-builder/references/conventions.md).

Out of scope: the actual mxGraph XML, language packs, PropertiesDefinition copy editing, integration with the wider RTDS routing table.

---

## 1. Business logic extracted from the handler

### 1.1 Inputs (from handler `p_lsAttrNames` / `p_lsAttrValues`)

| Handler attribute  | Type                          | Purpose                                                                              |
| ------------------ | ----------------------------- | ------------------------------------------------------------------------------------ |
| `Active`           | string `"0"` / `"No"` / other | Gate. `"No"` or `"0"` → component is passive; skip all work and route to `NextStep`. |
| `ConfigId`         | numeric string                | Guard configuration the caller is querying. Used in both REST calls.                 |
| `ConfigName`       | string                        | Human-readable label. Used in TTS messages (`"... for: ConfigName"`).                |
| `Timeout`          | numeric string (seconds)      | HTTP request timeout. Falls back to 10s if `≤ 0` or missing.                         |
| `NextStep`         | string                        | Step Id used when `Active === false` (passive exit).                                 |
| `NextStep_Success` | string                        | Step Id used after a successful activate/deactivate cycle.                           |
| `NextStep_Failure` | string                        | Step Id used on any REST/parse failure path.                                         |

### 1.2 Runtime data the handler reads from the call (not Params)

| Source                                         | Variable              | Resolution path                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `varObj.ani`                                   | `sCallingPartyNumber` | Caller's phone number; primary key against the Guard API. The project stores ANI on the shared `varObj` global (see [projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js:930](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L930) and [projects/demo/callScripts/main.js:129](projects/demo/callScripts/main.js#L129)). |
| `Eic_Language` call attribute                  | `sLanguage`           | Currently read but **unused** in the handler logic — TTS strings are hardcoded English. (Spec note: when porting, this attribute becomes a Designer-flow concern, not a component concern.)                                                                                                                                                               |
| `RTDS_PromptLibrary` call attribute            | `sPromptSource`       | Read but unused in this handler. Drop in the port.                                                                                                                                                                                                                                                                                                        |
| Structured parameter `RTDS / GuardTUI API URL` | `c_sURLGuardAPI`      | Base URL for the Guard API. Component must resolve this from environment, not from a per-call parameter.                                                                                                                                                                                                                                                  |

### 1.3 External dependencies

Guard API (base URL `c_sURLGuardAPI`, defaults to `https://guardmoduleapi.n-allo.be`):

| #   | Method + path                                                                  | Purpose                                                                                                             | Body |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---- |
| R1  | `GET /api/Guards/AnyGuardWithPhoneNumberAndConfig/{ConfigId}/{CallerNumber}/0` | "Is this caller registered to manage the given config?"                                                             | none |
| R2  | `GET /api/Guards/GetGuardByPhoneNumberAndConfig/{CallerNumber}/{ConfigId}`     | Fetch the caller's current guard record. Response is a JSON object with at least `id` and `active`.                 | none |
| R3  | `POST /api/Guards/Disable/{guardId}`                                           | Deactivate. Returns `"true"` on success, `"false"` when caller is sole active member (forbidden), other on failure. | none |
| R4  | `POST /api/Guards/Activate/{guardId}`                                          | Activate. Returns `"true"` on success.                                                                              | none |

All four calls use `Content-Type: application/json`, ignore SSL validation issues, and use the same `Timeout`-derived value.

### 1.4 Interactive surface (TTS + DTMF) — out of component scope

The handler embeds six TTS prompts and two DTMF collects. Per [vocalls-component-two-styles.md](C:/Users/merte/.claude/projects/c--Users-merte-dev-vocalls-rtds/memory/vocalls-component-two-styles.md) and the sendSms reference, **a Style A component does REST + branching only**. Prompts and DTMF stay in the Designer flow that wraps this component, driven by the `NextStep_*` branch the component picks. The wrapping flow gets enough outcome keys to render the right prompt + collect the right digit.

### 1.5 Decision tree (handler control flow, simplified)

```
                 ┌─ Active == false ─────────────► NextStep              (gate)
entry ─ resolve config ─┤
                 └─ Active == true
                         │
                         R1 AnyGuardWithPhoneNumberAndConfig
                         ├─ HTTP failure ─────────► NextStep_Failure
                         ├─ body != "true" ───────► NextStep_NotAllowed  (was: "Not allowed" TTS + disconnect)
                         └─ body == "true"
                                 │
                                 R2 GetGuardByPhoneNumberAndConfig
                                 ├─ HTTP failure ───► NextStep_Failure
                                 ├─ parse failure ──► NextStep_Failure
                                 └─ OK → read active flag from response
                                         │
                                         ├─ active == "1"  → NextStep_CurrentlyActive
                                         │       (caller flow plays "active for ConfigName, press 3 to deactivate";
                                         │        if caller presses 3, re-enters component with Action="Deactivate")
                                         │
                                         └─ active != "1"  → NextStep_CurrentlyInactive
                                                 (caller flow plays "not active for ConfigName, press 7 to activate";
                                                  if caller presses 7, re-enters component with Action="Activate")

(re-entry with Action="Deactivate" + GuardId already resolved):
   R3 Disable
   ├─ HTTP failure        ─► NextStep_Failure
   ├─ body == "false"     ─► NextStep_DeactivateOnlyMember (was: "only active member" TTS)
   ├─ body == "true"      ─► NextStep_Success
   └─ other                ─► NextStep_Failure

(re-entry with Action="Activate" + GuardId already resolved):
   R4 Activate
   ├─ HTTP failure        ─► NextStep_Failure
   ├─ body == "true"      ─► NextStep_Success
   └─ other                ─► NextStep_Failure
```

This re-entry model (the component runs once for "check", a second time for "act") is the natural fit for the Style A skeleton — the component is a stateless REST oracle, the caller flow drives the conversation.

---

## 2. Component identity

| Field                                  | Value                                                      |
| -------------------------------------- | ---------------------------------------------------------- |
| Component name (file + work fn suffix) | `guardTui`                                                 |
| Work function                          | `__guardTui`                                               |
| Type prefix for `__init` collisions    | `GuardTui` (so secondary candidate is `__rtGuardTui<Key>`) |
| Logging tag                            | `[GuardTUI]`                                               |
| Output file (when generated)           | `references/rtds/components/guardTui.js`                   |
| Operation Type label in `__configJSON` | `"GuardTUI"` (Type prefix per RTDS spec)                   |

---

## 3. Params schema (`__configJSON` shape)

The Designer-facing JSON. Defaults shown below double as placeholder example values for the property pane.

```json
{
  "Active": true,
  "ConfigId": 0,
  "ConfigName": "",
  "Action": "Check",
  "GuardId": "",
  "Timeout": 10000,
  "NextStep": "00099",
  "NextStep_NotAllowed": "00010",
  "NextStep_CurrentlyActive": "00020",
  "NextStep_CurrentlyInactive": "00030",
  "NextStep_DeactivateOnlyMember": "00040",
  "NextStep_Success": "00050",
  "NextStep_Failure": "00099"
}
```

| Key                             | Type        | Meaning                                                                                                                    | Notes                                               |
| ------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `Active`                        | boolean     | Component-wide gate. `false` → skip all work, route to `NextStep`.                                                         | Coerced to boolean by `__setupConfig`.              |
| `ConfigId`                      | number      | Guard configuration Id.                                                                                                    | Coerced to `Number` by `__setupConfig`.             |
| `ConfigName`                    | string      | Display name for the config; surfaced to the caller flow via `__outputVar`.                                                | Not used inside the component; passed through.      |
| `Action`                        | enum string | `"Check"` (default, runs R1+R2), `"Activate"` (runs R4 against `GuardId`), `"Deactivate"` (runs R3 against `GuardId`).     | Drives which sub-flow `__guardTui` executes.        |
| `GuardId`                       | string      | Result of R2's `id` field, set on re-entry by the caller flow. Empty on the first call.                                    | Required for `Action != "Check"`.                   |
| `Timeout`                       | number      | Request timeout in **milliseconds** (note: handler uses seconds; we normalise to ms here to match the sendSms convention). | Coerced to `Number`. Floor `1000`, default `10000`. |
| `NextStep`                      | string      | Step Id when `Active === false`.                                                                                           |                                                     |
| `NextStep_NotAllowed`           | string      | Step Id when R1 body != `"true"`.                                                                                          |                                                     |
| `NextStep_CurrentlyActive`      | string      | Step Id when R2 parsed `active === "1"`.                                                                                   |                                                     |
| `NextStep_CurrentlyInactive`    | string      | Step Id when R2 parsed `active != "1"`.                                                                                    |                                                     |
| `NextStep_DeactivateOnlyMember` | string      | Step Id when R3 body == `"false"`.                                                                                         |                                                     |
| `NextStep_Success`              | string      | Step Id when R3 or R4 body == `"true"`.                                                                                    |                                                     |
| `NextStep_Failure`              | string      | Step Id for any HTTP / parse / unknown failure.                                                                            |                                                     |

Note: the handler reads `sCallingPartyNumber` from `Eic_RemoteAddress` directly. Components live one level higher and read `context.session.variables`. The caller number is therefore resolved **inside the component** from `context.session.variables.Eic_RemoteAddress` (or `RTDS_callingPartyNumber`, whichever the project's `parseFlow` / session bootstrap actually sets — to confirm). It is not a Param.

---

## 4. Master-layer `Variables` (Designer property pane defaults)

```
__configJSON = {
    "Active": true,
    "ConfigId": 0,
    "ConfigName": "",
    "Action": "Check",
    "GuardId": "",
    "Timeout": 10000,
    "NextStep": "00099",
    "NextStep_NotAllowed": "00010",
    "NextStep_CurrentlyActive": "00020",
    "NextStep_CurrentlyInactive": "00030",
    "NextStep_DeactivateOnlyMember": "00040",
    "NextStep_Success": "00050",
    "NextStep_Failure": "00099"
};
__environment = environment;
__rtBaseUrl = _rtGuardTuiBaseUrl;
__rtEndpointAnyGuard = _rtGuardTuiEndpointAnyGuard;
__rtEndpointGetGuard = _rtGuardTuiEndpointGetGuard;
__rtEndpointActivate = _rtGuardTuiEndpointActivate;
__rtEndpointDisable = _rtGuardTuiEndpointDisable;
__nextStep = _rtNextStep;
__outputVar = _rtGuardTuiOutput;
```

Notes:

- Four endpoint variables (one per REST call) instead of one. The system-scope `_rt*` variables are configured per-environment by the project; this component is agnostic.
- Use `=` (not `&=`) on all bindings per [conventions.md §4](.claude/skills/vocalls-component-builder/references/conventions.md). The handler-originated `&=` form is documented in [memory: vocalls-placeholder-binding-operator](C:/Users/merte/.claude/projects/c--Users-merte-dev-vocalls-rtds/memory/vocalls-placeholder-binding-operator.md) but the conventions document overrides for new components.

---

## 5. Master-layer `Code` — variables & helpers

### 5.1 Default declarations (`__rt*` defaults block)

```
environment = '';
__rtBaseUrl = '';
__rtEndpointAnyGuard = '';
__rtEndpointGetGuard = '';
__rtEndpointActivate = '';
__rtEndpointDisable = '';

__rtActive = false;
__rtConfigId = -1;
__rtConfigName = '';
__rtAction = 'Check';
__rtGuardId = '';
__rtTimeout = 10000;

__rtNextStep = -1;
__rtNextStep_NotAllowed = -1;
__rtNextStep_CurrentlyActive = -1;
__rtNextStep_CurrentlyInactive = -1;
__rtNextStep_DeactivateOnlyMember = -1;
__rtNextStep_Success = -1;
__rtNextStep_Failure = -1;
```

### 5.2 Canonical helpers (copied verbatim from [canonical_helpers.js](.claude/skills/vocalls-component-builder/references/canonical_helpers.js))

`__makeLocalNodeId`, `__resolveTemplate`, `__extractParams`, `__setupConfig`, `__init` — unchanged. The `__setupConfig` coercion table needs one addition for this component:

- `Timeout` → `Number`
- `ConfigId` → `Number`
- `Active` → `Boolean`
- (Everything else: trim + template-resolve, as standard.)

These are already in `__setupConfig`'s default set; no override required.

`__init`'s candidate lookup order for this component:

1. `__rt<Key>` e.g. `__rtConfigId`, `__rtAction`, `__rtGuardId`
2. `__rtGuardTui<Key>` (Type-prefix fallback for collisions; not expected to be needed)

### 5.3 Operation-specific helpers

#### `__getCallerNumber()`

```js
/**
 * Resolves the caller's phone number from the shared `varObj` global. The
 * project's runtime writes the ANI to `varObj.ani` during session bootstrap
 * (see projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js:930
 * and projects/demo/callScripts/main.js:129). Returns null when no number is
 * available.
 *
 * @returns {string|null} The caller phone number, or null if unknown.
 */
__getCallerNumber = function () {
  if (typeof varObj !== "undefined" && varObj && varObj.ani) {
    return String(varObj.ani);
  }
  return null;
};
```

#### `__parseGuardRecord(responseBody)`

R2 returns either a JSON-parsed-once object (`jsonHttpRequest` parses for us) or — in the handler — a raw string the handler then JSON-parses. Vocalls' `jsonHttpRequest` already auto-parses on `Content-Type: application/json`. Helper unifies both, returning `{ id, active }` or null.

```js
/**
 * Normalises a Guard API record response to { id, active }. Accepts a parsed
 * object, a JSON string, or the `lsNamesList1 / lsValuesList1` pair the
 * PureConnect handler produced. Returns null when neither id nor active can
 * be located.
 *
 * @param {*} body - The response body from R2 (object or string).
 * @returns {{id: string, active: string}|null} Parsed record, or null.
 */
__parseGuardRecord = function (body) {
  if (!body) {
    return null;
  }
  var __parsed = body;
  if (typeof body === "string") {
    try {
      __parsed = JSON.parse(body);
    } catch (__e) {
      return null;
    }
  }
  if (typeof __parsed !== "object" || __parsed === null) {
    return null;
  }
  var __id = __parsed.id;
  var __active = __parsed.active;
  if (__id === undefined && __active === undefined) {
    return null;
  }
  return {
    id: __id !== undefined && __id !== null ? String(__id) : "",
    active:
      __active !== undefined && __active !== null ? String(__active) : "0",
  };
};
```

#### `__isAffirmative(body)`

R1/R3/R4 return a plain string `"true"` / `"false"`. Helper for case-insensitive comparison.

```js
/**
 * Case-insensitive equality with the literal string "true". Accepts either a
 * raw string body or an object-wrapped form (e.g. { value: true }).
 *
 * @param {*} body - Raw API response body.
 * @returns {boolean} True iff body is the affirmative form.
 */
__isAffirmative = function (body) {
  if (body === true) {
    return true;
  }
  if (body && typeof body === "object" && body.value === true) {
    return true;
  }
  if (typeof body === "string") {
    return body.toLowerCase().replace(/^\s+|\s+$/g, "") === "true";
  }
  return false;
};
```

#### `__guardTuiHttp(url, method, successKey, failureKey, bodyChecker)`

A thin wrapper over `jsonHttpRequest` that captures the boilerplate the handler's four REST steps repeat. Centralising it keeps `__guardTui` readable.

```js
/**
 * Issues a Guard API request and resolves the next-step Id based on the
 * response body. On non-2xx or any exception the failure step is returned.
 *
 * @param {string} url - Fully-resolved request URL.
 * @param {string} method - HTTP verb (GET or POST).
 * @param {function(*):string} bodyToStep - Function mapping the parsed body
 *        to a next-step Id (or null if the caller should fall back to the
 *        failure step).
 * @returns {*} The task returned by jsonHttpRequest.
 */
__guardTuiHttp = function (url, method, bodyToStep) {
  log_debug("[GuardTUI] HTTP " + method + " " + url);
  return jsonHttpRequest(url, { method: method }, _headers, null)
    .withTimeout(__rtTimeout)
    .then(
      function (result) {
        if (
          !result ||
          result.success !== true ||
          result.statusCode < 200 ||
          result.statusCode >= 300
        ) {
          log_error("[GuardTUI] non-2xx - " + JSON.stringify(result));
          global[__nextStep] = __rtNextStep_Failure;
          return __rtNextStep_Failure;
        }
        var nextId = bodyToStep(result.body);
        if (nextId === null || nextId === undefined) {
          global[__nextStep] = __rtNextStep_Failure;
          return __rtNextStep_Failure;
        }
        global[__nextStep] = nextId;
        return nextId;
      },
      function (err) {
        log_error("[GuardTUI] request error - " + JSON.stringify(err));
        global[__nextStep] = __rtNextStep_Failure;
        return __rtNextStep_Failure;
      },
    );
};
```

### 5.4 Work function `__guardTui`

```js
/**
 * GuardTUI operation. Dispatches on __rtAction:
 *  - "Check":      runs R1 (allowed-for-config), then R2 (current record),
 *                  writes the guard id to context.session.variables.RTDS_OP_GuardId
 *                  and selects NextStep_CurrentlyActive / NextStep_CurrentlyInactive
 *                  / NextStep_NotAllowed / NextStep_Failure.
 *  - "Activate":   runs R4 (Activate) against __rtGuardId, selects
 *                  NextStep_Success or NextStep_Failure.
 *  - "Deactivate": runs R3 (Disable) against __rtGuardId, selects
 *                  NextStep_Success, NextStep_DeactivateOnlyMember, or NextStep_Failure.
 *
 * @returns {*} The async task from jsonHttpRequest, or undefined when the
 *              operation short-circuits on a precondition failure.
 */
__guardTui = function () {
  global[__nextStep] = __rtNextStep_Failure;

  if (!__rtActive) {
    log_debug("[GuardTUI] Inactive — routing to NextStep");
    global[__nextStep] = __rtNextStep;
    return;
  }

  if (!__rtBaseUrl) {
    log_error("[GuardTUI] _rtGuardTuiBaseUrl is not set");
    return;
  }

  var __action = String(__rtAction || "Check");

  if (__action === "Activate" || __action === "Deactivate") {
    if (!__rtGuardId) {
      log_error("[GuardTUI] " + __action + " requested but GuardId is empty");
      return;
    }
    var __path =
      __action === "Activate" ? __rtEndpointActivate : __rtEndpointDisable;
    var __url = __rtBaseUrl + __path + "/" + encodeURIComponent(__rtGuardId);
    return __guardTuiHttp(__url, "POST", function (body) {
      if (__isAffirmative(body)) {
        return __rtNextStep_Success;
      }
      if (
        __action === "Deactivate" &&
        typeof body === "string" &&
        body.toLowerCase().replace(/^\s+|\s+$/g, "") === "false"
      ) {
        return __rtNextStep_DeactivateOnlyMember;
      }
      return __rtNextStep_Failure;
    });
  }

  // action === "Check" (default)
  var __caller = __getCallerNumber();
  if (!__caller) {
    log_error("[GuardTUI] caller number not available — varObj.ani is empty");
    return;
  }

  var __anyUrl =
    __rtBaseUrl +
    __rtEndpointAnyGuard +
    "/" +
    encodeURIComponent(String(__rtConfigId)) +
    "/" +
    encodeURIComponent(__caller) +
    "/0";

  return __guardTuiHttp(__anyUrl, "GET", function (body) {
    if (!__isAffirmative(body)) {
      log_debug("[GuardTUI] caller not allowed for ConfigId=" + __rtConfigId);
      return __rtNextStep_NotAllowed;
    }
    var __getUrl =
      __rtBaseUrl +
      __rtEndpointGetGuard +
      "/" +
      encodeURIComponent(__caller) +
      "/" +
      encodeURIComponent(String(__rtConfigId));
    return jsonHttpRequest(__getUrl, { method: "GET" }, _headers, null)
      .withTimeout(__rtTimeout)
      .then(
        function (r2) {
          if (
            !r2 ||
            r2.success !== true ||
            r2.statusCode < 200 ||
            r2.statusCode >= 300
          ) {
            log_error("[GuardTUI] R2 non-2xx - " + JSON.stringify(r2));
            global[__nextStep] = __rtNextStep_Failure;
            return __rtNextStep_Failure;
          }
          var __record = __parseGuardRecord(r2.body);
          if (!__record) {
            log_error(
              "[GuardTUI] R2 parse failure - " + JSON.stringify(r2.body),
            );
            global[__nextStep] = __rtNextStep_Failure;
            return __rtNextStep_Failure;
          }
          context.session.variables.RTDS_OP_GuardId = __record.id;
          var __nextId =
            __record.active === "1" || __record.active === "true"
              ? __rtNextStep_CurrentlyActive
              : __rtNextStep_CurrentlyInactive;
          global[__nextStep] = __nextId;
          log_debug(
            "[GuardTUI] Check: GuardId=" +
              __record.id +
              " active=" +
              __record.active +
              " -> " +
              __nextId,
          );
          return __nextId;
        },
        function (err) {
          log_error("[GuardTUI] R2 request error - " + JSON.stringify(err));
          global[__nextStep] = __rtNextStep_Failure;
          return __rtNextStep_Failure;
        },
      );
  });
};
```

Open spec issues called out inline above:

- The R1→R2 chaining pattern returns a nested task from within `__guardTuiHttp`'s body callback. Confirm with the runtime owner that `jsonHttpRequest(...).then(... return jsonHttpRequest(...))` chains end-to-end the way `sendSms` would imply. If not, refactor `__guardTuiHttp` to expose a `.thenRequest()`-style continuation or inline R1+R2 without the helper.
- `RTDS_OP_GuardId` is written to session as a way of passing the resolved guardId to the caller flow's re-entry. Naming follows the `RTDS_OP_*` GUI-handoff convention in [RTDS_runtime_spec.md §4.8](references/rtds/docs/RTDS_runtime_spec.md). Confirm this is the right session key (or pick a project-specific name).

---

## 6. PropertiesDefinition

JSON array. Four canonical entries from [conventions.md §5](.claude/skills/vocalls-component-builder/references/conventions.md):

1. `__configJSON` — `text`, multi-line, hint: "Full RTDS GuardTUI Params object as JSON. See spec for field meanings."
2. `__environment` — `environment` control, default `"acc"`.
3. `__nextStep` — `text`, default `"_rtNextStep"`, hint: "Session-variable name that receives the chosen NextStep Id."
4. `__outputVar` — `text`, default `"_rtGuardTuiOutput"`, hint: "Session-variable name that receives the resolved GuardId / status payload for the caller flow."

No operation-specific PropertiesDefinition entries beyond these — every knob is inside `__configJSON`.

---

## 7. Node skeleton

Three-script-node Style A skeleton (per [conventions.md §11](.claude/skills/vocalls-component-builder/references/conventions.md)):

```
input  (id=0,  transient,  Kind=input)
   │  edge id 28
   ▼
init   (id=7,  script)     — reset every __rt* default, call __init(__configJSON), log_debug each
   │  edge id 30
   ▼
script (id=29, script)     — calls __guardTui()
   │  edge id 38
   ▼
output (id=6,  transient,  Kind=output, OnEnter=log_debug('__nextStep=' + global[__nextStep]))
```

**No extra output transients per outcome.** The component reports its outcome via `global[__nextStep]` only; the caller flow decides what to play next based on that step Id. (Adding eight outcome-labelled outputs would be valid Style A but redundant for a step-Id-driven component — sendSms is the precedent of "all branching in `global[__nextStep]`, single output node".)

Optional: emit a multi-output variant if the project wires GuardTUI into a flow that prefers labelled outputs (`allowed`, `not_allowed`, `currently_active`, `currently_inactive`, `deactivate_only_member`, `success`, `failure`). Defer this until the Designer integration is built.

---

## 8. Init-node body

```js
__rtActive = false;
__rtConfigId = -1;
__rtConfigName = "";
__rtAction = "Check";
__rtGuardId = "";
__rtTimeout = 10000;

__rtNextStep = -1;
__rtNextStep_NotAllowed = -1;
__rtNextStep_CurrentlyActive = -1;
__rtNextStep_CurrentlyInactive = -1;
__rtNextStep_DeactivateOnlyMember = -1;
__rtNextStep_Success = -1;
__rtNextStep_Failure = -1;

if (!_headers) {
  _headers = {};
}

__init(__configJSON);

log_debug("[GuardTUI] __configJSON: " + JSON.stringify(__configJSON));
log_debug("[GuardTUI] __environment: " + __environment);
log_debug("[GuardTUI] __rtActive: " + __rtActive);
log_debug("[GuardTUI] __rtConfigId: " + __rtConfigId);
log_debug("[GuardTUI] __rtConfigName: " + __rtConfigName);
log_debug("[GuardTUI] __rtAction: " + __rtAction);
log_debug("[GuardTUI] __rtGuardId: " + __rtGuardId);
log_debug("[GuardTUI] __rtTimeout: " + __rtTimeout);
log_debug("[GuardTUI] __rtNextStep: " + __rtNextStep);
log_debug("[GuardTUI] __rtNextStep_NotAllowed: " + __rtNextStep_NotAllowed);
log_debug(
  "[GuardTUI] __rtNextStep_CurrentlyActive: " + __rtNextStep_CurrentlyActive,
);
log_debug(
  "[GuardTUI] __rtNextStep_CurrentlyInactive: " +
    __rtNextStep_CurrentlyInactive,
);
log_debug(
  "[GuardTUI] __rtNextStep_DeactivateOnlyMember: " +
    __rtNextStep_DeactivateOnlyMember,
);
log_debug("[GuardTUI] __rtNextStep_Success: " + __rtNextStep_Success);
log_debug("[GuardTUI] __rtNextStep_Failure: " + __rtNextStep_Failure);
```

Idempotent reset is intentional (re-entry on same session — see [conventions.md §13 rule 7](.claude/skills/vocalls-component-builder/references/conventions.md)).

---

## 9. Work-node body

Single call:

```js
__guardTui();
```

All logic lives in the master-`Code` helper. The work node stays slim per the sendSms pattern.

---

## 10. Output-node body

```js
log_debug("[GuardTUI] __nextStep: " + global[__nextStep]);
```

---

## 11. Mapping back to the handler — verification table

| Handler step Id(s)                                                | Behaviour                                                                                | Component representation                                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 520, 521                                                          | Set `p_sNextStep = NextStep`, gate on `Active`                                           | `__guardTui` early-return when `!__rtActive`                                                   |
| 531, 530, 532                                                     | Lookup `c_sURLGuardAPI` from structured params; fail to `NextStep_Failure`               | Master `Variables`: `__rtBaseUrl = _rtGuardTuiBaseUrl`; init validates non-empty               |
| 417, 422, 423, 425, 483                                           | Fetch `sCallingPartyNumber`, `sLanguage`, `sPromptSource`, `sConfigName` from call attrs | `__getCallerNumber` reads `varObj.ani` (others dropped: not used by component logic)           |
| 437 (R1)                                                          | GET `AnyGuardWithPhoneNumberAndConfig`                                                   | `__guardTui` "Check" branch, first `__guardTuiHttp`                                            |
| 449                                                               | `StrEqlNoCase(sResponseBody, "true")`                                                    | `__isAffirmative(body)`                                                                        |
| 467 ("Not allowed" TTS)                                           | Plays disallowed message, disconnects                                                    | `NextStep_NotAllowed` — caller flow plays + disconnects                                        |
| 457 (R2)                                                          | GET `GetGuardByPhoneNumberAndConfig`                                                     | Inner `jsonHttpRequest` in the R1 `.then` callback                                             |
| 427 (JSON parse)                                                  | Splits into `lsNamesList1`, `lsValuesList1`                                              | `__parseGuardRecord` (single normalised object)                                                |
| 474, 479                                                          | `Active?` condition on `lsValuesList1[active]`                                           | record.active equality check                                                                   |
| 480, 487 (currently active TTS)                                   | Plays "currently active" + "press 3"                                                     | `NextStep_CurrentlyActive` — caller flow handles prompt+DTMF                                   |
| 476, 488 (currently inactive TTS)                                 | Plays "currently inactive" + "press 7"                                                   | `NextStep_CurrentlyInactive`                                                                   |
| 482, 484, 489, 490, 491, 492                                      | DTMF collect + Selection                                                                 | **Out of component scope** — caller flow handles                                               |
| 493→497 (Disable / R3)                                            | POST `Disable/{id}`                                                                      | `__guardTui` "Deactivate" branch                                                               |
| 495                                                               | Branch on R3 body `"true"` vs `"false"`                                                  | Body-checker selects `NextStep_Success` / `NextStep_DeactivateOnlyMember` / `NextStep_Failure` |
| 512 (only-member TTS)                                             | Plays "only active member"                                                               | `NextStep_DeactivateOnlyMember`                                                                |
| 513 (deactivated TTS)                                             | Plays "deactivated"                                                                      | `NextStep_Success`                                                                             |
| 514, 517, 518, 536 (technical issue TTS)                          | All HTTP/parse failure exit paths                                                        | `NextStep_Failure` (caller flow plays generic failure message)                                 |
| 494→502 (Activate / R4)                                           | POST `Activate/{id}`                                                                     | `__guardTui` "Activate" branch                                                                 |
| 504                                                               | Branch on R4 body `"true"`                                                               | `NextStep_Success` or `NextStep_Failure`                                                       |
| 516 (activated TTS)                                               | Plays "activated"                                                                        | `NextStep_Success`                                                                             |
| 524 (assign `p_sNextStep = NextStep_Success`)                     | Final assignment                                                                         | `global[__nextStep] = __rtNextStep_Success` in body-checker                                    |
| 519, 527, 534, 535, 533 (assign `p_sNextStep = NextStep_Failure`) | Final assignment on every failure                                                        | `global[__nextStep] = __rtNextStep_Failure` in error callbacks                                 |

Every handler step is either represented in the component or explicitly delegated to the caller flow (DTMF, TTS).

---

## 12. Decisions left open

User decisions captured during planning:

- **Invocation model:** Re-entry. Component is stateless; the caller flow drives prompts and DTMF, re-invoking the component with `Action="Activate"` or `"Deactivate"` after the user presses a key.
- **Endpoint shape:** Four separate endpoint vars (`_rtGuardTuiEndpointAnyGuard`, `_rtGuardTuiEndpointGetGuard`, `_rtGuardTuiEndpointActivate`, `_rtGuardTuiEndpointDisable`).
- **Output style:** Single output node; outcomes reported via `global[__nextStep]` only.
- **Caller number:** Read from `varObj.ani` (confirmed against [projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js:930](projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js#L930) and [projects/demo/callScripts/main.js:129](projects/demo/callScripts/main.js#L129)).

Still open before XML generation:

1. **`RTDS_OP_GuardId` session-key name.** The component writes the resolved guardId back to session so the caller flow can pass it on the re-entry "Activate"/"Deactivate" call. Pick a name; default suggestion is `RTDS_OP_GuardId`. Alternative: write to `varObj.guardId` to match the `varObj.ani` convention.
2. **Timeout units.** Spec normalises to milliseconds. Confirm — the handler used seconds. The sendSms component already uses ms.
3. **R1→R2 task chaining.** §5.4 returns a nested `jsonHttpRequest(...)` task from inside a `.then` callback. Confirm the Vocalls runtime honours this chaining the same way `sendSms` would imply; if not, refactor to inline R1+R2 without `__guardTuiHttp`.

---

## 13. Verification (when the component is later generated from this spec)

This spec is the **input contract** for the generation step. To verify a generated XML against this spec:

1. Open the generated `references/rtds/components/guardTui.js` in the Vocalls Designer and confirm:
   - Master layer carries the attribute set from [conventions.md §2](.claude/skills/vocalls-component-builder/references/conventions.md) with the values from §4 above.
   - `Code` decodes to the variable bank from §5.1 + the five canonical helpers + the three operation-specific helpers (§5.3) + `__guardTui` (§5.4).
   - `PropertiesDefinition` shows the four entries from §6 in the property pane.
   - Three nodes (`input`/`init`/`script`/`output` with ids `0`, `6`, `7`, `29`) and three edges (`28`, `30`, `38`).
2. Run `npm run validate` to confirm ES5.1 compliance for the embedded JS.
3. Build a minimal simulator scenario in [projects/demo/callScripts/](projects/demo/callScripts/) that:
   - Hits `Action="Check"` against a known caller number + ConfigId, mocks R1+R2, asserts `global[__nextStep] === __rtNextStep_CurrentlyActive`.
   - Hits `Action="Activate"` with the resolved GuardId, mocks R4 returning `"true"`, asserts `__rtNextStep_Success`.
   - Hits `Action="Deactivate"` with R3 returning `"false"`, asserts `__rtNextStep_DeactivateOnlyMember`.
4. Run `npm run simulate` and inspect the log lines (every `[GuardTUI]` trace from §8 + the four expected per-branch log lines) match.
