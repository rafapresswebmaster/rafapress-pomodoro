# Playtest review fixes ? October 16, 2026

Implemented the six requested changes, including the later instruction to replace the anime portrait style with cute SNES-inspired pixel fantasy. The attached sprint document supplied project context; the user's direct playtest requests determined this pass.

## Result

1. Quest backgrounds move consistently outbound and reverse only on the homeward turn. Combat pauses the same camera crop; travel resumes without a jump. Cached mirrored panorama tiles remove abrupt wrapping.
2. Quest HP, Armor and Ward show one heart/shield/ward per point of capacity. Spent points remain visible as dark icons, including temporary Ward and broken equipment capacity.
3. Reviewed startup, camp, character selection/sheet, quest board, confirmation, Tavern, jobs, shop, armory, training, altar, graveyard, options, Save/Load, expedition and recap. Long lists now use pages; character details use Overview/Gear/Care tabs. Layouts fit the supported minimum 816?624 and 1280?720. Save page changes preserve real slot IDs. Fixed Graveyard opening the living roster.
4. Both character creation flows use six class buttons with symbols/names, two Type A/B buttons, then portrait/name. New Game reviews three drafts before atomic confirmation; Tavern reviews one hire. Back/edit, keyboard navigation and controller input mappings retained.
5. Added eight contracts to fill all 21 exact duration/difficulty combinations. Total 31 quests, with 640 unique narrative notes. Existing 23 contracts retained.
6. Replaced the entire selectable portrait pool with 48 cute pixel portraits: four for each of six classes and two types. Covered fantasy outfits, simple faces and chunky pixels. Forty-eight distinct atlas-cell hashes plus visual review; creation disables portraits already used by an active companion/draft. Original actor sheets remain walking art. Existing portrait keys map to the new artwork, including loaded quest/replay/history copies; combat values remain unchanged. Reanimated monster art retained.

## Changed implementation

- `js/plugins/RPGManager.js`: guided creation/Tavern, tabs/pages, compact board/confirmation, save paging, dark stat icons, portrait rendering, shared combat/travel camera.
- `js/plugins/RPGManagerBattleStage.js`: directional camera, cached periodic scenery, one-icon counters and independent walking sprites.
- `js/plugins/RPGManagerProgression.js`: portrait catalog/migration, independent walking art, draft recruitment and visual Ward capacity.
- `data/RPGManagerStage3.json`, `data/RPGManagerNarratives.json`: eight contracts and their notes.
- `img/faces/RPGPortrait_*_v3.webp`: six four-column/two-row atlases, eight characters each. Prompts/source paths in `docs/Pixel_Portrait_Provenance.json`. Rejected prior art archived, generated originals preserved.
- `package.json`: minimum window 816?624.

Schema remains 24. No user saves modified. New portrait keys retain their older `v2` suffix intentionally for save compatibility.

## Validation and evidence

295 regression tests passed, zero failures. The existing focused suite command in `docs/Identity_Quest_Performance_Sprint.md`, plus `tests/oct16.test.js` and `tests/review.test.js`, is recorded in `tests/review-regressions.txt`. New tests cover portrait identity/save/load/hiring, migration without combat changes, all filters, exact icon flags, camera direction/pause and settlement.

`python scripts/validate_sprint2_content.py`: 120 exclusive names, 12 categories, 640 unique notes, 31 valid backgrounds. `python scripts/sync_adventurer_catalogue.py --check`: six classes/twelve moves agree. Changed JS syntax checks pass. Portrait validation: `tests/review-portrait-validation.json`.

`python tests/review_smoke.py`: isolated browser state at 816?624 and 1280?720; checks form scrollHeight, selectable-window scroll limits/pages, all 21 filters, guided startup/hire, compact embark, real save-slot IDs, portrait persistence/walking art, outbound/return direction, combat crop continuity, depleted icons, recap and populated graveyard. Screenshots: `tests/visuals/review-*.webp`; output: `tests/review-browser.txt`. User save storage is not used.

New-contract balance: `node scripts/review_balance_audit.js` runs 960 seeded cases (eight quests ? three compositions ? twenty seeds ? two equipment conditions). No gear: Easy100%, Normal81.7%, Hard63.9%; ordinary gear: Easy100%, Normal97.5%, Hard83.3%. No draws. Added Normal/Hard contracts received measured HP tuning; 900 tuning cases are retained in `tests/review-tuning.json`, with untuned fixture and initial audit. Existing geared balance gap remains.

Render sampling in `tests/review-render-profile.json` compares three batches of sixty cached travel draws against the source baseline using identical scenery/walking sheets. These are noisy CPU draw-cost samples, not an FPS or native performance claim. Physical controller, multi-monitor, extended soak and native audio checks remain outside this browser pass.

Baseline: `backups/oct16-review/`. Repeatable audits and browser script retained; one-off edit scripts removed.
