# agentConfig schema

> AUTO-GENERATED from `core/schema/agentConfig.js` via `npm run schema:docs`. Do not edit.

## JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [
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
      "type": "object",
      "properties": {
        "_meta": {
          "type": "object",
          "properties": {
            "version": {
              "type": "string",
              "const": "1.2"
            },
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
            "version",
            "projectName",
            "primaryLanguage",
            "languages"
          ],
          "additionalProperties": false
        },
        "llm": {
          "type": "object",
          "properties": {
            "maxTokens": {
              "type": "integer",
              "exclusiveMinimum": 0,
              "maximum": 9007199254740991
            },
            "shortWaitDelay": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "longWaitDelay": {
              "type": "integer",
              "minimum": 0,
              "maximum": 9007199254740991
            },
            "conversationType": {
              "type": "string",
              "const": "voicebot"
            },
            "timeZone": {
              "type": "string",
              "minLength": 1
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
            "maxTokens",
            "shortWaitDelay",
            "longWaitDelay",
            "conversationType",
            "timeZone",
            "callDirection"
          ],
          "additionalProperties": false
        },
        "labels": {
          "type": "object",
          "properties": {
            "NL": {
              "type": "object",
              "propertyNames": {
                "type": "string",
                "minLength": 1
              },
              "additionalProperties": {
                "type": "string",
                "minLength": 1
              }
            },
            "FR": {
              "type": "object",
              "propertyNames": {
                "type": "string",
                "minLength": 1
              },
              "additionalProperties": {
                "type": "string",
                "minLength": 1
              }
            },
            "DE": {
              "type": "object",
              "propertyNames": {
                "type": "string",
                "minLength": 1
              },
              "additionalProperties": {
                "type": "string",
                "minLength": 1
              }
            },
            "EN": {
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
          },
          "required": [
            "NL",
            "FR",
            "DE",
            "EN"
          ],
          "additionalProperties": false
        },
        "messages": {
          "type": "object",
          "properties": {
            "NL": {
              "type": "object",
              "properties": {
                "repeat": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "noInput": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "waitShort": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "wait": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "waitConfirmation": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "confirmation": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "fill": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "bargeIn": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                }
              },
              "required": [
                "repeat",
                "noInput",
                "waitShort",
                "wait",
                "waitConfirmation",
                "confirmation",
                "fill",
                "bargeIn"
              ],
              "additionalProperties": false
            },
            "FR": {
              "type": "object",
              "properties": {
                "repeat": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "noInput": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "waitShort": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "wait": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "waitConfirmation": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "confirmation": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "fill": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "bargeIn": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                }
              },
              "required": [
                "repeat",
                "noInput",
                "waitShort",
                "wait",
                "waitConfirmation",
                "confirmation",
                "fill",
                "bargeIn"
              ],
              "additionalProperties": false
            },
            "DE": {
              "type": "object",
              "properties": {
                "repeat": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "noInput": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "waitShort": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "wait": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "waitConfirmation": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "confirmation": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "fill": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "bargeIn": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                }
              },
              "required": [
                "repeat",
                "noInput",
                "waitShort",
                "wait",
                "waitConfirmation",
                "confirmation",
                "fill",
                "bargeIn"
              ],
              "additionalProperties": false
            },
            "EN": {
              "type": "object",
              "properties": {
                "repeat": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "noInput": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "waitShort": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "wait": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "waitConfirmation": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "confirmation": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "fill": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                },
                "bargeIn": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "minLength": 1
                  }
                }
              },
              "required": [
                "repeat",
                "noInput",
                "waitShort",
                "wait",
                "waitConfirmation",
                "confirmation",
                "fill",
                "bargeIn"
              ],
              "additionalProperties": false
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
        "llm",
        "labels",
        "messages"
      ],
      "additionalProperties": false
    }
  ]
}
```
