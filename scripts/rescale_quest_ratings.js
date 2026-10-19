const fs=require('node:fs');
const file='data/RPGManagerStage3.json',data=JSON.parse(fs.readFileSync(file,'utf8'));
const calibration=JSON.parse(fs.readFileSync('docs/Quest_Level_Calibration.json','utf8'));
const counts={},ritualLevels={};
for(const q of data.quests){
 const row=calibration.rows.find(r=>r.id===q.id);if(!row)throw Error('Missing calibration: '+q.id);
 const candidates=row.samples.filter(r=>r.level>=2&&r.clearRate>=.875&&r.deathsPerRun<=.25&&r.casualties/r.runs<=.75);
 const rating=Number(q.durationMinutes)===1||q.combatMode==='none'?1:(candidates[0]?.level||8);
 q.encounterTier??=q.skulls;q.skulls=rating;q.intendedLevel=rating;q.risk=`${rating}-skull`;
 if(/\d-skull/.test(q.chance||''))q.chance=`${rating}-skull`;
 const estimate=rating===1?'Safe level-1 outing. No combat.':rating===8?'Extreme level-8 challenge. Death remains possible at level 8; bring your best gear.':`Estimated party level ${rating}. Bring a healthy, equipped party; wounds and death remain possible.`;
 q.riskExplanation=`${estimate} Rating assumes three companions at roughly this average level. Smaller parties and weaker gear increase risk. ${q.danger}`;
 q.knownConditions=(q.knownConditions||[]).filter(t=>!/Recommended Level|Recommended level|\b[1-5]-skull|^Estimated party level/i.test(t));
 q.knownConditions.unshift(`Estimated party level ${rating} / ${rating} of 8 skulls`);
 if(q.ritualUnlock)ritualLevels[q.ritualUnlock]=rating;
 counts[rating]=(counts[rating]||0)+1;
}
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
const plugin='js/plugins/RPGManagerProgression.js';let source=fs.readFileSync(plugin,'utf8');
for(const [id,level] of Object.entries(ritualLevels)){
 const re=new RegExp(`(${id}:\\{name:[^\\n]+?level:)\\d+`);if(!re.test(source))throw Error('Missing ritual '+id);source=source.replace(re,'$1'+level);
}
fs.writeFileSync(plugin,source);
console.log(JSON.stringify({counts,ritualLevels},null,2));
