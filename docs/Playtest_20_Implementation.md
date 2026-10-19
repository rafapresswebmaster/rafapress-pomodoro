# Playtest notes: implementation and verification

Latest correction: [cleric clipping follow-up](Cleric_Clipping_Fix.md). Repacked complete silhouettes and repaired overlapping cleric stride artwork; 113 source-level silhouette checks now supplement the frame-padding validation.


Implemented October 16, 2026. The user's twenty playtest notes define this follow-up; the earlier attached sprint brief remains background for the previous sprint. Current save schema: **26**. Existing saves migrate on load. User save files were not edited by development or browser tests.

## Delivered

| Notes | Behavior |
|---|---|
| 1 | Click the Camp clock to enter any positive number of minutes, including fractions. Bell1 rings once at zero. The timer continues through menus and minimized play and stops when a quest starts, as clarified by the user. |
| 2, 4, 6 | Repacked all 96 identities from transparent source artwork using adaptive gutters, connected silhouette isolation and padded frames. Portrait, walking and combat routing now uses v5. Stable identity keys survive migration. |
| 3 | Camp characters increased from 22?33 to 44?66, with matching interaction areas and layout bounds. |
| 5 | Genuine alternating stride artwork replaces the repeated standing frame in side-facing walking cycles; arms, legs and clothing change between frames. |
| 7 | Shop has direct Head, Body, Offhand, Accessory, Supplies and Repairs buttons. |
| 8 | Gear slot names include consistent symbols in character sheets. |
| 9 | Every random battle receives a ten-second ?Something approaches...? warning that holds the narrative until its battle starts. Cancelled expeditions cannot start the pending fight. |
| 10 | Enemy HP, Armor and Ward use the same icon counter renderer as party members. |
| 11 | Zero-HP enemies stop rendering immediately. |
| 12 | Defeated party members use native prone artwork, including class skeletons. |
| 13 | Healing selects a wounded party member and randomly removes one wound they actually have. No-wound members are disabled. Repeated use is supported; removing the final wound clears the Wounded condition and residual wound stacks. |
| 14 | Overview shows wound names, effects and pagination when needed. |
| 15 | The roster remains clickable while a character sheet is open; clicking another member switches directly. |
| 16 | Travel character information shows name, class and level without a Wounded status label. |
| 17 | Added ten contracts and 200 route-specific narrative notes: 41 contracts and 840 notes total. New duration/danger pairs: 3m/4, 5m/4, 15m/2, 25m/2, 25m/4, 30m/2, 30m/4, 3m/1, 5m/3, 10m/1. |
| 18 | Travel retains its pre-settlement snapshot; battle opening and its initial fighter snapshot are installed atomically, preventing future damage from flashing before combat. |
| 19 | Full Tavern: choose outgoing member, confirm, create new member, review old/new together, then confirm replacement. Cancellation leaves the roster untouched. |
| 20 | Full-party resurrection uses outgoing selection and two confirmations before commit. Six hairless class skeleton models use class equipment. Original class mechanics, level, XP, powers, traits and wounds survive resurrection; labels read Zombie Knight, Zombie Mage, etc. |

As clarified by the user, replaced living members are removed, with all equipped gear returned to inventory. Replacement and resurrection validate on a copy before committing, so invalid choices and cancelled previews do not spend resources or discard characters. Previous reports and v4 artwork remain available as history; pre-change plugins/data are in `backups/playtest-notes-20`.

## Verification

- **444 / 444 regression tests passed**, including 44 new focused checks. Evidence: `tests/playtest20-regressions.json`.
- Browser UI workflows passed at **816?624 and 1280?720**, with zero JavaScript errors. Evidence: `tests/playtest20-browser.json`; screenshots: `tests/visuals/playtest20-*`.
- **7,380** simulated expeditions across all 41 contracts, three levels, three gear tiers, two party compositions and ten seeds; **0 safety violations**. Evidence: `tests/playtest20-audit.json`. This checks deadline/reward/risk invariants; it does not claim equal win rates across skull tiers.
- Art validation: **6,060 padded frames**, 96 unique portrait/walk/combat/fallen identities, three distinct walking poses per identity, six skeleton classes, minimum four transparent edge pixels. Evidence: `tests/playtest20-art-validation.json`.

Run `python scripts/run_playtest20_regressions.py`, `python scripts/validate_playtest20_art.py`, `node scripts/playtest20_audit.js`, and `python tests/playtest20_smoke.py` to reproduce the checks. Browser tests use an isolated HTTP origin, never native save files. Native NW.js audio-device behavior and OS minimize behavior were not separately exercised; browser testing verified the bell dispatch and monotonic countdown path.

## Art provenance and review

New raster art was generated with the built-in imagegen tool, following the imagegen skill, and packed deterministically with Pillow. Source images are retained in `img/playtest-source`. `scripts/pack_playtest_art.py` rebuilds the atlases; `data/RPGManagerArtV5.json` maps stable identities. `docs/Playtest_20_Extraction_Bounds.json` records each extracted source rectangle. Review `docs/Playtest_20_Art_Contact.webp`.

Generation direction: preserve the established 8-column, 12-row class/sex/identity arrangement and matching medieval pixel-art appearance; produce two opposing side-walk strides and one complete prone/fallen pose per identity, transparent background and clear gutters. Skeleton direction: six class rows (Barbarian, Knight, Cleric, Rogue, Ranger, Mage), six poses per class (front, side, rear, two strides, fallen), hairless skeleton anatomy, each class's armor/weapons, shared across genders. Existing front/side/rear/attack references were retained.

Generated output directory: `C:/Users/rafae/.codex/generated_images/01a14645-6612-7f73-a0c3-252f036916de/`.

| Source | Generated filename |
|---|---|
| Skeleton | exec-e950daae-a6cd-4356-a55d-1d50d4d8849c.webp |
| Stride A | exec-ef7166f5-3eae-4abd-a82b-a89397c1785d.webp |
| Stride B | exec-435550e3-41d9-4050-8d81-4a4b146d7b07.webp |
| Fallen | exec-fc861b32-147c-4318-83b2-1bb39942989b.webp |
