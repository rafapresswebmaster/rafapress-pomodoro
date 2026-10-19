"""Stage 2 UI, save migration and authored-content smoke, isolated browser saves."""
import functools,json,threading,tempfile,subprocess
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':816,'height':624});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def scene(name):page.wait_for_function('n=>SceneManager._scene?.constructor.name===n && SceneManager._scene.isStarted() && !SceneManager.isSceneChanging() && !SceneManager._scene.isBusy()',arg=name)
  def frames():page.wait_for_function('n=>Graphics.frameCount<n || Graphics.frameCount>=n+3',arg=page.evaluate('Graphics.frameCount'))
  def press(key):page.keyboard.down(key);frames();page.keyboard.up(key);frames()
  def click(key,symbol,ext='ANY'):
   page.wait_for_function('k=>SceneManager._scene[k]?.isOpenAndActive()',arg=key)
   point=page.evaluate('''([key,symbol,ext])=>{const s=SceneManager._scene,w=s[key],i=w._list.findIndex(c=>c.symbol===symbol && (ext==='ANY'||c.ext===ext));if(i<0)throw Error('Missing '+symbol+' '+ext);w.forceSelect(i);const r=w.itemRect(i);return {x:s._windowLayer.x+w.x+w.padding+r.x-w.origin.x+r.width/2,y:s._windowLayer.y+w.y+w.padding+r.y-w.origin.y+r.height/2};}''',[key,symbol,ext])
   page.mouse.move(point['x'],point['y']);frames();page.mouse.down();frames();page.mouse.up();frames()
  def home(symbol):click('_commandWindow',symbol)
  def choose(value):click('_choices','choose',value)
  def state():return page.evaluate('RPGManager.state()')
  def shot(name):page.screenshot(path=str(Path(tempfile.gettempdir())/('rpg-stage2-'+name+'.webp')))
  page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title');home('newGame');scene('Scene_RPGHome')
  assert page.evaluate('SceneManager._scene._commandWindow._list.map(e=>e.name)')[:2]==['Roster','Start Quest']
  initial=state()['roster'][0].copy()
  def member(id):
   home('roster');scene('Scene_RPGRoster');click('_listWindow','npc',id);scene('Scene_RPGMember')
  def back():click('_choices','back')
  def tohome():back();scene('Scene_RPGRoster');click('_listWindow','back');scene('Scene_RPGHome')
  member('ada')
  assert page.evaluate('SceneManager._scene._choices._list.map(e=>e.name)')==['Set Up','Equipment','Use supplies','Rename','Back']
  choose('team');assert not page.evaluate('SceneManager._scene._choices._list.find(e=>e.ext==="B").enabled');choose('A');back()
  choose('rename');scene('Scene_RPGRename');page.locator('input').fill('Ada New');page.get_by_role('button',name='Save name').click();scene('Scene_RPGMember')
  for key in ['classId','selectedMove','sex','race','maxHealth','attack','defense','speed']:assert state()['roster'][0][key]==initial[key]
  shot('locked-roster');tohome()
  home('shop');scene('Scene_RPGShop');click('_commandWindow','buy','blade');click('_commandWindow','buy','guard');home('back');scene('Scene_RPGHome')
  member('ada');choose('slots');choose(1);choose('blade');back();choose(2);choose('guard')
  assert state()['roster'][0]['equipment']=='blade' and state()['roster'][0]['equipment2']=='guard'
  assert not page.evaluate('SceneManager._scene._choices._list.find(e=>e.ext==="blade").enabled')
  shot('two-slots');back();back()
  page.evaluate('RPGManager.state().roster[0].health-=30')
  choose('supplies');choose('potion');assert state()['roster'][0]['health']==initial['maxHealth'];back();tohome()
  for id in ['bram','cora']:
   member(id);choose('team');choose('A');back();tohome()
  assert state()['teams']['A']==['ada','bram','cora']
  # Seed economy only to exercise the one-time unlock without grinding.
  page.evaluate('RPGManager.state().gold=200')
  home('shop');click('_commandWindow','buy','teamB');assert state()['teamBUnlocked']
  assert not page.evaluate('SceneManager._scene._commandWindow._list.find(e=>e.ext==="teamB").enabled')
  home('back');scene('Scene_RPGHome')
  for id in ['dax','elin','finn']:
   member(id);choose('team');choose('B');back();tohome()
  home('battle');scene('Scene_RPGChooseTeam');click('_choices','team','B');scene('Scene_RPGPreparation')
  click('_departure','depart');click('_strategies','Tactical');scene('Scene_RPGTravel');press('Enter');scene('Scene_RPGBattle')
  page.wait_for_function('SceneManager._scene._finished',timeout=90000)
  home('home');scene('Scene_RPGReport');home('home');scene('Scene_RPGHome')
  assert state()['questCount']==1
  home('save');scene('Scene_Save');page.evaluate('SceneManager._scene._listWindow.selectSavefile(1)');press('Enter');scene('Scene_RPGHome')
  saved=state();page.reload();scene('Scene_Title');home('continue');scene('Scene_RPGHome');assert state()==saved
  print('PASS: roster hierarchy, locked identity, rename, two slots, supplies, charter, Team B quest, save/reload.',flush=True)
  # Resolve a real lethal enemy attack on an injured participant; never invent a killer in UI.
  page.evaluate("""()=>{const s=RPGManager.state(),P=RPGManagerProgression;P.selectTeam(s,'A');const n=s.roster[0];n.injury='Wounded';n.health=1; const b=RPGManager.createBattle(5);const id=P.beginQuest(s);while(b.snapshot().status==='running')b.step();P.finishQuest(s,id,b.snapshot());SceneManager._scene._commandWindow.refresh();}""")
  dead=state()['roster'][0];assert not dead['alive'] and dead['killedBy']['side']=='enemy'
  home('graveyard');scene('Scene_RPGRoster');shot('killer-graveyard');click('_listWindow','back');scene('Scene_RPGHome')
  home('save');scene('Scene_Save');page.evaluate('SceneManager._scene._listWindow.selectSavefile(1)');press('Enter');scene('Scene_RPGHome')
  page.reload();scene('Scene_Title');home('continue');scene('Scene_RPGHome');assert state()['roster'][0]['killedBy']==dead['killedBy']
  old=json.loads((ROOT/'tests/fixtures/stage1_campaign.json').read_text())
  page.evaluate('s=>{$gameSystem._rpgManager=s;}',old);page.evaluate('async()=>{$gameSystem.onBeforeSave();await DataManager.saveGame(2);}')
  page.reload();scene('Scene_Title');home('continue');scene('Scene_RPGHome');migrated=state();assert migrated['version']==7
  for key in ['gold','supplies','bonds','questCount','lastReport','teamIds']:assert migrated[key]==old[key]
  for a,b in zip(old['roster'],migrated['roster']):
   for key,value in a.items():assert b[key]==value,(key,value,b[key])
  print('PASS: simulation killer survives native-format save/load; older campaign preserves progress.',flush=True)
  assert not errors,errors
  browser.close()
finally:server.shutdown();server.server_close()
