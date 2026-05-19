# Component XML Quality Instructions

Reference: hand-crafted `nalOktaAuth.xml` (the source pasted in chat).
Subject: my generated component files (`getFirstOperation.xml`, `condition.xml`, `checkAttribute.xml`, `flowJump.xml`, `IVRLogging.xml`, `disconnect.xml`, `workgroupTransfer.xml`).

This document lists every concrete deviation I observed and the exact rule to apply next time so my output matches the reference quality.

---

## 1. Master layer (`vocalls-master-layer`) attributes

**What the reference does**

The reference master layer carries only the attributes Vocalls actually uses for a component:

```
<object label=""
  MaxEntryCount=""
  MaxEntryNodeId=""
  SpeechRecognitionEngine=""
  Code="..."
  Extensions=""
  BackgroundNoise="true"
  BreathInEffect="true"
  Languages="{...}"
  Variables="..."
  HintGrammar=""
  EnableUpdateRelations="true"
  AllowGlobalIntent="false"
  Translations=""
  ManualId=""
  LastLanguage="default"
  PropertiesDefinition="[...]"
  Sections="[]"
  id="vocalls-master-layer">
```

**What I did wrong**

I emitted a fabricated set of attributes (`DefaultLanguage`, `LanguageKey`, `DefaultVoice`, `SayAgainNodeId`, `SpeechSyntEngine`, `VoicePitch`, `VoiceSpeed`, `VoiceVolume`, `AudioSourceUrl`, `PreferredAudio="TTS"`) and I omitted the ones that belong (`HintGrammar`, `EnableUpdateRelations`, `AllowGlobalIntent`, `Translations`, `ManualId`, `LastLanguage`, `PropertiesDefinition`).

**Rule**

Master-layer attribute set must be exactly:
`label, MaxEntryCount, MaxEntryNodeId, SpeechRecognitionEngine, Code, Extensions, BackgroundNoise, BreathInEffect, Languages, Variables, HintGrammar, EnableUpdateRelations, AllowGlobalIntent, Translations, ManualId, LastLanguage, PropertiesDefinition, Sections, id`.

Defaults:
- `BackgroundNoise="true"`, `BreathInEffect="true"`, `EnableUpdateRelations="true"`, `AllowGlobalIntent="false"`, `LastLanguage="default"`, `Sections="[]"`.
- `Languages` is a single-language stub if no extra languages are defined: `{'nl':{'isDefault':true,'languageName':'','ttsLanguageCode':'','ttsVoiceName':'','ttsEngine':'','ttsPitch':'','ttsSpeed':'','ttsVolume':'','prosodyBaseEnabled':true,'prosodyContourEnabled':false}}`. Do not invent `nl-NL-Wavenet-A` / Google unless the user asks.

---

## 2. Master-layer `Code` attribute is for component-wide globals

**What the reference does**

The master layer's `Code` attribute holds globals shared across all script nodes in the component:

```
makeQueryString = function (object) { ... };
_headers = {};
_apiToken = null;
__retries = 0;
```

These are declared once at component scope, then read/written by individual script nodes.

**What I did wrong**

I left `Code=""` empty on the master layer and inlined every helper inside each script node, duplicating logic.

**Rule**

If two or more script nodes need the same helper or shared state variable, declare it in the master-layer `Code` attribute. Per-node `Code` should only contain logic specific to that node. Use single-underscore (`_name`) for shared mutable globals and double-underscore (`__name`) for component-internal config / state.

---

## 3. Master-layer `Variables` and `PropertiesDefinition`

**What the reference does**

`Variables` declares component variables with default values:

```
__retriesOnFailure = 1;
__tokenUrl = "https://...";
__clientIdAcc = "...";
__environment = "acc";
__forceTokenReload = false;
```

`PropertiesDefinition` is a JSON array describing how those variables are surfaced in the Designer property pane (control type, default, options, hint).

**What I did wrong**

`Variables=""` and `PropertiesDefinition` absent on every component I generated.

**Rule**

For every component, populate `Variables` with the configuration knobs the consumer can override (one assignment per line, `name = value;`), and emit a matching `PropertiesDefinition` JSON array entry per variable that should be configurable in the GUI. Use `controlSettings.controlType = "dropdown"` for enums, `"text"` for free strings, `"number"` for integers.

---

## 4. Element `id` values must be plain numeric strings

**What the reference does**

