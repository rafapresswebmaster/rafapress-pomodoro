const fs=require('node:fs'),file='data/RPGManagerStage3.json',data=JSON.parse(fs.readFileSync(file,'utf8'));
const enemies=require('../data/RPGManagerQuests.json').enemies,known=new Set(enemies.map(e=>e.id));
const themes=[
 {name:'Woodland',background:'QuestWoodland_v8',place:'woodland paths',pool:['wolf','gnoll','giant_spider_1'],boss:['treant','owlbear','swamp_hag']},
 {name:'Coast',background:'QuestCoast_v8',place:'tidal roads and sea caves',pool:['pirate','giant_bat','ratman'],boss:['pirate_captain','harpy','wyrmling']},
 {name:'Crypt',background:'QuestCrypt_v8',place:'burial galleries and ruined shrines',pool:['skeleton_1','ghost','ghoul'],boss:['necromancer','wraith','gargoyle']},
 {name:'Mountain',background:'QuestMountain_v8',place:'mountain passes and old quarries',pool:['kobold','gnoll','gargoyle'],boss:['hill_giant','minotaur','basilisk']}
];
const prefixes=['Amber','Birch','Cinder','Dawn','Ember','Fern','Garnet','Hazel','Ivory','Juniper','Kings','Lantern','Moss','North','Opal','Pine','Quartz','Raven','Silver','Thorn'];
const suffixes=['Hollow','Reach','Ford','Watch','Vale','Crossing','Ridge','Haven','Marsh','Gate','Bank','Rest'];
const tasks=[['Recover the Waystones','recover scattered route markers and escort the surveyors home'],['The Missing Couriers','find the lost couriers and secure their return route'],['Keep the Beacon Burning','deliver lamp oil and protect the signal keepers'],['The Broken Supply Road','clear the supply route and recover the stranded provisions'],['Echoes at the Border','investigate strange tracks and drive off the creatures gathering nearby']];
let added=0;
for(const minutes of [5,10,15,20,25,30])for(let rating=1;rating<=8;rating++){
 let count=data.quests.filter(q=>q.durationMinutes===minutes&&q.skulls===rating).length;
 for(let variant=count;variant<5;variant++){
  const index=[5,10,15,20,25,30].indexOf(minutes)*40+(rating-1)*5+variant,theme=themes[index%themes.length];
  const region=prefixes[index%prefixes.length]+suffixes[Math.floor(index/prefixes.length)%suffixes.length],task=tasks[variant%tasks.length];
  const pool=rating===1?['slime','giant_bat','kobold']:rating>=7?theme.boss:theme.pool;
  if(!pool.every(id=>known.has(id)))throw Error('Unknown enemy in '+theme.name);
  const ids=rating===1?[pool[variant%pool.length]]:rating<=3?pool.slice(0,2):pool.slice(0,3),id=`frontier_${minutes}_${rating}_${variant+1}`;
  if(data.quests.some(q=>q.id===id))throw Error('Duplicate quest '+id);
  const journey=`Travel through ${theme.place} to ${region}, ${task[1]}, then return to camp.`;
  data.quests.push({id,name:`${region}: ${task[0]}`,durationMinutes:minutes,skulls:rating,intendedLevel:rating,encounterTier:rating<=2?1:rating<=4?2:rating<=6?3:4,balanceVersion:31,
   category:rating>=7?'Boss Hunt':variant%2?'Patrol':'Fieldwork',description:journey,danger:`${ids.map(id=>enemies.find(e=>e.id===id).name).join(', ')} hold the route near ${region}.`,risk:`${rating}-skull`,difficulty:rating<=2?'Easy':rating<=5?'Normal':'Hard',
   environment:`${theme.name} / ${region}`,combatMode:'required',enemyIds:ids,skirmishEnemyIds:theme.pool.slice(0,2),boss:rating>=7,faction:'Frontier Guild',travelSeconds:8,
   rewardGold:{victory:1,draw:0,defeat:0},rewardArcana:{victory:1,draw:0,defeat:0},xpReward:1,bonusRewards:{},rewardTypes:[],encounterTuning:{},encounterType:rating>=7?'Patrols and a defended boss objective':'Road patrols and an objective encounter',knownThreats:ids.map(id=>enemies.find(e=>e.id===id).name),knownConditions:[`${minutes}-minute expedition`,`Estimated party level ${rating}`],rumors:[`The ${region} beacon has gone quiet.`,`${theme.place} conceal a route to the missing supplies.`],journey,chance:'Normal',randomEncounters:[],tags:[theme.name,'Frontier',rating>=7?'Boss':'Patrol'],objectiveReturnText:`The work at ${region} is complete. Return to camp.`,battleback:theme.background,battlebackFolder:'pictures'});
  added++;
 }
}
for(const q of data.quests){
 if(q.durationMinutes>1&&!q.enemyIds.length){q.enemyIds=q.skulls>=7?['necromancer','ghoul','gargoyle']:['kobold','giant_bat'];q.skirmishEnemyIds=['kobold'];q.combatMode='required';q.encounterType='Road patrols and an objective encounter';q.knownThreats=q.enemyIds.map(id=>enemies.find(e=>e.id===id).name);}
 q.balanceVersion=31;q.xpPool=q.durationMinutes===1?3:Math.round(q.durationMinutes*(4+q.skulls*1.5+q.skulls*q.skulls*.25)*(1+(q.durationMinutes-5)/50));q.xpReward=Math.floor(q.xpPool/3);
 q.rewardGold={victory:q.durationMinutes===1?3:Math.round(q.durationMinutes*(8+q.skulls*2)),draw:Math.round(q.durationMinutes),defeat:0};
 q.rewardArcana={victory:q.durationMinutes===1?0:Math.round(q.durationMinutes*(2+q.skulls*1.25)),draw:0,defeat:0};
 q.bonusRewards={...q.bonusRewards,commonEquipmentChance:0,rareEquipmentChance:0};
 q.rewardTypes=[`${q.rewardGold.victory} Gold`,`${q.rewardArcana.victory} Arcana`,`${q.xpPool} shared completion XP`];
 q.riskExplanation=q.skulls===1?'Low-risk level-one route. Weak scattered enemies; a healthy trio should be safe. Smaller parties must still prepare.':q.skulls===8?'Extreme level-eight route. Strong equipment and defensive powers matter; deaths remain possible.':`Estimated average party level ${q.skulls}. Low HP makes Armor, Ward and Dodge essential over the full expedition.`;
 if(q.durationMinutes===1)q.riskExplanation='Safe combatless level-one stroll. Modest shared XP and finds.';
 if(!fs.existsSync(`img/${q.battlebackFolder||'battlebacks1'}/${q.battleback}.webp`))throw Error('Missing background '+q.id);
}
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({added,total:data.quests.length,coveredCombinations:48}));
