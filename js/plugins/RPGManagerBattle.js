/*:
 * @target MZ
 * @plugindesc Stage 2: deterministic role-aware strategy and automatic battle simulation.
 * @author RPG Manager
 * @help RPGManagerBattle.js
 * Load before RPGManager.js. This file has no RPG Maker or DOM dependencies.
 * Browser API: RPGManagerBattle.Battle. Node API: require(...).Battle.
 *
 * const battle = new RPGManagerBattle.Battle(playerTeam, enemyTeam, {
 *     seed: 123, maxActions: 600
 * });
 * battle.step() advances one living fighter's turn and returns new events.
 * battle.snapshot() returns an independent copy of the current battle state.
 * battle.events returns an independent copy of the complete event log.
 * A finished battle's step() returns [] without changing state.
 *
 * Each team must contain 1-5 distinct living NPCs using the roster schema.
 * All input data is copied; battle damage never changes the roster.
 * The same NPC id can appear on opposing teams: keys include the team's side.
 * Snapshot: {status, round, actions, seed, fighters}. Status is running,
 * victory, defeat, or draw, always from the player's perspective. Each fighter
 * keeps its NPC fields and adds key, side, and cooldown.
 *
 * Each round orders living fighters by descending speed; ties use a seeded
 * random draw. Defeated fighters lose remaining turns. Centralized readable
 * target scores combine threat, role, health, protection, and focus factors.
 * Equal target scores use a stable seed/key hash and never Math.random.
 * Damage = round(2 * (attack * random(0.9..1.1) * multiplier - defense * 0.5)),
 * with minimum 1, capped at the target's remaining health for the log.
 * Basic multiplier = 1; Signature multiplier = 1.65.
 * Stage 1: double the post-defense damage on BOTH sides before rounding.
 * Minimum damage remains 1. HP, targeting and persistent stats are unchanged.
 * Signatures start ready. After a Signature, the next three personal turns
 * use Basic Attacks and reduce cooldown 3 -> 2 -> 1 -> 0. Then Signature
 * becomes available again. Stage 2 prepared signatureMove data overrides the
 * multiplier/cooldown for that fighter. Enemies/legacy inputs retain defaults.
 * Progression prepares trait, injury, bond, and equipment modifiers.
 * options.strategy: Tactical (default), Aggressive, Defensive, or Support.
 * setStrategy(name) returns strategy events; switches share a six-action
 * cooldown enforced here. Both sides count toward cooldown, never UI time.
 * Aggressive: player attack power x1.25, incoming damage x1.15.
 * Defensive: player attack power x0.85, incoming damage x0.75.
 * Tactical/Support: normal damage. Strategy primarily changes target behavior.
 *
 * Structured events: round (initiative order), attack (names, keys, sides,
 * kind, attackName, actual damage, remaining HP, actor cooldown), defeat,
 * and result (outcome plus elimination or action-limit reason).
 * Elimination ends the battle immediately. The default 600-action limit
 * produces an explicit draw if unusually edited stats prevent a timely end.
 * Supply a numeric integer seed to reproduce a fight, or omit it for a
 * time-based seed. No animations, UI, rewards, or progression live here.
 */

