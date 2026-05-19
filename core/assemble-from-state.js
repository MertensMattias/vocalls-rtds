'use strict';

/**
 * core/assemble-from-state.js — in-process assemble pipeline (plan 001 U10).
 *
 * Replaces the two-script orchestrator sequence (write-slot-map.js then
 * scripts/assemble.js) with a single in-process call. Reads state.json,
 * validates state.slotMap is populated, calls assembleAgentFile, writes
 * AGENT_<ID>.js into projects/<project>/callScripts/, and (by default)
 * writes slot-map.json to .vocalls/ for traceability (Mode 4 reads it from
 * disk).
 *?/
 * Public API:
 *   assembleFromState({ statePath, project, [writeSlotMap=true], [cwd] })
 *     → { assembled: [<absPath>, ...], slotMapPath: <absPath>|null }
 *
 * Errors are thrown with `assemble-from-state:` prefix so callers can
 * distinguish them from underlying state-io or assembler errors.
 *
 * scripts/assemble.js is a thin CLI shim around this helper. The
 * orchestrator invokes the helper directly via `node -e` to skip the
 * subprocess hop and the path-doubling failure mode that --project arg
 * parsing used to introduce.
 */

const fs = require('fs');
const path = require('path');

const acorn = require('acorn');
const stateIo = require('./state-io');
const { assembleAgentFile } = require('./assembler');

function normalizeProjectName(project) {
    if (typeof project !== 'string' || project.length === 0) {
        throw new Error('assemble-from-state: project (string) is required');
    }
    // Mirror the U3 normalization: accept either `direct-debit` or
    // `projects/direct-debit` (or backslash variant) and resolve to the
    // canonical short name.
    return project.replace(/^projects[/\\]+/, '');
}

function assembleFromState(opts) {
    if (!opts || typeof opts !== 'object') {
        throw new Error('assemble-from-state: opts object is required');
    }
    if (typeof opts.statePath !== 'string' || opts.statePath.length === 0) {
        throw new Error('assemble-from-state: opts.statePath (string) is required');
    }
    const project = normalizeProjectName(opts.project);
    const writeSlotMap = opts.writeSlotMap !== false; // default true
    const cwd = opts.cwd || process.cwd();

    const statePath = path.resolve(cwd, opts.statePath);
    const state = stateIo.read(statePath);

    if (!state.slotMap || typeof state.slotMap !== 'object') {
        throw new Error(
            `assemble-from-state: state.slotMap is null — configBuild has not run for ${project}`
        );
    }

    const projectRoot = path.resolve(cwd, 'projects', project);
    const slotMapPath = writeSlotMap
        ? path.join(projectRoot, '.vocalls', 'slot-map.json')
        : null;

    if (writeSlotMap) {
        fs.mkdirSync(path.dirname(slotMapPath), { recursive: true });
        fs.writeFileSync(slotMapPath, JSON.stringify(state.slotMap, null, 2) + '\n', 'utf8');
    }

    let files;
    try {
        files = assembleAgentFile(state.slotMap);
    } catch (err) {
        throw new Error(`assemble-from-state: assembler error: ${err.message}`);
    }

    const outDir = path.join(projectRoot, 'callScripts');
    fs.mkdirSync(outDir, { recursive: true });

    const assembled = [];
    for (const agentId of Object.keys(files)) {
        const outPath = path.join(outDir, `AGENT_${agentId}.js`);
        const content = files[agentId];
        fs.writeFileSync(outPath, content, 'utf8');

        // U3 (plan 2026-05-17-002): syntax-check the emitted JS before
        // accepting the write. If the assembler produces broken JS the
        // file would otherwise load-fail later (in the simulator, the
        // runtime, or the validator's Mode 4 readAgent), surfacing a
        // confusing diagnosis far from the cause. Acorn is cheap
        // (<5ms typical) and is already a dependency.
        try {
            acorn.parse(content, { ecmaVersion: 2020, sourceType: 'script' });
        } catch (err) {
            try { fs.unlinkSync(outPath); } catch (_) { /* best-effort cleanup */ }
            throw new Error(
                `assemble-from-state: syntax error in AGENT_${agentId}.js: ${err.message}`
            );
        }

        assembled.push(outPath);
    }

    return { assembled, slotMapPath };
}

module.exports = { assembleFromState, normalizeProjectName };
