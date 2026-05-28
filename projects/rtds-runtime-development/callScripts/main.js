/**
 * main.js — RTDS runtime, DA-HELPDESK fixture-driven example
 *
 * End-to-end demonstration of the RTDS runtime walking a real Vocalls flow
 * (DIGIPOLIS LPA_ICT_HELPDESK) without any network calls. The routing-table
 * JSON normally returned by the API is inlined below; jsonHttpRequest is
 * intercepted in the dev-only block so fetchAndStart returns it as if the
 * API had just answered. Every JS-handled operation type in the fixture
 * (SetAttributes, Condition, Emergency, Schedule, FlowJump) executes its
 * real handler. Every GUI-exit operation type (Menu, PlayPrompt,
 * WorkgroupTransfer, ExternalTransfer, GuardRouting, SendSMS, SendEmail,
 * Disconnect) returns its exit-key string just as in production; a dev
 * driver loop stubs the Vocalls re-entry by calling resumeFrom with the
 * op's default NextStep (or an _devGuiOverrides entry, when set).
 *
 * Production-shape boundary: the runtime in rtds_2_runtime.js does not
 * know it's running in dev mode. Everything fixture-related lives below
 * the __isRepoRuntime guard in this file.
 *
 * Globals loaded by the simulator before this script runs (reverse-alpha):
 *   1. rtds_3_vocallsEnv.js     Logger, helpers, initializeCallFlowContext
 *   2. rtds_2_runtime.js        parseFlow, runStep, resumeFrom, fetchAndStart,
 *                               executeSetAttributes/Condition/Emergency/Schedule/FlowJump
 *   3. rtds_1_globalConfig.js   DEFAULT_LOGGED_KEYS, constVarObj
 *
 * Run locally:
 *   npm run switch -- rtds-runtime-development
 *   npm run simulate
 */

// This project is a dev-only fixture-driven example; everything below the
// sim-block boundary always runs. The `typeof process` guard used in other
// projects' main.js is intentionally absent — the VM sandbox does not expose
// `process`, so that guard would always be false here.


// ---------------------------------------------------------------------------
// Master-layer variables — mirror the Vocalls flow Variables attribute.
// ---------------------------------------------------------------------------
environment = '';
language = '';
_headers = (typeof _headers === 'object' && _headers !== null) ? _headers : {};

_baseUrl = 'https://api.n-allo.be';
_smsApi = '/smsapi-acc/api/Send';
_mailApi = '/mailapi-acc/api/Send';
_phonebookApi = '/phonebookapi-acc';

_rtBaseUrl = 'https://api.n-allo.be';
_rtGetSourceIdEndpoint = '/routingtablesapi-acc/api/routing-table/source';

_rtSmsEndpoint = '/rtdsapi-acc/api/Sms';
_rtMailEndpoint = '/rtdsapi-acc/api/Mail';
_rtTuiCheckAccessEndpoint = '/rtdsapi-acc/api/Guards/AnyGuardWithPhoneNumberAndConfig';
_rtTuiGetStateEndpoint    = '/rtdsapi-acc/api/Guards/GetGuardByPhoneNumberAndConfig';
_rtTuiActivateEndpoint    = '/rtdsapi-acc/api/Guards/Activate';
_rtTuiDeactivateEndpoint  = '/rtdsapi-acc/api/Guards/Disable';

_rtNextStep = {};
result = null;
env = 'acc';
debug = true;
debugCall = true;


Logger.info('[main] script start');


// ---------------------------------------------------------------------------
// initializeCallFlowContext — Vocalls flow init Script node.
// ---------------------------------------------------------------------------
initializeCallFlowContext('full');

Logger.info('[main] call context ready', {
    callGuid:    context && context.callInfo && context.callInfo.callGuid,
    direction:   context && context.callInfo && context.callInfo.direction,
    language:    (context && context.language) || (varObj && varObj.language),
    ani:         varObj && varObj.ani,
    dnis:        varObj && varObj.dnis,
    routingId:   varObj && varObj.routingId,
    environment: varObj && varObj.environment
});


