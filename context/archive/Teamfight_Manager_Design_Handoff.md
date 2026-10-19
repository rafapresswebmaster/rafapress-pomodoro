# RPG Manager / Teamfight Manager Demo — Design Handoff

**Snapshot:** September 22, 2026. **Stage:** Day 5 implemented; final native RPG Maker MZ acceptance remains pending.

**Purpose:** A self-contained report to paste into ChatGPT for brainstorming the project's future. This document describes the implementation, user feedback, choices, evidence, and open questions. It is not authorization to implement another phase.

## Opening prompt for the next conversation

> Act as my game-design discussion partner. Read this report as the current state of my standalone RPG Manager prototype, inspired by Teamfight Manager. Help me explore what would make preparing a team, watching automatic combat, managing a roster, and handling the consequences enjoyable.
>
> Distinguish existing functionality, my explicit preferences, the implementing assistant's choices, and new proposals. Challenge weak assumptions and explain tradeoffs. Do not assume a feature exists because it appears in the original vision or has an evocative name. Do not interpret test passes or a positive reaction as proof that the game is fun or fully accepted.
>
> Preserve the manager-focused experience and simulation/presentation separation. Respect the corrections recorded below, particularly distributed targeting, staged menus, clear feedback, and recognizable characters. If you suggest revisiting a preference, acknowledge it and explain why.
>
> Start with the most consequential design questions. Ask a few focused questions and compare small experiments before proposing a large roadmap. Treat brainstorms as proposals, not commitments. The implementation was a five-day prototype; further scope needs my decision.

## Contents

1. Identity, intent, and evidence
2. Complete player loop
3. Starting content and full roster
4. Exact combat rules
5. Progression and consequences
6. Equipment, supplies, and economy
7. Presentation and narration
8. Persistence and architecture
9. Development history and user corrections
10. Verification and acceptance
11. Limitations and design implications
12. Questions and possible small experiments
13. Files, workflow, and handoff

## 1. Identity, intent, and evidence

### Core concept

A small standalone fantasy management game inspired by **Teamfight Manager**. The player should feel like a manager rather than a directly controlled fighter: choose a roster, prepare a three-person team, issue broad orders, watch automatic combat, understand its result, and handle persistent consequences.

This project is separate from **Pale Crossing**. Do not import that project's setting, mechanics, files, or assumptions.

The original vision includes roster building, training/preparation, composition, intentional-looking AI, readable outcomes, and consequences such as fatigue, injury, morale, and form. Some are aspirations, not current systems. Training activities, morale, changing form, retreats, protective AI, and behavioral personalities are not implemented.

The simulation uses ordinary deterministic game logic with seeded randomness, not machine learning. **Simulation decides combat; presentation displays the events.**

The original five-day guide asks whether choosing a roster team and strategy, watching automatic battle, and dealing with consequences is enjoyable. A working loop does not by itself answer that question.

### Sources and boundaries

This handoff draws on the current JavaScript plugins and JSON, project context, daily test guides, the eight-page daily user guide PDF, and the Day 4/5 conversation available to the implementing assistant. Current code was inspected for this report; tests were not rerun merely to write documentation.

Earlier Day 1–3 feedback is available primarily through project notes and test guides, not a complete verbatim conversation archive. Those requests are summarized as recorded, without inventing missing quotations. The PDF references `Teamfight_Manager_Demo_Codex_Implementation_Plan.md`; that brief was not among the context documents inspected, and its unprovided contents are not reconstructed here.

Keep these categories separate:

| Category | Meaning |
|---|---|
| Explicit user requirement | Requested in the available conversation or recorded as a user request in project notes |
| Implementation choice | Concrete rule or number chosen to implement a requested feature; open to reconsideration |
| Verified behavior | Supported by inspected code or recorded tests |
| Accepted playtest | Explicitly confirmed by the user; not inferred from automation |
| Design inference/proposal | Analysis or an idea for discussion, not an agreed feature |

## 2. Complete player loop

```text
Title: Continue / New Game / Load
  -> Home Base
     -> Roster / Select Team -> Confirm exactly three living NPCs
     -> Shop / Equipment / Supplies / Rest as needed
     -> Start Quest
        -> Preparation: review team, HP, stamina, injury, gear, rewards
        -> Depart OR Back to Home
        -> Depart reveals Aggressive / Defensive / Tactical
           -> highlight to read effects; choose to begin travel
        -> 120-second eventless travel OR Skip Travel (testing)
        -> Automatic 3-versus-3 battle
           -> optional strategy switching with shared cooldown
        -> Final animation -> result and persistent consequences
        -> View Battle Report -> Return to Home
     -> repeat, reopen latest report, or save
```

### Home and roster

Home shows living-roster count, gold, selected team, numeric HP, injuries, and stamina values/bars. Stamina status is Ready, Fatigued, or Rest required. Rest refreshes the display immediately.

Commands: View Roster, Select Team, Start Quest, Equipment, Supplies, Shop, Rest (+40 stamina), Graveyard, Last Quest Report, Save, Return to Title. Start Quest requires a valid team with enough stamina; Last Quest Report requires a completed quest.

Roster inspection shows name, role, level/XP, health, stamina, base stats, attacks, passive/rank, equipment, bonds, and condition. Team changes are a draft: a fourth member cannot be added, Confirm requires exactly three distinct living IDs, and Cancel/Esc preserves the previously confirmed team. “Living” means `alive === true` and `health > 0`. Stamina limits departure, not simply membership in a selected team.

Dead NPCs disappear from living roster/team choices and recipient menus, and appear in Graveyard with their death quest. Permanent death prunes the confirmed team. If fewer than three living NPCs remain, quests are disabled and Home explains how to load an earlier save or start a New Game. There is no recruitment or resurrection escape from that state.

### Preparation and strategy selection

The initial preparation choices are **only Depart and Back to Home**. Depart reveals the three strategies and hides those original controls. Highlighting a strategy previews its numerical effects and explanation; choosing it begins travel. Esc/right-click returns to Depart/Home without starting a quest. Tactical is the default selection; the previous battle's choice is not a persistent campaign setting.

