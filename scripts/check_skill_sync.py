#!/usr/bin/env python3
"""Fail if a generated copy has drifted from its repo source.

Covers:
  - the rtds-vocalls-component-gen skill bundle (conventions, PROJECT_CONVENTIONS,
    component examples, runtime snapshots) — via build_skill_bundle;
  - AGENTS.md generated from CLAUDE.md — via gen_agents_md.

Both checks re-run the generator transform in memory and compare against the
committed copy. A naive byte ``diff`` against the repo source would be wrong —
the bundle applies deliberate path rewrites and a banner — so we compare against
what the generator *would produce*, not against the raw source.

Exit 0 when everything is in sync; exit 1 listing each drifted path otherwise.

Run from the repo root::

    python scripts/check_skill_sync.py
"""

import importlib.util
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SCRIPTS = REPO / "scripts"


def _load(module_name):
    spec = importlib.util.spec_from_file_location(
        module_name, SCRIPTS / f"{module_name}.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    drifted = []

    # 1. Skill bundle — build(write=False) reports which destinations differ.
    build_skill_bundle = _load("build_skill_bundle")
    for dst_rel, changed in build_skill_bundle.build(write=False):
        if changed:
            drifted.append(
                f".claude/skills/rtds-vocalls-component-gen/{dst_rel}"
                "  (run: python scripts/build_skill_bundle.py)"
            )

    # 2. AGENTS.md from CLAUDE.md.
    gen_agents = _load("gen_agents_md")
    want = gen_agents.render()
    have = gen_agents.DEST.read_bytes() if gen_agents.DEST.exists() else None
    if gen_agents._norm(have) != gen_agents._norm(want):
        drifted.append("AGENTS.md  (run: python scripts/gen_agents_md.py)")

    if drifted:
        print("Skill-sync check FAILED — generated copies drifted from source:")
        for d in drifted:
            print("  DRIFTED:", d)
        sys.exit(1)

    print("Skill-sync check passed — all generated copies in sync.")


if __name__ == "__main__":
    main()