// ===========================================================================
// DEV FIXTURE BLOCK — runs unconditionally in this project.
// ===========================================================================

    // -----------------------------------------------------------------------
    // Inline DA-HELPDESK routing table — what the API would return for the
    // SourceId '+3233389999'. Inlined (not require()'d) because the sandbox
    // doesn't expose `require` / `fs`.
    // -----------------------------------------------------------------------
    var __daHelpdeskJson = '{' +
        '"SourceId":"+3233389999",' +
        '"Name":"DIGIPOLIS - LPA_ICT_HELPDESK",' +
        '"Project":"LPA ICT",' +
        '"PromptLibrary":"DIGIPOLIS\\\\LPA\\\\ICT_HELPDESK",' +
        '"SupportedLanguages":"NL",' +
        '"Operations":[' +
            '{"Id":"00000","Type":"SetAttributes","Name":"Call Initialization","IsFirstOperation":true,' +
                '"Params":{"LogAttributes":"RTDS_ProjectName|Eic_RemoteId|ATTR_RoutingId|ATTR_CallflowId|ATTR_IVREvent|ATTR_IVRAction|ATTR_CQR|ATTR_CQS",' +
                '"CallflowId":"LPA_ICT_HELPDESK","RoutingId":"LPA_ICT_HELPDESK","IVREvent":"9999","IVRAction":"CT","NextStep":"00001"}},' +
            '{"Id":"00001","Type":"Emergency","Name":"Check: Emergency",' +
                '"Params":{"Active":"1","EmergencyId":"DIGIPOLIS LPA_ICT_HELPDESK Exception Prompt",' +
                '"NextStep_Transfer":"00002","NextStep_Disconnect":"00002","NextStep_Continue":"00002","NextStep_Failure":"00002","NextStep":"00002"}},' +
            '{"Id":"00002","Type":"Schedule","Name":"Check: Scheduler",' +
                '"Params":{"ApplicationId":"1","ScheduleID":"8",' +
                '"NextStep_Open":"00003","NextStep_Guard_ICT":"00004","NextStep_Transfer":"00005","NextStep_Closed":"00006","NextStep_Failure":"00060","NextStep":"00060"}},' +
            '{"Id":"00003","Type":"SetAttributes","Name":"Set: Congnos Open",' +
                '"Params":{"IVREvent":"1200","IVRAction":"CT","NextStep":"00010"}},' +
            '{"Id":"00004","Type":"SetAttributes","Name":"Set: Congnos Guard",' +
                '"Params":{"IVREvent":"1200","IVRAction":"GD03","NextStep":"00060"}},' +
            '{"Id":"00005","Type":"SetAttributes","Name":"Set: Congnos Transfer",' +
                '"Params":{"IVREvent":"1200","IVRAction":"TX","NextStep":"00097"}},' +
            '{"Id":"00006","Type":"SetAttributes","Name":"Set: Congnos Closed",' +
                '"Params":{"IVREvent":"1201","IVRAction":"DC","NextStep":"00098"}},' +
            '{"Id":"00010","Type":"Emergency","Name":"Check: Emergency",' +
                '"Params":{"Active":"1","EmergencyId":"Emergency Routing LPA ICT Helpdesk",' +
                '"NextStep_Transfer":"00011","NextStep_Disconnect":"00012","NextStep_Continue":"00013","NextStep_Failure":"00020","NextStep":"00020"}},' +
            '{"Id":"00011","Type":"SetAttributes","Name":"Set: Congnos Emergency Transfer",' +
                '"Params":{"IVREvent":"1204","IVRAction":"TX","NextStep":"00097"}},' +
            '{"Id":"00012","Type":"SetAttributes","Name":"Set: Congnos Emergency Disconnect",' +
                '"Params":{"IVREvent":"1204","IVRAction":"DC","NextStep":"00098"}},' +
            '{"Id":"00013","Type":"SetAttributes","Name":"Set: Congnos Emergency Continue",' +
                '"Params":{"IVREvent":"1204","IVRAction":"CT","NextStep":"00020"}},' +
            '{"Id":"00020","Type":"PlayPrompt","Name":"Play: Welcome",' +
                '"Params":{"Active":["1","isEditable"],"Prompt":"Welcome.wav","NextStep":"00021"}},' +
            '{"Id":"00021","Type":"PlayPrompt","Name":"Play: Extra",' +
                '"Params":{"Active":["0","isEditable"],"ApplicationId":"6","Prompt":["AdHoc_Extra","isDisplayed","isEditable"],"NextStep":"00022"}},' +
            '{"Id":"00022","Type":"PlayPrompt","Name":"Play: Exceptions",' +
                '"Params":{"Active":["0","isEditable"],"ApplicationId":"6","Prompt":["AdHoc_ExceptionBadPortal","isDisplayed","isEditable"],"NextStep":"00024"}},' +
            '{"Id":"00024","Type":"Condition","Name":"Check: Staffing",' +
                '"Params":{"Statistic":"AgentsLoggedIn","Workgroup":"LPA_ICT_HELPDESK_V","Operator":"gt","Value":"0",' +
                '"NextStep_True":"00025","NextStep_False":"00060"}},' +
            '{"Id":"00025","Type":"Condition","Name":"Check: MaxQueue",' +
                '"Params":{"Statistic":"CallsWaiting","Workgroup":"LPA_ICT_HELPDESK_V","Operator":"gt","Value":"39",' +
                '"NextStep_True":"00096","NextStep_False":"00030"}},' +
            '{"Id":"00030","Type":"WorkgroupTransfer","Name":"Route-To: Workgroup",' +
                '"Params":{"QueueName":"LPA_ICT_HELPDESK_V","Skills":"LPA_ICT_Helpdesk","Priority":"100","NextStep":"00050"}},' +
            '{"Id":"00050","Type":"PlayPrompt","Name":"Queue: Message 1",' +
                '"Params":{"Prompt":"Queue_Waitmessage01","NextStep":"00051"}},' +
            '{"Id":"00051","Type":"PlayPrompt","Name":"Queue: Message 2",' +
                '"Params":{"Prompt":"Queue_Waitmessage02","NextStep":"00050"}},' +
            '{"Id":"00060","Type":"Menu","Name":"Menu: Guard",' +
                '"Params":{"Active":["1","isDisplayed","isEditable"],"ApplicationId":"7","StaticPrompt":"Menu_Guard.wav","Timeout":8,"MaxTries":0,' +
                '"NextStep_0":"00065","NextStep_DefaultChoice":"00070","NextStep":"00070"}},' +
            '{"Id":"00065","Type":"SetAttributes","Name":"Set: Congnos Guard LTSU",' +
                '"Params":{"IVREvent":"1200","IVRAction":"GD04","NextStep":"00066"}},' +
            '{"Id":"00066","Type":"FlowJump","Name":"FlowJump: LPA_LTSU_GUARD","IsFirstOperation":true,' +
                '"Params":{"SourceId":"+3271690037"}},' +
            '{"Id":"00080","Type":"GuardRouting","Name":"LPA_LTSU_GUARD",' +
                '"Params":{"Active":1,"ConfigId":4,"ConfigName":"LPA_LTSU_GUARD","DialGuard":true,"DialGroup":"SIP_TO_TELENET_DIGIPOLIS_STAD",' +
                '"OnHoldAudio":"TENANT_DA_GUARD","Timeout":15,"RecordVoicemail":true,"AcceptCallMenu":true,"SendSMS":true,"SendMail":true,' +
                '"NextStep_Failure":"00067","NextStep_Success":"00067","NextStep":"00067"}},' +
            '{"Id":"00081","Type":"SendEmail","Name":"Mail-To: LPA_LTSU_GUARD",' +
                '"Params":{"Active":1,"Subject":"LPA_LTSU_GUARD: Call Report","From":"IVR_EVENTS@n-allo.be","To":"$(ATTR_EmailTo)",' +
                '"CC":"veerle.georges@police.belgium.eu;mattias.mertens@n-allo.be","Body":"$(ATTR_EmailBody)","Importance":"Normal","Attachment":"$(ATTR_EmailAttachment)",' +
                '"NextStep_Success":"00068","NextStep_Failure":"00068","NextStep":"00068"}},' +
            '{"Id":"00082","Type":"SendSMS","Name":"SMS-To: LPA_LTSU_GUARD",' +
                '"Params":{"Active":1,"ConfigId":47,"Routing":"LPA_LTSU_GUARD","From":"8850","To":"$(ATTR_SMSTo)","Body":"$(ATTR_SMSBody)",' +
                '"NextStep_Failure":"00098","NextStep_Success":"00098","NextStep":"00098"}},' +
            '{"Id":"00070","Type":"Emergency","Name":"Check: Emergency",' +
                '"Params":{"Active":"1","EmergencyId":"DIGIPOLIS LPA_ICT_HELPDESK Exception Prompt",' +
                '"NextStep_Transfer":"00097","NextStep_Disconnect":"00098","NextStep_Continue":"00071","NextStep_Failure":"00071","NextStep":"00071"}},' +
            '{"Id":"00071","Type":"GuardRouting","Name":"LPA_ICT_GUARD",' +
                '"Params":{"Active":1,"ConfigId":3,"ConfigName":"LPA_ICT_GUARD","DialGuard":true,"DialGroup":"SIP_TO_TELENET_DIGIPOLIS_STAD",' +
                '"OnHoldAudio":"TENANT_DA_GUARD","Timeout":30,"RecordVoicemail":true,"AcceptCallMenu":true,"SendSMS":true,"SendMail":true,' +
                '"NextStep_Failure":"00072","NextStep_Success":"00072","NextStep":"00072"}},' +
            '{"Id":"00072","Type":"SendEmail","Name":"Mail-To: LPA_ICT_GUARD",' +
                '"Params":{"Active":1,"Subject":"LPA_ICT_GUARD: Call Report","From":"IVR_EVENTS@n-allo.be","To":"$(ATTR_EmailTo)",' +
                '"CC":"veerle.georges@police.belgium.eu;mattias.mertens@n-allo.be","Body":"$(ATTR_EmailBody)","Importance":"Normal","Attachment":"$(ATTR_EmailAttachment)",' +
                '"NextStep_Success":"00073","NextStep_Failure":"00073","NextStep":"00073"}},' +
            '{"Id":"00073","Type":"SendSMS","Name":"SMS-To: LPA_ICT_GUARD",' +
                '"Params":{"Active":1,"ConfigId":47,"Routing":"LPA_ICT_GUARD","From":"8850","To":"$(ATTR_SMSTo)","Body":"$(ATTR_SMSBody)",' +
                '"NextStep_Failure":"00098","NextStep_Success":"00098","NextStep":"00098"}},' +
            '{"Id":"00096","Type":"Disconnect","Name":"RTDS: MaxQueue Disconnect",' +
                '"Params":{"Prompt":"PreQueue_MaxQueueDisconnect","ApplicationId":"4"}},' +
            '{"Id":"00097","Type":"ExternalTransfer","Name":"Route-To: External Number",' +
                '"Params":{"PhoneNumber":"","OutboundANI":"","PerformCallAnalysis":"Yes","DiversionReason":"8","Timeout":"30",' +
                '"NextStep_Busy":"00099","NextStep_RNA":"00099","NextStep":"00098"}},' +
            '{"Id":"00098","Type":"Disconnect","Name":"RTDS: Disconnect"},' +
            '{"Id":"00099","Type":"SetAttributes","Name":"Set: Congnos Error",' +
                '"Params":{"IVREvent":"1200","IVRAction":"CT","NextStep":"00100"}},' +
            '{"Id":"00100","Type":"Disconnect","Name":"RTDS: IVR Error",' +
                '"Params":{"Prompt":"Scheduler_ClosedDisconnect"}}' +
        ']}';

    // -----------------------------------------------------------------------
    // Fixture maps consumed by the JS-handled operations in rtds_2_runtime.js.
    // The handlers fall back to safe defaults when an id is missing — see
    // each executeXxx for the contract.
    // -----------------------------------------------------------------------
    _devFixtures = {
        '+3233389999': JSON.parse(__daHelpdeskJson)
        // '+3271690037': <not registered — FlowJump 00066 will log a warn>
    };

    _devEmergencyOutcomes = {
        'DIGIPOLIS LPA_ICT_HELPDESK Exception Prompt': 'Continue',
        'Emergency Routing LPA ICT Helpdesk':           'Continue'
    };

    _devScheduleStates = {
        '8': 'Open'
    };

    _devStatistics = {
        'LPA_ICT_HELPDESK_V': {
            'AgentsLoggedIn': 3,
            'CallsWaiting':   5
        }
    };

    // Per-op override map. Maps op.Id → the NextStep_<X> key the GUI
    // component would have chosen. Absent entries fall through to the op's
    // default NextStep (already pre-populated on RTDS_nextStepId by
    // prepareGuiHandoff).
    _devGuiOverrides = {
        // No overrides by default — every GUI op takes its default NextStep,
        // which for this fixture walks: 00020→00021→00022 (PlayPrompts) then
        // the Conditions decide the route. Add entries here to exercise
        // alternative branches.
    };

    // -----------------------------------------------------------------------
    // Intercept jsonHttpRequest for the routing-table URL so fetchAndStart
    // runs production-shape but resolves locally. Other URLs (Logger's
    // EventLog POST) fall through to the original implementation.
    // -----------------------------------------------------------------------
    var __originalJsonHttpRequest = jsonHttpRequest;
    var __routingTableUrlPrefix = _rtBaseUrl + _rtGetSourceIdEndpoint;

    jsonHttpRequest = function (url, reqOpts, headers, body) {
        if (typeof url === 'string' && url.indexOf(__routingTableUrlPrefix) === 0) {
            var __query = url.substring(__routingTableUrlPrefix.length);
            var __match = __query.match(/[?&]sourceId=([^&]+)/);
            var sourceId = __match ? decodeURIComponent(__match[1]) : '';
            var fixture = _devFixtures[sourceId];
            if (fixture) {
                Logger.info('[sim] routing-table stub hit', { sourceId: sourceId });
                return {
                    then: function (onOk) {
                        var fake = { success: true, statusCode: 200, body: fixture };
                        return { then: function (chained) { return chained(onOk(fake)); } };
                    },
                    withTimeout: function () { return this; }
                };
            }
            Logger.warn('[sim] routing-table stub miss', { sourceId: sourceId });
            return {
                then: function (onOk, onErr) {
                    if (onErr) onErr(new Error('No fixture for ' + sourceId));
                    return { then: function () { return 'disconnect'; } };
                },
                withTimeout: function () { return this; }
            };
        }
        return __originalJsonHttpRequest.apply(null, arguments);
    };

    // -----------------------------------------------------------------------
    // driveFlow(exitKey)
    //   Stubs the Vocalls re-entry loop. When the runtime returns a GUI exit
    //   key, this picks the next op id (from _devGuiOverrides or the default
    //   RTDS_nextStepId) and calls resumeFrom. Caps at MAX_HOPS to avoid the
    //   real PlayPrompt→PlayPrompt loop in 00050↔00051.
    // -----------------------------------------------------------------------
    var MAX_HOPS = 50;
    function driveFlow(exitKey) {
        var hops = 0;
        var current = exitKey;
        while (current && current !== 'disconnect' && hops < MAX_HOPS) {
            var opId = context.session.variables.RTDS_currentOpId;
            var defaultNext = context.session.variables.RTDS_nextStepId;
            var override = _devGuiOverrides[opId];
            var chosenNext = defaultNext;

            if (override) {
                var opIndex = context.session.variables.RTDS_opIndex;
                var op = opIndex && opIndex.get(opId);
                var overrideNext = op ? resolveNextStep(op, override) : null;
                if (overrideNext) {
                    chosenNext = overrideNext;
                    Logger.info('[sim] GUI override', { opId: opId, key: override, nextStep: chosenNext });
                }
            }
            Logger.info('[sim] GUI component stub', { opId: opId, exitKey: current, resumeAt: chosenNext });

            current = resumeFrom(chosenNext);
            hops++;
        }
        if (hops >= MAX_HOPS) {
            Logger.warn('[sim] driveFlow hit MAX_HOPS', { hops: hops, lastExitKey: current });
        }
        return current;
    }


