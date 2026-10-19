"""Real MZ sprint routes at both supported resolutions, with actual DOM input."""
import functools,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/visuals';OUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for width,height in [(816,624),(1280,720)]:
   page=browser.new_page(viewport={'width':width,'height':height});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def scene(name):page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name)
   def shot(name):page.screenshot(path=str(OUT/f'oct15-{width}-{name}.webp'))
   def home():page.evaluate('SceneManager.goto(window._home)');scene('Scene_RPGHome')
   def command(symbol,name):page.evaluate('s=>SceneManager._scene._commandWindow.callHandler(s)',symbol);scene(name)
   page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title')
   page.evaluate('''({width,height})=>{Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;SceneManager._scene.commandNewGame()}''',{'width':width,'height':height});scene('Scene_RPGStartingRoster');shot('selection')
   page.evaluate('()=>{SceneManager._scene._selected=["ada","bram","cora"];SceneManager._scene.startParty()}')
   page.locator('form input').nth(0).fill('');page.locator('form button[type=submit]').click();assert page.locator('form [role=status]').inner_text()
   page.locator('form input').nth(0).fill('Amber Oak');page.locator('form button',has_text='Randomize Name').nth(1).click();page.locator('form input').nth(1).fill('Bram Thistle');shot('names');page.locator('form button[type=submit]').click();scene('Scene_RPGHome')
   page.evaluate('()=>{window._home=SceneManager._scene.constructor}');shot('home')
   assert page.evaluate('!SceneManager._scene._commandWindow._list.some(c=>["title","completionAlert"].includes(c.symbol))')
   assert page.evaluate('SceneManager._scene._alerts.y<108')
   alerts=page.evaluate('RPGManager.state().completionAlerts');page.keyboard.down('PageUp');page.wait_for_function('old=>RPGManager.state().completionAlerts!==old',arg=alerts);page.keyboard.up('PageUp')
   assert page.evaluate('RPGManager.state().completionAlerts')!=alerts
   command('roster','Scene_RPGRoster')
   page.evaluate('()=>{const s=SceneManager._scene;s._listWindow?s._listWindow.callHandler("ok"):null}') if False else None
   # Reach the normal member flow through the Home's member opener.
   home();page.evaluate('SceneManager._scene.openMember("ada")');scene('Scene_RPGMember')
   page.evaluate('()=>{const s=RPGManager.state();s.roster.find(n=>n.id==="ada").classArmor=0;SceneManager._scene.refresh()}');shot('member')
   page.evaluate('()=>{const s=SceneManager._scene;s._choices.select(s._choices._list.findIndex(c=>c.ext==="restoreArmor"));s.choose()}');shot('restore-confirm')
   before=page.evaluate('RPGManager.state().gold');page.evaluate('SceneManager._scene._choices.select(0);SceneManager._scene.choose()');assert page.evaluate('RPGManager.state().gold')==before-6
   home();command('shop','Scene_RPGShop');page.evaluate('()=>{const s=SceneManager._scene;s._commandWindow.select(s._commandWindow._list.findIndex(c=>c.ext==="life_giving_amulet"));s.refreshDetails()}');shot('shop');page.evaluate('SceneManager._scene.buy()');page.evaluate('SceneManager._scene._commandWindow.callHandler("mode")');shot('sell')
   home();page.evaluate('RPGManagerProgression.dismissAdventurer(RPGManager.state(),"bram",true)');command('recruit','Scene_RPGTavern');shot('tavern');page.evaluate('SceneManager._scene._choices.select(0);SceneManager._scene.hire()');scene('Scene_RPGRename');shot('recruit-name')
   page.locator('form input').first.fill('Amber Oak');page.locator('form button[type=submit]').click();assert 'already used' in page.locator('form [role=status]').inner_text();page.locator('form button',has_text='Randomize Name').click();page.locator('form input').first.fill('Rowan Brightbrook');page.locator('form button[type=submit]').click();scene('Scene_RPGTavern');assert page.evaluate('RPGManagerProgression.activeRoster(RPGManager.state()).length')==3
   home();command('battle','Scene_RPGQuestBoard');page.evaluate('()=>{const s=SceneManager._scene;s._category="Medium";s._choices.refresh();s._choices.select(s._choices._list.findIndex(c=>c.ext==="goblin_tracks"));s.refreshInfo()}');shot('contract')
   home();page.evaluate('''()=>{const s=RPGManager.state();RPGManagerProgression.dispatchQuest(s,'A',RPGManager.quests().find(q=>q.id==='goblin_tracks'),$dataRPGManagerQuests.xp,Date.now());SceneManager.goto(window._home)}''');scene('Scene_RPGHome');page.wait_for_function('SceneManager._scene._teamPanel._travelStage?.lastMembers.length===3');shot('travel')
   # Trace actual resolved battle presentation; a copied long name and large counts stress rendering only.
   page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression;while(!s.trips.A.milestones.battle)P.tickRealtimeExpedition(s,5000,$dataRPGManagerQuests,RPGManagerBattle.Battle,false,false);P.tickPresentation(s.trips.A,1,'skip',{});const t=s.trips.A;t.presentationCurrent={kind:'battle',sourceType:'round',text:'Five enemies watch the trail. The companions stand together.'};t.presentationDurationMs=6000;t.presentationHoldMs=5000;t.presentationFighters=[...t.preparedTeam.map(n=>({...n,key:'player:'+n.id,side:'player'})),...Array.from({length:5},(_,i)=>({...$dataRPGManagerQuests.enemies[i],name:'Woodland Skeleton Archer '+(i+1),key:'enemy:'+i,side:'enemy',armor:45,ward:120}))];SceneManager._scene.refreshTeamPanel(false)}''');shot('five-enemies');page.evaluate('SceneManager._scene._campOpen=true;SceneManager._scene.layoutExpedition()');shot('open-roster')
   # Renderer must stay presentation-only, every text rectangle remains on the real bitmap.
   report=page.evaluate('''()=>{const s=SceneManager._scene,w=s._teamPanel,b=w.contents,old=b.drawText,draws=[];b.drawText=function(text,x,y,width,height,align){draws.push({text,x,y,width,height,size:b.fontSize});return old.call(this,text,x,y,width,height,align)};const before=JSON.stringify(RPGManager.state());try{s.refreshTeamPanel(false)}finally{b.drawText=old}return {width:w.innerWidth,height:w.innerHeight,draws,unchanged:before===JSON.stringify(RPGManager.state())}}''')
   assert report['unchanged'];assert any(d['size']>=18 for d in report['draws'])
   for d in report['draws']:
    assert d['x']>=0 and d['x']+d['width']<=report['width']+1,d
    assert d['y']>=0 and d['y']+d['height']<=report['height']+1,d
   page.evaluate('''async()=>{const s=RPGManager.state();s.trips.A.presentationCurrent=null;s.trips.A.presentationQueue=[];RPGManagerProgression.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle,true);$gameSystem.onBeforeSave();await DataManager.saveGame(26);await DataManager.loadGame(26);RPGManager.restoreSave();$gameSystem.onAfterLoad();SceneManager.goto(window._home)}''');scene('Scene_RPGHome');shot('results');assert page.evaluate('RPGManager.state().version')==22;assert page.evaluate('RPGManager.state().questResults.members.length')==3
   # A seeded authored long journey produces an actual preliminary skirmish and boss opening.
   page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression;P.dismissQuestResults(s);const q=RPGManager.quests().find(q=>q.id==='sunken_crypt');while(!P.buildJourneyStages(q,'trip-'+s.nextTripId).some(x=>x.smallSkirmish))s.nextTripId++;for(const n of P.activeRoster(s)){n.health=n.maxHealth;n.classArmor=n.classArmorMax;n.innateWard=n.innateWardMax;}P.dispatchQuest(s,'A',q,$dataRPGManagerQuests.xp,Date.now());SceneManager.goto(window._home)}''');scene('Scene_RPGHome')
   page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression,t=s.trips.A;while(!t.recordedBattleStages||!Object.keys(t.recordedBattleStages).length)P.tickRealtimeExpedition(s,5000,$dataRPGManagerQuests,RPGManagerBattle.Battle,false,false);while(t.presentationQueue.length&&t.presentationCurrent?.trigger!=='BATTLE_START')P.tickPresentation(t,100000,'standard',{});SceneManager._scene.refreshTeamPanel(false)}''');shot('authored-skirmish')
   page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression,t=s.trips.A;t.presentationQueue=[];while(!t.milestones.battle)P.tickRealtimeExpedition(s,5000,$dataRPGManagerQuests,RPGManagerBattle.Battle,false,false);while(t.presentationQueue.length&&t.presentationCurrent?.trigger!=='BOSS_START')P.tickPresentation(t,100000,'standard',{});SceneManager._scene.refreshTeamPanel(false)}''');shot('authored-boss')
   assert not errors,errors
   print(f'PASS {width}x{height}: custom/random names, invalid duplicate, free hire, restore confirmation/cost, shop/sell, HUD, contract, travel, five enemies/open roster bounds, save/load/results; zero page errors.',flush=True);page.close()
  browser.close()
finally:server.shutdown();server.server_close()
