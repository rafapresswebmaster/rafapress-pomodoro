const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const P=require('../js/plugins/RPGManagerProgression'),{Battle}=require('../js/plugins/RPGManagerBattle');
const roster=require('../data/RPGManagerRoster.json'),content={...require('../data/RPGManagerQuests.json'),...require('../data/RPGManagerStage3.json')};
const fresh=()=>P.createState(roster,()=>.5),clone=v=>JSON.parse(JSON.stringify(v));

test('destroyed gear leaves an empty slot and cannot return to inventory; a spare can replace it',()=>{
 const s=fresh(),n=s.roster[0];n.classId='knight';P.ensureLife(n);
 const id=P.armorGearIds().find(id=>P.SHOP[id].slot==='body'&&P.compatible(n,id));
 s.equipmentStock[id]=2;assert.equal(P.equipSlot(s,n.id,id,'body').ok,true);
 n.equipmentCondition[id].hitsRemaining=1;
 const b=new Battle(P.prepareTeam(s),[{...clone(content.enemies[0]),health:50,maxHealth:50}],{seed:10});
 const fighter=b._fighters.find(f=>f.id===n.id&&f.side==='player'),events=[];b._wearEquipment(fighter,events);
 assert.equal(fighter.equipmentSlots.body,null);assert.equal(fighter.equipmentCondition[id],undefined);assert.equal(events[0].type,'gearBroken');
 n.equipmentSlots=clone(fighter.equipmentSlots);n.equipmentCondition=clone(fighter.equipmentCondition);P.ensureLife(n);
 P.returnSlottedEquipment(s,n);assert.equal(s.equipmentStock[id],1);
 assert.equal(P.equipSlot(s,n.id,id,'body').ok,true);assert.equal(n.equipmentCondition[id].hitsRemaining,P.SHOP[id].durability);
});
test('legacy broken equipped and stored copies disappear without destroying intact spares',()=>{
 const s=fresh(),n=s.roster[0],id=P.armorGearIds()[0],slot=P.SHOP[id].slot;P.normalizeInventory(s);
 n.equipmentSlots[slot]=id;n.equipmentCondition[id]={broken:true,hitsRemaining:0};
 s.equipmentStock[id]=3;s.equipmentBrokenStock[id]=[true,false,false];s.equipmentDurabilityStock[id]=[0,0,5];
 P.ensureLife(n);P.normalizeInventory(s);assert.equal(n.equipmentSlots[slot],null);assert.equal(s.equipmentStock[id],1);assert.deepEqual(s.equipmentDurabilityStock[id],[5]);
});
test('battle settlement persists an empty broken-gear slot through recall and reload',()=>{
 const s=fresh(),n=s.roster[0];n.classId='knight';P.ensureLife(n);s.equipmentStock.padded_vest=1;P.equipSlot(s,n.id,'padded_vest','body');
 const q=content.quests.find(q=>q.id==='abandoned_shrine');P.dispatchQuest(s,'A',q,content.xp,1000);const t=s.trips.A;
 const stage={id:'wear-integration',type:'battle',enemyIds:['cultist_1']};t.stages.push(stage);t.stageIndex=t.stages.length-1;t.phase='battle';
 const b=new Battle(t.preparedTeam,[{...clone(content.enemies[0]),health:50,maxHealth:50}],{seed:8});
 const fighter=b._fighters.find(f=>f.id===n.id&&f.side==='player'),events=[];fighter.equipmentCondition.padded_vest.hitsRemaining=1;b._wearEquipment(fighter,events);
 P.recordBattleResult(s,'A',t.id,{status:'victory',fighters:b.snapshot().fighters.filter(f=>f.side==='player')},1000,events);
 assert.equal(n.equipmentSlots.body,null);assert.equal(t.preparedTeam.find(f=>f.id===n.id).equipmentSlots.body,null);
 P.recallExpedition(s);const loaded=P.upgradeState(clone(s));assert.equal(loaded.roster.find(f=>f.id===n.id).equipmentSlots.body,null);assert.equal(loaded.equipmentStock.padded_vest,0);
});
test('camp income takes two minutes, preserves fractional save progress and excludes away members',()=>{
 const s=fresh(),n=s.roster[0];for(const m of s.roster)P.assignCampJob(s,m.id,'idle');P.assignCampJob(s,n.id,'work');const gold=s.gold,yield_=P.campJobYield(n,'work');
 for(let i=0;i<12;i++)P.accrueCampJobs(s,5000);assert.equal(s.gold,gold);
 const loaded=P.upgradeState(clone(s));for(let i=0;i<12;i++)P.accrueCampJobs(loaded,5000);assert.equal(loaded.gold,gold+yield_);
 const old=fresh(),m=old.roster[0];P.assignCampJob(old,m.id,'work');old.campJobElapsed[m.id]={productionVersion:3,work:30000};P.accrueCampJobs(old,1);assert.equal(old.campJobElapsed[m.id].work,60001);
});
test('study uses the same slower income period, away members earn nothing, and healing still ticks every 30 seconds',()=>{
 const s=fresh(),n=s.roster[0];for(const m of s.roster)P.assignCampJob(s,m.id,'idle');P.assignCampJob(s,n.id,'study');
 n.health=1;const arcana=s.arcana;for(let i=0;i<6;i++)P.accrueCampJobs(s,5000);assert.equal(n.health,2);assert.equal(s.arcana,arcana);
 for(let i=0;i<18;i++)P.accrueCampJobs(s,5000);assert.equal(s.arcana,arcana+P.campJobYield(n,'study'));
 s.trips.A={team:[{id:n.id}]};const balance=s.arcana;for(let i=0;i<24;i++)P.accrueCampJobs(s,5000);assert.equal(s.arcana,balance);
});
test('reduced contract rewards agree with dispatch and one-minute stroll payouts',()=>{
 const q=content.quests.find(q=>q.id==='recover_stolen_ledger');assert.equal(q.rewardGold.victory,120);assert.equal(q.rewardArcana.victory,60);
 const s=fresh();s.campaignStats.questsCompleted=100;P.dispatchQuest(s,'A',q,content.xp,1000);assert.deepEqual(s.trips.A.rewardGold,q.rewardGold);assert.deepEqual(s.trips.A.rewardArcana,q.rewardArcana);
 const stroll=content.quests.find(q=>q.durationMinutes===1),other=fresh();P.dispatchQuest(other,'A',stroll,content.xp,1000);assert.equal(other.trips.A.rewardGold.victory,1);
});
test('all quests use real scenic art and coherent enemy families with explicit combat profiles',()=>{
 for(const q of content.quests){assert.equal(q.battlebackFolder,'pictures');assert.ok(fs.existsSync(`img/pictures/${q.battleback}.webp`));assert.equal(q.balanceVersion,33);
  if(q.enemyIds.length){const group=content.enemyGroups[q.encounterGroup];assert.ok(group,q.id);assert.equal(new Set(q.enemyIds).size,q.enemyIds.length);assert.ok(q.enemyIds.every(id=>group.enemyIds.includes(id)),q.id);}
 }
 for(const e of content.enemies){assert.ok(e.encounterGroups.length,e.id);for(const key of ['hp','armor','ward','dodge','speed','crit','damage','specialDamage'])assert.ok(Number.isFinite(e.combatProfile[key]),`${e.id}:${key}`);}
 const enemies=P.encounterEnemies({enemyIds:['goblin_1','orc_1','mage_cultist']},content,{skulls:3,balanceVersion:32});
 assert.ok(enemies[1].health>enemies[0].health);assert.ok(enemies[2].innateWard>enemies[0].innateWard);assert.ok(enemies[0].speed>enemies[1].speed);
});
test('enemy critical hits are simulated from authored chance',()=>{
 const s=fresh(),team=P.prepareTeam(s),foe={...clone(content.enemies[0]),critChance:1,health:100,maxHealth:100,speed:99};
 const b=new Battle(team,[foe],{seed:12});while(b.snapshot().status==='running'&&b.snapshot().actions<10)b.step();
 assert.ok(b.events.some(e=>e.type==='attack'&&e.side==='enemy'&&e.criticalHit));
});