This staged flow was an explicit user correction. The first Day 4 screen exposed strategy and departure controls simultaneously and had awkward focus switching.

Equipment, shopping, supplies, and Rest happen at Home. Preparation reviews condition and directs the player back when changes are needed; supplies are not usable during battle.

### Travel

The user requested an eventless countdown of one to three minutes and a testing skip. The implementation chose **120 seconds**.

Travel causes no encounters, resource changes, damage, or rewards. A prepared battle and quest transaction are created at departure, but the simulator takes no actions until arrival. Timer expiry and Skip use the same guarded arrival path, so repeated input cannot create multiple battles.

The countdown uses a `performance.now()` deadline, not rendered frame count. If updates pause while the application is unfocused, the countdown catches up when updates resume. The visible Skip Travel button remains in this development demo; its release-game status is undecided.

## 3. Starting content

Fresh campaign defaults:

- Ten living NPCs, level 1, full starting HP, 100 stamina.
- Zero XP, no injuries, no prior quests, no bonds or equipped items.
- No confirmed team.
- 100 gold, six Potions, three Medkits, zero spare blades/guards.
- One repeatable enemy trio: Slime, Skeleton, Goblin.

### Player roster

These are raw JSON/base stats, before passive, equipment, bond, injury, or fatigue modifiers.

| NPC | Role | HP | ATK | DEF | SPD |
|---|---|---:|---:|---:|---:|
| Ada | Vanguard | 140 | 14 | 16 | 8 |
| Bram | Bruiser | 125 | 19 | 11 | 10 |
| Cora | Ranger | 90 | 18 | 8 | 16 |
| Dax | Duelist | 100 | 17 | 10 | 18 |
| Elin | Support | 95 | 10 | 10 | 13 |
| Finn | Mage | 80 | 22 | 6 | 12 |
| Gwen | Guardian | 150 | 12 | 18 | 6 |
| Hale | Skirmisher | 105 | 16 | 9 | 17 |
| Iris | Mystic | 85 | 20 | 7 | 14 |
| Jory | Brawler | 115 | 18 | 12 | 11 |

### Named abilities and passive identity

All player passives start at rank 1. Their actual effect is adding the rank to the listed stat; descriptive flavor does not add separate AI behavior. Sheet indices are zero-based.

| NPC | Passive (stat) | Basic | Signature | Face/character sheet, index |
|---|---|---|---|---|
| Ada | Steadfast (defense) | Shield Strike | Ironwall Charge | Actor2, 1 |
| Bram | Tenacious (attack) | Heavy Swing | Earthbreaker | Actor1, 4 |
| Cora | Keen Eye (attack) | Quick Shot | Piercing Volley | Actor2, 5 |
| Dax | Lightfoot (speed) | Quick Cut | Flashing Lunge | Actor2, 6 |
| Elin | Calm Presence (defense) | Staff Tap | Dawn Pulse | Actor1, 7 |
| Finn | Focused (attack) | Spark | Storm Lance | Actor1, 5 |
| Gwen | Watchful (defense) | Mace Strike | Bastion Slam | Actor3, 7 |
| Hale | Opportunist (speed) | Spear Jab | Sweeping Rush | Actor2, 7 |
| Iris | Patient (attack) | Arcane Bolt | Moonfall | Actor3, 3 |
| Jory | Bold (attack) | Straight Punch | Thunder Fist | Actor1, 2 |

Passive flavor text (identity, not additional effects):

- **Ada ? Steadfast:** Holds her ground under pressure.
- **Bram ? Tenacious:** Keeps pushing through a tough fight.
- **Cora ? Keen Eye:** Looks for an opening before striking.
- **Dax ? Lightfoot:** Always stays light on his feet.
- **Elin ? Calm Presence:** Brings a steady voice to the team.
- **Finn ? Focused:** Tunes out distractions while preparing.
- **Gwen ? Watchful:** Keeps an eye on vulnerable allies.
- **Hale ? Opportunist:** Is quick to notice an exposed target.
- **Iris ? Patient:** Waits for the right moment to act.
- **Jory ? Bold:** Never hesitates to take the first step.

Elin's Support role does not currently grant healing. Gwen's Guardian role does not grant interception. Ranger/mage attacks are not mechanically ranged. Every fighter uses the same single-target attack framework; differences are stats, passive bonuses, names, and art.

### Enemy encounter

| Enemy | Role | HP | ATK | DEF | SPD | Basic | Signature |
|---|---|---:|---:|---:|---:|---|---|
| Slime | Ooze | 90 | 5 | 14 | 7 | Body Bump | Acid Splash |
| Skeleton | Undead Warrior | 85 | 6 | 10 | 10 | Rusty Slash | Bone Cleaver |
| Goblin | Raider | 75 | 5 | 8 | 15 | Dagger Stab | Sneaky Flurry |

Enemy passive metadata (currently descriptive, not prepared bonuses):

- **Slime ? Gelatinous (defense):** A soft body cushions incoming blows.
- **Skeleton ? Relentless (attack):** Old bones march forward without fear.
- **Goblin ? Cunning (speed):** Quick to exploit a wounded opponent.

Enemies use the same basic schema and attack framework, but have no persistent roster progression, rewards, equipment, injury, or bonds. They reset for each quest and do not scale with player level.

The enemy JSON contains passive names and stat fields, but enemies are passed directly to the simulator rather than through player `prepareTeam`. They do **not** receive the player's ranked passive-preparation bonuses. Goblin's flavor about exploiting wounded opponents does not override distributed targeting.

## 4. Exact combat rules

### Turn model

Combat is a seeded sequence of discrete actions with visual playback, not simultaneous real-time physics.

1. At the start of a round, collect all living fighters on both sides.
2. Sort by descending speed; seeded random tie-breakers resolve equal speed.
3. Each living fighter gets one action that round.
4. Fighters defeated before their queued turn lose that turn.
5. Each action automatically chooses target and Basic/Signature, resolves damage, emits events, and checks the outcome.

