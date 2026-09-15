import json, re, collections

d = json.load(open('data/raw/bma_arcgis_dcevbmA_chargingstation.json', encoding='utf-8'))
fs = [f['attributes'] for f in d['features']]

print('=== rows with no DESCRIPTION by provider/power')
for a in fs:
    if not a['DESCRIPTION']:
        print(a['PROVIDER'], '|', a['POWER'], '|', a['NAME_T'], '|', a['NAME_E'])
print()
print('=== rows without ccs/chademo in desc by provider/power')
for a in fs:
    if a['DESCRIPTION'] and not re.search('ccs|chademo', a['DESCRIPTION'], re.I):
        print(a['PROVIDER'], '|', a['POWER'], '|', a['NAME_T'], '|', a['DESCRIPTION'])
print()
print('=== CCS2 rows with null POWER, by provider')
c = collections.Counter()
for a in fs:
    if a['DESCRIPTION'] and re.search('ccs', a['DESCRIPTION'], re.I) and a['POWER'] in (None, '', '0 kW'):
        c[a['PROVIDER']] += 1
print(c, 'total', sum(c.values()))
print()
print('=== model name -> POWER cross-tab (segment models before ":")')
tab = collections.defaultdict(collections.Counter)
for a in fs:
    if not a['DESCRIPTION']:
        continue
    for seg in a['DESCRIPTION'].split(','):
        if ':' in seg:
            model = seg.split(':')[0].strip()
            model = re.sub(r'\s+', ' ', model)
            tab[model][str(a['POWER'])] += 1
for m, cc in sorted(tab.items(), key=lambda kv: -sum(kv[1].values())):
    print(m, '->', dict(cc))
