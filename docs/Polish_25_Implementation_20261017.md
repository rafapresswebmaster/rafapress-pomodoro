# Pomodoro Chronicles: 25-item polish and balance sprint

October 17, 2026. Save schema 28. Current implementation and acceptance record; see the comprehensive handoff for the complete game. No personal saves were read or written. Quest durations and free entry remain intact.

## Delivered changes

| Request | Current behavior |
| --- | --- |
| 1. Grounded victory | Standing combat frame, fixed standing pattern, zero vertical displacement; gentle rotation moves the figure and wooden base together. No airborne celebration frames. |
| 2. Finish and camp continuity | Large centered 320x100 logical-pixel Finish button. Dismissal hides the recap in the existing home scene and preserves the campsite/window objects and loaded art. Quest Board is immediately re-enabled. |
| 3. Scrolling lists | Generic command lists retain their full list and use normal MZ vertical scrolling. Up/down buttons appear only for overflowing lists, centered on top/bottom borders clear of text. Each direction hides at its endpoint; switching to a short list removes both immediately. Buttons scroll by a row; wheel/keyboard remain supported. Quest/shop/altar/roster and save/load no longer insert next-page entries. Narrative recap details are still a journal, not an item catalogue. |
| 4. Consistent Ward | Class plus equipment Ward share innateWardMax and current innateWard. Exactly +2 before each encounter, capped at maximum; prepareTeam does not add another recovery. Battle maxWard uses maximum rather than current Ward. Example 2/6 -> 4/6 -> 6/6. Extra class-generated temporary Ward and shared full-hit ritual wards retain their own specified behavior. |
| 5. Class balance | Rogue base HP 4 to 5 and crit 20 to 25%; Ranger crit 15 to 20%; Knight level-2 Armor gain 2 to 1; Barbarian level-2 HP gain 2 to 1; Mage crit 20 to 15%. Cleric retains 2 innate Ward after duplicate-party testing. Barbarian special loses its unconditional extra +1 damage, retaining normal special damage, second-target Cleave, Fury and Resolve. Distinct class roles remain; see the class audit and limitations below. |
| 6. Quest illustration | Contract detail displays a main-enemy portrait, prioritizing boss/high-HP objective enemies. Peaceful/no-enemy contracts display their main reward icon. Text reserves space around the portrait. |
| 7. Start Quest | List activation only selects/previews. A dedicated Start Quest button opens confirmation. Cancel starts nothing; only the confirmed action dispatches. |
| 8. Large creatures | Giants, Owlbears, Ogres, Trolls, Minotaurs, Treants, Wyrmlings and bosses scale above ordinary creatures, constrained by available scene height. |
| 9. Enemy balance/XP | Owlbear and Troll burst is 2 rather than 3 for Owlbear; Troll retains its existing 2. Every enemy has an explicit positive xpReward based on authored durability/offense and boss status. Bosses grant substantially more than weak creatures. Runtime skirmish caps remain. |
| 10. XP per kill | Each authoritative enemy defeat grants XP, including reinforcement waves and enemies killed in a fight eventually lost/drawn. Participating non-skeleton adventurers gain it in addition to completion XP. It is retained on recall; terminal-stage guards prevent playback/reload duplication. Defeat events carry XP through wave ID changes. Skeletons remain unable to gain levels. |
| 11. Weak enemy packs | Above recommended level 1, singleton Goblin/Kobold/Ratman encounters expand to three of that type, including dynamically constructed wave encounters. Level-1 quests may retain solo weak creatures. |
| 12. Expensive rituals | Costs increased about 4-5 times, except fixed Greed at 100. Complete table below. Unlock quests remain mandatory and free to enter. |
| 13. Scenic environments | Four new illustrated Woodland/Coast/Crypt/Mountain scenes replace simple floor-only settings. Fifteen fantasy quests receive individually named/cropped thematic variants. Original assets remain for provenance. |
| 14. Dangerous quest warning | Before confirmation, a read-only seeded 24-sample objective-fight estimate and recommended-level comparison flag outmatched parties. All-sample wipes show a stronger dangerous warning; language does not reveal or promise definitive death. All quests still require explicit confirmation. This is not a mathematically certain full-expedition forecast. |
| 15. Name | Camp/expedition header now reads Pomodoro Chronicles. Resource pills sit below the title during expeditions. |
| 16. XP curve | Per-level costs 40, 120, 240, 400, 600, 850, 1150; 3,400 cumulative to L8 versus previous 5,110. First level now takes more than the previous 25 XP, later increments are gentler, and enemy XP makes active combat contribute. Existing XP is preserved; ordinary return applies earned level-ups. |
| 17. Bases | Base width derives from the actual isolated silhouette bounds. Both outer silhouette edges, including feet, fit within the wooden platform; large creatures get broader bases rather than clipped feet. |
| 18. Broken gear recap | Main recap names broken items; Details lists every break record with character/item text. Gear losses also survive recall into its recap. |
| 19. Fortune | Only +25% settled coin reward, rounded down. No Ward requirement, sacrifice or first-battle recovery exception. |
| 20. Combat markers | Larger green vector sword for offense, red vector shield for the target. Canvas drawing guarantees color/shape regardless of emoji font. |
| 21. Resource pips | More than six HP/Armor/Ward pips use two smaller rows per stat band; maximum remains visible while current pips empty. |
| 22. Social-system removal | Personality, bonds, earned traits and badges removed from sheets and effects. Definitions/awards are empty; migration clears saved arrays/relationships, prepared legacy bond bonuses are removed, and decision/signature helpers ignore personality weights. Class passives, permanent wounds, leadership and ordinary career statistics remain. |
| 23. Enemy side | Latest follow-up correction: party members occupy the left and enemies the right. This supersedes the original item-23 direction. All fighters remain in the existing action area. |
| 24. Readability | MISS and resource-loss numbers increased to roughly 25-28 logical pixels; longer result text remains in the larger narration panel. |
| 25. Specials | Special attacks gain particle halos/trails, expanding rays, thicker slash arcs, glow, tinted impact flash and larger move names. Existing reduced-motion setting suppresses the extra motion/flash. No timing or damage comes from the visual layer. |

