#!/usr/bin/env node

/**
 * CLI Export - Bundle project scripts for Vocalls deployment
 *
 * Usage:
 *   npm run export
 *   npm run export -- --project my-project
 *   npm run export -- --callScript main
 */

var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawnSync;
var sandbox = require('../core/sandbox');
var loader = require('../core/loader');

function ensureProjectRoot() {
    if (!fs.existsSync(path.resolve(process.cwd(), 'env.config.json'))) {
        console.error('Error: Must run from project root');
        process.exit(1);
    }
}

function parseArgs() {
    var args = process.argv.slice(2);
    var opts = { callScript: 'main', project: null, output: null, noValidate: false };
    var positionals = [];
    for (var i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--callScript':
            case '--call-script':
                opts.callScript = args[++i];
                break;
            case '--project':
                opts.project = args[++i];
                break;
            case '--output':
                opts.output = args[++i];
                break;
            case '--no-validate':
                opts.noValidate = true;
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
            default:
                if (!args[i].startsWith('--')) {
                    positionals.push(args[i]);
                }
        }
    }
    if (!opts.project && positionals.length > 0) {
        opts.project = positionals[0];
    }
    return opts;
}

function showHelp() {
    console.log('\nVocalls Code Export Tool\n');
    console.log('Usage: npm run export -- [options]\n');
    console.log('  --project <name>      Project name [default: activeProject]');
    console.log('  --callScript <name>   Script name [default: main]');
    console.log('  --output <path>       Output path');
    console.log('  --no-validate         Skip validation');
    console.log('  -h, --help            Show help\n');
}

var SECTION_NAMES = {
    init: 'INIT UTILITIES',
    library: 'GLOBAL LIBRARIES',
    userScript: 'CALL SCRIPT',
};

function makeBanner(num, title) {
    return (
        '/* ============================================================\n * SECTION ' +
        num +
        ' — ' +
        title +
        '\n * ============================================================ */'
    );
}

function bundle(scriptPath, projectName) {
    var userScript = path.relative(process.cwd(), scriptPath);
    var order = loader.getBundleOrder(projectName, userScript);
    if (!order.length) {
        return fs.readFileSync(scriptPath, 'utf8');
    }
    var parts = [];
    var prevType = null;
    var n = 0;
    order.forEach(function (item) {
        if (item.type !== prevType) {
            n++;
            if (parts.length) {
                parts.push('');
            }
            parts.push(makeBanner(n, SECTION_NAMES[item.type] || item.type.toUpperCase()));
            parts.push('');
            prevType = item.type;
        }
        parts.push('/* ' + item.fileName + ' */');
        parts.push(fs.readFileSync(item.path, 'utf8'));
        parts.push('');
    });
    return parts.join('\n');
}

function main() {
    ensureProjectRoot();
    var opts = parseArgs();
    var projectDetails = loader.loadProjectConfig(opts.project);
    var envConfig = loader.loadEnvConfig();
    var projectName = projectDetails
        ? projectDetails.name
        : opts.project || envConfig.activeProject || 'example-project';

    var callScriptsPath =
        projectDetails && projectDetails.config && projectDetails.config.callScriptsPath
            ? projectDetails.config.callScriptsPath
            : 'projects/' + projectName + '/callScripts';
    var scriptPath = path.resolve(process.cwd(), callScriptsPath, opts.callScript + '.js');

    console.log('Vocalls Export Tool');
    console.log('===================');
    console.log('Project: ' + projectName);
    console.log('Script:  ' + opts.callScript);

    if (!fs.existsSync(scriptPath)) {
        console.error('Script not found: ' + scriptPath);
        process.exit(1);
    }

    var exportedDir =
        projectDetails && projectDetails.config && projectDetails.config.exportedPath
            ? projectDetails.config.exportedPath
            : 'projects/' + projectName + '/exported_callscripts';

    var outputPath = opts.output
        ? path.resolve(process.cwd(), opts.output)
        : path.resolve(process.cwd(), exportedDir, opts.callScript + '-vocalls-ready.js');

    console.log('Output:  ' + path.relative(process.cwd(), outputPath));
    console.log('');

    var code = bundle(scriptPath, projectName);
    // let/const → var transformation
    code = code.replace(/\b(let|const)\s+/g, 'var ');

    var header =
        '/*\n * Generated for Vocalls deployment\n * Timestamp: ' +
        new Date().toISOString() +
        '\n * Do not edit manually.\n */\n\n';
    code = header + code;

    if (!opts.noValidate) {
        var result = sandbox.validateConstraints(code, 'main.js');
        if (!result.ok) {
            console.error('Validation failed:');
            result.errors.forEach(function (e) {
                console.error('  ' + e.rule + ' at line ' + e.line + ' — ' + e.message);
            });
            console.error('Use --no-validate to skip.');
            process.exit(1);
        }
        console.log('✓ Validation passed');
    }

    var outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, code, 'utf8');
    console.log('✓ Exported to: ' + path.relative(process.cwd(), outputPath));
    console.log('');

    // Auto-verify: simulate the exported bundle
    console.log('Verifying exported bundle...');
    var sim = spawn(
        process.execPath,
        [
            'cli/simulate.js',
            '--exported',
            '--project',
            projectName,
            '--callScript',
            opts.callScript,
        ],
        { stdio: 'inherit', cwd: process.cwd() }
    );
    if (sim.status !== 0) {
        console.error('Exported bundle failed simulation. Fix errors before deploying.');
        process.exit(sim.status || 1);
    }
}

if (require.main === module) {
    main();
}
