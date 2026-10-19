# Pomodoro focus update - October 14, 2026

The later October 14 `Pomodoro_Focus_Sprint.md` supersedes fixed-founder/recruitment-disabled/dismissal rules and the timer/alert layout. Current acceptance is 107 tests; the sections below retain their earlier implementation and verification history.

Implemented from `Teamfight_Manager_Pomodoro_Focus_Update_Codex_Brief.md`, using the October 14 handoff and current code as the baseline. The game now centers on selecting an authored focus session, automatically sending Ada, Bram and Cora, watching the journey, and reviewing settled results. No new campaign system, imagery, combat balance or death probability was added.

## Implemented behavior

- Quest Board dispatches the three founders immediately. No party review, member toggles, leader chooser, recruitment or founder dismissal is offered. The first founder leads automatically; existing in-quest succession remains. Dead/missing founders block dispatch with an explanation. Existing Altar rules, including reanimation, are preserved.
- In-quest victory and sole-survivor captions display over moving travel. Expired presentation events clear on the next update, so the last battle frame cannot linger. All copied battle events and authoritative outcomes remain intact. A completed session opens results immediately, without waiting for playback.
- Trees and ground details use an accumulated road offset. Return reverses its increment without resetting the offset or moving the foreground formation. Outbound and return poses retain the existing sprite directions.
- `completeReturn` creates a result snapshot after rewards, XP, finds, consequences and existing innate-Ward restoration. It includes HP/Armor/Ward, Healthy/Wounded/Dead, permanent injuries, exact earned Gold/Arcana, totals at return, all item names/quantities and actual new levels. Rest, purchases or later character edits cannot change the saved snapshot. Recall produces results containing only already acquired earnings, without completion XP/rewards.
- The right panel displays Quest Results, with one Back to Camp action. Details pages show every find, level-up and permanent injury; click the Details/Page button or use Page Up/Page Down. Pages change only through input. Results survive save/load and remain until dismissed. Quest Board is disabled while results are pending. Dismissal never applies rewards or consequences again.
- Home has eight actions in a compact four-column, two-row layout: Guild Hall, Quest Board, Armory, Altar, Graveyard, Camp Jobs, Save and Return to Title. Repair, Pace, Campaign, Bathhouse, Tavern and normal-play DEBUG are absent.
- Camp Jobs retains Workshop (stored as `work`), Study, Rest and Idle. Workshop earns 1 Gold per minute per founder; Study earns 1 Arcana per five minutes; Rest restores full HP after one minute without removing persistent wounds, scars, traits or death. All three stop producing while away. Book, hammer/workbench and rest cues are small code-drawn animations beside the existing sprites, with static fallbacks. The Camp Jobs screen previews the current camp and reassignment updates cues promptly.
- Cozy woodland/parchment styles and existing art are reused. The decorative faction overline is removed from contracts; meaningful titles, availability and phase labels remain. Results, job descriptions and action spacing are consistent with the existing visual system. Reanimated characters use their existing face atlas as a static sprite fallback instead of requesting a nonexistent walking sheet.

## Save compatibility

Schema stays **21**. The snapshot and retirement fields are additive; removing controls does not require a schema bump.

1. The canonical IDs are `ada`, `bram`, `cora`, taken from the existing first three starter records. Renames, levels, wounds, deaths and history remain on those records. A missing/dead founder is never silently replaced.
2. Noncanonical old-save characters stay in `state.roster` with `retired: true`. They retain biological life/death, identity and history rather than being killed to shrink the roster. They do not appear in playable roster lists, join new dispatches or produce camp jobs.
3. An old active expedition retains all its participants, prepared fighters, clock, outcomes and visual events. Retired characters' equipped gear stays with them while away; once they return, equipment is transferred to shared stock exactly once and marked with `focusGearReturned`. No extra quest reward is created by retirement.
4. A legacy B expedition moves intact to the single A slot. If both exist, B waits with its saved remaining time and state until A's results are dismissed, then starts a fresh session-clock baseline. There is no second-slot interface. Unsupported manually saved legacy `activeQuest` data is kept in `legacyInterruptedQuest` while its existing recovery route grants no rewards or charges.
5. Repair condition fields remain as remaining Armor. `repairItem`, `repairAll` and `repairArmor` return failure with zero cost and do not mutate anything. Read-only compatibility quotes have zero repair prices. Old recruitment data is inert; recruitment cannot add anyone. Old `presentationSpeed` values normalize to `standard`, and normal rendering uses Standard automatically.
6. `state.questResults`, `lastReport.results`, settlement records and history retain the minted snapshot. Dismissal clears `questResults` and retained `expeditionReplay` together, so loading cannot resurrect a dismissed result or settle it again. A legacy completed replay gains a result view from its saved snapshot where available, or already settled records/current authoritative state, without a second award. Larger legacy parties show their additional members and full stats on Details pages.
7. An existing zero-Ward normalization bug was corrected: depleted innate Ward remains zero until the explicit between-battle/return restoration step. No new combat probability or balance rule was introduced.

