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
var fs = require('fs');
var vm = require('vm');
var helpers = require(path.join(process.cwd(), 'core', 'testHelpers'));

// --- component master-Code execution -------------------------------------
// The contract tests above exercise the runtime TWIN. The helpers below let a
// test execute a component's OWN master-layer Code (the entity-encoded JS in the
// `vocalls-master-layer` object's Code attribute) in an isolated sandbox with NO
// env library loaded — proving the component's inline helper fallbacks make
// __setupConfig self-contained. See conventions/params.md + specs/_setupConfig.spec.md.

function decodeEntities(s) {
    return s
        .replace(/&#xa;/g, '\n')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

// Extract and decode the FIRST Code="..." (or Code='...') attribute — the
// master-layer block — from a component .js (mxGraph XML) file.
function readMasterCode(componentName) {
    var file = path.join(process.cwd(), 'rtds', 'components', componentName + '.js');
    var raw = fs.readFileSync(file, 'utf8');
    var k = raw.indexOf('Code=');
    var delim = raw[k + 5];          // the quote char right after "Code="
    var start = k + 6;
    var end = raw.indexOf(delim, start); // JS has no unescaped delimiter inside
    return decodeEntities(raw.slice(start, end));
}

/**
 * Run a component's master Code in an isolated sandbox WITHOUT the env library,
 * so only the component's own inline fallbacks are available. Returns the
 * sandbox (exposing __setupConfig, __activeFlag, etc.).
 *
 * @param {string} componentName e.g. 'sendSms'
 * @param {Object} [seed] optional { varObj, global } overrides
 * @returns {Object} the populated sandbox
 */
function loadMasterCode(componentName, seed) {
    seed = seed || {};
    var warns = [];
    var sb = {
        context: { currentNode: { id: '' } },
        Logger: {
            debug: function () {}, info: function () {},
            warn: function () { warns.push(Array.prototype.slice.call(arguments)); },
            error: function () {}
        },
        varObj: seed.varObj || {}
    };
    sb.global = sb;
    sb.globalThis = sb;
    // The env library is intentionally absent here (we test the component's own
    // inline fallbacks), but Active coercion is NOT a fallback — the component's
    // __activeFlag is a thin alias to the runtime global activeFlag(), which is
    // always loaded in production. Provide it so the alias resolves; body is the
    // single Active contract from rtds_3_vocallsEnv.js, verbatim.
    sb.activeFlag = function (value) {
        if (Object.prototype.toString.call(value) === '[object Array]') {
            value = value.length ? value[0] : false;
        }
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value === 1;
        var s = String(value).trim().toLowerCase();
        return s === '1' || s === 'true';
    };
    if (seed.global) {
        for (var key in seed.global) {
            if (seed.global.hasOwnProperty(key)) sb[key] = seed.global[key];
        }
    }
    vm.createContext(sb);
    vm.runInContext(readMasterCode(componentName), sb);
    sb.__warns = warns;
    return sb;
}

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
    forbidGateway: forbidGateway,
    loadMasterCode: loadMasterCode,
    readMasterCode: readMasterCode
};
