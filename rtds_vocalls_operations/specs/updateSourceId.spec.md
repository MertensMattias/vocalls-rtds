# Operation Spec — updateSourceId (UpdateSourceId)

| Field          | Value                                                                |
| -------------- | -------------------------------------------------------------------- |
| Operation Type | `UpdateSourceId`                                                     |
| Component name | `updateSourceId`                                                     |
| Pattern        | `set_attributes` (variant — writes `RTDS_sourceId` and refreshes related session vars; no full flow re-fetch) |
| Source handler | `rtds_pureconnect_handlers/handlers/NAllo_RTDS_UpdateSourceId.xml`   |
| Target file    | `rtds_vocalls_operations/components/updateSourceId.js`               |

## Business purpose

Stamp a new routing source ID onto the session so that any subsequent runtime fetch (e.g. by `FlowJump`, or the implicit refresh on a queue re-entry) resolves against the new flow definition. Used when the flow author needs to redirect the caller's "next operation" lookup to a different RTDS source without performing a full `FlowJump`.

Lightweight cousin of `FlowJump` — does not re-fetch the routing table, does not advance to a specific `OperationId`, only mutates the source-id pointer.

### Inputs (Params)

| Param name  | Type             | Required | Default | Description                                                                                                                          |
| ----------- | ---------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Active`    | boolean          | no       | `false` | If falsy, the operation logs a skip and exits to `NextStep`. Universal across operations.                                            |
| `Action`    | string (enum)    | no       | `'Update'` | One of `Update` (set the new value) or `Delete` (clear the source ID).                                                            |
| `SourceId`  | string           | yes (for `Update`) | — | The new RTDS source identifier.                                                                                                |
| `NextStep`  | string (step ID) | yes      | —       | Continuation after the update.                                                                                                       |

### Outputs

| Branch key  | Taken when                                            | Fallback |
| ----------- | ----------------------------------------------------- | -------- |
| `NextStep`  | Always — the operation is fire-and-continue.          | `-1`     |

### Component structure

Single-script work body. Mutates `global.RTDS_sourceId` (and clears any cached flow vars derived from it).

`init`:

```js
__rtParams = __setupConfig(__configJSON);
if (!_headers) { _headers = {}; }
Logger.debug('[updateSourceId] config resolved', { params: __rtParams });
```

`script` (work body):

```js
global[_rtNextStep] = getValue(__rtParams, 'NextStep', -1);

if (!getValue(__rtParams, 'Active', false)) {
    Logger.info('[updateSourceId] skipped — inactive', { nextStep: global[_rtNextStep] });
    return;
}

var __action = String(getValue(__rtParams, 'Action', 'Update'));

if (__action === 'Delete') {
    delete global.RTDS_sourceId;
    Logger.info('[updateSourceId] cleared', { nextStep: global[_rtNextStep] });
    return;
}

var __sourceId = getValue(__rtParams, 'SourceId', '');
if (!__sourceId) { Logger.warn('[updateSourceId] missing SourceId', { nextStep: global[_rtNextStep] }); return; }

global.RTDS_sourceId = String(__sourceId);
Logger.info('[updateSourceId] updated', { sourceId: __sourceId, nextStep: global[_rtNextStep] });
```

`output`:

```js
OnEnter: Logger.info('[updateSourceId] exit', { nextStep: __rtNextStep });
```

### Open questions

- The source handler is enormous (~96 KB) because it manipulates a Directory Services hierarchy under `RoutingTable\SourceId\vN\Operations`, increments a version counter, publishes a new `ActiveConfig`, and cleans up old versions. **None of that has a Vocalls equivalent** — Vocalls reads the routing table from the RTDS HTTP API on demand, with no client-side cache to maintain. Confirm the Vocalls operation is intended to be the lightweight Action=Update/Delete behaviour above, not a port of the directory-services maintenance routine.
- The directory-services maintenance code in the source handler is essentially an *admin tool*, not a per-call operation. If the operator wants to keep that capability, it belongs in the RTDS backend (a server-side cron or an admin API), not in a Vocalls flow operation. Flag this clearly with the project owner.
- The source handler acquires a semaphore on `"RTDS" + SourceId`. Vocalls does not need this — a per-session attribute write has no cross-session contention.
- Confirm whether `Delete` is a real use case in production. If not, drop the Action Param and always assume Update.
