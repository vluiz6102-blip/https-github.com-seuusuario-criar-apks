/* Jornada 90 Match Lifecycle Guard 1.0
 * Keeps a live match recoverable across app backgrounding/reload and
 * isolates the live-match scene from Manager navigation/overlays.
 * No animation loop is created here.
 */
(function(){
  'use strict';
  if(window.__J90_MATCH_LIFECYCLE__)return;
  window.__J90_MATCH_LIFECYCLE__=true;

  var MATCH_SAVE='carreirafc2';
  var runtimeOnly={
    _ctx:1,_dom:1,_resizeObserver:1,_pitch:1,_sprites:1,_j90px:1,
    _j90LastResize:1,_j90v3Frames:1,_j90v3RenderMsAvg:1,_j90v3Mode:1,
    _j90v3LastFrame:1,_j90AnimationProfile:1,_cw:1,_ch:1,_dpr:1,
    _fieldCache:1,_fieldCacheAI:1,_perfCounter:1,_lastTick:1,_simAcc:1,
    _simClock:1,_hudCounter:1,_hudLastScore:1,_hudLastHalf:1,
    _replayBusy:1,_replayStartedAt:1,_lastPassContext:1,_j90EventState:1
  };

  function getState(){try{return window.S&&S}catch(e){return null}}
  function match(){var s=getState();return s&&s.match2d?s.match2d:null}
  function safeSave(){
    var s=getState();if(!s)return false;
    try{
      if(typeof window.J90ManagerBridge?.save==='function'){window.J90ManagerBridge.save();return true}
      var clean=JSON.parse(JSON.stringify(s,function(k,v){
        if(runtimeOnly[k]||(/^_/.test(k)&&k!=='_savedAt'))return undefined;
        if(v&&typeof v==='object'){
          if(typeof Element!=='undefined'&&v instanceof Element)return undefined;
          if(typeof HTMLCanvasElement!=='undefined'&&v instanceof HTMLCanvasElement)return undefined;
        }
        return v;
      }));
      clean._savedAt=Date.now();
      localStorage.setItem(MATCH_SAVE,JSON.stringify(clean));
      return true;
    }catch(e){return false}
  }

  function pauseForBackground(){
    var m=match();if(!m||m.paused)return false;
    var now=Date.now(),started=Number(m.startedAt)||now;
    var elapsed=Math.max(0,Math.min(Number(m.duration)||120,(now-started)/1000));
    m.elapsed=elapsed;
    m.paused=true;
    m.__j90LifecyclePaused=true;
    safeSave();
    return true;
  }

  function resumeAfterForeground(){
    var m=match();if(!m||!m.__j90LifecyclePaused)return false;
    m.__j90LifecyclePaused=false;
    m.paused=false;
    m.startedAt=Date.now()-Math.max(0,Number(m.elapsed)||0)*1000;
    m._lastTick=performance.now();
    m._simAcc=0;
    try{
      if(typeof window.render==='function')window.render(1);
      if(typeof window.mgrMatchStartTimer==='function')setTimeout(window.mgrMatchStartTimer,40);
    }catch(e){}
    return true;
  }

  function syncScene(){
    var m=match(),body=document.body;
    if(!body)return;
    var live=!!m;
    body.classList.toggle('j90-live-match',live);
    var nav=document.getElementById('j90MgrRightNav');
    if(nav)nav.style.display=live?'none':'';
    var selectors=[
      '#j90MgrRightNav','.j90ManagerTabs','#j90-manager-head','#j90-manager-tabs',
      '.j90ManagerHead','.j90ManagerShell > header','#j90ComfortButton','#j90Expansion'
    ];
    selectors.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        if(live){
          if(el.dataset.j90MatchHidden!=='1'){
            el.dataset.j90MatchHidden='1';
            el.dataset.j90MatchPrevDisplay=el.style.display||'';
          }
          el.style.display='none';
          el.setAttribute('aria-hidden','true');
        }else if(el.dataset.j90MatchHidden==='1'){
          el.style.display=el.dataset.j90MatchPrevDisplay||'';
          delete el.dataset.j90MatchHidden;
          delete el.dataset.j90MatchPrevDisplay;
          el.removeAttribute('aria-hidden');
        }
      });
    });
  }

  function ensureRecoveredMatch(){
    var m=match();if(!m)return false;
    m.duration=Math.max(60,Math.min(120,Number(m.duration)||60));
    m.elapsed=Math.max(0,Math.min(m.duration,Number(m.elapsed)||0));
    m.half=(Number(m.half)===2)?2:1;
    m.homeScore=Math.max(0,Math.floor(Number(m.homeScore)||0));
    m.awayScore=Math.max(0,Math.floor(Number(m.awayScore)||0));
    m.players=Array.isArray(m.players)?m.players:[];
    m.oppPlayers=Array.isArray(m.oppPlayers)?m.oppPlayers:[];
    m.events=Array.isArray(m.events)?m.events.slice(0,8):[];
    m.ball=m.ball&&typeof m.ball==='object'?m.ball:{x:.5,y:.5,tx:.5,ty:.5};
    m.ball.x=Number.isFinite(+m.ball.x)?+m.ball.x:.5;
    m.ball.y=Number.isFinite(+m.ball.y)?+m.ball.y:.5;
    m.ball.tx=Number.isFinite(+m.ball.tx)?+m.ball.tx:m.ball.x;
    m.ball.ty=Number.isFinite(+m.ball.ty)?+m.ball.ty:m.ball.y;
    if(m.elapsed>=m.duration){
      if(m.half===1){m.half=2;m.elapsed=0;m.startedAt=Date.now();m.paused=true}
      else{if(typeof window.mgrMatchFinish==='function')window.mgrMatchFinish();return false}
    }
    if(!m.startedAt)m.startedAt=Date.now()-m.elapsed*1000;
    if(!m._simAcc)m._simAcc=0;
    if(!m._simClock)m._simClock=0;
    syncScene();
    if(document.visibilityState==='visible'&&!m.paused){
      try{if(typeof window.mgrMatchStartTimer==='function')setTimeout(window.mgrMatchStartTimer,80)}catch(e){}
    }
    return true;
  }

  function install(){
    syncScene();
    ensureRecoveredMatch();
  }

  addEventListener('visibilitychange',function(){
    if(document.hidden){pauseForBackground();syncScene();}
    else{resumeAfterForeground();ensureRecoveredMatch();syncScene();}
  },{passive:true});

  addEventListener('pagehide',function(){pauseForBackground();syncScene()},{passive:true});
  addEventListener('pageshow',function(){ensureRecoveredMatch();syncScene()},{passive:true});
  addEventListener('hashchange',syncScene,{passive:true});
  addEventListener('popstate',syncScene,{passive:true});

  if(window.MutationObserver){
    try{
      var mo=new MutationObserver(function(){syncScene()});
      mo.observe(document.documentElement,{childList:true,subtree:true});
    }catch(e){}
  }

  var oldRender=window.render;
  if(typeof oldRender==='function'&&!oldRender.__j90Lifecycle){
    var wrapped=function(){
      var out=oldRender.apply(this,arguments);
      try{syncScene();if(match())ensureRecoveredMatch()}catch(e){}
      return out;
    };
    wrapped.__j90Lifecycle=true;wrapped.__original=oldRender;
    window.render=wrapped;
    try{render=wrapped}catch(e){}
  }

  window.J90MatchLifecycle={
    version:'1.0',
    isLive:function(){return !!match()},
    pauseForBackground:pauseForBackground,
    resumeAfterForeground:resumeAfterForeground,
    ensureRecovered:ensureRecoveredMatch,
    save:safeSave,
    sync:syncScene
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
