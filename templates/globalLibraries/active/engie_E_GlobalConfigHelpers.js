/* ────────────────────────────────────────────────────────────────────────────
 *  Global constants & configurations
 * ─────────────────────────────────────────────────────────────────────────── */
environment = typeof environment !== 'undefined' ? environment : 'acc';
callIdKey = typeof callIdKey !== 'undefined' ? callIdKey : null;
sourceData = typeof sourceData !== 'undefined' ? sourceData : null;
customerName = typeof customerName !== 'undefined' ? customerName : null;
customerProject = typeof customerProject !== 'undefined' ? customerProject : null;
routingId = typeof routingId !== 'undefined' ? routingId : null;
language = typeof language !== 'undefined' ? language : null;
csvInput = typeof csvInput !== 'undefined' ? csvInput : null;
schedulerId = typeof schedulerId !== 'undefined' ? schedulerId : null;

defaultKeysToLog = typeof defaultKeysToLog !== 'undefined' ? defaultKeysToLog : null;
addKeysToLog = typeof addKeysToLog !== 'undefined' ? addKeysToLog : null;

interactionStartTime = typeof interactionStartTime !== 'undefined' ? interactionStartTime : null;
routingLine = typeof routingLine !== 'undefined' ? routingLine : null;
vaultKey = typeof vaultKey !== 'undefined' ? vaultKey : null;
segmentDicMergedCache = typeof segmentDicMergedCache !== 'undefined' ? segmentDicMergedCache : {};
cdbLog = typeof cdbLog !== 'undefined' ? cdbLog : null;
cdbDicId = typeof cdbDicId !== 'undefined' ? cdbDicId : null;
varObj = typeof varObj !== 'undefined' ? varObj : null;
segmentState = typeof segmentState !== 'undefined' ? segmentState : null;
currentSegment = typeof currentSegment !== 'undefined' ? currentSegment : null;
transferSegment = typeof transferSegment !== 'undefined' ? transferSegment : null;
segmentResult = typeof segmentResult !== 'undefined' ? segmentResult : null;

//added
//factoryConfig = null;
intentDefinitions = typeof intentDefinitions !== 'undefined' ? intentDefinitions : null;
messageStore = typeof messageStore !== 'undefined' ? messageStore : null;
debug = typeof debug !== 'undefined' ? debug : false;
debugCall = typeof debugCall !== 'undefined' ? debugCall : false;
extension = typeof extension !== 'undefined' ? extension : null;
_timeout = typeof _timeout !== 'undefined' ? _timeout : 30000;
_headers = typeof _headers !== 'undefined' ? _headers : null;
_apiResult = typeof _apiResult !== 'undefined' ? _apiResult : null;
_remoteAddress = typeof _remoteAddress !== 'undefined' ? _remoteAddress : null;

globalEngieSelfserviceVsProfiles = {};
globalSelfServices = {};

// Routing context tracking for idempotency
_lastRoutingContext = null;

// CDB
baseCdb = {
    cdbLcFinished: false,
    cdbFcFinished: false,
    cdbLog: null,
    cdbDicId: null,
    cdbSessionStartTime: function (v) {
        return v.interactionStartTime || nowUTC();
    },
};

/* ────────────────────────────────────────────────────────────────────────────
 *  Utility helpers
 * ─────────────────────────────────────────────────────────────────────────── */
nowUTC = function () {
    return new Date().toISOString();
};

/**
 * @param {Object} obj  – The root object from which the value is resolved.
 * @param {string} path – Dot/bracket notation path to resolve.
 * @returns {*} The value at the given path, or `undefined` when not found.
 */
