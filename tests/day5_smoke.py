"""Day 5 fresh-game integration with actual MZ scenes and isolated browser saves.
Normal campaign first; explicit late fixtures exercise injuries/death/end-state.
One travel uses the full unmodified two-minute timer. Battle animations always
run at normal production speed. Does not modify the user's NW.js save files.
"""
import functools, threading, tempfile, sys
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
   page.wait_for_function('name => SceneManager._scene?.constructor.name === name && SceneManager._scene.isStarted() && !SceneManager.isSceneChanging() && !SceneManager._scene.isBusy()',arg=name)
   assert not errors,errors
  def frames(): page.wait_for_function('n => Graphics.frameCount < n || Graphics.frameCount >= n+3',arg=page.evaluate('Graphics.frameCount'))
  def press(key):
   page.keyboard.down(key);frames();page.keyboard.up(key);frames()
  def click(key,symbol,ext='ANY'):
   page.wait_for_function('key => SceneManager._scene[key]?.isOpenAndActive()',arg=key)
   point=page.evaluate('''([key,symbol,ext]) => {
    const s=SceneManager._scene,w=s[key],i=w._list.findIndex(c=>c.symbol===symbol && (ext==='ANY' || c.ext===ext));
    if(i<0) throw new Error('Missing command '+symbol+' '+ext);
    w.forceSelect(i);const r=w.itemRect(i);
    return {x:s._windowLayer.x+w.x+w.padding+r.x-w.origin.x+r.width/2,
            y:s._windowLayer.y+w.y+w.padding+r.y-w.origin.y+r.height/2};
   }''',[key,symbol,ext])
   page.mouse.move(point['x'],point['y']);frames();page.mouse.down();frames();page.mouse.up();frames()
  def home(symbol): click('_commandWindow',symbol)
  def member(id):
   home('roster');scene('Scene_RPGRoster');click('_listWindow','npc',id);scene('Scene_RPGMember')
  def choose(value):click('_choices','choose',value)
  def back():click('_choices','back')
  def memberhome():back();scene('Scene_RPGRoster');click('_listWindow','back');scene('Scene_RPGHome')
  def state(): return page.evaluate('RPGManager.state()')
  def shot(name): page.screenshot(path=str(Path(tempfile.gettempdir())/f'rpg-manager-day5-{name}.webp'))
  def depart(skip=True):
   home('battle');scene('Scene_RPGPreparation');click('_departure','depart');click('_strategies','Tactical');scene('Scene_RPGTravel')
   assert state()['activeQuest'] is not None
   assert page.evaluate('SceneManager._scene._battle.snapshot().actions')==0
   if skip: press('Enter')
   else:
    if '--fast-travel' in sys.argv:
     page.evaluate('SceneManager._scene._arrival = performance.now()-1')
    print('Testing timer expiry...' if '--fast-travel' in sys.argv else 'Waiting for the full 120-second eventless travel countdown...',flush=True)
    page.wait_for_function('SceneManager._scene.constructor.name === "Scene_RPGBattle"',timeout=150000)
   scene('Scene_RPGBattle')
  def finish():
   page.wait_for_function('SceneManager._scene._pending?.frame >= 22 && SceneManager._scene._pending?.frame < 45')
   page.wait_for_function('SceneManager._scene._finished',timeout=60000)
   assert state()['activeQuest'] is None
   before=state()
   home('home');scene('Scene_RPGReport')
   assert state()==before
   assert page.evaluate('SceneManager._scene._logWindow._lines.some(l=>l.text.includes("Reward:"))')
   home('home');scene('Scene_RPGHome')
   assert state()==before
  def save(slot):
   home('save');scene('Scene_Save')
   page.evaluate('id=>SceneManager._scene._listWindow.selectSavefile(id)',slot)
   press('Enter');scene('Scene_RPGHome')
  scene('Scene_Title');home('newGame');scene('Scene_RPGHome')
  assert state()['gold']==100 and state()['questCount']==0 and state()['teamIds']==[]
  home('roster');scene('Scene_RPGRoster');assert page.evaluate('SceneManager._scene._listWindow.maxItems()')==11
  click('_listWindow','back');scene('Scene_RPGHome')
  for name in ['ada','bram','cora']:
   member(name);choose('team');choose('A');back();memberhome()
  home('shop');scene('Scene_RPGShop')
  click('_commandWindow','buy','blade');click('_commandWindow','buy','guard')
  assert state()['gold']==20
  before=state();click('_commandWindow','buy','medkit');assert state()==before
  click('_commandWindow','buy','potion');assert state()['gold']==10
  shot('shop');home('back');scene('Scene_RPGHome')
  member('ada');choose('slots');choose(1);choose('blade')
  assert state()['roster'][0]['equipment']=='blade'
  choose('guard');assert state()['equipmentStock']['blade']==1
  choose('blade');assert state()['equipmentStock']['guard']==1
  shot('equipment');back();back();memberhome()
  print('PASS: fresh roster/team, shop funds, equipment swaps.',flush=True)
  depart()
  assert page.evaluate('SceneManager._scene._battle.snapshot().fighters[0].battleBonuses.equipment.includes("Blade")')
  click('_strategies','Aggressive')
  assert page.evaluate('SceneManager._scene._battle.snapshot().strategyCooldown')>0
  before=page.evaluate('SceneManager._scene._battle.snapshot().strategy');click('_strategies','Defensive')
  assert page.evaluate('SceneManager._scene._battle.snapshot().strategy')==before
  finish();assert state()['gold']==70 and state()['questCount']==1
  assert all(n['stamina']==80 and n['xp']==60 for n in state()['roster'][:3])
  member('ada');choose('supplies');choose('potion')
  assert state()['supplies']['potion']==6
  back();memberhome()
  home('rest');assert all(n['stamina']==100 for n in state()['roster'][:3])
  print('PASS: first battle, equipment bonus, strategy lock, rewards/report, potion, rest.',flush=True)
  depart(skip=False);finish()
  assert all(n['level']==2 and n['xp']==20 for n in state()['roster'][:3])
  assert len(state()['bonds'])==3 and all(v==2 for v in state()['bonds'].values())
  home('report');scene('Scene_RPGReport');shot('report');home('home');scene('Scene_RPGHome')
  save(1);saved=state();home('title');scene('Scene_Title');home('continue');scene('Scene_RPGHome');assert state()==saved
  page.reload();scene('Scene_Title');home('continue');scene('Scene_RPGHome');assert state()==saved
  print('PASS: timer arrival, second quest, level/traits/bonds, report, Save/Continue after reload.',flush=True)
  # Deterministic low-health fixtures, still using the normal combat and progression.
  page.evaluate('RPGManager.roster().slice(0,3).forEach(n=>{n.health=1;n.injury=null;});')
  depart();finish()
  assert all(n['alive'] and n['injury']=='Wounded' for n in state()['roster'][:3])
  home('shop');scene('Scene_RPGShop');click('_commandWindow','buy','medkit');home('back');scene('Scene_RPGHome')
  member('ada');choose('supplies');choose('medkit')
  assert state()['roster'][0]['injury'] is None
  back();memberhome()
  # Ada is also deliberately wounded here so the next test covers all three deaths.
  page.evaluate('RPGManager.roster().slice(0,3).forEach(n=>{n.health=1;n.injury="Wounded";});')
  depart();finish()
  assert all(not n['alive'] for n in state()['roster'][:3]);assert state()['teamIds']==[]
  assert state()['equipmentStock']['blade']==1
  home('roster');scene('Scene_RPGRoster')
  assert page.evaluate('SceneManager._scene._listWindow._list.filter(c=>c.symbol==="npc").length')==7
  assert page.evaluate('SceneManager._scene._listWindow._list.filter(c=>c.symbol==="npc").every(c=>!["ada","bram","cora"].includes(c.ext))')
  click('_listWindow','back');scene('Scene_RPGHome')
  home('graveyard');scene('Scene_RPGRoster');assert page.evaluate('SceneManager._scene._listWindow._list.filter(c=>c.symbol==="npc").length')==3
  shot('graveyard');click('_listWindow','back');scene('Scene_RPGHome')
  save(2);dead=state();home('title');scene('Scene_Title');home('continue');scene('Scene_RPGHome');assert state()==dead
  # End-of-roster state and an old/manual interrupted save must not strand Home.
  page.evaluate('RPGManager.roster().slice(3,8).forEach(n=>{n.alive=false;n.health=0;}); RPGManager.state().activeQuest={id:99,team:[]};')
  save(3);home('title');scene('Scene_Title');home('continue');scene('Scene_RPGHome')
  assert state()['activeQuest'] is None
  assert not page.evaluate('SceneManager._scene._commandWindow._list.find(c=>c.symbol==="battle").enabled')
  shot('end-of-roster')
  home('title');scene('Scene_Title');home('newGame');scene('Scene_RPGHome')
  assert state()['gold']==100 and state()['questCount']==0 and all(n['alive'] for n in state()['roster'])
  print('PASS: injury, Medkit, death, returned gear, dead NPC filtering, death save/load, depleted roster, interrupted-save recovery, New Game reset.',flush=True)
  assert not errors,errors
  browser.close()
finally: server.shutdown();server.server_close()
