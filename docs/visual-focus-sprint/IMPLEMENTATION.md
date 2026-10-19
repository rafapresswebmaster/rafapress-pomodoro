# Visual, balance and focus sprint - October 17, 2026

Implemented in the existing RPG Maker MZ project. No Git repository exists here; starting source/data hashes are in baseline-hashes.json. No AGENTS.md was found. No player saves were read or written. Schema stays 28; no new required persistent state or migration.

## Changes and numeric before/after

| Change | Before | After | Evidence/reason |
| --- | --- | --- | --- |
| Ordinary enemy defeat hold | max(scaled text hold, min(6500, 2200 + 24 x text length)) ms | 650 ms standard / 293 reduced / 0 skip, before existing playback compression | Targeted projection only; player death holds unchanged |
| Boss-encounter enemy defeat hold | same critical text minimum | 1400 / 630 / 0 ms | Retains boss emphasis |
| Won-encounter cue | Bell2 shared with all outcomes | Bell3, volume 26, pitch 110, capped 550 ms; fade last 120 ms | Existing stock asset; no commercial music added; full completion Chime1 remains 36/100 (~733 ms) |
| Goblin Tracks encounter HP modifier | +7 | +2 | Same 96 team/seed cases: 0 clears to 73 clears (76.0%); deaths 33 after, 1 retreat; zero timer violations |
| Missing dedicated narrative pools | 34 | 0 | 102 short observations; all 75 pools covered |
| UI dialogue.waitForInput | true, unused by active captions | false | Removes stale config; existing automatic advancement retained |

No other combat numbers, ritual costs/effects, repair formula, authored durations or reward values changed. Equipment calculations were verified rather than replaced. Equipping HP gear preserves current HP. Existing equipment Ward increases current Ward by the added maximum; preparation does not refill it, and encounters recover +2 capped at max. Worn Armor/condition transfers remain unchanged.

## Files

- js/plugins/RPGManagerProgression.js: targeted enemy defeat timing; ascending ritual catalogue view; general travel-note fallback; true-victory cues only after successful result recording, keyed by trip/stage.
- js/plugins/RPGManager.js: Gear totals and scroll access; current/max Overview and departure totals; Crit label; special-cap and preview limitations; serialized optional audio channel with completion priority, hidden-window suppression and bounded victory cue.
- js/plugins/RPGManagerBattleStage.js: numeric current/max counters alongside icons when space permits; identity/art mapping unchanged.
- data/RPGManagerStage3.json: one evidence-supported HP modifier, long-route attrition warnings, Birchwater setting/threat metadata correction.
- data/RPGManagerNarratives.json: three authored observations for each of 34 missing quests.
- data/RPGManagerPresentation.json and RPGManagerUI.json: defeat holds and automatic-caption config.
- tests/visual_focus_sprint.test.js and visual_focus_sprint_smoke.py: deterministic and browser regressions. Three older tests were corrected against current wave/party/audio rules.
- scripts/visual_focus_*: reproducible synthetic audits and test inventory; JSON reports in this directory.

## Evidence and limitations

Baseline quest matrix: 75 contracts x eight teams x 12 seeds = 7,200 complete sessions. Teams are Knight/Cleric/Mage, Ranger/Rogue/Barbarian and each of the six triple classes. Recommended level, cheapest compatible head/body granted, full initial class pools, five-second ticks. Gifted gear is a limitation; these are not net campaign profits. Contract JSON and actual schedule are stored per row. Wilson 95% intervals describe this fixed team mixture, not arbitrary players. Clear means settled victory without automatic retreat; wipe is trip.wiped; retreat is automatic retreat; death/wound counts come from settled member conditions. Zero timer-safety violations in this matrix. All 75 results below are the pre-tuning baseline; Goblin Tracks is separately paired below.

Class audit: 56 unordered compositions x levels 1/3/5/8 x five enemy profiles x 12 seeds = 13,440 single battles; HP remaining and per-class damage/mitigation-pool loss are logged. Additional order audit uses three orderings x four seeds per profile/level/composition. Duplicated orderings in triple teams are repeated observations, not independent formations. No causal individual-strength inference. Support/control/healing contribution attribution is incomplete; no global class tuning was made.

Ritual audit: 1,800 paired sessions across ten queued effects, four contracts, levels 3/5/8, two teams, five seeds. Immediate healing/revival/exchange are regression-tested, not assigned battle win-rate estimates. This does not exhaust ritual combinations.

Campaign audit: 48 continuing campaigns x 12 sessions = 576 sessions, eight teams, seeds 1/17/97, conservative and risky selection. Paid cheapest head/body gear, repairs at the current 35% formula, potions, free replacements, retained XP/wounds, alternating paid camp work/study with 180s/30s camp recovery. Actual unlocked affordable rituals are activated through the public rules. Fixed policies do not represent all player behavior. No free resurrection or gifted campaign gear.

