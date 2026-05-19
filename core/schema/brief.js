'use strict';

const { z } = require('zod');
const { LangCode, NonEmptyString } = require('./shared');

const CallDirection = z.enum(['inbound', 'outbound', 'callback']);

const BriefMetaSchema = z
    .object({
        project: NonEmptyString,
        primaryLanguage: LangCode,
        languages: z.array(LangCode).min(1),
        callDirection: CallDirection,
    })
    .superRefine((data, ctx) => {
        if (!data.languages.includes(data.primaryLanguage)) {
            ctx.addIssue({
                code: 'custom',
                path: ['primaryLanguage'],
                message: 'primaryLanguage must be present in languages',
            });
        }
    });

module.exports = { BriefMetaSchema, CallDirection };
