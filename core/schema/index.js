'use strict';

// core/schema/index.js — single source of truth for every artifact shape.
// Each module exports its schema + enums; this file re-exports them.
// Dependency direction: this file imports each schema module; nothing inside
// core/schema/ imports from this file.

const shared = require('./shared');
const status = require('./status');
const brief = require('./brief');
const intake = require('./intake');
const scenarioDesign = require('./scenarioDesign');
const validation = require('./validation');
const slotMap = require('./slotMap');
const agentConfig = require('./agentConfig');
const pipelineState = require('./pipelineState');

module.exports = {
    ...shared,
    ...status,
    ...brief,
    ...intake,
    ...scenarioDesign,
    ...validation,
    ...slotMap,
    ...agentConfig,
    ...pipelineState,
};
