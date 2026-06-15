environment = "";
language = "";

varObj = {};
callIdKey = "";

result = null;
env = "acc";
debug = true;
debugCall = true;

_rtConfig = {};
_rtNextStep = "_rtNextStep";

_headers = "";

_endFlowSemaphore = 0;
RTDS_finalizing = false;

/**
 * rtds_1_globalConfig.js -- Project varObj schema + log keys
 *
 * The per-project shape file. Operators edit this when adding new
 * varObj fields or customising the default-log-keys list. Everything
 * machinery-ish lives in the other two libraries in this directory.
 *
 * Loaded LAST by reverse-alphabetical sort (filename `rtds_1_...` sorts
 * lowest in the `rtds_` family, so reverse-alpha picks it last). By the
 * time this file parses, getOrDefault is already defined; constVarObj is
 * called later at runtime by initializeCallFlowContext, when `context`
 * is also reachable.
 *
 * Public surface:
 *   - DEFAULT_LOGGED_KEYS -- attribute names included in default log payloads.
 *   - constVarObj()       -- returns a fresh varObj for new calls.
 *
 * ES5.1 -- no let/const, no arrow functions.
 */

// ============================================================================
// Attribute names auto-included in default log payloads.
// ============================================================================

DEFAULT_LOGGED_KEYS = [
  "customerName",
  "customerProject",
  "routingId",
  "language",
  "ani",
  "dnis",
  "interactionStartTime",
];

// ============================================================================
// varObj schema -- the call-scoped state object.
// initializeCallFlowContext calls this once per fresh call leg and copies the
// result into the global `varObj`. Operators add fields here; downstream code
// reads them via getValue / direct property access.
// ============================================================================

/**
 * @returns {Object} Fresh varObj for the current call.
 */
function constVarObj() {
  return {
    // --------------------------------------------------------------------
    // CORE CONTEXT
    // --------------------------------------------------------------------
    environment: getOrDefault("environment", "acc", true),
    routingId: "RTDS_RUNTIME",
    callIdKey: getOrDefault("callIdKey", context.callInfo.callGuid, true),
    interactionStartTime: getOrDefault(
      "interactionStartTime",
      new Date().toISOString(),
      true,
    ),
    customerName: "RTDS",
    customerProject: "RTDS_RUNTIME",
    language: context.language.substring(0, 2).toUpperCase(),

    // --------------------------------------------------------------------
    // CALL DATA
    // --------------------------------------------------------------------
    ani: getOrDefault("ani", null, true),
    dnis: getOrDefault("dnis", null, true),
    debugCall: false,

    // --------------------------------------------------------------------
    // DEBUG CONFIG
    // --------------------------------------------------------------------
    debugConfig: {
      devNumbers: [],
    },

    // --------------------------------------------------------------------
    // LOGGING FLAGS
    // --------------------------------------------------------------------
    logVarActive: true,

    // --------------------------------------------------------------------
    // FLOW CONTROL
    // --------------------------------------------------------------------
    redirect: false,

    // --------------------------------------------------------------------
    // SESSION METADATA
    // --------------------------------------------------------------------
    _storedTimestamp: 0,
  };
}
