const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle'),V=require('../js/plugins/RPGManagerBattleStage'),roster=require('../data/RPGManagerRoster.json');
const content={...require('../data/RPGManagerQuests.json'),...require('../data/RPGManagerStage3.json'),presentation:require('../data/RPGManagerPresentation.json')},fresh=()=>P.createState(roster,()=>.5),clone=x=>JSON.parse(JSON.stringify(x));
test('camp timer allows custom minutes, rings once, survives load, and stops on quest dispatch',()=>{
 const s=fresh();assert.equal(P.startCampTimer(s,0).ok,false);assert.equal(P.startCampTimer(s,1.25).ok,true);P.tickCampTimer(s,74999);assert.equal(s.campTimer.remainingMs,1);const loaded=P.upgradeState(clone(s));P.tickCampTimer(loaded,1);assert.equal(P.consumeCampBell(loaded),true);assert.equal(P.consumeCampBell(loaded),false);P.tickCampTimer(loaded,100000);assert.equal(P.consumeCampBell(loaded),false);
 P.startCampTimer(s,137);P.dispatchQuest(s,'A',content.quests[0],undefined,1000);assert.equal(s.campTimer.active,false);assert.equal(s.campTimer.pendingBell,false);assert.equal(s.campTimer.stopReason,'quest_started');
});
for(const q of content.quests.filter(q=>q.durationMinutes>1&&q.combatMode!=='none'))test(`ten-second warning and atomic opening: ${q.id}`,()=>{
 const s=fresh();s.campaignStats.questsCompleted=100;P.dispatchQuest(s,'A',q,undefined,1000);const t=s.trips.A;let warningStart=null,seen=0;
 while(s.trips.A){const count=t.chronicle.filter(e=>e.type==='battle').length;P.tickRealtimeExpedition(s,1000,content,B.Battle,false,false);if(t.wiped||t.autoRetreat)break;
  if(t.presentationCurrent?.sourceType==='approach'){assert.equal(t.presentationCurrent.text,'Something approaches...');warningStart??=t.elapsedMs;assert.equal(t.presentationQueue.length,0);}
  const after=t.chronicle.filter(e=>e.type==='battle').length;
  if(after>count){const plan=t.encounterPlan.find(p=>p.done&&!p.checked);plan.checked=true;if(plan.stage.randomEncounter){assert.equal(t.elapsedMs-warningStart,10000);seen++;}warningStart=null;assert.equal(t.presentationCurrent.kind,'battle');assert.ok(t.presentationFighters.some(n=>n.side==='enemy'));if(t.presentationCurrent.fighters)assert.deepEqual(t.presentationFighters,t.presentationCurrent.fighters);}
  if(t.wiped||t.autoRetreat)break;
 }assert.ok(seen>0||t.encounterPlan.every(p=>!p.stage.randomEncounter));
});
test('healing removes an actual random wound, preserves earned traits, clears Wounded after last wound',()=>{
 const s=fresh(),n=s.roster[0];s.arcana=100;s.ritualsUnlocked.healing_ritual=true;P.applyWound(s,n.id);n.permanentWounds=['missing_eye','bad_knee'];n.earnedTraits=['hardened'];n.lastingInjuries=2;
 const first=P.ritualCast(s,'healing_ritual',n.id,'made_up_wound');assert.equal(first.ok,true);assert.ok(['missing_eye','bad_knee'].includes(first.wound));assert.equal(n.permanentWounds.length,1);assert.equal(n.lastingInjuries,1);assert.equal(n.condition,'Wounded');assert.deepEqual(n.earnedTraits,['hardened']);
 assert.equal(P.ritualCast(s,'healing_ritual',n.id).ok,true);assert.deepEqual(n.permanentWounds,[]);assert.equal(n.condition,'Healthy');assert.equal(n.injury,null);assert.equal(n.lastingInjuries,0);const after=clone(s);assert.equal(P.ritualCast(s,'healing_ritual',n.id).ok,false);assert.deepEqual(s,after);
});
test('replacement is atomic, returns gear, removes outgoing member and preserves slot',()=>{
 const s=fresh(),old=s.roster[1],slot=s.activeSlots.indexOf(old.id);s.equipmentStock.thick_fur_cloak=1;P.equipSlot(s,old.id,'thick_fur_cloak','body');const stock=clone(s.equipmentStock),draft={classId:'mage',sex:'female',name:'Replacement',portraitKey:P.portraitOptions('mage','female')[7].key},before=clone(s);
 assert.equal(P.replaceCreated(s,old.id,draft).confirmationRequired,true);assert.deepEqual(s,before);assert.equal(P.replaceCreated(s,old.id,{...draft,portraitKey:'bad'},true).ok,false);assert.deepEqual(s,before);
 assert.equal(P.replaceCreated(s,old.id,draft,true).ok,true);assert.equal(s.roster.some(n=>n.id===old.id),false);assert.equal(P.activeRoster(s).length,3);assert.equal(s.roster.find(n=>n.id===s.activeSlots[slot]).name,'Replacement');assert.equal(s.equipmentStock.thick_fur_cloak,stock.thick_fur_cloak+1);
 const once=clone(s);assert.equal(P.replaceCreated(s,old.id,draft,true).ok,false);assert.deepEqual(s,once);
});
test('resurrection preserves powers/XP/wounds and replaces only after final confirmation',()=>{
 const s=fresh(),outgoing=s.roster[1],dead=clone(s.roster[0]);dead.id='fallen';dead.name='Fallen Knight';dead.level=7;dead.xp=155;dead.permanentWounds=['bad_knee'];dead.lastingInjuries=2;s.roster.push(dead);P.applyDeath(s,dead.id);const snapshot=clone(dead);s.arcana=200;s.ritualsUnlocked.reanimate=true;
 const before=clone(s);assert.equal(P.ritualCast(s,'reanimate',dead.id).confirmationRequired,true);assert.deepEqual(s,before);
 assert.equal(P.ritualCast(s,'reanimate',dead.id,{replaceId:outgoing.id,confirmed:true}).ok,true);const raised=s.roster.find(n=>n.id===dead.id);assert.equal(s.roster.some(n=>n.id===outgoing.id),false);assert.equal(P.activeRoster(s).length,3);assert.equal(P.classLabel(raised),'Zombie Knight');assert.equal(raised.level,7);assert.equal(raised.xp,155);assert.deepEqual(raised.permanentWounds,snapshot.permanentWounds);assert.equal(raised.lastingInjuries,2);assert.equal(s.arcana,150);assert.ok(raised.walkPortrait.sheet.includes('Skeleton_knight'));assert.ok(raised.combatPortrait.sheet.includes('Skeleton_knight'));assert.equal(raised.condition,'Wounded');
 const loaded=P.upgradeState(clone(s));assert.equal(P.classLabel(loaded.roster.find(n=>n.id===dead.id)),'Zombie Knight');assert.equal(P.ritualCast(s,'reanimate',dead.id,{replaceId:s.activeSlots[0],confirmed:true}).ok,false);assert.equal(s.arcana,150);
});
test('dead enemies disappear and player fallen motion uses prone art',()=>{
 const stage=new V.Stage({get art(){throw Error('should not draw dead enemy');}});assert.doesNotThrow(()=>stage.battler({}, {side:'enemy'}, {health:0}, {}));
 const fighters=[{key:'player:a',side:'player',health:0,maxHealth:5,presentationLifeState:'saved',portrait:{sheet:'RPGPortrait_knight_v5'}},{key:'enemy:a',side:'enemy',health:0,maxHealth:5}],t={presentationFighters:fighters,presentationCurrent:{kind:'battle',sourceType:'round'},presentationHoldMs:500,presentationDurationMs:1000},frame=new V.Animator().update(t,V.layout(784,460,fighters));assert.equal(frame.poses.get('player:a').motion,17);assert.equal(frame.poses.get('player:a').angle,0);assert.equal(frame.poses.get('enemy:a').alpha,0);
});
test('ten new contracts fill missing duration/skull combinations',()=>{assert.equal(content.quests.length,41);for(const [minutes,skulls] of [[3,4],[5,4],[15,2],[25,2],[25,4],[30,2],[30,4]])assert.ok(content.quests.some(q=>q.durationMinutes===minutes&&P.dangerRating(q)===skulls));});
test('96 cleaned identity mappings and six skeleton class models resolve',()=>{
 const art=require('../data/RPGManagerArtV5.json');assert.equal(art.length,96);for(const a of art){assert.equal(P.portraitOptions(a.classId,a.sex).find(p=>p.key===a.key).sheet,a.portrait.sheet);for(const [kind,folder] of [['portrait','faces'],['walking','characters'],['combat','sv_actors'],['fallen','characters']])assert.ok(fs.existsSync(`img/${folder}/${a[kind].sheet}.webp`));}
 for(const classId of P.ALL_CLASSES){const n={classId,reanimated:true};P.normalizeUndead(n);assert.ok(fs.existsSync(`img/characters/${n.walkPortrait.sheet}.webp`));assert.ok(fs.existsSync(`img/sv_actors/${n.combatPortrait.sheet}.webp`));}
});
