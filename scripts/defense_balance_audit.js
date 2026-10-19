const fs=require('node:fs'),{sample}=require('./quest_level_audit'),P=require('../js/plugins/RPGManagerProgression');
const data=require('../data/RPGManagerStage3.json'),rows=[],started=Date.now();
for(const q of data.quests){
 const scenarios=[[q.skulls,'ordinary'],[q.skulls,'strong']];
 if(q.skulls===1)scenarios.push([1,'none']);
 if(q.skulls>1&&q.durationMinutes===10)scenarios.push([Math.max(1,q.skulls-2),'ordinary']);
 rows.push({id:q.id,rating:q.skulls,minutes:q.durationMinutes,samples:scenarios.map(([level,gear])=>sample(q,level,gear,3))});
 if(rows.length%40===0)console.log(`${rows.length}/${data.quests.length} quests audited`);
}
const byRating={};for(let rating=1;rating<=8;rating++)for(const gear of ['none','ordinary','strong']){
 const samples=rows.filter(q=>q.rating===rating).flatMap(q=>q.samples.filter(s=>s.level===rating&&s.gear===gear));
 if(samples.length)byRating[`${rating}/${gear}`]=samples.reduce((a,s)=>{for(const k of ['runs','clears','deaths','casualties','battles'])a[k]=(a[k]||0)+s[k];return a;},{});
}
const out={schema:P.SCHEMA_VERSION,method:'Full missions: two complementary three-class compositions, three seeds each, ordinary head/body or strongest compatible four-slot gear; level-matched all quests, unequipped L1 for all one-skull quests, underlevel probes for ten-minute quests. No rituals. Gear is gifted; durability, breakage, XP and battle loot enabled.',runs:rows.reduce((n,r)=>n+r.samples.reduce((m,s)=>m+s.runs,0),0),elapsedSeconds:(Date.now()-started)/1000,byRating,rows};
fs.writeFileSync('docs/Defense_Rebalance_Audit.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({runs:out.runs,seconds:out.elapsedSeconds,byRating}));
