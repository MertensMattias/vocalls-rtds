<mxGraphModel
  dx="4933"
  dy="3402"
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
      Code='// ---------------------------------------------------------------------------&#xa;// RTDS Runtime — Vocalls Script node&#xa;// ---------------------------------------------------------------------------&#xa;&#xa;&#xa;RTDS_OPERATIONS = new Map([&#xa;    [&#39;SetAttributes&#39;, executeSetAttributes]&#xa;    // Future: [&#39;Emergency&#39;, executeEmergency], [&#39;Schedule&#39;, executeSchedule], ...&#xa;]);&#xa;&#xa;// GUI-exit types: write params to session, return exit key string to Vocalls.&#xa;RTDS_EXIT_KEYS = new Map([&#xa;    [&#39;WorkgroupTransfer&#39;, &#39;workgroup_transfer&#39;],&#xa;    [&#39;ExternalTransfer&#39;, &#39;external_transfer&#39;],&#xa;    [&#39;Menu&#39;, &#39;menu&#39;],&#xa;    [&#39;LanguageMenu&#39;, &#39;language_menu&#39;],&#xa;    [&#39;PlayPrompt&#39;, &#39;play_prompt&#39;],&#xa;    [&#39;PlayAudio&#39;, &#39;play_audio&#39;],&#xa;    [&#39;Disconnect&#39;, &#39;disconnect&#39;],&#xa;    [&#39;GuardRouting&#39;, &#39;guard_routing&#39;],&#xa;    [&#39;GuardTUI&#39;, &#39;guard_tui&#39;],&#xa;    [&#39;Callback&#39;, &#39;callback&#39;],&#xa;    [&#39;SendSMS&#39;, &#39;send_sms&#39;],&#xa;    [&#39;SendEmail&#39;, &#39;send_email&#39;]&#xa;]);&#xa;&#xa;// Prefix written to session before every GUI handoff.&#xa;OP_VAR_PREFIX = &#39;RTDS_OP_&#39;;&#xa;&#xa;&#xa;// ---------------------------------------------------------------------------&#xa;// 1. buildOpIndex(operations)&#xa;//    Turns the Operations array into a Map keyed by Id so any&#xa;//    operation can be looked up in O(1) by its Id string.&#xa;// ---------------------------------------------------------------------------&#xa;&#xa;function buildOpIndex(operations) {&#xa;    var index = new Map();&#xa;    for (var i = 0; i &lt; operations.length; i++) {&#xa;        var op = operations[i];&#xa;        if (!op.Id) {&#xa;            log_error(`[RTDS] buildOpIndex: operation at index ${i} has no Id — skipped`);&#xa;            continue;&#xa;        }&#xa;        index.set(op.Id, op);&#xa;    }&#xa;    return index;&#xa;}&#xa;&#xa;&#xa;// ---------------------------------------------------------------------------&#xa;// 2. parseFlow(json)&#xa;//    Validates and splits the API response.&#xa;//    Writes header fields and the opIndex into context.session.variables.&#xa;//    Returns the firstOp object, or null on error.&#xa;// ---------------------------------------------------------------------------&#xa;&#xa;function parseFlow(json) {&#xa;    if (!json || typeof json !== &#39;object&#39;) {&#xa;        log_error(&#39;[RTDS] parseFlow: json is null or not an object&#39;);&#xa;        context.session.variables.RTDS_error = &#39;RTDS_PARSE_ERROR&#39;;&#xa;        return null;&#xa;    }&#xa;&#xa;    if (!Array.isArray(json.Operations) || json.Operations.length === 0) {&#xa;        log_error(&#39;[RTDS] parseFlow: Operations array is missing or empty&#39;);&#xa;        context.session.variables.RTDS_error = &#39;RTDS_PARSE_ERROR&#39;;&#xa;        return null;&#xa;    }&#xa;&#xa;    // Store header fields individually — plain strings, safe across nodes.&#xa;    context.session.variables.RTDS_sourceId = json.SourceId;&#xa;    context.session.variables.RTDS_name = json.Name;&#xa;    context.session.variables.RTDS_project = json.Project;&#xa;    context.session.variables.RTDS_promptLibrary = json.PromptLibrary;&#xa;    context.session.variables.RTDS_supportedLanguages = json.SupportedLanguages;&#xa;&#xa;    // Build and store the operation index.&#xa;    var opIndex = buildOpIndex(json.Operations);&#xa;    context.session.variables.RTDS_opIndex = opIndex;&#xa;&#xa;    // Find and return the first operation.&#xa;    var firstOp = getFirstOperation(json.Operations);&#xa;    if (!firstOp) {&#xa;        context.session.variables.RTDS_error = &#39;RTDS_NO_ENTRY_POINT&#39;;&#xa;        return null;&#xa;    }&#xa;&#xa;    log_debug(&#39;[RTDS] Flow parsed. SourceId=&#39; + json.SourceId + &#39; EntryPoint=&#39; + firstOp.Id + &#39; (&#39; + firstOp.Name + &#39;)&#39;);&#xa;    return firstOp;&#xa;}&#xa;&#xa;&#xa;// ---------------------------------------------------------------------------&#xa;// 3. getFirstOperation(operations)&#xa;//    Returns the entry-point operation from the Operations array.&#xa;//    If multiple have IsFirstOperation === true, returns the one with the&#xa;//    lexicographically lowest Id (zero-padded IDs sort correctly this way).&#xa;// ---------------------------------------------------------------------------&#xa;&#xa;function getFirstOperation(operations) {&#xa;    var candidates = [];&#xa;&#xa;    for (var i = 0; i &lt; operations.length; i++) {&#xa;        if (operations[i].IsFirstOperation === true) {&#xa;            candidates.push(operations[i]);&#xa;        }&#xa;    }&#xa;&#xa;    if (candidates.length === 0) {&#xa;        log_error(&#39;[RTDS] getFirstOperation: no operation has IsFirstOperation === true&#39;);&#xa;        return null;&#xa;    }&#xa;&#xa;    // Sort lexicographically by Id — safe for zero-padded numeric strings.&#xa;    candidates.sort(function (a, b) {&#xa;        if (a.Id &lt; b.Id) return -1;&#xa;        if (a.Id &gt; b.Id) return 1;&#xa;        return 0;&#xa;    });&#xa;&#xa;    return candidates[0];&#xa;}&#xa;&#xa;&#xa;// ---------------------------------------------------------------------------&#xa;// 4. getParam(op, name, fallback)&#xa;//    Reads a typed param value from op.Params, unwrapping the array form&#xa;//    [value, ...flags]. Flags (isDisplayed, isEditable) are GUI-builder&#xa;//    metadata and are ignored at runtime — only v[0] is used.&#xa;//    Type is preserved as-is (number stays number, string stays string).&#xa;// ---------------------------------------------------------------------------&#xa;&#xa;function getParam(op, name, fallback) {&#xa;    if (fallback === undefined) { fallback = null; }&#xa;    if (!op.Params) { return fallback; }&#xa;&#xa;    var raw = op.Params[name];&#xa;    if (raw === undefined || raw === null) { return fallback; }&#xa;&#xa;    // Unwrap array form [value, ...flags].&#xa;    var value = Array.isArray(raw) ? raw[0] : raw;&#xa;&#xa;    // Preserve the native type: number, boolean, or string.&#xa;    // Matches the __getValue + transformation pattern — no coercion needed&#xa;    // when the JSON already carries the correct type.&#xa;    if (typeof value === &#39;number&#39;) { return value; }&#xa;    if (typeof value === &#39;boolean&#39;) { return value; }&#xa;    if (value === &#39;&#39; || value === null || value === undefined) { return fallback; }&#xa;    return value;&#xa;}&#xa;&#xa;&#xa;// ---------------------------------------------------------------------------&#xa;// 4a. setGlobal(name, value)&#xa;//     Writes a resolved param value directly to global[name].&#xa;//     Type is whatever JSON.parse produced — no coercion applied.&#xa;// ---------------------------------------------------------------------------&#xa;&#xa;function setGlobal(name, value) {&#xa;    if (value === null || value === undefined) { return; }&#xa;    global[name] = value;&#xa;}&#xa;&#xa;&#xa;// ---------------------------------------------------------------------------&#xa;// 5. resolveTokens(value)&#xa;//    Replaces $(ATTR_NAME) tokens in a string with the current value.&#xa;//    Lookup order: context.session.variables first, then global directly.&#xa;//    Non-string values pass through unchanged.&#xa;// ---------------------------------------------------------------------------&#xa;&#xa;function resolveTokens(value) {&#xa;    if (typeof value !== &#39;string&#39;) { return value; }&#xa;&#xa;    return value.replace(/\$\(([^)]+)\)/g, function (match, name) {&#xa;        // Check engine / session scope first (RTDS_ keys and any session-level vars).&#xa;        var sessionVal = context.session.variables[name];&#xa;        if (sessionVal !== undefined &amp;&amp; sessionVal !== null) {&#xa;            return String(sessionVal);&#xa;        }&#xa;        // Fall back to global scope.&#xa;        var globalVal = global[name];&#xa;        if (globalVal !== undefined &amp;&amp; globalVal !== null) {&#xa;            return String(globalVal);&#xa;        }&#xa;        return &#39;&#39;;&#xa;    });&#xa;}&#xa;&#xa;&#xa;// ---------------------------------------------------------------------------&#xa;// 6. resolveNextStep(op, resultKey)&#xa;//    Returns the next operation Id string.&#xa;//    Checks resultKey param first (e.g. "NextStep_Open"), falls back to "NextStep".&#xa;//    Returns null if neither is present.&#xa;// ---------------------------------------------------------------------------&#xa;&#xa;function resolveNextStep(op, resultKey) {&#xa;    if (resultKey) {&#xa;        var specific = getParam(op, resultKey, null);&#xa;        if (specific) { return String(specific); }&#xa;    }&#xa;&#xa;    var fallback = getParam(op, &#39;NextStep&#39;, null);&#xa;    if (fallback) { return String(fallback); }&#xa;&#xa;    return null;&#xa;}&#xa;&#xa;&#xa;// ---------------------------------------------------------------------------&#xa;// 7. executeSetAttributes(op)&#xa;//    Writes Params into global via setGlobal (operational scope).&#xa;//    Handles LogAttributes as a log side-effect (not stored).&#xa;//    NextStep is never stored — it controls flow only.&#xa;//    Returns { nextStepId }.&#xa;// ---------------------------------------------------------------------------&#xa;&#xa;function executeSetAttributes(op) {&#xa;    var params = op.Params;&#xa;    if (!params) {&#xa;        return { nextStepId: null };&#xa;    }&#xa;&#xa;    var keys = Object.keys(params);&#xa;    for (var i = 0; i &lt; keys.length; i++) {&#xa;        var key = keys[i];&#xa;&#xa;        // Flow control only — not stored.&#xa;        if (key === &#39;NextStep&#39;) { continue; }&#xa;&#xa;        // LogAttributes: pipe-delimited list of attribute names to log.&#xa;        if (key === &#39;LogAttributes&#39;) {&#xa;            var attrNames = String(params[key]).split(&#39;|&#39;);&#xa;            var parts = [];&#xa;            for (var j = 0; j &lt; attrNames.length; j++) {&#xa;                var attrName = attrNames[j].replace(/^\s+|\s+$/g, &#39;&#39;); // trim&#xa;                if (attrName) {&#xa;                    // Check session scope first, fall back to global scope.&#xa;                    var attrVal = context.session.variables[attrName];&#xa;                    if (attrVal === undefined || attrVal === null) {&#xa;                        attrVal = global[attrName];&#xa;                    }&#xa;                    parts.push(attrName + &#39;=&#39; + (attrVal !== undefined &amp;&amp; attrVal !== null ? attrVal : &#39;&#39;));&#xa;                }&#xa;            }&#xa;            log_debug(&#39;[RTDS] LogAttributes: &#39; + parts.join(&#39; | &#39;));&#xa;            continue;&#xa;        }&#xa;&#xa;        // All other params: resolve tokens and write to operational scope.&#xa;        var value = resolveTokens(getParam(op, key, null));&#xa;        setGlobal(key, value);&#xa;    }&#xa;&#xa;    var nextStepId = resolveNextStep(op, null);&#xa;    log_debug(&#39;[RTDS] SetAttributes "&#39; + op.Name + &#39;" done. NextStep=&#39; + (nextStepId ? nextStepId : &#39;(none)&#39;));&#xa;    return { nextStepId: nextStepId };&#xa;}&#xa;&#xa;&#xa;// ---------------------------------------------------------------------------&#xa;// 8. prepareGuiHandoff(op)&#xa;//    Writes prefixed param values to context.session.variables before handing&#xa;//    off to a GUI node. The GUI node reads RTDS_OP_* to configure itself.&#xa;// ---------------------------------------------------------------------------&#xa;&#xa;function prepareGuiHandoff(op) {&#xa;    var params = op.Params;&#xa;    if (params) {&#xa;        var keys = Object.keys(params);&#xa;        for (var i = 0; i &lt; keys.length; i++) {&#xa;            var key = keys[i];&#xa;            var value = resolveTokens(getParam(op, key, null));&#xa;            context.session.variables[OP_VAR_PREFIX + key] = value;&#xa;        }&#xa;    }&#xa;&#xa;    context.session.variables.RTDS_currentOpId = op.Id;&#xa;    context.session.variables.RTDS_currentOpType = op.Type;&#xa;&#xa;    // Pre-populate RTDS_nextStepId with the default NextStep.&#xa;    // The GUI node overwrites this with its branching outcome.&#xa;    var defaultNext = resolveNextStep(op, null);&#xa;    if (defaultNext) {&#xa;        context.session.variables.RTDS_nextStepId = defaultNext;&#xa;    }&#xa;}&#xa;&#xa;&#xa;// ---------------------------------------------------------------------------&#xa;// 9. runStep(startOpId)&#xa;//    Core dispatch loop. Reads startOpId from context.session.variables.RTDS_opIndex.&#xa;//    Loops through JS-handled operations internally.&#xa;//    Returns an exit key string when a GUI-exit type is reached.&#xa;// ---------------------------------------------------------------------------&#xa;&#xa;function runStep(startOpId) {&#xa;    var opIndex = context.session.variables.RTDS_opIndex;&#xa;    var currentId = startOpId;&#xa;&#xa;    while (currentId) {&#xa;        var current = opIndex.get(currentId);&#xa;&#xa;        if (!current) {&#xa;            log_warn(`[RTDS] runStep: step "${currentId}" not found in opIndex`);&#xa;            context.session.variables.RTDS_error = &#39;Unknown step: &#39; + currentId;&#xa;            return &#39;disconnect&#39;;&#xa;        }&#xa;&#xa;        var type = current.Type;&#xa;        log_debug(`[RTDS] Step ${current.Id} | Type: ${type} | Name: ${current.Name}`);&#xa;&#xa;        // ---- JS-handled operation ----&#xa;        if (RTDS_OPERATIONS.has(type)) {&#xa;            var result;&#xa;            try {&#xa;                result = RTDS_OPERATIONS.get(type)(current);&#xa;            } catch (err) {&#xa;                log_error(`[RTDS] ERROR in ${type} step ${current.Id}: ${err.message}`);&#xa;                context.session.variables.RTDS_error = err.message;&#xa;                return &#39;disconnect&#39;;&#xa;            }&#xa;&#xa;            var nextStepId = result.nextStepId;&#xa;&#xa;            if (!nextStepId) {&#xa;                log_debug(`[RTDS] No NextStep after step ${current.Id} — end of flow.`);&#xa;                return &#39;disconnect&#39;;&#xa;            }&#xa;&#xa;            currentId = nextStepId;&#xa;            continue;&#xa;        }&#xa;&#xa;        // ---- GUI-exit operation ----&#xa;        if (RTDS_EXIT_KEYS.has(type)) {&#xa;            var exitKey = RTDS_EXIT_KEYS.get(type);&#xa;            prepareGuiHandoff(current);&#xa;            log_debug(`[RTDS] GUI handoff step ${current.Id} (${type}) -&gt; exit key: "${exitKey}"`);&#xa;            return exitKey;&#xa;        }&#xa;&#xa;        // ---- Unknown type ----&#xa;        log_warn(`[RTDS] Unhandled operation type "${type}" at step ${current.Id}`);&#xa;        context.session.variables.RTDS_error = &#39;Unhandled operation type: &#39; + type;&#xa;        return &#39;disconnect&#39;;&#xa;    }&#xa;&#xa;    return &#39;disconnect&#39;;&#xa;}&#xa;&#xa;&#xa;// ---------------------------------------------------------------------------&#xa;// 10. resumeFrom(nextStepId)&#xa;//     Re-entry point after a GUI node completes.&#xa;//     Reads RTDS_nextStepId from context.session.variables, then continues&#xa;//     the runStep loop. opIndex is already in context.session.variables.&#xa;// ---------------------------------------------------------------------------&#xa;&#xa;function resumeFrom(nextStepId) {&#xa;    if (!nextStepId) {&#xa;        log_warn(&#39;[RTDS] resumeFrom: no nextStepId — end of flow.&#39;);&#xa;        return &#39;disconnect&#39;;&#xa;    }&#xa;    return runStep(nextStepId);&#xa;}'
      Extensions=""
      BackgroundNoise="false"
      BreathInEffect="false"
      Languages="{&#39;nl&#39;:{&#39;isDefault&#39;:true,&#39;languageName&#39;:&#39;Dutch&#39;,&#39;ttsLanguageCode&#39;:&#39;nl-NL&#39;,&#39;ttsVoiceName&#39;:&#39;nl-NL-Luc&#39;,&#39;ttsEngine&#39;:&#39;ElevenLabs&#39;,&#39;ttsPitch&#39;:&#39;&#39;,&#39;ttsSpeed&#39;:&#39;&#39;,&#39;ttsVolume&#39;:&#39;&#39;,&#39;prosodyBaseEnabled&#39;:false,&#39;prosodyContourEnabled&#39;:false}}"
      Variables="varObj = {}; &#xa;callIdKey = &#39;&#39;; &#xa;environment = &#39;&#39;; &#xa;language = &#39;&#39;; &#xa;_headers = &#39;&#39;; &#xa;_baseUrl = &#39;https://api.n-allo.be&#39;; &#xa;_smsApi = `/smsapi-acc/api/Send`; &#xa;_mailApi = `/mailapi-acc}`; &#xa;_phonebookApi = `/phonebookapi-acc`; &#xa;_rtJson = {};&#xa;_rtConfig = {}; &#xa;_rtNextStep = {}; &#xa;result = null; &#xa;env = &#39;acc&#39;; &#xa;debug = true; &#xa;debugCall = true;"
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
    <object
      label=""
      Type="dial"
      OnEnter=""
      OnLeave=""
      MaxEntryCount=""
      MaxEntryNodeId=""
      DynamicNextId=""
      id="100"
    >
      <mxCell style="dialNode" parent="baselayer" vertex="1">
        <mxGeometry x="-17.5" y="-720" width="130" height="40" as="geometry" />
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
        <mxGeometry x="-18.5" y="150" width="130" height="80" as="geometry" />
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
        <mxGeometry x="-60.5" y="1380" width="214" height="80" as="geometry" />
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
        <mxGeometry x="-18.5" y="1570" width="130" height="40" as="geometry" />
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
        <mxGeometry x="-38" y="20" width="170" height="40" as="geometry" />
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
        <mxPoint x="65" y="440" as="sourcePoint" />
        <mxPoint x="65" y="520" as="targetPoint" />
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
        <mxGeometry x="-36.5" y="-150" width="168" height="80" as="geometry" />
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
        <mxPoint x="65" y="-419" as="sourcePoint" />
        <mxPoint x="65" y="-240" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="17"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;startArrow=oval;startFill=1;strokeColor=#000000;"
      parent="baselayer"
      source="27"
      target="9"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="35" y="-1500" as="sourcePoint" />
        <mxPoint x="35" y="-1120" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='log_debug(&#39;_nextStep: &#39; + _nextStep); &#xa; &#xa;Logger.warn("Logger DB write test", { &#xa;    testCase: "db_write_test", &#xa;    endpoint: "/test/logger" &#xa;});'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="21"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="-37" y="-290" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="18"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"
      parent="baselayer"
      source="229"
      target="100"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="47" y="-840" as="sourcePoint" />
      </mxGeometry>
    </mxCell>
    <object
      label="initializeCallFlowContext"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="Logger.info(&#39;Initializing...&#39;); &#xa;initializeCallFlowContext(&#39;full&#39;);&#xa;&#xa;Logger.info(&#39;varObj: &#39; + JSON.stringify(varObj));"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="30"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="-36" y="-1080" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="e6b2f2b8-690c-4712-a743-3a76dc5f34ec"
      LibraryVersion="null"
      SupportedLanguages=""
      id="13"
    >
      <mxCell style="globalLibraryNode" parent="baselayer" vertex="1">
        <mxGeometry x="-600" y="-1320" width="292" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_globalCodeAndHelpers" id="14">
      <mxCell style="globalLibraryInnerNode" parent="13" vertex="1">
        <mxGeometry x="10" y="16" width="272" height="34" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="globalLibrary"
      LibraryGuid="c66d4041-a9f8-4e12-b89d-097cb357f0a9"
      LibraryVersion="null"
      SupportedLanguages=""
      id="25"
    >
      <mxCell style="globalLibraryNode" parent="baselayer" vertex="1">
        <mxGeometry x="-598" y="-1210" width="290" height="60" as="geometry" />
      </mxCell>
    </object>
    <object label="rtds_globalConfig" id="26">
      <mxCell style="globalLibraryInnerNode" parent="25" vertex="1">
        <mxGeometry x="10" y="16" width="270" height="34" as="geometry" />
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
        <mxGeometry x="-18" y="-1550" width="130" height="40" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="126"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="100"
      target="230"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="47.5" y="-680" as="sourcePoint" />
        <mxPoint x="47.5" y="-600" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="208"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="206"
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
    <object
      label=""
      Type="component"
      ComponentGuid="38119415-36b0-4975-9885-d9620a4c1cad"
      ComponentVersion="4gQArUD0SbgTTXZUQutJBw=="
      SupportedLanguages=""
      __configJSON="params"
      __environment="environment"
      __nextStep="_nextStep"
      __outputVar="smsResult"
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition="&#39;[ \n    { \n        \&#39;name\&#39;: \&#39;__configJSON\&#39;, \n        \&#39;title\&#39;: \&#39;Operation config (JSON)\&#39;, \n        \&#39;hint\&#39;: \&#39;Full RTDS operation Params object as JSON. Must include all required Params fields for the operation type.\&#39;, \n        \&#39;controlSettings\&#39;: { \n            \&#39;controlType\&#39;: \&#39;text\&#39;, \n            \&#39;maxLength\&#39;: 5000, \n            \&#39;dataType\&#39;: \&#39;string\&#39;, \n            \&#39;readonly\&#39;: false \n        } \n    }, \n    { \n        \&#39;name\&#39;: \&#39;__environment\&#39;, \n        \&#39;title\&#39;: \&#39;Environment\&#39;, \n        \&#39;hint\&#39;: \&#39;Deployment environment. Controls which RTDS API endpoint is called.\&#39;, \n        \&#39;controlSettings\&#39;: { \n            \&#39;controlType\&#39;: \&#39;environment\&#39;, \n            \&#39;defaultValue\&#39;: \&#39;acc\&#39;, \n            \&#39;maxLength\&#39;: 100, \n            \&#39;dataType\&#39;: \&#39;string\&#39;, \n            \&#39;readonly\&#39;: false \n        } \n    }, \n    { \n        \&#39;name\&#39;: \&#39;__nextStep\&#39;, \n        \&#39;title\&#39;: \&#39;Next step (output variable name)\&#39;, \n        \&#39;hint\&#39;: \&#39;Name of the session variable that will receive the next step Id after execution. Defaults to _nextStep.\&#39;, \n        \&#39;controlSettings\&#39;: { \n            \&#39;controlType\&#39;: \&#39;text\&#39;, \n            \&#39;defaultValue\&#39;: \&#39;_nextStep\&#39;, \n            \&#39;maxLength\&#39;: 100, \n            \&#39;dataType\&#39;: \&#39;string\&#39;, \n            \&#39;readonly\&#39;: false \n        } \n    }, \n    { \n        \&#39;name\&#39;: \&#39;__outputVar\&#39;, \n        \&#39;title\&#39;: \&#39;Output variable name\&#39;, \n        \&#39;hint\&#39;: \&#39;Name of the session variable that will receive the result of this operation. Defaults to result.\&#39;, \n        \&#39;controlSettings\&#39;: { \n            \&#39;controlType\&#39;: \&#39;text\&#39;, \n            \&#39;defaultValue\&#39;: \&#39;result\&#39;, \n            \&#39;maxLength\&#39;: 100, \n            \&#39;dataType\&#39;: \&#39;string\&#39;, \n            \&#39;readonly\&#39;: false \n        } \n    } \n]&#39;"
      id="221"
    >
      <mxCell style="component3Node;" parent="baselayer" vertex="1">
        <mxGeometry x="710" y="-361" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="nallo-SMS copy" id="222">
      <mxCell style="componentInnerNode;" parent="221" vertex="1">
        <mxGeometry x="10" y="16" width="135" height="45" as="geometry" />
      </mxCell>
    </object>
    <object
      label=""
      Type="component"
      ComponentGuid="81fb8978-a0df-46ab-a315-5d7a1958a612"
      ComponentVersion="gd7wmrRH6HYHEA99XjkFNA=="
      SupportedLanguages=""
      __env="environment"
      __apiKey='""'
      __apiUrlSendSms="`https://smsapi-${__env}.n-allo.be/api/Send`"
      __rtActive="false"
      __rtSmsTo='"720535744"'
      __rtSmsRouting='""'
      __rtSmsFrom='""'
      __rtSmsBody='""'
      __rtSmsAccountId="-1"
      __rtConfigId="-1"
      __rtTimeout="10"
      __rtNextStep_Success="-1"
      __rtNextStep_Failure="-1"
      __rtNextStep="-1"
      __outputVar="_nextStep"
      __configJSON="params"
      SingleInput="0"
      SingleOutput="6"
      ManualId=""
      EnableUpdateRelations="true"
      AllowGlobalIntent="false"
      PropertiesDefinition=""
      id="206"
    >
      <mxCell style="component3Node" parent="baselayer" vertex="1">
        <mxGeometry x="-1080" y="-470" width="155" height="71" as="geometry" />
      </mxCell>
    </object>
    <object label="nallo-SMS" id="207">
      <mxCell style="componentInnerNode" parent="206" vertex="1">
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
      <mxCell style="component3Node" parent="baselayer" vertex="1">
        <mxGeometry
          x="-29.999999999999943"
          y="-1280"
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
      id="27"
    >
      <mxCell style="component3Node" parent="baselayer" vertex="1">
        <mxGeometry
          x="-29.999999999999943"
          y="-1440"
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
      id="59"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;"
      parent="baselayer"
      source="11"
      target="30"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <Array as="points">
          <mxPoint x="190" y="-1204" />
          <mxPoint x="190" y="-1040" />
        </Array>
      </mxGeometry>
    </mxCell>
    <mxCell
      id="31"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="12"
      target="30"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="47.5" y="-939" as="sourcePoint" />
        <mxPoint x="47.5" y="-600" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <mxCell
      id="228"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      parent="baselayer"
      source="236"
      target="229"
      edge="1"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="48" y="-1000" as="sourcePoint" />
        <mxPoint x="47" y="-920" as="targetPoint" />
      </mxGeometry>
    </mxCell>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="// ---------------------------------------------------------------------------
