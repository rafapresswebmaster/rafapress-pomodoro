# October 15, 2026 — readability, progression and economy delivery

Implemented the user-authorized `Teamfight_Manager_Next_Playtest_Codex_Brief.md` against the live October 14 baseline. The project remains RPG Maker MZ / bundled PixiJS **5.3.12**, plain JavaScript and four ordered plugins. No framework, new image generation, backend, crafting, extra party slots, offline time or player-controlled combat was added. A verified pre-edit backup is in `backups/*before-readability-progression-sprint.zip` (1,620 files).

## Delivered requirements

- **Quests:** explicit Safe / Optional combat / Hunt / Boss tags in authored data and contract details. Optional errands still roll encounters; the two `none` routes never manufacture a battle. Required Hunts retain their last objective battle; boss enemy rosters retain their boss. Ten-minute combat journeys can add one, and fifteen-minute journeys up to two, seeded small skirmishes. They have one 1-HP enemy, no Armor, 1 damage and no disabling special. Battles use the existing simulation and existing clock. Objective completion queues an authored return beat below the characters; outward facing continues until that beat finishes, then the illustrated scenery/facing reverses. Arrival, Recall and once-only settlement are preserved. Optional battle outcomes are no longer overwritten by a fabricated no-battle victory.
- **Classes:** only Barbarian, Knight, Ranger, Rogue, Mage and Cleric are offered. The editable catalogue owns the exact approved level-1 baselines and cumulative level-2–4 gains, including Mage Armor at level 3. Level cap is **4**, next-level XP **15 / 70 / 150**. Signatures remain the existing system, unlocked at 2 and 4. No parallel build system. New class aliases also retain their appropriate force/protection/locks/stealth interaction expertise.
- **Attack:** the displayed percentage is a seeded critical chance. A critical doubles the attack's normal damage once, before Ward → Armor → HP absorption, and records `criticalHit`/`critChance` in authoritative events. Captions label `CRITICAL x2`; replay does not roll or apply it. Dodge uses the exact class percentage, without the former hidden back-row bonus; both lines remain targetable.
- **Class Armor:** a persistent pool distinct from equipped-item Armor. Battle results deplete class Armor first, then existing item Armor; innate Ward refills between fights. Newly gained level points are added without refilling previously depleted class Armor. Character screen shows current/max, exact **2 Gold per missing point**, and a confirmation. Dead/away/full/insufficient-Gold cases reject safely; repeated confirmation cannot charge twice. No item Repair hub or item restoration was added.
- **Items:** explicit compatible classes, icons, buy prices and resale values in the existing `SHOP` item data. Mage Hat and Cleric Circlet are exclusive; specialized heavy gear is restricted; universal head/body/off-hand/accessory options remain. Thick Fur Cloak is universal Body **+1 Armor, 18g**, Life-Giving Amulet universal Accessory **+1 maximum HP, 30g**. Both are purchasable and in common completion rewards. The amulet does not heal on equip. Invalid gear is disabled with “Wrong class” and a text explanation; rejected equips conserve inventory. Existing worn gear and shared-stock condition queues persist. Shop Buy/Sell modes sell only unequipped stock at half purchase price, rounded down. Equipment, shop and result item details expose effects, class compatibility and values; reward previews retain clear potential bonus chances.
- **Names:** new-game confirmation offers three editable names and a Randomize Name control for each, after showing role and all approved stats. Tavern opens the existing naming form before committing a **free** replacement. Repeated randomization, manual edits, blank/duplicate validation, Cancel, Escape and re-entry are supported. Validation precedes any hire; repeated confirmation/reload cannot recruit a candidate twice. Saved names are retained.
- **Economy:** Gold and authored durations stay unchanged. Arcana is materially more available on appropriate routes and shrine finds. Potion is **6g** for exactly 2 HP; Medkit **12g** treats Wounded and restores exactly 1 HP. Existing Altar costs remain. Contract Gold/Arcana/XP previews and paged actual results agree. See the full source audit, all 18 before/after reward rows, representative budgets and multi-seed findings in [October15_Economy_Art_Audit.md](October15_Economy_Art_Audit.md).
- **Readability/HUD:** countdown remains 40 px. Quest names are 20 px; primary field notes 18 px; contextual dialogue 17 px; traveler names 17 px; status rails use 17 px names and 15 px numeric values. Measured paging handles long captions/names instead of reducing font size. The active footer box is removed and its space reclaimed; roster arrow/Shift remains labeled beside the toggle. Alerts is a separate upper-HUD touch control, also toggled by Page Up, with saved ON/OFF and the existing audio-failure isolation. Home has eight actions and no Return to Title command. Indigo/blue panels, cream text/parchment, gold highlights and explicit state text retain the cozy illustrations. At narrow combat widths all actors remain visible, while status cards page two fighters per rail every three seconds; exact HP/Armor/Ward remain readable. Very narrow under-actor ribbons yield to the larger rails.
- **Graphics:** no replacements were generated. Woodland/cavern panoramas, custom eight-family creature atlas, full-body actors, camp, walking and portrait art remain integrated. Item atlas indexes were corrected for helmet/body/shield/amulet/cross roles. The exhaustive image inventory classifies every image path, bytes, route and intended unused/fallback status: [October15_Asset_Inventory.csv](October15_Asset_Inventory.csv). Original provenance/prompts remain intact.

