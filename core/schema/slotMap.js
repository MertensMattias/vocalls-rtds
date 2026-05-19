'use strict';

const { z } = require('zod');
const {
    NonEmptyString,
    PerLangText,
    MaybeSilentText,
    CaseNumber,
    ScenarioKey,
    ActionName,
    KnowledgeKey,
    CanonicalRule,
} = require('./shared');

// QuadLang allows partial language coverage. Rationale: during the pipeline,
// the config builder writes only the primary language; translator fills the
// rest later. The schema validates per-language values WHEN PRESENT (rejecting
// empty strings, cross-language UNTRANSLATED leakage, etc.), but does not
// require all four keys at parse time. Primary-language presence is enforced
// upstream by stage-gating in PipelineStateSchema and by the orchestrator,
// not at the slot-map shape level.
const QuadLang = z.object({
    NL: PerLangText('NL').optional(),
    FR: PerLangText('FR').optional(),
    DE: PerLangText('DE').optional(),
    EN: PerLangText('EN').optional(),
});

// MaybeSilentQuadLang — allows empty strings per language.
// Used at action message paths where empty = intentional silence
// (system actions per ADR-009, or per-disposition silent overrides).
// Same partial-language semantics as QuadLang.
const MaybeSilentQuadLang = z.object({
    NL: MaybeSilentText('NL').optional(),
    FR: MaybeSilentText('FR').optional(),
    DE: MaybeSilentText('DE').optional(),
    EN: MaybeSilentText('EN').optional(),
});

// --- Action + entity ---------------------------------------------------------

const ActionEntitySchema = z.object({
    description: QuadLang,
    required: z.boolean(),
});

const OutcomeMessages = z.object({
    success: MaybeSilentQuadLang,
    failure: MaybeSilentQuadLang,
});

const PartialOutcomeMessages = z.object({
    success: MaybeSilentQuadLang.optional(),
    failure: MaybeSilentQuadLang.optional(),
});

// messages.default required; per-disposition overrides allowed via catchall.
const ActionMessagesSchema = z
    .object({
        default: OutcomeMessages,
    })
    .catchall(PartialOutcomeMessages);

const ActionSchema = z.object({
    description: QuadLang,
    confirmation_message: MaybeSilentQuadLang,
    confirmation: z.enum(['None', 'Implicit', 'Explicit']),
    entities: z.record(NonEmptyString, ActionEntitySchema).default({}),
    messages: ActionMessagesSchema,
});

// --- cdbLogs (ADR-007 disposition-keyed only) --------------------------------

const DispositionEntry = z.object({
    success: z.string().optional(),
    failure: z.string().optional(),
});

// Action-level entry: every action's disposition entries keyed by disposition.
// Flat { success: 'key' } at action level is invalid per ADR-007; only nested
// { dispositionKey: { outcome: logKey } } is accepted.
const ActionCdbLogShape = z
    .object({
        default: DispositionEntry,
    })
    .catchall(DispositionEntry);

const CdbLogEntrySchema = ActionCdbLogShape;

// Per-case: top-level `default` is a string fallback; other keys are action
// names whose values are the disposition-keyed shape.
// ADR-007: action-level entries are disposition-keyed; flat strings are
// rejected at parse time, then autofixed by cdb-logs-canonical.js in Mode 2.
const PerCaseCdbLogs = z
    .object({
        default: NonEmptyString,
    })
    .catchall(ActionCdbLogShape);

// --- Agent slot --------------------------------------------------------------

const PersonaPrimary = z.object({
    name: NonEmptyString,
    companyName: NonEmptyString,
    description: NonEmptyString,
    tone: NonEmptyString,
    companyRole: NonEmptyString,
});

// Non-primary languages may be the literal '[<LANG>_UNTRANSLATED]' string
// until the translator fills them. Loose union — primary-language-required
// invariant is enforced at write time using projectMeta.primaryLanguage.
const PersonaPerLang = z.union([PersonaPrimary, z.string().min(1)]);

