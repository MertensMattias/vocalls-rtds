# pipelineState schema

> AUTO-GENERATED from `core/schema/pipelineState.js` via `npm run schema:docs`. Do not edit.

## JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "_meta": {
      "type": "object",
      "properties": {
        "schemaVersion": {
          "type": "string",
          "const": "2"
        },
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
        "stage": {
          "type": "string",
          "enum": [
            "intake",
            "scenarioDesign",
            "configBuild",
            "validate",
            "translate",
            "done",
            "escalated"
          ]
        },
        "repairRound": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "repairHistory": {
          "default": [],
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "stage": {
                "type": "string",
                "enum": [
                  "intake",
                  "scenarioDesign",
                  "configBuild",
                  "validate",
                  "translate",
                  "done",
                  "escalated"
                ]
              },
              "round": {
                "type": "integer",
                "minimum": 0,
                "maximum": 9007199254740991
              },
              "ts": {
                "type": "string",
                "minLength": 1
              },
              "resolved": {
                "type": "boolean"
              },
              "reason": {
                "type": "string"
              }
            },
            "required": [
              "stage",
              "round",
              "ts",
              "resolved"
            ],
            "additionalProperties": false
          }
        },
        "createdAt": {
          "type": "string",
          "minLength": 1
        },
        "updatedAt": {
          "type": "string",
          "minLength": 1
        },
        "lastWriter": {
          "type": "string",
          "minLength": 1
        },
        "inputHashes": {
          "default": {},
          "type": "object",
          "properties": {
            "intake": {
              "type": "string",
              "minLength": 64,
              "maxLength": 64
            },
            "scenarioDesign": {
              "type": "string",
              "minLength": 64,
              "maxLength": 64
            },
            "configBuild": {
              "type": "string",
              "minLength": 64,
              "maxLength": 64
            },
            "translator": {
              "default": {},
              "type": "object",
              "properties": {
                "NL": {
                  "type": "string",
                  "minLength": 64,
                  "maxLength": 64
                },
                "FR": {
                  "type": "string",
                  "minLength": 64,
                  "maxLength": 64
                },
                "DE": {
                  "type": "string",
                  "minLength": 64,
                  "maxLength": 64
                },
                "EN": {
                  "type": "string",
                  "minLength": 64,
                  "maxLength": 64
                }
              },
              "additionalProperties": false
            }
          },
          "required": [
            "translator"
          ],
          "additionalProperties": false
        },
        "status": {
          "type": "string",
          "enum": [
            "idle",
            "running",
            "paused",
            "escalated"
          ]
        },
        "gateName": {
          "type": "string",
          "enum": [
            "designApproval",
            "qualityGate",
            "translateGate"
          ]
        },
        "gateReason": {
          "type": "string"
        }
      },
      "required": [
        "schemaVersion",
        "project",
        "primaryLanguage",
        "languages",
        "stage",
        "repairRound",
        "repairHistory",
        "createdAt",
        "updatedAt",
        "lastWriter",
        "inputHashes"
      ],
      "additionalProperties": false
    },
    "brief": {
      "type": "object",
      "properties": {
        "path": {
          "type": "string",
          "minLength": 1
        },
        "sha256": {
          "type": "string",
          "minLength": 64,
          "maxLength": 64
        }
      },
      "required": [
        "path",
        "sha256"
      ],
      "additionalProperties": false
    },
    "control": {
      "type": "object",
      "properties": {
        "userIntent": {
          "type": "string",
          "enum": [
            "build",
            "update"
          ]
        },
        "userGates": {
          "type": "object",
          "properties": {
            "designApproval": {
              "type": "string",
              "enum": [
                "pending",
                "approved",
                "revised",
                "noop"
              ]
            },
            "qualityGate": {
              "type": "string",
              "enum": [
                "pending",
                "approved",
                "revised"
              ]
            },
            "translateGate": {
              "type": "string",
              "enum": [
                "pending",
                "approved",
                "revised",
                "declined"
              ]
            }
          },
          "required": [
            "designApproval",
            "qualityGate",
            "translateGate"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "userIntent",
        "userGates"
      ],
      "additionalProperties": false
    },
    "intake": {
      "anyOf": [
        {
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
        },
        {
          "type": "null"
        }
      ]
    },
    "scenarioDesign": {
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "primaryLanguage": {
              "type": "string",
              "enum": [
                "NL",
                "FR",
                "DE",
                "EN"
              ]
            },
            "scenarios": {
              "minItems": 1,
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "type": {
                    "type": "string",
                    "enum": [
                      "DETECT_INTENT",
                      "ROUTE",
                      "COLLECT",
                      "CONFIRM",
                      "OFFER",
                      "EXECUTE",
                      "INFORM",
                      "AUTHENTICATE"
                    ]
                  },
                  "name": {
                    "type": "string",
                    "pattern": "^[a-z][a-z0-9_]*$"
                  },
                  "appliesTo": {
                    "minItems": 1,
                    "type": "array",
                    "items": {
                      "type": "string",
                      "pattern": "^\\d+(\\.\\d+)*$"
                    }
                  },
                  "objective": {
                    "type": "string",
                    "minLength": 50
                  },
                  "facts": {
                    "default": [],
                    "type": "array",
                    "items": {
                      "type": "string",
                      "minLength": 1
                    }
                  },
                  "actionsUsed": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "pattern": "^[a-z][a-z0-9_]*$"
                    }
                  }
                },
                "required": [
                  "type",
                  "name",
                  "appliesTo",
                  "objective",
                  "facts",
                  "actionsUsed"
                ],
                "additionalProperties": false
              }
            },
            "caseToScenario": {
              "type": "object",
              "propertyNames": {
                "type": "string",
                "pattern": "^\\d+(\\.\\d+)*$"
              },
              "additionalProperties": {
                "type": "string",
                "pattern": "^[a-z][a-z0-9_]*$"
              }
            },
            "defaultScenario": {
              "type": "string",
              "pattern": "^[a-z][a-z0-9_]*$"
            },
            "knowledgeWiring": {
              "type": "object",
              "propertyNames": {
                "type": "string",
                "pattern": "^\\d+(\\.\\d+)*$"
              },
              "additionalProperties": {
                "default": [],
                "type": "array",
                "items": {
                  "type": "string",
                  "pattern": "^[a-z][a-z0-9_]*$"
                }
              }
            },
            "rationale": {
              "type": "string",
              "minLength": 1
            }
          },
          "required": [
            "primaryLanguage",
            "scenarios",
            "caseToScenario",
            "defaultScenario",
            "knowledgeWiring",
            "rationale"
          ],
          "additionalProperties": false
        },
        {
          "type": "null"
        }
      ]
    },
    "slotMap": {
      "anyOf": [
        {
          "type": "object",
          "properties": {
            "projectMeta": {
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
                }
              },
              "required": [
                "projectName",
                "primaryLanguage",
                "languages"
              ],
              "additionalProperties": false
            },
            "agents": {
              "type": "object",
              "propertyNames": {
                "type": "string"
              },
              "additionalProperties": {
                "type": "object",
                "properties": {
                  "persona": {
                    "type": "object",
                    "properties": {
                      "NL": {
                        "anyOf": [
                          {
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
                          {
                            "type": "string",
                            "minLength": 1
                          }
                        ]
                      },
                      "FR": {
                        "anyOf": [
                          {
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
                          {
                            "type": "string",
                            "minLength": 1
                          }
                        ]
                      },
                      "DE": {
                        "anyOf": [
                          {
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
                          {
                            "type": "string",
                            "minLength": 1
                          }
                        ]
                      },
                      "EN": {
                        "anyOf": [
                          {
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
                          {
                            "type": "string",
                            "minLength": 1
                          }
                        ]
                      },
                      "projectRulesAppendix": {
                        "type": "object",
                        "properties": {
                          "NL": {
                            "default": [],
                            "type": "array",
                            "items": {
                              "type": "string",
                              "minLength": 1
                            }
                          },
                          "FR": {
                            "type": "array",
                            "items": {
                              "type": "string",
                              "minLength": 1
                            }
                          },
                          "DE": {
                            "type": "array",
                            "items": {
                              "type": "string",
                              "minLength": 1
                            }
                          },
                          "EN": {
                            "type": "array",
                            "items": {
                              "type": "string",
                              "minLength": 1
                            }
                          }
                        },
                        "required": [
                          "NL"
                        ],
                        "additionalProperties": false
                      }
                    },
                    "additionalProperties": false
                  },
                  "companyInfo": {
                    "type": "object",
                    "properties": {
                      "NL": {
                        "type": "string"
                      },
                      "FR": {
                        "type": "string"
                      },
                      "DE": {
                        "type": "string"
                      },
                      "EN": {
                        "type": "string"
                      }
                    },
                    "additionalProperties": false
                  },
                  "CANONICAL_RULES": {
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
                  "cases": {
                    "type": "object",
                    "propertyNames": {
                      "type": "string",
                      "pattern": "^\\d+(\\.\\d+)*$"
                    },
                    "additionalProperties": {
                      "type": "object",
                      "properties": {
                        "opening": {
                          "type": "object",
                          "properties": {
                            "NL": {
                              "type": "string"
                            },
                            "FR": {
                              "type": "string"
                            },
                            "DE": {
                              "type": "string"
                            },
                            "EN": {
                              "type": "string"
                            }
                          },
                          "additionalProperties": false
                        },
                        "scenario": {
                          "type": "string",
                          "pattern": "^[a-z][a-z0-9_]*$"
                        },
                        "actions": {
                          "type": "array",
                          "items": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]*$"
                          }
                        },
                        "knowledge": {
                          "type": "array",
                          "items": {
                            "type": "string",
                            "pattern": "^[a-z][a-z0-9_]*$"
                          }
                        }
                      },
                      "required": [
                        "opening",
                        "scenario",
                        "actions",
                        "knowledge"
                      ],
                      "additionalProperties": false
                    }
                  },
                  "scenarios": {
                    "type": "object",
                    "propertyNames": {
                      "type": "string",
                      "pattern": "^[a-z][a-z0-9_]*$"
                    },
                    "additionalProperties": {
                      "type": "object",
                      "properties": {
                        "objective": {
                          "type": "object",
                          "properties": {
                            "NL": {
                              "type": "string"
                            },
                            "FR": {
                              "type": "string"
                            },
                            "DE": {
                              "type": "string"
                            },
                            "EN": {
                              "type": "string"
                            }
                          },
                          "additionalProperties": false
                        },
                        "facts": {
                          "type": "object",
                          "properties": {
                            "NL": {
                              "type": "array",
                              "items": {
                                "type": "string"
                              }
                            },
                            "FR": {
                              "type": "array",
                              "items": {
                                "type": "string"
                              }
                            },
                            "DE": {
                              "type": "array",
                              "items": {
                                "type": "string"
                              }
                            },
                            "EN": {
                              "type": "array",
                              "items": {
                                "type": "string"
                              }
                            }
                          },
                          "additionalProperties": false
                        }
                      },
                      "required": [
                        "objective",
                        "facts"
                      ],
                      "additionalProperties": false
                    }
                  },
                  "knowledgeModules": {
                    "type": "object",
                    "propertyNames": {
                      "type": "string",
                      "pattern": "^[a-z][a-z0-9_]*$"
                    },
                    "additionalProperties": {
                      "type": "object",
                      "properties": {
                        "NL": {
                          "type": "string"
                        },
                        "FR": {
                          "type": "string"
                        },
                        "DE": {
                          "type": "string"
                        },
                        "EN": {
                          "type": "string"
                        }
                      },
                      "additionalProperties": false
                    }
                  },
                  "actions": {
                    "type": "object",
                    "propertyNames": {
                      "type": "string",
                      "pattern": "^[a-z][a-z0-9_]*$"
                    },
                    "additionalProperties": {
                      "type": "object",
                      "properties": {
                        "description": {
                          "type": "object",
                          "properties": {
                            "NL": {
                              "type": "string"
                            },
                            "FR": {
                              "type": "string"
                            },
                            "DE": {
                              "type": "string"
                            },
                            "EN": {
                              "type": "string"
                            }
                          },
                          "additionalProperties": false
                        },
                        "confirmation_message": {
                          "type": "object",
                          "properties": {
                            "NL": {
                              "type": "string"
                            },
                            "FR": {
                              "type": "string"
                            },
                            "DE": {
                              "type": "string"
                            },
                            "EN": {
                              "type": "string"
                            }
                          },
                          "additionalProperties": false
                        },
                        "confirmation": {
                          "type": "string",
                          "enum": [
                            "None",
                            "Implicit",
                            "Explicit"
                          ]
                        },
                        "entities": {
                          "default": {},
                          "type": "object",
                          "propertyNames": {
                            "type": "string",
                            "minLength": 1
                          },
                          "additionalProperties": {
                            "type": "object",
                            "properties": {
                              "description": {
                                "type": "object",
                                "properties": {
                                  "NL": {
                                    "type": "string"
                                  },
                                  "FR": {
                                    "type": "string"
                                  },
                                  "DE": {
                                    "type": "string"
                                  },
                                  "EN": {
                                    "type": "string"
                                  }
                                },
                                "additionalProperties": false
                              },
                              "required": {
                                "type": "boolean"
                              }
                            },
                            "required": [
                              "description",
                              "required"
                            ],
                            "additionalProperties": false
                          }
                        },
                        "messages": {
                          "type": "object",
                          "properties": {
                            "default": {
                              "type": "object",
                              "properties": {
                                "success": {
                                  "type": "object",
                                  "properties": {
                                    "NL": {
                                      "type": "string"
                                    },
                                    "FR": {
                                      "type": "string"
                                    },
                                    "DE": {
                                      "type": "string"
                                    },
                                    "EN": {
                                      "type": "string"
                                    }
                                  },
                                  "additionalProperties": false
                                },
                                "failure": {
                                  "type": "object",
                                  "properties": {
                                    "NL": {
                                      "type": "string"
                                    },
                                    "FR": {
                                      "type": "string"
                                    },
                                    "DE": {
                                      "type": "string"
                                    },
                                    "EN": {
                                      "type": "string"
                                    }
                                  },
                                  "additionalProperties": false
                                }
                              },
                              "required": [
                                "success",
                                "failure"
                              ],
                              "additionalProperties": false
                            }
                          },
                          "required": [
                            "default"
                          ],
                          "additionalProperties": {
                            "type": "object",
                            "properties": {
                              "success": {
                                "type": "object",
                                "properties": {
                                  "NL": {
                                    "type": "string"
                                  },
                                  "FR": {
                                    "type": "string"
                                  },
                                  "DE": {
                                    "type": "string"
                                  },
                                  "EN": {
                                    "type": "string"
                                  }
                                },
                                "additionalProperties": false
                              },
                              "failure": {
                                "type": "object",
                                "properties": {
                                  "NL": {
                                    "type": "string"
                                  },
                                  "FR": {
                                    "type": "string"
                                  },
                                  "DE": {
                                    "type": "string"
                                  },
                                  "EN": {
                                    "type": "string"
                                  }
                                },
                                "additionalProperties": false
                              }
                            },
                            "additionalProperties": false
                          }
                        }
                      },
                      "required": [
                        "description",
                        "confirmation_message",
                        "confirmation",
                        "entities",
                        "messages"
                      ],
                      "additionalProperties": false
                    }
                  },
                  "cdbLogs": {
                    "type": "object",
                    "propertyNames": {
                      "type": "string"
                    },
                    "additionalProperties": {
                      "type": "object",
                      "properties": {
                        "default": {
                          "type": "string",
                          "minLength": 1
                        }
                      },
                      "required": [
                        "default"
                      ],
                      "additionalProperties": {
                        "type": "object",
                        "properties": {
                          "default": {
                            "type": "object",
                            "properties": {
                              "success": {
                                "type": "string"
                              },
                              "failure": {
                                "type": "string"
                              }
                            },
                            "additionalProperties": false
                          }
                        },
                        "required": [
                          "default"
                        ],
                        "additionalProperties": {
                          "type": "object",
                          "properties": {
                            "success": {
                              "type": "string"
                            },
                            "failure": {
                              "type": "string"
                            }
                          },
                          "additionalProperties": false
                        }
                      }
                    }
                  },
                  "EXPORT_MAP": {
                    "default": {},
                    "type": "object",
                    "propertyNames": {
                      "type": "string"
                    },
                    "additionalProperties": {
                      "type": "string"
                    }
                  }
                },
                "required": [
                  "persona",
                  "companyInfo",
                  "CANONICAL_RULES",
                  "cases",
                  "scenarios",
                  "knowledgeModules",
                  "actions",
                  "cdbLogs",
                  "EXPORT_MAP"
                ],
                "additionalProperties": false
              }
            }
          },
          "required": [
            "projectMeta",
            "agents"
          ],
          "additionalProperties": false
        },
        {
          "type": "null"
        }
      ]
    },
    "validation": {
      "type": "object",
      "properties": {
        "lastRun": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ]
        },
        "findings": {
          "type": "array",
          "items": {
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
        },
        "blocking": {
          "type": "boolean"
        },
        "autofixApplied": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "lastRun",
        "findings",
        "blocking",
        "autofixApplied"
      ],
      "additionalProperties": false
    },
    "translation": {
      "type": "object",
      "properties": {
        "NL": {
          "type": "string",
          "enum": [
            "pending",
            "inProgress",
            "complete",
            "failed"
          ]
        },
        "FR": {
          "type": "string",
          "enum": [
            "pending",
            "inProgress",
            "complete",
            "failed"
          ]
        },
        "DE": {
          "type": "string",
          "enum": [
            "pending",
            "inProgress",
            "complete",
            "failed"
          ]
        },
        "EN": {
          "type": "string",
          "enum": [
            "pending",
            "inProgress",
            "complete",
            "failed"
          ]
        }
      },
      "required": [
        "NL",
        "FR",
        "DE",
        "EN"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "_meta",
    "brief",
    "control",
    "intake",
    "scenarioDesign",
    "slotMap",
    "validation",
    "translation"
  ],
  "additionalProperties": false
}
```
