/**
 * Test Helpers for agent-builder project scripts
 *
 * Uses vocalls_session_init/vocallsContext (Vocalls-style seed + session) and
 * core/minimalVocallsCore via the loader.
 *
 *   var helpers = require('../../../core/testHelpers');
 */

var vocallsContext = require('../vocalls_session_init/vocallsContext');
var loader = require('./loader');

/**
 * Run a project call script in an isolated test sandbox.
 *
 * @param {string} scriptName - Script name without .js (in callScripts/)
 * @param {Object} [options]
 * @param {string} [options.project] - Project name (reads activeProject if omitted)
 * @param {string} [options.scenario] - 'inbound' | 'outbound' | 'callback' [default: inbound]
 * @param {Object} [options.overrides] - Deep-merged into default seed (callInfo, session, …)
 * @param {Object} [options.variables] - Extra session.variables (merged after seed)
 * @param {string} [options.language] - Language code (default: from seed, usually NL)
 * @param {Object} [options.stubs] - URL → response for HTTP stubbing
 * @param {Object} [options.apiResult] - Injected as sandbox._apiResult
 * @param {boolean} [options.returnSandbox] - If true, result includes sandbox (e.g. runAction tests)
 * @returns {Promise<{context, logs, httpCalls, base_prompt?, opening?, varObj?, sandbox?}>}
 */
function runScript(scriptName, options) {
    options = options || {};
    var projectName = options.project || null;
    var scenario = options.scenario || 'inbound';
    var overrides = options.overrides || {};
    var capturedLogs = [];
    var capturedHttpCalls = [];

    return new Promise(function (resolve, reject) {
        try {
            if (!projectName) {
                var envConfig = loader.loadEnvConfig();
                projectName = envConfig.activeProject || 'example-project';
            }

            var seed = vocallsContext.createDefaultSeed(scenario, overrides);

            if (options.variables) {
                seed.session = seed.session || {};
                seed.session.variables = seed.session.variables || {};
                for (var k in options.variables) {
                    if (options.variables.hasOwnProperty(k)) {
                        seed.session.variables[k] = options.variables[k];
                    }
                }
            }

            var sandbox = vocallsContext.buildSessionContext(seed, {
                httpMode: 'stub',
                storageMode: 'memory',
                logging: false,
                projectName: projectName,
            });

            if (options.language) {
                sandbox.context.language = options.language;
            }

            if (options.apiResult) {
                sandbox._apiResult = options.apiResult;
            }

            function makeLogger(level) {
                return function () {
                    var args = Array.prototype.slice.call(arguments);
                    capturedLogs.push({ level: level, message: args.join(' ') });
                };
            }
            sandbox.logInfo = makeLogger('info');
            sandbox.logWarn = makeLogger('warn');
            sandbox.logError = makeLogger('error');
            sandbox.log_info = sandbox.logInfo;
            sandbox.log_warn = sandbox.logWarn;
            sandbox.log_error = sandbox.logError;
            sandbox.log_debug = function () {};

            var stubs = options.stubs || {};
            sandbox.jsonHttpRequest = function (reqOptions) {
                if (typeof reqOptions === 'string') {
                    reqOptions = { url: reqOptions };
                }
                var url = reqOptions.url || '';
                var method = reqOptions.method || 'GET';
                if (stubs.hasOwnProperty(url)) {
                    var stubData = stubs[url];
                    capturedHttpCalls.push({ url: url, method: method, response: stubData });
                    return {
                        then: function (onFulfilled) {
                            var fakeResponse = {
                                status: 200,
                                ok: true,
                                json: function () {
                                    return Promise.resolve(stubData);
                                },
                                text: function () {
                                    return Promise.resolve(JSON.stringify(stubData));
                                },
                            };
                            return Promise.resolve(
                                onFulfilled ? onFulfilled(fakeResponse) : fakeResponse
                            );
                        },
                        withTimeout: function () {
                            return this;
                        },
                    };
                }
                capturedHttpCalls.push({ url: url, method: method, response: null });
                return {
                    then: function (s, f) {
                        if (f) {
                            f(new Error('No stub for ' + url));
                        }
                        return Promise.reject(new Error('No stub for ' + url));
                    },
                    withTimeout: function () {
                        return this;
                    },
                };
            };
            sandbox.httpRequest = sandbox.jsonHttpRequest;

            sandbox.base_prompt = '';
            sandbox.opening = '';
            sandbox.varObj = {};

            var userScript = 'projects/' + projectName + '/callScripts/' + scriptName + '.js';
            var resultSandbox = loader.executeScripts({
                sandbox: sandbox,
                userScript: userScript,
                validateScripts: false,
                projectName: projectName,
            });

            var result = {
                context: resultSandbox.context,
                logs: capturedLogs,
                httpCalls: capturedHttpCalls,
                base_prompt: resultSandbox.base_prompt,
                opening: resultSandbox.opening,
                varObj: resultSandbox.varObj,
            };
            if (options.returnSandbox) {
                result.sandbox = resultSandbox;
            }
            // Let the script's load-time promise chains (e.g. fetchAndStart's
            // fallback/retry hops and the S4 exit-key logging) fully settle
            // before the test body runs -- tests may replace sandbox globals
            // like jsonHttpRequest, and a lingering chain must not observe
            // those replacements. setImmediate runs after the current
            // microtask queue has fully drained, including chained .then hops.
            setImmediate(function () {
                resolve(result);
            });
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { runScript: runScript };
