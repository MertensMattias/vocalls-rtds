'use strict';

/**
 * core/gates/designApproval.js
 *
 * Design-approval gate. Fires after `scenarioDesign` completes and
 * before `configBuild` begins (DESIGN §10). The user reviews the
 * scenario shape and either approves (`accept` → advance to
 * `configBuild`) or sends it back for revision (`revise` → rewind to
 * `scenarioDesign`, clear its input hash, increment repairRound). FSM
 * transition rules live in `core/orchestratorFsm.js#applyGate` —
 * `applyChoice` here is a thin delegating wrapper.
 *
 * Public API (per plan U9 §Files):
 *   formatQuestion(state) → { prompt, choices, defaultChoice }
 *   applyChoice(state, choice) → newState
 *
 * Both are pure: same input → same output, no I/O, input state never
 * mutated.
 */

const { applyGate } = require('../orchestratorFsm');

const GATE_NAME = 'designApproval';
const CHOICES = Object.freeze(['accept', 'revise']);
const DEFAULT_CHOICE = 'accept';

function formatQuestion(state) {
    if (!state || !state._meta) {
        throw new Error(
            'gates.designApproval.formatQuestion: state._meta is required'
        );
    }
    const design = state.scenarioDesign || {};
    const scenarioCount = design.scenarios
        ? Object.keys(design.scenarios).length
        : 0;
    const caseCount = design.caseToScenario
        ? Object.keys(design.caseToScenario).length
        : 0;
    const reason = state._meta.gateReason || '';

    const promptLines = [
        'Design approval gate.',
        `Scenarios drafted: ${scenarioCount}. Cases mapped: ${caseCount}.`,
    ];
    if (reason.length > 0) promptLines.push(`Stage reason: ${reason}`);
    promptLines.push(
        "Choose 'accept' to advance to configBuild, or 'revise' to send the design back to scenarioDesign for repair."
    );

    return {
        prompt: promptLines.join('\n'),
        choices: CHOICES.slice(),
        defaultChoice: DEFAULT_CHOICE,
    };
}

function applyChoice(state, choice) {
    if (typeof choice !== 'string') {
        throw new Error(
            'gates.designApproval.applyChoice: choice must be a string'
        );
    }
    if (!CHOICES.includes(choice)) {
        throw new Error(
            `gates.designApproval.applyChoice: unknown choice "${choice}"; expected one of ${CHOICES.join(', ')}`
        );
    }
    return applyGate(state, GATE_NAME, { choice });
}

module.exports = {
    GATE_NAME,
    CHOICES,
    DEFAULT_CHOICE,
    formatQuestion,
    applyChoice,
};
