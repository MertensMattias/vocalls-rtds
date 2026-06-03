#!/usr/bin/env node

/**
 * CLI Simulate-Flow — run the PRODUCTION RTDS runtime against a real flow file.
 *
 * Drives the production runtime end-to-end:
 *   main.js -> fetchAndStart -> parseFlow -> runStep -> resumeFrom -> handlers
 * against a real callflow_json_config_vocalls/*.json flow, mocking ONLY the two
 * true external boundaries — outbound HTTP and GUI handoffs — and printing a
 * readable trace. Everything reachable without crossing those boundaries runs
 * real, unmodified runtime + handler code (loaded via core/loader).
 *
 * What is real vs substituted:
 *   - REAL: every global-library function (fetchAndStart, parseFlow, runStep,
 *           resumeFrom, setupConfig, Logger, getValue, the JS handlers, …).
 *           Nothing in the runtime is re-implemented or mocked.
 *   - HTTP boundary: jsonHttpRequest is replaced with a Vocalls-shaped mock
 *           (core/flowSimHttp) — { success, statusCode, response }. The chosen
 *           flow file IS the routing-table response. Flow files are authored in
 *           the runtime-native shape (camelCase sourceId/operations/id/type/
 *           params), so they are served straight to fetchAndStart — no adapter.
 *   - GUI boundary: at a GUI-exit key the handoff is recorded and the flow
 *           auto-advances on the op's default NextStep (RTDS_nextStepId set by
 *           the production prepareGuiHandoff), calling the real resumeFrom().
 *   - Log sinks: log_debug/log_info/log_warn/log_error are tapped so the trace
 *           prints to console AND is captured for the end-of-run summary. These
 *           are platform logging primitives (built-in in real Vocalls), not
 *           runtime logic — tapping them does not violate the "run real code"
 *           contract.
 *
 * NOTE: This deliberately supplies its OWN Vocalls-shaped HTTP mock rather than
 * core/minimalVocallsCore.js's `stub` mode, which returns the fetch shape
 * ({ status, ok, json() }) the RTDS runtime cannot consume. See memory
 * "RTDS HTTP result shape". Unifying the core stub is deferred follow-up work.
 *
 * Usage:
 *   npm run simulate:flow -- callflow_json_config_vocalls/DIGIPOLIS_LPA_ICT_GUARD_TUI_PRD.json
 *   npm run simulate:flow -- <flow-path> [--project rtds-runtime] [--env acc]
 *                            [--language NL] [--max-steps 50]
 *                            [--fixture <urlSubstring>=<fixtureJsonPath>]
 */

var fs = require('fs');
var path = require('path');
var vocallsContext = require('../vocalls_session_init/vocallsContext');
var loader = require('../core/loader');
var makeFlowSimHttp = require('../core/flowSimHttp');

var DEFAULT_MAX_STEPS = 100;

/**
 * Fail loud on a structurally malformed flow rather than letting the runtime's
 * parseFlow log an error and disconnect silently. Flow files are runtime-native
 * (camelCase `operations` array); the runtime reads them directly. We only
 * assert the envelope is well-formed enough to dispatch — parseFlow owns the
 * deeper checks (entry point, per-op shape).
 *
 * @param {Object} flow
 * @throws {Error} when flow is not an object or has no non-empty operations array.
 */
function validateFlow(flow) {
    if (!flow || typeof flow !== 'object') {
        throw new Error('simulate-flow: flow file is not a JSON object');
    }
    if (!Array.isArray(flow.operations) || flow.operations.length === 0) {
        throw new Error(
            'simulate-flow: flow has no non-empty "operations" array — is it the runtime-native (camelCase) shape?'
        );
    }
}

function ensureProjectRoot() {
    var cwd = process.cwd();
    var configPath = path.resolve(cwd, 'env.config.json');
    if (!fs.existsSync(configPath)) {
        console.error('Error: Must run from project root (directory containing env.config.json)');
        console.error('Current directory:', cwd);
        process.exit(1);
    }
}

function showHelp() {
    console.log('\nRTDS Flow Simulator — run the production runtime against a flow file\n');
    console.log('Usage: npm run simulate:flow -- <flow-path> [options]\n');
    console.log('Arguments:');
    console.log('  <flow-path>            Path to a callflow_json_config_vocalls/*.json flow\n');
    console.log('Options:');
    console.log('  --project <name>       Project [default: rtds-runtime]');
    console.log('  --env acc|prd|dvp      Target environment [default: project default]');
    console.log('  --language <lang>      Force language (NL|FR|DE|EN)');
    console.log('  --max-steps <n>        Auto-advance cap [default: ' + DEFAULT_MAX_STEPS + ']');
    console.log('  --fixture <sub>=<path> Per-URL fixture: substring=jsonFilePath (repeatable)');
    console.log('  -h, --help\n');
}

