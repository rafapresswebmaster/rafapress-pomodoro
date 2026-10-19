# Visual battle assets — built-in imagegen provenance

Created October 14, 2026 using the **imagegen skill, built-in `image_gen.imagegen` tool**, with no CLI/API fallback. Original generated images remain under the tool's default `.codex/generated_images` directory; the selected PNGs were copied into the project. No runtime network links are used. Each original was inspected before integration.

| Local asset | Original dimensions/format | Runtime treatment |
| --- | --- | --- |
| `img/pictures/BattleWoodland_v1.webp` | 1536×1024 RGB PNG, opaque | Cached cover-cropped stage background for woodland/road/default metadata. |
| `img/pictures/BattleCavern_v1.webp` | 1536×1024 RGB PNG, opaque | Cached cover-cropped stage background for cave/crypt/ruins/related encounters. |
| `img/pictures/BattleCreatures_v1.webp` | 1774×887 RGBA PNG; true alpha 0–255 | Eight full-body creatures, using measured alpha-bound source rectangles in `RPGManagerBattleStage.CREATURE_RECTS`. No offline slicing/repainting or replacement of existing assets. |

The two environments and atlas total about 8.4 MB on disk. Side-view actors, walking sheets and existing icons are reused from the bundled project. Optional image decoding/network/file failures fall back to drawn ground/silhouettes and text rather than MZ mandatory-asset errors.

## Final prompt: woodland

```text
Use case: illustration-story. Asset type: production backdrop PNG for RPG Manager's embedded automatic battle stage. Create a polished wide 1536x1024 cozy woodland ruin battlefield, painted storybook fantasy with restrained pixel-inspired edges to sit beside classic RPG sprites. Warm honey sunlight, sage/moss greens, muted teal shadows, ancient cream stone arches and small runic waystone among ferns. Composition: side-view three-quarter game stage; low horizon at upper third, distant misty wooded ruins across upper 45%; a broad quiet earthy grassy oval ground plane across lower 55%, uninterrupted clear space on both left and right for combatants and a clear central action lane. Depth from trees at far edges and a few tiny foreground grasses/pebbles, no objects blocking feet, no characters, no creatures, no writing, no UI, no borders, no white boxes, no vignette darkening center. Charming inviting field expedition mood, not grim or horror. Crisp cohesive illustrated game art intended to crop to a very wide low-height battle window; keep important architectural/forest cues visible across central horizontal band. Opaque background.
```

## Final prompt: creatures

```text
Use case: illustration-story. Asset type: a production transparent enemy battle sprite atlas for RPG Manager, one PNG sprite sheet. Exact layout FOUR equal-width columns by TWO equal-height rows, 8 isolated full-body creatures, each entirely inside its cell with generous transparent margins, each standing with feet centered near the bottom of its own cell, no overlaps. Character order row 1 left to right: a small green goblin scout with a wooden shield and short sword; an ivory skeleton in a little rusted helmet carrying a simple spear; a silver-gray alert dire wolf; a friendly-menacing purple giant spider. Row 2 left to right: a mischievous wooden treasure-chest mimic with little legs; a broad moss-green orc bruiser in leather with a club; a hooded violet necromancer/sorcerer with a tiny glowing staff and visible face; a squat ember-red horned summoned imp/demon with small wings. All face LEFT, three-quarter side view, coherent handcrafted storybook fantasy with crisp pixel-inspired edges and expressive readable silhouettes, warm honey highlights, moss/teal shadows, clean alpha edges. These will be displayed about 50 to 90 pixels tall. Charming adventurous, no gore, no grim horror, no white/black rectangles, no ground or painted shadows, no labels or text, no borders or grid lines, no partial limbs, no background. Create true transparent PNG. Ensure each creature occupies roughly middle 70 percent of its cell.
```

The generated sheet's approximate grid was handled with measured rectangles instead of assuming equal cell widths. Original alpha and artwork are preserved; small sprites scale down to suit the usable stage/formation.

## Final prompt: cavern

```text
Use case: illustration-story. Asset type: production cozy fantasy battle backdrop for RPG Manager, wide 1536x1024 opaque PNG. A welcoming mysterious old cavern with a mossy stone crypt arch and restrained violet-blue runes, small amber lanterns in wall alcoves, soft teal subterranean light, fern roots and gentle luminous mushrooms at far edges. Hand-painted storybook game art with crisp pixel-inspired edges, same warm honey, cream stone, moss green, muted teal palette as a cozy woodland RPG. Side-view three-quarter battlefield composition: upper 45 percent distant archways/cavern depth; lower 55 percent a wide calm flat earthy stone ground plane for two groups of combatants and a central action lane, uncluttered center. Must still read as a cavern when cropped into a wide shallow battle window. Friendly expedition mystery, no grim horror, no skull piles, no gore, no people/creatures, no writing, no UI, no border, no big foreground obstacles. Clean polished illustrated environment, not photorealistic. Gentle light contrast so colorful sprites stand out.
```
