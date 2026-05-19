'use strict';

/**
 * autofix rule: cdb-logs-canonical
 *
 * Rewraps a flat `actionName: 'cdbLogX'` shape under `cdbLogs.*.*` into the
 * canonical disposition-keyed shape `{ default: { success: 'cdbLogX' } }`.
 *
 * Trigger: finding.check === 'cdb_logs_structure'
 */

const NAME = 'cdb-logs-canonical';

function matches(finding) {
    return finding && finding.check === 'cdb_logs_structure';
}

function getAt(obj, dotPath) {
    return dotPath.split('.').reduce((cur, k) => (cur == null ? cur : cur[k]), obj);
}

function setAt(obj, dotPath, value) {
    const parts = dotPath.split('.');
    const last = parts.pop();
    const parent = parts.reduce((cur, k) => cur[k], obj);
    parent[last] = value;
}

function deepClone(o) {
    return JSON.parse(JSON.stringify(o));
}

function apply(slotMap, finding) {
    if (!matches(finding)) return { changed: false, mutated: slotMap, log: '' };
    // Guard the case-level `default: NonEmptyString` fallback under cdbLogs.<case>.
    // That key is a legitimate string and must not be rewrapped.
    const parts = finding.location.split('.');
    if (parts[parts.length - 1] === 'default') {
        return { changed: false, mutated: slotMap, log: `${NAME}: refused — case-level default fallback` };
    }
    const next = deepClone(slotMap);
    const cur = getAt(next, finding.location);
    if (typeof cur !== 'string') {
        return { changed: false, mutated: slotMap, log: 'value at location is not a flat string' };
    }
    setAt(next, finding.location, { default: { success: cur } });
    return {
        changed: true,
        mutated: next,
        log: `${NAME}: rewrapped string → disposition shape at ${finding.location}`,
    };
}

module.exports = { name: NAME, matches, apply };