function parseArgs() {
    var args = process.argv.slice(2);
    var options = {
        flowPath: null,
        project: null,
        env: null,
        language: null,
        maxSteps: DEFAULT_MAX_STEPS,
        fixtures: {},
    };
    var positionals = [];

    for (var i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--project':
                options.project = args[++i];
                break;
            case '--env':
                options.env = args[++i];
                break;
            case '--language':
            case '--lang':
                options.language = args[++i];
                break;
            case '--max-steps':
            case '--maxSteps':
                // Explicit parse — `|| DEFAULT` would turn a valid 0 into 100.
                var parsedMax = parseInt(args[++i], 10);
                options.maxSteps = isNaN(parsedMax) ? DEFAULT_MAX_STEPS : parsedMax;
                break;
            case '--fixture':
                var spec = args[++i] || '';
                var eq = spec.indexOf('=');
                if (eq === -1) {
                    console.error('Error: --fixture expects <urlSubstring>=<jsonFilePath>');
                    process.exit(1);
                }
                var sub = spec.slice(0, eq);
                var fxPath = spec.slice(eq + 1);
                try {
                    options.fixtures[sub] = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), fxPath), 'utf8'));
                } catch (e) {
                    console.error('Error: could not read fixture "' + fxPath + '": ' + e.message);
                    process.exit(1);
                }
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
            default:
                if (args[i].indexOf('--') === 0) {
                    console.error('Unknown option:', args[i]);
                    showHelp();
                    process.exit(1);
                } else {
                    positionals.push(args[i]);
                }
        }
    }

    options.flowPath = positionals[0] || null;
    if (!options.project) {
        options.project = 'rtds-runtime';
    }
    return options;
}

/**
 * Install capturing log sinks on the sandbox. Each line goes to console (so the
 * trace is visible live) AND into `captured` (so the end-of-run summary can
 * count errors and replay ordered steps). Errors/warnings keep their own lists
 * for the summary.
 */
function installLogCapture(sandbox, captured, silent) {
    function sink(level, consoleFn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            var line = args
                .map(function (a) {
                    return typeof a === 'string' ? a : JSON.stringify(a);
                })
                .join(' ');
            captured.lines.push({ level: level, message: line });
            if (level === 'error') {
                captured.errors.push(line);
            }
            // Capture always; print live only when not silent (silent keeps
            // test runs quiet — the trace summary still reports everything).
            if (!silent) {
                consoleFn(line);
            }
        };
    }
    sandbox.log_debug = sink('debug', console.log);
    sandbox.log_info = sink('info', console.log);
    sandbox.log_warn = sink('warn', console.warn);
    sandbox.log_error = sink('error', console.error);
}

/**
 * Pull the ordered step list out of the captured INFO lines. The runtime emits
 * one '[RTDS] step' line per dispatched op via Logger.info -> log_debug.
 */
function extractSteps(captured) {
    var steps = [];
    for (var i = 0; i < captured.lines.length; i++) {
        var m = captured.lines[i].message;
        // Match the always-on '[RTDS] step' INFO summary, but NOT the DEBUG
        // '[RTDS] step params' dump (which also contains the substring).
        if (m.indexOf('[RTDS] step') !== -1 && m.indexOf('[RTDS] step params') === -1) {
            steps.push(m);
        }
    }
    return steps;
}

/**
 * Auto-advance through GUI handoffs. Given the entry exit key, while it's a real
 * GUI exit (not 'disconnect' / empty), record the handoff and re-enter the
 * production runtime via resumeFrom(RTDS_nextStepId). Returns a promise of the
 * terminal exit key. resumeFrom may itself return a promise (async handler in
 * the resumed chain), so each hop is normalised through Promise.resolve.
 */
