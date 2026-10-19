import functools,threading,json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1100,'height':800});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/docs/Figurine_Motion_Review.html');result=page.evaluate('auditFigures()');page.evaluate('playing=false;time=0');page.wait_for_timeout(80);page.screenshot(path=str(ROOT/'tests/visuals/figurines-grounded.webp'))
  page.evaluate('time=32');page.wait_for_timeout(80);page.screenshot(path=str(ROOT/'tests/visuals/figurines-lifted.webp'))
  page.select_option('#variant','7');page.select_option('#motion','combat');page.wait_for_timeout(500);page.screenshot(path=str(ROOT/'tests/visuals/figurines-combat.webp'))
  assert not errors,errors;result.update(result='PASS',javascriptErrors=errors);(ROOT/'tests/figurine-browser.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));browser.close()
finally:server.shutdown()