## Persistence and migration

Schema **22** is justified by persistent `classArmor`, migration metadata, return-narration state and recorded battle/stage guards. Derived maximum/chance fields are normalized from the approved catalogue. `legacyIdentity` preserves retired class ID, display role, selected move, signature name and authored dialogue; `legacyLevel` preserves a former level above four. Retired authored classes/dialogue also remain in the catalogue's archival `legacyClasses` fields, outside recruitment choices.

| Legacy classes | Current class |
|---|---|
| Vanguard, Guardian | Knight |
| Bruiser, Brawler | Barbarian |
| Duelist, Skirmisher | Rogue |
| Support, Bard | Cleric |
| Mystic | Mage |
| Worker | Ranger |
| Ranger, Mage, Cleric | Same class |

Migration preserves IDs, names, currency, XP, equipment, remaining condition, inventory, graves/deaths, bonds, jobs, history and active-trip participant IDs. Old levels clamp to 4 without deleting the archived old level or stored XP. New class Armor initializes once; equipment condition is never silently restored. Existing resolved battle snapshots/queues remain copied authoritative playback; future prepared combat copies map safely. Loading excludes closed-process time and retains locked active-trip rewards/plans; newly dispatched normal play uses Standard danger so a hidden old preference cannot change the displayed rewards. Duplicate recorded battles now reject without reapplying damage, deaths or event statistics, including after load.

## Verification

The current complete command and exact output are in `tests/Post_Sprint_Fixes_Testing.md` and `tests/readability-progression-results.txt`. **149/149** focused tests, zero failures/skips. This includes the prior 136 checks with explicitly superseded schema/class/dodge/gear-eligibility expectations updated, plus 13 new checks. No failing test was skipped. New checks cover all class/level rows, schema-21 migration, restoration confirmation and conservation, seeded double damage, class eligibility, sale/equip/HP-gear exploits, names/free hiring, optional/final encounters, multiple skirmishes/deadline, return narration, duplicate battle recording, and all 18 reward tables over three seeds.

Commands:

```text
python scripts/sync_adventurer_catalogue.py --check
node --check js/plugins/RPGManagerBattle.js
node --check js/plugins/RPGManagerProgression.js
node --check js/plugins/RPGManagerBattleStage.js
node --check js/plugins/RPGManager.js
node --check js/plugins.js
node scripts/playtest_balance_audit.js
python tests/readability_progression_smoke.py
python tests/illustrated_travel_smoke.py
python tests/visual_battle_smoke.py
python tests/mission_background_smoke.py
```

