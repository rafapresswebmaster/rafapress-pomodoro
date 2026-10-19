// Read-only game simulation. Writes only its dated documentation artifact.
const fs=require('node:fs'),path=require('node:path');
const P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle');
const roster=require('../data/RPGManagerRoster.json'),content={...require('../data/RPGManagerQuests.json'),...require('../data/RPGManagerStage3.json'),presentation:require('../data/RPGManagerPresentation.json')};
const compositions=[['knight','barbarian','ranger'],['rogue','mage','cleric']],clone=x=>JSON.parse(JSON.stringify(x));
let counter=0;const started=Date.now();
function run(q,level,gear,classes,seed,ritual=null){
 const s=P.createState(roster,()=>.5);s.nextTripId=seed;s.campaignStats.questsCompleted=100;s.arcana=100000;
 P.activeRoster(s).forEach((n,i)=>{
  n.classId=classes[i];n.level=level;n.selectedMove=P.classFor(n).moves[0].id;Object.assign(n,P.classFor(n).stats);P.ensureLife(n);n.health=n.maxHealth;n.classArmor=n.classArmorMax;n.innateWard=n.innateWardMax;
  for(const slot of gear==='none'?[]:gear==='ordinary'?['head','body']:P.EQUIPMENT_SLOTS){
   const ids=P.armorGearIds().filter(id=>P.SHOP[id].slot===slot&&P.compatible(n,id)).sort((a,b)=>P.SHOP[a].price-P.SHOP[b].price||a.localeCompare(b));const id=gear==='strong'?ids.at(-1):ids[0];if(id){s.equipmentStock[id]++;P.equipSlot(s,n.id,id,slot);}
  }
  n.health=n.maxHealth;n.classArmor=n.classArmorMax;n.innateWard=n.innateWardMax;
 });
 let castResult=null;if(ritual){s.ritualsUnlocked[ritual]=true;castResult=P.ritualCast(s,ritual,P.activeRoster(s)[0].id);if(!castResult.ok)return{castRejected:castResult.message};}
 const arcanaBefore=s.arcana,goldBefore=s.gold;P.dispatchQuest(s,'A',q,undefined,1000);const t=s.trips.A;
 let steps=0,safetyViolations=0,beforeBattles=0;
 while(s.trips.A){
  if(++steps>10000)throw Error('Non-terminating expedition '+q.id);
  P.tickRealtimeExpedition(s,5000,content,B.Battle,false,false);
  const battles=t.chronicle.filter(e=>e.type==='battle').length;
  if(battles>beforeBattles&&(t.remainingMs<72000||t.phase==='campfire'||t.returnNarrated))safetyViolations++;
  if(t.remainingMs<=12000&&t.presentationCurrent?.kind==='battle')safetyViolations++;
  beforeBattles=battles;
 }
 const result=s.questResults,attacks=t.battleEvents.filter(e=>e.type==='attack'),battles=t.chronicle.filter(e=>e.type==='battle'),wins=battles.filter(e=>/ended in victory\./.test(e.text)).length;
 counter++;if(counter%250===0)console.log(`${counter} sessions simulated (${Math.round((Date.now()-started)/1000)}s)`);
 return{clear:Number(result.outcome==='victory'&&!result.autoRetreat),deaths:result.members.filter(n=>n.condition==='Dead').length,wounds:result.members.filter(n=>n.condition==='Wounded').length,wipe:Number(!!t.wiped),retreat:Number(!!result.autoRetreat),battles:battles.length,battleWins:wins,gold:s.gold-goldBefore,arcana:s.arcana-arcanaBefore,activationCost:ritual?P.RITUALS[ritual].castCost:0,breaks:(t.gearLosses||[]).length,safetyViolations,attacks:attacks.length,criticalHits:attacks.filter(e=>e.criticalHit).length,ritualInterceptions:t.battleEvents.filter(e=>e.kind==='ritual'&&e.type==='support').length,mercySaves:t.battleEvents.filter(e=>e.type==='mercy').length,signatureEvents:t.battleEvents.filter(e=>(e.type==='attack'||e.type==='heal'||e.type==='support')&&e.kind==='signature'&&!e.secondary).length,completedMs:t.elapsedMs,durationMs:t.totalDurationMs};
}
const totals=()=>({runs:0,clears:0,deaths:0,wounds:0,wipes:0,retreats:0,battles:0,battleWins:0,gold:0,arcana:0,breaks:0,safetyViolations:0});
function add(t,r){t.runs++;for(const [to,from] of Object.entries({clears:'clear',deaths:'deaths',wounds:'wounds',wipes:'wipe',retreats:'retreat',battles:'battles',battleWins:'battleWins',gold:'gold',arcana:'arcana',breaks:'breaks',safetyViolations:'safetyViolations'}))t[to]+=r[from];return t;}
const rows=[],groups={},questGroups={};
for(const q of content.quests)for(const level of [1,3,5,8])for(const gear of ['none','ordinary','strong']){
 const row={questId:q.id,name:q.name,minutes:q.durationMinutes,skulls:P.dangerRating(q),intendedLevel:q.intendedLevel||1,level,gear,...totals()};
 for(const classes of compositions)for(let seed=1;seed<=3;seed++){
  const r=run(q,level,gear,classes,seed);add(row,r);add(groups[`${P.dangerRating(q)} skull / L${level} / ${gear}`]||=(totals()),r);add(questGroups[q.id]||={name:q.name,minutes:q.durationMinutes,skulls:P.dangerRating(q),...totals()},r);
 }
 rows.push(row);
}
const ritualPairs=[];
const ritualQuests=['wolves_forest','fantasy_11','fantasy_14'].map(id=>content.quests.find(q=>q.id===id)).filter(Boolean);
if(!ritualQuests.some(q=>q.durationMinutes<=5))ritualQuests.unshift(content.quests.find(q=>q.durationMinutes===5&&q.combatMode==='required'&&q.skulls===2));
const buffs=Object.keys(P.RITUALS).filter(id=>!['healing_ritual','greed_prayer','reanimate','last_rites'].includes(id));
for(const ritual of buffs)for(const q of ritualQuests)for(const level of [3,5,8])for(const classes of compositions)for(let seed=1;seed<=5;seed++){
 const baseline=run(q,level,'ordinary',classes,seed),blessed=run(q,level,'ordinary',classes,seed,ritual);
 ritualPairs.push({ritual,questId:q.id,level,composition:classes.join('/'),seed,baseline,blessed});
}
const report={date:'2026-10-17',schema:P.SCHEMA_VERSION,questCount:content.quests.length,enemyCount:content.enemies.length,method:{baseline:'Every runtime quest × levels 1/3/5/8 × none/ordinary/strong gear × two compositions × three seeds; each session starts fresh with full HP/Armor/innate Ward. No ritual in baseline. Five-second simulation steps; presentation consumed by deterministic deadline fallback.',compositions,gear:{none:'No equipment',ordinary:'Least expensive compatible Head and Body items',strong:'Highest-price compatible item in each supported slot'},ritual:'Paired same-seed ordinary-gear runs for ten queued ritual effects, three levels, two compositions, five seeds, and the short/ghoul-hunt/pirate-boss contracts. Immediate healing/revival/exchange rituals are described and unit-tested separately.',ritualQuestIds:ritualQuests.map(q=>q.id),limitations:['Only two compositions; duplicate-class parties and party-order permutations are not covered.','Only three seeds per baseline composition; strata have six observations, not statistically precise win-rate estimates.','Gear is supplied for free in audit setup; quest rewards are not acquisition-cost-adjusted profit.','No repeated-campaign attrition, resting downtime or human choices are modeled.','No user saves are read or written.','Balanced-looking aggregate results can conceal individual quest/class problems.','No native hardware, monitor, audio or long soak acceptance is implied.']},baselineRuns:rows.reduce((n,r)=>n+r.runs,0),ritualPairedRuns:ritualPairs.length*2,elapsedSeconds:(Date.now()-started)/1000,groups,questGroups,rows,ritualPairs};
const target=path.join(__dirname,'../docs/Handoff_Balance_Audit_20261017.json');fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({baselineRuns:report.baselineRuns,ritualPairedRuns:report.ritualPairedRuns,quests:report.questCount,elapsedSeconds:report.elapsedSeconds,safetyViolations:rows.reduce((n,r)=>n+r.safetyViolations,0),artifact:target}));
