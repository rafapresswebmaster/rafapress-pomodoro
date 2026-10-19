// Reproducible multi-seed expedition audit; writes no campaign or save files.
const P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle');
const roster=require('../data/RPGManagerRoster.json'),base=require('../data/RPGManagerQuests.json'),stage=require('../data/RPGManagerStage3.json');
const content={...base,...stage,presentation:require('../data/RPGManagerPresentation.json')};
const rows=[];
for(const level of [1,2,4])for(const id of ['gather_medicinal_herbs','collect_grave_moss','goblin_tracks','abandoned_shrine','sunken_crypt','black_gate']){
 let wins=0,deaths=0,wounded=0,hpLoss=0,gold=0,arcana=0,battles=0;
 for(let seed=1;seed<=100;seed++){
  const s=P.createState(roster,()=>.5);s.campaignStats.questsCompleted=5;s.nextTripId=seed;
  for(const n of P.activeRoster(s)){n.level=level;P.ensureLife(n);n.health=n.maxHealth;n.classArmor=n.classArmorMax;n.innateWard=n.innateWardMax;}
  const initial=P.activeRoster(s).reduce((sum,n)=>sum+n.health,0),g=s.gold,a=s.arcana;
  P.dispatchQuest(s,'A',content.quests.find(q=>q.id===id),undefined,1000);
  class Count extends B.Battle{constructor(...args){super(...args);battles++;}}
  while(s.trips.A)P.tickRealtimeExpedition(s,5000,content,Count,false,false);
  wins+=s.questResults.outcome==='victory';deaths+=P.graveyard(s).length;wounded+=s.roster.filter(n=>n.condition==='Wounded'&&!n.retired).length;
  hpLoss+=initial-s.questResults.members.reduce((sum,n)=>sum+n.health,0);gold+=s.gold-g;arcana+=s.arcana-a;
 }
 rows.push({level,quest:id,victoryPercent:wins,deathsPerTrip:deaths/100,woundedPerTrip:wounded/100,meanHpLost:hpLoss/100,meanGold:gold/100,meanArcana:arcana/100,meanBattles:battles/100});
}
const output=JSON.stringify(rows,null,2)+'\n';
if(process.argv[2])require('node:fs').writeFileSync(process.argv[2],output,'utf8');else console.log(output);
