# Visual battle sprint — October 14, 2026

The later October 14 `Illustrated_Travel_Update.md` extends this visual system to parallax walking and live under-character HP/Armor/Ward counters, including compact battle ribbons. Current focused acceptance is 136 tests; the records below retain their prior delivery history.

Implemented the supplied `Teamfight_Manager_Visual_Battle_Sprint_Codex_Brief.md` against the current workspace handoff, including the restored left Home campsite/right companion panel. This is a presentation upgrade inside the quest window; no separate combat scene or new combat commands were added.

## Audit and implementation map

The old embedded battle drew moving face crops inside fixed roster cards over a small procedural woodland strip. Its complete event queue, status symbols, target keys and caption paging were useful foundations, but the combatants were not grounded full-body actors. Default 816×624 left only about 102 pixels for the stage. Existing matching `img/sv_actors/Actor*.webp` files contain 9×6 frames with authored wait, swing, missile, spell, evade, damage, victory and downed motions. Most playable portrait identities have matching sheets; a few Actor3 identities and custom/legacy records need walking or drawn fallbacks. Enemy faces came from mixed stock sheets and the three-cell custom face atlas, which were inadequate for a consistent full-body scene. IconSet and the existing safe boundary sounds remain suitable.

| Owner | Change |
| --- | --- |
| `js/plugins/RPGManagerBattleStage.js` (new) | Presentation-only reusable tokens, biome selection, status/formation layout, `Animator.start/update/finish`, optional art selection, full-body poses, effect composition, cached background, field-note captions and cleanup. Also exports pure helpers for focused Node tests. |
| `js/plugins/RPGManager.js` | Creates the renderer through the existing optional art cache, preserves the old renderer as an exception fallback, destroys owned animation resources with the window, clears effects on travel/results, and handles compact active-session hints for a taller stage. Adds result-record plaque, quest duration/risk badges, explicit AWAY text and hover/pressed primary-action treatment. |
| `js/plugins/RPGManagerProgression.js` | Minimal copied presentation data only: `attackKind`, `survived`, `permanentDeath`, plus `presentationLifeState` on existing copied presentation fighters after a fall/death-save event finishes. No rules, rolls, schedules or payouts changed. |
| `js/plugins.js` | Registers the new presentation helper after progression and before the UI plugin. The helper must be included in MZ deployment/plugin configuration. |
| `img/pictures/BattleWoodland_v1.webp`, `BattleCavern_v1.webp`, `BattleCreatures_v1.webp` | New local optional assets generated for this project with the built-in imagegen tool. Dimensions, provenance and exact prompts: `Visual_Battle_Art_Prompts.md`. |
| `tests/visual_battle_stage.test.js`, `tests/visual_battle_smoke.py` | Behavioral renderer/lifecycle tests and real MZ visual, resume, sequence and failure acceptance. Existing focused and browser suites remain regression gates. The return-scroll browser assertion waits for observed reverse movement instead of assuming a 250 ms render deadline under software-GPU load. |

Required plugin order is now **Battle → Progression → BattleStage → RPGManager**. The simulation plugin itself is byte-for-byte unchanged from `backups/visual-battle-before/RPGManagerBattle.js`. That directory also retains pre-sprint UI, progression and plugin-list copies.

## Composed battlefield and art

The battlefield keeps readable PARTY and ENEMIES/BOSS ENCOUNTER status rails at the sides, with a separate center action lane. Full names and authoritative hearts, Armor shields and Ward runes remain anchored while actors move. Blue `>` and honey `*` markers identify acting/targeted fighters in text as well as color. Large defense stacks use exact numeric counts; large legacy HP uses a heart and fraction. Three party members and up to five enemies fit; five-enemy encounters use three rear/two front positions. Enemy positions and sprite sizes adapt when the roster is open.

Woodland/road contracts use the illustrated wooded ruins; cave/crypt/cemetery/ruins/cult/demon/gate metadata uses the lantern-lit cavern. Unknown metadata defaults to woodland. Quest definitions are read at render time rather than adding biome fields to saves. Cached cover-cropped background Bitmaps rebuild only for size, theme, boss framing or art readiness changes. Fonts, ink/parchment notes, honey edges, muted teal party cues, violet Ward, blue Armor and warm HP sparks share the cozy palette. No GPU filters or screen shake are required.

Party identities use their matching side-view sheets and appropriate authored motion rows. Missing side-view art falls back to the same identity's walking sheet, then a grounded drawn silhouette. Goblin, Skeleton, Wolf, Spider, Mimic, Orc/Ogre, Necromancer/Cultist and Demon families use eight custom transparent illustrated creatures; reanimated members can use the skeleton body. Unknown humanoid enemies reuse their matching existing actor art when available. Custom atlas alpha bounds were measured so limbs/weapons are not cut by an approximate cell grid. Images remain original PNGs; the renderer uses source rectangles rather than destructive image edits.

Active expedition/results content gains 34 pixels vertically through a compact two-line context strip below the unchanged ten-action bar. At 816×624 the inner expedition is 350 pixels tall, giving the stage about 136 pixels; at 1280×720 it is 446 pixels tall. The 40 px countdown stays at its existing panel coordinate, with quest, phase, Recall/Finish, captions, roster arrow/Shift and all Home actions visible. Idle Home retains the animated left campsite and right Your Three Companions panel. Results still open the companion panel automatically.

## Event animation and correctness

`Animator` never consumes an event or advances time. Its normalized position is reconstructed from the existing saved `presentationDurationMs` and `presentationHoldMs`. Repeated drawing at the same progress yields the same pose. Scene/focus state does not add animation time. Load starts a new transient renderer at the saved progress rather than replaying the action from zero.

