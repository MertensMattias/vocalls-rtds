#!/usr/bin/env node

/**
 * CLI Reset — Reset pipeline state for a project back to intake.
 *
 * Clears all pipeline slices (intake, scenarioDesign, slotMap, validation,
 * translation, control.userGates) and resets _meta.stage to 'intake'.
 * Preserves: project identity, primaryLanguage, languages, and brief path/sha.
 * Also resets context.md to a fresh header.
 *
 * Usage:
 *   npm run reset -- --project <name>
 *   npm run reset  (uses activeProject from env.config.json)
 */

'use strict';

var fs = require('fs');
var path = require('path');
var readline = require('readline');
var loader = require('../core/loader');
var stateIo = require('../core/state-io');

function main() {
    var args = process.argv.slice(2);
    var projectName = null;
    var force = false;
    for (var i = 0; i < args.length; i++) {
        if (args[i] === '--project') projectName = args[++i];
        if (args[i] === '--force') force = true;
    }

    var envConfig = loader.loadEnvConfig();
    projectName = projectName || envConfig.activeProject;
    if (!projectName) {
        console.error('No project specified and no activeProject in env.config.json');
        process.exit(1);
    }
    if (!envConfig.projects[projectName]) {
        console.error('Project "' + projectName + '" not found in env.config.json');
        process.exit(1);
    }

    var projectDir = path.resolve(process.cwd(), 'projects', projectName);
    var statePath = path.join(projectDir, '.vocalls', 'state.json');
    var contextPath = path.join(projectDir, '.vocalls', 'context.md');

    if (!fs.existsSync(statePath)) {
        console.log('No state.json found for "' + projectName + '" — nothing to reset.');
        process.exit(0);
    }

    // Read current state to show user what will be lost.
    var current;
    try {
        current = stateIo.read(statePath);
    } catch (e) {
        console.error('Could not read state.json: ' + e.message);
        process.exit(1);
    }

    console.log('Pipeline Reset');
    console.log('==============');
    console.log('Project:       ' + projectName);
    console.log('Current stage: ' + current._meta.stage);
    console.log('');
    console.log('This will reset stage to "intake" and clear all pipeline slices.');
    console.log('brief.md and project files are NOT affected.');
    console.log('');

    if (force) {
        doReset(projectName, projectDir, statePath, contextPath, current);
    } else {
        var rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question('Confirm reset? [y/N] ', function (answer) {
            rl.close();
            if (answer.trim().toLowerCase() !== 'y') {
                console.log('Aborted.');
                process.exit(0);
            }
            doReset(projectName, projectDir, statePath, contextPath, current);
        });
    }
}

function doReset(projectName, projectDir, statePath, contextPath, current) {
    var now = new Date().toISOString();

    stateIo.mutate(statePath, function (state) {
        state._meta.stage = 'intake';
        state._meta.repairRound = 0;
        state._meta.repairHistory = [];
        state._meta.updatedAt = now;
        state._meta.lastWriter = 'cli/reset';
        state.control = {
            userIntent: 'build',
            userGates: {
                designApproval: 'pending',
                qualityGate: 'pending',
                translateGate: 'pending',
            },
        };
        state.intake = null;
        state.scenarioDesign = null;
        state.slotMap = null;
        state.validation = {
            lastRun: null,
            findings: [],
            blocking: false,
            autofixApplied: [],
        };
        // Reset translation status. The schema requires all 4 LangCode keys
        // (NL/FR/DE/EN per LangRecord in core/schema/shared.js), so build all
        // four: active languages reset to 'pending', inactive languages are
        // 'complete' so the translator filter naturally skips them.
        var allLangs = ['NL', 'FR', 'DE', 'EN'];
        var activeLangs = state._meta.languages || allLangs;
        state.translation = {};
        for (var i = 0; i < allLangs.length; i++) {
            var lang = allLangs[i];
            state.translation[lang] =
                activeLangs.indexOf(lang) !== -1 ? 'pending' : 'complete';
        }
        return state;
    });

    // Reset context.md to a fresh header.
    var header = [
        '# Vocalls Build Context — ' + projectName,
        '',
        '> Reset ' + now + ' by cli/reset.',
        '> Append-only narrative log. Each subagent and the orchestrator',
        '> appends a section per turn; never rewrite earlier sections.',
        '',
    ].join('\n');
    fs.writeFileSync(contextPath, header, 'utf8');

    console.log('✅ Pipeline reset for project "' + projectName + '".');
    console.log('Stage set to: intake');
    console.log('');
    console.log('Next: node bin/vocalls.js build --project ' + projectName);
}

if (require.main === module) {
    main();
}
