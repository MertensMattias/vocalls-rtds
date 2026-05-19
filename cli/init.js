#!/usr/bin/env node

/**
 * CLI Init - Create a new project
 *
 * Usage: npm run init
 *        npm run init -- --name my-project --primary-language EN --languages "EN,NL"
 *
 * Creates projects/<name>/ from templates/ and registers in env.config.json.
 */

var fs = require('fs');
var path = require('path');
var readline = require('readline');
var loader = require('../core/loader');

var CWD = process.cwd();

var DEFAULT_PRIMARY_LANGUAGE = 'NL';
var DEFAULT_LANGUAGES = ['NL', 'FR', 'DE', 'EN'];
var VALID_LANGUAGES = ['NL', 'FR', 'DE', 'EN'];

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

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

function createProject(name, primaryLanguage, languages) {
    var projectDir = path.join(CWD, 'projects', name);
    ensureDir(path.join(projectDir, 'callScripts'));
    ensureDir(path.join(projectDir, 'globalLibraries', 'active'));
    ensureDir(path.join(projectDir, 'callScript_init'));
    ensureDir(path.join(projectDir, 'exported_callscripts'));
    ensureDir(path.join(projectDir, 'tests'));
    ensureDir(path.join(projectDir, '.vocalls'));

    fs.writeFileSync(path.join(projectDir, 'exported_callscripts', '.gitkeep'), '');
    var activeLibDir = path.join(projectDir, 'globalLibraries', 'active');
    if (!fs.existsSync(path.join(activeLibDir, '.gitkeep'))) {
        fs.writeFileSync(path.join(activeLibDir, '.gitkeep'), '');
    }

    var templatesDir = path.join(CWD, 'templates');
    var replaceName = function (content) {
        return content.replace(/REPLACE_WITH_PROJECT_NAME/g, name);
    };

    var mainTemplate = path.join(templatesDir, 'callScripts', 'main.js');
    if (fs.existsSync(mainTemplate)) {
        fs.writeFileSync(
            path.join(projectDir, 'callScripts', 'main.js'),
            replaceName(fs.readFileSync(mainTemplate, 'utf8')),
            'utf8'
        );
        console.log('  Copied templates/callScripts/main.js → callScripts/');
    }

    ['globalCode.js', 'globalVariables.js'].forEach(function (filename) {
        var src = path.join(templatesDir, 'callScript_init', filename);
        var dest = path.join(projectDir, 'callScript_init', filename);
        if (fs.existsSync(src)) {
            fs.writeFileSync(dest, replaceName(fs.readFileSync(src, 'utf8')), 'utf8');
            console.log('  Copied templates/callScript_init/' + filename + ' → callScript_init/');
        }
    });

    var testSrc = path.join(templatesDir, 'tests', 'main.test.js');
    if (fs.existsSync(testSrc)) {
        fs.writeFileSync(
            path.join(projectDir, 'tests', 'main.test.js'),
            replaceName(fs.readFileSync(testSrc, 'utf8')),
            'utf8'
        );
        console.log('  Created tests/main.test.js');
    }

    var envConfig = loader.loadEnvConfig();
    envConfig.projects[name] = {
        callScriptInitPath: 'projects/' + name + '/callScript_init',
        callScriptsPath: 'projects/' + name + '/callScripts',
        globalLibrariesPath: 'projects/' + name + '/globalLibraries/active',
        exportedPath: 'projects/' + name + '/exported_callscripts',
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
            wizardVersion: '2.0',
        },
    };
    envConfig.activeProject = name;
    fs.writeFileSync(
        path.join(CWD, 'env.config.json'),
        JSON.stringify(envConfig, null, 2),
        'utf8'
    );

    console.log('\n✅ Project "' + name + '" created successfully!');
    console.log('Active project set to: ' + name);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Edit projects/' + name + '/callScripts/main.js');
    console.log('  2. npm run simulate -- --project ' + name);
}

function prompt(rl, question) {
    return new Promise(function (resolve) {
        rl.question(question, resolve);
    });
}

function isValidSlug(name) {
    return /^[a-z0-9][a-z0-9\-]*$/.test(name);
}

function parseArgs() {
    var args = process.argv.slice(2);
    var out = { name: null, primaryLanguage: null, languages: null };
    for (var i = 0; i < args.length; i++) {
        if (args[i] === '--name') {
            out.name = args[++i];
        } else if (args[i] === '--primary-language') {
            out.primaryLanguage = args[++i];
        } else if (args[i] === '--languages') {
            out.languages = args[++i];
        }
    }
    return out;
}

function validateLanguages(primaryLanguage, languages) {
    if (!isValidLanguage(primaryLanguage)) {
        console.error(
            'Invalid primary language "' +
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
}

function main() {
    var envConfig = loader.loadEnvConfig();
    var flags = parseArgs();

    if (flags.name) {
        var name = String(flags.name).trim().toLowerCase();
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
        validateLanguages(primaryLanguage, languages);
        console.log(
            'Create project: ' +
                name +
                '  Primary: ' +
                primaryLanguage +
                '  Languages: ' +
                languages.join(', ')
        );
        console.log('');
        createProject(name, primaryLanguage, languages);
        return;
    }

    var rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.log('Vocalls — New Project');
    console.log('=====================');
    console.log('');

    prompt(rl, 'Project name (lowercase, hyphens ok): ')
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
            return prompt(
                rl,
                'Primary language (NL | FR | DE | EN) [' + DEFAULT_PRIMARY_LANGUAGE + ']: '
            ).then(function (rawPrimary) {
                var primaryLanguage =
                    rawPrimary.trim().toUpperCase() || DEFAULT_PRIMARY_LANGUAGE;
                return prompt(
                    rl,
                    'Languages (comma-separated, NL,FR,DE,EN) [' +
                        DEFAULT_LANGUAGES.join(',') +
                        ']: '
                ).then(function (rawLangs) {
                    rl.close();
                    var languages = parseLanguagesList(rawLangs);
                    validateLanguages(primaryLanguage, languages);
                    createProject(name, primaryLanguage, languages);
                });
            });
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
