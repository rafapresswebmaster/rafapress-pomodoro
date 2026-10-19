"""Author enemy profiles, coherent encounter families, and scenic quest art."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
def read(name): return json.loads((root / 'data' / name).read_text(encoding='utf-8'))
def write(name, data): (root / 'data' / name).write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

base = read('RPGManagerQuests.json')
groups = {
 'greenskin_warband': ['goblin_1','goblin_2','goblin_3','goblin_archer','orc_1','orc_2','orc_3','hobgoblin','ogre','troll'],
 'demon_cult': ['cultist_1','cultist_2','mage_cultist','imp','summoned_demon','gargoyle','masked_jester'],
 'restless_dead': ['skeleton_1','skeleton_2','skeleton_archer_1','skeleton_archer_2','necromancer','ghoul','ghost','wraith','will_o_wisp'],
 'outlaws': ['bandit_fighter_1','bandit_fighter_2','bandit_rogue','pirate','pirate_captain','ratman','mimic','dwarf_prospector'],
 'wild_hunt': ['wolf','dire_wolf_1','dire_wolf_2','dire_wolf_3','owlbear','giant_spider_1','giant_spider_2','treant','swamp_hag','gnoll'],
 'cavern_brood': ['kobold','ratman','giant_bat','slime','giant_spider_1','giant_spider_2','basilisk','dwarf_prospector','mimic'],
 'highland_monsters': ['harpy','gargoyle','wyrmling','hill_giant','minotaur','basilisk','giant_bat','kobold'],
 'haunted_fen': ['swamp_hag','slime','will_o_wisp','ghost','ghoul','giant_spider_1','giant_spider_2','ratman','treant'],
 'corsair_coast': ['pirate','pirate_captain','harpy','ghost','slime','wyrmling','ratman'],
}
base['enemyGroups'] = {key: {'name': key.replace('_',' ').title(), 'enemyIds': ids} for key,ids in groups.items()}
for e in base['enemies']:
    key=e['id']; text=(key+' '+e['role']).lower()
    caster=any(x in text for x in ['mage','necromancer','cultist','hag','wisp','ghost','wraith','imp'])
    heavy=any(x in text for x in ['orc','ogre','troll','giant','hobgoblin','minotaur','owlbear','treant','demon','gargoyle']) and 'spider' not in key and 'bat' not in key
    agile=any(x in text for x in ['archer','rogue','wolf','bat','harpy','goblin','kobold','pirate'])
    # Reference profiles at three skulls. Rank scaling preserves these differences.
    hp=5 if heavy else 3 if caster or agile else 4
    armor=2 if heavy else 0 if caster or agile else 1
    ward=2 if caster else 0
    speed=5 if heavy else 10 if agile else 7
    crit=.08 if agile else .04 if heavy else .05
    damage=2 if heavy else 1
    special=e.get('special')
    e['combatProfile']={'hp':hp,'armor':armor,'ward':ward,'dodge':.12 if agile else .04 if heavy else .08,'speed':speed,'crit':crit,'damage':damage,'specialDamage':damage+1,'specialAttack':e.get('signatureAttack',e.get('basicAttack','Strike')),'special':special}
    e['encounterGroups']=[g for g,ids in groups.items() if key in ids]
    if e['name']=='Necrommancer': e['name']='Necromancer'

for filename in ['RPGManagerQuests.json','RPGManagerStage3.json']:
    data=base if filename=='RPGManagerQuests.json' else read(filename)
    for q in data['quests']:
        if q.get('balanceVersion',0)>=32: continue
        q['balanceVersion']=33
        for field in ['rewardGold','rewardArcana']:
            q[field]={k:int(v*.5) for k,v in q.get(field,{}).items()}
        q['rewardTypes']=[f"{q.get('rewardGold',{}).get('victory',0)} Gold",f"{q.get('rewardArcana',{}).get('victory',0)} Arcana",f"{q.get('xpPool',q.get('xpReward',0))} shared completion XP"]
        text=' '.join(str(q.get(k,'')) for k in ['id','name','environment','faction']).lower()
        art='QuestWoodland_v8'
        if any(x in text for x in ['crypt','cemetery','chapel','barrow','archive','undead','temple','altar','necrom','reliquary','shrine']): art='QuestCrypt_v8'
        elif any(x in text for x in ['coast','shoal','pirate','saltwake','ship','port','dock']): art='QuestCoast_v8'
        elif any(x in text for x in ['mountain','ridge','quarry','frost','rime','ember','cinder','volcan','warcamp','black_gate','cloudbreak','dustglass','giant']): art='QuestMountain_v8'
        elif any(x in text for x in ['cavern','cave','cellar','warren','aqueduct','reservoir','labyrinth','mine']): art='BattleCavern_v1'
        q['battleback']=art; q['battlebackFolder']='pictures'
        ids=q.get('enemyIds',[])
        if ids:
            family=max(groups,key=lambda g:sum(e in groups[g] for e in ids))
            q['encounterGroup']=family
            # Keep matching actors; replace outliers with unused members of the same family.
            used={e for e in ids if e in groups[family]}
            mapped={}
            for e in ids:
                if e not in groups[family]:
                    replacement=next(x for x in groups[family] if x not in used)
                    used.add(replacement); mapped[e]=replacement
            q['enemyIds']=[mapped.get(e,e) for e in ids]
            for stage in q.get('stages',[]):
                if 'enemyIds' in stage: stage['enemyIds']=[mapped.get(e,e) for e in stage['enemyIds']]
            q['skirmishEnemyIds']=[q['enemyIds'][0]]
            q['knownThreats']=[next(e['name'] for e in base['enemies'] if e['id']==key) for key in q['enemyIds']]
    write(filename,data)