function autoAdvance(sandbox, firstExitKey, maxSteps, handoffs) {
    var vars = sandbox.context.session.variables;

    function isTerminal(key) {
        return !key || key === 'disconnect';
    }

    /**
     * Does the GUI op the runtime just handed off from have a real default
     * NextStep? If not, it is end-of-flow: in production the component would
     * write _rtNextStep = -1 and resumeFrom(-1) would disconnect cleanly. We
     * mock at the exit-key boundary, so the component never runs — instead we
     * read the op's own default NextStep (the same resolveNextStep the runtime
     * uses) to decide. Without this, prepareGuiHandoff leaves RTDS_nextStepId
     * stale (it only writes when a default exists, rtds_2_runtime.js), and we
     * would resume on a stale id and loop until the max-step cap.
     */
    function guiOpHasDefaultNext() {
        var opIndex = vars.RTDS_opIndex;
        var opId = vars.RTDS_currentOpId;
        if (!opIndex || typeof opIndex.get !== 'function' || opId == null) {
            return false;
        }
        var op = opIndex.get(String(opId));
        if (!op) {
            return false;
        }
        var next = sandbox.resolveNextStep(op, null);
        return !!next;
    }

    function step(exitKey, count) {
        if (isTerminal(exitKey)) {
            return Promise.resolve(exitKey);
        }
        if (count >= maxSteps) {
            sandbox.log_error(
                '[simulate-flow] max-step cap (' + maxSteps + ') reached — halting to avoid a runaway/cyclic flow'
            );
            return Promise.resolve('disconnect');
        }

        // Record the GUI handoff the production prepareGuiHandoff just set up.
        handoffs.push({
            exitKey: exitKey,
            opId: vars.RTDS_currentOpId,
            opType: vars.RTDS_currentOpType,
            nextStepId: vars.RTDS_nextStepId,
        });

        // A GUI op with no default NextStep is end-of-flow (see above). Stop
        // cleanly — do NOT resume on the stale RTDS_nextStepId.
        if (!guiOpHasDefaultNext()) {
            return Promise.resolve('disconnect');
        }

        var nextStepId = vars.RTDS_nextStepId;
        // Real production re-entry — no op re-parsing, uses the runtime's own
        // handoff state. resumeFrom returns a string or a promise of one.
        return Promise.resolve(sandbox.resumeFrom(nextStepId)).then(function (nextKey) {
            return step(nextKey, count + 1);
        });
    }

    return step(firstExitKey, 0);
}

/** Print the end-of-run trace (R7). */
function printTrace(sandbox, captured, handoffs, finalExitKey, httpCalls) {
    var steps = extractSteps(captured);

    console.log('\n========== RTDS FLOW SIMULATION TRACE ==========');

    console.log('\nSteps visited (' + steps.length + '):');
    if (steps.length === 0) {
        console.log('  (none — flow did not dispatch any op)');
    } else {
        steps.forEach(function (s) {
            console.log('  ' + s);
        });
    }

    console.log('\nGUI handoffs (' + handoffs.length + '):');
    if (handoffs.length === 0) {
        console.log('  (none)');
    } else {
        handoffs.forEach(function (h) {
            console.log(
                '  exitKey=' + h.exitKey + ' opId=' + h.opId + ' opType=' + h.opType + ' -> nextStep=' + h.nextStepId
            );
        });
    }

    console.log('\nHTTP calls (' + httpCalls.length + '):');
    httpCalls.forEach(function (c) {
        console.log('  ' + c.method + ' ' + c.url);
    });

    var vo = sandbox.varObj || {};
    var voKeys = Object.keys(vo);
    console.log('\nvarObj writes (' + voKeys.length + ' keys):');
    voKeys.forEach(function (k) {
        var v = vo[k];
        var rendered = typeof v === 'object' ? JSON.stringify(v) : String(v) + ' (' + typeof v + ')';
        console.log('  ' + k + ' = ' + rendered);
    });

    console.log('\nFinal exit key: ' + finalExitKey);

    console.log('\nErrors (' + captured.errors.length + '):');
    if (captured.errors.length === 0) {
        console.log('  0 errors');
    } else {
        captured.errors.forEach(function (e) {
            console.log('  ' + e);
        });
    }

    console.log('\n================================================\n');
}

/**
 * Run a flow file through the production runtime. Exported for the smoke test so
 * the integration path is exercised in-process without spawning the CLI.
 *
 * @param {Object} runOpts
 * @param {string} runOpts.flowPath - path to the runtime-native flow file.
 * @param {string} [runOpts.project='rtds-runtime']
 * @param {string} [runOpts.env]
 * @param {string} [runOpts.language]
 * @param {number} [runOpts.maxSteps=100]
 * @param {Object} [runOpts.fixtures] - URL-substring → fixture body/envelope.
 * @param {boolean} [runOpts.silent] - suppress live console output (capture only).
 * @returns {Promise<{ finalExitKey, steps, handoffs, httpCalls, errors, varObj, sandbox }>}
 *          Always a promise — a synchronous failure (missing file, malformed
 *          flow that validateFlow rejects) surfaces as a rejection, not a throw.
 */
function runFlow(runOpts) {
    // Funnel synchronous failures (file read, validateFlow's loud throw) into
    // the returned promise so callers have one error channel.
    try {
        return runFlowImpl(runOpts);
    } catch (err) {
        return Promise.reject(err);
    }
}