(() => {
    "use strict";

    const copy = value => JSON.parse(JSON.stringify(value));
    const MIN_TEAM_SIZE = 1;
    const MAX_TEAM_SIZE = 5;
    const SIGNATURE_COOLDOWN = 3;
    // One tuning surface for every consequential roll. Keep d20 modifiers small.
    const CHECK_CONFIG = Object.freeze({
        standardDCs: Object.freeze({ easy: 8, ordinary: 11, difficult: 14, severe: 17, exceptional: 20 }),
        modifiers: Object.freeze({ classExpertise: 3, relevantTrait: 1, leadership: 2, wounded: -2, equipment: 1 }),
        natural1AlwaysFails: true, natural20AlwaysSucceeds: true, deathSaveDC: 14,
        woundedContinuationHpRatio: 0.2,
        contractDanger: Object.freeze({
            cautious: Object.freeze({ danger: -2, interruptionMin: -1, interruptionMax: -1, reward: 0.8, arcana: 0.8, eliteChance: 0.5 }),
            standard: Object.freeze({ danger: 0, interruptionMin: 0, interruptionMax: 0, reward: 1, arcana: 1, eliteChance: 1 }),
            perilous: Object.freeze({ danger: 2, interruptionMin: 1, interruptionMax: 1, reward: 1.3, arcana: 1.35, eliteChance: 1.5 })
        })
    });
    const STRATEGIES = Object.freeze(["Aggressive", "Defensive", "Tactical", "Support"]);
    const COMBAT_ROLES = Object.freeze({ FRONTLINE: "FRONTLINE", BACKLINE: "BACKLINE", SUPPORT: "SUPPORT", FLANKER: "FLANKER" });
    // Centralized, intentionally small tuning table for inspectable target AI.
    const TARGET_WEIGHTS = Object.freeze({
        Aggressive: Object.freeze({ threat: 0.35, lowHp: 1.1, highValue: 28, focus: 8, previous: 8, protect: 0, penetrator: 0 }),
        Defensive: Object.freeze({ threat: 0.75, lowHp: 0.15, highValue: 4, focus: 0, previous: 18, protect: 120, penetrator: 65 }),
        Tactical: Object.freeze({ threat: 1.2, lowHp: 0.25, highValue: 30, focus: 34, previous: 14, protect: 0, penetrator: 0 }),
        Support: Object.freeze({ threat: 0.55, lowHp: 0.15, highValue: 12, focus: 6, previous: 14, protect: 135, penetrator: 45 })
    });
    const CLASS_INTERACTION_TAGS = Object.freeze({
        barbarian: ["force", "intimidation"], knight: ["force", "protection"], rogue: ["locks", "stealth"],
        mage: ["arcane"], mystic: ["arcane", "ritual"],
        duelist: ["locks", "stealth"], skirmisher: ["traps", "stealth"], ranger: ["traps", "wilderness"],
        vanguard: ["force", "intimidation"], bruiser: ["force", "intimidation"], guardian: ["force", "protection"], brawler: ["force", "intimidation"],
        cleric: ["ritual", "care"], support: ["care"], bard: ["influence", "lore"],
        worker: ["labor", "repair", "carrying", "gathering"]
    });
    const INTERACTION_DEFINITIONS = Object.freeze({
        arcane_scroll: Object.freeze({ id: "arcane_scroll", name: "Unstable Arcane Scroll", requiredTags: ["arcane"],
            failure: "No eligible Mage or arcane specialist can decipher the scroll.",
            actions: [
                { id: "unleash", name: "Unleash its power", aligns: "take_risks", traits: ["reckless"] },
                { id: "seal", name: "Seal it safely", aligns: "avoid_risks", traits: ["disciplined", "cautious"] },
                { id: "extract", name: "Extract its valuables", aligns: "greed", traits: ["greedy"] },
                { id: "study", name: "Study its mysteries", aligns: "exploration", traits: ["curious"] }
            ] }),
        perilous_route: Object.freeze({ id: "perilous_route", name: "Perilous Route", requiredTags: [],
            actions: [
                { id: "charge", name: "Take the dangerous shortcut", aligns: "take_risks", traits: ["reckless"] },
                { id: "detour", name: "Choose the protected road", aligns: "avoid_risks", traits: ["cautious"] },
                { id: "loot", name: "Search the abandoned wagons", aligns: "greed", traits: ["greedy"] },
                { id: "scout", name: "Explore the hidden trail", aligns: "exploration", traits: ["curious"] }
            ] }),
        sealed_lock: Object.freeze({ id: "sealed_lock", name: "Smuggler's Sealed Lock", requiredTags: ["locks"],
            failure: "The party cannot identify a safe way through the lock and leaves it sealed.",
            actions: [
                { id: "force_lock", name: "Risk forcing the mechanism", aligns: "take_risks", traits: ["reckless"] },
                { id: "mark_lock", name: "Mark it and move on", aligns: "avoid_risks", traits: ["cautious"] },
                { id: "empty_cache", name: "Empty the hidden cache", aligns: "greed", traits: ["greedy"] },
                { id: "trace_passage", name: "Trace the concealed passage", aligns: "exploration", traits: ["curious"] }
            ] }),
        collapsed_causeway: Object.freeze({ id: "collapsed_causeway", name: "Collapsed Causeway", requiredTags: ["labor"],
            failure: "Without a skilled laborer, the party cannot safely move the fallen stone and abandons the opportunity.",
            actions: [
                { id: "brace_crossing", name: "Brace a dangerous crossing", aligns: "take_risks", traits: ["reckless"] },
                { id: "repair_road", name: "Repair a safe route", aligns: "avoid_risks", traits: ["disciplined", "cautious"] },
                { id: "salvage_stone", name: "Salvage the road crew's cache", aligns: "greed", traits: ["greedy"] },
                { id: "excavate_marker", name: "Excavate the buried waystone", aligns: "exploration", traits: ["curious"] }
            ] })
    });

    function combatRoleFor(fighter = {}) {
        const value = `${fighter.classId || ""} ${fighter.role || ""}`.toLowerCase();
        if (/support|bard|cleric|healer|priest/.test(value)) return COMBAT_ROLES.SUPPORT;
        if (/ranger|mage|mystic|archer|marksman|necromancer|hexer|caster/.test(value)) return COMBAT_ROLES.BACKLINE;
        if (/duelist|skirmisher|raider|assassin|rogue/.test(value)) return COMBAT_ROLES.FLANKER;
        return COMBAT_ROLES.FRONTLINE;
    }

    function targetPriority(actor, target, strategy, context = {}) {
        const weights = TARGET_WEIGHTS[strategy] || TARGET_WEIGHTS.Tactical;
        const role = target.combatRole || combatRoleFor(target);
        const hpRatio = target.maxHealth > 0 ? target.health / target.maxHealth : 0;
        const factors = {
            threat: (target.attack * 2 + target.speed + (target.cooldown === 0 ? 12 : 0)) * weights.threat,
            lowHp: (1 - hpRatio) * 100 * weights.lowHp,
            highValue: [COMBAT_ROLES.BACKLINE, COMBAT_ROLES.SUPPORT].includes(role) ? weights.highValue : 0,
            focus: context.focus ? weights.focus : 0,
            previous: context.previous ? weights.previous : 0,
            protect: context.protect ? weights.protect : 0,
            penetrator: context.penetrator ? weights.penetrator : 0
        };
        const score = Object.values(factors).reduce((sum, value) => sum + value, 0);
        let reason = "high threat";
        if (factors.protect > 0) reason = actor.combatRole === COMBAT_ROLES.SUPPORT ? "assist vulnerable ally" : "protect ally";
        else if (strategy === "Aggressive" && hpRatio < 0.75) reason = "low HP target";
        else if (strategy === "Defensive") reason = factors.penetrator ? "intercept nearby threat" : "hold formation";
        else if (factors.focus > factors.highValue && factors.focus > 0) reason = "coordinated focus";
        else if (factors.highValue > 0) reason = "high-value target";
        else if (strategy === "Support" && actor.combatRole !== COMBAT_ROLES.SUPPORT) reason = "normal attack";
        return { score, reason, factors };
    }

    function stableTie(seed, key) {
        let value = (2166136261 ^ seed) >>> 0;
        for (let i = 0; i < key.length; i++) value = Math.imul(value ^ key.charCodeAt(i), 16777619) >>> 0;
        return value;
    }

    const d20 = (seed, key) => stableTie(seed >>> 0, key) % 20 + 1;
    let debugNextRoll = null;
    function setDebugNextD20(value) {
        debugNextRoll = value == null ? null : Math.max(1, Math.min(20, Math.floor(Number(value) || 1)));
        return debugNextRoll;
    }
    function resolveD20Check(input = {}) {
        const seed = Number.isSafeInteger(input.seed) ? input.seed : 1;
        const key = String(input.key || input.type || "check");
        const forced = input.forcedRoll == null ? debugNextRoll : input.forcedRoll;
        if (input.forcedRoll == null && debugNextRoll != null) debugNextRoll = null;
        const raw = forced == null ? d20(seed, key) : Math.max(1, Math.min(20, Math.floor(forced)));
        const modifiers = (Array.isArray(input.modifiers) ? input.modifiers : []).map(entry => ({
            source: String(entry.source || "Context"), value: Math.max(-3, Math.min(5, Math.trunc(Number(entry.value) || 0)))
        })).filter(entry => entry.value !== 0);
        const modifierTotal = modifiers.reduce((sum, entry) => sum + entry.value, 0);
        const dc = Number.isFinite(input.dc) ? Math.trunc(input.dc) : CHECK_CONFIG.standardDCs.ordinary;
        const natural1 = raw === 1, natural20 = raw === 20;
        let success = raw + modifierTotal >= dc;
        if (natural1 && CHECK_CONFIG.natural1AlwaysFails) success = false;
        if (natural20 && CHECK_CONFIG.natural20AlwaysSucceeds) success = true;
        return Object.freeze({
            type: String(input.type || "check"), actorId: input.actor?.id || input.actorId || null,
            actorName: input.actor?.name || input.actorName || null, targetId: input.target?.id || input.targetId || null,
            targetName: input.target?.name || input.targetName || null, hiddenDC: !!input.hiddenDC,
            revealOutcome: input.revealOutcome !== false, dc, raw, modifiers: Object.freeze(modifiers), modifierTotal,
            total: raw + modifierTotal, success, natural1, natural20,
            critical: natural20 ? "natural20" : natural1 ? "natural1" : null,
            consequence: input.consequence || null, key, seed
        });
    }
    function interactionTags(adventurer) { return [...new Set([...(CLASS_INTERACTION_TAGS[adventurer.classId] || []), ...(adventurer.interactionTags || [])])]; }
    function resolveAutonomousDecision(team, interactionInput, order = "exploration", seed = 1, context = {}) {
        const interaction = typeof interactionInput === "string" ? INTERACTION_DEFINITIONS[interactionInput] : interactionInput;
        if (!interaction || !Array.isArray(interaction.actions)) throw new Error("Unknown autonomous interaction.");
        const required = interaction.requiredTags || [];
        const eligible = team.filter(actor => actor?.alive !== false && actor.health > 0 && required.every(tag => interactionTags(actor).includes(tag)));
        if (!eligible.length) return { resolved: false, interactionId: interaction.id, eligibleIds: [], message: interaction.failure || "No adventurer is eligible.", debug: { requiredTags: required } };
        const leaderScores = eligible.map(actor => {
            const traits = [], relevance = required.filter(tag => interactionTags(actor).includes(tag)).length;
            const roll = d20(seed, `leader:${interaction.id}:${actor.id}`);
            const orderAffinity = (order === "take_risks" && traits.includes("reckless") || order === "avoid_risks" && traits.includes("cautious") ||
                order === "greed" && traits.includes("greedy") || order === "exploration" && traits.includes("curious")) ? 3 : 0;
            const factors = { leadership: (actor.leadership || 1) * 3, relevance: relevance * 7,
                condition: Math.round(3 * actor.health / actor.maxHealth), disciplined: traits.includes("disciplined") ? 3 : 0,
                stubborn: traits.includes("stubborn") ? 2 : 0, orderAffinity, bonds: (context.bondCounts?.[actor.id] || 0) * 1.5, roll };
            return { actor, score: Object.values(factors).reduce((a, b) => a + b, 0), factors };
        }).sort((a, b) => b.score - a.score || stableTie(seed, a.actor.id) - stableTie(seed, b.actor.id));
        const leader = leaderScores[0], traits = [];
        const obedienceCheck = resolveD20Check({ type: "obedience", actor: leader.actor, dc: 12, seed,
            key: `obey:${interaction.id}:${leader.actor.id}:${order}`, modifiers: [
                { source: "Leadership", value: Math.floor((leader.actor.leadership || 1) / 2) },
                { source: "Disciplined", value: traits.includes("disciplined") ? 3 : 0 },
                { source: "Loyal", value: traits.includes("loyal") ? 1 : 0 },
                { source: "Stubborn", value: traits.includes("stubborn") ? -3 : 0 },
                { source: "Reckless vs Avoid Risks", value: order === "avoid_risks" && traits.includes("reckless") ? -4 : 0 },
                { source: "Greedy vs Order", value: order !== "greed" && traits.includes("greedy") ? -2 : 0 }
            ] });
        const obedienceRoll = obedienceCheck.raw;
        const obedienceModifier = Math.floor((leader.actor.leadership || 1) / 2) + (traits.includes("disciplined") ? 3 : 0) +
            (traits.includes("loyal") ? 1 : 0) - (traits.includes("stubborn") ? 3 : 0) -
            (order === "avoid_risks" && traits.includes("reckless") ? 4 : 0) - (order !== "greed" && traits.includes("greedy") ? 2 : 0);
        const obeyed = obedienceCheck.success;
        const actionScores = interaction.actions.map(action => {
            const factors = { order: action.aligns === order ? (obeyed ? 12 : 2) : 0,
                personality: (action.traits || []).filter(trait => traits.includes(trait)).length * 8,
                leadership: obeyed && action.aligns === order ? (leader.actor.leadership || 1) : 0,
                roll: d20(seed, `action:${interaction.id}:${leader.actor.id}:${action.id}`) / 4 };
            return { action, score: Object.values(factors).reduce((a, b) => a + b, 0), factors };
        }).sort((a, b) => b.score - a.score || a.action.id.localeCompare(b.action.id));
        const action = actionScores[0];
        const reasons = [];
        if (obeyed) reasons.push(`followed the ${order.replace(/_/g, " ")} Order`); else reasons.push("the obedience roll was too low");
        for (const trait of traits) if ((action.action.traits || []).includes(trait)) reasons.push(`${trait} personality`);
        if (required.length) reasons.push(`${leader.actor.role || leader.actor.classId} expertise`);
        return { resolved: true, interactionId: interaction.id, eligibleIds: eligible.map(a => a.id), leaderId: leader.actor.id,
            leaderName: leader.actor.name, order, obedienceRoll, obedienceModifier, obedienceCheck, obeyed, actionId: action.action.id,
            actionName: action.action.name, reasons: reasons.slice(0, 3),
            summary: `${leader.actor.name} ${obeyed ? "obeys" : "ignores"} the Order and chooses: ${action.action.name}.`,
            debug: { requiredTags: required, leaderScores: leaderScores.map(x => ({ id: x.actor.id, score: x.score, factors: x.factors })), actionScores: actionScores.map(x => ({ id: x.action.id, score: x.score, factors: x.factors })) } };
    }

    function resolveLeaderDecision(team, leaderId, interactionInput, seed = 1) {
        const interaction = typeof interactionInput === "string" ? INTERACTION_DEFINITIONS[interactionInput] : interactionInput;
        if (!interaction || !Array.isArray(interaction.actions)) throw new Error("Unknown leader interaction.");
        const leader = team.find(actor => actor?.id === leaderId && actor.alive !== false && actor.health > 0) || team.find(actor => actor?.alive !== false && actor.health > 0);
        if (!leader) return { resolved: false, leaderId: null, message: "No living party leader can decide." };
        const traits = [];
        const mapping = { cautious: ["cautious", "disciplined"], bold: ["reckless"], compassionate: ["merciful", "loyal"], selfish: ["greedy", "cruel"], practical: ["disciplined", "stubborn"], curious: ["curious"] };
        const scored = interaction.actions.map(action => {
            const tags = action.tags || action.traits || [];
            const personality = tags.reduce((sum, tag) => sum + (mapping[tag] || [tag]).filter(trait => traits.includes(trait)).length * 8, 0);
            const expertise = (interaction.requiredTags || []).filter(tag => interactionTags(leader).includes(tag)).length * 3;
            const roll = d20(seed, `leader-choice:${interaction.id}:${leader.id}:${action.id}`) / 4;
            return { action, score: 10 + personality + expertise + roll, factors: { baseline: 10, personality, expertise, variation: roll } };
        }).sort((a, b) => b.score - a.score || a.action.id.localeCompare(b.action.id));
        const selected = scored[0];
        return { resolved: true, interactionId: interaction.id, leaderId: leader.id, leaderName: leader.name,
            actionId: selected.action.id, actionName: selected.action.name, summary: `${leader.name} decides: ${selected.action.name}.`,
            reasons: [traits.find(trait => (selected.action.tags || selected.action.traits || []).some(tag => (mapping[tag] || [tag]).includes(trait))) ? "personality" : "practical judgment"],
            debug: { selectedActor: leader.id, eligibleActors: team.filter(a => a.alive !== false && a.health > 0).map(a => a.id), actionScores: scored.map(x => ({ id: x.action.id, score: x.score, factors: x.factors })) } };
    }

    function validateTeam(team, side) {
        const fail = message => { throw new Error(`RPGManagerBattle ${side}: ${message}`); };
        if (!Array.isArray(team) || team.length < MIN_TEAM_SIZE || team.length > MAX_TEAM_SIZE) {
            fail("Expected 1-5 living NPCs.");
        }
        const ids = new Set();
        for (const npc of team) {
            if (!npc || typeof npc !== "object") fail("Invalid NPC entry.");
            for (const field of ["id", "name", "role", "basicAttack", "signatureAttack"]) {
                if (typeof npc[field] !== "string" || !npc[field].trim()) {
                    fail(`Each NPC needs a nonempty ${field}.`);
                }
            }
            if (ids.has(npc.id)) fail(`Duplicate NPC id: ${npc.id}.`);
            ids.add(npc.id);
            for (const field of ["level", "health", "maxHealth", "attack", "defense", "speed"]) {
                if (!Number.isFinite(npc[field]) || npc[field] < 0) {
                    fail(`${npc.name}: ${field} must be a finite nonnegative number.`);
                }
            }
            if (!Number.isInteger(npc.level) || npc.level < 1) {
                fail(`${npc.name}: level must be a positive integer.`);
            }
            if (npc.alive !== true || npc.health <= 0 || npc.maxHealth < 1 || npc.health > npc.maxHealth) {
                fail(`${npc.name}: expected a living NPC with valid health.`);
            }
            for (const field of ["name", "description"]) {
                if (typeof npc.passiveTrait?.[field] !== "string" || !npc.passiveTrait[field].trim()) {
                    fail(`${npc.name}: passiveTrait needs a ${field}.`);
                }
            }
            if (npc.signatureMove && (!Number.isFinite(npc.signatureMove.multiplier) || npc.signatureMove.multiplier < 1 || npc.signatureMove.multiplier > 3 || !Number.isInteger(npc.signatureMove.cooldown) || npc.signatureMove.cooldown < 1 || npc.signatureMove.cooldown > 6)) fail(`${npc.name}: invalid signature definition.`);
        }
    }

    class Battle {
        constructor(playerTeam, enemyTeam, options = {}) {
            validateTeam(playerTeam, "player");
            validateTeam(enemyTeam, "enemy");
            const seed = options.seed ?? Date.now();
            const maxActions = options.maxActions ?? 600;
            if (!Number.isSafeInteger(seed)) throw new Error("Battle seed must be a safe integer.");
            if (!Number.isSafeInteger(maxActions) || maxActions < 1) {
                throw new Error("Battle maxActions must be a positive safe integer.");
            }
            this._seed = seed >>> 0;
            this._randomState = this._seed;
            this._maxActions = maxActions;
            this._status = "running";
            this._round = 0;
            this._actions = 0;
            this._strategy = "Tactical"; // Deprecated save/input field: combat no longer accepts player tactics.
            this._strategyCooldown = 0;
            this._targetCounts = new Map();
            this._lastTargets = {};
            this._actorLastTargets = {};
            this._focusTargets = {};
            this._signatureUses = {};
            this._rituals=copy(options.ritualEffects||{});
            this._waves = [];this._waveNumber=1;this._queue = [];
            this._events = [];
            this._fighters = [
                ...this._createFighters(playerTeam, "player"),
                ...this._createFighters(enemyTeam, "enemy")
            ];
        }

        _absorbArmor(target,amount){
            const used=Math.min(target.armor||0,amount);target.armor-=used;
            let remaining=used,ritual=Math.min(target.ritualArmor||0,remaining);target.ritualArmor=(target.ritualArmor||0)-ritual;remaining-=ritual;
            if(Number.isFinite(target.classArmor)){const n=Math.min(target.classArmor,remaining);target.classArmor-=n;remaining-=n;}
            for(const id of Object.values(target.equipmentSlots||{})){const c=target.equipmentCondition?.[id];if(!c||c.broken)continue;const n=Math.min(c.current||0,remaining);c.current-=n;remaining-=n;}
            return used;
        }
        _wearEquipment(target,events){
            if(target.side!=="player")return;
            for(const id of Object.values(target.equipmentSlots||{})){
                const item=target.equipmentStats?.[id],c=target.equipmentCondition?.[id];if(!item||!c||c.broken)continue;
                c.hitsRemaining=Math.max(0,(c.hitsRemaining??item.durability)-1);
                if(c.hitsRemaining>0)continue;
                c.broken=true;target.armor=Math.max(0,target.armor-(c.current||0));c.current=0;
                target.maxArmor=Math.max(0,target.maxArmor-item.armor);target.innateWardMax=Math.max(0,(target.innateWardMax||0)-item.ward);target.innateWard=Math.min(target.innateWard,target.innateWardMax);target.maxWard=Math.max(0,target.maxWard-item.ward);
                target.dodgeChance=Math.max(0,(target.dodgeChance||0)-item.dodge/100);target.critChance=Math.max(0,(target.critChance||0)-item.crit/100);
                for(const slot of Object.keys(target.equipmentSlots))if(target.equipmentSlots[slot]===id)target.equipmentSlots[slot]=null;
                delete target.equipmentCondition[id];delete target.equipmentStats[id];
                events.push({type:"gearBroken",side:"player",targetKey:target.key,memberId:target.id,itemId:id,targetArmor:target.armor,targetWard:target.innateWard+target.temporaryWard,text:`Gear Broken: ${target.name}'s ${item.name} wore out and was destroyed. The gear slot is empty.`});
            }
        }
        _createFighters(team, side) {
            const fronts = team.filter(n=>String(n.position||n.preferredPosition||"front").toLowerCase()==="front"), backs=team.filter(n=>!fronts.includes(n));
            const ordered=team; // Canonical input order is shared with travel and saved replay.
            return copy(ordered).map((npc,index) => ({ ...npc, key: `${side}:${npc.id}`, side,
                equipmentWearVersion:31,ritualSignatureLimit:side==="player"&&this._rituals.quickening_prayer&&d20(this._seed,`quickening:${npc.id}`)>=16?2:1,
                formationPosition: String(npc.position||npc.preferredPosition||"front").toLowerCase(),
                innateWard: Math.max(0,Number(npc.innateWard??npc.arcaneArmor??0)||0), temporaryWard:Math.max(0,Number(npc.temporaryWard)||0),
                armor:Math.max(0,Number(npc.armor)||0), maxArmor:Math.max(0,Number(npc.maxArmor??npc.armor)||0),
                maxWard:Math.max(0,Number(npc.innateWardMax??npc.innateWard??npc.arcaneArmor??0)||0)+Math.max(0,Number(npc.temporaryWard)||0), combatRole: combatRoleFor(npc), cooldown: 0, signatureSpent: false, defeatedBy: null }));
        }

        _signatureDecision(actor, target) {
            if (actor.side !== "player") return { use: actor.cooldown === 0 && (actor.signatureUses||0) < Math.min(1,actor.signatureUseLimit||1), roll: null, reasons: ["enemy combat instinct"] };
            if (actor.signatureSpent) return { use: false, roll: null, reasons: ["battle signature already spent"] };
            const traits = [], ratio = actor.health / actor.maxHealth;
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

        // Mulberry32: local deterministic randomness, including when seed is zero.
        _random() {
            this._randomState = (this._randomState + 0x6D2B79F5) >>> 0;
            let value = this._randomState;
            value = Math.imul(value ^ (value >>> 15), value | 1);
            value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        }

        _living(side) {
            return this._fighters.filter(npc => npc.alive && npc.health > 0 && (!side || npc.side === side));
        }

        _startRound(events) {
            this._round++;
            // Draw tie breakers once, rather than using a random sort comparator.
            this._queue = this._living()
                .map((npc, index) => ({ npc, tie: this._random(), index }))
                .sort((a, b) => b.npc.speed - a.npc.speed || a.tie - b.tie || a.index - b.index)
                .map(entry => entry.npc);
            events.push({
                type: "round", round: this._round,
                order: this._queue.map(({ key, name, side, speed }) => ({ key, name, side, speed }))
            });
        }

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

        _finish(outcome, reason, events) {
            if(outcome==="victory"&&this._waves.length){
                const wave=this._waves.shift();this._waveNumber++;
                this._fighters=this._fighters.filter(f=>f.side==="player").concat(this._createFighters(wave.map((n,i)=>({...n,id:`${n.id}_wave${this._waveNumber}_${i}`})),"enemy"));
                this._queue=[];events.push({type:"wave",round:this._round,fighters:copy(this._fighters.map(f=>({...f,ward:f.innateWard+f.temporaryWard}))),text:`Wave ${this._waveNumber}: reinforcements arrive.`});return;
            }
            this._status = outcome;
            events.push({ type: "result", round: this._round, outcome, reason });
        }

        setStrategy(strategy) {
            return [];
        }

        _sprintHit(actor,target,name,events){
            const amount=this._ritualDamage(actor,1),blocked=this._ritualBlock(target,events);let remaining=blocked?0:amount,wardLoss=0,armorLoss=0,damage=0;
            for(const key of ["temporaryWard","innateWard"]){const used=Math.min(target[key]||0,remaining);target[key]-=used;remaining-=used;wardLoss+=used;}
            armorLoss=this._absorbArmor(target,remaining);remaining-=armorLoss;damage=Math.min(target.health,remaining);target.health-=damage;
            if(!blocked)this._wearEquipment(target,events);
            if(this._mercy(target,events))damage=Math.max(0,damage-1);
            events.push({type:"attack",round:this._round,side:actor.side,actorKey:actor.key,actorName:actor.name,targetKey:target.key,targetName:target.name,targetSide:target.side,kind:"signature",secondary:true,attackName:name,damage,wardLoss,armorLoss,targetHealth:target.health,targetArmor:target.armor,targetWard:target.temporaryWard+target.innateWard});
            if(!target.health){target.alive=false;target.defeatedBy={id:actor.id,key:actor.key,name:actor.name,side:actor.side};events.push({type:"defeat",key:target.key,name:target.name,side:target.side,xpReward:target.xpReward});}
        }
        _supportEvent(actor,target,name,events,healing=0,effectText="Next hit reduced by 1."){
            events.push({type:healing?"heal":"support",round:this._round,side:"player",kind:"signature",attackName:name,actorKey:actor.key,actorName:actor.name,targetKey:target.key,targetName:target.name,healing,targetHealth:target.health,targetWard:target.temporaryWard+target.innateWard,effectText});
        }
        _refinementAction(actor,events){
            actor.personalTurns=(actor.personalTurns||0)+1;
            if(actor.suppressedArmorTurns>0&&!--actor.suppressedArmorTurns){actor.armor+=(actor.suppressedArmor||0);actor.suppressedArmor=0;}
            if(actor.venom&&actor.health>1){actor.venom=false;actor.health--;events.push({type:"attack",side:"player",actorKey:actor.venomSource,actorName:"Venom Edge",targetKey:actor.key,targetName:actor.name,targetSide:actor.side,attackName:"Venom Edge",damage:1,targetHealth:actor.health,targetArmor:actor.armor,targetWard:actor.temporaryWard+actor.innateWard,effectText:"Venom fades after one tick; cannot kill."});}
            if(actor.side!=="player")return false;
            const level=actor.level||1,allies=this._living("player"),enemies=this._living("enemy"),vulnerable=allies.slice().sort((a,b)=>a.health/a.maxHealth-b.health/b.maxHealth||(level>=4?(a.armor+a.innateWard+a.temporaryWard)-(b.armor+b.innateWard+b.temporaryWard):0)||a.key.localeCompare(b.key))[0];
            const partyWard=name=>{for(const ally of allies){ally.protected=true;if(actor.classId==="cleric")ally.temporaryWard=Math.max(ally.temporaryWard,1);this._supportEvent(actor,ally,name,events);}};
            if(level>=8&&!actor.capstoneSpent&&(vulnerable.health<=1||vulnerable.health/vulnerable.maxHealth<.3)&&["knight","cleric"].includes(actor.classId)){actor.capstoneSpent=true;partyWard(actor.classId==="knight"?"Last Stand":"Grace");return true;}
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
                if(level>=3&&!actor.signatureSpent){this._spendSignature(actor);vulnerable.protected=true;vulnerable.temporaryWard=Math.max(vulnerable.temporaryWard,level>=7?2:1);this._supportEvent(actor,vulnerable,"Blessing",events,0,"Protects the next hit and grants Ward (2 at level 7).");return true;}
                const period=level>=2?2:3;
                if(!actor.kindWordSpent&&(actor.personalTurns-1)%period===0){actor.kindWordSpent=true;
                    const wounded=allies.filter(n=>n.health<n.maxHealth).sort((a,b)=>a.health/a.maxHealth-b.health/b.maxHealth)[0];
                    if(wounded){const amount=Math.min(wounded.maxHealth-wounded.health,1);actor.renewalSpent=true;wounded.health+=amount;if(level>=5)wounded.temporaryWard=Math.max(wounded.temporaryWard,1);this._supportEvent(actor,wounded,"Kind Word",events,amount,"Restores 1 HP; at level 5 also ensures 1 Ward.");}
                    else{vulnerable.temporaryWard=Math.max(vulnerable.temporaryWard,1);this._supportEvent(actor,vulnerable,"Kind Word",events,0,"No wounded ally: ensures at least 1 temporary Ward.");}
                    return true;
                }
            }
            if(actor.classId==="mage"&&!actor.wardSparkSpent&&level>=3&&(actor.personalTurns-2)%4===0){actor.wardSparkSpent=true;vulnerable.temporaryWard=Math.max(vulnerable.temporaryWard,1);this._supportEvent(actor,vulnerable,"Ward Spark",events,0,"Ensures at least 1 temporary Ward.");return true;}
            return false;
        }
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
            const critChance=Math.max(0,Math.min(.75,(Number(actor.critChance)||0)+(actor.side==="player"&&actor.classId==="ranger"&&actor.level>=2?.02:0)));
            const criticalHit=critChance>0&&this._random()<critChance;
            let rolledDamage = neutralizing ? 0 : Math.max(1, Math.floor(multiplier))*(criticalHit?2:1);
            rolledDamage=this._ritualDamage(actor,rolledDamage);

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
            const armorUsed=this._absorbArmor(target,remaining);remaining-=armorUsed;armorLoss+=armorUsed;
            if(!missed&&!ritualBlocked)this._wearEquipment(target,events);
            let damage=Math.min(target.health,remaining+bypass); target.health=Math.max(0,target.health-damage);if(damage>0)target.tookDamage=true;
            if(this._mercy(target,events))damage=Math.max(0,damage-1);
            if (actor.side === "player" && signature) { this._spendSignature(actor); }
            if (actor.side === "enemy" && signature) actor.signatureUses=(actor.signatureUses||0)+1;
            let effectText=special?(missed?"Special missed; no effect.":special==="ranger"?"Pinned: next attack -1, minimum 1.":special==="rogue"?"Feint attempts a brief Armor suppression.":special==="mage"?"1 damage bypasses defenses; a small burst reaches other enemies.":special==="cleric"?"Holy fallback: no damaged living ally.":special==="barbarian"?"Heavy main hit.":""):"";
            if(!missed){target.lastHitBy=actor.key;
                if(special==="ranger")target.pinned=true;
                if(special==="knight"){const ally=this._living("player").sort((a,b)=>a.health/a.maxHealth-b.health/b.maxHealth)[0];if(ally){ally.protected=true;effectText=`Guard set: ${ally.name}, next hit -1.`;}}
                if(special==="barbarian"&&this._random()<(actor.level>=4?.6:.5)){const other=this._living("enemy").find(n=>n.key!==target.key);if(other){
                    this._sprintHit(actor,other,"Cleave ? sweep",events);
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
                events.push({ type: "defeat", round: this._round, key: target.key, name: target.name, side: target.side, xpReward:target.xpReward });
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

        get events() {
            return copy(this._events);
        }

        snapshot() {
            return copy({
                status: this._status, round: this._round, actions: this._actions,
                strategy: this._strategy, strategyCooldown: this._strategyCooldown,
                seed: this._seed, fighters: this._fighters.map(f=>({...f,ward:f.innateWard+f.temporaryWard}))
                , signatureUses: this._signatureUses,ritualEffects:this._rituals
            });
        }
    }

    const api = { Battle, STRATEGIES, COMBAT_ROLES, TARGET_WEIGHTS, CLASS_INTERACTION_TAGS, INTERACTION_DEFINITIONS,
        NORMAL_WEAK_TARGET_CHANCE:0.35, HIGH_VULNERABLE_TARGET_CHANCE:0.75, BACK_ROW_DODGE_BONUS:0, DODGE_CAP:0.75,
        CHECK_CONFIG, d20, setDebugNextD20, resolveD20Check, combatRoleFor, targetPriority, interactionTags, resolveAutonomousDecision, resolveLeaderDecision };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    globalThis.RPGManagerBattle = api;
})();

