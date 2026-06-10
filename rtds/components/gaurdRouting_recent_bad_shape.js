<mxGraphModel
  dx="4859"
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
      Code='__rtParams = {};&#xa; &#xa;/**&#xa; * Normalises operation config: JSON string -&gt; parsed; { Params: {...} } -&gt; Params; flat object -&gt; itself; null -&gt; {}.&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Flat Params object, never null.&#xa; */&#xa;__extractParams = function (config) {&#xa;    var __parsed = typeof config === &#39;string&#39; ? JSON.parse(config) : config;&#xa;    if (__parsed &amp;&amp; typeof __parsed.Params === &#39;object&#39; &amp;&amp; __parsed.Params !== null) return __parsed.Params;&#xa;    return __parsed || {};&#xa;};&#xa;&#xa;/**&#xa; * Resolves Params into a flat { Key: value } map. Active coerced to Boolean; ConfigId/Timeout coerced to Number;&#xa; * values containing ${name} have those placeholders substituted from global (bare names only; no expressions).&#xa; * Unresolved placeholders are left raw and logged at warn level. Uses String.replace, NOT new Function — the&#xa; * Vocalls runtime disables string-eval.&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Map of Key -&gt; resolved value (no __rt prefix; v2 shape).&#xa; */&#xa;__setupConfig = function (config) {&#xa;    var __params = __extractParams(config);&#xa;    var __result = {};&#xa;    __result.Active = typeof __params.Active === &#39;boolean&#39; ? __params.Active : Boolean(__params.Active);&#xa;    var __keys = Object.keys(__params);&#xa;    for (var __i = 0; __i &lt; __keys.length; __i++) {&#xa;        var __key = __keys[__i];&#xa;        if (__key === &#39;Active&#39;) continue;&#xa;        var __raw = (__params[__key] !== undefined &amp;&amp; __params[__key] !== null) ? String(__params[__key]).trim() : &#39;&#39;;&#xa;        var __resolved;&#xa;        if (__raw.indexOf(&#39;${&#39;) !== -1) {&#xa;            __resolved = __raw.replace(/\$\{(\w+)\}/g, function (__match, __name) {&#xa;                if (global.hasOwnProperty(__name)) { return String(global[__name]); }&#xa;                Logger.warn(&#39;[__setupConfig] unresolved placeholder&#39;, { key: __key, placeholder: __name });&#xa;                return __match;&#xa;            });&#xa;        } else { __resolved = __raw; }&#xa;        if (__key === &#39;ConfigId&#39;) __resolved = Number(__resolved) || -1;&#xa;        else if (__key === &#39;Timeout&#39;) __resolved = __resolved !== &#39;&#39; ? Number(__resolved) : 10000;&#xa;        __result[__key] = __resolved;&#xa;    }&#xa;    return __result;&#xa;};&#xa;&#xa;// --- v2 object-access helpers ---&#xa;// Declared with `typeof &lt;name&gt; === &#39;undefined&#39;` guards so they fall back to local definitions&#xa;// when rtds_globalCodeAndHelpers.js has not yet been updated to expose them.&#xa;&#xa;if (typeof getValue === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Returns the value of `key` from `obj`, or `defaultValue` if the key is absent.&#xa;     * Case-insensitive lookup: matches whichever own property name lowercases to the same string.&#xa;     * Mirrors the PureConnect GetAt(values, Find(names, key, 0)) idiom with a default fallback.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getValue = function (obj, key, defaultValue) {&#xa;        if (!obj || !key) return defaultValue;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return obj[__propertyName];&#xa;            }&#xa;        }&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof walk === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Iterates own properties of `obj`, calling fn(key, value) for each.&#xa;     * Returning false from fn stops the walk.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {function} fn&#xa;     * @returns {void}&#xa;     */&#xa;    walk = function (obj, fn) {&#xa;        if (!obj) return;&#xa;        for (var __key in obj) {&#xa;            if (!obj.hasOwnProperty(__key)) continue;&#xa;            if (fn(__key, obj[__key]) === false) return;&#xa;        }&#xa;    };&#xa;}&#xa;&#xa;if (typeof nowUTC === &#39;undefined&#39;) {&#xa;    /**&#xa;     * @returns {string} Current date/time as ISO-8601 UTC.&#xa;     */&#xa;    nowUTC = function () { return new Date().toISOString(); };&#xa;}&#xa; &#xa;function appendGuardLog(guard, resultText) { &#xa;    __redirectResult = "success";&#xa;    if (redirectResult.Details.ClientSpecific.Party2.Status == 4) {&#xa;        __redirectResult = "no_reaction";&#xa;    } else if (redirectResult.Details.ClientSpecific.Party2.Status == 1) {&#xa;        __redirectResult = "rejected";&#xa;    } else if (redirectResult.Details.ClientSpecific.Party2.Status == 0) {&#xa;        __redirectResult = "rejected_voicebox";&#xa;    } else {&#xa;        __redirectResult = "unknown_reason_rejected";&#xa;    }&#xa;    rtGuardLog.push({ &#xa;        name: guard.name, &#xa;        phone: guard.phone, &#xa;        email: guard.email, &#xa;        time: new Date().toISOString(), &#xa;        result: __redirectResult &#xa;    }); &#xa;} &#xa; &#xa;function callGuard() { &#xa;    if (guardCounter &lt; rtGuards.length) &#xa;    { &#xa;        return rtGuards[guardCounter]; &#xa;    } &#xa;    else &#xa;    { &#xa;        goto(94); &#xa;    } &#xa;}'
      Extensions=""
      BackgroundNoise="false"
      BreathInEffect="false"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-NL&#39;,&#39;ttsVoiceName&#39;:&#39;nl-NL-Wavenet-A&#39;,&#39;ttsEngine&#39;:&#39;Google&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:false}}"
      Variables='varObj = {}; &#xa;callIdKey = &#39;&#39;; &#xa;debug = true; &#xa;environment = &#39;&#39;; &#xa;language = &#39;&#39;; &#xa;_headers = &#39;&#39;; &#xa;guardResultTest = [ &#xa;        { &#xa;            "id": 109, &#xa;            "config": 1, &#xa;            "active": 1, &#xa;            "activeFlag": true, &#xa;            "name": "Mattias Mertens", &#xa;            "phone": "+420770620169", &#xa;            "email": "miroslav.valentyn@callminer.com", &#xa;            "dateActivated": "2026-03-26T17:06:51.177", &#xa;            "dateDeactivated": "2026-03-26T15:14:24.5" &#xa;        } &#xa;    ]; &#xa;__configJSON = { &#xa;    "Active": true,                                    // boolean — true activates the component &#xa;    "ConfigId": 1,                                     // guard group ID from the Guard Module API &#xa;    "ConfigName": "KLANTWACHT",                        // display name used in notification headers &#xa;    "DialGuard": true,                                 // true = execute dial loop &#xa;    "OutboundAni": "",                                 // caller ID presented to guards, if empty, use line defaults &#xa;    "Diversion": "",                                 // SIP diversion header value &#xa;    "OnHoldAudioUrl": `https://audio-${environment}.n-allo.be/on-hold.wav`, // full URL of audio played to inbound caller while ringing &#xa;    "Timeout": 15,                                     // ring timeout per guard in seconds &#xa;    "RecordVoicemail": true,                           // offer voicemail if all guards fail to answer &#xa;    "AcceptCallMenu": true,                            // require guard to press 1 to accept &#xa;    "AcceptCallMessage": "Press 1 to accept the call.", // TTS prompt played to guard &#xa;    "SendSms": true,                                   // populate rtSmsTo / rtSmsBody after dial loop &#xa;    "SendMail": true,                                  // populate rtEmailTo / rtEmailBody after dial loop &#xa;    "NextStep_Success": "00002",                       // next step after a guard accepts the call &#xa;    "NextStep_Failure": "00099",                       // next step after a fatal API error &#xa;    "NextStep": "00005"                                // default step if all guards fail to answer &#xa;    };&#xa;_rtNextStep = "";&#xa;_rtBaseUrl = "";&#xa;_rtMailEndpoint = "";&#xa;_rtCallStart = null;&#xa;_rtCallEnd = null;'
      InfoAboutUser_nl=""
      CompanyInformation_nl=""
      GeneralKnowledge_nl=""
      Translations_nl=""
      PropertiesDefinition=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      Translations=""
      ManualId=""
      RequiredVariables=""
      HintGrammar=""
      id="vocalls-master-layer"
    >
      <mxCell />
    </object>
    <mxCell id="baselayer" parent="vocalls-master-layer" />
    <mxCell
      id="49274c8b-7a52-4a86-b4e0-4a42a1193f3e"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="vocalls-0-0"
      target="0"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object label="START" Type="start" id="vocalls-0-0">
      <mxCell style="startNode" parent="baselayer" vertex="1">
        <mxGeometry x="1" y="-230" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="18"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="0"
      target="13"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="dial"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      DynamicNextId=""
      id="0"
    >
      <mxCell
        style="dialNode;strokeColor=#D1B73D;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="1" y="-120" width="130" height="40" as="geometry" />
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
        <mxGeometry x="748.5" y="710" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="8"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="13"
      target="9"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="53.5" y="-90" as="sourcePoint" />
        <mxPoint x="53.5" y="290" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="22"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="134"
      target="21"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="initializeCallFlowContext"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="Logger.info(&#39;Initializing...&#39;); &#xa;__rtParams = __setupConfig(__configJSON);&#xa;if (!_headers) { _headers = {}; }&#xa;Logger.debug(&#39;[guard] config resolved&#39;, { params: __rtParams });                              &#xa;initializeCallFlowContext(&#39;full&#39;);&#xa;Logger.info(&#39;varObj: &#39; + JSON.stringify(varObj));&#xa;if (!__rtParams.Active)&#xa;{&#xa;    Logger.info(&#39;[guardRouting] inactive&#39;); &#xa;    //handle not active in flow as well?&#xa;}"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="15"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-18" y="350" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="132"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="21"
      target="131"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="getGuards"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="rtGuards = guardResultTest;&#xa;__rtParams.rtDialGuard = true;&#xa;&#xa;/*&#xa;global[_rtNextStep] = getValue(__rtParams, &#39;NextStep&#39;, -1);&#xa;&#xa;if (!getValue(__rtParams, &#39;Active&#39;, false)) {&#xa;    Logger.info(&#39;[guardRouting] skipped — inactive&#39;, { nextStep: global[_rtNextStep] });&#xa;    return;&#xa;}&#xa;&#xa;__guardList = [];&#xa;__guardIndex = 0;&#xa;__guardCount = 0;&#xa;__guardLog = [];&#xa;__guardPickedUp = false;&#xa;__recordVoicemail = getValue(__rtParams, &#39;RecordVoicemail&#39;, false) === true;&#xa;__diversion = getValue(__rtParams, &#39;Diversion&#39;, &#39;&#39;);&#xa;__onHoldAudioUrl = getValue(__rtParams, &#39;OnHoldAudioUrl&#39;, &#39;&#39;);&#xa;__currentGuardPhone = &#39;&#39;;&#xa;&#xa;var __configId = getValue(__rtParams, &#39;ConfigId&#39;, &#39;&#39;);&#xa;if (__configId === &#39;&#39; || __configId === null || __configId === undefined || Number(__configId) === -1) {&#xa;    Logger.warn(&#39;[guardRouting] missing ConfigId&#39;, { nextStep: global[_rtNextStep] });&#xa;    return;&#xa;}&#xa;&#xa;global[_rtNextStep] = getValue(__rtParams, &#39;NextStep_Failure&#39;, -1);&#xa;&#xa;var __url = baseUrl + __rtGuardEndpoint + &#39;/&#39; + encodeURIComponent(String(__configId));&#xa;var __timeout = getValue(__rtParams, &#39;RequestTimeout&#39;, getValue(__rtParams, &#39;Timeout&#39;, 10000));&#xa;&#xa;Logger.debug(&#39;[guardRouting] get guards&#39;, { url: __url, configId: __configId, timeout: __timeout });&#xa;&#xa;var __request = null;&#xa;try {&#xa;    __request = jsonHttpRequest(__url, { method: &#39;GET&#39;, timeout: +__timeout }, _headers, null);&#xa;}&#xa;catch (e) {&#xa;    Logger.error(&#39;[guardRouting] request threw&#39;, { url: __url, nextStep: global[_rtNextStep] }, e);&#xa;    return;&#xa;}&#xa;&#xa;return __request.then(&#xa;    function (result) {&#xa;        if (!result || result.success !== true) {&#xa;            Logger.warn(&#39;[guardRouting] request failed&#39;, {&#xa;                url: __url,&#xa;                statusCode: result &amp;&amp; result.statusCode,&#xa;                nextStep: global[_rtNextStep]&#xa;            });&#xa;            return;&#xa;        }&#xa;&#xa;        var __guards = result.response || result.body || [];&#xa;        if (!Array.isArray(__guards)) {&#xa;            __guards = [];&#xa;        }&#xa;&#xa;        if (!__guards.length) {&#xa;            Logger.warn(&#39;[guardRouting] no active guards&#39;, { url: __url, nextStep: global[_rtNextStep] });&#xa;            return;&#xa;        }&#xa;&#xa;        __guardList = __guards;&#xa;        __guardCount = __guards.length;&#xa;        guardCounter = -1; // test-flow loop: first callGuard() does guardCounter++&#xa;&#xa;        global[_rtNextStep] = getValue(__rtParams, &#39;NextStep&#39;, -1);&#xa;        Logger.info(&#39;[guardRouting] guards resolved&#39;, {&#xa;            url: __url,&#xa;            count: __guardCount,&#xa;            nextStep: global[_rtNextStep]&#xa;        });&#xa;    },&#xa;    function (err) {&#xa;        Logger.error(&#39;[guardRouting] request error&#39;, { url: __url, nextStep: global[_rtNextStep] }, err);&#xa;    }&#xa;);*/"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="21"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-18" y="750" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="141"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="38"
      target="138"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="dialGuards"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='if (__guardPickedUp) {&#xa;    Logger.info("calling ended");&#xa;    goto(129);&#xa;}&#xa;else if (__rtParams.rtDialGuard) &#xa;{ &#xa;  guardCounter++; &#xa;  Logger.info("calling guard " + JSON.stringify(rtGuards[guardCounter]));&#xa;  callGuard(); &#xa;} &#xa;else&#xa;{&#xa;    Logger.info("go to voicemail");&#xa;    goto(94); //voicemail&#xa;}'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="38"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-18" y="990" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="127"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="45"
      target="38"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="-140" y="1390" />
          <mxPoint x="-140" y="1030" />
        </Array>
      </mxGeometry>
    </mxCell>
    <object
      label="appendLog"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='appendGuardLog(rtGuards[guarCounter], redirectResult); &#xa;if (redirectResult == "success")&#xa;{&#xa;    __guardPickedUp = true;&#xa;}&#xa;Logger.info(&#39;[guardRouting] log appended&#39;);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="45"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="-18" y="1350" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="96"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="94"
      target="95"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="voicemail"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="if (!__rtParams.RecordVoicemail) &#xa;{ &#xa;    goto(105); &#xa;}&#xa;_rtCallStart = Date.now();"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="94"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="730.5" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="103"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="95"
      target="97"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="Geachte klant, laat alstublieft een bericht achter."
      Type="say"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      DynamicNextId=""
      Text="Geachte klant, laat alstublieft een bericht achter."
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
      id="95"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="652" y="120" width="325" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="124"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="97"
      target="109"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="108"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="105"
      target="3"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="Bedankt, nog een fijne dag. En bedankt voor uw telefoontje."
      Type="say"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      DynamicNextId=""
      Text="Bedankt, nog een fijne dag. En bedankt voor uw telefoontje."
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
      id="105"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="618.5" y="590" width="390" height="95" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="121"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="109"
      target="117"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="prepareMsg"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='Logger.info("Voicemail: " + JSON.stringify(voicemailResult));&#xa;__rtParams.VoicemailRecorded = true;&#xa;_rtCallStart = Date.now();&#xa;var __mailMinLength = 50;&#xa;if (__rtParams.SendEmail) &#xa;{ &#xa;    if (voicemailResult.length &gt; __mailMinLength)&#xa;    {&#xa;      __rtParams.EmailBody += "\nTranskript:\n" + voicemailResult;  &#xa;    }&#xa;}'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="109"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="430" y="295" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="116"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="114"
      target="105"
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
      Code="Logger.info(&#39;[guardRouting] no voicemail recorded.&#39;); &#xa;__rtParams.VoicemailRecorded = false;"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="114"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="729.5" y="470" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="123"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="119"
      target="3"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="122"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="117"
      target="119"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="recognize"
      OnEnter=""
      OnLeave=""
      Timeout="4000"
      MinTimeout="5000"
      ExpectedSpeechType="default"
      SpeechConfigParams=""
      SimilarityTreshold="0.4"
      NoiseDistance="0.05"
      ReactionType="normal"
      VariableName="voicemailResult"
      HintKeywords=""
      HintGrammar=""
      Wait=""
      MaxEntryNodeId=""
      MaxEntryCount=""
      SpeechRecognition="default"
      ResponseAudio="false"
      NLPEngine="Embedding"
      HintKeywords_nl=""
      IncludeInSpeakflow="true"
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
      AlternativeLanguages=""
      UseContext="false"
      id="97"
    >
      <mxCell style="recognizeNode" parent="baselayer" vertex="1">
        <mxGeometry x="733" y="250" width="163" height="170" as="geometry" />
      </mxCell>
    </object>
    <object id="98">
      <mxCell style="recognizeInnerNode" parent="97" vertex="1">
        <mxGeometry x="10" y="16" width="143" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="no input" DynamicNextId="" SubType="noInput" id="125">
      <mxCell style="noInputNode" parent="97" vertex="1">
        <mxGeometry x="10" y="56" width="143" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="component"
      ComponentGuid="2c9746c6-eff2-4a12-af2f-45b0482ff045"
      ComponentVersion="J4bZfKh7vNSqq6T/bq4lrA=="
      SupportedLanguages=""
      __configJSON='{     "Active": `${__rtParams.Active}`,     "Subject": "Your request has been received",     "From": "noreply@n-allo.be",     "To": `${__rtParams.EmailTo}`,     "Cc": "",     "Bcc": "",     "Body":`${__rtParams.EmailBody}`,     "Files": "",     "AttachmentNames": "",     "AttachmentData": "",     "Priority": 2,     "CustomerKey": `${__rtParams.CustomerKey} `,     "Timeout": 10000,     "NextStep_Success": "00021",     "NextStep_Failure": "00099",     "NextStep": "00022" }'
      __environment="environment"
      __rtBaseUrl="baseUrl"
      __rtEndpoint="_rtMailEndpoint"
      __rtNextStep="_rtNextStep"
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[\n    {\n        \&#39;name\&#39;: \&#39;__configJSON\&#39;,\n        \&#39;title\&#39;: \&#39;Operation config (JSON)\&#39;,\n        \&#39;hint\&#39;: \&#39;Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;maxLength\&#39;: 5000,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__environment\&#39;,\n        \&#39;title\&#39;: \&#39;Environment\&#39;,\n        \&#39;hint\&#39;: \&#39;Deployment environment. Controls which RTDS API endpoint is called.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;environment\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    },\n    {\n        \&#39;name\&#39;: \&#39;__nextStep\&#39;,\n        \&#39;title\&#39;: \&#39;Next step (output variable name)\&#39;,\n        \&#39;hint\&#39;: \&#39;Name of the session variable that will receive the next step Id after execution.\&#39;,\n        \&#39;controlSettings\&#39;: {\n            \&#39;controlType\&#39;: \&#39;text\&#39;,\n            \&#39;defaultValue\&#39;: \&#39;_rtNextStep\&#39;,\n            \&#39;maxLength\&#39;: 100,\n            \&#39;dataType\&#39;: \&#39;string\&#39;,\n            \&#39;readonly\&#39;: false\n        }\n    }\n]&#39;"
      id="117"
    >
      <mxCell style="component3Node" parent="baselayer" vertex="1">
        <mxGeometry x="436.5" y="474.5" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_sendEmail" id="118">
      <mxCell style="componentInnerNode;" parent="117" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="component"
      ComponentGuid="70d37307-be29-4769-9306-64dedee16f4c"
      ComponentVersion="kGf9kBIIeQVHCh5jeoSGCA=="
      SupportedLanguages=""
      __configJSON='{     "Active": {$rtSendSms},     "To": "+32478306999",     "Routing": "LPA_DEV",     "From": "8850",     "Body": "${rtSmsBody}",     "SmsAccountId": 47,     "Timeout": 5000,     "NextStep_Success": "00011",     "NextStep_Failure": "00099",     "NextStep": "00012" }'
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
      id="119"
    >
      <mxCell style="component3Node;" parent="baselayer" vertex="1">
        <mxGeometry x="436.5" y="602" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_sendSms" id="120">
      <mxCell style="componentInnerNode;" parent="119" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="126"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="125"
      target="114"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="p"
      Type="hung"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      DynamicNextTabGuid=""
      DynamicNextId=""
      id="129"
    >
      <mxCell style="hungNode" parent="baselayer" vertex="1">
        <mxGeometry x="1" y="1480" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="133"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="131"
      target="38"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="https://cdn.pixabay.com/audio/2026/02/27/audio_0250461c0c.mp3"
      Type="play"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Source="https://cdn.pixabay.com/audio/2026/02/27/audio_0250461c0c.mp3"
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Source_nl=""
      AltSources_nl=""
      DynamicNextTabGuid=""
      AltSources=""
      ContinueAfter="0"
      id="131"
    >
      <mxCell
        style="playNode;strokeColor=#6AB04E;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-79" y="870" width="290" height="80" as="geometry" />
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
          x="-11.499999999999943"
          y="130"
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
      __environment="null"
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition=""
      id="13"
    >
      <mxCell
        style="component3Node;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry
          x="-11.499999999999943"
          y="-30"
          width="155"
          height="60"
          as="geometry"
        />
      </mxCell>
    </object>
    <object label="getEnvironment" id="14">
      <mxCell style="componentInnerNode" parent="13" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="e6b2f2b8-690c-4712-a743-3a76dc5f34ec"
      LibraryVersion=""
      SupportedLanguages=""
      id="58"
    >
      <mxCell style="globalLibraryNode" parent="baselayer" vertex="1">
        <mxGeometry x="-440" y="-240" width="292" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_globalCodeAndHelpers" id="59">
      <mxCell style="globalLibraryInnerNode" parent="58" vertex="1">
        <mxGeometry x="10" y="16" width="272" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="c66d4041-a9f8-4e12-b89d-097cb357f0a9"
      LibraryVersion="null"
      SupportedLanguages=""
      id="60"
    >
      <mxCell style="globalLibraryNode" parent="baselayer" vertex="1">
        <mxGeometry x="-438" y="-130" width="290" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_globalConfig" id="61">
      <mxCell style="globalLibraryInnerNode" parent="60" vertex="1">
        <mxGeometry x="10" y="16" width="270" height="34" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="17"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="11"
      target="15"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="16"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="12"
      target="15"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="66" y="251" as="sourcePoint" />
        <mxPoint x="66" y="590" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label="apiConfigs"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='baseUrl = &#39;https://api.n-allo.be&#39;;
&#xa;_rtActiveGuardByConfigEndpoint = `/api/guardmoduleapi-${environment}/Guard/GetAllCurrentActiveGuardsByGuardConfig/`;
&#xa;_rtAnyGuardWithPhoneAndConfEndpoint = `/api/guardmoduleapi-${environment}/Guard/AnyGuardWithPhoneNumberAndConfig/`;
&#xa;
&#xa;guardCounter = -1;
&#xa;_rtSmsEndpoint = `/smsapi-acc/api/Send`;
&#xa;_rtMailEndpoint = `/mailapi-acc/`;
&#xa;__guardPickedUp = false;
&#xa;__redirectResult = "";'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="134"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-18" y="550" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="135"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="15"
      target="134"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="66" y="430" as="sourcePoint" />
        <mxPoint x="66" y="750" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label=""
      Type="redirect"
      OnEnter=""
      OnLeave=""
      Destination="line:nestedj"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Parameters="X-Vocalls-Party2-Endpoint:{rtGuards[guardCounter].phone};diversion:{__rtParams.Diversion};"
      SuccessCondition_nl=""
      MessageText_nl=""
      ResultVariableName="redirectResult"
      TransferType="attend"
      SuccessCondition=""
      MessageText=""
      MessageCache="true"
      MessageVoice=""
      MessageLanguage=""
      id="138"
    >
      <mxCell
        style="redirectNode;strokeColor=#D1B73D;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-14" y="1140" width="160" height="120" as="geometry" />
      </mxCell>
    </object>
    <object id="139">
      <mxCell style="redirectInnerNode" parent="138" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="not accepted"
      DynamicNextId=""
      SubType="default"
      DynamicNextTabGuid=""
      id="140"
    >
      <mxCell style="defaultNode" parent="138" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="142"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="140"
      target="45"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
  </root>
</mxGraphModel>;
