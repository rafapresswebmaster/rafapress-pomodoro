/*:
 * @target MZ
 * @plugindesc Camp-first manager with one background real-time expedition.
 * @author RPG Manager
 * @help RPGManager.js
 * Enable RPGManagerBattle and RPGManagerProgression above this plugin.
 * Camp-first Home with one autonomous background expedition and four open-session camp jobs.
 * Start Quest opens a duration-and-difficulty-only procedural launch hub.
 * Compact battlefield replays copied combat events; it never rolls or applies damage.
 * Five roster slots, one to three companions per quest, free Tavern recruitment.
 * Prominent live MM:SS, optional once-only completion chime, stable Quest Results.
 * Workshop, Study and Rest use existing sprites with small code-drawn props.
 * Schema 23 saves retain history, compatibility fields and partial open-session progress.
 */

(() => {
    "use strict";
    // Phone portrait gets its own logical viewport instead of shrinking the
    // 816x624 desktop canvas into a narrow strip. This is presentation-only:
    // dimensions are selected before the first scene and never enter saves.
    const mobilePortraitAtBoot = globalThis.matchMedia?.("(pointer: coarse) and (max-width: 900px) and (orientation: portrait)")?.matches===true;
    function enableMobileTapSafety(root){if(root)root._mobileTapSafety=true;}
    const mobileScreenWakeLock=(()=>{
        // Some mobile browsers report a fine/absent primary pointer when an
        // external mouse is paired. Touch capability keeps phones/tablets in
        // scope even in that state; desktop-only devices remain unaffected.
        const enabled=(Number(navigator.maxTouchPoints)||0)>0||globalThis.matchMedia?.("(pointer: coarse)")?.matches===true;
        let sentinel=null,pending=null,retryTimer=0,suspended=document.visibilityState!=="visible";
        const status=value=>document.documentElement.dataset.screenWakeLock=value;
        const clearRetry=()=>{if(retryTimer){clearTimeout(retryTimer);retryTimer=0;}};
        const retry=(delay=1000)=>{
            if(!enabled||suspended||document.visibilityState!=="visible"||retryTimer)return;
            retryTimer=setTimeout(()=>{retryTimer=0;request();},delay);
        };
        const request=async()=>{
            if(!enabled||!("wakeLock" in navigator)){status(enabled?"unsupported":"desktop");return null;}
            if(suspended||document.visibilityState!=="visible"){status("hidden");return null;}
            if(sentinel&&!sentinel.released)return sentinel;
            if(pending)return pending;
            status("requesting");
            pending=navigator.wakeLock.request("screen").then(lock=>{
                sentinel=lock;clearRetry();status("active");
                lock.addEventListener("release",()=>{
                    if(sentinel===lock)sentinel=null;
                    status(!suspended&&document.visibilityState==="visible"?"released":"hidden");
                    // The OS may revoke a lock without hiding the page (power
                    // policy, transient browser state, etc.). A quest can be
                    // hands-off for many minutes, so do not rely on another tap.
                    retry();
                },{once:true});
                return lock;
            }).catch(()=>{status("unavailable");return null;}).finally(()=>{pending=null;});
            return pending;
        };
        const resume=()=>{suspended=false;clearRetry();return request();};
        const release=async()=>{suspended=true;clearRetry();const lock=sentinel;sentinel=null;if(lock&&!lock.released)try{await lock.release();}catch(_error){/* The browser may already have released it. */}status("hidden");};
        if(enabled){
            document.addEventListener("visibilitychange",()=>document.visibilityState==="visible"?resume():release());
            window.addEventListener("pageshow",resume);
            window.addEventListener("pagehide",release);
            window.addEventListener("focus",resume);
            document.addEventListener("pointerdown",resume,{capture:true,passive:true});
            // A periodic guard is essential during autonomous quests: there
            // may be no user interaction to recover a browser-revoked lock.
            setInterval(()=>{if(!suspended&&document.visibilityState==="visible"&&(!sentinel||sentinel.released))request();},15000);
            queueMicrotask(resume);
        }else status("desktop");
        return{request:resume,release,supported:enabled&&"wakeLock" in navigator,active:()=>!!sentinel&&!sentinel.released};
    })();
    if(mobilePortraitAtBoot){
        document.documentElement.dataset.rpgMobileLayout="portrait";
        const mobileScreenWidth=624,mobileScreenHeight=Math.max(816,Math.min(1400,Math.round(mobileScreenWidth*innerHeight/Math.max(1,innerWidth))));
        document.documentElement.style.setProperty("--rpg-mobile-aspect",String(mobileScreenWidth/mobileScreenHeight));
        const resizeMobileScreen=Scene_Boot.prototype.resizeScreen;
        Scene_Boot.prototype.resizeScreen=function(){
            const advanced=$dataSystem.advanced,original={screenWidth:advanced.screenWidth,screenHeight:advanced.screenHeight,uiAreaWidth:advanced.uiAreaWidth,uiAreaHeight:advanced.uiAreaHeight};
            Object.assign(advanced,{screenWidth:mobileScreenWidth,screenHeight:mobileScreenHeight,uiAreaWidth:mobileScreenWidth,uiAreaHeight:mobileScreenHeight});
            try{resizeMobileScreen.call(this);}finally{Object.assign(advanced,original);}
        };
    }

    // Global RPG Manager mix: retain the player's SE setting, then attenuate all SFX by 50%.
    const updateSeParameters = AudioManager.updateSeParameters;
    AudioManager.updateSeParameters = function(buffer, se) {
        updateSeParameters.call(this, buffer, { ...se, volume: (Number(se?.volume) || 0) * 0.5 });
    };

    const progression = window.RPGManagerProgression;
    if (!progression) throw new Error("Enable RPGManagerProgression above RPGManager in Plugin Manager.");
    // Optional presentation art stays outside MZ's fatal database-image cache.
    const managerArtCache=new Map();
    const managerImageFile=name=>/\.(?:png|webp)$/i.test(name||"")?name:`${name||"missing"}.webp`;
    function managerArt(folder,name){
        const key=`${folder}/${String(name||"missing")}`;
        const file=managerImageFile(name);
        if(!managerArtCache.has(key))managerArtCache.set(key,Bitmap.load(`img/${folder}/${encodeURIComponent(file)}`));
        return managerArtCache.get(key);
    }
    const classEmblemIndex=Object.freeze({barbarian:0,knight:1,ranger:2,rogue:3,mage:4,cleric:5,bard:6,druid:7});
    const fantasyMenuIconSheet=Bitmap.load("img/pictures/ui/FantasyMenuIcons16Bit_v1.png");
    const fantasyMenuIconIndex=Object.freeze({campaign:0,roster:0,camp:0,recruit:1,bathhouse:1,altar:2,grave:3,graveyard:3,save:4,quest:5,battle:5,work:6,campJobs:6,coin:7,arcana:8,artifact:9,recall:10,help:11});
    function classEmblemElement(classId,size=32){
        const safe=Object.prototype.hasOwnProperty.call(classEmblemIndex,classId)?classId:"barbarian",el=document.createElement("span");
        const nativeSize=size<=24?24:size<=32?32:48;
        el.className="rpg-class-emblem";el.setAttribute("aria-hidden","true");
        // Background canvases avoid Chromium's occasional transparent-image
        // clip-path fragments. The source is already exported at its display
        // resolution, so it stays centered at 1:1 with no stretch or atlas bleed.
        el.style.cssText=`display:inline-block;flex:0 0 ${nativeSize}px;width:${nativeSize}px;height:${nativeSize}px;overflow:hidden;background:url('img/pictures/ui/classes/${safe}_v5_${nativeSize}.png?crop=7') center/auto auto no-repeat;image-rendering:pixelated;vertical-align:middle`;
        return el;
    }
    function fantasyMenuIconElement(kind,size=28){
        const el=document.createElement("img"),index=fantasyMenuIconIndex[kind]??5,nativeSize=size<=32?32:size<=40?40:48;
        el.alt="";el.setAttribute("aria-hidden","true");el.src=`img/pictures/ui/menu/menu_${index}_${nativeSize}.png`;
        el.width=nativeSize;el.height=nativeSize;el.draggable=false;
        el.style.cssText=`display:inline-block;flex:0 0 ${nativeSize}px;width:${nativeSize}px;height:${nativeSize}px;object-fit:none;image-rendering:pixelated`;return el;
    }
    const questBoonIconIndex=Object.freeze({reinforced_clothing:0,protective_charms:1,medical_supplies:2,sharpening_kit:3,emergency_supplies:4});
    function questBoonIconElement(id,size=46){const el=document.createElement("span"),index=questBoonIconIndex[id]??0;el.setAttribute("aria-hidden","true");el.style.cssText=`display:block;width:${size}px;height:${size}px;margin:0 auto 3px;background-image:url('img/pictures/ui/QuestBoonIcons16Bit_v1.png');background-repeat:no-repeat;background-size:${size*5}px ${size}px;background-position:-${index*size}px 0;image-rendering:pixelated`;return el;}
    const MIN_TEAM_SIZE = progression.MIN_PARTY_SIZE || 1;
    const MAX_TEAM_SIZE = progression.MAX_PARTY_SIZE || 5;
    // The single presentation-speed knob. Simulation time/results never use it.
    const BATTLE_PRESENTATION_SPEED = 1.5;
    const BATTLE_TIMING = Object.freeze({
        basic: 600 / BATTLE_PRESENTATION_SPEED,
        signature: 900 / BATTLE_PRESENTATION_SPEED,
        impact: 0.55,
        caption: 1450 / BATTLE_PRESENTATION_SPEED,
        importantCaption: 2100 / BATTLE_PRESENTATION_SPEED
    });
    let battleAiDebug = false;
    const RANGED_WORDS = /ranger|archer|marksman|shot|arrow|volley|bow|spear/i;
    const MAGIC_WORDS = /mage|mystic|support|hexer|necromancer|magic|arcane|bolt|spark|pulse|storm|moon|acid|wake the restless|wand/i;

    // Cozy fantasy visual system. All helpers draw transient pixels, never campaign state.
    // Oak / moss / parchment surfaces; honey focus; blue actor, gold target, violet Ward.
    // Body: Trebuchet + MZ fallback. Titles: Georgia. Minimum primary text: 13px.
    const CozyUI = {
        colors: Object.freeze({ ink: "#f4e8cf", muted: "#c6b99d", honey: "#e8c583", moss: "#8dbb97", wood: "#1b2b55", panel: "#243969", edge: "#c6ae65", blue: "#95cef0", violet: "#c5ade4" }),
        round(b, x, y, w, h, fill, stroke = null, radius = 7) {
            if (w <= 0 || h <= 0) return;
            const c = b.context, r = Math.min(radius, w / 2, h / 2);
            c.save(); c.beginPath(); c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
            c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h); c.lineTo(x+r,y+h);
            c.quadraticCurveTo(x,y+h,x,y+h-r); c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath();
            if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();} c.restore();b.baseTexture.update();
        },
        ellipse(b,x,y,rx,ry,color) {
            const c=b.context;c.save();c.translate(x,y);c.scale(rx,ry);c.beginPath();c.arc(0,0,1,0,Math.PI*2);c.fillStyle=color;c.fill();c.restore();b.baseTexture.update();
        },
        ledgerSurface(b,accent="#c6ae65") {
            const w=b.width,h=b.height;if(w<8||h<8)return;
            b.gradientFillRect(0,0,w,h,"#304779","#18284d",true);
            // Restrained leather/fiber grain: visible up close, quiet behind text.
            for(let y=7;y<h;y+=13)b.fillRect(3,y,w-6,1,y%26===7?"#ffffff08":"#07132b13");
            for(let x=11;x<w;x+=31)for(let y=5+(x%17);y<h;y+=37)CozyUI.ellipse(b,x,y,1.2,.7,"#dbe8ff12");
            CozyUI.round(b,2,2,w-4,h-4,null,"#ffffff22",7);CozyUI.round(b,5,5,w-10,h-10,null,accent,6);
            const cap=(x,y,sx,sy)=>{const c=b.context;c.save();c.translate(x,y);c.scale(sx,sy);c.fillStyle="#c89b43";c.strokeStyle="#ffe3a0";c.lineWidth=1;c.beginPath();c.moveTo(0,0);c.lineTo(15,0);c.lineTo(8,3);c.lineTo(3,10);c.lineTo(0,15);c.closePath();c.fill();c.stroke();c.restore();};
            cap(5,5,1,1);cap(w-5,5,-1,1);cap(5,h-5,1,-1);cap(w-5,h-5,-1,-1);
            for(const [x,y] of [[11,11],[w-11,11],[11,h-11],[w-11,h-11]]){CozyUI.ellipse(b,x,y,2.2,2.2,"#f2ce77");CozyUI.ellipse(b,x-.6,y-.7,.7,.7,"#fff2b5");}
        },
        filigree(b,x,y,w,color="#c6ae65") {
            if(w<40)return;const c=b.context;c.save();c.strokeStyle=color;c.lineWidth=1;c.globalAlpha=.75;c.beginPath();c.moveTo(x,y);c.lineTo(x+w*.38,y);c.quadraticCurveTo(x+w*.43,y,x+w*.46,y-4);c.quadraticCurveTo(x+w*.5,y-9,x+w*.54,y-4);c.quadraticCurveTo(x+w*.57,y,x+w*.62,y);c.lineTo(x+w,y);c.stroke();c.restore();b.baseTexture.update();
        },
        icon(b, kind, x, y, size=18, color="#e8c583") {
            const atlasIndex=fantasyMenuIconIndex[kind];
            if(atlasIndex!==undefined&&fantasyMenuIconSheet.isReady()){
                b.blt(fantasyMenuIconSheet,(atlasIndex%4)*64,Math.floor(atlasIndex/4)*64,64,64,x,y,size,size);return;
            }
            const c=b.context;c.save();c.translate(x,y);c.scale(size/24,size/24);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.8;c.lineCap="round";c.lineJoin="round";
            const path=points=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();};
            if(kind==="potion"){path([[9,2],[15,2],[15,8],[20,15],[19,21],[5,21],[4,15],[9,8],[9,2]]);path([[7,15],[17,15]]);}
            else if(kind==="coin"){c.beginPath();c.arc(12,12,8,0,Math.PI*2);c.stroke();path([[12,7],[12,17]]);path([[9,8],[15,8],[9,16],[15,16]]);}
            else if(kind==="arcana"||kind==="altar"){path([[12,2],[20,12],[12,22],[4,12],[12,2]]);path([[12,7],[12,17]]);}
            else if(kind==="battle"||kind==="quest"){path([[5,3],[18,3],[18,20],[5,20],[5,3]]);path([[9,8],[15,8]]);path([[9,12],[15,12]]);path([[9,16],[13,16]]);}
            else if(kind==="work"||kind==="shop"){path([[5,20],[15,10],[12,7],[18,3],[21,6],[17,10]]);path([[4,18],[7,21]]);}
            else if(kind==="recruit"||kind==="bathhouse"){path([[4,8],[17,8],[17,20],[4,20],[4,8]]);path([[17,10],[21,10],[21,16],[17,16]]);path([[8,3],[8,5]]);path([[13,2],[13,5]]);}
            else if(kind==="roster"||kind==="campJobs"){path([[3,11],[12,3],[21,11]]);path([[5,10],[5,21],[19,21],[19,10]]);path([[10,21],[10,14],[14,14],[14,21]]);}
            else if(kind==="save"){path([[4,3],[18,3],[21,6],[21,21],[4,21],[4,3]]);path([[8,3],[8,10],[16,10],[16,3]]);path([[8,21],[8,15],[17,15],[17,21]]);}
            else if(kind==="graveyard"){path([[7,21],[7,7],[9,4],[15,4],[17,7],[17,21]]);path([[4,21],[20,21]]);path([[12,8],[12,15]]);path([[9,11],[15,11]]);}
            else if(kind==="title"||kind==="back"){path([[10,5],[3,12],[10,19]]);path([[3,12],[21,12]]);}
            else if(kind==="presentationSpeed"){path([[7,4],[19,12],[7,20],[7,4]]);}
            else if(kind==="completionAlert"){path([[5,17],[7,14],[7,8],[9,5],[15,5],[17,8],[17,14],[19,17],[5,17]]);path([[10,20],[14,20]]);}
            else if(kind==="hp"){c.beginPath();c.moveTo(12,21);c.bezierCurveTo(9,17,3,14,3,8);c.bezierCurveTo(3,3,10,2,12,7);c.bezierCurveTo(14,2,21,3,21,8);c.bezierCurveTo(21,14,15,17,12,21);c.fill();}
            else if(kind==="armor"){path([[12,2],[20,5],[19,14],[12,22],[5,14],[4,5],[12,2]]);path([[8,9],[12,13],[17,7]]);}
            else if(kind==="ward"){path([[12,2],[20,12],[12,22],[4,12],[12,2]]);path([[8,12],[12,7],[16,12],[12,17],[8,12]]);}
            else if(kind==="wound"){path([[7,3],[17,21]]);path([[17,3],[7,21]]);c.beginPath();c.arc(12,12,9,0,Math.PI*2);c.stroke();}
            else if(kind==="difficulty"){for(let i=0;i<5;i++){const px=4+i*4;c.beginPath();c.moveTo(px,18);c.lineTo(px+2,7-(i%2)*2);c.lineTo(px+4,18);c.closePath();c.stroke();}}
            else if(kind==="debug"){path([[5,7],[19,7],[19,18],[5,18],[5,7]]);path([[8,11],[11,13],[8,15]]);path([[14,15],[16,15]]);}
            else {path([[12,3],[12,21]]);path([[12,14],[5,8],[5,4],[12,9],[19,4],[19,8],[12,14]]);}
            c.restore();b.baseTexture.update();
        },
        actionButton(win,rect,label,danger=false){
            let hover=false,pressed=false;
            if(typeof TouchInput!=="undefined"&&win.worldTransform){const p=win.worldTransform.applyInverse(new Point(TouchInput.x,TouchInput.y));hover=rect.contains(p.x-win.padding,p.y-win.padding);pressed=hover&&TouchInput.isPressed();}
            this.round(win.contents,rect.x,rect.y,rect.width,rect.height,danger?(pressed?"#594333":hover?"#89604a":"#70483a"):(pressed?"#c4a265":hover?"#f3dba6":"#e8c583"),hover?"#fff5d9":danger?"#ffcf99":"#fff0c7",5);
            if(hover)win.contents.strokeRect(rect.x+3,rect.y+3,rect.width-6,rect.height-6,"#fff0c7");
            this.text(win,`${danger?"! ":hover?"> ":""}${label}`,rect.x+7,rect.y+5,rect.width-14,18,danger?"#f4e8cf":"#302b22","center",26);
        },
        itemIcon(win,id,x,y,size=22){
            const item=progression.SHOP[id],atlas=managerArt("system","IconSet");
            if(item?.iconIndex!==undefined&&atlas.isReady()){
                const n=item.iconIndex;win.contents.blt(atlas,n%16*32,Math.floor(n/16)*32,32,32,x,y,size,size);
            }else this.icon(win.contents,"potion",x,y,size);
        },
        text(win, text, x, y, w, size=14, color="#f4e8cf", align="left", height=22) {
            win.contents.fontSize=size;win.changeTextColor(color);win.contents.drawText(String(text),x,y,w,height,align);
        },
        // A measured two-line block, with explicit overflow indication rather than squashed text.
        wrap(win,text,x,y,w,size=14,color="#f4e8cf",maxLines=2,lineHeight=19) {
            win.contents.fontSize=size;let line="",lines=[];
            for(const word of String(text).split(/\s+/)){const next=line?`${line} ${word}`:word;if(line&&win.textWidth(next)>w){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
            lines.slice(0,maxLines).forEach((line,i)=>{if(i===maxLines-1&&lines.length>maxLines){while(line&&win.textWidth(line+"...")>w)line=line.slice(0,-1);line+="...";}CozyUI.text(win,line,x,y+i*lineHeight,w,size,color,"left",lineHeight);});
        },
        portraitFrame(win,npc,x,y,size) {
            CozyUI.round(win.contents,x-3,y-3,size+6,size+6,"#4b4938","#b39b6c",9);
            if(npc?.portrait)portrait(win,npc,x,y,size);
            else CozyUI.icon(win.contents,"roster",x+size/4,y+size/4,size/2,"#c6b99d");
        },
        battleScenery(b,x,y,w,h,boss){
            CozyUI.round(b,x,y,w,h,boss?"#403947":"#414d37",null,6);
            if(cozyCampArt.isReady()){b.paintOpacity=65;b.blt(cozyCampArt,cozyCampArt.width*.2,cozyCampArt.height*.35,cozyCampArt.width*.6,cozyCampArt.height*.4,x,y,w,h);b.paintOpacity=255;}
            for(let row=y+7;row<y+h;row+=17)b.fillRect(x+1,row,w-2,1,"#c0b78916");
        },
        motionScale(){const mode=globalThis.$gameSystem?._rpgManager?.presentationSpeed;return mode==="skip"?0:(mode==="reduced"||globalThis.document?.hasFocus?.()===false)?0.5:1;},
        jobCue(b,job,x,y,frame){
            const cycle=Math.sin(frame/18),ctx=b.context;
            if(job==="study"){
                CozyUI.round(b,x+26,y+16,19,15,"#e5d4ac","#68573e",2);
                b.fillRect(x+35,y+17,1,13,"#9a845c");
                b.fillRect(x+28,y+20,5,1,"#a38d65");b.fillRect(x+38,y+20+(cycle>0?0:3),5,1,"#a38d65");
            }else if(job==="work"){
                b.fillRect(x+26,y+28,24,4,"#977348");b.fillRect(x+29,y+32,3,7,"#68543d");
                ctx.save();ctx.translate(x+36,y+21);ctx.rotate(-.35+cycle*.3);ctx.fillStyle="#b99567";ctx.fillRect(-1,-13,3,15);ctx.fillStyle="#b7b9aa";ctx.fillRect(-6,-15,13,5);ctx.restore();b.baseTexture.update();
            }else if(job==="rest"){
                CozyUI.ellipse(b,x+34,y+30,11,5,"#b8c7ad");
                b.fontSize=10;b.textColor="#e5e5ca";b.drawText(cycle>0?"z":"zz",x+27,y+8,22,12);
            }
        },
        scenery(b) {
            const w=b.width,h=b.height;b.gradientFillRect(0,0,w,h,"#253c32","#4b3d30",true);
            // Small botanical details stay along the edge rather than competing with panels.
            for(let i=0;i<12;i++){const y=44+i*61;CozyUI.ellipse(b,8,y,17,6,"#486045");CozyUI.ellipse(b,w-8,y+22,17,6,"#486045");b.fillRect(7,y+10,2,22,"#718363");}
            b.fillRect(0,0,w,3,"#c8a56d");b.fillRect(0,h-3,w,3,"#796249");
        },
        campFallback(b) {
            const w=b.width,h=b.height;b.gradientFillRect(0,0,w,h,"#637b51","#8b9965",true);
            for(let i=0;i<22;i++){const x=(i*83)%w,y=(i*47)%h;CozyUI.ellipse(b,x,y,34,22,"#71885a");}
            CozyUI.ellipse(b,w*.48,h*.62,w*.29,h*.20,"#b1a580");
            const cottage=(x,y,width,height,roof)=>{CozyUI.round(b,x+2,y+height-6,width,12,"#40553566");CozyUI.round(b,x,y,width,height,"#bfa87a","#66553c",3);const c=b.context;c.save();c.fillStyle=roof;c.beginPath();c.moveTo(x-9,y+5);c.lineTo(x+width/2,y-26);c.lineTo(x+width+9,y+5);c.closePath();c.fill();c.restore();b.baseTexture.update();b.fillRect(x+width*.43,y+height*.40,18,height*.6,"#6c5940");b.fillRect(x+10,y+15,18,18,"#f4d698");b.fillRect(x+width-28,y+15,18,18,"#f4d698");};
            cottage(22,56,w*.23,64,"#927058");cottage(w*.72,54,w*.22,60,"#697b69");
            CozyUI.round(b,w*.72,h*.73,w*.22,15,"#785c40","#c6a677",2);b.fillRect(w*.75,h*.73+15,7,21,"#675339");b.fillRect(w*.90,h*.73+15,7,21,"#675339");
            for(let i=0;i<12;i++){const a=i*Math.PI/6;CozyUI.ellipse(b,w*.5+Math.cos(a)*23,h*.56+Math.sin(a)*13,5,4,"#c5bca2");}
            CozyUI.ellipse(b,w*.5,h*.56,13,8,"#ce8849");b.drawCircle(w*.5,h*.56-6,8,"#ffdc8d");
        }
    };

    // Optional art bypasses ImageManager's required-asset cache: failure keeps procedural scenery.
    const cozyCampArt = Bitmap.load("img/pictures/CozyGuildCamp.webp");
    const titleKeyArt = Bitmap.load("img/pictures/PomodoroTitleFieldCamp_v1.png");
    const titleLogoArt = Bitmap.load("img/pictures/PomodoroRPGTitleLogo_v1.png");
    const rewardEmblemArt = Bitmap.load("img/pictures/QuestRewardEmblem.png");
    let cozyWindowskin = null;
    function managerVisualWindow(win) {
        return /^Window_RPG/.test(win.constructor.name) || win.constructor.name==="Window_TitleCommand" || win.constructor.name==="Window_Options" || !!(typeof Scene_File!=="undefined" && SceneManager._scene instanceof Scene_File);
    }
    function managerSceneAccent(){
        const name=SceneManager._scene?.constructor?.name||"";
        if(/Tavern|StartingRoster/.test(name))return "#d99755";
        if(/Altar/.test(name))return "#b99be7";
        if(/Grave|Roster/.test(name)&&SceneManager._scene?._graveyard)return "#aebbd0";
        if(/Save|Load|File/.test(name))return "#73bfe8";
        if(/Quest|Battle|Travel|Expedition|Recall/.test(name))return "#91c795";
        return "#c6ae65";
    }
    function cozySkin() {
        if(cozyWindowskin)return cozyWindowskin;
        cozyWindowskin=new Bitmap(192,192);
        const stock=ImageManager.loadSystem("Window");
        const paint=()=>{const b=cozyWindowskin;if(stock.isReady())b.blt(stock,0,0,192,192,0,0);b.clearRect(0,0,96,192);b.gradientFillRect(0,0,96,96,"#425f9b","#142441",true);for(let y=5;y<96;y+=11)b.fillRect(0,y,96,1,"#ffffff0b");b.fillRect(0,0,96,2,"#7494c855");b.fillRect(0,92,96,4,"#0d193399");
            b.clearRect(96,0,96,96);CozyUI.round(b,96,0,96,96,"#1b315d","#795b25",11);CozyUI.round(b,97.5,1.5,93,93,null,"#f5d77f",10);CozyUI.round(b,101,5,86,86,null,"#fff0b455",8);CozyUI.round(b,104,8,80,80,null,"#41659e",6);b.fillRect(104,9,80,2,"#8eb3e866");b.fillRect(104,85,80,3,"#0d1c3f88");
            for(const [x,y,sx,sy] of [[99,3,1,1],[188,3,-1,1],[99,92,1,-1],[188,92,-1,-1]]){b.fillRect(sx<0?x-7:x,sy<0?y-1:y,7,2,"#ffe39a");b.fillRect(sx<0?x-1:x,sy<0?y-7:y,2,7,"#ffe39a");b.fillRect(sx<0?x-5:x+2,sy<0?y-5:y+2,3,3,"#c58c2d");}
            b.clearRect(96,96,48,48);b.gradientFillRect(96,96,48,48,"#7193ce88","#172c58dd",true);CozyUI.round(b,96.5,96.5,47,47,null,"#f6d77d",6);CozyUI.round(b,99,99,42,42,null,"#ffffff55",4);b.fillRect(103,102,34,2,"#dbe8ff66");
        };paint();stock.addLoadListener(paint);return cozyWindowskin;
    }
    const loadManagerWindowskin=Window_Base.prototype.loadWindowskin;
    Window_Base.prototype.loadWindowskin=function(){
        if(managerVisualWindow(this)){this._cozyVisual=true;this.windowskin=cozySkin();}
        else loadManagerWindowskin.call(this);
    };
    const managerResetFont=Window_Base.prototype.resetFontSettings;
    Window_Base.prototype.resetFontSettings=function(){managerResetFont.call(this);if(this._cozyVisual){this.contents.fontFace=`Trebuchet MS, ${$gameSystem.mainFontFace()}`;this.contents.outlineWidth=2;this.contents.outlineColor="#29291fe6";this.contents.textColor=CozyUI.colors.ink;}};
    const managerTone=Window_Base.prototype.updateTone;
    Window_Base.prototype.updateTone=function(){if(this._cozyVisual)this.setTone(0,0,0);else managerTone.call(this);};
    const managerResetColor=Window_Base.prototype.resetTextColor;
    Window_Base.prototype.resetTextColor=function(){managerResetColor.call(this);if(this._cozyVisual)this.changeTextColor(CozyUI.colors.ink);};
    const managerItemBackground=Window_Selectable.prototype.drawItemBackground;
    Window_Selectable.prototype.drawItemBackground=function(index){
        if(!this._cozyVisual){managerItemBackground.call(this,index);return;}
        const r=this.itemRect(index),selected=index===this.index(),hover=selected&&this.active;
        this.contentsBack.gradientFillRect(r.x+3,r.y+3,r.width-6,r.height-7,hover?"#6989c5":"#46649d",hover?"#28447d":"#203762",true);
        CozyUI.round(this.contentsBack,r.x+2,r.y+2,r.width-4,r.height-5,null,hover?"#ffe09a":"#b69a5c",6);
        CozyUI.round(this.contentsBack,r.x+5,r.y+5,r.width-10,r.height-11,null,hover?"#fff3c266":"#a8c7f044",4);
        this.contentsBack.fillRect(r.x+8,r.y+6,r.width-16,2,hover?"#fff7d099":"#d6e7ff42");
        if(hover)this.contentsBack.fillRect(r.x+4,r.y+6,3,r.height-13,managerSceneAccent());
    };
    // MZ's transient hover flag can be missed when the pointer crosses DOM overlays
    // or a scaled canvas. Manager lists continuously resolve actual pointer movement.
    const managerSelectableUpdate=Window_Selectable.prototype.update;
    Window_Selectable.prototype.update=function(){
        if(this._cozyVisual&&this.active&&this.visible&&this.openness>0){
            const x=TouchInput.x,y=TouchInput.y;
            if(this._managerHoverX!==x||this._managerHoverY!==y){
                this._managerHoverX=x;this._managerHoverY=y;
                const index=this.hitIndex();
                if(index>=0&&index<this.maxItems()&&index!==this.index())this.select(index);
            }
        }
        // Select the real pointer target before MZ consumes this frame's click.
        managerSelectableUpdate.call(this);
    };

    const cozyTitleBackground=Scene_Title.prototype.createBackground;
    Scene_Title.prototype.createBackground=function(){
        cozyTitleBackground.call(this);this._cozyTitleScenery=new Sprite(new Bitmap(Graphics.width,Graphics.height));this.addChild(this._cozyTitleScenery);this.paintCozyTitleScenery();
    };
    Scene_Title.prototype.paintCozyTitleScenery=function(){
        const b=this._cozyTitleScenery.bitmap;b.smooth=false;CozyUI.scenery(b);this._cozyTitleArtReady=titleKeyArt.isReady();
        if(this._cozyTitleArtReady){const scale=Math.max(b.width/titleKeyArt.width,b.height/titleKeyArt.height),sw=b.width/scale,sh=b.height/scale;b.blt(titleKeyArt,(titleKeyArt.width-sw)/2,(titleKeyArt.height-sh)/2,sw,sh,0,0,b.width,b.height);}
        b.gradientFillRect(0,b.height-220,b.width,220,"#18333300","#10241fa8",true);
    };
    Scene_Title.prototype.drawGameTitle=function(){
        this._gameTitleSprite.bitmap.clear();
    };
    const cozyTitleForeground=Scene_Title.prototype.createForeground;
    Scene_Title.prototype.createForeground=function(){
        cozyTitleForeground.call(this);
        this._pomodoroTitleLogo=new Sprite(titleLogoArt);this._pomodoroTitleLogo.anchor.set(.5,0);this._pomodoroTitleLogo.x=Graphics.width/2;this._pomodoroTitleLogo.y=18;this.addChild(this._pomodoroTitleLogo);
        const layout=()=>{if(!this._pomodoroTitleLogo?.parent||!titleLogoArt.width)return;const scale=Math.min(1,Math.min(Graphics.width*.72/titleLogoArt.width,285/titleLogoArt.height));this._pomodoroTitleLogo.scale.set(scale);};
        layout();titleLogoArt.addLoadListener(layout);
    };
    Scene_Title.prototype.playTitleMusic=function(){AudioManager.stopBgm();AudioManager.stopBgs();AudioManager.stopMe();};
    const cozyTitleUpdate=Scene_Title.prototype.update;
    Scene_Title.prototype.update=function(){cozyTitleUpdate.call(this);if(!this._cozyTitleArtReady&&titleKeyArt.isReady())this.paintCozyTitleScenery();};
    const saveCampStart=Scene_Save.prototype.start;Scene_Save.prototype.start=function(){saveCampStart.call(this);mountCampNavigation(this);};
    const saveCampTerminate=Scene_Save.prototype.terminate;Scene_Save.prototype.terminate=function(){this._finishButton?.remove();this._returnVignette?.remove();this._campStatus?.remove();this._campNav?.remove();saveCampTerminate.call(this);};
    const pagedSaveStart=Scene_Save.prototype.start,pagedLoadStart=Scene_Load.prototype.start;
    function mountManagerFilePages(scene){const w=scene._listWindow;if(!w)return;w.move(w.x,112,w.width,Graphics.boxHeight-212);w.createContents();w.refresh();mountListArrows(scene,w);}
    Scene_Save.prototype.start=function(){pagedSaveStart.call(this);mountManagerFilePages(this);};
    Scene_Load.prototype.start=function(){pagedLoadStart.call(this);mountManagerFilePages(this);};
    const fileSaveEnd=Scene_Save.prototype.terminate,fileLoadEnd=Scene_Load.prototype.terminate;
    Scene_Save.prototype.terminate=function(){for(const el of this._listArrows||[])el.remove();fileSaveEnd.call(this);};
    Scene_Load.prototype.terminate=function(){for(const el of this._listArrows||[])el.remove();fileLoadEnd.call(this);};
    const cozyTitleTerminate=Scene_Title.prototype.terminate;
    Scene_Title.prototype.terminate=function(){cozyTitleTerminate.call(this);if(this._cozyTitleScenery)this._cozyTitleScenery.bitmap.destroy();};

    // These helpers inspect event/fighter data but never mutate either one.
    function battleActionMode(event, fighter = {}) {
        if (event?.type === "heal" || Number(event?.healing || event?.heal) > 0) return "heal";
        const description = `${fighter.role || ""} ${event?.attackName || ""}`;
        if (MAGIC_WORDS.test(description)) return "magic";
        if (RANGED_WORDS.test(description)) return "ranged";
        return "melee";
    }

    function battleFormationPosition(side, index, count, combatRole = "FRONTLINE", strategy = "Tactical") {
        const rows = {
            1: [194], 2: [158, 230], 3: [136, 195, 254],
            4: [128, 170, 212, 254], 5: [122, 155, 188, 221, 254]
        }[Math.max(1, Math.min(5, count))];
        const back = index % 2, direction = side === "player" ? 1 : -1;
        const roleDepth = { FRONTLINE: 26, BACKLINE: -24, SUPPORT: -34, FLANKER: 12 }[combatRole] || 0;
        const strategyDepth = strategy === "Aggressive" ? 24 + (combatRole === "FLANKER" ? 14 : 0) :
            strategy === "Defensive" ? ({ FRONTLINE: 18, BACKLINE: -18, SUPPORT: -24, FLANKER: 0 }[combatRole] || 0) :
            strategy === "Support" ? ({ FRONTLINE: 20, BACKLINE: -12, SUPPORT: -28, FLANKER: 0 }[combatRole] || 0) : 0;
        const baseX = side === "player" ? 176 + back * 82 : Graphics.boxWidth - 176 - back * 82;
        return { x: baseX + direction * (roleDepth + strategyDepth),
            y: rows[index] ?? rows[rows.length - 1] };
    }

    // Use MZ's loader/error handling, without requiring Test_ copies of our data.
    window.$dataRPGManagerRoster = null;
    window.$dataRPGManagerEnemyTeam = null;
    window.$dataRPGManagerDialogue = null;
    window.$dataRPGManagerClasses = null;
    window.$dataRPGManagerQuests = null;
    window.$dataRPGManagerManual = null;
    window.$dataRPGManagerManualImages = null;
    const managerDataSource = file => typeof assetVersion !== "undefined" ? `${file}?v=${encodeURIComponent(assetVersion)}` : file;
    function loadOptionalManagerData(name,file){const xhr=new XMLHttpRequest();xhr.open("GET",`data/${managerDataSource(file)}`);xhr.overrideMimeType("application/json");xhr.onload=()=>{try{window[name]=xhr.status<400?JSON.parse(xhr.responseText):{};}catch(error){window[name]={};}};xhr.onerror=()=>window[name]={};xhr.send();}
    window.$dataRPGManagerStage3 = null;window.$dataRPGManagerIdentity=null;window.$dataRPGManagerNarratives=null;
    window.$dataRPGManagerPresentation = null;
    window.$dataRPGManagerUI = null;
    const loadDatabase = DataManager.loadDatabase;
    DataManager.loadDatabase = function() {
        loadDatabase.call(this);
        this.loadDataFile("$dataRPGManagerRoster", managerDataSource("RPGManagerRoster.json"));
        this.loadDataFile("$dataRPGManagerEnemyTeam", managerDataSource("RPGManagerEnemyTeam.json"));
        this.loadDataFile("$dataRPGManagerDialogue", managerDataSource("RPGManagerDialogue.json"));
        this.loadDataFile("$dataRPGManagerClasses", managerDataSource("RPGManagerClasses.json"));
        this.loadDataFile("$dataRPGManagerQuests", managerDataSource("RPGManagerQuests.json"));
        this.loadDataFile("$dataRPGManagerStage3", managerDataSource("RPGManagerStage3.json"));this.loadDataFile("$dataRPGManagerIdentity",managerDataSource("RPGManagerIdentity.json"));loadOptionalManagerData("$dataRPGManagerNarratives","RPGManagerNarratives.json");
        this.loadDataFile("$dataRPGManagerPresentation", managerDataSource("RPGManagerPresentation.json"));
        this.loadDataFile("$dataRPGManagerUI", managerDataSource("RPGManagerUI.json"));
        this.loadDataFile("$dataRPGManagerManual", managerDataSource("RPGManagerManual.json"));
        this.loadDataFile("$dataRPGManagerManualImages", managerDataSource("RPGManagerManualImages.json"));
    };
    const isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        return isDatabaseLoaded.call(this) && !!window.$dataRPGManagerRoster && !!window.$dataRPGManagerEnemyTeam && !!window.$dataRPGManagerDialogue && !!window.$dataRPGManagerClasses && !!window.$dataRPGManagerQuests && !!window.$dataRPGManagerStage3 && !!window.$dataRPGManagerPresentation && !!window.$dataRPGManagerUI&&!!window.$dataRPGManagerIdentity&&!!window.$dataRPGManagerNarratives&&!!window.$dataRPGManagerManual&&!!window.$dataRPGManagerManualImages;
    };
    const onDatabaseLoaded = Scene_Boot.prototype.onDatabaseLoaded;
    Scene_Boot.prototype.onDatabaseLoaded = function() {
        onDatabaseLoaded.call(this);
        $dataRPGManagerQuests.quests = $dataRPGManagerStage3.quests;
        $dataRPGManagerQuests.automaticEvents = $dataRPGManagerStage3.automaticEvents;
        $dataRPGManagerQuests.presentation = $dataRPGManagerPresentation;
        progression.configure($dataRPGManagerClasses, $dataRPGManagerDialogue,$dataRPGManagerIdentity,$dataRPGManagerNarratives);
        $dataRPGManagerQuests.narratives=$dataRPGManagerNarratives;
        validateQuestData($dataRPGManagerQuests);
        for(const name of Object.values(window.RPGManagerBattleStage?.ART||{}))managerArt("pictures",name);
        for (const npc of [...$dataRPGManagerRoster, ...$dataRPGManagerEnemyTeam, ...$dataRPGManagerQuests.enemies]) {
            if (npc.portrait) managerArt("faces",npc.portrait.sheet);
        }
    };

    function validateRoster(roster, count = 10, filename = "RPGManagerRoster.json") {
        const fail = message => {
            throw new Error(`${filename}: ${message}`);
        };
        if (!Array.isArray(roster) || roster.length !== count) {
            fail(`Expected exactly ${count} NPC entries.`);
        }
        const ids = new Set();
        for (const npc of roster) {
            if (!npc || typeof npc !== "object") fail("Invalid NPC entry.");
            for (const key of ["id", "name", "role", "basicAttack", "signatureAttack"]) {
                if (typeof npc[key] !== "string" || !npc[key].trim()) {
                    fail(`Each NPC needs a nonempty ${key}.`);
                }
            }
            if (ids.has(npc.id)) fail(`Duplicate id: ${npc.id}.`);
            ids.add(npc.id);
            for (const key of ["level", "health", "maxHealth", "attack", "defense", "speed"]) {
                if (!Number.isFinite(npc[key]) || npc[key] < 0) {
                    fail(`${npc.name}: ${key} must be a nonnegative number.`);
                }
            }
            if (!Number.isInteger(npc.level) || npc.level < 1 || npc.maxHealth < 1 || npc.health > npc.maxHealth) {
                fail(`${npc.name}: invalid level or health range.`);
            }
            if (typeof npc.alive !== "boolean") fail(`${npc.name}: alive must be true or false.`);
            for (const key of ["name", "description"]) {
                if (typeof npc.passiveTrait?.[key] !== "string" || !npc.passiveTrait[key].trim()) {
                    fail(`${npc.name}: passiveTrait needs a ${key}.`);
                }
            }
        }
    }

    function validateQuestData(data) {
        const fail = message => { throw new Error(`RPGManagerQuests.json: ${message}`); };
        if (!data || !Array.isArray(data.enemies) || !Array.isArray(data.quests) || data.quests.length < 3) fail("enemies and at least three quests are required.");
        validateRoster(data.enemies, data.enemies.length, "RPGManagerQuests.json enemies");
        const enemyIds = new Set(data.enemies.map(enemy => enemy.id)), questIds = new Set();
        const xp = data.xp;
        if (![xp?.basePerMember, xp?.openSlotBonus, xp?.totalCap].every(Number.isSafeInteger) || ![3,5].includes(xp.maxPartySize) || xp.basePerMember < 1 || xp.openSlotBonus < 0 || xp.totalCap < xp.basePerMember) fail("invalid XP rules.");
        for (const quest of data.quests) {
            if (!quest || typeof quest.id !== "string" || !/^[a-z][a-z0-9_]*$/.test(quest.id) || questIds.has(quest.id)) fail(`duplicate/invalid quest ID ${quest?.id}.`);
            questIds.add(quest.id);
            if(!Number.isInteger(quest.skulls)||quest.skulls<1||quest.skulls>8)fail(`${quest.id}: skull rating must be 1-8.`);
            for (const key of ["name", "risk", "faction", "danger", "journey"]) if (typeof quest[key] !== "string" || !quest[key].trim()) fail(`${quest.id}: ${key} is required.`);
            for (const key of ["knownThreats", "knownConditions", "rumors"]) if (!Array.isArray(quest[key]) || !quest[key].length || quest[key].some(line => typeof line !== "string" || !line.trim())) fail(`${quest.id}: ${key} needs player-readable entries.`);
            if (!Number.isSafeInteger(quest.travelSeconds) || quest.travelSeconds < 1) fail(`${quest.id}: travelSeconds must be positive.`);
            if (typeof quest.boss !== "boolean") fail(`${quest.id}: boss must be true/false.`);
            if (!Array.isArray(quest.enemyIds) || quest.enemyIds.length > 5 || new Set(quest.enemyIds).size !== quest.enemyIds.length || quest.enemyIds.some(id => !enemyIds.has(id)) || quest.combatMode === "required" && quest.enemyIds.length < 1) fail(`${quest.id}: enemyIds must contain up to 5 unique known enemies, and required combat needs at least one.`);
            if (!["victory", "draw", "defeat"].every(key => Number.isSafeInteger(quest.rewardGold?.[key]) && quest.rewardGold[key] >= 0)) fail(`${quest.id}: invalid gold rewards.`);
            if (quest.rewardArcana && !["victory", "draw", "defeat"].every(key => Number.isSafeInteger(quest.rewardArcana[key]) && quest.rewardArcana[key] >= 0)) fail(`${quest.id}: invalid Arcana rewards.`);
            if (quest.stages) for (const stage of quest.stages) {
                if (!stage?.id || !["travel", "event", "battle"].includes(stage.type)) fail(`${quest.id}: invalid expedition stage.`);
                if (stage.type === "travel" && (!Number.isSafeInteger(stage.durationSeconds) || stage.durationSeconds < 1)) fail(`${quest.id}.${stage.id}: invalid travel duration.`);
                if (stage.type === "event" && !data.events?.some(event => event.id === stage.eventId)) fail(`${quest.id}.${stage.id}: unknown event.`);
                if (stage.type === "battle" && (!Array.isArray(stage.enemyIds) || stage.enemyIds.some(id => !enemyIds.has(id)))) fail(`${quest.id}.${stage.id}: invalid encounter enemies.`);
            }
            if (quest.interruptionRules) {
                const rules = quest.interruptionRules;
                if (![rules.frequencyMin, rules.frequencyMax].every(Number.isSafeInteger) || rules.frequencyMin < 0 || rules.frequencyMax < rules.frequencyMin || !Number.isFinite(rules.jitterPercent) || rules.jitterPercent < 0 || rules.jitterPercent > 0.75) fail(`${quest.id}: invalid interruption rules.`);
            }
        }
        if (!data.quests.some(q => q.boss)) fail("at least one boss quest is required.");
        if (!data.quests.some(q => q.faction === "Undead" && q.enemyIds.some(id => /necromancer/.test(id)))) fail("an undead quest with a necromancer is required.");
        if (!data.quests.some(q => /Orcs/.test(q.faction) && q.enemyIds.some(id => /orc/.test(id)) && q.enemyIds.some(id => /goblin/.test(id)))) fail("an orc/goblin quest is required.");
    }

    // Runtime state belongs to the current game, never to the editable template.
    const initializeSystem = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        initializeSystem.call(this);
        validateRoster(window.$dataRPGManagerRoster);
        validateRoster(window.$dataRPGManagerEnemyTeam, 3, "RPGManagerEnemyTeam.json");
        validateQuestData(window.$dataRPGManagerQuests);
        this._rpgManager = progression.createState(window.$dataRPGManagerRoster);
        if (window.RPGManager) window.RPGManager.lastBattle = null;
    };

    const roster = () => progression.activeRoster($gameSystem._rpgManager);
    const findNpc = id => $gameSystem._rpgManager.roster.find(npc => npc.id === id);
    const isLiving = npc => progression.living(npc);
    const teamIds = () => $gameSystem._rpgManager.teamIds.slice();
    const managerState = () => $gameSystem._rpgManager;
    const quests = () => $dataRPGManagerQuests.quests;
    const findQuest = id => quests().find(quest => quest.id === id) || quests()[0];
    const findExpeditionEvent = id => ($dataRPGManagerQuests.events || []).find(event => event.id === id) || null;
    const selectedQuest = () => findQuest(managerState().selectedQuestId);
    const questEnemies = quest => quest.enemyIds.map(id => $dataRPGManagerQuests.enemies.find(enemy => enemy.id === id));
    const factionColor = quest => quest?.boss ? "#ff8b72" : quest?.faction === "Undead" ? "#c6a6ff" : /Orcs/.test(quest?.faction || "") ? "#9fe28f" : "#8edaff";
    const formatTime = ms => {
        const seconds = Math.max(0, Math.ceil(ms / 1000));
        return `${String(Math.floor(seconds / 60)).padStart(2,"0")}:${String(seconds % 60).padStart(2, "0")}`;
    };

    function validateTeam(ids) {
        if (!Array.isArray(ids) || ids.length < MIN_TEAM_SIZE || ids.length > MAX_TEAM_SIZE) {
            return "Select 1-5 living adventurers before confirming.";
        }
        if (new Set(ids).size !== ids.length) return "Each team member must be different.";
        if (ids.some(id => !isLiving(findNpc(id)))) return "Only living NPCs can join the team.";
        return "";
    }

    function toggleTeamMember(draft, id) {
        const index = draft.indexOf(id);
        if (index >= 0) {
            draft.splice(index, 1);
            return "";
        }
        if (!isLiving(findNpc(id))) return "This NPC is unavailable. Select a living NPC.";
        if (draft.length >= MAX_TEAM_SIZE) return "Team full. Remove a member before adding another.";
        draft.push(id);
        return "";
    }

    function confirmTeam(ids) {
        const state = managerState();
        const error = progression.tripForTeam(state, state.activeTeam) ? `Team ${state.activeTeam} is away and cannot be edited.` : validateTeam(ids);
        if (!error) {
            const other = state.activeTeam === "A" ? "B" : "A";
            if (ids.some(id => progression.isUnavailable(state, id))) return "A selected adventurer is away on a quest.";
            state.teamIds = ids.slice(); state.teams[state.activeTeam] = ids.slice();
            state.teams[other] = state.teams[other].filter(id => !ids.includes(id));
        }
        return error;
    }

    function createBattle(seed, strategy = "Tactical", quest = selectedQuest()) {
        const ids = teamIds();
        const error = validateTeam(ids);
        if (error) throw new Error(error);
        if (!window.RPGManagerBattle) throw new Error("Enable RPGManagerBattle above RPGManager in Plugin Manager.");
        const active=managerState().activeQuest;return new window.RPGManagerBattle.Battle(active?.preparedTeam||progression.prepareTeam(managerState(), ids), questEnemies(quest), { seed, strategy,ritualEffects:active?.ritualEffects||{} });
    }
    function createTripBattle(teamKey, seed) {
        const trip = progression.tripForTeam(managerState(), teamKey);
        if (!trip || !["ready", "battle"].includes(trip.phase)) throw new Error(`Team ${teamKey} has no battle ready.`);
        if (trip.phase === "ready" && !progression.startBattle(managerState(), teamKey)) throw new Error(`Team ${teamKey} could not start its battle.`);
        const quest = findQuest(trip.questId);
        const stage = progression.currentStage(trip);
        const resolvedSeed = seed ?? (Number(String(trip.id).replace(/\D/g, "")) * 7919 + quest.id.length * 101);
        const enemyIds = stage?.type === "battle" ? stage.enemyIds : quest.enemyIds;
        const enemies = progression.encounterEnemies({...stage,enemyIds},$dataRPGManagerQuests,trip);
        const activeTeam = trip.preparedTeam.filter(member => member.alive !== false && member.health > 0);
        const battle = new window.RPGManagerBattle.Battle(JSON.parse(JSON.stringify(activeTeam)), enemies, { seed: resolvedSeed, strategy: trip.strategy || "Tactical", signatureUses: {},ritualEffects:trip.ritualEffects||{} });
        battle._waves=(stage?.waves||[]).slice(1).map((ids,index)=>progression.encounterEnemies({...stage,enemyIds:ids,reinforcementWave:stage.reinforcementWaveIndex===index+1},$dataRPGManagerQuests,trip));
        return battle;
    }

    // Small data API for later approved days and console inspection.
    window.RPGManager = { roster, teamIds, quests, selectedQuest, questEnemies, validateQuestData, isLiving, validateTeam, toggleTeamMember, confirmTeam, createBattle, createTripBattle, restoreSave: restoreManagerSave, lastBattle: null, screenWakeLock: mobileScreenWakeLock,
        battlePresentation: Object.freeze({ speed: BATTLE_PRESENTATION_SPEED, timing: BATTLE_TIMING, actionMode: battleActionMode, formationPosition: battleFormationPosition }),
        setBattleAiDebug: enabled => (battleAiDebug = !!enabled && !!$dataRPGManagerUI?.developerMode), battleAiDebug: () => battleAiDebug,
        state: managerState,
        purchase: item => progression.purchase(managerState(), item),
        equip: (id, item, slot = 1) => progression.equip(managerState(), id, item, slot),
        editProfile: (id, fields) => progression.editProfile(managerState(), id, fields),
        chooseClass: (id, classId, moveId) => progression.chooseClass(managerState(), id, classId, moveId),
        useItem: (id, item) => progression.useItem(managerState(), id, item),
        useBathhouse: () => progression.useBathhouse(managerState()),
        rest: id => ({ok:false,message:"Camp restores 1 HP every 30 seconds automatically."}),
        recruit: id => progression.recruitCandidate(managerState(), id),
        dismiss: (id,confirmed=false) => progression.dismissAdventurer(managerState(), id,confirmed),
        skipTimer: (kind, team) => progression.skipTimer(managerState(), kind, team) };

    // A monotonic process-session clock keeps missions and jobs running while
    // minimized. State replacement/load starts a new baseline; closed time is excluded.
    // Presentation stays foreground-only so unseen events are preserved.
    let realtimeTickAt=null,clockState=null,runtimeClockAt=null;
    let completionChime=null,eventAudioQueue=[],eventAudioAt=0;
    function releaseCompletionChime(){
        const entry=completionChime;completionChime=null;
        if(entry)try{entry.buffer.destroy();}catch(error){/* Optional sound cannot stop the game. */}
    }
    function playCompletionChime(name="Chime1",volume=36,pitch=100,durationMs=0){
        releaseCompletionChime();
        // Keep this optional buffer out of MZ's mandatory SE error cache. A missing
        // or undecodable chime must not trigger a fatal AudioManager.checkErrors.
        const buffer=AudioManager.createBuffer("se/",name);
        completionChime={buffer,startedAt:performance.now()};
        AudioManager.updateSeParameters(buffer,{name,volume,pitch,pan:0});
        buffer.addStopListener(()=>{if(completionChime?.buffer===buffer)releaseCompletionChime();});
        buffer.play(false,0);
        if(durationMs>0){
            setTimeout(()=>{if(completionChime?.buffer===buffer)buffer.fadeOut?.(.12);},Math.max(0,durationMs-120));
            setTimeout(()=>{if(completionChime?.buffer===buffer)releaseCompletionChime();},durationMs);
        }
    }
    const focusDisplay=window.RPGManagerFocus;
    const floatingTimer=new focusDisplay.FloatingTimer(globalThis.nw);
    let focusHud=null,focusHudKey=null;
    function refreshFocusTimer(force=false){
        const state=globalThis.$gameSystem?._rpgManager,scene=SceneManager._scene;
        const visible=!!state&&scene instanceof Scene_RPGBase&&!(scene instanceof Scene_RPGStartingRoster);
        if(scene instanceof Scene_Save&&scene._cancelButton){scene._cancelButton.x=Math.max(0,Graphics.boxWidth-280-scene._cancelButton.width);scene._cancelButton.y=4;}
        const preview=state?selectedQuest():{};
        let view=focusDisplay.clockView(state||{},preview);
        if(!state?.trips?.A){const t=state?.campTimer;view={...view,sessionId:`camp:${t?.id||0}`,active:!!t?.active,remainingMs:t?.remainingMs||0,totalMs:t?.totalMs||0,digital:focusDisplay.formatTime(t?.remainingMs||0),fraction:t?.totalMs?(t.remainingMs/t.totalMs):0,phase:t?.active?"camp_active":"camp_ready",label:t?.active?"Camp timer":"Click to set timer"};}
        const key=JSON.stringify([visible,scene?.constructor.name,state?.focusTimer?.enabled,view.sessionId,view.digital,view.phase,view.totalMs,Graphics.width,Graphics.height,innerWidth,innerHeight]);
        if(!force&&focusHudKey===key)return;focusHudKey=key;
        floatingTimer.refresh(state,view,visible);
        if(!focusHud){
            focusHud=document.createElement("section");focusHud.id="rpg-focus-timer";focusHud.setAttribute("role","timer");focusHud.setAttribute("aria-label","Focus session timer");
            focusHud.innerHTML=focusDisplay.dialMarkup+'<div class="focus-readout"><strong class="focus-time"></strong><span class="focus-state"></span></div><button class="focus-recall" type="button">Recall</button><button class="focus-alerts" type="button" aria-label="Expedition alerts on" aria-pressed="true" title="Expedition alerts"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 17h12l-1.5-2.2V10a4.5 4.5 0 0 0-9 0v4.8L6 17Zm4 3h4"/></svg></button><button class="focus-options" type="button" aria-label="Timer options" aria-expanded="false">⋯</button><div class="focus-menu" hidden><button class="focus-float" type="button"></button><button class="focus-end" type="button">Recall…</button><small class="focus-note"></small></div>';
            const style=document.createElement('style');style.textContent='#rpg-focus-timer{position:fixed;z-index:30;width:358px;height:96px;display:grid;grid-template-columns:62px 105px 1fr;align-items:center;padding:4px 9px;background:linear-gradient(145deg,#1b2b57,#304d87 62%,#1d315f);color:#fff4d1;border:2px solid #f2d487;border-radius:18px;box-shadow:0 8px 24px #090d1faa,inset 0 1px #ffffff55;font:16px "Trebuchet MS",sans-serif;box-sizing:border-box;transform-origin:top left}#rpg-focus-timer:focus-within{border-color:#fff2bd;box-shadow:0 8px 26px #090d1fcc,0 0 0 3px #e8c58355,inset 0 1px #fff8}#rpg-focus-timer .focus-readout{grid-column:2;align-self:center;min-width:0}#rpg-focus-timer .focus-recall{grid-column:3;grid-row:1;justify-self:start;width:94px;height:94px;margin-left:4px;background:transparent url("img/pictures/StartQuestEmerald.png") center/contain no-repeat;color:#fff4c8;border:0;border-radius:50%;filter:drop-shadow(0 5px 7px #07150dcc);font:bold 14px Georgia,serif;line-height:1.05;letter-spacing:.4px;cursor:pointer;text-shadow:0 2px 2px #062d18,0 0 7px #061;transition:transform .12s ease,filter .12s ease}#rpg-focus-timer .focus-recall:hover{filter:drop-shadow(0 7px 10px #07150d) brightness(1.1);transform:scale(1.05)}#rpg-focus-timer .focus-recall:active{transform:translateY(3px) scale(.97);filter:brightness(.93)}#rpg-focus-timer>svg{grid-column:1;width:60px;height:60px;cursor:pointer;filter:drop-shadow(0 3px 5px #0008)}#rpg-focus-timer .focus-time{display:block;font:bold 29px monospace;line-height:32px;letter-spacing:-2px;white-space:nowrap}#rpg-focus-timer .focus-state{display:block;font-size:11px;color:#d9e4ff;text-transform:uppercase;letter-spacing:.5px;line-height:14px}#rpg-focus-timer .focus-alerts{position:absolute;right:17px;bottom:10px;width:34px;height:34px;padding:0;display:grid;place-items:center;border:2px solid #ffe7a0;border-radius:50%;background:linear-gradient(#f2c85c,#b87817);color:#2d2442;box-shadow:inset 0 2px #fff5b8,0 3px 6px #09142caa;transition:transform .1s ease,filter .12s ease,background .15s ease}#rpg-focus-timer .focus-alerts svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;filter:none}#rpg-focus-timer .focus-alerts[aria-pressed="false"]{background:linear-gradient(#65728e,#3a4664);color:#c4cbda;border-color:#8d9ab5;box-shadow:inset 0 2px #ffffff2e,0 3px 6px #09142c88}#rpg-focus-timer .focus-alerts:hover{filter:brightness(1.18);transform:scale(1.08)}#rpg-focus-timer .focus-alerts:active{transform:translateY(2px) scale(.96)}#rpg-focus-timer .focus-options{position:absolute;right:5px;top:1px;font:bold 22px sans-serif;background:transparent;color:#ffe29b;border:0;cursor:pointer;z-index:2}#rpg-focus-timer .focus-menu{position:absolute;right:0;top:102px;width:280px;padding:10px;border:2px solid #e8c583;border-radius:10px;background:#243969;box-shadow:0 8px 20px #000a}#rpg-focus-timer .focus-menu button{display:block;width:100%;font:17px sans-serif;padding:9px;margin:4px 0;cursor:pointer}#rpg-focus-timer .focus-note{display:block;padding:5px;line-height:18px}#rpg-focus-timer [hidden]{display:none}';document.head.appendChild(style);document.body.appendChild(focusHud);enableMobileTapSafety(focusHud);
            focusHud.querySelector(".focus-recall").style.cssText+=";display:flex;align-items:center;justify-content:center;padding:0 16px 2px;text-align:center;margin-left:42px";
            const menu=focusHud.querySelector('.focus-menu'),options=focusHud.querySelector('.focus-options');options.onclick=()=>{menu.hidden=!menu.hidden;options.setAttribute('aria-expanded',String(!menu.hidden));};
            focusHud.querySelector('.focus-float').onclick=()=>{const state=managerState();state.focusTimer.enabled=!state.focusTimer.enabled;floatingTimer.failedState=null;menu.hidden=true;options.setAttribute('aria-expanded','false');refreshFocusTimer(true);};
            focusHud.querySelector('.focus-alerts').onclick=()=>{const state=managerState();state.completionAlerts=state.completionAlerts===false;if(!state.completionAlerts){eventAudioQueue=[];releaseCompletionChime();}refreshFocusTimer(true);};
            focusHud.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();menu.hidden=true;options.setAttribute('aria-expanded','false');}});
            focusHud.addEventListener('keyup',event=>event.stopPropagation());
            for(const event of ['mousedown','mouseup','touchstart','touchmove','touchend','wheel'])focusHud.addEventListener(event,e=>e.stopPropagation());
            document.addEventListener('pointerdown',event=>{if(!focusHud.contains(event.target)){menu.hidden=true;options.setAttribute('aria-expanded','false');}});
            const recall=()=>{document.activeElement?.blur();Input.clear();TouchInput.clear();menu.hidden=true;syncMissionClock();const trip=progression.tripForTeam(managerState(),'A');if(!trip){if(!SceneManager.isSceneChanging())SceneManager.push(Scene_RPGQuestBoard);return;}if(trip.recalled){progression.requestRecall(managerState());SceneManager.goto(Scene_RPGHome);return;}if(!SceneManager.isSceneChanging()){SceneManager.push(Scene_RPGRecall);SceneManager.prepareNextScene(trip.id);}};
            focusHud.querySelector('.focus-recall').onclick=recall;focusHud.querySelector('.focus-end').onclick=()=>managerState().trips?.A?recall():showCampTimerDialog();
        }
        focusHud.style.display=visible?'flex':'none';if(!visible){focusHud.querySelector('.focus-menu').hidden=true;return;}
        const canvas=Graphics._canvas||Graphics.app?.view,rect=canvas?.getBoundingClientRect(),scale=rect?rect.width/Graphics.width:1;
        // On the idle Home screen, share the companion panel's calculated
        // column bounds. Elsewhere, preserve the compact rail but keep its
        // right edge on the same 12 px content gutter.
        const idleHome=scene instanceof Scene_RPGHome&&!state?.trips?.A;
        const campWidth=idleHome?Math.floor((Graphics.boxWidth-36)*.54):0;
        const hudX=idleHome?campWidth+24:Graphics.boxWidth-370;
        const hudWidth=idleHome?Graphics.boxWidth-campWidth-36:358;
        focusHud.style.width=hudWidth+'px';focusHud.style.left=((rect?.left||0)+hudX*scale)+'px';focusHud.style.top=((rect?.top||0)+10*scale)+'px';focusHud.style.transform=`scale(${scale})`;
        const dial=focusHud.querySelector("svg");dial.setAttribute("aria-hidden","false");dial.style.cursor="pointer";dial.setAttribute("role","button");dial.setAttribute("aria-label",state?.trips?.A?"Active expedition information":"Start Quest");dial.setAttribute("tabindex","0");dial.onclick=()=>{if(managerState().trips?.A){SceneManager.goto(Scene_RPGHome);return;}if(!SceneManager.isSceneChanging())SceneManager.push(Scene_RPGQuestBoard);};dial.onkeydown=e=>{if(["Enter"," "].includes(e.key)){e.preventDefault();dial.click();}};
        focusHud.querySelector(".focus-time").onclick=()=>dial.click();
        focusHud.querySelector(".focus-recall").textContent=state?.trips?.A?(state.trips.A.recalled?"Arrive Now":"Recall Quest"):"Start Quest";
        const alerts=focusHud.querySelector(".focus-alerts"),alertsOn=state.completionAlerts!==false;alerts.hidden=!state?.trips?.A;alerts.setAttribute("aria-pressed",String(alertsOn));alerts.setAttribute("aria-label",`Expedition alerts ${alertsOn?"on":"off"}`);alerts.title=`Expedition alerts: ${alertsOn?"on":"off"}`;
        focusDisplay.renderReadout(focusHud,view);focusHud.querySelector('.focus-end').disabled=!view.active;focusHud.querySelector('.focus-recall').disabled=scene instanceof Scene_RPGRecall;
        focusHud.querySelector('.focus-float').textContent=state.focusTimer?.enabled?'Hide compact timer':globalThis.nw?.Window?'Show floating timer':'Show compact timer (browser)';
        focusHud.querySelector('.focus-note').textContent=floatingTimer.lastError?'Floating view unavailable. Your session and in-game timer continue.':globalThis.nw?.Window?'Read-only desktop timer. Drag to move; × hides it.':'Browser compact view stays inside this page; desktop floating requires NW.js.';
    }
    window.RPGManager.focus={view:()=>focusDisplay.clockView(managerState(),selectedQuest()),refresh:()=>refreshFocusTimer(true),floating:floatingTimer};
    window.addEventListener('resize',()=>{refreshFocusTimer(true);floatingTimer.reposition();});
    // Native selects, dialogs, and window focus changes can leave MZ's cached
    // pointer state held. Reset only the cached state at those boundaries so the
    // next real mouse event is always accepted by the canvas or DOM control.
    window.addEventListener('focus',()=>{Input.clear();TouchInput.clear();});
    window.addEventListener('blur',()=>{Input.clear();TouchInput.clear();});
    document.addEventListener('pointerup',event=>{if(event.pointerType==='mouse'&&event.buttons===0&&document.activeElement?.matches?.('button,[role="button"]'))document.activeElement.blur();});
    let managerClosing=false,managerMinimized=false;
    window.addEventListener('beforeunload',()=>{managerClosing=true;floatingTimer.destroy();});
    if(globalThis.nw?.Window)try{const mainWindow=nw.Window.get();mainWindow.on('minimize',()=>{managerMinimized=true;Graphics._app?.stop();});mainWindow.on('restore',()=>{managerMinimized=false;syncMissionClock();Graphics._app?.start();refreshSessionDisplay(true);});}catch(error){/* Browser and optional native lifecycle isolation. */}
    function syncMissionClock(){
        if(managerClosing)return;
        const state=globalThis.$gameSystem?._rpgManager;
        if(!state||!globalThis.$dataRPGManagerQuests||!window.RPGManagerBattle){if(focusHud)focusHud.style.display="none";floatingTimer.close();return;}
        const now=performance.now();
        if(clockState!==state||runtimeClockAt===null){clockState=state;runtimeClockAt=now;eventAudioQueue=[];releaseCompletionChime();}
        let delta=Math.max(0,now-runtimeClockAt);runtimeClockAt=now;
        const presentationDelta=Math.min(progression.MAX_SESSION_TICK_MS,delta);
        // Job production observes the party's availability before mission arrival.
        while(delta>0){const step=Math.min(progression.MAX_SESSION_TICK_MS,delta);progression.accrueCampJobs(state,step);progression.tickCampTimer(state,step);delta-=step;}
        if(progression.consumeCampBell(state))try{playCompletionChime("Bell1",65,100);}catch(error){state.campTimer.bellError=String(error.message||error);}
        progression.advanceTimers(state);
        const result=progression.advanceMissionClock(state,now,$dataRPGManagerQuests,window.RPGManagerBattle.Battle);
        const displayTrip=progression.tripForTeam(state,"A")||state.expeditionReplay;
        if(!state.questResults)progression.tickPresentation(displayTrip,presentationDelta,state.presentationSpeed||"standard",$dataRPGManagerQuests.presentation);
        const fate=displayTrip?.presentationCurrent;
        if(fate?.sourceType==="deathSave"&&displayTrip.presentationHoldMs<displayTrip.presentationDurationMs*.35)progression.queueEventCue(state,displayTrip,fate.survived?"wounded":"death",`shown:${displayTrip.presentationCursor}:${fate.targetKey}:${fate.text}`);
        if(completionChime&&(completionChime.buffer.isError()||now-completionChime.startedAt>10000)){
            state.completionAlertError=completionChime.buffer.isError()?"Completion sound unavailable.":"Completion sound timed out.";
            releaseCompletionChime();
        }
        eventAudioQueue.push(...progression.consumeEventCues(state).filter(c=>c.enabled));
        if(state.completionAlerts===false){eventAudioQueue=[];releaseCompletionChime();}
        // Completion owns the channel; stale background cues are consumed silently.
        if(state.completionCue?.pending)eventAudioQueue=[];
        if(document.hidden||managerMinimized)eventAudioQueue=[];
        if(eventAudioQueue.length&&!completionChime&&now-eventAudioAt>=900&&!(eventAudioQueue[0].kind==="battleVictory"&&displayTrip?.presentationCurrent?.kind==="battle")){
            const event=eventAudioQueue.shift(),sounds={wounded:["Damage1",30,90],death:["Collapse1",35,80],battleStart:["Book1",24,90],battleEnd:["Bell2",22,110],battleVictory:["Applause1",38,105,900],randomEvent:["Item1",22,100]};
            eventAudioAt=now;
            try{if(sounds[event.kind])playCompletionChime(...sounds[event.kind]);}catch(error){state.completionAlertError=String(error.message||error);releaseCompletionChime();}
        }
        const cue=progression.consumeCompletionAlert(state);
        if(cue?.enabled){
            eventAudioQueue=[];
            try{playCompletionChime();}
            catch(error){state.completionAlertError=String(error.message||error);releaseCompletionChime();}
        }
        try{refreshFocusTimer();}catch(error){state.focusDisplayError=String(error.message||error);}
        refreshSessionDisplay();
        return result;
    }
    // MZ skips Scene.update when unfocused but still renders its stage. Refresh only
    // the saved-state display, never input, battle playback or a second clock delta.
    function refreshSessionDisplay(force=false){
        if(managerMinimized||document.hidden||!force&&SceneManager.isGameActive())return;
        const scene=SceneManager._scene;
        if(!(scene instanceof Scene_RPGHome)||!scene.isStarted()||SceneManager.isSceneChanging())return;
        try{
            scene.refreshTeamPanel(false);scene.refreshGuildHeader();
            if(!SceneManager.isGameActive()&&Graphics._app)Graphics._app.render();
        }catch(error){const state=globalThis.$gameSystem?._rpgManager;if(state)state.displayRefreshError=String(error.message||error);}
    }
    setInterval(syncMissionClock,250);
    // MZ's focus gate pauses Scene.update, including the event presentation cursor.
    // Keep its normal render loop on visible manager scenes; never synthesize input.
    const managerGameActive=SceneManager.isGameActive;
    SceneManager.isGameActive=function(){return !managerMinimized&&(!document.hidden&&this._scene instanceof Scene_RPGBase||managerGameActive.call(this));};
    window.addEventListener("focus",()=>{syncMissionClock();refreshSessionDisplay(true);});
    document.addEventListener("visibilitychange",()=>{syncMissionClock();realtimeTickAt=null;refreshSessionDisplay(true);});
    const makeManagerSaveContents=DataManager.makeSaveContents;
    DataManager.makeSaveContents=function(){syncMissionClock();const state=globalThis.$gameSystem?._rpgManager;if(state?.recruit)state.recruit.remainingSessionMs=Math.max(0,state.recruit.deadlineMs-Date.now());return makeManagerSaveContents.call(this);};
    function focusWizardDirection(form,direction){
        const controls=[...form.querySelectorAll("select,input,button")].filter(el=>!el.disabled),index=controls.indexOf(document.activeElement),columns={class:3,type:2,appearance:4,review:3,full:3,shop:2}[form.dataset.step]||1,step={left:-1,right:1,up:-columns,down:columns}[direction];controls[(index+step+controls.length)%controls.length]?.focus();
    }
    function updateFormController(form){
        if(!form||!form.contains(document.activeElement))return;
        if(["quest-filters","shop-slot-tabs"].includes(form.id)&&(Input.isTriggered("ok")||Input.isTriggered("cancel"))){document.activeElement?.blur();(SceneManager._scene._choices||SceneManager._scene._commandWindow)?.activate();Input.clear();return;}
        if(Input.isTriggered("cancel")){form.querySelector('[data-action="back"]')?.click();Input.clear();return;}
        const controls=[...form.querySelectorAll("select,input,button")].filter(el=>!el.disabled),current=document.activeElement,index=controls.indexOf(current);
        if(["character-creation","shop-slot-tabs"].includes(form.id)&&current?.tagName==="BUTTON"&&["left","right","up","down"].some(key=>Input.isTriggered(key))){focusWizardDirection(form,["left","right","up","down"].find(key=>Input.isTriggered(key)));Input.clear();return;}

        if(Input.isTriggered("down")||Input.isTriggered("up")){controls[(index+(Input.isTriggered("up")?controls.length-1:1))%controls.length]?.focus();Input.clear();}
        else if(current?.tagName==="SELECT"&&(Input.isTriggered("left")||Input.isTriggered("right"))){current.selectedIndex=(current.selectedIndex+(Input.isTriggered("right")?1:current.options.length-1))%current.options.length;current.dispatchEvent(new Event("change"));if(current.isConnected)current.focus();Input.clear();}
        else if(Input.isTriggered("ok")){if(current?.tagName==="BUTTON")current.click();else controls[(index+1)%controls.length]?.focus();Input.clear();}
    }
    const updateSceneBase=Scene_Base.prototype.update;
    Scene_Base.prototype.update=function(){
        if(!managerDialog&&!this._shopTabs?.contains(document.activeElement)&&!this._questFilters?.contains(document.activeElement)&&!this._campNav?.contains(document.activeElement)&&!(this._campNav&&Input.isTriggered("pagedown")))updateSceneBase.call(this);
        syncMissionClock();
        if(this._campStatus){const state=managerState(),key=`${state.gold}:${state.arcana}`;if(this._campStatusKey!==key){this._campStatusKey=key;this._campStatus.querySelector('[data-resource="gold"]').textContent=`◉ ${state.gold} Gold`;this._campStatus.querySelector('[data-resource="arcana"]').textContent=`◇ ${state.arcana||0} Arcana`;}}
        if(this._savePager&&!this._campNav?.contains(document.activeElement)&&(Input.isTriggered("pageup")||Input.isTriggered("pagedown"))){this._savePager.querySelectorAll("button")[Input.isTriggered("pagedown")?1:0]?.click();Input.clear();}
        updateFormController(this._shopTabs?.contains(document.activeElement)?this._shopTabs:this._nameForm||(this._questFilters?.contains(document.activeElement)?this._questFilters:null));
        if(this._campNav?.contains(document.activeElement)&&(Input.isTriggered("left")||Input.isTriggered("right")||Input.isTriggered("up")||Input.isTriggered("down"))){const buttons=[...this._campNav.querySelectorAll("button")].filter(b=>!b.disabled),index=buttons.indexOf(document.activeElement),step=Input.isTriggered("left")?-1:Input.isTriggered("up")?-4:Input.isTriggered("down")?4:1;buttons[(index+step+buttons.length)%buttons.length]?.focus();Input.clear();}
        if(managerDialog&&!exitSaving){const buttons=managerDialog.buttons;if(Input.isTriggered("cancel"))managerDialog.cancel();else if(Input.isTriggered("ok")){document.activeElement?.click();}else if(Input.isTriggered("right")||Input.isTriggered("left")){const index=buttons.indexOf(document.activeElement);buttons[(index+1)%buttons.length].focus();}}
        else if(this._campNav&&Input.isTriggered("pagedown")){const buttons=[...this._campNav.querySelectorAll("button")].filter(b=>!b.disabled),index=buttons.indexOf(document.activeElement);buttons[(index+1)%buttons.length].focus();Input.clear();}
        else if(this._campNav?.contains(document.activeElement)&&Input.isTriggered("ok")){document.activeElement.click();Input.clear();}
    };

    // Copy a complete face cell, scaling rather than cropping at small sizes.
    // Scene readiness waits for these sheets, so switching NPCs never races loads.
    function portrait(window, npc, x, y, size) {
        if (!npc?.portrait) return;
        const { sheet, index, columns = 4, rows = 2 } = npc.portrait;
        const bitmap = managerArt("faces",sheet);
        if(!bitmap.isReady()){CozyUI.icon(window.contents,"roster",x,y,size,"#c6b99d");return;}
        const cellWidth = bitmap.width / columns;
        const cellHeight = bitmap.height / rows;
        window.contents.paintOpacity = npc.alive ? 255 : 100;
        const smooth=window.contents.context.imageSmoothingEnabled;window.contents.context.imageSmoothingEnabled=false;
        window.contents.blt(bitmap, index % columns * cellWidth, Math.floor(index / columns) * cellHeight, cellWidth, cellHeight, x, y, size, size);
        window.contents.context.imageSmoothingEnabled=smooth;
        window.contents.paintOpacity = 255;
    }

    class Window_RPGPanel extends Window_Base {
        initialize(rect) { super.initialize(rect); this.opacity = 255; this.backOpacity = 245; }
        createContents(){super.createContents();if(this.contentsBack)CozyUI.ledgerSurface(this.contentsBack,managerSceneAccent());}
        lineHeight() { return 30; }

        resetFontSettings() {
            super.resetFontSettings();
            this.contents.fontSize = 20;
        }

        line(text, y, color = ColorManager.normalColor(), size = 20) {
            this.changeTextColor(color === ColorManager.normalColor() ? CozyUI.colors.ink : color === ColorManager.systemColor() ? CozyUI.colors.honey : color);
            this.contents.fontSize = size;
            this.contents.fontFace = y===0&&size>=22 ? `Georgia, ${$gameSystem.mainFontFace()}` : `Trebuchet MS, ${$gameSystem.mainFontFace()}`;
            this.drawText(text, 8, y, this.innerWidth - 16);
        }

        setLines(lines) {
            this.contents.clear();
            const compact=lines.length*30>this.innerHeight,step=compact?Math.max(20,Math.floor(this.innerHeight/lines.length)):30;
            lines.forEach((text, index) => this.line(text, index * step, CozyUI.colors.ink, compact?14:this.innerHeight<70?15:18));
        }

        wrapped(text, y) {
            let line = "";
            for (const word of text.split(/\s+/)) {
                const next = line ? `${line} ${word}` : word;
                if (line && this.textWidth(next) > this.innerWidth - 16) {
                    this.line(line, y);
                    y += 30;
                    line = word;
                } else {
                    line = next;
                }
            }
            this.line(line, y);
        }

        rule(y, color = "#c6ae65") { this.contents.fillRect(8, y, this.innerWidth - 16, 1, color); }
        badge(text, x, y, width, color) {
            CozyUI.round(this.contents,x,y,width,26,"#464436",color,5);
            this.changeTextColor(color); this.contents.fontSize = 15; this.drawText(text, x + 6, y, width - 12, "center");
        }
    }

    class Window_RPGExpeditionPanel extends Window_RPGPanel {
        initialize(rect) { super.initialize(rect); this._startRegions = []; this._startHandler = null; this._recallRegion=null;this._recallHandler=null; }
        destroy(options){this._battleStage?.destroy();this._travelStage?.destroy();this._battleStage=null;this._travelStage=null;super.destroy(options);}
        finishBattleArt(){this._battleStage?.finish();}
        setStartHandler(handler) { this._startHandler = handler; }
        setRecallHandler(handler){this._recallHandler=handler;}
        setRecallRegion(rect){this._recallRegion=rect;}
        setStartRegions(regions) { this._startRegions = regions; }
        update() {
            super.update();
            const scene=SceneManager._scene,resources=`${managerState().gold}:${managerState().arcana||0}:${managerState().magicalArtifacts||0}`;
            if(scene instanceof Scene_RPGHome&&resources!==scene._headerResourceKey)scene.refreshGuildHeader();
            if(this._results){
                // Finish is an explicit centered DOM button; unrelated OK input must not dismiss results.
                if(TouchInput.wheelY>=20){this._resultPage=(this._resultPage+1)%this._resultPages;this.drawResults(this._results);}
                if(TouchInput.wheelY<=-20){this._resultPage=(this._resultPage+this._resultPages-1)%this._resultPages;this.drawResults(this._results);}
                if(Input.isTriggered("pagedown")){this._resultPage=(this._resultPage+1)%this._resultPages;this.drawResults(this._results);}
                if(Input.isTriggered("pageup")){this._resultPage=(this._resultPage+this._resultPages-1)%this._resultPages;this.drawResults(this._results);}
            }
            if (!this.visible || !TouchInput.isTriggered()) return;
            const point = this.worldTransform.applyInverse(new Point(TouchInput.x, TouchInput.y));
            if(this._results&&this._resultPageRegion?.contains(point.x-this.padding,point.y-this.padding)){this._resultPage=(this._resultPage+1)%this._resultPages;this.drawResults(this._results);return;}
            if(this._recallHandler&&this._recallRegion?.contains(point.x-this.padding,point.y-this.padding)){SoundManager.playCancel();this._recallHandler();return;}
            if(!this._startHandler)return;
            const region = this._startRegions.find(entry => entry.rect.contains(point.x - this.padding, point.y - this.padding));
            if (region) { SoundManager.playOk(); this._startHandler(region.team); }
        }
        drawSessionClock(remaining,state,name,progress=0,phase=""){
            const w=this.innerWidth,b=this.contents,low=remaining>0&&remaining<=10000;
            this._displayRemainingMs=remaining;this._displayCountdown=formatTime(remaining);this._displaySessionState=state;
            CozyUI.text(this,this._displayCountdown,8,0,w-150,40,low?"#e8c583":"#f4deb0","left",48);
            CozyUI.text(this,state,w-134,8,126,18,state==="Complete"?"#b8d59c":"#ddd4b7","right",21);
            CozyUI.text(this,phase?String(phase).replace(/^./,c=>c.toUpperCase()):state==="Complete"?"Session finished":"Focus session",w-134,32,126,17,"#c6b99d","right",16);
            CozyUI.text(this,name,8,52,w-16,20,"#e4dbc2","left",20);
            b.fillRect(8,77,w-16,4,"#252a31");b.fillRect(8,77,(w-16)*Math.max(0,Math.min(1,progress)),4,"#a6c797");
        }
        drawResults(result){
            this._travelStage?.suspend();
            this.finishBattleArt?.();
            this._results=result;
            const b=this.contents,w=this.innerWidth,h=this.innerHeight;
            b.clear();
            if(rewardEmblemArt.isReady()&&result.endKind!=="early"){b.paintOpacity=58;b.blt(rewardEmblemArt,0,0,rewardEmblemArt.width,rewardEmblemArt.height,Math.max(0,w-92),2,82,82);b.paintOpacity=255;}
            const text=(value,x,y,width,size=18,color="#f4e8cf",height=22)=>CozyUI.text(this,String(value),x,y,width,size,color,"left",height);
            // The return screen is intentionally a concise recap. Detailed expedition
            // logs remain internal history and no longer compete with the Finish action.
            this._resultPages=1;this._resultPage=0;
            this._displayRemainingMs=0;this._displayCountdown="00:00";this._displaySessionState=result.endKind==="early"?"Ended":result.autoRetreat?"Returned":"Complete";
            text("Expedition complete",8,6,w-16,w<400?20:26,"#ffe3a4",34);text(result.endKind==="early"?"Session ended":`${this._displaySessionState} / ${result.outcome||"Returned"}`,8,45,w-16,18,"#b8d59c",26);
            CozyUI.round(b,6,85,w-12,27,"#e9d9b4","#b39b6c",4);
            text(result.endKind==="early"?"Session ended — previous finds kept":result.autoRetreat?"Automatic return — consequences preserved":"Quest complete — rewards and growth applied",13,86,w-26,16,"#423e30",26);
            this._resultPageRegion=null;
                // Legacy larger parties finish safely; their additional members have full Details rows.
                const members=(result.members||[]).slice(0,3),cardHeight=Math.min(60,(h-238)/3);
                let y=116;
                for(const member of members){
                    CozyUI.round(b,6,y,w-12,cardHeight-2,"#2b375a",null,4);
                    CozyUI.portraitFrame(this,{...member,alive:member.condition!=="Dead"},12,y+4,26);
                    text(`${member.name} / ${member.role||"Adventurer"}`,48,y,w-60,18,member.condition==="Dead"?"#e9afa1":"#f4e8cf",20);
                    text(member.levelledUp?`LEVEL UP ${member.oldLevel} → ${member.level}: ${member.levelChanges||"New strength"}`:`HP ${member.health}/${member.maxHealth}   Armor ${member.armor}   Ward ${member.ward}`,48,y+20,w-60,16,"#bdd5cf",18);
                    if(cardHeight>=55)text(`${member.condition}${member.permanentWounds?.length?` / ${member.permanentWounds.length} permanent injuries`:""}${member.levelledUp?` / LEVEL UP ${member.oldLevel} → ${member.level}!`:""}`,48,y+38,w-60,14,member.condition==="Healthy"?"#b8cea5":"#e9afa1",18);
                    y+=cardHeight;
                }
                text(`Earned: +${result.rewardGold} Gold / +${result.rewardArcana} Arcana / +${result.rewardMagicalArtifacts||0} Artifacts`,8,y+2,w-16,16,"#e8c583",18);
                text(`${result.enemiesDefeated||0} enemies defeated / ${(result.members||[]).filter(n=>n.condition==="Dead").length} deaths / ${(result.members||[]).filter(n=>n.condition==="Wounded").length} wounded`,8,y+23,w-16,15,"#c6b99d",18);

                text(`${result.xpPerMember||0} completion + ${result.enemyXpEarned||0} enemy XP / Upgrades expired: ${(result.upgradeIds||[]).length}`,8,y+44,w-16,14,"#c6b99d",18);
            this.setRecallRegion(null);
        }
        ensureTravelStage(){
            const visual=globalThis.RPGManagerBattleStage;
            if(!this._travelStage)this._travelStage=new visual.TravelStage({art:managerArt,bitmap:(w,h)=>new Bitmap(w,h),round:CozyUI.round,text:CozyUI.text,ellipse:CozyUI.ellipse,heart:drawBattleHeart,shield:drawBattleShield,ward:drawBattleWard,quest:findQuest,member:findNpc,gear:id=>progression.SHOP[id],frame:()=>Graphics.frameCount,motion:()=>CozyUI.motionScale(),active:()=>!document.hidden});
            return this._travelStage;
        }
        drawTravel(trip){
            this.finishBattleArt?.();
            const visual=globalThis.RPGManagerBattleStage;
            if(visual?.TravelStage&&this._travelFailedTrip!==trip.id){
                try{
                    this.ensureTravelStage();
                    this._travelStage.render(this,trip);this._roadScroll=this._travelStage.scroll;return;
                }catch(error){this._travelRenderError=String(error.message||error);this._travelFailedTrip=trip.id;this._travelStage?.destroy();this._travelStage=null;}
            }
            const b=this.contents,w=this.innerWidth,top=this.innerHeight>=316?104:88,bottom=this.innerHeight-110,h=bottom-top,motion=CozyUI.motionScale(),returning=trip.phase==="return";
            const frame=Graphics.frameCount;
            if(this._roadTripId!==trip.id){this._roadTripId=trip.id;this._roadScroll=0;this._roadFrame=frame;}
            const delta=Math.max(0,Math.min(6,frame-this._roadFrame));this._roadFrame=frame;
            this._roadScroll+=(returning?-1:1)*delta*.45*motion;
            const scroll=this._roadScroll;
            CozyUI.text(this,returning?"THE ROAD HOME":"ON THE ROAD",8,top-17,w-16,11,"#d8d1a0","left",14);
            const fieldEvent=trip.presentationCurrent?.kind==="travel"&&trip.presentationCurrent?.trigger;
            if(fieldEvent){CozyUI.round(b,w-128,top-19,120,18,"#e9d9b4","#b39b6c",3);CozyUI.text(this,"FIELD NOTE / OBSERVED",w-123,top-18,110,10,"#423e30","center",16);}
            b.gradientFillRect(8,top,w-16,h,"#6e8660","#435c3e",true);
            for(let i=0;i<9;i++){const x=8+((i*61-scroll)%(w-16)+(w-16))%(w-16);CozyUI.ellipse(b,x,top+13,22,13,"#3e5938");b.fillRect(x-2,top+20,4,12,"#726447");}
            CozyUI.ellipse(b,w/2,top+h*.74,w*.55,h*.22,"#aa9870");
            for(let i=0;i<8;i++){const x=8+((i*53-scroll)%(w-16)+(w-16))%(w-16);CozyUI.ellipse(b,x,top+h*.78,9,3,"#c3b38d");}
            const members=(trip.preparedTeam||[]).slice(0,3),step=(w-34)/Math.max(1,members.length);
            members.forEach((member,i)=>{
                const face=(member.walkPortrait||member.portrait)||{sheet:"Actor1",index:0},custom=face.sheet==="RPGManagerMonsters",bitmap=custom?managerArt("faces",face.sheet):managerArt("characters",face.sheet);
                const x=17+i*step+step/2-13,y=top+Math.max(5,h*.58-30)+(motion?Math.sin(frame/7+i)*1.5*motion:0),dead=!!trip.expeditionDeaths?.[member.id]||member.alive===false;
                CozyUI.ellipse(b,x+13,y+39,16,4,"#253b2b66");
                if(bitmap.isReady()){
                    const big=!custom&&ImageManager.isBigCharacter(face.sheet),cols=custom?(face.columns||4):big?3:12,rows=custom?(face.rows||2):big?4:8,cw=bitmap.width/cols,ch=bitmap.height/rows,pattern=dead||!motion?1:Math.floor(frame/9+i)%3;
                    const sx=custom?(face.index%cols)*cw:((big?0:(face.index%4)*3)+pattern)*cw,sy=custom?Math.floor(face.index/cols)*ch:((big?0:Math.floor(face.index/4)*4)+(returning?1:2))*ch;
                    b.paintOpacity=dead?90:255;b.blt(bitmap,sx,sy,cw,ch,x,y,26,39);b.paintOpacity=255;
                }
                CozyUI.round(b,x+13-step/2+3,top+h-37,step-6,35,"#2e412de8",null,3);
                CozyUI.text(this,`${member.name}${dead?" (fallen)":""}`,x+13-step/2+6,top+h-36,step-12,10,dead?"#e3b3a6":"#f4e8cf","center",16);
                CozyUI.text(this,`HP ${dead?0:member.health||0}/${member.maxHealth||0}  Armor ${dead?0:member.armor||0}  Ward ${dead?0:member.ward??((member.innateWard||0)+(member.temporaryWard||0))}`,x+13-step/2+6,top+h-20,step-12,9,"#bdd5cf","center",15);
            });
            CozyUI.round(b,8,bottom+3,w-16,43,"#292d27",null,5);
            const text=trip.presentationCurrent?.text||trip.latestEvent||(returning?"Your companions follow the path home.":"Your companions set out together.");b.fontSize=12;
            const lines=[];let line="";for(const word of text.split(/\s+/)){if(line&&this.textWidth(`${line} ${word}`)>w-32){lines.push(line);line="";}line+=(line?" ":"")+word;}if(line)lines.push(line);
            const pages=Math.max(1,Math.ceil(lines.length/3)),t=Math.min(1,Math.max(0,1-(trip.presentationHoldMs||0)/Math.max(1,trip.presentationDurationMs||1000))),page=Math.min(pages-1,Math.floor(t*pages));
            lines.slice(page*3,page*3+3).forEach((text,i)=>CozyUI.text(this,text,16,bottom+5+i*13,w-32,12,"#d7e0b5","left",13));
            CozyUI.text(this,trip.presentationCurrent?.dialogue?`${trip.presentationCurrent.dialogueSpeakerName||"Party"}: ${trip.presentationCurrent.dialogue}`:`${members.length} companions / ${returning?"Returning to the guild":"Travelling together"}`,8,this.innerHeight-61,w-16,11,"#c6b99d","left",17);
        }
        drawBattle(trip){
            const visual=globalThis.RPGManagerBattleStage;
            if(visual&&this._battleFailedEvent!==trip.presentationCurrent){
                if(!visual.isBattle(trip)){this.finishBattleArt();this.drawTravel(trip);return;}
                try{
                    if(!this._battleStage)this._battleStage=new visual.Stage({art:managerArt,bitmap:(w,h)=>new Bitmap(w,h),round:CozyUI.round,text:CozyUI.text,ellipse:CozyUI.ellipse,heart:drawBattleHeart,shield:drawBattleShield,ward:drawBattleWard,quest:findQuest,motion:()=>CozyUI.motionScale(),travelBackdrop:(win,trip,g)=>{const stage=this.ensureTravelStage();stage.suspend();stage.backdrop(win,visual.biome(trip,findQuest(trip.questId)),g.top,g.height,trip);return{spec:stage.lastBackground,offset:stage.lastOffset};}});
                    this._travelStage?.suspend();this._battleStage.render(this,trip);return;
                }catch(error){this._battleRenderError=String(error.message||error);this._battleFailedEvent=trip.presentationCurrent;this._battleStage?.destroy();this._battleStage=null;}
            }
            const event=trip.presentationCurrent,active=event?.kind==="battle"&&(trip.presentationHoldMs>0||trip.presentationQueue?.length>0);
            if(trip.phase!=="complete"&&!active){this.drawTravel(trip);return;}
            const fighters=active&&trip.presentationFighters?.length?trip.presentationFighters:(trip.preparedTeam||[]).map(n=>({...n,key:`player:${n.id}`,side:"player",ward:(n.innateWard||0)+(n.temporaryWard||0)}));
            const duration=Math.max(1,trip.presentationDurationMs||event?.holdMs||450),t=Math.min(1,Math.max(0,1-(trip.presentationHoldMs||0)/duration)),impact=t>=.46;
            const dramatic=["BOSS","SIGNATURE","CRITICAL","DEATH"].includes(event?.importance);
            const top=this.innerHeight>=316?104:88,bottom=this.innerHeight-110,height=bottom-top,gap=14,cardWidth=(this.innerWidth-16-gap)/2;
            const label=(text,x,y,width,color,size=11,lineHeight=14)=>{this.contents.fontSize=size;this.changeTextColor(color);this.contents.drawText(text,x,y,width,lineHeight);};
            // Static roster cards keep labels and defenses still while the sprite moves.
            label("PARTY",8,top-17,cardWidth,"#a9dfff");
            label(active?(trip.boss?"BOSS ENCOUNTER":"ENEMIES"):"ON THE ROAD",8+cardWidth+gap,top-17,cardWidth,"#ffca9b");
            // A little woodland stage: carved team rails, earth floor and a clear center aisle.
            CozyUI.battleScenery(this.contents,8,top,this.innerWidth-16,height,trip.boss);
            CozyUI.round(this.contents,8+cardWidth+2,top+3,gap-4,height-6,"#baab7230",null,3);
            const positions=new Map();
            for(const side of ["player","enemy"]){
                const group=fighters.filter(f=>f.side===side),rowHeight=Math.min(36,height/Math.max(1,group.length));
                group.forEach((f,i)=>positions.set(f.key,{x:8+(side==="enemy"?cardWidth+gap:0),y:top+i*rowHeight,width:cardWidth,height:rowHeight}));
            }
            const actor=positions.get(event?.actorKey),target=positions.get(event?.targetKey);
            if(actor&&target){
                const ctx=this.contents.context;ctx.save();ctx.strokeStyle="#ffe5a1";ctx.lineWidth=2;ctx.globalAlpha=.75;
                ctx.beginPath();ctx.moveTo(actor.x+actor.width/2,actor.y+actor.height/2);ctx.lineTo(target.x+target.width/2,target.y+target.height/2);ctx.stroke();ctx.restore();this.contents.baseTexture.update();
            }
            for(const f of fighters){
                const pos=positions.get(f.key),isActor=f.key===event?.actorKey,isTarget=f.key===event?.targetKey;
                let hp=f.health,armor=f.armor||0,ward=f.ward||0;
                if(isTarget&&impact&&Number.isFinite(event.targetHealth)){hp=event.targetHealth;armor=event.targetArmor||0;ward=event.targetWard||0;}
                const accent=isTarget?"#ffd58a":isActor?"#8ee7ff":hp<=0?"#686571":"#526978";
                this.contents.fillRect(pos.x,pos.y,pos.width,pos.height-1,isTarget?"#665036e0":isActor?"#304a4be0":f.side==="player"?"#354538cf":"#454236cf");
                this.contents.strokeRect(pos.x,pos.y,pos.width,pos.height-1,accent);
                const size=Math.min(26,pos.height-3),face=f.portrait||{sheet:"Actor1",index:0},enemy=f.side==="enemy";
                const bitmap=managerArt("faces",face.sheet),motion=CozyUI.motionScale();
                let x=pos.x+3,y=pos.y+1;
                if(isActor&&actor&&target)x+=Math.sign(target.x-actor.x)*4*Math.sin(Math.PI*t)*motion;
                if(isTarget&&t>.46&&t<.8)x+=(event.missed?4:Math.sin(t*80)*2)*motion;
                CozyUI.round(this.contents,pos.x+2,pos.y+1,size+2,size+1,enemy?"#655544":"#52664b",null,3);
                CozyUI.ellipse(this.contents,x+size/2,y+size-1,size*.46,2,"#171e2370");
                if(bitmap.isReady()){
                    // Both sides use the same framed face crop; walking sheets remain in camp.
                    const cols=face.columns||4,rows=face.rows||2,w=bitmap.width/cols,h=bitmap.height/rows;
                    const sx=(face.index%cols)*w,sy=Math.floor(face.index/cols)*h;
                    const ctx=this.contents.context;ctx.save();ctx.globalAlpha=hp<=0?.45:1;
                    if(hp<=0){ctx.translate(x+size/2,y+size/2);ctx.rotate(Math.PI/2);ctx.drawImage(bitmap.canvas,sx,sy,w,h,-size/2,-size/2,size,size);}
                    else ctx.drawImage(bitmap.canvas,sx,sy,w,h,x,y,size,size);
                    ctx.restore();this.contents.baseTexture.update();
                }
                if(isTarget&&impact&&t<.8&&motion>0&&!event.missed){const c=this.contents.context;c.save();c.strokeStyle=ward>0?"#c5ade4":"#f2d39b";c.globalAlpha=(.8-t)*motion*2;c.lineWidth=1.5;c.beginPath();c.moveTo(x+size+1,y+size*.25);c.lineTo(x+size+5,y+size*.5);c.lineTo(x+size+1,y+size*.75);c.stroke();c.restore();this.contents.baseTexture.update();}
                const textX=pos.x+31,textWidth=pos.width-35;
                const duplicate=fighters.filter(other=>other.side===f.side&&other.name===f.name).length>1;
                const name=duplicate?`${f.name} ${fighters.filter(other=>other.side===f.side&&other.name===f.name).indexOf(f)+1}`:f.name;
                label(`${isActor?"> ":isTarget?"* ":""}${name}${hp<=0?" - FALLEN":""}`,textX,pos.y,textWidth,hp<=0?"#b0a7b4":isActor||isTarget?accent:"#edf2f7",11,11);
                const iconY=pos.y+Math.min(19,pos.height-8),iconSize=7;
                for(let i=0;i<(f.maxHealth||hp);i++)drawBattleHeart(this.contents,textX+i*9,iconY,iconSize,i<hp);
                let iconX=textX+(f.maxHealth||hp)*9+4;
                const compact=((f.maxHealth||hp)+armor+ward)*9+4>textWidth;
                if(compact){
                    if(armor){drawBattleShield(this.contents,iconX,iconY,iconSize);label(String(armor),iconX+9,iconY-2,23,"#bcdfff",10,10);iconX+=34;}
                    if(ward){drawBattleWard(this.contents,iconX,iconY,iconSize);label(String(ward),iconX+9,iconY-2,23,"#dcbbff",10,10);}
                }else{
                    for(let i=0;i<armor;i++){drawBattleShield(this.contents,iconX,iconY,iconSize);iconX+=9;}
                    for(let i=0;i<ward;i++){drawBattleWard(this.contents,iconX,iconY,iconSize);iconX+=9;}
                }
            }
            // Dedicated caption area: action text never covers fighters or Recall.
            CozyUI.round(this.contents,8,bottom+3,this.innerWidth-16,43,event?.sourceType==="completion"?"#3d4b34":"#292d27",null,5);
            this.contents.fillRect(8,bottom+3,2,43,event?.color||"#a9dfff");
            this.contents.fontSize=12;this.changeTextColor(event?.color||"#e3edf4");
            const text=event?.text||trip.latestEvent||"Travelling.",words=text.split(/\s+/);let line="";const lines=[];
            for(const word of words){if(this.textWidth(`${line} ${word}`)>this.innerWidth-32&&line){lines.push(line);line="";}line+=(line?" ":"")+word;}if(line)lines.push(line);
            const pages=Math.max(1,Math.ceil(lines.length/3)),page=Math.min(pages-1,Math.floor(t*pages));
            lines.slice(page*3,page*3+3).forEach((text,index)=>this.contents.drawText(text,16,bottom+5+index*13,this.innerWidth-32,13));
            const speaker=fighters.find(f=>f.key===(event?.dialogueSpeakerId?`player:${event.dialogueSpeakerId}`:event?.targetKey||event?.actorKey));
            if(event?.dialogue&&speaker?.portrait)portrait(this,speaker,8,this.innerHeight-61,14);
            if(event?.dialogue||dramatic)label(event?.dialogue?`${speaker?.name||"Party"}: \u201c${event.dialogue}\u201d`:String(event.importance),event?.dialogue&&speaker?.portrait?26:8,this.innerHeight-61,this.innerWidth-(event?.dialogue&&speaker?.portrait?34:16),event?.dialogue?"#ffe5ae":event?.color||"#b8cddd",10);
            else{
                const y=this.innerHeight-57;drawBattleHeart(this.contents,8,y,8,true);label("HP",20,y-3,24,"#efadba",10);
                drawBattleShield(this.contents,48,y,8);label("Armor",60,y-3,42,"#bcdfff",10);
                drawBattleWard(this.contents,105,y,8);label("Ward",117,y-3,40,"#dcbbff",10);
                label("Blue acts | Gold target",165,y-3,this.innerWidth-173,"#b8cddd",10);
            }
        }
        drawParty(trip, y) {
            const frame = Math.floor(Graphics.frameCount / 12) % 3;
            (trip?.preparedTeam || []).slice(0, 3).forEach((member, index) => {
                const face = (member.walkPortrait||member.portrait) || { sheet: "Actor1", index: 0 }, bitmap = managerArt("characters",face.sheet);
                bitmap.addLoadListener(() => {
                    const dead = !!trip.expeditionDeaths?.[member.id], w = bitmap.width / 12, h = bitmap.height / 8;
                    const sx = ((face.index % 4) * 3 + (dead ? 1 : frame)) * w, sy = (Math.floor(face.index / 4) * 4 + 2) * h, x = 198 + index * 31;
                    if (dead) {
                        // Preserve the normal sprite proportions, then rotate the
                        // entire character onto its side instead of flattening it.
                        const context = this.contents.context;
                        context.save();
                        context.translate(x + 14, y + 26);
                        context.rotate(Math.PI / 2);
                        context.drawImage(bitmap.canvas, sx, sy, w, h, -13.5, -20, 27, 40);
                        context.restore();
                        this.contents.baseTexture.update();
                    } else this.contents.blt(bitmap, sx, sy, w, h, x, y, 27, 40);
                    if (dead) { this.changeTextColor("#ff8b8b"); this.contents.fontSize = 10; this.drawText("✕", x + 5, y + 2, 18, "center"); }
                    else if (member.id === trip.leaderId) { this.changeTextColor("#ffe36d"); this.contents.fontSize = 12; this.drawText("★", x + 5, y - 8, 18, "center"); }
                });
            });
        }
    }

    class Window_RPGCampsite extends Window_RPGPanel {
        initialize(rect) { super.initialize(rect); this._campers = new Map(); this._hitRegions=[]; this._selectHandler=null;this._campVisuals=new Map();this._figureFrames=new Map(); }
        setSelectHandler(handler){this._selectHandler=handler;}
        setState(state) { this._state = state; this.syncCampers(); this.refresh(); }
        syncCampers() {
            const away = progression.unavailableIds(this._state || { trips: {} });
            const visible = progression.sortRoster((this._state?.roster || []).filter(npc => progression.living(npc) && !npc.retired && !away.has(npc.id)), "healthy").slice(0, progression.MAX_ROSTER_SIZE);
            const active = new Set(visible.map(npc => npc.id));
            for (const id of this._campers.keys()) if (!active.has(id)) this._campers.delete(id);
            visible.forEach((npc, index) => {
                const current=this._campers.get(npc.id);if(current){current.npc=npc;return;}
                const x=30+index*Math.max(30,(this.innerWidth-75)/Math.max(1,visible.length-1)),y=70;
                this._campers.set(npc.id, { npc, x, y, tx:x, ty:y, pause:20 + index * 7, direction:2, seed:index + 1, job:progression.campJobFor(this._state,npc.id)||"idle" });
            });
        }
        jobPoints(job){
            const w=this.innerWidth,h=this.innerHeight;
            if(job==="rest")return[[62,88],[108,105],[76,145],[132,154]];
            if(job==="work")return[[w-120,h-76],[w-72,h-92],[w-154,h-48]];
            if(job==="study")return[[w-116,82],[w-70,112],[w-150,130]];
            return[[w*.30,h*.48],[w*.45,h*.62],[w*.58,h*.42],[w*.48,h*.78],[w*.25,h*.76],[w*.67,h*.70]];
        }
        chooseDestination(c) {
            c.job=progression.campJobFor(this._state,c.npc.id)||"idle";
            const points=this.jobPoints(c.job);
            c.seed = (Math.imul(c.seed, 1664525) + 1013904223) >>> 0;
            const coworkers=[...this._campers.values()].filter(other=>(progression.campJobFor(this._state,other.npc.id)||"idle")===c.job).sort((a,b)=>String(a.npc.id).localeCompare(String(b.npc.id)));
            const workerIndex=Math.max(0,coworkers.indexOf(c));
            const point = points[(c.seed+workerIndex)%points.length]; c.tx = Math.max(24,Math.min(this.innerWidth-75,point[0])); c.ty = Math.max(60,Math.min(this.innerHeight-108,point[1]));
            c.direction = Math.abs(c.tx-c.x) > Math.abs(c.ty-c.y) ? (c.tx<c.x?4:6) : (c.ty<c.y?8:2);
        }
        updateCampers() {
            for (const c of this._campers.values()) {
                const walking=c.pause===0&&Math.hypot(c.tx-c.x,c.ty-c.y)>1.5;
                c.pieceTime=walking?(c.pieceTime||0)+1:0;
                const job=progression.campJobFor(this._state,c.npc.id)||"idle";
                if(job!==c.job){c.job=job;c.pause=0;this.chooseDestination(c);}
                if (c.pause > 0) { c.pause--; if (c.pause % 36 === 0) c.direction = [2,4,6,8][(c.seed+c.pause)%4]; if(c.pause===0)this.chooseDestination(c); continue; }
                const dx=c.tx-c.x,dy=c.ty-c.y,distance=Math.hypot(dx,dy);
                if(distance<1.5){c.x=c.tx;c.y=c.ty;c.seed=(c.seed+97)>>>0;c.pause=35+(c.seed%100);c.direction=2;continue;}
                const speed=.32;c.x+=dx/distance*speed;c.y+=dy/distance*speed;
            }
            const campers=[...this._campers.values()];
            for(let i=0;i<campers.length;i++)for(let j=i+1;j<campers.length;j++){
                const a=campers[i],b=campers[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),minimum=54;
                if(d>0&&d<minimum){const push=(minimum-d)/2,nx=dx/d,ny=dy/d;a.x-=nx*push;a.y-=ny*push;b.x+=nx*push;b.y+=ny*push;}
            }
            for(const c of campers){c.x=Math.max(22,Math.min(this.innerWidth-78,c.x));c.y=Math.max(58,Math.min(this.innerHeight-108,c.y));}
        }
        ensureCampLayers(){
            if(this._campLayer)return;
            this._campLayer=new Sprite();this.addInnerChild(this._campLayer);
            this._fireBitmap=new Bitmap(64,72);this._fireSprite=new Sprite(this._fireBitmap);this._fireSprite.anchor.set(.5,1);this._campLayer.addChild(this._fireSprite);
        }
        refresh() {
            if(!this._campers)return;
            this.ensureCampLayers();
            const artReady=cozyCampArt.isReady(),key=`${this.innerWidth}:${this.innerHeight}:${artReady}`;
            if(this._campSceneryKey!==key){
                this._campSceneryKey=key;this.contents.clear();
                if(artReady){const scale=Math.max(this.innerWidth/cozyCampArt.width,this.innerHeight/cozyCampArt.height),sw=this.innerWidth/scale,sh=this.innerHeight/scale;this.contents.blt(cozyCampArt,(cozyCampArt.width-sw)/2,0,sw,sh,0,0,this.innerWidth,this.innerHeight);}
                else CozyUI.campFallback(this.contents);
                this.contents.fillRect(0,0,this.innerWidth,34,"#283b2ae0");
                CozyUI.icon(this.contents,"campaign",10,7,19,"#e8cd94");CozyUI.text(this,"Camp",36,3,this.innerWidth-44,16,"#fff0d0","left",22);
                const sign=(text,x,y,w)=>{CozyUI.round(this.contents,x,y,w,20,"#303b2de0","#ac956a",4);CozyUI.text(this,text,x+4,y+1,w-8,10,"#f0d7a0","center",18);};
                sign("REST",10,39,90);sign("STUDY",this.innerWidth-108,39,98);sign("WORKSHOP",this.innerWidth-92,this.innerHeight-26,82);
            }
            this.updateCampVisuals();
        }
        campFigure(npc,direction){
            const face=(npc.walkPortrait||npc.portrait)||{sheet:"Actor1",index:0},custom=face.sheet==="RPGManagerMonsters",bitmap=custom?managerArt("faces",face.sheet):managerArt("characters",face.sheet);
            if(!bitmap.isReady())return null;
            const key=`${face.sheet}:${face.index||0}:${face.columns||4}:${face.rows||2}:${direction}`;
            if(this._figureFrames.has(key))return this._figureFrames.get(key);
            const big=!custom&&ImageManager.isBigCharacter(face.sheet),sw=bitmap.width/(custom?(face.columns||4):big?3:12),sh=bitmap.height/(custom?(face.rows||2):big?4:8),row={2:0,4:1,6:2,8:3}[direction]||0;
            const sx=custom?(face.index%(face.columns||4))*sw:((big?0:face.index%4)*3+1)*sw,sy=custom?Math.floor(face.index/(face.columns||4))*sh:((big?0:Math.floor(face.index/4))*4+row)*sh;
            const figure=new Bitmap(128,112);figure.smooth=true;
            window.RPGManagerBattleStage.drawWalkingFrame(figure.context,bitmap._image||bitmap.canvas,sx,sy,sw,sh,42,30,44,66,1,{moving:false});figure.baseTexture.update();
            this._figureFrames.set(key,figure);return figure;
        }
        createCampVisual(){
            const root=new Sprite(),shadowBitmap=new Bitmap(60,16),shadow=new Sprite(shadowBitmap),figure=new Sprite(),labelBitmap=new Bitmap(80,25),label=new Sprite(labelBitmap),cueBitmap=new Bitmap(72,78),cue=new Sprite(cueBitmap);
            CozyUI.ellipse(shadowBitmap,30,8,23,6,"#283c2b66");shadow.anchor.set(.5,.5);shadow.x=22;shadow.y=66;
            figure.anchor.set(.5,96/112);figure.x=22;figure.y=66;figure.roundPixels=false;root.roundPixels=false;
            label.y=72;cue.y=-28;root.addChild(shadow,figure,cue,label);this._campLayer.addChild(root);
            return {root,shadow,shadowBitmap,figure,label,labelBitmap,cue,cueBitmap,labelKey:null,cueKey:null};
        }
        updateCampVisuals(){
            this.ensureCampLayers();
            for(const [id,v] of this._campVisuals)if(!this._campers.has(id)){v.root.destroy();v.shadowBitmap.destroy();v.labelBitmap.destroy();v.cueBitmap.destroy();this._campVisuals.delete(id);}
            this._hitRegions=[];
            for(const c of this._campers.values()){
                let v=this._campVisuals.get(c.npc.id);if(!v){v=this.createCampVisual();this._campVisuals.set(c.npc.id,v);}
                const npc=c.npc;
                v.root.x=c.x;v.root.y=c.y;const figure=this.campFigure(npc,c.direction);if(v.figure.bitmap!==figure)v.figure.bitmap=figure;v.figure.visible=!!figure;
                v.figure.x=22;v.figure.y=66;v.figure.rotation=0;
                const job=progression.campJobFor(this._state,npc.id)||"idle",hovered=this._hoverCamperId===npc.id,labelKey=hovered?`${npc.name}:${job}:hover`:`${npc.name}:${job}`;
                if(v.labelKey!==labelKey){v.labelKey=labelKey;const b=v.labelBitmap;b.clear();b.fontFace=this.contents.fontFace;CozyUI.round(b,0,0,80,25,hovered?"#4d6598":"#202d50eb",hovered?"#ffe3a4":null,4);b.textColor="#fff0d0";b.fontSize=11;b.drawText(npc.name.split(" ")[0],3,0,74,13,"center");b.textColor=hovered?"#fff0c7":"#d9c58e";b.fontSize=9;b.drawText(job==="work"?"WORKSHOP":job.toUpperCase(),3,13,74,12,"center");}
                v.label.x=Math.max(2,Math.min(this.innerWidth-82,c.x-23))-c.x;
                const animatedCue=job!=="idle"||npc.health<npc.maxHealth||npc.injury,cueKey=`${job}:${npc.health<npc.maxHealth}:${!!npc.injury}:${animatedCue?Math.floor(Graphics.frameCount/4):0}`;
                if(v.cueKey!==cueKey){v.cueKey=cueKey;const b=v.cueBitmap;b.clear();CozyUI.jobCue(b,job,0,28,Graphics.frameCount);b.fontSize=20;b.textColor="#91edac";if(npc.health<npc.maxHealth)b.drawText("+",8,6,24,26,"center");if(npc.injury){b.fontSize=9;b.textColor="#ffb0b0";b.drawText("+",5,23,14,14,"center");}}
                this._hitRegions.push({id:npc.id,rect:new Rectangle(c.x-18,c.y-8,82,110)});
            }
            this._fireSprite.x=this.innerWidth*.5;this._fireSprite.y=this.innerHeight*.52+12;
            if(this._fireFrame!==Math.floor(Graphics.frameCount/3)){this._fireFrame=Math.floor(Graphics.frameCount/3);const b=this._fireBitmap,t=Graphics.frameCount/8;b.clear();CozyUI.ellipse(b,32,60,22+Math.sin(t)*3,10,"#f59b3f66");for(let i=0;i<3;i++)CozyUI.ellipse(b,32+Math.sin(t+i*2)*5,52-i*4,7-i,10+Math.sin(t+i)*3,i===2?"#fff3ad":"#ffb542");}
        }
        destroy(options){
            for(const v of this._campVisuals.values()){v.shadowBitmap.destroy();v.labelBitmap.destroy();v.cueBitmap.destroy();}
            for(const bitmap of this._figureFrames.values())bitmap.destroy();if(this._fireBitmap)this._fireBitmap.destroy();super.destroy(options);
        }
        update() { super.update(); if (!this._state||!this.visible) return;this.updateCampers();if(this._campSceneryKey!==`${this.innerWidth}:${this.innerHeight}:${cozyCampArt.isReady()}`)this.refresh();else this.updateCampVisuals();if(typeof Point!=="undefined"){const p=this.worldTransform.applyInverse(new Point(TouchInput.x,TouchInput.y)),hit=this._hitRegions.find(entry=>entry.rect.contains(p.x-this.padding,p.y-this.padding));const hoverId=hit?.id||null;if(hoverId!==this._hoverCamperId){this._hoverCamperId=hoverId;this.updateCampVisuals();}if(this._selectHandler&&TouchInput.isTriggered()&&hit){SoundManager.playOk();this._selectHandler(hit.id);}} }
    }

    class Window_RPGCampRoster extends Window_RPGPanel {
        initialize(rect){super.initialize(rect);this._vacancyButtons=[];}
        contentsHeight(){return this.innerHeight;}
        setSelectHandler(handler){this._selectHandler=handler;}
        setState(state){this._state=state;this.refresh();}
        syncVacancyButtons(){
            const regions=(this._hitRegions||[]).filter(hit=>hit.menu==="recruit"),canvas=Graphics._canvas?.getBoundingClientRect(),scale=canvas?canvas.width/Graphics.width:1;
            while(this._vacancyButtons.length<regions.length){
                const button=document.createElement("button");button.type="button";button.className="camp-vacancy-button";button.textContent="";button.setAttribute("aria-label","Recruit a companion for this vacant slot");
                button.style.cssText="position:fixed;z-index:24;padding:0;border:0;border-radius:6px;background:transparent;cursor:pointer";
                button.onclick=event=>{event.preventDefault();event.stopPropagation();if(!managerDialog){SoundManager.playOk();this._menuHandler?.("recruit");}};
                for(const name of ["mousedown","mouseup","pointerdown","pointerup","keydown","keyup"])button.addEventListener(name,event=>event.stopPropagation());
                document.body.appendChild(button);this._vacancyButtons.push(button);
            }
            while(this._vacancyButtons.length>regions.length)this._vacancyButtons.pop().remove();
            this._vacancyButtons.forEach((button,index)=>{const rect=regions[index].rect;button.hidden=!canvas||!this.visible||!this.isOpen()||!!managerDialog;button.style.left=`${(canvas?.left||0)+(this.x+this.padding+rect.x)*scale}px`;button.style.top=`${(canvas?.top||0)+(this.y+this.padding+rect.y-this.origin.y)*scale}px`;button.style.width=`${rect.width*scale}px`;button.style.height=`${rect.height*scale}px`;});
        }
        syncRosterScroll(){
            if(!this._rosterScrollElement){
                const el=document.createElement("div"),spacer=document.createElement("div");el.id="camp-roster-scroll";el.setAttribute("aria-label","Scroll camp roster");el.tabIndex=0;
                el.style.cssText="position:fixed;z-index:22;overflow-y:scroll;overflow-x:hidden;scrollbar-color:#e8c583 #293754;border-radius:5px";
                el.appendChild(spacer);el.onscroll=()=>{this._rosterScroll=el.scrollTop/(this._rosterScale||1);this.origin.y=this._rosterScroll;};
                for(const event of ["mousedown","mouseup","touchstart","touchend","keydown","keyup","wheel"])el.addEventListener(event,e=>e.stopPropagation());
                document.body.appendChild(el);this._rosterScrollElement=el;
            }
            const el=this._rosterScrollElement,r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;this._rosterScale=scale;
            el.hidden=!this.visible||!this.isOpen()||this.contents.height<=this.innerHeight||!!managerDialog;
            el.style.left=(r.left+(this.x+this.width-16)*scale)+"px";el.style.top=(r.top+(this.y+this.padding)*scale)+"px";el.style.width=14*scale+"px";el.style.height=this.innerHeight*scale+"px";
            el.firstChild.style.height=this.contents.height*scale+"px";
            this._rosterScroll=Math.max(0,Math.min(this._rosterScroll||0,this.contents.height-this.innerHeight));el.scrollTop=this._rosterScroll*scale;this.origin.y=this._rosterScroll;
        }
        destroy(options){this._rosterScrollElement?.remove();for(const button of this._vacancyButtons||[])button.remove();this._vacancyButtons=[];super.destroy(options);}
        refresh(){
            if(!this._state)return;const s=this._state,w=this.innerWidth;this.contents.clear();this._hitRegions=[];
            CozyUI.text(this,`YOUR COMPANIONS / ${progression.activeRoster(s).length} OF 5`,8,4,w-16,15,"#e8c583","left",24);
            const slots=progression.activeSlotIds(s),row=Math.floor((this.innerHeight-38)/progression.MAX_ROSTER_SIZE);
            slots.forEach((id,i)=>{
                const npc=s.roster.find(n=>n.id===id),y=36+i*row;
                const focused=this._focusIndex===i,edge=focused?"#ffe3a4":npc?.injury?"#e9afa1":"#8da2c7";
                this.contents.gradientFillRect(9,y+3,w-18,row-11,focused?"#5875aa":"#3b5385",focused?"#293f72":"#223561",true);CozyUI.round(this.contents,6,y,w-12,row-5,null,edge,6);this.contents.fillRect(13,y+5,w-26,1,focused?"#fff3bd99":"#ffffff30");
                if(npc){
                    const condition=progression.conditionOf(npc),away=progression.isUnavailable(s,id);
                    CozyUI.portraitFrame(this,npc,13,y+10,32);
                    const emblemId=Object.prototype.hasOwnProperty.call(classEmblemIndex,npc.classId)?npc.classId:"barbarian",emblem=managerArt("pictures/ui/classes",`${emblemId}_v5_24.png`);
                    if(emblem.isReady()){
                        const scale=Math.min(22/Math.max(1,emblem.width),22/Math.max(1,emblem.height)),dw=Math.max(1,Math.round(emblem.width*scale)),dh=Math.max(1,Math.round(emblem.height*scale));
                        this.contents.blt(emblem,1,1,Math.max(1,emblem.width-2),Math.max(1,emblem.height-2),54+Math.floor((22-dw)/2),y+9+Math.floor((22-dh)/2),dw,dh);
                    }
                    CozyUI.text(this,progression.displayName(npc),82,y+5,w-94,17,"#f4e8cf","left",22);
                    const activity=away?"AWAY":`${condition.toUpperCase()} · ${(progression.campJobFor(s,id)||"Idle").toUpperCase()}`;
                    const prefix=`${progression.classLabel(npc)} · L${npc.level} · HP `,hp=`${npc.health}/${npc.maxHealth}`,suffix=` · ${activity}`,lineX=54,lineY=y+31,lineColor=npc.injury?"#ffc8ae":"#c8dfbc";CozyUI.text(this,prefix,lineX,lineY,w-66,12,lineColor,"left",17);const hpX=lineX+this.contents.measureTextWidth(prefix);CozyUI.text(this,hp,hpX,lineY,w-hpX-12,12,npc.health<npc.maxHealth?"#ffe36e":lineColor,"left",17);const suffixX=hpX+this.contents.measureTextWidth(hp);CozyUI.text(this,suffix,suffixX,lineY,w-suffixX-12,12,lineColor,"left",17);
                    this._hitRegions.push({id,rect:new Rectangle(6,y,w-12,row-5)});
                }else{
                    CozyUI.icon(this.contents,"recruit",14,y+12,26);
                    CozyUI.text(this,`Slot ${i+1}: EMPTY`,50,y+8,w-62,14,"#e8c583","left",20);
                    CozyUI.text(this,"Click to recruit for free",50,y+31,w-62,12,"#c6b99d","left",18);
                    this._hitRegions.push({menu:"recruit",rect:new Rectangle(6,y,w-12,row-5)});
                }
            });
            this.syncRosterScroll();this.syncVacancyButtons();
        }
        update(){super.update();if(this._state&&Graphics.frameCount%30===0)this.refresh();
            this.syncVacancyButtons();
            if(this._rosterScrollElement)this._rosterScrollElement.hidden=!this.visible||!this.isOpen()||this.contents.height<=this.innerHeight||!!managerDialog;
            if(this.visible&&this._state){const p=this.worldTransform.applyInverse(new Point(TouchInput.x,TouchInput.y));if(this.innerRect.contains(p.x,p.y)&&Math.abs(TouchInput.wheelY)>=20){this._rosterScroll=Math.max(0,Math.min((this._rosterScroll||0)+Math.sign(TouchInput.wheelY)*78,this.contents.height-this.innerHeight));this.syncRosterScroll();}}
            if(this.visible&&this._state&&(this._managerHoverX!==TouchInput.x||this._managerHoverY!==TouchInput.y)){this._managerHoverX=TouchInput.x;this._managerHoverY=TouchInput.y;const p=this.worldTransform.applyInverse(new Point(TouchInput.x,TouchInput.y)),hit=this.innerRect.contains(p.x,p.y)&&this._hitRegions?.find(r=>r.id&&r.rect.contains(p.x-this.padding,p.y-this.padding+this.origin.y)),index=hit?progression.activeSlotIds(this._state).indexOf(hit.id):-1;if(index>=0&&index!==this._focusIndex){this._focusIndex=index;this.refresh();}}
            if(this.visible&&this._selectHandler&&(TouchInput.isTriggered()||TouchInput.isClicked())){
                const p=this.worldTransform.applyInverse(new Point(TouchInput.x,TouchInput.y));const hit=this.innerRect.contains(p.x,p.y)&&this._hitRegions?.find(r=>r.rect.contains(p.x-this.padding,p.y-this.padding+this.origin.y));if(hit){if(hit.menu)this._menuHandler?.(hit.menu);else this._selectHandler(hit.id);}
            }
        }
    }
    class Window_RPGCampToggle extends Window_Command {
        initialize(rect){super.initialize(rect);this.deactivate();this.deselect();}
        updatePadding(){this.padding=4;}
        itemHeight(){return 28;}
        makeCommandList(){this.addCommand(this._open?"< Roster / Shift":"> Roster / Shift","toggle");}
        drawItem(index){const r=this.itemRect(index);CozyUI.round(this.contents,r.x,r.y,r.width,r.height,"#e8c583","#fff0c7",5);CozyUI.text(this,this.commandName(index),r.x+4,r.y+2,r.width-8,17,"#302b22","center",26);}
        update(){super.update();if(TouchInput.isTriggered()&&this.isTouchedInsideFrame())this.callHandler("toggle");}
    }
    class Window_RPGCampJobsSummary extends Window_RPGPanel {
        setState(state){this._state=state;this.refresh();}
        refresh(){
            this.contents.clear();this.line("LIFE AT CAMP",0,"#e8c583",20);CozyUI.text(this,"Small tasks, steady comforts",8,31,this.innerWidth-16,12,"#c6b99d");
            const descriptions={idle:"Taking a little breather",rest:"Full HP after 1 minute",work:"1-2 Gold / 2 minutes (physical classes: 2)",study:"1-2 Arcana / 2 minutes (scholars: 2)"};
            let y=58;for(const job of progression.CAMP_JOBS){const names=(this._state?.roster||[]).filter(n=>progression.living(n)&&!progression.isUnavailable(this._state,n.id)&&progression.campJobFor(this._state,n.id)===job).map(n=>n.name.split(" ")[0]);const color=job==="study"?"#c5ade4":job==="rest"?"#95cef0":job==="work"?"#e8c583":"#a6c797";
                CozyUI.round(this.contents,4,y,this.innerWidth-8,48,"#26365bdf","#736b4b",5);CozyUI.icon(this.contents,job==="study"?"arcana":job==="work"?"work":job==="rest"?"bathhouse":"campaign",12,y+7,18,color);
                CozyUI.text(this,`${job==="work"?"WORKSHOP":(job==="work"?"WORKSHOP":job.toUpperCase())}  /  ${names.length}`,38,y+4,this.innerWidth-48,13,color);CozyUI.text(this,names.join(", ")||descriptions[job],12,y+27,this.innerWidth-24,12,"#e4dbc2","left",17);y+=54;
            }
        }
    }

    // Reusable Stage 2-ready components. Dialogue advances only after explicit input.
    class Window_RPGLargePortrait extends Window_RPGPanel {
        setCharacter(npc) { this._npc = npc; this.contents.clear(); if (npc) portrait(this, npc, 8, 8, Math.min($dataRPGManagerUI?.portrait?.largeSize || 144, this.innerHeight - 16)); }
    }
    class Window_RPGDialogue extends Window_RPGPanel {
        initialize(rect) { super.initialize(rect); this.backOpacity = 252; }
        setDialogue(speaker, text, onAdvance = null) {
            this._onAdvance = onAdvance; this._waiting = true; this._speaker = speaker; this._text = text; this.contents.clear();
            this.contents.fillRect(0, 0, this.innerWidth, this.innerHeight, "#091018");
            this.contents.strokeRect(1, 1, this.innerWidth - 2, this.innerHeight - 2, "#d7b56d");
            this.contents.strokeRect(5, 5, this.innerWidth - 10, this.innerHeight - 10, "#4f7082");
            this.line(speaker || "Narration", 0, "#d7b56d", $dataRPGManagerUI?.dialogue?.fontSize || 24);
            this.wrapped(text, 38);
            const x = this.innerWidth - 52, y = this.innerHeight - 45;
            this.contents.fillRect(x, y, 40, 32, "#d7b56d"); this.contents.strokeRect(x, y, 40, 32, "#ffffff");
            this.changeTextColor("#091018"); this.contents.fontSize = 24; this.drawText("▶", x, y - 1, 40, "center");
        }
        update() {
            super.update();
            if (this._waiting && (Input.isTriggered("ok") || TouchInput.isTriggered())) { this._waiting = false; SoundManager.playOk(); if (this._onAdvance) this._onAdvance(); }
        }
        isWaiting() { return !!this._waiting; }
    }

    // Reusable presentation for every consequential check. The result is already
    // seeded; the player's click only begins the reveal animation.
    class Window_RPGD20 extends Window_Command {
        initialize(rect, check, title, done) {
            this._check = check; this._title = title || "D20 CHECK"; this._done = done;
            this._rolling = false; this._resolved = false; this._started = 0; this._face = 20; this._autoStart = this._title === "DEATH SAVE";
            super.initialize(rect); this.setHandler("roll", this.roll.bind(this)); this.select(0); this.activate();
        }
        maxCols() { return 1; }
        makeCommandList() { this.addCommand(this._resolved ? "CONTINUE" : "ROLL D20", "roll"); }
        itemHeight() { return 72; }
        roll() {
            if (this._resolved) { const done = this._done; this._done = null; if (done) done(this._check); return; }
            if (this._rolling) return;
            this._rolling = true; this._started = performance.now(); this.deactivate(); SoundManager.playOk();
        }
        update() {
            super.update();
            if (this._autoStart && !this._rolling && !this._resolved) { this._autoStart = false; this.roll(); }
            if (this._title === "DEATH SAVE" && this._resolved && this._resolvedAt && performance.now() - this._resolvedAt > 1100) { this._resolvedAt = 0; this.roll(); return; }
            if (!this._rolling) return;
            const elapsed = performance.now() - this._started;
            this._face = 1 + Math.floor(elapsed / 45) % 20; this.refresh();
            if (elapsed >= 700) { this._rolling = false; this._resolved = true; this._resolvedAt = performance.now(); this._face = this._check.raw; this.refresh(); this.activate(); }
        }
        drawAllItems() {
            this.contents.clear();
            const c = this._check, hidden = c.hiddenDC;
            this.contents.fontBold = true; this.contents.fontSize = 22; this.changeTextColor("#d7b56d");
            this.drawText(this._title, 0, 0, this.innerWidth, "center");
            this.contents.fontSize = this._resolved ? 52 : 38;
            this.changeTextColor(this._resolved && c.natural20 ? "#ffe36d" : this._resolved && c.natural1 ? "#ff8b8b" : "#ffffff");
            this.drawText(this._rolling ? `d20  ${this._face}` : this._resolved ? String(c.raw) : "◆ d20 ◆", 0, 34, this.innerWidth, "center");
            this.contents.fontBold = false; this.contents.fontSize = 17; this.resetTextColor();
            const dc = hidden ? "DC ???" : `DC ${c.dc}`;
            this.drawText(`${c.actorName || "Party"}  |  ${dc}`, 0, 92, this.innerWidth, "center");
            if (this._resolved) {
                const mods = c.modifiers.map(m => `${m.value >= 0 ? "+" : ""}${m.value} ${m.source}`).join("   ") || "No modifier";
                this.drawText(mods, 0, 120, this.innerWidth, "center");
                const label = c.natural20 ? "★ NATURAL 20 ★" : c.natural1 ? "✕ NATURAL 1 — CRITICAL FAILURE ✕" :
                    !c.revealOutcome ? `TOTAL ${c.total} — OUTCOME HIDDEN` : `TOTAL ${c.total} — ${c.success ? "SUCCESS" : "FAILURE"}`;
                this.contents.fontBold = true; this.contents.fontSize = c.natural1 || c.natural20 ? 25 : 21;
                this.drawText(label, 0, 148, this.innerWidth, "center");
            }
            const rect = this.itemRect(0); rect.y = this.innerHeight - 72;
            this.contents.fillRect(rect.x + 20, rect.y + 5, rect.width - 40, 56, this._resolved ? "#274d3b" : "#315d78");
            this.contents.fontSize = 24; this.changeTextColor("#ffffff");
            this.drawText(this._resolved ? "CONTINUE" : "ROLL D20", rect.x, rect.y + 11, rect.width, "center");
        }
        itemRect() { return new Rectangle(0, this.innerHeight - 72, this.innerWidth, 72); }
    }

    class Window_RPGDetails extends Window_RPGPanel {
        setNpc(npc) {
            this.contents.clear();if(!npc){this.setLines(["REMEMBERED WITH LOVE","No fallen adventurers."]);return;}
            const w=this.innerWidth,career=progression.ensureCareer(npc);CozyUI.portraitFrame(this,npc,11,7,88);
            this.contents.fontFace=`Georgia, ${$gameSystem.mainFontFace()}`;CozyUI.text(this,progression.displayName(npc),115,0,w-123,24,"#f4deb0","left",30);this.contents.fontFace=`Trebuchet MS, ${$gameSystem.mainFontFace()}`;
            CozyUI.text(this,`${progression.classLabel(npc)} / Level ${npc.level}`,115,32,w-123,15,"#c6b99d");
            const xpMax=progression.xpRequired(npc);CozyUI.text(this,xpMax?`XP ${npc.xp}/${xpMax}`:`LEVEL ${progression.LEVEL_CAP} / MAX`,115,56,w-123,13,"#b8cea5","left",18);this.contents.fillRect(115,78,w-130,3,"#5e6047");this.contents.fillRect(115,78,(w-130)*Math.min(1,npc.xp/Math.max(1,xpMax)),3,"#a6c797");
            CozyUI.text(this,npc.alive?(npc.injury||"Healthy / ready for adventure"):npc.reanimationExhausted?"FALLEN / permanently barred from reanimation":"FALLEN / remembered at the guild",115,85,w-123,12,npc.alive?"#b8cea5":"#e9afa1","left",17);
            this.rule(108);
            const leadership=["","Unproven","Steady","Capable","Strong","Exceptional"][npc.leadership]||"Unproven",traits=(npc.personalityTraits||[]).map(id=>progression.traitFor(id)?.name).filter(Boolean),descriptions=(npc.personalityTraits||[]).map(id=>progression.traitFor(id)?.description).filter(Boolean),baseDodge=Math.round(npc.dodgeChance*100);
            CozyUI.text(this,`Signature: ${progression.moveFor(npc)?.name||npc.signatureAttack} / ${npc.passiveTrait.name}`,8,116,w-16,14,"#c5ade4");
            CozyUI.text(this,`HP ${npc.health}/${npc.maxHealth} / Class Armor ${npc.classArmor}/${npc.classArmorMax} / Ward ${npc.innateWardMax}`,8,142,w-16,16,"#c6d5bc");
            CozyUI.text(this,`Crit ${Math.round(npc.critChance*100)}% (double damage) / Dodge ${baseDodge}%`,8,167,w-16,16,"#e8c583");
            CozyUI.text(this,"Defense: class growth, rituals, and expedition preparation",8,232,w-16,12,"#d8ccb2");
            CozyUI.text(this,`${career.questsCompleted} adventures / ${career.victories} victories / ${career.bossVictories} bosses`,8,285,w-16,14,"#e8c583");
            CozyUI.text(this,`${career.kills} kills / ${career.damageDealt} damage / ${career.signatureUses} signatures / ${career.injuriesSuffered} injuries`,8,310,w-16,12,"#c6b99d");
            const earned=(npc.earnedTraits||[]).map(id=>progression.EARNED_TRAITS.find(t=>t.id===id)?.name||id),wounds=(npc.permanentWounds||[]).map(id=>progression.WOUND_DEFINITIONS.find(t=>t.id===id)?.name||id);
            CozyUI.text(this,`Wounded traits: ${wounds.join(", ")||"None"}${npc.lastingInjuries?` / ${npc.lastingInjuries} lasting injuries (-${npc.lastingInjuries*2}pp Dodge; 3% slower initiative per stack)`:""}`,8,354,w-16,12,"#e9b5a3");
            CozyUI.text(this,`Recent: ${career.lastQuest?`${career.lastQuest.questName} / ${career.lastQuest.result}`:"No recorded adventure"}`,8,375,w-16,12,"#c6b99d","left",18);
        }
    }

    class Window_RPGHomeCommands extends Window_Command {
        initialize(rect,campFirst=false){this._campFirst=campFirst;super.initialize(rect);}
        itemHeight() { return this._campFirst?30:48; }
        lineHeight(){return this._campFirst?28:36;}
        maxCols() { return this._campFirst?Math.max(1,Math.ceil((this._list?.length||8)/2)):2; }
        itemRect(index){const rect=super.itemRect(index);if(this._campFirst){const cols=this.maxCols(),row=Math.floor(index/cols),count=Math.min(cols,this.maxItems()-row*cols),width=this.innerWidth/count;rect.x=(index%cols)*width+this.colSpacing()/2;rect.width=width-this.colSpacing();}return rect;}
        makeCommandList() {
            const locations = ($dataRPGManagerUI?.hamlet?.locations || []).filter(p=>!["roster","bathhouse","repair","campaign","presentationSpeed"].includes(p.symbol));
            for (const place of locations) {
                const questAvailable = !managerState().questResults && !progression.teamError(managerState());
                this.addCommand(`${place.name}\n${place.caption}`, place.symbol, place.symbol !== "battle" || questAvailable, place);
            }
            // DEVELOPMENT CONTRACT: keep DEBUG available throughout development; release builds may disable developerMode.
            if ($dataRPGManagerUI?.developerMode) this.addCommand("DEBUG", "debug");
            this.addCommand("Save", "save");
            
        }

        resetFontSettings() {
            super.resetFontSettings();
            this.contents.fontSize = 22;
        }

        drawItem(index) {
            const rect = this.itemLineRect(index), data = this._list[index], place = data?.ext;
            CozyUI.round(this.contents,rect.x+2,rect.y+1,rect.width-4,rect.height-2,this.isCommandEnabled(index)?"#354c80":"#27314c",this.isCommandEnabled(index)?"#c6ae65":"#68728b",5);
            this.changePaintOpacity(this.isCommandEnabled(index));
            CozyUI.icon(this.contents,data.symbol,rect.x+3,rect.y+(this._campFirst?3:5),this._campFirst?17:24,this.isCommandEnabled(index)?data.symbol==="battle"?"#b8d59c":"#e8c583":"#8c8c79");
            const x = rect.x + (this._campFirst?25:36), parts = String(data?.name || "").split("\n");
            this.changeTextColor(this.isCommandEnabled(index)?"#f4e8cf":"#aaa68e");
            this.contents.fontSize = this._campFirst?15:place?19:17; this.drawText(parts[0], x, rect.y - (this._campFirst?1:4), rect.width - (x - rect.x));
            if (parts[1]&&!this._campFirst) { this.contents.fontSize = 12; this.changeTextColor("#cbbf9e"); this.drawText(parts[1], x, rect.y + 18, rect.width - (x - rect.x)); this.resetTextColor(); }
        }

        processOk() {
            if (!this.isCurrentItemEnabled() && this.onBlocked) this.onBlocked();
            super.processOk();
        }
    }

    class Window_RPGRoster extends Window_Command {
        initialize(rect, selecting, draft, graveyard = false) {
            this._selecting = selecting;
            this._draft = draft;
            this._graveyard = graveyard;
            super.initialize(rect);
        }

        lineHeight() { return 28; }
        itemHeight() { return 40; }
        itemTextAlign() { return "left"; }

        resetFontSettings() {
            super.resetFontSettings();
            this.contents.fontSize = 20;
        }

        makeCommandList() {

            for (const npc of progression.sortRoster(this._graveyard?progression.graveyard(managerState()):roster(), Window_RPGRoster.sortMode || "healthy")) {
                if (this._graveyard ? npc.alive : !isLiving(npc)) continue;
                const selected = this._draft.includes(npc.id);
                const mark = this._selecting ? (selected ? "[x] " : "[ ] ") : "";
                const otherTeam = managerState().activeTeam === "A" ? "B" : "A";
                const assignedElsewhere = this._selecting && !!progression.tripForTeam(managerState(), otherTeam) && managerState().teams[otherTeam].includes(npc.id);
                const status = this._graveyard ? " (fallen)" : assignedElsewhere ? ` (TEAM ${otherTeam})` : progression.isUnavailable(managerState(), npc.id) ? " (AWAY)" : (npc.injury ? " (wounded)" : "");
                const enabled = !this._selecting || selected || (isLiving(npc) && !assignedElsewhere && !progression.isUnavailable(managerState(), npc.id) && this._draft.length < MAX_TEAM_SIZE);
                this.addCommand(`${mark}${npc.name}${status}`, "npc", enabled, npc.id);
            }
            if (this._selecting) {
                this.addCommand(`Confirm Team (${this._draft.length}/5)`, "confirm", !validateTeam(this._draft));
            }
            if(!this._selecting)for(const slot of progression.vacantSlots(managerState()))this.addCommand(`Slot ${slot+1}: EMPTY · Recruit for free`,"tavern",true,slot);
            this.addCommand(this._selecting ? "Cancel Changes" : "Back to Home", "back");paginateCommands(this);
        }

        drawItem(index){
            const r=this.itemRect(index),entry=this._list[index],npc=entry.symbol==="npc"?findNpc(entry.ext):null;this.changePaintOpacity(this.isCommandEnabled(index));
            if(npc){CozyUI.portraitFrame(this,npc,r.x+7,r.y+6,27);CozyUI.text(this,entry.name,r.x+44,r.y+1,r.width-50,16,"#f4e8cf","left",21);const prefix=`L${npc.level} / ${progression.identityLabel(npc)} / HP `,hp=`${npc.health}/${npc.maxHealth}`;CozyUI.text(this,prefix,r.x+44,r.y+23,r.width-50,11,"#bfb99b","left",15);CozyUI.text(this,hp,r.x+44+this.contents.measureTextWidth(prefix),r.y+23,r.width-50,11,npc.health<npc.maxHealth?"#ffe36e":"#bfb99b","left",15);}
            else CozyUI.text(this,entry.name,r.x+9,r.y+5,r.width-18,15,"#e8c583","left",28);
            this.changePaintOpacity(true);
        }

        select(index) {
            super.select(index);
            if (this.onSelectionChange) this.onSelectionChange();
        }

        processOk() {
            if(handleCommandPage(this))return;
            if (!this.isCurrentItemEnabled() && this.onBlocked) this.onBlocked();
            super.processOk();
        }
    }

    let managerDialog=null,exitSaving=false;
    function fitMobileDialog(el){
        if(!mobilePortraitAtBoot)return;
        const view=globalThis.visualViewport||{width:innerWidth,height:innerHeight,offsetLeft:0,offsetTop:0};
        Object.assign(el.style,{left:`${view.offsetLeft+view.width/2}px`,top:`${view.offsetTop+view.height/2}px`,width:`${Math.max(280,view.width-16)}px`,maxHeight:`${Math.max(240,view.height-16)}px`,overflowY:"auto"});
    }
    function closeManagerDialog(){if(managerDialog){managerDialog.element.remove();managerDialog=null;Input.clear();TouchInput.clear();}}
    function managerModal(title,lines,actions,cancel){
        if(managerDialog)return managerDialog;
        const el=document.createElement("section");el.id="manager-confirmation";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label",title);
        el.style.cssText="position:fixed;z-index:100;top:50%;left:50%;transform:translate(-50%,-50%);width:min(660px,86vw);max-height:calc(100vh - 24px);overflow:hidden;box-sizing:border-box;background:linear-gradient(145deg,#fff0ce,#dfc694);color:#2b2647;padding:18px;border:4px solid #bd9655;border-radius:16px;box-shadow:inset 0 0 0 2px #fff6d6,inset 0 -12px 30px #8a5f2630,0 12px 35px #090d1fbb,0 0 0 100vmax #130c26b8;font:16px Trebuchet MS,sans-serif";
        fitMobileDialog(el);
        const heading=document.createElement("h2");heading.textContent=title;heading.style.cssText="margin:0 0 12px;padding:0 40px 9px;text-align:center;font:700 25px Georgia;color:#3b3150;border-bottom:1px solid #a88043;text-shadow:0 1px #fff7df";el.appendChild(heading);
        for(const line of lines){const p=document.createElement("p");p.textContent=line;p.style.margin="8px 0";el.appendChild(p);}
        const error=document.createElement("p");error.setAttribute("role","alert");error.style.color="#9b2637";el.appendChild(error);
        const buttons=actions.map(action=>{const b=document.createElement("button");b.textContent=action.name;b.style.cssText="font:inherit;font-weight:bold;padding:12px 16px;margin:5px;border:1px solid #9eb2dd;border-bottom:4px solid #14264d;border-radius:8px;background:linear-gradient(#5575b0,#294174 60%,#20345f);color:#fff0cb;box-shadow:inset 0 2px #ffffff42,0 3px 6px #22172b55;cursor:pointer;transition:transform .08s ease";b.onpointerdown=()=>b.style.transform="translateY(3px)";b.onpointerup=b.onpointerleave=()=>b.style.transform="translateY(0)";b.onclick=action.run;el.appendChild(b);return b;});
        for(const name of ["mousedown","mouseup","touchstart","touchend","wheel","keydown","keyup"])el.addEventListener(name,e=>e.stopPropagation());
        el.addEventListener("keydown",e=>{if(e.key==="Tab"){e.preventDefault();const enabled=buttons.filter(b=>!b.disabled),index=enabled.indexOf(document.activeElement);enabled[(index+(e.shiftKey?enabled.length-1:1))%enabled.length]?.focus();}if(e.key==="Escape"){e.preventDefault();if(!exitSaving)cancel();}if(["ArrowLeft","ArrowRight"].includes(e.key)){e.preventDefault();const index=buttons.indexOf(document.activeElement);buttons[(index+(e.key==="ArrowRight"?1:buttons.length-1))%buttons.length].focus();}});
        document.body.appendChild(el);enableMobileTapSafety(el);managerDialog={element:el,error,buttons,cancel};buttons[buttons.length-1].focus();Input.clear();TouchInput.clear();return managerDialog;
    }
    let manualOverlay=null,manualLastTopic="getting-started";
    function closeManual(enlargedOnly=false){
        if(!manualOverlay)return;
        const zoom=manualOverlay.querySelector(".manual-zoom");if(enlargedOnly&&zoom){zoom.remove();return;}
        const opener=manualOverlay._opener;manualOverlay.remove();manualOverlay=null;Input.clear();TouchInput.clear();opener?.focus();
    }
    function showManual(opener){
        if(manualOverlay){manualOverlay.querySelector(".manual-close")?.focus();return;}
        const topics=$dataRPGManagerManual?.topics||[],images=new Map(($dataRPGManagerManualImages?.images||[]).map(row=>[row.id,row]));
        const root=document.createElement("section");manualOverlay=root;root._opener=opener;root.id="rpg-how-to-play";root.setAttribute("role","dialog");root.setAttribute("aria-modal","true");root.setAttribute("aria-labelledby","manual-title");
        root.innerHTML='<div class="manual-shell"><header><h2 id="manual-title">How to Play</h2><button class="manual-close" type="button" aria-label="Close How to Play">×</button></header><nav class="manual-tabs" aria-label="Manual topics"></nav><main class="manual-content" tabindex="0"></main></div>';
        const style=document.createElement("style");style.textContent='#rpg-how-to-play{position:fixed;z-index:120;inset:0;background:#100b22d9;display:grid;place-items:center;font:16px Trebuchet MS;color:#2e2845}#rpg-how-to-play .manual-shell{width:min(94vw,900px);height:min(92vh,680px);box-sizing:border-box;display:grid;grid-template-rows:auto auto 1fr;background:linear-gradient(145deg,#fff2d3,#d8bb82);border:4px solid #c69c4d;border-radius:18px;box-shadow:inset 0 0 0 2px #fff8dc,0 18px 55px #000c;overflow:hidden}#rpg-how-to-play header{display:flex;align-items:center;padding:9px 14px;border-bottom:1px solid #a57b3d}#rpg-how-to-play h2{font:700 27px Georgia;margin:0;flex:1;text-align:center}#rpg-how-to-play button{font:700 15px Trebuchet MS;cursor:pointer}#rpg-how-to-play button:focus-visible{outline:3px solid #4f78bf;outline-offset:2px}.manual-close{width:44px;height:44px;border-radius:50%;border:2px solid #8a5d2e;background:#3c315a;color:#fff3cc;font-size:28px!important}.manual-tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;padding:7px 10px;background:#3b3057}.manual-tabs button{min-height:44px;border:1px solid #aebde0;border-bottom:4px solid #15264c;border-radius:8px;background:#365487;color:#fff1ce}.manual-tabs button[aria-selected=true]{background:#e8c583;color:#302248;border-color:#fff0b9}.manual-content{overflow-y:auto;padding:14px 18px;outline:none}.manual-page{display:grid;grid-template-columns:minmax(270px,46%) 1fr;gap:18px;align-items:start}.manual-visual{margin:0;background:#25375f;border:3px solid #8b6b39;border-radius:10px;padding:6px;color:#fff1ce}.manual-visual img{display:block;width:100%;max-height:330px;object-fit:contain;image-rendering:auto;cursor:zoom-in}.manual-visual figcaption{font-size:13px;padding:6px 3px 1px}.manual-copy h3{font:700 24px Georgia;margin:0 0 8px}.manual-copy p,.manual-copy li{line-height:1.38;margin:0 0 8px}.manual-copy ul{padding-left:20px}.manual-zoom{position:fixed;z-index:2;inset:0;background:#0b081ceF;display:grid;place-items:center;padding:4vw}.manual-zoom img{max-width:90vw;max-height:82vh}.manual-zoom button{position:absolute;right:3vw;top:3vh;width:48px;height:48px;border-radius:50%;font-size:26px;background:#fff0ce}.manual-fallback{min-height:220px;display:grid;place-items:center;text-align:center;padding:20px}@media(max-width:700px){.manual-tabs{grid-template-columns:1fr}.manual-tabs button{min-height:36px}.manual-page{grid-template-columns:1fr}.manual-visual img{max-height:210px}}';root.appendChild(style);
        const tabs=root.querySelector(".manual-tabs"),content=root.querySelector(".manual-content");
        const render=id=>{
            const topic=topics.find(row=>row.id===id)||topics[0];if(!topic)return;
            manualLastTopic=topic.id;
            for(const b of tabs.children)b.setAttribute("aria-selected",String(b.dataset.id===topic.id));
            const image=images.get(topic.imageIds?.[0]);
            // RPG Maker MZ's bundled NW.js predates the newer child-replacement API.
            // Clear explicitly so the first topic renders instead of raising a fatal error.
            while(content.firstChild)content.removeChild(content.firstChild);
            const page=document.createElement("article");page.className="manual-page";
            const figure=document.createElement("figure");figure.className="manual-visual";
            const img=document.createElement("img");img.src=image?.path||"";img.alt=image?.alt||topic.title;img.loading="lazy";
            const fallback=document.createElement("div");fallback.className="manual-fallback";fallback.textContent=`Visual unavailable. ${image?.caption||"Use the live labels and instructions beside it."}`;fallback.hidden=true;
            img.onerror=()=>{img.hidden=true;fallback.hidden=false;};
            img.onclick=()=>{const zoom=document.createElement("div");zoom.className="manual-zoom";zoom.innerHTML=`<button type="button" aria-label="Close enlarged image">×</button><img alt="${img.alt.replace(/"/g,"&quot;")}">`;zoom.querySelector("img").src=img.src;zoom.querySelector("button").onclick=()=>zoom.remove();root.appendChild(zoom);zoom.querySelector("button").focus();};
            const caption=document.createElement("figcaption");caption.textContent=image?.caption||"";
            figure.appendChild(img);figure.appendChild(fallback);figure.appendChild(caption);
            const copy=document.createElement("div");copy.className="manual-copy";const heading=document.createElement("h3");heading.textContent=topic.title;copy.appendChild(heading);
            for(const block of topic.blocks||[]){const el=document.createElement(block.type==="list"?"ul":"p");if(block.type==="list")for(const item of block.items||[]){const li=document.createElement("li");li.textContent=item;el.appendChild(li);}else el.textContent=block.text;copy.appendChild(el);}
            page.appendChild(figure);page.appendChild(copy);content.appendChild(page);content.scrollTop=0;
        };
        for(const topic of topics){const b=document.createElement("button");b.type="button";b.dataset.id=topic.id;b.textContent=topic.tab;b.setAttribute("role","tab");b.onclick=()=>render(topic.id);tabs.appendChild(b);}root.querySelector(".manual-close").onclick=()=>closeManual();root.addEventListener("pointerdown",e=>e.stopPropagation(),true);root.addEventListener("pointerup",e=>e.stopPropagation(),true);root.addEventListener("wheel",e=>e.stopPropagation(),true);root.addEventListener("keydown",e=>{e.stopPropagation();if(e.key==="Escape"){e.preventDefault();closeManual(true);}if(e.key==="Tab"){const focusable=[...root.querySelectorAll("button,[tabindex='0']")].filter(n=>n.offsetParent!==null),i=focusable.indexOf(document.activeElement);if((e.shiftKey&&i===0)||(!e.shiftKey&&i===focusable.length-1)){e.preventDefault();focusable[e.shiftKey?focusable.length-1:0].focus();}}},true);document.body.appendChild(root);enableMobileTapSafety(root);render(manualLastTopic);root.querySelector(".manual-close").focus();Input.clear();TouchInput.clear();
    }
    function mountManualButton(scene){
        document.getElementById("how-to-play-button")?.remove();const rect=Graphics._canvas.getBoundingClientRect(),scale=rect.width/Graphics.width,b=document.createElement("button");b.id="how-to-play-button";b.type="button";b.title="How to Play";b.setAttribute("aria-label","How to Play");b.append(fantasyMenuIconElement("help",40));b.style.cssText=`position:fixed;z-index:35;left:${rect.right-68*scale}px;top:${rect.top+18*scale}px;width:${52*scale}px;height:${52*scale}px;display:flex;align-items:center;justify-content:center;padding:0;border:${2*scale}px solid #fff0b9;border-bottom-width:${5*scale}px;border-radius:50%;background:radial-gradient(circle at 40% 30%,#fff0a8,#bd812d);box-shadow:0 ${4*scale}px ${10*scale}px #0008;cursor:pointer`;b.onclick=()=>showManual(b);for(const e of ["mousedown","mouseup","pointerdown","pointerup","keydown","keyup"])b.addEventListener(e,event=>event.stopPropagation());document.body.appendChild(b);scene._manualButton=b;
    }
    function showCampTimerDialog(){
        if(managerDialog||managerState().trips?.A)return;
        const state=managerState(),cancel=()=>closeManagerDialog();let minutes;
        const actions=[{name:"Start timer",run:()=>{const result=progression.startCampTimer(state,minutes.value);if(!result.ok){managerDialog.error.textContent=result.message;return;}closeManagerDialog();refreshFocusTimer(true);}}];
        if(state.campTimer?.active)actions.push({name:"Stop timer",run:()=>{state.campTimer.active=false;state.campTimer.pendingBell=false;state.campTimer.remainingMs=0;closeManagerDialog();refreshFocusTimer(true);}});
        actions.push({name:"Cancel",run:cancel});
        const modal=managerModal("Camp timer",["Choose any positive number of minutes. A bell rings at zero.","The timer runs while navigating or minimized, and stops when a quest starts."],actions,cancel);
        const label=document.createElement("label");label.textContent="Minutes ";minutes=document.createElement("input");minutes.type="number";minutes.min="0.001";minutes.step="any";minutes.value=String(state.campTimer?.totalMs/60000||25);minutes.setAttribute("aria-label","Timer minutes");minutes.style.cssText="font:inherit;padding:8px;width:160px";label.appendChild(minutes);modal.element.insertBefore(label,modal.error);minutes.focus();minutes.select();
    }
    function showQuestPartySelection(scene,quest){
        const state=managerState(),members=progression.activeRoster(state),selected=new Set((state.teamIds||[]).filter(id=>members.some(n=>n.id===id)).slice(0,3));
        const cancel=()=>{closeManagerDialog();scene._choices?.activate?.();};
        const modal=managerModal("Choose one to three companions",[],[{name:"Review Party",run:()=>{
            const ids=members.filter(n=>selected.has(n.id)).map(n=>n.id),error=progression.teamError(state,ids);
            if(error){modal.error.textContent=error;return;}
            closeManagerDialog();showQuestConfirmation(scene,quest,ids);
        }},{name:"Cancel",run:cancel}],cancel);
        modal.element.id="quest-party-selection";modal.element.style.overflowY="auto";fitMobileDialog(modal.element);
        const content=document.createElement("div"),count=document.createElement("p"),grid=document.createElement("div");
        modal.element.insertBefore(content,modal.error);content.append(count,grid);
        grid.style.cssText="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px";
        const cards=[];
        const refresh=()=>{const average=selected.size?(members.filter(n=>selected.has(n.id)).reduce((sum,n)=>sum+n.level,0)/selected.size).toFixed(1):"–";count.textContent=`${selected.size} / 3 selected · Average level ${average}`;modal.buttons[0].disabled=selected.size<1||selected.size>3;modal.buttons[0].style.opacity=selected.size>=1&&selected.size<=3?"1":".5";for(const {card,id} of cards){const chosen=selected.has(id);card.setAttribute("aria-pressed",String(chosen));card.style.borderColor=chosen?"#b58225":"#aa9772";card.style.background=chosen?"#e8c583":"#e3d1ab";}};
        for(let i=0;i<5;i++){
            const n=members[i],card=document.createElement("button");card.type="button";
            card.style.cssText=`grid-column:${i<2?2+i*2:1+(i-2)*2}/span 2;grid-row:${i<2?1:2};padding:8px 4px;border:3px solid #aa9772;border-radius:8px;color:#302248;font:14px Trebuchet MS;cursor:pointer;min-width:0`;
            if(n){
                card.dataset.memberId=n.id;card.setAttribute("aria-label",`Select ${n.name}`);
                const face=n.portrait,cols=face.columns||4,rows=face.rows||2,portrait=document.createElement("div");
                portrait.style.cssText=`width:48px;height:48px;margin:0 auto 4px;image-rendering:pixelated;background-repeat:no-repeat;background-image:url('img/faces/${managerImageFile(face.sheet)}');background-size:${cols*48}px ${rows*48}px;background-position:-${face.index%cols*48}px -${Math.floor(face.index/cols)*48}px;border-radius:5px`;card.appendChild(portrait);
                const classLine=document.createElement("div");classLine.style.cssText="display:flex;align-items:center;justify-content:center;gap:5px;min-height:28px";classLine.append(classEmblemElement(n.classId,24));const className=document.createElement("strong");className.textContent=`${progression.classLabel(n)} · LVL.${n.level}`;classLine.appendChild(className);card.appendChild(classLine);
                for(const text of [n.name,`HP ${n.health}/${n.maxHealth}`,`Armor ${n.classArmor+progression.equipmentArmor(n)}`,`Ward ${(n.innateWard||0)+(n.temporaryWard||0)}`]){const label=document.createElement("div");label.textContent=text;label.style.cssText="line-height:19px;overflow-wrap:anywhere";card.appendChild(label);}
                card.onclick=()=>{if(selected.has(n.id))selected.delete(n.id);else if(selected.size<3)selected.add(n.id);else{modal.error.textContent="Deselect a companion before choosing another.";return;}modal.error.textContent="";refresh();};
                cards.push({card,id:n.id});
            }else{card.textContent="Empty roster slot";card.disabled=true;card.style.opacity=".5";}
            grid.appendChild(card);
        }
        // Keep the modal's keyboard focus loop aware of the selectable profile cards.
        modal.buttons.splice(1,0,...cards.map(n=>n.card));
        refresh();
    }
    function showQuestConfirmation(scene,quest,partyIds=managerState().teamIds.slice()){
        if(managerState().trips.A)return;
        const selectedUpgrades=new Set((managerState().preparation?.upgradeIds||[]).filter(id=>progression.EXPEDITION_UPGRADES[id]));
        const cancel=()=>{closeManagerDialog();scene._choices?.activate?.();};
        const modal=managerModal("Confirm expedition",[],[{name:"Start",run:()=>{try{const state=managerState();if(state.trips.A)throw Error("An expedition is already active.");state.selectedQuestId=quest.id;progression.dispatchQuest(state,"A",quest,$dataRPGManagerQuests.xp,Date.now(),null,"standard",null,null,partyIds,[...selectedUpgrades]);mobileScreenWakeLock.request();closeManagerDialog();SceneManager.goto(Scene_RPGHome);}catch(error){managerDialog.error.textContent=error.message;}}},{name:"Cancel",run:cancel}],cancel),content=document.createElement("div");content.id="embark-summary";modal.element.insertBefore(content,modal.error);modal.element.querySelector("h2").style.cssText="font-size:23px;margin:0 0 10px";modal.error.style.margin="6px 0";
        const line=(text,bold=false)=>{const p=document.createElement(bold?"strong":"p");p.textContent=text;p.style.cssText="display:block;margin:8px 0;line-height:1.35";content.appendChild(p);return p;};
        const riskWarning=line("",true);riskWarning.style.display="none";
        const upgrades=document.createElement("fieldset");upgrades.style.cssText="border:1px solid #b99c64;margin:10px 0;padding:8px";const legend=document.createElement("legend");legend.textContent="Expedition equipment (select any you can afford)";upgrades.appendChild(legend);content.appendChild(upgrades);const costLabel=document.createElement("div"),boonGrid=document.createElement("div");boonGrid.style.cssText="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px";upgrades.appendChild(boonGrid);const boonCards=[];
        const refreshUpgrades=()=>{const chosenIds=[...selectedUpgrades],cost=chosenIds.reduce((sum,id)=>sum+progression.EXPEDITION_UPGRADES[id].cost,0);costLabel.textContent=`Selected: ${selectedUpgrades.size} · Cost ${cost} Gold · Treasury ${managerState().gold}`;modal.buttons[0].disabled=!!progression.upgradeSelectionError(managerState(),chosenIds);for(const {id,card} of boonCards){const chosen=selectedUpgrades.has(id);card.disabled=false;card.style.filter="none";card.style.opacity="1";card.style.background=chosen?"linear-gradient(#bdf4b4,#54a966)":"linear-gradient(#fff0c9,#cda960)";card.style.borderColor=chosen?"#eaffd9":"#8d7950";card.style.boxShadow=chosen?"0 0 0 2px #2c7f43,0 5px 10px #10281488":"none";card.style.transform=chosen?"translateY(-3px)":"none";card.setAttribute("aria-pressed",String(chosen));}const risk=progression.questDangerEstimate(managerState(),quest,$dataRPGManagerQuests,window.RPGManagerBattle.Battle,partyIds,chosenIds);riskWarning.style.display=risk.dangerous?"block":"none";riskWarning.style.color="#ff9c87";riskWarning.textContent=risk.allSamplesWiped?"SEVERE WARNING: even with this equipment, every previewed battle wiped this party. Recover, add companions, or lower difficulty.":risk.dangerous?"DANGER WARNING: this party is under-levelled or loses at least half of the previewed battles. Selected equipment is included.":"";modal.buttons[0].textContent=risk.dangerous?"Accept danger and start":"Start";};
        const boonIcons={reinforced_clothing:"🛡",protective_charms:"✦",medical_supplies:"❤",sharpening_kit:"⚔",emergency_supplies:"✚"};
        for(const [id,u] of Object.entries(progression.EXPEDITION_UPGRADES)){const card=document.createElement("button");card.type="button";card.setAttribute("aria-label",`${u.name}: ${u.effect}, ${u.cost} Gold`);card.style.cssText="min-height:112px;padding:6px;background:linear-gradient(#fff0c9,#cda960);color:#302248;border:3px solid #8d7950;border-radius:12px;font:12px Trebuchet MS;cursor:pointer;transition:.15s";card.innerHTML=`<strong style=\"display:block;font-size:30px\">${boonIcons[id]||"✦"}</strong><b>${u.name}</b><small style=\"display:block;margin-top:4px\">${u.effect.replace(' to every companion for this expedition','')}</small><strong style=\"display:block;margin-top:4px\">${u.cost} Gold</strong>`;card.onclick=()=>{selectedUpgrades.has(id)?selectedUpgrades.delete(id):selectedUpgrades.add(id);modal.error.textContent="";refreshUpgrades();};boonGrid.appendChild(card);boonCards.push({id,card});}upgrades.appendChild(costLabel);refreshUpgrades();
        for(const {id,card} of boonCards){card.replaceChild(questBoonIconElement(id,46),card.firstChild);card.style.minHeight="132px";}
        const grid=document.createElement("div");grid.style.cssText="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0";content.appendChild(grid);
        for(const n of partyIds.map(findNpc)){const card=document.createElement("div"),face=n.portrait,cols=face.columns||4,rows=face.rows||2;card.style.cssText="background:#e3d1ab;border:1px solid #b99c64;border-radius:7px;padding:8px;text-align:center";const portrait=document.createElement("div");portrait.style.cssText=`width:54px;height:54px;margin:0 auto;image-rendering:pixelated;background-repeat:no-repeat;background-image:url('img/faces/${managerImageFile(face.sheet)}');background-size:${cols*54}px ${rows*54}px;background-position:-${face.index%cols*54}px -${Math.floor(face.index/cols)*54}px;border-radius:5px`;card.appendChild(portrait);const classLine=document.createElement("div");classLine.style.cssText="display:flex;align-items:center;justify-content:center;gap:4px;margin-top:4px";classLine.append(classEmblemElement(n.classId,24));const classText=document.createElement("strong");classText.textContent=`${n.role} · LVL.${n.level}`;classLine.appendChild(classText);card.appendChild(classLine);for(const text of [n.name,`HP ${n.health}/${n.maxHealth}`,`Armor ${n.classArmor+progression.equipmentArmor(n)} · Ward ${n.innateWard+n.temporaryWard}`,n.injury||"Healthy"]){const label=document.createElement("div");label.textContent=text;label.title=text;label.style.cssText="font-size:14px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";card.appendChild(label);}grid.appendChild(card);}
    }
    async function saveCampaignForExit(){
        if(!globalThis.$gameSystem?._rpgManager)throw Error("Start or load a campaign before saving.");
        await saveManagerCampaign();
    }
    window.RPGManager.requestExit=showExitConfirmation;
    function showExitConfirmation(){
        if(managerClosing||managerDialog?.element.dataset.exit==="true")return;
        closeManagerDialog();if(managerMinimized)nw.Window.get().restore();
        const exit=()=>{managerClosing=true;closeManagerDialog();floatingTimer.destroy();nw.App.quit();};
        const cancel=()=>{if(!exitSaving){closeManagerDialog();SceneManager._scene?._choices?.activate();if(!globalThis.$gameSystem?._rpgManager?.trips?.A)SceneManager._scene?._commandWindow?.activate();}};
        const modal=managerModal("Exit RPG Manager?",["Protect your campaign before closing."],[{name:"Save and Exit",run:async()=>{
            if(exitSaving)return;exitSaving=true;modal.buttons.forEach(b=>b.disabled=true);modal.error.textContent="Saving…";
            try{await saveCampaignForExit();exit();}
            catch(error){modal.error.textContent=`Save failed: ${error.message||error}. The game is still open.`;modal.buttons.forEach(b=>b.disabled=false);modal.buttons[2].focus();}
            finally{exitSaving=false;}
        }},{name:"Exit Without Saving",run:()=>{if(!exitSaving)exit();}},{name:"Cancel",run:cancel}],cancel);
        modal.element.dataset.exit="true";
    }
    function mountCampNavigation(scene){
        const state=globalThis.$gameSystem?._rpgManager;if(!state||state.startingRosterPending||state.trips.A||!(scene instanceof Scene_RPGBase||scene instanceof Scene_Save) )return;
        document.getElementById("camp-menu-navigation")?.remove();
        const nav=document.createElement("nav"),rect=Graphics._canvas.getBoundingClientRect(),scale=rect.width/Graphics.width;
        nav.id="camp-menu-navigation";nav.setAttribute("aria-label","Camp menus");nav.style.cssText=`position:fixed;z-index:25;box-sizing:border-box;left:${rect.left+12*scale}px;top:${rect.top+(Graphics.boxHeight-76)*scale}px;width:${(Graphics.boxWidth-24)*scale}px;height:${68*scale}px;padding:${6*scale}px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:${6*scale}px;background:linear-gradient(#3c2c59,#261d43);border:${2*scale}px solid #c6ae65;border-radius:${10*scale}px;box-shadow:inset 0 ${2*scale}px #ffffff1f,0 ${5*scale}px ${12*scale}px #090d1f88`;
        const menus=[{label:"Camp",kind:"camp",color:"#8fd88b",type:Scene_RPGHome},{label:"Recruit",kind:"recruit",color:"#efb56f",type:Scene_RPGTavern},{label:"Altar",kind:"altar",color:"#c8a4ff",type:Scene_RPGAltar},{label:"Graveyard",kind:"grave",color:"#b9c4d8",type:Scene_RPGRoster},{label:"Save",kind:"save",color:"#70c9ff",action:"save"}];
        for(const {label,kind,color,type,action} of menus){const selected=type&&(type===Scene_RPGRoster?scene instanceof type&&scene._graveyard:type===Scene_RPGHome?scene instanceof type||scene instanceof Scene_RPGMember||scene instanceof Scene_RPGRoster&&!scene._graveyard:scene instanceof type);const b=document.createElement("button");b.type="button";b.setAttribute("aria-label",label);b.append(fantasyMenuIconElement(kind,48));const labelSpan=document.createElement("span");labelSpan.textContent=label;b.appendChild(labelSpan);b.style.cssText=`min-width:0;display:flex;align-items:center;justify-content:center;gap:${5*scale}px;padding:${2*scale}px ${4*scale}px;font:bold ${14*scale}px Georgia;background:${selected?"linear-gradient(#ffeab1,#cfa24b)":"linear-gradient(#5575b0,#2a4074 58%,#20345f)"};color:${selected?"#302248":"#fff0ce"};border:${1*scale}px solid ${selected?"#fff0b9":"#9fb4df"};border-bottom-width:${4*scale}px;border-bottom-color:${selected?"#8d682d":"#14264d"};border-radius:${8*scale}px;box-shadow:inset 0 ${2*scale}px #ffffff42,0 ${3*scale}px ${5*scale}px #10152d99;letter-spacing:${.2*scale}px;cursor:pointer;transform:translateY(0);transition:transform .08s ease,filter .12s ease,box-shadow .08s ease`;b.onpointerdown=()=>{b.style.transform=`translateY(${3*scale}px)`;b.style.borderBottomWidth=`${1*scale}px`;b.style.boxShadow=`inset 0 ${2*scale}px ${4*scale}px #10152d88`;};const release=()=>{b.style.transform="translateY(0)";b.style.borderBottomWidth=`${4*scale}px`;b.style.boxShadow=`inset 0 ${2*scale}px #ffffff42,0 ${3*scale}px ${5*scale}px #10152d99`;};b.onpointerup=release;b.onpointerleave=release;if(selected)b.setAttribute("aria-current","page");b.onclick=()=>{if(managerState().trips.A||managerDialog)return;if(action==="save"){requestManagerSave(scene);return;}closeManagerDialog();document.getElementById("return-vignette")?.remove();document.getElementById("camp-member-sheet")?.remove();SceneManager._stack=[Scene_RPGHome];if(type===Scene_RPGHome)Scene_RPGHome.reopenSheet=false;SceneManager.goto(type);if(type===Scene_RPGRoster)SceneManager.prepareNextScene(false,true);};nav.appendChild(b);}
        for(const e of ["mousedown","mouseup","touchstart","touchend","keydown","keyup"])nav.addEventListener(e,event=>event.stopPropagation());document.body.appendChild(nav);enableMobileTapSafety(nav);scene._campNav=nav;
    }

    class Scene_RPGBase extends Scene_Base {
        start(){super.start();mountCampNavigation(this);}
        create() {
            super.create();
            const bitmap = new Bitmap(Graphics.width, Graphics.height);
            bitmap.gradientFillRect(0,0,bitmap.width,bitmap.height,"#271c43","#49325f",true);
            for(let i=0;i<14;i++){CozyUI.ellipse(bitmap,(i*.618%1)*bitmap.width,(i*.371%1)*bitmap.height,80+i*3,25+i,"#76628c15");}
            this._background = new Sprite(bitmap);
            this.addChild(this._background);
            const sceneArt={Scene_RPGStartingRoster:"TavernInterior.png",Scene_RPGTavern:"TavernInterior.png",Scene_RPGAltar:"EmeraldAltar.png"};
            const artName=this._graveyard?"MemorialGarden.png":sceneArt[this.constructor.name];
            if(artName){this._sceneArtBitmap=Bitmap.load(`img/pictures/${artName}`);this._sceneArtBitmap.smooth=false;this._sceneArtSprite=new Sprite(this._sceneArtBitmap);this._sceneArtSprite.opacity=118;this._sceneArtBitmap.addLoadListener(()=>{const scale=Math.max(Graphics.width/this._sceneArtBitmap.width,Graphics.height/this._sceneArtBitmap.height);this._sceneArtSprite.scale.set(scale);this._sceneArtSprite.x=(Graphics.width-this._sceneArtBitmap.width*scale)/2;this._sceneArtSprite.y=(Graphics.height-this._sceneArtBitmap.height*scale)/2;});this.addChild(this._sceneArtSprite);}
            const pictureName = $dataRPGManagerUI?.hamlet?.backgroundPicture;
            if (pictureName&&!artName) { this._optionalArt=Bitmap.load(`img/pictures/${encodeURIComponent(pictureName)}.webp`);this._artBackground = new Sprite(this._optionalArt); this._artBackground.opacity = 90; this.addChild(this._artBackground); }
            this.createWindowLayer();
        }

        panel(rect, PanelClass = Window_RPGPanel) {
            const panel = new PanelClass(rect);
            this.addWindow(panel);
            return panel;
        }

        header(title, subtitle) {
            // Persistent timer owns the top-right region on manager scenes.
            const panel = this.panel(new Rectangle(12, 8, globalThis.$gameSystem?._rpgManager?438:Graphics.boxWidth-24, 88));
            const accent=managerSceneAccent();CozyUI.round(panel.contents,2,1,panel.innerWidth-4,35,"#18294dcc",accent,8);CozyUI.icon(panel.contents,"campaign",10,5,27,accent);
            panel.contents.fontFace=`Georgia, ${$gameSystem.mainFontFace()}`;CozyUI.text(panel,title,48,0,Math.max(120,panel.innerWidth-370),25,"#f4deb0","left",32);
            panel.contents.fontFace=`Trebuchet MS, ${$gameSystem.mainFontFace()}`;CozyUI.text(panel,subtitle,8,38,Math.max(120,panel.innerWidth-278),15,"#c6b99d");
            CozyUI.filigree(panel.contents,12,64,panel.innerWidth-24,accent);
            return panel;
        }

        footer(lines) {
            const panel = this.panel(new Rectangle(12, Graphics.boxHeight - 88, Graphics.boxWidth - 24, 80));
            panel.setLines(lines);
            return panel;
        }

        terminate() {
            this._finishButton?.remove();this._returnVignette?.remove();this._campStatus?.remove();this._campNav?.remove();this._manualButton?.remove();if(manualOverlay)closeManual();if(managerDialog?.element.dataset.exit!=="true")closeManagerDialog();super.terminate();
            this._background.bitmap.destroy();
            if(this._sceneArtBitmap)this._sceneArtBitmap.destroy();
            if(this._optionalArt)this._optionalArt.destroy();
        }
    }

    class Window_RPGAlerts extends Window_Command {
        initialize(rect){super.initialize(rect);this.select(0);this.activate();}
        update(){super.update();if(!managerState().questResults&&Input.isTriggered("pageup"))this.callHandler("toggle");}
        makeCommandList(){this.addCommand(`Alerts: ${managerState().completionAlerts!==false?"ON":"OFF"}`,"toggle");}
        itemHeight(){return 26;} lineHeight(){return 26;} updatePadding(){this.padding=6;}
        drawItem(i){const r=this.itemRect(i);CozyUI.round(this.contents,r.x,r.y,r.width,r.height,"#293b78","#ffdf65",5);CozyUI.text(this,this.commandName(i),r.x+4,r.y,r.width-8,18,"#fff5d9","center",26);}
    }
    class Window_RPGSessionHint extends Window_RPGPanel {
        updatePadding(){this.padding=6;}
        setLines(lines){this.contents.clear();lines.slice(0,2).forEach((text,index)=>CozyUI.text(this,text,8,index*15,this.innerWidth-16,12,"#d9ceb3","left",15));}
    }
    class Scene_RPGHome extends Scene_RPGBase {
        create() {
            super.create();
            progression.advanceTimers(managerState());
            // Settlement stays in history/lastReport; returning to camp never blocks on a recap card.
            if(managerState().questResults)progression.dismissQuestResults(managerState());
            const living = roster().filter(isLiving).length;
            const hamlet = $dataRPGManagerUI?.hamlet || {};
            if(managerState().startingRosterPending){SceneManager.goto(Scene_RPGStartingRoster);return;}
            this._hasTrip=!!progression.tripForTeam(managerState(),"A");this._campFirst=true;
            // End before the 434px timer rail so neither framed surface intrudes
            // into the other's visual gutter.
            this._header=this.panel(new Rectangle(12,8,410,58));this.refreshGuildHeader();
            const campTop=this._hasTrip?108:76,campHeight=(Graphics.boxHeight-96)-campTop-8;
            const commandRect=this._campFirst?new Rectangle(12,Graphics.boxHeight-96,Graphics.boxWidth-24,84):new Rectangle(12,108,382,210);
            this._commandWindow = new Window_RPGHomeCommands(commandRect,this._campFirst);
            this._commandWindow.setHandler("roster", () => this.openRoster(false));
            this._commandWindow.setHandler("battle", this.startBattle.bind(this));
            this._commandWindow.setHandler("shop", () => SceneManager.push(Scene_RPGShop));
            this._commandWindow.setHandler("recruit",()=>SceneManager.push(Scene_RPGTavern));
            this._commandWindow.setHandler("completionAlert",()=>{const state=managerState();state.completionAlerts=state.completionAlerts===false;if(!state.completionAlerts){eventAudioQueue=[];releaseCompletionChime();}this._commandWindow.refresh();this._footer.setLines([state.completionAlerts?"Quiet cues mark encounters, battles and completion.":"All expedition cues are muted; results appear normally.","This setting is saved with your game."]);this._commandWindow.activate();});
            this._commandWindow.setHandler("altar", () => SceneManager.push(Scene_RPGAltar));
            this._commandWindow.setHandler("debug", () => SceneManager.push(Scene_RPGDebugTimers));
            this._commandWindow.setHandler("graveyard", () => this.openRoster(false, true));
            this._commandWindow.setHandler("save", () => requestManagerSave(this));
            
            this.addWindow(this._commandWindow);
            if(!this._hasTrip){
                const campWidth=Math.floor((Graphics.boxWidth-36)*.54);this._camp=this.panel(new Rectangle(12,campTop,campWidth,campHeight),Window_RPGCampsite);this._camp.setSelectHandler(id=>this.openMember(id));this._camp.setState(managerState());
                this.mountCampAssignmentControl(campWidth);
                const rosterTop=140,rosterHeight=(Graphics.boxHeight-96)-rosterTop-8;this._companions=this.panel(new Rectangle(campWidth+24,rosterTop,Graphics.boxWidth-campWidth-36,rosterHeight),Window_RPGCampRoster);this._companions.setSelectHandler(id=>this.openMember(id));this._companions._menuHandler=menu=>{if(menu==="roster")this.openRoster(false);else this._commandWindow.callHandler(menu);};this._companions.setState(managerState());this._jobSummary=this._companions;if(managerState().questResults){this._companions.hide();this._teamPanel=this.panel(new Rectangle(campWidth+24,rosterTop,Graphics.boxWidth-campWidth-36,rosterHeight),Window_RPGExpeditionPanel);this._teamPanel.setRecallHandler(()=>this.finishRecap());}
            }else{
                const campWidth=Math.floor((Graphics.boxWidth-36)*.34);this._camp=this.panel(new Rectangle(12,148,campWidth,campHeight-40),Window_RPGCampRoster);this._camp.setSelectHandler(id=>this.openMember(id));this._camp.setState(managerState());
                const jobs=document.createElement("button"),r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;jobs.textContent="Camp Jobs";jobs.id="expedition-camp-jobs";jobs.style.cssText=`position:fixed;z-index:23;left:${r.left+12*scale}px;top:${r.top+111*scale}px;width:${campWidth*scale}px;height:${31*scale}px;background:#354c80;color:#fff0ce;border:1px solid #c6ae65;border-radius:6px;font:${16*scale}px Trebuchet MS;cursor:pointer`;
                jobs.onclick=()=>SceneManager.push(Scene_RPGCampJobs);for(const event of ["mousedown","mouseup","keydown","keyup"])jobs.addEventListener(event,e=>e.stopPropagation());document.body.appendChild(jobs);this._campJobsShortcut=jobs;
                this._teamPanel=this.panel(new Rectangle(campWidth+24,108,Graphics.boxWidth-campWidth-36,campHeight),Window_RPGExpeditionPanel);this._teamPanel.setStartHandler(team=>this.openExpeditionAttention(team));this._teamPanel.setRecallHandler(()=>{if(!progression.tripForTeam(managerState(),"A")){this.finishRecap();}else SceneManager.push(Scene_RPGRecall);});
            }
            if(this._teamPanel&&this._hasTrip){
                this._campOpen=false;
                this._campToggle=new Window_RPGCampToggle(new Rectangle(20,68,200,36));
                this._campToggle.setHandler("toggle",()=>{this._campOpen=!this._campOpen;this.layoutExpedition();});this.addWindow(this._campToggle);this.layoutExpedition();
            }
            this.refreshTeamPanel();
            this._footer = this._hasTrip?this.panel(new Rectangle(12,Graphics.boxHeight-50,Graphics.boxWidth-24,42),Window_RPGSessionHint):this.footer(this.homeHints());if(this._hasTrip)this._footer.setLines(this.homeHints());
            this._commandWindow.onBlocked = () => this._footer.setLines(["That option is not available yet.", progression.teamError(managerState())||"Choose one to three roster members for a quest."]);
            this._footer.visible=false;
            this._lastTimerSecond=-1;
            mountManualButton(this);
        }

        mountCampAssignmentControl(campWidth){
            const control=document.createElement("section"),select=document.createElement("select"),apply=document.createElement("button"),r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;
            const controlWidth=Math.min(204,Math.max(172,campWidth-128)),rightInset=20,applySize=26;
            control.id="camp-assignment-control";control.setAttribute("aria-label","Assign camp jobs");control.style.cssText=`position:fixed;z-index:27;left:${r.left+(12+campWidth-rightInset-controlWidth)*scale}px;top:${r.top+85*scale}px;width:${controlWidth*scale}px;height:${applySize*scale}px;display:grid;grid-template-columns:minmax(0,1fr) ${applySize*scale}px;gap:${8*scale}px;align-items:stretch;box-sizing:border-box`;
            for(const [value,label] of [["auto","Auto assign"],["gold","Gold"],["arcana","Arcana"],["random","Random"]]){const option=document.createElement("option");option.value=value;option.textContent=label;select.appendChild(option);}
            select.setAttribute("aria-label","Camp assignment strategy");select.style.cssText=`min-width:0;padding:0 ${8*scale}px;border:2px solid #d8bd75;border-radius:${5*scale}px;background:linear-gradient(#fff1cf,#ddc082);color:#302248;font:bold ${14*scale}px Georgia`;
            apply.type="button";apply.textContent="\u2713";apply.setAttribute("aria-label","Apply camp assignments");apply.style.cssText=`box-sizing:border-box;width:${applySize*scale}px;height:${applySize*scale}px;padding:0;border:${2*scale}px solid #bff1c7;border-radius:50%;background:linear-gradient(#42d568,#148d36);color:white;box-shadow:inset 0 ${2*scale}px #ffffff66,0 ${2*scale}px ${4*scale}px #071b0d88;font:bold ${17*scale}px Georgia;line-height:1;cursor:pointer;transition:transform .08s ease`;apply.onpointerdown=()=>apply.style.transform=`translateY(${2*scale}px)`;apply.onpointerup=apply.onpointerleave=()=>apply.style.transform="translateY(0)";
            apply.onclick=()=>{const state=managerState(),available=progression.activeRoster(state).filter(n=>progression.living(n)&&!progression.isUnavailable(state,n.id)),mode=select.value;let message="";
                if(mode==="auto")message=progression.autoAssignCampJobs(state).message;
                else{const jobs=mode==="gold"?available.map(()=>"work"):mode==="arcana"?available.map(()=>"study"):available.map(()=>Math.random()<.5?"work":"study");available.forEach((npc,index)=>progression.assignCampJob(state,npc.id,jobs[index]));message=`${available.length} companions assigned: ${mode}.`;}
                SoundManager.playOk();this._camp.setState(state);this._companions?.setState(state);apply.textContent="\u2713";apply.style.filter="brightness(1.35)";setTimeout(()=>{if(apply.isConnected)apply.style.filter="";},500);this._footer?.setLines?.([message,"Camp assignments updated."]);
            };
            for(const event of ["mousedown","mouseup","touchstart","touchend","keydown","keyup"])control.addEventListener(event,e=>e.stopPropagation());control.append(select,apply);document.body.appendChild(control);this._campAssignmentControl=control;
        }

        showReturnVignette(){
            const id=managerState().questResults?.questId;if(this._vignetteId===id)return;this._vignetteId=id;
            const finish=document.createElement("button"),panel=this._teamPanel,r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;
            finish.id="finish-recap";finish.innerHTML='<span aria-hidden="true">✦</span> FINISH <span aria-hidden="true">✦</span><small>Return to Camp</small>';finish.setAttribute("aria-label","Finish quest recap and return to camp");finish.style.cssText=`position:fixed;z-index:40;left:50%;top:50%;transform:translate(-50%,-50%);width:${350*scale}px;height:${112*scale}px;border:${4*scale}px solid #fff0c7;border-bottom-width:${9*scale}px;border-radius:${20*scale}px;background:radial-gradient(circle at 50% 15%,#fff1a8,#e8b94f 55%,#a66b25);color:#302248;box-shadow:inset 0 ${3*scale}px #fff8d7,0 ${10*scale}px ${34*scale}px #000b,0 0 ${24*scale}px #ffd96c99;font:bold ${38*scale}px Georgia;cursor:pointer;text-shadow:0 1px #fff3ba;transition:transform .1s,filter .1s`;
            const small=finish.querySelector("small");small.style.cssText=`display:block;font:${15*scale}px Trebuchet MS;letter-spacing:${2*scale}px;margin-top:${4*scale}px`;finish.onpointerdown=()=>finish.style.transform="translate(-50%,-47%) scale(.98)";finish.onpointerup=finish.onpointerleave=()=>finish.style.transform="translate(-50%,-50%)";finish.onmouseenter=()=>finish.style.filter="brightness(1.12)";finish.onmouseleave=()=>{finish.style.filter="";finish.style.transform="translate(-50%,-50%)";};
            finish.onclick=()=>this.finishRecap();for(const event of ["mousedown","mouseup","keydown","keyup"])finish.addEventListener(event,e=>e.stopPropagation());document.body.appendChild(finish);this._finishButton=finish;finish.focus();Input.clear();TouchInput.clear();

            const el=document.createElement("button");el.id="return-vignette";el.textContent="✦  Lanterns gathered. Turning for home…";el.setAttribute("aria-label","Dismiss return vignette");
            el.style.cssText="position:fixed;left:8%;top:55%;z-index:21;max-width:38vw;padding:18px;border:2px solid #dca25d;border-radius:14px;background:radial-gradient(ellipse,#8a5935,#302248);color:#fff0ce;box-shadow:0 0 24px #e5ae5766;font:18px Georgia;cursor:pointer";
            el.onclick=()=>el.remove();document.body.appendChild(el);this._returnVignette=el;this._vignetteStarted=performance.now();this._vignetteUntil=this._vignetteStarted+1600;
        }
        showFallenReturn(trip){
            const fallen=!!trip&&(trip.wiped||(trip.preparedTeam||[]).length>0&&(trip.preparedTeam||[]).every(n=>n.alive===false||n.health<=0||trip.expeditionDeaths?.[n.id]));
            if(!fallen){this._fallenReturnButton?.remove();this._fallenReturnButton=null;return;}
            if(this._fallenReturnButton?.isConnected)return;
            const button=document.createElement("button"),r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;
            button.id="fallen-return-to-camp";button.type="button";button.innerHTML="RETURN TO CAMP<small>Party fallen</small>";button.setAttribute("aria-label","Return fallen party to camp now");
            button.style.cssText=`position:fixed;z-index:41;left:50%;top:50%;transform:translate(-50%,-50%);width:${340*scale}px;height:${108*scale}px;border:${4*scale}px solid #ffe7b0;border-bottom-width:${9*scale}px;border-radius:${18*scale}px;background:radial-gradient(circle at 50% 12%,#db7d64,#8f3340 60%,#4b2135);color:#fff3d2;box-shadow:inset 0 ${3*scale}px #ffffff55,0 ${10*scale}px ${32*scale}px #000b;font:bold ${29*scale}px Georgia;cursor:pointer;text-shadow:0 ${2*scale}px #351221`;
            button.querySelector("small").style.cssText=`display:block;margin-top:${5*scale}px;font:${15*scale}px Trebuchet MS;letter-spacing:${2*scale}px`;
            button.onclick=()=>{const active=progression.tripForTeam(managerState(),"A");if(active)progression.endSessionEarly(managerState(),active.id,true);button.remove();this._fallenReturnButton=null;SceneManager.goto(Scene_RPGHome);};
            for(const event of ["mousedown","mouseup","keydown","keyup"])button.addEventListener(event,e=>e.stopPropagation());document.body.appendChild(button);this._fallenReturnButton=button;
        }
        finishRecap(){progression.dismissQuestResults(managerState());for(const b of this._campNav?.querySelectorAll("button")||[]){b.disabled=false;b.style.opacity="1";}this._finishButton?.remove();this._returnVignette?.remove();this._teamPanel?.hide();if(this._teamPanel)this._teamPanel._results=null;this._renderedResult=null;this._shownResultId=null;this._companions?.show();this._camp?.setState(managerState());this._companions?.setState(managerState());this._commandWindow.refresh();this._commandWindow.show();this._commandWindow.activate();this.refreshGuildHeader();}
        homeHints(){
            const s=managerState(),trip=progression.tripForTeam(s,"A"),vacancies=progression.vacantSlots(s).length;
            if(s.questResults)return ["Session returned. Inspect Results and Details, then select Finish.",vacancies?"Empty slots: visit Tavern for free replacements after Finish.":"Results preserve your state and rewards at arrival. Finish never awards again."];
            if(trip)return [];
            return [s.recoveryNotice||s.clockNotice||(vacancies?"Visit Tavern to grow your roster to five for free.":"Ready: choose a quest and select one to three companions. Save at Home."),"Every knockout: 50/50 death or lasting injury. Camp heals 1 HP / 30 seconds."];
        }
        layoutExpedition(){
            if(!this._teamPanel||!this._hasTrip)return;const width=Math.floor((Graphics.boxWidth-36)*.34),x=this._campOpen?width+24:12;
            this._camp.visible=this._campOpen;
            if(this._campJobsShortcut)this._campJobsShortcut.hidden=!this._campOpen;
            this._renderedResult=null;this._teamPanel.move(x,68,Graphics.boxWidth-x-12,Graphics.boxHeight-80);this._teamPanel.createContents();
            this._campToggle.visible=false;this._commandWindow.visible=false;this._commandWindow.deactivate();this._campToggle._open=this._campOpen;this._campToggle.refresh();this.refreshTeamPanel();
        }
        refreshGuildHeader(){
            if(!this._header)return;const p=this._header,s=managerState(),trip=progression.tripForTeam(s,"A"),living=roster().filter(isLiving).length;
            p.contents.clear();p.contents.fontFace=`Trebuchet MS, ${$gameSystem.mainFontFace()}`;
            const pill=(kind,value,x,color)=>{p.contents.gradientFillRect(x+3,5,114,22,"#48679e","#243b70",true);CozyUI.round(p.contents,x,2,120,28,null,color,7);p.contents.fillRect(x+9,5,102,1,"#ffffff55");CozyUI.ellipse(p.contents,x+18,16,13,13,"#172a50");CozyUI.icon(p.contents,kind,x+10,8,16,color);CozyUI.text(p,value,x+31,5,84,15,"#f6e8ce","center",19);};
            pill("coin",`${s.gold} Gold`,4,"#e8c583");pill("arcana",`${s.arcana||0} Arcana`,130,"#c5ade4");pill("altar",`${s.magicalArtifacts||0} Artifacts`,256,"#78d5ba");this._headerResourceKey=`${s.gold}:${s.arcana||0}:${s.magicalArtifacts||0}`;
        }

        refreshTeamPanel(refreshCamp=true) {
            const panel = this._teamPanel;
            const state = managerState(), now = Date.now();
            if(refreshCamp){this._camp?.setState(state);this._jobSummary?.setState(state);}
            if(!panel)return;
            if(state.questResults&&this._renderedResult===state.questResults)return;
            panel.contents.clear();
            if(state.questResults){
                if(this._shownResultId!==state.questResults.questId){this._shownResultId=state.questResults.questId;this._footer?.setLines(this.homeHints());this._campOpen=false;if(this._hasTrip)this.layoutExpedition();this._camp?.setState(state);this.refreshGuildHeader();this._commandWindow.refresh();}
                panel.setStartRegions([]);panel._replaceResult=progression.vacantSlots(state).length>0;panel.drawResults(state.questResults);this._renderedResult=state.questResults;this.showReturnVignette();return;
            }
            const startRegions = [];
            panel.line("Focus session", 0, "#d7b56d", 20);
            for (const [index, key] of ["A"].entries()) {
                const trip = progression.tripForTeam(state, key)||state.expeditionReplay, ids = trip ? trip.team.map(member => member.id) : state.teams[key] || [], y = 44;
                panel.line("Companions", y, ColorManager.systemColor(), 20);
                panel.changeTextColor(ColorManager.normalColor()); panel.contents.fontSize = 11;
                panel.drawText(ids.length ? ids.map(id => { const npc = findNpc(id); return `${npc?.name || id}${trip?.expeditionDeaths?.[id] ? " [FALLEN]" : ""}`; }).join(", ") : "No members assigned", 8, y + 24, 180);
                if (trip) {
                    if(trip.realtime){
                        const remaining=Math.max(0,trip.remainingMs||0),progress=1-remaining/Math.max(1,trip.totalDurationMs||1);
                        panel.contents.clear();
                        panel.drawBattle(trip);
                        this.showFallenReturn(trip);
                        panel.setRecallRegion(null);continue;
                    }
                    const urgent = ["ready", "battle", "halted", "choice"].includes(trip.phase);
                    const stage = progression.currentStage(trip);
                    const label = trip.phase === "ready" ? "! ENCOUNTER READY - START NOW !" : trip.phase === "halted" ? "! INTERRUPTION - ATTENTION REQUIRED !" : trip.phase === "choice" ? "! CONTINUE OR RETURN - DECIDE NOW !" : trip.phase === "battle" ? "! ENCOUNTER IN PROGRESS !" : `${(stage?.label || trip.phase).toUpperCase()}  ${formatTime(trip.deadlineMs - now)} remaining`;
                    panel.changeTextColor("#ffffff"); panel.contents.fontSize = 13; panel.drawText("Expedition in progress", 8, y + 45, 180);
                    panel.changeTextColor(urgent ? ColorManager.crisisColor() : ColorManager.powerUpColor()); panel.contents.fontSize = 11; panel.drawText(label, 8, y + 65, 180);
                    const progress = progression.expeditionProgress(trip, now);
                    panel.contents.fillRect(8, y + 88, 176, 12, "#252a31");
                    panel.contents.fillRect(8, y + 88, Math.floor(176 * progress), 12, urgent ? "#e16b5b" : "#d7b56d");
                    const leader = trip.preparedTeam.find(member => member.id === trip.leaderId);
                    panel.changeTextColor("#ffe36d"); panel.contents.fontSize = 11; panel.drawText(`${Math.round(progress * 100)}% | LEADER: ${leader?.name || "None"}`, 8, y + 101, 180);
                    panel.contents.strokeRect(192, y + 20, panel.innerWidth - 200, 78, "#4f7082"); panel.drawParty(trip, y + 44);
                    if (["ready", "halted", "choice"].includes(trip.phase)) {
                        const rect = new Rectangle(8, y + 118, 176, 24);
                        panel.contents.fillRect(rect.x, rect.y, rect.width, rect.height, "#9d352d");
                        panel.contents.strokeRect(rect.x, rect.y, rect.width, rect.height, "#ffd27d");
                        const action = trip.phase === "ready" ? "START NOW!" : trip.phase === "halted" ? "RESOLVE!" : "DECIDE!";
                        panel.changeTextColor("#ffffff"); panel.contents.fontSize = 14; panel.drawText(action, rect.x, rect.y, rect.width, "center");
                        startRegions.push({ team: key, rect });
                    }
                } else panel.line(!progression.teamError(state, ids, key) ? "IDLE - ready to dispatch" : "IDLE - assign 1-5 ready members", y + 52, ColorManager.normalColor(), 14);
            }
            panel.setStartRegions(startRegions);
        }

        update() {
            super.update();
            if(this._returnVignette&&performance.now()-this._vignetteStarted>=800)this._returnVignette.textContent="Heading home. The camp is ready.";
            if(this._returnVignette&&performance.now()>=this._vignetteUntil){this._returnVignette.remove();this._returnVignette=null;}
            if (!this.isActive() || SceneManager.isSceneChanging()) return;
            if(!this._hasTrip&&!managerState().questResults&&!managerDialog){
                const sheet=document.getElementById("camp-member-sheet");
                if(sheet)updateFormController(sheet);
                else if(!this._campNav?.contains(document.activeElement)){
                    if(Input.isTriggered("down")||Input.isTriggered("up")){
                        const count=Math.max(1,progression.activeSlotIds(managerState()).length);this._campFocusIndex=((this._campFocusIndex??0)+(Input.isTriggered("down")?1:count-1))%count;
                        this._companions._focusIndex=this._campFocusIndex;this._companions.refresh();Input.clear();
                    }else if(Input.isTriggered("ok")){
                        const id=progression.activeSlotIds(managerState())[this._campFocusIndex??0];
                        if(id)this.openMember(id);Input.clear();
                    }
                }
            }
            if(this._hasTrip&&!managerState().trips.A&&managerState().questResults){SceneManager.goto(Scene_RPGHome);return;}
            if(this._teamPanel&&(progression.tripForTeam(managerState(),"A")?.realtime||managerState().expeditionReplay||managerState().questResults)&&performance.now()-(this._lastPanelPaint||0)>=(document.hasFocus()?33:66)){this._lastPanelPaint=performance.now();this.refreshTeamPanel(false);}
            if(this._campToggle?.visible&&Input.isTriggered("shift")){this._campOpen=!this._campOpen;this.layoutExpedition();}
            const second = Math.floor(Date.now() / 1000);
            if (second === this._lastTimerSecond) return;
            this._lastTimerSecond = second;
            this.refreshGuildHeader();
            const changes = progression.advanceTimers(managerState());
            if(this._hasTrip&&!progression.tripForTeam(managerState(),"A")&&!managerState().expeditionReplay&&!managerState().questResults){SceneManager.goto(Scene_RPGHome);return;}
            this.refreshTeamPanel(); this._commandWindow.refresh();
            if (changes.arrivals.length) this._footer.setLines([`Team ${changes.arrivals.join(" and ")} requires attention.`, "Use the urgent Active Expeditions button; progress is frozen until resolved."]);
            else if (changes.returns.length) this._footer.setLines([`Team ${changes.returns[0].teamKey} returned. Rewards and consequences settled once.`, "Gold, Arcana, XP, and character conditions are updated."]);
        }

        openExpeditionAttention(teamKey) {
            const trip = progression.tripForTeam(managerState(), teamKey);
            if (!trip) return;
            if (trip.phase === "halted") { SceneManager.push(Scene_RPGExpeditionEvent); SceneManager.prepareNextScene(teamKey); return; }
            if (trip.phase === "choice") { SceneManager.push(Scene_RPGExpeditionChoice); SceneManager.prepareNextScene(teamKey); return; }
            if (trip.phase !== "ready") return;
            const battle = createTripBattle(teamKey);
            SceneManager.goto(Scene_RPGBattle);
            SceneManager.prepareNextScene(battle, trip.id, teamKey);
        }

        start() {
            super.start();
            if(!this._hasTrip){this._commandWindow?.hide();this._commandWindow?.deactivate();}
            SceneManager.clearStack();if(Scene_RPGHome.reopenSheet&&Scene_RPGHome.memberContext){Scene_RPGHome.reopenSheet=false;this.openMember(Scene_RPGHome.memberContext);}
        }

        openRoster(selecting, graveyard = false) {
            SceneManager.push(Scene_RPGRoster);
            SceneManager.prepareNextScene(selecting, graveyard);
        }

        openMember(id){
            Scene_RPGHome.memberContext=id;
            if(this._hasTrip){SceneManager.push(Scene_RPGMember);SceneManager.prepareNextScene(id);return;}
            this._sheetId=id;this._sheetTab=this._sheetTab||"Overview";this._woundPage=0;this._powerPage=0;Scene_RPGHome.memberContext=id;this._commandWindow.deactivate();this.drawCampSheet();
        }
        drawCampSheet(message=""){
            document.getElementById("camp-member-sheet")?.remove();const npc=findNpc(this._sheetId),state=managerState(),P=progression;if(!npc)return;
            const pane=document.createElement("section"),r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;pane.id="camp-member-sheet";pane.setAttribute("aria-label",`${npc.name} character sheet`);
            pane.style.cssText=`position:fixed;z-index:20;box-sizing:border-box;overflow:hidden;left:${r.left+12*scale}px;top:${r.top+108*scale}px;width:${this._camp.width*scale}px;height:${this._camp.height*scale}px;background:#243969;color:#fff0ce;border:2px solid #c6ae65;border-radius:10px;padding:${10*scale}px;font:${14*scale}px Trebuchet MS`;
            for(const event of ["mousedown","mouseup","touchstart","touchend","wheel","keydown","keyup"])pane.addEventListener(event,e=>e.stopPropagation());
            const line=(text,tag="p",parent=pane)=>{const el=document.createElement(tag);el.textContent=text;el.style.margin="8px 0";parent.appendChild(el);return el;};
            const button=(text,run,parent=pane)=>{const b=document.createElement("button");b.type="button";b.textContent=text;b.style.cssText="background:#354c80;color:#fff0ce;border:1px solid #c6ae65;border-radius:5px;padding:7px;margin:3px;font:inherit;cursor:pointer";b.onclick=run;parent.appendChild(b);return b;};
            const back=button("Back to camp",()=>{pane.remove();this._sheetId=null;this._commandWindow.deactivate();Input.clear();});back.dataset.action="back";line(`${npc.name} · Level ${npc.level}`,"h3");
            const tabs=document.createElement("div");tabs.style.cssText="display:flex;gap:5px;margin:8px 0";pane.appendChild(tabs);if(this._sheetTab==="Gear")this._sheetTab="Overview";for(const tab of ["Overview","Care","Powers"]){const b=button(tab,()=>{this._sheetTab=tab;this.drawCampSheet();},tabs);b.setAttribute("aria-pressed",String((this._sheetTab||"Overview")===tab));if((this._sheetTab||"Overview")===tab)b.style.background="#6a6046";}
            if(this._sheetTab==="Powers"){
                pane.style.overflowY="auto";
                const page=this._powerPage||0,track=P.powerTrack(npc),pages=Math.max(1,Math.ceil(track.length/3));
                for(const text of track.slice(page*3,page*3+3))line(text);
                if(pages>1)button(`Powers ${page+1}/${pages} — next`,()=>{this._powerPage=(page+1)%pages;this.drawCampSheet();});
                line(`XP ${npc.xp}/${P.xpRequired(npc)||"CAP"}; level cap ${P.LEVEL_CAP}. L3+: one special per battle; Quickening has a 25% chance to allow two.`);
            }else if(this._sheetTab==="Gear"){
                pane.style.overflowY="auto";
                line(`HP ${npc.health}/${npc.maxHealth} / Armor ${npc.classArmor+P.equipmentArmor(npc)}/${npc.classArmorMax+P.equipmentArmorMax(npc)} / Ward ${npc.innateWard+npc.temporaryWard}/${npc.innateWardMax+npc.temporaryWard}`);
                const grid=document.createElement("div");grid.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:12px";pane.appendChild(grid);
                for(const slot of P.EQUIPMENT_SLOTS){const label=line(`${{head:"♜ HEAD",body:"▣ BODY",offHand:"⛨ OFF-HAND",accessory:"✦ ACCESSORY"}[slot]}`,"label",grid),select=document.createElement("select");select.setAttribute("aria-label",slot);select.style.cssText="display:block;width:100%;padding:7px;font:inherit;box-sizing:border-box;background:#f3e5c7;color:#243052";for(const id of [null,...P.armorGearIds().filter(id=>P.SHOP[id].slot===slot&&P.compatible(npc,id)&&((state.equipmentStock[id]||0)>0||npc.equipmentSlots[slot]===id))]){const o=document.createElement("option");o.value=id||"";o.textContent=id?`${P.SHOP[id].name} (${P.itemBoosts(id)})`:"Empty";o.selected=npc.equipmentSlots[slot]===id;select.appendChild(o);}select.onchange=()=>{const result=P.equipSlot(state,npc.id,select.value||null,slot);this.drawCampSheet(result.message);};label.appendChild(select);const equipped=npc.equipmentSlots[slot];if(equipped){const c=npc.equipmentCondition[equipped];line(c?.broken?"Broken - repair in Shop":`${c?.hitsRemaining??P.SHOP[equipped].durability}/${P.SHOP[equipped].durability} hits left`,"small",label);}}
                line("Equipping never heals or restores worn Armor.");button("Compare equipment",()=>{pane.remove();SceneManager.push(Scene_RPGMember);SceneManager.prepareNextScene(npc.id);});
            }else if(this._sheetTab==="Care"){
                line(`HP ${npc.health}/${npc.maxHealth} · ${npc.injury||"Healthy"}`);line("Camp restores 1 HP /30 seconds. Lasting injuries remain.");
                const wounds=P.woundLines(npc),page=this._woundPage||0;
                for(const text of wounds.slice(page,page+1))line(text);
                if(wounds.length>1)button(`Wounds ${page+1}/${wounds.length} — next`,()=>{this._woundPage=(page+1)%wounds.length;this.drawCampSheet();});
                const use=button(`Use Potion · ${state.supplies.potion||0} available`,()=>this.drawCampSheet(P.useItem(state,npc.id,"potion").message));use.disabled=!!P.itemError(state,npc.id,"potion");button(`Buy Potion · ${P.SHOP.potion.price} Gold`,()=>this.drawCampSheet(P.purchase(state,"potion").message));
            }else{
                const overview=document.createElement("div");overview.style.cssText=`max-height:${Math.max(80,this._camp.height-195)*scale}px;overflow-y:auto;padding-right:5px`;pane.appendChild(overview);
                const info=text=>line(text,"p",overview),career=P.ensureCareer(npc);
                info(`${P.identityLabel(npc)} · HP ${npc.health}/${npc.maxHealth} · Armor ${npc.classArmor+P.equipmentArmor(npc)} · Ward ${npc.innateWard+npc.temporaryWard}`);
                info(`${npc.injury||"Healthy"} · ${npc.lastingInjuries||0} lasting injuries`);
                const wounds=P.woundLines(npc);
                for(const text of wounds){const detail=info(text);detail.style.cssText="font-size:12px;line-height:1.3;margin:6px 0";}
                if(!wounds.length)info("No active wounds.");
                info(`XP ${npc.xp}/${P.xpRequired(npc)||"CAP"} · ${npc.foundingMember?"Founder · ":""}Leadership ${npc.leadership||1}/5`);
                info(`Signature: ${P.moveFor(npc)?.name||npc.signatureAttack||"Unlearned"} · ${npc.passiveTrait?.name||"No passive"}`);
                info("Special: L3+; one use per battle. Quickening: 25% chance of two.");
                info(`Critical ${Math.round(npc.critChance*100)}% · Dodge ${Math.round(npc.dodgeChance*100)}% / Speed ${Math.round(npc.speed)}`);
                info("Defense comes from class growth, rituals, and expedition-only preparation.");
                info(`${career.questsCompleted} adventures · ${career.victories} victories · ${career.bossVictories} bosses`);
                info(`${career.kills} kills · ${career.damageDealt} damage · ${career.healingDone} healing · ${career.signatureUses} signatures · ${career.injuriesSuffered} injuries`);
                info(`Recent: ${career.lastQuest?`${career.lastQuest.questName} / ${career.lastQuest.result}`:"No recorded adventure"}`);
                button("Full sheet / Rename",()=>{pane.remove();SceneManager.push(Scene_RPGMember);SceneManager.prepareNextScene(npc.id);},overview);

            }
            pane.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();back.click();}else if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)&&e.target.tagName==="BUTTON"){e.preventDefault();focusWizardDirection(pane,e.key.slice(5).toLowerCase());}});
            line(message||(this._sheetTab==="Overview"?"Scroll Overview for stats, wounds and career history.":"One companion, one job. Camp duties resume on return."));document.body.appendChild(pane);back.focus();
        }
        terminate(){this._campJobsShortcut?.remove();this._campAssignmentControl?.remove();this._fallenReturnButton?.remove();document.getElementById("return-vignette")?.remove();document.getElementById("camp-member-sheet")?.remove();super.terminate();}

        startBattle() {
            SceneManager.push(Scene_RPGQuestBoard);
        }
    }

    class Scene_RPGExpeditionEvent extends Scene_RPGBase {
        prepare(teamKey) { this._teamKey = teamKey; }
        create() {
            super.create();
            const trip = progression.tripForTeam(managerState(), this._teamKey);
            const stage = progression.currentStage(trip);
            this._event = findExpeditionEvent(stage?.eventId);
            if (!trip || !this._event) { SceneManager.goto(Scene_RPGHome); return; }
            const seed = Number(String(trip.id).replace(/\D/g, "")) * 7919 + trip.stageIndex * 313;
            this._decision = window.RPGManagerBattle.resolveLeaderDecision(trip.preparedTeam, trip.leaderId, this._event.interactionId, seed);
            const outcomeKey = this._decision.resolved ? this._decision.actionId : "ineligible";
            this._outcome = this._event.outcomes?.[outcomeKey] || this._event.outcomes?.default || {};
            this.header(`Expedition event - ${this._event.name}`, `Party Leader: ${this._decision.leaderName || "Unavailable"}`);
            this._portrait = this.panel(new Rectangle(12, 108, 190, 220), Window_RPGLargePortrait);
            this._dialogue = this.panel(new Rectangle(214, 108, Graphics.boxWidth - 226, 220), Window_RPGDialogue);
            this._facts = this.panel(new Rectangle(12, 340, Graphics.boxWidth - 24, Graphics.boxHeight - 428));
            this._facts.setLines([`DANGER: ${this._event.danger || "Unknown consequences."}`, "Travel is frozen. This event will not resolve in the background."]);
            const actor = trip.preparedTeam.find(member => member.id === this._decision.leaderId);
            this._portrait.setCharacter(actor || null);
            this._steps = this._decision.resolved ? [
                { speaker: "Narration", text: `${this._event.name} interrupts the expedition. The party must decide how to respond.` },
                { speaker: `${this._decision.leaderName} — PARTY LEADER`, text: `${this._decision.leaderName} weighs the danger and the party's condition.` },
                { speaker: this._decision.leaderName, text: this._decision.summary },
                { speaker: "CONSEQUENCE", text: `${this._outcome.text || "The choice is resolved."}${this._outcome.gold ? ` +${this._outcome.gold} Gold.` : ""}${this._outcome.arcana ? ` +${this._outcome.arcana} Arcana.` : ""}` }
            ] : [
                { speaker: "Narration", text: `${this._event.name} interrupts the expedition.` },
                { speaker: "NO ELIGIBLE SPECIALIST", text: this._decision.message },
                { speaker: "CONSEQUENCE", text: this._outcome.text || "The opportunity is lost, but the expedition remains valid." }
            ];
            if ($dataRPGManagerUI?.developerMode && battleAiDebug) this._steps.push({ speaker: "DEV SCORING", text: JSON.stringify(this._decision.debug) });
            this._step = 0; this.showStep();
            this.footer(["The selected Party Leader resolves interruption decisions autonomously.", "No tactic or obedience roll is used."]);
        }
        showStep() {
            if (this._step >= this._steps.length) {
                const result = progression.resolveExpeditionEvent(managerState(), this._teamKey, this._event, this._decision, Date.now());
                if (result.phase === "choice") this.showManagementChoice(); else SceneManager.goto(Scene_RPGHome);
                return;
            }
            const step = this._steps[this._step++];
            if (step.check) {
                this._dialogue?.hide();
                this._rollWindow = new Window_RPGD20(new Rectangle(214, 108, Graphics.boxWidth - 226, 344), step.check, step.title, () => {
                    this._rollWindow.parent?.removeChild(this._rollWindow); this._rollWindow.destroy(); this._rollWindow = null; this._dialogue.show(); this.showStep();
                });
                this.addWindow(this._rollWindow); return;
            }
            this._dialogue.setDialogue(step.speaker, step.text, this.showStep.bind(this));
        }
        showManagementChoice() {
            const trip = progression.tripForTeam(managerState(), this._teamKey);
            this._facts.contents.clear(); this._facts.line("CONTINUE QUEST OR RETURN TO HAMLET", 0, ColorManager.crisisColor(), 22);
            this._facts.wrapped(trip.choiceReason || "Continuing carries further danger.", 34);
            this._management = new Window_RPGDecisionChoices(new Rectangle(12, 430, Graphics.boxWidth - 24, 124), () => [
                { name: "CONTINUE QUEST", symbol: "continue" }, { name: "RETURN TO HAMLET", symbol: "return" }
            ]);
            this._management.setHandler("continue", () => this.resolveManagement(true));
            this._management.setHandler("return", () => this.resolveManagement(false));
            this._management.setHandler("cancel", () => this.resolveManagement(false)); this.addWindow(this._management);
        }
        resolveManagement(continueQuest) {
            progression.resolveExpeditionChoice(managerState(), this._teamKey, continueQuest, Date.now()); SceneManager.goto(Scene_RPGHome);
        }
    }

    class Scene_RPGRecall extends Scene_RPGBase {
        prepare(id){this._expectedTripId=id;}
        create(){super.create();const trip=progression.tripForTeam(managerState(),"A");if(!trip?.realtime){SceneManager.goto(Scene_RPGHome);return;}this._expectedTripId||=trip.id;this.header("Recall expedition","Choose whether the party should turn for home.");
            const panel=this.panel(new Rectangle(50,130,Graphics.boxWidth-100,230));panel.setLines(["Head back to camp? Recall again to arrive immediately.","Future encounters stop immediately.","Normal completion Gold, Arcana and XP are forfeited.","Previous finds, wounds, deaths and Armor loss remain.","The countdown continues while the party walks left toward camp."]);
            this.footer(["Keep Session Running is selected by default.","The timer continues normally while you consider this choice."]);const cancel=()=>{closeManagerDialog();this.popScene();};
            const modal=managerModal("Recall this quest?",["Future encounters stop. Completion rewards and XP are forfeited.","Previous finds and consequences remain; the countdown continues on the road home."],[{name:"Keep Session Running",run:cancel},{name:"Confirm Recall",run:()=>{syncMissionClock();const result=progression.requestRecall(managerState());closeManagerDialog();SceneManager.goto(Scene_RPGHome);managerState().recoveryNotice=result.message;}}],cancel);modal.element.classList.add("recall-confirmation");modal.buttons[0].focus();}
    }

    class Scene_RPGExpeditionChoice extends Scene_RPGBase {
        prepare(teamKey) { this._teamKey = teamKey; }
        create() {
            super.create(); const trip = progression.tripForTeam(managerState(), this._teamKey);
            if (!trip || trip.phase !== "choice") { SceneManager.goto(Scene_RPGHome); return; }
            this.header("Press On?", `Team ${this._teamKey} awaits a guild decision`);
            const panel = this.panel(new Rectangle(12, 108, Graphics.boxWidth - 24, 250));
            panel.line("CONTINUE QUEST OR RETURN TO HAMLET", 0, ColorManager.crisisColor(), 25);
            panel.wrapped(trip.choiceReason || "Further danger lies ahead.", 42);
            const wounded = trip.preparedTeam.filter(member => trip.expeditionInjuries?.[member.id] && !trip.expeditionDeaths?.[member.id]);
            panel.line(`Wounded: ${wounded.length ? wounded.map(member => member.name).join(", ") : "None"}`, 112, wounded.length ? ColorManager.deathColor() : ColorManager.normalColor(), 18);
            panel.wrapped("A Wounded adventurer knocked out again must make a Death Save. Success leaves them critically incapacitated; failure is permanent death.", 146);
            this._choices = new Window_RPGDecisionChoices(new Rectangle(12, 370, Graphics.boxWidth - 24, 130), () => [
                { name: "CONTINUE QUEST", symbol: "continue" }, { name: "RETURN TO HAMLET", symbol: "return" }
            ]);
            this._choices.setHandler("continue", () => this.resolve(true)); this._choices.setHandler("return", () => this.resolve(false));
            this._choices.setHandler("cancel", () => this.resolve(false)); this.addWindow(this._choices);
            this.footer(["Continue resumes the authored expedition sequence.", "Return starts the return timer; settlement remains one-time on arrival."]);
        }
        resolve(continueQuest) { progression.resolveExpeditionChoice(managerState(), this._teamKey, continueQuest, Date.now()); SceneManager.goto(Scene_RPGHome); }
    }

    class Scene_RPGQuestBoard extends Scene_RPGBase {
        create(){
            super.create();const prep=managerState().preparation||{};this._minutes=progression.EXPEDITION_DURATIONS.includes(Number(prep.durationMinutes))?Number(prep.durationMinutes):25;this._difficulty=this._minutes===1?1:Math.max(1,Math.min(5,Number(prep.difficulty)||1));const random=new Uint32Array(2);crypto.getRandomValues(random);this._questSeed=`quest-${managerState().nextTripId||1}-${random[0].toString(36)}${random[1].toString(36)}`;this.regenerate();
            this.header("Start Quest","Set the focus session. Your party will choose a fitting quest when they depart.");
            this._info=this.panel(new Rectangle(154,112,Graphics.boxWidth-308,62));
            this._info.contents.clear();
            CozyUI.text(this._info,"CHOOSE LENGTH AND DIFFICULTY OF QUEST",0,11,this._info.innerWidth,18,"#f1d897","center",28);
            this._footer=this.footer(["The game selects a random fitting quest at departure.","Escape returns to camp without starting anything."]);this.mountFilters();
            const start=document.createElement("button"),r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;
            start.id="start-quest";start.textContent="⚔  START QUEST  ⚔";start.setAttribute("aria-label","Start quest — primary action");start.style.cssText=`position:fixed;z-index:23;left:${r.left+202*scale}px;top:${r.top+397*scale}px;width:${412*scale}px;height:${66*scale}px;background:linear-gradient(#fff2b8,#e8a928);color:#261a39;border:3px solid #fff8d6;border-bottom-color:#8e6629;border-radius:14px;box-shadow:0 0 ${18*scale}px #ffc84dcc,0 ${5*scale}px 0 #7b5724,0 ${10*scale}px ${22*scale}px #090d1f99;font:bold ${29*scale}px Trebuchet MS;letter-spacing:${1.5*scale}px;cursor:pointer;text-shadow:0 1px #fff9`;
            start.onclick=()=>this.chooseQuest();for(const e of ["mousedown","mouseup","keydown","keyup"])start.addEventListener(e,e=>e.stopPropagation());document.body.appendChild(start);enableMobileTapSafety(start);this._startQuestButton=start;
            const back=document.createElement("button");back.id="quest-back-to-hub";back.textContent="← Back to Hub";back.style.cssText=`position:fixed;z-index:23;left:${r.left+22*scale}px;top:${r.top+402*scale}px;width:${155*scale}px;height:${48*scale}px;background:#293b66;color:#fff0ce;border:2px solid #9eaecc;border-radius:10px;font:bold ${16*scale}px Trebuchet MS;cursor:pointer`;back.onclick=()=>this.popScene();for(const e of ["mousedown","mouseup","keydown","keyup"])back.addEventListener(e,e=>e.stopPropagation());document.body.appendChild(back);this._questBackButton=back;
        }
        regenerate(){const state=managerState(),sameSettings=Number(state.preparation?.durationMinutes)===this._minutes&&Number(state.preparation?.difficulty)===this._difficulty;this._journey=progression.generateJourney($dataRPGManagerStage3,{durationMinutes:this._minutes,difficulty:this._difficulty,seed:this._questSeed,ritualsUnlocked:state.ritualsUnlocked,excludeThemeId:sameSettings?state.preparation?.themeId:null,excludeOppositionId:sameSettings?state.preparation?.oppositionId:null});window.RPGManager.generatedJourney=this._journey;const index=$dataRPGManagerStage3.quests.findIndex(q=>q.id===this._journey.id);if(index>=0)$dataRPGManagerStage3.quests[index]=this._journey;else $dataRPGManagerStage3.quests.push(this._journey);state.selectedQuestId=this._journey.id;}
        mountFilters(){
            const el=document.createElement("section"),r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;
            el.id="quest-filters";el.style.cssText=`position:fixed;z-index:22;left:${r.left+72*scale}px;top:${r.top+188*scale}px;width:${672*scale}px;height:${192*scale}px;background:linear-gradient(135deg,#5b3b20,#2b2340 62%,#172b50);color:#fff0ce;padding:${10*scale}px ${12*scale}px;box-sizing:border-box;border:3px double #e5c878;border-radius:${12*scale}px;box-shadow:inset 0 0 0 2px #1c1530,inset 0 ${24*scale}px ${34*scale}px #ffffff0b,0 ${8*scale}px ${20*scale}px #0009;font:${14*scale}px Trebuchet MS;display:grid;grid-template-rows:1fr 1fr;gap:${8*scale}px`;
            const effects=document.createElement("style");effects.id="quest-card-effects";effects.textContent='@keyframes questCardShimmer{0%,70%{transform:translateX(-140%) skewX(-18deg)}100%{transform:translateX(340%) skewX(-18deg)}}.quest-setting-choice{position:relative;isolation:isolate}.quest-setting-choice::before{content:"";position:absolute;z-index:-1;inset:2px;border-radius:6px;background:linear-gradient(105deg,transparent 34%,#fff8cf99 49%,transparent 64%);transform:translateX(-140%) skewX(-18deg)}.quest-setting-choice[aria-pressed="true"]::before{animation:questCardShimmer 2.8s ease-in-out infinite}.quest-setting-choice:hover{filter:brightness(1.09);transform:translateY(-3px)}.quest-minute-number{display:grid;place-items:center;width:39px;height:39px;margin:3px auto 1px;border:2px solid #a46c1e;border-radius:50%;background:radial-gradient(circle at 38% 30%,#fff9d8,#e8c36f 58%,#a97125);box-shadow:inset 0 2px #fffdeb,inset 0 -3px #704514,0 2px 3px #3d260977;color:#342009;font:bold 20px Georgia;text-shadow:0 1px #fff3bd}.quest-minute-label{font:bold 8px Georgia;color:#5b3a12;letter-spacing:.15px}.quest-card-art{display:block;width:50px;height:49px;margin:-4px auto 0;background-image:url("img/pictures/ui/QuestSelectionIllustrations_v1.png");background-size:284px 142px;background-repeat:no-repeat;filter:drop-shadow(0 2px 1px #3d2609aa)}.quest-difficulty-label{position:absolute;left:3px;right:3px;bottom:3px;height:17px;display:grid!important;place-items:center;padding:0 2px;border:1px solid #d9bb6c;border-radius:4px;background:linear-gradient(#344f7c,#1c2e52);color:#fff5cf!important;font:bold 10px Georgia!important;line-height:15px!important;text-shadow:0 1px #07142b;overflow:visible!important;text-overflow:clip!important}.quest-card-seal{position:absolute;right:3px;top:3px;width:17px;height:17px;display:grid;place-items:center;border:1px solid #eaffd8;border-radius:50%;background:radial-gradient(#70df80,#176c35);color:white;font:bold 12px Georgia;box-shadow:0 2px 4px #102814aa;opacity:0;transform:scale(.55);transition:.14s}.quest-setting-choice[aria-pressed="true"] .quest-card-seal{opacity:1;transform:scale(1)}';document.head.appendChild(effects);this._questCardEffects=effects;
            const difficultyCenters=[29,86,141,199,253];
            const minuteCard=value=>`<span class="quest-minute-number" aria-hidden="true">${value}</span><strong class="quest-minute-label">MINUTES</strong><i class="quest-card-seal" aria-hidden="true">✓</i>`;
            const shield=(value,name,index)=>`<span class="quest-card-art" aria-hidden="true" style="background-position:${25-difficultyCenters[index]}px -70px"></span><strong class="quest-difficulty-label">${name.toUpperCase()}</strong><i class="quest-card-seal" aria-hidden="true">✓</i>`;
            const add=(label,values,current,change)=>{const group=document.createElement("div"),title=document.createElement("strong"),list=document.createElement("div"),select=document.createElement("select");group.style.cssText="min-width:0;display:grid;grid-template-columns:112px minmax(0,1fr);align-items:center;gap:8px";title.textContent=label==="Minutes"?"QUEST LENGTH":"DIFFICULTY";title.style.cssText="box-sizing:border-box;padding:10px 5px;border:1px solid #d4b66d;border-radius:8px;background:linear-gradient(#394e76,#202e50);box-shadow:inset 0 1px #ffffff33,0 3px 6px #0006;font:700 14px Georgia;color:#ffe6a1;text-align:center;letter-spacing:.5px;text-shadow:0 1px #111";list.style.cssText=`display:grid;grid-template-columns:repeat(${values.length},minmax(0,1fr));gap:${6*scale}px;min-width:0`;select.setAttribute("aria-label",label);select.style.display="none";const buttons=[];const paint=()=>{for(const {button,value} of buttons){const chosen=String(value)===select.value;button.setAttribute("aria-pressed",String(chosen));button.style.background=chosen?"linear-gradient(155deg,#fff4c9,#e6d294 58%,#b9d7a5)":"linear-gradient(155deg,#fff6d6,#e5c985 60%,#b98a3d)";button.style.color="#35250e";button.style.borderColor=chosen?"#bff2ad":"#f7dfa0";button.style.boxShadow=chosen?"inset 0 2px #ffffffcc,inset 0 0 0 2px #4b9b55,0 0 0 2px #d7f8bf,0 6px 10px #071a0c99":"inset 0 2px #fffdf0,inset 0 0 0 1px #9b6b27,0 4px 0 #704a19,0 7px 10px #10152d99";}};for(const [index,v] of values.entries()){const o=document.createElement("option");o.value=v;o.textContent=label==="Minutes"?`${v} minutes`:progression.dangerLabel({skulls:Number(v)});o.selected=String(v)===String(current);select.appendChild(o);const button=document.createElement("button"),name=progression.dangerLabel({skulls:Number(v)});button.type="button";button.className="quest-setting-choice";button.setAttribute("aria-label",label==="Minutes"?`${v} minutes`:name);button.innerHTML=label==="Minutes"?minuteCard(v):shield(v,name,index);button.style.cssText=`box-sizing:border-box;min-width:0;height:${70*scale}px;padding:${1*scale}px ${2*scale}px ${3*scale}px;border:${2*scale}px solid;border-radius:${9*scale}px;font:bold ${11*scale}px Georgia;cursor:pointer;line-height:${12*scale}px;overflow:hidden;transition:transform .1s ease,filter .12s ease,box-shadow .14s ease`;button.onpointerdown=()=>button.style.transform=`translateY(${3*scale}px) scale(.98)`;button.onpointerup=button.onpointerleave=()=>button.style.transform="none";button.onclick=()=>{select.value=String(v);select.dispatchEvent(new Event("change"));SoundManager.playCursor();};list.appendChild(button);buttons.push({button,value:v});}select.onchange=()=>{change(select.value);if(this._minutes===1)this._difficulty=1;if(label==="Minutes"&&this._minutes===1){const difficulty=this._questFilters?.querySelector('select[aria-label="Difficulty"]');if(difficulty){difficulty.value="1";difficulty.dispatchEvent(new Event("change"));return;}}paint();this.regenerate();};group.append(title,list,select);el.appendChild(group);paint();};
            add("Minutes",progression.EXPEDITION_DURATIONS,this._minutes,v=>this._minutes=Number(v));add("Difficulty",[1,2,3,4,5],this._difficulty,v=>this._difficulty=Number(v));
            const oneMinuteButton=el.querySelector('button[aria-label="1 minutes"]');
            oneMinuteButton?.addEventListener("click",()=>{
                for(const button of el.querySelectorAll('button[aria-label$=" minutes"]')){
                    const chosen=button===oneMinuteButton;
                    button.setAttribute("aria-pressed",String(chosen));
                    button.style.background=chosen?"linear-gradient(155deg,#fff4c9,#e6d294 58%,#b9d7a5)":"linear-gradient(155deg,#fff6d6,#e5c985 60%,#b98a3d)";
                    button.style.borderColor=chosen?"#bff2ad":"#f7dfa0";
                    button.style.boxShadow=chosen?"inset 0 2px #ffffffcc,inset 0 0 0 2px #4b9b55,0 0 0 2px #d7f8bf,0 6px 10px #071a0c99":"inset 0 2px #fffdf0,inset 0 0 0 1px #9b6b27,0 4px 0 #704a19,0 7px 10px #10152d99";
                }
            });
            for(const event of ["keydown","keyup","mousedown","mouseup"])el.addEventListener(event,e=>e.stopPropagation());document.body.appendChild(el);enableMobileTapSafety(el);this._questFilters=el;
            this._filterBlur=e=>{if(!el.contains(e.target)&&el.contains(document.activeElement))document.activeElement.blur();};document.addEventListener("pointerdown",this._filterBlur);
        }
        update(){super.update();if(!managerDialog&&Input.isTriggered("cancel"))this.popScene();if(!managerDialog&&Input.isTriggered("pageup"))this._questFilters.querySelector("select").focus();}
        terminate(){this._startQuestButton?.remove();this._questBackButton?.remove();this._questEnemyPicture?.remove();this._questCardEffects?.remove();document.removeEventListener("pointerdown",this._filterBlur);this._questFilters?.remove();super.terminate();}
        lockReason(quest) { const active=progression.questUnavailableReason(managerState(),quest.id);if(active)return active;const needed=quest.unlock?.questsCompleted||0;return needed>(managerState().campaignStats?.questsCompleted||0)?quest.unlock.label:""; }
        chooseQuest() {
            if(managerDialog)return;
            const quest=this._journey,state=managerState();
            const eligible=progression.activeRoster(state).filter(n=>!progression.isUnavailable(state,n.id));
            const error=this.lockReason(quest)||progression.teamError(state,eligible.slice(0,1).map(n=>n.id));
            if(error){SoundManager.playBuzzer();this._footer.setLines([error,"Assign one to three companions before embarking. Recruit for free at Tavern."]);return;}
            showQuestPartySelection(this,quest);

        }
    }

    const STRATEGY_INFO = {
        Aggressive: { short: "Pursue weak / ATK +25%", lines: [
            "Advance and focus wounded or high-value enemies.",
            "Existing modifier: attack +25%; incoming damage +15%." ] },
        Defensive: { short: "Hold / protect backline", lines: [
            "Hold formation and intercept threats against vulnerable allies.",
            "Existing modifier: attack -15%; incoming damage -25%." ] },
        Tactical: { short: "Threat focus / coordinate", lines: [
            "Focus dangerous casters, ready signatures, and high-value roles.",
            "Normal damage; coordinated targets stay stable while sensible." ] },
        Support: { short: "Assist / safer formation", lines: [
            "Support roles stay safe and answer threats against vulnerable allies.",
            "Classes without an applicable support action attack normally." ] }
    };

    class Window_RPGOrders extends Window_HorzCommand {
        itemHeight() { return 72; }
        maxCols() { return 4; }
        makeCommandList() { for (const order of progression.EXPEDITION_ORDERS) this.addCommand(order.name, order.id, true, order); }
        drawItem(index) {
            const rect = this.itemRect(index), order = this._list[index]?.ext;
            this.changePaintOpacity(true); this.changeTextColor("#d7b56d"); this.contents.fontSize = 17;
            this.drawText(order.name, rect.x, rect.y, rect.width, "center");
            this.changeTextColor("#dddddd"); this.contents.fontSize = 11;
            const words = order.description.split(/\s+/); let line = "", y = rect.y + 24;
            for (const word of words) { const next = line ? `${line} ${word}` : word; if (line && this.textWidth(next) > rect.width - 8) { this.drawText(line, rect.x + 4, y, rect.width - 8, "center"); y += 16; line = word; } else line = next; }
            this.drawText(line, rect.x + 4, y, rect.width - 8, "center");
        }
    }

    class Window_RPGStrategy extends Window_HorzCommand {
        itemHeight() { return 72; }
        maxCols() { return 4; }
        makeCommandList() {
            for (const name of Object.keys(STRATEGY_INFO)) {
                const state = this.battle?.snapshot();
                this.addCommand(name, name, !state || (state.status === "running" &&
                    state.strategyCooldown === 0 && state.strategy !== name));
            }
        }
        drawItem(index) {
            const name = this.commandSymbol(index), state = this.battle?.snapshot();
            const rect = this.itemRect(index);
            const current = state?.strategy === name;
            const locked = state && state.strategyCooldown > 0;
            const ended = state && state.status !== "running";
            const status = ended ? (current ? "FINAL STRATEGY" : "BATTLE ENDED") :
                locked ? `${current ? "ACTIVE / " : ""}WAIT ${state.strategyCooldown} ACTIONS` :
                current ? "ACTIVE" : state ? "READY - select to switch" : "Select to begin travel";
            this.changePaintOpacity(true);
            this.contents.fontSize = 18;
            this.changeTextColor(current ? "#82e6a9" : "#ffffff");
            this.drawText(name, rect.x, rect.y, rect.width, "center");
            this.contents.fontSize = 12;
            this.changeTextColor(ended ? "#aaaaaa" : locked ? "#ffc46b" : current ? "#82e6a9" : "#8edaff");
            this.drawText(status, rect.x, rect.y + 23, rect.width, "center");
            this.changeTextColor("#dddddd");
            this.drawText(STRATEGY_INFO[name].short, rect.x, rect.y + 45, rect.width, "center");
        }
    }

    class Window_RPGDeparture extends Window_HorzCommand {
        initialize(rect){this._canDepart=true;super.initialize(rect);}
        maxCols() { return 2; }
        makeCommandList() {
            this.addCommand("Depart", "depart", this._canDepart);
            this.addCommand("Back to Home", "cancel");
        }
        setCanDepart(value){this._canDepart=!!value;this.refresh();if(!this._canDepart)this.selectSymbol("cancel");}
        drawItem(index){const r=this.itemRect(index),enabled=this.isCommandEnabled(index);this.changePaintOpacity(enabled);CozyUI.round(this.contents,r.x+3,r.y+2,r.width-6,r.height-4,index===0?"#526344":"#293e78",index===0?"#b8ca8a":"#97815b",5);CozyUI.text(this,index===0?"SET OUT ON AN ADVENTURE":"Back to Home",r.x+12,r.y+3,r.width-24,17,"#f4e8cf","center",30);this.changePaintOpacity(true);}
    }
    class Window_RPGContractDanger extends Window_HorzCommand {
        maxCols() { return 3; }
        itemHeight() { return 82; }
        makeCommandList() {
            this.addCommand("CAUTIOUS\nLower risk / 80% rewards", "cautious");
            this.addCommand("STANDARD\nNormal risk / rewards", "standard");
            this.addCommand("PERILOUS\nHigher risk / 130% rewards", "perilous");
        }
        drawItem(index) {
            const rect = this.itemRect(index), parts = this.commandName(index).split("\n");
            this.contents.fontBold = true; this.contents.fontSize = 18; this.changeTextColor(["#8edaff", "#ffffff", "#ffb070"][index]);
            this.drawText(parts[0], rect.x, rect.y + 5, rect.width, "center");
            this.contents.fontBold = false; this.contents.fontSize = 12; this.resetTextColor(); this.drawText(parts[1], rect.x, rect.y + 34, rect.width, "center");
        }
    }

    class Scene_RPGPreparation extends Scene_RPGBase {
        create() {
            super.create();this._durationMinutes=selectedQuest().durationMinutes;
            this._header = this.header("Final Party Review", "Personnel and leadership are the expedition plan; combat is autonomous.");
            this._info = this.panel(new Rectangle(12,108,Graphics.boxWidth-24,292));
            this._brief=this.panel(new Rectangle(12,412,Graphics.boxWidth-24,72));
            this._departure = new Window_RPGDeparture(new Rectangle(12, 496, Graphics.boxWidth - 24, 68));
            this._departure.setHandler("depart", this.depart.bind(this));
            this._departure.setHandler("cancel", () => this.popScene());
            this.addWindow(this._departure);
            this.showDeparture();
        }
        showDeparture() {
            this._departure.show(); this._departure.activate();
            const quest = selectedQuest(), validation=validateTeam(teamIds());
            if(validation){this._header.setLines(["Expedition","Party setup required"]);this._info.setLines(["CANNOT DEPART",validation,"Choose Back to Home, then use Start Quest to form a party."]);this._departure.setCanDepart(false);return;}
            this._departure.setCanDepart(true);
            const xp = quest.xpReward || progression.xpPreview(teamIds().length, $dataRPGManagerQuests.xp).perMember;
            const leader = findNpc(managerState().pendingLeaderId);
            this._header.setLines(["Expedition ready", `Party Leader: ${leader?.name || "NOT SELECTED"} | ${quest.faction}${quest.boss ? " | BOSS" : ""}`]);
            const p=this._info,ids=teamIds(),cardW=(p.innerWidth-16)/5;p.contents.clear();
            CozyUI.text(p,`YOUR TRAVELING COMPANY / ${ids.length} of 3 places`,8,0,p.innerWidth-16,19,"#e8c583");
            CozyUI.text(p,`Leader: ${leader?.name||"None"} / Fixed expedition time: ${this._durationMinutes} minutes`,8,31,p.innerWidth-16,15,"#c6b99d");
            ids.forEach((id,i)=>{const n=findNpc(id),x=8+i*cardW;CozyUI.round(p.contents,x,66,cardW-7,113,"#304b82","#897b54",5);CozyUI.portraitFrame(p,n,x+(cardW-7)/2-22,75,44);CozyUI.text(p,n.name,x+5,124,cardW-17,14,"#f4e8cf","center",20);CozyUI.text(p,`${n.health}/${n.maxHealth} HP / ${n.injury?"Wounded":"Ready"}`,x+5,149,cardW-17,12,n.injury?"#e9afa1":"#b8cea5","center",18);});
            CozyUI.wrap(p,`${quest.risk} risk: ${quest.danger}`,8,191,p.innerWidth-16,14,"#e4c994",2,20);
            CozyUI.text(p,`Encounters: ${questEnemies(quest).map(enemy=>enemy.name).join(", ")||quest.encounterType}`,8,239,p.innerWidth-16,13,"#c6b99d");
            this._brief.setLines([`Victory: ${quest.rewardGold.victory} Gold / ${quest.rewardArcana?.victory||0} Arcana / ${quest.xpPool??xp*ids.length} shared XP. Draw: ${quest.rewardGold.draw}g. Defeat: ${quest.rewardGold.defeat}g.`,`Plan locks at departure. Clocks run while minimized and pause when closed; Recall is the only intervention.`]);
        }
        depart() {
            try {
                const quest = selectedQuest();
                const state = managerState(), teamKey = state.activeTeam;
                progression.dispatchQuest(state, teamKey, quest, $dataRPGManagerQuests.xp, Date.now(), null, "standard", state.pendingLeaderId,this._durationMinutes);
                state.pendingLeaderId = null;
                window.RPGManager.lastBattle = null;
                SceneManager.goto(Scene_RPGHome);
            } catch (error) {
                SoundManager.playBuzzer();
                this.showDeparture();
                this._info.setLines([error.message, "Return Home to prepare your team."]);
            }
        }
    }

    class Window_RPGTravelSkip extends Window_HorzCommand {
        maxCols() { return 1; }
        makeCommandList() { this.addCommand("Skip Travel (testing)", "skip"); }
    }

    class Scene_RPGTravel extends Scene_RPGBase {
        prepare(battle, questId) { this._battle = battle; this._questId = questId; }
        create() {
            super.create();
            const active = managerState().activeQuest, quest = findQuest(active?.questId);
            this.header("Travelling", "Eventless outbound travel. Battle presentation begins on arrival.");
            this._arrival = performance.now() + quest.travelSeconds * 1000;
            this._timer = this.panel(new Rectangle(12, 180, Graphics.boxWidth - 24, 120));
            const speaker = findNpc(teamIds()[0]);
            this._departureLine = this.panel(new Rectangle(12, 310, Graphics.boxWidth - 24, 72));
            portrait(this._departureLine, speaker, 0, 0, 44);
            this._departureLine.contents.fontSize = 18;
            this._departureLine.drawText(`${speaker.name}: ${progression.say(speaker, "departure")}`, 56, 0, this._departureLine.innerWidth - 60);
            const skip = new Window_RPGTravelSkip(new Rectangle(12, 400, Graphics.boxWidth - 24, 68));
            skip.setHandler("skip", this.arrive.bind(this));
            this.addWindow(skip);
        }
        update() {
            super.update();
            if (this._arrived || !this.isActive() || SceneManager.isSceneChanging()) return;
            const seconds = Math.max(0, Math.ceil((this._arrival - performance.now()) / 1000));
            if (seconds !== this._seconds) {
                this._seconds = seconds;
                this._timer.setLines([`Arrival in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`, "No encounters or resource changes during outbound travel; battle time is separate."]);
            }
            if (seconds === 0) this.arrive();
        }
        arrive() {
            if (this._arrived) return;
            this._arrived = true;
            SceneManager.goto(Scene_RPGBattle);
            SceneManager.prepareNextScene(this._battle, this._questId);
        }
    }

    // Presentation consumes simulation events; it never chooses attacks or damage.
    function drawBattleHeart(bitmap,x,y,size,filled){
        const c=bitmap.context;c.save();c.beginPath();c.moveTo(x+size/2,y+size);c.bezierCurveTo(x+size*.12,y+size*.7,x,y+size*.42,x,y+size*.28);c.bezierCurveTo(x,y,x+size*.36,y-size*.05,x+size/2,y+size*.23);c.bezierCurveTo(x+size*.64,y-size*.05,x+size,y,x+size,y+size*.28);c.bezierCurveTo(x+size,y+size*.46,x+size*.88,y+size*.7,x+size/2,y+size);c.closePath();c.fillStyle=filled?"#ef5b68":"#342d35";c.fill();c.strokeStyle=filled?"#ffd0d4":"#655865";c.lineWidth=1;c.stroke();c.restore();bitmap._baseTexture.update();
    }
    function drawBattleShield(bitmap,x,y,size,filled=true){
        const c=bitmap.context;c.save();c.beginPath();c.moveTo(x+size/2,y);c.lineTo(x+size,y+size*.2);c.lineTo(x+size*.86,y+size*.72);c.lineTo(x+size/2,y+size);c.lineTo(x+size*.14,y+size*.72);c.lineTo(x,y+size*.2);c.closePath();c.fillStyle=filled?"#91b9d5":"#34363b";c.fill();c.strokeStyle=filled?"#e4f5ff":"#646970";c.lineWidth=1;c.stroke();c.restore();bitmap._baseTexture.update();
    }
    function drawBattleWard(bitmap,x,y,size,filled=true){
        const c=bitmap.context;c.save();c.beginPath();c.ellipse(x+size/2,y+size/2,size*.46,size*.34,-.35,0,Math.PI*2);c.fillStyle=filled?"#8e44d8":"#39363e";c.fill();c.beginPath();c.ellipse(x+size/2,y+size/2,size*.27,size*.17,-.35,0,Math.PI*2);c.fillStyle="#26143d";c.fill();c.beginPath();c.arc(x+size*.7,y+size*.28,size*.1,0,Math.PI*2);c.fillStyle=filled?"#e2a8ff":"#68616e";c.fill();c.restore();bitmap._baseTexture.update();
    }
    function battleLogLines(event) {
        const entry = (text, color) => ({ text, color });
        if (event.type === "strategy") return [entry(
            `New orders: ${event.strategy}! ${STRATEGY_INFO[event.strategy].short}. Orders lock for ${event.cooldown} actions.`, "#ffc46b")];
        if (event.type === "round") return [entry(`Round ${event.round} - The fighters square up for another exchange.`, "#ffc46b")];
        if (event.type === "attack") {
            const signature = event.kind === "signature";
            const color = "#ffadb5";
            return [entry(signature ?
                `${event.actorName} unleashes ${event.attackName}! ${event.targetName} takes ${event.damage} damage.` :
                `${event.actorName} strikes ${event.targetName} with ${event.attackName} for ${event.damage} damage.`, color),
                entry(`${signature ? "Signature" : "Basic"} hit - ${event.targetName} ${event.targetHealth === 0 ? "can fight no longer" : "holds on"}.`, signature ? "#dfafff" : color)];
        }
        if (event.type === "heal") return [entry(`${event.actorName} restores ${event.healing ?? event.heal ?? event.amount} HP to ${event.targetName}.`, "#8ff0b3")];
        if (event.type === "defeat") return [entry(`${event.name} falls! ${event.side === "player" ? "Your team must carry on without them." : "One fewer foe stands in your way."}`, "#ff8383")];
        if (event.type === "result") return [entry(event.outcome === "victory" ?
            "VICTORY! Your team holds the field." : event.outcome === "defeat" ?
            "DEFEAT. Your team can fight no further." : "DRAW. Neither side breaks through before time is called.", event.outcome === "victory" ? "#82e6a9" : "#ffc46b")];
        return [];
    }

    class Window_RPGBattleLog extends Window_Selectable {
        initialize(rect) {
            this._lines = [];
            this._followLatest = true;
            super.initialize(rect);
        }

        lineHeight() { return 26; }
        itemHeight() { return 30; }
        maxItems() { return this._lines.length; }
        drawItemBackground() { /* Plain text keeps the log readable. */ }
        processTouch() { /* Read-only text, never a selectable command. */ }
        processCursorMove() { /* Scrolling is handled without a selection. */ }
        processHandling() { /* Scene buttons own Enter and Esc. */ }
        refreshCursor() { this.setCursorRect(0, 0, 0, 0); }
        isScrollEnabled() { return true; }
        updateArrows() { this.upArrowVisible = false; this.downArrowVisible = false; }

        resetFontSettings() {
            super.resetFontSettings();
            this.contents.fontSize = 18;
        }

        drawItem(index) {
            const rect = this.itemLineRect(index);
            const entry = this._lines[index];
            this.changeTextColor(entry.color || ColorManager.normalColor());
            this.drawText(entry.text, rect.x, rect.y, rect.width);
        }

        append(lines) {
            const width = this.innerWidth - this.colSpacing() - this.itemPadding() * 2;
            for (const value of lines) {
                const { text, color } = typeof value === "string" ? { text: value } : value;
                let line = "";
                for (const word of text.split(/\s+/)) {
                    const next = line ? `${line} ${word}` : word;
                    if (line && this.textWidth(next) > width) {
                        this._lines.push({ text: line, color });
                        line = word;
                    } else {
                        line = next;
                    }
                }
                this._lines.push({ text: line, color });
            }
            this.refresh();
            if (this._followLatest) this.scrollTo(0, this.maxScrollY());
        }

        followLatest() {
            this._followLatest = true;
            this.scrollTo(0, this.maxScrollY());
        }

        scrollHistory(direction) {
            this.scrollLog(direction * Math.max(1, this.maxPageRows() - 1) * this.itemHeight());
        }

        scrollLog(pixels) {
            this._followLatest = false;
            this.setScrollAccel(0, 0);
            this._scrollDuration = 0;
            this.scrollBy(0, pixels);
            this._followLatest = this.scrollY() >= this.maxScrollY();
        }

        processWheelScroll() {
            if (this.visible && this.isTouchedInsideFrame() && Math.abs(TouchInput.wheelY) >= 20) {
                this.scrollHistory(Math.sign(TouchInput.wheelY));
            }
        }

        onTouchScrollStart() {
            this._followLatest = false;
            super.onTouchScrollStart();
        }

        update() {
            super.update();
            // Keyboard history controls work without taking focus from Home.
            if (this.visible && !this.active) {
                if (Input.isRepeated("pageup")) this.scrollHistory(-1);
                if (Input.isRepeated("pagedown")) this.scrollHistory(1);
                if (Input.isRepeated("up")) this.scrollLog(-this.itemHeight());
                if (Input.isRepeated("down")) this.scrollLog(this.itemHeight());
                if (!this._scrollTouching && this.scrollY() >= this.maxScrollY()) this._followLatest = true;
            }
        }
    }

    class Window_RPGLogScrollbar extends Window_Base {
        initialize(rect, log) {
            this._log = log;
            super.initialize(rect);
            this._dragOffset = null;
        }
        geometry() {
            const top = 38, height = this.innerHeight - 76;
            const max = this._log.maxScrollY();
            const thumbHeight = Math.min(height, Math.max(24, height * this._log.innerHeight / (this._log.innerHeight + max)));
            const travel = height - thumbHeight;
            return { top, height, thumbHeight, travel, max,
                thumbTop: top + (max ? this._log.scrollY() / max * travel : 0) };
        }
        update() {
            super.update();
            if (!this.visible) return;
            const p = this.worldTransform.applyInverse(new Point(TouchInput.x, TouchInput.y));
            const y = p.y - this.padding;
            const g = this.geometry();
            if (TouchInput.isTriggered() && this.innerRect.contains(p.x, p.y)) {
                if (y < g.top) this._log.scrollLog(-this._log.itemHeight());
                else if (y >= g.top + g.height) this._log.scrollLog(this._log.itemHeight());
                else if (g.max > 0) {
                    this._dragOffset = y >= g.thumbTop && y <= g.thumbTop + g.thumbHeight ? y - g.thumbTop : g.thumbHeight / 2;
                }
            }
            if (this._dragOffset !== null && TouchInput.isPressed()) {
                const target = g.travel ? Math.max(0, Math.min(1, (y - g.top - this._dragOffset) / g.travel)) * g.max : 0;
                this._log.scrollLog(target - this._log.scrollY());
            }
            if (!TouchInput.isPressed()) this._dragOffset = null;
            const key = `${this._log.scrollY()}:${g.max}:${this._dragOffset !== null}`;
            if (key !== this._paintKey) { this._paintKey = key; this.refresh(); }
        }
        refresh() {
            const g = this.geometry(), w = this.innerWidth;
            this.contents.clear();
            this.contents.fontSize = 22;
            this.changePaintOpacity(this._log.scrollY() > 0);
            this.drawText("▲", 0, 0, w, "center");
            this.changePaintOpacity(this._log.scrollY() < g.max);
            this.drawText("▼", 0, this.innerHeight - 34, w, "center");
            this.changePaintOpacity(true);
            this.contents.fillRect(4, g.top, w - 8, g.height, "#172431");
            this.contents.fillRect(4, g.thumbTop, w - 8, g.thumbHeight, this._dragOffset !== null ? "#b6e8f5" : "#76b8cc");
        }
    }

    class Window_RPGBattleCommands extends Window_HorzCommand {
        initialize(rect) {
            this._finished = false;
            super.initialize(rect);
        }

        maxCols() { return 1; }

        resetFontSettings() {
            super.resetFontSettings();
            this.contents.fontSize = 22;
        }

        makeCommandList() {
            this.addCommand(this._finishLabel || "Return to Home", "home", this._finished);
        }

        finish(label = "Return to Home") {
            this._finishLabel = label;
            this._finished = true;
            this.refresh();
        }
    }

    // Two independent caption slots preserve reading time without a dialogue backlog.
    // Plain drawText renders authored text literally (no executable escape markup).
    class Window_RPGCaption extends Window_Base {
        lineHeight() { return 22; }
        busy() { return !!this._beat && performance.now() < this._until; }
        showBeat(npc, title, text, important = false) {
            this._beat = { npc, title, text };
            this._since = performance.now();
            this._until = this._since + (important ? BATTLE_TIMING.importantCaption : BATTLE_TIMING.caption);
            this.contents.clear();
            portrait(this, npc, 0, 0, 40);
            this.contents.fontSize = 16;
            this.changeTextColor("#efd1ff");
            this.drawText(title, 52, 0, this.innerWidth - 56);
            this.changeTextColor("#ffffff");
            let shown = text;
            while (shown.length && this.textWidth(shown + (shown === text ? "" : "...")) > this.innerWidth - 56) shown = shown.slice(0, -1);
            this.drawText(shown === text ? text : shown + "...", 52, 22, this.innerWidth - 56);
            this.show();
        }
        update() {
            super.update();
            if (this._paused) return;
            const now = performance.now();
            if (!this.busy()) { this.hide(); return; }
            this.contentsOpacity = Math.round(255 * Math.min(1, (now - this._since) / 150, (this._until - now) / 250));
        }
    }

    class Window_RPGHistoryButton extends Window_Base {
        initialize(rect, handler) {
            super.initialize(rect);
            this._handler = handler;
            this.contents.fontSize = 18;
            this.drawText("History / Close [Shift]", 0, 0, this.innerWidth, "center");
        }
        update() {
            super.update();
            if (TouchInput.isTriggered() && this.isTouchedInsideFrame()) this._handler();
        }
        isTouchedInsideFrame() {
            const p = this.worldTransform.applyInverse(new Point(TouchInput.x, TouchInput.y));
            return this.innerRect.contains(p.x, p.y);
        }
    }

    class Scene_RPGBattle extends Scene_RPGBase {
        prepare(battle, questId, teamKey = null) {
            this._battle = battle;
            this._questId = questId;
            this._teamKey = teamKey;
        }

        create() {
            super.create();
            this._finished = false;
            this._dialogueQueue = [];
            this._header = this.header("Quest Battle", "");
            this.createArena();
            this._strategies = { refresh() {}, activate() {}, deactivate() {}, hide() {}, show() {}, visible: false };
            const trip = this._teamKey ? progression.tripForTeam(managerState(), this._teamKey) : null;
            this._orderPanel = this.panel(new Rectangle(12, 302, Graphics.boxWidth - 24, 58));
            const leader = trip?.preparedTeam?.find(member => member.id === trip.leaderId);
            this._orderPanel.setLines([`Party Leader: ${leader?.name || "Unknown"}  |  Combat decisions are fully autonomous.`]);
            this._captions = [408, 474].map(y => {
                const w = new Window_RPGCaption(new Rectangle(12, y, Graphics.boxWidth - 24, 64));
                this.addWindow(w); w.hide(); return w;
            });
            this._logWindow = new Window_RPGBattleLog(new Rectangle(12, 108, Graphics.boxWidth - 80, Graphics.boxHeight - 196));
            this.addWindow(this._logWindow);
            this._logScrollbar = new Window_RPGLogScrollbar(new Rectangle(Graphics.boxWidth - 60, 108, 48, Graphics.boxHeight - 196), this._logWindow);
            this.addWindow(this._logScrollbar);
            this._historyButton = new Window_RPGHistoryButton(new Rectangle(12, Graphics.boxHeight - 76, 252, 68), () => this.toggleHistory());
            this.addWindow(this._historyButton);
            this._logWindow?.hide(); this._logScrollbar?.hide();
            this._commandWindow = new Window_RPGBattleCommands(new Rectangle(270, Graphics.boxHeight - 76, Graphics.boxWidth - 282, 68));
            this._commandWindow._finishLabel = "Battle in progress";
            this._commandWindow.refresh();
            this._commandWindow.setHandler("home", this.returnHome.bind(this));
            this._commandWindow.setHandler("cancel", () => this._historyOpen ? this.toggleHistory() : this.returnHome());
            this.addWindow(this._commandWindow);
            this._management = new Window_RPGDecisionChoices(new Rectangle(270, Graphics.boxHeight - 140, Graphics.boxWidth - 282, 132), () => [
                { name: "CONTINUE QUEST", symbol: "continue" }, { name: "RETURN TO HAMLET", symbol: "return" }
            ]);
            this._management.setHandler("continue", () => this.resolveBattleManagement(true));
            this._management.setHandler("return", () => this.resolveBattleManagement(false));
            this._management.setHandler("cancel", () => this.resolveBattleManagement(false));
            this.addWindow(this._management); this._management.hide(); this._management.deactivate();
            this._logWindow.append(["Battle history - paused while open. Shift / click History to close."]);
            this._commandWindow.deactivate();
            this._largePortrait = new Window_RPGLargePortrait(new Rectangle(12, 304, 180, 220)); this.addWindow(this._largePortrait); this._largePortrait.hide();
            this._narrativeDialogue = new Window_RPGDialogue(new Rectangle(188, 304, Graphics.boxWidth - 200, 220)); this.addWindow(this._narrativeDialogue); this._narrativeDialogue.hide();
            const decision = this._battle.openingDecision;
            if (decision) {
                const leader = this._battle.snapshot().fighters.find(f => f.side === "player" && f.id === decision.leaderId) || this._battle.snapshot().fighters.find(f => f.side === "player");
                if (decision.resolved) {
                    this._dialogueQueue.push({ npc: leader, title: "AUTONOMOUS DECISION", text: `${leader.name} considers the Order to ${progression.orderFor(decision.order).name}.  d20: ${decision.obedienceRoll} ${decision.obedienceModifier >= 0 ? "+" : ""}${decision.obedienceModifier}.`, important: true });
                    this._dialogueQueue.push({ npc: leader, title: decision.obeyed ? "ORDER OBEYED" : "ORDER IGNORED", text: `${decision.actionName}. Reasons: ${decision.reasons.join("; ")}.`, important: true });
                } else this._dialogueQueue.push({ npc: leader, title: "NO ELIGIBLE SPECIALIST", text: decision.message, important: true });
            }
            this.refreshBattle();
        }

        update() {
            super.update();
            if (Input.isTriggered("shift") || (this._historyOpen && Input.isTriggered("cancel"))) this.toggleHistory();
            if (this._historyOpen) return;
            if (!this.isActive() || this._finished || SceneManager.isSceneChanging()) return;
            this.updateBattleDialogue();
            if (this._narrativeActive || this._narrativeDialogue.isWaiting()) return;
            if (this._formationShift) { this.updateFormationShift(); return; }
            if (this._ending) {
                if (!this._dialogueQueue.length && !this._captions.some(w => w.busy())) this.settleBattle();
                return;
            }
            if (this._pending) {
                this.animateAttack();
                return;
            }
            if (this._battle.snapshot().status !== "running") { this.refreshBattle(); return; }
            let events = [], attack = null;
            for (let compressed = 0; compressed < 4 && this._battle.snapshot().status === "running"; compressed++) {
                events = this._battle.step();
                attack = events.find(e => e.type === "attack" || e.type === "heal");
                const meaningful = attack && (attack.kind === "signature" || attack.critical || attack.mortal || /BOSS:/.test(attack.actorName) || events.some(event => ["defeat", "result", "mortalIntent"].includes(event.type)));
                if (meaningful || !attack) break;
                this.applyRoutineEvents(events);
                events = []; attack = null;
            }
            if (!events.length) { this.refreshBattle(); return; }
            const beats = [], preBeats = [];
            const actorNpc = attack ? this._tokens.get(attack.actorKey)?.fighter : null;
            if (attack && (attack.kind === "signature" || attack.critical || attack.mortal || /BOSS:/.test(attack.actorName))) {
                preBeats.push({ npc: actorNpc, title: attack.mortal ? "MORTAL ATTACK" : attack.side === "enemy" ? "ENEMY INTENT" : "DECISIVE ACTION", text: `${attack.actorName} targets ${attack.targetName} with ${attack.attackName}.`, important: true });
            }
            if (attack?.kind === "signature") {
                const npc = this._tokens.get(attack.actorKey).fighter;
                preBeats.push({ npc, title: `SIGNATURE: ${attack.attackName}`, text: progression.say(npc, "signature", { target: attack.targetName, move: attack.attackName }), important: true });
            }
            for (const event of events.filter(e => e.type === "defeat")) {
                const npc = this._tokens.get(event.key).fighter;
                const trip = this._teamKey ? progression.tripForTeam(managerState(), this._teamKey) : null;
                const mortal = event.side === "player" && (npc.injury === "Wounded" && npc.injuryExpeditionId === trip?.id ||
                    events.some(entry => entry.type === "attack" && entry.targetKey === event.key && entry.mortal));
                const deathSave = events.find(entry => entry.type === "deathSave" && entry.key === event.key);
                const instantDeath = events.some(entry => entry.type === "attack" && entry.targetKey === event.key && entry.instantDeath);
                if (deathSave) {
                    beats.push({ npc, title: `${npc.name.toUpperCase()} HAS FALLEN`, text: mortal ? "A telegraphed execution threatens their life." : "Already Wounded, they now cling to life.", important: true });
                    beats.push({ npc, check: deathSave.check, title: "DEATH SAVE" });
                    beats.push({ npc, title: deathSave.survived ? (deathSave.check.natural20 ? "MIRACULOUS SURVIVAL" : "SURVIVES — INCAPACITATED") : `DEATH — ${npc.name}`,
                        text: deathSave.survived ? `${npc.name} survives, still Wounded and unable to fight.` : progression.say({ ...npc, alive: false }, "death"), important: true });
                } else if (event.side === "player" && instantDeath) {
                    beats.push({ npc, title: `PERMANENT DEATH - ${npc.name}`, text: progression.say({ ...npc, alive: false }, "death"), important: true });
                } else beats.push({ npc, title: event.side === "player" ? `WOUNDED - ${npc.name} FALLS` : `${npc.name} falls`,
                    text: progression.say(npc, "defeat"), important: true });
            }
            this._dialogueQueue.push(...preBeats);
            this._pending = { events, attack, beats, frame: 0 };
            this._strategies.refresh();
            this.refreshHeader();
        }

        applyRoutineEvents(events) {
            const attacks = events.filter(event => event.type === "attack" || event.type === "heal");
            for (const event of attacks) {
                const actor = this._tokens.get(event.actorKey), target = this._tokens.get(event.targetKey);
                if (target && Number.isFinite(event.targetHealth)) target.fighter.health = event.targetHealth;
                if(target&&Number.isFinite(event.targetArmor))target.fighter.armor=event.targetArmor;
                if(target&&Number.isFinite(event.targetWard)){const innate=Math.min(target.fighter.innateWard||0,event.targetWard);target.fighter.innateWard=innate;target.fighter.temporaryWard=Math.max(0,event.targetWard-innate);}
                if (actor && Number.isFinite(event.cooldown)) actor.fighter.cooldown = event.cooldown;
                if (events.some(entry => entry.type === "defeat" && entry.key === event.targetKey) && target) target.defeated = true;
                if (actor) this.drawToken(event.actorKey); if (target) this.drawToken(event.targetKey);
            }
            if (attacks.length) this._logWindow.append([`Routine exchange: ${attacks.map(event => `${event.actorName} hits ${event.targetName} (${event.damage})`).join("; ")}.`]);
            this._logWindow.append(events.filter(event => event.type === "result").flatMap(battleLogLines));
        }

        updateBattleDialogue() {
            if (this._narrativeActive || !this._dialogueQueue.length) return;
            const beat = this._dialogueQueue.shift();
            if (beat.check) {
                this._narrativeActive = true;
                this._largePortrait.setCharacter(beat.npc); this._largePortrait.show();
                this._rollWindow = new Window_RPGD20(new Rectangle(188, 180, Graphics.boxWidth - 200, 370), beat.check, beat.title, () => {
                    this._rollWindow.parent?.removeChild(this._rollWindow); this._rollWindow.destroy(); this._rollWindow = null;
                    this._narrativeActive = false; this._largePortrait?.hide();
                });
                this.addWindow(this._rollWindow); return;
            }
            this._narrativeActive = true;
            this._largePortrait.setCharacter(beat.npc); this._largePortrait.show();
            this._narrativeDialogue.show();
            this._narrativeDialogue.setDialogue(beat.title, beat.text, () => {
                this._narrativeActive = false; this._largePortrait?.hide(); this._narrativeDialogue?.hide();
            });
        }

        beginFormationShift(strategy) {
            if (this._pending) { this._queuedFormationStrategy = strategy; return; }
            const from = new Map(), to = new Map();
            for (const [key, token] of this._tokens) {
                from.set(key, { x: token.sprite.x, y: token.sprite.y });
                to.set(key, battleFormationPosition(token.fighter.side, token.sideIndex, token.sideCount, token.fighter.combatRole, strategy));
            }
            this._formationShift = { from, to, started: performance.now(), duration: 260 / BATTLE_PRESENTATION_SPEED };
        }

        updateFormationShift() {
            const shift = this._formationShift;
            const t = Math.min(1, (performance.now() - shift.started) / shift.duration);
            const eased = 1 - Math.pow(1 - t, 3);
            for (const [key, token] of this._tokens) {
                if (token.defeated) continue;
                const from = shift.from.get(key), to = shift.to.get(key);
                token.sprite.x = from.x + (to.x - from.x) * eased;
                token.sprite.y = from.y + (to.y - from.y) * eased;
                if (t === 1) { token.homeX = to.x; token.homeY = to.y; }
            }
            if (t === 1) this._formationShift = null;
        }

        toggleHistory() {
            this._historyOpen = !this._historyOpen;
            const now = performance.now();
            if (this._historyOpen) {
                this._historySince = now;
                this._strategies.deactivate();
            } else {
                const elapsed = now - this._historySince;
                if (this._pending?.started !== undefined) this._pending.started += elapsed;
                if (this._formationShift) this._formationShift.started += elapsed;
                for (const w of this._captions) { w._since += elapsed; w._until += elapsed; }
                this._strategies.deactivate();
            }
            for (const w of this._captions) { w._paused = this._historyOpen; w.visible = !this._historyOpen && w.busy(); }
            this._arena.visible = !this._historyOpen;
            this._strategies.visible = false;
            this._orderPanel.visible = !this._historyOpen;
            if (this._historyOpen) { this._largePortrait?.hide(); this._narrativeDialogue?.hide(); }
            else if (this._narrativeActive) { this._largePortrait.show(); this._narrativeDialogue.show(); }
            this._logWindow.visible = this._historyOpen;
            this._logScrollbar.visible = this._historyOpen;
        }

        createArena() {
            this._tokens = new Map();
            this._arena = new Sprite();
            this.addChild(this._arena);
            const battleState = this._battle.snapshot();
            const fighters = battleState.fighters;
            const sideCounts = {
                player: fighters.filter(f => f.side === "player").length,
                enemy: fighters.filter(f => f.side === "enemy").length
            };
            const sideIndexes = { player: 0, enemy: 0 };
            this._field = new Sprite(new Bitmap(Graphics.boxWidth, 194));
            this._field.y = 106;
            const field = this._field.bitmap;
            field.gradientFillRect(12, 0, Graphics.boxWidth / 2 - 18, 194, "#153b50", "#17242e", false);
            field.gradientFillRect(Graphics.boxWidth / 2 + 6, 0, Graphics.boxWidth / 2 - 18, 194, "#301d28", "#4b2830", false);
            field.fillRect(Graphics.boxWidth / 2 - 1, 12, 2, 170, "#d6c9a055");
            this._arena.addChild(this._field);
            fighters.forEach(f => {
                const sideIndex = sideIndexes[f.side]++;
                const home = battleFormationPosition(f.side, sideIndex, sideCounts[f.side], f.combatRole, battleState.strategy);
                const sprite = new Sprite();
                sprite.x = home.x;
                sprite.y = home.y;
                this._arena.addChild(sprite);
                const shadow = new Sprite(new Bitmap(58, 14));
                shadow.anchor.set(0.5, 0.5); shadow.y = 2;
                shadow.bitmap.drawCircle(29, 7, 25, "#00000088");
                shadow.scale.y = 0.28;
                sprite.addChild(shadow);
                const art = new Sprite();
                art.anchor.set(0.5, 1);
                art.y = 2;
                sprite.addChild(art);
                const status = new Sprite(new Bitmap(146, 62));
                status.anchor.set(0.5, 0); status.y = 7;
                sprite.addChild(status);
                const token = { sprite, status, shadow, art, homeX: sprite.x, homeY: sprite.y, fighter: f,
                    defeated: false, baseScaleX: 1, baseScaleY: 1, sideIndex, sideCount: sideCounts[f.side] };
                this._tokens.set(f.key, token);
                if (f.side === "enemy") {
                    const face = f.portrait;
                    art.bitmap = managerArt("faces",face.sheet);
                    art.bitmap.addLoadListener(() => {
                        const columns = face.columns || 4, rows = face.rows || 2;
                        const w = art.bitmap.width / columns, h = art.bitmap.height / rows;
                        art.setFrame((face.index % columns) * w, Math.floor(face.index / columns) * h, w, h);
                        const scale = Math.min(54 / w, 54 / h);
                        token.baseScaleX = -scale; token.baseScaleY = scale;
                        art.scale.set(token.baseScaleX, token.baseScaleY);
                    });
                } else {
                    const face = f.portrait || { sheet: "Actor1", index: 0 };
                    token.characterIndex = face.index;
                    art.bitmap = managerArt("characters",face.sheet);
                    art.bitmap.addLoadListener(() => this.characterFrame(token, 1));
                }
                this.drawToken(f.key);
            });
            this._effect = new Sprite(new Bitmap(Graphics.boxWidth, 194));
            this._effect.y = 106;
            this._arena.addChild(this._effect);
        }
        isReady() { return super.isReady() && ImageManager.isReady(); }
        characterFrame(token, pattern) {
            if (token.characterIndex === undefined || !token.art.bitmap.isReady()) return;
            const b = token.art.bitmap, w = b.width / 12, h = b.height / 8;
            // Actor sheets match the portrait index; face right toward the enemies.
            token.art.setFrame(((token.characterIndex % 4) * 3 + pattern) * w,
                (Math.floor(token.characterIndex / 4) * 4 + 2) * h, w, h);
        }
        drawToken(key) {
            const { status, fighter: f } = this._tokens.get(key);
            const b = status.bitmap;
            b.clear();
            const panelColor=f.side === "player" ? "#102a3dcc" : "#351b24cc";
            b.fillRect(2, 1, 142, 58, panelColor);
            b.fontSize = 13;
            b.textColor = f.side === "player" ? "#8edaff" : "#ffa795";
            b.drawText(f.name, 7, 2, 132, 17, "center");
            const heartSize=11,heartGap=2,heartWidth=f.maxHealth*(heartSize+heartGap)-heartGap,heartX=Math.max(5,Math.floor((146-heartWidth)/2));
            for(let i=0;i<f.maxHealth;i++)drawBattleHeart(b,heartX+i*(heartSize+heartGap),20,heartSize,i<f.health);
            const armor=Math.max(0,Math.floor(Number(f.armor)||0)),ward=Math.max(0,Math.floor((Number(f.temporaryWard)||0)+(Number(f.innateWard)||0)));
            const iconSize=11,total=(armor+ward)*(iconSize+2)+(armor&&ward?5:0),start=Math.max(5,Math.floor((146-total)/2));let x=start;
            for(let i=0;i<armor;i++){drawBattleShield(b,x,42,iconSize);x+=iconSize+2;}if(armor&&ward)x+=5;
            for(let i=0;i<ward;i++){drawBattleWard(b,x,42,iconSize);x+=iconSize+2;}
            if(f.health<=0){b.textColor="#ffb0b0";b.fontSize=12;b.drawText("KO",104,21,34,16,"center");}
            status.opacity = f.health > 0 ? 255 : 190;
        }
        animateAttack() {
            const p = this._pending;
            const e = p.attack;
            if (p.started === undefined) {
                p.started = performance.now();
                if (e) {
                    const actor = this._tokens.get(e.actorKey);
                    p.mode = battleActionMode(e, actor?.fighter);
                    p.duration = e.kind === "signature" ? 700 : 250;
                    if (battleAiDebug) {
                        this._debugDecision = { strategy: e.strategy, actor: e.actorName, role: e.actorRole,
                            target: e.targetName, reason: e.decisionReason };
                        this._header.contents.clearRect(0, 32, this._header.innerWidth, 32);
                        this._header.line(`${e.strategy} | ${e.actorRole} ${e.actorName} -> ${e.targetName} | ${e.decisionReason}`, 32, "#ffc46b", 16);
                    }
                } else p.duration = 100;
            }
            // Elapsed-time animation cannot add, remove, retarget, or alter events.
            p.frame = Math.min(1, (performance.now() - p.started) / p.duration);
            if (e) {
                const actor = this._tokens.get(e.actorKey);
                const target = this._tokens.get(e.targetKey);
                const t = p.frame;
                const signature = e.kind === "signature";
                const impactAt = signature ? 0.52 : BATTLE_TIMING.impact;
                const windup = Math.min(1, t / impactAt);
                const returnT = Math.max(0, (t - impactAt) / (1 - impactAt));
                if (p.mode === "melee") {
                    const attackGap = { pursue: 46, intercept: 96, hold: 118, support: 108, focus: 70 }[e.positionIntent] || 70;
                    const attackX = target.homeX + (e.side === "player" ? -attackGap : attackGap);
                    const approach = t < impactAt ? Math.pow(windup, 2) : Math.max(0, 1 - returnT);
                    actor.sprite.x = actor.homeX + (attackX - actor.homeX) * approach;
                    actor.sprite.y = actor.homeY + (target.homeY - actor.homeY) * approach * 0.55;
                } else {
                    const castDirection = e.positionIntent === "pursue" ? 12 : e.positionIntent === "support" || e.positionIntent === "hold" ? -10 : -5;
                    actor.sprite.x = actor.homeX + Math.sin(windup * Math.PI) * (e.side === "player" ? castDirection : -castDirection);
                    actor.sprite.y = actor.homeY - Math.sin(windup * Math.PI) * (signature ? 8 : 3);
                }
                actor.art.scale.x = actor.baseScaleX * (signature && t < impactAt ? 1 + 0.14 * windup : 1);
                actor.art.scale.y = actor.baseScaleY * (signature && t < impactAt ? 1 + 0.14 * windup : 1);
                if (t >= impactAt && !p.impacted) {
                    p.impacted = true;
                    if (Number.isFinite(e.targetHealth)) target.fighter.health = e.targetHealth;
                    if(Number.isFinite(e.targetArmor))target.fighter.armor=e.targetArmor;
                    if(Number.isFinite(e.targetWard)){const innate=Math.min(target.fighter.innateWard||0,e.targetWard);target.fighter.innateWard=innate;target.fighter.temporaryWard=Math.max(0,e.targetWard-innate);}
                    if (Number.isFinite(e.cooldown)) actor.fighter.cooldown = e.cooldown;
                    if (p.events.some(event => event.type === "defeat" && event.key === e.targetKey)) target.defeated = true;
                    this.drawToken(e.actorKey); this.drawToken(e.targetKey);
                    this._logWindow.append(p.events.filter(event => event.type !== "result").flatMap(battleLogLines));
                    for (const beat of p.beats) {
                        this._dialogueQueue.push(beat);
                        this._logWindow.append([`${beat.npc.name}: "${beat.text}"`]);
                    }
                    for (const fall of p.events.filter(event => event.type === "defeat")) {
                        const witness = this._battle.snapshot().fighters.find(f => f.side === fall.side && f.health > 0 && f.key !== fall.key);
                        if (witness) this._logWindow.append([`${witness.name}: "${progression.say(witness, "allyFalls", { ally: fall.name }, fall.side === "player" && progression.bondPartners(managerState(), witness.id).some(n => `player:${n.id}` === fall.key))}"`]);
                    }
                    if (!battleAiDebug) {
                        this._header.contents.clearRect(0, 32, this._header.innerWidth, 32);
                        const amount = e.type === "heal" ? e.healing ?? e.heal ?? e.amount : e.damage;
                        this._header.line(`${e.actorName} > ${e.targetName}: ${e.type === "heal" ? `+${amount} HP` : `${amount} damage`}`, 32, ColorManager.normalColor(), 18);
                    }
                }
                this.characterFrame(actor, t < 0.78 ? Math.floor(t * 18) % 3 : 1);
                const impactLife = t >= impactAt ? Math.max(0, 1 - (t - impactAt) / 0.32) : 0;
                const recoil = impactLife * Math.sin((1 - impactLife) * Math.PI);
                target.sprite.x = target.homeX + (e.side === "player" ? 14 : -14) * recoil;
                if (!target.defeated) target.sprite.y = target.homeY;
                target.art.setBlendColor(impactLife > 0 ? (p.mode === "heal" ? [80, 255, 140, 180] : signature ? [160, 80, 255, 210] : [255, 255, 255, 210]) : [0, 0, 0, 0]);
                if (target.defeated && p.impacted) {
                    target.art.rotation = (target.fighter.side === "player" ? -1 : 1) * Math.min(0.45, returnT * 0.45);
                    target.art.y = 2 + 13 * returnT;
                    target.art.opacity = 255 - 185 * returnT;
                }
                const b = this._effect.bitmap;
                b.clear();
                const ax = actor.sprite.x, ay = actor.sprite.y - 106 - 29;
                const tx = target.sprite.x, ty = target.sprite.y - 106 - 29;
                if ((p.mode === "ranged" || p.mode === "magic" || p.mode === "heal") && t < impactAt) {
                    const travel = Math.max(0, Math.min(1, (t / impactAt - 0.25) / 0.75));
                    const x = ax + (tx - ax) * travel, y = ay + (ty - ay) * travel - Math.sin(travel * Math.PI) * 24;
                    const color = p.mode === "heal" ? "#75ef9f" : p.mode === "magic" ? "#b77cff" : "#ffe49b";
                    b.drawCircle(x, y, signature ? 9 : 5, color);
                    b.fillRect(x - (e.side === "player" ? 18 : 0), y - 1, 18, 3, color);
                    if (p.mode === "magic" || p.mode === "heal") b.drawCircle(ax, ay, 7 + 8 * windup, color);
                }
                if (signature && t < impactAt) {
                    b.fillRect(150, 3, Graphics.boxWidth - 300, 38, "#21152cdd");
                    b.textColor = "#f2c6ff"; b.fontSize = 23;
                    b.drawText(e.attackName, 160, 7, Graphics.boxWidth - 320, 28, "center");
                }
                if (impactLife > 0) {
                    const color = p.mode === "heal" ? "#75ef9f" : signature ? "#d38aff" : "#ffffff";
                    b.drawCircle(tx, ty, (signature ? 27 : 16) * impactLife, color);
                    b.fillRect(tx - 28 * impactLife, ty - 2, 56 * impactLife, 4, color);
                    b.fillRect(tx - 2, ty - 28 * impactLife, 4, 56 * impactLife, color);
                    const amount = e.type === "heal" ? e.healing ?? e.heal ?? e.amount : e.damage;
                    b.textColor = color; b.fontSize = signature ? 26 : 21;
                    b.drawText(`${e.type === "heal" ? "+" : "-"}${amount}`, tx - 42, ty - 48 - 18 * (1 - impactLife), 84, 32, "center");
                    if (target.defeated) { b.fontSize = 18; b.textColor = "#ff9c9c"; b.drawText("KNOCKED OUT", tx - 76, ty - 76, 152, 26, "center"); }
                }
            }
            if (p.frame >= 1) {
                this._logWindow.append((e ? p.events.filter(event => event.type === "result") : p.events).flatMap(battleLogLines));
                this._effect.bitmap.clear();
                if (e) {
                    const actor = this._tokens.get(e.actorKey);
                    actor.sprite.x = actor.homeX; actor.sprite.y = actor.homeY;
                    actor.art.scale.set(actor.baseScaleX, actor.baseScaleY);
                    const target = this._tokens.get(e.targetKey);
                    target.sprite.x = target.homeX;
                }
                this._pending = null;
                if (this._queuedFormationStrategy) {
                    const strategy = this._queuedFormationStrategy;
                    this._queuedFormationStrategy = null;
                    this.beginFormationShift(strategy);
                }
                this.refreshBattle();
            }
        }
        refreshHeader() {
            const state = this._battle.snapshot();
            const title = { running: "Automatic Battle", victory: "VICTORY", defeat: "DEFEAT", draw: "DRAW" }[this._pending ? "running" : state.status];
            this._header.contents.clear();
            const trip = this._teamKey ? progression.tripForTeam(managerState(), this._teamKey) : null;
            const quest = trip ? findQuest(trip.questId) : null;
            this._header.line(`EXPEDITION / ${title}`, 0, quest ? factionColor(quest) : ColorManager.systemColor(), 26);
            this._header.line(`Round ${state.round} / Both sides spread their attacks`, 32, ColorManager.normalColor(), 18);
            if (quest) this._header.badge(quest.boss ? "BOSS" : quest.faction.toUpperCase(), this._header.innerWidth - 150, 0, 140, factionColor(quest));
        }
        refreshBattle() {
            const state = this._battle.snapshot();
            this.refreshHeader();
            this._strategies.refresh();
            if (!this._finished && state.status !== "running") {
                if (this._ending) return;
                this._ending = true;
                this._strategies.deactivate();
                const speaker = state.fighters.find(f => f.side === "player" && f.health > 0) || state.fighters.find(f => f.side === "player");
                const text = progression.say(speaker, state.status === "defeat" ? "defeat" : state.status);
                this._dialogueQueue.push({ npc: speaker, title: state.status.toUpperCase(), text, important: true });
                this._logWindow.append([`${speaker.name}: "${text}"`]);
            }
        }

        settleBattle() {
            if (!this._finished) {
                const state = this._battle.snapshot();
                const events = this._battle.events;
                if (this._teamKey) progression.recordBattleResult(managerState(), this._teamKey, this._questId, state, Date.now(), events);
                else progression.finishQuest(managerState(), this._questId, state, events, Date.now());
                this._finished = true;
                this._commandWindow.finish(this._teamKey ? "Return to Home" : "View Battle Report");
                this._strategies.deactivate();
                this._commandWindow.activate();
                this._header.contents.clearRect(0, 32, this._header.innerWidth, 32);
                const trip = this._teamKey ? progression.tripForTeam(managerState(), this._teamKey) : null;
                const message = trip?.phase === "choice" ? "Battle complete. Decide now whether the expedition continues." : trip ? "Battle complete. Return travel has begun; settlement occurs on arrival." : "No adventurer can return. The expedition settled immediately.";
                this._header.line(this._teamKey ? message : "Battle complete. View the report for rewards and condition.", 32, ColorManager.normalColor(), 18);
                if (trip?.phase === "choice") {
                    this._commandWindow?.hide(); this._commandWindow?.deactivate(); this._management?.show(); this._management?.activate(); this._management?.select(0);
                }
                window.RPGManager.lastBattle = { snapshot: state, events: JSON.parse(JSON.stringify(this._battle.events)) };
            }
        }

        resolveBattleManagement(continueQuest) {
            if (!this._teamKey || !progression.resolveExpeditionChoice(managerState(), this._teamKey, continueQuest, Date.now())) return;
            SceneManager.goto(Scene_RPGHome);
        }

        terminate() {
            super.terminate();
            for (const token of this._tokens.values()) {
                token.status.bitmap.destroy();
                token.shadow.bitmap.destroy();
            }
            this._field.bitmap.destroy();
            this._effect.bitmap.destroy();
        }

        returnHome() {
            if (this._finished) {
                SceneManager.goto(Scene_RPGHome);
            } else {
                SoundManager.playBuzzer();
                this._commandWindow.activate();
            }
        }
    }

    class Scene_RPGRoster extends Scene_RPGBase {
        prepare(selecting, graveyard = false, nextScene = null) {
            this._selecting = selecting;
            this._graveyard = graveyard;
            this._nextScene = nextScene;
        }

        create() {
            super.create();
            this._draft = teamIds().filter(id => isLiving(findNpc(id)));
            this._header = this.header(this._selecting ? "Select Team" : this._graveyard?"Graveyard":"Roster", "");
            this._footer = this.footer([]);
            const height = Graphics.boxHeight - 200;
            this._detailsWindow = this.panel(new Rectangle(326, 108, Graphics.boxWidth - 338, height), Window_RPGDetails);
            this._listWindow = new Window_RPGRoster(new Rectangle(12, 108, 302, height), this._selecting, this._draft, this._graveyard);
            this._listWindow.setHandler("npc", this.onNpc.bind(this));
            this._listWindow.setHandler("tavern",()=>SceneManager.push(Scene_RPGTavern));
            this._listWindow.setHandler("sort", () => { Window_RPGRoster.sortMode = this._listWindow.currentExt(); this._listWindow.refresh(); this._listWindow.activate(); this._footer.setLines([`Roster sorted: ${Window_RPGRoster.sortMode}.`, "Sorting never changes quest eligibility."]); });
            this._listWindow.setHandler("confirm", this.onConfirm.bind(this));
            this._listWindow.setHandler("back", this.popScene.bind(this));
            this._listWindow.setHandler("cancel", this.popScene.bind(this));
            this._listWindow.onSelectionChange = this.onSelectionChange.bind(this);
            this._listWindow.onBlocked = this.onBlocked.bind(this);
            this.addWindow(this._listWindow);
            this.refreshStatus();
            this.onSelectionChange();
            if (this._graveyard && !progression.graveyard(managerState()).length) this._detailsWindow.setNpc(null);
        }
        start() { super.start(); this.refreshStatus(); this.onSelectionChange(); }

        refreshStatus() {
            this._header.contents.clear();
            this._header.line(this._graveyard ? "Graveyard" : this._selecting ? "Select Team" : "Roster", 0, ColorManager.systemColor(), 26);
            const living = roster().filter(isLiving).length;
            const suffix = this._graveyard ? `${progression.graveyard(managerState()).length} fallen` : this._selecting ? `Selected: ${this._draft.length} / 5` : "Select a name to inspect";
            this._header.line(this._graveyard?`${progression.graveyard(managerState()).length} preserved characters / ${suffix}`:`${living}/5 roster slots / ${suffix}`, 32);
            this._listWindow.refresh();
        }

        onSelectionChange() {
            if (this._listWindow.currentSymbol() === "npc") {
                this._detailsWindow.setNpc(findNpc(this._listWindow.currentExt()));
            }
            this._footer.setLines(this._graveyard ? [
                "Deceased characters remain here after their slots are filled.",
                "Supplies cannot revive them. Esc / Back to Home: return."
            ] : this._selecting ? [
                "Enter / click: add or remove. Choose Confirm Team when ready.",
                "Select 1-5 living adventurers. Esc / right-click: discard changes."
            ] : [
                "Arrow keys or click a name to view the NPC's details.",
                "Esc / right-click or Back to Home: return."
            ]);
        }

        onBlocked() {
            const npc = findNpc(this._listWindow.currentExt());
            const error = this._listWindow.currentSymbol() === "confirm"
                ? validateTeam(this._draft)
                : (!isLiving(npc) || progression.isUnavailable(managerState(), npc.id) ? "This adventurer is unavailable while away on a quest."
                    : managerState().teams[managerState().activeTeam === "A" ? "B" : "A"].includes(npc.id) ? "This adventurer is already assigned to the other team."
                    : "Team full. Remove a member before adding another.");
            this._footer.setLines([error, "Enter / click a selected NPC to remove them. Esc: cancel changes."]);
        }

        onNpc() {
            if (!this._selecting && !this._graveyard) {
                SceneManager.push(Scene_RPGMember);
                SceneManager.prepareNextScene(this._listWindow.currentExt());
                return;
            }
            let error = "";
            if (this._selecting) {
                if (this._listWindow.currentExt() === managerState().pendingLeaderId && this._draft.includes(managerState().pendingLeaderId)) error = "The Party Leader occupies a required party slot.";
                else error = toggleTeamMember(this._draft, this._listWindow.currentExt());
                this.refreshStatus();
            }
            this._listWindow.activate();
            if (error) {
                SoundManager.playBuzzer();
                this._footer.setLines([error, "Esc: cancel changes."]);
            }
        }

        onConfirm() {
            if (this._selecting && !this._draft.includes(managerState().pendingLeaderId)) { SoundManager.playBuzzer(); this._footer.setLines(["Choose and retain a Party Leader before confirming.", "The leader counts as one of the 1-5 members."]); this._listWindow.activate(); return; }
            const error = confirmTeam(this._draft);
            if (error) {
                SoundManager.playBuzzer();
                this.refreshStatus();
                this._listWindow.activate();
                this._footer.setLines([error, "Choose 1-5 living adventurers, then confirm again."]);
            } else if (this._nextScene === "preparation") SceneManager.push(Scene_RPGPreparation);
            else this.popScene();
        }
    }

    function paginateCommands(win){win._allCommands=win._list;win._commandPages=1;win._fitRowHeight=null;}
    function handleCommandPage(win){return false;}
    const mobilePointerLayout=()=>globalThis.matchMedia?.("(pointer: coarse) and (max-width: 900px), (pointer: coarse) and (max-height: 520px)")?.matches===true;
    function mountListArrows(scene,win){
        const el=document.createElement("div");el.className="manager-scroll-controls";el.style.cssText="position:fixed;inset:0;z-index:22;pointer-events:none";
        const buttons=[-1,1].map(delta=>{const button=document.createElement("button");button.textContent=delta<0?"\u25b2":"\u25bc";button.setAttribute("aria-label",delta<0?"Scroll up":"Scroll down");button.style.cssText="position:fixed;pointer-events:auto;background:#354c80;color:#fff0ce;border:1px solid #c6ae65;border-radius:5px;cursor:pointer;padding:0;line-height:1";button.onclick=()=>{win.smoothScrollBy(0,delta*win.itemHeight());win.activate();};el.appendChild(button);return button;});
        const sync=()=>{
            // Use the window borders, not the rows; no controls for a list that fits.
            const overflow=win.maxScrollY()>0,visible=overflow&&win.visible&&win.openness>0&&scene.isActive()&&!managerDialog;
            el.hidden=!visible;win.upArrowVisible=false;win.downArrowVisible=false;
            if(win._upArrowSprite)win._upArrowSprite.visible=false;if(win._downArrowSprite)win._downArrowSprite.visible=false;
            if(!visible)return;
            const r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width,x=r.left+(win.x+win.width/2-15)*scale;
            buttons.forEach((button,i)=>{button.hidden=i===0?win.scrollY()<=0:win.scrollY()>=win.maxScrollY();button.style.left=x+"px";button.style.top=(r.top+(win.y+(i===0?-3:win.height-13))*scale)+"px";button.style.width=30*scale+"px";button.style.height=16*scale+"px";button.style.fontSize=12*scale+"px";});
        };
        const refresh=win.refresh;win.refresh=function(){refresh.call(this);sync();};
        (scene._listScrollSync||=[]).push(sync);
        for(const event of ["mousedown","mouseup","touchstart","touchend","keydown","keyup"])el.addEventListener(event,e=>e.stopPropagation());document.body.appendChild(el);(scene._listArrows||=[]).push(el);sync();
    }
    class Window_RPGChoices extends Window_Command {
        initialize(rect, entries, visualKind=null) { this._entries = entries;this._visualKind=visualKind; super.initialize(rect); }
        itemHeight() { return this._fitRowHeight||(this._visualKind==="quests"?60:36); }
        isHoverEnabled() {
            // Keep the reviewed contract selected while the pointer travels to Start Quest.
            return this._visualKind!=="quests"&&super.isHoverEnabled();
        }
        processOk(){if(handleCommandPage(this))return;super.processOk();}
        resetFontSettings() { super.resetFontSettings(); this.contents.fontSize = 20; }
        makeCommandList() {
            for (const entry of this._entries()) this.addCommand(entry.name, entry.symbol, entry.enabled !== false, entry.ext);
            paginateCommands(this);
        }
        drawItem(index){
            const r=this.itemRect(index),entry=this._list[index],enabled=this.isCommandEnabled(index);this.changePaintOpacity(enabled);
            if(this._visualKind==="quests"&&entry.symbol==="quest"){
                const q=findQuest(entry.ext);CozyUI.icon(this.contents,"quest",r.x+7,r.y+8,19,enabled?"#d7bd80":"#9b927e");
                CozyUI.text(this,`${enabled?"":"LOCKED / "}${q.name}`,r.x+34,r.y+1,r.width-40,14,enabled?"#f4e8cf":"#b9b29c","left",18);
                CozyUI.text(this,`${progression.dangerLabel(q)} / ${q.durationMinutes} min / 1-3 party / L${q.intendedLevel||1}`,r.x+34,r.y+20,r.width-40,13,{Easy:"#b9dcac",Normal:"#ffe4a1",Hard:"#ffadb7"}[progression.authoredDifficulty(q)],"left",18);
                CozyUI.text(this,`Gold ${q.rewardGold.victory} / Arcana ${q.rewardArcana?.victory||0} / XP ${q.xpPool??q.xpReward*3} pool`,r.x+9,r.y+39,r.width-18,13,"#ffe4a1","left",18);
            }else{
                CozyUI.text(this,entry.name,r.x+9,r.y+3,r.width-18,this._visualKind==="quests"?15:17,enabled?"#f4e8cf":"#aaa68e","left",this.lineHeight()-6);
            }this.changePaintOpacity(true);
        }
        processTouch(){
            // MZ's native release-based click detection already cancels a click
            // after movement and Window_Scrollable pans the list. Do not use the
            // desktop pointer-down bridge on coarse pointers: a swipe may begin
            // on any actionable row without buying, casting or dispatching it.
            if(mobilePointerLayout()){super.processTouch();return;}
            if(this.isOpenAndActive()){
                const hit=this.hitIndex();
                // DOM controls around the canvas can interrupt MZ's release-based
                // click flag. Resolve the real row and dispatch on pointer press so
                // every manager choice—including Altar rituals—remains mouse-safe.
                if(hit>=0&&(TouchInput.isHovered()||TouchInput.isTriggered()||TouchInput.isPressed())){
                    if(hit!==this.index())this.select(hit);
                    if(TouchInput.isTriggered()){this.processOk();return;}
                }
            }
            super.processTouch();
        }
        select(index) { super.select(index); if (this.onSelectionChange) this.onSelectionChange(); }
    }

    const listSceneUpdate=Scene_Base.prototype.update;
    Scene_Base.prototype.update=function(){listSceneUpdate.call(this);for(const sync of this._listScrollSync||[])sync();};
    const listSceneStart=Scene_RPGBase.prototype.start;
    Scene_RPGBase.prototype.start=function(){
        listSceneStart.call(this);
        if(!(this instanceof Scene_RPGHome||this instanceof Scene_RPGStartingRoster||this instanceof Scene_RPGMember||this instanceof Scene_RPGRoster||this instanceof Scene_RPGAltar))document.getElementById("camp-menu-navigation")?.remove();
        for(const win of this._windowLayer.children)if(win instanceof Window_RPGChoices)mountListArrows(this,win);
    };
    const listSceneTerminate=Scene_RPGBase.prototype.terminate;
    Scene_RPGBase.prototype.terminate=function(){for(const el of this._listArrows||[])el.remove();listSceneTerminate.call(this);};
    const drawChoiceItem=Window_RPGChoices.prototype.drawItem;
    Window_RPGChoices.prototype.drawItem=function(index){
        const entry=this._list[index],id=entry?.ext;
        if(progression.SHOP[id]){
            const r=this.itemLineRect(index);this.changePaintOpacity(this.isCommandEnabled(index));CozyUI.itemIcon(this,id,r.x+3,r.y+4,22);
            CozyUI.text(this,entry.name,r.x+34,r.y,r.width-38,16,"#f4e8cf","left",30);this.changePaintOpacity(true);
        }else drawChoiceItem.call(this,index);
    };
    class Scene_RPGStartingRoster extends Scene_RPGBase {
        create(){
            super.create();this._tavern=this.constructor.name==='Scene_RPGTavern';this._drafts=[];this._creationIndex=0;this._draft={};this._step=this._tavern&&!this.canHire()?'full':'class';
            this.header(this._tavern?'Tavern · Create a recruit':'Create your companion',"");this.showCreator();
        }
        canHire(){return !managerState().trips.A&&!managerState().activeQuest&&progression.vacantSlots(managerState()).length>0;}
        usedPortraits(){return new Set([...progression.activeRoster(managerState()).filter(n=>n.id!==this._replaceId),...this._drafts.filter((n,i)=>i!==this._creationIndex)].filter(Boolean).map(n=>n.portraitKey));}
        faceElement(n,size=84){const face=n.portrait||progression.portraitOptions(n.classId,n.sex).find(p=>p.key===n.portraitKey)||progression.portraitOptions(n.classId,n.sex)[0],el=document.createElement('div'),cols=face.columns||4,rows=face.rows||2,file=managerImageFile(face.sheet);el.style.cssText=`width:${size}px;height:${size}px;margin:0 auto;image-rendering:pixelated;background-repeat:no-repeat;background-image:url('img/faces/${file}');background-size:${cols*size}px ${rows*size}px;background-position:-${face.index%cols*size}px -${Math.floor(face.index/cols)*size}px;border-radius:6px`;return el;}
        showCreator(){
            this._nameForm?.remove();const r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width,form=document.createElement('form');form.id='character-creation';form.setAttribute('aria-label',this._tavern?'Create tavern recruit':'Create party');form.dataset.step=this._step;
            form.style.cssText=`position:fixed;left:${r.left+18*scale}px;top:${r.top+112*scale}px;width:${(Graphics.boxWidth-36)*scale}px;height:${(Graphics.boxHeight-212)*scale}px;z-index:30;box-sizing:border-box;padding:${14*scale}px;background:#302248;color:#fff0ce;border:2px solid #c6ae65;border-radius:12px;font:${16*scale}px Trebuchet MS;display:flex;flex-direction:column;gap:10px;overflow:hidden`;
            const title=document.createElement('h2');title.style.cssText='font-size:22px;margin:0';title.textContent=this._step==='review'?(this._tavern?'Review recruit':'Review your companion'):this._step==='full'?'Your party is full':`${this._tavern?'New recruit':'Your starting companion'} · ${{class:'Choose a class',type:'Choose a type',appearance:'Portrait & name'}[this._step]}`;form.appendChild(title);
            const body=document.createElement('div');body.style.cssText='flex:1;min-height:0;display:flex;flex-direction:column;gap:10px';form.appendChild(body);
            const error=document.createElement('div');error.setAttribute('role','status');error.style.cssText='min-height:20px;color:#ffccad;font-size:14px';form.appendChild(error);this._creatorError=error;
            const footer=document.createElement('div');footer.style.cssText='display:flex;gap:10px;justify-content:space-between';form.appendChild(footer);
            const button=(text,run,parent=body)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='box-sizing:border-box;padding:10px;border:2px solid #f0cc72;border-radius:8px;background:linear-gradient(155deg,#5678b6,#2f4f88 62%,#203864);color:#fff0ce;box-shadow:inset 0 2px #ffffff4d,inset 0 0 0 1px #83a2d155,0 3px 0 #14284e,0 6px 8px #100b2480;font:inherit;cursor:pointer;text-shadow:0 2px #14254a;transition:transform .08s ease,filter .12s ease';b.onpointerenter=()=>b.style.filter='brightness(1.12)';b.onpointerleave=()=>{b.style.filter='none';b.style.transform='none'};b.onpointerdown=()=>b.style.transform='translateY(2px)';b.onpointerup=()=>b.style.transform='none';b.onclick=run;parent.appendChild(b);return b;};
            const back=button(this._step==='full'?'Back to camp':'Back',()=>this.creatorBack(),footer);back.dataset.action='back';
            if(this._step==='class'){
                const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(2,minmax(132px,1fr));gap:10px;flex:1;min-height:274px;overflow:visible';body.appendChild(grid);
                for(const id of progression.ALL_CLASSES){const c=progression.classFor({classId:id}),stats=progression.classStats({classId:id,level:1}),compactPurpose={bard:'Inspires allies to reuse special attacks.',druid:'Heals allies and entangles enemies.'}[id]||c.purpose,b=button('',()=>{if(this._draft.classId!==id)this._draft={classId:id};this._step='type';this.showCreator();},grid);b.setAttribute('aria-label',c.name);b.title=`${c.purpose}. HP ${stats.hp}, Armor ${stats.armor}, Ward ${stats.ward}, Speed ${stats.speed}`;b.style.cssText='box-sizing:border-box;padding:4px 7px 5px;min-width:0;min-height:132px;overflow:hidden;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;background:linear-gradient(155deg,#5878b8 0%,#34558f 48%,#203866 100%);border:2px solid #f0cc72;border-radius:10px;box-shadow:inset 0 2px #ffffff55,inset 0 0 0 2px #7798ce55,0 3px 0 #14284e,0 7px 10px #120d2688;transition:transform .1s ease,filter .12s ease';b.onpointerenter=()=>{b.style.transform='translateY(-2px)';b.style.filter='brightness(1.14)'};b.onpointerleave=()=>{b.style.transform='none';b.style.filter='none'};const heading=document.createElement('span');heading.style.cssText='display:flex;align-items:center;justify-content:center;gap:7px;min-height:50px;font:700 19px Georgia;color:#fff1cd;text-shadow:0 2px #16264b';heading.append(classEmblemElement(id,48));const className=document.createElement('span');className.textContent=c.name;heading.appendChild(className);b.appendChild(heading);const info=document.createElement('small');info.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:1px 5px;margin-top:2px;padding:3px 6px;border:1px solid #7fa5dc66;border-radius:5px;background:#142d5dcc;color:#e5f0ff;font:bold 10px Trebuchet MS;line-height:1.05;text-align:left';for(const [label,value] of [['HP',stats.hp],['ARM',stats.armor],['WARD',stats.ward],['SPD',stats.speed]]){const stat=document.createElement('span');stat.textContent=`${label} ${value}`;stat.style.whiteSpace='nowrap';info.appendChild(stat);}b.appendChild(info);const role=document.createElement('small');role.textContent=compactPurpose;role.style.cssText='display:flex;align-items:center;justify-content:center;overflow:hidden;min-height:21px;margin-top:3px;color:#fff0cf;font:10px Trebuchet MS;line-height:1.1;text-align:center';b.appendChild(role);}
            }else if(this._step==='type'){
                const info=document.createElement('p');info.textContent=`${progression.classFor(this._draft).name} — choose an appearance type. Stats are identical.`;info.style.margin='4px 0';body.appendChild(info);
                const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:18px;flex:1';body.appendChild(grid);
                for(const [sex,label] of [['male','Type A'],['female','Type B']]){const b=button(label,()=>{this._draft.sex=sex;const options=progression.portraitOptions(this._draft.classId,sex);if(!options.some(p=>p.key===this._draft.portraitKey)||this.usedPortraits().has(this._draft.portraitKey))this._draft.portraitKey=options.find(p=>!this.usedPortraits().has(p.key))?.key;if(!this._draft.name)this._draft.name=progression.randomName(Math.random,this._draft.classId,[...this._drafts.filter(Boolean).map(n=>n.name),...progression.activeRoster(managerState()).map(n=>n.name)],sex);this._step='appearance';this.showCreator();},grid);b.style.fontSize='24px';b.prepend(this.faceElement({classId:this._draft.classId,sex},96));}
            }else if(this._step==='appearance'){
                const d=this._draft,grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:5px';body.appendChild(grid);
                progression.portraitOptions(d.classId,d.sex).forEach((option,i)=>{const b=button(`Portrait ${i+1}`,()=>{d.portraitKey=option.key;this.showCreator();},grid);b.prepend(this.faceElement({portrait:option},48));b.setAttribute('aria-pressed',String(d.portraitKey===option.key));b.dataset.portraitKey=option.key;b.style.border=d.portraitKey===option.key?'3px solid #ffe3a4':'1px solid #8b7955';b.disabled=this.usedPortraits().has(option.key);if(b.disabled){b.style.opacity='.35';b.title='Already used by a living companion';}});
                const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:12px';body.appendChild(row);const label=document.createElement('label');label.textContent='Name ';label.style.flex='1';const input=document.createElement('input');input.setAttribute('aria-label','Recruit name');input.maxLength=24;input.value=d.name||'';input.style.cssText='font:inherit;padding:8px;width:75%;box-sizing:border-box;background:#fff0ce;color:#302248;border-radius:5px';input.oninput=()=>d.name=input.value;label.appendChild(input);row.appendChild(label);button('Suggest name',()=>{d.name=progression.randomName(Math.random,d.classId,[...this._drafts.filter((n,i)=>i!==this._creationIndex).map(n=>n.name),...progression.activeRoster(managerState()).map(n=>n.name)],d.sex);input.value=d.name;},row);
                const stats=progression.classStats({...d,level:1}),info=document.createElement('p');info.style.cssText='margin:0;line-height:1.4';info.textContent=`${progression.classFor(d).name} · ${d.sex==='male'?'Type A':'Type B'} · HP ${stats.hp} / Armor ${stats.armor} / Ward ${stats.ward} · Dodge ${stats.dodge}%`;body.appendChild(info);
                button(this._tavern?'Review recruit':'Review companion',()=>this.finishAppearance(),footer);
            }else if(this._step==='review'||this._step==='full'){
                const people=this._step==='full'?progression.activeRoster(managerState()):this._replaceId?[findNpc(this._replaceId),...this._drafts]:this._drafts,grid=document.createElement('div');grid.style.cssText=`display:grid;grid-template-columns:repeat(${Math.min(3,people.length)},1fr);gap:10px;flex:1;overflow-y:auto;min-height:0`;body.appendChild(grid);
                people.forEach((d,i)=>{const card=document.createElement('div');card.style.cssText='background:#35476d;border:1px solid #8b7955;border-radius:8px;padding:12px;text-align:center';card.appendChild(this.faceElement(d,96));const name=document.createElement('h3');name.textContent=d.name;name.style.cssText='font-size:18px;margin:12px 0';card.appendChild(name);const classRow=document.createElement('p');classRow.style.cssText='display:flex;align-items:center;justify-content:center;gap:7px';classRow.append(classEmblemElement(d.classId,32));const text=document.createElement('span');text.textContent=progression.classLabel(d);classRow.appendChild(text);card.appendChild(classRow);grid.appendChild(card);if(this._step==='full')button('Replace '+d.name,()=>{const cancel=()=>closeManagerDialog();managerModal('Replace '+d.name+'?',['Their gear will return to inventory. They will be removed only after you create and confirm the replacement.'],[{name:'Create replacement',run:()=>{closeManagerDialog();this._replaceId=d.id;this._drafts=[];this._draft={};this._creationIndex=0;this._step='class';this.showCreator();}},{name:'Cancel',run:cancel}],cancel);},card);if(this._step==='review'&&!(this._replaceId&&i===0))button('Edit '+d.name,()=>{this._creationIndex=i-(this._replaceId?1:0);this._draft={...d};this._editing=true;this._step='appearance';this.showCreator();},card);});
                if(this._step==='review')button(this._replaceId?'Confirm replacement':this._tavern?'Confirm free hire':'Confirm companion and enter camp',()=>{const result=this._replaceId?progression.replaceCreated(managerState(),this._replaceId,this._drafts[0],true):this._tavern?progression.recruitCreated(managerState(),this._drafts[0]):progression.createStartingParty(managerState(),this._drafts);if(!result.ok){error.textContent=result.message;return;}SceneManager.goto(Scene_RPGHome);},footer);
                else error.textContent='Choose a companion to replace. Nothing changes until final confirmation.';if(this._replaceId)error.textContent=`Current: ${findNpc(this._replaceId).name}. Confirm replacement removes them and returns their gear.`;
            }
            form.onkeydown=e=>{e.stopPropagation();if(e.target.tagName==='BUTTON'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();focusWizardDirection(form,e.key.slice(5).toLowerCase());}if(e.key==='Escape'){e.preventDefault();this.creatorBack();}};form.onkeyup=e=>e.stopPropagation();form.onsubmit=e=>e.preventDefault();this._nameForm=form;document.body.appendChild(form);enableMobileTapSafety(form);Input.clear();const first=[...body.querySelectorAll('button,input')].find(el=>!el.disabled);first?.focus();
        }
        finishAppearance(){const d=this._draft,error=progression.nameError(managerState(),d.name,this._replaceId||null),other=this._drafts.filter((n,i)=>i!==this._creationIndex);if(error||other.some(n=>n.name.trim().toLowerCase()===d.name.trim().toLowerCase())){this._creatorError.textContent=error||'Each living companion needs a different name.';return;}if(!d.portraitKey||this.usedPortraits().has(d.portraitKey)){this._creatorError.textContent='Choose an unused portrait.';return;}this._drafts[this._creationIndex]={...d,name:d.name.trim()};if(this._tavern||this._editing||this._creationIndex===0){this._step='review';this._editing=false;}else{this._creationIndex++;this._draft={...(this._drafts[this._creationIndex]||{})};this._step='class';}this.showCreator();}
        creatorBack(){if(this._step==='full'||this._step==='class'&&this._creationIndex===0){SceneManager.goto(this._tavern?Scene_RPGHome:Scene_Title);return;}if(this._step==='review'){this._creationIndex=this._drafts.length-1;this._draft={...this._drafts[this._creationIndex]};this._step='appearance';}else if(this._step==='appearance')this._step='type';else if(this._step==='type')this._step='class';else{this._creationIndex--;this._draft={...this._drafts[this._creationIndex]};this._step='appearance';}this.showCreator();}
        terminate(){this._nameForm?.remove();super.terminate();}
    }

    class Window_RPGDecisionChoices extends Window_RPGChoices {
        itemHeight() { return this._fitRowHeight||54; }
        drawItem(index) {
            const rect = this.itemRect(index), enabled = this.isCommandEnabled(index),consequential=this.commandSymbol(index)==="recall";
            CozyUI.round(this.contents,rect.x+4,rect.y+5,rect.width-8,rect.height-10,consequential?"#70483a":enabled?"#454d39":"#34372e",consequential?"#ffcf99":enabled?"#b6a06f":"#646455",5);
            this.changePaintOpacity(enabled); this.changeTextColor(enabled ? "#ffffff" : "#888888"); this.contents.fontSize = 20;
            CozyUI.text(this,`${consequential?"! ":""}${this.commandName(index)}`,rect.x+12,rect.y+5,rect.width-24,20,"#f4e8cf","center",rect.height-10);
            this.changePaintOpacity(true);
        }
    }

    class Scene_RPGCampJobs extends Scene_RPGBase {
        create(){
            super.create();this._mode="members";this._memberId=null;
            this._header=this.header("CAMP JOBS","Choose a companion, then one assignment. Camp heals 1 HP every 30 seconds.");
            this._choices=new Window_RPGChoices(new Rectangle(12,158,382,Graphics.boxHeight-250),()=>this.entries());
            this._choices.setHandler("choose",()=>this.choose());this._choices.setHandler("back",()=>this.back());this._choices.setHandler("cancel",()=>this.back());this.addWindow(this._choices);
            this._details=this.panel(new Rectangle(406,108,Graphics.boxWidth-418,230));this._jobPreview=this.panel(new Rectangle(406,350,Graphics.boxWidth-418,Graphics.boxHeight-442),Window_RPGCampsite);this._jobPreview.setState(managerState());this._footer=this.footer([]);this._choices.onSelectionChange=()=>this.refreshDetails();this.refresh();
            const button=document.createElement("button"),r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;
            button.id="camp-jobs-auto-assign";button.textContent="Auto-assign";button.style.cssText=`position:fixed;z-index:23;left:${r.left+12*scale}px;top:${r.top+113*scale}px;width:${382*scale}px;height:${36*scale}px;background:#e8c583;color:#302248;border:2px solid #fff0c7;border-radius:7px;font:bold ${18*scale}px Trebuchet MS;cursor:pointer`;
            button.onclick=()=>{const result=progression.autoAssignCampJobs(managerState());this._mode="members";this.refresh(result.message);};
            for(const event of ["mousedown","mouseup","keydown","keyup"])button.addEventListener(event,e=>e.stopPropagation());document.body.appendChild(button);this._autoAssign=button;button.disabled=!this.available().length;
        }
        available(){return roster().filter(n=>isLiving(n)&&!progression.isUnavailable(managerState(),n.id));}
        jobLabel(job){return {idle:"○ Idle — no income",work:"⚒ Workshop — 1-2 Gold / 2 minutes",study:"◇ Study — 1-2 Arcana / 2 minutes"}[job];}
        entries(){
            if(this._mode==="members")return [...roster().map(n=>({name:`${n.name} / ${progression.isUnavailable(managerState(),n.id)?"AWAY":progression.campJobFor(managerState(),n.id)||"idle"}${n.health<n.maxHealth?" / recovering":""}`,symbol:"choose",ext:n.id,enabled:isLiving(n)&&!progression.isUnavailable(managerState(),n.id)})),{name:"Back to Camp",symbol:"back"}];
            return [...progression.CAMP_JOBS.map(job=>({name:`${progression.campJobFor(managerState(),this._memberId)===job?"✓ ":""}${this.jobLabel(job)}`,symbol:"choose",ext:job})),{name:"Back to companions",symbol:"back"}];
        }
        refresh(message=""){const index=this._choices.index();this._choices.refresh();this._choices.select(Math.max(0,index));this._choices.activate();this.refreshDetails();this._jobPreview.setState(managerState());this._footer.setLines([message||"Select a companion, then choose Idle, Workshop, or Study.","One assignment each; away companions do not produce. Closed game time grants no progress."]);}
        refreshDetails(){
            const p=this._details,n=findNpc(this._mode==="members"?this._choices.currentExt():this._memberId);p.contents.clear();if(!n){p.setLines(["Camp assignments","Workshop: Gold / Study: Arcana","Base: 1 resource / 2 minutes. Matching classes produce 2.","All living camp members recover HP."]);return;}
            CozyUI.portraitFrame(p,n,12,12,48);CozyUI.text(p,n.name,76,8,p.innerWidth-88,21,"#f4deb0","left",28);CozyUI.text(p,`${n.health}/${n.maxHealth} HP / ${n.injury||"Healthy"}`,76,42,p.innerWidth-88,14,"#c8dfbc","left",20);
            const job=progression.campJobFor(managerState(),n.id);CozyUI.wrap(p,`Current: ${this.jobLabel(job)||"Unavailable"}. ${n.health<n.maxHealth?"Recovering: +1 HP / 30 seconds alongside the assignment.":"Ready at camp."}`,8,82,p.innerWidth-16,16,"#fff0ce",3,23);
            CozyUI.wrap(p,`Best job: ${progression.bestCampJob(n)==="work"?"Workshop (Gold)":"Study (Arcana)"}, 2 per 2 minutes. Other work earns 1 per 2 minutes. Away companions do not produce.`,8,159,p.innerWidth-16,13,"#c6b99d",2,18);
        }
        choose(){const value=this._choices.currentExt();if(this._mode==="members"){this._memberId=value;this._mode="jobs";this._choices.select(0);this.refresh();return;}const result=progression.assignCampJob(managerState(),this._memberId,value);result.ok?SoundManager.playOk():SoundManager.playBuzzer();this.refresh(result.message);}
        back(){if(this._mode==="jobs"){this._mode="members";this.refresh();}else this.popScene();}
        terminate(){this._autoAssign?.remove();super.terminate();}
    }

    class Window_RPGEquipmentProfile extends Window_RPGPanel {
        setContext(state,npc,slot=null,candidateId=undefined){this._state=state;this._npc=npc;this._slot=slot;this._candidateId=candidateId;this.refresh();}
        slotLabel(slot){return{head:"♜ HEAD",body:"▣ BODY",offHand:"⛨ OFF-HAND",accessory:"✦ ACCESSORY"}[slot]||slot.toUpperCase();}
        update(){super.update();if(!this.visible)return;const p=this.worldTransform.applyInverse(new Point(TouchInput.x,TouchInput.y)),x=p.x-this.padding,y=p.y-this.padding,cx=this.innerWidth/2,hit=[["head",cx-73,94],["body",8,168],["offHand",this.innerWidth-154,168],["accessory",cx-73,238]].find(([,sx,sy])=>x>=sx&&x<sx+146&&y>=sy&&y<sy+54),hover=hit?.[0]||null;if(hover!==this._hoverSlot){this._hoverSlot=hover;this.refresh();}if(TouchInput.isTriggered()&&this._slotHandler&&hit)this._slotHandler(hit[0]);}
        drawSlot(slot,x,y,w=146){
            const npc=this._npc,id=npc.equipmentSlots?.[slot],item=progression.SHOP[id],selected=this._slot===slot||this._hoverSlot===slot;
            CozyUI.round(this.contents,x,y,w,54,selected?"#3e5485":"#283454",selected?"#e8c583":"#827554",5);
            CozyUI.text(this,this.slotLabel(slot),x+7,y+3,w-14,11,selected?"#f4d592":"#bfb28e","left",15);
            CozyUI.text(this,item?.name||"Empty slot",x+7,y+19,w-14,13,"#f4e8cf","left",17);
            CozyUI.text(this,item?(npc.equipmentCondition[id]?.broken?"BROKEN - repair in Shop":`${npc.equipmentCondition[id]?.hitsRemaining??item.durability}/${item.durability} hits left`):"No item equipped",x+7,y+37,w-14,10,"#b8cea5","left",14);
        }
        drawCharacter(npc){
            const face=(npc.walkPortrait||npc.portrait)||{sheet:"Actor1",index:0},custom=face.sheet==="RPGManagerMonsters",bitmap=custom?managerArt("faces",face.sheet):managerArt("characters",face.sheet),cx=Math.floor(this.innerWidth/2);
            CozyUI.ellipse(this.contents,cx,191,58,43,"#5d674b");CozyUI.ellipse(this.contents,cx,217,31,7,"#29352b88");
            if(bitmap.isReady()){const big=!custom&&ImageManager.isBigCharacter(face.sheet),w=bitmap.width/(custom?(face.columns||4):big?3:12),h=bitmap.height/(custom?(face.rows||2):big?4:8);this.contents.paintOpacity=npc.alive?255:110;this.contents.blt(bitmap,custom?(face.index%(face.columns||4))*w:((big?0:face.index%4)*3+1)*w,custom?Math.floor(face.index/(face.columns||4))*h:(big?0:Math.floor(face.index/4)*4)*h,w,h,cx-24,147,48,72);this.contents.paintOpacity=255;}
            else CozyUI.icon(this.contents,"roster",cx-20,168,40,"#b8cea5");
        }
        refresh(){
            this.contents.clear();const npc=this._npc;if(!npc)return;const w=this.innerWidth,cx=Math.floor(w/2),armor=npc.classArmor+progression.equipmentArmor(npc),ward=(npc.temporaryWard||0)+(npc.innateWard||0),bonds=progression.bondPartners(this._state,npc.id).filter(progression.living).length;
            this.contents.fontFace=`Georgia, ${$gameSystem.mainFontFace()}`;CozyUI.text(this,progression.displayName(npc),8,0,w-16,24,"#f4deb0","center",31);this.contents.fontFace=`Trebuchet MS, ${$gameSystem.mainFontFace()}`;
            const away=progression.isUnavailable(this._state,npc.id),condition=!npc.alive?"FALLEN":away?"AWAY / ACTIONS LOCKED":npc.injury?"WOUNDED":npc.reanimated?"REANIMATED":"HEALTHY";
            CozyUI.text(this,`Level ${npc.level} ${progression.identityLabel(npc)} / ${condition}`,8,33,w-16,13,!npc.alive||npc.injury?"#e9afa1":"#b8cea5","center",20);
            const stat=(name,count,x,color,draw)=>{CozyUI.round(this.contents,x,61,(w-32)/3,26,"#304c88",null,4);CozyUI.text(this,name,x+6,64,44,11,color,"left",18);if(count*11+49>(w-32)/3){draw(this.contents,x+49,69,9,true);CozyUI.text(this,String(count),x+65,64,(w-32)/3-72,12,color,"left",18);}else for(let i=0;i<count;i++)draw(this.contents,x+49+i*11,69,9,i<npc.health);};
            stat("HP",npc.maxHealth,8,"#edb4a7",drawBattleHeart);stat("Armor",armor,12+(w-32)/3,"#95cef0",drawBattleShield);stat("Ward",ward,16+2*(w-32)/3,"#c5ade4",drawBattleWard);
            this.contents.fillRect(cx,139,1,106,"#9a8b60");this.contents.fillRect(128,192,w-256,1,"#9a8b60");this.drawCharacter(npc);
            this.drawSlot("head",cx-73,94);this.drawSlot("body",8,168);this.drawSlot("offHand",w-154,168);this.drawSlot("accessory",cx-73,238);
            CozyUI.text(this,`Class Armor ${npc.classArmor}/${npc.classArmorMax} / Crit ${Math.round(npc.critChance*100)}% x2 / Dodge ${Math.round(npc.dodgeChance*100)}% / Speed ${Math.round(npc.speed)}`,8,303,w-16,16,"#ffe16b","center",24);
            if(this._slot&&this._candidateId!==undefined){
                const current=progression.SHOP[npc.equipmentSlots?.[this._slot]],next=progression.SHOP[this._candidateId];CozyUI.round(this.contents,4,333,w-8,65,"#30477d","#9c9d6c",5);
                CozyUI.text(this,"COMPARE BEFORE EQUIPPING",12,337,w-24,12,"#e8c583","center",17);
                CozyUI.text(this,`Current: ${current?.name||"Empty"} / ${npc.equipmentCondition[npc.equipmentSlots?.[this._slot]]?.current??current?.armor??0} Armor`,12,357,w-24,13,"#f4e8cf","left",17);
                CozyUI.text(this,`Choice: ${next?.name||"Unequip"} / ${next?.hp?`+${next.hp} HP`:this._candidateId?`${progression.availableEquipmentArmor(this._state,this._candidateId)} Armor`:"Empty"}${this._candidateId?` / Stock ${this._state.equipmentStock[this._candidateId]||0}`:""}`,12,377,w-24,13,"#c5d6b1","left",17);
            }else{
                const traits=(npc.earnedTraits||[]).map(id=>progression.EARNED_TRAITS.find(t=>t.id===id)?.name||id),wounds=(npc.permanentWounds||[]).map(id=>progression.WOUND_DEFINITIONS.find(t=>t.id===id)?.name||id);
                CozyUI.wrap(this,`Wounded traits: ${wounds.join(", ")||"None"}${npc.lastingInjuries?` / ${npc.lastingInjuries} lasting injuries (-${npc.lastingInjuries*2}pp Dodge; 3% slower initiative per stack)`:""}`,12,374,w-24,13,"#c6b99d",1,18);
            }
        }
    }

    class Scene_RPGMember extends Scene_RPGBase {
        prepare(id) { this._npcId = id; Scene_RPGMember.selectedId = id; }
        create() {
            super.create(); this._npcId ||= Scene_RPGMember.selectedId; this._mode = "main"; this._slot = "head";
            this._header = this.header(findNpc(this._npcId).name, "Identity is fixed. Only the name can be changed.");
            this._details = this.panel(new Rectangle(332, 108, Graphics.boxWidth - 344, Graphics.boxHeight - 200), Window_RPGEquipmentProfile);
            this._choices = new Window_RPGChoices(new Rectangle(12, 108, 308, Graphics.boxHeight - 200), () => this.entries());
            this._choices.setHandler("choose", this.choose.bind(this));
            this._choices.setHandler("back", this.back.bind(this));
            this._choices.setHandler("cancel", this.back.bind(this));
            this.addWindow(this._choices);
            this._footer = this.footer([]); this.refresh();
            this._details._slotHandler=slot=>{this._slot=slot;this._mode="gear";this.refresh();};
            this._choices.onSelectionChange = () => {
                this.refreshProfile();if(this._mode==="supplies"){this._footer.setLines([progression.SHOP[this._choices.currentExt()]?.description||"Return to the member menu.","Use at camp. Healing never exceeds maximum HP."]);return;}if (this._mode !== "gear") return;
                if (this._choices.currentSymbol() === "back") { this._footer.setLines(["Return to slot selection.", "Both equipped items remain in place."]); return; }
                const id = this._choices.currentExt(), item = progression.SHOP[id];
                this._footer.contents.clear();CozyUI.wrap(this._footer,`${item?progression.itemSummary(id):"Unequipping returns the item to shared stock."} ${item&&!progression.compatible(findNpc(this._npcId),id)?`Cannot equip: ${findNpc(this._npcId).role} is incompatible.`:`Select to equip in ${this._slot}.`}`,8,0,this._footer.innerWidth-16,15,"#fff0cd",3,18);
            };
        }
        refreshProfile(){const candidate=this._mode==="gear"&&this._choices.currentSymbol()!=="back"?this._choices.currentExt():undefined;this._details.setContext(managerState(),findNpc(this._npcId),["slots","gear"].includes(this._mode)?this._slot:null,candidate);if(["powers","wounds"].includes(this._mode)){this._details.contents.clear();CozyUI.wrap(this._details,this._choices.currentExt()||"No active entries. Back returns to the character menu.",12,20,this._details.innerWidth-24,18,"#fff0ce",14,25);}}
        entries() {
            const state = managerState(), npc = findNpc(this._npcId);
            let entries;
            if (this._mode === "main") entries = [
                {name:"Acquired powers",ext:"powers"}, {name:"Wounds and effects",ext:"wounds"}, { name: "Rename", ext: "rename" }, {name:"Dismiss",ext:"dismiss",enabled:!progression.dismissalError(state,npc.id)}
            ];
            else if (["powers","wounds"].includes(this._mode)) entries=(this._mode==="powers"?progression.powerTrack(npc):progression.woundLines(npc)).map(text=>({name:text.split(":")[0].split(" — ")[0],ext:text}));
            else if (this._mode === "confirmDismiss") entries = [
                { name: `Confirm release of ${npc.name}`, ext: "confirmDismiss" }, { name: "Keep Adventurer", ext: "cancelDismiss" }
            ];
            else if (this._mode === "slots") entries = progression.EQUIPMENT_SLOTS.map(slot => ({ name: `${slot}: ${progression.SHOP[npc.equipmentSlots?.[slot]]?.name || "Empty"}`, ext: slot }));
            else if (this._mode === "gear") entries = [...progression.armorGearIds().filter(id=>progression.SHOP[id].slot===this._slot), null].map(id => ({ name: id ? `${progression.SHOP[id].name} [${progression.itemBoosts(id)}] (${state.equipmentStock[id]})${progression.compatible(npc,id)?"":" / Wrong class"}` : "Unequip", ext: id, enabled: !progression.isUnavailable(state,npc.id)&&progression.living(npc)&&(id===null || state.equipmentStock[id]>0&&progression.compatible(npc,id)) }));
            else entries = ["potion"].map(id => ({ name: `${progression.SHOP[id].name} (${state.supplies[id]})`, ext: id, enabled: !progression.itemError(state, npc.id, id) }));
            return [...entries.map(e => ({ ...e, symbol: "choose" })), { name: "Back", symbol: "back" }];
        }
        refresh(message = "") {
            this._choices.refresh(); this._choices.activate(); this.refreshProfile();
            const hints = { main: "Manage equipment, powers, wounds, supplies or identity at camp.", powers:"Select a learned power to read its trigger, limit and cooldown.",wounds:"Permanent titles share lasting-injury stacks; they do not add duplicate penalties.", confirmDismiss: "Confirm dismissal: preserves this living character in the archive and creates an empty slot. Tavern replacements are free.", slots: "Choose Head, Body, Off-hand, or Accessory.", gear: `Choose valid equipment for ${this._slot}.`, supplies: "Potions never revive the dead." };
            this._header.setLines([findNpc(this._npcId).name, this._mode === "gear" ? `Equipment > Slot ${this._slot}` : ({main:"Adventurer Career",powers:"Acquired powers",wounds:"Wound effects",confirmDismiss:"Confirm Dismissal",slots:"Equipment",supplies:"Use supplies"})[this._mode]]);
            this._footer.setLines([message || hints[this._mode], this._mode === "gear" ? "Grey items: no stock, already equipped, duplicate type, or adventurer away." : "Esc / right-click: back. Choose one to three of up to five roster members for quests."]);
        }
        choose() {
            const value = this._choices.currentExt(), state = managerState();
            if(["powers","wounds"].includes(this._mode)){this.refreshProfile();this._choices.activate();return;}
            if (this._mode === "main") {
                if (value === "rename") { SceneManager.push(Scene_RPGRename); SceneManager.prepareNextScene(this._npcId); return; }
                if (value === "dismiss") { this._mode = "confirmDismiss"; this.refresh(); this._choices.select(0); return; }
                this._mode = value;
            } else if (this._mode === "confirmDismiss") {
                if (value === "cancelDismiss") { this._mode = "main"; this.refresh(); this._choices.select(0); return; }
                const result = progression.dismissAdventurer(state, this._npcId,true);
                if (result.ok) { SoundManager.playOk(); this.popScene(); }
                else { SoundManager.playBuzzer(); this._mode = "main"; this.refresh(result.message); }
                return;
            } else if (this._mode === "slots") { this._slot = value; this._mode = "gear"; }
            else {
                const result = this._mode === "gear" ? progression.equipSlot(state, this._npcId, value, this._slot) : progression.useItem(state, this._npcId, value);
                if (result.ok) SoundManager.playOk(); else SoundManager.playBuzzer();
                this.refresh(result.message); return;
            }
            this.refresh(); this._choices.select(0);
        }
        back() {
            if (this._mode === "main") this.popScene();
            else { this._mode = this._mode === "gear" ? "slots" : "main"; this.refresh(); this._choices.select(0); }
        }
    }

    class Scene_RPGTeamSetup extends Scene_RPGBase {
        create() {
            super.create(); this.header("Team Setup", "Build the expedition party here. Away members stay locked until return.");
            this._info = this.panel(new Rectangle(332, 108, Graphics.boxWidth - 344, 300));
            this._choices = new Window_RPGChoices(new Rectangle(12, 108, 308, 220), () => [
                ...["A", "B"].map(team => { const trip = progression.tripForTeam(managerState(), team); return { name: `Team ${team} - ${trip ? trip.phase.toUpperCase() : `${managerState().teams[team].length}/5 members`}`, symbol: "team", ext: team, enabled: !trip }; }),
                { name: "Back to Home", symbol: "back" }
            ]);
            this._choices.setHandler("team", this.editTeam.bind(this)); this._choices.setHandler("back", this.popScene.bind(this)); this._choices.setHandler("cancel", this.popScene.bind(this));
            this._choices.onSelectionChange = this.refreshInfo.bind(this); this.addWindow(this._choices);
            this.footer(["A member can belong to only one team; assigning transfers them safely.", "Select 1-5 living, available adventurers, then Confirm Team."]); this.refreshInfo();
        }
        start() { super.start(); this._choices.refresh(); this._choices.activate(); this.refreshInfo(); }
        refreshInfo() {
            const team = this._choices.currentExt(), state = managerState();
            if (!team) { this._info.setLines(["Return Home."]); return; }
            const trip = progression.tripForTeam(state, team), ids = state.teams[team];
            this._info.contents.clear(); this._info.line(`TEAM ${team}`, 0, ColorManager.systemColor(), 26); this._info.rule(34);
            ids.forEach((id, index) => this._info.line(`${index + 1}. ${findNpc(id)?.name || id}`, 48 + index * 30, ColorManager.normalColor(), 18));
            this._info.line(trip ? `Locked: expedition / ${trip.phase}` : progression.teamError(state, ids, team) || "Ready for dispatch.", 220, trip ? ColorManager.crisisColor() : ColorManager.powerUpColor(), 17);
        }
        editTeam() {
            const team = this._choices.currentExt();
            if (!progression.selectTeam(managerState(), team)) { SoundManager.playBuzzer(); this._choices.activate(); return; }
            SceneManager.push(Scene_RPGRoster); SceneManager.prepareNextScene(true, false);
        }
    }

    class Scene_RPGReadyBattles extends Scene_RPGBase {
        create() {
            super.create(); this.header("Arrived Quests", "Arrival does not start combat. Choose an arrived team when you are ready.");
            this._info = this.panel(new Rectangle(332, 108, Graphics.boxWidth - 344, 300));
            this._choices = new Window_RPGChoices(new Rectangle(12, 108, 308, 220), () => [
                ...["A", "B"].filter(team => progression.tripForTeam(managerState(), team)?.phase === "ready").map(team => ({ name: `Start Team ${team} Battle`, symbol: "start", ext: team })),
                { name: "Back to Home", symbol: "back" }
            ]);
            this._choices.setHandler("start", this.startBattle.bind(this)); this._choices.setHandler("back", this.popScene.bind(this)); this._choices.setHandler("cancel", this.popScene.bind(this));
            this._choices.onSelectionChange = this.refreshInfo.bind(this); this.addWindow(this._choices);
            this.footer(["Battle presentation is separate from travel time.", "After combat, the team begins its saved return timer."]); this.refreshInfo();
        }
        refreshInfo() {
            const team = this._choices.currentExt(), trip = progression.tripForTeam(managerState(), team);
            if (!trip) { this._info.setLines(["No other arrived quest is waiting."]); return; }
            const quest = findQuest(trip.questId);
            this._info.contents.clear(); this._info.badge(quest.boss ? "BOSS" : quest.faction.toUpperCase(), 8, 0, 130, factionColor(quest));
            this._info.line("Expedition ready", 42, factionColor(quest), 24);
            this._info.line(`Team ${team}: ${trip.team.map(member => findNpc(member.id)?.name || member.id).join(", ")}`, 82, ColorManager.normalColor(), 17);
            this._info.wrapped(`Danger: ${quest.danger}`, 122);
        }
        startBattle() {
            const team = this._choices.currentExt(), trip = progression.tripForTeam(managerState(), team);
            if (!trip || trip.phase !== "ready") { SoundManager.playBuzzer(); this._choices.activate(); return; }
            const battle = createTripBattle(team); SceneManager.goto(Scene_RPGBattle); SceneManager.prepareNextScene(battle, trip.id, team);
        }
    }

    class Scene_RPGChooseLeader extends Scene_RPGBase {
        create() {
            super.create(); this.header("Choose a Party Leader", "The leader occupies one party slot and decides expedition interruptions.");
            this._details = this.panel(new Rectangle(332, 108, Graphics.boxWidth - 344, 330), Window_RPGDetails);
            this._choices = new Window_RPGChoices(new Rectangle(12, 108, 308, 400), () => [
                ...progression.sortRoster(roster().filter(npc => isLiving(npc) && !progression.isUnavailable(managerState(), npc.id)), Window_RPGRoster.sortMode || "healthy").map(npc => ({ name: `${npc.name} — ${npc.role} — L${npc.level}`, symbol: "leader", ext: npc.id })),
                { name: "Back", symbol: "back" }
            ]);
            this._choices.setHandler("leader", () => { const id = this._choices.currentExt(), state = managerState(), team = state.activeTeam; state.pendingLeaderId = id; state.teams[team] = [id]; state.teamIds = [id]; SceneManager.push(Scene_RPGRoster); SceneManager.prepareNextScene(true, false, "preparation"); });
            this._choices.setHandler("back", this.popScene.bind(this)); this._choices.setHandler("cancel", this.popScene.bind(this));
            this._choices.onSelectionChange = () => this._details.setNpc(findNpc(this._choices.currentExt())); this.addWindow(this._choices); this._choices.onSelectionChange();
            this.footer(["Select leadership before filling the remaining slots.", "Class and leadership guide autonomous event choices."]);
        }
    }

    class Scene_RPGChooseTeam extends Scene_RPGBase {
        create() {
            super.create(); this.header("Form Expedition", "Choose an open expedition slot, then select 1-5 available adventurers.");
            this._info = this.panel(new Rectangle(332, 108, Graphics.boxWidth - 344, 300));
            this._choices = new Window_RPGChoices(new Rectangle(12, 108, 308, 180), () => [
                ...["A", "B"].map(t => ({ name: `Expedition ${t}${progression.tripForTeam(managerState(), t) ? " (active)" : " (open)"}`, symbol: "team", ext: t, enabled: !progression.tripForTeam(managerState(), t) })), { name: "Back", symbol: "back" }
            ]);
            this._choices.setHandler("team", () => {
                const team = this._choices.currentExt(), state = managerState();
                if (!progression.selectTeam(state, team)) { SoundManager.playBuzzer(); this._choices.activate(); return; }
                state.teams[team] = []; state.teamIds = []; state.pendingLeaderId = null;
                SceneManager.push(Scene_RPGChooseLeader);
            });
            this._choices.setHandler("back", this.popScene.bind(this)); this._choices.setHandler("cancel", this.popScene.bind(this));
            this._choices.onSelectionChange = () => {
                const t = this._choices.currentExt(), trip = progression.tripForTeam(managerState(), t);
                this._info.setLines(t ? [trip ? `Expedition ${t} is already active.` : `Expedition ${t} is open.`, trip ? "This party is currently away." : "Select this slot to form a party from the available roster.", trip ? "Its adventurers are unavailable to the other expedition until they return." : "Adventurers currently away will be shown but cannot be selected."] : ["Return to camp."]);
            };
            this.addWindow(this._choices); this._choices.onSelectionChange();
            this.footer(["Each expedition may contain any 1-5 available adventurers.", "The same adventurer can never join both active expeditions."]);
        }
    }

    class Scene_RPGRename extends Scene_RPGBase {
        prepare(id,recruit=false) { this._npcId = id;this._recruit=recruit; }
        create() {
            super.create();
            this.header(this._recruit?"Name Your New Companion":"Rename Adventurer", "Type a name (1-24 characters). Save or Cancel; Esc cancels.");
            const form = document.createElement("form");
            form.style.cssText = "position:fixed;left:50%;top:45%;transform:translate(-50%,-50%);z-index:100;background:#172431;padding:28px;color:white;border:2px solid #8edaff;border-radius:8px;font:20px sans-serif;max-width:80vw";
            const label = document.createElement("label"); label.textContent = "Adventurer name ";
            const input = document.createElement("input"); input.type = "text"; input.maxLength = 24; input.value = (this._recruit?progression.replacementCandidates(managerState()).find(n=>n.id===this._npcId):findNpc(this._npcId))?.name||"";
            input.style.cssText = "font:22px sans-serif;width:95%;margin:16px 0;padding:6px";
            label.appendChild(input); form.appendChild(label);
            const npc=this._recruit?progression.replacementCandidates(managerState()).find(n=>n.id===this._npcId):findNpc(this._npcId), nicknameEligible=!this._recruit&&npc.level>=3&&!npc.nicknamePrompted;
            const nick=document.createElement("input"); if(nicknameEligible){const nickLabel=document.createElement("label");nickLabel.textContent="Level 3 nickname (may be blank) ";nick.type="text";nick.maxLength=20;nick.style.cssText=input.style.cssText;nickLabel.appendChild(nick);form.appendChild(nickLabel);}
            const randomize=document.createElement("button");randomize.type="button";randomize.textContent="Randomize Name";randomize.style.cssText="font:20px sans-serif;padding:10px;margin:8px";randomize.onclick=()=>{input.value=progression.randomName(Math.random,npc.classId,managerState().roster.filter(n=>n.id!==npc.id).map(n=>n.name),npc.sex);input.focus();input.select();};form.appendChild(randomize);
            const stats=document.createElement("p");stats.textContent=`${npc.role} / HP ${npc.health}/${npc.maxHealth} / Armor ${npc.classArmor}/${npc.classArmorMax} / Ward ${npc.innateWard}/${npc.innateWardMax} / Dodge ${Math.round(npc.dodgeChance*100)}% / Speed ${Math.round(npc.speed)} / Crit ${Math.round(npc.critChance*100)}% (double damage)`;form.appendChild(stats);
            const error = document.createElement("p");error.setAttribute("role","status"); form.appendChild(error);
            const save = document.createElement("button"); save.type = "submit"; save.textContent = this._recruit?"Confirm Free Hire":"Save name";
            const cancel = document.createElement("button"); cancel.type = "button"; cancel.textContent = "Cancel";
            for (const b of [save, cancel]) { b.style.cssText = "font:20px sans-serif;padding:10px;margin-right:12px"; form.appendChild(b); }
            form.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Escape") { e.preventDefault(); this.popScene(); } });
            form.addEventListener("keyup", e => e.stopPropagation());
            form.addEventListener("submit", e => {
                e.preventDefault();
                const result = this._recruit?progression.recruitCandidate(managerState(),this._npcId,input.value):progression.editProfile(managerState(), this._npcId, { name: input.value });
                if (result.ok) { if(nicknameEligible) progression.setNickname(managerState(),this._npcId,nick.value); this.popScene(); } else error.textContent = result.message;
            });
            cancel.onclick = () => this.popScene();
            this._form = form; document.body.appendChild(form); Input.clear(); input.focus(); input.select();
        }
        terminate() { this._form?.remove(); Input.clear(); TouchInput.clear(); super.terminate(); }
    }

    class Scene_RPGShop extends Scene_RPGBase {
        create() {
            super.create();this._selling=false;this._shopSlot="head";
            this._header = this.header("Shop", "");
            this._details = this.panel(new Rectangle(332, 108, Graphics.boxWidth - 344, 300));
            this._commandWindow = new Window_RPGChoices(new Rectangle(12, 202, 308, Graphics.boxHeight-302), () => [
                {name:this._selling?"Switch to Buy":"Switch to Sell",symbol:"mode"},
                ...(this._shopSlot==="repairs"?progression.activeRoster(managerState()).flatMap(n=>Object.values(n.equipmentSlots||{}).filter(id=>n.equipmentCondition[id]?.broken).map(id=>({name:`Repair ${n.name}: ${progression.SHOP[id].name} (${Math.ceil(progression.SHOP[id].price*.35)}g)`,symbol:"repair",ext:{npcId:n.id,itemId:id}}))):[]),
                ...progression.shopIds().filter(id=>this._shopSlot==="supplies"?!progression.SHOP[id].type:progression.SHOP[id].slot===this._shopSlot).map(id => { const item=progression.SHOP[id]; return ({
                    name: `${this._selling?"Sell":"Buy"} ${item.name} - ${this._selling?item.sellValue:item.price}g`, symbol: "buy", ext: id,
                    enabled: this._selling?(item.type?managerState().equipmentStock[id]:managerState().supplies[id])>0:!progression.purchaseError(managerState(), id)
                }); }), { name: "Back to Home", symbol: "back" }
            ]);

            this._commandWindow.setHandler("repair",()=>{const e=this._commandWindow.currentExt(),result=progression.repairGear(managerState(),e.npcId,e.itemId);this._footer.setLines([result.message]);this._commandWindow.refresh();this._commandWindow.activate();this.refreshDetails();});
            this._commandWindow.setHandler("mode",()=>{this._selling=!this._selling;this._commandWindow.refresh();this._commandWindow.activate();this.refreshDetails();});
            this._commandWindow.setHandler("buy", this.buy.bind(this));
            this._commandWindow.setHandler("back", this.popScene.bind(this));
            this._commandWindow.setHandler("cancel", this.popScene.bind(this));
            this._commandWindow.onSelectionChange = this.refreshDetails.bind(this);
            this.addWindow(this._commandWindow);
            this.mountSlotButtons();
            this._footer = this.footer(["Buy one item per click / Enter. Grey items cost more gold than you have.", "Roster > adventurer: Equipment / Use supplies."]);
            this.refreshDetails();
        }
        mountSlotButtons(){
            const bar=document.createElement("section"),r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;bar.id="shop-slot-tabs";bar.dataset.step="shop";bar.setAttribute("aria-label","Equipment categories");bar.style.cssText=`position:fixed;z-index:20;left:${r.left+12*scale}px;top:${r.top+108*scale}px;width:${308*scale}px;height:${84*scale}px;display:grid;grid-template-columns:1fr 1fr;gap:4px`;
            for(const [slot,label] of [["head","♜  Head"],["body","▣  Body"],["offHand","◈  Off-hand"],["accessory","✦  Accessory"],["supplies","⚗  Supplies"]]){
                const b=document.createElement("button");b.textContent=label;b.dataset.slot=slot;b.setAttribute("aria-pressed",String(slot===this._shopSlot));b.style.cssText=`font:bold ${14*scale}px Georgia;background:linear-gradient(#405b91,#2b3f72);color:#fff0ce;border:1px solid #c6ae65;border-radius:6px;box-shadow:inset 0 1px #ffffff33;cursor:pointer`;
                b.onclick=()=>{this._shopSlot=slot;for(const button of bar.querySelectorAll("button"))button.setAttribute("aria-pressed",String(button===b));this._commandWindow._commandPage=0;this._commandWindow.refresh();this._commandWindow.select(0);this._commandWindow.activate();this.refreshDetails();};bar.appendChild(b);
            }
            for(const event of ["keydown","keyup","mousedown","mouseup"])bar.addEventListener(event,e=>e.stopPropagation());
            bar.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();document.activeElement.blur();this._commandWindow.activate();}else if(e.key.startsWith("Arrow")){e.preventDefault();focusWizardDirection(bar,e.key.slice(5).toLowerCase());}});
            document.body.appendChild(bar);this._shopTabs=bar;
        }
        update(){super.update();if(!managerDialog&&this._commandWindow.active){const w=this._commandWindow,p=w.worldTransform.applyInverse(new Point(TouchInput.x,TouchInput.y)),index=w.hitTest(p.x,p.y);if(index>=0&&index!==w.index()){w.select(index);this.refreshDetails();}}
            if(Input.isTriggered("pageup")&&!managerDialog){this._commandWindow.deactivate();this._shopTabs.querySelector("button").focus();Input.clear();}}
        terminate(){this._shopTabs?.remove();super.terminate();}
        refreshDetails() {
            const state = managerState();
            this._header.setLines(["Home Base Shop", `Treasury: ${state.gold} gold | Earn gold by completing quests.`]);
            const id = this._commandWindow.currentExt(), item = progression.SHOP[id];
            this._details.contents.clear();
            if (!item) { this._details.setLines([`Shop / ${this._shopSlot}`,"Choose an equipment category button.","Head / Body / Off-hand / Accessory", "Supplies", "Gear is destroyed when its hit durability runs out. Buy a replacement and equip it from the character sheet."]); return; }
            if(item){CozyUI.round(this._details.contents,5,0,40,40,"#1f2d52","#d4b86e",7);CozyUI.itemIcon(this._details,id,12,7,26);}
            CozyUI.text(this._details,item.name,54,0,this._details.innerWidth-62,24,ColorManager.systemColor(),"left",32);
            CozyUI.wrap(this._details,item.description,8,42,this._details.innerWidth-16,18,"#fff1d4",2,24);
            CozyUI.wrap(this._details,`Classes: ${item.classes.map(id=>id[0].toUpperCase()+id.slice(1)).join(", ")}`,8,92,this._details.innerWidth-16,16,"#badbff",2,20);
            this._details.line(`Buy: ${item.price} Gold / Sell: ${item.sellValue} Gold`, 138);
            this._details.line(`Slot: ${item.slot||"supply"} / Owned: ${item.type ? state.equipmentStock[id] : state.supplies[id]} / Equipped: ${state.roster.filter(n=>Object.values(n.equipmentSlots||{}).includes(id)).length}`, 174);
            this._details.line(progression.purchaseError(state, id) || "Select to buy one.", 216, state.gold < item.price ? ColorManager.crisisColor() : ColorManager.powerUpColor());
        }
        buy(confirmed=false) {
            if(!confirmed&&!this._selling){const id=this._commandWindow.currentExt(),item=progression.SHOP[id];if(!item)return;const cancel=()=>{closeManagerDialog();this._commandWindow.activate();};this._commandWindow.deactivate();managerModal(`Buy ${item.name}?`,[progression.itemSummary(id)],[{name:`Buy for ${item.price} Gold`,run:()=>{closeManagerDialog();this.buy(true);}},{name:"Cancel",run:cancel}],cancel);return;}
            const result = this._selling?progression.sellItem(managerState(),this._commandWindow.currentExt()):progression.purchase(managerState(), this._commandWindow.currentExt());
            if (result.ok) SoundManager.playShop(); else SoundManager.playBuzzer();
            this._commandWindow.refresh(); this._commandWindow.activate();
            this.refreshDetails();
            this._footer.setLines([result.message, "Roster > adventurer: Equipment / Use supplies."]);
        }
    }

    class Scene_RPGTavern extends Scene_RPGStartingRoster {}

    class Scene_RPGAltar extends Scene_RPGBase {
        create() {
            super.create(); this._mode="ritual"; this._ritual=null;
            this._header=this.header("ALTAR",`Artifacts: ${managerState().magicalArtifacts||0} / Arcana: ${managerState().arcana||0}`);
            this._details=this.panel(new Rectangle(332,108,Graphics.boxWidth-344,360));
            this._choices=new Window_RPGChoices(new Rectangle(12,108,308,416),()=>this.entries());
            this._choices.setHandler("ritual",this.choose.bind(this)); this._choices.setHandler("target",this.cast.bind(this));this._choices.setHandler("replace",this.chooseReplacement.bind(this));
            this._choices.setHandler("back",()=>this._mode==="ritual"?this.popScene():this.back()); this._choices.setHandler("cancel",()=>this._mode==="ritual"?this.popScene():this.back());
            this._choices.onSelectionChange=this.refreshDetails.bind(this);this.addWindow(this._choices);
            this._footer=this.footer(["Magical Artifacts permanently unlock rituals. Arcana pays for each activation.","Artifacts drop only from successful quests; longer and harder quests improve the odds."]);this.refreshDetails();
        }
        start(){super.start();this.mountAltarPointerBridge();}
        mountAltarPointerBridge(){
            const resolve=event=>{
                if(SceneManager._scene!==this||managerDialog||!this._choices?.visible||!this._choices.active)return -1;
                const canvas=Graphics._canvas,rect=canvas?.getBoundingClientRect();if(!rect?.width||!rect.height)return -1;
                const gamePoint=new Point((event.clientX-rect.left)*Graphics.width/rect.width,(event.clientY-rect.top)*Graphics.height/rect.height);
                const local=this._choices.worldTransform.applyInverse(gamePoint);return this._choices.hitTest(local.x,local.y);
            };
            this._altarPointerMove=event=>{const index=resolve(event);if(index>=0&&index<this._choices.maxItems()&&index!==this._choices.index()&&!mobilePointerLayout())this._choices.select(index);};
            this._altarPointerDown=event=>{if(event.button!==0||mobilePointerLayout())return;const index=resolve(event);if(index<0||index>=this._choices.maxItems())return;event.preventDefault();event.stopImmediatePropagation();this._choices.select(index);this._choices.processOk();};
            this._altarPointerUp=()=>{};
            this._altarPointerCancel=()=>{};
            // Capture at document level so focused HTML navigation/timer controls
            // cannot starve the canvas list of its mouse input.
            document.addEventListener("pointermove",this._altarPointerMove,true);document.addEventListener("pointerdown",this._altarPointerDown,true);document.addEventListener("pointerup",this._altarPointerUp,true);document.addEventListener("pointercancel",this._altarPointerCancel,true);
            this._altarWheel=event=>{if(SceneManager._scene!==this||managerDialog||!this._choices?.active)return;const index=resolve(event);if(index<0)return;event.preventDefault();event.stopImmediatePropagation();const step=event.deltaY>0?1:-1,next=Math.max(0,Math.min(this._choices.maxItems()-1,this._choices.index()+step));this._choices.select(next);};document.addEventListener("wheel",this._altarWheel,{capture:true,passive:false});
        }
        entries(){
            const s=managerState();
            if(this._mode==="ritual"){
                const rows=progression.ritualEntries(),unlocked=rows.filter(([id])=>s.ritualsUnlocked[id]).map(([id,r])=>({name:`${r.name} / Activate ${r.castCost} Arcana`,symbol:"ritual",ext:id})),next=rows.find(([id])=>!s.ritualsUnlocked[id]);
                if(next)unlocked.push({name:`🔒 Unlock Next Ritual / ${next[1].unlockCost} Artifact${next[1].unlockCost===1?"":"s"}`,symbol:"ritual",ext:"__unlock_next"});
                return [...unlocked,{name:"Back to Home",symbol:"back"}];
            }
            if(this._mode==="replace")return [{name:"Cancel replacement",symbol:"back"},...progression.activeRoster(s).map(n=>({name:`Replace ${n.name}`,symbol:"replace",ext:n.id,enabled:!progression.isUnavailable(s,n.id)}))];
            const list=progression.RITUALS[this._ritual]?.target==="fallen"?progression.graveyard(s):progression.activeRoster(s);
            return [{name:"< Back to Altar",symbol:"back"},...list.map(n=>({name:`${n.name}${this._ritual==="healing_ritual"?` / ${n.permanentWounds.length} wounds`:this._ritual==="reanimate"&&(n.reanimated||n.reanimationExhausted)?" / Ineligible":""}`,symbol:"target",ext:n.id,enabled:(this._ritual!=="healing_ritual"||n.permanentWounds.length>0)&&(this._ritual!=="reanimate"||!n.reanimated&&!n.reanimationExhausted)}))];
        }
        choose(confirmed=false){let id=this._choices.currentExt(),s=managerState();if(id==="__unlock_next")id=progression.ritualEntries().find(([ritualId])=>!s.ritualsUnlocked[ritualId])?.[0];const r=progression.RITUALS[id];if(!r)return;if(!s.ritualsUnlocked[id]){if(!confirmed){const cancel=()=>{closeManagerDialog();this._choices.activate();};this._choices.deactivate();this._pendingRitualUnlock=id;managerModal("Unlock next ritual?",["The altar reveals rituals in a fixed progression.",`Next: ${r.name} · ${r.unlockCost} Magical Artifact${r.unlockCost===1?"":"s"}.`,`Future activations cost ${r.castCost} Arcana each.`],[{name:"Unlock Next Ritual",run:()=>{closeManagerDialog();this.showResult(progression.ritualUnlock(s,this._pendingRitualUnlock));this._pendingRitualUnlock=null;}},{name:"Cancel",run:cancel}],cancel);return;}this.showResult(progression.ritualUnlock(s,id));return;}if(!r.target){this.showResult(progression.ritualCast(s,id,null));return;}this._ritual=id;this._replaceId=null;this._mode=r.target==="fallen"&&!progression.vacantSlots(s).length?"replace":"target";this._choices.refresh();this._choices.select(0);this._choices.activate();this.refreshDetails();}
        chooseReplacement(){const id=this._choices.currentExt(),npc=findNpc(id),cancel=()=>{closeManagerDialog();this._choices.activate();};managerModal(`Replace ${npc.name}?`,[`${progression.classLabel(npc)} / Level ${npc.level}`,"All gear returns to inventory. The companion is removed only after the final resurrection confirmation."],[{name:"Choose fallen companion",run:()=>{closeManagerDialog();this._replaceId=id;this._mode="target";this._choices.refresh();this._choices.select(0);this._choices.activate();this.refreshDetails();}},{name:"Cancel",run:cancel}],cancel);}
        cast(){const s=managerState(),id=this._choices.currentExt(),ritual=this._ritual,r=progression.RITUALS[ritual];if(r.target!=="fallen"){this.showResult(progression.ritualCast(s,ritual,id));return;}const npc=findNpc(id),old=this._replaceId?findNpc(this._replaceId):null,cancel=()=>{closeManagerDialog();this._choices.activate();};managerModal("Confirm resurrection",[old?`Remove ${old.name} (${progression.classLabel(old)}, L${old.level}) and return all their gear.`:"Use the empty party slot.",ritual==="reanimate"?`Return ${npc.name} as a Skeleton ${progression.classFor(npc).name}, L${npc.level}; cannot level up.`:`Return ${npc.name} at 1 HP with an injury.`,`${npc.permanentWounds.length} wounds and acquired powers are preserved. Cost: ${r.castCost} Arcana.`],[{name:"Confirm resurrection",run:()=>{const result=progression.ritualCast(s,ritual,id,{replaceId:this._replaceId,confirmed:true});closeManagerDialog();this._mode="ritual";this.showResult(result);}},{name:"Cancel",run:cancel}],cancel);}
        back(){this._mode="ritual";this._ritual=null;this._choices.refresh();this._choices.select(0);this._choices.activate();this.refreshDetails();}
        showResult(result){result.ok?SoundManager.playOk():SoundManager.playBuzzer();this._header.setLines(["ALTAR",`Artifacts: ${managerState().magicalArtifacts||0} / Arcana: ${managerState().arcana||0}`]);this._choices.refresh();this._choices.activate();this._footer.setLines([result.message,"Unlock prices are paid once; activation costs are charged per successful use."]);this.refreshDetails();}
        refreshDetails(){
            this._details.contents.clear();let id=this._mode==="ritual"?this._choices.currentExt():this._ritual;if(id==="__unlock_next"){const p=this._details,w=p.innerWidth;p.line("A VEILED RITUAL",0,CozyUI.colors.honey,24);CozyUI.icon(p.contents,"altar",w/2-36,62,72,"#8f91a0");CozyUI.wrap(p,"The altar keeps future rites secret. Spend Artifacts to reveal and permanently unlock the next ritual in the sequence.",16,170,w-32,17,"#e6d7b5",5,24);return;}const r=progression.RITUALS[id];if(!r)return;
            const p=this._details,w=p.innerWidth,unlocked=managerState().ritualsUnlocked[id];p.line(r.name,0,CozyUI.colors.honey,24);
            const sigilKind={protection_ward:"ward",healing_ritual:"hp",greed_prayer:"coin",reanimate:"graveyard",battle_hymn:"battle",first_strike:"difficulty",familiars_vigil:"roster",arcane_rebate:"arcana",veil_of_mercy:"wound"}[id]||"altar";
            CozyUI.ellipse(p.contents,w-50,56,38,38,unlocked?"#184f46aa":"#242d4dcc");CozyUI.icon(p.contents,sigilKind,w-68,38,36,unlocked?"#8ff0bf":"#8f91a0");
            CozyUI.text(p,`Unlock: ${r.unlockCost} Magical Artifact${r.unlockCost===1?"":"s"}`,8,40,w-16,16,"#d6c6a6");
            CozyUI.text(p,`Activation: ${r.castCost} Arcana`,8,62,w-16,16,"#c5ade4");
            p.badge(unlocked?"UNLOCKED":"LOCKED",8,94,124,unlocked?"#a6c797":"#c6b99d");
            CozyUI.wrap(p,unlocked?"This ritual is permanently available. Arcana is charged only when an activation succeeds.":"Spend Magical Artifacts to unlock permanently. Find them randomly after successful quests.",16,128,w-32,16,"#e6d7b5",3,22);
            CozyUI.wrap(p,r.description,16,208,w-32,16,"#d7ccb2",4,22);
            if(managerState().ritualEffects?.[id])CozyUI.text(p,"PENDING / already activated",16,300,w-32,15,"#a6c797","left",22);
        }
        terminate(){document.removeEventListener("pointermove",this._altarPointerMove,true);document.removeEventListener("pointerdown",this._altarPointerDown,true);document.removeEventListener("pointerup",this._altarPointerUp,true);document.removeEventListener("pointercancel",this._altarPointerCancel,true);document.removeEventListener("wheel",this._altarWheel,true);super.terminate();}
    }

    class Scene_RPGDebugTimers extends Scene_RPGBase {
        create() {
            super.create(); this._mode = "main"; this._action = null;
            this.header("DEVELOPER DEBUG", "TESTING ONLY — actions reuse canonical game-state paths.");
            this._info = this.panel(new Rectangle(332, 108, Graphics.boxWidth - 344, 360));
            this._choices = new Window_RPGChoices(new Rectangle(12, 108, 308, 360), () => this.entries());
            this._choices.setHandler("debug", this.runAction.bind(this));
            this._choices.setHandler("submenu", this.openSubmenu.bind(this)); this._choices.setHandler("menuBack", this.backToDebug.bind(this));
            this._choices.setHandler("back", this.popScene.bind(this)); this._choices.setHandler("cancel", () => this._mode === "main" ? this.popScene() : this.backToDebug());
            this._choices.onSelectionChange = this.refreshInfo.bind(this); this.addWindow(this._choices);
            this._footer = this.footer(["Advance travel, encounter, battle, return, or finish through normal simulation.", "Apply Death asks for confirmation and uses the persistent death pipeline."]);
            this.refreshInfo();
        }
        entries() {
            const state = managerState();
            if (this._mode === "main") return [
                {name:"EXPEDITION / COMBAT",symbol:"heading",enabled:false},
                {name:"Advance Expedition Milestone",symbol:"submenu",ext:"travel"},
                {name:"Finish Active Expedition",symbol:"debug",ext:"finish",enabled:!!progression.tripForTeam(state,"A")},
                {name:"CHARACTERS",symbol:"heading",enabled:false},
                {name:"Level Up Character",symbol:"submenu",ext:"up"},{name:"Level Down Character",symbol:"submenu",ext:"down"},
                {name:"Apply Wounded",symbol:"submenu",ext:"wound"},{name:"Apply Death",symbol:"submenu",ext:"death"},
                {name:"Damage Equipped Armor",symbol:"submenu",ext:"gear"},
                {name:"CAMP / RESOURCES",symbol:"heading",enabled:false},
                {name:"Refresh Tavern Recruits",symbol:"debug",ext:"recruit"},{name:"+100 Gold / +50 Arcana",symbol:"debug",ext:"resources"},
                {name:"Back to Home",symbol:"back"}];
            const entries = [{ name: "< Back to DEBUG Menu", symbol: "menuBack" }];
            if (this._action === "travel") for (const team of ["A"]) entries.push({ name: "Advance to next expedition milestone", symbol: "debug", ext: `travel:${team}`, enabled: !!progression.tripForTeam(state, team) });
            else for (const npc of progression.sortRoster(state.roster.filter(progression.living), "healthy")) entries.push({ name: `${npc.name} — ${npc.role} — L${npc.level}`, symbol: "debug", ext: `${this._action}:${npc.id}` });
            return entries;
        }
        openSubmenu() { this._mode = "submenu"; this._action = this._choices.currentExt(); this._confirmDeath = null; this._choices.refresh(); this._choices.select(0); this._choices.activate(); this.refreshInfo(); }
        backToDebug() { this._mode = "main"; this._action = null; this._confirmDeath = null; this._choices.refresh(); this._choices.select(0); this._choices.activate(); this.refreshInfo(); }
        refreshInfo() {
            const ext = this._choices.currentExt(), state = managerState();
            if (!ext) { this._info.setLines(["Return Home."]); return; }
            const [kind, id] = ext.split(":"), npc = findNpc(id);
            this._info.setLines(["DEVELOPER DEBUG CONTROL", npc ? `${kind.toUpperCase()}: ${npc.name}` : ext, kind === "travel" ? "Runs the next travel, encounter, battle, return, or completion milestone using the current simulation. Camp production is not fast-forwarded." : kind === "death" ? "Permanent. Confirmation is required." : "Uses the same persisted roster state as normal play."]);
        }
        runAction() {
            const ext = this._choices.currentExt(), [kind, id] = ext.split(":");
            if (kind === "death" && this._confirmDeath !== ext) { this._confirmDeath = ext; SoundManager.playBuzzer(); this._footer.setLines([`Select Apply Death — ${findNpc(id).name} again to confirm.`, "This uses permanent death and Graveyard state."]); this._choices.activate(); return; }
            let result;
            if(kind==="resources"){managerState().gold+=100;managerState().arcana+=50;result={ok:true,message:"Added 100 Gold and 50 Arcana."};}
            else if(kind==="finish")result=progression.debugAdvanceExpedition(managerState(),$dataRPGManagerQuests,window.RPGManagerBattle.Battle,true);
            else if (kind === "travel") result = progression.debugAdvanceExpedition(managerState(), $dataRPGManagerQuests, window.RPGManagerBattle.Battle);
            else if(kind==="gear")result=progression.debugDamageEquipment(managerState(),id);
            else if (kind === "up") result = progression.debugLevel(managerState(), id, 1);
            else if (kind === "down") result = progression.debugLevel(managerState(), id, -1);
            else if (kind === "wound") result = progression.applyWound(managerState(), id);
            else if (kind === "death") result = progression.applyDeath(managerState(), id, "DEBUG");
            else result = progression.debugRefreshRecruits(managerState());
            console.info("[RPG Manager DEBUG]", ext, result);
            result.ok ? SoundManager.playOk() : SoundManager.playBuzzer();
            this._choices.refresh(); this._choices.activate(); this.refreshInfo();
            this._footer.setLines([result.message, "State updated through the canonical debug helper."]);
        }
    }

    // Existing MZ save slots serialize Game_System, including our plain data.
    // Returning from a loaded manager save must open Home Base, not Scene_Map.
    function restoreManagerSave() {
        let state = $gameSystem._rpgManager;
        if (!state) return false;
        if (!state.version || state.version < 3) {
            // Day 1/2 had no in-game save flow; preserve any manually saved roster.
            const migrated = Object.assign(progression.createState($dataRPGManagerRoster), state);
            migrated.teamIds = (state.teamIds || []).filter(id => migrated.roster.some(n => n.id === id && isLiving(n)));
            for (const npc of migrated.roster) {
                const template = $dataRPGManagerRoster.find(n => n.id === npc.id);
                npc.portrait = template?.portrait;
                npc.passiveTrait.stat ||= template?.passiveTrait.stat || "attack";
            }
            $gameSystem._rpgManager = migrated;
            state = migrated;
        }
        if(state.recruit){const saved=state.recruit.remainingSessionMs,remaining=typeof saved==="number"&&Number.isFinite(saved)&&saved>=0?saved:Math.min(progression.RECRUIT_REFRESH_MS,Math.max(0,state.recruit.deadlineMs-Date.now())||progression.RECRUIT_REFRESH_MS);state.recruit.deadlineMs=Date.now()+remaining;delete state.recruit.remainingSessionMs;}
        realtimeTickAt=null;clockState=null;runtimeClockAt=null;progression.upgradeState(state);syncMissionClock();
        if (!quests().some(quest => quest.id === state.selectedQuestId)) state.selectedQuestId = quests()[0].id;
        // Normal saves are Home-only. Recover an old/manual in-flight save at
        // Home without awarding a result or charging an unfinished quest.
        if (state.activeQuest) {
            state.legacyInterruptedQuest = JSON.parse(JSON.stringify(state.activeQuest));
            state.activeQuest = null;
            state.recoveryNotice = "Legacy interrupted quest preserved in the save archive. No rewards or costs applied; current timed expeditions resume normally.";
        }
        window.RPGManager.lastBattle = null;
        return true;
    }
    const onLoadSuccess = Scene_Load.prototype.onLoadSuccess;
    Scene_Load.prototype.onLoadSuccess = function() {
        if (!restoreManagerSave()) { onLoadSuccess.call(this); return; }
        SoundManager.playLoad();
        this.fadeOutAll();
        SceneManager.goto(Scene_RPGHome);
        this._loadSuccess = true;
    };

    const MANAGER_SAVE_ID=1,MANAGER_AUTOSAVE_INTERVAL=3*60*1000;
    let managerNextAutosaveAt=Date.now()+MANAGER_AUTOSAVE_INTERVAL;
    DataManager.maxSavefiles=function(){return 2;};
    DataManager.latestSavefileId=function(){return DataManager.savefileInfo(MANAGER_SAVE_ID)?MANAGER_SAVE_ID:0;};
    Window_TitleCommand.prototype.isContinueEnabled=function(){return !!DataManager.savefileInfo(MANAGER_SAVE_ID)&&DataManager.savefileExists(MANAGER_SAVE_ID);};
    let managerSavePromise=null;
    function saveManagerCampaign(){
        if(managerSavePromise)return managerSavePromise;
        if(!globalThis.$gameSystem?._rpgManager)return Promise.resolve(false);
        managerSavePromise=(async()=>{const normalIndex=DataManager.saveGlobalInfo;let indexWrite;$gameSystem.setSavefileId(MANAGER_SAVE_ID);$gameSystem.onBeforeSave();DataManager.saveGlobalInfo=function(){return indexWrite=StorageManager.saveObject("global",this._globalInfo);};try{const saved=await DataManager.saveGame(MANAGER_SAVE_ID);if(saved===false)throw Error("The save could not be written.");if(indexWrite)await indexWrite;return true;}finally{DataManager.saveGlobalInfo=normalIndex;}})().finally(()=>managerSavePromise=null);
        return managerSavePromise;
    }
    async function requestManagerSave(scene=SceneManager._scene){
        scene?._footer?.setLines?.(["Saving campaign…","Manual and automatic saves share the single campaign slot."]);
        try{const saved=await saveManagerCampaign();if(!saved)throw Error("No active campaign.");managerNextAutosaveAt=Date.now()+MANAGER_AUTOSAVE_INTERVAL;SoundManager.playSave();scene?._footer?.setLines?.(["Campaign saved.","Automatic save runs every 3 minutes while the game is active."]);return true;}
        catch(error){console.error(error);SoundManager.playBuzzer();scene?._footer?.setLines?.([`Save failed: ${error.message||error}`,"Your game remains open; try Save again."]);return false;}
    }
    const managerBaseUpdate=Scene_RPGBase.prototype.update;
    Scene_RPGBase.prototype.update=function(){
        managerBaseUpdate.call(this);if(!globalThis.$gameSystem?._rpgManager||managerState().startingRosterPending)return;
        if(Date.now()>=managerNextAutosaveAt&&!this._managerAutosaveBusy){this._managerAutosaveBusy=true;managerNextAutosaveAt=Date.now()+MANAGER_AUTOSAVE_INTERVAL;saveManagerCampaign().catch(console.error).finally(()=>this._managerAutosaveBusy=false);}
    };
    Window_TitleCommand.prototype.makeCommandList = function() {
        const hasSave = this.isContinueEnabled();
        this.addCommand("Continue", "continue", hasSave);
        this.addCommand("New Game", "newGame");
    };
    Window_TitleCommand.prototype.selectLast = function() {
        this.selectSymbol(this.isContinueEnabled() ? "continue" : "newGame");
    };
    const createTitleCommands = Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function() {
        createTitleCommands.call(this);
        this.mountMouseTitleMenu();
    };
    Scene_Title.prototype.mountMouseTitleMenu=function(){
        this._titleMouseMenu?.remove();document.getElementById("title-menu-effects")?.remove();const effects=document.createElement("style");effects.id="title-menu-effects";effects.textContent='@keyframes titleQuestGlow{0%,100%{filter:brightness(1);box-shadow:inset 0 2px #fff8,0 4px 0 #12264e,0 8px 18px #0009,0 0 10px #f7ca5d55}50%{filter:brightness(1.16);box-shadow:inset 0 2px #fffb,0 4px 0 #12264e,0 10px 24px #000b,0 0 24px #ffd86faa}}#title-mouse-menu button:not(:disabled){animation:titleQuestGlow 2.2s ease-in-out infinite}#title-mouse-menu button:nth-child(2){animation-delay:-1.1s}#title-mouse-menu button:hover{animation:none!important;filter:brightness(1.22)!important;transform:translateY(-3px) scale(1.025)}#title-mouse-menu button:active{transform:translateY(2px) scale(.985)}';document.head.appendChild(effects);this._titleMenuEffects=effects;const menu=document.createElement("div"),r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;menu.id="title-mouse-menu";menu.style.cssText=`position:fixed;z-index:30;left:${r.left+(Graphics.width/2-170)*scale}px;top:${r.top+365*scale}px;width:${340*scale}px;display:grid;gap:${13*scale}px`;
        const add=(label,symbol,enabled=true)=>{const b=document.createElement("button");b.textContent=symbol==="continue"?`✦  ${label.toUpperCase()}  ✦`:`⚔  ${label.toUpperCase()}  ⚔`;b.disabled=!enabled;b.style.cssText=`height:${58*scale}px;border:${3*scale}px solid #ffe39a;border-radius:${12*scale}px;background:linear-gradient(155deg,#587cc1,#294b89 58%,#17325f);color:#fff4cf;box-shadow:inset 0 ${2*scale}px #ffffff88,0 ${4*scale}px 0 #12264e,0 ${8*scale}px ${18*scale}px #0009,0 0 ${14*scale}px #f7ca5d66;font:bold ${22*scale}px Georgia;letter-spacing:${1.2*scale}px;text-shadow:0 ${2*scale}px #132852;cursor:${enabled?"pointer":"default"};opacity:${enabled?1:.45};transition:transform .1s ease,filter .12s ease`;
            b.onclick=()=>{this._commandWindow.selectSymbol(symbol);this._commandWindow.processOk();};menu.appendChild(b);};
        add("Continue","continue",this._commandWindow.isContinueEnabled());add("New Game","newGame");for(const e of ["mousedown","mouseup","touchstart","touchend","keydown","keyup"])menu.addEventListener(e,event=>event.stopPropagation());document.body.appendChild(menu);this._titleMouseMenu=menu;this._commandWindow.visible=false;
    };
    const titleTerminateMouseMenu=Scene_Title.prototype.terminate;
    Scene_Title.prototype.terminate=function(){this._titleMouseMenu?.remove();this._titleMenuEffects?.remove();titleTerminateMouseMenu.call(this);};
    Scene_Title.prototype.commandContinue = async function() {
        const id = MANAGER_SAVE_ID;
        try {
            await DataManager.loadGame(id);
            const managerSave = restoreManagerSave();
            $gameSystem.onAfterLoad();
            SoundManager.playLoad();
            this._commandWindow.close();
            this.fadeOutAll();
            SceneManager.goto(managerSave ? Scene_RPGHome : Scene_Map);
        } catch (error) {
            SoundManager.playBuzzer();
            this._commandWindow.activate();
            if (!this._loadError) {
                this._loadError = new Window_Help(new Rectangle(12, 12, Graphics.boxWidth - 24, 100));
                this.addWindow(this._loadError);
            }
            this._loadError.setText("Could not continue the campaign save.\nStart a New Game to create a replacement.");
        }
    };

    class Window_RPGLoadActions extends Window_Command {
        makeCommandList() {
            this.addCommand("Load", "load");
            this.addCommand("Delete", "delete");
        }
    }
    class Window_RPGDeleteConfirm extends Window_Command {
        makeCommandList() {
            this.addCommand("No", "no");
            this.addCommand("Yes", "yes");
        }
    }
    const createLoadScene = Scene_Load.prototype.create;
    Scene_Load.prototype.create = function() {
        createLoadScene.call(this);
        this._actionsWindow = new Window_RPGLoadActions(new Rectangle((Graphics.boxWidth - 320) / 2, 250, 320, 116));
        this._actionsWindow.setHandler("load", () => {
            this._actionsWindow.deactivate();
            this._actionsWindow?.hide();
            this.executeLoad(this._selectedFileId);
        });
        this._actionsWindow.setHandler("delete", this.requestDelete.bind(this));
        this._actionsWindow.setHandler("cancel", this.closeFileActions.bind(this));
        this._actionsWindow?.hide();
        this._actionsWindow.deactivate();
        this.addWindow(this._actionsWindow);
        this._deleteConfirm = new Window_RPGDeleteConfirm(new Rectangle((Graphics.boxWidth - 320) / 2, 250, 320, 116));
        this._deleteConfirm.setHandler("no", this.cancelDelete.bind(this));
        this._deleteConfirm.setHandler("cancel", this.cancelDelete.bind(this));
        this._deleteConfirm.setHandler("yes", this.deleteSelectedFile.bind(this));
        this._deleteConfirm?.hide();
        this._deleteConfirm.deactivate();
        this.addWindow(this._deleteConfirm);
        if (this._cancelButton) this._cancelButton.setClickHandler(this.backFromLoad.bind(this));
    };
    Scene_Load.prototype.onSavefileOk = function() {
        const id = this.savefileId();
        if (!DataManager.savefileInfo(id)) { this._listWindow.activate(); return; }
        this._selectedFileId = id;
        this._listWindow.deactivate();
        this._helpWindow.setText(`File ${id}: Load or Delete?`);
        this._actionsWindow.show();
        this._actionsWindow.select(0);
        this._actionsWindow.activate();
    };
    Scene_Load.prototype.backFromLoad = function() {
        if (this._deleteBusy) return;
        if (this._deleteConfirm.visible) this.cancelDelete();
        else if (this._actionsWindow.visible) this.closeFileActions();
        else this.popScene();
    };
    Scene_Load.prototype.closeFileActions = function() {
        this._actionsWindow?.hide();
        this._actionsWindow.deactivate();
        this._listWindow.activate();
        this._helpWindow.setText(this.helpWindowText());
    };
    Scene_Load.prototype.requestDelete = function() {
        const id = this._selectedFileId;
        if (!DataManager.savefileInfo(id) || this._deleteBusy) return;
        this._deleteId = id;
        this._actionsWindow?.hide();
        this._actionsWindow.deactivate();
        this._helpWindow.setText(`Delete File ${id}: are you sure?`);
        this._deleteConfirm.show();
        this._deleteConfirm.select(0);
        this._deleteConfirm.activate();
    };
    Scene_Load.prototype.cancelDelete = function() {
        this._deleteId = null;
        this._deleteConfirm?.hide();
        this._deleteConfirm.deactivate();
        this._actionsWindow.show();
        this._actionsWindow.selectSymbol("delete");
        this._actionsWindow.activate();
        this._helpWindow.setText(`File ${this._selectedFileId}: Load or Delete?`);
    };
    Scene_Load.prototype.deleteSelectedFile = async function() {
        const id = this._deleteId;
        if (this._deleteBusy || !Number.isInteger(id) || id < 0 || id >= DataManager.maxSavefiles()) return;
        this._deleteBusy = true;
        this._deleteConfirm.deactivate();
        try {
            await StorageManager.remove(DataManager.makeSavename(id));
            delete DataManager._globalInfo[id];
            await StorageManager.saveObject("global", DataManager._globalInfo);
            this._deleteConfirm?.hide();
            this._deleteId = null;
            this.closeFileActions();
            this._listWindow.refresh();
            this._helpWindow.setText(`File ${id} deleted. Select another file or go back.`);
        } catch (error) {
            this._deleteConfirm?.hide();
            this._deleteId = null;
            this.closeFileActions();
            this._listWindow.refresh();
            SoundManager.playBuzzer();
            this._helpWindow.setText("Could not finish deletion. Check storage and try again.");
        } finally {
            this._deleteBusy = false;
        }
    };

    // Last-resort recovery for unexpected runtime errors during manager play.
    // Validation paths should stay in-scene, but an unforeseen exception must
    // never leave the player with reset as the only escape route.
    const printManagerError = Graphics.printError;
    Graphics.printError = function(name, message, error = null) {
        printManagerError.call(this, name, message, error);
        if (!globalThis.$gameSystem?._rpgManager || document.getElementById("rpgManagerBackButton")) return;
        const button=document.createElement("button");button.id="rpgManagerBackButton";button.textContent="Back to Home";
        button.style.cssText="display:block;margin:22px auto 0;padding:10px 18px;font-size:20px;color:white;background:#315d78;border:2px solid white;border-radius:5px";
        button.ontouchstart=e=>e.stopPropagation();button.onclick=()=>{try{Graphics.eraseError();Input.clear();TouchInput.clear();SceneManager.clearStack();SceneManager.resume();requestAnimationFrame(()=>SceneManager.goto(Scene_RPGHome));}catch(recoveryError){console.error(recoveryError);SceneManager.reloadGame();}};
        this._errorPrinter.appendChild(button);
    };

    // New Game alone opens starting selection; existing loads keep their established party.
    Scene_Title.prototype.startConfirmedNewGame = function() {
        if(this._newGameTransitioning)return;
        this._newGameTransitioning=true;
        closeManagerDialog();
        this._titleMouseMenu?.querySelectorAll("button").forEach(button=>button.disabled=true);
        DataManager.setupNewGame();
        const result=progression.beginStartingRoster(managerState(),$dataRPGManagerRoster);
        if(!result.ok){this._newGameTransitioning=false;throw new Error(result.message||"Could not prepare the starting roster.");}
        this._commandWindow?.close();
        this._commandWindow?.deactivate();
        this.fadeOutAll();
        SceneManager.goto(Scene_RPGStartingRoster);
    };
    Scene_Title.prototype.commandNewGame = function() {
        if(this._newGameTransitioning||managerDialog)return;
        const hasCampaign=!!DataManager.savefileInfo(MANAGER_SAVE_ID)&&DataManager.savefileExists(MANAGER_SAVE_ID);
        if(!hasCampaign){this.startConfirmedNewGame();return;}
        this._commandWindow?.deactivate();
        const cancel=()=>{closeManagerDialog();this._commandWindow?.activate();};
        const modal=managerModal("Replace existing campaign?",["Starting a New Game permanently deletes the current campaign save.","This cannot be undone. Continue only if you want to begin again."],[{name:"Delete Save and Start New Game",run:async()=>{modal.buttons.forEach(button=>button.disabled=true);modal.error.textContent="Deleting the old campaign…";try{await StorageManager.remove(DataManager.makeSavename(MANAGER_SAVE_ID));delete DataManager._globalInfo[MANAGER_SAVE_ID];await StorageManager.saveObject("global",DataManager._globalInfo);closeManagerDialog();this.startConfirmedNewGame();}catch(error){modal.error.textContent=`Could not delete the old campaign: ${error.message||error}`;modal.buttons.forEach(button=>button.disabled=false);modal.buttons[1].focus();}}},{name:"Cancel",run:cancel}],cancel);
        modal.buttons[1]?.focus();
    };
    window.RPGManager.uiComponents = Object.freeze({ Window_RPGLargePortrait, Window_RPGDialogue });
})();
