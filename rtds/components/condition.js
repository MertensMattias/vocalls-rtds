<mxGraphModel
  dx="2661"
  dy="2597"
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
      Code="__rtParams = {};&#xa;&#xa;__getValue = function () {&#xa;    if (typeof getValue === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[condition] shared function unavailable -- library not loaded&#39;, { fn: &#39;getValue&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return getValue.apply(null, arguments);&#xa;};&#xa;&#xa;__activeFlag = function () {&#xa;    if (typeof activeFlag === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[condition] shared function unavailable -- library not loaded&#39;, { fn: &#39;activeFlag&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return activeFlag.apply(null, arguments);&#xa;};&#xa;&#xa;__extractParams = function () {&#xa;    if (typeof extractParams === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[condition] shared function unavailable -- library not loaded&#39;, { fn: &#39;extractParams&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return extractParams.apply(null, arguments);&#xa;};&#xa;&#xa;__setupConfig = function () {&#xa;    if (typeof setupConfig === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[condition] shared function unavailable -- library not loaded&#39;, { fn: &#39;setupConfig&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return setupConfig.apply(null, arguments);&#xa;};&#xa;&#xa;__evaluateCondition = function () {&#xa;    if (typeof evaluateCondition === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[condition] shared function unavailable -- library not loaded&#39;, { fn: &#39;evaluateCondition&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return evaluateCondition.apply(null, arguments);&#xa;};&#xa;&#xa;__clockStatistic = function () {&#xa;    if (typeof clockStatistic === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[condition] shared function unavailable -- library not loaded&#39;, { fn: &#39;clockStatistic&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return clockStatistic.apply(null, arguments);&#xa;};&#xa;&#xa;__extractQueueStatistic = function () {&#xa;    if (typeof extractQueueStatistic === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[condition] shared function unavailable -- library not loaded&#39;, { fn: &#39;extractQueueStatistic&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return extractQueueStatistic.apply(null, arguments);&#xa;};&#xa;"
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch (Belgium)&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-BE&#39;,&#39;ttsVoiceName&#39;:&#39;&#39;,&#39;ttsEngine&#39;:&#39;&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:false}}"
      Variables='__configJSON = {&#xa;    "active": true,&#xa;    "statistic": "",&#xa;    "queue": "",&#xa;    "value": "${customerType}",&#xa;    "operator": "eq",&#xa;    "compareTo": "B2B",&#xa;    "timeout": 5000,&#xa;    "nextStep_True": "00010",&#xa;    "nextStep_False": "00020",&#xa;    "nextStep": "00030"&#xa;};&#xa;__environment = environment;&#xa;__rtQueueStatsUrl = _rtQueueStatsUrl;&#xa;__rtQueueStatsCompanyId = _rtQueueStatsCompanyId;&#xa;__rtOutcome = &#39;nextStep&#39;;&#xa;__rtNextStep &amp;= _rtNextStep;'
      PropertiesDefinition='[&#xa;    {&#xa;        "name": "__configJSON",&#xa;        "title": "Operation config (JSON)",&#xa;        "hint": "Full RTDS operation Params object as JSON. The left operand comes from statistic (time/date clock value, or a wallboard queue statistic such as waiting for the given queue) or, when statistic is empty, from value (usually a ${var} placeholder). It is compared to compareTo using operator (eq, ne, gt, lt, ge, le, contains, notContains, isEmpty); branches nextStep_True / nextStep_False.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "maxLength": 5000,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    },&#xa;    {&#xa;        "name": "__environment",&#xa;        "title": "Environment",&#xa;        "hint": "Deployment environment.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "defaultValue": "environment",&#xa;            "maxLength": 100,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    },&#xa;    {&#xa;        "name": "__nextStep",&#xa;        "title": "Next step (output variable name)",&#xa;        "hint": "Name of the session variable that will receive the next step Id after execution.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "defaultValue": "_rtNextStep",&#xa;            "maxLength": 100,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    }&#xa;]'
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
      Code="__rtOutcome = &#39;nextStep&#39;;&#xa;&#xa;__rtParams = __setupConfig(__configJSON);&#xa;if (!_headers) { _headers = {}; }&#xa;Logger.debug(&#39;[condition] config resolved&#39;, { params: __rtParams, outcome: __rtOutcome });"
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
      Code="if (!__activeFlag(__getValue(__rtParams, &#39;active&#39;, true))) {&#xa;    Logger.info(&#39;[condition] skipped -- inactive&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;__rtOutcome = &#39;nextStep_False&#39;;&#xa;&#xa;var __operator = String(__getValue(__rtParams, &#39;operator&#39;, &#39;&#39;));&#xa;var __compareTo = String(__getValue(__rtParams, &#39;compareTo&#39;, &#39;&#39;));&#xa;var __statistic = String(__getValue(__rtParams, &#39;statistic&#39;, &#39;&#39;)).trim();&#xa;&#xa;if (__statistic === &#39;&#39;) {&#xa;    var __value = String(__getValue(__rtParams, &#39;value&#39;, &#39;&#39;));&#xa;    if (__evaluateCondition(__value, __operator, __compareTo)) {&#xa;        __rtOutcome = &#39;nextStep_True&#39;;&#xa;    }&#xa;    Logger.info(&#39;[condition] evaluated&#39;, { statistic: __statistic, value: __value, operator: __operator, compareTo: __compareTo, outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;var __statLower = __statistic.toLowerCase();&#xa;if (__statLower === &#39;time&#39; || __statLower === &#39;date&#39;) {&#xa;    var __clock = __clockStatistic(__statLower);&#xa;    if (__clock !== null) {&#xa;        if (__evaluateCondition(__clock, __operator, __compareTo)) {&#xa;            __rtOutcome = &#39;nextStep_True&#39;;&#xa;        }&#xa;    }&#xa;    Logger.info(&#39;[condition] evaluated&#39;, { statistic: __statistic, value: __clock, operator: __operator, compareTo: __compareTo, outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;var __queue = String(__getValue(__rtParams, &#39;queue&#39;, &#39;&#39;));&#xa;if (!__queue) {&#xa;    Logger.warn(&#39;[condition] queue statistic without queue -- false&#39;, { statistic: __statistic, outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;var __timeout = __getValue(__rtParams, &#39;timeout&#39;, 5000);&#xa;var __url = __rtQueueStatsUrl + &#39;?queues=&#39; + encodeURIComponent(__queue) + &#39;&amp;company_id=&#39; + encodeURIComponent(String(__rtQueueStatsCompanyId));&#xa;return jsonHttpRequest(__url, { method: &#39;GET&#39;, timeout: __timeout }, _headers).then(&#xa;    function (result) {&#xa;        if (!result || result.success !== true) {&#xa;            Logger.warn(&#39;[condition] stats request failed -- false&#39;, { statusCode: result ? result.statusCode : null, outcome: __rtOutcome });&#xa;            return;&#xa;        }&#xa;        var __stat = __extractQueueStatistic(result.response, __queue, __statistic);&#xa;        if (__stat !== null) {&#xa;            if (__evaluateCondition(__stat, __operator, __compareTo)) {&#xa;                __rtOutcome = &#39;nextStep_True&#39;;&#xa;            }&#xa;        }&#xa;        Logger.info(&#39;[condition] evaluated&#39;, { statistic: __statistic, value: __stat, operator: __operator, compareTo: __compareTo, outcome: __rtOutcome });&#xa;    },&#xa;    function (err) {&#xa;        Logger.error(&#39;[condition] stats request error -- false&#39;, { outcome: __rtOutcome }, err);&#xa;    }&#xa;);"
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
      OnEnter="_rtNextStep = __getValue(__rtParams, __rtOutcome, &#39;&#39;);&#xa;Logger.info(&#39;[condition] exit&#39;, { outcome: __rtOutcome, nextStep: _rtNextStep });"
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
