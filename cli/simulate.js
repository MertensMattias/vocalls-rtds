#!/usr/bin/env node

/**
 * CLI Simulate - Run Vocalls / agent-builder call scripts in local simulator
 *
 * Uses core/minimalVocallsCore + vocalls_session_init/vocallsContext (from vocalls-prompt-builder).
 *
 * Usage:
 *   npm run simulate
 *   npm run simulate -- --project my-project --case 1
 *   npm run simulate -- --callScript main --case 13
 *   npm run simulate -- --env prd --mode stub
 */

var fs = require('fs');
var path = require('path');
var vocallsContext = require('../vocalls_session_init/vocallsContext');
var loader = require('../core/loader');

function ensureProjectRoot() {
    var cwd = process.cwd();
    var configPath = path.resolve(cwd, 'env.config.json');
    var cliPath = path.resolve(cwd, 'cli', 'simulate.js');

    if (!fs.existsSync(configPath)) {
        console.error('Error: Must run from project root (directory containing env.config.json)');
        console.error('Current directory:', cwd);
        process.exit(1);
    }
    if (!fs.existsSync(cliPath)) {
        console.error('Error: CLI script not found at expected location');
        process.exit(1);
    }
}

function parseArgs() {
    var args = process.argv.slice(2);
    var options = {
        script: null,
        callScript: null,
        env: null,
        mode: null,
        storage: null,
        project: null,
        listProjects: false,
        caseNumber: null,
        exported: false,
        promptOnly: false,
        language: null,
    };
    var positionals = [];

    for (var i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--script':
                options.script = args[++i];
                break;
            case '--callScript':
            case '--call-script':
                options.callScript = args[++i];
                break;
            case '--env':
                options.env = args[++i];
                break;
            case '--mode':
                options.mode = args[++i];
                break;
            case '--storage':
                options.storage = args[++i];
                break;
            case '--project':
                options.project = args[++i];
                break;
            case '--case':
            case '--caseNumber':
            case '--case-number':
                options.caseNumber = args[++i];
                break;
            case '--exported':
                options.exported = true;
                break;
            case '--list-projects':
                options.listProjects = true;
                break;
            case '--prompt-only':
                options.promptOnly = true;
                break;
            case '--language':
            case '--lang':
                options.language = args[++i];
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
            default:
                if (args[i].startsWith('--')) {
                    console.error('Unknown option:', args[i]);
                    showHelp();
                    process.exit(1);
                } else {
                    positionals.push(args[i]);
                }
        }
    }

    if (!options.project && positionals.length > 0) {
        options.project = positionals[0];
    }
    if (!options.script && !options.callScript) {
        options.callScript = 'main';
    }
    if (options.script && options.callScript) {
        console.error('Error: Cannot specify both --script and --callScript.');
        showHelp();
        process.exit(1);
    }

    if (options.storage === 'mem') {
        options.storage = 'memory';
    }

    return options;
}

function showHelp() {
    console.log('\nVocalls / Agent Builder — Script Simulator\n');
    console.log('Usage: npm run simulate -- [options]\n');
    console.log('Options:');
    console.log('  --script <path>       Absolute/relative path to a .js file');
    console.log(
        '  --callScript <name>   Script in callScripts/ [default: main] (always use "main" — AGENT_*.js files are loaded automatically)'
    );
    console.log('  --project <name>      Project [default: activeProject]');
    console.log('  --exported            Load exported_callscripts/<name>-vocalls-ready.js');
    console.log('  --case <number>       Inject caseNumber for routing (CONFIG / runtimeMapper)');
    console.log('  --list-projects       List projects from env.config.json');
    console.log('  --prompt-only         Print only the system prompt (no diagnostic output)');
    console.log('  --language <lang>     Force language (NL|FR|DE|EN) for simulation context');
    console.log('  --env acc|prd|dvp     Target environment');
    console.log('  --mode real|stub      HTTP mode');
    console.log('  --storage disk|memory|mem');
    console.log('  -h, --help\n');
}

