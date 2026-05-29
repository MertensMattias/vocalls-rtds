<mxGraphModel
  dx="4432"
  dy="2425"
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
      Code=""
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&#39;en&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;English&#39;,&#39;ttsLanguageCode&#39;:&#39;en-US&#39;,&#39;ttsVoiceName&#39;:&#39;en-US-Andrew:DragonHDLatestNeural&#39;,&#39;ttsEngine&#39;:&#39;Microsoft&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:true},&#39;es&#39;:{&#39;languageName&#39;:&#39;Spanish&#39;,&#39;ttsLanguageCode&#39;:&#39;es-ES&#39;,&#39;ttsVoiceName&#39;:&#39;es-ES-AbrilNeural&#39;,&#39;ttsEngine&#39;:&#39;Microsoft&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:true,&#39;isDefault&#39;:false}}"
      Variables="__minTimeout = 4000; &#xa;__maxTimeout = 20000; &#xa;__skipIfInbound = true; &#xa;__outputVariable&amp;=voicemailDetectedLanguage;"
      HintGrammar=""
      PropertiesDefinition='[ &#xa;    { &#xa;        "name": "__minTimeout", &#xa;        "title": "Min timeout", &#xa;        "hint": "The minimum time the component waits to hear speech from the user. The default value is 4000 milliseconds.", &#xa;        "multiLanguage": false, &#xa;        "controlSettings": { &#xa;            "defaultValue": "4000", &#xa;            "controlType": "text", &#xa;            "maxLength": 50, &#xa;            "dataType": "string", &#xa;            "readonly": false &#xa;        } &#xa;    }, &#xa;    { &#xa;        "name": "__maxTimeout", &#xa;        "title": "Max timeout", &#xa;        "hint": "The maximum time this component allows the user to speak before being interrupted. The default value is 20000 milliseconds.", &#xa;        "multiLanguage": false, &#xa;        "controlSettings": { &#xa;            "defaultValue": "20000", &#xa;            "controlType": "text", &#xa;            "maxLength": 50, &#xa;            "dataType": "string", &#xa;            "readonly": false &#xa;        } &#xa;    }, &#xa;    { &#xa;        "name": "__skipIfInbound", &#xa;        "title": "Skip if inbound", &#xa;        "hint": "If set to true, the component will be ignored in incoming calls (default state). The reason why this can be disabled is that if a different system is used for dialing outgoing calls and the call is sent to the voicebot when connected (in which case it is technically an incoming call).", &#xa;        "controlSettings": { &#xa;            "controlType": "dropdown", &#xa;            "defaultValue": "false", &#xa;            "options": [ &#xa;                "true", &#xa;                "false" &#xa;            ] &#xa;        }  &#xa;    }, &#xa;    { &#xa;        "name": "__outputVariable", &#xa;        "title": "Output variable", &#xa;        "hint": "The name of the variable in which the detected language is stored after leaving the component (for example, en or es).", &#xa;        "multiLanguage": false, &#xa;        "controlSettings": { &#xa;            "defaultValue": "voicemailDetectedLanguage", &#xa;            "controlType": "text", &#xa;            "maxLength": 100, &#xa;            "dataType": "string", &#xa;            "readonly": false &#xa;        } &#xa;    }, &#xa;    { &#xa;        "name": "__welcomeMessage", &#xa;        "title": "Bot response to silence", &#xa;        "hint": "In case there is no input after the call started, the bot will say this message to allow more time to get a reply.", &#xa;        "defaultValue": "Hello. Can you hear me?", &#xa;        "multiLanguage": true, &#xa;        "controlSettings": { &#xa;            "controlType": "text", &#xa;            "maxLength": 200, &#xa;            "dataType": "string", &#xa;            "readonly": false &#xa;        } &#xa;    }, &#xa;    { &#xa;        "name": "__replyToScreeningAI", &#xa;        "title": "Bot response for screening engine", &#xa;        "hint": "In this field, enter the exact sentence the bot should use to briefly introduce itself when it encounters a screening system running iOS 26 or higher.", &#xa;        "defaultValue": "Hello, this is Jane Smith calling from ABC Bank regarding your contract.", &#xa;        "multiLanguage": true, &#xa;        "controlSettings": { &#xa;            "controlType": "text", &#xa;            "maxLength": 1000, &#xa;            "dataType": "string", &#xa;            "readonly": false &#xa;        } &#xa;    }, &#xa;    { &#xa;        "name": "__recordMessage", &#xa;        "title": "Voicemail message (optional - see hint)", &#xa;        "hint": "The message the bot should leave in the user&#39;s voicemail. If this field is left blank, no message will be saved, and the flow will continue using the &#39;voicemail&#39; output from this component, allowing you to add your own logic later. If a message is entered in this field, the call will be terminated inside this component. For custom logic via the &#39;voicemail&#39; output, a variable __voicemailDetectedLanguage is available, containing a two-letter code for the detected language (for example en, es, etc.).", &#xa;        "defaultValue": "Hello, we called you from ABC Bank regarding your contract. Please call us back. Thank you.", &#xa;        "multiLanguage": true, &#xa;        "controlSettings": { &#xa;            "controlType": "text", &#xa;            "maxLength": 1000, &#xa;            "dataType": "string", &#xa;            "readonly": false &#xa;        } &#xa;    }, &#xa;    { &#xa;        "name": "__terminationKeywords", &#xa;        "title": "Expected termination keywords (optional – see hint)", &#xa;        "hint": "Common keywords in a voicemail signaling that the message was successfully received.", &#xa;        "defaultValue": "thank you, thanks, saved, gracias, gracias, salvado", &#xa;        "multiLanguage": true, &#xa;        "controlSettings": { &#xa;            "controlType": "text", &#xa;            "maxLength": 1000, &#xa;            "dataType": "string", &#xa;            "readonly": false &#xa;        } &#xa;    } &#xa;]'
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      Translations='__welcomeMessage = "Hello. Can you hear me?"; &#xa;__replyToScreeningAI = "Hello, this is John Smith calling from ABC regarding your contract."; &#xa;__recordMessage = "Hello, we called you from ABC regarding your contract. Please call us back. Thank you."; &#xa;__terminationKeywords = "thank you, thanks, saved, gracias, gracias, salvado";'
      ManualId=""
      LastLanguage="en"
      Translations_es='__welcomeMessage = "Hola. ¿Puedes escucharme?"; &#xa;__replyToScreeningAI = "Hola, soy Juan Pérez, de ABC, y le llamo en relación con su contrato."; &#xa;__recordMessage = "Hola, le hemos llamado desde ABC en relación con su contrato. Por favor, llámenos. Gracias."; &#xa;__terminationKeywords = "thank you, thanks, saved, gracias, gracias, salvado";'
      Sections="[]"
      id="vocalls-master-layer"
    >
      <mxCell />
    </object>
    <mxCell id="baselayer" parent="vocalls-master-layer" />
    <mxCell
      id="390"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="0"
      target="8"
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
      id="0"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="232" y="-220" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="388"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="8"
      target="9"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="init"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="__additionsCounter = 0; &#xa;__lineActivity = null; &#xa;__callAnswerCategory = 0; &#xa;voicemailDetectedLanguage = null; &#xa; &#xa;// Check whether the flow is a chat/voice bot &#xa;__conversationType = &#39;chatbot&#39;; &#xa; &#xa;try { &#xa;    if (context.callInfo.from) { &#xa;        __conversationType = &#39;voicebot&#39;; &#xa;    } &#xa;} catch (e) { &#xa; &#xa;}"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="8"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="213" y="-140" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="voicemail"
      Type="transient"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      DynamicNextId=""
      Title="voicemail"
      Kind="output"
      id="14"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="1610" y="1590" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="not exists"
      Type="transient"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      DynamicNextId=""
      Title="not exists"
      Kind="output"
      id="15"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="740" y="1590" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="not available"
      Type="transient"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      DynamicNextId=""
      Title="not available"
      Kind="output"
      id="16"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="495" y="1590" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="call answered"
      Type="transient"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      DynamicNextId=""
      Title="call answered"
      Kind="output"
      Text="{Speech.ssml(__initialMessage1)}"
      Text_cs="{Speech.ssml(__initialMessage1)}"
      Text_sk="{Speech.ssml(__initialMessage1)}"
      Text_hu="{Speech.ssml(__initialMessage1)}"
      Text_pl="undefined"
      Text_fr="undefined"
      Text_de="undefined"
      Text_es="undefined"
      AltTexts=""
      AltTexts_cs=""
      AltTexts_sk=""
      AltTexts_hu=""
      AltTexts_pl="undefined"
      AltTexts_fr="undefined"
      AltTexts_de="undefined"
      AltTexts_es="undefined"
      id="17"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="-140" y="1590" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="251"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="25"
      target="245"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="set call status to VOICEMAIL"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="context.triggerVoicemail();"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="25"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="1150" y="1205" width="209" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="33"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="28"
      target="32"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="31"
      value='&lt;font style="font-size: 27px"&gt;Most common voicemail keywords and word phrases in English and Spanish&lt;/font&gt;'
      style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=17;connectable=0;allowArrows=0;"
      parent="baselayer"
      vertex="1"
    >
      <mxGeometry x="435" y="408" width="395" height="110" as="geometry" />
    </mxCell>
    <mxCell
      id="385"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="32"
      target="375"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="process output"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='var __mainCategories = { &#xa;    0: "not classified", &#xa;    1: "voicemail", &#xa;    2: "not exists / unreachable", &#xa;    3: "not available", &#xa;    4: "call answered", &#xa;    5: "call screening message", &#xa;}; &#xa; &#xa;function __isValidJSON(jsonObj) { &#xa;    try { &#xa;        JSON.parse(jsonObj); &#xa;        return true; // Valid JSON &#xa;    } catch (e) { &#xa;        return false; // Invalid JSON &#xa;    } &#xa;} &#xa; &#xa;if (__isValidJSON(__callAnswer)) { &#xa;    var __json = JSON.parse(__callAnswer); &#xa;    __callAnswerCategory = __json.hasOwnProperty("category") ? Number(__json["category"]) : 0; &#xa;    voicemailDetectedLanguage = __json.hasOwnProperty("language") &amp;&amp; !!__json["language"] ? __json["language"] : null; &#xa;} else { &#xa;    __callAnswerCategory = 0; &#xa;    voicemailDetectedLanguage = null; &#xa;} &#xa; &#xa;log_debug("Voicemail detector: Recognized speech: " + __recognizedSpeech + &#39;, language: &#39; + voicemailDetectedLanguage + ", category: " + __mainCategories[__callAnswerCategory]);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="32"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="214" y="850" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="35"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="160" y="1144" width="275" height="246" as="geometry" />
      </mxCell>
    </object>
    <object id="36">
      <mxCell style="caseInnerNode" parent="35" vertex="1">
        <mxGeometry x="10" y="16" width="255" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" DynamicNextId="" SubType="default" id="37">
      <mxCell style="defaultNode" parent="35" vertex="1">
        <mxGeometry x="10" y="56" width="255" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__callAnswerCategory == 1"
      DynamicNextId=""
      SubType="expression"
      Expression="__callAnswerCategory == 1"
      id="40"
    >
      <mxCell style="expressionNode" parent="35" vertex="1">
        <mxGeometry x="10" y="86" width="255" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__callAnswerCategory == 2"
      DynamicNextId=""
      SubType="expression"
      Expression="__callAnswerCategory == 2"
      id="41"
    >
      <mxCell style="expressionNode" parent="35" vertex="1">
        <mxGeometry x="10" y="116" width="255" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__callAnswerCategory == 3"
      DynamicNextId=""
      SubType="expression"
      Expression="__callAnswerCategory == 3"
      id="43"
    >
      <mxCell style="expressionNode" parent="35" vertex="1">
        <mxGeometry x="10" y="146" width="255" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__callAnswerCategory == 4"
      DynamicNextId=""
      SubType="expression"
      Expression="__callAnswerCategory == 4"
      id="42"
    >
      <mxCell style="expressionNode" parent="35" vertex="1">
        <mxGeometry x="10" y="176" width="255" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__callAnswerCategory == 5"
      DynamicNextId=""
      SubType="expression"
      Expression="__callAnswerCategory == 5"
      id="44"
    >
      <mxCell style="expressionNode" parent="35" vertex="1">
        <mxGeometry x="10" y="206" width="255" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="73"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="54"
      target="72"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="picked by AI"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="picked by AI"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="54"
    >
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="232.5" y="1520" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="57"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="55"
      target="25"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="regular voicemail"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="regular voicemail"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="55"
    >
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="870" y="1225" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="212"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="72"
      target="84"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="{Speech.ssml(__replyToScreeningAI)}"
      Type="say"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      DynamicNextId=""
      Text="{Speech.ssml(__replyToScreeningAI)}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      DynamicNextTabGuid=""
      ContinueAfter="100"
      WaitForPrevious="false"
      Cache="false"
      EscapeXML="true"
      OutputFilter=""
      Text_es="{Speech.ssml(__replyToScreeningAI)}"
      AltTexts_es=""
      id="72"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry
          x="169.25"
          y="1720"
          width="256.5"
          height="80"
          as="geometry"
        />
      </mxCell>
    </object>
    <mxCell
      id="383"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="74"
      target="28"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="process input"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='__conversationHistoryForVoicemail = ""; &#xa; &#xa;for (i = 0; i &lt; context.speakFlow.size; i++) { &#xa;    var __spItem = context.speakFlow.get(i); &#xa;    if (__spItem.type == 3) &#xa;        __conversationHistoryForVoicemail += "Bot: " + __spItem.activity + "\r\n"; &#xa;    if (__spItem.type == 5) &#xa;        __conversationHistoryForVoicemail += "User: " + __spItem.activity + "\r\n";     &#xa;}'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="74"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="213.5" y="570" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="114"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="123"
      target="116"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="115"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="116"
      target="117"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="282"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="264"
      target="281"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="377"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="20"
      target="74"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="recognize"
      OnEnter=""
      OnLeave=""
      Timeout="__maxTimeout"
      MinTimeout="__minTimeout"
      ExpectedSpeechType="default"
      SpeechConfigParams=""
      SimilarityTreshold=""
      NoiseDistance=""
      ReactionType="normal"
      VariableName="__recognizedSpeech"
      HintKeywords="after the tone, after the signal, as soon as possible, as soon as I can, at the tone, back to you, busy right now, is busy, can&#39;t answer your call, can&#39;t take your call, call has been forwarded, leave your message, leave a message, person you are calling, record your message, thank you for calling, you&#39;ve reached, you have reached, you have called, voicemail, voice mail, unable to take your call, menu options, beep, press, buzón de voz, marque la tecla gato, grabe su mensaje, despues del tono, Bienvenido al buzón, no te puedo contestar, por favor deje su mensaje, Bienvenido al buzón, Esta llamada será cobrada al finalizar el tono, numero ocupado, Me comunico más tarde, no puedo responder, Tu llamada se reenvió, finalizada la grabación, Estás hablando al buzón, este es el buzón de voz, su llamada ha sido desviada a un sistema de mensajería automática, volver a grabar marque el signo, buzón Telcel, Movistar, línea ocupada, finalice su mensaje, devolveré la llamada, deja tu mensaje"
      HintGrammar=""
      Wait=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      SpeechRecognition="default"
      ResponseAudio="false"
      NLPEngine="Embedding"
      ReactionIntervalCustom="1000"
      AcceptAnyResponse="true"
      ResponseAffirmation="false"
      ResponseSilence="false"
      Format=""
      Input=""
      ModelId=""
      Language="es-US"
      AlternativeLanguages=""
      AllowGlobalIntent="true"
      CustomMiddlewares=""
      UseContext="false"
      IncludeInSpeakflow="true"
      HintKeywords_es="after the tone, after the signal, as soon as possible, as soon as I can, at the tone, back to you, busy right now, is busy, can&#39;t answer your call, can&#39;t take your call, call has been forwarded, leave your message, leave a message, person you are calling, record your message, thank you for calling, you&#39;ve reached, you have reached, you have called, voicemail, voice mail, unable to take your call, menu options, beep, press, buzón de voz, marque la tecla gato, grabe su mensaje, despues del tono, Bienvenido al buzón, no te puedo contestar, por favor deje su mensaje, Bienvenido al buzón, Esta llamada será cobrada al finalizar el tono, numero ocupado, Me comunico más tarde, no puedo responder, Tu llamada se reenvió, finalizada la grabación, Estás hablando al buzón, este es el buzón de voz, su llamada ha sido desviada a un sistema de mensajería automática, volver a grabar marque el signo, buzón Telcel, Movistar, línea ocupada, finalice su mensaje, devolveré la llamada, deja tu mensaje"
      id="20"
    >
      <mxCell style="recognizeNode" parent="baselayer" vertex="1">
        <mxGeometry x="190" y="400" width="215" height="120" as="geometry" />
      </mxCell>
    </object>
    <object id="21">
      <mxCell style="recognizeInnerNode" parent="20" vertex="1">
        <mxGeometry x="10" y="16" width="195" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="no input" DynamicNextId="" SubType="noInput" id="341">
      <mxCell style="noInputNode" parent="20" vertex="1">
        <mxGeometry x="10" y="56" width="195" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="347"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="343"
      target="342"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="counter"
      OnEnter=""
      OnLeave=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      VariableName=""
      id="343"
    >
      <mxCell style="counterNode" parent="baselayer" vertex="1">
        <mxGeometry y="408" width="140" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="344">
      <mxCell style="counterInnerNode" parent="343" vertex="1">
        <mxGeometry x="10" y="16" width="120" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="&amp;gt;= 2"
      DynamicNextId=""
      SubType="expression"
      Expression="&gt;= 2"
      id="345"
    >
      <mxCell style="expressionNode" parent="343" vertex="1">
        <mxGeometry x="10" y="56" width="120" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="245"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="1440" y="1182" width="160" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="246">
      <mxCell style="caseInnerNode" parent="245" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="!!__recordMessage"
      DynamicNextId=""
      SubType="expression"
      Expression="!!__recordMessage"
      DynamicNextTabGuid=""
      id="247"
    >
      <mxCell style="expressionNode" parent="245" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" DynamicNextId="" SubType="default" id="248">
      <mxCell style="defaultNode" parent="245" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="component"
      ComponentGuid="218fb1d9-4d5d-4b65-941b-d244626529bb"
      ComponentVersion=""
      SupportedLanguages="en;es;cs;sk;nl;de;fr;cl;co;mx;pl;et;lv;id;hu;hr;tr;"
      __gptProvider='"AzureOpenAI"'
      __gptModel='"gpt-4.1-nano"'
      __gptServiceHost='""'
      __temperature="0.0"
      __passExistingDialog="false"
      __outputVariable="__callAnswer"
      mlctp___prompt_en='You are an expert telephony and call-answer classifier. &#xa;&#xa;Classify the phone call audio transcription in Spanish or English into one of the following categories: &#xa;&#xa;1) The call was answered by a voicemail or IVR. &#xa;There is an instruction to leave a message, to dial an extension, to press a number or there are menu options. &#xa;Menu options + numbers + instructions = IVR, in any language. &#xa;Common indicators: &#xa;“leave a message”, “record your message”, “leave a message after the beep“, “your call has been forwarded”, “cannot take your call”, "you&#39;re calling", "thanks for calling", “mailbox”, "press", "extension", "after the tone", "marque" &#xa;&#xa;2) The dialed number is unreachable or does not exist. &#xa;Typical phrasing: &#xa;“Number you dialed is not in service", “Cannot be completed as dialed”, “No longer in service” &#xa;&#xa;3) The callee is not available. &#xa;The phone is active but the person cannot take the call. &#xa;There is NO instruction to leave a message, press a number, or dial an extension. &#xa;Typical phrasing: &#xa;“The subscriber is unavailable”, “network busy”, “user is busy”, “out of coverage”, "you have reached"  &#xa;&#xa;4) A real person answered the call. &#xa;The speech usually includes a greeting and/or a question. &#xa;Short conversational responses without instructions are human. &#xa;Long monologues with menu options are NOT human. &#xa;There is NO instruction to leave a message, press a number, or dial an extension. &#xa;Examples: &#xa;"Hello?", "Hi, who is calling?", "Yes, speaking", "Hi, this is [Name]", "bueno", "Yes?", "Hold on"   &#xa;&#xa;5) It&#39;s a call screening message asking for a name and reason for calling to see if the person is available. &#xa;There is NO instruction to leave a message, press a number, or dial an extension. &#xa;It DOES NOT say that the callee is not available or not able to answer. &#xa;Mandatory indicators: &#xa;"reason for calling"&#xa;Typical phrasing: &#xa;"Hi, if you record your name and reason for calling I&#39;ll see if this person is available." &#xa;&#xa;Or return number 0 when it is NOT POSSIBLE to determine whether the call was answered by a human, call screening feature or a voicemail. If a phrase could reasonably be spoken only by a human but lacks greeting context, prefer category 0.&#xa;&#xa;Do NOT guess! Base your classification solely on the transcription provided!&#xa;&#xa;Output JSON string format with two fields:&#xa;- "category": the number of the most likely category &#xa;- "language": the most likely two-letter ISO 639-1 language code for the transcription &#xa;Never omit any field. &#xa;Always return the most likely language, even for short text. Use an empty string ONLY if the transcription is completely unidentifiable or random! &#xa;&#xa;TRANSCRIPTION:&#xa;{__conversationHistoryForVoicemail}'
      mlctp___prompt_es='You are an expert telephony and call-answer classifier. &#xa;&#xa;Do NOT guess! Base your classification solely on the transcription provided!&#xa;Output ONLY the number of the most likely category!&#xa;&#xa;Classify the phone call audio transcription into one of the following categories: &#xa;&#xa;1) The call was answered by a voicemail or IVR. There is usually an instruction to leave a message, to dial an extension or to press a number. &#xa;Common indicators: &#xa;“leave a message”, “record your message”, “leave a message after the beep“, “your call has been forwarded”, “cannot take your call”, "you&#39;re calling", "thanks for calling", “mailbox”, "press", "extension", "after the tone" &#xa;&#xa;2) The dialed number is unreachable or does not exist. &#xa;Typical phrasing: &#xa;“Number you dialed is not in service", “Cannot be completed as dialed”, “No longer in service” &#xa;&#xa;3) The callee is not available. The phone is active but the person cannot take the call. &#xa;There is NO instruction to leave a message, press a number, or dial an extension. &#xa;Typical phrasing: &#xa;“The subscriber is unavailable”, “network busy”, “user is busy”, “out of coverage”, "you have reached"  &#xa;&#xa;4) A real person answered the call. Natural conversational speech that usually includes a greeting and/or a question. &#xa;There is NO instruction to leave a message, press a number, or dial an extension. &#xa;Examples: &#xa;"Hello?", "Hi, who is calling?", "Yes, speaking", "Hi, this is [Name]", "bueno", "Yes?" &#xa;&#xa;5) It&#39;s a call screening message asking for a name and reason for calling to see if the person is available. &#xa;There is NO instruction to leave a message, press a number, or dial an extension. &#xa;It DOES NOT say that the callee is not available or not able to answer. &#xa;Mandatory indicators: &#xa;"reason for calling"&#xa;Typical phrasing: &#xa;"Hi, if you record your name and reason for calling I&#39;ll see if this person is available." &#xa;&#xa;Or return number 0 when it is NOT POSSIBLE to determine whether the call was answered by a human, call screening feature or a voicemail.&#xa;&#xa;TRANSCRIPTION:&#xa;{__conversationHistoryForVoicemail}'
      mlctp___prompt_cs="&#39;Řekni mi, jaké je hlavní město České Republiky&#39;"
      mlctp___prompt_sk="&#39;Povedzte mi, aké je hlavné mesto Českej republiky?&#39;"
      mlctp___prompt_nl='"Vertel me wat de hoofdstad van Tsjechië is"'
      mlctp___prompt_de="&#39;Sagen Sie mir, was die Hauptstadt der Tschechischen Republik ist&#39;"
      mlctp___prompt_fr="&#39;Quelle est la capitale de la République tchèque?&#39;"
      mlctp___prompt_cl="&#39;Dime ¿cuál es la capital de la República Checa?&#39;"
      mlctp___prompt_co="&#39;Dígame cuál es la capital de la República Checa&#39;"
      mlctp___prompt_mx="&#39;Dime ¿cuál es la capital de la República Checa?&#39;"
      mlctp___prompt_pl="&#39;Powiedz mi, jaka jest stolica Czech?&#39;"
      mlctp___prompt_et="&#39;Ütle mulle, mis on Tšehhi Vabariigi pealinn?&#39;"
      mlctp___prompt_lv="&#39;Sakiet man, kāda ir Čehijas galvaspilsēta?&#39;"
      mlctp___prompt_id="&#39;Beritahu saya apa ibu kota Republik Ceko?&#39;"
      mlctp___prompt_hu="&#39;Mondd meg, mi Csehország fővárosa?&#39;"
      mlctp___prompt_hr="&#39;Reci mi koji je glavni grad Češke Republike?&#39;"
      mlctp___prompt_tr='"Bana Türkiye&#39;nin başkentinin neresi olduğunu söyle ?"'
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptProvider\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM provider\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM provider name. For example AzureOpenAI. If empty, the default provider will be used, defined in Bot persona component\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;default\&#39;,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;default\&#39;,\r\n                \&#39;AzureOpenAI\&#39;,\r\n                \&#39;OpenAI\&#39;,\r\n                \&#39;Gemini\&#39;,\r\n                \&#39;Claude\&#39;\r\n            ]\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptModel\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM Model\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM model name. For example, gpt-4o. If empty, the default model will be used, defined in Bot persona component\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;default\&#39;,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;default\&#39;,\r\n                \&#39;gpt-4o\&#39;,\r\n                \&#39;gpt-4o-mini\&#39;,\r\n                \&#39;gpt-4.1\&#39;,\r\n                \&#39;gpt-4.1-mini\&#39;,\r\n                \&#39;gpt-4.1-nano\&#39;,\r\n                \&#39;gemini-2.0-flash\&#39;,\r\n                \&#39;gemini-2.0-flash-lite\&#39;,\r\n                \&#39;claude-3-7-sonnet-latest\&#39;,\r\n                \&#39;claude-3-5-haiku-latest\&#39;\r\n            ]\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptServiceHost\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM endpoint\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM base endpoint url. For example vocallsopenaise.openai.azure.com. If empty, the default host will be used, defined in Bot persona component or module configuration.\&#39;,\r\n        \&#39;defaultValue\&#39;: \&#39;\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\r\n            \&#39;maxLength\&#39;: 1000,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;readonly\&#39;: false\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__temperature\&#39;,\r\n        \&#39;title\&#39;: \&#39;Temperature\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM temperature. The recommended value is between 0.0 and 1.0. Default 0.0\&#39;,\r\n        \&#39;multiLanguage\&#39;: false,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;defaultValue\&#39;: \&#39;0\&#39;,\r\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\r\n            \&#39;maxLength\&#39;: 50,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;readonly\&#39;: false\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__passExistingDialog\&#39;,\r\n        \&#39;title\&#39;: \&#39;Pass dialog history\&#39;,\r\n        \&#39;hint\&#39;: \&#39;If true, the entire dialog history is passed to the GPT, otherwise not.\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;false\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;true\&#39;,\r\n                \&#39;false\&#39;\r\n            ]\r\n        }\r\n    }\r\n]&#39;"
      id="28"
    >
      <mxCell style="component3Node" parent="baselayer" vertex="1">
        <mxGeometry x="220.5" y="750" width="155" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="Prompt" id="29">
      <mxCell style="componentInnerNode" parent="28" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label="process output"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='var __resultCategories = {&#xa;    0: "stay on the line",&#xa;    1: "leave a message (voicemail)",&#xa;    2: "call answered",&#xa;};&#xa;var __result = __callScreeningResultCategory.match(/\d/); &#xa;__callScreeningResultCategory = __result !== null ? Number(__result.at(0)) : 0; &#xa;log_debug("Voicemail detector: Call screening result category: " + __resultCategories[__callScreeningResultCategory]);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="116"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="214" y="3170" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="recognize"
      OnEnter=""
      OnLeave=""
      Timeout="8000"
      MinTimeout="2500"
      ExpectedSpeechType="default"
      SpeechConfigParams=""
      SimilarityTreshold=""
      NoiseDistance=""
      ReactionType="normal"
      VariableName="__recognizedSpeech"
      HintKeywords=""
      HintGrammar=""
      Wait=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      SpeechRecognition="default"
      ResponseAudio="false"
      NLPEngine="default"
      ReactionIntervalCustom=""
      AcceptAnyResponse="true"
      ResponseAffirmation="false"
      ResponseSilence="true"
      Format=""
      Input=""
      ModelId=""
      Language="es-US"
      AlternativeLanguages=""
      AllowGlobalIntent="true"
      CustomMiddlewares=""
      UseContext="false"
      IncludeInSpeakflow="true"
      HintKeywords_es=""
      id="235"
    >
      <mxCell style="recognizeNode" parent="baselayer" vertex="1">
        <mxGeometry x="1750" y="1323" width="176" height="176" as="geometry" />
      </mxCell>
    </object>
    <object id="236">
      <mxCell style="recognizeInnerNode" parent="235" vertex="1">
        <mxGeometry x="10" y="16" width="156" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="no match" DynamicNextId="" SubType="notRecognized" id="237">
      <mxCell style="notRecognizedNode" parent="235" vertex="1">
        <mxGeometry x="10" y="56" width="156" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="termination"
      SubType="reactionGroup"
      Priority="5"
      Lemma="true"
      MaxWords=""
      DynamicNextId=""
      Keywords="{__terminationKeywords}"
      Grammar=""
      Sentences=""
      Groups=""
      OnSelected=""
      Context="true"
      Synonyms="false"
      ApplyWhen=""
      Weight="1"
      QuickReply=""
      Notes=""
      DynamicNextTabGuid=""
      Description=""
      Description_es=""
      Groups_es=""
      Keywords_es="{__terminationKeywords}"
      Sentences_es=""
      QuickReply_es=""
      id="238"
    >
      <mxCell style="reactionGroupNode" parent="235" vertex="1">
        <mxGeometry x="10" y="86" width="156" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no input" DynamicNextId="" SubType="noInput" id="239">
      <mxCell style="noInputNode" parent="235" vertex="1">
        <mxGeometry x="10" y="116" width="156" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="146"
      value='&lt;font style="font-size: 27px"&gt;1) leave a message (voicemail)&lt;br&gt;2) call answered&lt;/font&gt;'
      style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=17;connectable=0;allowArrows=0;"
      parent="baselayer"
      vertex="1"
    >
      <mxGeometry x="480" y="3250" width="500" height="120" as="geometry" />
    </mxCell>
    <mxCell
      id="351"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="173"
      target="25"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="call screening voicemail"
      Type="label"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Title="call screening voicemail"
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="173"
    >
      <mxCell style="labelNode" parent="baselayer" vertex="1">
        <mxGeometry x="1010" y="1360" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="336"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="176"
      target="328"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="debug"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="log_debug(&#39;Voicemail detector: Call screening result: &#39; + __callScreeningResult);"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="176"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="214" y="2590" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="182"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="90"
      target="176"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="110"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="100"
      target="105"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="process output"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='log_debug("__callScreeningMessage: " + __callScreeningMessage);&#xa;&#xa;var __messageCategories = {&#xa;    1: "call answered",&#xa;    2: "stay on the line",&#xa;};&#xa;var __message = __callScreeningMessageCategory.match(/\d/);&#xa;__callScreeningMessageCategory = __message !== null ? Number(__message.at(0)) : 0;&#xa;&#xa;log_debug("Voicemail detector: Call screening message category: " + __messageCategories[__callScreeningMessageCategory]);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="100"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="213.5" y="2090" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="101"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="102"
      target="100"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="198"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="84"
      target="102"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="145"
      value='&lt;font style="font-size: 27px"&gt;1) call answered&lt;br&gt;2) stay on the line&lt;/font&gt;'
      style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=17;connectable=0;allowArrows=0;"
      parent="baselayer"
      vertex="1"
    >
      <mxGeometry x="480" y="2290" width="340" height="60" as="geometry" />
    </mxCell>
    <mxCell
      id="233"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="234"
      target="235"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="{Speech.ssml(__recordMessage)}"
      Type="say"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Text="{Speech.ssml(__recordMessage)}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      DynamicNextTabGuid=""
      ContinueAfter="100"
      WaitForPrevious="false"
      Cache="false"
      EscapeXML="true"
      OutputFilter=""
      Text_es="{Speech.ssml(__recordMessage)}"
      AltTexts_es=""
      id="234"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="1719.5" y="1213" width="237" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="270"
      value='&lt;font style="font-size: 27px"&gt;This logic will "record" the message to voicemail with ability to being interupted. Then it will decide if it has been interupted by voicemail OR call is picked by human during recording a message.&lt;/font&gt;'
      style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=17;connectable=0;allowArrows=0;"
      parent="baselayer"
      vertex="1"
    >
      <mxGeometry x="1169" y="1020" width="811" height="20" as="geometry" />
    </mxCell>
    <mxCell
      id="384"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="281"
      target="28"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="process input"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='__conversationHistoryForVoicemail = __recognizedSpeech; &#xa;log_debug("Voicemail detector: Recognized speech during recording voicemail message: " + __conversationHistoryForVoicemail);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="281"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="425.75" y="670" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="recognize"
      OnEnter=""
      OnLeave=""
      Timeout="60000"
      MinTimeout="40000"
      ExpectedSpeechType="default"
      SpeechConfigParams=""
      SimilarityTreshold=""
      NoiseDistance=""
      ReactionType="custom"
      VariableName="__callScreeningResult"
      HintKeywords=""
      HintGrammar=""
      Wait=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      SpeechRecognition="default"
      ResponseAudio="false"
      NLPEngine="default"
      ReactionIntervalCustom="3500"
      AcceptAnyResponse="true"
      ResponseAffirmation="false"
      ResponseSilence="false"
      Format=""
      Input=""
      ModelId=""
      Language="es-US"
      AlternativeLanguages=""
      AllowGlobalIntent="true"
      CustomMiddlewares=""
      UseContext="false"
      IncludeInSpeakflow="true"
      HintKeywords_es=""
      id="90"
    >
      <mxCell style="recognizeNode" parent="baselayer" vertex="1">
        <mxGeometry x="190.5" y="2450" width="215" height="92" as="geometry" />
      </mxCell>
    </object>
    <object id="91">
      <mxCell style="recognizeInnerNode" parent="90" vertex="1">
        <mxGeometry x="10" y="16" width="195" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="105"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="148" y="2230" width="300" height="160" as="geometry" />
      </mxCell>
    </object>
    <object id="106">
      <mxCell style="caseInnerNode" parent="105" vertex="1">
        <mxGeometry x="10" y="16" width="280" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__callScreeningMessageCategory == 1"
      DynamicNextId=""
      SubType="expression"
      Expression="__callScreeningMessageCategory == 1"
      id="108"
    >
      <mxCell style="expressionNode" parent="105" vertex="1">
        <mxGeometry x="10" y="56" width="280" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__callScreeningMessageCategory == 2"
      DynamicNextId=""
      SubType="expression"
      Expression="__callScreeningMessageCategory == 2"
      id="109"
    >
      <mxCell style="expressionNode" parent="105" vertex="1">
        <mxGeometry x="10" y="86" width="280" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" DynamicNextId="" SubType="default" id="107">
      <mxCell style="defaultNode" parent="105" vertex="1">
        <mxGeometry x="10" y="116" width="280" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="component"
      ComponentGuid="218fb1d9-4d5d-4b65-941b-d244626529bb"
      ComponentVersion=""
      SupportedLanguages="en;es;cs;sk;nl;de;fr;cl;co;mx;pl;et;lv;id;hu;hr;tr;"
      __gptProvider='"AzureOpenAI"'
      __gptModel='"gpt-4.1-nano"'
      __gptServiceHost='""'
      __temperature="0.0"
      __passExistingDialog="false"
      __outputVariable="__callScreeningMessageCategory"
      mlctp___prompt_en="Classify the transcription of a phone call reply into one of the two categories:&#xa;&#xa;1) A real person answered. Includes greetings and/or natural conversational speech. &#xa;2) It&#39;s a call screening automated message. Such as “Thanks, [Name]. Please stay on the line.”, “Thanks. Please stay on the line.”, etc. &#xa;&#xa;Output ONLY the number of the most likely category! &#xa;&#xa;TRANSCRIPTION:&#xa;{__callScreeningMessage}"
      mlctp___prompt_es="Classify the transcription of a phone call reply into one of the two categories:&#xa;&#xa;1) A real person answered. Includes greetings and/or natural conversational speech. &#xa;2) It&#39;s a call screening automated message. Such as “Thanks, [Name]. Please stay on the line.”, “Thanks. Please stay on the line.”, etc. &#xa;&#xa;Output ONLY the number of the most likely category! &#xa;&#xa;TRANSCRIPTION:&#xa;{__callScreeningMessage}"
      mlctp___prompt_cs="&#39;Řekni mi, jaké je hlavní město České Republiky&#39;"
      mlctp___prompt_sk="&#39;Povedzte mi, aké je hlavné mesto Českej republiky?&#39;"
      mlctp___prompt_nl='"Vertel me wat de hoofdstad van Tsjechië is"'
      mlctp___prompt_de="&#39;Sagen Sie mir, was die Hauptstadt der Tschechischen Republik ist&#39;"
      mlctp___prompt_fr="&#39;Quelle est la capitale de la République tchèque?&#39;"
      mlctp___prompt_cl="&#39;Dime ¿cuál es la capital de la República Checa?&#39;"
      mlctp___prompt_co="&#39;Dígame cuál es la capital de la República Checa&#39;"
      mlctp___prompt_mx="&#39;Dime ¿cuál es la capital de la República Checa?&#39;"
      mlctp___prompt_pl="&#39;Powiedz mi, jaka jest stolica Czech?&#39;"
      mlctp___prompt_et="&#39;Ütle mulle, mis on Tšehhi Vabariigi pealinn?&#39;"
      mlctp___prompt_lv="&#39;Sakiet man, kāda ir Čehijas galvaspilsēta?&#39;"
      mlctp___prompt_id="&#39;Beritahu saya apa ibu kota Republik Ceko?&#39;"
      mlctp___prompt_hu="&#39;Mondd meg, mi Csehország fővárosa?&#39;"
      mlctp___prompt_hr="&#39;Reci mi koji je glavni grad Češke Republike?&#39;"
      mlctp___prompt_tr='"Bana Türkiye&#39;nin başkentinin neresi olduğunu söyle ?"'
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptProvider\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM provider\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM provider name. For example AzureOpenAI. If empty, the default provider will be used, defined in Bot persona component\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;default\&#39;,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;default\&#39;,\r\n                \&#39;AzureOpenAI\&#39;,\r\n                \&#39;OpenAI\&#39;,\r\n                \&#39;Gemini\&#39;,\r\n                \&#39;Claude\&#39;\r\n            ]\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptModel\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM Model\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM model name. For example, gpt-4o. If empty, the default model will be used, defined in Bot persona component\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;default\&#39;,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;default\&#39;,\r\n                \&#39;gpt-4o\&#39;,\r\n                \&#39;gpt-4o-mini\&#39;,\r\n                \&#39;gpt-4.1\&#39;,\r\n                \&#39;gpt-4.1-mini\&#39;,\r\n                \&#39;gpt-4.1-nano\&#39;,\r\n                \&#39;gemini-2.0-flash\&#39;,\r\n                \&#39;gemini-2.0-flash-lite\&#39;,\r\n                \&#39;claude-3-7-sonnet-latest\&#39;,\r\n                \&#39;claude-3-5-haiku-latest\&#39;\r\n            ]\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptServiceHost\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM endpoint\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM base endpoint url. For example vocallsopenaise.openai.azure.com. If empty, the default host will be used, defined in Bot persona component or module configuration.\&#39;,\r\n        \&#39;defaultValue\&#39;: \&#39;\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\r\n            \&#39;maxLength\&#39;: 1000,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;readonly\&#39;: false\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__temperature\&#39;,\r\n        \&#39;title\&#39;: \&#39;Temperature\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM temperature. The recommended value is between 0.0 and 1.0. Default 0.0\&#39;,\r\n        \&#39;multiLanguage\&#39;: false,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;defaultValue\&#39;: \&#39;0\&#39;,\r\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\r\n            \&#39;maxLength\&#39;: 50,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;readonly\&#39;: false\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__passExistingDialog\&#39;,\r\n        \&#39;title\&#39;: \&#39;Pass dialog history\&#39;,\r\n        \&#39;hint\&#39;: \&#39;If true, the entire dialog history is passed to the GPT, otherwise not.\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;false\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;true\&#39;,\r\n                \&#39;false\&#39;\r\n            ]\r\n        }\r\n    }\r\n]&#39;"
      id="102"
    >
      <mxCell style="component3Node" parent="baselayer" vertex="1">
        <mxGeometry x="220.5" y="1980" width="155" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="Prompt" id="103">
      <mxCell style="componentInnerNode" parent="102" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="recognize"
      OnEnter=""
      OnLeave=""
      Timeout="6000"
      MinTimeout="2500"
      ExpectedSpeechType="default"
      SpeechConfigParams=""
      SimilarityTreshold=""
      NoiseDistance=""
      ReactionType="fast"
      VariableName="__callScreeningMessage"
      HintKeywords=""
      HintGrammar=""
      Wait=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      SpeechRecognition="default"
      ResponseAudio="false"
      NLPEngine="default"
      ReactionIntervalCustom=""
      AcceptAnyResponse="false"
      ResponseAffirmation="false"
      ResponseSilence="false"
      Format=""
      Input=""
      ModelId=""
      Language="es-US"
      AlternativeLanguages=""
      AllowGlobalIntent="true"
      CustomMiddlewares=""
      UseContext="false"
      IncludeInSpeakflow="true"
      HintKeywords_es=""
      id="84"
    >
      <mxCell style="recognizeNode" parent="baselayer" vertex="1">
        <mxGeometry x="190" y="1840" width="215" height="90" as="geometry" />
      </mxCell>
    </object>
    <object id="85">
      <mxCell style="recognizeInnerNode" parent="84" vertex="1">
        <mxGeometry x="10" y="16" width="195" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="338"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="330"
      target="331"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="process output"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='var __resultWaitCategories = {&#xa;    0: "user reply",&#xa;    1: "stay on the line",&#xa;};&#xa;var __resultWait = __stayOnTheLine.match(/\d/); &#xa;__stayOnTheLine = __resultWait !== null ? Number(__resultWait.at(0)) : 0; &#xa;log_debug("Voicemail detector: What call screening reply was received? " + __resultWaitCategories[__stayOnTheLine]);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="330"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="214" y="2800" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="337"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="328"
      target="330"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="218fb1d9-4d5d-4b65-941b-d244626529bb"
      ComponentVersion=""
      SupportedLanguages="en;es;cs;sk;nl;de;fr;cl;co;mx;pl;et;lv;id;hu;hr;tr;"
      __gptProvider='"AzureOpenAI"'
      __gptModel='"gpt-4.1-nano"'
      __gptServiceHost='""'
      __temperature="0.0"
      __passExistingDialog="false"
      __outputVariable="__stayOnTheLine"
      mlctp___prompt_en='You are a strict text classifier.&#xa;&#xa;Task:&#xa;Classify the transcription into one of two categories based on whether it is an automated hold message that ends immediately after instructing the caller to wait.&#xa;&#xa;Category 1: AUTOMATED HOLD MESSAGE&#xa;- The transcription contains a hold instruction. Acceptable phrases include but are not limited to:&#xa;  "stay on the line", "please wait", "hold the line", "please remain on the line"&#xa;- The transcription ENDS immediately after the hold instruction.&#xa;- No additional words, sentences, or punctuation appear after the hold instruction.&#xa;- Extra polite words before the hold instruction (like "Thanks") are allowed.&#xa;&#xa;Category 0: OTHER / HUMAN REPLY&#xa;- Any transcription that does not meet ALL requirements of category 1:&#xa;  - Does not contain a hold instruction&#xa;  - OR contains text after the hold instruction&#xa;&#xa;Rules:&#xa;- Base the classification only on the transcription text&#xa;- Output ONLY: 1 or 0&#xa;- Choose 1 only if the transcription contains a hold instruction and ends immediately after it&#xa;&#xa;TRANSCRIPTION:&#xa;{__callScreeningResult}'
      mlctp___prompt_es='You are a strict text classifier.&#xa;&#xa;Task:&#xa;Classify the transcription into one of two categories based on whether it is an automated hold message that ends immediately after instructing the caller to wait.&#xa;&#xa;Category 1: AUTOMATED HOLD MESSAGE&#xa;- The transcription contains a hold instruction. Acceptable phrases include but are not limited to:&#xa;  "stay on the line", "please wait", "hold the line", "please remain on the line"&#xa;- The transcription ENDS immediately after the hold instruction.&#xa;- No additional words, sentences, or punctuation appear after the hold instruction.&#xa;- Extra polite words before the hold instruction (like "Thanks") are allowed.&#xa;&#xa;Category 0: OTHER / HUMAN REPLY&#xa;- Any transcription that does not meet ALL requirements of category 1:&#xa;  - Does not contain a hold instruction&#xa;  - OR contains text after the hold instruction&#xa;&#xa;Rules:&#xa;- Base the classification only on the transcription text&#xa;- Output ONLY: 1 or 0&#xa;- Choose 1 only if the transcription contains a hold instruction and ends immediately after it&#xa;&#xa;TRANSCRIPTION:&#xa;{__callScreeningResult}'
      mlctp___prompt_cs="&#39;Řekni mi, jaké je hlavní město České Republiky&#39;"
      mlctp___prompt_sk="&#39;Povedzte mi, aké je hlavné mesto Českej republiky?&#39;"
      mlctp___prompt_nl='"Vertel me wat de hoofdstad van Tsjechië is"'
      mlctp___prompt_de="&#39;Sagen Sie mir, was die Hauptstadt der Tschechischen Republik ist&#39;"
      mlctp___prompt_fr="&#39;Quelle est la capitale de la République tchèque?&#39;"
      mlctp___prompt_cl="&#39;Dime ¿cuál es la capital de la República Checa?&#39;"
      mlctp___prompt_co="&#39;Dígame cuál es la capital de la República Checa&#39;"
      mlctp___prompt_mx="&#39;Dime ¿cuál es la capital de la República Checa?&#39;"
      mlctp___prompt_pl="&#39;Powiedz mi, jaka jest stolica Czech?&#39;"
      mlctp___prompt_et="&#39;Ütle mulle, mis on Tšehhi Vabariigi pealinn?&#39;"
      mlctp___prompt_lv="&#39;Sakiet man, kāda ir Čehijas galvaspilsēta?&#39;"
      mlctp___prompt_id="&#39;Beritahu saya apa ibu kota Republik Ceko?&#39;"
      mlctp___prompt_hu="&#39;Mondd meg, mi Csehország fővárosa?&#39;"
      mlctp___prompt_hr="&#39;Reci mi koji je glavni grad Češke Republike?&#39;"
      mlctp___prompt_tr='"Bana Türkiye&#39;nin başkentinin neresi olduğunu söyle ?"'
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptProvider\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM provider\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM provider name. For example AzureOpenAI. If empty, the default provider will be used, defined in Bot persona component\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;default\&#39;,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;default\&#39;,\r\n                \&#39;AzureOpenAI\&#39;,\r\n                \&#39;OpenAI\&#39;,\r\n                \&#39;Gemini\&#39;,\r\n                \&#39;Claude\&#39;\r\n            ]\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptModel\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM Model\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM model name. For example, gpt-4o. If empty, the default model will be used, defined in Bot persona component\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;default\&#39;,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;default\&#39;,\r\n                \&#39;gpt-4o\&#39;,\r\n                \&#39;gpt-4o-mini\&#39;,\r\n                \&#39;gpt-4.1\&#39;,\r\n                \&#39;gpt-4.1-mini\&#39;,\r\n                \&#39;gpt-4.1-nano\&#39;,\r\n                \&#39;gemini-2.0-flash\&#39;,\r\n                \&#39;gemini-2.0-flash-lite\&#39;,\r\n                \&#39;claude-3-7-sonnet-latest\&#39;,\r\n                \&#39;claude-3-5-haiku-latest\&#39;\r\n            ]\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptServiceHost\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM endpoint\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM base endpoint url. For example vocallsopenaise.openai.azure.com. If empty, the default host will be used, defined in Bot persona component or module configuration.\&#39;,\r\n        \&#39;defaultValue\&#39;: \&#39;\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\r\n            \&#39;maxLength\&#39;: 1000,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;readonly\&#39;: false\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__temperature\&#39;,\r\n        \&#39;title\&#39;: \&#39;Temperature\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM temperature. The recommended value is between 0.0 and 1.0. Default 0.0\&#39;,\r\n        \&#39;multiLanguage\&#39;: false,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;defaultValue\&#39;: \&#39;0\&#39;,\r\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\r\n            \&#39;maxLength\&#39;: 50,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;readonly\&#39;: false\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__passExistingDialog\&#39;,\r\n        \&#39;title\&#39;: \&#39;Pass dialog history\&#39;,\r\n        \&#39;hint\&#39;: \&#39;If true, the entire dialog history is passed to the GPT, otherwise not.\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;false\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;true\&#39;,\r\n                \&#39;false\&#39;\r\n            ]\r\n        }\r\n    }\r\n]&#39;"
      id="328"
    >
      <mxCell style="component3Node" parent="baselayer" vertex="1">
        <mxGeometry x="220" y="2700" width="155" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="Prompt" id="329">
      <mxCell style="componentInnerNode" parent="328" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="117"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="148" y="3290" width="300" height="160" as="geometry" />
      </mxCell>
    </object>
    <object id="118">
      <mxCell style="caseInnerNode" parent="117" vertex="1">
        <mxGeometry x="10" y="16" width="280" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__callScreeningResultCategory == 1"
      DynamicNextId=""
      SubType="expression"
      Expression="__callScreeningResultCategory == 1"
      id="120"
    >
      <mxCell style="expressionNode" parent="117" vertex="1">
        <mxGeometry x="10" y="56" width="280" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__callScreeningResultCategory == 2"
      DynamicNextId=""
      SubType="expression"
      Expression="__callScreeningResultCategory == 2"
      id="122"
    >
      <mxCell style="expressionNode" parent="117" vertex="1">
        <mxGeometry x="10" y="86" width="280" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" DynamicNextId="" SubType="default" id="119">
      <mxCell style="defaultNode" parent="117" vertex="1">
        <mxGeometry x="10" y="116" width="280" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="component"
      ComponentGuid="218fb1d9-4d5d-4b65-941b-d244626529bb"
      ComponentVersion=""
      SupportedLanguages="en;es;cs;sk;nl;de;fr;cl;co;mx;pl;et;lv;id;hu;hr;tr;"
      __gptProvider='"AzureOpenAI"'
      __gptModel='"gpt-4.1-nano"'
      __gptServiceHost='""'
      __temperature="0.0"
      __passExistingDialog="false"
      __outputVariable="__callScreeningResultCategory"
      mlctp___prompt_en='You are a strict text classifier.&#xa;&#xa;Task:&#xa;Classify the phone call screening reply transcription into one of the following categories.&#xa;&#xa;Categories:&#xa;&#xa;1) An automated reply.&#xa;- The transcription contains information what "they said" and/or an instruction to leave a message. &#xa;- It may also include phrase "please stay on the line". &#xa;- Indicators: &#xa;“They said", "leave a message"  &#xa;&#xa;2) A real person answered. &#xa;- The transcription contains greetings and/or questions in natural conversational speech. &#xa;- There is NO instruction to leave a message or a mention what "they said"! &#xa;- It may also include phrase "stay on the line."  &#xa;&#xa;Rules:&#xa;Base your classification solely on the transcription provided! &#xa;Output ONLY the number of the MOST SPECIFIC matching category! &#xa;&#xa;TRANSCRIPTION:&#xa;{__callScreeningResult}'
      mlctp___prompt_es='You are a strict text classifier.&#xa;&#xa;Task:&#xa;Classify the phone call screening reply transcription into one of the following categories.&#xa;&#xa;Categories:&#xa;&#xa;1) An automated reply.&#xa;- The transcription contains information what "they said" and/or an instruction to leave a message. &#xa;- It may also include phrase "please stay on the line". &#xa;- Indicators: &#xa;“They said", "leave a message"  &#xa;&#xa;2) A real person answered. &#xa;- The transcription contains greetings and/or questions in natural conversational speech. &#xa;- There is NO instruction to leave a message or a mention what "they said"! &#xa;- It may also include phrase "stay on the line."  &#xa;&#xa;Rules:&#xa;Base your classification solely on the transcription provided! &#xa;Output ONLY the number of the MOST SPECIFIC matching category! &#xa;&#xa;TRANSCRIPTION:&#xa;{__callScreeningResult}'
      mlctp___prompt_cs="&#39;Řekni mi, jaké je hlavní město České Republiky&#39;"
      mlctp___prompt_sk="&#39;Povedzte mi, aké je hlavné mesto Českej republiky?&#39;"
      mlctp___prompt_nl='"Vertel me wat de hoofdstad van Tsjechië is"'
      mlctp___prompt_de="&#39;Sagen Sie mir, was die Hauptstadt der Tschechischen Republik ist&#39;"
      mlctp___prompt_fr="&#39;Quelle est la capitale de la République tchèque?&#39;"
      mlctp___prompt_cl="&#39;Dime ¿cuál es la capital de la República Checa?&#39;"
      mlctp___prompt_co="&#39;Dígame cuál es la capital de la República Checa&#39;"
      mlctp___prompt_mx="&#39;Dime ¿cuál es la capital de la República Checa?&#39;"
      mlctp___prompt_pl="&#39;Powiedz mi, jaka jest stolica Czech?&#39;"
      mlctp___prompt_et="&#39;Ütle mulle, mis on Tšehhi Vabariigi pealinn?&#39;"
      mlctp___prompt_lv="&#39;Sakiet man, kāda ir Čehijas galvaspilsēta?&#39;"
      mlctp___prompt_id="&#39;Beritahu saya apa ibu kota Republik Ceko?&#39;"
      mlctp___prompt_hu="&#39;Mondd meg, mi Csehország fővárosa?&#39;"
      mlctp___prompt_hr="&#39;Reci mi koji je glavni grad Češke Republike?&#39;"
      mlctp___prompt_tr='"Bana Türkiye&#39;nin başkentinin neresi olduğunu söyle ?"'
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptProvider\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM provider\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM provider name. For example AzureOpenAI. If empty, the default provider will be used, defined in Bot persona component\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;default\&#39;,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;default\&#39;,\r\n                \&#39;AzureOpenAI\&#39;,\r\n                \&#39;OpenAI\&#39;,\r\n                \&#39;Gemini\&#39;,\r\n                \&#39;Claude\&#39;\r\n            ]\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptModel\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM Model\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM model name. For example, gpt-4o. If empty, the default model will be used, defined in Bot persona component\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;default\&#39;,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;default\&#39;,\r\n                \&#39;gpt-4o\&#39;,\r\n                \&#39;gpt-4o-mini\&#39;,\r\n                \&#39;gpt-4.1\&#39;,\r\n                \&#39;gpt-4.1-mini\&#39;,\r\n                \&#39;gpt-4.1-nano\&#39;,\r\n                \&#39;gemini-2.0-flash\&#39;,\r\n                \&#39;gemini-2.0-flash-lite\&#39;,\r\n                \&#39;claude-3-7-sonnet-latest\&#39;,\r\n                \&#39;claude-3-5-haiku-latest\&#39;\r\n            ]\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptServiceHost\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM endpoint\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM base endpoint url. For example vocallsopenaise.openai.azure.com. If empty, the default host will be used, defined in Bot persona component or module configuration.\&#39;,\r\n        \&#39;defaultValue\&#39;: \&#39;\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\r\n            \&#39;maxLength\&#39;: 1000,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;readonly\&#39;: false\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__temperature\&#39;,\r\n        \&#39;title\&#39;: \&#39;Temperature\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM temperature. The recommended value is between 0.0 and 1.0. Default 0.0\&#39;,\r\n        \&#39;multiLanguage\&#39;: false,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;defaultValue\&#39;: \&#39;0\&#39;,\r\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\r\n            \&#39;maxLength\&#39;: 50,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;readonly\&#39;: false\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__passExistingDialog\&#39;,\r\n        \&#39;title\&#39;: \&#39;Pass dialog history\&#39;,\r\n        \&#39;hint\&#39;: \&#39;If true, the entire dialog history is passed to the GPT, otherwise not.\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;false\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;true\&#39;,\r\n                \&#39;false\&#39;\r\n            ]\r\n        }\r\n    }\r\n]&#39;"
      id="123"
    >
      <mxCell style="component3Node" parent="baselayer" vertex="1">
        <mxGeometry x="220.5" y="3070" width="155" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="Prompt" id="124">
      <mxCell style="componentInnerNode" parent="123" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="331"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="218" y="2910" width="160" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="332">
      <mxCell style="caseInnerNode" parent="331" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="!!__stayOnTheLine"
      DynamicNextId=""
      SubType="expression"
      Expression="!!__stayOnTheLine"
      DynamicNextTabGuid=""
      id="334"
    >
      <mxCell style="expressionNode" parent="331" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" DynamicNextId="" SubType="default" id="333">
      <mxCell style="defaultNode" parent="331" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="339"
      value='&lt;font style="font-size: 27px"&gt;stay on the line / user reply&lt;/font&gt;'
      style="text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=17;connectable=0;allowArrows=0;"
      parent="baselayer"
      vertex="1"
    >
      <mxGeometry x="413" y="2943" width="340" height="60" as="geometry" />
    </mxCell>
    <mxCell
      id="348"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="342"
      target="20"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="{Speech.ssml(__welcomeMessage)}"
      Type="say"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave="__minTimeout = __minTimeout + 2000"
      DynamicNextId=""
      Text="{Speech.ssml(__welcomeMessage)}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      Text_es="{Speech.ssml(__welcomeMessage)}"
      AltTexts_es=""
      DynamicNextTabGuid=""
      ContinueAfter="100"
      WaitForPrevious="false"
      Cache="true"
      EscapeXML="true"
      OutputFilter=""
      id="342"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry
          x="-53.129999999999995"
          y="290"
          width="246.25"
          height="80"
          as="geometry"
        />
      </mxCell>
    </object>
    <mxCell
      id="346"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="341"
      target="343"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="349"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="345"
      target="17"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="counter"
      OnEnter=""
      OnLeave=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      VariableName=""
      id="264"
    >
      <mxCell style="counterNode" parent="baselayer" vertex="1">
        <mxGeometry x="1980" y="1331" width="160" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="265">
      <mxCell style="counterInnerNode" parent="264" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="&amp;gt;= 2"
      DynamicNextId=""
      SubType="expression"
      Expression="&gt;= 2"
      id="266"
    >
      <mxCell style="expressionNode" parent="264" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="9"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="59" y="49" width="476" height="161" as="geometry" />
      </mxCell>
    </object>
    <object id="10">
      <mxCell style="caseInnerNode" parent="9" vertex="1">
        <mxGeometry x="10" y="16" width="456" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__conversationType == &#39;chatbot&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="__conversationType == &#39;chatbot&#39;"
      id="354"
    >
      <mxCell style="expressionNode" parent="9" vertex="1">
        <mxGeometry x="10" y="56" width="456" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label='context.callInfo.direction == "inbound" &amp;&amp; __skipIfInbound == true'
      DynamicNextId=""
      SubType="expression"
      Expression='context.callInfo.direction == "inbound" &amp;&amp; __skipIfInbound == true'
      DynamicNextTabGuid=""
      id="352"
    >
      <mxCell style="expressionNode" parent="9" vertex="1">
        <mxGeometry x="10" y="86" width="456" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" DynamicNextId="" SubType="default" id="11">
      <mxCell style="defaultNode" parent="9" vertex="1">
        <mxGeometry x="10" y="116" width="456" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="359"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="11"
      target="20"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="373"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="371"
      target="17"
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
      id="371"
    >
      <mxCell style="pauseNode" parent="baselayer" vertex="1">
        <mxGeometry
          x="-110.00000000000023"
          y="150"
          width="130"
          height="80"
          as="geometry"
        />
      </mxCell>
    </object>
    <mxCell
      id="372"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="352"
      target="371"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="374"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="354"
      target="17"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="298"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="37"
      target="17"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="56"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="40"
      target="55"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="51"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="41"
      target="15"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="308"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="43"
      target="16"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="289"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="42"
      target="17"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="99"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="44"
      target="54"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="314"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="247"
      target="234"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="300"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="248"
      target="14"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="267"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="237"
      target="264"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="312"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="238"
      target="14"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="1675" y="1424" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="313"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="239"
      target="14"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="1675" y="1454" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="215"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="108"
      target="17"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="213"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="109"
      target="90"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="120" y="2331" />
          <mxPoint x="120" y="2420" />
          <mxPoint x="298" y="2420" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="214"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="107"
      target="90"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="311"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="120"
      target="173"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="168"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="122"
      target="17"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="-75" y="3391" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="169"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="119"
      target="17"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="-75" y="3421" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="340"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="334"
      target="90"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="335"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="333"
      target="123"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="350"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="266"
      target="14"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="386"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="375"
      target="35"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="{__outputVariable} = voicemailDetectedLanguage"
      Type="setvar"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      VariableName="{__outputVariable}"
      VariableValue="voicemailDetectedLanguage"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="375"
    >
      <mxCell style="setvarNode" parent="baselayer" vertex="1">
        <mxGeometry x="124" y="990" width="348" height="80" as="geometry" />
      </mxCell>
    </object>
  </root>
</mxGraphModel>;
