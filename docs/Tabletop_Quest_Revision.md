# Tabletop quest revision — October 16, 2026

Implemented the 22 requested gameplay/UI changes in RPGManager, Progression, Battle, BattleStage and the quest catalogues.

- Travel field notes and automatic discoveries display for ten seconds, independently of the previous battle's playback scaling.
- Confirmed first recall stops encounters immediately and walks the party home while the original timer runs. The second click (Arrive now) settles immediately. Current HP, casualties and previous finds persist; completion rewards are forfeited.
- Small encounters retain at least 1 HP and 2 combined HP/Armor/Ward. Magical enemies receive Ward.
- Travel uses the original v4 standing designs with paper wobble; a shared wooden base renders under travel and combat pieces, across their poses. The right-hand companion faces left during expedition camping. Camp HUD fire animates.
- Added Hobgoblin, Wraith, Harpy, Troll and Imp plus five twenty-minute objective quests in less represented categories. Existing Ogre remains intact.
- Added twenty equipment items. The full shop has unique slot/class/stat profiles, including secondary bonuses that distinguish older duplicate gear. HP, Ward, Dodge and Critical bonuses apply from equipped gear and survive reload; equipment selection shows bonuses beside names.
- Physical classes double Workshop coin; Mage, Cleric and Knight double Study Arcana.
- Enemy signatures, active class refinements, Cleric healing and Ward Spark are limited to once per fight. Triggered Interpose, Venom, Mark, Focus and Arcane Echo also have single-use guards.
- Between fights, innate Ward restores at most two points per companion. Returning to camp fully restores it.
- Higher difficulty quests include two-wave battles; encounters with more than three enemies split into waves. Waves preserve player HP, defenses and spent ability flags; playback replaces the enemy roster atomically.
- Quest coin and Arcana rewards exceed maximum three-person camp production per minute. XP thresholds are approximately 17% lower; reanimated companions receive no XP and cannot level up.
- Speed has explicit class baselines and gains one point every two levels. Enemies retain authored speed, gain level-based speed and include fast Harpy, Imp, Wraith and Jester types. Speed is shown in character information.
- Four/five-star quests have one deterministic 1% trip roll for a lone Masked Jester. Victory immediately banks 250 coin, 180 Arcana and 100 XP per eligible member; rewards remain after recall. The boss has a distinct mask/cap overlay.
- Shop selection polls actual pointer coordinates, updates descriptions on hover, and confirms each shop purchase.

Validation: 59 focused Node regression checks pass, covering inventory/save persistence, mission background time, recall, waves, stats, income, field-note duration, Jester probability/rewards and undead XP. Browser smoke checks cover camp rendering, real pointer hover, purchase confirmation, combat and recall. JavaScript syntax checks pass. A 100-run simulation of the five new quests at their recommended levels with strong shop equipment completed successfully; this is a smoke balance check, not a guarantee for every party composition.

Run:

    node --test --test-isolation=none tests/tabletop_revision.test.js tests/quest_followup.test.js tests/item_persistence.test.js tests/mission_background_clock.test.js
    python tests/tabletop_smoke.py

Screenshots: tests/visuals/tabletop-camp.webp, tabletop-shop-confirm.webp, tabletop-combat.webp and tabletop-recall.webp.
