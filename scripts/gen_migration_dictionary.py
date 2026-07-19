#!/usr/bin/env python3
"""Generate the callflow-migrator skill's dictionary.json from the seed SQL.

This is the ONLY writer of
``.claude/skills/rtds-callflow-migrator/references/dictionary.json``. It parses
``rtds/db_seed/import_seeds_camelCase.sql`` into a machine-readable contract the
skill reads to convert and validate legacy callflow configs:

  - operationTypes        : list of valid `type` values (Dic_OperationType.Name)
  - promptApplicationIds   : valid `applicationId` ints (Dic_PromptApplication.ID)
  - attributes[<opType>]   : ORDERED list of {name, type, required, branch}, in
                             the seed's Dic_Attribute declaration order. Order is
                             load-bearing: the migrated output emits params in
                             this exact order (branch keys grouped last, bare
                             `nextStep` final), matching the SQL exporter
                             export_flow_to_json_camelCase.sql so a hand-migrated
                             file and an import->export round-trip diff clean.

The seed-parsing regex is the same one check_lockstep.py uses
(seed_param_names_by_optype), extended to capture the IsRequired / IsNext flag
columns. re.findall preserves file order, so declaration order falls out for free.

Run from the repo root::

    python scripts/gen_migration_dictionary.py

Idempotent. check_skill_sync.py re-runs render() in memory and fails if the
committed dictionary.json drifted (the seeds changed but nobody regenerated).
"""

import json
import re
from collections import OrderedDict
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SEED = REPO / "rtds" / "db_seed" / "import_seeds_camelCase.sql"
DEST = (
    REPO
    / ".claude"
    / "skills"
    / "rtds-callflow-migrator"
    / "references"
    / "dictionary.json"
)

# Dic_OperationType rows:  (1,  N'setVariables', N'...date...', ...)
_OPTYPE_RE = re.compile(r"\(\s*\d+,\s*N'([A-Za-z][A-Za-z0-9_]*)'")

# Dic_PromptApplication rows:  (11, N'Welcome', N'Welcome', N'...date...', ...)
# Same leading "(<int>, N'<name>'" shape as Dic_OperationType, so we bound the
# scan to the Dic_PromptApplication INSERT block to avoid cross-contamination.
_APP_ID_RE = re.compile(r"\(\s*(\d+),\s*N'")

# @Attribute rows:  ('guard', 'configId', 'int', 1, 0, 0, 0)
# Anchored on the attribute-type column ('string'|'int'|'bit') so the bare
# @OperationType VALUES list (type names only, no type column) cannot match.
# Captures the IsRequired and IsNext flag columns that follow the type.
_ATTR_RE = re.compile(
    r"\('([A-Za-z][A-Za-z0-9_]*)',\s*"        # OperationType
    r"'([A-Za-z_][A-Za-z0-9_]*)',\s*"          # AttributeName
    r"'(string|int|bit)',\s*"                  # AttributeType
    r"(\d+),\s*(\d+)"                          # IsRequired, IsNext
)


def _block(text, start_marker, end_marker):
    """Return the slice of `text` between start_marker and the next end_marker."""
    s = text.index(start_marker)
    e = text.index(end_marker, s)
    return text[s:e]


def strip_seed_comments(text):
    """Drop SQL block comments and full-line ``--`` comments before parsing.

    Commented ``@Attribute`` blocks and ``--``-prefixed ``Dic_OperationType``
    rows are intentionally excluded from the generated dictionary contract.
    """
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    kept = []
    for line in text.splitlines():
        if line.lstrip().startswith("--"):
            continue
        kept.append(line)
    return "\n".join(kept)


def parse_seed(text):
    """Parse the seed SQL into the dictionary structure (ordered)."""
    text = strip_seed_comments(text)
    # Operation types — bounded to the Dic_OperationType INSERT ... AS v(...) block.
    optype_block = _block(
        text,
        "INSERT INTO rtds.Dic_OperationType",
        ") AS v(",
    )
    operation_types = _OPTYPE_RE.findall(optype_block)

    # Prompt application ids — bounded to the Dic_PromptApplication block.
    app_block = _block(
        text,
        "INSERT INTO rtds.Dic_PromptApplication",
        ") AS v(",
    )
    prompt_application_ids = [int(x) for x in _APP_ID_RE.findall(app_block)]

    # Attributes — declaration order preserved by findall over the whole file
    # (the type-column anchor makes a global scan safe; see _ATTR_RE).
    attributes = OrderedDict()
    for ot, name, atype, is_required, is_next in _ATTR_RE.findall(text):
        attributes.setdefault(ot, []).append(
            OrderedDict(
                [
                    ("name", name),
                    ("type", atype),
                    ("required", is_required == "1"),
                    ("branch", is_next == "1"),
                ]
            )
        )

    return OrderedDict(
        [
            ("generatedFrom", "rtds/db_seed/import_seeds_camelCase.sql"),
            ("generator", "scripts/gen_migration_dictionary.py"),
            ("operationTypes", operation_types),
            ("promptApplicationIds", prompt_application_ids),
            ("attributes", attributes),
        ]
    )


def render():
    """Return the dictionary.json bytes (LF-normalized, trailing newline)."""
    text = SEED.read_text(encoding="utf-8").replace("\r\n", "\n")
    data = parse_seed(text)
    return (json.dumps(data, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def _norm(b):
    return b.replace(b"\r\n", b"\n") if b is not None else None


def build(write=True):
    """Generate dictionary.json. Returns True if the committed copy changed."""
    want = render()
    have = DEST.read_bytes() if DEST.exists() else None
    changed = _norm(have) != _norm(want)
    if changed and write:
        DEST.parent.mkdir(parents=True, exist_ok=True)
        DEST.write_bytes(want)
    return changed


def main():
    changed = build(write=True)
    print(
        "dictionary.json "
        + ("updated" if changed else "already in sync")
        + f" ({DEST.relative_to(REPO)})"
    )


if __name__ == "__main__":
    main()
