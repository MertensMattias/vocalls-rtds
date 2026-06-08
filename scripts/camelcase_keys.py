#!/usr/bin/env python3
"""Deterministic camelCase-key codemod for the RTDS import/export contract.

Transforms JSON object KEYS only (never values, never free text) with the
"lower leading acronym run" rule. Operation `Type` values keep their `_vocalls`
suffix. See docs/superpowers/specs/2026-06-08-camelcase-key-migration-design.md.

Usage:
    python scripts/camelcase_keys.py --dry-run --print-mapping   # gate
    python scripts/camelcase_keys.py --write                     # apply
"""

import argparse
import json
import sys
from collections import OrderedDict
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

# Tier A data files (keys-only rewrite). Type values are camelCased too.
DATA_FILES = [
    REPO / "callflow_json_config_vocalls" / name
    for name in [
        "DIGIPOLIS_DA_KLANTWACHT_GUARD_PRD.json",
        "DIGIPOLIS_DA_SYSTEEMWACHT_GUARD_PRD.json",
        "DIGIPOLIS_LPA_ICT_GUARD_PRD.json",
        "DIGIPOLIS_LPA_LTSU_GUARD_PRD.json",
        "DIGIPOLIS_DA_KLANTWACHT_TUI_PRD.json",
        "DIGIPOLIS_LPA_LTSU_GUARD_TUI_PRD.json",
        "DIGIPOLIS_LPA_ICT_GUARD_TUI_PRD.json",
        "DIGIPOLIS_DA_SYSTEEMWACHT_TUI_PRD.json",
    ]
] + [REPO / "rtds" / "samples" / "DA-HELPDESK.json"]


def _camel_segment(seg):
    """Lower the leading run of capitals in one identifier segment.

    Lowercase the leading run of consecutive uppercase letters, but if that run
    is immediately followed by a lowercase letter, leave the LAST capital of the
    run as the start of the next word.
    """
    if not seg or not seg[0].isupper():
        return seg
    # length of the leading uppercase run
    i = 0
    while i < len(seg) and seg[i].isupper():
        i += 1
    # i = index of first non-uppercase char (or len)
    if i == len(seg):
        # entire segment is uppercase (e.g. "CC", "NL") -> all lowercase
        return seg.lower()
    if i == 1:
        # single leading cap (e.g. "Source", "Outbound") -> lower it
        return seg[0].lower() + seg[1:]
    # run of >=2 caps followed by lowercase (e.g. "IVREvent"):
    # lowercase all but the last cap of the run; that last cap starts next word
    return seg[: i - 1].lower() + seg[i - 1:]


def camel_case_key(key):
    """camelCase a JSON object key. Underscore-segmented: transform the FIRST
    segment only, preserve the rest verbatim (NextStep_Success -> nextStep_Success)."""
    if "_" in key:
        head, _, tail = key.partition("_")
        return _camel_segment(head) + "_" + tail
    return _camel_segment(key)


def camel_case_type(type_value):
    """camelCase an operation Type value, preserving a trailing _vocalls suffix."""
    suffix = "_vocalls"
    if type_value.endswith(suffix):
        return _camel_segment(type_value[: -len(suffix)]) + suffix
    return _camel_segment(type_value)


def transform(obj, mapping):
    """Recursively rewrite dict KEYS (and Type VALUES). Records every distinct
    transform into `mapping` (an OrderedDict old->new) for the gate table."""
    if isinstance(obj, list):
        return [transform(v, mapping) for v in obj]
    if isinstance(obj, dict):
        out = OrderedDict()
        for k, v in obj.items():
            nk = camel_case_key(k)
            if nk != k:
                mapping[("key", k)] = nk
            # the value under a "type"/"Type" key is an operation Type literal
            if nk == "type" and isinstance(v, str):
                nv = camel_case_type(v)
                if nv != v:
                    mapping[("type", v)] = nv
                out[nk] = nv
            else:
                out[nk] = transform(v, mapping)
        return out
    return obj


def run(write):
    mapping = OrderedDict()
    for path in DATA_FILES:
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw, object_pairs_hook=OrderedDict)
        new = transform(data, mapping)
        if write:
            path.write_text(
                json.dumps(new, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
    return mapping


def print_mapping(mapping):
    keys = sorted(k for (kind, k) in mapping if kind == "key")
    types = sorted(k for (kind, k) in mapping if kind == "type")
    print("## Key mapping (old -> new)\n")
    print("| old | new |\n| --- | --- |")
    for k in keys:
        print("| `%s` | `%s` |" % (k, mapping[("key", k)]))
    print("\n## Type mapping (old -> new)\n")
    print("| old | new |\n| --- | --- |")
    for k in types:
        print("| `%s` | `%s` |" % (k, mapping[("type", k)]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--print-mapping", action="store_true")
    args = ap.parse_args()
    if not args.write and not args.dry_run:
        ap.error("specify --dry-run or --write")
    mapping = run(write=args.write)
    if args.print_mapping or args.dry_run:
        print_mapping(mapping)
    return 0


if __name__ == "__main__":
    sys.exit(main())
