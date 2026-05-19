# intake schema

> AUTO-GENERATED from `core/schema/intake.js` via `npm run schema:docs`. Do not edit.

## JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "projectName": {
      "type": "string",
      "minLength": 1
    },
    "primaryLanguage": {
      "type": "string",
      "enum": [
        "NL",
        "FR",
        "DE",
        "EN"
      ]
    },
    "languages": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "NL",
          "FR",
          "DE",
          "EN"
        ]
      }
    },
    "callDirection": {
      "type": "string",
      "enum": [
        "inbound",
        "outbound",
        "callback"
      ]
    },
    "cases": {
      "type": "object",
      "propertyNames": {
        "type": "string",
        "pattern": "^\\d+(\\.\\d+)*$"
      },
      "additionalProperties": {
        "type": "object",
        "properties": {
          "label": {
            "type": "string",
            "minLength": 1
          },
          "intent": {
            "type": "string",
            "minLength": 1
          },
          "requiresAuth": {
            "type": "boolean"
          },
          "knowledgeNeeds": {
            "default": [],
            "type": "array",
            "items": {
              "type": "string",
              "pattern": "^[a-z][a-z0-9_]*$"
            }
          },
          "actionsRequired": {
            "default": [],
            "type": "array",
            "items": {
              "type": "string",
              "pattern": "^[a-z][a-z0-9_]*$"
            }
          },
          "notes": {
            "type": "string"
          },
          "opening": {
            "default": "",
            "type": "string"
          },
          "objective": {
            "default": "",
            "type": "string"
          },
          "cdbLogMap": {
            "default": {},
            "type": "object",
            "propertyNames": {
              "type": "string",
              "minLength": 1
            },
            "additionalProperties": {
              "type": "object",
              "propertyNames": {
                "type": "string",
                "minLength": 1
              },
              "additionalProperties": {
                "type": "string",
                "minLength": 1
              }
            }
          }
        },
        "required": [
          "label",
          "intent",
          "requiresAuth",
          "knowledgeNeeds",
          "actionsRequired",
          "opening",
          "objective",
          "cdbLogMap"
        ],
        "additionalProperties": false
      }
    },
    "runtimeFilteredCases": {
      "default": [],
      "type": "array",
      "items": {
        "type": "string",
        "pattern": "^\\d+(\\.\\d+)*$"
      }
    },
    "dispositionPolicy": {
      "type": "string",
      "minLength": 1
    },
    "persona": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1
        },
        "companyName": {
          "type": "string",
          "minLength": 1
        },
        "description": {
          "type": "string",
          "minLength": 1
        },
        "tone": {
          "type": "string",
          "minLength": 1
        },
        "companyRole": {
          "type": "string",
          "minLength": 1
        },
        "companyInfo": {
          "type": "string",
          "minLength": 1
        },
        "register": {
          "type": "string",
          "enum": [
            "formal",
            "informal"
          ]
        }
      },
      "required": [
        "name",
        "companyName",
        "description",
        "tone",
        "companyRole"
      ],
      "additionalProperties": false
    },
    "knowledgeFacts": {
      "default": {},
      "type": "object",
      "propertyNames": {
        "type": "string",
        "pattern": "^[a-z][a-z0-9_]*$"
      },
      "additionalProperties": {
        "type": "string",
        "minLength": 1
      }
    },
    "customRules": {
      "default": [],
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "variables": {
      "default": [],
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "from": {
            "type": "string",
            "minLength": 1
          },
          "to": {
            "type": "string",
            "minLength": 1
          },
          "hook": {
            "type": "array",
            "items": {
              "type": "string",
              "minLength": 1
            }
          }
        },
        "required": [
          "from",
          "to"
        ],
        "additionalProperties": false
      }
    },
    "outstandingQuestions": {
      "default": [],
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1
          },
          "question": {
            "type": "string",
            "minLength": 1
          },
          "blocksStage": {
            "type": "string",
            "enum": [
              "scenarioDesign",
              "configBuild"
            ]
          },
          "deferralCount": {
            "default": 0,
            "type": "integer",
            "minimum": 0,
            "maximum": 9007199254740991
          }
        },
        "required": [
          "id",
          "question",
          "blocksStage",
          "deferralCount"
        ],
        "additionalProperties": false
      }
    },
    "speechPlacements": {
      "default": {},
      "type": "object",
      "propertyNames": {
        "type": "string",
        "pattern": "^[a-z][a-z0-9_]*$"
      },
      "additionalProperties": {
        "type": "object",
        "propertyNames": {
          "type": "string",
          "minLength": 1
        },
        "additionalProperties": {
          "type": "string",
          "enum": [
            "dsl_inline",
            "action_message"
          ]
        }
      }
    },
    "actionMessages": {
      "default": {},
      "type": "object",
      "propertyNames": {
        "type": "string",
        "pattern": "^[a-z][a-z0-9_]*$"
      },
      "additionalProperties": {
        "type": "object",
        "propertyNames": {
          "type": "string",
          "minLength": 1
        },
        "additionalProperties": {
          "type": "string"
        }
      }
    }
  },
  "required": [
    "projectName",
    "primaryLanguage",
    "languages",
    "callDirection",
    "cases",
    "runtimeFilteredCases",
    "dispositionPolicy",
    "persona",
    "knowledgeFacts",
    "customRules",
    "variables",
    "outstandingQuestions",
    "speechPlacements",
    "actionMessages"
  ],
  "additionalProperties": false
}
```
