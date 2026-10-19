const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const P=require('../js/plugins/RPGManagerProgression'),{Battle}=require('../js/plugins/RPGManagerBattle');
const roster=require('../data/RPGManagerRoster.json'),data={...require('../data/RPGManagerQuests.json'),...require('../data/RPGManagerStage3.json')};
const clone=v=>JSON.parse(JSON.stringify(v)),fresh=()=>P.createState(roster,()=>.5),q=data.quests.find(q=>q.durationMinutes===5&&q.skulls===1);
function dispatch(s,ids=s.teamIds,quest=q){P.dispatchQuest(s,'A',quest,data.xp,1000,null,null,null,null,ids);return s.trips.A;}
function equip(s,n,id){const item=P.SHOP[id];s.equipmentStock[id]++;assert.equal(P.equipSlot(s,n.id,id,item.slot).ok,true);}

test('each eligible time/rating pair has five complete quests, without duplicate IDs or missing enemies/backgrounds',()=>{
 assert.equal(new Set(data.quests.map(q=>q.id)).size,data.quests.length);
 for(const m of [5,10,15,20,25,30])for(let r=1;r<=8;r++)assert.ok(data.quests.filter(q=>q.durationMinutes===m&&q.skulls===r).length>=5,`${m}/${r}`);
 for(const q of data.quests){assert.equal(q.intendedLevel,q.skulls);assert.ok(q.xpPool>0);assert.ok(q.rewardGold.victory>0);assert.ok(fs.existsSync(`img/${q.battlebackFolder}/${q.battleback}.webp`));if(q.durationMinutes>1)assert.ok(q.enemyIds.length>0,q.id);assert.ok(q.enemyIds.every(id=>data.enemies.some(e=>e.id===id)));}
 for(const [m,count] of [[1,5],[3,8]])assert.equal(data.quests.filter(q=>q.durationMinutes===m).length,count);
});
test('all six classes have low HP and meaningful growth through level eight, including defensive growth',()=>{
 for(const cls of P.ALL_CLASSES){let prior=P.classStats({classId:cls,level:1});assert.ok(prior.hp<=4);for(let l=2;l<=8;l++){const next=P.classStats({classId:cls,level:l});assert.notDeepEqual(next,prior);assert.ok(next.hp<=5);prior=next;}assert.equal(P.powerTrack({classId:cls,level:8}).length,8);}
 assert.ok(P.classStats({classId:'knight',level:8}).armorRecovery>=2);
 assert.ok(P.classStats({classId:'mage',level:8}).ward>=6);
 assert.ok(P.classStats({classId:'rogue',level:8}).dodge>=35);
 assert.ok(P.xpRequired({level:7})>P.xpRequired({level:6}));
});
test('low-HP defensive capstones trigger at one HP for three-HP allies',()=>{
 const s=fresh();s.roster[0].classId='cleric';s.roster[1].classId='mage';for(const n of s.roster){n.level=8;P.ensureLife(n);n.health=n.maxHealth;}
 const party=P.prepareTeam(s);party[1].health=1;
 const b=new Battle(party,[{...clone(party[2]),id:'foe',name:'Foe'}],{seed:1});const actor=b._fighters.find(n=>n.side==='player'&&n.classId==='cleric'),events=[];
 assert.equal(b._refinementAction(actor,events),true);assert.equal(actor.capstoneSpent,true);assert.ok(events.some(e=>e.attackName==='Grace'));
 assert.ok(b.snapshot().fighters.filter(n=>n.side==='player').every(n=>n.protected));
});
test('completion XP is a fixed shared pool for one, two or three members, with no rounding loss or benched XP',()=>{
 for(const size of [1,2,3]){
  const s=fresh(),ids=s.teamIds.slice(0,size),t=dispatch(s,ids,{...q,xpPool:7,xpReward:2});
  t.phase='return';t.deadlineMs=0;t.battleSnapshot={status:'victory',fighters:t.preparedTeam.map(n=>({...clone(n),side:'player',alive:true}))};
  const report=P.completeReturn(s,'A',t.id,1000);assert.equal(report.xpTotal,7);assert.equal(s.roster.reduce((sum,n)=>sum+n.xp,0),7);
  for(const n of s.roster.filter(n=>!ids.includes(n.id)))assert.equal(n.xp,0);
 }
});
test('enemy XP is shared once and retained on recall; failed missions grant no completion XP',()=>{
 const s=fresh(),t=dispatch(s),before=s.roster.reduce((n,c)=>n+c.xp,0);
 for(let i=0;i<80&&!t.enemyXpEarned;i++)P.tickRealtimeExpedition(s,5000,data,Battle,false,false);
 assert.ok(t.enemyXpEarned>0);assert.equal(s.roster.reduce((n,c)=>n+c.xp,0)-before,t.enemyXpEarned);
 const total=s.roster.reduce((n,c)=>n+c.xp,0);P.recordBattleResult(s,'A',t.id,t.battleSnapshot,1000,t.battleEvents);assert.equal(s.roster.reduce((n,c)=>n+c.xp,0),total);
 P.recallExpedition(s);assert.equal(s.roster.reduce((n,c)=>n+c.xp,0),total);
 const f=fresh(),trip=dispatch(f);trip.phase='return';trip.deadlineMs=0;trip.battleSnapshot={status:'draw',fighters:trip.preparedTeam.map(n=>({...clone(n),side:'player',alive:true}))};P.completeReturn(f,'A',trip.id,1000);assert.equal(f.roster.reduce((n,c)=>n+c.xp,0),0);
});
test('every worn item has a fixed varied 4-20-hit lifespan and breaks on the exact landed-hit boundary',()=>{
 for(const id of P.armorGearIds())assert.ok(Number.isInteger(P.SHOP[id].durability)&&P.SHOP[id].durability>=4&&P.SHOP[id].durability<=20,id);
 assert.ok(new Set(P.armorGearIds().map(id=>P.SHOP[id].durability)).size>8);
 const s=fresh(),n=s.roster[0];n.classId='mage';P.ensureLife(n);equip(s,n,'moonstone');equip(s,n,'mage_robes');
 const hero=P.prepareTeam(s,[n.id])[0];hero.health=hero.maxHealth=200;hero.dodgeChance=0;
 const enemy={...clone(hero),id:'wear-test',name:'Wear test',classId:null,side:'enemy',equipmentSlots:{},equipmentCondition:{},equipmentStats:{},armor:0,innateWard:0,damage:1,health:1000,maxHealth:1000,signatureUnlocks:0};
 const b=new Battle([hero],[enemy],{seed:13,maxActions:160});b._random=()=>.99;
 const limit=P.SHOP.moonstone.durability;let hits=0;
 while(hits<limit){b.step();hits=b.events.filter(e=>e.type==='attack'&&e.side==='enemy'&&!e.missed&&!e.ritualBlocked).length;}
 const f=b.snapshot().fighters.find(f=>f.side==='player');assert.equal(f.equipmentCondition.moonstone,undefined);assert.equal(f.equipmentSlots.accessory,null);assert.ok(b.events.some(e=>e.type==='gearBroken'&&e.itemId==='moonstone'));
 const before=JSON.stringify(b.snapshot());b.snapshot();assert.equal(JSON.stringify(b.snapshot()),before);
});
test('worn durability survives swaps, while exhausted gear is destroyed and cannot be repaired',()=>{
 const s=fresh(),n=s.roster[0];equip(s,n,'cat_charm');const id='cat_charm',max=P.SHOP[id].durability;
 n.equipmentCondition[id].hitsRemaining=2;P.equipSlot(s,n.id,null,'accessory');
 const loaded=P.upgradeState(clone(s)),member=loaded.roster[0];P.equipSlot(loaded,member.id,id,'accessory');assert.equal(member.equipmentCondition[id].hitsRemaining,2);
 const healthyDodge=member.dodgeChance;member.equipmentCondition[id].hitsRemaining=0;P.ensureLife(member);assert.equal(member.equipmentCondition[id],undefined);assert.equal(member.equipmentSlots.accessory,null);assert.ok(member.dodgeChance<healthyDodge);
 P.restoreReturnArmor(member);assert.equal(member.equipmentCondition[id],undefined);
 loaded.gold=1000;assert.equal(P.repairGear(loaded,member.id,id).ok,false);assert.equal(loaded.equipmentStock[id],0);
});
test('fresh and worn copies of the same item retain separate durability through purchase and swaps',()=>{
 const s=fresh(),n=s.roster[0];equip(s,n,'leather_cap');n.equipmentCondition.leather_cap.hitsRemaining=2;s.gold=1000;
 P.purchase(s,'leather_cap');P.equipSlot(s,n.id,null,'head');assert.equal(s.equipmentStock.leather_cap,2);
 P.equipSlot(s,n.id,'leather_cap','head');assert.equal(n.equipmentCondition.leather_cap.hitsRemaining,P.SHOP.leather_cap.durability);
 assert.deepEqual(s.equipmentDurabilityStock.leather_cap,[2]);
});
test('battle equipment drops are rare, varied, once-only, kept on recall and absent on defeat',()=>{
 let drops=0;const items=new Set();
 for(let seed=1;seed<=250;seed++){
  const s=fresh();s.nextTripId=seed;const t=dispatch(s);t.stages.push({id:'drop',type:'battle',enemyIds:['slime']});t.stageIndex=t.stages.length-1;t.phase='battle';
  const snapshot={status:'victory',fighters:t.preparedTeam.map(n=>({...clone(n),side:'player',alive:true}))};
  P.recordBattleResult(s,'A',t.id,snapshot,1000,[]);const before=clone(s.equipmentStock);P.recordBattleResult(s,'A',t.id,snapshot,1000,[]);assert.deepEqual(s.equipmentStock,before);
  if(t.equipmentDrops?.length){drops++;items.add(t.equipmentDrops[0].itemId);P.recallExpedition(s);assert.deepEqual(s.equipmentStock,before);}
 }
 assert.ok(drops>0&&drops<25,drops);assert.ok(items.size>1);
 for(let seed=1;seed<=25;seed++){
  const s=fresh();s.nextTripId=seed;const t=dispatch(s);t.stages.push({id:'loss',type:'battle',enemyIds:['slime']});t.stageIndex=t.stages.length-1;t.phase='battle';
  P.recordBattleResult(s,'A',t.id,{status:'defeat',fighters:t.preparedTeam.map(n=>({...clone(n),side:'player',alive:true}))},1000,[]);assert.equal(t.equipmentDrops,undefined);
 }
});
test('misses and full-hit ritual interceptions do not consume equipment durability',()=>{
 for(const mode of ['miss','ritual']){
  const s=fresh(),n=s.roster[0];equip(s,n,'cat_charm');const hero=P.prepareTeam(s,[n.id])[0];hero.health=hero.maxHealth=100;hero.dodgeChance=mode==='miss'?.75:0;
  const enemy={...clone(hero),id:'incoming',name:'Incoming',classId:null,equipmentSlots:{},equipmentCondition:{},equipmentStats:{},health:1000,maxHealth:1000,damage:1,signatureUnlocks:0};
  const b=new Battle([hero],[enemy],{seed:1,ritualEffects:mode==='ritual'?{protection_ward:true}:{}});b._random=()=>mode==='miss'?0:.99;
  while(!b.events.some(e=>e.type==='attack'&&e.side==='enemy'))b.step();
  const snap=b.snapshot().fighters.find(n=>n.side==='player');assert.equal(snap.equipmentCondition.cat_charm.hitsRemaining,P.SHOP.cat_charm.durability);
 }
});
test('old job fractions migrate to the slower five-member economy without awarding closed-process income',()=>{
 const s=fresh(),n=s.roster[0];P.assignCampJob(s,n.id,'work');s.campJobElapsed[n.id]={productionVersion:2,work:15000};const gold=s.gold;
 P.accrueCampJobs(s,1);assert.equal(s.campJobElapsed[n.id].productionVersion,4);assert.equal(s.campJobElapsed[n.id].work,60001);assert.equal(s.gold,gold);
 const loaded=P.upgradeState(clone(s));assert.equal(loaded.gold,gold);assert.equal(loaded.campJobElapsed[n.id].work,60001);
});
test('rebate cannot mint Arcana through repeated combatless one-minute quests',()=>{
 const s=fresh();s.arcana=200;s.ritualsUnlocked.arcane_rebate=true;P.ritualCast(s,'arcane_rebate');const balance=s.arcana;
 for(let i=0;i<4;i++){
  const t=dispatch(s,s.teamIds,data.quests.find(q=>q.durationMinutes===1));t.phase='return';t.deadlineMs=0;t.battleSnapshot={status:'victory',fighters:t.preparedTeam.map(n=>({...clone(n),side:'player',alive:true}))};P.completeReturn(s,'A',t.id,1000);P.dismissQuestResults(s);
  assert.equal(s.arcana,balance);assert.equal(s.ritualEffects.arcane_rebate,true);
 }
});
test('campfire and wipe saves preserve the running expedition and its recorded rewards',()=>{
 for(const phase of ['campfire','wipe']){const s=fresh(),t=dispatch(s);t.phase=phase;t.equipmentDrops=[{itemId:'cat_charm',stageIndex:1}];const loaded=P.upgradeState(clone(s));assert.equal(loaded.trips.A.id,t.id);assert.equal(loaded.trips.A.phase,phase);assert.deepEqual(loaded.trips.A.equipmentDrops,t.equipmentDrops);}
});
test('five-member auto-assignment chooses each class specialty, skips away companions and preserves fractional progress',()=>{
 const s=fresh();for(let i=0;i<2;i++)P.recruitCandidate(s,P.replacementCandidates(s)[0].id);
 s.roster.forEach((n,i)=>{n.classId=['knight','mage','rogue','cleric','barbarian'][i];P.ensureLife(n);});
 s.trips.A={id:'away',team:[{id:s.roster[0].id}]};s.campJobs[s.roster[0].id]='idle';s.campJobElapsed[s.roster[1].id]={productionVersion:3,study:30000};
 const result=P.autoAssignCampJobs(s);assert.equal(result.assignments.length,4);assert.equal(s.campJobs[s.roster[0].id],'idle');assert.equal(s.campJobElapsed[s.roster[1].id].study,30000);
 for(const a of result.assignments){const n=s.roster.find(n=>n.id===a.id);assert.equal(a.job,P.bestCampJob(n));assert.ok(P.campJobYield(n,a.job)>P.campJobYield(n,a.job==='work'?'study':'work'));}
 const gold=s.gold,arcana=s.arcana;for(let i=0;i<24;i++)P.accrueCampJobs(s,5000);assert.equal(s.gold-gold,4);assert.equal(s.arcana-arcana,4);
});