**Speed affects order, not attacks per round.** There are no hit/miss rolls, critical hits, mana, separate damage types, range checks, collision, movement cost, area attacks, or status-effect skills.

Eliminating all enemies gives victory; eliminating all player fighters gives defeat. The default **600-action limit** gives a draw if neither side is eliminated. Elimination takes precedence if it occurs on the limit action. After completion, `step()` returns an empty event list and changes nothing.

### Distributed targeting: deliberate correction

The initial simulator focused the opponent with the lowest remaining HP percentage. The user objected that both sides concentrated attacks on one lone rival. The replacement affects real simulation decisions on **both sides**, under **all strategies**:

1. Consider living opponents only.
2. Find the opponents with the fewest attacks received during this battle.
3. If equally eligible alternatives exist, exclude the last target attacked by this side.
4. Choose among remaining ties using seeded randomness.
5. Increment the chosen target's received-attack count.

Counts persist across rounds and strategy changes. They measure attacks, not total damage: a weak Basic and a strong Signature each count once. Exposure is balanced, but HP need not be. When only one opponent remains, it necessarily receives all attacks.

This is an explicit distribution policy, not emergent tactical intelligence. Reintroducing lowest-HP focus fire without discussing the user's preference would undo a deliberate correction.

### Basic and Signature

- Basic multiplier: **1.0**; Signature multiplier: **1.65**.
- Each fighter starts with Signature ready.
- Signature sets its personal cooldown to 3.
- Its next three personal turns use Basic and decrement 3 -> 2 -> 1 -> 0.
- Its following personal turn uses Signature again.
- Other fighters' actions do not reduce this personal cooldown.

All named Signatures share this multiplier and timing. They are not distinct skills with different effects, and the manager does not trigger them manually.

### Strategies

Strategies affect the player's whole team. Enemies have no independently switching strategy controller.

| Strategy | Player attack-power factor | Damage received by player | Current tradeoff |
|---|---:|---:|---|
| Aggressive | 1.25 | 1.15 | Hit harder, take more damage |
| Defensive | 0.85 | 0.75 | Hit less hard, take less damage |
| Tactical | 1.00 | 1.00 | Neutral baseline |

Strategies do not currently alter positioning, target distribution, Signature timing, or AI priorities. Tactical is neutral, not a separate intelligent decision system. The user requested the three named strategies and a global cooldown; the exact factors and six-action duration were implementation choices.

### Damage formula

```text
A = attacker's prepared attack
D = target's prepared defense
R = seeded random factor in [0.9, 1.1)
M = 1.0 Basic or 1.65 Signature
O = player strategy attack factor if attacker is player; otherwise 1
I = player strategy incoming factor if target is player; otherwise 1

rolled damage = max(1, round((A * R * M * O - D * 0.5) * I))
actual damage = min(target's remaining HP, rolled damage)
```

Attack-power modifiers apply before subtracting defense; incoming-damage modifiers apply afterward. “+25% attack power” therefore does not guarantee exactly +25% final damage. Minimum damage is 1 and overkill is capped. There are no healing attacks.

### Global strategy cooldown

- Initial choice has no switching cooldown.
- A successful midbattle change starts **six shared combat actions** of cooldown.
- Both teams' subsequent actions reduce it by one.
- It is not six seconds, six player turns, or six rounds.
- All alternate strategy buttons are locked during it.
- Selecting the active strategy does nothing and does not reset the timer.
- Invalid strategy names and terminal-battle changes are rejected by the simulator.
- A change affects future actions. An attack already being animated keeps its previously simulated damage.

Buttons show green Active, blue Ready, and amber Wait N Actions, alongside effect summaries. The header repeats the active strategy and cooldown. Preparation offers detailed explanations.

### Determinism

The simulator uses local Mulberry32 randomness and a 32-bit internal seed. Initiative ties, target ties, and damage rolls are seeded. Same starting combat inputs, seed, and strategy-switch schedule reproduce a fight.

A seed alone is not a replay after the roster changes. Calling `RPGManager.createBattle(lastSeed)` after progression would use the roster's new condition, not restore the old participants' exact input state.

## 5. Progression and consequences

### Preparing player combat stats

Selected NPCs are copied, then modified in this order:

1. Add passive trait rank to its configured stat.
2. Add equipment's +3 ATK or DEF.
3. Add +2 ATK if at least one living bonded teammate is in the selected team.
4. If injured, multiply ATK/DEF by 0.8 and floor; ATK stays at least 1, DEF at least 0.
5. If stamina <40, multiply ATK/SPD by 0.8 and floor; both stay at least 1.

Injury and fatigue can combine, with rounding at each stage. These affect combat copies, not base stats. Current persistent HP is carried into combat. None of these bonuses secretly heals.

### Quest settlement

Departure records participant IDs, injury status, and maximum HP. Completion validates the matching finished result and all three player records before persistent changes.

For each participant: copy final HP, subtract 20 stamina, award 60 XP, increment participation count, resolve death/injury/recovery, then process surviving NPCs' level-ups. Next, advance bonds among surviving participants, prune dead team members, close the quest, award gold, and store the report.

Settlement waits until the final battle animation finishes. A repeated completion call for the latest finished quest returns the stored report without repeating changes. Older or mismatched results cannot serve as new valid completions.

Participation applies on victory, defeat, and draw. XP/stamina bookkeeping also occurs for NPCs who then die; the death branch skips their subsequent level-up processing.

### XP, levels, traits

- **60 XP** per participant per completed quest.
- Next-level threshold: **current level × 100 XP**.
- Crossing it subtracts the threshold and preserves overflow.
- Each level grants **+10 max HP, +2 base ATK, +1 base DEF, +1 passive rank**.
- Level-ups do not heal current HP.
- Base speed does not increase directly; a speed passive's growing rank increases prepared speed.

Example: two quests give a surviving level-1 NPC 120 XP; it becomes level 2 with 20 XP toward the next 200-point threshold and passive rank 2.

