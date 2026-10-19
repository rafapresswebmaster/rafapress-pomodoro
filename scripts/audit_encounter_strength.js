// Inspect every scheduled enemy and reserve, separately from probabilistic combat outcomes.
const fs=require('node:fs'),P=require('../js/plugins/RPGManagerProgression');
const content={...require('../data/RPGManagerQuests.json'),...require('../data/RPGManagerStage3.json')},roster=require('../data/RPGManagerRoster.json'),tiers=[];
for(let rating=3;rating<=8;rating++){
 const row={rating,quests:0,battles:0,twoWaveBattles:0,objectives:0,twoWaveObjectives:0,enemies:0,twoHpEnemies:0,minHp:Infinity};
 for(const q of content.quests.filter(q=>q.skulls===rating)){
  const s=P.createState(roster,()=>.5);s.campaignStats.questsCompleted=100;P.dispatchQuest(s,'A',q,content.xp,1000);const t=s.trips.A;row.quests++;
  for(const {stage} of t.encounterPlan){
   row.battles++;if(stage.waves?.length>1)row.twoWaveBattles++;
   if(stage.mainQuest){row.objectives++;if(stage.waves?.length>1)row.twoWaveObjectives++;}
   for(const [index,enemyIds] of (stage.waves||[stage.enemyIds]).entries())for(const e of P.encounterEnemies({...stage,enemyIds,reinforcementWave:stage.reinforcementWaveIndex===index},content,t)){
    row.enemies++;row.minHp=Math.min(row.minHp,e.health);if(e.health<=2)row.twoHpEnemies++;
   }
  }
 }
 tiers.push(row);
}
const report={balanceVersion:33,method:'All authored three-to-eight-skull quests; every planned main encounter, patrol, split wave and reinforcement. Initial pools before battle damage. Wave frequency is deterministic per quest, with patrol waves reserved for long high-tier missions.',tiers};
fs.writeFileSync('docs/Encounter_Reinforcement_Audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(tiers));
