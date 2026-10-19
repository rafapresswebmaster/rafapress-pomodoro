/* Shared read-only focus display and optional NW.js window. No clock or settlement here. */
(() => {
    "use strict";
    const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
    const formatTime=ms=>{const s=Math.max(0,Math.ceil(finite(ms)/1000));return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;};
    function clockView(state={},quest={}){
        const trip=state.trips?.A,result=state.questResults;
        const totalMs=Math.max(0,finite(trip?.totalDurationMs,result?.plannedDurationMs||quest.durationMinutes*60000||0));
        const remainingMs=trip?Math.max(0,Math.min(totalMs,finite(trip.remainingMs))):result?0:totalMs;
        const phase=trip?(trip.autoRetreat?"auto_return":trip.phase==="return"?"return":"active"):result?(result.endKind==="early"?"ended":result.autoRetreat?"retreated":"complete"):"ready";
        return {sessionId:trip?.id||result?.questId||null,active:!!trip,remainingMs,totalMs,digital:formatTime(remainingMs),fraction:totalMs?remainingMs/totalMs:0,phase,
            label:{active:"Focusing",return:"Returning",auto_return:"Returning gently",complete:"Complete",ended:"Ended early",retreated:"Returned",ready:"Ready"}[phase],
            partyCount:trip?.preparedTeam?.filter(n=>n.alive!==false&&n.health>0).length??result?.members?.filter(n=>n.condition!=="Dead").length??0,
            name:trip?.questName||result?.questName||quest.name||"Choose a session"};
    }
    function clampPosition(position,areas,width=232,height=96){
        const screens=(areas||[]).filter(a=>a&&Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.width>0&&a.height>0);
        if(!screens.length)screens.push({x:0,y:0,width:816,height:624});
        const p=position&&Number.isFinite(position.x)&&Number.isFinite(position.y)?position:{x:screens[0].x+screens[0].width-width-24,y:screens[0].y+24};
        const distance=a=>Math.pow(Math.max(a.x-p.x,0,p.x+width-a.x-a.width),2)+Math.pow(Math.max(a.y-p.y,0,p.y+height-a.y-a.height),2);
        const area=screens.slice().sort((a,b)=>distance(a)-distance(b))[0];
        return {x:Math.round(Math.max(area.x,Math.min(p.x,area.x+Math.max(0,area.width-width)))),y:Math.round(Math.max(area.y,Math.min(p.y,area.y+Math.max(0,area.height-height))))};
    }
    const dialMarkup='<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="33" fill="#fff0c8" stroke="#cdb474" stroke-width="4"/><circle class="focus-ring" cx="40" cy="40" r="28" fill="none" stroke="#386baf" stroke-width="8" stroke-linecap="round" transform="rotate(-90 40 40)"/><path d="M40 9v7M71 40h-7M40 71v-7M9 40h7" stroke="#634c30" stroke-width="2"/><circle cx="40" cy="40" r="4" fill="#c58b38"/></svg>';
    function renderReadout(element,view){
        element.querySelector('.focus-time').textContent=view.digital;
        element.querySelector('.focus-state').textContent=view.label;
        element.querySelector('.focus-ring').setAttribute('stroke-dasharray',`${Math.max(0,Math.min(1,view.fraction))*176} 176`);
        element.dataset.phase=view.phase;element.dataset.remaining=String(view.remainingMs);element.dataset.session=view.sessionId||"";
    }
    class FloatingTimer {
        constructor(nwApi,doc=globalThis.document){this.nw=nwApi;this.doc=doc;this.widget=null;this.pending=false;this.generation=0;this.state=null;this.view=null;this.fallback=null;this.lastPayload=null;this.displayHandler=()=>this.reposition();this.screenReady=false;}
        areas(){try{if(this.nw?.Screen){if(!this.screenReady){this.nw.Screen.Init();this.screenReady=true;for(const e of ['displayAdded','displayRemoved','displayBoundsChanged'])this.nw.Screen.on(e,this.displayHandler);}return this.nw.Screen.screens.map(s=>s.work_area||s.bounds);}}catch(e){this.error(e);}return [{x:0,y:0,width:globalThis.innerWidth||816,height:globalThis.innerHeight||624}];}
        error(error){this.lastError=String(error?.message||error);}
        close(){this.generation++;this.pending=false;const w=this.widget;this.widget=null;this.lastPayload=null;if(w)try{w.close(true);}catch(e){this.error(e);}this.fallback?.remove();this.fallback=null;}
        reposition(){if(!this.state)return;const p=clampPosition(this.state.focusTimer?.position,this.areas());if(this.widget){try{this.widget.moveTo(p.x,p.y);}catch(e){this.error(e);}}else if(this.fallback){this.fallback.style.left=p.x+'px';this.fallback.style.top=p.y+'px';}this.state.focusTimer.position=p;}
        refresh(state,view,visible){
            if(state!==this.state){this.close();this.state=state;this.failedState=null;}this.view=view;
            if(!visible||!state?.focusTimer?.enabled){if(this.widget||this.pending||this.fallback)this.close();return;}
            if(this.nw?.Window){if(!this.widget&&!this.pending&&this.failedState!==state)this.openNative();if(this.widget)this.paintNative();}
            else {if(!this.fallback)this.openCompact();renderReadout(this.fallback,view);}
        }
        openNative(){
            this.pending=true;const generation=++this.generation,owner=this.state,p=clampPosition(owner.focusTimer.position,this.areas());
            try{this.nw.Window.open('js/focus_timer.html',{id:'rpg-manager-focus-timer',title:'RPG Manager Focus Timer',width:232,height:96,x:p.x,y:p.y,frame:false,resizable:false,show:true,focus:false,always_on_top:true,show_in_taskbar:false},win=>{
                if(generation!==this.generation||owner!==this.state||!owner.focusTimer.enabled){try{win.close(true);}catch(e){this.error(e);}return;}
                this.widget=win;this.pending=false;let loaded=false;
                try {
                win.on('loaded',()=>{if(generation!==this.generation)return;loaded=true;try{const ui=win.window?.FocusTimerWidget;if(!ui)throw Error('Floating timer display unavailable.');ui.hide=()=>{if(owner===this.state)owner.focusTimer.enabled=false;this.close();};win.setAlwaysOnTop(true);win.moveTo(p.x,p.y);this.lastError=null;this.paintNative();}catch(e){this.failNative(e);}});
                win.on('move',(x,y)=>{if(owner===this.state&&Number.isFinite(x)&&Number.isFinite(y))owner.focusTimer.position=clampPosition({x,y},this.areas());});
                win.on('close',()=>{if(owner===this.state)owner.focusTimer.enabled=false;this.close();});
                // A load failure is isolated; this timeout is not a session clock.
                setTimeout(()=>{if(!loaded&&generation===this.generation)this.failNative(new Error('Floating timer did not load. The in-game timer remains available.'));},8000);
                } catch(e) {this.failNative(e);}
            });}catch(e){this.failNative(e);}
        }
        failNative(e){this.error(e);this.failedState=this.state;this.close();}
        paintNative(){const payload=JSON.stringify(this.view);if(payload===this.lastPayload)return;try{const render=this.widget?.window?.FocusTimerWidget?.render;if(render){render(JSON.parse(payload));this.lastPayload=payload;}}catch(e){this.failNative(e);}}
        openCompact(){
            const el=this.doc.createElement('div');el.id='focus-compact';el.innerHTML=dialMarkup+'<div><strong class="focus-time"></strong><span class="focus-state"></span><small>Compact browser view</small></div><button type="button" aria-label="Hide compact timer">×</button>';
            el.style.cssText='position:fixed;z-index:41;width:232px;height:96px;box-sizing:border-box;display:flex;align-items:center;background:#243969;color:#fff0c8;border:2px solid #e5c374;border-radius:14px;font:16px sans-serif;cursor:move;touch-action:none;box-shadow:0 3px 14px #0008';el.querySelector('svg').style.cssText='width:76px;height:76px;flex:none';el.querySelector('strong').style.cssText='display:block;font:32px monospace';el.querySelector('span').style.cssText='display:block';el.querySelector('small').style.cssText='display:block;font-size:10px';el.querySelector('button').style.cssText='position:absolute;right:3px;top:2px;background:none;color:white;border:0;font-size:18px;cursor:pointer';
            el.querySelector('button').onclick=()=>{this.state.focusTimer.enabled=false;this.close();};let start;
            for(const event of ['mousedown','mouseup','touchstart','touchmove','touchend','wheel'])el.addEventListener(event,e=>e.stopPropagation());
            el.onpointerdown=e=>{if(e.target.closest('button'))return;start={x:e.clientX,y:e.clientY,left:el.offsetLeft,top:el.offsetTop};el.setPointerCapture(e.pointerId);};el.onpointermove=e=>{if(!start)return;this.state.focusTimer.position=clampPosition({x:start.left+e.clientX-start.x,y:start.top+e.clientY-start.y},this.areas());this.reposition();};el.onpointerup=()=>start=null;
            this.doc.body.appendChild(el);this.fallback=el;this.reposition();
        }
        destroy(){this.close();if(this.screenReady)for(const e of ['displayAdded','displayRemoved','displayBoundsChanged'])try{this.nw.Screen.removeListener(e,this.displayHandler);}catch(_){}this.state=null;}
    }
    const api={formatTime,clockView,clampPosition,dialMarkup,renderReadout,FloatingTimer};
    if(typeof module!=='undefined'&&module.exports)module.exports=api;
    if(typeof window!=='undefined')window.RPGManagerFocus=api;
})();
