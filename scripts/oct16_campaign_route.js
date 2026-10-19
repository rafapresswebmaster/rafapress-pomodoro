// Real fresh campaign rules, explicit free vacancy replacements and paid care.
const fs=require('node:fs'),P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle');
const roster=require('../data/RPGManagerRoster.json'),base=require('../data/RPGManagerQuests.json'),stage=require('../data/RPGManagerStage3.json');
const content={...base,...stage,narratives:require('../data/RPGManagerNarratives.json'),presentation:require('../data/RPGManagerPresentation.json')};
const s=P.createState(roster,()=>.5);P.beginStartingRoster(s,roster,()=>.5);P.createStartingParty(s,['knight','barbarian','ranger'].map((classId,i)=>({classId,sex:'male',name:['Alder','Borin','Cedric'][i],portraitKey:P.portraitOptions(classId,'male')[0].key}))); 
const route=['clear_cellar','clear_cellar','search_old_road','goblin_tracks','spider_nest','lantern_index','herbarium_circuit','aqueduct_survey','watchpost_at_dusk','patrol_cemetery','escort_apothecary','clear_cellar','goblin_tracks','herbarium_circuit','spider_nest','lantern_index'],rows=[];
for(const id of route){
 const before=P.activeRoster(s).map(n=>({id:n.id,classId:n.classId,sex:n.sex}));
 P.dispatchQuest(s,'A',stage.quests.find(q=>q.id===id),undefined,1000);while(s.trips.A)P.tickRealtimeExpedition(s,5000,content,B.Battle,false,false);
 const r=s.questResults,row={mission:rows.length+1,quest:id,outcome:r.outcome,retreat:r.autoRetreat,gold:r.rewardGold,xpEach:r.xpPerMember,members:r.members.map(n=>({name:n.name,level:n.level,condition:n.condition,injuries:n.lastingInjuries})),replacements:[],armorCare:0};
 P.dismissQuestResults(s);
 for(const n of before.filter(n=>!P.living(s.roster.find(x=>x.id===n.id)))){const candidate=P.replacementCandidates(s).find(c=>c.classId===n.classId&&c.sex===n.sex);const hired=P.recruitCandidate(s,candidate.id);if(!hired.ok)throw Error(hired.message);row.replacements.push(hired.npc.name);}
 for(const [i,n] of P.activeRoster(s).entries()){
  if(!n.equipmentSlots.head&&s.gold>=P.SHOP.leather_cap.price){P.purchase(s,'leather_cap');P.equipSlot(s,n.id,'leather_cap','head');}
  P.assignCampJob(s,n.id,i===0?'study':'work');
 }
 const care=Math.max(0,...P.activeRoster(s).map(n=>n.maxHealth-n.health))*30000;for(let t=0;t<care;t+=5000)P.accrueCampJobs(s,5000);
 row.campRecoveryMs=care;row.balance=s.gold;row.arcana=s.arcana;row.gear=P.activeRoster(s).map(n=>({...n.equipmentSlots}));rows.push(row);
}
fs.writeFileSync('tests/oct16-campaign-route.json',JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify({missions:rows.length,deaths:rows.reduce((n,r)=>n+r.replacements.length,0),finalGold:s.gold,party:P.activeRoster(s).map(n=>({name:n.name,level:n.level,xp:n.xp,injuries:n.lastingInjuries}))},null,2));