Campaign outcomes: 183 free hires; 38 actual ritual activations; minimum final Gold 58. All policies could refill vacancies before their next dispatch. This demonstrates a recovery path with time at camp, not freedom from losses.

## All 75 baseline contracts

| Contract | Minutes | Skulls | Rec. level | Clear / 96 | 95% interval | Deaths | Wipes | Retreats | Gold/min | Arcana/min |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| Gather Medicinal Herbs | 1 | 1 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 3.67 | 0.00 |
| Carry a Message to the Watch | 1 | 1 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 3.33 | 0.00 |
| Collect Grave Moss | 3 | 2 | 1 | 96 | 96.2%-100.0% | 2 | 0 | 0 | 13.28 | 11.08 |
| Search the Old Road | 3 | 3 | 1 | 85 | 80.6%-93.5% | 23 | 11 | 0 | 13.28 | 11.76 |
| Guard the Woodcutters | 3 | 1 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 11.11 | 9.25 |
| Goblin Tracks | 5 | 3 | 1 | 0 | 0.0%-3.8% | 150 | 94 | 2 | 0.28 | 0.00 |
| Escort the Apothecary | 5 | 2 | 1 | 92 | 89.8%-98.4% | 10 | 4 | 0 | 12.66 | 10.54 |
| Clear the Cellar | 5 | 1 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 11.13 | 9.10 |
| Salvage the Abandoned Cart | 5 | 1 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 11.15 | 9.15 |
| Abandoned Shrine | 10 | 2 | 1 | 49 | 41.2%-60.8% | 66 | 42 | 5 | 6.77 | 5.64 |
| Spider Nest | 10 | 4 | 4 | 0 | 0.0%-3.8% | 140 | 74 | 22 | 0.02 | 0.00 |
| Patrol the Cemetery | 10 | 3 | 1 | 0 | 0.0%-3.8% | 123 | 71 | 25 | 0.00 | 0.00 |
| Recover the Stolen Ledger | 10 | 5 | 6 | 0 | 0.0%-3.8% | 120 | 75 | 21 | 0.00 | 0.02 |
| The Broken Watchtower | 10 | 4 | 4 | 0 | 0.0%-3.8% | 118 | 74 | 22 | 0.05 | 0.06 |
| The Sunken Crypt | 15 | 5 | 6 | 11 | 6.5%-19.4% | 125 | 70 | 15 | 2.24 | 1.95 |
| Orc Warcamp | 15 | 5 | 6 | 3 | 1.1%-8.8% | 144 | 81 | 12 | 0.67 | 0.53 |
| Necromancer's Tower | 15 | 4 | 4 | 0 | 0.0%-3.8% | 138 | 84 | 12 | 0.10 | 0.00 |
| The Black Gate | 15 | 5 | 6 | 0 | 0.0%-3.8% | 126 | 79 | 17 | 0.04 | 0.02 |
| Watchpost at Dusk | 3 | 5 | 6 | 2 | 0.6%-7.3% | 137 | 91 | 3 | 0.65 | 0.44 |
| The Lantern Index | 25 | 1 | 1 | 90 | 87.0%-97.1% | 13 | 4 | 2 | 10.37 | 8.44 |
| Survey of the Old Aqueduct | 25 | 3 | 1 | 0 | 0.0%-3.8% | 128 | 80 | 16 | 0.00 | 0.01 |
| The Herbarium Circuit | 30 | 3 | 1 | 0 | 0.0%-3.8% | 134 | 81 | 15 | 0.02 | 0.00 |
| An Evening at the Observatory | 30 | 5 | 6 | 0 | 0.0%-3.8% | 139 | 81 | 15 | 0.01 | 0.01 |
| Roadside Scouts | 1 | 1 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 3.17 | 0.00 |
| Red Banner Lookout | 1 | 1 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 3.17 | 0.00 |
| The Silken Crossing | 5 | 5 | 6 | 0 | 0.0%-3.8% | 148 | 91 | 5 | 0.04 | 0.00 |
| Field Map Survey | 10 | 1 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 11.07 | 9.00 |
| Wayside Lantern Round | 15 | 1 | 1 | 96 | 96.2%-100.0% | 1 | 0 | 0 | 11.02 | 9.00 |
| Cemetery Boundary Watch | 15 | 3 | 1 | 0 | 0.0%-3.8% | 121 | 77 | 19 | 0.02 | 0.00 |
| Deep Crypt Vigil | 25 | 5 | 6 | 11 | 6.5%-19.4% | 126 | 74 | 11 | 2.21 | 1.95 |
| Long Lantern Circuit | 30 | 1 | 1 | 90 | 87.0%-97.1% | 12 | 6 | 0 | 10.35 | 8.45 |
| Ash Road Sentries | 3 | 4 | 4 | 8 | 4.3%-15.6% | 134 | 83 | 5 | 1.62 | 1.25 |
| Thornbank Trail | 5 | 4 | 4 | 7 | 3.6%-14.3% | 127 | 67 | 22 | 1.32 | 1.14 |
| Wayside Reliquary | 15 | 2 | 1 | 36 | 28.5%-47.5% | 85 | 46 | 14 | 4.90 | 4.16 |
| Birchwater Samples | 25 | 2 | 1 | 0 | 0.0%-3.8% | 149 | 81 | 15 | 0.01 | 0.00 |
| Moonlit Barrow | 25 | 4 | 4 | 0 | 0.0%-3.8% | 138 | 85 | 11 | 0.01 | 0.01 |
| Meadow Cartography | 30 | 2 | 1 | 0 | 0.0%-3.8% | 137 | 84 | 12 | 0.01 | 0.00 |
| Ridge Signal Fires | 30 | 4 | 4 | 0 | 0.0%-3.8% | 148 | 78 | 18 | 0.00 | 0.00 |
| Brookside Escort | 3 | 1 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 11.69 | 9.08 |
| Millstream Watch | 5 | 3 | 1 | 0 | 0.0%-3.8% | 150 | 94 | 2 | 0.22 | 0.00 |
| Orchard Trackers | 10 | 1 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 11.07 | 9.05 |
| Broken Banner Escort | 20 | 3 | 3 | 82 | 77.0%-91.1% | 24 | 13 | 1 | 12.83 | 11.12 |
| The Bellkeeperâ€™s Rest | 20 | 4 | 4 | 48 | 40.2%-59.8% | 61 | 29 | 19 | 8.54 | 7.53 |
| Cliffside Rescue | 20 | 5 | 5 | 96 | 96.2%-100.0% | 8 | 0 | 0 | 19.04 | 17.05 |
| Bridge Toll Tyrant | 20 | 3 | 3 | 96 | 96.2%-100.0% | 1 | 0 | 0 | 15.03 | 13.00 |
| Seal the Ember Rift | 20 | 4 | 4 | 96 | 96.2%-100.0% | 1 | 0 | 0 | 17.04 | 15.00 |
| The Cistern Has Teeth | 1 | 1 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 3.17 | 0.00 |
| Lanterns for the Lost | 5 | 2 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 9.35 | 4.65 |
| The Last Ore Cart | 15 | 3 | 2 | 49 | 41.2%-60.8% | 82 | 40 | 7 | 3.93 | 1.97 |
| Bell Tower at Dusk | 3 | 1 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 9.00 | 4.33 |
| Wolves at the Tollgate | 5 | 2 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 9.27 | 4.70 |
| The Rooftop Reliquary | 10 | 3 | 2 | 96 | 96.2%-100.0% | 8 | 0 | 0 | 8.47 | 4.20 |
| Tracks in the Reedbeds | 3 | 1 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 8.78 | 4.42 |
| A Map of False Stars | 10 | 2 | 1 | 33 | 25.6%-44.3% | 90 | 51 | 12 | 2.65 | 1.36 |
| The Orchard That Walked | 25 | 4 | 3 | 16 | 10.5%-25.4% | 120 | 62 | 18 | 1.23 | 0.61 |
| Feathers in the Honey | 5 | 2 | 1 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 9.27 | 4.65 |
| Carrion at the Icehouse | 15 | 3 | 2 | 47 | 39.2%-58.8% | 83 | 40 | 9 | 3.82 | 1.89 |
| Eyes Beneath the Sand | 20 | 4 | 3 | 26 | 19.2%-36.7% | 117 | 54 | 16 | 2.09 | 1.05 |
| The Cinder Nursery | 10 | 3 | 2 | 40 | 32.3%-51.7% | 87 | 41 | 15 | 3.58 | 1.80 |
| Captain of the Black Shoal | 20 | 4 | 3 | 33 | 25.6%-44.3% | 81 | 40 | 23 | 2.67 | 1.33 |
| The Giant and the Labyrinth | 30 | 5 | 4 | 27 | 20.1%-37.8% | 91 | 53 | 16 | 2.10 | 1.03 |
| The Unbroken Seal | 5 | 2 | 2 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 9.20 | 5.00 |
| The Saint's Broken Hands | 10 | 3 | 3 | 96 | 96.2%-100.0% | 7 | 0 | 0 | 8.10 | 4.53 |
| The Gilded Tithe | 5 | 2 | 2 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 9.07 | 5.05 |
| Names Beneath the Ossuary | 20 | 4 | 4 | 59 | 51.5%-70.6% | 61 | 29 | 8 | 4.39 | 2.46 |
| The Beggar's Silver Bell | 10 | 2 | 2 | 72 | 65.5%-82.6% | 53 | 24 | 0 | 5.25 | 3.08 |
| The Choir of Rust | 15 | 3 | 3 | 92 | 89.8%-98.4% | 15 | 4 | 0 | 6.78 | 3.85 |
| The Thread Before the Axe | 25 | 5 | 5 | 35 | 27.5%-46.4% | 74 | 49 | 12 | 2.58 | 1.47 |
| The Ferryman's Last Passenger | 25 | 5 | 5 | 48 | 40.2%-59.8% | 59 | 26 | 22 | 3.53 | 2.01 |
| The Empty Treasury | 5 | 2 | 2 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 9.35 | 5.00 |
| The Shieldmaker's Promise | 10 | 2 | 2 | 54 | 46.3%-65.7% | 55 | 36 | 6 | 3.94 | 2.27 |
| The Lantern Without a Keeper | 15 | 3 | 3 | 55 | 47.3%-66.7% | 74 | 34 | 7 | 4.10 | 2.29 |
| The Dawn Duel | 5 | 2 | 2 | 96 | 96.2%-100.0% | 0 | 0 | 0 | 9.15 | 5.00 |
| The Twice-Struck Chime | 20 | 4 | 4 | 52 | 44.2%-63.8% | 66 | 34 | 10 | 3.81 | 2.20 |
| Embers for the Altar | 15 | 3 | 3 | 61 | 53.6%-72.5% | 57 | 27 | 8 | 4.48 | 2.56 |

