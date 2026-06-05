<mxGraphModel
  dx="3197"
  dy="3308"
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
      DefaultLanguage=""
      DefaultVoice=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      SayAgainNodeId=""
      SpeechRecognitionEngine=""
      SpeechSyntEngine=""
      Code=""
      Extensions=""
      VoicePitch=""
      VoiceSpeed=""
      VoiceVolume=""
      BackgroundNoise=""
      Layers="[]"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch (Belgium)&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-BE&#39;,&#39;ttsVoiceName&#39;:&#39;&#39;,&#39;ttsEngine&#39;:&#39;&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:false}}"
      Variables=""
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
      id="7"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="265" y="-510" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="init"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="__rtParams = __setupConfig(__configJSON);&#xa;if (!_headers) { _headers = {}; }&#xa;__rtOutcome = &#39;NextStep_Failure&#39;;&#xa;Logger.debug(&#39;[sendSms] config resolved&#39;, { params: __rtParams, outcome: __rtOutcome });"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="8"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="246" y="-360" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='__rtOutcome = &#39;NextStep&#39;;&#xa;&#xa;if (!getValue(__rtParams, &#39;Active&#39;, false)) {&#xa;    Logger.info(&#39;[sendSms] skipped — inactive&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;var __to = getValue(__rtParams, &#39;To&#39;, &#39;&#39;);&#xa;if (!__to || !__isMobileNumber(__to)) {&#xa;    Logger.warn(&#39;[sendSms] invalid phone number&#39;, { to: __to, outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;__rtOutcome = &#39;NextStep_Failure&#39;;&#xa;&#xa;var __url = __rtBaseUrl + __rtEndpoint;&#xa;var __method = &#39;POST&#39;;&#xa;var __timeout = getValue(__rtParams, &#39;Timeout&#39;, 10000);&#xa;var __payload = {&#xa;    smsAccountId: Number(getValue(__rtParams, &#39;SmsAccountId&#39;, -1)),&#xa;    routing:      getValue(__rtParams, &#39;Routing&#39;, &#39;&#39;),&#xa;    from:         getValue(__rtParams, &#39;From&#39;, &#39;&#39;),&#xa;    to:           __to,&#xa;    content:      getValue(__rtParams, &#39;Body&#39;, &#39;&#39;),&#xa;    plannedTime:  nowUTC()&#xa;};&#xa;&#xa;return jsonHttpRequest(__url, { method: __method, "timeout": __timeout }, _headers, __payload).then(&#xa;    function (result) {&#xa;        if (result &amp;&amp; result.success === true) {&#xa;            __rtOutcome = &#39;NextStep_Success&#39;;&#xa;            Logger.info(&#39;[sendSms] success&#39;, { outcome: __rtOutcome });&#xa;            return;&#xa;        }&#xa;        Logger.warn(&#39;[sendSms] request failed&#39;, { statusCode: result &amp;&amp; result.statusCode, outcome: __rtOutcome });&#xa;    },&#xa;    function (err) {&#xa;        Logger.error(&#39;[sendSms] request error&#39;, { outcome: __rtOutcome }, err);&#xa;    }&#xa;);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="9"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="246" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="output"
      Type="transient"
      OnEnter="global[_rtNextStep] = getValue(__rtParams, __rtOutcome, -1);&#xa;Logger.info(&#39;[sendSms] exit&#39;, { outcome: __rtOutcome, nextStep: global[_rtNextStep] });"
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      DynamicNextId=""
      Title="output"
      Kind="output"
      DynamicNextTabGuid=""
      Parameters=""
      id="10"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="265" y="490" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="11"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="7"
      target="8"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="330" y="-370" as="sourcePoint" />
        <mxPoint x="330" y="-70" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="15"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="8"
      target="9"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="330" y="-260" as="sourcePoint" />
        <mxPoint x="330" y="-150" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="log_debug(&#39;message&#39;);"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="16"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="1015" y="-560" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="26"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="9"
      target="10"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="330" y="190" as="sourcePoint" />
        <mxPoint x="334" y="500" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label="name = &#39;value&#39;"
      Type="setvar"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      VariableName="name"
      VariableValue="&#39;value&#39;"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="43"
    >
      <mxCell style="setvarNode" parent="baselayer" vertex="1">
        <mxGeometry x="690" y="-270" width="130" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="enter text"
      Type="say"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      DynamicNextId=""
      Text="enter text"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      id="49"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="1010" y="-120" width="287" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="recognize"
      OnEnter=""
      OnLeave=""
      Timeout="15000"
      MinTimeout="8000"
      ExpectedSpeechType="default"
      SpeechConfigParams=""
      SimilarityTreshold="0.4"
      NoiseDistance="0.05"
      MaxWords=""
      ReactionType="normal"
      VariableName=""
      HintKeywords=""
      HintGrammar=""
      Wait=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      SpeechRecognition=""
      ResponseAudio="false"
      NLPEngine="Embedding"
      id="44"
    >
      <mxCell style="recognizeNode" parent="baselayer" vertex="1">
        <mxGeometry x="1020" y="-400" width="163" height="210" as="geometry" />
      </mxCell>
    </object>
    <object id="45">
      <mxCell style="recognizeInnerNode" parent="44" vertex="1">
        <mxGeometry x="10" y="16" width="143" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="yes"
      SubType="reactionGroup"
      Priority="0.5"
      Lemma="true"
      MaxWords=""
      DynamicNextId=""
      Keywords=""
      Grammar="yes"
      Sentences=""
      Groups=""
      OnSelected=""
      ShowOption="true"
      id="46"
    >
      <mxCell style="reactionGroupNode" parent="44" vertex="1">
        <mxGeometry x="10" y="56" width="143" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="no"
      SubType="reactionGroup"
      Priority="0.5"
      Lemma="true"
      MaxWords=""
      DynamicNextId=""
      Keywords=""
      Grammar="no"
      Sentences=""
      Groups=""
      OnSelected=""
      ShowOption="true"
      id="47"
    >
      <mxCell style="reactionGroupNode" parent="44" vertex="1">
        <mxGeometry x="10" y="86" width="143" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="any_other_key_word"
      SubType="reactionGroup"
      Priority="0.5"
      Lemma="true"
      MaxWords=""
      DynamicNextId=""
      Keywords=""
      Grammar="no"
      Sentences=""
      Groups=""
      OnSelected=""
      ShowOption="true"
      Title="any_other_key_word"
      Expression="any_other_key_word"
      id="66"
    >
      <mxCell style="reactionGroupNode" vertex="1" parent="44">
        <mxGeometry x="10" y="116" width="143" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no match" DynamicNextId="" SubType="notRecognized" id="48">
      <mxCell style="notRecognizedNode" parent="44" vertex="1">
        <mxGeometry x="10" y="146" width="143" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="32"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="675" y="-133" width="160" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="33">
      <mxCell style="caseInnerNode" parent="32" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" DynamicNextId="" SubType="default" id="34">
      <mxCell style="noInputNode" parent="32" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="name == &#39;value&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="name == &#39;value&#39;"
      id="35"
    >
      <mxCell style="expressionNode" parent="32" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
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
      id="29"
    >
      <mxCell style="counterNode" parent="baselayer" vertex="1">
        <mxGeometry x="680" y="40" width="160" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="30">
      <mxCell style="counterInnerNode" parent="29" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="&gt;= 2"
      DynamicNextId=""
      SubType="expression"
      Expression="&gt;= 2"
      id="31"
    >
      <mxCell style="expressionNode" parent="29" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="1000ms"
      Type="pause"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Interval="1000"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="53"
    >
      <mxCell style="pauseNode" vertex="1" parent="baselayer">
        <mxGeometry x="690" y="-400" width="130" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="number"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Timeout="15000"
      SubmitCode="#"
      VariableName="myNumber"
      MinTimeout=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="22"
    >
      <mxCell style="numberNode" parent="baselayer" vertex="1">
        <mxGeometry x="960" y="390" width="160" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="23">
      <mxCell style="numberInnerNode" parent="22" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="no input" DynamicNextId="" SubType="noInput" id="24">
      <mxCell style="noInputNode" parent="22" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no match" DynamicNextId="" SubType="notRecognized" id="25">
      <mxCell style="notRecognizedNode" parent="22" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="redirect"
      OnEnter=""
      OnLeave=""
      Destination="+420"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Parameters=""
      id="18"
    >
      <mxCell style="redirectNode" parent="baselayer" vertex="1">
        <mxGeometry
          x="950"
          y="590.9999999999999"
          width="160"
          height="120"
          as="geometry"
        />
      </mxCell>
    </object>
    <object id="19">
      <mxCell style="redirectInnerNode" parent="18" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="not accepted" DynamicNextId="" SubType="default" id="20">
      <mxCell style="defaultNode" parent="18" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="dtmf"
      OnEnter=""
      OnLeave=""
      Timeout="15000"
      MaxEntryCount=""
      MaxEntryNodeId=""
      MinTimeout=""
      id="36"
    >
      <mxCell style="dtmfNode" parent="baselayer" vertex="1">
        <mxGeometry x="1300" y="130" width="160" height="486" as="geometry" />
      </mxCell>
    </object>
    <object id="37">
      <mxCell style="dtmfInnerNode" parent="36" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="1" DynamicNextId="" SubType="choice" Key="1" id="38">
      <mxCell style="choiceNode" parent="36" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="2" DynamicNextId="" SubType="choice" Key="2" id="39">
      <mxCell style="choiceNode" parent="36" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="3" DynamicNextId="" SubType="choice" Key="3" id="40">
      <mxCell style="choiceNode" parent="36" vertex="1">
        <mxGeometry x="10" y="116" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="4" DynamicNextId="" SubType="choice" Key="4" id="54">
      <mxCell style="choiceNode" vertex="1" parent="36">
        <mxGeometry x="10" y="146" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="5" DynamicNextId="" SubType="choice" Key="5" id="55">
      <mxCell style="choiceNode" vertex="1" parent="36">
        <mxGeometry x="10" y="176" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="6" DynamicNextId="" SubType="choice" Key="6" id="56">
      <mxCell style="choiceNode" vertex="1" parent="36">
        <mxGeometry x="10" y="206" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="7" DynamicNextId="" SubType="choice" Key="7" id="57">
      <mxCell style="choiceNode" vertex="1" parent="36">
        <mxGeometry x="10" y="236" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="8" DynamicNextId="" SubType="choice" Key="8" id="58">
      <mxCell style="choiceNode" vertex="1" parent="36">
        <mxGeometry x="10" y="266" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="9" DynamicNextId="" SubType="choice" Key="9" id="59">
      <mxCell style="choiceNode" vertex="1" parent="36">
        <mxGeometry x="10" y="296" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="0" DynamicNextId="" SubType="choice" Key="0" id="60">
      <mxCell style="choiceNode" vertex="1" parent="36">
        <mxGeometry x="10" y="326" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="#" DynamicNextId="" SubType="choice" Key="#" id="62">
      <mxCell style="choiceNode" vertex="1" parent="36">
        <mxGeometry x="10" y="356" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="*" DynamicNextId="" SubType="choice" Key="*" id="41">
      <mxCell style="choiceNode" parent="36" vertex="1">
        <mxGeometry x="10" y="386" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no input" DynamicNextId="" SubType="noInput" id="42">
      <mxCell style="noInputNode" parent="36" vertex="1">
        <mxGeometry x="10" y="416" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
  </root>
</mxGraphModel>;
