/**
 * Contract test — sendSms component (runtime twin executeSendSms).
 *
 * Canonical worked example of a component branch-contract test. Under the
 * unified __rtOutcome contract the twin stages an outcome KEY (the engine
 * resolves it to a step id), so this asserts the staged __rtOutcome from the
 * spec (rtds/specs/sendSms.spec.md):
 *   - inactive            -> 'nextStep'          (no HTTP)
 *   - gateway success     -> 'nextStep_Success'
 *   - gateway non-success -> 'nextStep_Failure'
 *   - invalid To number   -> 'nextStep'          (validation skip, no HTTP)
 *
 * Mirror this shape (via _harness.js) when adding a contract test for a new
 * HTTP-calling operation.
 */

var h = require('./_harness');

var BASE_PARAMS = {
    active: true,
    to: '+32478306999',
    from: '8850',
    routing: 'LPA_DEV',
    body: 'hi',
    smsAccountId: 47,
    nextStep: '00012',
    nextStep_Success: '00011',
    nextStep_Failure: '00099'
};

function op(params) {
    return { id: 'sms-contract', type: 'sendSms', name: 'sms', params: params };
}

describe('sendSms component contract', function () {
    it('Covers AE: gateway success -> nextStep_Success, with payload contract', function () {
        return h.loadRuntime().then(function (sb) {
            var gw = h.withGateway(sb, { success: true, statusCode: 200 });
            return Promise.resolve(sb.executeSendSms(op(BASE_PARAMS))).then(function () {
                expect(sb.__rtOutcome).toBe('nextStep_Success');
                expect(gw.lastUrl).toBe('https://api.example/sms');
                expect(gw.lastBody.to).toBe('+32478306999');
                expect(gw.lastBody.smsAccountId).toBe(47);
            });
        });
    });

    it('Covers AE: gateway non-success -> nextStep_Failure', function () {
        return h.loadRuntime().then(function (sb) {
            h.withGateway(sb, { success: false, statusCode: 502 });
            return Promise.resolve(sb.executeSendSms(op(BASE_PARAMS))).then(function () {
                expect(sb.__rtOutcome).toBe('nextStep_Failure');
            });
        });
    });

    it('Covers AE: inactive -> nextStep, no HTTP call', function () {
        return h.loadRuntime().then(function (sb) {
            var gw = h.forbidGateway(sb);
            sb.executeSendSms(op({ active: false, to: '+32478306999', nextStep: '00012' }));
            expect(sb.__rtOutcome).toBe('nextStep');   // synchronous skip
            expect(gw.called).toBe(false);
        });
    });

    it('Covers AE: invalid To number -> nextStep, no HTTP call', function () {
        return h.loadRuntime().then(function (sb) {
            var gw = h.forbidGateway(sb);
            sb.executeSendSms(op({ active: true, to: 'not-a-number', nextStep: '00012' }));
            expect(sb.__rtOutcome).toBe('nextStep');   // synchronous validation skip
            expect(gw.called).toBe(false);
        });
    });
});
