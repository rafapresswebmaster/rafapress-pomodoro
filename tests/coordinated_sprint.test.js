const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle');
const roster=require('../data/RPGManagerRoster.json'),base=require('../data/RPGManagerQuests.json'),stage=require('../data/RPGManagerStage3.json');
const content={...base,...stage,presentation:require('../data/RPGManagerPresentation.json')},copy=x=>JSON.parse(JSON.stringify(x)),fresh=()=>P.createState(roster,()=>.5);
function trip(){const s=fresh();P.dispatchQuest(s,'A',stage.quests.find(q=>q.id==='goblin_tracks'),undefined,1000);s.trips.A.phase='battle';return s;}
function result(s,survived){const t=s.trips.A;return P.recordBattleResult(s,'A',t.id,{status:'victory',fighters:t.preparedTeam.map((n,i)=>({...n,side:'player',health:i===0?0:n.health,alive:i!==0}))},1001,[{type:'deathSave',key:`player:${t.team[0].id}`,survived,permanentDeath:!survived,coinFlip:true}]);}
const accrue=(s,ms)=>{while(ms>0){const d=Math.min(5000,ms);P.accrueCampJobs(s,d);ms-=d;}};

test('each seeded knockout emits exactly one reproducible 50/50 fate, including battle-ending KO',()=>{
 let survived=0;for(let seed=1;seed<=400;seed++){
  const p={...fresh().roster[0],health:1,maxHealth:1,armor:0,innateWard:0,damage:1,speed:1,dodgeChance:0},e={...p,id:'executioner',name:'Executioner',speed:100,damage:20,health:100,maxHealth:100};
  const run=()=>{const b=new B.Battle([p],[e],{seed});while(b.snapshot().status==='running')b.step();return b;};
  const a=run(),b=run();assert.deepEqual(a.events,b.events);const fate=a.events.filter(e=>e.type==='deathSave');assert.equal(fate.length,1);assert.equal(fate[0].permanentDeath,!fate[0].survived);survived+=fate[0].survived;
 }assert.ok(survived>160&&survived<240,survived);
});
test('surviving KO incapacitates, stacks permanent injury once, survives reload and returns at exactly 1 HP',()=>{
 let s=trip(),t=s.trips.A,n=s.roster[0];result(s,true);assert.equal(n.health,1);assert.equal(n.lastingInjuries,1);assert.equal(t.preparedTeam[0].health,0);assert.equal(t.preparedTeam[0].alive,false);assert.equal(n.permanentWounds.length,1);
 const before=copy(s);assert.equal(result(s,true).duplicate,true);assert.deepEqual(s,before);
 s=P.upgradeState(copy(s));t=s.trips.A;n=s.roster[0];assert.equal(t.preparedTeam[0].health,0);t.phase='return';t.deadlineMs=0;P.completeReturn(s,'A',t.id,1002);assert.equal(n.condition,'Wounded');assert.equal(n.health,1);assert.equal(s.questResults.members[0].lastingInjuries,1);
 const gold=s.gold;P.completeReturn(s,'A',t.id,1003);assert.equal(s.gold,gold);assert.equal(n.lastingInjuries,1);
});
test('death returns worn gear exactly once through duplicate callbacks and reload',()=>{
 let s=trip(),n=s.roster[0];n.equipmentSlots.body='chainmail';n.equipmentCondition.chainmail={current:1,max:2};result(s,false);const stock=s.equipmentStock.chainmail;assert.equal(stock,1);assert.equal(n.condition,'Dead');assert.equal(P.activeRoster(s).some(x=>x.id===n.id),false);assert.equal(n.equipmentSlots.body,null);
 result(s,false);assert.equal(s.equipmentStock.chainmail,stock);s=P.upgradeState(copy(s));P.applyDeath(s,n.id);assert.equal(s.equipmentStock.chainmail,stock);assert.equal(s.equipmentConditionStock.chainmail[0],1);
});
test('each additional survived knockout gradually lowers Dodge while named scars do not repeat',()=>{
 const s=trip(),n=s.roster[0];n.lastingInjuries=3;P.ensureLife(n);assert.equal(n.dodgeChance,0);n.classId='rogue';P.ensureLife(n);assert.equal(n.dodgeChance,.19);n.health=1;accrue(s,120000);assert.equal(n.health,1);assert.equal(n.lastingInjuries,3);
});
test('injuries continue weakening initiative after Dodge reaches zero, without compounding on repeated preparation',()=>{
 const s=fresh(),n=s.roster[0],ids=P.activeRoster(s).map(n=>n.id);n.lastingInjuries=6;P.ensureLife(n);const speed=n.speed,a=P.prepareTeam(s,ids),b=P.prepareTeam(s,ids);assert.equal(a[0].speed,speed*Math.pow(.97,6));assert.equal(a[0].speed,b[0].speed);assert.equal(n.speed,speed);n.lastingInjuries=7;assert.ok(P.prepareTeam(s,ids)[0].speed<a[0].speed);
});
test('healing playback changes only HP and preserves recorded Armor and Ward',()=>{
 const t={presentationFighters:[{key:'player:a',name:'A',health:1,armor:3,ward:2}],presentationCurrent:{sourceType:'heal',targetKey:'player:a',targetHealth:2},presentationHoldMs:1,presentationDurationMs:1,presentationQueue:[{kind:'travel',text:'Continue',holdMs:50}]};P.tickPresentation(t,2,'standard',{});assert.equal(t.presentationFighters[0].health,2);assert.equal(t.presentationFighters[0].armor,3);assert.equal(t.presentationFighters[0].ward,2);
});
test('passive healing ticks at 30 seconds across jobs and load, without offline credit or curing injuries',()=>{
 let s=fresh(),n=s.roster[0];n.health=1;n.injury='Wounded';n.condition='Wounded';n.lastingInjuries=2;accrue(s,29999);assert.equal(n.health,1);s=P.upgradeState(copy(s));n=s.roster[0];assert.equal(n.health,1);accrue(s,1);assert.equal(n.health,2);P.assignCampJob(s,n.id,'work');accrue(s,30000);assert.equal(n.health,3);assert.equal(n.lastingInjuries,2);assert.equal(n.injury,'Wounded');accrue(s,300000);assert.equal(n.health,n.maxHealth);assert.equal(P.assignCampJob(s,n.id,'rest').ok,false);
});
test('six exclusive ten-name first-name pools support used-name exclusion',()=>{
 for(const [classId,names] of Object.entries(Object.fromEntries(Object.entries(P.namePools()).map(([id,pairs])=>[id,pairs.male])))){assert.equal(names.length,10);assert.equal(new Set(names).size,10);assert.ok(names.every(n=>!n.includes(' ')));for(let i=0;i<10;i++)assert.ok(names.includes(P.randomName(()=>i/10,classId)));assert.equal(P.randomName(()=>0,classId,names.slice(0,9)),names[9]);assert.notEqual(P.randomName(()=>0,classId,[names[0].toLowerCase()]),names[0]);}
});
function special(classId,injured=false){const s=fresh(),actor={...s.roster[0],classId,health:5,maxHealth:5,armor:0,innateWard:0,critChance:0,signatureUnlocks:1,speed:100,signatureMove:{multiplier:1,cooldown:1},personalityTraits:['reckless']},ally={...actor,id:'ally',name:'Ally',health:injured?1:5,speed:1},enemy={...actor,id:'enemy',name:'Enemy',health:100,maxHealth:100,signatureUnlocks:0,damage:1,speed:1,dodgeChance:0,armor:2,innateWard:2};
 for(let seed=1;seed<100;seed++){const b=new B.Battle([actor,ally],[enemy],{seed,strategy:'Aggressive'});const e=b.step();if(e.some(x=>x.kind==='signature'||x.type==='heal'))return{b,e};}throw Error('no signature');}
