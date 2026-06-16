<mxGraphModel
  dx="4009"
  dy="2576"
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
      Code="__rtParams = {};&#xa;&#xa;__getValue = function () {&#xa;    if (typeof getValue === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[checkSchedule] shared function unavailable -- library not loaded&#39;, { fn: &#39;getValue&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return getValue.apply(null, arguments);&#xa;};&#xa;&#xa;__activeFlag = function () {&#xa;    if (typeof activeFlag === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[checkSchedule] shared function unavailable -- library not loaded&#39;, { fn: &#39;activeFlag&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return activeFlag.apply(null, arguments);&#xa;};&#xa;&#xa;__extractParams = function () {&#xa;    if (typeof extractParams === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[checkSchedule] shared function unavailable -- library not loaded&#39;, { fn: &#39;extractParams&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return extractParams.apply(null, arguments);&#xa;};&#xa;&#xa;__setupConfig = function () {&#xa;    if (typeof setupConfig === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[checkSchedule] shared function unavailable -- library not loaded&#39;, { fn: &#39;setupConfig&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return setupConfig.apply(null, arguments);&#xa;};&#xa;&#xa;__hasKey = function () {&#xa;    if (typeof hasKey === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[checkSchedule] shared function unavailable -- library not loaded&#39;, { fn: &#39;hasKey&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return hasKey.apply(null, arguments);&#xa;};&#xa;&#xa;__setVariable = function () {&#xa;    if (typeof setVariable === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[checkSchedule] shared function unavailable -- library not loaded&#39;, { fn: &#39;setVariable&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return setVariable.apply(null, arguments);&#xa;};&#xa;"
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch (Belgium)&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-BE&#39;,&#39;ttsVoiceName&#39;:&#39;&#39;,&#39;ttsEngine&#39;:&#39;&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:false}}"
      Variables='__configJSON = {&#xa;    "active": true,&#xa;    "scheduleId": "${rtScheduleId}",&#xa;    "timeout": 5000,&#xa;    "nextStep_Open": "00011",&#xa;    "nextStep_Closed": "00021",&#xa;    "nextStep_Transfer": "00051",&#xa;    "nextStep_ExternalTransfer": "00052",&#xa;    "nextStep_Disconnect": "00041",&#xa;    "nextStep_Failure": "00099",&#xa;    "nextStep": "00012"&#xa;};&#xa;__environment = environment;&#xa;__rtBaseUrl = _rtBaseUrl;&#xa;__rtEndpoint = _rtScheduleEndpoint;&#xa;__rtLangMap = _rtPromptLanguageMap;&#xa;__sayText = &#39;&#39;;&#xa;__rtOutcome = &#39;nextStep&#39;;&#xa;__rtNextStep &amp;= _rtNextStep;'
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
      Code="language = (typeof language === &#39;string&#39; &amp;&amp; language.trim() !== &#39;&#39;) ? varObj.language.toUpperCase() : &#39;NL&#39;;&#xa;__rtOutcome = &#39;nextStep&#39;;&#xa;__sayText = &#39;&#39;;&#xa;__rtParams = __setupConfig(__configJSON);&#xa;if (!_headers) { _headers = {}; }&#xa;Logger.debug(&#39;[checkSchedule] config resolved&#39;, { params: __rtParams, outcome: __rtOutcome });"
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
      Code="if (!__getValue(__rtParams, &#39;active&#39;, true)) {&#xa;    Logger.info(&#39;[checkSchedule] skipped -- inactive&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;var __scheduleId = __getValue(__rtParams, &#39;scheduleId&#39;, &#39;&#39;);&#xa;if (__scheduleId === &#39;&#39; || __scheduleId === null || __scheduleId === undefined) {&#xa;    Logger.warn(&#39;[checkSchedule] missing scheduleId&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;__rtOutcome = &#39;nextStep_Failure&#39;;&#xa;&#xa;var __method = &#39;GET&#39;;&#xa;var __timeout = Number(__getValue(__rtParams, &#39;timeout&#39;, 10000));&#xa;var __headers = _headers;&#xa;var __dt = new Date().toISOString().substring(0, 19) + &#39;Z&#39;;&#xa;var __endpoint = __rtBaseUrl + __rtEndpoint + &#39;/&#39; + encodeURIComponent(__scheduleId) + &#39;/status&#39;;&#xa;var __queryParameters = &#39;?date=&#39; + encodeURIComponent(__dt);&#xa;&#xa;Logger.debug(&#39;[checkSchedule] status request&#39;, { url: __endpoint + __queryParameters, method: __method, timeout: __timeout });&#xa;&#xa;var __compRequest = jsonHttpRequest(&#xa;    __endpoint + __queryParameters,&#xa;    { method: __method, timeout: __timeout },&#xa;    __headers&#xa;);&#xa;&#xa;return __compRequest.then(&#xa;    function (result) {&#xa;        if (!result || result.success !== true) {&#xa;            Logger.error(&#39;[checkSchedule] status request failed -- routing to failure outcome&#39;, { url: __endpoint + __queryParameters, statusCode: result &amp;&amp; result.statusCode, error: result &amp;&amp; result.error, outcome: __rtOutcome });&#xa;            return;&#xa;        }&#xa;        var __res = result.response || {};&#xa;        var __action = String(__res.action || &#39;&#39;).replace(/\s+/g, &#39;&#39;);&#xa;        var __isOpen = __res.isOpen === true || __res.isOpen === &#39;true&#39; || __res.isOpen === 1 || __res.isOpen === &#39;1&#39;;&#xa;        Logger.info(&#39;[checkSchedule] schedule result&#39;, { line: __isOpen ? &#39;open&#39; : &#39;closed&#39;, action: __action });&#xa;&#xa;        var __actionLower = __action.toLowerCase();&#xa;        if (__actionLower === &#39;transfer&#39;) {&#xa;            __setVariable(&#39;schedulerInternalNumber&#39;, String(__res.actionDetail || &#39;&#39;));&#xa;        } else if (__actionLower === &#39;externaltransfer&#39;) {&#xa;            __setVariable(&#39;schedulerExternalNumber&#39;, String(__res.actionDetail || &#39;&#39;));&#xa;        }&#xa;&#xa;        var __key = &#39;nextStep_&#39; + __action;&#xa;        if (__hasKey(__rtParams, __key)) {&#xa;            __rtOutcome = __key;&#xa;        } else {&#xa;            __rtOutcome = &#39;nextStep&#39;;&#xa;            Logger.error(&#39;[checkSchedule] no matching outcome for action -- using default nextStep&#39;, { action: __action, missingKey: __key, fallback: __rtOutcome });&#xa;        }&#xa;        Logger.info(&#39;[checkSchedule] branch&#39;, { action: __action, outcome: __rtOutcome });&#xa;&#xa;        var __play = __res.actionPlayPrompt === true || __res.actionPlayPrompt === &#39;true&#39; || __res.actionPlayPrompt === 1 || __res.actionPlayPrompt === &#39;1&#39;;&#xa;        var __messages = __res.ttsMessages || [];&#xa;        if (!__play || !__messages.length) {&#xa;            return;&#xa;        }&#xa;        var __langMap = (typeof __rtLangMap === &#39;object&#39; &amp;&amp; __rtLangMap !== null) ? __rtLangMap : { 1: &#39;NL&#39;, 2: &#39;FR&#39;, 3: &#39;DE&#39;, 4: &#39;EN&#39; };&#xa;        var __tts = {};&#xa;        for (var __i = 0; __i &lt; __messages.length; __i++) {&#xa;            var __code = __langMap[__messages[__i].dicPromptLanguageId] || &#39;&#39;;&#xa;            if (__code) { __tts[__code] = String(__messages[__i].text || &#39;&#39;); }&#xa;        }&#xa;        __sayText = __getValue(__tts, language, &#39;&#39;);&#xa;        Logger.info(&#39;[checkSchedule] prompt resolved&#39;, { promptName: String(__res.actionPromptName || &#39;&#39;), language: language, hasText: __sayText !== &#39;&#39;, outcome: __rtOutcome });&#xa;    },&#xa;    function (err) {&#xa;        Logger.error(&#39;[checkSchedule] status request error -- routing to failure outcome&#39;, { url: __endpoint + __queryParameters, outcome: __rtOutcome }, err);&#xa;    }&#xa;);"
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
      label="{Speech.ssml(__sayText)}"
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
      Text_nl=""
      AltTexts_nl=""
      id="101"
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      Cache="false"
      EscapeXML="true"
      OutputFilter=""
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="233.5" y="280" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="output"
      Type="transient"
      OnEnter="_rtNextStep = __getValue(__rtParams, __rtOutcome, &#39;&#39;);&#xa;Logger.info(&#39;[checkSchedule] exit&#39;, { outcome: __rtOutcome, nextStep: _rtNextStep });"
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
      label=""
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
    <object label="no choice" SubType="default" DynamicNextId="" id="113">
      <mxCell style="defaultNode" parent="110" vertex="1">
        <mxGeometry x="10" y="56" width="316" height="30" as="geometry" />
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
          <mxPoint x="583" y="191" />
          <mxPoint x="583" y="389" />
          <mxPoint x="318" y="389" />
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
</mxGraphModel>;
