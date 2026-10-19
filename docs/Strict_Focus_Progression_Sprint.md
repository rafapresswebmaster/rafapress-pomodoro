# Strict focus, progression and identity sprint — October 16, 2026

Implemented the user-authorized next-sprint brief. Inspected the current handoff and `Playtest_Review_Fixes_20261016.md` before editing. Plain JavaScript / RPG Maker MZ 1.10 / PixiJS 5.3 remain in place. Manager owns the clock and settlement; Battle computes deterministic outcomes; BattleStage projects saved events.

## Clock and expedition contract

The session always lasts the selected duration unless Recall is explicitly confirmed. Team wipes record knockout fate immediately, stop expedition encounters, and leave the visible focus clock running. Recall sits beside the clock, opens a separate confirmation with Keep Session Running selected, supports Cancel/Escape, and stores an idempotent early-end report. Active combat has already resolved authoritatively; confirmation finishes its projection before retaining finds/consequences and forfeiting completion XP/rewards.

No battle starts with fewer than 72 seconds remaining: a 60-second battle window plus a 12-second extraction. The party turns left at the narrated extraction beat. No new combat starts in that window. A session ending or recalled never retains queued half-played combat. Full underlying combat events remain in the report/chronicle; automatic catch-up does not replay combat after the focus deadline.

One-minute quests are explicitly combatless, one skull, 3 Gold / 3 XP per member, with at most 2 additional travel Gold and no gear/potion/Arcana completion lottery. Longer quiet routes can complete successfully without a random encounter. For combat routes, short road skirmishes occur at skull-dependent intervals (150/135/120/105/90 seconds), plus the full objective fight. The plan leaves space before the finale and excludes the campfire boundary. Survivor loss or automatic retreat may reduce the planned encounter count. Authored enemy/theme pools are reused; road skirmishes use smaller, low-HP groups.

At 15+ minutes the midpoint starts a peaceful 60-second campfire, included in the session. Travel freezes; the companions gather around an ambient fire and share four quiet lines. Scheduling prevents a battle from overlapping its start. Campfire does not heal, refill Armor or extend time.

## Measured battle bound

Repeatable audit: **5,580 fresh seeded expeditions**, **27,682 battles**, all 31 authored contracts, levels 1/4/8, two compositions, ten seeds, three gear conditions. Every battle includes result beats, fate beats and any Gear Broken caption in its measured event holds. Travel/extraction is separately reserved.

| Measurement | Seconds |
|---|---:|
| Longest uncompressed presentation | 213.832 |
| 95th percentile | 105.174 |
| 99th percentile | 147.474 |
| Natural maximum +20% margin +12s return | 268.599 |
| Normal bounded playback target | 55 |
| Hard playback deadline | 60 |
| Extraction reserve | 12 |

The natural upper end cannot fit inside a three-minute session. Therefore playback holds scale to a 55-second budget, leaving five seconds of margin before a hard 60-second deterministic projection fallback. That fallback applies all remaining saved events and the resolved final fighter state; it never invents a win or rolls another outcome. The pure battle simulation has a 180-action cap and explicitly draws at the cap. A deliberately extreme high-HP fixture verifies that limit. This is an instrumented event/animation schedule bound, not a stopwatch or physical-monitor timing claim. The worst normal sample and all raw audit parameters are retained in `tests/strict-focus-audit.json`.

**Safety violations: 0.** The audit advances the clock without consuming playback, exercising the fallback while unfocused/unseen. Focused tests additionally advance at one-second intervals through every deadline and every peaceful minute.

## Progression and support

Level cap is 8. XP required for each next level: **30, 150, 360, 650, 1050, 1600, 2300**, then cap. Cumulative XP to L8 is 6,240. The original small class-stat gains through L4 remain; L5–8 add no base HP/attack/defense inflation. Removed per-level legacy +2 Attack/+1 Defense growth. The first signature unlocks at L3, the second at L6. Every level has an acquired refinement, readable in Camp → Powers and Full Sheet → Acquired powers. Cooldowns count personal turns.

