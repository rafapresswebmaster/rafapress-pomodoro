from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];d=json.loads((root/'tests/strict-focus-audit.json').read_text())
for key,g in d['groups'].items():
 print(f"{key}: {100*g['wins']/g['runs']:.1f}% clear; deaths {g['deaths']}; wounds {g['wounds']}; broken {g['gearBroken']}; wipes {g['wipes']}")
print('Safety violations:',sum(r['safetyViolations'] for r in d['rows']))
for r in d['rows']:
 if r['skulls']==1 and r['gear']=='none' and r['level']==1:print(r['quest'],r['wins'],r['retreats'],r['battles'],r['deaths'])