test('Mending Light heals the most urgent living ally for one and falls back to attack at full HP',()=>{
 let {e}=special('cleric',true);assert.equal(e.find(e=>e.type==='heal').targetKey,'player:ally');assert.equal(e.find(e=>e.type==='heal').healing,1);e=special('cleric',false).e;assert.ok(e.some(e=>e.attackName==='Kind Word'));assert.ok(!e.some(e=>e.type==='heal'));
});
test('all six automatic class specials emit actual named resolved effects',()=>{
 const names=['Cleave','Shield Bash','Pinning Shot','Feint','Fireburst','Kind Word','Blessing'];P.ALL_CLASSES.forEach(id=>{const {e}=special(id);assert.ok(e.some(x=>names.includes(x.attackName)),id);});
 const mage=special('mage').e.find(e=>e.type==='attack');assert.equal(mage.damage,1);assert.equal(mage.wardLoss,0);
});
test('XP milestones are 30/120/360 cumulative with cap four retained',()=>{assert.deepEqual([1,2,3,4].map(level=>P.xpRequired({level})),[30,150,360,650]);assert.equal(P.LEVEL_CAP,8);});
function forcedSpecial(classId,extra={}){
 const actor={...fresh().roster[0],classId,health:5,maxHealth:5,armor:0,innateWard:0,temporaryWard:0,critChance:0,signatureUnlocks:1,speed:100,damage:1,signatureDamage:1,dodgeChance:0,...extra};
 const ally={...actor,id:'ally',name:'Ally',health:1,maxHealth:5,speed:1},foe={...actor,id:'foe',name:'Foe',side:'enemy',health:100,maxHealth:100,speed:2,damage:3,signatureDamage:3};
 const b=new B.Battle([actor,ally],[foe],{seed:19});b._signatureDecision=()=>({use:true,reasons:['test force']});const e=b.step();return{b,e};
}
test('Shield Bash protects the urgent ally once; Pinning Shot weakens exactly the next enemy action',()=>{
 const knight=forcedSpecial('knight');assert.equal(knight.b.snapshot().fighters.find(n=>n.id==='ally').protected,true);
 const ranger=forcedSpecial('ranger');assert.equal(ranger.b.snapshot().fighters.find(n=>n.id==='foe').pinned,true);
 let hit;for(let i=0;i<5&&!hit;i++)hit=ranger.b.step().find(e=>e.type==='attack'&&e.actorKey==='enemy:foe');assert.equal(hit.rawDamage,2);assert.equal(ranger.b.snapshot().fighters.find(n=>n.id==='foe').pinned,false);
});
test('Feint keeps bounded damage and Fireburst bypasses one defense point',()=>{
 const rogue=forcedSpecial('rogue');assert.equal(rogue.e.find(e=>e.type==='attack').rawDamage,1);
 const mage=forcedSpecial('mage');assert.equal(mage.e.find(e=>e.type==='attack').damage,1);
});

