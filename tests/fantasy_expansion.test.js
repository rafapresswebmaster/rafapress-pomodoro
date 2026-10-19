const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../js/plugins/RPGManagerProgression'),content={...require('../data/RPGManagerQuests.json'),...require('../data/RPGManagerStage3.json')},roster=require('../data/RPGManagerRoster.json');
const B=require('../js/plugins/RPGManagerBattle'),V=require('../js/plugins/RPGManagerBattleStage');
const quests=content.quests.filter(q=>q.id.startsWith('fantasy_')),enemies=content.enemies.filter(e=>e.enemyArt?.sheet==='RPGFantasyEnemies_v6');
test('20 distinct new types are reachable in 15 varied, valid contracts',()=>{
 assert.equal(enemies.length,20);assert.equal(quests.length,15);
 assert.equal(new Set(quests.map(q=>q.battleback)).size,15);
 for(const c of ['Errands','Short','Fieldwork','Hunt','Boss Hunt'])assert.equal(quests.filter(q=>q.category===c).length,3);
 assert.deepEqual([...new Set(quests.map(q=>q.difficulty))].sort(),['Easy','Hard','Normal']);
 for(const e of enemies)assert.ok(quests.some(q=>q.enemyIds.includes(e.id)),e.id);
 for(const q of quests){
  assert.ok(fs.existsSync(`img/${q.battlebackFolder}/${q.battleback}.webp`));
  assert.ok(q.combatMode==='none'||q.enemyIds.length>=2);assert.ok(q.skirmishEnemyIds.every(id=>!['wyrmling','pirate_captain','hill_giant'].includes(id)));
  const stages=P.buildJourneyStages(q,'fantasy-check');
  for(const stage of stages.filter(s=>s.type==='battle')){const loaded=P.encounterEnemies(stage,content,q);assert.ok(loaded.length>=stage.enemyIds.length);for(const e of loaded)assert.ok(e.health>0);}
 }
 for(const id of ['wyrmling','pirate_captain'])assert.ok(content.enemies.find(e=>e.id===id).boss);
});
test('every new contract dispatches, has encounter content, and survives save migration',()=>{
 for(const q of quests){const s=P.createState(roster,()=>.5);s.campaignStats.questsCompleted=100;
  const result=P.dispatchQuest(s,'A',q,content.xp,1000);assert.ok(s.trips.A,`${q.id}: ${result}`);
  const t=s.trips.A;assert.equal(t.stages.some(x=>x.mainQuest),q.combatMode!=='none');assert.equal(t.lockedBackground.name,q.battleback);
  const plan=P.encounterPlan(t);for(const p of plan.filter(p=>p.stage.smallSkirmish&&!p.stage.jester))assert.ok(p.stage.enemyIds.every(id=>q.skirmishEnemyIds.includes(id)),q.id+' patrol includes an objective boss');
  const loaded=P.upgradeState(JSON.parse(JSON.stringify(s)));assert.equal(loaded.trips.A.questId,q.id);
 }
});
test('all 96 undead appearances retain individual identity and have complete assets',()=>{
 const combat=new Set();
 for(const cls of P.ALL_CLASSES)for(const sex of P.SEXES)for(const option of P.portraitOptions(cls,sex)){
  const npc={classId:cls,sex,reanimated:true,portraitKey:option.key};P.normalizeUndead(npc);
  assert.equal(npc.portraitKey,option.key);assert.equal(npc.portrait.index,option.index%8);
  assert.equal(npc.walkPortrait.index,option.index%8);combat.add(npc.combatPortrait.sheet);
  for(const [folder,key] of [['faces','portrait'],['characters','walkPortrait'],['characters','fallenPortrait'],['sv_actors','combatPortrait']])assert.ok(fs.existsSync(`img/${folder}/${npc[key].sheet}.webp`),npc[key].sheet);
  const once=JSON.stringify(npc);P.normalizeUndead(npc);assert.equal(JSON.stringify(npc),once);
 }
 assert.equal(combat.size,96);
});
test('resurrection and save migration preserve all 96 original portrait selections',()=>{
 for(const cls of P.ALL_CLASSES)for(const sex of P.SEXES)for(const option of P.portraitOptions(cls,sex)){
  const s=P.createState(roster,()=>.5),n=s.roster[0];Object.assign(n,{classId:cls,sex,portraitKey:option.key,portrait:{...option}});
  s.arcana=1000;s.ritualsUnlocked.reanimate=true;P.applyDeath(s,n.id);
  const result=P.ritualCast(s,'reanimate',n.id);assert.ok(result.ok,result.message);
  const saved=P.upgradeState(JSON.parse(JSON.stringify(s))).roster.find(x=>x.id===n.id);
  assert.equal(saved.portraitKey,option.key);assert.equal(saved.portrait.index,option.index%8);assert.equal(saved.combatPortrait.sheet,n.combatPortrait.sheet);
 }
});
test('all new enemies resolve in the battle simulator and use their dedicated artwork',()=>{
 for(const e of enemies){
  assert.equal(V.enemyCell(e),null);
  const s=P.createState(roster,()=>.5),foes=P.encounterEnemies({enemyIds:[e.id]},content);
  const battle=new B.Battle(P.activeRoster(s),foes,{seed:42});let rounds=0;
  while(battle.snapshot().status==='running'&&rounds++<500)battle.step();
  assert.notEqual(battle.snapshot().status,'running',e.id);
 }
});
test('switching camp companions preserves Gear and other selected tabs',()=>{
 const src=fs.readFileSync('js/plugins/RPGManager.js','utf8'),start=src.indexOf('        openMember(id){'),end=src.indexOf('        drawCampSheet',start);
 const open=vm.runInNewContext(`({${src.slice(start,end)}}).openMember`,{Scene_RPGHome:{}});
 const scene={_commandWindow:{deactivate(){}},drawCampSheet(){}};
 open.call(scene,'first');assert.equal(scene._sheetTab,'Overview');scene._sheetTab='Gear';open.call(scene,'second');assert.equal(scene._sheetTab,'Gear');assert.equal(scene._sheetId,'second');
});
