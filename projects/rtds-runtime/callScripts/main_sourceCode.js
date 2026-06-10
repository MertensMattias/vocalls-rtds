<mxGraphModel
  dx="3790"
  dy="4775"
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
      Code="function onCallResult() {&#xa;    // Platform termination callback -- fires on every end-of-call path.&#xa;    // _endFlowSemaphore guards against the platform invoking it more than once.&#xa;    if (_endFlowSemaphore &gt; 0) { return; }&#xa;    _endFlowSemaphore++;&#xa;&#xa;    // Resume the RTDS flow from where the call stopped and run the data-only&#xa;    // tail (call-report SendEmail/SendSMS, attribute writes, API calls).&#xa;    // RTDS_nextStepId is the step after the node that was mid-handoff;&#xa;    // RTDS_currentOpId is the fallback. Both are staged by prepareGuiHandoff.&#xa;    var resumeAt = context.session.variables.RTDS_nextStepId&#xa;                || context.session.variables.RTDS_currentOpId;&#xa;&#xa;    // finalizeFrom returns the runStep task; returning it here makes the&#xa;    // platform await the data tail (incl. async SendSMS/SendEmail POSTs)&#xa;    // before tearing the session down.&#xa;    return finalizeFrom(resumeAt);&#xa;    // Sequential finaliser slot (separate effort): KeyLog(); SegmentLog();&#xa;}"
      Extensions=""
      BackgroundNoise="false"
      BreathInEffect="false"
      Languages='{"nl":{"isDefault":true,"languageName":"Dutch","ttsLanguageCode":"nl-NL","ttsVoiceName":"nl-NL-Luc","ttsEngine":"ElevenLabs","ttsPitch":"","ttsSpeed":"","ttsVolume":"","prosodyBaseEnabled":false,"prosodyContourEnabled":false}}'
      Variables='environment = &#39;&#39;;&#xa;language = &#39;&#39;;&#xa;&#xa;varObj = {};&#xa;callIdKey = &#39;&#39;;&#xa;&#xa;result = null;&#xa;env = &#39;acc&#39;;&#xa;debug = true;&#xa;debugCall = true;&#xa;&#xa;_rtConfig = {};&#xa;_rtNextStep = "_rtNextStep";&#xa;&#xa;_headers = &#39;&#39;;&#xa;&#xa;_endFlowSemaphore = 0;&#xa;RTDS_finalizing = false;'
      HintGrammar=""
      RequiredVariables=""
      PropertiesDefinition=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      Translations=""
      ManualId=""
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
    <mxCell
      id="382"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="100"
      target="378"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="dial"
      OnEnter="Logger.debug(&#39;[rtds] result object: &#39; + JSON.stringify(result)); &#xa;Logger.debug(&#39;[rtds] varObj object: &#39; + JSON.stringify(varObj));"
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="100"
    >
      <mxCell
        style="dialNode;strokeColor=#D1B73D;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="52.5" y="-1330" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="17"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="294"
      target="245"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="105" y="-2210" as="sourcePoint" />
        <mxPoint x="105" y="-1830" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="83"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="82"
      target="27"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object label="START" Type="start" id="82">
      <mxCell style="startNode" parent="baselayer" vertex="1">
        <mxGeometry x="52.5" y="-2532" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="31"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="372"
      target="100"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="117.5" y="-1409" as="sourcePoint" />
        <mxPoint x="117.5" y="-1070" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label="get&lt;br&gt;SourceIdd"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='context.session.variables.RTDS_sourceId = varObj &amp;&amp; varObj.dnis || (typeof context.phone === "string" &amp;&amp; context.phone) || "";&#xa;&#xa;&#xa;Logger.info("[rtds] Entry Point", {&#xa;    sourceId: context.session.variables.RTDS_sourceId,&#xa;});&#xa;&#xa;Logger.info(&#39;[rtds] varObj after init: &#39; + JSON.stringify(varObj));'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="229"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="33" y="-1660" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="244"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="30"
      target="229"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="117.5" y="-1629" as="sourcePoint" />
        <mxPoint x="118" y="-1490" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='_devBody = {&#xa;  "sourceId": "+3257351120",&#xa;  "name": "DIGIPOLIS - LPA_ICT_GUARD",&#xa;  "projectId": "117",&#xa;  "project": "LPA ICT",&#xa;  "promptLibraryId": "9",&#xa;  "promptLibrary": "DIGIPOLIS\\LPA\\ICT_HELPDESK",&#xa;  "supportedLanguages": "NL",&#xa;  "operations": [&#xa;    {&#xa;      "id": "00000",&#xa;      "type": "setVariables",&#xa;      "name": "Call Initialization",&#xa;      "isFirstOperation": true,&#xa;      "params": {&#xa;        "active": true,&#xa;        "customerName": "LPA",&#xa;        "customerProject": "ICT_GUARD",&#xa;        "routingId": "LPA_ICT_GUARD",&#xa;        "ivrEvent": "9999",&#xa;        "ivrAction": "CT",&#xa;        "nextStep": "00071"&#xa;      }&#xa;    },&#xa;    {&#xa;      "id": "00071",&#xa;      "type": "guard",&#xa;      "name": "LPA_ICT_GUARD",&#xa;      "params": {&#xa;        "active": true,&#xa;        "configId": 3,&#xa;        "configName": "LPA_ICT_GUARD",&#xa;        "dialGuard": true,&#xa;        "outboundANI": "",&#xa;        "diversion": "",&#xa;        "onHoldAudioUrl": "https://data.freetouse.com/music/tracks/60974ab4-afa7-211d-3ffc-09fdbaff8e58/file/mp3",&#xa;        "timeout": 10000,&#xa;        "recordVoicemail": true,&#xa;        "acceptCallMenu": true,&#xa;        "acceptCallMessage": "Press 1 to accept the call.",&#xa;        "sendSms": true,&#xa;        "sendMail": true,&#xa;        "nextStep_Success": "00072",&#xa;        "nextStep_Failure": "00072",&#xa;        "nextStep": "00072"&#xa;      }&#xa;    },&#xa;    {&#xa;      "id": "00072",&#xa;      "type": "sendMail",&#xa;      "name": "Mail-To: LPA_ICT_GUARD",&#xa;      "params": {&#xa;        "active": true,&#xa;        "subject": "LPA_ICT_GUARD: Call Report",&#xa;        "from": "IVR_EVENTS@n-allo.be",&#xa;        "to": "${rtEmailTo}",&#xa;        "cc": "veerle.georges@police.belgium.eu;mattias.mertens@n-allo.be",&#xa;        "bcc": "",&#xa;        "body": "${rtEmailBody}",&#xa;        "priority": 2,&#xa;        "files": "${rtEmailAttachment}",&#xa;        "attachmentNames": "",&#xa;        "attachmentData": "",&#xa;        "customerKey": "",&#xa;        "timeout": 10000,&#xa;        "nextStep_Success": "00073",&#xa;        "nextStep_Failure": "00073",&#xa;        "nextStep": "00073"&#xa;      }&#xa;    },&#xa;    {&#xa;      "id": "00073",&#xa;      "type": "sendSms",&#xa;      "name": "SMS-To: LPA_ICT_GUARD",&#xa;      "params": {&#xa;        "active": true,&#xa;        "smsAccountId": 47,&#xa;        "routing": "LPA_ICT_GUARD",&#xa;        "from": "8850",&#xa;        "to": "${rtSmsTo}",&#xa;        "body": "${rtSmsBody}",&#xa;        "timeout": 10000,&#xa;        "nextStep_Success": "00098",&#xa;        "nextStep_Failure": "00098",&#xa;        "nextStep": "00098"&#xa;      }&#xa;    },&#xa;    {&#xa;      "id": "00098",&#xa;      "type": "disconnect",&#xa;      "name": "RTDS: Disconnect",&#xa;      "params": {}&#xa;    }&#xa;  ]&#xa;};'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="245"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="220" y="-2130" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
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
      id="30"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="33" y="-1800" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="274"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="245"
      target="9"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="118" y="-1680" as="sourcePoint" />
        <mxPoint x="118" y="-1490" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label="api configs"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="_rtBaseUrl = &#39;https://api.n-allo.be&#39;;&#xa;_rtSmsEndpoint = `/smsapi-${environment}/api/Send`;&#xa;_rtMailEndpoint = `/mailapi-${environment}/api/SendMail`;&#xa;&#xa;_rtGetSourceIdEndpoint = `/routingtablesapi-${environment}/api/routing-table/source`;&#xa;&#xa;_rtTuiCheckAccessEndpoint = `/digipolisapi-api-${environment}/api/Guard/AnyGuardWithPhoneNumberAndConfig`;&#xa;_rtTuiGetStateEndpoint = `/digipolisapi-api-${environment}/api/Guard/GetGuardByPhoneNumberAndConfig`;&#xa;_rtTuiActivateEndpoint = `/digipolisapi-api-${environment}/api/Guard/activate`;&#xa;_rtTuiDeactivateEndpoint = `/digipolisapi-api-${environment}/api/Guard/deactivate`;&#xa;&#xa;&#xa;_rtActiveGuardByConfigEndpoint = `/digipolisapi-api-${environment}/api/Guard/GetAllCurrentActiveGuardsByGuardConfig`;&#xa;_rtAnyGuardWithPhoneAndConfEndpoint = `/digipolisapi-api-${environment}/api/Guard/AnyGuardWithPhoneNumberAndConfig`;&#xa;&#xa;_rtScheduleEndpoint = `/schedulingapi-${environment}/api/schedule/`;&#xa;_rtPhonebookEndpoint = `/phonebookapi-${environment}`;&#xa;&#xa;&#xa;Logger.configure({ activeLevel: &#39;DEBUG&#39; });"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="294"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="33.5" y="-2272" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="295"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="27"
      target="294"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="117.5" y="-2352" as="sourcePoint" />
        <mxPoint x="117.5" y="-2112" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label="result = fetchAndStart(context.session.variables.RTDS_sourceId)"
      Type="setvar"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      VariableName="result"
      VariableValue="fetchAndStart(context.session.variables.RTDS_sourceId)"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="372"
    >
      <mxCell
        style="setvarNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-82" y="-1540" width="398" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="373"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="229"
      target="372"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="117" y="-1520" as="sourcePoint" />
        <mxPoint x="118" y="-1340" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="451"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="394"
      target="628"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="sayMessage"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="sayMessage"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="394"
    >
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="460" y="-1100" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="445"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="396"
      target="428"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="playAudio"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="playAudio"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="396"
    >
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry
          x="450"
          y="-1031.75"
          width="130"
          height="40"
          as="geometry"
        />
      </mxCell>
    </object>
    <mxCell
      id="446"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="397"
      target="428"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="menu"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="menu"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="397"
    >
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="440" y="-860" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="447"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="398"
      target="428"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="getLanguage"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="getLanguage"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="398"
    >
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="440" y="-760" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="434"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="399"
      target="432"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="workgroupTransfer"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="workgroupTransfer"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="399"
    >
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="440" y="-670" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="448"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="400"
      target="428"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="externalTransfer"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="externalTransfer"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="400"
    >
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="440" y="-570" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="656"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="401"
      target="654"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="sendSMS"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="sendSMS"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="401"
    >
      <mxCell
        style="labelNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="440" y="-480" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="652"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="402"
      target="650"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="sendEmail"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="sendEmail"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="402"
    >
      <mxCell
        style="labelNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="440" y="-390" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="693"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      edge="1"
      parent="baselayer"
      source="403"
      target="691"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="guardRouting"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="guardRouting"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="403"
    >
      <mxCell
        style="labelNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="440" y="-300" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="672"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      edge="1"
      parent="baselayer"
      source="404"
      target="670"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="guardTUI"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="guardTUI"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="404"
    >
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="440" y="-210" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="623"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="405"
      target="428"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="callback"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="callback"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="405"
    >
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="430" y="-110" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="disconnect"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="disconnect"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="406"
    >
      <mxCell
        style="labelNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="470" y="140" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="case"
      OnEnter="Logger.info(&#39;context.session.variables.RTDS_currentOpConfig: &#39; + JSON.stringify(context.session.variables.RTDS_currentOpConfig));"
      OnLeave=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="378"
    >
      <mxCell
        style="caseNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-44" y="-1200" width="323" height="546" as="geometry" />
      </mxCell>
    </object>
    <object id="379">
      <mxCell style="caseInnerNode" parent="378" vertex="1">
        <mxGeometry x="10" y="16" width="303" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="result == &#39;set_variables&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;set_variables&#39;"
      id="418"
    >
      <mxCell style="expressionNode" parent="378" vertex="1">
        <mxGeometry x="10" y="56" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="result == &#39;say_message&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;say_message&#39;"
      id="381"
    >
      <mxCell style="expressionNode" parent="378" vertex="1">
        <mxGeometry x="10" y="86" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="result == &#39;play_audio&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;play_audio&#39;"
      id="383"
    >
      <mxCell style="expressionNode" parent="378" vertex="1">
        <mxGeometry x="10" y="116" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="result == &#39;schedule&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;schedule&#39;"
      id="422"
    >
      <mxCell style="expressionNode" parent="378" vertex="1">
        <mxGeometry x="10" y="146" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="result == &#39;menu&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;menu&#39;"
      id="384"
    >
      <mxCell style="expressionNode" parent="378" vertex="1">
        <mxGeometry x="10" y="176" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="result == &#39;language_menu&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;language_menu&#39;"
      id="385"
    >
      <mxCell style="expressionNode" parent="378" vertex="1">
        <mxGeometry x="10" y="206" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="result == &#39;workgroup_transfer&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;workgroup_transfer&#39;"
      id="386"
    >
      <mxCell style="expressionNode" parent="378" vertex="1">
        <mxGeometry x="10" y="236" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="result == &#39;external_transfer&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;external_transfer&#39;"
      id="387"
    >
      <mxCell style="expressionNode" parent="378" vertex="1">
        <mxGeometry x="10" y="266" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="result == &#39;send_sms&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;send_sms&#39;"
      id="388"
    >
      <mxCell style="expressionNode" parent="378" vertex="1">
        <mxGeometry x="10" y="296" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="result == &#39;send_mail&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;send_mail&#39;"
      id="389"
    >
      <mxCell style="expressionNode" parent="378" vertex="1">
        <mxGeometry x="10" y="326" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="result == &#39;guard_routing&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;guard_routing&#39;"
      id="390"
    >
      <mxCell style="expressionNode" parent="378" vertex="1">
        <mxGeometry x="10" y="356" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="result == &#39;guard_tui&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;guard_tui&#39;"
      id="391"
    >
      <mxCell style="expressionNode" parent="378" vertex="1">
        <mxGeometry x="10" y="386" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="result == &#39;callback&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;callback&#39;"
      id="392"
    >
      <mxCell style="expressionNode" parent="378" vertex="1">
        <mxGeometry x="10" y="416" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="result == &#39;disconnect&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;disconnect&#39;"
      id="393"
    >
      <mxCell style="expressionNode" parent="378" vertex="1">
        <mxGeometry x="10" y="446" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" DynamicNextId="" SubType="default" id="380">
      <mxCell style="noInputNode" parent="378" vertex="1">
        <mxGeometry x="10" y="476" width="303" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="395"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="381"
      target="394"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="407"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="393"
      target="406"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="290" y="-739" />
          <mxPoint x="290" y="160" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="408"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="392"
      target="405"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="310" y="-769" />
          <mxPoint x="310" y="-90" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="409"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="391"
      target="404"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="330" y="-799" />
          <mxPoint x="330" y="-190" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="410"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="390"
      target="403"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="340" y="-829" />
          <mxPoint x="340" y="-280" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="411"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="389"
      target="402"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="350" y="-859" />
          <mxPoint x="350" y="-370" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="412"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="388"
      target="401"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="360" y="-889" />
          <mxPoint x="360" y="-460" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="413"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="387"
      target="400"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="370" y="-919" />
          <mxPoint x="370" y="-550" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="414"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="386"
      target="399"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="380" y="-949" />
          <mxPoint x="380" y="-650" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="417"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="383"
      target="396"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="269" y="-1070" />
          <mxPoint x="420" y="-1070" />
          <mxPoint x="420" y="-1012" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="660"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      edge="1"
      parent="baselayer"
      source="419"
      target="658"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="419"
    >
      <mxCell
        style="labelNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry
          x="450"
          y="-1191.75"
          width="130"
          height="40"
          as="geometry"
        />
      </mxCell>
    </object>
    <mxCell
      id="420"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="418"
      target="419"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="330" y="-1129" />
          <mxPoint x="330" y="-1172" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="423"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="385"
      target="398"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="390" y="-979" />
          <mxPoint x="390" y="-740" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="424"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="384"
      target="397"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="400" y="-1009" />
          <mxPoint x="400" y="-840" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="664"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      edge="1"
      parent="baselayer"
      source="425"
      target="662"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="schedule"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="schedule"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="425"
    >
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="440" y="-921.75" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="426"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="422"
      target="425"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="410" y="-1039" />
          <mxPoint x="410" y="-902" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="461"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="468"
      target="458"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="resumeFrom"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="Logger.debug(&#39;_rtNextStep: &#39; + _rtNextStep);&#xa;result = resumeFrom(_rtNextStep ||  &#xa;context.session.variables.RTDS_nextStepId);  &#xa;return result;"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="428"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry
          x="990"
          y="-1211.75"
          width="168"
          height="80"
          as="geometry"
        />
      </mxCell>
    </object>
    <mxCell
      id="441"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="432"
      target="428"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="095cb1ff-3de7-4249-ba68-3020e1d05001"
      ComponentVersion="sIMpnUEi+5e9R5ru21+Yvg=="
      SupportedLanguages=""
      SingleInput="n-input"
      SingleOutput="n-output"
      ManualId=""
      EnableUpdateRelations=""
      AllowGlobalIntent=""
      PropertiesDefinition=""
      id="432"
    >
      <mxCell style="component3Node" parent="baselayer" vertex="1">
        <mxGeometry x="770" y="-685.5" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_workgroupTransfer" id="433">
      <mxCell style="componentInnerNode" parent="432" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
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
      id="9"
    >
      <mxCell
        style="component3Node;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry
          x="40.00000000000006"
          y="-1990"
          width="155"
          height="131"
          as="geometry"
        />
      </mxCell>
    </object>
    <object label="nalOktaAuth" id="10">
      <mxCell style="componentInnerNode" parent="9" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <object
      label='&lt;font color="#333333"&gt;&lt;span style="font-weight: normal"&gt;getTokenFailure&lt;br&gt;&lt;/span&gt;&lt;/font&gt;'
      ComponentId="23"
      SubType="transient"
      Kind="output"
      id="11"
    >
      <mxCell style="component3OutputNode" parent="9" vertex="1">
        <mxGeometry x="10" y="61" width="135" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label='&lt;font color="#333333"&gt;&lt;span style="font-weight: normal"&gt;getTokenSuccess&lt;br&gt;&lt;/span&gt;&lt;/font&gt;'
      ComponentId="17"
      SubType="transient"
      Kind="output"
      id="12"
    >
      <mxCell style="component3OutputNode" parent="9" vertex="1">
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
      id="27"
    >
      <mxCell
        style="component3Node;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry
          x="40.00000000000006"
          y="-2412"
          width="155"
          height="60"
          as="geometry"
        />
      </mxCell>
    </object>
    <object label="getEnvironment" id="28">
      <mxCell style="componentInnerNode" parent="27" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="34" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="247"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="12"
      target="30"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="117.5" y="-1869" as="sourcePoint" />
        <mxPoint x="118" y="-1510" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="462"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.75;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="458"
      target="378"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="500ms"
      Type="pause"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Interval="500"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="468"
    >
      <mxCell
        style="pauseNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="1120" y="-1340" width="130" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="469"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="428"
      target="468"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="1158" y="-1171.75" as="sourcePoint" />
        <mxPoint x="928" y="-1382" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label="output"
      Type="transient"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="output"
      Kind="output"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      Parameters=""
      id="474"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="769" y="-1300" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="" Type="hung" OnEnter="" OnLeave="" id="464">
      <mxCell
        style="hungNode;strokeColor=#C97654;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry
          x="759.9999999999998"
          y="140"
          width="130"
          height="40"
          as="geometry"
        />
      </mxCell>
    </object>
    <mxCell
      id="537"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="406"
      target="464"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="570" y="-30" as="sourcePoint" />
        <mxPoint x="1074" y="-1131.75" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label=""
      Type="counter"
      OnEnter=""
      OnLeave=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      VariableName=""
      id="458"
    >
      <mxCell
        style="counterNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="740" y="-1440" width="188" height="96" as="geometry" />
      </mxCell>
    </object>
    <object id="459">
      <mxCell style="counterInnerNode" parent="458" vertex="1">
        <mxGeometry x="10" y="16" width="168" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="&amp;gt;= 10"
      DynamicNextId=""
      SubType="expression"
      Expression="&gt;= 10"
      id="460"
    >
      <mxCell style="expressionNode" parent="458" vertex="1">
        <mxGeometry x="10" y="56" width="168" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="465"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"
      parent="baselayer"
      source="460"
      target="474"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="558"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="11"
      target="30"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="630"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="628"
      target="428"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="af626280-d4e4-4498-ba3e-30997ce93fb4"
      ComponentVersion="JebFGe8EMf+DMb3pUO14Cg=="
      SupportedLanguages=""
      __configJSON="context.session.variables.RTDS_currentOpConfig"
      __ttsMessages="context.session.variables.RTDS_currentTtsMessages"
      __environment="environment"
      __sayText="&#39;&#39;"
      __rtOutcome="&#39;nextStep&#39;"
      __rtNextStep="_rtNextStep"
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\n    {\n        \&#39;name\&#39;: \&#39;__configJSON\&#39;,\n        \&#39;title\&#39;: \&#39;Operation config (JSON)\&#39;,\n        \&#39;hint\&#39;: \&#39;Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;maxLength\&#39;: 5000,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__environment\&#39;,\n        \&#39;title\&#39;: \&#39;Environment\&#39;,\n        \&#39;hint\&#39;: \&#39;Deployment environment. Controls which RTDS API endpoint is called.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;environment\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__nextStep\&#39;,\n        \&#39;title\&#39;: \&#39;Next step (output variable name)\&#39;,\n        \&#39;hint\&#39;: \&#39;Name of the session variable that will receive the next step Id after execution.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;_rtNextStep\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    }\n]&#39;"
      id="628"
    >
      <mxCell style="componentNode;" parent="baselayer" vertex="1">
        <mxGeometry x="760" y="-1110" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_say" id="629">
      <mxCell style="componentInnerNode;" parent="628" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="631"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="380"
      target="406"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="ff4d0c4c-7a8e-4c7d-a7ee-cca186ea2873"
      LibraryVersion="2ka7N5xBup1UvmfF3jsu7w=="
      SupportedLanguages=""
      id="644"
    >
      <mxCell style="globalLibraryNode;" parent="baselayer" vertex="1">
        <mxGeometry
          x="-279.99999999999994"
          y="-2547"
          width="155"
          height="60"
          as="geometry"
        />
      </mxCell>
    </object>
    <object label="rtds_1_globalConfig" id="645">
      <mxCell style="globalLibraryInnerNode;" parent="644" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="92f0ecdb-bdb1-4c76-bce5-0f2a822379da"
      LibraryVersion="2hW5WnsapB1ZexFGU2zsPw=="
      SupportedLanguages=""
      id="646"
    >
      <mxCell style="globalLibraryNode;" parent="baselayer" vertex="1">
        <mxGeometry
          x="-279.99999999999994"
          y="-2471"
          width="155"
          height="60"
          as="geometry"
        />
      </mxCell>
    </object>
    <object label="rtds_2_runtime" id="647">
      <mxCell style="globalLibraryInnerNode;" parent="646" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="dbb79182-33e8-4733-b4a4-f735d07e7bc9"
      LibraryVersion="+CsLa1snkyuL6+zvpGTsUw=="
      SupportedLanguages=""
      id="648"
    >
      <mxCell style="globalLibraryNode;" parent="baselayer" vertex="1">
        <mxGeometry
          x="-279.99999999999994"
          y="-2392"
          width="155"
          height="60"
          as="geometry"
        />
      </mxCell>
    </object>
    <object label="rtds_3_vocallsEnv" id="649">
      <mxCell style="globalLibraryInnerNode;" parent="648" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="34" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="653"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="650"
      target="428"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="2c9746c6-eff2-4a12-af2f-45b0482ff045"
      ComponentVersion="19DeuGs9WhkP2xp57soeUA=="
      SupportedLanguages=""
      __configJSON="context.session.variables.RTDS_currentOpConfig"
      __environment="environment"
      __rtBaseUrl="_rtBaseUrl"
      __rtEndpoint="_rtMailEndpoint"
      __rtOutcome="&#39;NextStep_Failure&#39;"
      __rtNextStep="_rtNextStep"
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\n    {\n        \&#39;name\&#39;: \&#39;__configJSON\&#39;,\n        \&#39;title\&#39;: \&#39;Operation config (JSON)\&#39;,\n        \&#39;hint\&#39;: \&#39;Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;maxLength\&#39;: 5000,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__environment\&#39;,\n        \&#39;title\&#39;: \&#39;Environment\&#39;,\n        \&#39;hint\&#39;: \&#39;Deployment environment. Controls which RTDS API endpoint is called.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;environment\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__nextStep\&#39;,\n        \&#39;title\&#39;: \&#39;Next step (output variable name)\&#39;,\n        \&#39;hint\&#39;: \&#39;Name of the session variable that will receive the next step Id after execution.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;_rtNextStep\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    }\n]&#39;"
      id="650"
    >
      <mxCell
        style="component3Node;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="770" y="-405" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_sendEmail" id="651">
      <mxCell style="componentInnerNode;" parent="650" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="657"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="654"
      target="428"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="70d37307-be29-4769-9306-64dedee16f4c"
      ComponentVersion="oCx6kC3wqMOjd4RXCewR1g=="
      SupportedLanguages=""
      __configJSON="context.session.variables.RTDS_currentOpConfig"
      __environment="environment"
      __rtBaseUrl="_rtBaseUrl"
      __rtEndpoint="_rtSmsEndpoint"
      __rtOutcome="&#39;NextStep_Failure&#39;"
      __rtNextStep="_rtNextStep"
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\n    {\n        \&#39;name\&#39;: \&#39;__configJSON\&#39;,\n        \&#39;title\&#39;: \&#39;Operation config (JSON)\&#39;,\n        \&#39;hint\&#39;: \&#39;Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;maxLength\&#39;: 5000,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__environment\&#39;,\n        \&#39;title\&#39;: \&#39;Environment\&#39;,\n        \&#39;hint\&#39;: \&#39;Deployment environment. Controls which RTDS API endpoint is called.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;environment\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__nextStep\&#39;,\n        \&#39;title\&#39;: \&#39;Next step (output variable name)\&#39;,\n        \&#39;hint\&#39;: \&#39;Name of the session variable that will receive the next step Id after execution.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;_rtNextStep\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    }\n]&#39;"
      id="654"
    >
      <mxCell
        style="component3Node;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="770" y="-495" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_sendSms" id="655">
      <mxCell style="componentInnerNode;" parent="654" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="661"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      edge="1"
      parent="baselayer"
      source="658"
      target="428"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="dde18c8b-7924-4b07-a014-3f5d4bea8f29"
      ComponentVersion="Dn8ZdzwtLpVBQfr4dvnXJQ=="
      SupportedLanguages=""
      __configJSON="context.session.variables.RTDS_currentOpConfig"
      __environment="environment"
      __rtNextStep="_rtNextStep"
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\n    {\n        \&#39;name\&#39;: \&#39;__configJSON\&#39;,\n        \&#39;title\&#39;: \&#39;Operation config (JSON)\&#39;,\n        \&#39;hint\&#39;: \&#39;Full RTDS operation Params object as JSON. Bare keys write to varObj; dotted keys write nested paths (varObj by default, or globalThis dot key).\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;maxLength\&#39;: 5000,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__environment\&#39;,\n        \&#39;title\&#39;: \&#39;Environment\&#39;,\n        \&#39;hint\&#39;: \&#39;Deployment environment.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;environment\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__nextStep\&#39;,\n        \&#39;title\&#39;: \&#39;Next step (output variable name)\&#39;,\n        \&#39;hint\&#39;: \&#39;Name of the session variable that will receive the next step Id after execution.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;_rtNextStep\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    }\n]&#39;"
      id="658"
    >
      <mxCell
        style="component3Node;strokeColor=#999999;"
        vertex="1"
        parent="baselayer"
      >
        <mxGeometry x="760" y="-1207" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_setVariables" id="659">
      <mxCell style="componentInnerNode;" vertex="1" parent="658">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="665"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;"
      edge="1"
      parent="baselayer"
      source="662"
      target="428"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="3fd2689f-4b77-4e7c-a6eb-ce7660ad3754"
      ComponentVersion="14sQT3q+v6FgyUcqsAr8Tg=="
      SupportedLanguages=""
      __configJSON="context.session.variables.RTDS_currentOpConfig"
      __environment="environment"
      __rtBaseUrl="_rtBaseUrl"
      __rtEndpoint="_rtScheduleEndpoint"
      __rtNextStep="_rtNextStep"
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\n    {\n        \&#39;name\&#39;: \&#39;__configJSON\&#39;,\n        \&#39;title\&#39;: \&#39;Operation config (JSON)\&#39;,\n        \&#39;hint\&#39;: \&#39;Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;maxLength\&#39;: 5000,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__environment\&#39;,\n        \&#39;title\&#39;: \&#39;Environment\&#39;,\n        \&#39;hint\&#39;: \&#39;Deployment environment. Controls which RTDS API endpoint is called.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;environment\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__nextStep\&#39;,\n        \&#39;title\&#39;: \&#39;Next step (output variable name)\&#39;,\n        \&#39;hint\&#39;: \&#39;Name of the session variable that will receive the next step Id after execution.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;_rtNextStep\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    }\n]&#39;"
      id="662"
    >
      <mxCell style="componentNode;" vertex="1" parent="baselayer">
        <mxGeometry x="770" y="-937" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_checkScheduler" id="663">
      <mxCell style="componentInnerNode;" vertex="1" parent="662">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="673"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      edge="1"
      parent="baselayer"
      source="670"
      target="428"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="2f8e8c55-a8cb-4b8d-ba66-c3ede2b844d0"
      ComponentVersion="eHkraR6KGemOWAvv3eP/Bw=="
      SupportedLanguages=""
      __configJSON="context.session.variables.RTDS_currentOpConfig"
      __environment="environment"
      __rtBaseUrl="_rtBaseUrl"
      __rtTuiCheckAccessEndpoint="_rtTuiCheckAccessEndpoint"
      __rtTuiGetStateEndpoint="_rtTuiGetStateEndpoint"
      __rtTuiActivateEndpoint="_rtTuiActivateEndpoint"
      __rtTuiDeactivateEndpoint="_rtTuiDeactivateEndpoint"
      __rtNextStep="_rtNextStep"
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\n    {\n        \&#39;name\&#39;: \&#39;__configJSON\&#39;,\n        \&#39;title\&#39;: \&#39;Operation config (JSON)\&#39;,\n        \&#39;hint\&#39;: \&#39;Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;maxLength\&#39;: 5000,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__environment\&#39;,\n        \&#39;title\&#39;: \&#39;Environment\&#39;,\n        \&#39;hint\&#39;: \&#39;Deployment environment. Controls which RTDS API endpoint is called.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;environment\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__nextStep\&#39;,\n        \&#39;title\&#39;: \&#39;Next step (output variable name)\&#39;,\n        \&#39;hint\&#39;: \&#39;Name of the session variable that will receive the next step Id after execution.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;_rtNextStep\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    }\n]&#39;"
      id="670"
    >
      <mxCell style="componentNode;" vertex="1" parent="baselayer">
        <mxGeometry x="769" y="-225" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_guardTui" id="671">
      <mxCell style="componentInnerNode;" vertex="1" parent="670">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="694"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      edge="1"
      parent="baselayer"
      source="691"
      target="428"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="ba6a28d2-6d4e-46be-953b-bbc4a4c389a1"
      ComponentVersion="foPs/3yaIqaVNPcMWTlwsA=="
      SupportedLanguages="nl;"
      __configJSON="context.session.variables.RTDS_currentOpConfig"
      __environment="environment"
      __rtBaseUrl="_rtBaseUrl"
      __rtGuardEndpoint="_rtActiveGuardByConfigEndpoint"
      __rtNextStep="_rtNextStep"
      mlctp_guardVoicemailPrompt_nl="&#39;Geachte klant, laat alstublieft een bericht achter.&#39;"
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\n    {\n        \&#39;name\&#39;: \&#39;__configJSON\&#39;,\n        \&#39;title\&#39;: \&#39;Operation config (JSON)\&#39;,\n        \&#39;hint\&#39;: \&#39;Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;maxLength\&#39;: 5000,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__environment\&#39;,\n        \&#39;title\&#39;: \&#39;Environment\&#39;,\n        \&#39;hint\&#39;: \&#39;Deployment environment. Controls which RTDS API endpoint is called.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;environment\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__nextStep\&#39;,\n        \&#39;title\&#39;: \&#39;Next step (output variable name)\&#39;,\n        \&#39;hint\&#39;: \&#39;Name of the session variable that will receive the next step Id after execution.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;_rtNextStep\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    }\n]&#39;"
      id="691"
    >
      <mxCell
        style="componentNode;strokeColor=#9013FD;"
        vertex="1"
        parent="baselayer"
      >
        <mxGeometry x="773" y="-315" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_guardRouting copy" id="692">
      <mxCell style="componentInnerNode;" vertex="1" parent="691">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
  </root>
</mxGraphModel>;
