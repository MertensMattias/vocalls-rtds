<mxGraphModel
  dx="4859"
  dy="3676"
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
      Code="__rtParams = {};&#xa;&#xa;/**&#xa; * Replaces the last &#39;-&#39;-separated segment of context.currentNode.id with the supplied nodeId.&#xa; * Returns the original nodeId untouched when context.currentNode.id is not set.&#xa; *&#xa; * @param {string|number} nodeId - The short id to splice into the current node path.&#xa; * @returns {string} The fully-qualified node id, or the original nodeId if no path is set.&#xa; */&#xa;__makeLocalNodeId = function (nodeId) {&#xa;    if (nodeId !== null &amp;&amp; nodeId !== undefined) nodeId = nodeId.toString();&#xa;    if (!context.currentNode.id) return nodeId;&#xa;    var __separator = &#39;-&#39;;&#xa;    var __output = context.currentNode.id.split(__separator);&#xa;    __output[__output.length - 1] = nodeId;&#xa;    return __output.join(__separator);&#xa;};&#xa;&#xa;/**&#xa; * Normalises operation config: JSON string -&gt; parsed; { params: {...} } -&gt; params; flat object -&gt; itself; null -&gt; {}.&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Flat Params object, never null.&#xa; */&#xa;__extractParams = function (config) {&#xa;    var __parsed = typeof config === &#39;string&#39; ? JSON.parse(config) : config;&#xa;    if (__parsed &amp;&amp; typeof __parsed.params === &#39;object&#39; &amp;&amp; __parsed.params !== null) return __parsed.params;&#xa;    return __parsed || {};&#xa;};&#xa;&#xa;/**&#xa; * Component-local alias for the global activeFlag() (rtds_3_vocallsEnv.js) --&#xa; * the single Active-coercion contract. See conventions/params.md.&#xa; *&#xa; * @param {*} value&#xa; * @returns {boolean}&#xa; */&#xa;__activeFlag = function (value) {&#xa;    return activeFlag(value);&#xa;};&#xa;&#xa;/**&#xa; * Resolves Params into a flat { Key: value } map. The value&#39;s TYPE is whatever&#xa; * the JSON wrote -- no Number coercion (&#39;4&#39; stays a string, 4 stays a number).&#xa; * Per key: array-form [value, ...flags] is unwrapped to its first element&#xa; * (matches the runtime twin getParam; GUI flags isDisplayed/isEditable are&#xa; * runtime-irrelevant). active is then coerced to a real boolean via __activeFlag.&#xa; * Every other STRING value is trimmed and has ${name} placeholders resolved via&#xa; * resolveConfigTokens (varObj first, then global; bare names only; String.replace,&#xa; * never new Function -- the Vocalls runtime disables string-eval). Non-strings pass&#xa; * through with their type intact. Unresolved placeholders are left raw and warned.&#xa; * active absent: not defaulted here -- the read site decides (guard defaults true).&#xa; *&#xa; * @param {string|object} config - Raw operation config (see __extractParams).&#xa; * @returns {object} Map of Key -&gt; resolved value (no __rt prefix; v2 shape).&#xa; */&#xa;__setupConfig = function (config) {&#xa;    var __params = __extractParams(config);&#xa;    var __result = {};&#xa;    var __keys = Object.keys(__params);&#xa;    for (var __i = 0; __i &lt; __keys.length; __i++) {&#xa;        var __key = __keys[__i];&#xa;        var __value = __params[__key];&#xa;        if (Array.isArray(__value)) __value = __value.length ? __value[0] : &#39;&#39;;&#xa;        if (__key === &#39;active&#39;) { __result.active = __activeFlag(__value); continue; }&#xa;        if (typeof __value === &#39;string&#39;) __value = resolveConfigTokens(__value.trim(), __key);&#xa;        __result[__key] = __value;&#xa;    }&#xa;    return __result;&#xa;};&#xa;&#xa;// --- v2 object-access helpers ---&#xa;// Declared with `typeof &lt;name&gt; === &#39;undefined&#39;` guards so they fall back to local definitions&#xa;// when rtds_globalCodeAndHelpers.js has not yet been updated to expose them.&#xa;&#xa;if (typeof getValue === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Returns the value of `key` from `obj`, or `defaultValue` if the key is absent.&#xa;     * Case-insensitive lookup: matches whichever own property name lowercases to the same string.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getValue = function (obj, key, defaultValue) {&#xa;        if (!obj || !key) return defaultValue;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return obj[__propertyName];&#xa;            }&#xa;        }&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof walk === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Iterates own properties of `obj`, calling fn(key, value) for each. Returning false stops the walk.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {function} fn&#xa;     * @returns {void}&#xa;     */&#xa;    walk = function (obj, fn) {&#xa;        if (!obj) return;&#xa;        for (var __key in obj) {&#xa;            if (!obj.hasOwnProperty(__key)) continue;&#xa;            if (fn(__key, obj[__key]) === false) return;&#xa;        }&#xa;    };&#xa;}&#xa;&#xa;if (typeof nowUTC === &#39;undefined&#39;) {&#xa;    /**&#xa;     * @returns {string} Current date/time as ISO-8601 UTC.&#xa;     */&#xa;    nowUTC = function () { return new Date().toISOString(); };&#xa;}&#xa;&#xa;if (typeof hasKey === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Case-insensitive existence check (own properties).&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @returns {boolean}&#xa;     */&#xa;    hasKey = function (obj, key) {&#xa;        if (!obj || !key) return false;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return true;&#xa;            }&#xa;        }&#xa;        return false;&#xa;    };&#xa;}&#xa;&#xa;if (typeof getScoped === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Reads operator data with the RTDS scope contract: varObj[key]&#xa;     * (case-insensitive) first, then exact-case global[key], then defaultValue.&#xa;     * See conventions/storage.md.&#xa;     *&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getScoped = function (key, defaultValue) {&#xa;        if (defaultValue === undefined) defaultValue = null;&#xa;        if (!key) return defaultValue;&#xa;        var __vo = (typeof varObj !== &#39;undefined&#39;) ? varObj : null;&#xa;        if (__vo &amp;&amp; hasKey(__vo, key)) return getValue(__vo, key, defaultValue);&#xa;        var __scope = (typeof global !== &#39;undefined&#39;) ? global : ((typeof globalThis !== &#39;undefined&#39;) ? globalThis : null);&#xa;        if (__scope &amp;&amp; __scope[key] !== undefined &amp;&amp; __scope[key] !== null) return __scope[key];&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof resolveConfigTokens === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Substitutes ${name} placeholders in a string via getScoped (varObj first,&#xa;     * then global). Bare identifiers only (${w+}); no expressions. A placeholder&#xa;     * that resolves nowhere is left raw and a warn is logged (never silent &#39;&#39;).&#xa;     * String.replace only -- the Vocalls runtime disables string-eval.&#xa;     *&#xa;     * @param {string} raw&#xa;     * @param {string} keyName&#xa;     * @returns {string}&#xa;     */&#xa;    resolveConfigTokens = function (raw, keyName) {&#xa;        if (typeof raw !== &#39;string&#39; || raw.indexOf(&#39;${&#39;) === -1) return raw;&#xa;        var __MISSING = &#39; __rtUnresolved &#39;;&#xa;        return raw.replace(/\$\{(\w+)\}/g, function (__match, __name) {&#xa;            var __sub = getScoped(__name, __MISSING);&#xa;            if (__sub !== __MISSING) return String(__sub);&#xa;            Logger.warn(&#39;[resolveConfigTokens] unresolved placeholder&#39;, { key: keyName, placeholder: __name });&#xa;            return __match;&#xa;        });&#xa;    };&#xa;}&#xa;&#xa;&#xa;&#xa;// --- operation-specific helper ---&#xa;&#xa;/**&#xa; * Classifies the result object returned by a NestedJob redirect into a coarse outcome string.&#xa; * Mirrors the PureConnect Party2.Status mapping: 4 -&gt; no_reaction, 1 -&gt; rejected, 0 -&gt; rejected_voicebox.&#xa; * Any other status (a connected / answered call) is treated as success. Missing / malformed result -&gt; unknown.&#xa; *&#xa; * @param {object} transferResult - The redirect ResultVariableName object (__transferResult).&#xa; * @returns {string} One of: success, no_reaction, rejected, rejected_voicebox, unknown.&#xa; */&#xa;__classifyRedirect = function (transferResult) {&#xa;    if (!transferResult || !transferResult.Details || !transferResult.Details.ClientSpecific || !transferResult.Details.ClientSpecific.Party2) {&#xa;        return &#39;unknown&#39;;&#xa;    }&#xa;    var __status = transferResult.Details.ClientSpecific.Party2.Status;&#xa;    if (__status === 4) return &#39;no_reaction&#39;;&#xa;    if (__status === 1) return &#39;rejected&#39;;&#xa;    if (__status === 0) return &#39;rejected_voicebox&#39;;&#xa;    return &#39;success&#39;;&#xa;};&#xa;&#xa;/**&#xa; * Builds the per-attempt block list shared by the SMS and email notification&#xa; * bodies. One block per __guardLog entry: recipient line, time, reason (outcome),&#xa; * then a blank line.&#xa; *&#xa; * @param {object[]} guardLog - Ordered dial-attempt records ({ guardName, guardPhone, guardEmail, time, outcome }).&#xa; * @returns {string} The concatenated attempt blocks (may be empty).&#xa; */&#xa;__buildAttemptBlocks = function (guardLog) {&#xa;    var __blocks = &#39;&#39;;&#xa;    for (var __i = 0; __i &lt; guardLog.length; __i++) {&#xa;        var __entry = guardLog[__i];&#xa;        __blocks += &#39;To: &#39; + (__entry.guardName || &#39;&#39;) + &#39; on mobile number: &#39; + (__entry.guardPhone || &#39;&#39;) + &#39;\n&#39;;&#xa;        __blocks += &#39;Time: &#39; + (__entry.time || &#39;&#39;) + &#39;\n&#39;;&#xa;        __blocks += &#39;Reason: &#39; + (__entry.outcome || &#39;&#39;) + &#39;\n\n&#39;;&#xa;    }&#xa;    return __blocks;&#xa;};&#xa;&#xa;/**&#xa; * Collects a semicolon-separated recipient list from the guard list for the&#xa; * given field (&#39;phone&#39; or &#39;email&#39;). When excludePhone is supplied (the success&#xa; * guard for SMS), any guard whose phone matches it is dropped. Email collection&#xa; * passes excludePhone null so every guard is included.&#xa; *&#xa; * @param {object[]} guardList - Guard records from the Guard API.&#xa; * @param {string} field - &#39;guardPhone&#39; or &#39;guardEmail&#39;.&#xa; * @param {string|null} excludePhone - guardPhone of the success guard to exclude (SMS only).&#xa; * @returns {string} Semicolon-joined recipients (may be empty).&#xa; */&#xa;__collectRecipients = function (guardList, field, excludePhone) {&#xa;    var __out = [];&#xa;    for (var __i = 0; __i &lt; guardList.length; __i++) {&#xa;        var __g = guardList[__i];&#xa;        if (excludePhone &amp;&amp; __g.guardPhone === excludePhone) continue;&#xa;        var __v = __g[field];&#xa;        if (__v) __out.push(__v);&#xa;    }&#xa;    return __out.join(&#39;;&#39;);&#xa;};&#xa;&#xa;/**&#xa; * Append-merges a delta into a cross-leg global session variable. Reads the&#xa; * current value via getScoped, concatenates with the supplied separator when&#xa; * non-empty, and writes back to varObj. Used to accumulate rtSmsTo /&#xa; * rtSmsBody / rtEmailTo / rtEmailBody across call legs.&#xa; *&#xa; * @param {string} name - Global variable name.&#xa; * @param {string} delta - Value to append.&#xa; * @param {string} separator - Separator used when the existing value is non-empty.&#xa; * @returns {string} The merged value written back.&#xa; */&#xa;__appendGlobal = function (name, delta, separator) {&#xa;    var __current = String(getScoped(name, &#39;&#39;) || &#39;&#39;);&#xa;    var __merged = __current ? (delta ? __current + separator + delta : __current) : delta;&#xa;    varObj[name] = __merged;&#xa;    return __merged;&#xa;};"
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch (Belgium)&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-BE&#39;,&#39;ttsVoiceName&#39;:&#39;&#39;,&#39;ttsEngine&#39;:&#39;&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:false}}"
      Variables='__configJSON = {&#xa;    "active": true,&#xa;    "configId": 1,&#xa;    "configName": "KLANTWACHT",&#xa;    "dialGuard": true,&#xa;    "outboundANI": "",&#xa;    "diversion": "",&#xa;    "onHoldAudioUrl": "https://vocalls.cz/downloads/files/CuRJXoaYDOPQbHZ8YAAQv_GENERAL_TENANT.wav",&#xa;    "timeout": 10000,&#xa;    "recordVoicemail": true,&#xa;    "acceptCallMenu": true,&#xa;    "acceptCallMessage": "Press 1 to accept the call.",&#xa;    "sendSms": true,&#xa;    "sendMail": true,&#xa;    "nextStep_Success": "00002",&#xa;    "nextStep_Failure": "00099",&#xa;    "nextStep": "00005"&#xa;};&#xa;__environment = environment;&#xa;__rtBaseUrl = _rtBaseUrl;&#xa;__rtGuardEndpoint = _rtActiveGuardByConfigEndpoint;&#xa;__rtNextStep &amp;= _rtNextStep;'
      PropertiesDefinition='[&#xa;    {&#xa;        "name": "__configJSON",&#xa;        "title": "Operation config (JSON)",&#xa;        "hint": "Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "maxLength": 5000,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    },&#xa;    {&#xa;        "name": "__environment",&#xa;        "title": "Environment",&#xa;        "hint": "Deployment environment. Controls which RTDS API endpoint is called.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "defaultValue": "environment",&#xa;            "maxLength": 100,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    },&#xa;    {&#xa;        "name": "__nextStep",&#xa;        "title": "Next step (output variable name)",&#xa;        "hint": "Name of the session variable that will receive the next step Id after execution.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "defaultValue": "_rtNextStep",&#xa;            "maxLength": 100,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    }&#xa;]'
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      Translations="guardVoicemailPrompt = &#39;Geachte klant, laat alstublieft een bericht achter.&#39;;"
      ManualId=""
      RequiredVariables=""
      HintGrammar=""
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
      <mxCell
        style="transientNode;strokeColor=#666666;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry
          x="-147.5"
          y="-1610"
          width="130"
          height="40"
          as="geometry"
        />
      </mxCell>
    </object>
    <object
      label="init"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="__guardList = [];&#xa;__guardIndex = 0;&#xa;__guardCount = 0;&#xa;__guardLog = [];&#xa;__guardPickedUp = false;&#xa;__recordVoicemail = false;&#xa;__diversion = &#39;&#39;;&#xa;__onHoldAudioUrl = &#39;&#39;;&#xa;__currentGuardPhone = &#39;&#39;;&#xa;__transferResult = null;&#xa;__voicemailCapture = &#39;&#39;;&#xa;&#xa;__rtOutcome = &#39;nextStep&#39;;&#xa;__rtParams = __setupConfig(__configJSON);&#xa;&#xa;&#xa;if (!_headers) { _headers = {}; }&#xa;Logger.debug(&#39;[guardRouting] config resolved&#39;, { params: __rtParams, outcome: __rtOutcome });"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="7"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="224" y="-500" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="getGuards"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='__rtOutcome = &#39;nextStep&#39;;&#xa;&#xa;if (!__activeFlag(getValue(__rtParams, &#39;active&#39;, true))) {&#xa;    Logger.info(&#39;[guardRouting] skipped -- inactive&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;__rtOutcome = &#39;nextStep_Failure&#39;;&#xa;&#xa;var __headers = _headers;&#xa;var __endpoint = __rtBaseUrl + __rtGuardEndpoint;&#xa;var __queryParameters = &#39;?guardConfigId=&#39; + encodeURIComponent(getValue(__rtParams, &#39;configId&#39;, null));&#xa;&#xa;return jsonHttpRequest(&#xa;    __endpoint + __queryParameters,&#xa;    { method: &#39;GET&#39;, "timeout": Number(getValue(__rtParams, &#39;timeout&#39;, 10000)) },&#xa;    __headers&#xa;).then(&#xa;    function (result) {&#xa;        // transport / HTTP failure (wrapper resolves with success:false rather than rejecting)&#xa;        if (!result || result.success !== true) {&#xa;            Logger.warn(&#39;[guardRouting] lookup failed&#39;, { statusCode: result &amp;&amp; result.statusCode, outcome: __rtOutcome });&#xa;            return; // __rtOutcome stays &#39;nextStep_Failure&#39;&#xa;        }&#xa;&#xa;        // endpoint returns a collection -- normalise to an array before reading .length&#xa;        __guards = result.response;&#xa;        if (Object.prototype.toString.call(__guards) !== &#39;[object Array]&#39;) {&#xa;            __guards = [];&#xa;        }&#xa;        // store raw GuardDto records -- readers use the API keys guardName/guardPhone/guardEmail directly.&#xa;        __guardList = __guards;&#xa;        __guardCount = __guards.length;&#xa;        __guardIndex = 0;&#xa;        Logger.debug(&#39;[guardRouting] guards loaded&#39;, { count: __guards.length });&#xa;&#xa;        // dialGuard gates the dial loop only; notification prep still runs on the guard list.&#xa;        __dialGuards = getValue(__rtParams, &#39;dialGuard&#39;, true);&#xa;        // recordVoicemail gates the voicemail-capture branch (recordVoicemail case node).&#xa;        __recordVoicemail = getValue(__rtParams, &#39;recordVoicemail&#39;, false);&#xa;&#xa;        // guards found OR empty both proceed -&gt; &#39;nextStep&#39;; the hasGuards case routes on __dialGuards &amp;&amp; __guardCount.&#xa;        __rtOutcome = &#39;nextStep&#39;;&#xa;        Logger.info(&#39;[guardRouting] guards resolved&#39;, { count: __guardCount, dialGuards: __dialGuards, outcome: __rtOutcome });&#xa;    },&#xa;    function (err) {&#xa;        Logger.error(&#39;[guardRouting] lookup error&#39;, { outcome: __rtOutcome }, err); // stays &#39;nextStep_Failure&#39;&#xa;    }&#xa;);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="29"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="224" y="-330" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{getValue(__rtParams, &#39;onHoldAudioUrl&#39;, null)}"
      Type="play"
      OnEnter="context.returnTo = context.currentNode.id"
      OnLeave=""
      DynamicNextId=""
      Source="{getValue(__rtParams, &#39;onHoldAudioUrl&#39;, null)}"
      SelectionMode="temporary"
      MaxEntryCount=""
      MaxEntryNodeId=""
      AltSources=""
      ContinueAfter="0"
      DynamicNextTabGuid=""
      Source_nl=""
      AltSources_nl=""
      id="110"
    >
      <mxCell
        style="playNode;strokeColor=#6AB04E;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-350" y="100" width="290" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="dialGuard"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="Logger.info(&#39;__guardList: &#39; + JSON.stringify(__guardList));&#xa;var __guard = __guardList[__guardIndex] || {};&#xa;__currentGuardPhone = __guard.guardPhone || &#39;&#39;;&#xa;// diversion flows from config via getValue (read here so the redirect&#39;s&#xa;// {__diversion} interpolation carries the configured value, not a stale seed).&#xa;__diversion = getValue(__rtParams, &#39;diversion&#39;, 1);&#xa;// acceptCallMenu / acceptCallMessage are staged for observability only -- the&#xa;// press-1-to-accept gate in the NestedJob redirect is not yet wired (see spec).&#xa;var __acceptMenu = getValue(__rtParams, &#39;acceptCallMenu&#39;, false);&#xa;Logger.info(&#39;[guardRouting] dialing guard&#39;, { index: __guardIndex, guardName: __guard.guardName, guardPhone: __currentGuardPhone, acceptCallMenu: __acceptMenu, outcome: __rtOutcome });"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="130"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-289" y="470" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="appendLog"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="var __guard = __guardList[__guardIndex] || {};&#xa;var __outcome = __classifyRedirect(__transferResult);&#xa;__guardLog.push({ guardName: __guard.guardName, guardPhone: __guard.guardPhone, guardEmail: __guard.guardEmail, time: nowUTC(), outcome: __outcome });&#xa;if (__outcome === &#39;success&#39;) {&#xa;    __guardPickedUp = true;&#xa;    __rtOutcome = &#39;nextStep_Success&#39;;&#xa;} else {&#xa;    __guardIndex = __guardIndex + 1;&#xa;    __rtOutcome = &#39;nextStep&#39;;&#xa;}&#xa;Logger.info(&#39;[guardRouting] guard attempt logged&#39;, { index: __guardIndex, outcome: __outcome });"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="150"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="-289" y="810" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="{guardVoicemailPrompt}"
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
      Text_nl=""
      AltTexts_nl=""
      ContinueAfter=""
      WaitForPrevious="false"
      OutputFilter=""
      id="180"
    >
      <mxCell style="sayNode" parent="baselayer" vertex="1">
        <mxGeometry x="1210" y="270" width="290" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="prepareMsg"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="// --- voicemail finalisation ---&#xa;var __voicemailResult = (typeof __voicemailCapture !== &#39;undefined&#39; &amp;&amp; __voicemailCapture) ? String(__voicemailCapture) : &#39;&#39;;&#xa;var __voicemailRecorded = __voicemailResult !== &#39;&#39;;&#xa;varObj.guardVoicemailTranscript = __voicemailResult;&#xa;varObj.guardVoicemailRecorded = __voicemailRecorded;&#xa;if (__voicemailRecorded) varObj.rtEmailAttachment = __voicemailResult;&#xa;Logger.info(&#39;[guardRouting] voicemail captured&#39;, { recorded: __voicemailRecorded, outcome: __rtOutcome });&#xa;&#xa;// --- shared report inputs ---&#xa;var __recordVm = getValue(__rtParams, &#39;recordVoicemail&#39;, false);&#xa;var __configName = getValue(__rtParams, &#39;configName&#39;, &#39;&#39;);&#xa;var __successPhone = null;&#xa;for (var __i = 0; __i &lt; __guardLog.length; __i++) {&#xa;    if (__guardLog[__i].outcome === &#39;success&#39;) { __successPhone = __guardLog[__i].guardPhone; break; }&#xa;}&#xa;var __loneSuccess = __guardCount === 1 &amp;&amp; __successPhone !== null;&#xa;var __attemptBlocks = __buildAttemptBlocks(__guardLog);&#xa;&#xa;// --- SMS prep --- (skip a lone guard who answered: no notification needed)&#xa;if (getValue(__rtParams, &#39;sendSms&#39;, false) &amp;&amp; !__loneSuccess) {&#xa;    var __smsDelta = String(getScoped(&#39;rtSmsBody&#39;, &#39;&#39;) || &#39;&#39;) ? &#39;&#39; : (__configName + &#39; -- caller &#39; + getScoped(&#39;ani&#39;, &#39;&#39;) + &#39;\n\n&#39;);&#xa;    __smsDelta += __attemptBlocks;&#xa;    if (__recordVm) __smsDelta += __voicemailRecorded ? &#39;The caller recorded a voicemail, this is sent by mail.\n&#39; : &#39;The caller didn\&#39;t record a voicemail.\n&#39;;&#xa;    var __smsTo = __collectRecipients(__guardList, &#39;guardPhone&#39;, __successPhone);&#xa;    __appendGlobal(&#39;rtSmsTo&#39;, __smsTo, &#39;;&#39;);&#xa;    __appendGlobal(&#39;rtSmsBody&#39;, __smsDelta, &#39;&#39;);&#xa;    Logger.debug(&#39;[guardRouting] sms prepared&#39;, { recipients: __smsTo, outcome: __rtOutcome });&#xa;}&#xa;&#xa;// --- email prep --- (all guard emails; success guard NOT excluded)&#xa;if (getValue(__rtParams, &#39;sendMail&#39;, false)) {&#xa;    var __mailDelta = String(getScoped(&#39;rtEmailBody&#39;, &#39;&#39;) || &#39;&#39;) ? &#39;&#39; : (__configName + &#39; -- caller &#39; + getScoped(&#39;ani&#39;, &#39;&#39;) + &#39;\n\n&#39;);&#xa;    __mailDelta += __attemptBlocks;&#xa;    if (__recordVm) __mailDelta += __voicemailRecorded ? &#39;The caller recorded a voicemail, you\&#39;ll find the attachment below.\n&#39; : &#39;The caller didn\&#39;t record a voicemail.\n&#39;;&#xa;    var __mailTo = __collectRecipients(__guardList, &#39;guardEmail&#39;, null);&#xa;    __appendGlobal(&#39;rtEmailTo&#39;, __mailTo, &#39;;&#39;);&#xa;    __appendGlobal(&#39;rtEmailBody&#39;, __mailDelta, &#39;&#39;);&#xa;    Logger.debug(&#39;[guardRouting] email prepared&#39;, { recipients: __mailTo, outcome: __rtOutcome });&#xa;}"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="200"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="990" y="590" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="output"
      Type="transient"
      OnEnter="_rtNextStep = getValue(__rtParams, __rtOutcome, &#39;&#39;); &#xa;Logger.info(&#39;[guardRouting] exit&#39;, { outcome: __rtOutcome, nextStep: _rtNextStep });"
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
        <mxGeometry x="880" y="1190" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="28"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="0"
      target="332"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="30"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="7"
      target="29"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="300"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="29"
      target="100"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="303"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="110"
      target="120"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="305"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="120"
      target="130"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="306"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="130"
      target="338"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="309"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="150"
      target="160"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="314"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="180"
      target="190"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="317"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="200"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="hasGuards"
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="100"
    >
      <mxCell
        style="caseNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="228" y="-20" width="160" height="126" as="geometry" />
      </mxCell>
    </object>
    <object id="101">
      <mxCell style="caseInnerNode" parent="100" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__dialGuards &amp;&amp; __guardCount &gt; 0"
      SubType="expression"
      Expression="__dialGuards &amp;&amp; __guardCount &gt; 0"
      DynamicNextId=""
      DynamicNextTabGuid=""
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
      DynamicNextTabGuid=""
      id="103"
    >
      <mxCell style="defaultNode" parent="100" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="301"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="102"
      target="110"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="337"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="103"
      target="200"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
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
      <mxCell
        style="counterNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry x="-285" y="280" width="160" height="96" as="geometry" />
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
      DynamicNextTabGuid=""
      id="122"
    >
      <mxCell style="expressionNode" parent="120" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="304"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="122"
      target="170"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
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
        <mxGeometry x="-285" y="1000" width="160" height="126" as="geometry" />
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
    <object label="no choice" SubType="default" DynamicNextId="" id="163">
      <mxCell style="defaultNode" parent="160" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="310"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="162"
      target="200"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="311"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="163"
      target="120"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="-440" y="1101" />
          <mxPoint x="-440" y="328" />
        </Array>
      </mxGeometry>
    </mxCell>
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
        <mxGeometry x="865" y="140" width="160" height="126" as="geometry" />
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
    <object label="no choice" SubType="default" DynamicNextId="" id="173">
      <mxCell style="defaultNode" parent="170" vertex="1">
        <mxGeometry x="10" y="86" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="312"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="172"
      target="180"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="313"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="173"
      target="200"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
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
        <mxGeometry x="1273.5" y="460" width="163" height="156" as="geometry" />
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
    <object label="no input" SubType="notRecognized" DynamicNextId="" id="193">
      <mxCell style="notRecognizedNode" parent="190" vertex="1">
        <mxGeometry x="10" y="86" width="143" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="315"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;entryX=0.5;entryY=0;entryDx=0;entryDy=0;exitX=0;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="192"
      target="200"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="316"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="193"
      target="200"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="1074" y="561" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="318"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="320"
      target="328"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="-94.75" y="-1400" as="sourcePoint" />
        <mxPoint x="-94.75" y="-1020" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="336"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="319"
      target="7"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="[rtds] start"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='Logger.info("[rtds] start");&#xa;&#xa;initializeCallFlowContext("full");&#xa;&#xa;Logger.info("[rtds] call context ready", {&#xa;    callGuid: context &amp;&amp; context.callInfo &amp;&amp; context.callInfo.callGuid,&#xa;    direction: context &amp;&amp; context.callInfo &amp;&amp; context.callInfo.direction,&#xa;    language: (context &amp;&amp; context.language) || (varObj &amp;&amp; varObj.language),&#xa;    ani: varObj &amp;&amp; varObj.ani,&#xa;    dnis: varObj &amp;&amp; varObj.dnis,&#xa;    routingId: varObj &amp;&amp; varObj.routingId,&#xa;    environment: varObj &amp;&amp; varObj.environment,&#xa;});&#xa;&#xa;__rtGuardEndpoint = _rtActiveGuardByConfigEndpoint;&#xa;__rtBaseUrl = _rtBaseUrl;'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="319"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry
          x="-166.25"
          y="-940"
          width="168"
          height="80"
          as="geometry"
        />
      </mxCell>
    </object>
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
      id="320"
    >
      <mxCell
        style="scriptNode;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry
          x="-166.25"
          y="-1340"
          width="168"
          height="80"
          as="geometry"
        />
      </mxCell>
    </object>
    <mxCell
      id="321"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="332"
      target="320"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="-82.25" y="-1420" as="sourcePoint" />
        <mxPoint x="-82.25" y="-1180" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="ff4d0c4c-7a8e-4c7d-a7ee-cca186ea2873"
      LibraryVersion="null"
      SupportedLanguages=""
      id="322"
    >
      <mxCell style="globalLibraryNode;" parent="baselayer" vertex="1">
        <mxGeometry x="-500" y="-1610" width="180" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_1_globalConfig" id="323">
      <mxCell style="globalLibraryInnerNode;" parent="322" vertex="1">
        <mxGeometry x="10" y="16" width="160" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="92f0ecdb-bdb1-4c76-bce5-0f2a822379da"
      LibraryVersion="null"
      SupportedLanguages=""
      id="324"
    >
      <mxCell style="globalLibraryNode;" parent="baselayer" vertex="1">
        <mxGeometry x="-500" y="-1520" width="180" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_2_runtime" id="325">
      <mxCell style="globalLibraryInnerNode;" parent="324" vertex="1">
        <mxGeometry x="10" y="16" width="160" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="dbb79182-33e8-4733-b4a4-f735d07e7bc9"
      LibraryVersion="null"
      SupportedLanguages=""
      id="326"
    >
      <mxCell style="globalLibraryNode;" parent="baselayer" vertex="1">
        <mxGeometry x="-500" y="-1430" width="180" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_3_vocallsEnv" id="327">
      <mxCell style="globalLibraryInnerNode;" parent="326" vertex="1">
        <mxGeometry x="10" y="16" width="160" height="34" as="geometry" />
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
      id="328"
    >
      <mxCell
        style="component3Node;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry
          x="-159.74999999999994"
          y="-1180"
          width="155"
          height="131"
          as="geometry"
        />
      </mxCell>
    </object>
    <object label="nalOktaAuth" id="329">
      <mxCell style="componentInnerNode" parent="328" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <object
      label='&lt;font color="#333333"&gt;&lt;span style="font-weight: normal"&gt;getTokenFailure&lt;br&gt;&lt;/span&gt;&lt;/font&gt;'
      ComponentId="23"
      SubType="transient"
      Kind="output"
      id="330"
    >
      <mxCell style="component3OutputNode" parent="328" vertex="1">
        <mxGeometry x="10" y="61" width="135" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label='&lt;font color="#333333"&gt;&lt;span style="font-weight: normal"&gt;getTokenSuccess&lt;br&gt;&lt;/span&gt;&lt;/font&gt;'
      ComponentId="17"
      SubType="transient"
      Kind="output"
      id="331"
    >
      <mxCell style="component3OutputNode" parent="328" vertex="1">
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
      id="332"
    >
      <mxCell
        style="component3Node;strokeColor=#999999;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry
          x="-159.74999999999994"
          y="-1480"
          width="155"
          height="60"
          as="geometry"
        />
      </mxCell>
    </object>
    <object label="getEnvironment" id="333">
      <mxCell style="componentInnerNode" parent="332" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="34" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="334"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="330"
      target="319"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="335"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="331"
      target="319"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="-82.25" y="-689" as="sourcePoint" />
        <mxPoint x="-81.75" y="-330" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label=""
      Type="redirect"
      OnEnter=""
      OnLeave=""
      Destination="line:nestedlineguard"
      MaxEntryCount=""
      MaxEntryNodeId=""
      Parameters="X-Vocalls-Party2-Endpoint:{__currentGuardPhone};diversion:{__diversion};"
      SuccessCondition_nl=""
      MessageText_nl=""
      ResultVariableName="__transferResult"
      TransferType="attend"
      SuccessCondition=""
      MessageText=""
      MessageCache="true"
      MessageVoice=""
      MessageLanguage=""
      id="338"
    >
      <mxCell
        style="redirectChatNode;strokeColor=#D1B73D;"
        parent="baselayer"
        vertex="1"
      >
        <mxGeometry
          x="-285"
          y="615.9999999999999"
          width="160"
          height="120"
          as="geometry"
        />
      </mxCell>
    </object>
    <object id="339">
      <mxCell style="redirectInnerNode" parent="338" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="not accepted" DynamicNextId="" SubType="default" id="340">
      <mxCell style="defaultNode" parent="338" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="341"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="340"
      target="150"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
  </root>
</mxGraphModel>;
