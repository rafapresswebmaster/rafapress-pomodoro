const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const V=require('../js/plugins/RPGManagerBattleStage'),P=require('../js/plugins/RPGManagerProgression'),B=require('../js/plugins/RPGManagerBattle');
const clone=v=>JSON.parse(JSON.stringify(v)),fighters=['player','enemy'].flatMap(side=>Array.from({length:side==='player'?3:5},(_,i)=>({id:`${side}${i}`,key:`${side}:${i}`,side,name:`${side} Woodland Archer ${i}`,health:5,maxHealth:5,armor:8,ward:45,portrait:{sheet:'Actor2',index:i},classId:i===0?'mage':'ranger'})));
const trip=(event,t=.5)=>({id:'test',questId:'goblin_tracks',presentationFighters:clone(fighters),presentationCurrent:event,presentationDurationMs:2000,presentationHoldMs:2000*(1-t),presentationQueue:[]});
const attack=(extra={})=>({kind:'battle',sourceType:'attack',actorKey:'player:0',targetKey:'enemy:4',action:'Arcane Surge',attackKind:'signature',wardLoss:1,armorLoss:2,damage:1,targetHealth:4,targetArmor:6,targetWard:44,...extra});

test('victory raises living party arms through the SV victory frames, never on defeat or draw',()=>{
 for(const outcome of ['victory','defeat','draw'])for(const t of [.1,.2,.3]){
  const event=P.buildBattlePresentation([{type:'result',outcome}],{fighters:[]},{preparedTeam:[]}).find(e=>e.sourceType==='result');
  const s=trip(event,t);s.presentationFighters[1].health=0;
  const before=JSON.stringify(s),frame=new V.Animator().update(s,V.layout(768,316,s.presentationFighters));
  assert.equal(frame.poses.get('player:0').motion,outcome==='victory'?13:1);
  assert.notEqual(frame.poses.get('player:1').motion,13);
  assert.notEqual(frame.poses.get('enemy:0').motion,13);
  assert.equal(JSON.stringify(s),before);
 }
});

