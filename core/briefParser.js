'use strict';

/**
 * core/briefParser.js
 *
 * Deterministic regex-based extractor for the marker grammar in `brief.md`.
 * Tier B source of truth (DESIGN §6) — consumed by
 * `core/prompts/projections/intake.js` (U7) as the `parsedMarkers` and
 * `parserWarnings` projection feeding the intake stage's user-turn.
 *
 * Pure function. No I/O. No throws on malformed input — warnings are
 * collected into `parserWarnings` so intake can surface them as
 * `outstandingQuestions` (per DESIGN data-flow Invariant on parse
 * recoverability). The frontmatter parser here is intentionally
 * separate from `core/prompts/loader.js#parseFrontmatter`: this one is
 * recoverable (author-written brief.md), the loader's is strict
 * (pipeline-shipped prompt files). Keep the YAML subset they share in
 * sync if it grows.
 *
 * --- Marker grammar (single source of truth) ---
 *
 * The brief skill (`.claude/skills/vocalls-brief/`) emits markers as
 * HTML comments. The author may also write a YAML frontmatter block at
 * the top of the document. All shapes the parser recognises:
 *
 * 1. YAML frontmatter — optional. First line `---`, body of `key: value`
 *    lines, terminating `---` on its own line. Values are extracted as
 *    strings; unquoted, single-quoted, and double-quoted forms all
 *    yield the same payload. Missing frontmatter is silently allowed
 *    (returns an empty object).
 *
 * 2. Speech-placement marker — one per (action, disposition) pair the
 *    author classified:
 *
 *        <!-- BRIEF: action "<name>" disposition "<value>" — speech-placement: <kind> (confirmed by user on YYYY-MM-DD) -->
 *
 *    `<kind>` is `dsl_inline` or `action_message`. The em-dash (`—`,
 *    U+2014) is required literally — the brief skill emits it verbatim;
 *    parsers must not normalise to `--`. Recorded into
 *    `speechPlacements[<name>][<value>] = <kind>`.
 *
 * 3. Speech-text marker — one per `action_message` placement (PT-0007):
 *
 *        <!-- BRIEF: action_message "<name>" disposition "<value>" — "<text>" (confirmed by user on YYYY-MM-DD) -->
 *
 *    `<text>` is wrapped in straight double quotes; `\"` escapes a literal
 *    quote, `\\` escapes a literal backslash, `\n` encodes a newline.
 *    Empty string (`""`) means intentional silence under Pattern A.
 *    Recorded into `actionMessages[<name>][<value>] = <decoded text>`.
 *
 * 4. Custom-action marker — declares an action name the author wants to
 *    keep verbatim (the intake stage will skip canonicalisation):
 *
 *        <!-- BRIEF: custom_action "<name>" (confirmed by user on YYYY-MM-DD) -->
 *
 *    Recorded as an entry in the `customActionMarkers: string[]` array
 *    (de-duplicated, original-document order).
 *
 * Recovery rules:
 *
 *   - Malformed marker (recognised `<!-- BRIEF: ... -->` prefix but the
 *     payload does not match a known shape) -> append a warning, do not
 *     throw. The marker is dropped from the structured outputs.
 *   - An `action_message` text marker with no matching `action`+
 *     `disposition` speech-placement marker (whose kind is `action_message`)
 *     -> warning + dropped (the intake-time superRefine enforces the
 *     inverse pairing later).
 *   - Speech-placement kind other than `dsl_inline` / `action_message`
 *     -> warning + dropped.
 *   - BOM (U+FEFF) at the start of input is stripped silently.
 *   - Mojibake (a UTF-8 byte sequence mis-decoded to Latin-1) is detected
 *     heuristically and produces a warning; the parser does not attempt
 *     auto-correction.
 *
 * Public API:
 *   parseBrief(briefText)
 *     -> { frontmatter, speechPlacements, actionMessages,
 *          customActionMarkers, parserWarnings }
 *
 *   The four shape fields are always present (default empty); warnings
 *   are always an array (default empty). Callers can rely on these
 *   invariants without null-checking.
 */

// HTML-comment marker prefix all brief-skill emissions share. The em-dash
// is U+2014; the dispatcher tolerates extra whitespace inside the marker
// but the verbatim shape is what the brief skill writes.
const MARKER_PREFIX_RE = /^<!--\s*BRIEF:\s*/;

const SPEECH_PLACEMENT_RE = new RegExp(
    '^<!--\\s*BRIEF:\\s*' +
        'action\\s+"([^"]+)"\\s+disposition\\s+"([^"]+)"\\s+' +
        '\\u2014\\s*speech-placement:\\s*(\\S+)' +
        '\\s*(?:\\(confirmed by user on [^)]*\\))?\\s*-->$'
);

const ACTION_MESSAGE_RE = new RegExp(
    '^<!--\\s*BRIEF:\\s*' +
        'action_message\\s+"([^"]+)"\\s+disposition\\s+"([^"]+)"\\s+' +
        '\\u2014\\s*"((?:\\\\.|[^"\\\\])*)"' +
        '\\s*(?:\\(confirmed by user on [^)]*\\))?\\s*-->$'
);

const CUSTOM_ACTION_RE = new RegExp(
    '^<!--\\s*BRIEF:\\s*custom_action\\s+"([^"]+)"' +
        '\\s*(?:\\(confirmed by user on [^)]*\\))?\\s*-->$'
);

