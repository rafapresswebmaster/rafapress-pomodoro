# Cleric clipping follow-up

The screenshot exposed a real extraction defect: minimum-ink vertical gutters cut across weapons. A clipped neighbor fragment could still be surrounded by transparent packing padding, so the earlier padding test did not detect it.

## Fix

- Extract complete connected actor silhouettes globally before packing. Actor bounds can extend beyond nominal source grid cells.
- Use solid silhouette cores, then lower alpha thresholds in stages to restore staffs and spell effects. Components that contain multiple actors never transfer pixel ownership between actors.
- Repair the crowded second-stride cleric source separately: some neighboring staffs physically touched another cleric's hair, making the source ambiguous. Sixteen matching cleric identities were regenerated with clear horizontal separation and extracted as complete silhouettes. Normalize their source height before packing to preserve consistent walking scale.
- Rebuilt v5 portrait/walking/combat/fallen atlases for all 96 identities. Stable filenames and identity keys remain compatible with existing saves; no save files changed.

Review the exact pink cleric runtime atlas frames, including mirrored standing and casting: [preview](Cleric_Clipping_Fix.webp). All six preview frames have one complete staff, with no neighboring staff at the opposite edge.

## Verification

- `python tests/art_clipping_validation.py`: **113 complete source silhouettes checked**: 96 side-facing identities, the pink cleric's complete casting silhouette, and all 16 repaired cleric stride silhouettes. Checks compare actual source pixels and bounds, including full weapon extents and absence of adjacent actors.
- `python scripts/validate_playtest20_art.py`: **6,060 padded frames**, 96 unique identities per art type and three distinct walking poses each, all pass.
- `python scripts/run_playtest20_regressions.py`: **444 tests pass**. Gameplay code is unchanged by this follow-up.

Restart the game so RPG Maker reloads the regenerated texture files. Existing runtime bitmap caches retain old frames until restart.

## Reproduction and provenance

`python scripts/pack_playtest_art.py` rebuilds all atlases using `scripts/art_silhouettes.py`. Sources are retained in `img/playtest-source`. Source bounds are recorded in `Playtest_20_Extraction_Bounds.json`. The pre-fix packing script is in `backups/clipping-followup`.

Built-in imagegen edit, transparent background, reference `img/playtest-source/strideB.webp`. Output `C:/Users/rafae/.codex/generated_images/01a14645-6612-7f73-a0c3-252f036916de/exec-d9226bd3-1404-4e60-8186-d01e467f0e02.webp`, copied to `img/playtest-source/cleric_strideB_spaced.webp`.

Prompt direction: preserve all sixteen clerics from reference rows five/six, their designs, colors, equipment and second walking stride; arrange four columns by four rows, male variants then female variants, large transparent gutters, full bodies, one complete staff per character, no overlap or clipped staff endpoints. Preserve the pink-haired cleric's pink-orb staff on her left; her right edge contains only hair/clothing. No labels or scenery. The source was visually reviewed before packing; original source files were retained.
