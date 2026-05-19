/**
 * Vocalls Session Context Builder
 *
 * Provides session context building and session switch simulation
 * to mimic Vocalls variable persistence behavior.
 */

var core = require('../core/minimalVocallsCore');
var loader = require('../core/loader');

var loadEnvConfig = loader.loadEnvConfig;

/**
 * Builds a complete session context from seed data
 *
 * @param {Object} seed - Initial context seed data
 * @param {Object} options - Sandbox options (httpMode, storageMode, etc.)
 * @returns {Object} Complete session context with Vocalls APIs
 */
function buildSessionContext(seed, options) {
    seed = seed || {};
    options = options || {};

    // Load environment configuration
    var envConfig = loadEnvConfig();
    var projectSettings = options.projectSettings || {};
    var resolvedModuleName = projectSettings.moduleName || envConfig.moduleName || 'vocalls-env';
    var resolvedEnvironment = projectSettings.env || envConfig.env || 'acc';
    var resolvedHttpMode =
        options.httpMode || projectSettings.httpMode || envConfig.httpMode || 'real';
    var resolvedStorageMode =
        options.storageMode || projectSettings.storageMode || envConfig.storageMode || 'disk';

    // Create the core sandbox
    var sandbox;
    try {
        sandbox = core.createSandbox({
            httpMode: resolvedHttpMode,
            storageMode: resolvedStorageMode,
            logging: options.logging,
            moduleName: resolvedModuleName,
            environment: resolvedEnvironment,
        });
    } catch (error) {
        throw new Error('Failed to create sandbox: ' + error.message);
    }

    sandbox.context.settings.moduleName = resolvedModuleName;
    sandbox.context.settings.defaultEnvironment = resolvedEnvironment;
    if (options.projectName) {
        sandbox.context.settings.projectName = options.projectName;
    }
    if (projectSettings && typeof projectSettings === 'object') {
        for (var key in projectSettings) {
            if (
                projectSettings.hasOwnProperty(key) &&
                projectSettings[key] !== undefined &&
                projectSettings[key] !== null
            ) {
                sandbox.context.settings[key] = projectSettings[key];
            }
        }
    }

    // Merge seed data into context
    if (seed.callInfo) {
        Object.assign(sandbox.context.callInfo, seed.callInfo);
    }

    if (seed.session) {
        if (seed.session.variables) {
            Object.assign(sandbox.context.session.variables, seed.session.variables);
        }
    }

    if (seed.language) {
        sandbox.context.language = seed.language;
    }

    if (seed.settings) {
        Object.assign(sandbox.context.settings, seed.settings);
    }

    // Initialize node history if provided
    if (seed.nodeHistory && Array.isArray(seed.nodeHistory)) {
        sandbox.nodeHistory = seed.nodeHistory.slice(); // Copy array
        sandbox.context.nodeHistory = sandbox.nodeHistory;
    }

    sandbox.log_debug('Session context built', {
        callGuid: sandbox.context.callInfo.callGuid,
        language: sandbox.context.language,
        variableCount: Object.keys(sandbox.context.session.variables).length,
        nodeHistoryLength: sandbox.nodeHistory.length,
    });

    return sandbox;
}

/**
 * Simulates a Vocalls session switch by serializing and deserializing
 * session variables to mimic how Vocalls persists variables between segments
 *
 * @param {Object} sandbox - Current sandbox context
 * @returns {Object} Updated sandbox with clean session state
 */
