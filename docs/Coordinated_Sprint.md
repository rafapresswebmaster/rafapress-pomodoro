# Coordinated combat, progression, camp and presentation sprint

Delivered October 15, 2026. Save schema **24**. Implemented in the existing RPG Maker MZ project; no build pipeline, new plugin or raster/audio dependency. The external Next Sprint brief was the requested implementation scope. The canonical schema-23 handoff supplied the baseline (the numbered Downloads handoff was not present in this workspace).

## Combat and consequences

Inspection before tuning: base HP 3?6, Armor 0?3, innate Ward 0?3; ordinary attacks default to 1, old signatures 1?2 after integer resolution, critical attacks double before defenses. The old move slots unlocked at 2/4 but mainly supplied multiplier/cooldown variants. A flat -1 damage penalty would erase ordinary damage, so it was rejected.

Every player knockout now emits exactly one seeded Mulberry32 50/50 `deathSave` compatibility event with `coinFlip`, `survived`, `permanentDeath` and a recorded check result. Even former execution signatures use this rule. Final-action KOs resolve before battle completion. Presentation reads this event, including the central animated coin; it never rolls. The event type retains its old name for replay compatibility, but new fate is not a d20 difficulty check.

Survivors are marked Wounded in the persistent roster at 1 HP, and `health:0`, `alive:false`, `incapacitated:true` in expedition copies. They cannot be targeted/healed or enter later battles on that trip. Loading preserves this exclusion. Each survived knockout increments `lastingInjuries`: Dodge loses 2 percentage points per stack, floor zero, and prepared initiative Speed is multiplied by `0.97 ** stacks`. The speed modifier continues after Dodge reaches zero; preparation never compounds it on persistent base Speed. Each KO adds the next unused named scar while one remains; after six names, numeric stacks continue. The trait count and effect appear on the camp roster, inline/full sheets and frozen results. Passive healing, Medkits and legacy scar-removal rituals cannot remove injury stacks. No new cure was introduced.

Death uses canonical permadeath/vacancy/graveyard handling and returns worn equipment once. Stage recording and settlement keys prevent repeated gear/consequence/reward application, including after reload. The existing Altar reanimation remains. Returning injury survivors are clamped to exactly 1 HP even if the same quest increases their maximum HP.

## Automatic class specials

The level-2 first move is renamed in the Markdown catalogue and synced into runtime JSON. Existing second move IDs/slots at level 4, selection, and cap four remain; automatic signature use applies the class effect, retains the existing seeded trigger priority and one-use-per-expedition limit.

| Class / special | Resolved effect |
|---|---|
| Barbarian / Cleave | Main hit +1; seeded 50% secondary hit for 1 through the other foe's defenses; secondary defeat is recorded normally. |
| Knight / Shield Bash | Hit; protect lowest living HP-ratio ally against the next hit for 1 point. |
| Ranger / Pinning Shot | Hit; target's next attack loses 1 raw damage, minimum 1. |
| Rogue / Opening Strike | +1 damage if a different ally previously hit that enemy. |
| Mage / Arcane Pulse | +1 raw damage; 1 point bypasses Ward/Armor. |
| Cleric / Mending Light | Heal living damaged ally with lowest HP ratio for exactly 1; otherwise attack. Cannot revive, target incapacitated members or overheal. |

Recorded healing projects HP only and preserves the target's Armor/Ward. Critical status is forwarded to presentation, produces stronger impact/flash and a CRITICAL x2 marker. Existing dodge, defense loss, healing and fate effects remain outcome-driven.

## Content and XP

The 23-contract catalogue retains all nine Short/Medium/Long ? Easy/Normal/Hard tiers. Old Road is now a guaranteed two-bandit Short Normal Hunt. Watchpost is a Short Hard Ogre-captain boss Hunt (Ogre, Orc, Goblin Archer), 18 Gold / 2 Arcana / 18 XP each; its card explicitly warns of knockout permadeath. Existing Medium combat Hunts retain varied enemy groups. Optional encounter probabilities increase from .25/.50/.75 to .40/.70/.90; safe contracts without encounter choices stay safe. Long Hunts retain authored weak skirmishes and quiet beats.

