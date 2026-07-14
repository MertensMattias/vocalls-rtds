/**
 * fallbackCache.test.js — fetchAndStart network-first Storage fallback
 *
 * Covers the design in
 * docs/superpowers/specs/2026-07-14-routing-table-fallback-cache-design.md:
 * attempt 1 at _rtFetchTimeoutMs; transient failure -> serve cached config;
 * cache miss -> one retry at _rtFetchRetryTimeoutMs; 4xx authoritative;
 * cache written only after a startable config; RTDS_error only on disconnect
 * paths (the segmentLog terminal classifier reads it).
 *
 * Run:
 *   npm test
 */

var path = require('path');
var helpers = require(path.join(process.cwd(), 'core', 'testHelpers'));

var LOGGER_STUB_URL = 'https://api.n-allo.be/ivrapi-acc/api/EventLog';
var ROUTING_TABLE_URL =
    'https://api.n-allo.be/routingtablesapi-acc/api/routing-table/source?sourceId=080012345';

var STUBS = {};
STUBS[LOGGER_STUB_URL] = { success: true, statusCode: 200 };
STUBS[ROUTING_TABLE_URL] = { success: true, statusCode: 200 };

// One-op flow ending in a GUI exit ('say_message') so a successful start is
// distinguishable from the failure exit ('disconnect').
var FLOW = {
    sourceId: 'SRC-1',
    name: 'fallback-cache-test',
    project: 'rtds-runtime',
    promptLibrary: '',
    supportedLanguages: 'EN',
    operations: [
        { id: '1', type: 'say', name: 'greet', isFirstOperation: true, params: {} }
    ]
};

var OK_RESULT = { success: true, statusCode: 200, response: FLOW };

var CACHE_KEY = 'rtdsConfig_SRC-1.json';

// Vocalls-shaped jsonHttpRequest fake. `script` is an array of per-call
// outcomes: { resolve: value } or { reject: err }. Records url + the
// withTimeout(ms) value per call on fn.calls. Logger EventLog traffic also
// flows through the jsonHttpRequest global -- absorb it quietly so fn.calls
// counts only routing-table fetches.
function makeHttp(script) {
    var calls = [];
    var fn = function (url) {
        if (String(url).indexOf('/routing-table/source') === -1) {
            var quiet = {
                withTimeout: function () { return quiet; },
                then: function (onOk) {
                    return Promise.resolve(onOk({ success: true, statusCode: 200 }));
                }
            };
            return quiet;
        }
        var call = { url: url, timeoutMs: null };
        calls.push(call);
        var outcome = script[Math.min(calls.length - 1, script.length - 1)];
        var p = (outcome && outcome.reject !== undefined)
            ? Promise.reject(outcome.reject)
            : Promise.resolve(outcome && outcome.resolve);
        var thenable = {
            withTimeout: function (ms) { call.timeoutMs = ms; return thenable; },
            then: function (onOk, onErr) { return p.then(onOk, onErr); }
        };
        return thenable;
    };
    fn.calls = calls;
    return fn;
}

function cacheEntry(fetchedAt, config) {
    return JSON.stringify({
        sourceId: 'SRC-1',
        fetchedAt: fetchedAt,
        config: config || FLOW
    });
}

// Loads the runtime sandbox and resets the session state the load-time smoke
// run may have left behind (main.js runs fetchAndStart once on load).
function setup(script) {
    return helpers
        .runScript('main', { project: 'rtds-runtime', returnSandbox: true, stubs: STUBS })
        .then(function (result) {
            var sb = result.sandbox;
            sb._headers = {};
            sb.jsonHttpRequest = makeHttp(script);
            delete sb.context.session.variables.RTDS_error;
            delete sb.context.session.variables.RTDS_configSource;
            return sb;
        });
}

