import sys
import os
import json
import re
import zipfile
import shutil
from pathlib import Path
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

VISIO_NS = 'http://schemas.microsoft.com/office/visio/2012/main'

def usage():
    print("Usage: python scripts/vsdx-extract.py <vsdx_path> <output_dir>", file=sys.stderr)
    sys.exit(1)

def extract_archive(vsdx_path: Path, tmp_dir: Path):
    """Extract .vsdx (ZIP) using Python zipfile — works on all platforms."""
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir(parents=True)
    try:
        with zipfile.ZipFile(str(vsdx_path), 'r') as z:
            tmp_dir_resolved = tmp_dir.resolve()
            for member in z.infolist():
                member_path = (tmp_dir / member.filename).resolve()
                if tmp_dir_resolved not in member_path.parents and member_path != tmp_dir_resolved:
                    raise RuntimeError(f"Zip path traversal attempt detected: {member.filename}")
                z.extract(member, str(tmp_dir))
    except zipfile.BadZipFile as e:
        raise RuntimeError(f"Archive extraction failed for {vsdx_path}: {e}")

def discover_pages(tmp_dir: Path):
    """
    Discover page XML files.
    1. Try visio/pages/pages.xml (Lucidchart exports — no _rels/ subfolder).
    2. Fallback: glob visio/pages/page*.xml.
    Does NOT use visio/pages/_rels/pages.xml.rels — absent in Lucidchart exports.
    """
    pages_dir = tmp_dir / 'visio' / 'pages'
    pages_xml = pages_dir / 'pages.xml'
    if pages_xml.exists():
        tree = ET.parse(str(pages_xml))
        root = tree.getroot()
        ns = {'v': VISIO_NS}
        page_files = []
        for page_el in root.findall('.//v:Page', ns):
            rel_path = page_el.get('FileName')
            if rel_path:
                candidate = pages_dir / rel_path
                if candidate.exists():
                    page_files.append(candidate)
                else:
                    print(f"WARNING: pages.xml references missing file: {rel_path}", file=sys.stderr)
        if page_files:
            return sorted(page_files)
    # Fallback: glob
    candidates = sorted(pages_dir.glob('page*.xml'))
    return candidates

def get_text(element):
    """
    Extract all text from a <Text> child element recursively.
    Uses itertext() to automatically skip <cp/>, <pp/>, <tp/> character-property
    elements that Lucidchart-exported VSDX files insert into every text node.
    """
    ns = VISIO_NS
    text_el = element.find(f'{{{ns}}}Text')
    if text_el is None:
        return ''
    return ''.join(text_el.itertext()).strip()

CASE_PATTERN = re.compile(r'^(?:CASE_|Case\s*)(\d+(?:\.\d+)?)$')

def classify_shape(text):
    """
    Classify shape text into semantic categories.
    Returns (categories: list[str], confidence: str).
    Categories are additive — a shape can match multiple.
    """
    if not text:
        return ['unknown'], 'low'

    categories = []

    if CASE_PATTERN.match(text):
        categories.append('case_node')

    tool_signals = ['USE:', 'action', 'ENTITY:', 'send_', 'transfer_', 'escalate_']
    if any(s in text for s in tool_signals) or re.search(r'\b[a-z]+_[a-z_]+\b', text):
        if 'USE:' in text or re.search(r'^[a-z][a-z_]+$', text.split('\n')[0]):
            categories.append('tool_definition')

    if any(s in text for s in ['Entities', 'Name:', 'Value:', 'ENTITY:']):
        categories.append('entity_block')

    if any(s in text for s in ['ASK', 'SAY', 'IF', 'GOTO', '→', '->', 'objective']):
        categories.append('objective_step')

    if 'cdbLog' in text or re.search(r'\bCDB[_-]', text):
        categories.append('cdb_log')

    if any(s in text for s in ['end_conversation', 'transfer_to_agent', 'escalate_to_agent']):
        categories.append('system_exit')

    if 'opening:' in text.lower():
        categories.append('opening_line')

    if len(text) < 40 and ('=' in text or '/' in text):
        categories.append('routing_condition')

    if not categories:
        categories = ['unknown']

    if 'case_node' in categories or 'tool_definition' in categories or \
       'entity_block' in categories or 'objective_step' in categories or \
       'cdb_log' in categories or 'system_exit' in categories:
        confidence = 'high'
    elif 'opening_line' in categories or 'routing_condition' in categories:
        confidence = 'medium'
    else:
        confidence = 'low'

    return categories, confidence

