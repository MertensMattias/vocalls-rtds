#!/usr/bin/env node

/**
 * CLI Delete - Remove a project from the registry (and optionally its files)
 *
 * Usage: npm run delete -- <project-name>
 */

var fs = require('fs');
var path = require('path');
var loader = require('../core/loader');

function main() {
    var args = process.argv.slice(2);
    var projectName = args[0];
    if (!projectName) {
        console.error('Usage: npm run delete -- <project-name>');
        process.exit(1);
    }
    var configPath = path.resolve(process.cwd(), 'env.config.json');
    var envConfig = loader.loadEnvConfig();
    if (!envConfig.projects[projectName]) {
        console.error('Project "' + projectName + '" not found');
        process.exit(1);
    }
    delete envConfig.projects[projectName];
    if (envConfig.activeProject === projectName) {
        envConfig.activeProject = null;
    }
    fs.writeFileSync(configPath, JSON.stringify(envConfig, null, 2), 'utf8');
    console.log('Removed "' + projectName + '" from registry.');
    console.log('Note: project files at projects/' + projectName + '/ were NOT deleted.');
}

if (require.main === module) {
    main();
}