Barbarian: Fury, Cleave, Bloodied Resolve, Quake, once-per-battle Relentless. Knight: Guard, Shield Bash, Interpose, Rallying Guard, Last Stand. Cleric: periodic Kind Word (heal or bounded Ward), Blessing, Renewal, Sanctuary, Grace; support takes priority and never resurrects. Rogue: Quickstep, Feint, mild nonlethal Venom Edge, Smoke Bomb, Opportunist. Ranger: Steady Aim, Pinning Shot, Mark, Volley, one mark transfer. Mage: Focus, Fireburst, Ward Spark, Frost Ring, non-chaining Echo. Area hits use one point of damage and normal Ward/Armor absorption. Control/debuffs are short and probabilistic. Ordinary attack targeting retains the existing distributed logic.

Wound titles describe the existing exact shared mechanic: each survived knockout contributes -2 percentage points Dodge and initiative ×0.97, stacking by knockout, not by wound title. Scars are permanent records; ritual removal does not remove lasting stacks. Camp Care pages one wound at a time; Full Sheet → Wounds and effects provides controller/keyboard-readable details. Recap snapshots include the same wording. No flavor injury has been assigned an unsupported penalty.

## Danger, rewards and equipment

All player-facing quest badges, confirmation, recap and filters use one to five skulls. Legacy Easy/Normal/Hard data remains internal for migration. Skulls represent risk, never duration. The catalogue has all five ratings; some duration/filter combinations intentionally have no contract. One-minute routes only offer one skull.

Gear Broken has a 6% roll at the first positive-to-zero Armor crossing, at most once per adventurer per expedition, only if armor gear is equipped. One affected item retains its identity and contributes zero Armor until repaired. It is not deleted. Broken flags survive return, shared-stock transfer, sell/equip, save/load. Shop has Head, Body, Off-hand, Accessory, Supplies and Repairs pages; equipped repair costs 35% of item purchase price (rounded up), restores its Armor, and refuses repeated repairs. Broken shared-stock gear can be equipped and then repaired, or sold/replaced.

Ordinary gear in this audit means the least expensive compatible Head and Body items. Strong gear means the highest-price compatible item in every supported slot. This is more explicit than the previous audit’s single ordinary cap. Initial over-severe tuning is retained in `tests/strict-focus-initial-tuning.json`; the final five-skull tuning adds HP but does not double-stack another damage bonus on top of existing authored damage.

