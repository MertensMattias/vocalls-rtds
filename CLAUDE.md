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
- `globalLibraries/active/` — `rtds_3_vocallsEnv.js` (env / Logger / helpers), `rtds_2_runtime.js` (dispatch engine: `runStep`, three entry points — `fetchAndStart` / `resumeFrom` / `finalizeFrom`, the last for end-of-call execution completion via the `onCallResult` callback and `RTDS_finalizing` mode), `rtds_1_globalConfig.js` (`varObj` schema). Load order 3 → 2 → 1.
- `callScript_init/` — `globalCode.js`, `globalVariables.js`
- `callScripts/` — `main.js` (runnable callscript) and `main_sourceCode.js` (the Vocalls Designer mxGraph twin; master-layer `Code`/`Variables` live here)
- `tests/` — Jest: `main.test.js` (smoke), `finalize.test.js` (end-of-call execution completion), `flowSimulator.smoke.test.js` / `flowSimHttp.test.js` (flow simulator), and `components/` contract tests (`sendSms.test.js`, `setupConfig.test.js`)

Other `projects/<name>/` dirs (e.g. `demo`, or anything from `npm run init`) are local workspaces; `projects/*/.vocalls/` is gitignored. `projects/rtds-runtime/` is the exception: it is the committed reference runtime, and `env.config.json` points the active project at its subpaths.

### `rtds/` — durable RTDS design, reference & docs
- `rtds/docs/runtime-architecture.md` — how the runtime is wired (**start here**)
- `rtds/docs/operations-catalog.md` — per-operation inventory (pattern / component / runtime / seed status)
- `rtds/docs/runtime-spec.md` — field-level contract (Params, endpoints, exit keys); `rtds/docs/logging-design.md`
- `rtds/specs/` — one `*.spec.md` per operation **that has a component** in `rtds/components/` (source handler + target component in each header). Today: `sendSms`, `sendEmail`, `setVariables`, `guardRouting`, `guardTui`, `scheduler`. Operations without a component carry no spec.
- `rtds/components/` — Vocalls Designer mxGraph component exports (`*.js`)
- `rtds/pureconnect_handlers/` — source PureConnect Interaction Designer handler XML (read-only reference)
- `rtds/api_swagger/` — Swagger/OpenAPI for the RTDS HTTP APIs; `rtds/db_seed/` — dictionary + flow SQL; `rtds/samples/` — sample payloads
- `rtds/README.md` — index of the above

## What to update when you change X

Keep these in lockstep so docs, specs, runtime, and seeds never drift. **`npm run check`** (and the pre-commit hook) enforces the mechanical parts — run it before committing.

Several artifacts are now **generated** — edit the source, then regenerate; never hand-edit the output:

| Generated output | Source | Regenerate with |
| ---------------- | ------ | --------------- |
| `rtds/docs/operations-catalog.md` | `catalog:` frontmatter in each `rtds/specs/*.spec.md` | `npm run gen:catalog` |
| `AGENTS.md` | `CLAUDE.md` | `npm run gen:agents` |
| skill bundle (`.claude/skills/rtds-vocalls-component-gen/conventions/`, `PROJECT_CONVENTIONS.md`, `references/examples/`, `references/rtds_*.js`) | repo `conventions/`, `PROJECT_CONVENTIONS.md`, `rtds/components/`, runtime libs | `npm run build:skill` |

- **Change a component (`rtds/components/X.js`)** → update its spec `rtds/specs/X.spec.md` (incl. `status:` / `catalog:` frontmatter), the runtime twin in `projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js` if one exists (`executeXxx` — keep payload + branch contract aligned, see [conventions/lockstep.md](conventions/lockstep.md)), the `rtds/db_seed/` SQL if Params changed; then `npm run gen:catalog` and `npm run build:skill` if X is canonical (`sendSms` / `sendMail` / `voicemaildetector`). `npm run check:lockstep` verifies param-name parity across component/spec/seed.
- **Change the runtime engine (`globalLibraries/active/rtds_*.js`)** → update `rtds/docs/runtime-architecture.md`, `rtds/docs/runtime-spec.md`, the affected `conventions/*.md`, and `npm run build:skill` to resync the bundled runtime snapshot.
- **Add a new operation** → add the component (`rtds/components/`), its authored spec (`rtds/specs/`, with `catalog:` frontmatter), a `ROW_ORDER` entry in `scripts/gen_catalog.py` (the catalog lists only operations with a component + spec — a new op must be added there or it won't be catalogued), seed dictionary/instance SQL (`rtds/db_seed/`), a component contract test (`projects/rtds-runtime/tests/components/`), then `npm run gen:catalog`.
- **Change a convention** → edit `conventions/<topic>.md` and/or `PROJECT_CONVENTIONS.md` (bump its version line), then `npm run build:skill` to resync the skill bundle.

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