All contracts now explicitly map to shipped battlebacks, including forest, grassland, roads, cellar stone, cemetery stone, swamp, castle and demon architecture. No recolored enemy clones or generated assets. `battleback` and optional `battlebackFolder` are content-only fields; unavailable art retains the renderer fallback.

XP thresholds are **incremental 30 / 90 / 240**, cumulative **30 / 120 / 360**, versus former cumulative 15/85/235. Old saves preserve their already earned levels and current within-level XP; future levels use the new thresholds. Short Normal quests award 15 each: six yield the 90 XP from level 2 to 3. Aqueduct + Herbarium yield 55+38=93 XP over two 25/30-minute sessions. Very safe 5-XP errands still take longer to level; two ordinary five-minute Cellar missions yield 40 XP and level 2.

Executed representative route: two Clear Cellar contracts, then six Grave Moss contracts reach level 3; sixteen further Grave Moss contracts reach level 4. All three starters survive this particular deterministic route; milestones at missions 2/8/24 have levels 2/3/4 and 10 residual XP. Paid class Armor restoration and three minutes of process-open camp healing between missions; no purchased gear or offline credit. Recorded Gold at those milestones: 136/146/147. This is a route example, not a guarantee for all seeds/parties. Command: `node scripts/coordinated_sprint_route.js`; exact ledger: `tests/coordinated-sprint-route.json`.

Balance audit: **4,140 runs**, all 23 quests ? levels 1/2/4 ? starter martial trio, Rogue/Mage/Cleric, and three Mages ? 20 seeds. Uses actual class base stats/speeds, full HP/defenses, no purchased gear; sets only the five-quest unlock counter so every contract can be sampled at level one. Win means final objective/combat victory, not survival of every participant. Rewards include resolved finds. Full per-contract/composition/level rows and all-tier aggregates: `tests/coordinated-sprint-balance.json`.

| Level-one tier | Runs | Wins | Retreats | Wounded/run | Deaths/run | Gold/run | Arcana/run | XP/member |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Short/Easy | 180 | 100.0% | 0.0% | 0.00 | 0.00 | 7.7 | 0.4 | 6.7 |
| Short/Normal | 120 | 100.0% | 0.0% | 0.01 | 0.03 | 5.7 | 1.8 | 15.0 |
| Medium/Normal | 240 | 100.0% | 0.0% | 0.00 | 0.00 | 20.6 | 3.0 | 28.2 |
| Medium/Easy | 120 | 100.0% | 0.0% | 0.00 | 0.00 | 19.8 | 1.4 | 19.0 |
| Medium/Hard | 180 | 100.0% | 0.0% | 0.01 | 0.01 | 36.2 | 2.7 | 40.0 |
| Long/Hard | 300 | 85.0% | 0.0% | 0.61 | 0.65 | 64.3 | 12.0 | 73.4 |
| Short/Hard | 60 | 100.0% | 0.0% | 0.07 | 0.08 | 18.7 | 2.1 | 18.0 |
| Long/Easy | 60 | 100.0% | 0.0% | 0.00 | 0.00 | 23.3 | 5.0 | 22.0 |
| Long/Normal | 120 | 100.0% | 0.0% | 0.00 | 0.00 | 46.2 | 10.9 | 46.5 |

Evidence prompted adding the Ogre captain: the earlier Short Hard version had no sampled deaths. The final level-one sample has 0.08 deaths/run on that tier; Long Hard has 0.65 deaths/run and 85% wins. No healthy-start audit retreats occurred; adversarial focused tests cover battered retreat and cancellation of later fights. Fresh healthy Medium contracts remain forgiving. This sample does not cover all 216 ordered class trios, worn-gear campaigns, every item build or long-term economy; the paid-care route above complements the fresh-start audit.

## Screens, camp and visual system