| Skulls | Gear | Level | Runs | Clear | Deaths / member slots | Wounded / member slots | Broken / runs | Wipes |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | none | 1 | 220 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 1 | ordinary | 1 | 220 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 1 | strong | 1 | 220 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 1 | none | 4 | 220 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 1 | ordinary | 4 | 220 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 1 | strong | 4 | 220 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 1 | none | 8 | 220 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 1 | ordinary | 8 | 220 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 1 | strong | 8 | 220 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 2 | none | 1 | 60 | 98.3% | 2.8% | 5.6% | 0.0% | 1 |
| 2 | ordinary | 1 | 60 | 100.0% | 0.0% | 0.0% | 3.3% | 0 |
| 2 | strong | 1 | 60 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 2 | none | 4 | 60 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 2 | ordinary | 4 | 60 | 100.0% | 0.0% | 0.0% | 1.7% | 0 |
| 2 | strong | 4 | 60 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 2 | none | 8 | 60 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 2 | ordinary | 8 | 60 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 2 | strong | 8 | 60 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 3 | none | 1 | 120 | 72.5% | 18.9% | 20.8% | 0.0% | 32 |
| 3 | ordinary | 1 | 120 | 94.2% | 5.6% | 6.1% | 10.8% | 7 |
| 3 | strong | 1 | 120 | 97.5% | 3.3% | 2.5% | 7.5% | 3 |
| 3 | none | 4 | 120 | 97.5% | 2.2% | 3.6% | 0.0% | 3 |
| 3 | ordinary | 4 | 120 | 100.0% | 0.3% | 1.1% | 4.2% | 0 |
| 3 | strong | 4 | 120 | 100.0% | 0.0% | 0.3% | 0.0% | 0 |
| 3 | none | 8 | 120 | 100.0% | 0.8% | 0.6% | 0.0% | 0 |
| 3 | ordinary | 8 | 120 | 100.0% | 0.6% | 0.0% | 4.2% | 0 |
| 3 | strong | 8 | 120 | 100.0% | 0.0% | 0.0% | 0.0% | 0 |
| 4 | none | 1 | 60 | 1.7% | 50.6% | 48.3% | 0.0% | 59 |
| 4 | ordinary | 1 | 60 | 11.7% | 39.4% | 43.3% | 8.3% | 45 |
| 4 | strong | 1 | 60 | 30.0% | 40.0% | 39.4% | 1.7% | 42 |
| 4 | none | 4 | 60 | 46.7% | 33.3% | 31.7% | 0.0% | 31 |
| 4 | ordinary | 4 | 60 | 65.0% | 27.2% | 18.9% | 1.7% | 21 |
| 4 | strong | 4 | 60 | 75.0% | 21.7% | 15.0% | 1.7% | 15 |
| 4 | none | 8 | 60 | 61.7% | 24.4% | 26.1% | 0.0% | 23 |
| 4 | ordinary | 8 | 60 | 71.7% | 17.2% | 16.1% | 1.7% | 17 |
| 4 | strong | 8 | 60 | 81.7% | 11.7% | 13.9% | 0.0% | 11 |
| 5 | none | 1 | 160 | 0.0% | 52.9% | 45.0% | 0.0% | 153 |
| 5 | ordinary | 1 | 160 | 0.0% | 50.8% | 46.9% | 8.8% | 151 |
| 5 | strong | 1 | 160 | 2.5% | 47.3% | 49.0% | 10.0% | 149 |
| 5 | none | 4 | 160 | 10.6% | 47.1% | 44.8% | 0.0% | 138 |
| 5 | ordinary | 4 | 160 | 21.9% | 42.3% | 40.4% | 8.1% | 121 |
| 5 | strong | 4 | 160 | 40.6% | 31.2% | 36.7% | 8.8% | 90 |
| 5 | none | 8 | 160 | 24.4% | 40.4% | 41.0% | 0.0% | 120 |
| 5 | ordinary | 8 | 160 | 44.4% | 28.7% | 35.2% | 11.9% | 88 |
| 5 | strong | 8 | 160 | 63.7% | 22.9% | 26.9% | 7.5% | 58 |

Deaths/wounds are final member outcomes, not probabilities of individual fate flips. Broken is expected break count per run; no item is deleted by this rule. Clear requires victory without automatic retreat. The sample covers two fixed compositions, not all possible parties; no statistical confidence guarantee is claimed. Full quest/duration/skull/level/gear rows include rewards, min/max observed battles, retreats, wipe counts and timing violations.

| Duration | Planned combat encounters, min–max across combat routes | Observed min–max | Peaceful minute |
|---:|---:|---:|---|
| 1 min | 0–0 | 0–0 | — |
| 3 min | 0–2 | 0–2 | — |
| 5 min | 0–3 | 0–3 | — |
| 10 min | 0–6 | 0–6 | — |
| 15 min | 0–9 | 0–9 | 60 seconds at midpoint |
| 25 min | 0–15 | 0–15 | 60 seconds at midpoint |
| 30 min | 0–19 | 0–19 | 60 seconds at midpoint |

The planned table includes quiet optional routes and their seed-dependent random encounter availability; zero-combat optional routes still receive field notes every 20 seconds when no battle is playing. Early wipes/retreats explain lower observed counts.

## Art, camp, combat UI and formation

96 unique portrait choices (8 per class/type), six 1152×288 portrait atlases, twelve 768×512 walking atlases (96 distinct actor cells), and 96 independent 576×384 side-view combat sheets. Portraits crop heads/shoulders from the generated identity source; full-body models use complete generated front/profile/rear/action views. Walking sheets use MZ down/left/right/up ordering and three frames per direction; combat sheets use 9×6 / 18-motion ordering. Native frame packing adds small bobbing; many MZ motions deliberately share ready/action key poses. These are compact key-pose animations, not 54 independently hand-drawn poses per actor.

