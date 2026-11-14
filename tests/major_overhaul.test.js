"use strict";
const assert=require("assert");
const P=require("../js/plugins/RPGManagerProgression.js");
const stage3=require("../data/RPGManagerStage3.json");
const classes=require("../data/RPGManagerClasses.json");
const fs=require("fs"),ui=require("../data/RPGManagerUI.json");
const managerSource=fs.readFileSync(require.resolve("../js/plugins/RPGManager.js"),"utf8");

assert.equal(P.SCHEMA_VERSION,32);
assert.equal(P.LEVEL_CAP,10);
assert.deepEqual(P.XP_THRESHOLDS,{1:20,2:45,3:75,4:105,5:140,6:180,7:225,8:275,9:330});
assert.equal(Object.keys(P.EXPEDITION_UPGRADES).length,5);

for(const durationMinutes of P.EXPEDITION_DURATIONS){
  for(let difficulty=1;difficulty<=5;difficulty++){
    for(let i=0;i<40;i++){
      const options={durationMinutes,difficulty,seed:`matrix-${durationMinutes}-${difficulty}-${i}`};
      const a=P.generateJourney(stage3,options),b=P.generateJourney(stage3,options);
      assert.deepEqual(a,b,"generation must be deterministic");
      assert.equal(a.durationMinutes,durationMinutes);
      assert.equal(a.skulls,durationMinutes===1?1:difficulty);
      assert.ok(a.generatorSeed&&a.planFingerprint);
      assert.ok(P.JOURNEY_THEMES.some(t=>t.id===a.sourceIngredients.theme));
      if(durationMinutes===1){assert.equal(a.combatMode,"none");assert.deepEqual(a.enemyIds,[]);}
      else assert.ok(a.enemyIds.length,"combat journeys need a coherent formation");
    }
  }
}

const low=P.generateJourney(stage3,{durationMinutes:30,difficulty:1,seed:"fixed"});
const high=P.generateJourney(stage3,{durationMinutes:30,difficulty:5,seed:"fixed"});
assert.equal(low.sourceIngredients.theme,high.sourceIngredients.theme,"difficulty must not reroll theme");
assert.ok(high.rewardGold.victory>low.rewardGold.victory);
assert.equal(P.participationXpFor({elapsedMs:240*60000,skulls:1,victoryBonusXp:0}),240);
assert.equal(P.participationXpFor({elapsedMs:60*60000,skulls:5,victoryBonusXp:0}),90);

const legacySave=P.createState(require('../data/RPGManagerRoster.json'),()=>.5),legacyNpc=legacySave.roster[0];
legacySave.version=21;legacyNpc.name='Player Named Hero';legacyNpc.classId='mage';legacyNpc.level=10;legacyNpc.maxHealth=999;legacyNpc.damage=999;legacyNpc.speed=999;
const migrated=P.upgradeState(JSON.parse(JSON.stringify(legacySave))),migratedNpc=migrated.roster[0],expectedStats=P.classStats({classId:'mage',level:10});
assert.equal(migratedNpc.name,'Player Named Hero');assert.equal(migratedNpc.classId,'mage');assert.equal(migratedNpc.level,10);
assert.equal(migratedNpc.maxHealth,expectedStats.hp);assert.equal(migratedNpc.damage,expectedStats.damage);assert.equal(migratedNpc.speed,expectedStats.speed);
assert.match(migrated.recoveryNotice,/names, classes and levels were preserved/);

const state={gold:50};
assert.equal(P.upgradeSelectionError(state,["reinforced_clothing","protective_charms"]),"");
assert.ok(P.upgradeSelectionError(state,["reinforced_clothing","reinforced_clothing"]));
state.gold=1000;
assert.equal(P.upgradeSelectionError(state,Object.keys(P.EXPEDITION_UPGRADES)),"");
const member={classArmor:1,classArmorMax:1,armor:1,maxArmor:1,innateWard:0,innateWardMax:0,health:3,maxHealth:3,damage:1};
P.applyExpeditionUpgrades([member],["reinforced_clothing","protective_charms","medical_supplies"]);
assert.deepEqual({armor:member.armor,ward:member.innateWard,hp:member.health},{armor:2,ward:1,hp:4});

for(const c of classes.classes){
  assert.ok(["barbarian","knight","cleric","rogue","ranger","mage","bard","druid"].includes(c.id));
  for(let level=2;level<=10;level++)assert.ok(c.growth[level],`${c.id} needs growth at level ${level}`);
}
assert.ok(!ui.hamlet.locations.some(location=>["battle","shop"].includes(location.symbol)),"home data must not expose quest-board or shop locations");
assert.ok(managerSource.includes('START QUEST'),"primary quest CTA must remain explicit");
assert.ok(managerSource.includes('grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(2,minmax(132px,1fr))'),"eight starter classes must use a balanced 4x2 selector");
assert.ok(!managerSource.includes('["Quest Board",Scene_RPGQuestBoard]'),"quest board must not return to camp navigation");
assert.ok(!managerSource.includes('["Shop",Scene_RPGShop]'),"shop must not return to camp navigation");
assert.ok(managerSource.includes("crypto.getRandomValues(random)"),"each launch-hub visit must use fresh quest entropy");
console.log("major overhaul acceptance: ok");
