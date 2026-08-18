/**
 * Contract test — condition component (runtime twin executeCondition).
 *
 * Asserts the params-in -> NextStep-out contract from the spec
 * (rtds/specs/condition.spec.md):
 *   - predicate true      -> nextStep_True
 *   - predicate false     -> nextStep_False (also the fail-safe: unknown
 *                            operator, non-numeric ordering operands)
 *   - inactive            -> nextStep
 * Pure local evaluation: NO path may call the operation gateway.
 *
 * Operator semantics live in the shared evaluateCondition helper
 * (rtds_3_vocallsEnv.js), which the component aliases as __evaluateCondition —
 * the delegation describe at the bottom proves the alias wiring.
 */

var h = require('./_harness');

var BASE_PARAMS = {
    active: true,
    value: 'B2B',
    operator: 'eq',
    compareTo: 'B2B',
    nextStep_True: '00010',
    nextStep_False: '00020',
    nextStep: '00030'
};

function op(params) {
    return { id: 'cond-contract', type: 'condition', name: 'cond', params: params };
}

function merged(delta) {
    var out = {};
    var key;
    for (key in BASE_PARAMS) {
        if (BASE_PARAMS.hasOwnProperty(key)) out[key] = BASE_PARAMS[key];
    }
    for (key in delta) {
        if (delta.hasOwnProperty(key)) out[key] = delta[key];
    }
    return out;
}

describe('condition component contract', function () {
    function run(delta, seedVarObj) {
        return h.loadRuntime().then(function (sb) {
            var gw = h.forbidGateway(sb);
            if (seedVarObj) {
                for (var key in seedVarObj) {
                    if (seedVarObj.hasOwnProperty(key)) sb.varObj[key] = seedVarObj[key];
                }
            }
            var out = sb.executeCondition(op(merged(delta)));
            expect(gw.called).toBe(false);
            return out;
        });
    }

    it('Covers AE: string eq (case-insensitive) -> nextStep_True', function () {
        return run({ compareTo: 'b2b' }).then(function (out) {
            expect(out.nextStepId).toBe('00010');
        });
    });

    it('Covers AE: eq mismatch -> nextStep_False', function () {
        return run({ compareTo: 'B2C' }).then(function (out) {
            expect(out.nextStepId).toBe('00020');
        });
    });

    it('Covers AE: numeric eq -- "007" eq "7" -> nextStep_True', function () {
        return run({ value: '007', compareTo: '7' }).then(function (out) {
            expect(out.nextStepId).toBe('00010');
        });
    });

    it('Covers AE: gt numeric -- "10" gt "9" -> nextStep_True', function () {
        return run({ value: '10', operator: 'gt', compareTo: '9' }).then(function (out) {
            expect(out.nextStepId).toBe('00010');
        });
    });

    it('Covers AE: gt non-numeric operand -> fail-safe nextStep_False', function () {
        return run({ value: 'abc', operator: 'gt', compareTo: '9' }).then(function (out) {
            expect(out.nextStepId).toBe('00020');
        });
    });

    it('Covers AE: contains (case-insensitive) -> nextStep_True', function () {
        return run({ value: 'Hello World', operator: 'contains', compareTo: 'world' }).then(
            function (out) {
                expect(out.nextStepId).toBe('00010');
            }
        );
    });

    it('Covers AE: notContains absent substring -> nextStep_True', function () {
        return run({ value: 'Hello World', operator: 'notContains', compareTo: 'xyz' }).then(
            function (out) {
                expect(out.nextStepId).toBe('00010');
            }
        );
    });

    it('Covers AE: isEmpty on blank value -> nextStep_True', function () {
        return run({ value: '   ', operator: 'isEmpty', compareTo: '' }).then(function (out) {
            expect(out.nextStepId).toBe('00010');
        });
    });

    it('Covers AE: isEmpty on non-empty value -> nextStep_False', function () {
        return run({ value: 'x', operator: 'isEmpty', compareTo: '' }).then(function (out) {
            expect(out.nextStepId).toBe('00020');
        });
    });

    it('Covers AE: unknown operator -> fail-safe nextStep_False', function () {
        return run({ operator: 'foo' }).then(function (out) {
            expect(out.nextStepId).toBe('00020');
        });
    });

    it('Covers AE: inactive -> nextStep, no evaluation', function () {
        return run({ active: false, value: 'B2B', compareTo: 'B2B' }).then(function (out) {
            expect(out.nextStepId).toBe('00030');
        });
    });

    it('Covers AE: ${var} placeholder resolves varObj-first -> nextStep_True', function () {
        return run({ value: '${customerType}' }, { customerType: 'B2B' }).then(function (out) {
            expect(out.nextStepId).toBe('00010');
        });
    });

    it('Covers AE: true predicate with missing nextStep_True -> falls back to nextStep', function () {
        return run({ nextStep_True: '' }).then(function (out) {
            expect(out.nextStepId).toBe('00030');
        });
    });
});

describe('condition clock tier (statistic time/date)', function () {
    it('Covers AE: statistic time -- always-true threshold -> nextStep_True (sync, no HTTP)', function () {
        return h.loadRuntime().then(function (sb) {
            var gw = h.withGateway(sb, { success: true, statusCode: 200 });
            var out = sb.executeCondition(op(merged({ statistic: 'time', value: '', operator: 'ge', compareTo: '0' })));
            expect(out.nextStepId).toBe('00010');
            expect(gw.calls).toBe(0);
        });
    });

    it('Covers AE: statistic time -- always-false threshold -> nextStep_False', function () {
        return h.loadRuntime().then(function (sb) {
            var out = sb.executeCondition(op(merged({ statistic: 'time', value: '', operator: 'lt', compareTo: '0' })));
            expect(out.nextStepId).toBe('00020');
        });
    });

    it('clockStatistic resolves HHMM / YYYYMMDD from an explicit date', function () {
        return h.loadRuntime().then(function (sb) {
            var d = new Date(2026, 0, 5, 14, 59); // 2026-01-05 14:59 local
            expect(sb.clockStatistic('time', d)).toBe(1459);
            expect(sb.clockStatistic('date', d)).toBe(20260105);
            expect(sb.clockStatistic('nonsense', d)).toBe(null);
        });
    });
});