All node and edge ids are integers as strings: `"0"`, `"10"`, `"14"`, `"32"`, `"35"`. Edges reference `source="0"` / `target="32"` etc.

**What I did wrong**

I used semantic ids: `id="n-input"`, `id="n-collect"`, `id="e-input-collect"`. This works in mxGraph but is not the convention Vocalls Designer emits, and it makes the diff between hand-edited and machine-generated files noisy.

**Rule**

Use bare numeric ids for `<object>` and `<mxCell>` elements. Start at `0` for the input, increment as nodes are added. Edges get their own numeric ids. Do not prefix with `n-` or `e-`.

---

## 5. Edges are bare `<mxCell>` elements without `startArrow`

**What the reference does**

```
<mxCell id="34"
  style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
  parent="baselayer" source="0" target="32" edge="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

No `startArrow=oval;startFill=1;strokeColor=#000000` decoration. No `entryX`/`entryY` unless the edge actually enters at a non-default port.

**What I did wrong**

Every edge I emitted carried `startArrow=oval;startFill=1;strokeColor=#000000;` and a full `entryX/entryY/entryDx/entryDy` quadruple even when the entry was the default top-center.

**Rule**

Default edge style is exactly:
`edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=<x>;exitY=<y>;exitDx=0;exitDy=0;`
Add `entryX`/`entryY` only when overriding the default port. Never add `startArrow`, `startFill`, or `strokeColor` to edges.

---

## 6. Script node style: no `arcSize=8`

**What the reference does**

Script node style:
```
rounded=1;fontSize=12;glass=0;shadow=0;fillColor=#FFFFFF;strokeColor=#999999;;fontColor=#4D4D4D;
fontStyle=0;labelBackgroundColor=none;labelBorderColor=none;html=1;spacingTop=0;perimeterSpacing=0;
fontFamily=Verdana;FType=g;horizontal=1;align=center;labelPosition=center;verticalLabelPosition=middle;
verticalAlign=middle;dashed=1;image=/Content/Designer/Icons/script.svg;imageAlign=center;
imageVerticalAlign=top;imageWidth=24;imageHeight=24;allowArrows=0;rotatable=0;overflow=hidden;
```

Note: no `arcSize=8`, no `strokeWidth=1`.

**What I did wrong**

Every script node carried `arcSize=8` and `strokeWidth=1`.

**Rule**

Drop `arcSize=8` and `strokeWidth=1` from script node styles. Use the reference style verbatim.

---

## 7. Script node geometry

**What the reference does**

Script nodes are `168 x 80` (width x height) and laid out in a vertical column at `x=305` with `y` stepping by ~150–160 units.

**What I did wrong**

I used `175 x 80` and varying widths (`225` for nodes with longer code), and I placed nodes at `x=288` or `x=263`.

**Rule**

Default script node size = `168 x 80`. Default x = `305`. Step y by 150 between consecutive scripts. Only widen if the label genuinely needs it; never widen because the code body is long (the body lives in `Code=`, not on the canvas).

---

## 8. Case (swimlane) layout

**What the reference does**

Case swimlane:
- container: `170 x 126` (or `160 x 126` for counters)
- icon child: `width=150, height=40, x=10, y=16` (or `140 x 40` for counters)
- expression / default child: `width=150, height=30, x=10, y=56` then `y=86`

**What I did wrong**

I used `180 x 126` containers with `160 x 40` icon and `160 x 30` rows.

**Rule**

Case container = `170 x 126`. Children use `150` wide. Counter container = `160 x 126`, children `140` wide.

---

## 9. Counter element

**What the reference does**

The reference uses a `Type="counter"` swimlane to retry the token request. Its `OnLeave` is `__retries++` and the case child is an expression like `>= __retriesOnFailure` whose default branch loops back into the script chain.

**What I did wrong**

I did not produce any counter-based retry pattern in any component. Where the design called for retry semantics (e.g. RESTRequest handlers), I either omitted the loop or expressed it as a plain conditional.

**Rule**

When a component or handler needs retry semantics, model it with a `Type="counter"` swimlane, increment in `OnLeave`, branch with an expression child against the configured retry-count variable, and route the default branch back into the work it should retry.

---

## 10. Two distinct script-style colour palettes

**What the reference does**

The reference uses one palette consistently for working scripts: `fillColor=#FFFFFF`, `strokeColor=#999999`, `fontColor=#4D4D4D`. The transient input/output uses a second palette: `fillColor=#f5f5f5`, `strokeColor=#666666`, `fontColor=#333333`.