&#xa;// ENTRY POINT A — Initial call entry
&#xa;// ---------------------------------------------------------------------------
&#xa;context.session.variables.RTDS_sourceId = context.phone;
&#xa;
&#xa;log_debug(&#39;[RTDS] Entry Point A — sourceId=&#39; + context.session.variables.RTDS_sourceId);
&#xa;
&#xa;// return jsonHttpRequest(
&#xa;//     &#39;https://rtds-api.internal/api/routing-table/&#39; + context.session.variables.RTDS_sourceId,
&#xa;//     { method: &#39;GET&#39; }
&#xa;// ).then(function (response) {
&#xa;//     if (response.statusCode !== 200) {
&#xa;//         log_error(&#39;[RTDS] API returned &#39; + response.statusCode + &#39; for sourceId=&#39; + context.session.variables.RTDS_sourceId);
&#xa;//         context.session.variables.RTDS_error = &#39;API_ERROR_&#39; + response.statusCode;
&#xa;//         return &#39;disconnect&#39;;
&#xa;//     }
&#xa;
&#xa;//     var json;
&#xa;//     try {
&#xa;//         json = JSON.parse(response.body);
&#xa;//     } catch (err) {
&#xa;//         log_error(&#39;[RTDS] JSON.parse failed: &#39; + err.message);
&#xa;//         context.session.variables.RTDS_error = &#39;RTDS_PARSE_ERROR&#39;;
&#xa;//         return &#39;disconnect&#39;;
&#xa;//     }
&#xa;
&#xa;//     var firstOp = parseFlow(json);
&#xa;//     if (!firstOp) { return &#39;disconnect&#39;; }
&#xa;
&#xa;//     return runStep(firstOp.Id);
&#xa;// });
&#xa;
&#xa;
&#xa;    try {
&#xa;        json = JSON.parse(response.body);
&#xa;    } catch (err) {
&#xa;        log_error(&#39;[RTDS] JSON.parse failed: &#39; + err.message);
&#xa;        context.session.variables.RTDS_error = &#39;RTDS_PARSE_ERROR&#39;;
&#xa;        return &#39;disconnect&#39;;
&#xa;    }
&#xa;
&#xa;    var firstOp = parseFlow(json);
&#xa;    if (!firstOp) { return &#39;disconnect&#39;; }
&#xa;
&#xa;    return runStep(firstOp.Id);
&#xa;
&#xa;// ---------------------------------------------------------------------------
&#xa;// ENTRY POINT B — Re-entry after a GUI node completes
&#xa;//
&#xa;// Paste this block into the Vocalls Script node wired after every GUI node.
&#xa;// The GUI node must write the chosen outcome step Id into
&#xa;// context.session.variables.RTDS_nextStepId before this node is entered.
&#xa;// ---------------------------------------------------------------------------
&#xa;
&#xa;// return resumeFrom(context.session.variables.RTDS_nextStepId);"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="229"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="-36" y="-850" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="238"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      edge="1"
      parent="baselayer"
      source="230"
      target="21"
    >
      <mxGeometry relative="1" as="geometry" />
    </mxCell>
    <object
      label="script"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code='rtSmsBody = "test with rtSmsBody";&#xa;params = { &#xa;    "Active": false, &#xa;    "To": "+32478306999", &#xa;    "Routing": "LPA_DEV", &#xa;    "From": "8850", &#xa;    "Body": "${rtSmsBody}", &#xa;    "AccountId": 47, &#xa;    "Timeout": 5000, &#xa;    "NextStep_Success": "00011", &#xa;    "NextStep_Failure": "00099", &#xa;    "NextStep": "00012" &#xa;  }'
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="230"
    >
      <mxCell style="scriptNode" parent="baselayer" vertex="1">
        <mxGeometry x="-36" y="-540" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <object
      label="devJson"
      Type="script"
      OnEnter=""
      OnLeave=""
      DynamicNextId=""
      Code="// ---------------------------------------------------------------------------
