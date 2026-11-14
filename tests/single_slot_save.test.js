const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'plugins', 'RPGManager.js'), 'utf8');

test('hub save actions write the one campaign slot without opening the file menu', () => {
  assert.match(source, /const MANAGER_SAVE_ID=1,MANAGER_AUTOSAVE_INTERVAL=3\*60\*1000/);
  assert.match(source, /setHandler\("save", \(\) => requestManagerSave\(this\)\)/);
  assert.match(source, /\{label:"Save",kind:"save",color:"#70c9ff",action:"save"\}/);
  assert.match(source, /if\(action==="save"\)\{requestManagerSave\(scene\);return;\}/);
  assert.doesNotMatch(source, /setHandler\("save"[^\n]*Scene_Save/);
  assert.match(source, /DataManager\.saveGame\(MANAGER_SAVE_ID\)/);
  assert.match(source, /if\(managerSavePromise\)return managerSavePromise/);
  assert.match(source, /Automatic save runs every 3 minutes/);
});
