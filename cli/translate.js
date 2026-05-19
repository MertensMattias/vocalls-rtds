#!/usr/bin/env node
'use strict';

/**
 * Translation CLI — dispatches the vocalls-translator skill for one language.
 *
 * Usage:
 *   npm run translate -- --project <name> --lang NL
 *   npm run translate -- --project <name> --lang FR
 *
 * The skill itself runs as a sub-agent; this CLI merely constructs the prompt
 * and reports candidate-slot counts. In practice the user runs the workflow
 * from CC Workflow Studio — this CLI is a convenience for single-language
 * retranslation after initial build.
 */

const fs = require('fs');
const path = require('path');

const parseArgs = () => {
    const out = {};
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--project') out.project = argv[++i];
        else if (argv[i] === '--lang') out.lang = argv[++i];
    }
    return out;
};

const main = () => {
    const { project, lang } = parseArgs();
    if (!project || !lang) {
        console.error('Usage: npm run translate -- --project <name> --lang <NL|FR|DE|EN>');
        process.exit(1);
    }
    const validLangs = ['NL', 'FR', 'DE', 'EN'];
    if (!validLangs.includes(lang)) {
        console.error(`Invalid --lang ${lang}; must be one of ${validLangs.join(', ')}`);
        process.exit(1);
    }

    // Count candidate slots to report before dispatch.
    const dir = path.join('projects', project, 'callScripts');
    if (!fs.existsSync(dir)) {
        console.error(`Project callScripts directory not found: ${dir}`);
        process.exit(1);
    }
    const agentFiles = fs.readdirSync(dir).filter((f) => /^AGENT_.*\.js$/.test(f));
    const tag = `[${lang}_UNTRANSLATED]`;
    let total = 0;
    for (const f of agentFiles) {
        const body = fs.readFileSync(path.join(dir, f), 'utf8');
        const matches = body.match(new RegExp(tag.replace(/[\[\]]/g, '\\$&'), 'g')) || [];
        total += matches.length;
        console.log(`${f}: ${matches.length} ${tag} slots`);
    }
    console.log(`TOTAL: ${total}`);
    if (total === 0) {
        console.log(`No ${tag} slots found — nothing to translate.`);
        process.exit(0);
    }
    console.log(
        `\nDispatch the vocalls-translator skill with:\n  target language: ${lang}\n  target files: ${agentFiles.map((f) => path.join(dir, f)).join(', ')}\n`
    );
};

if (require.main === module) main();

module.exports = { main };
