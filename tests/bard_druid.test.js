const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const P=require('../js/plugins/RPGManagerProgression.js');
const {Battle}=require('../js/plugins/RPGManagerBattle.js');

const stats={
 bard:[[3,1,1,18,10,1,9],[3,1,2,18,10,1,9],[3,1,2,21,10,1,10],[3,1,3,21,10,1,10],[4,1,3,21,10,1,11]],
 druid:[[3,0,3,12,8,1,7],[3,0,4,12,8,1,7],[3,0,4,15,8,1,8],[3,0,5,15,8,1,8],[4,0,5,15,8,1,9]]
};
const unit=(id,classId,level=1)=>({id,name:id,classId,role:'support',basicAttack:'Attack',signatureAttack:'Special',passiveTrait:{name:'Steady',description:'Steady.'},level,alive:true,health:4,maxHealth:4,attack:1,defense:0,armor:0,maxArmor:0,innateWard:0,innateWardMax:0,temporaryWard:0,dodgeChance:0,critChance:0,damage:1,speed:10,signatureUnlocks:1,signatureUseLimit:1});
const foe=()=>({id:'foe',name:'Foe',classId:'enemy',role:'striker',basicAttack:'Claw',signatureAttack:'Roar',passiveTrait:{name:'Wild',description:'Wild.'},level:1,alive:true,health:20,maxHealth:20,attack:1,defense:0,armor:0,innateWard:0,dodgeChance:0,critChance:0,damage:1,speed:1});

test('eight starters and exact Bard/Druid level-one-to-five totals',()=>{
 assert.deepEqual([...P.ALL_CLASSES].sort(),['barbarian','bard','cleric','druid','knight','mage','ranger','rogue']);
 for(const [id,levels] of Object.entries(stats))levels.forEach((expected,i)=>{const s=P.classStats({classId:id,level:i+1});assert.deepEqual([s.hp,s.armor,s.ward,s.dodge,s.crit,s.damage,s.speed],expected);});
});

test('new name and living-art pools are complete and resolve',()=>{
 const names=[];for(const id of ['bard','druid'])for(const sex of P.SEXES){assert.equal(P.namePools()[id][sex].length,20);names.push(...P.namePools()[id][sex]);const options=P.portraitOptions(id,sex);assert.equal(options.length,8);assert.ok(fs.existsSync(`img/faces/${options[0].sheet}`));assert.ok(fs.existsSync(`img/characters/${P.walkingPortrait(id,sex).sheet}`));}
 assert.equal(new Set(names.map(n=>n.toLowerCase())).size,80);
});

test('new portrait paths render in creation and quest party selectors',()=>{
 const source=fs.readFileSync('js/plugins/RPGManager.js','utf8');
 assert.match(source,/managerImageFile\(face\.sheet\)/);
 assert.match(source,/background-repeat:no-repeat/);
 assert.match(source,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\);grid-template-rows:repeat\(2,minmax\((?:0|122px|132px),1fr\)\)/);
});

test('Encore renews one non-Bard signature and grants level-five Resonance',()=>{
 const battle=new Battle([unit('bard','bard',5),unit('ally','knight',5)],[foe()],{seed:1,maxActions:20});
 const bard=battle._fighters.find(f=>f.id==='bard'),ally=battle._fighters.find(f=>f.id==='ally');
 battle._signatureUses.ally=1;ally.signatureSpent=true;bard.personalTurns=3;battle._queue=[bard];
 const events=battle.step();assert.equal(events[0].attackName,'Encore');assert.equal(ally.signatureSpent,false);assert.equal(ally.encoreReceived,true);assert.equal(ally.temporaryWard,2);assert.equal(battle._signatureUses.bard,1);
});

test('Entangling Bloom heals exactly one and records an authoritative delay',()=>{
 const battle=new Battle([unit('druid','druid',5),unit('ally','knight',5)],[foe()],{seed:1,maxActions:20});
 const druid=battle._fighters.find(f=>f.id==='druid'),ally=battle._fighters.find(f=>f.id==='ally'),enemy=battle._fighters.find(f=>f.side==='enemy');
 ally.health=1;druid.personalTurns=3;battle._queue=[druid];const events=battle.step();
 assert.equal(events[0].attackName,'Entangling Bloom');assert.equal(events[0].healing,1);assert.equal(ally.health,2);assert.equal(ally.temporaryWard,2);assert.equal(enemy.rootDelay,1);assert.equal(enemy.rootLocked,true);
});
