# RPG Manager — complete current-game handoff for a systems, mechanics and balance review

Updated **October 17, 2026**, America/Bogota. Runtime save schema **27**; ritual unlock migration version **1**. This replaces the accumulated historical handoff. It describes the checked-in workspace as inspected on this date, including the fantasy expansion, all 96 individual skeleton appearances, the 14-ritual altar, and the latest rendering fixes.

**Purpose:** upload this Markdown file to ChatGPT to request a general upgrade sprint focused on polishing existing systems, mechanics and balance. It is a current-state specification and evidence packet, not authorization to implement a new sprint. Confirmed behavior, sampled measurements, suspected defects and open design decisions are explicitly separated.

**How to use the packet:** start with sections 1–4, the combat/economy/ritual sections, the fresh balance tables, and the review questions. The complete content catalogues and exact rule excerpts are included below. For source-level verification, the companion ZIP preserves the current custom plugins, all database JSON, focus UI, tests, source manifest, audit results and selected visual references. The runtime snapshot JSON includes the full dialogue and narrative text that would be unwieldy to repeat in prose. No user saves, save contents, credentials, backups or operating-system account data are included.

Old handoffs and old audit numbers are historical evidence, not the current rules. The previous handoff is preserved as `context/archive/Teamfight_Manager_Post_Sprint_Handoff_before_20261017_comprehensive.md`. Source code and runtime-merged JSON take precedence over comments, descriptions, old PDFs and legacy test assertions.

## 1. Product, player fantasy and current scope

RPG Manager is a cozy medieval-fantasy adventurer-management and focus-session game built inside RPG Maker MZ. The player manages a hamlet, creates three companions, chooses gear and camp jobs, activates altar rituals, and sends all three on a timed autonomous expedition. The party walks through a visual scene, meets threats, fights automatically, takes lasting injuries or dies, and returns with rewards and career history. The countdown is a real focus-session commitment; combat and consequences fit inside it.

The active company is exactly **three living adventurers**, in persistent slot order. There is one active expedition, Team A. The broader simulation accepts one to five units per side and legacy state still mentions Team B, but a second active team and a 15-member active roster are not current player features. There is no multiplayer, business server, remote database, open-world navigation loop, manual battle commands or current tactical stance selector.

Current player-facing currencies are **Gold/coins** and **Arcana**. There is one visible supply, a Potion. The six playable classes are Barbarian, Knight, Cleric, Rogue, Ranger and Mage. There are eight appearance choices for each class/sex combination: 96 living appearances and 96 matching skeleton appearances.

The next review should prioritize coherent existing rules, legible feedback, survival and reward curves, meaningful equipment/class choices, ritual value, economy pacing, content variety and maintainability. It should not assume the game needs another layer of systems to be interesting.

## 2. Explicit user constraints and latest delivered work

Treat these as established constraints unless the user expressly changes them:

- Preserve the authored quest countdowns. Wipes, automatic retreats, campfires, battles, ritual effects and minimized-window catch-up must not silently shorten, pause or extend the committed session. Deliberate existing Recall/early-end controls are separate user actions.
- Do not introduce quest entry fees. None were found in the current implementation.
- All 14 altar rituals unlock through their own personalized quest victories. Arcana pays for activation only; paid unlocks are prohibited.
- Do not resurrect rejected ritual suggestions or add fear, morale, scouting, quest-shortening or free ritual HP-healing effects. Existing ordinary camp recovery and class healing are established mechanics; this does not authorize new free-healing effects.
- Warding is one extra shared party Ward, not one charge per adventurer. Familiar's Vigil is one shared first-hit interception next quest. Oath grants only +1 Armor to its chosen adventurer, with no special targeting, taunt or party-protection effect.
- Healing removes one permanent wound. Greed Prayer exchanges exactly 100 Arcana for 100 coins. Reanimate keeps a skeleton's class identity, cannot level it, and permanently bars another Reanimate after its later death. Last Rites returns a fallen companion at 1 HP with an injury.
- Preserve individual character appearances and matching skeleton variants. Switching companions while viewing Gear must keep Gear selected.
- Protect user saves and keep migration/idempotent settlement intact. Do not restore obsolete mechanics merely to turn historical tests green.

Recent delivery: 20 additional fantasy enemy types, 15 authored varied missions, 14 ritual unlock missions, the Gear-tab persistence fix, 96 individual skeleton variants, and the current altar implementation. The game now has 75 runtime quests. The names and complete numbers are enumerated later.

## 3. Current facts at a glance

| Area | Current fact |
| --- | --- |
| Runtime | RPG Maker MZ 1.10.0; bundled PixiJS 5.3.x; NW.js desktop or HTTP-served browser |
| Build | Plain JavaScript and JSON. package.json is an NW.js launcher configuration, not an npm build pipeline. |
| Plugin order | RPGManagerBattle → RPGManagerProgression → RPGManagerBattleStage → RPGManager |
| Schema | 27; altar unlock migration marker 1; camp job production marker 2 |
| Party | 3 active slots; all filled living slots required for embark; one expedition |
| Level cap | 8; per-next-level XP 25 / 125 / 300 / 540 / 875 / 1330 / 1915; 5,110 cumulative to L8 |
| Quest durations | 1, 3, 5, 10, 15, 20, 25, 30 minutes |
| Runtime quests/enemies | 75 quests; 52 enemy records (some records are variants of the same type) |
| Content categories | {"Errands":11,"Hunt":26,"Short":7,"Boss Hunt":14,"Fieldwork":17} |
| Danger distribution | {"1":16,"2":16,"3":17,"4":14,"5":12} |
| Shop | 38 visible entries / 40 total definitions including legacy-only entries |
| Art | 96 living identities, 96 individual skeleton identities; older art is retained |
| Rituals | 14; all activation costs and unlock quests listed below |
| Starting resources | 100 Gold, 0 Arcana, 6 Potions; new-game guided creator replaces the template starters |
| Camp production | Every 30 seconds: base 1 resource, specialized classes 2; +1 HP recovery concurrently |
| Fresh balance evidence | 5400 baseline sessions + 1800 paired ritual sessions; 0 timer-safety violations |
| Full historical test inventory | 53 files; 610 passing assertions; 123 failing assertions; 0 timeouts |
| Native hardware limits | Physical controller, actual multi-monitor NW.js behavior, native audio and long soak are not newly validated by this handoff audit |

## 4. Highest-value review findings; distinguish facts from hypotheses

**Verified documentation drift:** the old handoff stacked schema 25/26/27 reports, claimed 31/41 quests, quoted obsolete XP thresholds, and contradicted current ward recovery. Combat file header comments still describe a retired attack/defense damage formula, repeated special cooldowns and stance multipliers. The live engine uses small integer damage, resource pools and limited-use specials. Several exported tables/functions are legacy compatibility surfaces, not active controls.

**Verified narrative coverage gap:** 34 of 75 runtime quests have no dedicated travel-note pool. `questNarrative` returns null if the quest has no own pool; shared notes are not an independent fallback. The 15 fantasy quests, 14 ritual quests and five recent individual monster hunts therefore have unique contract descriptions/backgrounds but do not have the same continuing authored field-note coverage as the older 41 quests. This can undermine perceived variety during long sessions.

**Verified ward attrition nuance:** the current timed simulation restores up to two innate Ward before encounters (except the first Fortune-penalized encounter), and prepareTeam also restores innate Ward. HP and worn Armor persist between battles. The old blanket claim of no between-fight HP/Armor/Ward refill is false for innate Ward. Decide the desired attrition rule before tuning casters or Ward gear.

**Verified economy opportunity:** once unlocked, Arcane Rebate costs 25 Arcana, grants 50 after the next quest, and suppresses its coins. It works on safe one-minute quests. Ignoring incidental rewards, this yields net +25 Arcana/minute, or 1,500/hour, versus a maximum of 720/hour from three specialized camp students. This is a concrete dominant-loop candidate, not proof it must be removed. Preserve the fixed +50 effect and free quest entry when considering cost/balance remedies.

**Sampled equipment dependence:** fresh audit results show large survival gaps between ordinary and strongest gear, especially at four/five skulls. Higher levels do not reliably overcome severe attrition with ordinary gear. A few L8 results are worse than L5 in small paired strata; class refinements, support turns and changed RNG paths deserve inspection rather than an assumption that every outcome must improve monotonically.

**Verified stat/description ambiguity:** legacy Attack/Defense numbers and modifiers remain in prepared units, threat scoring and UI, while ordinary attack damage comes from damage/signatureDamage or the selected move fallback. A +2 legacy Attack bonus is not automatically +2 damage. Review whether labels accurately teach what matters.

**Verified resurrection interpretation issue:** Reanimate restores living **class** HP/Armor/innate Ward. Equipment follows existing return-to-stock-on-death rules, so an equipped adventurer can return with different total max HP/armor/ward from their pre-death equipped total. The user brief said “what it had in life”; confirm whether class identity or exact equipped totals were intended before changing it. Last Rites preserves an exhausted skeleton's eligibility flag but can return it as a skeleton; only Reanimate is permanently barred. Treat that interaction as an explicit design question, not an approved new restriction.

**Verified content risk labels:** intendedLevel is a recommendation, not a hard entry-level gate. Skulls, duration, category, combatMode, reward labels and actual enemy groups are separate data. Some quest metadata is inherited or generic. The detailed catalogue exposes mismatches instead of silently treating prose as mechanics.

**Test debt:** 33 of 53 historical files fail in the fresh survey. Many assert superseded roster sizes, stances, d20 death saves, medkits, old production/XP rates or old render-source strings. Some modern-looking failures, including replay and leader succession checks, require triage. Do not label all failures either regressions or harmless stale tests without comparing intent and actual traces. Full titles and logs are included in the evidence bundle.

**Not newly measured:** long multi-session campaign pacing, duplicate-class team dominance, all class-order permutations, repeated resurrection choices, player comprehension, accessibility with assistive technology, native audio comfort and hardware soaks. The fresh simulations are deliberately narrower than a full balance sign-off.

## 5. Architecture, data precedence and implementation map

Four custom plugins are enabled. Battle is a pure seeded simulator with copied inputs and exported CommonJS/browser API. Progression owns persistent state, dispatch, timers, consequences, economy, migration and settlement. BattleStage draws saved event projections; it must never simulate or apply rewards. RPGManager adapts MZ scenes/windows, loads and validates JSON, owns browser/native lifecycle integration and drives the session clock.

`index.html` loads the read-only focus display before the engine loader. `js/focus_companion.js` provides the in-game focus readout and optional floating NW.js window; it does not own a second clock. `js/focus_timer.html` and `js/focus_timer_widget.js` are that window's view.

Startup loads roster, enemy template, dialogue, classes, base quest data, Stage3 quest catalogue, identity data, optional narratives, presentation and UI JSON. The runtime quest merge is effectively base quest data plus Stage3: Stage3 supplies the **current quests array**; the base file supplies the **enemy array, event definitions and XP settings**. Inspect the boot merge before editing either file. `RPGManagerArtV5.json` and `RPGManagerSkeletonArtV7.json` are art catalogues/provenance; current character paths are also derived by code from class, sex and portraitKey.

Plain JS uses MZ/global wrappers and optional NW.js APIs. There is no TypeScript/React/Vite build or network service. DOM overlays and canvas windows coexist, so event propagation, scene teardown, focus and coordinate scaling are important polish risks. The engine's standard data tables and stock assets remain present but do not define the custom manager's combat rules.

| Path | Role |
| --- | --- |
| js/plugins/RPGManagerBattle.js | Initiative, targeting, damage, class actions, deterministic RNG, limited specials, ritual combat effects, event log |
| js/plugins/RPGManagerProgression.js | All domain rules, state migration, inventory, roster, wounds/death, camps, expeditions, rewards and altar |
| js/plugins/RPGManagerBattleStage.js | Embedded battle/travel projection, sprite isolation, foot anchoring, backgrounds, counters and cached figures |
| js/plugins/RPGManager.js | MZ adapter, scenes, DOM/canvas UI, validation, save/load and process clock |
| data/RPGManagerClasses.json | Class legacy fields, selected move definitions, low-stat combat blocks and L2–4 growth |
| data/RPGManagerQuests.json | 52 enemy records, four event definitions, XP settings and historical base quests |
| data/RPGManagerStage3.json | Authoritative 75 current quest contracts and eight automatic travel events |
| data/RPGManagerIdentity.json | Class/sex name pools and creation identity data |
| data/RPGManagerNarratives.json | 41 own quest pools plus shared note text |
| data/RPGManagerDialogue.json | Class/event/expedition voice text |
| data/RPGManagerPresentation.json | Caption importance, holds, colors and dialogue/speed settings |
| data/RPGManagerUI.json | Hamlet locations, palette and developerMode=false |
| js/focus_companion.js | Read-only clock model, compact browser view, floating NW.js lifecycle/position |
| context/Adventurer_Classes_and_Dialogue.md | Editable historical class/dialogue source; verify synchronization before regenerating JSON |
| scripts/expand_fantasy_content.py | Rebuilds the 20-enemy/15-quest fantasy addition idempotently |
| scripts/add_ritual_quests.js | Rebuilds 14 personalized ritual contracts from current ritual metadata |
| scripts/pack_individual_skeletons.py | Packs generated skeleton silhouettes; includes measured alpha thresholds for difficult atlases |
| scripts/validate_skeleton_expansion.py | Checks 96 skeleton identities, frames, padding and creates the review sheet |
| scripts/handoff_balance_audit.js | Reproduces this handoff’s fresh balance sample |
| scripts/handoff_test_inventory.py | Runs all historical Node test files separately for a debt inventory |
| scripts/build_current_handoff.js | Rebuilds this snapshot and runtime fact export from current sources/audits |

## 6. Complete player journey and screen behavior

**Title/new game:** standard MZ title adapted to the cozy hamlet artwork. A guided creator builds three companions. Choose class, Type A/Type B appearance presentation (stored as male/female), one of eight portrait/model variants, and a name for each; review before committing. Duplicate classes are legal. Names are trimmed, limited to 24 characters and checked for collisions; punctuation is preserved. Stable internal founder IDs are Ada/Bram/Cora even when their class, sex, appearance and name are customized.

**Camp/Hamlet:** campsite on the left, three available companions on the right, with persistent slot order. Selecting a companion opens a sheet with Overview, Gear, Care and Powers. Overview includes identity, HP/Armor/Ward, wounds, career, bonds, traits and history. Gear uses Head/Body/Off-hand/Accessory selectors and respects compatibility and stock. Care exposes actual wounds and supplies. Powers lists the acquired level track. Switching to another companion preserves the selected tab, including Gear. Leaving and re-entering camp does not intentionally force a remembered sheet open. Full sheet/rename remains available.

**Camp jobs:** each active living companion can Idle, Work or Study. They recover HP concurrently, including while working/studying. Job fractions and recovery progress are saved; inactive/dead/away members do not produce. No active reserve bench exists to produce while the three-person company travels.

**Shop:** Head, Body, Off-hand, Accessory, Supplies and Repairs pages; item descriptions, class restrictions, stock, prices and worn/broken conditions. Potions are the only current supply. Equipment only changes permitted stats; equipping does not heal missing HP. Repairs operate on equipped broken gear and use the existing 35%-of-price rounded-up formula. Shared unequipped stock can be sold at the listed sell value; condition queues preserve wear/broken flags when moving equipment.

**Tavern:** free vacancy fills/replacements, 12 stable class/sex coverage candidates, and custom appearance/name creation. Current recruiting is not the old paid hourly three-candidate churn. Full-party replacement has a review/confirmation flow; replacing an active companion returns their gear and removes that character only after confirmation. Confirmed dismissal and archived legacy records are distinct historical code paths.

**Altar:** 14 rituals displayed with activation prices or Locked status. Detail pane names the specific unlock quest and recommended level, explains the exact effect, and shows pending activation. Locked selections cannot charge Arcana or purchase an unlock. Living/fallen-target rituals open the relevant list. Woundless Healing targets and exhausted Reanimate targets are disabled. Full-party revival uses explicit replacement confirmation. The paged list is tested at both window sizes.

**Graveyard:** dead records remain inspectable after empty slots are filled; gear has returned to stock. Fallen skeletons display permanent reanimation ineligibility. Ordinary supplies and class healing cannot revive the dead. An exhausted flag is persistent, not a UI-only restriction.

**Quest Board:** authored duration and skull-danger filters, compact contract list, intended level, coin/Arcana/XP rewards, environment, threats, conditions and rumors. All three living active slots embark. The three short/medium/long duration bands are <=3 / <=10 / >10 minutes, distinct from the authored quest categories such as Errands/Hunt/Fieldwork/Boss Hunt. The game does not guarantee every minute×skull combination has a contract. Embark confirmation summarizes the actual route, party and danger.

**Expedition/focus view:** one countdown and autonomous travel/battles, strict bounded playback, approach warnings, a quiet midpoint campfire for routes >=15 minutes, HP/Armor/Ward counters, captions, return narration and eventual recap. The optional floating clock projects the same state. Wipes and automatic retreat stop further danger but leave the timer running. Explicit Recall confirmation can end a session through its existing guarded path; cancel keeps the session running.

**Recap:** outcome, actual resource settlement, battle/attrition history, casualties, injuries, XP/levels, finds, broken gear, field notes and returning armor restoration. Dismiss recap to return to normal navigation. Replay is saved presentation of resolved events and must not resimulate battles or pay rewards again.

**Save/load:** standard MZ save/load with five slots per page, current manager state under Game_System. Save UI adapts to MZ's asynchronous save/global-index behavior. Loading upgrades state and resets process-session anchors, excludes closed time and clears already-seen sound cues.

**Inputs/layout:** canvas commands support keyboard, pointer and MZ input mappings; DOM overlays have event propagation guards and scaled coordinates. Escape/right-click returns or cancels where supported. Two validated browser viewports are 816×624 and 1280×720; physical controllers and assistive-technology acceptance remain separate checks.

## 7. Clock, scheduling and expedition lifecycle

The source of elapsed process time is `performance.now()` in RPGManager. A background interval/focus/restore path advances the same domain clock when rendering is throttled or stopped. Catch-up splits elapsed time into <=5,000 ms chunks instead of dropping time at a five-second cap. On load, runtime anchors reset so a closed game grants no mission or camp progress. System-clock rollback handling remains for legacy Date.now-based timers.

Dispatch copies the party, locks quest ID, duration, skulls, difficulty, leader/order metadata and background, transfers pending ritual effects, generates the encounter plan and starts the strict countdown. Stored encounter plans remain stable for existing trips; newer departures get current planning rules.

The simulation is synchronous/seeded: at an encounter the battle is resolved to a terminal snapshot first, consequences are persisted, and a saved presentation queue is constructed afterward. Presentation never decides whether someone dies. A rendering error must not erase or repeat the result.

The standard encounter needs a 60,000 ms bounded battle playback budget plus 12,000 ms extraction. Typical compression targets 55,000 ms. Combat cannot start without the remaining budget or overlap the campfire. A hard fallback finishes pending saved event projection at the deadline while retaining the full event log.

One-minute contracts are always peaceful/one skull, with 3 completion Gold, 0 completion Arcana and 3 XP per member in the timed override; at most 2 incidental travel Gold and no completion item lottery. Authoring a required fight on a one-minute contract does not override that runtime rule.

For combat routes, paced encounters begin around 20 seconds. Routes >=10 minutes use spacing 100,000 − 7,500×(skulls−1) ms; routes 5–9 minutes use 150,000 − 15,000×(skulls−1); shorter combat routes use 120,000 ms. Main objective combat is scheduled near the end while retaining battle+extraction+5,000 ms margin. The actual count depends on duration, skulls, campfire and safety windows.

At >=15 minutes, the midpoint reserves one peaceful 60-second campfire. Four 15-second text beats are presented; walking pauses/gathers companions and the countdown continues. The campfire does not add a new heal, morale, reward or time-shortening mechanic.

Local patrol pools on new contracts rotate through specified patrol enemy IDs, keeping final bosses out of the repeated road encounters. Legacy contracts without a separate pool derive skirmishes from objective enemies. Small skirmishes cap enemy HP to 2 or 3 depending on danger, cap Armor to 1 and set damage/signature damage to 1; boss/instant-death status is removed. At >=3 skulls some road encounters repeat a small group as two waves; large enemy groups split into waves of up to three. At >=4 skulls a seeded 1% Masked Jester substitution can replace an early encounter.

Random road battles get a 10-second “Something approaches...” warning before starting, subject to the same safety budget. A route-level automatic travel event occurs around 18% progress; older random opportunities and leader decisions also remain in the domain. Their existence does not mean every current contract exercises every legacy interruption branch.

If the company is wiped, encounters stop, incapacitated/dead figures remain absent and the clock runs to zero. If a later encounter is judged catastrophic for the surviving party, automatic retreat cancels completion rewards/XP, retains previous finds/consequences and runs the remainder of the timer toward return. The exact retreat formula is included in the rule appendix.

Explicit Recall has an existing confirmation/early-end path; it keeps accrued finds and applies any applicable ritual return effects once. Recalled/abandoned victories cannot unlock ritual quests. Returning living companions receive normal class/equipment Armor restoration and innate Ward replenishment, without an unconditional HP refill.

## 8. Combat rules: actual current execution

Both teams are copied on battle construction. Units need unique IDs within their side, nonempty names/roles/attack labels/passive descriptions, valid living HP, positive integer level and finite nonnegative core stats. Side-prefixed keys allow the same ID on opposing teams. The pure Battle class accepts 1–5 units per side, defaults to a 600-action bound, and the timed expedition explicitly uses **180 actions**. Action-limit produces a draw.

**Initiative:** each new round draws seeded tie-breakers and sorts living units by descending speed, then tie/index. Dead units lose queued turns. A neutralized/skipped turn consumes an action and still obeys the action limit. Input order remains the canonical visual order even though initiative differs.

**Player target AI:** fixed Tactical mode. Threat, low HP, high-value backline/support role, current focus and previous target are scored by the live weights below. Exported Aggressive/Defensive/Support modes and setStrategy remain compatibility surfaces; setStrategy currently returns an empty event list and does not change the live stance.

**Enemy target AI:** intelligence weights vulnerability; threat adds critical chance/special-unlock value; defenses subtract score; repeated targeting within the previous four enemy picks incurs anti-overfocus pressure when other targets exist. A seed/event-count/actor/target hash supplies stable variation. Formation does not impose a hard universal front-row target lock.

**Ordinary damage:** primary basic damage is `actor.damage || 1`. Signature damage prefers `signatureDamage`, then `damage`, then the rounded selected move multiplier fallback. This is not the old attack-minus-defense formula in the file header. Player critical hits double base damage; ritual flat bonuses and class conditional bonuses are added afterward. Class effects/mark, Knight Guard, Resolve, Interpose, Pin and protected-hit reduction modify that amount.

**Dodge:** a numeric dodgeChance overrides tier fallback, clamped to 0..0.75. Actual class stats are percentages divided by 100. Player fallback tiers are 15/25/35%; enemy fallback tiers 5/12/20%. Rogue L2+ adds its separate class dodge increment. A miss causes no HP/Armor/Ward loss and spends an attempted First Strike. Player crit rolls happen before dodge.

**Defensive order:** a shared Familiar/Warding ritual interception can absorb the entire non-missed incoming hit. Otherwise damage spends temporary Ward, innate Ward, Armor, then HP. Ordinary Ward is a point pool, unlike the special ritual hit interception. Oath's temporary Armor is spent before attributing wear to real Armor. Mage Fireburst's main special can bypass defenses for one HP damage.

**Knockouts/death:** on ordinary human HP reaching zero, a seeded 50/50 fate result decides survived knockout versus death. There is no current d20 DC14 death-save probability even though legacy helpers/config/comments still mention it. A survived knockout persists as Wounded at camp/1 HP, adds lasting injury/permanent-wound consequences, and removes that figure from the rest of the expedition. It is not a free re-entry between battles. Skeleton knockout is death without a survival coin. Mercy can replace the first actual death with active 1 HP and a serious wound.

**Special usage:** normal maximum is one special-use charge per player per battle. signatureUnlocks is 0 before L3, 1 at L3–5 and 2 at L6+, but the numeric 2 is not a normal two-cast permission. L6 unlocks refinements; Quickening's successful 25% roll changes the use cap to two. Specials can trigger from seeded d20 preference; a still-available special is forced after the third personal turn. Enemy signatures use their own cooldown and a hard maximum of one use, even if a larger authored limit is present.

**Action ordering matters:** per-turn refinements/support can consume a turn before ordinary attack selection. Cleric support priorities therefore affect effective damage and which charge gets spent. Secondary attacks can receive Battle Hymn and an unspent First Strike; support healing does not. Venom is one nonlethal tick and cannot kill. Marks/echoes/follow-ups are bounded to avoid unlimited chains.

**Waves:** eliminating one wave can replace enemies with the next wave without resetting the player's spent special/ritual resources. The battle only ends in victory after all waves. Log events carry enough identity, damage and result data to project later without re-running RNG.

### Live target-scoring tables (legacy modes retained for comparison)

```json
{
  "Aggressive": {
    "threat": 0.35,
    "lowHp": 1.1,
    "highValue": 28,
    "focus": 8,
    "previous": 8,
    "protect": 0,
    "penetrator": 0
  },
  "Defensive": {
    "threat": 0.75,
    "lowHp": 0.15,
    "highValue": 4,
    "focus": 0,
    "previous": 18,
    "protect": 120,
    "penetrator": 65
  },
  "Tactical": {
    "threat": 1.2,
    "lowHp": 0.25,
    "highValue": 30,
    "focus": 34,
    "previous": 14,
    "protect": 0,
    "penetrator": 0
  },
  "Support": {
    "threat": 0.55,
    "lowHp": 0.15,
    "highValue": 12,
    "focus": 6,
    "previous": 14,
    "protect": 135,
    "penetrator": 45
  }
}
```

### Enemy targeting formula and fixed player Tactical target path

```javascript
_target(actor) {
            const opponents = this._living(actor.side === "player" ? "enemy" : "player");
            if(actor.side==="enemy"){
                const intelligence=String(actor.intelligence||"normal").toLowerCase();
                this._enemyFocusHistory ||= [];
                const recent=this._enemyFocusHistory.slice(-4);
                const scored=opponents.map(target=>{
                    const focus=recent.filter(key=>key===target.key).length;
                    const defense=(target.armor||0)+(target.innateWard||0)+(target.temporaryWard||0);
                    const vulnerability=(1-target.health/target.maxHealth)*(intelligence==="high"?1.3:intelligence==="low"?.3:.8);
                    const threat=Math.min(1,((target.critChance||0)*2)+(target.signatureUnlocks?0.3:0));
                    const overfocus=opponents.length>1?Math.max(0,focus-1)*1.4:0;
                    let hash=stableTie(this._seed,`${this.events.length}:${actor.key}>${target.key}`);hash=Math.imul(hash^(hash>>>16),0x45d9f3b);hash=Math.imul(hash^(hash>>>16),0x45d9f3b);const variation=((hash^(hash>>>16))>>>0)/4294967296*2;
                    const score=vulnerability+threat-defense*.12-overfocus+variation;
                    return {target,score,factors:{vulnerability,threat,defense,overfocus},reason:overfocus?"recent focus pressure":"threat and defensive opportunity"};
                }).sort((a,b)=>b.score-a.score||a.target.key.localeCompare(b.target.key));
                const decision=scored[0],target=decision.target;
                this._enemyFocusHistory.push(target.key);this._enemyFocusHistory=this._enemyFocusHistory.slice(-4);
                return {target,strategy:intelligence,positionIntent:"attack",decision};
            }
            const strategy = actor.side === "player" ? this._strategy : "Tactical";
            const allies = this._living(actor.side);
            const vulnerableKeys = new Set(allies.filter(ally =>
                [COMBAT_ROLES.BACKLINE, COMBAT_ROLES.SUPPORT].includes(ally.combatRole) || ally.health / ally.maxHealth < 0.55
            ).map(ally => ally.key));
            const focusKey = opponents.some(npc => npc.key === this._focusTargets[actor.side]) ? this._focusTargets[actor.side] : null;
            const scored = opponents.map(target => {
                const attackedKey = this._actorLastTargets[target.key];
                const protect = vulnerableKeys.has(attackedKey);
                const context = {
                    focus: target.key === focusKey,
                    previous: target.key === this._actorLastTargets[actor.key],
                    protect,
                    penetrator: protect || target.combatRole === COMBAT_ROLES.FLANKER
                };
                return { target, ...targetPriority(actor, target, strategy, context), tie: stableTie(this._seed, `${actor.key}>${target.key}`) };
            }).sort((a, b) => b.score - a.score || a.tie - b.tie || a.target.key.localeCompare(b.target.key));
            const decision = scored[0];
            const target = decision.target;
            this._targetCounts.set(target.key, (this._targetCounts.get(target.key) || 0) + 1);
            this._lastTargets[actor.side] = target.key;
            if (strategy === "Tactical" || strategy === "Aggressive") this._focusTargets[actor.side] = target.key;
            const positionIntent = strategy === "Aggressive" ? "pursue" :
                strategy === "Defensive" ? (decision.reason.includes("protect") || decision.reason.includes("intercept") ? "intercept" : "hold") :
                strategy === "Support" ? (actor.combatRole === COMBAT_ROLES.SUPPORT ? "support" : "hold") : "focus";
            return { target, strategy, positionIntent, decision };
        }
```

### Current special-use preference

```javascript
_signatureDecision(actor, target) {
            if (actor.side !== "player") return { use: actor.cooldown === 0 && (actor.signatureUses||0) < Math.min(1,actor.signatureUseLimit||1), roll: null, reasons: ["enemy combat instinct"] };
            if (actor.signatureSpent) return { use: false, roll: null, reasons: ["battle signature already spent"] };
            const traits = actor.personalityTraits || [], ratio = actor.health / actor.maxHealth;
            let score = target.boss || /BOSS:/.test(target.name) ? 8 : 0;
            if (ratio < 0.45) score += 4;
            if (target.health / target.maxHealth > 0.65) score += 2;
            if (traits.includes("reckless")) score += 4;
            if (traits.includes("cautious")) score -= 3;
            if (this._strategy === "Aggressive") score += 4;
            if (this._strategy === "Defensive") score -= 2;
            const roll = d20(this._seed, `signature:${actor.id}:${this._actions}`);
            const use = roll + score >= 14;
            const reasons = [target.boss || /BOSS:/.test(target.name) ? "important enemy" : "battle danger"];
            if (ratio < 0.45) reasons.push("mortal pressure");
            if (traits.includes("reckless") || traits.includes("cautious")) reasons.push(`${traits.includes("reckless") ? "reckless" : "cautious"} personality`);
            return { use, roll, score, reasons };
        }
```

## 9. Six classes, every level, powers and legacy move fields

These are intrinsic live combat stats before equipment, injuries and per-battle effects. speed includes the live class base plus floor((level−1)/2). Dodge/Crit are percentages. Growth of HP/Armor/Ward/Crit stops after L4; later levels refine abilities. Class-specific runtime additions such as Rogue dodge and Ranger crit are separate from this base table.

| Class | Level | HP | Armor | Ward | Dodge % | Crit % | Speed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| barbarian | 1 | 6 | 0 | 0 | 5 | 10 | 7 |
| barbarian | 2 | 8 | 0 | 0 | 5 | 10 | 7 |
| barbarian | 3 | 8 | 1 | 0 | 5 | 10 | 8 |
| barbarian | 4 | 9 | 1 | 0 | 5 | 15 | 8 |
| barbarian | 5 | 9 | 1 | 0 | 5 | 15 | 9 |
| barbarian | 6 | 9 | 1 | 0 | 5 | 15 | 9 |
| barbarian | 7 | 9 | 1 | 0 | 5 | 15 | 10 |
| barbarian | 8 | 9 | 1 | 0 | 5 | 15 | 10 |
| knight | 1 | 5 | 3 | 0 | 5 | 5 | 5 |
| knight | 2 | 5 | 5 | 0 | 5 | 5 | 5 |
| knight | 3 | 6 | 5 | 0 | 5 | 5 | 6 |
| knight | 4 | 6 | 6 | 0 | 5 | 5 | 6 |
| knight | 5 | 6 | 6 | 0 | 5 | 5 | 7 |
| knight | 6 | 6 | 6 | 0 | 5 | 5 | 7 |
| knight | 7 | 6 | 6 | 0 | 5 | 5 | 8 |
| knight | 8 | 6 | 6 | 0 | 5 | 5 | 8 |
| ranger | 1 | 4 | 1 | 0 | 20 | 15 | 11 |
| ranger | 2 | 4 | 2 | 0 | 20 | 15 | 11 |
| ranger | 3 | 4 | 2 | 0 | 25 | 15 | 12 |
| ranger | 4 | 4 | 2 | 0 | 25 | 20 | 12 |
| ranger | 5 | 4 | 2 | 0 | 25 | 20 | 13 |
| ranger | 6 | 4 | 2 | 0 | 25 | 20 | 13 |
| ranger | 7 | 4 | 2 | 0 | 25 | 20 | 14 |
| ranger | 8 | 4 | 2 | 0 | 25 | 20 | 14 |
| rogue | 1 | 4 | 0 | 0 | 25 | 20 | 13 |
| rogue | 2 | 4 | 1 | 0 | 25 | 20 | 13 |
| rogue | 3 | 4 | 1 | 0 | 30 | 20 | 14 |
| rogue | 4 | 4 | 1 | 0 | 30 | 25 | 14 |
| rogue | 5 | 4 | 1 | 0 | 30 | 25 | 15 |
| rogue | 6 | 4 | 1 | 0 | 30 | 25 | 15 |
| rogue | 7 | 4 | 1 | 0 | 30 | 25 | 16 |
| rogue | 8 | 4 | 1 | 0 | 30 | 25 | 16 |
| mage | 1 | 3 | 0 | 3 | 5 | 20 | 8 |
| mage | 2 | 3 | 0 | 4 | 5 | 20 | 8 |
| mage | 3 | 3 | 1 | 4 | 5 | 20 | 9 |
| mage | 4 | 3 | 1 | 5 | 5 | 25 | 9 |
| mage | 5 | 3 | 1 | 5 | 5 | 25 | 10 |
| mage | 6 | 3 | 1 | 5 | 5 | 25 | 10 |
| mage | 7 | 3 | 1 | 5 | 5 | 25 | 11 |
| mage | 8 | 3 | 1 | 5 | 5 | 25 | 11 |
| cleric | 1 | 4 | 1 | 2 | 5 | 10 | 6 |
| cleric | 2 | 4 | 2 | 2 | 5 | 10 | 6 |
| cleric | 3 | 4 | 2 | 3 | 5 | 10 | 7 |
| cleric | 4 | 5 | 2 | 3 | 5 | 15 | 7 |
| cleric | 5 | 5 | 2 | 3 | 5 | 15 | 8 |
| cleric | 6 | 5 | 2 | 3 | 5 | 15 | 8 |
| cleric | 7 | 5 | 2 | 3 | 5 | 15 | 9 |
| cleric | 8 | 5 | 2 | 3 | 5 | 15 | 9 |

### Barbarian — Strong, durable striker

| Level | Current displayed power track |
| --- | --- |
| 1 | L1 Heavy melee |
| 2 | L2 Fury: after damage, next hit +1, once/battle |
| 3 | L3 Cleave: 50% chance of 1 splash damage, once/battle |
| 4 | L4 Cleave chance 60% |
| 5 | L5 Bloodied Resolve: first low-HP hit reduced by 1 |
| 6 | L6 Quake: 1 damage to each enemy; 15% stagger, once/battle |
| 7 | L7 Wounded Resolve: low-HP protection refreshes once |
| 8 | L8 Relentless: one 1-damage follow-up after a takedown/battle |

| Selected move ID | Name | Multiplier field | Cooldown field | Catalogue description |
| --- | --- | --- | --- | --- |
| bruiser_a | Cleave | 1.65 | 3 | Heavy main hit; 50% chance of 1 damage against another enemy. |
| bruiser_b | Rapid Smash | 1.25 | 1 | A quicker, lighter single-target strike. |

Legacy display/core stats: `{"maxHealth":6,"attack":10,"defense":0,"speed":10}`. These are not a replacement for the low-integer combat block above. Selected move names may be replaced at execution by the class special name, and multiplier/cooldown fields are not a promise of the retired repeated-signature system.

### Knight — Armored front-line fighter

| Level | Current displayed power track |
| --- | --- |
| 1 | L1 Sturdy melee |
| 2 | L2 Guard: first hit reduced by 1 |
| 3 | L3 Shield Bash: 20% stagger, once/battle |
| 4 | L4 Guard also protects second hit |
| 5 | L5 Interpose: 15% chance to protect vulnerable ally |
| 6 | L6 Rallying Guard: party next hit -1, once/battle |
| 7 | L7 Interpose chance 20% |
| 8 | L8 Last Stand: one party protection at under 30% HP/battle |

| Selected move ID | Name | Multiplier field | Cooldown field | Catalogue description |
| --- | --- | --- | --- | --- |
| vanguard_a | Shield Bash | 1.65 | 3 | Hit and reduce the next hit against the lowest-health living ally by 1. |
| vanguard_b | Shield Hammer | 2.05 | 4 | A heavier single-target strike with a longer recovery. |

Legacy display/core stats: `{"maxHealth":5,"attack":5,"defense":3,"speed":8}`. These are not a replacement for the low-integer combat block above. Selected move names may be replaced at execution by the class special name, and multiplier/cooldown fields are not a promise of the retired repeated-signature system.

### Ranger — Fast precision attacker

| Level | Current displayed power track |
| --- | --- |
| 1 | L1 Ranged attack |
| 2 | L2 Steady Aim: +2 percentage points crit chance |
| 3 | L3 Pinning Shot: next enemy attack -1, once/battle |
| 4 | L4 Pinning Shot: 20% chance to stagger |
| 5 | L5 Mark Target: 20% chance, next allied hit +1 |
| 6 | L6 Volley: 1 damage per enemy, once/battle |
| 7 | L7 Mark chance 25%; Volley prefers live enemies |
| 8 | L8 Hunters Opening: mark transfers once/battle at 50% reliability |

| Selected move ID | Name | Multiplier field | Cooldown field | Catalogue description |
| --- | --- | --- | --- | --- |
| ranger_a | Pinning Shot | 1.65 | 3 | Hit and reduce the target next attack damage by 1, minimum 1. |
| ranger_b | Double Draw | 2.05 | 4 | A heavier single-target strike with a longer recovery. |

Legacy display/core stats: `{"maxHealth":4,"attack":15,"defense":1,"speed":16}`. These are not a replacement for the low-integer combat block above. Selected move names may be replaced at execution by the class special name, and multiplier/cooldown fields are not a promise of the retired repeated-signature system.

### Rogue — First-strike specialist

| Level | Current displayed power track |
| --- | --- |
| 1 | L1 Fast single-target attack |
| 2 | L2 Quickstep: +3 percentage points Dodge |
| 3 | L3 Feint: 20% chance to suppress 1 Armor for 2 target turns |
| 4 | L4 Quickstep +4pp and Feint chance 25% |
| 5 | L5 Venom Edge: 15% chance of 1 nonlethal damage on next target turn |
| 6 | L6 Smoke Bomb: 15% chance per enemy to weaken next attack, once/battle |
| 7 | L7 Feint chance 30%; Venom 20% |
| 8 | L8 Opportunist: +1 against debuffed target, once/action |

| Selected move ID | Name | Multiplier field | Cooldown field | Catalogue description |
| --- | --- | --- | --- | --- |
| duelist_a | Opening Strike | 1.65 | 3 | Deal 1 bonus damage when another ally has already hit the target. |
| duelist_b | Measured Thrust | 1.25 | 1 | A quicker, lighter single-target strike. |

Legacy display/core stats: `{"maxHealth":4,"attack":20,"defense":0,"speed":18}`. These are not a replacement for the low-integer combat block above. Selected move names may be replaced at execution by the class special name, and multiplier/cooldown fields are not a promise of the retired repeated-signature system.

### Mage — Fragile heavy magic attacker

| Level | Current displayed power track |
| --- | --- |
| 1 | L1 Fragile ranged magic |
| 2 | L2 Focus: 10% chance to weaken next enemy attack |
| 3 | L3 Fireburst: 1 damage per enemy, once/battle |
| 4 | L4 Focus chance 15% |
| 5 | L5 Ward Spark: ward 1 on exposed ally, once/battle |
| 6 | L6 Frost Ring: 1 damage/enemy, 15% weaken next attack, once/battle |
| 7 | L7 Frost Ring weaken chance 20% |
| 8 | L8 Arcane Echo: 15% chance of 1 on different enemy; no chains |

| Selected move ID | Name | Multiplier field | Cooldown field | Catalogue description |
| --- | --- | --- | --- | --- |
| mage_a | Arcane Pulse | 1.65 | 3 | Strong hit; 1 point bypasses Armor and Ward. |
| mage_b | Arcane Surge | 1.25 | 1 | A quicker, lighter single-target strike. |

Legacy display/core stats: `{"maxHealth":3,"attack":20,"defense":0,"speed":12}`. These are not a replacement for the low-integer combat block above. Selected move names may be replaced at execution by the class special name, and multiplier/cooldown fields are not a promise of the retired repeated-signature system.

### Cleric — Durable divine striker

| Level | Current displayed power track |
| --- | --- |
| 1 | L1 Kind Word: heal 1 or ward 1, once/battle |
| 2 | L2 Kind Word once/battle |
| 3 | L3 Blessing: ally next hit -1, once/battle |
| 4 | L4 Prefer exposed ally when none wounded |
| 5 | L5 Renewal: first heal restores 2 instead of 1 |
| 6 | L6 Sanctuary: party next hit -1, once/battle |
| 7 | L7 Sanctuary once/battle |
| 8 | L8 Grace: one party ward when ally under 30% HP/battle |

| Selected move ID | Name | Multiplier field | Cooldown field | Catalogue description |
| --- | --- | --- | --- | --- |
| cleric_a | Mending Light | 1.65 | 3 | Heal the living ally with lowest HP ratio for 1 HP; otherwise attack. |
| cleric_b | Judgment | 2.05 | 4 | A heavy strike with a longer recovery. |

Legacy display/core stats: `{"maxHealth":4,"attack":10,"defense":1,"speed":9}`. These are not a replacement for the low-integer combat block above. Selected move names may be replaced at execution by the class special name, and multiplier/cooldown fields are not a promise of the retired repeated-signature system.

### Exact per-turn class refinement/support implementation

```javascript
_refinementAction(actor,events){
            actor.personalTurns=(actor.personalTurns||0)+1;
            if(actor.suppressedArmorTurns>0&&!--actor.suppressedArmorTurns){actor.armor+=(actor.suppressedArmor||0);actor.suppressedArmor=0;}
            if(actor.venom&&actor.health>1){actor.venom=false;actor.health--;events.push({type:"attack",side:"player",actorKey:actor.venomSource,actorName:"Venom Edge",targetKey:actor.key,targetName:actor.name,targetSide:actor.side,attackName:"Venom Edge",damage:1,targetHealth:actor.health,targetArmor:actor.armor,targetWard:actor.temporaryWard+actor.innateWard,effectText:"Venom fades after one tick; cannot kill."});}
            if(actor.side!=="player")return false;
            const level=actor.level||1,allies=this._living("player"),enemies=this._living("enemy"),vulnerable=allies.slice().sort((a,b)=>a.health/a.maxHealth-b.health/b.maxHealth||(level>=4?(a.armor+a.innateWard+a.temporaryWard)-(b.armor+b.innateWard+b.temporaryWard):0)||a.key.localeCompare(b.key))[0];
            const partyWard=name=>{for(const ally of allies){ally.protected=true;this._supportEvent(actor,ally,name,events);}};
            if(level>=8&&!actor.capstoneSpent&&vulnerable.health/vulnerable.maxHealth<.3&&["knight","cleric"].includes(actor.classId)){actor.capstoneSpent=true;partyWard(actor.classId==="knight"?"Last Stand":"Grace");return true;}
            const cooldown=actor.classId==="cleric"&&level>=7?4:5;
            if(level>=6&&!actor.refinementSpent&&actor.personalTurns>=3&&(actor.personalTurns-3)%cooldown===0){
                actor.refinementSpent=true;const name={barbarian:"Quake",knight:"Rallying Guard",cleric:"Sanctuary",rogue:"Smoke Bomb",ranger:"Volley",mage:"Frost Ring"}[actor.classId];
                if(["knight","cleric"].includes(actor.classId))partyWard(name);
                else for(const enemy of enemies){
                    if(actor.classId!=="rogue")this._sprintHit(actor,enemy,name,events);
                    if(enemy.health>0&&["rogue","mage","barbarian"].includes(actor.classId)&&this._random()<(level>=7?.2:.15)){
                        if(actor.classId==="barbarian")enemy.skipTurns=Math.max(enemy.skipTurns||0,1);else enemy.pinned=true;
                        this._supportEvent(actor,enemy,name,events,0,actor.classId==="barbarian"?"Staggered: skip next turn.":"Weakened: next attack -1, minimum 1.");
                    }
                }
                return true;
            }
            if(actor.classId==="cleric"){
                if(level>=3&&!actor.signatureSpent){this._spendSignature(actor);vulnerable.protected=true;this._supportEvent(actor,vulnerable,"Blessing",events);return true;}
                const period=level>=2?2:3;
                if(!actor.kindWordSpent&&(actor.personalTurns-1)%period===0){actor.kindWordSpent=true;
                    const wounded=allies.filter(n=>n.health<n.maxHealth).sort((a,b)=>a.health/a.maxHealth-b.health/b.maxHealth)[0];
                    if(wounded){const amount=Math.min(wounded.maxHealth-wounded.health,level>=5&&!actor.renewalSpent?2:1);actor.renewalSpent=true;wounded.health+=amount;this._supportEvent(actor,wounded,"Kind Word",events,amount,"Restores HP to the most wounded ally.");}
                    else{vulnerable.temporaryWard=Math.max(vulnerable.temporaryWard,1);this._supportEvent(actor,vulnerable,"Kind Word",events,0,"No wounded ally: ensures at least 1 temporary Ward.");}
                    return true;
                }
            }
            if(actor.classId==="mage"&&!actor.wardSparkSpent&&level>=5&&(actor.personalTurns-2)%4===0){actor.wardSparkSpent=true;vulnerable.temporaryWard=Math.max(vulnerable.temporaryWard,1);this._supportEvent(actor,vulnerable,"Ward Spark",events,0,"Ensures at least 1 temporary Ward.");return true;}
            return false;
        }
```

Important interactions for review: Barbarian fury/resolve/cleave follow separate bounded triggers; Knight Guard and Interpose are native class effects; Cleric Kind Word/Blessing can precede attack/Mending Light; Rogue Feint suppresses Armor temporarily and Venom cannot kill; Ranger mark consumption/transfer is bounded; Mage spread attacks and Arcane Echo are bounded. Quickening does not automatically double every one-off refinement, capstone or passive.

## 10. Progression, personality, leadership, bonds and careers

Next-level XP thresholds are 25, 125, 300, 540, 875, 1330 and 1915. XP is spent/subtracted on each level gain; total to reach L8 is 5,110. Quest-specific positive xpReward overrides the base XP preview; peaceful one-minute trips have their own override. Legacy open-slot XP rules remain exported, but every current embark requires all three slots, so do not design around an active small-party bonus. Dead/returning/skeleton XP presentation should be audited against actual per-character increments; skeletons do not gain levels.

Class identity uses stable class/sex/portrait keys; full appearance selections survive save/load, history/replay migration and skeleton normalization. Eight keys per class/sex are default, v2:0, v2:1, v2:2, v4:4, v4:5, v4:6, v4:7. Type labels are creation-facing appearance labels, not permanent class-name suffixes. Rename changes identity text without changing class/signature.

Nine personality traits have conflicts and affect autonomous/leader decisions or special preference where explicitly read. Do not assume every flavorful trait description adds a numeric combat modifier. Leadership is 1–5. The selected party leader can be replaced automatically by another eligible survivor when incapacitated/dead. Class/trait relevance, leadership, obedience and practical judgment remain in decision helper APIs; not all are prominent current UI controls.

Bonds are persisted pair relationships from shared expeditions and history. prepareTeam gives a bonded deployed partner legacy +2 Attack; this feeds threat-related fields and is not automatically a +2 damage bonus under current combat. Death updates bonded companions' histories/earned traits. Inspect exact live reads before advertising a stronger bond benefit.

Careers track participations/completions/victories, kills, damage, healing, signatures, boss victories, injuries, badges and last quest. History also stores leaderships, death rolls, wounds, bonded deaths, notable events and nickname milestones. At level 3 a one-time nickname opportunity exists. Some helper descriptions imply stronger numerical effects than their runtime consumers currently apply; separate flavor from actual behavior.

Campaign counters persist separately from the rolling history, which is capped at 50 records. Settled-trip guards are also capped at 50. Recaps must report the actual retained currency, casualties, worn/broken gear and ritual unlocks, and repeated recap/load must not reaward anything.

### Personality traits and conflicts

| ID | Name | Description | Conflicts |
| --- | --- | --- | --- |
| reckless | Reckless | Often accepts danger for a faster or bolder result. | cautious |
| cautious | Cautious | Usually favors safety when the risks are unclear. | reckless |
| merciful | Merciful | Leans toward sparing foes and helping strangers. | cruel |
| cruel | Cruel | Readily chooses harsh outcomes when they seem useful. | merciful |
| disciplined | Disciplined | Tends to follow the expedition's plan under pressure. | stubborn |
| stubborn | Stubborn | Resists changing course once committed. | disciplined |
| curious | Curious | Is drawn to mysteries, detours, and unfamiliar discoveries. |  |
| greedy | Greedy | Gives extra weight to treasure and personal reward. |  |
| loyal | Loyal | Places companions and bonds ahead of personal gain. |  |

### Earned traits: exact current triggers and advertised effects

| ID | Name | Trigger code | Effect text |
| --- | --- | --- | --- |
| death_touched | Death-Touched | n=>n.history.deathRollsSurvived>=1 | Survivor history; fate remains an exact 50/50. |
| stubborn_survivor | Stubborn | n=>n.history.woundsAcquired>=2 | Keeps 1 continuation HP. |
| veteran_leader | Veteran Leader | n=>n.history.leaderships>=3 | Bonded allies gain confidence. |
| undead_hunter | Undead Hunter | n=>(n.history.enemyKinds?.undead\|\|0)>=5 | +1 damage to undead signatures. |
| hardened | Hardened | n=>n.history.bondedDeaths.length>=1 | Ward/Armor depletion does not lower morale. |
| questwise | Questwise | n=>n.history.questsCompleted>=5 | Normal targeting treats them as experienced. |
| boss_slayer | Boss Slayer | n=>n.history.bossQuests>=1 | Signatures prioritize bosses. |
| iron_company | Iron Company | n=>n.history.battlesSurvived>=10 | +1 Armor while deployed with a Bond. |

### Career badges

| ID | Name | Description | Predicate |
| --- | --- | --- | --- |
| first_victory | First Victory | Won a quest. | (career, context) => career.victories >= 1 |
| ten_quests_survived | 10 Quests Survived | Returned alive from ten quests. | (career, context) => career.questsCompleted >= 10 && context.alive |
| first_boss_victory | First Boss Victory | Returned victorious from a boss quest. | career => career.bossVictories >= 1 |
| twenty_five_kills | 25 Kills | Defeated twenty-five enemies. | career => career.kills >= 25 |
| serious_injury_survivor | Survived a Serious Injury | Returned alive with a new wound. | (career, context) => career.injuriesSuffered >= 1 && context.alive |
| last_survivor | Last Survivor | Was the sole living member to return. | (career, context) => !!context.soleReturning |

### Order/decision compatibility catalogue

```json
[
  {
    "id": "take_risks",
    "name": "Take Risks",
    "description": "Accept danger when it may produce a stronger result.",
    "legacyStrategy": "Aggressive"
  },
  {
    "id": "avoid_risks",
    "name": "Avoid Risks",
    "description": "Favor survival and dependable routes over bold gains.",
    "legacyStrategy": "Defensive"
  },
  {
    "id": "greed",
    "name": "Greed",
    "description": "Give valuable rewards extra weight when choices arise.",
    "legacyStrategy": "Support"
  },
  {
    "id": "exploration",
    "name": "Exploration",
    "description": "Investigate mysteries and worthwhile detours.",
    "legacyStrategy": "Tactical"
  }
]
```

These are compatibility/domain helper definitions. Current creation/embark and fixed Tactical combat should be inspected before treating all order/stance choices as currently exposed player agency.

## 11. Inventory, all equipment and the supply economy

Four equipment slots: Head, Body, Off-hand, Accessory. Compatibility is a per-item class allowlist. A new equip consumes shared stock, returns the old item with its condition/broken state, recomputes permitted stats and never fills missing HP. A higher Ward maximum can supply its corresponding newly added Ward capacity; distinguish that from HP healing.

Armor is a consumable defense pool. Class Armor and equipment condition persist through quest battles. Return restores class Armor and each non-broken equipped armor item's condition. The first positive-to-zero ordinary Armor crossing per member per expedition rolls a seeded 6% chance of one equipped armor item becoming Broken. The item remains owned but contributes zero Armor until repaired. Oath's bonus alone cannot trigger ordinary gear-break accounting. Repairs cost ceil(price×0.35), and broken flags move with items through stock/equip/save/load.

The supply Potion costs 6 Gold and heals 2 HP up to max, at camp only, without reviving. Medkits are removed from visible supply state and legacy report text during migration. Hidden legacy items remain compatibility definitions; they must not be mistaken for current Shop options.

Selling uses the item's fixed floor(price/2) sellValue. Only shared unequipped stock is eligible. The current model has no per-instance randomized affix/item-level system, crafting recipe loop or quest entry fee. Do not invent these when reviewing basic economy balance.

| ID | Name | Slot/type | Buy | Sell | Armor | HP | Ward | Dodge pp | Crit pp | Classes | Legacy | Description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| potion | Potion | supply | 6 | 3 | 0 | 0 | 0 | 0 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | Restore 2 HP, capped at maximum HP. Does not treat Wounded or permanent injuries. |
| blade | Training Blade | weapon | 40 | 20 | 0 | 0 | 0 | 0 | 0 | barbarian/knight/ranger/rogue | true | Legacy equipment retained for save migration. |
| guard | Leather Guard | legacy | 40 | 20 | 0 | 0 | 0 | 0 | 0 | barbarian/knight/ranger/rogue/mage/cleric | true | Legacy equipment retained for save migration. |
| padded_vest | Padded Vest | body | 20 | 10 | 1 | 0 | 0 | 0 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | Body armor (1 Armor). |
| leather_armor | Leather Armor | body | 30 | 15 | 1 | 0 | 0 | 2 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | +1 Armor / +2% Dodge |
| chainmail | Chainmail | body | 60 | 30 | 2 | 0 | 0 | 0 | 0 | knight/cleric | false | Body armor (2 Armor). |
| plate_armor | Plate Armor | body | 110 | 55 | 3 | 0 | 0 | 0 | 0 | knight | false | Body armor (3 Armor). |
| leather_cap | Leather Cap | head | 20 | 10 | 1 | 0 | 0 | 0 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | Head armor (1 Armor). |
| iron_helmet | Iron Helmet | head | 35 | 17 | 1 | 0 | 0 | 0 | 1 | barbarian/knight | false | Head armor (1 Armor). +1 % Critical. |
| great_helm | Great Helm | head | 70 | 35 | 2 | 0 | 0 | 0 | 0 | knight | false | Head armor (2 Armor). |
| buckler | Buckler | offHand | 25 | 12 | 1 | 0 | 0 | 0 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | Off-hand armor (1 Armor). |
| wooden_shield | Wooden Shield | offHand | 30 | 15 | 1 | 0 | 0 | 1 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | Off-hand armor (1 Armor). +1 % Dodge. |
| iron_shield | Iron Shield | offHand | 65 | 32 | 2 | 0 | 0 | 0 | 0 | knight/cleric | false | Off-hand armor (2 Armor). |
| reinforced_cloak | Reinforced Cloak | accessory | 40 | 20 | 1 | 0 | 0 | 0 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | Accessory armor (1 Armor). |
| mage_robes | Mage Robes | body | 25 | 12 | 0 | 1 | 0 | 0 | 0 | mage/cleric | false | Woven spellcaster robes. +1 maximum HP; no healing on equip. |
| ward_focus | Ward Focus | accessory | 50 | 25 | 1 | 0 | 1 | 0 | 0 | mage/cleric | false | Protective focus. +1 Armor; replenishes on return. +1 WARD. |
| thick_fur_cloak | Thick Fur Cloak | body | 18 | 9 | 1 | 1 | 0 | 0 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | Universal body gear. +1 Armor; replenishes on return. +1 HP. |
| life_giving_amulet | Life-Giving Amulet | accessory | 30 | 15 | 0 | 1 | 0 | 0 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | Universal accessory. +1 maximum HP; does not heal on equip. |
| mage_hat | Mage Hat | head | 24 | 12 | 1 | 0 | 0 | 0 | 0 | mage | false | Mage headgear. +1 Armor. |
| cleric_circlet | Cleric Circlet | head | 24 | 12 | 1 | 0 | 1 | 0 | 0 | cleric | false | Cleric headgear. +1 Armor. +1 WARD. |
| owl_hood | Owl Hood | head | 59 | 29 | 0 | 0 | 1 | 0 | 2 | barbarian/knight/ranger/rogue/mage/cleric | false | +1 Ward / +2% Critical |
| duelist_hat | Duelist Hat | head | 50 | 25 | 0 | 0 | 0 | 3 | 2 | barbarian/knight/ranger/rogue/mage/cleric | false | +3% Dodge / +2% Critical |
| sage_crown | Sage Crown | head | 71 | 35 | 0 | 0 | 2 | 0 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | +2 Ward |
| scout_band | Scout Band | head | 56 | 28 | 0 | 1 | 0 | 2 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | +1 HP / +2% Dodge |
| war_mask | War Mask | head | 64 | 32 | 1 | 0 | 0 | 0 | 3 | barbarian/knight/ranger/rogue/mage/cleric | false | +1 Armor / +3% Critical |
| silk_mantle | Silk Mantle | body | 65 | 32 | 0 | 0 | 1 | 4 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | +1 Ward / +4% Dodge |
| runic_coat | Runic Coat | body | 73 | 36 | 1 | 0 | 1 | 0 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | +1 Armor / +1 Ward |
| duelist_vest | Duelist Vest | body | 62 | 31 | 0 | 1 | 0 | 4 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | +1 HP / +4% Dodge |
| hunter_coat | Hunter Coat | body | 67 | 33 | 1 | 0 | 0 | 0 | 4 | barbarian/knight/ranger/rogue/mage/cleric | false | +1 Armor / +4% Critical |
| pilgrim_robe | Pilgrim Robe | body | 83 | 41 | 0 | 2 | 1 | 0 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | +2 HP / +1 Ward |
| spellbook | Spellbook | offHand | 80 | 40 | 0 | 0 | 2 | 0 | 3 | barbarian/knight/ranger/rogue/mage/cleric | false | +2 Ward / +3% Critical |
| parrying_dagger | Parrying Dagger | offHand | 59 | 29 | 0 | 0 | 0 | 5 | 3 | barbarian/knight/ranger/rogue/mage/cleric | false | +5% Dodge / +3% Critical |
| lantern | Runic Lantern | offHand | 68 | 34 | 0 | 1 | 1 | 0 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | +1 HP / +1 Ward |
| thorn_shield | Thorn Shield | offHand | 70 | 35 | 1 | 0 | 0 | 0 | 5 | barbarian/knight/ranger/rogue/mage/cleric | false | +1 Armor / +5% Critical |
| prayer_beads | Prayer Beads | offHand | 71 | 35 | 0 | 2 | 0 | 2 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | +2 HP / +2% Dodge |
| cat_charm | Cat Charm | accessory | 53 | 26 | 0 | 0 | 0 | 6 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | +6% Dodge |
| hawk_charm | Hawk Charm | accessory | 53 | 26 | 0 | 0 | 0 | 0 | 6 | barbarian/knight/ranger/rogue/mage/cleric | false | +6% Critical |
| moonstone | Moonstone | accessory | 71 | 35 | 0 | 0 | 2 | 0 | 0 | barbarian/knight/ranger/rogue/mage/cleric | false | +2 Ward |
| ruby_pendant | Ruby Pendant | accessory | 71 | 35 | 0 | 2 | 0 | 0 | 2 | barbarian/knight/ranger/rogue/mage/cleric | false | +2 HP / +2% Critical |
| wind_ring | Wind Ring | accessory | 65 | 32 | 0 | 0 | 1 | 3 | 1 | barbarian/knight/ranger/rogue/mage/cleric | false | +1 Ward / +3% Dodge / +1% Critical |

### Exact normalized Shop JSON (retains any fields not shown in the table)

```json
{
  "potion": {
    "name": "Potion",
    "price": 6,
    "iconIndex": 176,
    "healing": 2,
    "description": "Restore 2 HP, capped at maximum HP. Does not treat Wounded or permanent injuries.",
    "sellValue": 3,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "blade": {
    "name": "Training Blade",
    "price": 40,
    "type": "weapon",
    "stat": "attack",
    "bonus": 3,
    "legacy": true,
    "description": "Legacy equipment retained for save migration.",
    "sellValue": 20,
    "iconIndex": 148,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue"
    ]
  },
  "guard": {
    "name": "Leather Guard",
    "price": 40,
    "type": "legacy",
    "stat": "defense",
    "bonus": 3,
    "legacy": true,
    "description": "Legacy equipment retained for save migration.",
    "sellValue": 20,
    "iconIndex": 148,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "padded_vest": {
    "name": "Padded Vest",
    "price": 20,
    "type": "armor",
    "slot": "body",
    "armor": 1,
    "description": "Body armor (1 Armor).",
    "sellValue": 10,
    "iconIndex": 131,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "leather_armor": {
    "name": "Leather Armor",
    "price": 30,
    "type": "armor",
    "slot": "body",
    "armor": 1,
    "description": "+1 Armor / +2% Dodge",
    "dodge": 2,
    "sellValue": 15,
    "iconIndex": 131,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "chainmail": {
    "name": "Chainmail",
    "price": 60,
    "type": "armor",
    "slot": "body",
    "armor": 2,
    "description": "Body armor (2 Armor).",
    "sellValue": 30,
    "iconIndex": 131,
    "classes": [
      "knight",
      "cleric"
    ]
  },
  "plate_armor": {
    "name": "Plate Armor",
    "price": 110,
    "type": "armor",
    "slot": "body",
    "armor": 3,
    "description": "Body armor (3 Armor).",
    "sellValue": 55,
    "iconIndex": 131,
    "classes": [
      "knight"
    ]
  },
  "leather_cap": {
    "name": "Leather Cap",
    "price": 20,
    "type": "armor",
    "slot": "head",
    "armor": 1,
    "description": "Head armor (1 Armor).",
    "sellValue": 10,
    "iconIndex": 132,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "iron_helmet": {
    "name": "Iron Helmet",
    "price": 35,
    "type": "armor",
    "slot": "head",
    "armor": 1,
    "description": "Head armor (1 Armor). +1 % Critical.",
    "crit": 1,
    "sellValue": 17,
    "iconIndex": 132,
    "classes": [
      "barbarian",
      "knight"
    ]
  },
  "great_helm": {
    "name": "Great Helm",
    "price": 70,
    "type": "armor",
    "slot": "head",
    "armor": 2,
    "description": "Head armor (2 Armor).",
    "sellValue": 35,
    "iconIndex": 132,
    "classes": [
      "knight"
    ]
  },
  "buckler": {
    "name": "Buckler",
    "price": 25,
    "type": "armor",
    "slot": "offHand",
    "armor": 1,
    "description": "Off-hand armor (1 Armor).",
    "sellValue": 12,
    "iconIndex": 128,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "wooden_shield": {
    "name": "Wooden Shield",
    "price": 30,
    "type": "armor",
    "slot": "offHand",
    "armor": 1,
    "description": "Off-hand armor (1 Armor). +1 % Dodge.",
    "dodge": 1,
    "sellValue": 15,
    "iconIndex": 128,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "iron_shield": {
    "name": "Iron Shield",
    "price": 65,
    "type": "armor",
    "slot": "offHand",
    "armor": 2,
    "description": "Off-hand armor (2 Armor).",
    "sellValue": 32,
    "iconIndex": 128,
    "classes": [
      "knight",
      "cleric"
    ]
  },
  "reinforced_cloak": {
    "name": "Reinforced Cloak",
    "price": 40,
    "type": "armor",
    "slot": "accessory",
    "armor": 1,
    "description": "Accessory armor (1 Armor).",
    "sellValue": 20,
    "iconIndex": 148,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "mage_robes": {
    "name": "Mage Robes",
    "price": 25,
    "type": "armor",
    "slot": "body",
    "armor": 0,
    "hp": 1,
    "description": "Woven spellcaster robes. +1 maximum HP; no healing on equip.",
    "sellValue": 12,
    "iconIndex": 131,
    "classes": [
      "mage",
      "cleric"
    ]
  },
  "ward_focus": {
    "name": "Ward Focus",
    "price": 50,
    "type": "armor",
    "slot": "accessory",
    "armor": 1,
    "description": "Protective focus. +1 Armor; replenishes on return. +1 WARD.",
    "ward": 1,
    "sellValue": 25,
    "iconIndex": 148,
    "classes": [
      "mage",
      "cleric"
    ]
  },
  "thick_fur_cloak": {
    "name": "Thick Fur Cloak",
    "price": 18,
    "type": "armor",
    "slot": "body",
    "armor": 1,
    "description": "Universal body gear. +1 Armor; replenishes on return. +1 HP.",
    "hp": 1,
    "sellValue": 9,
    "iconIndex": 131,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "life_giving_amulet": {
    "name": "Life-Giving Amulet",
    "price": 30,
    "type": "armor",
    "slot": "accessory",
    "armor": 0,
    "hp": 1,
    "description": "Universal accessory. +1 maximum HP; does not heal on equip.",
    "sellValue": 15,
    "iconIndex": 148,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "mage_hat": {
    "name": "Mage Hat",
    "price": 24,
    "type": "armor",
    "slot": "head",
    "armor": 1,
    "description": "Mage headgear. +1 Armor.",
    "sellValue": 12,
    "iconIndex": 130,
    "classes": [
      "mage"
    ]
  },
  "cleric_circlet": {
    "name": "Cleric Circlet",
    "price": 24,
    "type": "armor",
    "slot": "head",
    "armor": 1,
    "description": "Cleric headgear. +1 Armor. +1 WARD.",
    "ward": 1,
    "sellValue": 12,
    "iconIndex": 151,
    "classes": [
      "cleric"
    ]
  },
  "owl_hood": {
    "name": "Owl Hood",
    "slot": "head",
    "type": "armor",
    "price": 59,
    "armor": 0,
    "hp": 0,
    "ward": 1,
    "dodge": 0,
    "crit": 2,
    "description": "+1 Ward / +2% Critical",
    "sellValue": 29,
    "iconIndex": 132,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "duelist_hat": {
    "name": "Duelist Hat",
    "slot": "head",
    "type": "armor",
    "price": 50,
    "armor": 0,
    "hp": 0,
    "ward": 0,
    "dodge": 3,
    "crit": 2,
    "description": "+3% Dodge / +2% Critical",
    "sellValue": 25,
    "iconIndex": 132,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "sage_crown": {
    "name": "Sage Crown",
    "slot": "head",
    "type": "armor",
    "price": 71,
    "armor": 0,
    "hp": 0,
    "ward": 2,
    "dodge": 0,
    "crit": 0,
    "description": "+2 Ward",
    "sellValue": 35,
    "iconIndex": 132,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "scout_band": {
    "name": "Scout Band",
    "slot": "head",
    "type": "armor",
    "price": 56,
    "armor": 0,
    "hp": 1,
    "ward": 0,
    "dodge": 2,
    "crit": 0,
    "description": "+1 HP / +2% Dodge",
    "sellValue": 28,
    "iconIndex": 132,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "war_mask": {
    "name": "War Mask",
    "slot": "head",
    "type": "armor",
    "price": 64,
    "armor": 1,
    "hp": 0,
    "ward": 0,
    "dodge": 0,
    "crit": 3,
    "description": "+1 Armor / +3% Critical",
    "sellValue": 32,
    "iconIndex": 132,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "silk_mantle": {
    "name": "Silk Mantle",
    "slot": "body",
    "type": "armor",
    "price": 65,
    "armor": 0,
    "hp": 0,
    "ward": 1,
    "dodge": 4,
    "crit": 0,
    "description": "+1 Ward / +4% Dodge",
    "sellValue": 32,
    "iconIndex": 131,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "runic_coat": {
    "name": "Runic Coat",
    "slot": "body",
    "type": "armor",
    "price": 73,
    "armor": 1,
    "hp": 0,
    "ward": 1,
    "dodge": 0,
    "crit": 0,
    "description": "+1 Armor / +1 Ward",
    "sellValue": 36,
    "iconIndex": 131,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "duelist_vest": {
    "name": "Duelist Vest",
    "slot": "body",
    "type": "armor",
    "price": 62,
    "armor": 0,
    "hp": 1,
    "ward": 0,
    "dodge": 4,
    "crit": 0,
    "description": "+1 HP / +4% Dodge",
    "sellValue": 31,
    "iconIndex": 131,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "hunter_coat": {
    "name": "Hunter Coat",
    "slot": "body",
    "type": "armor",
    "price": 67,
    "armor": 1,
    "hp": 0,
    "ward": 0,
    "dodge": 0,
    "crit": 4,
    "description": "+1 Armor / +4% Critical",
    "sellValue": 33,
    "iconIndex": 131,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "pilgrim_robe": {
    "name": "Pilgrim Robe",
    "slot": "body",
    "type": "armor",
    "price": 83,
    "armor": 0,
    "hp": 2,
    "ward": 1,
    "dodge": 0,
    "crit": 0,
    "description": "+2 HP / +1 Ward",
    "sellValue": 41,
    "iconIndex": 131,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "spellbook": {
    "name": "Spellbook",
    "slot": "offHand",
    "type": "armor",
    "price": 80,
    "armor": 0,
    "hp": 0,
    "ward": 2,
    "dodge": 0,
    "crit": 3,
    "description": "+2 Ward / +3% Critical",
    "sellValue": 40,
    "iconIndex": 128,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "parrying_dagger": {
    "name": "Parrying Dagger",
    "slot": "offHand",
    "type": "armor",
    "price": 59,
    "armor": 0,
    "hp": 0,
    "ward": 0,
    "dodge": 5,
    "crit": 3,
    "description": "+5% Dodge / +3% Critical",
    "sellValue": 29,
    "iconIndex": 128,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "lantern": {
    "name": "Runic Lantern",
    "slot": "offHand",
    "type": "armor",
    "price": 68,
    "armor": 0,
    "hp": 1,
    "ward": 1,
    "dodge": 0,
    "crit": 0,
    "description": "+1 HP / +1 Ward",
    "sellValue": 34,
    "iconIndex": 128,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "thorn_shield": {
    "name": "Thorn Shield",
    "slot": "offHand",
    "type": "armor",
    "price": 70,
    "armor": 1,
    "hp": 0,
    "ward": 0,
    "dodge": 0,
    "crit": 5,
    "description": "+1 Armor / +5% Critical",
    "sellValue": 35,
    "iconIndex": 128,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "prayer_beads": {
    "name": "Prayer Beads",
    "slot": "offHand",
    "type": "armor",
    "price": 71,
    "armor": 0,
    "hp": 2,
    "ward": 0,
    "dodge": 2,
    "crit": 0,
    "description": "+2 HP / +2% Dodge",
    "sellValue": 35,
    "iconIndex": 128,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "cat_charm": {
    "name": "Cat Charm",
    "slot": "accessory",
    "type": "armor",
    "price": 53,
    "armor": 0,
    "hp": 0,
    "ward": 0,
    "dodge": 6,
    "crit": 0,
    "description": "+6% Dodge",
    "sellValue": 26,
    "iconIndex": 148,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "hawk_charm": {
    "name": "Hawk Charm",
    "slot": "accessory",
    "type": "armor",
    "price": 53,
    "armor": 0,
    "hp": 0,
    "ward": 0,
    "dodge": 0,
    "crit": 6,
    "description": "+6% Critical",
    "sellValue": 26,
    "iconIndex": 148,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "moonstone": {
    "name": "Moonstone",
    "slot": "accessory",
    "type": "armor",
    "price": 71,
    "armor": 0,
    "hp": 0,
    "ward": 2,
    "dodge": 0,
    "crit": 0,
    "description": "+2 Ward",
    "sellValue": 35,
    "iconIndex": 148,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "ruby_pendant": {
    "name": "Ruby Pendant",
    "slot": "accessory",
    "type": "armor",
    "price": 71,
    "armor": 0,
    "hp": 2,
    "ward": 0,
    "dodge": 0,
    "crit": 2,
    "description": "+2 HP / +2% Critical",
    "sellValue": 35,
    "iconIndex": 148,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  },
  "wind_ring": {
    "name": "Wind Ring",
    "slot": "accessory",
    "type": "armor",
    "price": 65,
    "armor": 0,
    "hp": 0,
    "ward": 1,
    "dodge": 3,
    "crit": 1,
    "description": "+1 Ward / +3% Dodge / +1% Critical",
    "sellValue": 32,
    "iconIndex": 148,
    "classes": [
      "barbarian",
      "knight",
      "ranger",
      "rogue",
      "mage",
      "cleric"
    ]
  }
}
```

## 12. Camp economy, healing and concrete value comparisons

Camp advances while the game process is open, including minimized/background catch-up, but grants no closed-process credit. Each eligible living, non-retired, non-away member has saved job fractions and an independent saved recovery fraction.

Every 30 seconds, Work gives 2 Gold to Rogue/Ranger/Barbarian and 1 Gold to other classes. Study gives 2 Arcana to Mage/Cleric/Knight and 1 Arcana to the others. Thus a single specialized worker/student produces 240 resource/hour; three specialized members produce 720/hour. Mixed classes have a lower maximum for a chosen currency. All current active slots travel together, so the ordinary three-person company does not simultaneously earn camp production during its expedition.

Recovery is +1 HP per 30 seconds while below max and happens alongside Idle, Work or Study. It does not remove permanent wound titles or lasting-injury stacks. This is different from older comments promising full HP after one minute or one resource per minute. Potion healing is 3 Gold/HP before cap waste; compare its convenience against automatic concurrent camp recovery rather than assuming paid healing is the only recovery sink.

Gear acquisition is the main recurring Gold investment. Death returns gear to stock, so the strongest material loss is not automatic gear deletion: identity, level investment, permanent wounds and revival costs supply the other stakes. Free Tavern replacement is an intentional recovery route, and a replacement's level/identity loss must be included in campaign-value calculations.

Greed Prayer is a fixed 1 Arcana → 1 Gold conversion in 100-unit batches. Arcana and Gold therefore have an available exchange relationship after that unlock. It does not mean they have identical subjective value, production specialties or opportunity costs.

Fortune's 30-Arcana activation needs at least 120 base/collected quest Gold to produce 30 extra Gold before considering the missing Ward, rounding and risk. Offering's 40-Arcana activation breaks even on its bonus alone at four battle victories, then adds 10 per further win; base quest Arcana is separate. Rebate gives +25 activation-adjusted Arcana but forfeits all quest coins. The safe one-minute Rebate loop is especially important to evaluate before balancing expensive revival or permanent-wound removal around camp income.

No carrying capacity, food/upkeep, durability degradation per real-world day, quest admission payment or automatic offline income is present. Proposed economy polish should first measure existing faucets, sinks, active-session opportunity cost and player pacing instead of introducing a new mandatory expense system.

### Per-class camp rates

| Class | Work /30s | Study /30s | Work /hour | Study /hour | HP /30s while hurt |
| --- | --- | --- | --- | --- | --- |
| barbarian | 2 | 1 | 240 | 120 | 1 |
| knight | 1 | 2 | 120 | 240 | 1 |
| ranger | 2 | 1 | 240 | 120 | 1 |
| rogue | 2 | 1 | 240 | 120 | 1 |
| mage | 1 | 2 | 120 | 240 | 1 |
| cleric | 1 | 2 | 120 | 240 | 1 |

## 13. Injury, death, resurrection and persistent attrition

Healthy, Wounded and Dead are separate persistent conditions; alive=false also makes conditionOf report Dead. During an expedition a survived knockout is represented in preparedTeam as health=0, alive=false and incapacitated=true, while its persistent character is Wounded/alive at 1 HP. This intentional split means the casualty is saved but cannot reappear on the road or in the next fight. Current presentation filters casualties by expedition injury/death state.

Each ordinary survived knockout adds one lasting-injury stack and a next available permanent wound title. The existing titles are Missing Eye, Bad Knee, Mangled Hand, Scarred, Nerve Damage and Badly Healed Ribs. Shared penalties are −2 percentage points Dodge per stack (floor zero) and initiative ×0.97 per stack in prepared combat. Titles do not add a second copy of those penalties. More stacks can exist than distinct titles.

Healing removes one actual permanent title and its stack; removing the final title clears remaining stacks/condition according to the existing rule. It restores no HP. Ordinary HP recovery does not remove these permanent effects. Review the title/stack relationship carefully when designing clearer injury feedback.

Human knockout fate is an exact 50/50 in current combat, including healthy characters. Legacy d20 death-save helpers and old “injured characters alone risk death” prose do not describe the current timed battle result path. Death is authoritative in the persistent roster, graveyard, active slots, teams, prepared figures and leader replacement.

Death returns equipped items to stock with condition/broken metadata, marks the record retired/dead, removes it from active slots and updates history/bonded histories. It does not delete the remembered character record. A vacancy blocks embark until filled; Tavern offers free replacements.

Reanimate returns the fallen record with the matching skeleton art, the same class/level and current living class maxima, preserves wounds/powers/history, and disables leveling. Potions, Cleric healing and normal camp HP recovery still work. Its later knockout is death without a survival coin; reanimationExhausted is permanently set and also inferred for old dead-skeleton saves. Reload/Last Rites does not clear this flag. Last Rites is a separate return-at-1-HP-with-injury ritual, so decide explicitly whether its current ability to return a terminal skeleton is intended rather than assuming the Reanimate prohibition forbids every other rite.

Mercy is the exception during its next-quest scope: after an actual would-die outcome it consumes one shared charge, keeps that member active at 1 HP, and applies a serious permanent wound/stack using the same real penalties. An ordinary survived knockout does not consume Mercy. It must not become an unconditional heal, a per-member shield or a repeat resurrection.

### Wound definitions

```json
[
  {
    "id": "missing_eye",
    "name": "Missing Eye",
    "effect": "Permanent until healed at the Altar. Shared injury stacks: -2 percentage points Dodge and initiative x0.97 per survived knockout. Titles add no extra stacks. Each ritual removes one wound/stack; the final wound clears remaining injury penalties."
  },
  {
    "id": "bad_knee",
    "name": "Bad Knee",
    "effect": "Permanent until healed at the Altar. Shared injury stacks: -2 percentage points Dodge and initiative x0.97 per survived knockout. Titles add no extra stacks. Each ritual removes one wound/stack; the final wound clears remaining injury penalties."
  },
  {
    "id": "mangled_hand",
    "name": "Mangled Hand",
    "effect": "Permanent until healed at the Altar. Shared injury stacks: -2 percentage points Dodge and initiative x0.97 per survived knockout. Titles add no extra stacks. Each ritual removes one wound/stack; the final wound clears remaining injury penalties."
  },
  {
    "id": "scarred",
    "name": "Scarred",
    "effect": "Permanent until healed at the Altar. Shared injury stacks: -2 percentage points Dodge and initiative x0.97 per survived knockout. Titles add no extra stacks. Each ritual removes one wound/stack; the final wound clears remaining injury penalties."
  },
  {
    "id": "nerve_damage",
    "name": "Nerve Damage",
    "effect": "Permanent until healed at the Altar. Shared injury stacks: -2 percentage points Dodge and initiative x0.97 per survived knockout. Titles add no extra stacks. Each ritual removes one wound/stack; the final wound clears remaining injury penalties."
  },
  {
    "id": "healed_ribs",
    "name": "Badly Healed Ribs",
    "effect": "Permanent until healed at the Altar. Shared injury stacks: -2 percentage points Dodge and initiative x0.97 per survived knockout. Titles add no extra stacks. Each ritual removes one wound/stack; the final wound clears remaining injury penalties."
  }
]
```

## 14. All fourteen rituals: costs, unlocks, scopes and edge cases

| Ritual / ID | Arcana/use | Unlock quest | Level | Effect |
| --- | --- | --- | --- | --- |
| Warding / protection_ward | 35 | The Unbroken Seal / ritual_warding | 2 | One shared party Ward absorbs one entire hit, then disappears. An unused Ward remains until hit. |
| Healing / healing_ritual | 60 | The Saint's Broken Hands / ritual_healing | 3 | Remove one permanent wound and its injury stack from a chosen adventurer. Does not restore HP. |
| Greed Prayer / greed_prayer | 100 | The Gilded Tithe / ritual_greed | 2 | Pay 100 Arcana to receive 100 coins immediately. |
| Reanimate / reanimate | 120 | Names Beneath the Ossuary / ritual_reanimate | 4 | Return a fallen companion as their skeleton appearance, with their living health, armor and ward. Heals normally; cannot level. Death permanently bars further reanimation. |
| Fortune's Favor / fortunes_favor | 30 | The Beggar's Silver Bell / ritual_fortune | 2 | Next quest: +25% coin reward, rounded down. The party starts with one fewer Ward in total; requires at least one Ward. |
| Battle Hymn / battle_hymn | 60 | The Choir of Rust / ritual_hymn | 3 | Party attacks deal +1 damage throughout the next battle. Remains pending until a battle occurs. |
| Veil of Mercy / veil_of_mercy | 100 | The Thread Before the Axe / ritual_mercy | 5 | Once next quest, the first adventurer who would die instead survives at 1 HP with a serious permanent wound. |
| Last Rites / last_rites | 150 | The Ferryman's Last Passenger / ritual_last_rites | 5 | Return one fallen adventurer to camp at 1 HP with an injury. Preserves their living or skeleton identity. |
| Arcane Rebate / arcane_rebate | 25 | The Empty Treasury / ritual_rebate | 2 | After the next quest, receive +50 Arcana and no coin reward, including gathered coins. |
| Oath of the Vanguard / oath_of_vanguard | 25 | The Shieldmaker's Promise / ritual_vanguard | 2 | One chosen adventurer gains +1 Armor for the next quest. No targeting or party-protection effect. |
| Familiar's Vigil / familiars_vigil | 45 | The Lantern Without a Keeper / ritual_familiar | 3 | Next quest, a summoned spirit absorbs the first hit aimed at any party member, then disappears. |
| First Strike / first_strike | 30 | The Dawn Duel / ritual_first_strike | 2 | The party's first attack in its next quest deals +2 damage. A missed attack still uses the blessing. |
| Quickening Prayer / quickening_prayer | 65 | The Twice-Struck Chime / ritual_quickening | 4 | Next quest: each adventurer has a seeded 25% chance per battle to use their special twice. Never more than two uses; no extra ability unlocks. |
| Arcane Offering / arcane_offering | 40 | Embers for the Altar / ritual_offering | 3 | After the next quest, receive 10 bonus Arcana per battle won during that quest. |

Queued casts cannot duplicate-stack the same pending effect and cannot be activated while away. Different effects can coexist. Living targets must be active camp members; Healing requires a real wound. Fallen targets require a free active slot or the existing explicit replacement confirmation. Failed/locked/invalid/duplicate casts charge nothing.

Pending effects transfer atomically to trip.ritualEffects on departure. Warding and Battle Hymn carry back if no relevant hit/battle consumed them. Next-quest effects expire with that expedition even if it is peaceful. Familiar intercepts before Warding when both are present. Fortune sacrifices one actual party Ward, including Warding if no member Ward exists; the first encounter does not refill the missing innate Ward.

Rebate suppresses completion and gathered coins and adds 50 Arcana on return, including recall. Offering adds 10 per recorded victory, not per enemy kill or wave. Battle victories are idempotently counted at result recording. One-off healing/exchange/revival effects apply immediately at camp. Quest-only unlocks require a completed victory, not an abandoned/automatic-retreat victory or a debug currency payment. Legacy purchased unlock flags are replaced by quest-earned state on migration; ritualUnlock now refuses purchase and points to the required quest.

Quickening uses the existing seeded d20 with 16–20 as success, independently per adventurer per battle of the next quest. It does not unlock a low-level special or double unrelated one-off refinements/capstones. First Strike is the first attack attempt, so a dodge spends it. Oath is a consumable temporary Armor point on one chosen member, with no dedicated target/protection effect; normal enemy defense-aware scoring still sees the unit’s total defense.

Ritual information appears in the altar, encounter support/mercy captions and report unlock lines. Shared ritual charges are not currently represented as three individual member Ward counters. Review observability of pending/consumed/expired effects and failed-cast messages as polish opportunities.

## 15. Every current enemy and encounter tuning

This table lists all 52 source records, including duplicate-type variants and the 20 newly added types. Their base level is often 1; quest danger and encounter tuning modify actual instances. Enemy names/role prose are not proof of an implemented status effect: signature names such as Stone Gaze or Marsh Curse do not themselves add a new stun/curse system. Only explicit simulator fields/branches have mechanical effects.

| ID | Name | Role | HP | Armor | Innate Ward | Damage | Signature / damage | Speed | Intelligence | Position | Dodge | Boss | Special |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| goblin_1 | Goblin | Raider | 2 | 0 | 0 | 1 | Dagger Stab / 1 | 10 | Low | Front | Low | false |  |
| goblin_2 | Goblin | Raider | 2 | 0 | 0 | 1 | Dagger Stab / 1 | 10 | Low | Front | Low | false |  |
| goblin_3 | Goblin | Raider | 2 | 0 | 0 | 1 | Dagger Stab / 1 | 10 | Low | Front | Low | false |  |
| goblin_archer | Goblin Archer | Marksman | 1 | 0 | 0 | 1 | Shortbow / 1 | 12 | Normal | Back | Low | false |  |
| orc_1 | Orc | Warrior | 2 | 1 | 0 | 1 | Axe Chop / 1 | 8 | Low | Front | Low | false |  |
| orc_2 | Orc | Warrior | 2 | 1 | 0 | 1 | Axe Chop / 1 | 8 | Low | Front | Low | false |  |
| orc_3 | Orc | Warrior | 2 | 1 | 0 | 1 | Axe Chop / 1 | 8 | Low | Front | Low | false |  |
| ogre | Ogre | Brute | 4 | 2 | 0 | 2 | Crushing Club / 2 | 6 | Low | Front | Low | false |  |
| skeleton_1 | Skeleton | Undead Warrior | 2 | 1 | 0 | 1 | Rusty Slash / 1 | 9 | Normal | Front | Low | false |  |
| skeleton_2 | Skeleton | Undead Warrior | 2 | 1 | 0 | 1 | Rusty Slash / 1 | 9 | Normal | Front | Low | false |  |
| skeleton_archer_1 | Skeleton Archer | Undead Marksman | 2 | 0 | 0 | 1 | Bone Arrow / 1 | 10 | Normal | Back | Low | false |  |
| skeleton_archer_2 | Skeleton Archer | Undead Marksman | 2 | 0 | 0 | 1 | Bone Arrow / 1 | 10 | Normal | Back | Low | false |  |
| necromancer | Necrommancer | Undead Commander | 3 | 0 | 1 | 1 | Death Hex / 3 | 9 | High | Back | Normal | false |  |
| dire_wolf_1 | Dire Wolf | Beast | 3 | 0 | 0 | 1 | Bite / 1 | 14 | High | Front | Normal | false |  |
| dire_wolf_2 | Dire Wolf | Beast | 3 | 0 | 0 | 1 | Bite / 1 | 14 | High | Front | Normal | false |  |
| dire_wolf_3 | Dire Wolf | Beast | 3 | 0 | 0 | 1 | Bite / 1 | 14 | High | Front | Normal | false |  |
| cultist_1 | Cultist | Fanatic | 3 | 1 | 1 | 1 | Ritual Knife / 1 | 9 | Normal | Front | Low | false |  |
| cultist_2 | Cultist | Fanatic | 3 | 1 | 1 | 1 | Ritual Knife / 1 | 9 | Normal | Front | Low | false |  |
| mage_cultist | Mage Cultist | Enchanter | 2 | 0 | 1 | 1 | Enchantment / 1 | 11 | High | Back | Normal | false | enchantment |
| summoned_demon | Summoned Demon | Demon | 4 | 2 | 0 | 2 | Hell Claw / 2 | 8 | Normal | Front | Normal | false |  |
| bandit_fighter_1 | Bandit Fighter | Bandit | 2 | 1 | 0 | 1 | Sword Slash / 1 | 10 | Normal | Front | Normal | false |  |
| bandit_fighter_2 | Bandit Fighter | Bandit | 2 | 1 | 0 | 1 | Sword Slash / 1 | 10 | Normal | Front | Normal | false |  |
| bandit_rogue | Bandit Rogue | Bandit Rogue | 2 | 0 | 0 | 1 | Backstab / 1 | 14 | High | Back | Normal | false |  |
| giant_spider_1 | Giant Spider | Beast | 3 | 0 | 0 | 1 | Web / 1 | 12 | High | Front | Normal | false | web |
| giant_spider_2 | Giant Spider | Beast | 3 | 0 | 0 | 1 | Web / 1 | 12 | High | Front | Normal | false | web |
| mimic | Mimic | Monster | 3 | 2 | 0 | 2 | Bite / 2 | 7 | Normal | Front | Low | false |  |
| hobgoblin | Hobgoblin | Soldier | 4 | 1 | 0 | 1 | Shield Rush / 2 | 9 | Low | Front | Low | false |  |
| wraith | Wraith | Caster | 3 | 0 | 2 | 1 | Soul Wail / 2 | 15 | Low | Front | Low | false |  |
| harpy | Harpy | Raider | 3 | 0 | 0 | 1 | Bewitching Shriek / 2 | 18 | Low | Front | Low | false | enchantment |
| troll | Troll | Brute | 7 | 1 | 0 | 1 | Crushing Blow / 2 | 4 | Low | Front | Low | false |  |
| imp | Imp | Caster | 2 | 0 | 1 | 1 | Cinder Hex / 2 | 17 | Low | Front | Low | false | enchantment |
| masked_jester | Masked Jester | Boss Caster | 12 | 3 | 4 | 1 | Last Laugh / 2 | 19 | Low | Front | Low | true |  |
| slime | Slime | Guardian | 3 | 0 | 0 | 1 | Engulf / 1 | 5 | Normal | Front | Low | false |  |
| giant_bat | Giant Bat | Skirmisher | 2 | 0 | 0 | 1 | Sonic Screech / 1 | 17 | Normal | Front | Low | false |  |
| ghost | Ghost | Caster | 2 | 0 | 2 | 1 | Grave Whisper / 2 | 12 | Normal | Back | Low | false |  |
| wyrmling | Wyrmling | Boss | 8 | 2 | 1 | 1 | Ember Breath / 3 | 13 | Normal | Front | Low | true |  |
| hill_giant | Hill Giant | Boss | 9 | 1 | 0 | 1 | Boulder Throw / 3 | 6 | Normal | Front | Low | true |  |
| pirate | Pirate | Guardian | 3 | 1 | 0 | 1 | Dirty Trick / 2 | 12 | Normal | Front | Low | false |  |
| pirate_captain | Pirate Captain | Boss | 7 | 2 | 0 | 1 | Flintlock Volley / 3 | 15 | Normal | Front | Low | true |  |
| wolf | Wolf | Skirmisher | 3 | 0 | 0 | 1 | Pouncing Fangs / 2 | 16 | Normal | Front | Low | false |  |
| owlbear | Owlbear | Guardian | 6 | 1 | 0 | 1 | Beak and Talon / 3 | 11 | Normal | Front | Low | false |  |
| dwarf_prospector | Dwarf Prospector | Guardian | 4 | 2 | 0 | 1 | Blasting Charge / 2 | 7 | Normal | Front | Low | false |  |
| ghoul | Ghoul | Guardian | 4 | 0 | 0 | 1 | Ravenous Bite / 2 | 13 | Normal | Front | Low | false |  |
| ratman | Ratman | Skirmisher | 2 | 0 | 0 | 1 | Sewer Ambush / 2 | 14 | Normal | Front | Low | false |  |
| kobold | Kobold | Guardian | 2 | 1 | 0 | 1 | Trap Spring / 2 | 13 | Normal | Front | Low | false |  |
| minotaur | Minotaur | Boss | 7 | 2 | 0 | 1 | Goring Charge / 3 | 10 | Normal | Front | Low | true |  |
| basilisk | Basilisk | Guardian | 5 | 2 | 0 | 1 | Stone Gaze / 2 | 9 | Normal | Front | Low | false |  |
| gargoyle | Gargoyle | Guardian | 4 | 3 | 0 | 1 | Diving Strike / 2 | 8 | Normal | Front | Low | false |  |
| swamp_hag | Swamp Hag | Caster | 4 | 0 | 2 | 1 | Marsh Curse / 3 | 10 | Normal | Back | Low | false |  |
| gnoll | Gnoll | Skirmisher | 4 | 1 | 0 | 1 | Hyena Rush / 2 | 14 | Normal | Front | Low | false |  |
| will_o_wisp | Will-o-Wisp | Caster | 2 | 0 | 3 | 1 | Lantern Flare / 2 | 18 | Normal | Back | Low | false |  |
| treant | Treant | Boss | 8 | 3 | 0 | 1 | Root Crush / 3 | 4 | Normal | Front | Low | true |  |

New types: Slime, Giant Bat, Ghost, Wyrmling, Hill Giant, Pirate, Pirate Captain, Wolf, Owlbear, Dwarf Prospector, Ghoul, Ratman, Kobold, Minotaur, Basilisk, Gargoyle, Swamp Hag, Gnoll, Will-o-Wisp and Treant. Harpy already existed and now uses a real Harpy illustration instead of the old demon-family fallback. The new atlas is dedicated; enemyArt overrides legacy family selection.

Outside small skirmishes, four-skull enemies gain +2 HP and five-skull enemies +3 HP before per-quest encounterTuning. Small skirmishes cap HP/Armor and damage and clear boss/instant-death flags. Certain caster-like role/name patterns receive at least one innate Ward. Actual health is floored to keep small groups from being trivial zero-defense one-shots. Speed includes floor((enemy level−1)/2) plus tuning. Exact normalization is included in the rule appendix.

### Random encounter compatibility pools

```json
{
  "battles": {
    "mimic": [
      "mimic"
    ],
    "goblins": [
      "goblin_1",
      "goblin_2",
      "goblin_archer"
    ],
    "wolves": [
      "dire_wolf_1"
    ],
    "cultists": [
      "cultist_1",
      "cultist_2",
      "mage_cultist"
    ],
    "skeletons": [
      "skeleton_1",
      "skeleton_2",
      "skeleton_archer_1"
    ],
    "bandits": [
      "bandit_fighter_1",
      "bandit_fighter_2",
      "bandit_rogue"
    ],
    "spiders": [
      "giant_spider_1",
      "giant_spider_2"
    ]
  },
  "opportunities": {
    "hidden_stash": "random_hidden_stash",
    "rune": "random_rune",
    "caravan": "random_caravan",
    "swimming": "random_swimming"
  },
  "chances": {
    "low": 0.6,
    "normal": 0.85,
    "high": 0.98
  },
  "globalCatalogue": {
    "opportunities": [
      "Hidden Stash",
      "Rune",
      "Caravan",
      "Swimming"
    ],
    "battles": [
      "Mimic",
      "Goblins",
      "Cultists",
      "Skeletons",
      "Bandits",
      "Spiders"
    ]
  }
}
```

## 16. Complete quest catalogue: overview, rewards, coverage and audit outcomes

Current runtime quests come from Stage3, not the historical base quests array. Rewards below are authored completion values before random finds, danger-mode compatibility scaling and rituals. Victory/draw/defeat tables and complete contract text follow. Recommended level is not a hard gate. Ordinary-gear sampled clear rates below use two compositions × three seeds = six observations per level/quest; they are diagnostics, not precise probabilities. “N/A” means no own travel-note pool, not a missing contract.

| ID | Name | Category | Min | Skulls | Rec L | Mode | V Gold | V Arcana | XP each | Notes | L1 clear | L3 clear | L5 clear | L8 clear |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gather_medicinal_herbs | Gather Medicinal Herbs | Errands | 1 | 1 | 1 | none | 3 | 0 | 3 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| carry_message_watch | Carry a Message to the Watch | Errands | 1 | 1 | 1 | none | 3 | 0 | 3 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| collect_grave_moss | Collect Grave Moss | Errands | 3 | 2 | 1 | optional | 39 | 33 | 15 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| search_old_road | Search the Old Road | Errands | 3 | 3 | 1 | required | 45 | 39 | 15 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| guard_woodcutters | Guard the Woodcutters | Errands | 3 | 1 | 1 | optional | 33 | 27 | 10 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| goblin_tracks | Goblin Tracks | Hunt | 5 | 3 | 1 | required | 75 | 65 | 20 | 20 | 0.0% | 100.0% | 100.0% | 100.0% |
| escort_apothecary | Escort the Apothecary | Short | 5 | 2 | 1 | optional | 65 | 55 | 18 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| clear_cellar | Clear the Cellar | Hunt | 5 | 1 | 1 | required | 55 | 45 | 20 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| salvage_abandoned_cart | Salvage the Abandoned Cart | Short | 5 | 1 | 1 | optional | 55 | 45 | 18 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| abandoned_shrine | Abandoned Shrine | Hunt | 10 | 2 | 1 | required | 130 | 110 | 35 | 20 | 66.7% | 100.0% | 100.0% | 100.0% |
| spider_nest | Spider Nest | Hunt | 10 | 4 | 4 | required | 170 | 150 | 38 | 20 | 0.0% | 0.0% | 0.0% | 0.0% |
| patrol_cemetery | Patrol the Cemetery | Hunt | 10 | 3 | 1 | required | 150 | 130 | 40 | 20 | 0.0% | 0.0% | 50.0% | 50.0% |
| recover_stolen_ledger | Recover the Stolen Ledger | Hunt | 10 | 5 | 6 | required | 190 | 170 | 40 | 20 | 0.0% | 0.0% | 0.0% | 0.0% |
| broken_watchtower | The Broken Watchtower | Hunt | 10 | 4 | 4 | required | 170 | 150 | 42 | 20 | 0.0% | 0.0% | 0.0% | 0.0% |
| sunken_crypt | The Sunken Crypt | Boss Hunt | 15 | 5 | 6 | required | 285 | 255 | 65 | 20 | 0.0% | 0.0% | 0.0% | 0.0% |
| orc_warcamp | Orc Warcamp | Boss Hunt | 15 | 5 | 6 | required | 285 | 255 | 70 | 20 | 0.0% | 0.0% | 0.0% | 16.7% |
| necromancers_tower | Necromancer's Tower | Boss Hunt | 15 | 4 | 4 | required | 255 | 225 | 72 | 20 | 0.0% | 0.0% | 0.0% | 0.0% |
| black_gate | The Black Gate | Boss Hunt | 15 | 5 | 6 | required | 285 | 255 | 85 | 20 | 0.0% | 0.0% | 0.0% | 0.0% |
| watchpost_at_dusk | Watchpost at Dusk | Hunt | 3 | 5 | 6 | required | 57 | 51 | 18 | 20 | 0.0% | 0.0% | 16.7% | 0.0% |
| lantern_index | The Lantern Index | Fieldwork | 25 | 1 | 1 | optional | 275 | 225 | 22 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| aqueduct_survey | Survey of the Old Aqueduct | Hunt | 25 | 3 | 1 | required | 375 | 325 | 55 | 20 | 0.0% | 0.0% | 33.3% | 50.0% |
| herbarium_circuit | The Herbarium Circuit | Fieldwork | 30 | 3 | 1 | optional | 450 | 390 | 38 | 20 | 0.0% | 0.0% | 50.0% | 50.0% |
| evening_observatory | An Evening at the Observatory | Boss Hunt | 30 | 5 | 6 | required | 570 | 510 | 75 | 20 | 0.0% | 0.0% | 0.0% | 0.0% |
| roadside_scouts | Roadside Scouts | Errands | 1 | 1 | 1 | none | 3 | 0 | 3 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| red_banner_lookout | Red Banner Lookout | Hunt | 1 | 1 | 1 | none | 3 | 0 | 3 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| silken_crossing | The Silken Crossing | Hunt | 5 | 5 | 6 | required | 95 | 85 | 19 | 20 | 0.0% | 0.0% | 0.0% | 0.0% |
| field_map_survey | Field Map Survey | Fieldwork | 10 | 1 | 1 | optional | 110 | 90 | 9 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| wayside_lantern_round | Wayside Lantern Round | Fieldwork | 15 | 1 | 1 | optional | 165 | 135 | 13 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| cemetery_boundary_watch | Cemetery Boundary Watch | Hunt | 15 | 3 | 1 | required | 225 | 195 | 60 | 20 | 0.0% | 0.0% | 50.0% | 66.7% |
| deep_crypt_vigil | Deep Crypt Vigil | Boss Hunt | 25 | 5 | 6 | required | 475 | 425 | 75 | 20 | 0.0% | 0.0% | 0.0% | 0.0% |
| long_lantern_circuit | Long Lantern Circuit | Fieldwork | 30 | 1 | 1 | optional | 330 | 270 | 26 | 20 | 83.3% | 100.0% | 100.0% | 100.0% |
| ash_road_sentries | Ash Road Sentries | Hunt | 3 | 4 | 4 | required | 51 | 45 | 6 | 20 | 0.0% | 0.0% | 66.7% | 83.3% |
| thornbank_trail | Thornbank Trail | Hunt | 5 | 4 | 4 | required | 85 | 75 | 10 | 20 | 0.0% | 16.7% | 16.7% | 50.0% |
| wayside_reliquary | Wayside Reliquary | Fieldwork | 15 | 2 | 1 | required | 195 | 165 | 20 | 20 | 50.0% | 100.0% | 100.0% | 100.0% |
| birchwater_samples | Birchwater Samples | Fieldwork | 25 | 2 | 1 | required | 325 | 275 | 32 | 20 | 50.0% | 83.3% | 100.0% | 100.0% |
| moonlit_barrow | Moonlit Barrow | Hunt | 25 | 4 | 4 | required | 425 | 375 | 50 | 20 | 0.0% | 0.0% | 0.0% | 0.0% |
| meadow_cartography | Meadow Cartography | Fieldwork | 30 | 2 | 1 | required | 390 | 330 | 39 | 20 | 50.0% | 66.7% | 100.0% | 100.0% |
| ridge_signal_fires | Ridge Signal Fires | Hunt | 30 | 4 | 4 | required | 510 | 450 | 60 | 20 | 0.0% | 0.0% | 0.0% | 0.0% |
| brookside_escort | Brookside Escort | Fieldwork | 3 | 1 | 1 | required | 33 | 27 | 6 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| millstream_watch | Millstream Watch | Hunt | 5 | 3 | 1 | required | 75 | 65 | 10 | 20 | 0.0% | 100.0% | 100.0% | 100.0% |
| orchard_trackers | Orchard Trackers | Fieldwork | 10 | 1 | 1 | required | 110 | 90 | 13 | 20 | 100.0% | 100.0% | 100.0% | 100.0% |
| hunt_hobgoblin | Broken Banner Escort | Short | 20 | 3 | 3 | required | 300 | 260 | 65 | N/A | 50.0% | 66.7% | 100.0% | 100.0% |
| hunt_wraith | The Bellkeeper’s Rest | Errands | 20 | 4 | 4 | required | 340 | 300 | 65 | N/A | 0.0% | 50.0% | 50.0% | 100.0% |
| hunt_harpy | Cliffside Rescue | Boss Hunt | 20 | 5 | 5 | required | 380 | 340 | 65 | N/A | 50.0% | 100.0% | 100.0% | 100.0% |
| hunt_troll | Bridge Toll Tyrant | Fieldwork | 20 | 3 | 3 | required | 300 | 260 | 65 | N/A | 66.7% | 100.0% | 100.0% | 100.0% |
| hunt_imp | Seal the Ember Rift | Hunt | 20 | 4 | 4 | required | 340 | 300 | 65 | N/A | 50.0% | 100.0% | 100.0% | 100.0% |
| fantasy_01 | The Cistern Has Teeth | Errands | 1 | 1 | 1 | none | 14 | 7 | 5 | N/A | 100.0% | 100.0% | 100.0% | 100.0% |
| fantasy_02 | Lanterns for the Lost | Errands | 5 | 2 | 1 | required | 46 | 23 | 16 | N/A | 100.0% | 100.0% | 100.0% | 100.0% |
| fantasy_03 | The Last Ore Cart | Errands | 15 | 3 | 2 | required | 114 | 57 | 39 | N/A | 33.3% | 83.3% | 100.0% | 100.0% |
| fantasy_04 | Bell Tower at Dusk | Short | 3 | 1 | 1 | required | 26 | 13 | 9 | N/A | 100.0% | 100.0% | 100.0% | 100.0% |
| fantasy_05 | Wolves at the Tollgate | Short | 5 | 2 | 1 | required | 46 | 23 | 16 | N/A | 100.0% | 100.0% | 100.0% | 100.0% |
| fantasy_06 | The Rooftop Reliquary | Short | 10 | 3 | 2 | required | 84 | 42 | 29 | N/A | 83.3% | 100.0% | 100.0% | 100.0% |
| fantasy_07 | Tracks in the Reedbeds | Fieldwork | 3 | 1 | 1 | required | 26 | 13 | 9 | N/A | 100.0% | 100.0% | 100.0% | 100.0% |
| fantasy_08 | A Map of False Stars | Fieldwork | 10 | 2 | 1 | required | 76 | 38 | 26 | N/A | 100.0% | 100.0% | 100.0% | 100.0% |
| fantasy_09 | The Orchard That Walked | Fieldwork | 25 | 4 | 3 | required | 182 | 91 | 62 | N/A | 0.0% | 0.0% | 50.0% | 33.3% |
| fantasy_10 | Feathers in the Honey | Hunt | 5 | 2 | 1 | required | 46 | 23 | 16 | N/A | 100.0% | 100.0% | 100.0% | 100.0% |
| fantasy_11 | Carrion at the Icehouse | Hunt | 15 | 3 | 2 | required | 114 | 57 | 39 | N/A | 50.0% | 50.0% | 100.0% | 100.0% |
| fantasy_12 | Eyes Beneath the Sand | Hunt | 20 | 4 | 3 | required | 152 | 76 | 52 | N/A | 0.0% | 16.7% | 33.3% | 50.0% |
| fantasy_13 | The Cinder Nursery | Boss Hunt | 10 | 3 | 2 | required | 84 | 42 | 29 | N/A | 50.0% | 100.0% | 100.0% | 100.0% |
| fantasy_14 | Captain of the Black Shoal | Boss Hunt | 20 | 4 | 3 | required | 152 | 76 | 52 | N/A | 0.0% | 33.3% | 50.0% | 83.3% |
| fantasy_15 | The Giant and the Labyrinth | Boss Hunt | 30 | 5 | 4 | required | 220 | 110 | 75 | N/A | 0.0% | 0.0% | 33.3% | 50.0% |
| ritual_warding | The Unbroken Seal | Fieldwork | 5 | 2 | 2 | required | 45 | 25 | 18 | N/A | 100.0% | 100.0% | 100.0% | 100.0% |
| ritual_healing | The Saint's Broken Hands | Hunt | 10 | 3 | 3 | required | 80 | 45 | 32 | N/A | 50.0% | 100.0% | 100.0% | 100.0% |
| ritual_greed | The Gilded Tithe | Hunt | 5 | 2 | 2 | required | 45 | 25 | 18 | N/A | 100.0% | 100.0% | 100.0% | 100.0% |
| ritual_reanimate | Names Beneath the Ossuary | Boss Hunt | 20 | 4 | 4 | required | 140 | 80 | 56 | N/A | 0.0% | 33.3% | 50.0% | 100.0% |
| ritual_fortune | The Beggar's Silver Bell | Fieldwork | 10 | 2 | 2 | required | 70 | 40 | 28 | N/A | 100.0% | 100.0% | 100.0% | 100.0% |
| ritual_hymn | The Choir of Rust | Hunt | 15 | 3 | 3 | required | 105 | 60 | 42 | N/A | 50.0% | 100.0% | 100.0% | 100.0% |
| ritual_mercy | The Thread Before the Axe | Boss Hunt | 25 | 5 | 5 | required | 175 | 100 | 70 | N/A | 0.0% | 0.0% | 16.7% | 16.7% |
| ritual_last_rites | The Ferryman's Last Passenger | Boss Hunt | 25 | 5 | 5 | required | 175 | 100 | 70 | N/A | 0.0% | 0.0% | 50.0% | 50.0% |
| ritual_rebate | The Empty Treasury | Errands | 5 | 2 | 2 | required | 45 | 25 | 18 | N/A | 100.0% | 100.0% | 100.0% | 100.0% |
| ritual_vanguard | The Shieldmaker's Promise | Hunt | 10 | 2 | 2 | required | 70 | 40 | 28 | N/A | 83.3% | 100.0% | 100.0% | 100.0% |
| ritual_familiar | The Lantern Without a Keeper | Fieldwork | 15 | 3 | 3 | required | 105 | 60 | 42 | N/A | 50.0% | 66.7% | 83.3% | 100.0% |
| ritual_first_strike | The Dawn Duel | Short | 5 | 2 | 2 | required | 45 | 25 | 18 | N/A | 100.0% | 100.0% | 100.0% | 100.0% |
| ritual_quickening | The Twice-Struck Chime | Boss Hunt | 20 | 4 | 4 | required | 140 | 80 | 56 | N/A | 0.0% | 16.7% | 50.0% | 66.7% |
| ritual_offering | Embers for the Altar | Hunt | 15 | 3 | 3 | required | 105 | 60 | 42 | N/A | 16.7% | 50.0% | 83.3% | 83.3% |

### Every contract, with all authored fields

The following compact JSON records preserve descriptions, threat/condition/rumor wording, stages and tuning as authored. A separate source inventory and full runtime snapshot retain the base historical quest array too. Repeated/generic/incorrect-looking metadata is deliberately preserved for the next review to assess.

#### Gather Medicinal Herbs (`gather_medicinal_herbs`)

```json
{"id":"gather_medicinal_herbs","name":"Gather Medicinal Herbs","category":"Errands","durationMinutes":1,"description":"Gather useful herbs along the forest road.","risk":"1-skull","danger":"Low-risk observation route.","rewardTypes":["5 Gold","0 Arcana","5 XP per companion","Potion (+2 HP): 50%"],"encounterType":"Travel and observation; no combat","environment":"Forest / road","combatMode":"none","xpReward":3,"rewardGold":{"victory":3,"draw":1,"defeat":0},"rewardArcana":{"victory":0,"draw":0,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Wilderness","boss":false,"enemyIds":[],"knownThreats":["No guaranteed combat"],"knownConditions":["Safe resource errand"],"rumors":["Medicinal plants grow beside the road"],"journey":"A brief forest-road circuit.","chance":"Low","randomEncounters":[],"tags":["combatless","low risk"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Easy","riskExplanation":"Combatless stroll: quiet field notes and modest finds. One skull describes low risk, not duration.","battleback":"BattleRoad_v1","intendedLevel":1,"encounterTuning":{},"battlebackFolder":"pictures","skulls":1}
```

#### Carry a Message to the Watch (`carry_message_watch`)

```json
{"id":"carry_message_watch","name":"Carry a Message to the Watch","category":"Errands","durationMinutes":1,"description":"Carry a sealed guild message to the watch camp.","risk":"1-skull","danger":"Low-risk observation route.","rewardTypes":["6 Gold","0 Arcana","5 XP per companion"],"encounterType":"Travel and observation; no combat","environment":"Road / camp","combatMode":"none","xpReward":3,"rewardGold":{"victory":3,"draw":1,"defeat":0},"rewardArcana":{"victory":0,"draw":0,"defeat":0},"travelSeconds":3,"faction":"Watch","boss":false,"enemyIds":[],"knownThreats":["None expected"],"knownConditions":["Delivery route"],"rumors":["The watch awaits the message"],"journey":"A short road to the watch camp.","chance":"Low","randomEncounters":[],"tags":["combatless","low risk"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Easy","riskExplanation":"Combatless stroll: quiet field notes and modest finds. One skull describes low risk, not duration.","battleback":"BattleRoad_v1","intendedLevel":1,"encounterTuning":{},"battlebackFolder":"pictures","skulls":1,"bonusRewards":{}}
```

#### Collect Grave Moss (`collect_grave_moss`)

```json
{"id":"collect_grave_moss","name":"Collect Grave Moss","category":"Errands","durationMinutes":3,"description":"Collect grave moss without disturbing the cemetery.","risk":"3-skull","danger":"Low chance of a small undead encounter.","rewardTypes":["39 Gold","33 Arcana","15 XP per companion"],"encounterType":"Undead chance","environment":"Cemetery","combatMode":"optional","xpReward":15,"rewardGold":{"victory":39,"draw":0,"defeat":0},"rewardArcana":{"victory":33,"draw":0,"defeat":0},"travelSeconds":4,"faction":"Undead","boss":false,"enemyIds":[],"knownThreats":["Possible weak undead"],"knownConditions":["Low encounter chance"],"rumors":["Grave moss holds faint Arcana"],"journey":"A cautious cemetery circuit.","chance":"Low","randomEncounters":["skeletons"],"tags":["Safe","Optional combat"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Normal","riskExplanation":"Steady expedition pressure; optional road ambushes. Recommended level 1. 3-skull foes have reinforced HP.","battleback":"BattleGraveyard_v1","intendedLevel":1,"encounterTuning":{"hp":4,"damage":0,"speed":0},"battlebackFolder":"pictures","skulls":2}
```

#### Search the Old Road (`search_old_road`)

```json
{"id":"search_old_road","name":"Search the Old Road","category":"Errands","durationMinutes":3,"description":"Search the old road for salvage and signs of trouble.","risk":"3-skull","danger":"Possible weak bandit or scavenger encounter.","rewardTypes":["45 Gold","39 Arcana","15 XP per companion"],"encounterType":"Road bandit Hunt","environment":"Old road","combatMode":"required","xpReward":15,"rewardGold":{"victory":45,"draw":0,"defeat":0},"rewardArcana":{"victory":39,"draw":0,"defeat":0},"bonusRewards":{"potionChance":0.25},"travelSeconds":4,"faction":"Bandits","boss":false,"enemyIds":["bandit_fighter_1","bandit_rogue"],"knownThreats":["Two road bandits"],"knownConditions":["Low encounter chance"],"rumors":["Lost packs lie off the road"],"journey":"A methodical search of the old road.","chance":"Low","randomEncounters":["bandits"],"tags":["Safe","Optional combat"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Normal","riskExplanation":"3-skull: guaranteed fight against two bandits. Restore Armor before repeated runs. Recommended level 1. 3-skull foes have reinforced HP.","battleback":"BattleRoad_v1","intendedLevel":1,"encounterTuning":{"hp":4,"damage":0,"speed":0},"battlebackFolder":"pictures","skulls":3}
```

#### Guard the Woodcutters (`guard_woodcutters`)

```json
{"id":"guard_woodcutters","name":"Guard the Woodcutters","category":"Errands","durationMinutes":3,"description":"Keep watch while the woodcutters finish their work.","risk":"1-skull","danger":"Possible single wolf or small beast encounter.","rewardTypes":["33 Gold","27 Arcana","10 XP per companion"],"encounterType":"Beast chance","environment":"Forest","combatMode":"optional","xpReward":10,"rewardGold":{"victory":33,"draw":0,"defeat":0},"rewardArcana":{"victory":27,"draw":0,"defeat":0},"travelSeconds":4,"faction":"Beasts","boss":false,"enemyIds":[],"knownThreats":["Possible wolf"],"knownConditions":["Low encounter chance"],"rumors":["Tracks circle the work site"],"journey":"A guarded shift at the forest edge.","chance":"Low","randomEncounters":["wolves"],"tags":["Safe","Optional combat"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Easy","riskExplanation":"Forgiving route; one small or optional encounter.","battleback":"BattleWoodland_v1","battlebackFolder":"pictures","intendedLevel":1,"encounterTuning":{},"skulls":1}
```

#### Goblin Tracks (`goblin_tracks`)

```json
{"id":"goblin_tracks","name":"Goblin Tracks","category":"Hunt","durationMinutes":5,"description":"Follow fresh goblin tracks and break up the raiding group.","risk":"3-skull","danger":"A small goblin group blocks the route.","rewardTypes":["75 Gold","65 Arcana","20 XP per companion"],"encounterType":"Goblins","environment":"Road / forest","combatMode":"required","xpReward":20,"rewardGold":{"victory":75,"draw":3,"defeat":0},"rewardArcana":{"victory":65,"draw":0,"defeat":0},"bonusRewards":{"commonEquipmentChance":0.15},"travelSeconds":5,"faction":"Goblins","boss":false,"enemyIds":["goblin_1","goblin_2","goblin_archer"],"knownThreats":["Goblin raiders and archer"],"knownConditions":["Guaranteed combat"],"rumors":["Their tracks cross the old road"],"journey":"A short pursuit through scrubland.","chance":"Low","randomEncounters":[],"tags":["Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Normal","riskExplanation":"Steady expedition pressure; 3 foes at the objective. Recommended level 1. 3-skull foes have reinforced HP.","battleback":"BattleWoodland_v1","battlebackFolder":"pictures","intendedLevel":1,"encounterTuning":{"hp":7,"damage":0,"speed":0},"skulls":3}
```

#### Escort the Apothecary (`escort_apothecary`)

```json
{"id":"escort_apothecary","name":"Escort the Apothecary","category":"Short","durationMinutes":5,"description":"Accompany an apothecary along an exposed road.","risk":"3-skull","danger":"A road ambush is possible.","rewardTypes":["65 Gold","55 Arcana","18 XP per companion"],"encounterType":"Bandit ambush chance","environment":"Road","combatMode":"optional","xpReward":18,"rewardGold":{"victory":65,"draw":2,"defeat":0},"rewardArcana":{"victory":55,"draw":0,"defeat":0},"bonusRewards":{"potionChance":0.75},"travelSeconds":5,"faction":"Bandits","boss":false,"enemyIds":[],"knownThreats":["Possible bandit ambush"],"knownConditions":["Protect-the-party flavor; no escort AI"],"rumors":["The road has been watched"],"journey":"An exposed road escort.","chance":"Low","randomEncounters":["bandits"],"tags":["Safe","Optional combat"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Normal","riskExplanation":"Steady expedition pressure; optional road ambushes. Recommended level 1. 3-skull foes have reinforced HP.","battleback":"BattleRoad_v1","intendedLevel":1,"encounterTuning":{"hp":4,"damage":0,"speed":0},"battlebackFolder":"pictures","skulls":2}
```

#### Clear the Cellar (`clear_cellar`)

```json
{"id":"clear_cellar","name":"Clear the Cellar","category":"Hunt","durationMinutes":5,"description":"Clear a neglected cellar using the weakest supported foes.","risk":"1-skull","danger":"Weak undead may be trapped below.","rewardTypes":["55 Gold","45 Arcana","20 XP per companion"],"encounterType":"Weak undead","environment":"Cellar / ruins","combatMode":"required","xpReward":20,"rewardGold":{"victory":55,"draw":3,"defeat":0},"rewardArcana":{"victory":45,"draw":0,"defeat":0},"bonusRewards":{"potionChance":0.3},"travelSeconds":5,"faction":"Undead","boss":false,"enemyIds":["skeleton_1"],"knownThreats":["One weak skeleton"],"knownConditions":["Guaranteed minor combat"],"rumors":["A useful item may remain below"],"journey":"A nearby cellar and return.","chance":"Low","randomEncounters":[],"tags":["Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Easy","riskExplanation":"Forgiving route; one small or optional encounter.","battleback":"BattleCavern_v1","intendedLevel":1,"encounterTuning":{},"battlebackFolder":"pictures","skulls":1}
```

#### Salvage the Abandoned Cart (`salvage_abandoned_cart`)

```json
{"id":"salvage_abandoned_cart","name":"Salvage the Abandoned Cart","category":"Short","durationMinutes":5,"description":"Recover useful goods from an abandoned cart.","risk":"1-skull","danger":"Mostly travel events; at most one minor encounter.","rewardTypes":["55 Gold","45 Arcana","18 XP per companion"],"encounterType":"Travel events / minor chance","environment":"Road","combatMode":"optional","xpReward":18,"rewardGold":{"victory":55,"draw":2,"defeat":0},"rewardArcana":{"victory":45,"draw":0,"defeat":0},"bonusRewards":{"potionChance":0.35},"travelSeconds":5,"faction":"Roadside","boss":false,"enemyIds":[],"knownThreats":["At most one minor encounter"],"knownConditions":["Salvage, not crafting materials"],"rumors":["The cart was left in haste"],"journey":"A salvage route along the road.","chance":"Low","randomEncounters":["bandits"],"tags":["Safe","Optional combat"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Easy","riskExplanation":"Forgiving route; one small or optional encounter.","battleback":"BattleRoad_v1","intendedLevel":1,"encounterTuning":{},"battlebackFolder":"pictures","skulls":1}
```

#### Abandoned Shrine (`abandoned_shrine`)

```json
{"id":"abandoned_shrine","name":"Abandoned Shrine","category":"Hunt","durationMinutes":10,"description":"Investigate a shrine occupied by hostile figures.","risk":"3-skull","danger":"Cultists guard an unstable shrine.","rewardTypes":["130 Gold","110 Arcana","35 XP per companion"],"encounterType":"Cultists","environment":"Shrine / ruins","combatMode":"required","xpReward":35,"rewardGold":{"victory":130,"draw":5,"defeat":0},"rewardArcana":{"victory":110,"draw":0,"defeat":0},"bonusRewards":{"commonEquipmentChance":0.25},"travelSeconds":7,"faction":"Cultists","boss":false,"enemyIds":["cultist_1","cultist_2"],"knownThreats":["Two cultists"],"knownConditions":["Guaranteed combat"],"rumors":["The altar retains Arcana"],"journey":"A measured approach to old ruins.","chance":"3-skull","randomEncounters":[],"tags":["Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Normal","riskExplanation":"Steady expedition pressure; 2 foes at the objective. Recommended level 1. 3-skull foes have reinforced HP.","battleback":"BattleWoodland_v1","intendedLevel":1,"encounterTuning":{"hp":7,"damage":0,"speed":0},"battlebackFolder":"pictures","skulls":2}
```

#### Spider Nest (`spider_nest`)

```json
{"id":"spider_nest","name":"Spider Nest","category":"Hunt","durationMinutes":10,"description":"Destroy a nest of giant spiders before it spreads.","risk":"5-skull","danger":"Existing web attacks can incapacitate adventurers.","rewardTypes":["170 Gold","150 Arcana","38 XP per companion"],"encounterType":"Giant spiders","environment":"Forest / cave","combatMode":"required","xpReward":38,"rewardGold":{"victory":170,"draw":5,"defeat":0},"rewardArcana":{"victory":150,"draw":0,"defeat":0},"bonusRewards":{},"travelSeconds":7,"faction":"Beasts","boss":false,"enemyIds":["giant_spider_1","giant_spider_2"],"knownThreats":["Two giant spiders"],"knownConditions":["Web effect supported"],"rumors":["A useful pack lies in the nest"],"journey":"A careful push into webbed ground.","chance":"3-skull","randomEncounters":[],"tags":["Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Hard","riskExplanation":"A deliberate challenge: 2 foes at the objective; wounds and death remain possible. Recommended level 2. 5-skull foes have reinforced HP and heavier attacks.","battleback":"BattleCavern_v1","battlebackFolder":"pictures","intendedLevel":4,"encounterTuning":{"hp":5,"damage":1,"speed":0},"skulls":4}
```

#### Patrol the Cemetery (`patrol_cemetery`)

```json
{"id":"patrol_cemetery","name":"Patrol the Cemetery","category":"Hunt","durationMinutes":10,"description":"Patrol the cemetery and put roaming skeletons down.","risk":"3-skull","danger":"A skeleton group patrols the grounds.","rewardTypes":["150 Gold","130 Arcana","40 XP per companion"],"encounterType":"Skeletons","environment":"Cemetery","combatMode":"required","xpReward":40,"rewardGold":{"victory":150,"draw":3,"defeat":0},"rewardArcana":{"victory":130,"draw":0,"defeat":0},"travelSeconds":7,"faction":"Undead","boss":false,"enemyIds":["skeleton_1","skeleton_2","skeleton_archer_1"],"knownThreats":["Skeletons and an archer"],"knownConditions":["No necromancer at this tier"],"rumors":["Arcana clings to the graves"],"journey":"A full circuit of the cemetery.","chance":"3-skull","randomEncounters":[],"tags":["Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Normal","riskExplanation":"Steady expedition pressure; 3 foes at the objective. Recommended level 1. 3-skull foes have reinforced HP.","battleback":"BattleGraveyard_v1","intendedLevel":1,"encounterTuning":{"hp":7,"damage":0,"speed":0},"battlebackFolder":"pictures","skulls":3}
```

#### Recover the Stolen Ledger (`recover_stolen_ledger`)

```json
{"id":"recover_stolen_ledger","name":"Recover the Stolen Ledger","category":"Hunt","durationMinutes":10,"description":"Track bandits and recover a stolen guild ledger.","risk":"5-skull","danger":"A mixed bandit group holds the ledger.","rewardTypes":["190 Gold","170 Arcana","40 XP per companion"],"encounterType":"Bandits","environment":"Road / camp","combatMode":"required","xpReward":40,"rewardGold":{"victory":190,"draw":6,"defeat":0},"rewardArcana":{"victory":170,"draw":0,"defeat":0},"bonusRewards":{"commonEquipmentChance":0.3},"travelSeconds":7,"faction":"Bandits","boss":false,"enemyIds":["bandit_fighter_1","bandit_fighter_2","bandit_rogue"],"knownThreats":["Bandit fighters and rogue"],"knownConditions":["Guaranteed combat"],"rumors":["The ledger may expose their camp"],"journey":"A tracking route to a bandit camp.","chance":"3-skull","randomEncounters":[],"tags":["Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Hard","riskExplanation":"A deliberate challenge: 3 foes at the objective; wounds and death remain possible. Recommended level 2. 5-skull foes have reinforced HP and heavier attacks.","battleback":"BattleRoad_v1","intendedLevel":6,"encounterTuning":{"hp":5,"damage":1,"speed":0},"battlebackFolder":"pictures","skulls":5}
```

#### The Broken Watchtower (`broken_watchtower`)

```json
{"id":"broken_watchtower","name":"The Broken Watchtower","category":"Hunt","durationMinutes":10,"description":"Secure a broken watchtower occupied by mixed foes.","risk":"5-skull","danger":"Goblins and an orc defend the ruin.","rewardTypes":["170 Gold","150 Arcana","42 XP per companion"],"encounterType":"Orc / goblins","environment":"Watchtower / ruins","combatMode":"required","xpReward":42,"rewardGold":{"victory":170,"draw":6,"defeat":0},"rewardArcana":{"victory":150,"draw":0,"defeat":0},"bonusRewards":{"commonEquipmentChance":0.35},"travelSeconds":8,"faction":"Orcs & Goblins","boss":false,"enemyIds":["orc_1","goblin_1","goblin_archer"],"knownThreats":["Orc, goblin, and archer"],"knownConditions":["Mixed enemy group"],"rumors":["Old equipment remains in the tower"],"journey":"A climb to a ruined watchtower.","chance":"3-skull","randomEncounters":[],"tags":["Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Hard","riskExplanation":"A deliberate challenge: 3 foes at the objective; wounds and death remain possible. Recommended level 2. 5-skull foes have reinforced HP and heavier attacks.","battleback":"BattleGate_v1","intendedLevel":4,"encounterTuning":{"hp":5,"damage":1,"speed":0},"battlebackFolder":"pictures","skulls":4}
```

#### The Sunken Crypt (`sunken_crypt`)

```json
{"id":"sunken_crypt","name":"The Sunken Crypt","category":"Boss Hunt","durationMinutes":15,"description":"Descend into a flooded crypt and end its necromancer.","risk":"5-skull","danger":"Skeletons support a necromancer.","rewardTypes":["285 Gold","255 Arcana","65 XP per companion"],"encounterType":"Undead / necromancer","environment":"Crypt","combatMode":"required","xpReward":65,"rewardGold":{"victory":285,"draw":8,"defeat":0},"rewardArcana":{"victory":255,"draw":1,"defeat":0},"bonusRewards":{"rareEquipmentChance":0.2},"travelSeconds":9,"faction":"Undead","boss":true,"enemyIds":["skeleton_1","skeleton_2","skeleton_archer_1","necromancer"],"knownThreats":["Skeletons and necromancer"],"knownConditions":["Boss battle"],"rumors":["Rare gear sank with the dead"],"journey":"A long descent into the crypt.","chance":"High","randomEncounters":[],"tags":["Boss","Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Hard","riskExplanation":"A deliberate challenge: 4 foes at the objective; wounds and death remain possible. Recommended level 4. 5-skull foes have reinforced HP and heavier attacks.","battleback":"BattleCavern_v1","intendedLevel":6,"encounterTuning":{"hp":1,"damage":1,"speed":0},"battlebackFolder":"pictures","skulls":5}
```

#### Orc Warcamp (`orc_warcamp`)

```json
{"id":"orc_warcamp","name":"Orc Warcamp","category":"Boss Hunt","durationMinutes":15,"description":"Strike an orc warcamp before its raiders march.","risk":"5-skull","danger":"Orcs, goblins, and an ogre hold the camp.","rewardTypes":["285 Gold","255 Arcana","70 XP per companion"],"encounterType":"Orcs / goblins / ogre","environment":"Warcamp","combatMode":"required","xpReward":70,"rewardGold":{"victory":285,"draw":10,"defeat":0},"rewardArcana":{"victory":255,"draw":0,"defeat":0},"bonusRewards":{"commonEquipmentChance":0.55},"travelSeconds":9,"faction":"Orcs & Goblins","boss":true,"enemyIds":["orc_1","orc_2","goblin_1","goblin_archer","ogre"],"knownThreats":["Orcs, goblins, and ogre"],"knownConditions":["Boss-scale battle"],"rumors":["The camp stores captured equipment"],"journey":"A long approach to the warcamp.","chance":"High","randomEncounters":[],"tags":["Boss","Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Hard","riskExplanation":"A deliberate challenge: 5 foes at the objective; wounds and death remain possible. Recommended level 4. 5-skull foes have reinforced HP and heavier attacks.","battleback":"BattleGate_v1","intendedLevel":6,"encounterTuning":{"hp":1,"damage":1,"speed":0},"battlebackFolder":"pictures","skulls":5}
```

#### Necromancer's Tower (`necromancers_tower`)

```json
{"id":"necromancers_tower","name":"Necromancer's Tower","category":"Boss Hunt","durationMinutes":15,"description":"Break the tower's cult and destroy its necromancer.","risk":"5-skull","danger":"Cultists and undead protect a necromancer.","rewardTypes":["255 Gold","225 Arcana","72 XP per companion"],"encounterType":"Necromancer / cultists / undead","environment":"Tower / ruins","combatMode":"required","xpReward":72,"rewardGold":{"victory":255,"draw":8,"defeat":0},"rewardArcana":{"victory":225,"draw":1,"defeat":0},"bonusRewards":{"rareEquipmentChance":0.25},"travelSeconds":9,"faction":"Undead Cult","boss":true,"enemyIds":["cultist_1","mage_cultist","skeleton_1","necromancer"],"knownThreats":["Cultists, skeleton, necromancer"],"knownConditions":["Boss battle"],"rumors":["Powerful gear may remain in the tower"],"journey":"A long ascent to the tower.","chance":"High","randomEncounters":[],"tags":["Boss","Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Hard","riskExplanation":"A deliberate challenge: 4 foes at the objective; wounds and death remain possible. Recommended level 4. 5-skull foes have reinforced HP and heavier attacks.","battleback":"BattleGate_v1","intendedLevel":4,"encounterTuning":{"hp":1,"damage":1,"speed":0},"battlebackFolder":"pictures","skulls":4}
```

#### The Black Gate (`black_gate`)

```json
{"id":"black_gate","name":"The Black Gate","category":"Boss Hunt","durationMinutes":15,"description":"Assault the Black Gate and defeat the supported boss beyond it.","risk":"5-skull","danger":"An enchanter and cultist protect the summoned demon. Restore class Armor before departure.","rewardTypes":["285 Gold","255 Arcana","85 XP per companion"],"encounterType":"Cultists / summoned demon","environment":"Gate / ruins","combatMode":"required","xpReward":85,"rewardGold":{"victory":285,"draw":12,"defeat":0},"rewardArcana":{"victory":255,"draw":1,"defeat":0},"bonusRewards":{"rareEquipmentChance":0.45},"unlock":{"questsCompleted":5,"label":"Complete 5 quests"},"travelSeconds":10,"faction":"Demon Cult","boss":true,"enemyIds":["cultist_1","mage_cultist","summoned_demon"],"knownThreats":["Cultist, enchanter and summoned demon"],"knownConditions":["Locked until 5 quests are complete"],"rumors":["Special equipment lies beyond the gate"],"journey":"A full assault route to the gate.","chance":"High","randomEncounters":[],"tags":["Boss","Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Hard","riskExplanation":"A deliberate challenge: 3 foes at the objective; wounds and death remain possible. Recommended level 4. 5-skull foes have reinforced HP and heavier attacks.","battleback":"BattleGate_v1","intendedLevel":6,"encounterTuning":{"hp":2,"damage":1,"speed":0},"battlebackFolder":"pictures","skulls":5}
```

#### Watchpost at Dusk (`watchpost_at_dusk`)

```json
{"id":"watchpost_at_dusk","name":"Watchpost at Dusk","durationMinutes":3,"difficulty":"Hard","category":"Hunt","description":"Secure a nearby watchpost before its three raiders scatter.","danger":"Secure a nearby watchpost before its three raiders scatter.","risk":"5-skull","riskExplanation":"5-skull boss Hunt: Ogre captain, Orc guard and Goblin archer. Every knockout risks permanent death. 18 Gold / 18 XP each; restore Armor before another attempt. Recommended level 2. 5-skull foes have reinforced HP and heavier attacks.","rewardTypes":["57 Gold","51 Arcana","18 XP per companion"],"encounterType":"Ogre captain Hunt","environment":"Watchtower / forest","combatMode":"required","xpReward":18,"rewardGold":{"victory":57,"draw":0,"defeat":0},"rewardArcana":{"victory":51,"draw":1,"defeat":0},"bonusRewards":{"commonEquipmentChance":0.1},"travelSeconds":8,"faction":"Guild field notes","boss":true,"enemyIds":["orc_1","ogre","goblin_archer"],"knownThreats":["Ogre captain","Orc guard","Goblin archer"],"knownConditions":["Hard authored contract"],"rumors":["There is time to observe the trail."],"journey":"Secure a nearby watchpost before its three raiders scatter.","chance":"3-skull","randomEncounters":[],"tags":["Hunt"],"objectiveReturnText":"Field notes complete. Let us take these observations back to camp.","battleback":"BattleGate_v1","intendedLevel":6,"encounterTuning":{"hp":4,"damage":1,"speed":0},"battlebackFolder":"pictures","skulls":5}
```

#### The Lantern Index (`lantern_index`)

```json
{"id":"lantern_index","name":"The Lantern Index","durationMinutes":25,"difficulty":"Easy","category":"Fieldwork","description":"Follow lantern markers and catalogue the old roadside inscriptions.","danger":"Follow lantern markers and catalogue the old roadside inscriptions.","risk":"1-skull","riskExplanation":"Optional road encounters; no required finale. Existing wounds still matter.","rewardTypes":["275 Gold","225 Arcana","22 XP per companion"],"encounterType":"Optional roadside encounter","environment":"Road / woodland","combatMode":"optional","xpReward":22,"rewardGold":{"victory":275,"draw":3,"defeat":0},"rewardArcana":{"victory":225,"draw":1,"defeat":0},"bonusRewards":{"potionChance":0.5},"travelSeconds":8,"faction":"Guild field notes","boss":false,"enemyIds":[],"knownThreats":["Optional road patrol"],"knownConditions":["Easy authored contract"],"rumors":["There is time to observe the trail."],"journey":"Follow lantern markers and catalogue the old roadside inscriptions.","chance":"Low","randomEncounters":["bandits"],"tags":["Safe","Optional combat"],"objectiveReturnText":"Field notes complete. Let us take these observations back to camp.","battleback":"BattleWoodland_v1","battlebackFolder":"pictures","intendedLevel":1,"encounterTuning":{},"skulls":1}
```

#### Survey of the Old Aqueduct (`aqueduct_survey`)

```json
{"id":"aqueduct_survey","name":"Survey of the Old Aqueduct","durationMinutes":25,"difficulty":"Normal","category":"Hunt","description":"Survey the aqueduct and clear the skeleton patrol guarding the final arch.","danger":"Survey the aqueduct and clear the skeleton patrol guarding the final arch.","risk":"3-skull","riskExplanation":"Small preliminary skirmishes, then 3 foes at the objective. Wounds and death remain possible. Recommended level 1. 3-skull foes have reinforced HP.","rewardTypes":["375 Gold","325 Arcana","55 XP per companion"],"encounterType":"Guaranteed Hunt finale","environment":"Aqueduct / ruins","combatMode":"required","xpReward":55,"rewardGold":{"victory":375,"draw":3,"defeat":0},"rewardArcana":{"victory":325,"draw":1,"defeat":0},"bonusRewards":{"commonEquipmentChance":0.3},"travelSeconds":8,"faction":"Guild field notes","boss":false,"enemyIds":["skeleton_1","skeleton_2","skeleton_archer_1"],"knownThreats":["skeleton_1","skeleton_2","skeleton_archer_1"],"knownConditions":["Normal authored contract"],"rumors":["There is time to observe the trail."],"journey":"Survey the aqueduct and clear the skeleton patrol guarding the final arch.","chance":"3-skull","randomEncounters":[],"tags":["Hunt"],"objectiveReturnText":"Field notes complete. Let us take these observations back to camp.","battleback":"BattleWoodland_v1","intendedLevel":1,"encounterTuning":{"hp":6,"damage":0,"speed":0},"battlebackFolder":"pictures","skulls":3}
```

#### The Herbarium Circuit (`herbarium_circuit`)

```json
{"id":"herbarium_circuit","name":"The Herbarium Circuit","durationMinutes":30,"difficulty":"Normal","category":"Fieldwork","description":"Collect field observations along a broad woodland circuit; bandits may cross the route.","danger":"Collect field observations along a broad woodland circuit; bandits may cross the route.","risk":"3-skull","riskExplanation":"Optional road encounters; no required finale. Existing wounds still matter. Recommended level 1. 3-skull foes have reinforced HP.","rewardTypes":["450 Gold","390 Arcana","38 XP per companion"],"encounterType":"Optional roadside encounter","environment":"Forest / road","combatMode":"optional","xpReward":38,"rewardGold":{"victory":450,"draw":3,"defeat":0},"rewardArcana":{"victory":390,"draw":1,"defeat":0},"bonusRewards":{"potionChance":0.6},"travelSeconds":8,"faction":"Guild field notes","boss":false,"enemyIds":[],"knownThreats":["Optional road patrol"],"knownConditions":["Normal authored contract"],"rumors":["There is time to observe the trail."],"journey":"Collect field observations along a broad woodland circuit; bandits may cross the route.","chance":"3-skull","randomEncounters":["bandits"],"tags":["Safe","Optional combat"],"objectiveReturnText":"Field notes complete. Let us take these observations back to camp.","battleback":"BattleRoad_v1","intendedLevel":1,"encounterTuning":{"hp":4,"damage":0,"speed":0},"battlebackFolder":"pictures","skulls":3}
```

#### An Evening at the Observatory (`evening_observatory`)

```json
{"id":"evening_observatory","name":"An Evening at the Observatory","durationMinutes":30,"difficulty":"Hard","category":"Boss Hunt","description":"Recover the observatory journal from a necromancer and two cult attendants.","danger":"Recover the observatory journal from a necromancer and two cult attendants.","risk":"5-skull","riskExplanation":"Small preliminary skirmishes, then 3 foes at the objective. Wounds and death remain possible. Recommended level 4. 5-skull foes have reinforced HP and heavier attacks.","rewardTypes":["570 Gold","510 Arcana","75 XP per companion"],"encounterType":"Guaranteed boss finale","environment":"Observatory / ruins","combatMode":"required","xpReward":75,"rewardGold":{"victory":570,"draw":3,"defeat":0},"rewardArcana":{"victory":510,"draw":1,"defeat":0},"bonusRewards":{"rareEquipmentChance":0.2},"travelSeconds":8,"faction":"Guild field notes","boss":true,"enemyIds":["cultist_1","mage_cultist","necromancer"],"knownThreats":["cultist_1","mage_cultist","necromancer"],"knownConditions":["Hard authored contract"],"rumors":["There is time to observe the trail."],"journey":"Recover the observatory journal from a necromancer and two cult attendants.","chance":"3-skull","randomEncounters":[],"tags":["Hunt","Boss"],"objectiveReturnText":"Field notes complete. Let us take these observations back to camp.","battleback":"BattleWoodland_v1","intendedLevel":6,"encounterTuning":{"hp":1,"damage":1,"speed":0},"battlebackFolder":"pictures","skulls":5}
```

#### Roadside Scouts (`roadside_scouts`)

```json
{"id":"roadside_scouts","name":"Roadside Scouts","category":"Errands","durationMinutes":1,"description":"Follow the roadside scouts route and complete the guild's field assignment.","risk":"3-skull","danger":"Low-risk observation route.","rewardTypes":["3 Gold","0 Arcana","5 XP per companion","Potion (25% chance)"],"encounterType":"Travel and observation; no combat","environment":"Old road","combatMode":"none","xpReward":3,"rewardGold":{"victory":3,"draw":1,"defeat":0},"rewardArcana":{"victory":0,"draw":0,"defeat":0},"bonusRewards":{},"travelSeconds":4,"faction":"Bandits","boss":false,"enemyIds":[],"knownThreats":["Two road bandits"],"knownConditions":["Low encounter chance"],"rumors":["Lost packs lie off the road"],"journey":"A 1-minute circuit through old road.","chance":"Low","randomEncounters":[],"tags":["combatless","low risk"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Normal","riskExplanation":"Combatless stroll: quiet field notes and modest finds. One skull describes low risk, not duration.","battleback":"BattleRoad_v1","intendedLevel":1,"encounterTuning":{"hp":3,"damage":0,"speed":0},"battlebackFolder":"pictures","skulls":1}
```

#### Red Banner Lookout (`red_banner_lookout`)

```json
{"id":"red_banner_lookout","name":"Red Banner Lookout","durationMinutes":1,"difficulty":"Hard","category":"Hunt","description":"Follow the red banner lookout route and complete the guild's field assignment.","danger":"Low-risk observation route.","risk":"5-skull","riskExplanation":"Combatless stroll: quiet field notes and modest finds. One skull describes low risk, not duration.","rewardTypes":["6 Gold","1 Arcana","6 XP per companion","Common equipment (10% chance)"],"encounterType":"Travel and observation; no combat","environment":"Watchtower / forest","combatMode":"none","xpReward":3,"rewardGold":{"victory":3,"draw":1,"defeat":0},"rewardArcana":{"victory":0,"draw":0,"defeat":0},"bonusRewards":{},"travelSeconds":8,"faction":"Guild field notes","boss":false,"enemyIds":[],"knownThreats":["Ogre captain","Orc guard","Goblin archer"],"knownConditions":["Hard authored contract"],"rumors":["There is time to observe the trail."],"journey":"A 1-minute circuit through watchtower / forest.","chance":"3-skull","randomEncounters":[],"tags":["combatless","low risk"],"objectiveReturnText":"Field notes complete. Let us take these observations back to camp.","battleback":"BattleGate_v1","intendedLevel":1,"encounterTuning":{"hp":4,"damage":1,"speed":0},"battlebackFolder":"pictures","skulls":1}
```

#### The Silken Crossing (`silken_crossing`)

```json
{"id":"silken_crossing","name":"The Silken Crossing","category":"Hunt","durationMinutes":5,"description":"Follow the the silken crossing route and complete the guild's field assignment.","risk":"5-skull","danger":"Existing web attacks can incapacitate adventurers.","rewardTypes":["95 Gold","85 Arcana","19 XP per companion"],"encounterType":"Giant spiders","environment":"Forest / cave","combatMode":"required","xpReward":19,"rewardGold":{"victory":95,"draw":2,"defeat":0},"rewardArcana":{"victory":85,"draw":0,"defeat":0},"bonusRewards":{},"travelSeconds":7,"faction":"Beasts","boss":false,"enemyIds":["giant_spider_1","giant_spider_2"],"knownThreats":["Two giant spiders"],"knownConditions":["Web effect supported"],"rumors":["A useful pack lies in the nest"],"journey":"A 5-minute circuit through forest / cave.","chance":"3-skull","randomEncounters":[],"tags":["Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Hard","riskExplanation":"A deliberate challenge: 2 foes at the objective; wounds and death remain possible. 5-minute contract. Recommended level 2. 5-skull foes have reinforced HP and heavier attacks.","battleback":"BattleCavern_v1","battlebackFolder":"pictures","intendedLevel":6,"encounterTuning":{"hp":9,"damage":1,"speed":0},"skulls":5}
```

#### Field Map Survey (`field_map_survey`)

```json
{"id":"field_map_survey","name":"Field Map Survey","durationMinutes":10,"difficulty":"Easy","category":"Fieldwork","description":"Follow the field map survey route and complete the guild's field assignment.","danger":"Follow lantern markers and catalogue the old roadside inscriptions.","risk":"1-skull","riskExplanation":"Optional road encounters; no required finale. Existing wounds still matter.","rewardTypes":["110 Gold","90 Arcana","9 XP per companion"],"encounterType":"Optional roadside encounter","environment":"Road / woodland","combatMode":"optional","xpReward":9,"rewardGold":{"victory":110,"draw":1,"defeat":0},"rewardArcana":{"victory":90,"draw":0,"defeat":0},"bonusRewards":{"potionChance":0.5},"travelSeconds":8,"faction":"Guild field notes","boss":false,"enemyIds":[],"knownThreats":["Optional road patrol"],"knownConditions":["Easy authored contract"],"rumors":["There is time to observe the trail."],"journey":"A 10-minute circuit through road / woodland.","chance":"Low","randomEncounters":["bandits"],"tags":["Safe","Optional combat"],"objectiveReturnText":"Field notes complete. Let us take these observations back to camp.","battleback":"BattleWoodland_v1","battlebackFolder":"pictures","intendedLevel":1,"encounterTuning":{},"skulls":1}
```

#### Wayside Lantern Round (`wayside_lantern_round`)

```json
{"id":"wayside_lantern_round","name":"Wayside Lantern Round","durationMinutes":15,"difficulty":"Easy","category":"Fieldwork","description":"Follow the wayside lantern round route and complete the guild's field assignment.","danger":"Follow lantern markers and catalogue the old roadside inscriptions.","risk":"1-skull","riskExplanation":"Optional road encounters; no required finale. Existing wounds still matter.","rewardTypes":["165 Gold","135 Arcana","13 XP per companion"],"encounterType":"Optional roadside encounter","environment":"Road / woodland","combatMode":"optional","xpReward":13,"rewardGold":{"victory":165,"draw":2,"defeat":0},"rewardArcana":{"victory":135,"draw":1,"defeat":0},"bonusRewards":{"potionChance":0.5},"travelSeconds":8,"faction":"Guild field notes","boss":false,"enemyIds":[],"knownThreats":["Optional road patrol"],"knownConditions":["Easy authored contract"],"rumors":["There is time to observe the trail."],"journey":"A 15-minute circuit through road / woodland.","chance":"Low","randomEncounters":["bandits"],"tags":["Safe","Optional combat"],"objectiveReturnText":"Field notes complete. Let us take these observations back to camp.","battleback":"BattleWoodland_v1","battlebackFolder":"pictures","intendedLevel":1,"encounterTuning":{},"skulls":1}
```

#### Cemetery Boundary Watch (`cemetery_boundary_watch`)

```json
{"id":"cemetery_boundary_watch","name":"Cemetery Boundary Watch","category":"Hunt","durationMinutes":15,"description":"Follow the cemetery boundary watch route and complete the guild's field assignment.","risk":"3-skull","danger":"A skeleton group patrols the grounds.","rewardTypes":["225 Gold","195 Arcana","60 XP per companion"],"encounterType":"Skeletons","environment":"Cemetery","combatMode":"required","xpReward":60,"rewardGold":{"victory":225,"draw":4,"defeat":0},"rewardArcana":{"victory":195,"draw":0,"defeat":0},"travelSeconds":7,"faction":"Undead","boss":false,"enemyIds":["skeleton_1","skeleton_2","skeleton_archer_1"],"knownThreats":["Skeletons and an archer"],"knownConditions":["No necromancer at this tier"],"rumors":["Arcana clings to the graves"],"journey":"A 15-minute circuit through cemetery.","chance":"3-skull","randomEncounters":[],"tags":["Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Normal","riskExplanation":"Steady expedition pressure; 3 foes at the objective. 15-minute contract. Recommended level 1. 3-skull foes have reinforced HP.","battleback":"BattleGraveyard_v1","intendedLevel":1,"encounterTuning":{"hp":6,"damage":0,"speed":0},"battlebackFolder":"pictures","skulls":3}
```

#### Deep Crypt Vigil (`deep_crypt_vigil`)

```json
{"id":"deep_crypt_vigil","name":"Deep Crypt Vigil","category":"Boss Hunt","durationMinutes":25,"description":"Follow the deep crypt vigil route and complete the guild's field assignment.","risk":"5-skull","danger":"Skeletons support a necromancer.","rewardTypes":["475 Gold","425 Arcana","75 XP per companion"],"encounterType":"Undead / necromancer","environment":"Crypt","combatMode":"required","xpReward":75,"rewardGold":{"victory":475,"draw":13,"defeat":0},"rewardArcana":{"victory":425,"draw":2,"defeat":0},"bonusRewards":{"rareEquipmentChance":0.2},"travelSeconds":9,"faction":"Undead","boss":true,"enemyIds":["skeleton_1","skeleton_2","skeleton_archer_1","necromancer"],"knownThreats":["Skeletons and necromancer"],"knownConditions":["Boss battle"],"rumors":["Rare gear sank with the dead"],"journey":"A 25-minute circuit through crypt.","chance":"High","randomEncounters":[],"tags":["Boss","Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Hard","riskExplanation":"A deliberate challenge: 4 foes at the objective; wounds and death remain possible. 25-minute contract. Recommended level 4. 5-skull foes have reinforced HP and heavier attacks.","battleback":"BattleCavern_v1","intendedLevel":6,"encounterTuning":{"hp":1,"damage":1,"speed":0},"battlebackFolder":"pictures","skulls":5}
```

#### Long Lantern Circuit (`long_lantern_circuit`)

```json
{"id":"long_lantern_circuit","name":"Long Lantern Circuit","durationMinutes":30,"difficulty":"Easy","category":"Fieldwork","description":"Follow the long lantern circuit route and complete the guild's field assignment.","danger":"Follow lantern markers and catalogue the old roadside inscriptions.","risk":"1-skull","riskExplanation":"Optional road encounters; no required finale. Existing wounds still matter.","rewardTypes":["330 Gold","270 Arcana","26 XP per companion"],"encounterType":"Optional roadside encounter","environment":"Road / woodland","combatMode":"optional","xpReward":26,"rewardGold":{"victory":330,"draw":4,"defeat":0},"rewardArcana":{"victory":270,"draw":1,"defeat":0},"bonusRewards":{"potionChance":0.5},"travelSeconds":8,"faction":"Guild field notes","boss":false,"enemyIds":[],"knownThreats":["Optional road patrol"],"knownConditions":["Easy authored contract"],"rumors":["There is time to observe the trail."],"journey":"A 30-minute circuit through road / woodland.","chance":"Low","randomEncounters":["bandits"],"tags":["Safe","Optional combat"],"objectiveReturnText":"Field notes complete. Let us take these observations back to camp.","battleback":"BattleWoodland_v1","battlebackFolder":"pictures","intendedLevel":1,"encounterTuning":{},"skulls":1}
```

#### Ash Road Sentries (`ash_road_sentries`)

```json
{"id":"ash_road_sentries","name":"Ash Road Sentries","category":"Hunt","durationMinutes":3,"description":"The guild needs a careful patrol of ash-covered mileposts near distant watch horns.","risk":"4 skulls","danger":"4/5 skull danger; travel duration is separate.","rewardTypes":["51 Gold","45 Arcana","6 XP per companion"],"encounterType":"Paced road skirmishes and one objective encounter","environment":"Watchtower / ruins","combatMode":"required","xpReward":6,"rewardGold":{"victory":51,"draw":2,"defeat":0},"rewardArcana":{"victory":45,"draw":0,"defeat":0},"bonusRewards":{"commonEquipmentChance":0.35},"travelSeconds":8,"faction":"Orcs & Goblins","boss":false,"enemyIds":["orc_1","goblin_1","goblin_archer"],"knownThreats":["Orc, goblin, and archer"],"knownConditions":["Mixed enemy group"],"rumors":["Old equipment remains in the tower"],"journey":"Follow ash-covered mileposts, investigate distant watch horns, and return to camp.","chance":"3-skull","randomEncounters":[],"tags":["patrol","4 skulls","ash-covered mileposts"],"objectiveReturnText":"The Ash Road Sentries patrol is complete. Turn left and bring the field notes home.","difficulty":"Hard","riskExplanation":"4/5 skulls. Scout ash-covered mileposts; distant watch horns identify this route. Gear and support matter.","battleback":"BattleGate_v1","intendedLevel":4,"encounterTuning":{"hp":5,"damage":1,"speed":0},"battlebackFolder":"pictures","skulls":4}
```

#### Thornbank Trail (`thornbank_trail`)

```json
{"id":"thornbank_trail","name":"Thornbank Trail","category":"Hunt","durationMinutes":5,"description":"The guild needs a careful patrol of thorn-tangled banks near silk caught on briars.","risk":"4 skulls","danger":"4/5 skull danger; travel duration is separate.","rewardTypes":["85 Gold","75 Arcana","10 XP per companion"],"encounterType":"Paced road skirmishes and one objective encounter","environment":"Forest / cave","combatMode":"required","xpReward":10,"rewardGold":{"victory":85,"draw":2,"defeat":0},"rewardArcana":{"victory":75,"draw":0,"defeat":0},"bonusRewards":{},"travelSeconds":7,"faction":"Beasts","boss":false,"enemyIds":["giant_spider_1","giant_spider_2"],"knownThreats":["Two giant spiders"],"knownConditions":["Web effect supported"],"rumors":["A useful pack lies in the nest"],"journey":"Follow thorn-tangled banks, investigate silk caught on briars, and return to camp.","chance":"3-skull","randomEncounters":[],"tags":["patrol","4 skulls","thorn-tangled banks"],"objectiveReturnText":"The Thornbank Trail patrol is complete. Turn left and bring the field notes home.","difficulty":"Hard","riskExplanation":"4/5 skulls. Scout thorn-tangled banks; silk caught on briars identify this route. Gear and support matter.","battleback":"BattleCavern_v1","battlebackFolder":"pictures","intendedLevel":4,"encounterTuning":{"hp":5,"damage":1,"speed":0},"skulls":4}
```

#### Wayside Reliquary (`wayside_reliquary`)

```json
{"id":"wayside_reliquary","name":"Wayside Reliquary","category":"Fieldwork","durationMinutes":15,"description":"The guild needs a careful patrol of small roadside shrines near weathered votive stones.","risk":"2 skulls","danger":"2/5 skull danger; travel duration is separate.","rewardTypes":["195 Gold","165 Arcana","20 XP per companion"],"encounterType":"Paced road skirmishes and one objective encounter","environment":"Shrine / ruins","combatMode":"required","xpReward":20,"rewardGold":{"victory":195,"draw":2,"defeat":0},"rewardArcana":{"victory":165,"draw":0,"defeat":0},"bonusRewards":{"commonEquipmentChance":0.25},"travelSeconds":7,"faction":"Cultists","boss":false,"enemyIds":["cultist_1","cultist_2"],"knownThreats":["Two cultists"],"knownConditions":["Guaranteed combat"],"rumors":["The altar retains Arcana"],"journey":"Follow small roadside shrines, investigate weathered votive stones, and return to camp.","chance":"3-skull","randomEncounters":[],"tags":["patrol","2 skulls","small roadside shrines"],"objectiveReturnText":"The Wayside Reliquary patrol is complete. Turn left and bring the field notes home.","difficulty":"Normal","riskExplanation":"2/5 skulls. Scout small roadside shrines; weathered votive stones identify this route. Gear and support matter.","battleback":"BattleWoodland_v1","intendedLevel":1,"encounterTuning":{"hp":7,"damage":0,"speed":0},"battlebackFolder":"pictures","skulls":2}
```

#### Birchwater Samples (`birchwater_samples`)

```json
{"id":"birchwater_samples","name":"Birchwater Samples","category":"Fieldwork","durationMinutes":25,"description":"The guild needs a careful patrol of birch-lined pools near clear water in stoppered jars.","risk":"2 skulls","danger":"2/5 skull danger; travel duration is separate.","rewardTypes":["325 Gold","275 Arcana","32 XP per companion"],"encounterType":"Paced road skirmishes and one objective encounter","environment":"Cemetery","combatMode":"required","xpReward":32,"rewardGold":{"victory":325,"draw":2,"defeat":0},"rewardArcana":{"victory":275,"draw":0,"defeat":0},"travelSeconds":4,"faction":"Undead","boss":false,"enemyIds":["goblin_1","goblin_2"],"knownThreats":["Possible weak undead"],"knownConditions":["Low encounter chance"],"rumors":["Grave moss holds faint Arcana"],"journey":"Follow birch-lined pools, investigate clear water in stoppered jars, and return to camp.","chance":"Low","randomEncounters":["skeletons"],"tags":["patrol","2 skulls","birch-lined pools"],"objectiveReturnText":"The Birchwater Samples patrol is complete. Turn left and bring the field notes home.","difficulty":"Normal","riskExplanation":"2/5 skulls. Scout birch-lined pools; clear water in stoppered jars identify this route. Gear and support matter.","battleback":"BattleGraveyard_v1","intendedLevel":1,"encounterTuning":{"hp":4,"damage":0,"speed":0},"battlebackFolder":"pictures","skulls":2}
```

#### Moonlit Barrow (`moonlit_barrow`)

```json
{"id":"moonlit_barrow","name":"Moonlit Barrow","category":"Hunt","durationMinutes":25,"description":"The guild needs a careful patrol of moonlit burial slopes near old bronze grave bells.","risk":"4 skulls","danger":"4/5 skull danger; travel duration is separate.","rewardTypes":["425 Gold","375 Arcana","50 XP per companion"],"encounterType":"Paced road skirmishes and one objective encounter","environment":"Tower / ruins","combatMode":"required","xpReward":50,"rewardGold":{"victory":425,"draw":2,"defeat":0},"rewardArcana":{"victory":375,"draw":0,"defeat":0},"bonusRewards":{"rareEquipmentChance":0.25},"travelSeconds":9,"faction":"Undead Cult","boss":false,"enemyIds":["cultist_1","mage_cultist","skeleton_1","necromancer"],"knownThreats":["Cultists, skeleton, necromancer"],"knownConditions":["Boss battle"],"rumors":["Powerful gear may remain in the tower"],"journey":"Follow moonlit burial slopes, investigate old bronze grave bells, and return to camp.","chance":"High","randomEncounters":[],"tags":["patrol","4 skulls","moonlit burial slopes"],"objectiveReturnText":"The Moonlit Barrow patrol is complete. Turn left and bring the field notes home.","difficulty":"Hard","riskExplanation":"4/5 skulls. Scout moonlit burial slopes; old bronze grave bells identify this route. Gear and support matter.","battleback":"BattleGate_v1","intendedLevel":4,"encounterTuning":{"hp":1,"damage":1,"speed":0},"battlebackFolder":"pictures","skulls":4}
```

#### Meadow Cartography (`meadow_cartography`)

```json
{"id":"meadow_cartography","name":"Meadow Cartography","category":"Fieldwork","durationMinutes":30,"description":"The guild needs a careful patrol of open meadow tracks near inked landmarks on the guild map.","risk":"2 skulls","danger":"2/5 skull danger; travel duration is separate.","rewardTypes":["390 Gold","330 Arcana","39 XP per companion"],"encounterType":"Paced road skirmishes and one objective encounter","environment":"Road","combatMode":"required","xpReward":39,"rewardGold":{"victory":390,"draw":2,"defeat":0},"rewardArcana":{"victory":330,"draw":0,"defeat":0},"bonusRewards":{"potionChance":0.75},"travelSeconds":5,"faction":"Bandits","boss":false,"enemyIds":["goblin_1","goblin_2"],"knownThreats":["Possible bandit ambush"],"knownConditions":["Protect-the-party flavor; no escort AI"],"rumors":["The road has been watched"],"journey":"Follow open meadow tracks, investigate inked landmarks on the guild map, and return to camp.","chance":"Low","randomEncounters":["bandits"],"tags":["patrol","2 skulls","open meadow tracks"],"objectiveReturnText":"The Meadow Cartography patrol is complete. Turn left and bring the field notes home.","difficulty":"Normal","riskExplanation":"2/5 skulls. Scout open meadow tracks; inked landmarks on the guild map identify this route. Gear and support matter.","battleback":"BattleRoad_v1","intendedLevel":1,"encounterTuning":{"hp":4,"damage":0,"speed":0},"battlebackFolder":"pictures","skulls":2}
```

#### Ridge Signal Fires (`ridge_signal_fires`)

```json
{"id":"ridge_signal_fires","name":"Ridge Signal Fires","category":"Hunt","durationMinutes":30,"description":"The guild needs a careful patrol of windy ridge beacons near bundles of dry signal wood.","risk":"4 skulls","danger":"4/5 skull danger; travel duration is separate.","rewardTypes":["510 Gold","450 Arcana","60 XP per companion"],"encounterType":"Paced road skirmishes and one objective encounter","environment":"Watchtower / ruins","combatMode":"required","xpReward":60,"rewardGold":{"victory":510,"draw":2,"defeat":0},"rewardArcana":{"victory":450,"draw":0,"defeat":0},"bonusRewards":{"commonEquipmentChance":0.35},"travelSeconds":8,"faction":"Orcs & Goblins","boss":false,"enemyIds":["orc_1","goblin_1","goblin_archer"],"knownThreats":["Orc, goblin, and archer"],"knownConditions":["Mixed enemy group"],"rumors":["Old equipment remains in the tower"],"journey":"Follow windy ridge beacons, investigate bundles of dry signal wood, and return to camp.","chance":"3-skull","randomEncounters":[],"tags":["patrol","4 skulls","windy ridge beacons"],"objectiveReturnText":"The Ridge Signal Fires patrol is complete. Turn left and bring the field notes home.","difficulty":"Hard","riskExplanation":"4/5 skulls. Scout windy ridge beacons; bundles of dry signal wood identify this route. Gear and support matter.","battleback":"BattleGate_v1","intendedLevel":4,"encounterTuning":{"hp":5,"damage":1,"speed":0},"battlebackFolder":"pictures","skulls":4}
```

#### Brookside Escort (`brookside_escort`)

```json
{"id":"brookside_escort","name":"Brookside Escort","category":"Fieldwork","durationMinutes":3,"description":"The guild needs a careful patrol of a shallow brook crossing near a cart of fresh bread.","risk":"1 skulls","danger":"1/5 skull danger; travel duration is separate.","rewardTypes":["33 Gold","27 Arcana","6 XP per companion"],"encounterType":"Paced road skirmishes and one objective encounter","environment":"Forest","combatMode":"required","xpReward":6,"rewardGold":{"victory":33,"draw":2,"defeat":0},"rewardArcana":{"victory":27,"draw":0,"defeat":0},"travelSeconds":4,"faction":"Beasts","boss":false,"enemyIds":["goblin_1"],"knownThreats":["Possible wolf"],"knownConditions":["Low encounter chance"],"rumors":["Tracks circle the work site"],"journey":"Follow a shallow brook crossing, investigate a cart of fresh bread, and return to camp.","chance":"Low","randomEncounters":["wolves"],"tags":["patrol","1 skulls","a shallow brook crossing"],"objectiveReturnText":"The Brookside Escort patrol is complete. Turn left and bring the field notes home.","difficulty":"Easy","riskExplanation":"1/5 skulls. Scout a shallow brook crossing; a cart of fresh bread identify this route. Gear and support matter.","battleback":"BattleWoodland_v1","battlebackFolder":"pictures","intendedLevel":1,"encounterTuning":{},"skulls":1}
```

#### Millstream Watch (`millstream_watch`)

```json
{"id":"millstream_watch","name":"Millstream Watch","category":"Hunt","durationMinutes":5,"description":"The guild needs a careful patrol of the old millrace near footprints in damp flour.","risk":"3 skulls","danger":"3/5 skull danger; travel duration is separate.","rewardTypes":["75 Gold","65 Arcana","10 XP per companion"],"encounterType":"Paced road skirmishes and one objective encounter","environment":"Road / forest","combatMode":"required","xpReward":10,"rewardGold":{"victory":75,"draw":2,"defeat":0},"rewardArcana":{"victory":65,"draw":0,"defeat":0},"bonusRewards":{"commonEquipmentChance":0.15},"travelSeconds":5,"faction":"Goblins","boss":false,"enemyIds":["goblin_1","goblin_2","goblin_archer"],"knownThreats":["Goblin raiders and archer"],"knownConditions":["Guaranteed combat"],"rumors":["Their tracks cross the old road"],"journey":"Follow the old millrace, investigate footprints in damp flour, and return to camp.","chance":"Low","randomEncounters":[],"tags":["patrol","3 skulls","the old millrace"],"objectiveReturnText":"The Millstream Watch patrol is complete. Turn left and bring the field notes home.","difficulty":"Normal","riskExplanation":"3/5 skulls. Scout the old millrace; footprints in damp flour identify this route. Gear and support matter.","battleback":"BattleWoodland_v1","battlebackFolder":"pictures","intendedLevel":1,"encounterTuning":{"hp":7,"damage":0,"speed":0},"skulls":3}
```

#### Orchard Trackers (`orchard_trackers`)

```json
{"id":"orchard_trackers","name":"Orchard Trackers","category":"Fieldwork","durationMinutes":10,"description":"The guild needs a careful patrol of the southern orchard near windfall apples and bent grass.","risk":"1 skulls","danger":"1/5 skull danger; travel duration is separate.","rewardTypes":["110 Gold","90 Arcana","13 XP per companion"],"encounterType":"Paced road skirmishes and one objective encounter","environment":"Cellar / ruins","combatMode":"required","xpReward":13,"rewardGold":{"victory":110,"draw":2,"defeat":0},"rewardArcana":{"victory":90,"draw":0,"defeat":0},"bonusRewards":{"potionChance":0.3},"travelSeconds":5,"faction":"Undead","boss":false,"enemyIds":["skeleton_1"],"knownThreats":["One weak skeleton"],"knownConditions":["Guaranteed minor combat"],"rumors":["A useful item may remain below"],"journey":"Follow the southern orchard, investigate windfall apples and bent grass, and return to camp.","chance":"Low","randomEncounters":[],"tags":["patrol","1 skulls","the southern orchard"],"objectiveReturnText":"The Orchard Trackers patrol is complete. Turn left and bring the field notes home.","difficulty":"Easy","riskExplanation":"1/5 skulls. Scout the southern orchard; windfall apples and bent grass identify this route. Gear and support matter.","battleback":"BattleCavern_v1","intendedLevel":1,"encounterTuning":{},"battlebackFolder":"pictures","skulls":1}
```

#### Broken Banner Escort (`hunt_hobgoblin`)

```json
{"id":"hunt_hobgoblin","name":"Broken Banner Escort","category":"Short","durationMinutes":20,"description":"A twenty-minute expedition: overcome patrols, then confront the Hobgoblin.","risk":"5-skull","danger":"Skeletons support a necromancer.","rewardTypes":["300 Gold","260 Arcana","65 XP per companion"],"encounterType":"Undead / necromancer","environment":"Crypt","combatMode":"required","xpReward":65,"rewardGold":{"victory":300,"draw":8,"defeat":0},"rewardArcana":{"victory":260,"draw":1,"defeat":0},"bonusRewards":{"rareEquipmentChance":0.2},"travelSeconds":9,"faction":"Monsters","boss":true,"enemyIds":["hobgoblin"],"knownThreats":["Hobgoblin"],"knownConditions":["Twenty-minute journey","Some patrols arrive in two waves","One final guardian"],"rumors":["Rare gear sank with the dead"],"journey":"Reach the objective, defeat its guardian, and return to camp.","chance":"High","randomEncounters":[],"tags":["Boss","Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Normal","riskExplanation":"3/5 danger. Several patrols and a final guardian; reinforcements may arrive in two waves.","battleback":"BattleCavern_v1","intendedLevel":3,"encounterTuning":{},"battlebackFolder":"pictures","skulls":3}
```

#### The Bellkeeper’s Rest (`hunt_wraith`)

```json
{"id":"hunt_wraith","name":"The Bellkeeper’s Rest","category":"Errands","durationMinutes":20,"description":"A twenty-minute expedition: overcome patrols, then confront the Wraith.","risk":"5-skull","danger":"Skeletons support a necromancer.","rewardTypes":["340 Gold","300 Arcana","65 XP per companion"],"encounterType":"Undead / necromancer","environment":"Crypt","combatMode":"required","xpReward":65,"rewardGold":{"victory":340,"draw":8,"defeat":0},"rewardArcana":{"victory":300,"draw":1,"defeat":0},"bonusRewards":{"rareEquipmentChance":0.2},"travelSeconds":9,"faction":"Monsters","boss":true,"enemyIds":["wraith"],"knownThreats":["Wraith"],"knownConditions":["Twenty-minute journey","Some patrols arrive in two waves","One final guardian"],"rumors":["Rare gear sank with the dead"],"journey":"Reach the objective, defeat its guardian, and return to camp.","chance":"High","randomEncounters":[],"tags":["Boss","Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Hard","riskExplanation":"4/5 danger. Several patrols and a final guardian; reinforcements may arrive in two waves.","battleback":"BattleCavern_v1","intendedLevel":4,"encounterTuning":{},"battlebackFolder":"pictures","skulls":4}
```

#### Cliffside Rescue (`hunt_harpy`)

```json
{"id":"hunt_harpy","name":"Cliffside Rescue","category":"Boss Hunt","durationMinutes":20,"description":"A twenty-minute expedition: overcome patrols, then confront the Harpy.","risk":"5-skull","danger":"Skeletons support a necromancer.","rewardTypes":["380 Gold","340 Arcana","65 XP per companion"],"encounterType":"Undead / necromancer","environment":"Crypt","combatMode":"required","xpReward":65,"rewardGold":{"victory":380,"draw":8,"defeat":0},"rewardArcana":{"victory":340,"draw":1,"defeat":0},"bonusRewards":{"rareEquipmentChance":0.2},"travelSeconds":9,"faction":"Monsters","boss":true,"enemyIds":["harpy"],"knownThreats":["Harpy"],"knownConditions":["Twenty-minute journey","Some patrols arrive in two waves","One final guardian"],"rumors":["Rare gear sank with the dead"],"journey":"Reach the objective, defeat its guardian, and return to camp.","chance":"High","randomEncounters":[],"tags":["Boss","Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Hard","riskExplanation":"5/5 danger. Several patrols and a final guardian; reinforcements may arrive in two waves.","battleback":"BattleCavern_v1","intendedLevel":5,"encounterTuning":{},"battlebackFolder":"pictures","skulls":5}
```

#### Bridge Toll Tyrant (`hunt_troll`)

```json
{"id":"hunt_troll","name":"Bridge Toll Tyrant","category":"Fieldwork","durationMinutes":20,"description":"A twenty-minute expedition: overcome patrols, then confront the Troll.","risk":"5-skull","danger":"Skeletons support a necromancer.","rewardTypes":["300 Gold","260 Arcana","65 XP per companion"],"encounterType":"Undead / necromancer","environment":"Crypt","combatMode":"required","xpReward":65,"rewardGold":{"victory":300,"draw":8,"defeat":0},"rewardArcana":{"victory":260,"draw":1,"defeat":0},"bonusRewards":{"rareEquipmentChance":0.2},"travelSeconds":9,"faction":"Monsters","boss":true,"enemyIds":["troll"],"knownThreats":["Troll"],"knownConditions":["Twenty-minute journey","Some patrols arrive in two waves","One final guardian"],"rumors":["Rare gear sank with the dead"],"journey":"Reach the objective, defeat its guardian, and return to camp.","chance":"High","randomEncounters":[],"tags":["Boss","Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Normal","riskExplanation":"3/5 danger. Several patrols and a final guardian; reinforcements may arrive in two waves.","battleback":"BattleCavern_v1","intendedLevel":3,"encounterTuning":{},"battlebackFolder":"pictures","skulls":3}
```

#### Seal the Ember Rift (`hunt_imp`)

```json
{"id":"hunt_imp","name":"Seal the Ember Rift","category":"Hunt","durationMinutes":20,"description":"A twenty-minute expedition: overcome patrols, then confront the Imp.","risk":"5-skull","danger":"Skeletons support a necromancer.","rewardTypes":["340 Gold","300 Arcana","65 XP per companion"],"encounterType":"Undead / necromancer","environment":"Crypt","combatMode":"required","xpReward":65,"rewardGold":{"victory":340,"draw":8,"defeat":0},"rewardArcana":{"victory":300,"draw":1,"defeat":0},"bonusRewards":{"rareEquipmentChance":0.2},"travelSeconds":9,"faction":"Monsters","boss":true,"enemyIds":["imp"],"knownThreats":["Imp"],"knownConditions":["Twenty-minute journey","Some patrols arrive in two waves","One final guardian"],"rumors":["Rare gear sank with the dead"],"journey":"Reach the objective, defeat its guardian, and return to camp.","chance":"High","randomEncounters":[],"tags":["Boss","Hunt"],"objectiveReturnText":"Objective complete. The guild is waiting; let us head home.","difficulty":"Hard","riskExplanation":"4/5 danger. Several patrols and a final guardian; reinforcements may arrive in two waves.","battleback":"BattleCavern_v1","intendedLevel":4,"encounterTuning":{},"battlebackFolder":"pictures","skulls":4}
```

#### The Cistern Has Teeth (`fantasy_01`)

```json
{"id":"fantasy_01","name":"The Cistern Has Teeth","category":"Errands","durationMinutes":1,"description":"Retrieve a dropped well key before the slime reaches the drinking channel.","risk":"1-skull","skulls":1,"difficulty":"Easy","danger":"Slime / Ratman","rewardTypes":["14 Gold","7 Arcana","5 XP per companion"],"encounterType":"Slime and ratman signs; avoid combat","environment":"Abandoned village cistern","combatMode":"none","xpReward":5,"rewardGold":{"victory":14,"draw":3,"defeat":0},"rewardArcana":{"victory":7,"draw":1,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Frontier","boss":false,"enemyIds":[],"skirmishEnemyIds":[],"knownThreats":["Slime","Ratman"],"knownConditions":["One-minute retrieval; no combat","Avoid the occupied drainage channel"],"rumors":["Retrieve a dropped well key before the slime reaches the drinking channel."],"journey":"Cross the abandoned village cistern, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Errands","Abandoned village cistern"],"objectiveReturnText":"The Cistern Has Teeth: contract secured. Return to the guild.","riskExplanation":"1/5 danger: retrieve the key without disturbing nearby slimes and ratmen.","battleback":"Stone1","battlebackFolder":"battlebacks1","intendedLevel":1,"encounterTuning":{}}
```

#### Lanterns for the Lost (`fantasy_02`)

```json
{"id":"fantasy_02","name":"Lanterns for the Lost","category":"Errands","durationMinutes":5,"description":"Relight the causeway lanterns and escort a stranded ferryman through false lights.","risk":"2-skull","skulls":2,"difficulty":"Normal","danger":"Ghost / Will-o-Wisp","rewardTypes":["46 Gold","23 Arcana","16 XP per companion"],"encounterType":"Ghost / Will-o-Wisp","environment":"Flooded pilgrim causeway","combatMode":"required","xpReward":16,"rewardGold":{"victory":46,"draw":11,"defeat":0},"rewardArcana":{"victory":23,"draw":5,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Frontier","boss":false,"enemyIds":["ghost","will_o_wisp"],"skirmishEnemyIds":["will_o_wisp"],"knownThreats":["Ghost","Will-o-Wisp"],"knownConditions":["5-minute expedition","2-skull danger","Local patrols differ from the final objective"],"rumors":["Relight the causeway lanterns and escort a stranded ferryman through false lights."],"journey":"Cross the flooded pilgrim causeway, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Errands","Flooded pilgrim causeway"],"objectiveReturnText":"Lanterns for the Lost: contract secured. Return to the guild.","riskExplanation":"2/5 danger: Ghost, Will-o-Wisp.","battleback":"PoisonSwamp","battlebackFolder":"battlebacks1","intendedLevel":1,"encounterTuning":{}}
```

#### The Last Ore Cart (`fantasy_03`)

```json
{"id":"fantasy_03","name":"The Last Ore Cart","category":"Errands","durationMinutes":15,"description":"Recover guild assay records from a hostile claim jumper and secure the ore cart.","risk":"3-skull","skulls":3,"difficulty":"Hard","danger":"Dwarf Prospector / Kobold / Giant Bat","rewardTypes":["114 Gold","57 Arcana","39 XP per companion"],"encounterType":"Dwarf Prospector / Kobold / Giant Bat","environment":"Contested silver mine","combatMode":"required","xpReward":39,"rewardGold":{"victory":114,"draw":28,"defeat":0},"rewardArcana":{"victory":57,"draw":14,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Frontier","boss":false,"enemyIds":["dwarf_prospector","kobold","giant_bat"],"skirmishEnemyIds":["kobold","giant_bat"],"knownThreats":["Dwarf Prospector","Kobold","Giant Bat"],"knownConditions":["15-minute expedition","3-skull danger","Local patrols differ from the final objective"],"rumors":["Recover guild assay records from a hostile claim jumper and secure the ore cart."],"journey":"Cross the contested silver mine, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Errands","Contested silver mine"],"objectiveReturnText":"The Last Ore Cart: contract secured. Return to the guild.","riskExplanation":"3/5 danger: Dwarf Prospector, Kobold, Giant Bat.","battleback":"DirtCave","battlebackFolder":"battlebacks1","intendedLevel":2,"encounterTuning":{}}
```

#### Bell Tower at Dusk (`fantasy_04`)

```json
{"id":"fantasy_04","name":"Bell Tower at Dusk","category":"Short","durationMinutes":3,"description":"Clear the bell chamber before the evening alarm attracts another swarm.","risk":"1-skull","skulls":1,"difficulty":"Easy","danger":"Giant Bat / Ratman","rewardTypes":["26 Gold","13 Arcana","9 XP per companion"],"encounterType":"Giant Bat / Ratman","environment":"Village bell tower","combatMode":"required","xpReward":9,"rewardGold":{"victory":26,"draw":6,"defeat":0},"rewardArcana":{"victory":13,"draw":3,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Frontier","boss":false,"enemyIds":["giant_bat","ratman"],"skirmishEnemyIds":["giant_bat"],"knownThreats":["Giant Bat","Ratman"],"knownConditions":["3-minute expedition","1-skull danger","Local patrols differ from the final objective"],"rumors":["Clear the bell chamber before the evening alarm attracts another swarm."],"journey":"Cross the village bell tower, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Short","Village bell tower"],"objectiveReturnText":"Bell Tower at Dusk: contract secured. Return to the guild.","riskExplanation":"1/5 danger: Giant Bat, Ratman.","battleback":"Castle1","battlebackFolder":"battlebacks1","intendedLevel":1,"encounterTuning":{}}
```

#### Wolves at the Tollgate (`fantasy_05`)

```json
{"id":"fantasy_05","name":"Wolves at the Tollgate","category":"Short","durationMinutes":5,"description":"Drive off the pack while its gnoll handler tries to cut the toll ropes.","risk":"2-skull","skulls":2,"difficulty":"Normal","danger":"Wolf / Gnoll","rewardTypes":["46 Gold","23 Arcana","16 XP per companion"],"encounterType":"Wolf / Gnoll","environment":"Snowmelt toll road","combatMode":"required","xpReward":16,"rewardGold":{"victory":46,"draw":11,"defeat":0},"rewardArcana":{"victory":23,"draw":5,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Frontier","boss":false,"enemyIds":["wolf","gnoll"],"skirmishEnemyIds":["wolf"],"knownThreats":["Wolf","Gnoll"],"knownConditions":["5-minute expedition","2-skull danger","Local patrols differ from the final objective"],"rumors":["Drive off the pack while its gnoll handler tries to cut the toll ropes."],"journey":"Cross the snowmelt toll road, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Short","Snowmelt toll road"],"objectiveReturnText":"Wolves at the Tollgate: contract secured. Return to the guild.","riskExplanation":"2/5 danger: Wolf, Gnoll.","battleback":"Road2","battlebackFolder":"battlebacks1","intendedLevel":1,"encounterTuning":{}}
```

#### The Rooftop Reliquary (`fantasy_06`)

```json
{"id":"fantasy_06","name":"The Rooftop Reliquary","category":"Short","durationMinutes":10,"description":"Recover a stolen reliquary from rooftop sentries before the storm arrives.","risk":"3-skull","skulls":3,"difficulty":"Hard","danger":"Gargoyle / Harpy","rewardTypes":["84 Gold","42 Arcana","29 XP per companion"],"encounterType":"Gargoyle / Harpy","environment":"Wind-scoured temple roof","combatMode":"required","xpReward":29,"rewardGold":{"victory":84,"draw":21,"defeat":0},"rewardArcana":{"victory":42,"draw":10,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Frontier","boss":false,"enemyIds":["gargoyle","harpy"],"skirmishEnemyIds":["harpy"],"knownThreats":["Gargoyle","Harpy"],"knownConditions":["10-minute expedition","3-skull danger","Local patrols differ from the final objective"],"rumors":["Recover a stolen reliquary from rooftop sentries before the storm arrives."],"journey":"Cross the wind-scoured temple roof, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Short","Wind-scoured temple roof"],"objectiveReturnText":"The Rooftop Reliquary: contract secured. Return to the guild.","riskExplanation":"3/5 danger: Gargoyle, Harpy.","battleback":"Temple","battlebackFolder":"battlebacks1","intendedLevel":2,"encounterTuning":{}}
```

#### Tracks in the Reedbeds (`fantasy_07`)

```json
{"id":"fantasy_07","name":"Tracks in the Reedbeds","category":"Fieldwork","durationMinutes":3,"description":"Collect water samples from three marked pools where the reeds conceal hungry scavengers.","risk":"1-skull","skulls":1,"difficulty":"Easy","danger":"Slime / Giant Bat","rewardTypes":["26 Gold","13 Arcana","9 XP per companion"],"encounterType":"Slime / Giant Bat","environment":"River reed survey","combatMode":"required","xpReward":9,"rewardGold":{"victory":26,"draw":6,"defeat":0},"rewardArcana":{"victory":13,"draw":3,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Frontier","boss":false,"enemyIds":["slime","giant_bat"],"skirmishEnemyIds":["slime"],"knownThreats":["Slime","Giant Bat"],"knownConditions":["3-minute expedition","1-skull danger","Local patrols differ from the final objective"],"rumors":["Collect water samples from three marked pools where the reeds conceal hungry scavengers."],"journey":"Cross the river reed survey, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Fieldwork","River reed survey"],"objectiveReturnText":"Tracks in the Reedbeds: contract secured. Return to the guild.","riskExplanation":"1/5 danger: Slime, Giant Bat.","battleback":"Grassland","battlebackFolder":"battlebacks1","intendedLevel":1,"encounterTuning":{}}
```

#### A Map of False Stars (`fantasy_08`)

```json
{"id":"fantasy_08","name":"A Map of False Stars","category":"Fieldwork","durationMinutes":10,"description":"Map the sinkhole using chalk markers rather than the deceptive floating lights.","risk":"2-skull","skulls":2,"difficulty":"Normal","danger":"Will-o-Wisp / Kobold / Ghost","rewardTypes":["76 Gold","38 Arcana","26 XP per companion"],"encounterType":"Will-o-Wisp / Kobold / Ghost","environment":"Crystal-lit sinkhole","combatMode":"required","xpReward":26,"rewardGold":{"victory":76,"draw":19,"defeat":0},"rewardArcana":{"victory":38,"draw":9,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Frontier","boss":false,"enemyIds":["will_o_wisp","kobold","ghost"],"skirmishEnemyIds":["kobold","will_o_wisp"],"knownThreats":["Will-o-Wisp","Kobold","Ghost"],"knownConditions":["10-minute expedition","2-skull danger","Local patrols differ from the final objective"],"rumors":["Map the sinkhole using chalk markers rather than the deceptive floating lights."],"journey":"Cross the crystal-lit sinkhole, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Fieldwork","Crystal-lit sinkhole"],"objectiveReturnText":"A Map of False Stars: contract secured. Return to the guild.","riskExplanation":"2/5 danger: Will-o-Wisp, Kobold, Ghost.","battleback":"Crystal","battlebackFolder":"battlebacks1","intendedLevel":1,"encounterTuning":{}}
```

#### The Orchard That Walked (`fantasy_09`)

```json
{"id":"fantasy_09","name":"The Orchard That Walked","category":"Fieldwork","durationMinutes":25,"description":"Trace the moving boundary stones and break the hag pact binding the ancient orchard.","risk":"4-skull","skulls":4,"difficulty":"Hard","danger":"Treant / Swamp Hag / Wolf","rewardTypes":["182 Gold","91 Arcana","62 XP per companion"],"encounterType":"Treant / Swamp Hag / Wolf","environment":"Overgrown royal orchard","combatMode":"required","xpReward":62,"rewardGold":{"victory":182,"draw":45,"defeat":0},"rewardArcana":{"victory":91,"draw":22,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Frontier","boss":false,"enemyIds":["treant","swamp_hag","wolf"],"skirmishEnemyIds":["wolf","swamp_hag"],"knownThreats":["Treant","Swamp Hag","Wolf"],"knownConditions":["25-minute expedition","4-skull danger","Local patrols differ from the final objective"],"rumors":["Trace the moving boundary stones and break the hag pact binding the ancient orchard."],"journey":"Cross the overgrown royal orchard, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Fieldwork","Overgrown royal orchard"],"objectiveReturnText":"The Orchard That Walked: contract secured. Return to the guild.","riskExplanation":"4/5 danger: Treant, Swamp Hag, Wolf.","battleback":"GrassMaze","battlebackFolder":"battlebacks1","intendedLevel":3,"encounterTuning":{}}
```

#### Feathers in the Honey (`fantasy_10`)

```json
{"id":"fantasy_10","name":"Feathers in the Honey","category":"Hunt","durationMinutes":5,"description":"Lure an owlbear away from the last occupied hives and reclaim the beekeeper trail.","risk":"2-skull","skulls":2,"difficulty":"Normal","danger":"Owlbear / Giant Bat","rewardTypes":["46 Gold","23 Arcana","16 XP per companion"],"encounterType":"Owlbear / Giant Bat","environment":"Ruined hillside apiary","combatMode":"required","xpReward":16,"rewardGold":{"victory":46,"draw":11,"defeat":0},"rewardArcana":{"victory":23,"draw":5,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Frontier","boss":false,"enemyIds":["owlbear","giant_bat"],"skirmishEnemyIds":["giant_bat"],"knownThreats":["Owlbear","Giant Bat"],"knownConditions":["5-minute expedition","2-skull danger","Local patrols differ from the final objective"],"rumors":["Lure an owlbear away from the last occupied hives and reclaim the beekeeper trail."],"journey":"Cross the ruined hillside apiary, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Hunt","Ruined hillside apiary"],"objectiveReturnText":"Feathers in the Honey: contract secured. Return to the guild.","riskExplanation":"2/5 danger: Owlbear, Giant Bat.","battleback":"DirtField","battlebackFolder":"battlebacks1","intendedLevel":1,"encounterTuning":{}}
```

#### Carrion at the Icehouse (`fantasy_11`)

```json
{"id":"fantasy_11","name":"Carrion at the Icehouse","category":"Hunt","durationMinutes":15,"description":"Destroy the carrion nest before the thaw carries its remains into the abbey spring.","risk":"3-skull","skulls":3,"difficulty":"Hard","danger":"Ghoul / Ghost / Ratman","rewardTypes":["114 Gold","57 Arcana","39 XP per companion"],"encounterType":"Ghoul / Ghost / Ratman","environment":"Frozen abbey storehouse","combatMode":"required","xpReward":39,"rewardGold":{"victory":114,"draw":28,"defeat":0},"rewardArcana":{"victory":57,"draw":14,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Frontier","boss":false,"enemyIds":["ghoul","ghost","ratman"],"skirmishEnemyIds":["ghoul","ratman"],"knownThreats":["Ghoul","Ghost","Ratman"],"knownConditions":["15-minute expedition","3-skull danger","Local patrols differ from the final objective"],"rumors":["Destroy the carrion nest before the thaw carries its remains into the abbey spring."],"journey":"Cross the frozen abbey storehouse, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Hunt","Frozen abbey storehouse"],"objectiveReturnText":"Carrion at the Icehouse: contract secured. Return to the guild.","riskExplanation":"3/5 danger: Ghoul, Ghost, Ratman.","battleback":"IceCave","battlebackFolder":"battlebacks1","intendedLevel":2,"encounterTuning":{}}
```

#### Eyes Beneath the Sand (`fantasy_12`)

```json
{"id":"fantasy_12","name":"Eyes Beneath the Sand","category":"Hunt","durationMinutes":20,"description":"Track a basilisk through glassy footprints and recover the caravan water seals.","risk":"4-skull","skulls":4,"difficulty":"Hard","danger":"Basilisk / Gnoll / Kobold","rewardTypes":["152 Gold","76 Arcana","52 XP per companion"],"encounterType":"Basilisk / Gnoll / Kobold","environment":"Buried caravan oasis","combatMode":"required","xpReward":52,"rewardGold":{"victory":152,"draw":38,"defeat":0},"rewardArcana":{"victory":76,"draw":19,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Frontier","boss":false,"enemyIds":["basilisk","gnoll","kobold"],"skirmishEnemyIds":["gnoll","kobold"],"knownThreats":["Basilisk","Gnoll","Kobold"],"knownConditions":["20-minute expedition","4-skull danger","Local patrols differ from the final objective"],"rumors":["Track a basilisk through glassy footprints and recover the caravan water seals."],"journey":"Cross the buried caravan oasis, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Hunt","Buried caravan oasis"],"objectiveReturnText":"Eyes Beneath the Sand: contract secured. Return to the guild.","riskExplanation":"4/5 danger: Basilisk, Gnoll, Kobold.","battleback":"Desert","battlebackFolder":"battlebacks1","intendedLevel":3,"encounterTuning":{}}
```

#### The Cinder Nursery (`fantasy_13`)

```json
{"id":"fantasy_13","name":"The Cinder Nursery","category":"Boss Hunt","durationMinutes":10,"description":"Dislodge a newly hatched dragon from the forge vents before its first full firestorm.","risk":"3-skull","skulls":3,"difficulty":"Hard","danger":"Wyrmling / Kobold","rewardTypes":["84 Gold","42 Arcana","29 XP per companion"],"encounterType":"Wyrmling / Kobold","environment":"Volcanic dragon nursery","combatMode":"required","xpReward":29,"rewardGold":{"victory":84,"draw":21,"defeat":0},"rewardArcana":{"victory":42,"draw":10,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Monsters","boss":true,"enemyIds":["wyrmling","kobold"],"skirmishEnemyIds":["kobold"],"knownThreats":["Wyrmling","Kobold"],"knownConditions":["10-minute expedition","3-skull danger","Local patrols differ from the final objective"],"rumors":["Dislodge a newly hatched dragon from the forge vents before its first full firestorm."],"journey":"Cross the volcanic dragon nursery, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Boss Hunt","Volcanic dragon nursery"],"objectiveReturnText":"The Cinder Nursery: contract secured. Return to the guild.","riskExplanation":"3/5 danger: Wyrmling, Kobold.","battleback":"LavaCave","battlebackFolder":"battlebacks1","intendedLevel":2,"encounterTuning":{}}
```

#### Captain of the Black Shoal (`fantasy_14`)

```json
{"id":"fantasy_14","name":"Captain of the Black Shoal","category":"Boss Hunt","durationMinutes":20,"description":"Board the flagship, recover the harbor charter, and defeat its captain on the quarterdeck.","risk":"4-skull","skulls":4,"difficulty":"Hard","danger":"Pirate Captain / Pirate / Harpy","rewardTypes":["152 Gold","76 Arcana","52 XP per companion"],"encounterType":"Pirate Captain / Pirate / Harpy","environment":"Stormbound pirate flagship","combatMode":"required","xpReward":52,"rewardGold":{"victory":152,"draw":38,"defeat":0},"rewardArcana":{"victory":76,"draw":19,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Monsters","boss":true,"enemyIds":["pirate_captain","pirate","harpy"],"skirmishEnemyIds":["pirate","harpy"],"knownThreats":["Pirate Captain","Pirate","Harpy"],"knownConditions":["20-minute expedition","4-skull danger","Local patrols differ from the final objective"],"rumors":["Board the flagship, recover the harbor charter, and defeat its captain on the quarterdeck."],"journey":"Cross the stormbound pirate flagship, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Boss Hunt","Stormbound pirate flagship"],"objectiveReturnText":"Captain of the Black Shoal: contract secured. Return to the guild.","riskExplanation":"4/5 danger: Pirate Captain, Pirate, Harpy.","battleback":"Ship","battlebackFolder":"battlebacks1","intendedLevel":3,"encounterTuning":{}}
```

#### The Giant and the Labyrinth (`fantasy_15`)

```json
{"id":"fantasy_15","name":"The Giant and the Labyrinth","category":"Boss Hunt","durationMinutes":30,"description":"Navigate the giant stone maze and stop its builders from crushing the mountain pass.","risk":"5-skull","skulls":5,"difficulty":"Hard","danger":"Hill Giant / Minotaur / Gargoyle","rewardTypes":["220 Gold","110 Arcana","75 XP per companion"],"encounterType":"Hill Giant / Minotaur / Gargoyle","environment":"Giant-built mountain labyrinth","combatMode":"required","xpReward":75,"rewardGold":{"victory":220,"draw":55,"defeat":0},"rewardArcana":{"victory":110,"draw":27,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Monsters","boss":true,"enemyIds":["hill_giant","minotaur","gargoyle"],"skirmishEnemyIds":["gargoyle","minotaur"],"knownThreats":["Hill Giant","Minotaur","Gargoyle"],"knownConditions":["30-minute expedition","5-skull danger","Local patrols differ from the final objective"],"rumors":["Navigate the giant stone maze and stop its builders from crushing the mountain pass."],"journey":"Cross the giant-built mountain labyrinth, complete the contract, and return to the guild.","chance":"Normal","randomEncounters":[],"tags":["Boss Hunt","Giant-built mountain labyrinth"],"objectiveReturnText":"The Giant and the Labyrinth: contract secured. Return to the guild.","riskExplanation":"5/5 danger: Hill Giant, Minotaur, Gargoyle.","battleback":"RockCave","battlebackFolder":"battlebacks1","intendedLevel":4,"encounterTuning":{}}
```

#### The Unbroken Seal (`ritual_warding`)

```json
{"id":"ritual_warding","name":"The Unbroken Seal","category":"Fieldwork","durationMinutes":5,"intendedLevel":2,"skulls":2,"risk":"2-skull","difficulty":"Normal","description":"Recover the ward seal from a shattered sanctuary. Its stone sentries test whether the guild can carry the seal home intact. Victory unlocks Warding.","danger":"gargoyle / ghost","rewardTypes":["45 Gold","25 Arcana","Unlock: Warding"],"encounterType":"gargoyle / ghost","environment":"Fractured sanctuary","combatMode":"required","xpReward":18,"rewardGold":{"victory":45,"draw":11,"defeat":0},"rewardArcana":{"victory":25,"draw":6,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Altar","boss":false,"enemyIds":["gargoyle","ghost"],"skirmishEnemyIds":["ghost"],"knownThreats":["gargoyle","ghost"],"knownConditions":["Recommended Level 2","Victory unlocks Warding; no Arcana unlock payment","5-minute quest"],"rumors":["Recover the ward seal from a shattered sanctuary. Its stone sentries test whether the guild can carry the seal home intact."],"journey":"Recover the ward seal from a shattered sanctuary. Its stone sentries test whether the guild can carry the seal home intact.","chance":"Normal","randomEncounters":[],"tags":["Ritual","Warding"],"objectiveReturnText":"Warding: the ritual text is secured. Return to camp.","riskExplanation":"Level 2 ritual trial. Recover the ward seal from a shattered sanctuary. Its stone sentries test whether the guild can carry the seal home intact.","battleback":"Temple","battlebackFolder":"battlebacks1","encounterTuning":{},"ritualUnlock":"protection_ward"}
```

#### The Saint's Broken Hands (`ritual_healing`)

```json
{"id":"ritual_healing","name":"The Saint's Broken Hands","category":"Hunt","durationMinutes":10,"intendedLevel":3,"skulls":3,"risk":"3-skull","difficulty":"Hard","description":"Recover the saint’s carved hands from the frozen infirmary, where ghouls have nested among the abandoned surgical beds. Victory unlocks Healing.","danger":"ghoul / ghost / skeleton_1","rewardTypes":["80 Gold","45 Arcana","Unlock: Healing"],"encounterType":"ghoul / ghost / skeleton_1","environment":"Saints infirmary under the ice","combatMode":"required","xpReward":32,"rewardGold":{"victory":80,"draw":20,"defeat":0},"rewardArcana":{"victory":45,"draw":11,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Altar","boss":false,"enemyIds":["ghoul","ghost","skeleton_1"],"skirmishEnemyIds":["ghoul","skeleton_1"],"knownThreats":["ghoul","ghost","skeleton 1"],"knownConditions":["Recommended Level 3","Victory unlocks Healing; no Arcana unlock payment","10-minute quest"],"rumors":["Recover the saint’s carved hands from the frozen infirmary, where ghouls have nested among the abandoned surgical beds."],"journey":"Recover the saint’s carved hands from the frozen infirmary, where ghouls have nested among the abandoned surgical beds.","chance":"Normal","randomEncounters":[],"tags":["Ritual","Healing"],"objectiveReturnText":"Healing: the ritual text is secured. Return to camp.","riskExplanation":"Level 3 ritual trial. Recover the saint’s carved hands from the frozen infirmary, where ghouls have nested among the abandoned surgical beds.","battleback":"IceCave","battlebackFolder":"battlebacks1","encounterTuning":{},"ritualUnlock":"healing_ritual"}
```

#### The Gilded Tithe (`ritual_greed`)

```json
{"id":"ritual_greed","name":"The Gilded Tithe","category":"Hunt","durationMinutes":5,"intendedLevel":2,"skulls":2,"risk":"2-skull","difficulty":"Normal","description":"Reclaim a golden tithe scale from a claim-jumping prospector and the scavengers looting the old mint. Victory unlocks Greed Prayer.","danger":"ratman / dwarf_prospector","rewardTypes":["45 Gold","25 Arcana","Unlock: Greed Prayer"],"encounterType":"ratman / dwarf_prospector","environment":"Abandoned mint","combatMode":"required","xpReward":18,"rewardGold":{"victory":45,"draw":11,"defeat":0},"rewardArcana":{"victory":25,"draw":6,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Altar","boss":false,"enemyIds":["ratman","dwarf_prospector"],"skirmishEnemyIds":["ratman"],"knownThreats":["ratman","dwarf prospector"],"knownConditions":["Recommended Level 2","Victory unlocks Greed Prayer; no Arcana unlock payment","5-minute quest"],"rumors":["Reclaim a golden tithe scale from a claim-jumping prospector and the scavengers looting the old mint."],"journey":"Reclaim a golden tithe scale from a claim-jumping prospector and the scavengers looting the old mint.","chance":"Normal","randomEncounters":[],"tags":["Ritual","Greed Prayer"],"objectiveReturnText":"Greed Prayer: the ritual text is secured. Return to camp.","riskExplanation":"Level 2 ritual trial. Reclaim a golden tithe scale from a claim-jumping prospector and the scavengers looting the old mint.","battleback":"Cobblestones2","battlebackFolder":"battlebacks1","encounterTuning":{},"ritualUnlock":"greed_prayer"}
```

#### Names Beneath the Ossuary (`ritual_reanimate`)

```json
{"id":"ritual_reanimate","name":"Names Beneath the Ossuary","category":"Boss Hunt","durationMinutes":20,"intendedLevel":4,"skulls":4,"risk":"4-skull","difficulty":"Hard","description":"Find the stolen names of the guild’s dead and defeat the necromancer binding them beneath the ossuary. Victory unlocks Reanimate.","danger":"necromancer / ghoul / gargoyle","rewardTypes":["140 Gold","80 Arcana","Unlock: Reanimate"],"encounterType":"necromancer / ghoul / gargoyle","environment":"Ossuary of forgotten names","combatMode":"required","xpReward":56,"rewardGold":{"victory":140,"draw":35,"defeat":0},"rewardArcana":{"victory":80,"draw":20,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Altar","boss":true,"enemyIds":["necromancer","ghoul","gargoyle"],"skirmishEnemyIds":["ghoul","gargoyle"],"knownThreats":["necromancer","ghoul","gargoyle"],"knownConditions":["Recommended Level 4","Victory unlocks Reanimate; no Arcana unlock payment","20-minute quest"],"rumors":["Find the stolen names of the guild’s dead and defeat the necromancer binding them beneath the ossuary."],"journey":"Find the stolen names of the guild’s dead and defeat the necromancer binding them beneath the ossuary.","chance":"Normal","randomEncounters":[],"tags":["Ritual","Reanimate"],"objectiveReturnText":"Reanimate: the ritual text is secured. Return to camp.","riskExplanation":"Level 4 ritual trial. Find the stolen names of the guild’s dead and defeat the necromancer binding them beneath the ossuary.","battleback":"Stone3","battlebackFolder":"battlebacks1","encounterTuning":{},"ritualUnlock":"reanimate"}
```

#### The Beggar's Silver Bell (`ritual_fortune`)

```json
{"id":"ritual_fortune","name":"The Beggar's Silver Bell","category":"Fieldwork","durationMinutes":10,"intendedLevel":2,"skulls":2,"risk":"2-skull","difficulty":"Normal","description":"Follow a beggar’s silver bell through ambushes along the pilgrim road and return its scattered clappers to the roadside shrine. Victory unlocks Fortune's Favor.","danger":"gnoll / wolf / kobold","rewardTypes":["70 Gold","40 Arcana","Unlock: Fortune's Favor"],"encounterType":"gnoll / wolf / kobold","environment":"Pilgrims silver-bell road","combatMode":"required","xpReward":28,"rewardGold":{"victory":70,"draw":17,"defeat":0},"rewardArcana":{"victory":40,"draw":10,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Altar","boss":false,"enemyIds":["gnoll","wolf","kobold"],"skirmishEnemyIds":["wolf","kobold"],"knownThreats":["gnoll","wolf","kobold"],"knownConditions":["Recommended Level 2","Victory unlocks Fortune's Favor; no Arcana unlock payment","10-minute quest"],"rumors":["Follow a beggar’s silver bell through ambushes along the pilgrim road and return its scattered clappers to the roadside shrine."],"journey":"Follow a beggar’s silver bell through ambushes along the pilgrim road and return its scattered clappers to the roadside shrine.","chance":"Normal","randomEncounters":[],"tags":["Ritual","Fortune's Favor"],"objectiveReturnText":"Fortune's Favor: the ritual text is secured. Return to camp.","riskExplanation":"Level 2 ritual trial. Follow a beggar’s silver bell through ambushes along the pilgrim road and return its scattered clappers to the roadside shrine.","battleback":"Road3","battlebackFolder":"battlebacks1","encounterTuning":{},"ritualUnlock":"fortunes_favor"}
```

#### The Choir of Rust (`ritual_hymn`)

```json
{"id":"ritual_hymn","name":"The Choir of Rust","category":"Hunt","durationMinutes":15,"intendedLevel":3,"skulls":3,"risk":"3-skull","difficulty":"Hard","description":"Recover three hymn tablets from the garrison chapel. The rusted choir has become a patrol of armed dead. Victory unlocks Battle Hymn.","danger":"skeleton_1 / skeleton_archer_1 / gargoyle","rewardTypes":["105 Gold","60 Arcana","Unlock: Battle Hymn"],"encounterType":"skeleton_1 / skeleton_archer_1 / gargoyle","environment":"Desecrated garrison chapel","combatMode":"required","xpReward":42,"rewardGold":{"victory":105,"draw":26,"defeat":0},"rewardArcana":{"victory":60,"draw":15,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Altar","boss":false,"enemyIds":["skeleton_1","skeleton_archer_1","gargoyle"],"skirmishEnemyIds":["skeleton_1","skeleton_archer_1"],"knownThreats":["skeleton 1","skeleton archer 1","gargoyle"],"knownConditions":["Recommended Level 3","Victory unlocks Battle Hymn; no Arcana unlock payment","15-minute quest"],"rumors":["Recover three hymn tablets from the garrison chapel. The rusted choir has become a patrol of armed dead."],"journey":"Recover three hymn tablets from the garrison chapel. The rusted choir has become a patrol of armed dead.","chance":"Normal","randomEncounters":[],"tags":["Ritual","Battle Hymn"],"objectiveReturnText":"Battle Hymn: the ritual text is secured. Return to camp.","riskExplanation":"Level 3 ritual trial. Recover three hymn tablets from the garrison chapel. The rusted choir has become a patrol of armed dead.","battleback":"Fort1","battlebackFolder":"battlebacks1","encounterTuning":{},"ritualUnlock":"battle_hymn"}
```

#### The Thread Before the Axe (`ritual_mercy`)

```json
{"id":"ritual_mercy","name":"The Thread Before the Axe","category":"Boss Hunt","durationMinutes":25,"intendedLevel":5,"skulls":5,"risk":"5-skull","difficulty":"Hard","description":"Take the last uncut thread from the executioner demon before its servants sever the names stitched into the chamber walls. Victory unlocks Veil of Mercy.","danger":"summoned_demon / wraith / ghoul","rewardTypes":["175 Gold","100 Arcana","Unlock: Veil of Mercy"],"encounterType":"summoned_demon / wraith / ghoul","environment":"Executioners thread chamber","combatMode":"required","xpReward":70,"rewardGold":{"victory":175,"draw":43,"defeat":0},"rewardArcana":{"victory":100,"draw":25,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Altar","boss":true,"enemyIds":["summoned_demon","wraith","ghoul"],"skirmishEnemyIds":["wraith","ghoul"],"knownThreats":["summoned demon","wraith","ghoul"],"knownConditions":["Recommended Level 5","Victory unlocks Veil of Mercy; no Arcana unlock payment","25-minute quest"],"rumors":["Take the last uncut thread from the executioner demon before its servants sever the names stitched into the chamber walls."],"journey":"Take the last uncut thread from the executioner demon before its servants sever the names stitched into the chamber walls.","chance":"Normal","randomEncounters":[],"tags":["Ritual","Veil of Mercy"],"objectiveReturnText":"Veil of Mercy: the ritual text is secured. Return to camp.","riskExplanation":"Level 5 ritual trial. Take the last uncut thread from the executioner demon before its servants sever the names stitched into the chamber walls.","battleback":"DemonCastle1","battlebackFolder":"battlebacks1","encounterTuning":{},"ritualUnlock":"veil_of_mercy"}
```

#### The Ferryman's Last Passenger (`ritual_last_rites`)

```json
{"id":"ritual_last_rites","name":"The Ferryman's Last Passenger","category":"Boss Hunt","durationMinutes":25,"intendedLevel":5,"skulls":5,"risk":"5-skull","difficulty":"Hard","description":"Board the stolen funeral barge, defeat its captain, and bring the ferryman’s final passenger to the burial shore. Victory unlocks Last Rites.","danger":"pirate_captain / ghost / wraith","rewardTypes":["175 Gold","100 Arcana","Unlock: Last Rites"],"encounterType":"pirate_captain / ghost / wraith","environment":"Funeral barge at the black crossing","combatMode":"required","xpReward":70,"rewardGold":{"victory":175,"draw":43,"defeat":0},"rewardArcana":{"victory":100,"draw":25,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Altar","boss":true,"enemyIds":["pirate_captain","ghost","wraith"],"skirmishEnemyIds":["ghost","pirate"],"knownThreats":["pirate captain","ghost","wraith"],"knownConditions":["Recommended Level 5","Victory unlocks Last Rites; no Arcana unlock payment","25-minute quest"],"rumors":["Board the stolen funeral barge, defeat its captain, and bring the ferryman’s final passenger to the burial shore."],"journey":"Board the stolen funeral barge, defeat its captain, and bring the ferryman’s final passenger to the burial shore.","chance":"Normal","randomEncounters":[],"tags":["Ritual","Last Rites"],"objectiveReturnText":"Last Rites: the ritual text is secured. Return to camp.","riskExplanation":"Level 5 ritual trial. Board the stolen funeral barge, defeat its captain, and bring the ferryman’s final passenger to the burial shore.","battleback":"Ship","battlebackFolder":"battlebacks1","encounterTuning":{},"ritualUnlock":"last_rites"}
```

#### The Empty Treasury (`ritual_rebate`)

```json
{"id":"ritual_rebate","name":"The Empty Treasury","category":"Errands","durationMinutes":5,"intendedLevel":2,"skulls":2,"risk":"2-skull","difficulty":"Normal","description":"Retrieve an empty arcane ledger from the counting house. Its binding reveals how to exchange a contract’s coins for Arcana. Victory unlocks Arcane Rebate.","danger":"slime / ratman","rewardTypes":["45 Gold","25 Arcana","Unlock: Arcane Rebate"],"encounterType":"slime / ratman","environment":"Flooded counting house","combatMode":"required","xpReward":18,"rewardGold":{"victory":45,"draw":11,"defeat":0},"rewardArcana":{"victory":25,"draw":6,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Altar","boss":false,"enemyIds":["slime","ratman"],"skirmishEnemyIds":["ratman"],"knownThreats":["slime","ratman"],"knownConditions":["Recommended Level 2","Victory unlocks Arcane Rebate; no Arcana unlock payment","5-minute quest"],"rumors":["Retrieve an empty arcane ledger from the counting house. Its binding reveals how to exchange a contract’s coins for Arcana."],"journey":"Retrieve an empty arcane ledger from the counting house. Its binding reveals how to exchange a contract’s coins for Arcana.","chance":"Normal","randomEncounters":[],"tags":["Ritual","Arcane Rebate"],"objectiveReturnText":"Arcane Rebate: the ritual text is secured. Return to camp.","riskExplanation":"Level 2 ritual trial. Retrieve an empty arcane ledger from the counting house. Its binding reveals how to exchange a contract’s coins for Arcana.","battleback":"Wood2","battlebackFolder":"battlebacks1","encounterTuning":{},"ritualUnlock":"arcane_rebate"}
```

#### The Shieldmaker's Promise (`ritual_vanguard`)

```json
{"id":"ritual_vanguard","name":"The Shieldmaker's Promise","category":"Hunt","durationMinutes":10,"intendedLevel":2,"skulls":2,"risk":"2-skull","difficulty":"Normal","description":"Recover the shieldmaker’s oath plate from raiders holding the ruined hall. The rite strengthens only its chosen bearer. Victory unlocks Oath of the Vanguard.","danger":"kobold / gnoll / gargoyle","rewardTypes":["70 Gold","40 Arcana","Unlock: Oath of the Vanguard"],"encounterType":"kobold / gnoll / gargoyle","environment":"Shieldmakers ruined hall","combatMode":"required","xpReward":28,"rewardGold":{"victory":70,"draw":17,"defeat":0},"rewardArcana":{"victory":40,"draw":10,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Altar","boss":false,"enemyIds":["kobold","gnoll","gargoyle"],"skirmishEnemyIds":["kobold","gnoll"],"knownThreats":["kobold","gnoll","gargoyle"],"knownConditions":["Recommended Level 2","Victory unlocks Oath of the Vanguard; no Arcana unlock payment","10-minute quest"],"rumors":["Recover the shieldmaker’s oath plate from raiders holding the ruined hall. The rite strengthens only its chosen bearer."],"journey":"Recover the shieldmaker’s oath plate from raiders holding the ruined hall. The rite strengthens only its chosen bearer.","chance":"Normal","randomEncounters":[],"tags":["Ritual","Oath of the Vanguard"],"objectiveReturnText":"Oath of the Vanguard: the ritual text is secured. Return to camp.","riskExplanation":"Level 2 ritual trial. Recover the shieldmaker’s oath plate from raiders holding the ruined hall. The rite strengthens only its chosen bearer.","battleback":"Castle2","battlebackFolder":"battlebacks1","encounterTuning":{},"ritualUnlock":"oath_of_vanguard"}
```

#### The Lantern Without a Keeper (`ritual_familiar`)

```json
{"id":"ritual_familiar","name":"The Lantern Without a Keeper","category":"Fieldwork","durationMinutes":15,"intendedLevel":3,"skulls":3,"risk":"3-skull","difficulty":"Hard","description":"Bring a keeperless spirit lantern out of the crystal shrine while false lights and bats crowd the path. Victory unlocks Familiar's Vigil.","danger":"will_o_wisp / ghost / giant_bat","rewardTypes":["105 Gold","60 Arcana","Unlock: Familiar's Vigil"],"encounterType":"will_o_wisp / ghost / giant_bat","environment":"Keeperless crystal lantern shrine","combatMode":"required","xpReward":42,"rewardGold":{"victory":105,"draw":26,"defeat":0},"rewardArcana":{"victory":60,"draw":15,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Altar","boss":false,"enemyIds":["will_o_wisp","ghost","giant_bat"],"skirmishEnemyIds":["giant_bat","will_o_wisp"],"knownThreats":["will o wisp","ghost","giant bat"],"knownConditions":["Recommended Level 3","Victory unlocks Familiar's Vigil; no Arcana unlock payment","15-minute quest"],"rumors":["Bring a keeperless spirit lantern out of the crystal shrine while false lights and bats crowd the path."],"journey":"Bring a keeperless spirit lantern out of the crystal shrine while false lights and bats crowd the path.","chance":"Normal","randomEncounters":[],"tags":["Ritual","Familiar's Vigil"],"objectiveReturnText":"Familiar's Vigil: the ritual text is secured. Return to camp.","riskExplanation":"Level 3 ritual trial. Bring a keeperless spirit lantern out of the crystal shrine while false lights and bats crowd the path.","battleback":"Crystal","battlebackFolder":"battlebacks1","encounterTuning":{},"ritualUnlock":"familiars_vigil"}
```

#### The Dawn Duel (`ritual_first_strike`)

```json
{"id":"ritual_first_strike","name":"The Dawn Duel","category":"Short","durationMinutes":5,"intendedLevel":2,"skulls":2,"risk":"2-skull","difficulty":"Normal","description":"Recover the dawn duelist’s opening-stance tablet from two challengers occupying the abandoned court. Victory unlocks First Strike.","danger":"pirate / gnoll","rewardTypes":["45 Gold","25 Arcana","Unlock: First Strike"],"encounterType":"pirate / gnoll","environment":"Dawn dueling court","combatMode":"required","xpReward":18,"rewardGold":{"victory":45,"draw":11,"defeat":0},"rewardArcana":{"victory":25,"draw":6,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Altar","boss":false,"enemyIds":["pirate","gnoll"],"skirmishEnemyIds":["pirate"],"knownThreats":["pirate","gnoll"],"knownConditions":["Recommended Level 2","Victory unlocks First Strike; no Arcana unlock payment","5-minute quest"],"rumors":["Recover the dawn duelist’s opening-stance tablet from two challengers occupying the abandoned court."],"journey":"Recover the dawn duelist’s opening-stance tablet from two challengers occupying the abandoned court.","chance":"Normal","randomEncounters":[],"tags":["Ritual","First Strike"],"objectiveReturnText":"First Strike: the ritual text is secured. Return to camp.","riskExplanation":"Level 2 ritual trial. Recover the dawn duelist’s opening-stance tablet from two challengers occupying the abandoned court.","battleback":"Colosseum","battlebackFolder":"battlebacks1","encounterTuning":{},"ritualUnlock":"first_strike"}
```

#### The Twice-Struck Chime (`ritual_quickening`)

```json
{"id":"ritual_quickening","name":"The Twice-Struck Chime","category":"Boss Hunt","durationMinutes":20,"intendedLevel":4,"skulls":4,"risk":"4-skull","difficulty":"Hard","description":"Reach the volcanic belfry and reclaim the twice-struck chime from a wyrmling nesting beneath its bell. Victory unlocks Quickening Prayer.","danger":"wyrmling / gargoyle / kobold","rewardTypes":["140 Gold","80 Arcana","Unlock: Quickening Prayer"],"encounterType":"wyrmling / gargoyle / kobold","environment":"Twice-struck volcanic belfry","combatMode":"required","xpReward":56,"rewardGold":{"victory":140,"draw":35,"defeat":0},"rewardArcana":{"victory":80,"draw":20,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Altar","boss":true,"enemyIds":["wyrmling","gargoyle","kobold"],"skirmishEnemyIds":["kobold","gargoyle"],"knownThreats":["wyrmling","gargoyle","kobold"],"knownConditions":["Recommended Level 4","Victory unlocks Quickening Prayer; no Arcana unlock payment","20-minute quest"],"rumors":["Reach the volcanic belfry and reclaim the twice-struck chime from a wyrmling nesting beneath its bell."],"journey":"Reach the volcanic belfry and reclaim the twice-struck chime from a wyrmling nesting beneath its bell.","chance":"Normal","randomEncounters":[],"tags":["Ritual","Quickening Prayer"],"objectiveReturnText":"Quickening Prayer: the ritual text is secured. Return to camp.","riskExplanation":"Level 4 ritual trial. Reach the volcanic belfry and reclaim the twice-struck chime from a wyrmling nesting beneath its bell.","battleback":"LavaCave","battlebackFolder":"battlebacks1","encounterTuning":{},"ritualUnlock":"quickening_prayer"}
```

#### Embers for the Altar (`ritual_offering`)

```json
{"id":"ritual_offering","name":"Embers for the Altar","category":"Hunt","durationMinutes":15,"intendedLevel":3,"skulls":3,"risk":"3-skull","difficulty":"Hard","description":"Gather the altar’s ember reliquaries from the hag’s caverns. Each guarded reliquary teaches the conversion of battle victories into Arcana. Victory unlocks Arcane Offering.","danger":"swamp_hag / ghoul / will_o_wisp","rewardTypes":["105 Gold","60 Arcana","Unlock: Arcane Offering"],"encounterType":"swamp_hag / ghoul / will_o_wisp","environment":"Ember reliquary caverns","combatMode":"required","xpReward":42,"rewardGold":{"victory":105,"draw":26,"defeat":0},"rewardArcana":{"victory":60,"draw":15,"defeat":0},"bonusRewards":{},"travelSeconds":3,"faction":"Altar","boss":false,"enemyIds":["swamp_hag","ghoul","will_o_wisp"],"skirmishEnemyIds":["ghoul","will_o_wisp"],"knownThreats":["swamp hag","ghoul","will o wisp"],"knownConditions":["Recommended Level 3","Victory unlocks Arcane Offering; no Arcana unlock payment","15-minute quest"],"rumors":["Gather the altar’s ember reliquaries from the hag’s caverns. Each guarded reliquary teaches the conversion of battle victories into Arcana."],"journey":"Gather the altar’s ember reliquaries from the hag’s caverns. Each guarded reliquary teaches the conversion of battle victories into Arcana.","chance":"Normal","randomEncounters":[],"tags":["Ritual","Arcane Offering"],"objectiveReturnText":"Arcane Offering: the ritual text is secured. Return to camp.","riskExplanation":"Level 3 ritual trial. Gather the altar’s ember reliquaries from the hag’s caverns. Each guarded reliquary teaches the conversion of battle victories into Arcana.","battleback":"RockCave","battlebackFolder":"battlebacks1","encounterTuning":{},"ritualUnlock":"arcane_offering"}
```

## 17. Automatic events, leader decisions, dialogue and narrative text

There are eight automatic travel-event definitions and four base decision/event definitions. The automatic route event is seeded and can grant modest coins/Arcana/supplies or an injury/risk flag according to its fields. Some opportunities resolve to a modest outcome automatically in the focus loop; legacy halted-event/continue-or-return helpers remain available. The presence of an interaction/action label does not introduce a player scouting ritual or authorize a quest shortcut.

### All current automatic event definitions

```json
[
  {
    "id": "abandoned_cart",
    "name": "Abandoned Cart",
    "text": "An abandoned cart yields a few scattered coins.",
    "gold": 4
  },
  {
    "id": "medicinal_plants",
    "name": "Medicinal Plants",
    "text": "Useful medicinal plants are gathered beside the trail.",
    "supply": "potion"
  },
  {
    "id": "cold_shrine",
    "name": "Cold Shrine",
    "text": "A cold roadside shrine offers a faint arcane trace.",
    "arcana": 3,
    "gainChance": 0.8
  },
  {
    "id": "disturbed_tracks",
    "name": "Disturbed Tracks",
    "text": "Fresh tracks warn that something small may be nearby.",
    "minorEncounterRisk": true
  },
  {
    "id": "fallen_pack",
    "name": "Fallen Pack",
    "text": "A fallen pack contains a small useful find.",
    "gold": 5,
    "supply": "potion",
    "gainChance": 0.5
  },
  {
    "id": "safe_shortcut",
    "name": "Safe Shortcut",
    "text": "A safer route changes the scenery, but not the expedition schedule."
  },
  {
    "id": "distant_cries",
    "name": "Distant Cries",
    "text": "Distant cries suggest danger beyond the party's route.",
    "minorEncounterRisk": true
  },
  {
    "id": "empty_campsite",
    "name": "Empty Campsite",
    "text": "An empty campsite is still warm, but nothing useful remains."
  }
]
```

### All base event/outcome definitions

```json
[
  {
    "id": "random_hidden_stash",
    "name": "Hidden Stash",
    "interactionId": "sealed_lock",
    "danger": "A concealed cache may be trapped or claimed by bandits.",
    "outcomes": {
      "force_lock": {
        "text": "The party forces the cache and takes what it can carry.",
        "gold": 8
      },
      "mark_lock": {
        "text": "The party marks the cache and continues safely."
      },
      "empty_cache": {
        "text": "The party carefully empties the hidden cache.",
        "gold": 12
      },
      "trace_passage": {
        "text": "The cache contains a minor arcane clue.",
        "arcana": 1
      },
      "default": {
        "text": "The hidden stash is left undisturbed."
      }
    }
  },
  {
    "id": "random_rune",
    "name": "Ancient Rune",
    "interactionId": "arcane_scroll",
    "danger": "Unstable magic surrounds an old roadside rune.",
    "outcomes": {
      "unleash": {
        "text": "The rune releases a burst of useful arcane energy.",
        "arcana": 2
      },
      "seal": {
        "text": "The rune is sealed before it can harm anyone.",
        "arcana": 1
      },
      "extract": {
        "text": "Fragments of the rune are recovered for sale.",
        "gold": 8
      },
      "study": {
        "text": "Careful study reveals an arcane secret.",
        "arcana": 2
      },
      "default": {
        "text": "The rune fades before it can be understood."
      }
    }
  },
  {
    "id": "random_caravan",
    "name": "Passing Caravan",
    "interactionId": "perilous_route",
    "danger": "A stranded caravan offers opportunity, but the road is exposed.",
    "outcomes": {
      "charge": {
        "text": "The party clears the dangerous road and earns a reward.",
        "gold": 8
      },
      "detour": {
        "text": "The caravan is guided around the danger safely.",
        "gold": 5
      },
      "loot": {
        "text": "Abandoned cargo is recovered from the roadside.",
        "gold": 10
      },
      "scout": {
        "text": "Scouting reveals a safer route and a small cache.",
        "gold": 6
      },
      "default": {
        "text": "The caravan moves on without incident."
      }
    }
  },
  {
    "id": "random_swimming",
    "name": "River Crossing",
    "interactionId": "perilous_route",
    "danger": "A swift river offers a shortcut with uncertain footing.",
    "outcomes": {
      "charge": {
        "text": "The party powers through the current and reaches the far bank."
      },
      "detour": {
        "text": "The party takes a slower but safe crossing."
      },
      "loot": {
        "text": "Something valuable is recovered from the shallows.",
        "gold": 6
      },
      "scout": {
        "text": "A hidden ford and an old rune are discovered.",
        "arcana": 1
      },
      "default": {
        "text": "The party crosses without finding anything unusual."
      }
    }
  }
]
```

### Interaction tags and autonomous decision definitions

```json
{
  "tags": {
    "barbarian": [
      "force",
      "intimidation"
    ],
    "knight": [
      "force",
      "protection"
    ],
    "rogue": [
      "locks",
      "stealth"
    ],
    "mage": [
      "arcane"
    ],
    "mystic": [
      "arcane",
      "ritual"
    ],
    "duelist": [
      "locks",
      "stealth"
    ],
    "skirmisher": [
      "traps",
      "stealth"
    ],
    "ranger": [
      "traps",
      "wilderness"
    ],
    "vanguard": [
      "force",
      "intimidation"
    ],
    "bruiser": [
      "force",
      "intimidation"
    ],
    "guardian": [
      "force",
      "protection"
    ],
    "brawler": [
      "force",
      "intimidation"
    ],
    "cleric": [
      "ritual",
      "care"
    ],
    "support": [
      "care"
    ],
    "bard": [
      "influence",
      "lore"
    ],
    "worker": [
      "labor",
      "repair",
      "carrying",
      "gathering"
    ]
  },
  "definitions": {
    "arcane_scroll": {
      "id": "arcane_scroll",
      "name": "Unstable Arcane Scroll",
      "requiredTags": [
        "arcane"
      ],
      "failure": "No eligible Mage or arcane specialist can decipher the scroll.",
      "actions": [
        {
          "id": "unleash",
          "name": "Unleash its power",
          "aligns": "take_risks",
          "traits": [
            "reckless"
          ]
        },
        {
          "id": "seal",
          "name": "Seal it safely",
          "aligns": "avoid_risks",
          "traits": [
            "disciplined",
            "cautious"
          ]
        },
        {
          "id": "extract",
          "name": "Extract its valuables",
          "aligns": "greed",
          "traits": [
            "greedy"
          ]
        },
        {
          "id": "study",
          "name": "Study its mysteries",
          "aligns": "exploration",
          "traits": [
            "curious"
          ]
        }
      ]
    },
    "perilous_route": {
      "id": "perilous_route",
      "name": "Perilous Route",
      "requiredTags": [],
      "actions": [
        {
          "id": "charge",
          "name": "Take the dangerous shortcut",
          "aligns": "take_risks",
          "traits": [
            "reckless"
          ]
        },
        {
          "id": "detour",
          "name": "Choose the protected road",
          "aligns": "avoid_risks",
          "traits": [
            "cautious"
          ]
        },
        {
          "id": "loot",
          "name": "Search the abandoned wagons",
          "aligns": "greed",
          "traits": [
            "greedy"
          ]
        },
        {
          "id": "scout",
          "name": "Explore the hidden trail",
          "aligns": "exploration",
          "traits": [
            "curious"
          ]
        }
      ]
    },
    "sealed_lock": {
      "id": "sealed_lock",
      "name": "Smuggler's Sealed Lock",
      "requiredTags": [
        "locks"
      ],
      "failure": "The party cannot identify a safe way through the lock and leaves it sealed.",
      "actions": [
        {
          "id": "force_lock",
          "name": "Risk forcing the mechanism",
          "aligns": "take_risks",
          "traits": [
            "reckless"
          ]
        },
        {
          "id": "mark_lock",
          "name": "Mark it and move on",
          "aligns": "avoid_risks",
          "traits": [
            "cautious"
          ]
        },
        {
          "id": "empty_cache",
          "name": "Empty the hidden cache",
          "aligns": "greed",
          "traits": [
            "greedy"
          ]
        },
        {
          "id": "trace_passage",
          "name": "Trace the concealed passage",
          "aligns": "exploration",
          "traits": [
            "curious"
          ]
        }
      ]
    },
    "collapsed_causeway": {
      "id": "collapsed_causeway",
      "name": "Collapsed Causeway",
      "requiredTags": [
        "labor"
      ],
      "failure": "Without a skilled laborer, the party cannot safely move the fallen stone and abandons the opportunity.",
      "actions": [
        {
          "id": "brace_crossing",
          "name": "Brace a dangerous crossing",
          "aligns": "take_risks",
          "traits": [
            "reckless"
          ]
        },
        {
          "id": "repair_road",
          "name": "Repair a safe route",
          "aligns": "avoid_risks",
          "traits": [
            "disciplined",
            "cautious"
          ]
        },
        {
          "id": "salvage_stone",
          "name": "Salvage the road crew's cache",
          "aligns": "greed",
          "traits": [
            "greedy"
          ]
        },
        {
          "id": "excavate_marker",
          "name": "Excavate the buried waystone",
          "aligns": "exploration",
          "traits": [
            "curious"
          ]
        }
      ]
    }
  }
}
```

### Narrative coverage

Own quest pools: 41; own notes: 820; shared notes: 20. Own travel text must be <=180 characters; shared text <=120. Selection begins at a stable seeded offset then cycles through unused-index counters by context. Shared flavor is appended every fourth selected own note when a matching theme/general pool exists. No own pool means null, so a new quest can have long quiet gaps despite having a unique description.

| Missing own travel pool | Quest name |
| --- | --- |
| hunt_hobgoblin | Broken Banner Escort |
| hunt_wraith | The Bellkeeper’s Rest |
| hunt_harpy | Cliffside Rescue |
| hunt_troll | Bridge Toll Tyrant |
| hunt_imp | Seal the Ember Rift |
| fantasy_01 | The Cistern Has Teeth |
| fantasy_02 | Lanterns for the Lost |
| fantasy_03 | The Last Ore Cart |
| fantasy_04 | Bell Tower at Dusk |
| fantasy_05 | Wolves at the Tollgate |
| fantasy_06 | The Rooftop Reliquary |
| fantasy_07 | Tracks in the Reedbeds |
| fantasy_08 | A Map of False Stars |
| fantasy_09 | The Orchard That Walked |
| fantasy_10 | Feathers in the Honey |
| fantasy_11 | Carrion at the Icehouse |
| fantasy_12 | Eyes Beneath the Sand |
| fantasy_13 | The Cinder Nursery |
| fantasy_14 | Captain of the Black Shoal |
| fantasy_15 | The Giant and the Labyrinth |
| ritual_warding | The Unbroken Seal |
| ritual_healing | The Saint's Broken Hands |
| ritual_greed | The Gilded Tithe |
| ritual_reanimate | Names Beneath the Ossuary |
| ritual_fortune | The Beggar's Silver Bell |
| ritual_hymn | The Choir of Rust |
| ritual_mercy | The Thread Before the Axe |
| ritual_last_rites | The Ferryman's Last Passenger |
| ritual_rebate | The Empty Treasury |
| ritual_vanguard | The Shieldmaker's Promise |
| ritual_familiar | The Lantern Without a Keeper |
| ritual_first_strike | The Dawn Duel |
| ritual_quickening | The Twice-Struck Chime |
| ritual_offering | Embers for the Altar |

The full current dialogue catalogue, all 820 own narrative entries and shared text are in `docs/Handoff_Runtime_Snapshot_20261017.json` and the companion source ZIP. This file includes representative text and the exact selector rather than claiming every long-session line was re-authored for the new quests.

```json
{
  "representativeOwnPool": [
    "gather_medicinal_herbs",
    [
      {
        "id": "gather_medicinal_herbs:0",
        "context": "travel",
        "text": "On the Gather Medicinal Herbs route, the companions settle into a pace everyone can keep."
      },
      {
        "id": "gather_medicinal_herbs:1",
        "context": "travel",
        "text": "The Gather Medicinal Herbs map stays close at hand as the party checks the next turn."
      },
      {
        "id": "gather_medicinal_herbs:2",
        "context": "travel",
        "text": "Packs creak softly on the way through Gather Medicinal Herbs; nobody hurries beyond sight."
      },
      {
        "id": "gather_medicinal_herbs:3",
        "context": "travel",
        "text": "Along Gather Medicinal Herbs, the companions leave enough room to watch their footing."
      },
      {
        "id": "gather_medicinal_herbs:4",
        "context": "travel",
        "text": "The party pauses on the Gather Medicinal Herbs route to check straps and share the map."
      },
      {
        "id": "gather_medicinal_herbs:5",
        "context": "travel",
        "text": "A measured pace carries the companions farther along the Gather Medicinal Herbs trail."
      },
      {
        "id": "gather_medicinal_herbs:6",
        "context": "travel",
        "text": "The Gather Medicinal Herbs journey grows quieter as everyone watches the way ahead."
      },
      {
        "id": "gather_medicinal_herbs:7",
        "context": "travel",
        "text": "On the approach through Gather Medicinal Herbs, the party checks how far remains to walk."
      },
      {
        "id": "gather_medicinal_herbs:8",
        "context": "travel",
        "text": "The companions compare the Gather Medicinal Herbs landmarks with their route notes."
      },
      {
        "id": "gather_medicinal_herbs:9",
        "context": "travel",
        "text": "Before continuing through Gather Medicinal Herbs, the party makes sure everyone is ready."
      },
      {
        "id": "gather_medicinal_herbs:10",
        "context": "travel",
        "text": "A leaf sketch keeps lookalikes out of the sack."
      },
      {
        "id": "gather_medicinal_herbs:11",
        "context": "travel",
        "text": "The party leaves the youngest shoots untouched."
      },
      {
        "id": "gather_medicinal_herbs:12",
        "context": "travel",
        "text": "Clean cloth waits for the fragile herb cuttings."
      },
      {
        "id": "gather_medicinal_herbs:13",
        "context": "travel",
        "text": "The scent of crushed thyme follows the trail."
      },
      {
        "id": "gather_medicinal_herbs:14",
        "context": "travel",
        "text": "A watering can rests beside the medicinal beds."
      },
      {
        "id": "gather_medicinal_herbs:15",
        "context": "travel",
        "text": "Clouds briefly shade the gathering ground."
      },
      {
        "id": "gather_medicinal_herbs:16",
        "context": "travel",
        "text": "The old herb marker is nearly swallowed by moss."
      },
      {
        "id": "gather_medicinal_herbs:17",
        "context": "travel",
        "text": "A garden snail claims right of way."
      },
      {
        "id": "gather_medicinal_herbs:18",
        "context": "travel",
        "text": "The apothecary asked for roots with their soil."
      },
      {
        "id": "gather_medicinal_herbs:19",
        "context": "return",
        "text": "The Gather Medicinal Herbs expedition turns toward home; the journal will keep its account."
      }
    ]
  ],
  "shared": [
    {
      "id": "shared:0",
      "theme": "road",
      "context": "travel",
      "text": "The road gives the party a moment to check their straps."
    },
    {
      "id": "shared:1",
      "theme": "road",
      "context": "travel",
      "text": "A milestone offers a useful place to compare the map."
    },
    {
      "id": "shared:2",
      "theme": "road",
      "context": "travel",
      "text": "The verge is bright with small seasonal flowers."
    },
    {
      "id": "shared:3",
      "theme": "road",
      "context": "travel",
      "text": "A wagon rut guides the party around a muddy patch."
    },
    {
      "id": "shared:4",
      "theme": "forest",
      "context": "travel",
      "text": "Leaves whisper above the trail."
    },
    {
      "id": "shared:5",
      "theme": "forest",
      "context": "travel",
      "text": "A squirrel watches from the safety of a high branch."
    },
    {
      "id": "shared:6",
      "theme": "forest",
      "context": "travel",
      "text": "The shade smells of fern and rain."
    },
    {
      "id": "shared:7",
      "theme": "forest",
      "context": "travel",
      "text": "A sunbeam briefly warms the path."
    },
    {
      "id": "shared:8",
      "theme": "stone",
      "context": "travel",
      "text": "Old masonry keeps the air pleasantly cool."
    },
    {
      "id": "shared:9",
      "theme": "stone",
      "context": "travel",
      "text": "A mason left a small signature in the stone."
    },
    {
      "id": "shared:10",
      "theme": "stone",
      "context": "travel",
      "text": "The party checks the worn edge of the next step."
    },
    {
      "id": "shared:11",
      "theme": "stone",
      "context": "travel",
      "text": "A little moss has softened the oldest stonework."
    },
    {
      "id": "shared:12",
      "theme": "survey",
      "context": "travel",
      "text": "Someone straightens a bent page in the field book."
    },
    {
      "id": "shared:13",
      "theme": "survey",
      "context": "travel",
      "text": "The map gains another careful pencil mark."
    },
    {
      "id": "shared:14",
      "theme": "survey",
      "context": "travel",
      "text": "A spare ribbon marks the next observation point."
    },
    {
      "id": "shared:15",
      "theme": "survey",
      "context": "travel",
      "text": "The party compares their notes before continuing."
    },
    {
      "id": "shared:16",
      "theme": "general",
      "context": "travel",
      "text": "A loose buckle earns a moment of attention."
    },
    {
      "id": "shared:17",
      "theme": "general",
      "context": "travel",
      "text": "The companions keep one another in sight."
    },
    {
      "id": "shared:18",
      "theme": "general",
      "context": "travel",
      "text": "A short pause settles the pace of the journey."
    },
    {
      "id": "shared:19",
      "theme": "general",
      "context": "travel",
      "text": "The guild crest catches a little light."
    }
  ],
  "dialogue": {
    "signature": "This is my moment!",
    "fall": "I can't keep fighting...",
    "victory": "We held the field. Let's get everyone home.",
    "defeat": "The party can fight no further. Check the report for injuries.",
    "draw": "Neither side broke through. Time to regroup.",
    "characters": {
      "ada": "Stand behind me. I'll break their line!",
      "bram": "Let's shake the ground beneath them!",
      "cora": "One clear shot. That's all I need.",
      "dax": "An opening! Try to keep up.",
      "elin": "Steady, everyone. Dawn is on our side.",
      "finn": "Storm, answer me!",
      "gwen": "Hold fast. They won't move us!",
      "hale": "Their guard is open. Now!",
      "iris": "Even the moon knows when to strike.",
      "jory": "Hear that thunder? Here it comes!",
      "enemy_slime": "Gluuurp!",
      "enemy_skeleton": "Rattle... crack!",
      "enemy_goblin": "Too slow! My turn!"
    },
    "events": {
      "attack": "{move}! Stay on your feet, {target}.",
      "signature": "This is my moment!",
      "allyFalls": "Hold on, {ally}. We will get you home.",
      "defeat": "I can't keep fighting...",
      "death": "Remember me, friends.",
      "victory": "We held the field. Let's get everyone home.",
      "departure": "Ready, friends? We leave together.",
      "return": "Back home. Time to tend our wounds.",
      "draw": "Neither side broke through. Time to regroup."
    },
    "classes": {
      "barbarian": {
        "attack": {
          "text": "Here comes {move}!",
          "requires": [
            "move"
          ]
        },
        "signature": {
          "text": "Let's shake the ground beneath them!",
          "requires": []
        }
      },
      "knight": {
        "attack": {
          "text": "Keep your guard up, {target}.",
          "requires": [
            "target"
          ]
        },
        "signature": {
          "text": "Stand behind me. I'll break their line!",
          "requires": []
        }
      },
      "ranger": {
        "attack": {
          "text": "I have my mark, {target}.",
          "requires": [
            "target"
          ]
        },
        "signature": {
          "text": "One clear shot. That's all I need.",
          "requires": []
        }
      },
      "rogue": {
        "attack": {
          "text": "Keep your guard up, {target}.",
          "requires": [
            "target"
          ]
        },
        "signature": {
          "text": "An opening! Try to keep up.",
          "requires": []
        }
      },
      "mage": {
        "attack": {
          "text": "I have my mark, {target}.",
          "requires": [
            "target"
          ]
        },
        "signature": {
          "text": "Storm, answer me!",
          "requires": []
        }
      },
      "cleric": {
        "attack": {
          "text": "I have my mark, {target}.",
          "requires": [
            "target"
          ]
        },
        "signature": {
          "text": "Light, guide this strike.",
          "requires": []
        }
      }
    },
    "bondedAllyFalls": {
      "text": "Stay with me, {ally}. We have fought too far together.",
      "requires": [
        "ally"
      ]
    },
    "expedition": {
      "barbarian": {
        "travel": [
          "Set a steady pace. We have to walk back, too.",
          "Pass me the heavier pack if your shoulders tire."
        ],
        "clue": [
          "A trail mark. Someone passed here.",
          "A clue by the roadside. Worth a closer look."
        ],
        "battleStart": [
          "Danger ahead. Here we go.",
          "Company ahead. Find your footing."
        ],
        "battleEnd": [
          "Encounter over. Check on everyone.",
          "Catch your breath. The road is still waiting."
        ],
        "ability": [
          "Time for my special trick.",
          "A practiced move, right on cue."
        ],
        "attack": [
          "Making an opening. Watch my step.",
          "A quick strike. Keep the pressure steady."
        ],
        "hit": [
          "That one hurt. Still here.",
          "Ouch. Better mind the next blow."
        ],
        "nearMiss": [
          "That went wide. Lucky footwork.",
          "A close one. Keep moving."
        ],
        "supplies": [
          "Supplies tucked away. A welcome find.",
          "A useful little find beside the trail."
        ],
        "return": [
          "Homeward, then. Keep a little strength for the last stretch.",
          "A warm fire sounds better with every step."
        ]
      },
      "knight": {
        "travel": [
          "Stay within sight. I will watch the next turn.",
          "Let us check the route before we press on."
        ],
        "clue": [
          "A trail mark. Someone passed here.",
          "A clue by the roadside. Worth a closer look."
        ],
        "battleStart": [
          "Danger ahead. Here we go.",
          "Company ahead. Find your footing."
        ],
        "battleEnd": [
          "Encounter over. Check on everyone.",
          "Catch your breath. The road is still waiting."
        ],
        "ability": [
          "Time for my special trick.",
          "A practiced move, right on cue."
        ],
        "attack": [
          "Making an opening. Watch my step.",
          "A quick strike. Keep the pressure steady."
        ],
        "hit": [
          "That one hurt. Still here.",
          "Ouch. Better mind the next blow."
        ],
        "nearMiss": [
          "That went wide. Lucky footwork.",
          "A close one. Keep moving."
        ],
        "supplies": [
          "Supplies tucked away. A welcome find.",
          "A useful little find beside the trail."
        ],
        "return": [
          "Keep together until we reach camp.",
          "The return route is our next task."
        ]
      },
      "ranger": {
        "travel": [
          "Watch the ground ahead; a quiet path still needs care.",
          "I will check the way. Keep the packs close."
        ],
        "clue": [
          "A trail mark. Someone passed here.",
          "A clue by the roadside. Worth a closer look."
        ],
        "battleStart": [
          "Danger ahead. Here we go.",
          "Company ahead. Find your footing."
        ],
        "battleEnd": [
          "Encounter over. Check on everyone.",
          "Catch your breath. The road is still waiting."
        ],
        "ability": [
          "Time for my special trick.",
          "A practiced move, right on cue."
        ],
        "attack": [
          "Making an opening. Watch my step.",
          "A quick strike. Keep the pressure steady."
        ],
        "hit": [
          "That one hurt. Still here.",
          "Ouch. Better mind the next blow."
        ],
        "nearMiss": [
          "That went wide. Lucky footwork.",
          "A close one. Keep moving."
        ],
        "supplies": [
          "Supplies tucked away. A welcome find.",
          "A useful little find beside the trail."
        ],
        "return": [
          "We can retrace our route from here.",
          "Keep the same steady pace on the way home."
        ]
      },
      "rogue": {
        "travel": [
          "I prefer a route with a little room to step aside.",
          "Quiet feet save a surprising amount of trouble."
        ],
        "clue": [
          "A trail mark. Someone passed here.",
          "A clue by the roadside. Worth a closer look."
        ],
        "battleStart": [
          "Danger ahead. Here we go.",
          "Company ahead. Find your footing."
        ],
        "battleEnd": [
          "Encounter over. Check on everyone.",
          "Catch your breath. The road is still waiting."
        ],
        "ability": [
          "Time for my special trick.",
          "A practiced move, right on cue."
        ],
        "attack": [
          "Making an opening. Watch my step.",
          "A quick strike. Keep the pressure steady."
        ],
        "hit": [
          "That one hurt. Still here.",
          "Ouch. Better mind the next blow."
        ],
        "nearMiss": [
          "That went wide. Lucky footwork.",
          "A close one. Keep moving."
        ],
        "supplies": [
          "Supplies tucked away. A welcome find.",
          "A useful little find beside the trail."
        ],
        "return": [
          "Home sounds like a sensible destination.",
          "Let us keep our eyes open on the return, too."
        ]
      },
      "mage": {
        "travel": [
          "A quick look at the map, then we carry on.",
          "I can ponder the old stones while we walk."
        ],
        "clue": [
          "A trail mark. Someone passed here.",
          "A clue by the roadside. Worth a closer look."
        ],
        "battleStart": [
          "Danger ahead. Here we go.",
          "Company ahead. Find your footing."
        ],
        "battleEnd": [
          "Encounter over. Check on everyone.",
          "Catch your breath. The road is still waiting."
        ],
        "ability": [
          "Time for my special trick.",
          "A practiced move, right on cue."
        ],
        "attack": [
          "Making an opening. Watch my step.",
          "A quick strike. Keep the pressure steady."
        ],
        "hit": [
          "That one hurt. Still here.",
          "Ouch. Better mind the next blow."
        ],
        "nearMiss": [
          "That went wide. Lucky footwork.",
          "A close one. Keep moving."
        ],
        "supplies": [
          "Supplies tucked away. A welcome find.",
          "A useful little find beside the trail."
        ],
        "return": [
          "I will put the field notes in order at camp.",
          "The next mystery can wait until we are home."
        ]
      },
      "cleric": {
        "travel": [
          "Say if you need a slower pace. We can keep together.",
          "A sip of water before the next stretch?"
        ],
        "clue": [
          "A trail mark. Someone passed here.",
          "A clue by the roadside. Worth a closer look."
        ],
        "battleStart": [
          "Danger ahead. Here we go.",
          "Company ahead. Find your footing."
        ],
        "battleEnd": [
          "Encounter over. Check on everyone.",
          "Catch your breath. The road is still waiting."
        ],
        "ability": [
          "Time for my special trick.",
          "A practiced move, right on cue."
        ],
        "attack": [
          "Making an opening. Watch my step.",
          "A quick strike. Keep the pressure steady."
        ],
        "hit": [
          "That one hurt. Still here.",
          "Ouch. Better mind the next blow."
        ],
        "nearMiss": [
          "That went wide. Lucky footwork.",
          "A close one. Keep moving."
        ],
        "supplies": [
          "Supplies tucked away. A welcome find.",
          "A useful little find beside the trail."
        ],
        "return": [
          "Take your time. We will reach camp together.",
          "There will be time to rest once we are home."
        ]
      }
    },
    "legacyClasses": {
      "vanguard": {
        "attack": {
          "text": "Keep your guard up, {target}.",
          "requires": [
            "target"
          ]
        },
        "signature": {
          "text": "Stand behind me. I'll break their line!",
          "requires": []
        }
      },
      "bruiser": {
        "attack": {
          "text": "Here comes {move}!",
          "requires": [
            "move"
          ]
        },
        "signature": {
          "text": "Let's shake the ground beneath them!",
          "requires": []
        }
      },
      "ranger": {
        "attack": {
          "text": "I have my mark, {target}.",
          "requires": [
            "target"
          ]
        },
        "signature": {
          "text": "One clear shot. That's all I need.",
          "requires": []
        }
      },
      "duelist": {
        "attack": {
          "text": "Keep your guard up, {target}.",
          "requires": [
            "target"
          ]
        },
        "signature": {
          "text": "An opening! Try to keep up.",
          "requires": []
        }
      },
      "support": {
        "attack": {
          "text": "Here comes {move}!",
          "requires": [
            "move"
          ]
        },
        "signature": {
          "text": "Steady, everyone. Dawn is on our side.",
          "requires": []
        }
      },
      "mage": {
        "attack": {
          "text": "I have my mark, {target}.",
          "requires": [
            "target"
          ]
        },
        "signature": {
          "text": "Storm, answer me!",
          "requires": []
        }
      },
      "guardian": {
        "attack": {
          "text": "Keep your guard up, {target}.",
          "requires": [
            "target"
          ]
        },
        "signature": {
          "text": "Hold fast. They won't move us!",
          "requires": []
        }
      },
      "skirmisher": {
        "attack": {
          "text": "Here comes {move}!",
          "requires": [
            "move"
          ]
        },
        "signature": {
          "text": "Their guard is open. Now!",
          "requires": []
        }
      },
      "mystic": {
        "attack": {
          "text": "I have my mark, {target}.",
          "requires": [
            "target"
          ]
        },
        "signature": {
          "text": "Even the moon knows when to strike.",
          "requires": []
        }
      },
      "brawler": {
        "attack": {
          "text": "Keep your guard up, {target}.",
          "requires": [
            "target"
          ]
        },
        "signature": {
          "text": "Hear that thunder? Here it comes!",
          "requires": []
        }
      },
      "bard": {
        "attack": {
          "text": "Here comes {move}!",
          "requires": [
            "move"
          ]
        },
        "signature": {
          "text": "Hear our resolve!",
          "requires": []
        }
      },
      "cleric": {
        "attack": {
          "text": "I have my mark, {target}.",
          "requires": [
            "target"
          ]
        },
        "signature": {
          "text": "Light, guide this strike.",
          "requires": []
        }
      }
    }
  }
}
```

## 18. Rendering, art, backgrounds, sound and performance

The visual direction is a cozy blue/parchment/gold hamlet with illustrated chibi figures displayed as tabletop miniatures on wooden bases. Battle and travel renderers isolate sprite frames before scaling/rotation, anchor at feet rather than weapon bounds, and keep damage counters/captions outside clipped figure lanes. Small rocking/hop motions use saved event progress rather than creating new simulation outcomes.

Living art: six portrait atlases, twelve walking sheets, 96 individual combat sheets and class/sex fallen sheets. Skeleton v7: twelve class/sex portrait atlases, twelve walking sheets, twelve fallen sheets and 96 combat sheets, mapped by the original portrait key. The skeleton validator checked 96 unique portraits, 1,152 walking frames, 5,184 combat frames and 96 defeated poses. Source atlas poses include front, side, rear, two stride contacts, attack and defeated; these are reused in standard MZ runtime sheets, not thousands of independently drawn frames.

New enemies use `RPGFantasyEnemies_v6` in pictures/faces with complete connected silhouettes and transparent padding. Harpy uses `RPGHarpy_v6`, copied from the existing stock illustration. Legacy enemies still use older family art where no override exists, so creature variety and visual accuracy are not perfectly uniform across the whole roster.

Each quest stores an explicit battleback/background folder and freezes its choice at departure. Valid folders are battlebacks1, battlebacks2 and pictures; invalid/missing art has woodland/cavern fallbacks. Many new backgrounds are stock floor-style battlebacks stretched as the scene, so a distinct filename is not proof of a bespoke full scenic location. This is a candidate readability/variety polish distinction.

Camp performance was previously improved by caching static scenery and per-direction miniature/base bitmaps, separating labels/cues/fire, updating sprite transforms instead of repainting the full camp contents, reading decoded source pixels instead of GPU canvas readback, skipping hidden work and disposing removed/closed resources. Historical local profiling reported average update CPU falling from 2.90 ms to 0.087 ms and worst update from 790.3 ms to 0.8 ms. Those are dated harness measurements, not a newly measured native FPS guarantee.

Audio has completion/event cues, deduplication keys, pending completion state and a user Alerts toggle. Cues are consumed separately from game consequences; load clears already-seen queues. Camp timer uses Bell1, stops on quest departure and must not replace the expedition clock. Minimize can stop the graphics application while the authoritative mission/camp clock still advances. The optional floating clock is 232×96, frameless/always-on-top in NW.js with saved/clamped monitor position; browser fallback is a compact DOM overlay. It must never become a second simulation timer.

Input propagation between canvas and DOM, native monitor coordinates, focus restoration, sound overlap/comfort, actual controller use, accessibility and long scene-switch soaks remain explicit acceptance areas. Development DEBUG remains in source but developerMode is false in the current UI data.

### Presentation and UI configuration

```json
{
  "presentation": {
    "dialogue": {
      "BATTLE_START": [
        "Stay close. We leave together.",
        "Something heard us coming."
      ],
      "ALLY_TARGETED": [
        "Eyes on me, not them!"
      ],
      "ALLY_WOUNDED": [
        "Still standing."
      ],
      "LOW_HP": [
        "I need a moment-no, I don't have one."
      ],
      "DODGE": [
        "Too slow."
      ],
      "ARMOR_ABSORBS": [
        "That all you have?"
      ],
      "WARD_BREAKS": [
        "The ward is gone!"
      ],
      "SIGNATURE": [
        "Make this count."
      ],
      "BOND_ALLY_DANGER": [
        "You get away from them!"
      ],
      "BOND_ALLY_DEATH": [
        "No. No, get up."
      ],
      "BOSS_START": [
        "That is larger than the report suggested."
      ],
      "ALLY_DEATH": [
        "..."
      ],
      "VICTORY": [
        "Count heads. Then we move."
      ],
      "SOLE_SURVIVOR": [
        "I brought them here."
      ]
    },
    "importance": {
      "NORMAL": {
        "priority": 10,
        "holdMs": 450,
        "color": "#ffffff"
      },
      "INTERESTING": {
        "priority": 20,
        "holdMs": 700,
        "color": "#8edaff"
      },
      "DANGEROUS": {
        "priority": 40,
        "holdMs": 950,
        "color": "#ffd27d"
      },
      "CRITICAL": {
        "priority": 60,
        "holdMs": 1200,
        "color": "#ff9b8e"
      },
      "DEATH": {
        "priority": 100,
        "holdMs": 1500,
        "color": "#ff6f6f"
      },
      "SIGNATURE": {
        "priority": 50,
        "holdMs": 900,
        "color": "#d9a7ff"
      },
      "BOSS": {
        "priority": 70,
        "holdMs": 1100,
        "color": "#ffb070"
      },
      "TRAVEL": {
        "priority": 20,
        "holdMs": 750,
        "color": "#9fe3a4"
      }
    },
    "speedMultipliers": {
      "standard": 1,
      "reduced": 0.45,
      "skip": 0
    },
    "maxDialoguePerBattle": 4,
    "triggerCooldownEvents": 3
  },
  "ui": {
    "developerMode": false,
    "hamlet": {
      "title": "THE HAMLET",
      "subtitle": "A little haven for great adventures",
      "backgroundPicture": "",
      "palette": {
        "sky": "#253c32",
        "ground": "#4b3d30",
        "accent": "#e8c583",
        "panel": "#292c26"
      },
      "locations": [
        {
          "symbol": "roster",
          "name": "Guild Hall",
          "caption": "Roster & careers",
          "icon": 191
        },
        {
          "symbol": "battle",
          "name": "Quest Board",
          "caption": "Contracts & dispatch",
          "icon": 189
        },
        {
          "symbol": "shop",
          "name": "Shop",
          "caption": "Equipment & supplies",
          "icon": 96
        },
        {
          "symbol": "recruit",
          "name": "Tavern",
          "caption": "Free replacements",
          "icon": 75
        },
        {
          "symbol": "altar",
          "name": "Altar",
          "caption": "Rituals & Arcana",
          "icon": 76
        },
        {
          "symbol": "graveyard",
          "name": "Graveyard",
          "caption": "Fallen adventurers",
          "icon": 17
        }
      ]
    },
    "portrait": {
      "largeSize": 144
    },
    "dialogue": {
      "fontSize": 24,
      "minimumLines": 4,
      "waitForInput": true
    }
  }
}
```

### Visual review artifacts

| Artifact | What it shows |
| --- | --- |
| docs/Individual_Skeletons_96_Contact.webp | All 96 current skeleton portraits |
| docs/Skeleton_CLASS_SEX_Contact.webp | Seven extracted poses for each of eight individual variants |
| docs/Playtest_20_Art_Contact.webp | Earlier living model/portrait contact sheet |
| tests/visuals/altar-816-quickening.webp | Current paged altar and effect detail at native-sized viewport |
| tests/visuals/altar-816-reanimation-barred.webp | Permanent reanimation eligibility feedback |
| tests/visuals/fantasy-gear-switch.webp | Gear tab retained on companion switch |
| tests/visuals/fantasy-pirate-boss.webp | Current pirate encounter/background projection |
| docs/Walking_Cycle_Review.html | Historical walking/contact review |
| docs/Camp_Rendering_Performance.md | Dated cache/readback fix evidence |

## 19. Save model, transaction boundaries and migration contract

Persistent manager state is stored under Game_System._rpgManager and serialized through RPG Maker's save/storage system. The handoff uses only a synthetic state made from project templates, never the user's current save.

Important state groups: version and appearance/identity fields; roster/activeSlots; Gold/Arcana/supplies; equipment stock and condition/broken queues; teams/teamIds and compatibility flags; camp job and recovery fractions; ritual unlock version/flags/pending effects; trips and active quest compatibility state; current quest result/replay; history/campaign counters; settled-trip guards; focus window preferences; completion/event cue state.

Trip groups: fixed quest/team identity, leader/order/background/danger/duration; original team metadata and mutable preparedTeam; strict elapsed/remaining/session anchors; stages/index and generated encounter plan; injuries/deaths/fate results; recorded-battle guards; pending finds and authored rewards/XP; active ritual effects/actual battle-win count; battle snapshot/events; presentation queue/current/holds/fighters; warning/campfire/return/retreat/wipe state; acquired/broken gear; chronology/field-note counters.

Authoritative transactions: dispatch validates and snapshots once; battle result records consequences before visual projection; completeReturn/finishQuest pay once using settled guards; recall/early-end retain finds and apply return-scoped effects once; confirmed replacement uses a staged copied state before commit. UI preview/art loading must not mutate any of these.

Migration infers/reconciles active slots, retires overflow/legacy records, returns retired gear once, normalizes inventory queues and removed medkit state, refreshes portraits throughout roster/history/replays, resets load/session anchors and seen sound cues, preserves camp fractions, and migrates paid ritual unlock flags to quest-earned flags once. Newer ritual-earned unlocks persist independently of the rolling 50-entry history.

Important review hazards: changing JSON/metadata can alter new departures while old saved encounter plans retain old values; normalization must be idempotent; snapshot markers must not re-arm consumed rituals at final settlement; skeleton stats/eligibility must not be lost when refreshing appearances; display/replay must not reapply health loss, fate, XP or coins. Do not inspect, reset, copy or distribute personal save files as part of a documentation or balance task.

### Synthetic fresh state: top-level field inventory

| Field | Shape / example |
| --- | --- |
| version | 27 |
| focusTimer | object: enabled, position |
| roster | array(3) |
| gold | 100 |
| arcana | 0 |
| equipmentStock | object: blade, guard, padded_vest, leather_armor, chainmail, plate_armor, leather_cap, iron_helmet, great_helm, buckler, wooden_shield, iron_shield, reinforced_cloak, mage_robes, ward_focus, thick_fur_cloak, life_giving_amulet, mage_hat, cleric_circlet, owl_hood, duelist_hat, sage_crown, scout_band, war_mask, silk_mantle, runic_coat, duelist_vest, hunter_coat, pilgrim_robe, spellbook, parrying_dagger, lantern, thorn_shield, prayer_beads, cat_charm, hawk_charm, moonstone, ruby_pendant, wind_ring |
| teams | object: A, B |
| activeTeam | "A" |
| teamBUnlocked | false |
| orders | object: A, B |
| ritualsUnlocked | object:  |
| ritualUnlockVersion | 1 |
| ritualEffects | object:  |
| campJobs | object: ada, bram, cora |
| campJobElapsed | object:  |
| teamIds | array(3) |
| supplies | object: potion |
| bonds | object:  |
| questCount | 0 |
| nextTripId | 1 |
| activeQuest | null |
| trips | object: A, B |
| settledTrips | object:  |
| recruit | object: generation, deadlineMs, candidates |
| lastReport | null |
| questHistory | array(0) |
| selectedQuestId | "restless_crypt" |
| expeditionReplay | null |
| contractDanger | "standard" |
| presentationSpeed | "standard" |
| currentThreads | array(0) |
| campaignStats | object: questsCompleted, victories, failures, deaths, bossesDefeated, goldRecovered, arcanaDiscovered, legendaryItems |
| recruitGeneration | 0 |
| activeSlots | array(3) |
| completionAlerts | true |

### Complete synthetic example character

```json
{
  "id": "ada",
  "name": "Ada",
  "role": "Knight",
  "level": 1,
  "health": 5,
  "maxHealth": 5,
  "attack": 5,
  "defense": 3,
  "speed": 5,
  "alive": true,
  "passiveTrait": {
    "name": "Steadfast",
    "description": "Holds her ground under pressure.",
    "stat": "defense",
    "rank": 1
  },
  "basicAttack": "Shield Strike",
  "signatureAttack": "Shield Hammer",
  "portrait": {
    "key": "knight:female:default",
    "sheet": "RPGPortrait_knight_v5",
    "index": 8,
    "columns": 8,
    "rows": 2
  },
  "condition": "Healthy",
  "equipment": null,
  "xp": 0,
  "injury": null,
  "injuryExpeditionId": null,
  "quests": 0,
  "deathQuest": null,
  "career": {
    "questsParticipated": 0,
    "questsCompleted": 0,
    "victories": 0,
    "kills": 0,
    "damageDealt": 0,
    "healingDone": 0,
    "signatureUses": 0,
    "bossVictories": 0,
    "injuriesSuffered": 0,
    "badges": [],
    "lastQuest": null
  },
  "classId": "knight",
  "selectedMove": "vanguard_b",
  "sex": "female",
  "race": "human",
  "classAdjustments": {
    "maxHealth": 0,
    "attack": 0,
    "defense": 0,
    "speed": 0
  },
  "portraitKey": "knight:female:default",
  "combatPortrait": {
    "sheet": "RPGCombat_knight_female_0_v5"
  },
  "walkPortrait": {
    "sheet": "RPGWalk_knight_female_v5",
    "index": 0
  },
  "fallenPortrait": {
    "sheet": "RPGFallen_knight_female_v5",
    "index": 0,
    "columns": 4,
    "rows": 2
  },
  "equipment2": null,
  "leadership": 5,
  "personalityTraits": [
    "curious"
  ],
  "foundingMember": true,
  "founder": true,
  "nickname": "",
  "nicknamePrompted": false,
  "lastingInjuries": 0,
  "classArmorMax": 3,
  "classArmor": 3,
  "critChance": 0.05,
  "dodgeChance": 0.05,
  "signatureUnlocks": 0,
  "preferredPosition": "front",
  "dodgeTier": "low",
  "innateWardMax": 0,
  "innateWard": 0,
  "temporaryWard": 0,
  "equipmentSlots": {
    "head": null,
    "body": null,
    "offHand": null,
    "accessory": null
  },
  "equipmentCondition": {},
  "history": {
    "joinedOrder": 1,
    "events": [],
    "questsCompleted": 0,
    "battlesSurvived": 0,
    "kills": 0,
    "deathRollsSurvived": 0,
    "woundsAcquired": 0,
    "leaderships": 0,
    "bossQuests": 0,
    "bondedDeaths": []
  },
  "earnedTraits": [],
  "permanentWounds": [],
  "retired": false,
  "focusGearReturned": false
}
```

### Synthetic departed-trip field inventory

| Field | Shape / example |
| --- | --- |
| id | "trip-1" |
| encounterTuning | object:  |
| lockedBackground | object: name, folder |
| questId | "fantasy_14" |
| questName | "Captain of the Black Shoal" |
| teamKey | "A" |
| leaderId | "ada" |
| leadershipSuccessionCount | 0 |
| boss | true |
| phase | "travel" |
| deadlineMs | 4000 |
| outboundMs | 3000 |
| xp | object: partySize, basePerMember, openSlotBonus, totalCap, rawPerMember, perMember, bonusPerMember, total, capped |
| rewardGold | object: victory, draw, defeat |
| rewardArcana | object: victory, draw, defeat |
| team | array(3) |
| preparedTeam | array(3) |
| order | "exploration" |
| strategy | "Tactical" |
| signatureUses | object:  |
| decision | null |
| battleSnapshot | null |
| battleEvents | array(0) |
| stages | array(2) |
| stageIndex | 0 |
| stageStartedAt | 1000 |
| stageDurationMs | 3000 |
| outboundTotalMs | 3000 |
| outboundElapsedMs | 0 |
| pendingRewards | object: gold, arcana |
| chronicle | array(0) |
| expeditionInjuries | object:  |
| expeditionDeaths | object:  |
| deathSaveResults | object:  |
| contractDanger | "standard" |
| abandoned | false |
| skulls | 4 |
| difficulty | "Hard" |
| risk | "4-skull" |
| bonusRewards | object:  |
| rewardTypes | array(3) |
| combatMode | "required" |
| objectiveReturnText | "Captain of the Black Shoal: contract secured. Return to the guild." |
| minorEncounterEnemyIds | array(0) |
| realtime | true |
| returnNarrated | false |
| durationMinutes | 20 |
| totalDurationMs | 1200000 |
| remainingMs | 1200000 |
| elapsedMs | 0 |
| sessionLastAt | null |
| lastProgressAtMs | null |
| latestEvent | "The expedition departed camp." |
| timeline | array(1) |
| milestones | object: travelEvent, encounter, battle, return |
| lockedPlan | object: questId, teamIds, leaderId, order, contractDanger, difficulty, durationMinutes |
| ritualEffects | object:  |
| ritualBattlesWon | 0 |
| encounterPlan | array(13) |
| flavorCount | 1 |
| flavorUsed | object: ada:travel |
| presentationQueue | array(1) |

Full synthetic fresh state and a departed pirate-boss trip are preserved in the runtime snapshot JSON. These are generated examples, not personal gameplay records.

## 20. Fresh balance audit: method, broad curves and ritual comparisons

New audit date: October 17, 2026. 5400 baseline sessions = 75 quests × levels 1/3/5/8 × no/ordinary/strong gear × two compositions × three seeds. 1800 additional sessions = 900 same-seed baseline/blessed pairs across ten queued rituals, three representative routes, levels 3/5/8, two compositions and five seeds. All runs start fresh; this does not simulate a continuing campaign, camp downtime or recovery costs. Zero recorded timer/extraction/campfire safety violations in the baseline. Runtime: 185.29 seconds on the local audit host.

```json
{
  "baseline": "Every runtime quest × levels 1/3/5/8 × none/ordinary/strong gear × two compositions × three seeds; each session starts fresh with full HP/Armor/innate Ward. No ritual in baseline. Five-second simulation steps; presentation consumed by deterministic deadline fallback.",
  "compositions": [
    [
      "knight",
      "barbarian",
      "ranger"
    ],
    [
      "rogue",
      "mage",
      "cleric"
    ]
  ],
  "gear": {
    "none": "No equipment",
    "ordinary": "Least expensive compatible Head and Body items",
    "strong": "Highest-price compatible item in each supported slot"
  },
  "ritual": "Paired same-seed ordinary-gear runs for ten queued ritual effects, three levels, two compositions, five seeds, and the short/ghoul-hunt/pirate-boss contracts. Immediate healing/revival/exchange rituals are described and unit-tested separately.",
  "ritualQuestIds": [
    "fantasy_02",
    "fantasy_11",
    "fantasy_14"
  ],
  "limitations": [
    "Only two compositions; duplicate-class parties and party-order permutations are not covered.",
    "Only three seeds per baseline composition; strata have six observations, not statistically precise win-rate estimates.",
    "Gear is supplied for free in audit setup; quest rewards are not acquisition-cost-adjusted profit.",
    "No repeated-campaign attrition, resting downtime or human choices are modeled.",
    "No user saves are read or written.",
    "Balanced-looking aggregate results can conceal individual quest/class problems.",
    "No native hardware, monitor, audio or long soak acceptance is implied."
  ],
  "metricNotes": {
    "signatureEvents": "Counts primary signature-labelled attack/heal/support events, including enemies and class support. It is not the per-player special-use ledger.",
    "wounds": "Counts returning members whose final condition is Wounded; not the number of permanent wound titles acquired.",
    "clear": "Final victory and no automatic retreat; a clear can still contain casualties.",
    "gold": "Coins actually settled; no equipment acquisition cost is deducted.",
    "arcana": "Arcana settled after activation; subtract activationCost to calculate the ritual run’s activation-adjusted Arcana return."
  }
}
```

Clear = final victory without automatic retreat; a clear can contain deaths/wounds. Death/wound columns are per-run member counts, not binary casualty probabilities. Strong gear is gifted in setup; its acquisition cost is not subtracted from quest income. Percentage strata have different quest counts and tiny per-quest seed samples. Compare like-for-like strata and inspect individual contracts.

| Danger / level / gear | Runs | Clear % | Deaths/run | Wounded/run | Wipe % | Retreat % | Battles/run | Gold/run | Arcana/run | Breaks/run |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 skull / L1 / none | 96 | 97.9% | 0.07 | 0.04 | 2.1% | 0.0% | 2.27 | 71.45 | 56.34 | 0.00 |
| 1 skull / L1 / ordinary | 96 | 99.0% | 0.01 | 0.04 | 1.0% | 0.0% | 2.31 | 74.31 | 58.69 | 0.04 |
| 1 skull / L1 / strong | 96 | 100.0% | 0.00 | 0.00 | 0.0% | 0.0% | 2.31 | 77.75 | 61.50 | 0.00 |
| 1 skull / L3 / none | 96 | 99.0% | 0.03 | 0.03 | 1.0% | 0.0% | 2.31 | 74.31 | 58.69 | 0.00 |
| 1 skull / L3 / ordinary | 96 | 100.0% | 0.02 | 0.01 | 0.0% | 0.0% | 2.31 | 77.75 | 61.50 | 0.00 |
| 1 skull / L3 / strong | 96 | 100.0% | 0.00 | 0.00 | 0.0% | 0.0% | 2.31 | 77.75 | 61.50 | 0.00 |
| 1 skull / L5 / none | 96 | 100.0% | 0.00 | 0.00 | 0.0% | 0.0% | 2.31 | 77.75 | 61.50 | 0.00 |
| 1 skull / L5 / ordinary | 96 | 100.0% | 0.00 | 0.00 | 0.0% | 0.0% | 2.31 | 77.75 | 61.50 | 0.00 |
| 1 skull / L5 / strong | 96 | 100.0% | 0.00 | 0.00 | 0.0% | 0.0% | 2.31 | 77.75 | 61.50 | 0.00 |
| 1 skull / L8 / none | 96 | 100.0% | 0.00 | 0.00 | 0.0% | 0.0% | 2.31 | 77.75 | 61.50 | 0.00 |
| 1 skull / L8 / ordinary | 96 | 100.0% | 0.00 | 0.00 | 0.0% | 0.0% | 2.31 | 77.75 | 61.50 | 0.00 |
| 1 skull / L8 / strong | 96 | 100.0% | 0.00 | 0.00 | 0.0% | 0.0% | 2.31 | 77.75 | 61.50 | 0.00 |
| 2 skull / L1 / none | 96 | 68.8% | 0.57 | 0.52 | 26.0% | 5.2% | 4.80 | 56.29 | 39.50 | 0.00 |
| 2 skull / L1 / ordinary | 96 | 87.5% | 0.25 | 0.25 | 10.4% | 2.1% | 5.17 | 73.77 | 51.79 | 0.01 |
| 2 skull / L1 / strong | 96 | 100.0% | 0.00 | 0.00 | 0.0% | 0.0% | 5.46 | 105.65 | 78.56 | 0.00 |
| 2 skull / L3 / none | 96 | 88.5% | 0.26 | 0.35 | 11.5% | 0.0% | 5.40 | 74.50 | 52.21 | 0.00 |
| 2 skull / L3 / ordinary | 96 | 96.9% | 0.17 | 0.10 | 3.1% | 0.0% | 5.46 | 94.14 | 68.82 | 0.03 |
| 2 skull / L3 / strong | 96 | 100.0% | 0.00 | 0.00 | 0.0% | 0.0% | 5.46 | 105.65 | 78.56 | 0.00 |
| 2 skull / L5 / none | 96 | 99.0% | 0.15 | 0.10 | 1.0% | 0.0% | 5.46 | 103.61 | 76.84 | 0.00 |
| 2 skull / L5 / ordinary | 96 | 100.0% | 0.01 | 0.02 | 0.0% | 0.0% | 5.46 | 105.65 | 78.56 | 0.03 |
| 2 skull / L5 / strong | 96 | 100.0% | 0.00 | 0.00 | 0.0% | 0.0% | 5.46 | 105.65 | 78.56 | 0.00 |
| 2 skull / L8 / none | 96 | 99.0% | 0.07 | 0.10 | 1.0% | 0.0% | 5.46 | 103.61 | 76.84 | 0.00 |
| 2 skull / L8 / ordinary | 96 | 100.0% | 0.01 | 0.00 | 0.0% | 0.0% | 5.46 | 105.65 | 78.56 | 0.02 |
| 2 skull / L8 / strong | 96 | 100.0% | 0.00 | 0.00 | 0.0% | 0.0% | 5.46 | 105.65 | 78.56 | 0.00 |
| 3 skull / L1 / none | 102 | 11.8% | 1.28 | 1.17 | 66.7% | 21.6% | 4.60 | 18.99 | 13.90 | 0.00 |
| 3 skull / L1 / ordinary | 102 | 35.3% | 1.14 | 1.01 | 62.7% | 2.0% | 6.43 | 45.58 | 31.84 | 0.12 |
| 3 skull / L1 / strong | 102 | 89.2% | 0.21 | 0.16 | 9.8% | 1.0% | 8.60 | 126.39 | 93.69 | 0.00 |
| 3 skull / L3 / none | 102 | 47.1% | 1.00 | 0.90 | 51.0% | 2.0% | 6.76 | 59.92 | 42.55 | 0.00 |
| 3 skull / L3 / ordinary | 102 | 65.7% | 0.61 | 0.70 | 27.5% | 6.9% | 7.23 | 78.44 | 55.34 | 0.06 |
| 3 skull / L3 / strong | 102 | 100.0% | 0.05 | 0.02 | 0.0% | 0.0% | 8.82 | 164.63 | 126.82 | 0.00 |
| 3 skull / L5 / none | 102 | 67.6% | 0.63 | 0.65 | 28.4% | 3.9% | 7.49 | 89.17 | 64.16 | 0.00 |
| 3 skull / L5 / ordinary | 102 | 85.3% | 0.25 | 0.34 | 8.8% | 5.9% | 8.06 | 123.60 | 91.87 | 0.09 |
| 3 skull / L5 / strong | 102 | 100.0% | 0.00 | 0.00 | 0.0% | 0.0% | 8.82 | 164.63 | 126.82 | 0.00 |
| 3 skull / L8 / none | 102 | 80.4% | 0.53 | 0.36 | 18.6% | 1.0% | 8.02 | 108.60 | 79.18 | 0.00 |
| 3 skull / L8 / ordinary | 102 | 88.2% | 0.25 | 0.24 | 7.8% | 3.9% | 8.44 | 130.51 | 97.56 | 0.09 |
| 3 skull / L8 / strong | 102 | 100.0% | 0.00 | 0.00 | 0.0% | 0.0% | 8.82 | 164.63 | 126.82 | 0.00 |
| 4 skull / L1 / none | 84 | 3.6% | 1.38 | 1.43 | 89.3% | 7.1% | 3.29 | 12.79 | 10.89 | 0.00 |
| 4 skull / L1 / ordinary | 84 | 3.6% | 1.39 | 1.33 | 81.0% | 15.5% | 4.82 | 12.79 | 11.00 | 0.12 |
| 4 skull / L1 / strong | 84 | 50.0% | 0.76 | 0.79 | 44.0% | 6.0% | 8.74 | 101.37 | 71.19 | 0.00 |
| 4 skull / L3 / none | 84 | 8.3% | 1.12 | 1.39 | 71.4% | 20.2% | 5.60 | 29.07 | 25.32 | 0.00 |
| 4 skull / L3 / ordinary | 84 | 19.0% | 1.26 | 1.19 | 71.4% | 9.5% | 7.00 | 48.62 | 38.86 | 0.14 |
| 4 skull / L3 / strong | 84 | 65.5% | 0.57 | 0.50 | 29.8% | 4.8% | 9.81 | 116.89 | 83.25 | 0.00 |
| 4 skull / L5 / none | 84 | 25.0% | 0.96 | 1.14 | 59.5% | 15.5% | 6.82 | 58.52 | 43.67 | 0.00 |
| 4 skull / L5 / ordinary | 84 | 33.3% | 1.01 | 0.94 | 56.0% | 10.7% | 7.96 | 66.27 | 48.95 | 0.12 |
| 4 skull / L5 / strong | 84 | 78.6% | 0.23 | 0.42 | 16.7% | 4.8% | 10.26 | 152.31 | 114.50 | 0.00 |
| 4 skull / L8 / none | 84 | 29.8% | 1.00 | 1.08 | 61.9% | 8.3% | 7.89 | 65.23 | 49.39 | 0.00 |
| 4 skull / L8 / ordinary | 84 | 47.6% | 0.83 | 0.90 | 47.6% | 4.8% | 8.80 | 90.98 | 67.43 | 0.13 |
| 4 skull / L8 / strong | 84 | 86.9% | 0.18 | 0.26 | 11.9% | 1.2% | 10.58 | 170.52 | 130.57 | 0.00 |
| 5 skull / L1 / none | 72 | 4.2% | 1.25 | 1.61 | 93.1% | 2.8% | 2.75 | 15.89 | 14.33 | 0.00 |
| 5 skull / L1 / ordinary | 72 | 4.2% | 1.31 | 1.39 | 79.2% | 16.7% | 4.18 | 16.06 | 14.46 | 0.07 |
| 5 skull / L1 / strong | 72 | 23.6% | 1.11 | 1.14 | 62.5% | 13.9% | 9.75 | 62.22 | 44.72 | 0.00 |
| 5 skull / L3 / none | 72 | 5.6% | 1.39 | 1.35 | 84.7% | 9.7% | 4.81 | 21.56 | 19.14 | 0.00 |
| 5 skull / L3 / ordinary | 72 | 8.3% | 1.44 | 1.19 | 83.3% | 8.3% | 6.54 | 32.22 | 28.63 | 0.13 |
| 5 skull / L3 / strong | 72 | 48.6% | 0.81 | 0.82 | 47.2% | 4.2% | 11.78 | 116.54 | 87.40 | 0.00 |
| 5 skull / L5 / none | 72 | 13.9% | 1.25 | 1.25 | 75.0% | 11.1% | 7.00 | 43.08 | 34.46 | 0.00 |
| 5 skull / L5 / ordinary | 72 | 18.1% | 1.32 | 1.08 | 66.7% | 15.3% | 8.03 | 48.93 | 37.99 | 0.15 |
| 5 skull / L5 / strong | 72 | 66.7% | 0.46 | 0.65 | 30.6% | 2.8% | 12.90 | 167.74 | 133.21 | 0.01 |
| 5 skull / L8 / none | 72 | 12.5% | 1.36 | 1.21 | 83.3% | 4.2% | 7.74 | 41.33 | 33.25 | 0.00 |
| 5 skull / L8 / ordinary | 72 | 19.4% | 1.33 | 1.11 | 75.0% | 5.6% | 9.01 | 55.21 | 42.39 | 0.19 |
| 5 skull / L8 / strong | 72 | 76.4% | 0.40 | 0.36 | 22.2% | 1.4% | 13.24 | 207.32 | 168.63 | 0.01 |

### Paired ritual results, aggregated across the three sampled routes and levels

| Ritual | Valid pairs | Rejected casts | Base clear % | With rite % | Death delta/run | Gold delta/run | Arcana net delta/run | Battle delta/run |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Warding | 90 | 0 | 82.2% | 84.4% | -0.02 | 2.53 | -33.73 | 0.03 |
| Fortune's Favor | 45 | 45 | 97.8% | 97.8% | 0.00 | 25.16 | -30.00 | 0.00 |
| Battle Hymn | 90 | 0 | 82.2% | 83.3% | -0.08 | 0.42 | -59.79 | 0.03 |
| Veil of Mercy | 90 | 0 | 82.2% | 85.6% | -0.20 | 3.80 | -98.10 | 0.04 |
| Arcane Rebate | 90 | 0 | 82.2% | 82.2% | 0.00 | -79.71 | 25.00 | 0.00 |
| Oath of the Vanguard | 90 | 0 | 82.2% | 83.3% | 0.01 | 0.84 | -24.58 | 0.00 |
| Familiar's Vigil | 90 | 0 | 82.2% | 84.4% | -0.02 | 2.53 | -43.73 | 0.03 |
| First Strike | 90 | 0 | 82.2% | 82.2% | -0.07 | 0.00 | -30.00 | 0.01 |
| Quickening Prayer | 90 | 0 | 82.2% | 83.3% | -0.06 | 1.69 | -64.16 | 0.08 |
| Arcane Offering | 90 | 0 | 82.2% | 82.2% | 0.00 | 0.00 | 39.44 | 0.00 |

These are paired outcome diagnostics, not causal isolation of every modifier: a changed battle can change subsequent RNG consumption, target selection, survival, retreat and which encounters happen. Resource deltas include changed quest outcomes as well as the explicit ritual effect. A Fortune cast is rejected in sampled compositions with no Ward to sacrifice; those pairs are excluded from its averages and reported separately. The baseline run is duplicated per ritual to preserve pairing. Immediate Healing/Greed/Reanimate/Last Rites are covered by explicit mechanics and unit/browser acceptance rather than forced into an unrelated damage-buff metric.

### Quest-level observed payout per minute at L3 / ordinary gear

| Quest | Min | Skulls | Clear % (n=6) | Actual Gold/min | Actual Arcana/min | Battles/run |
| --- | --- | --- | --- | --- | --- | --- |
| Gather Medicinal Herbs | 1 | 1 | 100.0% | 3.00 | 0.00 | 0.00 |
| Carry a Message to the Watch | 1 | 1 | 100.0% | 3.00 | 0.00 | 0.00 |
| Collect Grave Moss | 3 | 2 | 100.0% | 13.56 | 11.00 | 1.33 |
| Search the Old Road | 3 | 3 | 100.0% | 15.00 | 13.00 | 2.00 |
| Guard the Woodcutters | 3 | 1 | 100.0% | 11.00 | 9.33 | 1.33 |
| Goblin Tracks | 5 | 3 | 100.0% | 15.27 | 13.00 | 3.00 |
| Escort the Apothecary | 5 | 2 | 100.0% | 13.27 | 11.00 | 1.00 |
| Clear the Cellar | 5 | 1 | 100.0% | 11.27 | 9.00 | 2.00 |
| Salvage the Abandoned Cart | 5 | 1 | 100.0% | 11.27 | 9.40 | 2.00 |
| Abandoned Shrine | 10 | 2 | 100.0% | 13.13 | 11.00 | 6.00 |
| Spider Nest | 10 | 4 | 0.0% | 0.08 | 0.00 | 2.83 |
| Patrol the Cemetery | 10 | 3 | 0.0% | 0.00 | 0.00 | 5.00 |
| Recover the Stolen Ledger | 10 | 5 | 0.0% | 0.00 | 0.00 | 1.67 |
| The Broken Watchtower | 10 | 4 | 0.0% | 0.07 | 0.00 | 2.83 |
| The Sunken Crypt | 15 | 5 | 0.0% | 0.00 | 0.00 | 5.33 |
| Orc Warcamp | 15 | 5 | 0.0% | 0.18 | 0.00 | 6.67 |
| Necromancer's Tower | 15 | 4 | 0.0% | 0.00 | 0.00 | 3.83 |
| The Black Gate | 15 | 5 | 0.0% | 0.09 | 0.00 | 3.83 |
| Watchpost at Dusk | 3 | 5 | 0.0% | 0.44 | 0.33 | 2.00 |
| The Lantern Index | 25 | 1 | 100.0% | 11.05 | 9.00 | 4.67 |
| Survey of the Old Aqueduct | 25 | 3 | 0.0% | 0.03 | 0.02 | 5.50 |
| The Herbarium Circuit | 30 | 3 | 0.0% | 0.07 | 0.00 | 7.50 |
| An Evening at the Observatory | 30 | 5 | 0.0% | 0.00 | 0.02 | 4.17 |
| Roadside Scouts | 1 | 1 | 100.0% | 3.00 | 0.00 | 0.00 |
| Red Banner Lookout | 1 | 1 | 100.0% | 3.00 | 0.00 | 0.00 |
| The Silken Crossing | 5 | 5 | 0.0% | 0.00 | 0.00 | 1.17 |
| Field Map Survey | 10 | 1 | 100.0% | 11.00 | 9.00 | 4.00 |
| Wayside Lantern Round | 15 | 1 | 100.0% | 11.00 | 9.00 | 5.33 |
| Cemetery Boundary Watch | 15 | 3 | 0.0% | 0.00 | 0.00 | 5.83 |
| Deep Crypt Vigil | 25 | 5 | 0.0% | 0.00 | 0.00 | 5.33 |
| Long Lantern Circuit | 30 | 1 | 100.0% | 11.09 | 9.00 | 5.67 |
| Ash Road Sentries | 3 | 4 | 0.0% | 0.00 | 0.00 | 2.00 |
| Thornbank Trail | 5 | 4 | 16.7% | 2.83 | 2.50 | 2.17 |
| Wayside Reliquary | 15 | 2 | 100.0% | 13.09 | 11.00 | 8.00 |
| Birchwater Samples | 25 | 2 | 83.3% | 10.89 | 9.21 | 15.00 |
| Moonlit Barrow | 25 | 4 | 0.0% | 0.00 | 0.00 | 4.17 |
| Meadow Cartography | 30 | 2 | 66.7% | 8.76 | 7.33 | 17.00 |
| Ridge Signal Fires | 30 | 4 | 0.0% | 0.00 | 0.02 | 2.67 |
| Brookside Escort | 3 | 1 | 100.0% | 11.44 | 9.33 | 2.00 |
| Millstream Watch | 5 | 3 | 100.0% | 15.27 | 13.00 | 3.00 |
| Orchard Trackers | 10 | 1 | 100.0% | 11.30 | 9.00 | 6.00 |
| Broken Banner Escort | 20 | 3 | 66.7% | 10.00 | 8.72 | 12.00 |
| The Bellkeeper’s Rest | 20 | 4 | 50.0% | 8.58 | 7.55 | 11.00 |
| Cliffside Rescue | 20 | 5 | 100.0% | 19.00 | 17.10 | 14.00 |
| Bridge Toll Tyrant | 20 | 3 | 100.0% | 15.07 | 13.00 | 13.00 |
| Seal the Ember Rift | 20 | 4 | 100.0% | 17.15 | 15.00 | 13.00 |
| The Cistern Has Teeth | 1 | 1 | 100.0% | 3.00 | 0.00 | 0.00 |
| Lanterns for the Lost | 5 | 2 | 100.0% | 9.20 | 4.60 | 3.00 |
| The Last Ore Cart | 15 | 3 | 83.3% | 6.33 | 3.23 | 9.00 |
| Bell Tower at Dusk | 3 | 1 | 100.0% | 8.67 | 4.33 | 2.00 |
| Wolves at the Tollgate | 5 | 2 | 100.0% | 9.20 | 4.60 | 3.00 |
| The Rooftop Reliquary | 10 | 3 | 100.0% | 8.40 | 4.20 | 7.00 |
| Tracks in the Reedbeds | 3 | 1 | 100.0% | 8.67 | 4.33 | 2.00 |
| A Map of False Stars | 10 | 2 | 100.0% | 7.60 | 3.80 | 6.00 |
| The Orchard That Walked | 25 | 4 | 0.0% | 0.00 | 0.00 | 9.83 |
| Feathers in the Honey | 5 | 2 | 100.0% | 9.20 | 4.60 | 3.00 |
| Carrion at the Icehouse | 15 | 3 | 50.0% | 3.89 | 1.90 | 9.00 |
| Eyes Beneath the Sand | 20 | 4 | 16.7% | 1.27 | 0.63 | 9.83 |
| The Cinder Nursery | 10 | 3 | 100.0% | 8.40 | 4.20 | 7.00 |
| Captain of the Black Shoal | 20 | 4 | 33.3% | 2.62 | 1.32 | 11.67 |
| The Giant and the Labyrinth | 30 | 5 | 0.0% | 0.04 | 0.00 | 14.67 |
| The Unbroken Seal | 5 | 2 | 100.0% | 9.00 | 5.00 | 3.00 |
| The Saint's Broken Hands | 10 | 3 | 100.0% | 8.00 | 4.60 | 7.00 |
| The Gilded Tithe | 5 | 2 | 100.0% | 9.27 | 5.00 | 3.00 |
| Names Beneath the Ossuary | 20 | 4 | 33.3% | 2.40 | 1.33 | 11.00 |
| The Beggar's Silver Bell | 10 | 2 | 100.0% | 7.00 | 4.10 | 6.00 |
| The Choir of Rust | 15 | 3 | 100.0% | 7.00 | 4.00 | 9.00 |
| The Thread Before the Axe | 25 | 5 | 0.0% | 0.00 | 0.00 | 9.00 |
| The Ferryman's Last Passenger | 25 | 5 | 0.0% | 0.00 | 0.00 | 10.67 |
| The Empty Treasury | 5 | 2 | 100.0% | 9.00 | 5.00 | 3.00 |
| The Shieldmaker's Promise | 10 | 2 | 100.0% | 7.00 | 4.00 | 6.00 |
| The Lantern Without a Keeper | 15 | 3 | 66.7% | 4.84 | 2.67 | 9.00 |
| The Dawn Duel | 5 | 2 | 100.0% | 9.27 | 5.00 | 3.00 |
| The Twice-Struck Chime | 20 | 4 | 16.7% | 1.23 | 0.72 | 11.17 |
| Embers for the Altar | 15 | 3 | 50.0% | 3.50 | 2.00 | 9.00 |

Compare those payouts with the class-dependent camp rate (up to 12 Gold or Arcana/minute for three specialized camp members) and include XP, unlocks, risk, injuries, potions, repair cost, lost level investment and enjoyment. A quiet quest need not beat camp coin production to be useful, but the intended value proposition should be deliberate.

## 21. Test coverage, failures and acceptance evidence

Fresh complete Node inventory: **53 files, 610 passed assertions, 123 failed assertions, 0 timeouts**. Files were each launched in a separate Node process using --test-isolation=none, preventing cross-file configuration contamination. **20 files passed completely; 33 failed.** Includes historical suites, so this is a technical-debt map rather than a release pass/fail count against a single agreed specification.

The immediately preceding focused altar/current-mechanics run had 197/198 checks passing; its lone failure was the unchanged old XP-threshold assertion. The new full historical survey is intentionally broader and finds more failures. Do not repeat the focused count as if it covered every historical suite. All 18 altar tests pass in the fresh inventory.

| Test file | Pass | Fail | Exit / timeout |
| --- | --- | --- | --- |
| tests/altar_rituals.test.js | 18 | 0 | 0 |
| tests/battlefield_status_icons.test.js | 2 | 0 | 0 |
| tests/camp_rendering_performance.test.js | 3 | 0 | 0 |
| tests/complete_battle_sequence.test.js | 4 | 1 | 1 |
| tests/coordinated_sprint.test.js | 15 | 2 | 1 |
| tests/day2_simulation.test.js | 7 | 8 | 1 |
| tests/day3_balance.test.js | 0 | 1 | 1 |
| tests/day3_progression.test.js | 0 | 9 | 1 |
| tests/day4_strategy.test.js | 0 | 0 | 0 |
| tests/day5_loop.test.js | 0 | 6 | 1 |
| tests/death_stabilization.test.js | 6 | 0 | 0 |
| tests/dm_playtest_revision.test.js | 1 | 4 | 1 |
| tests/dm_simulator.test.js | 2 | 4 | 1 |
| tests/fantasy_expansion.test.js | 6 | 0 | 0 |
| tests/figurine_rendering.test.js | 6 | 0 | 0 |
| tests/focus_companion.test.js | 11 | 1 | 1 |
| tests/illustrated_travel.test.js | 4 | 1 | 1 |
| tests/item_persistence.test.js | 5 | 0 | 0 |
| tests/mission_background_clock.test.js | 5 | 0 | 0 |
| tests/next_playtest.test.js | 13 | 0 | 0 |
| tests/oct16.test.js | 49 | 14 | 1 |
| tests/party_leader_succession.test.js | 3 | 1 | 1 |
| tests/playtest20.test.js | 59 | 18 | 1 |
| tests/polish_tuning.test.js | 6 | 0 | 0 |
| tests/pomodoro_focus.test.js | 12 | 1 | 1 |
| tests/pomodoro_sprint.test.js | 12 | 0 | 0 |
| tests/post_sprint_fixes.test.js | 10 | 1 | 1 |
| tests/quest_followup.test.js | 55 | 0 | 0 |
| tests/quest_window_polish.test.js | 3 | 0 | 0 |
| tests/readability_progression.test.js | 9 | 4 | 1 |
| tests/recoverable_errors.test.js | 4 | 0 | 0 |
| tests/review.test.js | 104 | 1 | 1 |
| tests/roster_revision.test.js | 0 | 5 | 1 |
| tests/small_roster_rework.test.js | 5 | 2 | 1 |
| tests/sprint2.test.js | 15 | 2 | 1 |
| tests/stage1_battle.test.js | 0 | 2 | 1 |
| tests/stage1_camp_home.test.js | 5 | 0 | 0 |
| tests/stage1_next_sprint.test.js | 2 | 3 | 1 |
| tests/stage2_identity.test.js | 3 | 4 | 1 |
| tests/stage2_next_sprint.test.js | 5 | 1 | 1 |
| tests/stage2_realtime_loop.test.js | 7 | 1 | 1 |
| tests/stage2_strategy_ai.test.js | 4 | 0 | 0 |
| tests/stage3_careers.test.js | 0 | 5 | 1 |
| tests/stage3_catalogue.test.js | 5 | 1 | 1 |
| tests/stage3_expeditions.test.js | 1 | 5 | 1 |
| tests/stage3_quests.test.js | 0 | 5 | 1 |
| tests/stage4_realtime_presentation.test.js | 6 | 0 | 0 |
| tests/stage4_timers.test.js | 0 | 4 | 1 |
| tests/stage5_acceptance.test.js | 0 | 4 | 1 |
| tests/stage5_equipment_repair.test.js | 5 | 0 | 0 |
| tests/strict_focus_sprint.test.js | 90 | 1 | 1 |
| tests/tabletop_revision.test.js | 12 | 1 | 1 |
| tests/visual_battle_stage.test.js | 11 | 0 | 0 |

### All failing test titles (for triage; do not assume they are all defects)

#### tests/complete_battle_sequence.test.js

- ✖ initial snapshot and copied log drive replay once; arrival and replay load never resimulate or settle twice

#### tests/coordinated_sprint.test.js

- ✖ injuries continue weakening initiative after Dodge reaches zero, without compounding on repeated preparation
- ✖ XP milestones are 30/120/360 cumulative with cap four retained

#### tests/day2_simulation.test.js

- ✖ the shipped enemy team has three NPCs using the roster schema
- ✖ targeting spreads each side's attacks across all living opponents
- ✖ Signature Attack opens each fighter's first turn, with three Basic Attacks before reuse
- ✖ defense cannot reduce damage below one and overkill clamps health and logged damage
- ✖ player elimination gives the correct result and terminal steps do nothing
- ✖ enemy elimination gives the correct result and terminal steps do nothing
- ✖ invalid teams and unusable NPC data are rejected before simulation
- ✖ all 120 roster combinations across three seeds finish with legal actions and readable events

#### tests/day3_balance.test.js

- ✖ starter encounter has no knockouts or injuries across 3600 fresh-team battles

#### tests/day3_progression.test.js

- ✖ participation affects only the selected three; applying a result twice is harmless
- ✖ two quests level up, improve traits, and bond surviving pairs without stacking bonuses
- ✖ first knockout wounds, next wounded knockout kills permanently and prunes the team
- ✖ low-HP survivors are wounded; Potions do not treat injuries; Medkits do
- ✖ finite supplies clamp HP and reject invalid use without spending items
- ✖ fatigue changes battle stats only; insufficient stamina blocks quests and rest never heals
- ✖ reject unfinished/mismatched results atomically and disallow supplies/rest during a quest
- ✖ JSON save round-trip preserves injuries, deaths, bonds, XP, supplies and result deduplication
- ✖ actual battle results feed progression across multiple quests with fresh enemies

#### tests/day5_loop.test.js

- ✖ shop purchases are affordable, atomic, and blocked during quests
- ✖ one equipment slot, stock conservation, battle-only stats and quest locks
- ✖ all outcomes pay the documented reward once; reports and saves retain it
- ✖ death recovers equipment, prunes teams, blocks dead recipients and ends depleted campaigns
- ✖ Day 3 migration retains XP, bonds, death, injuries and reports and grants starter gold only once
- ✖ repeatable fresh campaign can fund supplies and gear without stuck battles or stat accumulation

#### tests/dm_playtest_revision.test.js

- ✖ death rolls alone use d20, DC is 14, tactics have no effect, and explicit instant death bypasses the roll
- ✖ failed death is authoritative through battle cleanup, assignment, graveyard source and save reload
- ✖ sorting, debug level floor, wound/death, recruit refresh and step travel are guarded
- ✖ camp membership derives from living roster minus away ids

#### tests/dm_simulator.test.js

- ✖ event wound persists at configured low HP and later KO resolves Death Save success/failure
- ✖ authored Mortal attack creates a Death Save even for a healthy target
- ✖ contract danger scales one quest instance, interruptions, rewards, and migration safely
- ✖ campaign totals use persisted settlement counters and remain stable on duplicate settlement

#### tests/focus_companion.test.js

- ✖ six 25/30-minute sessions and authored 3x3 difficulty coverage use existing enemies

#### tests/illustrated_travel.test.js

- ✖ travel renders the actual walking sheet frames and flips direction for the return path

#### tests/oct16.test.js

- ✖ three study members yield six Arcana/minute; partial assignment/save fractions and no closed credit
- ✖ equipment ward_focus: effective bonus, no equip healing, restored only on return
- ✖ equipment cleric_circlet: effective bonus, no equip healing, restored only on return
- ✖ equipment owl_hood: effective bonus, no equip healing, restored only on return
- ✖ equipment duelist_hat: effective bonus, no equip healing, restored only on return
- ✖ equipment sage_crown: effective bonus, no equip healing, restored only on return
- ✖ equipment silk_mantle: effective bonus, no equip healing, restored only on return
- ✖ equipment runic_coat: effective bonus, no equip healing, restored only on return
- ✖ equipment spellbook: effective bonus, no equip healing, restored only on return
- ✖ equipment parrying_dagger: effective bonus, no equip healing, restored only on return
- ✖ equipment cat_charm: effective bonus, no equip healing, restored only on return
- ✖ equipment hawk_charm: effective bonus, no equip healing, restored only on return
- ✖ equipment moonstone: effective bonus, no equip healing, restored only on return
- ✖ equipment wind_ring: effective bonus, no equip healing, restored only on return

#### tests/party_leader_succession.test.js

- ✖ one survivor automatically leads, wounded living members are eligible, and total death clears leader

#### tests/playtest20.test.js

- ✖ ten-second warning and atomic opening: spider_nest
- ✖ ten-second warning and atomic opening: patrol_cemetery
- ✖ ten-second warning and atomic opening: recover_stolen_ledger
- ✖ ten-second warning and atomic opening: broken_watchtower
- ✖ ten-second warning and atomic opening: sunken_crypt
- ✖ ten-second warning and atomic opening: necromancers_tower
- ✖ ten-second warning and atomic opening: black_gate
- ✖ ten-second warning and atomic opening: watchpost_at_dusk
- ✖ ten-second warning and atomic opening: evening_observatory
- ✖ ten-second warning and atomic opening: silken_crossing
- ✖ ten-second warning and atomic opening: deep_crypt_vigil
- ✖ ten-second warning and atomic opening: ash_road_sentries
- ✖ ten-second warning and atomic opening: thornbank_trail
- ✖ ten-second warning and atomic opening: moonlit_barrow
- ✖ ten-second warning and atomic opening: ridge_signal_fires
- ✖ healing removes an actual random wound, preserves earned traits, clears Wounded after last wound
- ✖ resurrection preserves powers/XP/wounds and replaces only after final confirmation
- ✖ ten new contracts fill missing duration/skull combinations

#### tests/pomodoro_focus.test.js

- ✖ zero innate Ward stays zero during normalization until the explicit between-battle restore

#### tests/post_sprint_fixes.test.js

- ✖ Work and Study produce per camper, persist fractions, and never accrue offline

#### tests/readability_progression.test.js

- ✖ exact six classes and approved cumulative progression through cap four
- ✖ Armor depletion, Ward refill and quoted restoration are separate from worn equipment
- ✖ long Hunts can schedule two small seeded skirmishes and deadline settlement remains once-only
- ✖ all current contract reward tables match settlement including seeded finds, with no negative balances

#### tests/review.test.js

- ✖ all 21 duration/difficulty combinations offer an unlocked authoritative contract

#### tests/roster_revision.test.js

- ✖ creation rolls within authored ranges once; saves never reroll identity or stats
- ✖ Team B unlock, independent assignments, capacity and quest locks are atomic
- ✖ all five types work in either slot with stock conservation and a two-item limit
- ✖ fatal wounded knockout remembers the actual lethal attacker and survives reload/deduplication
- ✖ actual archived Stage 2 campaign retains custom identity, two items and progression

#### tests/small_roster_rework.test.js

- ✖ innate Ward restores but ritual Ward and Armor do not
- ✖ repair is disabled and full parties cannot recruit; existing ritual costs remain exact

#### tests/sprint2.test.js

- ✖ nineteen travel lines and one return line per contract are unique; shared pool is separate
- ✖ encounter pressure is real HP/damage, copied and independent of presentation

#### tests/stage1_battle.test.js

- ✖ Stage 1 repeatable fight uses fewer consequential actions without one-hit eliminations
- ✖ Stage 1 dialogue covers existing identities and renders short plain text

#### tests/stage1_next_sprint.test.js

- ✖ schema 14 migration preserves established data, removes stamina, and is idempotent
- ✖ Hamlet config exposes quest-first destinations and quest intelligence fields
- ✖ expedition widget timing supports outbound, urgent-ready, and return progress

#### tests/stage2_identity.test.js

- ✖ 13 classes and all 26 selected moves retain authored power under one-use expedition scarcity
- ✖ real Stage 1 fixture migrates without lost progress and remains idempotent
- ✖ two slots conserve stock, apply bonuses once, reject duplicates and return both on death
- ✖ data validation rejects malformed stats, references, dialogue and placeholders

#### tests/stage2_next_sprint.test.js

- ✖ each adventurer spends at most one signature across an expedition

#### tests/stage2_realtime_loop.test.js

- ✖ Stage 2 permits one locked expedition with only approved predictable durations

#### tests/stage3_careers.test.js

- ✖ new careers use authoritative event totals and duplicate settlement changes nothing
- ✖ old saves migrate with zero careers and bounded history does not fabricate the past
- ✖ badges persist once, including boss, injury survivor, and reliable sole return
- ✖ dismissal requires living idle unassigned status and cleans gear and bonds
- ✖ dismissal at cap permits replacement and Team A/B histories retain their team

#### tests/stage3_catalogue.test.js

- ✖ authored catalogue has 41 categorized quests using only supported durations

#### tests/stage3_expeditions.test.js

- ✖ schema 19 migration adds condition state and guarded multi-stage trip fields idempotently
- ✖ authored travel halts with a frozen clock and Worker changes labor eligibility
- ✖ parallel teams keep independent stage states and unavailable roster membership
- ✖ signatures and wounds persist across encounters; continuing after a wound permits lethal repeat KO
- ✖ Gold, Arcana and autonomous decisions settle once and remain in report history

#### tests/stage3_quests.test.js

- ✖ quest catalogue has coherent undead, orc/goblin, and clearly labelled boss groups
- ✖ party sizes 1-5 battle and award transparent capped XP exactly once
- ✖ Team A/B assignments transfer atomically, cap at five, and migration removes conflicts
- ✖ Stage 2 campaign and Stage 3 selection survive JSON save/load migration
- ✖ each quest runs through battle, one report settlement, and returns to Home state

#### tests/stage4_timers.test.js

- ✖ Team A/B dispatch independently, persist, and settle return/reward once
- ✖ natural expiry and every debug skip share guarded timer transitions
- ✖ recruit lineup is three stable candidates, hourly refreshes, and cannot double recruit
- ✖ stamina is absent and clock rollback preserves remaining travel time

#### tests/stage5_acceptance.test.js

- ✖ old campaign migrates to Stage 5 without losing campaign progress
- ✖ arrival waits for explicit start, then boss battle and return settle once
- ✖ an ordinary KO on a later expedition remains a wound rather than unexplained death
- ✖ recruitment stops at the 15-adventurer roster cap

#### tests/strict_focus_sprint.test.js

- ✖ level cap eight has increasing slow thresholds and bounded raw stats

#### tests/tabletop_revision.test.js

- ✖ high difficulty quests have waves and new quests offer greater per-minute rewards than camp

Full exact stdout/stderr is in `docs/Handoff_Test_Inventory_20261017.txt`; machine summary is the adjacent JSON. Likely obsolete clusters: 15-member/two-team rules, stance damage multipliers, old attack-minus-defense damage, repeated signature cooldowns, d20 death saves, removed medkits, old XP/camp rates and pixel/source-string assertions. Potentially relevant failures such as replay/leader succession require their own source/trace review before reclassification.

### Latest browser evidence already available

`tests/altar-rituals-browser.json` (existing artifact; not every one was rerun for this documentation task):

```json
[
  {
    "width": 816,
    "rituals": 14,
    "unlockQuests": 14,
    "errors": []
  },
  {
    "width": 1280,
    "rituals": 14,
    "unlockQuests": 14,
    "errors": []
  }
]
```

`tests/quest-followup-browser.json` (existing artifact; not every one was rerun for this documentation task):

```json
[
  {
    "width": 816,
    "height": 624,
    "result": "PASS",
    "errors": []
  },
  {
    "width": 1280,
    "height": 720,
    "result": "PASS",
    "errors": []
  }
]
```

`tests/camp-performance-after.json` (existing artifact; not every one was rerun for this documentation task):

```json
{
  "campUpdates": 343,
  "fullRedraws": 9,
  "contentsTextureUpdates": 0,
  "campCpuMs": {
    "mean": 0.08688046650705811,
    "p95": 0.20000001788139343,
    "max": 0.800000011920929
  },
  "displayFrameMs": {
    "mean": 48.701666666666675,
    "p95": 100,
    "max": 149.89999999999964
  },
  "over25ms": 129
}
```

`tests/camp-performance-before.json` (existing artifact; not every one was rerun for this documentation task):

```json
{
  "campUpdates": 315,
  "fullRedraws": 324,
  "contentsTextureUpdates": 9396,
  "campCpuMs": {
    "mean": 2.898095237073444,
    "p95": 0.5999999940395355,
    "max": 790.2999999821186
  },
  "displayFrameMs": {
    "mean": 48.794999999999995,
    "p95": 100.10000000000036,
    "max": 799.8999999999996
  },
  "over25ms": 126
}
```

The altar browser suite passed at 816×624 and 1280×720 with all 14 unlock/cast paths represented by its stated workflow, pagination, target handling, revival confirmation and permanent-bar feedback; zero page errors. Fantasy browser checks previously loaded 401 requested asset paths, checked Gear persistence and rendered the pirate encounter. Art validator passed 96 skeleton identities and 6,432 runtime skeleton frames/poses in total. These do not establish physical-controller/native-monitor/audio-soak acceptance.

### Reproduction commands

```text
node --test --test-isolation=none tests/altar_rituals.test.js tests/fantasy_expansion.test.js tests/quest_followup.test.js tests/mission_background_clock.test.js tests/visual_battle_stage.test.js tests/figurine_rendering.test.js tests/death_stabilization.test.js
node --test --test-isolation=none tests/strict_focus_sprint.test.js
python tests/altar_rituals_smoke.py
python tests/fantasy_expansion_smoke.py
python scripts/validate_skeleton_expansion.py
node scripts/handoff_balance_audit.js
python scripts/handoff_test_inventory.py
node scripts/build_current_handoff.js
```

## 22. Proposed review agenda and decisions ChatGPT should help make

This is a review agenda, not an approved implementation plan. Ask the next reviewer to separate bug fixes, clarity polish, numeric tuning, content authoring and optional ideas, and to ground every claim in the current mechanics/evidence.

1. Establish one authoritative specification: actual damage, pools, class growth, XP, recovery, death, special counts, timer and ritual scopes. Identify misleading UI/descriptions/comments before tuning numbers.
2. Decide the intended innate Ward attrition rule. Current automatic +2 restoration makes renewable Ward different from worn Armor and can change class/gear value dramatically.
3. Measure all six classes and duplicate-class teams under the same budgets. Include damage, healing, prevented damage, control, wasted support turns, special charge consumption and casualty prevention, not only aggregate wins.
4. Review L1→L3→L5→L8 progression and capstones. Determine whether later support priorities/refinements feel like upgrades and whether legacy Attack/Defense/bond/passive fields deserve clearer communication or mechanical reconciliation.
5. Evaluate 1–5 skull consistency independently of duration. Check all 75 recommendations against actual encounter pools, density, waves, boss HP and class/gear expectations. Recommend displayed difficulty calibration before promising every route is fair.
6. Audit the 34 missing field-note pools, generic inherited threat text, actual enemy art mapping and reused floor-style backgrounds. Distinct names alone do not ensure distinct session experiences.
7. Review early money/gear acquisition, strong-gear dependence, free replacements, permanent wounds and recovery downtime in a continuing campaign. Fresh gifted-gear audits cannot answer affordability or loss spirals.
8. Assess all ritual marginal values and combinations, especially safe one-minute Rebate farming, Offering break-even, Hymn versus First Strike, Warding versus Familiar, Fortune's Ward cost, and expensive wound/revival economics. Preserve fixed user-requested effects and the no-entry-fee rule.
9. Clarify Reanimate's class-versus-equipped stat interpretation and Last Rites' exhausted-skeleton interaction before changing either. Determine how transparent these rules need to be in the altar/graveyard.
10. Improve pending/active/consumed/expired ritual feedback, unavailable-action explanations, HP versus permanent-injury recovery, repair eligibility and actual XP gain for skeleton parties.
11. Review retreat threshold and casualty invisibility for comprehensibility and fairness; maintain exact session deadlines and authoritative consequences.
12. Triage historical tests against the agreed spec, preserve useful regression coverage, retire obsolete expectations with rationale, and add meaningful campaign/balance tests rather than making source-string tests dictate design.
13. Protect save migration, idempotent consequences/rewards, old encounter-plan stability, replay and rendered/hidden-window timing while refactoring.
14. Keep the polished hamlet/tabletop identity, native window sizes, input comfort, audio pacing, render-cache ownership and optional floating-clock isolation intact. Include manual native acceptance and soak gates.

Useful sprint outputs: a ranked issue list with evidence/confidence; a small coherent set of goals; explicit non-goals; before/after rules and numeric tables; file ownership; migration plan; balance metrics/target bands; deterministic regression and manual acceptance plan; player-facing explanation changes; risks and rollback points. New systems should require explicit justification and separate approval rather than being smuggled into a polish sprint.

## 23. Copy/paste prompt for ChatGPT

> Read this handoff as a current-state specification for RPG Manager. I want a general upgrade sprint focused primarily on polishing existing systems, mechanics and balance. First summarize the actual core loop and identify inconsistencies between code behavior, descriptions, tests and prior documentation. Use the fresh audit as exploratory evidence, not a complete balance sign-off. Separate confirmed defects, likely clarity problems, balance hypotheses and unresolved design choices.
>
> Propose a prioritized, coherent sprint with explicit goals/non-goals, the exact rule or number changes you recommend, expected player benefit, dependencies, migration risks, acceptance tests and measurable balance criteria. Prefer fixing and clarifying existing mechanics over adding systems. Respect the strict quest timers, three-person single-party loop, free quest entry, all 14 quest-unlocked rituals and the rejected fear/morale/scouting/free-ritual-healing/quest-shortening suggestions. Do not restore obsolete mechanics solely to satisfy old tests.
>
> Pay particular attention to class/gear value, Ward versus Armor attrition, permanent wounds and recovery, currency sources/sinks, ritual marginal value and combinations, survival/difficulty recommendations, reward per minute including opportunity cost, long-session repetition, missing narrative coverage, and clear feedback for pending/consumed effects. Ask only for genuinely unresolved product decisions; do not invent missing mechanics. Flag the Reanimate equipped-stat interpretation and Last Rites exhausted-skeleton interaction explicitly. End with an implementation-ready brief and a short list of decisions that need my approval.

## 24. Exact rule/configuration appendix for source-grounded review

These excerpts are taken from the current files, not rewritten pseudocode. The companion source packet contains the full implementation. If an explanatory paragraph and an excerpt differ, report that discrepancy instead of silently choosing the older design.

### Class stat calculation and XP thresholds — `js/plugins/RPGManagerProgression.js`

```javascript
function classStats(npc) {
        const c=catalogue.classes.find(c=>c.id===(LEGACY_CLASSES[npc.classId]||npc.classId))||catalogue.classes[0];
        const stats={...c.combat,speed:({barbarian:7,knight:5,cleric:6,mage:8,ranger:11,rogue:13}[c.id]||8)};
        for(let level=2;level<=Math.min(4,npc.level||1);level++)for(const [key,value] of Object.entries(c.growth[level]||{}))stats[key]=(stats[key]||0)+value;
        stats.speed+=Math.floor(((npc.level||1)-1)/2);return stats;
    }
    const xpRequired = npc => npc.level >= LEVEL_CAP ? 0 : ({1:25,2:125,3:300,4:540,5:875,6:1330,7:1915}[npc.level]||0);
```

### Derived life/stats and equipment contributions — `js/plugins/RPGManagerProgression.js`

```javascript
function ensureLife(npc, founder = false) {
        if(npc.reanimated&&conditionOf(npc)===CONDITIONS.DEAD)npc.reanimationExhausted=true;
        npc.foundingMember = !!(npc.foundingMember || npc.founder || founder); npc.founder = npc.foundingMember;
        npc.nickname = typeof npc.nickname === "string" ? npc.nickname : "";
        npc.nicknamePrompted = !!npc.nicknamePrompted;
        if(npc.level>LEVEL_CAP)npc.legacyLevel ||= npc.level;
        npc.level = Math.max(1, Math.min(LEVEL_CAP, Math.floor(Number(npc.level) || 1)));
        if(LEGACY_CLASSES[npc.classId])migrateIdentity(npc);
        npc.lastingInjuries=Number.isFinite(npc.lastingInjuries)?Math.max(0,Math.floor(npc.lastingInjuries)):0;
        const stats=classStats(npc);for(const id of Object.values(npc.equipmentSlots||{}))for(const key of ["ward","dodge","crit"])stats[key]=(stats[key]||0)+(SHOP[id]?.[key]||0);npc.speed=(stats.speed||({barbarian:7,knight:5,cleric:6,mage:8,ranger:11,rogue:13}[npc.classId]));const hp=stats.hp+Object.values(npc.equipmentSlots||{}).reduce((n,id)=>n+(SHOP[id]?.hp||0),0);
        npc.maxHealth=hp; npc.health=conditionOf(npc)===CONDITIONS.DEAD?0:Math.max(1,Math.min(hp,Math.ceil(Number(npc.health)||hp)));
        npc.classArmorMax=stats.armor;
        npc.classArmor=Math.max(0,Math.min(stats.armor,Number.isFinite(npc.classArmor)?Math.floor(npc.classArmor):stats.armor));
        npc.critChance=stats.crit/100; npc.dodgeChance=Math.max(0,stats.dodge/100-(npc.lastingInjuries||0)*.02);
        npc.signatureUnlocks=npc.level>=6?2:npc.level>=3?1:0;
        npc.preferredPosition=["mage","cleric","ranger"].includes(npc.classId)?"back":"front";
        npc.dodgeTier=["ranger","rogue"].includes(npc.classId)?"high":"low";
        npc.innateWardMax=stats.ward;
        npc.innateWard=Math.max(0,Math.min(stats.ward,Number.isFinite(npc.innateWard)?Math.floor(npc.innateWard):stats.ward));
        npc.temporaryWard = Math.max(0, Math.floor(Number(npc.temporaryWard) || 0));
        npc.equipmentSlots ||= { head:null, body:null, offHand:null, accessory:null };
        for (const slot of EQUIPMENT_SLOTS) npc.equipmentSlots[slot] ||= null;
        npc.equipmentCondition ||= {};
        npc.history ||= { joinedOrder:0, events:[], questsCompleted:0, battlesSurvived:0, kills:0, deathRollsSurvived:0, woundsAcquired:0, leaderships:0, bossQuests:0, bondedDeaths:[] };
        npc.earnedTraits = Array.isArray(npc.earnedTraits) ? npc.earnedTraits.slice(0,4) : [];
        npc.permanentWounds = Array.isArray(npc.permanentWounds) ? npc.permanentWounds : [];
        return npc;
    }
```

### Party preparation, injuries and legacy bonuses — `js/plugins/RPGManagerProgression.js`

```javascript
function prepareTeam(state, ids = state.teamIds, teamKey = state.activeTeam) {
        const error = teamError(state, ids, teamKey);
        if (error) throw new Error(error);
        return ids.map(id => {
            const npc = copy(state.roster.find(n => n.id === id));
            ensureLife(npc); restoreBetweenBattles(npc);
            npc.speed*=Math.pow(.97,npc.lastingInjuries||0);
            const stat = npc.passiveTrait.stat || "attack";
            const rank = npc.passiveTrait.rank || 1;
            npc[stat] += rank;
            const gear = [...new Set([npc.equipment, npc.equipment2])].map(id => SHOP[id]).filter(g => g?.stat);
            for (const item of gear) npc[item.stat] += item.bonus;
            const move = moveFor(npc);
            if (move && npc.signatureUnlocks > 0) { npc.signatureMove = copy(move); npc.signatureAttack = move.name; }
            else npc.signatureMove = null;
            npc.armor = npc.classArmor + equipmentArmor(npc); npc.maxArmor = npc.classArmorMax + equipmentArmorMax(npc); npc.ward = npc.innateWard + npc.temporaryWard;npc.maxWard=npc.innateWardMax+npc.temporaryWard;
            const bonded = bondPartners(state, id).some(n => living(n) && ids.includes(n.id));
            if (bonded) npc.attack += 2;
            if (npc.injury) {
                npc.attack = Math.max(1, Math.floor(npc.attack * 0.8));
                npc.defense = Math.max(0, Math.floor(npc.defense * 0.8));
            }
            npc.battleBonuses = { equipment: gear.map(g => `${g.name}: +${g.bonus} ${g.stat}`).join(", ") || "None", trait: `${stat} +${rank}`, bond: bonded ? 2 : 0,
                injured: !!npc.injury };
            return npc;
        });
    }
```

### Enemy instance/skirmish normalization — `js/plugins/RPGManagerProgression.js`

```javascript
function encounterEnemies(stage,content,trip={}){
        return (stage.enemyIds||[]).map(id=>(content?.enemies||[]).find(e=>e.id===id)).filter(Boolean).map((source,index)=>{
            const e=copy(source);e.id=`${source.id}_${index}`;if(!stage.smallSkirmish&&dangerRating(trip)>=4)e.health+=dangerRating(trip)===5?3:2;if(stage.smallSkirmish){e.health=Math.min(e.health,dangerRating(trip)>=3?3:2);e.armor=Math.min(e.armor||0,1);e.damage=1;e.signatureDamage=1;e.boss=false;e.instantDeathSignature=false;}
            e.innateWard=Math.max(e.innateWard||0,/cult|mage|witch|wraith|imp|necrom|sorcer|jester/i.test(e.name+" "+e.role)?1:0);
            if((stage.enemyIds||[]).length<5&&e.health+(e.armor||0)+e.innateWard<2)e.health=2-(e.armor||0)-e.innateWard;
            const tuning=trip.encounterTuning||{};e.health=Math.max(1,e.health+(tuning.hp||0));e.maxHealth=e.health;e.damage=Math.max(1,(e.damage||1)+(tuning.damage||0));if(e.signatureDamage)e.signatureDamage+=tuning.damage||0;e.speed=Math.max(1,e.speed+Math.floor(((e.level||1)-1)/2)+(tuning.speed||0));if((stage.enemyIds||[]).length<5)e.health=Math.max(e.health,2-(e.armor||0)-(e.innateWard||0));e.maxHealth=e.health;return e;
        });
    }
```

### Encounter scheduling and timer safety — `js/plugins/RPGManagerProgression.js`

```javascript
function dangerRating(q={}){return Number(q.durationMinutes)===1?1:Math.max(1,Math.min(5,Math.floor(q.skulls||({Easy:1,Normal:3,Hard:5}[authoredDifficulty(q)]))));}
    function dangerLabel(q={}){const n=dangerRating(q);return `${"☠".repeat(n)} ${n}/5`;}
    function canStartBattle(trip,leadMs=0){
        if(trip.durationMinutes===1||trip.combatMode==="none"||trip.wiped||trip.autoRetreat||trip.returnNarrated)return false;
        if(trip.remainingMs<SESSION_TIMING.battleMs+SESSION_TIMING.extractionMs+leadMs)return false;
        if(trip.battlePresentationDeadlineMs>trip.elapsedMs)return false;
        const start=trip.totalDurationMs*.5;
        return trip.durationMinutes<15||trip.elapsedMs>=start+SESSION_TIMING.campfireMs||trip.elapsedMs+leadMs+SESSION_TIMING.battleMs<=start;
    }
    function encounterPlan(trip){
        if(trip.durationMinutes===1||trip.combatMode==="none")return [];
        const stages=(trip.stages||[]).filter(s=>s.type==="battle"&&!s.smallSkirmish),main=stages.find(s=>s.mainQuest)||stages.filter(s=>!s.randomEncounter).pop()||stages[stages.length-1];
        if(!main)return [];
        const end=trip.totalDurationMs-SESSION_TIMING.battleMs-SESSION_TIMING.extractionMs-5000,plan=[];
        const spacing=trip.durationMinutes>=10?100000-(dangerRating(trip)-1)*7500:trip.durationMinutes>=5?150000-(dangerRating(trip)-1)*15000:120000;
        for(let at=20000;at<end-65000;at+=spacing){
            const camp=trip.totalDurationMs*.5;
            if(trip.durationMinutes>=15&&at<camp+60000&&at+SESSION_TIMING.battleMs>camp)continue;
            const source=stages[plan.length%stages.length]||main;
            const pool=source.patrolEnemyIds?.length?source.patrolEnemyIds:source.enemyIds;
            const ids=source.patrolEnemyIds?.length?Array.from({length:Math.min(pool.length,dangerRating(trip)>=4?2:1)},(_,i)=>pool[(plan.length+i)%pool.length]):pool.slice(0,dangerRating(trip)>=4?2:1);
            // Short road skirmishes preserve density without repeating full bosses.
            plan.push({atMs:at,stage:{...copy(source),id:`paced_${plan.length}`,label:source.patrolEnemyIds?.length?"Local patrol":source.label,mainQuest:false,randomEncounter:true,smallSkirmish:true,enemyIds:ids}});
        }
        const camp=trip.totalDurationMs*.5;
        let at=Math.max(15000,end);if(trip.durationMinutes>=15&&at<camp+60000&&at+SESSION_TIMING.battleMs>camp)at=camp+60000;
        plan.push({atMs:at,stage:copy(main)});
        if(dangerRating(trip)>=3)for(let i=0;i<plan.length;i++)if(i%3===0&&i<plan.length-1){const stage=plan[i].stage,ids=stage.enemyIds.slice(0,2);while(ids.length<2)ids.push(ids[0]);stage.waves=[ids.slice(),ids.slice()];stage.enemyIds=stage.waves[0];}
        if(dangerRating(trip)>=4&&stableUnit(`${trip.id}:masked-jester`)<.01&&plan.length>1)plan[0].stage={id:"masked_jester",type:"battle",randomEncounter:true,enemyIds:["masked_jester"],jester:true,label:"Masked Jester"};
        for(const p of plan)if(p.stage.enemyIds.length>3){p.stage.waves=[p.stage.enemyIds.slice(0,3),p.stage.enemyIds.slice(3)];p.stage.enemyIds=p.stage.waves[0];}
        return plan;
    }
```

### Automatic retreat decision — `js/plugins/RPGManagerProgression.js`

```javascript
function retreatAssessment(trip,stage,content){
        const survivors=(trip.preparedTeam||[]).filter(n=>n.alive!==false&&n.health>0&&!trip.expeditionDeaths?.[n.id]);
        const enemies=encounterEnemies(stage||{},content,trip);
        const hp=survivors.reduce((s,n)=>s+n.health,0),defense=survivors.reduce((s,n)=>s+Math.max(0,n.armor||0)+Math.max(0,n.innateWard??0)+Math.max(0,n.temporaryWard||0),0),effective=hp+defense;
        const threat=enemies.reduce((s,n)=>s+(n.health||n.maxHealth||1)+(n.armor||0)+(n.arcaneArmor||n.innateWard||0),0),burst=enemies.reduce((s,n)=>s+Math.max(1,n.damage||1,n.signatureDamage||0),0);
        const battered=survivors.length<3||hp<=survivors.length&&defense===0;
        const catastrophic=!!enemies.length&&(!survivors.length||battered&&effective<=Math.max(3,burst)&&threat>=Math.max(3,effective*3));
        return {retreat:catastrophic,survivors:survivors.length,hp,defense,effective,threat,burst,enemyCount:enemies.length,
            reason:!survivors.length?"No companions can face another encounter. The expedition is returning.":`Only ${survivors.length} companions remain with ${hp} HP and ${defense} defense against ${enemies.length} foes. They turn home before another overwhelming fight.`};
    }
```

### Actual camp production/recovery — `js/plugins/RPGManagerProgression.js`

```javascript
function accrueCampJobs(state,deltaMs){
        ensureCampJobs(state);const delta=Math.min(MAX_SESSION_TICK_MS,Math.max(0,Number(deltaMs)||0));
        state.campJobElapsed=state.campJobElapsed&&typeof state.campJobElapsed==="object"&&!Array.isArray(state.campJobElapsed)?state.campJobElapsed:{};const away=unavailableIds(state);
        for(const npc of state.roster||[]){
            if(!living(npc)||npc.retired||away.has(npc.id))continue;
            const job=state.campJobs[npc.id],period=30000;
            const record=state.campJobElapsed[npc.id]=state.campJobElapsed[npc.id]&&typeof state.campJobElapsed[npc.id]==="object"?state.campJobElapsed[npc.id]:{};
            // Legacy telemetry was never production credit. New balances have an explicit marker.
            if(record.productionVersion!==2){
                for(const key of CAMP_JOBS){const prior=Number(record[key]),oldPeriod=key==="study"?300000:60000;record[key]=record.productionVersion===1&&Number.isFinite(prior)?Math.floor((Math.max(0,prior)%oldPeriod)/oldPeriod*30000):0;}
                record.productionVersion=2;
            }
            const recovery=Number.isFinite(record.recovery)?Math.max(0,record.recovery)%30000:0;
            record.recovery=npc.health<npc.maxHealth?recovery+delta:0;
            const recovered=Math.floor(record.recovery/30000);record.recovery%=30000;
            if(recovered){npc.health=Math.min(npc.maxHealth,npc.health+recovered);npc.lastCampHeal=true;}
            if(job==="idle")continue;
            const balance=Number(record[job]);record[job]=(Number.isFinite(balance)?Math.max(0,balance)%period:0)+delta;
            const units=Math.floor(record[job]/period);record[job]%=period;
            if(job==="work")state.gold+=units*(["rogue","ranger","barbarian"].includes(npc.classId)?2:1);
            if(job==="study")state.arcana+=units*(["mage","cleric","knight"].includes(npc.classId)?2:1);
            
        }
        return state.campJobElapsed;
    }
```

### Current queued ritual transfer and reward logic — `js/plugins/RPGManagerProgression.js`

```javascript
function grantRitualUnlocks(state,quest,won){
        if(!won||quest.abandoned||quest.autoRetreat)return [];
        state.ritualsUnlocked||={};const gained=[];
        for(const [id,r] of Object.entries(RITUALS))if(r.questId===quest.questId&&!state.ritualsUnlocked[id]){state.ritualsUnlocked[id]=true;gained.push(r.name);}
        return gained;
    }
    function activateRituals(state,trip){
        trip.ritualEffects=copy(state.ritualEffects||{});state.ritualEffects={};trip.ritualBattlesWon=0;
        const team=trip.preparedTeam||[];
        if(trip.ritualEffects.fortunes_favor){const member=team.find(n=>(n.temporaryWard||0)+(n.innateWard||0)>0);if(member){if(member.temporaryWard>0)member.temporaryWard--;else member.innateWard--;member.ward=member.innateWard+member.temporaryWard;}else delete trip.ritualEffects.protection_ward;}
        const target=team.find(n=>n.id===trip.ritualEffects.oath_of_vanguard);if(target){target.ritualArmor=1;target.armor++;}
    }
    function ritualRewards(trip,gold,arcana){
        const effects=trip.ritualEffects||{};
        if(effects.fortunes_favor)gold=Math.floor(gold*1.25);
        if(effects.arcane_rebate){gold=0;arcana+=50;}
        if(effects.arcane_offering)arcana+=10*(trip.ritualBattlesWon||0);
        return{gold,arcana};
    }
    function returnUnusedRituals(state,trip){
        state.ritualEffects||={};for(const id of ["protection_ward","battle_hymn"])if(trip.ritualEffects?.[id])state.ritualEffects[id]=true;
    }
    function seriousWound(npc){
        ensureLife(npc);npc.lastingInjuries++;const wound=WOUND_DEFINITIONS.find(w=>!npc.permanentWounds.includes(w.id));if(wound)addPermanentWound(npc,wound.id);
        npc.injury="Serious wound";npc.condition=CONDITIONS.WOUNDED;ensureLife(npc);
    }
```

### Current ritual casting and resurrection — `js/plugins/RPGManagerProgression.js`

```javascript
function ritualCast(state,id,targetId,options=null){
        const r=RITUALS[id],npc=state.roster.find(n=>n.id===targetId);
        if(!r||!state.ritualsUnlocked[id])return{ok:false,message:"Ritual is locked."};
        if(state.activeQuest||Object.values(state.trips||{}).some(Boolean))return{ok:false,message:"Rituals are available only at camp."};
        if(state.arcana<r.castCost)return{ok:false,message:`Requires ${r.castCost} Arcana.`};
        if(r.target==="living"&&(!living(npc)||!activeRoster(state).some(n=>n.id===targetId)||isUnavailable(state,targetId)))return{ok:false,message:"Choose a living companion at camp."};
        if(id==="healing_ritual"&&!npc.permanentWounds.length)return{ok:false,message:"This companion has no permanent wound."};
        if(!r.target&&id!=="greed_prayer"&&state.ritualEffects?.[id])return{ok:false,message:`${r.name} is already pending.`};
        if(id==="oath_of_vanguard"&&state.ritualEffects?.[id])return{ok:false,message:"An Oath is already pending for the next quest."};
        if(id==="fortunes_favor"&&!state.ritualEffects?.protection_ward&&!activeRoster(state).some(n=>(n.innateWard||0)+(n.temporaryWard||0)>0))return{ok:false,message:"Fortune's Favor requires one party Ward to sacrifice."};
        if(r.target==="fallen"){
            if(!npc||conditionOf(npc)!==CONDITIONS.DEAD)return{ok:false,message:"Choose a fallen companion from the graveyard."};
            if(id==="reanimate"&&(npc.reanimated||npc.reanimationExhausted))return{ok:false,message:"This companion is permanently ineligible for reanimation."};
            if(!vacantSlots(state).length){
                if(!options?.confirmed||!options.replaceId)return{ok:false,confirmationRequired:true,message:"Choose and confirm a party member to replace first."};
                const staged=copy(state),removed=removeCompanion(staged,options.replaceId);if(!removed.ok)return removed;
                const result=ritualCast(staged,id,targetId,{confirmed:true});if(!result.ok)return result;
                for(const key of Object.keys(state))delete state[key];Object.assign(state,staged);return result;
            }
        }
        state.arcana-=r.castCost;
        if(!r.target&&id!=="greed_prayer"||id==="oath_of_vanguard"){state.ritualEffects||={};state.ritualEffects[id]=id==="oath_of_vanguard"?targetId:true;}
        if(id==="greed_prayer")state.gold+=100;
        if(id==="healing_ritual"){
            const hp=npc.health;
            state.ritualSequence=(state.ritualSequence||0)+1;
            const index=Math.floor(stableUnit(`${npc.id}:${state.ritualSequence}:healing`)*npc.permanentWounds.length),wound=npc.permanentWounds.splice(index,1)[0];
            npc.lastingInjuries=npc.permanentWounds.length?Math.max(0,npc.lastingInjuries-1):0;
            if(!npc.permanentWounds.length){npc.condition=CONDITIONS.HEALTHY;npc.injury=null;npc.injuryExpeditionId=null;}
            npc.history.events.push({type:"ritualRemoval",id:wound});ensureLife(npc);npc.health=hp;
            return{ok:true,wound,message:`${displayName(npc)}: healed ${WOUND_DEFINITIONS.find(w=>w.id===wound)?.name||wound}. ${npc.permanentWounds.length} wounds remain.`};
        }
        if(r.target==="fallen"){
            npc.condition=npc.permanentWounds.length?CONDITIONS.WOUNDED:CONDITIONS.HEALTHY;npc.alive=true;npc.injury=npc.permanentWounds.length?"Wounded":null;npc.injuryExpeditionId=null;npc.dismissed=false;npc.retired=false;npc.focusGearReturned=false;delete npc.retiredReason;
            if(id==="reanimate")npc.reanimated=true;
            ensureLife(npc);npc.health=id==="last_rites"?1:npc.maxHealth;
            if(id==="reanimate"){npc.classArmor=npc.classArmorMax;npc.innateWard=npc.innateWardMax;}
            if(id==="last_rites"){npc.condition=CONDITIONS.WOUNDED;npc.injury="Injured";}
            npc.history.events.push({type:id});if(npc.reanimated)normalizeUndead(npc);else normalizePortrait(npc);
            state.activeSlots||=activeSlotIds(state);state.activeSlots[vacantSlots(state)[0]]=npc.id;normalizeFocusRoster(state);
        }
        return{ok:true,message:`${r.name} performed.`};
    }
```

### Combat primary turn resolution — `js/plugins/RPGManagerBattle.js`

```javascript
step() {
            if (this._status !== "running") return [];
            const events = [];
            this._queue = this._queue.filter(npc => npc.alive && npc.health > 0);
            if (this._queue.length === 0) this._startRound(events);
            const actor = this._queue.shift();
            if (actor.skipTurns > 0) { actor.skipTurns--; this._actions++; events.push({type:"skip",round:this._round,key:actor.key,name:actor.name,reason:"neutralized"}); if(this._actions>=this._maxActions)this._finish("draw","action-limit",events);this._events.push(...events); return copy(events); }
            if(this._refinementAction(actor,events)){
                this._actions++;
                if(!this._living("enemy").length)this._finish("victory","elimination",events);
                else if(this._actions>=this._maxActions)this._finish("draw","action-limit",events);
                this._events.push(...events);return copy(events);
            }
            const selection = this._target(actor);
            const target = selection.target;
            const signatureChoice = this._signatureDecision(actor, target);
            const signature = (signatureChoice.use||actor.side==="player"&&actor.personalTurns>=3) && (actor.side!=="player" || actor.signatureUnlocks>0&&!actor.signatureSpent);
            const multiplier = signature ? (actor.signatureDamage || actor.damage || Math.max(1,Math.round(actor.signatureMove?.multiplier||1))) : (actor.damage || 1);
            const special=signature&&actor.side==="player"?actor.classId:null;
            const specialNames={barbarian:"Cleave",knight:"Shield Bash",ranger:"Pinning Shot",rogue:"Feint",mage:"Fireburst",cleric:"Mending Light"};
            if(special)actor.signatureAttack=specialNames[special]||actor.signatureAttack;
            if(special==="cleric"){
                const ally=this._living("player").filter(n=>n.health<n.maxHealth).sort((a,b)=>a.health/a.maxHealth-b.health/b.maxHealth||a.key.localeCompare(b.key))[0];
                if(ally){ally.health=Math.min(ally.maxHealth,ally.health+1);this._spendSignature(actor);this._actions++;
                    events.push({type:"heal",kind:"signature",attackName:"Mending Light",round:this._round,side:"player",actorKey:actor.key,actorName:actor.name,targetKey:ally.key,targetName:ally.name,healing:1,targetHealth:ally.health});
                    this._events.push(...events);return copy(events);}
            }
            const neutralizing = actor.side==="enemy" && signature && ["enchantment","web"].includes(actor.special);
            const critChance=actor.side==="player"?Math.max(0,Math.min(.75,(Number(actor.critChance)||0)+(actor.classId==="ranger"&&actor.level>=2?.02:0))):0;
            const criticalHit=critChance>0&&this._random()<critChance;
            let rolledDamage = neutralizing ? 0 : Math.max(1, Math.floor(multiplier))*(criticalHit?2:1);
            rolledDamage=this._ritualDamage(actor,rolledDamage);
            if(special==="barbarian")rolledDamage++;
            if(actor.side==="player"&&actor.classId==="barbarian"&&actor.level>=2&&actor.tookDamage&&!actor.furySpent){rolledDamage++;actor.furySpent=true;}
            if(actor.side==="player"&&actor.classId==="rogue"&&actor.level>=8&&(target.pinned||target.venom||target.suppressedArmorTurns>0))rolledDamage++;
            const consumingMark=!!target.marked&&actor.side==="player";
            if(consumingMark){if(!target.markedReduced||this._random()<.5)rolledDamage++;target.marked=false;target.markedReduced=false;target.markConsumed=true;}
            if(target.side==="player"&&target.classId==="knight"&&target.level>=2){target.guardHits=(target.guardHits||0)+1;if(target.guardHits<=(target.level>=4?2:1))rolledDamage=Math.max(0,rolledDamage-1);}
            if(target.side==="player"&&target.health/target.maxHealth<.5){
                if(target.classId==="barbarian"&&target.level>=5&&(target.resolveHits||0)<(target.level>=7?2:1)){target.resolveHits=(target.resolveHits||0)+1;rolledDamage=Math.max(0,rolledDamage-1);}
                const knight=this._living("player").find(n=>n.classId==="knight"&&n.level>=5&&n.key!==target.key);
                if(knight&&!knight.interposeSpent&&this._random()<(knight.level>=7?.2:.15)) {knight.interposeSpent=true;rolledDamage=Math.max(0,rolledDamage-1);this._supportEvent(knight,target,"Interpose",events,0,"This incoming hit is reduced by 1.");}
            }
            if(actor.pinned){rolledDamage=Math.max(1,rolledDamage-1);actor.pinned=false;}
            if(target.protected){rolledDamage=Math.max(0,rolledDamage-1);target.protected=false;}
            const dodgeTables=target.side==="player"?{low:0.15,normal:0.25,high:0.35}:{low:0.05,normal:0.12,high:0.20};
            const baseDodge=Number.isFinite(target.dodgeChance)?Math.max(0,Math.min(.75,target.dodgeChance)):dodgeTables[String(target.dodge||target.dodgeTier||"low").toLowerCase()]??dodgeTables.low;
            const dodgeChance=Math.min(0.75,baseDodge+(target.classId==="rogue"&&target.level>=2?(target.level>=4?.04:.03):0));
            const missed=this._random()<dodgeChance;
            const ritualBlocked=!missed&&this._ritualBlock(target,events);
            let remaining=missed||ritualBlocked?0:rolledDamage, wardLoss=0, armorLoss=0;
            const bypass=special==="mage"&&!missed&&!ritualBlocked?1:0;remaining=Math.max(0,remaining-bypass);
            for(const key of ["temporaryWard","innateWard"]){const used=Math.min(target[key]||0,remaining);target[key]-=used;remaining-=used;wardLoss+=used;}
            const armorUsed=Math.min(target.armor||0,remaining);target.armor-=armorUsed;target.ritualArmor=Math.max(0,(target.ritualArmor||0)-armorUsed);remaining-=armorUsed;armorLoss+=armorUsed;
            let damage=Math.min(target.health,remaining+bypass); target.health=Math.max(0,target.health-damage);if(damage>0)target.tookDamage=true;
            if(this._mercy(target,events))damage=Math.max(0,damage-1);
            if (actor.side === "player" && signature) { this._spendSignature(actor); }
            if (actor.side === "enemy" && signature) actor.signatureUses=(actor.signatureUses||0)+1;
            let effectText=special?(missed?"Special missed; no effect.":special==="ranger"?"Pinned: next attack -1, minimum 1.":special==="rogue"?"Feint attempts a brief Armor suppression.":special==="mage"?"1 damage bypasses defenses; a small burst reaches other enemies.":special==="cleric"?"Holy fallback: no damaged living ally.":special==="barbarian"?"Heavy main hit.":""):"";
            if(!missed){target.lastHitBy=actor.key;
                if(special==="ranger")target.pinned=true;
                if(special==="knight"){const ally=this._living("player").sort((a,b)=>a.health/a.maxHealth-b.health/b.maxHealth)[0];if(ally){ally.protected=true;effectText=`Guard set: ${ally.name}, next hit -1.`;}}
                if(special==="barbarian"&&this._random()<(actor.level>=4?.6:.5)){const other=this._living("enemy").find(n=>n.key!==target.key);if(other){
                    this._sprintHit(actor,other,"Cleave — sweep",events);
                }}
            }
            if(!missed&&actor.side==="player"){
                const level=actor.level||1;
                if(special==="mage")for(const enemy of this._living("enemy").filter(n=>n.key!==target.key))this._sprintHit(actor,enemy,"Fireburst",events);
                if(special==="knight"&&this._random()<.2)target.skipTurns=Math.max(target.skipTurns||0,1);
                if(special==="rogue"&&target.armor>0&&this._random()<(level>=7?.3:level>=4?.25:.2)){target.armor--;target.suppressedArmor=1;target.suppressedArmorTurns=2;}
                if(actor.classId==="rogue"&&!actor.venomSpent&&level>=5&&this._random()<(level>=7?.2:.15)){actor.venomSpent=true;target.venom=true;target.venomSource=actor.key;}
                if(actor.classId==="ranger"&&!actor.markSpent&&level>=5&&this._random()<(level>=7?.25:.2)){actor.markSpent=true;target.marked=true;}
                if(special==="ranger"&&level>=4&&this._random()<.2)target.skipTurns=Math.max(target.skipTurns||0,1);
                if(actor.classId==="mage"&&!actor.focusSpent&&level>=2&&this._random()<(level>=4?.15:.1)){actor.focusSpent=true;target.pinned=true;}
                if(actor.classId==="mage"&&!actor.echoSpent&&level>=8&&this._random()<.15){actor.echoSpent=true;const other=this._living("enemy").find(n=>n.key!==target.key);if(other)this._sprintHit(actor,other,"Arcane Echo",events);}
                if(target.health===0&&actor.classId==="barbarian"&&level>=8&&!actor.capstoneSpent){const other=this._living("enemy").find(n=>n.key!==target.key);if(other){actor.capstoneSpent=true;this._sprintHit(actor,other,"Relentless",events);}}
                if(target.health===0&&(target.marked||consumingMark)&&actor.classId==="ranger"&&level>=8&&!actor.capstoneSpent){const other=this._living("enemy").find(n=>n.key!==target.key);if(other){actor.capstoneSpent=true;other.marked=true;other.markedReduced=true;effectText+=" Hunter's Opening transfers the mark: 50% chance of +1 on the next allied hit, once per battle.";}}
            }
            if(neutralizing&&!missed&&!ritualBlocked) target.skipTurns=Math.max(target.skipTurns||0,1);
            actor.cooldown = actor.side === "player" ? 0 : signature ? (actor.signatureMove?.cooldown ?? SIGNATURE_COOLDOWN) : Math.max(0, actor.cooldown - 1);
            this._actions++;
            this._strategyCooldown = Math.max(0, this._strategyCooldown - 1);
            this._actorLastTargets[actor.key] = target.key;
            const instantDeath = actor.side === "enemy" && !!actor.instantDeathSignature && signature && target.health === 0;
            const mortal = actor.side === "enemy" && (actor.boss || /BOSS:/.test(actor.name)) && signature && target.health === 0;
            if (mortal) events.push({ type: "mortalIntent", actorKey: actor.key, actorName: actor.name, targetKey: target.key, targetName: target.name, reason: "boss execution attack" });
            events.push({
                type: "attack", round: this._round,
                actorKey: actor.key, actorName: actor.name, side: actor.side,
                targetKey: target.key, targetName: target.name, targetSide: target.side,
                kind: signature ? "signature" : "basic",
                attackName: signature ? actor.signatureAttack : actor.basicAttack,
                damage, effectText, ritualBlocked, rawDamage:rolledDamage, criticalHit, critChance, missed, dodgeChance, wardLoss, armorLoss, targetWard:(target.temporaryWard||0)+(target.innateWard||0), targetArmor:target.armor, targetHealth: target.health, targetMaxHealth: target.maxHealth,
                cooldown: actor.cooldown, strategy: this._strategy, decisionStrategy: selection.strategy,
                actorRole: actor.combatRole, targetRole: target.combatRole,
                positionIntent: selection.positionIntent,
                decisionReason: selection.decision.reason,
                decisionScore: Math.round(selection.decision.score * 100) / 100,
                decisionFactors: selection.decision.factors,
                targetReason: selection.decision.reason, critical: rolledDamage >= target.maxHealth * 0.4,
                mortal, instantDeath, signatureDecision: signatureChoice
            });
            if (target.health === 0) {
                target.alive = false;
                target.defeatedBy = { id: actor.id, key: actor.key, name: actor.name, side: actor.side };
                events.push({ type: "defeat", round: this._round, key: target.key, name: target.name, side: target.side });
                if(target.side === "player") {
                    const survived=!!target.deathSaveSurvived;
                    events.push({type:"deathSave",round:this._round,key:target.key,name:target.name,
                        coinFlip:true,check:{success:survived,coinFlip:true},survived,permanentDeath:!survived});
                }
            }
            if (this._living("enemy").length === 0) {
                this._finish("victory", "elimination", events);
            } else if (this._living("player").length === 0) {
                this._finish("defeat", "elimination", events);
            } else if (this._actions >= this._maxActions) {
                this._finish("draw", "action-limit", events);
            }
            this._events.push(...events);
            return copy(events);
        }
```

### Shared ritual damage/block/Mercy helpers — `js/plugins/RPGManagerBattle.js`

```javascript
_spendSignature(actor){
            const uses=(this._signatureUses[actor.id]||0)+1;this._signatureUses[actor.id]=uses;
            actor.signatureSpent=uses>=(actor.ritualSignatureLimit||1);
        }
        _ritualDamage(actor,amount){
            if(actor.side!=="player")return amount;
            if(this._rituals.battle_hymn)amount++;
            if(this._rituals.first_strike){amount+=2;delete this._rituals.first_strike;}
            return amount;
        }
        _ritualBlock(target,events){
            if(target.side!=="player")return false;
            const id=this._rituals.familiars_vigil?"familiars_vigil":this._rituals.protection_ward?"protection_ward":null;
            if(!id)return false;delete this._rituals[id];
            events.push({type:"support",kind:"ritual",actorName:"The altar",attackName:id==="familiars_vigil"?"Familiar's Vigil":"Warding",targetKey:target.key,targetName:target.name,targetHealth:target.health,targetWard:target.temporaryWard+target.innateWard,effectText:"Absorbs the entire hit, then disappears."});
            return true;
        }
        _mercy(target,events){
            if(target.side!=="player"||target.health>0)return false;
            const survived=!target.reanimated&&this._random()<.5;target.deathSaveSurvived=survived;
            if(survived||!this._rituals.veil_of_mercy)return false;
            delete this._rituals.veil_of_mercy;target.health=1;target.mercyRescued=true;target.mercyStatsApplied=true;
            target.lastingInjuries=(target.lastingInjuries||0)+1;target.dodgeChance=Math.max(0,(Number(target.dodgeChance)||0)-.02);target.speed*=.97;
            events.push({type:"mercy",kind:"ritual",targetKey:target.key,targetName:target.name,targetHealth:1,text:`Veil of Mercy: ${target.name} survives at 1 HP with a serious wound.`});return true;
        }
```

### Exact runtime XP and check compatibility settings

```json
{
  "questXp": {
    "basePerMember": 50,
    "openSlotBonus": 0,
    "totalCap": 1000,
    "maxPartySize": 5
  },
  "legacyDefaultXp": {
    "basePerMember": 60,
    "openSlotBonus": 30,
    "totalCap": 300,
    "maxPartySize": 5
  },
  "checkConfig": {
    "standardDCs": {
      "easy": 8,
      "ordinary": 11,
      "difficult": 14,
      "severe": 17,
      "exceptional": 20
    },
    "modifiers": {
      "classExpertise": 3,
      "relevantTrait": 1,
      "leadership": 2,
      "wounded": -2,
      "equipment": 1
    },
    "natural1AlwaysFails": true,
    "natural20AlwaysSucceeds": true,
    "deathSaveDC": 14,
    "woundedContinuationHpRatio": 0.2,
    "contractDanger": {
      "cautious": {
        "danger": -2,
        "interruptionMin": -1,
        "interruptionMax": -1,
        "reward": 0.8,
        "arcana": 0.8,
        "eliteChance": 0.5
      },
      "standard": {
        "danger": 0,
        "interruptionMin": 0,
        "interruptionMax": 0,
        "reward": 1,
        "arcana": 1,
        "eliteChance": 1
      },
      "perilous": {
        "danger": 2,
        "interruptionMin": 1,
        "interruptionMax": 1,
        "reward": 1.3,
        "arcana": 1.35,
        "eliteChance": 1.5
      }
    }
  }
}
```

### Exact current identity/name data

```json
{
  "version": 1,
  "names": {
    "barbarian": {
      "male": [
        "Bram",
        "Tor",
        "Ulric",
        "Gunn",
        "Rolf",
        "Hakon",
        "Sten",
        "Bjorn",
        "Eirik",
        "Korr"
      ],
      "female": [
        "Hilda",
        "Runa",
        "Kara",
        "Bera",
        "Astrid",
        "Freya",
        "Sigrid",
        "Ylva",
        "Thora",
        "Vala"
      ]
    },
    "knight": {
      "male": [
        "Alden",
        "Gareth",
        "Leon",
        "Roland",
        "Cedric",
        "Oswin",
        "Tristan",
        "Percival",
        "Hugo",
        "Edric"
      ],
      "female": [
        "Ada",
        "Celia",
        "Elise",
        "Mira",
        "Vera",
        "Isolde",
        "Sabine",
        "Helena",
        "Lenora",
        "Rosamund"
      ]
    },
    "ranger": {
      "male": [
        "Rowan",
        "Orin",
        "Hollis",
        "Linden",
        "Alder",
        "Flint",
        "Reed",
        "Sylvan",
        "Hawke",
        "Fen"
      ],
      "female": [
        "Cora",
        "Aster",
        "Bryn",
        "Fern",
        "Kestrel",
        "Linn",
        "Wren",
        "Sylva",
        "Hazel",
        "Juniper"
      ]
    },
    "rogue": {
      "male": [
        "Jory",
        "Quill",
        "Vex",
        "Kit",
        "Finn",
        "Corvin",
        "Dax",
        "Locke",
        "Rook",
        "Jace"
      ],
      "female": [
        "Nia",
        "Rhea",
        "Sable",
        "Nell",
        "Tess",
        "Lysette",
        "Nyx",
        "Vesper",
        "Faye",
        "Zinnia"
      ]
    },
    "mage": {
      "male": [
        "Marek",
        "Soren",
        "Elwin",
        "Rune",
        "Alaric",
        "Caelum",
        "Dorian",
        "Emrys",
        "Lucan",
        "Valen"
      ],
      "female": [
        "Esme",
        "Iris",
        "Lyra",
        "Selene",
        "Talia",
        "Zora",
        "Elara",
        "Celeste",
        "Iona",
        "Opal"
      ]
    },
    "cleric": {
      "male": [
        "Dev",
        "Galen",
        "Benedict",
        "Ansel",
        "Tobias",
        "Lucius",
        "Pascal",
        "Simeon",
        "Amos",
        "Oren"
      ],
      "female": [
        "Cassia",
        "Pella",
        "Alma",
        "Dawn",
        "Hope",
        "Lucia",
        "Seren",
        "Mercy",
        "Verity",
        "Clara"
      ]
    }
  }
}
```

## 25. Source manifest, asset inventory and bundle contents

The following SHA-256 manifest identifies the game source/data snapshot reviewed here. It excludes personal saves. Supporting audit JSON contains all per-quest/level/gear cells and every ritual pair; runtime snapshot JSON contains every custom data catalogue, all dialogue/notes, synthetic state examples, exact exported config, full asset path/size inventory and this manifest.

| File | Bytes | Lines | SHA-256 |
| --- | --- | --- | --- |
| package.json | 266 | 12 | 756a373511e1af61ea33f374cf71ed7e12b874064e9c7ee209c81cbfd0cb576d |
| index.html | 720 | 18 | d3117f27189851c208bddd26b02855c6b480bad56931a1d70afdbbcd384b6464 |
| css/game.css | 2188 | 117 | 8e5e86cbbcb404236ac17015538fd2e0a2b64467bf0a30dca2603def0d67c1ac |
| js/plugins.js | 668 | 10 | e2e6bf245a09670462314ef1d0a1574f836edfd712871966b9b4f86d86ed6ecf |
| js/main.js | 5272 | 165 | 18906acda87d8aee631613b148a8fadfb80e819fc629da6c8a9fee31fdfcfebf |
| js/focus_companion.js | 9139 | 73 | 81850ba781fd5517a4f9b5fa8cec80721c20bc69c93d6fc9bcea09d3675d3e39 |
| js/focus_timer_widget.js | 289 | 4 | 291850cdbf818d0f548320224c6322c0e36fb5076f805e9ec07a34a1795fae2f |
| js/focus_timer.html | 1317 | 6 | 6b98923c4dfe283ce5354595460e8777c2d0caf393d3ab8c68c1b6b343f0fa9b |
| js/plugins/RPGManager.js | 311043 | 3487 | 840a0de06a710ae9459f122a315754c8e23d6afe904a7d876128c9e97963c1f3 |
| js/plugins/RPGManagerBattle.js | 53707 | 665 | f8d9f6ab7ba778a1982270702aba5f2eafa6e33a4c41860e381351b41f9e8d81 |
| js/plugins/RPGManagerBattleStage.js | 41082 | 439 | eb03dbf4f15830f435f13270f33217931c68f69e7243ee932f4ace67ede6375b |
| js/plugins/RPGManagerProgression.js | 211986 | 2120 | 0fab48ba3111d45bdc59a0499f008c88676bed6e597753ea2931d3a2b4adacba |
| data/RPGManagerArtV4.json | 56619 | 2114 | 827acb9f8b69e0bd78f66edefe0bb64c8f7015b00b8cc2df93071dc36d1fbd0f |
| data/RPGManagerArtV5.json | 48075 | 2306 | f7f28395e8810ed20b52ef0ff476a1b68230cbae1a46fabec0d29271dc14a462 |
| data/RPGManagerClasses.json | 21666 | 1035 | 47cb827cc3410777a9df0534406b8a0b34d40b5f0cd683c8bf9e0b82317b8fa6 |
| data/RPGManagerDialogue.json | 13970 | 514 | ab57f0c235cb7271fc0a469fe450c1d18ac9390a516f2fa437b21631b84b0858 |
| data/RPGManagerEnemyTeam.json | 1348 | 6 | a95bf3402ed2e09c171b719b686150d2eb2fb3c07ce845770acb76703e7f2d6b |
| data/RPGManagerIdentity.json | 2654 | 162 | 3f0e23009ec9cf189864647ce041db9db0536b7b09d966dc731dc9761925d074 |
| data/RPGManagerNarratives.json | 152119 | 4310 | cd89781e7f1788b5c1e67c585bfd8d50505d9d9b8fa974334bc9c842a7d09e3b |
| data/RPGManagerPresentation.json | 1334 | 32 | 7558435643bf9ebff510e3880d9da513fef757c0e7b0e94b76db25bf9447e464 |
| data/RPGManagerQuests.json | 52546 | 2153 | 514b3ca300ebf696e6d3a95953d3c6ce6f248a3b3b462206b4447587bd9b1077 |
| data/RPGManagerRoster.json | 5200 | 243 | c44469199445c9d4cee359e0103a3e2222af63e33aec73bd4f8a8d08b35dc6c8 |
| data/RPGManagerSkeletonArtV7.json | 51113 | 2307 | a3ccd7a7513bf72c28a1fc4963dfacc6b34d7827999c29b891b0106faa388c46 |
| data/RPGManagerStage3.json | 145098 | 4995 | ee324f9ce8debbc4ff2f4a71eed0ae168d8931716c2164dae802f2c859dbbe8b |
| data/RPGManagerUI.json | 1298 | 61 | 7381b65a6c0d2e34293b2bd54718dbf0d54a7d4e5a2d8980fca12b025115c25a |

| Asset root | Files | Bytes |
| --- | --- | --- |
| img | 1112 | 230006703 |
| audio | 449 | 39658752 |
| effects | 175 | 2764671 |
| fonts | 2 | 1014504 |
| movies | 0 | 0 |
| icon | 1 | 4931 |

Raw game images/audio are represented by inventory and their runtime paths; the ZIP includes selected contact sheets/screenshots for visual context, not the entire bulk asset library. All custom source and all database JSON are included so ChatGPT can verify mechanics and text. Standard distributed engine code is included for integration context. Historical backup trees and personal saves are excluded.

The next sprint should be proposed against this dated state. Rerun the builder/audits after gameplay changes; old aggregate tables and historical “all tests passed” statements must not silently become acceptance evidence for new mechanics.
