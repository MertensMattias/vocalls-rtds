#!/usr/bin/env python3
"""Generate AGENTS.md from CLAUDE.md (single source of the agent-entry content).

CLAUDE.md is the source. AGENTS.md is its cross-vendor twin and differs only by:
  1. the H1 title (``# CLAUDE.md`` -> ``# AGENTS.md``);
  2. a cross-vendor pointer sentence inserted after the intro line, which the
     Claude-specific source omits;
  3. the footer sibling pointer, which the source carries and the twin drops.

Run from the repo root::

    python scripts/gen_agents_md.py

Idempotent. ``check_skill_sync.py`` fails if the committed AGENTS.md differs from
``render()`` output, so the twin cannot drift from CLAUDE.md.
"""

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SOURCE = REPO / "CLAUDE.md"
DEST = REPO / "AGENTS.md"

# Anchored on stable, unique strings — not line numbers.
INTRO_LINE = (
    "Vocalls **development environment** repo (simulate / validate / export). "
    "Not the LLM build pipeline."
)
CROSS_VENDOR_SENTENCE = (
    "This file is the cross-vendor agent-config entry point. "
    "[CLAUDE.md](CLAUDE.md) is the Claude-Code-specific sibling with identical content."
)
FOOTER_SIBLING_LINE = (
    "[**AGENTS.md**](AGENTS.md) is the cross-vendor sibling of this file "
    "with identical content."
)


def render():
    """Return AGENTS.md content (bytes, LF) derived from CLAUDE.md.

    Newlines are normalized to LF (what git stores). The repo uses
    core.autocrlf=true with no .gitattributes, so preserving working-tree CRLF
    would make the generator output and the sync check nondeterministic.
    """
    text = SOURCE.read_text(encoding="utf-8").replace("\r\n", "\n")

    # 1. Title.
    if not text.startswith("# CLAUDE.md\n"):
        raise SystemExit("gen_agents_md: CLAUDE.md must start with '# CLAUDE.md'")
    text = text.replace("# CLAUDE.md\n", "# AGENTS.md\n", 1)

    # 2. Insert the cross-vendor sentence as its own paragraph after the intro.
    if INTRO_LINE not in text:
        raise SystemExit("gen_agents_md: intro line not found in CLAUDE.md")
    text = text.replace(
        INTRO_LINE + "\n",
        INTRO_LINE + "\n\n" + CROSS_VENDOR_SENTENCE + "\n",
        1,
    )

    # 3. Drop the footer sibling pointer (the twin doesn't point at itself),
    #    consuming the preceding blank line so the twin ends right after the
    #    last bullet — matching the hand-maintained AGENTS.md.
    if FOOTER_SIBLING_LINE not in text:
        raise SystemExit("gen_agents_md: footer sibling line not found in CLAUDE.md")
    text = text.replace("\n\n" + FOOTER_SIBLING_LINE + "\n", "\n")

    return text.encode("utf-8")


def _norm(b):
    return b.replace(b"\r\n", b"\n") if b is not None else None


def main():
    want = render()
    have = DEST.read_bytes() if DEST.exists() else None
    if _norm(have) == _norm(want):
        print("AGENTS.md already in sync.")
        return
    DEST.write_bytes(want)
    print("AGENTS.md regenerated from CLAUDE.md.")


if __name__ == "__main__":
    main()
