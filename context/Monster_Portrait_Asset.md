# Monster portrait atlas

Asset: `img/faces/RPGManagerMonsters.webp` (2172 x 724), three equal cells in
one row: Goblin, Skeleton, Slime. Enemy JSON references the appropriate cell
with `columns: 3`, `rows: 1`, and its zero-based `index`.

Created with the built-in image generation tool on September 21, 2026 and
copied into the project. The atlas is loaded by RPG Maker's ImageManager;
portraits are scaled directly from each cell without altering the source PNG.

Final generation prompt:

> Use case: stylized-concept. Create a single game portrait atlas image for an RPG Maker fantasy management prototype. Exactly THREE equal square portrait cells in ONE horizontal row, ideally 1536 x 512 pixels, each cell one third of the total width. No gaps, no frame, no text, no lettering. Cell 1 left: expressive green goblin raider with large pointed ears, mischievous menacing face, leather shoulder armor, head and shoulders. Cell 2 center: classic animated skeleton warrior, ivory skull with empty dark eye sockets, rusty iron helmet and battered armor, head and shoulders, not a human face. Cell 3 right: classic small round blue slime monster, translucent jelly body with two dark eyes and tiny mouth, whole compact blob filling its cell. Cohesive colorful hand-painted 2D JRPG character portrait style, bold clean silhouettes readable at 40 pixels, each subject centered in its own cell and completely contained inside that cell. Simple solid muted dark blue gray backgrounds in every cell, no landscape or scenery, no overlapping across cells. This is one atlas asset to be divided into three equal cells by game code.
