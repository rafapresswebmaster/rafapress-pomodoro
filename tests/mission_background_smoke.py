"""Actual MZ focus pause, timer throttling/offline recovery and walking travel renderer."""
import functools
import threading
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
        page.evaluate('SceneManager._scene.commandNewGame()'); page.wait_for_function('SceneManager._scene?.constructor.name==="Scene_RPGStartingRoster"&&SceneManager._scene.isStarted()'); page.evaluate('()=>{const s=SceneManager._scene;s._selected=["ada","bram","cora"];s.startParty()}');page.locator('form button[type=submit]').click();scene('Scene_RPGHome')
        page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression,q=RPGManager.quests().find(q=>q.id==='goblin_tracks');s.teams.A=s.roster.slice(0,2).map(n=>n.id);P.assignCampJob(s,s.roster[2].id,'work');P.dispatchQuest(s,'A',q,$dataRPGManagerQuests.xp,Date.now(),null,'standard',s.teams.A[0],q.durationMinutes);window._homeClass=SceneManager._scene.constructor;SceneManager.goto(window._homeClass)}''');scene('Scene_RPGHome')
        # Record real sprite sheet source frames without changing the renderer.
        page.evaluate('''()=>{const panel=SceneManager._scene._teamPanel,original=panel.contents.blt;window._travelFrames=[];panel.contents.blt=function(bitmap,sx,sy,sw,sh,...rest){if(sw===48&&sh===48)window._travelFrames.push(sx);return original.call(this,bitmap,sx,sy,sw,sh,...rest)};const ctx=panel.contents.context,draw=ctx.drawImage;ctx.drawImage=function(image,sx,sy,sw,sh,...rest){if(sw===48&&sh===48)window._travelFrames.push(sx);return draw.call(this,image,sx,sy,sw,sh,...rest)}}''')
        page.wait_for_timeout(700)
        assert page.evaluate('new Set(window._travelFrames).size>=3'), 'Walking sprite frames did not change'
        page.screenshot(path=str(ROOT/'tests/visuals/mission-travel.webp'))
        before=page.evaluate('''()=>{window._originalActive=SceneManager.isGameActive;SceneManager.isGameActive=()=>false;return{remaining:RPGManager.state().trips.A.remainingMs,time:Date.now()}}''')
        page.wait_for_timeout(6500)
        after=page.evaluate('({remaining:RPGManager.state().trips.A.remainingMs,time:Date.now()})')
        assert before['remaining']-after['remaining']>=5500,(before,after)
        assert abs((before['remaining']-after['remaining'])-(after['time']-before['time']))<1600,(before,after)
        page.evaluate('SceneManager.isGameActive=window._originalActive;window.dispatchEvent(new Event("focus"))')
        # Reopening a saved game resets runtime anchors even if calendar time changed.
        saved=page.evaluate("""async()=>{$gameSystem.onBeforeSave();await DataManager.saveGame(1);const saved=(await StorageManager.loadObject(DataManager.makeSavename(1))).system._rpgManager;return{gold:saved.gold,remaining:saved.trips.A.remainingMs,jobs:JSON.stringify(saved.campJobElapsed),recruitRemaining:saved.recruit.remainingSessionMs}}""")
        report=page.evaluate("""async()=>{SceneManager.stop();window._nativeNow=Date.now;Date.now=()=>window._nativeNow()+86400000;await DataManager.loadGame(1);RPGManager.restoreSave();$gameSystem.onAfterLoad();return {remaining:RPGManager.state().trips.A.remainingMs,history:RPGManager.state().questHistory.length,gold:RPGManager.state().gold,jobs:JSON.stringify(RPGManager.state().campJobElapsed),recruitRemaining:RPGManager.state().recruit.deadlineMs-Date.now()}}""")
        assert report['remaining']==saved['remaining'] and report['history']==0,report
        assert report['gold']==saved['gold'] and report['jobs']==saved['jobs'],report
        assert abs(report['recruitRemaining']-saved['recruitRemaining'])<1000,report
        page.evaluate('Date.now=window._nativeNow;SceneManager.resume();SceneManager.goto(window._homeClass)');scene('Scene_RPGHome')
        page.wait_for_timeout(1200)
        assert page.evaluate('RPGManager.state().trips.A.remainingMs')<saved['remaining']
        page.screenshot(path=str(ROOT/'tests/visuals/mission-resumed-session.webp'))
        assert not errors,errors
        print('PASS: animated walking travel, focus-gated scenes paused while missions advance, closed-time pause for missions/jobs, and resumed session progress.')
        browser.close()
finally:server.shutdown()
