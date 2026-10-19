/*:
 * @target MZ
 * @plugindesc Cozy embedded battle stage: optional art, resolved-event motion and effects.
 * @author RPG Manager
 * @help Load after RPGManagerProgression and before RPGManager.
 * Presentation only. No simulation, audio, timers, rewards or campaign mutations.
 * All animation position is reconstructed from saved presentationHoldMs/duration.
 */
(() => {
    "use strict";
    function walkingFace(npc){
        if(npc.walkPortrait)return npc.walkPortrait;
        if(npc.reanimated)return npc.portrait||{};
        if(npc.portrait?.sheet?.startsWith("RPGPortrait_"))return {sheet:["mage","cleric","rogue"].includes(npc.classId)?"Actor3":"Actor2",index:({barbarian:4,knight:0,ranger:6,rogue:4,mage:6,cleric:2}[npc.classId]||0)+(npc.sex==="female"?1:0)};
        return npc.portrait||{};
    }
    const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
    const lerp=(a,b,t)=>a+(b-a)*clamp(t);
    const TOKENS=Object.freeze({parchment:"#f3e5c7",ink:"#302e27",honey:"#edc985",party:"#9fd7df",enemy:"#f4c399",ward:"#c9b1f2",armor:"#a3d7ed",hit:"#ffd09d",danger:"#edb3a1",rail:"#243b78f5"});
    const ART=Object.freeze({woodland:"BattleWoodland_v1",cavern:"BattleCavern_v1",enemies:"BattleCreatures_v1"});
    // Measured alpha bounds in the original 1774x887 atlas; never cut weapons at grid edges.
    const CREATURE_RECTS=Object.freeze([[14,88,366,318],[389,15,414,390],[836,107,480,299],[1341,91,423,319],[30,515,371,341],[406,416,503,448],[919,443,437,417],[1375,508,388,342]]);
    function biome(trip={},quest={}){
        const text=`${quest.environment||""} ${trip.questId||""} ${trip.questName||""}`;
        return /cave|crypt|cemetery|undead|tomb|gate|necrom|demon|catacomb|ruin|cult/i.test(text)?"cavern":"woodland";
    }
    function backgroundSpec(trip={},quest={}){
        const locked=trip.lockedBackground||{name:quest.battleback,folder:quest.battlebackFolder||"battlebacks1"};
        // Old saves can still lock a floor texture; use the reauthored scenic location.
        if(locked.folder!=="pictures")return {name:quest.battlebackFolder==="pictures"?quest.battleback:ART[biome(trip,quest)],folder:"pictures"};
        if(/^[A-Za-z0-9_]+$/.test(locked.name||"")&&["battlebacks1","battlebacks2","pictures"].includes(locked.folder))return locked;
        return {name:ART[biome(trip,quest)],folder:"pictures"};
    }
    function backgroundArt(api,trip,quest){const spec=backgroundSpec(trip,quest),art=api.art(spec.folder,spec.name);return art.isError?.()?api.art("pictures",ART[biome(trip,quest)]):art;}
    function beat(event={}){
        if(event.sourceType==="attack")return event.missed?"miss":event.attackKind==="signature"||event.importance==="SIGNATURE"?"signature":"attack";
        if(event.sourceType==="deathSave")return event.permanentDeath===true||event.survived===false||event.importance==="DEATH"?"death":"deathSave";
        if(event.sourceType==="defeat")return "fall";
        if(event.sourceType==="result")return "ending";
        if(event.sourceType==="round")return "round";
        if(event.trigger==="BOSS_START"||event.trigger==="BATTLE_START"||Array.isArray(event.fighters))return "opening";
        if(event.sourceType==="mortalIntent")return "intent";
        if(event.sourceType==="heal")return "heal";
        return "observe";
    }
    function isBattle(trip){const e=trip?.presentationCurrent;return !!e&&(e.kind==="battle"||e.sourceType==="result")&&(trip.presentationHoldMs>0||trip.presentationQueue?.length>0);}
    function progress(trip){return clamp(1-(Number(trip.presentationHoldMs)||0)/Math.max(1,Number(trip.presentationDurationMs)||Number(trip.presentationCurrent?.holdMs)||1));}
    // Each frame is copied into its own transparent canvas before scaling/rotation.
    // Sampling can therefore never pull pixels from an adjacent atlas cell.
    const isolatedFrames=new WeakMap();
    function footAnchor(pixels,width,height,bounds){
        const [left,top,right,bottom]=bounds,start=Math.max(top,Math.floor(bottom-(bottom-top)*.18));
        let mass=0,sum=0;
        // Weight the solid lower silhouette: boots/robe hem, not outstretched gear.
        for(let y=start;y<bottom;y++)for(let x=left;x<right;x++){
            const alpha=pixels[(y*width+x)*4+3];if(alpha<96)continue;
            const weight=alpha*(1+(y-start)/Math.max(1,bottom-start));mass+=weight;sum+=(x-left+.5)*weight;
        }
        return mass?sum/mass:(right-left)/2;
    }
    function isolatedFrame(image,sx,sy,sw,sh){
        sx=Math.round(sx);sy=Math.round(sy);sw=Math.round(sw);sh=Math.round(sh);
        const fallback={image,sx,sy,sw,sh,width:sw,height:sh};
        if(!image||typeof document==="undefined")return fallback;
        let cache=isolatedFrames.get(image);if(!cache){cache=new Map();isolatedFrames.set(image,cache);}
        const key=`${sx}:${sy}:${sw}:${sh}`;if(cache.has(key))return cache.get(key);
        const cell=document.createElement("canvas");cell.width=sw;cell.height=sh;
        const ctx=cell.getContext("2d",{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
        ctx.drawImage(image,sx,sy,sw,sh,0,0,sw,sh);
        const pixels=ctx.getImageData(0,0,sw,sh).data;let left=sw,top=sh,right=0,bottom=0;
        for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(pixels[(y*sw+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);}
        if(right<=left||bottom<=top){cache.set(key,fallback);return fallback;}
        const width=right-left,height=bottom-top,pad=2,canvas=document.createElement("canvas");canvas.width=width+pad*2;canvas.height=height+pad*2;
        canvas.getContext("2d").drawImage(cell,left,top,width,height,pad,pad,width,height);
        const frame={image:canvas,sx:pad,sy:pad,sw:width,sh:height,width,height,footX:footAnchor(pixels,sw,sh,[left,top,right,bottom]),footLeft:0,footRight:width};cache.set(key,frame);return frame;
    }
    function figureRect(frame,width,height,normalize=true){
        // Equal opaque height, rather than equal source-cell size, across the party.
        const scale=normalize?height*.82/Math.max(1,frame.height):Math.min(width/Math.max(1,frame.width),height/Math.max(1,frame.height));
        return {x:-(frame.footX??frame.width/2)*scale,y:-frame.height*scale,width:frame.width*scale,height:frame.height*scale};
    }
    function pieceMotion(time,size,{moving=true,seed=0,direction=1}={}){
        if(!moving)return {x:0,y:0,angle:0,lift:0,phase:0};
        // Gentle cutout rocking: a smooth left/right cycle every 36 frames.
        // Keep the pivot at the feet and move the base with the figure.
        const phase=((time/36+seed*.173)%1+1)%1;
        const sway=Math.sin(phase*Math.PI*2),hop=Math.sin(phase*Math.PI*2)**2;
        return {x:0,y:-size*.035*hop,angle:direction*sway*.105,lift:hop,phase};
    }
    function woodenBase(c,x,y,size){
        c.save();c.lineWidth=1.2;c.strokeStyle="#21160f";
        c.fillStyle="#302016";c.beginPath();c.ellipse(x,y+2,size*.42,size*.095,0,0,Math.PI*2);c.fill();c.stroke();
        c.fillStyle="#59402a";c.beginPath();c.ellipse(x,y-1,size*.42,size*.075,0,0,Math.PI*2);c.fill();c.stroke();
        // Uneven nested rings read as a cut wooden plinth, with a darker bark rim.
        c.lineWidth=.65;c.strokeStyle="#7b5837";
        for(let i=0;i<3;i++){c.beginPath();c.ellipse(x+(i%2?1:-1)*size*.013,y-1,size*(.235-i*.052),size*(.053-i*.011),0,0,Math.PI*2);c.stroke();}
        c.strokeStyle="#382619";c.beginPath();c.moveTo(x-size*.25,y+size*.018);c.lineTo(x-size*.07,y-size*.008);c.moveTo(x+size*.12,y-size*.045);c.lineTo(x+size*.27,y-size*.012);c.stroke();c.restore();
    }
    function drawWalkingFrame(c,image,sx,sy,sw,sh,x,y,w,h,pattern,options={}){
        const time=options.time??(typeof Graphics!=="undefined"?Graphics.frameCount:0),motion=pieceMotion(time,h,options);
        // Only the standing cell is used. Quick alternating tilts replace leg animation.
        const frame=isolatedFrame(image,sx+(1-pattern)*sw,sy,sw,sh),rect=figureRect(frame,w,h);
        c.save();try{
            c.translate(x+w/2+motion.x,y+h+motion.y);c.rotate(motion.angle);
            woodenBase(c,0,0,w);c.imageSmoothingEnabled=false;
            c.drawImage(frame.image,frame.sx,frame.sy,frame.sw,frame.sh,rect.x,rect.y,rect.width,rect.height);
        }finally{c.restore();}
    }
    function layout(width,height,fighters){
        const top=46,bottom=height-72,h=Math.max(32,bottom-top),rail=0,gap=7;
        const scene={x:8+rail+gap,y:top,width:Math.max(60,width-16-2*(rail+gap)),height:h};
        const positions=new Map(),rows=[];
        for(const side of ["player","enemy"]){
            const group=fighters.filter(f=>f.side===side),rh=h/Math.max(1,group.length);
            group.forEach((f,i)=>{
                const depth=group.length===1?.75:lerp(group.length>3?.51:.62,.94,i/(group.length-1));
                const enemyFormation=side==="enemy"&&group.length>3;
                const x=side==="player"?scene.x+scene.width*(group.length===1?.25:.1+i*.32/Math.max(1,group.length-1)):scene.x+scene.width*(enemyFormation?[.59,.76,.92,.67,.85][i%5]:.84-(i%2)*.12);
                const size=Math.min(group.length>3?64:94,h*(group.length>3?.4:.59),scene.width*(side==="player"?(group.length>3?.11:.145):enemyFormation?.17:.34));
                const groundDepth=enemyFormation?(i<3?.51:.94):depth;
                const counterStacked=scene.width<400&&h>90,counterHeight=66;
                const pos={key:f.key,side,x,y:side==="player"?bottom-counterHeight-4:Math.min(bottom-counterHeight-4,top+h*groundDepth),size:Math.max(4,Math.min(size,h-counterHeight-8)),counterStacked,counterWidth:Math.min(122,scene.width*.20,scene.width*.40/Math.max(1,group.length-1)-2)};if(side==="enemy"){
                    const columns=Math.min(3,group.length),rowCount=Math.ceil(group.length/3),row=Math.floor(i/3),rowHeight=h/rowCount;
                    pos.x=scene.x+scene.width*(.90-(i%3)*.16);
                    pos.y=top+(row+1)*rowHeight-counterHeight-4;
                    pos.size=Math.max(4,Math.min(84,scene.width*.16,rowHeight-counterHeight-8));
                    pos.counterWidth=Math.min(122,scene.width*.15);
                }
                if(side==="enemy"&&(/owlbear|giant|ogre|troll|minotaur|treant|wyrmling/i.test(f.id+" "+f.name)||f.boss))pos.size=Math.min(pos.size*(f.boss?1.45:1.3),h-counterHeight-12);
                positions.set(f.key,pos);
                rows.push({key:f.key,side,x:side==="player"?8:width-8-rail,y:top+i*rh,width:rail,height:rh});
            });
        }
        return {top,bottom,height:h,scene,positions,rows};
    }
    function stats(f,event={},t=0){
        const value={health:Math.max(0,Number(f.health)||0),armor:Math.max(0,Number(f.armor)||0),ward:Math.max(0,Number(f.ward)||0),life:f.presentationLifeState||null};
        if(f.key!==event.targetKey)return value;
        if(!event.missed){
            if(t>=.44&&Number.isFinite(event.targetWard))value.ward=Math.max(0,event.targetWard);
            if(t>=.54&&Number.isFinite(event.targetArmor))value.armor=Math.max(0,event.targetArmor);
            if(t>=.64&&Number.isFinite(event.targetHealth))value.health=Math.max(0,event.targetHealth);
        }
        if(t>=.55&&event.sourceType==="defeat"){value.health=0;value.life=f.side==="enemy"?"defeated":"down";}
        if(t>=.55&&event.sourceType==="deathSave"){value.health=0;value.life=beat(event)==="death"?"dead":event.survived===true||/survives the Death Save/i.test(event.text||"")?"saved":"down";}
        return value;
    }
    function attackStyle(f,event){
        const text=`${f?.classId||""} ${f?.role||""} ${event?.action||""}`;
        if(/mage|mystic|cleric|support|bard|necrom|sorcer|cult|magic|arcane|rune|spark|pulse|storm|hex|flame/i.test(text))return "spell";
        return /ranger|archer|bow|shot|arrow|bolt/i.test(text)?"ranged":"melee";
    }
    function enemyCell(f){
        if(f.enemyArt)return null;
        const text=`${f.id||""} ${f.name||""}`.toLowerCase();
        if(/goblin/.test(text))return 0;if(/skeleton/.test(text))return 1;if(/wolf/.test(text))return 2;if(/spider/.test(text))return 3;
        if(/mimic/.test(text))return 4;if(/orc|ogre|troll/.test(text))return 5;if(/necrom|cult|mage|sorcer|wraith|jester/.test(text))return 6;if(/demon|imp|harpy/.test(text))return 7;
        return null;
    }
    function travelMembers(trip,lookup=()=>null,gear=()=>null){
        return (trip.preparedTeam||[]).slice(0,3).map(member=>{
            const source=member,dead=!!trip.expeditionDeaths?.[member.id]||source.alive===false||source.condition==="Dead";
            const armor=Number.isFinite(source.armor)?source.armor:(Number(source.classArmor)||0)+(source.equipmentSlots?Object.values(source.equipmentSlots).reduce((sum,id)=>{
                const max=Math.max(0,Number(gear(id)?.armor)||0),current=source.equipmentCondition?.[id]?.current;
                return sum+(id?clamp(Number.isFinite(current)?current:max,0,max):0);
            },0):Math.max(0,Number(source.armor)||0));
            const ward=Number.isFinite(source.ward)?source.ward:Number.isFinite(source.innateWard)||Number.isFinite(source.temporaryWard)?(Number(source.innateWard)||0)+(Number(source.temporaryWard)||0):Number(source.ward)||0;
            return {...member,down:!!member.incapacitated,maxArmor:Math.max(member.maxArmor||0,source.maxArmor??((source.classArmorMax||0)+Object.values(source.equipmentSlots||{}).reduce((n,id)=>n+(gear(id)?.armor||0),0))),maxWard:Math.max(member.maxWard||0,(source.innateWardMax||source.arcaneArmor||0)+(source.temporaryWard||0)),health:dead||member.incapacitated?0:Math.max(0,Number(source.health)||0),maxHealth:Math.max(1,Number(source.maxHealth)||0,Number(member.maxHealth)||0),armor:dead?0:armor,ward:dead?0:Math.max(0,ward),dead,wounded:source.condition==="Wounded"||!!source.injury};
        }).filter(n=>!n.dead&&!n.down&&n.health>0&&!trip.expeditionInjuries?.[n.id]);
    }
    function pagedText(api,win,text,x,y,width,size,lineHeight,rows,t,color){
        win.contents.fontSize=size;const lines=[];let line="";
        for(const word of String(text).split(/\s+/)){
            for(const ch of (line?" ":"")+word){if(line&&win.textWidth(line+ch)>width){lines.push(line);line="";}line+=ch;}
        }if(line)lines.push(line);
        const pages=Math.max(1,Math.ceil(lines.length/rows)),page=Math.min(pages-1,Math.floor(t*pages));
        lines.slice(page*rows,page*rows+rows).forEach((line,i)=>api.text(win,line,x,y+i*lineHeight,width,size,color,"left",lineHeight));
    }
    function annotation(api,win,trip,bottom,t){
        const b=win.contents,w=win.innerWidth,e=trip.presentationCurrent||{},outline=b.outlineWidth;b.outlineWidth=0;
        api.round(b,8,bottom+3,w-16,59,TOKENS.parchment,"#cbb86d",5);
        try{
            pagedText(api,win,e.text||trip.latestEvent||"Your companions follow the trail.",17,bottom+7,w-34,18,24,2,t,/dies|damage|falls|Wounded|death/i.test(e.text||"")?"#9b2637":/heal|restor|Gold|Arcana/i.test(e.text||"")?"#216b43":TOKENS.ink);

        }finally{b.outlineWidth=outline;}
    }
    function counters(api,win,values,x,y,width,stacked=false,labels=false){
        api.round(win.contents,x,y,width,48,"#d9bb72f5","#fff0bd",4);
        const outline=win.contents.outlineWidth;win.contents.outlineWidth=0;
        const fields=[[api.heart,values.health,values.maxHealth,"HP"],[api.shield,values.armor,Math.max(values.armor,values.maxArmor||0),"Armor"],[api.ward,values.ward,Math.max(values.ward,values.maxWard||0),"Ward"]];
        fields.forEach(([icon,current,max,label],i)=>{
            const fy=y+i*16,capacity=Math.max(0,Math.floor(max||0)),start=x+32,available=Math.max(1,width-35-(width>=90?34:0)),twoRows=capacity*7>available,columns=twoRows?Math.ceil(capacity/2):capacity,size=Math.min(twoRows?7:15,available/Math.max(1,columns));
            api.text(win,label,x+3,fy,28,11,"#302b35","left",16);
            if(width>=90)api.text(win,`${Math.max(0,Math.floor(current||0))}/${capacity}`,x+width-34,fy,31,11,"#302b35","right",16);
            for(let j=0;j<capacity;j++)icon(win.contents,start+(j%Math.max(1,columns))*size,fy+1+Math.floor(j/Math.max(1,columns))*8,Math.max(1,size-1),j<current);
            if(!capacity)api.text(win,"—",start,fy,available,11,"#514a50","left",16);
        });
        win.contents.outlineWidth=outline;
    }
    class TravelStage {
        constructor(api){this.api=api;this.background=null;this.cacheKey=null;this.backgroundBuilds=0;this.scroll=0;this.walkTime=0;this.lastFrame=null;this.tripId=null;this.lastMembers=[];}
        suspend(){this.lastFrame=null;}
        destroy(){if(this.background)this.background.destroy();this.background=null;this.cacheKey=null;this.suspend();}
        advance(trip,frame,active){
            if(this.tripId!==trip.id){this.tripId=trip.id;this.scroll=0;this.walkTime=0;this.lastFrame=frame;}
            const delta=active&&!trip.wiped&&trip.phase!=="campfire"&&this.lastFrame!==null?clamp(frame-this.lastFrame,0,6):0;this.lastFrame=frame;
            this.scroll+=(trip.phase==="return"&&trip.returnNarrated!==false?-1:1)*delta*.45;this.walkTime+=delta;return delta;
        }
        backdrop(win,theme,top,height,trip={}){
            const a=this.api,quest=a.quest?.(trip.questId)||{},spec=backgroundSpec(trip,quest),art=backgroundArt(a,trip,quest),ready=art.isReady(),w=win.innerWidth-16,key=`${w}:${height}:${spec.folder}:${spec.name}:${ready}`;this.lastBackground=spec;
            if(this.cacheKey!==key){
                if(this.background)this.background.destroy();const b=a.bitmap(w*2,height);this.background=b;this.cacheKey=key;this.backgroundBuilds++;
                b.gradientFillRect(0,0,b.width,height,theme==="cavern"?"#455e65":"#6d8e62",theme==="cavern"?"#92826b":"#a59c70",true);
                if(ready){
                    const sh=Math.min(art.height,art.width*height/w),sy=clamp(art.height*.47-sh*.4,0,art.height-sh);
                    const scale=Math.max(w/art.width,height/art.height),sw=w/scale,sourceH=height/scale;
                    b.blt(art,(art.width-sw)/2,(art.height-sourceH)/2,sw,sourceH,0,0,w,height);
                    const c=b.context;c.save();c.translate(w*2,0);c.scale(-1,1);c.drawImage(art.canvas,(art.width-sw)/2,(art.height-sourceH)/2,sw,sourceH,0,0,w,height);c.restore();b.baseTexture.update();

                }else{
                    for(let i=0;i<18;i++)a.ellipse(b,i*b.width/17,12,22,25,theme==="cavern"?"#475c63":"#486846");
                    a.ellipse(b,w,height*.75,w*.9,height*.25,"#ae9c75");
                }
            }
            const period=this.background.width,offset=((this.scroll*.3)%period+period)%period,first=Math.min(w,period-offset);this.lastOffset=offset;this.lastScroll=this.scroll;
            win.contents.blt(this.background,offset,0,first,height,8,top,first,height);
            if(first<w)win.contents.blt(this.background,0,0,w-first,height,8+first,top,w-first,height);
            // Foreground pebbles/ferns move faster than the distant environment.
            for(let i=0;i<10;i++){
                const x=12+((i*w/10-this.scroll*.9)%Math.max(1,w-8)+w-8)%(w-8),y=top+height*.84+(i%2)*4;
                a.ellipse(win.contents,x,y,5+(i%3),2,theme==="cavern"?"#c1ae85a0":"#c8bc83a0");
            }
        }
        actor(win,npc,x,feet,size,returning,index){
            if(npc.dead||npc.down||npc.health<=0)return;
            const a=this.api,b=win.contents,face=walkingFace(npc),pattern=npc.dead||npc.down?1:[0,1,2,1][Math.floor(this.walkTime/10+index)%4],custom=face.sheet==="RPGManagerMonsters",bitmap=a.art(custom?"pictures":"characters",custom?ART.enemies:face.sheet||"Actor1");
            const c=b.context;let sx,sy,sw,sh;
            a.ellipse(b,x,feet+1,size*.29,4,"#23382c80");
            if((npc.dead||npc.down)&&npc.reanimated){
                const fallen=a.art("sv_actors",`RPGSkeleton_${npc.classId}_v5`);
                if(fallen.isReady()){const sw=fallen.width/9,sh=fallen.height/6;c.save();c.imageSmoothingEnabled=false;c.globalAlpha=npc.dead?.65:1;c.drawImage(fallen.canvas,7*sw,5*sh,sw,sh,x-size/2,feet-size,size,size);c.restore();b.baseTexture.update();return;}
            }
            if((npc.dead||npc.down)&&npc.fallenPortrait){
                const f=npc.fallenPortrait,fallen=a.art("characters",f.sheet);
                if(fallen.isReady()){const sw=fallen.width/f.columns,sh=fallen.height/f.rows;c.save();c.imageSmoothingEnabled=false;c.globalAlpha=npc.dead?.65:1;c.drawImage(fallen.canvas,f.index%f.columns*sw,Math.floor(f.index/f.columns)*sh,sw,sh,x-size/2,feet-size,size,size);c.restore();b.baseTexture.update();return;}
            }
            if(bitmap.isReady()){
                if(custom){const r=CREATURE_RECTS[1];sx=r[0]/1774*bitmap.width;sy=r[1]/887*bitmap.height;sw=r[2]/1774*bitmap.width;sh=r[3]/887*bitmap.height;}
                else{const big=String(face.sheet).startsWith("$"),id=Math.max(0,Math.floor(Number(face.index)||0));sw=bitmap.width/(big?3:12);sh=bitmap.height/(big?4:8);sx=((big?0:id%4*3)+pattern)*sw;sy=((big?0:Math.floor(id/4)*4)+(returning?1:2))*sh;}
                c.save();try{c.globalAlpha=npc.dead?.4:1;c.translate(x,feet);c.imageSmoothingEnabled=custom;if(custom&&!returning)c.scale(-1,1);drawWalkingFrame(c,bitmap.canvas,sx,sy,sw,sh,-size/2,-size,size,size,custom?1:pattern,{time:this.walkTime,moving:this.moving,seed:index,direction:returning?-1:1});}finally{c.restore();}b.baseTexture.update();
            }else{
                c.save();c.fillStyle=npc.dead?"#acaaa1":"#c8d1ae";c.beginPath();c.arc(x,feet-size*.7,size*.13,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(x-size*.2,feet);c.lineTo(x,feet-size*.55);c.lineTo(x+size*.2,feet);c.closePath();c.fill();c.restore();b.baseTexture.update();
            }
        }
        campfire(win,x,y,scale){
            const b=win.contents,c=b.context,motion=this.api.motion?.()??1,t=this.api.frame()/60*motion;
            const flicker=1+Math.sin(t*9)*.07+Math.sin(t*17)*.035;
            c.save();c.translate(x,y);c.scale(scale,scale);
            // Broad reflected light anchors the fire in the scene rather than floating above it.
            const light=c.createRadialGradient(0,-25,4,0,-25,118);
            light.addColorStop(0,'#ffd26b88');light.addColorStop(.45,'#f7943840');light.addColorStop(1,'#ff702000');
            c.fillStyle=light;c.fillRect(-118,-143,236,236);
            c.save();c.scale(1,.3);const ground=c.createRadialGradient(0,0,8,0,0,95);
            ground.addColorStop(0,'#ffb64bbb');ground.addColorStop(1,'#ff8c2600');c.fillStyle=ground;c.fillRect(-95,-95,190,190);c.restore();
            // Stone ring, crossed charred logs and glowing coal bed.
            for(let i=0;i<11;i++){const angle=i*Math.PI*2/11;c.fillStyle=i<6?'#85766b':'#b3a08b';c.beginPath();c.ellipse(Math.cos(angle)*40,Math.sin(angle)*12,8,5,angle*.2,0,Math.PI*2);c.fill();}
            for(const angle of [-.22,.25]){c.save();c.rotate(angle);c.fillStyle='#4d2c20';c.fillRect(-34,-5,68,10);c.fillStyle='#bd6234';c.fillRect(-29,-4,58,3);c.restore();}
            c.fillStyle='#ec602b';c.beginPath();c.ellipse(0,-3,27,8,0,0,Math.PI*2);c.fill();
            // Several independently swaying tongues give the silhouette a strong, living shape.
            const flame=(offset,width,height,color,phase)=>{
                const sway=Math.sin(t*6+phase)*8,tip=height*flicker;
                c.fillStyle=color;c.beginPath();c.moveTo(offset-width/2,-4);
                c.bezierCurveTo(offset-width,-tip*.4,offset+sway+width*.3,-tip*.58,offset+sway,-tip);
                c.bezierCurveTo(offset+sway+width*.7,-tip*.7,offset+width,-tip*.25,offset+width/2,-4);c.closePath();c.fill();
            };
            flame(-17,34,64,'#ed5424',1);flame(17,34,74,'#ff7428',3);flame(0,49,98,'#ffa735',0);
            flame(-7,28,66,'#ffd660',2);flame(8,22,48,'#fff1b0',4);
            // Embers rise and fade; smoke stays translucent so scenery remains legible.
            for(let i=0;i<14;i++){
                const life=(t*(.3+i%3*.04)+i*.173)%1;
                c.globalAlpha=(1-life)*.85;c.fillStyle=i%2?'#ffe6a0':'#ff923d';
                const px=Math.sin(i*8.7+life*5)* (12+life*24),py=-18-life*130;
                c.fillRect(px,py,2+i%2,3+i%3);
            }
            for(let i=0;i<4;i++){
                const life=(t*.15+i*.25)%1;c.globalAlpha=Math.sin(life*Math.PI)*.13;c.fillStyle='#dbb9a1';
                c.beginPath();c.ellipse(Math.sin(life*4+i)*18,-65-life*100,9+life*20,12+life*17,0,0,Math.PI*2);c.fill();
            }
            c.restore();b.baseTexture.update();
        }
        render(win,trip){
            const a=this.api,b=win.contents,w=win.innerWidth,top=46,bottom=win.innerHeight-72,height=bottom-top,returning=trip.phase==="return"&&trip.returnNarrated!==false;
            this.advance(trip,a.frame(),a.active());this.moving=a.active()&&trip.phase!=="campfire"&&!trip.wiped;const theme=biome(trip,a.quest?.(trip.questId)||{});this.backdrop(win,theme,top,height,trip);
            a.text(win,trip.phase==="campfire"?"CAMPFIRE / ONE PEACEFUL MINUTE":trip.wiped?"EXPEDITION ENDED / FOCUS CONTINUES":returning?"THE ROAD HOME  <":"ON EXPEDITION  >",8,top-17,w-16,11,TOKENS.parchment,"left",14);
            if(trip.presentationCurrent?.trigger){a.round(b,w-134,top-19,126,18,"#eadbb8","#b39b6c",3);a.text(win,"FIELD NOTE / OBSERVED",w-130,top-18,118,10,TOKENS.ink,"center",16);}
            const members=travelMembers(trip,a.member,a.gear);this.lastMembers=members;
            const step=(w-28)/Math.max(1,members.length),hudY=bottom-86,feet=hudY-5,size=Math.max(24,Math.min(104,height-84,step*.65));
            const c=b.context;c.save();try{
                c.beginPath();c.rect(8,top,w-16,height);c.clip();
                members.forEach((npc,i)=>this.actor(win,npc,trip.phase==="campfire"?w*[.25,.75,.5][i]:14+step*(i+.5),feet-(trip.phase==="campfire"&&i===2?Math.min(90,height-84-size):0),size,trip.phase==="campfire"?i===1:returning,i));
                if(trip.phase==="campfire")this.campfire(win,w/2,feet-7,Math.max(.55,Math.min(1.2,(height-90)/140,w/620)));
            }finally{c.restore();}
            members.forEach((npc,i)=>{
                const x=14+step*i,cardW=step-6;
                a.round(b,x,hudY,cardW,85,"#243b78f5",npc.dead?TOKENS.danger:npc.wounded?"#d6af85":"#8d9c73",4);
                const name=`${npc.name} / ${npc.reanimated?"Zombie ":""}${String(npc.classId||npc.role).replace(/^./,c=>c.toUpperCase())} L${npc.level||1}`;
                pagedText(a,win,name,x+4,hudY+1,cardW-8,17,18,2,progress(trip),npc.dead?TOKENS.danger:TOKENS.parchment);
                counters(a,win,npc,x+2,hudY+37,cardW-4,true,true);
            });
            annotation(a,win,trip,bottom,progress(trip));
        }
    }
    class Animator {
        constructor(){this.event=null;this.effects=[];this.frame=null;this.starts=0;this.finishes=0;}
        start(event){this.finish();this.event=event;this.starts++;}
        finish(){if(this.event)this.finishes++;this.event=null;this.effects.length=0;this.frame=null;}
        update(trip,geometry){
            const event=trip.presentationCurrent;if(!event){this.finish();return null;}if(event!==this.event)this.start(event);
            const t=progress(trip),kind=beat(event),fighters=trip.presentationFighters?.length?trip.presentationFighters:trip.preparedTeam||[];
            const actor=fighters.find(f=>f.key===event.actorKey),style=attackStyle(actor,event),poses=new Map();
            const source=geometry.positions.get(event.actorKey),target=geometry.positions.get(event.targetKey),pulse=Math.sin(Math.PI*clamp((t-.2)/.62));
            for(const f of fighters){const base=geometry.positions.get(f.key);if(!base)continue;const state=stats(f,event,t),pose={...base,...state,dx:0,dy:0,angle:0,alpha:state.health<=0?.45:1,motion:state.health<=0?17:1,pattern:Math.min(2,Math.floor(t*6)%3)};
                if(kind==="opening"){pose.dx=(f.side==="player"?-1:1)*(1-clamp(t/.5))*16;pose.alpha*=clamp(.3+t*2);}
                if(f.key===event.actorKey&&["attack","signature","miss"].includes(kind)&&source&&target){
                    const direction=Math.sign(target.x-source.x);pose.dx=direction*pulse*(style==="melee"?Math.min(32,Math.abs(target.x-source.x)*.25):5);
                    pose.angle=direction*-.08*pulse;pose.motion=style==="spell"?10:style==="ranged"?8:kind==="signature"?9:7;
                }
                if(f.key===event.targetKey&&t>.4&&t<.84){
                    if(kind==="miss"){pose.dx=(source?Math.sign(base.x-source.x):1)*14*Math.sin((t-.4)/.44*Math.PI);pose.dy=-3*Math.sin((t-.4)/.44*Math.PI);pose.motion=5;}
                    else if(["attack","signature"].includes(kind)&&t>.62&&(event.damage||0)>0){pose.dx=Math.sin(t*70)*3*(1-t);pose.motion=4;}
                }
                if(state.health<=0){pose.motion=17;pose.pattern=1;pose.alpha=0;pose.angle=0;}
                if(kind==="ending"&&state.health>0){
                    const celebrating=f.side==="player"&&(event.outcome==="victory"||event.trigger==="VICTORY");
                    pose.motion=celebrating?13:1;
                    pose.pattern=celebrating?Math.min(2,Math.floor(t*9)%3):1;
                    pose.dy=celebrating?-Math.abs(Math.sin(t*Math.PI*3))*5:0;
                    pose.angle=0;
                }
                poses.set(f.key,pose);
            }
            this.effects.length=0;
            if(source&&target&&["attack","signature","miss"].includes(kind)){
                if(t>.18&&t<.6)this.effects.push({type:style==="melee"?"swing":"projectile",source,target,phase:clamp((t-.18)/.28),signature:kind==="signature"||!!event.criticalHit,style,missed:!!event.missed});
                if(kind==="miss"&&t>=.44)this.effects.push({type:"miss",target,phase:t});
                if(!event.missed){for(const [type,value,start,end] of [["ward",event.wardLoss,.42,.62],["armor",event.armorLoss,.52,.72],["hp",event.damage,.62,.85]])if(value>0&&t>=start&&t<end)this.effects.push({type,target,value,phase:(t-start)/(end-start)});}
            }
            if(target&&["fall","death","deathSave"].includes(kind)&&t>.45)this.effects.push({type:kind,target,phase:clamp((t-.45)/.55)});
            if(kind==="heal"&&target)this.effects.push({type:"heal",target,phase:t});
            this.frame={t,kind,style,poses,effects:this.effects};return this.frame;
        }
    }
    class Stage {
        constructor(api){this.api=api;this.animator=new Animator();this.background=null;this.cacheKey=null;this.backgroundBuilds=0;this.lastFrame=null;}
        finish(){this.animator.finish();this.lastFrame=null;}
        destroy(){this.finish();if(this.background)this.background.destroy();this.background=null;this.cacheKey=null;}
        backdrop(win,geometry,theme,boss,quest={},trip={}){
            const shared=this.api.travelBackdrop?.(win,trip,geometry);if(shared){this.lastBackground=shared.spec;this.lastOffset=shared.offset;return;}
            const a=this.api,spec=backgroundSpec(trip,quest),art=backgroundArt(a,trip,quest),ready=art.isReady(),key=`${win.innerWidth}:${geometry.height}:${theme}:${spec.folder}:${spec.name}:${boss}:${ready}`;this.lastBackground=spec;
            if(key!==this.cacheKey){
                if(this.background)this.background.destroy();const b=a.bitmap(win.innerWidth-16,geometry.height);this.background=b;this.cacheKey=key;this.backgroundBuilds++;
                b.gradientFillRect(0,0,b.width,b.height,theme==="cavern"?"#37515b":"#79956a",theme==="cavern"?"#88816a":"#b2a775",true);
                if(ready){const sh=Math.min(art.height,art.width*b.height/b.width),sy=clamp(art.height*.47-sh*.4,0,art.height-sh);b.blt(art,0,sy,art.width,sh,0,0,b.width,b.height);}
                else{for(let i=0;i<9;i++){a.ellipse(b,i*b.width/8,10,22,28,theme==="cavern"?"#536567":"#426446");}a.ellipse(b,b.width/2,b.height*.83,b.width*.37,b.height*.19,"#b1a27d");}
                b.fillRect(0,0,geometry.scene.x-12,b.height,TOKENS.rail);b.fillRect(b.width-(geometry.scene.x-12),0,geometry.scene.x-12,b.height,"#403b30ed");
                b.fillRect(0,b.height-2,b.width,2,boss?TOKENS.honey:"#adbd94");
            }
            win.contents.blt(this.background,0,0,this.background.width,this.background.height,8,geometry.top);
        }
        battler(win,f,pose,frame){
            if(pose.health<=0)return;
            const a=this.api,b=win.contents,face=walkingFace(f),index=Math.max(0,Math.floor(Number(face.index)||0)),cell=f.reanimated&&!f.combatPortrait?.sheet?1:f.side==="enemy"?enemyCell(f):null;let bitmap,sx=0,sy=0,sw=0,sh=0,flip=false,kind="fallback";
            if(f.enemyArt){bitmap=a.art("pictures",f.enemyArt.sheet);if(bitmap.isReady()){sw=bitmap.width/f.enemyArt.columns;sh=bitmap.height/f.enemyArt.rows;sx=(f.enemyArt.index%f.enemyArt.columns)*sw;sy=Math.floor(f.enemyArt.index/f.enemyArt.columns)*sh;kind="atlas";}}
            if(cell!==null){bitmap=a.art("pictures",ART.enemies);if(bitmap.isReady()){
                const r=CREATURE_RECTS[cell];sx=r[0]/1774*bitmap.width;sy=r[1]/887*bitmap.height;sw=r[2]/1774*bitmap.width;sh=r[3]/887*bitmap.height;kind="atlas";flip=f.side==="player";
            }}
            if(kind==="fallback"&&(f.combatPortrait?.sheet||/^Actor[123]$/.test(face.sheet||""))){
                bitmap=a.art("sv_actors",f.combatPortrait?.sheet||`${face.sheet}_${index+1}`);
                if(bitmap.isReady()){sw=bitmap.width/9;sh=bitmap.height/6;sx=(Math.floor(pose.motion/6)*3+pose.pattern)*sw;sy=pose.motion%6*sh;flip=f.side==="player";kind="sv";}
            }
            if(kind==="fallback"&&face.sheet&&face.sheet!=="RPGManagerMonsters"){
                bitmap=a.art("characters",face.sheet);if(bitmap.isReady()){const big=String(face.sheet).startsWith("$");sw=bitmap.width/(big?3:12);sh=bitmap.height/(big?4:8);sx=((big?0:index%4*3)+pose.pattern)*sw;sy=((big?0:Math.floor(index/4)*4)+(f.side==="player"?2:1))*sh;kind="walk";}
            }
            const x=pose.x+pose.dx,y=pose.y+pose.dy,size=pose.size,c=b.context;let artCenterX=0;
            const isolated=kind!=="fallback"?isolatedFrame(bitmap.canvas,sx,sy,sw,sh):null;
            const figure=isolated?figureRect(isolated,kind==="atlas"?size*1.5:size,size,f.side==="player"):null;
            const baseSize=figure?Math.max(size*1.15,Math.max(Math.abs(figure.x),Math.abs(figure.x+figure.width))/.40):size*1.15;
            a.ellipse(b,pose.x,pose.y-1,size*.29,size*.07,"#22372d80");
            c.save();try{
                c.globalAlpha=pose.alpha;c.translate(x,y);c.rotate(pose.angle);woodenBase(c,0,0,baseSize);if(flip)c.scale(-1,1);c.imageSmoothingEnabled=kind!=="sv"&&kind!=="walk";
                if(kind!=="fallback"){
                    const rect=figure;artCenterX=rect.x+rect.width/2;
                    c.drawImage(isolated.image,isolated.sx,isolated.sy,isolated.sw,isolated.sh,rect.x,rect.y,rect.width,rect.height);
                }
                else{c.fillStyle=f.side==="player"?"#a9c7b5":"#d8b19b";c.beginPath();c.arc(0,-size*.68,size*.13,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(-size*.2,-size*.18);c.lineTo(0,-size*.55);c.lineTo(size*.2,-size*.18);c.closePath();c.fill();}
            if(/masked_jester/.test(f.id||"")){c.save();c.translate(artCenterX,0);
                    c.fillStyle="#eee3ca";c.beginPath();c.ellipse(0,-size*.69,size*.115,size*.09,0,0,Math.PI*2);c.fill();
                    c.fillStyle="#302248";for(const eye of [-1,1]){c.beginPath();c.ellipse(eye*size*.047,-size*.70,size*.025,size*.015,0,0,Math.PI*2);c.fill();}
                    c.fillStyle="#8b3d87";c.beginPath();c.moveTo(-size*.14,-size*.76);c.lineTo(-size*.20,-size*.97);c.lineTo(0,-size*.84);c.lineTo(size*.20,-size*.97);c.lineTo(size*.14,-size*.76);c.closePath();c.fill();c.restore();
                }
            }finally{c.restore();}b.baseTexture.update();
            if(f.key===this.animator.event?.actorKey||f.key===this.animator.event?.targetKey){
                const target=f.key===this.animator.event.targetKey;a.ellipse(b,pose.x,pose.y,size*.38,size*.1,target?"#edc98585":"#92d8e185");
                const ix=pose.x,iy=Math.max(this.lastGeometry.top+13,pose.y-size-16);c.save();c.translate(ix,iy);c.strokeStyle=target?"#ff5252":"#53e989";c.fillStyle=target?"#a72835":"#2c7748";c.lineWidth=3;
                if(target){c.beginPath();c.moveTo(-11,-11);c.lineTo(11,-11);c.lineTo(10,3);c.quadraticCurveTo(8,10,0,14);c.quadraticCurveTo(-8,10,-10,3);c.closePath();c.fill();c.stroke();}
                else{c.rotate(.65);c.beginPath();c.moveTo(0,-15);c.lineTo(5,-7);c.lineTo(4,5);c.lineTo(-4,5);c.lineTo(-5,-7);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(-9,5);c.lineTo(9,5);c.moveTo(0,5);c.lineTo(0,15);c.stroke();}c.restore();b.baseTexture.update();
            }
        }
        effect(win,e,showLabel=true){
            const a=this.api,b=win.contents,c=b.context,p=e.phase,target=e.target,color=e.type==="ward"?TOKENS.ward:e.type==="armor"?TOKENS.armor:e.type==="heal"?"#b6df9c":TOKENS.hit;
            c.save();try{
                c.lineWidth=2;c.strokeStyle=color;c.fillStyle=color;
                if(e.type==="projectile"){
                    const x=lerp(e.source.x,target.x,p),y=lerp(e.source.y-e.source.size*.55,target.y-target.size*.55-(e.missed?10:0),p)-Math.sin(p*Math.PI)*8;
                    c.strokeStyle=e.style==="spell"?(e.signature?"#e2b1f4":"#aee6df"):"#f3d095";c.fillStyle=c.strokeStyle;
                    c.beginPath();c.moveTo(x-(target.x>e.source.x?15:-15),y+2);c.lineTo(x,y);c.stroke();c.beginPath();c.arc(x,y,e.style==="spell"?5:2,0,Math.PI*2);c.fill();
                    if(e.signature){c.shadowColor=c.strokeStyle;c.shadowBlur=22;for(let i=0;i<8;i++){const angle=i*Math.PI/4+p*4;c.globalAlpha=.8;c.beginPath();c.arc(x+Math.cos(angle)*20,y+Math.sin(angle)*20,4,0,Math.PI*2);c.fill();}c.beginPath();c.arc(x,y,27,0,Math.PI*2);c.stroke();}
                }else if(e.type==="swing"){
                    c.strokeStyle=e.signature?TOKENS.ward:TOKENS.honey;c.lineWidth=e.signature?9:3;c.beginPath();c.arc(target.x,target.y-target.size*.6,Math.max(8,target.size*.35),-.9+p,.9+p);c.stroke();
                }else if(["ward","armor","hp","heal"].includes(e.type)){
                    const x=target.x,y=target.y-target.size*.55;c.globalAlpha=Math.sin(p*Math.PI);
                    if(e.type==="ward"){c.beginPath();c.moveTo(x,y-18);c.lineTo(x+16,y);c.lineTo(x,y+18);c.lineTo(x-16,y);c.closePath();c.stroke();}
                    else{for(let i=0;i<6;i++){const angle=i*Math.PI/3,r=8+p*12;c.beginPath();c.moveTo(x+Math.cos(angle)*5,y+Math.sin(angle)*5);c.lineTo(x+Math.cos(angle)*r,y+Math.sin(angle)*r);c.stroke();}}
                    c.globalAlpha=1;if(showLabel)a.text(win,`${e.type.toUpperCase()} ${e.type==="heal"?"+":"-"}${e.value||""}`,x-55,Math.max(this.lastGeometry.top,y-30-p*4),110,24,color,"center",25);
                }else if(e.type==="miss")a.text(win,"MISS",target.x-55,Math.max(this.lastGeometry.top,target.y-target.size-8),110,30,TOKENS.parchment,"center",28);
                else if(["fall","death","deathSave"].includes(e.type)){
                    c.globalAlpha=1-p;for(let i=0;i<5;i++){c.beginPath();c.arc(target.x+Math.cos(i*1.5)*(8+p*15),target.y-target.size*.45-Math.sin(i*1.5)*p*12,3,0,Math.PI*2);c.stroke();}
                }
            }finally{c.restore();}b.baseTexture.update();
        }
        status(win,f,row,event,t,all){
            const a=this.api,b=win.contents,state=stats(f,event,t),prefix=f.key===event.actorKey?"> ":f.key===event.targetKey?"* ":"";
            const duplicates=all.filter(n=>n.side===f.side&&n.name===f.name),name=duplicates.length>1?`${f.name} ${duplicates.indexOf(f)+1}`:f.name;
            const life=state.life==="dead"?"DEAD":state.life==="saved"?"SAVED":state.health<=0?(f.side==="enemy"?"DEFEATED":"DOWN"):"";
            a.round(b,row.x,row.y,row.width-2,row.height-3,TOKENS.rail,prefix?TOKENS.honey:"#6987bb",4);
            pagedText(a,win,`${prefix}${name}`,row.x+5,row.y+1,row.width-12,17,19,2,t,state.health<=0?TOKENS.danger:TOKENS.parchment);
            a.text(win,`${life||"HP"} ${state.health}/${f.maxHealth||state.health}`,row.x+5,row.y+40,row.width-12,15,TOKENS.party,"left",18);
            a.text(win,`A ${state.armor} / W ${state.ward}`,row.x+5,row.y+58,row.width-12,15,TOKENS.armor,"left",18);
        }
        render(win,trip){
            const event=trip.presentationCurrent||{},boss=event.bossEncounter??trip.boss,fighters=trip.presentationFighters?.length?trip.presentationFighters:(trip.preparedTeam||[]).map(f=>({...f,key:f.key||`player:${f.id}`,side:f.side||"player"}));
            const geometry=layout(win.innerWidth,win.innerHeight,fighters);this.lastGeometry=geometry;
            const frame=this.animator.update({...trip,presentationFighters:fighters},geometry);this.lastFrame=frame;if(!frame)return;
            const a=this.api,b=win.contents,quest=a.quest?.(trip.questId)||{},theme=biome(trip,quest),motion=a.motion?.()??1;for(const pose of frame.poses.values()){pose.dx*=motion;pose.dy*=motion;pose.angle*=motion;}
            this.backdrop(win,geometry,theme,boss,quest,trip);
            const c=b.context;c.save();try{
                // Artwork and every effect are clipped to the center action lane; HUD never moves.
                c.beginPath();c.rect(geometry.scene.x,geometry.top,geometry.scene.width,geometry.height);c.clip();
                for(const f of [...fighters].sort((x,y)=>(frame.poses.get(x.key)?.y||0)-(frame.poses.get(y.key)?.y||0)))if(frame.poses.has(f.key))this.battler(win,f,frame.poses.get(f.key),frame);
                const source=geometry.positions.get(event.actorKey),target=geometry.positions.get(event.targetKey);
                if(source&&target){c.save();c.globalAlpha=.35;c.strokeStyle=TOKENS.honey;c.setLineDash([3,4]);c.beginPath();c.moveTo(source.x,source.y-8);c.lineTo(target.x,target.y-8);c.stroke();c.restore();}
                const layers=frame.effects.filter(e=>["ward","armor","hp"].includes(e.type)),latest=layers[layers.length-1];
                if(event.criticalHit&&frame.t>.42&&frame.t<.8){c.save();c.fillStyle="#fff2bf";c.globalAlpha=.16*Math.sin((frame.t-.42)/.38*Math.PI);c.fillRect(geometry.scene.x,geometry.top,geometry.scene.width,geometry.height);c.restore();a.text(win,"? CRITICAL x2",geometry.scene.x,geometry.top+32,geometry.scene.width,25,TOKENS.honey,"center",32);}
                if((frame.kind==="signature"||event.attackKind==="signature")&&motion>0){const pulse=Math.sin(frame.t*Math.PI);c.save();c.globalAlpha=.2*pulse;c.fillStyle="#b377ff";c.fillRect(geometry.scene.x,geometry.top,geometry.scene.width,geometry.height);c.restore();if(source){c.save();c.strokeStyle="#ffe19b";c.lineWidth=3;c.globalAlpha=pulse;for(let i=0;i<12;i++){const angle=i*Math.PI/6+frame.t*3,r=24+frame.t*45;c.beginPath();c.moveTo(source.x+Math.cos(angle)*r,source.y-source.size*.5+Math.sin(angle)*r);c.lineTo(source.x+Math.cos(angle)*(r+14),source.y-source.size*.5+Math.sin(angle)*(r+14));c.stroke();}c.restore();}a.text(win,event.attackName||event.action||"SPECIAL MOVE",geometry.scene.x+8,geometry.top+32,geometry.scene.width-16,32,"#ffe6a3","center",30);}
                for(const e of motion===0?[]:frame.effects)this.effect(win,e,!layers.includes(e)||e===latest);
                for(const f of fighters){
                    const pos=geometry.positions.get(f.key),state=stats(f,event,frame.t);if(!pos||state.health<=0)continue;
                    if(pos.counterWidth<48)continue;
                    a.text(win,f.name,pos.x-pos.counterWidth/2,pos.y+2,pos.counterWidth,12,TOKENS.parchment,"center",18);
                    counters(a,win,{...state,maxArmor:f.maxArmor,maxWard:f.maxWard??((f.innateWardMax||f.arcaneArmor||0)+(f.temporaryWard||0)),maxHealth:Math.max(1,Number(f.maxHealth)||state.health)},pos.x-pos.counterWidth/2,pos.y+18,pos.counterWidth,pos.counterStacked);
                }
                if(["opening","round","ending","intent"].includes(frame.kind)){
                    const title=frame.kind==="opening"?(boss?"BOSS ENCOUNTER":"ENCOUNTER"):frame.kind==="round"?"ROUND":frame.kind==="intent"?"MORTAL INTENT":"BATTLE COMPLETE";
                    const y=geometry.top+3;a.round(b,geometry.scene.x+2,y,geometry.scene.width-4,26,"#f3e5c7ed",boss?TOKENS.honey:"#a59e7e",4);a.text(win,title,geometry.scene.x+6,y+2,geometry.scene.width-12,16,TOKENS.ink,"center",22);
                }
            }finally{c.restore();}b.baseTexture.update();

            if(event.sourceType==="deathSave"){
                const cx=geometry.scene.x+geometry.scene.width/2,cy=geometry.top+geometry.height/2;
                a.ellipse(b,cx,cy,Math.max(5,28*Math.abs(Math.cos(frame.t*Math.PI*8))),28,TOKENS.honey);
                a.text(win,frame.t<.65?"FATE COIN":event.survived?"WOUNDED — SURVIVES":"PERMANENT DEATH",cx-150,cy+34,300,22,event.survived?"#ffe8af":"#ff9c9c","center",30);
            }
            if(motion>0&&(frame.kind==="signature"||frame.kind==="heal")){
                const actor=fighters.find(f=>f.key===event.actorKey),colors={barbarian:"#e4a36a",knight:"#a8d4e7",ranger:"#a7d69c",rogue:"#e6b4dc",mage:"#bda2f0",cleric:"#ffe6a0"},color=colors[actor?.classId]||TOKENS.honey;
                const pose=geometry.positions.get(event.actorKey);if(pose&&frame.t<.42)a.ellipse(b,pose.x,pose.y-pose.size*.5,18+frame.t*45,9+frame.t*20,color+"88");
                a.text(win,`${frame.t<.35?"WIND-UP: ":""}${event.action||"Mending Light"}`,geometry.scene.x,geometry.top+4,geometry.scene.width,19,color,"center",26);
            }
            annotation(a,win,trip,geometry.bottom,frame.t);
        }
    }
    const api={footAnchor,isolatedFrame,figureRect,pieceMotion,woodenBase,drawWalkingFrame,backgroundSpec,TOKENS,ART,CREATURE_RECTS,biome,beat,isBattle,progress,layout,stats,attackStyle,enemyCell,travelMembers,counters,TravelStage,Animator,Stage};
    if(typeof module!=="undefined"&&module.exports)module.exports=api;
    if(typeof window!=="undefined")window.RPGManagerBattleStage=api;
})();