const VALID_PLACEMENT_KINDS = Object.freeze(['dsl_inline', 'action_message']);

// Heuristic: a UTF-8 lead byte 0xC2 or 0xC3 (the Latin Supplement
// range commonly mis-decoded as Latin-1) followed by a UTF-8
// continuation byte 0x80..0xBF. Catches pairs like 'Ã©' for 'é'
// (UTF-8 0xC3 0xA9 read as Latin-1) without trying to auto-correct.
//
// Spelled with explicit unicode escapes so the regex is editor-safe.
// The continuation-byte range contains U+0080..U+00BF which display
// as stray dashes in most editors and corrupt during routine edits.
const MOJIBAKE_RE = /[\u00C2\u00C3][\u0080-\u00BF]/;

function stripBom(text) {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function decodeQuoted(s) {
    let out = '';
    for (let i = 0; i < s.length; i++) {
        const c = s.charAt(i);
        if (c !== '\\') {
            out += c;
            continue;
        }
        const next = s.charAt(i + 1);
        if (next === 'n') out += '\n';
        else if (next === 't') out += '\t';
        else if (next === '\\') out += '\\';
        else if (next === '"') out += '"';
        else out += next;
        i++;
    }
    return out;
}

function parseFrontmatter(text) {
    // Optional. Returns { frontmatter, body, warnings }.
    if (!text.startsWith('---')) {
        return { frontmatter: {}, body: text, warnings: [] };
    }
    // Find the next `---` on its own line (after the opening one).
    const closingMatch = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
    if (!closingMatch) {
        return {
            frontmatter: {},
            body: text,
            warnings: ['briefParser: unterminated YAML frontmatter; ignored'],
        };
    }
    const block = closingMatch[1];
    const frontmatter = {};
    const warnings = [];
    const lines = block.split(/\r?\n/);
    for (const raw of lines) {
        const line = raw.trim();
        if (line.length === 0 || line.startsWith('#')) continue;
        const m = line.match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
        if (!m) {
            warnings.push(`briefParser: skipped malformed frontmatter line "${raw}"`);
            continue;
        }
        let value = m[2].trim();
        if (
            value.length >= 2 &&
            ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'")))
        ) {
            value = value.slice(1, -1);
        }
        frontmatter[m[1]] = value;
    }
    const body = text.slice(closingMatch[0].length);
    return { frontmatter, body, warnings };
}

function parseBrief(briefText) {
    const result = {
        frontmatter: {},
        speechPlacements: {},
        actionMessages: {},
        customActionMarkers: [],
        parserWarnings: [],
    };

    if (typeof briefText !== 'string') {
        result.parserWarnings.push('briefParser: brief input is not a string');
        return result;
    }

    let text = stripBom(briefText);
    if (MOJIBAKE_RE.test(text)) {
        result.parserWarnings.push(
            'briefParser: input appears to contain mojibake (UTF-8 mis-decoded as Latin-1); fix the source encoding'
        );
    }

    const fm = parseFrontmatter(text);
    result.frontmatter = fm.frontmatter;
    result.parserWarnings.push(...fm.warnings);
    text = fm.body;

    const seenCustomActions = new Set();
    const lines = text.split(/\r?\n/);
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!MARKER_PREFIX_RE.test(line)) continue;

        const placement = line.match(SPEECH_PLACEMENT_RE);
        if (placement) {
            const [, action, disposition, kind] = placement;
            if (!VALID_PLACEMENT_KINDS.includes(kind)) {
                result.parserWarnings.push(
                    `briefParser: unknown speech-placement kind "${kind}" for action "${action}" disposition "${disposition}"`
                );
                continue;
            }
            if (!result.speechPlacements[action]) {
                result.speechPlacements[action] = {};
            }
            result.speechPlacements[action][disposition] = kind;
            continue;
        }

        const message = line.match(ACTION_MESSAGE_RE);
        if (message) {
            const [, action, disposition, quoted] = message;
            if (!result.actionMessages[action]) {
                result.actionMessages[action] = {};
            }
            result.actionMessages[action][disposition] = decodeQuoted(quoted);
            continue;
        }

        const custom = line.match(CUSTOM_ACTION_RE);
        if (custom) {
            const [, action] = custom;
            if (!seenCustomActions.has(action)) {
                seenCustomActions.add(action);
                result.customActionMarkers.push(action);
            }
            continue;
        }

        result.parserWarnings.push(`briefParser: unrecognised marker "${line}"`);
    }

    // Pair action_message text markers with their speech-placement markers.
    // A text marker whose pair is missing or mis-classified is dropped + warned.
    for (const action of Object.keys(result.actionMessages)) {
        for (const disposition of Object.keys(result.actionMessages[action])) {
            const placement =
                result.speechPlacements[action] &&
                result.speechPlacements[action][disposition];
            if (placement !== 'action_message') {
                const declared = placement === undefined ? 'unset' : `'${placement}'`;
                result.parserWarnings.push(
                    `briefParser: action_message "${action}" disposition "${disposition}" has no matching action_message placement (placement: ${declared}); text dropped`
                );
                delete result.actionMessages[action][disposition];
                if (Object.keys(result.actionMessages[action]).length === 0) {
                    delete result.actionMessages[action];
                }
            }
        }
    }

    return result;
}

module.exports = { parseBrief };
