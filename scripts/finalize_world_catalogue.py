"""Synchronize the contract descriptions with the authored encounter families."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
base=json.loads((root/'data/RPGManagerQuests.json').read_text(encoding='utf-8'))
for name in ['RPGManagerQuests.json','RPGManagerStage3.json']:
    path=root/'data'/name
    data=json.loads(path.read_text(encoding='utf-8'))
    for q in data['quests']:
        group=base['enemyGroups'].get(q.get('encounterGroup'))
        if group:
            q['encounterType']=group['name']
        if q.get('skulls',1)>=3:
            q['riskExplanation']=f"Level {q['skulls']} party recommended. Worn or missing gear makes this dangerous; bring protection and expect casualties if underprepared."
    path.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
