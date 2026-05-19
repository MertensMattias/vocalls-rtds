/**
 * main.test.js — Project Test Suite
 *
 * Tests for callScripts/main.js (fest flow).
 * Run: npm test
 */

var path = require('path');
var helpers = require(path.join(process.cwd(), 'core', 'testHelpers'));

var LOGGER_STUB_URL = 'https://api.n-allo.be/ivrapi-acc/api/EventLog';

describe('main.js', function () {
    it('loads without errors', function () {
        return helpers
            .runScript('main', {
                project: 'demo',
                stubs: {
                    [LOGGER_STUB_URL]: { success: true, statusCode: 200 },
                },
            })
            .then(function (result) {
                expect(
                    result.logs.filter(function (l) {
                        return l.level === 'error';
                    })
                ).toHaveLength(0);
            });
    });

    it('runs RTDS devJson path and sets RoutingId', function () {
        return helpers
            .runScript('main', {
                project: 'demo',
                returnSandbox: true,
                stubs: {
                    [LOGGER_STUB_URL]: { success: true, statusCode: 200 },
                },
            })
            .then(function (result) {
                expect(result.sandbox.RoutingId).toBe('FEST_DEMO');
            });
    });
});
