# Illustrated quest travel — October 14, 2026

Implemented the requested walking-animation upgrade using the existing Visual Battle artwork and renderer style. No new image generation, assets, gameplay rules or save fields were needed.

## Delivered behavior

- `RPGManagerBattleStage.TravelStage` reuses the woodland/cavern environments selected from contract metadata, with cached mirrored panorama tiles, slower distant scenery, faster foreground stones, grounded shadows and larger walking sprites. Cached images rebuild only for geometry/theme/art readiness; character frames and foreground layers animate separately.
- Outbound members face/walk right; return members face/walk left and scenery reverses continuously without resetting its offset. Reanimated/custom characters reuse the existing illustrated skeleton where appropriate. Missing art uses procedural ground/silhouettes and readable labels.
- Every traveling companion has a fixed nameplate directly beneath their sprite with **HP current/max, Armor and Ward**, distinct icons and textual labels. Wounded/dead states remain explicit. HP and remaining equipped Armor are read from current campaign records without calling mutating normalization/repair helpers; temporary/innate Ward remains exact. Legacy participants without current records use their saved prepared data. Rendering never changes those inputs.
- Combat party actors also have counters immediately beneath them. Party spacing now leaves room for the ribbons; narrow lanes stack three icon/count rows, wide lanes use a horizontal ribbon. Compact horizontal HP shows current HP while the existing fixed status rail retains maximum HP/hearts. During combat, counters use the same copied event progress as the status rail: Ward, Armor and HP update at their respective impact beats, with no future-outcome leak.
- Walking/parallax advance only while the scene is active and visible. Visible-unfocused interval paints still redraw the authoritative countdown and current counters while walking stays frozen. Resume excludes suspended frame gaps. This preserves the session-only mission clock and foreground presentation contract.
- Travel/battle transitions suspend the travel renderer; Results suspends it and normal window destruction releases its cached Bitmap. Visual save/load restarts only the decorative walk loop, preserving party values, quest phase and remaining session time. Existing optional-art/exception fallback remains; the legacy travel fallback also includes numeric counters.

## Files and compatibility

Changed `js/plugins/RPGManagerBattleStage.js` and `js/plugins/RPGManager.js`. Added `tests/illustrated_travel.test.js` and `tests/illustrated_travel_smoke.py`. The existing background-clock smoke now records actual walking frame source rectangles from Canvas drawing as well as legacy Bitmap blits. Handoff, architecture, visual and testing references were updated.

Reused local assets: `img/pictures/BattleWoodland_v1.webp`, `BattleCavern_v1.webp`, `BattleCreatures_v1.webp`, and existing character sheets. Provenance remains in `Visual_Battle_Art_Prompts.md`. Plugin order and schema **21** are unchanged. Simulation/progression plugins, rewards, equipment condition, authored durations, consequences, audio cues and closed-process pause are unchanged.

## Verification

- Focused selection: **136/136 pass**, zero failures/cancellations/skips. Five new behavior tests cover read-only live counters, worn Armor, foreground-only motion/continuous reversal, cached/missing-art layout, actual walking frames/return direction, and under-party battle-counter geometry. Output: `tests/illustrated-travel-acceptance-results.txt`.
- Changed plugins pass `node --check`; catalogue sync/check remains valid.
- `python tests/illustrated_travel_smoke.py`: PASS at **816×624 and 1280×720**, zero page errors. Checks outbound/open-roster/return/cavern, exact injured HP/worn Armor/Ward, counter bounds beneath all three travelers, focus-frozen motion with advancing timer, save/load, missing-art fallback and once-only completion.
- `python tests/visual_battle_smoke.py`: PASS at both sizes, including all action/fate beats, under-actor layout, full sequence/speed behavior, saved cursor, exception fallback, corrupt art and Results/Finish.
- `python tests/mission_background_smoke.py`: PASS for real walking source frames, focus-gated mission progress, exact closed-time pause and resumed session time.
- Representative `tests/visuals/travel-{816,1280}-*.webp` screenshots inspected, including the open-roster layout, return and counters. Battle screenshots updated by the regression run.

Native MZ/NW.js verification remains pending: inspect both walking directions/counter readability at both sizes; toggle the roster; unfocus a still-visible window, minimize/restore, save/close/Continue; verify sprites/counters/timer stay correct. Browser checks do not claim native OS window acceptance.
