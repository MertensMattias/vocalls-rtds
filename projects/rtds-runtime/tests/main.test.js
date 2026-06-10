/**
 * main.test.js — rtds-runtime smoke tests
 *
 * Confirms the three-library split loads cleanly: the env library exposes
 * Logger + getValue, the RTDS library exposes the dispatch tables + entry
 * points, and main.js runs without error logs.
 *
 * Map identity check uses duck-typing (`typeof m.get === 'function'`) instead
 * of `instanceof Map` because the sandbox's Map constructor is a different
 * object than the test runner's Map constructor — they share the same shape
 * but cross-realm `instanceof` returns false.
 *
 * Run:
 *   npm test
 */

var path = require('path');
var helpers = require(path.join(process.cwd(), 'core', 'testHelpers'));

var LOGGER_STUB_URL = 'https://api.n-allo.be/ivrapi-acc/api/EventLog';
// Seed sets toUri = 'sip:080012345@localhost'; sourceId is the DIALED number
// (DNIS), passed as the sourceId query param to routingtablesapi.
var ROUTING_TABLE_URL =
    'https://api.n-allo.be/routingtablesapi-acc/api/routing-table/source?sourceId=080012345';

// Minimal routing-table response — one SetVariables op, no NextStep so the
// loop ends cleanly with 'disconnect'. Keeps the test fast and avoids a
// second stub for any GUI-exit path.
var ROUTING_TABLE_STUB = {
    success: true,
    statusCode: 200,
    body: {
        sourceId: '+32470000000',
        name: 'smoke-test',
        project: 'rtds-runtime',
        promptLibrary: '',
        supportedLanguages: 'EN',
        operations: [
            {
                id: '00000',
                type: 'setVariables',
                name: 'Init',
                isFirstOperation: true,
                params: { testKey: 'TestValue' }
            }
        ]
    }
};

var STUBS = {};
STUBS[LOGGER_STUB_URL] = { success: true, statusCode: 200 };
STUBS[ROUTING_TABLE_URL] = ROUTING_TABLE_STUB;

