/**
 * Contract test — sendSms component (runtime twin executeSendSms).
 *
 * Canonical worked example of a component branch-contract test. Asserts the
 * params-in -> NextStep-out contract from the spec (rtds/specs/sendSms.spec.md):
 *   - inactive            -> NextStep        (no HTTP)
 *   - gateway success     -> NextStep_Success
 *   - gateway non-success -> NextStep_Failure
 *   - invalid To number   -> NextStep        (validation skip, no HTTP)
 *
 * Mirror this shape (via _harness.js) when adding a contract test for a new
 * HTTP-calling operation. See _template.js for a failing-by-default starting
 * point.
 */

var h = require('./_harness');

var BASE_PARAMS = {
    Active: true,
    To: '+32478306999',
    From: '8850',
    Routing: 'LPA_DEV',
    Body: 'hi',
    SmsAccountId: 47,
    NextStep: '00012',
    NextStep_Success: '00011',
    NextStep_Failure: '00099'
};

function op(params) {
    return { id: 'sms-contract', type: 'SendSMS', name: 'sms', params: params };
}

describe('sendSms component contract', function () {
    it('Covers AE: gateway success -> NextStep_Success, with payload contract', function () {
        return h.loadRuntime().then(function (sb) {
            var gw = h.withGateway(sb, { success: true, statusCode: 200 });
            return sb.executeSendSms(op(BASE_PARAMS)).then(function (out) {
                expect(out.nextStepId).toBe('00011');
                expect(gw.lastUrl).toBe('https://api.example/sms');
                expect(gw.lastBody.to).toBe('+32478306999');
                expect(gw.lastBody.smsAccountId).toBe(47);
            });
        });
    });

    it('Covers AE: gateway non-success -> NextStep_Failure', function () {
        return h.loadRuntime().then(function (sb) {
            h.withGateway(sb, { success: false, statusCode: 502 });
            return sb.executeSendSms(op(BASE_PARAMS)).then(function (out) {
                expect(out.nextStepId).toBe('00099');
            });
        });
    });

    it('Covers AE: inactive -> NextStep, no HTTP call', function () {
        return h.loadRuntime().then(function (sb) {
            var gw = h.forbidGateway(sb);
            var out = sb.executeSendSms(
                op({ Active: false, To: '+32478306999', NextStep: '00012' })
            );
            expect(out.nextStepId).toBe('00012');
            expect(gw.called).toBe(false);
        });
    });

    it('Covers AE: invalid To number -> NextStep, no HTTP call', function () {
        return h.loadRuntime().then(function (sb) {
            var gw = h.forbidGateway(sb);
            var out = sb.executeSendSms(
                op({ Active: true, To: 'not-a-number', NextStep: '00012' })
            );
            expect(out.nextStepId).toBe('00012');
            expect(gw.called).toBe(false);
        });
    });
});
