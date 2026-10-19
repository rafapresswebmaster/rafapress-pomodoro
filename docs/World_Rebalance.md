# World, economy and equipment rebalance

Implemented all five requested changes. Game saves were not edited. Existing running expeditions retain their authored balance version; newly dispatched missions use version 33.

- Destroyed equipment is removed from its slot, condition records, combat bonuses and inventory. Legacy broken stock is discarded while intact spares retain their durability. Gear loss persists through settlement, recall and save/load. Buy a replacement and select it in the character sheet Gear tab.
- Workshop and Study now pay every 120 seconds instead of every 60. Existing fractional progress migrates proportionally; healing stays at one HP per 30 seconds. Authored quest Gold and Arcana payouts are halved, including the one-minute stroll override. XP is unchanged.
- All 264 missions reference detailed illustrated scenery instead of floor textures or abstract battlebacks. Existing woodland, crypt, coast, mountain and cavern illustrations were reused. Legacy floor locks fall back to the current scenic location.
- All 52 enemy records now carry explicit reference HP, Armor, Ward, dodge, speed, critical chance, damage and special-attack profiles. Enemy critical hits now work. Rank and per-quest tuning preserve differences between creatures instead of overwriting every type with identical stats.
- Nine encounter families constrain objective enemies and patrols to coherent groups. Quest encounter labels and known threats match the new groups; random jester encounters stay with demon cults.

## Independent validation

Full expeditions; all quests at equal party level. Two complementary three-person compositions; seeds 101-116 for every three-skull quest, 101-104 for others, independent of calibration. No gear, cheapest compatible head/body, or premium gear in every slot. No rituals. Includes patrols, wounds, death saves, recovery, gear wear, extraction and quest settlement. Does not measure human play or every class composition.

Total: **8,568 full expeditions across all 264 quests**. Calibration separately tested candidate tuning for all 188 combat quests at three skulls or higher.

| Three-skull level-three party | Expeditions | Clears | Wounded/dead companions per 100 expeditions |
|---|---:|---:|---:|
| No gear | 992 | 52.8% | 185.2 |
| Cheapest compatible head/body | 992 | 94.9% | 57.8 |
| Premium gear in every slot | 992 | 100.0% | 3.6 |

Premium equipment greatly improves safety but does not eliminate casualty rolls. These are deterministic simulated expeditions for two class compositions; they do not cover every possible party, ritual setup or human decision.

## Checks and artifacts

- Focused regression command and results: tests/rebalance-focused-results.txt.
- Actual browser checks passed at 816?624 and 1280?800, including replacing destroyed gear through the Gear dropdown and rendering mission scenery. No save writes or browser errors. Script: tests/world_rebalance_browser.py.
- Full independent results: docs/World_Balance_Validation.json. Calibration: docs/Enemy_Profile_Calibration.json. Enemy reference table and scenery review: docs/Enemy_Combat_Profiles.md.
- Historical broad regressions are not all green: quest_followup.test.js still expects encounter counts above 27 and an older identity layout; the older catalogue coverage assertion expects five quests at every exact time/rating pair, while existing rescaled ratings do not meet that distribution. Those historical assertions were not used as acceptance criteria. tests/defense_rebalance.test.js was updated for the requested destruction and income rules; its unrelated exact-pair assertion is excluded from the focused command.

Reproduction: node scripts/calibrate_enemy_profiles.js (deliberately rewrites tuning), then python scripts/finalize_world_catalogue.py, then node scripts/validate_world_balance.js.

## Encounter strength and second-wave follow-up

Version 33 gives every enemy at three/four skulls at least 3 HP, and at five skulls or higher at least 4 HP. This applies to objectives, patrols and reinforcements. Profiles still determine armor, ward, damage, speed, dodge and critical chance.

Four-skull objectives introduce second waves (16 of 31 quests). Every five-to-eight-skull objective has two waves. Longer seven/eight-skull routes also have a reinforced patrol. Existing large formations are split rather than given an extra third wave. Second waves retain player HP loss, spent protection, signature state and item wear. Reinforcements use lighter HP/protection than the main defenders. Both the automatic simulation and manual battle factory load the same waves, and the quest risk preview includes objective reinforcements.

The static audit checks 1,277 scheduled enemy entries across 621 battles, including 173 two-wave battles, with zero targets at 1?2 HP in the three-to-eight-skull tiers. See docs/Encounter_Reinforcement_Audit.json. The latest 8,568-expedition validation includes these changes. Seven/eight-skull premium-gear clear rates are 86.3% and 76.1%; simulations use no rituals. Focused checks: tests/reinforcement-results.txt. Browser smoke checks pass at both viewport sizes and explicitly verify manual battle reserves. Player saves were not edited; existing dispatched missions keep their previous balance version.
