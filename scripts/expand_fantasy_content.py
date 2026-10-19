"""Add the fantasy bestiary and authored contracts; safe to rerun."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def read(name): return json.loads((ROOT/'data'/name).read_text(encoding='utf-8'))
def write(name, value): (ROOT/'data'/name).write_text(json.dumps(value, indent=2)+'\n', encoding='utf-8')

# id, name, HP, armor, ward, speed, attack, signature, signature damage
creatures = [
 ('slime','Slime',3,0,0,5,'Acid Splash','Engulf',1),
 ('giant_bat','Giant Bat',2,0,0,17,'Fang Bite','Sonic Screech',1),
 ('ghost','Ghost',2,0,2,12,'Cold Touch','Grave Whisper',2),
 ('wyrmling','Wyrmling',8,2,1,13,'Tiny Talons','Ember Breath',3),
 ('hill_giant','Hill Giant',9,1,0,6,'Club Swing','Boulder Throw',3),
 ('pirate','Pirate',3,1,0,12,'Cutlass Slash','Dirty Trick',2),
 ('pirate_captain','Pirate Captain',7,2,0,15,'Captain Cutlass','Flintlock Volley',3),
 ('wolf','Wolf',3,0,0,16,'Pack Bite','Pouncing Fangs',2),
 ('owlbear','Owlbear',6,1,0,11,'Raking Claws','Beak and Talon',3),
 ('dwarf_prospector','Dwarf Prospector',4,2,0,7,'Pickaxe Swing','Blasting Charge',2),
 ('ghoul','Ghoul',4,0,0,13,'Grave Claws','Ravenous Bite',2),
 ('ratman','Ratman',2,0,0,14,'Scrap Knife','Sewer Ambush',2),
 ('kobold','Kobold',2,1,0,13,'Short Spear','Trap Spring',2),
 ('minotaur','Minotaur',7,2,0,10,'Labyrinth Axe','Goring Charge',3),
 ('basilisk','Basilisk',5,2,0,9,'Venom Fang','Stone Gaze',2),
 ('gargoyle','Gargoyle',4,3,0,8,'Stone Talon','Diving Strike',2),
 ('swamp_hag','Swamp Hag',4,0,2,10,'Bog Hex','Marsh Curse',3),
 ('gnoll','Gnoll',4,1,0,14,'Notched Axe','Hyena Rush',2),
 ('will_o_wisp','Will-o-Wisp',2,0,3,18,'Spark Touch','Lantern Flare',2),
 ('treant','Treant',8,3,0,4,'Branch Slam','Root Crush',3),
]
q=read('RPGManagerQuests.json')
new_ids={c[0] for c in creatures}
q['enemies']=[e for e in q['enemies'] if e['id'] not in new_ids]
for i,(eid,name,hp,armor,ward,speed,attack,signature,damage) in enumerate(creatures):
 boss=eid in {'wyrmling','pirate_captain','hill_giant','minotaur','treant'}
 q['enemies'].append(dict(id=eid,name=name,role='Boss' if boss else 'Caster' if ward else 'Skirmisher' if speed>=14 else 'Guardian',level=1,health=hp,maxHealth=hp,attack=1,damage=1,defense=0,armor=armor,innateWard=ward,speed=speed,intelligence='Normal',position='Back' if eid in {'ghost','swamp_hag','will_o_wisp'} else 'Front',dodge='Low',alive=True,passiveTrait=dict(name='Territorial',description='Defends its home territory.',stat='attack'),basicAttack=attack,signatureAttack=signature,signatureDamage=damage,signatureUseLimit=1,boss=boss,special=None,portrait=dict(sheet='RPGFantasyEnemies_v6',index=i,columns=5,rows=4),enemyArt=dict(sheet='RPGFantasyEnemies_v6',index=i,columns=5,rows=4)))
harpy=next(e for e in q['enemies'] if e['id']=='harpy')
harpy['enemyArt']=dict(sheet='RPGHarpy_v6',index=0,columns=1,rows=1)
harpy['portrait']=dict(sheet='RPGHarpy_v6',index=0,columns=1,rows=1)
write('RPGManagerQuests.json',q)

# Three contracts in each existing category. Each has a distinct visual setting.
# name, category, minutes, skulls, background, environment, enemies, patrols, objective
missions=[
 ('The Cistern Has Teeth','Errands',1,1,'Stone1','Abandoned village cistern',['slime','ratman'],['slime'],'Retrieve a dropped well key before the slime reaches the drinking channel.'),
 ('Lanterns for the Lost','Errands',5,2,'PoisonSwamp','Flooded pilgrim causeway',['ghost','will_o_wisp'],['will_o_wisp'],'Relight the causeway lanterns and escort a stranded ferryman through false lights.'),
 ('The Last Ore Cart','Errands',15,3,'DirtCave','Contested silver mine',['dwarf_prospector','kobold','giant_bat'],['kobold','giant_bat'],'Recover guild assay records from a hostile claim jumper and secure the ore cart.'),
 ('Bell Tower at Dusk','Short',3,1,'Castle1','Village bell tower',['giant_bat','ratman'],['giant_bat'],'Clear the bell chamber before the evening alarm attracts another swarm.'),
 ('Wolves at the Tollgate','Short',5,2,'Road2','Snowmelt toll road',['wolf','gnoll'],['wolf'],'Drive off the pack while its gnoll handler tries to cut the toll ropes.'),
 ('The Rooftop Reliquary','Short',10,3,'Temple','Wind-scoured temple roof',['gargoyle','harpy'],['harpy'],'Recover a stolen reliquary from rooftop sentries before the storm arrives.'),
 ('Tracks in the Reedbeds','Fieldwork',3,1,'Grassland','River reed survey',['slime','giant_bat'],['slime'],'Collect water samples from three marked pools where the reeds conceal hungry scavengers.'),
 ('A Map of False Stars','Fieldwork',10,2,'Crystal','Crystal-lit sinkhole',['will_o_wisp','kobold','ghost'],['kobold','will_o_wisp'],'Map the sinkhole using chalk markers rather than the deceptive floating lights.'),
 ('The Orchard That Walked','Fieldwork',25,4,'GrassMaze','Overgrown royal orchard',['treant','swamp_hag','wolf'],['wolf','swamp_hag'],'Trace the moving boundary stones and break the hag pact binding the ancient orchard.'),
 ('Feathers in the Honey','Hunt',5,2,'DirtField','Ruined hillside apiary',['owlbear','giant_bat'],['giant_bat'],'Lure an owlbear away from the last occupied hives and reclaim the beekeeper trail.'),
 ('Carrion at the Icehouse','Hunt',15,3,'IceCave','Frozen abbey storehouse',['ghoul','ghost','ratman'],['ghoul','ratman'],'Destroy the carrion nest before the thaw carries its remains into the abbey spring.'),
 ('Eyes Beneath the Sand','Hunt',20,4,'Desert','Buried caravan oasis',['basilisk','gnoll','kobold'],['gnoll','kobold'],'Track a basilisk through glassy footprints and recover the caravan water seals.'),
 ('The Cinder Nursery','Boss Hunt',10,3,'LavaCave','Volcanic dragon nursery',['wyrmling','kobold'],['kobold'],'Dislodge a newly hatched dragon from the forge vents before its first full firestorm.'),
 ('Captain of the Black Shoal','Boss Hunt',20,4,'Ship','Stormbound pirate flagship',['pirate_captain','pirate','harpy'],['pirate','harpy'],'Board the flagship, recover the harbor charter, and defeat its captain on the quarterdeck.'),
 ('The Giant and the Labyrinth','Boss Hunt',30,5,'RockCave','Giant-built mountain labyrinth',['hill_giant','minotaur','gargoyle'],['gargoyle','minotaur'],'Navigate the giant stone maze and stop its builders from crushing the mountain pass.'),
]
s=read('RPGManagerStage3.json')
ids={'fantasy_'+str(i+1).zfill(2) for i in range(len(missions))}
s['quests']=[x for x in s['quests'] if x['id'] not in ids]
for i,(name,category,minutes,skulls,bg,environment,enemies,patrols,objective) in enumerate(missions):
 names=[next(e['name'] for e in q['enemies'] if e['id']==eid) for eid in enemies]
 gold=minutes*6+skulls*8;arcana=minutes*3+skulls*4;xp=minutes*2+skulls*3
 s['quests'].append(dict(id=f'fantasy_{i+1:02}',name=name,category=category,durationMinutes=minutes,description=objective,risk=f'{skulls}-skull',skulls=skulls,difficulty='Easy' if skulls==1 else 'Normal' if skulls==2 else 'Hard',danger=' / '.join(names),rewardTypes=[f'{gold} Gold',f'{arcana} Arcana',f'{xp} XP per companion'],encounterType=' / '.join(names),environment=environment,combatMode='required',xpReward=xp,rewardGold=dict(victory=gold,draw=gold//4,defeat=0),rewardArcana=dict(victory=arcana,draw=arcana//4,defeat=0),bonusRewards={},travelSeconds=3, faction='Monsters' if category=='Boss Hunt' else 'Frontier',boss=category=='Boss Hunt',enemyIds=enemies,skirmishEnemyIds=patrols,knownThreats=names,knownConditions=[f'{minutes}-minute expedition',f'{skulls}-skull danger','Local patrols differ from the final objective'],rumors=[objective],journey=f'Cross the {environment.lower()}, complete the contract, and return to the guild.',chance='Normal',randomEncounters=[],tags=[category,environment],objectiveReturnText=f'{name}: contract secured. Return to the guild.',riskExplanation=f'{skulls}/5 danger: '+', '.join(names)+'.',battleback=bg,battlebackFolder='battlebacks1',intendedLevel=max(1,skulls-1),encounterTuning={}))
for quest in s['quests']:
 if quest['id']=='fantasy_01':
  quest.update(combatMode='none',enemyIds=[],skirmishEnemyIds=[],encounterType='Slime and ratman signs; avoid combat',knownConditions=['One-minute retrieval; no combat','Avoid the occupied drainage channel'],riskExplanation='1/5 danger: retrieve the key without disturbing nearby slimes and ratmen.')
write('RPGManagerStage3.json',s)
print(f'Installed {len(creatures)} enemy types and {len(missions)} contracts.')
