/*:
 * @target MZ
 * @plugindesc Schema 26 progression, open-session jobs and autonomous expeditions.
 * @author RPG Manager
 * @help RPGManagerProgression.js
 * Enable before RPGManager. Pure data rules; rendering only consumes copied events.
 * Five roster slots, one to three companions per quest, one created starting companion.
 * Retired legacy records and active parties retain their history and settlement.
 * Free vacancy hires and confirmed dismissal preserve archived characters.
 * Armor restores on return; settlement saves results/cue.
 * Authored quest durations include travel, encounters, battle and return.
 * Jobs: 1 resource/2 minutes, or 2 in the class specialty. Camp recovers 1 HP/30 seconds.
 * Missions continue in the background only while the game process is open.
 * Camp jobs continue while minimized; closed-process time is excluded.
 * Saved job fractions pause while away or assigned elsewhere; no offline rewards.
 * Battle consequences and rewards settle once; display playback never reapplies them.
 * Legacy party, equipment, history and saved expedition fields remain migratable.
 */
(() => {
    "use strict";
    const copy = value => JSON.parse(JSON.stringify(value));
    const CONDITIONS = Object.freeze({ HEALTHY: "Healthy", WOUNDED: "Wounded", DEAD: "Dead" });
    const conditionOf = npc => !npc || npc.condition === CONDITIONS.DEAD || npc.alive === false ? CONDITIONS.DEAD :
        npc.condition === CONDITIONS.WOUNDED || npc.injury === "Wounded" ? CONDITIONS.WOUNDED : CONDITIONS.HEALTHY;
    const living = npc => !!npc && conditionOf(npc) !== CONDITIONS.DEAD && npc.alive === true && npc.health > 0;
    const LEVEL_CAP = 8;
    const LEGACY_CLASSES = Object.freeze({"vanguard": "knight", "guardian": "knight", "bruiser": "barbarian", "brawler": "barbarian", "duelist": "rogue", "skirmisher": "rogue", "support": "cleric", "bard": "cleric", "mystic": "mage", "worker": "ranger"});
    function classStats(npc) {
        const c=catalogue.classes.find(c=>c.id===(LEGACY_CLASSES[npc.classId]||npc.classId))||catalogue.classes[0];
        const stats={...c.combat,speed:({barbarian:7,knight:5,cleric:6,mage:8,ranger:11,rogue:13}[c.id]||8)};
        for(let level=2;level<=Math.min(8,npc.level||1);level++)for(const [key,value] of Object.entries(c.growth[level]||{}))stats[key]=(stats[key]||0)+value;
        stats.speed+=Math.floor(((npc.level||1)-1)/2);return stats;
    }
    const xpRequired = npc => npc.level >= LEVEL_CAP ? 0 : ({1:60,2:140,3:260,4:420,5:640,6:900,7:1200}[npc.level]||0);
    const pairKey = (a, b) => [a, b].sort().join("|");
    const SEXES = ["male", "female"];
    const RACES = ["human", "dwarf", "elf", "half elf", "half orc", "halfling", "gnome"];
    const STATS = ["maxHealth", "attack", "defense", "speed"];
    const MIN_PARTY_SIZE = 1;
    const MAX_PARTY_SIZE = 3;
    const MAX_ROSTER_SIZE = 5;
    const FOUNDER_IDS = Object.freeze(["ada", "bram", "cora"]);
    const activeSlotIds = state => Array.isArray(state.activeSlots) ? state.activeSlots.slice(0,MAX_ROSTER_SIZE).map(id=>{
        const npc=state.roster.find(n=>n.id===id);
        return npc&&living(npc)&&!npc.dismissed ? id : null;
    }) : FOUNDER_IDS.map(id=>{const npc=state.roster.find(n=>n.id===id);return npc&&living(npc)&&!npc.dismissed?id:null;});
    const activeRoster = state => activeSlotIds(state).map(id=>state.roster.find(n=>n.id===id)).filter(Boolean);
    const fixedRoster = activeRoster;
    const vacantSlots = state => Array.from({length:MAX_ROSTER_SIZE},(_,i)=>i).filter(index=>!activeSlotIds(state)[index]);
    const graveyard = state => state.roster.filter(n=>conditionOf(n)===CONDITIONS.DEAD&&!n.dismissed);
    function normalizeFocusRoster(state) {
        if (!state.trips?.A && state.trips?.B && !state.questResults) {
            state.trips.A=state.trips.B;state.trips.B=null;state.trips.A.lastProgressAtMs=null;
        }
        if(!Array.isArray(state.activeSlots)){
            // Prefer the intended starters, then eligible legacy members in stored order.
            const candidates=[...FOUNDER_IDS.map(id=>state.roster.find(n=>n.id===id)),...state.roster].filter(n=>n&&living(n)&&!n.dismissed&&!n.retired);
            state.activeSlots=[...new Set(candidates.map(n=>n.id))].slice(0,MAX_ROSTER_SIZE);
        }
        const seen=new Set();
        state.activeSlots=Array.from({length:MAX_ROSTER_SIZE},(_,index)=>{const id=state.activeSlots[index],npc=state.roster.find(n=>n.id===id);if(!npc||!living(npc)||npc.dismissed||seen.has(id))return null;seen.add(id);return id;});
        const away=unavailableIds(state);
        for(const npc of state.roster){
            npc.retired=!seen.has(npc.id);
            if(npc.retired&&!npc.retiredReason)npc.retiredReason=npc.dismissed?"dismissed":conditionOf(npc)===CONDITIONS.DEAD?"dead":"legacy_overflow";
            if(!npc.retired){delete npc.retiredReason;npc.focusGearReturned=false;}
            if(npc.retired&&!away.has(npc.id)&&!npc.focusGearReturned){
                normalizeInventory(state);
                for(const slot of ["equipment","equipment2"]){if(npc[slot])state.equipmentStock[npc[slot]]=(state.equipmentStock[npc[slot]]||0)+1;npc[slot]=null;}
                returnSlottedEquipment(state,npc);npc.focusGearReturned=true;
            }
        }
        state.teams||={A:[],B:[]};
        const trip=state.trips?.A,available=activeRoster(state).map(n=>n.id);
        const selected=[...new Set(state.teams.A||[])].filter(id=>available.includes(id)).slice(0,MAX_PARTY_SIZE);
        state.teams.A=trip?(trip.team||trip.preparedTeam||[]).map(n=>n.id):selected.length?selected:available.slice(0,MAX_PARTY_SIZE);
        state.teams.B=[];state.teamIds=state.teams.A.slice();
        state.presentationSpeed="standard";
        state.contractDanger="standard"; // Hidden legacy preferences must not disagree with normal contract previews.
        state.completionAlerts=state.completionAlerts!==false;
        ensureCampJobs(state);
    }
    function consumeCompletionAlert(state){
        const cue=state.completionCue;
        if(!cue?.pending||state.lastCompletionAlertId===cue.questId)return null;
        cue.pending=false;state.lastCompletionAlertId=cue.questId;
        return {questId:cue.questId,enabled:state.completionAlerts!==false};
    }
    function queueEventCue(state,trip,kind,key){
        trip.eventCueKeys ||= {};if(trip.eventCueKeys[key])return;
        trip.eventCueKeys[key]=true;state.eventCues ||= [];
        state.eventCues.push({id:`${trip.id}:${key}`,kind});state.eventCues=state.eventCues.slice(-16);
    }
    function consumeEventCues(state){
        const cues=Array.isArray(state.eventCues)?state.eventCues:[];state.eventCues=[];
        return cues.map(c=>({...c,enabled:state.completionAlerts!==false}));
    }
    const QUEST_HISTORY_LIMIT = 50;
    const SETTLED_TRIP_LIMIT = 50;
    const SCHEMA_VERSION = 31;
    const DM_CONFIG = () => globalThis.RPGManagerBattle?.CHECK_CONFIG || {
        deathSaveDC: 11, woundedContinuationHpRatio: 0.2,
        contractDanger: { cautious: { interruptionMin: -1, interruptionMax: -1, reward: 0.8, arcana: 0.8 }, standard: { interruptionMin: 0, interruptionMax: 0, reward: 1, arcana: 1 }, perilous: { interruptionMin: 1, interruptionMax: 1, reward: 1.3, arcana: 1.35 } }
    };
    const CONTRACT_DANGERS = Object.freeze(["cautious", "standard", "perilous"]);
    const TRAIT_DEFINITIONS = Object.freeze([]);
    const EXPEDITION_ORDERS = Object.freeze([
        Object.freeze({ id: "take_risks", name: "Take Risks", description: "Accept danger when it may produce a stronger result.", legacyStrategy: "Aggressive" }),
        Object.freeze({ id: "avoid_risks", name: "Avoid Risks", description: "Favor survival and dependable routes over bold gains.", legacyStrategy: "Defensive" }),
        Object.freeze({ id: "greed", name: "Greed", description: "Give valuable rewards extra weight when choices arise.", legacyStrategy: "Support" }),
        Object.freeze({ id: "exploration", name: "Exploration", description: "Investigate mysteries and worthwhile detours.", legacyStrategy: "Tactical" })
    ]);
    const DEFAULT_XP_RULES = Object.freeze({ basePerMember: 12, openSlotBonus: 0, totalCap: 36, maxPartySize: 3 });
    const RECRUIT_REFRESH_MS = 60 * 60 * 1000;
    const MAX_CLOCK_ROLLBACK_MS = 5 * 60 * 1000;
    const EVENTS = ["attack", "signature", "allyFalls", "defeat", "death", "victory", "departure", "return", "draw"];
    const BADGE_DEFINITIONS = Object.freeze([]);
    let catalogue, dialogue, identityData={}, narrativeData={};
    const validNow = now => Number.isFinite(now) && now >= 0 ? Math.floor(now) : Date.now();
    const tripForTeam = (state, team) => state.trips?.[team] || null;
    const questUnavailableReason = (state, questId, teamKey = null) => Object.entries(state.trips || {}).some(([key, trip]) =>
        key !== teamKey && trip?.questId === questId) ? "Another team is already handling this quest." : "";
    const unavailableIds = state => new Set(Object.values(state.trips || {}).filter(Boolean).flatMap(trip => trip.team.map(member => member.id)));
    const isUnavailable = (state, id) => unavailableIds(state).has(id);

    function emptyCareer() {
        return { questsParticipated: 0, questsCompleted: 0, victories: 0, kills: 0, damageDealt: 0,
            healingDone: 0, signatureUses: 0, bossVictories: 0, injuriesSuffered: 0, badges: [], lastQuest: null };
    }
    function ensureCareer(npc) {
        const defaults = emptyCareer();
        npc.career = npc.career && typeof npc.career === "object" ? npc.career : {};
        for (const [key, value] of Object.entries(defaults)) {
            if (key === "badges") npc.career.badges = [...new Set(Array.isArray(npc.career.badges) ? npc.career.badges.filter(id => BADGE_DEFINITIONS.some(badge => badge.id === id)) : [])];
            else if (key === "lastQuest") npc.career.lastQuest = npc.career.lastQuest && typeof npc.career.lastQuest === "object" ? npc.career.lastQuest : null;
            else if (!Number.isSafeInteger(npc.career[key]) || npc.career[key] < 0) npc.career[key] = value;
        }
        return npc.career;
    }
    function awardBadges(npc, context = {}) { ensureCareer(npc).badges=[]; return []; }
    function badgeFor(id) { return BADGE_DEFINITIONS.find(badge => badge.id === id) || null; }

    function combatStatistics(team, events = []) {
        const byId = Object.fromEntries(team.map(member => [member.id, { id: member.id, kills: 0, damage: 0, healing: 0, signatures: 0 }]));
        for (const event of Array.isArray(events) ? events : []) {
            if (!event || !["attack", "heal"].includes(event.type) || event.side !== "player") continue;
            const id = typeof event.actorKey === "string" && event.actorKey.startsWith("player:") ? event.actorKey.slice(7) : event.actorId;
            const stats = byId[id]; if (!stats) continue;
            if(event.kind==="signature"&&!event.secondary)stats.signatures++;
            if (event.type === "attack") {
                stats.damage += Math.max(0, Number.isFinite(event.damage) ? Math.floor(event.damage) : 0);
                if (event.targetSide === "enemy" && event.targetHealth === 0) stats.kills++;
            } else stats.healing += Math.max(0, Math.floor(Number(event.healing ?? event.heal ?? event.amount) || 0));
        }
        return byId;
    }

    function validateContent(data, lines) {
        const fail = message => { throw new Error(`Adventurer data: ${message}`); };
        const text = (v, label, max = 80) => {
            if (typeof v !== "string" || !v.trim() || v.length > max || /[\x00-\x1f]/.test(v)) fail(`${label}: use 1-${max} printable characters.`);
        };
        if (!Array.isArray(data?.classes) || data.classes.length !== 6) fail("exactly six approved classes required. ");
        const ids = new Set(), moves = new Set();
        if(!["barbarian","knight","ranger","rogue","mage","cleric"].every(id=>data.classes.some(c=>c.id===id)))fail("Use the six approved class IDs.");
        for (const c of data.classes) {
            for(const key of ["hp","armor","ward","dodge","crit"]){const value=c.combat?.[key];if(!Number.isInteger(value)||value<0||value>(["dodge","crit"].includes(key)?75:99)||key==="hp"&&value<1)fail(`${c.id}: invalid combat baseline ${key}.`);}
            for(const [level,gains] of Object.entries(c.growth||{})){if(!["2","3","4","5","6","7","8"].includes(level))fail("Growth levels must be 2-8.");for(const [key,value] of Object.entries(gains))if(!["hp","armor","ward","dodge","crit","armorRecovery","damage"].includes(key)||!Number.isInteger(value)||value<0)fail("Invalid cumulative class gain.");}
            if (!c || typeof c.id !== "string" || !/^[a-z][a-z0-9_]*$/.test(c.id) || ids.has(c.id)) fail(`duplicate/invalid class ID ${c?.id}.`);
            ids.add(c.id); text(c.name, c.id + " name", 24); text(c.purpose, c.id + " purpose");
            for (const k of STATS) if (!Number.isInteger(c.stats?.[k]) || c.stats[k] < (k === "defense" ? 0 : 1) || c.stats[k] > 999) fail(`${c.id}.${k}: invalid stat (maximum 999).`);
            for (const k of STATS) {
                const r = c.ranges?.[k];
                if (!Array.isArray(r) || r.length !== 2 || r.some(v => !Number.isInteger(v) || v < (k === "defense" ? 0 : 1) || v > 999) || r[0] > r[1] || c.stats[k] < r[0] || c.stats[k] > r[1]) fail(`${c.id}.${k}: range must contain its base stat, with integer min <= max.`);
            }
            if (!Array.isArray(c.moves) || c.moves.length !== 2) fail(`${c.id}: exactly two signatures required.`);
            for (const m of c.moves) {
                if (!m || typeof m.id !== "string" || !/^[a-z][a-z0-9_]*$/.test(m.id) || moves.has(m.id)) fail(`duplicate/invalid move ID ${m?.id}.`);
                moves.add(m.id); text(m.name, m.id + " name", 28); text(m.description, m.id + " description");
                if (!Number.isFinite(m.multiplier) || m.multiplier < 1 || m.multiplier > 3 || !Number.isInteger(m.cooldown) || m.cooldown < 1 || m.cooldown > 6) fail(`${m.id}: multiplier 1-3 and cooldown 1-6 required.`);
            }
        }
        if (!data.defaults || typeof data.defaults !== "object") fail("starter defaults required.");
        for (const [id, d] of Object.entries(data.defaults)) {
            if (!d || typeof d !== "object") fail(`${id}: invalid starter default.`);
            if (!ids.has(d.classId)) fail(`${id}: unknown default class.`);
            if (!SEXES.includes(d.sex) || !RACES.includes(d.race)) fail(`${id}: unsupported sex/race.`);
            if (d.selectedMove && !data.classes.find(c => c.id === d.classId).moves.some(m => m.id === d.selectedMove)) fail(`${id}: unknown selected move.`);
        }
        const validateLine = (v, label) => {
            const line = typeof v === "string" ? v : v?.text;
            text(line, label);
            const tokens = [...line.matchAll(/\{([^{}]+)\}/g)].map(m => m[1]);
            if (/[{}]/.test(line.replace(/\{(speaker|target|ally|move)\}/g, ""))) fail(`${label}: unknown/malformed placeholder.`);
            if (typeof v === "object" && (!Array.isArray(v.requires) || v.requires.some(k => !tokens.includes(k)))) fail(`${label}: missing required placeholder.`);
        };
        for (const event of EVENTS) validateLine(lines?.events?.[event], `fallback ${event}`);
        for (const [id, entries] of Object.entries(lines.classes || {})) {
            if (!ids.has(id)) fail(`dialogue: unknown class ${id}.`);
            for (const [event, line] of Object.entries(entries)) {
                if (!EVENTS.includes(event)) fail(`${id}: unknown dialogue category ${event}.`);
                validateLine(line, `${id}.${event}`);
            }
        }
        for(const [id,pools] of Object.entries(lines.expedition||{})){
            if(id!=="fallback"&&!ids.has(id))fail(`expedition dialogue: unknown class ${id}.`);
            for(const [context,pool] of Object.entries(pools)){
                if(!["travel","clue","battleStart","battleEnd","ability","attack","hit","nearMiss","supplies","return"].includes(context)||!Array.isArray(pool)||!pool.length)fail(`Invalid expedition pool ${id}.${context}.`);
                for(const line of pool)validateLine(line,`${id}.${context}`);
            }
        }
        validateLine(lines.bondedAllyFalls, "bondedAllyFalls");
        for (const [id, line] of Object.entries(lines.characters || {})) validateLine(line, `character ${id}`);
        return true;
    }
    function configure(data, lines, identity=identityData, narratives=narrativeData) { validateContent(data, lines); catalogue = copy(data); dialogue = copy(lines); identityData=copy(identity||{});narrativeData=copy(narratives||{});for(const [id,pairs] of Object.entries(identityData.names||{}))CLASS_NAMES[id]=Array.isArray(pairs.male)?pairs.male.slice():[]; }
    function namePools(){return copy(identityData.names||{});}
    function identityLabel(npc){return classLabel(npc);}
    function questNarrative(trip,context="travel",data=narrativeData){
        const own=Array.isArray(data?.quests?.[trip.questId])?data.quests[trip.questId]:[];
        const pool=own.filter(n=>n&&n.context===context&&typeof n.text==="string"&&n.text.length<=180);
        if(!pool.length){
            const shared=(data?.shared||[]).filter(n=>n&&n.theme==="general"&&typeof n.text==="string"&&n.text.length<=120);
            if(context!=="travel"||!shared.length)return null;
            trip.narrativeUsed ||= {};const index=trip.narrativeUsed[context]||0;trip.narrativeUsed[context]=index+1;
            return {id:`shared:${index%shared.length}`,text:shared[index%shared.length].text,shared:null};
        }
        trip.narrativeUsed ||= {};const index=trip.narrativeUsed[context]||0;trip.narrativeUsed[context]=index+1;const chosen=pool[(Math.floor(stableUnit(`${trip.id||"trip"}:${trip.questId}:${context}:notes`)*pool.length)+index)%pool.length];
        const theme=/forest|herb|goblin|spider|wood/.test(trip.questId)?"forest":/crypt|shrine|tower|gate|cellar|aqueduct|cemetery|observatory/.test(trip.questId)?"stone":/survey|index|circuit/.test(trip.questId)?"survey":"road";const shared=Array.isArray(data?.shared)?data.shared.filter(n=>n&&[theme,"general"].includes(n.theme)&&typeof n.text==="string"&&n.text.length<=120):[];return {id:chosen.id,text:chosen.text,shared:index%4===3&&shared.length?shared[Math.floor(index/4)%shared.length].text:null};
    }
    function xpFieldNote(report,members=[]){
        const xp=Math.max(0,Number(report.xp?.perMember??report.xpPerMember)||0),livingNames=members.filter(n=>n.condition!=="Dead").map(n=>n.name);
        const levels=members.filter(n=>n.levelledUp).map(n=>`${n.name}: level ${n.oldLevel} to ${n.level}`);
        return `XP awarded: ${xp} per expedition member${livingNames.length?` (returning: ${livingNames.join(", ")})`:""}.${levels.length?` Level up! ${levels.join("; ")}.`:""}`;
    }
    function classes() { return copy(catalogue.classes); }
    function classFor(npc) { return catalogue.classes.find(c => c.id === npc.classId); }
    function moveFor(npc) { return classFor(npc)?.moves.find(m => m.id === npc.selectedMove); }
    function say(npc, event, values = {}, bonded = false) {
        if (event === "death" && npc.alive !== false) return "";
        const contextual = npc.health <= 1 && event === "attack" ? `${displayName(npc)}: Still standing.` : npc.foundingMember && event === "departure" ? `${displayName(npc)}: We founded this guild. We bring them home.` : npc.history?.bondedDeaths?.length && event === "allyFalls" ? `${displayName(npc)}: Not another one.` : null;
        if(contextual){npc.history.lastContextLine=contextual;return contextual;}
        const value = (event === "allyFalls" && bonded ? dialogue.bondedAllyFalls : null) || dialogue.classes?.[npc.classId]?.[event] || (event === "signature" && !npc.classId ? dialogue.characters?.[npc.id] : null) || dialogue.events[event] || dialogue.events.signature;
        const line = typeof value === "string" ? value : value?.text || "";
        const fields = { speaker: displayName(npc), target: "our foe", ally: "friend", move: npc.signatureAttack || "Strike", ...values };
        return line.replace(/\{(speaker|target|ally|move)\}/g, (_, key) => String(fields[key]));
    }
    function expeditionLine(trip,context,npc=null){
        const party=(trip.preparedTeam||[]).filter(n=>n.alive!==false&&n.health>0);if(!party.length)return null;
        trip.flavorCount=(trip.flavorCount||0)+1;
        npc=npc||party[(trip.flavorCount-1)%party.length];if(!npc)return null;
        const pool=dialogue.expedition?.[npc.classId]?.[context]||dialogue.expedition?.fallback?.[context]||[];
        if(!pool.length)return null;
        trip.flavorUsed ||= {};const key=`${npc.id}:${context}`,index=(trip.flavorUsed[key]||0)%pool.length;trip.flavorUsed[key]=(trip.flavorUsed[key]||0)+1;
        return {dialogue:pool[index],dialogueSpeakerId:npc.id,dialogueSpeakerName:displayName(npc)};
    }
    function walkingPortrait(classId,sex,key=null){
        const keys=["default","v2:0","v2:1","v2:2","v4:4","v4:5","v4:6","v4:7"],suffix=String(key||"").replace(`${classId}:${sex}:`,"");
        return {sheet:`RPGWalk_${classId}_${sex}_v5`,index:Math.max(0,keys.indexOf(suffix))};
    }
    function portraitOptions(classId,sex){
        if(!ALL_CLASSES.includes(classId)||!SEXES.includes(sex))return [];
        return ["default","v2:0","v2:1","v2:2","v4:4","v4:5","v4:6","v4:7"].map((key,i)=>({key:`${classId}:${sex}:${key}`,sheet:`RPGPortrait_${classId}_v5`,index:i+(sex==="female"?8:0),columns:8,rows:2}));
    }
    function normalizePortrait(npc){
        if(!npc)return;if(npc.reanimated){normalizeUndead(npc);return;}
        const options=portraitOptions(npc.classId,npc.sex);if(!options.length)return;
        const chosen=options.find(p=>p.key===(npc.portraitKey||npc.portrait?.key))||options[0];
        npc.portraitKey=chosen.key;npc.portrait={...chosen};npc.combatPortrait={sheet:`RPGCombat_${npc.classId}_${npc.sex}_${chosen.index%8}_v5`};npc.walkPortrait=walkingPortrait(npc.classId,npc.sex,npc.portraitKey);npc.fallenPortrait={sheet:`RPGFallen_${npc.classId}_${npc.sex}_v5`,index:chosen.index%8,columns:4,rows:2};
    }
    function recruitCreated(state,draft){
        const error=nameError(state,draft?.name),option=portraitOptions(draft?.classId,draft?.sex).find(p=>p.key===draft.portraitKey);
        if(error||!option)return {ok:false,message:error||"Choose a matching class, type and portrait."};
        const candidate=replacementCandidates(state).find(n=>n.classId===draft.classId&&n.sex===draft.sex);
        if(!candidate)return {ok:false,message:"That recruitment category is unavailable."};
        const result=recruitCandidate(state,candidate.id,draft.name);
        if(result.ok){const npc=state.roster.find(n=>n.id===result.npc.id);npc.portraitKey=option.key;npc.portrait={...option};npc.combatPortrait={sheet:`RPGCombat_${npc.classId}_${npc.sex}_${option.index%8}_v5`};npc.walkPortrait=walkingPortrait(npc.classId,npc.sex,npc.portraitKey);normalizePortrait(npc);result.npc=copy(npc);}
        return result;
    }
    function createStartingParty(state,drafts){
        if(!state.startingRosterPending)return {ok:false,message:"Starting party is already confirmed."};
        if(!Array.isArray(drafts)||drafts.length!==1)return {ok:false,message:"Create one starting companion."};
        const used=state.roster.filter(living).map(n=>n.name.toLowerCase()),party=[];
        for(let i=0;i<drafts.length;i++){
            const d=drafts[i],error=nameError(state,d.name),option=portraitOptions(d.classId,d.sex).find(p=>p.key===d.portraitKey);
            if(error)return {ok:false,message:error};
            if(!option)return {ok:false,message:"Choose a portrait matching the class and gender."};
            const name=d.name.trim();if(used.includes(name.toLowerCase()))return {ok:false,message:"Use a different name for each living companion."};used.push(name.toLowerCase());
            const npc=makeCandidate(0,i,d.classId,d.sex);npc.id=FOUNDER_IDS[i];npc.name=name;npc.portrait={...option};npc.portraitKey=option.key;npc.combatPortrait={sheet:`RPGCombat_${npc.classId}_${npc.sex}_${option.index%8}_v5`};npc.walkPortrait=walkingPortrait(d.classId,d.sex,option.key);normalizePortrait(npc);npc.founder=true;npc.foundingMember=true;party.push(npc);
        }
        // All validation precedes mutation; starting creation never consumes Tavern candidates.
        state.roster=party;state.activeSlots=party.map(n=>n.id);state.startingRosterPending=false;
        normalizeFocusRoster(state);replacementCandidates(state);return {ok:true,message:"Your companions are ready."};
    }
    function migrateIdentity(npc, fresh = false, random = Math.random) {
        const d = catalogue.defaults[npc.id] || { classId: "knight", sex: "male", race: "human" };
        if(LEGACY_CLASSES[npc.classId]){
            npc.legacyIdentity ||= {classId:npc.classId,role:npc.role,selectedMove:npc.selectedMove,signatureAttack:npc.signatureAttack,dialogue:copy(dialogue.legacyClasses?.[npc.classId]||{})};
            npc.classId=LEGACY_CLASSES[npc.classId];
        }
        if (!classFor(npc)) npc.classId = d.classId;
        const c = classFor(npc);
        if (!moveFor(npc)) npc.selectedMove = c.moves.some(m => m.id === d.selectedMove) ? d.selectedMove : c.moves[0].id;
        if (!SEXES.includes(npc.sex)) npc.sex = d.sex;
        if (!RACES.includes(npc.race)) npc.race = d.race;
        if (fresh) {
            for (const k of STATS) { const [min, max] = c.ranges[k]; npc[k] = min + Math.floor(random() * (max - min + 1)); }
            npc.health = npc.maxHealth;
            npc.selectedMove = c.moves[Math.floor(random() * c.moves.length)].id;
        }
        npc.classAdjustments ||= Object.fromEntries(STATS.map(k => [k, npc[k] - c.stats[k]]));
        normalizePortrait(npc);
        npc.role = npc.reanimated?`Skeleton ${c.name}`:c.name; npc.signatureAttack = moveFor(npc).name;
        npc.equipment2 ??= null;
        delete npc.stamina;
        migrateAutonomy(npc);
    }
    function traitFor(id) { return TRAIT_DEFINITIONS.find(trait => trait.id === id) || null; }
    function validateTraits(ids) {
        if (!Array.isArray(ids) || ids.length > 2 || new Set(ids).size !== ids.length) return false;
        return ids.every(id => traitFor(id)) && !ids.some(id => traitFor(id).conflicts.some(other => ids.includes(other)));
    }
    function setTraits(npc, ids) {
        if (!validateTraits(ids)) return { ok: false, message: "Choose at most two known, non-conflicting personality traits." };
        npc.personalityTraits = [];
        return { ok: false, message: "Personality traits have been removed." };
    }
    function migrateAutonomy(npc) {
        const seed = [...String(npc.id || npc.name || "adventurer")].reduce((sum, c) => sum + c.charCodeAt(0), 0);
        if (!Number.isInteger(npc.leadership) || npc.leadership < 1 || npc.leadership > 5) npc.leadership = 1 + seed % 5;
        const current = Array.isArray(npc.personalityTraits) ? npc.personalityTraits.filter(id => traitFor(id)) : [];
        const clean = [];
        for (const id of current) if (!clean.includes(id) && clean.length < 2 && !traitFor(id).conflicts.some(other => clean.includes(other))) clean.push(id);
        
        npc.personalityTraits = [];npc.earnedTraits=[];if(npc.career)npc.career.badges=[];
    }
    function orderFor(id) { return EXPEDITION_ORDERS.find(order => order.id === id) || EXPEDITION_ORDERS[3]; }
    function profileError(state, id) {
        if (state.activeQuest || isUnavailable(state, id)) return "This adventurer is away on a quest.";
        if (!living(state.roster.find(n => n.id === id))) return "Only living adventurers can be edited.";
        return "";
    }
    function nameError(state,name,exceptId=null){if(typeof name!=="string"||!name.trim()||name.trim().length>24||/[\x00-\x1f]/.test(name))return "Use 1-24 printable characters.";return state.roster.some(n=>n.id!==exceptId&&living(n)&&!n.retired&&n.name.trim().toLowerCase()===name.trim().toLowerCase())?"That name is already used. Choose another name.":"";}
    const CLASS_NAMES={}; // Compatibility view of data-driven male pools; not an authoring source.
    function randomName(random=Math.random,classId="knight",used=[],sex="male"){
        const pool=(identityData.names?.[classId]?.[sex]||CLASS_NAMES[classId]||CLASS_NAMES.knight||[]).filter(n=>!used.some(value=>String(value).trim().toLowerCase()===n.toLowerCase()));
        return pool.length?pool[Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length))]:"";
    }
    function editProfile(state, id, fields) {
        const error = profileError(state, id);
        if (error) return { ok: false, message: error };
        if (Object.keys(fields).some(k => k !== "name")) return { ok: false, message: "Only the name can be changed. Identity and signature are fixed." };
        if (fields.name !== undefined && (typeof fields.name !== "string" || !fields.name.trim() || fields.name.trim().length > 24 || /[\x00-\x1f]/.test(fields.name))) return { ok: false, message: "Use a name of 1-24 printable characters." };
        if (fields.sex !== undefined && !SEXES.includes(fields.sex) || fields.race !== undefined && !RACES.includes(fields.race)) return { ok: false, message: "Unsupported sex or race." };
        if(fields.name!==undefined&&nameError(state,fields.name,id))return{ok:false,message:nameError(state,fields.name,id)};
        Object.assign(state.roster.find(n => n.id === id), fields, fields.name !== undefined ? { name: fields.name.trim() } : {});
        return { ok: true, message: "Name saved." };
    }
    function classPreview(npc, classId) {
        const c = catalogue.classes.find(c => c.id === classId);
        if (!c) throw new Error("Unknown class.");
        const stats = Object.fromEntries(STATS.map(k => [k, Math.max(k === "defense" ? 0 : 1, c.stats[k] + (npc.classAdjustments?.[k] || 0))]));
        return { ...stats, health: Math.min(npc.health, stats.maxHealth) };
    }
    function chooseClass(state, id, classId, moveId) {
        return { ok: false, message: "Class and signature are fixed for each adventurer." };
    }
    if (typeof window === "undefined" && typeof module !== "undefined" && module.exports) configure(require("../../data/RPGManagerClasses.json"), require("../../data/RPGManagerDialogue.json"),require("../../data/RPGManagerIdentity.json"),require("../../data/RPGManagerNarratives.json"));

    const EQUIPMENT_SLOTS = Object.freeze(["head", "body", "offHand", "accessory"]);
    const BASE_SHOP = {
        potion: Object.freeze({ name: "Potion", price: 10, iconIndex: 176, healing: 2, description: "Restore 2 HP, capped at maximum HP. Does not treat Wounded or permanent injuries." }),
        blade: Object.freeze({ name: "Training Blade", price: 40, type: "weapon", stat: "attack", bonus: 3, legacy: true, description: "Legacy equipment retained for save migration." }),
        guard: Object.freeze({ name: "Leather Guard", price: 40, type: "legacy", stat: "defense", bonus: 3, legacy: true, description: "Legacy equipment retained for save migration." }),
        padded_vest: Object.freeze({ name: "Padded Vest", price: 20, type: "armor", slot: "body", armor: 1, description: "Body armor (1 Armor)." }),
        leather_armor: Object.freeze({ name: "Leather Armor", price: 30, type: "armor", slot: "body", armor: 1, description: "Body armor (1 Armor)." }),
        chainmail: Object.freeze({ name: "Chainmail", price: 60, type: "armor", slot: "body", armor: 2, description: "Body armor (2 Armor)." }),
        plate_armor: Object.freeze({ name: "Plate Armor", price: 110, type: "armor", slot: "body", armor: 3, description: "Body armor (3 Armor)." }),
        leather_cap: Object.freeze({ name: "Leather Cap", price: 20, type: "armor", slot: "head", armor: 1, description: "Head armor (1 Armor)." }),
        iron_helmet: Object.freeze({ name: "Iron Helmet", price: 35, type: "armor", slot: "head", armor: 1, description: "Head armor (1 Armor)." }),
        great_helm: Object.freeze({ name: "Great Helm", price: 70, type: "armor", slot: "head", armor: 2, description: "Head armor (2 Armor)." }),
        buckler: Object.freeze({ name: "Buckler", price: 25, type: "armor", slot: "offHand", armor: 1, description: "Off-hand armor (1 Armor)." }),
        wooden_shield: Object.freeze({ name: "Wooden Shield", price: 30, type: "armor", slot: "offHand", armor: 1, description: "Off-hand armor (1 Armor)." }),
        iron_shield: Object.freeze({ name: "Iron Shield", price: 65, type: "armor", slot: "offHand", armor: 2, description: "Off-hand armor (2 Armor)." }),
        reinforced_cloak: Object.freeze({ name: "Reinforced Cloak", price: 40, type: "armor", slot: "accessory", armor: 1, description: "Accessory armor (1 Armor)." }),
        mage_robes: Object.freeze({ name: "Mage Robes", price: 25, type: "armor", slot: "body", armor: 0, hp:1, description: "Woven spellcaster robes. +1 maximum HP; no healing on equip." }),
        ward_focus: Object.freeze({ name: "Ward Focus", price: 50, type: "armor", slot: "accessory", armor: 1, description: "Protective focus. +1 Armor; replenishes on return." })
    };
    BASE_SHOP.thick_fur_cloak={name:"Thick Fur Cloak",price:18,type:"armor",slot:"body",armor:1,description:"Universal body gear. +1 Armor; replenishes on return."};
    BASE_SHOP.life_giving_amulet={name:"Life-Giving Amulet",price:30,type:"armor",slot:"accessory",armor:0,hp:1,description:"Universal accessory. +1 maximum HP; does not heal on equip."};
    BASE_SHOP.mage_hat={name:"Mage Hat",price:24,type:"armor",slot:"head",armor:1,description:"Mage headgear. +1 Armor."};
    BASE_SHOP.cleric_circlet={name:"Cleric Circlet",price:24,type:"armor",slot:"head",armor:1,description:"Cleric headgear. +1 Armor."};
    const ALL_CLASSES=Object.freeze(["barbarian","knight","ranger","rogue","mage","cleric"]);
    const restrictions={chainmail:["knight","cleric"],plate_armor:["knight"],iron_helmet:["barbarian","knight"],great_helm:["knight"],iron_shield:["knight","cleric"],mage_robes:["mage","cleric"],ward_focus:["mage","cleric"],mage_hat:["mage"],cleric_circlet:["cleric"],blade:["barbarian","knight","ranger","rogue"]};
    const additions=[
 ["owl_hood","Owl Hood","head",0,0,1,0,2],["duelist_hat","Duelist Hat","head",0,0,0,3,2],["sage_crown","Sage Crown","head",0,0,2,0,0],["scout_band","Scout Band","head",0,1,0,2,0],["war_mask","War Mask","head",1,0,0,0,3],
 ["silk_mantle","Silk Mantle","body",0,0,1,4,0],["runic_coat","Runic Coat","body",1,0,1,0,0],["duelist_vest","Duelist Vest","body",0,1,0,4,0],["hunter_coat","Hunter Coat","body",1,0,0,0,4],["pilgrim_robe","Pilgrim Robe","body",0,2,1,0,0],
 ["spellbook","Spellbook","offHand",0,0,2,0,3],["parrying_dagger","Parrying Dagger","offHand",0,0,0,5,3],["lantern","Runic Lantern","offHand",0,1,1,0,0],["thorn_shield","Thorn Shield","offHand",1,0,0,0,5],["prayer_beads","Prayer Beads","offHand",0,2,0,2,0],
 ["cat_charm","Cat Charm","accessory",0,0,0,6,0],["hawk_charm","Hawk Charm","accessory",0,0,0,0,6],["moonstone","Moonstone","accessory",0,0,2,0,0],["ruby_pendant","Ruby Pendant","accessory",0,2,0,0,2],["wind_ring","Wind Ring","accessory",0,0,1,3,1]];
    for(const [id,name,slot,armor,hp,ward,dodge,crit] of additions)BASE_SHOP[id]={name,slot,type:"armor",price:35+armor*20+hp*15+ward*18+dodge*3+crit*3,armor,hp,ward,dodge,crit,description:[armor&&`+${armor} Armor`,hp&&`+${hp} HP`,ward&&`+${ward} Ward`,dodge&&`+${dodge}% Dodge`,crit&&`+${crit}% Critical`].filter(Boolean).join(" / ")};
    // Distinguish older gear with overlapping class/stat profiles.
    BASE_SHOP.leather_armor={...BASE_SHOP.leather_armor,dodge:2,description:"+1 Armor / +2% Dodge"};
    for(const [id,key,bonus] of [["wooden_shield","dodge",1],["thick_fur_cloak","hp",1],["iron_helmet","crit",1],["ward_focus","ward",1],["cleric_circlet","ward",1]]){BASE_SHOP[id]={...BASE_SHOP[id],[key]:bonus,description:BASE_SHOP[id].description+` +${bonus} ${key==='crit'?'% Critical':key==='dodge'?'% Dodge':key.toUpperCase()}.`};}
    // Fixed seeded variation by item, with sturdier body armor and more delicate accessories.
    for(const [id,item] of Object.entries(BASE_SHOP))if(item.type){
        const materialBounds={padded_vest:[12,14],leather_armor:[14,16],chainmail:[17,19],plate_armor:[19,20],leather_cap:[7,10],iron_helmet:[11,14],great_helm:[15,18],buckler:[7,10],wooden_shield:[9,12],iron_shield:[14,17]};
        const bounds=materialBounds[id]||{body:[12,20],head:[8,16],offHand:[7,15],accessory:[5,12]}[item.slot]||[8,16];
        const hash=Array.from(id).reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
        const copyItem={...item,durability:bounds[0]+hash%(bounds[1]-bounds[0]+1)};
        if(copyItem.hp){copyItem.ward=(copyItem.ward||0)+copyItem.hp;copyItem.hp=0;}
        if(copyItem.slot)copyItem.description=[copyItem.armor&&`+${copyItem.armor} Armor`,copyItem.ward&&`+${copyItem.ward} Ward`,copyItem.dodge&&`+${copyItem.dodge}% Dodge`,copyItem.crit&&`+${copyItem.crit}% Critical`].filter(Boolean).join(" / ");
        BASE_SHOP[id]=copyItem;
    }
    const SHOP=Object.freeze(Object.fromEntries(Object.entries(BASE_SHOP).map(([id,item])=>[id,Object.freeze({...item,price:id==="potion"?6:item.price,sellValue:Math.floor((id==="potion"?6:item.price)/2),iconIndex:item.iconIndex||(id==="mage_hat"?130:id==="cleric_circlet"?151:item.slot==="head"?132:item.slot==="body"?131:item.slot==="offHand"?128:148),classes:Object.freeze(restrictions[id]||ALL_CLASSES)})])));
    const compatible=(npc,id)=>!id||!!SHOP[id]?.classes.includes(LEGACY_CLASSES[npc.classId]||npc.classId);
    const itemBoosts=id=>{const i=SHOP[id];return i?[i.armor&&`+${i.armor} Armor`,i.hp&&`+${i.hp} HP`,i.ward&&`+${i.ward} Ward`,i.dodge&&`+${i.dodge}% Dodge`,i.crit&&`+${i.crit}% Critical`].filter(Boolean).join(", "):"";};
    const itemSummary=id=>{const i=SHOP[id];return i?`${i.description}${i.durability?` Breaks after ${i.durability} landed hits; repair restores durability.`:""} Buy ${i.price}g / Sell ${i.sellValue}g. Classes: ${i.classes.map(c=>c[0].toUpperCase()+c.slice(1)).join(", ")}`:"Empty";};
    function sellItem(state,id){normalizeInventory(state);const item=SHOP[id],stock=item?.type?state.equipmentStock:state.supplies;if(!item||!(stock[id]>0))return{ok:false,message:"Only unequipped shared stock can be sold."};stock[id]--;if(item.type){state.equipmentConditionStock[id].shift();state.equipmentBrokenStock[id]?.shift();state.equipmentDurabilityStock[id]?.shift();}state.gold+=item.sellValue;return{ok:true,value:item.sellValue,message:`Sold ${item.name} for ${item.sellValue} Gold.`};}
    const gearIds = () => Object.keys(SHOP).filter(id => SHOP[id].type);
    const armorGearIds = () => gearIds().filter(id => SHOP[id].slot);
    const shopIds = () => Object.keys(SHOP).filter(id => !SHOP[id].legacy);
    function normalizeInventory(state) {
        if(state.supplies)delete state.supplies.medkit; // Removed legacy supply: discard without compensation.
        if(state.equipmentStock)delete state.equipmentStock.medkit;
        state.equipmentStock = state.equipmentStock && typeof state.equipmentStock === "object" ? state.equipmentStock : {};
        state.supplies = state.supplies && typeof state.supplies === "object" ? state.supplies : {};
        state.equipmentBrokenStock ||= {};
        state.equipmentDurabilityStock=state.equipmentDurabilityStock&&typeof state.equipmentDurabilityStock==="object"&&!Array.isArray(state.equipmentDurabilityStock)?state.equipmentDurabilityStock:{};
        state.equipmentConditionStock=state.equipmentConditionStock&&typeof state.equipmentConditionStock==="object"?state.equipmentConditionStock:{};
        for(const id of gearIds()){
            state.equipmentStock[id]=Math.max(0,Number.isSafeInteger(state.equipmentStock[id])?state.equipmentStock[id]:0);
            state.equipmentBrokenStock[id] ||= [];
            state.equipmentDurabilityStock[id]=(Array.isArray(state.equipmentDurabilityStock[id])?state.equipmentDurabilityStock[id]:[]).slice(0,state.equipmentStock[id]).map(n=>Math.max(0,Math.min(SHOP[id].durability,Number.isFinite(n)?n:SHOP[id].durability)));
            const queue=state.equipmentConditionStock[id];
            state.equipmentConditionStock[id]=(Array.isArray(queue)?queue:[]).filter(v=>typeof v==="number"&&Number.isFinite(v)).map(v=>Math.max(0,Math.min(SHOP[id].armor||0,v))).slice(0,state.equipmentStock[id]);
            state.equipmentBrokenStock[id]=(Array.isArray(state.equipmentBrokenStock[id])?state.equipmentBrokenStock[id]:[]).slice(0,state.equipmentStock[id]).map(Boolean);
            // Each stock copy has aligned Armor, breakage and hit-life entries, including fresh purchases.
            while(state.equipmentConditionStock[id].length<state.equipmentStock[id])state.equipmentConditionStock[id].push(SHOP[id].armor||0);
            while(state.equipmentBrokenStock[id].length<state.equipmentStock[id])state.equipmentBrokenStock[id].push(false);
            while(state.equipmentDurabilityStock[id].length<state.equipmentStock[id])state.equipmentDurabilityStock[id].push(SHOP[id].durability);
            const intact=state.equipmentDurabilityStock[id].map((hits,i)=>hits>0&&!state.equipmentBrokenStock[id][i]);
            for(const field of ['equipmentConditionStock','equipmentBrokenStock','equipmentDurabilityStock'])state[field][id]=state[field][id].filter((_,i)=>intact[i]);
            state.equipmentStock[id]=state.equipmentDurabilityStock[id].length;
        }
        for (const id of Object.keys(SHOP).filter(id=>!SHOP[id].type)) state.supplies[id] = Math.max(0, Number.isSafeInteger(state.supplies[id]) ? state.supplies[id] : 0);
        return state;
    }
    const SMALL_HP = Object.freeze({ vanguard:5, bruiser:5, guardian:5, brawler:5, cleric:4, duelist:4, ranger:4, skirmisher:4, support:4, bard:4, mage:3, mystic:3, worker:4 });
    const SPELLCASTERS = Object.freeze(["mage", "mystic"]);
    // Adventurer-only dodge. Enemy dodge remains the authored guideline tier table.
    const DODGE_TIERS = Object.freeze({ low:0.15, normal:0.25, high:0.35 });
    const MAX_EXPEDITION_WAIT_SECONDS = 10;
    const CAMP_JOBS = Object.freeze(["idle","work","study"]);
    const EXPEDITION_DURATIONS = Object.freeze([1,3,5,10,15,20,25,30]);
    const MAX_SESSION_TICK_MS = 5000;
    const displayName = npc => npc?.nickname ? `${npc.name.replace(/^(\S+)(.*)$/, (_, first, rest) => `${first} "${npc.nickname}"${rest}`)}` : npc?.name || "Unknown";
    function ensureLife(npc, founder = false) {
        if(npc.reanimated&&conditionOf(npc)===CONDITIONS.DEAD)npc.reanimationExhausted=true;
        npc.foundingMember = !!(npc.foundingMember || npc.founder || founder); npc.founder = npc.foundingMember;
        npc.nickname = typeof npc.nickname === "string" ? npc.nickname : "";
        npc.nicknamePrompted = !!npc.nicknamePrompted;
        if(npc.level>LEVEL_CAP)npc.legacyLevel ||= npc.level;
        npc.level = Math.max(1, Math.min(LEVEL_CAP, Math.floor(Number(npc.level) || 1)));
        if(LEGACY_CLASSES[npc.classId])migrateIdentity(npc);
        npc.lastingInjuries=Number.isFinite(npc.lastingInjuries)?Math.max(0,Math.floor(npc.lastingInjuries)):0;
        npc.equipmentSlots ||= {head:null,body:null,offHand:null,accessory:null};npc.equipmentCondition ||= {};
        npc.equipmentStats={};
        for(const id of Object.values(npc.equipmentSlots).filter(Boolean)){
            const item=SHOP[id];if(!item)continue;const c=npc.equipmentCondition[id]||={current:item.armor||0,max:item.armor||0};
            c.maxHits=item.durability;c.hitsRemaining=c.broken?0:Math.max(0,Math.min(c.maxHits,Number.isFinite(c.hitsRemaining)?c.hitsRemaining:c.maxHits));
            if(c.hitsRemaining===0){for(const slot of EQUIPMENT_SLOTS)if(npc.equipmentSlots[slot]===id)npc.equipmentSlots[slot]=null;delete npc.equipmentCondition[id];continue;}
            npc.equipmentStats[id]={name:item.name,armor:item.armor||0,ward:item.ward||0,dodge:item.dodge||0,crit:item.crit||0,durability:item.durability};
        }
        const stats=classStats(npc);for(const id of Object.values(npc.equipmentSlots||{}).filter(id=>!npc.equipmentCondition?.[id]?.broken))for(const key of ["ward","dodge","crit"])stats[key]=(stats[key]||0)+(SHOP[id]?.[key]||0);npc.speed=(stats.speed||({barbarian:7,knight:5,cleric:6,mage:8,ranger:11,rogue:13}[npc.classId]));const hp=stats.hp;
        npc.maxHealth=hp; npc.health=conditionOf(npc)===CONDITIONS.DEAD?0:Math.max(1,Math.min(hp,Math.ceil(Number(npc.health)||hp)));
        npc.damage=stats.damage||1;npc.armorRecovery=stats.armorRecovery||0;
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
        npc.earnedTraits = [];npc.personalityTraits=[];
        npc.permanentWounds = Array.isArray(npc.permanentWounds) ? npc.permanentWounds : [];
        return npc;
    }
    function rating(stat, value) {
        const limits = { maxHealth: [85, 100, 120, 140], attack: [12, 15, 18, 21], defense: [7, 10, 13, 16], speed: [8, 11, 14, 17] }[stat];
        return ["Very weak", "Weak", "Regular", "Strong", "Very strong"][limits.filter(n => value >= n).length];
    }
    function assignTeam(state, id, team) {
        return { ok: false, message: "Choose one to three companions in the quest departure window." };
    }
    function selectTeam(state, team) {
        if (state.activeQuest || team !== "A" || tripForTeam(state, "A")) return false;
        state.activeTeam = "A"; state.teamIds = state.teams.A.slice(); return true;
    }

    function createState(template, random = Math.random) {
        const state = {
            version: SCHEMA_VERSION,focusTimer:{enabled:false,position:null},
            roster: copy(template).slice(0, 3).map((npc, index) => ({
                ...npc, condition: CONDITIONS.HEALTHY, equipment: null, xp: 0, injury: null, injuryExpeditionId: null, quests: 0, deathQuest: null,
                career: emptyCareer(), passiveTrait: { ...npc.passiveTrait, rank: 1 }
            })).map((npc, index) => { migrateIdentity(npc, true, random); ensureLife(npc, true); npc.history.joinedOrder = index + 1; return npc; }),
            gold: 100, arcana: 0, equipmentStock: Object.fromEntries(gearIds().map(id => [id, 0])),
            teams: { A: [], B: [] }, activeTeam: "A", teamBUnlocked: false,
            orders: { A: "exploration", B: "exploration" }, ritualsUnlocked: {}, ritualUnlockVersion:1, ritualEffects:{}, campJobs: {}, campJobElapsed: {},
            teamIds: [], supplies: { potion: 6 }, bonds: {},
            questCount: 0, nextTripId: 1, activeQuest: null, trips: { A: null, B: null }, settledTrips: {},
            recruit: null, lastReport: null, questHistory: [], selectedQuestId: "restless_crypt",
            expeditionReplay: null, contractDanger: "standard", presentationSpeed: "standard", currentThreads: [], campaignStats: { questsCompleted: 0, victories: 0, failures: 0, deaths: 0, bossesDefeated: 0, goldRecovered: 0, arcanaDiscovered: 0, legendaryItems: 0 }
        };
        ensureCampJobs(state);
        ensureRecruit(state, Date.now());
        normalizeFocusRoster(state);
        return state;
    }

    // Called once on load. Version 3/4 campaigns retain all progression data.
    function upgradeState(state) {
        if (!state || !Array.isArray(state.roster)) throw new Error("Invalid manager save.");
        state.eventCues=[]; // A load never replays already encountered audio boundaries.
        // Removed supplies stay out of legacy visible recaps; ledger currency and outcomes remain untouched.
        for(const report of [state.questResults,state.lastReport,...(Array.isArray(state.questHistory)?state.questHistory:[]),...Object.values(state.settledTrips||{})]){
            for(const r of [report,report?.results].filter(Boolean))for(const key of ["items","bonusRewards","lines"]){
                if(Array.isArray(r[key]))r[key]=r[key].filter(item=>typeof item==="string"?!/medkit/i.test(item):item?.itemId!=="medkit"&&!/medkit/i.test(item?.name||""));
            }
        }

        const loadedVersion=Math.max(0,Math.floor(Number(state.version)||0));
        if(loadedVersion<30){
            const seen=new Set(),rescale=record=>{
                if(!record||typeof record!=="object"||seen.has(record))return;seen.add(record);
                if(Number.isFinite(record.skulls)){
                    const tier=Math.max(1,Math.min(5,Math.floor(record.skulls)));
                    record.encounterTier??=tier;record.skulls=[0,1,2,4,6,8][tier];
                }
                rescale(record.results);
            };
            for(const record of [state.activeQuest,...Object.values(state.trips||{}),state.lastReport,state.questResults,...(Array.isArray(state.questHistory)?state.questHistory:[]),...Object.values(state.settledTrips||{})])rescale(record);
        }
        state.focusTimer={enabled:state.focusTimer?.enabled===true,position:state.focusTimer?.position&&Number.isFinite(state.focusTimer.position.x)&&Number.isFinite(state.focusTimer.position.y)?{x:Math.round(state.focusTimer.position.x),y:Math.round(state.focusTimer.position.y)}:null};
        for(const trip of Object.values(state.trips||{}).filter(t=>t&&typeof t==="object"&&!Array.isArray(t))){trip.difficulty=authoredDifficulty(trip);trip.lockedPlan||={};trip.lockedPlan.difficulty||=trip.difficulty;}

        state.supplies ||= { potion: 6 }; state.bonds = {}; state.ritualsUnlocked ||= {}; state.campJobElapsed ||= {};
        state.questCount ??= 0; state.activeQuest ??= null; state.lastReport ??= null;
        state.questHistory = Array.isArray(state.questHistory) ? state.questHistory.slice(-QUEST_HISTORY_LIMIT) : [];
        if(state.ritualUnlockVersion!==1){state.ritualsUnlocked={};state.ritualUnlockVersion=1;}
        // Reconcile earned unlocks on every load, including saves already migrated.
        for(const report of [...state.questHistory,state.lastReport,...Object.values(state.settledTrips||{})]){
            if(!report)continue;
            grantRitualUnlocks(state,{questId:report.questDefinitionId,abandoned:report.abandoned,autoRetreat:report.autoRetreat,endKind:report.endKind,recalled:report.recalled},(report.outcome||report.status)==="victory");
        }
        state.ritualEffects||={};
        state.contractDanger = CONTRACT_DANGERS.includes(state.contractDanger) ? state.contractDanger : "standard";
        state.presentationSpeed = ["standard","reduced","skip"].includes(state.presentationSpeed) ? state.presentationSpeed : "standard";
        state.currentThreads = Array.isArray(state.currentThreads) ? state.currentThreads.filter(thread => thread && typeof thread.title === "string").slice(0, 8) : [];
        const stats = state.campaignStats && typeof state.campaignStats === "object" ? state.campaignStats : {};
        state.campaignStats = Object.fromEntries(["questsCompleted", "victories", "failures", "deaths", "bossesDefeated", "goldRecovered", "arcanaDiscovered", "legendaryItems"].map(key => [key, Math.max(0, Math.floor(Number(stats[key]) || 0))]));
        state.trips ||= { A: null, B: null }; state.trips.A ??= null; state.trips.B ??= null;
        if(state.activeQuest?.id&&Array.isArray(state.activeQuest.preparedTeam)&&!state.trips.A){state.trips.A=state.activeQuest;state.activeQuest=null;}
        else if(state.activeQuest?.id===state.trips.A?.id&&state.trips.A)state.activeQuest=null;
        state.settledTrips ||= {};
        for (const key of Object.keys(state.settledTrips).slice(0, -SETTLED_TRIP_LIMIT)) delete state.settledTrips[key];
        delete state.restReadyAt;
        for (const key of ["A", "B"]) {
            const trip = state.trips[key];
            if (trip?.phase === "battle"&&!trip.realtime) trip.phase = "ready";
            if (trip && (!Array.isArray(trip.team) || !trip.id || !(trip.realtime?["travel","encounter","battle","return","campfire","wipe"]:["outbound", "ready", "halted", "choice", "return"]).includes(trip.phase))) {
                state.trips[key] = null;
                state.recoveryNotice = `Team ${key}'s invalid trip data was cancelled without rewards.`;
            }
        }
        for(const trip of Object.values(state.trips).filter(Boolean))for(const n of trip.preparedTeam||[]){n.personalityTraits=[];n.earnedTraits=[];if(n.battleBonuses?.bond){n.attack=Math.max(1,n.attack-n.battleBonuses.bond);n.battleBonuses.bond=0;}if(n.career)n.career.badges=[];}
        const usedTripNumbers = [...Object.values(state.trips), ...Object.keys(state.settledTrips)].filter(Boolean).map(value => Number(String(value.id || value).replace(/^trip-/, ""))).filter(Number.isSafeInteger);
        state.nextTripId = Math.max(Number.isSafeInteger(state.nextTripId) && state.nextTripId > 0 ? state.nextTripId : 1, Math.max(state.questCount, 0, ...usedTripNumbers) + 1);
        state.selectedQuestId = typeof state.selectedQuestId === "string" ? state.selectedQuestId : "restless_crypt";
        if (!Number.isSafeInteger(state.gold) || state.gold < 0) state.gold = 100;
        if (!Number.isSafeInteger(state.arcana) || state.arcana < 0) state.arcana = 0;
        if(loadedVersion<22){
            for(const trip of Object.values(state.trips||{}).filter(Boolean)){trip.returnNarrated=trip.phase==="return";if(trip.battleSnapshot)(trip.recordedBattleStages||={})[String(trip.stageIndex)]=true;for(const npc of trip.preparedTeam||[]){migrateIdentity(npc);ensureLife(npc);npc.armor=npc.classArmor+equipmentArmor(npc);npc.maxArmor=npc.classArmorMax+equipmentArmorMax(npc);}}
            for(const npc of state.recruit?.candidates||[]){migrateIdentity(npc);ensureLife(npc);}
        }
        const corruptedPurchased = loadedVersion === 20 && state.equipmentStock && typeof state.equipmentStock === "object" ? armorGearIds().filter(id=>Object.prototype.hasOwnProperty.call(state.equipmentStock,id)&&!Number.isSafeInteger(state.equipmentStock[id])) : [];
        normalizeInventory(state);
        for(const id of corruptedPurchased)state.equipmentStock[id]=Math.max(1,state.equipmentStock[id]);
        if(corruptedPurchased.length)state.recoveryNotice=`Recovered ${corruptedPurchased.length} equipment item${corruptedPurchased.length===1?"":"s"} from a corrupted schema-20 inventory.`;
        for (const npc of state.roster) {
            npc.xp ??= 0; npc.injury ??= null; npc.quests ??= 0; npc.deathQuest ??= null;
            npc.injuryExpeditionId = typeof npc.injuryExpeditionId === "string" || Number.isSafeInteger(npc.injuryExpeditionId) ? npc.injuryExpeditionId : null;
            npc.condition = conditionOf(npc); npc.alive = npc.condition !== CONDITIONS.DEAD;
            if (npc.condition === CONDITIONS.DEAD) { npc.health = 0; npc.injury = null; }
            else npc.injury = npc.condition === CONDITIONS.WOUNDED ? "Wounded" : null;
            ensureCareer(npc);
            npc.passiveTrait.rank ??= 1;
            migrateIdentity(npc); ensureLife(npc, false);
            if (!gearIds().includes(npc.equipment)) npc.equipment = null;
            if (!gearIds().includes(npc.equipment2)) npc.equipment2 = null;
            for (const slot of ["equipment", "equipment2"]) {
                if (!living(npc) && npc[slot]) { state.equipmentStock[npc[slot]]++; npc[slot] = null; }
            }
            if(!living(npc)) returnSlottedEquipment(state,npc);
        }
        ensureCampJobs(state);
        state.teamIds = [...new Set(state.teamIds || [])].filter(id => living(state.roster.find(n => n.id === id))).slice(0, MAX_PARTY_SIZE);
        // Schema 20 collapses legacy A/B assignments into one expedition party.
        state.teamBUnlocked = false;
        state.activeTeam = "A";
        state.teams ||= { A: state.teamIds.slice(), B: [] };
        for (const key of ["A", "B"]) state.teams[key] = [...new Set(state.teams[key] || [])].filter(id => living(state.roster.find(n => n.id === id))).slice(0, MAX_PARTY_SIZE);
        const legacyB = state.teams.B || [];
        if (!state.teams.A.length && legacyB.length && !state.trips?.A && !state.trips?.B) state.teams.A = legacyB.slice(0, MAX_PARTY_SIZE);
        state.teams.B = [];
        state.teamIds = state.teams.A.slice();
        ensureRecruit(state, Date.now());
        state.orders ||= { A: "exploration", B: "exploration" };
        for (const key of ["A", "B"]) state.orders[key] = orderFor(state.orders[key]).id;
        for (const trip of Object.values(state.trips)) if (trip) {
            if(trip.realtime){trip.totalDurationMs=Math.min(30*60000,Math.max(60000,Number(trip.totalDurationMs)||60000));trip.remainingMs=Math.max(0,Math.min(trip.totalDurationMs,(Number.isFinite(Number(trip.remainingMs))?Number(trip.remainingMs):trip.totalDurationMs)));trip.elapsedMs=trip.totalDurationMs-trip.remainingMs;trip.sessionLastAt=null;trip.lastProgressAtMs=null;trip.timeline=Array.isArray(trip.timeline)?trip.timeline.slice(-12):[];trip.latestEvent=String(trip.latestEvent||"Expedition resumed.");trip.milestones=trip.milestones&&typeof trip.milestones==="object"?trip.milestones:{};trip.presentationQueue=Array.isArray(trip.presentationQueue)?trip.presentationQueue:[];trip.presentationCurrent=trip.presentationCurrent&&typeof trip.presentationCurrent==="object"?trip.presentationCurrent:null;trip.presentationHoldMs=Math.max(0,Number(trip.presentationHoldMs)||0);trip.presentationAccumulator=Math.max(0,Number(trip.presentationAccumulator)||0);}
            trip.order = orderFor(trip.order || ({ Aggressive: "take_risks", Defensive: "avoid_risks", Support: "greed", Tactical: "exploration" }[trip.strategy])).id;
            trip.strategy ||= orderFor(trip.order).legacyStrategy;
            trip.signatureUses = trip.signatureUses && typeof trip.signatureUses === "object" ? trip.signatureUses : {};
            trip.decision = trip.decision && typeof trip.decision === "object" ? trip.decision : null;
            trip.stages = Array.isArray(trip.stages) ? trip.stages : [];
            trip.stageIndex = Number.isSafeInteger(trip.stageIndex) ? trip.stageIndex : 0;
            trip.stageDurationMs = Number.isFinite(trip.stageDurationMs) ? trip.stageDurationMs : trip.outboundMs;
            trip.stageStartedAt = Number.isFinite(trip.stageStartedAt) ? trip.stageStartedAt : Math.max(0, trip.deadlineMs - trip.stageDurationMs);
            trip.outboundTotalMs = Number.isFinite(trip.outboundTotalMs) && trip.outboundTotalMs > 0 ? trip.outboundTotalMs :
                (trip.stages.length ? trip.stages.filter(stage => stage.type === "travel").reduce((sum, stage) => sum + Math.max(1, Number(stage.durationSeconds) || 0) * 1000, 0) : trip.outboundMs);
            trip.outboundElapsedMs = Number.isFinite(trip.outboundElapsedMs) && trip.outboundElapsedMs >= 0 ? trip.outboundElapsedMs :
                trip.stages.slice(0, trip.stageIndex).filter(stage => stage.type === "travel").reduce((sum, stage) => sum + Math.max(1, Number(stage.durationSeconds) || 0) * 1000, 0);
            trip.pendingRewards = trip.pendingRewards && typeof trip.pendingRewards === "object" ? trip.pendingRewards : { gold: 0, arcana: 0 };
            trip.pendingRewards.gold = Math.max(0, Math.floor(Number(trip.pendingRewards.gold) || 0));
            trip.pendingRewards.arcana = Math.max(0, Math.floor(Number(trip.pendingRewards.arcana) || 0));
            trip.chronicle = Array.isArray(trip.chronicle) ? trip.chronicle : [];
            trip.battleEvents = Array.isArray(trip.battleEvents) ? trip.battleEvents : [];
            trip.expeditionInjuries = trip.expeditionInjuries && typeof trip.expeditionInjuries === "object" ? trip.expeditionInjuries : {};
            trip.expeditionDeaths = trip.expeditionDeaths && typeof trip.expeditionDeaths === "object" ? trip.expeditionDeaths : {};
            trip.deathSaveResults = trip.deathSaveResults && typeof trip.deathSaveResults === "object" ? trip.deathSaveResults : {};
            trip.contractDanger = CONTRACT_DANGERS.includes(trip.contractDanger) ? trip.contractDanger : "standard";
            for (const member of trip.preparedTeam || []) {
                member.condition = trip.expeditionDeaths[member.id] ? CONDITIONS.DEAD : trip.expeditionInjuries[member.id] ? CONDITIONS.WOUNDED : conditionOf(member);
                if(trip.expeditionInjuries[member.id])member.incapacitated=true;
                member.alive = member.condition !== CONDITIONS.DEAD && !member.incapacitated;
                if(member.incapacitated)member.health=0;
                if (member.condition === CONDITIONS.DEAD) { member.health = 0; member.injury = null; }
                else member.injury = member.condition === CONDITIONS.WOUNDED ? "Wounded" : null;
            }
            trip.leadershipSuccessionCount = Math.max(0, Math.floor(Number(trip.leadershipSuccessionCount) || 0));
            const livingMembers = (trip.preparedTeam || []).filter(member => member.alive !== false && member.health > 0 && !trip.expeditionDeaths?.[member.id]);
            if (!livingMembers.some(member => member.id === trip.leaderId)) trip.leaderId = livingMembers[0]?.id || null;
        }
        for(const trip of Object.values(state.trips||{}))if(trip?.realtime)normalizePresentationTrip(trip);
        state.expeditionReplay=normalizePresentationTrip(state.expeditionReplay);
        normalizeFocusRoster(state);
        // A completed legacy replay becomes a results view without re-settlement.
        if (!state.questResults && state.expeditionReplay?.phase === "complete") {
            const report = state.settledTrips[state.expeditionReplay.id] || state.lastReport;
            if (report) state.questResults = report.results ? copy(report.results) : resultSnapshot(state, report, report.participantIds || state.expeditionReplay.team.map(n => n.id));
        }
        // Loaded completed results must not notify again, even if saved before alert delivery.
        if(state.completionCue?.pending){state.lastCompletionAlertId=state.completionCue.questId;state.completionCue.pending=false;}
        state.version = SCHEMA_VERSION;
        // Refresh portrait references in replay and active-trip copies without changing combat state.
        const seenPortraitNodes=new WeakSet();
        function refreshPortraitTree(node){if(!node||typeof node!=="object"||seenPortraitNodes.has(node))return;seenPortraitNodes.add(node);if(node.classId&&node.sex&&node.portrait){const oldArt=!node.portrait.sheet?.endsWith("_v5"),hasKey=Object.prototype.hasOwnProperty.call(node,"portraitKey"),hasWalk=Object.prototype.hasOwnProperty.call(node,"walkPortrait");normalizePortrait(node);if(!hasKey&&!oldArt)delete node.portraitKey;if(!hasWalk&&!oldArt)delete node.walkPortrait;}for(const value of Object.values(node))refreshPortraitTree(value);}
        refreshPortraitTree(state);
        return state;
    }

    function purchaseError(state, item) {
        normalizeInventory(state);
        if (state.activeQuest) return "Shop purchases are only available at Home Base.";
        if (!Object.prototype.hasOwnProperty.call(SHOP, item)) return "Unknown shop item.";
        if (SHOP[item].legacy) return "This legacy item is not sold by the current Shop.";
        if (item === "teamB" && state.teamBUnlocked) return "Team B is already unlocked.";
        if (state.gold < SHOP[item].price) return "Not enough gold.";
        return "";
    }
    function purchase(state, item) {
        const error = purchaseError(state, item);
        if (error) return { ok: false, message: error };
        state.gold -= SHOP[item].price;
        const stock = SHOP[item].type ? state.equipmentStock : state.supplies;
        if (SHOP[item].unlock) state.teamBUnlocked = true; else stock[item] = (Number.isSafeInteger(stock[item]) ? stock[item] : 0) + 1;
        return { ok: true, message: `Bought ${SHOP[item].name} for ${SHOP[item].price} gold.` };
    }
    function equipmentError(state, id, item, slot = 1) {
        if (![1, 2].includes(slot)) return "Choose Slot 1 or Slot 2.";
        if (state.activeQuest || isUnavailable(state, id)) return "This adventurer is away on a quest.";
        const npc = state.roster.find(n => n.id === id);
        if (!living(npc)) return "Only living NPCs can equip items.";
        if(item&&!compatible(npc,item))return "This class cannot equip that item.";
        if (item !== null && !gearIds().includes(item)) return "Unknown equipment.";
        const key = slot === 1 ? "equipment" : "equipment2", other = slot === 1 ? "equipment2" : "equipment";
        if ((npc[key] || null) === item) return "Already equipped.";
        if (item && SHOP[npc[other]]?.type === SHOP[item].type) return "Only one item of each type per adventurer.";
        if (item && !(state.equipmentStock[item] > 0)) return "Buy this item in the Shop first.";
        return "";
    }
    function equip(state, id, item, slot = 1) {
        const error = equipmentError(state, id, item, slot);
        if (error) return { ok: false, message: error };
        const npc = state.roster.find(n => n.id === id);
        const key = slot === 1 ? "equipment" : "equipment2";
        if (npc[key]) state.equipmentStock[npc[key]]++;
        if (item) state.equipmentStock[item]--;
        npc[key] = item;
        return { ok: true, message: `${npc.name}: ${item ? SHOP[item].name + " equipped" : "equipment returned to stock"}.` };
    }

    function teamError(state, ids = state.teamIds, teamKey = state.activeTeam) {
        if(state.startingRosterPending)return "Create and confirm your starting companion first.";
        const active=activeRoster(state);
        if(active.length<MIN_PARTY_SIZE)return "Quests require at least one companion. Recruit for free at the Tavern.";
        if(!Array.isArray(ids)||ids.length<MIN_PARTY_SIZE||ids.length>MAX_PARTY_SIZE||new Set(ids).size!==ids.length||ids.some(id=>!active.some(n=>n.id===id)))return "Choose one to three different roster members for this quest.";
        const team = ids.map(id => state.roster.find(n => n.id === id));
        if (team.some(npc => !living(npc))) return "Only living NPCs can join a quest.";
        if (Object.values(state.trips || {}).some(Boolean)) return "An expedition is already underway.";
        if (team.some(npc => isUnavailable(state, npc.id))) return "An assigned adventurer is already away.";
        return "";
    }

    function bondPartners(state, id) { return []; }

    function prepareTeam(state, ids = state.teamIds, teamKey = state.activeTeam) {
        const error = teamError(state, ids, teamKey);
        if (error) throw new Error(error);
        return ids.map(id => {
            const npc = copy(state.roster.find(n => n.id === id));
            ensureLife(npc);
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

    function xpPreview(partySize, rules = DEFAULT_XP_RULES) {
        // Legacy active expeditions retain their authored XP, including larger parties.
        if (!Number.isInteger(partySize) || partySize < 1 || partySize > 5) throw new Error("Party size must be 1-5.");
        const maxPartySize = Number.isInteger(rules.maxPartySize) ? rules.maxPartySize : MAX_PARTY_SIZE;
        const basePerMember = Number.isInteger(rules.basePerMember) ? rules.basePerMember : DEFAULT_XP_RULES.basePerMember;
        const openSlotBonus = Number.isInteger(rules.openSlotBonus) ? rules.openSlotBonus : DEFAULT_XP_RULES.openSlotBonus;
        const totalCap = Number.isInteger(rules.totalCap) ? rules.totalCap : DEFAULT_XP_RULES.totalCap;
        const rawPerMember = basePerMember + Math.max(0, maxPartySize - partySize) * openSlotBonus;
        const perMember = Math.min(rawPerMember, Math.floor(totalCap / partySize));
        return { partySize, basePerMember, openSlotBonus, totalCap, rawPerMember, perMember,
            bonusPerMember: perMember - basePerMember, total: perMember * partySize, capped: perMember < rawPerMember };
    }

    function beginQuest(state, questDefinition = null, xpRules = DEFAULT_XP_RULES) {
        const error = teamError(state);
        if (error) throw new Error(error);
        delete state.recoveryNotice;
        const id = state.questCount + 1;
        const xp = xpPreview(state.teamIds.length, xpRules);
        const rewards = questDefinition?.rewardGold || { victory: 60, draw: 20, defeat: 15 };
        state.activeQuest = { id, questId: questDefinition?.id || "legacy_patrol", questName: questDefinition?.name || `Quest ${id}`, boss: !!questDefinition?.boss,
            teamKey: state.activeTeam, xp, rewardGold: copy(rewards), team: state.teamIds.map(npcId => {
            const npc = state.roster.find(n => n.id === npcId);
            return { id: npcId, injury: npc.injury, injuryExpeditionId: npc.injuryExpeditionId || null, maxHealth: npc.maxHealth };
        }) };
        state.activeQuest.preparedTeam=prepareTeam(state);activateRituals(state,state.activeQuest);
        return id;
    }

    function finishQuest(state, questId, snapshot, events = [], completedAt = Date.now()) {
        if (state.settledTrips?.[questId]) return copy(state.settledTrips[questId]);
        if (state.lastReport?.questId === questId) return copy(state.lastReport);
        const quest = state.activeQuest;
        if (!quest || quest.id !== questId) throw new Error("No matching active quest.");
        if (!["victory", "defeat", "draw"].includes(snapshot?.status)) throw new Error("Quest is not finished.");
        const fighters = snapshot.fighters?.filter(f => f.side === "player");
        // Validate the complete result before making any persistent changes.
        if (!fighters || fighters.length !== quest.team.length || new Set(fighters.map(f => f.id)).size !== quest.team.length ||
            quest.team.some(start => !fighters.some(f => f.id === start.id &&
                Number.isFinite(f.health) && f.health >= 0 && f.health <= start.maxHealth &&
                f.alive === (f.health > 0)))) throw new Error("Invalid quest result.");
        const xp = quest.xp || xpPreview(quest.team.length);
        if(snapshot.ritualEffects&&!quest.realtime){quest.ritualEffects=copy(snapshot.ritualEffects);delete quest.ritualEffects.battle_hymn;}
        if(!quest.realtime&&snapshot.status==="victory")quest.ritualBattlesWon=(quest.ritualBattlesWon||0)+1;
        const combatById = combatStatistics(quest.team, events);
        const capNote = xp.capped ? `; ${xp.totalCap} quest cap applied` : `; ${xp.totalCap} quest cap`;
        const lines = [`${quest.questName || `Quest ${questId}`}: ${snapshot.status.toUpperCase()}`,
            `XP awarded: ${xp.perMember} each (${xp.basePerMember} base + ${xp.bonusPerMember} small-party bonus${capNote}); ${xp.total} total.`];
        if(quest.balanceVersion>=31&&Number.isSafeInteger(quest.xpPool)){
            const pool=snapshot.status==="victory"&&!quest.autoRetreat&&!quest.abandoned&&!quest.recalled&&quest.endKind!=="early"?quest.xpPool:0;
            xp.total=pool;xp.perMember=Math.floor(pool/quest.team.length);quest.xpRemainderIds=quest.team.slice(0,pool%quest.team.length).map(n=>n.id);
            lines[1]=`Completion XP pool: ${pool}, split among ${quest.team.length} assigned companions. Enemy XP is shared separately and kept on recall.`;
        }
        const survivors = [], deaths = [], injuries = [], bondChanges = [], badgesAwarded = [];
        for (const start of quest.team) {
            const npc = state.roster.find(n => n.id === start.id);
            const fighter = fighters.find(f => f.id === start.id);
            if(fighter.mercyRescued&&!quest.mercyRescuedIds?.includes(npc.id)){(quest.mercyRescuedIds||=[]).push(npc.id);seriousWound(npc);}
            const expeditionInjury = !!quest.expeditionInjuries?.[npc.id];
            const hadInjury = !!npc.injury && !expeditionInjury, stats = combatById[npc.id], career = ensureCareer(npc);
            const authoritativeDead = !!quest.expeditionDeaths?.[npc.id] || conditionOf(npc) === CONDITIONS.DEAD;
            if (!authoritativeDead) npc.health = fighter.health;
            if(!npc.reanimated)npc.xp += xp.perMember+(xp.total>0&&quest.xpRemainderIds?.includes(npc.id)?1:0);
            npc.quests++;
            career.questsParticipated++; career.questsCompleted++;
            if (snapshot.status === "victory") career.victories++;
            if (snapshot.status === "victory" && quest.boss) career.bossVictories++;
            career.kills += stats.kills; career.damageDealt += stats.damage; career.healingDone += stats.healing; career.signatureUses += stats.signatures;
            career.lastQuest = { questId, questDefinitionId: quest.questId, questName: quest.questName, teamKey: quest.teamKey || state.activeTeam,
                completedAt: validNow(completedAt), result: snapshot.status };
            const mortalAttack = events.some(event => event?.type === "attack" && event.targetKey === `player:${npc.id}` && event.mortal);
            const repeatedExpeditionKo = fighter.health === 0 && (quest.expeditionDeaths?.[npc.id] || expeditionInjury || !!start.injury && start.injuryExpeditionId === questId);
            if (authoritativeDead || fighter.health === 0 && !expeditionInjury && (npc.reanimated || repeatedExpeditionKo || mortalAttack)) {
                const killed=!authoritativeDead?killAdventurer(state, npc.id, { questId, questName: quest.questName, killedBy: fighter.defeatedBy?.name || null, reason: "Quest death" }):null;
                if(killed?.prevented){fighter.health=1;fighter.alive=true;}else{
                npc.killedBy = fighter.defeatedBy?.side === "enemy" ? copy(fighter.defeatedBy) : null;
                lines.push(`${npc.name} died permanently: knocked out while injured. Killed by: ${npc.killedBy?.name || "Not recorded"}.`);
                lines.push(`${npc.name}: "${say(npc, "death")}"`);
                deaths.push({ id: npc.id, name: npc.name, classId: npc.classId, level: npc.level, killedBy: npc.killedBy?.name || null });
                continue;
                }
            }
            if (npc.health === 0) {
                applyWound(state, npc.id, questId);
                lines.push(`${npc.name} knocked out: Wounded, returns with ${npc.health} HP.`);
            } else if (expeditionInjury && !npc.injury) {
                applyWound(state, npc.id, questId);
                lines.push(`${npc.name} returns Wounded after severe danger.`);
            }
            if (!hadInjury && npc.injury) {
                career.injuriesSuffered++;
                injuries.push({ id: npc.id, name: npc.name, injury: npc.injury });
            }
            // A retreat never tops up HP through the ordinary low-HP wound normalization.
            if(quest.autoRetreat&&fighter.health>0&&!authoritativeDead)npc.health=Math.min(npc.health,fighter.health);
            while (!npc.reanimated && npc.level < LEVEL_CAP && npc.xp >= xpRequired(npc)) {
                npc.xp -= xpRequired(npc);
                const oldStats=classStats(npc);npc.level++;const newStats=classStats(npc);npc.classArmor+=newStats.armor-oldStats.armor;npc.innateWard+=newStats.ward-oldStats.ward;npc.health+=newStats.hp-oldStats.hp;
                // Each level adds its authored defensive or power refinement.
                ensureLife(npc); lines.push(`${displayName(npc)}: Level ${npc.level}! HP remains ${npc.maxHealth}.`);
                lines.push(`${npc.passiveTrait.name} improves to rank ${npc.passiveTrait.rank}.`);
            }
            if(expeditionInjury)npc.health=1;
            lines.push(`${npc.name}: HP ${npc.health}/${npc.maxHealth}, XP ${npc.xp}/${xpRequired(npc)}.`);
            survivors.push(npc);
        }
        state.teamIds = state.teamIds.filter(id => living(state.roster.find(n => n.id === id)));
        for (const key of ["A", "B"]) state.teams[key] = state.teams[key].filter(id => living(state.roster.find(n => n.id === id)));
        state.teams[state.activeTeam] = state.teamIds.slice();
        state.questCount = Number.isSafeInteger(questId) ? Math.max(state.questCount, questId) : state.questCount + 1;
        state.nextTripId = Math.max(state.nextTripId || 1, state.questCount + 1);
        state.activeQuest = null;
        const ritualReward=ritualRewards(quest,(quest.rewardGold || { victory: 60, defeat: 15, draw: 20 })[snapshot.status] + Math.max(0, Math.floor(Number(quest.pendingRewards?.gold) || 0)),((quest.rewardArcana || { victory: 0, defeat: 0, draw: 0 })[snapshot.status] || 0) + Math.max(0, Math.floor(Number(quest.pendingRewards?.arcana) || 0)));
        const rewardGold=ritualReward.gold,rewardArcana=ritualReward.arcana;
        const ritualUnlocks=grantRitualUnlocks(state,quest,snapshot.status==="victory");
        if(ritualUnlocks.length)lines.push(`Rituals unlocked: ${ritualUnlocks.join(", ")}.`);
        returnUnusedRituals(state,quest);
        state.gold += rewardGold;
        state.arcana = Math.max(0, Math.floor(Number(state.arcana) || 0)) + rewardArcana;
        lines.splice(1, 0, `Rewards: +${rewardGold} Gold, +${rewardArcana} Arcana. Treasury: ${state.gold} Gold / ${state.arcana} Arcana.`);
        if (quest.abandoned) lines.splice(1, 0, "Expedition abandoned: authored partial-failure rewards applied.");
        if (quest.chronicle?.length) lines.push("EXPEDITION CHRONICLE", ...quest.chronicle.map(entry => `- ${entry.text || entry}`));
        const memberStats = quest.team.map(start => {
            const npc = state.roster.find(n => n.id === start.id), stats = combatById[start.id];
            return { id: start.id, name: npc.name, kills: stats.kills, damage: stats.damage, healing: stats.healing, signatures: stats.signatures,
                injury: injuries.find(entry => entry.id === start.id)?.injury || null, died: deaths.some(entry => entry.id === start.id) };
        });
        const ranked = memberStats.slice().sort((a, b) => b.damage - a.damage || b.kills - a.kills || b.healing - a.healing || b.signatures - a.signatures || a.id.localeCompare(b.id));
        const standout = ranked[0];
        const highlight = standout ? { id: standout.id, name: standout.name,
            reason: standout.damage ? `top damage (${standout.damage})` : standout.kills ? `most kills (${standout.kills})` : standout.healing ? `top healing (${standout.healing})` : standout.signatures ? `signature uses (${standout.signatures})` : "quest lead (stable ID tie-break)" } : null;
        if (highlight) lines.splice(3, 0, `Battle highlight: ${highlight.name} - ${highlight.reason}.`);
        lines.splice(4, 0, ...memberStats.map(member => `${member.name}: ${member.kills} kills, ${member.damage} damage, ${member.healing} healing, ${member.signatures} signatures${member.died ? ", DIED" : member.injury ? `, ${member.injury}` : ""}.`));
        if (state.roster.filter(living).length < 1) lines.push("No living adventurers remain. Load an earlier save or start a New Game.");
        if (survivors.length) lines.push(`${survivors[0].name}: "${say(survivors[0], "return")}"`);
        state.lastReport = { ...sessionRecap(quest),questId, questDefinitionId: quest.questId, questName: quest.questName, teamKey: quest.teamKey || state.activeTeam,
            leaderId: quest.leaderId || quest.team?.[0]?.id || null,
            completedAt: validNow(completedAt), outcome: snapshot.status, participantIds: quest.team.map(member => member.id),
            participants: quest.team.map(member => ({ id: member.id, name: state.roster.find(n => n.id === member.id).name })),
            deaths, injuries, memberStats, bondChanges, badgesAwarded, highlight,
            rewardGold, rewardArcana, ritualUnlocks, abandoned: !!quest.abandoned, chronicle: copy(quest.chronicle || []),
            goldGathered: rewardGold, enemiesDefeated: memberStats.reduce((sum, member) => sum + member.kills, 0),
            bossesDefeated: snapshot.status === "victory" && quest.boss ? 1 : 0, legendaryItems: copy(quest.legendaryItems || []),
            xpPerMember: xp.perMember, xpTotal: xp.total, partySize: xp.partySize, lines };
        state.questHistory ||= [];
        const historyRecord = copy(state.lastReport); delete historyRecord.lines;
        state.questHistory.push(historyRecord);
        if (state.questHistory.length > QUEST_HISTORY_LIMIT) state.questHistory.splice(0, state.questHistory.length - QUEST_HISTORY_LIMIT);
        state.campaignStats ||= { questsCompleted: 0, victories: 0, failures: 0, deaths: 0, bossesDefeated: 0, goldRecovered: 0, arcanaDiscovered: 0, legendaryItems: 0 };
        state.campaignStats.questsCompleted++;
        if (snapshot.status === "victory") state.campaignStats.victories++;
        if (snapshot.status === "defeat") state.campaignStats.failures++;
        state.campaignStats.deaths += deaths.length;
        state.campaignStats.bossesDefeated += state.lastReport.bossesDefeated;
        state.campaignStats.goldRecovered += rewardGold;
        state.campaignStats.arcanaDiscovered += rewardArcana;
        state.campaignStats.legendaryItems += state.lastReport.legendaryItems.length;
        if (typeof questId === "string") {
            state.settledTrips[questId] = copy(state.lastReport);
            for (const key of Object.keys(state.settledTrips).slice(0, -SETTLED_TRIP_LIMIT)) delete state.settledTrips[key];
        }
        return copy(state.lastReport);
    }

    function dispatchQuest(state, teamKey, questDefinition, xpRules = DEFAULT_XP_RULES, now = Date.now(), orderId = null, contractDanger = null, leaderId = null, durationMinutes = null, partyIds = null) {
        now = validNow(now);
        if (teamKey !== "A") throw new Error("Only one fixed expedition party is available.");
        const ids = Array.isArray(partyIds)?partyIds.slice():(state.teamIds||[]).slice();
        const error = teamError(state, ids, teamKey);
        if (error) throw new Error(error);
        state.teams.A = ids.slice(); state.teamIds = ids.slice(); state.activeTeam = "A";
        state.presentationSpeed = "standard";
        const questError = questUnavailableReason(state, questDefinition?.id, teamKey);
        if (questError) throw new Error(questError);
        if (questDefinition?.unlock?.questsCompleted > (state.campaignStats?.questsCompleted || 0)) throw new Error(questDefinition.unlock.label || "This quest is locked.");
        if (!questDefinition || !Number.isSafeInteger(questDefinition.travelSeconds) || questDefinition.travelSeconds < 1) throw new Error("Invalid quest travel duration.");
        const preparedTeam = prepareTeam(state, ids, teamKey);
        const selectedLeader = preparedTeam.find(member => member.id === leaderId) || preparedTeam[0];
        if (!selectedLeader) throw new Error("Choose a valid Party Leader before dispatch.");
        const leaderRecord=state.roster.find(n=>n.id===selectedLeader.id);if(leaderRecord){ensureLife(leaderRecord);leaderRecord.history.leaderships++;leaderRecord.history.events.push({type:"partyLeadership"});evaluateEarnedTraits(leaderRecord);}
        const id = `trip-${state.nextTripId++}`;
        const xp = questDefinition.xpReward > 0
            ? { ...xpPreview(ids.length, xpRules), basePerMember: questDefinition.xpReward, rawPerMember: questDefinition.xpReward, perMember: questDefinition.xpReward, bonusPerMember: 0, total: questDefinition.xpReward * ids.length, capped: false }
            : xpPreview(ids.length, xpRules);
        if(Number.isSafeInteger(questDefinition.xpPool)){xp.perMember=Math.floor(questDefinition.xpPool/ids.length);xp.total=questDefinition.xpPool;xp.basePerMember=xp.perMember;xp.rawPerMember=xp.perMember;xp.bonusPerMember=0;}
        const outboundMs = Math.min(MAX_EXPEDITION_WAIT_SECONDS, questDefinition.travelSeconds) * 1000;
        const dangerId = CONTRACT_DANGERS.includes(contractDanger) ? contractDanger : CONTRACT_DANGERS.includes(state.contractDanger) ? state.contractDanger : "standard";
        const danger = DM_CONFIG().contractDanger[dangerId];
        const adjustedQuest = copy(questDefinition);
        if (adjustedQuest.interruptionRules) {
            adjustedQuest.interruptionRules.frequencyMin = Math.max(0, adjustedQuest.interruptionRules.frequencyMin + danger.interruptionMin);
            adjustedQuest.interruptionRules.frequencyMax = Math.max(adjustedQuest.interruptionRules.frequencyMin, adjustedQuest.interruptionRules.frequencyMax + danger.interruptionMax);
        }
        adjustedQuest.stages = buildJourneyStages(adjustedQuest, id);
        const stages = scheduleStages(adjustedQuest, id);
        const order = orderFor(orderId || state.orders?.[teamKey]);
        const scaledRewards = (table, multiplier) => Object.fromEntries(Object.entries(table || { victory: 0, draw: 0, defeat: 0 }).map(([key, value]) => [key, Math.max(0, Math.round(value * multiplier))]));
        state.orders ||= { A: "exploration", B: "exploration" }; state.orders[teamKey] = order.id;
        state.contractDanger = dangerId;
        state.trips[teamKey] = {
            id, balanceVersion:questDefinition.balanceVersion||0,encounterGroup:questDefinition.encounterGroup,xpPool:questDefinition.xpPool,encounterTuning:copy(questDefinition.encounterTuning||{}),lockedBackground:{name:questDefinition.battleback||"Grassland",folder:questDefinition.battlebackFolder||"battlebacks1"}, questId: questDefinition.id, questName: questDefinition.name, teamKey, leaderId: selectedLeader.id, leadershipSuccessionCount: 0, boss: !!questDefinition.boss, phase: "outbound",
            deadlineMs: now + outboundMs, outboundMs, xp, rewardGold: scaledRewards(questDefinition.rewardGold, danger.reward), rewardArcana: scaledRewards(questDefinition.rewardArcana, danger.arcana),
            xpRemainderIds:ids.slice(0,(questDefinition.xpPool||0)%ids.length),team: ids.map(npcId => { const npc = state.roster.find(n => n.id === npcId); return { id: npcId, injury: npc.injury, injuryExpeditionId: npc.injuryExpeditionId || null, maxHealth: npc.maxHealth }; }),
            preparedTeam, order: order.id, strategy: order.legacyStrategy, signatureUses: {}, decision: null, battleSnapshot: null, battleEvents: [],
            stages, stageIndex: 0, stageStartedAt: now, stageDurationMs: outboundMs,
            outboundTotalMs: stages.length ? stages.filter(stage => stage.type === "travel").reduce((sum, stage) => sum + stage.durationSeconds * 1000, 0) : outboundMs,
            outboundElapsedMs: 0, pendingRewards: { gold: 0, arcana: 0 },
            chronicle: [], expeditionInjuries: {}, expeditionDeaths: {}, deathSaveResults: {}, contractDanger: dangerId, abandoned: false,
            skulls:dangerRating(questDefinition),encounterTier:encounterTier(questDefinition),intendedLevel:dangerRating(questDefinition),difficulty:authoredDifficulty(questDefinition),risk:questDefinition.risk, bonusRewards: copy(questDefinition.bonusRewards || {}), rewardTypes: copy(questDefinition.rewardTypes || []), combatMode: questDefinition.combatMode || "required",
            objectiveReturnText:questDefinition.objectiveReturnText, minorEncounterEnemyIds: copy((questDefinition.randomEncounters || []).map(id => RANDOM_BATTLE_ENEMIES[id]).find(Boolean) || [])
        };
        durationMinutes=questDefinition.durationMinutes??durationMinutes;
        if(durationMinutes!==null){
            durationMinutes=questDefinition.durationMinutes??durationMinutes;const minutes=EXPEDITION_DURATIONS.includes(Number(durationMinutes))?Number(durationMinutes):Math.min(30,Math.max(1,Math.floor(Number(durationMinutes)||1)));
            Object.assign(state.trips[teamKey],{realtime:true,returnNarrated:false,durationMinutes:minutes,totalDurationMs:minutes*60000,remainingMs:minutes*60000,elapsedMs:0,sessionLastAt:null,lastProgressAtMs:null,phase:"travel",latestEvent:"The expedition departed camp.",timeline:["Departed camp."],milestones:{travelEvent:false,encounter:false,battle:false,return:false},lockedPlan:{questId:questDefinition.id,teamIds:ids.slice(),leaderId:selectedLeader.id,order:order.id,contractDanger:dangerId,difficulty:authoredDifficulty(questDefinition),durationMinutes:minutes}});
        }
        activateRituals(state,state.trips[teamKey]);
        if(state.campTimer?.active){state.campTimer.active=false;state.campTimer.pendingBell=false;state.campTimer.stopReason="quest_started";}
        state.expeditionReplay=null;
        state.questResults=null;
        if(state.trips[teamKey].realtime){
            const trip=state.trips[teamKey];
            trip.encounterPlan=encounterPlan(trip);
            if(trip.durationMinutes===1){trip.combatMode="none";trip.rewardGold={victory:1,draw:0,defeat:0};trip.rewardArcana={victory:0,draw:0,defeat:0};trip.xp={...trip.xp,perMember:Math.floor(3/ids.length),total:3};trip.xpRemainderIds=ids.slice(0,3%ids.length);trip.bonusRewards={};}
            trip.presentationQueue=[{schema:1,kind:"travel",importance:"TRAVEL",holdMs:3500,color:"#c8dfbc",text:"Your companions set out together.",...expeditionLine(trip,"travel")}];
        }
        if (stages.length&&!state.trips[teamKey].realtime) enterStage(state.trips[teamKey], 0, now);
        state.lastClockAt = now;
        delete state.recoveryNotice;
        return id;
    }

    function stableUnit(text) {
        let value = 2166136261;
        for (const char of String(text)) value = Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0;
        return value / 4294967296;
    }
    const RANDOM_BATTLE_ENEMIES = Object.freeze({
        mimic:["mimic"],goblins:["goblin_1","goblin_2","goblin_archer"],wolves:["dire_wolf_1"],cultists:["cultist_1","cultist_2","mage_cultist"],
        skeletons:["skeleton_1","skeleton_2","skeleton_archer_1"],bandits:["bandit_fighter_1","bandit_fighter_2","bandit_rogue"],spiders:["giant_spider_1","giant_spider_2"]
    });
    const RANDOM_OPPORTUNITY_EVENTS = Object.freeze({hidden_stash:"random_hidden_stash",rune:"random_rune",caravan:"random_caravan",swimming:"random_swimming"});
    const ENCOUNTER_CHANCES = Object.freeze({low:0.60,normal:0.85,high:0.98});
    function buildJourneyStages(questDefinition,tripId){
        if(Array.isArray(questDefinition?.stages)&&questDefinition.stages.length)return copy(questDefinition.stages);
        const seconds=Math.min(MAX_EXPEDITION_WAIT_SECONDS,Math.max(1,Math.floor(Number(questDefinition?.travelSeconds)||1)));
        const choices=(questDefinition?.randomEncounters||[]).filter(id=>RANDOM_BATTLE_ENEMIES[id]||RANDOM_OPPORTUNITY_EVENTS[id]);
        const conditionChance=(questDefinition?.knownConditions||[]).map(line=>String(line).match(/\b(low|normal|high) encounter chance\b/i)?.[1]).find(Boolean);
        const probability=ENCOUNTER_CHANCES[String(conditionChance||questDefinition?.chance||"normal").toLowerCase()]??ENCOUNTER_CHANCES.normal;
        const encounter=choices.length&&stableUnit(`${tripId}:${questDefinition.id}:encounter-roll`)<probability?choices[Math.floor(stableUnit(`${tripId}:${questDefinition.id}:encounter-pick`)*choices.length)]:null;
        const main=!['none','optional'].includes(questDefinition.combatMode)?{id:"quest_battle",type:"battle",label:questDefinition.name,enemyIds:copy(questDefinition.enemyIds||[]),...(questDefinition.skirmishEnemyIds?.length?{patrolEnemyIds:copy(questDefinition.skirmishEnemyIds)}:{}),mainQuest:true}:null;
        if(main && (questDefinition.durationMinutes||0)>=10){
            const ids=questDefinition.skirmishEnemyIds||[questDefinition.enemyIds?.find(id=>!/necromancer|demon|ogre/.test(id))].filter(Boolean);
            const skirmishes=[];for(let i=0;i<(questDefinition.durationMinutes>=15?2:1);i++)if(ids.length&&stableUnit(`${tripId}:${questDefinition.id}:skirmish:${i}`)<.65)skirmishes.push({id:`skirmish_${i}`,type:"battle",label:"Trail skirmish",enemyIds:[ids[i%ids.length]],randomEncounter:true,smallSkirmish:true,atRatio:.28+i*.16});
            return [{id:"journey",type:"travel",label:"Journey",durationSeconds:seconds},...skirmishes,main];
        }
        if(!encounter)return[{id:"journey",type:"travel",label:"Journey",durationSeconds:seconds},...(main?[main]:[])];
        const first=Math.max(1,Math.floor(seconds/2)),second=Math.max(1,seconds-first);
        const random=RANDOM_BATTLE_ENEMIES[encounter]
            ?{id:`random_${encounter}`,type:"battle",label:`Random encounter: ${encounter.replace(/_/g," ")}`,enemyIds:copy(RANDOM_BATTLE_ENEMIES[encounter]),randomEncounter:true}
            :{id:`random_${encounter}`,type:"event",label:`Opportunity: ${encounter.replace(/_/g," ")}`,eventId:RANDOM_OPPORTUNITY_EVENTS[encounter],interruption:false,randomEncounter:true};
        return[{id:"journey_out",type:"travel",label:"Journey",durationSeconds:first},random,{id:"journey_onward",type:"travel",label:"Journey onward",durationSeconds:second},...(main?[main]:[])];
    }
    function assignReplacementLeader(trip, deadLeaderId = null) {
        if (!trip || deadLeaderId && trip.leaderId !== deadLeaderId) return trip?.leaderId || null;
        const eligible = (trip.preparedTeam || []).filter(member => member.alive !== false && member.health > 0 && !trip.expeditionDeaths?.[member.id]);
        if (!eligible.length) { trip.leaderId = null; return null; }
        trip.leadershipSuccessionCount = Math.max(0, Math.floor(Number(trip.leadershipSuccessionCount) || 0)) + 1;
        const index = eligible.length === 1 ? 0 : Math.floor(stableUnit(`${trip.id}:succession:${trip.leadershipSuccessionCount}:${deadLeaderId || "vacant"}`) * eligible.length);
        const replacement = eligible[index]; trip.leaderId = replacement.id;
        trip.chronicle ||= []; trip.chronicle.push({ type: "leadership", actorId: replacement.id, text: `${replacement.name} becomes Party Leader after ${deadLeaderId || "the previous leader"} falls.` });
        return replacement.id;
    }
    function scheduleStages(questDefinition, tripId) {
        if (!Array.isArray(questDefinition?.stages) || !questDefinition.stages.length) return [];
        let stages = copy(questDefinition.stages), rules = questDefinition.interruptionRules;
        if (!rules) return stages;
        const candidates = stages.filter(stage => stage.type === "event" && stage.interruption !== false);
        const minimum = Math.max(0, Math.min(candidates.length, Math.floor(Number(rules.frequencyMin) || 0)));
        const maximum = Math.max(minimum, Math.min(candidates.length, Math.floor(Number(rules.frequencyMax) || candidates.length)));
        const count = minimum + Math.floor(stableUnit(`${tripId}:${questDefinition.id}:frequency`) * (maximum - minimum + 1));
        const selected = new Set(candidates.slice().sort((a, b) => stableUnit(`${tripId}:${a.id}`) - stableUnit(`${tripId}:${b.id}`)).slice(0, count).map(stage => stage.id));
        stages = stages.filter(stage => stage.type !== "event" || stage.interruption === false || selected.has(stage.id));
        const travel = stages.filter(stage => stage.type === "travel");
        const targetSeconds = Math.max(travel.length, Math.min(travel.length * MAX_EXPEDITION_WAIT_SECONDS, Math.floor(Number(questDefinition.travelSeconds) || 0)));
        const jitter = Math.max(0, Math.min(0.75, Number(rules.jitterPercent) || 0));
        if (travel.length && targetSeconds) {
            const weights = travel.map(stage => Math.max(1, Number(stage.durationSeconds) || 1) * (1 + jitter * (stableUnit(`${tripId}:${stage.id}:point`) * 2 - 1)));
            const weightTotal = weights.reduce((sum, value) => sum + value, 0); let assigned = 0;
            travel.forEach((stage, index) => {
                stage.durationSeconds = Math.min(MAX_EXPEDITION_WAIT_SECONDS, index === travel.length - 1 ? Math.max(1, targetSeconds - assigned) : Math.max(1, Math.round(targetSeconds * weights[index] / weightTotal)));
                assigned += stage.durationSeconds;
            });
        }
        return stages;
    }

    function currentStage(trip) { return trip?.stages?.[trip.stageIndex] || null; }
    function enterStage(trip, index, now = Date.now()) {
        now = validNow(now); trip.stageIndex = index; trip.decision = null;
        const stage = currentStage(trip);
        if (!stage) { beginReturn(trip, now); return "return"; }
        if (stage.type === "travel") {
            const duration = Math.min(MAX_EXPEDITION_WAIT_SECONDS, Math.max(1, Math.floor(Number(stage.durationSeconds) || trip.outboundMs / 1000))) * 1000;
            trip.phase = "outbound"; trip.stageStartedAt = now; trip.stageDurationMs = duration; trip.deadlineMs = now + duration;
        } else if (stage.type === "event") {
            trip.phase = "halted"; trip.deadlineMs = 0;
        } else if (stage.type === "battle") {
            trip.phase = "ready"; trip.deadlineMs = 0;
        } else throw new Error(`Unknown expedition stage type: ${stage.type}`);
        return trip.phase;
    }
    function advanceStage(trip, now = Date.now()) { return enterStage(trip, (trip.stageIndex || 0) + 1, now); }
    function expeditionProgress(trip, now = Date.now()) {
        if (!trip) return 0;
        if (trip.phase === "return") return Math.max(0, Math.min(1, 1 - Math.max(0, trip.deadlineMs - now) / Math.max(1, trip.stageDurationMs || 1)));
        const total = Math.max(1, trip.outboundTotalMs || trip.outboundMs || 1);
        const active = trip.phase === "outbound" ? Math.max(0, Math.min(trip.stageDurationMs || 0, now - (trip.stageStartedAt || now))) : 0;
        return Math.max(0, Math.min(1, ((trip.outboundElapsedMs || 0) + active) / total));
    }
    function beginReturn(trip, now = Date.now()) {
        now = validNow(now); trip.phase = "return"; trip.stageStartedAt = now;
        trip.stageDurationMs = Math.min(MAX_EXPEDITION_WAIT_SECONDS * 1000, Math.max(1000, Math.ceil(trip.outboundMs / 2))); trip.deadlineMs = now + trip.stageDurationMs;
        return trip.deadlineMs;
    }

    function arriveQuest(state, teamKey, now = Date.now()) {
        now = validNow(now);
        const trip = tripForTeam(state, teamKey);
        if (!trip || trip.phase !== "outbound" || now < trip.deadlineMs) return false;
        if (trip.stages?.length) {
            trip.outboundElapsedMs = Math.min(trip.outboundTotalMs || Infinity, (trip.outboundElapsedMs || 0) + (trip.stageDurationMs || 0));
            advanceStage(trip, now);
        }
        else { trip.phase = "ready"; trip.deadlineMs = 0; }
        return true;
    }

    function startBattle(state, teamKey) {
        const trip = tripForTeam(state, teamKey);
        if (!trip || trip.phase !== "ready") return false;
        trip.phase = "battle";
        return true;
    }

    function resolveExpeditionEvent(state, teamKey, eventDefinition, decision, now = Date.now()) {
        now = validNow(now);
        const trip = tripForTeam(state, teamKey), stage = currentStage(trip);
        if (!trip || trip.phase !== "halted" || stage?.type !== "event" || stage.eventId !== eventDefinition?.id) throw new Error("No matching halted expedition event.");
        const outcomeKey = decision?.resolved ? decision.actionId : "ineligible";
        let outcome = copy(eventDefinition.outcomes?.[outcomeKey] || eventDefinition.outcomes?.default || {});
        const eventCheck = decision?.eventCheck;
        if (eventCheck) {
            if (eventCheck.natural20 && outcome.criticalSuccess) outcome = { ...outcome, ...outcome.criticalSuccess };
            else if (eventCheck.natural1 && outcome.criticalFailure) outcome = { ...outcome, ...outcome.criticalFailure };
            else if (!eventCheck.success && outcome.failure) outcome = { ...outcome, ...outcome.failure };
        }
        trip.pendingRewards.gold += Math.max(0, Math.floor(Number(outcome.gold) || 0));
        trip.pendingRewards.arcana += Math.max(0, Math.floor(Number(outcome.arcana) || 0));
        trip.decision = copy(decision || { resolved: false, message: "The party cannot act." });
        if (outcome.wound) {
            const eligible = trip.preparedTeam.filter(member => member.alive !== false && member.health > 0);
            const wounded = eligible.find(member => member.id === (outcome.woundActorId || decision?.leaderId)) || eligible[0];
            if (wounded) {
                applyWound(state, wounded.id, trip.id);
                outcome.woundedId = wounded.id; outcome.woundedName = wounded.name;
            }
        }
        const actor = decision?.leaderName ? `${decision.leaderName}: ` : "";
        const text = `${eventDefinition.name}: ${actor}${outcome.text || decision?.message || "The opportunity passes."}`;
        trip.chronicle.push({ type: "decision", stageId: stage.id || stage.eventId, actorId: decision?.leaderId || null, actionId: decision?.actionId || null,
            obeyed: decision?.obeyed ?? null, gold: Math.max(0, Math.floor(Number(outcome.gold) || 0)), arcana: Math.max(0, Math.floor(Number(outcome.arcana) || 0)), text });
        if (stage.interruption !== false || outcome.dangerous || stage.continueDecision) { trip.phase = "choice"; trip.choiceReason = outcome.danger || eventDefinition.danger || "Continuing may expose Wounded adventurers to lethal danger."; }
        else advanceStage(trip, now);
        state.lastClockAt = now;
        return { outcome: copy(outcome), phase: trip.phase, text };
    }

    function resolveExpeditionChoice(state, teamKey, continueQuest, now = Date.now()) {
        now = validNow(now); const trip = tripForTeam(state, teamKey);
        if (!trip || trip.phase !== "choice") return false;
        if (continueQuest) {
            trip.chronicle.push({ type: "management", text: "The guild ordered the expedition to continue despite the danger." });
            advanceStage(trip, now);
        } else {
            trip.abandoned = true;
            trip.chronicle.push({ type: "management", text: "The guild recalled the party to preserve its survivors." });
            if (trip.battleSnapshot) trip.battleSnapshot.status = "defeat";
            beginReturn(trip, now);
        }
        return true;
    }

    function recordBattleResult(state, teamKey, tripId, snapshot, now = Date.now(), events = []) {
        now = validNow(now);
        const trip = tripForTeam(state, teamKey);
        if (!trip || trip.id !== tripId) {
            if (state.settledTrips?.[tripId]) return { ok: true, duplicate: true };
            throw new Error("No matching trip.");
        }
        const battleRecordKey=String(trip.stageIndex);
        if(trip.recordedBattleStages?.[battleRecordKey])return{ok:true,duplicate:true};
        if (trip.phase === "return") return { ok: true, duplicate: true };
        if (trip.phase !== "battle" || !["victory", "defeat", "draw"].includes(snapshot?.status)) throw new Error("Battle is not ready to complete.");
        const normalizedSnapshot = copy(snapshot);
        if (!Array.isArray(normalizedSnapshot.fighters)) normalizedSnapshot.fighters = [
            ...(normalizedSnapshot.player || []).map(fighter => ({ ...fighter, side: "player" })),
            ...(normalizedSnapshot.enemy || []).map(fighter => ({ ...fighter, side: "enemy" }))
        ];
        trip.battleSnapshot = normalizedSnapshot;
        if(snapshot.ritualEffects)trip.ritualEffects=copy(snapshot.ritualEffects);
        if(trip.ritualEffects)delete trip.ritualEffects.battle_hymn;
        if(snapshot.status==="victory")trip.ritualBattlesWon=(trip.ritualBattlesWon||0)+1;
        trip.signatureUses = copy(snapshot.signatureUses || trip.signatureUses || {});
        trip.battleEvents.push(...copy(Array.isArray(events) ? events : []));
        const players = normalizedSnapshot.fighters.filter(fighter => fighter.side === "player");
        for (const fighter of players) {
            const prepared = trip.preparedTeam.find(member => member.id === fighter.id);
            if (!prepared) continue;
            const persistent = state.roster.find(member=>member.id===fighter.id);
            const fate=events.find(e=>e.type==="deathSave"&&e.key===`player:${fighter.id}`);
            const wouldSurvive=!persistent?.reanimated&&(fate?(fate.survived??fate.check?.success):stableUnit(`${trip.id}:${trip.stageIndex}:${fighter.id}:fate`) < .5);
            if(fighter.health<=0&&!wouldSurvive&&trip.ritualEffects?.veil_of_mercy&&!trip.expeditionDeaths[fighter.id]){delete trip.ritualEffects.veil_of_mercy;fighter.health=1;fighter.alive=true;fighter.mercyRescued=true;trip.battleEvents.push({type:"mercy",targetKey:`player:${fighter.id}`,targetHealth:1,text:`Veil of Mercy: ${fighter.name} survives at 1 HP with a serious wound.`});}
            if(persistent){ensureLife(persistent);let lost=Math.max(0,persistent.classArmor+equipmentArmor(persistent)-Math.max(0,(Number(fighter.armor)||0)-(fighter.ritualArmor||0)));const classLoss=Math.min(persistent.classArmor,lost);persistent.classArmor-=classLoss;lost-=classLoss;for(const slot of EQUIPMENT_SLOTS){if(!lost)break;const gearId=persistent.equipmentSlots[slot],item=SHOP[gearId];if(!item?.armor)continue;const c=persistent.equipmentCondition[gearId]||={current:item.armor,max:item.armor};const used=Math.min(c.current,lost);c.current-=used;lost-=used;}persistent.temporaryWard=Math.max(0,Number(fighter.temporaryWard)||0);persistent.innateWard=Math.max(0,Number(fighter.innateWard) || 0);}
            if(persistent&&fighter.equipmentWearVersion===31){persistent.classArmor=fighter.classArmor;persistent.equipmentCondition=copy(fighter.equipmentCondition||{});persistent.equipmentSlots=copy(fighter.equipmentSlots||{});ensureLife(persistent);}
            prepared.ritualArmor=Math.max(0,fighter.ritualArmor||0);
            if(fighter.mercyRescued&&persistent&&!trip.mercyRescuedIds?.includes(fighter.id)){(trip.mercyRescuedIds||=[]).push(fighter.id);seriousWound(persistent);trip.expeditionInjuries[fighter.id]=true;prepared.injury=persistent.injury;prepared.lastingInjuries=persistent.lastingInjuries;prepared.permanentWounds=copy(persistent.permanentWounds);prepared.dodgeChance=persistent.dodgeChance;prepared.speed=fighter.mercyStatsApplied?fighter.speed:prepared.speed*.97;}
            if (fighter.health <= 0) {
                const survived=wouldSurvive;
                trip.deathSaveResults[fighter.id]={success:survived,coinFlip:true};
                
                if(survived){
                    applyWound(state,fighter.id,trip.id);
                    if(persistent){persistent.lastingInjuries=(persistent.lastingInjuries||0)+1;
                        const wound=WOUND_DEFINITIONS.find(w=>!persistent.permanentWounds.includes(w.id));
                        if(wound)addPermanentWound(persistent,wound.id);
                        persistent.history.deathRollsSurvived++;ensureLife(persistent);}
                    Object.assign(prepared,{health:0,alive:false,incapacitated:true,condition:CONDITIONS.WOUNDED});
                }else killAdventurer(state,fighter.id,{questId:trip.id,questName:trip.questName,killedBy:fighter.defeatedBy?.name,reason:"Knockout coin: death"});
            } else if (!trip.expeditionDeaths[fighter.id]) { prepared.health = fighter.health;if(persistent)persistent.health=fighter.health; prepared.alive = true; prepared.condition = trip.expeditionInjuries[fighter.id] ? CONDITIONS.WOUNDED : conditionOf(prepared); }
        }
        for(const event of events.filter(e=>e.type==="gearBroken"&&e.itemId)){
            const text=event.text;(trip.gearLosses||=[]).push({memberId:event.memberId,itemId:event.itemId,text});trip.chronicle.push({type:"gearBroken",text});addTimeline(trip,text);
        }
        if(snapshot.status==="victory"&&stableUnit(`${trip.id}:${trip.stageIndex}:equipment-drop`)<(trip.boss?.06:.03)){
            const pool=armorGearIds().filter(id=>!SHOP[id].legacy&&SHOP[id].price<=30+dangerRating(trip)*16&&SHOP[id].classes.some(cls=>trip.preparedTeam.some(n=>n.classId===cls)));
            const id=pool[Math.floor(stableUnit(`${trip.id}:${trip.stageIndex}:equipment-item`)*pool.length)];
            if(id){normalizeInventory(state);state.equipmentStock[id]++;const text=`Battle loot: ${SHOP[id].name}. Kept even if recalled.`;(trip.equipmentDrops||=[]).push({itemId:id,stageIndex:trip.stageIndex});(trip.acquiredItems||=[]).push(SHOP[id].name);trip.chronicle.push({type:"equipmentDrop",itemId:id,text});addTimeline(trip,text);}
        }
        (trip.recordedBattleStages ||= {})[battleRecordKey]=true;
        for(const prepared of trip.preparedTeam){const live=state.roster.find(n=>n.id===prepared.id);if(live){prepared.equipmentCondition=copy(live.equipmentCondition);prepared.equipmentStats=copy(live.equipmentStats);prepared.dodgeChance=live.dodgeChance;prepared.critChance=live.critChance;prepared.innateWardMax=live.innateWardMax;prepared.equipmentSlots=copy(live.equipmentSlots);prepared.classArmor=live.classArmor;prepared.classArmorMax=live.classArmorMax;prepared.maxArmor=live.classArmorMax+equipmentArmorMax(live);prepared.maxWard=live.innateWardMax+live.temporaryWard;prepared.armor=live.classArmor+equipmentArmor(live)+(prepared.ritualArmor||0);prepared.innateWard=live.innateWard;prepared.ward=live.innateWard+live.temporaryWard;prepared.temporaryWard=live.temporaryWard;}}
        trip.chronicle.push({ type: "battle",skirmish:!!currentStage(trip)?.randomEncounter,stageId:currentStage(trip)?.id, text: `${currentStage(trip)?.label || trip.questName} ended in ${snapshot.status}.` });
        if (!trip.preparedTeam.some(member => member.alive !== false && member.health > 0)) {
            if(trip.realtime){trip.wiped=true;trip.phase="wipe";trip.deadlineMs=0;trip.stageDurationMs=0;addTimeline(trip,"The expedition party was defeated; consequences are recorded and the expedition clock continues to recovery.");state.lastClockAt=now;return{ok:true,immediate:false,deadlineMs:0};}
            beginReturn(trip, now); trip.deadlineMs = now; trip.stageDurationMs = 0;
            const report = completeReturn(state, teamKey, tripId, now);
            return { ok: true, immediate: true, report, deadlineMs: now };
        }
        else if (trip.stages?.length && trip.stageIndex < trip.stages.length - 1) {
            trip.phase = trip.realtime?"travel":"choice";
            trip.choiceReason = Object.keys(trip.expeditionInjuries).length ? "A Wounded adventurer knocked out again must make a Death Save." : "The party can press onward, but further stages may contain dangerous encounters.";
        } else beginReturn(trip, now);
        state.lastClockAt = now;
        return { ok: true, deadlineMs: trip.deadlineMs };
    }

    function authoredDifficulty(quest={}){return ["Easy","Normal","Hard"].includes(quest.difficulty)?quest.difficulty:/high|hard/i.test(quest.risk||"")?"Hard":/low|easy/i.test(quest.risk||"")?"Easy":"Normal";}
    function sessionRecap(trip={}){
        const battles=(trip.chronicle||[]).filter(e=>e.type==="battle");
        return {endKind:trip.endKind||(trip.autoRetreat?"auto_retreat":"complete"),autoRetreat:!!trip.autoRetreat,retreatReason:trip.retreatReason||null,
            plannedDurationMs:trip.totalDurationMs||trip.plannedDurationMs||0,sessionElapsedMs:trip.sessionElapsedMs??trip.elapsedMs??0,
            skulls:dangerRating(trip),difficulty:authoredDifficulty(trip),gearLosses:copy(trip.gearLosses||[]),enemyXpEarned:trip.enemyXpEarned||0,battleCount:battles.length,skirmishCount:battles.filter(e=>e.skirmish||/skirmish/i.test(e.text||"")).length,
            objectiveState:trip.autoRetreat?"Returned before the objective":trip.endKind==="early"?"Session ended early":trip.battleSnapshot?.status==="defeat"?"Expedition concluded":"Objective reached"};
    }
    function retreatAssessment(trip,stage,content){
        const survivors=(trip.preparedTeam||[]).filter(n=>n.alive!==false&&n.health>0&&!trip.expeditionDeaths?.[n.id]);
        const enemies=encounterEnemies(stage||{},content,trip);
        const hp=survivors.reduce((s,n)=>s+n.health,0),defense=survivors.reduce((s,n)=>s+Math.max(0,n.armor||0)+Math.max(0,n.innateWard??0)+Math.max(0,n.temporaryWard||0),0),effective=hp+defense;
        const threat=enemies.reduce((s,n)=>s+(n.health||n.maxHealth||1)+(n.armor||0)+(n.arcaneArmor||n.innateWard||0),0),burst=enemies.reduce((s,n)=>s+Math.max(1,n.damage||1,n.signatureDamage||0),0);
        const battered=survivors.length<(trip.team?.length||trip.preparedTeam?.length||3)||hp<=survivors.length&&defense===0;
        const catastrophic=!!enemies.length&&(!survivors.length||battered&&effective<=Math.max(3,burst)&&threat>=Math.max(3,effective*3));
        return {retreat:catastrophic,survivors:survivors.length,hp,defense,effective,threat,burst,enemyCount:enemies.length,
            reason:!survivors.length?"No companions can face another encounter. The expedition is returning.":`Only ${survivors.length} companions remain with ${hp} HP and ${defense} defense against ${enemies.length} foes. They turn home before another overwhelming fight.`};
    }
    function beginAutomaticRetreat(trip,assessment){
        if(trip.autoRetreat)return;trip.autoRetreat=true;trip.endKind="auto_retreat";trip.retreatReason=assessment.reason;trip.retreatAssessment=copy(assessment);trip.retreatAtMs=trip.elapsedMs;
        trip.phase="return";trip.returnNarrated=false;trip.milestones.return=true;
        trip.rewardGold={victory:0,draw:0,defeat:0};trip.rewardArcana={victory:0,draw:0,defeat:0};trip.xp={...trip.xp,perMember:0,total:0};trip.bonusRewards={};
        trip.battleSnapshot={status:"defeat",fighters:(trip.preparedTeam||[]).map(n=>({...copy(n),side:"player",alive:n.health>0&&n.alive!==false}))};
        const event={schema:1,kind:"travel",sourceType:"returnBeat",importance:"TRAVEL",holdMs:4000,text:assessment.reason,dialogue:"The notes can wait. Let us bring everyone home.",dialogueSpeakerName:"Party"};
        (trip.presentationQueue||=[]).push(event);(trip.chronicle||=[]).push({type:"autoRetreat",text:assessment.reason});addTimeline(trip,assessment.reason);
    }
    function endSessionEarly(state,tripId,confirmed=false){
        const settled=state.settledTrips?.[tripId];if(settled?.endKind==="early")return{ok:true,duplicate:true,report:copy(settled)};
        const trip=tripForTeam(state,"A");if(!trip?.realtime||trip.id!==tripId)return{ok:false,message:"This session has already ended."};
        if(!confirmed)return{ok:false,confirmationRequired:true,message:"End the timer and expedition now? Completion rewards and XP are forfeited; existing consequences and finds remain."};
        finishBattlePlayback(trip,"Recall: resolved combat before retreat.");
        trip.endKind="early";trip.sessionElapsedMs=trip.elapsedMs;const meta=sessionRecap(trip),chronicle=copy(trip.chronicle||[]),finds=copy(trip.acquiredItems||[]);
        const result=recallExpedition(state);trip.remainingMs=0;trip.presentationQueue=[];trip.presentationCurrent=null;state.expeditionReplay=null;
        const report=state.lastReport;Object.assign(report,meta,{outcome:"ended",status:"ended",endKind:"early",chronicle,battleEvents:copy(trip.battleEvents||[]),bonusRewards:finds,participantIds:trip.team.map(n=>n.id),xpPerMember:0,completedAt:Date.now()});
        report.lines=["Session ended early. Your field notes and previous finds are kept.","No completion rewards or XP. You can choose another session whenever you like."];
        state.questResults=resultSnapshot(state,report,trip.team.map(n=>n.id));state.questResults.armorRestored=true;report.results=copy(state.questResults);state.settledTrips[tripId]=copy(report);
        state.questHistory.push(copy(report));state.questHistory=state.questHistory.slice(-QUEST_HISTORY_LIMIT);state.completionCue={questId:tripId,pending:true};
        return {...result,report:copy(report),message:"Session ended. Your previous finds and consequences are preserved."};
    }
    function resultSnapshot(state, report, ids, levelsBefore = {}) {
        const items = new Map();
        for (const name of report.bonusRewards || []) items.set(name, (items.get(name) || 0) + 1);
        const result={
            questId: report.questId, questName: report.questName, outcome: report.outcome || report.status,
            ...Object.fromEntries(["endKind","autoRetreat","retreatReason","plannedDurationMs","sessionElapsedMs","skulls","gearLosses","enemyXpEarned","difficulty","battleCount","skirmishCount","objectiveState"].map(k=>[k,report[k]])),
            recalled: !!report.recalled, rewardGold: report.rewardGold || 0, rewardArcana: report.rewardArcana || 0,
            totalGold: state.gold, totalArcana: state.arcana, vacancies: vacantSlots(state).length,
            items: [...items].map(([name, quantity]) => ({ name, quantity,itemId:Object.keys(SHOP).find(id=>SHOP[id].name===name)||null })),
            enemiesDefeated:(report.memberStats||[]).reduce((sum,n)=>sum+n.kills,0), xpPerMember:report.xp?.perMember||report.xpPerMember||0,
            members: ids.map(id => {
                const npc = state.roster.find(n => n.id === id);
                if (!npc) return { id, name: id, missing: true, health: 0, maxHealth: 0, armor: 0, ward: 0, condition: "Missing", permanentWounds: [] };
                return { id, name: displayName(npc), classId:npc.classId,role:npc.role,sex:npc.sex, portrait: copy(npc.portrait || {}), combatPortrait: copy(npc.combatPortrait || {}), walkPortrait: copy(npc.walkPortrait || {}), portraitKey:npc.portraitKey,...(npc.fallenPortrait?{fallenPortrait:copy(npc.fallenPortrait)}:{}), health: npc.health,
                    maxHealth: npc.maxHealth, armor: living(npc) ? npc.classArmor+equipmentArmor(npc) : 0,
                    ward: living(npc) ? (npc.innateWard || 0) + (npc.temporaryWard || 0) : 0,
                    levelChanges:Object.entries(classStats(npc)).map(([k,v])=>[k,v-classStats({...npc,level:levelsBefore[id]||npc.level})[k]]).filter(([k,v])=>v).map(([k,v])=>`${k} +${v}`).concat(npc.level>=3&&(levelsBefore[id]||npc.level)<3?["Signature unlocked"]:npc.level>=6&&(levelsBefore[id]||npc.level)<6?["Class refinement unlocked"]:[]).join(", "), oldLevel:levelsBefore[id]||npc.level, lastingInjuries:npc.lastingInjuries||0, condition: conditionOf(npc), permanentWounds: woundLines(npc),
                    level: npc.level, levelledUp: Number.isFinite(levelsBefore[id]) && npc.level > levelsBefore[id] };
            })
        };result.fieldNotes=[xpFieldNote(report,result.members)];return result;
    }
    function dismissQuestResults(state) { state.questResults = null; state.expeditionReplay = null; normalizeFocusRoster(state); }

    function restoreReturnArmor(npc){
        ensureLife(npc);npc.classArmor=npc.classArmorMax;
        for(const id of Object.values(npc.equipmentSlots||{}))if(SHOP[id]?.armor&&!npc.equipmentCondition[id]?.broken)npc.equipmentCondition[id]={...npc.equipmentCondition[id],current:SHOP[id].armor,max:SHOP[id].armor};
    }
    function completeReturn(state, teamKey, tripId, now = Date.now()) {
        now = validNow(now);
        if (state.settledTrips?.[tripId]) {
            if (state.trips?.[teamKey]?.id === tripId) {
                const oldTrip=state.trips[teamKey],report=state.settledTrips[tripId];
                state.trips[teamKey]=null;
                if(!state.questResults)state.questResults=report.results?copy(report.results):resultSnapshot(state,report,oldTrip.team.map(n=>n.id));
                normalizeFocusRoster(state);
            }
            return copy(state.settledTrips[tripId]);
        }
        const trip = tripForTeam(state, teamKey);
        if (!trip || trip.id !== tripId || trip.phase !== "return" || now < trip.deadlineMs) return null;
        if (!trip.battleSnapshot) {
            trip.battleSnapshot = { status: trip.abandoned ? "defeat" : "draw", fighters: trip.preparedTeam.map(member => ({ ...copy(member), side: "player", alive: member.health > 0 })) };
        } else {
            const enemies = trip.battleSnapshot.fighters.filter(fighter => fighter.side !== "player");
            trip.battleSnapshot.fighters = [...trip.preparedTeam.map(member => ({ ...copy(member), side: "player", alive: member.health > 0 })), ...enemies];
        }
        const selectedTeam = state.activeTeam, selectedIds = state.teamIds.slice(), previousActive = state.activeQuest;
        state.activeQuest = trip;
        state.activeTeam = teamKey;
        state.teamIds = trip.team.map(member => member.id);
        if (trip.battleSnapshot?.status === "victory" && !trip.bonusRewardsResolved) applyCompletionBonus(state, trip);
        const levelsBefore = Object.fromEntries(trip.team.map(n => [n.id, state.roster.find(member => member.id === n.id)?.level]));
        let report;
        try { report = finishQuest(state, trip.id, trip.battleSnapshot, trip.battleEvents, now); }
        finally {
            state.activeQuest = previousActive;
            state.activeTeam = selectedTeam;
            state.teamIds = (state.teams[selectedTeam] || selectedIds).filter(id => living(state.roster.find(n => n.id === id)));
        }
        for(const member of trip.team||[]){const npc=state.roster.find(n=>n.id===member.id);if(living(npc)){restoreBetweenBattles(npc);npc.innateWard=npc.innateWardMax;restoreReturnArmor(npc);npc.history.questsCompleted++;npc.history.battlesSurvived++;if(trip.boss)npc.history.bossQuests++;evaluateEarnedTraits(npc);}}
        if (trip.awardedBonus?.length||trip.acquiredItems?.length) {
            report.bonusRewards = [...(trip.acquiredItems||[]),...(trip.awardedBonus||[])];
            report.lines.push(`Bonus finds: ${report.bonusRewards.join(", ")}.`);
            state.lastReport = copy(report);
            state.settledTrips[trip.id] = copy(report);
        }
        state.trips[teamKey] = null;
        state.teams[teamKey] = trip.team.map(n=>n.id).filter(id=>living(state.roster.find(n=>n.id===id)));
        if (state.activeTeam === teamKey) state.teamIds = state.teams[teamKey].slice();
        report.equipmentDrops=copy(trip.equipmentDrops||[]);
        report.lines.push("Returning companions: Armor fully restored; magical wards replenished.");
        report.results = resultSnapshot(state, report, trip.team.map(n => n.id), levelsBefore);
        report.results.armorRestored=true;
        state.questResults = copy(report.results);
        state.completionCue = {questId:trip.id,pending:true};
        state.lastReport = copy(report);
        state.settledTrips[trip.id] = copy(report);
        const history = state.questHistory.find(record => record.questId === trip.id);
        if (history) history.results = copy(report.results);
        if(state.questResults&&!report.fieldNotes){state.questResults.fieldNotes=[xpFieldNote(report,state.questResults.members)];report.fieldNotes=copy(state.questResults.fieldNotes);report.lines.push(...report.fieldNotes);report.results=copy(state.questResults);state.lastReport=copy(report);state.settledTrips[trip.id]=copy(report);}
        normalizeFocusRoster(state);
        state.lastClockAt = now;
        return report;
    }

    const RECRUIT_NAMES = ["Aster", "Bryn", "Cassia", "Dev", "Esme", "Galen", "Hollis", "Iris", "Jory", "Kestrel", "Linn", "Marek", "Nia", "Orin", "Pella", "Quill", "Rhea", "Soren"];
    function makeCandidate(generation, slot, classId=null, gender=null, used=[]) {
        const c = catalogue.classes.find(c=>c.id===classId)||catalogue.classes[Math.floor(slot/2)%catalogue.classes.length];
        const move = c.moves[(generation + slot) % 2];
        const sex = gender||SEXES[slot%2], race = RACES[(generation * 3 + slot) % RACES.length];
        const name = randomName(()=>stableUnit(`${generation}:${slot}:${c.id}:${sex}:name`),c.id,used,sex)||randomName(()=>0,c.id,[],sex);
        const stats = Object.fromEntries(STATS.map((key, index) => {
            const [min, max] = c.ranges[key]; return [key, min + ((generation + slot * 2 + index) % (max - min + 1))];
        }));
        const candidate = { id: `recruit-${generation}-${slot}`, name, role: c.name, level: 1, health: stats.maxHealth, ...stats,
            alive: true, passiveTrait: { name: "Fresh Talent", description: "Ready to prove themselves.", stat: c.stats.attack >= c.stats.defense ? "attack" : "defense", rank: 1 },
            basicAttack: "Adventurer Strike", signatureAttack: move.name, portrait: {sheet:["mage","cleric","rogue"].includes(c.id)?"Actor3":"Actor2",index:({barbarian:4,knight:0,ranger:6,rogue:4,mage:6,cleric:2}[c.id]||0)+(sex==="female"?1:0)},
            classId: c.id, selectedMove: move.id, sex, race, classAdjustments: Object.fromEntries(STATS.map(key => [key, stats[key] - c.stats[key]])),
            equipment: null, equipment2: null, xp: 0, injury: null, injuryExpeditionId: null, quests: 0, deathQuest: null, career: emptyCareer(), recruited: false,
            recruitmentCost: 35 + ((generation + slot) % 3) * 10 };
        ensureLife(candidate, false);
        migrateAutonomy(candidate);
        return candidate;
    }
    function ensureRecruit(state, now = Date.now()) {
        now = validNow(now);
        if (!state.recruit || !Array.isArray(state.recruit.candidates) || !state.recruit.candidates.length) {
            const generation = Number.isSafeInteger(state.recruitGeneration) ? state.recruitGeneration : 0;
            state.recruitGeneration = generation;
            state.recruit = { generation, deadlineMs: now + RECRUIT_REFRESH_MS, candidates: Array.from({length:12},(_,slot)=>makeCandidate(generation,slot)) };
        }
        if (!Number.isFinite(state.recruit.deadlineMs) || state.recruit.deadlineMs <= 0) state.recruit.deadlineMs = now + RECRUIT_REFRESH_MS;
        return state.recruit;
    }
    function refreshRecruit(state, now = Date.now()) {
        now = validNow(now); ensureRecruit(state, now);
        if (now < state.recruit.deadlineMs) return false;
        state.recruitGeneration = (state.recruitGeneration || 0) + 1;
        const generation = state.recruitGeneration;
        state.recruit = { generation, deadlineMs: now + RECRUIT_REFRESH_MS, candidates: Array.from({length:12},(_,slot)=>makeCandidate(generation,slot)) };
        return true;
    }
    function replacementCandidates(state){
        state.recruitGeneration=Number.isSafeInteger(state.recruitGeneration)&&state.recruitGeneration>=0?state.recruitGeneration:0;const recruit=ensureRecruit(state);state.recruitGeneration=Number.isSafeInteger(state.recruitGeneration)&&state.recruitGeneration>=0?state.recruitGeneration:0;
        const available=()=>recruit.candidates.filter(c=>c&&typeof c.id==="string"&&typeof c.name==="string"&&c.alive!==false&&c.health>0&&classFor(c)&&SEXES.includes(c.sex)&&!c.recruited&&!state.roster.some(n=>n.id===c.id));
        if(!recruit.coverageVersion){const seen=new Set();recruit.candidates=recruit.candidates.filter(c=>c&&typeof c.id==="string"&&typeof c.name==="string"&&(classFor(c)||LEGACY_CLASSES[c.classId])&&!state.roster.some(n=>n.id===c.id)&&!seen.has(c.id)&&(seen.add(c.id),true));for(const c of recruit.candidates){c.passiveTrait||={name:"Fresh Talent",stat:"attack",rank:1};migrateIdentity(c);ensureLife(c);c.recruitmentCost=0;}recruit.coverageVersion=1;}
        for(const c of catalogue.classes)for(const sex of SEXES)if(!available().some(n=>n.classId===c.id&&n.sex===sex)){
            const used=[...activeRoster(state),...available()].map(n=>n.name),generation=++state.recruitGeneration;
            const candidate=makeCandidate(generation,catalogue.classes.indexOf(c)*2+SEXES.indexOf(sex),c.id,sex,used);candidate.recruitmentCost=0;recruit.candidates.push(candidate);
        }
        const usedNames=activeRoster(state).map(n=>n.name);
        for(const candidate of available()){
            if(usedNames.some(name=>name.toLowerCase()===candidate.name.toLowerCase()))candidate.name=randomName(()=>stableUnit(candidate.id),candidate.classId,usedNames,candidate.sex);
            usedNames.push(candidate.name);migrateIdentity(candidate);
        }
        // Hired candidate records are immutable in the roster; the shop needn't retain copies.
        const uniqueIds=new Set();recruit.candidates=available().filter(c=>!uniqueIds.has(c.id)&&(uniqueIds.add(c.id),true));
        return available();
    }
    function beginStartingRoster(state,template,random=Math.random){
        if(state.questCount||state.questHistory?.length||Object.values(state.trips||{}).some(Boolean))return {ok:false,message:"Starting selection is only for a fresh game."};
        const seen=new Set();
        const pairs=[["knight","female"],["barbarian","male"],["ranger","female"],["rogue","male"],["cleric","female"],["mage","male"],["knight","male"],["barbarian","female"],["ranger","male"],["rogue","female"],["cleric","male"],["mage","female"]];
        const candidates=pairs.map(([classId,sex],i)=>{
            const npc=makeCandidate(0,i,classId,sex);if(template[i]){const pool=identityData.names?.[classId]?.[sex]||[];if(pool.includes(template[i].name))npc.name=template[i].name;}
            return npc;
        });
        state.roster=[];state.activeSlots=Array(MAX_ROSTER_SIZE).fill(null);state.campJobs={};state.campJobElapsed={};
        state.recruit={generation:0,coverageVersion:1,deadlineMs:Date.now()+RECRUIT_REFRESH_MS,candidates};
        state.startingRosterPending=true;normalizeFocusRoster(state);return {ok:true};
    }
    function confirmStartingRoster(state,ids){
        if(!state.startingRosterPending)return {ok:false,message:"Starting party is already confirmed."};
        const candidates=replacementCandidates(state);
        if(!Array.isArray(ids)||ids.length!==1||ids.some(id=>!candidates.some(n=>n.id===id)))return {ok:false,message:"Choose one available adventurer."};
        // Validation is atomic: an invalid selection never partly recruits a party.
        for(const id of ids){recruitCandidate(state,id);const npc=state.roster.find(n=>n.id===id);npc.founder=true;npc.foundingMember=true;}
        state.startingRosterPending=false;return {ok:true,message:"Your companion is ready."};
    }
    function recruitCandidate(state,candidateId,customName=null){
        if(customName!==null){const error=nameError(state,customName);if(error)return{ok:false,message:error};}
        if(state.activeQuest||Object.values(state.trips||{}).some(Boolean))return{ok:false,cost:0,message:"Hiring is available only after the expedition returns."};
        const slot=vacantSlots(state)[0];if(slot===undefined)return{ok:false,cost:0,message:"All five roster slots are filled."};
        const candidate=replacementCandidates(state).find(c=>c.id===candidateId);
        if(!candidate)return{ok:false,cost:0,message:"Choose an available Tavern candidate."};
        const npc=copy(candidate);if(customName!==null)npc.name=customName.trim();delete npc.recruited;delete npc.recruitmentCost;
        npc.retired=false;npc.dismissed=false;npc.condition=CONDITIONS.HEALTHY;npc.foundingMember=false;npc.founder=false;
        ensureLife(npc);ensureCareer(npc);npc.passiveTrait.rank=1;
        npc.history.joinedOrder=Math.max(0,...state.roster.map(n=>Number(n.history?.joinedOrder)||0))+1;
        npc.history.events.push({type:"freeReplacement",slot});candidate.recruited=true;
        state.roster.push(npc);state.activeSlots||=activeSlotIds(state);state.activeSlots[slot]=npc.id;
        normalizeFocusRoster(state);replacementCandidates(state);
        return{ok:true,cost:0,npc:copy(npc),message:`${displayName(npc)} filled slot ${slot+1} for free. ${vacantSlots(state).length} empty slots remain.`};
    }
    function dismissalError(state,id){
        const npc=state.roster.find(n=>n.id===id);
        if(!npc||!living(npc)||!activeRoster(state).some(n=>n.id===id))return "Choose a living active party member.";
        if(state.activeQuest||Object.values(state.trips||{}).some(Boolean))return "Dismissal is available only at camp after the expedition returns.";
        return "";
    }
    function dismissAdventurer(state,id,confirmed=false){
        const error=dismissalError(state,id);if(error)return{ok:false,message:error};
        if(!confirmed)return{ok:false,confirmationRequired:true,message:"Confirm dismissal. This creates an empty slot; a free Tavern replacement is required."};
        const npc=state.roster.find(n=>n.id===id);
        npc.dismissed=true;npc.retired=true;npc.retiredReason="dismissed";
        npc.history.events.push({type:"dismissed",questCount:state.questCount});
        state.activeSlots=activeSlotIds(state).map(member=>member===id?null:member);
        normalizeFocusRoster(state);
        return{ok:true,npc:copy(npc),message:`${displayName(npc)} was dismissed, not killed. Visit Tavern for a free replacement.`};
    }

    function normalizeClock(state, now) {
        now = validNow(now);
        const previous = state.lastClockAt;
        if (Number.isFinite(previous) && now + MAX_CLOCK_ROLLBACK_MS < previous) {
            const shift = previous - now;
            for (const trip of Object.values(state.trips || {})) if (trip && Number.isFinite(trip.deadlineMs) && trip.deadlineMs > 0) trip.deadlineMs = Math.max(now, trip.deadlineMs - shift);
            if (state.recruit?.deadlineMs > 0) state.recruit.deadlineMs = Math.max(now, state.recruit.deadlineMs - shift);
            state.clockNotice = "System clock moved backward; active timers kept their remaining duration.";
        }
        state.lastClockAt = now;
        return now;
    }

    function advanceTimers(state, now = Date.now()) {
        now = normalizeClock(state, now); ensureRecruit(state, now);
        const arrivals = [], returns = [];
        for (const teamKey of ["A"]) {
            const trip = tripForTeam(state, teamKey);
            if (!trip) continue;
            if(trip.realtime)continue;
            if (!Number.isFinite(trip.outboundMs) || trip.outboundMs < 1000) trip.outboundMs = 60000;
            if ((trip.phase === "outbound" || trip.phase === "return") && (!Number.isFinite(trip.deadlineMs) || trip.deadlineMs <= 0)) trip.deadlineMs = now + (trip.phase === "return" ? Math.ceil(trip.outboundMs / 2) : trip.outboundMs);
            if (trip.phase === "outbound" && arriveQuest(state, teamKey, now)) arrivals.push(teamKey);
            const returning = tripForTeam(state, teamKey);
            if (returning?.phase === "return" && now >= returning.deadlineMs) {
                const report = completeReturn(state, teamKey, returning.id, now);
                if (report) returns.push({ teamKey, report });
            }
        }
        // Legacy recruitment data is inert in the fixed-roster loop.
        const recruitRefreshed = false;
        return { arrivals, returns, recruitRefreshed };
    }

    function primaryReward(quest){
        const rewards=[{label:"Gold",value:Number(quest.rewardGold?.victory)||0},{label:"Arcana",value:Number(quest.rewardArcana?.victory)||0},{label:quest.xpPool!==undefined?"XP pool":"XP each",value:Number(quest.xpPool??quest.xpReward)||0}];
        return rewards.sort((a,b)=>b.value-a.value)[0].value?rewards[0]:{label:"Random chance",value:"Uncertain finds"};
    }
    function questDurationCategory(quest){const minutes=Number(quest.durationMinutes)||1;return minutes<=3?"Short":minutes<=10?"Medium":"Long";}
    function accrueCampJobs(state,deltaMs){
        ensureCampJobs(state);const delta=Math.min(MAX_SESSION_TICK_MS,Math.max(0,Number(deltaMs)||0));
        state.campJobElapsed=state.campJobElapsed&&typeof state.campJobElapsed==="object"&&!Array.isArray(state.campJobElapsed)?state.campJobElapsed:{};const away=unavailableIds(state);
        for(const npc of state.roster||[]){
            if(!living(npc)||npc.retired||away.has(npc.id))continue;
            const job=state.campJobs[npc.id],period=120000;
            const record=state.campJobElapsed[npc.id]=state.campJobElapsed[npc.id]&&typeof state.campJobElapsed[npc.id]==="object"?state.campJobElapsed[npc.id]:{};
            // Legacy telemetry was never production credit. New balances have an explicit marker.
            if(record.productionVersion!==4){
                for(const key of CAMP_JOBS){const prior=Number(record[key]),oldPeriod=record.productionVersion===3?60000:record.productionVersion===2?30000:key==="study"?300000:60000;record[key]=[1,2,3].includes(record.productionVersion)&&Number.isFinite(prior)?Math.floor((Math.max(0,prior)%oldPeriod)/oldPeriod*period):0;}
                record.productionVersion=4;
            }
            const recovery=Number.isFinite(record.recovery)?Math.max(0,record.recovery)%30000:0;
            record.recovery=npc.health<npc.maxHealth?recovery+delta:0;
            const recovered=Math.floor(record.recovery/30000);record.recovery%=30000;
            if(recovered){npc.health=Math.min(npc.maxHealth,npc.health+recovered);npc.lastCampHeal=true;}
            if(job==="idle")continue;
            const balance=Number(record[job]);record[job]=(Number.isFinite(balance)?Math.max(0,balance)%period:0)+delta;
            const units=Math.floor(record[job]/period);record[job]%=period;
            if(job==="work")state.gold+=units*campJobYield(npc,job);
            if(job==="study")state.arcana+=units*campJobYield(npc,job);
            
        }
        return state.campJobElapsed;
    }
    function normalizePresentationTrip(trip){
        if(!trip||typeof trip!=="object"||Array.isArray(trip))return null;
        const event=value=>typeof value==="string"?value:value&&typeof value==="object"?{...value,text:String(value.text||"Expedition event"),holdMs:Math.max(0,Number(value.holdMs)||0)}:null;
        trip.presentationQueue=(Array.isArray(trip.presentationQueue)?trip.presentationQueue:[]).map(event).filter(Boolean);
        trip.presentationCurrent=event(trip.presentationCurrent);
        trip.presentationFighters=(Array.isArray(trip.presentationFighters)?trip.presentationFighters:[]).filter(f=>f&&typeof f.key==="string"&&typeof f.name==="string");
        trip.presentationHoldMs=Math.max(0,Number(trip.presentationHoldMs)||0);
        trip.presentationDurationMs=Math.max(trip.presentationHoldMs,Number(trip.presentationDurationMs)||0);
        return trip;
    }
    function finishPresentationEvent(trip,event){
        if(event?.sourceType==="returnBeat")trip.returnNarrated=true;
        if(Array.isArray(event?.fighters))trip.presentationFighters=copy(event.fighters.filter(f=>f&&typeof f.key==="string"&&typeof f.name==="string"));
        const target=(Array.isArray(trip.presentationFighters)?trip.presentationFighters:[]).find(f=>f.key===event?.targetKey);
        if(target&&Number.isFinite(event.targetHealth)){target.health=event.targetHealth;if(Number.isFinite(event.targetArmor))target.armor=event.targetArmor;if(Number.isFinite(event.targetWard))target.ward=event.targetWard;}
        if(target&&event.sourceType==="defeat")target.presentationLifeState=target.side==="enemy"?"defeated":"down";
        if(target&&event.sourceType==="deathSave"){target.health=0;target.presentationLifeState=event.permanentDeath===true||event.survived===false||event.importance==="DEATH"?"dead":event.survived===true||/survives the Death Save/i.test(event.text||"")?"saved":"down";}
    }
    function debugAdvanceExpedition(state,content,BattleClass,complete=false){
        const trip=tripForTeam(state,"A");if(!trip?.realtime)return{ok:false,message:"No real-time expedition is active."};
        const next=complete?1:[.18,.35,.58,.78,1].find(r=>r*trip.totalDurationMs>trip.elapsedMs+.01);
        const target=Math.ceil((next||1)*trip.totalDurationMs);let result;
        while(state.trips.A===trip&&trip.elapsedMs<target){result=tickRealtimeExpedition(state,Math.min(MAX_SESSION_TICK_MS,target-trip.elapsedMs),content,BattleClass,false);}
        return{ok:true,message:result?.completed?"Expedition completed; consequences and rewards settled once.":`Expedition advanced to ${trip.phase}.`,result};
    }
    function addTimeline(trip,text){trip.latestEvent=text;trip.timeline=Array.isArray(trip.timeline)?trip.timeline:[];trip.timeline.push(text);trip.timeline=trip.timeline.slice(-12);}
    const PRESENTATION_LEVELS=Object.freeze(["NORMAL","INTERESTING","DANGEROUS","CRITICAL","DEATH","SIGNATURE","BOSS","TRAVEL"]);
    function buildBattlePresentation(events,snapshot,trip,config={}){
        const styles=config.importance||{},dialogue=config.dialogue||{},cooldown=Math.max(0,Number(config.triggerCooldownEvents)||3),maxDialogue=Math.max(0,Number(config.maxDialoguePerBattle)||4);
        const output=[],used=new Set(),lastTrigger={},bonded=new Set((trip?.preparedTeam||[]).filter(n=>n.battleBonuses?.bond>0).map(n=>n.id));let dialogueCount=0,eventIndex=0;
        const spoken=trigger=>{if(!trigger||used.has(trigger)||dialogueCount>=maxDialogue||eventIndex-(lastTrigger[trigger]??-999)<cooldown)return null;const choices=dialogue[trigger]||[];if(!choices.length)return null;used.add(trigger);lastTrigger[trigger]=eventIndex;dialogueCount++;return choices[Math.floor(stableUnit(`${trip?.id||"battle"}:${trigger}`)*choices.length)];};
        const push=(importance,text,source={},trigger=null,extra={})=>{const style=styles[importance]||{};output.push({schema:1,kind:"battle",importance:PRESENTATION_LEVELS.includes(importance)?importance:"NORMAL",priority:Number(style.priority)||10,holdMs:Math.max(0,Number(style.holdMs)||450),color:style.color||"#ffffff",text,dialogue:spoken(trigger),trigger,sourceType:source.type||null,actorKey:source.actorKey||null,targetKey:source.targetKey||source.key||null,actorName:source.actorName||null,attackName:source.attackName||null,targetName:source.targetName||source.name||null,targetHealth:source.targetHealth,targetMaxHealth:source.targetMaxHealth,targetArmor:source.targetArmor,targetWard:source.targetWard,attackKind:source.kind||null,survived:typeof source.survived==="boolean"?source.survived:null,permanentDeath:typeof source.permanentDeath==="boolean"?source.permanentDeath:null,...extra});eventIndex++;};
        const boss=!!trip?.boss;push(boss?"BOSS":"INTERESTING",boss?"A boss encounter begins.":"The parties close for battle.",{},boss?"BOSS_START":"BATTLE_START");
        for(const event of events||[]){
            if(!event||typeof event!=="object")continue;
            if(event.type==="wave"){push("DANGEROUS",event.text,event,null,{fighters:event.fighters});}
            else if(event.type==="heal"){push("INTERESTING",`+ ${event.actorName} uses ${event.attackName||"Kind Word"}: ${event.targetName} heals ${event.healing||1} HP. ${event.effectText||""}`,event,null,{healing:event.healing||1});}
            else if(event.type==="support")push("SIGNATURE",`${event.actorName} uses ${event.attackName} on ${event.targetName}: ${event.effectText}`,event);
            else if(event.type==="attack"){
                const playerTarget=event.targetSide==="player",targetId=String(event.targetKey||"").replace(/^player:/,""),low=playerTarget&&event.targetHealth>0&&(event.targetHealth===1||event.targetHealth/Math.max(1,event.targetMaxHealth)<=.25),wardBreak=event.wardLoss>0&&event.targetWard===0,death=playerTarget&&event.targetHealth===0;
                let importance="NORMAL",trigger=null;
                if(death){importance="CRITICAL";trigger="ALLY_WOUNDED";}else if(low&&bonded.has(targetId)){importance="CRITICAL";trigger="BOND_ALLY_DANGER";}else if(low){importance="CRITICAL";trigger="LOW_HP";}else if(event.mortal||(boss&&event.side==="enemy")){importance="BOSS";}else if(event.kind==="signature"){importance="SIGNATURE";trigger="SIGNATURE";}else if(wardBreak){importance="DANGEROUS";trigger="WARD_BREAKS";}else if(event.armorLoss>0){importance="INTERESTING";trigger="ARMOR_ABSORBS";}else if(event.missed){importance="INTERESTING";trigger="DODGE";}else if(playerTarget)trigger="ALLY_TARGETED";
                const losses=[event.wardLoss?`${event.wardLoss} Ward absorbed`:null,event.armorLoss?`${event.armorLoss} Armor absorbed`:null,event.damage?`${event.damage} HP damage`:null].filter(Boolean);
                const outcome=event.missed?"dodged / missed":event.ritualBlocked?"absorbed by the altar's protection":losses.join(", ")||"has no effect";
                push(importance,`${event.actorName} targets ${event.targetName} with ${event.attackName}${event.criticalHit?" (CRITICAL x2)":""}: ${outcome}.${event.effectText?` ${event.effectText}`:""}`,event,trigger,{effectText:event.effectText||null,action:event.attackName,criticalHit:!!event.criticalHit,missed:!!event.missed,wardLoss:event.wardLoss||0,armorLoss:event.armorLoss||0,damage:event.damage||0});
            }else if(event.type==="deathSave"&&!event.survived)push("DEATH",`${event.name}: FATE COIN — PERMANENT DEATH.`,event,bonded.has(String(event.key||"").replace(/^player:/,""))?"BOND_ALLY_DEATH":"ALLY_DEATH");
            else if(event.type==="defeat")push("DANGEROUS",`${event.name} falls.`,event,event.side==="player"?"ALLY_WOUNDED":null,{targetHealth:0});
            else if(event.type==="deathSave"&&event.survived)push("CRITICAL",`${event.name}: FATE COIN — WOUNDED. Survives, incapacitated; lasting injury.`,event);
            else if(event.type==="result")push(boss?"BOSS":"DANGEROUS",`Encounter ${event.outcome}.`,event,event.outcome==="victory"?"VICTORY":null);
            else if(event.type==="round")push("NORMAL",`Round ${event.round}.`,event);
            else if(event.type==="skip")push("INTERESTING",`${event.name} cannot act: ${event.reason}.`,event);
            else if(event.type==="mortalIntent")push("BOSS",`${event.actorName} prepares a mortal attack against ${event.targetName}.`,event);
            else push("INTERESTING",event.text||`${event.actorName||event.name||"Battle"}: ${event.type}.`,event);
        }
        const living=(snapshot?.fighters||[]).filter(f=>f.side==="player"&&f.alive&&f.health>0),players=(snapshot?.fighters||[]).filter(f=>f.side==="player");if(living.length===1&&players.length>1)push("CRITICAL",`${living[0].name} is the sole survivor.`,{},"SOLE_SURVIVOR");
        let lastFlavor=-99;
        output.forEach((item,index)=>{
            let context=null,npc=null;
            if(index===0)context="battleStart";
            else if(item.sourceType==="result")context="battleEnd";
            else if(item.sourceType==="attack"){
                const id=String(item.missed?item.targetKey:item.actorKey||"").replace(/^player:/,"");
                npc=(trip?.preparedTeam||[]).find(n=>n.id===id);
                if(npc)context=item.missed?"nearMiss":item.importance==="SIGNATURE"?"ability":"attack";
                else if(String(item.targetKey).startsWith("player:")){npc=(trip.preparedTeam||[]).find(n=>n.id===String(item.targetKey).slice(7));context=item.damage?"hit":null;}
            }
            if(context&&(index===0||index-lastFlavor>=4)){const flavor=expeditionLine(trip,context,npc);if(flavor){Object.assign(item,flavor);lastFlavor=index;}}
        });
        for(const item of output)item.holdMs=Math.max(item.holdMs,item.sourceType==="round"?450:Math.min(4500,1200+item.text.length*18));
        return output;
    }
    function presentationDelay(item,speed,config={}){
        const multiplier=config?.speedMultipliers?.[speed],base=Math.max(0,Math.round((Number(item?.holdMs)||0)*(Number.isFinite(multiplier)?multiplier:speed==="skip"?0:speed==="reduced"?.45:1)));
        // Defeat timing changes only projection, never saved combat consequences.
        if(item?.sourceType==="defeat"&&String(item.targetKey||"").startsWith("enemy:")){
            const ordinary=Number(config?.enemyDefeatMs)||650,boss=Number(config?.bossDefeatMs)||1400;
            return Math.round((item.bossEncounter?boss:ordinary)*(speed==="skip"?0:speed==="reduced"?.45:1));
        }
        const critical=["deathSave","defeat","result","completion","returnBeat"].includes(item?.sourceType)||["DEATH","CRITICAL"].includes(item?.importance);
        return critical?Math.max(base,Math.min(6500,2200+String(item.text||"").length*24)):base;
    }
    function applyAutomaticTravelEvent(state,trip,content){
        const pool=content?.automaticEvents||[];if(!pool.length)return;
        queueEventCue(state,trip,"randomEvent","automatic-travel");
        const event=pool[Math.floor(stableUnit(`${trip.id}:${trip.questId}:automatic-event`)*pool.length)];
        const gains=event.gainChance===undefined||stableUnit(`${trip.id}:${event.id}:gain`)<event.gainChance;
        let extra="";
        if(gains&&event.gold){trip.pendingRewards.gold+=trip.durationMinutes===1?Math.min(2,event.gold):event.gold;extra=` +${trip.durationMinutes===1?Math.min(2,event.gold):event.gold} Gold.`;}
        if(gains&&event.arcana&&trip.durationMinutes!==1){trip.pendingRewards.arcana+=event.arcana;extra=` +${event.arcana} Arcana.`;}
        if(gains&&event.supply&&trip.durationMinutes!==1){normalizeInventory(state);state.supplies[event.supply]=(state.supplies[event.supply]||0)+1;extra=` +1 ${SHOP[event.supply]?.name||event.supply}.`;(trip.acquiredItems||=[]).push(SHOP[event.supply]?.name||event.supply);}
        if(event.minorEncounterRisk&&trip.combatMode==="optional"&&trip.minorEncounterEnemyIds?.length&&stableUnit(`${trip.id}:${event.id}:risk`)<.25)trip.triggerMinorEncounter=true;
        const warning=trip.triggerMinorEncounter?" The warning proves real.":"";const text=`${event.name}: ${event.text}${extra}${warning}`;trip.chronicle.push({type:"automaticTravel",eventId:event.id,text});const style=content?.presentation?.importance?.TRAVEL||{};trip.presentationQueue=trip.presentationQueue||[];trip.presentationQueue.push({schema:1,kind:"travel",importance:"TRAVEL",priority:style.priority||20,sourceType:"fieldnote",holdMs:10000,color:style.color||"#9fe3a4",text,trigger:event.id,...expeditionLine(trip,gains&&event.supply?"supplies":"clue")});addTimeline(trip,text);
    }
    function applyCompletionBonus(state,trip){
        trip.bonusRewardsResolved=true;trip.awardedBonus=[];normalizeInventory(state);const bonus=trip.bonusRewards||{};
        const awardSupply=(id,chance)=>{if(chance>0&&stableUnit(`${trip.id}:${id}:completion`)<chance){state.supplies[id]=(state.supplies[id]||0)+1;trip.awardedBonus.push(SHOP[id].name);}};
        awardSupply("potion",bonus.potionChance);
        const common=["padded_vest","leather_cap","buckler","thick_fur_cloak","life_giving_amulet"],rare=["chainmail","great_helm","iron_shield","reinforced_cloak","ward_focus"];
        const awardGear=(pool,chance,tier)=>{if(chance>0&&stableUnit(`${trip.id}:${tier}:completion`)<chance){const id=pool[Math.floor(stableUnit(`${trip.id}:${tier}:pick`)*pool.length)];state.equipmentStock[id]=(state.equipmentStock[id]||0)+1;trip.awardedBonus.push(SHOP[id].name);if(tier==="rare"){trip.legendaryItems=trip.legendaryItems||[];trip.legendaryItems.push(id);}}};
        awardGear(common,bonus.commonEquipmentChance,"common");awardGear(rare,bonus.rareEquipmentChance,"rare");
    }
    function autoOpportunity(state,trip,content){const stage=(trip.stages||[]).find(s=>s.randomEncounter&&s.type==="event"),event=(content?.events||[]).find(e=>e.id===stage?.eventId);if(!event)return;queueEventCue(state,trip,"randomEvent",`opportunity:${event.id}`);const outcome=Object.values(event.outcomes||{}).find(value=>value&&(value.gold||value.arcana))||event.outcomes?.default||{};trip.pendingRewards.gold+=Math.max(0,Math.floor(Number(outcome.gold)||0));trip.pendingRewards.arcana+=Math.max(0,Math.floor(Number(outcome.arcana)||0));const text=`${event.name}: ${outcome.text||"The opportunity passes."}`;trip.chronicle.push({type:"decision",text,gold:outcome.gold||0,arcana:outcome.arcana||0});addTimeline(trip,text);}
    function encounterEnemies(stage,content,trip={}){
        const ids=(stage.enemyIds||[]).slice();if(!(trip.balanceVersion>=31)&&ids.length===1&&encounterTier(trip)>1&&/^(goblin|kobold|ratman)/.test(ids[0]))ids.push(ids[0],ids[0]);
        return ids.map(id=>(content?.enemies||[]).find(e=>e.id===id)).filter(Boolean).map((source,index)=>{
            const tier=encounterTier(trip),e=copy(source);e.id=`${source.id}_${index}`;if(!stage.smallSkirmish&&tier>=4)e.health+=tier===5?3:2;if(stage.smallSkirmish){e.health=Math.min(e.health,tier>=3?3:2);e.armor=Math.min(e.armor||0,1);e.damage=1;e.signatureDamage=1;e.boss=false;e.instantDeathSignature=false;}
            if(trip.balanceVersion>=31){
                const rating=dangerRating(trip),patrol=!!stage.smallSkirmish;
                if(trip.balanceVersion>=32&&source.combatProfile){
                    const p=source.combatProfile,rank=rating-3;
                    e.level=rating;
                    e.health=Math.max(1,p.hp+rank+(rating>=3?2:0)+(rating>=6?rating-5:0)+(!patrol&&rating>=3?Math.max(0,3-(stage.totalEnemyCount||ids.length))*2:0));
                    e.armor=Math.max(0,p.armor+Math.floor(rank/2));
                    e.innateWard=Math.max(0,p.ward+(p.ward?Math.floor(rank/3):0));
                    e.damage=Math.max(1,p.damage+(rating>=3?1:0)+(rating>=7?1:0));
                    e.signatureDamage=Math.max(e.damage,p.specialDamage+(rating>=3?1:0)+(rating>=7?1:0));
                    e.signatureAttack=p.specialAttack;e.special=p.special;
                    e.speed=Math.max(1,p.speed+Math.floor(rank/2));
                    e.dodgeChance=p.dodge;e.critChance=p.crit;e.instantDeathSignature=false;
                    if(!patrol){const tuning=trip.encounterTuning||{};e.health=Math.max(1,e.health+(tuning.hp||0));e.damage=Math.max(1,e.damage+(tuning.damage||0));e.signatureDamage=Math.max(e.damage,e.signatureDamage+(tuning.damage||0));}
                    if(patrol){e.health=Math.max(1,Math.ceil(e.health*.5));e.armor=Math.floor(e.armor/2);e.innateWard=Math.floor(e.innateWard/2);e.signatureDamage=e.damage;e.boss=false;}
                    if(trip.balanceVersion>=33&&rating>=3){
                        // Even lighter patrols need enough HP to survive an opening hit.
                        const floor=rating>=5?4:3;
                        e.health=Math.max(floor,e.health);
                        if(patrol)e.signatureDamage=e.damage+(rating>=5?1:0);
                        if(stage.reinforcementWave){e.health=Math.max(floor,Math.ceil(e.health*.5));e.armor=Math.floor(e.armor*.5);e.innateWard=Math.floor(e.innateWard*.5);e.boss=false;}
                    }
                    if(rating===1){e.health=1;e.armor=0;e.innateWard=0;e.damage=1;e.signatureDamage=1;e.signatureUseLimit=0;e.special=null;e.dodgeChance=0;e.critChance=0;e.speed=1;}
                    e.innateWardMax=e.innateWard;e.maxHealth=e.health;
                    e.xpReward=Math.max(1,Math.round(rating*(patrol?2:4)+(e.boss?rating*2:0)));return e;
                }
                e.level=rating;e.health=patrol?Math.max(1,Math.ceil(rating/3)):[0,1,2,4,6,8,10,12,16][rating];
                e.armor=patrol?0:Math.floor((rating-1)/2);e.innateWard=patrol?0:/cult|mage|witch|wraith|imp|necrom|sorcer|ghost|wisp/i.test(e.id+e.role)?Math.floor(rating/3):0;
                e.damage=rating>=8?patrol?2:3:rating>=6&&!patrol?2:1;e.signatureDamage=rating>=8&&!patrol?4:rating>=4&&!patrol?2:e.damage;
                if(rating===8&&!patrol){e.health=Math.ceil(36/Math.max(1,stage.totalEnemyCount||ids.length));e.armor=2;}
                e.speed=rating===1?1:Math.max(2,Math.min(10,e.speed||5));e.dodgeChance=rating===1?0:Math.min(.15,(rating-1)*.015);e.instantDeathSignature=false;
                if(rating===1){e.armor=0;e.innateWard=0;e.signatureUseLimit=0;e.special=null;e.boss=false;}
                e.maxHealth=e.health;e.xpReward=Math.max(1,Math.round(rating*(patrol?2:4)+(e.boss?rating*2:0)));return e;
            }
            e.innateWard=Math.max(e.innateWard||0,/cult|mage|witch|wraith|imp|necrom|sorcer|jester/i.test(e.name+" "+e.role)?1:0);
            if((stage.enemyIds||[]).length<5&&e.health+(e.armor||0)+e.innateWard<2)e.health=2-(e.armor||0)-e.innateWard;
            const tuning=trip.encounterTuning||{};e.health=Math.max(1,e.health+(tuning.hp||0));e.maxHealth=e.health;e.damage=Math.max(1,(e.damage||1)+(tuning.damage||0));if(e.signatureDamage)e.signatureDamage+=tuning.damage||0;e.speed=Math.max(1,e.speed+Math.floor(((e.level||1)-1)/2)+(tuning.speed||0));if((stage.enemyIds||[]).length<5)e.health=Math.max(e.health,2-(e.armor||0)-(e.innateWard||0));e.maxHealth=e.health;return e;
        });
    }
    function simulateStageBattle(state,trip,stage,content,BattleClass){
        if(trip.recordedBattleStages?.[String(trip.stageIndex)])return {ok:true,duplicate:true};
        if(trip.autoRetreat||trip.wiped)return{ok:true,retreated:true};
        if(trip.realtime&&!canStartBattle(trip))return{ok:false,unsafe:true};
        if(trip.battleSnapshot){const assessment=retreatAssessment(trip,stage,content);if(assessment.retreat){beginAutomaticRetreat(trip,assessment);return{ok:true,retreated:true};}}

        const enemies=encounterEnemies(stage,content,trip);
        const team=trip.preparedTeam.filter(n=>n.alive!==false&&n.health>0);
        for(const n of team){n.classArmor=Math.min(n.classArmorMax,(n.classArmor||0)+(n.armorRecovery||0));n.armor=n.classArmor+equipmentArmor(n)+(n.ritualArmor||0);n.innateWard=Math.min(n.innateWardMax||0,(n.innateWard||0)+2);n.ward=n.innateWard+(n.temporaryWard||0);}
        trip.ritualFirstBattleStarted=true;
        if(!team.length||!enemies.length)throw new Error("Encounter roster unavailable.");
        const battle=new BattleClass(copy(team),copy(enemies),{
            seed:Number(String(trip.id).replace(/\D/g,""))*7919+trip.stageIndex*313,maxActions:180,signatureUses:{},ritualEffects:copy(trip.ritualEffects||{})
        });
        battle._waves=(stage.waves||[]).slice(1).map((enemyIds,index)=>encounterEnemies({...stage,enemyIds,reinforcementWave:stage.reinforcementWaveIndex===index+1},content,trip));
        queueEventCue(state,trip,"battleStart",`battle:${trip.stageIndex}:start`);
        const initialFighters=copy(battle.snapshot().fighters);
        while(battle.snapshot().status==="running")battle.step();
        const snapshot=battle.snapshot();trip.phase="battle";
        const enemyXp=battle.events.filter(e=>e.type==="defeat"&&e.side==="enemy").reduce((sum,e)=>sum+Math.max(1,e.xpReward||3),0);
        trip.enemyXpEarned=(trip.enemyXpEarned||0)+enemyXp;
        if(enemyXp){for(const member of team){const live=state.roster.find(n=>n.id===member.id);if(live&&!live.reanimated)live.xp+=Math.floor(enemyXp/team.length)+(team.indexOf(member)<enemyXp%team.length?1:0);}trip.chronicle.push({type:"enemyXp",text:`Enemies defeated: +${enemyXp} XP shared among participating adventurers. Kept on recall.`});}

        // A victory is queued only after successful authoritative result recording below.
        // Failed/drawn encounters do not use a celebratory cue.
        // Record the authoritative result before attempting any presentation work.
        const gearLossCount=(trip.gearLosses||[]).length;
        trip.travelDisplayTeam=copy(team);
        const result=recordBattleResult(state,"A",trip.id,snapshot,Date.now(),battle.events);
        if(result.ok&&snapshot.status==="victory")queueEventCue(state,trip,"battleVictory",`battle:${trip.stageIndex}:victory`);
        if(stage.jester&&snapshot.status==="victory"&&!trip.jesterRewarded){trip.jesterRewarded=true;trip.pendingRewards.gold+=250;trip.pendingRewards.arcana+=180;for(const n of team){const live=state.roster.find(x=>x.id===n.id);if(live&&!live.reanimated)live.xp+=Math.floor(100/team.length)+(team.indexOf(n)<100%team.length?1:0);}trip.chronicle.push({type:"reward",text:"Masked Jester defeated: +250 Gold, +180 Arcana, 100 shared XP. Kept on recall."});}
        if(state.trips.A){
            trip=state.trips.A;let presentation;const bossEncounter=!!trip.boss&&!stage.randomEncounter,presentationTrip={...trip,boss:bossEncounter};
            try{
                presentation=buildBattlePresentation(battle.events,snapshot,presentationTrip,content?.presentation);
                presentation[0].fighters=initialFighters.map(f=>({...f,ward:(f.innateWard||0)+(f.temporaryWard||0)}));
                if(bossEncounter)presentation[0].text=`${trip.questName}: ${enemies.map(e=>e.name).join(", ")}`;
            }catch(error){
                trip.presentationError=String(error.message||error);
                // Retry with the built-in readable defaults, retaining the complete log.
                presentation=buildBattlePresentation(copy(battle.events),copy(snapshot),presentationTrip,{});
                presentation[0].fighters=copy(initialFighters).map(f=>({...f,ward:(f.innateWard||0)+(f.temporaryWard||0)}));
            }
            for(const loss of (trip.gearLosses||[]).slice(gearLossCount))presentation.push({kind:"battle",importance:"DANGEROUS",sourceType:"gearBroken",text:loss.text,holdMs:4000});
            for(const event of presentation)event.bossEncounter=bossEncounter;
            trip.lastBattleMeasuredMs=presentation.reduce((sum,e)=>sum+presentationDelay(e,"standard",content?.presentation),0);
            trip.maxBattleMeasuredMs=Math.max(trip.maxBattleMeasuredMs||0,trip.lastBattleMeasuredMs);
            trip.playbackScale=Math.min(1,55000/Math.max(1,trip.lastBattleMeasuredMs));
            trip.battlePresentationDeadlineMs=trip.elapsedMs+SESSION_TIMING.battleMs;
            trip.presentationCurrent=null;trip.presentationHoldMs=0;trip.presentationQueue=presentation;
            tickPresentation(trip,0,"standard",content?.presentation);
            if(trip.realtime&&!trip.wiped&&!trip.autoRetreat)trip.phase="travel";
            addTimeline(trip,`${stage.label||"Battle"} resolved: ${snapshot.status}.`);
        }
        return result;
    }
    function tickPresentation(trip,delta,speed,config){
        if(!trip)return;
        if(trip.approachActive&&trip.presentationCurrent?.sourceType==="approach")return;
        if(!Array.isArray(trip.presentationQueue))trip.presentationQueue=[];
        if(trip.presentationFighters&&!Array.isArray(trip.presentationFighters)){trip.presentationError="Recovered malformed presentation actors.";trip.presentationFighters=[];}
        if(trip.presentationCurrent&&typeof trip.presentationCurrent!=="object"&&typeof trip.presentationCurrent!=="string")trip.presentationCurrent=null;
        trip.presentationAccumulator=(trip.presentationAccumulator||0)+delta;
        trip.presentationHoldMs=speed==="skip"&&presentationDelay(trip.presentationCurrent,"skip",config)===0?0:Math.max(0,(trip.presentationHoldMs||0)-delta);
        while((!trip.presentationCurrent||trip.presentationHoldMs<=0)&&trip.presentationQueue?.length){
            finishPresentationEvent(trip,trip.presentationCurrent);
            const next=trip.presentationQueue.shift();
            if(!next||(typeof next!=="string"&&(typeof next!=="object"||Array.isArray(next))))continue;
            trip.presentationCurrent=typeof next==="string"?{schema:0,kind:"battle",importance:"NORMAL",color:"#ffffff",text:next,holdMs:450}:next;
            // Show the outcome caption over moving travel instead of holding a victory frame.
            // This preserves every event and its readable caption without pausing the road.
            if(trip.phase!=="complete"&&(trip.presentationCurrent.sourceType==="result"||trip.presentationCurrent.trigger==="SOLE_SURVIVOR"))trip.presentationCurrent.kind="travel";
            if(Array.isArray(trip.presentationCurrent.fighters))trip.presentationFighters=copy(trip.presentationCurrent.fighters.filter(f=>f&&typeof f.key==="string"&&typeof f.name==="string"));
            trip.presentationDurationMs=Math.max(0,Math.round(presentationDelay(trip.presentationCurrent,speed,config)*(trip.presentationCurrent.kind==="battle"?(trip.playbackScale||1):1)));
            trip.presentationHoldMs=trip.presentationDurationMs;
            addTimeline(trip,trip.presentationCurrent.text);
            if(trip.presentationCurrent.dialogue)addTimeline(trip,`${trip.presentationCurrent.targetName||trip.presentationCurrent.actorName||"Party"}: \u201c${trip.presentationCurrent.dialogue}\u201d`);
            if(trip.presentationHoldMs>0)break;
        }
        if(trip.presentationHoldMs<=0&&!trip.presentationQueue?.length){
            finishPresentationEvent(trip,trip.presentationCurrent);
            trip.presentationCurrent=null; trip.presentationDurationMs=0;
        }
    }
    // Simulation is synchronous. Playback is bounded independently of render rate or window focus.
    const SESSION_TIMING=Object.freeze({battleMs:60000,extractionMs:12000,campfireMs:60000});
    function dangerRating(q={}){const value=Number(q.skulls??q.intendedLevel??({Easy:1,Normal:4,Hard:8}[authoredDifficulty(q)]));return Math.max(1,Math.min(8,Number.isFinite(value)?Math.floor(value):1));}
    function dangerLabel(q={}){const n=dangerRating(q);return `${"☠".repeat(n)} ${n}/8`;}
    // Encounter pacing is authored independently from the displayed party-level estimate.
    function encounterTier(q={}){return Math.max(1,Math.min(5,Number(q.encounterTier)||Math.ceil((dangerRating(q)+1)/2)));}
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
        if(trip.balanceVersion>=31){
            const minutes=trip.durationMinutes,rating=dangerRating(trip),count=Math.max(1,Math.min(5,Math.ceil(minutes/8)+(rating>=5?1:0))),plan=[];
            const end=trip.totalDurationMs-SESSION_TIMING.battleMs-SESSION_TIMING.extractionMs-5000;
            for(let i=0;i<count;i++){
                let at=count===1?end:20000+(end-20000)*i/(count-1),camp=trip.totalDurationMs*.5;
                if(minutes>=15&&at<camp+60000&&at+SESSION_TIMING.battleMs>camp)at=camp+60000;
                if(at>end||plan.some(p=>Math.abs(p.atMs-at)<SESSION_TIMING.battleMs+12000))continue;
                const objective=i===count-1,source=stages[i%stages.length]||main,pool=source.patrolEnemyIds?.length?source.patrolEnemyIds:source.enemyIds;
                const stage=objective?copy(main):{...copy(source),id:`paced_${i}`,mainQuest:false,randomEncounter:true,smallSkirmish:true,enemyIds:pool.slice(0,rating>=5?2:1)};
                delete stage.waves;
                if(trip.balanceVersion>=33&&rating>=3&&!objective){
                    const patrolPool=[...new Set([...pool,...main.enemyIds])];
                    const patrolSize=rating<=4?1+i%2:minutes>=20&&i%3===1?2:1;
                    stage.enemyIds=Array.from({length:patrolSize},(_,j)=>patrolPool[(i+j)%patrolPool.length]);
                }
                stage.totalEnemyCount=stage.enemyIds.length;
                if(stage.enemyIds.length>3){stage.waves=[stage.enemyIds.slice(0,3),stage.enemyIds.slice(3)];stage.enemyIds=stage.waves[0];}
                if(trip.balanceVersion>=33&&rating>=4&&!stage.waves){
                    const reinforce=objective?(rating>=5||stableUnit(`${trip.questId}:reinforcements`)<.5):rating>=7&&minutes>=20&&i===Math.floor((count-1)/2);
                    if(reinforce){
                        const reservePool=[...new Set([...main.enemyIds,...pool])];
                        const reserves=Array.from({length:objective&&rating>=7?2:1},(_,j)=>reservePool[(i+j+1)%reservePool.length]);
                        stage.waves=[stage.enemyIds.slice(),reserves];stage.reinforcementWaveIndex=1;
                    }
                }
                plan.push({atMs:Math.round(at),stage});
            }
            if(rating>=6&&(trip.balanceVersion<32||trip.encounterGroup==='demon_cult')&&plan.length>1&&stableUnit(`${trip.id}:masked-jester`)<.01)plan[0].stage={id:"masked_jester",type:"battle",randomEncounter:true,enemyIds:["masked_jester"],jester:true,label:"Masked Jester"};
            return plan;
        }
        const end=trip.totalDurationMs-SESSION_TIMING.battleMs-SESSION_TIMING.extractionMs-5000,plan=[];
        const spacing=trip.durationMinutes>=10?100000-(encounterTier(trip)-1)*7500:trip.durationMinutes>=5?150000-(encounterTier(trip)-1)*15000:120000;
        for(let at=20000;at<end-65000;at+=spacing){
            const camp=trip.totalDurationMs*.5;
            if(trip.durationMinutes>=15&&at<camp+60000&&at+SESSION_TIMING.battleMs>camp)continue;
            const source=stages[plan.length%stages.length]||main;
            const pool=source.patrolEnemyIds?.length?source.patrolEnemyIds:source.enemyIds;
            const ids=source.patrolEnemyIds?.length?Array.from({length:Math.min(pool.length,encounterTier(trip)>=4?2:1)},(_,i)=>pool[(plan.length+i)%pool.length]):pool.slice(0,encounterTier(trip)>=4?2:1);
            // Short road skirmishes preserve density without repeating full bosses.
            plan.push({atMs:at,stage:{...copy(source),id:`paced_${plan.length}`,label:source.patrolEnemyIds?.length?"Local patrol":source.label,mainQuest:false,randomEncounter:true,smallSkirmish:true,enemyIds:ids}});
        }
        const camp=trip.totalDurationMs*.5;
        let at=Math.max(15000,end);if(trip.durationMinutes>=15&&at<camp+60000&&at+SESSION_TIMING.battleMs>camp)at=camp+60000;
        plan.push({atMs:at,stage:copy(main)});
        if(encounterTier(trip)>=3)for(let i=0;i<plan.length;i++)if(i%3===0&&i<plan.length-1){const stage=plan[i].stage,ids=stage.enemyIds.slice(0,2);while(ids.length<2)ids.push(ids[0]);stage.waves=[ids.slice(),ids.slice()];stage.enemyIds=stage.waves[0];}
        if(encounterTier(trip)>=4&&stableUnit(`${trip.id}:masked-jester`)<.01&&plan.length>1)plan[0].stage={id:"masked_jester",type:"battle",randomEncounter:true,enemyIds:["masked_jester"],jester:true,label:"Masked Jester"};
        for(const p of plan)if(p.stage.enemyIds.length>3){p.stage.waves=[p.stage.enemyIds.slice(0,3),p.stage.enemyIds.slice(3)];p.stage.enemyIds=p.stage.waves[0];}
        return plan;
    }
    function finishBattlePlayback(trip,reason){
        if(!trip)return;
        const pending=[trip.presentationCurrent,...(trip.presentationQueue||[])].filter(Boolean),hadBattle=pending.some(e=>e.kind==="battle");
        for(const e of pending)finishPresentationEvent(trip,e);
        trip.presentationQueue=[];trip.presentationCurrent=null;trip.presentationHoldMs=0;trip.presentationDurationMs=0;
        trip.battlePresentationDeadlineMs=0;delete trip.travelDisplayTeam;
        if(trip.battleSnapshot)trip.presentationFighters=copy(trip.battleSnapshot.fighters);
        if(hadBattle&&reason){trip.fastResolutionCount=(trip.fastResolutionCount||0)+1;addTimeline(trip,reason);}
    }
    function tickRealtimeExpedition(state,deltaMs,content,BattleClass,produceJobs=true,playPresentation=true){
        const trip=tripForTeam(state,"A");if(!trip?.realtime)return{ok:false,completed:false};
        const delta=Math.min(MAX_SESSION_TICK_MS,Math.max(0,Number(deltaMs)||0));if(!delta)return{ok:true,completed:false,delta:0};
        if(trip.recalled){trip.elapsedMs=Math.min(trip.totalDurationMs,trip.elapsedMs+delta);trip.remainingMs=Math.max(0,trip.totalDurationMs-trip.elapsedMs);if(trip.remainingMs===0){recallExpedition(state);return{ok:true,completed:true,delta};}return{ok:true,completed:false,delta,phase:"return"};}
        if(produceJobs)accrueCampJobs(state,delta);
        trip.elapsedMs=Math.min(trip.totalDurationMs,(trip.elapsedMs||0)+delta);trip.remainingMs=Math.max(0,trip.totalDurationMs-trip.elapsedMs);
        trip.presentationQueue||=[];trip.milestones||={};
        try{if(playPresentation)tickPresentation(trip,delta,state.presentationSpeed,content?.presentation);}catch(error){trip.presentationError=String(error.message||error);trip.presentationFighters=[];trip.presentationHoldMs=0;}
        if(trip.battlePresentationDeadlineMs&&trip.elapsedMs>=trip.battlePresentationDeadlineMs)finishBattlePlayback(trip,"The battle concludes; the party regroups for travel. Full combat details remain in the chronicle.");
        const campStart=trip.totalDurationMs*.5,campfire=trip.durationMinutes>=15&&!trip.wiped&&!trip.autoRetreat&&trip.elapsedMs>=campStart&&trip.elapsedMs<campStart+60000;
        if(campfire){
            if(!trip.campfireStarted){finishBattlePlayback(trip,"The party makes camp after the battle.");trip.campfireStarted=true;trip.chronicle.push({type:"campfire",text:"One peaceful minute beside the fire; the focus clock keeps running."});}
            trip.phase="campfire";
            const beat=Math.floor((trip.elapsedMs-campStart)/15000);
            if(beat!==trip.campfireBeat){trip.campfireBeat=beat;const member=trip.preparedTeam[beat%trip.preparedTeam.length];trip.presentationCurrent={kind:"travel",sourceType:"campfire",holdMs:15000,text:["The fire crackles softly. Nobody needs to hurry.",`${member.name}: A little warmth makes the road easier.`,"The companions share water and watch the sparks.","One last quiet breath, then back to the trail."][beat]};trip.presentationHoldMs=15000;}
        }else if(trip.phase==="campfire"){trip.phase="travel";trip.campfireCompleted=true;finishBattlePlayback(trip);}
        if(!trip.approachActive&&!trip.milestones.travelEvent&&trip.elapsedMs>=trip.totalDurationMs*.18&&!campfire&&!trip.wiped){trip.milestones.travelEvent=true;applyAutomaticTravelEvent(state,trip,content);}
        trip.encounterPlan||=encounterPlan(trip);
        const upcoming=trip.encounterPlan.find(p=>!p.done);
        if(!campfire&&upcoming?.stage.randomEncounter&&!trip.wiped&&!trip.autoRetreat&&!trip.returnNarrated&&trip.elapsedMs>=upcoming.atMs-10000&&canStartBattle(trip,10000)){
            if(!upcoming.warningStartedAtMs){upcoming.warningStartedAtMs=trip.elapsedMs;upcoming.startAfterMs=Math.max(upcoming.atMs,trip.elapsedMs+10000);}
            if(trip.elapsedMs<upcoming.startAfterMs){
                trip.presentationQueue=[];trip.presentationCurrent={kind:"travel",sourceType:"approach",text:"Something approaches...",holdMs:upcoming.startAfterMs-trip.elapsedMs};
                trip.presentationHoldMs=upcoming.startAfterMs-trip.elapsedMs;trip.presentationDurationMs=10000;trip.approachActive=true;
            }
        }
        if(!campfire&&BattleClass&&canStartBattle(trip)&&upcoming&&trip.elapsedMs>=(upcoming.startAfterMs||upcoming.atMs)){
            if(!upcoming.stage.randomEncounter||upcoming.warningStartedAtMs){upcoming.done=true;trip.approachActive=false;trip.stages.push(upcoming.stage);trip.stageIndex=trip.stages.length-1;simulateStageBattle(state,trip,upcoming.stage,content,BattleClass);trip.milestones.battle=true;}
        }
        const noteStep=Math.floor(trip.elapsedMs/20000);
        if(!trip.approachActive&&!campfire&&!trip.wiped&&!trip.autoRetreat&&!trip.returnNarrated&&noteStep>(trip.lastNarrativeStep||0)&&!trip.battlePresentationDeadlineMs&&trip.presentationQueue.length<2){
            trip.lastNarrativeStep=noteStep;const note=questNarrative(trip,"travel",content?.narratives||narrativeData);if(note)trip.presentationQueue.push({kind:"travel",sourceType:"fieldnote",holdMs:10000,text:note.text+(note.shared?` ${note.shared}`:"")});
        }
        if(trip.remainingMs<=SESSION_TIMING.extractionMs&&!trip.returnNarrated&&!trip.wiped){
            finishBattlePlayback(trip,"Combat resolved before extraction.");trip.milestones.return=true;trip.phase="return";trip.returnNarrated=true;
            const text=trip.autoRetreat?"The survivors follow the road left, toward camp.":"The party turns left, homeward to camp.";
            trip.presentationCurrent={kind:"travel",sourceType:"returnBeat",text,holdMs:3500};trip.presentationHoldMs=3500;addTimeline(trip,text);
        }
        if(trip.wiped)trip.phase="wipe";
        if(trip.remainingMs<=0){
            finishBattlePlayback(trip,"Session complete; combat playback resolved.");trip.phase="return";trip.returnNarrated=true;trip.deadlineMs=0;
            if(!trip.battleSnapshot)trip.battleSnapshot={status:trip.combatMode!=="required"&&!trip.autoRetreat?"victory":"draw",fighters:trip.preparedTeam.map(n=>({...copy(n),side:"player",alive:n.health>0}))};
            const report=completeReturn(state,"A",trip.id,Date.now());state.expeditionReplay=copy(trip);state.expeditionReplay.phase="complete";
            return{ok:true,completed:true,report,delta};
        }
        return{ok:true,completed:false,delta,phase:trip.phase,remainingMs:trip.remainingMs};
    }
    const POWER_TRACKS={"barbarian": ["Heavy melee", "Fury: after damage, next hit +1, once/battle", "Cleave: 50% chance of 1 splash damage, once/battle", "Cleave chance 60%", "Bloodied Resolve: first low-HP hit reduced by 1", "Quake: 1 damage to each enemy; 15% stagger, once/battle", "Wounded Resolve: low-HP protection refreshes once", "Relentless: one 1-damage follow-up after a takedown/battle"], "knight": ["Sturdy melee", "Guard: first hit reduced by 1", "Shield Bash: 20% stagger, once/battle", "Guard also protects second hit", "Interpose: 15% chance to protect vulnerable ally", "Rallying Guard: party next hit -1, once/battle", "Interpose chance 20%", "Last Stand: one party protection at under 30% HP/battle"], "cleric": ["Kind Word: heal 1 or ward 1, once/battle", "Kind Word once/battle", "Blessing: ally next hit -1 and Ward 1, once/battle", "Prefer exposed ally when none wounded", "Renewal: heal 1 and ensure 1 Ward", "Sanctuary: party next hit -1 and Ward 1, once/battle", "Blessing grants 2 Ward; Sanctuary once/battle", "Grace: party guard and Ward when ally at 1 HP, once/battle"], "rogue": ["Fast single-target attack", "Quickstep: +3 percentage points Dodge", "Feint: 20% chance to suppress 1 Armor for 2 target turns", "Quickstep +4pp and Feint chance 25%", "Venom Edge: 15% chance of 1 nonlethal damage on next target turn", "Smoke Bomb: 15% chance per enemy to weaken next attack, once/battle", "Feint chance 30%; Venom 20%", "Opportunist: +1 against debuffed target, once/action"], "ranger": ["Ranged attack", "Steady Aim: +2 percentage points crit chance", "Pinning Shot: next enemy attack -1, once/battle", "Pinning Shot: 20% chance to stagger", "Mark Target: 20% chance, next allied hit +1", "Volley: 1 damage per enemy, once/battle", "Mark chance 25%; Volley prefers live enemies", "Hunters Opening: mark transfers once/battle at 50% reliability"], "mage": ["Fragile ranged magic", "Focus: 10% chance to weaken next enemy attack", "Fireburst and Ward Spark: damage enemies or protect an exposed ally", "Focus chance 15%", "Ward Spark: ward 1 on exposed ally, once/battle", "Frost Ring: 1 damage/enemy, 15% weaken next attack, once/battle", "Frost Ring weaken chance 20%", "Arcane Echo: 15% chance of 1 on different enemy; no chains"]};
    function powerTrack(npc){const labels={hp:"HP",armor:"Armor",ward:"Ward",dodge:"% Dodge",crit:"% Critical",armorRecovery:"Armor restored before battle",damage:"attack damage",speed:"Speed"},c=classFor(npc);return (POWER_TRACKS[npc.classId]||[]).slice(0,Math.min(8,npc.level||1)).map((text,i)=>{const gains=i?c.growth?.[i+1]:c.combat;return `L${i+1} ${text}. ${Object.entries(gains||{}).map(([k,v])=>`${i?"+":""}${v} ${labels[k]||k}`).join(" / ")}`;});}
    function repairGear(state,npcId,itemId){
        const npc=state.roster.find(n=>n.id===npcId),item=SHOP[itemId];
        if(!npc||isUnavailable(state,npcId)||!Object.values(npc.equipmentSlots||{}).includes(itemId)||!npc.equipmentCondition[itemId]?.broken)return{ok:false,message:"Choose broken equipped gear on a companion at camp."};
        const price=Math.max(1,Math.ceil(item.price*.35));if(state.gold<price)return{ok:false,message:`Repair costs ${price} Gold.`};
        ensureLife(npc);const oldWardMax=npc.innateWardMax;state.gold-=price;npc.equipmentCondition[itemId]={current:item.armor||0,max:item.armor||0,hitsRemaining:item.durability,maxHits:item.durability,broken:false};ensureLife(npc);npc.innateWard=Math.min(npc.innateWardMax,npc.innateWard+Math.max(0,npc.innateWardMax-oldWardMax));return{ok:true,message:`Repaired ${item.name} for ${price} Gold; bonuses and durability restored.`};
    }
    function woundLines(npc){return (npc.permanentWounds||[]).map(id=>{const w=WOUND_DEFINITIONS.find(w=>w.id===id);return `${w?.name||id} — ${w?.effect||"Unknown legacy scar; no additional effect."}`;});}
    // Consume elapsed process-session time in bounded simulation steps. The UI supplies
    // performance.now(); dispatch and load reset the anchor, excluding closed time.
    // Jobs are advanced separately; unseen visual playback is never consumed here.
    function advanceMissionClock(state,now,content,BattleClass){
        const trip=tripForTeam(state,"A");if(!trip?.realtime)return{ok:false,completed:false,delta:0};
        now=validNow(now);const previous=trip.lastProgressAtMs;
        trip.lastProgressAtMs=now;
        if(trip.remainingMs===0)return{...tickRealtimeExpedition(state,1,content,BattleClass,false,false),delta:0};
        if(typeof previous!=="number"||!Number.isFinite(previous)||previous<0)return{ok:true,completed:false,delta:0};
        let remaining=Math.min(Math.max(0,now-previous),Math.max(0,trip.remainingMs||0)),advanced=0,result={ok:true,completed:false};
        if(trip.remainingMs===0){result=tickRealtimeExpedition(state,1,content,BattleClass,false,false);return{...result,delta:0};}
        while(remaining>0&&state.trips.A===trip){
            const step=Math.min(MAX_SESSION_TICK_MS,remaining);
            result=tickRealtimeExpedition(state,step,content,BattleClass,false,false);remaining-=step;advanced+=step;
        }
        return{...result,delta:advanced};
    }

    function requestRecall(state){
        const trip=tripForTeam(state,"A");if(!trip?.realtime)return{ok:false,message:"No expedition is active."};
        if(trip.recalled)return recallExpedition(state);
        trip.recalled=true;trip.autoRetreat=true;trip.returnNarrated=true;trip.phase="return";
        trip.encounterPlan=[];trip.presentationQueue=[];trip.presentationCurrent=null;trip.battlePresentationDeadlineMs=0;
        trip.rewardGold={victory:0,draw:0,defeat:0};trip.rewardArcana={victory:0,draw:0,defeat:0};trip.xp={...trip.xp,perMember:0,total:0};trip.bonusRewards={};
        trip.travelDisplayTeam=copy(trip.preparedTeam);
        return{ok:true,message:"The party heads left toward camp. The timer continues; recall again to arrive immediately."};
    }
    function recallExpedition(state){const trip=tripForTeam(state,"A");if(!trip?.realtime)return{ok:false,message:"No real-time expedition is active."};for(const member of trip.preparedTeam||[]){const npc=state.roster.find(n=>n.id===member.id);if(npc&&living(npc)&&!trip.expeditionDeaths?.[member.id]){npc.health=Math.max(1,Math.min(npc.maxHealth,member.health));restoreBetweenBattles(npc);npc.innateWard=npc.innateWardMax;restoreReturnArmor(npc);}}const ritualReward=ritualRewards(trip,Math.max(0,trip.pendingRewards?.gold||0),Math.max(0,trip.pendingRewards?.arcana||0)),keptGold=ritualReward.gold,keptArcana=ritualReward.arcana;returnUnusedRituals(state,trip);state.gold+=keptGold;state.arcana+=keptArcana;state.lastReport={questId:trip.id,questDefinitionId:trip.questId,questName:trip.questName,status:"recalled",recalled:true,enemyXpEarned:trip.enemyXpEarned||0,gearLosses:copy(trip.gearLosses||[]),rewardGold:keptGold,rewardArcana:keptArcana,lines:[`${trip.questName} was recalled.`,`No quest-completion rewards or XP were awarded.`,`Previously acquired loot retained: ${keptGold} Gold, ${keptArcana} Arcana.`]};state.trips.A=null;state.teams.A=[];state.teamIds=[];state.questResults=resultSnapshot(state,state.lastReport,trip.team.map(n=>n.id));state.lastReport.results=copy(state.questResults);normalizeFocusRoster(state);return{ok:true,message:`Expedition recalled. Kept ${keptGold} Gold and ${keptArcana} Arcana already acquired; completion rewards were forfeited.`,keptGold,keptArcana};}

    function skipTimer(state, kind, teamKey = null, now = Date.now()) {
        now = validNow(now);
        if (kind === "outbound" || kind === "return") {
            const trip = tripForTeam(state, teamKey);
            if (!trip || trip.phase !== kind) return { ok: false, message: `No ${kind} timer for Team ${teamKey}.` };
            trip.deadlineMs = now;
        } else if (kind === "recruit") {
            ensureRecruit(state, now); state.recruit.deadlineMs = now;
        } else return { ok: false, message: "Unknown timer." };
        const result = advanceTimers(state, now);
        return { ok: true, message: `DEV timer skip: ${kind} completed through the normal timer path.`, result };
    }

    function itemError(state, id, item) {
        if (state.activeQuest || isUnavailable(state, id)) return "This adventurer is away on a quest.";
        if (!["potion"].includes(item)) return "Unknown supply.";
        const npc = state.roster.find(n => n.id === id);
        if (!living(npc)) return "Supplies cannot revive the dead.";
        if (state.supplies[item] <= 0) return "No supplies of this type remain.";
        if (item === "potion" && npc.health >= npc.maxHealth) return "HP is already full.";
        return "";
    }

    function useItem(state, id, item) {
        const error = itemError(state, id, item);
        if (error) return { ok: false, message: error };
        const npc = state.roster.find(n => n.id === id);
        const before = npc.health;
        state.supplies[item]--;
        npc.health = Math.min(npc.maxHealth, npc.health + SHOP[item].healing);
        return { ok: true, message: `${npc.name}: +${npc.health - before} HP. ${state.supplies[item]} left.` };
    }

    function campaignSummary(state) {
        const history = Array.isArray(state.questHistory) ? state.questHistory : [];
        const stats = state.campaignStats || {};
        return {
            questsCompleted: stats.questsCompleted || 0, victories: stats.victories || 0, failures: stats.failures || 0,
            deaths: stats.deaths || 0, bossesDefeated: stats.bossesDefeated || 0, goldRecovered: stats.goldRecovered || 0,
            arcanaDiscovered: stats.arcanaDiscovered || 0, legendaryItems: stats.legendaryItems || 0,
            currentThreads: copy(state.currentThreads || []),
            notableDeeds: history.map(record => record.highlight).filter(Boolean).slice(-5).reverse()
        };
    }

    function sortRoster(entries, mode = "healthy") {
        const list = entries.slice();
        const name = npc => String(npc.name || "");
        if (mode === "level") return list.sort((a, b) => (b.level || 1) - (a.level || 1) || name(a).localeCompare(name(b)));
        if (mode === "class") return list.sort((a, b) => String(a.role || a.classId || "").localeCompare(String(b.role || b.classId || "")) || name(a).localeCompare(name(b)));
        return list.sort((a, b) => Number(!!a.injury) - Number(!!b.injury) || Number(a.alive === false) - Number(b.alive === false) || name(a).localeCompare(name(b)));
    }

    function debugLevel(state, id, delta) {
        const npc = state.roster.find(member => member.id === id); if (!living(npc)) return { ok: false, message: "Choose a living adventurer." };
        if(npc.reanimated)return{ok:false,message:"Skeleton adventurers cannot level up."};
        const direction = Math.sign(delta); if (direction < 0 && npc.level <= 1) return { ok: false, message: "Level cannot go below 1." };
        if (direction > 0 && npc.level >= LEVEL_CAP) return { ok:false, message:`Level cap is ${LEVEL_CAP}.` };
        npc.level += direction; npc.attack = Math.max(1, npc.attack + direction * 2); npc.defense = Math.max(0, npc.defense + direction);
        npc.health = Math.min(npc.maxHealth, Math.max(1, npc.health)); npc.passiveTrait.rank = Math.max(1, (npc.passiveTrait.rank || 1) + direction); ensureLife(npc);
        return { ok: true, message: `${npc.name} is now level ${npc.level}.` };
    }
    function applyWound(state, id, expeditionId = null) {
        const npc = state.roster.find(member => member.id === id); if (!npc || conditionOf(npc) === CONDITIONS.DEAD) return { ok: false, message: "A dead adventurer cannot become Wounded." };
        npc.condition = CONDITIONS.WOUNDED; npc.alive = true; npc.injury = "Wounded"; npc.injuryExpeditionId = expeditionId;
        npc.health = 1;
        for (const trip of Object.values(state.trips || {})) if (trip?.team?.some(member => member.id === id)) {
            trip.expeditionInjuries[id] = true; const member = trip.preparedTeam.find(entry => entry.id === id);
            if (member && member.condition !== CONDITIONS.DEAD && !trip.expeditionDeaths[id]) Object.assign(member, { condition: CONDITIONS.WOUNDED, alive: false, incapacitated: true, injury: "Wounded", injuryExpeditionId: trip.id, health: 0 });
        }
        return { ok: true, message: `${npc.name} is Wounded.` };
    }
    function setHealthy(state, id) {
        const npc = state.roster.find(member => member.id === id); if (!npc || conditionOf(npc) === CONDITIONS.DEAD) return { ok: false, message: "Dead adventurers cannot be restored." };
        npc.condition = CONDITIONS.HEALTHY; npc.alive = true; npc.injury = null; npc.injuryExpeditionId = null; return { ok: true, message: `${npc.name} is Healthy.` };
    }
    function killAdventurer(state, id, context = {}) {
        const npc = state.roster.find(member => member.id === id); if (!npc) return { ok: false, message: "Unknown adventurer." };
        if (conditionOf(npc) === CONDITIONS.DEAD) return { ok: true, duplicate: true, message: `${npc.name} is already dead.` };
        const reason = typeof context === "string" ? context : context.reason || context.questName || "Unknown cause";
        const trip=[...Object.values(state.trips||{}),state.activeQuest].find(t=>t&&t.id===context.questId&&t.team?.some(n=>n.id===id));
        if(trip?.ritualEffects?.veil_of_mercy){
            delete trip.ritualEffects.veil_of_mercy;npc.health=1;seriousWound(npc);(trip.expeditionInjuries||={})[id]=true;
            const member=trip.preparedTeam?.find(n=>n.id===id);
            if(member)Object.assign(member,{health:1,alive:true,condition:CONDITIONS.WOUNDED,injury:npc.injury,incapacitated:false,permanentWounds:copy(npc.permanentWounds),lastingInjuries:npc.lastingInjuries,dodgeChance:npc.dodgeChance,speed:member.speed*.97});
            (trip.chronicle||=[]).push({type:"ritual",text:`Veil of Mercy: ${npc.name} survives at 1 HP with a serious wound.`});return{ok:true,prevented:true,message:`Veil of Mercy saves ${npc.name}.`};
        }
        if(npc.reanimated)npc.reanimationExhausted=true;
        npc.condition = CONDITIONS.DEAD; npc.alive = false; npc.health = 0; npc.injury = null; npc.injuryExpeditionId = null;
        npc.deathQuest ||= context.questId || reason; npc.deathCircumstance ||= { questId: context.questId || null, questName: context.questName || reason, killedBy: context.killedBy || null };
        ensureLife(npc);npc.history.events.push({type:"death",reason,questId:context.questId||null,killedBy:context.killedBy||null});
        for(const partner of bondPartners(state,id)){ensureLife(partner);partner.history.bondedDeaths.push({id:npc.id,name:displayName(npc),reason});partner.history.events.push({type:"bondedCompanionDied",id:npc.id});evaluateEarnedTraits(partner);}
        for (const slot of ["equipment", "equipment2"]) if (npc[slot]) { state.equipmentStock[npc[slot]] = (state.equipmentStock[npc[slot]] || 0) + 1; npc[slot] = null; }
        returnSlottedEquipment(state,npc);
        for (const team of ["A", "B"]) state.teams[team] = (state.teams[team] || []).filter(memberId => memberId !== id);
        state.teamIds = (state.teamIds || []).filter(memberId => memberId !== id);
        npc.retired=true;npc.retiredReason="dead";
        if(Array.isArray(state.activeSlots))state.activeSlots=state.activeSlots.map(member=>member===id?null:member);
        for (const trip of Object.values(state.trips || {})) if (trip?.team?.some(member => member.id === id)) {
            trip.expeditionDeaths[id] = true; const member = trip.preparedTeam.find(entry => entry.id === id); if (member) Object.assign(member, { condition: CONDITIONS.DEAD, alive: false, health: 0, injury: null });
            if (trip.leaderId === id) assignReplacementLeader(trip, id);
        }
        return { ok: true, message: `${npc.name} died permanently.` };
    }
    const applyDeath = (state, id, reason = "Developer action") => killAdventurer(state, id, { reason, questName: reason });
    function debugFastTravel(state, teamKey, now = Date.now(), content = null, BattleClass = null) {
        const trip = tripForTeam(state, teamKey); if (!trip) return { ok: false, message: `Team ${teamKey} has no active expedition.` };
        if(trip.realtime){content ||= globalThis.$dataRPGManagerQuests;BattleClass ||= globalThis.RPGManagerBattle?.Battle;if(!content)return{ok:false,message:"Expedition content is required for simulation."};return debugAdvanceExpedition(state,content,BattleClass);}
        if (trip.phase === "outbound" || trip.phase === "return") return skipTimer(state, trip.phase, teamKey, now);
        return { ok: false, message: `Team ${teamKey} is at a required ${trip.phase} step; resolve it before advancing.` };
    }
    function debugDamageEquipment(state,id){
        const npc=state.roster.find(n=>n.id===id);if(!npc||!living(npc)||isUnavailable(state,id))return{ok:false,message:"Choose a living adventurer at camp."};
        ensureLife(npc);let count=0;
        for(const slot of EQUIPMENT_SLOTS){const itemId=npc.equipmentSlots[slot],max=SHOP[itemId]?.armor||0;if(!max)continue;npc.equipmentCondition[itemId]={current:0,max};count++;}
        return{ok:count>0,message:count?`${count} equipped armor items damaged; defenses depleted.`:"No equipped armor to damage."};
    }
    function debugRefreshRecruits(state, now = Date.now()) { ensureRecruit(state, now); state.recruit.deadlineMs = now; advanceTimers(state, now); return { ok: true, message: "Tavern recruits refreshed." }; }

    const WOUND_DEFINITIONS = Object.freeze([
        {id:"missing_eye",name:"Missing Eye",effect:"Permanent until healed at the Altar. Shared injury stacks: -2 percentage points Dodge and initiative x0.97 per survived knockout. Titles add no extra stacks. Each ritual removes one wound/stack; the final wound clears remaining injury penalties."},{id:"bad_knee",name:"Bad Knee",effect:"Permanent until healed at the Altar. Shared injury stacks: -2 percentage points Dodge and initiative x0.97 per survived knockout. Titles add no extra stacks. Each ritual removes one wound/stack; the final wound clears remaining injury penalties."},
        {id:"mangled_hand",name:"Mangled Hand",effect:"Permanent until healed at the Altar. Shared injury stacks: -2 percentage points Dodge and initiative x0.97 per survived knockout. Titles add no extra stacks. Each ritual removes one wound/stack; the final wound clears remaining injury penalties."},{id:"scarred",name:"Scarred",effect:"Permanent until healed at the Altar. Shared injury stacks: -2 percentage points Dodge and initiative x0.97 per survived knockout. Titles add no extra stacks. Each ritual removes one wound/stack; the final wound clears remaining injury penalties."},
        {id:"nerve_damage",name:"Nerve Damage",effect:"Permanent until healed at the Altar. Shared injury stacks: -2 percentage points Dodge and initiative x0.97 per survived knockout. Titles add no extra stacks. Each ritual removes one wound/stack; the final wound clears remaining injury penalties."},{id:"healed_ribs",name:"Badly Healed Ribs",effect:"Permanent until healed at the Altar. Shared injury stacks: -2 percentage points Dodge and initiative x0.97 per survived knockout. Titles add no extra stacks. Each ritual removes one wound/stack; the final wound clears remaining injury penalties."}
    ]);
    const EARNED_TRAITS = [];
    const RITUALS = Object.freeze({
        protection_ward:{name:"Warding",castCost:80,level:4,questId:"ritual_warding",questName:"The Unbroken Seal",description:"One shared party Ward absorbs one entire hit, then disappears. An unused Ward remains until hit."},
        healing_ritual:{name:"Healing",castCost:120,level:5,target:"living",questId:"ritual_healing",questName:"The Saint's Broken Hands",description:"Remove one permanent wound and its injury stack from a chosen adventurer. Does not restore HP."},
        greed_prayer:{name:"Greed Prayer",castCost:100,level:4,questId:"ritual_greed",questName:"The Gilded Tithe",description:"Pay 100 Arcana to receive 100 coins immediately."},
        reanimate:{name:"Reanimate",castCost:450,level:8,target:"fallen",questId:"ritual_reanimate",questName:"Names Beneath the Ossuary",description:"Return a fallen companion as their skeleton appearance, with their living health, armor and ward. Heals normally; cannot level. Death permanently bars further reanimation."},
        fortunes_favor:{name:"Fortune's Favor",castCost:40,level:2,questId:"ritual_fortune",questName:"The Beggar's Silver Bell",description:"Next quest: +25% coin reward, rounded down. No Ward requirement or penalty."},
        battle_hymn:{name:"Battle Hymn",castCost:60,level:3,questId:"ritual_hymn",questName:"The Choir of Rust",description:"Party attacks deal +1 damage throughout the next battle. Remains pending until a battle occurs."},
        veil_of_mercy:{name:"Veil of Mercy",castCost:260,level:7,questId:"ritual_mercy",questName:"The Thread Before the Axe",description:"Once next quest, the first adventurer who would die instead survives at 1 HP with a serious permanent wound."},
        last_rites:{name:"Last Rites",castCost:650,level:8,target:"fallen",questId:"ritual_last_rites",questName:"The Ferryman's Last Passenger",description:"Return one fallen adventurer to camp at 1 HP with an injury. Preserves their living or skeleton identity."},
        arcane_rebate:{name:"Arcane Rebate",castCost:25,level:2,questId:"ritual_rebate",questName:"The Empty Treasury",description:"After the next expedition with a battle victory: +50 Arcana and no coins, including gathered coins. Carries through combatless trips."},
        oath_of_vanguard:{name:"Oath of the Vanguard",castCost:60,level:3,target:"living",questId:"ritual_vanguard",questName:"The Shieldmaker's Promise",description:"One chosen adventurer gains +1 Armor for the next quest. No targeting or party-protection effect."},
        familiars_vigil:{name:"Familiar's Vigil",castCost:110,level:5,questId:"ritual_familiar",questName:"The Lantern Without a Keeper",description:"Next quest, a summoned spirit absorbs the first hit aimed at any party member, then disappears."},
        first_strike:{name:"First Strike",castCost:60,level:3,questId:"ritual_first_strike",questName:"The Dawn Duel",description:"The party's first attack in its next quest deals +2 damage. A missed attack still uses the blessing."},
        quickening_prayer:{name:"Quickening Prayer",castCost:180,level:6,questId:"ritual_quickening",questName:"The Twice-Struck Chime",description:"Next quest: each adventurer has a seeded 25% chance per battle to use their special twice. Never more than two uses; no extra ability unlocks."},
        arcane_offering:{name:"Arcane Offering",castCost:30,level:2,questId:"ritual_offering",questName:"Embers for the Altar",description:"After the next quest, receive 12 bonus Arcana per actual battle victory. No bonus for waves or combatless trips."}
    });
    function ritualUnlock(state,id){const r=RITUALS[id];return{ok:false,message:r?`Beat ${r.questName} (Level ${r.level}) to unlock ${r.name}. Unlocks cannot be purchased.`:"Unknown ritual."};}
    function grantRitualUnlocks(state,quest,won){
        if(!won||quest.abandoned||quest.autoRetreat||quest.recalled||quest.endKind==="early")return [];
        state.ritualsUnlocked||={};const gained=[];
        for(const [id,r] of Object.entries(RITUALS))if(r.questId===quest.questId&&!state.ritualsUnlocked[id]){state.ritualsUnlocked[id]=true;gained.push(r.name);}
        return gained;
    }
    function activateRituals(state,trip){
        trip.ritualEffects=copy(state.ritualEffects||{});state.ritualEffects={};trip.ritualBattlesWon=0;
        const team=trip.preparedTeam||[];
        if(trip.ritualEffects.oath_of_vanguard&&!team.some(n=>n.id===trip.ritualEffects.oath_of_vanguard)){
            state.ritualEffects.oath_of_vanguard=trip.ritualEffects.oath_of_vanguard;delete trip.ritualEffects.oath_of_vanguard;
        }
        const target=team.find(n=>n.id===trip.ritualEffects.oath_of_vanguard);if(target){target.ritualArmor=1;target.armor++;}
    }
    function ritualRewards(trip,gold,arcana){
        const effects=trip.ritualEffects||{};
        if(effects.fortunes_favor)gold=Math.floor(gold*1.25);
        if(effects.arcane_rebate&&(trip.ritualBattlesWon||0)>0){gold=0;arcana+=50;}
        if(effects.arcane_offering)arcana+=12*(trip.ritualBattlesWon||0);
        return{gold,arcana};
    }
    function returnUnusedRituals(state,trip){
        state.ritualEffects||={};for(const id of ["protection_ward","battle_hymn"])if(trip.ritualEffects?.[id])state.ritualEffects[id]=true;
        if(trip.ritualEffects?.arcane_rebate&&!(trip.ritualBattlesWon>0))state.ritualEffects.arcane_rebate=true;
    }
    function seriousWound(npc){
        ensureLife(npc);npc.lastingInjuries++;const wound=WOUND_DEFINITIONS.find(w=>!npc.permanentWounds.includes(w.id));if(wound)addPermanentWound(npc,wound.id);
        npc.injury="Serious wound";npc.condition=CONDITIONS.WOUNDED;ensureLife(npc);
    }
    function returnEquipmentSlot(state,npc,slot){
        const id=npc.equipmentSlots[slot];if(!id)return;
        if(npc.equipmentCondition[id]?.broken||npc.equipmentCondition[id]?.hitsRemaining===0){npc.equipmentSlots[slot]=null;delete npc.equipmentCondition[id];return;}
        state.equipmentStock[id]=(state.equipmentStock[id]||0)+1;
        const max=SHOP[id]?.armor||0,current=Math.max(0,Math.min(max,npc.equipmentCondition[id]?.current??max));
        (state.equipmentConditionStock[id]||=[]).push(current);(state.equipmentBrokenStock[id]||=[]).push(!!npc.equipmentCondition[id]?.broken);(state.equipmentDurabilityStock[id]||=[]).push(npc.equipmentCondition[id]?.hitsRemaining??SHOP[id].durability);npc.equipmentSlots[slot]=null;
    }
    function returnSlottedEquipment(state,npc){normalizeInventory(state);ensureLife(npc);for(const slot of EQUIPMENT_SLOTS)returnEquipmentSlot(state,npc,slot);return state.equipmentStock;}
    const availableEquipmentArmor=(state,id)=>state.equipmentConditionStock?.[id]?.[0]??SHOP[id]?.armor??0;
    function equipmentArmor(npc) { ensureLife(npc); return EQUIPMENT_SLOTS.reduce((sum,slot)=>{ const id=npc.equipmentSlots[slot], max=SHOP[id]?.armor||0; const current=npc.equipmentCondition[id]?.current; return sum + (npc.equipmentCondition[id]?.broken?0:Math.max(0, Math.min(max, Number.isFinite(current)?current:max))); },0); }
    function equipmentArmorMax(npc) { ensureLife(npc); return EQUIPMENT_SLOTS.reduce((sum,slot)=>sum+(npc.equipmentCondition[npc.equipmentSlots[slot]]?.broken?0:SHOP[npc.equipmentSlots[slot]]?.armor||0),0); }
    function equipSlot(state,id,item,slot) { normalizeInventory(state);const npc=state.roster.find(n=>n.id===id); if(!living(npc)) return {ok:false,message:"Choose a living adventurer."};if(isUnavailable(state,id))return{ok:false,message:"Equipment is locked while this adventurer is away."}; if(!EQUIPMENT_SLOTS.includes(slot)||item&&SHOP[item]?.slot!==slot) return {ok:false,message:"That item does not fit this slot."}; ensureLife(npc); const old=npc.equipmentSlots[slot];if(old===(item||null))return{ok:false,message:item?`${SHOP[item].name} is already equipped.`:"This slot is already empty."}; if(item&&!compatible(npc,item))return{ok:false,message:`${SHOP[item]?.name||"Item"} cannot be used by ${npc.role}.`}; if(item&&!(state.equipmentStock[item]>0)) return {ok:false,message:"Buy this item first."}; const oldWardMax=npc.innateWardMax;if(old)returnEquipmentSlot(state,npc,slot); if(item){const queue=state.equipmentConditionStock[item];const current=queue.length?queue.shift():SHOP[item].armor;state.equipmentStock[item]--;npc.equipmentCondition[item]={current,max:SHOP[item].armor,hitsRemaining:state.equipmentDurabilityStock[item]?.shift()??SHOP[item].durability,maxHits:SHOP[item].durability,broken:!!state.equipmentBrokenStock[item]?.shift()};} npc.equipmentSlots[slot]=item||null; ensureLife(npc);npc.innateWard=Math.min(npc.innateWardMax,npc.innateWard+Math.max(0,npc.innateWardMax-oldWardMax)); return {ok:true,message:`${displayName(npc)}: ${item?SHOP[item].name:"slot cleared"}.${old?` ${SHOP[old]?.name||old} returned to stock.`:""}`}; }
    function resolveDamage(target,amount){ensureLife(target); let remaining=Math.max(0,Math.floor(Number(amount)||0)),wardLoss=0,armorLoss=0,hpLoss=0; const spend=(key)=>{const used=Math.min(target[key]||0,remaining);target[key]-=used;remaining-=used;wardLoss+=used;}; spend("temporaryWard"); spend("innateWard"); const classUsed=Math.min(target.classArmor,remaining);target.classArmor-=classUsed;remaining-=classUsed;armorLoss+=classUsed; for(const slot of EQUIPMENT_SLOTS){if(!remaining)break;const id=target.equipmentSlots[slot],max=SHOP[id]?.armor||0;if(!max)continue;const c=target.equipmentCondition[id]||={current:max,max};const used=Math.min(c.current,remaining);c.current-=used;remaining-=used;armorLoss+=used;} hpLoss=Math.min(target.health,remaining);target.health-=hpLoss;return{amount,wardLoss,armorLoss,hpLoss,remaining,targetHealth:target.health,ward:(target.temporaryWard||0)+(target.innateWard||0),armor:target.classArmor+equipmentArmor(target)};}
    function restoreBetweenBattles(npc){ensureLife(npc);npc.innateWard=Math.min(npc.innateWardMax,npc.innateWard+2);return npc;}
    function ensureCampJobs(state){
        const source=state.campJobs&&typeof state.campJobs==="object"?state.campJobs:{};state.campJobs={};
        for(const npc of state.roster||[])if(living(npc)&&!npc.retired)state.campJobs[npc.id]=CAMP_JOBS.includes(source[npc.id])?source[npc.id]:"idle";
        return state.campJobs;
    }
    function campJobFor(state,id){ensureCampJobs(state);return state.campJobs[id]||null;}
    function bestCampJob(npc){return ["mage","cleric"].includes(LEGACY_CLASSES[npc.classId]||npc.classId)?"study":"work";}
    function campJobYield(npc,job){return job==="idle"?0:job===bestCampJob(npc)?2:1;}
    function autoAssignCampJobs(state){
        ensureCampJobs(state);const assignments=[];
        for(const npc of activeRoster(state))if(!isUnavailable(state,npc.id)){const job=bestCampJob(npc);assignCampJob(state,npc.id,job);assignments.push({id:npc.id,job,yield:campJobYield(npc,job)});}
        return{ok:true,assignments,message:assignments.length?`Auto-assigned ${assignments.length} companions to their best jobs (2 resources per minute). Adventurers away keep their assignments.`:"No companions are available at camp."};
    }
    function assignCampJob(state,id,job){
        ensureCampJobs(state);const npc=(state.roster||[]).find(entry=>entry.id===id);
        if(!living(npc)||npc.retired)return{ok:false,message:"Only living founders can take camp jobs."};
        if(isUnavailable(state,id))return{ok:false,message:`${displayName(npc)} is away on an expedition.`};
        if(!CAMP_JOBS.includes(job))return{ok:false,message:"Unknown camp job."};
        const previous=state.campJobs[id];state.campJobs[id]=job;
        return{ok:true,previous,job,message:`${displayName(npc)} moved from ${previous[0].toUpperCase()+previous.slice(1)} to ${job[0].toUpperCase()+job.slice(1)}.`};
    }
    function useBathhouse(state) { return {ok:false,message:"Assign Rest in Camp Jobs to recover HP."}; }
    function formationFor(team){const front=[],back=[];for(const npc of team){ensureLife(npc);const preferred=npc.preferredPosition==="back"?back:front,other=preferred===front?back:front,cap=preferred===front?3:2;(preferred.length<cap?preferred:other).push(npc);}return{front:front.slice(0,3),back:back.slice(0,2)};}
    function setNickname(state,id,value){const npc=state.roster.find(n=>n.id===id);if(!npc||npc.level<3)return{ok:false,message:"Nickname unlocks at Level 3."};if(npc.nicknamePrompted)return{ok:false,message:"Nickname milestone already resolved."};npc.nickname=String(value||"").trim().slice(0,20);npc.nicknamePrompted=true;npc.history.events.push({type:"nickname",value:npc.nickname});return{ok:true,message:npc.nickname?`${displayName(npc)} earned a nickname.`:"Nickname skipped."};}
    function evaluateEarnedTraits(npc){npc.earnedTraits=[];return [];}
    function addPermanentWound(npc,id){ensureLife(npc);if(!WOUND_DEFINITIONS.some(w=>w.id===id)||npc.permanentWounds.includes(id))return false;npc.permanentWounds.push(id);npc.history.woundsAcquired++;npc.history.events.push({type:"permanentWound",id});evaluateEarnedTraits(npc);return true;}
    function classLabel(npc){return `${npc.reanimated?"Skeleton ":""}${classFor(npc)?.name||npc.role||"Adventurer"}`;}
    function normalizeUndead(npc){
        npc.role=classLabel(npc);
        const sex=npc.sex==="female"?"female":"male",options=portraitOptions(npc.classId,sex);
        const chosen=options.find(p=>p.key===(npc.portraitKey||npc.portrait?.key))||options[0];
        const variant=(chosen?.index||0)%8,stem=`RPGSkeleton_${npc.classId}_${sex}`;
        npc.portraitKey=chosen?.key||npc.portraitKey;
        npc.portrait={sheet:`${stem}_faces_v7`,index:variant,columns:8,rows:1};
        npc.walkPortrait={sheet:`${stem}_walk_v7`,index:variant};
        npc.combatPortrait={sheet:`${stem}_${variant}_v7`};
        npc.fallenPortrait={sheet:`${stem}_fallen_v7`,index:variant,columns:4,rows:2};
    }
    function startCampTimer(state,minutes){
        const ms=Number(minutes)*60000;if(!Number.isFinite(ms)||ms<1||ms>Number.MAX_SAFE_INTEGER)return{ok:false,message:"Enter a positive number of minutes."};
        if(state.trips?.A)return{ok:false,message:"Set a camp timer after the quest returns."};
        const id=(state.campTimer?.id||0)+1;state.campTimer={id,active:true,totalMs:ms,remainingMs:ms,pendingBell:false};return{ok:true};
    }
    function tickCampTimer(state,delta){const timer=state.campTimer;if(!timer?.active)return false;if(state.trips?.A){timer.active=false;timer.pendingBell=false;timer.stopReason="quest_started";return false;}timer.remainingMs=Math.max(0,timer.remainingMs-Math.max(0,Number(delta)||0));if(timer.remainingMs===0){timer.active=false;timer.pendingBell=true;return true;}return false;}
    function consumeCampBell(state){if(!state.campTimer?.pendingBell)return false;state.campTimer.pendingBell=false;return true;}
    function removeCompanion(state,id){
        const error=dismissalError(state,id);if(error)return{ok:false,message:error};
        const result=dismissAdventurer(state,id,true);if(!result.ok)return result;
        state.roster=state.roster.filter(n=>n.id!==id);delete state.campJobs?.[id];delete state.campJobElapsed?.[id];
        for(const key of Object.keys(state.bonds||{}))if(key.split("|").includes(id))delete state.bonds[key];
        normalizeFocusRoster(state);return result;
    }
    function replaceCreated(state,id,draft,confirmed=false){
        if(!confirmed)return{ok:false,confirmationRequired:true,message:"Confirm replacing this companion; their gear is returned."};
        const staged=copy(state),removed=removeCompanion(staged,id);if(!removed.ok)return removed;
        const hired=recruitCreated(staged,draft);if(!hired.ok)return hired;
        for(const key of Object.keys(state))delete state[key];Object.assign(state,staged);return{...hired,message:`Replaced ${removed.npc.name}; all equipment returned to inventory.`};
    }
    function ritualCast(state,id,targetId,options=null){
        const r=RITUALS[id],npc=state.roster.find(n=>n.id===targetId);
        if(!r||!state.ritualsUnlocked[id])return{ok:false,message:"Ritual is locked."};
        if(state.activeQuest||Object.values(state.trips||{}).some(Boolean))return{ok:false,message:"Rituals are available only at camp."};
        if(state.arcana<r.castCost)return{ok:false,message:`Requires ${r.castCost} Arcana.`};
        if(r.target==="living"&&(!living(npc)||!activeRoster(state).some(n=>n.id===targetId)||isUnavailable(state,targetId)))return{ok:false,message:"Choose a living companion at camp."};
        if(id==="healing_ritual"&&!npc.permanentWounds.length)return{ok:false,message:"This companion has no permanent wound."};
        if(!r.target&&id!=="greed_prayer"&&state.ritualEffects?.[id])return{ok:false,message:`${r.name} is already pending.`};
        if(id==="oath_of_vanguard"&&state.ritualEffects?.[id])return{ok:false,message:"An Oath is already pending for the next quest."};
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

    function questDangerEstimate(state,quest,content,BattleClass,partyIds=state.teamIds){
        if(quest.combatMode==="none"||quest.durationMinutes===1)return {dangerous:false,samples:0,wipes:0};
        const preview=copy(state),ids=Array.isArray(partyIds)?partyIds.slice():[];if(ids.length<MIN_PARTY_SIZE||ids.length>MAX_PARTY_SIZE)return {dangerous:false,samples:0,wipes:0};
        let objectiveStage={enemyIds:quest.enemyIds||[]};
        if(quest.balanceVersion>=33){const plan=encounterPlan({...quest,id:'risk-preview',questId:quest.id,totalDurationMs:quest.durationMinutes*60000,stages:[{...objectiveStage,type:'battle',mainQuest:true}]});objectiveStage=plan.find(p=>p.stage.mainQuest)?.stage||objectiveStage;}
        const team=prepareTeam(preview,ids);for(const n of team){n.classArmor=Math.min(n.classArmorMax,(n.classArmor||0)+(n.armorRecovery||0));n.armor=n.classArmor+equipmentArmor(n)+(n.ritualArmor||0);n.innateWard=Math.min(n.innateWardMax,n.innateWard+2);if(state.ritualEffects?.oath_of_vanguard===n.id)n.armor++;}const enemies=encounterEnemies(objectiveStage,content,quest);if(!enemies.length)return {dangerous:false,samples:0,wipes:0};
        let wipes=0,losses=0;const samples=24;
        for(let seed=1;seed<=samples;seed++){const b=new BattleClass(copy(team),copy(enemies),{seed:seed*7919,maxActions:180,ritualEffects:copy(state.ritualEffects||{})});b._waves=(objectiveStage.waves||[]).slice(1).map((enemyIds,index)=>encounterEnemies({...objectiveStage,enemyIds,reinforcementWave:objectiveStage.reinforcementWaveIndex===index+1},content,quest));while(b.snapshot().status==="running")b.step();const snap=b.snapshot();if(snap.status!=="victory")losses++;if(snap.fighters.filter(n=>n.side==="player").every(n=>n.health<=0))wipes++;}
        const underlevel=team.reduce((n,x)=>n+x.level,0)/team.length<dangerRating(quest);
        return {dangerous:underlevel||losses>=samples*.5,wipes,samples,losses,allSamplesWiped:wipes===samples};
    }
    const ritualEntries = () => Object.entries(RITUALS).sort((a,b)=>a[1].castCost-b[1].castCost);
    const api = { autoAssignCampJobs, bestCampJob, campJobYield, encounterTier, ritualEntries, questDangerEstimate, itemBoosts, requestRecall, classLabel, normalizeUndead, startCampTimer, tickCampTimer, consumeCampBell, replaceCreated, dangerRating, dangerLabel, encounterPlan, finishBattlePlayback, repairGear, woundLines, powerTrack, SESSION_TIMING, walkingPortrait, recruitCreated, primaryReward, portraitOptions,createStartingParty,restoreReturnArmor, encounterEnemies,namePools,identityLabel,questNarrative,xpFieldNote, CLASS_NAMES, authoredDifficulty,sessionRecap,retreatAssessment,beginAutomaticRetreat,endSessionEarly, nameError, randomName, classStats, ALL_CLASSES, LEGACY_CLASSES, compatible, itemSummary, sellItem, beginStartingRoster, confirmStartingRoster, queueEventCue, consumeEventCues, expeditionLine, FOUNDER_IDS, activeSlotIds, activeRoster, vacantSlots, graveyard, replacementCandidates, consumeCompletionAlert, fixedRoster, normalizeFocusRoster, resultSnapshot, dismissQuestResults, availableEquipmentArmor, gearIds, armorGearIds, shopIds, normalizeInventory, returnSlottedEquipment, rating, assignTeam, selectTeam, SEXES, RACES, MIN_PARTY_SIZE, MAX_PARTY_SIZE, MAX_ROSTER_SIZE, LEVEL_CAP, QUEST_HISTORY_LIMIT, SETTLED_TRIP_LIMIT, BADGE_DEFINITIONS, DEFAULT_XP_RULES, SCHEMA_VERSION, TRAIT_DEFINITIONS, EXPEDITION_ORDERS, EQUIPMENT_SLOTS, DODGE_TIERS, MAX_EXPEDITION_WAIT_SECONDS, CAMP_JOBS, EXPEDITION_DURATIONS, MAX_SESSION_TICK_MS, ENCOUNTER_CHANCES, RANDOM_BATTLE_ENEMIES, RANDOM_OPPORTUNITY_EVENTS, PRESENTATION_LEVELS, WOUND_DEFINITIONS, EARNED_TRAITS, RITUALS,
        validateContent, configure, classes, classFor, moveFor, say, editProfile, classPreview, chooseClass, SHOP, upgradeState,
        purchaseError, purchase, equipmentError, equip, createState, living, xpRequired, teamError, bondPartners, prepareTeam,
        xpPreview, beginQuest, finishQuest, dispatchQuest, arriveQuest, startBattle, recordBattleResult, completeReturn, advanceTimers, skipTimer,
        questDurationCategory, debugAdvanceExpedition, advanceMissionClock, tickPresentation, currentStage, enterStage, advanceStage, beginReturn, resolveExpeditionEvent, resolveExpeditionChoice, accrueCampJobs, buildBattlePresentation, presentationDelay, tickRealtimeExpedition, recallExpedition,
        tripForTeam, unavailableIds, isUnavailable, ensureRecruit, refreshRecruit, recruitCandidate, emptyCareer, ensureCareer, badgeFor, dismissalError, dismissAdventurer,
        itemError, useItem, traitFor, validateTraits, setTraits, migrateAutonomy, orderFor, RECRUIT_REFRESH_MS,
        questUnavailableReason, buildJourneyStages, scheduleStages, expeditionProgress, CONTRACT_DANGERS, campaignSummary, sortRoster,
        debugDamageEquipment, debugLevel, setHealthy, applyWound, applyDeath, killAdventurer, conditionOf, CONDITIONS, debugFastTravel, debugRefreshRecruits, assignReplacementLeader,
        displayName, ensureLife, equipmentArmor, equipmentArmorMax, equipSlot, resolveDamage, restoreBetweenBattles, ensureCampJobs, campJobFor, assignCampJob, useBathhouse, formationFor, setNickname, evaluateEarnedTraits, addPermanentWound, ritualUnlock, ritualCast };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    globalThis.RPGManagerProgression = api;
})();