**What I did wrong**

This is one of the few things I got right — but I was inconsistent in `setvar` styling, where I reused the script palette without thinking.

**Rule**

Script + setvar nodes: white-on-grey (`#FFFFFF` / `#999999` / `#4D4D4D`).
Transient input/output nodes: light-grey-on-darker-grey (`#f5f5f5` / `#666666` / `#333333`).
Case + counter swimlanes: `#FFFFFF` / `#999999` / `#4D4D4D` (same as script).

---

## 11. Transient I/O nodes carry minimal attributes

**What the reference does**

```
<object label="input" Type="transient" OnEnter="" OnLeave=""
  MaxEntryCount="" MaxEntryNodeId="" DynamicNextId=""
  Title="input" Kind="input" id="0">
```

That's it. No `Parameters` attribute on inputs. Outputs may carry a `Parameters` attribute when they expose values to the caller.

**What I did wrong**

I sometimes added `Parameters=""` to inputs (it should only appear on outputs that publish values), and I sometimes used a long descriptive `label` like `RTDS_OP_*` where the reference uses simply `input`.

**Rule**

Input transient label = `"input"`. Output transient label = the symbolic outcome name (`"getTokenSuccess"`, `"getTokenFailure"`, `"error"`, `"true"`, `"false"`, `"workgroup_transfer"`, etc.). `Title` matches `label`. Add `Parameters` only on outputs and only when values are published to the caller.

---

## 12. Output `OnEnter` does meaningful work

**What the reference does**

Outputs set status flags that the caller will read:

```
OnEnter="_validToken = true;
log_debug('nalOktaAuth: token retrieved');"
```

**What I did wrong**

My outputs had `OnEnter=""` everywhere. The status of the call (success/failure code) was set in a separate upstream script node, leaving the output node as pure decoration.

**Rule**

When a component reports outcome to its caller, set the outcome flag in the output node's `OnEnter` and log a one-line debug message there. That keeps the outcome co-located with the exit point.

---

## 13. Logging style

**What the reference does**

Every log line starts with the component name and a colon: `'nalOktaAuth: ...'`. No bracket prefix.

**What I did wrong**

I used bracketed `'[RTDS] ...'` everywhere. Both styles are defensible, but they should match across the codebase. The project instructions say `[RTDS]` for runtime code, but the reference component uses the unbracketed `nalOktaAuth: ` style.

**Rule**

Inside RTDS runtime script nodes (the operation handlers): keep `[RTDS]` per project instructions.
Inside reusable scripted components (auth helpers, retry harnesses, etc.): use the unbracketed `componentName: ` style to match the existing fleet.

---

## 14. Code attribute formatting

**What the reference does**

Lines inside `Code="..."` are separated by ` &#xa;` (space + entity) per the existing memory note. Long blocks read top-to-bottom in Monaco. The reference also uses:
- 4-space indentation inside functions
- braces on the same line as the conditional
- single quotes in string literals where possible (escaped as `&apos;` in XML)
- explicit `JSON.parse` / `JSON.stringify` rather than direct property assignment

**What I did wrong**

Got this mostly right (followed the `&#xa;` rule), but I used `&quot;` everywhere instead of `&apos;` for inner strings, which makes the escaped XML noisier than necessary. The reference prefers `&apos;` for JS string literals, reserving `&quot;` for legitimately-double-quoted content.

**Rule**

Default JS string quote = single quote, encoded as `&apos;` in the XML attribute. Use `&quot;` only for property names in JSON-shaped string literals or where a single quote appears inside the string.

---

## 15. Script body conventions

**What the reference does**

- Top of script: declare locals with `var`.
- Use `Object.prototype.hasOwnProperty.call(obj, key)` for safe property checks (defined once as a local helper if used twice).
- Async work returns the task: `return httpRequest(...).then(function(result) { ... }, function(err) { ... });`.
- Both the success and failure callbacks of `.then(...)` are populated.
- Errors are logged with `log_error(name + ': ...' + JSON.stringify(err))` not just the message.

**What I did wrong**

I wrote `.then(function(response) { ... })` with no failure callback. I never used `Object.prototype.hasOwnProperty.call`. I logged `err.message` instead of the full serialized object.

**Rule**

For every `httpRequest` (or any task that can fail): supply both `success` and `error` callbacks to `.then(...)`. Log errors with `JSON.stringify(err)` so the full payload survives. Use `Object.prototype.hasOwnProperty.call(obj, key)` for guard checks instead of `key in obj` or `obj[key] !== undefined` when the source of the object is untrusted (network, storage).