def parse_pages(page_files):
    """Parse all page XML files and return (shapes_dict, edges_list)."""
    ns = VISIO_NS
    all_shapes = {}  # id -> {id, text, name}
    all_edges = []   # {from, to, label}

    for page_file in page_files:
        tree = ET.parse(str(page_file))
        root = tree.getroot()

        shapes_el = root.find(f'{{{ns}}}Shapes')
        if shapes_el is None:
            continue

        raw_shapes = {}
        for shape in shapes_el.findall(f'.//{{{ns}}}Shape'):
            sid = shape.get('ID')
            if sid is None:
                continue
            text = get_text(shape)
            name = shape.get('Name', '')
            raw_shapes[sid] = {'id': sid, 'text': text, 'name': name}

        # Collect connectors via <Connect> elements
        connects = root.findall(f'.//{{{ns}}}Connect')
        connector_ids = set()
        connector_map = {}  # connector_id -> {begin, end, label}

        for conn in connects:
            from_sheet = conn.get('FromSheet')
            to_sheet = conn.get('ToSheet')
            from_cell = conn.get('FromCell', '')
            if from_sheet is None or to_sheet is None:
                continue
            connector_ids.add(from_sheet)
            entry = connector_map.setdefault(from_sheet, {'begin': None, 'end': None})
            if from_cell == 'BeginX':
                entry['begin'] = to_sheet
            elif from_cell == 'EndX':
                entry['end'] = to_sheet

        # Build edges
        for conn_id, endpoints in connector_map.items():
            src = endpoints.get('begin')
            tgt = endpoints.get('end')
            if src and tgt:
                label = raw_shapes.get(conn_id, {}).get('text') or None
                all_edges.append({'from': src, 'to': tgt, 'label': label})

        # Content shapes = raw_shapes minus connector shapes
        for sid, shape in raw_shapes.items():
            if sid not in connector_ids:
                all_shapes[sid] = shape

    known_ids = set(all_shapes.keys())
    for e in all_edges:
        if e['from'] not in known_ids or e['to'] not in known_ids:
            e['dangling'] = True

    return all_shapes, all_edges

def build_result(source_name, shapes, edges, page_count):
    """Build the extracted.json output structure."""
    shape_list = []
    case_list = []

    for sid, shape in shapes.items():
        text = shape['text']
        if not text:
            continue
        categories, confidence = classify_shape(text)
        entry = {
            'id': sid,
            'text': text,
            'categories': categories,
            'confidence': confidence,
        }
        shape_list.append(entry)

        m = CASE_PATTERN.match(text)
        if m:
            case_list.append({
                'id': sid,
                'number': m.group(1),
                'label': text,
            })

    edge_list = []
    for e in edges:
        entry = {'from': e['from'], 'to': e['to'], 'label': e['label']}
        if e.get('dangling'):
            entry['dangling'] = True
        edge_list.append(entry)

    return {
        'source': source_name,
        'pages': page_count,
        'shapes': shape_list,
        'edges': edge_list,
        'cases': case_list,
    }

def main():
    if len(sys.argv) != 3:
        usage()
    vsdx_path = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    if not vsdx_path.exists():
        print(f"ERROR: File not found: {vsdx_path}", file=sys.stderr)
        sys.exit(1)
    output_dir.mkdir(parents=True, exist_ok=True)
    tmp_dir = output_dir / f"tmp_vsdx_{vsdx_path.stem}"
    try:
        extract_archive(vsdx_path, tmp_dir)
        pages = discover_pages(tmp_dir)
        if not pages:
            print("ERROR: No pages found after extraction", file=sys.stderr)
            sys.exit(3)
        shapes, edges = parse_pages(pages)
        result = build_result(vsdx_path.name, shapes, edges, len(pages))
        out_path = output_dir / "extracted.json"
        out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
        print(f"OK: extracted.json written to {output_dir}")
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(2)
    finally:
        if tmp_dir.exists():
            shutil.rmtree(tmp_dir, ignore_errors=True)

if __name__ == '__main__':
    main()