function runFlowImpl(runOpts) {
    runOpts = runOpts || {};
    var projectName = runOpts.project || 'rtds-runtime';
    // A caller-supplied 0 is a valid "do not auto-advance" cap — only fall back
    // to the default when maxSteps is genuinely absent (not falsy-zero).
    var maxSteps = runOpts.maxSteps == null ? DEFAULT_MAX_STEPS : runOpts.maxSteps;

    var absFlowPath = path.isAbsolute(runOpts.flowPath)
        ? runOpts.flowPath
        : path.resolve(process.cwd(), runOpts.flowPath);
    if (!fs.existsSync(absFlowPath)) {
        return Promise.reject(new Error('Flow file not found: ' + absFlowPath));
    }

    // Flow files are authored in the runtime-native shape (camelCase
    // sourceId/operations/id/type/params); the runtime's parseFlow reads them
    // directly — no envelope adapter. We still fail loud on a structurally
    // malformed flow rather than letting parseFlow log + disconnect silently.
    var flow = JSON.parse(fs.readFileSync(absFlowPath, 'utf8'));
    validateFlow(flow);

    var resolvedEnv = (runOpts.env || 'acc').toLowerCase();
    var resolvedLanguage = runOpts.language ? String(runOpts.language).toUpperCase() : null;

    var seed = vocallsContext.createDefaultSeed('inbound', {
        session: { variables: { VOCALLS_ENV: resolvedEnv } },
        settings: { moduleName: projectName, defaultEnvironment: resolvedEnv },
    });

    var sandbox = vocallsContext.buildSessionContext(seed, {
        // httpMode here is irrelevant — we install our own Vocalls-shaped mock
        // below, overriding whatever the core created.
        httpMode: 'stub',
        storageMode: 'memory',
        logging: !runOpts.silent,
        projectName: projectName,
        environment: resolvedEnv,
    });

    if (resolvedLanguage) {
        sandbox.context.language = resolvedLanguage;
    }

    // RTDS_sourceId resolves from context.phone (main.js S3). Point it at the
    // flow's own sourceId so fetchAndStart requests THIS flow's routing table.
    sandbox.context.phone = String(flow.sourceId || '');

    // main.js reads global _apiResult; VM throws ReferenceError if unset.
    if (sandbox._apiResult === undefined) {
        sandbox._apiResult = null;
    }
    sandbox.varObj = sandbox.varObj || {};

    // --- Boundary 1: the HTTP mock (Vocalls shape). The flow IS the routing
    //     table; other endpoints fall to fixtures or a generic success. ---
    var http = makeFlowSimHttp({ flow: flow, fixtures: runOpts.fixtures || {} });
    sandbox.jsonHttpRequest = http.jsonHttpRequest;
    sandbox.httpRequest = http.jsonHttpRequest;

    // --- Log capture: tap the sinks (console + capture). Installed BEFORE
    //     executeScripts so the runtime uses them. ---
    var captured = { lines: [], errors: [] };
    installLogCapture(sandbox, captured, runOpts.silent);

    // --- Run the PRODUCTION code path (R1/R2). loader loads the three real
    //     libraries + main.js in dependency order into the shared VM context. ---
    sandbox = loader.executeScripts({
        sandbox: sandbox,
        userScript: 'projects/' + projectName + '/callScripts/main.js',
        validateScripts: false,
        projectName: projectName,
    });

    // main.js set the global `result` to fetchAndStart(...)'s return (a promise
    // of the entry exit key, or a sync string). Normalise and drive forward.
    var entry = sandbox.result;

    var handoffs = [];
    return Promise.resolve(entry)
        .then(function (firstExitKey) {
            return autoAdvance(sandbox, firstExitKey, maxSteps, handoffs);
        })
        .then(function (finalExitKey) {
            return {
                finalExitKey: finalExitKey,
                steps: extractSteps(captured),
                handoffs: handoffs,
                httpCalls: http.calls,
                errors: captured.errors,
                varObj: sandbox.varObj,
                captured: captured,
                sandbox: sandbox,
            };
        });
}

function main() {
    ensureProjectRoot();
    var options = parseArgs();

    if (!options.flowPath) {
        console.error('Error: a flow file path is required.\n');
        showHelp();
        process.exit(1);
    }

    console.log('RTDS Flow Simulator');
    console.log('===================');
    console.log('Flow:', options.flowPath);
    console.log('Project:', options.project);
    console.log('Env:', options.env || 'acc (default)');
    if (options.language) console.log('Language:', options.language);
    console.log('Max steps:', options.maxSteps);
    console.log('');

    runFlow(options)
        .then(function (result) {
            printTrace(
                result.sandbox,
                result.captured,
                result.handoffs,
                result.finalExitKey,
                result.httpCalls
            );
            // Non-zero exit when the runtime logged any error-level line (R7).
            process.exit(result.errors.length > 0 ? 1 : 0);
        })
        .catch(function (err) {
            console.error('\nSimulator error:', err.message);
            if (err.stack) console.error(err.stack);
            process.exit(1);
        });
}

if (require.main === module) {
    main();
}

module.exports = { runFlow: runFlow };
