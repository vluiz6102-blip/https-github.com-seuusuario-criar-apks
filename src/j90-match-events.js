/* Jornada 90 Match Events 1.0
 * Referee, semi-automatic offside AI, discipline, injuries and stadium incidents.
 * Presentation-only event layer: it observes the existing match simulation and never
 * creates a second animation loop.
 */
(function(){
  'use strict';
  if(window.__J90_MATCH_EVENTS__) return;
  window.__J90_MATCH_EVENTS__=true;

  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
  var escLocal=function(v){
    return typeof esc==='function'?esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  };
  var role=function(p){return String(p&&p.position||p&&p.role||p&&p.aiRole||'').toUpperCase()};
  var players=function(m,side){return side==='home'?(m.players||[]):(m.oppPlayers||[])};
  var allPlayers=function(m){return (m.players||[]).concat(m.oppPlayers||[])};
  var rnd=function(m){
    m._j90EventSeed=(Math.imul(1664525,(m._j90EventSeed==null?((Date.now()/1000)|0):m._j90EventSeed)>>>0)+1013904223)>>>0;
    return (m._j90EventSeed>>>0)/4294967296;
  };
  function event(m,text,key,cd){
    if(!m||typeof mgrMatchEvent!=='function')return;
    m._j90EventCD=m._j90EventCD||{};
    var now=Number(m._simClock)||0,last=Number(m._j90EventCD[key])||-999;
    if(cd&&now-last<cd)return;
    m._j90EventCD[key]=now;
    mgrMatchEvent(text);
  }
  function find(m,side,id){return players(m,side).find(function(p){return p&&p.id===id})||null}
  function opponent(side){return side==='home'?'away':'home'}

  function ensure(m){
    if(!m)return;
    if(!m._j90EventState)m._j90EventState={
      processedActions:0,processedPassClock:-1,lastClock:-1,
      cards:{},injuries:{},offside:null,referee:{x:.5,y:.45},
      invader:null,flare:null,crowd:0,incidentUntil:0,lastInjuryClock:-999,
      nextCrowdPulse:0,lastScore:Number(m.homeScore||0)+':'+Number(m.awayScore||0),
      events:0
    };
    m._j90EventState.crowd=cl(Number(m._j90EventState.crowd)||0,0,1);
    m._j90EventState.referee=m._j90EventState.referee||{x:.5,y:.45};
  }

  function discipline(m,side,p,kind){
    if(!p)return;
    ensure(m);
    var id=String(p.id),s=m._j90EventState.cards;
    s[id]=s[id]||{yellow:0,red:0};
    if(s[id].red)return;
    if(kind==='second'){
      s[id].yellow=2;s[id].red=1;
      p.j90Red=true;p.j90Suspended=true;
      event(m,'🟥 Expulsão! '+escLocal(p.name||'Jogador')+' recebe o segundo amarelo.','red_'+id,0);
      m._j90EventState.crowd=1;
      return;
    }
    if(kind==='red'){
      s[id].red=1;p.j90Red=true;p.j90Suspended=true;
      event(m,'🟥 Cartão vermelho! '+escLocal(p.name||'Jogador')+' é expulso.','red_'+id,0);
      m._j90EventState.crowd=1;
      return;
    }
    if(s[id].yellow>=1){discipline(m,side,p,'second');return}
    s[id].yellow=1;p.j90Yellow=true;
    event(m,'🟨 Cartão amarelo para '+escLocal(p.name||'Jogador')+'.','yellow_'+id,0);
    m._j90EventState.crowd=.82;
  }

  function processActions(m){
    var st=m._j90EventState,h=m.actionHistory||[],start=Math.min(st.processedActions,h.length);
    for(var i=start;i<h.length;i++){
      var a=h[i]||{},side=a.team,p=find(m,side,a.player);
      if(!p)continue;
      if(a.action==='tackle'&&!a.success){
        var severity=rnd(m);
        if(severity<.055)discipline(m,side,p,'red');
        else if(severity<.32)discipline(m,side,p,'yellow');
        else event(m,'O árbitro marca falta no duelo de '+escLocal(p.name||'jogador')+'.','foul_'+Math.floor(Number(a.clock)||0),1.4);
      }
      if(a.action==='shot'&&a.success)m._j90EventState.crowd=cl(st.crowd+.25,0,1);
      if(a.action==='dribble'&&a.success&&rnd(m)<.12)st.crowd=cl(st.crowd+.18,0,1);
      if(a.action==='cross'&&a.success&&rnd(m)<.08)event(m,'O cruzamento encontra a área e a torcida cresce.','cross_crowd',2.5);
    }
    st.processedActions=h.length;
  }

  function defendersLine(m,side){
    return players(m,opponent(side)).filter(function(p){return role(p).indexOf('GK')<0});
  }

  function offsideCheck(m,ctx){
    if(!ctx||!ctx.receiver||!ctx.passer)return;
    var side=ctx.team,def=defendersLine(m,side),passerX=Number(ctx.passerX),receiverX=Number(ctx.receiverX);
    if(!Number.isFinite(passerX)||!Number.isFinite(receiverX)||def.length<2)return;
    var sorted=def.slice().sort(function(a,b){
      var ax=side==='home'?Number(a.x):1-Number(a.x),bx=side==='home'?Number(b.x):1-Number(b.x);
      return bx-ax;
    });
    var second=side==='home'?Number(sorted[1].x):1-Number(sorted[1].x);
    var atk=side==='home'?receiverX:1-receiverX;
    var passer=side==='home'?passerX:1-passerX;
    var margin=.018;
    var isAhead=atk>second+margin&&atk>passer+margin;
    if(!isAhead)return;
    var confidence=cl(.68+Math.abs(atk-second)*2.8+(ctx.kind==='through_ball'?.08:0),.70,.98);
    m._j90EventState.offside={
      active:true,team:side,player:ctx.receiver,confidence:confidence,
      until:(Number(m._simClock)||0)+2.8,clock:Number(ctx.clock)||0
    };
    event(m,'🚩 IA do árbitro: possível impedimento detectado ('+Math.round(confidence*100)+'%).','offside_'+Math.floor(Number(ctx.clock)||0),0);
    m._j90EventState.crowd=.9;
    if(m._j90EventState.offside){
      m._j90EventState.offside.confirmed=true;
      event(m,'🚩 Impedimento assinalado. O ataque é interrompido.','offside_confirm_'+Math.floor(Number(ctx.clock)||0),0);
    }
  }

  function injuryCheck(m){
    var st=m._j90EventState,now=Number(m._simClock)||0;
    if(now-st.lastInjuryClock<18)return;
    if(rnd(m)>.055)return;
    var pool=allPlayers(m).filter(function(p){
      return p&&!p.j90Red&&!st.injuries[String(p.id)]&&Number(p.energy||70)<48;
    });
    if(!pool.length)return;
    var p=pool[Math.floor(rnd(m)*pool.length)],sev=rnd(m);
    var type=sev<.58?'desconforto muscular':sev<.86?'torção leve':'lesão muscular';
    var recovery=sev<.58?2:sev<.86?5:12;
    st.injuries[String(p.id)]={name:p.name||'Jogador',type:type,recovery:recovery,clock:now};
    p.j90Injured=true;p.j90Injury=type;
    st.lastInjuryClock=now;
    event(m,'🚑 Lesão! '+escLocal(p.name||'Jogador')+' sente '+type+' e precisa de atendimento.','injury_'+p.id,0);
    st.crowd=1;
    if(typeof window.J90MatchEvents.onInjury==='function')window.J90MatchEvents.onInjury(m,p,recovery);
  }

  function pitchInvader(m){
    var st=m._j90EventState,now=Number(m._simClock)||0;
    if(st.invader&&now<st.invader.until)return;
    if(st.invader&&now>=st.invader.until)st.invader=null;
    if(now<28||rnd(m)>.006)return;
    st.invader={x:.18+rnd(m)*.64,y:.22+rnd(m)*.56,until:now+4.5};
    st.incidentUntil=now+4.5;st.crowd=1;
    event(m,'🚨 Invasão de campo! Um torcedor entra no gramado e os seguranças correm atrás.','pitch_invader',0);
  }

  function flare(m){
    var st=m._j90EventState,now=Number(m._simClock)||0;
    if(st.flare&&now<st.flare.until)return;
    if(st.flare&&now>=st.flare.until)st.flare=null;
    if(now<12||rnd(m)>.012)return;
    st.flare={side:rnd(m)<.5?'home':'away',until:now+6.5};
    st.crowd=1;
    event(m,'🔥 Sinalizadores acesos na arquibancada. A torcida aumenta o barulho.','flare',0);
  }

  function scorePulse(m){
    var st=m._j90EventState,score=Number(m.homeScore||0)+':'+Number(m.awayScore||0);
    if(score===st.lastScore)return;
    st.lastScore=score;st.crowd=1;
    event(m,'🏟️ O estádio explode após o gol!','goal_crowd',0);
  }

  function refereeFollow(m){
    var st=m._j90EventState,b=m.ball||{};
    st.referee.x=cl(Number(b.x||.5)+.035*(m.possessionTeam==='home'?-1:1),.08,.92);
    st.referee.y=cl(Number(b.y||.5)+.07,.08,.92);
  }

  function update(m){
    if(!m)return;
    ensure(m);
    var st=m._j90EventState,now=Number(m._simClock)||0;
    if(now===st.lastClock)return;
    st.lastClock=now;
    processActions(m);
    scorePulse(m);
    refereeFollow(m);
    if(now>=st.nextCrowdPulse){
      st.crowd=cl(st.crowd-.035,0,1);
      st.nextCrowdPulse=now+.55;
    }
    injuryCheck(m);
    pitchInvader(m);
    flare(m);
    if(m._lastPassContext&&Number(m._lastPassContext.clock)!==st.processedPassClock){
      st.processedPassClock=Number(m._lastPassContext.clock);
      offsideCheck(m,m._lastPassContext);
    }
    if(st.offside&&now>=st.offside.until)st.offside=null;
  }

  function drawReferee(g,m,w,h){
    var st=m._j90EventState;if(!st)return;
    var x=st.referee.x*w,y=st.referee.y*h,s=Math.max(1,Math.min(w,h)/300);
    g.save();g.translate(x,y);
    g.fillStyle='rgba(0,0,0,.32)';g.beginPath();g.ellipse(0,18*s,8*s,3*s,0,0,Math.PI*2);g.fill();
    g.strokeStyle='#e7b64a';g.lineWidth=3*s;g.beginPath();g.moveTo(-3*s,3*s);g.lineTo(-5*s,16*s);g.moveTo(3*s,3*s);g.lineTo(5*s,16*s);g.stroke();
    g.fillStyle='#111';g.fillRect(-7*s,-7*s,14*s,13*s);
    g.fillStyle='#f0b38f';g.beginPath();g.arc(0,-12*s,5*s,0,Math.PI*2);g.fill();
    g.fillStyle='#e7b64a';g.fillRect(-10*s,-4*s,3*s,3*s);
    g.fillRect(7*s,-4*s,3*s,3*s);
    g.restore();
  }

  function drawAssistant(g,x,y,s){
    g.save();g.translate(x,y);
    g.strokeStyle='#f0b34a';g.lineWidth=3*s;g.beginPath();g.moveTo(0,0);g.lineTo(0,-15*s);g.stroke();
    g.fillStyle='#ffdb58';g.fillRect(-4*s,-18*s,8*s,5*s);
    g.fillStyle='#111';g.beginPath();g.arc(0,5*s,3*s,0,Math.PI*2);g.fill();
    g.restore();
  }

  function drawCrowd(g,m,w,h){
    var st=m._j90EventState;if(!st)return;
    var level=cl(st.crowd,0,1);
    var n=Math.max(10,Math.floor(w/13));
    for(var i=0;i<n;i++){
      var side=i%2===0?'home':'away',x=(i+.5)*w/n,y=side==='home'?h*.06:h*.94;
      var bob=Math.sin((Number(m._simClock)||0)*3+i)*level*2;
      g.fillStyle=level>.72?'rgba(255,225,110,.72)':'rgba(230,230,230,.38)';
      g.beginPath();g.arc(x,y+bob,2.1,0,Math.PI*2);g.fill();
      if(level>.8&&i%4===0){g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-7);g.stroke()}
    }
  }

  function drawFlare(g,m,w,h){
    var f=m._j90EventState.flare;if(!f)return;
    var y=f.side==='home'?h*.09:h*.91;
    for(var i=0;i<5;i++){
      var x=w*(.28+i*.11),r=4+Math.sin((Number(m._simClock)||0)*7+i)*2;
      g.fillStyle='rgba(255,90,35,.18)';g.beginPath();g.arc(x,y,r*2.6,0,Math.PI*2);g.fill();
      g.fillStyle='#ff8b38';g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
    }
  }

  function drawInvader(g,m,w,h){
    var v=m._j90EventState.invader;if(!v)return;
    var x=v.x*w,y=v.y*h,t=Number(m._simClock)||0;
    g.save();
    g.strokeStyle='#f2c14e';g.lineWidth=2;
    g.beginPath();g.moveTo(x,y);g.lineTo(x+(Math.sin(t*8)*8),y+(Math.cos(t*7)*5));g.stroke();
    g.fillStyle='#f0b38f';g.beginPath();g.arc(x,y-10,5,0,Math.PI*2);g.fill();
    g.fillStyle='#222';g.fillRect(x-5,y-5,10,13);
    for(var i=0;i<2;i++){
      var sx=x-22+i*44,sy=y+12+Math.sin(t*7+i)*3;
      g.fillStyle='#17202b';g.fillRect(sx-4,sy-12,8,15);
      g.fillStyle='#e9b58d';g.beginPath();g.arc(sx,sy-16,4,0,Math.PI*2);g.fill();
    }
    g.restore();
  }

  function ensureOverlay(c){
    if(!c||!c.parentElement)return null;
    var o=document.getElementById('j90EventOverlayCanvas');
    if(!o){
      if(getComputedStyle(c.parentElement).position==='static')c.parentElement.style.position='relative';
      o=document.createElement('canvas');o.id='j90EventOverlayCanvas';
      o.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:8;';
      c.parentElement.appendChild(o);
    }
    var w=Math.max(1,c.clientWidth||320),h=Math.max(1,c.clientHeight||220),dpr=Math.min(2,window.devicePixelRatio||1);
    if(o.width!==Math.round(w*dpr)||o.height!==Math.round(h*dpr)){o.width=Math.round(w*dpr);o.height=Math.round(h*dpr)}
    o.style.width=w+'px';o.style.height=h+'px';
    return {canvas:o,ctx:o.getContext('2d'),w:w,h:h,dpr:dpr};
  }

  function renderOverlay(m){
    var c=document.getElementById('j90MatchCanvas'),box=ensureOverlay(c);
    if(!box||!box.ctx)return;
    var g=box.ctx,w=box.w,h=box.h,dpr=box.dpr;
    g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
    drawCrowd(g,m,w,h);drawOverlay(g,m,w,h);
  }

  function drawOverlay(g,m,w,h){
    var st=m._j90EventState;if(!st)return;
    var now=Number(m._simClock)||0;
    if(st.offside){
      g.save();g.fillStyle='rgba(8,15,12,.82)';g.fillRect(10,h-36,w-20,25);
      g.fillStyle='#ffd24d';g.font='900 11px system-ui';g.textAlign='center';
      g.fillText('🚩 IA SEMIAUTOMÁTICA • IMPEDIMENTO '+Math.round(st.offside.confidence*100)+'%',w/2,h-20);
      g.restore();
    }
    if(st.invader){
      g.save();g.fillStyle='rgba(120,20,20,.86)';g.fillRect(10,10,w-20,26);
      g.fillStyle='#fff';g.font='900 11px system-ui';g.textAlign='center';
      g.fillText('🚨 JOGO PARADO • SEGURANÇA EM CAMPO',w/2,28);g.restore();
    }
    if(st.flare){
      g.save();g.fillStyle='rgba(110,40,10,.55)';g.fillRect(10,10,w-20,26);
      g.fillStyle='#ffd27a';g.font='900 10px system-ui';g.textAlign='center';
      g.fillText('🔥 SINALIZADORES • TORCIDA EM ALTA',w/2,28);g.restore();
    }
    if(st.crowd>.82&&!st.invader&&!st.offside){
      g.save();g.fillStyle='rgba(255,213,71,.9)';g.font='900 9px system-ui';g.textAlign='center';
      g.fillText('TORCIDA: '+(st.crowd>.94?'MÁXIMO BARULHO':'GRITANDO'),w/2,12);g.restore();
    }
    drawInvader(g,m,w,h);drawFlare(g,m,w,h);drawReferee(g,m,w,h);
    drawAssistant(g,w*.035,h*.5,Math.max(1,w/390));drawAssistant(g,w*.965,h*.5,Math.max(1,w/390));
  }

  function hook(){
    if(typeof window.mgrDraw2D!=='function')return;
    if(window.mgrDraw2D.__j90Events)return;
    var old=window.mgrDraw2D;
    var wrapped=function(){
      var m=window.S&&S.match2d;
      if(m)update(m);
      old.apply(this,arguments);
      if(m)renderOverlay(m);
    };
    wrapped.__j90Events=true;wrapped.__original=old;
    window.mgrDraw2D=wrapped;
  }

  function boot(){
    hook();
    if(!window.mgrDraw2D)setTimeout(boot,120);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.J90MatchEvents={
    version:'1.0',
    state:function(){var m=window.S&&S.match2d;return m&&m._j90EventState||null;},
    onInjury:null
  };
})();