test('stage geometry reserves clock/captions/actions, fixed names, and an action lane at both widths',()=>{
 for(const [w,h] of [[342,284],[467,316],[768,316],[1232,412],[806,284]]){
  const g=V.layout(w,h,fighters);assert.equal(g.top,24);assert.equal(g.bottom,h-72);assert.ok(g.scene.width>0);
  for(const row of g.rows){assert.ok(row.x>=0&&row.x+row.width<=w);assert.ok(row.y>=g.top&&row.y+row.height<=g.bottom+.01);assert.equal(row.width,0);}
  for(const pos of g.positions.values()){assert.ok(pos.x>g.scene.x&&pos.x<g.scene.x+g.scene.width);assert.ok(pos.y<=g.bottom);assert.ok(pos.y-pos.size>=g.top-1);}
 }
});
test('saved mid-action progress reconstructs poses/effects without restarting or changing the event/trip',()=>{
 const s=trip(attack(),.65),before=clone(s),g=V.layout(768,316,s.presentationFighters),a=new V.Animator(),b=new V.Animator();
 const frame=a.update(s,g),loaded=JSON.parse(JSON.stringify(s)),resumed=b.update(loaded,g);assert.equal(frame.t,.65);assert.deepEqual([...frame.poses],[...resumed.poses]);assert.deepEqual(frame.effects,resumed.effects);assert.deepEqual(s,before);assert.equal(a.starts,1);a.update(s,g);assert.equal(a.starts,1);
});
test('one resolved attack exposes Ward then Armor then HP values and never applies damage itself',()=>{
 const f=fighters.find(f=>f.key==='enemy:4'),e=attack();
 assert.deepEqual(V.stats(f,e,.43),{health:5,armor:8,ward:45,life:null});assert.equal(V.stats(f,e,.45).ward,44);assert.equal(V.stats(f,e,.45).armor,8);assert.equal(V.stats(f,e,.55).armor,6);assert.equal(V.stats(f,e,.55).health,5);assert.equal(V.stats(f,e,.65).health,4);assert.equal(f.health,5);
});
test('miss visibly evades and produces no defense/HP-loss effects even with malformed damage fields',()=>{
 const s=trip(attack({missed:true}),.6),a=new V.Animator(),g=V.layout(768,316,s.presentationFighters),frame=a.update(s,g);
 assert.equal(frame.kind,'miss');assert.ok(frame.effects.some(e=>e.type==='miss'));assert.ok(!frame.effects.some(e=>['ward','armor','hp'].includes(e.type)));assert.notEqual(frame.poses.get('enemy:4').dx,0);assert.equal(frame.poses.get('enemy:4').health,5);
});
test('basic melee, ranged/signature, opening, round, end and mortal intent are distinct beats',()=>{
 assert.equal(V.attackStyle({classId:'vanguard'},{action:'Sword Strike'}),'melee');assert.equal(V.attackStyle({classId:'ranger'},{action:'Bow Shot'}),'ranged');assert.equal(V.attackStyle({classId:'mystic'},{action:'Rune Pulse'}),'spell');
 for(const [event,expected] of [[{trigger:'BOSS_START'},'opening'],[{sourceType:'round'},'round'],[{sourceType:'result'},'ending'],[{sourceType:'mortalIntent'},'intent'],[attack({attackKind:'basic'}),'attack'],[attack(),'signature']])assert.equal(V.beat(event),expected);
});
test('fall, death-save success, permanent death and enemy defeat are not conflated',()=>{
 const f=fighters[0],e={targetKey:f.key,sourceType:'defeat'};assert.equal(V.stats(f,e,.8).life,'down');assert.equal(V.stats(f,{...e,sourceType:'deathSave',survived:true},.8).life,'saved');assert.equal(V.stats(f,{...e,sourceType:'deathSave',survived:false},.8).life,'dead');assert.equal(V.stats({...f,side:'enemy'},e,.8).life,'defeated');assert.equal(V.stats(f,{...e,sourceType:'deathSave'},.8).life,'down');
 const queued=P.buildBattlePresentation([{type:'deathSave',key:'player:0',survived:true},{type:'deathSave',key:'player:1',survived:false,permanentDeath:true}],{fighters:[]},{preparedTeam:[]});assert.equal(queued[1].survived,true);assert.equal(queued[2].permanentDeath,true);
 const t={presentationFighters:clone(fighters),presentationCurrent:queued[1],presentationHoldMs:1,presentationQueue:[queued[2]]};P.tickPresentation(t,2,'standard',{});assert.equal(t.presentationFighters[0].presentationLifeState,'saved');const loaded=clone(t);P.tickPresentation(loaded,5000,'skip',{});assert.equal(loaded.presentationFighters[1].presentationLifeState,'dead');
});
test('animation start/update/finish, skipped queues and repeated cleanup leave no active effects',()=>{
 const a=new V.Animator(),s=trip(attack(),.65),g=V.layout(768,316,s.presentationFighters);a.update(s,g);assert.ok(a.effects.length);s.presentationCurrent={kind:'battle',sourceType:'round'};a.update(s,g);assert.equal(a.effects.length,0);assert.equal(a.finishes,1);a.finish();a.finish();assert.equal(a.event,null);assert.equal(a.frame,null);assert.equal(a.effects.length,0);
 const e=P.buildBattlePresentation([{type:'round',round:1},{type:'attack',actorKey:'player:0',targetKey:'enemy:0',kind:'signature',damage:1},{type:'result',outcome:'victory'}],{fighters:[]},{preparedTeam:[]});const q={presentationQueue:e,presentationFighters:clone(fighters)};for(let i=0;i<1000&&(q.presentationCurrent||q.presentationQueue?.length);i++)P.tickPresentation(q,7000,'skip',{});assert.equal(q.presentationCurrent,null);assert.equal(q.presentationQueue.length,0);assert.equal(V.isBattle(q),false);
});
test('the travel-kind result remains a battle-ending beat before returning to travel',()=>{
 const s=trip({kind:'travel',sourceType:'result',text:'Encounter victory.'});assert.equal(V.isBattle(s),true);assert.equal(V.beat(s.presentationCurrent),'ending');s.presentationCurrent={kind:'travel',trigger:'medicinal_plants'};assert.equal(V.isBattle(s),false);
});
test('biome metadata and all supported enemy families map deterministically with safe defaults',()=>{
 assert.equal(V.biome({},{}),'woodland');assert.equal(V.biome({}, {environment:'Cave / ancient ruins'}),'cavern');assert.equal(V.biome({questName:'Road patrol'},{}),'woodland');
 for(const [name,cell] of [['Goblin',0],['Skeleton Archer',1],['Dire Wolf',2],['Giant Spider',3],['Mimic',4],['Ogre',5],['Necrommancer',6],['Summoned Demon',7]])assert.equal(V.enemyCell({name}),cell);assert.equal(V.enemyCell({name:'Legacy stranger'}),null);
 for(const [x,y,w,h] of V.CREATURE_RECTS){assert.ok(x>=0&&x+w<=1774);assert.ok(y>=0&&y+h<=887);}
});
test('renderer caches static backdrops, cleans owned bitmaps and keeps every missing-art path usable',()=>{
 const log=[],ctx=new Proxy({},{get:(o,k)=>k==='canvas'?{}:()=>{}}),bitmap=(w,h)=>({width:w,height:h,context:ctx,baseTexture:{update(){}},destroy(){log.push('destroy')},gradientFillRect(){},fillRect(){},blt(){},fontSize:12});
 const api={art:()=>({isReady:()=>false}),bitmap,round(){},text(...args){const [win,text,x,y,w,size,color,align,h]=args;assert.ok(x>=0&&x+w<=win.innerWidth+.01,`${text}: x bounds`);assert.ok(y>=0&&y+h<=win.innerHeight+.01,`${text}: y bounds`);},ellipse(){},heart(){},shield(){},ward(){}};
 const stage=new V.Stage(api),win={innerWidth:342,innerHeight:284,contents:bitmap(342,284),textWidth:s=>s.length*6},s=trip(attack(),.65),before=clone(s);stage.render(win,s);stage.render(win,s);assert.equal(stage.backgroundBuilds,1);assert.deepEqual(s,before);assert.equal(stage.animator.starts,1);stage.destroy();assert.equal(stage.background,null);assert.equal(stage.animator.effects.length,0);assert.equal(log.length,1);
});
test('visual changes preserve the simulator, quest definitions and domain settlement contract',()=>{
 // Simulation now intentionally adds seeded critical hits; stage remains presentation only.
 const ui=fs.readFileSync(require.resolve('../js/plugins/RPGManager'),'utf8'),stage=fs.readFileSync(require.resolve('../js/plugins/RPGManagerBattleStage'),'utf8');assert.match(ui,/_battleFailedEvent/);assert.match(ui,/this\._battleStage\?\.destroy/);assert.match(stage,/LVL\.\$\{npc\.level\|\|1\}/);assert.match(stage,/#f1d487/);assert.doesNotMatch(stage,/Math\.random|\.step\(|recordBattleResult|completeReturn|consumeEventCues|AudioManager/);
});
