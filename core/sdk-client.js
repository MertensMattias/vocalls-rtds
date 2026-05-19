'use strict';

/**
 * core/sdk-client.js
 *
 * Thin SDK-client factory used by `core/subagentRunner.js` (U8).
 *
 *   - Production: returns a fresh `Anthropic` instance configured with the
 *     pipeline's RETRY_MAX_ATTEMPTS. SDK-native exponential backoff covers
 *     408/409/429 (Anthropic.RateLimitError) and 5xx including 529
 *     (Anthropic.OverloadedError, Anthropic.APIError) per DESIGN §17.
 *     400 (BadRequestError) is fatal — surfaced to the runner as-is.
 *   - Stub mode: returns the deterministic `core/sdk-stub.js` module
 *     directly. Stub mode is enabled by the exact string `VOCALLS_SDK_STUB=1`;
 *     other truthy-looking values ('true', 'yes', '0', '1 ') route to
 *     production. The runner branches on `dispatch` vs `messages.create`
 *     per its mode.
 *
 * `process.env.VOCALLS_SDK_STUB` is read at every `getClient()` call —
 * never cached at module load — so tests and end-to-end smoke runs can
 * flip the flag between calls without rebuilding the module graph.
 *
 * `RETRY_MAX_ATTEMPTS` is the **pipeline-wide retry budget** (DESIGN §17).
 * The constant wins even if a caller passes `opts.maxRetries`; the spread
 * order is deliberate so callers cannot silently weaken the budget.
 *
 * Public API:
 *   getClient(opts?) -- returns either an Anthropic instance (prod) or the
 *                       sdk-stub module (stub mode). `opts` is forwarded to
 *                       the Anthropic constructor in prod mode and ignored
 *                       in stub mode; `opts.maxRetries` is overridden by
 *                       RETRY_MAX_ATTEMPTS.
 */

const { Anthropic } = require('@anthropic-ai/sdk');

const sdkStub = require('./sdk-stub');
const { RETRY_MAX_ATTEMPTS } = require('./orchestrator-constants');

function isStubMode() {
    return process.env.VOCALLS_SDK_STUB === '1';
}

function getClient(opts) {
    if (isStubMode()) {
        return sdkStub;
    }
    return new Anthropic({ ...(opts || {}), maxRetries: RETRY_MAX_ATTEMPTS });
}

module.exports = { getClient };
