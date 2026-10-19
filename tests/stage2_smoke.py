"""Stage 2 UI, save migration and authored-content smoke, isolated browser saves."""
import functools,json,threading,tempfile,subprocess
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  page=browser.new_page(viewport={'width':816,'height':624});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def scene(name):page.wait_for_function('n=>SceneManager._scene?.constructor.name===n && SceneManager._scene.isStarted() && !SceneManager.isSceneChanging() && !SceneManager._scene.isBusy()',arg=name)
  def frames():page.wait_for_function('n=>Graphics.frameCount<n || Graphics.frameCount>=n+3',arg=page.evaluate('Graphics.frameCount'))
  def press(key):page.keyboard.down(key);frames();page.keyboard.up(key);frames()
  def click(key,symbol,ext='ANY'):
   page.wait_for_function('k=>SceneManager._scene[k]?.isOpenAndActive()',arg=key)
   point=page.evaluate('''([key,symbol,ext])=>{const s=SceneManager._scene,w=s[key],i=w._list.findIndex(c=>c.symbol===symbol && (ext==='ANY'||c.ext===ext));if(i<0)throw Error('Missing '+symbol+' '+ext);w.forceSelect(i);const r=w.itemRect(i);return {x:s._windowLayer.x+w.x+w.padding+r.x-w.origin.x+r.width/2,y:s._windowLayer.y+w.y+w.padding+r.y-w.origin.y+r.height/2};}''',[key,symbol,ext])
   page.mouse.move(point['x'],point['y']);frames();page.mouse.down();frames();page.mouse.up();frames()
  def home(symbol):click('_commandWindow',symbol)
  def choose(value):click('_choices','choose',value)
  def state():return page.evaluate('RPGManager.state()')
  def shot(name):page.screenshot(path=str(Path(tempfile.gettempdir())/('rpg-stage2-'+name+'.webp')))
  # Edit a temporary copy of the authoring catalogue, then play generated data.
  import re
  with tempfile.TemporaryDirectory(prefix='rpg-stage2-content-') as folder:
   temp=Path(folder);source=(ROOT/'context/Adventurer_Classes_and_Dialogue.md').read_text(encoding='utf-8')
   pattern=r'(<!-- runtime: RPGManagerClasses.json -->\s*```json\s*)([\s\S]*?)(\s*```)'
   match=re.search(pattern,source);data=json.loads(match[2]);c=data['classes'][0]
   c['name']='Edited Vanguard';c['stats']['maxHealth']=147;c['ranges']['maxHealth']=[147,147];c['stats']['attack']=22;c['ranges']['attack']=[22,22]
   source=source[:match.start(2)]+json.dumps(data,indent=2)+source[match.end(2):]
   source=source.replace("Stand behind me. I'll break their line!",'Catalogue test: hold the line!')
   catalogue=temp/'catalogue.md';catalogue.write_text(source,encoding='utf-8')
   subprocess.run(['python',str(ROOT/'scripts/sync_adventurer_catalogue.py'),'--write','--catalogue',str(catalogue),'--output',str(temp/'data')],check=True)
   for name in ['RPGManagerClasses.json','RPGManagerDialogue.json']:
    payload=(temp/'data'/name).read_text(encoding='utf-8');page.route('**/data/'+name,lambda route,request,body=payload:route.fulfill(body=body,content_type='application/json'))
   page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title');home('newGame');scene('Scene_RPGHome')
   assert state()['roster'][0]['maxHealth']==147 and state()['roster'][0]['attack']==22 and state()['roster'][0]['role']=='Edited Vanguard'
   home('roster');scene('Scene_RPGRoster');click('_listWindow','npc','ada');scene('Scene_RPGMember');shot('edited-ranges')
   assert page.evaluate('RPGManagerProgression.rating("attack",RPGManager.roster()[0].attack)')=='Very strong'
   click('_choices','back');scene('Scene_RPGRoster');click('_listWindow','back');scene('Scene_RPGHome')
   page.evaluate("RPGManager.confirmTeam(['ada','bram','cora']); SceneManager._scene._commandWindow.refresh(); SceneManager._scene.refreshTeamPanel()")
   home('battle');scene('Scene_RPGPreparation');click('_departure','depart');click('_strategies','Tactical');scene('Scene_RPGTravel');press('Enter');scene('Scene_RPGBattle')
   page.wait_for_function('SceneManager._scene._captions.some(w=>w._beat?.text==="Catalogue test: hold the line!")',timeout=30000)
   shot('edited-dialogue');page.wait_for_function('SceneManager._scene._finished',timeout=90000)
   home('home');scene('Scene_RPGReport');home('home');scene('Scene_RPGHome')
   print('PASS: edited catalogue name, stat ranges, word rating and signature dialogue appear in game.',flush=True)
   old=json.loads((ROOT/'tests/fixtures/stage2_campaign.json').read_text(encoding='utf-8'))
   page.evaluate('s=>{$gameSystem._rpgManager=s;}',old);page.evaluate('async()=>{$gameSystem.onBeforeSave();await DataManager.saveGame(2);}')
   page.reload();scene('Scene_Title');home('continue');scene('Scene_RPGHome')
   migrated=state();assert migrated['version']==7
   for key in ['gold','supplies','bonds','questCount','lastReport','teamIds']:assert migrated[key]==old[key]
   for a,b in zip(old['roster'],migrated['roster']):
    for key,value in a.items():
     if key not in ['role','signatureAttack']:assert b[key]==value,(key,value,b[key])
   # Display names follow edited content, but saved identity IDs/stats never reroll.
   assert migrated['roster'][0]['classId']=='mage' and migrated['roster'][0]['attack']==old['roster'][0]['attack']
   print('PASS: actual archived version-6 campaign keeps custom identity, wounds, both items and progress on MZ load.',flush=True)
  assert not errors,errors
  browser.close()
finally:server.shutdown();server.server_close()
