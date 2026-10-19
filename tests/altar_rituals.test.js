const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const P=require('../js/plugins/RPGManagerProgression'),{Battle}=require('../js/plugins/RPGManagerBattle'),roster=require('../data/RPGManagerRoster.json'),content={...require('../data/RPGManagerQuests.json'),...require('../data/RPGManagerStage3.json')};
const clone=x=>JSON.parse(JSON.stringify(x)),fresh=()=>{const s=P.createState(roster,()=>.5);s.arcana=5000;s.campaignStats.questsCompleted=100;return s;};
const unlocked=(s,id)=>s.ritualsUnlocked[id]=true;
function cast(s,id,target){unlocked(s,id);const r=P.ritualCast(s,id,target);assert.ok(r.ok,r.message);return r;}
function depart(s,q=content.quests.find(q=>q.id==='fantasy_02')){P.dispatchQuest(s,'A',q,content.xp,1000,null,null,null,null,P.activeRoster(s).slice(0,3).map(n=>n.id));return s.trips.A;}
function settle(s,t,status='victory'){t.phase='return';t.deadlineMs=1000;t.battleSnapshot={status,fighters:t.preparedTeam.map(n=>({...clone(n),side:'player',alive:n.health>0}))};return P.completeReturn(s,'A',t.id,1000);}
function record(s,t,status='victory',players=t.preparedTeam,events=[]){t.stages.push({id:'test-'+t.stages.length,type:'battle',mainQuest:false,enemyIds:['slime']});t.stageIndex=t.stages.length-1;t.phase='battle';return P.recordBattleResult(s,'A',t.id,{status,fighters:players.map(n=>({...clone(n),side:'player',alive:n.health>0})),ritualEffects:clone(t.ritualEffects)},1000,events);}
const unit=(id,extra={})=>({id,name:id,role:'Warrior',level:1,health:30,maxHealth:30,attack:1,damage:1,defense:0,speed:10,intelligence:'Normal',position:'Front',dodgeChance:0,alive:true,basicAttack:'Strike',signatureAttack:'Special',passiveTrait:{name:'Steady',description:'Steady'},...extra});
function fight(effects={},player={},enemy={}){const b=new Battle([unit('hero',player)],[unit('foe',{speed:1,...enemy})],{seed:42,ritualEffects:effects});b._random=()=>.99;return b;}

