"""Use the installed RPG Maker MZ NW.js binary, not Chromium emulation."""
import ctypes,json,os,shutil,socket,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/visuals';OUT.mkdir(exist_ok=True)
NW=Path(r'C:\Program Files (x86)\Steam\steamapps\common\RPG Maker MZ\nwjs-win\nw.exe')
HARNESS=ROOT/'tests/tmp-focus-native';HARNESS.mkdir(exist_ok=True)
sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close()
startup=subprocess.STARTUPINFO();startup.dwFlags|=subprocess.STARTF_USESHOWWINDOW;startup.wShowWindow=0
process=subprocess.Popen([str(NW),str(ROOT),'--remote-debugging-port='+str(port),'--user-data-dir='+str(HARNESS/'profile'),'--no-first-run'],cwd=ROOT,startupinfo=startup,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
user32=ctypes.windll.user32;user32.GetForegroundWindow.restype=ctypes.c_void_p
result={};browser=None
try:
 with sync_playwright() as pw:
  for attempt in range(60):
   try:browser=pw.chromium.connect_over_cdp(f'http://127.0.0.1:{port}');break
   except Exception:time.sleep(.25)
  if not browser:raise RuntimeError('Installed NW.js did not expose its debugging endpoint.')
  context=browser.contexts[0];page=next(p for p in context.pages if 'index.html' in p.url);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  print('Native boot:',page.evaluate('({url:location.href,body:document.body.innerText,scene:typeof SceneManager!=="undefined"?SceneManager._scene?.constructor.name:null,nw:typeof process!=="undefined"?process.versions.nw:"node unavailable"})'),flush=True)
  page.wait_for_function('typeof SceneManager!=="undefined"',polling=100)
  page.evaluate('()=>{window._nativeMainWindow=nw.Window.get();window._nativeNormalActive=SceneManager.isGameActive;SceneManager.isGameActive=()=>true;window._nativeMainWindow.show()}')
  try:page.wait_for_function('SceneManager._scene?.constructor.name==="Scene_Title"&&SceneManager._scene.isStarted()',timeout=30000)
  except Exception:print('Native failure:',errors,page.locator('body').inner_text(),flush=True);raise
  result['versions']=page.evaluate('({nw:process.versions.nw,chromium:process.versions.chromium,node:process.versions.node,mz:Utils.RPGMAKER_VERSION})')
  page.evaluate('SceneManager._scene.commandNewGame()');page.wait_for_function('SceneManager._scene?.constructor.name==="Scene_RPGStartingRoster"&&SceneManager._scene.isStarted()');page.evaluate('()=>{SceneManager._scene._selected=["ada","bram","cora"];SceneManager._scene.startParty()}');page.locator('form button[type=submit]').click();page.wait_for_function('SceneManager._scene?.constructor.name==="Scene_RPGHome"&&SceneManager._scene.isStarted()')
  page.evaluate('''()=>{window._nativeHome=SceneManager._scene.constructor;RPGManagerProgression.dispatchQuest(RPGManager.state(),'A',RPGManager.quests().find(q=>q.id==='lantern_index'),$dataRPGManagerQuests.xp,Date.now());SceneManager.isGameActive=window._nativeNormalActive;window._nativeMainWindow.hide();}''')
  time.sleep(.4);foreground=user32.GetForegroundWindow();page.evaluate('RPGManager.state().focusTimer.enabled=true;RPGManager.focus.refresh()')
  try:page.wait_for_function('!!RPGManager.focus.floating.widget&&RPGManager.focus.floating.lastPayload!==null',timeout=15000,polling=100)
  except Exception:
   print('Widget failure:',page.evaluate('({error:RPGManager.focus.floating.lastError,pending:RPGManager.focus.floating.pending,widget:!!RPGManager.focus.floating.widget,nw:!!globalThis.nw,version:process.versions,display:RPGManager.state().focusTimer})'),errors,[(p.url) for p in context.pages],flush=True)
   for child in context.pages:
    if 'focus_timer.html' in child.url:print('Child:',child.evaluate('({body:document.body.innerText,widget:typeof FocusTimerWidget,focus:typeof RPGManagerFocus,scripts:Array.from(document.scripts).map(s=>s.src)})'),flush=True)
   raise
  widget=next(p for p in context.pages if 'focus_timer.html' in p.url);widget.wait_for_function('document.querySelector(".focus-time").textContent!=="--:--"');time.sleep(.3)
  current_foreground=user32.GetForegroundWindow();foreground_pid=ctypes.c_ulong();user32.GetWindowThreadProcessId(ctypes.c_void_p(current_foreground),ctypes.byref(foreground_pid));result['focusUnchangedOnOpen']=current_foreground==foreground or foreground_pid.value!=process.pid;foreground=current_foreground
  if not result['focusUnchangedOnOpen']:
   for hwnd in [foreground,user32.GetForegroundWindow()]:
    title=ctypes.create_unicode_buffer(256);user32.GetWindowTextW(ctypes.c_void_p(hwnd),title,256);print('Foreground changed:',hwnd,title.value,flush=True)
  assert result['focusUnchangedOnOpen']
  handles=[];main_handles=[];callback=ctypes.WINFUNCTYPE(ctypes.c_bool,ctypes.c_void_p,ctypes.c_void_p)
  def enum(hwnd,param):
   text=ctypes.create_unicode_buffer(256);user32.GetWindowTextW(ctypes.c_void_p(hwnd),text,256)
   pid=ctypes.c_ulong();user32.GetWindowThreadProcessId(ctypes.c_void_p(hwnd),ctypes.byref(pid))
   if pid.value==process.pid:
    if text.value=='RPG Manager Focus Timer':handles.append(hwnd)
    elif text.value=='RPG Manager':main_handles.append(hwnd)
   return True
  user32.EnumWindows(callback(enum),0);assert len(handles)==1,handles
  getstyle=user32.GetWindowLongW;getstyle.argtypes=[ctypes.c_void_p,ctypes.c_int];getstyle.restype=ctypes.c_long
  result['nativeTopmost']=bool(getstyle(handles[0],-20)&8);assert result['nativeTopmost']
  before=page.evaluate('RPGManager.state().trips.A.remainingMs');page.wait_for_function('old=>RPGManager.state().trips.A.remainingMs<old-1200',arg=before,polling=100)
  page.evaluate('RPGManager.focus.refresh()');assert widget.locator('.focus-time').inner_text()==page.evaluate('RPGManager.focus.view().digital');current_foreground=user32.GetForegroundWindow();foreground_pid=ctypes.c_ulong();user32.GetWindowThreadProcessId(ctypes.c_void_p(current_foreground),ctypes.byref(foreground_pid));assert current_foreground==foreground or foreground_pid.value!=process.pid;foreground=current_foreground
  widget.screenshot(path=str(OUT/'focus-companion-native-widget.webp'))
  if main_handles:
   page.evaluate('window._nativeMainWindow.minimize()');time.sleep(.2);assert user32.IsIconic(ctypes.c_void_p(main_handles[0]));before=page.evaluate('RPGManager.state().trips.A.remainingMs');page.wait_for_function('old=>RPGManager.state().trips.A.remainingMs<old-1100',arg=before,polling=100);page.evaluate('window._nativeMainWindow.restore();window._nativeMainWindow.hide()');result['nativeMinimizeRestoreClock']=True
  page.evaluate('RPGManager.focus.floating.widget.moveTo(140,160)');page.wait_for_function('RPGManager.state().focusTimer.position?.x===140&&RPGManager.state().focusTimer.position?.y===160',polling=100);result['movePositionPersisted']=True
  page.evaluate('RPGManager.state().focusTimer.position={x:90000,y:90000};RPGManager.focus.floating.reposition()');position=page.evaluate('RPGManager.state().focusTimer.position');assert position['x']<90000;result['offscreenClamped']=position
  screens=page.evaluate('nw.Screen.screens.map(s=>s.work_area||s.bounds)');result['secondMonitorTested']=False
  if len(screens)>1:
   area=screens[1];target={'x':area['x']+24,'y':area['y']+24};page.evaluate('p=>RPGManager.focus.floating.widget.moveTo(p.x,p.y)',target);page.wait_for_function('p=>RPGManager.state().focusTimer.position.x===p.x&&RPGManager.state().focusTimer.position.y===p.y',arg=target,polling=100)
   class Rect(ctypes.Structure):_fields_=[('left',ctypes.c_long),('top',ctypes.c_long),('right',ctypes.c_long),('bottom',ctypes.c_long)]
   rect=Rect();assert user32.GetWindowRect(ctypes.c_void_p(handles[0]),ctypes.byref(rect));assert rect.left>=area['x'] and rect.top>=area['y'];result['secondMonitorTested']=True;result['secondMonitorNativeRect']=[rect.left,rect.top,rect.right,rect.bottom]
  page.evaluate('RPGManager.focus.refresh();RPGManager.focus.refresh()');assert len([p for p in context.pages if 'focus_timer.html' in p.url])==1
  # Active-state migration closes the old window and replaces it once with identical time.
  page.evaluate('path=>{StorageManager.fileDirectoryPath=()=>path}',str(HARNESS/'save')+os.sep)
  page.evaluate('''async()=>{$gameSystem.onBeforeSave();await DataManager.saveGame(93);await DataManager.loadGame(93);RPGManager.restoreSave();$gameSystem.onAfterLoad();RPGManager.focus.refresh()}''');page.wait_for_function('!!RPGManager.focus.floating.widget&&RPGManager.focus.floating.lastPayload!==null',polling=100);time.sleep(.3)
  assert len([p for p in context.pages if 'focus_timer.html' in p.url])==1;result['loadReplacesWithoutDuplicate']=True
  widget=next(p for p in context.pages if 'focus_timer.html' in p.url);widget.locator('button').click();page.wait_for_function('!RPGManager.state().focusTimer.enabled',polling=100);assert page.evaluate('!!RPGManager.state().trips.A');result['hideKeepsSession']=True
  page.evaluate('''()=>{RPGManager.state().focusTimer.enabled=true;RPGManager.focus.refresh();SceneManager.isGameActive=()=>true;window._nativeMainWindow.show();SceneManager.goto(Scene_Title)}''');page.wait_for_function('SceneManager._scene?.constructor.name==="Scene_Title"&&SceneManager._scene.isStarted()',polling=100);page.wait_for_function('!RPGManager.focus.floating.widget&&!RPGManager.focus.floating.pending',polling=100);result['titleCleansWidget']=True
  page.evaluate('''()=>{Graphics.resize(1280,720);Graphics.boxWidth=1280;Graphics.boxHeight=720;window._nativeMainWindow.resizeTo(1280,720);SceneManager.goto(window._nativeHome)}''');page.wait_for_function('SceneManager._scene?.constructor.name==="Scene_RPGHome"&&SceneManager._scene.isStarted()',polling=100);page.wait_for_function('!!RPGManager.focus.floating.widget&&RPGManager.focus.floating.lastPayload!==null',polling=100);page.screenshot(path=str(OUT/'focus-companion-native-1280.webp'));result['nativeWiderLayout']=True
  try:
   page.evaluate('window._nativeMainWindow.close()');page.get_by_role('button',name='Exit Without Saving',exact=True).click()
  except Exception:pass
  process.wait(timeout=10);result['gameCloseCleansWidget']=True
  result['monitorCount']=user32.GetSystemMetrics(80);result['errors']=errors;assert not errors,errors
  (ROOT/'tests/focus-native-results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2),flush=True)
finally:
 try:
  if browser:browser.close()
 except Exception:pass
 # Terminate only this isolated harness's process tree, never another NW.js/game process.
 if process.poll() is None:subprocess.run(['taskkill','/PID',str(process.pid),'/T','/F'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 if HARNESS.resolve()==(ROOT/'tests/tmp-focus-native').resolve() and HARNESS.parent.resolve()==(ROOT/'tests').resolve() and not HARNESS.is_symlink():
  try:shutil.rmtree(HARNESS)
  except OSError:pass
