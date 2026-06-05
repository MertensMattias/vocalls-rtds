<mxGraphModel
  dx="3582"
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
      Code="__rtParams = {};&#xa;&#xa;/**&#xa; * Replaces the last &#39;-&#39;-separated segment of context.currentNode.id with the supplied nodeId.&#xa; * Returns the original nodeId untouched when context.currentNode.id is not set.&#xa; *&#xa; * @param {string|number} nodeId - The short id to splice into the current node path.&#xa; * @returns {string} The fully-qualified node id, or the original nodeId if no path is set.&#xa; */&#xa;__makeLocalNodeId = function (nodeId) {&#xa;    if (nodeId !== null &amp;&amp; nodeId !== undefined) nodeId = nodeId.toString();&#xa;    if (!context.currentNode.id) return nodeId;&#xa;    var __separator = &#39;-&#39;;&#xa;    var __output = context.currentNode.id.split(__separator);&#xa;    __output[__output.length - 1] = nodeId;&#xa;    return __output.join(__separator);&#xa;};&#xa;&#xa;/**&#xa; * Normalises operation config: JSON string -&gt; parsed; { Params: {...} } -&gt; Params; flat object -&gt; itself; null -&gt; {}.&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Flat Params object, never null.&#xa; */&#xa;__extractParams = function (config) {&#xa;    var __parsed = typeof config === &#39;string&#39; ? JSON.parse(config) : config;&#xa;    if (__parsed &amp;&amp; typeof __parsed.Params === &#39;object&#39; &amp;&amp; __parsed.Params !== null) return __parsed.Params;&#xa;    return __parsed || {};&#xa;};&#xa;&#xa;/**&#xa; * Component-local alias for the global activeFlag() (rtds_3_vocallsEnv.js) --&#xa; * the single Active-coercion contract. See conventions/params.md.&#xa; *&#xa; * @param {*} value&#xa; * @returns {boolean}&#xa; */&#xa;__activeFlag = function (value) {&#xa;    return activeFlag(value);&#xa;};&#xa;&#xa;/**&#xa; * Resolves Params into a flat { Key: value } map. The value&#39;s TYPE is whatever&#xa; * the JSON wrote -- no Number coercion (&#39;4&#39; stays a string, 4 stays a number).&#xa; * Per key: array-form [value, ...flags] is unwrapped to its first element&#xa; * (matches the runtime twin getParam; GUI flags isDisplayed/isEditable are&#xa; * runtime-irrelevant). Active is then coerced to a real boolean via __activeFlag.&#xa; * Every other STRING value is trimmed and has ${name} placeholders resolved via&#xa; * resolveConfigTokens (varObj first, then global; bare names only; String.replace,&#xa; * never new Function -- the Vocalls runtime disables string-eval). Non-strings pass&#xa; * through with their type intact. Unresolved placeholders are left raw and warned.&#xa; * Active absent: not defaulted here -- the read site decides (SetVariables true,&#xa; * Send and guard default false).&#xa; *&#xa; * @param {string|object} config - Raw operation config (see __extractParams).&#xa; * @returns {object} Map of Key -&gt; resolved value (no __rt prefix; v2 shape).&#xa; */&#xa;__setupConfig = function (config) {&#xa;    var __params = __extractParams(config);&#xa;    var __result = {};&#xa;    var __keys = Object.keys(__params);&#xa;    for (var __i = 0; __i &lt; __keys.length; __i++) {&#xa;        var __key = __keys[__i];&#xa;        var __value = __params[__key];&#xa;        if (Array.isArray(__value)) __value = __value.length ? __value[0] : &#39;&#39;;&#xa;        if (__key === &#39;Active&#39;) { __result.Active = __activeFlag(__value); continue; }&#xa;        if (typeof __value === &#39;string&#39;) __value = resolveConfigTokens(__value.trim(), __key);&#xa;        __result[__key] = __value;&#xa;    }&#xa;    return __result;&#xa;};&#xa;&#xa;// --- v2 object-access helpers ---&#xa;// Declared with `typeof &lt;name&gt; === &#39;undefined&#39;` guards so they fall back to local definitions&#xa;// when rtds_globalCodeAndHelpers.js has not yet been updated to expose them.&#xa;&#xa;if (typeof getValue === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Returns the value of `key` from `obj`, or `defaultValue` if the key is absent.&#xa;     * Case-insensitive lookup: matches whichever own property name lowercases to the same string.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getValue = function (obj, key, defaultValue) {&#xa;        if (!obj || !key) return defaultValue;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return obj[__propertyName];&#xa;            }&#xa;        }&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof walk === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Iterates own properties of `obj`, calling fn(key, value) for each.&#xa;     * Returning false from fn stops the walk.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {function} fn&#xa;     * @returns {void}&#xa;     */&#xa;    walk = function (obj, fn) {&#xa;        if (!obj) return;&#xa;        for (var __key in obj) {&#xa;            if (!obj.hasOwnProperty(__key)) continue;&#xa;            if (fn(__key, obj[__key]) === false) return;&#xa;        }&#xa;    };&#xa;}&#xa;&#xa;if (typeof hasKey === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Case-insensitive existence check (own properties).&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @returns {boolean}&#xa;     */&#xa;    hasKey = function (obj, key) {&#xa;        if (!obj || !key) return false;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return true;&#xa;            }&#xa;        }&#xa;        return false;&#xa;    };&#xa;}&#xa;&#xa;if (typeof getScoped === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Reads operator data with the RTDS scope contract: varObj[key]&#xa;     * (case-insensitive) first, then exact-case global[key], then defaultValue.&#xa;     * See conventions/storage.md.&#xa;     *&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getScoped = function (key, defaultValue) {&#xa;        if (defaultValue === undefined) defaultValue = null;&#xa;        if (!key) return defaultValue;&#xa;        var __vo = (typeof varObj !== &#39;undefined&#39;) ? varObj : null;&#xa;        if (__vo &amp;&amp; hasKey(__vo, key)) return getValue(__vo, key, defaultValue);&#xa;        var __scope = (typeof global !== &#39;undefined&#39;) ? global : ((typeof globalThis !== &#39;undefined&#39;) ? globalThis : null);&#xa;        if (__scope &amp;&amp; __scope[key] !== undefined &amp;&amp; __scope[key] !== null) return __scope[key];&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof resolveConfigTokens === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Substitutes ${name} placeholders in a string via getScoped (varObj first,&#xa;     * then global). Bare identifiers only (${w+}); no expressions. A placeholder&#xa;     * that resolves nowhere is left raw and a warn is logged (never silent &#39;&#39;).&#xa;     * String.replace only -- the Vocalls runtime disables string-eval.&#xa;     *&#xa;     * @param {string} raw&#xa;     * @param {string} keyName&#xa;     * @returns {string}&#xa;     */&#xa;    resolveConfigTokens = function (raw, keyName) {&#xa;        if (typeof raw !== &#39;string&#39; || raw.indexOf(&#39;${&#39;) === -1) return raw;&#xa;        var __MISSING = &#39; __rtUnresolved &#39;;&#xa;        return raw.replace(/\$\{(\w+)\}/g, function (__match, __name) {&#xa;            var __sub = getScoped(__name, __MISSING);&#xa;            if (__sub !== __MISSING) return String(__sub);&#xa;            Logger.warn(&#39;[resolveConfigTokens] unresolved placeholder&#39;, { key: keyName, placeholder: __name });&#xa;            return __match;&#xa;        });&#xa;    };&#xa;}&#xa;&#xa;&#xa;&#xa;// --- operation-specific helpers ---&#xa;&#xa;/**&#xa; * Splits a &#39;;&#39;-separated list of values into a trimmed, non-empty array.&#xa; * Returns null when the source is empty or yields no entries.&#xa; *&#xa; * @param {string} raw - The raw &#39;;&#39;-separated source string.&#xa; * @returns {Array&lt;string&gt;|null} Array of trimmed entries, or null when empty.&#xa; */&#xa;__splitSemicolonList = function (raw) {&#xa;    if (!raw || String(raw).trim() === &#39;&#39;) return null;&#xa;    var __parts = String(raw).split(&#39;;&#39;);&#xa;    var __out = [];&#xa;    for (var __i = 0; __i &lt; __parts.length; __i++) {&#xa;        var __t = __parts[__i].trim();&#xa;        if (__t) __out.push(__t);&#xa;    }&#xa;    return __out.length === 0 ? null : __out;&#xa;};&#xa;&#xa;/**&#xa; * Zips two &#39;;&#39;-separated lists (names and base64-encoded data) into an attachments array&#xa; * shaped for the MailDto payload. Returns null when either source is empty or no pair is fully populated.&#xa; *&#xa; * @param {string} rawNames - &#39;;&#39;-separated filenames.&#xa; * @param {string} rawData - &#39;;&#39;-separated base64-encoded file payloads.&#xa; * @returns {Array&lt;object&gt;|null} List of { fileName, fileData } objects, or null.&#xa; */&#xa;__buildAttachments = function (rawNames, rawData) {&#xa;    if (!rawNames || !rawData) return null;&#xa;    if (String(rawNames).trim() === &#39;&#39; || String(rawData).trim() === &#39;&#39;) return null;&#xa;    var __names = String(rawNames).split(&#39;;&#39;);&#xa;    var __datas = String(rawData).split(&#39;;&#39;);&#xa;    var __len = __names.length &lt; __datas.length ? __names.length : __datas.length;&#xa;    var __out = [];&#xa;    for (var __i = 0; __i &lt; __len; __i++) {&#xa;        var __name = __names[__i].trim();&#xa;        var __data = __datas[__i].trim();&#xa;        if (__name &amp;&amp; __data) __out.push({ fileName: __name, fileData: __data });&#xa;    }&#xa;    return __out.length === 0 ? null : __out;&#xa;};&#xa;&#xa;/**&#xa; * Splits a &#39;;&#39;-separated list of file paths and keeps only entries that the runtime confirms&#xa; * exist via fileExists. Returns null when fileExists is unavailable or no path qualifies.&#xa; *&#xa; * @param {string} raw - &#39;;&#39;-separated file paths.&#xa; * @returns {Array&lt;string&gt;|null} Existing file paths, or null when none qualify.&#xa; */&#xa;__resolveFilesList = function (raw) {&#xa;    if (!raw || String(raw).trim() === &#39;&#39;) return null;&#xa;    if (typeof fileExists !== &#39;function&#39;) return null;&#xa;    var __parts = String(raw).split(&#39;;&#39;);&#xa;    var __out = [];&#xa;    for (var __i = 0; __i &lt; __parts.length; __i++) {&#xa;        var __p = __parts[__i].trim();&#xa;        if (!__p) continue;&#xa;        try { if (fileExists(__p)) __out.push(__p); } catch (e) {}&#xa;    }&#xa;    return __out.length === 0 ? null : __out;&#xa;};"
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch (Belgium)&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-BE&#39;,&#39;ttsVoiceName&#39;:&#39;&#39;,&#39;ttsEngine&#39;:&#39;&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:false}}"
      Variables='__configJSON = {&#xa;    "Active": true,&#xa;    "Subject": "Your request has been received",&#xa;    "From": "noreply@n-allo.be",&#xa;    "To": "${rtEmailTo}",&#xa;    "Cc": "",&#xa;    "Bcc": "",&#xa;    "Body": "${rtEmailBody}",&#xa;    "Files": "",&#xa;    "AttachmentNames": "",&#xa;    "AttachmentData": "",&#xa;    "Priority": 2,&#xa;    "CustomerKey": "${rtCustomerKey}",&#xa;    "Timeout": 10000,&#xa;    "NextStep_Success": "00021",&#xa;    "NextStep_Failure": "00099",&#xa;    "NextStep": "00022"&#xa;};&#xa;__environment = environment;&#xa;__rtBaseUrl = _rtBaseUrl;&#xa;__rtEndpoint = _rtMailEndpoint;&#xa;__rtOutcome = &#39;NextStep_Failure&#39;;&#xa;__rtNextStep &amp;= _rtNextStep;'
      PropertiesDefinition='[&#xa;    {&#xa;        "name": "__configJSON",&#xa;        "title": "Operation config (JSON)",&#xa;        "hint": "Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "maxLength": 5000,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    },&#xa;    {&#xa;        "name": "__environment",&#xa;        "title": "Environment",&#xa;        "hint": "Deployment environment. Controls which RTDS API endpoint is called.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "defaultValue": "environment",&#xa;            "maxLength": 100,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    },&#xa;    {&#xa;        "name": "__nextStep",&#xa;        "title": "Next step (output variable name)",&#xa;        "hint": "Name of the session variable that will receive the next step Id after execution.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "defaultValue": "_rtNextStep",&#xa;            "maxLength": 100,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    }&#xa;]'
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
      Sections="[]"
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
      Code="__rtParams = __setupConfig(__configJSON);&#xa;if (!_headers) { _headers = {}; }&#xa;__rtOutcome = &#39;NextStep_Failure&#39;;&#xa;Logger.debug(&#39;[sendMail] config resolved&#39;, { params: __rtParams, outcome: __rtOutcome });"
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
      Code='__rtOutcome = &#39;NextStep&#39;;&#xa;&#xa;if (!getValue(__rtParams, &#39;Active&#39;, false)) {&#xa;    Logger.info(&#39;[sendMail] skipped -- inactive&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;var __from = getValue(__rtParams, &#39;From&#39;, &#39;&#39;);&#xa;if (!__from || String(__from).trim() === &#39;&#39;) {&#xa;    Logger.warn(&#39;[sendMail] From field is empty&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;var __toList = __splitSemicolonList(getValue(__rtParams, &#39;To&#39;, &#39;&#39;));&#xa;if (__toList === null) {&#xa;    Logger.warn(&#39;[sendMail] To field is empty&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;__rtOutcome = &#39;NextStep_Failure&#39;;&#xa;&#xa;var __ccList = __splitSemicolonList(getValue(__rtParams, &#39;Cc&#39;, &#39;&#39;));&#xa;var __bccList = __splitSemicolonList(getValue(__rtParams, &#39;Bcc&#39;, &#39;&#39;));&#xa;var __filesList = __resolveFilesList(getValue(__rtParams, &#39;Files&#39;, &#39;&#39;));&#xa;var __attachmentsList = __buildAttachments(&#xa;    getValue(__rtParams, &#39;AttachmentNames&#39;, &#39;&#39;),&#xa;    getValue(__rtParams, &#39;AttachmentData&#39;, &#39;&#39;)&#xa;);&#xa;&#xa;var __priority = Number(getValue(__rtParams, &#39;Priority&#39;, 2));&#xa;if (__priority !== 1 &amp;&amp; __priority !== 2 &amp;&amp; __priority !== 3) __priority = 2;&#xa;&#xa;var __customerKey = getValue(__rtParams, &#39;CustomerKey&#39;, &#39;&#39;);&#xa;__customerKey = (__customerKey &amp;&amp; String(__customerKey).trim() !== &#39;&#39;) ? String(__customerKey).trim() : null;&#xa;&#xa;var __url = __rtBaseUrl + __rtEndpoint;&#xa;var __method = &#39;POST&#39;;&#xa;var __timeout = Number(getValue(__rtParams, &#39;Timeout&#39;, 10000));&#xa;var __payload = {&#xa;    from:     __from,&#xa;    subject:  getValue(__rtParams, &#39;Subject&#39;, &#39;&#39;),&#xa;    to:       __toList,&#xa;    body:     getValue(__rtParams, &#39;Body&#39;, &#39;&#39;),&#xa;    priority: __priority&#xa;};&#xa;if (__ccList !== null) __payload.cc = __ccList;&#xa;if (__bccList !== null) __payload.bcc = __bccList;&#xa;if (__filesList !== null) __payload.files = __filesList;&#xa;if (__attachmentsList !== null) __payload.attachments = __attachmentsList;&#xa;if (__customerKey !== null) __payload.customerKey = __customerKey;&#xa;&#xa;return jsonHttpRequest(__url, { method: __method, "timeout": __timeout }, _headers, __payload).then(&#xa;    function (result) {&#xa;        if (result &amp;&amp; result.success === true) {&#xa;            __rtOutcome = &#39;NextStep_Success&#39;;&#xa;            Logger.info(&#39;[sendMail] success&#39;, { outcome: __rtOutcome });&#xa;            return;&#xa;        }&#xa;        Logger.warn(&#39;[sendMail] request failed&#39;, { statusCode: result &amp;&amp; result.statusCode, outcome: __rtOutcome });&#xa;    },&#xa;    function (err) {&#xa;        Logger.error(&#39;[sendMail] request error&#39;, { outcome: __rtOutcome }, err);&#xa;    }&#xa;);'
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
      OnEnter="global[_rtNextStep] = getValue(__rtParams, __rtOutcome, -1);&#xa;Logger.info(&#39;[sendMail] exit&#39;, { outcome: __rtOutcome, nextStep: global[_rtNextStep] });"
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
