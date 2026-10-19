# Focus Companion follow-up — October 15, 2026

Implemented `Teamfight_Manager_Focus_Companion_Codex_Brief.md` against the completed schema-22 readability/progression sprint. This is a follow-up, not a restart: six classes, level 4, critical Attack, class/equipment Armor, recruitment, economy, illustrations and automatic battle rules remain. A verified pre-edit ZIP contains 1,663 files: `backups/*before-focus-companion.zip`.

## One clock, persistent display

`$gameSystem._rpgManager.trips.A` remains the only active session clock. `RPGManagerProgression.advanceMissionClock` consumes elapsed `performance.now()` time, through the existing bounded steps. Existing `syncMissionClock` drives it while the process is open, even unfocused/minimized; loading resets the process-session baseline. No offline progression or independent Pomodoro clock was added.

`js/focus_companion.js::clockView` reads that state and produces remaining milliseconds, MM:SS, remaining fraction, phase and a small party/session indicator. The upper-right kitchen-style dial/digital HUD, optional native widget, compact browser fallback and final 00:00 view consume that read-only projection. Neither the widget nor a repaint can advance, pause, settle or reward a quest. Numbers clamp at zero. Idle quest selection previews the selected authored duration; it does not start a session.

The persistent HUD has an 80 px warm dial and **40 px** digital countdown. It stays visible on Home, Quest Board/setup, active travel/battle/return, results, characters, camp jobs, Altar, Armory and MZ Save. The former 40 px expedition countdown also remains, reading the same state. Home title/treasury/Alerts/roster controls were laid out clear of the timer; Save's Back button is moved left of it. Timer options are keyboard/touch controls; pointer/keyboard events do not activate the game underneath. Options close after use. Recap Page Up paging does not also change Alerts.

## Optional desktop timer

Use the **⋯ Timer options** button in the upper-right HUD, then **Show floating timer**. It defaults Off. The **232×96** frameless window displays only a ring, countdown, session state and Hide control. Drag its surface to move it; X hides it without changing the expedition. Position is saved with the campaign and clamped to an actual monitor work area on open, movement and display-bound changes. Repeated requests cannot create duplicate windows. State replacement/save-load, title transitions and game close dispose stale windows.

The installed runtime was inspected and tested: **RPG Maker MZ 1.10.0; NW.js SDK 0.48.4; Chromium 85.0.4183.121; Node 14.12.0**. Plugin order remains Battle → Progression → BattleStage → RPGManager. The shared display script loads from `index.html` before MZ startup; it is not a fifth game plugin.

The native controller uses `nw.Window.open` with `focus:false`, `show:true`, `always_on_top:true`, `show_in_taskbar:false`. It deliberately avoids calling `show()` or `focus()` on ticks; opening hidden and later calling `show()` was unsuitable for the focus-preservation test. Child display code uses external scripts and only receives a copied view plus a hide callback. It does not need Node access. Window/load/render/event errors are caught and leave the main HUD, clock, audio, saving and settlement running. An eight-second load watchdog is a UI failure timeout, not another session clock.

