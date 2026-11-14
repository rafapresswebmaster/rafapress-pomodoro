const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const P=require('../js/plugins/RPGManagerProgression');
const {Battle}=require('../js/plugins/RPGManagerBattle');
const roster=require('../data/RPGManagerRoster.json');
const stage=require('../data/RPGManagerStage3.json');
const base=require('../data/RPGManagerQuests.json');
const content={...base,...stage,enemies:base.enemies,events:base.events};

test('runtime plugins avoid APIs unsupported by the packaged NW.js Chromium',()=>{
  for(const file of ['RPGManager.js','RPGManagerProgression.js','RPGManagerBattle.js']){
    const source=fs.readFileSync(require.resolve(`../js/plugins/${file}`),'utf8');
    for(const unsupported of [/\.at\s*\(/,/\.findLast(?:Index)?\s*\(/,/\.to(?:Sorted|Reversed|Spliced)\s*\(/,/Object\.hasOwn\s*\(/,/structuredClone\s*\(/])assert.doesNotMatch(source,unsupported,`${file}: ${unsupported}`);
  }
});

test('removed rituals stay absent and class camp specialties are explicit',()=>{
  assert.equal(P.RITUALS.arcane_rebate,undefined);
  assert.equal(P.RITUALS.first_strike,undefined);
  assert.equal(P.bestCampJob({classId:'druid'}),'study');
  assert.equal(P.bestCampJob({classId:'bard'}),'study');
});

test('difficulty labels use the requested five-name scale',()=>{
  assert.deepEqual([1,2,3,4,5].map(skulls=>P.dangerLabel({skulls})),['Very Easy','Easy','Medium','Hard','Very Hard']);
});

test('battle deadline grants the final pending fate coin a visible reveal',()=>{
  const first={kind:'battle',sourceType:'deathSave',targetKey:'player:a',text:'A: FATE COIN — WOUNDED.',survived:true};
  const final={kind:'battle',sourceType:'deathSave',targetKey:'player:b',text:'B: FATE COIN — PERMANENT DEATH.',survived:false,permanentDeath:true};
  const trip={elapsedMs:5000,presentationCurrent:{kind:'battle',sourceType:'attack',text:'Final blow'},presentationQueue:[first,final],presentationFighters:[],battlePresentationDeadlineMs:5000,timeline:[]};
  P.finishBattlePlayback(trip,'deadline');
  assert.equal(trip.presentationCurrent.targetKey,'player:b');
  assert.ok(trip.presentationHoldMs>=3500);
  assert.ok(trip.battlePresentationDeadlineMs>trip.elapsedMs);
  P.finishBattlePlayback(trip,'deadline');
  assert.equal(trip.presentationCurrent,null);
});
test('wiped party return waits until the complete battle presentation is drained',()=>{
 const trip={wiped:true,elapsedMs:100,presentationCurrent:{kind:'battle',sourceType:'attack',text:'Final blow'},presentationQueue:[{kind:'battle',sourceType:'result',text:'Defeat'}],presentationHoldMs:500,battlePresentationDeadlineMs:1000,presentationFighters:[]};
 assert.notEqual(trip.wipePlaybackComplete,true);P.finishBattlePlayback(trip,'wipe playback complete');assert.equal(trip.wipePlaybackComplete,true);assert.equal(trip.presentationCurrent,null);assert.deepEqual(trip.presentationQueue,[]);
});

test('repeat settings avoid the previous theme and opposition when alternatives exist',()=>{
  const first=P.generateJourney(stage,{durationMinutes:20,difficulty:4,seed:'rotation-a'});
  const next=P.generateJourney(stage,{durationMinutes:20,difficulty:4,seed:'rotation-b',excludeThemeId:first.sourceIngredients.theme,excludeOppositionId:first.sourceIngredients.opposition});
  assert.notEqual(next.sourceIngredients.theme,first.sourceIngredients.theme);
  assert.notEqual(next.sourceIngredients.opposition,first.sourceIngredients.opposition);
});

test('middle difficulty is a smaller step while upper tiers keep progressive tuning',()=>{
  const generated=[1,2,3,4,5].map(d=>P.generateJourney(stage,{durationMinutes:20,difficulty:d,seed:`tier-${d}`}));
  assert.ok(generated[2].encounterTuning.hp<=generated[3].encounterTuning.hp);
  assert.ok(generated[3].encounterTuning.hp>=2&&generated[3].encounterTuning.speed>=1);
  assert.ok(generated[4].encounterTuning.hp>=3&&generated[4].encounterTuning.damage>=1);
});

test('generated quests mix enemy types from their selected environment',()=>{
  const generated=Array.from({length:12},(_,i)=>P.generateJourney(stage,{durationMinutes:20,difficulty:3,seed:`variety-${i}`}));
  assert.ok(generated.some(q=>new Set(q.enemyIds).size>1));
  assert.ok(new Set(generated.map(q=>q.battleback)).size>1);
});

test('risk preview records and applies paid boon selection without mutating state',()=>{
  const state=P.createState(roster,()=>.5),ids=P.activeRoster(state).slice(0,3).map(n=>n.id),before=JSON.stringify(state);
  const quest=P.generateJourney(stage,{durationMinutes:20,difficulty:4,seed:'boon-risk'});
  const preview=P.questDangerEstimate(state,quest,content,Battle,ids,['reinforced_clothing','medical_supplies']);
  assert.deepEqual(preview.upgradeIds,['reinforced_clothing','medical_supplies']);
  assert.equal(JSON.stringify(state),before);
});

test('recommended parties face rising tier-three-to-five losses and paid boons reduce risk',()=>{
  const losses=[];
  for(const difficulty of [3,4,5]){
    const state=P.createState(roster,()=>.5),party=P.activeRoster(state).slice(0,3);for(const npc of party){npc.level=difficulty*2;npc.health=npc.maxHealth;}
    const quest=P.generateJourney(stage,{durationMinutes:20,difficulty,seed:`calibrate-${difficulty}`}),ids=party.map(n=>n.id),plain=P.questDangerEstimate(state,quest,content,Battle,ids,[]),boons=P.questDangerEstimate(state,quest,content,Battle,ids,['emergency_supplies','medical_supplies']);
    losses.push(plain.losses);assert.ok(boons.losses<=plain.losses+1);
  }
  assert.ok(losses[1]>=losses[0]);assert.ok(losses[2]>losses[1],`tier losses ${losses.join('/')}`);
});

test('immediate recall awards no completion or field currency',()=>{
  const state=P.createState(roster,()=>.5),ids=P.activeRoster(state).slice(0,3).map(n=>n.id),quest=P.generateJourney(stage,{durationMinutes:10,difficulty:2,seed:'instant-recall'}),gold=state.gold,arcana=state.arcana;
  P.dispatchQuest(state,'A',quest,stage.xp,1000,null,'standard',null,null,ids,[]);
  P.requestRecall(state);P.requestRecall(state);
  assert.equal(state.gold,gold);assert.equal(state.arcana,arcana);
});

test('progressing beyond the first travel milestone creates recall-safe field currency',()=>{
  const state=P.createState(roster,()=>.5),ids=P.activeRoster(state).slice(0,3).map(n=>n.id),quest=P.generateJourney(stage,{durationMinutes:10,difficulty:1,seed:'field-find'});
  P.dispatchQuest(state,'A',quest,base.xp,1000,null,'standard',null,null,ids,[]);state.trips.A.lastProgressAtMs=1000;
  P.advanceMissionClock(state,121000,content,Battle);
  assert.ok(state.trips.A.pendingRewards.gold>0);assert.ok(state.trips.A.chronicle.some(e=>e.type==='fieldReward'));
});
