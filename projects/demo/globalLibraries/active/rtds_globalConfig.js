var DEFAULT_LOGGED_KEYS = [ 
    "customerName", 
    "customerProject", 
    "routingId", 
    "language", 
    "ani", 
    "dnis", 
    "interactionStartTime" 
];
 
 
function constVarObj() { 
    return { 
        // ============================================================================ 
        // CORE CONTEXT 
        // ============================================================================ 
 
        environment: "", 
        routingId: "", 
        callIdKey: "", 
        interactionStartTime: "", 
        customerName: "", 
        customerProject: "", 
         
        language: context.language.substring(0, 2).toUpperCase(), 
 
        // ============================================================================ 
        // CALL DATA 
        // ============================================================================ 
        ani: "",                   // caller number 
        dnis: "",                  // dialed number 
        debugCall: false,          // derived from devNumbers or debug flag 
 
        // ============================================================================ 
        // DEBUG CONFIG 
        // ============================================================================ 
        debugConfig: { 
            devNumbers: []         // array of phone numbers triggering debugCall 
        }, 
 
        // ============================================================================ 
        // LOGGING FLAGS 
        // ============================================================================ 
        logVarActive: true, 
 
        // ============================================================================ 
        // FLOW CONTROL 
        // ============================================================================ 
        redirect: false,           // used for session restore / redirect logic 
 
        // ============================================================================ 
        // SESSION METADATA 
        // ============================================================================ 
        _storedTimestamp: 0        // used for session restore comparison 
    }; 
}