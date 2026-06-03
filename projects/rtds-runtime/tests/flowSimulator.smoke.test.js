/**
 * flowSimulator.smoke.test.js — U3 integration coverage (covers AE2, AE4)
 *
 * Drives the PRODUCTION runtime end-to-end via cli/simulate-flow.js's exported
 * runFlow(): real main.js -> fetchAndStart -> parseFlow -> runStep -> resumeFrom,
 * mocking only the HTTP + GUI boundaries. Integration-first (per the plan's
 * execution note): the highest-value proof, mirroring real use.
 *
 * Lives under projects/<name>/tests/ because that's the only path Jest's
 * testMatch discovers (see jest.config.js testMatch).
 *
 * Run:
 *   npm test
 */

var fs = require('fs');
var os = require('os');
var path = require('path');

var simulateFlow = require(path.join(process.cwd(), 'cli', 'simulate-flow'));

var REAL_FLOW = path.join(
    process.cwd(),
    'callflow_json_config_vocalls',
    'DIGIPOLIS_LPA_ICT_GUARD_TUI_PRD.json'
);

// Write a temp authoring-format flow file, return its path. Cleaned up after.
var tempFiles = [];
function writeTempFlow(obj) {
    var p = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'rtds-sim-')),
        'flow.json'
    );
    fs.writeFileSync(p, JSON.stringify(obj), 'utf8');
    tempFiles.push(p);
    return p;
}

afterAll(function () {
    tempFiles.forEach(function (p) {
        try {
            fs.unlinkSync(p);
        } catch (e) {}
    });
});

describe('flow simulator — real GuardTui flow end-to-end (covers AE2, AE4)', function () {
    it('reaches a GUI exit, records the handoff, resumes, and ends at disconnect', function () {
        return simulateFlow
            .runFlow({ flowPath: REAL_FLOW, silent: true })
            .then(function (result) {
                // AE2: the run terminates cleanly at disconnect after auto-advancing.
                expect(result.finalExitKey).toBe('disconnect');

                // AE2: a GUI handoff was recorded for the GuardTui op and it
                // resumed on the op's default NextStep (00098).
                var guardHandoff = result.handoffs.filter(function (h) {
                    return h.opType === 'GuardTui_vocalls';
                })[0];
                expect(guardHandoff).toBeTruthy();
                expect(guardHandoff.exitKey).toBe('guard_tui');
                expect(guardHandoff.nextStepId).toBe('00098');
            });
    });

    it('reports ordered steps, final exit key, and 0 errors (AE4)', function () {
        return simulateFlow
            .runFlow({ flowPath: REAL_FLOW, silent: true })
            .then(function (result) {
                // Ordered steps: every dispatched op id, in order, exactly once each.
                var ids = result.steps.map(function (s) {
                    var m = s.match(/"id":"(\d+)"/);
                    return m ? m[1] : null;
                });
                expect(ids).toEqual(['00000', '00001', '00098', '00100']);

                // No error-level logs on a clean run.
                expect(result.errors).toHaveLength(0);
            });
    });

    it('serves the adapted flow for the routing-table fetch (no shape error)', function () {
        return simulateFlow
            .runFlow({ flowPath: REAL_FLOW, silent: true })
            .then(function (result) {
                var routingCall = result.httpCalls.filter(function (c) {
                    return c.url.indexOf('routing-table/source') !== -1;
                })[0];
                expect(routingCall).toBeTruthy();
                expect(routingCall.method).toBe('GET');
                // If the shape had mismatched, fetchAndStart would have logged
                // an RTDS_API_ERROR / parse error and never dispatched any op.
                expect(result.steps.length).toBeGreaterThan(0);
            });
    });

    it('preserves native param types into varObj-readable runtime state (AE4)', function () {
        return simulateFlow
            .runFlow({ flowPath: REAL_FLOW, silent: true })
            .then(function (result) {
                // varObj is seeded by the real initializeCallFlowContext with
                // native-typed values — proves the runtime ran, types intact.
                expect(typeof result.varObj.debugCall).toBe('boolean');
                expect(typeof result.varObj.ani).toBe('string');
            });
    });
});

describe('flow simulator — error surfacing', function () {
    it('surfaces a runtime error distinctly and reflects failure', function () {
        // Operations present but none flagged IsFirstOperation -> production
        // getFirstOperation calls log_error and parseFlow returns null, so
        // fetchAndStart disconnects with an RTDS error logged.
        var flowPath = writeTempFlow({
            SourceId: '+3200000000',
            Operations: [
                { Id: '00000', Type: 'SetVariables_vocalls', Name: 'no-entry', Params: { NextStep: '' } },
            ],
        });
        return simulateFlow.runFlow({ flowPath: flowPath, silent: true }).then(function (result) {
            expect(result.errors.length).toBeGreaterThan(0);
            // The disconnect is reached, but errors > 0 means the run failed.
            expect(result.finalExitKey).toBe('disconnect');
        });
    });

    it('throws loudly (adapter) on a malformed flow with no Operations', function () {
        var flowPath = writeTempFlow({ SourceId: 'X' });
        return simulateFlow
            .runFlow({ flowPath: flowPath, silent: true })
            .then(function () {
                throw new Error('expected runFlow to reject on malformed flow');
            })
            .catch(function (err) {
                expect(err.message).toMatch(/Operations is missing/);
            });
    });
});

describe('flow simulator — max-step cap', function () {
    it('halts a cyclic GUI flow instead of hanging', function () {
        // Two GUI-exit ops whose default NextStep points at each other: the
        // production runStep starts a fresh visited-set on each resumeFrom, so
        // the cycle would auto-advance forever — the simulator's max-step cap
        // is what halts it.
        var flowPath = writeTempFlow({
            SourceId: '+3200000001',
            Operations: [
                { Id: '00000', Type: 'PlayPrompt_vocalls', Name: 'a', IsFirstOperation: true, Params: { NextStep: '00001' } },
                { Id: '00001', Type: 'PlayPrompt_vocalls', Name: 'b', Params: { NextStep: '00000' } },
            ],
        });
        return simulateFlow
            .runFlow({ flowPath: flowPath, silent: true, maxSteps: 5 })
            .then(function (result) {
                expect(result.finalExitKey).toBe('disconnect');
                // The cap fired (an error line names the cap) and handoffs were
                // bounded by it rather than growing without limit.
                var capHit = result.errors.some(function (e) {
                    return e.indexOf('max-step cap') !== -1;
                });
                expect(capHit).toBe(true);
                expect(result.handoffs.length).toBeLessThanOrEqual(5);
            });
    });
});