## Tuning comparison

goblin_tracks: baseline +7 HP had 0/96 clears (95% Wilson 0%-3.85%). +2 HP has 73/96 clears (approximately 66.6%-83.5%). Tests of +0 and +1 yielded 96 and 93 clears; +2 better matches the provisional Normal range. Same teams and seeds; RNG branches diverge after numeric changes, so compare distributions rather than event-by-event outcomes.

Birchwater and Meadow had 0/96 clears. Testing HP +0 yielded only 27/96 and 25/96. Those trial modifiers were not shipped: isolated HP tuning does not resolve their long-route attrition. Warnings were clarified. The broader 17 zero-clear baseline routes remain priorities; no blanket claim of balance is made.

## Test and review report

Commands:

`node --test --test-isolation=none tests/visual_focus_sprint.test.js tests/polish25.test.js tests/visual_battle_stage.test.js tests/mission_background_clock.test.js tests/altar_rituals.test.js tests/complete_battle_sequence.test.js tests/party_leader_succession.test.js tests/next_playtest.test.js` - 75 passed, zero failed.

`python scripts/visual_focus_test_inventory.py` - 55 files; 623 passed, 129 failed; 22 passing files, 33 failing files, zero timeouts. The full suite is not clean. The pre-sprint survey was 612/132; eight new passes plus three corrected stale cases give 623/129.

