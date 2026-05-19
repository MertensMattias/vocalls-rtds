'use strict';

/**
 * autofix rule: action-messages-shape
 *
 * Rewraps a flat `{ success, failure }` shape under `actions.<name>.messages`
 * into the canonical `{ default: { success, failure } }` shape required by
 * SlotMapSchema.
 *
 * Trigger: finding.check === 'action_messages_shape'
 */

const NAME = 'action-messages-shape';

function matches(finding) {
    return finding && finding.check === 'action_messages_shape';
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
    const next = deepClone(slotMap);
    // The Mode 1 schema finding's location may point at the missing
    // `<...>.messages.default` key; in that case, target the parent
    // `<...>.messages` object so we can rewrap its flat shape.
    let location = finding.location;
    let messages = getAt(next, location);
    if ((!messages || typeof messages !== 'object') && location.endsWith('.default')) {
        location = location.slice(0, -'.default'.length);
        messages = getAt(next, location);
    }
    if (!messages || typeof messages !== 'object') {
        return { changed: false, mutated: slotMap, log: 'no messages object at location' };
    }
    if (messages.default && messages.default.success && messages.default.failure) {
        return { changed: false, mutated: slotMap, log: 'already canonical' };
    }
    if (!messages.success || !messages.failure) {
        return { changed: false, mutated: slotMap, log: 'no flat success/failure to rewrap' };
    }
    const rewrapped = {
        default: { success: messages.success, failure: messages.failure },
    };
    for (const key of Object.keys(messages)) {
        if (key !== 'success' && key !== 'failure' && key !== 'default') {
            rewrapped[key] = messages[key];
        }
    }
    setAt(next, location, rewrapped);
    return {
        changed: true,
        mutated: next,
        log: `${NAME}: rewrapped flat → default at ${location}`,
    };
}

module.exports = { name: NAME, matches, apply };
