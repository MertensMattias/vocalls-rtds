/* global context, logInfo */

/**
 * globalCode.js -- Vocalls Platform Init Hook
 *
 * Runs once at session start before any call script.
 * Set up session defaults here.
 * ES5.1 compliant -- no let/const, no arrows.
 */

// Vocalls platform utility -- returns true when value is a non-null object
function isValidObject(val) {
    return val !== null && val !== undefined && typeof val === 'object';
}

// Initialize session defaults
if (context && context.session) {
    if (!context.session.variables) {
        context.session.variables = {};
    }
}

logInfo('globalCode: session initialized');
