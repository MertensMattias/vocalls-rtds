#!/usr/bin/env node

/**
 * CLI Init - Create a new project
 *
 * Usage: npm run init
 *        npm run init -- --name my-project --type agent-builder \
 *                        --primary-language EN --languages "EN,NL,FR,DE"
 *
 * Wizard prompts:
 * 1. Project name (slug, no spaces)
 * 2. Project type: normal | agent-builder
 * 3. Primary language: NL | FR | DE | EN (default NL)
 * 4. Languages: comma-separated subset (default NL,FR,DE,EN)
 *
 * Creates project directory structure and registers in env.config.json
 * with primaryLanguage + languages written atomically into both
 * env.config.json and projects/<name>/brief.md (via REPLACE_WITH_PRIMARY_LANGUAGE
 * and REPLACE_WITH_LANGUAGES sentinels in the brief template). This prevents
 * the brief↔state primary-language conflict class (PI-003).
 *
 * For agent-builder: copies agentEngine.js, runtimeMapper.js, globalCode.js, globalVariables.js, main.test.js
 * Per-agent agent config lives in callScripts/AGENT_<agentId>.js (written by the pipeline, not by init).
 * callScripts/main.js is the runtime init block — user-owned, written once at init.
 */

var fs = require('fs');
var path = require('path');
var readline = require('readline');
var loader = require('../core/loader');

var CWD = process.cwd();

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function copyFile(src, dest) {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
}

var DEFAULT_PRIMARY_LANGUAGE = 'NL';
var DEFAULT_LANGUAGES = ['NL', 'FR', 'DE', 'EN'];
var VALID_LANGUAGES = ['NL', 'FR', 'DE', 'EN'];

function isValidLanguage(lang) {
    return VALID_LANGUAGES.indexOf(lang) !== -1;
}

function parseLanguagesList(raw) {
    if (!raw) return DEFAULT_LANGUAGES.slice();
    return String(raw)
        .split(',')
        .map(function (s) {
            return s.trim().toUpperCase();
        })
        .filter(function (s) {
            return s.length > 0;
        });
}

