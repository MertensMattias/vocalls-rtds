Logger.info("=================================================");
Logger.info("Initializing runtime");
Logger.info("=================================================");

CONFIG = {};

CONFIG._meta = {
    version: "1.2",
    projectName: "REPLACE_WITH_PROJECT_NAME",
    primaryLanguage: "NL",
    languages: ["NL", "FR", "DE", "EN"],
};

// Repo or vocalls runtime?

var __isRepoRuntime =
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV !== "production" &&
    safeGet(CONFIG, "_meta.environment", "") !== "production";

if (__isRepoRuntime && typeof context !== "undefined" && context && context.session) {
    context.session.variables.scriptName = "main";
    context.session.variables.scriptExecutedAt = nowUTC();
    context.session.variables.projectName = safeGet(
        CONFIG,
        "_meta.projectName",
        "REPLACE_WITH_PROJECT_NAME"
    );
}

language = varObj.language;
Logger.debug("Using language: " + language);
Logger.debug("varObj: " + JSON.stringify(varObj));

varObj.cdb = varObj.cdb || {};
varObj.cdb.cdbLog = "cdbLogEX";

if (isValidObject(varObj._tempData[segmentState.currentSegment].apiResult)) {
    _apiResult = varObj._tempData[segmentState.currentSegment].apiResult;
    Logger.debug("_apiResult: " + JSON.stringify(_apiResult));
} else {
    Logger.debug("_apiResult: FAILURE");
}

Logger.info("Language resolved:" + language + "| Segment:" + segmentState.currentSegment);

setRuntimeContext({
    varObj: varObj,
    segmentState: segmentState,
});

Logger.info("=================================================");
Logger.info("Loading AGENT_PRIMARY config..");
Logger.info("=================================================");

// CONFIG Node is used

Logger.info("=================================================");
Logger.info("Initializing agent..");
Logger.info("=================================================");

function __gptDialog_getBasePrompt(objectiveForPrompt) {
    var activeCfg = getCurrentAgentConfig();
    return buildBasePrompt(
        activeCfg.persona[language],
        activeCfg.labels[language],
        buildKnowledge(agentContext["case"], language, activeCfg),
        activeCfg.companyInfo[language],
        objectiveForPrompt,
        language,
        {
            callDirection: __callDirection,
            timeZone: safeGet(activeCfg, "llm.timeZone", "Europe/Brussels"),
        }
    );
}

// __callDirection must be set
__callDirection = safeGet(AGENT_PRIMARY, "llm.callDirection", "inbound");
if (
    __callDirection !== "inbound" &&
    __callDirection !== "outbound" &&
    __callDirection !== "callback"
) {
    __callDirection = "inbound";
}

// Activate primary agent — initAgent() handles canonicals, context build
// Repo/simulator: use only CLI --case injection (_apiResult.caseNumber / options.caseNumber).
// Omit --case for canonical-based resolution (production-like).
var __caseOverride = null;
if (__isRepoRuntime) {
    __caseOverride = safeGet(_apiResult, "caseNumber", null);
    if (__caseOverride === null || __caseOverride === undefined) {
        __caseOverride = safeGet(_apiResult, "options.caseNumber", null);
    }
}
initAgent(AGENT_PRIMARY, language, __caseOverride);

Logger.info("=================================================");
Logger.info("Bot Persona (official component is initialized..");
Logger.info("=================================================");

// Bot Persona component is executed

Logger.info("=================================================");
Logger.info("Bot Persona (official component is overruled by our agent..");
Logger.info("=================================================");

__gptDialog_getBasePrompt = function (objectiveForPrompt) {
    var activeCfg = getCurrentAgentConfig();
    return buildBasePrompt(
        activeCfg.persona[language],
        activeCfg.labels[language],
        buildKnowledge(agentContext["case"], language, activeCfg),
        activeCfg.companyInfo[language],
        objectiveForPrompt,
        language,
        {
            callDirection: __callDirection,
            timeZone: safeGet(activeCfg, "llm.timeZone", "Europe/Brussels"),
        }
    );
};

__persona = agentPersona;
__opening = agentContext.opening;
__objective = agentContext.objective;
var _activeCfg = getCurrentAgentConfig();
__timeZone = safeGet(_activeCfg, "llm.timeZone", "Europe/Brussels");

// Build full system prompt for simulator / runtime display
base_prompt = __gptDialog_getBasePrompt(__objective);

logInfo("Opening:", __opening ? __opening : "(empty)");
logInfo("Objective:", __objective ? __objective : "(empty)");
var msg = (_activeCfg.messages && _activeCfg.messages[language]) || {};

__gpt_repeat = msg.repeat || [];
__gpt_noInput = msg.noInput || [];
__gpt_waitShort = msg.waitShort || [];
__gpt_wait = msg.wait || [];
__gpt_waitConfirmation = msg.waitConfirmation || [];
__gpt_confirmation = msg.confirmation || [];
__gpt_fill = msg.fill || [];
// Dialog-control globals come from agentContext (which reads caseToOpening).
__gpt_bargeIn = (agentContext && agentContext.bargeIn) || null;
__gpt_dialogControlOnEntry = (agentContext && agentContext.dialogControl) || null;

__gptMaxTokens = safeGet(_activeCfg, "llm.maxTokens", 0);
__gptShortWaitDelay = safeGet(_activeCfg, "llm.shortWaitDelay", 0);
__gptLongWaitDelay = safeGet(_activeCfg, "llm.longWaitDelay", 0);
__conversationType = safeGet(_activeCfg, "llm.conversationType", "voicebot");

logInfo(
    "LLM: maxTokens=" +
        __gptMaxTokens +
        " shortWait=" +
        __gptShortWaitDelay +
        " longWait=" +
        __gptLongWaitDelay +
        " | Actions: " +
        Object.keys(__actionDefinitions).length +
        " | Direction: " +
        __callDirection
);

if (!base_prompt) {
    logWarn("Base prompt build returned empty — check persona/labels/knowledge config");
}
logInfo("Base prompt built:", !!base_prompt);
if (typeof __systemPromptForDisplay !== "undefined") {
    __systemPromptForDisplay = base_prompt;
}