Fixed stale assertions: replay selected the last wave snapshot as the opening; leadership assumed a two-member expedition and that an incapacitated member could lead; audio expected the retired all-outcome battleEnd cue. Current behavior tests now pass without changing succession or replay rules. Other failures remain in historical suites (old class counts, roster/Team B, traits, XP, repair APIs, full Ward resets and source-string expectations). Remaining failures are logged individually; they have not all been adjudicated as harmless. No newly confirmed timer/settlement regression was found.

`python tests/visual_focus_sprint_smoke.py` - both actual game canvas sizes, 816x624 and 1280x720, passed. Screenshots: tests/visuals/focus-sprint-*.webp. Gear, altar, battle, campfire and recap captured. Existing polish25 browser checks also passed, including board/shop/confirmation. No browser page errors. Rendered screenshots were inspected; initial enemy placeholder figures resolved after asset loading. Existing art and frozen trip background mappings were retained. Headless Chromium uses software rendering; no native monitor/controller/audio comfort acceptance is implied. Graveyard and native minimize/restore were not newly manually reviewed.

Audio source: existing audio/se/Bell3.ogg, stock RPG Maker cue (not an original trumpet fanfare). Duration is bounded at 550 ms including a 120 ms fade; volume 26 obeys AudioManager SE/master settings. The buffer boundary was mocked to verify once-only playback, mute, failure isolation and completion priority. Native listening remains required for comfort; no subjective audio claim is made.

The ordinary Node subprocess test runner was blocked by sandbox EPERM; --test-isolation=none succeeds. Playwright required an approved sandbox escalation for its subprocess pipes. These were environment constraints, not game failures.

## Remaining decisions and release gaps

- Reanimate restores class totals after death returns equipment to stock. Whether pre-death equipped totals were intended remains unresolved; preserved.
- Last Rites can return an exhausted skeleton while Reanimate remains barred; preserved pending product decision.
- Broader route balance, full support/control/healing attribution, exhaustive ritual combinations, background/art review across every screen, native sound comfort and hardware soak are incomplete. No release-wide balance or manual acceptance sign-off is claimed.
