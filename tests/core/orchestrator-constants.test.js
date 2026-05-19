'use strict';

const constants = require('../../core/orchestrator-constants');

describe('core/orchestrator-constants', () => {
    test('REPAIR_CAP === 3', () => {
        expect(constants.REPAIR_CAP).toBe(3);
    });

    test('RETRY_MAX_ATTEMPTS === 3', () => {
        expect(constants.RETRY_MAX_ATTEMPTS).toBe(3);
    });

    test('RUN_LOG_PATH === ".vocalls/run.log.jsonl"', () => {
        expect(constants.RUN_LOG_PATH).toBe('.vocalls/run.log.jsonl');
    });

    test('STAGES is an immutable array of 5 strings in pipeline order', () => {
        expect(constants.STAGES).toEqual([
            'intake',
            'scenarioDesign',
            'configBuild',
            'validate',
            'translate',
        ]);
        expect(Object.isFrozen(constants.STAGES)).toBe(true);
    });

    test('STAGE_CONFIG.intake uses Sonnet 4.6 with adaptive thinking', () => {
        expect(constants.STAGE_CONFIG.intake.model).toBe('claude-sonnet-4-6');
        expect(constants.STAGE_CONFIG.intake.effort).toBe('high');
        expect(constants.STAGE_CONFIG.intake.maxTokens).toBe(32000);
        expect(constants.STAGE_CONFIG.intake.thinking).toEqual({
            type: 'adaptive',
            display: 'summarized',
        });
    });

    test('STAGE_CONFIG.scenarioDesign.effort === "xhigh" with adaptive thinking', () => {
        expect(constants.STAGE_CONFIG.scenarioDesign.model).toBe('claude-opus-4-7');
        expect(constants.STAGE_CONFIG.scenarioDesign.effort).toBe('xhigh');
        expect(constants.STAGE_CONFIG.scenarioDesign.maxTokens).toBe(64000);
        expect(constants.STAGE_CONFIG.scenarioDesign.thinking).toEqual({
            type: 'adaptive',
            display: 'summarized',
        });
    });

    test('STAGE_CONFIG.configBuild uses Opus 4.7 with adaptive thinking', () => {
        expect(constants.STAGE_CONFIG.configBuild.model).toBe('claude-opus-4-7');
        expect(constants.STAGE_CONFIG.configBuild.effort).toBe('high');
        expect(constants.STAGE_CONFIG.configBuild.maxTokens).toBe(64000);
        expect(constants.STAGE_CONFIG.configBuild.thinking).toEqual({
            type: 'adaptive',
            display: 'summarized',
        });
    });

    test('STAGE_CONFIG.validate uses Sonnet 4.6 medium effort with adaptive thinking', () => {
        expect(constants.STAGE_CONFIG.validate.model).toBe('claude-sonnet-4-6');
        expect(constants.STAGE_CONFIG.validate.effort).toBe('medium');
        expect(constants.STAGE_CONFIG.validate.maxTokens).toBe(32000);
        expect(constants.STAGE_CONFIG.validate.thinking).toEqual({
            type: 'adaptive',
            display: 'summarized',
        });
    });

    test('STAGE_CONFIG.translate uses Haiku 4.5 without effort or thinking', () => {
        // Haiku 4.5 errors when `output_config.effort` is sent and is not
        // documented to support adaptive thinking — translate omits both.
        expect(constants.STAGE_CONFIG.translate.model).toBe('claude-haiku-4-5');
        expect(constants.STAGE_CONFIG.translate.effort).toBeUndefined();
        expect(constants.STAGE_CONFIG.translate.thinking).toBeUndefined();
        expect(constants.STAGE_CONFIG.translate.maxTokens).toBe(16000);
    });

    test('STAGE_CONFIG has an entry for every STAGES value', () => {
        for (const stage of constants.STAGES) {
            expect(constants.STAGE_CONFIG).toHaveProperty(stage);
            expect(typeof constants.STAGE_CONFIG[stage].model).toBe('string');
            expect(typeof constants.STAGE_CONFIG[stage].maxTokens).toBe('number');
        }
    });

    test('all exports are deep-frozen (top-level and per-stage configs)', () => {
        expect(Object.isFrozen(constants)).toBe(true);
        expect(Object.isFrozen(constants.STAGE_CONFIG)).toBe(true);
        for (const stage of constants.STAGES) {
            expect(Object.isFrozen(constants.STAGE_CONFIG[stage])).toBe(true);
        }
    });

    test('every stage exceeds 16K maxTokens (streaming required per DESIGN)', () => {
        for (const stage of constants.STAGES) {
            expect(constants.STAGE_CONFIG[stage].maxTokens).toBeGreaterThanOrEqual(16000);
        }
    });
});
