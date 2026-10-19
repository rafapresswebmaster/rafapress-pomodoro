const fs=require('node:fs'),P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle');
const roster=require('../data/RPGManagerRoster.json'),content={...require('../data/RPGManagerQuests.json'),...require('../data/RPGManagerStage3.json'),presentation:require('../data/RPGManagerPresentation.json')};
const rows=[],timing=[],compositions=[['knight','barbarian','ranger'],['rogue','mage','cleric']];
for(const q of content.quests)for(const level of [1,4,8])for(const gear of ['none','ordinary','strong']){
 const row={quest:q.id,minutes:q.durationMinutes,skulls:P.dangerRating(q),level,gear,runs:0,wins:0,deaths:0,wounds:0,gearBroken:0,wipes:0,retreats:0,battles:0,minBattles:Infinity,maxBattles:0,rewardGold:0,safetyViolations:0,maxNarrativeGapMs:0};
 for(const classes of compositions)for(let seed=1;seed<=10;seed++){
  const s=P.createState(roster,()=>.5);s.nextTripId=seed;s.campaignStats.questsCompleted=100;
  P.activeRoster(s).forEach((n,i)=>{n.classId=classes[i];n.level=level;n.selectedMove=P.classFor(n).moves[0].id;Object.assign(n,P.classFor(n).stats);P.ensureLife(n);n.health=n.maxHealth;n.classArmor=n.classArmorMax;n.innateWard=n.innateWardMax;
   for(const slot of gear==='none'?[]:gear==='ordinary'?['head','body']:P.EQUIPMENT_SLOTS){const ids=P.armorGearIds().filter(id=>P.SHOP[id].slot===slot&&P.compatible(n,id)).sort((a,b)=>P.SHOP[a].price-P.SHOP[b].price);const id=gear==='strong'?ids.at(-1):ids[0];if(id){s.equipmentStock[id]++;P.equipSlot(s,n.id,id,slot);}}
  });
  P.dispatchQuest(s,'A',q,undefined,1000);const t=s.trips.A;let lastEvents=0,lastNote=0,battleCount=0;
  while(s.trips.A){
   const prev=t.chronicle.filter(e=>e.type==='battle').length;
   P.tickRealtimeExpedition(s,5000,content,B.Battle,false,false);
   const count=t.chronicle.filter(e=>e.type==='battle').length;
   if(count>prev){battleCount+=count-prev;if(t.remainingMs<72000||t.phase==='campfire'||t.returnNarrated)row.safetyViolations++;timing.push({quest:q.id,level,gear,seed,rawPlaybackMs:t.lastBattleMeasuredMs,actions:t.battleEvents.filter(e=>e.type==='attack').length,scaledPlaybackMs:Math.round(t.lastBattleMeasuredMs*t.playbackScale)});}
   const notes=t.lastNarrativeStep||0;if(notes!==lastEvents){row.maxNarrativeGapMs=Math.max(row.maxNarrativeGapMs,t.elapsedMs-lastNote);lastNote=t.elapsedMs;lastEvents=notes;}
   if(t.remainingMs<=12000&&t.presentationCurrent?.kind==='battle')row.safetyViolations++;
  }
  const r=s.questResults;row.runs++;row.wins+=r.outcome==='victory'&&!r.autoRetreat;row.deaths+=r.members.filter(n=>n.condition==='Dead').length;row.wounds+=r.members.filter(n=>n.condition==='Wounded').length;row.gearBroken+=(t.gearLosses||[]).length;row.wipes+=!!t.wiped;row.retreats+=!!r.autoRetreat;row.battles+=battleCount;row.minBattles=Math.min(row.minBattles,battleCount);row.maxBattles=Math.max(row.maxBattles,battleCount);row.rewardGold+=r.rewardGold||0;
 }rows.push(row);
}
const sorted=timing.map(r=>r.rawPlaybackMs).sort((a,b)=>a-b),max=Math.max(...sorted),groups={};
for(const r of rows){const key=`${r.skulls} skull / ${r.gear} / L${r.level}`,g=groups[key]||={runs:0,wins:0,deaths:0,wounds:0,gearBroken:0,wipes:0,battles:0,rewardGold:0,safetyViolations:0};for(const k in g)g[k]+=r[k];}
const report={runs:rows.reduce((s,r)=>s+r.runs,0),method:'31 quests x levels 1/4/8 x no/ordinary/strong gear x two compositions x ten seeds. Each run starts fresh, fixed party order. Ordinary: least expensive compatible head/body. Strong: highest-price compatible gear in each supported slot. No presentation playback while clock advances, exercising fallback.',timing:{battles:timing.length,rawMaxMs:max,rawP95Ms:sorted[Math.floor(sorted.length*.95)],rawP99Ms:sorted[Math.floor(sorted.length*.99)],naturalBufferWithMarginMs:Math.ceil(max*1.2)+12000,playbackTargetMs:55000,enforcedBattleDeadlineMs:60000,extractionMs:12000,worst:timing.filter(r=>r.rawPlaybackMs===max).slice(0,3)},groups,rows};
fs.writeFileSync('tests/strict-focus-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({runs:report.runs,timing:report.timing,groups},null,2));
if(rows.some(r=>r.safetyViolations))process.exitCode=1;