&#xa;// ENTRY POINT A — Initial call entry
&#xa;// ---------------------------------------------------------------------------
&#xa;context.session.variables.RTDS_sourceId = context.phone;
&#xa;
&#xa;log_debug(&#39;[RTDS] Entry Point A — sourceId=&#39; + context.session.variables.RTDS_sourceId);
&#xa;
&#xa;// return jsonHttpRequest(
&#xa;//     &#39;https://rtds-api.internal/api/routing-table/&#39; + context.session.variables.RTDS_sourceId,
&#xa;//     { method: &#39;GET&#39; }
&#xa;// ).then(function (response) {
&#xa;//     if (response.statusCode !== 200) {
&#xa;//         log_error(&#39;[RTDS] API returned &#39; + response.statusCode + &#39; for sourceId=&#39; + context.session.variables.RTDS_sourceId);
&#xa;//         context.session.variables.RTDS_error = &#39;API_ERROR_&#39; + response.statusCode;
&#xa;//         return &#39;disconnect&#39;;
&#xa;//     }
&#xa;
&#xa;//     var json;
&#xa;//     try {
&#xa;//         json = JSON.parse(response.body);
&#xa;//     } catch (err) {
&#xa;//         log_error(&#39;[RTDS] JSON.parse failed: &#39; + err.message);
&#xa;//         context.session.variables.RTDS_error = &#39;RTDS_PARSE_ERROR&#39;;
&#xa;//         return &#39;disconnect&#39;;
&#xa;//     }
&#xa;
&#xa;//     var firstOp = parseFlow(json);
&#xa;//     if (!firstOp) { return &#39;disconnect&#39;; }
&#xa;
&#xa;//     return runStep(firstOp.Id);
&#xa;// });
&#xa;
&#xa;
&#xa;    try {
&#xa;        json = JSON.parse(devJson);
&#xa;    } catch (err) {
&#xa;        log_error(&#39;[RTDS] JSON.parse failed: &#39; + err.message);
&#xa;        context.session.variables.RTDS_error = &#39;RTDS_PARSE_ERROR&#39;;
&#xa;        return &#39;disconnect&#39;;
&#xa;    }
&#xa;
&#xa;    var firstOp = parseFlow(json);
&#xa;    if (!firstOp) { return &#39;disconnect&#39;; }
&#xa;
&#xa;    return runStep(firstOp.Id);
&#xa;
&#xa;// ---------------------------------------------------------------------------
&#xa;// ENTRY POINT B — Re-entry after a GUI node completes
&#xa;//
&#xa;// Paste this block into the Vocalls Script node wired after every GUI node.
&#xa;// The GUI node must write the chosen outcome step Id into
&#xa;// context.session.variables.RTDS_nextStepId before this node is entered.
&#xa;// ---------------------------------------------------------------------------
&#xa;
&#xa;// return resumeFrom(context.session.variables.RTDS_nextStepId);"
      MaxEntryNodeId=""
      MaxEntryCount=""
      DynamicNextTabGuid=""
      id="236"
    >
      <mxCell style="scriptNode" vertex="1" parent="baselayer">
        <mxGeometry x="-36.5" y="-970" width="168" height="80" as="geometry" />
      </mxCell>
    </object>
    <mxCell
      id="237"
      style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;"
      edge="1"
      parent="baselayer"
      source="30"
      target="236"
    >
      <mxGeometry relative="1" as="geometry">
        <mxPoint x="48" y="-1000" as="sourcePoint" />
        <mxPoint x="48" y="-850" as="targetPoint" />
      </mxGeometry>
    </mxCell>
  </root>
</mxGraphModel>;
