/**
 * main.js — RTDS runtime initialisation
 *
 * Vocalls flow entry. Initialises platform context (varObj, logger globals,
 * RTDS endpoints), then performs RTDS Entry Point A — fetch the routing
 * table for the call's sourceId and dispatch through the JS-handled ops
 * until a GUI-exit op is reached.
 *
 * Entry Point B (re-entry after a GUI node completes) lives in a separate
 * Script node wired after each GUI component. See the trailing GUI DISPATCH
 * comment block at the bottom of this file for the wiring playbook.
 *
 * Globals loaded by the simulator before this script runs (reverse-alpha):
 *   1. rtds_3_vocallsEnv.js     Logger, helpers, initializeCallFlowContext
 *   2. rtds_2_runtime.js        parseFlow, runStep, resumeFrom, fetchAndStart,
 *                               RTDS_REGISTRY, registerRtdsOperation
 *   3. rtds_1_globalConfig.js   DEFAULT_LOGGED_KEYS, constVarObj
 *
 * Run locally:
 *   npm run switch -- rtds-runtime
 *   npm run simulate
 *
 * File layout
 * -----------
 *   §1  Master-layer variables    — paste into Vocalls flow's Variables panel
 *   §2  Call context init         — paste into Vocalls flow's first Script node
 *   §3  ENTRY SCRIPT BODY         — the deployable Vocalls Script node body
 *   §4  Simulator promise handler — sim-only; production engine awaits the
 *                                   returned promise itself
 *   §5  Test/debug metadata       — sim-only; does not exist in production
 *   §6  GUI dispatch playbook     — trailing comment; how to wire components
 */

var __isRepoRuntime =
  typeof process !== "undefined" &&
  process.env &&
  process.env.NODE_ENV !== "production";

// Platform conveniences.
result = null;
env = "acc";
debug = true;
debugCall = true;

// ============================================================================
// §2  CALL CONTEXT INIT
//     Body of the Vocalls flow's first Script node (before the RTDS Entry
//     Script). Seeds varObj from constVarObj() and syncs essential globals.
//     In Designer, this can live in the same Script node as §3 below, or in
//     a separate node wired upstream — operator's choice.
// ============================================================================

Logger.info("[rtds] start");

initializeCallFlowContext("full");

Logger.info("[rtds] call context ready", {
  callGuid: context && context.callInfo && context.callInfo.callGuid,
  direction: context && context.callInfo && context.callInfo.direction,
  language: (context && context.language) || (varObj && varObj.language),
  ani: varObj && varObj.ani,
  dnis: varObj && varObj.dnis,
  routingId: varObj && varObj.routingId,
  environment: varObj && varObj.environment,
});

// ============================================================================
// §1  MASTER-LAYER VARIABLES
//     In production, these live in the Vocalls flow's `Variables` attribute
//     (set in Designer's Variables panel). They are declared here so the
//     simulator's VM sandbox has them in scope before any Script runs.
// ============================================================================

environment = "";
language = "";
_headers = typeof _headers === "object" && _headers !== null ? _headers : {};

// Base URL for all RTDS backend APIs.
_rtBaseUrl = "https://api.n-allo.be";

// SMS dispatch endpoint. executeSendSms POSTs to _rtBaseUrl + this path.
_rtSmsEndpoint = `/smsapi-${environment}/api/Send`;

// Email dispatch endpoint. executeSendEmail POSTs to _rtBaseUrl + this path.
_rtMailEndpoint = `/mailapi-${environment}/api/SendMail`;

// Routing-table lookup endpoint. fetchAndStart GETs:
//   _rtBaseUrl + _rtGetSourceIdEndpoint + '?sourceId=' + encodeURIComponent(sourceId)
_rtGetSourceIdEndpoint = `/routingtablesapi-${environment}/api/routing-table/source`;

// GuardTUI access-check endpoint. Used by the guardTui component.
_rtTuiCheckAccessEndpoint = `/rtdsapi-${environment}/api/Guards/AnyGuardWithPhoneNumberAndConfig`;

// GuardTUI state endpoint. Used by the guardTui component.
_rtTuiGetStateEndpoint = `/rtdsapi-${environment}/api/Guards/GetGuardByPhoneNumberAndConfig`;

// GuardTUI activate/deactivate endpoints.
_rtTuiActivateEndpoint = `/rtdsapi-${environment}/api/Guards/Activate`;
_rtTuiDeactivateEndpoint = `/rtdsapi-${environment}/api/Guards/Disable`;

// Digipolis guard config endpoints. Used by the guardRouting component.
_rtActiveGuardByConfigEndpoint = `/digipolisapi-${environment}/Guard/GetAllCurrentActiveGuardsByGuardConfig`;
_rtAnyGuardWithPhoneAndConfEndpoint = `/digipolisapi-${environment}/Guard/AnyGuardWithPhoneNumberAndConfig`;

