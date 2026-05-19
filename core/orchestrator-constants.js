'use strict';

/**
 * core/orchestrator-constants.js
 *
 * Pipeline-wide constants consumed by the FSM (`core/orchestratorFsm.js`),
 * the runner (`core/subagentRunner.js`), the SDK client wrapper
 * (`core/sdk-client.js`), and the entry binary (`bin/vocalls.js`).
 *
 * Public API:
 *   STAGES               -- frozen ordered tuple of pipeline stages
 *   STAGE_CONFIG         -- frozen per-stage Anthropic SDK config (model,
 *                           effort, maxTokens, optional thinking)
 *   REPAIR_CAP           -- maximum repair rounds per stage before escalating
 *   RETRY_MAX_ATTEMPTS   -- SDK-native retry attempts for transient failures
 *   RUN_LOG_PATH         -- relative path of the per-run JSONL log
 *
 * All exports are deep-frozen. Code is the source of truth; per-stage prompt
 * frontmatter mirrors STAGE_CONFIG for documentation only (DESIGN §9 / R3).
 */

const REPAIR_CAP = 3;
const RETRY_MAX_ATTEMPTS = 3;
const RUN_LOG_PATH = '.vocalls/run.log.jsonl';

const STAGES = Object.freeze([
    'intake',
    'scenarioDesign',
    'configBuild',
    'validate',
    'translate',
]);

// Per-stage Anthropic SDK config. Model + effort + thinking selections
// follow the claude-api skill guidance for Opus 4.7-era Anthropic SDKs:
//
//   - Effort works on Opus 4.5/4.6/4.7 and Sonnet 4.6; it errors on
//     Haiku 4.5 (translate). The translate stage therefore declares no
//     effort — the runner only forwards `output_config.effort` when the
//     stage config defines it.
//   - Adaptive thinking (`{type: 'adaptive', display: 'summarized'}`)
//     applies to every Opus 4.7 / Sonnet 4.6 stage per DESIGN §9. The
//     `display: 'summarized'` opt-in captures thinking content in
//     run.log.jsonl — the Opus 4.7 default `omitted` streams empty
//     thinking blocks. Haiku 4.5 (translate) declares no thinking
//     either: adaptive support there is not part of the documented
//     surface, and translate is the lowest-stakes per-language fan-out.
//   - 64K maxTokens is the recommended starting point for xhigh/max
//     effort and a safe ceiling for high-effort agentic stages.
//   - 32K covers intake parsing and validate findings without crowding.
//   - 16K is enough for per-language translate output.
//
// All stages exceed 16K so streaming is required at dispatch time
// (subagentRunner uses messages.stream().finalMessage()); bare
// messages.create() at >16K hits the SDK's HTTP timeout.
const STAGE_CONFIG = Object.freeze({
    intake: Object.freeze({
        model: 'claude-sonnet-4-6',
        effort: 'high',
        maxTokens: 32000,
        thinking: Object.freeze({ type: 'adaptive', display: 'summarized' }),
    }),
    scenarioDesign: Object.freeze({
        model: 'claude-opus-4-7',
        effort: 'xhigh',
        maxTokens: 64000,
        thinking: Object.freeze({ type: 'adaptive', display: 'summarized' }),
    }),
    configBuild: Object.freeze({
        model: 'claude-opus-4-7',
        effort: 'high',
        maxTokens: 64000,
        thinking: Object.freeze({ type: 'adaptive', display: 'summarized' }),
    }),
    validate: Object.freeze({
        model: 'claude-sonnet-4-6',
        effort: 'medium',
        maxTokens: 32000,
        thinking: Object.freeze({ type: 'adaptive', display: 'summarized' }),
    }),
    translate: Object.freeze({
        model: 'claude-haiku-4-5',
        maxTokens: 16000,
    }),
});

module.exports = Object.freeze({
    STAGES,
    STAGE_CONFIG,
    REPAIR_CAP,
    RETRY_MAX_ATTEMPTS,
    RUN_LOG_PATH,
});
