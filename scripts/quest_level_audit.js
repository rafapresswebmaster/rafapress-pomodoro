// Deterministic full-expedition audit; never reads or writes player saves.
const fs=require('node:fs');
const P=require('../js/plugins/RPGManagerProgression'),{Battle}=require('../js/plugins/RPGManagerBattle');
const roster=require('../data/RPGManagerRoster.json');
const content={...require('../data/RPGManagerQuests.json'),...require('../data/RPGManagerStage3.json'),presentation:require('../data/RPGManagerPresentation.json')};
const compositions=[['knight','barbarian','ranger'],['rogue','mage','cleric']];
function run(q,level,gear,classes,seed){
 const s=P.createState(roster,()=>.5);s.nextTripId=seed;s.campaignStats.questsCompleted=100;
 P.activeRoster(s).forEach((n,i)=>{
  n.classId=classes[i];n.level=level;n.selectedMove=P.classFor(n).moves[0].id;Object.assign(n,P.classFor(n).stats);P.ensureLife(n);
  for(const slot of gear==='none'?[]:gear==='ordinary'?['head','body']:P.EQUIPMENT_SLOTS){
   const ids=P.armorGearIds().filter(id=>P.SHOP[id].slot===slot&&P.compatible(n,id)).sort((a,b)=>P.SHOP[a].price-P.SHOP[b].price||a.localeCompare(b));
   const id=gear==='strong'?ids.at(-1):ids[0];if(id){s.equipmentStock[id]++;P.equipSlot(s,n.id,id,slot);}
  }
  n.health=n.maxHealth;n.classArmor=n.classArmorMax;n.innateWard=n.innateWardMax;
 });
 P.dispatchQuest(s,'A',q,content.xp,1000);const t=s.trips.A;
 let steps=0;while(s.trips.A){if(++steps>10000)throw Error('Non-terminating quest '+q.id);P.tickRealtimeExpedition(s,5000,content,Battle,false,false);}
 const r=s.questResults;
 return {clear:Number(r.outcome==='victory'&&!r.autoRetreat),deaths:r.members.filter(n=>n.condition==='Dead').length,casualties:r.members.filter(n=>n.condition==='Dead'||n.condition==='Wounded').length,retreat:Number(!!r.autoRetreat),battles:t.chronicle.filter(e=>e.type==='battle').length};
}
function sample(q,level,gear,seeds=4){
 const row={level,gear,runs:0,clears:0,deaths:0,casualties:0,retreats:0,battles:0};
 for(const classes of compositions)for(let seed=1;seed<=seeds;seed++){
  const r=run(q,level,gear,classes,seed);row.runs++;row.clears+=r.clear;row.deaths+=r.deaths;row.casualties+=r.casualties;row.retreats+=r.retreat;row.battles+=r.battles;
 }
 row.clearRate=row.clears/row.runs;row.deathsPerRun=row.deaths/row.runs;return row;
}
if(require.main===module){
 const calibrate=process.argv.includes('--calibrate'),rows=[],start=Date.now();
 for(const q of content.quests){
  const scenarios=calibrate?Array.from({length:8},(_,i)=>[i+1,'ordinary']):[[P.dangerRating(q),'ordinary'],[1,'none'],[8,'ordinary'],[8,'strong']];
  const samples=scenarios.map(([level,gear])=>sample(q,level,gear));
  rows.push({id:q.id,name:q.name,rating:P.dangerRating(q),combatMode:q.combatMode,minutes:q.durationMinutes,samples});
  if(rows.length%10===0)console.log(`${rows.length}/${content.quests.length} quests (${Math.round((Date.now()-start)/1000)}s)`);
 }
 const report={schema:P.SCHEMA_VERSION,method:'Full expeditions; two complementary three-member compositions; four seeds each. Ordinary gear: cheapest compatible head/body. Strong gear: highest-price compatible item in each slot. Fresh full pools, no rituals. Ratings assume a full trio; smaller parties use their own risk preview. Samples estimate risk, not guaranteed outcomes.',compositions,runs:rows.reduce((n,r)=>n+r.samples.reduce((m,s)=>m+s.runs,0),0),rows};
 const file=calibrate?'docs/Quest_Level_Calibration.json':'docs/Quest_Level_Audit.json';fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({file,runs:report.runs,seconds:(Date.now()-start)/1000}));
}
module.exports={run,sample};
