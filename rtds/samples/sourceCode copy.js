<mxGraphModel
  dx="4083"
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
      Code="__rtParams = {};&#xa;&#xa;/**&#xa; * Replaces the last &#39;-&#39;-separated segment of context.currentNode.id with the supplied nodeId.&#xa; * Returns the original nodeId untouched when context.currentNode.id is not set.&#xa; *&#xa; * @param {string|number} nodeId - The short id to splice into the current node path.&#xa; * @returns {string} The fully-qualified node id, or the original nodeId if no path is set.&#xa; */&#xa;__makeLocalNodeId = function (nodeId) {&#xa;    if (nodeId !== null &amp;&amp; nodeId !== undefined) nodeId = nodeId.toString();&#xa;    if (!context.currentNode.id) return nodeId;&#xa;    var __separator = &#39;-&#39;;&#xa;    var __output = context.currentNode.id.split(__separator);&#xa;    __output[__output.length - 1] = nodeId;&#xa;    return __output.join(__separator);&#xa;};&#xa;&#xa;/**&#xa; * Normalises operation config: JSON string -&gt; parsed; { Params: {...} } -&gt; Params; flat object -&gt; itself; null -&gt; {}.&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Flat Params object, never null.&#xa; */&#xa;__extractParams = function (config) {&#xa;    var __parsed = typeof config === &#39;string&#39; ? JSON.parse(config) : config;&#xa;    if (__parsed &amp;&amp; typeof __parsed.Params === &#39;object&#39; &amp;&amp; __parsed.Params !== null) return __parsed.Params;&#xa;    return __parsed || {};&#xa;};&#xa;&#xa;/**&#xa; * Component-local alias for the global activeFlag() (rtds_3_vocallsEnv.js) --&#xa; * the single Active-coercion contract. See conventions/params.md.&#xa; *&#xa; * @param {*} value&#xa; * @returns {boolean}&#xa; */&#xa;__activeFlag = function (value) {&#xa;    return activeFlag(value);&#xa;};&#xa;&#xa;/**&#xa; * Resolves Params into a flat { Key: value } map. The value&#39;s TYPE is whatever&#xa; * the JSON wrote -- no Number coercion (&#39;4&#39; stays a string, 4 stays a number).&#xa; * Per key: array-form [value, ...flags] is unwrapped to its first element&#xa; * (matches the runtime twin getParam; GUI flags isDisplayed/isEditable are&#xa; * runtime-irrelevant). Active is then coerced to a real boolean via __activeFlag.&#xa; * Every other STRING value is trimmed and has ${name} placeholders resolved via&#xa; * resolveConfigTokens (varObj first, then global; bare names only; String.replace,&#xa; * never new Function -- the Vocalls runtime disables string-eval). Non-strings pass&#xa; * through with their type intact. Unresolved placeholders are left raw and warned.&#xa; * Active absent: not defaulted here -- the read site decides (SetVariables true,&#xa; * Send and guard default false).&#xa; *&#xa; * @param {string|object} config - Raw operation config (see __extractParams).&#xa; * @returns {object} Map of Key -&gt; resolved value (no __rt prefix; v2 shape).&#xa; */&#xa;__setupConfig = function (config) {&#xa;    var __params = __extractParams(config);&#xa;    var __result = {};&#xa;    var __keys = Object.keys(__params);&#xa;    for (var __i = 0; __i &lt; __keys.length; __i++) {&#xa;        var __key = __keys[__i];&#xa;        var __value = __params[__key];&#xa;        if (Array.isArray(__value)) __value = __value.length ? __value[0] : &#39;&#39;;&#xa;        if (__key === &#39;Active&#39;) { __result.Active = __activeFlag(__value); continue; }&#xa;        if (typeof __value === &#39;string&#39;) __value = resolveConfigTokens(__value.trim(), __key);&#xa;        __result[__key] = __value;&#xa;    }&#xa;    return __result;&#xa;};&#xa;&#xa;// --- v2 object-access helpers ---&#xa;// Declared with `typeof &lt;name&gt; === &#39;undefined&#39;` guards so they fall back to local definitions&#xa;// when rtds_globalCodeAndHelpers.js has not yet been updated to expose them.&#xa;&#xa;if (typeof getValue === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Returns the value of `key` from `obj`, or `defaultValue` if the key is absent.&#xa;     * Case-insensitive lookup: matches whichever own property name lowercases to the same string.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getValue = function (obj, key, defaultValue) {&#xa;        if (!obj || !key) return defaultValue;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return obj[__propertyName];&#xa;            }&#xa;        }&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof walk === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Iterates own properties of `obj`, calling fn(key, value) for each. Returning false stops the walk.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {function} fn&#xa;     * @returns {void}&#xa;     */&#xa;    walk = function (obj, fn) {&#xa;        if (!obj) return;&#xa;        for (var __key in obj) {&#xa;            if (!obj.hasOwnProperty(__key)) continue;&#xa;            if (fn(__key, obj[__key]) === false) return;&#xa;        }&#xa;    };&#xa;}&#xa;&#xa;if (typeof nowUTC === &#39;undefined&#39;) {&#xa;    /**&#xa;     * @returns {string} Current date/time as ISO-8601 UTC.&#xa;     */&#xa;    nowUTC = function () { return new Date().toISOString(); };&#xa;}&#xa;&#xa;if (typeof hasKey === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Case-insensitive existence check (own properties).&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @returns {boolean}&#xa;     */&#xa;    hasKey = function (obj, key) {&#xa;        if (!obj || !key) return false;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return true;&#xa;            }&#xa;        }&#xa;        return false;&#xa;    };&#xa;}&#xa;&#xa;if (typeof getScoped === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Reads operator data with the RTDS scope contract: varObj[key]&#xa;     * (case-insensitive) first, then exact-case global[key], then defaultValue.&#xa;     * See conventions/storage.md.&#xa;     *&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getScoped = function (key, defaultValue) {&#xa;        if (defaultValue === undefined) defaultValue = null;&#xa;        if (!key) return defaultValue;&#xa;        var __vo = (typeof varObj !== &#39;undefined&#39;) ? varObj : null;&#xa;        if (__vo &amp;&amp; hasKey(__vo, key)) return getValue(__vo, key, defaultValue);&#xa;        var __scope = (typeof global !== &#39;undefined&#39;) ? global : ((typeof globalThis !== &#39;undefined&#39;) ? globalThis : null);&#xa;        if (__scope &amp;&amp; __scope[key] !== undefined &amp;&amp; __scope[key] !== null) return __scope[key];&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof resolveConfigTokens === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Substitutes ${name} placeholders in a string via getScoped (varObj first,&#xa;     * then global). Bare identifiers only (${w+}); no expressions. A placeholder&#xa;     * that resolves nowhere is left raw and a warn is logged (never silent &#39;&#39;).&#xa;     * String.replace only -- the Vocalls runtime disables string-eval.&#xa;     *&#xa;     * @param {string} raw&#xa;     * @param {string} keyName&#xa;     * @returns {string}&#xa;     */&#xa;    resolveConfigTokens = function (raw, keyName) {&#xa;        if (typeof raw !== &#39;string&#39; || raw.indexOf(&#39;${&#39;) === -1) return raw;&#xa;        var __MISSING = &#39; __rtUnresolved &#39;;&#xa;        return raw.replace(/\$\{(\w+)\}/g, function (__match, __name) {&#xa;            var __sub = getScoped(__name, __MISSING);&#xa;            if (__sub !== __MISSING) return String(__sub);&#xa;            Logger.warn(&#39;[resolveConfigTokens] unresolved placeholder&#39;, { key: keyName, placeholder: __name });&#xa;            return __match;&#xa;        });&#xa;    };&#xa;}"
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch (Belgium)&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-BE&#39;,&#39;ttsVoiceName&#39;:&#39;&#39;,&#39;ttsEngine&#39;:&#39;&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:false}}"
      Variables='__configJSON = {&#xa;    "Active": true,&#xa;    "ConfigId": 1,&#xa;    "PhoneNumberVar": "ani",&#xa;    "Timeout": 10000,&#xa;    "Prompt": "To activate this number, press 7. To deactivate this number, press 3.",&#xa;    "ResultActivated": "Your number is successfully activated.",&#xa;    "ResultDeactivated": "Your number is successfully deactivated.",&#xa;    "ResultOnlyActive": "You are currently the only active member, therefore you are not able to deactivate yourself.",&#xa;    "ResultDenied": "You are not allowed to use this service. If you disagree, contact your administrator. Thank you for calling.",&#xa;    "ResultError": "We encountered a technical issue. Contact your administrator to report this issue.",&#xa;    "NextStep": "00010",&#xa;    "NextStep_Success": "00011",&#xa;    "NextStep_Denied": "00012",&#xa;    "NextStep_Failure": "00099"&#xa;};&#xa;__environment = environment;&#xa;__rtBaseUrl = _rtBaseUrl;&#xa;__rtTuiCheckAccessEndpoint = _rtTuiCheckAccessEndpoint;&#xa;__rtTuiGetStateEndpoint = _rtTuiGetStateEndpoint;&#xa;__rtTuiActivateEndpoint = _rtTuiActivateEndpoint;&#xa;__rtTuiDeactivateEndpoint = _rtTuiDeactivateEndpoint;&#xa;__rtNextStep &amp;= _rtNextStep;'
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
      Sections="[]"
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
      <mxCell
        style="transientNode;strokeColor=#666666;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-500.5" y="-960" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="init"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="__rtParams = __setupConfig(__configJSON);&#xa;if (!_headers) { _headers = {}; }&#xa;__guardTuiGuardId = &#39;&#39;;&#xa;Logger.debug(&#39;[guardTui] config resolved&#39;, { params: __rtParams });"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="7"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-64" y="-270" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='global[_rtNextStep] = getValue(__rtParams, &#39;NextStep&#39;, &#39;&#39;);&#xa;&#xa;if (!getValue(__rtParams, &#39;Active&#39;, false)) {&#xa;    Logger.info(&#39;[guardTui] skipped -- inactive&#39;, { nextStep: global[_rtNextStep] });&#xa;    return;&#xa;}&#xa;&#xa;var __ani = getScoped(getValue(__rtParams, &#39;PhoneNumberVar&#39;, varObj.ani), null);&#xa;var __configId = getValue(__rtParams, &#39;ConfigId&#39;, &#39;&#39;);&#xa;var __includeInactive = 0;&#xa;&#xa;if (!__configId || !__ani) {&#xa;    global[_rtNextStep] = getValue(__rtParams, &#39;NextStep_Failure&#39;, &#39;&#39;);&#xa;    Logger.warn(&#39;[guardTui] missing ConfigId or phone number&#39;, { configId: __configId, nextStep: global[_rtNextStep] });&#xa;    return;&#xa;}&#xa;&#xa;global[_rtNextStep] = getValue(__rtParams, &#39;NextStep_Failure&#39;, &#39;&#39;);&#xa;var __timeout = Number(getValue(__rtParams, &#39;Timeout&#39;, 10000));&#xa;&#xa;var __urlCheck = __rtBaseUrl +&#xa;    __rtTuiCheckAccessEndpoint + &#39;/&#39; +&#xa;    __configId + &#39;/&#39; +&#xa;    encodeURIComponent(__ani) + &#39;/&#39; +&#xa;    __includeInactive;&#xa;    &#xa;    log_debug(&#39;__urlCheck: &#39; + __urlCheck);&#xa;&#xa;return jsonHttpRequest(__urlCheck, { method: &#39;GET&#39;, "timeout": __timeout }, _headers).then(&#xa;    function (result) {&#xa;        if (!result || result.success !== true) {&#xa;            Logger.warn(&#39;[guardTui] eligibility check failed&#39;, { statusCode: result &amp;&amp; result.statusCode, nextStep: global[_rtNextStep] });&#xa;            return;&#xa;        }&#xa;        if (String(result.response).toLowerCase() !== &#39;true&#39;) {&#xa;            global[_rtNextStep] = getValue(__rtParams, &#39;NextStep_Denied&#39;, &#39;&#39;);&#xa;            Logger.info(&#39;[guardTui] denied&#39;, { nextStep: global[_rtNextStep] });&#xa;            return;&#xa;        }&#xa;&#xa;&#xa;        var __urlState = __rtBaseUrl +&#xa;            __rtTuiGetStateEndpoint + &#39;/&#39; +&#xa;            __configId + &#39;/&#39; +&#xa;            encodeURIComponent(__ani);&#xa;        &#xa;        log_debug(&#39;__urlState: &#39; + __urlState);&#xa;&#xa;        return jsonHttpRequest(__urlState, { method: &#39;GET&#39;, "timeout": __timeout }, _headers).then(&#xa;            function (state) {&#xa;                if (!state || state.success !== true || !state.response || state.response.id === undefined || state.response.id === null) {&#xa;                    Logger.warn(&#39;[guardTui] state lookup failed&#39;, { statusCode: state &amp;&amp; state.statusCode, nextStep: global[_rtNextStep] });&#xa;                    return;&#xa;                }&#xa;                __guardTuiGuardId = String(state.response.id);&#xa;                global[_rtNextStep] = getValue(__rtParams, &#39;NextStep&#39;, &#39;&#39;);&#xa;                Logger.info(&#39;[guardTui] menu staged&#39;, { guardId: __guardTuiGuardId, nextStep: global[_rtNextStep] });&#xa;            },&#xa;            function (err) { Logger.error(&#39;[guardTui] state lookup error&#39;, { nextStep: global[_rtNextStep] }, err); }&#xa;        );&#xa;    },&#xa;    function (err) { Logger.error(&#39;[guardTui] eligibility check error&#39;, { nextStep: global[_rtNextStep] }, err); }&#xa;);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="29"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-64" y="-110" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="563"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="220"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="-620" y="150" />
          <mxPoint x="-620" y="1070" />
          <mxPoint x="20" y="1070" />
        </Array>
      </mxGeometry>
    </mxCell>
    <object
      label="{ResultDenied}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{ResultDenied}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      Text_nl=""
      AltTexts_nl=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      Cache="true"
      EscapeXML="true"
      OutputFilter=""
      id="220"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="-600" y="110" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{ResultError}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{ResultError}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      Text_nl=""
      AltTexts_nl=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      Cache="true"
      EscapeXML="true"
      OutputFilter=""
      id="221"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="-570" y="250" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{Prompt}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{Prompt}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      Text_nl=""
      AltTexts_nl=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      Cache="true"
      EscapeXML="true"
      OutputFilter=""
      id="101"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="477.5" y="60" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="toggleDeactivate"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='global[_rtNextStep] = getValue(__rtParams, &#39;NextStep_Failure&#39;, &#39;&#39;);&#xa;if (!__guardTuiGuardId) {&#xa;    Logger.warn(&#39;[guardTui] deactivate missing guardId&#39;, { nextStep: global[_rtNextStep] });&#xa;    return;&#xa;}&#xa;var __url = __rtBaseUrl + __rtTuiDeactivateEndpoint + &#39;/&#39; + __guardTuiGuardId;&#xa;var __timeout = Number(getValue(__rtParams, &#39;Timeout&#39;, 10000));&#xa;return jsonHttpRequest(__url, { method: &#39;POST&#39;, "timeout": __timeout }, _headers, null).then(&#xa;    function (result) {&#xa;        if (!result || result.success !== true) {&#xa;            Logger.warn(&#39;[guardTui] deactivate failed&#39;, { statusCode: result &amp;&amp; result.statusCode, nextStep: global[_rtNextStep] });&#xa;            return;&#xa;        }&#xa;        if (String(result.response).toLowerCase() === &#39;true&#39;) {&#xa;            global[_rtNextStep] = getValue(__rtParams, &#39;NextStep_Success&#39;, &#39;&#39;);&#xa;            Logger.info(&#39;[guardTui] deactivated&#39;, { nextStep: global[_rtNextStep] });&#xa;            return;&#xa;        }&#xa;        global[_rtNextStep] = getValue(__rtParams, &#39;NextStep&#39;, &#39;&#39;);&#xa;        Logger.info(&#39;[guardTui] only active member&#39;, { nextStep: global[_rtNextStep] });&#xa;    },&#xa;    function (err) { Logger.error(&#39;[guardTui] deactivate error&#39;, { nextStep: global[_rtNextStep] }, err); }&#xa;);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="150"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="360" y="430" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="toggleActivate"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='global[_rtNextStep] = getValue(__rtParams, &#39;NextStep_Failure&#39;, &#39;&#39;);&#xa;if (!__guardTuiGuardId) {&#xa;    Logger.warn(&#39;[guardTui] activate missing guardId&#39;, { nextStep: global[_rtNextStep] });&#xa;    return;&#xa;}&#xa;var __url = __rtBaseUrl + __rtTuiActivateEndpoint + &#39;/&#39; + __guardTuiGuardId;&#xa;var __timeout = Number(getValue(__rtParams, &#39;Timeout&#39;, 10000));&#xa;return jsonHttpRequest(__url, { method: &#39;POST&#39;, "timeout": __timeout }, _headers, null).then(&#xa;    function (result) {&#xa;        if (result &amp;&amp; result.success === true &amp;&amp; String(result.response).toLowerCase() === &#39;true&#39;) {&#xa;            global[_rtNextStep] = getValue(__rtParams, &#39;NextStep_Success&#39;, &#39;&#39;);&#xa;            Logger.info(&#39;[guardTui] activated&#39;, { nextStep: global[_rtNextStep] });&#xa;            return;&#xa;        }&#xa;        Logger.warn(&#39;[guardTui] activate failed&#39;, { statusCode: result &amp;&amp; result.statusCode, nextStep: global[_rtNextStep] });&#xa;    },&#xa;    function (err) { Logger.error(&#39;[guardTui] activate error&#39;, { nextStep: global[_rtNextStep] }, err); }&#xa;);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="151"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="1139.5" y="460" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{ResultDeactivated}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{ResultDeactivated}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      Text_nl=""
      AltTexts_nl=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      Cache="true"
      EscapeXML="true"
      OutputFilter=""
      id="460"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="140" y="930" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="565"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="461"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="{ResultOnlyActive}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{ResultOnlyActive}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      Text_nl=""
      AltTexts_nl=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      Cache="true"
      EscapeXML="true"
      OutputFilter=""
      id="461"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="104" y="641" width="137" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{ResultError}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{ResultError}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      Text_nl=""
      AltTexts_nl=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      Cache="true"
      EscapeXML="true"
      OutputFilter=""
      id="462"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="506" y="930" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{ResultActivated}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{ResultActivated}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      Text_nl=""
      AltTexts_nl=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      Cache="true"
      EscapeXML="true"
      OutputFilter=""
      id="560"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="1520" y="711" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{ResultError}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{ResultError}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      Text_nl=""
      AltTexts_nl=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      Cache="true"
      EscapeXML="true"
      OutputFilter=""
      id="561"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="1080" y="990" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{ResultError}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{ResultError}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      Text_nl=""
      AltTexts_nl=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      Cache="true"
      EscapeXML="true"
      OutputFilter=""
      id="170"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="793" y="460" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="output"
      Type="transient"
      OnEnter="Logger.info(&#39;[guardTui] exit&#39;, { nextStep: __rtNextStep });"
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
      <mxCell
        style="transientNode;strokeColor=#666666;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-45" y="1630" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="28"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="0"
      target="574"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="-30" y="-700" as="sourcePoint" />
        <mxPoint x="-30" y="-540" as="targetPoint" />
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
        <mxPoint x="20" y="150" as="sourcePoint" />
        <mxPoint x="20" y="390" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="300"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="29"
      target="200"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="311"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="221"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="312"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="101"
      target="102"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="330"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="170"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="937" y="1440" />
          <mxPoint x="20" y="1440" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="400"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="150"
      target="450"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="401"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="151"
      target="550"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="420"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="460"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="284" y="1430" />
          <mxPoint x="20" y="1430" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="422"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="462"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="621" y="1440" />
          <mxPoint x="20" y="1440" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="520"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="560"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="1664" y="1470" />
          <mxPoint x="20" y="1470" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="521"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="561"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="1224" y="1450" />
          <mxPoint x="20" y="1450" />
        </Array>
      </mxGeometry>
    </mxCell>
    <object
      label=""
      Type="dtmf"
      OnEnter=""
      OnLeave=""
      Timeout="8000"
      MaxEntryCount=""
      MaxEntryNodeId=""
      MinTimeout=""
      id="102"
    >
      <mxCell style="dtmfNode" parent="baselayer" vertex="1">
        <mxGeometry x="541" y="200" width="160" height="200" as="geometry" />
      </mxCell>
    </object>
    <object id="103">
      <mxCell style="dtmfInnerNode" parent="102" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="3" DynamicNextId="" SubType="choice" Key="3" id="110">
      <mxCell style="choiceNode" parent="102" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="7" DynamicNextId="" SubType="choice" Key="7" id="111">
      <mxCell style="choiceNode" parent="102" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no input" DynamicNextId="" SubType="noInput" id="112">
      <mxCell style="noInputNode" parent="102" vertex="1">
        <mxGeometry x="10" y="116" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="320"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="110"
      target="150"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="322"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="112"
      target="170"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="564"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="111"
      target="151"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="200"
    >
      <mxCell
        style="caseNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-120" y="80" width="280" height="186" as="geometry" />
      </mxCell>
    </object>
    <object id="201">
      <mxCell style="caseInnerNode" parent="200" vertex="1">
        <mxGeometry x="10" y="16" width="260" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="_rtNextStep == getValue(__rtParams, &#39;NextStep_Denied&#39;, &#39;&#39;)"
      SubType="expression"
      Expression="_rtNextStep == getValue(__rtParams, &#39;NextStep_Denied&#39;, &#39;&#39;)"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="202"
    >
      <mxCell style="expressionNode" parent="200" vertex="1">
        <mxGeometry x="10" y="56" width="260" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="_rtNextStep == getValue(__rtParams, &#39;NextStep_Failure&#39;, &#39;&#39;)"
      SubType="expression"
      Expression="_rtNextStep == getValue(__rtParams, &#39;NextStep_Failure&#39;, &#39;&#39;)"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="203"
    >
      <mxCell style="expressionNode" parent="200" vertex="1">
        <mxGeometry x="10" y="86" width="260" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__guardTuiGuardId != &#39;&#39;"
      SubType="expression"
      Expression="__guardTuiGuardId != &#39;&#39;"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="204"
    >
      <mxCell style="expressionNode" parent="200" vertex="1">
        <mxGeometry x="10" y="116" width="260" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" SubType="default" DynamicNextId="" id="205">
      <mxCell style="defaultNode" parent="200" vertex="1">
        <mxGeometry x="10" y="146" width="260" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="562"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="202"
      target="220"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="302"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;entryX=1;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="203"
      target="221"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="303"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="204"
      target="101"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="304"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="205"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="550"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="1063.5" y="680" width="320" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="551">
      <mxCell style="caseInnerNode" parent="550" vertex="1">
        <mxGeometry x="10" y="16" width="300" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="_rtNextStep == getValue(__rtParams, &#39;NextStep_Success&#39;, &#39;&#39;)"
      SubType="expression"
      Expression="_rtNextStep == getValue(__rtParams, &#39;NextStep_Success&#39;, &#39;&#39;)"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="552"
    >
      <mxCell style="expressionNode" parent="550" vertex="1">
        <mxGeometry x="10" y="56" width="300" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" SubType="default" DynamicNextId="" id="553">
      <mxCell style="defaultNode" parent="550" vertex="1">
        <mxGeometry x="10" y="86" width="300" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="510"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="552"
      target="560"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="511"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="553"
      target="561"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="450"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="300" y="610" width="336" height="156" as="geometry" />
      </mxCell>
    </object>
    <object id="451">
      <mxCell style="caseInnerNode" parent="450" vertex="1">
        <mxGeometry x="10" y="16" width="316" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="_rtNextStep == getValue(__rtParams, &#39;NextStep&#39;, &#39;&#39;)"
      SubType="expression"
      Expression="_rtNextStep == getValue(__rtParams, &#39;NextStep&#39;, &#39;&#39;)"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="453"
    >
      <mxCell style="expressionNode" parent="450" vertex="1">
        <mxGeometry x="10" y="56" width="316" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="_rtNextStep == getValue(__rtParams, &#39;NextStep_Success&#39;, &#39;&#39;)"
      SubType="expression"
      Expression="_rtNextStep == getValue(__rtParams, &#39;NextStep_Success&#39;, &#39;&#39;)"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="452"
    >
      <mxCell style="expressionNode" parent="450" vertex="1">
        <mxGeometry x="10" y="86" width="316" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" SubType="default" DynamicNextId="" id="454">
      <mxCell style="defaultNode" parent="450" vertex="1">
        <mxGeometry x="10" y="116" width="316" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="411"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="453"
      target="461"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="410"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="452"
      target="460"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="412"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="454"
      target="462"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="566"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="568"
      target="570"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="-448" y="-680" as="sourcePoint" />
        <mxPoint x="-448" y="-300" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="577"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="567"
      target="7"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="[rtds] start"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='Logger.info("[rtds] start");&#xa;&#xa;initializeCallFlowContext("full");&#xa;&#xa;Logger.info("[rtds] call context ready", {&#xa;    callGuid: context &amp;&amp; context.callInfo &amp;&amp; context.callInfo.callGuid,&#xa;    direction: context &amp;&amp; context.callInfo &amp;&amp; context.callInfo.direction,&#xa;    language: (context &amp;&amp; context.language) || (varObj &amp;&amp; varObj.language),&#xa;    ani: varObj &amp;&amp; varObj.ani,&#xa;    dnis: varObj &amp;&amp; varObj.dnis,&#xa;    routingId: varObj &amp;&amp; varObj.routingId,&#xa;    environment: varObj &amp;&amp; varObj.environment,&#xa;});'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="567"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-520" y="-270" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="api configs"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='language = &#39;&#39;;&#xa;&#xa;varObj = {};&#xa;callIdKey = &#39;&#39;;&#xa;&#xa;result = null;&#xa;env = &#39;acc&#39;;&#xa;debug = true;&#xa;debugCall = true;&#xa;&#xa;_rtConfig = {};&#xa;_rtNextStep = "_rtNextStep";&#xa;&#xa;_headers = &#39;&#39;;&#xa;&#xa;&#xa;&#xa;&#xa;&#xa;&#xa;//__rtBaseUrl = _rtBaseUrl;&#xa;&#xa;_rtBaseUrl = &#39;https://api.n-allo.be&#39;;&#xa;_rtSmsEndpoint = `/smsapi-${environment}/api/Send`;&#xa;_rtMailEndpoint = `/mailapi-${environment}/api/SendMail`;&#xa;_rtGetSourceIdEndpoint = `/routingtablesapi-${environment}/api/routing-table/source`;&#xa;__rtBaseUrl = &#39;https://api.n-allo.be&#39;;&#xa;__rtTuiCheckAccessEndpoint = `/digipolisapi-${environment}/api/Guard/AnyGuardWithPhoneNumberAndConfig`;            &#xa;__rtTuiGetStateEndpoint = `/digipolisapi-${environment}/api/Guard/GetGuardByPhoneNumberAndConfig`;&#xa;__rtTuiActivateEndpoint = "";&#xa;__rtTuiDeactivateEndpoint = "";&#xa;&#xa;&#xa;&#xa;&#xa;_rtActiveGuardByConfigEndpoint = `/digipolisapi-${environment}/api/Guard/GetAllCurrentActiveGuardsByGuardConfig`;&#xa;_rtAnyGuardWithPhoneAndConfEndpoint = `/digipolisapi-${environment}/api/Guard/AnyGuardWithPhoneNumberAndConfig`;&#xa;&#xa;_rtScheduleEndpoint = `/schedulingapi-${environment}/api/schedule/`;&#xa;_rtPhonebookEndpoint = `/phonebookapi-${environment}`;&#xa;&#xa;&#xa;Logger.configure({ activeLevel: &#39;DEBUG&#39; });'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="568"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-519.5" y="-700" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="569"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="574"
      target="568"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="-435.5" y="-700" as="sourcePoint" />
        <mxPoint x="-435.5" y="-460" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="da71a20a-d4d4-431c-bda4-1dca3d981ad5"
      ComponentVersion="X1eVVViNIdZtZ6PJzPO4Kg=="
      SupportedLanguages=""
      __retriesOnFailure="1"
      __tokenUrl='"https://login.microsoftonline.com/24139d14-c62c-4c47-8bdd-ce71ea1d50cf/oauth2/v2.0/token"'
      __clientIdAcc='"29ff6118-7b55-44b8-8e95-03636d3334f8"'
      __clientIdPrd='"487c3298-394e-4ef3-9ca2-b0eda87b1a14"'
      __environment='"acc"'
      __forceTokenReload="false"
      SingleInput="0"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[ \n    { \n        \&#39;name\&#39;: \&#39;__retriesOnFailure\&#39;, \n        \&#39;title\&#39;: \&#39;The total amount of tries\&#39;, \n        \&#39;hint\&#39;: \&#39;Select the total tries to retrieve a valid Okta Auth header.\&#39;, \n        \&#39;controlSettings\&#39;: { \n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;, \n            \&#39;defaultValue\&#39;: 1, \n            \&#39;dataType\&#39;: \&#39;number\&#39;,  \n            \&#39;options\&#39;: [ \n                1, \n                2, \n                3 \n            ] \n        } \n    }, \n    { \n        \&#39;name\&#39;: \&#39;__forceTokenReload\&#39;, \n        \&#39;title\&#39;: \&#39;Forced token reload\&#39;, \n        \&#39;controlSettings\&#39;: { \n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;, \n            \&#39;defaultValue\&#39;: \&#39;false\&#39;, \n            \&#39;options\&#39;: [ \n                \&#39;true\&#39;, \n                \&#39;false\&#39; \n            ] \n        } \n    } \n]&#39;"
      id="570"
    >
      <mxCell
        style="component3Node;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-513" y="-460" width="155" height="131" as="geometry" />
      </mxCell>
    </object>
    <object label="nalOktaAuth" id="571">
      <mxCell style="componentInnerNode" parent="570" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <object
      label='&lt;font color="#333333"&gt;&lt;span style="font-weight: normal"&gt;getTokenFailure&lt;br&gt;&lt;/span&gt;&lt;/font&gt;'
      ComponentId="23"
      SubType="transient"
      Kind="output"
      id="572"
    >
      <mxCell style="component3OutputNode" parent="570" vertex="1">
        <mxGeometry x="10" y="61" width="135" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label='&lt;font color="#333333"&gt;&lt;span style="font-weight: normal"&gt;getTokenSuccess&lt;br&gt;&lt;/span&gt;&lt;/font&gt;'
      ComponentId="17"
      SubType="transient"
      Kind="output"
      id="573"
    >
      <mxCell style="component3OutputNode" parent="570" vertex="1">
        <mxGeometry x="10" y="91" width="135" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="component"
      ComponentGuid="953a6f47-b453-4d6f-96eb-d67f2a222bcf"
      ComponentVersion="dPdDs3WsUtvPUYJ6ZgJ2Jw=="
      SupportedLanguages=""
      __environment='"acc"'
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition=""
      id="574"
    >
      <mxCell
        style="component3Node;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-513.5" y="-830" width="155" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="getEnvironment" id="575">
      <mxCell style="componentInnerNode" parent="574" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="34" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="576"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="573"
      target="567"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="-435.5" y="-339" as="sourcePoint" />
        <mxPoint x="-435" y="20" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="578"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="572"
      target="567"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="ff4d0c4c-7a8e-4c7d-a7ee-cca186ea2873"
      LibraryVersion="null"
      SupportedLanguages=""
      id="579"
    >
      <mxCell style="globalLibraryNode;" parent="baselayer" vertex="1">
        <mxGeometry x="-780" y="-960" width="180" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_1_globalConfig" id="580">
      <mxCell style="globalLibraryInnerNode;" parent="579" vertex="1">
        <mxGeometry x="10" y="16" width="160" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="92f0ecdb-bdb1-4c76-bce5-0f2a822379da"
      LibraryVersion="null"
      SupportedLanguages=""
      id="581"
    >
      <mxCell style="globalLibraryNode;" parent="baselayer" vertex="1">
        <mxGeometry x="-780" y="-870" width="180" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_2_runtime" id="582">
      <mxCell style="globalLibraryInnerNode;" parent="581" vertex="1">
        <mxGeometry x="10" y="16" width="160" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="dbb79182-33e8-4733-b4a4-f735d07e7bc9"
      LibraryVersion="null"
      SupportedLanguages=""
      id="583"
    >
      <mxCell style="globalLibraryNode;" parent="baselayer" vertex="1">
        <mxGeometry x="-780" y="-780" width="180" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_3_vocallsEnv" id="584">
      <mxCell style="globalLibraryInnerNode;" parent="583" vertex="1">
        <mxGeometry x="10" y="16" width="160" height="34" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="585"
      value='&lt;font style="font-size: 27px"&gt;__environment = environment;&lt;br&gt;__rtBaseUrl = _rtBaseUrl;&lt;br&gt;__rtTuiCheckAccessEndpoint = /api/Guard/AnyGuardWithPhoneNumberAndConfig?guardConfigId=1&amp;amp;phonenumber=%2B32478306999&amp;amp;originGuardId=0&#39;;;&lt;br&gt;__rtTuiGetStateEndpoint = /api/Guard/AnyGuardWithPhoneNumberAndConfig?guardConfigId=1&amp;amp;phonenumber=%2B32478306999&amp;amp;originGuardId=0&#39;;&lt;br&gt;__rtTuiActivateEndpoint = _rtTuiActivateEndpoint;&lt;br&gt;__rtTuiDeactivateEndpoint = _rtTuiDeactivateEndpoint;&lt;/font&gt;'
      style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=17;connectable=0;allowArrows=0;"
      parent="baselayer"
      vertex="1"
    >
      <mxGeometry x="-260" y="-950" width="2680" height="580" as="geometry" />
    </mxCell>
  </root>
</mxGraphModel>;