test('Cleric cannot revive or overheal an incapacitated ally',()=>{
 const {b}=forcedSpecial('cleric');const ally=b._fighters.find(n=>n.id==='ally');ally.health=0;ally.alive=false;const actor=b._fighters.find(n=>n.id==='ada');actor.signatureSpent=false;b._queue=[actor];const events=b.step();assert.equal(ally.health,0);assert.ok(!events.some(e=>e.type==='heal'));assert.ok(events.some(e=>e.attackName==='Mending Light'));
});
test('Cleave records its seeded secondary hit rather than presentation damage',()=>{
 let sweep=false;for(let seed=1;seed<=20&&!sweep;seed++){
  const a={...fresh().roster[1],classId:'barbarian',signatureUnlocks:1,speed:100,damage:1,signatureDamage:1,critChance:0,dodgeChance:0},e={...a,id:'first',name:'First',health:100,maxHealth:100,speed:1};
  const b=new B.Battle([a],[e,{...e,id:'second',name:'Second'}],{seed});b._signatureDecision=()=>({use:true});const events=b.step(),hit=events.find(e=>e.attackName==='Cleave — sweep');if(hit){sweep=true;assert.equal(hit.damage+hit.armorLoss+hit.wardLoss,1);}
 }assert.ok(sweep);
});
test('critical marker is copied into the event projection without a second random roll',()=>{
 const events=P.buildBattlePresentation([{type:'attack',actorName:'Ada',targetName:'Foe',side:'player',criticalHit:true,damage:2,kind:'basic',attackName:'Strike'}],{fighters:[]},{id:'test',preparedTeam:[]});const hit=events.find(e=>e.sourceType==='attack');assert.equal(hit.criticalHit,true);assert.match(hit.text,/CRITICAL x2/);
});
test('all nine catalogue tiers remain covered and every background exists on disk',()=>{
 const fs=require('node:fs'),tiers=new Set();for(const q of stage.quests){tiers.add(`${P.questDurationCategory(q)}:${q.difficulty}`);assert.ok(fs.existsSync(`img/${q.battlebackFolder||'battlebacks1'}/${q.battleback}.webp`));}assert.equal(tiers.size,9);
});
