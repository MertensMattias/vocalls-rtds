'use strict';

const fs = require('fs');
const vm = require('vm');

/**
 * Load an AGENT_<ID>.js file into a plain object. The file uses bare
 * global assignment (AGENT_PRIMARY = {...}), not module.exports, so it
 * must be evaluated in a sandbox and the resulting global retrieved.
 *
 * @param {string} filePath absolute path to AGENT_<ID>.js
 * @returns {object}
 */
const loadAgentFile = (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    const match = source.match(/^\s*(AGENT_[A-Z0-9_]+)\s*=/m);
    if (!match) {
        throw new Error(`No AGENT_<ID> global assignment found in ${filePath}`);
    }
    const agentName = match[1];
    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox, { filename: filePath });
    if (!sandbox[agentName]) {
        throw new Error(`${agentName} not defined after loading ${filePath}`);
    }
    return sandbox[agentName];
};

module.exports = { loadAgentFile };
