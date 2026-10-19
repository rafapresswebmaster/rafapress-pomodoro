# Current handoff: seven-note quest follow-up

Latest implementation: schema27; casualties invisible until return; no between-fight HP/Armor/Ward refills; enemy HUD under sprites; denser encounters on all combat quests >=10 minutes with strict end buffers; 96 opposing walking contacts with shared leg animation; career details in Overview; appearance type labels limited to creation.

Read `../docs/Quest_Followup_7.md`. Evidence: 475 regression tests, both game window sizes, 7,380 simulated expeditions / 49,720 battles with zero safety violations, 96 new source silhouettes plus existing art validation. Review `../docs/Walking_Cycle_Review.html`. Native saves untouched. Existing saved encounter plans remain stable; new departures receive denser schedules. Reproduction commands, assets and changed-file manifest are linked from the report.

## Previous handoff (history)

# Current handoff: playtest follow-up

Latest correction: [cleric clipping follow-up](../docs/Cleric_Clipping_Fix.md). Repacked complete silhouettes and repaired overlapping cleric stride artwork; 113 source-level silhouette checks now supplement the frame-padding validation.


The twenty playtest notes are implemented. Schema26; 41 quests / 840 narrative notes; v5 cleaned art for 96 identities; genuine side-walk strides; native fallen poses; six class skeletons. Original class mechanics survive Zombie resurrection. Replaced members are deleted and all gear returned. Camp timer stops at quest departure. Random battles hold a ten-second approach warning. Tavern/resurrection replacements commit only after final confirmation. Healing removes a random actual wound.

Read `../docs/Playtest_20_Implementation.md` for the twenty-item delivery table, evidence, artifact locations and remaining native-runtime verification limits. Current validation: 444 regression tests, two browser resolutions, 7,380 simulated expeditions, 6,060 padded art frames. Save files were untouched.

Implementation: `js/plugins/RPGManager.js`, `RPGManagerProgression.js`, `RPGManagerBattleStage.js`; catalogue `data/RPGManagerArtV5.json`. Reproduction scripts and new focused/browser tests are linked from the report. Prior baseline is in `../backups/playtest-notes-20`.

## Previous sprint context (historical)

# Teamfight Manager — Current Project Handoff

Updated October 16, 2026. Save schema **25**. Current report: `docs/Strict_Focus_Progression_Sprint.md`. Previous review: `docs/Playtest_Review_Fixes_20261016.md`. Source rollback baseline: `backups/next-sprint-source/`. User saves untouched; old art retained.

Plain JavaScript, RPG Maker MZ 1.10 / PixiJS 5.3 / NW.js. Plugin order Battle → Progression → BattleStage → Manager. Manager owns time, consequences and exactly-once settlement. Battle computes pure seeded outcomes; BattleStage projects saved events. Existing background/unfocused focus clock, travel camera, camp jobs and opt-in floating companion remain.

The chosen duration is strict. Wipes apply knockout fate and stop expedition encounters immediately but leave the focus view and clock running to zero. Recall is visibly beside the clock, opens a separate confirmation with Keep Session Running selected, supports cancel/Escape, resolves saved combat projection and settles once. It preserves prior finds/consequences and forfeits completion XP/rewards. No combat animation remains queued past the focus deadline; the full combat log is retained.

Battles require 60 seconds for bounded playback plus 12 seconds for extraction. Playback scales toward 55 seconds; a hard 60-second deterministic fallback applies remaining saved events/final fighter state. Simulation explicitly draws at 180 actions. Extraction narrates and turns left without changing party order. One-minute quests are combatless, one skull, 3 Gold / 3 XP each, at most 2 travel Gold and no completion item/Arcana lottery. Longer combat routes use paced skull-adjusted road skirmishes plus objective combat; optional quiet routes can complete without a random fight. At 15+ minutes, the midpoint includes a peaceful 60-second campfire with frozen walking, gathered companions, ambient fire and four quiet interactions. The clock never pauses or extends.

31 contracts, 640 notes. Quest filters, badges, embark and recap use 1–5 skulls; legacy difficulty strings remain internal. Not every duration has every rating; all one-minute contracts have one skull. Shop replaces Armory throughout and offers Head, Body, Off-hand, Accessory, Supplies and Repairs pages. Gear Broken: a 6% roll on the first positive-to-zero Armor crossing, at most once per member per expedition. One equipped armor item then contributes zero Armor until repaired, without deletion. Broken flags persist through return, stock transfer, equip/sell and save/load. Repair equipped broken gear for 35% of purchase price rounded up. Broken shared gear can be equipped and repaired or sold/replaced.

