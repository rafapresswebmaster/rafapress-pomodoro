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
   def shot(name):page.screenshot(path=str(ROOT/f'tests/visuals/polish25-{width}-{name}.webp'))
   page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title');page.evaluate('SceneManager._scene.commandNewGame()');scene('Scene_RPGStartingRoster')
   page.evaluate("""()=>{const scene=SceneManager._scene;scene._drafts=[['knight','male','Knight'],['cleric','female','Cleric'],['mage','male','Mage']].map(([classId,sex,name])=>({classId,sex,name,portraitKey:RPGManagerProgression.portraitOptions(classId,sex)[0].key}));scene._step='review';scene.showCreator();}""")
   page.get_by_role('button',name='Confirm party and enter camp',exact=True).evaluate('(el)=>el.click()');scene('Scene_RPGHome');assert page.get_by_role('button',name='Scroll down',exact=True).count()==0;page.evaluate('()=>{window._homeClass=SceneManager._scene.constructor;}')
   page.get_by_role('button',name='Quest Board',exact=True).evaluate('(el)=>el.click()');scene('Scene_RPGQuestBoard')
   page.evaluate('''()=>{const s=SceneManager._scene;s._minutes=20;s._difficulty=4;s._choices.refresh();s._choices.select(0);s.refreshInfo();s._choices.processOk();}''')
   assert not page.locator('#embark-summary').count(),'List selection opened confirmation'
   page.wait_for_timeout(100)
   assert page.get_by_role('button',name='Scroll down',exact=True).count()==int(page.evaluate('SceneManager._scene._choices.maxScrollY()>0'))
   assert page.evaluate('!SceneManager._scene._choices._list.some(e=>e.symbol==="__nextPage")')
   if page.get_by_role('button',name='Scroll down',exact=True).count():
    assert page.get_by_role('button',name='Scroll up',exact=True).count()==0
    page.get_by_role('button',name='Scroll down',exact=True).evaluate('(el)=>el.click()');page.wait_for_timeout(300)
    assert page.get_by_role('button',name='Scroll up',exact=True).count()==1
   assert page.evaluate('SceneManager._scene._choices.maxScrollY()===0||SceneManager._scene._choices.scrollY()>0')
   shot('quest');page.get_by_role('button',name='Start Quest',exact=True).evaluate('(el)=>el.click()');page.wait_for_selector('#embark-summary');shot('warning')
   assert 'DANGEROUS EXPEDITION' in page.locator('#embark-summary').inner_text()
   page.get_by_role('button',name='Cancel',exact=True).evaluate('(el)=>el.click()');page.get_by_role('button',name='Camp',exact=True).evaluate('(el)=>el.click()');scene('Scene_RPGHome')
   page.get_by_role('button',name='Shop',exact=True).evaluate('(el)=>el.click()');scene('Scene_RPGShop');page.wait_for_timeout(100);assert page.get_by_role('button',name='Scroll down',exact=True).count()==int(page.evaluate('SceneManager._scene._commandWindow.maxScrollY()>0'));page.get_by_role('button',name='Supplies',exact=True).evaluate('(el)=>el.click()');page.wait_for_timeout(100);assert page.get_by_role('button',name='Scroll down',exact=True).count()==0;assert page.get_by_role('button',name='Scroll up',exact=True).count()==0;shot('shop');page.get_by_role('button',name='Camp',exact=True).evaluate('(el)=>el.click()');scene('Scene_RPGHome')
   page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression,q=RPGManager.quests().find(q=>q.durationMinutes===1);P.dispatchQuest(s,'A',q,$dataRPGManagerQuests.xp,1000);const t=s.trips.A;t.phase='return';t.deadlineMs=1000;t.battleSnapshot={status:'victory',fighters:t.preparedTeam.map(n=>({...n,side:'player',alive:true}))};P.completeReturn(s,'A',t.id,1000);SceneManager.goto(window._homeClass);}''');scene('Scene_RPGHome');page.wait_for_selector('#finish-recap');shot('finish')
   page.evaluate('()=>{window._sameHome=SceneManager._scene;window._sameCamp=SceneManager._scene._camp;}');page.locator('#finish-recap').evaluate('(el)=>el.click()');page.wait_for_timeout(400)
   assert page.evaluate('SceneManager._scene===window._sameHome&&SceneManager._scene._camp===window._sameCamp&&!RPGManager.state().questResults')
   assert page.get_by_role('button',name='Quest Board',exact=True).is_enabled()
   shot('finished');assert not errors,errors
   page.evaluate("""()=>{const P=RPGManagerProgression,s=RPGManager.state();P.activeRoster(s).forEach(n=>{n.level=8;P.ensureLife(n);n.health=n.maxHealth;});P.dispatchQuest(s,'A',RPGManager.quests().find(q=>q.id==='fantasy_14'),$dataRPGManagerQuests.xp,Date.now());SceneManager.goto(window._homeClass);}""");scene('Scene_RPGHome')
   page.evaluate("""()=>{const t=RPGManager.state().trips.A;for(let i=0;i<25&&!t.presentationFighters?.length;i++)RPGManagerProgression.tickRealtimeExpedition(RPGManager.state(),1000,$dataRPGManagerQuests,RPGManagerBattle.Battle,false,false);const team=JSON.parse(JSON.stringify(t.preparedTeam)),foes=RPGManagerProgression.encounterEnemies({enemyIds:['hill_giant','owlbear']},$dataRPGManagerQuests,{skulls:3});const b=new RPGManagerBattle.Battle(team,foes,{seed:42});t.presentationFighters=b.snapshot().fighters.map(f=>({...f,ward:f.innateWard+f.temporaryWard}));window._visualTrip=t;window._visualEvent={kind:'battle',sourceType:'attack',attackKind:'signature',importance:'SIGNATURE',actorKey:t.presentationFighters.find(f=>f.side==='player'&&f.classId==='mage').key,targetKey:t.presentationFighters.find(f=>f.side==='enemy').key,attackName:'Fireburst',text:'Fireburst tears across the battlefield!',damage:2,wardLoss:1,holdMs:50000};t.presentationCurrent=window._visualEvent;t.presentationDurationMs=50000;t.presentationHoldMs=25000;t.phase='battle';}""")
   page.wait_for_timeout(1800);shot('signature');assert not errors,errors
   assert not page.evaluate('SceneManager._scene._teamPanel._battleRenderError||null')
   page.evaluate("""()=>{const t=window._visualTrip;t.presentationCurrent={...window._visualEvent,sourceType:'result',text:'Victory!',actorKey:null,targetKey:null};t.presentationHoldMs=25000;const g=RPGManagerBattleStage.layout(760,420,t.presentationFighters),anim=new RPGManagerBattleStage.Animator(),f=anim.update(t,g);if([...f.poses.values()].some(p=>p.dy!==0))throw Error('Victory feet lifted');}""");page.wait_for_timeout(200);shot('victory');assert not errors,errors
   results.append({'viewport':[width,height],'passed':True,'errors':errors});page.close()
  browser.close()
finally:server.shutdown()
(ROOT/'tests/polish25-browser.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results))