### Stamina and Rest

Stamina starts at 100. Each completed quest costs its participants 20; bench members pay nothing. Everyone selected needs at least 20 to depart. At 20–39 an NPC can depart but takes the -20% ATK/SPD fatigue penalty; 40+ has no fatigue penalty.

Rest at Home gives every living NPC +40 stamina, capped at 100. It is free, repeatable, and has no simulated time cost. It does not heal HP, treat injury, or revive anyone.

**Design implication, not an agreed change:** free repeatable Rest makes stamina a recovery-click requirement more than a difficult allocation tradeoff.

### Injury and permanent death

The only injury is **Wounded**, persistent until treated.

| Completion condition | Persistent outcome |
|---|---|
| Knocked out, not injured at departure | Survives Wounded; recovers to `max(1, ceil(maxHealth × 0.25))` HP |
| Knocked out, already injured at departure | Permanent death |
| Survives at <=25% max HP, not previously injured | Becomes Wounded |
| Survives while injured | Stays injured until a Medkit treats it |

Injury/death is decided before that quest's level-up max-HP increase. A recovered NPC who immediately levels can therefore have less than 25% of its new maximum HP. Injury assessment is not rerun after leveling.

Death sets `alive` false, leaves HP at zero, records death quest, returns gear to stock, removes the NPC from the confirmed team, and excludes it from living-recipient lists. There is no random death roll, resurrection, recruitment, or automatic replacement.

Combat defeat is not automatically permanent death. A first party wipe can return three living wounded NPCs.

### Bonds

- Track progress per unordered pair of IDs.
- Each quest in which both return alive increments progress, capped at 2.
- At 2 the pair has the single implemented bond level.
- At departure, a living bonded teammate in the selected trio gives +2 prepared ATK.
- This applies once, even if both other teammates are bonded.
- A dead or benched partner gives no bonus; history can remain visible with fallen partners marked.

“Survive together” means survive persistent settlement: a first knockout that recovers Wounded still counts. Bond progress is not restricted to victories or to fighters who stayed conscious. No decay, relationship scenes, romance, rivalry, or further bond levels exist. Project notes record the user saying bonds can be refined later.

## 6. Equipment, supplies, economy

| Item / outcome | Cost or payout | Effect |
|---|---:|---|
| New campaign | +100 gold | Starting treasury |
| Victory | +60 gold | Once per completed quest |
| Draw | +20 gold | Once per completed quest |
| Defeat | +15 gold | Once per completed quest |
| Potion | 10 gold | Buy one Potion |
| Medkit | 25 gold | Buy one Medkit |
| Training Blade | 40 gold | Buy one +3 ATK equipment item |
| Leather Guard | 40 gold | Buy one +3 DEF equipment item |

These specific items/numbers were implementation choices under the Day 5 request for a minimal shop, equipment, and rewards. They are not evidence of approved long-term balance.

The shop replenishes unlimited units if the player can pay. Each input buys one. Unaffordable entries are grey and the rules also reject insufficient funds. Player stock is finite: buying adds a unit, using consumes it, equipping moves it. No selling, crafting, random drops, rarity, durability, changing prices, wages, or recurring upkeep exists.

### Equipment

Each living NPC gets **one slot**: blade, guard, or nothing. Bonuses modify battle copies before injury/fatigue penalties. They do not heal or stack multiple copies on one NPC.

Shared `equipmentStock` stores spare copies. Equip consumes a spare; swap returns the old item; Unequip returns it; death returns it. Normal quests and nonfatal knockouts do not destroy gear. Dead recipients, unavailable copies, same-item re-equips, and changes during active quests are rejected.

The Equipment screen is member-first: select a living NPC, then owned gear or Unequip. It shows equipped item and base stats. Roster and preparation also display gear.

### Supplies

Supply use is **item-first**, following user feedback: choose Potion/Medkit, then an eligible living recipient.

- Potion restores up to 50 HP, capped at max. Full-HP targets are invalid; injury is not treated.
- Medkit requires an injury, removes it, and restores up to 30 HP. It can treat an injured full-HP NPC.
- Neither revives. Invalid use spends nothing.
- Stock and eligibility refresh immediately. Back returns to item choice.
- Supplies are shared, not packed per participant; they are Home-only and cannot be used in combat.

A tested 12-quest campaign funded healing through rewards while using equipment and Rest. This establishes one workable path, not a complete economy study. Fixed rewards, non-scaling enemies, and free Rest permit farming; defeat also pays XP and gold. Whether those are desirable long term is unresolved.

## 7. Presentation and narration

### What is actually drawn

Earlier milestones used colored initials, then portraits. The first Day 4 battle presentation replaced them with crude geometric fighters; the user asked why the sprites had been lost. The revised build uses:

- Player sprites from bundled MZ character sheets matching portrait sheet/index, with walking frames during movement.
- Slime/Skeleton/Goblin portraits from the existing atlas as moving enemy stand-ins. These are not full-body animated monster sheets.
- Fixed names, numeric HP/bars, and Signature cooldown labels while artwork moves.
- Floating damage, hit flashes, dimmed DEFEATED states.
- White slash/flash for Basic; purple/gold burst for Signature.

Movement and return are driven by an already-resolved attack event. Distance, paths, overlap, and apparent range do not affect combat. Rangers currently approach under the same visual movement scheme as melee fighters.

### Event timing

The scene requests one simulation step and presents it over roughly 60 scene-update frames before requesting another. At around 60 updates/second that is about one second per action; it is not a guaranteed real-time schedule.

The visible hit/HP update happens at frame 20. Movement returns by around frame 44, effects clear near the end, and another action follows after the sequence. Final result narration waits for the last sequence to finish, followed by campaign settlement and the report button.

The simulator has already calculated an attack before the visible impact. This is why changing strategy during a lunge does not recalculate that hit.

### Logs and reports

The user requested narration and color rather than only robotic numbers. Logs now describe named fighters striking rivals or unleashing Signatures, while retaining exact damage/remaining HP.

