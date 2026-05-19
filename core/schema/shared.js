'use strict';

const { z } = require('zod');

const SUPPORTED_LANGS = ['NL', 'FR', 'DE', 'EN'];

const LangCode = z.enum(SUPPORTED_LANGS);

const NonEmptyString = z.string().min(1);
const NonEmptyTrimmed = z.string().trim().min(1);

const LangRecord = (innerSchema) =>
    z.object({
        NL: innerSchema,
        FR: innerSchema,
        DE: innerSchema,
        EN: innerSchema,
    });

const UntranslatedTag = (lang) => z.literal(`[${lang}_UNTRANSLATED]`);

// PerLangText: non-empty text OR exactly this language's UNTRANSLATED tag.
// A naive z.union([NonEmptyString, UntranslatedTag(lang)]) would accept any
// non-empty string — including a wrong-language tag like '[NL_UNTRANSLATED]'
// stored under a FR slot. We use a refine so cross-language tag leakage
// (a real bug pattern translators introduce) fails fast.
const UNTRANSLATED_RE = /^\[([A-Z]{2})_UNTRANSLATED\]$/;
const PerLangText = (lang) =>
    z.string().refine(
        (s) => {
            if (s.length === 0) return false;
            const m = s.match(UNTRANSLATED_RE);
            if (m && m[1] !== lang) return false;
            return true;
        },
        {
            error: (iss) =>
                iss.input.length === 0
                    ? 'PerLangText: empty string'
                    : `PerLangText: cross-language UNTRANSLATED tag "${iss.input}" not allowed for ${lang}`,
        }
    );

// MaybeSilentText: like PerLangText but ALSO accepts the empty string.
// Empty strings are intentional silent values in V4 system actions
// (transfer_to_agent, escalate_to_agent, end_conversation per ADR-009)
// and in any action's messages where an outcome is intentionally silent
// for that disposition. Use only at action message paths
// (confirmation_message, messages.{default,disposition}.{success,failure}).
// Cross-language UNTRANSLATED tag leakage is still rejected.
const MaybeSilentText = (lang) =>
    z.string().refine(
        (s) => {
            const m = s.match(UNTRANSLATED_RE);
            if (m && m[1] !== lang) return false;
            return true;
        },
        {
            error: (iss) =>
                `MaybeSilentText: cross-language UNTRANSLATED tag "${iss.input}" not allowed for ${lang}`,
        }
    );

const CaseNumber = z.string().regex(/^\d+(\.\d+)*$/);
const ScenarioKey = z.string().regex(/^[a-z][a-z0-9_]*$/);
const ActionName = z.string().regex(/^[a-z][a-z0-9_]*$/);
const KnowledgeKey = z.string().regex(/^[a-z][a-z0-9_]*$/);

const CanonicalRule = z.object({
    from: NonEmptyString,
    to: NonEmptyString,
    hook: z.array(NonEmptyString).optional(),
});

// SYSTEM_ACTION_SYNONYMS — the single source of truth for confident-synonym
// canonicalization rules. The brief skill (Phase 2.6) and the intake agent
// (action-name canonicalization) both apply these mappings. Adding a new
// synonym here is the only edit required — the rendered table in
// docs/schema/shared.md regenerates from this constant via gen-docs.js.
const SYSTEM_ACTION_SYNONYMS = Object.freeze({
    transfer_to_operator: 'transfer_to_agent',
    transfer_to_human: 'transfer_to_agent',
    transfer_to_csr: 'transfer_to_agent',
    escalate_to_operator: 'escalate_to_agent',
    escalate_to_human: 'escalate_to_agent',
});

module.exports = {
    LangCode,
    SUPPORTED_LANGS,
    NonEmptyString,
    NonEmptyTrimmed,
    LangRecord,
    UntranslatedTag,
    UNTRANSLATED_RE,
    PerLangText,
    MaybeSilentText,
    CaseNumber,
    ScenarioKey,
    ActionName,
    KnowledgeKey,
    CanonicalRule,
    SYSTEM_ACTION_SYNONYMS,
};
