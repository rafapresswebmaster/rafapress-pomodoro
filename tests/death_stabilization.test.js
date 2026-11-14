const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../js/plugins/RPGManagerBattle');
const P = require('../js/plugins/RPGManagerProgression');
const roster = require('../data/RPGManagerRoster.json');
const classes = require('../data/RPGManagerClasses.json');
const dialogue = require('../data/RPGManagerDialogue.json');
const data = require('../data/RPGManagerQuests.json');
const clone = x => JSON.parse(JSON.stringify(x));
P.configure(classes, dialogue);
const fresh = () => P.createState(roster, () => 0.5);
function trip(ids) { const state = fresh(); state.teams.A = ids; const id = P.dispatchQuest(state, 'A', data.quests[0], data.xp, 0, null, 'standard', ids[0]); state.trips.A.phase = 'battle'; return { state, id, trip: state.trips.A }; }
const fighter = (id, hp) => ({ id, side: 'player', health: Math.min(hp,3), alive: hp > 0 });

test('A healthy KO becomes persistently Wounded with configured recovery', () => {
  const x = trip(['ada', 'bram']); P.recordBattleResult(x.state, 'A', x.id, { status: 'victory', fighters: [fighter('ada', 0), fighter('bram', 30)] }, 1, []);
  const ada = x.state.roster.find(n => n.id === 'ada'); assert.equal(P.conditionOf(ada), P.CONDITIONS.WOUNDED); assert.equal(ada.alive, true);
  assert.equal(ada.health, Math.ceil(ada.maxHealth * B.CHECK_CONFIG.woundedContinuationHpRatio));
});

test('A successful Wounded death roll survives Wounded while failure is irreversibly Dead', () => {
  for (const [roll, expected] of [[20, P.CONDITIONS.WOUNDED], [1, P.CONDITIONS.DEAD]]) {
    const x = trip(['ada', 'bram']); P.applyWound(x.state, 'ada', x.id);
    const check = B.resolveD20Check({ type: 'deathSave', dc: 14, forcedRoll: roll });
    P.recordBattleResult(x.state, 'A', x.id, { status: 'victory', fighters: [fighter('ada', 0), fighter('bram', 30)] }, 1, [{ type: 'deathSave', key: 'player:ada', survived: check.success, check }]);
    const ada = x.state.roster.find(n => n.id === 'ada'); assert.equal(P.conditionOf(ada), expected);
    if (expected === P.CONDITIONS.DEAD) { assert.equal(ada.injury, null); assert.equal(P.applyWound(x.state, 'ada').ok, false); }
  }
});

test('a wound from an earlier expedition still requires a Death Save on the next trip', () => {
  const state = fresh();
  P.applyWound(state, 'ada', 'an-older-trip');
  state.teams.A = ['ada', 'bram'];
  const id = P.dispatchQuest(state, 'A', data.quests[0], data.xp, 0, null, 'standard', 'ada');
  state.trips.A.phase = 'battle';
  const failed = B.resolveD20Check({ type: 'deathSave', dc: 14, forcedRoll: 1 });
  P.recordBattleResult(state, 'A', id, { status: 'victory', fighters: [fighter('ada', 0), fighter('bram', 30)] }, 1,
    [{ type: 'deathSave', key: 'player:ada', check: failed }]);
  const ada = state.roster.find(n => n.id === 'ada');
  assert.equal(P.conditionOf(ada), P.CONDITIONS.DEAD);
  assert.equal(state.trips.A.expeditionDeaths.ada, true);
  assert.equal(state.trips.A.preparedTeam.find(n => n.id === 'ada').alive, false);
});

test('failed fate coin uses canonical permanent death even from Healthy', () => {
  const x = trip(['ada', 'bram']); P.recordBattleResult(x.state, 'A', x.id, { status: 'victory', fighters: [fighter('ada', 0), fighter('bram', 30)] }, 1,
    [{ type: 'deathSave', key: 'player:ada', survived: false, permanentDeath: true, coinFlip: true }]);
  assert.equal(P.conditionOf(x.state.roster.find(n => n.id === 'ada')), P.CONDITIONS.DEAD); assert.equal(x.trip.expeditionDeaths.ada, true);
});

test('dead and wounded remain distinct; multiple deaths survive return and save migration', () => {
  const x = trip(['ada', 'bram', 'cora']); P.applyWound(x.state, 'cora', x.id);
  const failed = B.resolveD20Check({ type: 'deathSave', dc: 14, forcedRoll: 1 });
  x.trip.expeditionInjuries.ada = true; x.trip.expeditionInjuries.bram = true;
  P.recordBattleResult(x.state, 'A', x.id, { status: 'defeat', fighters: [fighter('ada', 0), fighter('bram', 0), fighter('cora', 12)] }, 1,
    [{ type: 'deathSave', key: 'player:ada', check: failed }, { type: 'deathSave', key: 'player:bram', check: failed }]);
  assert.equal(P.conditionOf(x.state.roster[0]), P.CONDITIONS.DEAD); assert.equal(P.conditionOf(x.state.roster[1]), P.CONDITIONS.DEAD); assert.equal(P.conditionOf(x.state.roster[2]), P.CONDITIONS.WOUNDED);
  assert.deepEqual(x.trip.team.map(n => n.id), ['ada', 'bram', 'cora']);
  const loaded = P.upgradeState(clone(x.state)); assert.equal(P.conditionOf(loaded.roster[0]), P.CONDITIONS.DEAD); assert.equal(P.conditionOf(loaded.roster[1]), P.CONDITIONS.DEAD);
  loaded.trips.A.phase='return'; P.completeReturn(loaded, 'A', x.id, loaded.trips.A.deadlineMs); assert.equal(loaded.lastReport.deaths.length, 2); assert.equal(P.conditionOf(loaded.roster[2]), P.CONDITIONS.WOUNDED);
});

test('DEBUG death uses canonical death and dead cannot heal or return to camp eligibility', () => {
  const state = fresh(); assert.equal(P.applyDeath(state, 'ada', 'DEBUG').ok, true); const ada = state.roster[0];
  assert.equal(ada.condition, P.CONDITIONS.DEAD); assert.equal(P.useItem(state, 'ada', 'potion').ok, false); assert.equal(P.applyWound(state, 'ada').ok, false);
  assert.equal(state.roster.filter(n => P.living(n)).some(n => n.id === 'ada'), false);
});
