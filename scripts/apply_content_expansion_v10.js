const fs = require("node:fs");

const basePath = "data/RPGManagerQuests.json";
const stagePath = "data/RPGManagerStage3.json";
const base = require(`../${basePath}`);
const stage = require(`../${stagePath}`);

const backgrounds = [
  "QuestWoodland_v9", "QuestCrypt_v9", "QuestMountain_v9", "QuestCoast_v9", "QuestCavern_v9",
  "QuestEnchantedGlade_v10", "QuestFloodedRuins_v10", "QuestDesertCanyon_v10", "QuestSnowFortress_v10", "QuestVolcanicForge_v10",
  "QuestHauntedFen_v10", "QuestStarObservatory_v10", "QuestAutumnRoad_v10", "QuestCrystalDepths_v10", "QuestStormCliffs_v10"
];

const specs = [
  ["moss_beetle", "Moss Beetle", "RPGMossBeetle_v10", "Guardian", 3, 1, 0, 7, "Mandible Snap", "Shell Rush", 2, 8, 1, 7, ["wild_hunt", "cavern_brood", "haunted_fen"]],
  ["sporecap", "Sporecap", "RPGSporecap_v10", "Support", 3, 0, 1, 6, "Spore Puff", "Dream Spores", 2, 9, 1, 7, ["wild_hunt", "haunted_fen"]],
  ["razor_boar", "Razor Boar", "RPGRazorBoar_v10", "Striker", 4, 1, 0, 9, "Tusk Jab", "Razor Charge", 2, 10, 1, 6, ["wild_hunt", "outlaws"]],
  ["lizard_sentinel", "Lizard Sentinel", "RPGLizardSentinel_v10", "Guardian", 4, 2, 0, 10, "Obsidian Spear", "Shield Rush", 2, 12, 2, 4, ["cavern_brood", "haunted_fen", "corsair_coast"]],
  ["frost_wisp", "Frost Wisp", "RPGFrostWisp_v10", "Mystic", 3, 0, 2, 12, "Frost Spark", "Winter Coil", 3, 13, 2, 4, ["cavern_brood", "highland_monsters"]],
  ["thorn_dryad", "Thorn Dryad", "RPGThornDryad_v10", "Controller", 5, 1, 1, 8, "Thorn Lash", "Root Prison", 3, 14, 2, 4, ["wild_hunt", "haunted_fen"]],
  ["griffin", "Griffin", "RPGGriffin_v10", "Boss", 7, 2, 0, 14, "Talon Rake", "Skyfall Dive", 4, 24, 4, 2, ["highland_monsters"]],
  ["runic_golem", "Runic Golem", "RPGRunicGolem_v10", "Boss", 8, 3, 2, 4, "Stone Fist", "Runic Quake", 4, 26, 4, 2, ["cavern_brood", "highland_monsters"]],
  ["marsh_hydra", "Marsh Hydra", "RPGMarshHydra_v10", "Boss", 8, 2, 1, 7, "Venom Bite", "Threefold Fang", 4, 28, 4, 2, ["haunted_fen", "corsair_coast"]]
];

function enemy(spec) {
  const [id,name,sheet,role,hp,armor,ward,speed,basic,signature,specialDamage,xp,minEncounterTier,encounterWeight,encounterGroups] = spec;
  const boss = minEncounterTier >= 4;
  return {
    id,name,role,level:1,health:hp,maxHealth:hp,attack:1,damage:boss?2:1,defense:0,armor,innateWard:ward,speed,
    intelligence:"Normal",position:"Front",dodge:speed>=12?"Normal":"Low",alive:true,
    passiveTrait:{name:boss?"Apex Threat":"Territorial",description:boss?"A rare threat found on dangerous routes.":"Defends its home territory.",stat:"attack"},
    basicAttack:basic,signatureAttack:signature,signatureDamage:specialDamage,signatureUseLimit:1,boss,special:null,
    portrait:{sheet,index:0,columns:1,rows:1},enemyArt:{sheet,index:0,columns:1,rows:1},xpReward:xp,
    combatProfile:{hp,armor,ward,dodge:speed>=12?.12:.06,speed,crit:boss?.1:.06,damage:boss?2:1,specialDamage,specialAttack:signature,special:null},
    minEncounterTier,encounterWeight,encounterGroups
  };
}

const newIds = new Set(specs.map(spec => spec[0]));
base.enemies = base.enemies.filter(entry => !newIds.has(entry.id)).concat(specs.map(enemy));
for (const [groupId,group] of Object.entries(base.enemyGroups)) {
  const additions = specs.filter(spec => spec[14].includes(groupId)).map(spec => spec[0]);
  group.enemyIds = [...new Set([...group.enemyIds.filter(id => !newIds.has(id)), ...additions])];
}

