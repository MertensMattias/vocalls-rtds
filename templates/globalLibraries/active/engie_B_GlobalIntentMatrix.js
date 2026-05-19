// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================

/**
 * Extract intent configuration from varObj.config
 * Runtime-configurable per line/call
 *
 * @param {object} varObj - Variable object with config
 * @returns {object} Intent configuration with defaults
 */
function getIntentConfig(varObj) {
    var cfg = (varObj && varObj.config) || {};
    var intents = cfg.intents || {};
    var routing = cfg.routing || {};

    return {
        // Baseline settings
        baselineCustomerType: intents.baselineCustomerType || 'RESI',
        baselineCustomerStatus: intents.baselineCustomerStatus || 'NOT_IDENTIFIED',

        // Routing settings
        customerTypes: routing.customerTypes || ['RESI', 'PROF'],
        customerStatuses: routing.customerStatuses || [
            'NOT_IDENTIFIED',
            'STANDARD',
            'RETENTION',
            'LEGAL_RECOVERY',
            'KALUZA_MIGRATED',
            'FROZEN_KALUZA',
        ],
        fallbackSegment: routing.fallbackSegment || 'RESI_OTHER',
        errorSegment: routing.errorSegment || 'ERROR_DEFAULT_ROUTE',
        fallbackLanguage: routing.fallbackLanguage || 'NL',
        supportedLanguages: routing.supportedLanguages || ['NL', 'FR', 'DE', 'EN'],

        // Intent settings
        segments: intents.segments || ['GET_INTENT', 'NEW_INTENT', 'OTHER_INTENT'],
        metaKeys: intents.metaKeys || ['segmentType', 'segmentConfig', 'cdb'],
        segmentResetCodes: routing.segmentResetCodes || [
            'GET_INTENT',
            'NEW_INTENT',
            'OTHER_INTENT',
        ],
        cacheFile: intents.cacheFile || 'intentStore.json',
        combinations: intents.combinations || [
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
        applicationOrder: intents.applicationOrder || [
            'STANDARD',
            'RETENTION',
            'LEGAL_RECOVERY',
            'FROZEN_KALUZA',
            'MIGRATED_KALUZA',
        ],

        // Feature flags
        useDynamicIntents:
            intents.useDynamicIntents !== undefined ? intents.useDynamicIntents : true,
        enableLLMMode: intents.enableLLMMode || false,
        forceReloadCsvInput: intents.forceReloadCsvInput || false,
        skipBaselineIfTarget:
            intents.skipBaselineIfTarget !== undefined ? intents.skipBaselineIfTarget : true,
    };
}

/**
 * Build customer context key for caching
 * Format: "PROF_STANDARD_NL"
 *
 * @param {string} customerType - Customer type (RESI/PROF)
 * @param {string} customerStatus - Customer status
 * @param {string} language - Language code
 * @returns {string} Context key
 */
function buildContextKey(customerType, customerStatus, language) {
    return (
        (customerType || 'RESI') +
        '_' +
        (customerStatus || 'NOT_IDENTIFIED') +
        '_' +
        (language || 'NL')
    );
}

/**
 * Build minimal cache key for fast lookup
 * Avoids expensive config extraction - used for early cache check optimization
 *
 * @param {object} varObj - Variable object
 * @returns {string} Quick context key
 */
function buildQuickContextKey(varObj) {
    var customer = (varObj && varObj.customer) || {};
    var type = (customer.segment || customer.type || 'RESI').toUpperCase();
    var status = (customer.status || 'NOT_IDENTIFIED').toUpperCase();
    var language = ((varObj && varObj.language) || 'NL').toUpperCase();

    return type + '_' + status + '_' + language;
}

/**
 * Log intent definitions summary with sample
 *
 * @param {object} intentDefinitions - Intent definitions to log
 * @param {string} source - Source type: 'CACHED' | 'BUILT' | 'FALLBACK'
 * @param {string} contextKey - Context key or reason
 * @param {string} [reason] - Optional reason for fallback
 */
function logIntentDefinitions(intentDefinitions, source, contextKey, reason) {
    if (!intentDefinitions || typeof intentDefinitions !== 'object') {
        Logger.warn('logIntentDefinitions: Invalid input');
        return;
    }

    var keys = Object.keys(intentDefinitions);
    var reasonText = reason ? ' (' + reason + ')' : '';

    Logger.info(
        'Using ' +
            source +
            ' intentDefinitions: ' +
            keys.length +
            ' intents' +
            reasonText +
            ' for context: ' +
            contextKey
    );

    for (var i = 0; i < Math.min(5, keys.length); i++) {
        var key = keys[i];
        var nextCode = intentDefinitions[key].nextCode || 'N/A';
        Logger.debug('  [' + source + '] "' + key + '" -> ' + nextCode);
    }
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/**
 * Get intentStore from session or storage
 *
 * @returns {object|null} IntentStore or null
 */
function getIntentStore() {
    try {
        if (context.session.variables && context.session.variables.intentStore) {
            return context.session.variables.intentStore;
        }

        var snapshotResult = Storage.readFile('intentStore.json');
        if (snapshotResult && snapshotResult.success && snapshotResult.text) {
            try {
                var intentStore = JSON.parse(snapshotResult.text);
                context.session.variables.intentStore = intentStore;
                return intentStore;
            } catch (parseError) {
                Logger.error('getIntentStore: Parse error', {}, parseError);
                return null;
            }
        }

        return null;
    } catch (error) {
        Logger.error('getIntentStore: Error', {}, error);
        return null;
    }
}

/**
 * Save intentStore to session and storage
 *
 * @param {object} intentStore - IntentStore to save
 * @returns {object} { sessionSuccess, snapshotSuccess }
 */
function saveIntentStore(intentStore) {
    try {
        var result = { sessionSuccess: false, snapshotSuccess: false };

        if (context.session.variables) {
            context.session.variables.intentStore = intentStore;
            result.sessionSuccess = true;
        }

        Storage.writeFile('intentStore.json', JSON.stringify(intentStore));
        result.snapshotSuccess = true;

        return result;
    } catch (error) {
        Logger.error('saveIntentStore: Error', {}, error);
        return { sessionSuccess: false, snapshotSuccess: false, error: error.message };
    }
}

/**
 * Update session variables atomically
 *
 * @param {object} updates - Key-value pairs to update
 * @returns {boolean} Success status
 */
function updateSessionVariables(updates) {
    try {
        if (!context || !context.session || !context.session.variables) {
            return false;
        }

        for (var key in updates) {
            if (updates.hasOwnProperty(key)) {
                context.session.variables[key] = updates[key];
            }
        }

        return true;
    } catch (error) {
        Logger.error('updateSessionVariables: Error', {}, error);
        return false;
    }
}

// ============================================================================
// PROCESS CSV INTO INTENT STORE
// ============================================================================

/**
 * Parse CSV content into rows
 *
 * @param {string} csvContent - Raw CSV content
 * @returns {Array} Array of row objects
 */
function parseCSVRows(csvContent) {
    if (!csvContent || typeof csvContent !== 'string') {
        throw new Error('Invalid CSV content');
    }

    var lines = csvContent.split('\n');
    var rows = [];
    var headers = null;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;

        var fields = line.split(';');

        if (!headers) {
            headers = fields.map(function (f) {
                return f.trim();
            });
            continue;
        }

        if (fields.length !== headers.length) continue;

        var row = {};
        for (var j = 0; j < headers.length; j++) {
            row[headers[j]] = fields[j].trim();
        }
        rows.push(row);
    }

    return rows;
}

/**
 * Normalize CSV row
 *
 * @param {object} row - Raw CSV row
 * @param {object} config - Intent configuration
 * @returns {object} Normalized row
 */
function normalizeCSVRow(row, config) {
    if (!row || typeof row !== 'object') {
        return null;
    }

    var segment = (row.segment || '').trim();
    var segmentResult = (row.segmentResult || '').trim();
    var source = segment ? segment + '_' + segmentResult : segmentResult;

    var languages = {};
    for (var i = 0; i < config.supportedLanguages.length; i++) {
        var lang = config.supportedLanguages[i];
        var upperKey = 'nextSeg_' + lang;
        var lowerKey = 'nextSeg_' + lang.toLowerCase();
        languages[lang] = (row[upperKey] || row[lowerKey] || '').trim();
    }

    return {
        source: source,
        segment: segment,
        segmentResult: segmentResult,
        type: (row.type || '').trim().toUpperCase(),
        status: (row.status || '').trim().toUpperCase(),
        languages: languages,
    };
}

/**
 * Validate normalized row
 *
 * @param {object} row - Normalized row
 * @param {object} config - Intent configuration
 * @returns {object} { valid, errors, warnings }
 */
function validateCSVRow(row, config) {
    var result = { valid: true, errors: [], warnings: [] };

    if (!row || !row.source) {
        result.valid = false;
        result.errors.push('Source name required');
        return result;
    }

    if (config.customerTypes.indexOf(row.type) === -1) {
        result.valid = false;
        result.errors.push('Invalid type: ' + row.type);
    }

    if (config.customerStatuses.indexOf(row.status) === -1) {
        result.valid = false;
        result.errors.push('Invalid status: ' + row.status);
    }

    for (var i = 0; i < config.supportedLanguages.length; i++) {
        var lang = config.supportedLanguages[i];
        if (!row.languages[lang] || row.languages[lang].length === 0) {
            result.warnings.push('Empty language: ' + lang);
        }
    }

    return result;
}

/**
 * Process CSV content into intentStore
 * Pure function - no side effects, no storage
 *
 * @param {string} csvContent - Raw CSV content
 * @param {object} config - Intent configuration
 * @returns {object} { success, intentStore, hash, stats }
 */
function processIntentStore(csvContent, config) {
    try {
        Logger.debug('processIntentStore: Starting CSV processing');

        var rows = parseCSVRows(csvContent);
        if (rows.length === 0) {
            throw new Error('No valid CSV rows found');
        }

        // Normalize and validate
        var normalizedRows = [];
        var validationErrors = [];

        for (var i = 0; i < rows.length; i++) {
            var normalizedRow = normalizeCSVRow(rows[i], config);
            if (normalizedRow) {
                var validation = validateCSVRow(normalizedRow, config);
                if (validation.valid) {
                    normalizedRows.push(normalizedRow);
                } else {
                    validationErrors = validationErrors.concat(validation.errors);
                }
            }
        }

        if (validationErrors.length > 0) {
            throw new Error('Validation failed: ' + validationErrors.join('; '));
        }

        normalizedRows.sort(function (a, b) {
            if (a.source !== b.source) return a.source.localeCompare(b.source);
            if (a.type !== b.type) return a.type.localeCompare(b.type);
            return a.status.localeCompare(b.status);
        });

        var seen = {};
        var deduplicatedRows = [];
        for (var i = 0; i < normalizedRows.length; i++) {
            var row = normalizedRows[i];
            var key = row.source + '|' + row.type + '|' + row.status;
            if (!seen[key]) {
                deduplicatedRows.push(row);
                seen[key] = true;
            }
        }

        var canonicalIntents = [];
        var seenIntents = {};
        for (var i = 0; i < deduplicatedRows.length; i++) {
            var row = deduplicatedRows[i];
            if (
                row.type === config.baselineCustomerType &&
                row.status === config.baselineCustomerStatus
            ) {
                if (!seenIntents[row.source]) {
                    canonicalIntents.push(row.source);
                    seenIntents[row.source] = true;
                }
            }
        }
        canonicalIntents.sort();

        var baseline = {};
        for (var i = 0; i < deduplicatedRows.length; i++) {
            var row = deduplicatedRows[i];
            if (
                row.type === config.baselineCustomerType &&
                row.status === config.baselineCustomerStatus
            ) {
                baseline[row.source] = {
                    NL: row.languages.NL,
                    FR: row.languages.FR,
                    DE: row.languages.DE,
                    EN: row.languages.EN,
                };
            }
        }

        var overlays = {};
        var overlayCount = 0;

        for (var i = 0; i < deduplicatedRows.length; i++) {
            var row = deduplicatedRows[i];

            // Skip baseline rows
            if (
                row.type === config.baselineCustomerType &&
                row.status === config.baselineCustomerStatus
            ) {
                continue;
            }

            var overlayKey = row.type + '_' + row.status;

            if (!overlays[overlayKey]) {
                overlays[overlayKey] = {};
            }

            overlays[overlayKey][row.source] = {
                NL: row.languages.NL,
                FR: row.languages.FR,
                DE: row.languages.DE,
                EN: row.languages.EN,
            };
            overlayCount++;
        }

        var intentStore = {
            createdAt: nowUTC(),
            lastProcessed: nowUTC(),
            canonicalIntents: canonicalIntents,
            baseline: baseline,
            overlays: overlays,
            config: {
                baseline: {
                    type: config.baselineCustomerType,
                    status: config.baselineCustomerStatus,
                },
                overlayRules: {
                    combinations: config.combinations,
                    applicationOrder: config.applicationOrder,
                },
            },
        };

        var stats = {
            totalRows: rows.length,
            normalizedRows: normalizedRows.length,
            deduplicatedRows: deduplicatedRows.length,
            canonicalIntents: canonicalIntents.length,
            baselineIntents: Object.keys(baseline).length,
            overlays: Object.keys(overlays).length,
            overlayIntents: overlayCount,
        };

        Logger.info('processIntentStore: Complete', stats);

        return {
            success: true,
            intentStore: intentStore,
            stats: stats,
        };
    } catch (error) {
        Logger.error('processIntentStore: Error', {}, error);
        return {
            success: false,
            error: error.message,
        };
    }
}

// ============================================================================
// BUILD INTENT DEFINITIONS FOR CUSTOMER CONTEXT
// ============================================================================

/**
 * Build customer context from varObj
 *
 * @param {object} varObj - Variable object
 * @param {object} config - Intent configuration
 * @returns {object} { toType, toStatus, language }
 */
function buildCustomerContext(varObj, config) {
    try {
        var customer = (varObj && varObj.customer) || {};
        Logger.debug('buildCustomerContext: Raw customer object: ' + JSON.stringify(customer));

        var segment = customer.segment || customer.type || config.customerTypes[0];
        var status = customer.status || config.baselineCustomerStatus;
        var language = (varObj && varObj.language) || config.fallbackLanguage;

        Logger.debug(
            'buildCustomerContext: Before normalize - segment: ' +
                segment +
                ', status: ' +
                status +
                ', language: ' +
                language
        );

        // Normalize
        segment = segment.toUpperCase();
        status = status.toUpperCase();
        language = language.toUpperCase();

        Logger.debug(
            'buildCustomerContext: After normalize - segment: ' +
                segment +
                ', status: ' +
                status +
                ', language: ' +
                language
        );

        // Validate
        if (config.customerTypes.indexOf(segment) === -1) {
            Logger.warn('buildCustomerContext: Invalid segment "' + segment + '", using default', {
                segment: segment,
                validTypes: config.customerTypes,
            });
            segment = config.customerTypes[0];
        }

        if (config.customerStatuses.indexOf(status) === -1) {
            Logger.warn('buildCustomerContext: Invalid status "' + status + '", using default', {
                status: status,
                validStatuses: config.customerStatuses,
            });
            status = config.baselineCustomerStatus;
        }

        var baselineType = config.baselineCustomerType;
        var toStatus = [];

        Logger.debug(
            'buildCustomerContext: Overlay logic - status: ' +
                status +
                ', config.baselineCustomerStatus: ' +
                config.baselineCustomerStatus
        );
        Logger.debug(
            'buildCustomerContext: Overlay logic - segment: ' +
                segment +
                ', baselineType: ' +
                baselineType
        );

        if (status !== config.baselineCustomerStatus) {
            toStatus.push(status);
            Logger.debug('buildCustomerContext: Applied status overlay: ' + status);
        } else if (segment !== baselineType) {
            toStatus.push(status);
            Logger.debug(
                'buildCustomerContext: Applied type overlay for ' + segment + '_' + status
            );
        } else {
            Logger.debug('buildCustomerContext: No overlay needed - using CSV baseline');
        }

        var result = {
            baseType: config.baselineCustomerType,
            baseStatus: config.baselineCustomerStatus,
            toType: segment,
            toStatus: toStatus,
            language: language,
        };

        Logger.debug(
            'buildCustomerContext: Final result - baseType: ' +
                result.baseType +
                ', toType: ' +
                result.toType +
                ', toStatus: [' +
                result.toStatus.join(',') +
                ']'
        );

        return result;
    } catch (error) {
        Logger.error('buildCustomerContext: Error', {}, error);
        return {
            baseType: config.baselineCustomerType,
            baseStatus: config.baselineCustomerStatus,
            toType: config.customerTypes[0],
            toStatus: [],
            language: config.fallbackLanguage,
        };
    }
}

/**
 * Build runtime intent definitions from intentStore for specific customer context
 *
 * @param {object} intentStore - IntentStore with baseline/overlays
 * @param {object} customerContext - Customer context
 * @param {object} config - Intent configuration
 * @returns {object} Flat intent definitions
 */
function buildIntentDefinitions(intentStore, customerContext, config) {
    try {
        Logger.debug(
            'buildIntentDefinitions: Starting with customerContext - toType: ' +
                customerContext.toType +
                ', toStatus: [' +
                customerContext.toStatus.join(',') +
                ']'
        );

        if (!intentStore || !intentStore.baseline) {
            throw new Error('Invalid intentStore');
        }

        var baseline = intentStore.baseline;
        var overlays = intentStore.overlays || {};

        Logger.debug(
            'buildIntentDefinitions: IntentStore - baseline intents: ' +
                Object.keys(baseline).length +
                ', overlays: ' +
                Object.keys(overlays).length
        );
        Logger.debug(
            'buildIntentDefinitions: Available overlay keys: [' +
                Object.keys(overlays).join(', ') +
                ']'
        );

        // Build merge sequence
        var mergeSequence = [];
        for (var i = 0; i < customerContext.toStatus.length; i++) {
            mergeSequence.push(customerContext.toType + '_' + customerContext.toStatus[i]);
        }
        Logger.debug('buildIntentDefinitions: Merge sequence: [' + mergeSequence.join(', ') + ']');

        var mergedData = {};
        for (var key in baseline) {
            if (baseline.hasOwnProperty(key)) {
                mergedData[key] = baseline[key];
            }
        }

        var overlaysApplied = 0;
        for (var i = 0; i < mergeSequence.length; i++) {
            var overlayKey = mergeSequence[i];
            Logger.debug(
                'buildIntentDefinitions: Looking for overlay with key: "' + overlayKey + '"'
            );
            var overlay = overlays[overlayKey];
            Logger.debug(
                'buildIntentDefinitions: Overlay lookup result: ' +
                    (overlay ? 'FOUND (' + Object.keys(overlay).length + ' intents)' : 'NOT FOUND')
            );
            if (overlay) {
                overlaysApplied++;
                Logger.debug(
                    'buildIntentDefinitions: Applying overlay ' +
                        overlayKey +
                        ' (' +
                        Object.keys(overlay).length +
                        ' intents)'
                );
                for (var intentKey in overlay) {
                    if (overlay.hasOwnProperty(intentKey)) {
                        var oldValue = mergedData[intentKey]
                            ? JSON.stringify(mergedData[intentKey])
                            : 'undefined';
                        mergedData[intentKey] = overlay[intentKey];
                        var newValue = JSON.stringify(overlay[intentKey]);
                        if (oldValue !== newValue) {
                            Logger.debug(
                                'buildIntentDefinitions:   Intent "' +
                                    intentKey +
                                    '" changed: ' +
                                    oldValue +
                                    ' → ' +
                                    newValue
                            );
                        }
                    }
                }
            } else {
                Logger.debug('buildIntentDefinitions: No overlay found for ' + overlayKey);
            }
        }
        Logger.debug('buildIntentDefinitions: Applied ' + overlaysApplied + ' overlays total');

        // Log sample of merged intents (first 5 for brevity)
        var mergedKeys = Object.keys(mergedData);
        Logger.debug(
            'buildIntentDefinitions: Merged intents sample (showing first 5 of ' +
                mergedKeys.length +
                '):'
        );
        for (var i = 0; i < Math.min(5, mergedKeys.length); i++) {
            var key = mergedKeys[i];
            Logger.debug('  "' + key + '": ' + JSON.stringify(mergedData[key]));
        }

        // Convert to runtime format
        var runtimeDefinitions = {};
        var languageKey = customerContext.language.toUpperCase();
        var fallbackKey = config.fallbackLanguage.toUpperCase();
        var missingIntents = [];

        for (var source in mergedData) {
            if (!mergedData.hasOwnProperty(source)) continue;

            var sourceData = mergedData[source];
            var nextCode = sourceData[languageKey] || sourceData[fallbackKey] || '';
            if (nextCode) {
                runtimeDefinitions[source] = {
                    nextCode: nextCode,
                    params: {},
                };
            } else {
                missingIntents.push(source);
            }
        }

        if (missingIntents.length > 0) {
            Logger.warn(
                'buildIntentDefinitions: Missing translations for ' +
                    missingIntents.length +
                    ' intents'
            );
        }

        var stats = {
            baselineIntents: Object.keys(baseline).length,
            overlaysApplied: mergeSequence.length,
            finalIntents: Object.keys(runtimeDefinitions).length,
            canonicalIntents: intentStore.canonicalIntents.length,
            missingIntents: missingIntents.length,
            language: customerContext.language,
            mergeSequence: mergeSequence,
        };

        Logger.debug('buildIntentDefinitions: Complete | Context: ' + JSON.stringify(stats));

        // Log sample of runtime intent definitions (safely)
        try {
            var runtimeKeys = Object.keys(runtimeDefinitions);
            Logger.debug(
                'buildIntentDefinitions: Runtime definitions count: ' + runtimeKeys.length
            );

            // Log first 5 intents individually
            for (var i = 0; i < Math.min(5, runtimeKeys.length); i++) {
                var key = runtimeKeys[i];
                var def = runtimeDefinitions[key];
                Logger.debug('  "' + key + '": ' + JSON.stringify(def));
            }
        } catch (logError) {
            Logger.warn('buildIntentDefinitions: Sample logging failed: ' + logError.message);
        }

        return runtimeDefinitions;
    } catch (error) {
        Logger.error('buildIntentDefinitions: Error', {}, error);
        return {};
    }
}

// ============================================================================
// UPDATE SEGMENTDIC WITH INTENT DEFINITIONS
// ============================================================================

/**
 * Update segmentDic intent segments with intent definitions
 * Explicit segmentDic parameter - fixes scope bug
 *
 * @param {Map} segmentDic - SegmentDic Map to update
 * @param {object} intentDefinitions - Intent definitions to apply
 * @param {object} options - { segments, baseCdb, enableLLMMode, config } (baseCdb preferred from options, else global)
 * @returns {object} { updatedSegments, intentsCount, skipped }
 */
function updateSegmentDic(segmentDic, intentDefinitions, options) {
    try {
        options = options || {};
        var config = options.config || {};

        // Validate segmentDic
        if (!(segmentDic instanceof Map)) {
            Logger.warn('updateSegmentDic: segmentDic not a Map');
            return { updatedSegments: [], intentsCount: 0, skipped: true };
        }

        // Build segment definition (baseCdb: prefer options, else global)
        var resolvedBaseCdb =
            options.baseCdb !== undefined
                ? options.baseCdb
                : typeof baseCdb !== 'undefined'
                  ? baseCdb
                  : null;
        var segmentDef = {
            segmentType: 'intent_detection',
            segmentConfig: {
                enableLLMModus: !!options.enableLLMMode,
            },
            cdb: resolvedBaseCdb,
        };

        for (var intentKey in intentDefinitions) {
            if (intentDefinitions.hasOwnProperty(intentKey)) {
                segmentDef[intentKey] = intentDefinitions[intentKey];
            }
        }

        // Count intents (exclude metadata keys)
        var metaKeys = config.metaKeys || ['segmentType', 'segmentConfig', 'cdb'];
        var intentsCount = 0;
        for (var key in segmentDef) {
            if (segmentDef.hasOwnProperty(key) && metaKeys.indexOf(key) === -1) {
                intentsCount++;
            }
        }

        Logger.debug(
            'updateSegmentDic: segmentDef has ' +
                Object.keys(segmentDef).length +
                ' total keys, metaKeys to exclude: [' +
                metaKeys.join(',') +
                ']'
        );
        Logger.debug('updateSegmentDic: Counted ' + intentsCount + ' intent keys');
        Logger.debug(
            'updateSegmentDic: Input intentDefinitions had ' +
                Object.keys(intentDefinitions).length +
                ' intents'
        );

        // Log sample of intentDefinitions being added to segmentDic
        var intentKeys = Object.keys(intentDefinitions);
        var sampleKeys = intentKeys.slice(0, 3);
        var sampleDefs = {};
        for (var i = 0; i < sampleKeys.length; i++) {
            var key = sampleKeys[i];
            sampleDefs[key] = intentDefinitions[key];
        }
        Logger.debug(
            'updateSegmentDic: Sample intentDefinitions (first 3): ' + JSON.stringify(sampleDefs)
        );
        Logger.debug('updateSegmentDic: All intent keys: [' + intentKeys.join(', ') + ']');

        // Log sample of intentDefinitions content (first 5 for brevity)
        Logger.debug(
            'updateSegmentDic: Intent definitions sample (showing first 5 of ' +
                intentKeys.length +
                '):'
        );
        for (var i = 0; i < Math.min(5, intentKeys.length); i++) {
            var key = intentKeys[i];
            Logger.debug('  "' + key + '": ' + JSON.stringify(intentDefinitions[key]));
        }

        // Update segments
        var segments = options.segments ||
            config.segments || ['GET_INTENT', 'NEW_INTENT', 'OTHER_INTENT'];
        var updatedSegments = [];

        for (var i = 0; i < segments.length; i++) {
            var seg = segments[i];
            try {
                if (seg && typeof seg === 'string') {
                    segmentDic.set(seg, segmentDef);
                    updatedSegments.push(seg);
                }
            } catch (error) {
                Logger.error(
                    'updateSegmentDic: Failed to update segment ' + seg,
                    { segment: seg },
                    error
                );
            }
        }

        Logger.info(
            'updateSegmentDic: Updated ' +
                updatedSegments.length +
                ' segments with ' +
                intentsCount +
                ' intents'
        );

        return {
            updatedSegments: updatedSegments,
            intentsCount: intentsCount,
            skipped: false,
        };
    } catch (error) {
        Logger.error('updateSegmentDic: Error', {}, error);
        return { updatedSegments: [], intentsCount: 0, skipped: true };
    }
}

// ============================================================================
// MAIN: INITIALIZE INTENT DEFINITIONS
// ============================================================================

/**
 * Create fallback intent definitions
 * Used when CSV processing fails
 *
 * @param {object} config - Intent configuration
 * @returns {object} Fallback intent definitions
 */
function createFallbackIntentDefinitions(config) {
    return {
        billing: { nextCode: 'BILLING', params: {} },
        move: { nextCode: 'MOVE', params: {} },
        sales: { nextCode: 'SALES', params: {} },
        home: { nextCode: 'HOME', params: {} },
        other: { nextCode: 'OTHER', params: {} },
        FAILURE: { nextCode: config.fallbackSegment, params: {} },
        UNRECOGNIZED: { nextCode: config.fallbackSegment, params: {} },
        OPERATOR: { nextCode: config.fallbackSegment, params: {} },
        NO_MORE_QUESTIONS: { nextCode: 'DISCONNECT', params: {} },
    };
}

/**
 * Use fallback intent definitions (DRY helper)
 * Handles logging, session updates, segmentDic updates
 *
 * @param {object} varObj - Variable object
 * @param {Map} segmentDic - SegmentDic to update
 * @param {object} config - Intent configuration
 * @param {string} contextKey - Context key
 * @param {string} reason - Reason for fallback
 * @returns {object} Fallback intent definitions
 */
function useFallbackDefinitions(varObj, segmentDic, config, contextKey, reason) {
    var fallbackDefs = createFallbackIntentDefinitions(config);
    logIntentDefinitions(fallbackDefs, 'FALLBACK', contextKey, reason);

    updateSessionVariables({
        intentDefinitions: fallbackDefs,
        intentDefinitionsContext: contextKey,
        intentDefinitionsTimestamp: nowUTC(),
    });

    if (segmentDic) {
        updateSegmentDic(segmentDic, fallbackDefs, {
            segments: config.segments,
            baseCdb: typeof baseCdb !== 'undefined' ? baseCdb : null,
            enableLLMMode: config.enableLLMMode,
            config: config,
        });
    }

    return fallbackDefs;
}

/**
 * Initialize intent definitions system
 * 3-phase with aggressive caching for performance
 *
 * @param {object} varObj - Variable object with customer context and config
 * @param {Map} segmentDic - SegmentDic to update
 * @param {object} csvInput - CSV content (optional, for testing)
 * @returns {object} Runtime intent definitions
 */
function initializeIntentDefinitions(varObj, segmentDic, csvInput) {
    try {
        Logger.debug('initializeIntentDefinitions: Starting');
        Logger.debug(
            'initializeIntentDefinitions: Input - varObj.customer: ' +
                JSON.stringify(varObj && varObj.customer)
        );
        Logger.debug(
            'initializeIntentDefinitions: Input - varObj.language: ' + (varObj && varObj.language)
        );

        var config = getIntentConfig(varObj);

        // Early cache check with minimal key (optimization)
        var quickKey = buildQuickContextKey(varObj);

        if (
            context.session.variables &&
            context.session.variables.intentDefinitionsContext === quickKey &&
            context.session.variables.intentDefinitions &&
            !config.forceReloadCsvInput
        ) {
            Logger.info('initializeIntentDefinitions: Cache hit (quick check): ' + quickKey);
            logIntentDefinitions(context.session.variables.intentDefinitions, 'CACHED', quickKey);

            if (segmentDic) {
                updateSegmentDic(segmentDic, context.session.variables.intentDefinitions, {
                    segments: config.segments,
                    baseCdb: typeof baseCdb !== 'undefined' ? baseCdb : null,
                    enableLLMMode: config.enableLLMMode,
                    config: config,
                });
            }

            return context.session.variables.intentDefinitions;
        }

        // Cache miss - build full context
        Logger.debug('initializeIntentDefinitions: Cache miss, building full context');
        var customerContext = buildCustomerContext(varObj, config);
        Logger.debug(
            'initializeIntentDefinitions: Customer context built - baseType: ' +
                customerContext.baseType +
                ', baseStatus: ' +
                customerContext.baseStatus +
                ', toType: ' +
                customerContext.toType +
                ', toStatus: [' +
                customerContext.toStatus.join(',') +
                '], language: ' +
                customerContext.language
        );

        var contextKey = buildContextKey(
            customerContext.toType,
            customerContext.toStatus.join('_') || customerContext.baseStatus,
            customerContext.language
        );
        Logger.debug('initializeIntentDefinitions: Context key: ' + contextKey);

        // Skip storage read if force reload enabled (optimization)
        var intentStore = config.forceReloadCsvInput ? null : getIntentStore();

        if (!intentStore) {
            var csvContent = csvInput || null;

            if (!csvContent) {
                Logger.warn('initializeIntentDefinitions: No CSV input, using fallback');
                return useFallbackDefinitions(varObj, segmentDic, config, contextKey, 'no CSV');
            }
            var processResult = processIntentStore(csvContent, config);

            if (!processResult.success) {
                Logger.error(
                    'initializeIntentDefinitions: CSV processing failed',
                    {},
                    processResult.error
                );
                return useFallbackDefinitions(varObj, segmentDic, config, contextKey, 'CSV error');
            }

            intentStore = processResult.intentStore;
            saveIntentStore(intentStore);
        }

        var intentDefinitions = buildIntentDefinitions(intentStore, customerContext, config);

        if (!intentDefinitions || Object.keys(intentDefinitions).length === 0) {
            Logger.warn('initializeIntentDefinitions: Build returned empty, using fallback', {
                contextKey: contextKey,
            });
            intentDefinitions = createFallbackIntentDefinitions(config);
        }

        logIntentDefinitions(intentDefinitions, 'BUILT', contextKey);

        updateSessionVariables({
            intentDefinitions: intentDefinitions,
            intentDefinitionsContext: contextKey,
            intentDefinitionsTimestamp: nowUTC(),
        });

        if (segmentDic) {
            updateSegmentDic(segmentDic, intentDefinitions, {
                segments: config.segments,
                baseCdb: typeof baseCdb !== 'undefined' ? baseCdb : null,
                enableLLMMode: config.enableLLMMode,
                config: config,
            });
        }

        Logger.info('initializeIntentDefinitions: Complete (context: ' + contextKey + ')');

        return intentDefinitions;
    } catch (error) {
        Logger.error('initializeIntentDefinitions: Error', {}, error);
        var config = getIntentConfig(varObj);
        return useFallbackDefinitions(varObj, segmentDic, config, 'ERROR', 'exception');
    }
}

/** Main entry point for segment transitions (wrapper for backward compatibility) */
function processSegmentTransitionUnified(currentState, segmentResult, segmentDic, varObj) {
    return TransitionManager.process(currentState, segmentResult, segmentDic, varObj);
}

// ============================================================================
// TRANSITION MANAGER NAMESPACE
// ============================================================================

/**
 * @namespace TransitionManager
 * Handles segment state transitions with runtime configuration.
 * All transition processing logic is encapsulated in this namespace.
 */
TransitionManager = {
    /**
     * Process segment transition with unified logic
     * @param {object} currentState - Current segment state
     * @param {string} segmentResult - Segment result code
     * @param {Map} segmentDic - Segment dictionary
     * @param {object} varObj - Variable object with config
     * @returns {object} Updated segment state
     */
    process: function (currentState, segmentResult, segmentDic, varObj) {
        try {
            var currentSegment = currentState && currentState.currentSegment;

            // CRITICAL: Initialize speech tracking for current segment if it's a new segment
            // This must happen BEFORE collecting new speech
            if (typeof SpeechHistoryManager !== 'undefined' && varObj && currentSegment) {
                SpeechHistoryManager.ensure(varObj);

                // If this is a new segment (different from last tracked), reset start index
                if (currentSegment !== varObj._lastSpeechSegmentName) {
                    varObj._segmentSpeechStartIndex = varObj._speechHistory
                        ? varObj._speechHistory.length
                        : 0;
                    varObj._lastSpeechSegmentName = currentSegment;
                    varObj._segmentSpeechCache = '';

                    Logger.debug('Speech tracking initialized for segment', {
                        segment: currentSegment,
                        _segmentSpeechStartIndex: varObj._segmentSpeechStartIndex,
                        _speechHistoryLength: varObj._speechHistory
                            ? varObj._speechHistory.length
                            : 0,
                    });
                }
            }

            // Collect speech history (after tracking is initialized)
            var speakFlowObj =
                typeof speakFlow !== 'undefined'
                    ? speakFlow
                    : typeof context !== 'undefined' && context.speakFlow
                      ? context.speakFlow
                      : null;

            if (typeof SpeechHistoryManager !== 'undefined' && speakFlowObj && varObj) {
                SpeechHistoryManager.collectNew(varObj, currentState, speakFlowObj);
            }

            // Inline: createBaseNextStateUnified
            var nextState;
            if (!currentState || typeof currentState !== 'object') {
                nextState = {
                    currentSegment: 'ERROR',
                    segmentResult: '',
                    previousSegment: '',
                    params: {},
                    segmentConfig: {},
                    log: [],
                };
            } else {
                nextState = {
                    currentSegment: currentState.currentSegment || 'ERROR',
                    segmentResult: '',
                    previousSegment: currentState.previousSegment || '',
                    params: currentState.params || {},
                    segmentConfig: currentState.segmentConfig || {},
                    log: currentState.log || [],
                    segmentType: currentState.segmentType || 'standard',
                };
            }
            currentSegment = nextState.currentSegment;

            // Inline: getSegmentConfig
            var segmentConfig = null;
            if (!segmentDic || !(segmentDic instanceof Map)) {
                Logger.warn('getSegmentConfig: invalid segmentDic provided');
            } else {
                segmentConfig = segmentDic.get(currentSegment);
                if (!segmentConfig) {
                    Logger.warn('getSegmentConfig: segment not found', {
                        currentSegment: currentSegment,
                    });
                }
            }

            // Inline: handleMissingSegmentConfigUnified
            if (!segmentConfig) {
                Logger.warn('Config: ' + currentSegment + ' not found');
                var cfg = getIntentConfig({ config: {} });
                var errorSegment = cfg.errorSegment || 'ERROR_DEFAULT_ROUTE';

                Logger.error(
                    'Segment config not found for: ' + currentSegment,
                    { currentSegment: currentSegment },
                    null
                );

                // Get segment speech for error case
                var errorParams = {};
                if (typeof SpeechHistoryManager !== 'undefined' && varObj) {
                    var tempStateForSpeech = {
                        currentSegment: currentSegment,
                        segmentType: nextState.segmentType || 'error',
                    };
                    var segmentSpeech = SpeechHistoryManager.getSegmentSpeech(
                        varObj,
                        tempStateForSpeech,
                        'compact'
                    );
                    if (segmentSpeech && segmentSpeech.length > 0) {
                        errorParams.speech = segmentSpeech;
                    }
                }

                nextState.currentSegment = errorSegment;
                nextState.previousSegment = currentSegment;
                nextState.segmentResult = 'CONFIG_NOT_FOUND';
                nextState.segmentType = 'error';
                nextState.log.push({
                    currentSegment: currentSegment,
                    segmentResult: segmentResult,
                    nextSegment: errorSegment,
                    segmentType: nextState.segmentType,
                    params: errorParams,
                    timestamp: nowUTC(),
                });

                return nextState;
            }

            // Debug: Log segment config structure for diagnosis
            if (
                currentSegment === 'INTENT_MSG_010' ||
                currentSegment.indexOf('INTENT_MSG_') === 0
            ) {
                var configKeys = [];
                for (var key in segmentConfig) {
                    if (segmentConfig.hasOwnProperty(key)) {
                        configKeys.push(key);
                    }
                }
                Logger.debug('SegmentConfig for ' + currentSegment + ':', {
                    segmentType: segmentConfig.segmentType,
                    hasOPERATOR: 'OPERATOR' in segmentConfig,
                    OPERATORValue: segmentConfig.OPERATOR,
                    allKeys: configKeys.slice(0, 10), // First 10 keys for brevity
                });
            }

            // Inline: determineSegmentType
            var segmentType =
                segmentConfig && typeof segmentConfig === 'object'
                    ? segmentConfig.segmentType || 'standard'
                    : 'standard';
            nextState.segmentType = segmentType;

            var transitionResult = null;

            switch (segmentType) {
                case 'intent_detection':
                    transitionResult = this.processIntentDetection(
                        nextState,
                        segmentResult,
                        segmentConfig,
                        varObj
                    );
                    break;
                case 'matrix':
                    transitionResult = this.processMatrix(
                        nextState,
                        segmentResult,
                        segmentConfig,
                        varObj
                    );
                    break;
                case 'termination':
                    transitionResult = this.processTermination(
                        nextState,
                        segmentResult,
                        segmentConfig,
                        varObj
                    );
                    break;
                default:
                    transitionResult = this.processStandard(
                        nextState,
                        segmentResult,
                        segmentConfig,
                        varObj
                    );
                    break;
            }

            // Get speech for CURRENT segment BEFORE transition (critical: must happen before applyResult)
            var segmentSpeechBeforeTransition = null;
            if (typeof SpeechHistoryManager !== 'undefined' && varObj) {
                var tempStateForCurrentSegment = {
                    currentSegment: currentSegment,
                    segmentType: segmentType,
                };
                segmentSpeechBeforeTransition = SpeechHistoryManager.getSegmentSpeech(
                    varObj,
                    tempStateForCurrentSegment,
                    'compact'
                );

                // Debug logging for speech tracking
                Logger.debug('Speech tracking before transition', {
                    currentSegment: currentSegment,
                    segmentType: segmentType,
                    _lastSpeakFlowIndex: varObj._lastSpeakFlowIndex || 0,
                    _segmentSpeechStartIndex: varObj._segmentSpeechStartIndex || 0,
                    _lastSpeechSegmentName: varObj._lastSpeechSegmentName || 'none',
                    _segmentSpeechCache: varObj._segmentSpeechCache || 'empty',
                    _speechHistoryLength: varObj._speechHistory ? varObj._speechHistory.length : 0,
                    segmentSpeech: segmentSpeechBeforeTransition || 'null',
                });
            }

            // Apply transition result (handles null nextCode for termination)
            if (transitionResult && transitionResult.success) {
                // Special handling for termination segments (nextCode === null)
                if (transitionResult.nextCode === null) {
                    Logger.info('Termination segment completed: ' + currentSegment);
                }

                return this.applyResult(
                    nextState,
                    transitionResult,
                    segmentDic,
                    varObj,
                    currentSegment,
                    segmentType,
                    segmentResult,
                    segmentSpeechBeforeTransition
                );
            } else {
                Logger.warn('Transition failed: ' + currentSegment + ' (' + segmentResult + ')');
                return this.handleFailure(
                    nextState,
                    currentSegment,
                    segmentResult,
                    segmentType,
                    varObj,
                    segmentSpeechBeforeTransition
                );
            }
        } catch (error) {
            Logger.error(
                'Transition error',
                { currentSegment: currentSegment, segmentResult: segmentResult },
                error
            );
            var errorState = nextState ||
                currentState || { currentSegment: 'ERROR', segmentResult: '', params: {}, log: [] };
            return this.createErrorState(errorState, segmentResult, error);
        }
    },

    /**
     * Process INTENT_DETECTION segment
     */
    processIntentDetection: function (nextState, segmentResult, segmentConfig, varObj) {
        try {
            Logger.debug('processIntentDetection: Processing intent "' + segmentResult + '"');
            Logger.debug(
                'processIntentDetection: Customer context - type: ' +
                    (varObj && varObj.customer && varObj.customer.segment) +
                    ', status: ' +
                    (varObj && varObj.customer && varObj.customer.status)
            );

            // (sync to segmentDic skipped – handled elsewhere)
            var staticTransition = segmentConfig[segmentResult];
            if (staticTransition && staticTransition.nextCode) {
                Logger.debug(
                    'processIntentDetection: Found static transition for "' +
                        segmentResult +
                        '" -> ' +
                        staticTransition.nextCode
                );
                return this.createTransitionResult(
                    true,
                    staticTransition.nextCode,
                    staticTransition.params,
                    'intent_detection',
                    'static'
                );
            }

            Logger.debug(
                'processIntentDetection: No static transition, checking dynamic intents...'
            );
            // Use global intentDefinitions (populated by initializeCallFlowContext)
            // Fallback to session cache if global not available
            var builtIntents =
                (typeof intentDefinitions !== 'undefined' && intentDefinitions) ||
                (context.session &&
                    context.session.variables &&
                    context.session.variables.intentDefinitions) ||
                {};
            Logger.debug(
                'processIntentDetection: Built intents available: ' +
                    Object.keys(builtIntents).length +
                    ' (from ' +
                    (typeof intentDefinitions !== 'undefined' && intentDefinitions
                        ? 'global'
                        : 'session') +
                    ')'
            );

            var dynamicTransition = builtIntents[segmentResult];
            if (dynamicTransition && dynamicTransition.nextCode) {
                Logger.debug(
                    'processIntentDetection: Found dynamic transition for "' +
                        segmentResult +
                        '" -> ' +
                        dynamicTransition.nextCode
                );
                return this.createTransitionResult(
                    true,
                    dynamicTransition.nextCode,
                    dynamicTransition.params,
                    'intent_detection',
                    'dynamic'
                );
            }

            Logger.debug(
                'processIntentDetection: No dynamic transition found for "' + segmentResult + '"'
            );

            // Inline: isFailureResult
            var isFailure = false;
            if (segmentResult && typeof segmentResult === 'string') {
                var r = segmentResult.toLowerCase();
                isFailure =
                    r.indexOf('failure') >= 0 ||
                    r.indexOf('error') >= 0 ||
                    r.indexOf('timeout') >= 0;
            }
            if (isFailure) {
                Logger.debug(
                    'processIntentDetection: Detected failure result, checking FAILURE handlers...'
                );
                var failureTransition =
                    segmentConfig.FAILURE || segmentConfig.FAILURE_API || segmentConfig.ERROR;
                if (failureTransition) {
                    Logger.debug(
                        'processIntentDetection: Using FAILURE handler -> ' +
                            failureTransition.nextCode
                    );
                    return this.createTransitionResult(
                        true,
                        failureTransition.nextCode,
                        failureTransition.params,
                        'intent_detection',
                        'failure'
                    );
                }
            }
            Logger.warn('Intent not found: ' + segmentResult);
            return this.createTransitionResult(
                false,
                '',
                {},
                'intent_detection',
                'Intent not found'
            );
        } catch (e) {
            Logger.error(
                'processIntentDetectionSegmentUnified: error',
                { segmentResult: segmentResult },
                e
            );
            return this.createTransitionResult(false, '', {}, 'intent_detection', e.message);
        }
    },

    /**
     * Process MATRIX segment
     */
    processMatrix: function (nextState, segmentResult, segmentConfig, varObj) {
        try {
            Logger.debug('processMatrix: Starting matrix routing');
            var cfg = getIntentConfig(varObj);

            // Inline normalize helper
            var normalizeValue = function (value, kind) {
                if (!value) {
                    return '';
                }
                var str = value.toString().replace(/\s+/g, ' ').trim();
                return kind === 'language' ? str.toLowerCase() : str.toUpperCase();
            };

            // Get customer context with inline normalization
            var ct =
                (varObj && varObj.customer && (varObj.customer.segment || varObj.customer.type)) ||
                'RESI';
            var cs = (varObj && varObj.customer && varObj.customer.status) || 'NOT_IDENTIFIED';
            Logger.debug('processMatrix: Raw customer - type: ' + ct + ', status: ' + cs);

            var customer = {
                type: normalizeValue(ct, 'type'),
                status: normalizeValue(cs, 'status'),
            };

            // Get language with inline normalization
            var lang =
                (varObj && varObj.language) ||
                (typeof context !== 'undefined' && context.language) ||
                'nl';
            var language = normalizeValue(lang, 'language');

            Logger.debug(
                'processMatrix: Normalized - type: ' +
                    customer.type +
                    ', status: ' +
                    customer.status +
                    ', language: ' +
                    language
            );

            var matrixKey = customer.type.toLowerCase() + '_' + customer.status.toLowerCase();
            Logger.debug('processMatrix: Matrix key: ' + matrixKey);

            segmentResult = matrixKey;

            var matrixConfig = segmentConfig[matrixKey];
            if (!matrixConfig || !matrixConfig.nextCode) {
                Logger.warn('Matrix fallback: ' + matrixKey + ' -> standard');
                return this.processStandard(nextState, segmentResult, segmentConfig, varObj);
            }

            // Use uppercase language key for lookup (consistent with intent definitions: NL, FR, DE, EN)
            var languageKey = (language || '').toUpperCase();
            var fallbackLangKey = (cfg.fallbackLanguage || 'NL').toUpperCase();
            Logger.debug(
                'processMatrix: Matrix config found for ' +
                    matrixKey +
                    ', available languages: [' +
                    Object.keys(matrixConfig.nextCode).join(', ') +
                    ']'
            );

            var nextCode =
                matrixConfig.nextCode[languageKey] ||
                matrixConfig.nextCode[language] ||
                matrixConfig.nextCode[fallbackLangKey] ||
                matrixConfig.nextCode[
                    cfg.fallbackLanguage ? cfg.fallbackLanguage.toLowerCase() : 'nl'
                ];
            if (!nextCode) {
                Logger.warn('Matrix language error: ' + languageKey);
                return this.createTransitionResult(
                    false,
                    '',
                    {},
                    'matrix',
                    'No nextCode for language'
                );
            }

            Logger.debug(
                'processMatrix: Resolved nextCode: ' +
                    nextCode +
                    ' (for language: ' +
                    languageKey +
                    ')'
            );
            return this.createTransitionResult(
                true,
                nextCode,
                matrixConfig.params,
                'matrix',
                matrixKey
            );
        } catch (e) {
            Logger.error('processMatrixSegmentUnified: error', { segmentResult: segmentResult }, e);
            return this.createTransitionResult(false, '', {}, 'matrix', e.message);
        }
    },

    /**
     * Process TERMINATION segment
     */
    processTermination: function (state, segmentResult, segmentConfig, varObj) {
        var currentSegment = state.currentSegment;
        var effectiveResult = segmentResult || 'SUCCESS';
        var transitionRule = segmentConfig[effectiveResult];
        if (!transitionRule) {
            Logger.warn(
                'processTerminationSegmentUnified: No rule for ' +
                    currentSegment +
                    ' (' +
                    effectiveResult +
                    ')'
            );
            return {
                success: false,
                nextCode: 'DISCONNECT',
                params: { callState: 'error' },
                message: 'No rule',
            };
        }
        var finalParams = cloneObject(state.params || {});
        if (transitionRule.params) {
            for (var k in transitionRule.params) {
                if (transitionRule.params.hasOwnProperty(k)) {
                    finalParams[k] = transitionRule.params[k];
                }
            }
        }
        return {
            success: true,
            nextCode: transitionRule.nextCode,
            params: finalParams,
            message: effectiveResult,
        };
    },

    /**
     * Process STANDARD segment
     */
    processStandard: function (nextState, segmentResult, segmentConfig, varObj) {
        try {
            if (!segmentResult || segmentResult.trim() === '') {
                var defRow =
                    segmentConfig.DEFAULT ||
                    segmentConfig.FAILURE ||
                    segmentConfig.FAILURE_API ||
                    segmentConfig.ERROR;
                if (defRow) {
                    return this.createTransitionResult(
                        true,
                        defRow.nextCode,
                        defRow.params,
                        'standard',
                        'default_empty'
                    );
                }
            }
            var normalized = segmentResult ? segmentResult.trim() : '';
            var row = segmentConfig[segmentResult] || segmentConfig[normalized];

            // Inline: isFailureResult
            if (!row) {
                var isFailure = false;
                if (segmentResult && typeof segmentResult === 'string') {
                    var r = segmentResult.toLowerCase();
                    isFailure =
                        r.indexOf('failure') >= 0 ||
                        r.indexOf('error') >= 0 ||
                        r.indexOf('timeout') >= 0;
                }
                if (isFailure) {
                    row = segmentConfig.FAILURE || segmentConfig.FAILURE_API || segmentConfig.ERROR;
                }
            }

            if (!row) {
                Logger.warn(
                    'Standard transition not found: ' +
                        segmentResult +
                        ' in ' +
                        nextState.currentSegment
                );
                return this.createTransitionResult(
                    false,
                    '',
                    {},
                    'standard',
                    'Transition not found'
                );
            }
            return this.createTransitionResult(
                true,
                row.nextCode,
                row.params,
                'standard',
                'standard'
            );
        } catch (e) {
            Logger.error(
                'processStandardSegmentUnified: error',
                { segmentResult: segmentResult },
                e
            );
            return this.createTransitionResult(false, '', {}, 'standard', e.message);
        }
    },

    /**
     * Apply transition result & mutate state
     */
    applyResult: function (
        nextState,
        transitionResult,
        segmentDic,
        varObj,
        currentSegment,
        currentSegmentType,
        segmentResult,
        segmentSpeech
    ) {
        var cfg = getIntentConfig(varObj);
        var nextCode = transitionResult.nextCode;
        var rowParams = transitionResult.params || {};

        // Prepare params for logging current segment (ALL params + speech)
        var logParams = cloneObject(nextState.params || {});

        // Use speech passed from process() (retrieved BEFORE transition)
        // Only add speech if it exists and is not empty
        if (segmentSpeech && typeof segmentSpeech === 'string' && segmentSpeech.length > 0) {
            logParams.speech = segmentSpeech;
            Logger.debug('Speech added to log params', {
                segment: currentSegment,
                speechLength: segmentSpeech.length,
                speechPreview:
                    segmentSpeech.substring(0, 100) + (segmentSpeech.length > 100 ? '...' : ''),
            });
        } else {
            Logger.debug('No speech to log for segment', {
                segment: currentSegment,
                segmentSpeech: segmentSpeech,
                reason: !segmentSpeech
                    ? 'null'
                    : segmentSpeech.length === 0
                      ? 'empty'
                      : 'not-string',
            });
        }

        // Prepare params for next segment (persistent keys + new transition params)
        var mergedParams =
            cfg.segmentResetCodes.indexOf(nextCode) >= 0
                ? cloneObject(rowParams)
                : mergeObjects(pickPersistentKeys(nextState.params), rowParams);

        var isTermination = nextCode === null;
        var nextSegDef = isTermination ? null : segmentDic.get(nextCode);
        var nextSegType = 'standard';
        if (isTermination) {
            nextSegType = currentSegmentType;
        } else if (nextSegDef && nextSegDef.segmentType) {
            nextSegType = nextSegDef.segmentType;
        } else if (nextCode === 'DISCONNECT') {
            nextSegType = 'termination';
        } else if (nextCode && nextCode.indexOf('INTENT') >= 0) {
            nextSegType = 'intent_detection';
        } else if (
            nextCode &&
            (nextCode.indexOf('MATRIX') >= 0 ||
                nextCode === 'BILLING' ||
                nextCode === 'MOVE' ||
                nextCode === 'SALES' ||
                nextCode === 'HOME' ||
                nextCode === 'OTHER')
        ) {
            nextSegType = 'matrix';
        }

        // Inline logSegmentTransition
        Logger.info('Segment transition:', {
            from: currentSegment,
            result: segmentResult,
            to: nextCode,
            type: currentSegmentType,
        });

        // Log current segment with ALL params + speech (skip if termination - onCallEnd will log it)
        if (!isTermination) {
            nextState.log.push({
                currentSegment: currentSegment,
                segmentResult: segmentResult,
                nextSegment: nextCode,
                segmentType: currentSegmentType,
                params: logParams,
                timestamp: nowUTC(),
            });
        }

        if (
            typeof SpeechHistoryManager !== 'undefined' &&
            varObj &&
            nextCode &&
            nextCode !== currentSegment
        ) {
            // Reset tracking for the next segment
            varObj._lastSpeechSegmentName = nextCode;
            varObj._segmentSpeechStartIndex = varObj._speechHistory
                ? varObj._speechHistory.length
                : 0;
            varObj._segmentSpeechCache = '';

            Logger.debug('Speech tracking reset for next segment', {
                currentSegment: currentSegment,
                nextSegment: nextCode,
                _lastSpeechSegmentName: varObj._lastSpeechSegmentName,
                _segmentSpeechStartIndex: varObj._segmentSpeechStartIndex,
                _speechHistoryLength: varObj._speechHistory ? varObj._speechHistory.length : 0,
            });
        }

        // Update nextState with persistent params for next segment
        nextState.previousSegment = currentSegment;
        nextState.currentSegment = nextCode;
        nextState.segmentResult = transitionResult.message || segmentResult;
        nextState.segmentType = nextSegType;
        nextState.params = mergedParams;
        nextState.segmentConfig =
            nextSegDef && nextSegDef.segmentConfig ? nextSegDef.segmentConfig : {};

        // Copy target segment cdb into varObj.cdb (lazy-eval: function values are called with varObj)
        if (!isTermination && varObj) {
            if (cfg.segmentResetCodes.indexOf(nextCode) >= 0) {
                varObj._tempData = {};
            }
            if (nextSegDef && nextSegDef.cdb && typeof nextSegDef.cdb === 'object') {
                var rawCdb = nextSegDef.cdb;
                var computed = {};
                for (var ck in rawCdb) {
                    if (rawCdb.hasOwnProperty(ck)) {
                        var v = rawCdb[ck];
                        computed[ck] = typeof v === 'function' ? v(varObj) : v;
                    }
                }
                varObj.cdb = computed;
            }
        }

        // Termination path – delegate to onCallEnd (it will create the log entry)
        if (isTermination && typeof onCallEnd === 'function') {
            onCallEnd(varObj, nextState, { cfg: cfg });
        }

        return nextState;
    },

    /**
     * Handle generic transition failure
     */
    handleFailure: function (
        nextState,
        currentSegment,
        segmentResult,
        currentSegmentType,
        varObj,
        segmentSpeech
    ) {
        // Prepare params for logging current segment (ALL params + speech)
        var logParams = cloneObject(nextState.params || {});

        // Use speech passed from process() (retrieved BEFORE transition)
        // Only add speech if it exists and is not empty
        if (segmentSpeech && typeof segmentSpeech === 'string' && segmentSpeech.length > 0) {
            logParams.speech = segmentSpeech;
            Logger.debug('Speech added to failure log params', {
                segment: currentSegment,
                speechLength: segmentSpeech.length,
            });
        } else {
            Logger.debug('No speech to log for failure segment', {
                segment: currentSegment,
                segmentSpeech: segmentSpeech,
            });
        }

        nextState.previousSegment = currentSegment;
        nextState.currentSegment = currentSegment; // stay on same segment
        nextState.segmentResult = segmentResult;
        nextState.segmentType = currentSegmentType;
        nextState.log.push({
            currentSegment: currentSegment,
            segmentResult: segmentResult,
            nextSegment: currentSegment,
            segmentType: currentSegmentType,
            params: logParams,
            timestamp: nowUTC(),
        });
        return nextState;
    },

    /**
     * Create final error state
     */
    createErrorState: function (stateLike, segmentResult, errorObj) {
        var s = cloneObject(stateLike || {});
        s.error = { message: errorObj && errorObj.message, stack: errorObj && errorObj.stack };
        s.segmentResult = segmentResult;
        return s;
    },

    /**
     * Create standardized transition result object
     * @param {boolean} success - Whether transition succeeded
     * @param {string|null} nextCode - Next segment code (null for termination)
     * @param {object} params - Transition parameters
     * @param {string} segmentType - Segment type
     * @param {string} message - Descriptive message
     * @returns {object} Transition result
     */
    createTransitionResult: function (success, nextCode, params, segmentType, message) {
        return {
            success: success,
            nextCode: typeof nextCode === 'string' || nextCode === null ? nextCode : '',
            params: params || {},
            segmentType: segmentType || 'standard',
            message: message || '',
            timestamp: nowUTC(),
        };
    },
};

/** Process INTENT_DETECTION segment  */
function processIntentDetectionSegmentUnified(nextState, segmentResult, segmentConfig, varObj) {
    return TransitionManager.processIntentDetection(
        nextState,
        segmentResult,
        segmentConfig,
        varObj
    );
}

/** Process MATRIX segment */
function processMatrixSegmentUnified(nextState, segmentResult, segmentConfig, varObj) {
    return TransitionManager.processMatrix(nextState, segmentResult, segmentConfig, varObj);
}

/** Process TERMINATION segment  */
function processTerminationSegmentUnified(state, segmentResult, segmentConfig, varObj) {
    return TransitionManager.processTermination(state, segmentResult, segmentConfig, varObj);
}

/** Process STANDARD segment  */
function processStandardSegmentUnified(nextState, segmentResult, segmentConfig, varObj) {
    return TransitionManager.processStandard(nextState, segmentResult, segmentConfig, varObj);
}

/** Apply transition result (pass segmentSpeech for logging; omit or null if not available). */
function applyTransitionResultUnified(
    nextState,
    transitionResult,
    segmentDic,
    varObj,
    currentSegment,
    currentSegmentType,
    segmentResult,
    segmentSpeech
) {
    return TransitionManager.applyResult(
        nextState,
        transitionResult,
        segmentDic,
        varObj,
        currentSegment,
        currentSegmentType,
        segmentResult,
        segmentSpeech
    );
}

/** Handle transition failure (pass segmentSpeech for logging; omit or null if not available). */
function handleTransitionFailureUnified(
    nextState,
    currentSegment,
    segmentResult,
    currentSegmentType,
    varObj,
    segmentSpeech
) {
    return TransitionManager.handleFailure(
        nextState,
        currentSegment,
        segmentResult,
        currentSegmentType,
        varObj,
        segmentSpeech
    );
}

/** Create error state */
function createErrorStateUnified(stateLike, segmentResult, errorObj) {
    return TransitionManager.createErrorState(stateLike, segmentResult, errorObj);
}
