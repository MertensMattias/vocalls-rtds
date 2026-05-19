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

- `core/loader.js` — script load order, `env.config.json` resolution
- `core/minimalVocallsCore.js` — sandbox / ES5.1 constraints
- `vocalls_session_init/vocallsContext.js` — session seed for simulate and project tests
- `templates/` — copied by `npm run init`
- `projects/<name>/` — runtime workspace (not committed by default)
- `references/rtds/` — RTDS spec, runtime JS, swagger, handler/component XML (read-only reference)
- `references/vocalls-component-builder/` — skill for generating Vocalls Designer components

## Conventions

- Minimum change scope; match existing ES5-style patterns in call scripts.
- `projects/*/.vocalls/` is gitignored (local state only).
