'use strict';

/**
 * core/gates/qualityGate.js
 *
 * Quality gate. Fires after `validate` produces findings that the
 * deterministic checks could not auto-resolve (DESIGN §10). The user
 * either accepts the validation outcome (`accept` → advance) or sends
 * the work back for repair (`revise` → rewind to the routeTo stage,
 * which defaults to the current stage). FSM transition rules live in
 * `core/orchestratorFsm.js#applyGate`.
 *
 * Public API:
 *   formatQuestion(state) → { prompt, choices, defaultChoice }
 *   applyChoice(state, choice, opts?) → newState
 *
 * Both pure. `applyChoice` accepts an optional `opts.routeTo` to direct
 * a 'revise' rewind to a specific stage (the FSM defaults to the
 * current stage when omitted).
 */

const { applyGate } = require('../orchestratorFsm');

const GATE_NAME = 'qualityGate';
const CHOICES = Object.freeze(['accept', 'revise']);
const DEFAULT_CHOICE = 'revise';

function summarizeFindings(findings) {
    const counts = { error: 0, warning: 0, info: 0, other: 0 };
    for (const f of findings) {
        const sev = (f && f.severity) || 'other';
        if (Object.prototype.hasOwnProperty.call(counts, sev)) {
            counts[sev]++;
        } else {
            counts.other++;
        }
    }
    return counts;
}

function formatQuestion(state) {
    if (!state || !state._meta) {
        throw new Error(
            'gates.qualityGate.formatQuestion: state._meta is required'
        );
    }
    const validation = state.validation || {};
    const findings = Array.isArray(validation.findings)
        ? validation.findings
        : [];
    const counts = summarizeFindings(findings);
    const blocking = findings.filter(
        (f) => f && (f.severity === 'error' || f.severity === 'warning')
    );
    const top = blocking.slice(0, 3).map((f) => {
        const path = Array.isArray(f.path) ? f.path.join('.') : '';
        return `  - [${f.severity}] ${f.check || '?'}${path ? ` @ ${path}` : ''}: ${f.message || ''}`;
    });

    const promptLines = [
        'Quality gate.',
        `Findings — errors: ${counts.error}, warnings: ${counts.warning}, info: ${counts.info}.`,
    ];
    if (top.length > 0) {
        promptLines.push('Top blocking findings:');
        promptLines.push(...top);
    }
    promptLines.push(
        "Choose 'accept' to ship as-is, or 'revise' to send the work back for repair."
    );

    return {
        prompt: promptLines.join('\n'),
        choices: CHOICES.slice(),
        defaultChoice: DEFAULT_CHOICE,
    };
}

function applyChoice(state, choice, { routeTo } = {}) {
    if (typeof choice !== 'string') {
        throw new Error(
            'gates.qualityGate.applyChoice: choice must be a string'
        );
    }
    if (!CHOICES.includes(choice)) {
        throw new Error(
            `gates.qualityGate.applyChoice: unknown choice "${choice}"; expected one of ${CHOICES.join(', ')}`
        );
    }
    const gateResult = { choice };
    if (typeof routeTo === 'string') gateResult.routeTo = routeTo;
    return applyGate(state, GATE_NAME, gateResult);
}

module.exports = {
    GATE_NAME,
    CHOICES,
    DEFAULT_CHOICE,
    formatQuestion,
    applyChoice,
};