| Color | Meaning |
|---|---|
| Blue | Player attacks |
| Coral | Enemy attacks |
| Purple | Signature details |
| Gold | Rounds and strategy orders |
| Red | Defeat notices |
| Green | Victory |

Narration is templated, not generated by a language model during play. The visible scrollbar has Up/Down buttons and a draggable proportional thumb; wheel and keyboard scrolling also work. Reading history does not stop combat or trap focus. Manually reviewing earlier entries avoids being constantly pulled to the latest line.

The campaign report is a separate **read-only**, scrollable text screen showing only the latest quest: outcome, reward, XP/stamina, individual conditions, level/trait changes, bonds, and deaths. It is not a selectable list of report lines. Completed battle -> View Battle Report -> Return Home. Home can reopen the same report without duplicating rewards.

## 8. Persistence and architecture

### Engine and structure

This is a **RPG Maker MZ** project with custom JavaScript plugins, JSON content, MZ scenes/windows, Bitmap/Sprite presentation, and bundled assets. It is not a generic web-app rewrite.

The manager uses custom scenes rather than default actor-party/equipment/battle menus. Managed NPCs are custom records, not the stock Actor database party. Editing MZ's standard actors, skills, or items does not automatically alter this simulator.

Required enabled plugin order:

1. `RPGManagerBattle`
2. `RPGManagerProgression`
3. `RPGManager`

| Component | Responsibility |
|---|---|
| `RPGManagerBattle.js` | Pure combat, seeded randomness, turns/targets, damage, strategies/cooldown, events/outcome |
| `RPGManagerProgression.js` | Pure campaign/economy rules, combat preparation, XP, conditions, bonds, death, inventory, migration defaults |
| `RPGManager.js` | MZ loading/integration, scenes/windows, input, travel, event display, report/title/save hooks |
| Roster/enemy JSON | Starting editable content |
| MZ Game_System save data | Persistent campaign |

Both rule modules run under Node without MZ or a browser. The UI does not invent damage or winners. Orders go through simulator validation; returned snapshots/events are copied so presentation cannot mutate combat through them.

Qualification: rules are independent of animation, but live battle **pacing** is driven by the scene asking for the next step after the previous animation. The layers have separate responsibilities; they are not two asynchronously running timelines.

### Campaign state

State lives at `$gameSystem._rpgManager`, currently schema version 5:

```text
version
roster[]: starting NPC fields plus
  xp, injury, quests, deathQuest, equipment, passiveTrait.rank
teamIds[]
gold
equipmentStock: { blade, guard }
supplies: { potion, medkit }
bonds: unordered-pair key -> progress 0..2
questCount
activeQuest: null or { id, team: [{ id, injury, maxHealth }] }
lastReport: null or { questId, outcome, rewardGold, lines[] }
recoveryNotice: optional interrupted-save message
```

New Game copies the roster template. Preparation copies/adjusts selected NPCs. The simulator copies those inputs again. Progression explicitly applies the finished result to the persistent roster. This avoids making an animation or debug snapshot authoritative campaign state.

### Battle interfaces

```text
new RPGManagerBattle.Battle(playerTeam, enemyTeam, { seed, maxActions, strategy })
battle.step()                 -> new events
battle.setStrategy(name)      -> accepted strategy event(s), or []
battle.snapshot()             -> copied status/round/actions/seed/strategy/cooldown/fighters
battle.events                 -> copied full event log
```

Event types: round, attack, defeat, result, strategy. Attack events identify actor/target keys, sides/names, attack kind/name, actual damage, target HP/max HP, personal cooldown, and selection reason.

The UI exposes `RPGManager.state()`, `roster()`, `teamIds()`, `confirmTeam()`, `createBattle()`, `purchase()`, `equip()`, `useItem()`, and `rest()` for debugging/fixtures. These are not player-facing console requirements.

`RPGManager.lastBattle` holds a completed snapshot/event history in memory. It clears on a new quest, New Game, or save load. Saves retain the latest report, not a full replay archive.

### Save/load

- Manual Home saves use MZ slots.
- Title order: Continue, New Game, Load.
- Continue resumes the latest slot.
- Load opens chosen slots through a focused Load/Delete menu.
- Delete asks for confirmation, defaulting to No; only Yes deletes the selected slot.
- Keyboard/mouse support; only one action menu is active at a time.
- Loaded manager campaigns open Home, not the stock map scene.
- New Game resets current state but does not itself delete saved slots.
- No autosave, ironman restriction, or normal midbattle/travel save/resume.

Version 3/4 migration retains progression and fills missing economy fields: 100 gold if absent/invalid, zero missing gear stock, normalized equipment. Valid gold is not replenished repeatedly by loading. Selected IDs are deduplicated and filtered to living NPCs. Pre-progression saves have a simpler legacy migration path; those milestones lacked normal in-game saving.

An old/manually saved active quest is recovered at Home by cancelling the unfinished quest without rewards or completion costs. This avoids a permanent “quest already running” block. It is not midbattle resume or a general corruption-repair guarantee.

## 9. Development history and user corrections

### Five-day progression

| Phase | Scope | Recorded evidence/acceptance |
|---|---|---|
| Day 1 | Home, ten NPCs, roster, exactly-three living selection, initial placeholders | Explicit acceptance recorded in Day 1 guide |
| Day 2 | Pure automatic 3v3, cooldowns, damage/outcomes, log; no animation | Explicit MZ acceptance recorded September 21, 2026 |
| Day 3 | XP/levels/traits, stamina, injury/items, one-level bonds, death, Graveyard, saving, portraits | User confirmed several systems, then requested refinements; blanket final acceptance is not established |
| Day 4 | Preparation, eventless travel/skip, visible combat, switchable strategies | Implemented and revised from direct user feedback |
| Day 5 | Full loop, smallest equipment/shop/reward additions, fresh-game and edge-case stabilization | Automated/browser checks passed; final native acceptance remains outstanding |

### Earlier feedback recorded in project notes