Battle removes the side text rails and lower explanation field. Stage spans the panel; names and persistent HP/Armor/Ward capacity pips sit beneath sprites, including dim spent capacity. The last enemy row is clamped above the log. One concise outcome-colored log replaces the broad notes. Active expedition keeps only the upper-right authoritative timer and removes the large duplicate countdown, bottom navigation and roster toggle/Shift rail. Results fill the usable width, keep portraits, visible old?new level/stat/unlock callouts, exact Gold/Arcana/XP, enemy kills, wounded/dead counts, Details and Finish. The duplicate results countdown is removed too.

Camp portraits open a temporary **inline left-pane sheet**, leaving party selection accessible. Back returns to the camp scene. Potions/Medkits show effect and stock with direct use/buy; Armor shows an exact quoted confirmation. All four gear selectors directly use the existing compatibility/inventory/wear/no-equip-healing APIs. Full sheet slot squares also open that slot's compatible equipment menu. DOM text is assigned with textContent, and sheet controls stop underlying game input. Full sheet/Rename remains accessible.

Manual Rest is removed; old Rest assignments normalize to Idle. Every living non-away camp member gains 1 HP each 30,000 process-open milliseconds, regardless of Idle/Work/Study. Per-member partial recovery survives saves; the runtime baseline resets on load, with no offline credit. Recovery does not tick for away members, does not erase injuries or restore Armor, clamps HP and does not bank full-health healing. A small pulsing green cross appears on healing camp sprites. Existing destination/idle/work/study movement and contextual behavior remain. Camp footer is hidden; camp navigation uses larger navy/brass button shapes and selected/disabled treatment.

Visual tokens: navy #202a47/#243969, indigo #354c80, cream/parchment #f3e5c7, brass #c6ae65/#e8c583; green reserved for healing/success, red #9b2637 on parchment for danger. Georgia headings, Trebuchet MS body, MZ fallback fonts. HP hearts, Armor shields, Ward orbs, Gold coin and Arcana glyphs accompany words/numbers; fate, critical and cost labels preserve meaning without color. No new font/bitmap asset required. Classic greenery remains scenery rather than panel fill.

Wounded sound uses existing Damage1; death uses Collapse1. Cues play from the displayed resolved fate after the coin reveal, respect Alerts and saved cue keys, and use isolated buffers. Existing battle-start/end/random-event cues remain. Human audibility/mix is not claimed by automated tests.

## Background/native playback and saves

MZ's focus-gated Scene.update and the travel active() guard were the direct pause sources. Visible manager scenes now continue the ordinary MZ render/update loop while unfocused. NW Chromium disables background timer throttling, renderer backgrounding and occluded-window backgrounding in package.json. Presentation cursor advancement moved to the existing shared-clock synchronization path, so it advances during minimization too, without a second simulation clock. Presentation deltas are bounded; frame-based travel is bounded on restore; simulation/deadlines/rewards remain authoritative. No fake countdown-only substitute, focus stealing or widget-owned clock.

Native close verification exposed a main-window shutdown race. The close handler now suppresses further refreshes, destroys the floating display, and force-closes that same main window. Final native checks confirm process/child cleanup. No save or clock settlement behavior was changed.

Schema 24 adds sanitized `lastingInjuries`, expedition `incapacitated`, partial camp recovery and frozen level-change/kill metadata; recorded fate continues using the compatible deathSave event key. Existing normal saves, active trips, depleted gear, names, clock position/preferences and ledgers migrate. Closed time remains excluded. Legacy missing fate events use a stable keyed compatibility outcome; new simulation always supplies a recorded coin.

## Verification

Executed focused command (178 pass, zero fail/skip):

```powershell
node --test --test-isolation=none tests/post_sprint_fixes.test.js tests/stage1_camp_home.test.js tests/stage2_realtime_loop.test.js tests/stage3_catalogue.test.js tests/stage4_realtime_presentation.test.js tests/stage5_equipment_repair.test.js tests/recoverable_errors.test.js tests/item_persistence.test.js tests/polish_tuning.test.js tests/small_roster_rework.test.js tests/death_stabilization.test.js tests/complete_battle_sequence.test.js tests/quest_window_polish.test.js tests/mission_background_clock.test.js tests/pomodoro_focus.test.js tests/pomodoro_sprint.test.js tests/next_playtest.test.js tests/visual_battle_stage.test.js tests/illustrated_travel.test.js tests/readability_progression.test.js tests/focus_companion.test.js tests/coordinated_sprint.test.js
```

