'use strict';

/**
 * core/configValidator.js — collapsed cross-field residual.
 *
 * After Phase A + Phase C, structural validation lives in SlotMapSchema /
 * AgentConfigSchema. This file retains ONLY cross-field semantic checks that
 * Zod cannot express:
 *
 *   - Check 13 — disposition coverage (action.messages keys cover scenario outcomes)
 *   - Check 18 — assembled-prompt token budget (delegates to core/tokenBudget)
 *   - Check 19 — DSL bounds (delegates to core/dslValidator)
 *
 * Public API: `validate(agentConfig, sharedConfig) → issue[]`.
 *
 * Schema-covered checks deleted from this file: schema_completeness,
 * scenario_routing, action_messages_shape, language_completeness, action
 * coverage, cdb_logs_structure (Checks 1, 2, 12, 14, 15, 17).
 *
 * PT-0008 (2026-05-14): Check KQ (knowledge grounding) was removed from this
 * file because it duplicated the canonical Mode 4 emit at validatorRunner.js
 * (which uses GROUNDING_LINES from core/grounding-line.js — the full-sentence
 * variant, not the short marker phrase). The npm run validate CLI no longer
 * emits check_kq_knowledge_grounding directly; the canonical check survives
 * inside `node bin/vocalls.js validate` via Mode 4. The two CLIs have always
 * had different scopes; this just makes the boundary explicit.
 */

const { validateDsl } = require('./dslValidator');
const { checkTokenBudget } = require('./tokenBudget');

const SYSTEM_ACTIONS = ['transfer_to_agent', 'escalate_to_agent', 'end_conversation'];

const issue = (check, severity, location, detail) => ({ check, severity, location, detail });

function checkDispositionCoverage(config) {
    const issues = [];
    const actions = config.actions || {};
    for (const [name, action] of Object.entries(actions)) {
        if (SYSTEM_ACTIONS.includes(name)) continue;
        const messages = action.messages || {};
        const def = messages.default || {};
        for (const outcome of ['success', 'failure']) {
            if (!def[outcome]) {
                issues.push(
                    issue(
                        'check_13_disposition_coverage',
                        'error',
                        `actions.${name}.messages.default.${outcome}`,
                        `Action '${name}' missing default ${outcome} message`
                    )
                );
            }
        }
    }
    return issues;
}

function checkPromptAssemblyBudget(config) {
    let raw;
    try {
        raw = checkTokenBudget(config) || [];
    } catch (err) {
        return [issue('check_18_prompt_assembly', 'warning', 'token-budget', err.message)];
    }
    return raw.map((i) => Object.assign({}, i, { check: 'check_18_prompt_assembly' }));
}

function checkDslBounds(config) {
    return validateDsl(config) || [];
}

function validate(agentConfig) {
    const issues = [];
    issues.push(...checkDispositionCoverage(agentConfig));
    issues.push(...checkPromptAssemblyBudget(agentConfig));
    issues.push(...checkDslBounds(agentConfig));
    return issues;
}

module.exports = { validate };
