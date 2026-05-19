#!/usr/bin/env node
'use strict';

/**
 * scripts/gen-jsonschema.js
 *
 * Walks core/schema/* and writes one JSON Schema per top-level entity to
 * schemas/<name>.schema.json. Used by external tooling and IDE schema
 * validation.
 *
 * Usage:  npm run schema:jsonschema
 */

const fs = require('fs');
const path = require('path');
const { z } = require('zod');

const schema = require('../core/schema');

const ENTITIES = [
    { name: 'brief', schemaKey: 'BriefMetaSchema' },
    { name: 'intake', schemaKey: 'IntakeSchema' },
    { name: 'scenarioDesign', schemaKey: 'ScenarioDesignSchema' },
    { name: 'slotMap', schemaKey: 'SlotMapSchema' },
    { name: 'agentConfig', schemaKey: 'AgentConfigSchema' },
    { name: 'validation', schemaKey: 'ValidationFindingSchema' },
    { name: 'pipelineState', schemaKey: 'PipelineStateSchema' },
];

const outDir = path.resolve(__dirname, '..', 'schemas');
fs.mkdirSync(outDir, { recursive: true });

for (const { name, schemaKey } of ENTITIES) {
    const zodSchema = schema[schemaKey];
    if (!zodSchema) {
        console.error(`Missing schema export: ${schemaKey}`);
        process.exit(2);
    }
    const json = z.toJSONSchema(zodSchema);
    const outPath = path.join(outDir, `${name}.schema.json`);
    fs.writeFileSync(outPath, JSON.stringify(json, null, 2) + '\n');
    console.log(`WROTE: ${path.relative(process.cwd(), outPath)}`);
}
