# Deploying `rtds-vocalls-component-gen`

Self-contained skill: conventions, examples, runtime snapshots, patterns, scripts.

## Install

Copy `rtds-vocalls-component-gen/` to `.claude/skills/` (project or `~/.claude/skills/`).
Restart the agent session.

## Refresh from vocalls-rtds (maintainers)

From repo root:

```bash
SKILL=.claude/skills/rtds-vocalls-component-gen
cp -r conventions PROJECT_CONVENTIONS.md "$SKILL/"
cp rtds/components/{sendSms,sendMail,voicemaildetector}.js "$SKILL/references/examples/"
cp projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js "$SKILL/references/"
cp projects/rtds-runtime/globalLibraries/active/rtds_{3_vocallsEnv,1_globalConfig}.js "$SKILL/references/"
python "$SKILL/scripts/bundle_paths.py"
```

`operation_bodies/`, `checklist.md`, `node_types.md`, and `primitive_examples.md` are now maintained here directly — this skill is their canonical home. (They were originally seeded from the deprecated `vocalls-component-builder` skill.)

## Package zip

```bash
cd .claude/skills && zip -r rtds-vocalls-component-gen.zip rtds-vocalls-component-gen -x '*/dist/*'
```
