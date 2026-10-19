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
   page=browser.new_page(viewport={'width':width,'height':height});page.set_default_timeout(15000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def scene(name):page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name)
   def shot(name):page.screenshot(path=str(ROOT/f'tests/visuals/altar-{width}-{name}.webp'))
   def command(symbol,ext):
    page.evaluate('''({symbol,ext})=>{const w=SceneManager._scene._choices;w._commandPage=0;w.refresh();for(let tries=0;tries<10;tries++){const i=w._list.findIndex(e=>e.symbol===symbol&&e.ext===ext);if(i>=0){w.select(i);w.processOk();return;}const next=w._list.findIndex(e=>e.symbol==='__nextPage');if(next<0)throw Error('Missing '+symbol+':'+ext);w.select(next);w.processOk();}throw Error('Pagination loop');}''',{'symbol':symbol,'ext':ext})
   page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title');page.evaluate('SceneManager._scene.commandNewGame()');scene('Scene_RPGStartingRoster')
   for cls,sex,name in [('Knight','Type A','Knight'),('Cleric','Type B','Cleric'),('Mage','Type A','Mage')]:
    page.get_by_role('button',name=cls,exact=True).click();page.get_by_role('button',name=sex,exact=True).click();page.get_by_role('button',name='Portrait 1',exact=True).click();page.get_by_label('Recruit name',exact=True).fill(name);page.get_by_role('button',name='Review party' if cls=='Mage' else 'Next companion',exact=True).click()
   page.get_by_role('button',name='Confirm party and enter camp',exact=True).click();scene('Scene_RPGHome');page.get_by_role('button',name='Altar',exact=True).click();scene('Scene_RPGAltar')
   assert page.evaluate('SceneManager._scene.entries().filter(e=>e.symbol==="ritual").length')==14
   before=page.evaluate('RPGManager.state().arcana');command('ritual','protection_ward');assert page.evaluate('RPGManager.state().arcana')==before;assert not page.evaluate('!!RPGManager.state().ritualsUnlocked.protection_ward');shot('locked')
   page.evaluate('''()=>{const P=RPGManagerProgression,s=RPGManager.state();for(const r of Object.values(P.RITUALS)){const q=RPGManager.quests().find(q=>q.id===r.questId);P.dispatchQuest(s,'A',q,$dataRPGManagerQuests.xp,1000);const t=s.trips.A;t.phase='return';t.deadlineMs=1000;t.battleSnapshot={status:'victory',fighters:t.preparedTeam.map(n=>({...n,side:'player',alive:true}))};P.completeReturn(s,'A',t.id,1000);P.dismissQuestResults(s);}SceneManager._scene.showResult({ok:true,message:'All fourteen trials completed.'});}''')
   assert page.evaluate('Object.keys(RPGManager.state().ritualsUnlocked).length')==14
   before=page.evaluate('RPGManager.state().arcana');command('ritual','protection_ward');assert page.evaluate('RPGManager.state().arcana')==before-35;command('ritual','protection_ward');assert page.evaluate('RPGManager.state().arcana')==before-35;shot('warding-pending')
   gold=page.evaluate('RPGManager.state().gold');before=page.evaluate('RPGManager.state().arcana');command('ritual','greed_prayer');assert page.evaluate('RPGManager.state().gold')==gold+100;assert page.evaluate('RPGManager.state().arcana')==before-100
   target=page.evaluate('RPGManagerProgression.activeRoster(RPGManager.state())[0].id');command('ritual','oath_of_vanguard');command('target',target);assert page.evaluate('RPGManager.state().ritualEffects.oath_of_vanguard')==target
   page.evaluate('SceneManager._scene.back()');command('ritual','quickening_prayer');assert page.evaluate('RPGManager.state().ritualEffects.quickening_prayer');shot('quickening')
   page.evaluate('''id=>{const s=RPGManager.state(),n=s.roster.find(n=>n.id===id);RPGManagerProgression.addPermanentWound(n,'bad_knee');n.lastingInjuries=1;n.health=1;}''',target)
   command('ritual','healing_ritual');command('target',target);assert page.evaluate('id=>RPGManager.state().roster.find(n=>n.id===id).health',target)==1;page.evaluate('SceneManager._scene.back()')
   page.evaluate('id=>RPGManagerProgression.applyDeath(RPGManager.state(),id)',target);command('ritual','last_rites');command('target',target);page.get_by_role('button',name='Confirm resurrection',exact=True).click();assert page.evaluate('id=>{const n=RPGManager.state().roster.find(n=>n.id===id);return n.health===1&&!!n.injury&&!n.reanimated;}',target)
   page.evaluate('id=>RPGManagerProgression.applyDeath(RPGManager.state(),id)',target);command('ritual','reanimate');command('target',target);page.get_by_role('button',name='Confirm resurrection',exact=True).click();assert page.evaluate('id=>RPGManager.state().roster.find(n=>n.id===id).reanimated',target)
   page.evaluate('id=>RPGManagerProgression.applyDeath(RPGManager.state(),id)',target);command('ritual','reanimate');assert page.evaluate('id=>SceneManager._scene.entries().some(e=>e.ext===id&&e.enabled===false&&e.name.includes("Ineligible"))',target);shot('reanimation-barred')
   assert not errors,errors;results.append(dict(width=width,rituals=14,unlockQuests=14,errors=errors));page.close()
  browser.close()
finally:
 server.shutdown();(ROOT/'tests/altar-rituals-browser.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results))
