// Rebuild content identities without changing quest IDs, timers or existing unlocks.
const fs = require('node:fs');
const P = require('../js/plugins/RPGManagerProgression');
const file = 'data/RPGManagerStage3.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const narratives = JSON.parse(fs.readFileSync('data/RPGManagerNarratives.json', 'utf8'));
const enemies = require('../data/RPGManagerQuests.json').enemies;
// Each habitat has six different pieces of work, rather than one contract at six ratings.
const themes = [
 ['Glassfen','PoisonSwamp','swamp_hag,slime,will_o_wisp,giant_spider_1,ratman','Bottle the Singing Water|Cut the Drowned Roots|Find the Reed Witch|Drain the Poison Sluice|Rescue the Peat Cutters|Break the Bog Mirror'],
 ['Cinder Belfry','LavaCave','wyrmling,imp,gargoyle,kobold,cultist_1','Silence the Furnace Bell|Steal the Fireproof Egg|Cool the Bell Foundry|Free the Ash Sweepers|Close the Ember Vent|Recover the Obsidian Clapper'],
 ['Rime Hospice','IceCave','ghoul,ghost,wraith,giant_bat,ratman','Thaw the Medicine Chest|Read the Frozen Register|Carry Out the Last Patient|Light the Blue Braziers|Recover the Silver Scalpel|Seal the Cold Ward'],
 ['Briar Crown','GrassMaze','treant,owlbear,wolf,giant_spider_1,swamp_hag','Untangle the Royal Path|Return the Acorn Crown|Save the Trapped Gardener|Prune the Hungry Hedge|Find the Thornbound Heir|Wake the Sleeping Orchard'],
 ['Saltwake','Ship','pirate,harpy,ghost,ratman,pirate_captain','Cut the Cursed Anchor|Retrieve the Diving Bell|Rescue the Cabin Boy|Burn the False Manifest|Reclaim the Storm Compass|Free the Captive Navigator'],
 ['Sunken Mint','Cobblestones2','dwarf_prospector,ratman,mimic,slime,bandit_rogue','Recover the Coin Dies|Expose the Living Strongbox|Open the Flooded Vault|Escort the Last Assayer|Trace the Counterfeit Silver|Stop the Gold Siphon'],
 ['Cloudbreak','Clouds','harpy,gargoyle,will_o_wisp,wyrmling,giant_bat','Mend the Sky Chain|Retrieve the Wind Harp|Catch the Falling Observatory|Rescue the Kite Pilots|Relight the Cloud Beacon|Anchor the Drifting Stair'],
 ['Red Quarry','RockCave','hill_giant,dwarf_prospector,basilisk,kobold,minotaur','Free the Stonecutters|Recover the Survey Hammer|Collapse the Smuggler Tunnel|Find the Petrified Foreman|Secure the Singing Geode|Repair the Quarry Winch'],
 ['Mirror Chapel','Temple','ghost,gargoyle,mage_cultist,will_o_wisp,mimic','Turn the Darkened Icons|Recover the Lost Confession|Shatter the False Saint|Release the Glass Pilgrims|Cleanse the Offering Bowl|Restore the Dawn Mosaic'],
 ['Sable Menagerie','Tent','owlbear,basilisk,giant_spider_1,wolf,bandit_fighter_1','Unlock the Iron Cages|Rescue the Beast Keeper|Recover the Stolen Antidote|Track the Escaped Brood|Destroy the Cruelty Ledger|Secure the Night Caravan'],
 ['Copper Aqueduct','Stone1','slime,ratman,giant_bat,ghoul,kobold','Clear the Intake Grate|Close the Sickness Valve|Recover the Brass Flowmeter|Rescue the Trapped Diver|Trace the Missing Water|Restart the Ancient Pump'],
 ['Moonbarrow','Stone3','wraith,ghoul,necromancer,ghost,skeleton_archer_1','Return the Burial Masks|Recover the Moon Dial|Unbind the Nameless Dead|Carry the Funeral Flame|Rescue the Grave Scholar|Close the Empty Sarcophagus'],
 ['Amber Apiary','Grassland','treant,owlbear,giant_spider_2,will_o_wisp,wolf','Save the Royal Hive|Collect the Healing Wax|Follow the Missing Beekeeper|Burn the Blighted Combs|Return the Queen Amber|Protect the Honey Harvest'],
 ['Dusk Arena','Colosseum','minotaur,hobgoblin,orc_1,bandit_fighter_2,imp','Break the Champions Chain|Rescue the Condemned Duelist|Recover the Bronze Laurel|Seal the Beast Gate|Expose the Rigged Tournament|Retrieve the Stolen Standard'],
 ['Starfall Lens','Crystal','will_o_wisp,gargoyle,mage_cultist,ghost,imp','Realign the Star Lens|Recover the Meteor Shard|Find the Missing Astronomer|Shut the False Constellation|Repair the Prism Array|Contain the Wandering Light'],
 ['Dustglass','Desert','basilisk,gnoll,giant_spider_2,kobold,mimic','Recover the Sand Almanac|Uncover the Buried Cistern|Escort the Glassblower|Destroy the Mirage Obelisk|Find the Lost Camel Train|Retrieve the Sun Medallion'],
 ['Blackroot Mill','Wood1','swamp_hag,treant,ratman,slime,wolf','Stop the Bloodred Wheel|Rescue the Miller Family|Recover the Grain Charter|Clear the Root Cellar|Break the Flour Curse|Restore the Millrace Gate'],
 ['Frostbound Pass','Snowfield','wolf,owlbear,hill_giant,wraith,harpy','Find the Buried Climbers|Recover the Avalanche Horn|Carry the Mountain Medicine|Repair the Rope Bridge|Retrieve the Frozen Banner|Guide the Stranded Caravan'],
 ['Ember Embassy','DemonCastle1','imp,summoned_demon,cultist_1,mage_cultist,gargoyle','Burn the Infernal Treaty|Rescue the Mortal Envoy|Steal the Pact Seal|Close the Scarlet Portal|Recover the Hostage Names|Destroy the Soul Ledger'],
 ['Cracked Reservoir','DirtCave','slime,basilisk,giant_bat,ratman,giant_spider_1','Brace the Failing Dam|Find the Missing Engineer|Recover the Pressure Key|Purge the Hatchery|Clear the Spillway|Rescue the Flooded Settlement'],
 ['Rookery Spire','Castle3','harpy,gargoyle,giant_bat,ghost,bandit_rogue','Return the Royal Falcon|Retrieve the Wind Vane|Repair the Signal Mirror|Rescue the Bell Ringer|Recover the Sky Charts|Cut the Smuggler Lines'],
 ['Thorn Tribunal','Fort2','hobgoblin,orc_2,gnoll,bandit_fighter_1,ogre','Free the Bound Witness|Recover the Verdict Scroll|Destroy the Gallows Charm|Escort the Exiled Judge|Expose the False Marshal|Seize the Prison Keys'],
 ['Lantern Mere','Road3','will_o_wisp,ghost,swamp_hag,slime,giant_bat','Follow the Unlit Lantern|Rescue the Ferryman|Recover the Lost Wedding Ring|Mark the Safe Causeway|Lift the Tollhouse Curse|Retrieve the Drowned Bells'],
 ['Iron Orchard','Wasteland','ogre,treant,hill_giant,orc_3,wyrmling','Quench the Iron Sap|Rescue the Charcoal Burners|Recover the Seed Crucible|Break the Metal Graft|Reclaim the Old Forge|Stop the Walking Furnace'],
 ['Velvet Masque','DecorativeTile1','masked_jester,mimic,bandit_rogue,mage_cultist,ghost','Unmask the False Patron|Rescue the Silent Singer|Recover the Cursed Script|Burn the Puppet Strings|Steal the Ruby Ticket|End the Endless Encore'],
 ['Hollow Warren','Dirt','kobold,ratman,giant_spider_2,basilisk,dwarf_prospector','Recover the Tunnel Map|Free the Buried Miners|Seal the Brood Chamber|Stop the Powder Cart|Retrieve the Crystal Pick|Open the Rescue Shaft'],
 ['Pale Archive','Castle2','necromancer,ghost,mimic,wraith,cultist_2','Recover the Living Atlas|Rescue the Trapped Scribe|Burn the Plague Index|Unchain the Brass Librarian|Restore the Missing Names|Seal the Whispering Shelf'],
 ['Storm Shoal','Sand','harpy,pirate_captain,slime,wyrmling,pirate','Light the Wreck Beacon|Rescue the Pearl Divers|Retrieve the Tide Crown|Destroy the False Lighthouse|Recover the Shipwright Tools|Cut the Raiders Moorings'],
 ['Wolfglass Lodge','Wood2','wolf,owlbear,treant,bandit_fighter_2,giant_spider_1','Rescue the Winter Hunters|Recover the Antler Horn|Destroy the Cruel Traps|Find the Vanished Herbalist|Lift the Lodge Hex|Escort the Wounded Tracker'],
 ['Basalt Labyrinth','DemonCastle3','minotaur,gargoyle,basilisk,imp,wyrmling','Retrieve the Thread Spindle|Free the Lost Mason|Break the Turning Walls|Recover the Bronze Compass|Seal the Beast Nursery|Open the Daylight Gate'],
 ['Silver Reliquary','Cobblestones5','gargoyle,ghoul,ghost,will_o_wisp,mimic','Find the Stolen Heartstone|Rescue the Relic Bearer|Repair the Silver Censer|Expose the False Reliquary|Recover the Pilgrim Tokens|Restore the Sacred Flame'],
 ['Ashen Warpath','Ground2','orc_1,orc_2,hobgoblin,ogre,goblin_archer','Capture the Siege Plans|Free the Captive Scouts|Burn the Siege Ladders|Recover the Battle Drum|Rescue the Truce Herald|Seize the Warlord Banner']
].map(([place,bg,pool,tasks])=>({place,bg,pool:pool.split(','),tasks:tasks.split('|')}));

