"""Day 4 integration: real MZ scenes with an isolated browser profile."""
import functools, threading, tempfile
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':816,'height':624}); errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/')
  def scene(name):
   page.wait_for_function('name => SceneManager._scene?.constructor.name === name && SceneManager._scene.isStarted() && !SceneManager.isSceneChanging()',arg=name)
  scene('Scene_Title')
  page.evaluate('SceneManager._scene.commandNewGame()')
  scene('Scene_RPGHome')
  page.evaluate('RPGManager.confirmTeam(RPGManager.roster().slice(0,3).map(n=>n.id)); SceneManager._scene.startBattle()')
  scene('Scene_RPGPreparation')
  def frames():
   page.wait_for_function('n => Graphics.frameCount >= n+3',arg=page.evaluate('Graphics.frameCount'))
  def press(key):
   page.keyboard.down(key); frames(); page.keyboard.up(key); frames()
  def click(window, symbol):
   point=page.evaluate("""([key,symbol]) => {
    const s=SceneManager._scene,w=s[key],i=w._list.findIndex(c=>c.symbol===symbol),r=w.itemRect(i);
    return {x:s._windowLayer.x+w.x+w.padding+r.x+r.width/2,
            y:s._windowLayer.y+w.y+w.padding+r.y+r.height/2};
   }""",[window,symbol])
   page.mouse.move(point['x'],point['y']);frames()
   page.mouse.down();frames();page.mouse.up();frames()
  assert not page.evaluate('SceneManager._scene._strategies.visible')
  assert page.evaluate('SceneManager._scene._departure.active')
  click('_departure','depart')
  assert page.evaluate('SceneManager._scene._strategies.active && !SceneManager._scene._departure.visible')
  press('Escape')
  assert page.evaluate('SceneManager._scene._departure.active && !SceneManager._scene._strategies.visible')
  press('Enter')
  assert page.evaluate('SceneManager._scene._strategies.active')
  page.screenshot(path=str(Path(tempfile.gettempdir())/'rpg-manager-day4-strategy.webp'))
  click('_strategies','Aggressive')
  scene('Scene_RPGTravel')
  assert page.evaluate('SceneManager._scene._battle.snapshot().actions')==0
  page.wait_for_timeout(1100)
  assert page.evaluate('SceneManager._scene._seconds')<=119
  page.evaluate('SceneManager._scene.arrive(); SceneManager._scene.arrive()')
  scene('Scene_RPGBattle')
  assert page.evaluate('SceneManager._scene._battle.snapshot().strategy')=='Aggressive'
  click('_strategies','Defensive')
  assert page.evaluate('SceneManager._scene._battle.snapshot().strategy')=='Defensive'
  assert page.evaluate('SceneManager._scene._battle.snapshot().strategyCooldown')>0
  assert page.evaluate('SceneManager._scene._strategies._list.every(c=>!c.enabled)')
  click('_strategies','Tactical')
  assert page.evaluate('SceneManager._scene._battle.snapshot().strategy')=='Defensive'
  page.wait_for_function('SceneManager._scene._battle.snapshot().strategyCooldown === 0',timeout=30000)
  assert page.evaluate('SceneManager._scene._strategies._list.filter(c=>c.enabled).length')==2
  # Keyboard switches work after the same shared cooldown.
  page.evaluate('SceneManager._scene._strategies.select(2)')
  press('Enter')
  assert page.evaluate('SceneManager._scene._battle.snapshot().strategy')=='Tactical'
  assert page.evaluate('Array.from(SceneManager._scene._tokens.values()).every(t=>t.art.bitmap.isReady() && t.art._frame.width>0)')
  assert page.evaluate('SceneManager._scene._logWindow._lines.some(l=>l.color === "#8edaff")')
  assert page.evaluate('SceneManager._scene._logWindow._lines.some(l=>l.color === "#ffa795")')
  page.wait_for_function('SceneManager._scene._pending?.frame >= 22 && SceneManager._scene._pending?.frame < 45')
  page.screenshot(path=str(Path(tempfile.gettempdir())/'rpg-manager-day4-battle.webp'))
  # Observe the complete battle at normal production speed.
  page.wait_for_function('SceneManager._scene._finished',timeout=60000)
  assert page.evaluate('SceneManager._scene._tokens.size')==6
  assert page.evaluate('SceneManager._scene._commandWindow.active')
  page.evaluate('SceneManager._scene.returnHome()')
  scene('Scene_RPGReport')
  click('_commandWindow','home')
  scene('Scene_RPGHome')
  # Exercise natural arrival independently of the skip handler.
  page.evaluate('SceneManager._scene.startBattle()');scene('Scene_RPGPreparation')
  click('_departure','depart');click('_strategies','Tactical');scene('Scene_RPGTravel')
  page.evaluate('SceneManager._scene._arrival = performance.now()-1');scene('Scene_RPGBattle')
  assert not errors,errors
  print('PASS: staged preparation, mouse/keyboard strategy input, shared lock/unlock, character art, colored narration, travel, impact, completion and Home; no JS errors.')
  browser.close()
finally: server.shutdown()
