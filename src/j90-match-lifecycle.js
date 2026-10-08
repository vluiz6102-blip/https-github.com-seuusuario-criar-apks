/* Jornada 90 Match Lifecycle Guard 2.0
 * Keeps live Manager matches recoverable across backgrounding/reload.
 * Runtime-only simulation fields are rebuilt instead of persisted.
 */
(function(){
  'use strict';
  if(window.__J90_MATCH_LIFECYCLE__)return;
  window.__J90_MATCH_LIFECYCLE__=true;

  var MATCH_SAVE='carreirafc2';
  var LIVE_SAVE='jornada90-live-match-v2';
  var runtimeOnly={
    _ctx:1,_dom:1,_resizeObserver:1,_pitch:1,_sprites:1,_j90px:1,
    _j90LastResize:1,_j90v3Frames:1,_j90v3RenderMsAvg:1,_j90v3Mode:1,
    _j90v3LastFrame:1,_j90AnimationProfile:1,_cw:1,_ch:1,_dpr:1,
    _fieldCache:1,_fieldCacheAI:1,_perfCounter:1,_lastTick:1,_simAcc:1,
    _simClock:1,_hudCounter:1,_hudLastScore:1,_hudLastHalf:1,
    _cameraX:1,_j90RenderSamples:1,_j90BroadcastReady:1,_j90CameraMode:1,
    _j90RenderError:1,_j90AutoLow:1,_j90EventState:1,_replayBusy:1,
    _replayStartedAt:1,_lastPassContext:1
  };

  function getState(){try{if(typeof S!=='undefined'&&S)return S}catch(e){}try{return window.S||null}catch(e){return null}}
  function match(){var s=getState();return s&&s.match2d?s.match2d:null}

  function strip(v){
    return JSON.parse(JSON.stringify(v,function(k,x){
      if(runtimeOnly[k]||(/^_/.test(k)&&k!=='_savedAt'))return undefined;
      if(x&&typeof x==='object'){
        if(typeof Element!=='undefined'&&x instanceof Element)return undefined;
        if(typeof HTMLCanvasElement!=='undefined'&&x instanceof HTMLCanvasElement)return undefined;
      }
      return x;
    }));
  }

  function saveLiveSnapshot(){
    var s=getState(),m=match();if(!s||!m)return false;
    try{
      var clean=strip(m);
      clean.__j90SnapshotVersion=2;
      clean.__j90SnapshotManagerClub=String(s.managerClub||'');
      clean.__j90SnapshotRound=Number(s.managerRound||0);
      clean.__j90SnapshotSavedAt=Date.now();
      clean.j90ResumeOnRestore=true;
      localStorage.setItem(LIVE_SAVE,JSON.stringify(clean));
      return true;
    }catch(e){return false}
  }
  function clearLiveSnapshot(){try{localStorage.removeItem(LIVE_SAVE);return true}catch(e){return false}}

  function restoreLiveSnapshot(){
    var s=getState();if(!s||!s.manager||s.match2d)return false;
    try{
      var raw=localStorage.getItem(LIVE_SAVE);if(!raw)return false;
      var snap=JSON.parse(raw);
      if(!snap||snap.__j90SnapshotVersion!==2)return false;
      if(String(snap.__j90SnapshotManagerClub||'')!==String(s.managerClub||''))return false;
      if(Number(snap.__j90SnapshotRound||-1)!==Number(s.managerRound||0))return false;
      var age=Date.now()-Number(snap.__j90SnapshotSavedAt||0);
      if(age<0||age>12*60*60*1000)return false;
      delete snap.__j90SnapshotVersion;delete snap.__j90SnapshotManagerClub;delete snap.__j90SnapshotRound;delete snap.__j90SnapshotSavedAt;
      snap.j90ResumeOnRestore=true;s.match2d=snap;return true;
    }catch(e){return false}
  }

  function safeSave(){
    var s=getState();if(!s)return false;
    var ok=false;
    try{if(typeof window.J90ManagerBridge?.save==='function'){window.J90ManagerBridge.save();ok=true}}catch(e){}
    try{var clean=strip(s);clean._savedAt=Date.now();localStorage.setItem(MATCH_SAVE,JSON.stringify(clean));ok=true}catch(e){}
    if(match())saveLiveSnapshot();
    return ok;
  }

  function fallbackBrain(team,players){
    var list=Array.isArray(players)?players:[],avg=list.length?list.reduce(function(n,p){return n+(Number(p&&p.ovr)||70)},0)/list.length:68;
    return {name:team||'Equipe',quality:Math.max(.35,Math.min(.96,avg/100)),attack:Math.max(.35,Math.min(.98,avg/100)),defense:Math.max(.35,Math.min(.98,avg/100)),press:.5,tempo:.5,risk:.4,adapt:.6,fatigue:.4};
  }
  function think(brain,diff,minute){
    if(typeof j90MatchThink==='function')return j90MatchThink(brain,diff,minute);
    var chase=diff<0?1:diff>0?-1:0,late=minute>70?1:0;
    return {tempo:Math.max(.2,Math.min(1,brain.tempo+chase*.12+late*chase*.12)),press:Math.max(.2,Math.min(1,brain.press+chase*.16)),risk:Math.max(.08,Math.min(1,brain.risk+chase*.2))};
  }

  function rebuildRuntime(m){
    var s=getState();if(!m||!s)return false;
    m.management=m.management&&typeof m.management==='object'?m.management:{talk:'direto',morale:0,subs:[],instruction:'balance'};
    m.players=Array.isArray(m.players)?m.players:[];m.oppPlayers=Array.isArray(m.oppPlayers)?m.oppPlayers:[];
    m.players.forEach(function(p){if(!Number.isFinite(+p.x))p.x=.5;if(!Number.isFinite(+p.y))p.y=.5;if(!Number.isFinite(+p.tx))p.tx=p.x;if(!Number.isFinite(+p.ty))p.ty=p.y});
    m.oppPlayers.forEach(function(p){if(!Number.isFinite(+p.x))p.x=.5;if(!Number.isFinite(+p.y))p.y=.5;if(!Number.isFinite(+p.tx))p.tx=p.x;if(!Number.isFinite(+p.ty))p.ty=p.y});
    if(!m._homeBrain){try{m._homeBrain=typeof j90TeamBrain==='function'?j90TeamBrain(m.home||s.managerClub,m.players,m.tactic||s.tactic):null}catch(e){m._homeBrain=null}}
    if(!m._awayBrain){try{m._awayBrain=typeof j90TeamBrain==='function'?j90TeamBrain(m.away||'Adversário',m.oppPlayers,'equilibrada'):null}catch(e){m._awayBrain=null}}
    if(!m._homeBrain)m._homeBrain=fallbackBrain(m.home||s.managerClub,m.players);
    if(!m._awayBrain)m._awayBrain=fallbackBrain(m.away||'Adversário',m.oppPlayers);
    if(!m._ai||!m._ai.home||!m._ai.away)m._ai={home:think(m._homeBrain,0,0),away:think(m._awayBrain,0,0)};
    if(!Number.isFinite(+m._simAcc))m._simAcc=0;
    if(!Number.isFinite(+m._simClock))m._simClock=Math.max(0,Number(m.elapsed)||0);
    if(!Number.isFinite(+m._lastTick))m._lastTick=performance.now();
    if(!m.cameraMode)m.cameraMode='tv';
    if(!m.possessionTeam)m.possessionTeam='home';
    if(!m.possessionPlayerId&&m.players[0])m.possessionPlayerId=m.players[0].id;
    return true;
  }

  function pauseForBackground(){
    var m=match();if(!m||m.paused)return false;
    var now=Date.now(),started=Number(m.startedAt)||now,elapsed=Math.max(0,Math.min(Number(m.duration)||120,(now-started)/1000));
    m.elapsed=elapsed;m.paused=true;m.__j90LifecyclePaused=true;m.j90ResumeOnRestore=true;
    rebuildRuntime(m);saveLiveSnapshot();safeSave();return true;
  }

  function resumeAfterForeground(){
    var m=match();if(!m||!m.__j90LifecyclePaused)return false;
    rebuildRuntime(m);m.__j90LifecyclePaused=false;m.paused=false;
    m.startedAt=Date.now()-Math.max(0,Number(m.elapsed)||0)*1000;m._lastTick=performance.now();m._simAcc=0;
    try{if(typeof window.render==='function')window.render(1)}catch(e){}
    try{if(typeof window.mgrMatchStartTimer==='function')setTimeout(window.mgrMatchStartTimer,60)}catch(e){}
    return true;
  }

  function syncScene(){
    var m=match(),body=document.body;if(!body)return;
    var live=!!m;body.classList.toggle('j90-live-match',live);
    if(live)body.classList.remove('j90-manager-nav-right');else if(window.S&&S&&S.manager)body.classList.add('j90-manager-nav-right');
    var nav=document.getElementById('j90MgrRightNav');if(nav)nav.style.display=live?'none':'';
    var selectors=['#j90MgrRightNav','.j90ManagerTabs','#j90-manager-head','#j90-manager-tabs','.j90ManagerHead','.j90ManagerShell > header','#j90ComfortButton','#j90Expansion'];
    selectors.forEach(function(sel){document.querySelectorAll(sel).forEach(function(el){
      if(live){
        if(el.dataset.j90MatchHidden!=='1'){el.dataset.j90MatchHidden='1';el.dataset.j90MatchPrevDisplay=el.style.display||''}
        if(el.style.display!=='none')el.style.display='none';if(el.getAttribute('aria-hidden')!=='true')el.setAttribute('aria-hidden','true');
      }else if(el.dataset.j90MatchHidden==='1'){
        el.style.display=el.dataset.j90MatchPrevDisplay||'';delete el.dataset.j90MatchHidden;delete el.dataset.j90MatchPrevDisplay;el.removeAttribute('aria-hidden');
      }
    })});
  }

  function ensureRecoveredMatch(){
    var s=getState();if(s&&!s.match2d)restoreLiveSnapshot();
    var m=match();if(!m)return false;
    m.duration=Math.max(60,Math.min(120,Number(m.duration)||60));m.elapsed=Math.max(0,Math.min(m.duration,Number(m.elapsed)||0));m.half=Number(m.half)===2?2:1;
    m.homeScore=Math.max(0,Math.floor(Number(m.homeScore)||0));m.awayScore=Math.max(0,Math.floor(Number(m.awayScore)||0));
    m.events=Array.isArray(m.events)?m.events.slice(0,8):[];
    m.ball=m.ball&&typeof m.ball==='object'?m.ball:{x:.5,y:.5,tx:.5,ty:.5};
    m.ball.x=Number.isFinite(+m.ball.x)?+m.ball.x:.5;m.ball.y=Number.isFinite(+m.ball.y)?+m.ball.y:.5;m.ball.tx=Number.isFinite(+m.ball.tx)?+m.ball.tx:m.ball.x;m.ball.ty=Number.isFinite(+m.ball.ty)?+m.ball.ty:m.ball.y;
    rebuildRuntime(m);
    var needsRender=false;
    if(m.j90ResumeOnRestore){delete m.j90ResumeOnRestore;m.paused=false;m.startedAt=Date.now()-m.elapsed*1000;m._lastTick=performance.now();m._simAcc=0;needsRender=true}
    if(m.elapsed>=m.duration){
      if(m.half===1){m.half=2;m.elapsed=0;m.startedAt=Date.now();m.paused=true}
      else{if(typeof window.mgrMatchFinish==='function')window.mgrMatchFinish();return false}
    }
    if(!m.startedAt)m.startedAt=Date.now()-m.elapsed*1000;
    if(m&&m.home&&m.away){try{if(typeof introStep!=='undefined'&&introStep===0){introStep=1;menuScreen='game';tab='game';needsRender=true}}catch(e){}}
    syncScene();
    if(needsRender)try{if(typeof window.render==='function')window.render(1)}catch(e){}
    if(document.visibilityState==='visible'&&!m.paused)try{if(typeof window.mgrMatchStartTimer==='function')setTimeout(window.mgrMatchStartTimer,80)}catch(e){}
    return true;
  }

  function install(){syncScene();ensureRecoveredMatch()}
  addEventListener('visibilitychange',function(){if(document.hidden){pauseForBackground();syncScene()}else{resumeAfterForeground();ensureRecoveredMatch();syncScene()}},{passive:true});
  addEventListener('pagehide',function(){pauseForBackground();syncScene()},{passive:true});
  addEventListener('pageshow',function(){ensureRecoveredMatch();syncScene()},{passive:true});
  addEventListener('hashchange',syncScene,{passive:true});addEventListener('popstate',syncScene,{passive:true});
  if(window.MutationObserver){try{var mo=new MutationObserver(function(){syncScene()});mo.observe(document.body,{childList:true})}catch(e){}}

  var oldRender=window.render;
  if(typeof oldRender==='function'&&!oldRender.__j90Lifecycle){
    var wrapped=function(){var out=oldRender.apply(this,arguments);try{syncScene()}catch(e){}return out};
    wrapped.__j90Lifecycle=true;wrapped.__original=oldRender;window.render=wrapped;try{render=wrapped}catch(e){}
  }

  window.J90MatchLifecycle={
    version:'2.0',
    isLive:function(){return !!match()},
    pauseForBackground:pauseForBackground,
    resumeAfterForeground:resumeAfterForeground,
    ensureRecovered:ensureRecoveredMatch,
    rebuildRuntime:rebuildRuntime,
    save:safeSave,
    saveLiveSnapshot:saveLiveSnapshot,
    clearLiveSnapshot:clearLiveSnapshot,
    sync:syncScene
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();