"""Current post-sprint browser smoke; isolated save storage, actual MZ windows."""
import functools, threading
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
    page=browser.new_page(viewport={'width':816,'height':624});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    def scene(name):page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name)
    page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title')
    page.evaluate('SceneManager._scene.commandNewGame()'); page.wait_for_function('SceneManager._scene?.constructor.name==="Scene_RPGStartingRoster"&&SceneManager._scene.isStarted()'); page.evaluate('()=>{const s=SceneManager._scene;s._selected=["ada","bram","cora"];s.startParty()}');scene('Scene_RPGHome')
    assert not any(e in page.evaluate('SceneManager._scene._commandWindow._list.map(c=>c.symbol)') for e in ['report','history'])
    before=page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression;const [a,b,c]=s.roster;P.assignCampJob(s,a.id,'work');P.assignCampJob(s,b.id,'study');P.assignCampJob(s,c.id,'rest');c.health=1;s.campJobElapsed[a.id]={productionVersion:1,work:59000};s.campJobElapsed[b.id]={productionVersion:1,study:299000};s.campJobElapsed[c.id]={productionVersion:1,rest:59000};return{gold:s.gold,arcana:s.arcana}}''')
    page.wait_for_function("({gold,arcana})=>RPGManager.state().gold>=gold+1&&RPGManager.state().arcana>=arcana+1&&RPGManager.state().roster[2].health===RPGManager.state().roster[2].maxHealth",arg=before)
    assert page.evaluate('RPGManager.state().gold')==before['gold']+1
    assert page.evaluate('RPGManager.state().arcana')==before['arcana']+1
    assert page.evaluate('RPGManager.state().roster[2].health===RPGManager.state().roster[2].maxHealth')
    page.evaluate('SceneManager._scene._commandWindow.callHandler("battle")');scene('Scene_RPGQuestBoard')
    for category in ['Short','Medium','Long']:
      ids=page.evaluate('''category=>{const s=SceneManager._scene;s._choices.select(s._choices._list.findIndex(c=>c.ext===category));s._choices.callHandler('filter');return s._choices._list.filter(c=>c.symbol==='quest').map(c=>c.ext)}''',category)
      assert ids
    page.evaluate('SceneManager.pop()');scene('Scene_RPGHome')
    page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression;s.campaignStats.questsCompleted=5;const q=RPGManager.quests().find(q=>q.boss);s.teams.A=s.roster.map(n=>n.id);P.dispatchQuest(s,'A',q,$dataRPGManagerQuests.xp,Date.now(),null,'standard',s.teams.A[0],q.durationMinutes);SceneManager.goto(SceneManager._scene.constructor);}''');scene('Scene_RPGHome')
    page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression;for(let i=0;i<3;i++)P.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);P.tickRealtimeExpedition(s,1,$dataRPGManagerQuests,RPGManagerBattle.Battle)}''')
    page.wait_for_timeout(400)
    page.screenshot(path=str(ROOT/'tests/post-sprint-battle.webp'))
    assert page.evaluate('RPGManager.state().trips.A.presentationFighters.some(f=>f.side==="enemy")')
    # Render a copied authoritative attack at impact without consuming or changing replay state.
    page.evaluate('''()=>{const panel=SceneManager._scene._teamPanel,trip=RPGManager.state().trips.A;
      const visual=JSON.parse(JSON.stringify(trip)),attack=visual.presentationQueue.find(e=>e.sourceType==='attack');
      if(!attack)throw new Error('Expected a complete attack queue');
      visual.presentationCurrent=attack;visual.presentationDurationMs=2000;visual.presentationHoldMs=800;
      panel._polishOriginalDraw=panel.drawBattle;
      panel.drawBattle=function(){const before=JSON.stringify(visual);this._polishOriginalDraw(visual);if(before!==JSON.stringify(visual))throw new Error('Renderer mutated presentation');};
    }''')
    page.wait_for_timeout(120)
    page.screenshot(path=str(ROOT/'tests/quest-window-polish-impact.webp'))
    page.evaluate('''()=>{const panel=SceneManager._scene._teamPanel;panel.drawBattle=panel._polishOriginalDraw;delete panel._polishOriginalDraw;}''')
    page.evaluate('''async()=>{$gameSystem.onBeforeSave();await DataManager.saveGame(1);await DataManager.loadGame(1);RPGManager.restoreSave();$gameSystem.onAfterLoad();}''')
    assert page.evaluate('RPGManager.state().trips.A.presentationFighters.length>0')
    page.evaluate('RPGManagerProgression.debugAdvanceExpedition(RPGManager.state(),$dataRPGManagerQuests,RPGManagerBattle.Battle,true)')
    assert page.evaluate('RPGManager.state().trips.A===null')
    assert page.evaluate('RPGManager.state().questResults.members.length===3')
    assert page.evaluate('SceneManager._scene._teamPanel!==undefined')
    page.evaluate('RPGManagerProgression.tickPresentation(RPGManager.state().expeditionReplay,5000,"skip",$dataRPGManagerQuests.presentation)')
    page.wait_for_timeout(150)
    assert page.evaluate('RPGManager.state().expeditionReplay.presentationCurrent===null&&RPGManager.state().questResults!==null')
    page.screenshot(path=str(ROOT/'tests/post-sprint-completion.webp'))
    assert page.evaluate('SceneManager._scene._commandWindow.maxPageRows()*SceneManager._scene._commandWindow.maxCols()>=SceneManager._scene._commandWindow.maxItems()')
    assert not errors,errors
    print('PASS: quest filters, removed navigation, boss replay, save/load presentation, settled Quest Results; no page errors.')
    browser.close()
finally:server.shutdown()
