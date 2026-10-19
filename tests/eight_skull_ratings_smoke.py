import functools,threading,sys
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for width,height in [(816,624),(1280,720)]:
            page=browser.new_page(viewport={'width':width,'height':height});page.set_default_timeout(15000)
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            def scene(n):page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=n)
            page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title')
            page.evaluate('''({width,height})=>{Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;SceneManager._scene.commandNewGame()}''',{'width':width,'height':height})
            scene('Scene_RPGStartingRoster')
            for name in ['Knight','Type A','Portrait 1']:page.get_by_role('button',name=name,exact=True).click()
            page.get_by_label('Recruit name',exact=True).fill('Rating Scout')
            page.get_by_role('button',name='Review companion',exact=True).click()
            page.get_by_role('button',name='Confirm companion and enter camp',exact=True).click();scene('Scene_RPGHome')
            page.evaluate('RPGManager.state().campaignStats.questsCompleted=100')
            page.get_by_role('button',name='Quest Board',exact=True).click();scene('Scene_RPGQuestBoard')
            assert page.get_by_label('Danger',exact=True).locator('option').evaluate_all('(els)=>els.map(e=>e.value)')==[str(n) for n in range(1,9)]
            for rating in ([8] if '--quick' in sys.argv else range(1,9)):
                minutes=page.evaluate('n=>RPGManager.quests().find(q=>q.skulls===n).durationMinutes',rating)
                page.get_by_label('Minutes',exact=True).select_option(str(minutes))
                page.get_by_label('Danger',exact=True).select_option(str(rating))
                assert page.evaluate('RPGManagerProgression.dangerRating(RPGManager.quests().find(q=>q.id===SceneManager._scene._choices.currentExt()))')==rating
                if rating in [1,8]:page.screenshot(path=str(ROOT/f'tests/visuals/skulls8-{width}-{rating}-board.webp'))
                page.get_by_role('button',name='Start Quest',exact=True).click()
                assert 'Average level 1.0' in page.locator('#quest-party-selection').inner_text()
                assert f'Quest estimate {rating}' in page.locator('#quest-party-selection').inner_text()
                page.get_by_role('button',name='Review quest',exact=True).click()
                summary=page.locator('#embark-summary').inner_text()
                assert f'{rating}/8' in summary and f'Estimated party level {rating}' in summary
                if rating==8:
                    assert 'DANGEROUS EXPEDITION' in summary
                    page.screenshot(path=str(ROOT/f'tests/visuals/skulls8-{width}-8-warning.webp'))
                page.get_by_role('button',name='Cancel',exact=True).click()
                assert page.evaluate('RPGManager.state().trips.A') is None
            assert not errors,errors
            print(f'{width}x{height}: all eight filters, level estimates, solo picker, level-eight danger warning; no browser errors')
            page.close()
        browser.close()
finally:server.shutdown()
