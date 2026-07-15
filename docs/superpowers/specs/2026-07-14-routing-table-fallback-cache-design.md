# Routing-table fallback cache — design

**Date:** 2026-07-14
**Status:** Implemented (2026-07-14) — `rtds_2_runtime.js` fetchAndStart + helpers, knobs in `callScripts/main.js` (+ Designer twin), tests in `tests/fallbackCache.test.js`
**Pattern:** network-first with Storage fallback (API stays source of truth)
**Supersedes:** `2026-06-01-routing-table-config-cache-design.md` (stale-while-revalidate)

## Problem

`fetchAndStart(sourceId)` (Entry A, `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js`)
issues a blocking `GET` to the RTDS routing-table API with a 10 s timeout. Every
failure path — timeout, network rejection, non-200, parse error — disconnects the
caller. A single API outage or slowdown drops every inbound call, even though the
routing table for a given `sourceId` rarely changes between calls.

## Goal

**Resilience.** The API remains the source of truth on every healthy call. When the
awaited fetch fails transiently, serve the last known-good config for that `sourceId`
from `Storage` instead of disconnecting. After every successful fetch, persist a copy.

This deliberately replaces the earlier stale-while-revalidate design: SWR served
cached (possibly stale) config while the API was healthy, and depended on a
fire-and-forget background refresh that production may never complete. Here every
cache write happens on an awaited path, so the cache cannot freeze, and callers get
fresh config whenever the API answers.

## Key constraints (verified in-repo)

- **Vocalls promise contract** — `jsonHttpRequest(url, opts, headers)` returns a
  thenable with `.withTimeout(ms)`; timeout **rejects** the promise. All handling is
  `.then(onOk, onErr)` — `.catch()` is unsupported (`core/minimalVocallsCore.js:501`
  validator rule). On fulfilment the result is `{ success, statusCode, response }`
  (envelope may arrive as a string and need `JSON.parse`).
- **ES5.1 only** — `var` / `function`, no `let`/`const`/arrow/async. Template
  literals allowed.
- **`Storage` shape drift (open item)** — production `Storage.readFile` returns the
  raw string (or falsy); the simulator (`core/minimalVocallsCore.js:120`) returns
  `{ success, text, error }`. The cache-read helper MUST tolerate both shapes until
  the simulator is reconciled with the platform:
  `var raw = (res && typeof res === 'object' && 'text' in res) ? res.text : res;`
- **Globals convention** (`conventions/storage.md`) — new runtime-owned globals carry
  the `_rt` prefix; config knobs are set in `callScripts/main.js` (and its Designer
  twin `main_sourceCode.js` — keep in lockstep).

## Scope

`fetchAndStart(sourceId)` plus three small file-local helpers in `rtds_2_runtime.js`.
No component changes. No change to `runStep` / `parseFlow` / `_devBody` semantics.

## Design

### 1. Failure classification

Every fetch outcome falls into exactly one bucket:

| Outcome | Classification | Action |
| ------- | -------------- | ------ |
| `success === true && statusCode === 200`, body parses, `parseFlow` finds entry op | success | write cache, `runStep` |
| `statusCode` 4xx | **authoritative** failure | `RTDS_error`, `'disconnect'` — never serve cache (the API is telling us this sourceId has no flow; stale config would resurrect it) |
| promise rejection (timeout, DNS, connection), 5xx, envelope/body parse failure | **transient** failure | fallback path (§3) |
| body parses but `parseFlow` finds no entry op | config invalid | `RTDS_error`, `'disconnect'`, **no cache write** (never persist a config the runtime could not start) |

### 2. Storage layout

One file per `sourceId`; full replacement on every write (last-write-wins, no locking).

- **Key:** `rtdsConfig_<sanitized>.json` where `sanitized` = `sourceId` with every
  character outside `[A-Za-z0-9_+-]` replaced by `_` (sourceIds are phone-shaped,
  e.g. `+3233389999`).
- **Value:** `{ "sourceId": "<raw>", "fetchedAt": <epoch ms>, "config": <parsed routing-table JSON> }`.
  `fetchedAt` enables the staleness cap and answers "which config did that call run on?".
- Every `Storage` read/write and every `JSON.parse` of cached content is wrapped in
  `try/catch`; any error is a cache miss (read) or a logged no-op (write). A corrupt
  or missing file never affects a live call.

### 3. Control flow

```
fetchAndStart(sourceId):
  !sourceId          -> RTDS_error, 'disconnect'                      (unchanged)
  _devBody present   -> dev path, no Storage involvement              (unchanged)

  attempt 1: GET .withTimeout(_rtFetchTimeoutMs)          # 2000 ms
    success          -> writeConfigCache(sourceId, body)   (best-effort try/catch)
                        RTDS_configSource = 'api'
                        runStep(firstOp.id)
    authoritative    -> RTDS_error, 'disconnect'
    transient        -> cached = readConfigCache(sourceId)
        cache hit (fresh enough, parseFlow finds entry op):
                        Logger.warn('[RTDS] serving config from cache',
                                    { sourceId, ageMs, error })
                        RTDS_configSource = 'cache'
                        runStep(firstOp.id)
        cache miss:
                        attempt 2: GET .withTimeout(_rtFetchRetryTimeoutMs)  # 10000 ms
                          success -> same success path (incl. cache write)
                          any failure -> RTDS_error, 'disconnect'    (today's behavior)
```

The retry protects cold sourceIds: without it, tightening 10 s → 2 s would drop
calls that succeed today whenever API latency exceeds 2 s and no cache exists yet.
Cache-warm calls get the fast 2 s bound; cache-cold calls keep today's tolerance.

