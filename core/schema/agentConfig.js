'use strict';

const { z } = require('zod');
const { LangCode, NonEmptyString } = require('./shared');
const { SlotMapSchema } = require('./slotMap');

const LLMConfigSchema = z.object({
    maxTokens: z.number().int().positive(),
    shortWaitDelay: z.number().int().nonnegative(),
    longWaitDelay: z.number().int().nonnegative(),
    conversationType: z.literal('voicebot'),
    timeZone: NonEmptyString,
    callDirection: z.enum(['inbound', 'outbound', 'callback']),
});

const PlatformMessagesSchema = z.object({
    repeat: z.array(NonEmptyString),
    noInput: z.array(NonEmptyString),
    waitShort: z.array(NonEmptyString),
    wait: z.array(NonEmptyString),
    waitConfirmation: z.array(NonEmptyString),
    confirmation: z.array(NonEmptyString),
    fill: z.array(NonEmptyString),
    bargeIn: z.array(NonEmptyString),
});

const LabelsSchema = z.record(NonEmptyString, NonEmptyString);

const AgentConfigSchema = SlotMapSchema.and(
    z.object({
        _meta: z.object({
            version: z.literal('1.2'),
            projectName: NonEmptyString,
            primaryLanguage: LangCode,
            languages: z.array(LangCode).min(1),
        }),
        llm: LLMConfigSchema,
        labels: z.object({
            NL: LabelsSchema,
            FR: LabelsSchema,
            DE: LabelsSchema,
            EN: LabelsSchema,
        }),
        messages: z.object({
            NL: PlatformMessagesSchema,
            FR: PlatformMessagesSchema,
            DE: PlatformMessagesSchema,
            EN: PlatformMessagesSchema,
        }),
    })
);

module.exports = {
    AgentConfigSchema,
    LLMConfigSchema,
    PlatformMessagesSchema,
    LabelsSchema,
};
