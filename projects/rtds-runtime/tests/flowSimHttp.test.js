/**
 * flowSimHttp.test.js — U2 coverage (covers AE1 HTTP boundary)
 *
 * The mock returns the Vocalls result shape { success, statusCode, response },
 * serves the flow for the routing-table fetch, resolves other endpoints
 * to per-URL fixtures or a generic success default, and records every call.
 *
 * Lives under projects/<name>/tests/ because that's the only path Jest's
 * testMatch discovers (see jest.config.js testMatch).
 *
 * Run:
 *   npm test
 */

var path = require('path');

var makeFlowSimHttp = require(path.join(process.cwd(), 'core', 'flowSimHttp'));

var ROUTING_URL =
    'https://api.n-allo.be/routingtablesapi-acc/api/routing-table/source?sourceId=%2B3271690041';
var SMS_URL = 'https://api.n-allo.be/smsapi-acc/api/Send';
var EVENTLOG_URL = 'https://api.n-allo.be/ivrapi-acc/api/EventLog';

var FLOW = {
    sourceId: '+3271690041',
    operations: [{ id: '00000', type: 'SetVariables_vocalls', isFirstOperation: true, params: {} }],
};

describe('flowSimHttp — routing-table fetch (covers AE1)', function () {
    it('serves the flow in the Vocalls shape via withTimeout().then()', function () {
        var mock = makeFlowSimHttp({ flow: FLOW });
        return mock
            .jsonHttpRequest(ROUTING_URL, { method: 'GET' }, {})
            .withTimeout(10000)
            .then(function (result) {
                expect(result.success).toBe(true);
                expect(result.statusCode).toBe(200);
                expect(result.response).toBe(FLOW);
                // Vocalls shape, not fetch shape — no .json()/.ok/.status.
                expect(result.json).toBeUndefined();
                expect(result.ok).toBeUndefined();
            });
    });

    it('also resolves via a bare .then() (handlers that skip withTimeout)', function () {
        var mock = makeFlowSimHttp({ flow: FLOW });
        return mock.jsonHttpRequest(ROUTING_URL, { method: 'GET' }, {}).then(function (result) {
            expect(result.response).toBe(FLOW);
        });
    });
});

describe('flowSimHttp — other endpoints', function () {
    it('returns a generic success default for an unknown endpoint with no fixture', function () {
        var mock = makeFlowSimHttp({ flow: FLOW });
        return mock.jsonHttpRequest(SMS_URL, { method: 'POST' }, {}, {}).then(function (result) {
            expect(result).toEqual({ success: true, statusCode: 200, response: {} });
        });
    });

    it('returns a provided per-URL fixture (full envelope passed through)', function () {
        var fixture = { success: false, statusCode: 502, response: { error: 'gateway down' } };
        var mock = makeFlowSimHttp({
            flow: FLOW,
            fixtures: { '/smsapi-': fixture },
        });
        return mock.jsonHttpRequest(SMS_URL, { method: 'POST' }, {}, {}).then(function (result) {
            expect(result).toBe(fixture);
            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(502);
        });
    });

    it('wraps a bare-body fixture (no success key) in a success envelope', function () {
        var mock = makeFlowSimHttp({
            flow: FLOW,
            fixtures: { '/smsapi-': { messageId: 'abc' } },
        });
        return mock.jsonHttpRequest(SMS_URL, { method: 'POST' }, {}, {}).then(function (result) {
            expect(result.success).toBe(true);
            expect(result.statusCode).toBe(200);
            expect(result.response).toEqual({ messageId: 'abc' });
        });
    });

    it('acknowledges the EventLog logging endpoint with success and no body', function () {
        var mock = makeFlowSimHttp({ flow: FLOW });
        return mock.jsonHttpRequest(EVENTLOG_URL, { method: 'POST' }, {}, {}).then(function (result) {
            expect(result.success).toBe(true);
            expect(result.statusCode).toBe(200);
            expect(result.response).toBeUndefined();
        });
    });
});

describe('flowSimHttp — call recording', function () {
    it('records url and method for each invocation in order', function () {
        var mock = makeFlowSimHttp({ flow: FLOW });
        mock.jsonHttpRequest(ROUTING_URL, { method: 'GET' }, {});
        mock.jsonHttpRequest(SMS_URL, { method: 'POST' }, {}, {});
        mock.jsonHttpRequest(EVENTLOG_URL, {}, {}, {}); // no method → defaults to GET

        expect(mock.calls.length).toBe(3);
        expect(mock.calls[0]).toEqual({ url: ROUTING_URL, method: 'GET' });
        expect(mock.calls[1]).toEqual({ url: SMS_URL, method: 'POST' });
        expect(mock.calls[2]).toEqual({ url: EVENTLOG_URL, method: 'GET' });
    });
});
