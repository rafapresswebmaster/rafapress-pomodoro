# Identity, quests and performance - changed files

No Git metadata is present. This is the explicit delivery manifest relative to the preceding coordinated sprint.

| Files | Purpose |
|---|---|
| `js/main.js` | Delegate native close before teardown |
| `js/plugins/RPGManager.js` | Data loading, identity/UI, board confirmation, camp navigation, native save/exit, redraw scheduling |
| `js/plugins/RPGManagerProgression.js` | Seeded identity/restock, probabilities/tuning, narrative/XP settlement, battle-local state, save duration preservation |
| `js/plugins/RPGManagerBattle.js` | Authoritative once-per-battle specials and truthful resolved effect events |
| `js/plugins/RPGManagerBattleStage.js` | Stable background, gold panels, bounded special cues and reduced rendering allocation |
| `data/RPGManagerIdentity.json` | 120 exclusive gender/class names |
| `data/RPGManagerNarratives.json` | 460 contract-specific and 20 shared notes |
| `data/RPGManagerStage3.json` | Explicit quest encounter tuning and intended-level warnings; rewards unchanged |
| `context/Adventurer_Classes_and_Dialogue.md` | Current special rule, editable sources and tuning explanation |
| `scripts/validate_sprint2_content.py` | Names, narratives and background validation |
| `scripts/sprint2_balance_audit.js`, `scripts/sprint2_tune.js`, `scripts/sprint2_campaign_route.js` | Reproducible balance, tuning and fresh-campaign evidence |
| `tests/sprint2.test.js` | 17 additional meaningful regression tests |
| `tests/sprint2_smoke.py`, `tests/sprint2_native_close.py`, `tests/sprint2_native_profile.py` | Two-size UI acceptance, real native close/save and repeatable profile |
| `tests/coordinated_sprint.test.js`, `tests/recoverable_errors.test.js`, `tests/complete_battle_sequence.test.js` | Update deliberate identity, confirmation and battle-rule expectations |
| `tests/coordinated_sprint_smoke.py`, `tests/focus_companion_smoke.py` | Updated action/filter geometry; atomic live timer comparison avoids cross-tick test race |
| `tests/coordinated_native_smoke.py`, `tests/focus_native_smoke.py` | Native boot/window readiness, confirmation-aware cleanup and correct OS focus evidence |
| `tests/sprint2-*.json`, `tests/sprint2-*.txt`, `tests/visuals/sprint2-*` | Recorded results, audits, native profiles and acceptance screenshots |
| Existing coordinated native/browser and focus-companion screenshot artifacts | Refreshed by the existing regression gates |
| `docs/Identity_Quest_Performance_Sprint.md` | Complete requirement coverage, commands, balance gap and native evidence/limits |
| `context/Teamfight_Manager_Post_Sprint_Handoff.md`, `context/README.md`, `tests/Post_Sprint_Fixes_Testing.md` | Current handoff, entry point and exact 195-test command |
| `context/archive/Teamfight_Manager_Coordinated_Sprint_Handoff.md` | Previous handoff preserved as history |

Disposable one-time editing/content-generation scripts were removed. No plugin order, package, schema number, audio/image assets, user campaign saves or unrelated application files were changed.
