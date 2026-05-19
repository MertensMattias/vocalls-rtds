'use strict';

const CHARS_PER_TOKEN = 4;
const WARN_THRESHOLD = 3500;
const ERROR_THRESHOLD = 4000;

const issue = (check, severity, location, detail) => ({ check, severity, location, detail });

/**
 * Estimate token count for a string.
 * @param {string} text
 * @returns {number}
 */
const estimateTokens = (text) => {
    if (typeof text !== 'string') return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
};

/**
 * Estimate total tokens for a scenario objective + facts across all languages.
 * @param {object} scenario - scenario object with objective and facts
 * @param {string[]} languages
 * @returns {number}
 */
const estimateScenarioTokens = (scenario, languages) => {
    let total = 0;
    for (const lang of languages) {
        const obj = scenario?.objective?.[lang] ?? '';
        total += estimateTokens(obj);
        const facts = scenario?.facts?.[lang] ?? [];
        const factsText = Array.isArray(facts) ? facts.join('\n') : String(facts);
        total += estimateTokens(factsText);
    }
    return total;
};

/**
 * Check token budget for all scenarios in a CONFIG.
 *
 * @param {object} agentConfig
 * @returns {object[]} Array of issue objects
 */
const checkTokenBudget = (agentConfig) => {
    const issues = [];
    const scenarios = agentConfig?.scenarios ?? {};
    const languages = agentConfig?._meta?.languages ?? [];

    for (const [key, scenario] of Object.entries(scenarios)) {
        if (key === 'fallback_error') continue;
        const tokens = estimateScenarioTokens(scenario, languages);

        if (tokens >= ERROR_THRESHOLD) {
            issues.push(
                issue(
                    'token_budget',
                    'error',
                    `scenarios.${key}`,
                    `Scenario "${key}" estimated at ~${tokens} tokens — exceeds hard limit of ${ERROR_THRESHOLD}`
                )
            );
        } else if (tokens >= WARN_THRESHOLD) {
            issues.push(
                issue(
                    'token_budget',
                    'warning',
                    `scenarios.${key}`,
                    `Scenario "${key}" estimated at ~${tokens} tokens — approaching limit of ${ERROR_THRESHOLD}`
                )
            );
        }
    }

    return issues;
};

module.exports = {
    estimateTokens,
    estimateScenarioTokens,
    checkTokenBudget,
    WARN_THRESHOLD,
    ERROR_THRESHOLD,
    CHARS_PER_TOKEN,
};