// Schedule check endpoint. Used by the (future) Schedule handler.
_rtScheduleEndpoint = `/schedulingapi-${environment}/api/schedule/`;

// Phonebook lookup endpoint. Available for future use.
_rtPhonebookEndpoint = `/phonebookapi-${environment}`;

// Master-layer global. GUI components write their chosen next-op id here before
// the Re-Entry Script fires. resumeFrom reads: _rtNextStep || RTDS_nextStepId.
// Initialized to {} (falsy for the || fallback).
_rtNextStep = {};

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ §3  ENTRY SCRIPT BODY — paste exactly the lines below this banner into  ║
// ║     the Vocalls Designer Entry Script node. Nothing above is needed     ║
// ║     (it lives in §1/§2 already); nothing below either (§4/§5 are       ║
// ║     simulator scaffolding).                                              ║
// ║                                                                          ║
// ║     The Script returns a promise. Vocalls awaits it, reads the exit-key ║
// ║     string, and routes the call along the matching Designer output to   ║
// ║     the wired component. The Re-Entry Script (see §6 for setup) lives   ║
// ║     after every component and is wired back into the same dispatch.    ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// RTDS_sourceId is the DIALED number (DNIS) — the routing table is keyed by
// the customer's IVR phone, not by who called it. context.phone is Vocalls's
// inbound-dialed-number on the trunk leg; varObj.dnis is the parsed fallback.
context.session.variables.RTDS_sourceId =
  (typeof context.phone === "string" && context.phone) ||
  (varObj && varObj.dnis) ||
  "";

Logger.info("[main] Entry Point A start", {
  sourceId: context.session.variables.RTDS_sourceId,
});

result = fetchAndStart(context.session.variables.RTDS_sourceId);

// In production, the Script node returns this:
//     return result;
// (Vocalls awaits the promise and routes on the resolved exit-key string.)

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ END OF ENTRY SCRIPT BODY                                                 ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ============================================================================
// §4  SIMULATOR PROMISE HANDLER
//     The simulator can't `return result;` from the top-level script the way
//     a Vocalls Script node does, so we attach handlers here to surface the
//     exit-key in the trace. Production Vocalls does not need this block.
// ============================================================================

if (result && typeof result.then === "function") {
  result.then(
    function (exitKey) {
      Logger.info("[main] Entry A exit", { exitKey: exitKey });
    },
    function (err) {
      Logger.error("[main] Entry A unexpected rejection", {}, err);
    },
  );
} else {
  Logger.info("[main] Entry A exit (sync)", { exitKey: result });
}

// ============================================================================
// §5  TEST/DEBUG METADATA
//     Sim-only — guarded so production stays untouched.
// ============================================================================

if (__isRepoRuntime && context && context.session) {
  context.session.variables.scriptName = "main";
  context.session.variables.scriptExecutedAt = nowUTC();
  context.session.variables.projectName = "rtds-runtime";
  context.session.variables.rtdsExitKeyA =
    result && typeof result.then !== "function" ? result : null;
}

