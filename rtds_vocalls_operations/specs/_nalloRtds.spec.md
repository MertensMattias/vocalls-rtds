# Reference — NAllo_RTDS.xml (top-level dispatcher, not a Vocalls operation)

| Field          | Value                                                                |
| -------------- | -------------------------------------------------------------------- |
| Operation Type | n/a (runtime entry point — the dispatcher, not an operation)         |
| Component name | n/a                                                                  |
| Pattern        | n/a                                                                  |
| Source handler | `rtds_pureconnect_handlers/handlers/NAllo_RTDS.xml`                  |
| Target file    | n/a                                                                  |

## What this handler does (PureConnect side)

`NAllo_RTDS.xml` is the **top-level dispatcher** for PureConnect's RTDS integration. It is invoked by 9 distinct system events — incoming call, intercom call, queue-item timeout, blind-transfer request, attendant-profile lookup, queue-handling re-entry, etc. — and:

1. Identifies the event type by handler name (`p_sHandlerName`).
2. Resolves the routing source ID from call attributes or the dial string.
3. Looks up the RTDS base path in Directory Services.
4. Sets `ATTR_AttendantProfile = "RTDS"` so downstream IC handlers know the call is routed by RTDS.
5. Loads `FirstOperationID` and sets `RTDS_Path` to bootstrap the per-call routing state.
6. Branches into the appropriate sub-handler (`NAllo_RTDS_QueueHandling`, or directly into one of the operation handlers if the dispatcher was called from a routing context).

The handler is ~140 KB of XML driving a `Selection` step that fans out to 9 ExitPaths. There is no business logic the operator configures on it.

## Vocalls equivalent

The Vocalls runtime owns this responsibility natively. The `Script-node entry points` in the runtime (per [RTDS_runtime_spec.md §7](../../references/rtds/RTDS_runtime_spec.md) — referenced by the component-builder skill) replace this handler entirely. Specifically:

- Incoming call → Vocalls' inbound entry point loads the configured flow.
- Queue-item-timeout / blind-transfer / intercom → not exposed as flow events in Vocalls; the runtime handles them transparently.
- `FirstOperationID` resolution → the Vocalls runtime materialises this when it first parses the flow.
- `RTDS_Path` and `ATTR_AttendantProfile` → bookkeeping that has no Vocalls equivalent.

## Recommendation

Do not generate a component for `NAllo_RTDS.xml`. The behaviour belongs in the runtime, not in a flow operation.

This reference file exists so future readers know why no `nalloRtds.spec.md` for an operation exists and where the dispatcher logic moved to.

### Open questions

- Confirm the runtime correctly auto-bootstraps `RTDS_sourceId` / `RTDS_name` / `RTDS_project` / `RTDS_promptLibrary` / `RTDS_supportedLanguages` on inbound calls without operator configuration on the flow itself. (Per memory: yes — the runtime writes these on flow load.)
- Confirm the 9 PureConnect event types do not need any operator-visible hook in Vocalls. If they do, the right answer is a runtime extension, not a flow operation.
