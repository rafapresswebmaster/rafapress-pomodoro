# October 15 economy and graphics audit

## Economy source audit

The existing sources are authored quest Gold/Arcana/XP; seeded roadside Gold, shrine Arcana and supply finds; completion consumable/common/rare gear rolls; Workshop (1 Gold/minute) and Study (1 Arcana/5 minutes) while the process is open; and resale of unequipped shared stock. Starting resources are 100 Gold, 0 Arcana, 6 Potions and 3 Medkits. No offline income was added. Quests suspend participants’ camp jobs. Recruits fill vacancies for **0 Gold**, including at zero balance.

Gold sinks: purchases (gear 18–110g), Potion **6g** (was 10g), Medkit **12g** (was 25g), class Armor restoration **2g per missing point**. Gear resale is half purchase price rounded down, consumes exactly one shared-stock item, and cannot reach equipped items. Worn stock keeps its recorded remaining Armor when returned/re-equipped; no item Repair action exists. HP gear does not heal on equip.

Arcana sinks remain Protection Ward unlock/cast **10/5**, Healing Ritual **20/10**, Greed Prayer **10/10**, Reanimate **100/50**. Reanimation uses existing rules; no recruit fee or alternative economy was introduced. Higher Arcana income makes these reachable while retaining the unlock/cast decision. The inert legacy Ward Focus remains visibly described as inert, avoiding an invented magical item effect.

Scarcity found: 5–10g short errands could not cover the old 10g Potion plus 25g Medkit; 0–3 Arcana on most routes made Altar progression slow relative to its costs. Gold rewards stay unchanged. Medkit cost now equals two Potions; expensive armor still requires saving. Most Arcana routes roughly double; combat routes with none gain 2 Arcana; cold-shrine finds rise from 1 at 50% to 3 at 80%. Class restoration adds a small recurring Gold sink.

## Authored preview/reward audit

Amounts below are victory rewards before seeded finds; draw/defeat tables remain explicit in data. XP is per companion; Recall forfeits completion XP/rewards and retains only acquired finds. Normal play normalizes the retired hidden danger preference to Standard, while active saved trips retain locked amounts.

| Contract | Minutes | Type | Gold | Arcana before → now | XP each | Potential bonus |
|---|---:|---|---:|---:|---:|---|
| Gather Medicinal Herbs | 1 | none | 5 | 0 → 0 | 5 | potion: 50% |
| Carry a Message to the Watch | 1 | none | 6 | 0 → 0 | 5 | None |
| Collect Grave Moss | 3 | optional | 2 | 1 → 3 | 8 | None |
| Search the Old Road | 3 | optional | 8 | 0 → 0 | 8 | potion: 25% |
| Guard the Woodcutters | 3 | optional | 10 | 0 → 0 | 10 | None |
| Goblin Tracks | 5 | required | 18 | 0 → 2 | 20 | commonEquipment: 15% |
| Escort the Apothecary | 5 | optional | 16 | 0 → 0 | 18 | potion: 75%, medkit: 20% |
| Clear the Cellar | 5 | required | 18 | 0 → 2 | 20 | potion: 30% |
| Salvage the Abandoned Cart | 5 | optional | 20 | 0 → 0 | 18 | potion: 35% |
| Abandoned Shrine | 10 | required | 30 | 2 → 4 | 35 | commonEquipment: 25% |
| Spider Nest | 10 | required | 32 | 0 → 2 | 38 | medkit: 30% |
| Patrol the Cemetery | 10 | required | 15 | 3 → 6 | 40 | None |
| Recover the Stolen Ledger | 10 | required | 36 | 0 → 2 | 40 | commonEquipment: 30% |
| The Broken Watchtower | 10 | required | 38 | 1 → 3 | 42 | commonEquipment: 35% |
| The Sunken Crypt | 15 | required | 65 | 6 → 12 | 65 | rareEquipment: 20% |
| Orc Warcamp | 15 | required | 75 | 1 → 3 | 70 | commonEquipment: 55% |
| Necromancer's Tower | 15 | required | 55 | 8 → 16 | 72 | rareEquipment: 25% |
| The Black Gate | 15 | required | 90 | 10 → 20 | 85 | rareEquipment: 45% |

