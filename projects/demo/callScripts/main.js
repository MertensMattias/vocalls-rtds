/**
 * main.js — RTDS demo flow
 *
 * Exercises the RTDS runtime end-to-end against a local devJson routing table.
 * Mirrors the two Script-node entry points described in RTDS_runtime_spec.md:
 *
 *   Entry Point A (initial call entry):
 *     RTDS_sourceId <- context.phone
 *     json          <- JSON.parse(devJson)      (substitutes for the API body)
 *     firstOp       <- parseFlow(json)
 *     exitKey       <- runStep(firstOp.Id)      (loops JS-handled ops, returns on GUI-exit)
 *
 *   Entry Point B (re-entry after a GUI node):
 *     exitKey       <- resumeFrom(context.session.variables.RTDS_nextStepId)
 *
 * Globals loaded by the simulator (in this order):
 *   - rtds_globalConfig.js          (DEFAULT_LOGGED_KEYS, constVarObj)
 *   - rtds_globalCodeAndHelpers.js  (Logger, initializeCallFlowContext, nowUTC, ...)
 *   - rtds_A_RTDS_runtime.js        (parseFlow, runStep, resumeFrom, executeSetAttributes, ...)
 *
 * Run: npm run simulate -- --project demo
 */

// ---------------------------------------------------------------------------
// Master-layer variables (match the Vocalls flow Variables attribute)
// ---------------------------------------------------------------------------
environment = '';
language = '';
_headers = (typeof _headers === 'object' && _headers !== null) ? _headers : {};
_baseUrl = 'https://api.n-allo.be';
_smsApi = '/smsapi-acc/api/Send';
_mailApi = '/mailapi-acc/api/Send';
_phonebookApi = '/phonebookapi-acc';
_rtJson = {};
_rtConfig = {};
_rtNextStep = {};
result = null;
env = 'acc';
debug = true;
debugCall = true;

// ---------------------------------------------------------------------------
// Dev routing-table JSON (stand-in for the API response body).
// Exercises every code path in the runtime:
//   00000  SetAttributes  - LogAttributes + plain string params
//   00001  SetAttributes  - $(TOKEN) resolution against vars set by 00000
//   00002  PlayPrompt     - GUI-exit handoff (writes RTDS_OP_*, returns 'play_prompt')
//   00003  Disconnect     - second GUI-exit reached via resumeFrom (returns 'disconnect')
// ---------------------------------------------------------------------------
devJson = JSON.stringify({
    SourceId: 'RTDS_DEMO',
    Name: 'RTDS Demo Flow',
    Project: 'demo',
    PromptLibrary: 'DEMO\\RTDS',
    SupportedLanguages: 'NL',
    Operations: [
        {
            Id: '00000',
            Type: 'SetAttributes',
            Name: 'Init',
            IsFirstOperation: true,
            Params: {
                LogAttributes: 'routingId|ani|dnis',
                RoutingId: 'FEST_DEMO',
                CallflowId: 'FEST_DEMO_FLOW',
                IVREvent: '9999',
                IVRAction: 'CT',
                NextStep: '00001'
            }
        },
        {
            Id: '00001',
            Type: 'SetAttributes',
            Name: 'ResolveGreeting',
            Params: {
                GreetingPrefix: 'Welcome to $(RoutingId)',
                OperatorQueue: '$(CallflowId)_QUEUE',
                NextStep: '00002'
            }
        },
        {
            Id: '00002',
            Type: 'PlayPrompt',
            Name: 'Welcome',
            Params: {
                PromptName: 'welcome',
                Text: '$(GreetingPrefix), please hold.',
                NextStep: '00003'
            }
        },
        {
            Id: '00003',
            Type: 'Disconnect',
            Name: 'End',
            Params: {
                Reason: 'test_complete'
            }
        }
    ]
});

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------
Logger.info('=================================================');
Logger.info('RTDS demo flow: main.js');
Logger.info('=================================================');

// ---------------------------------------------------------------------------
// initializeCallFlowContext — Vocalls flow "initializeCallFlowContext" Script node.
// Builds varObj from constVarObj() and syncs environment/routingId/ani/dnis globals.
// ---------------------------------------------------------------------------
Logger.info('Initializing call flow context...');
initializeCallFlowContext('full');
Logger.info('varObj: ' + JSON.stringify(varObj));

