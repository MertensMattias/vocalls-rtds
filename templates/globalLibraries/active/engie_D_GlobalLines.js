/**
 * Structure:
 * - BASE_TEMPLATE: Common to all lines
 * - CUSTOMER_TEMPLATES: Customer-specific defaults
 * - ENVIRONMENT_TEMPLATES: Environment only
 * - LINE_DEFINITIONS: Per-line configuration (merged with BASE_TEMPLATE)
 *
 * - config.routing: Routing configuration (fallback, languages, customer types/statuses)
 * - config.intents: Intent system configuration (baseline, combinations, LLM mode)
 * - config.session: Session persistence configuration
 * - config.debug: Debug mode settings
 */

// BASE TEMPLATE (Common to all lines)

var BASE_TEMPLATE = {
    active: true,
    defaultKeysToLog: [
        'customerName',
        'customerProject',
        'routingId',
        'language',
        'ani',
        'dnis',
        'interactionStartTime',
        'customer.identificationMethod',
        'customer.status',
        'customer.segment',
        'transferSegment',
    ],
    useLLMIntentDetection: false,
    logVarActive: true,
    logSegmentActive: true,
    logCdbActive: true,
    speechHistoryActive: true,
    speechLoggingActive: true,
    segmentState: {
        currentSegment: 'GET_LANGUAGE',
        segmentResult: '',
        previousSegment: '',
        segmentType: 'routing',
        params: {},
        log: [],
    },
    config: {
        routing: {
            enableLanguageFallback: true,
            fallbackLanguage: 'NL',
            supportedLanguages: ['NL', 'FR', 'DE', 'EN'],
            customerTypes: ['RESI', 'PROF'],
            customerStatuses: [
                'NOT_IDENTIFIED',
                'STANDARD',
                'RETENTION',
                'LEGAL_RECOVERY',
                'FROZEN_KALUZA',
                'MIGRATED_KALUZA',
            ],
            fallbackSegment: 'RESI_OTHER',
            errorSegment: 'ERROR_DEFAULT_ROUTE',
            segmentResetCodes: ['GET_INTENT', 'NEW_INTENT', 'OTHER_INTENT'],
        },
        intents: {
            enableLLMMode: false,
            useDynamicIntents: true,
            enableIntentFallback: true,
            cacheFile: 'intentStore.json',
            skipBaselineIfTarget: true,
            forceReloadCsvInput: false,
            baselineCustomerType: 'RESI',
            baselineCustomerStatus: 'NOT_IDENTIFIED',
            combinations: [
                'RESI_STANDARD',
                'RESI_RETENTION',
                'RESI_LEGAL_RECOVERY',
                'RESI_FROZEN_KALUZA',
                'RESI_MIGRATED_KALUZA',
                'PROF_NOT_IDENTIFIED',
                'PROF_STANDARD',
                'PROF_RETENTION',
                'PROF_LEGAL_RECOVERY',
                'PROF_FROZEN_KALUZA',
                'PROF_MIGRATED_KALUZA',
            ],
            applicationOrder: [
                'STANDARD',
                'RETENTION',
                'LEGAL_RECOVERY',
                'FROZEN_KALUZA',
                'MIGRATED_KALUZA',
            ],
            segments: ['GET_INTENT', 'NEW_INTENT', 'OTHER_INTENT'],
            metaKeys: ['segmentType', 'segmentConfig', 'cdb'],
        },
        session: {
            persistentKeys: [
                'customer',
                'language',
                'environment',
                'interactionStartTime',
                'extension',
                'selfService',
                'remoteAddress',
                'remoteName',
                'diversionReason',
            ],
        },
        debug: {
            devNumbers: ['+32478306999'],
        },
    },
};

// CUSTOMER TEMPLATES (Project-specific defaults)

var CUSTOMER_TEMPLATES = {
    ENERGYLINE: {
        customerName: 'ENGIE',
        customerProject: 'ENERGYLINE',
        customer: {
            identificationMethod: 'NOT_IDENTIFIED',
            status: 'NOT_IDENTIFIED',
            segment: 'RESI',
        },
    },
    PROF: {
        customerName: 'ENGIE',
        customerProject: 'PROF',
        customer: {
            identificationMethod: 'NOT_IDENTIFIED',
            status: 'NOT_IDENTIFIED',
            segment: 'PROF',
        },
        config: {
            intents: {
                baselineCustomerType: 'RESI',
                baselineCustomerStatus: 'NOT_IDENTIFIED',
            },
            routing: {
                fallbackSegment: 'PROF_OTHER',
            },
        },
    },
};

// ENVIRONMENT TEMPLATES (Environment-specific values)

