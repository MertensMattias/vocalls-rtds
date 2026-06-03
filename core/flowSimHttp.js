/**
 * flowSimHttp.js — Vocalls-shaped jsonHttpRequest mock for the flow simulator
 *
 * The production RTDS runtime calls `jsonHttpRequest(url, opts, headers, body)`
 * positionally and consumes the **Vocalls result shape**
 * `{ success, statusCode, response }` — NOT the fetch shape
 * (`{ status, ok, json() }`) that `core/minimalVocallsCore.js` stub mode and
 * `core/testHelpers.js` return. (See memory "RTDS HTTP result shape":
 * `fetchAndStart` reads `result.response`, the Send* handlers read
 * `result.success`.) This factory builds a mock that speaks that shape, so the
 * production `fetchAndStart` / handlers see exactly what they see in production.
 *
 * Boundary behaviour (the only two things mocked are API + GUI handoffs):
 *   - Routing-table fetch  (url contains 'routing-table/source')
 *       → { success:true, statusCode:200, response: flow }
 *     The chosen flow file IS the routing-table mock. Flow files are authored in
 *     the runtime-native shape (camelCase sourceId/operations/id/type/params),
 *     so the flow object is served straight to fetchAndStart — no conversion.
 *   - EventLog / logging   (url contains 'EventLog')
 *       → { success:true, statusCode:200 }   (no body needed)
 *   - Any other endpoint   → a per-URL fixture if one was supplied (substring
 *       match), else a generic success default { success:true, statusCode:200,
 *       response:{} }.
 *
 * Every call is recorded ({ url, method }) for the trace.
 *
 * The returned thenable matches the runtime's call pattern: it exposes
 * `.withTimeout(ms)` (returns a thenable) and `.then(onFulfilled, onRejected)`,
 * mirroring `attachTimeoutThenable` in core/minimalVocallsCore.js — but the
 * resolved value is the Vocalls shape, not a fetch Response.
 *
 * Usage:
 *   var makeFlowSimHttp = require('../core/flowSimHttp');
 *   var mock = makeFlowSimHttp({ flow: runtimeFlow, fixtures: { '/sms': {...} } });
 *   sandbox.jsonHttpRequest = mock.jsonHttpRequest;
 *   sandbox.httpRequest = mock.jsonHttpRequest;
 *   // after the run: mock.calls -> [{ url, method }, ...]
 *
 * @module flowSimHttp
 */

/**
 * Wrap a resolved Vocalls-shape value in a thenable that carries the
 * `.withTimeout()` + `.then()` contract the runtime expects. The timeout is a
 * no-op here (the mock resolves synchronously-immediately), but `.withTimeout()`
 * must exist and return another thenable because `fetchAndStart` chains it.
 *
 * @param {Object} value - The Vocalls-shaped result to resolve with.
 * @returns {{ withTimeout: Function, then: Function }}
 */
function makeThenable(value) {
    var promise = Promise.resolve(value);
    var thenable = {
        then: function (onFulfilled, onRejected) {
            return promise.then(onFulfilled, onRejected);
        },
        withTimeout: function () {
            // Mock responses are immediate; the timeout never fires. Return a
            // thenable again so chained `.then` works exactly as in production.
            return thenable;
        },
    };
    return thenable;
}

/**
 * Resolve a URL to its Vocalls-shaped response.
 *
 * @param {string} url
 * @param {Object} flow - runtime-native flow served for the routing-table fetch.
 * @param {Object} fixtures - map of URL-substring → response body or full envelope.
 * @returns {Object} Vocalls-shaped { success, statusCode, response? }
 */
function resolveResponse(url, flow, fixtures) {
    var u = String(url || '');

    // The chosen flow file IS the routing-table mock.
    if (u.indexOf('routing-table/source') !== -1) {
        return { success: true, statusCode: 200, response: flow };
    }

    // Logging endpoint — acknowledged, no body consumed by the runtime.
    if (u.indexOf('EventLog') !== -1) {
        return { success: true, statusCode: 200 };
    }

    // Per-URL fixture (substring match) overrides the generic default. A fixture
    // value may be a full Vocalls envelope ({ success, statusCode, response })
    // or a bare body — if it has no `success` key, treat it as the response
    // body and wrap it in a success envelope.
    if (fixtures) {
        var keys = Object.keys(fixtures);
        for (var i = 0; i < keys.length; i++) {
            if (u.indexOf(keys[i]) !== -1) {
                var fx = fixtures[keys[i]];
                if (fx && typeof fx === 'object' && fx.hasOwnProperty('success')) {
                    return fx;
                }
                return { success: true, statusCode: 200, response: fx };
            }
        }
    }

    // Generic success default for any unmocked endpoint.
    return { success: true, statusCode: 200, response: {} };
}

/**
 * Build a Vocalls-shaped jsonHttpRequest mock.
 *
 * @param {Object} options
 * @param {Object} options.flow - runtime-native flow served for the
 *        routing-table fetch.
 * @param {Object} [options.fixtures] - map of URL-substring → response.
 * @returns {{ jsonHttpRequest: Function, calls: Array<{url:string,method:string}> }}
 */
function makeFlowSimHttp(options) {
    options = options || {};
    var flow = options.flow;
    var fixtures = options.fixtures || {};
    var calls = [];

    /**
     * Positional signature matching the runtime's call pattern:
     *   jsonHttpRequest(url, opts, headers, body)
     * `opts` may carry `{ method }`. Returns a thenable resolving to the
     * Vocalls shape.
     */
    function jsonHttpRequest(url, opts /*, headers, body */) {
        var method = (opts && opts.method) || 'GET';
        calls.push({ url: String(url || ''), method: method });
        var value = resolveResponse(url, flow, fixtures);
        return makeThenable(value);
    }

    return {
        jsonHttpRequest: jsonHttpRequest,
        calls: calls,
    };
}

module.exports = makeFlowSimHttp;
