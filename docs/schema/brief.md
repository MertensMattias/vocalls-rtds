# brief schema

> AUTO-GENERATED from `core/schema/brief.js` via `npm run schema:docs`. Do not edit.

## JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "project": {
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
    }
  },
  "required": [
    "project",
    "primaryLanguage",
    "languages",
    "callDirection"
  ],
  "additionalProperties": false
}
```
