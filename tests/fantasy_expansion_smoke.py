import functools, threading, json
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
  page=browser.new_page(viewport={'width':1280,'height':720});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def scene(name):page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name)
  page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title');page.evaluate('SceneManager._scene.commandNewGame()');scene('Scene_RPGStartingRoster')
  for cls,sex,name in [('Knight','Type A','Knight'),('Cleric','Type B','Cleric'),('Ranger','Type B','Ranger')]:
   page.get_by_role('button',name=cls,exact=True).click();page.get_by_role('button',name=sex,exact=True).click();page.get_by_role('button',name='Portrait 1',exact=True).click();page.get_by_label('Recruit name',exact=True).fill(name)
   page.get_by_role('button',name='Review party' if cls=='Ranger' else 'Next companion',exact=True).click()
  page.get_by_role('button',name='Confirm party and enter camp',exact=True).click();scene('Scene_RPGHome')
  page.evaluate('SceneManager._scene.openMember(RPGManagerProgression.activeRoster(RPGManager.state())[0].id)');page.get_by_role('button',name='Gear',exact=True).click()
  page.evaluate('SceneManager._scene.openMember(RPGManagerProgression.activeRoster(RPGManager.state())[1].id)')
  assert page.get_by_role('button',name='Gear',exact=True).get_attribute('aria-pressed')=='true'
  page.screenshot(path=str(ROOT/'tests/visuals/fantasy-gear-switch.webp'))
  page.get_by_role('button',name='Back to camp',exact=True).click()
  result=page.evaluate('''async()=>{
   const P=RPGManagerProgression,s=RPGManager.state(),quests=RPGManager.quests().filter(q=>q.id.startsWith('fantasy_'));
   if(quests.length!==15)throw Error('Missing contracts');
   const urls=['img/pictures/RPGFantasyEnemies_v6.webp','img/faces/RPGFantasyEnemies_v6.webp'];
   for(const cls of P.ALL_CLASSES)for(const sex of P.SEXES)for(const option of P.portraitOptions(cls,sex)){const n={classId:cls,sex,reanimated:true,portraitKey:option.key};P.normalizeUndead(n);urls.push('img/faces/'+n.portrait.sheet+'.webp','img/characters/'+n.walkPortrait.sheet+'.webp','img/characters/'+n.fallenPortrait.sheet+'.webp','img/sv_actors/'+n.combatPortrait.sheet+'.webp');}
   for(const q of quests)urls.push('img/'+q.battlebackFolder+'/'+q.battleback+'.webp');
   await Promise.all(urls.map(url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=resolve;im.onerror=()=>reject(Error(url));im.src=url;})));
   const n=P.activeRoster(s)[1];n.reanimated=true;P.normalizeUndead(n);
   return {missions:quests.length,assets:urls.length};
  }''')
  page.wait_for_timeout(700);page.screenshot(path=str(ROOT/'tests/visuals/fantasy-female-skeleton-camp.webp'))
  page.evaluate('''()=>{
   const P=RPGManagerProgression,s=RPGManager.state(),q=RPGManager.quests().find(q=>q.id==='fantasy_14');s.campaignStats.questsCompleted=100;
   P.dispatchQuest(s,'A',q,$dataRPGManagerQuests.xp,Date.now());const t=s.trips.A;
   t.presentationFighters=[...t.preparedTeam.map(n=>({...n,key:'player:'+n.id,side:'player'})),...P.encounterEnemies({enemyIds:q.enemyIds},$dataRPGManagerQuests,t).map(n=>({...n,key:'enemy:'+n.id,side:'enemy'}))];
   t.presentationCurrent={kind:'battle',sourceType:'round',text:'Boarding the Black Shoal flagship'};t.presentationDurationMs=t.presentationHoldMs=20000;SceneManager.goto(SceneManager._scene.constructor);
  }''')
  scene('Scene_RPGHome');page.wait_for_function('!!SceneManager._scene._teamPanel?._battleStage?.lastGeometry');page.wait_for_timeout(700)
  assert page.evaluate('!SceneManager._scene._teamPanel._battleRenderError')
  page.screenshot(path=str(ROOT/'tests/visuals/fantasy-pirate-boss.webp'))
  assert not errors,errors
  print(json.dumps(dict(result,errors=errors)))
  browser.close()
finally:server.shutdown()
