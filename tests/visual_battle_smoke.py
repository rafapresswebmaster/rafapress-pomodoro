"""Real MZ embedded battle stage, art/effects, lifecycle, saved cursor and safe fallbacks."""
import functools,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUTPUT=ROOT/'tests'/'visuals';OUTPUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for width,height in [(816,624),(1280,720)]:
   page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def scene(name):
    try:page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name,timeout=20000)
    except Exception:
     print('Scene failure',name,errors,page.evaluate('document.body.innerText'),flush=True);raise
   def shot(name):page.screenshot(path=str(OUTPUT/f'battle-{width}-{name}.webp'))
   def home():page.evaluate('SceneManager.goto(window._battleHome)');scene('Scene_RPGHome')
   def draw(event,t=.5,boss=False):
    result=page.evaluate('''({event,t,boss})=>{
     const panel=SceneManager._scene._teamPanel,trip=window._battleFixture;trip.presentationCurrent=event;trip.presentationHoldMs=2000*(1-t);trip.presentationDurationMs=2000;trip.boss=boss;trip.questId=boss?'black_gate':'goblin_tracks';
     const before=JSON.stringify(trip),b=panel.contents,orig=b.drawText,draws=[];
     b.drawText=function(text,x,y,width,height,align){draws.push({text,x,y,width,height});return orig.call(this,text,x,y,width,height,align)};
     try{SceneManager._scene.refreshTeamPanel(false)}finally{b.drawText=orig}
     if(JSON.stringify(trip)!==before)throw Error('Renderer mutated copied event/trip');
     const stage=panel._battleStage;return{w:panel.innerWidth,h:panel.innerHeight,draws,error:panel._battleRenderError||null,kind:stage?.lastFrame?.kind,effects:stage?.lastFrame?.effects.map(e=>e.type),backgroundBuilds:stage?.backgroundBuilds};
    }''',{'event':event,'t':t,'boss':boss})
    assert result['error'] is None,result
    for d in result['draws']:
     assert d['x']>=0 and d['x']+d['width']<=result['w']+1,d
     assert d['y']>=0 and d['y']+d['height']<=result['h']+1,d
    return result
   page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title')
   page.evaluate('''({width,height})=>{Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;SceneManager._scene.commandNewGame()}''',{'width':width,'height':height});scene('Scene_RPGStartingRoster')
   page.evaluate('()=>{const s=SceneManager._scene;s._selected=["ada","bram","cora"];s.startParty()}');page.locator('form button[type=submit]').click();scene('Scene_RPGHome')
   page.evaluate('''()=>{
    window._battleHome=SceneManager._scene.constructor;window._normalActive=SceneManager.isGameActive;SceneManager.isGameActive=()=>false;
    const s=RPGManager.state(),P=RPGManagerProgression;s.completionAlerts=false;const q=RPGManager.quests().find(q=>q.id==='goblin_tracks');P.dispatchQuest(s,'A',q,$dataRPGManagerQuests.xp,Date.now());
    P.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);P.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);P.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);
    const trip=s.trips.A;window._originalSequence=JSON.parse(JSON.stringify(trip.presentationQueue));
    P.consumeEventCues(s);SceneManager.goto(window._battleHome);
   }''');scene('Scene_RPGHome')
   page.evaluate('''()=>{
    const panel=SceneManager._scene._teamPanel,trip=RPGManager.state().trips.A;
    window._battleFixture=JSON.parse(JSON.stringify(trip));
    window._battleFixture.presentationFighters=[...RPGManagerProgression.activeRoster(RPGManager.state()).map((n,i)=>({...JSON.parse(JSON.stringify(n)),key:`player:${i}`,side:'player',health:5,maxHealth:5,armor:2,ward:1})),...Array.from({length:5},(_,i)=>({key:`enemy:${i}`,id:['goblin_1','skeleton_1','dire_wolf_1','orc_1','necromancer'][i],side:'enemy',name:['Goblin','Skeleton Archer','Dire Wolf','Orc','Necrommancer'][i],health:5,maxHealth:5,armor:2,ward:1,portrait:{sheet:'RPGManagerMonsters',index:i%3,columns:3,rows:1}}))];
    window._realBattleDraw=panel.drawBattle;panel.drawBattle=function(){return window._realBattleDraw.call(this,window._battleFixture)};
   }''')
   opening={'kind':'battle','trigger':'BATTLE_START','text':'The parties close for battle.'}
   draw(opening,.25)
   page.wait_for_function('''()=>{const s=SceneManager._scene._teamPanel._battleStage;return Object.values(RPGManagerBattleStage.ART).every(name=>s.api.art('pictures',name).isReady())}''',timeout=20000)
   draw(opening,.25);shot('opening')
   attack={'kind':'battle','sourceType':'attack','actorKey':'player:0','targetKey':'enemy:1','action':'Sword Strike','attackKind':'basic','text':'Ada strikes the Skeleton Archer: 1 Ward absorbed, 1 Armor absorbed, 1 HP damage.','wardLoss':1,'armorLoss':1,'damage':1,'targetWard':0,'targetArmor':1,'targetHealth':4}
   result=draw(attack,.65);assert result['kind']=='attack' and 'hp' in result['effects'];shot('attack-impact')
   ward=draw(attack,.48);assert 'ward' in ward['effects'];shot('ward')
   armor=draw(attack,.58);assert 'armor' in armor['effects']
   signature={**attack,'actorKey':'player:2','action':'Arcane Volley','attackKind':'signature','importance':'SIGNATURE','text':'Cora sends a bright arcane volley toward the Skeleton Archer.'}
   result=draw(signature,.38);assert result['kind']=='signature' and 'projectile' in result['effects'];shot('signature')
   miss={**attack,'missed':True,'damage':0,'wardLoss':0,'armorLoss':0,'targetHealth':5,'targetArmor':2,'targetWard':1,'text':'The Skeleton Archer dodges Ada: no damage.'}
   result=draw(miss,.6);assert result['kind']=='miss' and 'miss' in result['effects'];assert 'hp' not in result['effects'];shot('miss')
   for source,extra,expected in [('defeat',{},'fall'),('deathSave',{'survived':True},'deathSave'),('deathSave',{'survived':False,'permanentDeath':True},'death')]:
    result=draw({'kind':'battle','sourceType':source,'targetKey':'player:1','text':expected,**extra},.75);assert result['kind']==expected;shot(expected)
   draw({'kind':'battle','sourceType':'defeat','targetKey':'enemy:0','text':'Goblin falls.'},.7);shot('enemy-fall')
   draw({'kind':'battle','sourceType':'round','text':'Round 2.'},.4);shot('round')
   draw({'kind':'travel','sourceType':'result','text':'Encounter victory.'},.5);shot('battle-end')
   draw({'kind':'battle','trigger':'BOSS_START','text':'A boss encounter begins.'},.25,True);shot('boss-opening')
   draw({**signature,'actorKey':'enemy:4','targetKey':'player:0','text':'The Necrommancer casts a rune.'},.65,True);shot('boss-impact')
   # Open roster during combat; all status/clock/captions stay within their reserved region.
   page.evaluate('SceneManager._scene._campOpen=true;SceneManager._scene.layoutExpedition()');result=draw(signature,.65,True);assert result['w']<width-24;shot('roster-open')
   assert page.evaluate('SceneManager._scene._camp.visible')
   page.evaluate('SceneManager._scene._campOpen=false;SceneManager._scene.layoutExpedition()')
   # Reduced/Skip only change the existing playback timer; the renderer never consumes an event.
   page.evaluate('''()=>{
    const q=window._originalSequence,P=RPGManagerProgression,config=$dataRPGManagerQuests.presentation;
    window._expectedTypes=q.filter(e=>e.sourceType).map(e=>e.sourceType);
    for(const speed of ['standard','reduced','skip']){
     const t={presentationQueue:JSON.parse(JSON.stringify(q)),presentationFighters:[]},seen=[];
     if(speed==='skip'){P.tickPresentation(t,1,speed,config);if(t.presentationQueue.length||t.presentationCurrent)throw Error('Skip failed cleanup');}
     else{let guard=0;while((t.presentationQueue.length||t.presentationCurrent)&&guard++<5000){P.tickPresentation(t,t.presentationCurrent?Math.max(1,t.presentationHoldMs):1,speed,config);if(t.presentationCurrent?.sourceType)seen.push(t.presentationCurrent.sourceType)}if(JSON.stringify(seen)!==JSON.stringify(window._expectedTypes))throw Error('Dropped/repeated structured event');}
    }
   }''')
   # Force a renderer exception: legacy usable fallback, then recovery on a new event.
   page.evaluate('()=>{SceneManager._scene._teamPanel._battleStage.render=()=>{throw Error("Deliberate renderer failure")}}')
   failure=page.evaluate('()=>{SceneManager._scene.refreshTeamPanel(false);return SceneManager._scene._teamPanel._battleRenderError}')
   assert failure=='Deliberate renderer failure'
   page.evaluate('SceneManager._scene._teamPanel._battleRenderError=null');draw(signature,.5)
   # Restore the actual queue and save mid-action, observing the load state atomically.
   page.evaluate('''()=>{
    const panel=SceneManager._scene._teamPanel;panel.drawBattle=window._realBattleDraw;
    const t=RPGManager.state().trips.A,q=window._originalSequence,i=q.findIndex(e=>e.sourceType==='attack');
    t.presentationCurrent=JSON.parse(JSON.stringify(q[i]));t.presentationFighters=JSON.parse(JSON.stringify(q.find(e=>e.fighters).fighters));t.presentationQueue=JSON.parse(JSON.stringify(q.slice(i+1)));t.presentationDurationMs=2000;t.presentationHoldMs=700;
    window._savedCursor={event:JSON.stringify(t.presentationCurrent),queue:JSON.stringify(t.presentationQueue),hold:t.presentationHoldMs,gold:RPGManager.state().gold};
   }''')
   report=page.evaluate('''async()=>{$gameSystem.onBeforeSave();await DataManager.saveGame(23);await DataManager.loadGame(23);RPGManager.restoreSave();$gameSystem.onAfterLoad();const t=RPGManager.state().trips.A;return {event:JSON.stringify(t.presentationCurrent),queue:JSON.stringify(t.presentationQueue),hold:t.presentationHoldMs,gold:RPGManager.state().gold}}''')
   assert report==page.evaluate('window._savedCursor'),report
   home();page.evaluate('SceneManager._scene.refreshTeamPanel(false)')
   assert abs(page.evaluate('SceneManager._scene._teamPanel._battleStage.lastFrame.t')-.65)<.001
   shot('saved-resume')
   # Arrival still settles immediately, clears transient animations and keeps saved results stable.
   page.evaluate('RPGManagerProgression.debugAdvanceExpedition(RPGManager.state(),$dataRPGManagerQuests,RPGManagerBattle.Battle,true);SceneManager._scene.refreshTeamPanel(false)')
   assert page.evaluate('SceneManager._scene._teamPanel._displayCountdown')=='00:00'
   assert page.evaluate('SceneManager._scene._teamPanel._battleStage.animator.effects.length')==0
   shot('results');page.evaluate('SceneManager.isGameActive=window._normalActive;SceneManager._scene._teamPanel._recallHandler()');scene('Scene_RPGHome')
   assert page.evaluate('RPGManager.state().questResults') is None
   assert not errors,errors
   print(f'PASS {width}x{height}: art, 3v5, opening/basic/signature/miss/defenses/fall/save/death/round/end/boss, roster bounds, sequence/speed, renderer fallback and saved cursor/results.',flush=True)
   page.close()
  # Independent context: corrupt every custom image and fail optional battle sheets.
  page=browser.new_page(viewport={'width':816,'height':624});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('**/Battle*_v1.webp',lambda route:route.fulfill(status=200,content_type='image/png',body='corrupt optional image'))
  page.route('**/sv_actors/**',lambda route:route.abort())
  page.route('**/characters/**',lambda route:route.abort())
  page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title')
  page.evaluate('SceneManager._scene.commandNewGame()');scene('Scene_RPGStartingRoster')
  page.evaluate('()=>{const s=SceneManager._scene;s._selected=["ada","bram","cora"];s.startParty()}');page.locator('form button[type=submit]').click();scene('Scene_RPGHome')
  page.evaluate('''()=>{window._battleHome=SceneManager._scene.constructor;const s=RPGManager.state(),P=RPGManagerProgression;s.completionAlerts=false;const q=RPGManager.quests().find(q=>q.id==='goblin_tracks');P.dispatchQuest(s,'A',q,$dataRPGManagerQuests.xp,Date.now());P.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);P.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);P.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);const t=s.trips.A;P.tickPresentation(t,5000,'standard',$dataRPGManagerQuests.presentation);SceneManager.goto(window._battleHome)}''');scene('Scene_RPGHome')
  page.wait_for_timeout(1300)
  assert page.evaluate('ImageManager.isReady()');assert page.evaluate('SceneManager._scene._teamPanel._battleStage!==null')
  page.screenshot(path=str(OUTPUT/'battle-missing-corrupt-art.webp'))
  page.evaluate('RPGManagerProgression.debugAdvanceExpedition(RPGManager.state(),$dataRPGManagerQuests,RPGManagerBattle.Battle,true)')
  page.wait_for_timeout(150);assert page.evaluate('!!RPGManager.state().questResults');assert not errors,errors
  print('PASS: corrupt custom backdrops/atlas and failed side-view/walking sheets retain usable battle/settlement with zero page errors.',flush=True)
  browser.close()
finally:server.shutdown();server.server_close()