const enemyById = new Map(base.enemies.map(entry => [entry.id, entry]));
function hash(text) {
  let value = 2166136261;
  for (const char of String(text)) { value ^= char.charCodeAt(0); value = Math.imul(value, 16777619); }
  return value >>> 0;
}
function weightedPick(pool, seed) {
  const total = pool.reduce((sum,id) => sum + (enemyById.get(id)?.encounterWeight || 4), 0);
  let roll = hash(seed) % Math.max(1,total);
  for (const id of pool) { roll -= enemyById.get(id)?.encounterWeight || 4; if (roll < 0) return id; }
  return pool[0];
}
function refreshQuest(quest) {
  quest.enemyIds = [...new Set(quest.enemyIds)];
  quest.skirmishEnemyIds = quest.enemyIds.filter(id => !(enemyById.get(id)?.boss || (enemyById.get(id)?.minEncounterTier || 1) >= 4)).slice(0,2);
  if (!quest.skirmishEnemyIds.length) quest.skirmishEnemyIds = quest.enemyIds.slice(0,1);
  quest.knownThreats = quest.enemyIds.map(id => enemyById.get(id)?.name || id);
}

const byTier = new Map();
for (const quest of stage.quests) {
  const tier = Math.max(1, Number(quest.intendedLevel || quest.skulls || quest.encounterTier) || 1);
  if (!byTier.has(tier)) byTier.set(tier, []);
  byTier.get(tier).push(quest);
}
let backgroundOffset = 0;
for (const quests of [...byTier.entries()].sort(([a],[b]) => a-b).map(([,quests]) => quests)) {
  quests.sort((a,b) => a.id.localeCompare(b.id));
  quests.forEach((quest,index) => { quest.battleback = backgrounds[(backgroundOffset+index) % backgrounds.length]; quest.battlebackFolder = "pictures"; });
  backgroundOffset = (backgroundOffset + quests.length) % backgrounds.length;
}

for (const quest of stage.quests) {
  if (!quest.enemyIds?.length) continue;
  const tier = Math.max(1, Math.min(5, Number(quest.encounterTier || quest.intendedLevel || quest.skulls) || 1));
  const group = base.enemyGroups[quest.encounterGroup];
  if (!group) continue;
  let pool = group.enemyIds.filter(id => {
    const entry = enemyById.get(id);
    const minimum = entry?.minEncounterTier || (entry?.boss ? 4 : 1);
    return minimum <= tier;
  });
  if (!pool.length) pool = group.enemyIds.filter(id => enemyById.has(id));
  const count = Math.max(1, Math.min(3, quest.enemyIds.length));
  const selected = [];
  for (let slot=0; slot<count && pool.length; slot++) {
    const id = weightedPick(pool, `${quest.id}:${tier}:${slot}`);
    selected.push(id); pool = pool.filter(candidate => candidate !== id);
  }
  quest.enemyIds = selected;refreshQuest(quest);
}

// Rare additions must remain special, but never disappear entirely from the
// authored catalogue because of a deterministic weighted roll.
for (const spec of specs) {
  const [id,,,,,,,,,,,,minimum] = spec;
  const target = minimum >= 4 ? 2 : minimum >= 2 ? 6 : 10;
  let present = stage.quests.filter(quest => quest.enemyIds?.includes(id)).length;
  const candidates = stage.quests.filter(quest => {
    const tier = Math.max(1, Math.min(5, Number(quest.encounterTier || quest.intendedLevel || quest.skulls) || 1));
    return tier >= minimum && base.enemyGroups[quest.encounterGroup]?.enemyIds.includes(id) && quest.enemyIds?.length && !quest.enemyIds.includes(id);
  }).sort((a,b) => hash(`${id}:${a.id}`) - hash(`${id}:${b.id}`));
  for (const quest of candidates) {
    if (present >= target) break;
    quest.enemyIds[quest.enemyIds.length-1] = id;refreshQuest(quest);
    present++;
  }
}

// Every authored creature remains discoverable at least once.
for (const entry of base.enemies) {
  if (stage.quests.some(quest => quest.enemyIds?.includes(entry.id))) continue;
  const minimum = entry.minEncounterTier || (entry.boss ? 4 : 1);
  const quest = stage.quests.find(candidate => (candidate.encounterTier || 1) >= minimum && base.enemyGroups[candidate.encounterGroup]?.enemyIds.includes(entry.id) && candidate.enemyIds?.length);
  if (quest) { quest.enemyIds[quest.enemyIds.length-1] = entry.id;refreshQuest(quest); }
}

// Frontier cards must never repeat the same scenery/formation signature.
const signatures = new Set();
for (const quest of stage.quests.filter(entry => entry.id.startsWith("frontier_")).sort((a,b) => a.id.localeCompare(b.id))) {
  let signature = `${quest.battleback}|${[...quest.enemyIds].sort().join()}`;
  const group = base.enemyGroups[quest.encounterGroup];
  for (let attempt=0; signatures.has(signature) && attempt<(group?.enemyIds.length||0); attempt++) {
    const tier = quest.encounterTier || 1;
    const replacement = group.enemyIds.find(id => !quest.enemyIds.includes(id) && (enemyById.get(id)?.minEncounterTier || (enemyById.get(id)?.boss ? 4 : 1)) <= tier);
    if (!replacement) break;
    quest.enemyIds[quest.enemyIds.length-1] = replacement;refreshQuest(quest);
    signature = `${quest.battleback}|${[...quest.enemyIds].sort().join()}`;
  }
  signatures.add(signature);
}

fs.writeFileSync(basePath, `${JSON.stringify(base,null,2)}\n`);
fs.writeFileSync(stagePath, `${JSON.stringify(stage,null,2)}\n`);
console.log(`Wrote ${backgrounds.length} balanced backgrounds, ${specs.length} enemies and ${stage.quests.length} quest assignments.`);