var ENVIRONMENT_TEMPLATES = {
    prd: {
        environment: 'prd',
    },
    acc: {
        environment: 'acc',
    },
    dvp: {
        environment: 'acc', // Note: dvp uses acc environment value
    },
};

// LINE DEFINITIONS (Per-environment line entries)
//
// Example with config override (commented out):
// {
//     lineIdentificator: "test-line",
//     template: "ENERGYLINE",
//     routingId: "TEST-ROUTE",
//     language: "NL",
//     schedulerId: 159,
//     config: {
//         intents: {
//             enableLLMMode: true,
//             useDynamicIntents: false
//         },
//         routing: {
//             fallbackLanguage: 'FR'
//         }
//     }
// }

var LINE_DEFINITIONS = {
    prd: [
        {
            lineIdentificator: '+3225939730',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE',
            language: 'NL',
            segmentResult: '',
            schedulerId: 159,
        },
        {
            lineIdentificator: '+3225939731',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-NL',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 159,
        },
        {
            lineIdentificator: '+3225939732',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-FR',
            language: 'FR',
            segmentResult: 'FR',
            schedulerId: 159,
        },
        {
            lineIdentificator: '+3225939733',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-DE',
            language: 'DE',
            segmentResult: 'DE',
            schedulerId: 159,
        },
        {
            lineIdentificator: '+3225939734',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-EN',
            language: 'EN',
            segmentResult: 'EN',
            schedulerId: 159,
        },
        {
            lineIdentificator: '560030',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE',
            language: 'NL',
            segmentResult: '',
            schedulerId: 159,
        },
        {
            lineIdentificator: '560031',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-NL',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 159,
        },
        {
            lineIdentificator: '560032',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-FR',
            language: 'FR',
            segmentResult: 'FR',
            schedulerId: 159,
        },
        {
            lineIdentificator: '560033',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-DE',
            language: 'DE',
            segmentResult: 'DE',
            schedulerId: 159,
        },
        {
            lineIdentificator: '560034',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-EN',
            language: 'EN',
            segmentResult: 'EN',
            schedulerId: 159,
        },
        {
            lineIdentificator: 'engie-energyline-nl',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-NL',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 159,
        },
        {
            lineIdentificator: 'engie-energyline-fr',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-FR',
            language: 'FR',
            segmentResult: 'FR',
            schedulerId: 159,
        },
        {
            lineIdentificator: 'engie-energyline-de',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-DE',
            language: 'DE',
            segmentResult: 'DE',
            schedulerId: 159,
        },
        {
            lineIdentificator: 'engie-energyline-en',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-EN',
            language: 'EN',
            segmentResult: 'EN',
            schedulerId: 159,
        },
        {
            lineIdentificator: 'engie-error',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ERROR',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 159,
            defaultKeysToLog: [
                'customerName',
                'customerProject',
                'routingId',
                'language',
                'ani',
                'dnis',
                'interactionStartTime',
                'customer.identificationMethod',
                'customer.status',
                'customer.segment',
            ],
        },
        {
            lineIdentificator: 'engie-error-nl',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ERROR-NL',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 159,
            defaultKeysToLog: [
                'customerName',
                'customerProject',
                'routingId',
                'language',
                'ani',
                'dnis',
                'interactionStartTime',
                'customer.identificationMethod',
                'customer.status',
                'customer.segment',
            ],
        },
        {
            lineIdentificator: 'engie-error-fr',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ERROR-FR',
            language: 'FR',
            segmentResult: 'FR',
            schedulerId: 159,
            defaultKeysToLog: [
                'customerName',
                'customerProject',
                'routingId',
                'language',
                'ani',
                'dnis',
                'interactionStartTime',
                'customer.identificationMethod',
                'customer.status',
                'customer.segment',
            ],
        },

        {
            lineIdentificator: '+3225939735',
            template: 'PROF',
            routingId: 'ENGIE-PROF',
            language: 'NL',
            segmentResult: '',
            schedulerId: 159,
        },
        {
            lineIdentificator: '+3225939736',
            template: 'PROF',
            routingId: 'ENGIE-PROF-NL',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 159,
        },
        {
            lineIdentificator: '+3225939737',
            template: 'PROF',
            routingId: 'ENGIE-PROF-FR',
            language: 'FR',
            segmentResult: 'FR',
            schedulerId: 159,
        },
        {
            lineIdentificator: '+3225939738',
            template: 'PROF',
            routingId: 'ENGIE-PROF-DE',
            language: 'DE',
            segmentResult: 'DE',
            schedulerId: 159,
        },
        {
            lineIdentificator: '+3225939739',
            template: 'PROF',
            routingId: 'ENGIE-PROF-EN',
            language: 'EN',
            segmentResult: 'EN',
            schedulerId: 159,
        },
        {
            lineIdentificator: 'engie-prof-nl',
            template: 'PROF',
            routingId: 'ENGIE-PROF-NL',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 159,
        },
        {
            lineIdentificator: 'engie-prof-fr',
            template: 'PROF',
            routingId: 'ENGIE-PROF-FR',
            language: 'FR',
            segmentResult: 'FR',
            schedulerId: 159,
        },
        {
            lineIdentificator: 'engie-prof-de',
            template: 'PROF',
            routingId: 'ENGIE-PROF-DE',
            language: 'DE',
            segmentResult: 'DE',
            schedulerId: 159,
        },
        {
            lineIdentificator: 'engie-prof-en',
            template: 'PROF',
            routingId: 'ENGIE-PROF-EN',
            language: 'EN',
            segmentResult: 'EN',
            schedulerId: 159,
        },
    ],
    acc: [
        {
            lineIdentificator: '+3257351050',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE',
            language: 'NL',
            segmentResult: '',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3257351051',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-NL',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3257351052',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-FR',
            language: 'FR',
            segmentResult: 'FR',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3257351053',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-DE',
            language: 'DE',
            segmentResult: 'DE',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3257351054',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-EN',
            language: 'EN',
            segmentResult: 'EN',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-energyline-nl',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-NL',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-energyline-fr',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-FR',
            language: 'FR',
            segmentResult: 'FR',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-energyline-de',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-DE',
            language: 'DE',
            segmentResult: 'DE',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-energyline-en',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-EN',
            language: 'EN',
            segmentResult: 'EN',
            schedulerId: 4077,
        },

        {
            lineIdentificator: '+3257351055',
            template: 'PROF',
            routingId: 'ENGIE-PROF',
            language: 'NL',
            segmentResult: '',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3257351056',
            template: 'PROF',
            routingId: 'ENGIE-PROF-NL',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3257351057',
            template: 'PROF',
            routingId: 'ENGIE-PROF-FR',
            language: 'FR',
            segmentResult: 'FR',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3257351058',
            template: 'PROF',
            routingId: 'ENGIE-PROF-DE',
            language: 'DE',
            segmentResult: 'DE',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3257351059',
            template: 'PROF',
            routingId: 'ENGIE-PROF-EN',
            language: 'EN',
            segmentResult: 'EN',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-prof-nl',
            template: 'PROF',
            routingId: 'ENGIE-PROF-NL',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-prof-fr',
            template: 'PROF',
            routingId: 'ENGIE-PROF-FR',
            language: 'FR',
            segmentResult: 'FR',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-prof-de',
            template: 'PROF',
            routingId: 'ENGIE-PROF-DE',
            language: 'DE',
            segmentResult: 'DE',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-prof-en',
            template: 'PROF',
            routingId: 'ENGIE-PROF-EN',
            language: 'EN',
            segmentResult: 'EN',
            schedulerId: 4077,
        },
    ],
    dvp: [
        {
            lineIdentificator: '+3224581030',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE',
            language: 'NL',
            segmentResult: '',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3224581031',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-NL',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3224581032',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-FR',
            language: 'FR',
            segmentResult: 'FR',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3224581033',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-DE',
            language: 'DE',
            segmentResult: 'DE',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3224581034',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-EN',
            language: 'EN',
            segmentResult: 'EN',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-energyline-nl',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-NL',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-energyline-fr',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-FR',
            language: 'FR',
            segmentResult: 'FR',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-energyline-de',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-DE',
            language: 'DE',
            segmentResult: 'DE',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-energyline-en',
            template: 'ENERGYLINE',
            routingId: 'ENGIE-ENERGYLINE-EN',
            language: 'EN',
            segmentResult: 'EN',
            schedulerId: 4077,
        },

        {
            lineIdentificator: '+3224581035',
            template: 'PROF',
            routingId: 'ENGIE-PROF',
            language: 'NL',
            segmentResult: '',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3224581036',
            template: 'PROF',
            routingId: 'ENGIE-PROF-NL',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3224581037',
            template: 'PROF',
            routingId: 'ENGIE-PROF-FR',
            language: 'FR',
            segmentResult: 'FR',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3224581038',
            template: 'PROF',
            routingId: 'ENGIE-PROF-DE',
            language: 'DE',
            segmentResult: 'DE',
            schedulerId: 4077,
        },
        {
            lineIdentificator: '+3224581039',
            template: 'PROF',
            routingId: 'ENGIE-PROF-EN',
            language: 'EN',
            segmentResult: 'EN',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-prof-nl',
            template: 'PROF',
            routingId: 'ENGIE-PROF-NL',
            language: 'NL',
            segmentResult: 'NL',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-prof-fr',
            template: 'PROF',
            routingId: 'ENGIE-PROF-FR',
            language: 'FR',
            segmentResult: 'FR',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-prof-de',
            template: 'PROF',
            routingId: 'ENGIE-PROF-DE',
            language: 'DE',
            segmentResult: 'DE',
            schedulerId: 4077,
        },
        {
            lineIdentificator: 'engie-prof-en',
            template: 'PROF',
            routingId: 'ENGIE-PROF-EN',
            language: 'EN',
            segmentResult: 'EN',
            schedulerId: 4077,
        },
    ],
};