These are summaries, not claimed verbatim quotes from unavailable conversation history.

| User input / observation | Response | Preference supported by the record |
|---|---|---|
| Separate from Pale Crossing; keep the five-day scope | Independent MZ project and daily scope gates | Avoid unrelated scope growth |
| Start with foundation only; clear editable data | Ten-NPC JSON, roster view, draft/confirm flow | Small, data-driven increments |
| Day 1 roster/selection tests worked | Accepted milestone recorded and backed up | Foundation before more systems |
| Day 2 automatic battle tests worked | Accepted milestone recorded and backed up | Stable simulation before polish |
| Injuries, Potions/Medkits, bonds, death, Graveyard, saving were confirmed | Retained those systems, then refined UI/balance | Subsystem confirmation does not imply blanket final acceptance |
| Bonds can be refined later | Kept one simple bond level | Avoid premature relationship expansion |
| Stand-in portraits authorized | Assigned distinct bundled MZ faces in JSON | Character identity matters |
| Use Slime, Skeleton, Goblin with fitting presentation | Replaced earlier human opponents; monster attacks and generated atlas | Presentation should match creature identity |
| Battle history needs usable scrolling | Visible Up/Down controls, draggable proportional thumb, keyboard/wheel support | History review should not trap focus or return navigation |
| Show stamina numbers, bar, and readiness at Home | Added all three and immediate Rest refresh | Make resource consequences visible before commitment |
| Continue/New Game/Load order and clear slot actions | Latest-slot Continue; focused Load/Delete; default-No confirmation | Predictable save UX and guarded deletion |
| Supplies should be item-first and invalid recipients grey | Item -> living recipient; eligibility updates after use | Staged choices, visible availability |
| Latest report should be read-only, scrollable, and easy to leave | Text report with scrollbar and Return Home | Information should not masquerade as selectable commands |
| Earlier easier balance still caused too many knockouts | Lowered starter enemy HP/ATK and measured combinations/seeds | Avoid punishing starter attrition; not proof every future battle should be trivial |
| Automatic backups authorized | Verified milestone ZIP workflow | Preserve recoverable checkpoints without repeated permission requests |

### Direct Day 4 request

The user requested team selection/preparation connected to an **eventless one-to-three-minute travel countdown**, **Skip Travel for testing**, and automatic battle. Requested visuals: movement toward a target, hit feedback, damage text, HP values/bars, defeat, and distinct Basic/Signature effects. They explicitly asked for Aggressive, Defensive, Tactical; midcombat switching with a global cooldown; simulation authority over outcomes; and an MZ testing checklist.

Implementation choices included the two-minute duration, six-action cooldown, strategy factors, one-action-at-a-time presentation, and initial geometric placeholders.

### Direct Day 4 corrections

The user supplied five corrections, numbering two items as “3” in the original message:

1. **Preparation order.** The user said the choosing UX was weird and wanted Depart/Home first, with strategy options after Depart. The original simultaneous strategy/departure controls were replaced by staged menus. Choosing a strategy starts travel; Esc/right-click returns to the first stage.
2. **Strategy responsiveness and clarity.** The user said battle strategy buttons did not seem to work properly, requested color-coded cooldown, and wanted effects explained before departure. Buttons now label active/ready/wait states, show colors and modifiers, and preparation gives fuller explanations. Actual mouse/keyboard tests verify successful changes, cooldown lockout, and recovery. The record does not establish that the original simulation's `setStrategy` rule was broken; unclear availability and interaction were part of the reported issue.
3. **Concentrated attacks.** The user observed both sides hitting one lone rival and said: “attacks shouldnt feel nor be concentrated on any party members.” The lowest-HP rule was replaced for both teams by balanced received-attack counts and tie avoidance. This changed simulation behavior, not just visual distribution.
4. **Robotic logs.** The user wanted color coding and narration rather than only numbers. Action sentences, side/type colors, and readable defeat/order lines were added while retaining verifiable damage/HP.
5. **Lost sprites.** The user asked: “why did we lose the sprites? include them in the battle sequences if you can.” Earlier portraits had been replaced by crude shapes. Matching walking character sprites and existing monster artwork returned, with status labels staying fixed while artwork moves.

These requests support an interpretation that clear stages, feedback, distributed pressure, and character identity matter. They do not authorize assumptions about every future UI or combat mechanic.

### Direct Day 5 request

The user asked to **begin Day 5**, **not add new major systems**, and stabilize the complete loop: Home, roster, three-person selection, equipment/supplies, strategy, eventless travel, battle/cooldown, report, XP/rewards, stamina, injuries, bonds, consumables, death, and return Home.

They explicitly authorized the simplest shop and rewards, fresh-save testing, and fixing crashes, stuck battles, broken state changes, and dead NPCs in selection. The priority was “a reliable playable demo over polish.”

Equipment and purchases were absent, so the assistant added one slot/two gear items and a four-product shop. Starting gold, prices, outcome payouts, returning gear on death, and Report-before-Home were small implementation choices under that authorization, not separately stated user mandates.

Stabilization covered versioned-save preservation, dead-recipient filtering, active-quest team-change guards, inventory/reward consistency, a depleted-roster explanation, interrupted-quest recovery, and final-result timing after animation. Tests exercised failure branches rather than asserting that every branch had already caused a user-reported crash.

### Latest user intent

After Day 5's implementation summary the user responded positively (“cool!”) and requested a full Markdown report in the context folder to feed into ChatGPT for brainstorming. They wanted all available information about systems and the corrections they had supplied.

The assistant recommended this self-contained handoff, with explicit preferences separated from assistant choices and tested behavior separated from accepted playtests. The user authorized it. The positive reaction is not treated as a formal confirmation that the entire MZ checklist passed, and creating this report does not authorize another feature phase.

## 10. Verification and acceptance

### Recorded automated results

Final Day 5 work recorded **33 passing automated tests**:

