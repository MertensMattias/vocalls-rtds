/**
 * Component contract-test harness.
 *
 * RTDS operation components (rtds/components/*.js) are Vocalls Designer mxGraph
 * XML and cannot be executed directly by Jest. Their behaviour contract —
 * params in -> chosen NextStep out — is mirrored by the runtime twin
 * (executeXxx in rtds_2_runtime.js), which is plain JS the runtime loads. This
 * harness loads that runtime via the existing testHelpers sandbox and exposes a
 * small surface for asserting the branch contract of a twin.
 *
 * See conventions/lockstep.md: the twin and the component must stay aligned, so
 * a contract test on the twin guards the component's branch contract too.
 *
 *   var h = require('./_harness');
 *   return h.loadRuntime().then(function (sb) {
 *       var gw = h.withGateway(sb, { success: true, statusCode: 200 });
 *       return sb.executeSendSms({ ... }).then(function (out) {
 *           expect(out.nextStepId).toBe('00011');
 *           expect(gw.lastBody.to).toBe('+32478306999');
 *       });
 *   });
 */

var path = require('path');
var helpers = require(path.join(process.cwd(), 'core', 'testHelpers'));

// Minimal routing-table stub so main.js boots cleanly (one SetVariables op,
// no NextStep -> loop ends). Mirrors main.test.js so component tests get the
// same booted sandbox without re-declaring stub plumbing.
var LOGGER_STUB_URL = 'https://api.n-allo.be/ivrapi-acc/api/EventLog';
var ROUTING_TABLE_URL =
    'https://api.n-allo.be/routingtablesapi-acc/api/routing-table/source?sourceId=080012345';

var ROUTING_TABLE_STUB = {
    success: true,
    statusCode: 200,
    body: {
        sourceId: '+32470000000',
        name: 'component-contract-test',
        project: 'rtds-runtime',
        promptLibrary: '',
        supportedLanguages: 'EN',
        operations: [
            {
                id: '00000',
                type: 'SetVariables',
                name: 'Init',
                isFirstOperation: true,
                params: { TestKey: 'TestValue' }
            }
        ]
    }
};

var STUBS = {};
STUBS[ROUTING_TABLE_URL] = ROUTING_TABLE_STUB;
STUBS[LOGGER_STUB_URL] = { success: true, statusCode: 200 };

/**
 * Boot the rtds-runtime sandbox and resolve to it.
 * @returns {Promise<Object>} the loaded sandbox (exposes executeXxx, registry, ...)
 */
function loadRuntime() {
    return helpers
        .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
        .then(function (result) {
            return result.sandbox;
        });
}

/**
 * Install a Vocalls-shaped jsonHttpRequest that resolves every HTTP-calling
 * twin to `gatewayResult`. Returns a capture object whose `lastUrl` / `lastBody`
 * reflect the most recent call, so a test can assert the payload contract.
 *
 * The default testHelpers stub resolves to a fetch-style Response that never
 * exposes `success: true`; HTTP twins need this Vocalls shape instead.
 */
function withGateway(sb, gatewayResult) {
    var capture = { lastUrl: null, lastBody: null, calls: 0 };
    sb._rtBaseUrl = 'https://api.example';
    sb._rtSmsEndpoint = '/sms';
    sb._rtMailEndpoint = '/mail';
    sb._headers = {};
    sb.jsonHttpRequest = function (url, opts, headers, body) {
        capture.calls += 1;
        capture.lastUrl = url;
        capture.lastBody = body;
        var promise = {
            withTimeout: function () { return promise; },
            then: function (onOk) { return Promise.resolve(onOk(gatewayResult)); }
        };
        return promise;
    };
    return capture;
}

/**
 * Install a jsonHttpRequest that fails the test if the operation GATEWAY is
 * called, while letting Logger's EventLog POST resolve harmlessly. Use for
 * inactive / validation-skip scenarios that must not reach the SMS/mail gateway
 * but may still emit a warn (which posts to EventLog).
 *
 * "Gateway" = a URL on sb._rtBaseUrl. The EventLog logger URL is a different
 * host and is allowed through (resolved as success).
 */
function forbidGateway(sb) {
    var state = { called: false };
    sb._rtBaseUrl = 'https://api.example';
    var okPromise = {
        withTimeout: function () { return okPromise; },
        then: function (onOk) {
            return Promise.resolve(onOk({ success: true, statusCode: 200 }));
        }
    };
    sb.jsonHttpRequest = function (url) {
        if (typeof url === 'string' && url.indexOf(sb._rtBaseUrl) === 0) {
            state.called = true;
            throw new Error('operation gateway called on a no-gateway path: ' + url);
        }
        return okPromise; // EventLog / other logging POSTs resolve quietly
    };
    return state;
}

module.exports = {
    loadRuntime: loadRuntime,
    withGateway: withGateway,
    forbidGateway: forbidGateway
};
