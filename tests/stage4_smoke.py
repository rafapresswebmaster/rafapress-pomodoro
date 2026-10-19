"""Stage 4 browser smoke with isolated storage and controlled timer skips."""
import functools, threading, tempfile
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    page = browser.new_page(viewport={'width': 816, 'height': 624}); errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    def scene(name): page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()&&!SceneManager._scene.isBusy()', arg=name)
    def frames(): page.wait_for_function('n=>Graphics.frameCount>=n+3', arg=page.evaluate('Graphics.frameCount'))
    def click(window, symbol, ext='ANY'):
      page.wait_for_function('k=>SceneManager._scene[k]?.isOpenAndActive()', arg=window)
      point=page.evaluate('''([key,symbol,ext])=>{const s=SceneManager._scene,w=s[key],i=w._list.findIndex(c=>c.symbol===symbol&&(ext==='ANY'||c.ext===ext));if(i<0)throw Error('Missing '+symbol+' '+ext);w.forceSelect(i);const r=w.itemRect(i);return{x:s._windowLayer.x+w.x+w.padding+r.x-w.origin.x+r.width/2,y:s._windowLayer.y+w.y+w.padding+r.y-w.origin.y+r.height/2};}''',[window,symbol,ext])
      page.mouse.click(point['x'],point['y']); frames()
    def home(symbol): click('_commandWindow',symbol)
    def state(): return page.evaluate('RPGManager.state()')

    page.goto(f'http://127.0.0.1:{server.server_port}/'); scene('Scene_Title'); page.evaluate('$dataRPGManagerUI.developerMode=true'); home('newGame'); scene('Scene_RPGHome')
    commands=page.evaluate('SceneManager._scene._commandWindow._list.map(e=>e.name)')
    assert any(n.startswith('Guild Hall') for n in commands) and any(n.startswith('Tavern') for n in commands) and not any(n.startswith('Teams') for n in commands) and 'Start Arrived Quest' not in commands and 'DEBUG' in commands
    assert state()['version']==19 and state()['teamBUnlocked'] is True and len(state()['recruit']['candidates'])==3 and all('stamina' not in n for n in state()['roster'])
    page.screenshot(path=str(Path(tempfile.gettempdir())/'rpg-stage5-home.webp'))
    home('roster'); scene('Scene_RPGRoster'); click('_listWindow','npc','ada'); scene('Scene_RPGMember')
    assert 'Set Up' not in page.evaluate('SceneManager._scene._choices._list.map(e=>e.name)')
    click('_choices','back'); scene('Scene_RPGRoster'); click('_listWindow','back'); scene('Scene_RPGHome')
    # Dispatch A through real UI, then B independently through the campaign API.
    home('battle'); scene('Scene_RPGQuestBoard'); page.screenshot(path=str(Path(tempfile.gettempdir())/'rpg-stage5-quest-board.webp')); click('_choices','quest','restless_crypt'); scene('Scene_RPGChooseTeam'); click('_choices','team','A'); scene('Scene_RPGRoster')
    click('_listWindow','npc','ada'); click('_listWindow','npc','bram'); click('_listWindow','confirm'); scene('Scene_RPGPreparation')
    click('_departure','depart'); click('_strategies','exploration'); scene('Scene_RPGHome')
    page.evaluate("""()=>{const s=RPGManager.state(),P=RPGManagerProgression,q=RPGManager.quests().find(q=>q.id==='warband_raid');for(const id of ['cora','dax'])P.assignTeam(s,id,'B');P.dispatchQuest(s,'B',q,$dataRPGManagerQuests.xp);}""")
    assert state()['trips']['A']['phase']=='outbound' and state()['trips']['B']['phase']=='outbound'
    locked=page.evaluate("RPGManagerProgression.equip(RPGManager.state(),'ada',null,1)")
    assert locked['ok'] is False and 'away' in locked['message']

    # Save/reload with both outbound timers intact.
    home('save'); scene('Scene_Save'); page.evaluate('async()=>{$gameSystem.onBeforeSave();await DataManager.saveGame(1);SceneManager.pop()}'); scene('Scene_RPGHome')
    ids=[state()['trips'][k]['id'] for k in ['A','B']]
    page.reload(); scene('Scene_Title')
    assert page.evaluate("SceneManager._scene._commandWindow._list.find(e=>e.symbol==='continue').enabled"), page.evaluate('DataManager._globalInfo')
    load_result=page.evaluate("async()=>{try{await DataManager.loadGame(1);RPGManager.restoreSave();$gameSystem.onAfterLoad();return 'ok'}catch(e){return String(e.stack||e)}}")
    assert load_result=='ok', load_result
    page.evaluate('$dataRPGManagerUI.developerMode=true;SceneManager._scene.commandContinue()')
    page.wait_for_timeout(2000)
    assert page.evaluate('SceneManager._scene?.constructor.name')=='Scene_RPGHome', (page.evaluate('SceneManager._scene?.constructor.name'), page.evaluate('SceneManager._scene?._loadError?._text'), errors)
    assert [state()['trips'][k]['id'] for k in ['A','B']]==ids

    # Outbound skip enters the same battle scene; settle presentation directly for smoke speed.
    page.evaluate("()=>{RPGManager.skipTimer('outbound','A');SceneManager._scene._commandWindow.refresh();SceneManager._scene.refreshTeamPanel()}"); frames()
    assert state()['trips']['A']['phase']=='ready' and page.evaluate('SceneManager._scene.constructor.name')=='Scene_RPGHome'
    page.screenshot(path=str(Path(tempfile.gettempdir())/'rpg-stage5-arrived.webp'))
    point=page.evaluate("""()=>{const s=SceneManager._scene,w=s._teamPanel,e=w._startRegions.find(e=>e.team==='A'),r=e.rect;return{x:s._windowLayer.x+w.x+w.padding+r.x+r.width/2,y:s._windowLayer.y+w.y+w.padding+r.y+r.height/2}}""")
    page.mouse.click(point['x'],point['y']); scene('Scene_RPGBattle'); page.screenshot(path=str(Path(tempfile.gettempdir())/'rpg-stage5-battle.webp'))
    page.evaluate("""()=>{const s=SceneManager._scene;while(s._battle.snapshot().status==='running')s._battle.step();s.settleBattle();}""")
    assert state()['trips']['A']['phase']=='return' and state()['trips']['B']['phase']=='outbound'
    home('home'); scene('Scene_RPGHome')
    before=state()['gold']; page.evaluate("RPGManager.skipTimer('return','A')"); frames()
    assert state()['trips']['A'] is None and state()['gold']>before
    settled=state()['gold']; page.evaluate("id=>RPGManagerProgression.completeReturn(RPGManager.state(),'A',id,Date.now()+1)", ids[0])
    assert state()['gold']==settled
    page.evaluate('SceneManager._scene._commandWindow.callHandler("report")'); scene('Scene_RPGReport'); page.screenshot(path=str(Path(tempfile.gettempdir())/'rpg-stage5-report.webp')); home('home'); scene('Scene_RPGHome')

    home('recruit'); scene('Scene_RPGRecruit'); page.screenshot(path=str(Path(tempfile.gettempdir())/'rpg-stage5-recruit.webp')); assert len(page.evaluate("SceneManager._scene._choices._list.filter(e=>e.symbol==='candidate')"))==3
    first=page.evaluate("SceneManager._scene._choices._list.find(e=>e.symbol==='candidate').ext")
    click('_choices','candidate',first); assert state()['roster'][-1]['id']==first
    page.evaluate("id=>RPGManager.recruit(id)",first); assert sum(1 for n in state()['roster'] if n['id']==first)==1
    click('_choices','refresh'); assert len(state()['recruit']['candidates'])==3
    click('_choices','back'); scene('Scene_RPGHome')

    home('debug'); scene('Scene_RPGDebugTimers'); assert any('Fast-track' in n for n in page.evaluate('SceneManager._scene._choices._list.map(e=>e.name)')) and not any('Rest' in n for n in page.evaluate('SceneManager._scene._choices._list.map(e=>e.name)'))
    page.screenshot(path=str(Path(tempfile.gettempdir())/'rpg-stage4-debug-timers.webp'))
    assert not errors, errors
    print('PASS: quest-first party formation, parallel dispatch, clickable START NOW, timer fast-track, reload, reward and recruit UI.', flush=True)
    browser.close()
finally:
  server.shutdown(); server.server_close()
