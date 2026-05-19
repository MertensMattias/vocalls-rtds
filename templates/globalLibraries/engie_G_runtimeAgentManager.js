// ============================================================================
// Agent Runtime Manager (ES5.1)
// Manages multi-agent registration, context building, and active agent state.
//
// Load order (reverse-alpha): runtimeMapper -> runtimeAgentManager -> agentEngine
// Safe: buildAgentContextFromConfig is called inside switchAgent() function body,
// never at top-level evaluation time.
//
// Globals exposed:
//   safeGet(obj, path, def)
//   registerAgent(name, config)
//   switchAgent(name, caseNumber, language, runtimeInput)
//   getCurrentAgentConfig()
//   getCurrentAgentContext()
//   getActiveAgentName()
// ============================================================================

var AgentRuntimeManager = {
    registry: {}, // name -> per-agent config object
    contexts: {}, // name -> agentContext (built on first switchAgent, restored on repeat)
    activeName: null, // currently active agent name
    variables: {}, // shared variable pool -- all agents reference this same object
};

// -- safeGet -- canonical definition (agentEngine.js loads after this, uses this) --

function safeGet(obj, path, def) {
    var parts, cur, i;
    if (!obj || typeof path !== 'string' || !path) {
        return def;
    }
    parts = path.split('.');
    cur = obj;
    for (i = 0; i < parts.length; i++) {
        if (cur == null || typeof cur !== 'object' || !(parts[i] in cur)) {
            return def;
        }
        cur = cur[parts[i]];
    }
    return cur === undefined ? def : cur;
}

// -- Registration -------------------------------------------------------------

function registerAgent(name, config) {
    if (!name || !config) {
        return false;
    }
    AgentRuntimeManager.registry[name] = config;
    return true;
}

// -- Core: switchAgent --------------------------------------------------------

function switchAgent(name, caseNumber, language, runtimeInput) {
    var config, resolvedLanguage, rules, extraction, key, input, ctx, exportMap;

    config = AgentRuntimeManager.registry[name];
    if (!config) {
        return null;
    }

    // Path B -- already initialized: restore context, skip extraction + rebuild
    if (AgentRuntimeManager.contexts[name]) {
        AgentRuntimeManager.activeName = name;
        agentContext = AgentRuntimeManager.contexts[name];
        return agentContext;
    }

    // Path A -- first activation
    resolvedLanguage = language || safeGet(config, '_meta.primaryLanguage', 'NL') || 'NL';

    // Run CANONICAL_RULES extraction -- merge into shared variables pool (overwrite on collision)
    rules = safeGet(config, 'CANONICAL_RULES', []);
    if (
        rules.length &&
        typeof RuntimeMapper !== 'undefined' &&
        typeof RuntimeMapper.extract === 'function'
    ) {
        extraction = RuntimeMapper.extract(runtimeInput, rules, {
            onCollision: 'overwrite',
            skipNull: true,
        });
        if (extraction && extraction.values) {
            for (key in extraction.values) {
                if (extraction.values.hasOwnProperty(key) && extraction.values[key] !== undefined) {
                    AgentRuntimeManager.variables[key] = extraction.values[key];
                }
            }
            if (extraction.values.caseNumber !== undefined) {
                caseNumber = extraction.values.caseNumber;
            }
        }
    }

    // Build input with shared variables pool
    input = {
        caseNumber: caseNumber,
        variables: AgentRuntimeManager.variables,
    };

    // Build agent context -- agentEngine.js loads after this file, safe inside function body
    ctx = buildAgentContextFromConfig(input, config, resolvedLanguage);

    // Add identity field -- not available inside agentEngine
    ctx.agentName = name;

    // Ensure variables points to shared pool (buildAgentContextFromConfig may set its own object)
    ctx.variables = AgentRuntimeManager.variables;

    // Store context -- restored on repeat switchAgent calls, variables remain intact
    AgentRuntimeManager.contexts[name] = ctx;

    // Export EXPORT_MAP globals (first init only)
    exportMap = safeGet(config, 'EXPORT_MAP', null);
    if (
        exportMap &&
        typeof RuntimeMapper !== 'undefined' &&
        typeof RuntimeMapper.exportToGlobals === 'function'
    ) {
        RuntimeMapper.exportToGlobals(ctx, exportMap, { overwrite: true });
    }

    // Activate
    AgentRuntimeManager.activeName = name;
    agentContext = ctx;

    return ctx;
}

// -- Accessors ----------------------------------------------------------------

function getCurrentAgentConfig() {
    return AgentRuntimeManager.activeName
        ? AgentRuntimeManager.registry[AgentRuntimeManager.activeName] || null
        : null;
}

function getCurrentAgentContext() {
    return AgentRuntimeManager.activeName
        ? AgentRuntimeManager.contexts[AgentRuntimeManager.activeName] || null
        : null;
}

function getActiveAgentName() {
    return AgentRuntimeManager.activeName;
}