function main() {
    ensureProjectRoot();

    var options = parseArgs();
    var envConfig = loader.loadEnvConfig();

    if (options.listProjects) {
        var projectNames = Object.keys(envConfig.projects || {});
        console.log('Configured projects:');
        if (projectNames.length === 0) {
            console.log('  (none)');
        } else {
            projectNames.forEach(function (name) {
                var projectEntry = envConfig.projects[name] || {};
                var settings = projectEntry.settings || {};
                console.log(
                    '  - ' +
                        name +
                        ' (env: ' +
                        (settings.env || envConfig.env || 'acc') +
                        ', module: ' +
                        (settings.moduleName || envConfig.moduleName || 'agent-builder') +
                        ')'
                );
            });
        }
        process.exit(0);
    }

    var projectDetails = loader.loadProjectConfig(options.project);
    var selectedProjectName = projectDetails
        ? projectDetails.name
        : options.project || envConfig.activeProject || 'example-project';

    var baseSettings = {
        env: envConfig.env || 'acc',
        httpMode: envConfig.httpMode || 'real',
        storageMode: envConfig.storageMode || 'disk',
        moduleName: envConfig.moduleName || 'agent-builder',
    };

    if (projectDetails && projectDetails.settings) {
        baseSettings = projectDetails.settings;
    } else if (
        selectedProjectName &&
        selectedProjectName !== 'example-project' &&
        (!baseSettings.moduleName || baseSettings.moduleName === 'agent-builder')
    ) {
        baseSettings.moduleName = selectedProjectName + '-module';
    }

    if (!projectDetails && options.project) {
        console.warn(
            'Project "' +
                options.project +
                '" not found in env.config.json. Using inferred paths in projects/' +
                options.project +
                '/'
        );
    }

    var callScriptsPath;
    if (projectDetails && projectDetails.config && projectDetails.config.callScriptsPath) {
        callScriptsPath = projectDetails.config.callScriptsPath;
    } else if (selectedProjectName) {
        callScriptsPath = 'projects/' + selectedProjectName + '/callScripts';
    } else {
        callScriptsPath = 'projects/example-project/callScripts';
    }

    var envOverridden = options.env !== null;
    var modeOverridden = options.mode !== null;
    var storageOverridden = options.storage !== null;
    var resolvedEnv = (options.env || baseSettings.env || 'acc').toLowerCase();
    var resolvedHttpMode = (options.mode || baseSettings.httpMode || 'real').toLowerCase();
    var resolvedStorage = (options.storage || baseSettings.storageMode || 'disk').toLowerCase();
    var resolvedModuleName = baseSettings.moduleName || 'agent-builder';
    var resolvedLanguage = options.language ? String(options.language).toUpperCase() : null;

    options.env = resolvedEnv;
    options.mode = resolvedHttpMode;
    options.storage = resolvedStorage;

    var allowedEnvs = ['acc', 'prd', 'dvp'];
    if (allowedEnvs.indexOf(resolvedEnv) === -1) {
        console.warn('Unknown environment "' + resolvedEnv + '", defaulting to acc.');
        resolvedEnv = 'acc';
        options.env = 'acc';
    }

    var allowedModes = ['real', 'stub'];
    if (allowedModes.indexOf(resolvedHttpMode) === -1) {
        console.warn('Unknown HTTP mode "' + resolvedHttpMode + '", defaulting to real.');
        resolvedHttpMode = 'real';
        options.mode = 'real';
    }

    var allowedStorage = ['disk', 'memory'];
    if (allowedStorage.indexOf(resolvedStorage) === -1) {
        console.warn('Unknown storage mode "' + resolvedStorage + '", defaulting to disk.');
        resolvedStorage = 'disk';
        options.storage = 'disk';
    }

    if (resolvedLanguage) {
        var allowedLanguages = ['NL', 'FR', 'DE', 'EN'];
        if (allowedLanguages.indexOf(resolvedLanguage) === -1) {
            console.warn(
                'Unknown language "' + resolvedLanguage + '", ignoring --language override.'
            );
            resolvedLanguage = null;
        }
    }

    if (!options.promptOnly) {
        console.log('Vocalls Script Simulator');
        console.log('========================');
        if (options.callScript) {
            console.log('Project:', selectedProjectName);
            console.log('Call Script:', options.callScript + ' (from ' + callScriptsPath + '/)');
        } else {
            console.log('Script:', options.script);
        }
        if (options.exported) {
            console.log('Mode: exported bundle');
        }
        console.log('Environment:', resolvedEnv + (envOverridden ? '' : ' (project default)'));
        console.log('HTTP Mode:', resolvedHttpMode + (modeOverridden ? '' : ' (project default)'));
        console.log(
            'Storage Mode:',
            resolvedStorage + (storageOverridden ? '' : ' (project default)')
        );
        console.log('Module Name:', resolvedModuleName);
        if (resolvedLanguage) {
            console.log('Language Override:', resolvedLanguage);
        }
        console.log();
    }

    var scriptPath;
    if (options.exported) {
        var exportedDir =
            projectDetails && projectDetails.config && projectDetails.config.exportedPath
                ? projectDetails.config.exportedPath
                : 'projects/' + selectedProjectName + '/exported_callscripts';
        var exportedScriptName = options.callScript || 'main';
        scriptPath = path.resolve(
            process.cwd(),
            exportedDir,
            exportedScriptName + '-vocalls-ready.js'
        );
        if (!fs.existsSync(scriptPath)) {
            console.error('Error: Exported bundle not found:', scriptPath);
            console.error('Run: npm run export -- --project ' + selectedProjectName);
            process.exit(1);
        }
    } else if (options.callScript) {
        scriptPath = path.resolve(process.cwd(), callScriptsPath, options.callScript + '.js');
        if (!fs.existsSync(scriptPath)) {
            console.error('Error: Call script not found:', scriptPath);
            console.error('');
            console.error('Available scripts in', callScriptsPath + ':');
            try {
                var files = fs
                    .readdirSync(path.resolve(process.cwd(), callScriptsPath))
                    .filter(function (f) {
                        return f.endsWith('.js');
                    });
                if (files.length > 0) {
                    files.forEach(function (f) {
                        console.error('  -', f.replace('.js', ''));
                    });
                } else {
                    console.error('  (no .js files found)');
                }
            } catch (e) {
                console.error('  (could not read directory)');
            }
            process.exit(1);
        }
    } else {
        scriptPath = path.resolve(process.cwd(), options.script);
        if (!fs.existsSync(scriptPath)) {
            console.error('Error: Script file not found:', scriptPath);
            process.exit(1);
        }
    }

    try {
        var seed = vocallsContext.createDefaultSeed('inbound', {
            session: {
                variables: {
                    VOCALLS_ENV: resolvedEnv,
                    SIMULATION_MODE: resolvedHttpMode,
                },
            },
            settings: {
                moduleName: resolvedModuleName,
                defaultEnvironment: resolvedEnv,
            },
        });

        var sandbox = vocallsContext.buildSessionContext(seed, {
            httpMode: resolvedHttpMode,
            storageMode: resolvedStorage,
            logging: !options.promptOnly,
            projectSettings: {
                env: baseSettings.env,
                httpMode: baseSettings.httpMode,
                storageMode: baseSettings.storageMode,
                moduleName: resolvedModuleName,
            },
            projectName: selectedProjectName,
            environment: resolvedEnv,
        });

        if (resolvedLanguage) {
            sandbox.context = sandbox.context || {};
            sandbox.context.language = resolvedLanguage;
        }

        if (!options.promptOnly) {
            console.log('Session context created');
        }

        // Silence sandbox logging functions when --prompt-only is set
        // (logInfo/logWarn in the core always log; Logger respects the logging flag already)
        if (options.promptOnly) {
            var noop = function () {};
            sandbox.logInfo = noop;
            sandbox.logWarn = noop;
        }

        if (options.caseNumber !== null && options.caseNumber !== undefined) {
            var rawCase = String(options.caseNumber).trim();
            var parsedCase = parseInt(rawCase, 10);
            var caseValue =
                !isNaN(parsedCase) && String(parsedCase) === rawCase ? parsedCase : rawCase;
            // Pre-inject both segmentState and _apiResult before scripts run.
            // globalVariables.js guards both — pre-injected values survive.
            sandbox.segmentState = { currentSegment: caseValue };
            sandbox._apiResult = {
                caseNumber: caseValue,
                options: { caseNumber: caseValue },
            };
            if (!options.promptOnly) {
                console.log('Injected case:', caseValue);
            }
        }

        // main.js expects global _apiResult; VM throws ReferenceError if unset.
        if (sandbox._apiResult === undefined) {
            sandbox._apiResult = null;
        }

        sandbox.__systemPromptForDisplay = null;
        sandbox.base_prompt = '';
        sandbox.opening = '';
        sandbox.varObj = {};

        var userScript = options.exported
            ? path.relative(process.cwd(), scriptPath)
            : options.callScript
              ? callScriptsPath + '/' + options.callScript + '.js'
              : options.script;

        sandbox = loader.executeScripts({
            sandbox: sandbox,
            userScript: userScript,
            validateScripts: !options.exported,
            projectName: selectedProjectName,
            bundledMode: options.exported || false,
        });

        if (!options.promptOnly) {
            console.log('Script execution completed');
        }

        // Guard: warn if CONFIG appears unpopulated (persona name empty or placeholder)
        var configKeys = Object.keys(sandbox).filter(function (k) {
            return /^AGENT_[A-Z]/.test(k) && sandbox[k] && typeof sandbox[k] === 'object';
        });
        if (configKeys.length > 0) {
            var warnedUnpopulated = false;
            configKeys.forEach(function (configKey) {
                if (warnedUnpopulated) return;
                var cfg = sandbox[configKey];
                var persona = cfg.persona;
                if (!persona) return;
                Object.keys(persona).forEach(function (lang) {
                    if (warnedUnpopulated) return;
                    var name = persona[lang] && persona[lang].name;
                    if (
                        !name ||
                        name === '' ||
                        /^REPLACE_WITH_/i.test(String(name)) ||
                        /^\{/.test(String(name))
                    ) {
                        console.warn(
                            '\nWarning: Agent config appears to be unpopulated (persona name is empty or a placeholder).'
                        );
                        console.warn(
                            'Add callScripts/AGENT_*.js or build an agent config before simulating this case.\n'
                        );
                        warnedUnpopulated = true;
                    }
                });
            });
        }

        if (!options.promptOnly && sandbox.__systemPromptForDisplay) {
            console.log('\n--- System prompt ---\n');
            console.log(sandbox.__systemPromptForDisplay);
            console.log('\n--- End system prompt ---\n');
        }

        if (sandbox.base_prompt) {
            if (options.promptOnly) {
                process.stdout.write(sandbox.base_prompt + '\n');
            } else {
                console.log(
                    '\nSystem Prompt (' +
                        (sandbox.context && sandbox.context.language) +
                        ')\n' +
                        '---\n'
                );
                console.log(sandbox.base_prompt);
            }
        }
        if (!options.promptOnly && sandbox.opening) {
            console.log('\nOpening\n---\n');
            console.log(sandbox.opening);
        }
    } catch (error) {
        console.error('Simulator error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
