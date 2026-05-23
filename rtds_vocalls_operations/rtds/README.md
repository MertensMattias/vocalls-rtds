# RTDS reference material

Reference copies of the RTDS (Routing Table Data Store) artefacts: the runtime that runs inside Vocalls Script nodes, the API spec the runtime fetches from, the conventions documents, and the Vocalls Designer reference XML for the operation handlers and components.

These files are not loaded by the simulator. They exist as a read-only reference for:

- writing or reviewing call scripts under `projects/<name>/`
- generating Vocalls Designer components (`rtds-vocalls-component-builder` skill)
- understanding the JSON shape returned by the RTDS API
- checking the canonical handler and component XML shapes when authoring new operations

## Layout

```
references/rtds/
  docs/
    RTDS_runtime_spec.md             Full spec for the runtime layer
    rtds_component_conventions.md    Naming, swimlane, JS conventions
    component_quality_instructions.md Quality bar / review checklist
    routingTable.swagger             REST API spec (OpenAPI/Swagger)
  runtime/
    RTDS_runtime.js                  Reference implementation of the runtime
    runtimeHelperFunctionsRTDS.js    Shared helpers
    Logger.js                        Logging helper (log_debug, log_warn, log_error)
  examples/
    sendSms.js                       Example call script
    sendSms_example.js               Annotated example variant
  handlers/
    NAllo_RTDS.xml                   Top-level handler (entry point A)
    NAllo_RTDS_CheckAttribute.xml    Operation-specific handlers
    NAllo_RTDS_Condition.xml
    NAllo_RTDS_Disconnect.xml
    NAllo_RTDS_FlowJump.xml
    NAllo_RTDS_IVRLogging.xml
    NAllo_RTDS_UpdateSourceId.xml
    NAllo_RTDS_WorkgroupTransfer.xml
  components/
    getFirstOperation.xml            Designer component shapes
    checkAttribute.xml
    condition.xml
    disconnect.xml
    flowJump.xml
    IVRLogging.xml
    workgroupTransfer.xml
```

## How to use

When writing a new call script in `projects/<name>/callScripts/`, prefer the patterns in `runtime/RTDS_runtime.js` and the conventions in `docs/rtds_component_conventions.md`. The Vocalls JS constraint table (no arrow functions, no Map/Set, no template literals, no optional chaining, etc.) is documented in `docs/RTDS_runtime_spec.md` and must hold for everything that ships into a Script node.

When authoring a new operation type, copy the closest handler XML from `handlers/` and the closest component XML from `components/`, then adjust. The `rtds-vocalls-component-builder` skill at `../vocalls-component-builder/` automates this; its own `references/` folder is the source-of-truth set the skill reads from.

## Source

Copied from `C:\Users\merte\claude_coop\rtds_vocalls_development` on 2026-05-19. The originals stay in that working folder; treat this copy as a snapshot for repo-local use.
