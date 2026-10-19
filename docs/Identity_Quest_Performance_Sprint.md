# Identity, quests and performance sprint

Completed October 15, 2026 against the supplied next-sprint brief. Existing MZ 1.10.0, PixiJS 5.3.12, NW.js and four-plugin order remain intact. No new art, audio, backend or build system.

## Delivered behavior

- Six canonical classes each have male/female identities, ten exclusive first names per category (120 total). Tavern offers all 12 categories and immediately replaces hires. Seeded identity generation, active-name collision protection and existing portraits remain. Gender/class appear in hiring, roster, sheets, selection and recap.
- Optional encounter probabilities are Easy .60, Normal .85, Hard .98. Safe and guaranteed encounters retain their rules. Authoritative per-battle special limits replace expedition-wide limits. Each new battle resets availability; duplicate simulation/presentation cannot spend it twice. All six existing effects remain, with short class-colored wind-up/impact cues and truthful effect text; unfocused/reduced presentation skips effects without changing simulation.
- Editable JSON contains 460 contract-specific notes (20 per each of 23 contracts) plus 20 thematic shared notes. Shared notes supplement rather than replace contract content. Event-aware selection avoids immediate repeats; missing/malformed data falls back safely. XP notes come from settled results, include recipient scope and level-ups, and report zero for early end/retreat as appropriate.
- Selected authored background is locked through expedition travel/battle/results; existing distinct assets and validated biome fallback remain. Purple backdrop, gold HP/Armor/Ward panels and bounded effects work at both supported sizes, including numeric fallback for oversized stats.
- Quest board has compact duration tabs, larger readable cards, difficulty text/markers, visible Gold/Arcana/XP and recommended level. Confirmation lists quest, party, duration and rewards; only Start dispatches. Cancel/Escape leave the clock idle.
- Redundant Guild Hall action removed; right camp panel provides roster/careers and recruitment information. Seven home actions fill both rows, including the formerly blank lower-right space. Camp navigation switches directly from sheets and preserves context; active quests lock those menus. Keyboard, mapped controller input and mouse paths are covered. HUD omits time without an active countdown.
- Native close has exactly Save and Exit, Exit Without Saving, Cancel. Save waits for campaign and MZ global index writes; errors retain game/timer. Repeated close is guarded. Exit cleans the optional floating timer. Boot-time fallback remains available before manager initialization.

## Balance evidence and remaining gap

Class stats, growth, HP, defense, damage, initiative and six effect interactions were audited together; no blanket class nerf was warranted. Existing low integer stats make a one-point class change disproportionately destructive. Instead encounters use copied, explicit quest tuning: Normal Short/optional +3 enemy HP, required Medium +6 and required Long +5, unchanged damage; Hard Short +4 HP, Medium +5, Long +1 and all Hard +1 damage. Weak travel skirmishes stay 1 HP/1 damage. Base class catalogue, fate/injuries, gear conservation and reward/XP amounts remain unchanged.

The 8,280-run audit covers all 23 contracts, three parties, levels 1/2/4, 20 seeds and two gear configurations. JSON/text reports include party, level, duration, difficulty, encounter-count buckets, wounds, deaths, retreats, XP and rewards. Untuned baseline is retained separately. Intended levels are Normal 1, Hard Short/Medium 2 and Hard Long 4, visibly disclosed in the UI.

| Intended-level healthy party | Normal objective wins | Hard objective wins |
|---|---:|---:|
| No gear | 88.1% | 65.9% |
| Ordinary leather cap per member | 98.1% | 76.5% |
| Brief target | 80-90% | 50-70% |

No-gear Normal Short/Medium/Long: 83.3/89.6/90.0%. Hard at intended levels: 53.3/64.4/69.3%. Level-one Hard is deliberately dangerous (1.7/12.2/2.7% by duration); warnings matter. Purchased gear remains a meaningful advantage: the measured remaining gap is geared Normal +8.1 and Hard +6.5 percentage points above target ceilings. No hidden gear scaling was added to force a target. Objective success can include casualties; no-gear Normal averages roughly .42-.53 deaths/run. The fresh deterministic 16-mission route includes paid equipment, camp-only recovery and free vacancy replacements: 3 deaths, 403 final Gold, surviving levels 4/3/3. Historical guaranteed 24-mission routes are superseded.

## Save compatibility and authority

Schema remains 24. New identity/narrative/quest fields are backward compatible; old candidates are normalized and missing categories restocked. Battle-local spent flags do not carry into the next encounter. Existing closed-time exclusion, exactly-once settlement, fate, injuries, gear/wear, work/study and camp care remain. A discovered legacy 15-minute load clamp now allows all existing durations through 30 minutes; active 25/30-minute saves preserve total/elapsed/remaining and gain no closed-time progress. Native tests use isolated save directories, not the user's campaign.

## Verification

Focused suite: **195 passed, 0 failed, 0 skipped**. Exact command:

