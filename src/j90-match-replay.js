/* Jornada 90 Replay Engine 1.0
 * Lightweight 2D replay: dangerous shots pause the match and use a goal-mouth camera.
 * Goals add a goal-mouth replay followed by a player-specific celebration.
 */
(function(){
  'use strict';
  if(window.__J90_REPLAY_ENGINE__) return;
  window.__J90_REPLAY_ENGINE__=true;

  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v));};
  var escR=function(v){return typeof esc==='function'?esc(v):String(v==null?'':v).replace(/[&<>]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;'})[c];});};

  var SPECIAL={
    'vini jr':'explosive sprint + arms wide',
    'vinicius junior':'explosive sprint + arms wide',
    'vini': 'explosive sprint + arms wide',
    'kylian mbappe':'arms crossed + pose',
    'mbappe':'arms crossed + pose',
    'cristiano ronaldo':'jump + turn + arms wide',
    'cristiano ronaldo dos santos aveiro':'jump + turn + arms wide',
    'neymar':'kneel + arms wide',
    'lamine yamal':'arms wide + calm walk',
    'yamal':'arms wide + calm walk',
    'jude bellingham':'arms wide + signature stance',
    'mohamed salah':'hands to ears',
    'cole palmer':'cold celebration',
    'erling haaland':'meditation pose',
    'rafael leao':'arms wide + slide',
    'rodrygo':'arms wide + knee slide',
    'gabriel martinelli':'knee slide + arms wide',
    'bukayo saka':'arms wide + smile',
    'richarlison':'dance celebration',
    'antony':'spin + dance',
    'raphinha':'arms wide + pointing',
    'gabriel jesus':'knee slide + prayer'
  };

  function key(n){return String(n||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,'').trim();}
  function celebration(p){
    var k=key(p&&p.name), direct=SPECIAL[k];
    if(direct)return direct;
    var styles=['arms wide','knee slide','point to badge','calm walk','jump + turn','hands to ears','slide + arms wide','fist pump'];
    var s=String(p&&p.celebration||p&&p.goalCelebration||'').trim();
    if(s)return s;
    var id=String(p&&p.id||k||'player'),h=0;
    for(var i=0;i<id.length;i++)h=(h*31+id.charCodeAt(i))>>>0;
    return styles[h%styles.length];
  }

  function shotKind(t){
    var s=String(t||'').toLowerCase();
    if(/goool|gol /.test(s))return 'goal';
    if(/defesa|defesaca|defesaça|goleiro/.test(s))return 'save';
    if(/trave|travessao|travessão/.test(s))return 'post';
    if(/fora|passa perto|perto/.test(s))return 'miss';
    return null;
  }

  function ensure(){
    if(document.getElementById('j90ReplayOverlay'))return document.getElementById('j90ReplayOverlay');
    var o=document.createElement('div');
    o.id='j90ReplayOverlay';
    o.innerHTML='<div class="j90ReplayTop"><b id="j90ReplayTitle">REPLAY</b><span id="j90ReplaySub">CÂMERA DENTRO DO GOL</span></div><canvas id="j90ReplayCanvas"></canvas><div class="j90ReplayBottom"><b id="j90ReplayText">Finalização perigosa</b><span id="j90ReplayHint">A partida está pausada durante o replay.</span></div>';
    var st=document.createElement('style');
    st.id='j90-replay-style';
    st.textContent='.j90ReplayOverlay{position:fixed;inset:0;z-index:99999;display:none;background:#050607;color:#fff;font-family:system-ui,sans-serif}.j90ReplayOverlay.on{display:block}.j90ReplayTop{position:absolute;z-index:2;top:0;left:0;right:0;padding:14px 16px;display:flex;justify-content:space-between;gap:12px;background:linear-gradient(#050607dd,transparent);font-size:12px}.j90ReplayTop span{font-size:9px;color:#aab5ae}.j90ReplayOverlay canvas{display:block;width:100%;height:100%}.j90ReplayBottom{position:absolute;z-index:2;left:12px;right:12px;bottom:14px;padding:11px 13px;border:1px solid #ffffff20;border-radius:12px;background:#07100bdd;backdrop-filter:blur(5px)}.j90ReplayBottom b{display:block;font-size:14px}.j90ReplayBottom span{display:block;margin-top:3px;color:#9aa79f;font-size:10px}.j90ReplayGoal{font-size:16px!important;color:#ffd45b}.j90ReplayCelebration{font-size:15px!important;color:#7ff0a9}';
    document.head.appendChild(st);document.body.appendChild(o);return o;
  }

  function drawShot(ctx,w,h,t,kind,side,player){
    var progress=clamp(t/1.65,0,1),goalSide=side==='home'?1:0;
    ctx.clearRect(0,0,w,h);
    var grd=ctx.createLinearGradient(0,0,0,h);grd.addColorStop(0,'#17211e');grd.addColorStop(.58,'#0b321f');grd.addColorStop(1,'#07110c');ctx.fillStyle=grd;ctx.fillRect(0,0,w,h);
    var cx=w*.5, top=h*.17, bottom=h*.82, gw=w*.64, gh=bottom-top;
    ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=Math.max(2,w/220);
    ctx.strokeRect(cx-gw/2,top,gw,gh);
    for(var i=1;i<7;i++){ctx.strokeStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.moveTo(cx-gw/2+i*gw/7,top);ctx.lineTo(cx-gw/2+i*gw/7,bottom);ctx.stroke();}
    for(var j=1;j<5;j++){ctx.beginPath();ctx.moveTo(cx-gw/2,top+j*gh/5);ctx.lineTo(cx+gw/2,top+j*gh/5);ctx.stroke();}
    var sx=side==='home'?w*.15:w*.85, sy=h*.64;
    var ex=cx+(side==='home'?-1:1)*w*.09, ey=top+h*.2;
    if(kind==='post')ex=cx+(progress>.65?(side==='home'?-gw*.52:gw*.52):0);
    if(kind==='miss')ex=cx+(side==='home'?-gw*.46:gw*.46),ey=top-h*.06;
    if(kind==='save')ex=cx+(side==='home'?-w*.17:w*.17),ey=top+h*.27;
    var bx=sx+(ex-sx)*progress,by=sy+(ey-sy)*progress;
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx,by,Math.max(4,w/105),0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo(w*.5,h*.34,ex,ey);ctx.stroke();
    if(kind==='save'){
      ctx.fillStyle='#d7b07a';ctx.beginPath();ctx.arc(ex,ey,Math.max(13,w/30),0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#ffd45b';ctx.lineWidth=4;ctx.beginPath();ctx.arc(ex,ey,Math.max(20,w/24),.25,5.7);ctx.stroke();
    }
    if(kind==='goal'&&progress>.72){ctx.fillStyle='rgba(255,212,91,.14)';ctx.beginPath();ctx.arc(ex,ey,Math.max(30,w/9),0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#fff';ctx.font='800 '+Math.max(11,w/45)+'px system-ui';ctx.textAlign='center';ctx.fillText(kind==='goal'?'GOOOL!':kind==='save'?'DEFESA!':kind==='post'?'NA TRAVE!':'PARA FORA',w/2,h*.92);
  }

  function drawCelebration(ctx,w,h,t,player,side){
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#0b2417';ctx.fillRect(0,0,w,h);
    var cx=w*.5, cy=h*.54, bob=Math.sin(t*8)*5;
    ctx.fillStyle=side==='home'?'#e6b33f':'#e8e8e8';ctx.beginPath();ctx.arc(cx,cy+bob,Math.max(22,w/16),0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#c9946d';ctx.beginPath();ctx.arc(cx,cy-32+bob,Math.max(13,w/28),0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#171717';ctx.fillRect(cx-13,cy-47+bob,26,9);
    var s=celebration(player);
    ctx.fillStyle='#fff';ctx.font='900 '+Math.max(13,w/30)+'px system-ui';ctx.textAlign='center';ctx.fillText('⚽ '+s.toUpperCase(),cx,h*.83);
    ctx.font='700 '+Math.max(10,w/50)+'px system-ui';ctx.fillStyle='#aab5ae';ctx.fillText(String(player&&player.name||'Artilheiro'),cx,h*.89);
  }

  function play(ev){
    var m=window.S&&S.match2d;if(!m)return;
    var kind=shotKind(ev&&ev.t);if(!kind)return;
    if(m._replayBusy)return;
    m._replayBusy=true;m.paused=true;m._replayStartedAt=performance.now();m._replayResumeElapsed=Number(m.elapsed)||0;
    var o=ensure(),c=document.getElementById('j90ReplayCanvas'),ctx=c.getContext('2d');
    o.classList.add('on');
    var home=/home|seu|marca/i.test(String(ev.t||''))&&!/adversario/i.test(String(ev.t||''));
    var side=home?'home':'away';
    var player=null;
    var arr=side==='home'?m.players:m.oppPlayers;
    if(arr&&arr.length)player=arr.reduce(function(a,b){return (Number(b.ovr)||0)>(Number(a&&a.ovr)||0)?b:a},arr[0]);
    document.getElementById('j90ReplayTitle').textContent=kind==='goal'?'GOL':'REPLAY';
    document.getElementById('j90ReplaySub').textContent='CÂMERA DENTRO DO GOL';
    document.getElementById('j90ReplayText').textContent=kind==='goal'?'GOOOL! '+String(player&&player.name||'Finalização'):'Finalização perigosa';
    document.getElementById('j90ReplayText').className=kind==='goal'?'j90ReplayGoal':'';
    document.getElementById('j90ReplayHint').textContent='Partida pausada · '+(kind==='goal'?'replay → comemoração':'replay da finalização');
    var start=performance.now(),phase1=kind==='goal'?1.8:1.55,phase2=kind==='goal'?2.35:0;
    function frame(now){
      if(!o.classList.contains('on'))return;
      var t=(now-start)/1000;
      var w=c.clientWidth||innerWidth||360,h=c.clientHeight||innerHeight||640,dpr=Math.min(2,devicePixelRatio||1);
      if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}
      ctx.setTransform(dpr,0,0,dpr,0,0);
      if(t<phase1)drawShot(ctx,w,h,t,kind,side,player);
      else if(kind==='goal'){drawCelebration(ctx,w,h,t-phase1,player,side);}
      else {close();}
      if(t<phase1+phase2||kind!=='goal')requestAnimationFrame(frame);
      else setTimeout(close,100);
    }
    requestAnimationFrame(frame);
  }

  function close(){
    var m=window.S&&S.match2d,o=document.getElementById('j90ReplayOverlay');
    if(o)o.classList.remove('on');
    if(!m)return;
    var resumeElapsed=Number(m._replayResumeElapsed);if(!Number.isFinite(resumeElapsed))resumeElapsed=Number(m.elapsed)||0;delete m._replayResumeElapsed;m._replayBusy=false;m.paused=false;m.elapsed=resumeElapsed;m.startedAt=Date.now()-resumeElapsed*1000;m._lastTick=performance.now();m._simAcc=0;
    try{if(typeof render==='function')render(1)}catch(e){}
  }

  function hook(){
    if(typeof window.mgrMatchEvent!=='function'||window.mgrMatchEvent.__j90Replay)return false;
    if(window.mgrMatchEvent.__j90ReplayWrapped)return true;
    var old=window.mgrMatchEvent;
    var wrapped=function(t){
      old.apply(this,arguments);
      try{play({t:String(t||''),at:window.S&&S.match2d?S.match2d.elapsed:0});}catch(e){}
    };
    wrapped.__j90Replay=true;wrapped.__j90ReplayWrapped=true;wrapped.__original=old;
    window.mgrMatchEvent=wrapped;try{mgrMatchEvent=wrapped}catch(e){}return true;
  }

  var n=0;(function retry(){if(!hook()&&n++<80)setTimeout(retry,100);})();
  window.J90Replay={play:play,celebration:celebration,version:'1.0'};
})();