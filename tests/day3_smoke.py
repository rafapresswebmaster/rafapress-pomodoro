"""Day 3 browser integration check against the real MZ game.

Run from the project root: python tests/day3_smoke.py
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
                path = Path(tempfile.gettempdir()) / f"rpg-manager-day3-{name}.webp"
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

            scene("Scene_Title")
            press("Enter")
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.state().supplies") == {"potion": 6, "medkit": 3}
            assert not page.evaluate("SceneManager._scene._commandWindow._list.find(e => e.symbol === 'battle').enabled")
            entry("graveyard")
            scene("Scene_RPGRoster")
            assert page.evaluate("SceneManager._scene._listWindow._list.filter(e => e.symbol === 'npc').length") == 0
            entry("back")
            scene("Scene_RPGHome")
            entry("team")
            scene("Scene_RPGRoster")
            for npc_id in ["ada", "bram", "cora"]:
                entry("npc", npc_id)
            shot("portrait-details")
            entry("confirm")
            scene("Scene_RPGHome")
            shot("home-team")
            templates = page.evaluate("[$dataRPGManagerRoster, $dataRPGManagerEnemyTeam]")
            entry("battle")
            scene("Scene_RPGBattle")
            page.wait_for_function("SceneManager._scene._battle.snapshot().actions >= 6", timeout=15000)
            shot("battle-portraits")
            finish_battle()
            assert page.evaluate("RPGManager.state().questCount") == 1
            assert page.evaluate("RPGManager.roster().slice(0,3).every(n => n.xp === 60 && n.stamina === 80)")
            assert page.evaluate("RPGManager.roster().slice(3).every(n => n.xp === 0 && n.stamina === 100)")
            # Waiting and reviewing a completed battle cannot award XP twice.
            state_after = page.evaluate("RPGManager.state()")
            press("PageUp")
            assert page.evaluate("RPGManager.state()") == state_after
            entry("home")
            scene("Scene_RPGHome")
            entry("report")
            scene("Scene_RPGReport")
            shot("quest-report")
            press("Escape")
            scene("Scene_RPGHome")

            # Controlled weak team: exercise first knockout via real combat.
            page.evaluate("""() => RPGManager.roster().slice(0,3).forEach(n => {
                n.health = 1; n.attack = 0; n.speed = 0; n.injury = null;
            })""")
            entry("battle")
            scene("Scene_RPGBattle")
            finish_battle("defeat")
            assert page.evaluate("RPGManager.roster().slice(0,3).every(n => n.alive && n.injury === 'Wounded' && n.level === 2 && n.passiveTrait.rank === 2)")
            assert page.evaluate("Object.values(RPGManager.state().bonds).every(n => n === 2)")
            entry("home")
            scene("Scene_RPGHome")
            entry("roster")
            scene("Scene_RPGRoster")
            shot("level-injury-bond")
            entry("back")
            scene("Scene_RPGHome")
            entry("supplies")
            scene("Scene_RPGSupplies")
            before_hp = page.evaluate("RPGManager.roster()[0].health")
            entry("potion")
            entry("npc", "ada")
            assert page.evaluate("RPGManager.roster()[0].health") == before_hp + 50
            assert page.evaluate("RPGManager.roster()[0].injury") == "Wounded"
            assert page.evaluate("RPGManager.state().supplies.potion") == 5
            entry("back")
            entry("medkit")
            entry("npc", "ada")
            assert page.evaluate("RPGManager.roster()[0].injury") is None
            assert "wounded" not in page.evaluate("SceneManager._scene._listWindow._list.find(e => e.ext === 'ada').name")
            assert page.evaluate("RPGManager.state().supplies.medkit") == 2
            shot("supplies")
            entry("npc", "ada")  # Disabled: no injury, no item consumed.
            assert page.evaluate("RPGManager.state().supplies.medkit") == 2
            press("Escape")
            entry("back")
            scene("Scene_RPGHome")

            # Bond applies once even with two partners. Copies do not alter base stats.
            assert page.evaluate("RPGManager.createBattle(7).snapshot().fighters.filter(f => f.side === 'player').every(f => f.battleBonuses.bond === 2)")
            page.evaluate("RPGManager.roster().slice(0,3).forEach(n => n.stamina = 19)")
            entry("battle")  # Start boundary must revalidate stale UI state.
            assert page.evaluate("SceneManager._scene.constructor.name") == "Scene_RPGHome"
            health_before_rest = page.evaluate("RPGManager.roster().map(n => [n.health,n.injury])")
            entry("rest")
            assert page.evaluate("RPGManager.roster()[0].stamina") == 59
            assert page.evaluate("RPGManager.roster().map(n => [n.health,n.injury])") == health_before_rest

            # Second injured knockout: all three die and disappear from team selection.
            page.evaluate("RPGManager.roster().slice(0,3).forEach(n => { n.health = 1; n.attack = 0; n.speed = 0; n.injury = 'Wounded'; })")
            entry("battle")
            scene("Scene_RPGBattle")
            finish_battle("defeat")
            assert page.evaluate("RPGManager.roster().slice(0,3).every(n => !n.alive && n.health === 0 && n.deathQuest === 3)")
            assert page.evaluate("RPGManager.teamIds()") == []
            entry("home")
            scene("Scene_RPGHome")
            entry("team")
            scene("Scene_RPGRoster")
            assert page.evaluate("SceneManager._scene._listWindow._list.filter(e => e.symbol === 'npc').map(e => e.ext)") == ["dax", "elin", "finn", "gwen", "hale", "iris", "jory"]
            entry("back")
            scene("Scene_RPGHome")
            entry("graveyard")
            scene("Scene_RPGRoster")
            assert page.evaluate("SceneManager._scene._listWindow._list.filter(e => e.symbol === 'npc').length") == 3
            shot("graveyard")
            entry("back")
            scene("Scene_RPGHome")
            supply_before = page.evaluate("RPGManager.state().supplies")
            assert not page.evaluate("RPGManager.useItem('ada', 'potion').ok")
            assert not page.evaluate("RPGManager.useItem('ada', 'medkit').ok")
            assert page.evaluate("RPGManager.state().supplies") == supply_before

            # Exhaust remaining stock using legal runtime calls, then verify disabled UI.
            page.evaluate("""() => {
                const n = RPGManager.roster().find(n => n.id === 'dax');
                while (RPGManager.state().supplies.potion) { n.health = 1; RPGManager.useItem(n.id, 'potion'); }
                while (RPGManager.state().supplies.medkit) { n.injury = 'Wounded'; RPGManager.useItem(n.id, 'medkit'); }
                n.health = 1; n.injury = 'Wounded';
            }""")
            entry("supplies")
            scene("Scene_RPGSupplies")
            assert page.evaluate("SceneManager._scene._supplyWindow._list.slice(0,2).every(e => !e.enabled)")
            entry("potion")
            assert page.evaluate("RPGManager.state().supplies") == {"potion": 0, "medkit": 0}
            entry("back")
            scene("Scene_RPGHome")

            # Actual MZ save/load uses isolated browser IndexedDB, not project files.
            saved = page.evaluate("RPGManager.state()")
            entry("save")
            scene("Scene_Save")
            page.evaluate("SceneManager._scene._listWindow.selectSavefile(1)")
            press("Enter")
            scene("Scene_RPGHome")
            entry("title")
            scene("Scene_Title")
            page.reload()
            scene("Scene_Title")
            entry("load")
            scene("Scene_Load")
            page.evaluate("SceneManager._scene._listWindow.selectSavefile(1)")
            press("Enter")
            page.wait_for_function("SceneManager._scene._actionsWindow?.active")
            press("Enter")
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.state()") == saved
            assert page.evaluate("[$dataRPGManagerRoster, $dataRPGManagerEnemyTeam]") == templates
            entry("graveyard")
            scene("Scene_RPGRoster")
            shot("graveyard-after-load")
            entry("back")
            scene("Scene_RPGHome")
            entry("title")
            scene("Scene_Title")
            entry("newGame")
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.roster().every(n => n.alive && n.xp === 0 && !n.injury)")
            assert page.evaluate("RPGManager.state().supplies") == {"potion": 6, "medkit": 3}
            assert not errors, errors
            browser.close()
            print(json.dumps({"result": "PASS", "checks": "portraits, quests, XP, levels, traits, stamina/rest, injuries, finite supplies, bonds, death/graveyard, no revival, actual MZ save/load, New Game, no browser errors", "screenshots": screenshots}, indent=2))
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    run()