---

## 16. Storage integration

**What the reference does**

Uses `Storage.readFile(name)` / `Storage.writeFile(name, jsonString)` to cache cross-call state (token, env tag) in component scope.

**What I did wrong**

My components have no persistence layer at all. Anywhere the runtime has cross-call state (e.g. operation index, last sourceId), I store it in `context.session.variables` only — which is per-call.

**Rule**

For cross-call persistence inside a component: serialise via `JSON.stringify`, write with `Storage.writeFile(name, ...)`, and read back with `Storage.readFile(name)` guarded by a try/catch. Tag every stored object with the environment so an env switch invalidates the cache.

---

## 17. Environment handling

**What the reference does**

Reads `__environment` (a component variable), normalises with `.toLowerCase()` / `.toUpperCase()` at the boundary, maps `dvp` → `acc`, and uses the env tag both in the URL and in the cache key.

**What I did wrong**

No environment-awareness anywhere in my components. Every URL is hardcoded.

**Rule**

Every component that talks to an external service must accept an `__environment` variable, map it to per-env config (URLs, client IDs, secrets), and tag any cached artefacts with the active env.

---

## 18. Comments

**What the reference does**

Sparse, terse JSDoc-style comments on shared helpers (`makeQueryString`). Inline `//` comments only at the top of a script node to label its intent. No block-comment headers like `// ============ NODE 32: ... ============`.

**What I did wrong**

I emitted ASCII art header comments (`// ============================================`) on most script nodes. Noisy, redundant with the node label, and inconsistent with the reference style.

**Rule**

Script node `Code` opens with at most a one-line `//` comment describing intent. No banners. Helper functions get JSDoc only when their signature is non-obvious.

---

## 19. XML formatting overall

**What the reference does**

Compact: one `<mxCell>` or one `<object>` per line. Attributes on a single line, no wrapping. No XML comments anywhere.

**What I did wrong**

Multi-line attribute layout, `<!-- EDGES -->` / `<!-- NODES -->` banner comments, and per-edge XML comments explaining what each edge connects.

**Rule**

Match the reference's compact single-line element style. No XML comments. Whitespace between elements is acceptable; banner comments are not.

---

## 20. File structure summary (reference shape)

```
<?xml version="1.0" encoding="UTF-8"?>   (optional — reference omits)
<mxGraphModel ...>
  <root>
    <object label="" ...all master-layer attrs... id="vocalls-master-layer">
      <mxCell />
    </object>
    <mxCell id="baselayer" parent="vocalls-master-layer" />
    <mxCell id="<edge-id>" style="..." parent="baselayer" source="<id>" target="<id>" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    ... more edges ...
    <object label="..." Type="transient|script|case|counter|setvar"
      ...node-specific attrs... id="<numeric-id>">
      <mxCell style="..." parent="baselayer" vertex="1">
        <mxGeometry x="..." y="..." width="..." height="..." as="geometry" />
      </mxCell>
    </object>
    ... more nodes ...
    <!-- For case/counter swimlanes, child rows are <object> with parent="<swimlane-id>" -->
  </root>
</mxGraphModel>
```

Edges first, then nodes. No extra wrapping, no comments.

---

## Quick checklist (paste at top of next component)

1. Master layer carries the canonical 19 attributes with reference defaults; `Code`, `Variables`, `PropertiesDefinition` populated.
2. All ids are bare numeric strings.
3. Edges: orthogonal style only, no `startArrow`, no superfluous entry coords, bare `<mxCell>`.
4. Script nodes: `168 x 80`, no `arcSize=8` / `strokeWidth=1`, x=305 column with y step 150.
5. Case = `170 x 126` / children `150` wide. Counter = `160 x 126` / `140` wide.
6. Outcome flags set in output node `OnEnter`, not in upstream scripts.
7. Logs prefixed `componentName: ` (or `[RTDS]` for runtime handlers — match the layer).
8. JS strings encoded as `&apos;` in XML attributes; `Code` lines separated by ` &#xa;`.
9. Async: both success and error `.then()` callbacks present; serialise errors with `JSON.stringify`.
10. Cross-call state via `Storage.readFile` / `Storage.writeFile`, env-tagged.
11. Component variables surfaced in `Variables` + `PropertiesDefinition`.
12. No banner comments, no XML comments, single-line elements.
