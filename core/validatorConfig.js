'use strict';

/**
 * Shared validator configuration — consumed by both CLI (dslValidator) and
 * the semantic-validator skill. Change here, both layers agree.
 */

const DSL_STEP_COUNT = {
    min: 2,
    max: 7,                    // default cap for typical scenarios
    optionPickerMax: 8,        // option_picker scenarios may go to 8
};

const OPTION_PICKER_SCENARIO_TYPES = new Set([
    'option_picker',
    'intent_router',           // intent_router* scenarios are option_pickers
]);

module.exports = { DSL_STEP_COUNT, OPTION_PICKER_SCENARIO_TYPES };
