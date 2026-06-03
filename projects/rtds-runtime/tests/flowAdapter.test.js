/**
 * flowAdapter.test.js — U1 coverage (covers AE1, AE3)
 *
 * The adapter converts authoring-format (PascalCase) routing-table objects into
 * the runtime/API shape, converting structural/envelope keys only and leaving
 * `params` contents untouched. Malformed input must fail loud, not produce an
 * empty flow.
 *
 * Lives under projects/<name>/tests/ because that's the only path Jest's
 * testMatch discovers (see jest.config.js testMatch).
 *
 * Run:
 *   npm test
 */

var fs = require('fs');
var path = require('path');

var flowAdapter = require(path.join(process.cwd(), 'core', 'flowAdapter'));

var REAL_FLOW_PATH = path.join(
    process.cwd(),
    'callflow_json_config_vocalls',
    'DIGIPOLIS_LPA_ICT_GUARD_TUI_PRD.json'
);

// Silence the adapter's one-line notice during tests.
var SILENT = { logger: function () {} };

function readRealFlow() {
    return JSON.parse(fs.readFileSync(REAL_FLOW_PATH, 'utf8'));
}

describe('flowAdapter.adaptFlow — happy path (covers AE1)', function () {
    it('converts a real authoring flow file into the runtime envelope shape', function () {
        var adapted = flowAdapter.adaptFlow(readRealFlow(), SILENT);

        expect(adapted.sourceId).toBe('+3271690041');
        expect(adapted.name).toBe('DIGIPOLIS - LPA_ICT_GUARD_TUI');
        expect(adapted.project).toBe('LPA ICT');
        expect(Array.isArray(adapted.operations)).toBe(true);
        expect(adapted.operations.length).toBe(5);

        var first = adapted.operations[0];
        expect(first.id).toBe('00000');
        expect(first.type).toBe('SetVariables_vocalls');
        expect(first.name).toBe('Call Initialization');
        expect(first.isFirstOperation).toBe(true);
        expect(typeof first.params).toBe('object');
        // No leftover PascalCase envelope keys on the operation.
        expect(first.Id).toBeUndefined();
        expect(first.Type).toBeUndefined();
        expect(first.Params).toBeUndefined();
    });

    it('preserves params contents verbatim — PascalCase keys and native types', function () {
        var adapted = flowAdapter.adaptFlow(readRealFlow(), SILENT);
        var firstParams = adapted.operations[0].params;

        // PascalCase param keys survive untouched (NOT lowercased).
        expect(firstParams.RoutingId).toBe('LPA_ICT_GUARD_TUI');
        expect(firstParams.CustomerName).toBe('LPA');
        expect(firstParams.NextStep).toBe('00001');
        expect(firstParams.Active).toBe(true);
        expect(typeof firstParams.Active).toBe('boolean');

        // The GuardTui op carries native-typed params.
        var guardOp = adapted.operations[1];
        expect(guardOp.type).toBe('GuardTui_vocalls');
        expect(guardOp.params.ConfigId).toBe(3);
        expect(typeof guardOp.params.ConfigId).toBe('number');
        expect(guardOp.params.Timeout).toBe(10000);
        expect(typeof guardOp.params.Timeout).toBe('number');
        expect(guardOp.params.NextStep_Success).toBe('00098');
    });

    it('keeps a numeric param value as a number (no stringification of params)', function () {
        var raw = {
            SourceId: 'X',
            Operations: [
                { Id: 1, Type: 'SetVariables_vocalls', Name: 'n', IsFirstOperation: true, Params: { IVREvent: 9999 } },
            ],
        };
        var adapted = flowAdapter.adaptFlow(raw, SILENT);
        expect(adapted.operations[0].params.IVREvent).toBe(9999);
        expect(typeof adapted.operations[0].params.IVREvent).toBe('number');
    });
});

describe('flowAdapter.adaptFlow — edge cases', function () {
    it('defaults isFirstOperation to false when IsFirstOperation is absent', function () {
        var raw = {
            SourceId: 'X',
            Operations: [{ Id: '00001', Type: 'Disconnect_vocalls', Name: 'end', Params: {} }],
        };
        var adapted = flowAdapter.adaptFlow(raw, SILENT);
        expect(adapted.operations[0].isFirstOperation).toBe(false);
    });

    it('coerces a numeric Id to a string id', function () {
        var raw = {
            SourceId: 'X',
            Operations: [{ Id: 42, Type: 'Disconnect_vocalls', Name: 'end', Params: {} }],
        };
        var adapted = flowAdapter.adaptFlow(raw, SILENT);
        expect(adapted.operations[0].id).toBe('42');
        expect(typeof adapted.operations[0].id).toBe('string');
    });

    it('defaults a missing Params object to {}', function () {
        var raw = {
            SourceId: 'X',
            Operations: [{ Id: '00001', Type: 'Disconnect_vocalls', Name: 'end' }],
        };
        var adapted = flowAdapter.adaptFlow(raw, SILENT);
        expect(adapted.operations[0].params).toEqual({});
    });

    it('calls the injected logger exactly once with a notice that it ran', function () {
        var calls = [];
        flowAdapter.adaptFlow(readRealFlow(), {
            logger: function (msg) {
                calls.push(msg);
            },
        });
        expect(calls.length).toBe(1);
        expect(calls[0]).toMatch(/\[flowAdapter\]/);
        expect(calls[0]).toMatch(/ops=5/);
    });
});

describe('flowAdapter.adaptFlow — error paths fail loud (covers AE3)', function () {
    it('throws when Operations is missing entirely', function () {
        expect(function () {
            flowAdapter.adaptFlow({ SourceId: 'X' }, SILENT);
        }).toThrow(/Operations is missing or not an array/);
    });

    it('throws when Operations is not an array', function () {
        expect(function () {
            flowAdapter.adaptFlow({ SourceId: 'X', Operations: {} }, SILENT);
        }).toThrow(/Operations is missing or not an array/);
    });

    it('throws on an empty Operations array (never serves a silent empty flow)', function () {
        expect(function () {
            flowAdapter.adaptFlow({ SourceId: 'X', Operations: [] }, SILENT);
        }).toThrow(/Operations array is empty/);
    });

    it('throws when input is null or not an object', function () {
        expect(function () {
            flowAdapter.adaptFlow(null, SILENT);
        }).toThrow(/null or not an object/);
    });

    it('throws when an operation has no Id (not silently dropped)', function () {
        var raw = {
            SourceId: 'X',
            Operations: [
                { Id: '00000', Type: 'SetVariables_vocalls', Name: 'ok', IsFirstOperation: true, Params: {} },
                { Type: 'Disconnect_vocalls', Name: 'no-id', Params: {} },
            ],
        };
        expect(function () {
            flowAdapter.adaptFlow(raw, SILENT);
        }).toThrow(/operation at index 1 has no Id/);
    });
});
