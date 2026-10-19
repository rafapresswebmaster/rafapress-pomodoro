"""Real MZ active slots, free Tavern, visible background countdown and completion cue."""
import functools
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'tests'/'visuals'
OUTPUT.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for width,height in [(816,624),(1280,720)]:
            page=browser.new_page(viewport={'width':width,'height':height})
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            def scene(name):
                try:
                    page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name,timeout=15000)
                except Exception:
                    print('Scene failed',name,errors,page.evaluate('document.body.innerText'),flush=True)
                    raise
            def shot(name):page.screenshot(path=str(OUTPUT/f'sprint-{width}-{name}.webp'))
            def home():
                page.evaluate('SceneManager.goto(window._sprintHome)');scene('Scene_RPGHome')
            def command(symbol,target):
                page.evaluate('s=>SceneManager._scene._commandWindow.callHandler(s)',symbol);scene(target)
            def choose(ext):
                page.evaluate('ext=>{const s=SceneManager._scene;s._choices.select(s._choices._list.findIndex(c=>c.ext===ext));s.choose()}',ext)
            def depart():
                command('battle','Scene_RPGQuestBoard')
                page.evaluate('SceneManager._scene._choices.select(SceneManager._scene._choices._list.findIndex(c=>c.symbol==="quest"&&c.enabled));SceneManager._scene.chooseQuest()')
                scene('Scene_RPGHome')
            def finish():page.evaluate('RPGManagerProgression.debugAdvanceExpedition(RPGManager.state(),$dataRPGManagerQuests,RPGManagerBattle.Battle,true)')
            def bounds():
                result=page.evaluate('''()=>{
                    const s=SceneManager._scene,w=s._teamPanel,b=w.contents,old=b.drawText,draws=[];
                    b.drawText=function(text,x,y,width,height,align){draws.push({text,x,y,width,height,size:b.fontSize});return old.call(this,text,x,y,width,height,align)};
                    try{s.refreshTeamPanel(false)}finally{b.drawText=old}return{w:w.innerWidth,h:w.innerHeight,draws};
                }''')
                for d in result['draws']:
                    assert d['width']>0 and d['height']>0,d
                    assert d['x']>=0 and d['x']+d['width']<=result['w']+1,d
                    assert d['y']>=0 and d['y']+d['height']<=result['h']+1,d
                clock=[d for d in result['draws'] if d['text']==page.evaluate('SceneManager._scene._teamPanel._displayCountdown')]
                assert len(clock)==1 and clock[0]['size']==40,result
                assert clock[0]['x']==8 and clock[0]['y']==0,clock
                assert all(d['size']<=40 for d in result['draws']),result
                return result

            page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title')
            page.evaluate('SceneManager._scene.commandNewGame()'); page.wait_for_function('SceneManager._scene?.constructor.name==="Scene_RPGStartingRoster"&&SceneManager._scene.isStarted()'); page.evaluate('()=>{const s=SceneManager._scene;s._selected=["ada","bram","cora"];s.startParty()}');scene('Scene_RPGHome')
            page.evaluate('''({width,height})=>{
                window._sprintHome=SceneManager._scene.constructor;Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;
                const s=RPGManager.state();s.gold=0;s.equipmentStock.chainmail=1;RPGManagerProgression.equipSlot(s,"ada","chainmail","body");s.roster[0].equipmentCondition.chainmail.current=0;window._chimes=0;window._nativeBuffer=AudioManager.createBuffer;
                AudioManager.createBuffer=function(folder,name){if(folder==='se/'&&name==='Chime1'){
                    window._chimes++;const callbacks=[],fake={isError:()=>false,addStopListener(cb){callbacks.push(cb)},stop(){while(callbacks.length)callbacks.shift()()},destroy(){this.stop()},play(){if(window._failAlert)throw Error('Test alert failure');setTimeout(()=>this.stop(),30)}};return fake;
                }return window._nativeBuffer.call(this,folder,name);};
                SceneManager.goto(window._sprintHome);
            }''',{'width':width,'height':height});scene('Scene_RPGHome')
            symbols=page.evaluate('SceneManager._scene._commandWindow._list.map(c=>c.symbol)')
            assert symbols==['roster','battle','shop','recruit','altar','graveyard','campJobs','completionAlert','save','title'],symbols
            assert page.evaluate('RPGManager.state().activeSlots.join(",")')=='ada,bram,cora'
            page.evaluate('SceneManager._scene._commandWindow.callHandler("completionAlert")')
            assert page.evaluate('RPGManager.state().completionAlerts') is False
            page.evaluate('SceneManager._scene._commandWindow.callHandler("completionAlert")')
            assert page.evaluate('RPGManager.state().completionAlerts') is True
            shot('ready')

            command('roster','Scene_RPGRoster')
            page.evaluate('SceneManager._scene._listWindow.select(SceneManager._scene._listWindow._list.findIndex(c=>c.ext==="ada"));SceneManager._scene.onNpc()')
            scene('Scene_RPGMember');choose('dismiss')
            assert page.evaluate('RPGManagerProgression.activeRoster(RPGManager.state()).length')==3
            shot('dismiss-confirmation');choose('cancelDismiss')
            assert page.evaluate('RPGManagerProgression.activeRoster(RPGManager.state()).length')==3
            choose('dismiss');choose('confirmDismiss');scene('Scene_RPGRoster')
            assert page.evaluate('RPGManager.state().roster.find(n=>n.id==="ada").dismissed')
            assert page.evaluate('RPGManagerProgression.graveyard(RPGManager.state()).length')==0
            page.evaluate('SceneManager._scene._listWindow.callHandler("tavern")');scene('Scene_RPGTavern');shot('free-tavern')
            page.evaluate('SceneManager._scene._choices.select(0);SceneManager._scene.hire()')
            assert page.evaluate('RPGManagerProgression.activeRoster(RPGManager.state()).length')==3
            assert page.evaluate('RPGManager.state().gold')==0
            assert page.evaluate('''()=>{const s=RPGManager.state(),P=RPGManagerProgression,id=s.activeSlots[0];return P.equipSlot(s,id,'chainmail','body').ok&&P.equipmentArmor(s.roster.find(n=>n.id===id))===0}''')
            home()
            # Several vacancies, including all slots empty, must never trap the player at zero Gold.
            page.evaluate('RPGManagerProgression.applyDeath(RPGManager.state(),"bram","test");RPGManagerProgression.applyDeath(RPGManager.state(),"cora","test");RPGManagerProgression.applyDeath(RPGManager.state(),RPGManagerProgression.activeRoster(RPGManager.state())[0].id,"test")')
            home();shot('all-slots-empty')
            command('recruit','Scene_RPGTavern')
            for count in range(1,4):
                page.evaluate('SceneManager._scene._choices.select(0);SceneManager._scene.hire()')
                assert page.evaluate('RPGManagerProgression.activeRoster(RPGManager.state()).length')==count
                assert page.evaluate('RPGManager.state().gold')==0
            home();command('graveyard','Scene_RPGRoster')
            assert page.evaluate('SceneManager._scene._listWindow._list.filter(c=>c.symbol==="npc").length')==3
            assert not page.evaluate('SceneManager._scene._listWindow._list.some(c=>c.ext==="ada")')
            shot('graveyard');home()
            depart()
            assert page.evaluate('RPGManager.state().trips.A.team.map(n=>n.id).join(",")===RPGManager.state().activeSlots.join(",")')
            assert page.evaluate('!RPGManagerProgression.dismissAdventurer(RPGManager.state(),RPGManager.state().activeSlots[0],true).ok')
            bounds();shot('running-clock')
            # Exercise the actual MZ focus gate, record bitmap clock paints, and leave rendering visible.
            before=page.evaluate('''()=>{
                window._nativeActive=SceneManager.isGameActive;SceneManager.isGameActive=()=>false;
                const s=SceneManager._scene,update=s.update;s.update=function(){window._inactiveUpdates++;return update.call(this)};
                window._inactiveUpdates=0;window._clockPaints=[];const b=s._teamPanel.contents,draw=b.drawText;
                b.drawText=function(text,x,y,w,h,align){if(x===8&&y===0)window._clockPaints.push(String(text));return draw.call(this,text,x,y,w,h,align)};
                return{remaining:RPGManager.state().trips.A.remainingMs,time:Date.now()};
            }''')
            page.wait_for_timeout(6500)
            after=page.evaluate('({remaining:RPGManager.state().trips.A.remainingMs,time:Date.now(),paints:window._clockPaints,updates:window._inactiveUpdates,visible:!document.hidden,display:SceneManager._scene._teamPanel._displayCountdown})')
            assert after['visible'] and after['updates']==0,after
            assert before['remaining']-after['remaining']>=5500,(before,after)
            assert len(set(after['paints']))>=5,after
            assert page.evaluate('''()=>{const n=Math.ceil(RPGManager.state().trips.A.remainingMs/1000);return SceneManager._scene._teamPanel._displayCountdown===`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}'''),after
            shot('unfocused-visible-clock')
            finish();page.wait_for_function('window._chimes===1&&SceneManager._scene._teamPanel._displayCountdown==="00:00"&&SceneManager._scene._teamPanel._displaySessionState==="Complete"')
            bounds();shot('complete-unfocused')
            page.evaluate('SceneManager.isGameActive=window._nativeActive')
            saved=page.evaluate('JSON.stringify(RPGManager.state().questResults)')
            page.evaluate('async()=>{$gameSystem.onBeforeSave();await DataManager.saveGame(9);await DataManager.loadGame(9);RPGManager.restoreSave();$gameSystem.onAfterLoad()}');home()
            assert page.evaluate('JSON.stringify(RPGManager.state().questResults)')==saved
            assert page.evaluate('window._chimes')==1
            page.evaluate('SceneManager._scene._teamPanel._recallHandler()');scene('Scene_RPGHome')
            assert page.evaluate('window._chimes')==1

            # Minimized/hidden rendering stays quiet while clocks and a muted completion settle.
            page.evaluate('SceneManager._scene._commandWindow.callHandler("completionAlert")');depart()
            page.evaluate('''()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>"hidden"});SceneManager.isGameActive=()=>false;window._hiddenClock=SceneManager._scene._teamPanel._displayCountdown}''')
            finish();page.wait_for_function('RPGManager.state().completionCue.pending===false')
            assert page.evaluate('SceneManager._scene._teamPanel._displayCountdown===window._hiddenClock')
            assert page.evaluate('window._chimes')==1
            page.evaluate('delete document.hidden;delete document.visibilityState;window.dispatchEvent(new Event("focus"))')
            assert page.evaluate('SceneManager._scene._teamPanel._displaySessionState')=='Complete'
            assert page.evaluate('SceneManager._scene._teamPanel._displayCountdown')=='00:00'
            shot('restored-muted-complete')
            page.evaluate('SceneManager.isGameActive=window._nativeActive;SceneManager._scene._teamPanel._recallHandler()');scene('Scene_RPGHome')

            # A failed sound never blocks settled death results or the free replacement route.
            page.evaluate('SceneManager._scene._commandWindow.callHandler("completionAlert");window._failAlert=true');depart()
            page.evaluate('RPGManagerProgression.applyDeath(RPGManager.state(),RPGManager.state().activeSlots[0],"test")');finish()
            page.wait_for_function('RPGManager.state().completionAlertError&&SceneManager._scene._teamPanel._results')
            assert page.evaluate('RPGManager.state().questResults.members.some(n=>n.condition==="Dead")')
            assert page.evaluate('window._chimes')==2
            bounds();shot('death-results')
            page.evaluate('SceneManager._scene._teamPanel._recallHandler()');scene('Scene_RPGHome');command('recruit','Scene_RPGTavern')
            page.evaluate('RPGManager.state().gold=0;SceneManager._scene._choices.select(0);SceneManager._scene.hire()')
            assert page.evaluate('RPGManagerProgression.activeRoster(RPGManager.state()).length')==3
            assert page.evaluate('RPGManager.state().gold')==0
            assert page.evaluate('window._chimes')==2
            # A real failed audio request must remain outside MZ's fatal audio cache.
            home();page.route('**/audio/se/Chime1.ogg',lambda route:route.abort())
            page.evaluate('AudioManager.createBuffer=window._nativeBuffer;window._failAlert=false');depart();finish()
            page.wait_for_function('RPGManager.state().completionAlertError==="Completion sound unavailable."&&RPGManager.state().completionCue.pending===false&&SceneManager._scene._teamPanel._results')
            page.evaluate('AudioManager.checkErrors()')
            assert page.evaluate('SceneManager._scene.isStarted()&&!SceneManager._stopped')
            assert not errors,errors
            print(f'PASS {width}x{height}: confirmed dismissal, zero-Gold vacancies/free hires, Graveyard, automatic slots, largest fixed clock, inactive visible bitmap ticks with zero scene updates, muted hidden/restore, once-only alert/reload/synchronous and real asynchronous audio failures, death-to-Tavern; zero page errors',flush=True)
            page.close()
        browser.close()
finally:server.shutdown()
