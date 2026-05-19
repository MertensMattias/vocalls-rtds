'use strict';

const { parseBrief } = require('../../core/briefParser');

const EM_DASH = '—';

function placement(action, disposition, kind) {
    return (
        `<!-- BRIEF: action "${action}" disposition "${disposition}" ${EM_DASH} ` +
        `speech-placement: ${kind} (confirmed by user on 2026-05-18) -->`
    );
}

function message(action, disposition, text) {
    return (
        `<!-- BRIEF: action_message "${action}" disposition "${disposition}" ${EM_DASH} ` +
        `"${text}" (confirmed by user on 2026-05-18) -->`
    );
}

function custom(action) {
    return `<!-- BRIEF: custom_action "${action}" (confirmed by user on 2026-05-18) -->`;
}

describe('parseBrief — return-shape invariants', () => {
    test('always returns all five fields with safe defaults on empty input', () => {
        const r = parseBrief('');
        expect(r).toEqual({
            frontmatter: {},
            speechPlacements: {},
            actionMessages: {},
            customActionMarkers: [],
            parserWarnings: [],
        });
    });

    test('non-string input is recovered into a warning, not a throw', () => {
        const r = parseBrief(undefined);
        expect(r.parserWarnings.length).toBeGreaterThan(0);
        expect(r.parserWarnings[0]).toMatch(/^briefParser:/);
        expect(r.frontmatter).toEqual({});
    });
});

describe('parseBrief — YAML frontmatter', () => {
    test('parses key:value pairs into frontmatter', () => {
        const r = parseBrief('---\nproject: demo\nprimary: NL\n---\n# body');
        expect(r.frontmatter).toEqual({ project: 'demo', primary: 'NL' });
        expect(r.parserWarnings).toEqual([]);
    });

    test('strips matching single and double quotes around values', () => {
        const r = parseBrief('---\na: "with spaces"\nb: \'single\'\nc: bare\n---\n');
        expect(r.frontmatter).toEqual({ a: 'with spaces', b: 'single', c: 'bare' });
    });

    test('missing frontmatter returns empty object with no warning', () => {
        const r = parseBrief('# heading\nbody only\n');
        expect(r.frontmatter).toEqual({});
        expect(r.parserWarnings).toEqual([]);
    });

    test('unterminated frontmatter is a warning, not a throw', () => {
        const r = parseBrief('---\nproject: demo\nno-closing-fence: true\nbody continues');
        expect(r.frontmatter).toEqual({});
        expect(r.parserWarnings.some((w) => /unterminated/i.test(w))).toBe(true);
    });

    test('malformed frontmatter lines produce a warning but other lines still parse', () => {
        const r = parseBrief('---\nproject: demo\nNOT_A_KEY_VALUE_LINE\n---\n');
        expect(r.frontmatter).toEqual({ project: 'demo' });
        expect(r.parserWarnings.some((w) => /malformed/.test(w))).toBe(true);
    });

    test('frontmatter is recognised after BOM', () => {
        const r = parseBrief('﻿---\nproject: demo\n---\n');
        expect(r.frontmatter).toEqual({ project: 'demo' });
    });
});

describe('parseBrief — speech-placement markers', () => {
    test('records (action, disposition) -> placement kind', () => {
        const r = parseBrief(placement('send_email', 'REACTIVATE', 'dsl_inline'));
        expect(r.speechPlacements).toEqual({
            send_email: { REACTIVATE: 'dsl_inline' },
        });
    });

    test('supports multiple actions and multiple dispositions per action', () => {
        const brief = [
            placement('a', 'X', 'dsl_inline'),
            placement('a', 'Y', 'action_message'),
            placement('b', 'X', 'action_message'),
        ].join('\n');
        const r = parseBrief(brief);
        expect(r.speechPlacements).toEqual({
            a: { X: 'dsl_inline', Y: 'action_message' },
            b: { X: 'action_message' },
        });
    });

    test('unknown placement kind produces a warning and drops the marker', () => {
        const r = parseBrief(placement('send_email', 'X', 'banana'));
        expect(r.speechPlacements).toEqual({});
        expect(r.parserWarnings.some((w) => /unknown speech-placement kind/.test(w))).toBe(
            true
        );
    });
});

describe('parseBrief — action_message text markers', () => {
    test('records text verbatim when paired with action_message placement', () => {
        const brief = [
            placement('send_email', 'SUCCESS', 'action_message'),
            message('send_email', 'SUCCESS', 'Wij sturen u een bevestigingsmail.'),
        ].join('\n');
        const r = parseBrief(brief);
        expect(r.actionMessages).toEqual({
            send_email: { SUCCESS: 'Wij sturen u een bevestigingsmail.' },
        });
        expect(r.parserWarnings).toEqual([]);
    });

    test('empty string text is preserved (intentional silence)', () => {
        const brief = [
            placement('send_email', 'X', 'action_message'),
            message('send_email', 'X', ''),
        ].join('\n');
        const r = parseBrief(brief);
        expect(r.actionMessages.send_email.X).toBe('');
    });

    test('decodes escaped quotes, backslashes, and newlines', () => {
        const brief = [
            placement('a', 'd', 'action_message'),
            message('a', 'd', 'line one\\nline two with \\"quote\\" and \\\\backslash'),
        ].join('\n');
        const r = parseBrief(brief);
        expect(r.actionMessages.a.d).toBe('line one\nline two with "quote" and \\backslash');
    });

    test('text marker without matching placement is dropped + warned (Pattern A pairing required)', () => {
        const r = parseBrief(message('send_email', 'X', 'hello'));
        expect(r.actionMessages).toEqual({});
        expect(
            r.parserWarnings.some((w) =>
                /no matching action_message placement/.test(w)
            )
        ).toBe(true);
    });

    test('text marker whose paired placement is dsl_inline is dropped + warned', () => {
        const brief = [
            placement('send_email', 'X', 'dsl_inline'),
            message('send_email', 'X', 'hello'),
        ].join('\n');
        const r = parseBrief(brief);
        expect(r.actionMessages).toEqual({});
        expect(
            r.parserWarnings.some((w) =>
                /placement: 'dsl_inline'/.test(w)
            )
        ).toBe(true);
    });
});

