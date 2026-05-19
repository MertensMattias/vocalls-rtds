# Pre-delivery checklist

Run through every item before handing the generated XML back to the user. Each item is a concrete check, not a vibe — if the answer isn't a clean yes, fix the file.

## Master layer

- [ ] `id="vocalls-master-layer"`.
- [ ] Attribute set (in order): `label, MaxEntryCount, MaxEntryNodeId, SpeechRecognitionEngine, Code, Extensions, BackgroundNoise, BreathInEffect, Languages, Variables, PropertiesDefinition, EnableUpdateRelations, AllowGlobalIntent, Translations, ManualId, RequiredVariables, HintGrammar, LastLanguage, InfoAboutUser_en, CompanyInformation_en, GeneralKnowledge_en, Translations_en, id`.
- [ ] `BackgroundNoise="true"`, `BreathInEffect="true"`, `EnableUpdateRelations="true"`, `AllowGlobalIntent="false"`, `LastLanguage="default"`.
- [ ] `Languages` contains exactly one language stub keyed by the default language code; voice fields may be empty.
- [ ] The `<object>` contains one empty `<mxCell />`.
- [ ] Immediately followed by `<mxCell id="baselayer" parent="vocalls-master-layer" />`.

## Master `Code`

- [ ] All `__rt<Key>` and `__rt<TypePrefix><Key>` variables for the operation are declared with default values.
- [ ] The five canonical helpers are present in order: `__makeLocalNodeId`, `__resolveTemplate`, `__extractParams`, `__setupConfig`, `__init`.
- [ ] The `__init` helper uses the correct TypePrefix for this operation (e.g. `__rtSms` for SendSMS), not the literal string `__rtTypePrefix`.
- [ ] Operation-specific helpers (e.g. `__isMobileNumber`) follow the helpers, before the work function.
- [ ] The work function is `__<componentName> = function () { ... };`.
- [ ] No `function name(...) {}` declarations anywhere.
- [ ] No `var __name = function...` declarations — bare assignment only.
- [ ] All locals inside functions use `var`.
- [ ] **Every function declaration carries a JSDoc block** (`/** ... */` with description + `@param` for each argument + `@returns`). This applies to canonical helpers, operation-specific helpers, and the per-component work function. No exemption for "trivial" signatures.

## Master `Variables`

- [ ] `__configJSON = { ... };` carries placeholder defaults that match the operation's Params schema.
- [ ] `__environment = environment;`
- [ ] Operation-specific references to system globals where applicable (e.g. `__rtSmsBaseUrl = _rtSmsBaseUrl;`).
- [ ] No working/runtime variables declared here (those live in master `Code`).

## Master `PropertiesDefinition`

- [ ] The four canonical entries are present: `__configJSON`, `__environment`, `__nextStep`, `__outputVar`.
- [ ] Each entry carries `name`, `title`, `hint`, and `controlSettings` with `controlType`, `dataType`, `readonly`, and (where appropriate) `defaultValue` / `maxLength`.
- [ ] `__environment` uses `controlType: "environment"` with `defaultValue: "acc"`.

## Nodes

- [ ] `input` is `<object label="input" Type="transient" ... Title="input" Kind="input" id="0">` with style `transientNode` and geometry `130 x 40`.
- [ ] `output` is `<object label="output" Type="transient" ... Title="output" Kind="output" id="6">` with `OnEnter` that does work (`log_debug('__outputVar: ' + __outputVar)` at minimum).
- [ ] `init` is `<object label="init" Type="script" id="7">` with style `scriptNode` and geometry `168 x 80` at `x=233.5`.
- [ ] `script` is `<object label="script" Type="script" id="29">` with style `scriptNode` and geometry `168 x 80` at `x=233.5, y=180`.
- [ ] All ids are bare numeric strings (`"0"`, `"6"`, `"7"`, `"29"`).
- [ ] No `arcSize=8`, `strokeWidth=1` on any style attribute.
- [ ] For multi-outcome components, one extra `output` transient per outcome (`true`, `false`, `success`, `failure`, ...) with outcome flag set in `OnEnter`.

## Edges

- [ ] Bare orthogonal style: `edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;`.
- [ ] `entryX/entryY` only when overriding the default top-center entry (typically just on edge `28`, input→init).
- [ ] No `startArrow`, `startFill`, `strokeColor` anywhere.
- [ ] Edge ids are bare numeric strings.
- [ ] `source` and `target` reference `<object>` ids, not inner `<mxCell>` ids.

## Init node `Code`

- [ ] Re-declares every `__rt*` variable with its default value at the top (idempotent reset).
- [ ] Guards `_headers`: `if (!_headers) { _headers = {}; }`.
- [ ] Calls `__init(__configJSON);`.
- [ ] Logs every resolved `__rt*` value via `log_debug`.

## Script node `Code`

- [ ] Pre-assigns the default outcome: `global[_rtNextStep] = __rtNextStep;` (or `global[__nextStep] = __rtNextStep;`).
- [ ] Guards `__rtActive` (`if (!__rtActive) { log_debug(...); return; }`).
- [ ] Guards required Params (presence + format).
- [ ] Sets failure default before any external call: `global[_rtNextStep] = __rtNextStep_Failure;`.
- [ ] Uses `jsonHttpRequest(url, { method }, _headers, payload).withTimeout(ms).then(success, error)` for HTTP work.
- [ ] BOTH `.then(success, error)` callbacks populated.
- [ ] Success branch checks `result.success === true && result.statusCode >= 200 && result.statusCode < 300`.
- [ ] All error logs use `JSON.stringify(err)`.
- [ ] Returns the work task (so Vocalls observes the resolution).

## XML encoding

- [ ] No `<?xml ... ?>` header (the example omits it).
- [ ] Newlines inside `Code=""` attribute encoded as `&#xa;`.
- [ ] JS string quotes encoded as `&apos;`; XML attribute boundaries use `"` (encoded as `&quot;` when nested).
- [ ] `<`, `>`, `&` escaped throughout attribute values.
- [ ] One element per line; no multi-line attribute layouts.
- [ ] No XML comments (`<!-- -->`).
- [ ] No banner separators inside JS code (`// =========`).

## Naming

- [ ] `__name` for component-scope variables and functions.
- [ ] `_name` for system-scope globals referenced (e.g. `_headers`, `_rtSmsBaseUrl`, `_nextStep`, `_rtNextStep`).
- [ ] `name` (no prefix) for applica