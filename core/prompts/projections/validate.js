'use strict';

/**
 * core/prompts/projections/validate.js
 *
 * Tier B user-turn payload builder for the validate stage (DESIGN §6,
 * plan U7). Pure function: `(state) → projectedBlock`.
 *
 * The validate stage runs after deterministic checks (modes 1, 2, 4)
 * have populated `state.validation.findings` and recorded autofix
 * applications. The LLM judge (modes 3 + 5) consumes the prior findings
 * and the autofix history so its findings layer on top rather than
 * duplicating earlier work.
 *
 * Inputs:
 *   state — `PipelineState` (reads `.validation.findings`,
 *           `.validation.autofixApplied`)
 *
 * Output:
 *   {
 *     priorFindings: Finding[],          // passthrough of state.validation.findings
 *     autofixApplied: AutofixRecord[],   // passthrough of state.validation.autofixApplied
 *   }
 *
 * Public API:
 *   buildValidateProjection(state) → projectedBlock
 */

function buildValidateProjection(state) {
    if (!state || typeof state !== 'object') {
        throw new Error(
            'prompts.projections.validate: state must be an object'
        );
    }
    const validation = state.validation || {};
    const findings = Array.isArray(validation.findings)
        ? validation.findings
        : [];
    const autofixApplied = Array.isArray(validation.autofixApplied)
        ? validation.autofixApplied
        : [];
    return {
        priorFindings: findings.slice(),
        autofixApplied: autofixApplied.slice(),
    };
}

module.exports = { buildValidateProjection };
