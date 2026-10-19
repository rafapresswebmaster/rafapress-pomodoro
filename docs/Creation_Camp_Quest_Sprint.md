# Character Creation, Camp and Quest Sprint — October 16, 2026

Implemented in the existing offline MZ project. Save schema remains **24**. No new backend, build system, clock or plugin; order remains Battle → Progression → BattleStage → Manager. `js/focus_companion.js` is untouched. Source snapshots: `backups/oct16-source/`. The requested timestamped handoff was absent; the latest `context/Teamfight_Manager_Post_Sprint_Handoff.md` and actual source were used. Previous handoff preserved in `context/archive/Teamfight_Manager_Pre_Creation_Sprint_20261016.md`.

## Delivered behavior

- Fresh New Game opens three editable creation cards: six classes, two genders, editable/suggested names, class-locked portraits, role/stats, review and back. Duplicate classes/genders are legal. Confirmation validates all three before mutating anything. Cancel creates nobody. Stable founder IDs are assigned only on confirmation; Tavern candidates have separate IDs, retain twelve categories and restock safely. Custom names use existing validation and collision rules. Existing `confirmStartingRoster` rules API remains for historical harness compatibility; the old selection windows are removed from the game.
- One existing Actor2/Actor3 portrait per class/gender, stored as `portraitKey` and a canonical portrait reference; no cross-class choices. Legacy missing keys normalize to class/gender defaults. Reanimated monster identity is retained. There was no supplied character-creation reference image.
- Quest Board has exact-minute and Easy/Normal/Hard filters derived from the 23 authoritative contracts. Selected filters are explicit native select controls with keyboard and MZ controller traversal. Empty combinations explain changing filters. Cards retain risk/recommended level/rewards; the selected contract emphasizes its numerically largest guaranteed reward (ties prefer Gold, then Arcana, then XP). Random items remain described as possible finds. The confirmation includes portraits, defensive values, injuries, recommended level, risk, all guaranteed rewards and explicit timer-start copy. Only **Embark** dispatches; Cancel/Escape remains read-only.
- Larger walking party sprites (up to 104 pixels), larger fixed numeric HP/Armor/Ward rows, distinct labels and colors. No leader asterisk. One shared eight-button camp navigation order: Character / Camp, Quest Board, Armory, Tavern, Altar, Graveyard, Camp Jobs, Save. Shared resource/alerts strip across camp menus. Active expedition retains its existing prominent timer and menu lock.
- At settlement, Home restores its camp layout; recap occupies the right roster panel. Camp recovery/jobs continue immediately. Other camp menus remain usable; Quest Board is disabled until Finish. Recap reads settled values, has input-controlled details pages, wheel support and an accessible Finish button. Save/load preserves an undismissed recap and never awards again.
- A dismissible 1.6-second lantern vignette gives two presentation beats: gathered by the fire → heading home. It neither delays settlement nor changes outcomes; Finish can dismiss immediately.
- Class and worn-equipment Armor replenish on successful return, retreat and early end. Magical wards still refill between battles. Paid restoration code/actions and old repair APIs are removed. Equipping still cannot heal or restore worn condition; death gear returns once.
- Medkits removed from definitions, shop/use flows, starting stock, authored reward lists and loot. Legacy owned quantities are discarded without compensation; visible legacy recap item/line mentions are filtered without changing ledger currency or outcomes. Only migration code recognizes the removed ID.
- Both Work and Study generate one resource per 30 seconds per eligible assigned camp member. Active process time and existing clock are used; closed time produces nothing. Version-1 job balances migrate proportionally once into production marker 2: Work fraction /60s ×30s, Study fraction /300s ×30s. Reassignment pauses that job's fraction. Unmarked telemetry grants no production.
- Jobs now select companion first, then Idle/Workshop/Study; symbols, resource/rate, eligibility, assignment and simultaneous passive recovery are visible. Three Study members produce six Arcana/minute.
- Inert Mage Robes now add 1 maximum HP without healing; Ward Focus is a protective focus granting 1 Armor. All 17 visible gear pieces have mechanical tests. Existing tier/class/stock/death rules remain; no extra items were needed to fill a progression gap.
- Enemy target scoring uses vulnerability, bounded threat, current defenses, seeded avalanche-mixed variation, and a short four-attack focus history. Repeated focus beyond one attack adds a 1.4-point penalty per repeated entry if alternatives live. High intelligence weights vulnerability more; low weights it less. Dead/incapacitated targets are excluded. Player abilities and intentional special effects are unchanged.
- Quest narrative architecture remains 20 entries ×23 contracts plus 20 shared entries (480 unique). Ten lines per route plus return lines rewritten as connected travel observations; class travel/return voices rewritten and repeated stock prefixes removed. Remaining authored landmarks retained. Event outcome text still comes from recorded events; critical notices get a 2.2–6.5-second reading minimum even with skipped motion. One queue serializes notices.

## Backgrounds and asset provenance

