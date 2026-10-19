import functools, threading, sys
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width':1280,'height':720} if '--wide' in sys.argv else {'width':816,'height':624})
        page.set_default_timeout(10000)
        def scene(name):
            page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()', arg=name)
        page.goto(f'http://127.0.0.1:{server.server_port}/')
        scene('Scene_Title')
        page.evaluate('SceneManager._scene.commandNewGame()')
        scene('Scene_RPGStartingRoster')
        for cls, sex, name in [('Knight','Type A','Knight'),('Cleric','Type B','Cleric'),('Mage','Type A','Mage')]:
            starting = cls == 'Knight'
            if not starting:
                page.get_by_role('button',name='Tavern',exact=True).click()
                scene('Scene_RPGTavern')
            page.get_by_role('button',name=cls,exact=True).click()
            page.get_by_role('button',name=sex,exact=True).click()
            page.get_by_role('button',name='Portrait 1',exact=True).click()
            page.get_by_label('Recruit name',exact=True).fill(name)
            page.get_by_role('button',name='Review companion' if starting else 'Review recruit',exact=True).click()
            page.get_by_role('button',name='Confirm companion and enter camp' if starting else 'Confirm free hire',exact=True).click()
            scene('Scene_RPGHome')
        page.evaluate('RPGManager.state().campaignStats.questsCompleted=100')
        page.get_by_role('button',name='Quest Board',exact=True).click()
        scene('Scene_RPGQuestBoard')
        contracts = page.evaluate('RPGManager.quests().map(q=>({id:q.id,minutes:String(q.durationMinutes),danger:String(RPGManagerProgression.dangerRating(q)),name:q.name}))')
        if '--rituals-only' in sys.argv:
            contracts = [q for q in contracts if q['id'].startswith('ritual_')]
        for q in contracts:
            page.get_by_label('Minutes',exact=True).select_option(q['minutes'])
            page.get_by_label('Danger',exact=True).select_option(q['danger'])
            page.wait_for_timeout(250)
            pos = page.evaluate('''id=>{const w=SceneManager._scene._choices,i=w._list.findIndex(e=>e.ext===id);w.scrollTo(0,Math.min(w.maxScrollY(),i*w.itemHeight()));w.updateOrigin();const r=w.itemRect(i),c=Graphics._canvas.getBoundingClientRect(),s=c.width/Graphics.width;return {x:c.left+(w.x+w.padding+r.x+r.width/2-w.origin.x)*s,y:c.top+(w.y+w.padding+r.y+r.height/2-w.origin.y)*s};}''',q['id'])
            page.mouse.move(pos['x'],pos['y'])
            page.wait_for_timeout(100)
            page.mouse.click(pos['x'],pos['y'])
            page.wait_for_timeout(100)
            actual = page.evaluate('SceneManager._scene._choices.currentExt()')
            assert actual == q['id'], (q,actual,page.evaluate('(()=>{const w=SceneManager._scene._choices;return {list:w._list,scroll:w.scrollY(),base:w.scrollBaseY(),origin:w.origin.y,hit:w.hitIndex(),touch:[TouchInput.x,TouchInput.y]};})()'))
            # Pass across another row before departure: hovering must not change the contract.
            page.mouse.move(pos['x'], max(250,pos['y']-60))
            page.wait_for_timeout(60)
            assert page.evaluate('SceneManager._scene._choices.currentExt()') == q['id']
            page.get_by_role('button',name='Start Quest',exact=True).click()
            page.get_by_role('button',name='Review quest',exact=True).click()
            assert q['name'] in page.locator('#embark-summary').inner_text(), q
            if q['id'].startswith('ritual_'):
                page.locator('#manager-confirmation button').first.click()
                scene('Scene_RPGHome')
                assert page.evaluate('RPGManager.state().trips.A.questId') == q['id']
                if q['id'] == 'ritual_warding':
                    page.evaluate('''()=>{const t=RPGManager.state().trips.A;t.presentationCurrent={kind:'battle',sourceType:'result',trigger:'VICTORY',text:'Encounter victory.'};t.presentationFighters=t.preparedTeam.map(n=>({...n,key:'player:'+n.id,side:'player'}));t.presentationDurationMs=3000;t.presentationHoldMs=2400;SceneManager._scene.refreshTeamPanel(false);}''')
                    page.wait_for_timeout(100)
                    page.screenshot(path=str(ROOT/'tests/visuals/battle-arms-up.webp'))
                page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression,t=s.trips.A;t.phase='return';t.deadlineMs=1000;t.battleSnapshot={status:'victory',fighters:t.preparedTeam.map(n=>({...n,side:'player',alive:true}))};const report=P.completeReturn(s,'A',t.id,1000);if(report.ritualUnlocks.length!==1)throw Error('Missing ritual unlock');P.dismissQuestResults(s);}''')
                page.get_by_role('button',name='Quest Board',exact=True).click()
                scene('Scene_RPGQuestBoard')
            else:
                page.get_by_role('button',name='Cancel',exact=True).click()
        page.screenshot(path=str(ROOT/'tests/visuals/quest-start-left.webp'))
        print(f"Reviewed {len(contracts)} contracts through actual row clicks and Start Quest")
        browser.close()
finally:
    server.shutdown()
