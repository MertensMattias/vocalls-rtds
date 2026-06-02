/**
 * TEMPLATE — component contract test (failing-by-default).
 *
 * This file is NOT collected by Jest (testMatch is "*.test.js"; this is
 * "_template.js"). To add a contract test for a new operation:
 *
 *   1. Copy this file to <operationName>.test.js in this directory.
 *   2. Replace executeXxx and the params/branches with the operation's contract
 *      from its spec (rtds/specs/<op>.spec.md). See sendSms.test.js for a worked
 *      HTTP-calling example.
 *   3. Delete the failing placeholder below once real assertions are in place.
 *
 * The placeholder fails on purpose so a half-written contract test cannot pass
 * silently — an unfinished copy reds the suite until it is filled in.
 */

var h = require('./_harness');

describe('<operationName> component contract', function () {
    it('REPLACE ME — contract not yet written', function () {
        return h.loadRuntime().then(function (sb) {
            // Remove this line and assert the real params-in -> NextStep-out
            // contract for <operationName> (see sendSms.test.js).
            throw new Error(
                'Contract test for <operationName> not implemented — ' +
                'fill in from rtds/specs/<op>.spec.md and remove this placeholder.'
            );
        });
    });
});
