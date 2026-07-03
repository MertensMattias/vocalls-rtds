"""Extract the functional graph of a Vocalls Designer flow XML (mxGraph export).

Emits JSON to stdout: master-layer variables/languages, functional nodes
(with the attributes that matter for config generation), and edges.
Layout, styles, geometry, global libraries and component internals are dropped.

Usage: python extract_flow.py <path-to-flow-xml>
"""
import xml.etree.ElementTree as ET, sys, json

sys.stdout.reconfigure(encoding='utf-8')

IGNORE_TYPES = {'globalLibrary', 'label', 'pause', 'counter', 'noInput'}
KEEP_ATTRS = ['Type', 'SubType', 'Kind', 'Title', 'Expression', 'Destination',
              'TransferType', 'Parameters', 'Text', 'Code', 'ComponentGuid',
              'ContinueAfter', 'MaxEntryCount', 'DynamicNextId']

tree = ET.parse(sys.argv[1])
root = tree.getroot()

out = {'master': {}, 'nodes': [], 'edges': []}
ignored_ids = set()

for obj in root.iter('object'):
    attrs = obj.attrib
    oid = attrs.get('id', '')
    if oid == 'vocalls-master-layer':
        out['master'] = {'Variables': attrs.get('Variables', ''),
                         'Languages': attrs.get('Languages', '')}
        continue
    ntype = attrs.get('Type', '')
    cell0 = obj.find('mxCell')
    parent0 = cell0.get('parent') if cell0 is not None else None
    if ntype in IGNORE_TYPES or parent0 in ignored_ids:
        ignored_ids.add(oid)
        continue
    node = {'id': oid}
    if attrs.get('label'):
        node['label'] = attrs['label']
    for k in KEEP_ATTRS:
        if attrs.get(k):
            node[k] = attrs[k]
    # language-variant say texts (Text_nl, AltTexts_fr, ...)
    for k, v in attrs.items():
        if (k.startswith('Text_') or k.startswith('AltTexts_')) and v:
            node[k] = v
    # child of a case/component (expression rows, transient outputs)
    cell = obj.find('mxCell')
    if cell is not None and cell.get('parent') not in (None, 'baselayer', 'vocalls-master-layer'):
        node['parent'] = cell.get('parent')
    if len(node) > 1:
        out['nodes'].append(node)

for cell in root.iter('mxCell'):
    if cell.get('edge') == '1':
        out['edges'].append({'id': cell.get('id'),
                             'source': cell.get('source'),
                             'target': cell.get('target')})

json.dump(out, sys.stdout, indent=1, ensure_ascii=False)
