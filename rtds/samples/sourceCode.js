<mxGraphModel
  dx="7612"
  dy="6512"
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
      Code=""
      Extensions=""
      BackgroundNoise="false"
      BreathInEffect="false"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-NL&#39;,&#39;ttsVoiceName&#39;:&#39;nl-NL-Luc&#39;,&#39;ttsEngine&#39;:&#39;ElevenLabs&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:false,&#39;prosodyContourEnabled&#39;:false}}"
      Variables='environment = &#39;&#39;;&#xa;language = &#39;&#39;;&#xa;&#xa;varObj = {};&#xa;callIdKey = &#39;&#39;;&#xa;&#xa;result = null;&#xa;env = &#39;acc&#39;;&#xa;debug = true;&#xa;debugCall = true;&#xa;&#xa;_rtConfig = {};&#xa;_rtNextStep = "_rtNextStep";&#xa;&#xa;_headers = &#39;&#39;;'
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
      id="5b74dffc-23b8-4612-921e-dff30c6fb4bc"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="5"
      target="1"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="760f3236-4fe3-49fd-bb77-68658ce30ddc"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="225"
      target="2"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="8aa7a820-8736-4ade-a338-77559274bbb0"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="2"
      target="3"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
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
        <mxGeometry x="52" y="-1330" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="1500"
      Type="pause"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      DynamicNextId=""
      Interval="1500"
      id="1"
    >
      <mxCell style="pauseNode" parent="baselayer" vertex="1">
        <mxGeometry x="-18.5" y="330" width="130" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="I&#39;m your first virtual assistant!"
      Type="say"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      DynamicNextId=""
      Language=""
      Voice=""
      SelectionMode="temporary"
      Cache=""
      Text="I&#39;m your first virtual assistant!"
      AltTexts=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      EscapeXML="true"
      OutputFilter=""
      id="2"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="-61" y="750" width="214" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="hung"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="3"
    >
      <mxCell style="hungNode" parent="baselayer" vertex="1">
        <mxGeometry x="42" y="1660" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="INITIALIZE INTERACTION"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="INITIALIZE INTERACTION"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="5"
    >
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="-38" y="240" width="170" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="6"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="15"
      target="5"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="65" y="620" as="sourcePoint" />
        <mxPoint x="65" y="700" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='// ============================================================================ &#xa;// TEST LOGGER &#xa;// ============================================================================ &#xa; &#xa;(function runLoggerTests() { &#xa; &#xa;    Logger.info("Logger test started", { step: "init" }); &#xa; &#xa;    // ------------------------------------------------------------------------ &#xa;    // DEBUG / INFO &#xa;    // ------------------------------------------------------------------------ &#xa;    Logger.debug("Debug message test", { testCase: "debug_basic" }); &#xa; &#xa;    Logger.info("Info message test", { &#xa;        testCase: "info_with_context", &#xa;        value: 123, &#xa;        flag: true &#xa;    }); &#xa; &#xa;    // ------------------------------------------------------------------------ &#xa;    // WARN (should go to API) &#xa;    // ------------------------------------------------------------------------ &#xa;    Logger.warn("Warning test message", { &#xa;        testCase: "warn_should_post", &#xa;        endpoint: "/test/warn" &#xa;    }); &#xa; &#xa;    // ------------------------------------------------------------------------ &#xa;    // ERROR (with real error object) &#xa;    // ------------------------------------------------------------------------ &#xa;/*     try { &#xa;        var x = null; &#xa;        x.someFunction(); // will throw &#xa;    } catch (e) { &#xa;        Logger.error("Error test with exception", { &#xa;            testCase: "error_with_stack", &#xa;            endpoint: "/test/error" &#xa;        }, e); &#xa;    }  */&#xa; &#xa;    // ------------------------------------------------------------------------ &#xa;    // ERROR (manual error object) &#xa;    // ------------------------------------------------------------------------ &#xa;    /*var customError = {&#xa;        name: "CustomError", &#xa;        message: "Simulated failure" &#xa;    }; &#xa; &#xa;     Logger.error("Error test with custom object", { &#xa;        testCase: "error_custom_object", &#xa;        status: 503 &#xa;    }, customError);  */&#xa; &#xa;    // ------------------------------------------------------------------------ &#xa;    // API SUCCESS &#xa;    // ------------------------------------------------------------------------ &#xa;    Logger.API("API success simulation", { &#xa;        endpoint: "/test/api", &#xa;        method: "GET", &#xa;        status: 200, &#xa;        duration: 120 &#xa;    }, null); &#xa; &#xa;    // ------------------------------------------------------------------------ &#xa;    // API FAILURE (status-based) &#xa;    // ------------------------------------------------------------------------ &#xa;    Logger.API("API failure simulation (status)", { &#xa;        endpoint: "/test/api", &#xa;        method: "POST", &#xa;        status: 500, &#xa;        duration: 350 &#xa;    }, null); &#xa; &#xa;    // ------------------------------------------------------------------------ &#xa;    // API FAILURE (error-based) &#xa;    // ------------------------------------------------------------------------ &#xa;/*     Logger.API("API failure simulation (error object)", { &#xa;        endpoint: "/test/api", &#xa;        method: "POST", &#xa;        status: null, &#xa;        duration: 200 &#xa;    }, new Error("Network timeout"));  */&#xa; &#xa;    // ------------------------------------------------------------------------ &#xa;    // LARGE PAYLOAD (sanitization test) &#xa;    // ------------------------------------------------------------------------ &#xa;    var largeObject = {}; &#xa;    for (var i = 0; i &lt; 1000; i++) { &#xa;        largeObject["key_" + i] = "value_" + i; &#xa;    } &#xa; &#xa;    Logger.info("Large object test", { &#xa;        testCase: "sanitize_truncate", &#xa;        payload: largeObject &#xa;    }); &#xa; &#xa;    Logger.info("Logger test finished", { step: "end" }); &#xa; &#xa;})();'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="15"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="-43" y="120" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="16"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="21"
      target="15"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="65" y="-239" as="sourcePoint" />
        <mxPoint x="65" y="-60" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="17"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="294"
      target="9"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="105" y="-2210" as="sourcePoint" />
        <mxPoint x="105" y="-1830" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='log_debug(&#39;_rtNextStep: &#39; + _rtNextStep); &#xa; &#xa;Logger.warn("Logger DB write test", { &#xa;    testCase: "db_write_test", &#xa;    endpoint: "/test/logger" &#xa;});'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="21"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="-43" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
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
        <mxGeometry x="52.5" y="-2410" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="225"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="-38" y="470" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="226"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="1"
      target="225"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="46.5" y="230" as="sourcePoint" />
        <mxPoint x="46.5" y="1380" as="targetPoint" />
      </mxGeometry>
    </mxCell>
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
    <mxCell
      id="455"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="230"
      target="353"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='rtSmsBody = "test with rtSmsBody";&#xa;params = { &#xa;    "Active": false, &#xa;    "To": "+32478306999", &#xa;    "Routing": "LPA_DEV", &#xa;    "From": "8850", &#xa;    "Body": "${rtSmsBody}", &#xa;    "AccountId": 47, &#xa;    "Timeout": 5000, &#xa;    "NextStep_Success": "00011", &#xa;    "NextStep_Failure": "00099", &#xa;    "NextStep": "00012" &#xa;  };&#xa;&#xa;&#xa;paramsEmail =  {&#xa;    "Active": true,&#xa;    "Subject": "Testing maill api",&#xa;    "From": "noreply@n-allo.be",&#xa;    "To": "mertensmattias@gmail.com;imamodfreak@gmail.com",&#xa;    "Cc": "mattias.mertens@n-allo.be",&#xa;    "Bcc": "",&#xa;    "Body": "some blabla and more blabla",&#xa;    "Files": "",&#xa;    "AttachmentNames": "",&#xa;    "AttachmentData": "",&#xa;    "Priority": "1",&#xa;    "CustomerKey": "LPA SPSU",&#xa;    "NextStep_Success": "00021",&#xa;    "NextStep_Failure": "00099",&#xa;    "NextStep": "00022"&#xa;};'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="230"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="-44" y="-320" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
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
      Code='devJson = { &#xa;    "sourceId": "569200", &#xa;    "name": "DIGIPOLIS - DA_KLANTWACHT", &#xa;    "project": "DA HELPDESK", &#xa;    "promptLibrary": "DIGIPOLIS\\DA\\KLANTWACHT", &#xa; "supportedLanguages": "NL", &#xa; "operations": &#xa; [ &#xa;  { &#xa;   "id": "00000", &#xa;   "type": "SetAttributes", &#xa;   "name": "Call Initialization", &#xa;   "isFirstOperation": true, &#xa;   "params": { &#xa;    "LogAttributes": "RTDS_ProjectName|Eic_RemoteId|ATTR_RoutingId|ATTR_CallflowId|ATTR_IVREvent|ATTR_IVRAction|ATTR_CQR|ATTR_CQS", &#xa;    "CallflowId": "DA_KLANTWACHT", &#xa;    "RoutingId": "DA_KLANTWACHT", &#xa;    "IVREvent": "9999", &#xa;    "IVRAction": "CT", &#xa;    "NextStep": "00001" &#xa;   } &#xa;  }, &#xa;        { &#xa;            "id": "00001", &#xa;            "type": "GuardRouting", &#xa;            "name": "DA_KLANTWACHT", &#xa;            "params": { &#xa;                "Active": 1, &#xa;                "ConfigId": 1, &#xa;                "ConfigName": "KLANTWACHT", &#xa;                "DialGuard" : true, &#xa;                "DialGroup": "SIP_TO_TELENET_DIGIPOLIS_STAD", &#xa;                "OnHoldAudio": "TENANT_DA_GUARD", &#xa;                "Timeout": 15, &#xa;                "RecordVoicemail": true, &#xa;                "AcceptCallMenu": true, &#xa;                "SendSMS": true, &#xa;                "SendMail": true, &#xa;                "NextStep_Failure": "00002", &#xa;                "NextStep_Success": "00002", &#xa;                "NextStep": "00002" &#xa;            } &#xa;        }, &#xa;        { &#xa;            "id": "00002", &#xa;            "type": "SendEmail", &#xa;            "name": "Mail-To: DA_KLANTWACHT", &#xa;            "params": { &#xa;                "Active": 1, &#xa;                "Subject": "DA_KLANTWACHT: Call Report", &#xa;                "From": "IVR_EVENTS@n-allo.be", &#xa;                "To": "$(ATTR_EmailTo)", &#xa;                "CC": "mattias.mertens@n-allo.be;bart.dexelle@digipolis.be;erik.dujardin@digipolis.be;chrisje.henrard@digipolis.be", &#xa;                "Body": "$(ATTR_EmailBody)", &#xa;                "Importance": "Normal", &#xa;                "Attachment": "$(ATTR_EmailAttachment)", &#xa;                "NextStep_Success": "00003", &#xa;                "NextStep_Failure": "00003", &#xa;                "NextStep": "00003" &#xa;            } &#xa;        }, &#xa;        { &#xa;             "id": "00003", &#xa;             "type": "SendSMS", &#xa;             "name": "SMS-To: DA_KLANTWACHT", &#xa;             "params": { &#xa;                "Active": 1, &#xa;                "ConfigId": 47, &#xa;                "Routing": "KLANTWACHT", &#xa;                "From": "8850", &#xa;                "To": "$(ATTR_SMSTo)", &#xa;                "Body": "$(ATTR_SMSBody)", &#xa;                "NextStep_Failure": "00099", &#xa;                "NextStep_Success": "00099", &#xa;                "NextStep": "00099" &#xa;            } &#xa;        },    &#xa;  { &#xa;   "id": "00099", &#xa;   "type": "Disconnect", &#xa;   "name": "RTDS: Disconnect" &#xa;  } &#xa; ] &#xa;}'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="245"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="470" y="-1750" width="168" height="80" as="geometry" />
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
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="245"
      target="30"
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
      Code="_rtBaseUrl = &#39;https://api.n-allo.be&#39;;&#xa;_rtSmsEndpoint = `/smsapi-${environment}/api/Send`;&#xa;_rtMailEndpoint = `/mailapi-${environment}/api/SendMail`;&#xa;&#xa;_rtGetSourceIdEndpoint = `/routingtablesapi-${environment}/api/routing-table/source`;&#xa;&#xa;_rtTuiCheckAccessEndpoint = `/rtdsapi-${environment}/api/Guard/AnyGuardWithPhoneNumberAndConfig`;&#xa;_rtTuiGetStateEndpoint = `/rtdsapi-${environment}/api/Guard/GetGuardByPhoneNumberAndConfig`;&#xa;_rtTuiActivateEndpoint = `/rtdsapi-${environment}/api/Guard/Activate`;&#xa;_rtTuiDeactivateEndpoint = `/rtdsapi-${environment}/api/Guard/Disable`;&#xa;&#xa;_rtActiveGuardByConfigEndpoint = `/digipolisapi-${environment}/api/Guard/GetAllCurrentActiveGuardsByGuardConfig`;&#xa;_rtAnyGuardWithPhoneAndConfEndpoint = `/digipolisapi-${environment}/api/Guard/AnyGuardWithPhoneNumberAndConfig`;&#xa;&#xa;_rtScheduleEndpoint = `/schedulingapi-${environment}/api/schedule/`;&#xa;_rtPhonebookEndpoint = `/phonebookapi-${environment}`;&#xa;&#xa;&#xa;Logger.configure({ activeLevel: &#39;DEBUG&#39; });"
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
        <mxGeometry x="33.5" y="-2150" width="168" height="80" as="geometry" />
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
        <mxPoint x="117.5" y="-2230" as="sourcePoint" />
        <mxPoint x="117.5" y="-1990" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="457"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="353"
      target="21"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="Logger.info(&#39;logAttributes: &#39; + logAttributes + &#39; (&#39; + typeof logAttributes + &#39;)&#39;); &#xa;Logger.info(&#39;callflowId: &#39; + callflowId + &#39; (&#39; + typeof callflowId + &#39;)&#39;); &#xa;Logger.info(&#39;routingId: &#39; + routingId + &#39; (&#39; + typeof routingId + &#39;)&#39;); &#xa;Logger.info(&#39;IVREvent: &#39; + IVREvent + &#39; (&#39; + typeof IVREvent + &#39;)&#39;); &#xa;Logger.info(&#39;IVRAction: &#39; + IVRAction + &#39; (&#39; + typeof IVRAction + &#39;)&#39;); &#xa;Logger.info(&#39;isHelpDeskCall: &#39; + isHelpDeskCall + &#39; (&#39; + typeof isHelpDeskCall + &#39;)&#39;);"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="353"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="-44" y="-140" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
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
        <mxGeometry x="-81.5" y="-1520" width="398" height="80" as="geometry" />
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
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="394"
      target="428"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="playPrompt"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="playPrompt"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="394"
    >
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry
          x="450"
          y="-1111.75"
          width="130"
          height="40"
          as="geometry"
        />
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
      label="languageMenu"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="languageMenu"
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
      id="527"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      edge="1"
      parent="baselayer"
      source="401"
      target="525"
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
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="440" y="-480" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="523"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      edge="1"
      parent="baselayer"
      source="402"
      target="521"
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
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="440" y="-390" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="519"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      edge="1"
      parent="baselayer"
      source="403"
      target="517"
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
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="440" y="-300" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="515"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      edge="1"
      parent="baselayer"
      source="404"
      target="513"
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
      id="450"
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
        <mxGeometry x="440" y="-130" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="452"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="406"
      target="428"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
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
        <mxGeometry x="440" y="-50" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="case"
      OnEnter=""
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
        <mxGeometry x="-44" y="-1200" width="323" height="516" as="geometry" />
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
      label="result == &#39;play_prompt&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="result == &#39;play_prompt&#39;"
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
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="408"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="392"
      target="405"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="409"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="391"
      target="404"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="410"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="390"
      target="403"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="411"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="389"
      target="402"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="412"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="388"
      target="401"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="413"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="387"
      target="400"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="414"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="386"
      target="399"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
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
          <mxPoint x="370" y="-1070" />
          <mxPoint x="370" y="-1012" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="531"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      edge="1"
      parent="baselayer"
      source="419"
      target="529"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="&lt;br&gt;&lt;br&gt;&lt;br&gt;&lt;br&gt;&lt;br&gt;"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="&#xa;&#xa;&#xa;&#xa;&#xa;"
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
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="424"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="384"
      target="397"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="427"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="425"
      target="349"
      edge="1"
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
          <mxPoint x="360" y="-1039" />
          <mxPoint x="360" y="-902" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="440"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="349"
      target="428"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
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
      Code="result = resumeFrom(global[_rtNextStep] || context.session.variables.RTDS_nextStepId); return result;"
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
          y="-2290"
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
      id="248"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="11"
      target="30"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="170" y="-1914" />
          <mxPoint x="170" y="-1910" />
          <mxPoint x="370" y="-1910" />
          <mxPoint x="370" y="-1830" />
          <mxPoint x="117" y="-1830" />
        </Array>
      </mxGeometry>
    </mxCell>
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
    <object
      label=""
      Type="component"
      ComponentGuid="3fd2689f-4b77-4e7c-a6eb-ce7660ad3754"
      ComponentVersion="IXbPB0yTriztX0TuIDS+ew=="
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
      id="349"
    >
      <mxCell style="componentNode" parent="baselayer" vertex="1">
        <mxGeometry x="770" y="-937.25" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_checkScheduler" id="350">
      <mxCell style="componentInnerNode;" parent="349" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="456"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="380"
      target="230"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
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
    <object label="" Type="hung" OnEnter="" OnLeave="" id="464">
      <mxCell style="hungNode" parent="baselayer" vertex="1">
        <mxGeometry
          x="772.4999999999998"
          y="-1290"
          width="130"
          height="40"
          as="geometry"
        />
      </mxCell>
    </object>
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
      label=""
      Type="globalLibrary"
      LibraryGuid="ff4d0c4c-7a8e-4c7d-a7ee-cca186ea2873"
      LibraryVersion="null"
      SupportedLanguages=""
      id="366"
    >
      <mxCell style="globalLibraryNode;" parent="baselayer" vertex="1">
        <mxGeometry x="-340" y="-2400" width="180" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_1_globalConfig" id="367">
      <mxCell style="globalLibraryInnerNode;" parent="366" vertex="1">
        <mxGeometry x="10" y="16" width="160" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="92f0ecdb-bdb1-4c76-bce5-0f2a822379da"
      LibraryVersion="null"
      SupportedLanguages=""
      id="368"
    >
      <mxCell style="globalLibraryNode;" parent="baselayer" vertex="1">
        <mxGeometry x="-340" y="-2310" width="180" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_2_runtime" id="369">
      <mxCell style="globalLibraryInnerNode;" parent="368" vertex="1">
        <mxGeometry x="10" y="16" width="160" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="dbb79182-33e8-4733-b4a4-f735d07e7bc9"
      LibraryVersion="null"
      SupportedLanguages=""
      id="370"
    >
      <mxCell style="globalLibraryNode;" parent="baselayer" vertex="1">
        <mxGeometry x="-340" y="-2220" width="180" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_3_vocallsEnv" id="371">
      <mxCell style="globalLibraryInnerNode;" parent="370" vertex="1">
        <mxGeometry x="10" y="16" width="160" height="34" as="geometry" />
      </mxCell>
    </object>
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
      <mxCell
        style="transientNode;strokeColor=#666666;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="772.5" y="-1390" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
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
        <mxGeometry x="753.5" y="-1560" width="188" height="96" as="geometry" />
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
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.446;exitY=1.167;exitDx=0;exitDy=0;exitPerimeter=0;"
      parent="baselayer"
      source="460"
      target="474"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="516"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      edge="1"
      parent="baselayer"
      source="513"
      target="428"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="4831f02d-87e3-44b5-bf4b-dff68873e1b2"
      ComponentVersion="SCuezxI9IqZB+ohOTBcUww=="
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
      id="513"
    >
      <mxCell style="componentNode;" vertex="1" parent="baselayer">
        <mxGeometry x="770" y="-225" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_guardTui" id="514">
      <mxCell style="componentInnerNode;" vertex="1" parent="513">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="520"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      edge="1"
      parent="baselayer"
      source="517"
      target="428"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="577f1f57-2b79-47f8-b013-510f9b42b0ac"
      ComponentVersion="/q7cwiI8w9/O3V38i/MxIA=="
      SupportedLanguages="nl;"
      __configJSON="context.session.variables.RTDS_currentOpConfig"
      __environment="environment"
      __rtBaseUrl="_rtBaseUrl"
      __rtGuardEndpoint="_rtActiveGuardByConfigEndpoint"
      __rtNextStep="_rtNextStep"
      __guardList="[]"
      __guardIndex="0"
      __guardCount="0"
      __guardLog="[]"
      __guardPickedUp="false"
      __recordVoicemail="false"
      __diversion="&#39;&#39;"
      __onHoldAudioUrl="&#39;&#39;"
      __currentGuardPhone="&#39;&#39;"
      __transferResult="null"
      __voicemailCapture="&#39;&#39;"
      mlctp_guardVoicemailPrompt_nl="&#39;Geachte klant, laat alstublieft een bericht achter.&#39;"
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\n    {\n        \&#39;name\&#39;: \&#39;__configJSON\&#39;,\n        \&#39;title\&#39;: \&#39;Operation config (JSON)\&#39;,\n        \&#39;hint\&#39;: \&#39;Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;maxLength\&#39;: 5000,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__environment\&#39;,\n        \&#39;title\&#39;: \&#39;Environment\&#39;,\n        \&#39;hint\&#39;: \&#39;Deployment environment. Controls which RTDS API endpoint is called.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;environment\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__nextStep\&#39;,\n        \&#39;title\&#39;: \&#39;Next step (output variable name)\&#39;,\n        \&#39;hint\&#39;: \&#39;Name of the session variable that will receive the next step Id after execution.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;_rtNextStep\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    }\n]&#39;"
      id="517"
    >
      <mxCell style="componentNode;" vertex="1" parent="baselayer">
        <mxGeometry x="773" y="-315" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_guardRouting" id="518">
      <mxCell style="componentInnerNode;" vertex="1" parent="517">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="524"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      edge="1"
      parent="baselayer"
      source="521"
      target="428"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="2c9746c6-eff2-4a12-af2f-45b0482ff045"
      ComponentVersion="KcFkO9wURI7ni8xfwQRhng=="
      SupportedLanguages=""
      __configJSON="context.session.variables.RTDS_currentOpConfig"
      __environment="environment"
      __rtBaseUrl="_rtBaseUrl"
      __rtEndpoint="_rtMailEndpoint"
      __rtNextStep="_rtNextStep"
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\n    {\n        \&#39;name\&#39;: \&#39;__configJSON\&#39;,\n        \&#39;title\&#39;: \&#39;Operation config (JSON)\&#39;,\n        \&#39;hint\&#39;: \&#39;Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;maxLength\&#39;: 5000,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__environment\&#39;,\n        \&#39;title\&#39;: \&#39;Environment\&#39;,\n        \&#39;hint\&#39;: \&#39;Deployment environment. Controls which RTDS API endpoint is called.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;environment\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__nextStep\&#39;,\n        \&#39;title\&#39;: \&#39;Next step (output variable name)\&#39;,\n        \&#39;hint\&#39;: \&#39;Name of the session variable that will receive the next step Id after execution.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;_rtNextStep\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    }\n]&#39;"
      id="521"
    >
      <mxCell style="component3Node;" vertex="1" parent="baselayer">
        <mxGeometry x="770" y="-405" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_sendEmail" id="522">
      <mxCell style="componentInnerNode;" vertex="1" parent="521">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="528"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      edge="1"
      parent="baselayer"
      source="525"
      target="428"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="70d37307-be29-4769-9306-64dedee16f4c"
      ComponentVersion="YhMTplVBwWXLM3W9DjGiiw=="
      SupportedLanguages=""
      __configJSON="context.session.variables.RTDS_currentOpConfig"
      __environment="environment"
      __rtBaseUrl="_rtBaseUrl"
      __rtEndpoint="_rtSmsEndpoint"
      __rtNextStep="_rtNextStep"
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\n    {\n        \&#39;name\&#39;: \&#39;__configJSON\&#39;,\n        \&#39;title\&#39;: \&#39;Operation config (JSON)\&#39;,\n        \&#39;hint\&#39;: \&#39;Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;maxLength\&#39;: 5000,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__environment\&#39;,\n        \&#39;title\&#39;: \&#39;Environment\&#39;,\n        \&#39;hint\&#39;: \&#39;Deployment environment. Controls which RTDS API endpoint is called.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;environment\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__nextStep\&#39;,\n        \&#39;title\&#39;: \&#39;Next step (output variable name)\&#39;,\n        \&#39;hint\&#39;: \&#39;Name of the session variable that will receive the next step Id after execution.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;_rtNextStep\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    }\n]&#39;"
      id="525"
    >
      <mxCell style="component3Node;" vertex="1" parent="baselayer">
        <mxGeometry x="770" y="-495" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_sendSms" id="526">
      <mxCell style="componentInnerNode;" vertex="1" parent="525">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="532"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      edge="1"
      parent="baselayer"
      source="529"
      target="428"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="dde18c8b-7924-4b07-a014-3f5d4bea8f29"
      ComponentVersion="I0nzkHJdcIfprptZ10x/Tw=="
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
      id="529"
    >
      <mxCell
        style="component3Node;strokeColor=#999999;"
        vertex="1"
        parent="baselayer"
      >
        <mxGeometry x="760" y="-1207" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_setVariables" id="530">
      <mxCell style="componentInnerNode;" vertex="1" parent="529">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
  </root>
</mxGraphModel>;
