'use strict';

/**
 * core/prompts/projections/translate.js
 *
 * Tier B user-turn payload builder for the translate stage (DESIGN §6,
 * plan U7). Pure function: `(state, deps) → projectedBlock`.
 *
 * The translator runs once per non-primary language (DESIGN §F4 per-
 * language fan-out). Each dispatch fills `[<targetLanguage>_UNTRANSLATED]`
 * slots in `state.slotMap` for one language, never touching sibling
 * languages. The projection gives the translator:
 *
 *   - `dnt` (do-not-translate): symbols that must survive verbatim
 *     across translation (variable names, action names, disposition
 *     identifiers, system action names, plus the UNTRANSLATED tag
 *     regex source for self-detection).
 *   - `sectionHeaders`: canonical per-language section headers (the
 *     translator MUST emit the target-language header verbatim, not a
 *     translation of the primary-language one).
 *   - `register`: brief-author-provided register override, if any.
 *     Defaulting per language lives in `core/prompts/references/
 *     register.md` and is the translator's responsibility when this
 *     field is undefined.
 *   - `groundingLine`: the canonical target-language grounding sentence
 *     from `core/grounding-line.js`. The translator copies it verbatim
 *     into every scenario objective that has a KNOWLEDGE block.
 *   - `worklist`: every `[<targetLanguage>_UNTRANSLATED]` placeholder
 *     in `state.slotMap`, located by JSON path. Empty when the slotMap
 *     is unpopulated or already filled for this language.
 *   - `slotMapPrimaryProjection`: a structural copy of `state.slotMap`
 *     with every non-primary language slot stripped, so the translator
 *     has the source-language text in context without sibling-language
 *     noise.
 *
 * Inputs:
 *   state — `PipelineState` (reads `._meta`, `.intake`, `.slotMap`)
 *   deps  — `{ targetLanguage: 'NL' | 'FR' | 'DE' | 'EN' }`
 *
 * Public API:
 *   buildTranslateProjection(state, deps) → projectedBlock
 */

const { getGroundingLine } = require('../../grounding-line');
const { LANGUAGE_HEADERS } = require('../../languageHeaders');
const { SYSTEM_ACTIONS } = require('../../schema/slotMap');
const { UNTRANSLATED_RE } = require('../../schema/shared');

function collectDnt(state) {
    const intake = state.intake || {};
    const variables = Array.isArray(intake.variables) ? intake.variables : [];
    const cases = intake.cases || {};

    const variableNames = new Set();
    for (const v of variables) {
        if (v && typeof v.to === 'string') variableNames.add(v.to);
    }

    const actionNames = new Set();
    const dispositionNames = new Set();
    for (const c of Object.values(cases)) {
        const required = Array.isArray(c && c.actionsRequired)
            ? c.actionsRequired
            : [];
        for (const a of required) actionNames.add(a);
        const cdb = (c && c.cdbLogMap) || {};
        for (const [action, dispositions] of Object.entries(cdb)) {
            actionNames.add(action);
            for (const d of Object.keys(dispositions || {})) {
                dispositionNames.add(d);
            }
        }
    }
    const actionMessages = intake.actionMessages || {};
    for (const [action, dispositions] of Object.entries(actionMessages)) {
        actionNames.add(action);
        for (const d of Object.keys(dispositions || {})) {
            dispositionNames.add(d);
        }
    }

    return {
        variables: Array.from(variableNames).sort(),
        actions: Array.from(actionNames).sort(),
        dispositions: Array.from(dispositionNames).sort(),
        systemActions: Array.from(SYSTEM_ACTIONS).sort(),
        untranslatedTagPattern: UNTRANSLATED_RE.source,
    };
}

// JSON Pointer (RFC 6901) escapes for `~` and `/`. Deterministic and
// reversible — required for path stability across runs.
function escapePointerToken(key) {
    return key.replace(/~/g, '~0').replace(/\//g, '~1');
}

// Walk a value tree and collect JSON-pointer-like paths to every leaf
// string equal to the target language's UNTRANSLATED placeholder. The
// walk visits keys in `Object.keys` insertion order (matches the order
// JSON parse preserves). The final list is sorted by path so worklist
// ordering does not depend on whether `state.slotMap` was hydrated by
// parse or by in-memory construction.
function collectWorklist(slotMap, targetLanguage) {
    const placeholder = `[${targetLanguage}_UNTRANSLATED]`;
    const out = [];

    function walk(node, path) {
        if (node === null || node === undefined) return;
        if (typeof node === 'string') {
            if (node === placeholder) out.push(path);
            return;
        }
        if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) {
                walk(node[i], path + '/' + i);
            }
            return;
        }
        if (typeof node === 'object') {
            for (const key of Object.keys(node)) {
                walk(node[key], path + '/' + escapePointerToken(key));
            }
        }
    }

    walk(slotMap, '');
    return out.sort();
}

// Strip every per-language slot whose key is a QuadLang language code
// other than the primary, anywhere in the tree. `strip` constructs new
// objects/arrays at every level and reads only primitives from the
// input, so the input is never aliased into the output (no deep-clone
// roundtrip needed).
function projectPrimaryOnly(slotMap, primaryLanguage) {
    if (!slotMap || typeof slotMap !== 'object') return slotMap;
    const allLangs = Object.keys(LANGUAGE_HEADERS);
    const nonPrimary = allLangs.filter((l) => l !== primaryLanguage);

    function strip(node) {
        if (node === null || node === undefined) return node;
        if (Array.isArray(node)) return node.map(strip);
        if (typeof node === 'object') {
            const out = {};
            for (const key of Object.keys(node)) {
                if (nonPrimary.includes(key)) continue;
                out[key] = strip(node[key]);
            }
            return out;
        }
        return node;
    }

    return strip(slotMap);
}

function buildTranslateProjection(state, deps) {
    if (!state || !state._meta) {
        throw new Error(
            'prompts.projections.translate: state._meta is required'
        );
    }
    if (!deps || typeof deps.targetLanguage !== 'string') {
        throw new Error(
            'prompts.projections.translate: deps.targetLanguage is required'
        );
    }
    const { targetLanguage } = deps;
    const primaryLanguage = state._meta.primaryLanguage;
    if (typeof primaryLanguage !== 'string') {
        throw new Error(
            'prompts.projections.translate: state._meta.primaryLanguage must be a string'
        );
    }
    if (targetLanguage === primaryLanguage) {
        throw new Error(
            `prompts.projections.translate: targetLanguage "${targetLanguage}" equals primaryLanguage; no translation needed`
        );
    }
    if (!Object.prototype.hasOwnProperty.call(LANGUAGE_HEADERS, targetLanguage)) {
        throw new Error(
            `prompts.projections.translate: unknown targetLanguage "${targetLanguage}"`
        );
    }

    const intake = state.intake || {};
    const slotMap = state.slotMap || null;

    return {
        dnt: collectDnt(state),
        sectionHeaders: {
            primary: { ...LANGUAGE_HEADERS[primaryLanguage] },
            target: { ...LANGUAGE_HEADERS[targetLanguage] },
        },
        register: (intake.persona && intake.persona.register) || null,
        groundingLine: {
            primary: getGroundingLine(primaryLanguage),
            target: getGroundingLine(targetLanguage),
        },
        worklist: collectWorklist(slotMap, targetLanguage),
        slotMapPrimaryProjection: projectPrimaryOnly(slotMap, primaryLanguage),
    };
}

module.exports = { buildTranslateProjection };