Output: `tests/next-sprint-results.txt`. The prior 161-test selection was preserved and its obsolete schema/Rest/XP/rail/instant-execution expectations updated to the requested contracts; no tests deleted or skipped. Seventeen additional checks cover seeded distribution/replay, final-action KO, incapacitation/reload, death/gear conservation, permanent stacking/preparation, healing timing/playback, class name pools, all special effects/targets, critical projection, XP and background files.

Executed: `node scripts/coordinated_sprint_audit.js` (4,140 runs; JSON and console artifact), `node scripts/coordinated_sprint_route.js`, `python scripts/sync_adventurer_catalogue.py --write` and `--check` (six classes/twelve moves), and node --check on the changed runtime plugins.

Browser: `python tests/focus_companion_smoke.py` passed at 816?624 and 1280?720; `tests/next-sprint-browser-results.txt`. New `python tests/coordinated_sprint_smoke.py` passed at both sizes, zero page errors: fresh class-only recruitment/naming, inline camp item/equipment actions, quest board, travel, battle, both fate visuals, actual active/settled save/load, forced consequence settlement, visible level-up, Finish and recovery. `tests/coordinated-sprint-browser-results.txt`; inspected screenshots `tests/visuals/coordinated-*`. Some edge cases are deliberately injected in the harness for deterministic coverage; this is not an assertion that a natural death occurred on every browser route.

Installed NW.js: `python tests/coordinated_native_smoke.py` passed. Runtime NW 0.48.4 / Chromium 85 / Node 14.12 / MZ 1.10. Windows foreground handle differs from main game while real travel walk time/frame count and saved event cursor advance on the second monitor. Native document.hasFocus() reported true under CDP despite a different OS foreground HWND; the check uses the OS handle, and the forced-focus-gate browser tests complement it. Minimized clock AND presentation advance; restore is stable. Topmost floating timer, no focus change on timer open/tick, actual monitor placement, offscreen clamp, DataManager save/load without duplicate widget, hide/title and main-close cleanup pass. `tests/coordinated-sprint-native-results.json` and `.txt`, screenshots `coordinated-native-*`. The temporary focus probe is test-only and closes. Native minimized physical redraw is not claimed; current state renders on restore. The original native baseline run failed process-exit cleanup before the explicit fix; its diagnostic text is retained separately.

Remaining manual limits: native visible battle impacts are covered by the same cursor/render path but were not separately timed under a physically selected external application; the native focus target was another actual NW window. Sound audibility, hot-unplug/DPI changes, overnight CPU behavior, and accessibility assistive-technology behavior need human checks. Historical wildcard suites are not the current gate and were not mass-edited.

## Fresh New Game route

Choose three class-only candidates ? randomize first names ? Start. Click each camp portrait, use a Potion, buy/use a Medkit when Wounded, equip Head/Body/Offhand/Accessory, confirm Armor restoration, then Back. Take two Cellar missions for level 2; compare Short Normal Old Road/Grave Moss, Short Hard Watchpost, Medium Hunts and Long sessions. Watch the critical and fate outcomes; survivors must stay down for that expedition and return at 1 HP, deaths create free-Tavern vacancies and return gear once. Read the opening recap for kills/XP/currency/consequences/level changes; Finish, save/load and wait 30 seconds at camp. Check a second-monitor session with another app selected, then minimize/restore and Timer options ? End Early/cancel/confirm. For guaranteed edge coverage run the automated routes above; natural fate is seeded, never forced by the UI.


## Main HUD layout follow-up

User screenshot correction: hide the focus HUD and floating display unless a trip has remaining countdown time; idle/preview/results screens no longer show a Ready or 00:00 timer. Camp navigation now computes columns for two filled rows (four columns for eight normal actions), expanding buttons across the entire available width. No simulation, countdown or save schema changes. Focus browser expectations now use this visibility rule; the coordinated browser route checks idle/results hidden, active visible, and the final navigation button reaching the right edge at both supported sizes. Focused suite: 178/178.
