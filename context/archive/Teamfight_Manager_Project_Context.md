# Teamfight Manager–Inspired Game

## Current revision ? roster corrections (September 22, 2026)

This revision overrides the older Stage 2 editing rules and sprint plan's free
Team B proposal, following the user's latest instructions. See
`tests/Roster_Revision_Testing.md` for current controls and playtest steps.

- Only names are editable. Class, sex, race and signature are fixed per character.
- Fresh campaigns roll four stats within authored class ranges and one signature.
  Existing saves retain all stats, identity, both equipped items and progress.
- ATK/DEF/SPD display Very weak / Weak / Regular / Strong / Very strong; HP stays numeric.
- Home has Roster; selecting a member opens Set Up, Equipment, Use supplies, Rename.
- Team A is free; Team B Charter costs 100 gold once. Teams have three members,
  assignments are exclusive, and quests remain sequential. No later-stage timers,
  recruitment, quest board or variable party sizes were added.
- Equipment: two explicit slots, one per type (helm, weapon, shield, armor, amulet).
- Future graveyard entries identify the enemy that dealt the fatal wounded knockout.
  Older saves without this record show an honest missing-record label.
- Save version 7; pre-change verified backup:
  `backups/RPG-Manager_2026-09-22_20-55-06_313605_before-roster-revision.zip`.

Everything below is historical context where it conflicts with these corrections.

## Project Objective

Create a small standalone game with a mechanic very similar to *Teamfight Manager*: the player manages a team, makes strategic decisions before and during matches, and watches matches resolve automatically through AI-controlled battles.

This is an independent project. It is not part of, and should not be mixed with, the Pale Crossing project.

## Core Concept

The player should feel like a manager rather than a direct-controlled fighter. The main gameplay comes from:

- Building and managing a small roster.
- Choosing training, preparation, and tactical priorities.
- Selecting strategies, roles, or compositions before a match.
- Watching AI-controlled characters fight automatically.
- Understanding why the match was won or lost.
- Dealing with consequences such as fatigue, injuries, morale, and changing form.

## Auto-Battle Direction

The battle system should use ordinary game logic rather than machine learning. Characters make decisions through priorities, conditions, roles, traits, cooldowns, morale, health, and the team’s selected strategy.

Possible AI behaviours include:

- Choosing targets based on threat, vulnerability, or tactical role.
- Protecting allies or focusing on a specific enemy.
- Retreating, repositioning, or taking risks according to personality and strategy.
- Using abilities according to cooldowns and changing battle conditions.
- Becoming less effective when fatigued, injured, frightened, or demoralised.

## Presentation

The long-term goal is to explore visible automatic battles with real-time or real-time-looking animations. The simulation should determine the battle events, while the visual layer presents those events clearly through character movement, attacks, abilities, reactions, commentary, and changing momentum.

The first version does not need a full campaign, a large roster, sophisticated graphics, or perfectly realistic AI. It should establish whether the combination of management decisions, automatic strategy, and watchable battles is enjoyable.

## Scope

This is a **five-day prototype**. Keep all work within that timebox and the agreed prototype scope. Ask the user for approval before expanding scope; do not add features or broaden the project without that approval.

Keep the project small and experimental. Prioritise:

1. A clear management loop.
2. Understandable strategic choices.
3. Automatic battles that produce varied outcomes.
4. AI behaviour that appears intentional rather than random.
5. Battle results that visibly reflect the player’s decisions.

Avoid expanding into a complete commercial-scale management simulator until the central loop is proven fun.

## Development Principle

Separate the battle simulation from the battle presentation whenever possible. The simulation should generate meaningful actions and consequences; the animation system should then display them. This will make the game easier to balance, debug, and expand.

## Backup Workflow

The user has authorized Codex to create project backups automatically during development. Before starting each new day's implementation, and after the user accepts a day's playtest, run `python scripts/backup_project.py <milestone-label>`. Check that verification succeeds and report the resulting ZIP location. Backups go in `backups/`, include the saved project files, and exclude earlier backups. Never overwrite or delete previous backups. This is part of the active development workflow, not a background scheduled service. Restore instructions are in `backups/README.md`.

## Current Progress: Next sprint Stage 2 (awaiting user acceptance)

