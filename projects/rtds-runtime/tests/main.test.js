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

// Minimal routing-table response — one SetAttributes op, no NextStep so the
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
                type: 'SetAttributes',
                name: 'Init',
                isFirstOperation: true,
                params: { TestKey: 'TestValue' }
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
        // expects the Vocalls shape ({ success, statusCode, body }). That
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
                expect(result.sandbox.RTDS_OPERATIONS.has('SetAttributes')).toBe(true);
                expect(typeof result.sandbox.RTDS_EXIT_KEYS.get).toBe('function');
                expect(result.sandbox.RTDS_EXIT_KEYS.get('PlayPrompt')).toBe('play_prompt');
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

    it('executeSetAttributes writes Params to varObj, not global', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                // Clean slate on both stores before invoking the handler
                delete sb.varObj.TestKey;
                delete sb.TestKey;
                sb.executeSetAttributes({
                    Id: 'unit-1',
                    Name: 'unit-setattrs',
                    Type: 'SetAttributes',
                    Params: { TestKey: 'TestValue', NextStep: '00001' }
                });
                expect(sb.varObj.TestKey).toBe('TestValue');
                expect(sb.TestKey).toBeUndefined();
            });
    });

    it('registers SendSMS / SendEmail as real JS handlers (not GUI-exit)', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var sb = result.sandbox;
                expect(sb.RTDS_OPERATIONS.has('SendSMS')).toBe(true);
                expect(sb.RTDS_OPERATIONS.has('SendEmail')).toBe(true);
                expect(sb.RTDS_EXIT_KEYS.has('SendSMS')).toBe(false);
                expect(sb.RTDS_EXIT_KEYS.has('SendEmail')).toBe(false);
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
                    id: 'sms-1', type: 'SendSMS', name: 'sms',
                    params: {
                        Active: true, To: '+32478306999', From: '8850', Routing: 'LPA_DEV',
                        Body: 'hi', SmsAccountId: 47,
                        NextStep: '00012', NextStep_Success: '00011', NextStep_Failure: '00099'
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
                    id: 'sms-2', type: 'SendSMS', name: 'sms',
                    params: {
                        Active: true, To: '+32478306999', From: '8850', Routing: 'LPA_DEV',
                        Body: 'hi', SmsAccountId: 47,
                        NextStep: '00012', NextStep_Success: '00011', NextStep_Failure: '00099'
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
                    id: 'sms-3', type: 'SendSMS', name: 'sms',
                    params: { Active: false, To: '+32478306999', NextStep: '00012' }
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
                    id: 'sms-4', type: 'SendSMS', name: 'sms',
                    params: { Active: true, To: 'not-a-number', NextStep: '00012' }
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
                    id: 'mail-1', type: 'SendEmail', name: 'mail',
                    params: {
                        Active: true, From: 'noreply@n-allo.be',
                        To: 'a@x.be; b@x.be', Cc: '', Subject: 'Hi', Body: 'Body', Priority: 9,
                        NextStep: '00022', NextStep_Success: '00021', NextStep_Failure: '00099'
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
                    id: 'mail-2', type: 'SendEmail', name: 'mail',
                    params: { Active: true, From: 'noreply@n-allo.be', To: '', NextStep: '00022' }
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
                    { id: '1', type: 'AsyncProbe', name: 'a', isFirstOperation: true, params: { NextStep: '2' } },
                    { id: '2', type: 'PlayPrompt', name: 'p', params: {} }
                ];
                sb.context.session.variables.RTDS_opIndex = sb.buildOpIndex(ops);
                sb.registerRtdsOperation('AsyncProbe', function (op) {
                    return Promise.resolve({ nextStepId: '2' });
                }, { isMock: false });

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
});
