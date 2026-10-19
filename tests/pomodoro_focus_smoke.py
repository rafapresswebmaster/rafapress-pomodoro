"""Real MZ browser acceptance for the fixed-trio focus loop and settled results."""
import functools
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "tests" / "visuals"
OUTPUT.mkdir(exist_ok=True)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        for width, height in [(816, 624), (1280, 720)]:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.set_default_timeout(15000)
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))

            def scene(name):
                try:
                    page.wait_for_function("n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()", arg=name, timeout=15000)
                except Exception:
                    print("Scene failure", name, errors, page.evaluate("document.body.innerText"), flush=True)
                    raise

            def shot(name):
                page.screenshot(path=str(OUTPUT / f"focus-{width}-{name}.webp"))

            def home():
                page.evaluate("SceneManager.goto(window._focusHome)")
                scene("Scene_RPGHome")

            def command(symbol, target):
                page.evaluate("s=>SceneManager._scene._commandWindow.callHandler(s)", symbol)
                scene(target)

            def bounds(key, action):
                result = page.evaluate("""({key,action})=>{
                    const w=SceneManager._scene[key],b=w.contents,orig=b.drawText,draws=[];
                    b.drawText=function(text,x,y,width,height,align){draws.push({text,x,y,width,height});return orig.call(this,text,x,y,width,height,align)};
                    try{if(action==='results')w.drawResults(RPGManager.state().questResults);else if(action==='quest')SceneManager._scene.refreshInfo();else w[action]();}finally{b.drawText=orig;}
                    return {width:w.innerWidth,height:w.innerHeight,draws};
                }""", {"key": key, "action": action})
                for d in result["draws"]:
                    assert d["width"] > 0 and d["height"] > 0, d
                    assert 0 <= d["x"] and d["x"] + d["width"] <= result["width"] + 1, d
                    assert 0 <= d["y"] and d["y"] + d["height"] <= result["height"] + 1, d
                return result

            page.goto(f"http://127.0.0.1:{server.server_port}/")
            scene("Scene_Title")
            page.evaluate("SceneManager._scene.commandNewGame()"); page.wait_for_function('SceneManager._scene?.constructor.name==="Scene_RPGStartingRoster"&&SceneManager._scene.isStarted()'); page.evaluate('()=>{const s=SceneManager._scene;s._selected=["ada","bram","cora"];s.startParty()}')
            scene("Scene_RPGHome")
            page.evaluate("""({width,height})=>{
                window._focusHome=SceneManager._scene.constructor;
                Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;
                const s=RPGManager.state(),P=RPGManagerProgression;
                P.assignCampJob(s,'ada','study');P.assignCampJob(s,'bram','work');P.assignCampJob(s,'cora','rest');
                SceneManager.goto(window._focusHome);
            }""", {"width": width, "height": height})
            scene("Scene_RPGHome")
            symbols=page.evaluate("SceneManager._scene._commandWindow._list.map(c=>c.symbol)")
            assert symbols == ["roster", "battle", "shop", "recruit", "altar", "graveyard", "campJobs", "completionAlert", "save", "title"], symbols
            assert page.evaluate("RPGManager.roster().map(n=>n.id).join(',')") == "ada,bram,cora"
            bounds("_commandWindow", "refresh")
            shot("home-jobs")
            command("campJobs", "Scene_RPGCampJobs")
            assert "WORKSHOP" in page.evaluate("SceneManager._scene._choices._list.map(c=>c.name).join('|')")
            page.evaluate("""()=>{const s=SceneManager._scene;s._choices.select(s._choices._list.findIndex(c=>c.ext==='study'));s.choose();s._choices.select(s._choices._list.findIndex(c=>c.ext==='cora'));s.choose();}""")
            assert page.evaluate("RPGManagerProgression.campJobFor(RPGManager.state(),'cora')") == "study"
            shot("camp-jobs")
            home()
            command("roster", "Scene_RPGRoster")
            page.evaluate("SceneManager._scene._listWindow.select(SceneManager._scene._listWindow._list.findIndex(c=>c.ext==='ada'));SceneManager._scene.onNpc()")
            scene("Scene_RPGMember")
            assert not page.evaluate("SceneManager._scene.entries().some(c=>['repair'].includes(c.ext))")
            shot("equipment")
            home()
            command("battle", "Scene_RPGQuestBoard")
            page.evaluate("""()=>{const s=SceneManager._scene;s._choices.select(s._choices._list.findIndex(c=>c.symbol==='quest'&&c.enabled));s.refreshInfo();}""")
            bounds("_info", "quest")
            shot("quest")
            page.evaluate("SceneManager._scene.chooseQuest()")
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.state().trips.A.team.map(n=>n.id).join(',')") == "ada,bram,cora"
            assert page.evaluate("RPGManager.state().roster.every(n=>RPGManagerProgression.isUnavailable(RPGManager.state(),n.id))")
            shot("travel-outbound")
            page.evaluate("""()=>{
                const s=RPGManager.state(),t=s.trips.A;
                RPGManagerProgression.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);
                RPGManagerProgression.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);
                RPGManagerProgression.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);
                RPGManagerProgression.tickPresentation(t,5000,'standard',$dataRPGManagerQuests.presentation);
            }""")
            page.wait_for_timeout(200)
            shot("encounter")
            page.evaluate("""()=>{
                const s=RPGManager.state(),t=s.trips.A,P=RPGManagerProgression;
                P.debugAdvanceExpedition(s,$dataRPGManagerQuests,RPGManagerBattle.Battle);
                P.tickPresentation(t,5000,'skip',$dataRPGManagerQuests.presentation);
                SceneManager._scene.refreshTeamPanel();window._returnScroll=SceneManager._scene._teamPanel._roadScroll;
            }""")
            page.wait_for_function("SceneManager._scene._teamPanel._roadScroll<window._returnScroll",timeout=8000)
            shot("travel-return")
            # Settlement is immediate, even when there is a complete unseen battle queue.
            page.evaluate("RPGManagerProgression.debugAdvanceExpedition(RPGManager.state(),$dataRPGManagerQuests,RPGManagerBattle.Battle,true)")
            page.wait_for_function("RPGManager.state().questResults&&SceneManager._scene._teamPanel._results")
            assert page.evaluate("RPGManager.state().questResults.members.length") == 3
            bounds("_teamPanel", "results")
            shot("results")
            saved=page.evaluate("JSON.stringify(RPGManager.state().questResults)")
            history=page.evaluate("RPGManager.state().questHistory.length")
            page.evaluate("DataManager.saveGame(7)")
            assert page.evaluate("async()=>{await DataManager.loadGame(7);return true}")
            home()
            assert page.evaluate("JSON.stringify(RPGManager.state().questResults)") == saved
            assert page.evaluate("RPGManager.state().questHistory.length") == history
            page.evaluate("""()=>{const w=SceneManager._scene._teamPanel;w._resultPage=1;w.drawResults(RPGManager.state().questResults)}""")
            bounds("_teamPanel", "results")
            shot("result-details")
            # Synthetic rendering stress never modifies settled rewards or campaign state.
            page.evaluate("""()=>{
                const r=JSON.parse(JSON.stringify(RPGManager.state().questResults));
                r.members[0].name='Alder Mossfoot the Patient Founder';r.members[0].permanentWounds=['Missing Eye','Bad Knee','Mangled Hand','Nerve Damage'];
                r.members[1].condition='Dead';r.members[1].health=0;
                r.members[2].levelledUp=true;r.members[2].level=6;
                r.rewardGold=123456789;r.rewardArcana=987654321;
                r.items=Array.from({length:18},(_,i)=>({name:'An unusually long named woodland keepsake '+i,quantity:i+1}));
                window._stressResult=r;const w=SceneManager._scene._teamPanel,original=w.drawResults;
                w.drawResults=function(){original.call(this,r)};w._resultPage=0;w.drawResults(r);
            }""")
            shot("results-stress")
            pages=page.evaluate("SceneManager._scene._teamPanel._resultPages")
            for index in range(pages):
                page.evaluate("i=>{const w=SceneManager._scene._teamPanel;w._resultPage=i;w.drawResults(window._stressResult)}", index)
                bounds("_teamPanel", "results")
            home()
            page.evaluate("SceneManager._scene._teamPanel._recallHandler()")
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.state().questResults===null")
            assert page.evaluate("RPGManager.state().questHistory.length") == history
            # Dead founders block automatic dispatch with an explicit explanation.
            page.evaluate("RPGManagerProgression.applyDeath(RPGManager.state(),'ada','Browser acceptance')")
            command("battle", "Scene_RPGQuestBoard")
            page.evaluate("SceneManager._scene._choices.select(SceneManager._scene._choices._list.findIndex(c=>c.symbol==='quest'&&c.enabled));SceneManager._scene.chooseQuest()")
            assert page.evaluate("SceneManager._scene.constructor.name") == "Scene_RPGQuestBoard"
            assert page.evaluate("RPGManager.state().trips.A===null")
            shot("dispatch-blocked")
            page.evaluate("""()=>{const s=RPGManager.state(),P=RPGManagerProgression;s.arcana=150;P.ritualUnlock(s,'reanimate');if(!P.ritualCast(s,'reanimate','ada').ok)throw Error('Reanimation failed')}""")
            home()
            page.wait_for_timeout(200)
            shot("reanimated-static-sprite")
            assert not errors, errors
            print(f"PASS {width}x{height}: direct trio dispatch, job reassignment, no retired controls, settled results/save/load/dismiss, death block; zero page errors", flush=True)
            page.close()
        browser.close()
finally:
    server.shutdown()
