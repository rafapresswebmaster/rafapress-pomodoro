import functools,threading,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
results=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for width,height in [(816,624),(1280,720)]:
   page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(15000)
   def scene(name):
    try:page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name)
    except:
     print({'expected':name,'actual':page.evaluate('({scene:SceneManager._scene?.constructor.name,active:document.activeElement?.outerHTML,input:Input._currentState,windows:SceneManager._scene?._windowLayer?.children.map(w=>({name:w.constructor.name,active:w.active}))})'),'errors':errors},flush=True);raise
   def shot(name):page.screenshot(path=str(ROOT/f'tests/visuals/strict-{width}-{name}.webp'))
   def fit(selector):
    r=page.locator(selector).evaluate('el=>({h:el.clientHeight,sh:el.scrollHeight,w:el.clientWidth,sw:el.scrollWidth,b:el.getBoundingClientRect().bottom})')
    if r['sh']>r['h']+2:
     shot('overflow');print(page.locator(selector).evaluate('el=>({html:el.outerHTML,children:[...el.children].map(n=>({tag:n.tagName,h:n.getBoundingClientRect().height,font:getComputedStyle(n).font}))})'),flush=True)
    assert r['sh']<=r['h']+2,(selector,r);assert r['sw']<=r['w']+2,(selector,r);assert r['b']<=height+2,(selector,r)
   page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title');page.evaluate('''({width,height})=>{Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;SceneManager._scene.commandNewGame()}''',{'width':width,'height':height});scene('Scene_RPGStartingRoster')
   # Guided creation, keyboard grid navigation, eight distinct choices per type.
   page.keyboard.press('ArrowRight');page.keyboard.press('ArrowLeft')
   for i,(cls,sex) in enumerate([('Knight','Type A'),('Cleric','Type B'),('Ranger','Type A')]):
    page.get_by_role('button',name=cls,exact=True).click();page.get_by_role('button',name=sex,exact=True).click();assert page.locator('[data-portrait-key]').count()==8;fit('#character-creation');shot('creation-'+str(i));page.get_by_role('button',name='Portrait 8',exact=True).click();page.get_by_label('Recruit name',exact=True).fill(['First','Second','Third'][i]);page.get_by_role('button',name='Next companion' if i<2 else 'Review party',exact=True).click()
   page.get_by_role('button',name='Confirm party and enter camp',exact=True).click();scene('Scene_RPGHome');assert page.locator('#camp-member-sheet').count()==0;shot('camp')
   # Inject the same Input state produced by MZ's gamepad mapper; no hardware controller claim.
   page.evaluate('document.activeElement?.blur();Input.clear();Input._currentState.down=true');page.wait_for_function('SceneManager._scene._campFocusIndex===1');page.evaluate('Input.clear();Input._currentState.ok=true');page.wait_for_selector('#camp-member-sheet');assert 'Second' in page.locator('#camp-member-sheet').get_attribute('aria-label');page.evaluate('Input.clear();Input._currentState.down=true');page.wait_for_function('document.activeElement?.textContent==="Overview"');page.evaluate('Input.clear();Input._currentState.cancel=true');page.wait_for_selector('#camp-member-sheet',state='detached');page.evaluate('Input.clear()')
   page.evaluate('SceneManager._scene.openMember("ada")');fit('#camp-member-sheet')
   for tab in ['Overview','Gear','Care','Powers']:
    page.get_by_role('button',name=tab,exact=True).click();fit('#camp-member-sheet');shot('sheet-'+tab.lower())
   page.get_by_role('button',name='Back to camp',exact=True).click();page.get_by_role('button',name='Shop',exact=True).click();scene('Scene_RPGShop')
   for i in range(6):
    scene('Scene_RPGShop');assert page.evaluate('SceneManager._scene._commandWindow.maxScrollY()===0');shot('shop-'+str(i));page.evaluate('SceneManager._scene._commandWindow.callHandler("slot")');page.wait_for_timeout(100)
   page.get_by_role('button',name='Camp',exact=True).click();scene('Scene_RPGHome');assert page.locator('#camp-member-sheet').count()==0
   # Gamepad mappings and MZ keyboard handlers are inspected, no physical-controller claim.
   assert page.evaluate('Input.gamepadMapper[0]==="ok"&&Input.gamepadMapper[1]==="cancel"&&Input.gamepadMapper[4]==="pageup"')
   page.get_by_role('button',name='Quest Board',exact=True).click();scene('Scene_RPGQuestBoard');fit('#quest-filters')
   for skull in range(1,6):page.get_by_label('Danger',exact=True).select_option(str(skull));assert 'skull' not in page.get_by_label('Danger',exact=True).input_value()
   page.get_by_label('Minutes',exact=True).select_option('1');page.get_by_label('Danger',exact=True).select_option('1');shot('board');page.evaluate('SceneManager._scene._choices.select(0);SceneManager._scene.chooseQuest()');page.wait_for_selector('#manager-confirmation');fit('#manager-confirmation');shot('embark');page.get_by_role('button',name='Embark',exact=True).click();scene('Scene_RPGHome');page.wait_for_selector('.focus-recall');page.wait_for_timeout(800);shot('travel')
   assert page.evaluate('!SceneManager._scene._teamPanel._travelRenderError');assert page.evaluate('RPGManager.state().trips.A.combatMode==="none"')
   page.locator('.focus-recall').click();scene('Scene_RPGRecall');assert page.evaluate('SceneManager._scene._choices.currentSymbol()==="keep"');shot('recall-cancel');page.keyboard.press('Escape',delay=150);scene('Scene_RPGHome');assert page.evaluate('RPGManager.state().trips.A.remainingMs>0')
   page.locator('.focus-recall').click();scene('Scene_RPGRecall');page.evaluate('const w=SceneManager._scene._choices;w.selectSymbol("recall");w.processOk()');scene('Scene_RPGHome');page.wait_for_selector('#finish-recap');assert page.evaluate('RPGManager.state().questHistory.length===1');shot('recall-recap');page.get_by_role('button',name='Finish recap',exact=True).click();scene('Scene_RPGHome')
   # Isolated high-level fixture shows actual side-view models, enemy strip and campfire.
   page.evaluate('''()=>{const P=RPGManagerProgression,s=RPGManager.state();for(const n of s.roster){n.level=8;P.ensureLife(n);n.health=n.maxHealth;}s.campaignStats.questsCompleted=100;const q=$dataRPGManagerStage3.quests.find(q=>q.durationMinutes===15&&q.combatMode==='required');P.dispatchQuest(s,'A',q,undefined,1000);const t=s.trips.A;for(let i=0;i<4;i++)P.tickRealtimeExpedition(s,5000,$dataRPGManagerQuests,RPGManagerBattle.Battle,false,false);}''')
   page.evaluate('''()=>{const t=RPGManager.state().trips.A;t.presentationQueue=t.presentationQueue.filter(e=>e.kind==='battle');t.presentationCurrent=null;t.presentationHoldMs=0;RPGManagerProgression.tickPresentation(t,1,'standard',$dataRPGManagerPresentation);SceneManager.goto(SceneManager._scene.constructor);}''');scene('Scene_RPGHome');page.wait_for_function('!!SceneManager._scene._teamPanel?._battleStage?.lastGeometry');page.wait_for_timeout(250);shot('battle');assert page.evaluate('!SceneManager._scene._teamPanel._battleRenderError');assert page.evaluate('RPGManager.state().trips.A.presentationCurrent.kind==="battle"')
   page.evaluate('''()=>{const P=RPGManagerProgression,s=RPGManager.state(),t=s.trips.A;P.finishBattlePlayback(t);t.elapsedMs=t.totalDurationMs*.5;t.remainingMs=t.totalDurationMs-t.elapsedMs;t.wiped=false;t.autoRetreat=false;P.tickRealtimeExpedition(s,1000,$dataRPGManagerQuests,RPGManagerBattle.Battle,false,false);}''');page.wait_for_timeout(500);shot('campfire');assert page.evaluate('RPGManager.state().trips.A.phase==="campfire"')
   assert not errors,errors;results.append({'width':width,'height':height,'errors':errors,'result':'PASS'});print(results[-1],flush=True);page.close()
  browser.close()
finally:
 server.shutdown();(ROOT/'tests/strict-focus-browser.json').write_text(json.dumps(results,indent=2))
