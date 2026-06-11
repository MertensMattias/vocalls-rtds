<mxGraphModel
  dx="3582"
  dy="2425"
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
      Code="__rtParams = {};&#xa;&#xa;/**&#xa; * Replaces the last &#39;-&#39;-separated segment of context.currentNode.id with the supplied nodeId.&#xa; * Returns the original nodeId untouched when context.currentNode.id is not set.&#xa; *&#xa; * @param {string|number} nodeId - The short id to splice into the current node path.&#xa; * @returns {string} The fully-qualified node id, or the original nodeId if no path is set.&#xa; */&#xa;__makeLocalNodeId = function (nodeId) {&#xa;    if (nodeId !== null &amp;&amp; nodeId !== undefined) nodeId = nodeId.toString();&#xa;    if (!context.currentNode.id) return nodeId;&#xa;    var __separator = &#39;-&#39;;&#xa;    var __output = context.currentNode.id.split(__separator);&#xa;    __output[__output.length - 1] = nodeId;&#xa;    return __output.join(__separator);&#xa;};&#xa;&#xa;/**&#xa; * Normalises operation config: JSON string -&gt; parsed; { Params: {...} } -&gt; Params; flat object -&gt; itself; null -&gt; {}.&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Flat Params object, never null.&#xa; */&#xa;__extractParams = function (config) {&#xa;    var __parsed = typeof config === &#39;string&#39; ? JSON.parse(config) : config;&#xa;    if (__parsed &amp;&amp; typeof __parsed.params === &#39;object&#39; &amp;&amp; __parsed.params !== null) return __parsed.params;&#xa;    return __parsed || {};&#xa;};&#xa;&#xa;/**&#xa; * Component-local alias for the global activeFlag() (rtds_3_vocallsEnv.js) --&#xa; * the single Active-coercion contract. See conventions/params.md.&#xa; *&#xa; * @param {*} value&#xa; * @returns {boolean}&#xa; */&#xa;__activeFlag = function (value) {&#xa;    return activeFlag(value);&#xa;};&#xa;&#xa;/**&#xa; * Resolves Params into a flat { Key: value } map. The value&#39;s TYPE is whatever&#xa; * the JSON wrote -- no Number coercion (&#39;4&#39; stays a string, 4 stays a number).&#xa; * Per key: array-form [value, ...flags] is unwrapped to its first element&#xa; * (matches the runtime twin getParam; GUI flags isDisplayed/isEditable are&#xa; * runtime-irrelevant). Active is then coerced to a real boolean via __activeFlag.&#xa; * Every other STRING value is trimmed and has ${name} placeholders resolved via&#xa; * resolveConfigTokens (varObj first, then global; bare names only; String.replace,&#xa; * never new Function -- the Vocalls runtime disables string-eval). Non-strings pass&#xa; * through with their type intact. Unresolved placeholders are left raw and warned.&#xa; * Active absent: not defaulted here -- the read site decides (SetVariables true,&#xa; * Send and guard default false).&#xa; *&#xa; * @param {string|object} config - Raw operation config (see __extractParams).&#xa; * @returns {object} Map of Key -&gt; resolved value (no __rt prefix; v2 shape).&#xa; */&#xa;__setupConfig = function (config) {&#xa;    var __params = __extractParams(config);&#xa;    var __result = {};&#xa;    var __keys = Object.keys(__params);&#xa;    for (var __i = 0; __i &lt; __keys.length; __i++) {&#xa;        var __key = __keys[__i];&#xa;        var __value = __params[__key];&#xa;        if (Array.isArray(__value)) __value = __value.length ? __value[0] : &#39;&#39;;&#xa;        if (__key === &#39;active&#39;) { __result.active = __activeFlag(__value); continue; }&#xa;        if (typeof __value === &#39;string&#39;) __value = resolveConfigTokens(__value.trim(), __key);&#xa;        __result[__key] = __value;&#xa;    }&#xa;    return __result;&#xa;};&#xa;&#xa;// --- v2 object-access helpers ---&#xa;// Declared with `typeof &lt;name&gt; === &#39;undefined&#39;` guards so they fall back to local definitions&#xa;// when rtds_globalCodeAndHelpers.js has not yet been updated to expose them.&#xa;&#xa;if (typeof getValue === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Returns the value of `key` from `obj`, or `defaultValue` if the key is absent.&#xa;     * Case-insensitive lookup: matches whichever own property name lowercases to the same string.&#xa;     * Mirrors the PureConnect GetAt(values, Find(names, key, 0)) idiom with a default fallback.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getValue = function (obj, key, defaultValue) {&#xa;        if (!obj || !key) return defaultValue;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return obj[__propertyName];&#xa;            }&#xa;        }&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof hasKey === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Case-insensitive existence check. Returns true when any own property of `obj` lowercases to the same string as `key`.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @returns {boolean}&#xa;     */&#xa;    hasKey = function (obj, key) {&#xa;        if (!obj || !key) return false;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return true;&#xa;            }&#xa;        }&#xa;        return false;&#xa;    };&#xa;}&#xa;&#xa;if (typeof walk === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Iterates own properties of `obj`, calling fn(key, value) for each.&#xa;     * Returning false from fn stops the walk.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {function} fn&#xa;     * @returns {void}&#xa;     */&#xa;    walk = function (obj, fn) {&#xa;        if (!obj) return;&#xa;        for (var __key in obj) {&#xa;            if (!obj.hasOwnProperty(__key)) continue;&#xa;            if (fn(__key, obj[__key]) === false) return;&#xa;        }&#xa;    };&#xa;}&#xa;&#xa;if (typeof getScoped === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Reads operator data with the RTDS scope contract: varObj[key]&#xa;     * (case-insensitive) first, then exact-case global[key], then defaultValue.&#xa;     * See conventions/storage.md.&#xa;     *&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getScoped = function (key, defaultValue) {&#xa;        if (defaultValue === undefined) defaultValue = null;&#xa;        if (!key) return defaultValue;&#xa;        var __vo = (typeof varObj !== &#39;undefined&#39;) ? varObj : null;&#xa;        if (__vo &amp;&amp; hasKey(__vo, key)) return getValue(__vo, key, defaultValue);&#xa;        var __scope = (typeof global !== &#39;undefined&#39;) ? global : ((typeof globalThis !== &#39;undefined&#39;) ? globalThis : null);&#xa;        if (__scope &amp;&amp; __scope[key] !== undefined &amp;&amp; __scope[key] !== null) return __scope[key];&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof resolveConfigTokens === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Substitutes ${name} placeholders in a string via getScoped (varObj first,&#xa;     * then global). Bare identifiers only (${w+}); no expressions. A placeholder&#xa;     * that resolves nowhere is left raw and a warn is logged (never silent &#39;&#39;).&#xa;     * String.replace only -- the Vocalls runtime disables string-eval.&#xa;     *&#xa;     * @param {string} raw&#xa;     * @param {string} keyName&#xa;     * @returns {string}&#xa;     */&#xa;    resolveConfigTokens = function (raw, keyName) {&#xa;        if (typeof raw !== &#39;string&#39; || raw.indexOf(&#39;${&#39;) === -1) return raw;&#xa;        var __MISSING = &#39; __rtUnresolved &#39;;&#xa;        return raw.replace(/\$\{(\w+)\}/g, function (__match, __name) {&#xa;            var __sub = getScoped(__name, __MISSING);&#xa;            if (__sub !== __MISSING) return String(__sub);&#xa;            Logger.warn(&#39;[resolveConfigTokens] unresolved placeholder&#39;, { key: keyName, placeholder: __name });&#xa;            return __match;&#xa;        });&#xa;    };&#xa;}&#xa;&#xa;"
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch (Belgium)&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-BE&#39;,&#39;ttsVoiceName&#39;:&#39;&#39;,&#39;ttsEngine&#39;:&#39;&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:false}}"
      Variables='__configJSON = {&#xa;    "active": true,&#xa;    "scheduleId": "${rtScheduleId}",&#xa;    "timeout": 5000,&#xa;    "nextStep_Open": "00011",&#xa;    "nextStep_Closed": "00021",&#xa;    "nextStep_Transfer": "00051",&#xa;    "nextStep_ExternalTransfer": "00052",&#xa;    "nextStep_Disconnect": "00041",&#xa;    "nextStep_Failure": "00099",&#xa;    "nextStep": "00012"&#xa;};&#xa;__environment = environment;&#xa;__rtBaseUrl = _rtBaseUrl;&#xa;__rtEndpoint = _rtScheduleEndpoint;&#xa;__rtPromptEndpoint = _rtPromptEndpoint;&#xa;__sayText = &#39;&#39;;&#xa;__rtOutcome = &#39;nextStep&#39;;&#xa;__rtNextStep &amp;= _rtNextStep;'
      PropertiesDefinition='[&#xa;    {&#xa;        "name": "__configJSON",&#xa;        "title": "Operation config (JSON)",&#xa;        "hint": "Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "maxLength": 5000,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    },&#xa;    {&#xa;        "name": "__environment",&#xa;        "title": "Environment",&#xa;        "hint": "Deployment environment. Controls which RTDS API endpoint is called.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "defaultValue": "environment",&#xa;            "maxLength": 100,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    },&#xa;    {&#xa;        "name": "__nextStep",&#xa;        "title": "Next step (output variable name)",&#xa;        "hint": "Name of the session variable that will receive the next step Id after execution.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "defaultValue": "_rtNextStep",&#xa;            "maxLength": 100,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    }&#xa;]'
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      Translations=""
      ManualId=""
      RequiredVariables=""
      HintGrammar=""
      LastLanguage="default"
      InfoAboutUser_nl=""
      CompanyInformation_nl=""
      GeneralKnowledge_nl=""
      Translations_nl=""
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
      Code="language = (typeof language === &#39;string&#39; &amp;&amp; language.trim() !== &#39;&#39;) ? language.toUpperCase() : &#39;NL&#39;;&#xa;__rtOutcome = &#39;nextStep&#39;;&#xa;__sayText = &#39;&#39;;&#xa;__rtParams = __setupConfig(__configJSON);&#xa;if (!_headers) { _headers = {}; }&#xa;Logger.debug(&#39;[checkSchedule] config resolved&#39;, { params: __rtParams, outcome: __rtOutcome });"
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
      Code='if (!getValue(__rtParams, &#39;active&#39;, true)) {&#xa;    Logger.info(&#39;[checkSchedule] skipped -- inactive&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;var __scheduleId = getValue(__rtParams, &#39;scheduleId&#39;, &#39;&#39;);&#xa;if (__scheduleId === &#39;&#39; || __scheduleId === null || __scheduleId === undefined) {&#xa;    Logger.warn(&#39;[checkSchedule] missing scheduleId&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;__rtOutcome = &#39;nextStep_Failure&#39;;&#xa;&#xa;var __now = new Date();&#xa;var __dt = __now.toISOString().substring(0, 10) + &#39; &#39; + __now.toLocaleTimeString(&#39;fr&#39;);&#xa;var __statusUrl = __rtBaseUrl + __rtEndpoint + &#39;/&#39; + encodeURIComponent(__scheduleId) + &#39;/status?date=&#39; + encodeURI(__dt);&#xa;var __timeout = Number(getValue(__rtParams, &#39;timeout&#39;, 10000));&#xa;&#xa;return jsonHttpRequest(__statusUrl, { &#39;timeout&#39;: +__timeout }, _headers).then(&#xa;    function (result) {&#xa;        if (!result || result.success !== true) {&#xa;            Logger.warn(&#39;[checkSchedule] status request failed&#39;, { url: __statusUrl, statusCode: result &amp;&amp; result.statusCode, outcome: __rtOutcome });&#xa;            return;&#xa;        }&#xa;        var __res = result.response || {};&#xa;        var __action = String(__res.action || &#39;&#39;).replace(/\s+/g, &#39;&#39;);&#xa;        var __isOpen = __res.isOpen === true || __res.isOpen === &#39;true&#39; || __res.isOpen === 1 || __res.isOpen === &#39;1&#39;;&#xa;        Logger.info(&#39;[checkSchedule] schedule result&#39;, { line: __isOpen ? &#39;open&#39; : &#39;closed&#39;, action: __action });&#xa;&#xa;        var __actionLower = __action.toLowerCase();&#xa;        if (__actionLower === &#39;transfer&#39;) {&#xa;            setVariable(&#39;RTDS_SchedulerInternalNumber&#39;, String(__res.actionDetail || &#39;&#39;));&#xa;        } else if (__actionLower === &#39;externaltransfer&#39;) {&#xa;            setVariable(&#39;RTDS_SchedulerExternalNumber&#39;, String(__res.actionDetail || &#39;&#39;));&#xa;        }&#xa;&#xa;        var __key = &#39;nextStep_&#39; + __action;&#xa;        __rtOutcome = hasKey(__rtParams, __key) ? __key : &#39;nextStep&#39;;&#xa;        Logger.info(&#39;[checkSchedule] branch&#39;, { action: __action, outcome: __rtOutcome });&#xa;&#xa;        var __play = __res.actionPlayPrompt === true || __res.actionPlayPrompt === &#39;true&#39; || __res.actionPlayPrompt === 1 || __res.actionPlayPrompt === &#39;1&#39;;&#xa;        var __promptId = __res.promptId;&#xa;        if (!__play || __promptId === null || __promptId === undefined || __promptId === &#39;&#39;) {&#xa;            return;&#xa;        }&#xa;        var __promptUrl = __rtBaseUrl + __rtPromptEndpoint + &#39;/&#39; + encodeURIComponent(__promptId);&#xa;        return jsonHttpRequest(__promptUrl, { &#39;timeout&#39;: +__timeout }, _headers).then(&#xa;            function (pres) {&#xa;                if (!pres || pres.success !== true) {&#xa;                    Logger.warn(&#39;[checkSchedule] prompt fetch failed&#39;, { promptId: __promptId, statusCode: pres &amp;&amp; pres.statusCode, outcome: __rtOutcome });&#xa;                    return;&#xa;                }&#xa;                var __prompt = (pres.response &amp;&amp; pres.response[0]) || {};&#xa;                var __versions = __prompt.promptVersions || [];&#xa;                var __langMap = { 1: &#39;NL&#39;, 2: &#39;FR&#39;, 3: &#39;DE&#39;, 44: &#39;EN&#39; };&#xa;                var __tts = {};&#xa;                for (var __i = 0; __i &lt; __versions.length; __i++) {&#xa;                    var __code = __langMap[__versions[__i].dicPromptLanguageId] || &#39;&#39;;&#xa;                    if (__code) { __tts[__code] = String(__versions[__i].text || &#39;&#39;); }&#xa;                }&#xa;                __sayText = getValue(__tts, language, &#39;&#39;);&#xa;                Logger.info(&#39;[checkSchedule] prompt resolved&#39;, { promptId: __promptId, language: language, hasText: __sayText !== &#39;&#39;, outcome: __rtOutcome });&#xa;            },&#xa;            function (perr) { Logger.warn(&#39;[checkSchedule] prompt fetch error&#39;, { promptId: __promptId, outcome: __rtOutcome }, perr); }&#xa;        );&#xa;    },&#xa;    function (err) {&#xa;        Logger.error(&#39;[checkSchedule] status request error&#39;, { url: __statusUrl, outcome: __rtOutcome }, err);&#xa;    }&#xa;);'
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
      label="say: scheduler prompt"
      Type="say"
      Text="{Speech.ssml(__sayText)}"
      AltTexts=""
      SelectionMode="temporary"
      Language=""
      Voice=""
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      DynamicNextId=""
      id="101"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="233.5" y="280" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="output"
      Type="transient"
      OnEnter="_rtNextStep = getValue(__rtParams, __rtOutcome, &#39;&#39;);&#xa;Logger.info(&#39;[checkSchedule] exit&#39;, { outcome: __rtOutcome, nextStep: _rtNextStep });"
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
        <mxGeometry x="252.5" y="440" width="130" height="40" as="geometry" />
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
      id="100"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="29"
      target="110"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="play prompt?"
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="110"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="150" y="120" width="336" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="111">
      <mxCell style="caseInnerNode" parent="110" vertex="1">
        <mxGeometry x="10" y="16" width="316" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__sayText != &#39;&#39;"
      SubType="expression"
      Expression="__sayText != &#39;&#39;"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="112"
    >
      <mxCell style="expressionNode" parent="110" vertex="1">
        <mxGeometry x="10" y="56" width="316" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" SubType="default" DynamicNextId="" id="113">
      <mxCell style="defaultNode" parent="110" vertex="1">
        <mxGeometry x="10" y="86" width="316" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="120"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="112"
      target="101"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="121"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="113"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="560" y="101" />
          <mxPoint x="560" y="460" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="102"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="101"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
  </root>
</mxGraphModel>
