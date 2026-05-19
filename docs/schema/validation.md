# validation schema

> AUTO-GENERATED from `core/schema/validation.js` via `npm run schema:docs`. Do not edit.

## JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "check": {
      "type": "string",
      "enum": [
        "schema_completeness",
        "language_completeness",
        "action_messages_shape",
        "cdb_logs_structure",
        "check_13_disposition_coverage",
        "check_18_prompt_assembly",
        "check_19_dsl_bounds",
        "check_kq_knowledge_grounding",
        "check_speech_placement",
        "pqr_register",
        "pqr_tts_register",
        "brief_fidelity",
        "canonical_rules_unknown_hook"
      ]
    },
    "severity": {
      "type": "string",
      "enum": [
        "error",
        "warning",
        "info"
      ]
    },
    "owner": {
      "type": "string",
      "enum": [
        "intake",
        "scenarioDesign",
        "configBuild"
      ]
    },
    "location": {
      "type": "string",
      "minLength": 1
    },
    "detail": {
      "type": "string",
      "minLength": 1
    },
    "suggestion": {
      "type": "string"
    },
    "autofixable": {
      "type": "boolean"
    }
  },
  "required": [
    "check",
    "severity",
    "owner",
    "location",
    "detail",
    "autofixable"
  ],
  "additionalProperties": false
}
```