function getPath(obj, path) {
    // Handle null/undefined path
    if (!path || typeof path !== 'string') {
        return undefined;
    }
    return path
        .split('.')
        .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

/**
 * Builds an array of placeholder/value pairs that can later be used with the CDB
 * (customer data base) templating engine.
 *
 * @param {Object}   varObj           – Session‑level variable object containing data.
 * @param {Array<{   placeHolder: string,
 *                  valueToReplace: string }>} cdbPlaceHolders – List describing which
 *                  placeholders to fill and where the data comes from.
 * @returns {Array<{ placeHolder: string, valueToReplace: string }>}  A new array with
 *          concrete values resolved from `varObj`.
 */
function buildCdbPlaceholders(varObj, cdbPlaceHolders) {
    if (typeof cdbPlaceHolders === 'string') {
        cdbPlaceHolders = getPath(varObj, cdbPlaceHolders);
    }
    if (!cdbPlaceHolders || !Array.isArray(cdbPlaceHolders) || cdbPlaceHolders.length === 0) {
        return [];
    }
    return cdbPlaceHolders.map((ph) => ({
        placeHolder: ph.placeHolder,
        valueToReplace: String(getPath(varObj, ph.valueToReplace) || ''),
    }));
}

/**
 * Retrieves a property from an object.
 * Supports both normal keys and dot-notation paths.
 *
 * Backwards compatible:
 *  safeGet(obj, "key", def)
 *  safeGet(obj, "a.b.c", def)
 *
 * @param {?Object} obj
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
function safeGet(obj, key, defaultValue) {
    if (obj == null || typeof obj !== 'object') {
        return defaultValue;
    }

    // Fast path (backwards compatible behaviour)
    if (key.indexOf('.') === -1) {
        return key in obj ? obj[key] : defaultValue;
    }

    // Dot notation path
    var parts = key.split('.');
    var current = obj;

    for (var i = 0; i < parts.length; i++) {
        if (current == null || typeof current !== 'object' || !(parts[i] in current)) {
            return defaultValue;
        }
        current = current[parts[i]];
    }

    return current;
}

/**
 * Computes the CDB dictionary ID taking possible overrides into account.
 *
 * Search order:
 *   1. `segmentObj.cdb.cdbData[cdbLog]` (per‑call override)
 *   2. `segmentObj.cdb.cdbDicId`       (fallback stored on the object)
 *
 * @param {string}     cdbLog      – Name of the CDB log collection.
 * @param {Object=}    segmentObj  – Segment object (defaults to global `varObj`).
 * @returns {?string}  The resolved dictionary ID or `null` when none found.
 */
function getCdbDicId(cdbLog, segmentObj = varObj) {
    var data = safeGet(segmentObj, 'cdb', {}).cdbData || {};
    var fallback = safeGet(segmentObj, 'cdb', {}).cdbDicId || null;

    if (cdbLog in data && data[cdbLog] !== '') {
        var id = data[cdbLog];
        Logger.info(`getCdbDicId: override for "${cdbLog}" → ${id}`);
        return id;
    }

    Logger.info(`getCdbDicId: using default cdbDicId (${String(fallback)})`);
    return fallback;
}

/**
 * Checks segment occurrence conditions in the segment log.
 *
 * @param {?Object} state          – Segment state object containing a `log` array.
 * @param {string|null} segmentName  – Name of the segment to look for, or null to skip.
 * @param {string|null} segmentResult – segmentResult to look for, or null to skip.
 * @returns {boolean} `true` if condition matches; otherwise `false`.
 *
 * Usage:
 *  hasSegmentOccurred(state, 'IDENTIFICATION', null)          // segment occurred
 *  hasSegmentOccurred(state, 'IDENTIFICATION', 'OK')          // segment + segmentResult occurred
 *  hasSegmentOccurred(state, null, 'OK')                       // segmentResult occurred anywhere
 */
function hasSegmentOccurred(state, segmentName = null, segmentResult = null) {
    if (!state || !Array.isArray(state.log)) return false;

    return state.log.some((entry) => {
        var segmentMatch = segmentName ? entry.currentSegment === segmentName : true;
        var resultMatch = segmentResult ? entry.segmentResult === segmentResult : true;
        return segmentMatch && resultMatch;
    });
}

function createOperationCallData(customerCA, customerBP, language) {
    var jsonBody = {
        messageId: createUUID(),
        application: 'IVR',
        profile: 'NALLO',
        agentLoginName: 'USERIVR',
        contractAccountID: customerCA,
        businessPartnerID: customerBP,
        language: language,
    };
    return jsonBody;
}

/**
 * Attempts to resolve the correct `cdbDicId` on the provided variable object.
 * When a match is found the function MUTATES `vObj.cdb.cdbDicId` with the match.
 *
 * @param {string}  cdbLog – Key to look for inside `vObj.cdb.cdbData`.
 * @param {Object=} vObj   – Variable object to update (defaults to global `varObj`).
 * @returns {?string} The matched ID or `null` when nothing matched.
 */
function resolveCdbDicId(cdbLog, vObj = varObj) {
    try {
        var cdb = safeGet(vObj, 'cdb', {});
        var data = cdb.cdbData || {};

        var keysToCheck = [cdbLog, cdb.cdbLog];
        for (var i = 0; i < keysToCheck.length; i++) {
            var key = keysToCheck[i];
            if (typeof key === 'string' && key in data && data[key] !== '') {
                var id = data[key];
                vObj.cdb = { ...cdb, cdbDicId: id };
                Logger.info(`resolveCdbDicId: matched "${key}" → ${id}, updated cdbDicId`);
                return id;
            }
        }
        Logger.info('resolveCdbDicId: no match found, cdbDicId unchanged');
        return null;
    } catch (err) {
        Logger.error('resolveCdbDicId: failed', {}, err);
        return null;
    }
}

/**
 * Retrieves a parameter from `segmentState` with fallback to `segmentConfig`.
 * Priority order is:
 *   1. `segmentState.params[key]`
 *   2. `segmentState.segmentConfig[key]`
 *   3. `defaultValue`
 * Dot‑notation is *not* supported for the key.
 *
 * @param {string} key           – Parameter key.
 * @param {*}      defaultValue  – Returned when key is missing.
 * @returns {*} The resolved value or the default.
 */
function getSegmentKey(key, defaultValue) {
    if (!segmentState || typeof key !== 'string') return defaultValue;

    if (
        segmentState.params &&
        typeof segmentState.params === 'object' &&
        Object.prototype.hasOwnProperty.call(segmentState.params, key)
    ) {
        return segmentState.params[key];
    }

    if (
        segmentState.segmentConfig &&
        typeof segmentState.segmentConfig === 'object' &&
        Object.prototype.hasOwnProperty.call(segmentState.segmentConfig, key)
    ) {
        return segmentState.segmentConfig[key];
    }

    return defaultValue;
}

/**
 * Extracts only keys listed in persistentKeys from the given params object.
 *
 * @param {?Object} params – Input params (may be `null`).
 * @param {Object} varObjOrConfig – varObj object (extracts config from varObj.config) or config object directly.
 * @returns {Object} New object containing persistent key/value pairs.
 */
function pickPersistentKeys(params, varObjOrConfig) {
    if (!params || typeof params !== 'object') {
        return {};
    }
    var cfg = null;
    if (varObjOrConfig && typeof varObjOrConfig === 'object') {
        if (varObjOrConfig.config && typeof varObjOrConfig.config === 'object') {
            cfg = varObjOrConfig.config;
        } else {
            cfg = varObjOrConfig;
        }
    }

    if (!cfg) {
        return {};
    }

    var session = cfg.session || {};
    var persistentKeys = session.persistentKeys || [];

    var result = {};
    for (var i = 0; i < persistentKeys.length; i++) {
        var key = persistentKeys[i];
        if (Object.prototype.hasOwnProperty.call(params, key)) {
            result[key] = params[key];
        }
    }
    return result;
}

/**
 * Extract routing configuration from varObj.config.
 * Configuration comes from lineMap (BASE_TEMPLATE.config merged with line-specific overrides).
 *
 * @param {Object} varObj - Call variables object
 * @returns {Object} Routing configuration (supportedLanguages, fallbackLanguage, customerTypes, etc.)
 */
function getRoutingConfig(varObj) {
    if (!varObj || typeof varObj !== 'object' || !varObj.config) {
        return {};
    }
    return varObj.config.routing || {};
}

/**
 * Extract session configuration from varObj.config.
 * Configuration comes from lineMap (BASE_TEMPLATE.config merged with line-specific overrides).
 *
 * @param {Object} varObj - Call variables object
 * @returns {Object} Session configuration (persistentKeys, etc.)
 */
function getSessionConfig(varObj) {
    if (!varObj || typeof varObj !== 'object' || !varObj.config) {
        return {};
    }
    return varObj.config.session || {};
}

/**
 * Extract debug configuration from varObj.config.
 * Configuration comes from lineMap (BASE_TEMPLATE.config merged with line-specific overrides).
 *
 * @param {Object} varObj - Call variables object
 * @returns {Object} Debug configuration (devNumbers, etc.)
 */
function getDebugConfig(varObj) {
    if (!varObj || typeof varObj !== 'object' || !varObj.config) {
        return {};
    }
    return varObj.config.debug || {};
}

/**
 * Convenience wrapper returning the current timestamp in ISO‑8601 UTC format.
 *
 * @returns {string} Current date/time in UTC.
 */
function nowUTC() {
    return new Date().toISOString();
}

/**
 * Returns a global variable if it exists; otherwise the provided default.
 *
 * @param {string}   varName      – Name of the global variable.
 * @param {*}        defaultValue – Fallback value.
 * @param {boolean=} useFalsy     – When `true`, empty string / 0 / false are
 *                                  considered *unset* and the default is used.
 * @returns {*} The resolved value.
 */
function getOrDefault(varName, defaultValue, useFalsy = false) {
    var value = typeof globalThis[varName] !== 'undefined' ? globalThis[varName] : undefined;
    return useFalsy ? value || defaultValue : typeof value === 'undefined' ? defaultValue : value;
}

/**
 * Checks if the input is a valid, non‑empty object *or* array.
 * Returns `true` for:
 *   • objects with ≥ 1 own key
 *   • arrays  with ≥ 1 element
 *
 * @param {*} input – Any JS value to validate.
 * @returns {boolean} `true` when `input` is a non‑empty object/array.
 */
function isValidObject(input) {
    try {
        var isValid =
            input !== null &&
            typeof input === 'object' &&
            ((Array.isArray(input) && input.length > 0) ||
                (!Array.isArray(input) && Object.keys(input).length > 0));
        return isValid;
    } catch (e) {
        Logger.debug('isValidObject: exception thrown', { error: e.message });
        return false;
    }
}

/**
 * Returns `true` when the self‑service identified by `code` is enabled in
 * `globalSelfServices`.
 *
 * @param {string} code – Self‑service identifier.
 * @returns {boolean}
 */
function isSelfServiceEnabled(code) {
    return globalSelfServices[code] === true;
}

/**
 * Retrieves a nested property using dot notation without throwing on invalid
 * paths.  Similar to `getPath` but implemented inline for performance.
 *
 * @param {?Object} obj  – Source object.
 * @param {string}  path – Dot notation path (e.g. `a.b.c`).
 * @returns {*}  Resolved value or `undefined`.
 */
function getNestedValue(obj, path) {
    if (typeof path !== 'string') return undefined;
    return path
        .split('.')
        .reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

/**
 * Constructs a *new* fully‑initialised `varObj` used to carry session state.
 * Many fields are populated from `globalThis` to allow late overrides.
 *
 * @throws {Error} When initialisation fails (very unlikely).
 * @returns {Object} The freshly created variable object.
 */
function constVarObj() {
    try {
        var object = {
            environment: getOrDefault('environment', 'acc', true),
            schedulerId: getOrDefault('schedulerId', 159, true),
            customerName: getOrDefault('customerName', '', true),
            customerProject: getOrDefault('customerProject', '', true),
            routingId: getOrDefault('routingId', '', true),
            language: getOrDefault(
                'language',
                context.language.substring(0, 2).toUpperCase(),
                true
            ),
            ani: getOrDefault('ani', null, true),
            dnis: getOrDefault('dnis', null, true),
            callIdKey: getOrDefault('callIdKey', context.callInfo.callGuid, true),
            interactionStartTime: getOrDefault(
                'interactionStartTime',
                new Date().toISOString(),
                true
            ),
            logVarActive: getOrDefault('logVarActive', null, true),
            logSegmentActive: getOrDefault('logSegmentActive', null, true),
            logCdbActive: getOrDefault('logCdbActive', null, true),
            speechHistoryActive: getOrDefault('speechHistoryActive', null, true),
            speechLoggingActive: getOrDefault('speechLoggingActive', null, true),
            useLLMIntentDetection: getOrDefault('useLLMIntentDetection', null, true),
            defaultKeysToLog: [
                'customerName',
                'customerProject',
                'routingId',
                'language',
                'ani',
                'dnis',
                'interactionStartTime',
            ],
            addKeysToLog: [
                'customer.contractAccountStatus',
                'customer.customerCA',
                'customer.customerBP',
                'customer.identificationMethod',
                'customer.status',
                'customer.segment',
                'customer.callAvoidance',
            ],
            redirect: false,
            customer: {
                contractAccountStatus: null,
                giCustomerCA: getOrDefault('giCustomerCA', '', true),
                giCustomerBP: getOrDefault('giCustomerBP', '', true),
                customerCA: getOrDefault('customerCA', '', true),
                customerBP: getOrDefault('customerBP', '', true),
                identificationMethod: getOrDefault('identificationMethod', 'NOT_IDENTIFIED', true),
                status: getOrDefault('status', 'NOT_IDENTIFIED', true),
                segment: getOrDefault('segment', 'RESI', true),
                contactInformation: null,
                contractAddress: null,
                globalAlertList: [],
                intentAlertList: [],
                callAvoidance: {
                    direct: 'NO_DIRECT',
                    enterprise: false,
                    pushToBackOffice: null,
                },
                transferTension: {
                    origin: '',
                    reason: '',
                    transferTensionLevel: '',
                },
            },
            config: {},
            cdb: {
                cdbFcFinished: false,
                cdbLog: null,
                cdbDicId: null,
                cdbSessionStartTime: null,
            },
            _onCallEndDone: false,
            _tempData: {},
            _previousKeyValueData: '{}',
            _speechHistory: [],
            _lastSpeakFlowIndex: 0,
            _segmentSpeechStartIndex: 0,
        };
        return object;
    } catch (error) {
        Logger.error('Error in constVarObj', {}, error);
        throw new Error('Failed to initialise varObj');
    }
}

/* ────────────────────────────────────────────────────────────────────────────
 *  Message templating
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Internal helper converting array‑style index access ("prop[0]") into dot
 * notation so the reducer in `_resolvePath` can process it.
 *
 * @param {Object} root     – Root object.
 * @param {string} rawPath  – Raw, user‑supplied path (may contain `[idx]`).
 * @returns {*} The resolved value or `undefined`.
 */
function _resolvePath(root, rawPath) {
    var path = rawPath.replace(/\[(\d+)\]/g, '.$1');
    return path.split('.').reduce(function (obj, key) {
        if (obj !== null && obj !== undefined && Object.prototype.hasOwnProperty.call(obj, key)) {
            return obj[key];
        }
        return undefined;
    }, root);
}

/**
 * Retrieves a language‑specific message template from `messageStore`, falling
 * back to English when the desired language is unavailable.  Tokens wrapped in
 * `{}` are replaced with values resolved from the global scope.
 *
 * @param {Object<string,Object>} messageStore – Map of messageId → { EN: "", NL: "" }.
 * @param {string}                messageId    – The key to look up.
 * @returns {string} The resolved, interpolated message (empty string on error).
 */
function getMessage(messageStore, messageId) {
    try {
        if (!messageStore || typeof messageStore !== 'object')
            throw new Error('invalid messageStore');
        if (!messageId || typeof messageId !== 'string') throw new Error('invalid messageId');

        var entry = messageStore[messageId];
        if (!entry) throw new Error(`no entry "${messageId}"`);

        var lang = globalThis.language;
        var template = entry[lang] !== undefined ? entry[lang] : entry.EN;
        if (!template) throw new Error(`no template for "${messageId}" in "${lang}" or "EN"`);

        if (template.indexOf('{') === -1) return template;

        return template.replace(/\{([\w.]+)\}/g, function (_match, token) {
            var val =
                token.indexOf('.') !== -1 ? _resolvePath(globalThis, token) : globalThis[token];

            if (val === undefined) {
                Logger.warn('[WARN] getMessage: missing "{' + token + '}"');
                return '';
            }
            return String(val);
        });
    } catch (err) {
        Logger.error('[ERROR] getMessage: ' + err.message, {}, err);
        return '';
    }
}

/**
 * @namespace SpeechHistoryManager
 */
SpeechHistoryManager = {
    ensure: function (varObj) {
        if (!Array.isArray(varObj._speechHistory)) varObj._speechHistory = [];
        if (typeof varObj._lastSpeakFlowIndex !== 'number') varObj._lastSpeakFlowIndex = 0;
        if (typeof varObj._segmentSpeechStartIndex !== 'number')
            varObj._segmentSpeechStartIndex = 0;
        if (typeof varObj._lastSpeechSegmentName !== 'string') varObj._lastSpeechSegmentName = '';
        if (typeof varObj._segmentSpeechCache !== 'string') varObj._segmentSpeechCache = '';
    },

    /**
     *
     * @param {Object} varObj Session variable object.
     * @param {Object} segmentState Reserved for future use.
     * @param {Object} speakFlow Vocalls speakFlow object with .size and .get(i).
     */
    collectNew: function (varObj, segmentState, speakFlow) {
        // Check if speech history collection is enabled
        if (!varObj || varObj.speechHistoryActive === false) {
            return;
        }

        this.ensure(varObj);
        var flowSize = speakFlow.size;
        var lastIndex = varObj._lastSpeakFlowIndex;
        var startIndex = flowSize < lastIndex ? 0 : lastIndex; // detect reset

        for (var historyIndex = startIndex; historyIndex < flowSize; historyIndex++) {
            var flowItem = speakFlow.get(historyIndex);
            var timestampIso = typeof nowUTC === 'function' ? nowUTC() : new Date().toISOString();

            if (flowItem.type === 3) {
                varObj._speechHistory.push({
                    role: 'bot',
                    text: flowItem.activity,
                    timestamp: timestampIso,
                });
            }
            if (flowItem.type === 5) {
                varObj._speechHistory.push({
                    role: 'client',
                    text: flowItem.activity,
                    timestamp: timestampIso,
                });
            }
        }
        varObj._lastSpeakFlowIndex = flowSize;
    },

    /**
     * @param {Array<{role:string,text:string}>} utterances Utterances to stringify.
     * @returns {string} Compact string, or empty string when no utterances.
     */
    toCompactFormat: function (utterances) {
        if (!Array.isArray(utterances) || utterances.length === 0) return '';
        var compact = utterances
            .map(function (item) {
                var prefix = item.role === 'bot' ? 'bot: ' : 'client: ';
                return prefix + item.text;
            })
            .join(' | ');
        if (compact.length > 2000) compact = compact.substring(0, 2000) + '... [truncated]';
        return this.sanitize(compact);
    },

    /**
     * @param {string} text Input text.
     * @returns {string} Sanitized text.
     */
    sanitize: function (text) {
        if (!text) return '';
        if (typeof sanitizeText !== 'undefined') {
            return sanitizeText(text);
        } else if (typeof normalizeText !== 'undefined') {
            var normalized = normalizeText(text);
            return normalized
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t');
        } else {
            return text
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t');
        }
    },

    /**
     * @param {Object} varObj Session variable object.
     * @param {string} format Optional "array" or "compact".
     * @returns {Array|String|Object} History in the requested format.
     */
    getHistory: function (varObj, format) {
        if (!Array.isArray(varObj._speechHistory)) {
            return format === 'array' ? [] : format === 'compact' ? '' : { array: [], compact: '' };
        }
        if (format === 'array') return varObj._speechHistory.slice();
        if (format === 'compact') return this.toCompactFormat(varObj._speechHistory);
        return {
            array: varObj._speechHistory.slice(),
            compact: this.toCompactFormat(varObj._speechHistory),
        };
    },

    /**
     * @param {Object} varObj Session variable object.
     * @param {number} limit Optional max number of items from the end.
     * @returns {Array<string>} Array of client texts.
     */
    getClientUtterances: function (varObj, limit) {
        if (!Array.isArray(varObj._speechHistory)) return [];
        var clientOnly = varObj._speechHistory
            .filter(function (item) {
                return item.role === 'client';
            })
            .map(function (item) {
                return item.text;
            });
        if (typeof limit === 'number' && limit > 0) return clientOnly.slice(-limit);
        return clientOnly;
    },

    /**
     * @param {Object} varObj Session variable object.
     * @param {number} count Number of utterances, default 5.
     * @param {string} format Optional "array" or "compact".
     * @returns {Array|String|Object} Recent utterances in requested format.
     */
    getLatestTurns: function (varObj, count, format) {
        this.ensure(varObj);
        if (!Array.isArray(varObj._speechHistory) || varObj._speechHistory.length === 0) {
            return format === 'array' ? [] : format === 'compact' ? '' : { array: [], compact: '' };
        }
        var turnCount = typeof count === 'number' && count > 0 ? count : 5;
        var latest = varObj._speechHistory.slice(-turnCount);
        if (format === 'array') return latest;
        if (format === 'compact') return this.toCompactFormat(latest);
        return { array: latest, compact: this.toCompactFormat(latest) };
    },

    /**
     * @param {Object} varObj Session variable object.
     * @param {Object} segmentState Object with currentSegment string.
     * @param {string} format Optional format parameter (for backward compatibility).
     * @returns {string|null} Compact cumulative segment transcript or null.
     */
    getSegmentSpeech: function (varObj, segmentState, format) {
        // Check if speech logging is enabled (requires both flags to be true)
        if (
            !varObj ||
            varObj.speechHistoryActive === false ||
            varObj.speechLoggingActive === false ||
            varObj.logSegmentActive === false
        ) {
            return null;
        }

        this.ensure(varObj);
        var currentSegmentName =
            segmentState && segmentState.currentSegment ? segmentState.currentSegment : '';

        if (!varObj._lastSpeechSegmentName && currentSegmentName) {
            varObj._segmentSpeechStartIndex = varObj._speechHistory
                ? varObj._speechHistory.length
                : 0;
            varObj._lastSpeechSegmentName = currentSegmentName;
            varObj._segmentSpeechCache = '';
        } else if (currentSegmentName && currentSegmentName !== varObj._lastSpeechSegmentName) {
            Logger.warn('getSegmentSpeech: Segment name mismatch detected', {
                currentSegmentName: currentSegmentName,
                _lastSpeechSegmentName: varObj._lastSpeechSegmentName,
                note: 'This may indicate speech is being retrieved after segment transition',
            });
        }

        var segmentUtterances = varObj._speechHistory
            ? varObj._speechHistory.slice(varObj._segmentSpeechStartIndex)
            : [];
        if (!segmentUtterances.length) {
            return varObj._segmentSpeechCache || null;
        }

        var compact = this.toCompactFormat(segmentUtterances);
        varObj._segmentSpeechCache = compact;
        return compact || null;
    },

    reset: function (varObj) {
        varObj._speechHistory = [];
        varObj._lastSpeakFlowIndex = 0;
        varObj._segmentSpeechStartIndex = 0;
        varObj._lastSpeechSegmentName = '';
        varObj._segmentSpeechCache = '';
    },
};

// ============================================================================
// ADAPTED INITIALIZATION FUNCTION
// ============================================================================

function initializeCallFlowContext(mode) {
    mode = mode || '';

    Logger.info('Line Identificator: ' + context.settings.lineIdentificator);
    Logger.info('initializeCallFlowContext: Starting initialization (mode: ' + mode + ')');

    var isNewer = function (a, b) {
        var aVal = a !== undefined && a !== null ? a : 0;
        var bVal = b !== undefined && b !== null ? b : 0;
        return aVal > bVal;
    };

    var syncEssentialGlobals = function () {
        environment = varObj.environment;
        routingId = varObj.routingId;
        customerName = varObj.customerName;
        customerProject = varObj.customerProject;

        if (varObj.ani !== undefined) ani = varObj.ani;
        if (varObj.dnis !== undefined) dnis = varObj.dnis;
        if (varObj.debugCall !== undefined) debugCall = varObj.debugCall;

        Logger.info(
            'initializeCallFlowContext: Globals synced - ' + customerName + '/' + customerProject
        );
    };

    var sVarObj = getNestedValue(context, 'session.variables.varObj');
    var sSegmentState = getNestedValue(context, 'session.variables.segmentState');

    var localVarObjTs = getNestedValue(varObj, '_storedTimestamp') || 0;
    var sVarObjTs = getNestedValue(sVarObj, '_storedTimestamp') || 0;
    var localSegTs = getNestedValue(segmentState, '_storedTimestamp') || 0;
    var sSegTs = getNestedValue(sSegmentState, '_storedTimestamp') || 0;

    var sessionHasVarObj = isNewer(sVarObjTs, localVarObjTs);
    var sessionHasSegmentState = isNewer(sSegTs, localSegTs);

    Logger.debug(
        'initializeCallFlowContext: Session check - varObj: ' +
            sessionHasVarObj +
            ', segmentState: ' +
            sessionHasSegmentState
    );

    if (sessionHasVarObj && sessionHasSegmentState) {
        Logger.info('initializeCallFlowContext: Session Restore');

        varObj = sVarObj;
        segmentState = sSegmentState;

        varObj.redirect = false;
        if (varObj.logVarActive === undefined) varObj.logVarActive = true;
        if (varObj.logSegmentActive === undefined) varObj.logSegmentActive = true;
        if (varObj.logCdbActive === undefined) varObj.logCdbActive = true;
        if (varObj.speechHistoryActive === undefined) varObj.speechHistoryActive = true;
        if (varObj.speechLoggingActive === undefined) varObj.speechLoggingActive = true;
        if (varObj.useLLMIntentDetection === undefined) varObj.useLLMIntentDetection = false;

        syncEssentialGlobals();

        Logger.info(
            'initializeCallFlowContext: Session restored (varObj ts: ' +
                sVarObjTs +
                ', segmentState ts: ' +
                sSegTs +
                ')'
        );

        if (mode === 'full') {
            initializeRouting();
        }

        Logger.info('initializeCallFlowContext: Complete (session restore path)');
        Logger.debug(
            'initializeCallFlowContext: Restored - ' +
                varObj.customerName +
                '/' +
                varObj.customerProject +
                ', env: ' +
                varObj.environment
        );
        return;
    }
    Logger.info('initializeCallFlowContext: New Call');

    if (typeof constVarObj !== 'function') {
        Logger.error(
            'initializeCallFlowContext: Critical dependency constVarObj missing',
            {},
            null
        );
        throw new Error('initializeCallFlowContext: Critical dependency constVarObj missing');
    }

    varObj = constVarObj();
    Logger.debug('initializeCallFlowContext: Fresh varObj created');

    if (!lineMap || !(lineMap instanceof Map)) {
        Logger.error('initializeCallFlowContext: lineMap unavailable', {}, null);
    } else {
        var lineIdentificator = context.settings.lineIdentificator;
        if (!lineIdentificator) {
            Logger.warn(
                'initializeCallFlowContext: lineIdentificator not found in context.settings'
            );
        } else {
            Logger.debug(
                'initializeCallFlowContext: Looking up lineIdentificator: "' +
                    lineIdentificator +
                    '"'
            );

            var lineData = lineMap.get(lineIdentificator);
            if (!lineData || typeof lineData !== 'object') {
                Logger.warn(
                    'initializeCallFlowContext: Line data not found for ' + lineIdentificator
                );

                if (!segmentState) {
                    segmentState = {
                        currentSegment: 'ERROR_DEFAULT_ROUTE',
                        segmentResult: '',
                        previousSegment: '',
                        segmentType: 'routing',
                        params: {},
                        log: [],
                    };
                    Logger.info('initializeCallFlowContext: Error segmentState initialized');
                }
            } else {
                Logger.info('initializeCallFlowContext: Found lineData for ' + lineIdentificator);

                if (lineData.config) {
                    varObj.config = lineData.config;
                    Logger.debug(
                        'initializeCallFlowContext: Populated varObj.config from lineData'
                    );
                }

                var extractedProps = {
                    environment: lineData.environment,
                    routingId: lineData.routingId,
                    customerName: lineData.customerName,
                    customerProject: lineData.customerProject,
                    language: lineData.language,
                    defaultKeysToLog: lineData.defaultKeysToLog,
                    schedulerId: lineData.schedulerId,
                    useLLMIntentDetection: lineData.useLLMIntentDetection,
                    logVarActive: lineData.logVarActive,
                    logSegmentActive: lineData.logSegmentActive,
                    logCdbActive: lineData.logCdbActive,
                    speechHistoryActive: lineData.speechHistoryActive,
                    speechLoggingActive: lineData.speechLoggingActive,
                };

                if (lineData.customer) {
                    if (!varObj.customer) varObj.customer = {};
                    for (var key in lineData.customer) {
                        if (lineData.customer.hasOwnProperty(key)) {
                            varObj.customer[key] = lineData.customer[key];
                        }
                    }
                }

                for (var key in extractedProps) {
                    if (extractedProps.hasOwnProperty(key) && extractedProps[key] !== undefined) {
                        varObj[key] = extractedProps[key];
                    }
                }

                if (varObj.logVarActive === undefined) varObj.logVarActive = true;
                if (varObj.logSegmentActive === undefined) varObj.logSegmentActive = true;
                if (varObj.logCdbActive === undefined) varObj.logCdbActive = true;
                if (varObj.speechHistoryActive === undefined) varObj.speechHistoryActive = true;
                if (varObj.speechLoggingActive === undefined) varObj.speechLoggingActive = true;
                if (varObj.useLLMIntentDetection === undefined)
                    varObj.useLLMIntentDetection = false;

                if (!segmentState && lineData.segmentState) {
                    segmentState = deepClone(lineData.segmentState);
                    Logger.debug(
                        'initializeCallFlowContext: segmentState initialized from lineData'
                    );
                }

                Logger.info('initializeCallFlowContext: Line data extracted and applied');
            }
        }
    }

    varObj.redirect = false;

    var parseSip = function (uri) {
        if (typeof uri !== 'string') return 'unknown';
        var m = uri.match(/^sip:([^@;]+)/);
        return m ? m[1] : 'unknown';
    };

    var callInfo = getNestedValue(context, 'callInfo') || {};
    var fromUri = callInfo.fromUri || '';
    var toUri = callInfo.toUri || '';

    ani = parseSip(fromUri);
    dnis = parseSip(toUri);

    var debugConfig = getDebugConfig(varObj);
    var devNumbers = debugConfig.devNumbers || [];

    if (debug) {
        if (context.callInfo.direction === 'outbound') {
            var tmp = ani;
            ani = dnis;
            dnis = tmp;
        }
        debugCall = true;
    } else {
        if (context.callInfo.direction === 'outbound') {
            var tmp = ani;
            ani = dnis;
            dnis = tmp;
        }
        debugCall = devNumbers.indexOf(ani) !== -1;
    }
    Object.assign(varObj, { ani: ani, dnis: dnis, debugCall: debugCall });
    Logger.info(
        'initializeCallFlowContext: ANI/DNIS extracted - ANI: ' +
            ani +
            ', DNIS: ' +
            dnis +
            ', debugCall: ' +
            debugCall
    );

    syncEssentialGlobals();

    if (mode === 'full') {
        initializeRouting();
    }

    Logger.info('initializeCallFlowContext: Complete (fresh creation path)');
    Logger.debug(
        'initializeCallFlowContext: Created - ' +
            varObj.customerName +
            '/' +
            varObj.customerProject +
            ', env: ' +
            varObj.environment
    );
}

// ============================================================================
// INITIALIZE ROUTING - Build/Rebuild Routing Structures
// ============================================================================

/**
 * Initialize or rebuild routing structures (segmentDic and intentDefinitions)
 * based on current customer context.
 *
 * This function is idempotent - it checks if routing structures are already
 * initialized for the current customer context and only rebuilds if:
 * - Structures don't exist yet
 * - Customer context has changed (segment, status, language, etc.)
 *
 * Use cases:
 * 1. Automatically called by initializeCallFlowContext('full')
 * 2. Manually called after customer identification changes context
 * 3. Manually called when customer segment/status updates mid-call
 *
 * Example:
 *   initializeCallFlowContext();  // Initial setup
 *   // ... customer identification happens
 *   varObj.customer.segment = 'PROF';
 *   varObj.customer.status = 'STANDARD';
 *   initializeRouting();  // Rebuild for new context
 *
 * @throws {Error} If varObj is not initialized
 */
function initializeRouting() {
    // Validate varObj exists
    if (!varObj || typeof varObj !== 'object') {
        Logger.error(
            'initializeRouting: varObj not initialized. Call initializeCallFlowContext() first.',
            {},
            null
        );
        throw new Error('initializeRouting: varObj not initialized');
    }

    // Build current customer context signature
    var currentContext =
        (varObj.customerName || '') +
        '_' +
        (varObj.customerProject || '') +
        '_' +
        ((varObj.customer && varObj.customer.segment) || 'UNKNOWN') +
        '_' +
        ((varObj.customer && varObj.customer.status) || 'UNKNOWN') +
        '_' +
        (varObj.language || 'NL');

    // Check if already initialized for this context (idempotency)
    if (_lastRoutingContext === currentContext && segmentDic && intentDefinitions) {
        Logger.info('initializeRouting: Already initialized for context: ' + currentContext);
        return;
    }

    Logger.debug('initializeRouting: Building routing structures for context: ' + currentContext);

    if (typeof getSegmentDic === 'function') {
        segmentDic = getSegmentDic(varObj);
        if (segmentDic && segmentDic.size) {
            Logger.debug(
                'initializeRouting: segmentDic initialized (' + segmentDic.size + ' segments)'
            );
        } else {
            Logger.warn('initializeRouting: segmentDic initialization failed or returned empty');
        }
    } else {
        Logger.warn('initializeRouting: getSegmentDic function not available');
    }

    if (typeof initializeIntentDefinitions === 'function') {
        var csvContent = typeof csvInput !== 'undefined' ? csvInput : null;
        intentDefinitions = initializeIntentDefinitions(varObj, segmentDic, csvContent);
        if (intentDefinitions && Object.keys(intentDefinitions).length > 0) {
            Logger.debug(
                'initializeRouting: intentDefinitions initialized (' +
                    Object.keys(intentDefinitions).length +
                    ' intents)'
            );
        } else {
            Logger.warn(
                'initializeRouting: intentDefinitions initialization failed or returned empty'
            );
        }
    } else {
        Logger.warn('initializeRouting: initializeIntentDefinitions function not available');
    }

    _lastRoutingContext = currentContext;

    Logger.info('initializeRouting: Complete for context: ' + currentContext);
}

// ============================================================================
// ADAPTED STORE FUNCTION
// ============================================================================

/**
 * Enhanced storeSessionVariables for flat lineMap structure
 * Stores varObj and segmentState with timestamps
 * No changes needed for flat structure, but keeping it consistent
 */
function storeSessionVariables() {
    var timestamp = Date.now();
    if (!context.session.variables) {
        context.session.variables = {};
    }

    if (cdbLog) {
        resolveCdbDicId(cdbLog);
    }
    varObj._storedTimestamp = timestamp;
    segmentState._storedTimestamp = timestamp;
    varObj.redirect = true;

    context.session.variables.varObj = varObj;
    context.session.variables.segmentState = segmentState;
    Logger.info(
        `storeSessionVariablesFlat: stored varObj and segmentState to session (ts: ${timestamp})`
    );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Deep clone an object (ES5.1 compatible)
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (obj instanceof Array) {
        var arr = [];
        for (var i = 0; i < obj.length; i++) {
            arr[i] = deepClone(obj[i]);
        }
        return arr;
    }
    var cloned = {};
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}

/**
 * Deep merge objects (target is modified, returns target)
 * Later objects override earlier ones
 */
function deepMerge(target) {
    var args = Array.prototype.slice.call(arguments, 1);
    for (var i = 0; i < args.length; i++) {
        var source = args[i];
        if (source && typeof source === 'object') {
            for (var key in source) {
                if (source.hasOwnProperty(key)) {
                    if (
                        source[key] &&
                        typeof source[key] === 'object' &&
                        !(source[key] instanceof Array) &&
                        !(source[key] instanceof Date)
                    ) {
                        if (!target[key] || typeof target[key] !== 'object') {
                            target[key] = {};
                        }
                        deepMerge(target[key], source[key]);
                    } else {
                        target[key] = deepClone(source[key]);
                    }
                }
            }
        }
    }
    return target;
}

// ============================================================================
// LOGGER
// ============================================================================
Logger = {
    config: {
        enabled: true,
        activeLevel: 'INFO', // DEBUG, INFO, WARN, ERROR
        timeout: 10000,
        maxStackLines: 10,
        maxStackLength: 3000,
        maxBodySize: 10000,
        apiBaseUrl: 'https://api.n-allo.be',
        apiPath: '/api/EventLog',
        defaultEnvironment: 'prd',
        logAllApiCalls: true,
        slowApiThresholdMs: 4000,
        bufferEnabled: true,
        bufferMaxSize: 3,
        bufferFlushOnError: true,
        bufferFlushOnCallEnd: true,
        flushRetryCount: 2,
        buildApiUrl: function (env) {
            return this.apiBaseUrl + '/ivrapi-' + (env || this.defaultEnvironment) + this.apiPath;
        },
    },

    shouldLog: function (severity) {
        var levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        var activeIndex = levels.indexOf(this.config.activeLevel);
        var requestIndex = levels.indexOf(severity);

        if (activeIndex === -1) {
            activeIndex = 1;
        }
        return requestIndex >= activeIndex;
    },

    getStatusCode: function (result) {
        if (!result) return null;
        if (typeof result.statusCode !== 'undefined' && result.statusCode !== null) {
            return result.statusCode;
        }
        if (typeof result.status !== 'undefined' && result.status !== null) {
            return result.status;
        }
        return null;
    },

    isSuccessStatus: function (status) {
        if (status === null || typeof status === 'undefined') return false;
        // Type check: must be number
        if (typeof status !== 'number') return false;
        var statusStr = String(status);
        return statusStr.charAt(0) === '2';
    },

    sanitizeForLog: function (obj, maxSize) {
        maxSize = maxSize || this.config.maxBodySize;

        if (obj === null) return 'null';
        if (typeof obj === 'undefined') return 'undefined';

        try {
            var replacer = function (key, value) {
                if (typeof value === 'function') {
                    return '[Function: ' + (value.name || 'anonymous') + ']';
                }
                return value;
            };

            var json = JSON.stringify(obj, replacer);
            if (!json || json === 'null') return '{}';

            var truncMarker = '... (truncated)';
            var truncMarkerLen = truncMarker.length;

            if (maxSize <= truncMarkerLen) {
                return '{}';
            }

            var maxContentSize = maxSize - truncMarkerLen;

            if (json.length > maxSize) {
                return json.substring(0, maxContentSize) + truncMarker;
            }
            return json;
        } catch (e) {
            return '[Unserializable: ' + e.message + ']';
        }
    },

    extractStack: function (err) {
        if (!err || !err.stack) return null;
        try {
            var lines = err.stack.split('\n').slice(0, this.config.maxStackLines);
            var trace = lines.join('\n');
            if (trace.length > this.config.maxStackLength) {
                return trace.substring(0, this.config.maxStackLength) + '...';
            }
            return trace;
        } catch (e) {
            return null;
        }
    },

    getTimestamp: function () {
        return new Date().toISOString();
    },

    categorizeError: function (error, context) {
        var category = {
            type: 'UNKNOWN',
            source: 'APPLICATION',
            severity: 'ERROR',
        };

        if (context && context.errorCategory) {
            category.type = context.errorCategory;
        }
        if (context && context.errorSource) {
            category.source = context.errorSource;
        }

        var status = context && context.status;
        if (status && typeof status === 'number') {
            var statusMap = {
                408: { type: 'TIMEOUT', source: 'NETWORK' },
                504: { type: 'TIMEOUT', source: 'NETWORK' },
                503: { type: 'SERVICE_UNAVAILABLE', source: 'API' },
                429: { type: 'RATE_LIMIT', source: 'API' },
                404: { type: 'NOT_FOUND', source: 'REQUEST' },
                401: { type: 'AUTH_ERROR', source: 'REQUEST' },
                403: { type: 'AUTH_ERROR', source: 'REQUEST' },
            };

            if (!context || !context.errorCategory) {
                if (statusMap[status]) {
                    category.type = statusMap[status].type;
                    category.source = statusMap[status].source;
                } else if (status >= 500) {
                    category.type = 'SERVER_ERROR';
                    category.source = 'API';
                } else if (status >= 400) {
                    category.type = 'CLIENT_ERROR';
                    category.source = 'REQUEST';
                }
            }
        }

        if (
            error &&
            (!status || typeof status !== 'number') &&
            (!context || !context.errorCategory)
        ) {
            var errorName = error.name || '';
            var errorMsg = (error.message || '').toLowerCase();

            if (
                errorName === 'TypeError' ||
                errorName === 'ReferenceError' ||
                errorName === 'SyntaxError'
            ) {
                category.type = errorName === 'SyntaxError' ? 'PARSING_ERROR' : 'CODE_ERROR';
                category.source = 'APPLICATION';
                category.severity = 'CRITICAL';
            } else if (errorName === 'TimeoutError' || errorMsg.indexOf('timeout') !== -1) {
                category.type = 'TIMEOUT';
                category.source = 'NETWORK';
            } else if (
                errorMsg.indexOf('network') !== -1 ||
                errorMsg.indexOf('connection') !== -1
            ) {
                category.type = 'NETWORK_ERROR';
                category.source = 'NETWORK';
            }
        }
        return category;
    },

    /**
     * @param {Object} params - Parameters object
     * @param {string} params.eventType - Event type (LOGGED, API_ERROR)
     * @param {string} params.severity - Severity level (DEBUG, INFO, WARN, ERROR)
     * @param {string} params.message - Log message
     * @param {Object} params.context - Additional context data
     * @param {Error|Object} params.error - Error object (optional)
     * @returns {Object} Event detail object
     */
    buildEventDetail: function (params) {
        var eventType = params.eventType;
        var severity = params.severity;
        var message = params.message;
        // Ensure message is string, default to empty string (not null)
        if (message === null || typeof message === 'undefined') {
            message = '';
        } else {
            message = String(message);
        }
        var context = params.context || {};
        var error = params.error;
        var err = null;
        var stack = null;

        if (error) {
            if (error instanceof Error) {
                err = error;
            } else if (typeof error === 'object' && error.message) {
                err = error;
            } else {
                err = new Error(String(error));
            }
        }

        if (severity === 'ERROR' && err && err instanceof Error) {
            stack = this.extractStack(err);
        } else {
            stack = null;
        }

        var extras = {};

        if (error) {
            var errorCategory = this.categorizeError(error, context);

            extras.errorType = errorCategory.type;
            extras.errorSource = errorCategory.source;
            extras.errorSeverity = errorCategory.severity;

            if (error.message) extras.errorMessage = error.message;
            if (error.name) extras.errorName = error.name;
        }

        if (context && typeof context === 'object') {
            for (var key in context) {
                if (
                    Object.prototype.hasOwnProperty.call(context, key) &&
                    key !== 'endpoint' &&
                    key !== 'method' &&
                    key !== 'status' &&
                    key !== 'duration'
                ) {
                    extras[key] = context[key];
                }
            }
        }

        var eventDetail = {
            eventType: eventType || null,
            severity: severity || null,
            message: message,
            stackTrace: stack,
            segment:
                (typeof segmentState !== 'undefined' &&
                    segmentState &&
                    segmentState.currentSegment) ||
                null,
            segmentResult:
                (typeof segmentState !== 'undefined' &&
                    segmentState &&
                    segmentState.segmentResult) ||
                null,
            endpoint: context.endpoint || null,
            method: context.method || null,
            statusCode: typeof context.status === 'number' ? context.status : null,
            duration: typeof context.duration === 'number' ? context.duration : null,
            extrasJSON: this.sanitizeForLog(extras),
            eventTimestamp: this.getTimestamp(),
            createdBy: '',
        };
        return eventDetail;
    },

    _sendEventsToAPI: function (events, retryAttempt) {
        retryAttempt = retryAttempt || 0;

        var vo = typeof varObj !== 'undefined' ? varObj : null;
        var env =
            (vo && vo.environment) ||
            (typeof environment !== 'undefined' && environment) ||
            this.config.defaultEnvironment;
        var apiUrl = this.config.buildApiUrl(env);

        var requestBody = {
            callIdKey: vo ? vo.callIdKey : null,
            routingId: vo ? vo.routingId : null,
            events: events,
        };

        var headers = typeof _headers !== 'undefined' ? _headers : null;
        var self = this;

        return jsonHttpRequest(
            apiUrl,
            { method: 'POST', timeout: this.config.timeout },
            headers,
            requestBody
        ).then(
            function (result) {
                return {
                    success: true,
                    error: null,
                    retriesExceeded: false,
                    retryAttempt: retryAttempt,
                    response: result,
                };
            },
            function (error) {
                if (retryAttempt < self.config.flushRetryCount) {
                    return self._sendEventsToAPI(events, retryAttempt + 1);
                }
                return {
                    success: false,
                    error: error,
                    retriesExceeded: true,
                    retryAttempt: retryAttempt,
                };
            }
        );
    },

    postEventToAPI: function (eventObj) {
        if (!this.config.enabled) {
            return Promise.resolve({ success: true, skipped: true });
        }

        var hasContext =
            typeof context !== 'undefined' && context.session && context.session.variables;
        var effectiveBufferEnabled = this.config.bufferEnabled && hasContext;

        if (!effectiveBufferEnabled) {
            return this._sendEventsToAPI([eventObj], 0);
        }

        var severity = eventObj.severity || '';
        var isError = severity === 'ERROR';

        if (isError && this.config.bufferFlushOnError) {
            this.addToBuffer(eventObj);
            return this.flushBuffer();
        }

        this.addToBuffer(eventObj);

        return Promise.resolve({ success: true, buffered: true, bufferSize: this.getBufferSize() });
    },

    getBuffer: function () {
        if (typeof context !== 'undefined' && context.session && context.session.variables) {
            if (!context.session.variables._loggerBuffer) {
                context.session.variables._loggerBuffer = [];
            }
            return context.session.variables._loggerBuffer;
        }
        return null;
    },

    clearBuffer: function () {
        if (
            typeof context !== 'undefined' &&
            context &&
            context.session &&
            context.session.variables
        ) {
            context.session.variables._loggerBuffer = [];
        }
    },

    getBufferSize: function () {
        var buffer = this.getBuffer();
        return buffer ? buffer.length : 0;
    },

    addToBuffer: function (eventObj) {
        if (!this.config.bufferEnabled) {
            return false;
        }

        var buffer = this.getBuffer();
        if (!buffer || !Array.isArray(buffer)) {
            return false;
        }
        buffer.push(eventObj);
        if (buffer.length >= this.config.bufferMaxSize) {
            this.flushBuffer();
            return true;
        }
        return true;
    },

    flushBuffer: function (retryAttempt) {
        retryAttempt = retryAttempt || 0;
        var buffer = this.getBuffer();
        var bufferSize = buffer ? buffer.length : 0;

        if (!buffer || buffer.length === 0) {
            return Promise.resolve({ success: true, skipped: true, message: 'Buffer empty' });
        }

        if (!this.config.enabled) {
            this.clearBuffer();
            return Promise.resolve({ success: true, skipped: true, message: 'Logger disabled' });
        }

        var eventsToSend = [];
        for (var i = 0; i < buffer.length; i++) {
            eventsToSend.push(buffer[i]);
        }
        this.clearBuffer();

        if (eventsToSend.length === 0) {
            return Promise.resolve({ success: true, skipped: true, message: 'No events to send' });
        }

        if (this.config.activeLevel === 'DEBUG') {
            var sampleEvents = eventsToSend.length <= 3 ? eventsToSend : eventsToSend.slice(0, 3);
            this.debug('Logger: Flushing buffer', {
                bufferSize: eventsToSend.length,
                firstEvents: sampleEvents,
                retryAttempt: retryAttempt,
            });
        }

        var self = this;
        return this._sendEventsToAPI(eventsToSend, retryAttempt).then(function (result) {
            if (!result.success && result.retriesExceeded) {
                if (self.config.activeLevel === 'DEBUG') {
                    var sampleEvents =
                        eventsToSend.length <= 3 ? eventsToSend : eventsToSend.slice(0, 3);
                    self.debug('Logger: Buffer flush failed after all retries', {
                        eventsCount: eventsToSend.length,
                        firstEvents: sampleEvents,
                        retryAttempt: result.retryAttempt,
                        maxRetries: self.config.flushRetryCount,
                    });
                }
            }
            return result;
        });
    },

    /**
     * Debug logging - local only, no API posting
     * @param {string} message - Log message
     * @param {Object} context - Optional context object
     */
    debug: function (message, context) {
        context = context || {};
        if (!this.shouldLog('DEBUG')) return;

        var msg = '[Logger:DEBUG] ' + message;
        if (context && typeof context === 'object' && Object.keys(context).length > 0) {
            msg += ' | Context: ' + this.sanitizeForLog(context, 300);
        }
        log_debug(msg);
    },

    /**
     * Info logging - local only, no API posting
     * @param {string} message - Log message
     * @param {Object} context - Optional context object
     */
    info: function (message, context) {
        context = context || {};
        if (!this.shouldLog('INFO')) return;

        var msg = '[Logger:INFO] ' + message;
        if (context && typeof context === 'object' && Object.keys(context).length > 0) {
            msg += ' | Context: ' + this.sanitizeForLog(context, 300);
        }
        log_debug(msg);
    },

    /**
     * Warning logging - local + API posting
     * @param {string} message - Warning message
     * @param {Object} context - Optional context object
     */
    warn: function (message, context) {
        context = context || {};
        if (!this.shouldLog('WARN')) return;

        var msg = '[Logger:WARN] ' + message;
        if (context && typeof context === 'object' && Object.keys(context).length > 0) {
            msg += ' | Context: ' + this.sanitizeForLog(context, 300);
        }
        log_debug(msg);

        var evt = this.buildEventDetail({
            eventType: 'LOGGED',
            severity: 'WARN',
            message: message,
            context: context,
        });

        this.postEventToAPI(evt);
    },

    /**
     * Error logging - local + API posting with full error details
     * @param {string} message - Error message
     * @param {Object} context - Optional context object (may include endpoint, status, etc.)
     * @param {Error|Object} errorObj - Error object with stack trace
     */
    error: function (message, context, errorObj) {
        context = context || {};
        if (!this.shouldLog('ERROR')) return;

        var msg = '[Logger:ERROR] ' + message;
        if (errorObj && errorObj.message) {
            msg += ' | Error: ' + errorObj.message;
        }
        if (context && typeof context === 'object' && Object.keys(context).length > 0) {
            msg += ' | Context: ' + this.sanitizeForLog(context, 300);
        }
        if (errorObj && errorObj.stack) {
            var stack = this.extractStack(errorObj);
            if (stack) {
                msg += ' | Stack: ' + stack;
            }
        }
        log_error(msg);

        var evt = this.buildEventDetail({
            eventType: 'LOGGED',
            severity: 'ERROR',
            message: message,
            context: context,
            error: errorObj,
        });

        this.postEventToAPI(evt);
    },

    /**
     * API-specific logging - for tracking external API calls
     * Automatically determines if it's an error based on status code
     * @param {string} message - API call description
     * @param {Object} context - Context with endpoint, status, duration, etc.
     * @param {Error|Object} errorObj - Error object if API call failed
     */
    API: function (message, context, errorObj) {
        context = context || {};
        var status = context && typeof context.status === 'number' ? context.status : null;
        var ok = this.isSuccessStatus(status);
        var isError = !!errorObj || !ok;

        var msg = '[Logger:API' + (isError ? '_ERROR' : '') + '] ' + message;
        msg += ' | Status: ' + (status || 'N/A');
        if (context.endpoint) {
            msg += ' | Endpoint: ' + context.endpoint;
        }
        if (context.duration) {
            msg += ' | Duration: ' + context.duration + 'ms';
        }
        if (errorObj && errorObj.message) {
            msg += ' | Error: ' + errorObj.message;
        }

        log_debug(msg);

        // Always log errors to API
        if (isError) {
            var evt = this.buildEventDetail({
                eventType: 'API_ERROR',
                severity: 'ERROR',
                message: message,
                context: context,
                error: errorObj,
            });
            this.postEventToAPI(evt);
        }
        // Log successful API calls to API if logAllApiCalls is enabled OR if duration exceeds threshold
        else if (
            this.config.logAllApiCalls ||
            (this.config.slowApiThresholdMs &&
                context.duration &&
                context.duration > this.config.slowApiThresholdMs)
        ) {
            var evt = this.buildEventDetail({
                eventType: 'API_CALL',
                severity: 'INFO',
                message: message,
                context: context,
                error: null,
            });
            this.postEventToAPI(evt);
        }
    },

    /**
     * Configure logger at runtime with validation
     * @param {Object} config - Configuration object with properties to update
     * @example
     *   Logger.configure({ activeLevel: "DEBUG" });
     */
    configure: function (config) {
        if (!config || typeof config !== 'object') return;

        var validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

        for (var key in config) {
            if (
                Object.prototype.hasOwnProperty.call(config, key) &&
                Object.prototype.hasOwnProperty.call(this.config, key)
            ) {
                var value = config[key];
                var isValid = true;

                // Validate specific config keys
                if (key === 'activeLevel') {
                    if (validLevels.indexOf(value) === -1) {
                        log_debug(
                            '[Logger] Invalid activeLevel: ' + value + ', defaulting to INFO'
                        );
                        value = 'INFO';
                    }
                } else if (key === 'bufferMaxSize') {
                    if (typeof value !== 'number' || value <= 0) {
                        log_debug(
                            '[Logger] Invalid bufferMaxSize: ' +
                                value +
                                ', keeping current: ' +
                                this.config.bufferMaxSize
                        );
                        isValid = false;
                    }
                } else if (key === 'timeout') {
                    if (typeof value !== 'number' || value <= 0) {
                        log_debug(
                            '[Logger] Invalid timeout: ' +
                                value +
                                ', keeping current: ' +
                                this.config.timeout
                        );
                        isValid = false;
                    }
                } else if (key === 'flushRetryCount') {
                    if (typeof value !== 'number' || value < 0) {
                        log_debug(
                            '[Logger] Invalid flushRetryCount: ' +
                                value +
                                ', keeping current: ' +
                                this.config.flushRetryCount
                        );
                        isValid = false;
                    }
                } else if (
                    key === 'enabled' ||
                    key === 'bufferEnabled' ||
                    key === 'bufferFlushOnError' ||
                    key === 'bufferFlushOnCallEnd'
                ) {
                    if (typeof value !== 'boolean') {
                        log_debug(
                            '[Logger] Invalid boolean for ' +
                                key +
                                ': ' +
                                value +
                                ', keeping current: ' +
                                this.config[key]
                        );
                        isValid = false;
                    }
                }

                if (isValid) {
                    this.config[key] = value;
                }
            }
        }

        if (this.config.activeLevel === 'DEBUG') {
            log_debug('[Logger] Configuration updated: ' + this.sanitizeForLog(config));
        }
    },
};

// ============================================================================
// LOGGER WRAPPERS
// ============================================================================

/**
 * Debug logging - local only, no API posting
 * @param {string} message - Log message
 * @param {Object} context - Optional context object
 */
function logDebug(message, context) {
    if (typeof Logger !== 'undefined' && Logger && Logger.debug) {
        Logger.debug(message, context);
    }
}

/**
 * Info logging - local only, no API posting
 * @param {string} message - Log message
 * @param {Object} context - Optional context object
 */
function logInfo(message, context) {
    if (typeof Logger !== 'undefined' && Logger && Logger.info) {
        Logger.info(message, context);
    }
}

/**
 * Warning logging - local + API posting
 * @param {string} message - Warning message
 * @param {Object} context - Optional context object
 */
function logWarn(message, context) {
    if (typeof Logger !== 'undefined' && Logger && Logger.warn) {
        Logger.warn(message, context);
    }
}

/**
 * Error logging - local + API posting with full error details
 * @param {string} message - Error message
 * @param {Object} context - Optional context object (may include endpoint, status, etc.)
 * @param {Error|Object} errorObj - Error object with stack trace
 */
function logError(message, context, errorObj) {
    if (typeof Logger !== 'undefined' && Logger && Logger.error) {
        Logger.error(message, context, errorObj);
    }
}

/**
 * API-specific logging - for tracking external API calls
 * Automatically determines if it's an error based on status code
 * @param {string} message - API call description
 * @param {Object} context - Context with endpoint, status, duration, etc.
 * @param {Error|Object} errorObj - Error object if API call failed
 */
function logAPI(message, context, errorObj) {
    if (typeof Logger !== 'undefined' && Logger && Logger.API) {
        Logger.API(message, context, errorObj);
    }
}

/*
 * Deep clone an object, array, or primitive value
 * Handles Date objects and nested structures
 * @param {*} obj - Value to clone
 * @returns {*} Cloned value
 */
function cloneObject(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(cloneObject);
    var cloned = {};
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = cloneObject(obj[key]);
        }
    }
    return cloned;
}

/*
 * Merge two objects, with properties from b overriding properties from a
 * Creates a new object without mutating inputs
 * @param {object} a - First object (base)
 * @param {object} b - Second object (overrides)
 * @returns {object} Merged object
 */
function mergeObjects(a, b) {
    var r = cloneObject(a || {});
    for (var key in b) {
        if (b.hasOwnProperty(key)) {
            r[key] = b[key];
        }
    }
    return r;
}