function createProject(name, type, primaryLanguage, languages) {
    var projectDir = path.join(CWD, 'projects', name);
    ensureDir(path.join(projectDir, 'callScripts'));
    ensureDir(path.join(projectDir, 'globalLibraries', 'active'));
    ensureDir(path.join(projectDir, 'callScript_init'));
    ensureDir(path.join(projectDir, 'exported_callscripts'));
    ensureDir(path.join(projectDir, 'tests'));
    ensureDir(path.join(projectDir, '.vocalls'));
    ensureDir(path.join(projectDir, 'sources'));

    // .gitkeep in exported_callscripts and sources
    fs.writeFileSync(path.join(projectDir, 'exported_callscripts', '.gitkeep'), '');
    fs.writeFileSync(
        path.join(projectDir, 'sources', '.gitkeep'),
        '# Drop your brief source files here (.vsdx, .pdf, .json Lucidchart export, .md, .txt).\n' +
            '# /vocalls-brief auto-discovers files in this directory when invoked with no arguments.\n'
    );

    // .vocalls/ stays empty at init. `bin/vocalls.js` creates state.json + context.md
    // lazily on first run via core/state-io.js#init. Pre-seeding with legacy
    // handover.json was removed when the pipeline collapsed to a single state.json.

    var templatesDir = path.join(CWD, 'templates');

    // main.js: from templates/callScripts/main.js
    var mainTemplate = path.join(templatesDir, 'callScripts', 'main.js');
    if (fs.existsSync(mainTemplate)) {
        var mainDest = path.join(projectDir, 'callScripts', 'main.js');
        var mainContent = fs
            .readFileSync(mainTemplate, 'utf8')
            .replace(/REPLACE_WITH_PROJECT_NAME/g, name);
        fs.writeFileSync(mainDest, mainContent, 'utf8');
        console.log('  Copied templates/callScripts/main.js → callScripts/');
    } else {
        fs.writeFileSync(
            path.join(projectDir, 'callScripts', 'main.js'),
            '// Placeholder main.js — run `node bin/vocalls.js build --project ' +
                name +
                '` to assemble AGENT_*.js\n',
            'utf8'
        );
    }

    if (type === 'agent-builder') {
        // Copy all files from templates/globalLibraries/active/
        var libSrcDir = path.join(templatesDir, 'globalLibraries', 'active');
        if (fs.existsSync(libSrcDir)) {
            fs.readdirSync(libSrcDir).forEach(function (filename) {
                var src = path.join(libSrcDir, filename);
                var dest = path.join(projectDir, 'globalLibraries', 'active', filename);
                if (fs.statSync(src).isFile()) {
                    copyFile(src, dest);
                    console.log(
                        '  Copied templates/globalLibraries/active/' +
                            filename +
                            ' → globalLibraries/active/'
                    );
                }
            });
        } else {
            console.warn(
                '  Warning: templates/globalLibraries/active/ not found — copy library files manually'
            );
        }
    }

    // Copy init templates from templates/callScript_init/
    ['globalCode.js', 'globalVariables.js'].forEach(function (filename) {
        var src = path.join(templatesDir, 'callScript_init', filename);
        var dest = path.join(projectDir, 'callScript_init', filename);
        if (fs.existsSync(src)) {
            var content = fs.readFileSync(src, 'utf8').replace(/REPLACE_WITH_PROJECT_NAME/g, name);
            fs.writeFileSync(dest, content, 'utf8');
            console.log('  Copied templates/callScript_init/' + filename + ' → callScript_init/');
        }
    });

    // Copy test template from templates/tests/
    var testSrc = path.join(templatesDir, 'tests', 'main.test.js');
    if (fs.existsSync(testSrc)) {
        var testContent = fs
            .readFileSync(testSrc, 'utf8')
            .replace(/REPLACE_WITH_PROJECT_NAME/g, name);
        fs.writeFileSync(path.join(projectDir, 'tests', 'main.test.js'), testContent, 'utf8');
        console.log('  Created tests/main.test.js');
    }

    // Copy brief template from templates/brief.md
    var briefSrc = path.join(templatesDir, 'brief.md');
    if (fs.existsSync(briefSrc)) {
        var briefContent = fs
            .readFileSync(briefSrc, 'utf8')
            .replace(/REPLACE_WITH_PROJECT_NAME/g, name)
            .replace(/REPLACE_WITH_PRIMARY_LANGUAGE/g, primaryLanguage)
            .replace(/REPLACE_WITH_LANGUAGES/g, languages.join(', '));
        fs.writeFileSync(path.join(projectDir, 'brief.md'), briefContent, 'utf8');
        console.log('  Copied templates/brief.md \u2192 brief.md');
        console.log(
            '  Note: brief.md contains placeholder fields — fill them in before running /vocalls-build.'
        );
    }

    // Register in env.config.json
    var configPath = path.join(CWD, 'env.config.json');
    var envConfig = loader.loadEnvConfig();
    envConfig.projects[name] = {
        callScriptInitPath: 'projects/' + name + '/callScript_init',
        callScriptsPath: 'projects/' + name + '/callScripts',
        globalLibrariesPath: 'projects/' + name + '/globalLibraries/active',
        exportedPath: 'projects/' + name + '/exported_callscripts',
        projectType: type,
        primaryLanguage: primaryLanguage,
        languages: languages.slice(),
        settings: {
            env: 'acc',
            httpMode: 'real',
            storageMode: 'disk',
            moduleName: name + '-module',
        },
        metadata: {
            created: new Date().toISOString().split('T')[0],
            initializedBy: 'npm run init',
            wizardVersion: '1.0',
        },
    };
    envConfig.activeProject = name;
    fs.writeFileSync(configPath, JSON.stringify(envConfig, null, 2), 'utf8');

    console.log('\n✅ Project "' + name + '" created successfully!');
    console.log('Active project set to: ' + name);
    console.log('');
    if (type === 'agent-builder') {
        console.log('Next steps:');
        console.log('  1. Provide a brief — pick one:');
        console.log(
            '     a) Edit projects/' + name + '/brief.md directly (free-form markdown).'
        );
        console.log(
            '     b) Drop source files into projects/' +
                name +
                '/sources/ (.vsdx Visio,'
        );
        console.log(
            '        .pdf, .json Lucidchart export, .md/.txt). Then run /vocalls-brief from'
        );
        console.log(
            '        Claude Code with NO arguments — it auto-discovers files in sources/'
        );
        console.log(
            '        and writes brief.md. Or pass file paths explicitly: /vocalls-brief <file>.'
        );
        console.log('');
        console.log('  2. Drive the pipeline:');
        console.log(
            '       node bin/vocalls.js build --project ' + name
        );
        console.log(
            '     (or equivalently: npm run vocalls -- build --project ' + name + ')'
        );
        console.log(
            '     The orchestrator runs intake → scenarioDesign → configBuild → validate → translate'
        );
        console.log(
            '     and writes callScripts/AGENT_*.js. callScripts/main.js is the runtime init'
        );
        console.log('     block and stays user-owned across pipeline runs.');
        console.log('');
        console.log('  3. Test the assembled config:');
        console.log('       npm run simulate -- --project ' + name + ' --case 1');
    } else {
        console.log('Next steps:');
        console.log('  1. Edit projects/' + name + '/callScripts/main.js');
        console.log('  2. npm run simulate');
    }
}

function prompt(rl, question) {
    return new Promise(function (resolve) {
        rl.question(question, resolve);
    });
}

function isValidSlug(name) {
    return /^[a-z0-9][a-z0-9\-]*$/.test(name);
}

/**
 * Non-interactive: npm run init -- --name my-project --type agent-builder
 */
function parseArgs() {
    var args = process.argv.slice(2);
    var out = { name: null, type: null, primaryLanguage: null, languages: null };
    for (var i = 0; i < args.length; i++) {
        if (args[i] === '--name') {
            out.name = args[++i];
        } else if (args[i] === '--type') {
            out.type = args[++i];
        } else if (args[i] === '--primary-language') {
            out.primaryLanguage = args[++i];
        } else if (args[i] === '--languages') {
            out.languages = args[++i];
        }
    }
    return out;
}

