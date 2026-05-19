/**
 * Agent Builder Script Loader
 *
 * Loads scripts in the correct order with ES5.1 transformation and validation.
 * Supports configurable paths via env.config.json for multi-project support.
 *
 * Loading Order (maintained regardless of paths):
 * 1. callScript_init/globalCode.js - Base utilities
 * 2. callScript_init/globalVariables.js - Global variables
 * 3. globalLibraries/active/* - Libraries in REVERSE alphabetical order
 * 4. callScripts/AGENT_*.js - Per-agent agent config objects (alphabetical order)
 * 5. User script (main.js) - Runtime init block
 *
 * Path Resolution:
 * - Reads active project from env.config.json
 * - Uses project-specific paths if configured
 * - Falls back to environment defaults if project config missing
 * - Falls back to hardcoded defaults if config file missing (backward compatibility)
 *
 * Project Switching:
 * - Active project determined by env.config.json "activeProject" field
 * - Can be overridden via CLI --project flag (handled by simulate.js)
 *
 * @module loader
 */

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var core = require('./minimalVocallsCore');

/**
 * Simple ES5.1 transformer - converts let/const to var
 */
function transformES5(code) {
    return code.replace(/\blet\s+/g, 'var ').replace(/\bconst\s+/g, 'var ');
}

/**
 * Load environment configuration from env.config.json
 */
function loadEnvConfig() {
    var configPath = path.resolve(process.cwd(), 'env.config.json');
    var defaultConfig = {
        httpMode: 'real',
        storageMode: 'disk',
        env: 'acc',
        moduleName: 'agent-builder',
        environment: {
            examplesPath: 'examples',
        },
        projects: {},
        activeProject: null,
    };

    try {
        if (fs.existsSync(configPath)) {
            var configContent = fs.readFileSync(configPath, 'utf8');
            var parsed = JSON.parse(configContent);
            if (!parsed.projects || typeof parsed.projects !== 'object') {
                parsed.projects = {};
            }
            if (!parsed.environment || typeof parsed.environment !== 'object') {
                parsed.environment = { examplesPath: 'examples' };
            }
            if (!parsed.httpMode) {
                parsed.httpMode = defaultConfig.httpMode;
            }
            if (!parsed.storageMode) {
                parsed.storageMode = defaultConfig.storageMode;
            }
            if (!parsed.env) {
                parsed.env = defaultConfig.env;
            }
            if (!parsed.moduleName) {
                parsed.moduleName = defaultConfig.moduleName;
            }
            if (!parsed.activeProject) {
                parsed.activeProject = null;
            }
            return parsed;
        }
    } catch (error) {
        // Silently fail - will use fallback behavior
    }

    return defaultConfig;
}

/**
 * Load project configuration from env.config.json
 * Returns the active project's configuration, or null if not found
 *
 * @param {string} projectName - Optional project name override (from CLI --project flag)
 * @returns {Object|null} Project configuration object or null
 */
function loadProjectConfig(projectName) {
    var envConfig = loadEnvConfig();

    // Use provided project name, or activeProject from config, or default to example-project
    var activeProjectName = projectName || envConfig.activeProject || 'example-project';

    if (envConfig.projects && envConfig.projects[activeProjectName]) {
        var projectEntry = envConfig.projects[activeProjectName] || {};
        var settings = mergeSettings(envConfig, projectEntry.settings);
        return {
            name: activeProjectName,
            config: projectEntry,
            settings: settings,
            metadata: projectEntry.metadata || {},
            envConfig: envConfig,
        };
    }

    return null;
}

function mergeSettings(envConfig, projectSettings) {
    var merged = {
        env: envConfig.env || 'acc',
        httpMode: envConfig.httpMode || 'real',
        storageMode: envConfig.storageMode || 'disk',
        moduleName: envConfig.moduleName || 'agent-builder',
    };

    if (projectSettings) {
        for (var key in projectSettings) {
            if (
                projectSettings.hasOwnProperty(key) &&
                projectSettings[key] !== undefined &&
                projectSettings[key] !== null
            ) {
                merged[key] = projectSettings[key];
            }
        }
    }

    return merged;
}

/**
 * Get path for callScript_init directory
 * Falls back to default if config not available
 */
