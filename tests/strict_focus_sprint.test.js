const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle'),V=require('../js/plugins/RPGManagerBattleStage');
const roster=require('../data/RPGManagerRoster.json'),content={...require('../data/RPGManagerQuests.json'),...require('../data/RPGManagerStage3.json'),presentation:require('../data/RPGManagerPresentation.json')};
const fresh=()=>P.createState(roster,()=>.5),clone=x=>JSON.parse(JSON.stringify(x));
function start(q,seed=1){const s=fresh();s.nextTripId=seed;s.campaignStats.questsCompleted=100;P.dispatchQuest(s,'A',q,undefined,1000);return s;}
for(const q of content.quests)test(`strict clock, extraction and peaceful minute: ${q.id}`,()=>{
 const s=start(q),t=s.trips.A;let battles=0,campTicks=0,elapsed=0;
 while(s.trips.A){
  const before=(t.chronicle||[]).filter(e=>e.type==='battle').length;
  P.tickRealtimeExpedition(s,1000,content,B.Battle,false,true);elapsed+=1000;
  const after=(t.chronicle||[]).filter(e=>e.type==='battle').length;
  if(after>before){battles+=after-before;assert.ok(t.remainingMs>=72000);assert.notEqual(t.phase,'campfire');assert.equal(t.returnNarrated,false);}
  if(t.phase==='campfire'){campTicks++;assert.equal(after,before);}
  if(t.remainingMs<=12000){assert.notEqual(t.presentationCurrent?.kind,'battle');assert.equal(t.presentationQueue.some(e=>e.kind==='battle'),false);if(!t.wiped)assert.equal(t.returnNarrated,true);}
  assert.ok(elapsed<=q.durationMinutes*60000);
 }
 assert.equal(elapsed,q.durationMinutes*60000);assert.ok(s.questResults);assert.equal(t.presentationCurrent,null);assert.equal(t.presentationQueue.length,0);
 if(q.durationMinutes===1){assert.equal(battles,0);assert.equal(s.questResults.xpPerMember,3);assert.ok(s.questResults.rewardGold<=5);}
 if(q.durationMinutes>=15&&!t.wiped&&!t.autoRetreat)assert.equal(campTicks,60);
 const gold=s.gold;P.completeReturn(s,'A',t.id,Date.now());assert.equal(s.gold,gold);
});
test('Recall requires confirmation; cancel is pure; confirm resolves playback and settles exactly once',()=>{
 const s=start(content.quests.find(q=>q.durationMinutes===3&&q.combatMode==='required')),t=s.trips.A;
 for(let i=0;i<25;i++)P.tickRealtimeExpedition(s,1000,content,B.Battle,false,true);
 const before=clone(s);assert.equal(P.endSessionEarly(s,t.id).confirmationRequired,true);assert.deepEqual(clone(s),before);
 assert.equal(P.endSessionEarly(s,t.id,true).ok,true);assert.equal(t.presentationCurrent,null);assert.equal(t.remainingMs,0);const once=clone(s);
 assert.equal(P.endSessionEarly(s,t.id,true).duplicate,true);assert.deepEqual(clone(s),once);assert.equal(s.questHistory.filter(r=>r.questId===t.id).length,1);
});
test('complete team wipe ends expedition activity while preserving session countdown',()=>{
 const s=start(content.quests.find(q=>q.durationMinutes===5&&q.combatMode==='required')),t=s.trips.A;
 const stage={id:'wipe_fixture',type:'battle',enemyIds:[]};t.stages.push(stage);t.stageIndex=t.stages.length-1;t.phase='battle';
 const fighters=t.preparedTeam.map(n=>({...clone(n),side:'player',key:`player:${n.id}`,health:0,alive:false}));
 P.recordBattleResult(s,'A',t.id,{status:'defeat',fighters},1000,fighters.map(f=>({type:'deathSave',key:f.key,survived:false})));
 assert.equal(t.wiped,true);assert.equal(t.remainingMs,300000);const count=t.chronicle.length;
 P.tickRealtimeExpedition(s,5000,content,B.Battle);assert.equal(t.remainingMs,295000);assert.equal(t.phase,'wipe');assert.equal(t.chronicle.length,count);assert.ok(s.trips.A);assert.equal(s.questResults,null);
});
test('96 choices map to unique, existing portrait, walking and independent combat assets',()=>{
 const catalogue=require('../data/RPGManagerArtV5.json'),keys=new Set(),walks=new Set(),combat=new Set();
 for(const c of P.ALL_CLASSES)for(const sex of P.SEXES){assert.equal(P.portraitOptions(c,sex).length,8);for(const portrait of P.portraitOptions(c,sex)){
  const m=catalogue.find(x=>x.key===portrait.key);assert.deepEqual(m.portrait,{sheet:portrait.sheet,index:portrait.index,columns:8,rows:2});
  assert.deepEqual(P.walkingPortrait(c,sex,portrait.key),m.walking);keys.add(portrait.key);walks.add(`${m.walking.sheet}:${m.walking.index}`);combat.add(m.combat.sheet);
  for(const [folder,sheet] of [['faces',m.portrait.sheet],['characters',m.walking.sheet],['sv_actors',m.combat.sheet]])assert.ok(fs.existsSync(`img/${folder}/${sheet}.webp`));
 }}assert.equal(keys.size,96);assert.equal(walks.size,96);assert.equal(combat.size,96);
});
test('loaded active, archive and replay identities refresh without combat or order mutation',()=>{
 const s=start(content.quests.find(q=>q.durationMinutes===3)),t=s.trips.A;const before=t.preparedTeam.map(n=>[n.id,n.health,n.armor]);
 s.lastReport={members:clone(t.preparedTeam)};s.expeditionReplay=clone(t);const loaded=P.upgradeState(clone(s));
 for(const group of [loaded.trips.A.preparedTeam,loaded.lastReport.members,loaded.expeditionReplay.preparedTeam]){assert.deepEqual(group.map(n=>[n.id,n.health,n.armor]),before);for(const n of group){assert.ok(n.portrait.sheet.endsWith('_v5'));assert.ok(n.combatPortrait.sheet.startsWith('RPGCombat_'));}}
});
test('level cap eight has increasing slow thresholds and bounded raw stats',()=>{
 assert.equal(P.LEVEL_CAP,8);const thresholds=[1,2,3,4,5,6,7].map(level=>P.xpRequired({level}));assert.deepEqual(thresholds,[30,150,360,650,1050,1600,2300]);assert.equal(P.xpRequired({level:8}),0);
 for(const classId of P.ALL_CLASSES){assert.deepEqual(P.classStats({classId,level:8}),P.classStats({classId,level:4}));assert.equal(P.powerTrack({classId,level:8}).length,8);}
});
test('wound titles explain exact shared stacking effects and permanence',()=>{
 for(const w of P.WOUND_DEFINITIONS){const line=P.woundLines({permanentWounds:[w.id]})[0];assert.ok(line.includes(w.name));assert.match(line,/Permanent/);assert.match(line,/0.97/);assert.match(line,/no extra stacks/);}
});
test('combat preserves canonical formation for a mixed front/back party',()=>{
 const s=fresh();s.roster[0].preferredPosition='back';s.roster[1].preferredPosition='front';const team=P.prepareTeam(s);const b=new B.Battle(team,[{...clone(team[0]),id:'enemy',name:'Enemy'}],{seed:1});assert.deepEqual(b.snapshot().fighters.filter(n=>n.side==='player').map(n=>n.id),team.map(n=>n.id));
});
test('broken gear stays broken through return, stock, save/load, equip and paid repair',()=>{
 let s=fresh(),n=s.roster.find(n=>n.classId==='knight')||s.roster[0];n.classId='knight';s.gold=500;s.equipmentStock.chainmail=1;assert.equal(P.equipSlot(s,n.id,'chainmail','body').ok,true);
 n.equipmentCondition.chainmail={current:0,max:P.SHOP.chainmail.armor,broken:true};P.restoreReturnArmor(n);assert.equal(n.equipmentCondition.chainmail.current,0);
 assert.equal(P.equipSlot(s,n.id,null,'body').ok,true);s=P.upgradeState(clone(s));n=s.roster.find(x=>x.id===n.id);assert.equal(P.equipSlot(s,n.id,'chainmail','body').ok,true);assert.equal(n.equipmentCondition.chainmail.broken,true);
 const gold=s.gold;assert.equal(P.repairGear(s,n.id,'chainmail').ok,true);assert.equal(s.gold,gold-Math.ceil(P.SHOP.chainmail.price*.35));assert.equal(n.equipmentCondition.chainmail.current,P.SHOP.chainmail.armor);const once=s.gold;assert.equal(P.repairGear(s,n.id,'chainmail').ok,false);assert.equal(s.gold,once);
});
test('class support, control and area powers produce bounded deterministic event logs',()=>{
 for(const classId of P.ALL_CLASSES){const s=fresh();for(const n of s.roster){n.classId=classId;n.level=8;P.ensureLife(n);n.health=n.maxHealth;}
  const team=P.prepareTeam(s),enemies=team.map((n,i)=>({...clone(n),id:`e${i}`,name:`Enemy ${i}`,classId:'enemy',health:24,maxHealth:24,armor:4,signatureUnlocks:0,damage:1}));
  const a=new B.Battle(team,enemies,{seed:13,maxActions:180}),b=new B.Battle(team,enemies,{seed:13,maxActions:180});while(a.snapshot().status==='running')a.step();while(b.snapshot().status==='running')b.step();assert.deepEqual(a.events,b.events);assert.ok(a.snapshot().actions<=180);
  if(classId==='cleric')assert.ok(a.events.some(e=>['support','heal'].includes(e.type)&&e.side==='player'));
  if(['mage','barbarian','ranger'].includes(classId))assert.ok(a.events.some(e=>e.secondary));
 }
});
test('danger labels and UI use skulls, visible Recall, slot pages and safe camp entry',()=>{
 assert.deepEqual([...new Set(content.quests.map(P.dangerRating))].sort(),[1,2,3,4,5]);
 for(const q of content.quests)assert.match(P.dangerLabel(q),/☠/);
 const ui=fs.readFileSync('js/plugins/RPGManager.js','utf8');assert.ok(!ui.includes('Armory'));assert.match(ui,/focus-recall/);assert.match(ui,/reopenSheet=false/);assert.match(ui,/shop-slot-tabs/);assert.match(ui,/setHandler\("repair"/);
});
test('unseen or stalled battle playback resolves to final fighter state before extraction',()=>{
 const s=start(content.quests.find(q=>q.durationMinutes===3&&q.combatMode==='required')),t=s.trips.A;
 while(!t.battleSnapshot)P.tickRealtimeExpedition(s,1000,content,B.Battle,false,false);
 const end=t.battlePresentationDeadlineMs;assert.ok(end>t.elapsedMs);t.presentationHoldMs=999999;
 while(t.elapsedMs<end)P.tickRealtimeExpedition(s,1000,content,B.Battle,false,false);
 assert.equal(t.presentationCurrent,null);assert.ok(t.presentationQueue.every(e=>e.kind!=="battle"));assert.deepEqual(t.presentationFighters,t.battleSnapshot.fighters);assert.ok(t.remainingMs>=12000);
});
test('signature gates are L3/L6, while all levels keep their own refinement',()=>{
 for(const classId of P.ALL_CLASSES){const n=fresh().roster[0];n.classId=classId;for(let level=1;level<=8;level++){n.level=level;P.ensureLife(n);assert.equal(n.signatureUnlocks,level>=6?2:level>=3?1:0);assert.equal(P.powerTrack(n).length,level);}}
});
test('Cleric support does not erase a pre-existing stronger ritual ward or resurrect allies',()=>{
 const s=fresh();for(const n of s.roster){n.classId='cleric';n.level=8;P.ensureLife(n);n.health=n.maxHealth;n.temporaryWard=4;}
 const team=P.prepareTeam(s),enemy={...clone(team[0]),id:'foe',name:'Foe',classId:'enemy',speed:1};team[0].speed=100;
 const b=new B.Battle(team,[enemy],{seed:1});b.step();assert.ok(b.snapshot().fighters.filter(n=>n.side==='player').every(n=>n.temporaryWard>=4));
 const dead=b._fighters.find(n=>n.id===team[1].id);dead.health=0;dead.alive=false;for(let i=0;i<6&&b.snapshot().status==='running';i++)b.step();assert.equal(dead.health,0);
});
test('the simulation action limit also bounds unusual high-HP enemy groups',()=>{
 const team=P.prepareTeam(fresh()).map(n=>({...n,health:999,maxHealth:999,armor:999,temporaryWard:999}));
 const enemies=team.map((n,i)=>({...clone(n),id:`e${i}`,name:`Slow ${i}`,classId:'enemy'})),battle=new B.Battle(team,enemies,{seed:123,maxActions:180});
 while(battle.snapshot().status==='running')battle.step();assert.equal(battle.snapshot().status,'draw');assert.equal(battle.snapshot().actions,180);assert.equal(battle.events.at(-1).reason,'action-limit');
});
test('Hunters Opening transfers a consumed mark once with reduced reliability',()=>{
 const s=fresh(),n=s.roster[0];n.classId='ranger';n.level=8;P.ensureLife(n);const actor={...P.prepareTeam(s)[0],speed:100,critChance:0,damage:1};
 const foes=[0,1,2].map(i=>({...clone(actor),id:`mark-${i}`,name:`Marked ${i}`,classId:'enemy',speed:1,health:i===0?1:20,maxHealth:20,armor:0,innateWard:0,temporaryWard:0,dodgeChance:0}));
 const b=new B.Battle([actor],foes,{seed:1}),first=b._fighters.find(n=>n.id==='mark-0'),second=b._fighters.find(n=>n.id==='mark-1'),third=b._fighters.find(n=>n.id==='mark-2');first.marked=true;
 b._random=()=>.99;const target=b._target.bind(b);b._target=a=>({...target(a),target:first.health>0?first:second});
 b.step();assert.equal(second.marked,true);assert.equal(second.markedReduced,true);assert.equal(b._fighters[0].capstoneSpent,true);
 second.health=1;b._queue=[b._fighters[0]];const hit=b.step().find(e=>e.type==='attack'&&e.actorKey===b._fighters[0].key);assert.equal(hit.rawDamage,1);assert.equal(third.marked,undefined);
});
test('a skipped turn at the action limit also finishes deterministically',()=>{
 const team=P.prepareTeam(fresh()),foe={...clone(team[0]),id:'foe',name:'Foe'},b=new B.Battle(team,[foe],{seed:1,maxActions:1});b._fighters[0].skipTurns=1;b._queue=[b._fighters[0]];b.step();assert.equal(b.snapshot().actions,1);assert.equal(b.snapshot().status,'draw');assert.equal(b.events.at(-1).reason,'action-limit');
});
