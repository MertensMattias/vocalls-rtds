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
var h = require(path.join(process.cwd(), 'projects', 'rtds-runtime', 'tests', 'components', '_harness'));

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