Stage 2 adds an editable Markdown-to-JSON class/dialogue catalogue, 12 classes
with two signature choices each, Home profile/rename controls, cosmetic sex/race,
and two gear slots. Save schema 6 retains existing campaign stats/progress and
keeps old gear in Slot 1. See `context/Adventurer_Classes_and_Dialogue.md` for safe
editing and `tests/Stage_2_Testing.md` for validation, backup, and MZ playtest steps.
Stages 3–5 are not implemented; user acceptance remains pending.

## Previous implementation: Next sprint Stage 1

Stage 1 adds shorter high-impact battles, 2.45-second portrait captions, and
optional scrollable history that pauses playback. Simulation still chooses all
attacks/outcomes and spreads targeting. Save schema 5 and progression rules are
unchanged. Native NW.js reference: fresh Ada/Bram/Cora, Tactical, seed 123,
32.80 seconds / 32 visible actions before; 15.67 seconds / 13 actions after.
See `tests/Stage_1_Testing.md` for changes, verified backup, tests, and exact MZ
playtest steps. Stages 2–5 are not implemented. User acceptance is still pending.

## Historical baseline: Day 5 demo (awaiting MZ acceptance)

The user explicitly authorized Day 5: finish and stabilize the playable loop,
without adding major systems. Plugin order is unchanged: RPGManagerBattle,
RPGManagerProgression, RPGManager. All simulation and campaign rules remain
separate from rendering. Earlier daily notes below are historical.

Complete flow: Home -> roster/team -> equipment/supplies/shop -> Start Quest ->
Depart -> strategy choice -> eventless 120-second travel (or Skip Travel) ->
automatic battle with shared strategy cooldown -> View Battle Report -> Home.

Day 5 additions and stabilization:

- Start with 100 gold. Repeatable quest pays 60 gold for victory, 20 for draw,
  15 for defeat; payout happens once in finishQuest and appears in the report.
  Existing 60 XP / 20 stamina participation and injury/death/bond rules persist.
- Shop sells one item per input: Potion 10g, Medkit 25g, Training Blade 40g,
  Leather Guard 40g. Stock replenishment is unlimited if the player can pay.
  Unaffordable purchases are disabled; purchases are atomic and Home-only.
- Equipment: one slot per living NPC. Blade adds 3 ATK, Guard adds 3 DEF to
  combat copies before injury/fatigue penalties. Equip, swap, and unequip
  conserve shared stock; permanent death returns equipped items to stock.
  No HP gear, stacking, selling, crafting, or random loot.
- Home displays gold; preparation displays gear and payout rules. Final result
  narration waits for the last attack animation. Battle completion leads to
  the read-only report, then Home. Reopening the report cannot repeat rewards.
- Save schema 5 retains schema 3/4 progression. Missing economy fields receive
  starting defaults once, without resetting XP, HP, injuries, bonds or deaths.
  Old/manual in-flight saves recover at Home by cancelling the unfinished
  quest without rewards/costs. Normal saves are still Home-only.
- Dead NPCs are excluded from selection, Supplies, and Equipment. Fewer than
  three living NPCs disables quests with a clear load/restart explanation.
  Team changes, equipment, shopping, supplies and Rest cannot affect an active quest.

Pre-Day 5 backup verified (1,336 files):
`backups/RPG-Manager_2026-09-22_10-14-23_148424_before-day-5.zip`.

Tests and MZ checklist: `tests/Day_5_Testing.md`. New tests:
`tests/day5_loop.test.js` (economy/equipment/rewards/migration/12-quest campaign),
`tests/day5_smoke.py` (fresh-game real input, full travel, campaign/save/death).
The Day 4 browser regression now follows Battle -> Report -> Home.

Day 5 verification completed:
- 33 automated tests passed across combat, progression, strategy, balance and
  Day 5 economy/loop suites. Balance includes 3,600 fresh unequipped teams/seeds;
  the Day 5 suite also runs a 12-quest funded campaign with equipment/supplies.
- Day 4 browser regression passed real input, cooldown, sprites/logs and new
  Battle -> Report -> Home navigation with no JavaScript errors.
- Day 5 fresh-game browser checks passed purchases, swaps, team confirmation,
  automatic combat, rewards, XP/traits/bonds, supplies, Rest and persistent saves.
  One full, unmodified 120-second travel completed and started battle correctly.
- The same run reached all death/recovery checks, then exposed a test-only wait
  bug when New Game reset Graphics.frameCount. The harness now tolerates that
  reset; a complete rerun passed with --fast-travel (timer expiry accelerated).
