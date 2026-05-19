#!/usr/bin/env node

'use strict';

/**
 * CLI Build — Print pipeline status for the active project and delegate to bin/vocalls.js.
 *
 * Until plan 003 U6 lands, bin/vocalls.js is a stub that prints a "not yet implemented"
 * notice. This script still produces useful status output so users can verify their
 * project state mid-migration.
 *
 * Usage:
 *   npm run build
 *   npm run build -- --project my-project
 */

const fs = require('fs');
const path = require('path');
const loader = require('../core/loader');

const parseArgs = () => {
    const args = process.argv.slice(2);
    const opts = { project: null };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--project') opts.project = args[++i];
    }
    return opts;
};

const main = () => {
    const envConfig = loader.loadEnvConfig();
    const opts = parseArgs();
    const projectDetails = loader.loadProjectConfig(opts.project);
    const projectName = projectDetails?.name ?? opts.project ?? envConfig.activeProject;

    if (!projectName) {
        console.error('No active project. Run: npm run init');
        process.exit(1);
    }

    const projectDir = path.resolve(process.cwd(), 'projects', projectName);
    const statePath = path.join(projectDir, '.vocalls', 'state.json');

    console.log('Agent Builder Pipeline');
    console.log('======================');
    console.log(`Project: ${projectName}`);
    console.log(
        `Stages:  intake → scenarioDesign → configBuild → validate → translate → done`
    );
    console.log('');

    if (fs.existsSync(statePath)) {
        try {
            const stateIo = require('../core/state-io');
            const state = stateIo.read(statePath);
            console.log(`Current stage: ${state._meta.stage}`);
            if (state._meta.repairRound > 0) {
                console.log(`Repair round:  ${state._meta.repairRound}`);
            }
            if (state._meta.lastWriter) {
                console.log(`Last writer:   ${state._meta.lastWriter}`);
            }
        } catch {
            console.log('Current stage: unknown (state.json unreadable)');
        }
    } else {
        console.log('Current stage: not started');
    }

    console.log('');
    console.log('To drive the pipeline:');
    console.log(`  node bin/vocalls.js build --project ${projectName}`);
    console.log('');
    console.log(
        'NOTE: bin/vocalls.js is a stub until plan 003 U6 lands — see docs/plans/2026-05-18-003-…'
    );
};

if (require.main === module) {
    main();
}
