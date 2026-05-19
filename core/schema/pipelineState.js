'use strict';

const { z } = require('zod');
const { LangCode, NonEmptyString, LangRecord } = require('./shared');
const { IntakeSchema } = require('./intake');
const { ScenarioDesignSchema } = require('./scenarioDesign');
const { SlotMapSchema } = require('./slotMap');
const { ValidationFindingSchema } = require('./validation');

const StageEnum = z.enum([
    'intake',
    'scenarioDesign',
    'configBuild',
    'validate',
    'translate',
    'done',
    'escalated',
]);

const RepairHistoryEntry = z.object({
    stage: StageEnum,
    round: z.number().int().nonnegative(),
    ts: NonEmptyString,
    resolved: z.boolean(),
    reason: z.string().optional(),
});

const InputHashesSchema = z
    .object({
        intake: z.string().length(64).optional(),
        scenarioDesign: z.string().length(64).optional(),
        configBuild: z.string().length(64).optional(),
        translator: LangRecord(z.string().length(64).optional()).default({}),
    })
    .default({});

const MetaStatusEnum = z.enum(['idle', 'running', 'paused', 'escalated']);
const GateNameEnum = z.enum(['designApproval', 'qualityGate', 'translateGate']);

const MetaSchema = z.object({
    schemaVersion: z.literal('2'),
    project: NonEmptyString,
    primaryLanguage: LangCode,
    languages: z.array(LangCode).min(1),
    stage: StageEnum,
    repairRound: z.number().int().nonnegative(),
    repairHistory: z.array(RepairHistoryEntry).default([]),
    createdAt: NonEmptyString,
    updatedAt: NonEmptyString,
    lastWriter: NonEmptyString,
    inputHashes: InputHashesSchema,
    // Runtime fields written by the FSM (orchestratorFsm.applyResult /
    // applyGate / applyPaused / applyEscalated). The FSM emits these on
    // every transition; they are optional on the schema to preserve
    // backward compatibility with state files created by `state-io.init`
    // (which sets only `status: 'idle'`) and with persisted states from
    // before this schema extension.
    status: MetaStatusEnum.optional(),
    gateName: GateNameEnum.optional(),
    gateReason: z.string().optional(),
});

const ControlSchema = z.object({
    userIntent: z.enum(['build', 'update']),
    userGates: z.object({
        // U5 (plan 2026-05-17-002): 'noop' records that the orchestrator
        // skipped the designApproval gate because scenarioDesign emitted
        // STAGE_NOOP (input hash matched the prior run). The audit trail
        // distinguishes a true approval ('approved') from a hash-skip
        // ('noop'), so later runs can tell whether the user actually
        // reviewed the design.
        designApproval: z.enum(['pending', 'approved', 'revised', 'noop']),
        qualityGate: z.enum(['pending', 'approved', 'revised']),
        translateGate: z.enum(['pending', 'approved', 'revised', 'declined']),
    }),
});

const TranslationStateSchema = LangRecord(
    z.enum(['pending', 'inProgress', 'complete', 'failed'])
);

const ValidationStateSchema = z.object({
    lastRun: z.string().nullable(),
    findings: z.array(ValidationFindingSchema),
    blocking: z.boolean(),
    autofixApplied: z.array(z.string()),
});

const PipelineStateSchema = z
    .object({
        _meta: MetaSchema,
        brief: z.object({
            path: NonEmptyString,
            sha256: z.string().length(64),
        }),
        control: ControlSchema,
        intake: IntakeSchema.nullable(),
        scenarioDesign: ScenarioDesignSchema.nullable(),
        slotMap: SlotMapSchema.nullable(),
        validation: ValidationStateSchema,
        translation: TranslationStateSchema,
    })
    .superRefine((s, ctx) => {
        const stage = s._meta.stage;
        const requiresIntake = [
            'scenarioDesign',
            'configBuild',
            'validate',
            'translate',
            'done',
        ];
        const requiresScenario = ['configBuild', 'validate', 'translate', 'done'];
        const requiresSlotMap = ['validate', 'translate', 'done'];

        if (requiresIntake.includes(stage) && s.intake === null) {
            ctx.addIssue({
                code: 'custom',
                path: ['intake'],
                message: `intake required by stage ${stage}`,
            });
        }
        if (requiresScenario.includes(stage) && s.scenarioDesign === null) {
            ctx.addIssue({
                code: 'custom',
                path: ['scenarioDesign'],
                message: `scenarioDesign required by stage ${stage}`,
            });
        }
        if (requiresSlotMap.includes(stage) && s.slotMap === null) {
            ctx.addIssue({
                code: 'custom',
                path: ['slotMap'],
                message: `slotMap required by stage ${stage}`,
            });
        }
    });

module.exports = {
    PipelineStateSchema,
    StageEnum,
    MetaSchema,
    InputHashesSchema,
    ControlSchema,
    ValidationStateSchema,
    TranslationStateSchema,
    RepairHistoryEntry,
};
