<mxGraphModel
  dx="3233"
  dy="2302"
  grid="1"
  gridSize="10"
  guides="1"
  tooltips="1"
  connect="1"
  arrows="1"
  fold="1"
  page="1"
  pageScale="1"
  pageWidth="850"
  pageHeight="1100"
>
  <root>
    <object
      label=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      SpeechRecognitionEngine=""
      Code='__rtParams = {};&#xa;&#xa;/**&#xa; * Replaces the last &apos;-&apos;-separated segment of context.currentNode.id with the supplied nodeId.&#xa; * Returns the original nodeId untouched when context.currentNode.id is not set.&#xa; *&#xa; * @param {string|number} nodeId - The short id to splice into the current node path.&#xa; * @returns {string} The fully-qualified node id, or the original nodeId if no path is set.&#xa; */&#xa;__makeLocalNodeId = function (nodeId) {&#xa;    if (nodeId !== null &amp;&amp; nodeId !== undefined) nodeId = nodeId.toString();&#xa;    if (!context.currentNode.id) return nodeId;&#xa;    var __separator = &apos;-&apos;;&#xa;    var __output = context.currentNode.id.split(__separator);&#xa;    __output[__output.length - 1] = nodeId;&#xa;    return __output.join(__separator);&#xa;};&#xa;&#xa;/**&#xa; * Normalises operation config: JSON string -&gt; parsed; { Params: {...} } -&gt; Params; flat object -&gt; itself; null -&gt; {}.&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Flat Params object, never null.&#xa; */&#xa;__extractParams = function (config) {&#xa;    var __parsed = typeof config === &apos;string&apos; ? JSON.parse(config) : config;&#xa;    if (__parsed &amp;&amp; typeof __parsed.Params === &apos;object&apos; &amp;&amp; __parsed.Params !== null) return __parsed.Params;&#xa;    return __parsed || {};&#xa;};&#xa;&#xa;/**&#xa; * Resolves Params into a flat { Key: value } map, preserving the operator&apos;s JSON value types.&#xa; * Booleans, numbers, null, arrays and objects pass through untouched. Only string values are&#xa; * trimmed and have ${name} placeholders substituted against `global` (bare names only; no&#xa; * expressions). Unresolved placeholders are left raw and logged at warn level. Substitution&#xa; * uses String.prototype.replace — no `new Function`, no `eval` — because the Vocalls runtime&#xa; * disables string-eval.&#xa; *&#xa; * Special-cased coercions:&#xa; *   - Active   -&gt; Boolean (never substituted).&#xa; *   - ConfigId -&gt; Number (falls back to -1 on NaN/empty).&#xa; *   - Timeout  -&gt; Number (falls back to 10000 on empty).&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Map of Key -&gt; resolved value (no __rt prefix; v2 shape).&#xa; */&#xa;__setupConfig = function (config) {&#xa;    var __params = __extractParams(config);&#xa;    var __result = {};&#xa;    __result.Active = typeof __params.Active === &apos;boolean&apos; ? __params.Active : Boolean(__params.Active);&#xa;    var __keys = Object.keys(__params);&#xa;    for (var __i = 0; __i &lt; __keys.length; __i++) {&#xa;        var __key = __keys[__i];&#xa;        if (__key === &apos;Active&apos;) continue;&#xa;        var __value = __params[__key];&#xa;        if (typeof __value === &apos;string&apos;) {&#xa;            __value = __value.trim();&#xa;            if (__value.indexOf(&apos;${&apos;) !== -1) {&#xa;                __value = __value.replace(/\$\{(\w+)\}/g, function (__match, __name) {&#xa;                    if (global.hasOwnProperty(__name)) { return String(global[__name]); }&#xa;                    Logger.warn(&apos;[__setupConfig] unresolved placeholder&apos;, { key: __key, placeholder: __name });&#xa;                    return __match;&#xa;                });&#xa;            }&#xa;        }&#xa;        if (__key === &apos;ConfigId&apos;) __value = Number(__value) || -1;&#xa;        else if (__key === &apos;Timeout&apos;) __value = (__value === &apos;&apos; || __value === null || __value === undefined) ? 10000 : Number(__value);&#xa;        __result[__key] = __value;&#xa;    }&#xa;    return __result;&#xa;};&#xa;&#xa;// --- v2 object-access helpers ---&#xa;// Declared with `typeof &lt;name&gt; === &apos;undefined&apos;` guards so they fall back to local definitions&#xa;// when rtds_globalCodeAndHelpers.js has not yet been updated to expose them.&#xa;&#xa;if (typeof getValue === &apos;undefined&apos;) {&#xa;    /**&#xa;     * Returns the value of `key` from `obj`, or `defaultValue` if the key is absent.&#xa;     * Case-insensitive lookup: matches whichever own property name lowercases to the same string.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getValue = function (obj, key, defaultValue) {&#xa;        if (!obj || !key) return defaultValue;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return obj[__propertyName];&#xa;            }&#xa;        }&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof walk === &apos;undefined&apos;) {&#xa;    /**&#xa;     * Iterates own properties of `obj`, calling fn(key, value) for each.&#xa;     * Returning false from fn stops the walk. Preserves casing (write-side helper).&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {function} fn&#xa;     * @returns {void}&#xa;     */&#xa;    walk = function (obj, fn) {&#xa;        if (!obj) return;&#xa;        for (var __key in obj) {&#xa;            if (!obj.hasOwnProperty(__key)) continue;&#xa;            if (fn(__key, obj[__key]) === false) return;&#xa;        }&#xa;    };&#xa;}'
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&apos;nl&apos;:{&apos;isDefault&apos;:true,&apos;languageName&apos;:&apos;Dutch (Belgium)&apos;,&apos;ttsLanguageCode&apos;:&apos;nl-BE&apos;,&apos;ttsVoiceName&apos;:&apos;&apos;,&apos;ttsEngine&apos;:&apos;&apos;,&apos;ttsPitch&apos;:&apos;&apos;,&apos;ttsSpeed&apos;:&apos;&apos;,&apos;ttsVolume&apos;:&apos;&apos;,&apos;prosodyBaseEnabled&apos;:true,&apos;prosodyContourEnabled&apos;:false}}"
      Variables='__configJSON = {&#xa;    &quot;Active&quot;: true,&#xa;    &quot;LogAttributes&quot;: &quot;RTDS_ProjectName|Eic_RemoteId|ATTR_RoutingId&quot;,&#xa;    &quot;CallflowId&quot;: &quot;LPA_ICT_HELPDESK&quot;,&#xa;    &quot;RoutingId&quot;: &quot;LPA_ICT_HELPDESK&quot;,&#xa;    &quot;IVREvent&quot;: 9999,&#xa;    &quot;IVRAction&quot;: &quot;CT&quot;,&#xa;    &quot;IsHelpdeskCall&quot;: true,&#xa;    &quot;NextStep&quot;: &quot;00001&quot;&#xa;};&#xa;__environment = environment;&#xa;__rtNextStep &amp;= _rtNextStep;'
      PropertiesDefinition='[&#xa;    {&#xa;        &quot;name&quot;: &quot;__configJSON&quot;,&#xa;        &quot;title&quot;: &quot;Operation config (JSON)&quot;,&#xa;        &quot;hint&quot;: &quot;Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.&quot;,&#xa;        &quot;controlSettings&quot;: {&#xa;            &quot;controlType&quot;: &quot;text&quot;,&#xa;            &quot;maxLength&quot;: 5000,&#xa;            &quot;dataType&quot;: &quot;string&quot;,&#xa;            &quot;readonly&quot;: false&#xa;        }&#xa;    },&#xa;    {&#xa;        &quot;name&quot;: &quot;__environment&quot;,&#xa;        &quot;title&quot;: &quot;Environment&quot;,&#xa;        &quot;hint&quot;: &quot;Deployment environment. Controls which RTDS API endpoint is called.&quot;,&#xa;        &quot;controlSettings&quot;: {&#xa;            &quot;controlType&quot;: &quot;text&quot;,&#xa;            &quot;defaultValue&quot;: &quot;environment&quot;,&#xa;            &quot;maxLength&quot;: 100,&#xa;            &quot;dataType&quot;: &quot;string&quot;,&#xa;            &quot;readonly&quot;: false&#xa;        }&#xa;    },&#xa;    {&#xa;        &quot;name&quot;: &quot;__nextStep&quot;,&#xa;        &quot;title&quot;: &quot;Next step (output variable name)&quot;,&#xa;        &quot;hint&quot;: &quot;Name of the session variable that will receive the next step Id after execution.&quot;,&#xa;        &quot;controlSettings&quot;: {&#xa;            &quot;controlType&quot;: &quot;text&quot;,&#xa;            &quot;defaultValue&quot;: &quot;_rtNextStep&quot;,&#xa;            &quot;maxLength&quot;: 100,&#xa;            &quot;dataType&quot;: &quot;string&quot;,&#xa;            &quot;readonly&quot;: false&#xa;        }&#xa;    }&#xa;]'
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      Translations=""
      ManualId=""
      RequiredVariables=""
      HintGrammar=""
      LastLanguage="default"
      InfoAboutUser_en=""
      CompanyInformation_en=""
      GeneralKnowledge_en=""
      Translations_en=""
      id="vocalls-master-layer"
    >
      <mxCell />
    </object>
    <mxCell id="baselayer" parent="vocalls-master-layer" />
    <object
      label="input"
      Type="transient"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      DynamicNextId=""
      Title="input"
      Kind="input"
      DynamicNextTabGuid=""
      Parameters=""
      id="0"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="252.5" y="-350" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="init"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='__rtParams = __setupConfig(__configJSON);&#xa;if (!_headers) { _headers = {}; }&#xa;Logger.debug(&apos;[setAttributes] config resolved&apos;, { params: __rtParams });'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="7"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="233.5" y="-220" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='if (!getValue(__rtParams, &apos;Active&apos;, false)) {&#xa;    Logger.info(&apos;[setAttributes] skipped — inactive&apos;, { nextStep: __rtNextStep });&#xa;    return;&#xa;}&#xa;&#xa;var __CONTROL_KEYS = { Active: 1, NextStep: 1, LogAttributes: 1 };&#xa;var __written = 0;&#xa;&#xa;walk(__rtParams, function (key, value) {&#xa;    if (__CONTROL_KEYS[key]) return;&#xa;    varObj[key] = value;&#xa;    __written++;&#xa;});&#xa;&#xa;global[_rtNextStep] = getValue(__rtParams, &apos;NextStep&apos;, -1);&#xa;Logger.info(&apos;[setAttributes] wrote attributes&apos;, { count: __written, nextStep: global[_rtNextStep] });'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="29"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="233.5" y="-60" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="output"
      Type="transient"
      OnEnter="Logger.info(&apos;[setAttributes] exit&apos;, { nextStep: __rtNextStep });"
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      DynamicNextId=""
      Title="output"
      Kind="output"
      DynamicNextTabGuid=""
      Parameters=""
      id="6"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="252.5" y="110" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="28"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="0"
      target="7"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="317.5" y="-400" as="sourcePoint" />
        <mxPoint x="317.5" y="-240" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="30"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="7"
      target="29"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="317.5" y="190" as="sourcePoint" />
        <mxPoint x="317.5" y="430" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="38"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="29"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
  </root>
</mxGraphModel>
