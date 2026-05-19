'use strict';

const path = require('path');
const fs = require('fs');

const sdkStub = require('../../core/sdk-stub');

const defaultFixtures = JSON.parse(
    fs.readFileSync(
        path.join(__dirname, '..', '__fixtures__', 'sdk-stub-fixtures.json'),
        'utf8'
    )
);

describe('core/sdk-stub', () => {
    beforeEach(() => {
        sdkStub.resetDispatchLog();
    });

    test('dispatch returns the canned aggregated result, matching the fixture payload exactly', () => {
        const result = sdkStub.dispatch('intake', { _meta: { stage: 'intake' } });
        expect(result).toEqual(defaultFixtures.intake);
    });

    test('dispatch appends an entry to STUB_DISPATCH_LOG', () => {
        expect(sdkStub.STUB_DISPATCH_LOG).toHaveLength(0);
        sdkStub.dispatch('intake', {});
        expect(sdkStub.STUB_DISPATCH_LOG).toHaveLength(1);
        expect(sdkStub.STUB_DISPATCH_LOG[0]).toEqual({ stage: 'intake', index: 0 });
    });

    test('resetDispatchLog empties the log', () => {
        sdkStub.dispatch('intake', {});
        sdkStub.dispatch('validate', {});
        expect(sdkStub.STUB_DISPATCH_LOG).toHaveLength(2);
        sdkStub.resetDispatchLog();
        expect(sdkStub.STUB_DISPATCH_LOG).toHaveLength(0);
    });

    test('dispatch is deterministic across two consecutive calls, both equal to the fixture', () => {
        const a = sdkStub.dispatch('intake', { x: 1 });
        const b = sdkStub.dispatch('intake', { x: 2 });
        expect(a).toEqual(defaultFixtures.intake);
        expect(b).toEqual(defaultFixtures.intake);
    });

    test('dispatch returns a deep clone — mutating the result does not affect the next call', () => {
        const first = sdkStub.dispatch('intake', {});
        first.token = 'MUTATED';
        const second = sdkStub.dispatch('intake', {});
        expect(second.token).toBe(defaultFixtures.intake.token);
    });

    test('STUB_DISPATCH_LOG getter returns a copy (mutating it does not affect future reads)', () => {
        sdkStub.dispatch('intake', {});
        const snapshot = sdkStub.STUB_DISPATCH_LOG;
        snapshot.push({ stage: 'tampered', index: 99 });
        expect(sdkStub.STUB_DISPATCH_LOG).toHaveLength(1);
    });

    test('dispatch throws a module-prefixed error when no fixture is registered', () => {
        expect(() => sdkStub.dispatch('nonexistent_stage', {})).toThrow(
            /^sdk-stub\.dispatch:/
        );
    });

    test('dispatch throws when stage is not a non-empty string', () => {
        expect(() => sdkStub.dispatch('', {})).toThrow(/^sdk-stub\.dispatch:/);
        expect(() => sdkStub.dispatch(null, {})).toThrow(/^sdk-stub\.dispatch:/);
    });
});
