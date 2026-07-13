# vocalls-rtds

Local Vocalls IVR development environment: simulate call scripts, validate CONFIG/ES5.1, and export bundles for the platform. `projects/rtds-runtime/` is the committed reference runtime; `env.config.json` points the active project at it.

## Quick start

```bash
npm install
npm run simulate -- --project rtds-runtime --case 1
npm run validate -- --project rtds-runtime --all
npm run export -- --callScript main --project rtds-runtime
```

## Layout

```
cli/                    simulate, validate, export, switch, delete
core/                   loader, minimalVocallsCore (simulator), configValidator
vocalls_session_init/   session seed + sandbox builder for simulate/tests
projects/rtds-runtime/  committed reference runtime (libs, call scripts, tests)
rtds/                   RTDS design, specs, components, docs, seed, swagger
env.config.json         project registry and active project
```

See `rtds/README.md` for the RTDS reference index (spec, runtime JS, swagger, example call scripts, handler/component XML) and `.claude/skills/rtds-vocalls-component-gen/` for the Vocalls Designer component-generator skill.

## Commands

| Command | Purpose |
| ------- | ------- |
| `npm run switch -- <name>` | Set active project |
| `npm run simulate` | Run call scripts in the local simulator |
| `npm run validate` | ES5.1 + CONFIG validation on `AGENT_*.js` / scripts |
| `npm run export` | Bundle scripts for Vocalls deployment |
| `npm run delete -- <name>` | Remove project from registry and disk |
| `npm test` | Jest — runs `projects/*/tests/` |
| `npm run check` | Consistency gate: skill-sync + lockstep + tests |
| `npm run gen:catalog` / `gen:agents` / `build:skill` | Regenerate the generated artifacts |

## Consistency checks

Several artifacts are generated and drift-checked (see the "What to update when you change X"
table in `CLAUDE.md`): the operations catalog from spec frontmatter, `AGENTS.md` from
`CLAUDE.md`, and the component-generator skill bundle from the repo conventions. `npm run check`
verifies they are in sync, runs the lockstep contract check, and runs the tests.

Install the pre-commit hook once per clone so the gate runs automatically:

```bash
sh scripts/hooks/install.sh
```