function setHabitat(q, ids, patrols, bg, environment) {
 q.enemyIds=ids; q.skirmishEnemyIds=patrols; q.randomEncounters=[];
 q.battleback=bg; q.battlebackFolder='battlebacks1'; q.environment=environment;
 q.knownThreats=[...new Set([...ids,...patrols])].map(id=>enemies.find(e=>e.id===id).name);
 q.danger=q.knownThreats.join(' / '); q.encounterType=`Local patrols: ${patrols.map(id=>enemies.find(e=>e.id===id).name).join(', ')}; objective: ${ids.map(id=>enemies.find(e=>e.id===id).name).join(', ')}`;
}
const frontier=data.quests.filter(q=>q.id.startsWith('frontier_'));
// Round-robin across levels ensures every rating sees all habitats before reuse.
const ordered=[];
const levels=Array.from({length:8},(_,i)=>frontier.filter(q=>q.intendedLevel===i+1));
for(let i=0;levels.some(a=>a[i]);i++)for(const list of levels)if(list[i])ordered.push(list[i]);
const themeUses=new Map();
const encounterSignatures=new Set();
function combinations(items,count){
 if(!count)return [[]];
 return items.flatMap((item,i)=>combinations(items.slice(i+1),count-1).map(rest=>[item,...rest]));
}
ordered.forEach((q,i)=>{
 const t=themes[(i+Math.floor(i/themes.length)*5)%themes.length],chapter=themeUses.get(t)||0;
 themeUses.set(t,chapter+1);
 if(chapter>=t.tasks.length)throw Error('More quests than authored objectives');
 const task=t.tasks[chapter],offset=(chapter+q.intendedLevel)%t.pool.length;
 const pool=Array.from({length:t.pool.length},(_,j)=>t.pool[(offset+j)%t.pool.length]);
 const count=q.enemyIds.length;
 const candidates=combinations(pool,count).flatMap(main=>combinations(pool.filter(id=>!main.includes(id)),2).map(patrol=>({main,patrol})));
 const selected=candidates.find(({main})=>!encounterSignatures.has(t.bg+'|'+main.slice().sort().join()));
 if(!selected)throw Error('Exhausted unique encounters: '+t.place);
 encounterSignatures.add(t.bg+'|'+selected.main.slice().sort().join());
 setHabitat(q,selected.main,selected.patrol,t.bg,t.place);
 q.name=`${task} at ${t.place}`;
 q.description=`${task} at ${t.place}. ${q.knownThreats.join(', ')} threaten the approach; secure the objective and bring the expedition home.`;
 q.journey=q.description; q.faction=t.place; q.tags=['Frontier',t.place,task];
 q.rumors=[`The guild needs a party to ${task.toLowerCase()} at ${t.place}.`,`Scouts report ${q.knownThreats.slice(0,2).join(' and ')} near the approach.`];
 q.objectiveReturnText=`${task}: objective secured at ${t.place}. Return to camp.`;
 q.riskExplanation=`Level ${q.intendedLevel} expedition for three equipped companions. ${q.danger}.`;
 narratives.quests[q.id]=[
  `The route into ${t.place} shows fresh signs of ${q.knownThreats[0]}.`,
  `The party checks its plan: ${task.toLowerCase()} before leaving ${t.place}.`,
  `Scouts watch for ${q.knownThreats.at(-1)} while the others study the approach.`,
  `The objective at ${t.place} is close; the companions prepare their equipment.`
 ].map((text,n)=>({id:`${q.id}:diverse:${n}`,context:'travel',text}));
});

