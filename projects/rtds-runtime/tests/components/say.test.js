/**
 * Contract test — say component (GUI-exit `play_prompt` target).
 *
 * `say` has no runtime twin (registerRtdsExit, not registerRtdsOperation), so
 * this test exercises two surfaces directly:
 *   1. the engine change — prepareGuiHandoff forwards op.ttsMessages onto
 *      RTDS_currentTtsMessages so the component can speak the per-language text;
 *   2. the component's own node bodies (init -> work -> output), run in an
 *      isolated sandbox: the active gate, the language pick from ttsMessages,
 *      and the single-branch outcome resolved once to nextStep.
 *
 * See rtds/specs/say.spec.md and _harness.loadMasterCode / readNodeAttr.
 */

var h = require('./_harness');
var vm = require('vm');

describe('say component', function () {

    describe('runtime: prepareGuiHandoff forwards ttsMessages', function () {
        it('sets RTDS_currentTtsMessages from op.ttsMessages, keeping params separate', function () {
            return h.loadRuntime().then(function (sb) {
                sb.prepareGuiHandoff({
                    id: '00001',
                    type: 'say',
                    params: { active: true, prompt: 'Welcome', nextStep: '00002' },
                    ttsMessages: { NL: 'Welkom', FR: 'Bienvenue' }
                });
                var vars = sb.context.session.variables;
                expect(vars.RTDS_currentTtsMessages).toEqual({ NL: 'Welkom', FR: 'Bienvenue' });
                expect(vars.RTDS_currentOpConfig).toEqual({ active: true, prompt: 'Welcome', nextStep: '00002' });
            });
        });

        it('defaults RTDS_currentTtsMessages to {} for a non-prompt op', function () {
            return h.loadRuntime().then(function (sb) {
                sb.prepareGuiHandoff({ id: '00050', type: 'internalTransfer', params: { nextStep: '00051' } });
                expect(sb.context.session.variables.RTDS_currentTtsMessages).toEqual({});
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
        function run(configParams, ttsMessages, language) {
            var sb = h.loadMasterCode('say');          // master Code: helpers + __rtParams = {}
            sb.__configJSON = JSON.stringify({ params: configParams });
            sb.__ttsMessages = ttsMessages;
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
    });
});
