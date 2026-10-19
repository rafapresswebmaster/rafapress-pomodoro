// Representative fresh campaign: real contracts, paid Armor care and open camp time.
const fs=require('node:fs'),P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle');
const base=require('../data/RPGManagerQuests.json'),stage=require('../data/RPGManagerStage3.json');
const s=P.createState(require('../data/RPGManagerRoster.json'),()=>.5),content={...base,...stage,presentation:require('../data/RPGManagerPresentation.json')},rows=[];
for(let i=0;i<24;i++){
 const q=stage.quests.find(q=>q.id===(i<2?'clear_cellar':'collect_grave_moss'));
 P.dispatchQuest(s,'A',q,undefined,1000);while(s.trips.A)P.tickRealtimeExpedition(s,5000,content,B.Battle,false,false);
 rows.push({mission:i+1,quest:q.id,levels:s.roster.map(n=>({name:n.name,level:n.level,xp:n.xp,condition:n.condition})),gold:s.gold});
 P.dismissQuestResults(s);
 for(const n of P.activeRoster(s)){const quote=P.armorRestoreQuote(s,n.id);if(!quote.error)P.restoreClassArmor(s,n.id,true,quote.cost);}
 // Three minutes of camp-only open-process recovery, never expedition/offline healing.
 for(let t=0;t<180000;t+=5000)P.accrueCampJobs(s,5000);
}
fs.writeFileSync('tests/coordinated-sprint-route.json',JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows.filter(r=>[2,8,24].includes(r.mission)),null,2));
