#!/usr/bin/env python3
"""Rewrite repo-external paths to skill-local paths (portable bundle)."""

from pathlib import Path

SKILL = Path(__file__).resolve().parents[1]

REPLACEMENTS = [
    # conventions hops (longest first)
    ("../../../../../conventions/", "../../conventions/"),
    ("../../../../conventions/", "../conventions/"),
    ("../../../conventions/", "conventions/"),
    ("../../conventions/", "../conventions/"),
    # PROJECT_CONVENTIONS
    ("../../../../PROJECT_CONVENTIONS.md", "../PROJECT_CONVENTIONS.md"),
    ("../../../PROJECT_CONVENTIONS.md", "PROJECT_CONVENTIONS.md"),
    # Runtime snapshots
    (
        "../../../../projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js",
        "rtds_globalCodeAndHelpers.js",
    ),
    (
        "../projects/demo/globalLibraries/active/rtds_globalCodeAndHelpers.js",
        "../references/rtds_globalCodeAndHelpers.js",
    ),
    (
        "../projects/rtds-runtime/globalLibraries/active/rtds_3_vocallsEnv.js",
        "../references/rtds_3_vocallsEnv.js",
    ),
    (
        "../projects/rtds-runtime/globalLibraries/active/rtds_2_runtime.js",
        "../references/rtds_2_runtime.js",
    ),
    (
        "../projects/rtds-runtime/globalLibraries/active/rtds_1_globalConfig.js",
        "../references/rtds_1_globalConfig.js",
    ),
    # Component examples
    ("../../../../rtds/components/", "examples/"),
    ("../../../rtds/components/", "references/examples/"),
    ("../rtds/components/", "../references/examples/"),
    # Skill-internal cross-refs
    (
        "../.claude/skills/rtds-vocalls-component-gen/references/",
        "../references/",
    ),
    (
        "../.claude/skills/rtds-vocalls-component-gen/scripts/",
        "../scripts/",
    ),
]

TEXT = {".md", ".js", ".xml", ".py"}


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    if text != orig:
        path.write_text(text, encoding="utf-8", newline="\n")
        return True
    return False


def main() -> None:
    n = 0
    for path in SKILL.rglob("*"):
        if path.is_file() and path.suffix in TEXT and path.name != "bundle_paths.py":
            if patch_file(path):
                n += 1
                print(path.relative_to(SKILL))
    print(f"Patched {n} files")


if __name__ == "__main__":
    main()
