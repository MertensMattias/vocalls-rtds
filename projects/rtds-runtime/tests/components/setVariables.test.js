/**
 * Contract test — setVariables component (runtime twin executeSetVariables).
 *
 * Under the unified __rtOutcome contract the twin builds __rtParams via
 * setupConfig, writes non-control params to varObj, and stages __rtOutcome;
 * the engine resolves _rtNextStep. Asserts the staged outcome + the store
 * writes. Active defaults FALSE (requester decision).
 */

var h = require('./_harness');

function op(params) {
    return { id: 'sv-contract', type: 'setVariables', name: 'sv', params: params };
}

describe('setVariables component contract (twin executeSetVariables)', function () {
    it('inactive by default (no active key) -> skips, stages nextStep, writes nothing', function () {
        return h.loadRuntime().then(function (sb) {
            delete sb.varObj.foo;
            sb.executeSetVariables(op({ foo: 'bar', nextStep: '00002' }));
            expect(sb.__rtOutcome).toBe('nextStep');
            expect(sb.varObj.foo).toBeUndefined();
        });
    });

    it('active -> writes non-control params to varObj, stages nextStep', function () {
        return h.loadRuntime().then(function (sb) {
            delete sb.varObj.foo;
            sb.executeSetVariables(op({ active: true, foo: 'bar', nextStep: '00002' }));
            expect(sb.__rtOutcome).toBe('nextStep');
            expect(sb.varObj.foo).toBe('bar');
        });
    });

    it('explicit active:false -> skips', function () {
        return h.loadRuntime().then(function (sb) {
            delete sb.varObj.foo;
            sb.executeSetVariables(op({ active: false, foo: 'bar', nextStep: '00002' }));
            expect(sb.__rtOutcome).toBe('nextStep');
            expect(sb.varObj.foo).toBeUndefined();
        });
    });

    it('never writes the control keys (active / nextStep) to the store', function () {
        return h.loadRuntime().then(function (sb) {
            delete sb.varObj.active;
            delete sb.varObj.nextStep;
            sb.executeSetVariables(op({ active: true, real: 'x', nextStep: '00002' }));
            expect(sb.varObj.real).toBe('x');
            expect('active' in sb.varObj).toBe(false);
            expect('nextStep' in sb.varObj).toBe(false);
        });
    });

    it('engine resolves the staged outcome to the params step id', function () {
        return h.loadRuntime().then(function (sb) {
            sb.executeSetVariables(op({ active: true, k: 'v', nextStep: '00007' }));
            expect(sb.getValue(sb.__rtParams, sb.__rtOutcome, '')).toBe('00007');
        });
    });
});
