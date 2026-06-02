#!/usr/bin/env python3
"""
layout_component.py — Deterministic mxGraph layout for v2 Style A Vocalls components.

Reads an mxGraph XML file produced by the rtds-vocalls-component-gen skill and
rewrites the `<mxGeometry>` x/y/width/height of every top-level (baselayer)
node so the graph renders cleanly in Vocalls Designer.

Layout policy (single-column trunk + right-side branches):

  * The TRUNK is the main flow from input (id=0) to output (id=6). Every trunk
    node is centred on x = TRUNK_CENTER (default 317.5 — the column used by the
    canonical 4-node skeleton in component-v2.md §1).
  * Trunk nodes stack vertically with a fixed gap below the previous trunk
    node's bottom edge.
  * BRANCH DESTINATIONS — nodes reachable only via a branching primitive's
    non-chrome children (dtmf choices, case expressions, recognize
    reactionGroups, etc.) AND not themselves on the trunk — are placed in a
    RIGHT COLUMN, top-aligned with the branching primitive.
  * Children INSIDE a branching primitive (chrome row + per-key/per-expression
    rows) use container-relative coords and are left untouched.
  * Edges are left untouched (their endpoints are id-based, not coord-based).

The trunk is detected as the longest simple path from id=0 to id=6 through the
edge graph, preferring linear-flow Types (script, say, setvar, pause,
transient). If multiple paths share the longest length, the path with the
fewest branching primitives wins (cleanest visual main-line).

Geometry rewrites use **surgical string replacement** to preserve the file's
existing XML formatting, attribute-quote style (single vs double), and
character-entity encoding (e.g. `&#xa;` for newlines inside Code attributes).
ET is used only to detect graph topology.

Usage:
    python layout_component.py <input.xml> [--output <output.xml>] [--dry-run]

If --output is omitted, the file is rewritten in place. --dry-run prints the
proposed changes without writing.
"""

from __future__ import annotations

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path


# ---------------------------------------------------------------------------
# Layout constants
# ---------------------------------------------------------------------------

TRUNK_CENTER_X = 317.5      # canonical column center (component-v2.md §1)
TRUNK_TOP_Y = -350.0        # canonical y of input node (id=0)
TRUNK_VERTICAL_GAP = 80.0   # gap between trunk node bottom and next node top
                            # matches the canonical 4-node skeleton in
                            # component-v2.md §1 (init→script gap = 80,
                            # script→output gap = 90; we use 80 uniformly)
BRANCH_GAP_X = 80.0         # horizontal gap between trunk-node right edge and branch column
BRANCH_VERTICAL_GAP = 40.0  # gap between stacked branch destinations

LINEAR_TYPES = frozenset({"script", "say", "setvar", "pause", "transient"})
BRANCHING_TYPES = frozenset({"dtmf", "case", "counter", "recognize", "number", "redirect"})

DEFAULT_SIZE = {
    "transient": (130, 40),
    "script":    (168, 80),
    "say":       (287, 80),
    "setvar":    (130, 80),
    "pause":     (130, 80),
    "dtmf":      (160, 200),
    "case":      (160, 160),
    "counter":   (160, 126),
    "recognize": (163, 280),
    "number":    (160, 126),
    "redirect":  (160, 120),
}


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class Node:
    id: str
    type: str
    label: str
    width: float
    height: float
    x: float
    y: float


@dataclass
class Graph:
    nodes: dict[str, Node] = field(default_factory=dict)
    out_edges: dict[str, list[str]] = field(default_factory=lambda: defaultdict(list))
    in_edges: dict[str, list[str]] = field(default_factory=lambda: defaultdict(list))
    branch_children: dict[str, list[str]] = field(default_factory=lambda: defaultdict(list))
    child_to_parent: dict[str, str] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Parsing (topology only — geometry is rewritten via string replacement)
# ---------------------------------------------------------------------------

