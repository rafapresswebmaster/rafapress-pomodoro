/*:
 * @target MZ
 * @plugindesc Camp-first manager with one background real-time expedition.
 * @author RPG Manager
 * @help RPGManager.js
 * Enable RPGManagerBattle and RPGManagerProgression above this plugin.
 * Camp-first Home with one autonomous background expedition and four open-session camp jobs.
 * Quest Board filters authoritative minutes and one to eight skull party-level estimates.
 * Compact battlefield replays copied combat events; it never rolls or applies damage.
 * Five roster slots, one to three companions per quest, free Tavern recruitment.
 * Prominent live MM:SS, optional once-only completion chime, stable Quest Results.
 * Workshop, Study and Rest use existing sprites with small code-drawn props.
 * Schema 23 saves retain history, compatibility fields and partial open-session progress.
 */

(() => {
    "use strict";

    // Global RPG Manager mix: retain the player's SE setting, then attenuate all SFX by 50%.
    const updateSeParameters = AudioManager.updateSeParameters;
    AudioManager.updateSeParameters = function(buffer, se) {
        updateSeParameters.call(this, buffer, { ...se, volume: (Number(se?.volume) || 0) * 0.5 });
    };

    const progression = window.RPGManagerProgression;
    if (!progression) throw new Error("Enable RPGManagerProgression above RPGManager in Plugin Manager.");
    // Optional presentation art stays outside MZ's fatal database-image cache.
    const managerArtCache=new Map();
    function managerArt(folder,name){
        const key=`${folder}/${String(name||"missing")}`;
        if(!managerArtCache.has(key))managerArtCache.set(key,Bitmap.load(`img/${folder}/${encodeURIComponent(name||"missing")}.webp`));
        return managerArtCache.get(key);
    }
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
        icon(b, kind, x, y, size=18, color="#e8c583") {
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
    let cozyWindowskin = null;
    function managerVisualWindow(win) {
        return /^Window_RPG/.test(win.constructor.name) || win.constructor.name==="Window_TitleCommand" || win.constructor.name==="Window_Options" || !!(typeof Scene_File!=="undefined" && SceneManager._scene instanceof Scene_File);
    }
    function cozySkin() {
        if(cozyWindowskin)return cozyWindowskin;
        cozyWindowskin=new Bitmap(192,192);
        const stock=ImageManager.loadSystem("Window");
        const paint=()=>{const b=cozyWindowskin;if(stock.isReady())b.blt(stock,0,0,192,192,0,0);b.clearRect(0,0,96,192);b.gradientFillRect(0,0,96,96,"#283658","#202a47",true);
            b.clearRect(96,0,96,96);CozyUI.round(b,97,1,94,94,"#243969","#b39b6c",10);CozyUI.round(b,101,5,86,86,null,"#5f5d46",7);
            b.clearRect(96,96,48,48);CozyUI.round(b,96.5,96.5,47,47,"#b79c5a40","#f1cf89",5);
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
        const r=this.itemRect(index);CozyUI.round(this.contentsBack,r.x+2,r.y+2,r.width-4,r.height-4,"#34477399","#b59c6355",4);
    };

    const cozyTitleBackground=Scene_Title.prototype.createBackground;
    Scene_Title.prototype.createBackground=function(){
        cozyTitleBackground.call(this);this._cozyTitleScenery=new Sprite(new Bitmap(Graphics.width,Graphics.height));this.addChild(this._cozyTitleScenery);this.paintCozyTitleScenery();
    };
    Scene_Title.prototype.paintCozyTitleScenery=function(){
        const b=this._cozyTitleScenery.bitmap;CozyUI.scenery(b);this._cozyTitleArtReady=cozyCampArt.isReady();
        if(this._cozyTitleArtReady){const scale=Math.max(b.width/cozyCampArt.width,b.height/cozyCampArt.height),sw=b.width/scale,sh=b.height/scale;b.blt(cozyCampArt,(cozyCampArt.width-sw)/2,0,sw,sh,0,0,b.width,b.height);}
        b.fillRect(0,0,b.width,b.height,"#20352566");CozyUI.round(b,b.width*.12,72,b.width*.76,148,"#243969ed","#c1a16a",12);
    };
    Scene_Title.prototype.drawGameTitle=function(){
        const b=this._gameTitleSprite.bitmap;b.fontFace=`Georgia, ${$gameSystem.mainFontFace()}`;b.fontSize=46;b.outlineWidth=2;b.outlineColor="#263a28";b.textColor="#f4deb0";
        b.drawText($dataSystem.gameTitle,24,110,b.width-48,56,"center");b.fontFace=`Trebuchet MS, ${$gameSystem.mainFontFace()}`;b.fontSize=17;b.textColor="#ddcfaa";b.drawText("A little haven for great adventures",24,178,b.width-48,24,"center");
    };
    const cozyTitleUpdate=Scene_Title.prototype.update;
    Scene_Title.prototype.update=function(){cozyTitleUpdate.call(this);if(!this._cozyTitleArtReady&&cozyCampArt.isReady())this.paintCozyTitleScenery();};
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
    function loadOptionalManagerData(name,file){const xhr=new XMLHttpRequest();xhr.open("GET",`data/${file}`);xhr.overrideMimeType("application/json");xhr.onload=()=>{try{window[name]=xhr.status<400?JSON.parse(xhr.responseText):{};}catch(error){window[name]={};}};xhr.onerror=()=>window[name]={};xhr.send();}
    window.$dataRPGManagerStage3 = null;window.$dataRPGManagerIdentity=null;window.$dataRPGManagerNarratives=null;
    window.$dataRPGManagerPresentation = null;
    window.$dataRPGManagerUI = null;
    const loadDatabase = DataManager.loadDatabase;
    DataManager.loadDatabase = function() {
        loadDatabase.call(this);
        this.loadDataFile("$dataRPGManagerRoster", "RPGManagerRoster.json");
        this.loadDataFile("$dataRPGManagerEnemyTeam", "RPGManagerEnemyTeam.json");
        this.loadDataFile("$dataRPGManagerDialogue", "RPGManagerDialogue.json");
        this.loadDataFile("$dataRPGManagerClasses", "RPGManagerClasses.json");
        this.loadDataFile("$dataRPGManagerQuests", "RPGManagerQuests.json");
        this.loadDataFile("$dataRPGManagerStage3", "RPGManagerStage3.json");this.loadDataFile("$dataRPGManagerIdentity","RPGManagerIdentity.json");loadOptionalManagerData("$dataRPGManagerNarratives","RPGManagerNarratives.json");
        this.loadDataFile("$dataRPGManagerPresentation", "RPGManagerPresentation.json");
        this.loadDataFile("$dataRPGManagerUI", "RPGManagerUI.json");
    };
    const isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function() {
        return isDatabaseLoaded.call(this) && !!window.$dataRPGManagerRoster && !!window.$dataRPGManagerEnemyTeam && !!window.$dataRPGManagerDialogue && !!window.$dataRPGManagerClasses && !!window.$dataRPGManagerQuests && !!window.$dataRPGManagerStage3 && !!window.$dataRPGManagerPresentation && !!window.$dataRPGManagerUI&&!!window.$dataRPGManagerIdentity&&!!window.$dataRPGManagerNarratives;
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
    window.RPGManager = { roster, teamIds, quests, selectedQuest, questEnemies, validateQuestData, isLiving, validateTeam, toggleTeamMember, confirmTeam, createBattle, createTripBattle, restoreSave: restoreManagerSave, lastBattle: null,
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
        const visible=!!state&&(scene instanceof Scene_RPGBase||scene instanceof Scene_Save)&&!(scene instanceof Scene_RPGStartingRoster);
        if(scene instanceof Scene_Save&&scene._cancelButton){scene._cancelButton.x=Math.max(0,Graphics.boxWidth-280-scene._cancelButton.width);scene._cancelButton.y=4;}
        const preview=scene instanceof Scene_RPGQuestBoard?findQuest(scene._choices?.currentExt())||selectedQuest():state?selectedQuest():{};
        let view=focusDisplay.clockView(state||{},preview);
        if(!state?.trips?.A){const t=state?.campTimer;view={...view,sessionId:`camp:${t?.id||0}`,active:!!t?.active,remainingMs:t?.remainingMs||0,totalMs:t?.totalMs||0,digital:focusDisplay.formatTime(t?.remainingMs||0),fraction:t?.totalMs?(t.remainingMs/t.totalMs):0,phase:t?.active?"camp_active":"camp_ready",label:t?.active?"Camp timer":"Click to set timer"};}
        const key=JSON.stringify([visible,scene?.constructor.name,state?.focusTimer?.enabled,view.sessionId,view.digital,view.phase,view.totalMs,Graphics.width,Graphics.height,innerWidth,innerHeight]);
        if(!force&&focusHudKey===key)return;focusHudKey=key;
        floatingTimer.refresh(state,view,visible);
        if(!focusHud){
            focusHud=document.createElement("section");focusHud.id="rpg-focus-timer";focusHud.setAttribute("role","timer");focusHud.setAttribute("aria-label","Focus session timer");
            focusHud.innerHTML=focusDisplay.dialMarkup+'<div><strong class="focus-time"></strong><span class="focus-state"></span></div><button class="focus-recall" type="button">Recall</button><button class="focus-options" type="button" aria-label="Timer options" aria-expanded="false">⋯</button><div class="focus-menu" hidden><button class="focus-float" type="button"></button><button class="focus-end" type="button">Recall…</button><small class="focus-note"></small></div>';
            const style=document.createElement('style');style.textContent='#rpg-focus-timer{position:fixed;z-index:30;width:256px;height:88px;display:flex;align-items:center;background:#243969;color:#fff0c8;border:2px solid #e8c583;border-radius:16px;font:16px "Trebuchet MS",sans-serif;box-sizing:border-box;transform-origin:top left}#rpg-focus-timer .focus-recall{position:absolute;right:8px;bottom:10px;background:#e8c583;color:#302248;border:1px solid #fff0ce;border-radius:5px;padding:5px 8px;font:bold 13px Trebuchet MS;cursor:pointer}#rpg-focus-timer svg{width:80px;height:80px;flex:none}#rpg-focus-timer .focus-time{display:block;font:bold 40px monospace;line-height:46px}#rpg-focus-timer .focus-state{display:block;font-size:15px}#rpg-focus-timer .focus-options{position:absolute;right:4px;top:0;font:bold 25px sans-serif;background:transparent;color:#ffe29b;border:0;cursor:pointer}#rpg-focus-timer .focus-menu{position:absolute;right:0;top:92px;width:280px;padding:10px;border:2px solid #e8c583;border-radius:10px;background:#243969;box-shadow:0 4px 14px #0008}#rpg-focus-timer .focus-menu button{display:block;width:100%;font:17px sans-serif;padding:9px;margin:4px 0;cursor:pointer}#rpg-focus-timer .focus-note{display:block;padding:5px;line-height:18px}#rpg-focus-timer [hidden]{display:none}';document.head.appendChild(style);document.body.appendChild(focusHud);
            const menu=focusHud.querySelector('.focus-menu'),options=focusHud.querySelector('.focus-options');options.onclick=()=>{menu.hidden=!menu.hidden;options.setAttribute('aria-expanded',String(!menu.hidden));};
            focusHud.querySelector('.focus-float').onclick=()=>{const state=managerState();state.focusTimer.enabled=!state.focusTimer.enabled;floatingTimer.failedState=null;menu.hidden=true;options.setAttribute('aria-expanded','false');refreshFocusTimer(true);};
            focusHud.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();menu.hidden=true;options.setAttribute('aria-expanded','false');}});
            focusHud.addEventListener('keyup',event=>event.stopPropagation());
            for(const event of ['mousedown','mouseup','touchstart','touchmove','touchend','wheel'])focusHud.addEventListener(event,e=>e.stopPropagation());
            document.addEventListener('pointerdown',event=>{if(!focusHud.contains(event.target)){menu.hidden=true;options.setAttribute('aria-expanded','false');}});
            focusHud.querySelector('.focus-recall').onclick=focusHud.querySelector('.focus-end').onclick=()=>{document.activeElement?.blur();Input.clear();TouchInput.clear();menu.hidden=true;syncMissionClock();if(!managerState().trips?.A){showCampTimerDialog();return;}const trip=progression.tripForTeam(managerState(),'A');if(trip?.recalled){progression.requestRecall(managerState());SceneManager.goto(Scene_RPGHome);return;}if(trip&&!SceneManager.isSceneChanging()){SceneManager.push(Scene_RPGRecall);SceneManager.prepareNextScene(trip.id);}};
        }
        focusHud.style.display=visible?'flex':'none';if(!visible){focusHud.querySelector('.focus-menu').hidden=true;return;}
        const canvas=Graphics._canvas||Graphics.app?.view,rect=canvas?.getBoundingClientRect(),scale=rect?rect.width/Graphics.width:1;
        focusHud.style.left=((rect?.left||0)+(Graphics.boxWidth-268)*scale)+'px';focusHud.style.top=((rect?.top||0)+8*scale)+'px';focusHud.style.transform=`scale(${scale})`;
        const dial=focusHud.querySelector("svg");dial.setAttribute("aria-hidden",state?.trips?.A?"true":"false");dial.style.cursor=state?.trips?.A?"default":"pointer";dial.setAttribute("role","button");dial.setAttribute("aria-label","Set camp timer");dial.setAttribute("tabindex",state?.trips?.A?"-1":"0");dial.onclick=()=>{if(!managerState().trips?.A)showCampTimerDialog();};dial.onkeydown=e=>{if(["Enter"," "].includes(e.key)&&!managerState().trips?.A){e.preventDefault();showCampTimerDialog();}};
        focusHud.querySelector(".focus-time").onclick=()=>{if(!managerState().trips?.A)showCampTimerDialog();};
        focusHud.querySelector(".focus-recall").textContent=state?.trips?.A?(state.trips.A.recalled?"Arrive now":"Recall"):"Set";
        focusDisplay.renderReadout(focusHud,view);focusHud.querySelector('.focus-end').disabled=!view.active;focusHud.querySelector('.focus-recall').disabled=scene instanceof Scene_RPGRecall;
        focusHud.querySelector('.focus-float').textContent=state.focusTimer?.enabled?'Hide compact timer':globalThis.nw?.Window?'Show floating timer':'Show compact timer (browser)';
        focusHud.querySelector('.focus-note').textContent=floatingTimer.lastError?'Floating view unavailable. Your session and in-game timer continue.':globalThis.nw?.Window?'Read-only desktop timer. Drag to move; × hides it.':'Browser compact view stays inside this page; desktop floating requires NW.js.';
    }
    window.RPGManager.focus={view:()=>focusDisplay.clockView(managerState(),selectedQuest()),refresh:()=>refreshFocusTimer(true),floating:floatingTimer};
    window.addEventListener('resize',()=>{refreshFocusTimer(true);floatingTimer.reposition();});
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
            const event=eventAudioQueue.shift(),sounds={wounded:["Damage1",30,90],death:["Collapse1",35,80],battleStart:["Book1",24,90],battleEnd:["Bell2",22,110],battleVictory:["Bell3",26,110,550],randomEvent:["Item1",22,100]};
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
        if(this._campStatus){const state=managerState(),key=`${state.gold}:${state.arcana}:${state.completionAlerts}`;if(this._campStatusKey!==key){this._campStatusKey=key;this._campStatus.querySelector('[data-resource="gold"]').textContent=`◉ ${state.gold} Gold`;this._campStatus.querySelector('[data-resource="arcana"]').textContent=`◇ ${state.arcana||0} Arcana`;this._campStatus.querySelector('button').textContent=`Alerts ${state.completionAlerts!==false?"ON":"OFF"}`;}}
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
            const text=(value,x,y,width,size=18,color="#f4e8cf",height=22)=>CozyUI.text(this,String(value),x,y,width,size,color,"left",height);
            // Details are paged by input, never by a timer. All finds and scars remain readable.
            const detailLines=[];
            const add=value=>{b.fontSize=18;let line="";for(const word of String(value).split(/\s+/)){if(line&&this.textWidth(line+" "+word)>w-24){detailLines.push(line);line="";}line+=(line?" ":"")+word;}if(line)detailLines.push(line);};
            add(result.plannedDurationMs?`${result.plannedDurationMs/60000}-minute session / ${progression.dangerLabel(result)}`:"Previous expedition / duration not recorded");
            if(result.plannedDurationMs)add(`${focusDisplay.formatTime(result.sessionElapsedMs||0)} elapsed of ${focusDisplay.formatTime(result.plannedDurationMs)} planned.`);
            add(result.endKind==="early"?"Ended early. Previous finds kept; no completion rewards or XP.":result.autoRetreat?"Automatic return. Previous consequences and finds kept.":result.objectiveState||"Expedition journal complete.");
            if(result.retreatReason)add(result.retreatReason);
            if(result.armorRestored)add("Returning companions: Armor fully restored; wards replenished.");
            add(`${result.battleCount||0} battles, including ${result.skirmishCount||0} trail skirmishes.`);
            add("Items obtained");
            if(!result.items?.length)add("No items obtained.");
            for(const item of result.items||[]){add(`${item.name} x${item.quantity}`);if(item.itemId)add(progression.itemSummary(item.itemId));}
            add(`XP per companion: ${result.xpPerMember||0}`);
            for(const note of result.fieldNotes||[])add(note);
            add("Level-ups");
            const levelled=(result.members||[]).filter(n=>n.levelledUp);
            if(!levelled.length)add("No level-ups this session.");
            for(const member of levelled)add(`${member.name}: Level ${member.level}`);
            add(`Enemy XP pool: ${result.enemyXpEarned||0} (shared by participants)`);add("Broken equipment");for(const loss of result.gearLosses||[])add(loss.text||progression.SHOP[loss.itemId]?.name||loss.itemId);if(!result.gearLosses?.length)add("None.");add("Persistent consequences");
            for(const member of result.members||[]){
                add(`${member.name}: HP ${member.health}/${member.maxHealth}, Armor ${member.armor}, Ward ${member.ward}. ${member.condition}.`);
                add(member.permanentWounds?.length?member.permanentWounds.join(", "):"No permanent injuries.");
            }
            const perPage=Math.max(1,Math.floor((h-169)/24));
            this._resultPages=1+Math.ceil(detailLines.length/perPage);
            this._resultPage=Math.min(this._resultPage||0,this._resultPages-1);
            this._displayRemainingMs=0;this._displayCountdown="00:00";this._displaySessionState=result.endKind==="early"?"Ended":result.autoRetreat?"Returned":"Complete";
            text(result.questName,8,6,w-16,w<400?20:26,"#ffe3a4",34);text(result.endKind==="early"?"Session ended":`${this._displaySessionState} / ${result.outcome||"Returned"}`,8,45,w-16,18,"#b8d59c",26);
            CozyUI.round(b,6,85,w-120,27,"#e9d9b4","#b39b6c",4);
            text(result.endKind==="early"?"Session ended":result.autoRetreat?"Automatic return":"Expedition journal",13,86,w-132,17,"#423e30",26);
            this._resultPageRegion=new Rectangle(w-106,86,98,24);
            CozyUI.round(b,w-106,86,98,24,"#354c80","#a6c797",4);
            text(`${this._resultPage?"Page":"Details"} ${this._resultPage+1}/${this._resultPages} >`,w-100,89,86,11);
            if(!this._resultPage){
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
                text(`Earned: +${result.rewardGold} Gold / +${result.rewardArcana} Arcana`,8,y+2,w-16,16,"#e8c583",18);
                text(`${result.enemiesDefeated||0} enemies defeated / ${(result.members||[]).filter(n=>n.condition==="Dead").length} deaths / ${(result.members||[]).filter(n=>n.condition==="Wounded").length} wounded`,8,y+23,w-16,15,"#c6b99d",18);

                text(`${result.xpPerMember||0} completion + ${result.enemyXpEarned||0} enemy XP / Broken: ${(result.gearLosses||[]).map(n=>progression.SHOP[n.itemId]?.name||n.itemId).join(", ")||"None"}`,8,y+44,w-16,14,"#c6b99d",18);
            }else detailLines.slice((this._resultPage-1)*perPage,this._resultPage*perPage).forEach((line,i)=>{
                const id=Object.keys(progression.SHOP).find(id=>line.startsWith(progression.SHOP[id].name));
                if(id)CozyUI.itemIcon(this,id,12,116+i*24,16);
                text(line,id?34:12,116+i*24,w-(id?46:24),18,"#e4dbc2",16);
            });
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
            const point = points[c.seed % points.length]; c.tx = Math.max(24,Math.min(this.innerWidth-75,point[0])); c.ty = Math.max(60,Math.min(this.innerHeight-108,point[1]));
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
                if(distance<1.5){c.x=c.tx;c.y=c.ty;c.seed=(c.seed+97)>>>0;c.pause=c.job==="idle"?35+(c.seed%100):Infinity;c.direction=2;continue;}
                const speed=.32;c.x+=dx/distance*speed;c.y+=dy/distance*speed;
            }
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
                const npc=c.npc,moving=c.pause===0&&Math.hypot(c.tx-c.x,c.ty-c.y)>1.5,motion=window.RPGManagerBattleStage.pieceMotion(c.pieceTime||0,66,{moving,direction:c.direction===4?-1:1});
                v.root.x=c.x;v.root.y=c.y;const figure=this.campFigure(npc,c.direction);if(v.figure.bitmap!==figure)v.figure.bitmap=figure;v.figure.visible=!!figure;
                v.figure.x=22+motion.x;v.figure.y=66+motion.y;v.figure.rotation=motion.angle;
                const job=progression.campJobFor(this._state,npc.id)||"idle",labelKey=`${npc.name}:${job}`;
                if(v.labelKey!==labelKey){v.labelKey=labelKey;const b=v.labelBitmap;b.clear();b.fontFace=this.contents.fontFace;CozyUI.round(b,0,0,80,25,"#202d50eb",null,4);b.textColor="#fff0d0";b.fontSize=11;b.drawText(npc.name.split(" ")[0],3,0,74,13,"center");b.textColor="#d9c58e";b.fontSize=9;b.drawText(job==="work"?"WORKSHOP":job.toUpperCase(),3,13,74,12,"center");}
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
        update() { super.update(); if (!this._state||!this.visible) return;this.updateCampers();if(this._campSceneryKey!==`${this.innerWidth}:${this.innerHeight}:${cozyCampArt.isReady()}`)this.refresh();else this.updateCampVisuals();if(this._selectHandler&&TouchInput.isTriggered()){const p=this.worldTransform.applyInverse(new Point(TouchInput.x,TouchInput.y)),hit=this._hitRegions.find(entry=>entry.rect.contains(p.x-this.padding,p.y-this.padding));if(hit){SoundManager.playOk();this._selectHandler(hit.id);}} }
    }

    class Window_RPGCampRoster extends Window_RPGPanel {
        contentsHeight(){return Math.max(this.innerHeight,36+78*progression.MAX_ROSTER_SIZE+70);}
        setSelectHandler(handler){this._selectHandler=handler;}
        setState(state){this._state=state;this.refresh();}
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
        destroy(options){this._rosterScrollElement?.remove();super.destroy(options);}
        refresh(){
            if(!this._state)return;const s=this._state,w=this.innerWidth;this.contents.clear();this._hitRegions=[];
            CozyUI.text(this,`YOUR COMPANIONS / ${progression.activeRoster(s).length} OF 5`,8,4,w-16,15,"#e8c583","left",24);
            const slots=progression.activeSlotIds(s),row=78;
            slots.forEach((id,i)=>{
                const npc=s.roster.find(n=>n.id===id),y=36+i*row;
                CozyUI.round(this.contents,6,y,w-12,row-5,this._focusIndex===i?"#46547b":"#2b375a",this._focusIndex===i?"#ffe3a4":npc?.injury?"#e9afa1":"#c6ae65",5);
                if(npc){
                    const condition=progression.conditionOf(npc),away=progression.isUnavailable(s,id);
                    CozyUI.portraitFrame(this,npc,13,y+10,32);
                    CozyUI.text(this,`${i+1}. ${progression.displayName(npc)}`,54,y+4,w-66,14,"#f4e8cf","left",19);
                    CozyUI.text(this,`HP ${npc.health}/${npc.maxHealth}  /  ${npc.lastingInjuries?`! WOUNDED x${npc.lastingInjuries}`:condition==="Wounded"?"! WOUNDED":condition.toUpperCase()}`,54,y+24,w-66,13,npc.injury?"#ffc8ae":"#c8dfbc","left",18);
                    CozyUI.text(this,away?"AWAY / On expedition":`${progression.identityLabel(npc)} / ${progression.campJobFor(s,id)||"Idle"}`,54,y+44,w-66,11,"#c6b99d","left",16);
                    this._hitRegions.push({id,rect:new Rectangle(6,y,w-12,row-5)});
                }else{
                    CozyUI.icon(this.contents,"recruit",14,y+12,26);
                    CozyUI.text(this,`Slot ${i+1}: EMPTY`,50,y+8,w-62,14,"#e8c583","left",20);
                    CozyUI.text(this,"Tavern: free replacement",50,y+31,w-62,12,"#c6b99d","left",18);
                }
            });
            const y=36+row*progression.MAX_ROSTER_SIZE;
            const fallen=progression.graveyard(s);
            CozyUI.text(this,fallen.length?`Graveyard: ${fallen.length} DEAD / archived`:"No fallen companions",8,y+3,w-16,12,fallen.length?"#ffc8ae":"#c6b99d","left",18);
            const candidates=progression.replacementCandidates(s);
            CozyUI.text(this,`Tavern: ${candidates.length} available candidates`,8,y+24,w-16,12,"#e8c583","left",18);
            this._hitRegions.push({menu:"recruit",rect:new Rectangle(6,y+22,w-12,20)});
            this.syncRosterScroll();
        }
        update(){super.update();if(this._state&&Graphics.frameCount%30===0)this.refresh();
            if(this._rosterScrollElement)this._rosterScrollElement.hidden=!this.visible||!this.isOpen()||this.contents.height<=this.innerHeight||!!managerDialog;
            if(this.visible&&this._state){const p=this.worldTransform.applyInverse(new Point(TouchInput.x,TouchInput.y));if(this.innerRect.contains(p.x,p.y)&&Math.abs(TouchInput.wheelY)>=20){this._rosterScroll=Math.max(0,Math.min((this._rosterScroll||0)+Math.sign(TouchInput.wheelY)*78,this.contents.height-this.innerHeight));this.syncRosterScroll();}}
            if(this.visible&&this._selectHandler&&TouchInput.isTriggered()){
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
            const xpMax=progression.xpRequired(npc);CozyUI.text(this,xpMax?`XP ${npc.xp}/${xpMax}`:"LEVEL 8 / MAX",115,56,w-123,13,"#b8cea5","left",18);this.contents.fillRect(115,78,w-130,3,"#5e6047");this.contents.fillRect(115,78,(w-130)*Math.min(1,npc.xp/Math.max(1,xpMax)),3,"#a6c797");
            CozyUI.text(this,npc.alive?(npc.injury||"Healthy / ready for adventure"):npc.reanimationExhausted?"FALLEN / permanently barred from reanimation":"FALLEN / remembered at the guild",115,85,w-123,12,npc.alive?"#b8cea5":"#e9afa1","left",17);
            this.rule(108);
            const leadership=["","Unproven","Steady","Capable","Strong","Exceptional"][npc.leadership]||"Unproven",traits=(npc.personalityTraits||[]).map(id=>progression.traitFor(id)?.name).filter(Boolean),descriptions=(npc.personalityTraits||[]).map(id=>progression.traitFor(id)?.description).filter(Boolean),baseDodge=Math.round(npc.dodgeChance*100);
            CozyUI.text(this,`Signature: ${progression.moveFor(npc)?.name||npc.signatureAttack} / ${npc.passiveTrait.name}`,8,116,w-16,14,"#c5ade4");
            CozyUI.text(this,`HP ${npc.health}/${npc.maxHealth} / Class Armor ${npc.classArmor}/${npc.classArmorMax} / Ward ${npc.innateWardMax}`,8,142,w-16,16,"#c6d5bc");
            CozyUI.text(this,`Crit ${Math.round(npc.critChance*100)}% (double damage) / Dodge ${baseDodge}%`,8,167,w-16,16,"#e8c583");
            CozyUI.text(this,`Gear: ${progression.EQUIPMENT_SLOTS.map(slot=>progression.SHOP[npc.equipmentSlots?.[slot]]?.name||"Empty").join(" / ")}`,8,232,w-16,12,"#d8ccb2");
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
            this.addCommand("Camp Jobs", "campJobs", true, {icon:82,name:"Camp Jobs"});
            
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
            if(!this._selecting&&progression.vacantSlots(managerState()).length)this.addCommand("Tavern / free replacements","tavern");
            this.addCommand(this._selecting ? "Cancel Changes" : "Back to Home", "back");paginateCommands(this);
        }

        drawItem(index){
            const r=this.itemRect(index),entry=this._list[index],npc=entry.symbol==="npc"?findNpc(entry.ext):null;this.changePaintOpacity(this.isCommandEnabled(index));
            if(npc){CozyUI.portraitFrame(this,npc,r.x+7,r.y+6,27);CozyUI.text(this,entry.name,r.x+44,r.y+1,r.width-50,16,"#f4e8cf","left",21);CozyUI.text(this,`Level ${npc.level} / ${progression.identityLabel(npc)}`,r.x+44,r.y+23,r.width-50,11,"#bfb99b","left",15);}
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
    function closeManagerDialog(){if(managerDialog){managerDialog.element.remove();managerDialog=null;Input.clear();TouchInput.clear();}}
    function managerModal(title,lines,actions,cancel){
        if(managerDialog)return managerDialog;
        const el=document.createElement("section");el.id="manager-confirmation";el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label",title);
        el.style.cssText="position:fixed;z-index:100;top:50%;left:50%;transform:translate(-50%,-50%);width:min(660px,86vw);max-height:calc(100vh - 24px);overflow:hidden;box-sizing:border-box;background:#f3e5c7;color:#2b2647;padding:16px;border:4px solid #bd9655;border-radius:16px;box-shadow:0 0 0 100vmax #130c26b8;font:16px Trebuchet MS,sans-serif";
        const heading=document.createElement("h2");heading.textContent=title;heading.style.marginTop="0";el.appendChild(heading);
        for(const line of lines){const p=document.createElement("p");p.textContent=line;p.style.margin="8px 0";el.appendChild(p);}
        const error=document.createElement("p");error.setAttribute("role","alert");error.style.color="#9b2637";el.appendChild(error);
        const buttons=actions.map(action=>{const b=document.createElement("button");b.textContent=action.name;b.style.cssText="font:inherit;font-weight:bold;padding:12px;margin:5px;border:2px solid #8b7047;border-radius:6px;background:#263b67;color:#fff0cb;cursor:pointer";b.onclick=action.run;el.appendChild(b);return b;});
        for(const name of ["mousedown","mouseup","touchstart","touchend","wheel","keydown","keyup"])el.addEventListener(name,e=>e.stopPropagation());
        el.addEventListener("keydown",e=>{if(e.key==="Tab"){e.preventDefault();const enabled=buttons.filter(b=>!b.disabled),index=enabled.indexOf(document.activeElement);enabled[(index+(e.shiftKey?enabled.length-1:1))%enabled.length]?.focus();}if(e.key==="Escape"){e.preventDefault();if(!exitSaving)cancel();}if(["ArrowLeft","ArrowRight"].includes(e.key)){e.preventDefault();const index=buttons.indexOf(document.activeElement);buttons[(index+(e.key==="ArrowRight"?1:buttons.length-1))%buttons.length].focus();}});
        document.body.appendChild(el);managerDialog={element:el,error,buttons,cancel};buttons[buttons.length-1].focus();Input.clear();TouchInput.clear();return managerDialog;
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
        const cancel=()=>{closeManagerDialog();scene._choices.activate();};
        const modal=managerModal("Choose one to three companions",[],[{name:"Review quest",run:()=>{
            const ids=members.filter(n=>selected.has(n.id)).map(n=>n.id),error=progression.teamError(state,ids);
            if(error){modal.error.textContent=error;return;}
            closeManagerDialog();showQuestConfirmation(scene,quest,ids);
        }},{name:"Cancel",run:cancel}],cancel);
        modal.element.id="quest-party-selection";modal.element.style.overflowY="auto";
        const content=document.createElement("div"),count=document.createElement("p"),grid=document.createElement("div");
        modal.element.insertBefore(content,modal.error);content.append(count,grid);
        grid.style.cssText="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px";
        const cards=[];
        const refresh=()=>{const average=selected.size?(members.filter(n=>selected.has(n.id)).reduce((sum,n)=>sum+n.level,0)/selected.size).toFixed(1):"–";count.textContent=`${selected.size} / 3 selected · Average level ${average} · Quest estimate ${progression.dangerRating(quest)}`;modal.buttons[0].disabled=selected.size<1||selected.size>3;modal.buttons[0].style.opacity=selected.size>=1&&selected.size<=3?"1":".5";for(const {card,id} of cards){const chosen=selected.has(id);card.setAttribute("aria-pressed",String(chosen));card.style.borderColor=chosen?"#b58225":"#aa9772";card.style.background=chosen?"#e8c583":"#e3d1ab";}};
        for(let i=0;i<5;i++){
            const n=members[i],card=document.createElement("button");card.type="button";
            card.style.cssText=`grid-column:${i<2?2+i*2:1+(i-2)*2}/span 2;grid-row:${i<2?1:2};padding:8px 4px;border:3px solid #aa9772;border-radius:8px;color:#302248;font:14px Trebuchet MS;cursor:pointer;min-width:0`;
            if(n){
                card.dataset.memberId=n.id;card.setAttribute("aria-label",`Select ${n.name}`);
                const face=n.portrait,cols=face.columns||4,rows=face.rows||2,portrait=document.createElement("div");
                portrait.style.cssText=`width:48px;height:48px;margin:0 auto 4px;image-rendering:pixelated;background-image:url('img/faces/${face.sheet}.webp');background-size:${cols*48}px ${rows*48}px;background-position:-${face.index%cols*48}px -${Math.floor(face.index/cols)*48}px;border-radius:5px`;card.appendChild(portrait);
                for(const text of [n.name,`${progression.classLabel(n)} · Level ${n.level}`,`HP ${n.health}/${n.maxHealth}`,`Armor ${n.classArmor+progression.equipmentArmor(n)}`,`Ward ${(n.innateWard||0)+(n.temporaryWard||0)}`]){const label=document.createElement("div");label.textContent=text;label.style.cssText="line-height:19px;overflow-wrap:anywhere";card.appendChild(label);}
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
        const cancel=()=>{closeManagerDialog();scene._choices.activate();};
        const modal=managerModal("Confirm expedition",[],[{name:"Embark",run:()=>{try{const state=managerState();if(state.trips.A)throw Error("An expedition is already active.");state.selectedQuestId=quest.id;progression.dispatchQuest(state,"A",quest,$dataRPGManagerQuests.xp,Date.now(),null,"standard",null,null,partyIds);closeManagerDialog();SceneManager.goto(Scene_RPGHome);}catch(error){managerDialog.error.textContent=error.message;}}},{name:"Cancel",run:cancel}],cancel),content=document.createElement("div");content.id="embark-summary";modal.element.insertBefore(content,modal.error);modal.element.querySelector("h2").style.cssText="font-size:23px;margin:0 0 10px";modal.error.style.margin="6px 0";
        const line=(text,bold=false)=>{const p=document.createElement(bold?"strong":"p");p.textContent=text;p.style.cssText="display:block;margin:8px 0;line-height:1.35";content.appendChild(p);};
        const risk=progression.questDangerEstimate(managerState(),quest,$dataRPGManagerQuests,window.RPGManagerBattle.Battle,partyIds);
        if(risk.dangerous){line(risk.allSamplesWiped?"DANGEROUS EXPEDITION: This party appears severely outmatched. Consider better equipment, recovery or an easier contract. Proceed only if you accept the danger.":"DANGEROUS EXPEDITION: This quest may be too difficult for your current party. Check their level, health and equipment before proceeding.",true);content.firstChild.style.color="#9b2637";modal.buttons[0].textContent="Accept danger and start quest";}
        if(risk.samples)line("Risk preview samples one enemy group; repeated encounters can be harder. Level is a recommendation, not an entry gate.");
        line(quest.name,true);line(`${quest.durationMinutes} minutes · ${progression.dangerLabel(quest)} · Estimated party level ${progression.dangerRating(quest)}`);
        const primary=progression.primaryReward(quest);line(`Primary: ${primary.value} ${primary.label} · ${quest.rewardGold.victory} Gold / ${quest.rewardArcana?.victory||0} Arcana / ${quest.xpPool??quest.xpReward*3} shared completion XP + enemy XP`,true);
        line(quest.riskExplanation||quest.danger);const grid=document.createElement("div");grid.style.cssText="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0";content.appendChild(grid);
        for(const n of partyIds.map(findNpc)){const card=document.createElement("div"),face=n.portrait,cols=face.columns||4,rows=face.rows||2;card.style.cssText="background:#e3d1ab;border:1px solid #b99c64;border-radius:7px;padding:8px;text-align:center";const portrait=document.createElement("div");portrait.style.cssText=`width:54px;height:54px;margin:0 auto;image-rendering:pixelated;background-image:url('img/faces/${face.sheet}.webp');background-size:${cols*54}px ${rows*54}px;background-position:-${face.index%cols*54}px -${Math.floor(face.index/cols)*54}px;border-radius:5px`;card.appendChild(portrait);for(const text of [n.name,`${n.role} · L${n.level}`,`HP ${n.health}/${n.maxHealth}`,`Armor ${n.classArmor+progression.equipmentArmor(n)} · Ward ${n.innateWard+n.temporaryWard}`,n.injury||"Healthy"]){const label=document.createElement("div");label.textContent=text;label.title=text;label.style.cssText="font-size:14px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";card.appendChild(label);}grid.appendChild(card);}
        line("XP pools are split across the selected party. Embark starts the timer; Cancel starts nothing.");
    }
    async function saveCampaignForExit(){
        if(!globalThis.$gameSystem?._rpgManager)throw Error("Start or load a campaign before saving.");
        const slot=Math.max(1,$gameSystem.savefileId()||DataManager.latestSavefileId()||1),normalIndex=DataManager.saveGlobalInfo;let indexWrite;$gameSystem.setSavefileId(slot);$gameSystem.onBeforeSave();
        // MZ 1.10 resolves saveGame with 0 and starts its global-index write without awaiting it.
        DataManager.saveGlobalInfo=function(){return indexWrite=StorageManager.saveObject("global",this._globalInfo);};
        try{const saved=await DataManager.saveGame(slot);if(saved===false)throw Error("The save could not be written.");if(indexWrite)await indexWrite;}
        finally{DataManager.saveGlobalInfo=normalIndex;}
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
        nav.id="camp-menu-navigation";nav.setAttribute("aria-label","Camp menus");nav.style.cssText=`position:fixed;z-index:25;box-sizing:border-box;left:${rect.left+12*scale}px;top:${rect.top+(Graphics.boxHeight-88)*scale}px;width:${(Graphics.boxWidth-24)*scale}px;height:${80*scale}px;padding:6px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;background:#302248;border:2px solid #c6ae65;border-radius:9px`;
        const menus=[["Camp",Scene_RPGHome],["Quest Board",Scene_RPGQuestBoard],["Shop",Scene_RPGShop],["Tavern",Scene_RPGTavern],["Altar",Scene_RPGAltar],["Graveyard",Scene_RPGRoster],["Camp Jobs",Scene_RPGCampJobs],["Save",Scene_Save]];
        for(const [name,type] of menus){const selected=type===Scene_RPGRoster?scene instanceof type&&scene._graveyard:type===Scene_RPGHome?scene instanceof type||scene instanceof Scene_RPGMember||scene instanceof Scene_RPGRoster&&!scene._graveyard:scene instanceof type;const b=document.createElement("button");b.textContent=name;b.style.cssText=`font:${14*scale}px Trebuchet MS;background:${selected?"#ecd79e":"#354c80"};color:${selected?"#302248":"#fff0ce"};border:1px solid #c6ae65;border-radius:5px;cursor:pointer`;if(selected)b.setAttribute("aria-current","page");b.onclick=()=>{if(managerState().trips.A||managerDialog||(type===Scene_RPGQuestBoard&&managerState().questResults))return;closeManagerDialog();document.getElementById("return-vignette")?.remove();document.getElementById("camp-member-sheet")?.remove();SceneManager._stack=[Scene_RPGHome];if(type===Scene_RPGHome)Scene_RPGHome.reopenSheet=false;SceneManager.goto(type);if(type===Scene_RPGRoster)SceneManager.prepareNextScene(false,true);};if(type===Scene_RPGQuestBoard&&state.questResults){b.disabled=true;b.style.opacity=".45";}nav.appendChild(b);}
        for(const e of ["mousedown","mouseup","touchstart","touchend","keydown","keyup"])nav.addEventListener(e,event=>event.stopPropagation());document.body.appendChild(nav);scene._campNav=nav;
        const status=document.createElement("aside");status.id="camp-status-bar";status.setAttribute("aria-label","Camp resources and alerts");status.style.cssText=`position:fixed;z-index:25;left:${rect.left+230*scale}px;top:${rect.top+58*scale}px;width:${300*scale}px;height:${30*scale}px;display:flex;gap:6px;font:${14*scale}px Trebuchet MS;color:#fff0ce`;
        if(!(scene instanceof Scene_RPGHome))status.style.display="none";
        for(const kind of ["gold","arcana"]){const value=document.createElement("span");value.dataset.resource=kind;value.style.cssText="flex:1;padding:6px;background:#354c80;border:1px solid #c6ae65;border-radius:5px;white-space:nowrap";status.appendChild(value);}
        const alerts=document.createElement("button");alerts.style.cssText="font:inherit;background:#354c80;color:#fff0ce;border:1px solid #c6ae65;border-radius:5px";alerts.onclick=()=>{state.completionAlerts=state.completionAlerts===false;if(!state.completionAlerts){eventAudioQueue=[];releaseCompletionChime();}};status.appendChild(alerts);for(const event of ["mousedown","mouseup","keydown","keyup"])status.addEventListener(event,e=>e.stopPropagation());document.body.appendChild(status);scene._campStatus=status;

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
            const pictureName = $dataRPGManagerUI?.hamlet?.backgroundPicture;
            if (pictureName) { this._optionalArt=Bitmap.load(`img/pictures/${encodeURIComponent(pictureName)}.webp`);this._artBackground = new Sprite(this._optionalArt); this._artBackground.opacity = 90; this.addChild(this._artBackground); }
            this.createWindowLayer();
        }

        panel(rect, PanelClass = Window_RPGPanel) {
            const panel = new PanelClass(rect);
            this.addWindow(panel);
            return panel;
        }

        header(title, subtitle) {
            const panel = this.panel(new Rectangle(12, 8, Graphics.boxWidth - 24, 88));
            CozyUI.icon(panel.contents,"campaign",8,5,29,"#e8c583");
            panel.contents.fontFace=`Georgia, ${$gameSystem.mainFontFace()}`;CozyUI.text(panel,title,48,0,Math.max(120,panel.innerWidth-370),25,"#f4deb0","left",32);
            panel.contents.fontFace=`Trebuchet MS, ${$gameSystem.mainFontFace()}`;CozyUI.text(panel,subtitle,8,38,Math.max(120,panel.innerWidth-278),15,"#c6b99d");
            panel.rule(62, "#c6ae65");
            return panel;
        }

        footer(lines) {
            const panel = this.panel(new Rectangle(12, Graphics.boxHeight - 88, Graphics.boxWidth - 24, 80));
            panel.setLines(lines);
            return panel;
        }

        terminate() {
            this._finishButton?.remove();this._returnVignette?.remove();this._campStatus?.remove();this._campNav?.remove();if(managerDialog?.element.dataset.exit!=="true")closeManagerDialog();super.terminate();
            this._background.bitmap.destroy();
            if(this._optionalArt)this._optionalArt.destroy();
        }
    }

    class Window_RPGAlerts extends Window_Command {
        initialize(rect){super.initialize(rect);this.deactivate();this.deselect();}
        update(){super.update();if((TouchInput.isTriggered()&&this.isTouchedInsideFrame())||!managerState().questResults&&Input.isTriggered("pageup"))this.callHandler("toggle");}
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
            const living = roster().filter(isLiving).length;
            const hamlet = $dataRPGManagerUI?.hamlet || {};
            if(managerState().startingRosterPending){SceneManager.goto(Scene_RPGStartingRoster);return;}
            this._hasTrip=!!progression.tripForTeam(managerState(),"A");this._campFirst=true;
            this._header=this.header(hamlet.title || "THE HAMLET", hamlet.subtitle || "A little haven for great adventures");this.refreshGuildHeader();
            const campHeight=Graphics.boxHeight-(this._hasTrip?120:208);
            const commandRect=this._campFirst?new Rectangle(12,Graphics.boxHeight-96,Graphics.boxWidth-24,84):new Rectangle(12,108,382,210);
            this._commandWindow = new Window_RPGHomeCommands(commandRect,this._campFirst);
            this._commandWindow.setHandler("roster", () => this.openRoster(false));
            this._commandWindow.setHandler("battle", this.startBattle.bind(this));
            this._commandWindow.setHandler("shop", () => SceneManager.push(Scene_RPGShop));
            this._commandWindow.setHandler("recruit",()=>SceneManager.push(Scene_RPGTavern));
            this._commandWindow.setHandler("completionAlert",()=>{const state=managerState();state.completionAlerts=state.completionAlerts===false;if(!state.completionAlerts){eventAudioQueue=[];releaseCompletionChime();}this._commandWindow.refresh();this._footer.setLines([state.completionAlerts?"Quiet cues mark encounters, battles and completion.":"All expedition cues are muted; results appear normally.","This setting is saved with your game."]);this._commandWindow.activate();});
            this._commandWindow.setHandler("altar", () => SceneManager.push(Scene_RPGAltar));
            this._commandWindow.setHandler("campJobs", () => SceneManager.push(Scene_RPGCampJobs));
            this._commandWindow.setHandler("debug", () => SceneManager.push(Scene_RPGDebugTimers));
            this._commandWindow.setHandler("graveyard", () => this.openRoster(false, true));
            this._commandWindow.setHandler("save", () => { SceneManager.snapForBackground(); SceneManager.push(Scene_Save); });
            
            this.addWindow(this._commandWindow);
            if(!this._hasTrip){
                const campWidth=Math.floor((Graphics.boxWidth-36)*.54);this._camp=this.panel(new Rectangle(12,108,campWidth,campHeight),Window_RPGCampsite);this._camp.setSelectHandler(id=>this.openMember(id));this._camp.setState(managerState());
                this._companions=this.panel(new Rectangle(campWidth+24,108,Graphics.boxWidth-campWidth-36,campHeight),Window_RPGCampRoster);this._companions.setSelectHandler(id=>this.openMember(id));this._companions._menuHandler=menu=>{if(menu==="roster")this.openRoster(false);else this._commandWindow.callHandler(menu);};this._companions.setState(managerState());this._jobSummary=this._companions;if(managerState().questResults){this._companions.hide();this._teamPanel=this.panel(new Rectangle(campWidth+24,108,Graphics.boxWidth-campWidth-36,campHeight),Window_RPGExpeditionPanel);this._teamPanel.setRecallHandler(()=>this.finishRecap());}
            }else{
                const campWidth=Math.floor((Graphics.boxWidth-36)*.34);this._camp=this.panel(new Rectangle(12,148,campWidth,campHeight-40),Window_RPGCampRoster);this._camp.setSelectHandler(id=>this.openMember(id));this._camp.setState(managerState());
                const jobs=document.createElement("button"),r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;jobs.textContent="Camp Jobs";jobs.id="expedition-camp-jobs";jobs.style.cssText=`position:fixed;z-index:23;left:${r.left+12*scale}px;top:${r.top+111*scale}px;width:${campWidth*scale}px;height:${31*scale}px;background:#354c80;color:#fff0ce;border:1px solid #c6ae65;border-radius:6px;font:${16*scale}px Trebuchet MS;cursor:pointer`;
                jobs.onclick=()=>SceneManager.push(Scene_RPGCampJobs);for(const event of ["mousedown","mouseup","keydown","keyup"])jobs.addEventListener(event,e=>e.stopPropagation());document.body.appendChild(jobs);this._campJobsShortcut=jobs;
                this._teamPanel=this.panel(new Rectangle(campWidth+24,108,Graphics.boxWidth-campWidth-36,campHeight),Window_RPGExpeditionPanel);this._teamPanel.setStartHandler(team=>this.openExpeditionAttention(team));this._teamPanel.setRecallHandler(()=>{if(!progression.tripForTeam(managerState(),"A")){this.finishRecap();}else SceneManager.push(Scene_RPGRecall);});
            }
            if(this._teamPanel&&this._hasTrip){
                this._campOpen=false;
                this._campToggle=new Window_RPGCampToggle(new Rectangle(20,60,200,42));
                this._campToggle.setHandler("toggle",()=>{this._campOpen=!this._campOpen;this.layoutExpedition();});this.addWindow(this._campToggle);this.layoutExpedition();
            }
            this._alerts=new Window_RPGAlerts(new Rectangle(360,56,168,42));
            this._alerts.setHandler("toggle",()=>{const state=managerState();state.completionAlerts=state.completionAlerts===false;if(!state.completionAlerts){eventAudioQueue=[];releaseCompletionChime();}this._alerts.refresh();this._commandWindow.activate();});this.addWindow(this._alerts);this._alerts.visible=this._hasTrip;
            this.refreshTeamPanel();
            this._footer = this._hasTrip?this.panel(new Rectangle(12,Graphics.boxHeight-50,Graphics.boxWidth-24,42),Window_RPGSessionHint):this.footer(this.homeHints());if(this._hasTrip)this._footer.setLines(this.homeHints());
            this._commandWindow.onBlocked = () => this._footer.setLines(["That option is not available yet.", progression.teamError(managerState())||"Choose one to three roster members for a quest."]);
            this._footer.visible=false;
            this._lastTimerSecond=-1;
        }

        showReturnVignette(){
            const id=managerState().questResults?.questId;if(this._vignetteId===id)return;this._vignetteId=id;
            const finish=document.createElement("button"),panel=this._teamPanel,r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;
            finish.id="finish-recap";finish.textContent="FINISH";finish.setAttribute("aria-label","Finish recap");finish.style.cssText=`position:fixed;z-index:40;left:50%;top:50%;transform:translate(-50%,-50%);width:${320*scale}px;height:${100*scale}px;border:3px solid #fff0c7;border-radius:16px;background:#e8c583;color:#302b22;box-shadow:0 8px 35px #0009;font:bold ${38*scale}px Trebuchet MS;cursor:pointer`;
            finish.onclick=()=>this.finishRecap();for(const event of ["mousedown","mouseup","keydown","keyup"])finish.addEventListener(event,e=>e.stopPropagation());document.body.appendChild(finish);this._finishButton=finish;finish.focus();Input.clear();TouchInput.clear();

            const el=document.createElement("button");el.id="return-vignette";el.textContent="✦  Lanterns gathered. Turning for home…";el.setAttribute("aria-label","Dismiss return vignette");
            el.style.cssText="position:fixed;left:8%;top:55%;z-index:21;max-width:38vw;padding:18px;border:2px solid #dca25d;border-radius:14px;background:radial-gradient(ellipse,#8a5935,#302248);color:#fff0ce;box-shadow:0 0 24px #e5ae5766;font:18px Georgia;cursor:pointer";
            el.onclick=()=>el.remove();document.body.appendChild(el);this._returnVignette=el;this._vignetteStarted=performance.now();this._vignetteUntil=this._vignetteStarted+1600;
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
            this._renderedResult=null;this._teamPanel.move(x,108,Graphics.boxWidth-x-12,Graphics.boxHeight-120);this._teamPanel.createContents();
            this._campToggle.visible=false;this._commandWindow.visible=false;this._commandWindow.deactivate();this._campToggle._open=this._campOpen;this._campToggle.refresh();this.refreshTeamPanel();
        }
        refreshGuildHeader(){
            if(!this._header)return;const p=this._header,s=managerState(),trip=progression.tripForTeam(s,"A"),living=roster().filter(isLiving).length;
            p.contents.clear();CozyUI.icon(p.contents,"campaign",8,7,32,"#e8c583");p.contents.fontFace=`Georgia, ${$gameSystem.mainFontFace()}`;
            CozyUI.text(p,"Pomodoro Chronicles",50,0,Math.max(280,p.innerWidth-300),23,"#f4deb0","left",34);
            p.contents.fontFace=`Trebuchet MS, ${$gameSystem.mainFontFace()}`;
            // The upper timer and roster carry session/party state; keep this control row clear.
            const pill=(kind,value,x,color)=>{CozyUI.round(p.contents,x,35,128,28,"#2b4480","#8b7955",6);CozyUI.icon(p.contents,kind,x+8,40,18,color);CozyUI.text(p,value,x+32,38,90,15,"#f6e8ce","left",24);};
            if(this._hasTrip){pill("coin",`${s.gold} Gold`,8,"#e8c583");pill("arcana",`${s.arcana||0} Arcana`,154,"#c5ade4");}
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
                        panel.contents.clear();CozyUI.text(panel,trip.questName,8,2,panel.innerWidth-16,22,"#ffe3a4","center",28);
                        panel.drawBattle(trip);
                        panel.setRecallRegion(null);continue;
                    }
                    const urgent = ["ready", "battle", "halted", "choice"].includes(trip.phase);
                    const stage = progression.currentStage(trip);
                    const label = trip.phase === "ready" ? "! ENCOUNTER READY - START NOW !" : trip.phase === "halted" ? "! INTERRUPTION - ATTENTION REQUIRED !" : trip.phase === "choice" ? "! CONTINUE OR RETURN - DECIDE NOW !" : trip.phase === "battle" ? "! ENCOUNTER IN PROGRESS !" : `${(stage?.label || trip.phase).toUpperCase()}  ${formatTime(trip.deadlineMs - now)} remaining`;
                    panel.changeTextColor("#ffffff"); panel.contents.fontSize = 13; panel.drawText(trip.questName, 8, y + 45, 180);
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
            if(this._returnVignette&&performance.now()-this._vignetteStarted>=800)this._returnVignette.textContent="?  Heading home. The camp is ready.";
            if(this._returnVignette&&performance.now()>=this._vignetteUntil){this._returnVignette.remove();this._returnVignette=null;}
            if (!this.isActive() || SceneManager.isSceneChanging()) return;
            if(!this._hasTrip&&!managerState().questResults&&!managerDialog){
                const sheet=document.getElementById("camp-member-sheet");
                if(sheet)updateFormController(sheet);
                else if(!this._campNav?.contains(document.activeElement)){
                    if(Input.isTriggered("down")||Input.isTriggered("up")){
                        this._campFocusIndex=((this._campFocusIndex??0)+(Input.isTriggered("down")?1:2))%3;
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
            if(!this._hasTrip){this._commandWindow.hide();this._commandWindow.deactivate();}
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
            const tabs=document.createElement("div");tabs.style.cssText="display:flex;gap:5px;margin:8px 0";pane.appendChild(tabs);for(const tab of ["Overview","Gear","Care","Powers"]){const b=button(tab,()=>{this._sheetTab=tab;this.drawCampSheet();},tabs);b.setAttribute("aria-pressed",String((this._sheetTab||"Overview")===tab));if((this._sheetTab||"Overview")===tab)b.style.background="#6a6046";}
            if(this._sheetTab==="Powers"){
                pane.style.overflowY="auto";
                const page=this._powerPage||0,track=P.powerTrack(npc),pages=Math.max(1,Math.ceil(track.length/3));
                for(const text of track.slice(page*3,page*3+3))line(text);
                if(pages>1)button(`Powers ${page+1}/${pages} — next`,()=>{this._powerPage=(page+1)%pages;this.drawCampSheet();});
                line(`XP ${npc.xp}/${P.xpRequired(npc)||"CAP"}; level cap 8. L3+: one special per battle; Quickening has a 25% chance to allow two.`);
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
                info(`Gear: ${P.EQUIPMENT_SLOTS.map(slot=>P.SHOP[npc.equipmentSlots?.[slot]]?.name||"Empty").join(" / ")}`);
                info(`${career.questsCompleted} adventures · ${career.victories} victories · ${career.bossVictories} bosses`);
                info(`${career.kills} kills · ${career.damageDealt} damage · ${career.healingDone} healing · ${career.signatureUses} signatures · ${career.injuriesSuffered} injuries`);
                info(`Recent: ${career.lastQuest?`${career.lastQuest.questName} / ${career.lastQuest.result}`:"No recorded adventure"}`);
                button("Full sheet / Rename",()=>{pane.remove();SceneManager.push(Scene_RPGMember);SceneManager.prepareNextScene(npc.id);},overview);

            }
            pane.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();back.click();}else if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)&&e.target.tagName==="BUTTON"){e.preventDefault();focusWizardDirection(pane,e.key.slice(5).toLowerCase());}});
            line(message||(this._sheetTab==="Overview"?"Scroll Overview for stats, wounds and career history.":"One companion, one job. Camp duties resume on return."));document.body.appendChild(pane);back.focus();
        }
        terminate(){this._campJobsShortcut?.remove();document.getElementById("return-vignette")?.remove();document.getElementById("camp-member-sheet")?.remove();super.terminate();}

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
            this.header(`${trip.questName} - ${this._event.name}`, `Party Leader: ${this._decision.leaderName || "Unavailable"}`);
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
                this._dialogue.hide();
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
        create(){super.create();const trip=progression.tripForTeam(managerState(),"A");if(!trip?.realtime){SceneManager.goto(Scene_RPGHome);return;}this._expectedTripId||=trip.id;this.header("Recall expedition",trip.questName);
            const panel=this.panel(new Rectangle(50,130,Graphics.boxWidth-100,230));panel.setLines(["Head back to camp? Recall again to arrive immediately.","Future encounters stop immediately.","Normal completion Gold, Arcana and XP are forfeited.","Previous finds, wounds, deaths and Armor loss remain.","The countdown continues while the party walks left toward camp."]);
            this._choices=new Window_RPGDecisionChoices(new Rectangle(80,380,Graphics.boxWidth-160,130),()=>[{name:"KEEP SESSION RUNNING",symbol:"keep"},{name:"CONFIRM RECALL",symbol:"recall"}]);
            this._choices.setHandler("keep",()=>this.popScene());this._choices.setHandler("recall",()=>{syncMissionClock();const result=progression.requestRecall(managerState());SceneManager.goto(Scene_RPGHome);managerState().recoveryNotice=result.message;});this._choices.setHandler("cancel",()=>this.popScene());this.addWindow(this._choices);this._choices.selectSymbol("keep");this.footer(["Keeping the session running is selected by default.","The timer continues normally while you consider this choice."]);}
    }

    class Scene_RPGExpeditionChoice extends Scene_RPGBase {
        prepare(teamKey) { this._teamKey = teamKey; }
        create() {
            super.create(); const trip = progression.tripForTeam(managerState(), this._teamKey);
            if (!trip || trip.phase !== "choice") { SceneManager.goto(Scene_RPGHome); return; }
            this.header(`${trip.questName} - Press On?`, `Team ${this._teamKey} awaits a guild decision`);
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
            super.create();this._minutes=Number(selectedQuest().durationMinutes);this._difficulty=progression.dangerRating(selectedQuest());
            this.header("Quest Board","Skulls estimate party level (1-8). Gear and party size matter.");
            const left=Math.floor(Graphics.boxWidth*.46);
            this._info=this.panel(new Rectangle(left+12,108,Graphics.boxWidth-left-24,Graphics.boxHeight-204));
            this._choices=new Window_RPGChoices(new Rectangle(12,218,left-12,Graphics.boxHeight-368),()=>[
                ...quests().filter(q=>Number(q.durationMinutes)===this._minutes&&progression.dangerRating(q)===this._difficulty).map(q=>({name:`${q.durationMinutes}m  ${q.name}`,symbol:"quest",ext:q.id,enabled:!this.lockReason(q)})),

            ],"quests");
            this._choices.setHandler("quest",()=>{this.refreshInfo();this._choices.activate();});this._choices.setHandler("filters",()=>{this._choices.deactivate();this._questFilters.querySelector("select").focus();});
            this._choices.setHandler("back",()=>this.popScene());this._choices.setHandler("cancel",()=>this.popScene());this._choices.onSelectionChange=()=>this.refreshInfo();this.addWindow(this._choices);
            this._footer=this.footer(["Select a contract to review. Only Embark starts the timer.","Cancel or Escape starts nothing."]);this.mountFilters();this._choices.select(0);this.refreshInfo();
            const start=document.createElement("button"),r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;
            start.id="start-quest";start.textContent="Start Quest";start.style.cssText=`position:fixed;z-index:23;left:${r.left+12*scale}px;top:${r.top+(Graphics.boxHeight-144)*scale}px;width:${(left-12)*scale}px;height:${48*scale}px;background:#e8c583;color:#302248;border:2px solid #fff0c7;border-radius:8px;font:bold ${23*scale}px Trebuchet MS;cursor:pointer`;
            start.onclick=()=>this.chooseQuest();for(const e of ["mousedown","mouseup","keydown","keyup"])start.addEventListener(e,e=>e.stopPropagation());document.body.appendChild(start);this._startQuestButton=start;
        }
        mountFilters(){
            const el=document.createElement("section"),r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;
            el.id="quest-filters";el.style.cssText=`position:fixed;z-index:20;left:${r.left+18*scale}px;top:${r.top+113*scale}px;width:${(Math.floor(Graphics.boxWidth*.46)-40)*scale}px;background:#302248;color:#fff0ce;padding:8px;box-sizing:border-box;border:1px solid #c6ae65;border-radius:6px;font:${16*scale}px Trebuchet MS`;
            el.style.padding="8px";el.style.display="grid";el.style.gridTemplateColumns="1fr 1fr";el.style.gap="10px";
            const add=(label,values,current,change)=>{const l=document.createElement("label");l.textContent=label;const select=document.createElement("select");select.setAttribute("aria-label",label);select.style.cssText="display:block;margin:4px 0;width:100%;padding:5px;font:inherit;background:#f3e5c7;color:#302248";for(const v of values){const o=document.createElement("option");o.value=v;o.textContent=label==="Minutes"?`${v} minutes`:`☠ ${v}/8 - Lv ${v}`;o.selected=String(v)===String(current);select.appendChild(o);}select.onchange=()=>{change(select.value);this._choices.refresh();this._choices.select(0);this._choices.activate();this.refreshInfo();};select.onkeydown=e=>{if(e.key==="Escape"||e.key==="Enter"){e.preventDefault();select.blur();this._choices.activate();}};l.appendChild(select);el.appendChild(l);};
            add("Minutes",progression.EXPEDITION_DURATIONS,this._minutes,v=>this._minutes=Number(v));add("Danger",[1,2,3,4,5,6,7,8],this._difficulty,v=>this._difficulty=Number(v));
            for(const event of ["keydown","keyup","mousedown","mouseup"])el.addEventListener(event,e=>e.stopPropagation());document.body.appendChild(el);this._questFilters=el;
            this._filterBlur=e=>{if(!el.contains(e.target)&&el.contains(document.activeElement)){document.activeElement.blur();this._choices.activate();}};document.addEventListener("pointerdown",this._filterBlur);
        }
        update(){super.update();if(!managerDialog&&Input.isTriggered("pageup")){this._choices.deactivate();this._questFilters.querySelector("select").focus();}}
        terminate(){this._startQuestButton?.remove();this._questEnemyPicture?.remove();document.removeEventListener("pointerdown",this._filterBlur);this._questFilters?.remove();super.terminate();}
        lockReason(quest) { const active=progression.questUnavailableReason(managerState(),quest.id);if(active)return active;const needed=quest.unlock?.questsCompleted||0;return needed>(managerState().campaignStats?.questsCompleted||0)?quest.unlock.label:""; }
        refreshInfo() {
            const quest = findQuest(this._choices.currentExt());
            this._questEnemyPicture?.remove();
            if (this._choices.currentSymbol() !== "quest") { this._info.contents.outlineWidth=2;this._info.setLines(["Choose a contract",`${this._minutes} minutes / ${progression.dangerLabel({skulls:this._difficulty})}`,"Select a contract to read its story,", "encounters, fixed time, and rewards.","", "No matching contract? Change either filter.","Choose one to three roster members before departure."]); return; }
            const p=this._info,w=p.innerWidth; p.contents.clear();
            CozyUI.round(p.contents,0,0,w,p.innerHeight,"#e4d3ae","#c0a677",6);p.contents.outlineWidth=0;
            const unavailable=this.lockReason(quest),dark="#453e30",muted="#6d6149";
            CozyUI.icon(p.contents,"quest",12,12,22,"#7e6a44");
            CozyUI.text(p,unavailable?"LOCKED":"AVAILABLE",w-138,10,124,13,unavailable?"#8b4f43":"#486341","right");
            p.contents.fontFace=`Georgia, ${$gameSystem.mainFontFace()}`;CozyUI.text(p,quest.name,14,37,w-28,25,dark,"left",34);p.contents.fontFace=`Trebuchet MS, ${$gameSystem.mainFontFace()}`;
            p.contents.fillRect(14,79,w-28,1,"#b5a078");
            CozyUI.round(p.contents,14,85,82,25,"#40533f","#98ad88",4);CozyUI.text(p,`${quest.durationMinutes} MIN`,20,87,70,14,"#f5e6c8","center",21);
            CozyUI.round(p.contents,104,85,w-118,25,"#ddd0ad","#b39b6c",4);CozyUI.text(p,`${progression.dangerLabel(quest)} / ${quest.category}`,112,87,w-134,13,"#544530","left",21);
            const section=(title,value,y)=>{CozyUI.text(p,title.toUpperCase(),14,y,w-28,11,"#846b43","left",16);CozyUI.wrap(p,Array.isArray(value)?value.join(" / "):value,14,y+17,y===118?w-112:w-28,14,dark,2,18);};
            section("Risk / field notes",Number(quest.durationMinutes)===1?"Combatless stroll. Low-risk finds; no combat rewards.":quest.riskExplanation||quest.danger,118);section("Estimated party level / encounters",`Level ${progression.dangerRating(quest)} / ${(quest.tags||[]).join(" / ")} / ${quest.encounterType}`,175);const primary=progression.primaryReward(quest);CozyUI.icon(p.contents,primary.label==="Gold"?"coin":primary.label==="Arcana"?"arcana":"quest",16,236,30,"#66552d");CozyUI.text(p,`${primary.value} ${primary.label}`,54,238,w-68,23,dark,"left",30);section("The journey",`${quest.environment} / ${quest.journey}`,281);
            
            const arcana=quest.rewardArcana||{victory:0,draw:0};CozyUI.round(p.contents,8,347,w-16,46,"#cbbc93",null,4);
            CozyUI.text(p,`${quest.rewardGold.victory} Gold / ${arcana.victory} Arcana / ${quest.xpPool??quest.xpReward*3} shared completion XP + enemy XP`,16,350,w-32,14,"#405239");
            CozyUI.text(p,`Draw: ${quest.rewardGold.draw} Gold + ${arcana.draw||0} Arcana`,16,372,w-32,12,muted,"left",16);
            const enemy=quest.combatMode==="none"||Number(quest.durationMinutes)===1?null:(quest.enemyIds||[]).map(id=>$dataRPGManagerQuests.enemies.find(e=>e.id===id)).filter(Boolean).sort((a,b)=>(b.boss?100:0)+b.health-((a.boss?100:0)+a.health))[0];
            if(enemy?.portrait?.sheet){const face=enemy.portrait,cols=face.columns||4,rows=face.rows||2,el=document.createElement("div"),r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width;el.title=enemy.name;el.setAttribute("aria-label",enemy.name);el.style.cssText=`position:fixed;pointer-events:none;z-index:21;left:${r.left+(p.x+p.width-94)*scale}px;top:${r.top+(p.y+124)*scale}px;width:${68*scale}px;height:${68*scale}px;background-image:url('img/faces/${face.sheet}.webp');background-size:${cols*68*scale}px ${rows*68*scale}px;background-position:-${face.index%cols*68*scale}px -${Math.floor(face.index/cols)*68*scale}px;border:2px solid #b39b6c;border-radius:8px`;document.body.appendChild(el);this._questEnemyPicture=el;}
            refreshFocusTimer(true);
            if(this._footer)this._footer.setLines([unavailable?`Locked: ${unavailable}`:"Select this contract to review and confirm departure.","Authored duration includes travel, encounters, objective, and return."]);
        }
        chooseQuest() {
            if(managerDialog||this._choices.currentSymbol()!=="quest")return;
            const id=this._choices.currentExt(),quest=findQuest(id),state=managerState();
            const error=this.lockReason(quest)||progression.teamError(state);
            if(error){SoundManager.playBuzzer();this._footer.setLines([error,"Assign one to three companions before embarking. Recruit for free at Tavern."]);this._choices.activate();return;}
            this._choices.deactivate();showQuestPartySelection(this,quest);

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
            if(validation){this._header.setLines([quest.name,"Party setup required"]);this._info.setLines(["CANNOT DEPART",validation,"Choose Back to Home, then reopen the Quest Board to form a party."]);this._departure.setCanDepart(false);return;}
            this._departure.setCanDepart(true);
            const xp = quest.xpReward || progression.xpPreview(teamIds().length, $dataRPGManagerQuests.xp).perMember;
            const leader = findNpc(managerState().pendingLeaderId);
            this._header.setLines([quest.name, `Party Leader: ${leader?.name || "NOT SELECTED"} | ${quest.faction}${quest.boss ? " | BOSS" : ""}`]);
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
            this.header(`Travelling: ${active?.questName || quest.name}`, "Eventless outbound travel. Battle presentation begins on arrival.");
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
            this._logWindow.hide(); this._logScrollbar.hide();
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
                    this._narrativeActive = false; this._largePortrait.hide();
                });
                this.addWindow(this._rollWindow); return;
            }
            this._narrativeActive = true;
            this._largePortrait.setCharacter(beat.npc); this._largePortrait.show();
            this._narrativeDialogue.show();
            this._narrativeDialogue.setDialogue(beat.title, beat.text, () => {
                this._narrativeActive = false; this._largePortrait.hide(); this._narrativeDialogue.hide();
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
            if (this._historyOpen) { this._largePortrait.hide(); this._narrativeDialogue.hide(); }
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
            this._header.line(`${trip?.questName || managerState().activeQuest?.questName || `Quest ${this._questId}`} / ${title}`, 0, quest ? factionColor(quest) : ColorManager.systemColor(), 26);
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
                    this._commandWindow.hide(); this._commandWindow.deactivate(); this._management.show(); this._management.activate(); this._management.select(0);
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
        select(index) { super.select(index); if (this.onSelectionChange) this.onSelectionChange(); }
    }

    const listSceneUpdate=Scene_Base.prototype.update;
    Scene_Base.prototype.update=function(){listSceneUpdate.call(this);for(const sync of this._listScrollSync||[])sync();};
    const listSceneStart=Scene_RPGBase.prototype.start;
    Scene_RPGBase.prototype.start=function(){listSceneStart.call(this);for(const win of this._windowLayer.children)if(win instanceof Window_RPGChoices)mountListArrows(this,win);};
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
            this.header(this._tavern?'Tavern · Create a recruit':'Create your companion',this._tavern?'One free recruit per vacant slot. Twelve class/type categories always available.':'Three free companions. Class → Type → Portrait & name → Review.');this.showCreator();
        }
        canHire(){return !managerState().trips.A&&!managerState().activeQuest&&progression.vacantSlots(managerState()).length>0;}
        usedPortraits(){return new Set([...progression.activeRoster(managerState()).filter(n=>n.id!==this._replaceId),...this._drafts.filter((n,i)=>i!==this._creationIndex)].filter(Boolean).map(n=>n.portraitKey));}
        faceElement(n,size=84){const face=n.portrait||progression.portraitOptions(n.classId,n.sex).find(p=>p.key===n.portraitKey)||progression.portraitOptions(n.classId,n.sex)[0],el=document.createElement('div'),cols=face.columns||4,rows=face.rows||2;el.style.cssText=`width:${size}px;height:${size}px;margin:0 auto;image-rendering:pixelated;background-image:url('img/faces/${face.sheet}.webp');background-size:${cols*size}px ${rows*size}px;background-position:-${face.index%cols*size}px -${Math.floor(face.index/cols)*size}px;border-radius:6px`;return el;}
        showCreator(){
            this._nameForm?.remove();const r=Graphics._canvas.getBoundingClientRect(),scale=r.width/Graphics.width,form=document.createElement('form');form.id='character-creation';form.setAttribute('aria-label',this._tavern?'Create tavern recruit':'Create party');form.dataset.step=this._step;
            form.style.cssText=`position:fixed;left:${r.left+18*scale}px;top:${r.top+112*scale}px;width:${(Graphics.boxWidth-36)*scale}px;height:${(Graphics.boxHeight-212)*scale}px;z-index:30;box-sizing:border-box;padding:${14*scale}px;background:#302248;color:#fff0ce;border:2px solid #c6ae65;border-radius:12px;font:${16*scale}px Trebuchet MS;display:flex;flex-direction:column;gap:10px;overflow:hidden`;
            const title=document.createElement('h2');title.style.cssText='font-size:22px;margin:0';title.textContent=this._step==='review'?(this._tavern?'Review recruit':'Review your companion'):this._step==='full'?'Your party is full':`${this._tavern?'New recruit':'Your starting companion'} · ${{class:'Choose a class',type:'Choose a type',appearance:'Portrait & name'}[this._step]}`;form.appendChild(title);
            const body=document.createElement('div');body.style.cssText='flex:1;min-height:0;display:flex;flex-direction:column;gap:10px';form.appendChild(body);
            const error=document.createElement('div');error.setAttribute('role','status');error.style.cssText='min-height:20px;color:#ffccad;font-size:14px';form.appendChild(error);this._creatorError=error;
            const footer=document.createElement('div');footer.style.cssText='display:flex;gap:10px;justify-content:space-between';form.appendChild(footer);
            const button=(text,run,parent=body)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='padding:10px;border:1px solid #b99c64;border-radius:7px;background:#354c80;color:#fff0ce;font:inherit;cursor:pointer';b.onclick=run;parent.appendChild(b);return b;};
            const back=button(this._step==='full'?'Back to camp':'Back',()=>this.creatorBack(),footer);back.dataset.action='back';
            if(this._step==='class'){
                const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:12px;flex:1';body.appendChild(grid);
                const symbols={barbarian:'⚒',knight:'♜',ranger:'➶',rogue:'◆',mage:'✦',cleric:'☀'};
                for(const id of progression.ALL_CLASSES){const c=progression.classFor({classId:id}),stats=progression.classStats({classId:id,level:1}),b=button(`${symbols[id]} ${c.name}`,()=>{if(this._draft.classId!==id)this._draft={classId:id};this._step='type';this.showCreator();},grid);b.setAttribute('aria-label',c.name);b.style.fontSize='22px';const info=document.createElement('small');info.textContent=`HP ${stats.hp} · Armor ${stats.armor} · Ward ${stats.ward} · Speed ${stats.speed}`;info.style.cssText='display:block;font-size:14px;margin-top:9px';b.appendChild(info);const role=document.createElement('small');role.textContent=c.purpose;role.style.cssText='display:block;font-size:12px;margin-top:5px;line-height:1.25';b.appendChild(role);}
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
                people.forEach((d,i)=>{const card=document.createElement('div');card.style.cssText='background:#35476d;border:1px solid #8b7955;border-radius:8px;padding:12px;text-align:center';card.appendChild(this.faceElement(d,96));const name=document.createElement('h3');name.textContent=d.name;name.style.cssText='font-size:18px;margin:12px 0';card.appendChild(name);const text=document.createElement('p');text.textContent=progression.classLabel(d);card.appendChild(text);grid.appendChild(card);if(this._step==='full')button('Replace '+d.name,()=>{const cancel=()=>closeManagerDialog();managerModal('Replace '+d.name+'?',['Their gear will return to inventory. They will be removed only after you create and confirm the replacement.'],[{name:'Create replacement',run:()=>{closeManagerDialog();this._replaceId=d.id;this._drafts=[];this._draft={};this._creationIndex=0;this._step='class';this.showCreator();}},{name:'Cancel',run:cancel}],cancel);},card);if(this._step==='review'&&!(this._replaceId&&i===0))button('Edit '+d.name,()=>{this._creationIndex=i-(this._replaceId?1:0);this._draft={...d};this._editing=true;this._step='appearance';this.showCreator();},card);});
                if(this._step==='review')button(this._replaceId?'Confirm replacement':this._tavern?'Confirm free hire':'Confirm companion and enter camp',()=>{const result=this._replaceId?progression.replaceCreated(managerState(),this._replaceId,this._drafts[0],true):this._tavern?progression.recruitCreated(managerState(),this._drafts[0]):progression.createStartingParty(managerState(),this._drafts);if(!result.ok){error.textContent=result.message;return;}SceneManager.goto(Scene_RPGHome);},footer);
                else error.textContent='Choose a companion to replace. Nothing changes until final confirmation.';if(this._replaceId)error.textContent=`Current: ${findNpc(this._replaceId).name}. Confirm replacement removes them and returns their gear.`;
            }
            form.onkeydown=e=>{e.stopPropagation();if(e.target.tagName==='BUTTON'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();focusWizardDirection(form,e.key.slice(5).toLowerCase());}if(e.key==='Escape'){e.preventDefault();this.creatorBack();}};form.onkeyup=e=>e.stopPropagation();form.onsubmit=e=>e.preventDefault();this._nameForm=form;document.body.appendChild(form);Input.clear();const first=[...body.querySelectorAll('button,input')].find(el=>!el.disabled);first?.focus();
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
        update(){super.update();if(this.visible&&TouchInput.isTriggered()&&this._slotHandler){const p=this.worldTransform.applyInverse(new Point(TouchInput.x,TouchInput.y)),x=p.x-this.padding,y=p.y-this.padding,cx=this.innerWidth/2;for(const [slot,sx,sy] of [["head",cx-73,94],["body",8,168],["offHand",this.innerWidth-154,168],["accessory",cx-73,238]])if(x>=sx&&x<sx+146&&y>=sy&&y<sy+54){this._slotHandler(slot);break;}}}
        drawSlot(slot,x,y,w=146){
            const npc=this._npc,id=npc.equipmentSlots?.[slot],item=progression.SHOP[id],selected=this._slot===slot;
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
                { name: "Equipment", ext: "slots" }, { name: "Use supplies", ext: "supplies" }, {name:"Acquired powers",ext:"powers"}, {name:"Wounds and effects",ext:"wounds"}, { name: "Rename", ext: "rename" }, {name:"Dismiss",ext:"dismiss",enabled:!progression.dismissalError(state,npc.id)}
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
            this._info.line(trip ? `Locked: ${trip.questName} / ${trip.phase}` : progression.teamError(state, ids, team) || "Ready for dispatch.", 220, trip ? ColorManager.crisisColor() : ColorManager.powerUpColor(), 17);
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
            this._info.line(trip.questName, 42, factionColor(quest), 24);
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
                this._info.setLines(t ? [trip ? `Expedition ${t} is already active.` : `Expedition ${t} is open.`, trip?.questName || "Select this slot to form a party from the available roster.", trip ? "Its adventurers are unavailable to the other expedition until they return." : "Adventurers currently away will be shown but cannot be selected."] : ["Return to the Quest Board."]);
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
            for(const [slot,label] of [["head","♜ Head"],["body","▣ Body"],["offHand","⛨ Off-hand"],["accessory","✦ Accessory"],["supplies","Supplies"]]){
                const b=document.createElement("button");b.textContent=label;b.dataset.slot=slot;b.setAttribute("aria-pressed",String(slot===this._shopSlot));b.style.cssText=`font:bold ${14*scale}px Trebuchet MS;background:#354c80;color:#fff0ce;border:1px solid #c6ae65;border-radius:5px;cursor:pointer`;
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
            if(item)CozyUI.itemIcon(this._details,id,8,3,26);
            CozyUI.text(this._details,item.name,44,0,this._details.innerWidth-52,24,ColorManager.systemColor(),"left",32);
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
            this._header=this.header("ALTAR",`Arcana: ${managerState().arcana||0}`);
            this._details=this.panel(new Rectangle(332,108,Graphics.boxWidth-344,360));
            this._choices=new Window_RPGChoices(new Rectangle(12,108,308,416),()=>this.entries());
            this._choices.setHandler("ritual",this.choose.bind(this)); this._choices.setHandler("target",this.cast.bind(this));this._choices.setHandler("replace",this.chooseReplacement.bind(this));
            this._choices.setHandler("back",()=>this._mode==="ritual"?this.popScene():this.back()); this._choices.setHandler("cancel",()=>this._mode==="ritual"?this.popScene():this.back());
            this._choices.onSelectionChange=this.refreshDetails.bind(this);this.addWindow(this._choices);
            this._footer=this.footer(["Beat each ritual's own quest to unlock it. Arcana pays only for activation.","Pending effects cannot be stacked. Quest timers remain unchanged."]);this.refreshDetails();
        }
        entries(){
            const s=managerState();
            if(this._mode==="ritual")return [...progression.ritualEntries().map(([id,r])=>({name:`${r.name} / ${r.castCost} Arcana${s.ritualsUnlocked[id]?"":" / Locked"}`,symbol:"ritual",ext:id})),{name:"Back to Home",symbol:"back"}];
            if(this._mode==="replace")return [{name:"Cancel replacement",symbol:"back"},...progression.activeRoster(s).map(n=>({name:`Replace ${n.name}`,symbol:"replace",ext:n.id,enabled:!progression.isUnavailable(s,n.id)}))];
            const list=progression.RITUALS[this._ritual]?.target==="fallen"?progression.graveyard(s):progression.activeRoster(s);
            return [{name:"< Back to Altar",symbol:"back"},...list.map(n=>({name:`${n.name}${this._ritual==="healing_ritual"?` / ${n.permanentWounds.length} wounds`:this._ritual==="reanimate"&&(n.reanimated||n.reanimationExhausted)?" / Ineligible":""}`,symbol:"target",ext:n.id,enabled:(this._ritual!=="healing_ritual"||n.permanentWounds.length>0)&&(this._ritual!=="reanimate"||!n.reanimated&&!n.reanimationExhausted)}))];
        }
        choose(){const id=this._choices.currentExt(),s=managerState(),r=progression.RITUALS[id];if(!s.ritualsUnlocked[id]){this.showResult(progression.ritualUnlock(s,id));return;}if(!r.target){this.showResult(progression.ritualCast(s,id,null));return;}this._ritual=id;this._replaceId=null;this._mode=r.target==="fallen"&&!progression.vacantSlots(s).length?"replace":"target";this._choices.refresh();this._choices.select(0);this._choices.activate();this.refreshDetails();}
        chooseReplacement(){const id=this._choices.currentExt(),npc=findNpc(id),cancel=()=>{closeManagerDialog();this._choices.activate();};managerModal(`Replace ${npc.name}?`,[`${progression.classLabel(npc)} / Level ${npc.level}`,"All gear returns to inventory. The companion is removed only after the final resurrection confirmation."],[{name:"Choose fallen companion",run:()=>{closeManagerDialog();this._replaceId=id;this._mode="target";this._choices.refresh();this._choices.select(0);this._choices.activate();this.refreshDetails();}},{name:"Cancel",run:cancel}],cancel);}
        cast(){const s=managerState(),id=this._choices.currentExt(),ritual=this._ritual,r=progression.RITUALS[ritual];if(r.target!=="fallen"){this.showResult(progression.ritualCast(s,ritual,id));return;}const npc=findNpc(id),old=this._replaceId?findNpc(this._replaceId):null,cancel=()=>{closeManagerDialog();this._choices.activate();};managerModal("Confirm resurrection",[old?`Remove ${old.name} (${progression.classLabel(old)}, L${old.level}) and return all their gear.`:"Use the empty party slot.",ritual==="reanimate"?`Return ${npc.name} as a Skeleton ${progression.classFor(npc).name}, L${npc.level}; cannot level up.`:`Return ${npc.name} at 1 HP with an injury.`,`${npc.permanentWounds.length} wounds and acquired powers are preserved. Cost: ${r.castCost} Arcana.`],[{name:"Confirm resurrection",run:()=>{const result=progression.ritualCast(s,ritual,id,{replaceId:this._replaceId,confirmed:true});closeManagerDialog();this._mode="ritual";this.showResult(result);}},{name:"Cancel",run:cancel}],cancel);}
        back(){this._mode="ritual";this._ritual=null;this._choices.refresh();this._choices.select(0);this._choices.activate();this.refreshDetails();}
        showResult(result){result.ok?SoundManager.playOk():SoundManager.playBuzzer();this._header.setLines(["ALTAR",`Arcana: ${managerState().arcana||0}`]);this._choices.refresh();this._choices.activate();this._footer.setLines([result.message,"Every successful cast charges its per-use cost exactly once."]);this.refreshDetails();}
        refreshDetails(){
            this._details.contents.clear();const id=this._mode==="ritual"?this._choices.currentExt():this._ritual,r=progression.RITUALS[id];if(!r)return;
            const p=this._details,w=p.innerWidth,unlocked=managerState().ritualsUnlocked[id];p.line(r.name,0,CozyUI.colors.honey,24);
            CozyUI.text(p,`Activation: ${r.castCost} Arcana`,8,40,w-16,16,"#d6c6a6");
            p.badge(unlocked?"UNLOCKED":"LOCKED",8,78,124,unlocked?"#a6c797":"#c6b99d");
            CozyUI.wrap(p,`Unlock quest: ${r.questName} (Level ${r.level}). Win this quest; no unlock payment.`,16,112,w-32,16,"#e6d7b5",3,22);
            CozyUI.wrap(p,r.description,16,186,w-32,16,"#d7ccb2",5,22);
            if(managerState().ritualEffects?.[id])CozyUI.text(p,"PENDING / already activated",16,300,w-32,15,"#a6c797","left",22);
        }
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

    Window_TitleCommand.prototype.makeCommandList = function() {
        const hasSave = this.isContinueEnabled();
        this.addCommand("Continue", "continue", hasSave);
        this.addCommand("New Game", "newGame");
        this.addCommand("Load", "load", hasSave);
    };
    Window_TitleCommand.prototype.selectLast = function() {
        this.selectSymbol(this.isContinueEnabled() ? "continue" : "newGame");
    };
    const createTitleCommands = Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function() {
        createTitleCommands.call(this);
        this._commandWindow.setHandler("load", () => {
            this._commandWindow.close();
            SceneManager.push(Scene_Load);
        });
    };
    Scene_Title.prototype.commandContinue = async function() {
        const id = DataManager.latestSavefileId();
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
            this._loadError.setText("Could not continue the latest save.\nUse Load to choose another file.");
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
            this._actionsWindow.hide();
            this.executeLoad(this._selectedFileId);
        });
        this._actionsWindow.setHandler("delete", this.requestDelete.bind(this));
        this._actionsWindow.setHandler("cancel", this.closeFileActions.bind(this));
        this._actionsWindow.hide();
        this._actionsWindow.deactivate();
        this.addWindow(this._actionsWindow);
        this._deleteConfirm = new Window_RPGDeleteConfirm(new Rectangle((Graphics.boxWidth - 320) / 2, 250, 320, 116));
        this._deleteConfirm.setHandler("no", this.cancelDelete.bind(this));
        this._deleteConfirm.setHandler("cancel", this.cancelDelete.bind(this));
        this._deleteConfirm.setHandler("yes", this.deleteSelectedFile.bind(this));
        this._deleteConfirm.hide();
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
        this._actionsWindow.hide();
        this._actionsWindow.deactivate();
        this._listWindow.activate();
        this._helpWindow.setText(this.helpWindowText());
    };
    Scene_Load.prototype.requestDelete = function() {
        const id = this._selectedFileId;
        if (!DataManager.savefileInfo(id) || this._deleteBusy) return;
        this._deleteId = id;
        this._actionsWindow.hide();
        this._actionsWindow.deactivate();
        this._helpWindow.setText(`Delete File ${id}: are you sure?`);
        this._deleteConfirm.show();
        this._deleteConfirm.select(0);
        this._deleteConfirm.activate();
    };
    Scene_Load.prototype.cancelDelete = function() {
        this._deleteId = null;
        this._deleteConfirm.hide();
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
            this._deleteConfirm.hide();
            this._deleteId = null;
            this.closeFileActions();
            this._listWindow.refresh();
            this._helpWindow.setText(`File ${id} deleted. Select another file or go back.`);
        } catch (error) {
            this._deleteConfirm.hide();
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
    Scene_Title.prototype.commandNewGame = function() {
        DataManager.setupNewGame();
        progression.beginStartingRoster(managerState(),$dataRPGManagerRoster);
        this._commandWindow.close();
        this.fadeOutAll();
        SceneManager.goto(Scene_RPGStartingRoster);
    };
    window.RPGManager.uiComponents = Object.freeze({ Window_RPGLargePortrait, Window_RPGDialogue });
})();
