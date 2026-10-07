/* Jornada 90 2D Match + AI presentation layer 1.0
 * Owns the final visible field renderer and mobile-safe match controls.
 * No extra RAF is created. It uses the existing shared match clock/tick.
 */
(function(){
  'use strict';
  if(window.__J90_MATCH2D_V3__) return;
  window.__J90_MATCH2D_V3__=true;

  var esc2=function(v){
    return typeof esc==='function'?esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  };
  var clamp2=function(v,a,b){return Math.max(a,Math.min(b,v))};

  function palette(name){
    try{
      if(window.J90AI2&&typeof J90AI2.palette==='function') return J90AI2.palette(name);
    }catch(e){}
    var n=String(name||'').toLowerCase();
    if(/real madrid/.test(n))return ['#f5f5f5','#7b1fa2','#c9b458'];
    if(/barcelona|barça/.test(n))return ['#a50044','#004d98','#edbb00'];
    if(/psg|paris saint/.test(n))return ['#004170','#da291c','#fff'];
    if(/manchester city/.test(n))return ['#6cabdd','#fff','#00285e'];
    if(/liverpool/.test(n))return ['#c8102e','#00a398','#fff'];
    if(/arsenal/.test(n))return ['#db0007','#fff','#023474'];
    if(/chelsea/.test(n))return ['#034694','#d1d3d4','#fff'];
    return ['#25a45b','#143d28','#fff'];
  }

  function ensureCanvas(m){
    if(!m)return null;
    var c=document.getElementById('j90MatchCanvas');
    if(!c)return null;
    c.style.display='block';
    c.style.visibility='visible';
    c.style.opacity='1';
    c.style.width='100%';
    c.style.height='220px';
    c.style.minHeight='180px';
    var w=Math.max(280,Math.floor(c.clientWidth||c.parentElement&&c.parentElement.clientWidth||320));
    var h=Math.max(180,Math.floor(c.clientHeight||220));
    var dpr=Math.min(2,window.devicePixelRatio||1);
    if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){
      c.width=Math.round(w*dpr);
      c.height=Math.round(h*dpr);
    }
    m._cw=w;m._ch=h;
    m._ctx=c.getContext('2d',{alpha:false});
    m._dpr=dpr;
    m._dom=m._dom||{};
    m._dom.canvas=c;
    return c;
  }

  function fieldCache(m,w,h){
    if(m._j90v3Field&&m._j90v3Field.width===w&&m._j90v3Field.height===h)return m._j90v3Field;
    var bg=document.createElement('canvas');
    bg.width=w;bg.height=h;
    var g=bg.getContext('2d');
    g.fillStyle='#0d4a2b';g.fillRect(0,0,w,h);
    for(var i=0;i<14;i++){
      g.fillStyle=i%2?'rgba(255,255,255,.020)':'rgba(0,0,0,.022)';
      g.fillRect(i*w/14,0,w/14,h);
    }
    g.strokeStyle='rgba(255,255,255,.72)';g.lineWidth=1.15;
    g.strokeRect(7,7,w-14,h-14);
    g.beginPath();g.moveTo(w/2,7);g.lineTo(w/2,h-7);g.stroke();
    g.beginPath();g.arc(w/2,h/2,Math.min(w,h)*.125,0,Math.PI*2);g.stroke();
    g.fillStyle='rgba(255,255,255,.72)';g.beginPath();g.arc(w/2,h/2,2,0,Math.PI*2);g.fill();
    function area(x,y,ww,hh){
      g.strokeRect(x,y,ww,hh);
      g.strokeRect(x+(ww*.22),y+hh*.25,ww*.56,hh*.5);
      g.beginPath();g.arc(x+ww*.5,y+hh*.5,Math.min(ww,hh)*.12,0,Math.PI*2);g.stroke();
    }
    g.lineWidth=1;
    area(7,h*.30,w*.18,h*.40);
    area(w*.82,h*.30,w*.18-7,h*.40);
    m._j90v3Field=bg;
    return bg;
  }

  function playerVisual(p,side,m){
    var pal=palette(side==='home'?m.home:m.away);
    var isGK=/GOL|GK|GOAL/i.test(String(p.position||p.role||''));
    return {pal:pal,isGK:isGK};
  }

  function drawPlayer(g,p,side,m,w,h,now,low){
    var v=playerVisual(p,side,m),pal=v.pal;
    var x=clamp2(Number(p.x)||.5,.02,.98)*w;
    var y=clamp2(Number(p.y)||.5,.04,.96)*h;
    var r=low?6.5:8.2;
    var active=(m.possessionTeam===side&&m.possessionPlayerId===p.id);
    g.save();
    if(active){
      g.globalAlpha=.18+.08*Math.sin(now/100);
      g.fillStyle=pal[0];g.beginPath();g.arc(x,y,r+8,0,Math.PI*2);g.fill();
      g.globalAlpha=1;g.strokeStyle='#fff';g.lineWidth=1.6;g.beginPath();g.arc(x,y,r+6,0,Math.PI*2);g.stroke();
    }
    g.fillStyle='rgba(0,0,0,.30)';g.beginPath();g.ellipse(x,y+r*.72,r*1.05,r*.35,0,0,Math.PI*2);g.fill();
    g.fillStyle=pal[0];g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
    g.strokeStyle=pal[2];g.lineWidth=1;g.stroke();
    if(!low){
      g.fillStyle=pal[1];g.beginPath();g.arc(x,y+2,r*.62,0,Math.PI*2);g.fill();
      g.fillStyle='#c9946d';g.beginPath();g.arc(x,y-2,r*.45,0,Math.PI*2);g.fill();
      g.fillStyle='#171717';g.beginPath();g.arc(x,y-5,r*.42,Math.PI,Math.PI*2);g.fill();
      if(v.isGK){g.strokeStyle='#ffd45b';g.lineWidth=1.5;g.beginPath();g.arc(x,y,r+2,0,Math.PI*2);g.stroke();}
      g.fillStyle='#fff';g.font='800 8px system-ui';g.textAlign='center';g.textBaseline='middle';
      g.strokeStyle='rgba(0,0,0,.9)';g.lineWidth=3;g.strokeText(String(p.number||''),x,y+1);g.fillText(String(p.number||''),x,y+1);
      var name=String(p.name||'Jogador').split(' ').slice(-1)[0].toUpperCase().slice(0,12);
      g.font='800 8px system-ui';g.lineWidth=3;g.strokeStyle='rgba(0,0,0,.92)';
      g.strokeText(name,x,y+r+10);g.fillText(name,x,y+r+10);
    }
    g.restore();
  }

  function drawBall(g,m,w,h,low){
    var owner=null;
    try{if(typeof getPlayer==='function'&&m.possessionPlayerId)owner=getPlayer(m,m.possessionTeam,m.possessionPlayerId)}catch(e){}
    var bx=(owner&&!m.ball.flight?owner.x+(m.possessionTeam==='home'?.016:-.016):m.ball.x);
    var by=(owner&&!m.ball.flight?owner.y-.012:m.ball.y);
    bx=clamp2(bx,.01,.99)*w;by=clamp2(by,.01,.99)*h;
    g.fillStyle='#fff';g.beginPath();g.arc(bx,by,low?3:4,0,Math.PI*2);g.fill();
    g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=1;g.stroke();
  }

  function draw2D(){
    var m=window.S&&S.match2d;
    if(!m)return;
    var c=ensureCanvas(m);
    if(!c||!m._ctx)return;
    var g=m._ctx,w=m._cw,h=m._ch,dpr=m._dpr||1;
    var low=!!(window.__J90_PERF&&window.__J90_PERF.low);
    g.setTransform(dpr,0,0,dpr,0,0);
    g.clearRect(0,0,w,h);
    g.drawImage(fieldCache(m,w,h),0,0,w,h);
    var now=performance.now();
    var camX=(.5-(Number(m.ball&&m.ball.x)||.5))*w*.08;
    var camY=(.5-(Number(m.ball&&m.ball.y)||.5))*h*.045;
    g.save();g.translate(camX,camY);
    var hp=m.players||[],ap=m.oppPlayers||[];
    for(var i=0;i<hp.length;i++)drawPlayer(g,hp[i],'home',m,w,h,now,low);
    for(var j=0;j<ap.length;j++)drawPlayer(g,ap[j],'away',m,w,h,now,low);
    drawBall(g,m,w,h,low);
    g.restore();
    // Always leave a visible state even before the simulation has advanced.
    if(!m.players.length&&!m.oppPlayers.length){
      g.fillStyle='rgba(0,0,0,.34)';g.fillRect(0,0,w,h);
      g.fillStyle='#fff';g.font='900 18px system-ui';g.textAlign='center';
      g.fillText('CAMPO 2D',w/2,h/2-8);
      g.font='700 11px system-ui';g.fillStyle='rgba(255,255,255,.75)';
      g.fillText('Preparando simulação de IA…',w/2,h/2+14);
    }
  }

  function controls(){
    if(document.getElementById('j90V3MatchBar'))return;
    var canvas=document.getElementById('j90MatchCanvas');
    if(!canvas||!canvas.parentElement)return;
    var bar=document.createElement('div');
    bar.id='j90V3MatchBar';
    bar.innerHTML='<div class="j90V3Live"><b>CAMPO 2D</b><span>IA ADAPTATIVA ATIVA</span></div><div class="j90V3Hint">Passe, pressão, drible, inversão, bola longa e comportamento por função.</div>';
    canvas.parentElement.insertBefore(bar,canvas);
    var s=document.createElement('style');s.id='j90-v3-style';
    s.textContent='.j90V3Live{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:5px 0 4px;padding:7px 9px;border:1px solid #28563c;border-radius:9px;background:#07130d;color:#f5f5f5;font:800 11px system-ui}.j90V3Live span{color:#5fe69a;font-size:9px}.j90V3Hint{font:700 9px system-ui;color:#8fa99b;margin:0 2px 5px;line-height:1.35}.j90V3Hint+canvas{display:block}';
    document.head.appendChild(s);
  }

  function hook(){
    controls();
    if(typeof window.mgrDraw2D==='function'&&!window.mgrDraw2D.__j90v3){
      var old=window.mgrDraw2D;
      var wrapped=function(){draw2D();};
      wrapped.__j90v3=true;wrapped.__original=old;
      window.mgrDraw2D=wrapped;
    }else if(typeof window.mgrDraw2D!=='function'){
      window.mgrDraw2D=draw2D;
    }
    var c=document.getElementById('j90MatchCanvas');
    if(c&&!c.__j90v3Resize){
      c.__j90v3Resize=true;
      if(window.ResizeObserver){
        var ro=new ResizeObserver(function(){var m=window.S&&S.match2d;if(m){m._j90v3Field=null;ensureCanvas(m);draw2D();}});
        ro.observe(c);
      }
      addEventListener('orientationchange',function(){setTimeout(function(){var m=window.S&&S.match2d;if(m){m._j90v3Field=null;ensureCanvas(m);draw2D();}},120)},{passive:true});
    }
  }

  var tries=0;
  function boot(){
    if(tries++<40){hook();if(!document.getElementById('j90MatchCanvas'))setTimeout(boot,150);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.J90Match2DV3={version:'1.0',draw:draw2D,ensure:ensureCanvas};
})();