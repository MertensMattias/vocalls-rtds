/**
 * Contract test — say component (GUI-exit `play_prompt` target).
 *
 * `say` has no runtime twin (registerRtdsExit, not registerRtdsOperation), so
 * this test exercises two surfaces directly:
 *   1. the engine change — prepareGuiHandoff folds op.ttsMessages INTO the op
 *      config (RTDS_currentOpConfig) so the component speaks the per-language
 *      text from one refreshed source (no separate RTDS_currentTtsMessages var);
 *   2. the component's own node bodies (init -> work -> output), run in an
 *      isolated sandbox: the active gate, the language pick from ttsMessages,
 *      ${var} token resolution, and the single-branch outcome resolved to nextStep.
 *
 * See rtds/specs/say.spec.md and _harness.loadMasterCode / readNodeAttr.
 */

var h = require('./_harness');
var vm = require('vm');

describe('say component', function () {

    describe('runtime: prepareGuiHandoff folds ttsMessages into the op config', function () {
        it('folds op.ttsMessages INTO RTDS_currentOpConfig (sole source, no separate var)', function () {
            return h.loadRuntime().then(function (sb) {
                sb.prepareGuiHandoff({
                    id: '00001',
                    type: 'say',
                    params: { active: true, prompt: 'Welcome', nextStep: '00002' },
                    ttsMessages: { NL: 'Welkom', FR: 'Bienvenue' }
                });
                var vars = sb.context.session.variables;
                // Folded into the config the component re-reads every loop re-entry.
                expect(vars.RTDS_currentOpConfig).toEqual({
                    active: true, prompt: 'Welcome', nextStep: '00002',
                    ttsMessages: { NL: 'Welkom', FR: 'Bienvenue' }
                });
                // The legacy standalone mirror is gone -- nothing writes it anymore.
                expect(vars.RTDS_currentTtsMessages).toBeUndefined();
            });
        });

        it('does not mutate the source op.params when folding ttsMessages', function () {
            return h.loadRuntime().then(function (sb) {
                var op = {
                    id: '00001', type: 'say',
                    params: { active: true, prompt: 'Welcome', nextStep: '00002' },
                    ttsMessages: { NL: 'Welkom' }
                };
                sb.prepareGuiHandoff(op);
                // The cached routing-table params object is reused all call -- must stay clean.
                expect(op.params.hasOwnProperty('ttsMessages')).toBe(false);
            });
        });

        it('folds ttsMessages:{} for a non-prompt op (absent on op)', function () {
            return h.loadRuntime().then(function (sb) {
                sb.prepareGuiHandoff({ id: '00050', type: 'internalTransfer', params: { nextStep: '00051' } });
                expect(sb.context.session.variables.RTDS_currentOpConfig.ttsMessages).toEqual({});
            });
        });
    });

    describe('component bodies: active gate, language pick, outcome', function () {
        // Node bodies run as a function body in production (top-level `return` is
        // legal), so wrap before vm-eval — the work node's early return needs it.
        function runBody(sb, code) {
            vm.runInContext('(function () {\n' + code + '\n})();', sb);
        }

        // Run init(7) -> work(29) -> output(6) against seeded config/tts/language.
        // ttsMessages is the runtime-folded key INSIDE the op config -- the sole
        // tts source the component reads (no standalone __ttsMessages binding).
        function run(configParams, ttsMessages, language, varObj) {
            var sb = h.loadMasterCode('say', { varObj: varObj || {} });  // master Code: helpers + __rtParams = {}
            var params = {};
            for (var k in configParams) { if (configParams.hasOwnProperty(k)) params[k] = configParams[k]; }
            if (ttsMessages !== undefined) params.ttsMessages = ttsMessages;
            sb.__configJSON = JSON.stringify({ params: params });
            sb.language = language;
            sb.__sayText = '';                          // master Variables seeds
            sb.__rtOutcome = 'nextStep';
            sb._headers = null;
            sb._rtNextStep = null;
            runBody(sb, h.readNodeAttr('say', '7', 'Code'));      // init
            runBody(sb, h.readNodeAttr('say', '29', 'Code'));     // work
            runBody(sb, h.readNodeAttr('say', '6', 'OnEnter'));   // output
            return sb;
        }

        it('active=true: speaks the language-specific text (FR) and resolves nextStep', function () {
            var sb = run(
                { active: true, applicationId: 8, prompt: 'Welcome', nextStep: '00002' },
                { NL: 'Welkom', FR: 'Bienvenue' },
                'FR'
            );
            expect(sb.__sayText).toBe('Bienvenue');
            expect(sb.__rtOutcome).toBe('nextStep');
            expect(sb._rtNextStep).toBe('00002');
        });

        it('normalises + case-insensitively matches language (nl -> NL)', function () {
            var sb = run(
                { active: true, prompt: 'Welcome', nextStep: '00002' },
                { NL: 'Welkom', FR: 'Bienvenue' },
                'nl'
            );
            expect(sb.__sayText).toBe('Welkom');
        });

        it('falls back to NL when language is unset', function () {
            var sb = run(
                { active: true, prompt: 'Welcome', nextStep: '00002' },
                { NL: 'Welkom', FR: 'Bienvenue' },
                ''
            );
            expect(sb.__sayText).toBe('Welkom');
        });

        it('active=false: skips (no text spoken) but still resolves nextStep', function () {
            var sb = run(
                { active: false, prompt: 'Welcome', nextStep: '00002' },
                { NL: 'Welkom', FR: 'Bienvenue' },
                'NL'
            );
            expect(sb.__sayText).toBe('');
            expect(sb.__rtOutcome).toBe('nextStep');
            expect(sb._rtNextStep).toBe('00002');
        });

        // The folded config is the SOLE tts source: a stale standalone __ttsMessages
        // binding must be ignored entirely (no fallback). This is the per-step
        // freshness contract -- the canvas binding captured the FIRST op's text and
        // held it across every later say in the same call.
        it('reads tts only from __rtParams.ttsMessages, ignoring any __ttsMessages binding', function () {
            var sb = h.loadMasterCode('say', { global: { __ttsMessages: { NL: 'Welkom' } } });  // stale, must be ignored
            sb.__configJSON = JSON.stringify({ params: {
                active: true, prompt: 'Exception', nextStep: '00004',
                ttsMessages: { NL: 'Beste collega' }   // fresh, this step's text
            } });
            sb.language = 'NL';
            sb.__sayText = '';
            sb.__rtOutcome = 'nextStep';
            sb._headers = null;
            sb._rtNextStep = null;
            vm.runInContext('(function () {\n' + h.readNodeAttr('say', '7', 'Code') + '\n})();', sb);
            vm.runInContext('(function () {\n' + h.readNodeAttr('say', '29', 'Code') + '\n})();', sb);
            expect(sb.__sayText).toBe('Beste collega');
        });

        // No ttsMessages in the config at all -> empty text, warn, exit (no fallback).
        it('warns and speaks nothing when the config carries no ttsMessages', function () {
            var sb = run(
                { active: true, prompt: 'Welcome', nextStep: '00002' },
                undefined,                              // omit ttsMessages from config
                'NL'
            );
            expect(sb.__sayText).toBe('');
            expect(sb.__exitOperation).toBe(true);
            expect(sb._rtNextStep).toBe('00002');
        });

        // ${var} placeholders in the chosen language text are resolved (varObj first).
        it('resolves ${var} tokens in the spoken text via varObj', function () {
            var sb = run(
                { active: true, prompt: 'Welcome', nextStep: '00002' },
                { NL: 'Welkom ${callerName}, fijne dag' },
                'NL',
                { callerName: 'Jan' }                   // varObj seed
            );
            expect(sb.__sayText).toBe('Welkom Jan, fijne dag');
        });
    });
});
