const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const P=require('../js/plugins/RPGManagerProgression');
const base=require('../data/RPGManagerQuests.json'),{quests}=require('../data/RPGManagerStage3.json');
const narratives=require('../data/RPGManagerNarratives.json');
test('ritual cost order has nondecreasing unlock difficulty and matching quest metadata',()=>{
 const entries=P.ritualEntries();
 entries.forEach(([,r],i)=>{
  if(i){assert.ok(r.castCost>=entries[i-1][1].castCost);assert.ok(r.level>=entries[i-1][1].level);}
  const q=quests.find(q=>q.id===r.questId);
  assert.equal(P.dangerRating(q),r.level);assert.equal(q.skulls,r.level);
  assert.equal(q.encounterTier,Math.ceil((r.level+1)/2));
 });
});
test('all quest identities, enemy references and background assets are valid',()=>{
 assert.equal(new Set(quests.map(q=>q.name.toLowerCase())).size,quests.length);
 const enemyIds=new Set(base.enemies.map(e=>e.id));
 for(const q of quests){
  for(const id of [...q.enemyIds,...q.skirmishEnemyIds||[]])assert.ok(enemyIds.has(id),`${q.id}: ${id}`);
  assert.ok(fs.existsSync(`img/${q.battlebackFolder}/${q.battleback}.webp`),q.id);
 }
});
test('frontier contracts have distinct objectives and distinct encounter combinations',()=>{
 const frontier=quests.filter(q=>q.id.startsWith('frontier_')),signatures=new Set();
 assert.equal(new Set(frontier.map(q=>q.description)).size,frontier.length);
 for(const q of frontier){
  const signature=q.battleback+'|'+q.enemyIds.slice().sort().join();
  assert.ok(!signatures.has(signature),q.id);signatures.add(signature);
  assert.ok(narratives.quests[q.id].every(n=>n.text.length<=180),q.id);
  assert.ok(narratives.quests[q.id].some(n=>n.text.includes(q.environment)),q.id);
 }
});
test('every rating offers broad enemy and scenery variety',()=>{
 for(let level=1;level<=8;level++){
  const group=quests.filter(q=>q.intendedLevel===level);
  assert.ok(new Set(group.flatMap(q=>q.enemyIds)).size>=20,`enemy variety at ${level}`);
  assert.ok(new Set(group.map(q=>q.battleback)).size>=15,`scenery variety at ${level}`);
 }
});