| Suite | Count | Coverage |
|---|---:|---|
| `day2_simulation.test.js` | 15 | Legal actions, copies, determinism, turn order, targeting, signatures, outcomes/action cap, 120 teams × 3 seeds |
| `day3_progression.test.js` | 9 | XP/traits, injury/death, supplies, stamina, bonds, validation/deduplication, save round-trip |
| `day3_balance.test.js` | 1 | 120 team combinations × 30 seeds = 3,600 fresh-team fights |
| `day4_strategy.test.js` | 2 | Shared cooldown, rejected switches, damage effects and deterministic replay |
| `day5_loop.test.js` | 6 | Shop/equipment accounting, quest locks, payouts, migration, death/gear return, depleted roster, funded 12-quest loop |

The current distributed-targeting starter sample produced **3,600 victories, zero player knockouts, minimum remaining HP 67.5%**. This covers specified fresh teams/seeds, default Tactical, and no equipment; it is not a guarantee for injured, fatigued, damaged, edited, or future teams.

Historically, after enemy stats were softened but before distributed targeting, the sample also had 3,600 wins and no knockouts, with minimum HP 32.5%. Those figures refer to different rule versions. The improvement does not prove that all three strategies are balanced or interesting.

### Browser integration

Python Playwright/Chromium runs the actual MZ engine/plugins on localhost with isolated browser save storage. It does not overwrite native desktop saves.

Day 4 passed staged preparation, real mouse/keyboard strategy input, cooldown lock/recovery, loaded art, colored narration, travel skip/expiry, visible impact, report, and return Home.

Day 5 passed fresh-game roster/team selection, shop affordability, equipment swaps/bonuses, battle, strategy lock, rewards/report, Potions, Rest, second-quest levels/traits/bonds, Save/Continue and page reload. Explicit later low-HP fixtures covered first injury, Medkits, wounded-knockout deaths, returned equipment, dead NPC filtering, saved deaths, depleted roster, interrupted-save recovery, and New Game reset.

A full **unmodified 120-second countdown** completed and started battle. The long run reached final New Game testing, where a harness wait incorrectly assumed the frame counter would never reset. After correcting that wait, a complete rerun passed using `--fast-travel` to accelerate only timer expiry. Tests accelerate later battle animation after observing a real displayed hit; simulation decisions are unchanged.

Earlier sandbox attempts to launch Playwright hit an operating-system permission error; the local tests then ran with the required execution permission. That was an execution-environment issue, not a game crash. The New Game frame wait was also a test-harness defect, not proof that New Game froze.

### Acceptance boundary

- Day 1 and Day 2 user acceptance is explicitly recorded.
- Several Day 3 systems were confirmed; further refinements followed.
- Day 4 has direct user feedback and implemented corrections.
- Day 5 has automated/browser evidence and a positive user reaction.
- Final **native desktop MZ acceptance of the current build is still outstanding** in the available record.

Tests establish behavior within their coverage, not enjoyment, long-term balance, emotional attachment, accessibility, packaged-build compatibility, or release readiness. This documentation task inspected code but did not rerun the suites; the results above are the recorded development checks.

## 11. Current limitations and design implications

### Absent or deliberately minimal

- One easy repeatable quest; no quest selection, campaign map, bosses, difficulty curve, or scaling opposition.
- Ten fixed NPCs; no recruiting/replacement generation, retirement, resurrection, or campaign victory condition.
- One equipment slot, two flat-stat items, four shop products; no sell/craft/loot economy.
- One-level bonds; no scenes, romance, rivalries, or decay.
- No training activity, morale, fear, changing form, personality AI, or management calendar.
- No role-specific skill effects, healing/protection behavior, formations, mechanical range, pathfinding, criticals, or combat statuses.
- Three damage profiles rather than three distinct tactical AI approaches.
- Simple sprite/portrait effects and repeated narration, not a finished audiovisual presentation.
- Home-only manual saves; no autosave, ironman, or battle resume.
- No documented exported/packaged demo validation or distribution build.
- Older Day 1–3 browser scripts describe previous scene flows and may need adaptation; Day 4/5 are current integration coverage.

### Design tensions — analysis, not approved changes

**Identity versus shared mechanics.** Names and roles imply class differences, but behavior is mostly shared. Would one distinctive existing role teach more than adding more NPCs?

**Spread targeting versus tank roles.** Balanced attacks honor a clear user preference and reduce attrition. They can also reduce conventional tank/taunt usefulness. Future protection should explain how it preserves the desired distribution rather than silently restoring pile-ons.

**Strategy names versus depth.** Tactical is neutral; strategy does not alter targeting or skills. Whether switching offers enough meaningful decisions is unproven. Easy-quest win rate is too blunt to compare the strategies.

**Reliability versus challenge.** Every sampled fresh team wins the starter quest, and players level while enemies stay fixed. The demo proves a loop more clearly than a demanding composition puzzle. The request to reduce knockouts does not automatically mean “never allow danger” or authorize “make everything hard again.” Ask about desired risk.

**Fatigue versus free recovery.** Repeated free Rest can become routine clicking rather than roster allocation. A time/cost constraint would be a design change, not a bug fix.

**Permanent death versus fairness and attachment.** The two-stage rule is predictable, but there are only ten NPCs. Below three survivors the only way forward is loading/restarting. Discuss emotional stakes before adding recruitment or weakening death.

**Travel versus engagement.** The requested timer has no choices/events/rewards; the test skip makes it optional. Its intended function—anticipation, pacing, idle play, or merely connecting screens—has not been settled. Do not add travel events without revisiting the eventless requirement.

**Growth versus economy.** Flat permanent gear, fixed gold rewards, free Rest, and non-scaling opposition allow farming. Defeat also pays. Long-term spending pressure and replay goals remain unresolved; the shop was added to sustain a small demo, not prove a final economy.

**Saves versus irreversible stakes.** Death persists within the campaign state, but the player can load an earlier slot. That is current behavior, not an ironman experience.

## 12. Questions and possible small experiments

These are discussion proposals, not an approved backlog.

### Questions to answer first

