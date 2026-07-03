"""Dump every sheet of an .xlsx as pipe-separated rows using only the stdlib.

Usage: python dump_xlsx.py <path-to-xlsx> [sheet-name]
"""
import zipfile, xml.etree.ElementTree as ET, sys, re

sys.stdout.reconfigure(encoding='utf-8')

path = sys.argv[1]
only_sheet = sys.argv[2] if len(sys.argv) > 2 else None
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}

z = zipfile.ZipFile(path)

shared = []
try:
    root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    for si in root.findall('m:si', NS):
        shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
except KeyError:
    pass

wb = ET.fromstring(z.read('xl/workbook.xml'))
rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
relmap = {rel.get('Id'): rel.get('Target') for rel in rels}


def col_idx(ref):
    m = re.match(r'([A-Z]+)', ref)
    n = 0
    for ch in m.group(1):
        n = n * 26 + (ord(ch) - 64)
    return n - 1


for sheet in wb.find('m:sheets', NS):
    name = sheet.get('name')
    if only_sheet and name != only_sheet:
        continue
    rid = sheet.get('{%s}id' % NS['r'])
    target = relmap[rid]
    if not target.startswith('xl/'):
        target = 'xl/' + target.lstrip('/')
    print('=' * 80)
    print('SHEET:', name)
    print('=' * 80)
    ws = ET.fromstring(z.read(target))
    for row in ws.iter('{%s}row' % NS['m']):
        cells = []
        for c in row.findall('m:c', NS):
            v = c.find('m:v', NS)
            val = ''
            if v is not None:
                val = v.text or ''
                if c.get('t') == 's':
                    val = shared[int(val)]
            elif c.find('m:is', NS) is not None:
                val = ''.join(t.text or '' for t in c.find('m:is', NS).iter('{%s}t' % NS['m']))
            idx = col_idx(c.get('r', 'A1'))
            while len(cells) < idx:
                cells.append('')
            cells.append(val.replace('\n', ' / '))
        print(' | '.join(cells))
