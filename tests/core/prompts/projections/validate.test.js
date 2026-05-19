'use strict';

const {
    buildValidateProjection,
} = require('../../../../core/prompts/projections/validate');

function baseState(validation) {
    return {
        _meta: { primaryLanguage: 'NL', languages: ['NL'] },
        validation: validation || { findings: [], autofixApplied: [] },
    };
}

describe('validate projection — passthrough', () => {
    test('passes priorFindings and autofixApplied verbatim', () => {
        const finding = {
            check: 'mode1.schema',
            severity: 'error',
            message: 'agents.PRIMARY.persona missing',
            path: ['agents', 'PRIMARY', 'persona'],
            owner: 'configBuild',
        };
        const autofix = { rule: 'remove-empty-string', target: 'a.b.c' };
        const r = buildValidateProjection(
            baseState({ findings: [finding], autofixApplied: [autofix] })
        );
        expect(r.priorFindings).toEqual([finding]);
        expect(r.autofixApplied).toEqual([autofix]);
    });

    test('empty arrays when no findings', () => {
        const r = buildValidateProjection(baseState());
        expect(r.priorFindings).toEqual([]);
        expect(r.autofixApplied).toEqual([]);
    });

    test('missing validation slice still yields safe empty arrays', () => {
        const r = buildValidateProjection({ _meta: {} });
        expect(r.priorFindings).toEqual([]);
        expect(r.autofixApplied).toEqual([]);
    });
});

describe('validate projection — purity', () => {
    test('returns fresh array copies (no shared mutable state)', () => {
        const findings = [{ check: 'x', severity: 'info', message: 'm' }];
        const state = baseState({ findings, autofixApplied: [] });
        const r = buildValidateProjection(state);
        r.priorFindings.push({ check: 'y', severity: 'info', message: 'm' });
        expect(state.validation.findings).toHaveLength(1);
    });

    test('two calls return deep-equal output', () => {
        const state = baseState({
            findings: [{ check: 'a', severity: 'info', message: 'm' }],
            autofixApplied: [],
        });
        expect(buildValidateProjection(state)).toEqual(
            buildValidateProjection(state)
        );
    });
});

describe('validate projection — guards', () => {
    test('throws when state is not an object', () => {
        expect(() => buildValidateProjection(null)).toThrow(
            /^prompts\.projections\.validate:/
        );
    });
});
