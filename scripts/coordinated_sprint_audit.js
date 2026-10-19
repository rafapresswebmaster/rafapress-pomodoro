// Entire catalogue, three contrasting party compositions, fresh levels 1/2/4.
const fs=require('node:fs'),P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle');
const roster=require('../data/RPGManagerRoster.json'),base=require('../data/RPGManagerQuests.json'),stage=require('../data/RPGManagerStage3.json');
const content={...base,...stage,presentation:require('../data/RPGManagerPresentation.json')},rows=[];
const parties=[['knight','barbarian','ranger'],['rogue','mage','cleric'],['mage','mage','mage']];
for(const classes of parties)for(const level of [1,2,4])for(const quest of stage.quests){
 const row={quest:quest.id,tier:`${P.questDurationCategory(quest)}/${quest.difficulty}`,classes,level,runs:20,wins:0,retreats:0,wounded:0,deaths:0,gold:0,arcana:0,xpEach:0,battles:0};
 for(let seed=1;seed<=row.runs;seed++){
  const s=P.createState(roster,()=>.5);s.nextTripId=seed;s.campaignStats.questsCompleted=5; // unlock catalogue only; no stats/gear/rewards granted
  P.activeRoster(s).forEach((n,i)=>{n.classId=classes[i];n.level=level;Object.assign(n,P.classFor(n).stats);P.ensureLife(n);n.selectedMove=P.classFor(n).moves[0].id;n.health=n.maxHealth;n.classArmor=n.classArmorMax;n.innateWard=n.innateWardMax;});
  P.dispatchQuest(s,'A',quest,undefined,1000);
  let guard=0;while(s.trips.A){if(++guard>400)throw Error(`Unbounded ${quest.id}`);P.tickRealtimeExpedition(s,5000,content,B.Battle,false,false);}
  const r=s.questResults;row.wins+=r.outcome==='victory';row.retreats+=!!r.autoRetreat;row.wounded+=r.members.filter(n=>n.condition==='Wounded').length;row.deaths+=r.members.filter(n=>n.condition==='Dead').length;row.gold+=r.rewardGold;row.arcana+=r.rewardArcana;row.xpEach+=r.xpPerMember;row.battles+=r.battleCount;
 }
 rows.push(row);
}
const totals={};for(const r of rows){const key=`L${r.level} ${r.tier}`,t=totals[key]||={runs:0,wins:0,retreats:0,wounded:0,deaths:0,gold:0,arcana:0,xpEach:0,battles:0};for(const k of Object.keys(t))t[k]+=r[k];}
const output={method:'20 seeds x 23 contracts x 3 levels x 3 parties; full HP/defenses, no purchased gear. Win refers to final combat/objective outcome; retreat is separate.',totalRuns:rows.reduce((n,r)=>n+r.runs,0),tiers:totals,rows};
fs.writeFileSync(process.argv[2]||'tests/coordinated-sprint-balance.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({totalRuns:output.totalRuns,tiers:totals},null,2));
