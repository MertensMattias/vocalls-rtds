<mxGraphModel
  dx="6215"
  dy="4341"
  grid="1"
  gridSize="10"
  guides="1"
  tooltips="1"
  connect="1"
  arrows="1"
  fold="1"
  page="1"
  pageScale="1"
  pageWidth="827"
  pageHeight="1169"
>
  <root>
    <object
      label=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      SpeechRecognitionEngine=""
      Code="__rtParams = {};&#xa;&#xa;/**&#xa; * Replaces the last &#39;-&#39;-separated segment of context.currentNode.id with the supplied nodeId.&#xa; * Returns the original nodeId untouched when context.currentNode.id is not set.&#xa; *&#xa; * @param {string|number} nodeId - The short id to splice into the current node path.&#xa; * @returns {string} The fully-qualified node id, or the original nodeId if no path is set.&#xa; */&#xa;__makeLocalNodeId = function (nodeId) {&#xa;    if (nodeId !== null &amp;&amp; nodeId !== undefined) nodeId = nodeId.toString();&#xa;    if (!context.currentNode.id) return nodeId;&#xa;    var __separator = &#39;-&#39;;&#xa;    var __output = context.currentNode.id.split(__separator);&#xa;    __output[__output.length - 1] = nodeId;&#xa;    return __output.join(__separator);&#xa;};&#xa;&#xa;/**&#xa; * Normalises operation config: JSON string -&gt; parsed; { Params: {...} } -&gt; Params; flat object -&gt; itself; null -&gt; {}.&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Flat Params object, never null.&#xa; */&#xa;__extractParams = function (config) {&#xa;    var __parsed = typeof config === &#39;string&#39; ? JSON.parse(config) : config;&#xa;    if (__parsed &amp;&amp; typeof __parsed.params === &#39;object&#39; &amp;&amp; __parsed.params !== null) return __parsed.params;&#xa;    return __parsed || {};&#xa;};&#xa;&#xa;/**&#xa; * Component-local alias for the global activeFlag() (rtds_3_vocallsEnv.js) --&#xa; * the single Active-coercion contract. See conventions/params.md.&#xa; *&#xa; * @param {*} value&#xa; * @returns {boolean}&#xa; */&#xa;__activeFlag = function (value) {&#xa;    return activeFlag(value);&#xa;};&#xa;&#xa;/**&#xa; * Resolves Params into a flat { Key: value } map. The value&#39;s TYPE is whatever&#xa; * the JSON wrote -- no Number coercion (&#39;4&#39; stays a string, 4 stays a number).&#xa; * Per key: array-form [value, ...flags] is unwrapped to its first element&#xa; * (matches the runtime twin getParam; GUI flags isDisplayed/isEditable are&#xa; * runtime-irrelevant). Active is then coerced to a real boolean via __activeFlag.&#xa; * Every other STRING value is trimmed and has ${name} placeholders resolved via&#xa; * resolveConfigTokens (varObj first, then global; bare names only; String.replace,&#xa; * never new Function -- the Vocalls runtime disables string-eval). Non-strings pass&#xa; * through with their type intact. Unresolved placeholders are left raw and warned.&#xa; * Active absent: not defaulted here -- the read site decides (SetVariables true,&#xa; * Send and guard default false).&#xa; *&#xa; * @param {string|object} config - Raw operation config (see __extractParams).&#xa; * @returns {object} Map of Key -&gt; resolved value (no __rt prefix; v2 shape).&#xa; */&#xa;__setupConfig = function (config) {&#xa;    var __params = __extractParams(config);&#xa;    var __result = {};&#xa;    var __keys = Object.keys(__params);&#xa;    for (var __i = 0; __i &lt; __keys.length; __i++) {&#xa;        var __key = __keys[__i];&#xa;        var __value = __params[__key];&#xa;        if (Array.isArray(__value)) __value = __value.length ? __value[0] : &#39;&#39;;&#xa;        if (__key === &#39;active&#39;) { __result.active = __activeFlag(__value); continue; }&#xa;        if (typeof __value === &#39;string&#39;) __value = resolveConfigTokens(__value.trim(), __key);&#xa;        __result[__key] = __value;&#xa;    }&#xa;    return __result;&#xa;};&#xa;&#xa;// --- v2 object-access helpers ---&#xa;// Declared with `typeof &lt;name&gt; === &#39;undefined&#39;` guards so they fall back to local definitions&#xa;// when rtds_globalCodeAndHelpers.js has not yet been updated to expose them.&#xa;&#xa;if (typeof getValue === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Returns the value of `key` from `obj`, or `defaultValue` if the key is absent.&#xa;     * Case-insensitive lookup: matches whichever own property name lowercases to the same string.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getValue = function (obj, key, defaultValue) {&#xa;        if (!obj || !key) return defaultValue;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return obj[__propertyName];&#xa;            }&#xa;        }&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof walk === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Iterates own properties of `obj`, calling fn(key, value) for each. Returning false stops the walk.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {function} fn&#xa;     * @returns {void}&#xa;     */&#xa;    walk = function (obj, fn) {&#xa;        if (!obj) return;&#xa;        for (var __key in obj) {&#xa;            if (!obj.hasOwnProperty(__key)) continue;&#xa;            if (fn(__key, obj[__key]) === false) return;&#xa;        }&#xa;    };&#xa;}&#xa;&#xa;if (typeof nowUTC === &#39;undefined&#39;) {&#xa;    /**&#xa;     * @returns {string} Current date/time as ISO-8601 UTC.&#xa;     */&#xa;    nowUTC = function () { return new Date().toISOString(); };&#xa;}&#xa;&#xa;if (typeof hasKey === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Case-insensitive existence check (own properties).&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @returns {boolean}&#xa;     */&#xa;    hasKey = function (obj, key) {&#xa;        if (!obj || !key) return false;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return true;&#xa;            }&#xa;        }&#xa;        return false;&#xa;    };&#xa;}&#xa;&#xa;if (typeof getScoped === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Reads operator data with the RTDS scope contract: varObj[key]&#xa;     * (case-insensitive) first, then exact-case global[key], then defaultValue.&#xa;     * See conventions/storage.md.&#xa;     *&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getScoped = function (key, defaultValue) {&#xa;        if (defaultValue === undefined) defaultValue = null;&#xa;        if (!key) return defaultValue;&#xa;        var __vo = (typeof varObj !== &#39;undefined&#39;) ? varObj : null;&#xa;        if (__vo &amp;&amp; hasKey(__vo, key)) return getValue(__vo, key, defaultValue);&#xa;        var __scope = (typeof global !== &#39;undefined&#39;) ? global : ((typeof globalThis !== &#39;undefined&#39;) ? globalThis : null);&#xa;        if (__scope &amp;&amp; __scope[key] !== undefined &amp;&amp; __scope[key] !== null) return __scope[key];&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof resolveConfigTokens === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Substitutes ${name} placeholders in a string via getScoped (varObj first,&#xa;     * then global). Bare identifiers only (${w+}); no expressions. A placeholder&#xa;     * that resolves nowhere is left raw and a warn is logged (never silent &#39;&#39;).&#xa;     * String.replace only -- the Vocalls runtime disables string-eval.&#xa;     *&#xa;     * @param {string} raw&#xa;     * @param {string} keyName&#xa;     * @returns {string}&#xa;     */&#xa;    resolveConfigTokens = function (raw, keyName) {&#xa;        if (typeof raw !== &#39;string&#39; || raw.indexOf(&#39;${&#39;) === -1) return raw;&#xa;        var __MISSING = &#39; __rtUnresolved &#39;;&#xa;        return raw.replace(/\$\{(\w+)\}/g, function (__match, __name) {&#xa;            var __sub = getScoped(__name, __MISSING);&#xa;            if (__sub !== __MISSING) return String(__sub);&#xa;            Logger.warn(&#39;[resolveConfigTokens] unresolved placeholder&#39;, { key: keyName, placeholder: __name });&#xa;            return __match;&#xa;        });&#xa;    };&#xa;}"
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch (Belgium)&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-BE&#39;,&#39;ttsVoiceName&#39;:&#39;&#39;,&#39;ttsEngine&#39;:&#39;&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:false},&#39;fr&#39;:{&#39;languageName&#39;:&#39;French&#39;,&#39;ttsLanguageCode&#39;:&#39;fr-BE&#39;,&#39;ttsVoiceName&#39;:&#39;fr-BE-Luc&#39;,&#39;ttsEngine&#39;:&#39;ElevenLabs&#39;,&#39;prosodyBaseEnabled&#39;:false,&#39;prosodyContourEnabled&#39;:false,&#39;isDefault&#39;:false},&#39;de&#39;:{&#39;languageName&#39;:&#39;German&#39;,&#39;ttsLanguageCode&#39;:&#39;de-DE&#39;,&#39;ttsVoiceName&#39;:&#39;de-DE-KatjaNeural&#39;,&#39;ttsEngine&#39;:&#39;Microsoft&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:true,&#39;isDefault&#39;:false},&#39;en&#39;:{&#39;languageName&#39;:&#39;English&#39;,&#39;ttsLanguageCode&#39;:&#39;en-GB&#39;,&#39;ttsVoiceName&#39;:&#39;en-GB-Luc&#39;,&#39;ttsEngine&#39;:&#39;ElevenLabs&#39;,&#39;prosodyBaseEnabled&#39;:false,&#39;prosodyContourEnabled&#39;:false,&#39;isDefault&#39;:false}}"
      Variables='__configJSON = {&#xa;    "active": true,&#xa;    "configId": 1,&#xa;    "configName": "KLANTWACHT",&#xa;    "phoneNumberVar": "ani",&#xa;    "timeout": 10000,&#xa;    "resultCurrentlyActivated_NL": "U bent momenteel actief voor de wachtdienst ${CustomerProject}.",&#xa;    "resultCurrentlyDeactivated_NL": "U bent momenteel niet actief op ${CustomerProject}.",&#xa;    "promptActivate_NL": "Druk op 7 om uzelf te activeren.",&#xa;    "promptDeactivate_NL": "Druk op 3 om uzelf te deactiveren.",&#xa;    "resultActivated_NL": "Uw nummer is succesvol geactiveerd.",&#xa;    "resultDeactivated_NL": "Uw nummer is succesvol gedeactiveerd.",&#xa;    "resultOnlyActive_NL": "U bent momenteel als enige geactiveerd. Daarom kunt u zichzelf nu niet deactiveren.",&#xa;    "resultDenied_NL": "U bent niet bevoegd om van deze dienst gebruik te maken. Gelieve contact op te nemen met uw verantwoordelijke indien u hierover vragen heeft.",&#xa;    "resultError_NL": "Er is een technische fout opgetreden. Gelieve dit probleem te melden aan uw verantwoordelijke.",&#xa;    "nextStep": "00010",&#xa;    "nextStep_Success": "00011",&#xa;    "nextStep_Denied": "00012",&#xa;    "nextStep_Failure": "00099"&#xa;};&#xa;__environment = environment;&#xa;__rtBaseUrl = _rtBaseUrl;&#xa;__rtTuiCheckAccessEndpoint = _rtTuiCheckAccessEndpoint;&#xa;__rtTuiGetStateEndpoint = _rtTuiGetStateEndpoint;&#xa;__rtTuiActivateEndpoint = _rtTuiActivateEndpoint;&#xa;__rtTuiDeactivateEndpoint = _rtTuiDeactivateEndpoint;&#xa;__rtNextStep &amp;= _rtNextStep;'
      PropertiesDefinition='[&#xa;    {&#xa;        "name": "__configJSON",&#xa;        "title": "Operation config (JSON)",&#xa;        "hint": "Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "maxLength": 5000,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    },&#xa;    {&#xa;        "name": "__environment",&#xa;        "title": "Environment",&#xa;        "hint": "Deployment environment. Controls which RTDS API endpoint is called.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "defaultValue": "environment",&#xa;            "maxLength": 100,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    },&#xa;    {&#xa;        "name": "__nextStep",&#xa;        "title": "Next step (output variable name)",&#xa;        "hint": "Name of the session variable that will receive the next step Id after execution.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "defaultValue": "_rtNextStep",&#xa;            "maxLength": 100,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    }&#xa;]'
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      Translations=""
      ManualId=""
      RequiredVariables=""
      HintGrammar=""
      LastLanguage="nl"
      InfoAboutUser_nl=""
      CompanyInformation_nl=""
      GeneralKnowledge_nl=""
      Translations_nl=""
      InfoAboutUser_fr=""
      CompanyInformation_fr=""
      GeneralKnowledge_fr=""
      Translations_fr=""
      InfoAboutUser_de=""
      CompanyInformation_de=""
      GeneralKnowledge_de=""
      Translations_de=""
      InfoAboutUser_en=""
      CompanyInformation_en=""
      GeneralKnowledge_en=""
      Translations_en=""
      id="vocalls-master-layer"
    >
      <mxCell />
    </object>
    <mxCell id="baselayer" parent="vocalls-master-layer" />
    <mxCell
      id="643"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="0"
      target="7"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
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
        <mxGeometry x="-10" y="-680" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="init"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="language = (typeof language === &#39;string&#39; &amp;&amp; language.trim() !== &#39;&#39;)&#xa;    ? language.toUpperCase()&#xa;    : &#39;NL&#39;;&#xa;&#xa;__rtParams = __setupConfig(__configJSON);&#xa;if (!_headers) { _headers = {}; }"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="7"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="-29" y="-540" width="168" height="80" as="geometry" />
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
          <mxPoint x="-532" y="100" />
          <mxPoint x="-650" y="100" />
          <mxPoint x="-650" y="1230" />
          <mxPoint x="463" y="1230" />
        </Array>
      </mxGeometry>
    </mxCell>
    <object
      label="{getValue(__rtParams, &#39;resultDenied&#39; + &#39;_&#39; + language, &#39;&#39;)}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{getValue(__rtParams, &#39;resultDenied&#39; + &#39;_&#39; + language, &#39;&#39;)}"
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
      Text_fr=""
      AltTexts_fr=""
      Text_de=""
      AltTexts_de=""
      Text_en=""
      AltTexts_en=""
      id="220"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="-566.5" y="41" width="390" height="95" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{getValue(__rtParams, &#39;resultError&#39; + &#39;_&#39; + language, &#39;&#39;)}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{getValue(__rtParams, &#39;resultError&#39; + &#39;_&#39; + language, &#39;&#39;)}"
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
      Text_fr=""
      AltTexts_fr=""
      Text_de=""
      AltTexts_de=""
      Text_en=""
      AltTexts_en=""
      id="221"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="-566.5" y="190" width="390" height="95" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{getValue(__rtParams, &#39;resultDeactivated&#39; + &#39;_&#39; + language, &#39;&#39;)}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{getValue(__rtParams, &#39;resultDeactivated&#39; + &#39;_&#39; + language, &#39;&#39;)}"
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
      Text_fr=""
      AltTexts_fr=""
      Text_de=""
      AltTexts_de=""
      Text_en=""
      AltTexts_en=""
      id="460"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="368" y="730" width="390" height="95" as="geometry" />
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
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="120" y="665" />
          <mxPoint x="120" y="1160" />
          <mxPoint x="463" y="1160" />
        </Array>
      </mxGeometry>
    </mxCell>
    <object
      label="{getValue(__rtParams, &#39;resultOnlyActive&#39; + &#39;_&#39; + language, &#39;&#39;)}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{getValue(__rtParams, &#39;resultOnlyActive&#39; + &#39;_&#39; + language, &#39;&#39;)}"
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
      Text_fr=""
      AltTexts_fr=""
      Text_de=""
      AltTexts_de=""
      Text_en=""
      AltTexts_en=""
      id="461"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="368" y="625" width="390" height="95" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{getValue(__rtParams, &#39;resultError&#39; + &#39;_&#39; + language, &#39;&#39;)}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{getValue(__rtParams, &#39;resultError&#39; + &#39;_&#39; + language, &#39;&#39;)}"
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
      Text_fr=""
      AltTexts_fr=""
      Text_de=""
      AltTexts_de=""
      Text_en=""
      AltTexts_en=""
      id="462"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="1074.5" y="945" width="390" height="95" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{getValue(__rtParams, &#39;resultActivated&#39; + &#39;_&#39; + language, &#39;&#39;)}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{getValue(__rtParams, &#39;resultActivated&#39; + &#39;_&#39; + language, &#39;&#39;)}"
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
      Text_fr=""
      AltTexts_fr=""
      Text_de=""
      AltTexts_de=""
      Text_en=""
      AltTexts_en=""
      id="560"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="2100" y="653.5" width="390" height="95" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{getValue(__rtParams, &#39;resultError&#39; + &#39;_&#39; + language, &#39;&#39;)}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{getValue(__rtParams, &#39;resultError&#39; + &#39;_&#39; + language, &#39;&#39;)}"
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
      Text_fr=""
      AltTexts_fr=""
      Text_de=""
      AltTexts_de=""
      Text_en=""
      AltTexts_en=""
      id="561"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="1595" y="930" width="390" height="95" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{getValue(__rtParams, &#39;resultError&#39; + &#39;_&#39; + language, &#39;&#39;)}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{getValue(__rtParams, &#39;resultError&#39; + &#39;_&#39; + language, &#39;&#39;)}"
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
      Text_fr=""
      AltTexts_fr=""
      Text_de=""
      AltTexts_de=""
      Text_en=""
      AltTexts_en=""
      id="170"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="2460" y="-180" width="296" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="output"
      Type="transient"
      OnEnter="_rtNextStep = getValue(__rtParams, __rtOutcome, &#39;&#39;);&#xa;Logger.info(&#39;[guardTui] exit&#39;, { outcome: __rtOutcome, nextStep: _rtNextStep });"
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
        <mxGeometry x="398" y="1440" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="30"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="7"
      target="586"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="20" y="180" as="sourcePoint" />
        <mxPoint x="20" y="420" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="311"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="221"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="-580" y="238" />
          <mxPoint x="-580" y="1210" />
          <mxPoint x="463" y="1210" />
        </Array>
      </mxGeometry>
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
          <mxPoint x="2608" y="1260" />
          <mxPoint x="463" y="1260" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="420"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="460"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="240" y="778" />
          <mxPoint x="240" y="1120" />
          <mxPoint x="463" y="1120" />
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
          <mxPoint x="627" y="1250" />
          <mxPoint x="26" y="1250" />
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
          <mxPoint x="2295" y="1230" />
          <mxPoint x="463" y="1230" />
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
          <mxPoint x="1790" y="1240" />
          <mxPoint x="463" y="1240" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="585"
      value='&lt;font style="font-size: 27px"&gt;    "active": true,&lt;br/&gt;    "configId": 1,&lt;br/&gt;    "configName": "KLANTWACHT",&lt;br/&gt;    "phoneNumberVar": "ani",&lt;br/&gt;    "timeout": 10000,&lt;br/&gt;    "resultCurrentlyActivated_NL": "You are currently activated on guard configuration ${CustomerProject}",&lt;br/&gt;    "resultCurrentlyDeactivated_NL": "Your number is successfully activated.",&lt;br/&gt;    "promptActivate_NL": "To activate yourself, press 7.",&lt;br/&gt;    "promptDeactivate_NL": "To deactivate yourself, press 3.",&lt;br/&gt;    "resultActivated_NL": "Your number is successfully activated.",&lt;br/&gt;    "resultDeactivated_NL": "Your number is successfully deactivated.",&lt;br/&gt;    "resultOnlyActive_NL": "You are currently the only active member, therefore you are not able to deactivate yourself.",&lt;br/&gt;    "resultDenied_NL": "You are not allowed to use this service. If you disagree, contact your administrator. Thank you for calling.",&lt;br/&gt;    "resultError_NL": "We encountered a technical issue. Contact your administrator to report this issue.",&lt;br/&gt;    "nextStep": "00010",&lt;br/&gt;    "nextStep_Success": "00011",&lt;br/&gt;    "nextStep_Denied": "00012",&lt;br/&gt;    "nextStep_Failure": "00099"&lt;/font&gt;'
      style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=17;connectable=0;allowArrows=0;"
      parent="baselayer"
      vertex="1"
    >
      <mxGeometry x="510" y="-1169" width="2680" height="580" as="geometry" />
    </mxCell>
    <mxCell
      id="588"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="586"
      target="587"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="check access"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='__guardTuiGuardId = 0; &#xa;__guardTuiEligible = false; &#xa;_errorMessage = &#39;&#39;; &#xa;__rtOutcome = &#39;nextStep&#39;;&#xa;if (String(getValue(__rtParams, &#39;active&#39;, false)).toLowerCase() !== &#39;true&#39;) {&#xa;    Logger.info(&#39;[guardTui] skipped -- inactive&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;__rtOutcome = &#39;nextStep_Failure&#39;; &#xa;&#xa;&#xa;__ani = getScoped(getValue(__rtParams, &#39;phoneNumberVar&#39;, varObj.ani), null); &#xa;__configId = getValue(__rtParams, &#39;configId&#39;, &#39;&#39;); &#xa;__originGuardId = 0; &#xa; &#xa;if (!__configId || !__ani) { &#xa;    Logger.warn(&#39;[guardTui] misssing ConfigId or phone number&#39;, { configId: __configId, outcome: __rtOutcome }); &#xa;    return; &#xa;} &#xa; &#xa;&#xa; &#xa;var __method = &#39;GET&#39;; &#xa;var __timeout = Number(getValue(__rtParams, &#39;timeout&#39;, 10000)); &#xa;var __headers = _headers; &#xa;var __endpoint = __rtBaseUrl + __rtTuiCheckAccessEndpoint; &#xa;var __queryParameters = &#39;?guardConfigId=&#39; + encodeURIComponent(__configId) + &#xa;    &#39;&amp;phonenumber=&#39; + encodeURIComponent(__ani) + &#xa;    &#39;&amp;originGuardId=&#39; + encodeURIComponent(__originGuardId); &#xa; &#xa;log_debug(&#39;__urlCheck: &#39; + __endpoint + __queryParameters); &#xa; &#xa;__compRequest = jsonHttpRequest( &#xa;    __endpoint + __queryParameters, &#xa;    { method: __method, "timeout": __timeout }, &#xa;    __headers &#xa;); &#xa; &#xa;return __compRequest.then(function (result) { &#xa;    __resultObj = result.response; &#xa;    log_debug(&#39;result: &#39; + JSON.stringify(result)); &#xa;    if (result &amp;&amp; !result.success) { &#xa;        _errorMessage = "status: " + result.statusCode + ", error: " + result.error; &#xa;        Logger.warn(&#39;[guardTui] eligibility check failed&#39;, { error: _errorMessage, outcome: __rtOutcome }); &#xa;        return; &#xa;    } &#xa;    if (String(__resultObj).toLowerCase() !== &#39;true&#39;) { &#xa;        __rtOutcome = &#39;nextStep_Denied&#39;; &#xa;        Logger.info(&#39;[guardTui] denied&#39;, { outcome: __rtOutcome }); &#xa;        return; &#xa;    } &#xa;    __guardTuiEligible = true; &#xa;    Logger.info(&#39;[guardTui] eligible -- proceeding to state lookup&#39;, { configId: __configId }); &#xa;});'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="586"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="-29" y="-390" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="589"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="587"
      target="200"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="guard status"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='if (!__guardTuiEligible) { &#xa;    Logger.info(&#39;[guardTui] state lookup skipped -- not eligible&#39;, { outcome: __rtOutcome }); &#xa;    return; &#xa;} &#xa;&#xa;var __configId = getValue(__rtParams, &#39;configId&#39;, &#39;&#39;);&#xa;var __ani = getScoped(getValue(__rtParams, &#39;phoneNumberVar&#39;, varObj.ani), null); &#xa;&#xa;var __method = &#39;GET&#39;; &#xa;var __timeout = Number(getValue(__rtParams, &#39;timeout&#39;, 10000)); &#xa;var __headers = _headers; &#xa;var __endpoint = __rtBaseUrl + __rtTuiGetStateEndpoint; &#xa;var __queryParameters = &#39;?guardConfigId=&#39; + encodeURIComponent(__configId) +&#xa;    &#39;&amp;phonenumber=&#39; + encodeURIComponent(__ani);&#xa;&#xa;&#xa;log_debug(&#39;__urlState: &#39; + __endpoint + __queryParameters); &#xa; &#xa;__compRequest = jsonHttpRequest( &#xa;    __endpoint + __queryParameters, &#xa;    { method: __method, "timeout": __timeout }, &#xa;    __headers &#xa;); &#xa;&#xa;Logger.debug(&#39;[guardTui] state lookup&#39;, { ani: __ani, configId: __configId });&#xa;&#xa;return __compRequest.then(function (result) { &#xa;    __resultObj = result.response; &#xa;    __callSuccess = result.success; &#xa;    log_debug(&#39;result: &#39; + JSON.stringify(result)); &#xa;    if (!__callSuccess) { &#xa;        _errorMessage = "status: " + result.statusCode + ", error: " + result.error; &#xa;        Logger.warn(&#39;[guardTui] state lookup failed&#39;, { error: _errorMessage, outcome: __rtOutcome }); &#xa;        return; &#xa;    } &#xa;     if (typeof __resultObj === &#39;string&#39;) { &#xa;        try { &#xa;            __resultObj = JSON.parse(__resultObj); &#xa;        } catch (__parseError) { &#xa;            _errorMessage = &#39;state response parse failed&#39;; &#xa;            Logger.warn(&#39;[guardTui] state response parse failed&#39;, { outcome: __rtOutcome }); &#xa;            return; &#xa;        } &#xa;    }&#xa;    if (!__resultObj || !__resultObj.length || !__resultObj[0].guardID) { &#xa;        _errorMessage = &#39;state response empty or missing id&#39;; &#xa;        Logger.warn(&#39;[guardTui] state lookup failed&#39;, { statusCode: result.statusCode, outcome: __rtOutcome }); &#xa;        return; &#xa;    }&#xa;    &#xa;    __guardTuiGuardId = Number(__resultObj[0].guardID) || 0;&#xa;    __guardConfigID = __resultObj[0].guardConfigID;&#xa;    __guardActive = activeFlag(__resultObj[0].guardActive);&#xa;    __guardName = __resultObj[0].guardName;&#xa;&#xa;    __rtOutcome = &#39;nextStep&#39;; &#xa;    Logger.info(&#39;[guardTui] menu staged&#39;, { guardId: __guardTuiGuardId, active: __guardActive, outcome: __rtOutcome }); &#xa;});'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="587"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="-29" y="-120" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
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
        <mxGeometry x="920" y="625" width="336" height="156" as="geometry" />
      </mxCell>
    </object>
    <object id="451">
      <mxCell style="caseInnerNode" parent="450" vertex="1">
        <mxGeometry x="10" y="16" width="316" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__rtOutcome == &#39;NextStep&#39;"
      SubType="expression"
      Expression="__rtOutcome == &#39;NextStep&#39;"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="453"
    >
      <mxCell style="expressionNode" parent="450" vertex="1">
        <mxGeometry x="10" y="56" width="316" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__rtOutcome == &#39;NextStep_Success&#39;"
      SubType="expression"
      Expression="__rtOutcome == &#39;NextStep_Success&#39;"
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
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;"
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
    <object
      label=""
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="200"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="-120" y="80" width="350" height="300" as="geometry" />
      </mxCell>
    </object>
    <object id="201">
      <mxCell style="caseInnerNode" parent="200" vertex="1">
        <mxGeometry x="10" y="16" width="330" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__rtOutcome == &#39;NextStep_Denied&#39;"
      SubType="expression"
      Expression="__rtOutcome == &#39;NextStep_Denied&#39;"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="202"
    >
      <mxCell style="expressionNode" parent="200" vertex="1">
        <mxGeometry x="10" y="56" width="330" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__rtOutcome == &#39;NextStep_Failure&#39;"
      SubType="expression"
      Expression="__rtOutcome == &#39;NextStep_Failure&#39;"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="203"
    >
      <mxCell style="expressionNode" parent="200" vertex="1">
        <mxGeometry x="10" y="86" width="330" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__guardActive &amp;amp;&amp;amp; __guardTuiGuardId &amp;gt; 0"
      SubType="expression"
      Expression="__guardActive &amp;&amp; __guardTuiGuardId &gt; 0"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="204"
    >
      <mxCell style="expressionNode" parent="200" vertex="1">
        <mxGeometry x="10" y="116" width="330" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="!__guardActive &amp;amp;&amp;amp; __guardTuiGuardId &amp;gt; 0"
      SubType="expression"
      Expression="!__guardActive &amp;&amp; __guardTuiGuardId &gt; 0"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="591"
    >
      <mxCell style="expressionNode" parent="200" vertex="1">
        <mxGeometry x="10" y="146" width="330" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" SubType="default" DynamicNextId="" id="205">
      <mxCell style="defaultNode" parent="200" vertex="1">
        <mxGeometry x="10" y="176" width="330" height="30" as="geometry" />
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
      target="600"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="438" y="215" />
          <mxPoint x="438" y="-258" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="304"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="205"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="40" y="1214" />
          <mxPoint x="483" y="1214" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="606"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="600"
      target="604"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="{getValue(__rtParams, &#39;resultCurrentlyActivated&#39; + &#39;_&#39; + language, &#39;&#39;)}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{getValue(__rtParams, &#39;resultCurrentlyActivated&#39; + &#39;_&#39; + language, &#39;&#39;)}"
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
      Text_fr=""
      AltTexts_fr=""
      Text_de=""
      AltTexts_de=""
      Text_en=""
      AltTexts_en=""
      id="600"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="690" y="-310" width="390" height="95" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="605"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="601"
      target="603"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="{getValue(__rtParams, &#39;resultCurrentlyDeactivated&#39; + &#39;_&#39; + language, &#39;&#39;)}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{getValue(__rtParams, &#39;resultCurrentlyDeactivated&#39; + &#39;_&#39; + language, &#39;&#39;)}"
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
      Text_fr=""
      AltTexts_fr=""
      Text_de=""
      AltTexts_de=""
      Text_en=""
      AltTexts_en=""
      id="601"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="690" y="-160" width="390" height="95" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="602"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="591"
      target="601"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="470" y="241" />
          <mxPoint x="470" y="-112" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="617"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="603"
      target="615"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="1000ms"
      Type="pause"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Interval="1000"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="603"
    >
      <mxCell style="pauseNode" parent="baselayer" vertex="1">
        <mxGeometry x="1191" y="-152.5" width="130" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="607"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="604"
      target="616"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="1000ms"
      Type="pause"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Interval="1000"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="604"
    >
      <mxCell style="pauseNode" parent="baselayer" vertex="1">
        <mxGeometry x="1191" y="-302.5" width="130" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="629"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="615"
      target="618"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="{getValue(__rtParams, &#39;promptActivate&#39; + &#39;_&#39; + language, &#39;&#39;)}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{getValue(__rtParams, &#39;promptActivate&#39; + &#39;_&#39; + language, &#39;&#39;)}"
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
      Text_fr=""
      AltTexts_fr=""
      Text_de=""
      AltTexts_de=""
      Text_en=""
      AltTexts_en=""
      id="615"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="1440" y="-160" width="390" height="95" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="628"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="616"
      target="623"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="{getValue(__rtParams, &#39;promptDeactivate&#39; + &#39;_&#39; + language, &#39;&#39;)}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{getValue(__rtParams, &#39;promptDeactivate&#39; + &#39;_&#39; + language, &#39;&#39;)}"
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
      Text_fr=""
      AltTexts_fr=""
      Text_de=""
      AltTexts_de=""
      Text_en=""
      AltTexts_en=""
      id="616"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry
          x="1430"
          y="-308.75"
          width="400"
          height="92.5"
          as="geometry"
        />
      </mxCell>
    </object>
    <mxCell
      id="641"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="635"
      target="450"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="2820" y="-340" />
          <mxPoint x="2820" y="163" />
          <mxPoint x="1088" y="163" />
        </Array>
      </mxGeometry>
    </mxCell>
    <object
      label="toggleDeactivate"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='_errorMessage = &#39;&#39;;&#xa;__rtOutcome = &#39;nextStep_Failure&#39;;&#xa;&#xa;if (!(__guardTuiGuardId &gt; 0)) {&#xa;    Logger.warn(&#39;[guardTui] deactivate missing guardId&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;var __method = &#39;POST&#39;;&#xa;var __timeout = Number(getValue(__rtParams, &#39;timeout&#39;, 10000));&#xa;var __headers = _headers;&#xa;var __endpoint = __rtBaseUrl + __rtTuiDeactivateEndpoint;&#xa;var __queryParameters = &#39;/&#39; + encodeURIComponent(__guardTuiGuardId);&#xa;&#xa;log_debug(&#39;__urlDeactivate: &#39; + __endpoint + __queryParameters);&#xa;&#xa;__compRequest = jsonHttpRequest(&#xa;    __endpoint + __queryParameters,&#xa;    { method: __method, "timeout": __timeout },&#xa;    __headers,&#xa;    null&#xa;);&#xa;&#xa;return __compRequest.then(function (result) {&#xa;    __resultObj = result.response;&#xa;    __callSuccess = result.success;&#xa;    log_debug(&#39;result: &#39; + JSON.stringify(result));&#xa;    if (!__callSuccess) {&#xa;        _errorMessage = "status: " + result.statusCode + ", error: " + result.error;&#xa;        Logger.warn(&#39;[guardTui] deactivate failed&#39;, { error: _errorMessage, outcome: __rtOutcome });&#xa;        return;&#xa;    }&#xa;    if (String(__resultObj).toLowerCase() === &#39;true&#39;) {&#xa;        __rtOutcome = &#39;nextStep_Success&#39;;&#xa;        Logger.info(&#39;[guardTui] deactivated&#39;, { outcome: __rtOutcome });&#xa;        return;&#xa;    }&#xa;    __rtOutcome = &#39;nextStep&#39;;&#xa;    Logger.info(&#39;[guardTui] only active member&#39;, { outcome: __rtOutcome });&#xa;});'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="635"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="2420" y="-380" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="638"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="637"
      target="550"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="toggleActivate"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='_errorMessage = &#39;&#39;;&#xa;__rtOutcome = &#39;nextStep_Failure&#39;;&#xa;&#xa;if (!(__guardTuiGuardId &gt; 0)) {&#xa;    Logger.warn(&#39;[guardTui] activate missing guardId&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;var __method = &#39;POST&#39;;&#xa;var __timeout = Number(getValue(__rtParams, &#39;timeout&#39;, 10000));&#xa;var __headers = _headers;&#xa;var __endpoint = __rtBaseUrl + __rtTuiActivateEndpoint;&#xa;var __queryParameters = &#39;/&#39; + encodeURIComponent(__guardTuiGuardId);&#xa;&#xa;log_debug(&#39;__urlActivate: &#39; + __endpoint + __queryParameters);&#xa;&#xa;__compRequest = jsonHttpRequest(&#xa;    __endpoint + __queryParameters,&#xa;    { method: __method, "timeout": __timeout },&#xa;    __headers,&#xa;    null&#xa;);&#xa;&#xa;return __compRequest.then(function (result) {&#xa;    __resultObj = result.response;&#xa;    __callSuccess = result.success;&#xa;    log_debug(&#39;result: &#39; + JSON.stringify(result));&#xa;    if (!__callSuccess) {&#xa;        _errorMessage = "status: " + result.statusCode + ", error: " + result.error;&#xa;        Logger.warn(&#39;[guardTui] activate failed&#39;, { error: _errorMessage, outcome: __rtOutcome });&#xa;        return;&#xa;    }&#xa;    if (String(__resultObj).toLowerCase() !== &#39;true&#39;) {&#xa;        _errorMessage = &#39;activate returned &#39; + String(__resultObj);&#xa;        Logger.warn(&#39;[guardTui] activate failed&#39;, { error: _errorMessage, outcome: __rtOutcome });&#xa;        return;&#xa;    }&#xa;    __rtOutcome = &#39;nextStep_Success&#39;;&#xa;    Logger.info(&#39;[guardTui] activated&#39;, { outcome: __rtOutcome });&#xa;});'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="637"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="2420" y="26" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="dtmf"
      OnEnter=""
      OnLeave=""
      Timeout="8000"
      MaxEntryCount=""
      MaxEntryNodeId=""
      MinTimeout=""
      id="618"
    >
      <mxCell style="dtmfNode" parent="baselayer" vertex="1">
        <mxGeometry x="2030" y="-90" width="160" height="200" as="geometry" />
      </mxCell>
    </object>
    <object id="619">
      <mxCell style="dtmfInnerNode" parent="618" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="no input" DynamicNextId="" SubType="noInput" id="622">
      <mxCell style="noInputNode" parent="618" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="7" DynamicNextId="" SubType="choice" Key="7" id="621">
      <mxCell style="choiceNode" parent="618" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="633"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="621"
      target="637"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
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
      id="623"
    >
      <mxCell style="dtmfNode" parent="baselayer" vertex="1">
        <mxGeometry
          x="2030"
          y="-362.5"
          width="160"
          height="200"
          as="geometry"
        />
      </mxCell>
    </object>
    <object id="624">
      <mxCell style="dtmfInnerNode" parent="623" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="3" DynamicNextId="" SubType="choice" Key="3" id="625">
      <mxCell style="choiceNode" parent="623" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no input" DynamicNextId="" SubType="noInput" id="627">
      <mxCell style="noInputNode" parent="623" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="636"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="625"
      target="635"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="639"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="627"
      target="170"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="2390" y="-261" />
          <mxPoint x="2390" y="-140" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="640"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="622"
      target="170"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="2390" y="-19" />
          <mxPoint x="2390" y="-140" />
        </Array>
      </mxGeometry>
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
        <mxGeometry x="1630" y="630" width="320" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="551">
      <mxCell style="caseInnerNode" parent="550" vertex="1">
        <mxGeometry x="10" y="16" width="300" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__rtOutcome == &#39;NextStep_Success&#39;"
      SubType="expression"
      Expression="__rtOutcome == &#39;NextStep_Success&#39;"
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
  </root>
</mxGraphModel>;