// Repair older authored routes whose encounters and scenery contradicted their brief.
const repairs={
 collect_grave_moss:['ghost,will_o_wisp','ghost','Stone3'],guard_woodcutters:['wolf,treant','wolf','Grassland'],
 escort_apothecary:['ratman,slime','ratman','Road1'],clear_cellar:['slime','ratman','Wood2'],
 salvage_abandoned_cart:['mimic,bandit_rogue','bandit_rogue','Road2'],lantern_index:['will_o_wisp,ghost','will_o_wisp','Temple'],
 aqueduct_survey:['slime,ratman,giant_bat','ratman','Stone1'],herbarium_circuit:['treant,swamp_hag,owlbear','wolf','GrassMaze'],
 evening_observatory:['mage_cultist,will_o_wisp,gargoyle','giant_bat','Crystal'],field_map_survey:['harpy,wolf','wolf','Ground1'],
 wayside_lantern_round:['imp,will_o_wisp','imp','Road3'],long_lantern_circuit:['giant_bat,ghost','giant_bat','Cobblestones3'],
 birchwater_samples:['slime,swamp_hag','slime','PoisonSwamp'],meadow_cartography:['treant,basilisk','wolf','Grassland'],
 brookside_escort:['ratman','slime','Road1'],orchard_trackers:['wolf','wolf','GrassMaze'],
 hunt_harpy:['harpy','giant_bat','Clouds'],hunt_troll:['troll','wolf','Road2'],hunt_imp:['imp','imp','Lava1']
};
for(const q of data.quests){
 if(repairs[q.id]){const [main,patrol,bg]=repairs[q.id];setHabitat(q,main.split(','),patrol.split(','),bg,q.environment);}
 else if(!q.id.startsWith('frontier_')&&!q.id.startsWith('fantasy_')&&!q.ritualUnlock){
  const bg=/crypt|cemetery|barrow/.test(q.id)?'Stone3':/spider|silken|thorn/.test(q.id)?'GrassMaze':/orc|watchtower|watchpost/.test(q.id)?'Fort1':/shrine|reliquary/.test(q.id)?'Temple':/gate/.test(q.id)?'DemonCastle2':/ledger/.test(q.id)?'Wood2':/ridge/.test(q.id)?'Ground2':'Road3';
  q.battleback=bg;q.battlebackFolder='battlebacks1';
 }
}
const ritualBackgrounds={ritual_warding:'Temple',ritual_healing:'IceCave',ritual_greed:'Cobblestones2',ritual_reanimate:'Stone3',ritual_fortune:'Road3',ritual_hymn:'Fort1',ritual_mercy:'DemonCastle1',ritual_last_rites:'Ship',ritual_rebate:'Wood2',ritual_vanguard:'Castle2',ritual_familiar:'Crystal',ritual_first_strike:'Colosseum',ritual_quickening:'LavaCave',ritual_offering:'RockCave'};
for(const [id,r] of P.ritualEntries()){
 const q=data.quests.find(q=>q.id===r.questId);
 q.intendedLevel=q.skulls=r.level;q.encounterTier=Math.ceil((r.level+1)/2);q.risk=`${r.level}-skull`;q.difficulty=r.level<=2?'Easy':r.level<=4?'Normal':'Hard';
 q.knownConditions=q.knownConditions.filter(t=>!/level|skull/i.test(t));q.knownConditions.unshift(`Recommended Level ${r.level} / ${r.level} of 8 skulls`);
 q.riskExplanation=`Level ${r.level} ritual trial for three equipped companions. Victory unlocks ${r.name} (${r.castCost} Arcana per activation).`;
 q.battleback=ritualBackgrounds[q.id];q.battlebackFolder='battlebacks1';
}
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
fs.writeFileSync('data/RPGManagerNarratives.json',JSON.stringify(narratives,null,2)+'\n');
console.log(`Diversified ${frontier.length} frontier contracts and repaired authored routes and ritual ratings.`);