Every selected portrait key maps to its own walking actor index and its own combat sheet. Existing default/v2 keys retain meaning and the additional selections use v4 keys. Active, replay and historical copies refresh via the migration traversal. Reanimated monster art is unchanged. All 96 portrait, walking and combat identity hashes are unique; geometries, RGBA mode, transparency and file existence validate.

Catalogue: [`data/RPGManagerArtV4.json`](../data/RPGManagerArtV4.json). Review: [96-identity contact sheet](Next_Sprint_Art_Contact.webp). Generated originals: `img/sprint-source/{front,side,rear,attack}.webp`. Built-in imagegen was used; no API-key CLI. See `Next_Sprint_Art_Provenance.json` for prompts and source hashes. Minor pose/palette differences between generated views remain possible and can be reviewed in the contact sheet; atlas packing itself is deterministic.

Camp opens with campsite left and available roster right, never a remembered sheet. Selecting a member opens Overview/Gear/Care/Powers. Enemy HP/Armor/Ward now use a dedicated shared strip above the clipped action lane, keyed by stable fighter identity; animated bodies cannot overlap it. Combat creation preserves input order instead of sorting front-liners ahead of back-liners; travel, combat and saved projections derive from that same order. Return flips direction without reversing the party array.

## Verification and evidence

Current regression run: **390 passed, 0 failed**, recorded in `tests/strict-focus-regressions.json` / `.txt`. Includes the previous current suite with intentional expectations updated (cap, schema, art count, return window, deadline completion), plus the new strict-focus suite. Historical suites outside the current handoff’s suite were not promoted as current contracts.

`python scripts/validate_sprint2_content.py`: 120 exclusive names, 12 recruitment categories, 640 unique notes and 31 valid quest backgrounds. `python scripts/sync_adventurer_catalogue.py --check`: six classes/twelve legacy move definitions match. `python scripts/validate_sprint_art.py`: 96 unique portrait/walk/combat identities and valid alpha/geometry. All four changed plugins pass `node --check`.

Isolated Playwright browser results: 816×624 PASS, 1280×720 PASS. `tests/strict_focus_smoke.py` covers eight-choice guided creation, camp entry, sheet tabs, slot/service pages, skull filters, compact embark confirmation, visible Recall, safe default/cancel/confirm, exactly-once recap, actual combat stage and campfire. Keyboard input and MZ controller mapping inspected; no physical controller, native monitor/audio or extended soak claim.

Screenshots: [816 camp](../tests/visuals/strict-816-camp.webp), [816 battle](../tests/visuals/strict-816-battle.webp), [816 campfire](../tests/visuals/strict-816-campfire.webp), [1280 battle](../tests/visuals/strict-1280-battle.webp), [Recall confirmation](../tests/visuals/strict-816-recall-cancel.webp). Browser uses isolated web storage, never the user’s NW.js save files.

## Save migration, rollback and remaining risks

Schema **24 → 25**. Existing migration clamps at level 8, fills the new fields lazily, refreshes portrait/walk/combat references and preserves time, injuries, inventory and settlement IDs. Broken-stock flags are additive. Current in-flight old schedules acquire a conservative new plan on first tick; already-completed battle stages remain protected against duplicate recording. Normal saves remain Home-only. No user save was edited.

Source baseline: `backups/next-sprint-source/` contains pre-edit plugins, data, plugin registration and the previous current handoff. Old art remains on disk. Restore those source directories to roll back; do not restore or delete user saves. New art uses sibling v4 filenames, so the old baseline continues to resolve its own assets.

Remaining risks: generated sheets use limited key poses; native controller/monitor/audio/long-soak gates remain unperformed. Balance is a deterministic two-composition sample, and five-skull quests remain deliberately punishing even with gear. Unfocused or stalled renderers may see fast-resolution summaries rather than every animation. The event log preserves the full resolved combat. No network service, external publication or deployment was needed.

Reproduce: `python scripts/run_sprint_regressions.py`; `node scripts/strict_focus_audit.js`; `python scripts/validate_sprint_art.py`; `python tests/strict_focus_smoke.py`.