const PersonaSchema = z.object({
    // All four languages optional — config builder writes only the primary
    // language; translator fills the rest. Primary-language presence is an
    // upstream invariant, not a schema-level one.
    NL: PersonaPerLang.optional(),
    FR: PersonaPerLang.optional(),
    DE: PersonaPerLang.optional(),
    EN: PersonaPerLang.optional(),
    // Optional — projects without project-specific rules omit this entirely.
    projectRulesAppendix: z
        .object({
            NL: z.array(NonEmptyString).default([]),
            FR: z.array(NonEmptyString).optional(),
            DE: z.array(NonEmptyString).optional(),
            EN: z.array(NonEmptyString).optional(),
        })
        .optional(),
});

const CaseSlotSchema = z.object({
    opening: QuadLang,
    scenario: ScenarioKey,
    actions: z.array(ActionName),
    knowledge: z.array(KnowledgeKey),
});

const ScenarioSlotSchema = z.object({
    objective: QuadLang,
    // Facts use the same partial-language semantics as QuadLang — config
    // builder writes primary-only; translator fills the rest.
    facts: z.object({
        NL: z.array(z.string()).optional(),
        FR: z.array(z.string()).optional(),
        DE: z.array(z.string()).optional(),
        EN: z.array(z.string()).optional(),
    }),
});

const AgentSlotSchema = z.object({
    persona: PersonaSchema,
    companyInfo: QuadLang,
    CANONICAL_RULES: z.array(CanonicalRule),
    cases: z.record(CaseNumber, CaseSlotSchema),
    scenarios: z.record(ScenarioKey, ScenarioSlotSchema),
    knowledgeModules: z.record(KnowledgeKey, QuadLang),
    actions: z.record(ActionName, ActionSchema),
    cdbLogs: z.record(z.string(), PerCaseCdbLogs),
    EXPORT_MAP: z.record(z.string(), z.string()).default({}),
});

// --- Top-level slot-map ------------------------------------------------------

const ProjectMetaSchema = z.object({
    projectName: NonEmptyString,
    primaryLanguage: z.enum(['NL', 'FR', 'DE', 'EN']),
    languages: z.array(z.enum(['NL', 'FR', 'DE', 'EN'])).min(1),
});

// System actions are always-present via the skeleton's deep-merge
// (core/config-skeleton.js). The slot-map needn't define them; they're
// implicit. The cross-field check below treats any reference to one of these
// names as resolved without requiring an entry in agents.<id>.actions.
const SYSTEM_ACTIONS = new Set([
    'transfer_to_agent',
    'escalate_to_agent',
    'end_conversation',
]);

const SlotMapSchema = z
    .object({
        projectMeta: ProjectMetaSchema,
        agents: z.record(z.string(), AgentSlotSchema),
    })
    .superRefine((data, ctx) => {
        if (!('PRIMARY' in data.agents)) {
            ctx.addIssue({
                code: 'custom',
                path: ['agents'],
                message: "agents must contain a 'PRIMARY' entry",
            });
            return;
        }

        for (const [agentId, agent] of Object.entries(data.agents)) {
            for (const [caseNum, c] of Object.entries(agent.cases)) {
                for (const action of c.actions) {
                    if (SYSTEM_ACTIONS.has(action)) continue;
                    if (!(action in agent.actions)) {
                        ctx.addIssue({
                            code: 'custom',
                            path: ['agents', agentId, 'cases', caseNum, 'actions'],
                            message: `Action '${action}' not defined in agents.${agentId}.actions`,
                        });
                    }
                }
                for (const k of c.knowledge) {
                    if (!(k in agent.knowledgeModules)) {
                        ctx.addIssue({
                            code: 'custom',
                            path: ['agents', agentId, 'cases', caseNum, 'knowledge'],
                            message: `Knowledge '${k}' not defined in agents.${agentId}.knowledgeModules`,
                        });
                    }
                }
                if (!(c.scenario in agent.scenarios)) {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['agents', agentId, 'cases', caseNum, 'scenario'],
                        message: `Scenario '${c.scenario}' not defined in agents.${agentId}.scenarios`,
                    });
                }
            }
        }
    });

module.exports = {
    QuadLang,
    ActionEntitySchema,
    ActionSchema,
    ActionMessagesSchema,
    OutcomeMessages,
    DispositionEntry,
    CdbLogEntrySchema,
    PerCaseCdbLogs,
    PersonaSchema,
    PersonaPrimary,
    CanonicalRule,
    CaseSlotSchema,
    ScenarioSlotSchema,
    AgentSlotSchema,
    ProjectMetaSchema,
    SlotMapSchema,
    SYSTEM_ACTIONS,
};