def parse_graph(xml_text: str) -> Graph:
    """Parse the XML for graph topology only.

    The parsed tree is discarded after this — the actual file rewrite operates
    on raw text via regex so the file's existing formatting is preserved.
    """
    tree = ET.fromstring(xml_text)
    root = tree.find("root")
    if root is None:
        raise ValueError("<root> not found in input XML")

    g = Graph()

    for obj in root.findall("object"):
        if obj.get("id") == "vocalls-master-layer":
            continue
        cell = obj.find("mxCell")
        if cell is None:
            continue
        node_id = obj.get("id", "")
        if not node_id:
            continue
        parent = cell.get("parent", "")

        if parent == "baselayer":
            geom = cell.find("mxGeometry")
            if geom is None:
                continue
            obj_type = obj.get("Type", "")
            kind = obj.get("Kind", "")
            effective_type = kind if kind in ("input", "output") else obj_type
            try:
                g.nodes[node_id] = Node(
                    id=node_id,
                    type=effective_type,
                    label=obj.get("label", ""),
                    width=float(geom.get("width", "0")),
                    height=float(geom.get("height", "0")),
                    x=float(geom.get("x", "0")),
                    y=float(geom.get("y", "0")),
                )
            except ValueError:
                continue
        else:
            style = cell.get("style", "")
            if style and not style.endswith("InnerNode"):
                g.branch_children[parent].append(node_id)
                g.child_to_parent[node_id] = parent

    for edge in root.findall("mxCell"):
        if edge.get("edge") != "1":
            continue
        src = edge.get("source", "")
        tgt = edge.get("target", "")
        if not src or not tgt:
            continue
        g.out_edges[src].append(tgt)
        g.in_edges[tgt].append(src)

    return g


# ---------------------------------------------------------------------------
# Trunk + branch detection
# ---------------------------------------------------------------------------

def _resolve_edge_endpoint(g: Graph, node_id: str) -> str:
    """Map a branching-primitive child id to its parent primitive id, so trunk
    detection sees edges as flowing through the parent."""
    return g.child_to_parent.get(node_id, node_id)


def find_trunk(g: Graph, start_id: str = "0", end_id: str = "6") -> list[str]:
    """Longest simple path from start to end (with branching count as tiebreak).

    Edges from branching-primitive children are normalised to flow from the
    parent primitive, so the trunk passes THROUGH a branching primitive when
    one of its children leads to a downstream node on the path.
    """
    if start_id not in g.nodes or end_id not in g.nodes:
        return [nid for nid in g.nodes]

    trunk_adj: dict[str, set[str]] = defaultdict(set)
    for src, targets in g.out_edges.items():
        effective_src = _resolve_edge_endpoint(g, src)
        if effective_src not in g.nodes:
            continue
        for tgt in targets:
            effective_tgt = _resolve_edge_endpoint(g, tgt)
            if effective_tgt in g.nodes and effective_tgt != effective_src:
                trunk_adj[effective_src].add(effective_tgt)

    paths: list[list[str]] = []
    MAX_PATHS = 1024

    def dfs(node: str, path: list[str], visited: set[str]) -> None:
        if len(paths) >= MAX_PATHS:
            return
        if node == end_id:
            paths.append(list(path))
            return
        for nxt in sorted(trunk_adj.get(node, ())):
            if nxt in visited:
                continue
            visited.add(nxt)
            path.append(nxt)
            dfs(nxt, path, visited)
            path.pop()
            visited.remove(nxt)

    dfs(start_id, [start_id], {start_id})

    if not paths:
        return [start_id, end_id]

    def score(p: list[str]) -> tuple[int, int]:
        length = len(p)
        branching_count = sum(1 for nid in p if g.nodes[nid].type in BRANCHING_TYPES)
        return (length, -branching_count)

    paths.sort(key=score, reverse=True)
    return paths[0]


def find_branch_destinations(g: Graph, trunk: list[str]) -> dict[str, list[str]]:
    """For each branching primitive on the trunk, list the off-trunk
    destinations reachable from its non-chrome children."""
    trunk_set = set(trunk)
    result: dict[str, list[str]] = {}

    for parent_id in trunk:
        if g.nodes[parent_id].type not in BRANCHING_TYPES:
            continue
        seen: set[str] = set()
        dests: list[str] = []
        for child_id in g.branch_children.get(parent_id, []):
            for tgt in g.out_edges.get(child_id, []):
                effective_tgt = _resolve_edge_endpoint(g, tgt)
                if effective_tgt in trunk_set or effective_tgt in seen:
                    continue
                if effective_tgt not in g.nodes:
                    continue
                seen.add(effective_tgt)
                dests.append(effective_tgt)
        if dests:
            result[parent_id] = dests

    return result


# ---------------------------------------------------------------------------
# Layout computation (no I/O — produces a target-geometry dict)
# ---------------------------------------------------------------------------