All 23 assignments audited. Floor-only battlebacks were 1000×740 and compositionally unsuitable as full environments. Five coherent 1536×1024 scenic backgrounds now cover the routes. Background reference remains locked in the trip; travel uses a 48-pixel overscan and bounded horizontal drift so it has no wrap seam/reset. Source crop preserves aspect ratio. Existing sprite bob and faster foreground details remain; inactive/minimized render behavior remains under the existing lifecycle throttle.

| File under img/pictures | Dimensions | Provenance / use |
|---|---|---|
| BattleRoad_v1.webp | 1536×1024 | New built-in imagegen; meadow/trade road/watchpost routes |
| BattleGraveyard_v1.webp | 1536×1024 | New built-in imagegen; cemetery routes |
| BattleGate_v1.webp | 1536×1024 | New built-in imagegen; warcamp, tower, gate and fortified watch routes |
| BattleWoodland_v1.webp | 1536×1024 | Existing project painted woodland/ruins art; forest, shrine, aqueduct, observatory |
| BattleCavern_v1.webp | 1536×1024 | Existing project painted cavern/ruins art; cellar, crypt, spider cave |

New images were copied into the project from Codex generated-images storage; source art was not overwritten. Prompt set is in `docs/Oct16_Art_Provenance.json`. Actor2/Actor3 face sheets remain the original 576×288 MZ assets. A single compatible portrait per category is a disclosed art limitation; there are no fake extra options. Existing woodland ruins are reused for the observatory/aqueduct rather than generating near-duplicates.

## Economy and difficulty evidence