describe('condition queue tier (wallboard statistics)', function () {
    var WALLBOARD = [
        { name: 'SW_TS', waiting: 42, longest_wait: '01:30', received: 18, answered: 18, abandoned: 0, accessibility: 100 },
        { name: 'SW_Omgeving', waiting: 0, longest_wait: '00:00', received: 31, answered: 29, abandoned: 2, accessibility: 94 }
    ];

    function queueParams(delta) {
        return merged(Object.assign(
            { statistic: 'waiting', queue: 'SW_TS', value: '', operator: 'gt', compareTo: '39' },
            delta || {}
        ));
    }

    it('Covers AE: waiting gt threshold via wallboard API -> nextStep_True, with URL contract', function () {
        return h.loadRuntime().then(function (sb) {
            var gw = h.withGateway(sb, { success: true, statusCode: 200, response: WALLBOARD });
            return Promise.resolve(sb.executeCondition(op(queueParams()))).then(function (out) {
                expect(out.nextStepId).toBe('00010');
                expect(gw.calls).toBe(1);
                expect(gw.lastUrl.indexOf('queues=SW_TS')).not.toBe(-1);
                expect(gw.lastUrl.indexOf('company_id=')).not.toBe(-1);
            });
        });
    });

    it('Covers AE: waiting below threshold -> nextStep_False', function () {
        return h.loadRuntime().then(function (sb) {
            h.withGateway(sb, { success: true, statusCode: 200, response: WALLBOARD });
            return Promise.resolve(
                sb.executeCondition(op(queueParams({ queue: 'SW_Omgeving' })))
            ).then(function (out) {
                expect(out.nextStepId).toBe('00020');
            });
        });
    });

    it('Covers AE: wallboard request fails -> fail-safe nextStep_False', function () {
        return h.loadRuntime().then(function (sb) {
            h.withGateway(sb, { success: false, statusCode: 502 });
            return Promise.resolve(sb.executeCondition(op(queueParams()))).then(function (out) {
                expect(out.nextStepId).toBe('00020');
            });
        });
    });

    it('Covers AE: queue absent from the response -> fail-safe nextStep_False', function () {
        return h.loadRuntime().then(function (sb) {
            h.withGateway(sb, { success: true, statusCode: 200, response: WALLBOARD });
            return Promise.resolve(
                sb.executeCondition(op(queueParams({ queue: 'NO_SUCH_QUEUE' })))
            ).then(function (out) {
                expect(out.nextStepId).toBe('00020');
            });
        });
    });

    it('Covers AE: wallboard statistic without queue param -> nextStep_False, no stats call', function () {
        return h.loadRuntime().then(function (sb) {
            var gw = h.withGateway(sb, { success: true, statusCode: 200, response: WALLBOARD });
            var out = sb.executeCondition(op(queueParams({ queue: '' })));
            expect(out.nextStepId).toBe('00020');
            // The warn's EventLog POST may pass through the stub; only the
            // wallboard stats URL is forbidden on this path.
            expect(String(gw.lastUrl).indexOf('queues=')).toBe(-1);
        });
    });

    it('extractQueueStatistic matches case-insensitively and parses mm:ss durations', function () {
        return h.loadRuntime().then(function (sb) {
            expect(sb.extractQueueStatistic(WALLBOARD, 'sw_ts', 'waiting')).toBe(42);
            expect(sb.extractQueueStatistic(WALLBOARD, 'SW_TS', 'longest_wait')).toBe(90);
            expect(sb.extractQueueStatistic(WALLBOARD, 'SW_TS', 'longestWait')).toBe(90);
            expect(sb.extractQueueStatistic(WALLBOARD, 'SW_Omgeving', 'accessibility')).toBe(94);
            expect(sb.extractQueueStatistic(WALLBOARD, 'SW_TS', 'noSuchStat')).toBe(null);
            expect(sb.extractQueueStatistic(WALLBOARD, 'ghost', 'waiting')).toBe(null);
            expect(sb.extractQueueStatistic(null, 'SW_TS', 'waiting')).toBe(null);
        });
    });
});

describe('condition master Code — alias delegation', function () {
    it('__evaluateCondition delegates to the shared library implementation', function () {
        var sb = h.loadMasterCode('condition');
        expect(sb.__evaluateCondition('5', 'gt', '3')).toBe(true);
        expect(sb.__evaluateCondition('B2B', 'eq', 'b2b')).toBe(true);
        expect(sb.__evaluateCondition('Hello', 'contains', 'ell')).toBe(true);
        expect(sb.__evaluateCondition('  ', 'isEmpty', '')).toBe(true);
        expect(sb.__evaluateCondition('x', 'nonsense', 'y')).toBe(false);
        expect(sb.__warns.length).toBeGreaterThan(0); // unknown operator warned
    });

    it('__clockStatistic / __extractQueueStatistic delegate to the shared library', function () {
        var sb = h.loadMasterCode('condition');
        var d = new Date(2026, 0, 5, 14, 59);
        expect(sb.__clockStatistic('time', d)).toBe(1459);
        expect(sb.__extractQueueStatistic(
            [{ name: 'SW_TS', waiting: 7 }], 'SW_TS', 'waiting'
        )).toBe(7);
    });
});
