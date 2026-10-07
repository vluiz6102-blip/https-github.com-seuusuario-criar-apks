/* Jornada 90 2D Match renderer 3.0
 * Lightweight pixel-art football presentation with action-aware animation.
 * Original procedural art inspired by top-down/3/4 RPG readability.
 * The simulation owns the single shared RAF. Renderer creates none.
 */
(function(){
  'use strict';
  if(window.J90Match2DV3&&window.J90Match2DV3.version==='3.0')return;

  var W=320,H=180,PW=24,PH=28;
  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
  var lerp=function(a,b,t){return a+(b-a)*t};
  function state(){
    try{if(typeof S!=='undefined'&&S)return S}catch(e){}
    try{return window.J90ManagerBridge&&window.J90ManagerBridge.getState?window.J90ManagerBridge.getState():null}catch(e){return null}
  }
  function hash(v){
    var s=String(v||'player'),h=2166136261>>>0;
    for(var i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;
    return h>>>0;
  }
  function colors(team){
    var n=String(team||'').toLowerCase();
    if(/real madrid/.test(n))return ['#f4f2ef','#8428b4','#dcc65c'];
    if(/barcelona|barça/.test(n))return ['#a50044','#17408b','#edbb00'];
    if(/psg|paris saint/.test(n))return ['#004170','#da291c','#f2f2f2'];
    if(/manchester city/.test(n))return ['#6cabdd','#173a63','#f2f2f2'];
    if(/liverpool/.test(n))return ['#c8102e','#f2f2f2','#00a398'];
    if(/arsenal/.test(n))return ['#db0007','#f2f2f2','#123a73'];
    if(/chelsea/.test(n))return ['#034694','#f2f2f2','#8cc7f0'];
    if(/sport/.test(n))return ['#27a75c','#f0d458','#133c28'];
    return ['#42b96b','#f1f3e7','#183d2a'];
  }
  function ensure(m){
    var c=document.getElementById('j90MatchCanvas');if(!m||!c)return null;
    if(!m._j90px){
      c.style.display='block';c.style.visibility='visible';c.style.opacity='1';
      c.style.width='100%';c.style.height='220px';c.style.minHeight='180px';
      c.style.imageRendering='pixelated';m._j90px=true;
    }
    if(c.width!==W||c.height!==H){
      c.width=W;c.height=H;
      m._ctx=c.getContext('2d',{alpha:false,desynchronized:true});
      m._pitch=null;m._sprites=Object.create(null);
    }else if(!m._ctx)m._ctx=c.getContext('2d',{alpha:false,desynchronized:true});
    if(m._ctx)m._ctx.imageSmoothingEnabled=false;
    m._cw=W;m._ch=H;m._dpr=1;m._dom=m._dom||{};m._dom.canvas=c;
    return c;
  }
  function fieldCache(m){
    if(m._pitch)return m._pitch;
    var o=document.createElement('canvas');o.width=W;o.height=H;
    var g=o.getContext('2d',{alpha:false});g.imageSmoothingEnabled=false;
    g.fillStyle='#151b18';g.fillRect(0,0,W,H);
    g.fillStyle='#28312c';g.fillRect(0,0,W,18);g.fillRect(0,162,W,18);
    for(var i=0;i<96;i++){
      var x=(i*53)%W,y=3+(i%4)*4;
      g.fillStyle=i%9===0?'#e3c864':(i%4===0?'#90a78f':'#64736b');
      g.fillRect(x,y,2+(i%3===0?1:0),2);
    }
    g.fillStyle='#3d9b5a';g.fillRect(9,19,302,142);
    for(var yy=0;yy<11;yy++)for(var xx=0;xx<20;xx++){
      g.fillStyle=((xx+yy)&1)?'#3a9557':'#43a35f';g.fillRect(9+xx*15,19+yy*13,15,13);
    }
    g.fillStyle='#347e4c';g.fillRect(9,19,302,4);g.fillRect(9,157,302,4);
    g.strokeStyle='#e5f1df';g.lineWidth=1;g.strokeRect(12,22,296,136);
    g.beginPath();g.moveTo(160,22);g.lineTo(160,158);g.stroke();
    g.beginPath();g.arc(160,90,18,0,Math.PI*2);g.stroke();
    g.fillStyle='#e5f1df';g.fillRect(158,88,4,4);
    function area(x,y,w,h){
      g.strokeRect(x,y,w,h);g.strokeRect(x+8,y+h*.22,w-16,h*.56);
      g.beginPath();g.arc(x+w/2,y+h/2,Math.min(w,h)*.11,0,Math.PI*2);g.stroke();
    }
    area(12,54,41,72);area(267,54,41,72);
    g.strokeRect(6,71,6,38);g.strokeRect(308,71,6,38);
    g.fillStyle='#cbdad0';
    for(i=0;i<9;i++){g.fillRect(20+i*35,26,3,3);g.fillRect(20+i*35,151,3,3)}
    g.fillStyle='#1c2621';g.fillRect(74,7,62,5);g.fillRect(184,167,62,5);
    g.fillStyle='#d8c15f';g.fillRect(77,8,15,2);g.fillRect(187,168,15,2);
    m._pitch=o;return o;
  }
  function direction(p,m){
    var vx=Number(p.vx)||0,vy=Number(p.vy)||0;
    if(p._j90PrevX!=null){
      vx+=Number(p.x||0)-p._j90PrevX;vy+=Number(p.y||0)-p._j90PrevY;
    }
    p._j90PrevX=Number(p.x)||0;p._j90PrevY=Number(p.y)||0;
    if(Math.abs(vx)+Math.abs(vy)<.0012){
      var goal=String(p.ai&&p.ai.lastAction||'');
      if(/through|run_in|shot|cross|progressive|switch|pass/.test(goal))vx=m&&m.possessionTeam==='away'?-1:1;
      else vx=p.id&&hash(p.id)%2?-1:1;
    }
    var a=Math.atan2(vy,vx),sector=Math.round((a/(Math.PI/4))+8)%8;
    return sector;
  }
  function animFor(p,m,now,low){
    var a=String(p.ai&&p.ai.lastAction||'').toLowerCase(),owner=m.possessionTeam==='home'&&m.possessionPlayerId===p.id||m.possessionTeam==='away'&&m.possessionPlayerId===p.id;
    if(/tackle/.test(a))return ['tackle',low?0:Math.floor(now/95)%4];
    if(/shot|cross|pass|through|switch|clearance|keeper_release|punch|one_two|cutback/.test(a))return ['kick',low?0:Math.floor(now/82)%5];
    if(/dribble/.test(a))return ['dribble',low?0:Math.floor(now/92)%6];
    var speed=Math.abs((Number(p.x)||0)-(Number(p.tx)||Number(p.x)))+Math.abs((Number(p.y)||0)-(Number(p.ty)||Number(p.y)));
    if(owner||speed>.002)return ['run',low?0:Math.floor(now/105)%4];
    return ['idle',low?0:Math.floor(now/480)%2];
  }
  function sprite(p,side,m,dir,action,frame){
    var id=String(p&&p.id||p&&p.name||'player'),number=String(p&&p.number!=null?p.number:'');
    var key=side+'|'+id+'|'+number+'|'+dir+'|'+action+'|'+frame;
    var cache=m._sprites||(m._sprites=Object.create(null));if(cache[key])return cache[key];
    var o=document.createElement('canvas');o.width=PW;o.height=PH;
    var g=o.getContext('2d',{alpha:true});g.imageSmoothingEnabled=false;
    var h=hash(id),pc=colors(side==='home'?m.home:m.away);
    var skin=['#74442f','#995a3a','#bf7952','#d99b73','#efb18b'][h%5];
    var hair=['#171717','#3a2318','#684027','#a86b35','#d8d8d8'][(h>>>4)%5];
    var gk=/GOL|GK|GOAL/i.test(String(p&&p.position||p&&p.role||''));
    var front=dir>=5&&dir<=7,back=dir<=2,diag=!(front||back);
    var sway=(frame%2)?1:0,run=action==='run',drib=action==='dribble',kick=action==='kick',tackle=action==='tackle';
    var leg=sway+(run||drib?frame%2:0);
    g.fillStyle='rgba(0,0,0,.30)';g.fillRect(4+(tackle?-1:0),24,16,2);
    if(tackle){
      g.fillStyle=pc[1];g.fillRect(3,15,18,6);g.fillStyle=pc[0];g.fillRect(5,10,13,8);
      g.fillStyle=skin;g.fillRect(0,15,4,4);g.fillRect(20,14,4,4);
      g.fillStyle='#171717';g.fillRect(4,21,7,3);g.fillRect(13,21,7,3);
    }else{
      var lx=4+(leg===1?2:0),rx=14-(leg===1?2:0);
      if(kick){lx=3+(frame%3),rx=14-(frame%2)}
      g.fillStyle='#171717';g.fillRect(lx,19,4,5);g.fillRect(rx,19,4,5);g.fillRect(lx-1,23,6,2);g.fillRect(rx-1,23,6,2);
      g.fillStyle=pc[1];g.fillRect(5,12,14,8);
      g.fillStyle=pc[0];g.fillRect(4,6,16,8);
      g.fillStyle=pc[2];g.fillRect(diag?7:6,8,10,2);
      if(gk){g.fillStyle='#f2c94c';g.fillRect(4,6,16,2);g.fillRect(4,14,2,6);g.fillRect(18,14,2,6)}
      var arm=run?(frame%2):0;
      g.fillStyle=skin;g.fillRect(1,10+(arm?2:0),3,7);g.fillRect(20,10+(arm?0:2),3,7);
      if(drib&&front){g.fillRect(0,15,3,4);g.fillRect(21,12,3,4)}
      if(kick){g.fillRect(0,11,3,6);g.fillRect(21,11,3,6)}
      g.fillStyle=skin;g.fillRect(7,0,10,7);
      if(back)g.fillStyle=hair;else g.fillStyle=skin;g.fillRect(7,0,10,7);
      g.fillStyle=hair;g.fillRect(6,0,12,4);
      if(front||diag){g.fillStyle='#fff';g.fillRect(9,4,2,1);g.fillRect(13,4,2,1)}
      if(front&&number){
        g.fillStyle='#fff';g.font='bold 5px monospace';g.textAlign='center';g.textBaseline='middle';g.fillText(number.slice(0,2),12,10);
      }
      if(tackle){g.fillStyle='#d9e3db';g.fillRect(7,9,10,2)}
    }
    if(action==='idle'&&frame===1){g.fillStyle='rgba(255,255,255,.20)';g.fillRect(9,1,2,1)}
    cache[key]=o;return o;
  }
  function drawPlayer(g,p,side,m,now,low){
    var x=Math.round(clamp(Number(p&&p.x)||.5,.025,.975)*W),y=Math.round(clamp(Number(p&&p.y)||.5,.05,.95)*H);
    var d=direction(p,m),af=animFor(p,m,now,low),img=sprite(p,side,m,d,af[0],af[1]),dx=x-12,dy=y-24;
    g.drawImage(img,dx,dy);
    var owner=m.possessionTeam===side&&m.possessionPlayerId===p.id;
    if(owner){
      g.fillStyle='#ffe38b';g.fillRect(dx+4,dy-4,16,2);g.fillRect(dx+2,dy-2,20,1);
      if(af[0]==='dribble'&&!low){g.fillStyle='#f3d878';g.fillRect(x-16,y-2,2,2)}
    }
    if(p.ai&&p.ai.heat>.86&&!low){g.fillStyle='rgba(255,240,185,.35)';g.fillRect(x+8,y-9,2,2)}
  }
  function drawBall(g,m,low,now){
    var x=Math.round(clamp(Number(m.ball&&m.ball.x)||.5,.02,.98)*W),y=Math.round(clamp(Number(m.ball&&m.ball.y)||.5,.03,.97)*H);
    if(m.ball&&m.ball.flight&&!low){
      g.fillStyle='rgba(255,255,255,.20)';
      var f=m.ball.flight;
      for(var i=1;i<=3;i++){
        var t=i/4,xx=Math.round(lerp(f.from[0],f.to[0],t)*W),yy=Math.round(lerp(f.from[1],f.to[1],t)*H);
        g.fillRect(xx-1,yy-1,2,2);
      }
    }
    g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x-3,y+3,7,2);
    g.fillStyle='#f8f7ee';g.fillRect(x-2,y-2,5,5);g.fillStyle='#222';g.fillRect(x-1,y-1,2,2);
  }
  function draw(){
    var st=state(),m=st&&st.match2d;if(!m)return;
    var c=ensure(m);if(!c||!m._ctx)return;
    var g=m._ctx,low=!!(window.__J90_PERF&&window.__J90_PERF.low),now=performance.now(),t0=now;
    g.imageSmoothingEnabled=false;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);g.drawImage(fieldCache(m),0,0);
    var home=m.players||[],away=m.oppPlayers||[];
    for(var i=0;i<home.length;i++)drawPlayer(g,home[i],'home',m,now,low);
    for(var j=0;j<away.length;j++)drawPlayer(g,away[j],'away',m,now,low);
    drawBall(g,m,low,now);
    var pulse=Math.floor(now/280)%4;
    if(!low){g.fillStyle='rgba(255,236,146,.48)';g.fillRect(18+pulse*72,19,2,2);g.fillRect(300-pulse*72,159,2,2)}
    m._j90v3Frames=(m._j90v3Frames||0)+1;
    var cost=performance.now()-t0;m._j90v3RenderMsAvg=m._j90v3RenderMsAvg?m._j90v3RenderMsAvg*.9+cost*.1:cost;m._j90v3Mode='pixel-topdown';m._j90v3LastFrame=now;
    m._j90AnimationProfile='action-aware-8dir';
  }
  function controls(){
    if(document.getElementById('j90V3MatchBar'))return;
    var c=document.getElementById('j90MatchCanvas');if(!c||!c.parentElement)return;
    var b=document.createElement('div');b.id='j90V3MatchBar';b.innerHTML='<div class="j90V3Live"><b>CAMPO 2D</b><span>PIXEL TOP-DOWN · IA + ANIMAÇÕES</span></div><div class="j90V3Hint">Corrida, drible, passe, chute, carrinho, bola longa e movimentos por função.</div>';
    c.parentElement.insertBefore(b,c);
    var s=document.createElement('style');s.id='j90-v3-style';s.textContent='.j90V3Live{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:5px 0 4px;padding:7px 9px;border:1px solid #28563c;border-radius:9px;background:#07130d;color:#f5f5f5;font:800 11px system-ui}.j90V3Live span{color:#7ee6a8;font-size:9px}.j90V3Hint{font:700 9px system-ui;color:#8fa99b;margin:0 2px 5px;line-height:1.35}.j90V3Hint+canvas{display:block;image-rendering:pixelated!important}';document.head.appendChild(s);
  }
  function invalidate(m){if(!m)return;m._pitch=null;m._sprites=Object.create(null);m._j90LastResize=performance.now()}
  function hook(){
    controls();
    if(typeof window.mgrDraw2D==='function'&&!window.mgrDraw2D.__j90pixel){
      var w=function(){draw()};w.__j90pixel=true;w.__original=window.mgrDraw2D;window.mgrDraw2D=w;
    }else if(typeof window.mgrDraw2D!=='function')window.mgrDraw2D=draw;
    var c=document.getElementById('j90MatchCanvas');
    if(c&&!c.__j90pixelResize){
      c.__j90pixelResize=true;
      if(window.ResizeObserver){
        var ro=new ResizeObserver(function(){var st=state(),m=st&&st.match2d;if(m){invalidate(m);ensure(m);draw()}});
        ro.observe(c);
      }
    }
  }
  var tries=0;
  function boot(){if(tries++<50){hook();if(!document.getElementById('j90MatchCanvas'))setTimeout(boot,120)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.J90Match2DV3={version:'3.0',mode:'pixel-topdown',animationProfile:'action-aware-8dir',draw:draw,ensure:ensure};
})();