const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/game.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js/plugins/RPGManager.js'), 'utf8');

test('mobile viewport preserves zoom and scopes touch blocking to the game canvas', () => {
  assert.match(html, /width=device-width, initial-scale=1, viewport-fit=cover/);
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1/);
  assert.doesNotMatch(css.match(/body\s*\{[^}]*\}/s)?.[0] || '', /touch-action:\s*none/);
  assert.match(css, /#gameCanvas\s*\{\s*touch-action:\s*pinch-zoom\s*!important/);
});

test('mobile rules are coarse-pointer scoped with safe areas and CSS-pixel targets', () => {
  assert.match(css, /@media[^\{]*pointer:\s*coarse/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /min-height:\s*44px/);
  for (const id of ['character-creation', 'quest-filters', 'start-quest', 'rpg-focus-timer', 'camp-menu-navigation', 'rpg-how-to-play']) {
    assert.match(css, new RegExp('#' + id.replaceAll('-', '\\-')));
  }
  assert.match(css, /#quest-filters\s*\{\s*left:\s*12px\s*!important;\s*width:\s*600px/);
});

test('phone portrait uses a dedicated logical viewport without persisting dimensions', () => {
  assert.match(ui, /mobilePortraitAtBoot/);
  assert.match(ui, /mobileScreenWidth=624,mobileScreenHeight=Math\.max\(816,Math\.min\(1400/);
  assert.match(ui, /screenWidth:mobileScreenWidth,screenHeight:mobileScreenHeight/);
  assert.match(ui, /finally\{Object\.assign\(advanced,original\);\}/);
  assert.match(css, /data-rpg-mobile-layout="portrait"/);
});

test('coarse-pointer lists have one native release owner and no duplicate Altar dispatch', () => {
  assert.match(ui, /mobilePointerLayout\(\)\)\{super\.processTouch\(\);return;\}/);
  assert.match(ui, /if\(event\.button!==0\|\|mobilePointerLayout\(\)\)return/);
  assert.doesNotMatch(ui, /this\._altarTouch=/);
  assert.match(ui, /pointercancel/);
  assert.match(ui, /removeEventListener\("pointerup",this\._altarPointerUp,true\)/);
});

test('mobile dialogs fit the visual viewport rather than the wider engine layout viewport', () => {
  assert.match(ui, /function fitMobileDialog\(el\)/);
  assert.match(ui, /globalThis\.visualViewport/);
  assert.match(ui, /view\.width-16/);
  assert.match(ui, /fitMobileDialog\(modal\.element\)/);
});

test('mobile DOM actions use native clicks without release-coordinate interception', () => {
  assert.match(ui, /function enableMobileTapSafety\(root\)/);
  assert.doesNotMatch(ui, /document\.elementFromPoint\(event\.clientX,event\.clientY\)/);
  assert.doesNotMatch(ui, /tap\.button\.click\(\)/);
  assert.doesNotMatch(ui, /cancelClick=tap\.button/);
  for (const target of ['focusHud', 'root', 'nav', 'start', 'el', 'form']) assert.match(ui, new RegExp('enableMobileTapSafety\\(' + target + '\\)'));
  assert.match(css, /#character-creation\s*>\s*div:last-child\s*\{[^}]*position:\s*sticky/s);
});

test('touch uses native engine state and suppresses only compatibility mouse events', () => {
  const core = fs.readFileSync(path.join(root, 'js/rmmz_core.js'), 'utf8');
  assert.doesNotMatch(ui, /const mobileContact=\{/);
  assert.doesNotMatch(ui, /TouchInput\.isRepeated=function/);
  assert.match(core, /this\._lastTouchTime = Date\.now\(\);/);
  assert.match(core, /if \(Date\.now\(\) - this\._lastTouchTime < 1000\) return;/);
  assert.doesNotMatch(core.match(/TouchInput\._onTouchStart[\s\S]*?\n\};/)?.[0] || '', /navigator\.standalone/);
});

test('mobile visible pages hold and reacquire a screen wake lock safely', () => {
  assert.match(ui, /const mobileScreenWakeLock=\(\(\)=>\{/);
  assert.match(ui, /navigator\.maxTouchPoints/);
  assert.match(ui, /navigator\.wakeLock\.request\("screen"\)/);
  assert.match(ui, /document\.visibilityState!=="visible"/);
  assert.match(ui, /document\.addEventListener\("visibilitychange"/);
  assert.match(ui, /window\.addEventListener\("pagehide",release\)/);
  assert.match(ui, /document\.addEventListener\("pointerdown",resume,\{capture:true,passive:true\}\)/);
  assert.match(ui, /lock\.addEventListener\("release"[\s\S]*?retry\(\)/);
  assert.match(ui, /setInterval\(\(\)=>\{if\(!suspended&&document\.visibilityState==="visible"&&\(!sentinel\|\|sentinel\.released\)\)request\(\);\},15000\)/);
  assert.match(ui, /dispatchQuest[\s\S]*?mobileScreenWakeLock\.request\(\)/);
  assert.match(ui, /screenWakeLock: mobileScreenWakeLock/);
});

test('desktop pointer-down bridge remains available outside mobile layout', () => {
  assert.match(ui, /if\(mobilePointerLayout\(\)\).*super\.processTouch/);
  assert.match(ui, /this\._choices\.select\(index\);this\._choices\.processOk\(\);/);
});
