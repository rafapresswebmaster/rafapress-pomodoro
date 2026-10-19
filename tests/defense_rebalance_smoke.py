import functools,threading
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
            def shot(n):page.screenshot(path=str(ROOT/f'tests/visuals/defense31-{width}-{n}.webp'))
            page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title')
            page.evaluate('''({width,height})=>{Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;SceneManager._scene.commandNewGame()}''',{'width':width,'height':height});scene('Scene_RPGStartingRoster')
            for n in ['Mage','Type A','Portrait 1']:page.get_by_role('button',name=n,exact=True).click()
            page.get_by_label('Recruit name',exact=True).fill('Scholar');page.get_by_role('button',name='Review companion',exact=True).click();page.get_by_role('button',name='Confirm companion and enter camp',exact=True).click();scene('Scene_RPGHome')
            assert page.evaluate('RPGManager.roster()[0].maxHealth')==2
            page.evaluate('''()=>{const P=RPGManagerProgression,s=RPGManager.state();for(const [classId,name] of [['knight','Guardian'],['cleric','Priest'],['ranger','Scout'],['rogue','Shade']]){const result=P.recruitCreated(s,{classId,sex:'male',name,portraitKey:P.portraitOptions(classId,'male')[0].key});if(!result.ok)throw Error(result.message);}s.gold=2500;s.campaignStats.questsCompleted=100;P.purchase(s,'cat_charm');P.equipSlot(s,s.roster[0].id,'cat_charm','accessory');s.roster[0].equipmentCondition.cat_charm.hitsRemaining=2;SceneManager.goto(SceneManager._scene.constructor);}''');scene('Scene_RPGHome')
            page.evaluate('SceneManager._scene.openMember(RPGManager.roster()[0].id)')
            page.get_by_role('button',name='Gear',exact=True).click();assert '2/' in page.locator('#camp-member-sheet').inner_text() and 'hits left' in page.locator('#camp-member-sheet').inner_text();shot('wear')
            page.get_by_role('button',name='Back to camp',exact=True).click()
            page.evaluate('RPGManager.roster()[0].equipmentCondition.cat_charm.hitsRemaining=0;RPGManagerProgression.ensureLife(RPGManager.roster()[0])')
            page.get_by_role('button',name='Shop',exact=True).click();scene('Scene_RPGShop')
            page.get_by_role('button',name='Repairs',exact=True).click()
            page.evaluate('''()=>{const w=SceneManager._scene._commandWindow,i=w._list.findIndex(e=>e.symbol==='repair'&&e.ext.itemId==='cat_charm');if(i<0)throw Error('No repair entry');w.select(i);w.processOk();}''')
            assert page.evaluate('RPGManager.roster()[0].equipmentCondition.cat_charm.hitsRemaining===RPGManagerProgression.SHOP.cat_charm.durability')
            shot('repair');page.evaluate('SceneManager._scene.popScene()');scene('Scene_RPGHome')
            page.get_by_role('button',name='Camp Jobs',exact=True).click();scene('Scene_RPGCampJobs')
            page.get_by_role('button',name='Auto-assign',exact=True).click()
            assert page.evaluate('RPGManager.roster().every(n=>RPGManager.state().campJobs[n.id]===RPGManagerProgression.bestCampJob(n))')
            shot('auto-assign');page.evaluate('SceneManager._scene.back()');scene('Scene_RPGHome')
            assert page.locator('#camp-jobs-auto-assign').count()==0
            page.get_by_role('button',name='Quest Board',exact=True).click();scene('Scene_RPGQuestBoard')
            for minutes in [5,10,15,20,25,30]:
                page.get_by_label('Minutes',exact=True).select_option(str(minutes))
                for skulls in range(1,9):
                    page.get_by_label('Danger',exact=True).select_option(str(skulls))
                    assert page.evaluate('SceneManager._scene._choices._list.filter(e=>e.symbol==="quest").length')>=5,(minutes,skulls)
            shot('catalogue')
            page.get_by_label('Minutes',exact=True).select_option('5');page.get_by_label('Danger',exact=True).select_option('1');page.get_by_role('button',name='Start Quest',exact=True).click()
            cards=page.locator('#quest-party-selection button[data-member-id]')
            for i in range(3):
                if cards.nth(i).get_attribute('aria-pressed')!='true':cards.nth(i).click()
            page.get_by_role('button',name='Review quest',exact=True).click();assert 'shared completion XP' in page.locator('#embark-summary').inner_text();shot('xp-pool')
            page.locator('#manager-confirmation button').first.click();scene('Scene_RPGHome')
            page.evaluate('''()=>{const s=RPGManager.state();for(const n of s.trips.A.team)s.campJobs[n.id]='idle';}''')
            if not page.locator('#expedition-camp-jobs').is_visible():
                page.evaluate('SceneManager._scene._campOpen=true;SceneManager._scene.layoutExpedition()')
            page.get_by_role('button',name='Camp Jobs',exact=True).click();scene('Scene_RPGCampJobs');page.get_by_role('button',name='Auto-assign',exact=True).click()
            assert page.evaluate('RPGManager.state().trips.A.team.every(n=>RPGManager.state().campJobs[n.id]==="idle")')
            assert page.evaluate('RPGManager.roster().filter(n=>!RPGManagerProgression.isUnavailable(RPGManager.state(),n.id)).every(n=>RPGManager.state().campJobs[n.id]===RPGManagerProgression.bestCampJob(n))')
            shot('auto-assign-away')
            assert not errors,errors
            print(f'{width}x{height}: low-HP creation, persistent wear, repair, five-member auto-assign, 48 populated quest combinations, shared XP and away exclusion; no browser errors')
            page.close()
        browser.close()
finally:server.shutdown()
