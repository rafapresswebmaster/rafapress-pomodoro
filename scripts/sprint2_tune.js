// Sweep actual encounter HP/damage, without applying any changes to source data.
const P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle'),fs=require('node:fs');
const base=require('../data/RPGManagerQuests.json'),stage=require('../data/RPGManagerStage3.json'),roster=require('../data/RPGManagerRoster.json');
const content={...base,...stage,presentation:require('../data/RPGManagerPresentation.json')};
const parties=[['knight','barbarian','ranger'],['rogue','mage','cleric'],['mage','mage','mage']],rows=[];
for(const difficulty of ['Normal','Hard'])for(const hp of [1,2,3,4])for(const damage of [0,1]){
 const row={difficulty,hp,damage,runs:0,wins:0,deaths:0};
 for(const id of difficulty==='Normal'?['search_old_road','goblin_tracks','patrol_cemetery']:['watchpost_at_dusk','spider_nest','sunken_crypt'])for(const classes of parties)for(let seed=1;seed<=15;seed++){
  const s=P.createState(roster,()=>.5);s.nextTripId=seed;s.campaignStats.questsCompleted=5;
  P.activeRoster(s).forEach((n,i)=>{n.classId=classes[i];n.level=difficulty==='Hard'?2:1;Object.assign(n,P.classFor(n).stats);P.ensureLife(n);n.health=n.maxHealth;n.classArmor=n.classArmorMax;n.innateWard=n.innateWardMax;});
  const quest={...stage.quests.find(q=>q.id===id),encounterTuning:{hp,damage}};P.dispatchQuest(s,'A',quest,undefined,1000);while(s.trips.A)P.tickRealtimeExpedition(s,5000,content,B.Battle,false,false);
  row.runs++;row.wins+=s.questResults.outcome==='victory';row.deaths+=s.questResults.members.filter(n=>n.condition==='Dead').length;
 }rows.push(row);
}
fs.writeFileSync('tests/sprint2-tuning.json',JSON.stringify(rows,null,2));console.log(rows.map(r=>({...r,win:r.wins/r.runs}))); 
