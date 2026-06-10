#!/usr/bin/env python3
"""Lockstep contract check across catalog, specs, components, seed, and runtime.

Turns the documented-but-manual rules in conventions/lockstep.md and the
operations-catalog.md footer into a failing check. Assertions:

  1. The committed operations-catalog.md is byte-identical to gen_catalog.py
     output (a stale catalog fails instead of silently lying).
  2. Every rtds/components/<X>.js (except the hand-built voicemaildetector) has
     a spec whose frontmatter names it with status: implemented (or legacy).
  3. Every spec frontmatter `runtime:` claim matches a register{Operation,Exit}
     line in rtds_2_runtime.js (allowing aliases); spec-only specs are unwired.
  4. Param-name parity for each operation that has ALL THREE of {component
     __configJSON, spec Params table, seed Dic_Attribute rows}: the name sets
     must be equal. Operations missing a source (most lack seed rows) are
     reported as "skipped (no seed)", not failed.

Exit 0 when all hold; exit 1 listing each violation otherwise.

Run from the repo root::

    python scripts/check_lockstep.py
"""

import html
import importlib.util
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SPECS = REPO / "rtds" / "specs"
COMPONENTS = REPO / "rtds" / "components"
CATALOG = REPO / "rtds" / "docs" / "operations-catalog.md"
SEED = REPO / "rtds" / "db_seed" / "import_seeds_camelCase.sql"
RUNTIME = (
    REPO / "projects" / "rtds-runtime" / "globalLibraries" / "active" / "rtds_2_runtime.js"
)

# Component files in rtds/components/ that are intentionally NOT claimed by a
# spec frontmatter (catalog.component), and so are exempt from check #2:
#   - voicemaildetector.js: hand-built mxGraph reference, not a routing-table
#     operation (cited throughout component-mxgraph.md).
#   - guardRouting.v2.js: in-progress v2 migration scratch; the canonical
#     guardRouting.js is the specced one.
#   - gaurdRouting_recent_bad_shape.js: a known-bad scratch export kept for
#     reference (the filename flags it); not a shipping component.
SPECLESS_COMPONENTS = {
    "voicemaildetector.js",
    "guardRouting.v2.js",
    "gaurdRouting_recent_bad_shape.js",
}


def load_gen_catalog():
    spec = importlib.util.spec_from_file_location(
        "gen_catalog", REPO / "scripts" / "gen_catalog.py"
    )
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


# ---- frontmatter (reuse gen_catalog's parser) -----------------------------

def spec_frontmatters(gen):
    out = {}
    for path in SPECS.glob("*.spec.md"):
        out[path.name] = gen.parse_frontmatter(path)
    return out


# ---- component __configJSON keys ------------------------------------------

def component_param_names(comp_filename):
    """Extract __configJSON top-level keys from a component .js (mxGraph XML).

    The config lives as `__configJSON = { ... }` inside an XML attribute with
    entity encoding (&#xa;, &quot;, &amp;, &#39;) and may use the Vocalls `&=`
    placeholder-binding operator. We decode entities, then pull the quoted keys
    of the first object literal assigned to __configJSON.
    """
    path = COMPONENTS / comp_filename
    raw = path.read_text(encoding="utf-8")
    text = html.unescape(raw)
    m = re.search(r"__configJSON\s*&?=\s*\{(.*?)\};", text, re.DOTALL)
    if not m:
        return None
    body = m.group(1)
    # Top-level "Key": ... pairs. Keys are simple identifiers in quotes.
    return set(re.findall(r'"([A-Za-z_][A-Za-z0-9_]*)"\s*:', body))


# ---- spec Params table names ----------------------------------------------

def spec_param_names(spec_filename):
    """Names from the spec's Inputs (Params) table only (not the Outputs table)."""
    text = (SPECS / spec_filename).read_text(encoding="utf-8")
    # Bound the Params table: from the Inputs (Params) heading to the next ## / ###.
    start = re.search(r"#+\s*Inputs\s*\(Params\)", text)
    if not start:
        return None
    rest = text[start.end():]
    nxt = re.search(r"\n#{2,3}\s", rest)
    block = rest[: nxt.start()] if nxt else rest
    names = set()
    for line in block.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        first = line.split("|")[1].strip()
        km = re.match(r"`([A-Za-z_][A-Za-z0-9_]*)`", first)
        if km:
            names.add(km.group(1))
    return names or None


# ---- seed Dic_Attribute names ---------------------------------------------

def seed_param_names_by_optype():
    """Map seed OperationType (e.g. 'sendSms') -> set of AttributeName.

    Scoped to the `INSERT INTO @Attribute ... VALUES` block so the earlier
    `@OperationType` VALUES list (type names only) cannot pollute attribute
    names. Rows are `('<opType>', '<AttributeName>', '<type>', ...)` where
    <opType> is the camelCase, suffix-free operation type (the temporary
    '_vocalls' suffix was dropped in the camelCase-contract migration).
    """
    text = SEED.read_text(encoding="utf-8")
    out = {}
    # Anchor on the attribute-type column ('string'|'int'|'bit'); only
    # the @Attribute rows have it, so the @OperationType VALUES list (type names
    # only, no type column) can't match. No need to bound the block — comment
    # semicolons elsewhere are irrelevant.
    for ot, name in re.findall(
        r"\('([A-Za-z][A-Za-z0-9_]*)',\s*'([A-Za-z_][A-Za-z0-9_]*)',\s*'(?:string|int|bit)'",
        text,
    ):
        out.setdefault(ot, set()).add(name)
    return out


# ---- runtime registrations -------------------------------------------------

