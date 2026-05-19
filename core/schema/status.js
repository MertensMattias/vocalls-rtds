'use strict';

const { z } = require('zod');

const STATUS_TOKENS = [
    'STAGE_COMPLETE',
    'STAGE_FAILED',
    'STAGE_PAUSED',
    'STAGE_ESCALATED',
    'STAGE_NOOP',
];

const StatusToken = z.enum(STATUS_TOKENS);

module.exports = { StatusToken, STATUS_TOKENS };
