# AGENTS.md

Vocalls **development environment** repo (simulate / validate / export). Not the LLM build pipeline.

This file is the cross-vendor agent-config entry point. [CLAUDE.md](CLAUDE.md) is the Claude-Code-specific sibling with identical content.

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

- `core/loader.js` — script load order, `env.config.json` resolution
- `core/minimalVocallsCore.js` — sandbox / ES5.1 constraints
- `vocalls_session_init/vocallsContext.js` — session seed for simulate and project tests
- `templates/` — copied by `npm run init`
- `projects/<name>/` — runtime workspace (not committed by default)
- `references/rtds/` — RTDS spec, runtime JS, swagger, handler/component XML (read-only reference)
- `.claude/skills/rtds-vocalls-component-gen/` — skill for generating Vocalls Designer components

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