function getCallScriptInitPath(projectConfig) {
    if (projectConfig && projectConfig.config && projectConfig.config.callScriptInitPath) {
        return projectConfig.config.callScriptInitPath;
    }
    var envConfig = loadEnvConfig();
    if (envConfig.environment && envConfig.environment.callScriptInitPath) {
        return envConfig.environment.callScriptInitPath;
    }
    // Fallback to new project structure default
    return 'projects/example-project/callScript_init';
}

/**
 * Get path for globalLibraries/active directory
 * Falls back to default if config not available
 */
function getGlobalLibrariesPath(projectConfig) {
    if (projectConfig && projectConfig.config && projectConfig.config.globalLibrariesPath) {
        return projectConfig.config.globalLibrariesPath;
    }
    var envConfig = loadEnvConfig();
    if (envConfig.environment && envConfig.environment.globalLibrariesPath) {
        return envConfig.environment.globalLibrariesPath;
    }
    // Fallback to new project structure default
    return 'projects/example-project/globalLibraries/active';
}

/**
 * Execute scripts in the correct order
 *
 * @param {Object} options - Loading options
 * @param {Object} options.sandbox - Pre-built sandbox context
 * @param {string} options.userScript - Path to user script file
 * @param {boolean} options.validateScripts - Validate scripts before execution
 * @param {string} options.projectName - Optional project name override (from CLI --project flag)
 * @returns {Object} Updated sandbox after all scripts loaded
 */
function executeScripts(options) {
    if (!options.sandbox) {
        throw new Error('sandbox is required in options');
    }

    if (!options.userScript) {
        throw new Error('userScript path is required in options');
    }

    var sandbox = options.sandbox;
    var validateScripts = options.validateScripts !== false; // Default true

    // Create VM context from sandbox - everything executes in same global scope
    var context = vm.createContext(sandbox);

    var executionOrder = [];
    var startTime = Date.now();

    // Make execution order available in real-time to scripts
    sandbox._executionOrder = executionOrder;
    context._executionOrder = executionOrder;

    var result = null;

    if (options.bundledMode) {
        // Bundled mode: load the pre-exported bundle as a single file.
        // All layers (init, libraries, call script) are already concatenated inside it.
        var bundlePath = path.resolve(process.cwd(), options.userScript);
        if (!fs.existsSync(bundlePath)) {
            throw new Error('Exported bundle not found: ' + bundlePath);
        }
        result = executeScript(bundlePath, 'userScript', context, sandbox, false, executionOrder);
    } else {
        // Normal mode: load layers in dependency order via collectScriptList.
        var projectConfig = loadProjectConfig(options.projectName);
        var scripts = collectScriptList(projectConfig, options.userScript);

        // Warn if expected init files were omitted (not found on disk)
        var hasGlobalCode = scripts.some(function (s) {
            return s.fileName === 'globalCode.js';
        });
        if (!hasGlobalCode) {
            sandbox.log_warn('callScript_init/globalCode.js not found, skipping');
        }
        var hasGlobalVars = scripts.some(function (s) {
            return s.fileName === 'globalVariables.js';
        });
        if (!hasGlobalVars) {
            sandbox.log_warn('globalVariables.js not found, skipping');
        }

        for (var i = 0; i < scripts.length; i++) {
            var item = scripts[i];
            if (item.type === 'userScript') {
                if (!fs.existsSync(item.path)) {
                    throw new Error('User script not found: ' + item.path);
                }
                result = executeScript(
                    item.path,
                    'userScript',
                    context,
                    sandbox,
                    validateScripts,
                    executionOrder
                );
            } else if (item.type === 'configScript') {
                executeScript(
                    item.path,
                    'configScript',
                    context,
                    sandbox,
                    validateScripts,
                    executionOrder
                );
            } else {
                executeScript(
                    item.path,
                    'globalLibrary',
                    context,
                    sandbox,
                    validateScripts,
                    executionOrder
                );
            }
        }
    }

    var totalTime = Date.now() - startTime;

    // Script execution completed (suppressed debug log)

    // Store execution metadata in sandbox
    sandbox._executionMetadata = {
        order: executionOrder,
        totalTime: totalTime,
        timestamp: new Date().toISOString(),
        userScriptResult: result,
    };

    return sandbox;
}

/**
 * Count functions and variables in context
 */
