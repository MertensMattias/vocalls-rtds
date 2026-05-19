/**
 * main.test.js — Project Test Suite
 *
 * Run: npm test
 * Copied to projects/<name>/tests/ by npm run init.
 */

var path = require('path');
var helpers = require(path.join(process.cwd(), 'core', 'testHelpers'));

describe('main.js', function () {
    it('loads without errors', function () {
        return helpers
            .runScript('main', {
                project: 'REPLACE_WITH_PROJECT_NAME',
            })
            .then(function (result) {
                expect(
                    result.logs.filter(function (l) {
                        return l.level === 'error';
                    })
                ).toHaveLength(0);
            });
    });
});
