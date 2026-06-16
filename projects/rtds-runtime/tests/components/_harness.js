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
 *       // Twins stage __rtOutcome (the engine resolves the step id); they
 *       // return a thenable (async) or undefined (sync), not { nextStepId }.
 *       return Promise.resolve(sb.executeSendSms({ ... })).then(function () {
 *           expect(sb.__rtOutcome).toBe('nextStep_Success');
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
// `vocalls-master-layer` object's Code attribute) in a sandbox WITH the shared
// env library loaded — proving the component's __fn aliases (e.g. __setupConfig)
// delegate correctly to the shared library functions, with no inline drift.
// See conventions/params.md + specs/_setupConfig.spec.md.

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

// Extract and decode a named attribute (e.g. Code / OnEnter) of the <object>
// with the given id from a component .js (mxGraph XML) file. Lets a test run a
// specific node's body in isolation — a GUI-exit component such as `say` has no
// runtime twin, so its init/work/output node bodies are exercised directly.
// Returns '' when the attribute is absent on the object, null when no object
// with that id exists.
function readNodeAttr(componentName, objectId, attrName) {
    var file = path.join(process.cwd(), 'rtds', 'components', componentName + '.js');
    var raw = fs.readFileSync(file, 'utf8');
    var chunks = raw.split('<object');
    for (var i = 1; i < chunks.length; i++) {
        // Attribute values entity-encode '<' and '>', so the first literal '>'
        // is the end of the opening tag — header holds just this object's attrs.
        var header = chunks[i].slice(0, chunks[i].indexOf('>'));
        if (header.indexOf('id="' + objectId + '"') === -1) continue;
        var k = header.indexOf(attrName + '=');
        if (k === -1) return '';
        var delim = header.charAt(k + attrName.length + 1); // the quote after '='
        var start = k + attrName.length + 2;
        var end = header.indexOf(delim, start);             // delimiter is escaped inside
        return decodeEntities(header.slice(start, end));
    }
    return null;
}

// The shared env library (rtds_3_vocallsEnv.js) evaluates cleanly in a bare
// sandbox — it only references Logger/context/varObj at call time, not at load —
// and exposes the shared helpers (setupConfig, extractParams, getValue, hasKey,
// getScoped, resolveConfigTokens, walk, nowUTC, activeFlag, ...). Components now
// alias these via __fn wrappers instead of carrying inline copies, so the master
// Code must run WITH the shared library loaded for the aliases to resolve. We
// load it once and cache the source.
var ENV_LIB_PATH = path.join(
    process.cwd(), 'projects', 'rtds-runtime', 'globalLibraries', 'active', 'rtds_3_vocallsEnv.js'
);
var _envLibSrc = null;
function envLibSrc() {
    if (_envLibSrc === null) _envLibSrc = fs.readFileSync(ENV_LIB_PATH, 'utf8');
    return _envLibSrc;
}

// isMobileNumber lives in rtds_2_runtime.js, which cannot eval standalone (it
// needs registry/log globals). The function itself is self-contained, so we
// provide it verbatim from rtds_2_runtime.js for components whose __isMobileNumber
// alias delegates to it.
function sharedIsMobileNumber(phone) {
    if (phone == null || phone === '') return false;
    var normalized = String(phone).replace(/[\s\-().]/g, '');
    if (normalized.indexOf('00') === 0) normalized = '+' + normalized.slice(2);
    var intl = /^\+[1-9]\d{6,14}$/;
    var national = /^[1-9]\d{6,14}$/;
    return intl.test(normalized) || national.test(normalized);
}

/**
 * Run a component's master Code in a sandbox WITH the shared env library loaded,
 * so the component's __fn aliases resolve to the real shared functions. Returns
 * the sandbox (exposing __setupConfig, __activeFlag, etc.). This proves the
 * alias delegation is wired correctly and the resolved-Param contract matches
 * specs/_setupConfig.spec.md against the real shared implementations.
 *
 * @param {string} componentName e.g. 'sendSms'
 * @param {Object} [seed] optional { varObj, global } overrides
 * @returns {Object} the populated sandbox
 */
function loadMasterCode(componentName, seed) {
    seed = seed || {};
    var warns = [];
    var loggerStub = {
        debug: function () {}, info: function () {},
        warn: function () { warns.push(Array.prototype.slice.call(arguments)); },
        error: function () {}
    };
    var sb = {
        context: { currentNode: { id: '' } },
        Logger: loggerStub,
        varObj: seed.varObj || {}
    };
    sb.global = sb;
    sb.globalThis = sb;
    if (seed.global) {
        for (var key in seed.global) {
            if (seed.global.hasOwnProperty(key)) sb[key] = seed.global[key];
        }
    }
    vm.createContext(sb);
    // Load the real shared library so component __fn aliases delegate to it.
    vm.runInContext(envLibSrc(), sb);
    // rtds_3 installs its own Logger (which POSTs warns via log_debug). Restore
    // the capturing stub so both the shared resolveConfigTokens and the component
    // warn through it — and the env logging primitives are no-ops in the sandbox.
    sb.Logger = loggerStub;
    sb.log_debug = function () {};
    sb.log_error = function () {};
    // Provide isMobileNumber (self-contained, lives in rtds_2 which can't eval here).
    if (typeof sb.isMobileNumber === 'undefined') sb.isMobileNumber = sharedIsMobileNumber;
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
    readMasterCode: readMasterCode,
    readNodeAttr: readNodeAttr
};