A cached entry older than `_rtConfigCacheMaxAgeMs` is treated as a miss (falls
through to attempt 2). Rationale: during a long outage, running a weeks-old config
for a possibly-decommissioned flow is worse than disconnecting.

### 4. Helpers (file-local, `rtds_2_runtime.js`)

To avoid duplicating the ~40-line envelope/status/parse block across two attempts,
extract one request helper that **never rejects** — it maps every outcome to a plain
object, so `fetchAndStart` composes with simple `.then(function(r){...})` chains:

- `requestRoutingTable(url, timeoutMs)` → thenable resolving to
  `{ ok: true, body }` | `{ ok: false, authoritative: true, code }` |
  `{ ok: false, authoritative: false, code }`. Rejections are converted in its own
  `onErr` arm; `code` is the existing `RTDS_error` value for that failure.
- `configCacheKey(sourceId)` → sanitized Storage filename (§2).
- `readConfigCache(sourceId)` → parsed `{sourceId, fetchedAt, config}` or `null`
  (tolerant of both `Storage.readFile` shapes; `try/catch` → `null`).
- `writeConfigCache(sourceId, body)` → best-effort write, `try/catch`, logs on failure.

`fetchAndStart` itself stays the single orchestration point; no new entry points.

### 5. Config knobs (`_rt*` globals, set in `callScripts/main.js` + Designer twin)

| Global | Default | Meaning |
| ------ | ------- | ------- |
| `_rtFetchTimeoutMs` | `2000` | timeout for attempt 1 |
| `_rtFetchRetryTimeoutMs` | `10000` | timeout for the cache-miss retry (today's value) |
| `_rtConfigCacheEnabled` | `true` | kill switch; `false` = no Storage reads/writes, single GET with `_rtFetchRetryTimeoutMs` — exactly today's behavior |
| `_rtConfigCacheMaxAgeMs` | `604800000` (7 days) | cached entries older than this are treated as a miss |

All read via the existing `typeof X !== 'undefined'` guard pattern with the defaults
above, so the runtime works even if the config layer omits them.

### 6. Interaction with segmentLog (worktree `feat+rtds-segmentlog`)

The segmentLog branch adds `recordSegment(op)` inside `runStep` and a `SegmentLog`
onCallEnd finaliser whose terminal classifier stamps the last segment as `'error'`
whenever `context.session.variables.RTDS_error` is truthy. Two consequences:

- **`RTDS_error` may only be set on paths that actually return `'disconnect'`.**
  Today every write in `fetchAndStart` is immediately followed by the disconnect
  return; this design must preserve that invariant. In particular, an attempt-1
  transient failure that is then served from cache must NOT set `RTDS_error` —
  doing so would misclassify a healthy cache-served call as `'error'` at teardown.
  This is why `requestRoutingTable` (§4) returns the error `code` in its result
  object instead of writing the session variable itself; only the final disconnect
  arm writes `RTDS_error`.
- No structural conflict: segmentLog touches `runStep` and the executor bodies;
  this design touches `fetchAndStart` and adds file-local helpers. Segments only
  begin at the first `runStep` hop, so the fetch/fallback phase is never itself a
  segment, and a disconnect before any hop leaves `_segmentLog` empty (SegmentLog
  skips cleanly).

### 7. Observability

- `context.session.variables.RTDS_configSource = 'api' | 'cache'` — set on every
  successful start, for reporting and troubleshooting.
- One uniform `[RTDS] routing table resolved` log line fires exactly once per call
  at the point the config is committed, with a `source` field saying how the
  sourceId was resolved: `api` (attempt 1 or kill-switch GET), `api-retry` (patient
  second attempt after a cache miss), `cache` (Storage fallback; logged at `warn`
  level with `ageMs` + the triggering `apiError`, since a cache serve means the API
  just failed), or `devBody` (dev fixture, no network). Cache write failure is a
  `Logger.warn`, never fatal.

## Testing

Extend `projects/rtds-runtime/tests/main.test.js` (already stubs `jsonHttpRequest`
with a `withTimeout` shim and uses the in-memory `Storage`):

1. **Cold success** — API ok → cache written, flow starts, `RTDS_configSource='api'`.
2. **Transient failure, warm cache** — rejection/5xx → serves cache, no disconnect,
   `RTDS_configSource='cache'`, no second request.
3. **Transient failure, no cache** — retry fires with the longer timeout; retry
   success starts flow and writes cache; retry failure sets `RTDS_error` and
   returns `'disconnect'`.
4. **4xx** — disconnects immediately even with a warm cache; no retry.
5. **Corrupt cache file** — malformed JSON in Storage → treated as miss → retry path.
6. **Stale cache (older than max-age)** — treated as miss → retry path.
7. **Invalid fetched config** (no entry op) — disconnects, cache NOT written.
8. **Kill switch off** — Storage never touched; single GET at 10 s; today's behavior.
9. **Storage shape tolerance** — cache read works with both raw-string and
   `{success, text}` `readFile` results.

## Rollout / lockstep

Runtime-engine change, so per CLAUDE.md: update `rtds/docs/runtime-architecture.md`
(Entry A section) and `rtds/docs/runtime-spec.md` (new `_rt*` knobs,
`RTDS_configSource`), then `npm run build:skill` to resync the bundled runtime
snapshot. Mark the 2026-06-01 spec superseded (done in its header).

## Out of scope / YAGNI

- Background refresh / stale-while-revalidate (superseded design).
- Cross-sourceId index file, cache eviction, file locking (last-write-wins is fine).
- Caching any fetch other than Entry A. `resumeFrom` / `finalizeFrom` are unchanged.
- Retry backoff or more than one retry — one slow attempt + one patient attempt is
  the whole budget; beyond that the caller is better served by disconnect handling.
