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
      Code="__rtParams = {};&#xa;&#xa;__getValue = function () {&#xa;    if (typeof getValue === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[internalTransfer] shared function unavailable -- library not loaded&#39;, { fn: &#39;getValue&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return getValue.apply(null, arguments);&#xa;};&#xa;&#xa;__activeFlag = function () {&#xa;    if (typeof activeFlag === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[internalTransfer] shared function unavailable -- library not loaded&#39;, { fn: &#39;activeFlag&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return activeFlag.apply(null, arguments);&#xa;};&#xa;&#xa;__extractParams = function () {&#xa;    if (typeof extractParams === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[internalTransfer] shared function unavailable -- library not loaded&#39;, { fn: &#39;extractParams&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return extractParams.apply(null, arguments);&#xa;};&#xa;&#xa;__setupConfig = function () {&#xa;    if (typeof setupConfig === &#39;undefined&#39;) {&#xa;        Logger.warn(&#39;[internalTransfer] shared function unavailable -- library not loaded&#39;, { fn: &#39;setupConfig&#39; });&#xa;        return undefined;&#xa;    }&#xa;    return setupConfig.apply(null, arguments);&#xa;};"
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch (Belgium)&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-BE&#39;,&#39;ttsVoiceName&#39;:&#39;&#39;,&#39;ttsEngine&#39;:&#39;&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:false}}"
      Variables='__configJSON = {&#xa;    "active": true,&#xa;    "target": "${RTDS_SchedulerTransferDestination}",&#xa;    "parameters": "",&#xa;    "attendTransfer": false,&#xa;    "timeout": 30,&#xa;    "nextStep_Failure": "00099",&#xa;    "nextStep": "00012"&#xa;};&#xa;__environment = environment;&#xa;__rtOutcome = &#39;nextStep&#39;;&#xa;__rtNextStep &amp;= _rtNextStep;'
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
      Code="__rtOutcome = &#39;nextStep&#39;;&#xa;&#xa;__doTransfer = false;&#xa;__attendTransfer = false;&#xa;__transferDest = &#39;&#39;;&#xa;__transferParams = &#39;&#39;;&#xa;__transferTimeout = 30;&#xa;__transferResult = &#39;&#39;;&#xa;__rtParams = __setupConfig(__configJSON);&#xa;&#xa;Logger.debug(&#39;[internalTransfer] config resolved&#39;, { params: __rtParams, outcome: __rtOutcome });"
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
      Code="if (!__getValue(__rtParams, &#39;active&#39;, true)) {&#xa;    Logger.info(&#39;[internalTransfer] skipped -- inactive&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;__transferDest = __getValue(__rtParams, &#39;target&#39;, &#39;&#39;);&#xa;if (!__transferDest) {&#xa;    Logger.warn(&#39;[internalTransfer] missing destination&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;__transferParams = __getValue(__rtParams, &#39;parameters&#39;, &#39;&#39;);&#xa;__transferTimeout = __getValue(__rtParams, &#39;timeout&#39;, 30000);&#xa;&#xa;var __attend = __getValue(__rtParams, &#39;attendTransfer&#39;, false);&#xa;__attendTransfer = (__attend === true || __attend === &#39;true&#39; || __attend === 1 || __attend === &#39;1&#39;);&#xa;&#xa;__rtOutcome = &#39;nextStep_Failure&#39;;&#xa;__doTransfer = true;&#xa;Logger.info(&#39;[internalTransfer] transferring&#39;, { to: __transferDest, attend: __attendTransfer, hasParams: __transferParams !== &#39;&#39;, timeout: __transferTimeout, outcome: __rtOutcome });"
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
      OnEnter="_rtNextStep = __getValue(__rtParams, __rtOutcome, &#39;&#39;);&#xa;Logger.info(&#39;[internalTransfer] exit&#39;, { outcome: __rtOutcome, nextStep: _rtNextStep });"
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
        <mxGeometry x="252.5" y="620" width="130" height="40" as="geometry" />
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
        <mxGeometry x="150" y="120" width="336" height="156" as="geometry" />
      </mxCell>
    </object>
    <object id="111">
      <mxCell style="caseInnerNode" parent="110" vertex="1">
        <mxGeometry x="10" y="16" width="316" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__doTransfer == true &amp;&amp; __attendTransfer == true"
      SubType="expression"
      Expression="__doTransfer == true &amp;&amp; __attendTransfer == true"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="112"
    >
      <mxCell style="expressionNode" parent="110" vertex="1">
        <mxGeometry x="10" y="56" width="316" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__doTransfer == true"
      SubType="expression"
      Expression="__doTransfer == true"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="113"
    >
      <mxCell style="expressionNode" parent="110" vertex="1">
        <mxGeometry x="10" y="86" width="316" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="skip" SubType="default" DynamicNextId="" id="114">
      <mxCell style="defaultNode" parent="110" vertex="1">
        <mxGeometry x="10" y="116" width="316" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="redirect"
      OnEnter="Logger.info(&#39;__transferDest: &#39; + __transferDest);
&#xa;Logger.info(&#39;__transferParams: &#39; + __transferParams);"
      OnLeave=""
      Destination="{__transferDest}"
      Parameters="X-Context:{__transferParams};"
      TransferType="attend"
      ResultVariableName=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      SuccessCondition_nl=""
      MessageText_nl=""
      SuccessCondition=""
      MessageText=""
      MessageCache="true"
      MessageVoice=""
      MessageLanguage=""
      id="120"
    >
      <mxCell style="redirectNode" parent="baselayer" vertex="1">
        <mxGeometry x="520" y="360" width="160" height="120" as="geometry" />
      </mxCell>
    </object>
    <object id="121">
      <mxCell style="redirectInnerNode" parent="120" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="not accepted" SubType="default" DynamicNextId="" id="122">
      <mxCell style="defaultNode" parent="120" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="140"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="112"
      target="120"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="141"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="113"
      target="130"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="142"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="114"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="120" y="251" />
          <mxPoint x="120" y="640" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="143"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="122"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="600" y="640" />
        </Array>
      </mxGeometry>
    </mxCell>
    <object
      label=""
      Type="redirect"
      OnEnter="Logger.info(&#39;__transferDest: &#39; + __transferDest);
&#xa;Logger.info(&#39;__transferParams: &#39; + __transferParams);"
      OnLeave=""
      Destination="{__transferDest}"
      Parameters="X-Context:{__transferParams};"
      TransferType="blind"
      ResultVariableName=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      SuccessCondition_nl=""
      MessageText_nl=""
      SuccessCondition=""
      MessageText=""
      MessageCache="true"
      MessageVoice=""
      MessageLanguage=""
      id="130"
    >
      <mxCell style="redirectNode" parent="baselayer" vertex="1">
        <mxGeometry x="240" y="360" width="160" height="120" as="geometry" />
      </mxCell>
    </object>
    <object id="131">
      <mxCell style="redirectInnerNode" parent="130" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="not accepted" SubType="default" DynamicNextId="" id="132">
      <mxCell style="defaultNode" parent="130" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="144"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="132"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
  </root>
</mxGraphModel>;
