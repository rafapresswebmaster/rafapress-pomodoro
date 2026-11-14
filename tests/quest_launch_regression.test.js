const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../js/plugins/RPGManagerProgression');
const B = require('../js/plugins/RPGManagerBattle');
const roster = require('../data/RPGManagerRoster.json');
const base = require('../data/RPGManagerQuests.json');
const stage3 = require('../data/RPGManagerStage3.json');
const presentation = require('../data/RPGManagerPresentation.json');

test('quest launch checks one eligible companion before opening the 1-3 member picker', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'plugins', 'RPGManager.js'), 'utf8');
    const chooseQuest = source.slice(source.indexOf('        chooseQuest() {'), source.indexOf('\n    }\n\n    const STRATEGY_INFO'));
    assert.match(chooseQuest, /activeRoster\(state\)\.filter\(n=>!progression\.isUnavailable\(state,n\.id\)\)/);
    assert.match(chooseQuest, /teamError\(state,eligible\.slice\(0,1\)\.map\(n=>n\.id\)\)/);
    assert.doesNotMatch(chooseQuest, /teamError\(state,progression\.activeRoster\(state\)\.map/);
    assert.match(chooseQuest, /showQuestPartySelection\(this,quest\)/);
});

test('active expedition panel refreshes resources through the Home scene', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'plugins', 'RPGManager.js'), 'utf8');
    const panelStart = source.indexOf('    class Window_RPGExpeditionPanel');
    const panelEnd = source.indexOf('    class Window_RPGAlerts', panelStart);
    const panel = source.slice(panelStart, panelEnd);
    assert.match(panel, /scene instanceof Scene_RPGHome&&resources!==scene\._headerResourceKey\)scene\.refreshGuildHeader\(\)/);
    assert.doesNotMatch(panel, /this\.refreshGuildHeader\(\)/);
});

test('every procedural duration and difficulty dispatches and settles once', () => {
    const content = { ...base, ...stage3, presentation };
    for (const durationMinutes of P.EXPEDITION_DURATIONS) {
        for (let difficulty = 1; difficulty <= 5; difficulty++) {
            const quest = P.generateJourney(stage3, { durationMinutes, difficulty, seed: `launch-smoke-${durationMinutes}-${difficulty}` });
            const state = P.createState(roster, () => 0.5);
            const partyIds = P.activeRoster(state).map(member => member.id).slice(0, 3);
            P.dispatchQuest(state, 'A', quest, base.xp, 1000, null, 'standard', null, durationMinutes, partyIds);
            assert.ok(state.trips.A, `${durationMinutes}/${difficulty} did not dispatch`);
            P.debugAdvanceExpedition(state, content, B.Battle, true);
            assert.equal(state.trips.A, null, `${durationMinutes}/${difficulty} did not settle`);
            assert.equal(state.questHistory.length, 1, `${durationMinutes}/${difficulty} settled more than once`);
            assert.ok(state.questResults, `${durationMinutes}/${difficulty} produced no results`);
        }
    }
});
