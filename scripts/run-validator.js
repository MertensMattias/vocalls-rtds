#!/usr/bin/env node
'use strict';

/**
 * CLI wrapper for the 5-mode validator runner.
 * Usage: node scripts/run-validator.js --state <path> --project <name>
 *
 * Reads state.json from --state, runs all five modes, prints JSON result.
 * Exit 0 on clean/warnings, exit 1 on blocking errors, exit 2 on crash.
 */

const path = require('path');
const { run } = require('../core/validatorRunner');
const { read } = require('../core/state-io');

const args = Object.fromEntries(
    process.argv
        .slice(2)
        .reduce((pairs, val, i, arr) => {
            if (val.startsWith('--')) pairs.push([val.slice(2), arr[i + 1]]);
            return pairs;
        }, [])
);

if (!args.state || !args.project) {
    console.error('Usage: node scripts/run-validator.js --state <path> --project <name>');
    process.exit(2);
}

(async () => {
    try {
        const state = read(args.state);
        if (!state.intake) {
            throw new Error(
                'run-validator: state.intake is required (validator runs post-intake). ' +
                    'Re-dispatch with state._meta.stage at validate after intake STAGE_COMPLETE.'
            );
        }
        const result = await run({
            projectRoot: path.resolve(args.state, '..', '..', '..', '..'),
            projectName: args.project,
            intake: state.intake,
            slotMap: state.slotMap,
            briefPath: state.brief.path,
        });
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.blocking ? 1 : 0);
    } catch (err) {
        console.error(err.message);
        process.exit(2);
    }
})();
