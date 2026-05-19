/**
 * main.test.js — Project Test Suite
 *
 * Tests for callScripts/main.js.
 * Run: npm test
 *
 * Copied to projects/<name>/tests/ by npm run init (REPLACE_WITH_PROJECT_NAME → project id).
 * Root npm test may include this path (see jest.config.js); run per-project: jest projects/<name>/tests
 */

var path = require('path');
var helpers = require(path.join(process.cwd(), 'core', 'testHelpers'));

describe('main.js', function () {
    it('loads without errors', function () {
        return helpers
            .runScript('main', {
                project: 'REPLACE_WITH_PROJECT_NAME',
                apiResult: { caseNumber: 1 },
            })
            .then(function (result) {
                expect(
                    result.logs.filter(function (l) {
                        return l.level === 'error';
                    })
                ).toHaveLength(0);
            });
    });

    it('builds a system prompt', function () {
        return helpers
            .runScript('main', {
                project: 'REPLACE_WITH_PROJECT_NAME',
                apiResult: { caseNumber: 1 },
            })
            .then(function (result) {
                expect(typeof result.base_prompt).toBe('string');
                expect(result.base_prompt.length).toBeGreaterThan(0);
            });
    });
});
