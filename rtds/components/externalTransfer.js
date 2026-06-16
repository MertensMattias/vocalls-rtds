<mxGraphModel
  dx="4009"
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
      Code="__rtParams = {};&#xa;__redirectTry = 0;&#xa;__redirectResult = null;&#xa;__redirectStatus = [];&#xa;/**&#xa; * Replaces the last &#39;-&#39;-separated segment of context.currentNode.id with the supplied nodeId.&#xa; * Returns the original nodeId untouched when context.currentNode.id is not set.&#xa; *&#xa; * @param {string|number} nodeId - The short id to splice into the current node path.&#xa; * @returns {string} The fully-qualified node id, or the original nodeId if no path is set.&#xa; */&#xa;__makeLocalNodeId = function (nodeId) {&#xa;    if (nodeId !== null &amp;&amp; nodeId !== undefined) nodeId = nodeId.toString();&#xa;    if (!context.currentNode.id) return nodeId;&#xa;    var __separator = &#39;-&#39;;&#xa;    var __output = context.currentNode.id.split(__separator);&#xa;    __output[__output.length - 1] = nodeId;&#xa;    return __output.join(__separator);&#xa;};&#xa;&#xa;/**&#xa; * Normalises operation config: JSON string -&gt; parsed; { Params: {...} } -&gt; Params; flat object -&gt; itself; null -&gt; {}.&#xa; *&#xa; * @param {string|object} config - Raw operation config.&#xa; * @returns {object} Flat Params object, never null.&#xa; */&#xa;__extractParams = function (config) {&#xa;    var __parsed = typeof config === &#39;string&#39; ? JSON.parse(config) : config;&#xa;    if (__parsed &amp;&amp; typeof __parsed.params === &#39;object&#39; &amp;&amp; __parsed.params !== null) return __parsed.params;&#xa;    return __parsed || {};&#xa;};&#xa;&#xa;/**&#xa; * Component-local alias for the global activeFlag() (rtds_3_vocallsEnv.js) --&#xa; * the single Active-coercion contract. See conventions/params.md.&#xa; *&#xa; * @param {*} value&#xa; * @returns {boolean}&#xa; */&#xa;__activeFlag = function (value) {&#xa;    return activeFlag(value);&#xa;};&#xa;&#xa;/**&#xa; * Resolves Params into a flat { Key: value } map. The value&#39;s TYPE is whatever&#xa; * the JSON wrote -- no Number coercion (&#39;4&#39; stays a string, 4 stays a number).&#xa; * Per key: array-form [value, ...flags] is unwrapped to its first element&#xa; * (matches the runtime twin getParam; GUI flags isDisplayed/isEditable are&#xa; * runtime-irrelevant). Active is then coerced to a real boolean via __activeFlag.&#xa; * Every other STRING value is trimmed and has ${name} placeholders resolved via&#xa; * resolveConfigTokens (varObj first, then global; bare names only; String.replace,&#xa; * never new Function -- the Vocalls runtime disables string-eval). Non-strings pass&#xa; * through with their type intact. Unresolved placeholders are left raw and warned.&#xa; * Active absent: not defaulted here -- the read site decides (SetVariables true,&#xa; * Send and guard default false).&#xa; *&#xa; * @param {string|object} config - Raw operation config (see __extractParams).&#xa; * @returns {object} Map of Key -&gt; resolved value (no __rt prefix; v2 shape).&#xa; */&#xa;__setupConfig = function (config) {&#xa;    var __params = __extractParams(config);&#xa;    var __result = {};&#xa;    var __keys = Object.keys(__params);&#xa;    for (var __i = 0; __i &lt; __keys.length; __i++) {&#xa;        var __key = __keys[__i];&#xa;        var __value = __params[__key];&#xa;        if (Array.isArray(__value)) __value = __value.length ? __value[0] : &#39;&#39;;&#xa;        if (__key === &#39;active&#39;) { __result.active = __activeFlag(__value); continue; }&#xa;        if (typeof __value === &#39;string&#39;) __value = resolveConfigTokens(__value.trim(), __key);&#xa;        __result[__key] = __value;&#xa;    }&#xa;    return __result;&#xa;};&#xa;&#xa;// --- v2 object-access helpers ---&#xa;// Declared with `typeof &lt;name&gt; === &#39;undefined&#39;` guards so they fall back to local definitions&#xa;// when rtds_globalCodeAndHelpers.js has not yet been updated to expose them.&#xa;&#xa;if (typeof getValue === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Returns the value of `key` from `obj`, or `defaultValue` if the key is absent.&#xa;     * Case-insensitive lookup: matches whichever own property name lowercases to the same string.&#xa;     * Mirrors the PureConnect GetAt(values, Find(names, key, 0)) idiom with a default fallback.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getValue = function (obj, key, defaultValue) {&#xa;        if (!obj || !key) return defaultValue;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return obj[__propertyName];&#xa;            }&#xa;        }&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof hasKey === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Case-insensitive existence check. Returns true when any own property of `obj` lowercases to the same string as `key`.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {string} key&#xa;     * @returns {boolean}&#xa;     */&#xa;    hasKey = function (obj, key) {&#xa;        if (!obj || !key) return false;&#xa;        var __lowerKey = String(key).toLowerCase();&#xa;        for (var __propertyName in obj) {&#xa;            if (obj.hasOwnProperty(__propertyName) &amp;&amp; String(__propertyName).toLowerCase() === __lowerKey) {&#xa;                return true;&#xa;            }&#xa;        }&#xa;        return false;&#xa;    };&#xa;}&#xa;&#xa;if (typeof walk === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Iterates own properties of `obj`, calling fn(key, value) for each.&#xa;     * Returning false from fn stops the walk.&#xa;     *&#xa;     * @param {object} obj&#xa;     * @param {function} fn&#xa;     * @returns {void}&#xa;     */&#xa;    walk = function (obj, fn) {&#xa;        if (!obj) return;&#xa;        for (var __key in obj) {&#xa;            if (!obj.hasOwnProperty(__key)) continue;&#xa;            if (fn(__key, obj[__key]) === false) return;&#xa;        }&#xa;    };&#xa;}&#xa;&#xa;if (typeof getScoped === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Reads operator data with the RTDS scope contract: varObj[key]&#xa;     * (case-insensitive) first, then exact-case global[key], then defaultValue.&#xa;     * See conventions/storage.md.&#xa;     *&#xa;     * @param {string} key&#xa;     * @param {*} [defaultValue]&#xa;     * @returns {*}&#xa;     */&#xa;    getScoped = function (key, defaultValue) {&#xa;        if (defaultValue === undefined) defaultValue = null;&#xa;        if (!key) return defaultValue;&#xa;        var __vo = (typeof varObj !== &#39;undefined&#39;) ? varObj : null;&#xa;        if (__vo &amp;&amp; hasKey(__vo, key)) return getValue(__vo, key, defaultValue);&#xa;        var __scope = (typeof global !== &#39;undefined&#39;) ? global : ((typeof globalThis !== &#39;undefined&#39;) ? globalThis : null);&#xa;        if (__scope &amp;&amp; __scope[key] !== undefined &amp;&amp; __scope[key] !== null) return __scope[key];&#xa;        return defaultValue;&#xa;    };&#xa;}&#xa;&#xa;if (typeof resolveConfigTokens === &#39;undefined&#39;) {&#xa;    /**&#xa;     * Substitutes ${name} placeholders in a string via getScoped (varObj first,&#xa;     * then global). Bare identifiers only (${w+}); no expressions. A placeholder&#xa;     * that resolves nowhere is left raw and a warn is logged (never silent &#39;&#39;).&#xa;     * String.replace only -- the Vocalls runtime disables string-eval.&#xa;     *&#xa;     * @param {string} raw&#xa;     * @param {string} keyName&#xa;     * @returns {string}&#xa;     */&#xa;    resolveConfigTokens = function (raw, keyName) {&#xa;        if (typeof raw !== &#39;string&#39; || raw.indexOf(&#39;${&#39;) === -1) return raw;&#xa;        var __MISSING = &#39; __rtUnresolved &#39;;&#xa;        return raw.replace(/\$\{([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\}/g, function (__match, __path) {&#xa;            var __parts = __path.split(&#39;.&#39;);&#xa;            var __sub = getScoped(__parts[0], __MISSING);&#xa;            if (__sub !== __MISSING) {&#xa;                for (var __i = 1; __i &lt; __parts.length; __i++) {&#xa;                    if (__sub !== null &amp;&amp; __sub !== undefined &amp;&amp; __sub[__parts[__i]] !== undefined) { __sub = __sub[__parts[__i]]; } else { __sub = __MISSING; break; }&#xa;                }&#xa;            }&#xa;            if (__sub !== __MISSING) return String(__sub);&#xa;            Logger.warn(&#39;[resolveConfigTokens] unresolved placeholder&#39;, { key: keyName, placeholder: __path });&#xa;            return __match;&#xa;        });&#xa;    };&#xa;}&#xa;&#xa;&#xa;&#xa;// --- operation-specific helper ---&#xa;&#xa;/**&#xa; * Appends a P-Asserted-Identity SIP header to a semicolon-delimited transfer&#xa; * parameters string when outboundAni holds a plausible phone number. The CLI is&#xa; * normalised (spaces/dashes/parens/dots stripped, leading 00 rewritten as +) and&#xa; * accepted as E.164 or bare national (7-15 digits). Empty or invalid CLI leaves&#xa; * params untouched. A trailing &#39;;&#39; separator is preserved/added so the resulting&#xa; * string stays well-formed.&#xa; *&#xa; * @param {string} params - The existing semicolon-delimited Header:value; string.&#xa; * @param {string} outboundAni - The calling-party number (CLI) to assert; may be empty.&#xa; * @returns {string} params with a P-Asserted-Identity header appended, or params unchanged.&#xa; */&#xa;__appendPAssertedIdentity = function (params, outboundAni) {&#xa;    if (outboundAni == null || outboundAni === &#39;&#39;) return params;&#xa;    var __normalized = String(outboundAni).replace(/[\s\-().]/g, &#39;&#39;);&#xa;    if (__normalized.indexOf(&#39;00&#39;) === 0) __normalized = &#39;+&#39; + __normalized.slice(2);&#xa;    var __intl = /^\+[1-9]\d{6,14}$/;&#xa;    var __national = /^[1-9]\d{6,14}$/;&#xa;    if (!__intl.test(__normalized) &amp;&amp; !__national.test(__normalized)) return params;&#xa;    var __prefix = (params &amp;&amp; params.charAt(params.length - 1) !== &#39;;&#39;) ? params + &#39;;&#39; : (params || &#39;&#39;);&#xa;    return __prefix + &#39;P-Asserted-Identity:&#39; + __normalized + &#39;;&#39;;&#xa;};"
      Extensions=""
      BackgroundNoise="true"
      BreathInEffect="true"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch (Belgium)&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-BE&#39;,&#39;ttsVoiceName&#39;:&#39;&#39;,&#39;ttsEngine&#39;:&#39;&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:true,&#39;prosodyContourEnabled&#39;:false}}"
      Variables='__configJSON = {&#xa;    "active": true,&#xa;    "phoneNumber": "${RTDS_SchedulerExternalNumber}",&#xa;    "outboundANI": "",&#xa;    "parameters": "",&#xa;    "attendTransfer": false,&#xa;    "timeout": 30,&#xa;    "nextStep_Failure": "00099",&#xa;    "nextStep": "00012"&#xa;};&#xa;__environment = environment;&#xa;__rtOutcome = &#39;nextStep&#39;;&#xa;__rtNextStep &amp;= _rtNextStep;'
      PropertiesDefinition='[&#xa;    {&#xa;        "name": "__configJSON",&#xa;        "title": "Operation config (JSON)",&#xa;        "hint": "Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "maxLength": 5000,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    },&#xa;    {&#xa;        "name": "__environment",&#xa;        "title": "Environment",&#xa;        "hint": "Deployment environment. Controls which RTDS API endpoint is called.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "defaultValue": "environment",&#xa;            "maxLength": 100,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    },&#xa;    {&#xa;        "name": "__nextStep",&#xa;        "title": "Next step (output variable name)",&#xa;        "hint": "Name of the session variable that will receive the next step Id after execution.",&#xa;        "controlSettings": {&#xa;            "controlType": "text",&#xa;            "defaultValue": "_rtNextStep",&#xa;            "maxLength": 100,&#xa;            "dataType": "string",&#xa;            "readonly": false&#xa;        }&#xa;    }&#xa;]'
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      Translations=""
      ManualId=""
      RequiredVariables=""
      HintGrammar=""
      LastLanguage="default"
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
      Code="__rtOutcome = &#39;nextStep&#39;;&#xa;&#xa;__doTransfer = false;&#xa;__attendTransfer = false;&#xa;__transferDest = &#39;&#39;;&#xa;__transferParams = &#39;&#39;;&#xa;__outboundAni = &#39;&#39;;&#xa;__transferTimeout = 30;&#xa;__rtParams = __setupConfig(__configJSON);&#xa;&#xa;Logger.debug(&#39;[externalTransfer] config resolved&#39;, { params: __rtParams, outcome: __rtOutcome });"
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
      Code="if (!getValue(__rtParams, &#39;active&#39;, true)) {&#xa;    Logger.info(&#39;[externalTransfer] skipped -- inactive&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;__transferDest = getValue(__rtParams, &#39;phoneNumber&#39;, &#39;&#39;);&#xa;if (!__transferDest) {&#xa;    Logger.warn(&#39;[externalTransfer] missing destination&#39;, { outcome: __rtOutcome });&#xa;    return;&#xa;}&#xa;&#xa;__transferParams = getValue(__rtParams, &#39;parameters&#39;, &#39;&#39;);&#xa;__outboundAni = getValue(__rtParams, &#39;outboundAni&#39;, &#39;&#39;);&#xa;__transferParams = __appendPAssertedIdentity(__transferParams, __outboundAni);&#xa;__transferTimeout = getValue(__rtParams, &#39;timeout&#39;, 30);&#xa;&#xa;var __attend = getValue(__rtParams, &#39;attendTransfer&#39;, false);&#xa;__attendTransfer = (__attend === true || __attend === &#39;true&#39; || __attend === 1 || __attend === &#39;1&#39;);&#xa;&#xa;__rtOutcome = &#39;nextStep_Failure&#39;;&#xa;__doTransfer = true;&#xa;Logger.info(&#39;[externalTransfer] transferring&#39;, { to: __transferDest, attend: __attendTransfer, hasParams: __transferParams !== &#39;&#39;, hasAni: __outboundAni !== &#39;&#39;, timeout: __transferTimeout, outcome: __rtOutcome });"
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
      OnEnter="_rtNextStep = getValue(__rtParams, __rtOutcome, &#39;&#39;);&#xa;Logger.info(&#39;[externalTransfer] exit&#39;, { outcome: __rtOutcome, nextStep: _rtNextStep });"
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
        <mxGeometry x="252.5" y="1440" width="130" height="40" as="geometry" />
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
      id="100"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="29"
      target="110"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="140"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="146"
      target="120"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="141"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="148"
      target="130"
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
      Code='__redirectTry = __redirectTry + 1;