## Ritual activation costs

| Ritual | Arcana |
| --- | --- |
| Warding | 150 |
| Healing | 240 |
| Greed Prayer | 100 |
| Reanimate | 600 |
| Fortune's Favor | 180 |
| Battle Hymn | 300 |
| Veil of Mercy | 500 |
| Last Rites | 750 |
| Arcane Rebate | 150 |
| Oath of the Vanguard | 125 |
| Familiar's Vigil | 225 |
| First Strike | 150 |
| Quickening Prayer | 325 |
| Arcane Offering | 200 |

Rebate now costs a net 100 Arcana before ordinary quest rewards, while suppressing coins. This removes the previous profitable safe-minute loop. Offering needs 20 battle wins for its bonus alone to recover its cost. Fortune needs 720 base coins to add 180 coins; Arcana and coins are distinct currencies, so this is a nominal comparison, not equal utility. Costs are intentionally high per the request; their attractiveness requires continuing human playtesting.

## Balance evidence and acceptance

- `Handoff_Balance_Audit_20261017.json`: 5,400 baseline full quests plus 1,800 paired ritual sessions, all 75 quests, levels 1/3/5/8, three gear bands, two compositions, multiple seeds. Zero timer/extraction/campfire safety violations. This starts with fresh full pools and gifted equipment; it is not a long campaign or affordability model.
- `Polish_Class_Balance_20261017.json`: all 56 unordered three-class compositions, including duplicates/triples, four levels, five enemy profiles, 12 seeded battles each (13,440 battles). No gear/ritual, fresh pools. Party order permutations, campaign attrition and player behavior are not exhaustive. Marginal class rates reflect teammates; no claim of universal perfect balance is made.
- `Polish_Class_Balance_20261017_before_ability_tuning.json`: narrower 20-distinct-composition diagnostic before removal of Barbarian's extra special damage. Compare matching compositions/scenarios, not unmatched aggregate denominators.
- Focused automated acceptance: 57 tests pass across new polish, altar, fantasy, death, background clock and battle-stage suites.
- `tests/polish25-browser.json` and `tests/visuals/polish25-*`: browser acceptance at 816x624 and 1280x720, selection versus Start/confirmation, danger warning, arrows, same-object Finish continuity, re-enabled Quest Board, detailed scenery, large enemies/specials and grounded victory. Combat screenshots use controlled saved-event projections; they are visual fixtures, not extra balance trials.
- Historical full-suite inventory is retained separately. It contains obsolete assertions for removed social systems, prior XP rates, stances, rosters and older art layouts, plus unresolved pre-existing modern-looking failures. Do not restore obsolete mechanics simply to make them pass.

