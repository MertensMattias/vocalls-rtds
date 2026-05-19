# vocalls-rtds

Local Vocalls IVR development environment: scaffold projects, simulate call scripts, validate CONFIG/ES5.1, and export bundles for the platform.

## Quick start

```bash
npm install
npm run init
npm run simulate -- --project <name> --case 1
npm run validate -- --project <name> --all
npm run export -- --callScript main --project <name>
```

## Layout

```
cli/                    init, simulate, validate, export, switch, delete
core/                   loader, minimalVocallsCore (simulator), configValidator
vocalls_session_init/   session seed + sandbox builder for simulate/tests
templates/              copied into projects/<name>/ by npm run init
projects/<name>/        per-project call scripts (created by init)
references/             read-only reference material (RTDS spec, runtime, XML, skill)
env.config.json         project registry and active project
```

See `references/rtds/README.md` for the RTDS reference index (spec, runtime JS, swagger, example call scripts, handler/component XML) and `references/vocalls-component-builder/` for the Vocalls Designer component-builder skill.

## Commands

| Command | Purpose |
| ------- | ------- |
| `npm run init` | Create `projects/<name>/` from templates |
| `npm run switch -- <name>` | Set active project |
| `npm run simulate` | Run call scripts in the local simulator |
| `npm run validate` | ES5.1 + CONFIG validation on `AGENT_*.js` / scripts |
| `npm run export` | Bundle scripts for Vocalls deployment |
| `npm run delete -- <name>` | Remove project from registry and disk |
| `npm test` | Jest — runs `projects/*/tests/` after init |