1. Which pleasures should lead: roster attachment, composition planning, strategic intervention, progression, or watching convincing combat? Which two matter most?
2. What should an ideal session contain, and how long should one quest and battle take?
3. What purpose does eventless travel serve? Should skipping remain developer-only or become a player option?
4. Does “spread attacks” mean fair hit counts, avoiding repeated pile-ons, or distinct opposing matchups? These imply different algorithms.
5. How often should a healthy prepared team lose, become wounded, or risk death? What advance warning should the player get?
6. Should strategies primarily change damage tradeoffs, skill timing, protection, priorities, or visible behavior?
7. How different should Support, Guardian, Ranger, and Mage play? Are roles fixed identities or configurable builds?
8. Is free Rest welcome convenience, or should fatigue eventually create rotation decisions?
9. Is a finite ten-person roster with load/restart at depletion appropriate, or is a long-lived guild the intended experience?
10. Which current interactions feel tedious, and which outcomes make the player want another quest?

### Candidate experiments

| Small experiment | Question it tests | Constraint / tradeoff |
|---|---|---|
| Observe current MZ sessions before changing mechanics | Where players hesitate, what they understand, whether they switch | Faster clicking is not automatically more fun |
| Compare current travel with a shorter optional test wait | Whether anticipation survives without idle friction | Preserve eventless travel unless explicitly revised |
| Give one existing role one distinct, explained effect | Whether identity creates composition decisions | New skill logic; do not redesign all ten at once |
| Compare two clearly described distribution policies | What feels fair and intentional | Do not silently reinstate low-HP focus fire |
| Compare three strategies with identical starting states/seeds | Whether costs/benefits differ usefully | Measure HP and duration, not only easy-quest wins |
| After agreement, try one optional tougher encounter | Whether preparation/risk assessment becomes meaningful | Added content; preserve gentle entry and discuss consequences |
| Explore one recovery tradeoff on paper | Whether fatigue could generate choices instead of clicks | A time/cost model requires an explicit decision |

For each idea: identify a hypothesis, the user preference it must preserve, the smallest test, what success looks like, and whether the change is reversible without damaging the playable loop.

## 13. Files, workflow, and handoff

### Important files

| Path | Purpose |
|---|---|
| `game.rmmzproject` | Open in RPG Maker MZ |
| `index.html`, `package.json` | Runtime entry and desktop configuration; default window 816 × 624 |
| `js/plugins.js` | Enabled plugin registration/order |
| `js/plugins/RPGManager.js` | Manager scenes, input, presentation, engine hooks |
| `js/plugins/RPGManagerBattle.js` | Independent simulation |
| `js/plugins/RPGManagerProgression.js` | Campaign/economy/progression |
| `data/RPGManagerRoster.json` | Ten starting NPC definitions |
| `data/RPGManagerEnemyTeam.json` | Repeatable enemy trio |
| `img/faces/RPGManagerMonsters.webp` | Goblin/Skeleton/Slime atlas |
| `context/Monster_Portrait_Asset.md` | Atlas provenance and generation prompt |
| `context/Teamfight_Manager_Project_Context.md` | Current progress plus historical notes |
| `context/Teamfight_Manager_Codex_Daily_User_Guide.pdf` | Original phased requests and manual acceptance guide |
| `tests/Day_5_Testing.md` | Current full MZ checklist and condition/death fixtures |
| `tests/Day_4_Testing.md` | Strategy/travel/presentation checklist |
| `tests/day5_loop.test.js` | Economy/equipment/migration and repeat-loop tests |
| `tests/day5_smoke.py` | Current fresh-game browser integration |
| `scripts/backup_project.py`, `backups/README.md` | Backup/restore workflow |

### Art provenance

Player faces/characters use the project's bundled RPG Maker sheets. The monster atlas was created with the built-in image-generation tool on September 21, 2026. Actual dimensions: **2172 × 724**, three equal cells in order **Goblin, Skeleton, Slime**. JSON specifies `columns: 3`, `rows: 1`, and index; the renderer crops/scales cells. The full prompt/provenance is in the asset note. No new generated art was required for Day 4 corrections or Day 5.

This is stand-in art, not a settled final art direction.

### Backups and scope

The user authorized automatic backups before each new day's implementation and after accepting a day's playtest. Run `python scripts/backup_project.py <milestone-label>`, verify the archive, and report its location. Versioned ZIPs go under `backups/`, exclude previous backups, and must not overwrite/delete older archives. This is an active workflow, not a scheduled background service.

Recent verified archives:

- `backups/RPG-Manager_2026-09-22_09-26-30_522005_before-day-4.zip`
- `backups/RPG-Manager_2026-09-22_10-14-23_148424_before-day-5.zip` — 1,336 files, approximately 93.9 MiB.

No final accepted-Day-5 archive or exported release package is claimed in the available record. Writing this document is not a new implementation day or an acceptance event. Future feature work needs a new user decision; brainstorming does not supply that authorization.

### Launch and checks

Open the project in MZ, verify the three plugins in the order above, then Playtest -> New Game. Select/confirm three NPCs, buy/equip gear if desired, prepare supplies, and follow Start Quest -> Depart -> strategy -> travel/skip -> battle -> report -> Home. Save manually at Home.

Current checks from the project root:

```text
node tests/day2_simulation.test.js
node tests/day3_progression.test.js
node tests/day3_balance.test.js
node tests/day4_strategy.test.js
node tests/day5_loop.test.js
python tests/day4_smoke.py
python tests/day5_smoke.py
```

After verifying the full timer, `python tests/day5_smoke.py --fast-travel` accelerates timer expiry for repeat runs. Browser scripts require Python Playwright/Chromium; pure-rule tests use Node. The MZ checklist includes controlled low-HP injury/death fixtures, which are developer tests rather than gameplay requirements.

### Reading this snapshot

Treat the implementation as a concrete starting point, not a final design specification. Keep separate what the user wanted, what the assistant chose, what tests established, and what still needs actual play. The next useful decision is which aspect of this loop deserves a small, testable improvement—not automatically which major system to build next.
