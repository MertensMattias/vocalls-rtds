'use strict';

/**
 * core/sdk-stub.js
 *
 * Deterministic stub that stands in for the Anthropic SDK in tests and in
 * stub-mode (`VOCALLS_SDK_STUB=1`) end-to-end runs. Drives the pipeline
 * without a network call so per-unit suites and the future end-to-end smoke
 * (U10) stay hermetic.
 *
 * Public API:
 *   dispatch(stage, state)   -- return the canned aggregated result for the
 *                               stage, deep-cloned. Throws if no fixture is
 *                               registered for the stage.
 *   STUB_DISPATCH_LOG        -- read-only call log (array of {stage, index}).
 *                               Each dispatch appends one entry. Use the
 *                               getter, do not mutate.
 *   resetDispatchLog()       -- empty the log. Tests call this between cases
 *                               to keep assertions independent.
 *
 * Result shape (subset of DESIGN §8 dispatch contract — the surface grows in
 * later units as the runner needs more):
 *   { token: 'STAGE_COMPLETE' | 'STAGE_FAILED' | 'STAGE_NOOP' | ...,
 *     slice?: object,
 *     findings?: object[],
 *     routeTo?: string,
 *     reason?: string }
 *
 * The shape mirrors what subagentRunner.dispatch (U8) will return when the
 * real SDK path runs; consumers route on `token` and consume `slice` /
 * `findings` per the FSM contract.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_FIXTURE_PATH = path.join(
    __dirname,
    '..',
    'tests',
    '__fixtures__',
    'sdk-stub-fixtures.json'
);

const fixtures = loadDefaultFixtures();
const dispatchLog = [];

function loadDefaultFixtures() {
    if (!fs.existsSync(DEFAULT_FIXTURE_PATH)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(DEFAULT_FIXTURE_PATH, 'utf8'));
    } catch (err) {
        throw new Error(
            `sdk-stub.loadDefaultFixtures: invalid JSON in ${DEFAULT_FIXTURE_PATH}: ${err.message}`
        );
    }
}

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function dispatch(stage, _state, extras) {
    if (typeof stage !== 'string' || stage.length === 0) {
        throw new Error('sdk-stub.dispatch: stage must be a non-empty string');
    }
    if (!Object.prototype.hasOwnProperty.call(fixtures, stage)) {
        throw new Error(`sdk-stub.dispatch: no fixture registered for stage "${stage}"`);
    }
    const callIndex = dispatchLog.length;
    const entry = { stage, index: callIndex };
    if (extras && typeof extras.targetLanguage === 'string') {
        entry.targetLanguage = extras.targetLanguage;
    }
    dispatchLog.push(entry);
    return deepClone(fixtures[stage]);
}

function resetDispatchLog() {
    dispatchLog.length = 0;
}

module.exports = {
    __stub__: true,
    dispatch,
    resetDispatchLog,
    get STUB_DISPATCH_LOG() {
        return dispatchLog.slice();
    },
};
