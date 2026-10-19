# Pomodoro focus sprint - October 14, 2026

The October 14 **Next Playtest Sprint** supersedes starting-party, Home roster/layout, Finish action, event-sound and consumable contracts below. Current implementation/visual acceptance: `Next_Playtest_Sprint.md` (120 focused tests, six browser suites; native checks pending). Older sections retain their delivery history.

Implemented `Teamfight_Manager_Pomodoro_Sprint_Codex_Brief.md` against the earlier October 14 focus update. This sprint replaces the fixed-founder restriction with three active slots, free Tavern replacements and confirmed dismissal, and adds the prominent live countdown and completion cue. The earlier travel transitions, reverse return scenery, stable results, job cues and removed repair/Pace/Campaign/Bathhouse controls remain.

## Active slots, Tavern and archive

`state.activeSlots` contains exactly three IDs or `null` vacancies. A New Game starts with Ada, Bram and Cora. Every dispatch uses all three filled slots automatically; `dispatchQuest` enforces this at the progression boundary, regardless of any stale team draft. No party review, subset, leader or formation chooser is offered.

Death clears a slot and retains the record for Graveyard/history. A result with vacancies directs its single action to **Tavern / Free Replacements**. Tavern remains reachable from Home or the roster even when all slots are empty and Gold is zero. Each chosen candidate fills one vacancy for **0 Gold**, and hiring cannot exceed three active members. Candidates reuse the existing recruitment classes, identities, names and sprites. The list replenishes deterministically when exhausted; there is no hourly hiring wait or paid recruitment expansion.

Active member details now offer **Dismiss** at camp. Choosing it opens confirmation; cancel leaves the party intact. The domain also requires explicit confirmation and rejects dismissal during any active expedition. A dismissed character remains alive in `state.roster` with `dismissed: true` / `retiredReason: "dismissed"`, preserves identity, career and history, and does not enter the Graveyard. Equipped items return once to shared stock. The vacancy uses the same free Tavern flow.

Returned slotted equipment now retains its remaining Armor in an optional `equipmentConditionStock` queue. Re-equipping it on a replacement does not restore Armor. Legacy stock without condition metadata uses its existing default; equipped legacy condition is captured when returned. No repair action, cost or new equipment market was added. The comparison panel reports the actual available remaining Armor.

Existing Altar reanimation remains an optional ritual under its unchanged Arcana costs. It is camp-only, can fill a vacancy, cannot grow a full party and preserves the existing undead/static-sprite behavior. Free Tavern hiring remains available independently of Gold or Arcana.

## Countdown and completion alert

The right panel draws a fixed **40 px MM:SS** countdown at `(8, 0)` throughout outbound travel, battle, return and results. The quest name, phase and progress bar are secondary. Results retain **00:00 / Complete**, plus the outcome. Recall is labeled Recalled. Low remaining time uses a steady honey color without flashing. Home communicates Ready, Running or the need to fill slots.

MZ normally skips `Scene.update()` when `document.hasFocus()` is false, although its graphics ticker still renders. The independent session-clock interval now refreshes the Home bitmap/header while unfocused and visible, with a guarded render request. It does not call full scene/input updates, consume an additional clock delta or reroll combat. Focus and visibility restoration synchronize and repaint immediately. Hidden/minimized displays skip this paint path while the authoritative clock still runs. Closed-process time remains excluded. Battle playback retains its existing foreground-only policy; the new background path is a display refresh for the clock and settled results.

Successful settlement creates `completionCue` once. The runtime consumes and records it **before** attempting a quiet existing `Chime1` sound. **Alerts: On / Muted** is a single Home toggle, saved with the game; default is On. Muted cues are consumed without sound. Synchronous errors and asynchronous missing/undecodable sounds are isolated from MZ's mandatory SE cache, caught/disposed, and cannot delay results or retry every frame. Muting also stops a pending/playing optional chime. Loading completed results suppresses a pending/handled cue, and dismissing results never creates a new one. The static Complete state is the visual completion indication. Recall does not create a completion chime.

Home now has ten actions in five columns and two rows: Guild Hall, Quest Board, Armory, Tavern, Altar, Graveyard, Camp Jobs, Alerts, Save and Return to Title. Normal-play DEBUG remains disabled. The supported layouts retain readable combat, camp props and results Details pages.

## Save compatibility

Schema remains **21**; the changes are additive fields and boundary rules, not a schema bump solely for removed screens.

- If `activeSlots` is absent, choose eligible living, non-dismissed, non-retired Ada/Bram/Cora first, then eligible legacy records in stored order, up to three. Previously retired overflow is not silently promoted. Existing slot arrays preserve vacancies; unknown/dead/dismissed/duplicate IDs become `null`.
- Overflow stays retired with identity/history intact. Its gear returns once when it is no longer away. An active legacy expedition keeps every original participant, clock, fighter snapshot, outcome and consequence; additional legacy results remain on Details pages.
- The earlier B-to-A single-slot/deferred-B migration remains. Supported full `activeQuest` records with prepared teams promote intact into A instead of being discarded. Unsupported incomplete manually saved legacy records remain in `legacyInterruptedQuest`; their existing recovery route grants no rewards.
- A stale active trip already recorded in `settledTrips` restores its saved results without another award or alert. Normal repeated settlement/dismissal cannot resurrect results.
- Recruitment timer data remains compatible but does not gate free hires. Old pace preferences normalize to Standard. Repair APIs remain inert with zero charge; campaign/history data remains for contracts, character sheets and the Graveyard.
- New slot, stock-condition and cue fields survive normal MZ save/load. Loading resets mission/job anchors, preserving saved remaining time and fractions without consuming closed time.