function countContextItems(context, beforeKeys) {
    var currentKeys = Object.keys(context);
    var newKeys = currentKeys.filter(function (key) {
        return beforeKeys.indexOf(key) === -1;
    });

    var functions = 0;
    var variables = 0;

    newKeys.forEach(function (key) {
        if (typeof context[key] === 'function') {
            functions++;
        } else {
            variables++;
        }
    });

    return {
        total: newKeys.length,
        functions: functions,
        variables: variables,
        newKeys: newKeys,
    };
}

/**
 * Execute a single script file
 *
 * Uses vm.Script for better debugging support with VS Code.
 * Breakpoints and debugger statements work correctly with this approach.
 */
function executeScript(scriptPath, scriptType, context, sandbox, validateScripts, executionOrder) {
    var stepStart = Date.now();
    var fileName = path.basename(scriptPath);

    try {
        // Capture context keys before execution (only for global libraries)
        var beforeKeys = [];
        if (scriptType === 'globalLibrary') {
            beforeKeys = Object.keys(context);
        }

        var code = fs.readFileSync(scriptPath, 'utf8');

        // Transform let/const to var for ES5.1 compatibility
        code = transformES5(code);

        // Validate script if requested (non-blocking warnings)
        if (validateScripts && scriptType !== 'userScript') {
            var validation = core.validateConstraints(code, fileName);
            if (!validation.ok) {
                var warnMsg =
                    'Validation warnings for ' +
                    fileName +
                    ': ' +
                    validation.errors.length +
                    ' issue(s)';
                sandbox.log_warn(warnMsg);
                validation.errors.forEach(function (error) {
                    sandbox.log_warn(
                        '  ' +
                            error.rule +
                            ' at line ' +
                            error.line +
                            ':' +
                            error.col +
                            ' - ' +
                            error.message
                    );
                });
                // Don't throw - just warn and continue
            }
        }

        // Execute using vm.Script for better debugging support
        // This allows VS Code debugger to attach and breakpoints to work
        var script = new vm.Script(code, {
            filename: scriptPath, // Use full path for better stack traces in debugger
            lineOffset: 0,
            columnOffset: 0,
            displayErrors: true,
            produceCachedData: false,
        });

        // Run the compiled script in the shared context
        var result = script.runInContext(context, {
            displayErrors: true,
            breakOnSigint: true,
        });

        var stepTime = Date.now() - stepStart;
        var contextStats = null;

        // Count new functions and variables (only for global libraries)
        if (scriptType === 'globalLibrary') {
            contextStats = countContextItems(context, beforeKeys);
        }

        var executionItem = {
            type: scriptType,
            path: scriptPath,
            fileName: fileName,
            size: code.length,
            loadTime: stepTime,
            result: result,
        };

        if (contextStats) {
            executionItem.contextStats = contextStats;
        }

        executionOrder.push(executionItem);

        return result;
    } catch (error) {
        sandbox.log_error('Failed to execute ' + fileName + ':', error.message);
        throw new Error('Script execution failed (' + fileName + '): ' + error.message);
    }
}

/**
 * Gets the execution metadata from the sandbox
 */
function getExecutionMetadata(sandbox) {
    return sandbox && sandbox._executionMetadata ? sandbox._executionMetadata : null;
}

/**
 * Get path for callScripts directory.
 * Falls back to default if config not available.
 */
function getCallScriptsPath(projectConfig) {
    if (projectConfig && projectConfig.config && projectConfig.config.callScriptsPath) {
        return projectConfig.config.callScriptsPath;
    }
    var envConfig = loadEnvConfig();
    var activeProject = envConfig.activeProject || 'example-project';
    return 'projects/' + activeProject + '/callScripts';
}

/**
 * Discover AGENT_*.js files in the callScripts directory, sorted alphabetically.
 * Returns full absolute paths. Returns [] if the directory doesn't exist.
 * Excludes main.js and any file that is the userScript itself (avoid double-load).
 */
