'use strict';

/**
 * core/llmJudge.js — single seam between deterministic validator logic and
 * LLM-judgment modes (Mode 3 DSL conformance, Mode 5 brief fidelity).
 *
 * Public API:
 *   judgeDsl({ scenarioKey, language, objective, type }) -> Promise<Finding[]>
 *   judgeBriefFidelity({ briefText, assembledPrimary }) -> Promise<Finding[]>
 *
 * Both functions return arrays conforming to ValidationFindingSchema. Errors
 * during the SDK call propagate to the caller (validatorRunner.js handles
 * mode-3/5 fault tolerance).
 *
 * Strategy selection (plan 001 U11, Option B): a per-call check on
 * process.env.ANTHROPIC_API_KEY picks the backend. When the key is present,
 * runJudgeViaRawSdk uses @anthropic-ai/sdk messages.create with a strict
 * tool_choice-forced tool whose input_schema mirrors FINDINGS_SCHEMA. When
 * absent, runJudgeViaAgentSdk uses the Claude Agent SDK and inherits Claude
 * Code subscription auth. Both paths expose the same Public API.
 */

const { z } = require('zod');
const { ValidationFindingSchema } = require('./schema');

const FINDINGS_SCHEMA = z.array(ValidationFindingSchema);
const FINDINGS_ITEM_JSON_SCHEMA = z.toJSONSchema(ValidationFindingSchema);
const FINDINGS_JSON_SCHEMA = z.toJSONSchema(FINDINGS_SCHEMA);

const EMIT_FINDINGS_TOOL_NAME = 'emit_findings';
const EMIT_FINDINGS_TOOL = {
    name: EMIT_FINDINGS_TOOL_NAME,
    description:
        'Emit the validation findings array as the structured response. Pass an empty array when the input is fully conformant.',
    strict: true,
    input_schema: {
        type: 'object',
        properties: {
            findings: {
                type: 'array',
                items: FINDINGS_ITEM_JSON_SCHEMA,
            },
        },
        required: ['findings'],
        additionalProperties: false,
    },
};

const DEFAULT_JUDGE_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 4096;

const DSL_SYSTEM_PROMPT = [
    'You are a strict DSL conformance judge for IVR scenario objectives.',
    '',
    'Given a scenario objective written in the IVR Objective DSL, return a',
    'JSON array of ValidationFinding objects identifying any violations of',
    'the DSL ruleset (see .claude/skills/references/ivr-objective-dsl.md).',
    '',
    'Return [] if the objective is fully conformant. Each finding must have:',
    '  - check: "check_19_dsl_bounds"',
    '  - severity: "error" | "warning" | "info"',
    '  - location: full slot path with language tag, e.g.',
    '    "agents.<agentId>.scenarios.<scenarioKey>.objective.<lang>[step N]" or',
    '    "agents.<agentId>.scenarios.<scenarioKey>.objective.<lang>[branch N]".',
    '    The <lang> MUST match the language of the objective you were given —',
    '    you are judging exactly one language slot per call. A finding whose',
    '    location names a different language is a contract violation.',
    '  - detail: one-sentence description of the violation',
    '  - autofixable: false',
    '',
    'Output ONLY the JSON array — no prose, no fences.',
].join('\n');

const FIDELITY_SYSTEM_PROMPT = [
    'You are a brief-fidelity judge for assembled IVR agent prompts.',
    '',
    'Given a business brief and the assembled primary-language prompt for',
    'an IVR agent, return a JSON array of ValidationFinding objects',
    'identifying brief requirements the assembled prompt fails to meet.',
    '',
    'Return [] if the prompt faithfully implements the brief. Each finding:',
    '  - check: "brief_fidelity"',
    '  - severity: "error" | "warning" | "info"',
    '  - location: short string identifying the gap',
    '  - detail: one-sentence description of the missing/incorrect content',
    '  - autofixable: false',
    '',
    'IMPORTANT — runtime-filtered cases (PT-0014):',
    '  Some cases in the brief may be filtered out of the assembled config at',
    '  intake time (e.g., a case the customer scoped out before build). When',
    '  the user prompt declares "Runtime-filtered cases: [<ids>]", treat any',
    '  case-ID in that list as LEGITIMATELY ABSENT from the assembled prompt.',
    '  Do NOT emit findings for content (cases, actions, dispositions) whose',
    '  only mention in the brief is under a runtime-filtered case. Other',
    '  brief-fidelity gaps are evaluated normally.',
    '',
    'Output ONLY the JSON array — no prose, no fences.',
].join('\n');

function getAgentSdk() {
    return require('@anthropic-ai/claude-agent-sdk');
}

function getRawSdk() {
    return require('@anthropic-ai/sdk');
}

let _rawClient = null;
function rawClient() {
    if (_rawClient) return _rawClient;
    const Anthropic = getRawSdk();
    // Constructor reads ANTHROPIC_API_KEY from env automatically; no explicit
    // apiKey injection so future auth modes (auth_token, custom headers) work
    // without a code change.
    _rawClient = new Anthropic();
    return _rawClient;
}

async function collectAssistantText(stream) {
    let out = '';
    for await (const msg of stream) {
        if (!msg) continue;
        if (typeof msg === 'string') {
            out += msg;
            continue;
        }
        if (msg.type === 'assistant' && msg.message && Array.isArray(msg.message.content)) {
            for (const block of msg.message.content) {
                if (block && block.type === 'text' && typeof block.text === 'string') {
                    out += block.text;
                }
            }
        } else if (msg.type === 'text' && typeof msg.text === 'string') {
            out += msg.text;
        }
        // NOTE: msg.type === 'result' intentionally excluded — the SDK emits the
        // assistant's final text in both the 'assistant' event and the 'result'
        // event. Collecting from both produces duplicate content (e.g. "[][]"),
        // which causes JSON.parse to throw. The 'assistant' event is sufficient.
    }
    return out;
}