// ============================================================================
// BUILD FUNCTIONS
// ============================================================================
function buildLineMapEntry(lineDef, env, customerTemplate, baseTemplate) {
    var entry = deepClone(baseTemplate);

    if (customerTemplate) {
        deepMerge(entry, customerTemplate);
    }

    var envTemplate = ENVIRONMENT_TEMPLATES[env];
    if (envTemplate) {
        deepMerge(entry, envTemplate);
    }

    // line-specific overrides
    if (lineDef.routingId) {
        entry.routingId = lineDef.routingId;
    }
    if (lineDef.language) {
        entry.language = lineDef.language;
    }
    if (lineDef.defaultKeysToLog) {
        entry.defaultKeysToLog = lineDef.defaultKeysToLog;
    }
    if (lineDef.schedulerId !== undefined) {
        entry.schedulerId = lineDef.schedulerId;
    }
    if (lineDef.segmentResult !== undefined && entry.segmentState) {
        entry.segmentState.segmentResult = lineDef.segmentResult;
    }
    if (lineDef.config) {
        if (!entry.config) {
            entry.config = {};
        }
        deepMerge(entry.config, lineDef.config);
    }
    for (var key in lineDef) {
        if (
            lineDef.hasOwnProperty(key) &&
            key !== 'lineIdentificator' &&
            key !== 'template' &&
            key !== 'routingId' &&
            key !== 'language' &&
            key !== 'segmentResult' &&
            key !== 'defaultKeysToLog' &&
            key !== 'schedulerId' &&
            key !== 'config'
        ) {
            entry[key] = deepClone(lineDef[key]);
        }
    }

    return entry;
}