Level cap **8**; next-level XP **30/150/360/650/1050/1600/2300**, 6,240 cumulative to cap. Existing small class-stat growth ends at L4; L5–8 refine powers without base HP/attack/defense inflation. Removed legacy per-level +2 Attack/+1 Defense. First signature at L3, second at L6. Six tracks include Barbarian Fury/Cleave/Quake, Knight Guard/Shield Bash/Interpose/Rallying Guard, Cleric heal-or-Ward/ Blessing/Renewal/Sanctuary, Rogue Feint/Venom/Smoke, Ranger Pinning/Mark/Volley, Mage Focus/Fireburst/Ward Spark/Frost Ring. Capstones are bounded and cannot chain. Acquired powers and triggers/cooldowns appear in Camp → Powers and Full Sheet → Acquired powers. Ordinary target distribution remains; Cleric prioritizes support and never resurrects.

Wounds show readable titles and exact shared effects: -2 percentage points Dodge and initiative ×0.97 per survived knockout, not extra stacks per title. Permanent scar removal does not remove lasting stacks. Camp Care pages individual wounds; Full Sheet has Wounds and effects; recap uses the same text. No unsupported flavor penalties were added.

**96 portrait choices: eight per six classes / two types.** Inventory: six 1152×288 portrait atlases, twelve 768×512 walking sheets (96 actor cells), 96 independent 576×384 combat sheets. Four generated catalogues supply front/profile/rear/action views. Full-body models are never face crops. Stable default/v2 keys remain; new choices use v4 keys. Active/history/replay references refresh through migration. Reanimated monster art is unchanged. Map `data/RPGManagerArtV4.json`; review `docs/Next_Sprint_Art_Contact.webp`; exact prompts/provenance `docs/Next_Sprint_Art_Provenance.json`; retained sources `img/sprint-source/`. Animation uses compact shared key poses plus bobbing, not 54 independently drawn poses per actor. All 96 identity cells, asset paths, RGBA modes, transparency and MZ geometries validate.

Camp opens campsite left / available roster right without reopening a remembered sheet. Enemy HP/Armor/Ward use a shared compact strip above the clipped action lane, preventing enemy-sprite obstruction. Battle preserves canonical input order instead of sorting front-line characters first; travel, battle, return and saved projections derive from the same order.

Verification: **390 current regression tests passed**; catalogue/content/art validators and changed-plugin syntax checks pass. Final audit: **5,580 seeded fresh expeditions**, **27,682 battles**, all 31 contracts, levels 1/4/8, two compositions, ten seeds, no/ordinary/strong gear. Ordinary means least expensive compatible Head/Body; strong means highest-price compatible gear in each supported slot. No timer-safety violations. Full clear/casualty/wound/break/reward tables and encounter ranges: `tests/strict-focus-audit.json`, `tests/strict-focus-plans.json`, current report. Initial over-severe tuning is retained separately. Five skulls remain deliberately punishing, while one-skull routes are dependable in the sample.

Longest uncompressed sampled presentation: **213.832 seconds**, plus separately reserved extraction. This includes result/fate/break captions and motivates compressed playback with a hard deadline, especially for three-minute sessions. Exact percentiles, worst seed and margin calculation are in the report. This is an instrumented schedule bound, not a native stopwatch/physical-monitor claim.

Isolated browser acceptance passes at **816×624 and 1280×720**, covering guided eight-choice creation, camp tabs, Shop/service pages, skull filters, compact confirmation, Recall cancel/confirm, actual combat stage and campfire. Evidence `tests/strict-focus-browser.json`, `tests/visuals/strict-*.webp`. Keyboard paths and MZ controller mappings checked; physical controllers, native monitor/audio and extended soaks remain unperformed. Isolated browser storage never writes user NW.js saves.

Reproduce: `python scripts/run_sprint_regressions.py`; `node scripts/strict_focus_audit.js`; `node scripts/strict_focus_plans.js`; `python scripts/validate_sprint_art.py`; `python scripts/validate_sprint2_content.py`; `python scripts/sync_adventurer_catalogue.py --check`; `python tests/strict_focus_smoke.py`. Remaining risks: limited-key-pose generated animation, minor possible differences across generated views, sampled balance and unperformed hardware/native/soak gates. Restore the baseline plugins/data to roll back; never restore or delete user saves.
