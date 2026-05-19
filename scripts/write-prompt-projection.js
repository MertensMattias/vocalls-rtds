#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadAgentFile } = require('../core/loadAgent');
const { projectPromptFacing } = require('../core/projections');
const { filterToPrimaryLang } = require('../core/projectionHelpers');

const argv = process.argv.slice(2);
const projectIdx = argv.indexOf('--project');
if (projectIdx === -1 || !argv[projectIdx + 1]) {
    console.error('Usage: node scripts/write-prompt-projection.js --project <name>');
    process.exit(2);
}
const projectName = argv[projectIdx + 1];

const callScriptsDir = path.resolve(`projects/${projectName}/callScripts`);
const files = fs.readdirSync(callScriptsDir).filter((f) => /^AGENT_[A-Z0-9_]+\.js$/.test(f));
if (files.length === 0) {
    console.error(`No AGENT_*.js files found under ${callScriptsDir}`);
    process.exit(1);
}

const out = {};
for (const f of files) {
    const agent = loadAgentFile(path.join(callScriptsDir, f));
    const id =
        agent._meta && agent._meta.agentId ? agent._meta.agentId : f.replace(/^AGENT_|\.js$/g, '');
    out[id] = projectPromptFacing(agent);
}

// primaryLanguage lives in _meta of the AGENT file, not in handover.json.
// translationState lives in handover.json.
const firstId = Object.keys(out)[0];
const primaryLang = (firstId && out[firstId]._meta && out[firstId]._meta.primaryLanguage) || null;

let translationState = 'pre-translation';
const handoverPath = path.resolve(`projects/${projectName}/.vocalls/handover.json`);
if (fs.existsSync(handoverPath)) {
    try {
        const handover = JSON.parse(fs.readFileSync(handoverPath, 'utf8'));
        translationState = handover.translationState || 'pre-translation';
    } catch (_) {
        // handover unreadable — keep default 'pre-translation'
    }
}

if (!primaryLang) {
    console.warn(`[write-prompt-projection] Warning: primaryLanguage not found in _meta for project "${projectName}". Skipping language filter and prompt embedding.`);
}

// Filter to primary language only when pre-translation
if (primaryLang && translationState === 'pre-translation') {
    for (const id of Object.keys(out)) {
        out[id] = filterToPrimaryLang(out[id], primaryLang);
    }
}

// Embed assembled prompts per case (primary language only)
if (primaryLang) {
    for (const id of Object.keys(out)) {
        const caseNums = Object.keys(out[id].caseToScenario || {}).filter((k) => k !== 'default');
        const assembledPrompts = {};
        for (const caseNum of caseNums) {
            try {
                assembledPrompts[caseNum] = execSync(
                    `node cli/simulate.js --prompt-only --project ${projectName} --case ${caseNum} --language ${primaryLang}`,
                    { encoding: 'utf8', cwd: process.cwd(), timeout: 15000 }
                );
            } catch (_) {
                // skip — reviewer falls back to Bash for missing entries
            }
        }
        out[id].assembledPrompts = assembledPrompts;
    }
}

const outDir = path.resolve(`projects/${projectName}/.vocalls`);
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'config-prompt-projection.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

console.log(`PROJECTION_WRITTEN: ${path.relative(process.cwd(), outPath)}`);