def _node_size(node: Node) -> tuple[float, float]:
    """Return effective width/height — keep the existing values when present,
    fall back to per-Type defaults only when they're zero/missing."""
    fallback = DEFAULT_SIZE.get(node.type, (130, 40))
    w = node.width if node.width > 0 else fallback[0]
    h = node.height if node.height > 0 else fallback[1]
    return (w, h)


def compute_layout(g: Graph) -> tuple[dict[str, tuple[float, float, float, float]], list[str], dict[str, list[str]]]:
    """Compute target (x, y, width, height) for every baselayer node.

    Returns:
        target_geom: {node_id: (x, y, width, height)} — only nodes we want to
                     rewrite. Nodes not in this dict keep their existing
                     geometry.
        trunk:       the detected trunk (for reporting).
        branches:    branch destinations (for reporting).
    """
    trunk = find_trunk(g)
    branches = find_branch_destinations(g, trunk)
    target: dict[str, tuple[float, float, float, float]] = {}

    # Trunk pass.
    for i, nid in enumerate(trunk):
        node = g.nodes[nid]
        w, h = _node_size(node)
        x = TRUNK_CENTER_X - w / 2.0
        if i == 0:
            y = TRUNK_TOP_Y
        else:
            prev_id = trunk[i - 1]
            prev_x, prev_y, prev_w, prev_h = target[prev_id]
            y = prev_y + prev_h + TRUNK_VERTICAL_GAP
        target[nid] = (x, y, w, h)

    # Branch pass.
    for parent_id, dests in branches.items():
        parent_x, parent_y, parent_w, parent_h = target[parent_id]
        branch_x = parent_x + parent_w + BRANCH_GAP_X
        cursor_y = parent_y
        for dest_id in dests:
            dest = g.nodes[dest_id]
            w, h = _node_size(dest)
            target[dest_id] = (branch_x, cursor_y, w, h)
            cursor_y += h + BRANCH_VERTICAL_GAP

    return target, trunk, branches


# ---------------------------------------------------------------------------
# Surgical text rewrite
# ---------------------------------------------------------------------------

def _fmt(v: float) -> str:
    """Render a coordinate — integer if whole, else one decimal place.

    Matches the convention used by the existing components (252.5, -350, 168).
    """
    if v == int(v):
        return str(int(v))
    return f"{v:.1f}"


def rewrite_geometry(xml_text: str, target_geom: dict[str, tuple[float, float, float, float]]) -> str:
    """Rewrite each <mxGeometry> for the nodes in target_geom, leaving the rest
    of the file untouched.

    Strategy: locate every <object ... id="<id>" ...> block, then inside its
    <mxCell ... parent="baselayer" ...> find the FIRST <mxGeometry .../> tag
    and rewrite its x/y/width/height attribute values. We only touch baselayer
    objects (those whose mxCell parent is "baselayer") to avoid mangling
    child-row geometry inside branching primitives.
    """
    out = xml_text
    # We can't safely operate across the whole file with a single regex because
    # the same id might appear inside attribute values (rare but possible). The
    # robust approach: find each <object ... id="<id>" ...> opening tag, then
    # find the next <mxGeometry .../> after a <mxCell ... parent="baselayer">
    # within the same <object> ... </object> span.
    for node_id, (x, y, w, h) in target_geom.items():
        out = _rewrite_one(out, node_id, x, y, w, h)
    return out


# Match an <object ...> opening tag whose id="<wanted>". The id attribute may
# appear anywhere within the opening tag. We tolerate either ' or " quoting.
def _obj_open_pattern(node_id: str) -> re.Pattern[str]:
    safe = re.escape(node_id)
    return re.compile(
        r"<object\b[^>]*?\bid\s*=\s*[\"']" + safe + r"[\"'][^>]*>",
    )


_GEOM_X_RE = re.compile(r"(\bx\s*=\s*[\"'])([^\"']*)([\"'])")
_GEOM_Y_RE = re.compile(r"(\by\s*=\s*[\"'])([^\"']*)([\"'])")
_GEOM_W_RE = re.compile(r"(\bwidth\s*=\s*[\"'])([^\"']*)([\"'])")
_GEOM_H_RE = re.compile(r"(\bheight\s*=\s*[\"'])([^\"']*)([\"'])")