API references: [NW.js Window](https://docs.nwjs.io/References/Window/) and [Manifest window options](https://docs.nwjs.io/References/Manifest%20Format/). These references informed the implementation; the desktop claims below come from the installed runtime and Windows API checks.

**Click-through is intentionally not enabled.** The reliable opaque window has only its small 232×96 input rectangle, draggable surface and X. Experimental transparent/GPU changes were not introduced. In a browser, **Show compact timer (browser)** creates a draggable in-page read-only view, explicitly labeled as such; it cannot stay above another desktop application. The fully usable in-game timer remains available in every mode.

## No required inputs and deliberate early end

Normal expeditions continue through every event, battle, objective, return and settlement without decisions. The ordinary active-pane Recall button/region is removed. Existing legacy Recall APIs remain compatible, but normal play exposes the deliberate escape hatch through **Timer options → End Session Early…**.

Confirmation explains that this ends the timer and expedition now, cancels future encounters, forfeits normal completion rewards/XP, and retains already acquired finds and resolved HP/wounds/deaths/Armor consequences. **Keep Session Running** is selected by default. Cancel changes no quest state; normal elapsed time continues while the confirmation is open. Confirming captures the trip ID so a stale dialog cannot end a replacement session.

`endSessionEarly(state, tripId, confirmed)` uses the existing Recall consequence/find contract, then creates a stable `endKind:"early"` result, records the end in the once-only settlement ledger/history, sets remaining time to zero, stops future scheduling/playback and clears the active trip. Repeated confirmation or reload cannot award or forfeit twice. Already resolved battle events are retained as copied report data. Immediate supply finds are also included in the recap, not merely retained in inventory. No completion XP, normal reward roll or new gear bonus is awarded. Early ending carries no guilt text or productivity penalty.

## Narrow automatic retreat rule

Retreat is evaluated **after at least one battle has resolved**, before each later scheduled fight. It never interrupts or rewinds the current battle. It consumes no RNG and performs no speculative combat simulation.

For current living survivors and the next authored enemy group:

- `HP` is current party HP. `defense` is remaining combined Armor plus refilled innate Ward and remaining temporary Ward. `effective = HP + defense`.
- `threat` sums next-enemy HP, Armor and innate/arcane Ward. `burst` sums each foe's maximum of basic and signature damage, minimum 1. A small skirmish is assessed at its actual tuned 1 HP / 0 Armor / 1 damage.
- A party is **battered** only if fewer than three survive, or all three collectively have at most one HP each and no defense remains.
- Retreat triggers only with a real next enemy group and either **no survivors**, or **battered AND effective ≤ max(3, burst) AND threat ≥ max(3, 3×effective)**.

Examples: a lone 1-HP unarmored survivor facing two Orcs and a Goblin retreats (effective 1, threat 8, burst 3). A lone healthy Knight with 5 HP and 3 Armor continues (effective 8). Three companions at 2 HP each continue; one ordinary wound or partial HP loss does not trigger retreat. A lone 1-HP survivor can still face one 1-HP unarmored archer/skirmish rather than being automatically rescued from every risk. This is an inspectable conservative resource threshold, **not a claimed numerical win-probability estimate**.

On retreat, `autoRetreat`, reason, assessment and elapsed point are persisted. Later fights/events stop; the previous battle's actual events, deaths, wounds, lost defenses and finds remain. An illustrated narrated return begins without a modal. The **original remaining clock continues to its planned 00:00**; settlement occurs once at that deadline. Completion rewards/XP/bonus rolls are forfeited; acquired finds remain. Ordinary low-HP wound handling still applies, but cannot top up a retreating survivor's HP. Existing death/wound rules in already resolved battles remain unchanged. Hunt finales are guaranteed when the party continues; an explicit catastrophic retreat ends the objective attempt before its finale.

## Four longer sessions and missing difficulty coverage

All existing durations remain exact. Only the required four long sessions and one missing Short/Hard contract were added, for **23 authored contracts**. Existing enemies, maps/themes and optional artwork are reused.

| New contract | Minutes | Difficulty / intent | Encounter plan | Base Gold / Arcana / XP each | Potential completion item |
|---|---:|---|---|---|---|
| The Lantern Index | 25 | Easy fieldwork | Optional bandits, Low encounter chance; no required finale | 22 / 5 / 22 | Potion 50% |
| Survey of the Old Aqueduct | 25 | Normal Hunt | Up to two weak trail skirmishes; two skeletons and an archer at the final arch | 52 / 12 / 55 | Common gear 30% |
| The Herbarium Circuit | 30 | Normal fieldwork | Optional bandits, Normal encounter chance; no fabricated finale | 38 / 9 / 38 | Potion 60%, Medkit 20% |
| An Evening at the Observatory | 30 | Hard boss Hunt | Up to two weak skirmishes; Cultist, Mage Cultist, then Necromancer as the final group | 78 / 18 / 75 | Rare gear 20% |
| Watchpost at Dusk | 3 | Hard Hunt, missing Short/Hard cell | Guaranteed Orc, Goblin and Goblin Archer; no added trail skirmishes | 14 / 2 / 16 | Common gear 10% |

Every quest now has an authored **Easy / Normal / Hard** rating and plain-language risk explanation. Cards/details show it; there is no difficulty slider. A trip copies the rating into its locked plan and recap. Missing legacy ratings default from its saved risk: high/hard → Hard, low/easy → Easy, otherwise Normal. Existing explicit saved ratings remain unchanged on reload; content edits cannot change a dispatched trip's tier.

| Duration band | Easy examples | Normal examples | Hard examples |
|---|---|---|---|
| Short, 1–3 min | Herbs, Message, Woodcutters | Grave Moss, Old Road | Watchpost at Dusk |
| Medium, 5–10 min | Clear the Cellar, Salvage the Cart | Goblin Tracks, Escort, Shrine, Cemetery | Spider Nest, Stolen Ledger, Broken Watchtower |
| Long, 15/25/30 min | Lantern Index | Aqueduct Survey, Herbarium Circuit | Existing 15-minute bosses; Observatory |

Difficulty is relative to the duration band and authored pressure: Easy is forgiving/optional or a single weak foe; Normal has baseline groups or more frequent ambushes; Hard has guaranteed armored/mixed groups, disabling threats or a boss. Hard does not mean a guaranteed wipe.

## Budgets and encounter audit

Prior care prices stay **Potion 6g, Medkit 12g, class Armor 2g/point**, free replacement hires, and existing Altar costs. No global Gold inflation or duration-multiplied reward formula was added.

- Lantern's 22g covers a Medkit (12), Potion (6), and two Armor (4); an uneventful run can instead fund useful gear. Its 25-minute safe payout is deliberately lower per minute than a dangerous Hunt.
- Aqueduct's 52g covers two Medkits (24), two Potions (12), four Armor (8), leaving 8g; 12 Arcana rewards the longer expedition without doubling a 15-minute boss payout.
- Herbarium's 38g covers a Medkit (12), three Potions (18), four Armor (8), with additional seeded supply chances.
- Observatory's 78g covers three Medkits (36), four Potions (24), six Armor (12), leaving 6g; its payout is below the existing 15-minute Black Gate's 90g/20a despite taking longer. It offers a different focus duration and objective, not a mandatory farming upgrade.
- Watchpost's 14g covers a Medkit and one Armor, or two Potions and one Armor. A bad outcome can cost more; safer contracts and free Rest remain meaningful choices.

`node scripts/focus_companion_audit.js tests/focus-companion-balance.json` samples **1,500** fresh expeditions: 100 deterministic trip IDs × five new contracts × levels 1/2/4. It uses the healthy, full-defense authored starter trio without bought gear, jobs, consumables or offline time. Level-1 samples: Watchpost 100% victory, 1.34 class Armor and 0.92 HP missing on average; Lantern 0.29 battles/run; Aqueduct 2.30; Herbarium 0.59; Observatory 98% victory and 1.39 Wounded/run. No healthy-start sample triggered retreat or died, as expected for a narrow catastrophic rule. Separate tests deliberately create battered/wounded/dead states to prove threshold and permanent-death behavior. These samples do **not** prove all class trios, wounded departures or campaign-wide economy balanced.

## Recap and persistence

Natural, automatic-retreat and early-end results reuse the frozen once-only result snapshot. The opening page shows party portraits, HP/Armor/Ward, conditions, level-ups and exact gains/totals, with a clear journal/return/ended heading. Optional input-paged Details contain planned/elapsed duration, tier, objective/end state, battles/skirmishes, retreat reason, XP, every item/quantity/effect/value, injuries/deaths and permanent wounds. Finish does not award again. Existing saved results without new metadata use a previous-expedition label instead of inventing a duration.

Schema **23** adds only required saved display preferences/position, locked difficulty, retreat/end metadata, immediate-find recap metadata and session summary fields. Schema-22 active remaining time, participants, stages, resolved battle snapshots/events, identity/history, currencies, gear/condition and jobs remain intact. The earlier six-class migration is retained. Window handles, timers and DOM objects are never serialized. There is still one open-process session clock and no offline time. Native save tests use isolated storage; the project's original save/index bytes were preserved.

## Verification and files

**161/161 focused tests pass**, zero failures/skips. The complete command is in `tests/Post_Sprint_Fixes_Testing.md`; output is `tests/focus-companion-results.txt`. Twelve new tests cover the clock projection, four durations and 3×3 tiers, threshold/non-trigger examples, actual later-fight cancellation, no healing/death rollback, exact scheduled return, confirmed/cancelled/idempotent early end and retained events, no-input completion, schema-22 migration, window failure/cancellation and monitor clamping. Earlier expectations explicitly superseded by schema 23, 23 contracts, longer durations and removal of ordinary Recall were updated without skipping checks.

Commands executed:

```text
python scripts/sync_adventurer_catalogue.py --check
node --check js/plugins/RPGManager.js
node --check js/plugins/RPGManagerProgression.js
node --check js/focus_companion.js
node --check js/focus_timer_widget.js
node --check js/plugins.js
node scripts/focus_companion_audit.js tests/focus-companion-balance.json
python tests/focus_companion_smoke.py
python tests/illustrated_travel_smoke.py
python tests/mission_background_smoke.py
python tests/focus_native_smoke.py
```

Browser: **816×624 and 1280×720** pass all four long-contract previews, ring/countdown, compact drag/hide with no underlying game action, Home/character/camp/Altar/shop/Save presence, unfocused secondary-screen timing, early-end confirmation/cancel/real save-load, automatic-return deadline/results and title cleanup. Zero page errors. Existing illustrated travel/live-defense/return/art-fallback checks pass both sizes. Background walking/focus-paused scenes/mission-job closed-time pause and resumed progression also pass. Screenshots: `tests/visuals/focus-companion-*`; outputs: `tests/focus-*-browser-results.txt`.

**Actual native verification passed** using the installed NW.js executable and the actual project package, a separate profile and isolated save storage. `tests/focus-native-results.json` records versions and checks: Windows `WS_EX_TOPMOST`, unchanged foreground HWND on open/tick, real minimize/restore clock progress, native movement and saved position, offscreen clamp, exactly one replacement widget after actual DataManager save/load, Hide preserving the quest, title cleanup, wider layout, and main-game close also closing the widget/process. Two monitors were detected; moving the widget onto the second was verified with a real Windows rectangle **(1390,24)–(1622,120)**. Native/widget screenshots were inspected. Browser mocks are not the basis of these claims.

The native harness initially needed correction: an external main URL lacked Node integration, and RAF-based test polling stalls in a hidden window. Final checks launch the actual project package and use interval polling while hidden. No replacement runtime or global installation was made. Native subprocesses needed approved sandbox escalation. The harness terminates only its own process tree and removes its generated profile/storage folder.

Runtime changes: `RPGManager.js`, `RPGManagerProgression.js`, `index.html`; new isolated display files `js/focus_companion.js`, `js/focus_timer.html`, `js/focus_timer_widget.js`. Data: `data/RPGManagerStage3.json`. New tests: `focus_companion.test.js`, `focus_companion_smoke.py`, `focus_native_smoke.py`; focused existing fixtures updated only for superseded contracts. The simulator, BattleStage, plugin order, class/dialogue source and all raster assets are unchanged. Current handoff/context/architecture/testing documentation is updated. Exact changed-file manifest: `docs/Focus_Companion_Changed_Files.md`.

## Limits and beginner native playtest

Physical mouse dragging, monitor hot-unplug/DPI changes, long overnight operation and subjective chime audibility still merit manual checking. Programmatic movement, two-monitor placement, offscreen clamping, native topmost/focus behavior and minimize/restore were actually checked; monitor hot-unplug was not. Click-through is intentionally absent. The healthy-trio audit is not exhaustive balance proof. Historical wildcard suites still contain obsolete fixtures; they are not claimed green.

1. Open `game.rmmzproject` and Playtest. Continue an existing save or choose three companions. The upper-right dial should say Ready; browse Short/Medium/Long and compare their fixed tiers and times.
2. Start Lantern Index (25 minutes) or Herbarium Circuit (30). Use ⋯ → Show floating timer. Return to a reading/writing app; the small timer should stay above it without taking focus. Drag it, move it to another monitor, and hide X; the quest continues.
3. Open a character, camp jobs, shop or Save while the session runs. Both countdowns must agree. Minimize/restore; then save, close, wait and Continue. Open-process time advances; closed time does not.
4. Try ⋯ → End Session Early, choose Keep, then try again and confirm. It should immediately show 00:00/Ended, keep previous finds/consequences, award no completion rewards/XP, and remain stable after reload.
5. Run a Hunt/boss without touching anything. A truly battered party may narrate an automatic return before another fight; its timer must still reach the original end. At completion glance at the journal or optionally page Details, then Finish and choose the next break-time activity.
