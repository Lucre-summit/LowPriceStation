import openpyxl, re, collections

wb = openpyxl.load_workbook('data/raw/PEA_VOLTA_May_2024.xlsx', data_only=True)
ws = wb['PEA VOLTA 409 (เปิดแล้ว)']
hdr = list(next(ws.iter_rows(min_row=4, max_row=4, values_only=True)))
rows = [r for r in ws.iter_rows(min_row=5, max_row=415, values_only=True)]
H = {h: i for i, h in enumerate(hdr) if h}

seqs = [r[0] for r in rows]
print('dupe seqs:', [k for k, v in collections.Counter(seqs).items() if v > 1])
print('rows/seq sample around first dupe:')
names = collections.Counter(r[H['ชื่อสถานี PEA ภาษาไทย']] for r in rows)
print('dupe names:', [k for k, v in names.items() if v > 1])

exp = {25: {'CCS2'}, 50: {'AC Type 2, CCS2, CHAdeMO', 'CCS2, CHAdeMO'}, 120: {'CCS2,CCS2', 'CCS2, CCS2'}}
bad = 0
for r in rows:
    cab = str(r[H['ตู้ชาร์จ']])
    h1 = str(r[H['หัวชาร์จเครื่องที่ 1']] or '')
    h2 = str(r[H['หัวชาร์จเครื่องที่ 2']] or '')
    bands = [(int(m.group(1)), int(m.group(2))) for m in re.finditer(r'(\d+)kW\s*(\d+)\s*เครื่อง', cab)]
    groups = [g for g in (h1, h2) if g and g != '-']
    bandlist = []
    for kw, n in bands:
        bandlist += [kw] * n
    if len(bandlist) != len(groups) or not groups:
        print('STRUCT', r[0], r[H['ชื่อสถานี PEA ภาษาไทย']], '|', cab, '|', h1, '|', h2)
        continue
    for kw, g in zip(bandlist, groups):
        gg = g.strip().strip('()')
        if kw in exp and gg not in exp[kw]:
            bad += 1
            print('MISMATCH', r[0], kw, repr(g), r[H['ชื่อสถานี PEA ภาษาไทย']])
        if kw not in exp:
            print('HIGHBAND', r[0], kw, repr(g), r[H['ชื่อสถานี PEA ภาษาไทย']], cab)
print('mismatches:', bad)

# per-band head composition tally
tally = collections.Counter()
for r in rows:
    cab = str(r[H['ตู้ชาร์จ']])
    groups = [g for g in (str(r[H['หัวชาร์จเครื่องที่ 1']] or ''), str(r[H['หัวชาร์จเครื่องที่ 2']] or '')) if g and g != '-']
    bandlist = []
    for m in re.finditer(r'(\d+)kW\s*(\d+)\s*เครื่อง', cab):
        bandlist += [int(m.group(1))] * int(m.group(2))
    for kw, g in zip(bandlist, groups):
        tally[(kw, g.strip().strip('()'))] += 1
for k, v in sorted(tally.items()):
    print(k, v)