function buildLineMapArray(env) {
    var lineDefs = LINE_DEFINITIONS[env];
    if (!lineDefs) {
        Logger.warn('buildLineMapArray: Unknown environment: ' + env);
        return [];
    }

    var lineMapArray = [];

    for (var i = 0; i < lineDefs.length; i++) {
        var lineDef = lineDefs[i];
        var customerTemplate = CUSTOMER_TEMPLATES[lineDef.template];

        if (!customerTemplate) {
            Logger.warn(
                'buildLineMapEntry: Unknown template: ' +
                    lineDef.template +
                    ' for line: ' +
                    lineDef.lineIdentificator
            );
            continue;
        }

        var entry = buildLineMapEntry(lineDef, env, customerTemplate, BASE_TEMPLATE);

        // Add to array as [key, value] pair
        lineMapArray.push([lineDef.lineIdentificator, entry]);
    }

    return lineMapArray;
}

// GENERATE LINE MAPS

log_debug('context.settings: ' + JSON.stringify(context.settings.moduleName));

var selectedLineMap = null;
context.session.variables.vaultKey = null;

switch (context.settings.moduleName) {
    case 'n-allo-prd':
        selectedLineMap = buildLineMapArray('prd');
        context.session.variables.variableStorageUrl =
            'https://n-allo.vocalls.ai/core/TenantValueStorage';
        context.session.variables.vaultKey = '69a28d8b-c091-4a53-9862-1aab894e8d33';
        break;
    case 'n-allo-acc':
        selectedLineMap = buildLineMapArray('acc');
        context.session.variables.variableStorageUrl =
            'https://n-allo-acc.vocalls.ai/core/TenantValueStorage';
        context.session.variables.vaultKey = '844a52db-e1fb-4c94-9d1b-b3fb1a3e930e';
        break;
    case 'n-allo-dev':
        selectedLineMap = buildLineMapArray('dvp');
        context.session.variables.variableStorageUrl =
            'https://n-allo-acc.vocalls.ai/core/TenantValueStorage';
        context.session.variables.vaultKey = '844a52db-e1fb-4c94-9d1b-b3fb1a3e930e';
        break;
    default:
        log_debug('Unknown moduleName in context.settings:', context.settings.moduleName);
}

lineMap = new Map(selectedLineMap);