describe('parseBrief — custom_action markers', () => {
    test('collects names into customActionMarkers in document order', () => {
        const brief = [custom('foo'), custom('bar'), custom('baz')].join('\n');
        const r = parseBrief(brief);
        expect(r.customActionMarkers).toEqual(['foo', 'bar', 'baz']);
    });

    test('de-duplicates repeated declarations', () => {
        const brief = [custom('foo'), custom('foo')].join('\n');
        const r = parseBrief(brief);
        expect(r.customActionMarkers).toEqual(['foo']);
    });
});

describe('parseBrief — recovery and warnings', () => {
    test('unrecognised BRIEF: marker shape produces a warning, not a throw', () => {
        const r = parseBrief('<!-- BRIEF: garbage shape here -->');
        expect(r.parserWarnings.some((w) => /unrecognised marker/.test(w))).toBe(true);
    });

    test('non-BRIEF: HTML comments are ignored silently', () => {
        const r = parseBrief('<!-- BRIEF_NOTE: not a marker -->\nbody\n<!-- other -->');
        expect(r.parserWarnings).toEqual([]);
    });

    test('BOM at start is stripped silently', () => {
        const brief = '﻿' + placement('a', 'X', 'dsl_inline');
        const r = parseBrief(brief);
        expect(r.speechPlacements.a.X).toBe('dsl_inline');
    });

    test('detects mojibake (UTF-8 mis-decoded as Latin-1) with a warning', () => {
        // 'Ã©' is the Latin-1 mis-reading of UTF-8 0xC3 0xA9 ('é'). Markers
        // live on their own lines in a real brief, so the marker still
        // parses cleanly even when prose elsewhere contains mojibake.
        const mojibake = 'Ã©'; // explicit codepoints — editor-safe.
        const brief = ['caf' + mojibake + ' restaurant', placement('a', 'X', 'dsl_inline')].join(
            '\n'
        );
        const r = parseBrief(brief);
        expect(r.parserWarnings.some((w) => /mojibake/.test(w))).toBe(true);
        expect(r.speechPlacements.a.X).toBe('dsl_inline');
    });

    test('clean UTF-8 input does NOT trigger a mojibake warning (regression guard)', () => {
        // Properly-encoded UTF-8 'café' is single codepoint U+00E9 for 'é';
        // the lead-byte heuristic should NOT fire on this.
        const brief = ['café restaurant', placement('a', 'X', 'dsl_inline')].join('\n');
        const r = parseBrief(brief);
        expect(r.parserWarnings.some((w) => /mojibake/.test(w))).toBe(false);
        expect(r.speechPlacements.a.X).toBe('dsl_inline');
    });

    test('handles CRLF line endings', () => {
        const brief = [
            placement('a', 'X', 'action_message'),
            message('a', 'X', 'hi'),
        ].join('\r\n');
        const r = parseBrief(brief);
        expect(r.actionMessages.a.X).toBe('hi');
    });
});

describe('parseBrief — end-to-end realistic input', () => {
    test('combined frontmatter + multiple marker kinds', () => {
        const brief = [
            '---',
            'project: demo',
            'primary: NL',
            '---',
            '# heading',
            '',
            placement('send_email', 'SUCCESS', 'action_message'),
            message('send_email', 'SUCCESS', 'Wij sturen u een bevestigingsmail.'),
            placement('create_mandate', 'REACTIVATE', 'dsl_inline'),
            custom('lookup_balance'),
            'Some body text.',
        ].join('\n');
        const r = parseBrief(brief);
        expect(r.frontmatter).toEqual({ project: 'demo', primary: 'NL' });
        expect(r.speechPlacements).toEqual({
            send_email: { SUCCESS: 'action_message' },
            create_mandate: { REACTIVATE: 'dsl_inline' },
        });
        expect(r.actionMessages).toEqual({
            send_email: { SUCCESS: 'Wij sturen u een bevestigingsmail.' },
        });
        expect(r.customActionMarkers).toEqual(['lookup_balance']);
        expect(r.parserWarnings).toEqual([]);
    });
});

describe('parseBrief — purity', () => {
    test('two calls on the same input return deep-equal outputs', () => {
        const brief = [
            placement('a', 'X', 'action_message'),
            message('a', 'X', 'hello'),
            custom('c1'),
        ].join('\n');
        expect(parseBrief(brief)).toEqual(parseBrief(brief));
    });

    test('returns a fresh object every call (no shared mutable state)', () => {
        const brief = [placement('a', 'X', 'dsl_inline'), custom('c1')].join('\n');
        const first = parseBrief(brief);
        expect(parseBrief(brief)).not.toBe(first);
        expect(parseBrief(brief).speechPlacements).not.toBe(first.speechPlacements);
        expect(parseBrief(brief).customActionMarkers).not.toBe(first.customActionMarkers);

        // Mutating the first result must not affect subsequent calls.
        first.customActionMarkers.push('mutation');
        first.speechPlacements.tampered = { Y: 'dsl_inline' };
        const second = parseBrief(brief);
        expect(second.customActionMarkers).toEqual(['c1']);
        expect(second.speechPlacements).toEqual({ a: { X: 'dsl_inline' } });
    });
});