## Files changed

| File | Responsibility |
| --- | --- |
| `js/plugins/RPGManagerProgression.js` | Active-slot migration and dispatch, free candidates, confirmed dismissal/archive, death vacancies, condition-preserving gear returns, settlement cue, supported legacy quest recovery and Altar cap compatibility. |
| `js/plugins/RPGManager.js` | Tavern/dismissal and Graveyard UI, ten-action layout/mute toggle, fixed prominent timer, inactive-visible refresh/restore, safe chime delivery, completed results and replacement direction. |
| `data/RPGManagerUI.json` | Restores Tavern as free vacancy filling; keeps obsolete actions and DEBUG absent. |
| `tests/pomodoro_sprint.test.js` | Twelve new checks for zero-Gold empty parties, cap/away restrictions, confirmation/archive/equipment, unique candidates, slot migration, stable death results, cue/reload/mute, activeQuest recovery, reanimation cap, malformed candidates and damaged-gear transfer. |
| `tests/pomodoro_sprint_smoke.py` | Actual MZ windows at both sizes; dismissal/cancel, all-empty free hiring, Graveyard, replacement dispatch, font/bounds, visible focus-gated timer paints, hidden restore, mute, cue persistence/failure, death-to-Tavern and returned gear. |
| Existing focused tests and `pomodoro_focus_smoke.py` | Updates superseded founder-only/Tavern/dismissal expectations and renderer extraction; retains combat, timing, migration and settlement checks. |
| Handoff, context index, architecture and testing guide | Current sprint contracts, migration, outcomes and native checklist. Earlier delivery/visual notes are marked historical. |

The combat plugin, authored quest catalogue, durations, injury/death chances and production rates are unchanged. Pre-sprint copies of the three edited runtime/UI files are in `backups/pomodoro-sprint-before/`. This workspace has no Git repository.

## Verification

The exact current selection is in `tests/Post_Sprint_Fixes_Testing.md`: **107/107 pass**, zero failures/cancellations/skips. It retains the previous 95 tests and adds twelve sprint checks. Tests were revised for active slots and free Tavern/dismissal, the larger timer header and current renderer wiring; none were skipped to hide failures. All three plugins pass `node --check`.

Browser commands:

- `python tests/pomodoro_sprint_smoke.py`: PASS at **816 x 624** and **1280 x 720**, zero page errors. Exercises actual windows/canvas drawing, not only state. In the visible focus-gate test, `SceneManager.isGameActive` is set false for 6.5 seconds: scene updates remain **zero**, at least five distinct countdown strings are painted, and the displayed number matches authoritative remaining time. The clock remains the largest text at the same coordinates through completion. A hidden-document simulation verifies no timer paints, a muted settlement, immediate correct repaint on restore, and no extra cue. Cue attempts are intercepted to verify once-only, mute/reload/dismiss and both thrown playback failure and a real aborted Chime1 audio request; this does not claim actual native sound audibility.
- `python tests/pomodoro_focus_smoke.py`: PASS at both sizes, zero page errors; retained job cues, travel/return, results/Details/stress, save/load, blocked dispatch and static reanimated sprites.
- `python tests/post_sprint_smoke.py`: PASS, zero page errors; real production, filters, boss simulation/playback and active/results save/load.
- `python tests/cozy_ui_smoke.py`: PASS at both sizes, zero page errors; shared screens, copied three-companion/five-enemy battle, defense stacks, text bounds and missing-art fallback.
- `python tests/mission_background_smoke.py`: PASS; actual walking frames, authoritative focus-paused mission progress, closed-time pause and resumed session time.

Screenshots: `tests/visuals/sprint-*.webp`, including free Tavern, dismissal confirmation, all-empty camp, Graveyard, running/unfocused clock, Complete, restored muted completion and death results. Representative default-size Complete/Tavern/clock screenshots were inspected. Automated focus/visibility simulations establish the code paths; native OS window behavior remains to be checked below. Historical wildcard suites retain superseded fixtures and are not the current acceptance suite.

## Native MZ/NW.js checklist - pending

1. At both supported sizes, inspect the ten actions, clock prominence/contrast, long names, three-member travel and readable enemy cards, results and every Details page.
2. Dismiss/cancel/confirm at camp; ensure dismissal is unavailable while away, preserves the living archive, returns worn gear without restoring Armor, and creates a vacancy.
3. Test zero Gold with one, several and all three slots empty. Tavern stays reachable, every hire is free, and all three new members dispatch automatically. Verify deaths remain in Graveyard and dismissed members do not.
4. Put the running game on a second monitor and work in another application: the visible MM:SS must continue changing. Minimize/restore and verify immediate correct time/results. Save/close/wait/Continue must exclude closed time.
5. Verify the gentle chime is audible once on native unfocused/minimized completion where the OS/audio context permits it. Test mute, save/load completed results and dismissal; none should replay it. Browser tests verify delivery attempts, not native audibility.
6. Check job reassignment/reading/work/rest cues, persistent wounds/death and retained Armor, intermediate battle handoff and smooth reversed return scenery.
7. Test legacy larger/active/B expeditions, vacancies, saved worn inventory and pending results. Rewards/consequences apply once and no extra member joins a new expedition.

Native interactive MZ/NW.js checks have not been performed. No requested implementation is blocked; actual desktop visibility/rendering and sound acceptance remain manual verification.
