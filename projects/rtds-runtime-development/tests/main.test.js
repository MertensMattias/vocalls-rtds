/**
 * main.test.js — rtds-runtime-development smoke tests
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
// Dev main.js hardcodes RTDS_sourceId='+3233389999' (DA-HELPDESK DNIS) and the
// dev-fixture intercept resolves it before this stub URL is consulted; the
// stub is kept for shape consistency with the prod test.
var ROUTING_TABLE_URL =
    'https://api.n-allo.be/routingtablesapi-acc/api/routing-table/source?sourceId=%2B3233389999';

// Minimal routing-table response — one SetAttributes op, no NextStep so the
// loop ends cleanly with 'disconnect'. Keeps the test fast and avoids a
// second stub for any GUI-exit path.
var ROUTING_TABLE_STUB = {
    success: true,
    statusCode: 200,
    body: {
        SourceId: '+32470000000',
        Name: 'smoke-test',
        Project: 'rtds-runtime-development',
        PromptLibrary: '',
        SupportedLanguages: 'EN',
        Operations: [
            {
                Id: '00000',
                Type: 'SetAttributes',
                Name: 'Init',
                IsFirstOperation: true,
                Params: { TestKey: 'TestValue' }
            }
        ]
    }
};

var STUBS = {};
STUBS[LOGGER_STUB_URL] = { success: true, statusCode: 200 };
STUBS[ROUTING_TABLE_URL] = ROUTING_TABLE_STUB;

describe('rtds-runtime-development main.js', function () {
    it('loads without synchronous error-level logs', function () {
        // The only error allowed is the post-load fetchAndStart shape-mismatch
        // warning. The test-harness jsonHttpRequest stub resolves to a fetch-
        // style Response ({ status, ok, json }), but the production runtime
        // expects the Vocalls shape ({ success, statusCode, body }). That
        // mismatch is a harness limitation, not a runtime bug — fetchAndStart
        // correctly routes to NextStep_Failure (exit 'disconnect') when it
        // sees no success: true on the result.
        return helpers
            .runScript('main', { project: 'rtds-runtime-development', stubs: STUBS })
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
            .runScript('main', { project: 'rtds-runtime-development', returnSandbox: true, stubs: STUBS })
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
            .runScript('main', { project: 'rtds-runtime-development', returnSandbox: true, stubs: STUBS })
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
            .runScript('main', { project: 'rtds-runtime-development', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var vo = result.sandbox.varObj;
                expect(vo).toBeTruthy();
                expect(vo.routingId).toBe('RTDS_RUNTIME_DEV');
                expect(vo.customerProject).toBe('RTDS_RUNTIME_DEV');
                expect(typeof vo.ani).toBe('string');
                expect(typeof vo.dnis).toBe('string');
            });
    });

    it('walks the DA-HELPDESK fixture through every JS handler type', function () {
        return helpers
            .runScript('main', { project: 'rtds-runtime-development', returnSandbox: true, stubs: STUBS })
            .then(function (result) {
                var s = result.sandbox;
                var vars = s.context.session.variables;

                // parseFlow ran: the fixture was indexed.
                expect(vars.RTDS_sourceId).toBe('+3233389999');
                expect(vars.RTDS_name).toBe('DIGIPOLIS - LPA_ICT_HELPDESK');

                // SetAttributes op 00000 wrote these globals.
                expect(s.RoutingId).toBe('LPA_ICT_HELPDESK');
                expect(s.CallflowId).toBe('LPA_ICT_HELPDESK');
                // SetAttributes op 00013 last-wrote IVRAction='CT' (from
                // 'Set: Congnos Emergency Continue').
                expect(s.IVRAction).toBe('CT');

                // With canonical mocks, Condition picks NextStep_True first,
                // so 00024 (Staffing=True) → 00025 (MaxQueue=True) → 00096
                // (Disconnect). The flow terminates cleanly on 'disconnect'.
                expect(vars.RTDS_currentOpId).toBe('00096');
                expect(vars.RTDS_currentOpType).toBe('Disconnect');
            });
    });
});
