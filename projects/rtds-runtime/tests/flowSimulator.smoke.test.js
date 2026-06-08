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

function expectedSourceIdFromFlowFile(flowPath) {
    var raw = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
    return raw.SourceId || raw.sourceId;
}

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
                    return h.opType === 'guardTui';
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
                    return s.id;
                });
                expect(ids).toEqual(['00000', '00001', '00098', '00100']);

                // Each step carries the config (params) fed to its component/handler.
                var guardStep = result.steps.filter(function (s) {
                    return s.type === 'guardTui';
                })[0];
                expect(guardStep).toBeTruthy();
                expect(guardStep.config).toBeTruthy();
                expect(guardStep.config.configId).toBe(3);
                expect(guardStep.config.nextStep_Success).toBe('00098');

                // No error-level logs on a clean run.
                expect(result.errors).toHaveLength(0);
            });
    });

    it('snapshots RTDS_* vars per GUI handoff (currentOpId/Config/nextStep)', function () {
        return simulateFlow
            .runFlow({ flowPath: REAL_FLOW, silent: true })
            .then(function (result) {
                var guardHandoff = result.handoffs.filter(function (h) {
                    return h.opType === 'guardTui';
                })[0];
                expect(guardHandoff.rtdsVars).toBeTruthy();
                expect(guardHandoff.rtdsVars.RTDS_currentOpId).toBe('00001');
                expect(guardHandoff.rtdsVars.RTDS_currentOpType).toBe('guardTui');
                // The config mirrored into the session for the component handoff.
                expect(guardHandoff.rtdsVars.RTDS_currentOpConfig.configId).toBe(3);
                expect(guardHandoff.rtdsVars.RTDS_nextStepId).toBe('00098');
                expect(guardHandoff.rtdsVars.RTDS_sourceId).toBe(
                    expectedSourceIdFromFlowFile(REAL_FLOW)
                );
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
        // operations present but none flagged isFirstOperation -> production
        // getFirstOperation calls log_error and parseFlow returns null, so
        // fetchAndStart disconnects with an RTDS error logged.
        var flowPath = writeTempFlow({
            sourceId: '+3200000000',
            operations: [
                { id: '00000', type: 'setVariables', name: 'no-entry', params: { nextStep: '' } },
            ],
        });
        return simulateFlow.runFlow({ flowPath: flowPath, silent: true }).then(function (result) {
            expect(result.errors.length).toBeGreaterThan(0);
            // The disconnect is reached, but errors > 0 means the run failed.
            expect(result.finalExitKey).toBe('disconnect');
        });
    });

    it('rejects loudly on a malformed flow with no operations array', function () {
        var flowPath = writeTempFlow({ sourceId: 'X' });
        return simulateFlow
            .runFlow({ flowPath: flowPath, silent: true })
            .then(function () {
                throw new Error('expected runFlow to reject on malformed flow');
            })
            .catch(function (err) {
                expect(err.message).toMatch(/no non-empty "operations" array/);
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
            sourceId: '+3200000001',
            operations: [
                { id: '00000', type: 'playPrompt', name: 'a', isFirstOperation: true, params: { nextStep: '00001' } },
                { id: '00001', type: 'playPrompt', name: 'b', params: { nextStep: '00000' } },
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

describe('flow simulator — terminal GUI op with no NextStep', function () {
    it('ends cleanly (no error, no cap) at a non-Disconnect GUI op with no NextStep', function () {
        // A final GUI-exit op (PlayPrompt) with no NextStep is end-of-flow. In
        // production the component writes _rtNextStep = -1; here prepareGuiHandoff
        // leaves RTDS_nextStepId stale (it only writes when a default exists), so
        // a naive resume would loop on the stale id until the cap. The simulator
        // detects the missing default NextStep and stops cleanly instead.
        var flowPath = writeTempFlow({
            sourceId: '+3200000002',
            operations: [
                { id: '00000', type: 'setVariables', name: 'init', isFirstOperation: true, params: { nextStep: '00001' } },
                { id: '00001', type: 'playPrompt', name: 'bye', params: { prompt: 'goodbye' } },
            ],
        });
        return simulateFlow
            .runFlow({ flowPath: flowPath, silent: true, maxSteps: 10 })
            .then(function (result) {
                expect(result.finalExitKey).toBe('disconnect');
                // Clean stop: no max-step cap error, no other errors.
                expect(result.errors).toHaveLength(0);
                // The terminal PlayPrompt handoff was recorded exactly once
                // (not looped) before the clean stop.
                var playHandoffs = result.handoffs.filter(function (h) {
                    return h.opType === 'playPrompt';
                });
                expect(playHandoffs.length).toBe(1);
            });
    });
});
