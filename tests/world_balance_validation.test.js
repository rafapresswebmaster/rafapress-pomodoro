const test=require('node:test'),assert=require('node:assert/strict');
const report=require('../docs/World_Balance_Validation.json');
const quests=require('../data/RPGManagerStage3.json').quests;
test('independent full-expedition validation covers every quest and all three gear tiers',()=>{
 assert.equal(report.rows.length,quests.length);assert.ok(report.runs>=8000);
 assert.deepEqual(report.rows.map(q=>q.id).sort(),quests.map(q=>q.id).sort());
 for(const q of report.rows){assert.equal(q.samples.length,3);for(const s of q.samples)assert.equal(s.runs,q.rating===3?32:8);}
});
test('equal-level three-skull quests punish missing equipment and reward preparation on independent seeds',()=>{
 const tier=gear=>report.totals.find(t=>t.rating===3&&t.gear===gear),poor=tier('none'),basic=tier('ordinary'),strong=tier('strong');
 assert.ok(poor.clearRate>=.35&&poor.clearRate<=.85,poor.clearRate);
 assert.ok(poor.casualtiesPerRun>.4,poor.casualtiesPerRun);
 assert.ok(basic.clearRate>poor.clearRate+.1);assert.ok(strong.clearRate>=.95);
 assert.ok(strong.casualtiesPerRun<poor.casualtiesPerRun*.5);
});
test('eight-skull quests retain a stronger dependence on protection than three-skull quests',()=>{
 const tier=gear=>report.totals.find(t=>t.rating===8&&t.gear===gear);
 assert.ok(tier('none').clearRate<tier('ordinary').clearRate);assert.ok(tier('ordinary').clearRate<tier('strong').clearRate);
});
