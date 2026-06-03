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
      Code='__rtParams = {};&#xa;&#xa;/**&#xa; * Replaces the last &apos;-&apos;-separated segment of context.currentNode.id with the supplied nodeId.&#xa; * Returns the original nodeId untouched when context.currentNode.id is not set.&#xa; *&#xa; * @param {string|number} nodeId - The short id to splice into the current node path.&#xa; * @returns {string} The fully-qualified node id, or the original nodeId if no path is set.&#xa; */&#xa;__makeLocalNodeId = function (nodeId) {&#xa;    if (nodeId !== null &amp;&amp; nodeId !== undefined) nodeId = nodeId.toString();&#xa;    if (!context.currentNode.id) return nodeId;&#xa;    var __separator = &apos;-&apos;;&#xa;    var __output = context.currentNode.id.split(__separator);&#xa;    __output[__output.length - 1] = nodeId;&#xa;    return __output.join(__separator);&#xa;};&#xa;&#xa;/**&#xa; * Normalises operation config: JSON string -&gt; parsed; { Params: {...} } -&gt; Params; flat object -&gt; itself; null -&gt; {}.&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Flat Params object, never null.&#xa; */&#xa;__extractParams = function (config) {&#xa;    var __parsed = typeof config === &apos;string&apos; ? JSON.parse(config) : config;&#xa;    if (__parsed &amp;&amp; typeof __parsed.Params === &apos;object&apos; &amp;&amp; __parsed.Params !== null) return __parsed.Params;&#xa;    return __parsed || {};&#xa;};&#xa;&#xa;/**&#xa; * Component-local alias for the global activeFlag() (rtds_3_vocallsEnv.js) --&#xa; * the single Active-coercion contract. See conventions/params.md.&#xa; *&#xa; * @param {*} value&#xa; * @returns {boolean}&#xa; */&#xa;__activeFlag = function (value) {&#xa;    return activeFlag(value);&#xa;};&#xa;&#xa;/**&#xa; * Resolves Params into a flat { Key: value } map. The value&#39;s TYPE is whatever&#xa; * the JSON wrote -- no Number coercion (&#39;4&#39; stays a string, 4 stays a number).&#xa; * Per key: array-form [value, ...flags] is unwrapped to its first element&#xa; * (matches the runtime twin getParam; GUI flags isDisplayed/isEditable are&#xa; * runtime-irrelevant). Active is then coerced to a real boolean via __activeFlag.&#xa; * Every other STRING value is trimmed and has ${name} placeholders resolved via&#xa; * resolveConfigTokens (varObj first, then global; bare names only; String.replace,&#xa; * never new Function -- the Vocalls runtime disables string-eval). Non-strings pass&#xa; * through with their type intact. Unresolved placeholders are left raw and warned.&#xa; * Active absent: not defaulted here -- the read site decides (SetVariables true,&#xa; * Send and guard default false).&#xa; *&#xa; * @param {string|object} config - Raw operation config (see __extractParams).&#xa; * @returns {object} Map of Key -&gt; resolved value (no __rt prefix; v2 shape).&#xa; */&#xa;__setupConfig = function (config) {&#xa;    var __params = __extractParams(config);&#xa;    var __result = {};&#xa;    var __keys = Object.keys(__params);&#xa;    for (var __i = 0; __i &lt; __keys.length; __i++) {&#xa;        var __key = __keys[__i];&#xa;        var __value = __params[__key];&#xa;        if (Array.isArray(__value)) __value = __value.length ? __value[0] : &#39;&#39;;&#xa;        if (__key === &#39;Active&#39;) { __result.Active = __activeFlag(__value); continue; }&#xa;        if (typeof __value === &#39;string&#39;) __value = resolveConfigTokens(__value.trim(), __key);&#xa;        __result[__key] = __value;&#xa;    }&#xa;    return __result;&#xa;};&#xa;&#xa;// --- v2 object-access helpers ---&#xa;// Declared with `typeof &lt;name&gt; === &apos;undefined&apos;` guards so they fall back to local definitions&#xa;// when rtds_globalCodeAndHelpers.js has not yet been updated to expose them.&#xa;&#xa;if (typeof getValue === &apos;undefined&apos;) {&#xa;    /**&#xa;     * Returns the value of `key` from `obj`, or `defaultValue` if the key is absent.&#xa;     * Case-insensitive lookup: matches whichever own property name lowercases to the same string.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getValue = function (obj, key, defaultValue) {&#xa;        if (!obj || !key) return defaultValue;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return obj[__propertyName];&#xa;            }&#xa;        }&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof walk === &apos;undefined&apos;) {&#xa;    /**&#xa;     * Iterates own properties of `obj`, calling fn(key, value) for each. Returning false stops the walk.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {function} fn&#xa;     * @returns {void}&#xa;     */&#xa;    walk = function (obj, fn) {&#xa;        if (!obj) return;&#xa;        for (var __key in obj) {&#xa;            if (!obj.hasOwnProperty(__key)) continue;&#xa;            if (fn(__key, obj[__key]) === false) return;&#xa;        }&#xa;    };&#xa;}&#xa;&#xa;if (typeof nowUTC === &apos;undefined&apos;) {&#xa;    /**&#xa;     * @returns {string} Current date/time as ISO-8601 UTC.&#xa;     */&#xa;    nowUTC = function () { return new Date().toISOString(); };&#xa;}&#xa;&#xa;if (typeof hasKey === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Case-insensitive existence check (own properties).&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @returns {boolean}&#xa;     */&#xa;    hasKey = function (obj, key) {&#xa;        if (!obj || !key) return false;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return true;&#xa;            }&#xa;        }&#xa;        return false;&#xa;    };&#xa;}&#xa;&#xa;if (typeof getScoped === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Reads operator data with the RTDS scope contract: varObj[key]&#xa;     * (case-insensitive) first, then exact-case global[key], then defaultValue.&#xa;     * See conventions/storage.md.&#xa;     *&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getScoped = function (key, defaultValue) {&#xa;        if (defaultValue === undefined) defaultValue = null;&#xa;        if (!key) return defaultValue;&#xa;        var __vo = (typeof varObj !== &#39;undefined&#39;) ? varObj : null;&#xa;        if (__vo &amp;&amp; hasKey(__vo, key)) return getValue(__vo, key, defaultValue);&#xa;        var __scope = (typeof global !== &#39;undefined&#39;) ? global : ((typeof globalThis !== &#39;undefined&#39;) ? globalThis : null);&#xa;        if (__scope &amp;&amp; __scope[key] !== undefined &amp;&amp; __scope[key] !== null) return __scope[key];&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof resolveConfigTokens === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Substitutes ${name} placeholders in a string via getScoped (varObj first,&#xa;     * then global). Bare identifiers only (${w+}); no expressions. A placeholder&#xa;     * that resolves nowhere is left raw and a warn is logged (never silent &#39;&#39;).&#xa;     * String.replace only -- the Vocalls runtime disables string-eval.&#xa;     *&#xa;     * @param {string} raw&#xa;     * @param {string} keyName&#xa;     * @returns {string}&#xa;     */&#xa;    resolveConfigTokens = function (raw, keyName) {&#xa;        if (typeof raw !== &#39;string&#39; || raw.indexOf(&#39;${&#39;) === -1) return raw;&#xa;        var __MISSING = &#39; __rtUnresolved &#39;;&#xa;        return raw.replace(/\$\{(\w+)\}/g, function (__match, __name) {&#xa;            var __sub = getScoped(__name, __MISSING);&#xa;            if (__sub !== __MISSING) return String(__sub);&#xa;            Logger.warn(&#39;[resolveConfigTokens] unresolved placeholder&#39;, { key: keyName, placeholder: __name });&#xa;            return __match;&#xa;        });&#xa;    };&#xa;}&#xa;&#xa;'
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&apos;nl&apos;:{&apos;isDefault&apos;:true,&apos;languageName&apos;:&apos;Dutch (Belgium)&apos;,&apos;ttsLanguageCode&apos;:&apos;nl-BE&apos;,&apos;ttsVoiceName&apos;:&apos;&apos;,&apos;ttsEngine&apos;:&apos;&apos;,&apos;ttsPitch&apos;:&apos;&apos;,&apos;ttsSpeed&apos;:&apos;&apos;,&apos;ttsVolume&apos;:&apos;&apos;,&apos;prosodyBaseEnabled&apos;:true,&apos;prosodyContourEnabled&apos;:false}}"
      Variables='__configJSON = {&#xa;    &quot;Active&quot;: false,&#xa;    &quot;ConfigId&quot;: &quot;&quot;,&#xa;    &quot;PhoneNumberVar&quot;: &quot;ani&quot;,&#xa;    &quot;Timeout&quot;: 10000,&#xa;    &quot;Prompt&quot;: &quot;To activate this number, press 7. To deactivate this number, press 3.&quot;,&#xa;    &quot;ResultActivated&quot;: &quot;Your number is successfully activated.&quot;,&#xa;    &quot;ResultDeactivated&quot;: &quot;Your number is successfully deactivated.&quot;,&#xa;    &quot;ResultOnlyActive&quot;: &quot;You are currently the only active member, therefore you are not able to deactivate yourself.&quot;,&#xa;    &quot;ResultDenied&quot;: &quot;You are not allowed to use this service. If you disagree, contact your administrator. Thank you for calling.&quot;,&#xa;    &quot;ResultError&quot;: &quot;We encountered a technical issue. Contact your administrator to report this issue.&quot;,&#xa;    &quot;NextStep&quot;: &quot;00010&quot;,&#xa;    &quot;NextStep_Success&quot;: &quot;00011&quot;,&#xa;    &quot;NextStep_Denied&quot;: &quot;00012&quot;,&#xa;    &quot;NextStep_Failure&quot;: &quot;00099&quot;&#xa;};&#xa;__environment = environment;&#xa;__rtBaseUrl = _rtBaseUrl;&#xa;__rtTuiCheckAccessEndpoint = _rtTuiCheckAccessEndpoint;&#xa;__rtTuiGetStateEndpoint = _rtTuiGetStateEndpoint;&#xa;__rtTuiActivateEndpoint = _rtTuiActivateEndpoint;&#xa;__rtTuiDeactivateEndpoint = _rtTuiDeactivateEndpoint;&#xa;__rtNextStep &amp;= _rtNextStep;'
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
      Code='__rtParams = __setupConfig(__configJSON);&#xa;if (!_headers) { _headers = {}; }&#xa;__guardTuiGuardId = &apos;&apos;;&#xa;Logger.debug(&apos;[guardTui] config resolved&apos;, { params: __rtParams });'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="7"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="233.5" y="-230" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='global[_rtNextStep] = getValue(__rtParams, &apos;NextStep&apos;, &apos;&apos;);&#xa;&#xa;if (!getValue(__rtParams, &apos;Active&apos;, false)) {&#xa;    Logger.info(&apos;[guardTui] skipped -- inactive&apos;, { nextStep: global[_rtNextStep] });&#xa;    return;&#xa;}&#xa;&#xa;var __ani = getScoped(getValue(__rtParams, &apos;PhoneNumberVar&apos;, &apos;ani&apos;), null);&#xa;var __configId = getValue(__rtParams, &apos;ConfigId&apos;, &apos;&apos;);&#xa;if (!__configId || !__ani) {&#xa;    global[_rtNextStep] = getValue(__rtParams, &apos;NextStep_Failure&apos;, &apos;&apos;);&#xa;    Logger.warn(&apos;[guardTui] missing ConfigId or phone number&apos;, { configId: __configId, nextStep: global[_rtNextStep] });&#xa;    return;&#xa;}&#xa;&#xa;global[_rtNextStep] = getValue(__rtParams, &apos;NextStep_Failure&apos;, &apos;&apos;);&#xa;var __timeout = Number(getValue(__rtParams, &apos;Timeout&apos;, 10000));&#xa;var __urlCheck = __rtBaseUrl + __rtTuiCheckAccessEndpoint + &apos;/&apos; + __configId + &apos;/&apos; + __ani + &apos;/0&apos;;&#xa;&#xa;return jsonHttpRequest(__urlCheck, { method: &apos;GET&apos;, &quot;timeout&quot;: __timeout }, _headers, null).then(&#xa;    function (result) {&#xa;        if (!result || result.success !== true) {&#xa;            Logger.warn(&apos;[guardTui] eligibility check failed&apos;, { statusCode: result &amp;&amp; result.statusCode, nextStep: global[_rtNextStep] });&#xa;            return;&#xa;        }&#xa;        if (String(result.response).toLowerCase() !== &apos;true&apos;) {&#xa;            global[_rtNextStep] = getValue(__rtParams, &apos;NextStep_Denied&apos;, &apos;&apos;);&#xa;            Logger.info(&apos;[guardTui] denied&apos;, { nextStep: global[_rtNextStep] });&#xa;            return;&#xa;        }&#xa;        var __urlState = __rtBaseUrl + __rtTuiGetStateEndpoint + &apos;/&apos; + __ani + &apos;/&apos; + __configId;&#xa;        return jsonHttpRequest(__urlState, { method: &apos;GET&apos;, &quot;timeout&quot;: __timeout }, _headers, null).then(&#xa;            function (state) {&#xa;                if (!state || state.success !== true || !state.response || state.response.id === undefined || state.response.id === null) {&#xa;                    Logger.warn(&apos;[guardTui] state lookup failed&apos;, { statusCode: state &amp;&amp; state.statusCode, nextStep: global[_rtNextStep] });&#xa;                    return;&#xa;                }&#xa;                __guardTuiGuardId = String(state.response.id);&#xa;                global[_rtNextStep] = getValue(__rtParams, &apos;NextStep&apos;, &apos;&apos;);&#xa;                Logger.info(&apos;[guardTui] menu staged&apos;, { guardId: __guardTuiGuardId, nextStep: global[_rtNextStep] });&#xa;            },&#xa;            function (err) { Logger.error(&apos;[guardTui] state lookup error&apos;, { nextStep: global[_rtNextStep] }, err); }&#xa;        );&#xa;    },&#xa;    function (err) { Logger.error(&apos;[guardTui] eligibility check error&apos;, { nextStep: global[_rtNextStep] }, err); }&#xa;);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="29"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="233.5" y="-70" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="route"
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="200"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="237.5" y="90" width="160" height="156" as="geometry" />
      </mxCell>
    </object>
    <object id="201">
      <mxCell style="caseInnerNode" parent="200" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="denied" SubType="expression" Expression="_rtNextStep == getValue(__rtParams, 'NextStep_Denied', '')" DynamicNextId="" id="202">
      <mxCell style="expressionNode" parent="200" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="failure" SubType="expression" Expression="_rtNextStep == getValue(__rtParams, 'NextStep_Failure', '')" DynamicNextId="" id="203">
      <mxCell style="expressionNode" parent="200" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="menu" SubType="expression" Expression="__guardTuiGuardId != ''" DynamicNextId="" id="204">
      <mxCell style="expressionNode" parent="200" vertex="1">
        <mxGeometry x="10" y="116" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" SubType="default" DynamicNextId="" id="205">
      <mxCell style="defaultNode" parent="200" vertex="1">
        <mxGeometry x="10" y="146" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="denied"
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
      id="220"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="477.5" y="90" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="error"
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
      id="221"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="477.5" y="210" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="prompt"
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
      id="101"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="174" y="326" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="menu"
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
        <mxGeometry x="237.5" y="486" width="160" height="200" as="geometry" />
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
    <object label="not recognized" DynamicNextId="" SubType="notRecognized" id="113">
      <mxCell style="notRecognizedNode" parent="102" vertex="1">
        <mxGeometry x="10" y="146" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="toggleDeactivate"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='global[_rtNextStep] = getValue(__rtParams, &apos;NextStep_Failure&apos;, &apos;&apos;);&#xa;if (!__guardTuiGuardId) {&#xa;    Logger.warn(&apos;[guardTui] deactivate missing guardId&apos;, { nextStep: global[_rtNextStep] });&#xa;    return;&#xa;}&#xa;var __url = __rtBaseUrl + __rtTuiDeactivateEndpoint + &apos;/&apos; + __guardTuiGuardId;&#xa;var __timeout = Number(getValue(__rtParams, &apos;Timeout&apos;, 10000));&#xa;return jsonHttpRequest(__url, { method: &apos;POST&apos;, &quot;timeout&quot;: __timeout }, _headers, null).then(&#xa;    function (result) {&#xa;        if (!result || result.success !== true) {&#xa;            Logger.warn(&apos;[guardTui] deactivate failed&apos;, { statusCode: result &amp;&amp; result.statusCode, nextStep: global[_rtNextStep] });&#xa;            return;&#xa;        }&#xa;        if (String(result.response).toLowerCase() === &apos;true&apos;) {&#xa;            global[_rtNextStep] = getValue(__rtParams, &apos;NextStep_Success&apos;, &apos;&apos;);&#xa;            Logger.info(&apos;[guardTui] deactivated&apos;, { nextStep: global[_rtNextStep] });&#xa;            return;&#xa;        }&#xa;        global[_rtNextStep] = getValue(__rtParams, &apos;NextStep&apos;, &apos;&apos;);&#xa;        Logger.info(&apos;[guardTui] only active member&apos;, { nextStep: global[_rtNextStep] });&#xa;    },&#xa;    function (err) { Logger.error(&apos;[guardTui] deactivate error&apos;, { nextStep: global[_rtNextStep] }, err); }&#xa;);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="150"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="233.5" y="766" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="toggleActivate"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='global[_rtNextStep] = getValue(__rtParams, &apos;NextStep_Failure&apos;, &apos;&apos;);&#xa;if (!__guardTuiGuardId) {&#xa;    Logger.warn(&apos;[guardTui] activate missing guardId&apos;, { nextStep: global[_rtNextStep] });&#xa;    return;&#xa;}&#xa;var __url = __rtBaseUrl + __rtTuiActivateEndpoint + &apos;/&apos; + __guardTuiGuardId;&#xa;var __timeout = Number(getValue(__rtParams, &apos;Timeout&apos;, 10000));&#xa;return jsonHttpRequest(__url, { method: &apos;POST&apos;, &quot;timeout&quot;: __timeout }, _headers, null).then(&#xa;    function (result) {&#xa;        if (result &amp;&amp; result.success === true &amp;&amp; String(result.response).toLowerCase() === &apos;true&apos;) {&#xa;            global[_rtNextStep] = getValue(__rtParams, &apos;NextStep_Success&apos;, &apos;&apos;);&#xa;            Logger.info(&apos;[guardTui] activated&apos;, { nextStep: global[_rtNextStep] });&#xa;            return;&#xa;        }&#xa;        Logger.warn(&apos;[guardTui] activate failed&apos;, { statusCode: result &amp;&amp; result.statusCode, nextStep: global[_rtNextStep] });&#xa;    },&#xa;    function (err) { Logger.error(&apos;[guardTui] activate error&apos;, { nextStep: global[_rtNextStep] }, err); }&#xa;);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="151"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="477.5" y="486" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="routeDeactivate"
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="450"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="237.5" y="926" width="160" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="451">
      <mxCell style="caseInnerNode" parent="450" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="success" SubType="expression" Expression="_rtNextStep == getValue(__rtParams, 'NextStep_Success', '')" DynamicNextId="" id="452">
      <mxCell style="expressionNode" parent="450" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="onlyActive" SubType="expression" Expression="_rtNextStep == getValue(__rtParams, 'NextStep', '')" DynamicNextId="" id="453">
      <mxCell style="expressionNode" parent="450" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" SubType="default" DynamicNextId="" id="454">
      <mxCell style="defaultNode" parent="450" vertex="1">
        <mxGeometry x="10" y="116" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="deactivated"
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
      id="460"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="174" y="1132" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="onlyActive"
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
      id="461"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="477.5" y="926" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="errorDeactivate"
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
      id="462"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="477.5" y="1046" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="routeActivate"
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="550"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="410" y="790" width="160" height="96" as="geometry" />
      </mxCell>
    </object>
    <object id="551">
      <mxCell style="caseInnerNode" parent="550" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="success" SubType="expression" Expression="_rtNextStep == getValue(__rtParams, 'NextStep_Success', '')" DynamicNextId="" id="552">
      <mxCell style="expressionNode" parent="550" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" SubType="default" DynamicNextId="" id="553">
      <mxCell style="defaultNode" parent="550" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="activated"
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
      id="560"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="700" y="960" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="errorActivate"
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
      id="561"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="1000" y="960" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="errorDtmf"
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
      id="170"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="477.5" y="606" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="output"
      Type="transient"
      OnEnter="Logger.info(&apos;[guardTui] exit&apos;, { nextStep: __rtNextStep });"
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
        <mxGeometry x="252.5" y="1292" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell id="28" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;" parent="baselayer" source="0" target="7" edge="1">
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="317.5" y="-400" as="sourcePoint" />
        <mxPoint x="317.5" y="-240" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell id="30" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;" parent="baselayer" source="7" target="29" edge="1">
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="317.5" y="190" as="sourcePoint" />
        <mxPoint x="317.5" y="430" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell id="300" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="29" target="200" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="301" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" parent="baselayer" source="202" target="220" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="302" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" parent="baselayer" source="203" target="221" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="303" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="204" target="101" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="304" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="205" target="6" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="310" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="220" target="6" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="311" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="221" target="6" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="312" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="101" target="102" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="320" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="110" target="150" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="321" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="111" target="151" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="322" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" parent="baselayer" source="112" target="170" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="323" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" parent="baselayer" source="113" target="170" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="330" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="170" target="6" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="400" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="150" target="450" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="401" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="151" target="550" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="410" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="452" target="460" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="411" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="453" target="461" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="412" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="454" target="462" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="420" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="460" target="6" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="421" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="461" target="6" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="422" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="462" target="6" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="510" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="552" target="560" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="511" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="553" target="561" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="520" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="560" target="6" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="521" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="561" target="6" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
  </root>
</mxGraphModel>