## Representative budgets

- **1-minute message:** 6g, 0a, 5 XP; buys one Potion. Three such errands reach level 2 (15 XP). Herbs pay 5g with a 50% Potion bonus; safe does not guarantee a fight.
- **3-minute Grave Moss:** 2g, 3a, 8 XP, optional fight. An Arcana-focused route is deliberately weaker for Gold.
- **5-minute Goblin Hunt:** 18g, 2a, 20 XP; covers one Medkit (12g) plus one Potion (6g), or one Potion and up to six missing class-Armor points (12g). Gear purchase requires saving.
- **10-minute Shrine Hunt:** 30g, 4a, 35 XP; one Medkit (12g), two Potions (12g), three restored Armor (6g) consume the whole base payout.
- **15-minute Sunken Crypt:** 65g, 12a, 65 XP; two Medkits (24g), three Potions (18g) and six restored Armor (12g) leave 11g toward gear.
- **15-minute Black Gate boss:** 90g, 20a, 85 XP, five-quest unlock. Three Medkits (36g), three Potions (18g) and six restored Armor (12g) leave 24g. Unlock/cast Reanimation (150a) still requires saving across several successful Arcana routes.

XP requirements to the next level are **15 / 70 / 150**, cap 4. Level 2 can arrive after one early Hunt or three safe errands. Higher levels require multiple contracts. Arcana and Gold are purposefully not proportional on every route. Workshop/Study opportunity cost and free Rest also matter. These budgets are examples, not proof of balance.

## Reproducible encounter sample

`node scripts/playtest_balance_audit.js` runs 100 deterministic trip IDs for each of six routes at levels 1, 2 and 4 (1,800 fresh expeditions). Each starts healthy, with full class defenses, no purchased gear, no jobs or consumables; class composition is the authored Ada/Bram/Cora trio. Black Gate unlock is supplied by the harness. Results: `tests/playtest-balance-results.json`. Negative “HP lost” can reflect legitimate level-up HP gains; this is not a pure damage metric.

The first sample with the old four-member Gate finale gave level-1 victory 32% and 2.58 Wounded per trip; level-2 victory 89% and 1.40 Wounded. Removing one supporting cultist, retaining the enchanter and unchanged demon, improved level-1 victory to 99% and 0.97 Wounded, and level-2 to 100% and 0.50 Wounded. The approved class baselines were not changed. Bosses still threaten already-Wounded/underprepared parties; those death rules have separate regression tests. Longer Hunts have up to two independently seeded 65% small encounters (one at 10 minutes), at 28%/44% of the existing clock; each has one enemy with 1 HP, 0 Armor, 1 damage and no disabling special. The finale resolves at 58%, return narration queues at 78%, arrival remains exactly 100%. Safe optional journeys retain the old 25%/50%/75% chance bands.

| Level | Route | Victory % | Wounded/trip | Deaths/trip | Battles/trip | Mean Gold | Mean Arcana |
|---:|---|---:|---:|---:|---:|---:|---:|
| 1 | gather_medicinal_herbs | 100 | 0.00 | 0.00 | 0.00 | 5.99 | 0.27 |
| 1 | collect_grave_moss | 100 | 0.02 | 0.00 | 0.26 | 2.80 | 3.57 |
| 1 | goblin_tracks | 100 | 0.00 | 0.00 | 1.00 | 19.06 | 2.21 |
| 1 | abandoned_shrine | 100 | 0.00 | 0.00 | 1.56 | 31.24 | 4.30 |
| 1 | sunken_crypt | 88 | 1.73 | 0.00 | 2.40 | 58.27 | 10.92 |
| 1 | black_gate | 99 | 0.97 | 0.00 | 2.28 | 89.92 | 19.95 |
| 2 | gather_medicinal_herbs | 100 | 0.00 | 0.00 | 0.00 | 5.99 | 0.27 |
| 2 | collect_grave_moss | 100 | 0.00 | 0.00 | 0.26 | 2.80 | 3.57 |
| 2 | goblin_tracks | 100 | 0.00 | 0.00 | 1.00 | 19.06 | 2.21 |
| 2 | abandoned_shrine | 100 | 0.00 | 0.00 | 1.56 | 31.24 | 4.30 |
| 2 | sunken_crypt | 100 | 0.92 | 0.00 | 2.40 | 66.07 | 12.36 |
| 2 | black_gate | 100 | 0.50 | 0.00 | 2.28 | 90.82 | 20.15 |
| 4 | gather_medicinal_herbs | 100 | 0.00 | 0.00 | 0.00 | 5.99 | 0.27 |
| 4 | collect_grave_moss | 100 | 0.00 | 0.00 | 0.26 | 2.80 | 3.57 |
| 4 | goblin_tracks | 100 | 0.00 | 0.00 | 1.00 | 19.06 | 2.21 |
| 4 | abandoned_shrine | 100 | 0.00 | 0.00 | 1.56 | 31.24 | 4.30 |
| 4 | sunken_crypt | 100 | 0.70 | 0.00 | 2.40 | 66.07 | 12.36 |
| 4 | black_gate | 100 | 0.20 | 0.00 | 2.28 | 90.82 | 20.15 |

