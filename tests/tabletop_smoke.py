import functools,threading,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':1280,'height':720});errors=[];page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)))
  def scene(name):
   try:page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name,timeout=15000)
   except:print({'expected':name,'errors':errors,'body':page.locator('body').inner_text()},flush=True);raise
  page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title');page.evaluate('SceneManager._scene.commandNewGame()');scene('Scene_RPGStartingRoster')
  for cls,name,review in [('Knight','First','Next companion'),('Cleric','Second','Next companion'),('Ranger','Third','Review party')]:
   page.get_by_role('button',name=cls,exact=True).click();page.get_by_role('button',name='Type A',exact=True).click();page.get_by_label('Recruit name',exact=True).fill(name);page.get_by_role('button',name=review,exact=True).click()
  page.get_by_role('button',name='Confirm party and enter camp',exact=True).click();scene('Scene_RPGHome');page.wait_for_timeout(500);
  redraws=page.evaluate("""async()=>{const camp=SceneManager._scene._camp,original=camp.updateCampVisuals;let count=0;camp.updateCampVisuals=function(){count++;return original.apply(this,arguments)};try{await new Promise(resolve=>{let frames=0;const sample=()=>{if(++frames>=20)resolve();else requestAnimationFrame(sample)};requestAnimationFrame(sample)});return count;}finally{camp.updateCampVisuals=original;}}""")
  assert redraws>=18,('Camp sprite updates skipped display frames',redraws)
  page.screenshot(path=str(ROOT/'tests/visuals/tabletop-camp.webp'))
  point=page.evaluate("""()=>{const w=SceneManager._scene._camp,r=w._hitRegions[0].rect,c=Graphics._canvas.getBoundingClientRect(),scale=c.width/Graphics.width;return {x:c.left+(w.x+w.padding+r.x+r.width/2)*scale,y:c.top+(w.y+w.padding+r.y+r.height/2)*scale}}""")
  page.mouse.click(point['x'],point['y']);page.wait_for_selector('#camp-member-sheet');page.get_by_role('button',name='Back to camp',exact=True).click()
  page.evaluate("RPGManagerProgression.assignCampJob(RPGManager.state(),RPGManager.state().roster[0].id,'work')");page.wait_for_timeout(250)
  assert page.evaluate("[...SceneManager._scene._camp._campVisuals.values()][0].labelKey.endsWith(':work')")
  page.evaluate("RPGManagerProgression.assignCampJob(RPGManager.state(),RPGManager.state().roster[0].id,'idle')");page.wait_for_timeout(250)
  assert page.evaluate("[...SceneManager._scene._camp._campVisuals.values()][0].cueKey.startsWith('idle:')")
  page.get_by_role('button',name='Shop',exact=True).click();scene('Scene_RPGShop')
  # Hover an item using actual screen coordinates, then require confirmation before purchase.
  target=page.evaluate('''()=>{const w=SceneManager._scene._commandWindow,i=w._list.findIndex(e=>e.symbol==='buy'),r=w.itemRect(i),c=Graphics._canvas.getBoundingClientRect(),scale=c.width/Graphics.width;window.__item=w._list[i].ext;window.__gold=RPGManager.state().gold;return{x:c.left+(w.x+w.padding+r.x+r.width/2)*scale,y:c.top+(w.y+w.padding+r.y+r.height/2)*scale};}''')
  page.mouse.move(target['x'],target['y']);page.wait_for_timeout(150);assert page.evaluate('SceneManager._scene._commandWindow.currentExt()===window.__item')
  page.mouse.click(target['x'],target['y']);page.wait_for_timeout(150);assert page.evaluate('RPGManager.state().gold===window.__gold');page.screenshot(path=str(ROOT/'tests/visuals/tabletop-shop-confirm.webp'));page.get_by_role('button',name='Cancel',exact=True).click()
  page.get_by_role('button',name='Camp',exact=True).click();scene('Scene_RPGHome')
  page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression;s.campaignStats.questsCompleted=100;const q=$dataRPGManagerQuests.quests.find(q=>q.durationMinutes===20);P.dispatchQuest(s,'A',q,undefined,Date.now());const t=s.trips.A;for(const n of t.preparedTeam){n.health=n.maxHealth=100;n.damage=15;}t.encounterPlan=[{atMs:20000,stage:{id:'visual_jester',type:'battle',randomEncounter:true,jester:true,enemyIds:['masked_jester']}}];for(let i=0;i<4;i++)P.tickRealtimeExpedition(s,5000,$dataRPGManagerQuests,RPGManagerBattle.Battle,false,true);SceneManager.goto(SceneManager._scene.constructor);}''');scene('Scene_RPGHome');page.wait_for_timeout(300);page.screenshot(path=str(ROOT/'tests/visuals/tabletop-combat.webp'));page.evaluate('RPGManagerProgression.requestRecall(RPGManager.state())');page.wait_for_timeout(300);page.screenshot(path=str(ROOT/'tests/visuals/tabletop-recall.webp'))
  assert not errors,errors
  browser.close();print(json.dumps({'result':'PASS','errors':errors,'checks':['camp rendering','camp sprites update every frame','camp character clicks and job changes','shop hover','purchase confirmation','combat rendering','recall rendering']}))
except:
 print({'errors':errors,'body':page.locator('body').inner_text()},flush=True)
 page.screenshot(path=str(ROOT/'tests/visuals/tabletop-smoke-failure.webp'))
 raise
finally:server.shutdown()
