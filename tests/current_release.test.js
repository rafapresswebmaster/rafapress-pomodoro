const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const ui = fs.readFileSync('js/plugins/RPGManager.js', 'utf8');
const progression = fs.readFileSync('js/plugins/RPGManagerProgression.js', 'utf8');
const css = fs.readFileSync('css/game.css', 'utf8');
const manual = JSON.parse(fs.readFileSync('data/RPGManagerManual.json', 'utf8'));

test('quest preparation shows status, recommended level, and return-only EXP progress', () => {
  assert.match(ui, /quest-party-grid/);
  assert.match(ui, /Recommended level \$\{quest\.intendedLevel/);
  assert.match(ui, /EXP and level-ups apply after the quest finishes/);
  assert.match(ui, /condition==="Wounded"\?"PERMA WOUND":"READY"/);
  assert.match(ui, /xpLabel\.textContent=xpMax\?`EXP/);
  assert.match(css, /quest-party-grid[^}]*repeat\(5/);
  assert.match(css, /quest-party-grid[^}]*repeat\(2/);
});

test('return snapshot preserves settled EXP for the result screen', () => {
  assert.match(progression, /xp:Math\.max\(0,Number\(npc\.xp\)\|\|0\)/);
  assert.match(progression, /xpRequired:xpRequired\(npc\)/);
  assert.match(ui, /xpText=member\.xpRequired\?`EXP/);
});

test('player-facing care language distinguishes incapacitation and perma wounds', () => {
  assert.match(ui, /Incapacitated:/);
  assert.match(ui, /Perma wounds:/);
  assert.match(ui, /perma wound\$\{n\.permanentWounds\.length===1/);
  const text = JSON.stringify(manual);
  assert.match(text, /XP and level-ups are applied only when the quest finishes/);
  assert.match(text, /Healing ritual removes one perma wound and its injury stack/);
});

test('single-companion onboarding offers a reviewable quick-create path', () => {
  assert.match(ui, /button\('Quick Create',\(\)=>this\.quickCreate\(\),footer\)/);
  assert.match(ui, /quickCreate\(\)\{const classId=/);
  assert.match(ui, /this\.finishAppearance\(\);\}/);
});
