'use strict';

const {
    ReportStatusSchema,
    ReportFindingsSchema,
    WriteStateSliceSchema,
    toolsetFor,
} = require('../../core/stageTools');

// `WriteStateSliceSchema` has one entry per pipeline stage; iterate via its
// keys instead of importing module-private membership.
const PIPELINE_STAGES = Object.keys(WriteStateSliceSchema);

describe('ReportStatusSchema (discriminated union over token)', () => {
    test('parses STAGE_COMPLETE with reason', () => {
        expect(
            ReportStatusSchema.safeParse({ token: 'STAGE_COMPLETE', reason: 'ok' }).success
        ).toBe(true);
    });

    test('parses STAGE_FAILED with reason; routeTo is optional', () => {
        expect(
            ReportStatusSchema.safeParse({ token: 'STAGE_FAILED', reason: 'x' }).success
        ).toBe(true);
        expect(
            ReportStatusSchema.safeParse({
                token: 'STAGE_FAILED',
                reason: 'x',
                routeTo: 'intake',
            }).success
        ).toBe(true);
    });

    test('rejects STAGE_FAILED with unknown routeTo', () => {
        expect(
            ReportStatusSchema.safeParse({
                token: 'STAGE_FAILED',
                reason: 'x',
                routeTo: 'unknown',
            }).success
        ).toBe(false);
    });

    test('rejects STAGE_FAILED with routeTo: "done" (terminal stage, not in STAGES)', () => {
        // Pins the contract that RouteToEnum is the pipeline-stage set (STAGES,
        // 5 entries), not the broader StageEnum (7 entries including 'done' /
        // 'escalated'). Catches a refactor that swaps STAGES for StageEnum.
        expect(
            ReportStatusSchema.safeParse({
                token: 'STAGE_FAILED',
                reason: 'x',
                routeTo: 'done',
            }).success
        ).toBe(false);
    });

    test('rejects an empty-string reason (pins NonEmptyString contract)', () => {
        expect(
            ReportStatusSchema.safeParse({ token: 'STAGE_COMPLETE', reason: '' }).success
        ).toBe(false);
    });

    test('rejects STAGE_PAUSED without gateName', () => {
        expect(
            ReportStatusSchema.safeParse({ token: 'STAGE_PAUSED', reason: 'x' }).success
        ).toBe(false);
    });

    test('parses STAGE_PAUSED with gateName', () => {
        expect(
            ReportStatusSchema.safeParse({
                token: 'STAGE_PAUSED',
                reason: 'design approval needed',
                gateName: 'designApproval',
            }).success
        ).toBe(true);
    });

    test('parses STAGE_NOOP and STAGE_ESCALATED', () => {
        expect(
            ReportStatusSchema.safeParse({ token: 'STAGE_NOOP', reason: 'hash match' }).success
        ).toBe(true);
        expect(
            ReportStatusSchema.safeParse({ token: 'STAGE_ESCALATED', reason: 'cap reached' })
                .success
        ).toBe(true);
    });

    test('rejects unknown token', () => {
        expect(
            ReportStatusSchema.safeParse({ token: 'STAGE_BANANA', reason: 'x' }).success
        ).toBe(false);
    });
});

describe('ReportFindingsSchema', () => {
    test('parses an empty findings array', () => {
        expect(ReportFindingsSchema.safeParse({ findings: [] }).success).toBe(true);
    });

    test('parses a finding that satisfies ValidationFindingSchema (owner required)', () => {
        const result = ReportFindingsSchema.safeParse({
            findings: [
                {
                    check: 'schema_completeness',
                    severity: 'error',
                    owner: 'configBuild',
                    location: 'slotMap.actions',
                    detail: 'missing required field',
                    autofixable: false,
                },
            ],
        });
        expect(result.success).toBe(true);
    });

    test('rejects findings missing the owner field', () => {
        const result = ReportFindingsSchema.safeParse({
            findings: [
                {
                    check: 'schema_completeness',
                    severity: 'error',
                    location: 'x',
                    detail: 'y',
                    autofixable: false,
                },
            ],
        });
        expect(result.success).toBe(false);
    });
});

