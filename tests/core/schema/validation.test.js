'use strict';

const {
    ValidationFindingSchema,
    FindingOwnerEnum,
} = require('../../../core/schema/validation');

const baseFinding = {
    check: 'schema_completeness',
    severity: 'error',
    location: 'slotMap.actions',
    detail: 'Missing required field',
    autofixable: false,
};

describe('ValidationFindingSchema', () => {
    test('rejects finding without owner field', () => {
        const result = ValidationFindingSchema.safeParse(baseFinding);
        expect(result.success).toBe(false);
        expect(JSON.stringify(result.error.issues)).toContain('owner');
    });

    test('accepts finding with owner: "intake"', () => {
        const result = ValidationFindingSchema.safeParse({
            ...baseFinding,
            owner: 'intake',
        });
        expect(result.success).toBe(true);
    });

    test('accepts finding with owner: "scenarioDesign"', () => {
        const result = ValidationFindingSchema.safeParse({
            ...baseFinding,
            owner: 'scenarioDesign',
        });
        expect(result.success).toBe(true);
    });

    test('accepts finding with owner: "configBuild"', () => {
        const result = ValidationFindingSchema.safeParse({
            ...baseFinding,
            owner: 'configBuild',
        });
        expect(result.success).toBe(true);
    });

    test('rejects finding with owner: "translate" (final stage, never a repair target)', () => {
        const result = ValidationFindingSchema.safeParse({
            ...baseFinding,
            owner: 'translate',
        });
        expect(result.success).toBe(false);
    });

    test('rejects finding with owner: "unknown"', () => {
        const result = ValidationFindingSchema.safeParse({
            ...baseFinding,
            owner: 'unknown',
        });
        expect(result.success).toBe(false);
    });
});

describe('FindingOwnerEnum', () => {
    test('exposes exactly the three repair-eligible stages', () => {
        const values = FindingOwnerEnum.options.slice().sort();
        expect(values).toEqual(['configBuild', 'intake', 'scenarioDesign']);
    });
});