describe('rtds-runtime main.js', function () {
    it('loads without synchronous error-level logs', function () {
        // The only error allowed is the post-load fetchAndStart shape-mismatch
        // warning. The test-harness jsonHttpRequest stub resolves to a fetch-
        // style Response ({ status, ok, json }), but the production runtime
        // expects the Vocalls shape ({ success, statusCode, response }). That
        // mismatch is a harness limitation, not a runtime bug — fetchAndStart
        // correctly routes to NextStep_Failure (exit 'disconnect') when it
        // sees no success: true on the result.
        return helpers
            .runScript('main', { project: 'rtds-runtime', stubs: STUBS })
            .then(function (result) {
                var errors = result.logs.filter(function (l) { return l.level === 'error'; });
                var unexpected = errors.filter(function (l) {
                    return l.message.indexOf('fetchAndStart') === -1;
                });
                expect(unexpected).toHaveLength(0);
            });
    });

    it('exposes the Vocalls env surface (Logger + helpers)', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                expect(typeof result.sandbox.Logger).toBe('object');
                expect(typeof result.sandbox.Logger.info).toBe('function');
                expect(typeof result.sandbox.getValue).toBe('function');
                expect(typeof result.sandbox.walk).toBe('function');
                expect(typeof result.sandbox.nowUTC).toBe('function');
                expect(typeof result.sandbox.initializeCallFlowContext).toBe('function');
                expect(typeof result.sandbox.constVarObj).toBe('function');
            });
    });

    it('exposes the RTDS dispatch surface', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                expect(typeof result.sandbox.RTDS_OPERATIONS.get).toBe('function');
                // JS twins are disabled: SetVariables / SetAttributes are no
                // longer inline JS handlers, they route to the set_variables
                // GUI-exit (the canvas setVariables.js component).
                expect(result.sandbox.RTDS_OPERATIONS.has('setVariables')).toBe(false);
                expect(result.sandbox.RTDS_OPERATIONS.has('setAttributes')).toBe(false);
                expect(result.sandbox.RTDS_EXIT_KEYS.get('setVariables')).toBe('set_variables');
                expect(result.sandbox.RTDS_EXIT_KEYS.get('setAttributes')).toBe('set_variables');
                expect(typeof result.sandbox.RTDS_EXIT_KEYS.get).toBe('function');
                expect(result.sandbox.RTDS_EXIT_KEYS.get('say')).toBe('play_prompt');
                expect(result.sandbox.OP_VAR_PREFIX).toBeUndefined();
                expect(typeof result.sandbox.fetchAndStart).toBe('function');
                expect(typeof result.sandbox.resumeFrom).toBe('function');
                expect(typeof result.sandbox.runStep).toBe('function');
                expect(typeof result.sandbox.parseFlow).toBe('function');
            });
    });

    it('populates varObj via initializeCallFlowContext', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var vo = result.sandbox.varObj;
                expect(vo).toBeTruthy();
                expect(vo.routingId).toBe('RTDS_RUNTIME');
                expect(vo.customerProject).toBe('RTDS_RUNTIME');
                expect(typeof vo.ani).toBe('string');
                expect(typeof vo.dnis).toBe('string');
            });
    });

    it('executeSetVariables writes a bare key to varObj, not global', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                // Clean slate on both stores before invoking the handler
                delete sb.varObj.testKey;
                delete sb.testKey;
                var out = sb.executeSetVariables({
                    id: 'unit-1',
                    name: 'unit-setvars',
                    type: 'setVariables',
                    params: { testKey: 'TestValue', nextStep: '00001' }
                });
                expect(sb.varObj.testKey).toBe('TestValue');
                expect(sb.testKey).toBeUndefined();
                expect(out.nextStepId).toBe('00001');
            });
    });

    it('executeSetVariables preserves native JSON types and writes dot-paths', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                delete sb.varObj.ivrEvent;
                delete sb.varObj.isHelpdeskCall;
                delete sb.varObj.auth;
                delete sb.debugCall;
                sb.executeSetVariables({
                    id: 'unit-2', name: 'unit-setvars-2', type: 'setVariables',
                    params: {
                        ivrEvent: 9999,
                        isHelpdeskCall: true,
                        strDigits: '123456',
                        'auth.verified': true,
                        'auth.method': 'pin',
                        'globalThis.debugCall': true,
                        nextStep: '00002'
                    }
                });
                expect(sb.varObj.ivrEvent).toBe(9999);
                expect(typeof sb.varObj.ivrEvent).toBe('number');
                expect(sb.varObj.isHelpdeskCall).toBe(true);
                expect(sb.varObj.strDigits).toBe('123456');
                expect(typeof sb.varObj.strDigits).toBe('string');
                expect(sb.varObj.auth).toEqual({ verified: true, method: 'pin' });
                expect(sb.debugCall).toBe(true);
                expect('nextStep' in sb.varObj).toBe(false);
            });
    });

    it('executeSetVariables skips all writes when Active is false', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                delete sb.varObj.inactiveKey;
                delete sb.inactiveKey;
                var out = sb.executeSetVariables({
                    id: 'unit-inactive',
                    name: 'unit-setvars-inactive',
                    type: 'setVariables',
                    params: { active: false, inactiveKey: 'ShouldNotWrite', nextStep: '00003' }
                });
                // Nothing written on either store, and the op advances on NextStep.
                expect(sb.varObj.inactiveKey).toBeUndefined();
                expect(sb.inactiveKey).toBeUndefined();
                expect(out.nextStepId).toBe('00003');
            });
    });

    it('executeSetVariables defaults Active to true (absent Active still writes)', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                delete sb.varObj.legacyKey;
                // No Active key at all — legacy config. Default-true means it writes.
                var out = sb.executeSetVariables({
                    id: 'unit-legacy',
                    name: 'unit-setvars-legacy',
                    type: 'setVariables',
                    params: { legacyKey: 'Written', nextStep: '00004' }
                });
                expect(sb.varObj.legacyKey).toBe('Written');
                expect(out.nextStepId).toBe('00004');
            });
    });

    it('uses null (falsy end-of-flow), never -1, when NextStep is absent or blank', function () {
        // The "no next step" sentinel is null everywhere: null is falsy, so
        // runStep's if(!nextStepId) ends the flow cleanly. resolveNextStep returns
        // null when neither a result-specific NextStep nor a bare NextStep is set
        // (a blank "" Param is falsy and skipped too). -1 would be TRUTHY and get
        // mistaken for a real step id. Applies to every handler that reads NextStep.
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;

                // SetVariables: NextStep entirely absent.
                var sv = sb.executeSetVariables({
                    id: 'nv-1', type: 'setVariables', name: 'nv',
                    params: { someKey: 'x' }
                });
                expect(sv.nextStepId).toBe(null);

                // SetVariables: NextStep present but blank.
                var svBlank = sb.executeSetVariables({
                    id: 'nv-2', type: 'setVariables', name: 'nv',
                    params: { someKey: 'x', nextStep: '' }
                });
                expect(svBlank.nextStepId).toBe(null);

                // SendSms inactive with no NextStep -> null (not -1).
                var sms = sb.executeSendSms({
                    id: 'nv-3', type: 'sendSMS', name: 'nv',
                    params: { active: false }
                });
                expect(sms.nextStepId).toBe(null);

                // SendEmail inactive with no NextStep -> null (not -1).
                var mail = sb.executeSendEmail({
                    id: 'nv-4', type: 'sendEmail', name: 'nv',
                    params: { active: false }
                });
                expect(mail.nextStepId).toBe(null);
            });
    });

    it('activeFlag coerces every Active encoding the dictionary emits', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                // boolean
                expect(sb.activeFlag(true)).toBe(true);
                expect(sb.activeFlag(false)).toBe(false);
                // number 1/0
                expect(sb.activeFlag(1)).toBe(true);
                expect(sb.activeFlag(0)).toBe(false);
                // string "1"/"0"/"true"/"false" (case-insensitive)
                expect(sb.activeFlag('1')).toBe(true);
                expect(sb.activeFlag('true')).toBe(true);
                expect(sb.activeFlag('0')).toBe(false);
                expect(sb.activeFlag('false')).toBe(false);  // explicit "0"/"false" mean OFF (real DB data)
                expect(sb.activeFlag('')).toBe(false);
                // array form [value, ...flags] is unwrapped first
                expect(sb.activeFlag(['1', 'isEditable'])).toBe(true);
                expect(sb.activeFlag(['0', 'isEditable'])).toBe(false);
                // a config error (unresolved placeholder) fails closed -> inactive
                expect(sb.activeFlag('${unresolved}')).toBe(false);
            });
    });

    it('resolveConfigTokens substitutes varObj-first, falls back to global, warns on miss', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                // varObj-first: a key on varObj wins over the same key on global.
                sb.varObj.tokA = 'fromVarObj';
                sb.tokA = 'fromGlobal';
                expect(sb.resolveConfigTokens('${tokA}', 'X')).toBe('fromVarObj');
                // global fallback when not on varObj.
                delete sb.varObj.tokB;
                sb.tokB = 'fromGlobal';
                expect(sb.resolveConfigTokens('x-${tokB}-y', 'X')).toBe('x-fromGlobal-y');
                // A legitimately-stored empty string still substitutes (sentinel correctness).
                sb.varObj.tokEmpty = '';
                expect(sb.resolveConfigTokens('[${tokEmpty}]', 'X')).toBe('[]');
                // Truly-unresolved placeholder is left raw (not silently "").
                delete sb.varObj.tokMissing;
                delete sb.tokMissing;
                expect(sb.resolveConfigTokens('${tokMissing}', 'X')).toBe('${tokMissing}');
                // No-placeholder strings and non-strings pass through.
                expect(sb.resolveConfigTokens('plain', 'X')).toBe('plain');
            });
    });

    it('exposes both token helpers: $(name) resolveTokens and ${name} resolveConfigTokens', function () {
        // Two token syntaxes coexist on the runtime surface:
        //   - resolveTokens   resolves $(name) tokens in Param strings (Send* / SetVariables).
        //   - resolveConfigTokens resolves ${name} tokens from setupConfig.
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                expect(typeof result.sandbox.resolveTokens).toBe('function');
                expect(typeof result.sandbox.resolveConfigTokens).toBe('function');
            });
    });

    it('routes SendSMS / SendEmail to GUI-exit (JS twins disabled, functions still defined)', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                // Twins disabled: no longer registered as inline JS handlers.
                expect(sb.RTDS_OPERATIONS.has('sendSms')).toBe(false);
                expect(sb.RTDS_OPERATIONS.has('sendMail')).toBe(false);
                // They now route to the canvas components via GUI-exit keys.
                expect(sb.RTDS_EXIT_KEYS.get('sendSms')).toBe('send_sms');
                expect(sb.RTDS_EXIT_KEYS.get('sendMail')).toBe('send_mail');
                // The executeXxx functions remain defined (dead code, re-enableable).
                expect(typeof sb.executeSendSms).toBe('function');
                expect(typeof sb.executeSendEmail).toBe('function');
            });
    });

    // Injects a Vocalls-shaped jsonHttpRequest (the test harness default
    // resolves to a fetch Response, which would never expose success:true).
    function withGateway(sb, gatewayResult, capture) {
        sb._rtBaseUrl = 'https://api.example';
        sb._rtSmsEndpoint = '/sms';
        sb._rtMailEndpoint = '/mail';
        sb._headers = {};
        sb.jsonHttpRequest = function (url, opts, headers, body) {
            if (capture) { capture.url = url; capture.body = body; }
            var promise = {
                withTimeout: function () { return promise; },
                then: function (onOk) { return Promise.resolve(onOk(gatewayResult)); }
            };
            return promise;
        };
    }

    it('executeSendSms branches to NextStep_Success on gateway success', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                var capture = {};
                withGateway(sb, { success: true, statusCode: 200 }, capture);
                return sb.executeSendSms({
                    id: 'sms-1', type: 'sendSMS', name: 'sms',
                    params: {
                        active: true, to: '+32478306999', from: '8850', routing: 'LPA_DEV',
                        body: 'hi', smsAccountId: 47,
                        nextStep: '00012', nextStep_Success: '00011', nextStep_Failure: '00099'
                    }
                }).then(function (out) {
                    expect(out.nextStepId).toBe('00011');
                    expect(capture.url).toBe('https://api.example/sms');
                    expect(capture.body.to).toBe('+32478306999');
                    expect(capture.body.smsAccountId).toBe(47);
                });
            });
    });

    it('executeSendSms branches to NextStep_Failure on gateway non-success', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                withGateway(sb, { success: false, statusCode: 502 });
                return sb.executeSendSms({
                    id: 'sms-2', type: 'sendSMS', name: 'sms',
                    params: {
                        active: true, to: '+32478306999', from: '8850', routing: 'LPA_DEV',
                        body: 'hi', smsAccountId: 47,
                        nextStep: '00012', nextStep_Success: '00011', nextStep_Failure: '00099'
                    }
                }).then(function (out) {
                    expect(out.nextStepId).toBe('00099');
                });
            });
    });

    it('executeSendSms skips to NextStep when inactive (sync, no HTTP)', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                var called = false;
                sb.jsonHttpRequest = function () { called = true; throw new Error('should not POST'); };
                var out = sb.executeSendSms({
                    id: 'sms-3', type: 'sendSMS', name: 'sms',
                    params: { active: false, to: '+32478306999', nextStep: '00012' }
                });
                expect(out.nextStepId).toBe('00012');
                expect(called).toBe(false);
            });
    });

    it('executeSendSms skips to NextStep on invalid phone number', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                var out = sb.executeSendSms({
                    id: 'sms-4', type: 'sendSMS', name: 'sms',
                    params: { active: true, to: 'not-a-number', nextStep: '00012' }
                });
                expect(out.nextStepId).toBe('00012');
            });
    });

    it('executeSendEmail builds a recipient list and branches on success', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                var capture = {};
                withGateway(sb, { success: true, statusCode: 200 }, capture);
                return sb.executeSendEmail({
                    id: 'mail-1', type: 'sendEmail', name: 'mail',
                    params: {
                        active: true, from: 'noreply@n-allo.be',
                        to: 'a@x.be; b@x.be', cc: '', subject: 'Hi', body: 'Body', priority: 9,
                        nextStep: '00022', nextStep_Success: '00021', nextStep_Failure: '00099'
                    }
                }).then(function (out) {
                    expect(out.nextStepId).toBe('00021');
                    expect(capture.url).toBe('https://api.example/mail');
                    expect(capture.body.to).toEqual(['a@x.be', 'b@x.be']);
                    expect(capture.body.priority).toBe(2); // out-of-range coerced
                    expect(capture.body.hasOwnProperty('cc')).toBe(false); // empty dropped
                });
            });
    });

    it('executeSendEmail skips to NextStep when To is empty', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                var out = sb.executeSendEmail({
                    id: 'mail-2', type: 'sendEmail', name: 'mail',
                    params: { active: true, from: 'noreply@n-allo.be', to: '', nextStep: '00022' }
                });
                expect(out.nextStepId).toBe('00022');
            });
    });

    it('runStep chains through an async handler and resolves to the exit key', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                // Two-op flow: an async op that resolves to step 2, then a
                // GUI-exit op. runStep must await the promise and return the key.
                var ops = [
                    { id: '1', type: 'asyncProbe', name: 'a', isFirstOperation: true, params: { nextStep: '2' } },
                    { id: '2', type: 'say', name: 'p', params: {} }
                ];
                sb.context.session.variables.RTDS_opIndex = sb.buildOpIndex(ops);
                sb.registerRtdsOperation('asyncProbe', function (op) {
                    return Promise.resolve({ nextStepId: '2' });
                });

                var ret = sb.runStep('1');
                expect(typeof ret.then).toBe('function');
                return ret.then(function (exitKey) {
                    expect(exitKey).toBe('play_prompt');
                });
            });
    });

    it('exposes getScoped with varObj-first / global-fallback semantics', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                expect(typeof sb.getScoped).toBe('function');
                expect(sb.getScoped('missingKey', 'fallback')).toBe('fallback');
                sb.varObj.scopedProbe = 'fromVarObj';
                sb.scopedProbe = 'fromGlobal';
                expect(sb.getScoped('scopedProbe', null)).toBe('fromVarObj');
                delete sb.varObj.scopedProbe;
                expect(sb.getScoped('scopedProbe', null)).toBe('fromGlobal');
                delete sb.scopedProbe;
            });
    });

    it('runStep skips an unregistered op type to its NextStep with a warning', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                // Unregistered type 'condition' (mock removed) → must skip to
                // NextStep '2' (a GUI-exit op) rather than hard-disconnect.
                var ops = [
                    { id: '1', type: 'condition', name: 'c', isFirstOperation: true, params: { nextStep: '2' } },
                    { id: '2', type: 'say', name: 'p', params: {} }
                ];
                sb.context.session.variables.RTDS_opIndex = sb.buildOpIndex(ops);
                expect(sb.RTDS_REGISTRY.has('condition')).toBe(false);
                expect(sb.runStep('1')).toBe('play_prompt');
            });
    });

    it('runStep disconnects when an unregistered op has no NextStep', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                var ops = [
                    { id: '1', type: 'condition', name: 'c', isFirstOperation: true, params: {} }
                ];
                sb.context.session.variables.RTDS_opIndex = sb.buildOpIndex(ops);
                expect(sb.runStep('1')).toBe('disconnect');
            });
    });

    it('runStep breaks a cyclic NextStep chain among unregistered ops (no hang)', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                // 1 → 2 → 1 among unregistered types. Without the step-budget
                // guard this would loop forever; it must disconnect instead once
                // the budget is exhausted.
                var ops = [
                    { id: '1', type: 'condition', name: 'c1', isFirstOperation: true, params: { nextStep: '2' } },
                    { id: '2', type: 'schedule', name: 's1', params: { nextStep: '1' } }
                ];
                sb.context.session.variables.RTDS_opIndex = sb.buildOpIndex(ops);
                expect(sb.runStep('1')).toBe('disconnect');
                expect(sb.context.session.variables.RTDS_error).toBe('RTDS_CYCLE_DETECTED');
            });
    });

    it('runStep allows a step to be legitimately revisited (not a false cycle)', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                // A retry/reprompt-style loop: step '1' routes back to itself a
                // bounded number of times, then exits to a GUI op. The old
                // node-revisit guard killed the call the second time '1' was
                // entered; the step-budget guard must let bounded revisits run
                // and reach the GUI exit ('play_prompt').
                var hits = 0;
                var ops = [
                    { id: '1', type: 'retryProbe', name: 'r', isFirstOperation: true, params: {} },
                    { id: '2', type: 'say', name: 'p', params: {} }
                ];
                sb.context.session.variables.RTDS_opIndex = sb.buildOpIndex(ops);
                sb.registerRtdsOperation('retryProbe', function () {
                    hits++;
                    // Revisit '1' three times, then advance to the GUI op '2'.
                    return { nextStepId: hits < 3 ? '1' : '2' };
                });
                expect(sb.runStep('1')).toBe('play_prompt');
                expect(hits).toBe(3);
            });
    });

    it('runStep budget spans async hops (async cycle disconnects, not hangs)', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                // Async A→B→A loop: each hop resolves a thenable and re-enters
                // runStep. The budget is threaded through the async re-entry, so
                // a fresh cap is NOT minted per hop — the run terminates with a
                // disconnect instead of recursing forever.
                var ops = [
                    { id: '1', type: 'asyncA', name: 'a', isFirstOperation: true, params: {} },
                    { id: '2', type: 'asyncB', name: 'b', params: {} }
                ];
                sb.context.session.variables.RTDS_opIndex = sb.buildOpIndex(ops);
                sb.registerRtdsOperation('asyncA', function () {
                    return Promise.resolve({ nextStepId: '2' });
                });
                sb.registerRtdsOperation('asyncB', function () {
                    return Promise.resolve({ nextStepId: '1' });
                });
                return sb.runStep('1').then(function (exitKey) {
                    expect(exitKey).toBe('disconnect');
                    expect(sb.context.session.variables.RTDS_error).toBe('RTDS_CYCLE_DETECTED');
                });
            });
    });
});
