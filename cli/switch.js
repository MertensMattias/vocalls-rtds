#!/usr/bin/env node

/**
 * CLI Switch - Change active project
 *
 * Usage: npm run switch -- <project-name>
 */

var fs = require('fs');
var path = require('path');
var loader = require('../core/loader');

function main() {
    var args = process.argv.slice(2);
    var projectName = args[0];
    if (!projectName) {
        var envConfig = loader.loadEnvConfig();
        var names = Object.keys(envConfig.projects || {});
        console.log('Usage: npm run switch -- <project-name>');
        console.log('Available: ' + (names.length ? names.join(', ') : '(none)'));
        process.exit(1);
    }
    var configPath = path.resolve(process.cwd(), 'env.config.json');
    var envConfig = loader.loadEnvConfig();
    if (!envConfig.projects[projectName]) {
        console.error('Project "' + projectName + '" not found in env.config.json');
        console.error('Available: ' + Object.keys(envConfig.projects).join(', '));
        process.exit(1);
    }
    envConfig.activeProject = projectName;
    fs.writeFileSync(configPath, JSON.stringify(envConfig, null, 2), 'utf8');
    console.log('Active project set to: ' + projectName);
}

if (require.main === module) {
    main();
}