_CELL_BASELAYER_RE = re.compile(r"<mxCell\b[^>]*?\bparent\s*=\s*[\"']baselayer[\"'][^>]*?>")
_GEOM_TAG_RE = re.compile(r"<mxGeometry\b[^/]*?/>")


def _rewrite_one(text: str, node_id: str, x: float, y: float, w: float, h: float) -> str:
    """Find the <object id="X"> block in text, locate its baselayer mxCell's
    first mxGeometry, and rewrite its x/y/width/height."""
    obj_open = _obj_open_pattern(node_id).search(text)
    if not obj_open:
        return text

    # Find the matching </object> after the opening tag.
    obj_close_idx = text.find("</object>", obj_open.end())
    if obj_close_idx < 0:
        return text
    block_start = obj_open.start()
    block_end = obj_close_idx + len("</object>")
    block = text[block_start:block_end]

    # Locate the baselayer mxCell within this block.
    cell_match = _CELL_BASELAYER_RE.search(block)
    if not cell_match:
        return text  # not a baselayer object — skip

    # Locate the first self-closing <mxGeometry .../> after the cell tag.
    geom_match = _GEOM_TAG_RE.search(block, cell_match.end())
    if not geom_match:
        return text

    old_geom = geom_match.group(0)
    new_geom = _GEOM_X_RE.sub(lambda m: m.group(1) + _fmt(x) + m.group(3), old_geom, count=1)
    new_geom = _GEOM_Y_RE.sub(lambda m: m.group(1) + _fmt(y) + m.group(3), new_geom, count=1)
    new_geom = _GEOM_W_RE.sub(lambda m: m.group(1) + _fmt(w) + m.group(3), new_geom, count=1)
    new_geom = _GEOM_H_RE.sub(lambda m: m.group(1) + _fmt(h) + m.group(3), new_geom, count=1)

    if new_geom == old_geom:
        return text

    new_block = block[:geom_match.start()] + new_geom + block[geom_match.end():]
    return text[:block_start] + new_block + text[block_end:]


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Lay out a Vocalls component XML using single-column-trunk + right-branch policy.",
    )
    parser.add_argument("input", type=Path, help="Path to the component .js (mxGraph XML) file.")
    parser.add_argument("--output", type=Path, default=None,
                        help="Output path. Defaults to overwriting the input.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print the proposed layout and exit without writing.")
    args = parser.parse_args()

    # Read as binary then decode with newline="" semantics — we want to
    # preserve the file's existing line endings (CRLF on Windows-edited files,
    # LF elsewhere). Python's default read_text/write_text normalises them,
    # which would produce a noisy diff that obscures the geometry-only change.
    raw_bytes = args.input.read_bytes()
    # Detect line-ending style from the first newline we find.
    if b"\r\n" in raw_bytes:
        newline_style = "\r\n"
    else:
        newline_style = "\n"
    xml_text = raw_bytes.decode("utf-8")
    # Normalise to LF for the regex pass — we'll convert back on write.
    xml_text = xml_text.replace("\r\n", "\n")

    try:
        g = parse_graph(xml_text)
    except (ET.ParseError, ValueError) as exc:
        print(f"error: failed to parse {args.input}: {exc}", file=sys.stderr)
        return 1

    target, trunk, branches = compute_layout(g)

    print(f"Trunk ({len(trunk)} nodes): " + " -> ".join(
        f"{nid}:{g.nodes[nid].type}" for nid in trunk))
    for parent_id, dests in branches.items():
        parent = g.nodes[parent_id]
        print(f"Branch off {parent_id}:{parent.type} -> "
              + ", ".join(f"{d}:{g.nodes[d].type}" for d in dests))

    print()
    print("Target geometry:")
    for nid, (x, y, w, h) in target.items():
        node = g.nodes[nid]
        print(f"  id={nid:>4}  type={node.type:<10}  x={_fmt(x):>7}  y={_fmt(y):>7}  w={_fmt(w):>4}  h={_fmt(h):>4}")

    if args.dry_run:
        print("\n--dry-run: no file changes written.")
        return 0

    new_text = rewrite_geometry(xml_text, target)
    out_path = args.output or args.input
    # Restore original line-ending style so the only diff is geometry.
    if newline_style == "\r\n":
        new_text = new_text.replace("\n", "\r\n")
    out_path.write_bytes(new_text.encode("utf-8"))
    print(f"\nWrote layout to {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
