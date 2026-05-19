'use strict';

/**
 * core/stageTools.js
 *
 * Typed tool surface the per-stage Claude dispatch sees. Each stage's
 * `toolsetFor(stage)` returns the JSON-Schema-style array the Anthropic
 * SDK's `messages.create({tools})` expects:
 *
 *   [{ name, description, input_schema }, ...]
 *
 * Three tools span the pipeline:
 *
 *   write_state_slice  -- mutate one slice of pipeline state. Per-stage
 *                         input schema (IntakeSchema / ScenarioDesignSchema
 *                         / SlotMapSchema / ValidationStateSchema /
 *                         TranslationStateSchema). The only legitimate
 *                         mutation surface (DESIGN §8 / R2).
 *   report_findings    -- emit validator findings. Available only to the
 *                         `validate` stage. Each finding carries an `owner`
 *                         field (U1) so the FSM can route repair to the
 *                         responsible upstream stage.
 *   report_status      -- terminal status token. Required final tool call
 *                         of every dispatch (DESIGN §8 / R9). Discriminated
 *                         union over `token`:
 *                         STAGE_COMPLETE | STAGE_FAILED (+ optional
 *                         routeTo) | STAGE_NOOP | STAGE_PAUSED (+ required
 *                         gateName) | STAGE_ESCALATED.
 *
 * `brief.md` and `AGENT_*.js` are deliberately *not* reachable through any
 * tool — assembly is a deterministic post-stage step in code (R4).
 *
 * The toolset for each stage is built once at module load. Same code →
 * same Zod schema → same JSON Schema → same bytes, so the Anthropic
 * prompt cache key stays stable across runs (DESIGN §7 / R7).
 *
 * Public API:
 *   ReportStatusSchema        -- Zod discriminated union over token
 *   ReportFindingsSchema      -- Zod object { findings: Finding[] }
 *   WriteStateSliceSchema     -- Object.freeze({ <stage>: Zod schema, ... })
 *   toolsetFor(stage)         -- Anthropic-SDK-shaped tool array for stage
 */

const { z } = require('zod');

const {
    IntakeSchema,
    ScenarioDesignSchema,
    SlotMapSchema,
    ValidationFindingSchema,
    ValidationStateSchema,
    TranslationStateSchema,
} = require('./schema');
const { NonEmptyString } = require('./schema/shared');
const { STAGES } = require('./orchestrator-constants');

// ---------------------------------------------------------------------------
// Tool input schemas
// ---------------------------------------------------------------------------

const RouteToEnum = z.enum(STAGES);

const ReportStatusSchema = z.discriminatedUnion('token', [
    z.object({
        token: z.literal('STAGE_COMPLETE'),
        reason: NonEmptyString,
    }),
    z.object({
        token: z.literal('STAGE_FAILED'),
        reason: NonEmptyString,
        routeTo: RouteToEnum.optional(),
    }),
    z.object({
        token: z.literal('STAGE_NOOP'),
        reason: NonEmptyString,
    }),
    z.object({
        token: z.literal('STAGE_PAUSED'),
        reason: NonEmptyString,
        gateName: NonEmptyString,
    }),
    z.object({
        token: z.literal('STAGE_ESCALATED'),
        reason: NonEmptyString,
    }),
]);

const ReportFindingsSchema = z.object({
    findings: z.array(ValidationFindingSchema),
});

