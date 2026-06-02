/**
 * Contract test — the unified component-level __setupConfig / __activeFlag.
 *
 * Unlike the twin contract tests (which exercise executeXxx in the runtime),
 * this loads each component's OWN master-layer Code in an isolated sandbox with
 * NO env library (except the global activeFlag, which the component's
 * __activeFlag alias delegates to — see _harness.loadMasterCode), proving:
 *   - the inline helper fallback chain makes __setupConfig self-contained, and
 *   - the resolved Param contract matches specs/_setupConfig.spec.md:
 *       array-form [value, ...flags] -> [0]; type-from-JSON (no Number coercion);
 *       Active via the activeFlag contract (1/"1"/true active, 0/"0"/false
 *       inactive, array-aware); ${name} resolved varObj-first; unresolved kept
 *       raw + warn.
 *
 * See _harness.loadMasterCode and conventions/params.md.
 */

var h = require('./_harness');
var vm = require('vm');

// Every v2 component shares one __setupConfig body — run the full matrix against
// each so a future divergence in any single component is caught.
var COMPONENTS = ['checkSchedule', 'setVariables', 'guardRouting', 'guardTui', 'sendMail', 'sendSms'];

// Call __setupConfig(__cfg) inside a loaded sandbox and return the plain object.
function runSetup(sb) {
    return vm.runInContext('__setupConfig(__cfg)', sb);
}

COMPONENTS.forEach(function (comp) {
    describe('__setupConfig contract — ' + comp, function () {
        function resolve(params, seed) {
            var sb = h.loadMasterCode(comp, seed);
            sb.__cfg = JSON.stringify({ Params: params });
            return { r: runSetup(sb), warns: sb.__warns };
        }

        it('is self-contained (runs with no env library) and unwraps array-form to [0]', function () {
            var out = resolve({ Prompt: ['AdHoc', 'isDisplayed', 'isEditable'] });
            expect(out.r.Prompt).toBe('AdHoc');
        });

        it('preserves JSON types — number stays number, string stays string (no coercion)', function () {
            var out = resolve({ SmsAccountId: 47, ConfigId: '4', Timeout: 30 });
            expect(out.r.SmsAccountId).toBe(47);
            expect(out.r.ConfigId).toBe('4');     // string preserved, NOT Number('4')
            expect(out.r.Timeout).toBe(30);       // number preserved
        });

        it('coerces Active across encodings via the activeFlag alias', function () {
            expect(resolve({ Active: true }).r.Active).toBe(true);
            expect(resolve({ Active: 1 }).r.Active).toBe(true);
            expect(resolve({ Active: '1' }).r.Active).toBe(true);
            expect(resolve({ Active: 'true' }).r.Active).toBe(true);
            expect(resolve({ Active: false }).r.Active).toBe(false);
            expect(resolve({ Active: 0 }).r.Active).toBe(false);
            expect(resolve({ Active: '0' }).r.Active).toBe(false);
            expect(resolve({ Active: 'false' }).r.Active).toBe(false);
            expect(resolve({ Active: '' }).r.Active).toBe(false);
        });

        it('unwraps the Active array form before coercion ("0" stays falsy)', function () {
            expect(resolve({ Active: ['1', 'isEditable'] }).r.Active).toBe(true);
            expect(resolve({ Active: ['0', 'isEditable'] }).r.Active).toBe(false);
        });

        it('resolves ${name} varObj-first', function () {
            var out = resolve({ Body: '${rtToken}' }, { varObj: { rtToken: 'FROM_VAROBJ' } });
            expect(out.r.Body).toBe('FROM_VAROBJ');
        });

        it('falls back to global when not on varObj', function () {
            var out = resolve({ Body: '${gToken}' }, { global: { gToken: 'FROM_GLOBAL' } });
            expect(out.r.Body).toBe('FROM_GLOBAL');
        });

        it('leaves an unresolved placeholder raw and warns (never silent "")', function () {
            var out = resolve({ Body: '${nope}' });
            expect(out.r.Body).toBe('${nope}');
            expect(out.warns.length).toBeGreaterThan(0);
        });

        it('trims string values and maps empty array to ""', function () {
            var out = resolve({ From: '  8850  ', Empty: [] });
            expect(out.r.From).toBe('8850');
            expect(out.r.Empty).toBe('');
        });

        it('does NOT default Active when absent (read site decides)', function () {
            var out = resolve({ NextStep: '00001' });
            expect(out.r.hasOwnProperty('Active')).toBe(false);
        });
    });
});
