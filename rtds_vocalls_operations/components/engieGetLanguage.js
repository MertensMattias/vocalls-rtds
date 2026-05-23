<mxGraphModel
  dx="5645"
  dy="4413"
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
      SpeechRecognitionEngine="Microsoft"
      Code=" &#xa;"
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-NL&#39;,&#39;ttsVoiceName&#39;:&#39;nl-NL-Wavenet-A&#39;,&#39;ttsEngine&#39;:&#39;Google&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:false},&#39;fr&#39;:{&#39;languageName&#39;:&#39;French&#39;,&#39;ttsLanguageCode&#39;:&#39;fr-BE&#39;,&#39;ttsVoiceName&#39;:&#39;fr-BE-Luc&#39;,&#39;ttsEngine&#39;:&#39;ElevenLabs&#39;,&#39;isDefault&#39;:false,&#39;prosodyBaseEnabled&#39;:false,&#39;prosodyContourEnabled&#39;:false},&#39;de&#39;:{&#39;languageName&#39;:&#39;German&#39;,&#39;ttsLanguageCode&#39;:&#39;de-DE&#39;,&#39;ttsVoiceName&#39;:&#39;de-DE-ConradNeural&#39;,&#39;ttsEngine&#39;:&#39;Microsoft&#39;,&#39;isDefault&#39;:false,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:true},&#39;en&#39;:{&#39;languageName&#39;:&#39;English&#39;,&#39;ttsLanguageCode&#39;:&#39;en-GB&#39;,&#39;ttsVoiceName&#39;:&#39;en-GB-Luke&#39;,&#39;ttsEngine&#39;:&#39;ElevenLabs&#39;,&#39;isDefault&#39;:false,&#39;prosodyBaseEnabled&#39;:false,&#39;prosodyContourEnabled&#39;:false}}"
      Variables="__maxTries = 2;"
      HintGrammar=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="true"
      Translations="getLanguagePrompt = &#39;&#39;; &#xa;getLanguagePromptRetry = &#39;&#39;; &#xa;getLanguageFailed = &#39;&#39;;"
      ManualId=""
      LastLanguage="nl"
      PropertiesDefinition=""
      Translations_fr=""
      Translations_de=""
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
      id="0"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="261" y="-130" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="6"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"
      parent="baselayer"
      source="0"
      target="12"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="325.98" y="46" as="sourcePoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="11"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="12"
      target="26"
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
      Code='__language = language;&#xa; &#xa;speechHistory = null;&#xa;speechCurrent = null;&#xa;&#xa;&#xa;&#xa;/*  &#xa;getLanguagePrompt = &#39;&lt;voice language="nl-NL" gender="male"&gt;Hallo. Welkom bij Engie, in welke taal kan ik je het best verder helpen?&lt;/voice&gt;&lt;break time="250ms"/&gt;&lt;voice language="fr-FR" gender="male"&gt;Bonjour. Bienvenue chez Engie, dans quelle langue puis-je vous aider au mieux?&lt;/voice&gt;&lt;break time="250ms"/&gt;&lt;voice language="de-DE" gender="male"&gt;Hallo. Willkommen bei Engie, in welcher Sprache kann ich Ihnen am besten helfen?&lt;/voice&gt;&lt;break time="250ms"/&gt;&lt;voice language="en-GB" gender="male"&gt;Hello. Welcome to Engie, in which language can I best help you?&lt;/voice&gt;&lt;break time="250ms"/&gt;&#39;; &#xa;getLanguagePromptRetry = &#39;&lt;voice language="nl-NL" gender="male"&gt;Ik heb je niet goed gehoord. Zeg « Nederlands » als je in deze taal wil verder gaan of druk op de toets één.&lt;/voice&gt;&lt;break time="250ms"/&gt;&lt;voice language="fr-FR" gender="male"&gt;J’ai pas bien entendu. Dites « Français » si vous souhaitez continuer, ou appuyez sur la touche deux.&lt;/voice&gt;&lt;break time="250ms"/&gt;&lt;voice language="de-DE" gender="male"&gt;Ich hab’s nicht ganz mitbekommen. Sagen Sie « Deutsch », wenn Sie in dieser Sprache fortfahren möchten oder drücken Sie die Drei-Taste.&lt;/voice&gt;&lt;break time="250ms"/&gt;&lt;voice language="en-GB" gender="male"&gt;I didn’t catch that. Say « English » if you want to continue in this language or press key three.&lt;/voice&gt;&lt;break time="250ms"/&gt;&#39;; &#xa;getLanguageFailed = &#39;&lt;voice language="nl-NL" gender="male"&gt;We kunnen je jammer genoeg niet verder helpen, de verbinding zal nu verbroken worden.&lt;/voice&gt;&lt;break time="250ms"/&gt;&lt;voice language="fr-FR" gender="male"&gt;Malheureusement, nous ne pouvons pas vous aider davantage. La connexion va maintenant être interrompue.&lt;/voice&gt;&lt;break time="250ms"/&gt;&lt;voice language="de-DE" gender="male"&gt;Leider können wir Ihnen nicht weiterhelfen. Die Verbindung wird jetzt beendet.&lt;/voice&gt;&lt;break time="250ms"/&gt;&lt;voice language="en-GB" gender="male"&gt;Unfortunately, we are unable to assist you further. The connection will now be terminated.&lt;/voice&gt;&lt;break time="250ms"/&gt;&#39;; &#xa;*/'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="12"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="242" y="-10" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="473"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="26"
      target="468"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="{getLanguagePrompt}"
      Type="say"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      DynamicNextId=""
      Text="{getLanguagePrompt}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      DynamicNextTabGuid=""
      ContinueAfter="1000"
      WaitForPrevious="true"
      Cache="true"
      EscapeXML="false"
      Text_nl="{getLanguagePrompt}"
      AltTexts_nl="{getLanguagePromptRetry}"
      Text_fr="{getLanguagePrompt}"
      AltTexts_fr=""
      Text_de="{getLanguagePrompt}"
      AltTexts_de=""
      Text_en="{getLanguagePrompt}"
      AltTexts_en=""
      id="26"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="243.5" y="105" width="166" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="NL"
      Type="transient"
      OnEnter="language = &#39;NL&#39;;"
      OnLeave=""
      DynamicNextId=""
      Title="NL"
      Kind="output"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      Parameters=""
      id="163"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="1360" y="170" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="FR"
      Type="transient"
      OnEnter="language = &#39;FR&#39;;"
      OnLeave=""
      DynamicNextId=""
      Title="FR"
      Kind="output"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      Parameters=""
      id="164"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="1350" y="300" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="DE"
      Type="transient"
      OnEnter="language = &#39;DE&#39;; &#xa;"
      OnLeave=""
      DynamicNextId=""
      Title="DE"
      Kind="output"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      Parameters=""
      id="165"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="1360" y="439" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="EN"
      Type="transient"
      OnEnter="language = &#39;EN&#39;; &#xa;"
      OnLeave=""
      DynamicNextId=""
      Title="EN"
      Kind="output"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      Parameters=""
      id="166"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="1360" y="570" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="430"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="295"
      target="165"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="Natürlich"
      Type="say"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      DynamicNextId=""
      Text="Natürlich"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language="de-DE"
      Voice=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      Cache="true"
      EscapeXML="false"
      Text_fr="Natürlich"
      AltTexts_fr=""
      Text_de="Natürlich"
      AltTexts_de=""
      Text_en="Natürlich"
      AltTexts_en=""
      OutputFilter=""
      id="295"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="998.25" y="419" width="140" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="431"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="296"
      target="166"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="Sure."
      Type="say"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      DynamicNextId=""
      Text="Sure."
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language="en-GB"
      Voice=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      Cache="true"
      EscapeXML="false"
      Text_fr="Sure."
      AltTexts_fr=""
      Text_de="Sure."
      AltTexts_de=""
      Text_en="Sure."
      AltTexts_en=""
      id="296"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry
          x="999.5699999999999"
          y="550"
          width="140"
          height="80"
          as="geometry"
        />
      </mxCell>
    </object>
    <mxCell
      id="336"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="337"
      target="340"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="{getLanguageFailed}"
      Type="say"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      DynamicNextId=""
      Text="{getLanguageFailed}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="true"
      Cache="true"
      EscapeXML="false"
      Text_nl="{getLanguageFailed}"
      AltTexts_nl=""
      Text_fr="{getLanguageFailed}"
      AltTexts_fr=""
      Text_de="{getLanguageFailed}"
      AltTexts_de=""
      Text_en="{getLanguageFailed}"
      AltTexts_en=""
      id="337"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="247.5" y="830" width="158" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="440"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="339"
      target="436"
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
      Code="log_debug(&#39;speechHistory: &#39; + speechHistory); &#xa;log_debug(&#39;language: &#39; + language);"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="339"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="583.5" y="760" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="Failure"
      Type="transient"
      OnEnter="language = &#39;NL&#39;; &#xa; &#xa; &#xa; &#xa;"
      OnLeave=""
      DynamicNextId=""
      Title="Failure"
      Kind="output"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      Parameters=""
      id="340"
    >
      <mxCell style="transientNode" parent="baselayer" vertex="1">
        <mxGeometry x="261.5" y="1050" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="428"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="352"
      target="163"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="Zeker"
      Type="say"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      DynamicNextId=""
      Text="Zeker"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language="nl-BE"
      Voice=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      Cache="true"
      EscapeXML="false"
      Text_fr="Zeker"
      AltTexts_fr=""
      Text_de="Zeker"
      AltTexts_de=""
      Text_en="Zeker"
      AltTexts_en=""
      OutputFilter=""
      id="352"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="998.255" y="150" width="140" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="429"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="353"
      target="164"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="Bien sûr."
      Type="say"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      DynamicNextId=""
      Text="Bien sûr."
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language="fr-FR"
      Voice=""
      DynamicNextTabGuid=""
      ContinueAfter=""
      WaitForPrevious="false"
      Cache="true"
      EscapeXML="false"
      Text_fr="Bien sûr."
      AltTexts_fr=""
      Text_de="Bien sûr."
      AltTexts_de=""
      Text_en="Bien sûr."
      AltTexts_en=""
      id="353"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="999.575" y="280" width="140" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="476"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="366"
      target="468"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="{getLanguagePromptRetry}"
      Type="say"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      DynamicNextId=""
      Text="{getLanguagePromptRetry}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      DynamicNextTabGuid=""
      ContinueAfter="1000"
      WaitForPrevious="true"
      Cache="true"
      EscapeXML="false"
      Text_nl="{getLanguagePrompt}"
      AltTexts_nl="{getLanguagePromptRetry}"
      Text_fr="{getLanguagePromptRetry}"
      AltTexts_fr=""
      Text_de="{getLanguagePromptRetry}"
      AltTexts_de=""
      Text_en="{getLanguagePromptRetry}"
      AltTexts_en=""
      id="366"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="-215.5" y="339" width="198" height="80" as="geometry" />
      </mxCell>
    </object>
    <object label="" Type="globalIntent" id="345">
      <mxCell style="globalIntentNode" parent="baselayer" vertex="1">
        <mxGeometry
          x="599.9999999999998"
          y="-182"
          width="160"
          height="310"
          as="geometry"
        />
      </mxCell>
    </object>
    <object id="346">
      <mxCell style="globalIntentInnerNode" parent="345" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="1" DynamicNextId="" SubType="choice" Key="1" id="348">
      <mxCell style="choiceNode" parent="345" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="2" DynamicNextId="" SubType="choice" Key="2" id="349">
      <mxCell style="choiceNode" parent="345" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="3" DynamicNextId="" SubType="choice" Key="3" id="350">
      <mxCell style="choiceNode" parent="345" vertex="1">
        <mxGeometry x="10" y="116" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="4" DynamicNextId="" SubType="choice" Key="4" id="351">
      <mxCell style="choiceNode" parent="345" vertex="1">
        <mxGeometry x="10" y="146" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="in het nederlands"
      SubType="reactionGroup"
      Priority="0.8"
      Lemma="true"
      MaxWords=""
      DynamicNextId=""
      Keywords="nederlands,vlaams,nl,dutch,hollands,néerlandais,néerlandais,niederländisch,Nederland,Dutch,Nederlands,Nederlandse,Nederland,Vlaams,Vlaamse,Hollands,Hollandse,Antwaarps,Antwerps,Gents,Néerlandais,Néerlandais,Niederländisch"
      Grammar=""
      Sentences="verder in het Nederlands.&#xa;doorgaan in het Nederlands.&#xa;alsjeblieft in het Nederlands.&#xa;Kunnen we verdergaan in het Nederlands?&#xa;Ik ga het liefst in het Nederlands door.&#xa;Laten we bij Nederlands blijven.&#xa;Ga door in het Nederlands, alsjeblieft.&#xa;Nederlands is goed, laten we verdergaan.&#xa;We blijven in het Nederlands.&#xa;We gaan verder in het Nederlands."
      Groups='&lt;Near Distance="5"&gt; &#xa;    &lt;Or&gt; &#xa;      &lt;Phrase&gt;wil,zullen,zal,liever,zou graag,graag,spreek,spreken,praat,ga,verder,in,het,door,kies,taal&lt;/Phrase&gt; &#xa;    &lt;/Or&gt; &#xa;    &lt;Or&gt; &#xa;      &lt;Phrase&gt;het nederlands,in nederlands,nederland,nederlands,nederlandse,belgisch,belgische,belg,vlaams,vlaamse&lt;/Phrase&gt; &#xa;      &lt;Phrase&gt;het hollands,in hollands,holland&lt;/Phrase&gt; &#xa;      &lt;Phrase&gt;dutch,niederländisch,Neerlandais,dialect&lt;/Phrase&gt; &#xa;    &lt;/Or&gt; &#xa;&lt;/Near&gt;'
      OnSelected=""
      Context="true"
      DynamicNextTabGuid=""
      Description="De klant wil verder in het nederlands."
      Synonyms="false"
      ApplyWhen=""
      Weight="1"
      QuickReply=""
      Notes=""
      Description_fr=""
      Groups_fr=""
      Keywords_fr=""
      Sentences_fr=""
      QuickReply_fr=""
      Description_de=""
      Groups_de=""
      Keywords_de=""
      Sentences_de=""
      QuickReply_de=""
      Description_en=""
      Groups_en=""
      Keywords_en=""
      Sentences_en=""
      QuickReply_en=""
      id="456"
    >
      <mxCell style="reactionGroupNode" parent="345" vertex="1">
        <mxGeometry x="10" y="176" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="continuer en français"
      SubType="reactionGroup"
      Priority="0.7"
      Lemma="true"
      MaxWords=""
      DynamicNextId=""
      Keywords="je peux,français,francais,french,francophone,frans,Französisch&#xa;"
      Grammar=""
      Sentences="Je veux continuer en français.&#xa;Poursuivons en français.&#xa;Merci de rester en français.&#xa;Peut-on continuer en français ?&#xa;Je préfère poursuivre en français.&#xa;Restons en français.&#xa;Continuons la conversation en français.&#xa;Le français me convient, continuons.&#xa;Gardons le français, s’il vous plaît.&#xa;On reste en français."
      Groups='&lt;Near Distance="5"&gt; &#xa;    &lt;Or&gt; &#xa;        &lt;Phrase&gt;je veux&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;veux parler&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;voudrais&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;voudrais parler&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;préfère&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;choisis&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;sélectionne&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;j&#39;utilise&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;parle&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;voudrais parler&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;je préfère parler&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;parlons&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;continuons&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;ma langue&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;continuer&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;continuons&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;procédons en&lt;/Phrase&gt; &#xa;        &lt;/Or&gt; &#xa;    &lt;Or&gt; &#xa;        &lt;Phrase&gt;français&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;francais&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;fr&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;french&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;frans&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;français&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;französisch&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;fran&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;francophone&lt;/Phrase&gt;         &#xa;    &lt;/Or&gt; &#xa;&lt;/Near&gt;'
      OnSelected=""
      Context="true"
      DynamicNextTabGuid=""
      Description="The customer wants to continue in french."
      Synonyms="false"
      ApplyWhen=""
      Weight="1"
      QuickReply=""
      Notes=""
      Description_fr=""
      Groups_fr=""
      Keywords_fr=""
      Sentences_fr=""
      QuickReply_fr=""
      Description_de=""
      Groups_de=""
      Keywords_de=""
      Sentences_de=""
      QuickReply_de=""
      Description_en=""
      Groups_en=""
      Keywords_en=""
      Sentences_en=""
      QuickReply_en=""
      id="457"
    >
      <mxCell style="reactionGroupNode" parent="345" vertex="1">
        <mxGeometry x="10" y="206" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="auf Deutsch fortfahre"
      SubType="reactionGroup"
      Priority="0.6"
      Lemma="true"
      MaxWords=""
      DynamicNextId=""
      Keywords="deutsch,german,auf Deutsch,allemand,duits,Schwiizerdütsch,Standarddeutsch,Hochdeutsch,Muttersprache"
      Grammar=""
      Sentences="Ich möchte auf Deutsch fortfahren.&#xa;Lassen Sie uns auf Deutsch weitermachen.&#xa;Bitte bleiben wir auf Deutsch.&#xa;Können wir auf Deutsch weiterreden?&#xa;Ich bevorzuge Deutsch, machen wir so weiter.&#xa;Bleiben wir bei Deutsch.&#xa;Fahren wir auf Deutsch fort.&#xa;Deutsch ist in Ordnung, weiter geht’s.&#xa;Lass uns auf Deutsch bleiben.&#xa;Wir setzen das Gespräch auf Deutsch fort."
      Groups='&lt;Near Distance="5"&gt; &#xa;    &lt;Or&gt; &#xa;        &lt;Phrase&gt;will&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;möchte&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;sprechen&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;bevorzuge&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;wähle&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;entscheide mich&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;nutze&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;spreche&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;sprechen&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;sprechen wir&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;lassen Sie uns sprechen&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;meine sprache ist&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;fortfahren in&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;weiter sprechen in&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;fortfahren mit&lt;/Phrase&gt; &#xa;    &lt;/Or&gt; &#xa;    &lt;Or&gt; &#xa;        &lt;Phrase&gt;deutsch&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;german&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;deutsche sprache&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;deutschsprachig&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;hochdeutsch&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;deu&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;ger&lt;/Phrase&gt; &#xa;    &lt;/Or&gt; &#xa;&lt;/Near&gt;'
      OnSelected=""
      Context="true"
      DynamicNextTabGuid=""
      Description="The customer wants to continue in German."
      Synonyms="false"
      ApplyWhen=""
      Weight="1"
      QuickReply=""
      Notes=""
      Description_fr=""
      Groups_fr=""
      Keywords_fr=""
      Sentences_fr=""
      QuickReply_fr=""
      Description_de=""
      Groups_de=""
      Keywords_de=""
      Sentences_de=""
      QuickReply_de=""
      Description_en=""
      Groups_en=""
      Keywords_en=""
      Sentences_en=""
      QuickReply_en=""
      id="458"
    >
      <mxCell style="reactionGroupNode" parent="345" vertex="1">
        <mxGeometry x="10" y="236" width="140" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label="continue in English"
      SubType="reactionGroup"
      Priority="0.5"
      Lemma="true"
      MaxWords=""
      DynamicNextId=""
      Keywords="english, engels, anglais, en, englisch, anglais, l’anglais"
      Grammar=""
      Sentences="I’d like to continue in English.&#xa;Let’s proceed in English.&#xa;Please keep the conversation in English.&#xa;Can we carry on in English?&#xa;I’d prefer to go on in English.&#xa;Let’s stay with English.&#xa;Continue in English, please.&#xa;English is fine—let’s keep going.&#xa;Let’s stick to English.&#xa;"
      Groups='&lt;Near Distance="5"&gt; &#xa;    &lt;Or&gt; &#xa;        &lt;Phrase&gt;want&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;want to&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;would like&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;i would&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;i prefer&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;prefer to speak&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;choose&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;to speak&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;pick&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;use&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;use english&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;speak&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;speak english&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;like to speak&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;rather speak&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;let&#39;s speak&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;let&#39;s talk&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;language is&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;continue in&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;let us speak&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;continue speaking&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;proceed in&lt;/Phrase&gt; &#xa;    &lt;/Or&gt; &#xa;    &lt;Or&gt; &#xa;        &lt;Phrase&gt;english&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;en&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;eng&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;engels&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;anglais&lt;/Phrase&gt; &#xa;    &lt;/Or&gt; &#xa;&lt;/Near&gt;'
      OnSelected=""
      Context="true"
      DynamicNextTabGuid=""
      Description="The customer wants to continue in English"
      Synonyms="false"
      ApplyWhen=""
      Weight="1"
      QuickReply=""
      Notes=""
      Description_fr=""
      Groups_fr=""
      Keywords_fr=""
      Sentences_fr=""
      QuickReply_fr=""
      Description_de=""
      Groups_de=""
      Keywords_de=""
      Sentences_de=""
      QuickReply_de=""
      Description_en=""
      Groups_en=""
      Keywords_en=""
      Sentences_en=""
      QuickReply_en=""
      id="459"
    >
      <mxCell style="reactionGroupNode" parent="345" vertex="1">
        <mxGeometry x="10" y="270" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="362"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="348"
      target="352"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="363"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="349"
      target="353"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="364"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="350"
      target="295"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="365"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="351"
      target="296"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      id="436"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="587.5" y="960" width="160" height="216" as="geometry" />
      </mxCell>
    </object>
    <object id="437">
      <mxCell style="caseInnerNode" parent="436" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="language == &#39;NL&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="language == &#39;NL&#39;"
      id="439"
    >
      <mxCell style="expressionNode" parent="436" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="language == &#39;FR&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="language == &#39;FR&#39;"
      id="445"
    >
      <mxCell style="expressionNode" parent="436" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="language == &#39;DE&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="language == &#39;DE&#39;"
      id="446"
    >
      <mxCell style="expressionNode" parent="436" vertex="1">
        <mxGeometry x="10" y="116" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="language == &#39;EN&#39;"
      DynamicNextId=""
      SubType="expression"
      Expression="language == &#39;EN&#39;"
      id="447"
    >
      <mxCell style="expressionNode" parent="436" vertex="1">
        <mxGeometry x="10" y="146" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no choice" DynamicNextId="" SubType="default" id="438">
      <mxCell style="defaultNode" parent="436" vertex="1">
        <mxGeometry x="10" y="176" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="448"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="439"
      target="352"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="810" y="1031" />
          <mxPoint x="810" y="190" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="449"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="445"
      target="353"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="820" y="1061" />
          <mxPoint x="820" y="320" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="450"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="446"
      target="295"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="830" y="1091" />
          <mxPoint x="830" y="459" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="451"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="447"
      target="296"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="840" y="1121" />
          <mxPoint x="840" y="590" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="452"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="438"
      target="366"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="480"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="432"
      target="478"
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
      id="432"
    >
      <mxCell style="counterNode" parent="baselayer" vertex="1">
        <mxGeometry x="246" y="580" width="160" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="433">
      <mxCell style="counterInnerNode" parent="432" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="&amp;gt;= __maxTries"
      DynamicNextId=""
      SubType="expression"
      Expression="&gt;= __maxTries"
      id="434"
    >
      <mxCell style="expressionNode" parent="432" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="455"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="434"
      target="337"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="460"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="457"
      target="353"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="461"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="456"
      target="352"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="462"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="458"
      target="295"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="463"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="459"
      target="296"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="recognize"
      OnEnter=""
      OnLeave=""
      Timeout="15000"
      MinTimeout="10000"
      ExpectedSpeechType="default"
      SpeechConfigParams=""
      SimilarityTreshold="0.4"
      NoiseDistance="0.05"
      ReactionType="fast"
      VariableName=""
      HintKeywords=""
      HintGrammar=""
      Wait=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      SpeechRecognition="Microsoft"
      ResponseAudio="false"
      NLPEngine="Embedding"
      HintKeywords_fr=""
      HintKeywords_de=""
      HintKeywords_en=""
      ReactionIntervalCustom=""
      AcceptAnyResponse="true"
      ResponseAffirmation="false"
      ResponseSilence="false"
      Format=""
      Input=""
      ModelId=""
      Language=""
      AllowGlobalIntent="true"
      CustomMiddlewares=""
      AlternativeLanguages="nl-BE,fr-FR,de-DE,en-GB"
      UseContext="false"
      IncludeInSpeakflow="true"
      id="468"
    >
      <mxCell style="recognizeNode" parent="baselayer" vertex="1">
        <mxGeometry x="245" y="240" width="163" height="280" as="geometry" />
      </mxCell>
    </object>
    <object id="469">
      <mxCell style="recognizeInnerNode" parent="468" vertex="1">
        <mxGeometry x="10" y="16" width="143" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="in het nederlands"
      SubType="reactionGroup"
      Priority="0.8"
      Lemma="true"
      MaxWords=""
      DynamicNextId=""
      Keywords="nederlands,vlaams,nl,dutch,hollands,néerlandais,néerlandais,niederländisch,Nederland,Dutch,Nederlands,Nederlandse,Nederland,Vlaams,Vlaamse,Hollands,Hollandse,Antwaarps,Antwerps,Gents,Néerlandais,Néerlandais,Niederländisch"
      Grammar=""
      Sentences="verder in het Nederlands.&#xa;doorgaan in het Nederlands.&#xa;alsjeblieft in het Nederlands.&#xa;Kunnen we verdergaan in het Nederlands?&#xa;Ik ga het liefst in het Nederlands door.&#xa;Laten we bij Nederlands blijven.&#xa;Ga door in het Nederlands, alsjeblieft.&#xa;Nederlands is goed, laten we verdergaan.&#xa;We blijven in het Nederlands.&#xa;We gaan verder in het Nederlands."
      Groups='&lt;Near Distance="5"&gt; &#xa;    &lt;Or&gt; &#xa;      &lt;Phrase&gt;wil,zullen,zal,liever,zou graag,graag,spreek,spreken,praat,ga,verder,in,het,door,kies,taal&lt;/Phrase&gt; &#xa;    &lt;/Or&gt; &#xa;    &lt;Or&gt; &#xa;      &lt;Phrase&gt;het nederlands,in nederlands,nederland,nederlands,nederlandse,belgisch,belgische,belg,vlaams,vlaamse&lt;/Phrase&gt; &#xa;      &lt;Phrase&gt;het hollands,in hollands,holland&lt;/Phrase&gt; &#xa;      &lt;Phrase&gt;dutch,niederländisch,Neerlandais,dialect&lt;/Phrase&gt; &#xa;    &lt;/Or&gt; &#xa;&lt;/Near&gt;'
      OnSelected=""
      Context="true"
      DynamicNextTabGuid=""
      Description="De klant wil verder in het nederlands."
      Synonyms="false"
      ApplyWhen=""
      Weight="1"
      QuickReply=""
      Notes=""
      Description_fr=""
      Groups_fr=""
      Keywords_fr=""
      Sentences_fr=""
      QuickReply_fr=""
      Description_de=""
      Groups_de=""
      Keywords_de=""
      Sentences_de=""
      QuickReply_de=""
      Description_en=""
      Groups_en=""
      Keywords_en=""
      Sentences_en=""
      QuickReply_en=""
      id="384"
    >
      <mxCell style="reactionGroupNode" parent="468" vertex="1">
        <mxGeometry x="10" y="56" width="143" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="continuer en français"
      SubType="reactionGroup"
      Priority="0.7"
      Lemma="true"
      MaxWords=""
      DynamicNextId=""
      Keywords="je peux,français,francais,french,francophone,frans,Französisch&#xa;"
      Grammar=""
      Sentences="Je veux continuer en français.&#xa;Poursuivons en français.&#xa;Merci de rester en français.&#xa;Peut-on continuer en français ?&#xa;Je préfère poursuivre en français.&#xa;Restons en français.&#xa;Continuons la conversation en français.&#xa;Le français me convient, continuons.&#xa;Gardons le français, s’il vous plaît.&#xa;On reste en français."
      Groups='&lt;Near Distance="5"&gt; &#xa;    &lt;Or&gt; &#xa;        &lt;Phrase&gt;je veux&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;veux parler&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;voudrais&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;voudrais parler&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;préfère&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;choisis&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;sélectionne&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;j&#39;utilise&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;parle&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;voudrais parler&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;je préfère parler&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;parlons&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;continuons&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;ma langue&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;continuer&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;continuons&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;procédons en&lt;/Phrase&gt; &#xa;        &lt;/Or&gt; &#xa;    &lt;Or&gt; &#xa;        &lt;Phrase&gt;français&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;francais&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;fr&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;french&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;frans&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;français&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;französisch&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;fran&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;francophone&lt;/Phrase&gt;         &#xa;    &lt;/Or&gt; &#xa;&lt;/Near&gt;'
      OnSelected=""
      Context="true"
      DynamicNextTabGuid=""
      Description="The customer wants to continue in french."
      Synonyms="false"
      ApplyWhen=""
      Weight="1"
      QuickReply=""
      Notes=""
      Description_fr=""
      Groups_fr=""
      Keywords_fr=""
      Sentences_fr=""
      QuickReply_fr=""
      Description_de=""
      Groups_de=""
      Keywords_de=""
      Sentences_de=""
      QuickReply_de=""
      Description_en=""
      Groups_en=""
      Keywords_en=""
      Sentences_en=""
      QuickReply_en=""
      id="385"
    >
      <mxCell style="reactionGroupNode" parent="468" vertex="1">
        <mxGeometry x="10" y="86" width="143" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="auf Deutsch fortfahre"
      SubType="reactionGroup"
      Priority="0.6"
      Lemma="true"
      MaxWords=""
      DynamicNextId=""
      Keywords="deutsch,german,auf Deutsch,allemand,duits,Schwiizerdütsch,Standarddeutsch,Hochdeutsch,Muttersprache"
      Grammar=""
      Sentences="Ich möchte auf Deutsch fortfahren.&#xa;Lassen Sie uns auf Deutsch weitermachen.&#xa;Bitte bleiben wir auf Deutsch.&#xa;Können wir auf Deutsch weiterreden?&#xa;Ich bevorzuge Deutsch, machen wir so weiter.&#xa;Bleiben wir bei Deutsch.&#xa;Fahren wir auf Deutsch fort.&#xa;Deutsch ist in Ordnung, weiter geht’s.&#xa;Lass uns auf Deutsch bleiben.&#xa;Wir setzen das Gespräch auf Deutsch fort."
      Groups='&lt;Near Distance="5"&gt; &#xa;    &lt;Or&gt; &#xa;        &lt;Phrase&gt;will&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;möchte&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;sprechen&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;bevorzuge&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;wähle&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;entscheide mich&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;nutze&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;spreche&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;sprechen&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;sprechen wir&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;lassen Sie uns sprechen&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;meine sprache ist&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;fortfahren in&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;weiter sprechen in&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;fortfahren mit&lt;/Phrase&gt; &#xa;    &lt;/Or&gt; &#xa;    &lt;Or&gt; &#xa;        &lt;Phrase&gt;deutsch&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;german&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;deutsche sprache&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;deutschsprachig&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;hochdeutsch&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;deu&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;ger&lt;/Phrase&gt; &#xa;    &lt;/Or&gt; &#xa;&lt;/Near&gt;'
      OnSelected=""
      Context="true"
      DynamicNextTabGuid=""
      Description="The customer wants to continue in German."
      Synonyms="false"
      ApplyWhen=""
      Weight="1"
      QuickReply=""
      Notes=""
      Description_fr=""
      Groups_fr=""
      Keywords_fr=""
      Sentences_fr=""
      QuickReply_fr=""
      Description_de=""
      Groups_de=""
      Keywords_de=""
      Sentences_de=""
      QuickReply_de=""
      Description_en=""
      Groups_en=""
      Keywords_en=""
      Sentences_en=""
      QuickReply_en=""
      id="386"
    >
      <mxCell style="reactionGroupNode" parent="468" vertex="1">
        <mxGeometry x="10" y="116" width="143" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label="continue in English"
      SubType="reactionGroup"
      Priority="0.5"
      Lemma="true"
      MaxWords=""
      DynamicNextId=""
      Keywords="english, engels, anglais, en, englisch, anglais, l’anglais"
      Grammar=""
      Sentences="I’d like to continue in English.&#xa;Let’s proceed in English.&#xa;Please keep the conversation in English.&#xa;Can we carry on in English?&#xa;I’d prefer to go on in English.&#xa;Let’s stay with English.&#xa;Continue in English, please.&#xa;English is fine—let’s keep going.&#xa;Let’s stick to English.&#xa;"
      Groups='&lt;Near Distance="5"&gt; &#xa;    &lt;Or&gt; &#xa;        &lt;Phrase&gt;want&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;want to&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;would like&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;i would&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;i prefer&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;prefer to speak&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;choose&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;to speak&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;pick&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;use&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;use english&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;speak&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;speak english&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;like to speak&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;rather speak&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;let&#39;s speak&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;let&#39;s talk&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;language is&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;continue in&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;let us speak&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;continue speaking&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;proceed in&lt;/Phrase&gt; &#xa;    &lt;/Or&gt; &#xa;    &lt;Or&gt; &#xa;        &lt;Phrase&gt;english&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;en&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;eng&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;engels&lt;/Phrase&gt; &#xa;        &lt;Phrase&gt;anglais&lt;/Phrase&gt; &#xa;    &lt;/Or&gt; &#xa;&lt;/Near&gt;'
      OnSelected=""
      Context="true"
      DynamicNextTabGuid=""
      Description="The customer wants to continue in English"
      Synonyms="false"
      ApplyWhen=""
      Weight="1"
      QuickReply=""
      Notes=""
      Description_fr=""
      Groups_fr=""
      Keywords_fr=""
      Sentences_fr=""
      QuickReply_fr=""
      Description_de=""
      Groups_de=""
      Keywords_de=""
      Sentences_de=""
      QuickReply_de=""
      Description_en=""
      Groups_en=""
      Keywords_en=""
      Sentences_en=""
      QuickReply_en=""
      id="387"
    >
      <mxCell style="reactionGroupNode" parent="468" vertex="1">
        <mxGeometry x="10" y="150" width="143" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="no match" DynamicNextId="" SubType="notRecognized" id="472">
      <mxCell style="notRecognizedNode" parent="468" vertex="1">
        <mxGeometry x="10" y="180" width="143" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="390"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="385"
      target="353"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="389"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="386"
      target="295"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="388"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="387"
      target="296"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="398" y="404" />
          <mxPoint x="660" y="404" />
          <mxPoint x="660" y="590" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="475"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="472"
      target="432"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="477"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="384"
      target="352"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="481"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="478"
      target="339"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="component"
      ComponentGuid="e0e3d14a-e286-4c61-b07c-8c6dcd032142"
      ComponentVersion=""
      SupportedLanguages="en;cs;sk;pl;de;es;"
      __gptProvider='"AzureOpenAI"'
      __gptModel='"gpt-4o-mini"'
      __gptServiceHost=""
      __passExistingDialog="true"
      __outputVariable="language"
      mlctp___input_en=""
      mlctp___entity_en='"the customers language, in ISO 639-1"'
      mlctp___input_cs='"Jmenuji se Jan Novák"'
      mlctp___entity_cs='"celé jméno"'
      mlctp___input_sk='"Volám sa Jan Novák"'
      mlctp___entity_sk='"meno"'
      mlctp___input_pl='"Nazywam się John Smith"'
      mlctp___entity_pl='"pełne imię i nazwisko"'
      mlctp___input_de=""
      mlctp___entity_de='"the customers language, in ISO 639-1"'
      mlctp___input_es='"Mi nombre es John Smith"'
      mlctp___entity_es='"nombre completo"'
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptProvider\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM provider\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM provider name. For example AzureOpenAI. If empty, the default provider will be used, defined in Bot persona component\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;default\&#39;,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;default\&#39;,\r\n                \&#39;AzureOpenAI\&#39;,\r\n                \&#39;OpenAI\&#39;,\r\n                \&#39;Gemini\&#39;,\r\n                \&#39;Claude\&#39;\r\n            ]\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptModel\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM Model\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM model name. For example, gpt-4o. If empty, the default model will be used, defined in Bot persona component\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;default\&#39;,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;default\&#39;,\r\n                \&#39;gpt-4o\&#39;,\r\n                \&#39;gpt-4o-mini\&#39;,\r\n                \&#39;gemini-2.0-flash\&#39;,\r\n                \&#39;gemini-2.0-flash-lite\&#39;,\r\n                \&#39;claude-3-7-sonnet-latest\&#39;,\r\n                \&#39;claude-3-5-haiku-latest\&#39;\r\n            ]\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__gptServiceHost\&#39;,\r\n        \&#39;title\&#39;: \&#39;LLM endpoint\&#39;,\r\n        \&#39;hint\&#39;: \&#39;LLM base endpoint url. For example vocallsopenaise.openai.azure.com. If empty, the default host will be used, defined in Bot persona component or module configuration.\&#39;,\r\n        \&#39;defaultValue\&#39;: \&#39;\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\r\n            \&#39;maxLength\&#39;: 1000,\r\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\r\n            \&#39;readonly\&#39;: false\r\n        }\r\n    },\r\n    {\r\n        \&#39;name\&#39;: \&#39;__passExistingDialog\&#39;,\r\n        \&#39;title\&#39;: \&#39;Pass dialog history\&#39;,\r\n        \&#39;hint\&#39;: \&#39;If true, the entire dialog history is passed to the GPT, otherwise not.\&#39;,\r\n        \&#39;controlSettings\&#39;: {\r\n            \&#39;controlType\&#39;: \&#39;dropdown\&#39;,\r\n            \&#39;defaultValue\&#39;: \&#39;false\&#39;,\r\n            \&#39;options\&#39;: [\r\n                \&#39;true\&#39;,\r\n                \&#39;false\&#39;\r\n            ]\r\n        }\r\n    }\r\n]&#39;"
      id="478"
    >
      <mxCell style="component3Node" parent="baselayer" vertex="1">
        <mxGeometry x="590" y="613" width="155" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="Entity extraction" id="479">
      <mxCell style="componentInnerNode" parent="478" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="34" as="geometry" />
      </mxCell>
    </object>
  </root>
</mxGraphModel>;
