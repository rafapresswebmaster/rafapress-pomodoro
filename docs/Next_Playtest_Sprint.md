# Next playtest sprint — October 14, 2026

The later October 14 **Visual Battle Sprint** supersedes the battle drawing/layout and active-session hint strip below. Current presentation, art/animation/fallback contracts and 131-test/seven-browser verification: `Visual_Battle_Sprint.md`. Existing gameplay/idle Home contracts remain; older sections retain their delivery history.

Implemented the supplied `Teamfight_Manager_Next_Playtest_Sprint_Codex_Brief.md`. This supersedes the starting-party, Home layout, completion action, consumable effects and sound contracts in the earlier Pomodoro delivery documents. The current workspace handoff was used; the numbered `(7)` handoff named in the brief is not present locally.

## Implementation map and delivered behavior

| Goal | Owner and implementation |
| --- | --- |
| Timer-first expedition | `RPGManager.js`: `Scene_RPGHome.layoutExpedition` gives a running quest the entire content width by default. The honey arrow tab and Shift open/close the roster; opening places it beside the expedition. Results open the roster automatically. `drawSessionClock` and the independent focus/visibility refresh retain the prominent 40 px countdown. No scene/input update is required for visible unfocused paints. |
| Home roster | `Window_RPGCampRoster`: three numbered active slots, framed portraits, current/max HP, textual Healthy / ! Wounded labels, role/job or away status, explicit vacancies, separate Graveyard count/Dead archive and Tavern candidate count. Refreshes after state changes/load. Following the Home HUD correction, the animated woodland campsite is restored on the left of idle Home; this information panel sits on the right instead of Life at Camp. Workshop/Study/Rest members walk to their destinations and display their interaction props. Camp Jobs retains its campsite preview. |
| Results and actions | `Window_RPGExpeditionPanel.drawResults`: saved participant portraits, individual HP/Armor/Ward/condition, wounds and level-ups, exact saved rewards/totals and paged details. Honey **Finish** dismisses to Home even with vacancies, without awards; the Home vacancy notice points to Tavern. Recall keeps its warning, safe default and distinct bordered consequential action. |
| Event sounds | Progression `queueEventCue` records authoritative automatic-event/opportunity and battle-start/end boundaries, keyed per trip/stage. `consumeEventCues` consumes independently of paints/playback. UI queues quiet existing **Book1**, **Bell2**, **Item1** cues, spaced at least 900 ms; completion keeps **Chime1**. All respect saved Alerts. Muting clears queued audio. Owned optional buffers stay outside MZ's mandatory SE error cache; creation/playback exceptions and asynchronous failures dispose safely. |
| Starting choice | Title New Game calls `beginStartingRoster`, then `Scene_RPGStartingRoster`. Choose exactly three of the ten existing authored adventurers. Portraits, roles, HP, class purpose, signature and personality distinguish them. Selection count, reversible selection, disabled fourth selections, a persistent Start Adventure button and Back to Title are provided. `confirmStartingRoster` validates the complete set before hiring; selected three become founding members in `activeSlots`. Existing saves bypass setup. |
| Tavern | `replacementCandidates` preserves unchosen authored candidates, deduplicates IDs, excludes every existing active/dead/dismissed/archive record and tops up to at least five valid available options. Fresh confirmation leaves seven authored candidates. A full party can browse; hiring is free, camp-only and vacancy-only. Old candidate lists are retained and topped up rather than silently replaced. |
| Consumables | `SHOP` / `useItem`: Potion restores **2 HP**, never treats Wounded; Medkit treats **Wounded** and restores **1 HP**, preserving permanent injuries. Both cap at max HP, cannot revive or be used away, and consume one stock. Medkit requires Wounded; Potion rejects full HP. Item IDs, prices, purchase/find/reward probabilities and inventory persistence are unchanged. |
| Item recognition | Existing IconSet icons 176/160, with distinct code-drawn bottle/medical-case fallbacks. Icons accompany consumable choices in Armory/Supplies, Armory detail, quest supply reward chances and item rows in Results Details. Names and exact effect descriptions remain available. |
| Dialogue | Editable `context/Adventurer_Classes_and_Dialogue.md` now owns two lines per context for all thirteen classes: travel, clues, battle start/end, ability, attack, hit, near miss, supplies and return. `expeditionLine` rotates speakers/variants with saved counters; battle flavor follows actual structured events with at least four events between new contextual lines. Travel/return are queued captions. No additional mission time or combat mutation is introduced. Sync validates optional pools and regenerates runtime dialogue. |
| Missing art | Shared `managerArt` caches optional portraits, walking sheets and item atlas outside MZ's fatal image cache. Existing code-native glyphs/text remain when art fails. The woodland image and core windowskin retain their existing fallback behavior. |

The HP evidence is the current `SMALL_HP` map (3 for Mage/Mystic, 4 for several lighter roles, 5 for frontliners), integer HP loss after Ward/Armor, and Wounded continuation at low HP. The former 50/30 healing amounts saturated every class. Two HP makes Potion useful across this scale; one HP plus treating Wounded makes Medkit a distinct consequence-management item. Rest still restores HP after one running-session minute and preserves Wounded/permanent injuries. No unrelated equipment/economy balance was changed.

