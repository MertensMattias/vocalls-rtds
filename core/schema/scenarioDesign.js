'use strict';

const { z } = require('zod');
const {
    LangCode,
    NonEmptyString,
    CaseNumber,
    ScenarioKey,
    ActionName,
    KnowledgeKey,
} = require('./shared');

const ObjectiveTypeEnum = z.enum([
    'DETECT_INTENT',
    'ROUTE',
    'COLLECT',
    'CONFIRM',
    'OFFER',
    'EXECUTE',
    'INFORM',
    'AUTHENTICATE',
]);

const ObjectiveDSL = z.string().min(50);

const ScenarioSchema = z.object({
    type: ObjectiveTypeEnum,
    name: ScenarioKey,
    appliesTo: z.array(CaseNumber).min(1),
    objective: ObjectiveDSL,
    facts: z.array(NonEmptyString).default([]),
    actionsUsed: z.array(ActionName),
});

const ScenarioDesignSchema = z.object({
    primaryLanguage: LangCode,
    scenarios: z.array(ScenarioSchema).min(1),
    caseToScenario: z.record(CaseNumber, ScenarioKey),
    defaultScenario: ScenarioKey,
    knowledgeWiring: z.record(CaseNumber, z.array(KnowledgeKey).default([])),
    rationale: NonEmptyString,
});

module.exports = {
    ScenarioDesignSchema,
    ScenarioSchema,
    ObjectiveTypeEnum,
};
