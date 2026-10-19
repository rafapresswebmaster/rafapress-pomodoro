"""Cozy fantasy visual acceptance in real MZ windows, including optional-art failure."""
import functools
import threading
import sys
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
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))

            def scene(name):
                page.wait_for_function("n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()", arg=name)

            def shot(name):
                if name == "title":
                    page.wait_for_function("SceneManager._scene._commandWindow.isOpen()&&!SceneManager._scene.isBusy()")
                page.wait_for_timeout(150)
                page.screenshot(path=str(OUTPUT / f"cozy-{width}-{name}.webp"))

            def home():
                page.evaluate("SceneManager.goto(window._cozyHomeClass)")
                scene("Scene_RPGHome")

            def command(symbol, target):
                page.evaluate("s=>SceneManager._scene._commandWindow.callHandler(s)", symbol)
                scene(target)

            def draw_bounds(window_key, refresh):
                result = page.evaluate("""({key,refresh})=>{
                  const w=SceneManager._scene[key],b=w.contents,original=b.drawText,draws=[];
                  b.drawText=function(text,x,y,width,height,align){draws.push({text,x,y,width,height});return original.call(this,text,x,y,width,height,align)};
                  try{refresh==='setNpc'?w.setNpc(RPGManager.state().roster[0]):w[refresh]();}
                  finally{b.drawText=original;}
                  return {width:w.innerWidth,height:w.innerHeight,draws};
                }""", {"key": window_key, "refresh": refresh})
                for d in result["draws"]:
                    assert d["width"] > 0 and d["height"] > 0, d
                    assert d["x"] >= 0 and d["x"] + d["width"] <= result["width"] + 1, d
                    assert d["y"] >= 0 and d["y"] + d["height"] <= result["height"] + 1, d

            page.goto(f"http://127.0.0.1:{server.server_port}/")
            scene("Scene_Title")
            page.evaluate("""({width,height})=>{Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;SceneManager.goto(SceneManager._scene.constructor)}""", {"width":width,"height":height})
            scene("Scene_Title")
            shot("title")
            if "--title-only" in sys.argv:
                assert page.evaluate("SceneManager._scene._commandWindow._list.some(c=>c.symbol==='newGame')")
                assert not errors,errors
                page.close()
                continue
            page.evaluate("SceneManager._scene.commandNewGame()"); page.wait_for_function('SceneManager._scene?.constructor.name==="Scene_RPGStartingRoster"&&SceneManager._scene.isStarted()'); page.evaluate('()=>{const s=SceneManager._scene;s._selected=["ada","bram","cora"];s.startParty()}')
            scene("Scene_RPGHome")
            page.evaluate("""({width,height})=>{
              window._cozyHomeClass=SceneManager._scene.constructor;
              Graphics.resize(width,height);Graphics.boxWidth=width;Graphics.boxHeight=height;
              const s=RPGManager.state(),P=RPGManagerProgression;s.gold=600;
              P.assignCampJob(s,s.roster[2].id,'rest');
              s.roster[0].name='Alder Mossfoot';
              P.assignCampJob(s,s.roster[0].id,'study');P.assignCampJob(s,s.roster[1].id,'work');
              SceneManager.goto(window._cozyHomeClass);
            }""", {"width": width, "height": height})
            scene("Scene_RPGHome")
            page.wait_for_function("SceneManager._scene._camp._hitRegions.length===3")
            assert page.evaluate("SceneManager._scene._camp.constructor.name==='Window_RPGCampsite'&&SceneManager._scene._companions.constructor.name==='Window_RPGCampRoster'")
            page.evaluate("()=>{const w=SceneManager._scene._camp;for(let i=0;i<2500;i++)w.updateCampers();w.refresh()}")
            assert page.evaluate("[...SceneManager._scene._camp._campers.values()].every(c=>c.pause===Infinity&&['work','study','rest'].includes(c.job))")
            assert page.evaluate("SceneManager._scene._commandWindow.maxPageRows()*SceneManager._scene._commandWindow.maxCols()>=SceneManager._scene._commandWindow.maxItems()")
            assert page.evaluate("SceneManager._scene._camp.x+SceneManager._scene._camp.width<SceneManager._scene._jobSummary.x")
            assert page.evaluate("SceneManager._scene._camp.y+SceneManager._scene._camp.height<SceneManager._scene._commandWindow.y")
            shot("home")

            command("battle", "Scene_RPGQuestBoard")
            page.evaluate("""()=>{const s=SceneManager._scene;s._choices.select(s._choices._list.findIndex(c=>c.symbol==='quest'&&c.enabled));s.refreshInfo();window._cozyBoardClass=s.constructor;}""")
            # Capture real detail drawing without relying on source text or color literals.
            result=page.evaluate("""()=>{
              const s=SceneManager._scene,w=s._info,b=w.contents,orig=b.drawText,draws=[];
              b.drawText=function(text,x,y,width,height,align){draws.push({text,x,y,width,height});return orig.call(this,text,x,y,width,height,align)};
              try{s.refreshInfo()}finally{b.drawText=orig}return{height:w.innerHeight,width:w.innerWidth,draws};
            }""")
            assert all(d["y"]+d["height"]<=result["height"]+1 for d in result["draws"]), result
            shot("quests")
            page.evaluate("""()=>{const s=SceneManager._scene;s._choices.select(s._choices._list.findIndex(c=>c.ext==='Long'));s._choices.callHandler('filter');s.refreshInfo()}""")
            shot("locked-contract")

            # Build the existing party through domain selection, then use normal board navigation.
            page.evaluate("""()=>{const state=RPGManager.state();state.teams.A=state.roster.map(n=>n.id);state.teamIds=state.teams.A.slice();state.pendingLeaderId=state.teamIds[0];const s=SceneManager._scene;s._choices.select(s._choices._list.findIndex(c=>c.ext==='Short'));s._choices.callHandler('filter');s._choices.select(s._choices._list.findIndex(c=>c.symbol==='quest'&&c.enabled));s._choices.callHandler('quest');}""")
            scene("Scene_RPGHome")
            shot("direct-dispatch")
            page.evaluate("RPGManagerProgression.recallExpedition(RPGManager.state());RPGManagerProgression.dismissQuestResults(RPGManager.state())")
            home()

            command("roster", "Scene_RPGRoster")
            draw_bounds("_detailsWindow", "setNpc")
            shot("roster")
            page.evaluate("SceneManager._scene._listWindow.select(SceneManager._scene._listWindow._list.findIndex(c=>c.symbol==='npc'));SceneManager._scene._listWindow.callHandler('npc')")
            scene("Scene_RPGMember")
            draw_bounds("_details", "refresh")
            shot("equipment")
            page.evaluate("SceneManager._scene._choices.selectSymbol('choose');SceneManager._scene._choices.callHandler('choose')")
            page.evaluate("SceneManager._scene._choices.callHandler('choose')")
            draw_bounds("_details", "refresh")
            shot("equipment-compare")
            home()

            for symbol, target in [("shop","Scene_RPGShop"),("altar","Scene_RPGAltar"),("campJobs","Scene_RPGCampJobs"),("graveyard","Scene_RPGRoster"),("save","Scene_Save")]:
                command(symbol,target)
                assert page.evaluate("SceneManager._scene._windowLayer.children.filter(w=>w.windowskin).every(w=>w._cozyVisual)"), target
                shot(symbol)
                home()

            # Real simulation/settlement is covered by post_sprint_smoke. Here the renderer is
            # stressed with a copied three-v-five log and long names, without touching the trip.
            page.evaluate("""()=>{
              const s=RPGManager.state(),P=RPGManagerProgression,q=RPGManager.quests().find(q=>q.combatMode==='required');s.teams.A=s.roster.map(n=>n.id);s.teamIds=s.teams.A.slice();
              P.dispatchQuest(s,'A',q,$dataRPGManagerQuests.xp,Date.now(),null,'standard',s.teams.A[0],q.durationMinutes);
              SceneManager.goto(window._cozyHomeClass);
            }""")
            scene("Scene_RPGHome")
            assert page.evaluate("!SceneManager._scene._camp.visible&&SceneManager._scene._teamPanel.width===Graphics.boxWidth-24")
            page.evaluate("""()=>{
              const panel=SceneManager._scene._teamPanel,trip=RPGManager.state().trips.A,visual=JSON.parse(JSON.stringify(trip));
              visual.presentationFighters=['player','enemy'].flatMap(side=>Array.from({length:side==='player'?3:5},(_,i)=>({key:`${side}:${i}`,side,name:side==='player'?RPGManager.state().roster[i].name:`Woodland Skeleton Archer ${i+1}`,portrait:side==='player'?RPGManager.state().roster[i].portrait:{sheet:'RPGManagerMonsters',index:i%3,columns:3,rows:1},health:3,maxHealth:5,armor:1,ward:1})));
              visual.presentationCurrent={kind:'battle',actorKey:'player:0',targetKey:'enemy:4',importance:'SIGNATURE',text:'Alder calls on a little woodland magic: Ward absorbs 1, Armor absorbs 1, and the target loses 1 HP. Every companion watches as the spell settles among the roots.',holdMs:2000,targetHealth:2,targetArmor:0,targetWard:0};visual.presentationDurationMs=2000;visual.presentationHoldMs=800;
              window._cozyVisual=visual;window._cozyOriginalDraw=panel.drawBattle;
              panel.drawBattle=function(){const before=JSON.stringify(visual);window._cozyOriginalDraw.call(this,visual);if(before!==JSON.stringify(visual))throw Error('Visual data mutated')};
            }""")
            shot("three-v-five")
            page.evaluate("window._cozyVisual.presentationFighters.forEach(f=>{f.armor=8;f.ward=45})")
            shot("stacked-defenses")
            for speed in ["reduced", "skip"]:
                page.evaluate("speed=>RPGManager.state().presentationSpeed=speed", speed)
                shot(speed)
            # Reloading a real active save remains usable with the new transient skin/art.
            page.evaluate("async()=>{$gameSystem.onBeforeSave();await DataManager.saveGame(1);await DataManager.loadGame(1);RPGManager.restoreSave();$gameSystem.onAfterLoad();}")
            assert page.evaluate("RPGManager.state().schemaVersion===21||RPGManager.state().version===21")
            home()
            assert not errors, errors
            page.close()

        if "--title-only" in sys.argv:
            print("PASS: title commands open and remain visible at both resolutions.")
            browser.close()
            sys.exit(0)
        page=browser.new_page(viewport={"width":816,"height":624})
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.route("**/CozyGuildCamp.webp",lambda route:route.abort())
        page.goto(f"http://127.0.0.1:{server.server_port}/")
        page.wait_for_function("SceneManager._scene?.constructor.name==='Scene_Title'&&SceneManager._scene.isStarted()")
        page.evaluate("SceneManager._scene.commandNewGame()"); page.wait_for_function('SceneManager._scene?.constructor.name==="Scene_RPGStartingRoster"&&SceneManager._scene.isStarted()'); page.evaluate('()=>{const s=SceneManager._scene;s._selected=["ada","bram","cora"];s.startParty()}')
        page.wait_for_function("SceneManager._scene?.constructor.name==='Scene_RPGHome'&&SceneManager._scene.isStarted()")
        page.wait_for_timeout(350)
        assert page.evaluate("SceneManager._scene._camp._hitRegions.length===3")
        page.screenshot(path=str(OUTPUT/"cozy-missing-art-fallback.webp"))
        page.evaluate("SceneManager._scene._commandWindow.callHandler('battle')")
        page.wait_for_function("SceneManager._scene?.constructor.name==='Scene_RPGQuestBoard'&&SceneManager._scene.isStarted()")
        assert not errors,errors
        print("PASS: 816x624 and 1280x720 core/secondary screens, text bounds, three-v-five immutable replay, legacy speed data, active save/load, and missing-art navigation fallback.")
        browser.close()
finally:
    server.shutdown()