function _discoverConfigFiles(callScriptsDirPath, userScriptPath) {
    if (!fs.existsSync(callScriptsDirPath)) {
        return [];
    }
    try {
        return fs
            .readdirSync(callScriptsDirPath)
            .filter(function (file) {
                if (!/^AGENT_.*\.js$/.test(file)) {
                    return false;
                }
                var fullPath = path.join(callScriptsDirPath, file);
                if (!fs.statSync(fullPath).isFile()) {
                    return false;
                }
                // Skip if this file is the userScript (prevent double-load)
                if (userScriptPath && path.resolve(fullPath) === path.resolve(userScriptPath)) {
                    return false;
                }
                return true;
            })
            .sort()
            .map(function (file) {
                return path.join(callScriptsDirPath, file);
            });
    } catch (e) {
        return [];
    }
}

/**
 * Discover JS files in a directory, sorted in REVERSE alphabetical order.
 * Returns full absolute paths. Returns [] if the directory doesn't exist.
 */
function _discoverLibraryFiles(dirPath) {
    if (!fs.existsSync(dirPath)) {
        return [];
    }
    try {
        return fs
            .readdirSync(dirPath)
            .filter(function (file) {
                var fullPath = path.join(dirPath, file);
                return (
                    fs.statSync(fullPath).isFile() &&
                    (file.endsWith('.js') || file.indexOf('.') === -1)
                );
            })
            .sort()
            .reverse()
            .map(function (file) {
                return path.join(dirPath, file);
            });
    } catch (e) {
        return [];
    }
}

/**
 * Build the ordered script list for a project, with each item tagged by layer type.
 * Order: init (globalCode, globalVariables) → library (globalLibraries/active/*, reverse alpha) → userScript
 *
 * Missing init files are silently omitted (callers that need warnings check the result themselves).
 * The userScript entry is always included regardless of existence — callers handle missing-file errors.
 *
 * @param {Object|null} projectConfig - Resolved project config (from loadProjectConfig)
 * @param {string} userScriptPath - Absolute or relative path to the user script
 * @returns {{ path: string, fileName: string, type: 'init'|'library'|'userScript' }[]}
 */
function collectScriptList(projectConfig, userScriptPath) {
    var initPath = getCallScriptInitPath(projectConfig);
    var libPath = getGlobalLibrariesPath(projectConfig);
    var cwd = process.cwd();
    var list = [];

    var globalCodePath = path.resolve(cwd, initPath, 'globalCode.js');
    if (fs.existsSync(globalCodePath)) {
        list.push({ path: globalCodePath, fileName: 'globalCode.js', type: 'init' });
    }
    var globalVarsPath = path.resolve(cwd, initPath, 'globalVariables.js');
    if (fs.existsSync(globalVarsPath)) {
        list.push({ path: globalVarsPath, fileName: 'globalVariables.js', type: 'init' });
    }
    _discoverLibraryFiles(path.resolve(cwd, libPath)).forEach(function (p) {
        list.push({ path: p, fileName: path.basename(p), type: 'library' });
    });
    var userPath = path.isAbsolute(userScriptPath)
        ? userScriptPath
        : path.resolve(cwd, userScriptPath);
    // AGENT_*.js files: load alphabetically after libraries, before userScript (main.js)
    var callScriptsDir = path.resolve(cwd, getCallScriptsPath(projectConfig));
    _discoverConfigFiles(callScriptsDir, userPath).forEach(function (p) {
        list.push({ path: p, fileName: path.basename(p), type: 'configScript' });
    });
    list.push({ path: userPath, fileName: path.basename(userPath), type: 'userScript' });
    return list;
}

/**
 * Return the ordered list of script paths for bundling (no execution).
 * Same order as executeScripts: globalCode, globalVariables, globalLibraries (reverse alpha), userScript.
 * Used by export so we can read and concatenate files without running them in a sandbox.
 *
 * @param {string} projectName - Project name (from env.config.json)
 * @param {string} userScriptPath - Absolute or relative path to the user script (e.g. callScripts/main.js)
 * @returns {{ path: string, fileName: string, type: 'init'|'library'|'userScript' }[]}
 */
function getBundleOrder(projectName, userScriptPath) {
    var projectConfig = loadProjectConfig(projectName);
    return collectScriptList(projectConfig, userScriptPath).filter(function (item) {
        return fs.existsSync(item.path);
    });
}

module.exports = {
    executeScripts: executeScripts,
    getExecutionMetadata: getExecutionMetadata,
    getBundleOrder: getBundleOrder,
    loadEnvConfig: loadEnvConfig,
    loadProjectConfig: loadProjectConfig,
    getCallScriptsPath: getCallScriptsPath,
};