/*
 * ============================================================================
 * §6  GUI DISPATCH PLAYBOOK — how Vocalls routes an exit-key to a component
 * ============================================================================
 *
 * When fetchAndStart (or resumeFrom) returns an exit-key string, Vocalls does
 * NOT auto-find a component by name. The flow designer has wired the exit
 * key to a specific component on the canvas. This section is the setup
 * checklist for that wiring.
 *
 * --- Exit-key catalogue (see RTDS_REGISTRY in rtds_2_runtime.js) ----------
 *
 *   exit-key             | RTDS Type           | component / primitive
 *   ---------------------|---------------------|----------------------------
 *   'play_prompt'        | PlayPrompt          | Vocalls `say` primitive
 *   'play_audio'         | PlayAudio           | Vocalls `say` primitive (file)
 *   'menu'               | Menu                | Vocalls `dtmf` primitive
 *   'language_menu'      | LanguageMenu        | Vocalls `dtmf` primitive
 *   'workgroup_transfer' | WorkgroupTransfer   | built-in routing
 *   'external_transfer'  | ExternalTransfer    | Vocalls `redirect` primitive
 *   'guard_routing'      | GuardRouting        | (TBD — production component)
 *   'guard_tui'          | GuardTUI            | components/guardTui.js
 *   'callback'           | Callback            | built-in scheduler
 *   'disconnect'         | Disconnect          | flow terminal node
 *
 *   The runtime emits one of these strings whenever the dispatch loop hits
 *   a GUI-exit Type. The list comes from registerRtdsExit() calls in
 *   rtds_2_runtime.js — adding a new GUI type means adding a new
 *   registerRtdsExit() line AND a new component on the canvas wired to
 *   the new exit-key output.
 *
 * --- Designer wiring (step-by-step for a new flow) ------------------------
 *
 *   1. Entry Script node — paste the body in §3 above. The Script returns a
 *      promise that resolves to one of the exit-key strings in the catalogue
 *      above. Vocalls awaits it and stores the resolved value on a session
 *      variable (by convention, capture it via the Script node's output
 *      variable). Wire the Script's single output edge into a `case` node
 *      with one `expressionNode` child per exit-key the flow may reach
 *      (e.g. Expression="exitKey == 'send_sms'"), plus a `default` child for
 *      the no-match fallback. Each expression child's outgoing edge is what
 *      routes the call to its component. See
 *      .claude/skills/rtds-vocalls-component-gen/references/primitive_examples.md
 *      §7.6 for the `case` node XML shape.
 *
 *   2. Drop the matching component / primitive for each `case` expression
 *      branch. For Style A components (sendSms, guardTui, etc.), drag the .js
 *      file from rtds/components/ onto the canvas. For
 *      native primitives (say, dtmf, redirect), use Designer's palette.
 *
 *   3. Each component carries its own per-instance config as a Designer
 *      property — `__configJSON` for Style A components (see
 *      rtds/components/sendSms.js). The component's init
 *      script parses it via __setupConfig(__configJSON), which resolves
 *      ${placeholder} tokens against the global scope. The runtime does NOT
 *      mirror op.Params into session variables; each component is the source
 *      of truth for its own params. The only session vars the runtime writes
 *      on handoff are RTDS_currentOpId, RTDS_currentOpType, and a pre-
 *      populated RTDS_nextStepId (used only as a safety-net fallback in
 *      step 4).
 *
 *   4. After every component, drop a Re-Entry Script node. Its entire body
 *      is ONE LINE:
 *
 *          return resumeFrom(_rtNextStep || context.session.variables.RTDS_nextStepId);
 *
 *      The component is responsible for writing the chosen next-op id to
 *      the master-layer variable `_rtNextStep` before it exits. Style A
 *      components do this via `global[_rtNextStep] = getValue(__rtParams,
 *      'NextStep_…', -1);` — the master `Variables` block binds the
 *      component's internal `__rtNextStep` to the flow's `_rtNextStep` via
 *      the `&=` placeholder-binding operator, so the same id is visible
 *      to the Re-Entry script. If a component forgets to write it,
 *      prepareGuiHandoff has pre-populated RTDS_nextStepId with the op's
 *      default `NextStep`, so the fallback still advances the flow (just
 *      on the default branch).
 *
 *   5. The Re-Entry Script's outputs follow the same pattern as the Entry
 *      Script — one per exit-key the next op might return. Wire each to its
 *      component, and after each component to ANOTHER Re-Entry Script. The
 *      loop continues until an exit-key of `'disconnect'` is returned, which
 *      routes to the flow's terminal Disconnect node.
 *
 * --- The "everything routes through one Re-Entry Script" shortcut ---------
 *
 *   A flow with N exit-keys would naively need N Re-Entry Script nodes (one
 *   after each component). The simpler Designer pattern: ONE shared Re-Entry
 *   Script node with N outputs, and every component edge feeds into it. The
 *   Re-Entry body is still one line; only the wiring changes. This is the
 *   recommended shape — far less canvas clutter and easier to add new
 *   components.
 *
 * --- The Vocalls engine drives the loop across nodes ----------------------
 *
 *   Each Script node returns ONE exit-key and exits. The Script bodies never
 *   loop themselves (no driveFlow() in production — that's a simulator
 *   convenience in rtds-runtime-development). The engine is what stitches
 *   Entry → Component → Re-Entry → Component → Re-Entry → ... → Disconnect.
 *
 * --- Plugging in a new GUI Type -------------------------------------------
 *
 *   1. In rtds_2_runtime.js: registerRtdsExit('NewType', 'new_exit_key');
 *   2. In Designer: add 'new_exit_key' as an output on every Script that
 *      could reach it, and wire each to a new NewType component.
 *   3. Build the component if it doesn't exist yet (see the
 *      rtds-vocalls-component-gen skill in .claude/skills/).
 *
 * --- Plugging in a new JS-handled Type ------------------------------------
 *
 *   1. In rtds_2_runtime.js: add an executeXxx function above the
 *      registration block (returns { nextStepId }).
 *   2. Register it:
 *          registerRtdsOperation('NewType', executeNewType);
 *      (An unregistered Type is skipped to its NextStep with a warning until
 *      its handler is added.)
 *   3. No Designer changes — JS-handled types never reach the canvas.
 *
 * ============================================================================
 */
