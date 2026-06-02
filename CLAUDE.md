# CLAUDE.md

Vocalls **development environment** repo (simulate / validate / export). Not the LLM build pipeline.

## Commands

| Command | Purpose |
| ------- | ------- |
| `npm run init` | Scaffold `projects/<name>/` from `templates/` |
| `npm run switch -- <name>` | Set `activeProject` in `env.config.json` |
| `npm run simulate` | Local IVR simulator (`cli/simulate.js` + `core/loader.js`) |
| `npm run validate` | ES5.1 + CONFIG checks (`core/configValidator.js`) |
| `npm run export` | Production bundle |
| `npm run delete -- <name>` | Remove a project |

## Key paths

### Tooling
- `core/loader.js` — script load order, `env.config.json` resolution
- `core/minimalVocallsCore.js` — sandbox / ES5.1 constraints
- `vocalls_session_init/vocallsContext.js` — session seed for simulate and project tests
- `templates/` — copied by `npm run init`
- `.claude/skills/rtds-vocalls-component-gen/` — skill for generating Vocalls Designer components

### `projects/rtds-runtime/` — the committed reference runtime (runnable)
- `globalLibraries/active/` — `rtds_3_vocallsEnv.js` (env / Logger / helpers), `rtds_2_runtime.js` (dispatch engine), `rtds_1_globalConfig.js` (`varObj` schema). Load order 3 → 2 → 1.
- `callScript_init/` — `globalCode.js`, `globalVariables.js`
- `callScripts/` — `main.js`, `main_sourceCode.js`, guard JSON flows
- `tests/` — Jest (`main.test.js`)
- `exported_callscripts/` — export staging

Other `projects/<name>/` dirs (e.g. `demo`, or anything from `npm run init`) are local workspaces; `projects/*/.vocalls/` is gitignored. `projects/rtds-runtime/` is the exception: it is the committed reference runtime, and `env.config.json` points the active project at its subpaths.

### `rtds/` — durable RTDS design, reference & docs
- `rtds/docs/runtime-architecture.md` — how the runtime is wired (**start here**)
- `rtds/docs/operations-catalog.md` — per-operation inventory (pattern / component / runtime / seed status)
- `rtds/docs/runtime-spec.md` — field-level contract (Params, endpoints, exit keys); `rtds/docs/logging-design.md`
- `rtds/specs/` — one `*.spec.md` per operation (source handler + target component in each header)
- `rtds/components/` — Vocalls Designer mxGraph component exports (`*.js`)
- `rtds/pureconnect_handlers/` — source PureConnect Interaction Designer handler XML (read-only reference)
- `rtds/api_swagger/` — Swagger/OpenAPI for the RTDS HTTP APIs; `rtds/db_seed/` — dictionary + flow SQL; `rtds/samples/` — sample payloads
- `rtds/README.md` — index of the above

## What to update when you change X

Keep these in lockstep so docs, specs, runtime, and seeds never drift:

- **Change a component (`rtds/components/X.js`)** → update its spec `rtds/specs/X.spec.md`, the row in `rtds/docs/operations-catalog.md`, the runtime twin in `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` if one exists (`executeXxx` — keep payload + branch contract aligned, see [conventions/lockstep.md](conventions/lockstep.md)), the `rtds/db_seed/` SQL if Params changed, and the skill example if X is canonical (`sendSms` / `sendMail` / `voicemaildetector`).
- **Change the runtime engine (`globalLibraries/active/rtds_*.js`)** → update `rtds/docs/runtime-architecture.md`, `rtds/docs/runtime-spec.md`, the affected `conventions/*.md`, and resync the skill's bundled runtime snapshot via [.claude/skills/rtds-vocalls-component-gen/DEPLOY.md](.claude/skills/rtds-vocalls-component-gen/DEPLOY.md) + `scripts/bundle_paths.py`.
- **Add a new operation** → add the spec (`rtds/specs/`), the component (`rtds/components/`), seed dictionary/instance SQL (`rtds/db_seed/`), and a catalog row (`rtds/docs/operations-catalog.md`).
- **Change a convention** → edit `PROJECT_CONVENTIONS.md` (bump its version line) and sync the skill bundle via the skill's `DEPLOY.md`.

## Conventions

[**PROJECT_CONVENTIONS.md**](PROJECT_CONVENTIONS.md) is the source of truth. Detailed rules live in [`conventions/`](conventions/). Read PROJECT_CONVENTIONS.md end-to-end (it's a short routing doc); load a specific `conventions/<topic>.md` only when the task needs it.

### The five rules every file must satisfy

1. **Storage** — call-scoped user data goes on `varObj`. New runtime globals carry the `_rt*` prefix. See [conventions/storage.md](conventions/storage.md).
2. **Logging** — always `Logger.{debug,info,warn,error,API}` with structured context. Never bare `log_*` outside the Logger implementation. See [conventions/logging.md](conventions/logging.md).
3. **Casing** — routing-table envelope keys are camelCase exact-match (`op.id`, `op.params`); Param names are PascalCase by convention but read case-insensitively via `getValue` / `getParam` / `hasKey`. See [conventions/casing.md](conventions/casing.md).
4. **Reads** — operator data via `getScoped(key, default)` (varObj → global → default). Bare `global[key]` reads for user data are wrong. See [conventions/storage.md](conventions/storage.md).
5. **ES5.1** — no `let`/`const`/arrow/async/spread/destructuring/string-eval. Template literals allowed. See [conventions/es5.md](conventions/es5.md).

### Other rules

- Minimum change scope; match existing ES5-style patterns in call scripts.
- `projects/*/.vocalls/` is gitignored (local state only).
- When the conventions doc and a file in the repo disagree, **one of them is wrong** — flag it and resolve it before continuing.

[**AGENTS.md**](AGENTS.md) is the cross-vendor sibling of this file with identical content.
