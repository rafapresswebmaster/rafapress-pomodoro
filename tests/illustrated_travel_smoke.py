"""Real MZ illustrated walking/return, under-character counters and focus-safe motion."""
import functools,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests'/'visuals';OUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for width,height in [(816,624),(1280,720)]:
   page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def scene(name):page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name)
   def shot(name):page.screenshot(path=str(OUT/f'travel-{width}-{name}.webp'))
   def bounds():
    report=page.evaluate('''()=>{const s=SceneManager._scene,w=s._teamPanel,b=w.contents,orig=b.drawText,draws=[];b.drawText=function(text,x,y,width,height,align){draws.push({text,x,y,width,height});return orig.call(this,text,x,y,width,height,align)};try{s.refreshTeamPanel(false)}finally{b.drawText=orig}return{w:w.innerWidth,h:w.innerHeight,draws,error:w._travelRenderError||null,members:w._travelStage.lastMembers}}''')
    assert report['error'] is None,report
    for d in report['draws']:
     assert d['x']>=0 and d['x']+d['width']<=report['w']+1,d
     assert d['y']>=0 and d['y']+d['height']<=report['h']+1,d
    assert sum(d['text'].startswith('HP ') and d['text'][3:4].isdigit() for d in report['draws'])==3
    assert sum(d['text'].startswith('Armor ') for d in report['draws'])==3
    assert sum(d['text'].startswith('Ward ') for d in report['draws'])==3
    return report
   page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title')
   page.evaluate('''({width,height})=>{Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;SceneManager._scene.commandNewGame()}''',{'width':width,'height':height});scene('Scene_RPGStartingRoster')
   page.evaluate('()=>{const s=SceneManager._scene;s._selected=["ada","bram","cora"];s.startParty()}');page.locator('form button[type=submit]').click();scene('Scene_RPGHome')
   page.evaluate('''()=>{window._travelHome=SceneManager._scene.constructor;const s=RPGManager.state(),P=RPGManagerProgression;s.completionAlerts=false;s.equipmentStock.chainmail=1;P.equipSlot(s,'ada','chainmail','body');s.roster[0].equipmentCondition.chainmail.current=1;s.roster[0].temporaryWard=2;P.dispatchQuest(s,'A',RPGManager.quests().find(q=>q.id==='goblin_tracks'),$dataRPGManagerQuests.xp,Date.now());SceneManager.goto(window._travelHome)}''');scene('Scene_RPGHome')
   page.wait_for_function('SceneManager._scene._teamPanel._travelStage?.backgroundBuilds>0')
   report=bounds();assert report['members'][0]['armor']==page.evaluate('RPGManager.state().roster.find(n=>n.id===RPGManager.state().trips.A.preparedTeam[0].id).classArmor')+1;assert report['members'][0]['ward']==2
   before=page.evaluate('SceneManager._scene._teamPanel._travelStage.scroll');page.wait_for_timeout(500);assert page.evaluate('SceneManager._scene._teamPanel._travelStage.scroll')>before
   shot('outbound')
   page.evaluate('SceneManager._scene._campOpen=true;SceneManager._scene.layoutExpedition()');bounds();shot('roster-open')
   # HP/defense counters reflect live state, without a stale battle snapshot or implicit repair.
   page.evaluate('RPGManager.state().roster[0].health=2');report=bounds();assert report['members'][0]['health']==2 and report['members'][0]['armor']==page.evaluate('RPGManager.state().roster.find(n=>n.id===RPGManager.state().trips.A.preparedTeam[0].id).classArmor')+1;shot('injured-counters')
   # Visible focus-gated clock still paints, while walking/parallax stay frozen.
   frozen=page.evaluate('''()=>{window._normalActive=SceneManager.isGameActive;SceneManager.isGameActive=()=>false;const w=SceneManager._scene._teamPanel;return{scroll:w._travelStage.scroll,walk:w._travelStage.walkTime,remaining:RPGManager.state().trips.A.remainingMs}}''')
   page.wait_for_timeout(3300)
   after=page.evaluate('({scroll:SceneManager._scene._teamPanel._travelStage.scroll,walk:SceneManager._scene._teamPanel._travelStage.walkTime,remaining:RPGManager.state().trips.A.remainingMs})')
   assert after['scroll']==frozen['scroll'] and after['walk']==frozen['walk'],(frozen,after)
   assert after['remaining']<frozen['remaining'];bounds();shot('unfocused-clock')
   page.evaluate('SceneManager.isGameActive=window._normalActive;window.dispatchEvent(new Event("focus"))')
   # Save/load remains session-only and displays the same current party values.
   page.evaluate('''async()=>{$gameSystem.onBeforeSave();await DataManager.saveGame(27);await DataManager.loadGame(27);RPGManager.restoreSave();$gameSystem.onAfterLoad();SceneManager.goto(window._travelHome)}''');scene('Scene_RPGHome');bounds();shot('saved-resume')
   # Actual progression enters return; empty the visual queue, never reroll a battle.
   page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression;for(let i=0;i<4;i++)P.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);P.tickPresentation(s.trips.A,1,'skip',$dataRPGManagerQuests.presentation);SceneManager._scene.refreshTeamPanel(false);window._returnScroll=SceneManager._scene._teamPanel._travelStage.scroll}''')
   page.wait_for_function('SceneManager._scene._teamPanel._travelStage.scroll<window._returnScroll',timeout=8000);bounds();shot('return')
   # Reuse cavern metadata on a copied visual trip, preserving the active domain trip.
   page.evaluate('''()=>{const w=SceneManager._scene._teamPanel,t=JSON.parse(JSON.stringify(RPGManager.state().trips.A));t.questId='black_gate';w.contents.clear();w.drawSessionClock(t.remainingMs,'Running','Crypt trail',.5,'Return');w.drawTravel(t)}''');shot('cavern')
   # Missing optional art falls back to safe silhouettes/procedural stage.
   page.evaluate('''()=>{const w=SceneManager._scene._teamPanel;window._normalArt=w._travelStage.api.art;w._travelStage.api.art=()=>({isReady:()=>false});w._travelStage.cacheKey=null;SceneManager._scene.refreshTeamPanel(false)}''');bounds();shot('missing-art')
   page.evaluate('()=>{SceneManager._scene._teamPanel._travelStage.api.art=window._normalArt}')
   page.evaluate('RPGManagerProgression.debugAdvanceExpedition(RPGManager.state(),$dataRPGManagerQuests,RPGManagerBattle.Battle,true);SceneManager._scene.refreshTeamPanel(false)')
   assert page.evaluate('!!RPGManager.state().questResults');assert page.evaluate('SceneManager._scene._teamPanel._travelStage.lastFrame') is None
   assert not errors,errors
   print(f'PASS {width}x{height}: illustrated outbound/return/cavern, live HP/Armor/Ward below all travelers, roster bounds, focus freeze/clock, save/load and art fallback.',flush=True)
   page.close()
  browser.close()
finally:server.shutdown();server.server_close()
