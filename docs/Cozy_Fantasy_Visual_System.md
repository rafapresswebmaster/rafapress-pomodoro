# Cozy Fantasy Visual Overhaul

The later October 14 `Illustrated_Travel_Update.md` extends this visual system to parallax walking and live under-character HP/Armor/Ward counters, including compact battle ribbons. Current focused acceptance is 136 tests; the records below retain their prior delivery history.

The later October 14 **Visual Battle Sprint** supersedes the battle drawing/layout and active-session hint strip below. Current presentation, art/animation/fallback contracts and 131-test/seven-browser verification: `Visual_Battle_Sprint.md`. Existing gameplay/idle Home contracts remain; older sections retain their delivery history.

October 14 Home HUD correction: the animated woodland camp remains on the left, including walking and Workshop/Study/Rest interactions. The right Life at Camp summary is replaced by Your Three Companions with portraits, HP and conditions. Idle Home uses a responsive 54/46 split; expedition/results layouts keep their existing toggle.

The October 14 **Next Playtest Sprint** supersedes starting-party, Home roster/layout, Finish action, event-sound and consumable contracts below. Current implementation/visual acceptance: `Next_Playtest_Sprint.md` (120 focused tests, six browser suites; native checks pending). Older sections retain their delivery history.

The later October 14 `Pomodoro_Focus_Sprint.md` supersedes fixed-founder/recruitment-disabled/dismissal rules and the timer/alert layout. Current acceptance is 107 tests; the sections below retain their earlier implementation and verification history.

The October 14 Pomodoro focus update supersedes the action bar, roster/dispatch, repair, pace and completion flow described in this historical visual baseline. Current implementation and verification: `Pomodoro_Focus_Update.md` (95-test selection and updated browser suites).

Implemented October 13, 2026. This evaluates and implements the supplied UI and Graphics Overhaul Plan with the user's cozy fantasy tone taking precedence over its dark theatrical direction.

A subsequent October 13 fix adds minimized-session mission timing (paused when closed) and walking travel playback. Its current behavior and 82-test acceptance selection are documented in the handoff and `tests/Post_Sprint_Fixes_Testing.md`. The visual implementation and 77-test baseline below describe this visual pass.

## Evaluation and scope

The plan correctly prioritizes a shared visual language, meaningful screen composition, consistent artwork treatment, and preserved gameplay contracts. A small reusable art batch is appropriate at 816 × 624. The first implementation covers the foundation, Home, contracts, party review, roster, equipment/profile, compact battle, and shared styling across secondary menus, Save/Load, Options, and Title. The camp is a welcoming woodland retreat rather than a war room.

The existing battle window is intentionally retained as a compact, readable two-column display. Its full event order and independent expedition clock remain authoritative. A larger bespoke battle scene, unique portrait set for every character, layered armor artwork, and new panel-transition/settings systems are possible later work; they are not claimed as implemented here.

## Implementation map

| Surface | Implementation |
|---|---|
| Shared windows | `CozyUI` helpers, generated in-memory MZ windowskin, scoped font/color/tone and selectable-row styling in `RPGManager.js`. Stock engine source is unchanged. |
| Title | Cozy camp scenery, framed title and subtitle, themed existing commands. |
| Home | `refreshGuildHeader`, framed resource pills, responsive camp/expedition split, camp activity cards, six-column three-row command bar with consistent outline icons. |
| Camp | `Window_RPGCampsite.refresh`: cached illustration or procedural fallback, area signs, grounded animated walking sprites, name/job plaques and existing hit regions. |
| Contracts | `Window_RPGChoices` quest-card treatment; `Scene_RPGQuestBoard.refreshInfo` parchment details, availability, measured two-line sections, reward strip and lock reason in footer. Existing duration filters and fixed dispatch time remain. |
| Party review | Existing preparation flow with five portrait cards, leader, HP/condition, authored duration, danger, encounters, rewards/XP and a clear Depart button. |
| Roster | Framed face thumbnails and a readable profile with identity, XP progress, signature, defenses, traits, Bonds and career. Profile text fits the default panel. |
| Equipment | `Window_RPGEquipmentProfile`: four labeled slots around a grounded walking sprite, condition bars, defense icons, availability, identity summary and separate comparison plate. |
| Expedition | `drawBattle`: woodland stage, matching framed face crops on both sides, blue actor/gold target semantics, cross-row connection, restrained impact accent, full-name/fallen labels, existing defenses and separate caption/dialogue/control areas. |
| Secondary screens | Shared window/row system; Tavern portrait frame; Altar arcane vignette and readable status/costs; consistent decision panels. Bathhouse retains its existing Home feedback flow. |

The visual configuration palette and subtitle are updated in `data/RPGManagerUI.json`. No class/dialogue catalogue or generated gameplay content was edited. `RPGManagerBattle.js` and `RPGManagerProgression.js` are unchanged; save schema remains 21.

## Visual specification

- Palette: forest `#253c32`, oak `#4b3d30`, panel `#292c26`, parchment `#e4d3ae`, ivory text `#f4e8cf`, honey `#e8c583`, muted text `#c6b99d`, moss `#8dbb97`.
- Semantics: blue actor/Armor, gold target/focus, violet Arcana/Ward, warm red for wounds/death, green for positive state. Text markers accompany battle colors.
- Typography: Georgia titles with the MZ font fallback; Trebuchet MS body with MZ fallback. Titles 24–27px, normal body 14–18px; compact battle and secondary status labels use 10–13px where the small panel requires them.
- Surfaces: rounded oak/moss backplates, thin honey/brass edges, quiet dividers, parchment quest sheets, contrasting captions. Essential text is drawn by MZ, not embedded in artwork.
- Icons: reusable outline family on a 24-unit canvas, typically rendered at 17–22px. Existing heart/shield/Ward drawing helpers remain distinct.
- Portraits: existing face sheets, declared rows/columns, shared frames. No new character identity or inconsistent generated portrait set. Walking sheets remain animated in camp and visible in equipment.
- Motion: existing playback timing/order, small approach/dodge/recoil and impact accents. Reduced scales these battle motions to 30%; Skip suppresses them. This does not change timing, damage, rewards or settlement. Existing camp walking continues.
- Layout: default 816 × 624, also checked at 1280 × 720. Home splits width proportionally during expeditions and uses extra vertical space at taller resolutions; essential commands stay in three rows.

