"""Normal-speed MZ battle test; no clock or animation acceleration.
--baseline ZIP serves old plugins from the archive without restoring files.
--controls also checks history pause/input; exclude that run from timing comparisons.
Browser saves are isolated from the user's native save folder.
"""
import argparse, functools, threading, json, zipfile, tempfile, shutil, subprocess, socket, time, urllib.request
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--baseline',type=Path)
parser.add_argument('--seed',type=int,default=123)
parser.add_argument('--quest',default='restless_crypt')
parser.add_argument('--team',default='ada,bram,cora')
parser.add_argument('--strategy',choices=['Aggressive','Defensive','Tactical','Support'],default='Tactical')
parser.add_argument('--debug',action='store_true')
parser.add_argument('--controls',action='store_true')
parser.add_argument('--native',action='store_true',help='Use installed NW.js with a temporary project copy and isolated saves')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
native_process=None
native_temp=None
try:
 if args.native:
  native_temp=tempfile.TemporaryDirectory(prefix='rpg-stage1-native-')
  game=Path(native_temp.name)/'game'
  shutil.copytree(root,game,ignore=shutil.ignore_patterns('backups','save','tests','context','scripts','.git'))
  if args.baseline:
   with zipfile.ZipFile(args.baseline) as archive:
    for name in ['RPGManager.js','RPGManagerBattle.js','RPGManagerProgression.js']:
     (game/'js/plugins'/name).write_bytes(archive.read('RPG Manager/js/plugins/'+name))
  with socket.socket() as sock:
   sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
  nw=Path('C:/Program Files (x86)/Steam/steamapps/common/RPG Maker MZ/nwjs-win/nw.exe')
  startup=subprocess.STARTUPINFO();startup.dwFlags|=subprocess.STARTF_USESHOWWINDOW;startup.wShowWindow=0
  native_process=subprocess.Popen([str(nw),str(game),f'--remote-debugging-port={port}',
   '--user-data-dir='+str(Path(native_temp.name)/'profile'),'--disable-background-timer-throttling',
   '--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'],startupinfo=startup,
   stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  endpoint=f'http://127.0.0.1:{port}'
  deadline=time.monotonic()+30
  while True:
   try:
    with urllib.request.urlopen(endpoint+'/json/version',timeout=1):break
   except Exception:
    if time.monotonic()>deadline:raise RuntimeError('Native NW.js debugging endpoint did not start')
    time.sleep(.2)
 with sync_playwright() as p:
  browser=p.chromium.connect_over_cdp(endpoint) if args.native else p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  if args.native:
   context=browser.contexts[0]
   page=context.pages[0] if context.pages else context.wait_for_event('page')
  else: page=browser.new_page(viewport={'width':816,'height':624})
  if args.baseline and not args.native:
   with zipfile.ZipFile(args.baseline) as archive:
    scripts={name:archive.read('RPG Manager/js/plugins/'+name) for name in ['RPGManager.js','RPGManagerBattle.js','RPGManagerProgression.js']}
   page.route('**/js/plugins/*.js',lambda route:route.fulfill(body=scripts[route.request.url.rsplit('/',1)[-1]],content_type='application/javascript'))
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  if not args.native: page.goto(f'http://127.0.0.1:{server.server_port}/')
  else:
   page.wait_for_function('typeof Utils!=="undefined"')
   assert page.evaluate('Utils.isNwjs()'),page.evaluate('({url:location.href,require:typeof require,process:typeof process})')
  def scene(name):
   try: page.wait_for_function('n=>SceneManager._scene?.constructor.name===n && SceneManager._scene.isStarted() && !SceneManager.isSceneChanging()',arg=name)
   except Exception:
    print({'expected':name,'actual':page.evaluate('SceneManager._scene?.constructor.name'),'errors':errors},flush=True)
    raise
  def frames(): page.wait_for_function('n=>Graphics.frameCount>=n+3',arg=page.evaluate('Graphics.frameCount'))
  def press(key):
   # MZ samples held input once per update; a down/up between frames is invisible.
   page.keyboard.down(key);frames();page.keyboard.up(key);frames()
  scene('Scene_Title');page.evaluate('SceneManager._scene.commandNewGame()');scene('Scene_RPGHome')
  team=[value.strip() for value in args.team.split(',') if value.strip()]
  if not args.baseline: page.evaluate('''quest=>{$gameSystem._rpgManager=RPGManagerProgression.createState($dataRPGManagerRoster,()=>0.49);RPGManager.state().selectedQuestId=quest;}''',args.quest)
  if args.debug: page.evaluate('RPGManager.setBattleAiDebug(true)')
  page.evaluate("team=>{RPGManager.confirmTeam(team);SceneManager._scene.startBattle();}",team)
  if not args.baseline:
   scene('Scene_RPGQuestBoard');page.evaluate('SceneManager._scene.chooseQuest()')
   scene('Scene_RPGChooseTeam');page.evaluate('SceneManager._scene._choices.select(0);SceneManager._scene._choices.callHandler("team")')
   scene('Scene_RPGRoster');page.evaluate('team=>{SceneManager._scene._draft=team;SceneManager._scene.onConfirm()}',team)
  scene('Scene_RPGPreparation')
  page.evaluate('strategy=>{SceneManager._scene._strategy=strategy;SceneManager._scene.depart();}',args.strategy)
  scene('Scene_RPGHome')
  page.evaluate('''() => {
   RPGManager.skipTimer("outbound","A");
  }''')
  page.evaluate('''seed => {
   const state=RPGManager.state(),trip=state.trips.A,quest=RPGManager.quests().find(q=>q.id===trip.questId);
   const realNow=Date.now;Date.now=()=>seed;
   try{SceneManager._scene.openExpeditionAttention("A");}finally{Date.now=realNow;}
   const s=SceneManager._nextScene,orig=s.update;
   window.fixedBattle=s._battle;
   const resolvedSeed=fixedBattle.snapshot().seed;
   window.controlBattle=new RPGManagerBattle.Battle(JSON.parse(JSON.stringify(trip.preparedTeam)),RPGManager.questEnemies(quest),{seed:resolvedSeed,strategy:trip.strategy});
   while(controlBattle.snapshot().status==="running")controlBattle.step();
   window.measure={impacts:[],captions:[],narratives:[],replacements:[],last:new Map()};
   s.update=function(){
    if(this.isActive()&&!this._finished&&!measure.start)measure.start=performance.now();
    const pending=this._pending;orig.call(this);
    if(pending && pending.impacted && !pending.observed){pending.observed=true;measure.impacts.push(pending.attack);}
    for(const w of this._captions||[]){
     const old=measure.last.get(w);
     if(w._beat && old?.beat!==w._beat){
      if(old && old.until>performance.now())measure.replacements.push(old);
      const record={title:w._beat.title,text:w._beat.text,since:w._since,until:w._until};
      measure.captions.push(record);measure.last.set(w,{beat:w._beat,until:w._until});
     }
    }
    const dialogue=this._narrativeDialogue;
    if(dialogue?._waiting){const key=dialogue._speaker+'|'+dialogue._text;if(measure.lastNarrative!==key){measure.lastNarrative=key;measure.narratives.push({title:dialogue._speaker,text:dialogue._text});}}
    if(this._finished&&!measure.end){measure.end=performance.now();measure.snapshot=this._battle.snapshot();}
   };
  }''',args.seed)
  scene('Scene_RPGBattle')
  page.wait_for_function('SceneManager._scene._narrativeDialogue?.isWaiting()')
  initial_dialogue=page.evaluate('({title:SceneManager._scene._narrativeDialogue._speaker,text:SceneManager._scene._narrativeDialogue._text})')
  opening_decision=page.evaluate('RPGManager.state().trips.A.decision')
  assert ('d20:' in initial_dialogue['text']) if opening_decision['resolved'] else ('eligible' in initial_dialogue['title'].lower() or 'Mage' in initial_dialogue['text'])
  paused_for_text=page.evaluate('SceneManager._scene._battle.snapshot().actions')
  page.wait_for_timeout(300)
  assert page.evaluate('SceneManager._scene._battle.snapshot().actions')==paused_for_text
  page.evaluate('''()=>window.narrativeAuto=setInterval(()=>{const w=SceneManager._scene?._narrativeDialogue;if(w?._waiting){w._waiting=false;const fn=w._onAdvance;w._onAdvance=null;if(fn)fn();}},80)''')
  if args.debug:
   page.wait_for_function('SceneManager._scene._debugDecision?.reason')
   assert page.evaluate('''() => {const d=SceneManager._scene._debugDecision;return d.strategy&&d.actor&&d.role&&d.target&&d.reason;}''')
  if args.controls:
   page.wait_for_function('SceneManager._scene._battle.snapshot().actions>0')
   page.wait_for_timeout(180)
   page.screenshot(path=str(Path(tempfile.gettempdir())/'rpg-stage1-battle.webp'))
   press('Shift')
   page.wait_for_function('SceneManager._scene._historyOpen')
   paused=page.evaluate('SceneManager._scene._battle.snapshot().actions')
   page.wait_for_timeout(800)
   assert page.evaluate('SceneManager._scene._battle.snapshot().actions')==paused
   press('PageUp')
   page.screenshot(path=str(Path(tempfile.gettempdir())/'rpg-stage1-history.webp'))
   page.mouse.move(135,576);page.mouse.down();frames();page.mouse.up();frames()
   page.wait_for_function('!SceneManager._scene._historyOpen')
  page.wait_for_function('window.measure?.end',timeout=150000)
  result=page.evaluate('({seconds:(measure.end-measure.start)/1000,visibleActions:measure.impacts.length,actions:measure.snapshot.actions,outcome:measure.snapshot.status,captions:measure.captions,narratives:measure.narratives,targets:measure.impacts.map(e=>e.targetKey),reasons:measure.impacts.map(e=>e.decisionReason),intents:measure.impacts.map(e=>e.positionIntent)})')
  result.update(seed=args.seed,version='baseline' if args.baseline else 'stage2',controls=args.controls,native=args.native)
  assert 0<result['visibleActions']<=result['actions']
  assert page.evaluate('measure.impacts.every(impact=>SceneManager._scene._battle.events.some(e=>e.type==="attack"&&e.actorKey===impact.actorKey&&e.round===impact.round&&e.targetKey===impact.targetKey))')
  if not args.baseline:
   decision=page.evaluate('RPGManager.state().trips.A.decision')
   assert (decision['obedienceRoll']>=1 and decision['obedienceRoll']<=20 and decision['reasons']) if decision['resolved'] else decision['eligibleIds']==[]
   assert page.evaluate('SceneManager._scene._battle.events.filter(e=>e.kind==="signature"&&e.side==="player").length')<=len(team)
   assert not page.evaluate('SceneManager._scene._strategies.visible')
   assert page.evaluate('Array.from(SceneManager._scene._tokens.values()).every(t=>t.art.bitmap.isReady() && t.art._frame.width>0 && t.fighter.health===measure.snapshot.fighters.find(f=>f.key===t.fighter.key).health)')
   assert page.evaluate('JSON.stringify(controlBattle.events)===JSON.stringify(SceneManager._scene._battle.events)')
   assert page.evaluate('JSON.stringify(controlBattle.snapshot())===JSON.stringify(SceneManager._scene._battle.snapshot())')
   assert page.evaluate('''strategy=>SceneManager._scene._battle.events.filter(e=>e.type==="attack"&&e.side==="player").every(e=>e.strategy===strategy&&e.actorRole&&e.targetRole&&e.positionIntent&&e.decisionReason&&Number.isFinite(e.decisionScore))''',args.strategy)
   assert page.evaluate('''() => {
    const p=RPGManager.battlePresentation;
    if(p.speed!==1.5||p.actionMode({type:"attack",attackName:"Heavy Swing"},{role:"Bruiser"})!=="melee")return false;
    if(p.actionMode({type:"attack",attackName:"Quick Shot"},{role:"Ranger"})!=="ranged")return false;
    if(p.actionMode({type:"attack",attackName:"Arcane Bolt"},{role:"Mage"})!=="magic")return false;
    if(p.actionMode({type:"heal",healing:12},{role:"Support"})!=="heal")return false;
    for(let n=1;n<=5;n++)for(const side of ["player","enemy"]){
     const spots=Array.from({length:n},(_,i)=>p.formationPosition(side,i,n));
     if(new Set(spots.map(v=>v.x+":"+v.y)).size!==n)return false;
    }
    if(p.formationPosition("player",0,3,"FRONTLINE","Aggressive").x<=p.formationPosition("player",0,3,"FRONTLINE","Defensive").x)return false;
    if(p.formationPosition("player",0,3,"SUPPORT","Support").x>=p.formationPosition("player",0,3,"SUPPORT","Tactical").x)return false;
    return true;
   }''')
   assert page.evaluate('''strategy=>Array.from(SceneManager._scene._tokens.values()).every(t=>{
    const expected=RPGManager.battlePresentation.formationPosition(t.fighter.side,t.sideIndex,t.sideCount,t.fighter.combatRole,strategy);
    return t.homeX===expected.x&&t.homeY===expected.y;
   })''',args.strategy)
   assert page.evaluate('''() => {RPGManager.setBattleAiDebug(true);const gated=!RPGManager.battleAiDebug();$dataRPGManagerUI.developerMode=true;RPGManager.setBattleAiDebug(true);const on=RPGManager.battleAiDebug();RPGManager.setBattleAiDebug(false);$dataRPGManagerUI.developerMode=false;return gated&&on&&!RPGManager.battleAiDebug();}''')
   assert page.evaluate('''() => Array.from(SceneManager._scene._tokens.values()).every(t => {
    const dead=measure.snapshot.fighters.find(f=>f.key===t.fighter.key).health===0;
    return !dead || (t.defeated && t.art.opacity<=70);
   })''')
   assert not page.evaluate('SceneManager._scene._logWindow.visible')
   if args.controls:
    press('Shift')
    page.wait_for_function('SceneManager._scene._historyOpen')
    latest=page.evaluate('SceneManager._scene._logWindow.scrollY()')
    assert latest>0
    press('PageUp')
    assert page.evaluate('SceneManager._scene._logWindow.scrollY()')<latest
    press('Escape')
    assert not page.evaluate('SceneManager._scene._historyOpen')
   saved=page.evaluate('RPGManager.state()')
   assert saved['gold']==100 and saved['questCount']==0 and saved['trips']['A']['phase']=='return'
   page.evaluate('SceneManager._scene.settleBattle(); SceneManager._scene.returnHome()')
   scene('Scene_RPGHome')
   after_return=page.evaluate('RPGManager.state()')
   assert after_return['gold']==saved['gold'] and after_return['questCount']==saved['questCount'] and after_return['trips']['A']['id']==saved['trips']['A']['id']
   page.evaluate('RPGManager.skipTimer("return","A")')
   settled=page.evaluate('RPGManager.state()')
   expected_gold=100+page.evaluate('''id=>{const q=RPGManager.quests().find(v=>v.id===id);return q.rewardGold[measure.snapshot.status];}''',args.quest)
   assert settled['gold']==expected_gold and settled['questCount']==1 and settled['trips']['A'] is None
   assert settled['version']==16 and len(settled['questHistory'])==1
   assert settled['questHistory'][0]['teamKey']=='A' and settled['questHistory'][0]['participantIds']==team
   assert len(settled['lastReport']['memberStats'])==len(team) and settled['lastReport']['highlight']['id'] in team
   expected_damage=page.evaluate('''() => fixedBattle.events.filter(e=>e.type==="attack"&&e.side==="player").reduce((sum,e)=>sum+e.damage,0)''')
   assert sum(next(n for n in settled['roster'] if n['id']==id)['career']['damageDealt'] for id in team)==expected_damage
   if result['outcome']=='victory':
    assert all('first_victory' in next(n for n in settled['roster'] if n['id']==id)['career']['badges'] for id in team)
   page.evaluate('SceneManager._scene._commandWindow.callHandler("history")');scene('Scene_RPGHistory')
   assert page.evaluate('''() => SceneManager._scene._choices.maxItems()===2 && SceneManager._scene._details.contents.width>0''')
   page.evaluate('SceneManager.pop()');scene('Scene_RPGHome')
   assert page.evaluate('''async()=>{
    const before=JSON.stringify(RPGManager.state());await DataManager.saveGame(19);
    RPGManager.state().gold=-999;await DataManager.loadGame(19);
    const restored=JSON.stringify(RPGManager.state())===before;await StorageManager.remove(19);return restored;
   }''')
   page.screenshot(path=str(Path(tempfile.gettempdir())/'rpg-stage1-home.webp'))
  assert not errors,errors
  result.update(quest=args.quest,partySize=len(team),strategy=args.strategy,debug=args.debug)
  print(json.dumps(result),flush=True)
  browser.close()
finally:
 server.shutdown();server.server_close()
 if native_process and native_process.poll() is None:
  subprocess.run(['taskkill','/PID',str(native_process.pid),'/T','/F'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  native_process.wait(timeout=10)
 if native_temp:
  target=Path(native_temp.name).resolve()
  assert target.parent==Path(tempfile.gettempdir()).resolve() and target.name.startswith('rpg-stage1-native-')
  native_temp.cleanup()