// Per-stage slice schemas. The mapping mirrors DESIGN §5's state contract:
// each stage owns exactly one top-level slice in state.json.
//
//   intake / scenarioDesign / configBuild → straightforward 1:1 to the
//   stage's owned slice schema.
//
//   validate → ValidationStateSchema includes `findings`, but per DESIGN §8
//   findings flow through `report_findings`, not `write_state_slice`. The
//   schema is therefore over-permissive at the Zod layer; the runner (U8)
//   enforces the tool-level separation — write_state_slice for validate
//   updates `lastRun` / `blocking` / `autofixApplied`, while findings are
//   appended via the separate report_findings call.
//
//   translate → TranslationStateSchema is the per-language status enum
//   (DESIGN §5: 'pending' | 'inProgress' | 'complete' | 'failed'). The
//   actual translated string content lands in slotMap slots, not in this
//   slice. The per-language translator fan-out (plan §Key Technical
//   Decision §9 / F4) is implemented in subagentRunner (U8); this schema
//   only validates the status-tracker writes.
const WriteStateSliceSchema = Object.freeze({
    intake: IntakeSchema,
    scenarioDesign: ScenarioDesignSchema,
    configBuild: SlotMapSchema,
    validate: ValidationStateSchema,
    translate: TranslationStateSchema,
});

// ---------------------------------------------------------------------------
// Tool registry: name → { description, inputSchemaFor(stage) → Zod }
// ---------------------------------------------------------------------------

const TOOL_DEFS = Object.freeze({
    write_state_slice: {
        description:
            'Persist this stage\'s output to its slice of state.json. The input ' +
            'is validated against the destination slice schema before the write ' +
            'is accepted. This is the only legitimate mutation surface.',
        inputSchemaFor: (stage) => WriteStateSliceSchema[stage],
    },
    report_findings: {
        description:
            'Emit zero or more validation findings. Each finding declares the ' +
            'owner stage (intake | scenarioDesign | configBuild) that is ' +
            'responsible for repair. Available only to the validate stage.',
        inputSchemaFor: () => ReportFindingsSchema,
    },
    report_status: {
        description:
            'Required final tool call. Reports the terminal status token for ' +
            'this dispatch. STAGE_FAILED may carry a routeTo to rewind the FSM ' +
            'to a specific stage; STAGE_PAUSED must carry a gateName.',
        inputSchemaFor: () => ReportStatusSchema,
    },
});

// Per-stage tool membership. Names are sorted alphabetically so the
// emitted toolset array is order-stable for the SDK prompt cache key.
// Module-private; consumers route through toolsetFor(stage).
const STAGE_TOOLS = Object.freeze({
    intake: Object.freeze(['report_status', 'write_state_slice']),
    scenarioDesign: Object.freeze(['report_status', 'write_state_slice']),
    configBuild: Object.freeze(['report_status', 'write_state_slice']),
    validate: Object.freeze(['report_findings', 'report_status', 'write_state_slice']),
    translate: Object.freeze(['report_status', 'write_state_slice']),
});

// ---------------------------------------------------------------------------
// Build toolsets once at module load (cache key stability — DESIGN §7).
// ---------------------------------------------------------------------------

function sortKeys(value) {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value !== null && typeof value === 'object') {
        const out = {};
        for (const k of Object.keys(value).sort()) {
            out[k] = sortKeys(value[k]);
        }
        return out;
    }
    return value;
}

function buildToolset(stage) {
    const names = STAGE_TOOLS[stage];
    return Object.freeze(
        names.map((name) => {
            const def = TOOL_DEFS[name];
            const inputZod = def.inputSchemaFor(stage);
            const inputJsonSchema = sortKeys(z.toJSONSchema(inputZod));
            return Object.freeze({
                name,
                description: def.description,
                input_schema: inputJsonSchema,
            });
        })
    );
}

const TOOLSETS = Object.freeze({
    intake: buildToolset('intake'),
    scenarioDesign: buildToolset('scenarioDesign'),
    configBuild: buildToolset('configBuild'),
    validate: buildToolset('validate'),
    translate: buildToolset('translate'),
});

function toolsetFor(stage) {
    if (!Object.prototype.hasOwnProperty.call(TOOLSETS, stage)) {
        throw new Error(`stageTools.toolsetFor: unknown stage "${stage}"`);
    }
    return TOOLSETS[stage];
}

module.exports = {
    ReportStatusSchema,
    ReportFindingsSchema,
    WriteStateSliceSchema,
    toolsetFor,
};
