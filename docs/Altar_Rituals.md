# Altar rituals

Updated October 17, 2026 for schema 31 and the eight-skull party-level estimates. Prices and effects follow the [current defense and economy rebalance](Defense_Rebalance.md).

Each ritual is unlocked only by winning its own contract. Arcana is charged only
when casting an unlocked ritual. Quest dispatch does not charge coins or Arcana;
no quest entry-cost mechanic was found in the current implementation.

| Ritual | Activation Arcana | Unlock quest | Recommended level |
| --- | ---: | --- | ---: |
| Warding | 80 | The Unbroken Seal | 2 |
| Healing | 120 | The Saint's Broken Hands | 3 |
| Greed Prayer | 100 | The Gilded Tithe | 2 |
| Reanimate | 450 | Names Beneath the Ossuary | 8 |
| Fortune's Favor | 40 | The Beggar's Silver Bell | 4 |
| Battle Hymn | 60 | The Choir of Rust | 3 |
| Veil of Mercy | 260 | The Thread Before the Axe | 8 |
| Last Rites | 650 | The Ferryman's Last Passenger | 8 |
| Arcane Rebate | 25 | The Empty Treasury | 2 |
| Oath of the Vanguard | 60 | The Shieldmaker's Promise | 5 |
| Familiar's Vigil | 110 | The Lantern Without a Keeper | 8 |
| First Strike | 60 | The Dawn Duel | 2 |
| Quickening Prayer | 180 | The Twice-Struck Chime | 8 |
| Arcane Offering | 30 | Embers for the Altar | 8 |

The stronger resurrection, death prevention and ability-repeat rituals require
level-eight trials. The contracts use the existing difficulty, battle, patrol,
reward and background systems. Existing quest durations are unchanged.

## Effects and persistence

- Warding is a single shared party charge, blocking one entire hit. Familiar's
  Vigil is also one shared hit interception, scoped to the next quest. When both
  are active, the familiar intercepts first. Misses consume neither.
- An unspent Warding charge remains pending after return. Battle Hymn remains
  pending until a battle occurs, then grants +1 damage for that battle, including
  secondary attack hits. These are the two effects that can carry through a
  combatless quest.
- Fortune grants 25% more quest coins, rounded down, with no Ward requirement or penalty.
- Rebate suppresses all coins earned by that expedition, including gathered
  coins, and grants 50 additional Arcana after at least one actual battle victory. A combatless return preserves the prepaid Rebate for a later quest. Offering grants 12 Arcana per
  actual battle victory; draws, losses and extra waves do not count as wins.
  These effects settle once on return, including a recall, and cannot be paid
  twice by reloading or repeating settlement.
- Oath grants one consumable point of Armor only to the selected adventurer for
  the next quest. It does not alter targeting, grant a guard, or refill between
  battles. Its loss is separated from wear on real armor and equipment.
- First Strike adds +2 to the first party attack attempt next quest. A miss uses
  the blessing; healing and non-attack support actions do not.
- Quickening uses the existing seeded d20: a result of 16–20 grants that
  adventurer a second special use for that battle. Baseline is one use. No
  ability unlocks are granted, and two is a hard cap. The chance is rolled
  independently per adventurer and per battle of the next quest.
- Mercy intervenes on the first actual death next quest, after the normal
  knockout fate result. It leaves the adventurer active at 1 HP and applies the
  existing permanent-wound/injury penalties. An ordinary survived knockout does
  not spend Mercy. Later deaths receive no second intervention.
- Healing removes one permanent wound and its associated injury stack without
  restoring HP. Greed exchanges exactly 100 Arcana for 100 coins.
- Reanimate retains class, level, living class HP/Armor/Ward, wounds and the
  individual skeleton appearance. Potions and ordinary healing still work; XP
  cannot advance its level. A subsequent skeleton knockout is death, returns
  it to the graveyard, and permanently bars another Reanimate cast.
  Existing equipment return-on-death rules still apply.
- Last Rites returns a fallen adventurer to an active camp slot at 1 HP with an
  injury, preserving their identity and existing reanimation eligibility flag.
  It does not replenish armor or ward. Full-party revival uses the existing
  explicit replacement confirmation.

Pending effects do not stack duplicate casts. Both pending and active effects,
consumed charges, victory counts and reanimation eligibility are saved with the
existing state. Legacy purchased unlock flags are replaced by quest-earned
unlocks during migration; newer saves preserve earned unlocks permanently.

## Validation

`tests/altar_rituals.test.js` covers all fourteen effects, paid activation,
quest-only unlocks, failed casts, expiry, save/load, actual encounter consumption,
death handling and duplicate settlement. `tests/altar_rituals_smoke.py` exercises
the altar at 816×624 and 1280×720, including pagination, locked rituals, quest
victory unlocks, casts, targets, revival confirmation and barred reanimation.

Current validation and balance evidence: [Defense rebalance](Defense_Rebalance.md).
