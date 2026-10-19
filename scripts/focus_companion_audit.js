// Reproducible sample of the newly authored contracts; no save files or offline time.
const P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle');
const roster=require('../data/RPGManagerRoster.json'),base=require('../data/RPGManagerQuests.json'),stage=require('../data/RPGManagerStage3.json');
const content={...base,...stage,presentation:require('../data/RPGManagerPresentation.json')},rows=[];
for(const level of [1,2,4])for(const quest of stage.quests.filter(q=>q.durationMinutes>=25||q.id==='watchpost_at_dusk')){
 let victories=0,retreats=0,wounds=0,deaths=0,battles=0,gold=0,arcana=0,armorDeficit=0,hpDeficit=0;
 for(let seed=1;seed<=100;seed++){
  const s=P.createState(roster,()=>.5);s.nextTripId=seed;
  for(const n of P.activeRoster(s)){n.level=level;P.ensureLife(n);n.health=n.maxHealth;n.classArmor=n.classArmorMax;n.innateWard=n.innateWardMax;}
  const g=s.gold,a=s.arcana;P.dispatchQuest(s,'A',quest,undefined,1000);
  while(s.trips.A)P.tickRealtimeExpedition(s,5000,content,B.Battle,false,false);
  const r=s.questResults;victories+=r.outcome==='victory';retreats+=r.autoRetreat;wounds+=r.members.filter(n=>n.condition==='Wounded').length;deaths+=r.members.filter(n=>n.condition==='Dead').length;battles+=r.battleCount;gold+=s.gold-g;arcana+=s.arcana-a;
  for(const n of s.roster){armorDeficit+=Math.max(0,n.classArmorMax-n.classArmor);hpDeficit+=Math.max(0,n.maxHealth-n.health);}
 }
 rows.push({level,quest:quest.id,minutes:quest.durationMinutes,difficulty:quest.difficulty,victoryPercent:victories,retreatPercent:retreats,meanWounded:wounds/100,meanDeaths:deaths/100,meanBattles:battles/100,meanGold:gold/100,meanArcana:arcana/100,meanClassArmorDeficit:armorDeficit/100,meanHPDeficit:hpDeficit/100});
}
const output=JSON.stringify(rows,null,2)+'\n';if(process.argv[2])require('node:fs').writeFileSync(process.argv[2],output);else console.log(output);
