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
var COMPONENTS = ['checkSchedule', 'setVariables', 'guardRouting', 'guardTui', 'sendMail', 'sendSms', 'say'];

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

// The ENGINE setupConfig (rtds_3_vocallsEnv.js) is the twin of the component
// __setupConfig above. It must produce a byte-equivalent __rtParams so a JS
// handler and its canvas component resolve identically. These run against the
// booted runtime sandbox (env library loaded), not loadMasterCode.
describe('setupConfig (engine) — matches the component __setupConfig contract', function () {
    it('unwraps array-form to [0], coerces active, keeps non-string types', function () {
        return h.loadRuntime().then(function (sb) {
            var out = sb.setupConfig({
                active: ['1', 'isEditable'],
                prompt: ['AdHoc', 'isDisplayed', 'isEditable'],
                smsAccountId: 47,
                configId: '4',
                nextStep: '00002'
            });
            expect(out.active).toBe(true);
            expect(out.prompt).toBe('AdHoc');
            expect(out.smsAccountId).toBe(47);   // number preserved
            expect(out.configId).toBe('4');      // string preserved (no coercion)
            expect(out.nextStep).toBe('00002');
        });
    });

    it('resolves ${name} tokens via getScoped (varObj first)', function () {
        return h.loadRuntime().then(function (sb) {
            sb.varObj.rtToken = 'FROM_VAROBJ';
            var out = sb.setupConfig({ body: '${rtToken}' });
            expect(out.body).toBe('FROM_VAROBJ');
        });
    });

    it('leaves an unresolved ${placeholder} raw (never silent "")', function () {
        return h.loadRuntime().then(function (sb) {
            var out = sb.setupConfig({ body: '${nope_unset}' });
            expect(out.body).toBe('${nope_unset}');
        });
    });

    it('accepts a JSON string and a { params } wrapper, returns {} for null', function () {
        return h.loadRuntime().then(function (sb) {
            expect(sb.setupConfig('{"a":"1"}').a).toBe('1');
            expect(sb.setupConfig({ params: { b: 2 } }).b).toBe(2);
            expect(Object.keys(sb.setupConfig(null)).length).toBe(0);
        });
    });

    it('trims strings and maps empty array to ""', function () {
        return h.loadRuntime().then(function (sb) {
            var out = sb.setupConfig({ from: '  8850  ', empty: [] });
            expect(out.from).toBe('8850');
            expect(out.empty).toBe('');
        });
    });
});