## Files and responsibilities

| File | Responsibility |
| --- | --- |
| `js/plugins/RPGManagerProgression.js` | Fixed roster/dispatch, retirement and legacy-trip migration, inert repair/recruitment, settled result snapshots, recall results and expired-event cleanup. |
| `js/plugins/RPGManager.js` | Direct board dispatch, results pagination/dismissal, automatic presentation, reverse travel, camp props/preview, action reflow and removed obsolete screens. Save/Title helpers remain intact. |
| `data/RPGManagerUI.json` | Removes recruitment/Bathhouse locations and disables normal-play DEBUG. |
| `tests/pomodoro_focus.test.js` | Thirteen new focused checks: canonical party, death/missing blocks, retirement, legacy active parties/B, stable results/rewards/levels/defenses, inert repair, transitions, reverse scroll, Ward normalization and paginated bounds. |
| Existing focused `.test.js` files | Replaces superseded repair/recruitment/Bathhouse/partial-party/pace expectations while retaining combat, clock, inventory and settlement assertions. |
| `tests/pomodoro_focus_smoke.py` | Real MZ focus-flow acceptance at 816 x 624 and 1280 x 720; results save/load/dismiss, all stress Details pages, job reassignment, actual reverse return scrolling, removed controls, death blocking and existing reanimated static sprites. |
| Existing browser smoke scripts | Updates boss/production and cozy visual navigation to the fixed trio/results flow; background timing remains independently checked. |
| Handoff, context index, architecture, visual-system note and testing guide | Current behavior, migration, verified outcomes and remaining native checks. |

`RPGManagerBattle.js`, authored contracts and reward/death balances are unchanged. Pre-edit runtime/UI copies are in `backups/pomodoro-focus-before/`. This workspace has no Git repository.

## Verification

The exact current command is in `tests/Post_Sprint_Fixes_Testing.md`. It passes **95/95**, zero failures/cancellations/skips. The previous selection had 82 tests; 13 focus tests were added. Changed expectations cover removed repair/recruitment/Bathhouse, founder dismissal, partial-party camp production, expired replay frames, direct dispatch and old pace preferences. They were revised to assert the requested behavior, not skipped.

All three custom plugins pass `node --check`.

Browser checks use isolated Chromium storage and real MZ windows:

- `python tests/pomodoro_focus_smoke.py`: PASS at both supported sizes, zero page errors. Captures `tests/visuals/focus-*.webp`; results details/stress, equipment, camp/jobs and blocked dispatch are included.
- `python tests/cozy_ui_smoke.py`: PASS at both sizes, zero page errors. Covers text bounds, remaining secondary screens, copied three-companion/five-enemy battle, large defenses, active save/load and missing-art fallback.
- `python tests/mission_background_smoke.py`: PASS. Walking frames change, missions advance while MZ scene updates are focus-paused, saved missions/jobs exclude simulated closed time, and session progress resumes. Legacy recruitment fields remain load-compatible but do not recruit anyone.
- `python tests/post_sprint_smoke.py`: PASS, zero page errors. Checks real camp production, duration filters, boss simulation/playback, save/load and once-only results. Its production wait now observes the expected state instead of assuming a 1.3-second scheduler delay.

Historical wildcard test suites retain obsolete fixtures and were not used as current acceptance. Chromium checks do not establish native MZ/NW.js visual acceptance.

## Native MZ/NW.js checklist - pending

1. Open a New Game: exactly Ada, Bram and Cora, eight Home actions, no DEBUG/recruitment/Repair/Pace/Campaign/Bathhouse. Check fonts/icons and labels at 816 x 624 and 1280 x 720.
2. Assign Study, Workshop and Rest; watch the book, hammer and rest cues. Reassign a founder and confirm the prop changes. Check long renamed founders and unavailable/missing frames retain readable labels.
3. Injure a living founder and assign Rest. After one minute HP is full; persistent wounds/scars and remaining Armor stay unchanged.
4. Select a contract: all three depart immediately, with no party/leader screen. Verify jobs pause for all three. After a battle the road resumes without a victory-frame pause; the return scenery reverses smoothly.
5. Minimize for at least ten seconds: mission/job clocks advance while the process is open. Save/close/wait/Continue: closed time is excluded. Watch native frame pacing and sprite clarity.
6. Complete combat, no-combat and multi-encounter sessions. Results show settled stats, exact gains/items/levels, injuries and deaths. Check every Details page with long content and large totals. Save/load while results are open; Back to Camp awards nothing again.
7. Recall after an encounter: preserve existing consequences and only acquired earnings, with no completion XP/rewards. Verify the result screen and camp availability.
8. Load a larger legacy roster and an active legacy expedition; only the trio can start new quests, but the old participants can finish once. Verify gear retirement and deferred B migration. Kill a founder using an existing combat outcome: dispatch explains the block and never sends the dead character.

Native interactive MZ/NW.js playtesting has not been performed. No implementation requirement is currently blocked; the native visual/runtime acceptance remains a manual follow-up.
