const fs=require('node:fs'),P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle');
const base=require('../data/RPGManagerQuests.json'),stage=require('../backups/oct16-source/RPGManagerStage3.json'),roster=require('../data/RPGManagerRoster.json'),content={...base,...stage};
const parties=[['knight','barbarian','ranger'],['rogue','mage','cleric'],['mage','mage','mage']],rows=[];
for(const extraHp of [0,1,2,3])for(const gear of ['none','ordinary'])for(const difficulty of ['Normal','Hard']){
 const row={extraHp,gear,difficulty,runs:0,wins:0,deaths:0};
 for(const raw of stage.quests.filter(q=>q.difficulty===difficulty))for(const classes of parties)for(let seed=1;seed<=8;seed++){
  const s=P.createState(roster,()=>.5);s.nextTripId=seed;s.campaignStats.questsCompleted=5;
  P.activeRoster(s).forEach((n,i)=>{n.classId=classes[i];n.level=raw.intendedLevel;Object.assign(n,P.classFor(n).stats);P.ensureLife(n);n.health=n.maxHealth;n.classArmor=n.classArmorMax;n.innateWard=n.innateWardMax;if(gear==='ordinary'){s.equipmentStock.leather_cap++;P.equipSlot(s,n.id,'leather_cap','head');}});
  const q={...raw,encounterTuning:{...raw.encounterTuning,hp:(raw.encounterTuning?.hp||0)+extraHp}};P.dispatchQuest(s,'A',q,undefined,1000);P.debugAdvanceExpedition(s,content,B.Battle,true);row.runs++;row.wins+=s.questResults.outcome==='victory'&&!s.questResults.autoRetreat;row.deaths+=s.questResults.members.filter(n=>n.condition==='Dead').length;
 }rows.push(row);console.log(JSON.stringify({...row,winPct:row.wins/row.runs*100}));
}
fs.writeFileSync('tests/oct16-tuning.json',JSON.stringify(rows,null,2));
