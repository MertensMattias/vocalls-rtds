#!/usr/bin/env node
'use strict';

/**
 * scripts/gen-docs.js
 *
 * Walks core/schema/* and writes one markdown doc per top-level entity to
 * docs/schema/<name>.md. Generated content; do not edit by hand.
 *
 * Usage:
 *   npm run schema:docs    -- regenerate
 *   npm run schema:check   -- exit 1 if regen would change anything (CI gate)
 */

const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const schema = require('../core/schema');
const { GROUNDING_LINES } = require('../core/grounding-line');

const ENTITIES = [
    { name: 'brief', schemaKey: 'BriefMetaSchema', src: 'core/schema/brief.js' },
    { name: 'intake', schemaKey: 'IntakeSchema', src: 'core/schema/intake.js' },
    { name: 'scenarioDesign', schemaKey: 'ScenarioDesignSchema', src: 'core/schema/scenarioDesign.js' },
    { name: 'slotMap', schemaKey: 'SlotMapSchema', src: 'core/schema/slotMap.js' },
    { name: 'agentConfig', schemaKey: 'AgentConfigSchema', src: 'core/schema/agentConfig.js' },
    { name: 'validation', schemaKey: 'ValidationFindingSchema', src: 'core/schema/validation.js' },
    { name: 'pipelineState', schemaKey: 'PipelineStateSchema', src: 'core/schema/pipelineState.js' },
];

function renderDoc({ name, schemaKey, src }) {
    const zodSchema = schema[schemaKey];
    const jsonSchema = z.toJSONSchema(zodSchema);
    return [
        `# ${name} schema`,
        '',
        '> AUTO-GENERATED from `' + src + '` via `npm run schema:docs`. Do not edit.',
        '',
        '## JSON Schema',
        '',
        '```json',
        JSON.stringify(jsonSchema, null, 2),
        '```',
        '',
    ].join('\n');
}

function renderGroundingLineDoc() {
    const rows = Object.entries(GROUNDING_LINES).map(
        ([lang, line]) => `| ${lang} | ${line} |`
    );
    return [
        '# Canonical Grounding Line',
        '',
        '> AUTO-GENERATED from `core/grounding-line.js` via `npm run schema:docs`. Do not edit.',
        '',
        '**Contract:** PQR Criterion 6 requires this sentence verbatim in every scenario objective that has a KNOWLEDGE block. **Scenario-designer** authors the line into the primary-language objective immediately after the `Goal:` line and before the first numbered step; not numbered itself. **Config-builder** copies the objective verbatim — the line travels with the verbatim copy. **Translator** uses the exact target-language phrase from the table below — no paraphrase.',
        '',
        '| Language | Grounding line |',
        '|----------|---------------|',
        ...rows,
        '',
        'These strings are the canonical source for PQR Criterion 6 (knowledge grounding) and must match the table in `prompt-layer-map.md` exactly.',
        '',
    ].join('\n');
}

function renderSharedDoc() {
    const synonyms = schema.SYSTEM_ACTION_SYNONYMS;
    const rows = Object.entries(synonyms).map(
        ([from, to]) => `| \`${from}\` | \`${to}\` |`
    );
    return [
        '# shared constants',
        '',
        '> AUTO-GENERATED from `core/schema/shared.js` via `npm run schema:docs`. Do not edit.',
        '',
        '## SYSTEM_ACTION_SYNONYMS',
        '',
        'Confident-synonym rules used by the `vocalls-brief` skill (Phase 2.6) and the',
        '`vocalls-intake` agent to canonicalize non-SYSTEM_ACTION names to one of the',
        'three SYSTEM_ACTIONs (`transfer_to_agent`, `escalate_to_agent`, `end_conversation`).',
        '',
        '| Source name | Canonical SYSTEM_ACTION |',
        '|---|---|',
        ...rows,
        '',
    ].join('\n');
}

const outDir = path.resolve(__dirname, '..', 'docs', 'schema');
const refsDir = path.resolve(__dirname, '..', '.claude', 'skills', 'references');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(refsDir, { recursive: true });

const checkMode = process.argv.includes('--check');
let drift = false;

function writeOrCheck(outPath, content) {
    if (checkMode) {
        const existing = fs.existsSync(outPath)
            ? fs.readFileSync(outPath, 'utf8')
            : '';
        if (existing !== content) {
            console.error(
                `DRIFT: ${path.relative(process.cwd(), outPath)} is out of sync with its source module (see banner inside the file)`
            );
            drift = true;
        }
    } else {
        fs.writeFileSync(outPath, content);
        console.log(`WROTE: ${path.relative(process.cwd(), outPath)}`);
    }
}

for (const entity of ENTITIES) {
    writeOrCheck(path.join(outDir, `${entity.name}.md`), renderDoc(entity));
}

writeOrCheck(path.join(outDir, 'shared.md'), renderSharedDoc());
writeOrCheck(path.join(refsDir, 'grounding-line.md'), renderGroundingLineDoc());

if (checkMode && drift) {
    console.error('Run `npm run schema:docs` to regenerate, then commit.');
    process.exit(1);
}