function main() {
    var envConfig = loader.loadEnvConfig();
    var flags = parseArgs();

    if (flags.name) {
        var name = String(flags.name).trim().toLowerCase();
        var type = (flags.type && String(flags.type).trim()) || 'agent-builder';
        var primaryLanguage =
            (flags.primaryLanguage && String(flags.primaryLanguage).trim().toUpperCase()) ||
            DEFAULT_PRIMARY_LANGUAGE;
        var languages = parseLanguagesList(flags.languages);
        if (!isValidSlug(name)) {
            console.error('Invalid name. Use lowercase letters, digits, hyphens. No spaces.');
            process.exit(1);
        }
        if (envConfig.projects[name]) {
            console.error('Project "' + name + '" already exists.');
            process.exit(1);
        }
        if (type !== 'normal' && type !== 'agent-builder') {
            console.error('Unknown type "' + type + '". Use "normal" or "agent-builder".');
            process.exit(1);
        }
        if (!isValidLanguage(primaryLanguage)) {
            console.error(
                'Invalid --primary-language "' +
                    primaryLanguage +
                    '". Must be one of: ' +
                    VALID_LANGUAGES.join(', ') +
                    '.'
            );
            process.exit(1);
        }
        for (var li = 0; li < languages.length; li++) {
            if (!isValidLanguage(languages[li])) {
                console.error(
                    'Invalid language in --languages: "' +
                        languages[li] +
                        '". Must be a subset of: ' +
                        VALID_LANGUAGES.join(', ') +
                        '.'
                );
                process.exit(1);
            }
        }
        if (languages.indexOf(primaryLanguage) === -1) {
            console.error(
                '--primary-language "' +
                    primaryLanguage +
                    '" must be included in --languages "' +
                    languages.join(',') +
                    '".'
            );
            process.exit(1);
        }
        console.log('Agent Builder — create project (non-interactive)');
        console.log(
            'Project: ' +
                name +
                '  Type: ' +
                type +
                '  Primary: ' +
                primaryLanguage +
                '  Languages: ' +
                languages.join(', ')
        );
        console.log('');
        createProject(name, type, primaryLanguage, languages);
        return;
    }

    var rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.log('Agent Builder — New Project Wizard');
    console.log('====================================');
    console.log('');

    prompt(rl, 'Project name (lowercase, hyphens ok, e.g. lumina-billing): ')
        .then(function (rawName) {
            var name = rawName.trim().toLowerCase();
            if (!isValidSlug(name)) {
                console.error('Invalid name. Use lowercase letters, digits, hyphens. No spaces.');
                rl.close();
                process.exit(1);
            }
            if (envConfig.projects[name]) {
                console.error('Project "' + name + '" already exists.');
                rl.close();
                process.exit(1);
            }

            return prompt(rl, 'Project type (normal | agent-builder) [agent-builder]: ').then(
                function (rawType) {
                    var type = rawType.trim() || 'agent-builder';
                    if (type !== 'normal' && type !== 'agent-builder') {
                        rl.close();
                        console.error(
                            'Unknown type "' + type + '". Use "normal" or "agent-builder".'
                        );
                        process.exit(1);
                    }
                    return prompt(
                        rl,
                        'Primary language (NL | FR | DE | EN) [' +
                            DEFAULT_PRIMARY_LANGUAGE +
                            ']: '
                    ).then(function (rawPrimary) {
                        var primaryLanguage =
                            rawPrimary.trim().toUpperCase() || DEFAULT_PRIMARY_LANGUAGE;
                        if (!isValidLanguage(primaryLanguage)) {
                            rl.close();
                            console.error(
                                'Invalid primary language "' +
                                    primaryLanguage +
                                    '". Must be one of: ' +
                                    VALID_LANGUAGES.join(', ') +
                                    '.'
                            );
                            process.exit(1);
                        }
                        return prompt(
                            rl,
                            'Languages (comma-separated subset of NL,FR,DE,EN) [' +
                                DEFAULT_LANGUAGES.join(',') +
                                ']: '
                        ).then(function (rawLangs) {
                            rl.close();
                            var languages = parseLanguagesList(rawLangs);
                            for (var li = 0; li < languages.length; li++) {
                                if (!isValidLanguage(languages[li])) {
                                    console.error(
                                        'Invalid language "' +
                                            languages[li] +
                                            '". Must be a subset of: ' +
                                            VALID_LANGUAGES.join(', ') +
                                            '.'
                                    );
                                    process.exit(1);
                                }
                            }
                            if (languages.indexOf(primaryLanguage) === -1) {
                                console.error(
                                    'Primary language "' +
                                        primaryLanguage +
                                        '" must be included in languages list "' +
                                        languages.join(',') +
                                        '".'
                                );
                                process.exit(1);
                            }
                            createProject(name, type, primaryLanguage, languages);
                        });
                    });
                }
            );
        })
        .catch(function (err) {
            console.error('Error: ' + err.message);
            rl.close();
            process.exit(1);
        });
}

if (require.main === module) {
    main();
}