&#xa;__redirectStatus[__redirectTry] = "calling";'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="146"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="864" y="400" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='__redirectTry = __redirectTry + 1;
&#xa;__redirectStatus[__redirectTry] = "calling";'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="148"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="500" y="400" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="150"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="152"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <mxCell
      id="144"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="151"
      target="6"
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
      Code='__redirectStatus[__redirectTry] = "executed";
&#xa;
&#xa;if (__redirectResult.Details.ClientSpecific.Party2.Status == 4) {
&#xa;    __redirectStatus[__redirectTry] = "no_reaction";
&#xa;} else if (__redirectResult.Details.ClientSpecific.Party2.Status == 1) {
&#xa;    __redirectStatus[__redirectTry] = "rejected";
&#xa;} else if (__redirectResult.Details.ClientSpecific.Party2.Status == 0) {
&#xa;    __redirectStatus[__redirectTry] = "rejected_voicebox";
&#xa;} else {
&#xa;    __redirectStatus[__redirectTry] = "unknown_reason_rejected";
&#xa;}
&#xa;log_debug("Status[" + __redirectTry + "]: " + __redirectResult.Details.ClientSpecific.Party2.Status);
&#xa;log_debug("Reason[" + __redirectTry + "]: " + __redirectStatus[__redirectTry]);'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="152"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="864" y="760" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="log_debug(&#39;message&#39;);"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="151"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="500" y="760" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="redirect"
      OnEnter=""
      OnLeave=""
      Destination="{__transferDest}"
      Parameters="{__transferParams}"
      TransferType="blind"
      ResultVariableName="__transferResult"
      MaxEntryCount=""
      MaxEntryNodeId=""
      SuccessCondition_nl=""
      MessageText_nl=""
      SuccessCondition=""
      MessageText=""
      MessageCache="true"
      MessageVoice=""
      MessageLanguage=""
      id="130"
    >
      <mxCell style="redirectNode" parent="baselayer" vertex="1">
        <mxGeometry x="504" y="570" width="160" height="120" as="geometry" />
      </mxCell>
    </object>
    <object id="131">
      <mxCell style="redirectInnerNode" parent="130" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="not accepted" SubType="default" DynamicNextId="" id="132">
      <mxCell style="defaultNode" parent="130" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="154"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="132"
      target="151"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="584" y="656" as="sourcePoint" />
        <mxPoint x="267.5" y="1440" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label=""
      Type="case"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      id="110"
    >
      <mxCell style="caseNode" parent="baselayer" vertex="1">
        <mxGeometry x="149.5" y="110" width="336" height="156" as="geometry" />
      </mxCell>
    </object>
    <object id="111">
      <mxCell style="caseInnerNode" parent="110" vertex="1">
        <mxGeometry x="10" y="16" width="316" height="40" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__doTransfer == true &amp;amp;&amp;amp; getValue(__rtParams, &#39;attendTransfer&#39;, false)"
      SubType="expression"
      Expression="__doTransfer == true &amp;&amp; getValue(__rtParams, &#39;attendTransfer&#39;, false)"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="112"
    >
      <mxCell style="expressionNode" parent="110" vertex="1">
        <mxGeometry x="10" y="56" width="316" height="30" as="geometry" />
      </mxCell>
    </object>
    <object
      label="__doTransfer == true"
      SubType="expression"
      Expression="__doTransfer == true"
      DynamicNextId=""
      DynamicNextTabGuid=""
      id="113"
    >
      <mxCell style="expressionNode" parent="110" vertex="1">
        <mxGeometry x="10" y="86" width="316" height="30" as="geometry" />
      </mxCell>
    </object>
    <object label="skip" SubType="default" DynamicNextId="" id="114">
      <mxCell style="defaultNode" parent="110" vertex="1">
        <mxGeometry x="10" y="116" width="316" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="147"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="112"
      target="146"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="476" y="191" as="sourcePoint" />
        <mxPoint x="930" y="380" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="149"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="113"
      target="148"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="476" y="221" as="sourcePoint" />
        <mxPoint x="670" y="380" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="145"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="114"
      target="6"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label=""
      Type="redirect"
      OnEnter=""
      OnLeave=""
      Destination="{__transferDest}"
      Parameters="{__transferParams}"
      TransferType="attend"
      ResultVariableName="__redirectResult"
      MaxEntryCount=""
      MaxEntryNodeId=""
      SuccessCondition_nl=""
      MessageText_nl=""
      SuccessCondition=""
      MessageText=""
      MessageCache="true"
      MessageVoice=""
      MessageLanguage=""
      id="120"
    >
      <mxCell style="redirectNode" parent="baselayer" vertex="1">
        <mxGeometry x="868" y="570" width="160" height="120" as="geometry" />
      </mxCell>
    </object>
    <object id="121">
      <mxCell style="redirectInnerNode" parent="120" vertex="1">
        <mxGeometry x="10" y="16" width="140" height="40" as="geometry" />
      </mxCell>
    </object>
    <object label="not accepted" SubType="default" DynamicNextId="" id="122">
      <mxCell style="defaultNode" parent="120" vertex="1">
        <mxGeometry x="10" y="56" width="140" height="30" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="153"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="122"
      target="152"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="948" y="646" as="sourcePoint" />
        <mxPoint x="317.5" y="1440" as="targetPoint" />
      </mxGeometry>
    </mxCell>
  </root>
</mxGraphModel>;
