'use strict';

/**
 * Remove every <lang>-keyed leaf from a CONFIG object.
 *
 * Pure function — returns a deep-cloned new object, does not mutate input.
 */

const LANG_SET = new Set(['NL', 'FR', 'DE', 'EN']);

const stripKey = (value, lang) => {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((v) => stripKey(v, lang));

    const out = {};
    for (const key of Object.keys(value)) {
        if (key === lang) continue;
        out[key] = stripKey(value[key], lang);
    }
    return out;
};

const stripLanguageFromConfig = (config, lang) => {
    if (!config || typeof config !== 'object') return config;
    if (!LANG_SET.has(lang)) return JSON.parse(JSON.stringify(config));
    const cloned = stripKey(config, lang);

    // _meta.languages list gets the language removed.
    if (cloned._meta && Array.isArray(cloned._meta.languages)) {
        cloned._meta.languages = cloned._meta.languages.filter((l) => l !== lang);
    }
    return cloned;
};

module.exports = { stripLanguageFromConfig, stripKey, LANG_SET };
