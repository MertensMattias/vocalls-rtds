#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');

const args = Object.fromEntries(
    process.argv.slice(2).reduce((pairs, val, i, arr) => {
        if (val.startsWith('--')) pairs.push([val.slice(2), arr[i + 1]]);
        return pairs;
    }, [])
);

if (!args.file) {
    process.stderr.write('Usage: node scripts/sha256.js --file <path>\n');
    process.exit(1);
}

try {
    const buf = fs.readFileSync(args.file);
    process.stdout.write(crypto.createHash('sha256').update(buf).digest('hex'));
} catch (err) {
    process.stderr.write(`sha256: ${err.message}\n`);
    process.exit(1);
}
