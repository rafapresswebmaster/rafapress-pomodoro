"""Real browser HUD, shared timer, compact fallback, early end and no-input routes."""
import functools,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/visuals';OUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for width,height in [(816,624),(1280,720)]:
   page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def scene(name):
    try:page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name)
    except Exception:print('Scene failed',name,errors,page.locator('body').inner_text(),flush=True);raise
   def shot(name):page.screenshot(path=str(OUT/f'focus-companion-{width}-{name}.webp'))
   def home():page.evaluate('SceneManager.goto(window._focusHome)');scene('Scene_RPGHome')
   def menu():
    if page.locator('#rpg-focus-timer .focus-menu').is_hidden():page.locator('.focus-options').click()
   page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title');page.evaluate('''({width,height})=>{Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;SceneManager._scene.commandNewGame()}''',{'width':width,'height':height});scene('Scene_RPGStartingRoster')
   page.evaluate('()=>{SceneManager._scene._selected=["ada","bram","cora"];SceneManager._scene.startParty()}');page.locator('form button[type=submit]').click();scene('Scene_RPGHome');page.evaluate('()=>{window._focusHome=SceneManager._scene.constructor}');page.wait_for_selector('#rpg-focus-timer',state='attached');shot('home')
   assert page.locator('#rpg-focus-timer').is_hidden()
   page.evaluate('SceneManager._scene._commandWindow.callHandler("battle")');scene('Scene_RPGQuestBoard');page.evaluate('''()=>{const s=SceneManager._scene;s.changeDuration('Long');s._choices.select(s._choices._list.findIndex(c=>c.ext==='lantern_index'));s.refreshInfo()}''');shot('long-contract')
   for id,minutes in [('lantern_index',25),('aqueduct_survey',25),('herbarium_circuit',30),('evening_observatory',30)]:
    page.evaluate('id=>{const s=SceneManager._scene;s._choices.select(s._choices._list.findIndex(c=>c.ext===id));s.refreshInfo()}',id);assert page.locator('#rpg-focus-timer').is_hidden();shot(id+'-contract')
   home();page.evaluate('''()=>{RPGManagerProgression.dispatchQuest(RPGManager.state(),'A',RPGManager.quests().find(q=>q.id==='lantern_index'),$dataRPGManagerQuests.xp,Date.now());SceneManager.goto(window._focusHome)}''');scene('Scene_RPGHome');page.wait_for_function('document.querySelector("#rpg-focus-timer .focus-time").textContent==="25:00"');shot('active')
   assert page.evaluate('SceneManager._scene._teamPanel._recallRegion===null')
   menu();page.locator('.focus-float').click();page.wait_for_selector('#focus-compact');shot('compact-browser');assert page.evaluate('document.querySelector("#focus-compact .focus-time").textContent===document.querySelector("#rpg-focus-timer .focus-time").textContent')
   box=page.locator('#focus-compact').bounding_box();page.mouse.move(box['x']+40,box['y']+45);page.mouse.down();page.mouse.move(180,200,steps=8);page.mouse.up();assert page.evaluate('RPGManager.state().focusTimer.position.x<300');assert page.evaluate('SceneManager._scene.constructor.name')=='Scene_RPGHome'
   page.locator('#focus-compact button').click();assert not page.locator('#focus-compact').count();assert page.evaluate('!!RPGManager.state().trips.A')
   page.evaluate('SceneManager._scene._commandWindow.callHandler("shop")');scene('Scene_RPGShop');assert page.locator('#rpg-focus-timer').is_visible();shot('shop-timer')
   home();page.evaluate('SceneManager._scene.openMember("ada")');scene('Scene_RPGMember');assert page.locator('#rpg-focus-timer').is_visible();shot('character-timer')
   for symbol,name in [('campJobs','Scene_RPGCampJobs'),('altar','Scene_RPGAltar'),('save','Scene_Save')]:
    home();page.evaluate('s=>SceneManager._scene._commandWindow.callHandler(s)',symbol);scene(name);assert page.locator('#rpg-focus-timer').is_visible();shot(symbol+'-timer')
    if symbol=='save':assert page.evaluate('!SceneManager._scene._cancelButton||SceneManager._scene._cancelButton.x+SceneManager._scene._cancelButton.width<=Graphics.boxWidth-268')
   home();page.evaluate('SceneManager._scene._commandWindow.callHandler("shop")');scene('Scene_RPGShop')
   page.evaluate('''()=>{window._normalActive=SceneManager.isGameActive;SceneManager.isGameActive=()=>false;window.dispatchEvent(new Event('blur'));window._beforeRemaining=RPGManager.state().trips.A.remainingMs}''')
   page.wait_for_function('RPGManager.state().trips.A.remainingMs<window._beforeRemaining-1100');page.wait_for_function('document.querySelector("#rpg-focus-timer").getAttribute("data-remaining")===String(RPGManager.focus.view().remainingMs)')
   page.evaluate('SceneManager.isGameActive=window._normalActive;window.dispatchEvent(new Event("focus"))')
   menu();page.locator('.focus-end').click();scene('Scene_RPGRecall');shot('end-confirm');assert page.evaluate('!!RPGManager.state().trips.A');page.evaluate('SceneManager._scene._choices.callHandler("keep")');scene('Scene_RPGShop');assert page.evaluate('!!RPGManager.state().trips.A')
   menu();page.locator('.focus-end').click();scene('Scene_RPGRecall');page.evaluate('SceneManager._scene._choices.callHandler("recall")');scene('Scene_RPGHome');page.wait_for_selector('#rpg-focus-timer',state='hidden');shot('ended-recap');assert page.locator('#rpg-focus-timer').is_hidden()
   page.evaluate('''async()=>{window._endedGold=RPGManager.state().gold;$gameSystem.onBeforeSave();await DataManager.saveGame(25);await DataManager.loadGame(25);RPGManager.restoreSave();$gameSystem.onAfterLoad();SceneManager.goto(window._focusHome)}''');scene('Scene_RPGHome');assert page.evaluate('RPGManager.state().gold===window._endedGold');assert page.evaluate('RPGManager.state().questResults.endKind')=='early'
   page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression;P.dismissQuestResults(s);P.dispatchQuest(s,'A',RPGManager.quests().find(q=>q.id==='aqueduct_survey'),$dataRPGManagerQuests.xp,Date.now());P.beginAutomaticRetreat(s.trips.A,{retreat:true,reason:'The next patrol is overwhelming; the field notes can wait.'});SceneManager.goto(window._focusHome)}''');scene('Scene_RPGHome');shot('auto-return');assert page.evaluate('RPGManager.state().trips.A.remainingMs>0')
   page.evaluate('''()=>{const s=RPGManager.state();while(s.trips.A)RPGManagerProgression.tickRealtimeExpedition(s,5000,$dataRPGManagerQuests,RPGManagerBattle.Battle,false,false);SceneManager._scene.refreshTeamPanel(false);RPGManager.focus.refresh()}''');assert page.locator('#rpg-focus-timer').is_hidden();shot('retreat-recap')
   page.evaluate('SceneManager.goto(Scene_Title)');scene('Scene_Title');assert page.locator('#rpg-focus-timer').is_hidden();assert not page.locator('#focus-compact').count();assert not errors,errors
   print(f'PASS {width}x{height}: persistent analog/digital HUD, Long catalogue, shared compact view/hide, unfocused secondary-screen clock, early-end confirmation/cancel/reload, auto-return/deadline recap and title cleanup; zero page errors.',flush=True);page.close()
  browser.close()
finally:server.shutdown();server.server_close()
