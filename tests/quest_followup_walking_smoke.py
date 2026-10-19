from pathlib import Path
import functools,threading,json
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(r)));threading.Thread(target=server.serve_forever,daemon=True).start();errors=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1024,'height':850});page.on('pageerror',lambda e:errors.append(str(e)));page.goto(f'http://127.0.0.1:{server.server_port}/docs/Walking_Cycle_Review.html');page.wait_for_function('Object.values(images).every(im=>im.complete&&im.naturalWidth)');page.evaluate('playing=false;elapsed=0');page.wait_for_timeout(100);page.screenshot(path=str(r/'tests/visuals/quest-followup-walk-contact-a.webp'));page.evaluate('elapsed=1000/6*2');page.wait_for_timeout(100);page.screenshot(path=str(r/'tests/visuals/quest-followup-walk-contact-b.webp'));page.select_option('#direction','2');page.select_option('#variant','11');page.wait_for_timeout(100);page.screenshot(path=str(r/'tests/visuals/quest-followup-walk-mirrored.webp'));assert not errors,errors;b.close()
finally:server.shutdown()
result={'result':'PASS','classes':6,'contacts':['A','B','mirrored'],'javascriptErrors':errors};(r/'tests/quest-followup-walking-browser.json').write_text(json.dumps(result,indent=2));print(result)
