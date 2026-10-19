# Figurine crop, scale and movement fix

The old travel-sheet selection had reintroduced the crowded v4 atlases. Travel and camp now use the cleaned v5 standing cells; the leg-animation frames remain unused.

Every displayed travel/combat frame is isolated into a cached transparent canvas before cropping, scaling or rotating. Normalization uses the visible alpha bounds rather than the padded source cell, so all party figures have the same visible height, including different portraits and poses. Enemy sizing retains its existing rules. Narrow combat layouts reserve additional horizontal space for wider party silhouettes.

The figure and wooden base share translation and rotation. Walking uses a slower sinusoidal tilt (36 frames per full cycle, approximately 6 degrees each side) with smooth small hops up to 3.5% of figure size. Idle figures rest on the table. Bases use dark wood colors, uneven growth rings and grain marks. Their center follows the solid lower silhouette (feet or robe hem) rather than the full artwork bounds, keeping outstretched weapons from shifting the base.

Validation:

- 65 focused Node checks pass, including rigid base attachment, equal-height normalization, foot alignment, gentle hops, directional motion, narrow-layout spacing, quest state and inventory persistence.
- Existing source-art validation passes for 6,060 padded frames across 96 identities and six skeleton classes.
- Browser audit checks isolated rendering and equal visible height across 5,568 standing/combat frames, with no JavaScript errors.
- In-game smoke checks cover camp, quest combat, recall and shop interaction.

[Animated review](Figurine_Motion_Review.html) shows all six classes and both appearance types, with selectors for eight portraits, stationary pieces and combat poses.

Camp smoothness follow-up: removed the every-sixth-frame redraw gate. The cached scenery remains reused, while camp characters, hops and fire redraw every game frame. Quest animation timing is unchanged. The browser smoke check samples 20 display frames and verifies that camp redraws keep up.

Performance follow-up: camp movement now uses independently transformed cached sprites instead of repainting the camp canvas every frame. See Camp_Rendering_Performance.md for profiling results and validation.
