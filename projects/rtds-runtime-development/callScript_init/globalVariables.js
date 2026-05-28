/* global context */

/**
 * globalVariables.js — Vocalls Platform Variable Declarations
 *
 * Declare global variables used across the call flow.
 * ES5.1 compliant — use var.
 */

// Call routing variables
var varObj = {
    environment: 'acc',
    schedulerId: 0,
    customerName: 'CUSTOMER',
    customerProject: 'PROJECT',
    routingId: 'CUSTOMER-PROJECT-NL',
    language: 'NL',
    ani: '+10000000000',
    dnis: '+20000000000',
    callIdKey: '00000000-0000-0000-0000-000000000000',
    interactionStartTime: '2025-01-01T00:00:00.000Z',
    logVarActive: true,
    logSegmentActive: true,
    logCdbActive: true,
    speechHistoryActive: true,
    speechLoggingActive: true,
    useLLMIntentDetection: false,
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
    addKeysToLog: [
        'customer.contractAccountStatus',
        'customer.customerCA',
        'customer.customerBP',
        'customer.identificationMethod',
        'customer.status',
        'customer.segment',
        'customer.callAvoidance',
        'customer.giCustomerCA',
        'customer.giCustomerBP',
        'customer.giStatus',
        'customer.giSegment',
        'customer.globalAlertList',
        'customer.intentAlertList',
    ],
    redirect: false,
    customer: {
        contractAccountStatus: 'ACTIVE',
        giCustomerCA: '0',
        giCustomerBP: '0',
        customerCA: '0',
        customerBP: '0',
        identificationMethod: 'MANUAL',
        status: 'STANDARD',
        segment: 'RESI',
        contactInformation: {
            firstName: '',
            lastName: '',
            mobileNumber: '',
            telephoneNumber: null,
            email: '',
        },
        contractAddress: {
            street: '',
            houseNumber: '',
            postalCode: '',
            city: '',
            poBox: null,
            supplement: null,
            floor: null,
        },
        globalAlertList: [],
        intentAlertList: [],
        callAvoidance: {
            basic: 'NO_BASIC',
            direct: 'NO_DIRECT',
            enterprise: false,
            pushToBackOffice: null,
        },
        transferTension: {
            origin: '',
            reason: '',
            transferTensionLevel: 'LOW_TENSION',
        },
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
                'reservedDid',
            ],
        },
        debug: {
            devNumbers: ['+10000000000'],
        },
    },
    cdb: {
        cdbLcFinished: false,
        cdbFcFinished: false,
        cdbLog: 'cdbLog1',
        cdbDicId: '0',
        cdbTransferType1: null,
        cdbTransferType2: null,
        cdbOfferedAlertID: null,
        cdbTimeout: 15000,
        cdbData: {
            cdbLogOperator: '0',
            cdbLog1: '0',
            cdbLog4: '0',
            cdbLog5: '0',
            cdbLog6: '0',
            cdbLog7: '0',
            cdbLog9: '0',
            cdbLog10: '0',
            cdbLog11: '0',
            cdbLog12: '0',
            cdbLog13: '0',
            cdbLog14: '0',
            cdbLogEx: '0',
        },
    },
    _onCallEndDone: false,
    _tempData: {
        main: {},
    },
    _previousKeyValueData: '{}',
    _speechHistory: [],
    _lastSpeakFlowIndex: 0,
    _segmentSpeechStartIndex: 0,
    debugCall: true,
};

_apiResult = {
    caseNumber: 1,
    faults: [],
    failureOccurred: false,
};

// Extract caller language from context
if (context && context.language) {
    varObj.language = context.language;
} else {
    varObj.language = 'NL';
}

// Vocalls platform segment state
var segmentState = { currentSegment: 'main' };
segmentState.segmentResult = 'FAILURE';
