---
title: segmentLog — append-only call-flow audit trail, finalized at onCallEnd
date: 2026-07-01
category: architecture-patterns
module: globalLibraries/active/engie_B_GlobalIntentMatrix.js, globalLibraries/active/engie_C_GlobalApiFactory.js
problem_type: reference
component: segmentLog
severity: medium
applies_when:
  - Designing a lighter/simplified call-flow audit log for another project
  - Debugging why a segment transition is missing from the transmitted log
  - Deciding where a new segment-transition write point belongs
  - Adding/removing fields from the log entry shape
related_components:
  - GlobalIntentMatrix (segment engine)
  - GlobalApiFactory (onCallEnd, API transmission)
  - segmentState (runtime variable)
tags:
  - segmentLog
  - call-flow-logging
  - onCallEnd
  - audit-trail
  - reference
---

# segmentLog: mechanics reference

This document describes the generic mechanics of `segmentLog`, the append-only
audit trail that records every segment transition during an IVR call and
transmits it as a structured DTO when the call ends. It is written as a
**reference for designing a lighter equivalent in another project** — customer-
and endpoint-specific details (URLs, routing-ID formats, segment names) are
deliberately omitted.

## 1. What it is

`segmentLog` is not a separate module — it is the `log` array living on the
runtime variable `segmentState`:

```javascript
segmentState = {
  currentSegment: "main",
  log: [], // <-- this array is "segmentLog"
};
```

It is a **chronological, append-only list of segment-transition events** for
the current call. Nothing in the array is ever mutated or removed once
written — the array is only ever pushed to, or wholesale cleared after
successful transmission.

## 2. Entry shape (in-memory, during the call)

Every push adds one object with this exact shape:

```javascript
{
  currentSegment: string,        // segment that just executed
  segmentResult: string,         // e.g. SUCCESS | FAILURE | CONFIG_NOT_FOUND | INTERRUPTED
  nextSegment: string | null,    // where control is going next; null only at call end
  segmentType: string,           // e.g. standard | matrix | intent_detection | termination | error | routing
  params: object,                // full runtime variable snapshot at the moment of transition
  timestamp: string,             // ISO-8601 UTC, captured at write time
}
```

`params` is a snapshot, not a diff — it carries whatever runtime variables
existed at that point (and, when available, captured speech). It is kept as
a live object during the call and only serialized (`JSON.stringify`) at
finalization time, not at write time.

## 3. Write points — when an entry is appended

There is no single "log this transition" call; writes are embedded directly
in the segment engine at the four places a transition can conclude:

| #   | Trigger                                                                       | Where                                                                              | `nextSegment` value                      |
| --- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- |
| A   | Normal segment-to-segment transition                                          | segment engine's result-applier, on every transition that is **not** a termination | the resolved next segment code           |
| B   | Target segment's config could not be found (error path)                       | segment engine's `process()`, error-handling branch                                | the configured error/fallback segment    |
| C   | A transition attempt fails and the caller is kept on the same segment (retry) | segment engine's failure handler                                                   | the _current_ segment (i.e. no movement) |
| D   | Call terminates                                                               | `onCallEnd()` in the API/finalization layer                                        | always `null`                            |

Key design point: **A is explicitly skipped when the transition is a
termination** — the engine defers that final write to `onCallEnd` (point D)
so the terminal entry can carry call-end-specific fields (see §4) instead of
being written twice.

This gives one entry per "hop" through the call graph, plus exactly one
terminal entry, in strict chronological order — the array as a whole is a
step-by-step trace of the call's path through the segment graph.

## 4. Finalization at `onCallEnd`

`onCallEnd()` is the single place where the log stops growing and gets
converted into a transmittable artifact. It runs in three phases:

### Phase 1 — append the terminal entry

- Determines whether the disconnect was **local** (planned termination reached
  normally) or **remote** (caller hung up / unexpected disconnect) and records
  that as a `callState` field inside `params`.
