/**
 * Minimal Vocalls Core - Real Implementation
 *
 * Provides a complete Vocalls simulation environment with:
 * - Real HTTP requests using fetch + AbortController
 * - Real disk storage with UTF-8 safe operations
 * - Session serialization/deserialization
 * - ES5.1 constraint validation
 * - Vocalls-compatible APIs and global objects
 *
 * No external dependencies, designed for Node.js >=18.18
 */

var fs = require('fs');
var path = require('path');
var vm = require('vm');

/**
 * Creates a Vocalls-compatible sandbox with configurable I/O
 *
 * @param {Object} options - Configuration options
 * @param {string} options.httpMode - 'real' or 'stub'
 * @param {string} options.storageMode - 'disk' or 'memory'
 * @param {boolean} options.logging - Enable enhanced logging
 * @returns {Object} Sandbox with Vocalls APIs
 */
function createSandbox(options) {
    options = options || {};
    var httpMode = options.httpMode || 'real';
    var storageMode = options.storageMode || 'disk';
    var loggingEnabled = options.logging !== false;
    var moduleName = options.moduleName || 'vocalls-env';
    var defaultEnvironment = options.environment || null;

    var sandbox = {};

    // ============================================================================
    // LOGGING (Vocalls built-in functions)
    // ============================================================================

    // Built-in Vocalls logging functions (these will be available in the real environment)
    sandbox.log_info = function () {
        if (loggingEnabled) {
            // In real Vocalls, this is a built-in function
            // For local simulation, we'll use console with timestamp
            var timestamp = new Date().toISOString();
            var args = Array.prototype.slice.call(arguments);
            console.log('[' + timestamp + '] [INFO]', ...args);
        }
    };

    sandbox.log_debug = function () {
        if (loggingEnabled) {
            // In real Vocalls, this is a built-in function
            // For local simulation, we'll use console with timestamp
            var timestamp = new Date().toISOString();
            var args = Array.prototype.slice.call(arguments);
            console.log('[' + timestamp + '] [DEBUG]', ...args);
        }
    };

    sandbox.log_warn = function () {
        if (loggingEnabled) {
            // In real Vocalls, this is a built-in function
            var timestamp = new Date().toISOString();
            var args = Array.prototype.slice.call(arguments);
            console.warn('[' + timestamp + '] [WARN]', ...args);
        }
    };

    sandbox.log_error = function () {
        // Always log errors, even if general logging is disabled
        var timestamp = new Date().toISOString();
        var args = Array.prototype.slice.call(arguments);
        console.error('[' + timestamp + '] [ERROR]', ...args);
    };

    // ============================================================================
    // WRAPPER FUNCTIONS (for user scripts and global libraries)
    // ============================================================================

    // These are the functions that user scripts and global libraries should use
    sandbox.logInfo = function () {
        // Always log info messages
        var timestamp = new Date().toISOString();
        var args = Array.prototype.slice.call(arguments);
        console.log('[' + timestamp + '] [INFO]', ...args);
    };

    sandbox.logWarn = function () {
        // Always log warnings
        var timestamp = new Date().toISOString();
        var args = Array.prototype.slice.call(arguments);
        console.warn('[' + timestamp + '] [WARN]', ...args);
    };

    sandbox.logError = function () {
        // Always log errors
        var timestamp = new Date().toISOString();
        var args = Array.prototype.slice.call(arguments);
        console.error('[' + timestamp + '] [ERROR]', ...args);
    };

    // ============================================================================
    // STORAGE (Real disk operations with UTF-8 safety)
    // ============================================================================

    var memoryStorage = {};
    var storagePath = path.resolve(process.cwd(), '.storage');

    // Ensure storage directory exists for disk mode
    if (storageMode === 'disk') {
        try {
            fs.mkdirSync(storagePath, { recursive: true });
        } catch (e) {
            sandbox.log_error('Failed to create storage directory:', e.message);
        }
    }

    sandbox.Storage = {
        readFile: function (filePath) {
            try {
                if (storageMode === 'memory') {
                    var content = memoryStorage[filePath];
                    return {
                        success: content !== undefined,
                        text: content || null,
                        error: content === undefined ? 'file_not_found' : null,
                    };
                } else {
                    // Disk mode
                    var fullPath = path.resolve(storagePath, filePath);
                    if (!fullPath.startsWith(storagePath)) {
                        throw new Error('Path traversal not allowed');
                    }
                    var content = fs.readFileSync(fullPath, 'utf8');
                    return {
                        success: true,
                        text: content,
                        error: null,
                    };
                }
            } catch (e) {
                return {
                    success: false,
                    text: null,
                    error: e.message,
                };
            }
        },

        writeFile: function (filePath, text) {
            try {
                if (storageMode === 'memory') {
                    memoryStorage[filePath] = String(text || '');
                    return {
                        success: true,
                        error: null,
                    };
                } else {
                    // Disk mode - ensure directory structure
                    var fullPath = path.resolve(storagePath, filePath);
                    if (!fullPath.startsWith(storagePath)) {
                        throw new Error('Path traversal not allowed');
                    }
                    var dir = path.dirname(fullPath);
                    fs.mkdirSync(dir, { recursive: true });
                    fs.writeFileSync(fullPath, String(text || ''), 'utf8');
                    return {
                        success: true,
                        error: null,
                    };
                }
            } catch (e) {
                return {
                    success: false,
                    error: e.message,
                };
            }
        },
    };

    // ============================================================================
    // HTTP (Real network with fetch + AbortController)
    // ============================================================================

    function attachTimeoutThenable(promise) {
        var thenable = {
            then: function (onFulfilled, onRejected) {
                return promise.then(onFulfilled, onRejected);
            },
            withTimeout: function (timeoutMs) {
                var timeoutPromise = new Promise(function (_, reject) {
                    setTimeout(function () {
                        reject(new Error('Request timeout after ' + timeoutMs + 'ms'));
                    }, timeoutMs);
                });
                var racedPromise = Promise.race([promise, timeoutPromise]);
                return attachTimeoutThenable(racedPromise);
            },
        };
        return thenable;
    }

    function loadStubResponse(url) {
        try {
            // Create safe filename from URL
            var safeUrl = url.replace(/[^a-zA-Z0-9]/g, '_');
            var stubPath = path.resolve(process.cwd(), 'stubs', safeUrl + '.json');
            var stubContent = fs.readFileSync(stubPath, 'utf8');
            return JSON.parse(stubContent);
        } catch (e) {
            sandbox.log_warn('Stub file not found for URL:', url);
            return { failureOccurred: false, caseNumber: 0, isEligible: true };
        }
    }

    sandbox.jsonHttpRequest = function (options) {
        if (typeof options === 'string') {
            options = { url: options };
        }

        if (!options.url) {
            throw new Error('URL is required for jsonHttpRequest');
        }

        var method = options.method || 'GET';
        var headers = options.headers || {};
        var body = options.body;
        var timeoutMs = options.timeoutMs || 30000;

        // Auto-stringify body if object
        if (body && typeof body === 'object') {
            try {
                body = JSON.stringify(body);
                if (!headers['Content-Type']) {
                    headers['Content-Type'] = 'application/json';
                }
            } catch (e) {
                body = String(body);
            }
        }

        var promise;

        if (httpMode === 'stub') {
            // Stub mode - return mocked response
            promise = Promise.resolve({
                status: 200,
                ok: true,
                headers: { 'content-type': 'application/json' },
                json: function () {
                    return Promise.resolve(loadStubResponse(options.url));
                },
                text: function () {
                    return Promise.resolve(JSON.stringify(loadStubResponse(options.url)));
                },
            });
        } else {
            // Real mode - use global fetch (Node.js 18+)
            var abortController = new AbortController();
            var timeoutId = setTimeout(function () {
                abortController.abort();
            }, timeoutMs);

            promise = fetch(options.url, {
                method: method,
                headers: headers,
                body: body,
                signal: abortController.signal,
            })
                .then(function (response) {
                    clearTimeout(timeoutId);
                    return {
                        status: response.status,
                        ok: response.ok,
                        headers: Object.fromEntries(response.headers.entries()),
                        json: function () {
                            return response.json();
                        },
                        text: function () {
                            return response.text();
                        },
                    };
                })
                .catch(function (error) {
                    clearTimeout(timeoutId);
                    throw error;
                });
        }

        return attachTimeoutThenable(promise);
    };

    // httpRequest alias
    sandbox.httpRequest = sandbox.jsonHttpRequest;

    // ============================================================================
    // TIME UTILITIES
    // ============================================================================

    sandbox.nowUTC = function () {
        return new Date().toISOString();
    };

    // ============================================================================
    // SESSION MANAGEMENT
    // ============================================================================

    function sanitizeForSerialization(obj, seen) {
        seen = seen || new Set();
        if (seen.has(obj)) {
            return '[Circular]';
        }
        seen.add(obj);

        if (typeof obj === 'function') {
            return undefined; // Remove functions during serialization
        }
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj
                .map(function (item) {
                    return sanitizeForSerialization(item, seen);
                })
                .filter(function (item) {
                    return item !== undefined;
                });
        }

        var result = {};
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                var value = sanitizeForSerialization(obj[key], seen);
                if (value !== undefined) {
                    result[key] = value;
                }
            }
        }
        return result;
    }

    sandbox.serializeSession = function (sessionVars) {
        try {
            var cleaned = sanitizeForSerialization(sessionVars || {});
            return JSON.stringify(cleaned, null, 2);
        } catch (e) {
            sandbox.log_error('Session serialization failed:', e.message);
            return '{}';
        }
    };

    sandbox.deserializeSession = function (sessionJson) {
        try {
            return JSON.parse(sessionJson || '{}');
        } catch (e) {
            sandbox.log_error('Session deserialization failed:', e.message);
            return {};
        }
    };

    // ============================================================================
    // VOCALLS CONTEXT OBJECTS
    // ============================================================================

    sandbox.context = {
        returnTo: null,
        phone: null,
        language: 'NL',
        globalRecognizedCounter: 0,
        globalUnrecognizedCounter: 0,
        nodeHistory: [],
        currentNode: null,
        callInfo: {
            fromUri: 'sip:+32470000000@localhost',
            toUri: 'sip:080012345@localhost',
            direction: 'inbound',
            callGuid: 'CALL-' + Date.now(),
        },
        transcription: {},
        recognition: {},
        speakFlow: {},
        settings: {
            moduleName: moduleName,
            defaultEnvironment: defaultEnvironment,
        },
        session: {
            variables: {},
        },
    };

    sandbox.nodeHistory = [];

    // ============================================================================
    // LOGGER STUB (for globalLibraries that expect Logger, e.g. apiFactory)
    // ============================================================================
    sandbox.Logger = {
        info: function (msg, data) {
            if (loggingEnabled) {
                var timestamp = new Date().toISOString();
                console.log('[' + timestamp + '] [INFO]', msg, data !== undefined ? data : '');
            }
        },
        warn: function (msg, data) {
            var timestamp = new Date().toISOString();
            console.warn('[' + timestamp + '] [WARN]', msg, data !== undefined ? data : '');
        },
        error: function (msg, data, err) {
            var timestamp = new Date().toISOString();
            console.error(
                '[' + timestamp + '] [ERROR]',
                msg,
                data !== undefined ? data : '',
                err !== undefined ? err : ''
            );
        },
        debug: function (msg, data) {
            if (loggingEnabled) {
                var timestamp = new Date().toISOString();
                console.log('[' + timestamp + '] [DEBUG]', msg, data !== undefined ? data : '');
            }
        },
        API: function (label, ctx, errObj) {
            if (loggingEnabled) {
                var timestamp = new Date().toISOString();
                console.log(
                    '[' + timestamp + '] [API]',
                    label,
                    ctx !== undefined ? ctx : '',
                    errObj !== undefined ? errObj : ''
                );
            }
        },
        getStatusCode: function (result) {
            return (result && result.status) || (result && result.statusCode) || null;
        },
        sanitizeForLog: function (obj) {
            try {
                return typeof obj === 'object' && obj !== null ? JSON.stringify(obj) : String(obj);
            } catch (e) {
                return '[unstringifiable]';
            }
        },
    };

    // Stub for globalLibraries that expect _headers (e.g. apiFactory)
    sandbox._headers = { 'Content-Type': 'application/json' };

    return sandbox;
}