- Late explicit low-HP fixtures passed first injury, treatment, wounded knockout
  death, gear recovery, dead NPC filtering in all recipient lists, saved deaths,
  fewer-than-three end state, interrupted-save recovery and New Game reset.
- These tests use isolated browser storage; the user's native MZ save files
  were not modified. Desktop MZ playtest acceptance is still outstanding.

Remaining limits: one repeatable easy quest, two equipment choices, four shop
products, one-level bonds, simple art/effects, and Home-only manual saving.
There is no campaign progression, recruitment, or expanded management system.
Native desktop MZ playtest is still required for the user's final acceptance.

## Historical Day 3 progress

Day 2 was accepted after the user's successful MZ playtest on September 21,
2026. Day 3 is implemented and awaiting the user's playtest acceptance.
The user also authorized stand-in portraits; units now use distinct faces
from the project's bundled MZ sheets, configured in the NPC JSON files.

Plugin order: `RPGManagerBattle`, `RPGManagerProgression`, `RPGManager`.
Combat remains an independent simulation. The new pure progression module
prepares combat modifiers and applies each completed quest's consequences once.
The presentation plugin displays portraits, HP/cooldowns, the log, Supplies,
Graveyard, and a last-quest report. No visual battle animations yet.

Day 3 rules:

- Each participant earns 60 XP and loses 20 stamina. Level thresholds are
  current level times 100 XP. Level-up adds 10 max HP, 2 ATK, 1 DEF and one
  passive trait rank. It does not heal. A trait adds its rank to its named stat.
- First knockout: Wounded, recover to 25% HP. Already Wounded at departure plus
  knockout: permanent death. Survivors at <=25% HP also become Wounded.
  Injury reduces combat ATK/DEF by 20% and persists until treated.
- Six starting Potions heal 50 HP each. Three Medkits treat injury and heal
  30 HP each. Neither revives. Stock is finite; no shop/replenishment yet.
- Below 40 stamina: -20% combat ATK/SPD. At least 20 required to embark.
  Home Base's Rest restores 40 stamina to living NPCs, never HP or injuries.
- Surviving two quests together bonds a pair at one level. Any living bonded
  teammate in the starting team gives +2 ATK once, without stacking.
- Dead NPCs leave the confirmed team and future selections and appear in
  Graveyard. No resurrection. Fewer than three survivors prevents more quests.
- Save at Home Base and Continue from title preserve the campaign in MZ slots.
  New Game resets the campaign. Save/load is manual, not ironman/autosave.

Start: New Game -> Select Team -> Confirm Team -> Start Quest. The existing
enemy team is the one repeatable quest, with no travel yet. Battle damage now
persists through the progression layer; the simulator itself still uses copies.
Detailed manual tests and console fixtures: `tests/Day_3_Testing.md`.
Automated checks: `tests/day3_progression.test.js`, `tests/day3_smoke.py`, and
the updated Day 1/2 regression suites. Day 4 was explicitly authorized on September 22, 2026.

### Day 3 playtest refinements

The user confirmed that injuries, Potions/Medkits, bonds, permanent death,
Graveyard, and saving work. Bonds can be refined later. The user requested
these further changes before final acceptance:

- Enemy trio is now Slime, Skeleton, and Goblin, with monster attack names
  and a generated portrait atlas in `img/faces/RPGManagerMonsters.webp`.
  Atlas source prompt and tool provenance: `context/Monster_Portrait_Asset.md`.
- Battle log has Up and Down buttons on its right, with a visible proportional,
  draggable scrollbar thumb between them. Wheel and keyboard scrolling also
  work; reading history does not pull focus from Return to Home.
- Home Base's selected team shows numeric stamina, a bar, and Ready/Fatigued/
  Rest required status. Rest refreshes this display immediately.
- Title order is Continue, New Game, Load. Continue resumes the latest slot.
  Activating a saved file in Load opens a focused Load/Delete menu. Delete asks
  "Are you sure?" with No (default) and Yes. No returns to the actions, Esc
  returns to the file list, and only Yes deletes the selected file. Both mouse
  and keyboard work. Only one menu is active at a time.
- Supplies is item-first: choose Potion or Medkit, then a living teammate.
  Invalid recipients are grey and cannot receive the item. Healing/treating
  refreshes eligibility immediately; stock is finite. Back returns to items.
