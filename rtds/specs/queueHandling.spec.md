---
status: non-operation
catalog: null
---

# Operation Spec — queueHandling (no Vocalls equivalent — runtime bridge)

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Operation Type | n/a (internal runtime bridge, not an operator-facing operation)    |
| Component name | n/a                                                                |
| Pattern        | n/a                                                                |
| Source handler | `rtds/pureconnect_handlers/NAllo_RTDS_QueueHandling.xml`  |
| Target file    | n/a — do not generate                                              |

## Business purpose (PureConnect side only — for context)

`NAllo_RTDS_QueueHandling` is a bridge between PureConnect's per-queue entry-point handlers and the master `NAllo_RTDS` routing dispatcher. When a call enters an ACD workgroup queue, the entry-point handler invokes this subroutine, which:

1. Reads the `RTDS_Path` call attribute. If empty, the handler exits without touching the call.
2. Reads `RTDS_InQueue` and compares it to the incoming `QueueId`.
3. If the values match, the call is already being managed by the RTDS routing flow → returns `p_bTransferred = true` so the entry-point handler is a no-op.
4. If they differ, writes `RTDS_InQueue = QueueId` and invokes `NAllo_RTDS` to re-enter the master dispatcher (effectively transferring routing control to the new queue).

## Why this isn't a Vocalls operation

Vocalls' runtime owns queue entry/exit transitions natively. There is no per-queue entry-point handler that needs to call back into the RTDS dispatcher, because Vocalls' flow continues to drive the call through its own state machine.

The functional intent — "is the call already in the right place? otherwise re-enter the dispatcher" — is implicit in how Vocalls' `WorkgroupTransfer` operation hands off and how the runtime resumes the flow when the queue is left.

## Recommendation

Do not port `NAllo_RTDS_QueueHandling`. The behaviour is folded into:

- `WorkgroupTransfer` (sets `RTDS_InQueue` indirectly via the queue hand-off).
- `FlowJump` (re-enters the master flow when the source-id changes).

If a specific scenario surfaces that needs the explicit "am I already in this queue?" check, model it as a `CheckAttribute` operation on `RTDS_InQueue` followed by a `FlowJump` or `WorkgroupTransfer`.

### Open questions

- Confirm there is no scenario in production that depends on the implicit "QueueHandling" bridge — i.e. all queue-entry behaviour is covered by `WorkgroupTransfer` + the runtime's own routing.
- Confirm that `RTDS_InQueue` (the bookkeeping attribute) is still being written by the runtime, or whether it has been retired in favour of an internal state field.
