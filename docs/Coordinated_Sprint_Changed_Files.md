# Coordinated sprint changed files

October 15, 2026. Current save schema 24. Full behavior and executed verification: [Coordinated_Sprint.md](Coordinated_Sprint.md).

Runtime/configuration:

- `js/plugins/RPGManagerBattle.js` ? deterministic 50/50 fate and automatic class-special effects; initial defense capacity.
- `js/plugins/RPGManagerProgression.js` ? schema 24, permanent injury/initiative, incapacitation/save handling, XP/encounter tuning, passive recovery, name pools, consequence/recap and playback projection.
- `js/plugins/RPGManagerBattleStage.js` ? expanded stage, compact identity/capacity pips, authored battleback routing, critical/fate effects and compact log.
- `js/plugins/RPGManager.js` ? unified skin/buttons, single visible countdown, full-width recap, inline camp care/gear, clickable full-sheet slots, healing cross, fate audio, inactive update/cursor and native close cleanup.
- `package.json` ? native Chromium background/occlusion flags.
- `data/RPGManagerStage3.json` ? 23 quest art routes, Short Normal Hunt/XP, Ogre-captain Hard risk/reward.
- `context/Adventurer_Classes_and_Dialogue.md` ? revised first signatures, calibrated injury rules and refreshed source tables.
- `data/RPGManagerClasses.json` ? generated first-signature definitions. Dialogue JSON was resynchronized without intentional content changes.

Tests/scripts:

- New `tests/coordinated_sprint.test.js` (17 tests), `tests/coordinated_sprint_smoke.py`, `tests/coordinated_native_smoke.py`.
- Existing tests updated without deletion/skips: `death_stabilization`, `focus_companion`, `illustrated_travel`, `next_playtest`, `polish_tuning`, `pomodoro_focus`, `pomodoro_sprint`, `post_sprint_fixes`, `quest_window_polish`, `readability_progression`, `stage1_camp_home`, `visual_battle_stage` (`tests/*.test.js`). Expectations now cover requested fate/schema/camp/XP/layout behavior.
- New `scripts/coordinated_sprint_audit.js` and `scripts/coordinated_sprint_route.js`; no disposable edit scripts remain.
- `tests/Post_Sprint_Fixes_Testing.md` ? current 178-test command and acceptance evidence.
- `tests/next-sprint-results.txt`, `tests/next-sprint-browser-results.txt`, `tests/coordinated-sprint-browser-results.txt` ? executed gates.
- `tests/coordinated-sprint-balance.json` and `-balance-results.txt`, `tests/coordinated-sprint-route.json` and `-route-results.txt` ? reproducible audit/route results.
- `tests/coordinated-sprint-native-results.json` and `.txt`, `tests/coordinated-sprint-native-baseline.txt` ? final native evidence and earlier close-race diagnostic. Existing focus-native JSON/screenshots may have been refreshed by the baseline harness; use the new coordinated native evidence as current.
- `tests/visuals/coordinated-*`, `coordinated-native-*`, refreshed `focus-companion-*` ? actual browser/native captures. Temporary native profiles/saves were isolated and cleaned; normal saves were not intentionally edited.

Handoff/documentation:

- `context/Teamfight_Manager_Post_Sprint_Handoff.md`, `context/README.md` ? current snapshot/index.
- `context/archive/Teamfight_Manager_Focus_Companion_Handoff_2026-10-15.md` ? preserved schema-23 baseline.
- `docs/Coordinated_Sprint.md`, this manifest ? implementation, rationale, risks, verification and fresh-game route.

No new art/audio/plugin dependency, focus clock, backend or build system. Installed engine/Pixi libraries and normal save files were not modified.

HUD follow-up: `RPGManager.js` now hides the timer without a positive active countdown and lays out the eight camp actions as two full-width rows of four. `coordinated_sprint_smoke.py` checks idle/results visibility, active visibility and navigation width; `focus_companion_smoke.py` expectations follow the same rule. Handoff/delivery notes updated; schema remains 24.
