'use strict';

const { z } = require('zod');
const {
    LangCode,
    NonEmptyString,
    CaseNumber,
    ActionName,
    KnowledgeKey,
    CanonicalRule,
} = require('./shared');

const CaseSchema = z.object({
    label: NonEmptyString,
    intent: NonEmptyString,
    requiresAuth: z.boolean(),
    knowledgeNeeds: z.array(KnowledgeKey).default([]),
    actionsRequired: z.array(ActionName).default([]),
    notes: z.string().optional(),
    opening: z.string().default(''),
    objective: z.string().default(''),
    cdbLogMap: z
        .record(NonEmptyString, z.record(NonEmptyString, NonEmptyString))
        .default({}),
});

const SpeechPlacementSchema = z.record(
    ActionName,
    z.record(NonEmptyString, z.enum(['dsl_inline', 'action_message']))
);

// PT-0007 (Wave 3) — Pattern A speech contract.
//
// When speechPlacements[<a>][<d>] === 'action_message', the brief author has
// committed customer-facing speech to live in
// `actions.<a>.messages.<d>.success.<primaryLang>` rather than in the scenario
// DSL. Stage 0 (vocalls-brief) captures the speech text in the same exchange
// that classifies the marker; intake parses it into this slice.
//
// Value type: `z.string()` — not MaybeSilentText. Reasons:
//   1. Empty string is intentional silence (matches the MaybeSilent* family).
//      A Pattern A pair MAY legitimately want silence; mode (c) of
//      check_speech_placement does NOT fire on empty.
//   2. MaybeSilentText is a language-parameterized factory; brief is single-
//      language at intake time, and storing the value as a flat string here
//      keeps intake's contract simple. The config-builder fans the primary-
//      language value out into the slotMap's per-language QuadLang slot and
//      writes UNTRANSLATED markers for the other languages; the translator
//      fills them later.
//
// Shape parallels SpeechPlacementSchema (action → disposition → string).
const ActionMessagesSchema = z.record(
    ActionName,
    z.record(NonEmptyString, z.string())
);

const PersonaSchema = z.object({
    name: NonEmptyString,
    companyName: NonEmptyString,
    description: NonEmptyString,
    tone: NonEmptyString,
    companyRole: NonEmptyString,
    companyInfo: NonEmptyString.optional(),
    register: z.enum(['formal', 'informal']).optional(),
});

// U2 (plan 2026-05-17-002): deferralCount tracks how many times the same
// outstanding question has been re-surfaced to the user without resolution.
// The orchestrator increments it inside the STAGE_PAUSED handler before
// re-dispatching intake; when any question's deferralCount reaches
// REPAIR_CAP (defined in SKILL.md), the orchestrator escalates instead of
// re-asking. Default of 0 keeps old state.json files backward-compatible —
// they parse cleanly with deferralCount auto-filled.
const OutstandingQuestionSchema = z.object({
    id: NonEmptyString,
    question: NonEmptyString,
    blocksStage: z.enum(['scenarioDesign', 'configBuild']),
    deferralCount: z.number().int().min(0).default(0),
});

const IntakeSchema = z
    .object({
        projectName: NonEmptyString,
        primaryLanguage: LangCode,
        languages: z.array(LangCode).min(1),
        callDirection: z.enum(['inbound', 'outbound', 'callback']),
        cases: z.record(CaseNumber, CaseSchema),
        runtimeFilteredCases: z.array(CaseNumber).default([]),
        dispositionPolicy: NonEmptyString,
        persona: PersonaSchema,
        knowledgeFacts: z.record(KnowledgeKey, NonEmptyString).default({}),
        customRules: z.array(NonEmptyString).default([]),
        variables: z.array(CanonicalRule).default([]),
        outstandingQuestions: z.array(OutstandingQuestionSchema).default([]),
        speechPlacements: SpeechPlacementSchema.default({}),
        actionMessages: ActionMessagesSchema.default({}),
    })
    .superRefine((data, ctx) => {
        for (const c of data.runtimeFilteredCases) {
            if (!(c in data.cases)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['runtimeFilteredCases'],
                    message: `Case '${c}' not in intake.cases`,
                });
            }
        }
        if (!data.languages.includes(data.primaryLanguage)) {
            ctx.addIssue({
                code: 'custom',
                path: ['primaryLanguage'],
                message: 'primaryLanguage must be in languages',
            });
        }
        // PT-0007 invariant: every actionMessages entry must correspond to a
        // 'action_message' marker in speechPlacements. Authoring speech text
        // without the placement decision is a brief-author error caught here
        // at intake parse rather than later in Mode 4. Mode 4's
        // check_speech_placement enforces the inverse (marker without text).
        for (const [action, dispositions] of Object.entries(data.actionMessages)) {
            for (const disposition of Object.keys(dispositions)) {
                const marker = data.speechPlacements?.[action]?.[disposition];
                if (marker !== 'action_message') {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['actionMessages', action, disposition],
                        message:
                            `actionMessages.${action}.${disposition} present but ` +
                            `speechPlacements.${action}.${disposition} is ${marker === undefined ? 'unset' : `'${marker}'`}. ` +
                            `Pattern A speech text requires the matching 'action_message' marker.`,
                    });
                }
            }
        }
    });

module.exports = {
    IntakeSchema,
    CaseSchema,
    PersonaSchema,
    OutstandingQuestionSchema,
    SpeechPlacementSchema,
    ActionMessagesSchema,
};
