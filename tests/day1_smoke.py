"""Day 1 integration check. Requires Python, Playwright, and its Chromium browser.

Run from the project root: python tests/day1_smoke.py
Serves the real MZ game on localhost and uses an isolated browser profile.
Screenshots go to the system temp directory; no project saves are written.
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
            page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
            page.goto(f"http://127.0.0.1:{server.server_port}/")

            def scene(name):
                try:
                    page.wait_for_function(
                        "name => window.SceneManager && SceneManager._scene && "
                        "SceneManager._scene.constructor.name === name && "
                        "SceneManager._scene.isStarted() && !SceneManager._scene.isBusy() && "
                        "(SceneManager._scene._listWindow || SceneManager._scene._commandWindow).isOpenAndActive()",
                        arg=name,
                    )
                except Exception:
                    print(json.dumps({"expectedScene": name, "errors": errors,
                                      "pageText": page.locator("body").inner_text(),
                                      "scene": page.evaluate("window.SceneManager && SceneManager._scene?.constructor.name")}), flush=True)
                    shot("failure")
                    raise
                page.wait_for_timeout(150)
                print(f"Ready: {name}", flush=True)

            def frames():
                # New Game resets Graphics.frameCount; release held input then too.
                page.wait_for_function("n => Graphics.frameCount < n || Graphics.frameCount >= n + 2",
                                       arg=page.evaluate("Graphics.frameCount"))

            def press(key):
                # Keep input held across engine updates, even with slow rendering.
                page.keyboard.down(key)
                frames()
                page.keyboard.up(key)
                frames()

            def entry(symbol, npc_id=None):
                # Bring a command into view, then activate with real pointer input.
                point = page.evaluate("""({symbol, npcId}) => {
                    const s = SceneManager._scene;
                    const w = s._listWindow || s._commandWindow;
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
                page.mouse.move(point["x"], point["y"])
                frames()
                page.evaluate("""index => {
                    const s = SceneManager._scene;
                    (s._listWindow || s._commandWindow).forceSelect(index);
                }""", point["index"])
                page.mouse.down()
                frames()
                page.mouse.up()
                frames()

            def shot(name):
                path = Path(tempfile.gettempdir()) / f"rpg-manager-day1-{name}.webp"
                page.screenshot(path=str(path))
                screenshots.append(str(path))

            scene("Scene_Title")
            press("Enter")
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.roster().length") == 10
            assert page.evaluate("RPGManager.teamIds()") == []
            shot("home")

            # All ten entries and every required field are present and renderable.
            entry("roster")
            scene("Scene_RPGRoster")
            assert page.evaluate("SceneManager._scene._listWindow._list.filter(e => e.symbol === 'npc').length") == 10
            for npc in page.evaluate("RPGManager.roster()"):
                assert all(key in npc for key in ["name", "role", "level", "health", "attack", "defense", "speed", "stamina", "passiveTrait", "basicAttack", "signatureAttack"])
                entry("npc", npc["id"])
            entry("npc", "ada")
            shot("roster")
            press("Escape")
            scene("Scene_RPGHome")

            entry("team")
            scene("Scene_RPGRoster")
            # Incomplete teams cannot confirm; Enter also toggles a highlighted NPC.
            entry("confirm")
            assert page.evaluate("RPGManager.teamIds()") == []
            entry("npc", "ada")
            press("Enter")
            page.wait_for_timeout(150)
            assert page.evaluate("SceneManager._scene._draft") == []
            press("Enter")
            page.wait_for_timeout(150)
            entry("npc", "bram")
            entry("confirm")
            assert page.evaluate("RPGManager.teamIds()") == []
            entry("npc", "cora")
            entry("npc", "dax")
            assert page.evaluate("SceneManager._scene._draft") == ["ada", "bram", "cora"]
            shot("team-full")
            entry("confirm")
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.teamIds()") == ["ada", "bram", "cora"]
            shot("confirmed")

            # Editing is transactional: cancellation preserves the confirmed team.
            entry("team")
            scene("Scene_RPGRoster")
            entry("npc", "ada")
            entry("npc", "dax")
            entry("back")
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.teamIds()") == ["ada", "bram", "cora"]
            entry("team")
            scene("Scene_RPGRoster")
            entry("npc", "ada")
            entry("npc", "dax")
            entry("confirm")
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.teamIds()") == ["bram", "cora", "dax"]

            # Test living checks without adding death/combat gameplay.
            page.evaluate("RPGManager.roster()[0].alive = false; RPGManager.roster()[4].health = 0")
            entry("team")
            scene("Scene_RPGRoster")
            entry("npc", "bram")
            assert not page.evaluate("SceneManager._scene._listWindow._list.some(e => e.ext === 'ada')")
            entry("npc", "elin")
            assert page.evaluate("SceneManager._scene._draft") == ["cora", "dax"]
            entry("back")
            scene("Scene_RPGHome")

            # Validate at the data boundary too, including malformed and stale teams.
            checks = page.evaluate("""() => {
                const before = JSON.stringify(RPGManager.teamIds());
                const invalid = [[], ['bram'], ['bram','cora'], ['bram','cora','dax','finn'],
                    ['bram','bram','cora'], ['missing','bram','cora'],
                    ['ada','bram','cora'], ['elin','bram','cora'], null];
                const rejected = invalid.every(ids => !!RPGManager.confirmTeam(ids));
                const unchanged = JSON.stringify(RPGManager.teamIds()) === before;
                const templateUntouched = $dataRPGManagerRoster[0].alive && $dataRPGManagerRoster[4].health > 0;
                return {rejected, unchanged, templateUntouched};
            }""")
            assert all(checks.values()), checks

            # A selection becoming unavailable before confirmation cannot slip through.
            entry("team")
            scene("Scene_RPGRoster")
            page.evaluate("RPGManager.roster()[1].health = 0")
            entry("confirm")
            assert page.evaluate("SceneManager._scene.constructor.name") == "Scene_RPGRoster"
            entry("back")
            scene("Scene_RPGHome")

            entry("title")
            scene("Scene_Title")
            press("Enter")
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.teamIds()") == []
            assert page.evaluate("RPGManager.roster().every(RPGManager.isLiving)")
            assert page.evaluate("RPGManager.roster()[1].health === $dataRPGManagerRoster[1].health")

            # A full reload also boots cleanly.
            page.reload()
            scene("Scene_Title")
            press("Enter")
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.roster().length") == 10
            assert not errors, errors
            browser.close()
            print(json.dumps({"result": "PASS", "checks": "boot, roster, keyboard/pointer, exactly-three, fourth blocked, replacement, cancel, living checks, invalid/stale teams, fresh game, reload, no browser errors", "screenshots": screenshots}, indent=2))
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    run()
