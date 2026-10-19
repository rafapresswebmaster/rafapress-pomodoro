"""Day 3 browser integration check against the real MZ game.

Run from the project root: python tests/day3_refinements_smoke.py
Requires Python, Playwright, and its Chromium browser. Uses an isolated profile
and localhost server; screenshots go to the system temporary directory. After
verifying normal automatic progression, the test shortens only the UI delay.
"""

import functools
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import tempfile
import threading

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def run():
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    errors = []
    screenshots = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
            )
            page = browser.new_page(viewport={"width": 816, "height": 624})
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("console", lambda message: errors.append(message.text)
                    if message.type == "error" else None)
            page.goto(f"http://127.0.0.1:{server.server_port}/")

            def shot(name):
                path = Path(tempfile.gettempdir()) / f"rpg-manager-refinements-{name}.webp"
                page.screenshot(path=str(path))
                screenshots.append(str(path))

            def scene(name):
                try:
                    page.wait_for_function("""name => {
                        const s = window.SceneManager && SceneManager._scene;
                        return s && s.constructor.name === name && s.isStarted()
                            && !s.isBusy() && [s._listWindow, s._commandWindow, s._logWindow, s._supplyWindow]
                            .some(w => w && w.isOpenAndActive());
                    }""", arg=name)
                except Exception:
                    print(json.dumps({"expectedScene": name, "errors": errors,
                                      "pageText": page.locator("body").inner_text(),
                                      "scene": page.evaluate("window.SceneManager && SceneManager._scene?.constructor.name")}), flush=True)
                    shot("failure")
                    raise
                print(f"Ready: {name}", flush=True)

            def entry(symbol, npc_id=None):
                # Scroll to the command, then activate using a real pointer click.
                point = page.evaluate("""({symbol, npcId}) => {
                    const s = SceneManager._scene;
                    const w = s._supplyWindow?.active ? s._supplyWindow : (s._listWindow || s._commandWindow);
                    const i = w._list.findIndex(e => e.symbol === symbol && (!npcId || e.ext === npcId));
                    if (i < 0) throw new Error('Missing command: ' + symbol);
                    w.forceSelect(i);
                    const r = w.itemRect(i);
                    return {
                        index: i,
                        x: s._windowLayer.x + w.x + w.padding + r.x - w.origin.x + r.width / 2,
                        y: s._windowLayer.y + w.y + w.padding + r.y - w.origin.y + r.height / 2
                    };
                }""", {"symbol": symbol, "npcId": npc_id})
                # Let MZ consume hover, down, and up on distinct render frames.
                # Fixed millisecond clicks can be lost under software rendering.
                def frames():
                    page.wait_for_function("n => Graphics.frameCount < n || Graphics.frameCount >= n + 2",
                                           arg=page.evaluate("Graphics.frameCount"))

                page.mouse.move(point["x"], point["y"])
                frames()
                page.evaluate("""index => {
                    const s = SceneManager._scene;
                    (s._supplyWindow?.active ? s._supplyWindow : (s._listWindow || s._commandWindow)).forceSelect(index);
                }""", point["index"])
                page.mouse.down()
                frames()
                page.mouse.up()
                frames()

            def snapshot():
                return page.evaluate("SceneManager._scene._battle.snapshot()")

            def finish_battle(expected=None):
                # The scene, not this test, calls the simulation's step function.
                page.evaluate("SceneManager._scene._stepInterval = 1")
                page.wait_for_function(
                    "SceneManager._scene._battle.snapshot().status !== 'running'",
                    timeout=30000,
                )
                page.wait_for_function(
                    "SceneManager._scene._commandWindow.isOpenAndActive()"
                )
                result = snapshot()
                if expected:
                    assert result["status"] == expected, result
                else:
                    assert result["status"] in ["victory", "defeat"], result
                assert page.evaluate("SceneManager._scene._commandWindow._list.find(e => e.symbol === 'home').enabled")
                assert page.evaluate("RPGManager.lastBattle.snapshot.status") == result["status"]
                assert page.evaluate("RPGManager.lastBattle.events.length") > 0
                assert all(fighter["health"] >= 0 for fighter in result["fighters"])
                return result

            def press(key):
                page.keyboard.down(key)
                page.wait_for_function("n => Graphics.frameCount < n || Graphics.frameCount >= n + 2",
                                       arg=page.evaluate("Graphics.frameCount"))
                page.keyboard.up(key)
                page.wait_for_function("n => Graphics.frameCount < n || Graphics.frameCount >= n + 2",
                                       arg=page.evaluate("Graphics.frameCount"))

            def click_window(name, symbol=None):
                point = page.evaluate("""({name, symbol}) => {
                    const s = SceneManager._scene, w = s[name];
                    if (symbol) w.forceSelect(w._list.findIndex(e => e.symbol === symbol));
                    const r = w.itemRect(w.index());
                    return {x:s._windowLayer.x+w.x+w.padding+r.x-w.origin.x+r.width/2,
                        y:s._windowLayer.y+w.y+w.padding+r.y-w.origin.y+r.height/2};
                }""", {"name": name, "symbol": symbol})
                page.mouse.move(point["x"], point["y"])
                page.mouse.down()
                page.wait_for_function("n => Graphics.frameCount < n || Graphics.frameCount >= n + 2",
                                       arg=page.evaluate("Graphics.frameCount"))
                page.mouse.up()
                page.wait_for_function("n => Graphics.frameCount < n || Graphics.frameCount >= n + 2",
                                       arg=page.evaluate("Graphics.frameCount"))

            def bar_point(part):
                return page.evaluate("""part => {
                    const s=SceneManager._scene, b=s._logScrollbar, g=b.geometry();
                    const y=part==='up'?16:part==='down'?b.innerHeight-16:part==='thumb'?g.thumbTop+g.thumbHeight/2:g.top+g.height/2;
                    return {x:s._windowLayer.x+b.x+b.padding+b.innerWidth/2,y:s._windowLayer.y+b.y+b.padding+y};
                }""",part)

            def click_bar(part):
                pt=bar_point(part)
                page.mouse.click(pt["x"],pt["y"],delay=100)
                page.wait_for_timeout(100)

            def save(slot):
                entry("save")
                scene("Scene_Save")
                page.evaluate("id => SceneManager._scene._listWindow.selectSavefile(id)", slot)
                press("Enter")
                scene("Scene_RPGHome")

            scene("Scene_Title")
            assert page.evaluate("SceneManager._scene._commandWindow._list.map(e=>e.name)") == ["Continue", "New Game", "Load"]
            assert page.evaluate("SceneManager._scene._commandWindow._list.filter(e=>e.symbol !== 'newGame').every(e=>!e.enabled)")
            entry("newGame")
            scene("Scene_RPGHome")
            entry("team")
            scene("Scene_RPGRoster")
            for id in ["ada", "bram", "cora"]: entry("npc", id)
            entry("confirm")
            scene("Scene_RPGHome")
            page.evaluate("RPGManager.roster().slice(0,3).forEach((n,i)=>n.stamina=[20,40,80][i]); SceneManager._scene.refreshTeamPanel()")
            shot("home-stamina")
            entry("rest")
            assert page.evaluate("RPGManager.roster().slice(0,3).map(n=>n.stamina)") == [60,80,100]
            shot("home-after-rest")
            entry("battle")
            scene("Scene_RPGBattle")
            assert page.evaluate("SceneManager._scene._battle.snapshot().fighters.filter(f=>f.side==='enemy').map(f=>f.name)") == ["Slime", "Skeleton", "Goblin"]
            assert not page.evaluate("SceneManager._scene._commandWindow._list.some(e=>e.symbol==='log')")
            page.wait_for_function("SceneManager._scene._battle.snapshot().actions >= 8", timeout=15000)
            old_scroll = page.evaluate("SceneManager._scene._logWindow.scrollY()")
            click_bar("up")
            assert page.evaluate("SceneManager._scene._logWindow.scrollY()") < old_scroll
            # New combat events must not pull a reader back to the bottom.
            history_scroll = page.evaluate("SceneManager._scene._logWindow.scrollY()")
            actions = page.evaluate("SceneManager._scene._battle.snapshot().actions")
            page.wait_for_function("n=>SceneManager._scene._battle.snapshot().actions>=n+2", arg=actions)
            assert page.evaluate("SceneManager._scene._logWindow.scrollY()") == history_scroll
            assert page.evaluate("SceneManager._scene._commandWindow.active")
            click_bar("down")
            assert page.evaluate("SceneManager._scene._logWindow.scrollY()") > history_scroll
            page.mouse.move(380,400)
            page.mouse.wheel(0,-480)
            page.wait_for_timeout(150)
            shot("monsters-log-arrows")
            finish_battle("victory")
            assert page.evaluate("SceneManager._scene._battle.snapshot().fighters.filter(n=>n.side==='player').every(n=>n.alive)")
            # Drag the scrollbar thumb; text remains read-only.
            start=bar_point("thumb")
            end=bar_point("up")
            page.mouse.move(start["x"],start["y"])
            page.mouse.down()
            page.mouse.move(end["x"],end["y"]+25,steps=10)
            page.wait_for_timeout(150)
            page.mouse.up()
            assert page.evaluate("SceneManager._scene._logWindow.scrollY()") < page.evaluate("SceneManager._scene._logWindow.maxScrollY()") * 0.25
            page.mouse.click(240,380,delay=100)
            assert page.evaluate("SceneManager._scene._logWindow.index()") == -1
            shot("vertical-scrollbar")
            # Can leave using the mouse immediately after browsing, with no Esc.
            click_bar("up")
            entry("home")
            scene("Scene_RPGHome")
            entry("report")
            scene("Scene_RPGReport")
            page.mouse.click(260,160,delay=100)
            assert page.evaluate("SceneManager._scene.constructor.name") == "Scene_RPGReport"
            assert page.evaluate("SceneManager._scene._logWindow.index()") == -1
            assert page.evaluate("SceneManager._scene._logWindow._lines[0]").startswith("Quest 1:")
            entry("home")
            scene("Scene_RPGHome")
            entry("battle")
            scene("Scene_RPGBattle")
            finish_battle()
            entry("home")
            scene("Scene_RPGHome")
            entry("report")
            scene("Scene_RPGReport")
            assert page.evaluate("SceneManager._scene._logWindow._lines[0]").startswith("Quest 2:")
            assert not page.evaluate("SceneManager._scene._logWindow._lines.some(s=>s.startsWith('Quest 1:'))")
            shot("read-only-report")
            entry("home")
            scene("Scene_RPGHome")
            # Item first; invalid targets are visibly disabled and consume nothing.
            page.evaluate("RPGManager.roster().forEach(n=>{n.health=n.maxHealth;n.injury=null}); RPGManager.roster()[1].health-=30; RPGManager.roster()[1].injury='Wounded'")
            entry("supplies")
            scene("Scene_RPGSupplies")
            assert page.evaluate("SceneManager._scene._supplyWindow.active && !SceneManager._scene._listWindow.active")
            entry("potion")
            assert not page.evaluate("SceneManager._scene._listWindow._list.find(e=>e.ext==='ada').enabled")
            entry("npc","ada")
            assert page.evaluate("RPGManager.state().supplies.potion") == 6
            entry("npc","bram")
            assert page.evaluate("RPGManager.state().supplies.potion") == 5
            assert not page.evaluate("SceneManager._scene._listWindow._list.find(e=>e.ext==='bram').enabled")
            shot("potion-targets")
            entry("back")
            entry("medkit")
            assert page.evaluate("SceneManager._scene._listWindow._list.filter(e=>e.symbol==='npc'&&e.enabled).map(e=>e.ext)") == ["bram"]
            entry("npc","ada")
            assert page.evaluate("RPGManager.state().supplies.medkit") == 3
            entry("npc","bram")
            assert page.evaluate("RPGManager.roster()[1].injury") is None
            assert not page.evaluate("SceneManager._scene._listWindow._list.find(e=>e.ext==='bram').enabled")
            shot("medkit-targets")
            entry("back")
            entry("back")
            scene("Scene_RPGHome")
            save(1)
            first = page.evaluate("RPGManager.state()")
            page.evaluate("RPGManager.roster()[0].stamina = 73")
            save(2)
            second = page.evaluate("RPGManager.state()")
            entry("title")
            scene("Scene_Title")
            shot("title-menu")
            entry("continue")
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.state()") == second
            entry("title")
            scene("Scene_Title")
            entry("load")
            scene("Scene_Load")
            page.evaluate("SceneManager._scene._listWindow.selectSavefile(1)")
            click_window("_listWindow")
            page.wait_for_function("SceneManager._scene._actionsWindow.active")
            click_window("_actionsWindow", "load")
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.state()") == first
            entry("title")
            scene("Scene_Title")
            entry("load")
            scene("Scene_Load")
            page.evaluate("SceneManager._scene._listWindow.selectSavefile(2)")
            click_window("_listWindow")
            page.wait_for_function("SceneManager._scene._actionsWindow.active")
            shot("file-actions")
            click_window("_actionsWindow", "delete")
            assert page.evaluate("SceneManager._scene._deleteId") == 2
            shot("delete-confirmation")
            click_window("_deleteConfirm", "no")
            assert page.evaluate("DataManager.savefileExists(2)")
            click_window("_actionsWindow", "delete")
            click_window("_deleteConfirm", "yes")
            page.wait_for_function("!SceneManager._scene._deleteBusy && !DataManager.savefileInfo(2)")
            assert not page.evaluate("DataManager.savefileExists(2)")
            assert page.evaluate("DataManager.savefileExists(1)")
            assert not page.evaluate("SceneManager._scene._actionsWindow.visible")
            shot("load-after-deletion")
            press("Escape")
            scene("Scene_Title")
            page.reload()
            scene("Scene_Title")
            assert not page.evaluate("DataManager.savefileInfo(2)")
            entry("continue")
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.state()") == first
            entry("title")
            scene("Scene_Title")
            entry("load")
            scene("Scene_Load")
            page.evaluate("SceneManager._scene._listWindow.selectSavefile(1)")
            press("Enter")
            page.wait_for_function("SceneManager._scene._actionsWindow.active")
            press("ArrowDown")
            press("Enter")
            page.wait_for_function("SceneManager._scene._deleteConfirm.active")
            press("Enter")
            assert page.evaluate("DataManager.savefileExists(1)")
            click_window("_actionsWindow", "delete")
            click_window("_deleteConfirm", "yes")
            page.wait_for_function("!SceneManager._scene._deleteBusy && !DataManager.isAnySavefileExists()")
            press("Escape")
            scene("Scene_Title")
            assert page.evaluate("SceneManager._scene._commandWindow._list.filter(e=>e.symbol!=='newGame').every(e=>!e.enabled)")
            assert not errors, errors
            browser.close()
            print(json.dumps({"result":"PASS","checks":"monster portraits, home stamina/rest, vertical scrollbar and dragging, read-only latest report, item-first supplies and grey targets, mouse-only return, title order, Continue latest, Load chosen slot, cancel/delete one slot, remaining Continue, delete last slot, reload persistence", "screenshots": screenshots}, indent=2))
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    run()

