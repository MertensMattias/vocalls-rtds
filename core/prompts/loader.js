'use strict';

/**
 * core/prompts/loader.js
 *
 * Cached-system-prompt builder for the subagent runner (DESIGN §7).
 * Reads `core/prompts/<stage>.md`, parses its YAML frontmatter,
 * concatenates the declared `references[*].md` files, and returns a
 * byte-stable `{ systemPrompt, model, effort, references }` shape. Two
 * consecutive calls with the same on-disk inputs produce byte-identical
 * `systemPrompt` output — prompt caching depends on this.
 *
 * Per-stage `model` and `effort` are sourced from
 * `core/orchestrator-constants.js#STAGE_CONFIG` (code is the source of
 * truth per R3). The frontmatter `model:` / `effort:` lines are
 * documentation only; this loader does not read them. Drift between the
 * frontmatter mirror and STAGE_CONFIG is caught by `npm run prompts:check`
 * and by reviewers reading the prompt file.
 *
 * Frontmatter parser: this module ships its own minimal YAML-subset
 * parser distinct from `core/briefParser.js#parseFrontmatter`. Loader
 * policy is strict (throws on malformed lines / unterminated blocks)
 * and supports indented `- item` block-lists for the `references:` key.
 * The briefParser policy is recoverable (collects warnings) and is
 * key:value only. The two are intentionally separate because the input
 * sources have different recovery semantics — author-written brief.md
 * tolerates parser warnings; pipeline-shipped prompt files must fail
 * loudly. Keep them in sync if the YAML subset grows.
 *
 * Errors are module-prefixed and thrown:
 *   - Unknown stage (not in STAGE_CONFIG)
 *   - Missing stage prompt file
 *   - Missing reference file declared in frontmatter
 *   - Frontmatter that does not parse
 *
 * Public API:
 *   loadStage(stage) → { systemPrompt, model, effort, references }
 *     - `systemPrompt`: stage body (frontmatter stripped) + each
 *       reference file's contents. Each block is whitespace-trimmed and
 *       joined with a single blank line in frontmatter-declared order.
 *       The trim is deterministic, so byte-stability holds; the prompts:
 *       check manifest hashes source files (not rendered output), so
 *       trimming does not affect drift detection.
 *     - `model`, `effort`: per-stage config from STAGE_CONFIG.
 *     - `references`: array of reference names declared in the
 *       frontmatter (e.g. `['data-flow-contracts']`), in order.
 */

const fs = require('fs');
const path = require('path');

const { STAGE_CONFIG } = require('../orchestrator-constants');

const PROMPTS_DIR = __dirname;
const REFERENCES_DIR = path.join(PROMPTS_DIR, 'references');

// Matches an opening `---` line followed by frontmatter body and a
// closing `---` line. Captures the body. CRLF-tolerant. The body
// itself must not contain a line consisting solely of `---`.
const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/;

function readFile(absPath, kind) {
    try {
        return fs.readFileSync(absPath, 'utf8');
    } catch (err) {
        if (err && err.code === 'ENOENT') {
            throw new Error(
                `prompts.loader: ${kind} file not found: ${absPath}`
            );
        }
        throw new Error(
            `prompts.loader: failed to read ${kind} ${absPath}: ${err.message}`
        );
    }
}

// Minimal YAML frontmatter parser. Supports:
//   key: value
//   key: 'value' or "value"  -- matching quotes stripped
//   key:                     -- followed by indented `- item` lines (array)
// No nesting beyond list-of-strings. Matches the briefParser policy of
// avoiding a YAML dependency.
function parseFrontmatter(block, stage) {
    const result = {};
    const lines = block.split(/\r?\n/);
    let i = 0;
    while (i < lines.length) {
        const raw = lines[i];
        const line = raw.replace(/\s+$/, '');
        if (line.length === 0 || line.trimStart().startsWith('#')) {
            i++;
            continue;
        }
        const m = line.match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
        if (!m) {
            throw new Error(
                `prompts.loader: malformed frontmatter line in ${stage}.md: "${raw}"`
            );
        }
        const key = m[1];
        let value = m[2].trim();
        if (value.length === 0) {
            // Possible block-list value on following indented lines.
            const items = [];
            let j = i + 1;
            while (j < lines.length) {
                const next = lines[j];
                const im = next.match(/^\s+-\s+(.*\S)\s*$/);
                if (!im) break;
                items.push(im[1]);
                j++;
            }
            result[key] = items;
            i = j;
            continue;
        }
        if (
            value.length >= 2 &&
            ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'")))
        ) {
            value = value.slice(1, -1);
        }
        result[key] = value;
        i++;
    }
    return result;
}

function splitFrontmatter(text, stage) {
    if (!text.startsWith('---')) {
        return { frontmatter: {}, body: text };
    }
    const match = text.match(FRONTMATTER_RE);
    if (!match) {
        throw new Error(
            `prompts.loader: unterminated frontmatter in ${stage}.md`
        );
    }
    const frontmatter = parseFrontmatter(match[1], stage);
    const body = text.slice(match[0].length);
    return { frontmatter, body };
}

function loadStage(stage) {
    if (!Object.prototype.hasOwnProperty.call(STAGE_CONFIG, stage)) {
        throw new Error(`prompts.loader.loadStage: unknown stage "${stage}"`);
    }

    const stagePath = path.join(PROMPTS_DIR, `${stage}.md`);
    const raw = readFile(stagePath, 'stage');
    const { frontmatter, body } = splitFrontmatter(raw, stage);

    const references = Array.isArray(frontmatter.references)
        ? frontmatter.references.slice()
        : [];

    const refBodies = references.map((name) => {
        const refPath = path.join(REFERENCES_DIR, `${name}.md`);
        return readFile(refPath, 'reference');
    });

    // Concatenation order: stage body first, references in declared
    // frontmatter order. Each block is whitespace-trimmed (deterministic,
    // so byte-stability holds) and joined with a single blank line. The
    // prompts:check manifest hashes source files, not rendered output —
    // trimming here does not weaken drift detection.
    const parts = [body.replace(/^\s+/, '').replace(/\s+$/, '')];
    for (const refBody of refBodies) {
        parts.push(refBody.replace(/^\s+/, '').replace(/\s+$/, ''));
    }
    const systemPrompt = parts.join('\n\n');

    const cfg = STAGE_CONFIG[stage];
    return {
        systemPrompt,
        model: cfg.model,
        effort: cfg.effort,
        references,
    };
}

module.exports = { loadStage };
