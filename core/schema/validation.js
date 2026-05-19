'use strict';

const { z } = require('zod');
const { NonEmptyString } = require('./shared');

const SeverityEnum = z.enum(['error', 'warning', 'info']);

const CheckIdEnum = z.enum([
    'schema_completeness',
    'language_completeness',
    'action_messages_shape',
    'cdb_logs_structure',
    'check_13_disposition_coverage',
    'check_18_prompt_assembly',
    'check_19_dsl_bounds',
    'check_kq_knowledge_grounding',
    'check_speech_placement',
    'pqr_register',
    'pqr_tts_register',
    'brief_fidelity',
    // TODO U11: reconcile or remove — DESIGN §11.6.2 / §14 does not document
    // this entry. U11 either adds the check to DESIGN or removes it here.
    'canonical_rules_unknown_hook',
]);

// FindingOwnerEnum identifies the stage whose output produced the finding
// and is therefore responsible for repairing it. `translate` is the final
// stage and is never a repair target — it is intentionally excluded.
const FindingOwnerEnum = z.enum(['intake', 'scenarioDesign', 'configBuild']);

const ValidationFindingSchema = z.object({
    check: CheckIdEnum,
    severity: SeverityEnum,
    owner: FindingOwnerEnum,
    location: NonEmptyString,
    detail: NonEmptyString,
    suggestion: z.string().optional(),
    autofixable: z.boolean(),
});

module.exports = {
    ValidationFindingSchema,
    SeverityEnum,
    CheckIdEnum,
    FindingOwnerEnum,
};
