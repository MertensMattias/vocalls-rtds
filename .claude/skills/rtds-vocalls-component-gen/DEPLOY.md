# Deploying `rtds-vocalls-component-gen`

Self-contained skill: conventions, examples, runtime snapshots, patterns, scripts.

## Install

Copy `rtds-vocalls-component-gen/` to `.claude/skills/` (project or `~/.claude/skills/`).
Restart the agent session.

## Refresh from vocalls-rtds (maintainers)

The bundled copies (`conventions/`, `PROJECT_CONVENTIONS.md`, `references/examples/`,
and the `references/rtds_*.js` runtime snapshots) are **generated**. Do not hand-edit
them — edit the repo source and regenerate. From the repo root:

```bash
python scripts/build_skill_bundle.py
```

This copies the repo sources, applies the path rewrites in `scripts/bundle_paths.py`,
and stamps a generated-file banner on each bundled markdown copy. It is idempotent.

`scripts/check_skill_sync.py` (run by `npm run check` and the pre-commit hook) fails if
a committed bundled copy differs from what the generator would produce, so drift cannot
land silently.

`operation_bodies/`, `checklist.md`, `node_types.md`, `primitive_examples.md`,
`canonical_helpers.js`, and `runtime_pointer.md` are maintained **here** directly — this
skill is their canonical home, and the generator does not touch them.

## Package zip

```bash
cd .claude/skills && zip -r rtds-vocalls-component-gen.zip rtds-vocalls-component-gen -x '*/dist/*'
```
