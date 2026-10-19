import functools,threading,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start();results=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for width,height in [(816,624),(1280,720)]:
   page=browser.new_page(viewport={'width':width,'height':height});page.set_default_timeout(20000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def scene(name):page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name)
   def shot(name):page.screenshot(path=str(ROOT/f'tests/visuals/focus-sprint-{width}-{name}.webp'))
   page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title');page.evaluate('SceneManager._scene.commandNewGame()');scene('Scene_RPGStartingRoster')
   page.evaluate("""()=>{const scene=SceneManager._scene;scene._drafts=[['knight','male','Knight'],['cleric','female','Cleric'],['mage','male','Mage']].map(([classId,sex,name])=>({classId,sex,name,portraitKey:RPGManagerProgression.portraitOptions(classId,sex)[0].key}));scene._step='review';scene.showCreator();}""")
   page.get_by_role('button',name='Confirm party and enter camp',exact=True).evaluate('(el)=>el.click()');scene('Scene_RPGHome');assert page.get_by_role('button',name='Scroll down',exact=True).count()==0;page.evaluate('({width,height})=>{window._homeClass=SceneManager._scene.constructor;Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;SceneManager.goto(window._homeClass);}',{'width':width,'height':height});scene('Scene_RPGHome')
   page.evaluate("""()=>{const s=RPGManager.state(),P=RPGManagerProgression,n=P.activeRoster(s)[0];n.health=1;s.gold=1000;P.purchase(s,'life_giving_amulet');SceneManager._scene.openMember(n.id);SceneManager._scene._sheetTab='Gear';SceneManager._scene.drawCampSheet();}""")
   page.get_by_label('accessory',exact=True).select_option('life_giving_amulet')
   text=page.locator('#camp-member-sheet').inner_text();assert 'HP 1/' in text and 'Armor' in text and 'Ward' in text,text
   page.evaluate("SceneManager._scene.openMember(RPGManagerProgression.activeRoster(RPGManager.state())[1].id)")
   assert page.get_by_role('button',name='Gear',exact=True).get_attribute('aria-pressed')=='true'
   shot('gear')
   box=page.locator('#camp-member-sheet').bounding_box();assert box['y']+box['height']<=height,box
   assert page.locator('#camp-member-sheet').evaluate("(el)=>getComputedStyle(el).overflowY==='auto'"), 'Gear controls must remain scrollable'
   page.get_by_role('button',name='Back to camp',exact=True).click()
   page.get_by_role('button',name='Altar',exact=True).evaluate('(el)=>el.click()');scene('Scene_RPGAltar')
   costs=page.evaluate("SceneManager._scene.entries().filter(e=>e.symbol==='ritual').map(e=>RPGManagerProgression.RITUALS[e.ext].castCost)")
   assert costs==sorted(costs),costs
   shot('altar');page.evaluate('SceneManager.goto(window._homeClass)');scene('Scene_RPGHome')
   # Intercept the optional audio boundary: no disk save or native device dependency.
   page.evaluate("""()=>{window._sounds=[];window._buffers=[];AudioManager.createBuffer=function(folder,name){window._sounds.push(name);const b={isError:()=>false,addStopListener(cb){this.done=cb},play(){if(window._audioFail)throw Error('Synthetic audio failure');setTimeout(()=>this.done?.(),60)},destroy(){}};window._buffers.push(b);return b;};AudioManager.updateSeParameters=()=>{};window._cueTrip={id:'audio',eventCueKeys:{}};RPGManagerProgression.queueEventCue(RPGManager.state(),window._cueTrip,'battleVictory','battle:1:victory');}""")
   page.wait_for_timeout(1400);assert page.evaluate("window._sounds.filter(n=>n==='Bell3').length")==1
   page.evaluate("RPGManagerProgression.queueEventCue(RPGManager.state(),JSON.parse(JSON.stringify(window._cueTrip)),'battleVictory','battle:1:victory')")
   page.wait_for_timeout(1100);assert page.evaluate("window._sounds.filter(n=>n==='Bell3').length")==1
   page.evaluate("RPGManager.state().completionAlerts=false;RPGManagerProgression.queueEventCue(RPGManager.state(),window._cueTrip,'battleVictory','battle:2:victory')")
   page.wait_for_timeout(1100);assert page.evaluate("window._sounds.filter(n=>n==='Bell3').length")==1
   page.evaluate("window._audioFail=true;RPGManager.state().completionAlerts=true;RPGManagerProgression.queueEventCue(RPGManager.state(),window._cueTrip,'battleVictory','battle:3:victory')")
   page.wait_for_timeout(1100);assert page.evaluate("RPGManager.state().completionAlertError.includes('Synthetic audio failure')")
   page.evaluate("""()=>{window._audioFail=false;const s=RPGManager.state(),P=RPGManagerProgression;P.queueEventCue(s,window._cueTrip,'battleVictory','battle:4:victory');s.completionCue={questId:'synthetic-completion',pending:true};}""")
   page.wait_for_timeout(1100);assert page.evaluate("window._sounds.at(-1)")=='Chime1'
   page.evaluate("""()=>{const s=RPGManager.state(),P=RPGManagerProgression;P.activeRoster(s).forEach(n=>{n.level=8;P.ensureLife(n);n.health=n.maxHealth;});P.dispatchQuest(s,'A',RPGManager.quests().find(q=>q.id==='fantasy_14'),$dataRPGManagerQuests.xp,1000);SceneManager.goto(window._homeClass);}""");scene('Scene_RPGHome')
   page.evaluate("""()=>{const s=RPGManager.state(),t=s.trips.A;window._trip=t;for(let i=0;i<60&&!t.presentationFighters?.length;i++)RPGManagerProgression.tickRealtimeExpedition(s,1000,$dataRPGManagerQuests,RPGManagerBattle.Battle,false,false);}""")
   page.wait_for_timeout(1800);shot('battle');assert not page.evaluate('SceneManager._scene._teamPanel._battleRenderError||null')
   page.evaluate("""()=>{const t=window._trip;RPGManagerProgression.finishBattlePlayback(t,'test');t.elapsedMs=t.totalDurationMs/2;t.remainingMs=t.totalDurationMs-t.elapsedMs;t.phase='campfire';t.campfireStarted=true;t.campfireUntilMs=t.elapsedMs+60000;}""")
   page.wait_for_timeout(500);shot('campfire')
   page.evaluate("RPGManagerProgression.debugAdvanceExpedition(RPGManager.state(),$dataRPGManagerQuests,RPGManagerBattle.Battle,true)")
   page.wait_for_selector('#finish-recap');shot('recap')
   assert not errors,errors
   results.append({'viewport':[width,height],'passed':True,'audio':'mocked optional buffer: dedupe, Alerts, failure, completion priority','errors':errors});page.close()
  browser.close()
finally:server.shutdown()
(ROOT/'docs/visual-focus-sprint/browser.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results))