function parseFindings(rawText, mode) {
    const tag = mode ? `llmJudge[${mode}]` : 'llmJudge';
    if (!rawText || typeof rawText !== 'string') return [];
    const trimmed = rawText.trim();
    // Tolerate fenced output even though the prompt asks for raw JSON.
    const stripped = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    const preview = JSON.stringify(stripped.slice(0, 80));
    let parsed;
    try {
        parsed = JSON.parse(stripped);
    } catch (err) {
        // Try to locate a JSON array inside surrounding prose as a last resort.
        const m = stripped.match(/\[[\s\S]*\]/);
        if (!m) {
            throw new Error(
                `${tag}: failed to parse model output as JSON (${err.message}). First 80 chars: ${preview}`
            );
        }
        try {
            parsed = JSON.parse(m[0]);
        } catch (err2) {
            throw new Error(
                `${tag}: failed to parse extracted JSON array (${err2.message}). First 80 chars: ${preview}`
            );
        }
    }
    try {
        return FINDINGS_SCHEMA.parse(parsed);
    } catch (zerr) {
        throw new Error(`${tag}: findings failed schema validation (${zerr.message}). First 80 chars: ${preview}`);
    }
}

async function runJudgeViaAgentSdk({ systemPrompt, userPrompt, mode }) {
    const sdk = getAgentSdk();
    const stream = sdk.query({
        prompt: userPrompt,
        options: {
            systemPrompt: { type: 'preset', preset: 'claude_code', append: systemPrompt },
            maxTurns: 5,
            allowedTools: [],
            outputFormat: { type: 'json_schema', schema: FINDINGS_JSON_SCHEMA },
        },
    });
    const text = await collectAssistantText(stream);
    return parseFindings(text, mode);
}

async function runJudgeViaRawSdk({ systemPrompt, userPrompt, mode }) {
    const client = rawClient();
    const response = await client.messages.create({
        model: process.env.VOCALLS_JUDGE_MODEL || DEFAULT_JUDGE_MODEL,
        max_tokens: DEFAULT_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        tools: [EMIT_FINDINGS_TOOL],
        tool_choice: { type: 'tool', name: EMIT_FINDINGS_TOOL_NAME },
    });
    const content = Array.isArray(response && response.content) ? response.content : [];
    const toolUseBlock = content.find(
        (b) => b && b.type === 'tool_use' && b.name === EMIT_FINDINGS_TOOL_NAME
    );
    if (toolUseBlock && toolUseBlock.input && Array.isArray(toolUseBlock.input.findings)) {
        try {
            return FINDINGS_SCHEMA.parse(toolUseBlock.input.findings);
        } catch (zerr) {
            const preview = JSON.stringify(
                JSON.stringify(toolUseBlock.input.findings).slice(0, 80)
            );
            throw new Error(
                `llmJudge[${mode}]: tool_use findings failed schema validation (${zerr.message}). First 80 chars: ${preview}`
            );
        }
    }
    // Defensive fallback: model emitted a plain text block instead of tool_use.
    // strict + tool_choice make this extremely unlikely, but parseFindings
    // (with U2's preview-on-throw) keeps diagnostics rich if it happens.
    const textBlocks = content
        .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('');
    return parseFindings(textBlocks, mode);
}

async function runJudge(params) {
    // Per-call env check (cheap; one process.env access). Picking per-call
    // rather than at module load keeps the seam test-friendly and lets a
    // long-running orchestrator switch backends if the env changes.
    if (process.env.ANTHROPIC_API_KEY) {
        return runJudgeViaRawSdk(params);
    }
    return runJudgeViaAgentSdk(params);
}

async function judgeDsl({ scenarioKey, language, objective, type }) {
    if (!objective || typeof objective !== 'string') {
        throw new Error('llmJudge.judgeDsl: objective (string) is required');
    }
    const userPrompt = [
        `Scenario: ${scenarioKey || '<unnamed>'}`,
        `Type: ${type || '<unknown>'}`,
        `Language: ${language || 'NL'}`,
        '',
        'Objective:',
        objective,
        '',
        'Return the findings JSON array.',
    ].join('\n');
    return runJudge({ systemPrompt: DSL_SYSTEM_PROMPT, userPrompt, mode: 'mode3' });
}

async function judgeBriefFidelity({ briefText, assembledPrimary, runtimeFilteredCases }) {
    if (!briefText || typeof briefText !== 'string') {
        throw new Error('llmJudge.judgeBriefFidelity: briefText (string) is required');
    }
    if (!assembledPrimary || typeof assembledPrimary !== 'string') {
        throw new Error('llmJudge.judgeBriefFidelity: assembledPrimary (string) is required');
    }
    const filteredList = Array.isArray(runtimeFilteredCases)
        ? runtimeFilteredCases.map(String)
        : [];
    const userPrompt = [
        '## Brief',
        briefText,
        '',
        '## Assembled primary-language prompt',
        assembledPrimary,
        '',
        `## Runtime-filtered cases: [${filteredList.join(', ')}]`,
        '',
        'Return the findings JSON array.',
    ].join('\n');
    return runJudge({ systemPrompt: FIDELITY_SYSTEM_PROMPT, userPrompt, mode: 'mode5' });
}

module.exports = { judgeDsl, judgeBriefFidelity, parseFindings };
