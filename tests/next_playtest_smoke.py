"""Real MZ onboarding, roster/layout/results, optional cues and visible background paints."""
import functools,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'tests'/'visuals';OUTPUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for width,height in [(816,624),(1280,720)]:
   page=browser.new_page(viewport={'width':width,'height':height});errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def scene(name):
    try:page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name,timeout=15000)
    except Exception:
     print('Scene failed',name,errors,page.evaluate('document.body.innerText'),flush=True);raise
   def shot(name):page.screenshot(path=str(OUTPUT/f'playtest-{width}-{name}.webp'))
   def home():page.evaluate('SceneManager.goto(window._playtestHome)');scene('Scene_RPGHome')
   def command(symbol,name):page.evaluate('s=>SceneManager._scene._commandWindow.callHandler(s)',symbol);scene(name)
   def bounds(key,method):
    result=page.evaluate('''({key,method})=>{const s=SceneManager._scene,w=s[key],b=w.contents,old=b.drawText,draws=[];b.drawText=function(text,x,y,width,height,align){draws.push({text,x,y,width,height,size:b.fontSize});return old.call(this,text,x,y,width,height,align)};try{if(method==='expedition')s.refreshTeamPanel(false);else w[method]();}finally{b.drawText=old}return{width:w.innerWidth,height:w.innerHeight,draws}}''',{'key':key,'method':method})
    for d in result['draws']:
     assert d['width']>0 and d['height']>0,d
     assert d['x']>=0 and d['x']+d['width']<=result['width']+1,d
     assert d['y']>=0 and d['y']+d['height']<=result['height']+1,d
    return result
   page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title')
   page.evaluate('''({width,height})=>{Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;SceneManager._scene.commandNewGame()}''',{'width':width,'height':height});scene('Scene_RPGStartingRoster')
   assert page.evaluate('RPGManager.state().startingRosterPending')
   assert page.evaluate('SceneManager._scene._choices._list.filter(c=>c.symbol==="candidate").length')>=5
   page.evaluate('SceneManager._scene.startParty()')
   assert page.evaluate('SceneManager._scene.constructor.name')=='Scene_RPGStartingRoster'
   shot('new-game')
   # Select a different authored trio; cannot exceed three; deselection is reversible.
   page.evaluate('''()=>{const s=SceneManager._scene;for(const id of ['dax','elin','finn']){s._choices.select(s._choices._list.findIndex(c=>c.ext===id));s.toggleCandidate()}window._startingIds=s._selected.slice()}''')
   assert page.evaluate('SceneManager._scene._selected.length')==3
   assert page.evaluate('SceneManager._scene._choices._list.filter(c=>c.symbol==="candidate"&&c.enabled).length')==3
   shot('three-selected');page.evaluate('SceneManager._scene._startButton.callHandler("toggle")');scene('Scene_RPGHome')
   page.evaluate('()=>{window._playtestHome=SceneManager._scene.constructor}')
   assert page.evaluate('JSON.stringify(RPGManager.state().activeSlots)===JSON.stringify(window._startingIds)')
   assert page.evaluate('RPGManagerProgression.replacementCandidates(RPGManager.state()).length')>=5
   page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression;P.applyWound(s,s.activeSlots[0],'test');s.roster[0].name='A Very Long Adventurer Name'}''');home()
   draws=bounds('_companions','refresh')['draws'];assert any('WOUNDED' in d['text'] for d in draws);assert any('HP ' in d['text'] for d in draws);shot('camp-roster')
   command('recruit','Scene_RPGTavern')
   assert page.evaluate('SceneManager._scene._choices._list.filter(c=>c.symbol==="view").length')>=5
   assert not page.evaluate('SceneManager._scene._choices._list.some(c=>c.symbol==="hire")');shot('tavern');home()
   # Existing saves bypass setup; keep all selected identity/stat/stock state.
   page.evaluate('''async()=>{$gameSystem.onBeforeSave();await DataManager.saveGame(17);await DataManager.loadGame(17);RPGManager.restoreSave();$gameSystem.onAfterLoad()}''');home()
   assert not page.evaluate('RPGManager.state().startingRosterPending')
   assert page.evaluate('JSON.stringify(RPGManager.state().activeSlots)===JSON.stringify(window._startingIds)')
   # Item descriptions and glyphs in actual Armory/Supplies.
   command('shop','Scene_RPGShop');page.evaluate('const s=SceneManager._scene;s._commandWindow.select(s._commandWindow._list.findIndex(c=>c.ext==="potion"));s.refreshDetails()');shot('potion-armory');home()
   page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression,n=s.roster[0];n.health=1;window._potionStock=s.supplies.potion;P.useItem(s,n.id,'potion');if(n.health!==3)throw Error('Potion must heal 2');P.useItem(s,n.id,'medkit');if(n.condition!=='Healthy')throw Error('Medkit must treat wound')}''');home()
   # Intercept optional buffers, including thrown and asynchronous failed sound loads.
   page.evaluate('''()=>{window._soundCalls=[];window._nativeBuffer=AudioManager.createBuffer;AudioManager.createBuffer=function(folder,name){if(folder==='se/'&&['Chime1','Book1','Bell2','Item1'].includes(name)){window._soundCalls.push(name);if(window._failSound==='throw')throw Error('Missing optional sound');const callbacks=[],b={isError:()=>window._failSound==='async',addStopListener(cb){callbacks.push(cb)},play(){setTimeout(()=>this.destroy(),30)},destroy(){while(callbacks.length)callbacks.shift()()}};return b}return window._nativeBuffer.call(this,folder,name)}}''')
   command('battle','Scene_RPGQuestBoard');page.evaluate('const s=SceneManager._scene;s._category="Medium";s._choices.refresh();s._choices.select(s._choices._list.findIndex(c=>c.symbol==="quest"&&c.enabled));s.chooseQuest()');scene('Scene_RPGHome')
   assert not page.evaluate('SceneManager._scene._camp.visible')
   assert page.evaluate('SceneManager._scene._teamPanel.width')==width-24
   bounds('_teamPanel','expedition');shot('active-collapsed')
   # Click the actual discoverable toggle and reverse it, then keyboard Shift.
   rect=page.evaluate('({x:SceneManager._scene._campToggle.x+60,y:SceneManager._scene._campToggle.y+18})')
   page.mouse.click(rect['x'],rect['y']);page.wait_for_timeout(200)
   assert page.evaluate('SceneManager._scene._camp.visible')
   assert page.evaluate('SceneManager._scene._teamPanel.x>SceneManager._scene._camp.x+SceneManager._scene._camp.width')
   bounds('_camp','refresh');bounds('_teamPanel','expedition');shot('active-open')
   page.mouse.click(rect['x'],rect['y']);page.wait_for_timeout(200);assert not page.evaluate('SceneManager._scene._camp.visible')
   # Visible but focus-gated MZ: interval must repaint without updating scene/input.
   page.evaluate('''()=>{window._gameActive=SceneManager.isGameActive;window._updates=0;window._clockPaints=[];const s=SceneManager._scene,update=s.update;s.update=function(){window._updates++;return update.call(this)};const b=s._teamPanel.contents,draw=b.drawText;b.drawText=function(text,...args){if(/^[0-9]+:[0-9][0-9]$/.test(String(text)))window._clockPaints.push(String(text));return draw.call(this,text,...args)};SceneManager.isGameActive=()=>false}''')
   page.wait_for_timeout(4200)
   assert page.evaluate('window._updates')==0
   assert page.evaluate('new Set(window._clockPaints).size')>=3
   bounds('_teamPanel','expedition');shot('unfocused-visible')
   # All cue kinds once at explicit authoritative boundary; redraw cannot produce sound.
   page.evaluate('''()=>{const s=RPGManager.state(),t=s.trips.A,P=RPGManagerProgression;P.queueEventCue(s,t,'battleStart','smoke-start');P.queueEventCue(s,t,'battleEnd','smoke-end');P.queueEventCue(s,t,'randomEvent','smoke-event')}''')
   page.wait_for_function('window._soundCalls.includes("Book1")&&window._soundCalls.includes("Bell2")&&window._soundCalls.includes("Item1")',timeout=8000)
   before=page.evaluate('window._soundCalls.length');page.evaluate('for(let i=0;i<10;i++)SceneManager._scene.refreshTeamPanel(false)');page.wait_for_timeout(1200);assert page.evaluate('window._soundCalls.length')==before
   # Muted cues consumed, then fail both create/playback and optional async poll safely.
   page.evaluate('''()=>{const s=RPGManager.state();s.completionAlerts=false;RPGManagerProgression.queueEventCue(s,s.trips.A,'randomEvent','muted')}''');page.wait_for_timeout(1200);assert page.evaluate('window._soundCalls.length')==before
   for mode in ['throw','async']:
    page.evaluate('''mode=>{window._failSound=mode;const s=RPGManager.state();s.completionAlerts=true;RPGManagerProgression.queueEventCue(s,s.trips.A,'randomEvent',`failure-${mode}`)}''',mode);page.wait_for_timeout(1600);page.evaluate('AudioManager.checkErrors()')
   page.evaluate('window._failSound=null')
   # Real failed audio requests for each new cue stay outside MZ's fatal cache.
   for sound in ['Book1','Bell2','Item1']:page.route(f'**/audio/se/{sound}.ogg',lambda route:route.abort())
   page.evaluate('()=>{AudioManager.createBuffer=window._nativeBuffer}')
   for kind in ['battleStart','battleEnd','randomEvent']:
    page.evaluate('''kind=>{const s=RPGManager.state();s.completionAlertError=null;RPGManagerProgression.queueEventCue(s,s.trips.A,kind,`real-failed-${kind}`)}''',kind)
    page.wait_for_function('!!RPGManager.state().completionAlertError',timeout=10000)
    page.evaluate('AudioManager.checkErrors()')
   # Hidden paints remain suppressed; settlement/results restore immediately and silently.
   page.evaluate('''()=>{const s=RPGManager.state();s.completionAlerts=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});SceneManager.isGameActive=()=>false;window._beforeHidden=window._clockPaints.length;RPGManagerProgression.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle,true)}''');page.wait_for_timeout(1200)
   assert page.evaluate('window._clockPaints.length')==page.evaluate('window._beforeHidden')
   page.evaluate('delete document.hidden;SceneManager.isGameActive=window._gameActive;window.dispatchEvent(new Event("focus"))');page.wait_for_timeout(150)
   assert page.evaluate('SceneManager._scene._teamPanel._displayCountdown')=='00:00'
   assert page.evaluate('SceneManager._scene._camp.visible');bounds('_teamPanel','expedition');shot('results')
   assert any(d['text']=='FINISH' for d in bounds('_teamPanel','expedition')['draws'])
   page.evaluate('''()=>{const s=RPGManager.state();window._frozenResult=JSON.stringify(s.questResults);window._returnGold=s.gold;s.questResults.items=[...s.questResults.items,{name:'Potion',quantity:2},{name:'Medkit',quantity:1}];s.questResults.members[0].permanentWounds=Array(12).fill('A lasting wound with a long description');window._frozenResult=JSON.stringify(s.questResults)}''');home()
   pages=page.evaluate('SceneManager._scene._teamPanel._resultPages')
   for i in range(pages):page.evaluate('i=>{SceneManager._scene._teamPanel._resultPage=i}',i);bounds('_teamPanel','expedition')
   shot('results-details')
   page.evaluate('''async()=>{$gameSystem.onBeforeSave();await DataManager.saveGame(18);await DataManager.loadGame(18);RPGManager.restoreSave();$gameSystem.onAfterLoad()}''');home()
   assert page.evaluate('JSON.stringify(RPGManager.state().questResults)===window._frozenResult')
   page.evaluate('SceneManager._scene._teamPanel._recallHandler()');scene('Scene_RPGHome')
   assert page.evaluate('RPGManager.state().questResults') is None
   assert page.evaluate('RPGManager.state().gold')==page.evaluate('window._returnGold')
   # Missing portrait and walking sheets produce fallback glyphs without fatal loads.
   page.route('**/MissingPlaytestFace.webp',lambda route:route.abort())
   page.evaluate('RPGManager.state().roster[0].portrait.sheet="MissingPlaytestFace"');home();page.wait_for_timeout(1100)
   assert page.evaluate('ImageManager.isReady()')
   shot('missing-portrait');command('campJobs','Scene_RPGCampJobs');page.wait_for_timeout(1100)
   assert page.evaluate('ImageManager.isReady()');home()
   assert not errors,errors
   print(f'PASS: {width}x{height} onboarding, choices, roster, layout toggle, items, results, save/load, cues/failures, visible unfocused and hidden clock.',flush=True)
   page.close()
  browser.close()
finally:server.shutdown();server.server_close()
