/* Jornada 90 Manager Fusion Pack 1.0
 * Combines original integrations inspired by open football-manager projects:
 * - live 2D tactical intent presets
 * - deterministic/observable match telemetry concepts
 * - mobile-first match-center interaction
 * This file contains original Jornada 90 code and does not copy source code.
 */
(function(){
  'use strict';
  if(window.J90Fusion && window.J90Fusion.version==='1.0')return;

  var VERSION='1.0';
  var lastSecond=-1;
  var dock=null;
  var open=false;
  var lastPreset='equilibrado';

  function rootState(){
    try{return window.S||null}catch(e){return null}
  }
  function match(){
    var s=rootState();
    return s&&s.match2d?s.match2d:null;
  }
  function n(v,d){var x=Number(v);return Number.isFinite(x)?x:(d||0)}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function pct(v){return Math.round(clamp(n(v,0),0,1)*100)}
  function stat(m,k){return n(m&&m.stats&&m.stats[k],0)}
  function fmt(v){return Math.round(n(v,0)).toString()}

  function injectStyle(){
    if(document.getElementById('j90FusionStyle'))return;
    var s=document.createElement('style');
    s.id='j90FusionStyle';
    s.textContent=[
      '#j90FusionDock{position:fixed;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:1200;max-width:560px;margin:auto;pointer-events:none;font-family:system-ui,sans-serif}',
      '#j90FusionDock .j90FD{pointer-events:auto;background:rgba(8,8,8,.96);border:1px solid #303030;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.42);backdrop-filter:blur(10px);overflow:hidden}',
      '#j90FusionDock .j90FH{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 11px;border-bottom:1px solid #242424}',
      '#j90FusionDock .j90FH b{font-size:12px;color:#f5c84b;letter-spacing:.4px}',
      '#j90FusionDock .j90FH small{font-size:10px;color:#898989;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#j90FusionDock .j90FC{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:8px}',
      '#j90FusionDock button{min-width:0;min-height:42px;border:1px solid #303030;border-radius:10px;background:#111;color:#eee;font-size:11px;font-weight:700;padding:6px 4px;touch-action:manipulation}',
      '#j90FusionDock button:active{transform:scale(.98)}',
      '#j90FusionDock button.on{border-color:#f5c84b;background:#1a180f;color:#f5c84b}',
      '#j90FusionDock .j90FX{border-top:1px solid #242424;padding:9px 10px;display:none}',
      '#j90FusionDock.open .j90FX{display:block}',
      '#j90FusionDock .j90FG{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}',
      '#j90FusionDock .j90FS{padding:8px;border:1px solid #242424;border-radius:10px;background:#0d0d0d}',
      '#j90FusionDock .j90FS b{display:block;font-size:10px;color:#8f8f8f;font-weight:600}',
      '#j90FusionDock .j90FS strong{display:block;margin-top:2px;font-size:16px;color:#f4f4f4}',
      '#j90FusionDock .j90FM{margin-top:8px}',
      '#j90FusionDock .j90FMHead{display:flex;justify-content:space-between;font-size:10px;color:#8e8e8e;margin-bottom:4px}',
      '#j90FusionDock .j90FBar{height:7px;background:#1d1d1d;border-radius:99px;overflow:hidden}',
      '#j90FusionDock .j90FBar i{display:block;height:100%;width:0;background:#42d77d}',
      '#j90FusionDock .j90FTip{margin-top:7px;font-size:10px;line-height:1.35;color:#9a9a9a}',
      '@media(max-width:390px){#j90FusionDock{left:7px;right:7px}#j90FusionDock .j90FC{gap:4px;padding:6px}#j90FusionDock button{font-size:10px;min-height:40px}}'
    ].join('');
    document.head.appendChild(s);
  }

  function makeDock(){
    if(dock)return dock;
    injectStyle();
    dock=document.createElement('div');
    dock.id='j90FusionDock';
    dock.innerHTML=
      '<div class="j90FD">'+
        '<div class="j90FH"><b>J90 FUSION MATCH CENTER</b><small data-j90f-status>Motor 2D ativo</small></div>'+
        '<div class="j90FC">'+
          '<button type="button" data-j90f="equilibrado">Controle</button>'+
          '<button type="button" data-j90f="pressao-alta">Pressão</button>'+
          '<button type="button" data-j90f="contra-ataque">Transição</button>'+
          '<button type="button" data-j90f="bloco-baixo">Bloco</button>'+
          '<button type="button" data-j90f="camera">Câmera</button><button type="button" data-j90f="lab">Análise</button>'+
        '</div>'+
        '<div class="j90FX">'+
          '<div class="j90FG">'+
            '<div class="j90FS"><b>PLACAR</b><strong data-j90f-score>0 x 0</strong></div>'+
            '<div class="j90FS"><b>POSSE</b><strong data-j90f-pos>50% / 50%</strong></div>'+
            '<div class="j90FS"><b>FINALIZAÇÕES</b><strong data-j90f-shots>0 / 0</strong></div>'+
            '<div class="j90FS"><b>NO ALVO</b><strong data-j90f-target>0 / 0</strong></div>'+
            '<div class="j90FS"><b>PASSES</b><strong data-j90f-pass>0</strong></div>'+
            '<div class="j90FS"><b>DRIBLES</b><strong data-j90f-dribble>0</strong></div>'+
          '</div>'+
          '<div class="j90FM">'+
            '<div class="j90FMHead"><span>Pressão atual</span><span data-j90f-danger>50 / 50</span></div>'+
            '<div class="j90FBar"><i data-j90f-bar></i></div>'+
          '</div>'+
          '<div class="j90FTip" data-j90f-tip>Escolha um plano rápido. A tática é aplicada pelo Tactical Studio existente.</div>'+
        '</div>'+
      '</div>';
    document.body.appendChild(dock);

    dock.addEventListener('click',function(e){
      var btn=e.target.closest('button[data-j90f]');
      if(!btn)return;
      var action=btn.getAttribute('data-j90f');
      if(action==='camera'){
        try{
          if(typeof window.j90MatchCameraCycle==='function')window.j90MatchCameraCycle();
          else if(window.J90Match2DV3&&typeof window.J90Match2DV3.cycleCamera==='function')window.J90Match2DV3.cycleCamera();
        }catch(err){}
        return;
      }
      if(action==='lab'){
        open=!open;
        dock.classList.toggle('open',open);
        return;
      }
      applyPreset(action);
    });
    return dock;
  }

  function presetButtons(){
    if(!dock)return;
    var active=lastPreset;
    dock.querySelectorAll('button[data-j90f]').forEach(function(b){
      b.classList.toggle('on',b.getAttribute('data-j90f')===active);
    });
  }

  function applyPreset(key){
    var m=match();
    if(!m)return;
    try{
      if(window.J90TACT&&typeof window.J90TACT.apply==='function'){
        window.J90TACT.apply(key);
      }else{
        if(!m.tacticPlan)m.tacticPlan={};
        var p={
          'equilibrado':[50,52,55,54,'misto'],
          'pressao-alta':[74,94,66,88,'vertical'],
          'contra-ataque':[86,45,52,38,'vertical'],
          'bloco-baixo':[38,30,43,24,'direto']
        }[key];
        if(p){
          m.tacticPlan.tempo=p[0];
          m.tacticPlan.press=p[1];
          m.tacticPlan.width=p[2];
          m.tacticPlan.depth=p[3];
          m.tacticPlan.build=p[4];
          m.tacticPlan.preset='custom';
        }
      }
      m._j90FusionTactic=key;
      m._j90FusionTacticAt=n(m._simClock,0);
      lastPreset=key;
      presetButtons();
      update();
    }catch(err){
      if(window.J90BugGuard&&typeof window.J90BugGuard.record==='function'){
        try{window.J90BugGuard.record(err,'fusion-tactic')}catch(e){}
      }
    }
  }

  function update(){
    var m=match();
    if(!m){
      if(dock){dock.remove();dock=null;open=false}
      return;
    }
    var c=document.getElementById('j90MatchCanvas');
    if(!c){
      if(dock){dock.remove();dock=null;open=false}
      return;
    }
    if(!dock)makeDock();
    var sec=Math.floor(n(m._simClock,0));
    if(sec===lastSecond)return;
    lastSecond=sec;

    var h=n(m.homeScore,0),a=n(m.awayScore,0);
    var ph=stat(m,'possessionHome'),pa=stat(m,'possessionAway'),pt=ph+pa;
    var homePos=pt>0?ph/pt:.5;
    var dh=clamp(n(m.danger&&m.danger.home,.5),0,1);
    var da=clamp(n(m.danger&&m.danger.away,.5),0,1);
    var dangerTotal=dh+da;
    var homePressure=dangerTotal>0?dh/dangerTotal:.5;
    var teamStatus=String(m._j90FusionTactic||lastPreset||'equilibrado');
    var phase=m.action&&m.action.name?String(m.action.name):'jogo';
    var clock=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
    var s=dock.querySelector('[data-j90f-score]');if(s)s.textContent=fmt(h)+' x '+fmt(a);
    s=dock.querySelector('[data-j90f-pos]');if(s)s.textContent=Math.round(homePos*100)+'% / '+Math.round((1-homePos)*100)+'%';
    s=dock.querySelector('[data-j90f-shots]');if(s)s.textContent=fmt(stat(m,'shots'))+' total';
    s=dock.querySelector('[data-j90f-target]');if(s)s.textContent=fmt(stat(m,'shotsOnTarget'))+' total';
    s=dock.querySelector('[data-j90f-pass]');if(s)s.textContent=fmt(stat(m,'passes'));
    s=dock.querySelector('[data-j90f-dribble]');if(s)s.textContent=fmt(stat(m,'dribbles'));
    s=dock.querySelector('[data-j90f-danger]');if(s)s.textContent=Math.round(homePressure*100)+' / '+Math.round((1-homePressure)*100);
    s=dock.querySelector('[data-j90f-bar]');if(s)s.style.width=Math.round(homePressure*100)+'%';
    s=dock.querySelector('[data-j90f-status]');if(s)s.textContent=teamStatus+' • '+clock+' • '+phase.replace(/_/g,' ');
    s=dock.querySelector('[data-j90f-tip]');
    if(s){
      s.textContent='Plano ativo: '+String(teamStatus).replace(/-/g,' ')+' • posse '+Math.round(homePos*100)+'% • pressão '+Math.round(homePressure*100)+'%';
    }
    presetButtons();
  }

  function bind(){
    if(typeof window.mgrDraw2D!=='function'){
      setTimeout(bind,250);
      return;
    }
    if(window.mgrDraw2D.__j90Fusion)return;
    var old=window.mgrDraw2D;
    var wrapped=function(){
      var out=old.apply(this,arguments);
      try{update()}catch(e){}
      return out;
    };
    wrapped.__j90Fusion=true;
    wrapped.__original=old;
    window.mgrDraw2D=wrapped;
    try{mgrDraw2D=wrapped}catch(e){}
    update();
  }

  function boot(){
    bind();
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){bind()},{once:true});
  }

  window.J90Fusion={
    version:VERSION,
    apply:applyPreset,
    toggle:function(){if(!dock)makeDock();open=!open;dock.classList.toggle('open',open)},
    state:function(){var m=match();return m?{tactic:m._j90FusionTactic||lastPreset,clock:n(m._simClock,0)}:null}
  };

  boot();
})();