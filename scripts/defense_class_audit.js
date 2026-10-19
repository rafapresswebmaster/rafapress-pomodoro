const fs=require('node:fs'),P=require('../js/plugins/RPGManagerProgression'),{Battle}=require('../js/plugins/RPGManagerBattle');
const roster=require('../data/RPGManagerRoster.json'),data={...require('../data/RPGManagerQuests.json'),...require('../data/RPGManagerStage3.json')},classes=P.ALL_CLASSES,rows=[];
for(let a=0;a<6;a++)for(let b=a;b<6;b++)for(let c=b;c<6;c++)for(const rating of [2,5,8])for(const gear of ['ordinary','strong']){
 const ids=[classes[a],classes[b],classes[c]],q=data.quests.find(q=>q.durationMinutes===15&&q.skulls===rating&&q.enemyIds.length>=2),row={classes:ids,rating,gear,runs:0,wins:0,deaths:0};
 for(let seed=1;seed<=6;seed++){
  const s=P.createState(roster,()=>.5);s.roster.forEach((n,i)=>{
   n.classId=ids[i];n.level=rating;P.ensureLife(n);for(const slot of gear==='ordinary'?['head','body']:P.EQUIPMENT_SLOTS){const pool=P.armorGearIds().filter(id=>P.SHOP[id].slot===slot&&P.compatible(n,id)).sort((a,b)=>P.SHOP[a].price-P.SHOP[b].price);const id=gear==='strong'?pool.at(-1):pool[0];if(id){s.equipmentStock[id]++;P.equipSlot(s,n.id,id,slot);}}
   n.health=n.maxHealth;n.classArmor=n.classArmorMax;n.innateWard=n.innateWardMax;
  });
  const battle=new Battle(P.prepareTeam(s),P.encounterEnemies({enemyIds:q.enemyIds.slice(0,3)},data,q),{seed,maxActions:180});while(battle.snapshot().status==='running')battle.step();const snap=battle.snapshot();row.runs++;row.wins+=snap.status==='victory';row.deaths+=snap.fighters.filter(n=>n.side==='player'&&n.health<=0).length;
 }rows.push(row);
}
const marginal={};for(const cls of classes)for(const gear of ['ordinary','strong']){const group=rows.filter(r=>r.classes.includes(cls)&&r.gear===gear&&r.rating===8);marginal[cls+'/'+gear]={runs:group.reduce((n,r)=>n+r.runs,0),wins:group.reduce((n,r)=>n+r.wins,0)};}
const out={method:'All 56 unordered trios including duplicates, ratings/levels 2,5,8; ordinary and strongest compatible equipment; six seeds. Single objective encounters with durability. Marginal win rates include teammates; they are not individual causal strength.',runs:rows.reduce((n,r)=>n+r.runs,0),marginal,rows};fs.writeFileSync('docs/Defense_Class_Audit.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({runs:out.runs,marginal}));
