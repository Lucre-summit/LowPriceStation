import json, collections, re

d = json.load(open('data/raw/bma_arcgis_dcevbmA_chargingstation.json', encoding='utf-8'))
fs = [f['attributes'] for f in d['features']]
with open('data/_bma_desc.txt', 'w', encoding='utf-8') as fh:
    for a in fs:
        fh.write(json.dumps({'p': a['PROVIDER'], 'pow': a['POWER'], 'n': a['NAME_E'], 'd': a['DESCRIPTION']}, ensure_ascii=False) + '\n')
print('nulls:', {k: sum(1 for a in fs if a[k] in (None, '')) for k in ('DESCRIPTION', 'NAME_E', 'NAME_T', 'ADDRESS', 'HOURS', 'POWER', 'LOCATION', 'DEALERSHIP')})
print('--- desc containing CCS2:', sum(1 for a in fs if a['DESCRIPTION'] and re.search('ccs', a['DESCRIPTION'], re.I)))
print('--- desc containing CHAdeMO:', sum(1 for a in fs if a['DESCRIPTION'] and re.search('chademo', a['DESCRIPTION'], re.I)))
print('--- desc containing neither ccs nor chademo:', sum(1 for a in fs if not a['DESCRIPTION'] or not re.search('ccs|chademo', a['DESCRIPTION'], re.I)))
print('--- desc none:', sum(1 for a in fs if not a['DESCRIPTION']))
print('--- type2 count:', sum(1 for a in fs if a['DESCRIPTION'] and re.search('type ?2', a['DESCRIPTION'], re.I)))
print()
print('=== first 40 descriptions')
for a in fs[:40]:
    print(a['PROVIDER'], '|', a['POWER'], '|', a['NAME_E'], '|', a['DESCRIPTION'], '|', a['ADDRESS'], '|', a['HOURS'])
