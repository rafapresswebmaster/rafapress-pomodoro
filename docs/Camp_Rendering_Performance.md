# Camp rendering performance fix

The camp was repainting its full contents canvas for every simulation update. Background art, text, signs and every character were repeatedly redrawn. Catch-up updates amplified that work. First-use frame extraction also copied from a GPU-backed canvas before reading pixels, causing long stalls when a figure changed direction.

Changes:

- Static camp scenery and signs repaint only when their dimensions or art readiness change.
- Each character uses a cached figure-and-base bitmap for each facing direction. Per-frame animation changes sprite position and rotation, without repainting the figure or the camp canvas.
- Frame extraction reads from the decoded source image, avoiding GPU canvas readback.
- Labels repaint only when names or jobs change. Small job cues and the fire update on separate, small textures.
- Subpixel sprite transforms keep walking smooth. Character click regions follow the current positions.
- Removed characters release their overlay resources; closing the window releases its owned cached bitmaps. Hidden camp windows skip their animation work.
- Quest animation and gameplay timing are unchanged.

Same local browser profiling harness, 180 sampled display intervals:

| Measurement | Before | After |
| --- | ---: | ---: |
| Full camp contents texture update calls | 9,396 | 0 |
| Average camp update CPU time | 2.90 ms | 0.087 ms |
| 95th-percentile camp update CPU time | 0.60 ms | 0.20 ms |
| Longest camp update | 790.3 ms | 0.8 ms |

These are local measurements, not a frame-rate guarantee. The software-rendered browser's overall display timing remained variable; the camp repaint/readback work and its long CPU stall were eliminated in this sample. Raw results: tests/camp-performance-before.json and tests/camp-performance-after.json.

Validation: 68 focused Node checks pass, including stable-frame bitmap allocation, no scenery repaints during animation, job/cue invalidation, removed-member cleanup, resource disposal, and existing quest/inventory tests. Browser smoke checks verify rendering, animation updates, character clicks, job changes and scene transitions.

Run profiles with:

    python tests/camp_performance.py tests/camp-performance-after.json
