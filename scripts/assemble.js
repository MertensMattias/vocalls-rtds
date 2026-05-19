#!/usr/bin/env node
'use strict';

/**
 * scripts/assemble.js — CLI shim around core/assemble-from-state.js (U10).
 *
 * Preserves the original CLI surface so manual / external callers keep
 * working: `node scripts/assemble.js --project <name>` resolves the
 * project's state.json, calls the in-process helper, and writes
 * AGENT_<ID>.js plus slot-map.json (traceability for validator Mode 4).
 *
 * Exit codes (stable for compatibility):
 *   2 — usage error (missing --project)
 *   3 — state.json or slot-map is missing for the project
 *   5 — assembler error (slotMap shape rejected by core/assembler)
 *   6 — state.json failed PipelineStateSchema validation
 */

const path = require('path');
const fs = require('fs');
const { assembleFromState, normalizeProjectName } = require('../core/assemble-from-state');

const argv = process.argv.slice(2);
const projectIdx = argv.indexOf('--project');
if (projectIdx === -1 || !argv[projectIdx + 1]) {
    console.error('Usage: node scripts/assemble.js --project <name>');
    process.exit(2);
}

const project = normalizeProjectName(argv[projectIdx + 1]);
const statePath = path.resolve(`projects/${project}/.vocalls/state.json`);

if (!fs.existsSync(statePath)) {
    console.error(`state.json not found: ${statePath}`);
    process.exit(3);
}

try {
    const { assembled } = assembleFromState({ statePath, project });
    for (const outPath of assembled) {
        console.log(`ASSEMBLED: ${path.relative(process.cwd(), outPath)}`);
    }
} catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (/state\.slotMap is null/.test(msg)) {
        console.error(msg);
        process.exit(3);
    }
    if (/assembler error/.test(msg)) {
        console.error(msg);
        process.exit(5);
    }
    if (/state-io\.read: schema validation failed/.test(msg)) {
        console.error(msg);
        process.exit(6);
    }
    console.error(msg);
    process.exit(1);
}