New tests cover the exact equipment-derived 6-Ward example, no prepareTeam recovery, social-state migration, grouped weak enemies, differentiated XP, once-only XP retained on recall, new XP curve, fixed Greed/Fortune, left-side/enlarged enemies, and deterministic non-mutating danger assessment. Existing altar tests were updated only for the explicitly removed Fortune penalty; fantasy grouping assertions allow the new packs.

## Asset provenance and reproduction

Used the [imagegen skill](C:/Users/rafae/.codex/skills/.system/imagegen/SKILL.md), built-in image generation, not the API/CLI fallback. Final game assets: `img/pictures/QuestWoodland_v8.webp`, `QuestCoast_v8.webp`, `QuestCrypt_v8.webp`, `QuestMountain_v8.webp`, and `Quest_fantasy_01_v8.webp` through `Quest_fantasy_15_v8.webp`. Lossless panel extraction and deterministic cropped variants prepare the generated atlas for existing background loading. No external saved path is referenced by the game.

Final prompt: "Create a production game background atlas, 1536x1024 landscape, arranged as exactly 2 columns by 2 rows of equal rectangular scenic panels with NO borders NO text NO labels. Cozy richly illustrated painterly medieval fantasy miniature tabletop RPG environment, warm natural light, detailed distant scenery, clear midground and foreground path for character overlays. Top left: ancient overgrown woodland road with twisted trees, distant ruined watchtower, ferns and mossy stones. Top right: coastal pirate cove with stranded ship, cliffside fort, ropes, barrels and beach walkway. Bottom left: haunted gothic crypt with vault arches, candle niches, spectral blue light, sarcophagi and broken flagstones. Bottom right: dragon mountain mining pass with dwarven machinery, distant lava-lit cavern and giant stone arches. Each panel a complete horizontal 3:2 scenic composition viewed at low oblique game camera, horizon in upper third, open walking lane lower half, detailed atmospheric scenery above and around lane, not a flat floor panel, no people no creatures no UI."

Reproduce domain checks with Node's built-in test runner (`--test --test-isolation=none`), balance sweeps with `scripts/handoff_balance_audit.js` and `scripts/polish_class_audit.js`, browser acceptance with `tests/polish25_smoke.py`, then regenerate the handoff with `scripts/build_current_handoff.js` and package using `scripts/package_handoff_review.py`. Native audio/controllers, multi-monitor NW.js behavior and long campaign pacing remain manual acceptance areas.

## Follow-up: battlefield sides and scroll controls

Restored party-left/enemies-right placement. Scroll arrows now appear only for lists that actually overflow, sit centered on the top/bottom window borders without covering rows, hide individually at their scroll endpoint, and refresh immediately when a category changes. Native non-clickable scroll indicators are suppressed for these windows to avoid duplicates. Verified with the polish/battle-stage tests and the updated two-viewport browser checks (including long-list to Supplies switching). No combat statistics, rewards or timer rules changed in this follow-up; the balance sweeps remain applicable.
