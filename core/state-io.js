'use strict';

/**
 * core/state-io.js — only legitimate read/write path for state.json and
 * context.md.
 *
 * Public API:
 *   init(projectDir, opts)              -- create state.json + context.md if missing
 *   read(statePath)                      -- read + PipelineStateSchema.parse
 *   mutate(statePath, mutator)           -- atomic read → mutate → re-validate → write
 *   appendContext(contextPath, section)  -- append a narrative section to context.md
 *
 * Internals: atomic writes via tmp+rename. Soft warn (no throw) when state.json
 * grows beyond a threshold per registered decision in
 * docs/refactor/09-orchestrator-refactor-design.md §12.6.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { PipelineStateSchema } = require('./schema');

const STATE_FILE = '.vocalls/state.json';
const CONTEXT_FILE = '.vocalls/context.md';

const SOFT_WARN_THRESHOLD_BYTES = 500 * 1024;

function ensureDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sha256OfFile(filePath) {
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buf).digest('hex');
}

function nowIso() {
    return new Date().toISOString();
}

function formatIssues(issues) {
    return issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

function init(projectDir, opts) {
    if (!opts || !opts.project) {
        throw new Error('state-io.init: opts.project is required');
    }
    if (!opts.primaryLanguage || !Array.isArray(opts.languages)) {
        throw new Error('state-io.init: primaryLanguage and languages required');
    }
    if (!opts.briefPath || !fs.existsSync(opts.briefPath)) {
        throw new Error(`state-io.init: briefPath does not exist: ${opts.briefPath}`);
    }

    const statePath = path.join(projectDir, STATE_FILE);
    const contextPath = path.join(projectDir, CONTEXT_FILE);

    if (!fs.existsSync(statePath)) {
        ensureDir(statePath);
        const ts = nowIso();
        const initial = {
            _meta: {
                schemaVersion: '2',
                project: opts.project,
                primaryLanguage: opts.primaryLanguage,
                languages: opts.languages,
                stage: 'intake',
                status: 'idle',
                repairRound: 0,
                repairHistory: [],
                createdAt: ts,
                updatedAt: ts,
                lastWriter: 'orchestrator',
                inputHashes: {},
            },
            brief: {
                path: opts.briefPath,
                sha256: sha256OfFile(opts.briefPath),
            },
            control: {
                userIntent: opts.userIntent || 'build',
                userGates: {
                    designApproval: 'pending',
                    qualityGate: 'pending',
                    translateGate: 'pending',
                },
            },
            intake: null,
            scenarioDesign: null,
            slotMap: null,
            validation: {
                lastRun: null,
                findings: [],
                blocking: false,
                autofixApplied: [],
            },
            translation: { NL: 'pending', FR: 'pending', DE: 'pending', EN: 'pending' },
        };
        const parse = PipelineStateSchema.safeParse(initial);
        if (!parse.success) {
            throw new Error(
                `state-io.init: initial state failed schema validation:\n${formatIssues(parse.error.issues)}`
            );
        }
        fs.writeFileSync(statePath, JSON.stringify(parse.data, null, 2) + '\n', 'utf8');
    }

    if (!fs.existsSync(contextPath)) {
        ensureDir(contextPath);
        const header = [
            `# Vocalls Build Context — ${opts.project}`,
            '',
            `> Created ${nowIso()} by state-io.init.`,
            '> Append-only narrative log. Each subagent and the orchestrator',
            '> appends a section per turn; never rewrite earlier sections.',
            '',
        ].join('\n');
        fs.writeFileSync(contextPath, header, 'utf8');
    }

    return { statePath, contextPath };
}

// ---------------------------------------------------------------------------
// read
// ---------------------------------------------------------------------------

function read(statePath) {
    if (!fs.existsSync(statePath)) {
        throw new Error(`state-io.read: file not found: ${statePath}`);
    }
    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch (err) {
        throw new Error(`state-io.read: invalid JSON in ${statePath}: ${err.message}`);
    }
    // Pre-parse migration: v1 → v2. Inject empty inputHashes and bump version
    // in memory; persisted on next successful mutate (read stays semantically pure
    // re: disk).
    if (raw && typeof raw === 'object' && raw._meta && raw._meta.schemaVersion === '1') {
        raw._meta.inputHashes = {};
        raw._meta.schemaVersion = '2';
    }
    const parse = PipelineStateSchema.safeParse(raw);
    if (!parse.success) {
        throw new Error(
            `state-io.read: schema validation failed for ${statePath}:\n${formatIssues(parse.error.issues)}`
        );
    }
    return parse.data;
}

// ---------------------------------------------------------------------------
// mutate
// ---------------------------------------------------------------------------

function softWarnSize(byteLen, statePath) {
    if (byteLen > SOFT_WARN_THRESHOLD_BYTES) {
        // eslint-disable-next-line no-console
        console.warn(
            `state-io: ${statePath} is ${byteLen} bytes (> ${SOFT_WARN_THRESHOLD_BYTES}). ` +
                `This is a soft warning; the write succeeded.`
        );
    }
}

function mutate(statePath, mutator, { maxRetries = 3, retryDelayMs = 20 } = {}) {
    if (typeof mutator !== 'function') {
        throw new Error('state-io.mutate: mutator must be a function');
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const current = read(statePath);
        const currentMtime = fs.statSync(statePath).mtimeMs;

        // Deep-clone so the mutator can mutate freely.
        const draft = JSON.parse(JSON.stringify(current));
        const ret = mutator(draft);
        const candidate = ret === undefined ? draft : ret;
        candidate._meta = candidate._meta || {};
        candidate._meta.updatedAt = nowIso();

        const parse = PipelineStateSchema.safeParse(candidate);
        if (!parse.success) {
            throw new Error(
                `state-io.mutate: result failed schema validation:\n${formatIssues(parse.error.issues)}`
            );
        }

        const serialized = JSON.stringify(parse.data, null, 2) + '\n';
        softWarnSize(serialized.length, statePath);
        const tmpPath = statePath + '.tmp';
        fs.writeFileSync(tmpPath, serialized, 'utf8');

        // Detect concurrent write between our read and our tmp write.
        const mtimeAfter = fs.statSync(statePath).mtimeMs;
        if (mtimeAfter !== currentMtime) {
            fs.unlinkSync(tmpPath);
            if (attempt === maxRetries) {
                throw new Error(
                    `state-io.mutate: optimistic concurrency conflict on ${statePath} after ${maxRetries} retries`
                );
            }
            // Linear backoff (synchronous busy-wait keeps this simple and avoids async).
            const until = Date.now() + retryDelayMs * (attempt + 1);
            while (Date.now() < until) { /* spin */ }
            continue;
        }

        fs.renameSync(tmpPath, statePath);
        return parse.data;
    }
    /* unreachable */
}

// ---------------------------------------------------------------------------
// appendContext
// ---------------------------------------------------------------------------

function appendContext(contextPath, section) {
    if (!section || typeof section.heading !== 'string' || section.heading.length === 0) {
        throw new Error('state-io.appendContext: section.heading required (non-empty string)');
    }
    if (typeof section.body !== 'string' || section.body.length === 0) {
        throw new Error('state-io.appendContext: section.body required (non-empty string)');
    }
    if (!fs.existsSync(contextPath)) {
        throw new Error(`state-io.appendContext: ${contextPath} does not exist`);
    }
    const block = `\n${section.heading}\n\n${section.body}\n`;
    fs.appendFileSync(contextPath, block, 'utf8');
}

module.exports = {
    init,
    read,
    mutate,
    appendContext,
    SOFT_WARN_THRESHOLD_BYTES,
};
