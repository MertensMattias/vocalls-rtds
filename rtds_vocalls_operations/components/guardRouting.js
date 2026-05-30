<mxGraphModel
  dx="3233"
  dy="2302"
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
      Code='__rtParams = {};&#xa;&#xa;/**&#xa; * Replaces the last &apos;-&apos;-separated segment of context.currentNode.id with the supplied nodeId.&#xa; * Returns the original nodeId untouched when context.currentNode.id is not set.&#xa; *&#xa; * @param {string|number} nodeId - The short id to splice into the current node path.&#xa; * @returns {string} The fully-qualified node id, or the original nodeId if no path is set.&#xa; */&#xa;__makeLocalNodeId = function (nodeId) {&#xa;    if (nodeId !== null &amp;&amp; nodeId !== undefined) nodeId = nodeId.toString();&#xa;    if (!context.currentNode.id) return nodeId;&#xa;    var __separator = &apos;-&apos;;&#xa;    var __output = context.currentNode.id.split(__separator);&#xa;    __output[__output.length - 1] = nodeId;&#xa;    return __output.join(__separator);&#xa;};&#xa;&#xa;/**&#xa; * Normalises operation config: JSON string -&gt; parsed; { Params: {...} } -&gt; Params; flat object -&gt; itself; null -&gt; {}.&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Flat Params object, never null.&#xa; */&#xa;__extractParams = function (config) {&#xa;    var __parsed = typeof config === &apos;string&apos; ? JSON.parse(config) : config;&#xa;    if (__parsed &amp;&amp; typeof __parsed.Params === &apos;object&apos; &amp;&amp; __parsed.Params !== null) return __parsed.Params;&#xa;    return __parsed || {};&#xa;};&#xa;&#xa;/**&#xa; * Resolves Params into a flat { Key: value } map. Active coerced to Boolean; ConfigId/Timeout coerced to Number;&#xa; * values containing ${name} have those placeholders substituted from global (bare names only; no expressions).&#xa; * Unresolved placeholders are left raw and logged at warn level. Uses String.replace, NOT new Function - the&#xa; * Vocalls runtime disables string-eval.&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Map of Key -&gt; resolved value (no __rt prefix; v2 shape).&#xa; */&#xa;__setupConfig = function (config) {&#xa;    var __params = __extractParams(config);&#xa;    var __result = {};&#xa;    __result.Active = typeof __params.Active === &apos;boolean&apos; ? __params.Active : Boolean(__params.Active);&#xa;    var __keys = Object.keys(__params);&#xa;    for (var __i = 0; __i &lt; __keys.length; __i++) {&#xa;        var __key = __keys[__i];&#xa;        if (__key === &apos;Active&apos;) continue;&#xa;        var __raw = (__params[__key] !== undefined &amp;&amp; __params[__key] !== null) ? String(__params[__key]).trim() : &apos;&apos;;&#xa;        var __resolved;&#xa;        if (__raw.indexOf(&apos;${&apos;) !== -1) {&#xa;            __resolved = __raw.replace(/\$\{(\w+)\}/g, function (__match, __name) {&#xa;                if (global.hasOwnProperty(__name)) { return String(global[__name]); }&#xa;                Logger.warn(&apos;[__setupConfig] unresolved placeholder&apos;, { key: __key, placeholder: __name });&#xa;                return __match;&#xa;            });&#xa;        } else { __resolved = __raw; }&#xa;        if (__key === &apos;ConfigId&apos;) __resolved = Number(__resolved) || -1;&#xa;        else if (__key === &apos;Timeout&apos;) __resolved = __resolved !== &apos;&apos; ? Number(__resolved) : 10000;&#xa;        __result[__key] = __resolved;&#xa;    }&#xa;    return __result;&#xa;};&#xa;&#xa;// --- v2 object-access helpers ---&#xa;// Declared with `typeof &lt;name&gt; === &apos;undefined&apos;` guards so they fall back to local definitions&#xa;// when rtds_globalCodeAndHelpers.js has not yet been updated to expose them.&#xa;&#xa;if (typeof getValue === &apos;undefined&apos;) {&#xa;    /**&#xa;     * Returns the value of `key` from `obj`, or `defaultValue` if the key is absent.&#xa;     * Case-insensitive lookup: matches whichever own property name lowercases to the same string.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getValue = function (obj, key, defaultValue) {&#xa;        if (!obj || !key) return defaultValue;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return obj[__propertyName];&#xa;            }&#xa;        }&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof walk === &apos;undefined&apos;) {&#xa;    /**&#xa;     * Iterates own properties of `obj`, calling fn(key, value) for each. Returning false stops the walk.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {function} fn&#xa;     * @returns {void}&#xa;     */&#xa;    walk = function (obj, fn) {&#xa;        if (!obj) return;&#xa;        for (var __key in obj) {&#xa;            if (!obj.hasOwnProperty(__key)) continue;&#xa;            if (fn(__key, obj[__key]) === false) return;&#xa;        }&#xa;    };&#xa;}&#xa;&#xa;if (typeof nowUTC === &apos;undefined&apos;) {&#xa;    /**&#xa;     * @returns {string} Current date/time as ISO-8601 UTC.&#xa;     */&#xa;    nowUTC = function () { return new Date().toISOString(); };&#xa;}&#xa;&#xa;// --- operation-specific helper ---&#xa;&#xa;/**&#xa; * Classifies the result object returned by a NestedJob redirect into a coarse outcome string.&#xa; * Mirrors the PureConnect Party2.Status mapping: 4 -&gt; no_reaction, 1 -&gt; rejected, 0 -&gt; rejected_voicebox.&#xa; * Any other status (a connected / answered call) is treated as success. Missing / malformed result -&gt; unknown.&#xa; *&#xa; * @param {object} transferResult - The redirect ResultVariableName object (__transferResult).&#xa; * @returns {string} One of: success, no_reaction, rejected, rejected_voicebox, unknown.&#xa; */&#xa;__classifyRedirect = function (transferResult) {&#xa;    if (!transferResult || !transferResult.Details || !transferResult.Details.ClientSpecific || !transferResult.Details.ClientSpecific.Party2) {&#xa;        return &apos;unknown&apos;;&#xa;    }&#xa;    var __status = transferResult.Details.ClientSpecific.Party2.Status;&#xa;    if (__status === 4) return &apos;no_reaction&apos;;&#xa;    if (__status === 1) return &apos;rejected&apos;;&#xa;    if (__status === 0) return &apos;rejected_voicebox&apos;;&#xa;    return &apos;success&apos;;&#xa;};'
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&apos;nl&apos;:{&apos;isDefault&apos;:true,&apos;languageName&apos;:&apos;Dutch (Belgium)&apos;,&apos;ttsLanguageCode&apos;:&apos;nl-BE&apos;,&apos;ttsVoiceName&apos;:&apos;&apos;,&apos;ttsEngine&apos;:&apos;&apos;,&apos;ttsPitch&apos;:&apos;&apos;,&apos;ttsSpeed&apos;:&apos;&apos;,&apos;ttsVolume&apos;:&apos;&apos;,&apos;prosodyBaseEnabled&apos;:true,&apos;prosodyContourEnabled&apos;:false}}"
      Variables='__configJSON = {&#xa;    &quot;Active&quot;: false,&#xa;    &quot;ConfigId&quot;: 1,&#xa;    &quot;ConfigName&quot;: &quot;KLANTWACHT&quot;,&#xa;    &quot;DialGuard&quot;: true,&#xa;    &quot;OutboundAni&quot;: &quot;&quot;,&#xa;    &quot;Diversion&quot;: &quot;&quot;,&#xa;    &quot;OnHoldAudioUrl&quot;: &quot;https://audio-${environment}.n-allo.be/on-hold.wav&quot;,&#xa;    &quot;Timeout&quot;: 15,&#xa;    &quot;RecordVoicemail&quot;: true,&#xa;    &quot;AcceptCallMenu&quot;: true,&#xa;    &quot;AcceptCallMessage&quot;: &quot;Press 1 to accept the call.&quot;,&#xa;    &quot;SendSms&quot;: true,&#xa;    &quot;SendMail&quot;: true,&#xa;    &quot;NextStep_Success&quot;: &quot;00002&quot;,&#xa;    &quot;NextStep_Failure&quot;: &quot;00099&quot;,&#xa;    &quot;NextStep&quot;: &quot;00005&quot;&#xa;};&#xa;__environment = environment;&#xa;__rtBaseUrl = _rtBaseUrl;&#xa;__rtGuardEndpoint = _rtActiveGuardByConfigEndpoint;&#xa;__rtNextStep &amp;= _rtNextStep;'
      PropertiesDefinition='[&#xa;    {&#xa;        &quot;name&quot;: &quot;__configJSON&quot;,&#xa;        &quot;title&quot;: &quot;Operation config (JSON)&quot;,&#xa;        &quot;hint&quot;: &quot;Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.&quot;,&#xa;        &quot;controlSettings&quot;: {&#xa;            &quot;controlType&quot;: &quot;text&quot;,&#xa;            &quot;maxLength&quot;: 5000,&#xa;            &quot;dataType&quot;: &quot;string&quot;,&#xa;            &quot;readonly&quot;: false&#xa;        }&#xa;    },&#xa;    {&#xa;        &quot;name&quot;: &quot;__environment&quot;,&#xa;        &quot;title&quot;: &quot;Environment&quot;,&#xa;        &quot;hint&quot;: &quot;Deployment environment. Controls which RTDS API endpoint is called.&quot;,&#xa;        &quot;controlSettings&quot;: {&#xa;            &quot;controlType&quot;: &quot;text&quot;,&#xa;            &quot;defaultValue&quot;: &quot;environment&quot;,&#xa;            &quot;maxLength&quot;: 100,&#xa;            &quot;dataType&quot;: &quot;string&quot;,&#xa;            &quot;readonly&quot;: false&#xa;        }&#xa;    },&#xa;    {&#xa;        &quot;name&quot;: &quot;__nextStep&quot;,&#xa;        &quot;title&quot;: &quot;Next step (output variable name)&quot;,&#xa;        &quot;hint&quot;: &quot;Name of the session variable that will receive the next step Id after execution.&quot;,&#xa;        &quot;controlSettings&quot;: {&#xa;            &quot;controlType&quot;: &quot;text&quot;,&#xa;            &quot;defaultValue&quot;: &quot;_rtNextStep&quot;,&#xa;            &quot;maxLength&quot;: 100,&#xa;            &quot;dataType&quot;: &quot;string&quot;,&#xa;            &quot;readonly&quot;: false&#xa;        }&#xa;    }&#xa;]'
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      Translations="guardVoicemailPrompt = &apos;Geachte klant, laat alstublieft een bericht achter.&apos;;"
      ManualId=""
      RequiredVariables=""
      HintGrammar=""
      LastLanguage="default"
      InfoAboutUser_en=""
      CompanyInformation_en=""
      GeneralKnowledge_en=""
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
      Code="__rtParams = __setupConfig(__configJSON);&#xa;if (!_headers) { _headers = {}; }&#xa;Logger.debug(&apos;[guardRouting] config resolved&apos;, { params: __rtParams });"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="7"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="233.5" y="-230" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="getGuards"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="global[_rtNextStep] = getValue(__rtParams, &apos;NextStep&apos;, -1);&#xa;&#xa;if (!getValue(__rtParams, &apos;Active&apos;, false)) {&#xa;    Logger.info(&apos;[guardRouting] skipped — inactive&apos;, { nextStep: global[_rtNextStep] });&#xa;    return;&#xa;}&#xa;&#xa;__guardList = [];&#xa;__guardIndex = 0;&#xa;__guardCount = 0;&#xa;__guardLog = [];&#xa;__guardPickedUp = false;&#xa;__recordVoicemail = getValue(__rtParams, &apos;RecordVoicemail&apos;, false) === true;&#xa;__diversion = getValue(__rtParams, &apos;Diversion&apos;, &apos;&apos;);&#xa;__onHoldAudioUrl = getValue(__rtParams, &apos;OnHoldAudioUrl&apos;, &apos;&apos;);&#xa;__currentGuardPhone = &apos;&apos;;&#xa;&#xa;global[_rtNextStep] = getValue(__rtParams, &apos;NextStep_Failure&apos;, -1);&#xa;&#xa;var __url = __rtBaseUrl + __rtGuardEndpoint + &apos;/&apos; + getValue(__rtParams, &apos;ConfigId&apos;, -1);&#xa;&#xa;return jsonHttpRequest(__url, { method: &apos;GET&apos;, &quot;timeout&quot;: 10000 }, _headers, null).then(&#xa;    function (result) {&#xa;        if (!result || result.success !== true) {&#xa;            Logger.warn(&apos;[guardRouting] guard lookup failed&apos;, { statusCode: result &amp;&amp; result.statusCode, nextStep: global[_rtNextStep] });&#xa;            return;&#xa;        }&#xa;        var __guards = result.response || result.body || [];&#xa;        if (!__guards.length) {&#xa;            Logger.warn(&apos;[guardRouting] no active guards&apos;, { nextStep: global[_rtNextStep] });&#xa;            return;&#xa;        }&#xa;        __guardList = __guards;&#xa;        __guardCount = __guards.length;&#xa;        global[_rtNextStep] = getValue(__rtParams, &apos;NextStep&apos;, -1);&#xa;        Logger.info(&apos;[guardRouting] guards resolved&apos;, { count: __guardCount, nextStep: global[_rtNextStep] });&#xa;    },&#xa;    function (err) {&#xa;        Logger.error(&apos;[guardRouting] guard lookup error&apos;, { nextStep: global[_rtNextStep] }, err);&#xa;    }&#xa;);"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="29"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="233.5" y="-70" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="hasGuards"
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="100"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="237.5" y="90" width="160" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="101">
      <mxCell style="caseInnerNode" parent="100" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__guardCount &gt; 0"
      SubType="expression"
      Expression="__guardCount &gt; 0"
      DynamicNextId=""
      id="102"
    >
      <mxCell style="expressionNode" parent="100" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="no choice"
      SubType="default"
      DynamicNextId=""
      id="103"
    >
      <mxCell style="defaultNode" parent="100" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="onHold"
      Type="play"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      DynamicNextId=""
      Source="{__onHoldAudioUrl}"
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      AltSources=""
      ContinueAfter="0"
      DynamicNextTabGuid=""
      id="110"
    >
      <mxCell style="playNode" parent="baselayer" vertex="1">
        <mxGeometry x="150" y="266" width="290" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="guardLoop"
      Type="counter"
      OnEnter=""
      OnLeave=""
      MaxEntryCount="25"
      MaxEntryNodeId="6"
      VariableName="__guardIndex"
      id="120"
    >
      <mxCell style="counterNode" parent="baselayer" vertex="1">
        <mxGeometry x="246" y="400" width="160" height="96" as="geometry" />
      </mxCell>
    </object>
    <object id="121">
      <mxCell style="counterInnerNode" parent="120" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="&gt;= __guardCount"
      SubType="expression"
      Expression="&gt;= __guardCount"
      DynamicNextId=""
      id="122"
    >
      <mxCell style="expressionNode" parent="120" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="dialGuard"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="var __guard = __guardList[__guardIndex] || {};&#xa;__currentGuardPhone = __guard.phone || &apos;&apos;;&#xa;global[_rtNextStep] = getValue(__rtParams, &apos;NextStep_Success&apos;, -1);&#xa;Logger.info(&apos;[guardRouting] dialing guard&apos;, { index: __guardIndex, nextStep: global[_rtNextStep] });"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="130"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="233.5" y="560" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="redirect"
      OnEnter=""
      OnLeave=""
      Destination="line:nestedj"
      Parameters="X-Vocalls-Party2-Endpoint:{__currentGuardPhone};diversion:{__diversion};"
      TransferType="NestedJob"
      ResultVariableName="__transferResult"
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="140"
    >
      <mxCell style="redirectNode" parent="baselayer" vertex="1">
        <mxGeometry x="237.5" y="700" width="160" height="96" as="geometry" />
      </mxCell>
    </object>
    <object id="141">
      <mxCell style="redirectInnerNode" parent="140" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="not accepted"
      SubType="default"
      DynamicNextId=""
      id="142"
    >
      <mxCell style="defaultNode" parent="140" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="appendLog"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="var __guard = __guardList[__guardIndex] || {};&#xa;var __outcome = __classifyRedirect(__transferResult);&#xa;__guardLog.push({ name: __guard.name, phone: __guard.phone, email: __guard.email, time: nowUTC(), outcome: __outcome });&#xa;if (__outcome === &apos;success&apos;) {&#xa;    __guardPickedUp = true;&#xa;    global[_rtNextStep] = getValue(__rtParams, &apos;NextStep_Success&apos;, -1);&#xa;} else {&#xa;    __guardIndex = __guardIndex + 1;&#xa;    global[_rtNextStep] = getValue(__rtParams, &apos;NextStep&apos;, -1);&#xa;}&#xa;Logger.info(&apos;[guardRouting] guard attempt logged&apos;, { index: __guardIndex, outcome: __outcome });"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="150"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="233.5" y="860" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="answered"
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="160"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="237.5" y="1020" width="160" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="161">
      <mxCell style="caseInnerNode" parent="160" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__guardPickedUp == true"
      SubType="expression"
      Expression="__guardPickedUp == true"
      DynamicNextId=""
      id="162"
    >
      <mxCell style="expressionNode" parent="160" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="no choice"
      SubType="default"
      DynamicNextId=""
      id="163"
    >
      <mxCell style="defaultNode" parent="160" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="recordVoicemail"
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="170"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="640" y="400" width="160" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="171">
      <mxCell style="caseInnerNode" parent="170" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__recordVoicemail == true"
      SubType="expression"
      Expression="__recordVoicemail == true"
      DynamicNextId=""
      id="172"
    >
      <mxCell style="expressionNode" parent="170" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="no choice"
      SubType="default"
      DynamicNextId=""
      id="173"
    >
      <mxCell style="defaultNode" parent="170" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="leaveMessage"
      Type="say"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      DynamicNextId=""
      Text="{guardVoicemailPrompt}"
      AltTexts=""
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Language=""
      Voice=""
      Cache="true"
      EscapeXML="true"
      DynamicNextTabGuid=""
      id="180"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="620" y="560" width="290" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="recognize"
      OnEnter=""
      OnLeave=""
      Timeout="8000"
      MinTimeout="5000"
      ExpectedSpeechType="default"
      SimilarityTreshold="0.4"
      NoiseDistance="0.05"
      ReactionType="normal"
      VariableName="__voicemailCapture"
      HintKeywords=""
      HintGrammar=""
      Wait=""
      SpeechRecognition="default"
      NLPEngine="Embedding"
      AcceptAnyResponse="true"
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="190"
    >
      <mxCell style="recognizeNode" parent="baselayer" vertex="1">
        <mxGeometry x="643" y="700" width="163" height="156" as="geometry" />
      </mxCell>
    </object>
    <object id="191">
      <mxCell style="recognizeInnerNode" parent="190" vertex="1">
        <mxGeometry x="10" y="16" width="143" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="message"
      SubType="reactionGroup"
      Priority="0.5"
      Lemma="true"
      Grammar=""
      Sentences=""
      Keywords=""
      Groups=""
      DynamicNextId=""
      id="192"
    >
      <mxCell style="reactionGroupNode" parent="190" vertex="1">
        <mxGeometry x="10" y="56" width="143" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="no input"
      SubType="notRecognized"
      DynamicNextId=""
      id="193"
    >
      <mxCell style="notRecognizedNode" parent="190" vertex="1">
        <mxGeometry x="10" y="86" width="143" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="prepareMsg"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="var __voicemailResult = (typeof __voicemailCapture !== &apos;undefined&apos; &amp;&amp; __voicemailCapture) ? String(__voicemailCapture) : &apos;&apos;;&#xa;setVariable(&apos;guardVoicemailTranscript&apos;, __voicemailResult);&#xa;setVariable(&apos;guardVoicemailRecorded&apos;, __voicemailResult !== &apos;&apos;);&#xa;Logger.info(&apos;[guardRouting] voicemail captured&apos;, { recorded: __voicemailResult !== &apos;&apos;, nextStep: global[_rtNextStep] });"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="200"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="626" y="900" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="output"
      Type="transient"
      OnEnter="Logger.info(&apos;[guardRouting] exit&apos;, { nextStep: __rtNextStep });"
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
        <mxGeometry x="252.5" y="1180" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell id="28" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;" parent="baselayer" source="0" target="7" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="30" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;" parent="baselayer" source="7" target="29" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="300" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="29" target="100" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="301" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="102" target="110" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="302" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="103" target="6" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="303" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="110" target="120" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="304" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" parent="baselayer" source="122" target="170" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="305" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="120" target="130" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="306" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="130" target="140" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="307" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="140" target="150" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="308" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="142" target="150" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="309" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="150" target="160" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="310" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="162" target="6" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="311" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" parent="baselayer" source="163" target="120" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="312" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="172" target="180" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="313" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;" parent="baselayer" source="173" target="6" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="314" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="180" target="190" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="315" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="192" target="200" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="316" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" parent="baselayer" source="193" target="200" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell id="317" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;" parent="baselayer" source="200" target="6" edge="1">
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
  </root>
</mxGraphModel>
