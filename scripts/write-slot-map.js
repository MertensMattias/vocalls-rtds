#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { read } = require('../core/state-io');

const args = Object.fromEntries(
    process.argv.slice(2).reduce((pairs, val, i, arr) => {
        if (val.startsWith('--')) pairs.push([val.slice(2), arr[i + 1]]);
        return pairs;
    }, [])
);

if (!args.state || !args.project) {
    process.stderr.write(
        'Usage: node scripts/write-slot-map.js --state <path> --project <name>\n'
    );
    process.exit(2);
}

try {
    const state = read(args.state);
    if (!state.slotMap) {
        process.stderr.write('write-slot-map: slotMap is null — configBuild has not run yet\n');
        process.exit(1);
    }
    const projectDir = path.resolve(path.dirname(args.state), '..');
    const outPath = path.join(projectDir, '.vocalls', 'slot-map.json');
    fs.writeFileSync(outPath, JSON.stringify(state.slotMap, null, 2) + '\n', 'utf8');
} catch (err) {
    process.stderr.write(`write-slot-map: ${err.message}\n`);
    process.exit(2);
}
