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
      Code='__rtParams = {};&#xa;&#xa;/**&#xa; * Replaces the last &apos;-&apos;-separated segment of context.currentNode.id with the supplied nodeId.&#xa; * Returns the original nodeId untouched when context.currentNode.id is not set.&#xa; *&#xa; * @param {string|number} nodeId - The short id to splice into the current node path.&#xa; * @returns {string} The fully-qualified node id, or the original nodeId if no path is set.&#xa; */&#xa;__makeLocalNodeId = function (nodeId) {&#xa;    if (nodeId !== null &amp;&amp; nodeId !== undefined) nodeId = nodeId.toString();&#xa;    if (!context.currentNode.id) return nodeId;&#xa;    var __separator = &apos;-&apos;;&#xa;    var __output = context.currentNode.id.split(__separator);&#xa;    __output[__output.length - 1] = nodeId;&#xa;    return __output.join(__separator);&#xa;};&#xa;&#xa;/**&#xa; * Normalises operation config: JSON string -&gt; parsed; { Params: {...} } -&gt; Params; flat object -&gt; itself; null -&gt; {}.&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Flat Params object, never null.&#xa; */&#xa;__extractParams = function (config) {&#xa;    var __parsed = typeof config === &apos;string&apos; ? JSON.parse(config) : config;&#xa;    if (__parsed &amp;&amp; typeof __parsed.Params === &apos;object&apos; &amp;&amp; __parsed.Params !== null) return __parsed.Params;&#xa;    return __parsed || {};&#xa;};&#xa;&#xa;/**&#xa; * Resolves Params into a flat { Key: value } map. Active coerced to Boolean; ConfigId/Timeout coerced to Number;&#xa; * values containing ${name} have those placeholders substituted from global (bare names only; no expressions).&#xa; * Unresolved placeholders are left raw and logged at warn level. Uses String.replace, NOT new Function — the&#xa; * Vocalls runtime disables string-eval.&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Map of Key -&gt; resolved value (no __rt prefix; v2 shape).&#xa; */&#xa;__setupConfig = function (config) {&#xa;    var __params = __extractParams(config);&#xa;    var __result = {};&#xa;    __result.Active = typeof __params.Active === &apos;boolean&apos; ? __params.Active : Boolean(__params.Active);&#xa;    var __keys = Object.keys(__params);&#xa;    for (var __i = 0; __i &lt; __keys.length; __i++) {&#xa;        var __key = __keys[__i];&#xa;        if (__key === &apos;Active&apos;) continue;&#xa;        var __raw = (__params[__key] !== undefined &amp;&amp; __params[__key] !== null) ? String(__params[__key]).trim() : &apos;&apos;;&#xa;        var __resolved;&#xa;        if (__raw.indexOf(&apos;${&apos;) !== -1) {&#xa;            __resolved = __raw.replace(/\$\{(\w+)\}/g, function (__match, __name) {&#xa;                if (global.hasOwnProperty(__name)) { return String(global[__name]); }&#xa;                Logger.warn(&apos;[__setupConfig] unresolved placeholder&apos;, { key: __key, placeholder: __name });&#xa;                return __match;&#xa;            });&#xa;        } else { __resolved = __raw; }&#xa;        if (__key === &apos;ConfigId&apos;) __resolved = Number(__resolved) || -1;&#xa;        else if (__key === &apos;Timeout&apos;) __resolved = __resolved !== &apos;&apos; ? Number(__resolved) : 10000;&#xa;        __result[__key] = __resolved;&#xa;    }&#xa;    return __result;&#xa;};&#xa;&#xa;// --- v2 object-access helpers ---&#xa;// Declared with `typeof &lt;name&gt; === &apos;undefined&apos;` guards so they fall back to local definitions&#xa;// when rtds_globalCodeAndHelpers.js has not yet been updated to expose them.&#xa;&#xa;if (typeof getValue === &apos;undefined&apos;) {&#xa;    /**&#xa;     * Returns the value of `key` from `obj`, or `defaultValue` if the key is absent.&#xa;     * Case-insensitive lookup: matches whichever own property name lowercases to the same string.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getValue = function (obj, key, defaultValue) {&#xa;        if (!obj || !key) return defaultValue;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return obj[__propertyName];&#xa;            }&#xa;        }&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof walk === &apos;undefined&apos;) {&#xa;    /**&#xa;     * Iterates own properties of `obj`, calling fn(key, value) for each.&#xa;     * Returning false from fn stops the walk.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {function} fn&#xa;     * @returns {void}&#xa;     */&#xa;    walk = function (obj, fn) {&#xa;        if (!obj) return;&#xa;        for (var __key in obj) {&#xa;            if (!obj.hasOwnProperty(__key)) continue;&#xa;            if (fn(__key, obj[__key]) === false) return;&#xa;        }&#xa;    };&#xa;}&#xa;&#xa;// --- operation-specific helpers ---&#xa;&#xa;/**&#xa; * Splits a &apos;;&apos;-separated list of values into a trimmed, non-empty array.&#xa; * Returns null when the source is empty or yields no entries.&#xa; *&#xa; * @param {string} raw - The raw &apos;;&apos;-separated source string.&#xa; * @returns {Array&lt;string&gt;|null} Array of trimmed entries, or null when empty.&#xa; */&#xa;__splitSemicolonList = function (raw) {&#xa;    if (!raw || String(raw).trim() === &apos;&apos;) return null;&#xa;    var __parts = String(raw).split(&apos;;&apos;);&#xa;    var __out = [];&#xa;    for (var __i = 0; __i &lt; __parts.length; __i++) {&#xa;        var __t = __parts[__i].trim();&#xa;        if (__t) __out.push(__t);&#xa;    }&#xa;    return __out.length === 0 ? null : __out;&#xa;};&#xa;&#xa;/**&#xa; * Zips two &apos;;&apos;-separated lists (names and base64-encoded data) into an attachments array&#xa; * shaped for the MailDto payload. Returns null when either source is empty or no pair is fully populated.&#xa; *&#xa; * @param {string} rawNames - &apos;;&apos;-separated filenames.&#xa; * @param {string} rawData - &apos;;&apos;-separated base64-encoded file payloads.&#xa; * @returns {Array&lt;object&gt;|null} List of { fileName, fileData } objects, or null.&#xa; */&#xa;__buildAttachments = function (rawNames, rawData) {&#xa;    if (!rawNames || !rawData) return null;&#xa;    if (String(rawNames).trim() === &apos;&apos; || String(rawData).trim() === &apos;&apos;) return null;&#xa;    var __names = String(rawNames).split(&apos;;&apos;);&#xa;    var __datas = String(rawData).split(&apos;;&apos;);&#xa;    var __len = __names.length &lt; __datas.length ? __names.length : __datas.length;&#xa;    var __out = [];&#xa;    for (var __i = 0; __i &lt; __len; __i++) {&#xa;        var __name = __names[__i].trim();&#xa;        var __data = __datas[__i].trim();&#xa;        if (__name &amp;&amp; __data) __out.push({ fileName: __name, fileData: __data });&#xa;    }&#xa;    return __out.length === 0 ? null : __out;&#xa;};&#xa;&#xa;/**&#xa; * Splits a &apos;;&apos;-separated list of file paths and keeps only entries that the runtime confirms&#xa; * exist via fileExists. Returns null when fileExists is unavailable or no path qualifies.&#xa; *&#xa; * @param {string} raw - &apos;;&apos;-separated file paths.&#xa; * @returns {Array&lt;string&gt;|null} Existing file paths, or null when none qualify.&#xa; */&#xa;__resolveFilesList = function (raw) {&#xa;    if (!raw || String(raw).trim() === &apos;&apos;) return null;&#xa;    if (typeof fileExists !== &apos;function&apos;) return null;&#xa;    var __parts = String(raw).split(&apos;;&apos;);&#xa;    var __out = [];&#xa;    for (var __i = 0; __i &lt; __parts.length; __i++) {&#xa;        var __p = __parts[__i].trim();&#xa;        if (!__p) continue;&#xa;        try { if (fileExists(__p)) __out.push(__p); } catch (e) {}&#xa;    }&#xa;    return __out.length === 0 ? null : __out;&#xa;};'
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&apos;nl&apos;:{&apos;isDefault&apos;:true,&apos;languageName&apos;:&apos;Dutch (Belgium)&apos;,&apos;ttsLanguageCode&apos;:&apos;nl-BE&apos;,&apos;ttsVoiceName&apos;:&apos;&apos;,&apos;ttsEngine&apos;:&apos;&apos;,&apos;ttsPitch&apos;:&apos;&apos;,&apos;ttsSpeed&apos;:&apos;&apos;,&apos;ttsVolume&apos;:&apos;&apos;,&apos;prosodyBaseEnabled&apos;:true,&apos;prosodyContourEnabled&apos;:false}}"
      Variables='__configJSON = {&#xa;    &quot;Active&quot;: true,&#xa;    &quot;Subject&quot;: &quot;Your request has been received&quot;,&#xa;    &quot;From&quot;: &quot;noreply@n-allo.be&quot;,&#xa;    &quot;To&quot;: &quot;${rtEmailTo}&quot;,&#xa;    &quot;Cc&quot;: &quot;&quot;,&#xa;    &quot;Bcc&quot;: &quot;&quot;,&#xa;    &quot;Body&quot;: &quot;${rtEmailBody}&quot;,&#xa;    &quot;Files&quot;: &quot;&quot;,&#xa;    &quot;AttachmentNames&quot;: &quot;&quot;,&#xa;    &quot;AttachmentData&quot;: &quot;&quot;,&#xa;    &quot;Priority&quot;: 2,&#xa;    &quot;CustomerKey&quot;: &quot;${rtCustomerKey}&quot;,&#xa;    &quot;Timeout&quot;: 10000,&#xa;    &quot;NextStep_Success&quot;: &quot;00021&quot;,&#xa;    &quot;NextStep_Failure&quot;: &quot;00099&quot;,&#xa;    &quot;NextStep&quot;: &quot;00022&quot;&#xa;};&#xa;__environment = environment;&#xa;__rtBaseUrl = _rtBaseUrl;&#xa;__rtEndpoint = _rtMailEndpoint;&#xa;__rtNextStep &amp;= _rtNextStep;'
      PropertiesDefinition='[&#xa;    {&#xa;        &quot;name&quot;: &quot;__configJSON&quot;,&#xa;        &quot;title&quot;: &quot;Operation config (JSON)&quot;,&#xa;        &quot;hint&quot;: &quot;Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.&quot;,&#xa;        &quot;controlSettings&quot;: {&#xa;            &quot;controlType&quot;: &quot;text&quot;,&#xa;            &quot;maxLength&quot;: 5000,&#xa;            &quot;dataType&quot;: &quot;string&quot;,&#xa;            &quot;readonly&quot;: false&#xa;        }&#xa;    },&#xa;    {&#xa;        &quot;name&quot;: &quot;__environment&quot;,&#xa;        &quot;title&quot;: &quot;Environment&quot;,&#xa;        &quot;hint&quot;: &quot;Deployment environment. Controls which RTDS API endpoint is called.&quot;,&#xa;        &quot;controlSettings&quot;: {&#xa;            &quot;controlType&quot;: &quot;text&quot;,&#xa;            &quot;defaultValue&quot;: &quot;environment&quot;,&#xa;            &quot;maxLength&quot;: 100,&#xa;            &quot;dataType&quot;: &quot;string&quot;,&#xa;            &quot;readonly&quot;: false&#xa;        }&#xa;    },&#xa;    {&#xa;        &quot;name&quot;: &quot;__nextStep&quot;,&#xa;        &quot;title&quot;: &quot;Next step (output variable name)&quot;,&#xa;        &quot;hint&quot;: &quot;Name of the session variable that will receive the next step Id after execution.&quot;,&#xa;        &quot;controlSettings&quot;: {&#xa;            &quot;controlType&quot;: &quot;text&quot;,&#xa;            &quot;defaultValue&quot;: &quot;_rtNextStep&quot;,&#xa;            &quot;maxLength&quot;: 100,&#xa;            &quot;dataType&quot;: &quot;string&quot;,&#xa;            &quot;readonly&quot;: false&#xa;        }&#xa;    }&#xa;]'
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      Translations=""
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
      Code='__rtParams = __setupConfig(__configJSON);&#xa;if (!_headers) { _headers = {}; }&#xa;Logger.debug(&apos;[sendMail] config resolved&apos;, { params: __rtParams });'
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
      Code='global[_rtNextStep] = getValue(__rtParams, &apos;NextStep&apos;, -1);&#xa;&#xa;if (!getValue(__rtParams, &apos;Active&apos;, false)) {&#xa;    Logger.info(&apos;[sendMail] skipped — inactive&apos;, { nextStep: global[_rtNextStep] });&#xa;    return;&#xa;}&#xa;&#xa;var __from = getValue(__rtParams, &apos;From&apos;, &apos;&apos;);&#xa;if (!__from || String(__from).trim() === &apos;&apos;) {&#xa;    Logger.warn(&apos;[sendMail] From field is empty&apos;, { nextStep: global[_rtNextStep] });&#xa;    return;&#xa;}&#xa;&#xa;var __toList = __splitSemicolonList(getValue(__rtParams, &apos;To&apos;, &apos;&apos;));&#xa;if (__toList === null) {&#xa;    Logger.warn(&apos;[sendMail] To field is empty&apos;, { nextStep: global[_rtNextStep] });&#xa;    return;&#xa;}&#xa;&#xa;global[_rtNextStep] = getValue(__rtParams, &apos;NextStep_Failure&apos;, -1);&#xa;&#xa;var __ccList = __splitSemicolonList(getValue(__rtParams, &apos;Cc&apos;, &apos;&apos;));&#xa;var __bccList = __splitSemicolonList(getValue(__rtParams, &apos;Bcc&apos;, &apos;&apos;));&#xa;var __filesList = __resolveFilesList(getValue(__rtParams, &apos;Files&apos;, &apos;&apos;));&#xa;var __attachmentsList = __buildAttachments(&#xa;    getValue(__rtParams, &apos;AttachmentNames&apos;, &apos;&apos;),&#xa;    getValue(__rtParams, &apos;AttachmentData&apos;, &apos;&apos;)&#xa;);&#xa;&#xa;var __priority = Number(getValue(__rtParams, &apos;Priority&apos;, 2));&#xa;if (__priority !== 1 &amp;&amp; __priority !== 2 &amp;&amp; __priority !== 3) __priority = 2;&#xa;&#xa;var __customerKey = getValue(__rtParams, &apos;CustomerKey&apos;, &apos;&apos;);&#xa;__customerKey = (__customerKey &amp;&amp; String(__customerKey).trim() !== &apos;&apos;) ? String(__customerKey).trim() : null;&#xa;&#xa;var __url = __rtBaseUrl + __rtEndpoint;&#xa;var __method = &apos;POST&apos;;&#xa;var __timeout = getValue(__rtParams, &apos;Timeout&apos;, 10000);&#xa;var __payload = {&#xa;    from:     __from,&#xa;    subject:  getValue(__rtParams, &apos;Subject&apos;, &apos;&apos;),&#xa;    to:       __toList,&#xa;    body:     getValue(__rtParams, &apos;Body&apos;, &apos;&apos;),&#xa;    priority: __priority&#xa;};&#xa;if (__ccList !== null) __payload.cc = __ccList;&#xa;if (__bccList !== null) __payload.bcc = __bccList;&#xa;if (__filesList !== null) __payload.files = __filesList;&#xa;if (__attachmentsList !== null) __payload.attachments = __attachmentsList;&#xa;if (__customerKey !== null) __payload.customerKey = __customerKey;&#xa;&#xa;return jsonHttpRequest(__url, { method: __method, &quot;timeout&quot;: __timeout }, _headers, __payload).then(&#xa;    function (result) {&#xa;        if (result &amp;&amp; result.success === true) {&#xa;            global[_rtNextStep] = getValue(__rtParams, &apos;NextStep_Success&apos;, -1);&#xa;            Logger.info(&apos;[sendMail] success&apos;, { nextStep: global[_rtNextStep] });&#xa;            return;&#xa;        }&#xa;        Logger.warn(&apos;[sendMail] request failed&apos;, { statusCode: result &amp;&amp; result.statusCode, nextStep: global[_rtNextStep] });&#xa;    },&#xa;    function (err) {&#xa;        Logger.error(&apos;[sendMail] request error&apos;, { nextStep: global[_rtNextStep] }, err);&#xa;    }&#xa;);'
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
      OnEnter="Logger.info(&apos;[sendMail] exit&apos;, { nextStep: __rtNextStep });"
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
</mxGraphModel>