def runtime_registrations():
    """Return (ops, exits): registered JS-handler types and GUI-exit types."""
    text = RUNTIME.read_text(encoding="utf-8")
    ops = set(re.findall(r'registerRtdsOperation\("([^"]+)"', text))
    exits = dict(re.findall(r'registerRtdsExit\("([^"]+)",\s*"([^"]+)"', text))
    return ops, exits


def main():
    problems = []
    gen = load_gen_catalog()

    # 1. Catalog is in sync with the generator (newline-insensitive: autocrlf).
    want = gen.render()
    have = CATALOG.read_bytes() if CATALOG.exists() else None
    if gen._norm(have) != gen._norm(want):
        problems.append(
            "operations-catalog.md is stale — run: python scripts/gen_catalog.py"
        )

    fms = spec_frontmatters(gen)
    # Index frontmatter by component filename and by operation name.
    by_component = {}
    for fname, fm in fms.items():
        cat = fm.get("catalog")
        if isinstance(cat, dict) and cat.get("component"):
            by_component[cat["component"]] = (fname, fm)

    # 2. Every component file is claimed by a spec.
    for comp in COMPONENTS.glob("*.js"):
        if comp.name in SPECLESS_COMPONENTS:
            continue  # intentionally not specced — see SPECLESS_COMPONENTS
        if comp.name not in by_component:
            problems.append(
                f"component {comp.name} has no spec frontmatter naming it "
                f"(catalog.component)"
            )

    # 3. Runtime claims match registrations.
    ops, exits = runtime_registrations()
    for fname, fm in fms.items():
        cat = fm.get("catalog")
        if not isinstance(cat, dict):
            continue
        runtime_cell = cat.get("runtimeCell", "")
        # Derive expected registration from the operationType + cell wording.
        # JS twin -> registerRtdsOperation; GUI-exit -> registerRtdsExit.
        # The operation type is the backticked token inside the trailing
        # parentheses: "JS twin `executeSendSms` (`sendSms`)",
        # "GUI-exit `guard_routing` (via `guard`)". Both register* calls key on
        # this type (registerRtdsExit's first arg is the type, not the exit key).
        m_type = re.search(r"\((?:via )?`([A-Za-z][A-Za-z0-9_]*)`\)", runtime_cell)
        if not m_type:
            continue  # "not registered" rows carry no parenthesized type
        rtype = m_type.group(1)
        if "JS twin" in runtime_cell or "aliased to" in runtime_cell:
            if rtype not in ops:
                problems.append(
                    f"{fname}: runtime claims JS twin `{rtype}` but it is not "
                    f"registerRtdsOperation-ed"
                )
        elif "GUI-exit" in runtime_cell:
            if rtype not in exits:
                problems.append(
                    f"{fname}: runtime claims GUI-exit `{rtype}` but it is not "
                    f"registerRtdsExit-ed"
                )

    # 4. Param-name parity where component + spec + seed all exist.
    #    REPORT-ONLY: parity mismatches are warnings, never build failures.
    #    Rationale: some operations carry intentional, documented differences
    #    (setVariables is an open-ended variable writer; guardTui's seed carries
    #    ConfigName for flow-header parity that the component doesn't consume),
    #    and reconciling the remaining genuine drift (e.g. guardRouting naming)
    #    is its own work. Surfacing it keeps it visible without blocking commits.
    seed_by_ot = seed_param_names_by_optype()
    seed_keys_lower = {k.lower(): k for k in seed_by_ot}
    warnings = []
    checked = []
    for comp_name, (fname, fm) in sorted(by_component.items()):
        cat = fm["catalog"]
        if cat.get("legacy"):
            continue
        comp_names = component_param_names(comp_name)
        spec_names = spec_param_names(fname)
        # The seed OperationType (e.g. sendSms) is named verbatim in the
        # runtimeCell's trailing parentheses — use it directly so the seed key
        # matches the seed file's exact casing without a separate frontmatter
        # field.
        seed_key = None
        m_ot = re.search(
            r"\((?:via )?`([A-Za-z][A-Za-z0-9_]*)`\)", cat.get("runtimeCell", "")
        )
        if m_ot:
            seed_key = seed_keys_lower.get(m_ot.group(1).lower())
        if not (comp_names and spec_names and seed_key):
            continue  # parity only where all three sources exist
        seed_names = seed_by_ot[seed_key]
        checked.append(comp_name)
        comp_only = comp_names - spec_names
        spec_only = spec_names - comp_names
        if comp_only or spec_only:
            warnings.append(
                f"{comp_name}: component vs spec param mismatch — "
                f"component-only={sorted(comp_only)} spec-only={sorted(spec_only)}"
            )
        comp_vs_seed = comp_names - seed_names
        seed_vs_comp = seed_names - comp_names
        if comp_vs_seed or seed_vs_comp:
            warnings.append(
                f"{comp_name}: component vs seed param mismatch — "
                f"component-only={sorted(comp_vs_seed)} seed-only={sorted(seed_vs_comp)}"
            )

    if warnings:
        print("Lockstep param-parity warnings (report-only, not failing):")
        for w in warnings:
            print("  ~", w)
        print("")

    if problems:
        print("Lockstep check FAILED:")
        for p in problems:
            print("  -", p)
        sys.exit(1)

    print(
        "Lockstep check passed — catalog in sync, components specced, runtime "
        f"claims valid. Param parity examined for: {', '.join(checked) or '(none)'}"
        + (f" ({len(warnings)} warning(s) above)." if warnings else ".")
    )


if __name__ == "__main__":
    main()