```powershell
node --test --test-isolation=none tests/post_sprint_fixes.test.js tests/stage1_camp_home.test.js tests/stage2_realtime_loop.test.js tests/stage3_catalogue.test.js tests/stage4_realtime_presentation.test.js tests/stage5_equipment_repair.test.js tests/recoverable_errors.test.js tests/item_persistence.test.js tests/polish_tuning.test.js tests/small_roster_rework.test.js tests/death_stabilization.test.js tests/complete_battle_sequence.test.js tests/quest_window_polish.test.js tests/mission_background_clock.test.js tests/pomodoro_focus.test.js tests/pomodoro_sprint.test.js tests/next_playtest.test.js tests/visual_battle_stage.test.js tests/illustrated_travel.test.js tests/readability_progression.test.js tests/focus_companion.test.js tests/coordinated_sprint.test.js tests/sprint2.test.js
```

Other exact commands (all passed):

```powershell
python scripts/validate_sprint2_content.py
python scripts/sync_adventurer_catalogue.py --check
python tests/coordinated_sprint_smoke.py
python tests/focus_companion_smoke.py
python tests/sprint2_smoke.py
node scripts/sprint2_balance_audit.js
node scripts/sprint2_campaign_route.js
python tests/coordinated_native_smoke.py
python tests/sprint2_native_close.py
python tests/sprint2_native_profile.py
```

The native profile was run before and after implementation, writing the corresponding profile artifacts. `node --check` passes for js/main.js and all four manager plugins. Browser gates cover 816x624 and 1280x720 with zero page errors. New gate includes every class special, real mouse/keyboard and MZ controller-mapped input, direct sheet navigation, modal focus/confirmation, locked art, panels, early XP and optional narrative HTTP 404. Unit tests cover all 12 hire/restock categories, exclusive pools, malformed data, duplicate special attempts and save-time regressions. Intentional existing assertion updates reflect recruitment, per-battle specials, confirmation and harder battle consequences; no tests were skipped.

Native NW.js 0.48.4 / Chromium 85: Cancel, repeated close, forced save failure, Exit Without Saving, real successful Save and Exit, reload and active deadline preservation all pass with no errors. Optional timer cleanup passes both exit paths. Separate native playback gate passes actual Windows foreground separation, minimize/restore progression/cursor, topmost non-activating floating timer, position, two monitors, save/load and process cleanup. Under CDP document.hasFocus can stay true; OS HWND is the focus evidence. Physical controller hardware, audio listening, DPI/hotplug and overnight stability are not claimed.

## Native profile

Concrete sources: full scene reconstruction every frame, duplicated travel-width allocation, repeated result redraws, and rendering while minimized. Changes throttle scene redraw (33ms foreground/66ms document-unfocused), cache frozen results, remove unused mirrored background, stop the renderer while minimized and resume/synchronize on restore. The single authoritative interval still synchronizes every 250ms, independent of render; presentation remains bounded. No second reward clock.

| Scenario (2 seconds each) | Refreshes before/after | Renderer CPU ms before/after | After clock snapshot lag ms |
|---|---:|---:|---:|
| camp | 2 / 3 | 485 / 641 | n/a |
| travel_timer_off | 123 / 60 | 781 / 688 | 13.7 |
| travel_timer_on | 121 / 59 | 891 / 468 | 0.9 |
| unfocused | 112 / 58 | 1015 / 578 | 2.7 |
| minimized | 122 / 0 | 859 / 109 | 187.1 |
| restored | 121 / 61 | 953 / 734 | 7.2 |
| battle_effects | 121 / 60 | 1016 / 671 | 11.9 |

Restore protocol response: 15.3ms before, 15.0ms after. Seven two-second samples per run (14 sampled seconds plus transitions), same installed runtime. CPU is renderer-process consumption, not whole-system or floating-child totals; desktop load varies. Camp CPU increased in this run, so no universal CPU/memory/FPS improvement is claimed. Minimized zero render refreshes with continuing clock/cursor are intentional; the 187ms sampled projection lag is within the 250ms sync interval, then restore catches up from the authoritative deadline. RSS snapshots are retained in JSON, not evidence of leak-free long sessions. Results do not establish overnight stability.

## Evidence and delivery

Results: `tests/sprint2-results.txt`, `sprint2-browser-results.txt`, `sprint2-focus-browser.txt`, `sprint2-new-browser.txt`; balance/route/tuning JSON and text; `sprint2-native-close.json`, `sprint2-native-playback.json`; `sprint2-profile-before.json`, `sprint2-profile-after.json`; screenshots under `tests/visuals/sprint2-*`. Reproducible tuning sweep: `node scripts/sprint2_tune.js`.

See [changed files](Identity_Quest_Performance_Changed_Files.md) and [current handoff](../context/Teamfight_Manager_Post_Sprint_Handoff.md). Remaining measured limitation is the geared balance gap above; hardware/manual and long-duration limits are explicitly recorded above. No implementation item from the brief is left pending.
