<mxGraphModel
  dx="3341"
  dy="2330"
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
      Code="__rtParams = {};&#xa;&#xa;__getValue = function () {&#xa;    if (typeof getValue === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[sendSms] shared function unavailable -- library not loaded&#39;, { fn: &#39;getValue&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return getValue.apply(null, arguments);&#xa;};&#xa;&#xa;__activeFlag = function () {&#xa;    if (typeof activeFlag === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[sendSms] shared function unavailable -- library not loaded&#39;, { fn: &#39;activeFlag&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return activeFlag.apply(null, arguments);&#xa;};&#xa;&#xa;__extractParams = function () {&#xa;    if (typeof extractParams === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[sendSms] shared function unavailable -- library not loaded&#39;, { fn: &#39;extractParams&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return extractParams.apply(null, arguments);&#xa;};&#xa;&#xa;__setupConfig = function () {&#xa;    if (typeof setupConfig === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[sendSms] shared function unavailable -- library not loaded&#39;, { fn: &#39;setupConfig&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return setupConfig.apply(null, arguments);&#xa;};&#xa;&#xa;&#xa;__isMobileNumber = function () {&#xa;    if (typeof isMobileNumber === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[sendSms] shared function unavailable -- library not loaded&#39;, { fn: &#39;isMobileNumber&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return isMobileNumber.apply(null, arguments);&#xa;};&#xa;&#xa;__nowUTC = function () {&#xa;    if (typeof nowUTC === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[sendSms] shared function unavailable -- library not loaded&#39;, { fn: &#39;nowUTC&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return nowUTC.apply(null, arguments);&#xa;};"
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch (Belgium)&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-BE&#39;,&#39;ttsVoiceName&#39;:&#39;&#39;,&#39;ttsEngine&#39;:&#39;&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:false}}"
      Variables='__configJSON = {&#xa;    "active": false,&#xa;    "to": "+32478306999",&#xa;    "routing": "LPA_DEV",&#xa;    "from": "8850",&#xa;    "body": "${rtSmsBody}",&#xa;    "smsAccountId": 47,&#xa;    "timeout": 5000,&#xa;    "nextStep_Success": "00011",&#xa;    "nextStep_Failure": "00099",&#xa;    "nextStep": "00012"&#xa;};&#xa;__environment = environment;&#xa;__rtBaseUrl = _rtBaseUrl;&#xa;__rtEndpoint = _rtSmsEndpoint;&#xa;__rtOutcome = &#39;nextStep_Failure&#39;;&#xa;__rtNextStep &amp;= _rtNextStep;'
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
      Code="__rtOutcome = &#39;nextStep&#39;;&#xa;__rtParams = __setupConfig(__configJSON);&#xa;if (!_headers) { _headers = {}; }&#xa;&#xa;Logger.debug(&#39;[sendSms] config resolved&#39;, { params: __rtParams, outcome: __rtOutcome });"
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
      Code='if (String(__getValue(__rtParams, &#39;active&#39;, false)).toLowerCase() !== &#39;true&#39;) {&#xa;    Logger.info(&#39;[sendSms] skipped -- inactive&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;&#xa;&#xa;var __to = __getValue(__rtParams, &#39;to&#39;, &#39;&#39;);&#xa;if (!__to || !__isMobileNumber(__to)) {&#xa;    Logger.warn(&#39;[sendSms] invalid phone number&#39;, { to: __to, outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;__rtOutcome = &#39;nextStep_Failure&#39;;&#xa;&#xa;var __url = __rtBaseUrl + __rtEndpoint;&#xa;var __method = &#39;POST&#39;;&#xa;var __timeout = Number(__getValue(__rtParams, &#39;timeout&#39;, 10000));&#xa;var __payload = {&#xa;    smsAccountId: Number(__getValue(__rtParams, &#39;smsAccountId&#39;, -1)),&#xa;    routing:      __getValue(__rtParams, &#39;routing&#39;, &#39;&#39;),&#xa;    from:         __getValue(__rtParams, &#39;from&#39;, &#39;&#39;),&#xa;    to:           __to,&#xa;    content:      __getValue(__rtParams, &#39;body&#39;, &#39;&#39;),&#xa;    plannedTime:  __nowUTC()&#xa;};&#xa;&#xa;return jsonHttpRequest(__url, { method: __method, "timeout": __timeout }, _headers, __payload).then(&#xa;    function (result) {&#xa;        if (result &amp;&amp; result.success === true) {&#xa;            __rtOutcome = &#39;nextStep_Success&#39;;&#xa;            Logger.info(&#39;[sendSms] success&#39;, { outcome: __rtOutcome });&#xa;            return;&#xa;        }&#xa;        Logger.warn(&#39;[sendSms] request failed&#39;, { statusCode: result &amp;&amp; result.statusCode, outcome: __rtOutcome });&#xa;    },&#xa;    function (err) {&#xa;        Logger.error(&#39;[sendSms] request error&#39;, { outcome: __rtOutcome }, err);&#xa;    }&#xa;);'
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
      OnEnter="_rtNextStep = __getValue(__rtParams, __rtOutcome, &#39;&#39;);&#xa;Logger.info(&#39;[sendSms] exit&#39;, { outcome: __rtOutcome, nextStep: _rtNextStep });"
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
</mxGraphModel>;
