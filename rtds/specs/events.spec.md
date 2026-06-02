---
status: non-operation
catalog: null
---

# Operation Spec — events (Events — runtime event dispatcher)

| Field          | Value                                                          |
| -------------- | -------------------------------------------------------------- |
| Operation Type | n/a (runtime event dispatcher, not an operator-facing operation) |
| Component name | n/a                                                            |
| Pattern        | n/a                                                            |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_Events.xml`     |
| Target file    | n/a — do not generate as a Vocalls component                  |

## Business purpose (PureConnect side only — for context)

`NAllo_RTDS_Events` is the entry point for **system custom notifications** sent to the PureConnect IC server outside the call leg. When the RTDS backend pushes an `Update` or `Delete` event for a routing-table source ID, PureConnect dispatches the notification to this handler, which:

1. Inspects the `sCustomEventId` (`"Update"` or `"Delete"`).
2. Confirms the `lsCustomData[0]` starts with `"SourceId="`.
3. Routes to `NAllo_RTDS_UpdateSourceId` with the source ID and event type.
4. Wraps the result in a custom-notification reply published back to the requester.

The handler is essentially a glue layer between PureConnect's notification bus and the directory-services maintenance subroutine documented in [updateSourceId.spec.md](updateSourceId.spec.md).

## Why this isn't a Vocalls operation

Vocalls does not surface IC-server custom notifications to flow components. The RTDS backend in a Vocalls deployment talks to the runtime directly via its HTTP routing API; there is no in-flow handler that needs to receive admin events.

If the operator needs cache invalidation when a source ID changes (e.g. a Vocalls runtime that caches a fetched flow), the model is:

- The RTDS backend pushes a cache-invalidate notification to the Vocalls runtime over the same channel it uses to fetch flows (HTTP webhook, message bus, etc.).
- The Vocalls runtime invalidates its cache.
- The next call that lands on the cached flow refetches.

None of this involves a Vocalls flow operation.

## Recommendation

Do not port `NAllo_RTDS_Events`. The directory-services maintenance work it triggers (`NAllo_RTDS_UpdateSourceId`) is itself out of scope for Vocalls operations — see [updateSourceId.spec.md "Open questions"](updateSourceId.spec.md).

If a stripped-down "let an external system push an event onto the call" capability is wanted, that's a webhook receiver — not an IVR operation. Flag this with the project owner if requirements change.

### Open questions

- Confirm there is no Vocalls deployment scenario that needs in-flow handling of `Update`/`Delete` source-ID notifications.
- Confirm the RTDS backend's cache-invalidation channel for Vocalls (so the operator knows where the equivalent capability lives, if needed).
