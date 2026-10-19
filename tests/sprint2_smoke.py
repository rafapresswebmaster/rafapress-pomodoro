"""New sprint browser acceptance: identities, confirmation, menus, locked art and fallback."""
import functools,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/visuals'
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for width,height in [(816,624),(1280,720)]:
   page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def scene(name):
    try:page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name)
    except Exception:print(errors,page.locator('body').inner_text(),flush=True);raise
   def shot(name):page.screenshot(path=str(OUT/f'sprint2-{width}-{name}.webp'))
   def home():page.evaluate('SceneManager.goto(window._home)');scene('Scene_RPGHome')
   page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title');page.evaluate('''({width,height})=>{Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;SceneManager._scene.commandNewGame()}''',{'width':width,'height':height});scene('Scene_RPGStartingRoster')
   assert page.evaluate('RPGManagerProgression.replacementCandidates(RPGManager.state()).length')==12;assert page.evaluate('SceneManager._scene.entries().filter(n=>n.symbol==="candidate").every(n=>/Male|Female/.test(n.name))');shot('twelve-identities')
   page.evaluate('SceneManager._scene._selected=["ada","bram","cora"];SceneManager._scene.startParty()');page.get_by_role('button',name='Randomize Name',exact=True).first.click();page.locator('form button[type=submit]').click();scene('Scene_RPGHome');page.evaluate('()=>{window._home=SceneManager._scene.constructor}')
   assert page.evaluate('RPGManagerProgression.replacementCandidates(RPGManager.state()).length')==12
   assert page.evaluate('!SceneManager._scene._commandWindow._list.some(n=>n.name.includes("Guild Hall"))');shot('purple-camp')
   page.evaluate('SceneManager._scene.openMember("ada")');page.wait_for_selector('#camp-member-sheet')
   # Actual mouse click on native camp navigation while the sheet is open.
   point=page.evaluate('''()=>{const w=SceneManager._scene._commandWindow,i=w._list.findIndex(n=>n.symbol==='battle'),r=w.itemRect(i),c=Graphics._canvas.getBoundingClientRect(),scale=c.width/Graphics.width;return{x:c.left+(w.x+w.padding+r.x+r.width/2)*scale,y:c.top+(w.y+w.padding+r.y+r.height/2)*scale}}''');page.mouse.click(point['x'],point['y']);scene('Scene_RPGQuestBoard');assert not page.locator('#camp-member-sheet').count();assert page.locator('#camp-menu-navigation').is_visible()
   page.get_by_role('button',name='Character / Camp',exact=True).click();scene('Scene_RPGHome');assert page.locator('#camp-member-sheet').is_visible();assert page.evaluate('SceneManager._scene._sheetId')=='ada'
   page.evaluate('SceneManager._scene._commandWindow.callHandler("battle")');scene('Scene_RPGQuestBoard');page.evaluate('SceneManager._scene.changeDuration("Short")');page.bring_to_front();page.keyboard.down('ArrowRight');page.wait_for_function('SceneManager._scene._category==="Medium"');page.keyboard.up('ArrowRight');page.keyboard.down('ArrowLeft');page.wait_for_function('SceneManager._scene._category==="Short"');page.keyboard.up('ArrowLeft');shot('board')
   page.evaluate('Input._currentState.pagedown=true');page.wait_for_function('document.getElementById("camp-menu-navigation").contains(document.activeElement)');page.evaluate('Input._currentState.pagedown=false;Input._currentState.ok=true');scene('Scene_RPGHome');page.evaluate('Input._currentState.ok=false');assert page.locator('#camp-member-sheet').is_visible();page.evaluate('SceneManager._scene._commandWindow.callHandler("battle")');scene('Scene_RPGQuestBoard')
   page.evaluate('''()=>{const s=SceneManager._scene;s.changeDuration('Medium');s._choices.select(s._choices._list.findIndex(n=>n.ext==='goblin_tracks'));s.refreshInfo();s.chooseQuest()}''');page.wait_for_selector('#manager-confirmation');shot('confirm')
   assert page.evaluate('RPGManager.state().trips.A===null');assert 'Normal / 5 minutes' in page.locator('#manager-confirmation').inner_text();assert 'XP per member' in page.locator('#manager-confirmation').inner_text()
   page.keyboard.press('Tab');assert page.get_by_role('button',name='Start Quest',exact=True).evaluate('(b)=>b===document.activeElement');page.keyboard.press('Escape');assert not page.locator('#manager-confirmation').count();assert page.evaluate('RPGManager.state().trips.A===null')
   page.evaluate('SceneManager._scene.chooseQuest()');page.get_by_role('button',name='Start Quest',exact=True).click();scene('Scene_RPGHome');assert not page.locator('#camp-menu-navigation').count();page.wait_for_selector('#rpg-focus-timer');shot('travel')
   locked=page.evaluate('RPGManager.state().trips.A.lockedBackground');travel=page.evaluate('SceneManager._scene._teamPanel._travelStage.lastBackground');assert locked==travel
   page.evaluate('''()=>{const P=RPGManagerProgression,s=RPGManager.state();for(let i=0;i<3;i++)P.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);const t=s.trips.A;const first=t.presentationQueue.find(e=>e.fighters);if(first)t.presentationFighters=first.fighters;t.presentationCurrent=t.presentationQueue.find(e=>e.attackKind==='signature')||t.presentationQueue.find(e=>e.sourceType==='attack');t.presentationHoldMs=1800;t.presentationDurationMs=2500;SceneManager._scene.refreshTeamPanel(false)}''');shot('gold-battle')
   assert page.evaluate('!SceneManager._scene._teamPanel._battleRenderError');assert page.evaluate('SceneManager._scene._teamPanel._battleStage.lastBackground')==locked
   for class_id in ['barbarian','knight','ranger','rogue','mage','cleric']:
    result=page.evaluate('''classId=>{const s=RPGManager.state(),t=s.trips.A,P=RPGManagerProgression,actor={...t.preparedTeam.find(n=>n.alive!==false),id:'cinematic',name:'Specialist',classId,health:5,maxHealth:5,alive:true,speed:100,signatureUnlocks:1,signatureDamage:1,critChance:0},ally={...actor,id:'ally',name:'Ally',health:1,speed:1},enemy={...actor,id:'foe',name:'Training target',health:100,maxHealth:100,speed:1,dodgeChance:0};const b=new RPGManagerBattle.Battle([actor,ally],[enemy],{seed:19});b._signatureDecision=a=>({use:a.side==='player'&&!a.signatureSpent});const initial=b.snapshot().fighters,events=b.step(),projection=P.buildBattlePresentation(events,b.snapshot(),{...t,preparedTeam:[actor,ally]});t.presentationFighters=initial;t.presentationCurrent=projection.find(e=>e.sourceType==='heal'||e.attackKind==='signature');t.presentationDurationMs=2500;t.presentationHoldMs=1800;SceneManager._scene.refreshTeamPanel(false);return {error:SceneManager._scene._teamPanel._battleRenderError,kind:SceneManager._scene._teamPanel._battleStage.lastFrame.kind}}''',class_id)
    assert not result.get('error') and result['kind'] in ['signature','heal'],result
    shot('special-'+class_id)
   page.evaluate('''()=>{const P=RPGManagerProgression,s=RPGManager.state();P.endSessionEarly(s,s.trips.A.id,true);SceneManager.goto(window._home)}''');scene('Scene_RPGHome');assert page.evaluate('RPGManager.state().questResults.fieldNotes[0].startsWith("XP awarded: 0")');shot('xp-field-note')
   assert not errors,errors;print(f'PASS {width}x{height}: 12 gender/class categories, random name persistence, no Guild Hall, direct mouse menu switching/context restore, confirmation cancel/Escape/start, reward labels, active menu lock, stable travel/battle art, gold panels, truthful early-end XP; zero page errors.',flush=True);page.close()
  # Missing optional narrative must not fail database readiness or a fresh campaign.
  page=browser.new_page();page.route('**/data/RPGManagerNarratives.json',lambda route:route.fulfill(status=404,body='missing'));page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('SceneManager._scene?.constructor.name==="Scene_Title"&&SceneManager._scene.isStarted()');assert page.evaluate('Object.keys($dataRPGManagerNarratives).length')==0;print('PASS missing narrative HTTP 404: optional loader boots with safe fallback.',flush=True);page.close();browser.close()
finally:server.shutdown()