/**
 * ES5.1 Constraint Validator
 *
 * Validates JavaScript code against Vocalls constraints with precise
 * line/column reporting for forbidden constructs.
 *
 * @param {string} code - Source code to validate
 * @param {string} filename - Filename for error reporting
 * @returns {Object} Validation result with errors array
 */
function validateConstraints(code, filename) {
    filename = filename || 'script.js';
    var errors = [];
    var warnings = [];

    // Split code into lines for precise error reporting
    var lines = code.split('\n');

    // Validation rules with regex patterns
    var rules = [
        {
            name: 'async/await',
            pattern: /\b(async|await)\b/g,
            message: 'async/await is not supported in Vocalls ES5.1 environment',
        },
        {
            name: 'class',
            pattern: /\bclass\s+[\w$]+/g,
            message: 'ES6 classes are not supported, use function constructors instead',
        },
        {
            name: 'import/export',
            pattern: /\b(import\s|export\s+)/g,
            message: 'ES6 modules (import/export) are not supported',
        },
        {
            name: 'require',
            pattern: /\brequire\s*\(/g,
            message: 'require() is not available in Vocalls environment',
        },
        {
            name: 'let/const',
            pattern: /\b(let|const)\s+/g,
            message: 'Use var instead of let/const declarations',
        },
        {
            name: 'catch',
            pattern: /\.catch\s*\(/g,
            message: 'Promise .catch() is not supported, use .then(success, failure) instead',
        },
        {
            name: 'optional_chaining',
            pattern: /\?\./g,
            message: 'Optional chaining (?.) is not supported',
        },
        {
            name: 'nullish_coalescing',
            pattern: /\?\?/g,
            message: 'Nullish coalescing (??) is not supported',
        },
        {
            name: 'eval',
            pattern: /\beval\s*\(|new\s+Function\s*\(/g,
            message: 'eval() and Function constructor are forbidden for security',
        },
        {
            name: 'console',
            pattern: /\bconsole\.(log|info|warn|error)\s*\(/g,
            message:
                'Use log_debug(), log_warn(), log_error() or wrapper functions instead of console.*',
        },
    ];

    // Check each rule against each line
    rules.forEach(function (rule) {
        lines.forEach(function (line, lineIndex) {
            var match;
            rule.pattern.lastIndex = 0; // Reset regex state
            while ((match = rule.pattern.exec(line)) !== null) {
                var snippet = line.substring(
                    Math.max(0, match.index - 10),
                    match.index + match[0].length + 10
                );
                errors.push({
                    rule: rule.name,
                    line: lineIndex + 1,
                    col: match.index + 1,
                    snippet: snippet.trim(),
                    message: rule.message,
                });

                // Prevent infinite loop for global regex
                if (!rule.pattern.global) {
                    break;
                }
            }
        });
    });

    return {
        ok: errors.length === 0,
        errors: errors,
        warnings: warnings,
    };
}

module.exports = {
    createSandbox: createSandbox,
    validateConstraints: validateConstraints,
};