function simulateSessionSwitch(sandbox) {
    if (!sandbox || !sandbox.context) {
        throw new Error('Invalid sandbox provided to simulateSessionSwitch');
    }

    sandbox.log_debug('Simulating session switch...');

    // Capture current state
    var preSwitch = {
        variables: Object.keys(sandbox.context.session.variables).length,
        nodeHistory: sandbox.nodeHistory.length,
    };

    // Serialize session variables (removes functions, handles circular references)
    var serialized = sandbox.serializeSession(sandbox.context.session.variables);

    // Simulate the gap - in real Vocalls, variables are persisted as strings
    // and some runtime state is lost

    // Add to node history to simulate segment transition
    sandbox.nodeHistory.push({
        timestamp: sandbox.nowUTC(),
        segment: 'TRANSITION',
        variables: JSON.parse(serialized), // What would be persisted
    });

    // Deserialize back to simulate how Vocalls restores variables
    var restored = sandbox.deserializeSession(serialized);

    // Replace session variables with restored ones
    sandbox.context.session.variables = restored;

    // Update context references
    sandbox.context.nodeHistory = sandbox.nodeHistory;

    var postSwitch = {
        variables: Object.keys(sandbox.context.session.variables).length,
        nodeHistory: sandbox.nodeHistory.length,
    };

    sandbox.log_debug('Session switch completed', {
        before: preSwitch,
        after: postSwitch,
        serializedSize: serialized.length,
    });

    return sandbox;
}

/**
 * Creates a default seed configuration for common scenarios
 *
 * @param {string} scenario - Scenario name ('inbound', 'outbound', 'callback')
 * @param {Object} overrides - Override specific values
 * @returns {Object} Seed configuration
 */
function createDefaultSeed(scenario, overrides) {
    scenario = scenario || 'inbound';
    overrides = overrides || {};

    // Load moduleName from env.config.json
    var envConfig = loadEnvConfig();
    var moduleName =
        (overrides.settings && overrides.settings.moduleName) ||
        envConfig.moduleName ||
        'vocalls-env';
    var defaultEnvironment =
        (overrides.settings && overrides.settings.defaultEnvironment) || envConfig.env || 'acc';

    var seeds = {
        inbound: {
            callInfo: {
                fromUri: 'sip:+32470000000@vocalls.com',
                toUri: 'sip:080012345@vocalls.com',
                direction: 'inbound',
                callGuid: 'CALL-' + Date.now(),
            },
            language: 'NL',
            session: {
                variables: {
                    callDirection: 'inbound',
                    initialLanguage: 'NL',
                    startTime: new Date().toISOString(),
                    defaultEnvironment: defaultEnvironment,
                },
            },
            settings: {
                moduleName: moduleName,
            },
            nodeHistory: [],
        },

        outbound: {
            callInfo: {
                fromUri: 'sip:080012345@vocalls.com',
                toUri: 'sip:+32470000000@vocalls.com',
                direction: 'outbound',
                callGuid: 'CALL-' + Date.now(),
            },
            language: 'NL',
            session: {
                variables: {
                    callDirection: 'outbound',
                    campaignId: 'CAMPAIGN-001',
                    startTime: new Date().toISOString(),
                    defaultEnvironment: defaultEnvironment,
                },
            },
            settings: {
                moduleName: moduleName,
            },
            nodeHistory: [],
        },

        callback: {
            callInfo: {
                fromUri: 'sip:system@vocalls.com',
                toUri: 'sip:+32470000000@vocalls.com',
                direction: 'outbound',
                callGuid: 'CALLBACK-' + Date.now(),
            },
            language: 'NL',
            session: {
                variables: {
                    callDirection: 'callback',
                    originalCallId: 'CALL-' + (Date.now() - 3600000),
                    callbackRequested: new Date(Date.now() - 1800000).toISOString(),
                    startTime: new Date().toISOString(),
                    defaultEnvironment: defaultEnvironment,
                },
            },
            settings: {
                moduleName: moduleName,
            },
            nodeHistory: [],
        },
    };

    var seed = seeds[scenario];
    if (!seed) {
        throw new Error(
            'Unknown scenario: ' + scenario + '. Available: ' + Object.keys(seeds).join(', ')
        );
    }

    // Deep merge overrides
    function deepMerge(target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    target[key] = target[key] || {};
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        return target;
    }

    return deepMerge(JSON.parse(JSON.stringify(seed)), overrides);
}

module.exports = {
    buildSessionContext: buildSessionContext,
    simulateSessionSwitch: simulateSessionSwitch,
    createDefaultSeed: createDefaultSeed,
};
