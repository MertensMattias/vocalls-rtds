# Routing-table config cache — design

**Date:** 2026-06-01
**Status:** Superseded by `2026-07-14-routing-table-fallback-cache-design.md` — the
network-first fallback design avoids this spec's fire-and-forget caveat entirely
(every cache write happens on an awaited path) and keeps the API authoritative on
every healthy call.
**Pattern:** serve-cache-first / stale-while-revalidate, with a max-age safety net

## Problem

`fetchAndStart(sourceId)` (Entry A, `projects/rtds-runtime-development/globalLibraries/active/rtds_2_runtime.js`)
issues a blocking `GET` to the RTDS routing-table API on **every** call to fetch the
full JSON config for a `sourceId`, then `parseFlow` + `runStep`. We want to avoid
blocking the caller on that round-trip when we already hold a recent copy of the
config.

## Goal

**Latency.** When a recent cached config exists for the `sourceId`, start the call on
the cached config immediately and refresh the stored copy in the background
(fire-and-forget). When no recent cache exists, await the API as today. The API
remains the source of truth; the cache only front-runs it.

This is explicitly *not* a load-reduction design: a cache hit still fires one
(non-blocking) API request to refresh. The win is that the caller is not blocked.

## Key constraints (verified in-repo)

- **`Storage` is available** — `core/minimalVocallsCore.js:120` exposes
  `Storage.readFile(path)` / `Storage.writeFile(path, text)`. In-memory in the
  simulator (`memoryStorage`), real file-backed in production.
- **`.catch()` is unsupported** (`core/minimalVocallsCore.js:502`) — all promise
  handling uses `.then(onOk, onErr)`.
- **ES5.1 only** — no `let`/`const`/arrow/async/spread/destructuring. Matches the
  surrounding runtime code.
- **Globals convention** (`conventions/storage.md`) — new runtime-owned globals carry
  the `_rt` prefix.

### Fire-and-forget caveat (the reason max-age exists)

In the simulator a detached `.then` runs as a microtask, so the background refresh
write lands. In **production** there is no guarantee the call leg stays alive long
enough for the detached HTTP completion to write Storage. If it never lands, then
after the first cache write the config could freeze: every later call hits the cache,
fires-and-forgets a refresh that never completes, and the cache is never rewritten.

The **max-age cap** neutralizes this: once a cached entry is older than
`_rtConfigCacheMaxAgeMs`, it is treated as a miss and the API is **awaited** (which
definitely writes). This bounds staleness and guarantees the cache cannot freeze,
regardless of production async behavior.

## Scope

Wrap exactly one function: `fetchAndStart(sourceId)`. No component changes. No change
to `runStep` / `parseFlow` semantics.

## Design

### 1. Keep `fetchAndStart` monolithic

`fetchAndStart` stays a single function. The caching logic is added **inline**; the
existing network call, `JSON.parse`, `parseFlow` and `runStep` tail stay in place
exactly as today. The only extracted helper is a pure string sanitizer:

- `configCacheKey(sourceId)` → the Storage filename (see §2 sanitization).

Storage read and write happen **inline** inside `fetchAndStart` (each wrapped in
`try/catch`). The existing `jsonHttpRequest` GET → success check → `JSON.parse` block
appears in two inline arms — the fire-and-forget refresh and the awaited path — which
is the accepted cost of keeping the function monolithic; the duplication is a few
lines and both arms share the same success/parse shape.

### 2. Storage layout

One file per `sourceId` — no read-modify-write contention between concurrent calls.

- **Key:** `rtdsConfig_<sanitizedSourceId>.json`, where `sanitizedSourceId` replaces
  any character outside `[A-Za-z0-9_+-]` with `_` (sourceIds are phone-shaped, e.g.
  `+3233389999`).
- **Value:** `{ "sourceId": "<raw>", "fetchedAt": <epoch ms>, "config": <parsed routing-table JSON> }`.
- Every read/write is wrapped in `try/catch`. Any read error or `JSON.parse` failure
  is treated as a **cache miss** — a corrupt file never breaks a live call.

### 3. Control flow

All steps below are **inline** inside the single `fetchAndStart` function. "GET+parse"
denotes the existing `jsonHttpRequest(url, {method:'GET'}, _headers).then(...)` block
with its success check and `JSON.parse(body)`; "write cache" denotes an inline
`Storage.writeFile(configCacheKey(sourceId), JSON.stringify({sourceId, fetchedAt:now, config}))`
wrapped in `try/catch`.

```
fetchAndStart(sourceId):
  if !sourceId:               -> set RTDS_error, return 'disconnect'   (unchanged)
  if !_rtConfigCacheEnabled:  -> GET+parse.then(write cache + parseFlow/runStep, onError)   (today's path + write)

  cached = inline Storage.readFile(configCacheKey(sourceId)) -> {sourceId,fetchedAt,config} | null   (try/catch -> null)
  fresh  = cached && (now - cached.fetchedAt) <= _rtConfigCacheMaxAgeMs

  if fresh:
      # serve cache now; refresh in background (NOT returned/awaited)
      GET+parse.then(
          function(c){ write cache },
          function(e){ log_warn('[RTDS] cache refresh failed', e) })
      return parseFlow(cached.config) -> runStep(firstOp)

  # miss OR stale -> await
  return GET+parse.then(
      function(c){ write cache; return parseFlow(c) -> runStep(firstOp) },
      onError)
```

### 4. Error handling on the await path (option B)

`onError` (await path API/parse failure):

- If a cached entry exists (even one older than max-age): log a warn and
  **serve the stale cache** — `return parseFlow(cached.config) -> runStep(firstOp)`.
  Better to run a live caller on stale config than to drop the call during an API
  outage.
- If there is **no** cache at all: preserve current behavior — set
  `context.session.variables.RTDS_error` and `return 'disconnect'`.

### 5. Config knobs (`_rt*` globals)

- `_rtConfigCacheMaxAgeMs` — default `7200000` (120 min). Set in the env/config layer
  so it is tunable per environment.
- `_rtConfigCacheEnabled` — default `true`. When `false`, `fetchAndStart` behaves
  exactly as today (no Storage reads or writes) — a clean kill-switch.

## Testing

Extend `projects/rtds-runtime-development/tests/main.test.js` (already stubs
`jsonHttpRequest` and uses the in-memory `Storage`):

1. **Cold miss** — empty cache → awaits API, writes cache, starts flow.
2. **Warm hit (within max-age)** — serves cached config, does **not** await, and the
   fire-and-forget refresh write lands (assert post-microtask).
3. **Stale hit (older than max-age)** — awaits API, rewrites cache.
4. **Corrupt cache file** — malformed JSON in Storage → treated as miss → awaits.
5. **Await-path API failure with stale cache present** (option B) → serves stale,
   does not disconnect.
6. **Await-path API failure with no cache** → sets `RTDS_error`, returns
   `'disconnect'`.
7. **`_rtConfigCacheEnabled = false`** → Storage never touched; behaves as today.

## Out of scope / YAGNI

- Cross-sourceId index file (one-file-per-sourceId is simpler and contention-free).
- Refresh throttling / two-threshold (`refreshAfter`) scheme — only worth it if API
  load becomes a concern; the stated goal is latency, not load.
- Caching any fetch other than Entry A (`fetchAndStart`).
