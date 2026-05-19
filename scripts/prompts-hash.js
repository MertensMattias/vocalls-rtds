#!/usr/bin/env node
'use strict';

/**
 * scripts/prompts-hash.js
 *
 * Hashes every prompt and reference file under core/prompts/ and writes a
 * manifest. The prompt-cache key is the rendered bytes of the system block
 * (per-stage prompt + concatenated references); a silent edit anywhere in
 * that tree invalidates the cache. This script makes the drift visible.
 *
 * Usage:
 *   npm run prompts:hash    -- regenerate core/prompts/.manifest.json
 *   npm run prompts:check   -- exit 1 if regen would change anything (CI gate)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROMPTS_DIR = path.join(__dirname, '..', 'core', 'prompts');
const MANIFEST_PATH = path.join(PROMPTS_DIR, '.manifest.json');

function walk(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...walk(full));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            out.push(full);
        }
    }
    return out;
}

function buildManifest() {
    const files = walk(PROMPTS_DIR)
        .map((abs) => {
            const rel = path.relative(PROMPTS_DIR, abs).split(path.sep).join('/');
            const sha256 = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
            return { path: rel, sha256 };
        })
        .sort((a, b) => a.path.localeCompare(b.path));
    return { version: 1, files };
}

const isCheck = process.argv.includes('--check');
const next = buildManifest();
const serialized = JSON.stringify(next, null, 2) + '\n';

if (isCheck) {
    if (!fs.existsSync(MANIFEST_PATH)) {
        process.stderr.write('prompts:check FAILED — manifest missing. Run `npm run prompts:hash`.\n');
        process.exit(1);
    }
    const current = fs.readFileSync(MANIFEST_PATH, 'utf8');
    if (current === serialized) {
        process.stdout.write(`prompts:check OK (${next.files.length} files).\n`);
        process.exit(0);
    }
    const currentParsed = JSON.parse(current);
    const currentByPath = new Map(currentParsed.files.map((f) => [f.path, f.sha256]));
    const nextByPath = new Map(next.files.map((f) => [f.path, f.sha256]));
    const drift = [];
    for (const [p, h] of nextByPath) {
        if (!currentByPath.has(p)) drift.push(`  + ${p}`);
        else if (currentByPath.get(p) !== h) drift.push(`  ~ ${p}`);
    }
    for (const p of currentByPath.keys()) {
        if (!nextByPath.has(p)) drift.push(`  - ${p}`);
    }
    process.stderr.write('prompts:check FAILED — manifest drift:\n' + drift.join('\n') + '\n');
    process.stderr.write('Run `npm run prompts:hash` to update.\n');
    process.exit(1);
}

fs.writeFileSync(MANIFEST_PATH, serialized);
process.stdout.write(`prompts:hash wrote ${next.files.length} entries to ${path.relative(process.cwd(), MANIFEST_PATH)}\n`);
