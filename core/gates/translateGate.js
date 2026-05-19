'use strict';

/**
 * core/gates/translateGate.js
 *
 * Translate gate. Fires after `validate` succeeds and before
 * `translate` begins (DESIGN §10). The user either commits the
 * translation budget (`accept` → run translate) or ships the primary-
 * language config only (`decline` → mark pipeline `done`). FSM
 * transition rules live in `core/orchestratorFsm.js#applyGate`.
 *
 * Public API:
 *   formatQuestion(state) → { prompt, choices, defaultChoice }
 *   applyChoice(state, choice) → newState
 *
 * Both pure.
 */

const { applyGate } = require('../orchestratorFsm');

const GATE_NAME = 'translateGate';
const CHOICES = Object.freeze(['accept', 'decline']);
const DEFAULT_CHOICE = 'accept';

function formatQuestion(state) {
    if (!state || !state._meta) {
        throw new Error(
            'gates.translateGate.formatQuestion: state._meta is required'
        );
    }
    const primary = state._meta.primaryLanguage;
    const all = Array.isArray(state._meta.languages)
        ? state._meta.languages
        : [];
    const targets = primary ? all.filter((l) => l !== primary) : all.slice();

    const promptLines = ['Translate gate.'];
    if (targets.length === 0) {
        promptLines.push(
            `Primary language is ${primary || '?'} and no sibling languages are declared.`
        );
    } else {
        promptLines.push(
            `Primary language: ${primary || '?'}. Will translate into: ${targets.join(', ')}.`
        );
    }
    promptLines.push(
        "Choose 'accept' to run the translator, or 'decline' to ship primary-language only and finish."
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
            'gates.translateGate.applyChoice: choice must be a string'
        );
    }
    if (!CHOICES.includes(choice)) {
        throw new Error(
            `gates.translateGate.applyChoice: unknown choice "${choice}"; expected one of ${CHOICES.join(', ')}`
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
