#!/bin/sh
# Install the tracked git hooks for vocalls-rtds.
#
# Points git at scripts/hooks/ so the tracked pre-commit hook runs. Run once
# per clone from the repo root:
#
#     sh scripts/hooks/install.sh
set -e

git config core.hooksPath scripts/hooks
chmod +x scripts/hooks/pre-commit 2>/dev/null || true

echo "Installed: core.hooksPath -> scripts/hooks"
echo "pre-commit will run 'npm run check' on every commit."
echo "Bypass once with: git commit --no-verify"