This measures the fixed starter composition, not all 20 class trios, wounded departures, all gear builds or a long campaign. Native playtesting and further balance feedback remain necessary.

## Graphics inventory and routing

No art was generated, replaced or deleted. Credits and exact prompts remain in `docs/Visual_Battle_Art_Prompts.md`, `docs/Cozy_Fantasy_Visual_System.md`, and `context/Monster_Portrait_Asset.md`. All custom assets were already wired; this sprint retained their ordinary routes, corrected item icon selection, and made every shop/equipment/reward item use its data icon or safe fallback. The updated Chromium routes inspect ordinary departure, camp, recruitment, character, shop and results; the battle regression covers every supported atlas family, animation beat, corrupt art and failed sheets.

| Asset/group | Runtime screen/event | Status / rationale |
|---|---|---|
| `BattleWoodland_v1.webp` | Early forest-road travel; woodland Hunt battlefield | Active cached parallax/background |
| `BattleCavern_v1.webp` | Cemetery/crypt/cavern travel and battles | Active; matched by contract biome metadata |
| `BattleCreatures_v1.webp` | Eight creature families, skirmishes/Hunts/bosses, reanimated silhouettes | Active; alpha bounds and optional bitmap fallbacks retained |
| `CozyGuildCamp.webp` | Camp, page backdrops, secondary illustrations | Active; campsite walkers/job props retained |
| `Actor1_1`–`Actor3_8` pictures | Full-body side-view party actors from Actor1–3 portrait index | Active dynamic lookup; each depends on recruited portraits |
| Actor1–3 face/character sheets | Camp walking, departure/return walking, roster/Tavern/member/results portraits | Active, seeded/authored recruitment reaches all three sheets |
| `RPGManagerMonsters` faces | Legacy monster portraits and reanimation | Compatibility path; atlas preferred in illustrated fights |
| `IconSet.webp` | Every item list/detail/reward plus other MZ UI icons | Active; armor/helmet/shield/amulet now match their item roles; Medkit uses a cross icon |
| Other stock battlers, pictures, characters, tiles and effects | Bundled RPG Maker stock / retained historical scene fallbacks | Intentionally not forced into management screens; sci-fi/unused scenery does not fit this sprint |

The exhaustive CSV below classifies every image file, including stock assets. Dynamic portrait/side-view lookups are intentional, not dead references. Unselected character portraits remain reachable through recruitment. Creature-family reachability is qualified below. No duplicated fallback is drawn over loaded art.

Inventory: `docs/October15_Asset_Inventory.csv`.

**Intentionally unused atlas cell:** the Mimic is supported by legacy encounter data and renderer coverage, but none of the current 18 authored contracts selects it during ordinary play. Its existing atlas cell is retained for compatibility; this sprint does not invent a new quest or force an unrelated ambush merely to display it. The other seven creature families have ordinary current-contract routes. Stock monster full-body pictures remain superseded by the custom creature atlas.
