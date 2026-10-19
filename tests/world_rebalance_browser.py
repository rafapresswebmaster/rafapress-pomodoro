"""Smoke test in the actual game; uses a fresh in-memory party, never saves."""
import functools
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for width,height in [(816,624),(1280,800)]:
            page=browser.new_page(viewport={'width':width,'height':height});errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            def scene(name): page.wait_for_function('n=>SceneManager._scene?.constructor.name===n&&SceneManager._scene.isStarted()&&!SceneManager.isSceneChanging()',arg=name)
            page.goto(f'http://127.0.0.1:{server.server_port}/');scene('Scene_Title')
            page.evaluate('SceneManager._scene.commandNewGame()');scene('Scene_RPGStartingRoster')
            page.evaluate('''()=>{const s=SceneManager._scene,P=RPGManagerProgression;s._drafts=[{classId:'knight',sex:'male',name:'Alder',portraitKey:P.portraitOptions('knight','male')[0].key}];s._step='review';s.showCreator()}''')
            page.get_by_role('button',name='Confirm companion and enter camp').click();scene('Scene_RPGHome')
            page.evaluate('''()=>{const P=RPGManagerProgression,s=RPGManager.state();for(const [classId,name] of [['ranger','Rowan'],['cleric','Clara']]){const r=P.recruitCreated(s,{classId,sex:'female',name,portraitKey:P.portraitOptions(classId,'female')[0].key});if(!r.ok)throw Error(r.message);}}''')
            page.evaluate('''()=>{const P=RPGManagerProgression,s=RPGManager.state(),n=s.roster[0];n.classId='knight';P.ensureLife(n);s.equipmentStock.padded_vest=2;P.equipSlot(s,n.id,'padded_vest','body');n.equipmentCondition.padded_vest.hitsRemaining=0;P.ensureLife(n);if(n.equipmentSlots.body!==null)throw Error('Broken body gear remains');SceneManager._scene.openMember(n.id);SceneManager._scene._sheetTab='Gear';SceneManager._scene.drawCampSheet()}''')
            page.wait_for_timeout(250)
            assert page.locator('#camp-member-sheet').count()==1
            assert page.get_by_label('body',exact=True).input_value()==''
            page.get_by_label('body',exact=True).select_option('padded_vest')
            assert page.evaluate("RPGManager.state().roster[0].equipmentSlots.body==='padded_vest'&&RPGManager.state().equipmentStock.padded_vest===0")
            page.screenshot(path=str(ROOT/f'tests/visuals/rebalance-{width}-gear.webp'))
            page.evaluate('''()=>{document.getElementById('camp-member-sheet')?.remove();const s=RPGManager.state(),P=RPGManagerProgression,q=RPGManager.quests().find(q=>q.id==='abandoned_shrine');s.campaignStats.questsCompleted=100;for(const n of s.roster){n.level=3;P.ensureLife(n);n.health=n.maxHealth;}s.teamIds=s.roster.map(n=>n.id);P.dispatchQuest(s,'A',q,$dataRPGManagerQuests.xp,Date.now());if(!s.trips.A)throw Error('No dispatched trip');SceneManager.goto(SceneManager._scene.constructor)}''');scene('Scene_RPGHome')
            page.wait_for_timeout(800)
            page.screenshot(path=str(ROOT/f'tests/visuals/rebalance-{width}-mission.webp'))
            assert page.evaluate("RPGManager.state().trips.A.lockedBackground.name==='QuestCrypt_v8'")
            page.evaluate('''()=>{const t=RPGManager.state().trips.A;t.durationMinutes=20;t.totalDurationMs=1200000;t.elapsedMs=610000;t.remainingMs=590000;t.campfireStarted=true;t.phase='campfire';t.encounterPlan=[];t.battlePresentationDeadlineMs=0;t.presentationQueue=[];t.presentationCurrent={kind:'travel',sourceType:'campfire',text:'The companions share water and watch the sparks.'};t.presentationHoldMs=15000;t.lastProgressAtMs=Date.now()}''')
            page.wait_for_timeout(400)
            assert page.evaluate("RPGManager.state().trips.A.phase==='campfire'")
            page.screenshot(path=str(ROOT/f'tests/visuals/campfire-{width}.webp'))
            page.wait_for_timeout(300)
            page.screenshot(path=str(ROOT/f'tests/visuals/campfire-{width}-next.webp'))
            page.evaluate('''()=>{const P=RPGManagerProgression,t=RPGManager.state().trips.A,q=RPGManager.quests().find(q=>q.skulls===5&&q.durationMinutes===5);const draft={...q,id:t.id,questId:q.id,totalDurationMs:q.durationMinutes*60000,stages:[{id:'wave-check',type:'battle',mainQuest:true,enemyIds:q.enemyIds}]};const stage=P.encounterPlan(draft).find(p=>p.stage.mainQuest).stage;Object.assign(t,{questId:q.id,skulls:q.skulls,balanceVersion:q.balanceVersion,encounterTuning:q.encounterTuning,stages:[stage],stageIndex:0,phase:'battle'});const b=RPGManager.createTripBattle('A',3);if(b._waves.length!==1)throw Error('Manual battle lost second wave');if(b.snapshot().fighters.some(f=>f.side==='enemy'&&f.health<4))throw Error('Weak main encounter');if(b._waves[0].some(f=>f.health<4))throw Error('Weak reserve encounter')}''')
            assert not errors,errors
            page.close()
        browser.close()
    print('PASS: replacement gear and scenic missions at 816/1280; no browser errors; no saves written')
finally:
    server.shutdown()
