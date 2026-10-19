// Calibrate whole expeditions, including attrition, recovery, wear and extraction.
// Run only when deliberately reauthoring balance; never touches player saves.
const fs=require('node:fs'),P=require('../js/plugins/RPGManagerProgression');
const {sample}=require('./quest_level_audit');
const file='data/RPGManagerStage3.json',content=JSON.parse(fs.readFileSync(file)),rows=[];
const score=s=>Math.abs(s[0].clearRate-.65)+Math.abs(s[1].clearRate-.9)*1.5+Math.abs(s[2].clearRate-1)*2;
for(const q of content.quests){
 if(q.combatMode==='none'||q.skulls<3){q.encounterTuning={hp:0,damage:0,speed:0};continue;}
 let best=null;
 const solo=q.enemyIds.length===1;
 const candidates=solo?[[0,1],[2,1],[4,1],[0,2],[4,2]]:[[0,0],[-2,0],[-4,0],[0,-1],[2,0],[4,0]];
 for(const [hp,damage] of candidates){
  q.encounterTuning={hp,damage,speed:0};
  const samples=['none','ordinary','strong'].map(g=>sample(q,P.dangerRating(q),g,4));
  const candidate={tuning:{...q.encounterTuning},samples,score:score(samples)};
  if(!best||candidate.score<best.score)best=candidate;
  if(best.score<.12)break;
 }
 q.encounterTuning=best.tuning;rows.push({id:q.id,rating:q.skulls,...best});
 if(rows.length%20===0)console.log(`${rows.length} calibrated`);
}
fs.writeFileSync(file,JSON.stringify(content,null,2)+'\n');
fs.writeFileSync('docs/Enemy_Profile_Calibration.json',JSON.stringify({method:'Two three-member class compositions, four seeds per gear tier per candidate; whole expeditions. Best fit targets 65% unequipped, 90% basic head/body, 100% premium gear clears. Per-quest tuning changes HP and damage while preserving creature profiles. This is calibration, not independent validation.',rows},null,2)+'\n');
console.log(`Completed ${rows.length} quests`);