- Opening: short arrival/settle, encounter plaque, stronger boss frame/title.
- Basic melee: wind-up, lunge/swing, resolved impact, return to authored position.
- Ranged/spell/signature: authored missile/spell/skill poses, bolt or rune projectile, restrained class/action-based color and signature ring.
- Miss: visible evade/near-miss path and MISS label, with no damage/defense effects or speculative HP loss.
- Defense impact: violet Ward flare, blue Armor sparks, then warm HP hit/recoil. Displayed Ward, Armor and HP switch to event values at their corresponding impact beats; the saved fighter/event is never modified by rendering. Only the latest overlapping defense layer draws a value label, avoiding stacked text.
- Fall/death save: temporary DOWN, successful SAVED and final DEAD remain distinct. Enemies fade/poof; players use authored downed frames or a non-graphic fallback. Old valid death-save captions/importance support the legacy fallback; unknown incomplete records remain DOWN rather than claiming a final fate.
- Round, mortal intent and battle end: short readable punctuation. A result event deliberately represented as `kind: travel` by the existing queue still receives an ending beat, then returns to travel. The event is not reordered or duplicated.

On each event change `finish` clears transient effects before `start`; no independent effect timers accumulate. Travel, Skip, Results and window destruction clean effects. Resize rebuilds geometry/background without restarting a cue or event. Render exceptions destroy the failed transient renderer and use the existing readable legacy battle for that event; a later event can recover. Optional art failure retains usable silhouettes, procedural ground, status and text. All art uses `managerArt` outside MZ's fatal mandatory-image cache.

The existing quiet Book1/Bell2/Item1 boundary sounds and Chime1 completion cue are unchanged. No repetitive attack/impact audio or new audio dependency was added. Rendering never mints or consumes a sound cue. Existing Alerts, once-only/load suppression, mute and error isolation remain authoritative.

## Saves and invariant boundaries

Schema remains **21**. There are no new root campaign fields. The small optional additions live only inside the existing saved presentation event/fighter records; old saves use conservative defaults. No reroll, attack application, HP/consequence mutation, reward, duration, encounter probability, item balance, job rate or closed-process timing change was made.

The original complete structured queue/order is retained. Standard/Reduced/Skip continue to use the existing low-level presentation timing helpers and cannot alter outcomes. This sprint does not restore the removed normal-play Pace control. Saved queue/cursor/remaining hold time are preserved. Scheduled arrival still settles once and opens the stable saved Results immediately; it is never delayed to finish decorative motion. As before, a retained replay queue may outlast the session, but it cannot cover/delay Results or re-award anything.

## Verification

- Focused selection in `tests/Post_Sprint_Fixes_Testing.md`: **131/131 pass**, zero failures/cancellations/skips. Includes the previous 120 plus eleven focused stage tests. Output: `tests/visual-battle-acceptance-results.txt`.
- `node --check`: all four custom plugins and `js/plugins.js` pass. Catalogue sync/check remains valid (thirteen classes, 26 moves; no catalogue edits).
- `python tests/visual_battle_smoke.py`: PASS at **816×624 and 1280×720**, zero page errors. Actual MZ checks include full-body custom art, three-versus-five status bounds, every main beat, boss, roster-open layout, immutable copied visual state, complete Standard/Reduced order and Skip cleanup, deliberate renderer exception/recovery, saved mid-action event/queue/hold/Gold preservation, immediate Results/cleanup/Finish, and an independent corrupt-art/missing-sheet context that still settles safely.
- Retained browser gates: `next_playtest_smoke.py`, `cozy_ui_smoke.py`, `pomodoro_sprint_smoke.py`, `pomodoro_focus_smoke.py`, `post_sprint_smoke.py`, `mission_background_smoke.py`. These cover onboarding, both Home panels/jobs, precise items, five-plus candidates, zero-Gold replacements/archive/worn gear, real boss simulation, shared-screen bounds, saved results, Alerts/mute/failed requests, visible-unfocused countdown paints with zero scene updates, hidden restore and closed-time pause.
- Screenshots: `tests/visuals/battle-{816,1280}-*.webp` for opening, attack impact, Ward, signature, miss, fall/save/death, enemy fall, round, ending, boss, roster open, saved resume and results; `battle-missing-corrupt-art.webp` for fallbacks. Representative opening/impact/boss/roster/results images were inspected. Formation spacing, effect-label overlap and vertical space were corrected during review.

The historical wildcard fixtures remain obsolete and were not treated as current gates. No native interactive playtest or native sound audibility is claimed.

## Native MZ/NW.js route — still pending

1. Check the plugin list includes BattleStage between Progression and RPGManager. Start/Continue normally; confirm left camp activities and right companion information at Home.
2. At both supported window sizes, dispatch a required-combat contract and watch the full sequence: opening, physical attacks, missile/signature, miss/evade, Ward/Armor/HP, falls and death saves, rounds and ending. Check full names/status against captions, then inspect a boss contract and its framing.
3. Open/close the roster by arrow and Shift during a projectile/impact. Verify effects stay inside the action lane and the timer, Recall and ten actions remain readable. Hover/press Finish and Recall; Recall still requires confirmation.
4. Save during an action, return to Title, Continue: the cursor resumes safely without duplicate attacks, consequences or boundary cues. Test the existing low-level Reduced/Skip helpers in a developer fixture; no normal Pace menu was restored.
5. Keep the game visible while working in another app, then minimize/restore. Confirm timer repaint/session correctness and frozen unseen visual playback. Save/close/wait/Continue must exclude closed time.
6. Listen to the retained boundary cues and completion chime with Alerts On/Muted; verify native sound levels/background audibility. No new per-attack sounds are expected. Confirm a missing custom asset does not interrupt gameplay.
7. Complete/recall and inspect saved individual outcomes, exact gains/totals, item details and Finish. Rewards and consequences must remain once-only.
