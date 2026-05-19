'use strict';

const sdkStub = require('../../core/sdk-stub');
const { getClient } = require('../../core/sdk-client');
const { RETRY_MAX_ATTEMPTS } = require('../../core/orchestrator-constants');

describe('core/sdk-client.getClient', () => {
    const originalEnvValue = process.env.VOCALLS_SDK_STUB;

    afterEach(() => {
        if (originalEnvValue === undefined) {
            delete process.env.VOCALLS_SDK_STUB;
        } else {
            process.env.VOCALLS_SDK_STUB = originalEnvValue;
        }
    });

    test('VOCALLS_SDK_STUB=1 returns the sdk-stub module (identity-checked)', () => {
        process.env.VOCALLS_SDK_STUB = '1';
        expect(getClient()).toBe(sdkStub);
    });

    test('VOCALLS_SDK_STUB unset returns an Anthropic instance with messages.create', () => {
        delete process.env.VOCALLS_SDK_STUB;
        const client = getClient();
        expect(client).not.toBe(sdkStub);
        expect(typeof client.messages.create).toBe('function');
    });

    test('VOCALLS_SDK_STUB=0 returns an Anthropic instance (only "1" enables stub mode)', () => {
        process.env.VOCALLS_SDK_STUB = '0';
        const client = getClient();
        expect(client).not.toBe(sdkStub);
        expect(typeof client.messages.create).toBe('function');
    });

    test('env flag changes between calls — getClient honors the latest value', () => {
        process.env.VOCALLS_SDK_STUB = '1';
        const stubMode = getClient();
        expect(stubMode).toBe(sdkStub);

        delete process.env.VOCALLS_SDK_STUB;
        const prodMode = getClient();
        expect(prodMode).not.toBe(sdkStub);

        process.env.VOCALLS_SDK_STUB = '1';
        const stubAgain = getClient();
        expect(stubAgain).toBe(sdkStub);
    });

    test('production path returns a fresh instance on each call', () => {
        delete process.env.VOCALLS_SDK_STUB;
        const a = getClient();
        const b = getClient();
        expect(a).not.toBe(b);
    });

    test('opts are forwarded to the Anthropic constructor in prod mode', () => {
        delete process.env.VOCALLS_SDK_STUB;
        const client = getClient({ baseURL: 'https://example.test/v1' });
        expect(client.baseURL).toBe('https://example.test/v1');
    });

    test('opts are ignored in stub mode (the stub is returned unchanged)', () => {
        process.env.VOCALLS_SDK_STUB = '1';
        expect(getClient({ baseURL: 'https://anywhere' })).toBe(sdkStub);
    });

    test('production client uses RETRY_MAX_ATTEMPTS as its maxRetries (DESIGN §17 pipeline-wide budget)', () => {
        delete process.env.VOCALLS_SDK_STUB;
        const client = getClient();
        expect(client.maxRetries).toBe(RETRY_MAX_ATTEMPTS);
    });

    test('opts.maxRetries cannot weaken the pipeline retry budget', () => {
        // RETRY_MAX_ATTEMPTS is the pipeline-wide retry budget per DESIGN §17.
        // Callers passing opts.maxRetries must NOT override it — the spread
        // order in getClient is deliberate. This pin prevents a future
        // refactor that swaps spread order from silently weakening retries.
        delete process.env.VOCALLS_SDK_STUB;
        const client = getClient({ maxRetries: 999 });
        expect(client.maxRetries).toBe(RETRY_MAX_ATTEMPTS);
    });
});