// ---------------------------------------------------------------------------
// ENTRY POINT A — initial RTDS dispatch (against the DA-HELPDESK fixture)
// ---------------------------------------------------------------------------
context.session.variables.RTDS_sourceId = '+3233389999';

Logger.info('[main] Entry Point A start', { sourceId: context.session.variables.RTDS_sourceId });

result = fetchAndStart(context.session.variables.RTDS_sourceId);


// ---------------------------------------------------------------------------
// Chain the GUI stub driver onto the promise so the whole flow runs in one
// simulator pass.
// ---------------------------------------------------------------------------
function __handleEntryAExit(exitKey) {
    Logger.info('[main] Entry A exit', { exitKey: exitKey });
    if (exitKey && exitKey !== 'disconnect') {
        var finalKey = driveFlow(exitKey);
        Logger.info('[main] flow terminated', { finalKey: finalKey });
    }
}

if (result && typeof result.then === 'function') {
    result.then(__handleEntryAExit, function (err) {
        Logger.error('[main] Entry A unexpected rejection', {}, err);
    });
} else {
    __handleEntryAExit(result);
}


// ---------------------------------------------------------------------------
// Test/debug metadata.
// ---------------------------------------------------------------------------
if (context && context.session) {
    context.session.variables.scriptName = 'main';
    context.session.variables.scriptExecutedAt = nowUTC();
    context.session.variables.projectName = 'rtds-runtime-development';
    context.session.variables.rtdsExitKeyA = result && typeof result.then !== 'function' ? result : null;
}


// ---------------------------------------------------------------------------
// ENTRY POINT B — re-entry after a GUI-exit component completes
//
// Production: lives in a dedicated Script node wired after each GUI-exit
// component. Body is one line:
//     return resumeFrom(_rtNextStep || context.session.variables.RTDS_nextStepId);
// (Style A components write the chosen next-op id to the master `_rtNextStep`
// variable; RTDS_nextStepId is the runtime's safety-net fallback.)
// Dev: driveFlow() above stubs this loop end-to-end so a single simulator
// run walks the entire flow.
// ---------------------------------------------------------------------------
