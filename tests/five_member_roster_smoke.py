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
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for width,height in [(816,624),(1280,720)]:
            page=browser.new_page(viewport={'width':width,'height':height});page.set_default_timeout(15000)
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            def scene(name):
                page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name)
            def shot(name): page.screenshot(path=str(ROOT/f'tests/visuals/roster5-{width}-{name}.webp'))
            def create(cls,name,starting=False):
                page.get_by_role('button',name=cls,exact=True).click()
                page.get_by_role('button',name='Type A',exact=True).click()
                page.get_by_role('button',name='Portrait 1',exact=True).click()
                page.get_by_label('Recruit name',exact=True).fill(name)
                page.get_by_role('button',name='Review companion' if starting else 'Review recruit',exact=True).click()
                page.get_by_role('button',name='Confirm companion and enter camp' if starting else 'Confirm free hire',exact=True).click()
                scene('Scene_RPGHome')
            page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title')
            page.evaluate('''({width,height})=>{Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;SceneManager._scene.commandNewGame()}''',{'width':width,'height':height})
            scene('Scene_RPGStartingRoster');create('Knight','Founder',True)
            assert page.evaluate('RPGManager.roster().length')==1
            shot('one-founder')
            # A brand-new founder can embark alone without recruiting anyone else.
            page.get_by_role('button',name='Quest Board',exact=True).click();scene('Scene_RPGQuestBoard')
            page.get_by_label('Minutes',exact=True).select_option('1');page.get_by_label('Danger',exact=True).select_option('1')
            page.get_by_role('button',name='Start Quest',exact=True).click()
            page.get_by_role('button',name='Select Founder',exact=True).click()
            assert page.get_by_role('button',name='Review quest',exact=True).is_disabled()
            page.get_by_role('button',name='Select Founder',exact=True).click()
            page.get_by_role('button',name='Review quest',exact=True).click()
            page.locator('#manager-confirmation button').first.click();scene('Scene_RPGHome')
            assert page.evaluate('RPGManager.state().trips.A.team.length')==1
            page.evaluate('RPGManagerProgression.recallExpedition(RPGManager.state());RPGManagerProgression.dismissQuestResults(RPGManager.state());SceneManager.goto(SceneManager._scene.constructor)');scene('Scene_RPGHome')
            for cls,name in [('Cleric','Healer'),('Mage','Scholar'),('Ranger','Scout'),('Rogue','Shadow')]:
                page.get_by_role('button',name='Tavern',exact=True).click();scene('Scene_RPGTavern');create(cls,name)
            assert page.evaluate('RPGManager.roster().length')==5
            shot('camp-top')
            # Scroll the original camp cards and click the fifth member using its rendered coordinates.
            page.locator('#camp-roster-scroll').evaluate('(el)=>el.scrollTop=el.scrollHeight')
            page.wait_for_timeout(150)
            pos=page.evaluate('''()=>{const w=SceneManager._scene._companions,id=RPGManager.roster()[4].id,r=w._hitRegions.find(n=>n.id===id).rect,c=Graphics._canvas.getBoundingClientRect(),s=c.width/Graphics.width;return{x:c.left+(w.x+w.padding+r.x+r.width/2)*s,y:c.top+(w.y+w.padding+r.y+r.height/2-w.origin.y)*s}}''')
            shot('camp-scrolled');page.mouse.click(pos['x'],pos['y'],delay=80)
            page.wait_for_selector('#camp-member-sheet');assert 'Shadow' in page.locator('#camp-member-sheet').inner_text()
            page.keyboard.press('Escape');page.wait_for_selector('#camp-member-sheet',state='detached')
            page.get_by_role('button',name='Quest Board',exact=True).click();scene('Scene_RPGQuestBoard')
            page.get_by_label('Minutes',exact=True).select_option('1');page.get_by_label('Danger',exact=True).select_option('1')
            page.get_by_role('button',name='Start Quest',exact=True).click()
            picker=page.locator('#quest-party-selection');picker.wait_for()
            cards=picker.locator('button[data-member-id]');assert cards.count()==5
            # Select a complete trio before testing the maximum and cancellation.
            for i in range(3):
                if cards.nth(i).get_attribute('aria-pressed') != 'true': cards.nth(i).click()
            before=page.evaluate('JSON.stringify({team:RPGManager.state().teamIds,trip:RPGManager.state().trips.A})')
            cards.nth(4).click()
            assert cards.locator('xpath=self::*[@aria-pressed="true"]').count()==3
            picker.get_by_role('button',name='Cancel',exact=True).click()
            assert page.evaluate('JSON.stringify({team:RPGManager.state().teamIds,trip:RPGManager.state().trips.A})')==before
            page.get_by_role('button',name='Start Quest',exact=True).click();picker.wait_for()
            cards=picker.locator('button[data-member-id]')
            rects=cards.evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,bottom:r.bottom}})')
            assert rects[0]['y']==rects[1]['y']<rects[2]['y']==rects[3]['y']==rects[4]['y']
            assert all(r['bottom']<=height for r in rects)
            # Switch from the default first three to Founder, Scout, Shadow.
            for i in range(3):
                if cards.nth(i).get_attribute('aria-pressed') != 'true': cards.nth(i).click()
            cards.nth(1).click();cards.nth(2).click();assert picker.get_by_role('button',name='Review quest',exact=True).is_enabled()
            cards.nth(3).click();cards.nth(4).click()
            selected=cards.locator('xpath=self::*[@aria-pressed="true"]').evaluate_all('(els)=>els.map(e=>e.dataset.memberId)')
            assert len(selected)==3
            for i in range(5):
                text=cards.nth(i).inner_text();assert all(label in text for label in ['Level','HP','Armor','Ward'])
            shot('picker')
            picker.get_by_role('button',name='Review quest',exact=True).click()
            summary=page.locator('#embark-summary').inner_text();assert all(n in summary for n in ['Founder','Scout','Shadow'])
            assert 'Healer' not in summary and 'Scholar' not in summary
            shot('confirmation')
            page.locator('#manager-confirmation button').first.click();scene('Scene_RPGHome')
            assert page.evaluate('RPGManager.state().trips.A.lockedPlan.teamIds')==selected
            assert page.evaluate('RPGManager.roster().length')==5
            page.evaluate('''()=>{const s=RPGManager.state(),loaded=RPGManagerProgression.upgradeState(JSON.parse(JSON.stringify(s)));if(JSON.stringify(loaded.teamIds)!==JSON.stringify(s.trips.A.lockedPlan.teamIds))throw Error('Selected party lost on save upgrade');}''')
            shot('away-roster')
            assert not errors,errors
            print(f'{width}x{height}: one founder, five roster members, scroll and fifth-card click, 2+3 picker, cancel without departure, selected trio dispatched; no browser errors')
            page.close()
        browser.close()
finally:
    server.shutdown()