describe('fetchAndStart fallback cache', function () {
    it('cold success: starts the flow, writes the cache, marks source=api', function () {
        return setup([{ resolve: OK_RESULT }]).then(function (sb) {
            return Promise.resolve(sb.fetchAndStart('SRC-1')).then(function (exitKey) {
                expect(exitKey).toBe('say_message');
                expect(sb.context.session.variables.RTDS_configSource).toBe('api');
                expect(sb.context.session.variables.RTDS_error).toBeUndefined();
                expect(sb.jsonHttpRequest.calls).toHaveLength(1);
                expect(sb.jsonHttpRequest.calls[0].timeoutMs).toBe(2000);
                var stored = sb.Storage.readFile(CACHE_KEY);
                expect(stored.success).toBe(true);
                var entry = JSON.parse(stored.text);
                expect(entry.sourceId).toBe('SRC-1');
                expect(typeof entry.fetchedAt).toBe('number');
                expect(entry.config.name).toBe('fallback-cache-test');
            });
        });
    });

    it('transient failure with warm cache: serves cache, no retry, no RTDS_error', function () {
        return setup([{ reject: new Error('Request timeout after 2000ms') }]).then(function (sb) {
            sb.Storage.writeFile(CACHE_KEY, cacheEntry(Date.now()));
            return Promise.resolve(sb.fetchAndStart('SRC-1')).then(function (exitKey) {
                expect(exitKey).toBe('say_message');
                expect(sb.context.session.variables.RTDS_configSource).toBe('cache');
                // segmentLog invariant: a cache-served call is NOT an error call.
                expect(sb.context.session.variables.RTDS_error).toBeUndefined();
                expect(sb.jsonHttpRequest.calls).toHaveLength(1);
            });
        });
    });

    it('5xx with warm cache: serves cache (transient, not authoritative)', function () {
        return setup([{ resolve: { success: false, statusCode: 503 } }]).then(function (sb) {
            sb.Storage.writeFile(CACHE_KEY, cacheEntry(Date.now()));
            return Promise.resolve(sb.fetchAndStart('SRC-1')).then(function (exitKey) {
                expect(exitKey).toBe('say_message');
                expect(sb.context.session.variables.RTDS_configSource).toBe('cache');
                expect(sb.context.session.variables.RTDS_error).toBeUndefined();
            });
        });
    });

    it('transient failure with no cache: retries at 10000ms and starts on retry success', function () {
        return setup([
            { reject: new Error('Request timeout after 2000ms') },
            { resolve: OK_RESULT }
        ]).then(function (sb) {
            return Promise.resolve(sb.fetchAndStart('SRC-1')).then(function (exitKey) {
                expect(exitKey).toBe('say_message');
                expect(sb.context.session.variables.RTDS_configSource).toBe('api');
                expect(sb.jsonHttpRequest.calls).toHaveLength(2);
                expect(sb.jsonHttpRequest.calls[1].timeoutMs).toBe(10000);
                expect(sb.Storage.readFile(CACHE_KEY).success).toBe(true);
            });
        });
    });

    it('transient failure with no cache and failed retry: disconnects with RTDS_error', function () {
        return setup([
            { reject: new Error('Request timeout after 2000ms') },
            { reject: new Error('Request timeout after 10000ms') }
        ]).then(function (sb) {
            return Promise.resolve(sb.fetchAndStart('SRC-1')).then(function (exitKey) {
                expect(exitKey).toBe('disconnect');
                expect(sb.context.session.variables.RTDS_error).toBe('RTDS_REQUEST_ERROR');
                expect(sb.jsonHttpRequest.calls).toHaveLength(2);
            });
        });
    });

    it('4xx is authoritative: disconnects immediately even with a warm cache', function () {
        return setup([{ resolve: { success: false, statusCode: 404 } }]).then(function (sb) {
            sb.Storage.writeFile(CACHE_KEY, cacheEntry(Date.now()));
            return Promise.resolve(sb.fetchAndStart('SRC-1')).then(function (exitKey) {
                expect(exitKey).toBe('disconnect');
                expect(sb.context.session.variables.RTDS_error).toBe('RTDS_API_ERROR_404');
                expect(sb.jsonHttpRequest.calls).toHaveLength(1);
            });
        });
    });

    it('corrupt cache file is a miss: falls through to the retry', function () {
        return setup([
            { reject: new Error('boom') },
            { resolve: OK_RESULT }
        ]).then(function (sb) {
            sb.Storage.writeFile(CACHE_KEY, '{not-json');
            return Promise.resolve(sb.fetchAndStart('SRC-1')).then(function (exitKey) {
                expect(exitKey).toBe('say_message');
                expect(sb.context.session.variables.RTDS_configSource).toBe('api');
                expect(sb.jsonHttpRequest.calls).toHaveLength(2);
            });
        });
    });

    it('stale cache (older than max-age) is a miss: falls through to the retry', function () {
        return setup([
            { reject: new Error('boom') },
            { resolve: OK_RESULT }
        ]).then(function (sb) {
            var eightDaysMs = 8 * 24 * 60 * 60 * 1000;
            sb.Storage.writeFile(CACHE_KEY, cacheEntry(Date.now() - eightDaysMs));
            return Promise.resolve(sb.fetchAndStart('SRC-1')).then(function (exitKey) {
                expect(exitKey).toBe('say_message');
                expect(sb.jsonHttpRequest.calls).toHaveLength(2);
            });
        });
    });

    it('unstartable cached config falls through to retry and leaves RTDS_error clean', function () {
        return setup([
            { reject: new Error('boom') },
            { resolve: OK_RESULT }
        ]).then(function (sb) {
            // Cached entry parses as JSON but has no operations -> parseFlow
            // fails on it; its RTDS_error side effect must not survive a
            // successful retry.
            sb.Storage.writeFile(CACHE_KEY, cacheEntry(Date.now(), { sourceId: 'SRC-1', operations: [] }));
            return Promise.resolve(sb.fetchAndStart('SRC-1')).then(function (exitKey) {
                expect(exitKey).toBe('say_message');
                expect(sb.context.session.variables.RTDS_error).toBeUndefined();
                expect(sb.jsonHttpRequest.calls).toHaveLength(2);
            });
        });
    });

    it('never caches an unstartable fetched config', function () {
        return setup([
            { resolve: { success: true, statusCode: 200, response: { sourceId: 'SRC-1', operations: [] } } }
        ]).then(function (sb) {
            return Promise.resolve(sb.fetchAndStart('SRC-1')).then(function (exitKey) {
                expect(exitKey).toBe('disconnect');
                expect(sb.Storage.readFile(CACHE_KEY).success).toBe(false);
            });
        });
    });

    it('kill switch off: single GET at 10000ms, Storage never touched', function () {
        return setup([{ reject: new Error('boom') }]).then(function (sb) {
            sb._rtConfigCacheEnabled = false;
            sb.Storage.writeFile(CACHE_KEY, cacheEntry(Date.now()));
            var reads = 0;
            var writes = 0;
            var realStorage = sb.Storage;
            sb.Storage = {
                readFile: function (p) { reads++; return realStorage.readFile(p); },
                writeFile: function (p, t) { writes++; return realStorage.writeFile(p, t); }
            };
            return Promise.resolve(sb.fetchAndStart('SRC-1')).then(function (exitKey) {
                expect(exitKey).toBe('disconnect');
                expect(sb.jsonHttpRequest.calls).toHaveLength(1);
                expect(sb.jsonHttpRequest.calls[0].timeoutMs).toBe(10000);
                expect(reads).toBe(0);
                expect(writes).toBe(0);
            });
        });
    });

    it('tolerates the production raw-string Storage.readFile shape', function () {
        return setup([{ reject: new Error('boom') }]).then(function (sb) {
            // Production Storage.readFile returns the raw string (or falsy),
            // not the simulator's {success, text, error} envelope.
            var files = {};
            files[CACHE_KEY] = cacheEntry(Date.now());
            sb.Storage = {
                readFile: function (p) { return files[p]; },
                writeFile: function (p, t) { files[p] = String(t); }
            };
            return Promise.resolve(sb.fetchAndStart('SRC-1')).then(function (exitKey) {
                expect(exitKey).toBe('say_message');
                expect(sb.context.session.variables.RTDS_configSource).toBe('cache');
            });
        });
    });

    it('sanitizes phone-shaped sourceIds in the cache filename', function () {
        return setup([{ resolve: OK_RESULT }]).then(function (sb) {
            return Promise.resolve(sb.fetchAndStart('+32 3/338.9999')).then(function () {
                // + - and alphanumerics survive; space, slash, dot become _.
                expect(sb.Storage.readFile('rtdsConfig_+32_3_338_9999.json').success).toBe(true);
            });
        });
    });
});