## Asset plan and provenance

| Asset | Format / dimensions | Use | Fallback |
|---|---|---|---|
| `img/pictures/CozyGuildCamp.webp` | Opaque PNG, 1774 × 887, about 3 MB | Camp, title scenery and faint battle-stage texture. Camp/title use proportional cover cropping. | Procedural garden/cottages/fire; woodland gradient at Title and battle. |
| Window skin | Transient 192 × 192 Bitmap | MZ frame, surface and cursor atlas; retains engine arrows and supporting atlas areas. | Entirely procedural, with bundled stock atlas details. |
| Icons and portrait frames | Native Bitmap/canvas drawing | Navigation/resources, consistent artwork treatment | No additional art file dependency. |

The camp illustration was generated with the built-in image generation tool through the imagegen skill, inspected, and copied into the project. No CLI or API key was used. The optional scenery Bitmap deliberately bypasses ImageManager's required-asset cache: an unavailable image leaves the game usable. Cached camp backgrounds are destroyed with their window; owned title/background Bitmaps are released on termination. Names, resources, controls and other UI text are drawn separately.

Final generation prompt:

```text
Use case: stylized-concept. Asset type: background scenery for a cozy fantasy pixel-art RPG Maker guild camp, displayed behind walking 22x33 pixel character sprites in a wide small UI panel. Create a polished panoramic 2:1 image, no text, no people, no UI, no border. View: overhead three-quarter RPG game perspective with a flat walkable grassy courtyard taking the central and lower 65 percent of the image. A welcoming little guild retreat among rounded leafy forest trees: a tiny timber bathhouse and canvas resting tent in upper left, book-filled rustic study nook and lavender altar in upper right, a carpenter's workbench and supply crates in lower right, a small stone-ring campfire at exact center. Warm late-afternoon light, soft sage and moss greens, honey oak, warm cream, muted lavender, terracotta roof, tiny golden lanterns, flowers, stepping-stone path around the fire. Clean carefully crafted pixel-art environment matching classic 48px RPG sprites, restrained details and strong readable shapes at 550x280 and 366x280. Keep center and lower left uncluttered for moving characters, no large foreground objects, no deep perspective horizon, no photorealism, no dark war room, no grim horror, no white outlines. Opaque PNG.
```

## Verification

All three runtime plugins pass `node --check`. The focused acceptance selection passes **77/77**, with no failures or skips:

```powershell
node --test --test-isolation=none tests/post_sprint_fixes.test.js tests/stage1_camp_home.test.js tests/stage2_realtime_loop.test.js tests/stage3_catalogue.test.js tests/stage4_realtime_presentation.test.js tests/stage5_equipment_repair.test.js tests/recoverable_errors.test.js tests/item_persistence.test.js tests/polish_tuning.test.js tests/small_roster_rework.test.js tests/death_stabilization.test.js tests/complete_battle_sequence.test.js tests/quest_window_polish.test.js
```

Renderer coverage executes the real shared helpers at multiple widths/heights, verifies nonoverlapping five-fighter cards, checks saved event immutability, and verifies large stacked defenses retain exact counts within compact card bounds. Earlier source assertions for old fixed coordinates, all-caps Bathhouse, section wording, and Unicode status glyphs were updated for the new presentation. Behavioral rule tests remain intact.

Browser commands:

```powershell
python tests/post_sprint_smoke.py
python tests/cozy_ui_smoke.py
```

Both browser commands passed in isolated Chromium. The visual smoke captures Title, Home, contracts/locks, five-person party review, roster, equipment/compare, Armory, Tavern, Altar, jobs, Repair, Graveyard, DEBUG, Save and five-v-five replay/large stacked defenses at both sizes. It checks real text bounds, command capacity, side-by-side separation, unchanged copied replay data, presentation modes, active save/load/schema 21, and usable navigation with the art request aborted. Screenshots are in `tests/visuals/cozy-*.webp`. The existing smoke covers live jobs, filters, real boss simulation/playback, save/load, DEBUG completion and once-only arrival/replay. Browser tests use isolated storage.

Native RPG Maker MZ/NW.js visual playtesting has not been performed. Historical wildcard fixtures were not rerun; their known obsolete assumptions are separate from this acceptance selection. Both browser passes and screenshot review are recorded in the current handoff.

## Native playtest still required

1. At 816 × 624, check Title, Home scenery, resource pills, every command, camper selection, jobs and Bathhouse feedback.
2. Open each duration category, inspect a locked contract, prepare five members and check leader, condition, authored time and XP preview. Dispatch.
3. Open a profile and each equipment slot; compare/equip, repair through confirmation, and verify away/dead restrictions. Inspect long names and trait/scar text.
4. Watch a boss battle in Standard and Reduced, then Skip. Check both formations, targeting, defenses, falls, long-caption paging and visible Recall. Save/load mid-playback and after arrival; confirm once-only rewards and Back to Camp.
5. Repeat at a wider resolution, such as 1280 × 720, paying attention to native font rendering, icon clarity and extra Home height. Extremely small resolutions below 816 × 624 are not redesigned.
