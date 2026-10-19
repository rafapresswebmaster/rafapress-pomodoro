const fs=require('node:fs'),P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle');
const base=require('../data/RPGManagerQuests.json'),stage=require('../data/RPGManagerStage3.json'),roster=require('../data/RPGManagerRoster.json'),content={...base,...stage},rows=[];
for(const gear of ['none','ordinary'])for(const q of stage.quests.slice(23))for(const classes of [['knight','barbarian','ranger'],['rogue','mage','cleric'],['mage','mage','mage']]){
 const row={quest:q.id,minutes:q.durationMinutes,difficulty:q.difficulty,level:q.intendedLevel,gear,classes,runs:20,wins:0,deaths:0,wounded:0,retreats:0,draws:0};
 for(let seed=1;seed<=20;seed++){
  const s=P.createState(roster,()=>.5);s.nextTripId=seed;s.campaignStats.questsCompleted=5;
  P.activeRoster(s).forEach((n,i)=>{n.classId=classes[i];n.level=q.intendedLevel;n.selectedMove=P.classFor(n).moves[0].id;Object.assign(n,P.classFor(n).stats);P.ensureLife(n);n.health=n.maxHealth;n.classArmor=n.classArmorMax;n.innateWard=n.innateWardMax;if(gear==='ordinary'){s.equipmentStock.leather_cap++;P.equipSlot(s,n.id,'leather_cap','head');}});
  P.dispatchQuest(s,'A',q,undefined,1000);P.debugAdvanceExpedition(s,content,B.Battle,true);const r=s.questResults;row.wins+=r.outcome==='victory'&&!r.autoRetreat;row.deaths+=r.members.filter(n=>n.condition==='Dead').length;row.wounded+=r.members.filter(n=>n.condition==='Wounded').length;row.retreats+=!!r.autoRetreat;row.draws+=r.outcome==='draw';
 }rows.push(row);
}
const output={runs:rows.reduce((n,r)=>n+r.runs,0),method:'Eight added contracts, intended levels, three compositions, 20 seeds, no gear / ordinary cap. Existing 23 contracts unchanged.',rows};fs.writeFileSync('tests/review-balance.json',JSON.stringify(output,null,2)+'\n');const groups={};for(const r of rows){const t=groups[`${r.quest}:${r.gear}`]||={runs:0,wins:0,deaths:0,wounded:0,retreats:0,draws:0};for(const k in t)t[k]+=r[k];}console.log(JSON.stringify({runs:output.runs,groups},null,2));
