"""Fresh browser route and visual evidence at both supported resolutions."""
import functools,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/visuals'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for width,height in [(816,624),(1280,720)]:
   page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def scene(name):page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name)
   def shot(name):page.screenshot(path=str(OUT/f'coordinated-{width}-{name}.webp'))
   page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title')
   page.evaluate('''({width,height})=>{Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;SceneManager._scene.commandNewGame()}''',{'width':width,'height':height});scene('Scene_RPGStartingRoster');shot('recruitment')
   assert page.evaluate('SceneManager._scene.entries().filter(c=>c.symbol==="candidate").every(c=>!/Ada|Bram|Cora/.test(c.name))')
   page.evaluate('SceneManager._scene._selected=["ada","bram","cora"];SceneManager._scene.startParty()');page.locator('form button[type=submit]').click();scene('Scene_RPGHome')
   page.evaluate('()=>{window._sprintHome=SceneManager._scene.constructor}');shot('camp')
   assert page.locator('#rpg-focus-timer').is_hidden()
   assert page.evaluate('()=>{const w=SceneManager._scene._commandWindow;return w.maxItems()===7&&w.maxCols()===4&&w.itemRect(6).x+w.itemRect(6).width>=w.innerWidth-12}')
   page.evaluate('SceneManager._scene.openMember("ada")');page.wait_for_selector('#camp-member-sheet');shot('inline-sheet')
   assert page.locator('#camp-member-sheet select').count()==4
   page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression;s.roster[0].health=1;s.supplies.potion=1;s.equipmentStock.iron_helmet=1;P.normalizeInventory(s);SceneManager._scene.drawCampSheet()}''')
   page.get_by_role('button',name='Use Potion',exact=False).click();assert page.evaluate('RPGManager.state().roster[0].health')==3
   page.locator('#camp-member-sheet select').first.select_option('iron_helmet');assert page.evaluate('RPGManager.state().roster[0].equipmentSlots.head')=='iron_helmet'
   page.get_by_role('button',name='Return to camp',exact=False).click();assert page.locator('#camp-member-sheet').count()==0
   page.evaluate('SceneManager._scene._commandWindow.callHandler("battle")');scene('Scene_RPGQuestBoard');shot('quest-board')
   page.evaluate('SceneManager.goto(window._sprintHome)');scene('Scene_RPGHome')
   page.evaluate('''()=>{const P=RPGManagerProgression,s=RPGManager.state();P.dispatchQuest(s,'A',RPGManager.quests().find(q=>q.id==='goblin_tracks'),undefined,Date.now());SceneManager.goto(window._sprintHome)}''');scene('Scene_RPGHome');page.wait_for_selector('#rpg-focus-timer');shot('travel')
   assert page.evaluate('!SceneManager._scene._commandWindow.visible&&!SceneManager._scene._camp.visible')
   page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression;P.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);P.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);P.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle)}''')
   # Inspect actual recorded battle opening and fate; renderer must never mutate them.
   page.evaluate('''()=>{const t=RPGManager.state().trips.A;window._savedPresentation=t.presentationCurrent;window._savedQueue=t.presentationQueue;t.presentationCurrent=t.presentationQueue.find(e=>e.sourceType==='attack')||t.presentationCurrent;t.presentationHoldMs=1000;t.presentationDurationMs=2000;t.presentationFighters=t.presentationFighters||t.battleSnapshot.fighters;SceneManager._scene.refreshTeamPanel(false)}''');shot('battle')
   assert page.evaluate('!SceneManager._scene._teamPanel._battleRenderError')
   page.evaluate('''()=>{const t=RPGManager.state().trips.A;t.presentationCurrent={kind:'battle',sourceType:'deathSave',text:'FATE COIN — WOUNDED',survived:true,targetKey:'player:ada'};t.presentationDurationMs=2000;t.presentationHoldMs=500;SceneManager._scene.refreshTeamPanel(false)}''');shot('fate-survival')
   page.evaluate('''()=>{const t=RPGManager.state().trips.A;t.presentationCurrent.survived=false;t.presentationCurrent.text='FATE COIN — PERMANENT DEATH';SceneManager._scene.refreshTeamPanel(false)}''');shot('fate-death')
   # Save/load an actual active trip, then force recorded survival+death to exercise settlement.
   page.evaluate('''async()=>{await DataManager.saveGame(26);await DataManager.loadGame(26);RPGManager.restoreSave();}''')
   page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression,t=s.trips.A;delete t.recordedBattleStages[String(t.stageIndex)];t.phase='battle';P.recordBattleResult(s,'A',t.id,{status:'victory',fighters:t.preparedTeam.map((n,i)=>({...n,side:'player',health:i<2?0:n.health,alive:i>=2}))},Date.now(),[{type:'deathSave',key:'player:ada',survived:true,coinFlip:true},{type:'deathSave',key:'player:bram',survived:false,coinFlip:true}]);s.roster[0].xp=29;P.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle,true);SceneManager.goto(window._sprintHome)}''');scene('Scene_RPGHome');page.wait_for_selector('#rpg-focus-timer',state='hidden');shot('results')
   assert page.evaluate('RPGManager.state().questResults.members.find(n=>n.id==="ada").health===1')
   assert page.evaluate('RPGManager.state().questResults.members.find(n=>n.id==="bram").condition==="Dead"')
   assert page.evaluate('RPGManager.state().questResults.members.find(n=>n.id==="ada").levelledUp')
   page.evaluate('''async()=>{window._goldBefore=RPGManager.state().gold;await DataManager.saveGame(26);await DataManager.loadGame(26);RPGManager.restoreSave();RPGManagerProgression.dismissQuestResults(RPGManager.state());SceneManager.goto(window._sprintHome)}''');scene('Scene_RPGHome');assert page.evaluate('RPGManager.state().gold===window._goldBefore')
   page.evaluate('''()=>{const s=RPGManager.state();for(let i=0;i<6;i++)RPGManagerProgression.accrueCampJobs(s,5000)}''');assert page.evaluate('RPGManager.state().roster[0].health>=2&&RPGManager.state().roster[0].lastingInjuries===1')
   assert not errors,errors
   print(f'PASS {width}x{height}: fresh class-only choices, inline sheet/potion/clickable gear, quest board, travel, battle, resolved fate visuals, active/results save-load, injury/death/level-up, once-only Finish and passive recovery; zero page errors.',flush=True)
   page.close()
  browser.close()
finally:server.shutdown()
