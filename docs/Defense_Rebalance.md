# Defense and economy rebalance

Schema 31, October 17, 2026. [Exact class, equipment, economy and catalogue values](Defense_Rebalance_Manifest.json).

## Classes and XP

Characters have lower HP and depend more on Armor, Ward, Dodge and class powers. Equipment HP bonuses now grant Ward. Growth applies through level eight.

| Class | HP level 1 to 8 | Armor | Ward | Dodge |
| --- | --- | --- | --- | --- |
| Barbarian | 4 to 5 | 1 to 4 | 0 | 12% to 17% |
| Knight | 3 to 4 | 4 to 8 | 0 to 1 | 8% to 12% |
| Ranger | 3 to 4 | 1 | 1 to 3 | 24% to 31% |
| Rogue | 3 | 1 to 3 | 0 to 1 | 32% to 39% |
| Mage | 2 to 3 | 0 | 4 to 7 | 10% to 13% |
| Cleric | 3 | 1 to 3 | 3 to 6 | 10% to 14% |

Values exclude equipment and combat powers. Knight and Barbarian recover intrinsic Armor before encounters; Ward replenishes by two. Cleric support adds protection alongside smaller healing. Defensive capstones work at one remaining HP.

Successive level costs are 60, 140, 260, 420, 640, 900 and 1,200 XP: 3,620 total to level eight. Completion and enemy XP are shared pools split among the selected one to three members. Benched members receive none. Completion XP requires victory; earned enemy XP survives recall. Skeletons cannot advance.

## Catalogue

There are 264 quests, including 189 additions. All 48 combinations of 5?30 minutes in five-minute steps and 1?8 skulls contain at least five entries. Existing excess quests remain. Short catalogues retain five one-minute and eight three-minute quests. Additions include enemies, rewards, backgrounds and journey text.

Skulls estimate average trio level. One skull supports an unequipped level-one solo character. Eight skulls remains dangerous at level eight with strong gear. Encounters combine weaker patrols and stronger objectives, with at most five planned encounters. Old active trips retain their original combat model until return.

## Five-member economy and Auto-assign

New games start with one character and 100 Gold. Recruitment remains free. The roster holds five; quests take one to three.

Camp jobs produce once per minute: two resources at a class's best job, one otherwise. Barbarian, Knight, Ranger and Rogue prefer Workshop/Gold; Mage and Cleric prefer Study/Arcana. Auto-assign sets available campers to their best work, preserves accumulated fractions and skips away, dead and retired members. Camp Jobs remains accessible during expeditions.

Five campers can produce ten combined resources per minute. Dispatching one, two or three leaves maximum bench income of eight, six or four per minute. HP recovery remains one per 30 seconds.

| Victory example | Gold | Arcana | Shared completion XP |
| --- | ---: | ---: | ---: |
| 5 minutes, 1 skull | 50 | 16 | 29 |
| 15 minutes, 4 skulls | 240 | 105 | 252 |
| 30 minutes, 8 skulls | 720 | 360 | 1,440 |

Above one minute, Gold = minutes ? (8 + 2 ? skulls); Arcana = minutes ? (2 + 1.25 ? skulls), rounded. Completion XP = rounded minutes ? (4 + 1.5 ? skulls + 0.25 ? skulls?) ? (1 + (minutes ? 5) / 50). One-minute rewards are three Gold, zero Arcana and three shared XP.

A basic head/body kit costs 38 Gold, or 190 for five members. Strong four-slot kits cost 305?332 per member. Repair costs 35% of purchase price rounded up; resale returns 50%. [Ritual prices](Altar_Rituals.md) were retuned. Offering grants 12 Arcana per actual battle victory; Rebate requires a battle victory, preventing combatless repeat farming.

## Equipment

Each battle victory rolls once for compatible equipment: 3% normally, 6% on boss contracts. Losses drop none; earned drops survive recall. Duplicate settlement cannot reroll loot.

Every item has an item-specific seeded lifetime within four to twenty hits. Heavier materials generally last longer. Each connected incoming strike wears every equipped item once, including Armor/Ward-absorbed hits. Misses and fully intercepted hits do not count.

At zero hits an item immediately breaks and loses its bonuses. Individual-copy wear persists through storage, swapping, return and saves. Returning restores intact Armor, not hit lifetime. Paid repair restores bonuses and hit lifetime. Equipment screens display remaining hits.

## Validation

Sixty-nine focused tests passed across balance, persistence, rituals, roster, battle sequences, visual stages, quest backgrounds and skull ratings. Browser checks passed at 816?624 and 1280?720, including all 48 quest combinations, repair, shared-XP dispatch and Auto-assign while members are away.

The [full-expedition audit](Defense_Rebalance_Audit.json) ran 3,588 trials. All 210 unequipped one-skull trials cleared without deaths. Eight-skull ordinary-gear groups cleared 134/222 trials with 191 deaths; strong-gear groups cleared 215/222 with 47 deaths.

The [class audit](Defense_Class_Audit.json) ran 2,016 objective battles covering all 56 unordered trios, including repeated classes, at ratings two, five and eight. Audits use supplied gear and sampled deterministic seeds; they do not simulate campaign purchasing decisions or guarantee every party's outcome.

Reproduce with `node scripts/defense_balance_audit.js`, `node scripts/defense_class_audit.js` and `node scripts/write_defense_manifest.js`.
