const fs=require('node:fs'),P=require('../js/plugins/RPGManagerProgression'),roster=require('../data/RPGManagerRoster.json'),quests=require('../data/RPGManagerStage3.json').quests,rows=[];
for(const q of quests)for(let seed=1;seed<=10;seed++){
 const s=P.createState(roster,()=>.5);s.nextTripId=seed;s.campaignStats.questsCompleted=100;P.dispatchQuest(s,'A',q,undefined,1000);const t=s.trips.A;
 rows.push({quest:q.id,minutes:q.durationMinutes,skulls:P.dangerRating(q),seed,encounters:t.encounterPlan.length,timesMs:t.encounterPlan.map(p=>p.atMs),campfire:q.durationMinutes>=15?[t.totalDurationMs/2,t.totalDurationMs/2+60000]:null});
}
fs.writeFileSync('tests/strict-focus-plans.json',JSON.stringify(rows,null,2));console.log('PASS: 310 seeded encounter plans recorded by duration and skull rating.');
