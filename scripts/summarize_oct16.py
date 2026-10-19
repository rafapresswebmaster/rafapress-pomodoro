import json
from pathlib import Path
d=json.loads(Path('tests/oct16-balance.json').read_text());a={}
for r in d['rows']:
 if r['level']!=r['intendedLevel']:continue
 t=a.setdefault((r['gear'],r['difficulty']),dict.fromkeys(['runs','wins','retreats','wounded','deaths','gold','arcana'],0))
 for k in t:t[k]+=r[k]
print(d['runs'])
for k,v in a.items():print(k,v,'win%',round(v['wins']/v['runs']*100,1))
