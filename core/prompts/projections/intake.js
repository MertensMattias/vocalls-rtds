'use strict';

/**
 * core/prompts/projections/intake.js
 *
 * Tier B user-turn payload builder for the intake stage (DESIGN §6, plan
 * U7). Pure function: `(state, deps) → projectedBlock`. Two calls with
 * the same inputs return byte-equal output — no Date.now(), no
 * Math.random(), no file I/O.
 *
 * The brief text itself is read once upstream by the runner (it is the
 * subject of the intake stage's content-hash invariant per DESIGN §5)
 * and threaded through `deps.briefText`. The projection only parses;
 * it does not touch disk.
 *
 * Inputs:
 *   state      — `PipelineState` (only `.brief.path` / `.brief.sha256` read)
 *   deps       — `{ briefText: string }`
 *
 * Output:
 *   {
 *     systemActions: string[],          // from core/schema/slotMap.js#SYSTEM_ACTIONS
 *     systemActionSynonyms: object,     // from core/schema/shared.js#SYSTEM_ACTION_SYNONYMS
 *     parsedMarkers: {                  // from core/briefParser.js
 *       frontmatter, speechPlacements, actionMessages,
 *       customActionMarkers, parserWarnings,
 *     },
 *     parserWarnings: string[],         // sliced copy of parsedMarkers.parserWarnings
 *     briefPath: string,
 *     briefSha256: string,
 *   }
 *
 * Public API:
 *   buildIntakeProjection(state, deps) → projectedBlock
 */

const { parseBrief } = require('../../briefParser');
const { SYSTEM_ACTIONS } = require('../../schema/slotMap');
const { SYSTEM_ACTION_SYNONYMS } = require('../../schema/shared');

function buildIntakeProjection(state, deps) {
    if (!state || typeof state !== 'object') {
        throw new Error(
            'prompts.projections.intake: state must be an object'
        );
    }
    if (!state.brief || typeof state.brief.path !== 'string') {
        throw new Error(
            'prompts.projections.intake: state.brief.path is required'
        );
    }
    if (typeof state.brief.sha256 !== 'string') {
        throw new Error(
            'prompts.projections.intake: state.brief.sha256 is required'
        );
    }
    if (!deps || typeof deps.briefText !== 'string') {
        throw new Error(
            'prompts.projections.intake: deps.briefText is required'
        );
    }

    const parsedMarkers = parseBrief(deps.briefText);

    return {
        systemActions: Array.from(SYSTEM_ACTIONS).sort(),
        systemActionSynonyms: { ...SYSTEM_ACTION_SYNONYMS },
        parsedMarkers,
        parserWarnings: parsedMarkers.parserWarnings.slice(),
        briefPath: state.brief.path,
        briefSha256: state.brief.sha256,
    };
}

module.exports = { buildIntakeProjection };
