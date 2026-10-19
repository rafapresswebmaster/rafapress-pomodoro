# Quest attrition, walking and character-sheet follow-up

Implemented October 16, 2026. Save schema **27**. The user's seven new playtest notes define this follow-up. Previous brief/report instructions remain historical context. Development tests did not edit native saves.

| Request | Delivered behavior |
|---|---|
| 1 | Adventurers incapacitated or killed during a quest disappear from combat and travel, including their HUD, and remain absent until the quest ends. Casualty flags survive save/load and exclude them from later encounter rosters. Existing permanent wounds on a character who departs able to fight do not hide that character. |
| 2 | Expedition HP, worn Armor, innate Ward and temporary Ward carry between fights. Removed Ward refills from battle settlement. Travel reads authoritative expedition snapshots, avoiding the wounded survivor's camp HP and stale full equipment condition. Healing abilities inside a battle still work; camp recovery and return Armor restoration remain camp mechanics. |
| 3 | Removed the top enemy status strip. Each living enemy's name, HP, Armor and Ward now appears directly below its own sprite using the same counters as allies. Layout reserves name/counter space and supports up to five enemies. |
| 4 | Added class-specific opposing contact artwork for 96 identities. Walking uses A/passing/B/passing at a steadier cadence with reduced bobbing, aligned heads and a shared ground baseline. The shared Camp/travel renderer exchanges near/far leg positions on the opposite contact around a measured hip anchor while keeping head/weapon/arm artwork facing forward. Cached anchors avoid per-frame pixel reads. |
| 5 | Increased encounters for every combat quest of at least ten minutes. Random encounter spacing is 100/92.5/85/77.5/70 seconds for skulls 1–5, versus 150/135/120/105/90 previously. Ten-second approach warnings, bounded battle playback, peaceful campfire and twelve-second final extraction remain reserved. A warning starts only if its own ten seconds plus the complete battle/extraction budget fit. Existing saved encounter plans are retained; new departures use the denser schedule. |
| 6 | Removed “Roster & careers” from the Camp roster and character sheet. Overview now contains career counts, kills, damage, healing, signatures, injuries, badges, recent adventure, earned traits, bonds, personality, leadership, signature, equipment summary, XP and wound effects. The detail area scrolls inside the fixed sheet; the footer explains how to reach career details. |
| 7 | Post-creation identity labels show class alone. Removed Type A/B from travel/result displays and Tavern full-party/replacement cards. Appearance selection labels remain in the character creator. |

## Evidence

- **475 passing Node tests**, zero failures, including 31 focused follow-up checks. `tests/quest-followup-regressions.json` / `.txt`.
- Browser workflows pass at **816×624 and 1280×720**, zero JavaScript errors. `tests/quest-followup-browser.json`; screenshots `tests/visuals/quest-followup-*` include under-sprite enemy counters, hidden casualties and scrolled Overview career information.
- **7,380** complete expedition simulations; **49,720 battles**, versus 40,615 previously (about 22.4% more). **Zero safety violations**. `tests/quest-followup-audit.json` / `.txt`. Attrition changes intended difficulty; this audit checks safety invariants rather than promising unchanged win rates.
- **96 complete opposing-contact silhouettes** checked directly against their source pixels, zero source-border clips. `tests/quest-followup-art.json`.
- Existing art checks pass: **6,060 padded frames**, 96 unique identities, three walking poses each; all 113 prior source-level silhouette checks also pass.
- Content validation passes: 41 contracts, 840 unique notes, valid backgrounds. Plugin syntax checks pass.

Review the [interactive walking cycles](Walking_Cycle_Review.html), [enemy HUD screenshot](../tests/visuals/quest-followup-816-enemy-icons-and-skeleton.webp), [Overview career screenshot](../tests/visuals/quest-followup-816-overview-career.webp), and [hidden-casualty travel screenshot](../tests/visuals/quest-followup-816-casualty-hidden-travel.webp).

## Reproduction

```
python scripts/run_quest_followup_regressions.py
node scripts/quest_followup_audit.js
python tests/quest_followup_smoke.py
python tests/quest_followup_walking_smoke.py
python tests/quest_followup_art.py
python tests/art_clipping_validation.py
python scripts/validate_playtest20_art.py
```

`Quest_Followup_Encounter_Counts.json` lists before/after schedules for every affected contract. Battle projection remains separate from authoritative outcomes and timing. Native saves remain untouched; browser tests use an isolated HTTP origin. Restart the game to discard cached textures and load the rebuilt walking assets.

## Assets and recovery

Class-specific opposite-contact sources are in `img/quest-followup-source`. `provenance.json` maps each selected source to its generated filename. Existing artwork and prior source images remain available. `scripts/pack_playtest_art.py` rebuilds atlases through `scripts/art_silhouettes.py`; complete source silhouettes are extracted before scaling/packing, and measured head anchors reduce frame drift. Pre-change plugins and packing code are in `backups/quest-followup-7`.

Artwork was produced using the built-in imagegen tool and imagegen skill. All selected sources were visually inspected before use. Generation direction: sixteen exact class identities in a spacious 4×4 transparent sheet, eight masculine variants then eight feminine variants, matching the established reference identities and class equipment, LEFT-facing head, opposing near/far leg and arm contact, complete weapons and clear gutters. Rogue/Mage outputs were regenerated using class-only references to prevent class substitution; rejected mixed-class outputs were not installed. Runtime leg exchange makes the opposite foot contact explicit without mirroring the head or weapon.
