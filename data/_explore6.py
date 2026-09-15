import json, re, collections

d = json.load(open('data/raw/bma_arcgis_dcevbmA_chargingstation.json', encoding='utf-8'))
fs = [f['attributes'] for f in d['features']]
desc = collections.Counter((a['PROVIDER'], a['DESCRIPTION']) for a in fs)
for (p, ds), v in sorted(desc.items(), key=lambda kv: (kv[0][0], -kv[1])):
    print(v, '|', p, '|', repr(ds))
