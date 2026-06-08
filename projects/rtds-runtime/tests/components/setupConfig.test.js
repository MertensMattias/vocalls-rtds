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
            sb.__cfg = JSON.stringify({ params: params });
            return { r: runSetup(sb), warns: sb.__warns };
        }

        it('is self-contained (runs with no env library) and unwraps array-form to [0]', function () {
            var out = resolve({ prompt: ['AdHoc', 'isDisplayed', 'isEditable'] });
            expect(out.r.prompt).toBe('AdHoc');
        });

        it('preserves JSON types — number stays number, string stays string (no coercion)', function () {
            var out = resolve({ smsAccountId: 47, configId: '4', timeout: 30 });
            expect(out.r.smsAccountId).toBe(47);
            expect(out.r.configId).toBe('4');     // string preserved, NOT Number('4')
            expect(out.r.timeout).toBe(30);       // number preserved
        });

        it('coerces Active across encodings via the activeFlag alias', function () {
            expect(resolve({ active: true }).r.active).toBe(true);
            expect(resolve({ active: 1 }).r.active).toBe(true);
            expect(resolve({ active: '1' }).r.active).toBe(true);
            expect(resolve({ active: 'true' }).r.active).toBe(true);
            expect(resolve({ active: false }).r.active).toBe(false);
            expect(resolve({ active: 0 }).r.active).toBe(false);
            expect(resolve({ active: '0' }).r.active).toBe(false);
            expect(resolve({ active: 'false' }).r.active).toBe(false);
            expect(resolve({ active: '' }).r.active).toBe(false);
        });

        it('unwraps the Active array form before coercion ("0" stays falsy)', function () {
            expect(resolve({ active: ['1', 'isEditable'] }).r.active).toBe(true);
            expect(resolve({ active: ['0', 'isEditable'] }).r.active).toBe(false);
        });

        it('resolves ${name} varObj-first', function () {
            var out = resolve({ body: '${rtToken}' }, { varObj: { rtToken: 'FROM_VAROBJ' } });
            expect(out.r.body).toBe('FROM_VAROBJ');
        });

        it('falls back to global when not on varObj', function () {
            var out = resolve({ body: '${gToken}' }, { global: { gToken: 'FROM_GLOBAL' } });
            expect(out.r.body).toBe('FROM_GLOBAL');
        });

        it('leaves an unresolved placeholder raw and warns (never silent "")', function () {
            var out = resolve({ body: '${nope}' });
            expect(out.r.body).toBe('${nope}');
            expect(out.warns.length).toBeGreaterThan(0);
        });

        it('trims string values and maps empty array to ""', function () {
            var out = resolve({ from: '  8850  ', empty: [] });
            expect(out.r.from).toBe('8850');
            expect(out.r.empty).toBe('');
        });

        it('does NOT default Active when absent (read site decides)', function () {
            var out = resolve({ nextStep: '00001' });
            expect(out.r.hasOwnProperty('active')).toBe(false);
        });
    });
});
