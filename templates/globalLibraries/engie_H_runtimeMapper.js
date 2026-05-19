// ============================================================================
// RUNTIMEMAPPER - CANONICAL EXTRACTION + GLOBAL EXPORT (Vocalls ES5.1)
// ============================================================================
//
// Purpose
// -------
// Provide a reusable, self-service agnostic mechanism to:
//
// 1) Extract canonical (flat) runtime variables from nested API payloads
//    using declarative rules.
// 2) Support conditional extraction (when / whenEquals / whenIn / whenAll / whenAny).
// 3) Support transformation hooks.
// 4) Merge extracted values into agentContext.variables.
// 5) Export selected variables to globals for {variable} interpolation.
//
// ES5.1 Compatible
// ============================================================================

function safeStringify(value) {
    try {
        return JSON.stringify(value);
    } catch (e) {
        return '[unstringifiable]';
    }
}

var RuntimeMapper = (function (globalScope) {
    function getPath(obj, path) {
        if (!obj || !path) return undefined;
        var parts = path.split('.');
        var cur = obj;
        for (var i = 0; i < parts.length; i++) {
            if (cur === null || cur === undefined) return undefined;
            cur = cur[parts[i]];
        }
        return cur;
    }

    function extractIsoDateParts(value) {
        var match;
        if (!value || typeof value !== 'string') return null;

        match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            return {
                year: parseInt(match[1], 10),
                month: parseInt(match[2], 10),
                day: parseInt(match[3], 10),
            };
        }

        return null;
    }

    function parseIsoDateSafe(value) {
        var t;
        if (!value || typeof value !== 'string') return null;
        t = Date.parse(value);
        if (isNaN(t)) return null;
        return new Date(t);
    }

    function getBusinessDateParts(value) {
        var literalParts = extractIsoDateParts(value);
        var parsed;
        if (literalParts) return literalParts;

        parsed = parseIsoDateSafe(value);
        if (!parsed) return null;

        return {
            year: parsed.getUTCFullYear(),
            month: parsed.getUTCMonth() + 1,
            day: parsed.getUTCDate(),
        };
    }

    function evaluateSingleCondition(condition, inputObj) {
        var v;
        var i;

        if (!condition) return true;

        if (condition.when) {
            return !!getPath(inputObj, condition.when);
        }

        if (condition.whenEquals && condition.whenEquals.path) {
            return getPath(inputObj, condition.whenEquals.path) === condition.whenEquals.value;
        }

        if (
            condition.whenIn &&
            condition.whenIn.path &&
            condition.whenIn.values &&
            condition.whenIn.values.length
        ) {
            v = getPath(inputObj, condition.whenIn.path);
            for (i = 0; i < condition.whenIn.values.length; i++) {
                if (v === condition.whenIn.values[i]) return true;
            }
            return false;
        }

        if (condition.whenNotNull) {
            v = getPath(inputObj, condition.whenNotNull);
            return v !== null && v !== undefined;
        }

        if (condition.whenAll && condition.whenAll.length) {
            for (i = 0; i < condition.whenAll.length; i++) {
                if (!evaluateSingleCondition(condition.whenAll[i], inputObj)) return false;
            }
            return true;
        }

        if (condition.whenAny && condition.whenAny.length) {
            for (i = 0; i < condition.whenAny.length; i++) {
                if (evaluateSingleCondition(condition.whenAny[i], inputObj)) return true;
            }
            return false;
        }

        return true;
    }

    function shouldExtract(rule, inputObj) {
        if (!rule) return false;
        return evaluateSingleCondition(rule, inputObj);
    }

    var HOOKS = {
        getDay: function (value) {
            var parts = getBusinessDateParts(value);
            return parts ? parts.day : null;
        },

        getSpokenMonth: function (value, _rule, inputObj) {
            var language;
            var parts;
            var monthIndex;
            var months;
            var lang;

            if (!value) return null;

            language = (inputObj && inputObj.varObj && inputObj.varObj.language) || 'EN';
            parts = extractIsoDateParts(value);
            if (!parts) return null;

            monthIndex = parts.month - 1;
            if (monthIndex < 0 || monthIndex > 11) return null;

            months = {
                NL: [
                    'januari',
                    'februari',
                    'maart',
                    'april',
                    'mei',
                    'juni',
                    'juli',
                    'augustus',
                    'september',
                    'oktober',
                    'november',
                    'december',
                ],
                FR: [
                    'janvier',
                    'fevrier',
                    'mars',
                    'avril',
                    'mai',
                    'juin',
                    'juillet',
                    'aout',
                    'septembre',
                    'octobre',
                    'novembre',
                    'decembre',
                ],
                DE: [
                    'Januar',
                    'Februar',
                    'Marz',
                    'April',
                    'Mai',
                    'Juni',
                    'Juli',
                    'August',
                    'September',
                    'Oktober',
                    'November',
                    'Dezember',
                ],
                EN: [
                    'January',
                    'February',
                    'March',
                    'April',
                    'May',
                    'June',
                    'July',
                    'August',
                    'September',
                    'October',
                    'November',
                    'December',
                ],
            };

            lang = months[language] ? language : 'EN';
            return months[lang][monthIndex];
        },

        getMonth: function (value) {
            var parts = getBusinessDateParts(value);
            return parts ? parts.month : null;
        },

        getYear: function (value) {
            var parts = getBusinessDateParts(value);
            return parts ? parts.year : null;
        },

        toDateOnly: function (value) {
            var parts = getBusinessDateParts(value);
            var mStr;
            var dStr;

            if (!parts) return null;

            mStr = (parts.month < 10 ? '0' : '') + parts.month;
            dStr = (parts.day < 10 ? '0' : '') + parts.day;

            return parts.year + '-' + mStr + '-' + dStr;
        },

        addDays: function (value, rule) {
            var days = rule && typeof rule.addDays === 'number' ? rule.addDays : 0;
            var parsed = parseIsoDateSafe(value);
            var result;
            var mStr;
            var dStr;

            if (!parsed) return null;

            result = new Date(parsed.getTime() + days * 86400000);

            mStr = (result.getUTCMonth() + 1 < 10 ? '0' : '') + (result.getUTCMonth() + 1);
            dStr = (result.getUTCDate() < 10 ? '0' : '') + result.getUTCDate();

            return result.getUTCFullYear() + '-' + mStr + '-' + dStr;
        },

        toPhoneNumber: function (value) {
            if (typeof value !== 'string') return null;

            const digits = value.replace(/\D/g, '');

            if (digits.length === 9) {
                // 9 digits : 3 + 2 + 2 + 2
                return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
            }

            if (digits.length === 10) {
                // 10 digits : pairs of 2
                return digits.match(/.{2}/g).join(' ');
            }

            // for unsupported lengths, return input
            return value;
        },

        count: function (value) {
            return value && Array.isArray(value) ? value.length : 0;
        },

        toStringSafe: function (value) {
            if (value === null || value === undefined) return '';
            return value.toString();
        },

        toUpper: function (value) {
            if (value === null || value === undefined) return '';
            return value.toString().toUpperCase();
        },

        toLower: function (value) {
            if (value === null || value === undefined) return '';
            return value.toString().toLowerCase();
        },

        toBoolean: function (value) {
            if (value === null || value === undefined) return false;
            if (typeof value === 'boolean') return value;
            if (typeof value === 'string') {
                var normalized = value.toLowerCase();
                if (normalized === 'true' || normalized === '1' || normalized === 'yes')
                    return true;
                if (
                    normalized === 'false' ||
                    normalized === '0' ||
                    normalized === 'no' ||
                    normalized === ''
                )
                    return false;
            }
            return !!value;
        },

        trim: function (value) {
            if (value === null || value === undefined) return '';
            return value.toString().replace(/^\s+|\s+$/g, '');
        },

        firstItem: function (value) {
            return value && Array.isArray(value) && value.length ? value[0] : null;
        },

        lastItem: function (value) {
            return value && Array.isArray(value) && value.length ? value[value.length - 1] : null;
        },

        addressToSSML: function (value, rule, inputObj) {
            var language;
            var BUS_LABEL;
            var busLabel;
            var speed;
            var VALID_SPEEDS;
            var rate;
            var ABBR;
            var FR_PARTICLES;
            var parts;
            var line;
            var city;

            if (!value || typeof value !== 'object') {
                return '';
            }

            language = (inputObj && inputObj.varObj && inputObj.varObj.language) || 'NL';

            BUS_LABEL = { NL: 'bus', FR: 'bo\u00eete', DE: 'Wohnung', EN: 'unit' };
            busLabel = BUS_LABEL[language] || BUS_LABEL.NL;

            speed = (rule && rule.speed) || 'medium';
            VALID_SPEEDS = { 'x-slow': 1, slow: 1, medium: 1, fast: 1, 'x-fast': 1 };
            rate = VALID_SPEEDS[speed] ? speed : 'medium';

            ABBR = {
                'AV.': 'Avenue',
                'AVE.': 'Avenue',
                'BD.': 'Boulevard',
                'BLVD.': 'Boulevard',
                'SQ.': 'Square',
                'PL.': 'Place',
                'IMP.': 'Impasse',
                'ALL.': 'All\u00e9e',
                'CHEM.': 'Chemin',
                'RTE.': 'Route',
                'PASS.': 'Passage',
                'GAL.': 'Galerie',
                'SENT.': 'Sentier',
                'CIT.': 'Cit\u00e9',
                'RES.': 'R\u00e9sidence',
                'R\u00c9S.': 'R\u00e9sidence',
                'DOM.': 'Domaine',
                'GEN.': 'G\u00e9n\u00e9ral',
                'PROF.': 'Professeur',
                'DR.': 'Docteur',
                'MGR.': 'Monseigneur',
                'ST-': 'Saint-',
                'ST.': 'Saint',
                'STE-': 'Sainte-',
                'STE.': 'Sainte',
            };

            FR_PARTICLES = {
                de: 1,
                du: 1,
                des: 1,
                la: 1,
                le: 1,
                les: 1,
                au: 1,
                aux: 1,
                en: 1,
                et: 1,
                sur: 1,
            };

            function expandAbbr(str) {
                var words = str.split(' ');
                var result = [];
                var i;
                for (i = 0; i < words.length; i++) {
                    result.push(ABBR[words[i].toUpperCase()] || ABBR[words[i]] || words[i]);
                }
                return result.join(' ');
            }

            function toTitleCaseFR(str) {
                var words = str.toLowerCase().split(' ');
                var result = [];
                var i;
                for (i = 0; i < words.length; i++) {
                    if (i === 0 || !FR_PARTICLES[words[i]]) {
                        result.push(words[i].charAt(0).toUpperCase() + words[i].slice(1));
                    } else {
                        result.push(words[i]);
                    }
                }
                return result.join(' ');
            }

            function cardinal(val) {
                return '<say-as interpret-as="cardinal">' + val + '</say-as>';
            }

            parts = [];

            if (value.street) {
                line = toTitleCaseFR(expandAbbr(value.street));
                if (value.houseNumber) {
                    line += ' ' + cardinal(value.houseNumber);
                }
                parts.push(line);
            }

            if (value.supplement) {
                parts.push(busLabel + ' ' + value.supplement);
            }

            if (value.postalCode) {
                city = value.city ? ' ' + toTitleCaseFR(value.city) : '';
                parts.push(cardinal(value.postalCode) + city);
            }

            return '<prosody rate="' + rate + '">' + parts.join(', ') + '</prosody>';
        },
    };

    function applyHook(rule, rawValue, inputObj, outputObj) {
        if (!rule || !rule.hook) return rawValue;

        var hookSpec = rule.hook;
        var hookNames = Array.isArray(hookSpec) ? hookSpec : [hookSpec];
        var value = rawValue;
        var i;
        var hookName;
        var hookFn;

        for (i = 0; i < hookNames.length; i++) {
            hookName = hookNames[i];
            hookFn = HOOKS[hookName];
            if (typeof hookFn !== 'function') {
                continue;
            }
            value = hookFn(value, rule, inputObj, outputObj);
        }

        return value;
    }

    function addHook(name, fn) {
        if (typeof name !== 'string' || !name) return false;
        if (typeof fn !== 'function') return false;
        HOOKS[name] = fn;
        return true;
    }

    function logExtractMeta(meta) {
        if (typeof log_debug === 'function') {
            log_debug('RuntimeMapper.extract meta: ' + safeStringify(meta));
            return;
        }

        if (typeof Logger !== 'undefined' && Logger && typeof Logger.debug === 'function') {
            Logger.debug('RuntimeMapper.extract meta', meta);
        }
    }

    function extract(inputObj, rules, options) {
        options = options || {};
        var onCollision = options.onCollision || 'keepFirst';
        var skipNull = !!options.skipNull;
        var enableLog = !!options.log;
        var output = {};
        var meta = {
            extracted: [],
            skippedByCondition: [],
            missing: [],
            collisions: [],
            hookErrors: [],
        };
        var i;
        var rule;
        var rawValue;
        var finalValue;

        if (!rules || !rules.length) {
            return { values: output, meta: meta };
        }

        for (i = 0; i < rules.length; i++) {
            rule = rules[i];
            if (!rule || !rule.from || !rule.to) continue;

            if (!shouldExtract(rule, inputObj)) {
                meta.skippedByCondition.push(rule.to);
                continue;
            }

            rawValue = getPath(inputObj, rule.from);
            if (rawValue === undefined) {
                meta.missing.push(rule.from);
                continue;
            }

            try {
                finalValue = applyHook(rule, rawValue, inputObj, output);
            } catch (e) {
                meta.hookErrors.push({
                    to: rule.to,
                    hook: rule.hook,
                    message: e && e.message ? e.message : 'hook error',
                });
                continue;
            }

            if (finalValue === undefined) {
                meta.skippedByCondition.push(rule.to);
                continue;
            }

            if (skipNull && finalValue === null) {
                meta.skippedByCondition.push(rule.to);
                continue;
            }

            if (output.hasOwnProperty(rule.to)) {
                meta.collisions.push({ key: rule.to, from: rule.from });
                if (onCollision === 'overwrite') {
                    output[rule.to] = finalValue;
                }
            } else {
                output[rule.to] = finalValue;
            }

            meta.extracted.push(rule.to);
        }

        if (enableLog) {
            logExtractMeta(meta);
        }

        return { values: output, meta: meta };
    }

    function applyToAgentContext(agentContext, extractedValues) {
        var key;
        if (!agentContext) return false;

        if (!agentContext.variables || typeof agentContext.variables !== 'object') {
            agentContext.variables = {};
        }

        for (key in extractedValues) {
            if (!extractedValues.hasOwnProperty(key)) continue;
            agentContext.variables[key] = extractedValues[key];
        }

        return true;
    }

    function exportToGlobals(agentContext, exportMap, options) {
        options = options || {};
        var overwrite = options.overwrite !== false;
        var logEach = !!options.logEach;
        var prefix = options.prefix || '';
        var rv;
        var count = 0;
        var runtimeKey;
        var value;
        var globalName;

        if (!agentContext || !agentContext.variables) {
            return { success: false, exported: 0 };
        }

        rv = agentContext.variables;

        for (runtimeKey in exportMap) {
            if (!exportMap.hasOwnProperty(runtimeKey)) continue;
            if (!rv.hasOwnProperty(runtimeKey)) continue;

            value = rv[runtimeKey];
            if (value === null || value === undefined) continue;

            globalName = prefix + exportMap[runtimeKey];

            if (!overwrite && typeof globalScope[globalName] !== 'undefined') {
                continue;
            }

            globalScope[globalName] = value;
            count++;

            if (logEach) {
                if (typeof log_debug === 'function') {
                    log_debug(
                        'RuntimeMapper.export: ' +
                            runtimeKey +
                            ' -> ' +
                            globalName +
                            ' = ' +
                            safeStringify(value)
                    );
                } else if (
                    typeof Logger !== 'undefined' &&
                    Logger &&
                    typeof Logger.debug === 'function'
                ) {
                    Logger.debug('RuntimeMapper.export: ' + runtimeKey + ' -> ' + globalName, {
                        value: value,
                    });
                }
            }
        }

        return { success: true, exported: count };
    }

    return {
        extract: extract,
        applyToAgentContext: applyToAgentContext,
        exportToGlobals: exportToGlobals,
        addHook: addHook,
        hooks: HOOKS,
    };
})(this);

// ============================================================================
// Project-specific CANONICAL_RULES and EXPORT_MAP constants belong in
// each agent's CONFIG object (CONFIG.CANONICAL_RULES, CONFIG.EXPORT_MAP),
// not here.
// ============================================================================
