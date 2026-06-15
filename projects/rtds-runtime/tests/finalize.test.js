/**
 * finalize.test.js — RTDS execution completion on interaction finalization.
 *
 * Covers the end-of-call surface added to rtds_2_runtime.js:
 *   - RTDS_finalizing flag + the GUI-filter branch in runStep: while finalizing,
 *     runStep logs and stops at a GUI-exit op instead of handing off, so only the
 *     JS-inline (data) tail of the flow runs.
 *   - finalizeFrom(nextStepId) — guarded entry point that sets RTDS_finalizing
 *     and drives runStep, returning its result (a promise when an async handler
 *     is in the tail) so the termination callback can return it for the platform
 *     to await.
 *
 * Tests register their own js/gui types into the runtime registry so they are
 * self-contained and independent of which Types the production flow registers.
 *
 * Run:
 *   npm test
 */

var path = require('path');
var fs = require('fs');
var vm = require('vm');
var h = require(path.join(process.cwd(), 'projects', 'rtds-runtime', 'tests', 'components', '_harness'));

// Decode + extract the master-layer Code attribute (the onCallResult callback)
// from the production source flow, the same way _harness.readMasterCode does for
// components -- but from callScripts/main_sourceCode.js.
function decodeEntities(s) {
    return s
        .replace(/&#xa;/g, '\n').replace(/&apos;/g, "'").replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}
function readMainCode() {
    var file = path.join(process.cwd(), 'projects', 'rtds-runtime', 'callScripts', 'main_sourceCode.js');
    var raw = fs.readFileSync(file, 'utf8');
    var k = raw.indexOf('Code=');
    var delim = raw[k + 5];
    var start = k + 6;
    var end = raw.indexOf(delim, start);
    return decodeEntities(raw.slice(start, end));
}
// Define onCallResult (from the real source flow) inside the booted sandbox so
// it closes over the live runtime: finalizeFrom, runStep, context, globals.
function defineOnCallResult(sb) {
    vm.runInContext(readMainCode(), sb);
}

// Fresh runtime per test, with finalization state reset and a couple of test-only
// Types registered: a synchronous data op (writes a varObj key) and a GUI op.
function boot() {
    return h.loadRuntime().then(function (sb) {
        sb.RTDS_finalizing = false;
        sb.context.session.variables.RTDS_error = null;

        // 'TestData' — a JS-inline op that writes params.Key=params.Value to
        // varObj via setVariable, then advances to NextStep. Mirrors what real
        // data ops (SetVariables, SendSms result) do to the store + flow.
        sb.registerRtdsOperation('TestData', function (op) {
            if (op.params && op.params.Key) {
                sb.setVariable(op.params.Key, op.params.Value);
            }
            return { nextStepId: (op.params && op.params.NextStep) || null };
        });

        // 'TestGui' — a GUI-exit op (caller-facing). Filtered out while finalizing.
        sb.registerRtdsExit('TestGui', 'test_gui');
        return sb;
    });
}

function install(sb, ops) {
    sb.context.session.variables.RTDS_opIndex = sb.buildOpIndex(ops);
}

function dataOp(id, key, value, nextStep) {
    return {
        id: id, type: 'TestData', name: 'data-' + id,
        params: { Key: key, Value: value, NextStep: nextStep || null }
    };
}

describe('finalizeFrom — finalization mode runs the data tail', function () {
    it('runs a chain of JS-inline ops to completion (happy path)', function () {
        return boot().then(function (sb) {
            install(sb, [
                dataOp('A', 'FromA', 'a', 'B'),
                dataOp('B', 'FromB', 'b', null)
            ]);

            var out = sb.finalizeFrom('A');

            expect(out).toBe('disconnect');             // tail ends -> runStep terminal
            expect(sb.getScoped('FromA', null)).toBe('a');
            expect(sb.getScoped('FromB', null)).toBe('b');
            expect(sb.RTDS_finalizing).toBe(true);      // mode latched on
        });
    });

    it('stops at a GUI node without handing off, dropping the remainder', function () {
        return boot().then(function (sb) {
            install(sb, [
                dataOp('A', 'FromA', 'a', 'GUI'),
                { id: 'GUI', type: 'TestGui', name: 'gui', params: { NextStep: 'C' } },
                dataOp('C', 'FromC', 'c', null)
            ]);
            // Pre-set so we can prove prepareGuiHandoff did NOT run.
            sb.context.session.variables.RTDS_currentOpId = 'UNCHANGED';

            var out = sb.finalizeFrom('A');

            expect(out).toBe('disconnect');
            expect(sb.getScoped('FromA', null)).toBe('a');        // ran before the GUI node
            expect(sb.getScoped('FromC', 'MISSING')).toBe('MISSING'); // remainder dropped
            expect(sb.context.session.variables.RTDS_currentOpId).toBe('UNCHANGED'); // no handoff
        });
    });

    it('skips an unregistered type to its NextStep with a warning', function () {
        return boot().then(function (sb) {
            install(sb, [
                { id: 'A', type: 'NeverRegistered', name: 'x', params: { NextStep: 'B' } },
                dataOp('B', 'FromB', 'b', null)
            ]);

            var out = sb.finalizeFrom('A');

            expect(out).toBe('disconnect');
            expect(sb.getScoped('FromB', null)).toBe('b');        // advanced past unknown op
        });
    });

    it('halts on a NextStep cycle instead of spinning forever', function () {
        return boot().then(function (sb) {
            install(sb, [dataOp('A', 'FromA', 'a', 'A')]);         // points at itself

            var out = sb.finalizeFrom('A');

            expect(out).toBe('disconnect');
            expect(sb.context.session.variables.RTDS_error).toBe('RTDS_CYCLE_DETECTED');
        });
    });

    it('awaits an async JS handler in the tail and returns a resolving promise', function () {
        return boot().then(function (sb) {
            var posted = false;
            sb.registerRtdsOperation('AsyncPost', function (op) {
                return {
                    then: function (onOk) {
                        return Promise.resolve().then(function () {
                            posted = true;                          // "HTTP" completes here
                            return onOk({ nextStepId: (op.params && op.params.NextStep) || null });
                        });
                    }
                };
            });
            install(sb, [
                { id: 'A', type: 'AsyncPost', name: 'post', params: { NextStep: 'B' } },
                dataOp('B', 'FromB', 'b', null)
            ]);

            var task = sb.finalizeFrom('A');

            expect(task && typeof task.then).toBe('function');      // returned a promise
            expect(posted).toBe(false);                             // not resolved yet
            return task.then(function (resolved) {
                expect(resolved).toBe('disconnect');
                expect(posted).toBe(true);                          // async work ran
                expect(sb.getScoped('FromB', null)).toBe('b');      // tail continued after it
            });
        });
    });
});

describe('finalizeFrom — guard on missing resume point', function () {
    [undefined, null, '', -1].forEach(function (bad) {
        it('no-ops (returns undefined, stays out of finalize mode) for: ' + JSON.stringify(bad), function () {
            return boot().then(function (sb) {
                install(sb, [dataOp('A', 'FromA', 'a', null)]);

                var out = sb.finalizeFrom(bad);

                expect(out).toBeUndefined();
                expect(sb.RTDS_finalizing).toBe(false);             // never entered finalize mode
                expect(sb.getScoped('FromA', 'MISSING')).toBe('MISSING'); // engine never ran
            });
        });
    });
});

describe('runStep — live calls are unaffected by the finalize flag', function () {
    it('hands off normally at a GUI node when not finalizing', function () {
        return boot().then(function (sb) {
            expect(sb.RTDS_finalizing).toBe(false);
            install(sb, [
                { id: 'G', type: 'TestGui', name: 'gui', params: { NextStep: 'X' } }
            ]);

            var out = sb.runStep('G');

            expect(out).toBe('test_gui');                           // normal exit key, not 'disconnect'
            expect(sb.context.session.variables.RTDS_currentOpId).toBe('G'); // prepareGuiHandoff ran
        });
    });
});

describe('onCallResult — termination callback (from main_sourceCode.js)', function () {
    function bootWithCallback() {
        return boot().then(function (sb) {
            sb._endFlowSemaphore = 0;          // declared in master Variables; reset per test
            defineOnCallResult(sb);
            expect(typeof sb.onCallResult).toBe('function');
            return sb;
        });
    }

    it('resumes from RTDS_nextStepId and returns the finalize task', function () {
        return bootWithCallback().then(function (sb) {
            install(sb, [
                dataOp('A', 'FromA', 'a', 'B'),
                dataOp('B', 'FromB', 'b', null)
            ]);
            sb.context.session.variables.RTDS_nextStepId = 'A';

            var out = sb.onCallResult();

            expect(out).toBe('disconnect');
            expect(sb._endFlowSemaphore).toBe(1);
            expect(sb.RTDS_finalizing).toBe(true);
            expect(sb.getScoped('FromA', null)).toBe('a');
            expect(sb.getScoped('FromB', null)).toBe('b');
        });
    });

    it('falls back to RTDS_currentOpId when RTDS_nextStepId is unset', function () {
        return bootWithCallback().then(function (sb) {
            install(sb, [dataOp('A', 'FromA', 'a', null)]);
            sb.context.session.variables.RTDS_nextStepId = null;
            sb.context.session.variables.RTDS_currentOpId = 'A';

            sb.onCallResult();

            expect(sb.getScoped('FromA', null)).toBe('a');
        });
    });

    it('is idempotent: a second invocation is a no-op (semaphore guard)', function () {
        return bootWithCallback().then(function (sb) {
            install(sb, [dataOp('A', 'FromA', '1', null)]);
            sb.context.session.variables.RTDS_nextStepId = 'A';

            sb.onCallResult();
            expect(sb._endFlowSemaphore).toBe(1);
            expect(sb.getScoped('FromA', null)).toBe('1');

            // Re-point the flow; a guarded second call must NOT run it again.
            install(sb, [dataOp('A', 'FromA', '2', null)]);
            var second = sb.onCallResult();

            expect(second).toBeUndefined();
            expect(sb._endFlowSemaphore).toBe(1);
            expect(sb.getScoped('FromA', null)).toBe('1');   // unchanged -> engine did not re-run
        });
    });

    it('with no resume point set, returns cleanly without entering finalize mode', function () {
        return bootWithCallback().then(function (sb) {
            install(sb, [dataOp('A', 'FromA', 'a', null)]);
            sb.context.session.variables.RTDS_nextStepId = null;
            sb.context.session.variables.RTDS_currentOpId = null;

            var out = sb.onCallResult();

            expect(out).toBeUndefined();
            expect(sb._endFlowSemaphore).toBe(1);            // guard still incremented (entered once)
            expect(sb.RTDS_finalizing).toBe(false);          // finalizeFrom guard returned before latching
            expect(sb.getScoped('FromA', 'MISSING')).toBe('MISSING');
        });
    });

    it('platform-await contract: the returned promise resolves only after the async tail completes', function () {
        return bootWithCallback().then(function (sb) {
            var posted = false;
            sb.registerRtdsOperation('AsyncPost', function (op) {
                return {
                    then: function (onOk) {
                        return Promise.resolve().then(function () {
                            posted = true;
                            return onOk({ nextStepId: (op.params && op.params.NextStep) || null });
                        });
                    }
                };
            });
            install(sb, [
                { id: 'A', type: 'AsyncPost', name: 'post', params: { NextStep: 'B' } },
                dataOp('B', 'FromB', 'b', null)
            ]);
            sb.context.session.variables.RTDS_nextStepId = 'A';

            var task = sb.onCallResult();

            expect(task && typeof task.then).toBe('function');
            expect(posted).toBe(false);                      // platform would still be awaiting
            return task.then(function (resolved) {
                expect(resolved).toBe('disconnect');
                expect(posted).toBe(true);                   // async POST completed before resolve
                expect(sb.getScoped('FromB', null)).toBe('b');
            });
        });
    });
});