// ---------------------------------------------------------------------------
// ENTRY POINT A — Initial RTDS dispatch
//
// Spec shape (production):
//   return jsonHttpRequest(rtdsApiUrl + sourceId, { method: 'GET' })
//          .then(function (response) { ... parseFlow(JSON.parse(response.body)) ... runStep(...) });
//
// In the local simulator we substitute the local devJson string for the
// API response body. The runtime code path is otherwise identical.
// ---------------------------------------------------------------------------
function runEntryPointA() {
    context.session.variables.RTDS_sourceId =
        context.phone || (varObj && varObj.ani) || '';

    log_debug('[RTDS] Entry Point A — sourceId=' +
        context.session.variables.RTDS_sourceId);

    var json;
    try {
        json = JSON.parse(devJson);
    } catch (err) {
        log_error('[RTDS] JSON.parse failed: ' + err.message);
        context.session.variables.RTDS_error = 'RTDS_PARSE_ERROR';
        return 'disconnect';
    }

    var firstOp = parseFlow(json);
    if (!firstOp) {
        return 'disconnect';
    }

    return runStep(firstOp.Id);
}

var exitKeyA = runEntryPointA();
Logger.info('[RTDS] Entry A exit key: ' + exitKeyA);

// ---------------------------------------------------------------------------
// GUI-handoff inspection
// After runStep stops at a GUI-exit op (PlayPrompt here), prepareGuiHandoff has:
//   - mirrored every Param into context.session.variables['RTDS_OP_' + key]
//   - set RTDS_currentOpId / RTDS_currentOpType
//   - pre-populated RTDS_nextStepId with the op's NextStep (GUI node would overwrite)
// In production the matching GUI node reads RTDS_OP_* to render itself.
// ---------------------------------------------------------------------------
Logger.info('[RTDS] After GUI handoff:');
Logger.info('  RTDS_currentOpId   = ' + context.session.variables.RTDS_currentOpId);
Logger.info('  RTDS_currentOpType = ' + context.session.variables.RTDS_currentOpType);
Logger.info('  RTDS_nextStepId    = ' + context.session.variables.RTDS_nextStepId);
Logger.info('  RTDS_OP_PromptName = ' + context.session.variables.RTDS_OP_PromptName);
Logger.info('  RTDS_OP_Text       = ' + context.session.variables.RTDS_OP_Text);

// ---------------------------------------------------------------------------
// ENTRY POINT B — Re-entry after the GUI node completes
//
// Production Script node wired after every GUI node contains just:
//   return resumeFrom(context.session.variables.RTDS_nextStepId);
//
// The GUI node is expected to set RTDS_nextStepId to its branching outcome
// before this Script node fires. The default written by prepareGuiHandoff
// stands in for that here.
// ---------------------------------------------------------------------------
var exitKeyB = resumeFrom(context.session.variables.RTDS_nextStepId);
Logger.info('[RTDS] Entry B exit key: ' + exitKeyB);

// ---------------------------------------------------------------------------
// Final result summary
// ---------------------------------------------------------------------------
Logger.info('[RTDS] RTDS_error          = ' + (context.session.variables.RTDS_error || '(none)'));
Logger.info('[RTDS] Final RTDS_currentOpId   = ' + context.session.variables.RTDS_currentOpId);
Logger.info('[RTDS] Final RTDS_currentOpType = ' + context.session.variables.RTDS_currentOpType);
Logger.info('[RTDS] Globals written by SetAttributes:');
Logger.info('  RoutingId       = ' + (typeof RoutingId !== 'undefined' ? RoutingId : '(unset)'));
Logger.info('  CallflowId      = ' + (typeof CallflowId !== 'undefined' ? CallflowId : '(unset)'));
Logger.info('  IVREvent        = ' + (typeof IVREvent !== 'undefined' ? IVREvent : '(unset)'));
Logger.info('  IVRAction       = ' + (typeof IVRAction !== 'undefined' ? IVRAction : '(unset)'));
Logger.info('  GreetingPrefix  = ' + (typeof GreetingPrefix !== 'undefined' ? GreetingPrefix : '(unset)'));
Logger.info('  OperatorQueue   = ' + (typeof OperatorQueue !== 'undefined' ? OperatorQueue : '(unset)'));

// ---------------------------------------------------------------------------
// Repo-runtime metadata (test/debug aid — guarded so production stays untouched)
// ---------------------------------------------------------------------------
if (typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV !== 'production' &&
    context && context.session) {
    context.session.variables.scriptName = 'main';
    context.session.variables.scriptExecutedAt = nowUTC();
    context.session.variables.projectName = 'demo';
    context.session.variables.rtdsExitKeyA = exitKeyA;
    context.session.variables.rtdsExitKeyB = exitKeyB;
}

Logger.info('RTDS demo flow complete');
Logger.info('=================================================');
