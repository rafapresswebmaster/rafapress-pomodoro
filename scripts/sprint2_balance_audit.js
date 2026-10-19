const fs=require('node:fs'),P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle');
const base=require('../data/RPGManagerQuests.json'),stage=require('../data/RPGManagerStage3.json'),roster=require('../data/RPGManagerRoster.json');
const content={...base,...stage,presentation:require('../data/RPGManagerPresentation.json')},rows=[];
const parties=[['knight','barbarian','ranger'],['rogue','mage','cleric'],['mage','mage','mage']];
for(const gear of ['none','ordinary'])for(const classes of parties)for(const level of [1,2,4])for(const quest of stage.quests){
 const row={quest:quest.id,duration:quest.durationMinutes,difficulty:quest.difficulty,intendedLevel:quest.intendedLevel,gear,classes,level,runs:20,wins:0,retreats:0,wounded:0,deaths:0,gold:0,arcana:0,xpEach:0,battles:0,encounters:{}};
 for(let seed=1;seed<=row.runs;seed++){
  const s=P.createState(roster,()=>.5);s.nextTripId=seed;s.campaignStats.questsCompleted=5;
  P.activeRoster(s).forEach((n,i)=>{n.classId=classes[i];n.level=level;Object.assign(n,P.classFor(n).stats);P.ensureLife(n);n.selectedMove=P.classFor(n).moves[0].id;n.health=n.maxHealth;n.classArmor=n.classArmorMax;n.innateWard=n.innateWardMax;if(gear==='ordinary'){s.equipmentStock.leather_cap=(s.equipmentStock.leather_cap||0)+1;P.equipSlot(s,n.id,'leather_cap','head');}});
  P.dispatchQuest(s,'A',quest,undefined,1000);let guard=0;while(s.trips.A){if(++guard>400)throw Error('Unbounded expedition');P.tickRealtimeExpedition(s,5000,content,B.Battle,false,false);}
  const r=s.questResults,bucket=row.encounters[r.battleCount]||={runs:0,wins:0,wounded:0,deaths:0,retreats:0};bucket.runs++;bucket.wins+=r.outcome==='victory'&&!r.autoRetreat;bucket.wounded+=r.members.filter(n=>n.condition==='Wounded').length;bucket.deaths+=r.members.filter(n=>n.condition==='Dead').length;bucket.retreats+=!!r.autoRetreat;row.wins+=r.outcome==='victory'&&!r.autoRetreat;row.retreats+=!!r.autoRetreat;row.wounded+=r.members.filter(n=>n.condition==='Wounded').length;row.deaths+=r.members.filter(n=>n.condition==='Dead').length;row.gold+=r.rewardGold;row.arcana+=r.rewardArcana;row.xpEach+=r.xpPerMember;row.battles+=r.battleCount;
 }rows.push(row);
}
const tiers={};for(const r of rows){const key=`L${r.level} ${r.gear} ${r.duration<=3?'Short':r.duration<=10?'Medium':'Long'} ${r.difficulty}`,t=tiers[key]||={runs:0,wins:0,retreats:0,wounded:0,deaths:0,gold:0,arcana:0,xpEach:0,battles:0};for(const k of Object.keys(t))t[k]+=r[k];}
const output={runs:rows.reduce((n,r)=>n+r.runs,0),method:'20 deterministic seeds; 23 contracts; 3 parties; levels 1/2/4; no gear or one compatible leather cap each. Unlock counter only bypassed.',tiers,rows};
fs.writeFileSync('tests/sprint2-balance.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({runs:output.runs,tiers},null,2));
