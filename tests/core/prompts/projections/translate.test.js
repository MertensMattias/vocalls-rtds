'use strict';

const {
    buildTranslateProjection,
} = require('../../../../core/prompts/projections/translate');
const { SYSTEM_ACTIONS } = require('../../../../core/schema/slotMap');
const {
    LANGUAGE_HEADERS,
} = require('../../../../core/languageHeaders');
const { GROUNDING_LINES } = require('../../../../core/grounding-line');

function baseState() {
    return {
        _meta: {
            primaryLanguage: 'NL',
            languages: ['NL', 'FR', 'DE', 'EN'],
        },
        intake: {
            variables: [
                { from: 'api.customer.id', to: 'customerId' },
                { from: 'api.amount', to: 'amount', hook: ['toEuro'] },
            ],
            cases: {
                1: {
                    actionsRequired: ['send_email', 'transfer_to_agent'],
                    cdbLogMap: {
                        send_email: { SUCCESS: '1.send_email.success' },
                        transfer_to_agent: { FALLBACK_ERROR: '1.x.y' },
                    },
                },
                2: {
                    actionsRequired: ['lookup_balance'],
                    cdbLogMap: { lookup_balance: { FOUND: '2.lookup.found' } },
                },
            },
            actionMessages: {
                send_email: { SUCCESS: 'mailtekst' },
            },
            persona: { register: 'formal' },
        },
        slotMap: {
            agents: {
                PRIMARY: {
                    persona: {
                        description: {
                            NL: 'Hallo',
                            FR: '[FR_UNTRANSLATED]',
                            DE: '[DE_UNTRANSLATED]',
                            EN: '[EN_UNTRANSLATED]',
                        },
                    },
                },
            },
        },
    };
}

describe('translate projection — DNT (do-not-translate)', () => {
    test('collects intake variables (the `to` names)', () => {
        const r = buildTranslateProjection(baseState(), { targetLanguage: 'FR' });
        expect(r.dnt.variables).toEqual(['amount', 'customerId']);
    });

    test('collects action names from actionsRequired, cdbLogMap, actionMessages', () => {
        const r = buildTranslateProjection(baseState(), { targetLanguage: 'FR' });
        expect(r.dnt.actions).toEqual(
            ['lookup_balance', 'send_email', 'transfer_to_agent'].sort()
        );
    });

    test('collects disposition names from cdbLogMap and actionMessages', () => {
        const r = buildTranslateProjection(baseState(), { targetLanguage: 'FR' });
        expect(r.dnt.dispositions.sort()).toEqual(
            ['FALLBACK_ERROR', 'FOUND', 'SUCCESS'].sort()
        );
    });

    test('includes SYSTEM_ACTIONS', () => {
        const r = buildTranslateProjection(baseState(), { targetLanguage: 'FR' });
        expect(new Set(r.dnt.systemActions)).toEqual(SYSTEM_ACTIONS);
    });

    test('includes the UNTRANSLATED tag pattern source', () => {
        const r = buildTranslateProjection(baseState(), { targetLanguage: 'FR' });
        const re = new RegExp(r.dnt.untranslatedTagPattern);
        expect(re.test('[FR_UNTRANSLATED]')).toBe(true);
        expect(re.test('something else')).toBe(false);
    });
});

describe('translate projection — section headers + grounding line', () => {
    test('exposes primary and target section headers', () => {
        const r = buildTranslateProjection(baseState(), { targetLanguage: 'FR' });
        expect(r.sectionHeaders.primary).toEqual({ ...LANGUAGE_HEADERS.NL });
        expect(r.sectionHeaders.target).toEqual({ ...LANGUAGE_HEADERS.FR });
    });

    test('exposes primary and target grounding lines', () => {
        const r = buildTranslateProjection(baseState(), { targetLanguage: 'DE' });
        expect(r.groundingLine.primary).toBe(GROUNDING_LINES.NL);
        expect(r.groundingLine.target).toBe(GROUNDING_LINES.DE);
    });
});

describe('translate projection — register', () => {
    test('passes intake.persona.register through', () => {
        const r = buildTranslateProjection(baseState(), { targetLanguage: 'FR' });
        expect(r.register).toBe('formal');
    });

    test('returns null when persona.register is unset (default applies downstream)', () => {
        const state = baseState();
        delete state.intake.persona.register;
        const r = buildTranslateProjection(state, { targetLanguage: 'FR' });
        expect(r.register).toBeNull();
    });
});

describe('translate projection — worklist', () => {
    test('is non-empty when the slotMap contains target-language placeholders', () => {
        const r = buildTranslateProjection(baseState(), { targetLanguage: 'FR' });
        expect(r.worklist.length).toBeGreaterThan(0);
        expect(r.worklist[0]).toMatch(/\/FR$/);
    });

    test('targets only the requested language', () => {
        const r = buildTranslateProjection(baseState(), { targetLanguage: 'DE' });
        for (const p of r.worklist) {
            expect(p.endsWith('/DE')).toBe(true);
        }
    });

    test('is empty when slotMap is null', () => {
        const state = baseState();
        state.slotMap = null;
        const r = buildTranslateProjection(state, { targetLanguage: 'FR' });
        expect(r.worklist).toEqual([]);
    });
});

describe('translate projection — slotMapPrimaryProjection', () => {
    test('strips every non-primary language key', () => {
        const r = buildTranslateProjection(baseState(), { targetLanguage: 'FR' });
        const desc =
            r.slotMapPrimaryProjection.agents.PRIMARY.persona.description;
        expect(desc).toEqual({ NL: 'Hallo' });
    });

    test('does not mutate the input slotMap', () => {
        const state = baseState();
        const snapshot = JSON.stringify(state.slotMap);
        buildTranslateProjection(state, { targetLanguage: 'FR' });
        expect(JSON.stringify(state.slotMap)).toBe(snapshot);
    });
});

describe('translate projection — purity', () => {
    test('two calls return deep-equal output (byte-equal under JSON serialization)', () => {
        const a = buildTranslateProjection(baseState(), { targetLanguage: 'FR' });
        const b = buildTranslateProjection(baseState(), { targetLanguage: 'FR' });
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });
});

describe('translate projection — guards', () => {
    test('throws when targetLanguage equals primaryLanguage', () => {
        expect(() =>
            buildTranslateProjection(baseState(), { targetLanguage: 'NL' })
        ).toThrow(/equals primaryLanguage/);
    });

    test('throws on unknown targetLanguage', () => {
        expect(() =>
            buildTranslateProjection(baseState(), { targetLanguage: 'PT' })
        ).toThrow(/unknown targetLanguage "PT"/);
    });

    test('throws when state._meta is missing', () => {
        expect(() =>
            buildTranslateProjection({}, { targetLanguage: 'FR' })
        ).toThrow(/state\._meta is required/);
    });

    test('throws when deps.targetLanguage is missing', () => {
        expect(() => buildTranslateProjection(baseState(), {})).toThrow(
            /deps\.targetLanguage is required/
        );
    });
});
