// ============================================================================
// RTDS / Vocalls global constants and the varObj schema.
//
// Loads BEFORE rtds_globalCodeAndHelpers.js (reverse-alphabetical order),
// but constVarObj() is called at runtime by initializeCallFlowContext, by
// which point getOrDefault and `context` are both available in the shared
// sandbox.
// ============================================================================

// Attribute names auto-included in default log payloads.
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
// varObj schema
// ============================================================================

function constVarObj() {
  return {
    // ----------------------------------------------------------------------
    // CORE CONTEXT
    // ----------------------------------------------------------------------
    environment: getOrDefault("environment", "acc", true),
    routingId: "TEST_TEST_PROJECT",
    callIdKey: getOrDefault("callIdKey", context.callInfo.callGuid, true),
    interactionStartTime: getOrDefault(
      "interactionStartTime",
      new Date().toISOString(),
      true,
    ),
    customerName: "TEST",
    customerProject: "TEST_PROJECT",

    language: context.language.substring(0, 2).toUpperCase(),

    // ----------------------------------------------------------------------
    // CALL DATA
    // ----------------------------------------------------------------------
    ani: getOrDefault("ani", null, true), // caller number
    dnis: getOrDefault("dnis", null, true), // dialed number
    debugCall: false, // derived from devNumbers or debug flag

    // ----------------------------------------------------------------------
    // DEBUG CONFIG
    // ----------------------------------------------------------------------
    debugConfig: {
      devNumbers: [], // array of phone numbers triggering debugCall
    },

    // ----------------------------------------------------------------------
    // LOGGING FLAGS
    // ----------------------------------------------------------------------
    logVarActive: true,

    // ----------------------------------------------------------------------
    // FLOW CONTROL
    // ----------------------------------------------------------------------
    redirect: false, // used for session restore / redirect logic

    // ----------------------------------------------------------------------
    // SESSION METADATA
    // ----------------------------------------------------------------------
    _storedTimestamp: 0, // used for session restore comparison
  };
}
Z