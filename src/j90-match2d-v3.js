/* Jornada 90 2D Match renderer 2.0
 * Lightweight top-down 3/4 pixel-art presentation.
 * Original procedural art, inspired by classic RPG readability.
 * The match simulation owns the single shared RAF. This renderer creates none.
 */
(function(){
  'use strict';
  if(window.J90Match2DV3&&window.J90Match2DV3.version==='2.0')return;

  var W=320,H=180,PW=20,PH=24;
  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
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
  function pitch(m){
    if(m._pitch)return m._pitch;
    var o=document.createElement('canvas');o.width=W;o.height=H;
    var g=o.getContext('2d',{alpha:false});g.imageSmoothingEnabled=false;
    g.fillStyle='#1b2420';g.fillRect(0,0,W,H);
    g.fillStyle='#2a342f';g.fillRect(0,0,W,19);g.fillRect(0,161,W,19);
    for(var i=0;i<68;i++){
      var x=(i*37)%W,y=5+(i%3)*4;
      g.fillStyle=i%5===0?'#e5c45f':(i%3===0?'#9abd86':'#68776f');
      g.fillRect(x,y,2,2);
    }
    g.fillStyle='#3f9d5d';g.fillRect(10,20,300,140);
    for(var yy=0;yy<10;yy++)for(var xx=0;xx<20;xx++){
      g.fillStyle=((xx+yy)&1)?'#3b9558':'#43a260';
      g.fillRect(10+xx*15,20+yy*14,15,14);
    }
    g.fillStyle='#347e4c';g.fillRect(10,20,300,4);g.fillRect(10,156,300,4);
    g.strokeStyle='#ddf1dc';g.lineWidth=1;g.strokeRect(13,23,294,134);
    g.beginPath();g.moveTo(160,23);g.lineTo(160,157);g.stroke();
    g.beginPath();g.arc(160,90,18,0,Math.PI*2);g.stroke();g.fillStyle='#ddf1dc';g.fillRect(158,88,4,4);
    function area(x,y,w,h){g.strokeRect(x,y,w,h);g.strokeRect(x+8,y+h*.22,w-16,h*.56);g.beginPath();g.arc(x+w/2,y+h/2,Math.min(w,h)*.11,0,Math.PI*2);g.stroke()}
    area(13,55,40,70);area(267,55,40,70);
    g.strokeRect(7,72,6,36);g.strokeRect(307,72,6,36);
    g.fillStyle='#d3dfd7';
    for(i=0;i<8;i++){g.fillRect(20+i*40,27,3,3);g.fillRect(20+i*40,150,3,3)}
    g.fillStyle='#1e2823';g.fillRect(80,8,58,5);g.fillRect(182,167,58,5);
    g.fillStyle='#d8c15f';g.fillRect(83,9,13,2);g.fillRect(185,168,13,2);
    m._pitch=o;return o;
  }
  function sprite(p,side,m,frame){
    var id=String(p&&p.id||p&&p.name||'player'),key=side+'|'+id+'|'+frame;
    var cache=m._sprites||(m._sprites=Object.create(null));if(cache[key])return cache[key];
    var o=document.createElement('canvas');o.width=PW;o.height=PH;
    var g=o.getContext('2d',{alpha:true});g.imageSmoothingEnabled=false;
    var h=hash(id),pc=colors(side==='home'?m.home:m.away);
    var skin=['#74442f','#995a3a','#bf7952','#d99b73','#efb18b'][h%5];
    var hair=['#171717','#3a2318','#684027','#a86b35','#d8d8d8'][(h>>>4)%5];
    var gk=/GOL|GK|GOAL/i.test(String(p&&p.position||p&&p.role||''));
    var step=frame?1:0;
    g.fillStyle='rgba(0,0,0,.24)';g.fillRect(4-step,21,12+step,2);
    g.fillStyle='#171717';g.fillRect(5-step,18,3,4);g.fillRect(12+step,18,3,4);g.fillRect(4-step,21,5,2);g.fillRect(11+step,21,5,2);
    g.fillStyle=pc[1];g.fillRect(5,13,10,6);
    g.fillStyle=pc[0];g.fillRect(4,7,12,7);g.fillStyle=pc[2];g.fillRect(7,8,6,2);
    if(gk){g.fillStyle='#f2c94c';g.fillRect(4,6,12,2);g.fillRect(5,13,2,5);g.fillRect(13,13,2,5)}
    g.fillStyle=skin;g.fillRect(2,9,2,6);g.fillRect(16,9,2,6);
    if(frame){g.fillRect(1,11,2,3);g.fillRect(17,11,2,3)}
    g.fillStyle=skin;g.fillRect(6,1,8,7);g.fillStyle=hair;g.fillRect(6,1,8,3);g.fillRect(5,3,2,3);g.fillRect(13,3,2,3);
    g.fillStyle='rgba(255,255,255,.45)';g.fillRect(10,4,2,1);
    g.fillStyle='#fff';g.fillRect(9,10,2,1);
    cache[key]=o;return o;
  }
  function drawPlayer(g,p,side,m,now,low){
    var x=Math.round(clamp(Number(p&&p.x)||.5,.02,.98)*W),y=Math.round(clamp(Number(p&&p.y)||.5,.04,.96)*H);
    var fr=low?0:Math.floor(now/170)%2,img=sprite(p,side,m,fr);
    var dx=x-10,dy=y-19;g.drawImage(img,dx,dy);
    if(m.possessionTeam===side&&m.possessionPlayerId===p.id){
      g.fillStyle='#ffe38b';g.fillRect(dx+4,dy-3,12,2);g.fillRect(dx+2,dy-1,16,1);
    }
  }
  function drawBall(g,m){
    var x=Math.round(clamp(Number(m.ball&&m.ball.x)||.5,.02,.98)*W),y=Math.round(clamp(Number(m.ball&&m.ball.y)||.5,.03,.97)*H);
    g.fillStyle='rgba(0,0,0,.32)';g.fillRect(x-3,y+2,6,2);g.fillStyle='#f8f7ee';g.fillRect(x-2,y-2,5,5);g.fillStyle='#222';g.fillRect(x-1,y-1,2,2);
  }
  function draw(){
    var st=state(),m=st&&st.match2d;if(!m)return;
    var c=ensure(m);if(!c||!m._ctx)return;
    var g=m._ctx,low=!!(window.__J90_PERF&&window.__J90_PERF.low),now=performance.now(),t0=now;
    g.imageSmoothingEnabled=false;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);g.drawImage(pitch(m),0,0);
    var home=m.players||[],away=m.oppPlayers||[];
    for(var i=0;i<home.length;i++)drawPlayer(g,home[i],'home',m,now,low);
    for(var j=0;j<away.length;j++)drawPlayer(g,away[j],'away',m,now,low);
    drawBall(g,m);
    var pulse=Math.floor(now/280)%4;g.fillStyle='rgba(255,236,146,.48)';g.fillRect(18+pulse*72,19,2,2);g.fillRect(300-pulse*72,159,2,2);
    m._j90v3Frames=(m._j90v3Frames||0)+1;
    var cost=performance.now()-t0;m._j90v3RenderMsAvg=m._j90v3RenderMsAvg?m._j90v3RenderMsAvg*.9+cost*.1:cost;m._j90v3Mode='pixel-topdown';m._j90v3LastFrame=now;
  }
  function controls(){
    if(document.getElementById('j90V3MatchBar'))return;
    var c=document.getElementById('j90MatchCanvas');if(!c||!c.parentElement)return;
    var b=document.createElement('div');b.id='j90V3MatchBar';b.innerHTML='<div class="j90V3Live"><b>CAMPO 2D</b><span>PIXEL TOP-DOWN · IA ATIVA</span></div><div class="j90V3Hint">Passe, pressão, drible, inversão, bola longa e movimentação por função.</div>';
    c.parentElement.insertBefore(b,c);
    var s=document.createElement('style');s.id='j90-v3-style';s.textContent='.j90V3Live{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:5px 0 4px;padding:7px 9px;border:1px solid #28563c;border-radius:9px;background:#07130d;color:#f5f5f5;font:800 11px system-ui}.j90V3Live span{color:#7ee6a8;font-size:9px}.j90V3Hint{font:700 9px system-ui;color:#8fa99b;margin:0 2px 5px;line-height:1.35}.j90V3Hint+canvas{display:block;image-rendering:pixelated!important}';document.head.appendChild(s);
  }
  function invalidate(m){if(!m)return;m._pitch=null;m._sprites=Object.create(null)}
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
  var tries=0;function boot(){if(tries++<50){hook();if(!document.getElementById('j90MatchCanvas'))setTimeout(boot,120)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.J90Match2DV3={version:'2.0',mode:'pixel-topdown',draw:draw,ensure:ensure};
})();