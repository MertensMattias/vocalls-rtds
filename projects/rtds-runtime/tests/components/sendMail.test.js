/**
 * Contract test — sendMail component (runtime twin executeSendEmail).
 *
 * Under the unified __rtOutcome contract the twin stages an outcome KEY (the
 * engine resolves it to a step id). Asserts the staged __rtOutcome per branch
 * from the spec (rtds/specs/sendEmail.spec.md):
 *   - inactive            -> 'nextStep'          (no HTTP)
 *   - missing From/To     -> 'nextStep'          (validation skip, no HTTP)
 *   - gateway success     -> 'nextStep_Success'
 *   - gateway non-success -> 'nextStep_Failure'
 * Active defaults FALSE.
 */

var h = require('./_harness');

var BASE_PARAMS = {
    active: true,
    from: 'noreply@n-allo.be',
    to: 'a@x.be; b@x.be',
    subject: 'Hi',
    body: 'Body',
    priority: 2,
    nextStep: '00022',
    nextStep_Success: '00021',
    nextStep_Failure: '00099'
};

function op(params) {
    return { id: 'mail-contract', type: 'sendMail', name: 'mail', params: params };
}

function withMailGateway(sb, result) {
    var cap = h.withGateway(sb, result);
    sb._rtMailEndpoint = '/mail';
    return cap;
}

describe('sendMail component contract (twin executeSendEmail)', function () {
    it('gateway success -> nextStep_Success, with recipient + payload contract', function () {
        return h.loadRuntime().then(function (sb) {
            var gw = withMailGateway(sb, { success: true, statusCode: 200 });
            return Promise.resolve(sb.executeSendEmail(op(BASE_PARAMS))).then(function () {
                expect(sb.__rtOutcome).toBe('nextStep_Success');
                expect(gw.lastUrl).toBe('https://api.example/mail');
                expect(gw.lastBody.to).toEqual(['a@x.be', 'b@x.be']);
                expect(gw.lastBody.hasOwnProperty('cc')).toBe(false); // empty dropped
            });
        });
    });

    it('gateway non-success -> nextStep_Failure', function () {
        return h.loadRuntime().then(function (sb) {
            withMailGateway(sb, { success: false, statusCode: 502 });
            return Promise.resolve(sb.executeSendEmail(op(BASE_PARAMS))).then(function () {
                expect(sb.__rtOutcome).toBe('nextStep_Failure');
            });
        });
    });

    it('out-of-range priority coerced to 2', function () {
        return h.loadRuntime().then(function (sb) {
            var gw = withMailGateway(sb, { success: true, statusCode: 200 });
            var p = {};
            for (var k in BASE_PARAMS) p[k] = BASE_PARAMS[k];
            p.priority = 9;
            return Promise.resolve(sb.executeSendEmail(op(p))).then(function () {
                expect(gw.lastBody.priority).toBe(2);
            });
        });
    });

    it('explicit active:false -> nextStep, no HTTP', function () {
        return h.loadRuntime().then(function (sb) {
            // Active defaults TRUE now, so the skip path needs an explicit false.
            var gw = h.forbidGateway(sb);
            sb.executeSendEmail(op({ active: false, from: 'a@b.c', to: 'd@e.f', nextStep: '00022' }));
            expect(sb.__rtOutcome).toBe('nextStep');   // synchronous skip
            expect(gw.called).toBe(false);
        });
    });

    it('missing To -> nextStep, no HTTP', function () {
        return h.loadRuntime().then(function (sb) {
            var gw = h.forbidGateway(sb);
            sb.executeSendEmail(op({ active: true, from: 'a@b.c', to: '', nextStep: '00022' }));
            expect(sb.__rtOutcome).toBe('nextStep');
            expect(gw.called).toBe(false);
        });
    });
});