- Attaches any captured speech to `params.speech` if available.
- Pushes the final log entry with `nextSegment: null`.
- Is idempotent by design: a guard flag (e.g. `_onCallEndDone`) prevents this
  phase from running twice for the same call, and an explicit `redirect`
  condition can skip finalization entirely when the call is being handed off
  rather than ended.

### Phase 2 — build the transmission DTO

A dedicated builder function (`createSegmentLogBody`-equivalent) walks the
full `log` array **in order** and, for each entry, produces an outbound
record shaped for the API:

```javascript
{
  segmentName: entry.currentSegment,      // renamed on the way out
  segmentResult: entry.segmentResult,
  nextSegment: entry.nextSegment,
  segmentObj: JSON.stringify(entry.params), // params only serialized here
  segmentType: entry.segmentType,
  startTimestamp: <computed>,
  endTimestamp: <computed>,
}
```

The interesting derived-field logic is **timestamp interpolation**:

- An entry's own `timestamp` becomes its `endTimestamp`.
- Its `startTimestamp` is taken from the _previous_ entry's `endTimestamp` —
  i.e. segment N's start is defined as segment N-1's end.
- The very first entry's `startTimestamp` falls back to the call's recorded
  start time (or, failing that, its own timestamp) since there is no
  "previous" entry to borrow from.

This means the log doesn't need to record durations explicitly — durations
are reconstructed after the fact from a chain of point-in-time timestamps.
This is robust to a missing timestamp on any single entry, since the builder
defensively falls back to "now" if one is absent.

The builder wraps everything in a call-level envelope (call/session identifiers
plus the `segments` array) and returns a uniform `{ success | skipped | error,
data }` result, logging entry/exit and any exceptional condition.

### Phase 3 — transmit and clear

- The DTO is POSTed to a backend logging endpoint with a bounded timeout.
- **Only on a successful (2xx) response** is `segmentState.log` reset to `[]`.
- If transmission fails, the log is deliberately left intact so a retry (or a
  subsequent call-end path) can attempt to send it again — the log is never
  cleared speculatively.
- The finalized/cleared state is written back to the global `segmentState`
  variable so downstream code sees the post-transmission state.
- Transmission can be disabled entirely via a feature flag on the runtime
  variables, in which case the log simply accumulates and is dropped with the
  call (no transmission, no clear-on-success path taken).

## 5. Properties worth carrying into a lighter design

- **Write discipline**: exactly one push per transition outcome, at the point
  the outcome is known — never batch-computed after the fact. This is what
  keeps the array a faithful, ordered trace.
- **Deferred terminal write**: don't double-log the last hop; let call-end
  logic own the final entry so it can attach end-of-call-only fields.
- **Snapshot, don't summarize, at write time**: capture the full params object
  live; do the expensive transformation (stringify, rename, derive timestamps)
  once, at finalization, not on every push.
- **Timestamp interpolation instead of stored durations**: cheaper to write,
  and self-healing if an individual timestamp is missing.
- **Clear only on confirmed delivery**: never truncate/reset the log until the
  transmission has succeeded — otherwise a failed POST silently loses the
  call's history.
- **Idempotency guard + skip condition**: call-end logic can legitimately run
  more than once (retries, redirects) — guard against double-finalizing, and
  give yourself an explicit "don't finalize" escape hatch (e.g. hand-off to
  another system) rather than special-casing it inline.

## 6. What a "light" version could drop

Candidates for simplification, since they're finalization/API concerns, not
core mechanics:

- The timestamp-interpolation step (accept slightly less precise timing, or
  just store a duration directly at write time instead of only endTimestamp).
- The full `params` snapshot per entry — a light version could log a small
  fixed set of fields instead of the whole runtime variable bag.
- Remote HTTP transmission — a light version might just keep the log in
  memory/local storage for the life of the call and expose it for inline
  inspection, skipping the POST/clear-on-success dance entirely.

What should probably be kept even in a light version: the append-only
discipline, the deferred terminal write at call-end, and clearing (if you
clear at all) only after you're sure the data is durably captured elsewhere.
