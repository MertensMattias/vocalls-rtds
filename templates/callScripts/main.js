/**
 * main.js — Project call script (REPLACE_WITH_PROJECT_NAME)
 *
 * Edit this file for your IVR flow. Run locally:
 *   npm run simulate -- --project REPLACE_WITH_PROJECT_NAME
 */

var __isRepoRuntime =
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV !== 'production';

Logger.info('=================================================');
Logger.info('Call script: main');
Logger.info('=================================================');

if (typeof context !== 'undefined' && context && context.callInfo) {
    Logger.info('Call GUID: ' + context.callInfo.callGuid);
    Logger.info('Direction: ' + context.callInfo.direction);
    Logger.info('Language: ' + (context.language || varObj.language));
}

if (typeof varObj !== 'undefined' && varObj) {
    Logger.info('ANI: ' + varObj.ani);
    Logger.info('DNIS: ' + varObj.dnis);
}

if (__isRepoRuntime && typeof context !== 'undefined' && context && context.session) {
    context.session.variables.scriptName = 'main';
    context.session.variables.scriptExecutedAt = nowUTC();
    context.session.variables.projectName = 'REPLACE_WITH_PROJECT_NAME';
}

logInfo('main.js loaded successfully');
Logger.info('=================================================');
