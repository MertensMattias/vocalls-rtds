# `rtds/` — RTDS design, reference & docs

Durable, committed design artifacts for the RTDS runtime. The **runnable** runtime (global
libraries, call scripts, tests) lives separately under
[`projects/rtds-runtime/`](../projects/rtds-runtime/); this tree holds everything that
describes, specifies, or seeds it.

## Layout

| Path | Contents |
| ---- | -------- |
| [`docs/`](docs/) | [runtime-architecture.md](docs/runtime-architecture.md) (how the runtime is wired), [operations-catalog.md](docs/operations-catalog.md) (per-operation inventory), [runtime-spec.md](docs/runtime-spec.md) (field-level contract), [logging-design.md](docs/logging-design.md). |
| [`specs/`](specs/) | One `*.spec.md` per operation — business intent, inputs, outputs, branches. Each header links its source handler and target component. |
| [`components/`](components/) | Vocalls Designer mxGraph component exports (`*.js`). |
| [`pureconnect_handlers/`](pureconnect_handlers/) | Source PureConnect Interaction Designer handler XML (read-only reference). |
| [`api_swagger/`](api_swagger/) | Swagger/OpenAPI definitions for the RTDS-facing HTTP APIs. |
| [`db_seed/`](db_seed/) | SQL seeds: operation dictionary + per-sourceId flow inserts. |
| [`samples/`](samples/) | Sample payloads (e.g. `DA-HELPDESK.json`). |

## Start here

- New to the runtime? Read [docs/runtime-architecture.md](docs/runtime-architecture.md).
- Looking for a specific operation's status/links? See
  [docs/operations-catalog.md](docs/operations-catalog.md).
- Coding rules (storage, logging, casing, ES5.1) live in
  [PROJECT_CONVENTIONS.md](../PROJECT_CONVENTIONS.md), not here.
