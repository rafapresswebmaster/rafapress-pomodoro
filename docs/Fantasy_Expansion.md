# Fantasy expansion

Current follow-up: [schema 28 polish](Polish_25_Implementation_20261017.md) adds enemy XP, weak-enemy packs, enlarged creatures/bases and new scenic backgrounds. The original delivery notes below are historical where superseded.

20 additional enemy types: Slime, Giant Bat, Ghost, Wyrmling, Hill Giant,
Pirate, Pirate Captain, Wolf, Owlbear, Dwarf Prospector, Ghoul, Ratman,
Kobold, Minotaur, Basilisk, Gargoyle, Swamp Hag, Gnoll, Will-o-Wisp, Treant.
The existing Harpy also appears in new contracts. All new enemies are reachable
through authored missions; bosses have limited-use signature attacks.
Harpies use the existing Harpy illustration instead of the legacy demon fallback.

| Contract | Category | Minutes | Skulls |
| --- | --- | ---: | ---: |
| The Cistern Has Teeth | Errands | 1 | 1 |
| Lanterns for the Lost | Errands | 5 | 2 |
| The Last Ore Cart | Errands | 15 | 3 |
| Bell Tower at Dusk | Short | 3 | 1 |
| Wolves at the Tollgate | Short | 5 | 2 |
| The Rooftop Reliquary | Short | 10 | 3 |
| Tracks in the Reedbeds | Fieldwork | 3 | 1 |
| A Map of False Stars | Fieldwork | 10 | 2 |
| The Orchard That Walked | Fieldwork | 25 | 4 |
| Feathers in the Honey | Hunt | 5 | 2 |
| Carrion at the Icehouse | Hunt | 15 | 3 |
| Eyes Beneath the Sand | Hunt | 20 | 4 |
| The Cinder Nursery | Boss Hunt | 10 | 3 |
| Captain of the Black Shoal | Boss Hunt | 20 | 4 |
| The Giant and the Labyrinth | Boss Hunt | 30 | 5 |

Every contract has its own objective, environment, threat description and
background. Longer missions use local patrols separate from their final group.
The new artwork has a dedicated atlas and overrides legacy creature-family art.

Camp character sheets retain their selected tab when switching companions.

## Individual skeleton appearances

All six classes, both sexes, all eight appearance choices: 96 skeleton models.
The existing portrait identity key selects the corresponding skeleton portrait,
walking sheet, combat sheet and defeated pose. Repeated normalization and save
migration retain the key. Living appearance options and class mechanics are
preserved. Older shared skeleton artwork remains available for historical files.

Generated source atlases and model reference charts are retained under
`img/fantasy-source`. References are assembled from existing character art.
The built-in imagegen tool creates skeletal transformations; Python only extracts,
scales and packs silhouettes into runtime sheets. Extraction bounds and visual
contact sheets are under `docs/Skeleton_*`.

Rebuild content with `python scripts/expand_fantasy_content.py`.
Repack a generated skeleton atlas with
`python scripts/pack_individual_skeletons.py CLASS SEX SOURCE.webp`.
Run focused checks with
`node --test --test-isolation=none tests/fantasy_expansion.test.js tests/quest_followup.test.js tests/mission_background_clock.test.js tests/visual_battle_stage.test.js tests/figurine_rendering.test.js`.
Browser verification: `python tests/fantasy_expansion_smoke.py`.

Validation: 73 focused JavaScript checks pass; browser verification loads the
new assets and missions, checks Gear persistence, and renders the pirate boss
encounter with no page errors. The older `stage3_quests.test.js` suite was also
tried; it reports failures involving roster assignment, XP expectations, and
legacy medkit fixtures. Those unrelated expectations were left unchanged.
