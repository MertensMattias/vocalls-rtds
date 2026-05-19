'use strict';

/**
 * autofix rule registry.
 *
 * Each rule is a pure module exporting { name, matches(finding) → bool,
 * apply(slotMap, finding, ctx?) → { changed, mutated, log } }. The
 * optional ctx is forwarded from applyAll's third argument; today only
 * untranslated-marker-shape uses it (for ctx.primaryLanguage).
 *
 * applyAll iterates autofixable findings in order and applies the first
 * matching rule to each. A rule that does not change the slotMap is
 * silently skipped (its finding will still surface in the next Mode 1
 * pass). When an autofixable finding has no matching rule, a
 * `no-rule: <check> at <location>` entry is pushed to `logs` so registry
 * gaps surface diagnostically instead of silent no-ops.
 */

const RULES = [
    require('./action-messages-shape'),
    require('./cdb-logs-canonical'),
    require('./untranslated-marker-shape'),
];

function findRuleForFinding(finding) {
    return RULES.find((r) => r.matches(finding)) || null;
}

function applyAll(slotMap, findings, ctx = {}) {
    let mutated = slotMap;
    const applied = [];
    const logs = [];
    for (const f of findings) {
        if (!f.autofixable) continue;
        const rule = findRuleForFinding(f);
        if (!rule) {
            logs.push(`no-rule: ${f.check} at ${f.location}`);
            continue;
        }
        const r = rule.apply(mutated, f, ctx);
        if (r.changed) {
            mutated = r.mutated;
            applied.push(rule.name);
            logs.push(r.log);
        }
    }
    return { mutated, applied, logs };
}

module.exports = { RULES, findRuleForFinding, applyAll };