## Files and save compatibility

Runtime: `js/plugins/RPGManager.js`, `js/plugins/RPGManagerProgression.js`. Content: editable catalogue and generated `data/RPGManagerDialogue.json` (class stats/moves unchanged). The battle plugin, quest durations, authored rewards/XP, death odds, production rates, equipment rules and process-session clock are unchanged.

Schema remains **21**. Optional fields are `startingRosterPending` (only explicitly set by New Game), `eventCues`, per-trip `eventCueKeys`, `flavorCount` and `flavorUsed`. Existing `activeSlots`, stock and result snapshots remain compatible. Load clears pending event-audio delivery, retains consumed boundary keys, and resets clock anchors as before; neither loading nor replay creates new cues. Existing completed snapshots already contain portraits; missing legacy portrait data has a glyph fallback. Existing campaign parties are never forced through starting selection. Pre-sprint runtime/content copies are in `backups/next-playtest-before/`.

Tests added: `tests/next_playtest.test.js`, `tests/next_playtest_smoke.py`. Existing focused renderer/candidate/layout fixtures and five retained browser scripts were updated for new-game selection, Finish returning to Home, and Home information panel replacing Life at Camp while the animated campsite remains on the left. The clock smoke observes the restored state in the same load evaluation, before an independent open-session interval can legitimately tick; it still asserts exact closed-time exclusion. No tests were skipped.

## Verification

- Focused command in `tests/Post_Sprint_Fixes_Testing.md`: **120/120 pass**, zero failures/cancellations/skips. This retains 107 earlier checks and adds thirteen feature checks. Output: `tests/next-playtest-acceptance-results.txt`.
- `node --check` passes for all three custom plugins.
- `python scripts/sync_adventurer_catalogue.py --write` followed by `--check`: thirteen classes, 26 moves, validated dialogue and catalogue/runtime agreement.
- Browser acceptance: `python tests/next_playtest_smoke.py` at **816×624 and 1280×720**. Covers real onboarding/selection/Start, existing-save continuation, five-plus Tavern browse, long names, wounded roster, item effects/icons, collapsed/open expedition, actual toggle clicks, visible focus-gated countdown paints with zero scene updates, hidden paints/restore, stable results/details/load/Finish, muted/once-only cues, synchronous failure and real aborted requests for all three event sounds, and missing portrait/walking art. No page errors.
- Retained Chromium regressions pass: `pomodoro_sprint_smoke.py`, `pomodoro_focus_smoke.py`, `post_sprint_smoke.py`, `cozy_ui_smoke.py`, `mission_background_smoke.py`. Coverage includes free zero-Gold replacements, dismissal/archive/death, worn equipment, once-only settlement/completion cue, jobs, boss playback, five-enemy stress, shared screen bounds, missing camp art, walking animation, minimized clock and closed-time pause.
- Screenshots: `tests/visuals/playtest-{816,1280}-*.webp`, including new game/three selected, camp roster, Tavern, item detail, active collapsed/open, unfocused-visible, results/details and missing portrait. Representative onboarding, roster/open expedition and results screenshots were inspected; the Start button and result text were improved during review.

Historical wildcard failures recorded in the earlier testing guide use superseded mechanics. They were not rerun or claimed fixed by this sprint.

## Native playtest still pending

Browser focus/visibility simulations are not OS window verification, and intercepted/failed sound delivery does not establish native audibility. No native interactive MZ/NW.js acceptance is claimed.

1. New Game: select/deselect different companions; confirm three; Back to Title; then Continue an older save. Verify unchosen candidates and free replacements.
2. At both sizes, inspect roster HP/Wounded/Dead archive, long names, quest/battle/dialogue, arrow/Shift toggle, Recall warning, result portraits/details and Finish.
3. Use another application while the game remains visible: countdown must visibly change. Minimize/restore, then save/close/wait/Continue: running time advances; closed time does not.
4. Listen to the three quiet event cues and completion chime. Check their relative levels/identity, once-only behavior and mute during a run. Native OS/WebAudio background restrictions remain unverified.
5. Use/find/buy Potion and Medkit at low/nearly full HP; verify wound treatment versus persistent scars, counts and reward icons. Complete/recall, reload results and Finish without duplicate rewards.

## Project assessment

The strongest part is the bounded management loop: choose a trio, dispatch an authored focus duration, observe deterministic consequences, then make recovery/replacement decisions. The domain/presentation split, stable saved results and independent running-session clock have substantial focused and browser coverage. Free vacancies prevent a death/zero-Gold soft lock; the new roster and expanded quest area expose the decisions more clearly.

The project is ready for a small supervised player test after native acceptance. The biggest remaining risks are native background audio/rendering, unmeasured human balance at 3–5 HP, and historical regression fixtures that no longer provide a reliable broad signal. Browser checks establish execution and layout, not whether personalities, sound mix or recovery choices feel satisfying.

Next three improvements: (1) run the native route and gather a few real-player observations on timer clarity, cues and consumable value; (2) improve consequence explanations and readable Altar character labels so Wounded, permanent scars, Armor and reanimation choices are easier to understand; (3) audit/retire obsolete test fixtures into a clean documented regression baseline. Avoid adding major systems before that evidence.