Catalogue validation reports six classes / twelve moves; syntax checks pass. The balance audit covers **1,800** deterministic expeditions; it is a sample of one class composition, not proof of balance for every campaign. Read the audit for its constraints and the measured reason for removing one Black Gate supporting cultist.

Chromium checks cover **816×624 and 1280×720**: real name forms and duplicate validation, free hiring, exact restoration charge, buy/sell, Home/upper HUD, contract, illustrated travel, five-enemy/open-roster drawing bounds, unchanged rendering inputs, current save/load/results, authored long-journey skirmish and boss artwork. Travel checks retain foreground-only walking with a live unfocused clock, return reversal, saved values and missing art. Battle regression covers opening/basic/signature/miss/defenses/fall/save/death/round/end/boss, saved event cursor, renderer exception and corrupt art/failed sheets. Background regression verifies clock catch-up, closed-time pause and resumed session progress. Browser scripts required sandbox escalation because Playwright could not create its subprocess under the sandbox; the browser runs completed with zero page errors. Screenshots are in `tests/visuals/oct15-*`, `travel-*` and `battle-*`; representative screenshots were inspected.

## Changed files

The exact file-by-file manifest is [October15_Changed_Files.md](October15_Changed_Files.md).

Runtime: all four `js/plugins/RPGManager*.js` files. Data: `RPGManagerClasses.json`, `RPGManagerDialogue.json`, `RPGManagerStage3.json`; authoritative source: `context/Adventurer_Classes_and_Dialogue.md`. Plugin order is unchanged; no image file changed. New utilities: `scripts/playtest_balance_audit.js`, `scripts/write_playtest_audit.py`. New tests: `readability_progression.test.js`, `readability_progression_smoke.py`; the focused existing fixtures and travel/battle/background browser onboarding were updated for the new contracts. Current handoff, context index, architecture/testing pointers, this implementation note and economy/art audit are updated. Test output, balance JSON, image inventory and browser screenshots provide review artifacts. Temporary one-time editing scripts were removed.

## Remaining limits and native playtest

Native RPG Maker MZ / NW.js verification has **not** been performed. Browser focus/visibility tests do not prove native OS minimization or audible sound behavior. Sub-default resolutions are not a supported redesign target. Status/caption paging is intentional at the default resolution. Background deadlines still win over unseen foreground animation: an expedition completed while unfocused opens its authoritative results, rather than delaying arrival to replay everything. Existing stock sci-fi/map/scenery assets remain intentionally unused.

1. Open `game.rmmzproject`, press Playtest, start a New Game. Choose three, inspect stats, randomize/edit names, try a blank/duplicate, Cancel, then confirm. Save.
2. Inspect a character's Armor/Attack/Dodge and equipment. Buy universal cloak/amulet, try incompatible headgear, equip/unequip/sell shared stock. Confirm HP gear does not heal and equipped items cannot be sold.
3. Run a 1-minute safe errand, then a Hunt. Watch the 40 px clock, large captions and return line; return facing must change after the line. Open/close Roster with the arrow and Shift. Toggle upper Alerts and reload to check persistence.
4. Inspect depleted class Armor, confirm its exact low Gold cost, restore it once; test insufficient Gold and away/dead locks. Check Potion/Medkit exact effects.
5. Run a 10/15-minute Hunt and Sunken Crypt; after five completed quests, inspect Black Gate. Watch small preliminary fights, final boss, defense losses, wounds/death labels, return and once-only Results/Finish. Use Details to read all item/XP/consequence pages.
6. Save mid-journey/battle and Continue. Unfocus a visible window, minimize/restore, then save/close/wait/reopen. The open-process clock advances; closed time does not. Repeat at 816×624 and 1280×720; check fonts, five enemies, long names, large defenses and quiet sound cues.
