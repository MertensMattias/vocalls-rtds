/**
 * flowAdapter.js — authoring-format flow → runtime/API shape
 *
 * The `callflow_json_config_vocalls/*.json` files are Designer/authoring-tool
 * exports in PascalCase (`SourceId`, `Operations`, `Type`, `Params`,
 * `IsFirstOperation`). The production RTDS runtime (`parseFlow`,
 * `buildOpIndex`, `getFirstOperation` in
 * `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js`) reads the
 * **production API shape** (camelCase: `sourceId`, `operations`, `type`,
 * `params`, `isFirstOperation`) — confirmed against the production Swagger
 * (`rtds/api_swagger/routingtable_rtds_swagger.json`, `RoutingTableFullViewModel`).
 *
 * This module is the single, tested, one-way bridge from authoring → runtime.
 * It converts only the **structural/envelope** keys the runtime reads by exact
 * name. It does NOT recurse into `params`: the contents of each `params` object
 * (`RoutingId`, `IVREvent`, `NextStep_Success`, `ConfigId`, …) stay PascalCase,
 * exactly as production and the dictionary seed emit them — the runtime reads
 * those case-insensitively via `getParam`/`getValue`/`hasKey`, so they are
 * faithful to what the real flow delivers.
 *
 * Malformed input fails loud (throws) rather than silently producing an empty
 * flow that would disconnect with no explanation. The adapter logs that it ran
 * so the authoring↔runtime format gap stays visible.
 *
 * Usage:
 *   var flowAdapter = require('../core/flowAdapter');
 *   var runtimeFlow = flowAdapter.adaptFlow(rawPascalObj);   // throws on bad input
 *
 * @module flowAdapter
 */

/**
 * Convert a single authoring-format operation into the runtime shape.
 *
 * Structural keys (`Id/Type/Name/IsFirstOperation/Params`) map to their
 * camelCase runtime names. `params` contents are assigned verbatim — never
 * recursed into — so PascalCase param keys and native JSON types survive.
 *
 * @param {Object} rawOp - Authoring-format operation (PascalCase keys).
 * @param {number} index - Position in the Operations array (for error messages).
 * @returns {{ id: string, type: *, name: *, isFirstOperation: boolean, params: Object }}
 * @throws {Error} when the op has no `Id`.
 */
function adaptOp(rawOp, index) {
    if (!rawOp || typeof rawOp !== 'object') {
        throw new Error(
            'flowAdapter.adaptOp: operation at index ' + index + ' is missing or not an object'
        );
    }
    if (rawOp.Id === undefined || rawOp.Id === null || rawOp.Id === '') {
        throw new Error(
            'flowAdapter.adaptOp: operation at index ' + index + ' has no Id'
        );
    }

    return {
        // Structural keys → camelCase runtime names. id is always a string —
        // buildOpIndex keys the opIndex Map by String(op.id) and resolveNextStep
        // returns String(next), so a numeric authoring Id must normalise here.
        id: String(rawOp.Id),
        type: rawOp.Type,
        name: rawOp.Name,
        isFirstOperation: rawOp.IsFirstOperation === true,
        // params CONTENTS are untouched — assigned verbatim. PascalCase keys
        // (RoutingId, IVREvent, NextStep_*, ConfigId, …) and native types stay
        // exactly as authored; the runtime reads them case-insensitively.
        params: rawOp.Params || {},
    };
}

/**
 * Convert an authoring-format routing-table object into the runtime/API shape.
 *
 * @param {Object} raw - Authoring-format flow (PascalCase envelope keys).
 * @param {Object} [options]
 * @param {Function} [options.logger] - Called once with a one-line notice that
 *        the adapter ran. Defaults to `console.log`. Pass a no-op to silence.
 * @returns {{ sourceId: *, name: *, project: *, promptLibrary: *, supportedLanguages: *, operations: Array<Object> }}
 * @throws {Error} when `raw` is not an object, or `Operations` is missing /
 *         not an array / empty, or any operation has no `Id`.
 */
function adaptFlow(raw, options) {
    options = options || {};
    var logger = typeof options.logger === 'function' ? options.logger : console.log;

    if (!raw || typeof raw !== 'object') {
        throw new Error('flowAdapter.adaptFlow: input flow is null or not an object');
    }
    if (!Array.isArray(raw.Operations)) {
        throw new Error(
            'flowAdapter.adaptFlow: Operations is missing or not an array — refusing to produce an empty flow'
        );
    }
    if (raw.Operations.length === 0) {
        throw new Error(
            'flowAdapter.adaptFlow: Operations array is empty — refusing to produce an empty flow'
        );
    }

    var operations = [];
    for (var i = 0; i < raw.Operations.length; i++) {
        operations.push(adaptOp(raw.Operations[i], i));
    }

    var adapted = {
        sourceId: raw.SourceId,
        name: raw.Name,
        project: raw.Project,
        promptLibrary: raw.PromptLibrary,
        supportedLanguages: raw.SupportedLanguages,
        operations: operations,
    };

    logger(
        '[flowAdapter] adapted authoring flow → runtime shape | sourceId=' +
            adapted.sourceId +
            ' ops=' +
            operations.length
    );

    return adapted;
}

module.exports = {
    adaptFlow: adaptFlow,
    adaptOp: adaptOp,
};
