"""Day 2 browser integration check against the real MZ game.

Run from the project root: python tests/day2_smoke.py
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
                path = Path(tempfile.gettempdir()) / f"rpg-manager-day2-{name}.webp"
                page.screenshot(path=str(path))
                screenshots.append(str(path))

            def scene(name):
                try:
                    page.wait_for_function("""name => {
                        const s = window.SceneManager && SceneManager._scene;
                        return s && s.constructor.name === name && s.isStarted()
                            && !s.isBusy() && [s._listWindow, s._commandWindow, s._logWindow]
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
                # Let MZ consume hover, down, and up on distinct render frames.
                # Fixed millisecond clicks can be lost under software rendering.
                def frames():
                    page.wait_for_function("n => Graphics.frameCount < n || Graphics.frameCount >= n + 2",
                                           arg=page.evaluate("Graphics.frameCount"))

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

            scene("Scene_Title")
            page.keyboard.press("Enter", delay=100)
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.teamIds()") == []
            assert not page.evaluate("SceneManager._scene._commandWindow._list.find(e => e.symbol === 'battle').enabled")
            entry("battle")
            assert page.evaluate("SceneManager._scene.constructor.name") == "Scene_RPGHome"
            assert page.evaluate("""() => {
                try { RPGManager.createBattle(1); return false; }
                catch (error) { return !!error.message; }
            }""")
            shot("home-no-team")

            entry("team")
            scene("Scene_RPGRoster")
            for npc_id in ["ada", "bram", "cora"]:
                entry("npc", npc_id)
            entry("confirm")
            scene("Scene_RPGHome")
            assert page.evaluate("SceneManager._scene._commandWindow._list.find(e => e.symbol === 'battle').enabled")
            team_before = page.evaluate("RPGManager.teamIds()")
            roster_before = page.evaluate("RPGManager.roster()")
            templates_before = page.evaluate("[$dataRPGManagerRoster, $dataRPGManagerEnemyTeam]")
            assert len(templates_before[1]) == 3
            for npc in templates_before[1]:
                assert set(templates_before[0][0]).issubset(npc), npc

            # The start boundary must reject a member who became unavailable.
            assert page.evaluate("""() => {
                const npc = RPGManager.roster().find(n => n.id === RPGManager.teamIds()[0]);
                const health = npc.health;
                try {
                    npc.health = 0;
                    try { RPGManager.createBattle(1); return false; }
                    catch (error) { return !!error.message; }
                } finally { npc.health = health; }
            }""")

            entry("battle")
            scene("Scene_RPGBattle")
            first = snapshot()
            assert len(first["fighters"]) == 6
            assert first["status"] == "running"
            assert not page.evaluate("SceneManager._scene._commandWindow._list.find(e => e.symbol === 'home').enabled")
            page.wait_for_function(
                "actions => SceneManager._scene._battle.snapshot().actions >= actions + 6",
                arg=first["actions"], timeout=10000,
            )
            progressed = snapshot()
            assert progressed["round"] >= first["round"]
            assert sum(f["health"] for f in progressed["fighters"]) < sum(f["health"] for f in first["fighters"])
            shot("automatic-battle")
            result = finish_battle()
            shot("result")
            lines = page.evaluate("SceneManager._scene._logWindow._lines")
            assert len(lines) > 10, lines
            log = "\n".join(lines).lower()
            assert "hp" in log and "sig cd" in log, log
            assert "basic" in log and "signature" in log, log
            assert result["status"] in log, log
            attacks = page.evaluate("RPGManager.lastBattle.events.filter(e => e.kind === 'basic' || e.kind === 'signature')")
            assert {event["side"] for event in attacks} == {"player", "enemy"}, attacks
            assert {event["kind"] for event in attacks} == {"basic", "signature"}, attacks
            assert all(event["damage"] > 0 and event["targetHealth"] >= 0 for event in attacks)
            assert page.evaluate("RPGManager.roster().slice(0,3).every(n => n.xp === 60 && n.stamina === 80)")
            assert page.evaluate("RPGManager.roster().slice(3)") == roster_before[3:]
            assert page.evaluate("RPGManager.teamIds()") == team_before
            assert page.evaluate("[$dataRPGManagerRoster, $dataRPGManagerEnemyTeam]") == templates_before

            # Both keyboard and mouse-wheel log navigation must expose old lines.
            old_scroll = page.evaluate("SceneManager._scene._logWindow.scrollY()")
            page.keyboard.press("PageUp", delay=80)
            page.wait_for_timeout(200)
            assert page.evaluate("SceneManager._scene._logWindow.scrollY()") < old_scroll
            before_scroll = page.evaluate("SceneManager._scene._logWindow.scrollY()")
            page.mouse.move(380, 400)
            page.mouse.wheel(0, -480)
            page.wait_for_timeout(400)
            after_scroll = page.evaluate("SceneManager._scene._logWindow.scrollY()")
            assert after_scroll < before_scroll if before_scroll > 0 else after_scroll == 0
            shot("review-log")
            page.wait_for_function("SceneManager._scene._commandWindow.isOpenAndActive()")
            entry("home")
            scene("Scene_RPGHome")

            # A second battle copies the current persistent roster.
            entry("battle")
            scene("Scene_RPGBattle")
            repeated = snapshot()
            assert repeated["status"] == "running" and repeated["actions"] <= 1
            assert all(f["health"] > 0 for f in repeated["fighters"])
            finish_battle()
            entry("home")
            scene("Scene_RPGHome")

            # Temporary runtime fixtures exercise loss/victory screens, with no
            # changes to the JSON templates. Reset progression between fixtures.
            for expected in ["defeat", "victory"]:
                page.evaluate("""() => {
                    $gameSystem._rpgManager = RPGManagerProgression.createState($dataRPGManagerRoster);
                    RPGManager.confirmTeam(['ada','bram','cora']);
                    SceneManager._scene._commandWindow.refresh();
                }""")
                page.evaluate("""expected => {
                    for (const npc of RPGManager.roster()) {
                        if (!RPGManager.teamIds().includes(npc.id)) continue;
                        if (expected === 'defeat') npc.health = 1;
                        else { npc.attack = 1000; npc.speed = 1000; }
                    }
                }""", expected)
                fixture_before = page.evaluate("RPGManager.roster()")
                entry("battle")
                scene("Scene_RPGBattle")
                finish_battle(expected)
                shot(expected)
                assert page.evaluate("RPGManager.roster().slice(0,3).every(n => n.xp === 60 && n.stamina === 80)")
                assert page.evaluate("RPGManager.roster().slice(3)") == fixture_before[3:]
                assert page.evaluate("RPGManager.teamIds()") == team_before
                entry("home")
                scene("Scene_RPGHome")
                page.evaluate("""saved => {
                    RPGManager.roster().forEach((npc, i) => Object.assign(npc, saved[i]));
                }""", roster_before)

            assert page.evaluate("[$dataRPGManagerRoster, $dataRPGManagerEnemyTeam]") == templates_before
            entry("title")
            scene("Scene_Title")
            page.keyboard.press("Enter", delay=100)
            scene("Scene_RPGHome")
            assert page.evaluate("RPGManager.teamIds()") == []
            assert not page.evaluate("SceneManager._scene._commandWindow._list.find(e => e.symbol === 'battle').enabled")
            assert not errors, errors
            browser.close()
            print(json.dumps({
                "result": "PASS",
                "checks": "team start guards, enemy schema, automatic progress, attacks/HP/cooldown log, terminal result, log navigation, repeat, victory/loss, persistent consequences, unchanged templates/bench, New Game, no browser errors",
                "screenshots": screenshots,
            }, indent=2))
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    run()
