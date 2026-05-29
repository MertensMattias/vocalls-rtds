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
cp rtds_vocalls_operations/components/{sendSms,sendMail,voicemaildetector}.js "$SKILL/references/examples/"
cp projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js "$SKILL/references/"
cp projects/rtds-runtime/globalLibraries/active/rtds_{3_vocallsEnv,1_globalConfig}.js "$SKILL/references/"
python "$SKILL/scripts/bundle_paths.py"
```

Re-copy `operation_bodies/`, `checklist.md`, etc. from `vocalls-component-builder` when those change.

## Package zip

```bash
cd .claude/skills && zip -r rtds-vocalls-component-gen.zip rtds-vocalls-component-gen -x '*/dist/*'
```
