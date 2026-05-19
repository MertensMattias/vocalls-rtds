'use strict';

const fs = require('fs');
const path = require('path');

const { loadStage } = require('../../../core/prompts/loader');
const { STAGES, STAGE_CONFIG } = require('../../../core/orchestrator-constants');

const PROMPTS_DIR = path.join(__dirname, '..', '..', '..', 'core', 'prompts');
const REFERENCES_DIR = path.join(PROMPTS_DIR, 'references');

describe('prompts.loader — return shape', () => {
    for (const stage of STAGES) {
        test(`loadStage("${stage}") returns the expected shape`, () => {
            const r = loadStage(stage);
            expect(Object.keys(r).sort()).toEqual(
                ['effort', 'model', 'references', 'systemPrompt'].sort()
            );
            expect(typeof r.systemPrompt).toBe('string');
            expect(r.systemPrompt.length).toBeGreaterThan(0);
            expect(Array.isArray(r.references)).toBe(true);
            expect(r.model).toBe(STAGE_CONFIG[stage].model);
            expect(r.effort).toBe(STAGE_CONFIG[stage].effort);
        });
    }
});

describe('prompts.loader — model/effort sourcing (R3 contract)', () => {
    test('intake is claude-sonnet-4-6 / high', () => {
        const r = loadStage('intake');
        expect(r.model).toBe('claude-sonnet-4-6');
        expect(r.effort).toBe('high');
    });

    test('scenarioDesign is claude-opus-4-7 / xhigh', () => {
        const r = loadStage('scenarioDesign');
        expect(r.model).toBe('claude-opus-4-7');
        expect(r.effort).toBe('xhigh');
    });

    test('translate is claude-haiku-4-5 with no effort (Haiku 4.5 rejects output_config.effort)', () => {
        const r = loadStage('translate');
        expect(r.model).toBe('claude-haiku-4-5');
        expect(r.effort).toBeUndefined();
    });
});

describe('prompts.loader — byte-stability (cache invariant)', () => {
    for (const stage of STAGES) {
        test(`loadStage("${stage}") is byte-equal across calls`, () => {
            const a = loadStage(stage).systemPrompt;
            const b = loadStage(stage).systemPrompt;
            expect(a).toBe(b);
        });
    }
});

describe('prompts.loader — concatenation order and content', () => {
    test('stage body precedes reference content (intake → data-flow-contracts)', () => {
        const r = loadStage('intake');
        const dfc = fs.readFileSync(
            path.join(REFERENCES_DIR, 'data-flow-contracts.md'),
            'utf8'
        );
        // The stage's own heading is "# Intake — Stage 1" (after fm strip).
        const stageHeadingIdx = r.systemPrompt.indexOf('# Intake');
        const refHeadingIdx = r.systemPrompt.indexOf('# Data-flow contracts');
        expect(stageHeadingIdx).toBeGreaterThanOrEqual(0);
        expect(refHeadingIdx).toBeGreaterThan(stageHeadingIdx);
        // Reference body appears as a substring (verbatim concatenation).
        expect(r.systemPrompt).toContain(dfc.trim());
    });

    test('multiple references are concatenated in frontmatter order', () => {
        const r = loadStage('scenarioDesign');
        expect(r.references).toEqual([
            'data-flow-contracts',
            'ivr-objective-dsl-ruleset',
            'register',
        ]);
        const idxDfc = r.systemPrompt.indexOf('# Data-flow contracts');
        const idxDsl = r.systemPrompt.indexOf('# IVR Objective DSL');
        const idxReg = r.systemPrompt.indexOf('# Voice register');
        expect(idxDfc).toBeGreaterThan(0);
        expect(idxDsl).toBeGreaterThan(idxDfc);
        expect(idxReg).toBeGreaterThan(idxDsl);
    });

    test('YAML frontmatter is stripped from the stage body', () => {
        const r = loadStage('intake');
        // The frontmatter header lines must not leak through.
        expect(r.systemPrompt).not.toMatch(/^---/);
        expect(r.systemPrompt).not.toMatch(/^stage:\s*intake/m);
        expect(r.systemPrompt).not.toMatch(/^model:\s*claude/m);
    });
});

describe('prompts.loader — error paths', () => {
    test('unknown stage throws with module prefix', () => {
        expect(() => loadStage('nope')).toThrow(
            /^prompts\.loader\.loadStage: unknown stage/
        );
    });

    test('missing reference file throws', () => {
        // Rename a reference temporarily; restore afterwards.
        const target = path.join(REFERENCES_DIR, 'register.md');
        const moved = path.join(REFERENCES_DIR, 'register.md.bak-test');
        fs.renameSync(target, moved);
        try {
            expect(() => loadStage('scenarioDesign')).toThrow(
                /prompts\.loader: reference file not found/
            );
        } finally {
            fs.renameSync(moved, target);
        }
    });
});

describe('prompts.loader — references field', () => {
    test('references list matches frontmatter declaration (translate)', () => {
        const r = loadStage('translate');
        expect(r.references).toEqual([
            'register',
            'tts-writing-rules',
            'data-flow-contracts',
        ]);
    });

    test('returned references array is a fresh copy (no shared mutable state)', () => {
        const a = loadStage('intake').references;
        a.push('mutation');
        const b = loadStage('intake').references;
        expect(b).not.toContain('mutation');
    });
});