test('fourteen personalized free-entry unlock quests match power levels and only victories unlock',()=>{
 assert.equal(Object.keys(P.RITUALS).length,14);const ids=new Set();
 for(const [id,r] of Object.entries(P.RITUALS)){
  assert.ok(!('unlockCost' in r));assert.ok(r.castCost>0);assert.ok(r.level>=2&&r.level<=8);assert.ok(!ids.has(r.questId));ids.add(r.questId);
  const q=content.quests.find(q=>q.id===r.questId);assert.ok(q,r.questId);assert.equal(q.intendedLevel,r.level);assert.ok(q.enemyIds.every(id=>content.enemies.some(e=>e.id===id)));assert.ok(fs.existsSync(`img/${q.battlebackFolder}/${q.battleback}.webp`));
  for(const outcome of ['victory','draw','defeat']){const s=fresh(),arcana=s.arcana,gold=s.gold;assert.equal(P.ritualUnlock(s,id).ok,false);assert.equal(s.arcana,arcana);
   const t=depart(s,q);assert.equal(s.arcana,arcana);assert.equal(s.gold,gold);const report=settle(s,t,outcome);assert.equal(!!s.ritualsUnlocked[id],outcome==='victory');assert.equal(report.ritualUnlocks.includes(r.name),outcome==='victory');
   assert.deepEqual(P.completeReturn(s,'A',t.id,2000),report);
  }
 }
 assert.equal(P.RITUALS.greed_prayer.castCost,100);
});
test('legacy paid unlocks are removed while quest-earned unlocks and pending effects survive migration',()=>{
 const s=fresh();s.ritualsUnlocked={reanimate:true};delete s.ritualUnlockVersion;s.questHistory=[{questDefinitionId:'ritual_warding',outcome:'victory'}];
 const loaded=P.upgradeState(clone(s));assert.equal(loaded.ritualsUnlocked.reanimate,undefined);assert.equal(loaded.ritualsUnlocked.protection_ward,true);
 cast(loaded,'battle_hymn');const again=P.upgradeState(clone(loaded));assert.equal(again.ritualEffects.battle_hymn,true);assert.equal(again.ritualsUnlocked.protection_ward,true);
});
test('casts charge only once, reject locked/invalid/duplicate/away uses, and keep timers intact',()=>{
 const s=fresh(),before=s.arcana;assert.equal(P.ritualCast(s,'first_strike').ok,false);assert.equal(s.arcana,before);cast(s,'first_strike');const paid=s.arcana;assert.equal(P.ritualCast(s,'first_strike').ok,false);assert.equal(s.arcana,paid);
 const t=depart(s),clock=t.totalDurationMs;assert.equal(t.ritualEffects.first_strike,true);assert.equal(s.ritualEffects.first_strike,undefined);unlocked(s,'greed_prayer');assert.equal(P.ritualCast(s,'greed_prayer').ok,false);assert.equal(t.totalDurationMs,clock);assert.equal(clock,t.durationMinutes*60000);
});
test('Warding and Familiar absorb entire hits shared across the party, one charge each',()=>{
 const b=fight({protection_ward:true,familiars_vigil:true},{speed:1},{speed:20,damage:12,signatureDamage:12});
 for(let i=0;i<20&&b.events.filter(e=>e.type==='attack'&&e.side==='enemy').length<3;i++)b.step();
 const attacks=b.events.filter(e=>e.type==='attack'&&e.side==='enemy');assert.equal(attacks[0].damage,0);assert.equal(attacks[1].damage,0);assert.equal(attacks[2].damage,12);assert.equal(b.snapshot().ritualEffects.protection_ward,undefined);assert.equal(b.snapshot().ritualEffects.familiars_vigil,undefined);
});
test('Healing removes exactly one permanent wound/stack without healing HP; Greed trades 100 for 100',()=>{
 const s=fresh(),n=s.roster[0];n.permanentWounds=['bad_knee','scarred'];n.lastingInjuries=2;n.health=1;n.injury='Wounded';n.condition=P.CONDITIONS.WOUNDED;
 cast(s,'healing_ritual',n.id);assert.equal(n.permanentWounds.length,1);assert.equal(n.lastingInjuries,1);assert.equal(n.health,1);cast(s,'healing_ritual',n.id);assert.equal(n.permanentWounds.length,0);assert.equal(n.injury,null);assert.equal(n.health,1);
 const before=s.arcana;assert.equal(P.ritualCast(s,'healing_ritual',n.id).ok,false);assert.equal(s.arcana,before);const gold=s.gold;cast(s,'greed_prayer');assert.equal(s.arcana,before-100);assert.equal(s.gold,gold+100);
});
test('Reanimate preserves living class stats and appearance, heals normally, never levels, and cannot be recast after death',()=>{
 const s=fresh(),n=s.roster[0];n.level=4;P.ensureLife(n);const hp=n.maxHealth,armor=n.classArmorMax,ward=n.innateWardMax,key=n.portraitKey,level=n.level;
 P.applyDeath(s,n.id);cast(s,'reanimate',n.id);assert.equal(n.reanimated,true);assert.equal(n.health,hp);assert.equal(n.classArmor,armor);assert.equal(n.innateWard,ward);assert.equal(n.portraitKey,key);assert.ok(n.combatPortrait.sheet.includes('Skeleton'));
 n.health=1;s.supplies.potion=1;assert.ok(P.useItem(s,n.id,'potion').ok);assert.ok(n.health>1);assert.equal(P.debugLevel(s,n.id,1).ok,false);
 const t=depart(s);settle(s,t);assert.equal(n.level,level);P.applyDeath(s,n.id);assert.equal(n.reanimationExhausted,true);const before=s.arcana;assert.equal(P.ritualCast(s,'reanimate',n.id).ok,false);assert.equal(s.arcana,before);assert.ok(P.graveyard(s).some(x=>x.id===n.id));
 const again=P.upgradeState(clone(s));assert.equal(again.roster.find(x=>x.id===n.id).reanimationExhausted,true);
});
test('a skeleton knockout is death even if a supplied death coin says survival',()=>{
 const s=fresh(),n=s.roster[0];P.applyDeath(s,n.id);cast(s,'reanimate',n.id);const t=depart(s),players=clone(t.preparedTeam);players.find(p=>p.id===n.id).health=0;
 record(s,t,'defeat',players,[{type:'deathSave',key:'player:'+n.id,survived:true}]);assert.equal(n.condition,P.CONDITIONS.DEAD);assert.equal(n.reanimationExhausted,true);
});
test('Fortune grants 25% coins with no ward requirement or penalty',()=>{
 const s=fresh();s.roster[0].temporaryWard=1;cast(s,'fortunes_favor');const normal=P.prepareTeam(s,P.activeRoster(s).map(n=>n.id)),wards=normal.reduce((v,n)=>v+n.innateWard+n.temporaryWard,0);const t=depart(s);
 assert.equal(t.preparedTeam.reduce((v,n)=>v+n.innateWard+n.temporaryWard,0),wards);const base=t.rewardGold.victory;t.pendingRewards.gold=4;const report=settle(s,t);assert.equal(report.rewardGold,Math.floor((base+4)*1.25));
});
test('Battle Hymn and First Strike alter real attack damage and expire at their specified scopes',()=>{
 const b=fight({battle_hymn:true,first_strike:true});for(let i=0;i<8;i++)b.step();const attacks=b.events.filter(e=>e.type==='attack'&&e.side==='player');assert.equal(attacks[0].rawDamage,4);assert.equal(attacks[1].rawDamage,2);assert.equal(b.snapshot().ritualEffects.first_strike,undefined);
 const s=fresh();cast(s,'battle_hymn');cast(s,'first_strike');cast(s,'protection_ward');cast(s,'familiars_vigil');const t=depart(s,content.quests.find(q=>q.durationMinutes===1));settle(s,t);assert.equal(s.ritualEffects.battle_hymn,true);assert.equal(s.ritualEffects.protection_ward,true);assert.equal(s.ritualEffects.first_strike,undefined);assert.equal(s.ritualEffects.familiars_vigil,undefined);
 const next=depart(s);record(s,next);assert.equal(next.ritualEffects.battle_hymn,undefined);
});
test('Veil rescues the first actual death at 1 HP once, not an ordinary survived knockout',()=>{
 const b=fight({veil_of_mercy:true},{health:2,maxHealth:2,speed:1},{speed:20,damage:9});const ev=b.step();assert.ok(ev.some(e=>e.type==='mercy'));assert.equal(b.snapshot().fighters[0].health,1);assert.equal(b.snapshot().fighters[0].alive,true);assert.equal(b.snapshot().ritualEffects.veil_of_mercy,undefined);assert.ok(!ev.some(e=>e.type==='defeat'&&e.side==='player'));
 while(b.snapshot().status==='running')b.step();assert.equal(b.events.filter(e=>e.type==='mercy').length,1);
 const ordinary=fight({veil_of_mercy:true},{health:1,maxHealth:1,speed:1},{speed:20,damage:9});ordinary._random=()=>.4;ordinary.step();assert.equal(ordinary.snapshot().ritualEffects.veil_of_mercy,true);assert.ok(!ordinary.events.some(e=>e.type==='mercy'));
});
test('Veil serious wounds persist, do not incapacitate the saved adventurer, and do not duplicate on replay',()=>{
 const s=fresh();cast(s,'veil_of_mercy');const t=depart(s),n=s.roster[0],players=clone(t.preparedTeam);players[0].health=0;
 record(s,t,'victory',players,[{type:'deathSave',key:'player:'+n.id,survived:false}]);assert.equal(n.health,1);assert.equal(n.lastingInjuries,1);assert.equal(n.permanentWounds.length,1);assert.equal(t.preparedTeam[0].alive,true);assert.equal(t.preparedTeam[0].health,1);assert.equal(t.ritualEffects.veil_of_mercy,undefined);
 const again=P.upgradeState(clone(s)),loaded=again.roster.find(x=>x.id===n.id);assert.equal(loaded.lastingInjuries,1);settle(again,again.trips.A);assert.equal(loaded.health,1);assert.equal(loaded.permanentWounds.length,1);
});
test('Last Rites returns a fallen adventurer with 1 HP and an injury, preserving living identity',()=>{
 const s=fresh(),n=s.roster[0];n.classArmor=0;n.innateWard=0;P.applyDeath(s,n.id);cast(s,'last_rites',n.id);assert.equal(n.health,1);assert.ok(n.injury);assert.equal(n.classArmor,0);assert.equal(n.innateWard,0);assert.equal(n.reanimated,undefined);assert.ok(P.activeRoster(s).some(x=>x.id===n.id));
});
test('Oath adds one consumable armor to only the chosen member without damaging equipment or altering targeting',()=>{
 const s=fresh(),n=s.roster[0],base=n.classArmor;cast(s,'oath_of_vanguard',n.id);const t=depart(s),member=t.preparedTeam[0];assert.equal(member.armor,base+P.equipmentArmor(n)+1);assert.equal(member.ritualArmor,1);assert.ok(t.preparedTeam.slice(1).every(n=>!n.ritualArmor));assert.equal(member.protected,undefined);
 const loaded=P.upgradeState(clone(s));assert.equal(loaded.trips.A.preparedTeam[0].ritualArmor,1);assert.equal(loaded.trips.A.preparedTeam[0].armor,member.armor);
 const players=clone(t.preparedTeam);players[0].armor--;players[0].ritualArmor=0;record(s,t,'victory',players);assert.equal(n.classArmor,base);assert.equal(t.preparedTeam[0].ritualArmor,0);settle(s,t);assert.equal(n.classArmor,base);
});
test('Rebate and Offering settle actual battle wins once, suppressing all quest coins including finds',()=>{
 const s=fresh();cast(s,'arcane_rebate');cast(s,'arcane_offering');const t=depart(s);record(s,t);record(s,t,'draw');record(s,t);assert.equal(t.ritualBattlesWon,2);const same=clone(t.battleSnapshot);P.recordBattleResult(s,'A',t.id,same,1000);assert.equal(t.ritualBattlesWon,2);
 t.pendingRewards.gold=30;t.pendingRewards.arcana=7;const expected=t.rewardArcana.victory+7+50+24,before=s.arcana;const report=settle(s,t);assert.equal(report.rewardGold,0);assert.equal(report.rewardArcana,expected);assert.equal(s.arcana,before+expected);P.completeReturn(s,'A',t.id,2000);assert.equal(s.arcana,before+expected);
});
test('recall pays accrued ritual effects once, does not unlock quests, and preserves the running timer',()=>{
 const s=fresh();cast(s,'arcane_rebate');cast(s,'arcane_offering');const t=depart(s,content.quests.find(q=>q.id==='ritual_mercy'));record(s,t);t.pendingRewards.gold=50;const time=t.remainingMs;P.requestRecall(s);assert.equal(t.remainingMs,time);const before=s.arcana;const result=P.recallExpedition(s);assert.ok(result.ok);assert.equal(result.keptGold,0);assert.equal(result.keptArcana,62);assert.equal(s.arcana,before+62);assert.equal(s.ritualsUnlocked.veil_of_mercy,undefined);assert.equal(P.recallExpedition(s).ok,false);
});
test('Quickening uses seeded 25% rolls per adventurer, permits exactly two specials, and never unlocks abilities',()=>{
 let doubled=0;for(let seed=0;seed<1000;seed++){const b=new Battle([unit('hero',{classId:'knight',level:3,signatureUnlocks:1})],[unit('foe')],{seed,ritualEffects:{quickening_prayer:true}});if(b.snapshot().fighters[0].ritualSignatureLimit===2)doubled++;}
 assert.ok(doubled>=210&&doubled<=290,String(doubled));
 let tested=false;for(let seed=0;seed<100;seed++){const b=new Battle([unit('hero',{classId:'knight',level:3,signatureUnlocks:1,health:100,maxHealth:100})],[unit('foe',{health:200,maxHealth:200})],{seed,ritualEffects:{quickening_prayer:true},maxActions:50});if(b.snapshot().fighters[0].ritualSignatureLimit!==2)continue;b._random=()=>.99;while(b.snapshot().status==='running')b.step();assert.equal(b.snapshot().signatureUses.hero,2);tested=true;break;}assert.ok(tested);
 const low=fight({quickening_prayer:true},{classId:'knight',level:1,signatureUnlocks:0});while(low.snapshot().status==='running')low.step();assert.equal(low.snapshot().signatureUses.hero,undefined);
});
test('Fortune preserves wards through reload; spent Hymn stays spent on return',()=>{
 let s=fresh();s.roster[0].temporaryWard=1;cast(s,'fortunes_favor');cast(s,'battle_hymn');const initial=P.prepareTeam(s).reduce((v,n)=>v+n.innateWard+n.temporaryWard,0);depart(s);s=P.upgradeState(clone(s));const t=s.trips.A,captured=[];
 class Capture extends Battle{constructor(players,enemies,options){captured.push({ward:players.reduce((v,n)=>v+n.innateWard+n.temporaryWard,0),effects:clone(options.ritualEffects)});super(players,enemies,options);}}
 for(let i=0;i<Math.ceil(t.totalDurationMs/1000)&&!captured.length;i++)P.tickRealtimeExpedition(s,1000,content,Capture,false,false);
 assert.equal(captured[0].ward,initial);assert.equal(captured[0].effects.battle_hymn,true);assert.equal(t.ritualEffects.battle_hymn,undefined);
 t.phase='return';t.deadlineMs=1000;P.completeReturn(s,'A',t.id,1000);assert.equal(s.ritualEffects.battle_hymn,undefined);
});
test('pending and active effects survive repeated saves without payment or extra use, and unlocks reject abandoned victories',()=>{
 let s=fresh();cast(s,'first_strike');cast(s,'arcane_offering');const paid=s.arcana;s=P.upgradeState(clone(s));assert.equal(s.arcana,paid);depart(s);s=P.upgradeState(clone(s));assert.equal(s.trips.A.ritualEffects.first_strike,true);assert.equal(s.ritualEffects.first_strike,undefined);
 const t=s.trips.A;record(s,t);assert.equal(t.ritualBattlesWon,1);s=P.upgradeState(clone(s));assert.equal(s.trips.A.ritualBattlesWon,1);
 const abandoned=fresh(),q=content.quests.find(q=>q.id==='ritual_healing'),trip=depart(abandoned,q);trip.abandoned=true;settle(abandoned,trip);assert.equal(abandoned.ritualsUnlocked.healing_ritual,undefined);
});
