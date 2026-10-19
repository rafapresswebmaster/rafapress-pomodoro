// Independent seeds, full expeditions, and every authored quest. Never loads saves.
const fs=require('node:fs'),{run}=require('./quest_level_audit');
const content=require('../data/RPGManagerStage3.json');
const compositions=[['knight','barbarian','ranger'],['rogue','mage','cleric']],rows=[];
for(const q of content.quests){
 const samples=[];
 for(const gear of ['none','ordinary','strong']){
  const r={gear,runs:0,clears:0,deaths:0,casualties:0,retreats:0,battles:0};
  const seeds=q.skulls===3?16:4;
  for(const classes of compositions)for(let seed=101;seed<101+seeds;seed++){
   const outcome=run(q,q.skulls,gear,classes,seed);r.runs++;r.clears+=outcome.clear;r.deaths+=outcome.deaths;r.casualties+=outcome.casualties;r.retreats+=outcome.retreat;r.battles+=outcome.battles;
  }
  r.clearRate=r.clears/r.runs;r.deathsPerRun=r.deaths/r.runs;r.casualtiesPerRun=r.casualties/r.runs;samples.push(r);
 }
 rows.push({id:q.id,rating:q.skulls,minutes:q.durationMinutes,samples});
 if(rows.length%40===0)console.log(`${rows.length}/${content.quests.length} validated`);
}
const totals=[];
for(let rating=1;rating<=8;rating++)for(const gear of ['none','ordinary','strong']){
 const samples=rows.filter(q=>q.rating===rating).map(q=>q.samples.find(s=>s.gear===gear));
 const r={rating,gear,runs:0,clears:0,deaths:0,casualties:0};
 for(const s of samples)for(const key of ['runs','clears','deaths','casualties'])r[key]+=s[key];
 r.clearRate=r.clears/r.runs;r.casualtiesPerRun=r.casualties/r.runs;totals.push(r);
}
const report={balanceVersion:Math.max(...content.quests.map(q=>q.balanceVersion||0)),method:'Full expeditions; all quests at equal party level. Two complementary three-person compositions; seeds 101-116 for every three-skull quest, 101-104 for others, independent of calibration. No gear, cheapest compatible head/body, or premium gear in every slot. No rituals. Includes patrols, wounds, death saves, recovery, gear wear, extraction and quest settlement. Does not measure human play or every class composition.',runs:rows.reduce((n,q)=>n+q.samples.reduce((m,s)=>m+s.runs,0),0),totals,rows};
fs.writeFileSync('docs/World_Balance_Validation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({runs:report.runs,threeSkulls:totals.filter(r=>r.rating===3)}));
