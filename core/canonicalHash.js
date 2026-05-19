"use strict";

/**
 * core/canonicalHash.js — deterministic sha256 hex digest of a JS value.
 *
 * canonicalHash(value):
 *   - sorts object keys
 *   - omits keys whose value is `undefined`
 *   - emits `null` as `null` (distinct from absent)
 *   - recursively canonicalizes arrays/objects (array order preserved)
 *   - JSON-stringifies the canonical form and sha256-hashes the UTF-8 bytes
 *   - returns the hex digest string
 *
 * Pure function. No I/O. Used by both the orchestrator (pre-dispatch hash
 * check) and producer subagents (post-success hash record) — see
 * docs/plans/2026-05-17-001-refactor-content-addressed-pipeline-stages-plan.md U1.
 */

const crypto = require("crypto");

function canonicalize(value) {
    if (value === null) return null;
    if (Array.isArray(value)) {
        // Array order is significant. Recurse on each element; `undefined`
        // elements become `null` (matches JSON.stringify's array semantics
        // and avoids losing positional information).
        return value.map((v) => (v === undefined ? null : canonicalize(v)));
    }
    if (typeof value === "object") {
        const out = {};
        const keys = Object.keys(value).sort();
        for (const k of keys) {
            const v = value[k];
            if (v === undefined) continue; // omit undefined keys
            out[k] = canonicalize(v);
        }
        return out;
    }
    // primitives (string, number, boolean) pass through; undefined at the
    // top level becomes a JSON `null` (JSON.stringify(undefined) is `undefined`,
    // which would break hashing — coerce to null for safety).
    return value;
}

function canonicalHash(value) {
    const canonical = canonicalize(value);
    const serialized = JSON.stringify(canonical);
    // `serialized` is undefined only if the input was undefined at the top
    // level. Hash an empty string in that case to keep the function total.
    const buf = Buffer.from(serialized === undefined ? "" : serialized, "utf8");
    return crypto.createHash("sha256").update(buf).digest("hex");
}

module.exports = { canonicalHash };
