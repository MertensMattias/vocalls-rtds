#!/usr/bin/env node
'use strict';

const { read } = require('../core/state-io');

const args = Object.fromEntries(
    process.argv.slice(2).reduce((pairs, val, i, arr) => {
        if (val.startsWith('--')) pairs.push([val.slice(2), arr[i + 1]]);
        return pairs;
    }, [])
);

if (!args.state) {
    process.stderr.write('Usage: node scripts/read-state.js --state <path>\n');
    process.exit(2);
}

try {
    const state = read(args.state);
    process.stdout.write(JSON.stringify(state, null, 2) + '\n');
} catch (err) {
    process.stderr.write(`read-state: ${err.message}\n`);
    process.exit(1);
}