describe('toolsetFor(stage) — per-stage toolset membership', () => {
    test('intake returns exactly 2 tools: report_status, write_state_slice (sorted alphabetically)', () => {
        const names = toolsetFor('intake').map((t) => t.name);
        expect(names).toEqual(['report_status', 'write_state_slice']);
    });

    test('scenarioDesign returns the same 2 tools as intake (no report_findings)', () => {
        const names = toolsetFor('scenarioDesign').map((t) => t.name);
        expect(names).toEqual(['report_status', 'write_state_slice']);
    });

    test('configBuild returns the same 2 tools (no report_findings)', () => {
        const names = toolsetFor('configBuild').map((t) => t.name);
        expect(names).toEqual(['report_status', 'write_state_slice']);
    });

    test('validate returns 3 tools including report_findings', () => {
        const names = toolsetFor('validate').map((t) => t.name);
        expect(names).toEqual(['report_findings', 'report_status', 'write_state_slice']);
    });

    test('translate excludes report_findings', () => {
        const names = toolsetFor('translate').map((t) => t.name);
        expect(names).not.toContain('report_findings');
        expect(names).toEqual(['report_status', 'write_state_slice']);
    });

    test('toolsetFor on an unknown stage throws a module-prefixed error', () => {
        expect(() => toolsetFor('nonexistent')).toThrow(/^stageTools\.toolsetFor:/);
    });

    test('every tool entry has {name, description, input_schema}', () => {
        for (const stage of PIPELINE_STAGES) {
            for (const tool of toolsetFor(stage)) {
                expect(typeof tool.name).toBe('string');
                expect(typeof tool.description).toBe('string');
                expect(tool.description.length).toBeGreaterThan(0);
                expect(typeof tool.input_schema).toBe('object');
            }
        }
    });
});

describe('toolsetFor output — byte-stability for cache key (DESIGN §7 / R7)', () => {
    test('toolsetFor("intake") is byte-equal across two calls (JSON.stringify)', () => {
        const a = JSON.stringify(toolsetFor('intake'));
        const b = JSON.stringify(toolsetFor('intake'));
        expect(a).toBe(b);
    });

    test('every stage toolset is byte-equal across two calls', () => {
        for (const stage of PIPELINE_STAGES) {
            const a = JSON.stringify(toolsetFor(stage));
            const b = JSON.stringify(toolsetFor(stage));
            expect(a).toBe(b);
        }
    });

    test('toolsetFor returns the same frozen reference both times (no per-call rebuild)', () => {
        expect(toolsetFor('intake')).toBe(toolsetFor('intake'));
        expect(Object.isFrozen(toolsetFor('intake'))).toBe(true);
    });

    test('input_schema JSON has its object keys recursively sorted (byte-stability hardening)', () => {
        for (const stage of PIPELINE_STAGES) {
            for (const tool of toolsetFor(stage)) {
                assertObjectKeysSorted(tool.input_schema);
            }
        }
    });
});

describe('WriteStateSliceSchema — per-stage slice validation', () => {
    test('intake schema rejects a scenarioDesign-shaped payload', () => {
        const scenarioPayload = {
            blueprints: { '1': { caseLabel: 'x', steps: [] } },
        };
        expect(WriteStateSliceSchema.intake.safeParse(scenarioPayload).success).toBe(false);
    });

    test('intake schema is structurally distinct from scenarioDesign schema', () => {
        expect(WriteStateSliceSchema.intake).not.toBe(WriteStateSliceSchema.scenarioDesign);
    });

    test('exposes a schema for every pipeline stage', () => {
        const expected = ['intake', 'scenarioDesign', 'configBuild', 'validate', 'translate'];
        expect(Object.keys(WriteStateSliceSchema).sort()).toEqual(expected.slice().sort());
    });

    test('mapping is frozen so consumers cannot reassign a slice schema', () => {
        expect(Object.isFrozen(WriteStateSliceSchema)).toBe(true);
    });
});

function assertObjectKeysSorted(value) {
    if (Array.isArray(value)) {
        value.forEach(assertObjectKeysSorted);
        return;
    }
    if (value !== null && typeof value === 'object') {
        const keys = Object.keys(value);
        const sorted = keys.slice().sort();
        expect(keys).toEqual(sorted);
        for (const k of keys) {
            assertObjectKeysSorted(value[k]);
        }
    }
}