Camp baseline is now 2 Gold or Arcana/member/minute; a three-member assigned camp earns 6/minute. Actual prior code was Work 1/minute and Study 1/5 minutes (the brief's five-minute baseline for both did not match code). Prices remain meaningful at 18–110 Gold: about 3–18.3 minutes of three-worker production; starting Gold remains 100. Quest rewards were not changed. Most active expeditions take all three members away, so these jobs accrue while at camp.

**Measured conversion correction:** Greed Prayer formerly traded 10 Arcana for 100 Gold; with three Study members that implies 60 Gold/minute, versus 6 Gold/minute from Work. Its cast cost is now **100 Arcana for 100 Gold**, equalizing sustained output. Unlock cost is still 10; the UI reads the authoritative ritual costs. Other ritual prices are unchanged.

The full matrix is **8,280 seeded runs**: all 23 contracts, 20 seeds, three compositions (knight/barbarian/ranger; rogue/mage/cleric; triple mage), levels 1/2/4, no gear or an ordinary Leather Cap each. Intended-level summary below; JSON also retains off-level and duration/encounter buckets. Objective success can include casualties. Wounded/deaths count people, not sessions. Draws at the full deadline are reported as timeout proxies; this does not count user-initiated early ends.

| Gear | Difficulty | Runs | Objective wins | Retreats | Wounded | Deaths | Draws at deadline | Armor restored |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| none | Easy | 360 | 100.0% | 0 | 0 | 0 | 0 | 64 |
| none | Normal | 480 | 82.5% | 5 | 220 | 200 | 0 | 547 |
| none | Hard | 540 | 69.3% | 0 | 351 | 347 | 0 | 1415 |
| ordinary | Easy | 360 | 100.0% | 0 | 0 | 0 | 0 | 65 |
| ordinary | Normal | 480 | 96.0% | 0 | 76 | 102 | 0 | 586 |
| ordinary | Hard | 540 | 83.3% | 0 | 235 | 239 | 0 | 1532 |

No-gear targets remain Easy approachable, Normal **80–90%**, Hard **50–70%**. Initial new-AI matrix gave Normal 93.3% / Hard 70.4%; a 3,264-run HP sweep supported +1 encounter HP on Normal. Black Gate's +1 HP brought overall Hard to 69.3%. Enemy template data is not mutated. `tests/oct16-pre-tuning-balance.json`, `tests/oct16-tuning.json` and final `tests/oct16-balance.json` retain evidence. Final matrix merges an independently rerun Black Gate subset (18 rows /360 runs), with all other unchanged matrix rows preserved.

**Remaining balance gap:** ordinary gear reaches Normal 96.0% and Hard 83.3%, above the old no-gear ceilings by 6.0 and 13.3 points. Those ceilings were not silently raised. A blanket HP increase that forces geared parties under them drives unarmored Hard below its survival floor; see sweep. Further gear/difficulty tuning is still needed. This sprint does not claim that gap is resolved.

The updated 16-mission route uses creator-defined founders, paid caps, free vacancy replacements, passive camp care and actual Work/Study. Result: **1 death, 505 Gold, levels 4/3/4**. This is one deterministic route, not a population average. JSON records per-mission rewards, replacement names, gear, recovery time and resource balances.

AI comparison: **6,480 battles** across before/after engines, sizes 1/2/3, levels 1/2/4, three difficulties, two gear conditions, three compositions and 20 seeds. Three-member subset: 1,080 battles/version. Mean enemy target share of the most-attacked member falls **44.86% →42.25%**; first-eight-attack concentration **48.88% →44.56%**. Wins 882→938, knockouts 808→618. These are isolated combat samples, separate from campaign deaths/fate. Raw rows: `tests/oct16-ai.json`.

## Exact asterisk diagnosis

`js/plugins/RPGManagerBattleStage.js`, **TravelStage.render**, built the label with `npc.id===trip.leaderId ? "* " : ""`. The fallback `Window_RPGExpeditionPanel.drawTravel` in `js/plugins/RPGManager.js` repeated the same leader prefix. The initial party's first member was its leader, so the symbol appeared before that first name. It was a deliberate leader annotation, not corrupt names, an escape code or serialization damage. Both label prefixes were removed at their source. Attack target markers elsewhere are retained. Regression renders all three names after creator confirmation and reload, including **O'Ryan***; the legitimate trailing asterisk and apostrophe survive. Browser captures inspect rendered text, not just the model.

## Verification

**238 tests pass; 0 failed, skipped or cancelled.** Historical assertions were updated where their rules were explicitly superseded: medkits, paid restoration APIs, job periods, starter picks, filters, readable critical timing and return armor. Unchanged tests still cover exactly-once rewards, death gear returns, wounds, specials, no equip healing, timer normalization and legacy saves. New file `tests/oct16.test.js` has 43 checks including all twelve identity combinations, atomic validation, all visible equipment, proportional job migration, economy conversion and rendered name punctuation.

```powershell
node --test --test-isolation=none tests/post_sprint_fixes.test.js tests/stage1_camp_home.test.js tests/stage2_realtime_loop.test.js tests/stage3_catalogue.test.js tests/stage4_realtime_presentation.test.js tests/stage5_equipment_repair.test.js tests/recoverable_errors.test.js tests/item_persistence.test.js tests/polish_tuning.test.js tests/small_roster_rework.test.js tests/death_stabilization.test.js tests/complete_battle_sequence.test.js tests/quest_window_polish.test.js tests/mission_background_clock.test.js tests/pomodoro_focus.test.js tests/pomodoro_sprint.test.js tests/next_playtest.test.js tests/visual_battle_stage.test.js tests/illustrated_travel.test.js tests/readability_progression.test.js tests/focus_companion.test.js tests/coordinated_sprint.test.js tests/sprint2.test.js tests/oct16.test.js
python scripts/validate_sprint2_content.py
python scripts/sync_adventurer_catalogue.py --check
python tests/oct16_smoke.py
node scripts/oct16_balance_audit.js
node scripts/oct16_ai_audit.js
node scripts/oct16_campaign_route.js
node scripts/oct16_tune.js
```

Syntax: `node --check` for `js/main.js` and all four plugins. Content validation: 120 exclusive names, 12 categories, 480 unique notes, 23 valid backgrounds. Catalogue/runtime agreement: 6 classes, 12 moves.

Browser gates at **816×624 and 1280×720**: creator/edit/review, legal duplicate classes, name punctuation, full Tavern, all camp menus, direct jobs assignment, sheet controls, minute/difficulty filters, Escape/no dispatch, explicit Embark, rendered names, locked travel/battle art, camp recap, separate-window focus clock, isolated StorageManager save/load with pending recap, jobs before Finish, keyboard Finish; zero page errors. Captures: `tests/visuals/oct16-*`; output: `tests/oct16-browser.txt`. Save gate uses ephemeral browser storage named `oct16-isolated-validation`; user desktop saves were not overwritten.

`tests/oct16-render-profile.json` compares old/new cached travel draw CPU cost at both sizes (three ×60 synchronous draws). This is a small rendering microbenchmark, **not an FPS/native/minimized/memory claim**. Existing backdrop cache tests pass; there is no per-frame image allocation. The previous native 250ms timer/minimize verification remains historical evidence only.

## Known limits and fresh-game manual checklist

- One portrait per class/gender. Dedicated observatory/aqueduct scenery uses existing woodland ruins; no bespoke variants.
- Ordinary geared win-rate ceilings remain unmet as quantified above. Single-route economy results do not prove long-campaign balance.
- No fresh physical-controller, real second-monitor/native always-on-top, audio/DPI/hotplug or long-duration memory soak was performed. Browser controller support uses MZ mappings; separate-page focus tests do not substitute for physical multi-monitor validation.
- New art and compact layouts have automated captures, but final artistic preference and a complete human playthrough still need review. Narrative templates favor coherent travel and may benefit from further authored variety.

1. New Game: create three companions, try duplicate/blank/long names, change class/gender, review/back, then confirm. Check all 12 Tavern categories.
2. Assign Study to three camp members; wait one active minute for +6 Arcana. Reassign one to Work and test partial progress across save/load; closed time grants nothing.
3. Filter every minute/difficulty pair, including empty pairs; Cancel confirmation and verify no timer. Embark and check timer on an unfocused second monitor.
4. Watch a battle, special and knockout; check readable HP/Armor/Ward, event text and locked environment. Return/early-end: Armor replenishes, wounds remain and camp recovery begins before Finish.
5. Inspect right recap details, save/reload with recap open, use Jobs/Armory, then Finish. Verify no duplicate rewards. Check physical controller, sound and 816×624 /1280×720 display scaling.