- The last quest report is read-only text, never selectable rows. It shows only
  the latest quest and has a scrollbar and a Return to Home button.
- The previous easier balance still caused too many knockouts. The starter trio
  now uses ATK 5/6/5 and HP 90/85/75 (Slime/Skeleton/Goblin). Across all 120 fresh
  team combinations and seeds 1-30: 3,600 victories, zero player knockouts, and
  minimum remaining health of 32.5%. This is measured coverage, not a guarantee
  for wounded, exhausted, or already damaged teams. Persistent consequences
  and deterministic death rules remain intact.

Additional checks: `tests/day3_balance.test.js` and
`tests/day3_refinements_smoke.py`. Existing saves remain compatible. Continuing
an existing save keeps its current HP, injuries, and stamina; a New Game gives
fresh roster data for verifying the starter difficulty.

## Day 4 implementation

The user explicitly requested Day 4 on September 22, 2026. Day 3 acceptance
is not inferred from this authorization. Day 4 is implemented, awaiting MZ playtest.

- Confirm Team -> Start Quest -> Preparation -> Depart -> Choose Strategy -> 120-second eventless
  travel -> automatic battle -> Home. Preparation reviews HP/stamina/injury and
  return Home for Supplies, Rest, or team changes. Only Depart/Home appear at
  first; Depart reveals three strategy options. Highlight previews detailed
  effects; selection begins travel. Esc/right-click returns to Depart/Home.
- Skip Travel is a testing button. Normal timer expiration and Skip enter the same
  battle exactly once. Travel makes no simulation actions or resource changes.
- Roster members use walking character-sheet sprites matching portrait indices.
  Enemies reuse the established monster portrait atlas as moving stand-ins.
  Fighters move toward targets and flash on impact; fixed labels show numeric
  HP/bars, signature cooldowns, and dimmed DEFEATED states, with floating damage.
  Basic attacks use a white slash; signatures use a purple/gold burst.
- The simulation decides every attack, damage amount, knockout, and result.
  Presentation consumes one action's events over 60 update frames before advancing.
  Quest consequences apply after the final animation and remain deduplicated.
- Tactical retains normal damage. Aggressive multiplies player attack
  power by 1.25 and incoming damage by 1.15. Defensive uses 0.85 and 0.75.
  Every strategy spreads attacks across living opponents with the fewest hits
  received. Seeded ties avoid the last target if another equally eligible target
  exists. Both sides use this rule; nobody targets defeated units. Initial choice
  has no cooldown.
  Midfight switches share a simulation-enforced six-action cooldown across the
  whole team (both sides' actions count). Invalid/repeated/terminal changes fail.
- Existing saves and plugin order remain compatible. No new plugins or assets.

Verified pre-Day 4 backup:
`backups/RPG-Manager_2026-09-22_09-26-30_522005_before-day-4.zip`.
Tests: existing Day 2 simulation, Day 3 progression and 3,600-battle balance suites;
`tests/day4_strategy.test.js` and `tests/day4_smoke.py`.
The Day 4 browser integration covers preparation, countdown, skip, timer expiry,
strategy changes, actual animated impact, completion and return Home.
Manual checklist: `tests/Day_4_Testing.md`. Earlier browser battle-flow scripts
predate the new preparation/travel scenes and need updating before reuse.

### Day 4 playtest refinements (September 22)

The user requested staged Depart -> Strategy selection, clearer strategy effects
and cooldown colors, distributed targeting on BOTH sides, narrated/color-coded
logs, and visible character art. These are implemented, awaiting MZ retest.
Strategy buttons label Active green, Ready blue, and shared Wait N Actions amber;
each includes its modifiers. Detailed explanations appear before departure.
Logs use blue player actions, coral enemy actions, purple signature details,
gold orders/rounds, red defeat, and green victory. Wrapping retains line colors.
Battle sprites animate independently from fixed HP labels; no new assets added.

Validation: 15 combat, 9 progression, 2 strategy tests passed. Revised balance
coverage remains 3,600/3,600 victories without player knockouts, minimum 67.5%
remaining HP with the new targeting rule (fresh teams, default Tactical only).
The Day 4 browser test now exercises actual mouse/keyboard input, preparation
back navigation, shared cooldown lock/recovery, loaded sprite frames, log colors,
travel skip/timer arrival, impact, quest completion and return Home.
