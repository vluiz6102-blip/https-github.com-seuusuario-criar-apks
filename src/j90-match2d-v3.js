/* Jornada 90 Match 2D renderer 4.0
 * Broadcast-TV presentation for the manager match.
 * Canvas 2D only, no renderer-owned RAF.
 * The shared application loop owns simulation + presentation.
 */
(function(){
  'use strict';
  if(window.J90Match2DV3&&window.J90Match2DV3.version==='4.0')return;

  var W=960,H=540;
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
    if(/real madrid/.test(n))return ['#f4f2ef','#b7a26d','#1b3c76'];
    if(/barcelona|barça/.test(n))return ['#a50044','#17408b','#edbb00'];
    if(/psg|paris saint/.test(n))return ['#004170','#da291c','#f2f2f2'];
    if(/manchester city/.test(n))return ['#6cabdd','#173a63','#f2f2f2'];
    if(/liverpool/.test(n))return ['#c8102e','#f2f2f2','#00a398'];
    if(/arsenal/.test(n))return ['#db0007','#f2f2f2','#123a73'];
    if(/chelsea/.test(n))return ['#034694','#f2f2f2','#8cc7f0'];
    if(/sport/.test(n))return ['#27a75c','#f0d458','#133c28'];
    var h=hash(n);
    var palettes=[['#2f7edb','#f2f4f5','#15385e'],['#e05252','#f4f4f4','#5e1d1d'],['#38a56a','#f3f1dd','#16492f'],['#8d5bd1','#f4f0ff','#39255d'],['#e58b32','#f4f0e6','#6a3d14']];
    return palettes[h%palettes.length];
  }
  function ensure(m){
    var c=document.getElementById('j90MatchCanvas');if(!m||!c)return null;
    c.style.display='block';c.style.visibility='visible';c.style.opacity='1';
    c.style.width='100%';c.style.height='100%';c.style.minHeight='0';
    c.style.imageRendering='auto';
    if(c.width!==W||c.height!==H||!m._ctx){
      c.width=W;c.height=H;
      try{m._ctx=c.getContext('2d',{alpha:false,desynchronized:true})||c.getContext('2d',{alpha:false})||c.getContext('2d')}catch(e){try{m._ctx=c.getContext('2d')}catch(_){m._ctx=null}}
    }
    if(m._ctx)m._ctx.imageSmoothingEnabled=true;
    m._cw=W;m._ch=H;m._dpr=1;
    m._dom=m._dom||{};m._dom.canvas=c;
    if(!m.cameraMode)m.cameraMode='tv';
    return c;
  }

  function fieldCache(m){
    if(m._pitch)return m._pitch;
    var o=document.createElement('canvas');o.width=W;o.height=H;
    var g=o.getContext('2d',{alpha:false});g.imageSmoothingEnabled=true;

    g.fillStyle='#071017';g.fillRect(0,0,W,H);
    var sky=g.createLinearGradient(0,0,0,220);
    sky.addColorStop(0,'#07121b');sky.addColorStop(.52,'#10222a');sky.addColorStop(1,'#29443c');
    g.fillStyle=sky;g.fillRect(0,0,W,245);

    g.fillStyle='#05080a';g.beginPath();g.moveTo(0,30);g.quadraticCurveTo(480,-35,960,30);g.lineTo(960,115);g.quadraticCurveTo(480,72,0,115);g.closePath();g.fill();
    g.fillStyle='#10181c';g.beginPath();g.moveTo(0,74);g.quadraticCurveTo(480,10,960,74);g.lineTo(960,240);g.quadraticCurveTo(480,190,0,240);g.closePath();g.fill();

    var rowColors=['#243238','#2d3d42','#34484b','#26373b','#3b4d50'];
    for(var r=0;r<13;r++){
      var y=95+r*11;
      for(var x=0;x<64;x++){
        var px=7+x*15+(r%2)*4,py=y+((x*7+r*13)%5);
        var h=hash(x+'|'+r+'|'+String(m.home||''))+x+r*11;
        g.fillStyle=rowColors[(h>>>0)%rowColors.length];
        g.fillRect(px,py,6,5);
        if((h%11)===0){g.fillStyle='#d8bf63';g.fillRect(px,py,6,2)}
      }
    }

    g.fillStyle='#132019';g.fillRect(0,223,W,22);
    for(x=0;x<16;x++){g.fillStyle=x%3===0?'#d8b94f':x%3===1?'#2e9762':'#17334a';g.fillRect(x*60,226,47,14)}

    var TLx=220,TRx=740,Ty=247,BLx=78,BRx=882,By=530;
    var grass=g.createLinearGradient(0,Ty,0,By);
    grass.addColorStop(0,'#2c7d48');grass.addColorStop(.45,'#2f8b4c');grass.addColorStop(1,'#206438');
    g.fillStyle=grass;g.beginPath();g.moveTo(TLx,Ty);g.lineTo(TRx,Ty);g.lineTo(BRx,By);g.lineTo(BLx,By);g.closePath();g.fill();

    for(r=0;r<12;r++){
      var yy=Ty+r*(By-Ty)/12,yy2=Ty+(r+1)*(By-Ty)/12;
      var l=lerp(TLx,BLx,r/12),rr=lerp(TRx,BRx,r/12),l2=lerp(TLx,BLx,(r+1)/12),rr2=lerp(TRx,BRx,(r+1)/12);
      if(r%2===0){g.fillStyle='rgba(255,255,255,.025)';g.beginPath();g.moveTo(l,yy);g.lineTo(rr,yy);g.lineTo(rr2,yy2);g.lineTo(l2,yy2);g.closePath();g.fill()}
    }

    var white='rgba(242,247,240,.86)';
    g.strokeStyle=white;g.lineWidth=3;
    function line(x1,y1,x2,y2){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()}
    function px(v,y){return lerp(lerp(TLx,TRx,v),lerp(BLx,BRx,v),clamp((y-Ty)/(By-Ty),0,1))}
    line(px(0,Ty),Ty,px(1,Ty),Ty);line(px(0,By),By,px(1,By),By);
    var midY=Ty+(By-Ty)*.5;
    line(px(0,midY),midY,px(1,midY),midY);line(px(.5,Ty),Ty,px(.5,By),By);
    g.beginPath();g.ellipse(px(.5,midY),midY,72,36,0,0,Math.PI*2);g.stroke();

    function area(side){
      var y1=Ty+(By-Ty)*.28,y2=Ty+(By-Ty)*.72,inner=side===0?.15:.85;
      var spread=side===0?86:-86;
      line(px(side===0?0:1,y1),y1,px(inner,y1)+spread,y1);
      line(px(side===0?0:1,y2),y2,px(inner,y2)+spread,y2);
      line(px(inner,y1)+spread,y1,px(inner,y2)+spread,y2);
      var s1=Ty+(By-Ty)*.40,s2=Ty+(By-Ty)*.60;
      line(px(side===0?.05:.95,s1),s1,px(side===0?.05:.95,s2),s2);
    }
    area(0);area(1);

    g.strokeStyle='rgba(248,250,246,.92)';g.lineWidth=4;
    g.strokeRect(TLx-23,Ty+62,23,62);g.strokeRect(TRx,Ty+62,23,62);
    g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=1;
    for(r=0;r<10;r++){line(TLx-22,Ty+62+r*6,TLx,Ty+62+r*6);line(TRx,Ty+62+r*6,TRx+22,Ty+62+r*6)}
    g.fillStyle='#f4d66a';g.fillRect(TLx+4,Ty+4,5,18);g.fillRect(TRx-9,Ty+4,5,18);g.fillRect(BLx+7,By-21,5,18);g.fillRect(BRx-12,By-21,5,18);

    m._pitch=o;return o;
  }

  function worldPoint(x,y,cameraX,mode){
    x=clamp(Number(x)||.5,0,1);y=clamp(Number(y)||.5,0,1);
    var depth=.05+.95*y,left=lerp(220,78,depth),right=lerp(740,882,depth),py=247+depth*260,px=lerp(left,right,x);
    var pan=cameraX*80*(.35+.65*y);
    if(mode==='close')pan*=1.45;
    if(mode==='tactical')pan*=.72;
    return {x:px-pan,y:py};
  }

  function cameraState(m){
    var bx=Number(m.ball&&m.ball.x),by=Number(m.ball&&m.ball.y);
    if(!Number.isFinite(bx))bx=.5;if(!Number.isFinite(by))by=.5;
    var desired=cl((bx-.5)*.72,-.16,.16);
    if(!Number.isFinite(m._cameraX))m._cameraX=desired;
    var smooth=m.cameraMode==='close'?.16:m.cameraMode==='tactical'?.08:.11;
    m._cameraX=lerp(m._cameraX,desired,smooth);
    return {x:m._cameraX,mode:m.cameraMode||'tv'};
  }

  function actionFor(p,m,now,low){
    var a=String(p&&p.ai&&p.ai.lastAction||'').toLowerCase();
    var speed=Math.abs((Number(p&&p.x)||0)-(Number(p&&p.tx)||Number(p&&p.x)))+Math.abs((Number(p&&p.y)||0)-(Number(p&&p.ty)||Number(p&&p.y)));
    var owner=m.possessionTeam==='home'&&m.possessionPlayerId===p.id||m.possessionTeam==='away'&&m.possessionPlayerId===p.id;
    if(/tackle|desarme|carrinho/.test(a))return ['tackle',low?0:Math.floor(now/90)%4];
    if(/shot|chute|cross|cruz|pass|passe|through|lanç|clear/.test(a))return ['kick',low?0:Math.floor(now/80)%5];
    if(/dribble|dribl/.test(a))return ['dribble',low?0:Math.floor(now/92)%6];
    if(owner||speed>.0025)return ['run',low?0:Math.floor(now/110)%4];
    return ['idle',low?0:Math.floor(now/500)%2];
  }

  function drawPlayer(g,p,side,m,now,low,cam){
    var pos=worldPoint(p&&p.x,p&&p.y,cam.x,cam.mode),id=String(p&&p.id||p&&p.name||'player'),num=String(p&&p.number!=null?p.number:'');
    var h=hash(id),pc=colors(side==='home'?m.home:m.away),role=String(p&&p.position||p&&p.role||'').toUpperCase();
    var keeper=/GOL|GK|KEEP/.test(role),depth=clamp(Number(p&&p.y)||.5,.05,.95),s=(.63+.62*depth)*(cam.mode==='close'?1.08:cam.mode==='tactical'?.94:1);
    var x=pos.x,y=pos.y;
    var act=actionFor(p,m,now,low),f=act[1],lean=act[0]==='run'?(f%2?-1:1)*2:act[0]==='kick'?3:0;
    var skin=['#70422f','#915538','#b8734e','#d89a72','#ebb18d'][h%5],hair=['#171717','#38251c','#5b3724','#8a572c','#c8c8c8'][(h>>>5)%5];
    var kit=keeper?'#e4a62d':pc[0],short=keeper?'#d99d28':pc[2]||pc[1];

    g.save();g.translate(x,y);g.scale(s,s);
    g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(0,4,13,4,0,0,Math.PI*2);g.fill();
    var owner=m.possessionTeam===side&&m.possessionPlayerId===p.id;
    if(owner){g.strokeStyle='#ffe48a';g.lineWidth=2.2;g.beginPath();g.ellipse(0,2,15,5,0,0,Math.PI*2);g.stroke();if(!low){g.fillStyle='rgba(255,225,133,.22)';g.beginPath();g.arc(0,1,20,0,Math.PI*2);g.fill()}}

    g.strokeStyle='#e9e9e4';g.lineWidth=4;g.lineCap='round';
    var stride=act[0]==='run'?(f%2?5:-5):act[0]==='kick'?6:0;
    g.beginPath();g.moveTo(-4+lean,12);g.lineTo(-5+stride,25);g.moveTo(4+lean,12);g.lineTo(5-stride,25);g.stroke();
    g.fillStyle='#171717';g.fillRect(-9+stride,23,7,4);g.fillRect(3-stride,23,7,4);
    g.fillStyle=short;g.fillRect(-9+lean,7,18,9);
    g.fillStyle=kit;g.beginPath();g.roundRect(-10+lean,-7,20,18,4);g.fill();
    g.fillStyle=pc[1];g.fillRect(-2+lean,-7,4,18);
    g.strokeStyle=skin;g.lineWidth=4.2;
    var arm=act[0]==='run'?(f%2?5:-5):act[0]==='kick'?5:0;
    g.beginPath();g.moveTo(-10+lean,-2);g.lineTo(-16+arm,7);g.moveTo(10+lean,-2);g.lineTo(16-arm,7);g.stroke();
    g.fillStyle=skin;g.beginPath();g.arc(0,-15,8.5,0,Math.PI*2);g.fill();
    g.fillStyle=hair;g.beginPath();g.arc(0,-17,8.8,Math.PI,Math.PI*2);g.fill();g.fillRect(-8.5,-17,17,4);

    if(num&&depth>.25){g.fillStyle='#f7f8f5';g.font='700 7px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(num.slice(0,2),lean,1)}
    if(owner&&!low){
      g.fillStyle='rgba(5,11,14,.78)';g.beginPath();g.roundRect(-35,-44,70,12,6);g.fill();
      g.fillStyle='#f7f7f3';g.font='700 7px system-ui';g.textAlign='center';g.textBaseline='middle';
      var label=String(p&&p.name||'Jogador');if(label.length>14)label=label.slice(0,13)+'…';g.fillText(label,0,-38);
    }
    g.restore();
  }

  function drawBall(g,m,low,cam){
    var p=worldPoint(m.ball&&m.ball.x,m.ball&&m.ball.y,cam.x,cam.mode),r=3.8+(Number(m.ball&&m.ball.z)||0)*2;
    g.fillStyle='rgba(0,0,0,.36)';g.beginPath();g.ellipse(p.x,p.y+4,7,2.5,0,0,Math.PI*2);g.fill();
    if(m.ball&&m.ball.flight&&!low){
      var f=m.ball.flight;g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=2;g.beginPath();g.moveTo(p.x,p.y);
      g.lineTo(lerp(f.from[0],f.to[0],.35)*960-cam.x*70,lerp(f.from[1],f.to[1],.35)*540);g.stroke();
    }
    g.fillStyle='#ffffff';g.beginPath();g.arc(p.x,p.y-r*.15,r,0,Math.PI*2);g.fill();
    g.fillStyle='#283235';g.beginPath();g.arc(p.x-1,p.y-1,r*.38,0,Math.PI*2);g.fill();
  }

  function drawTVOverlay(g,m,cam){
    g.save();
    var grad=g.createLinearGradient(0,0,0,92);grad.addColorStop(0,'rgba(3,8,11,.86)');grad.addColorStop(1,'rgba(3,8,11,0)');
    g.fillStyle=grad;g.fillRect(0,0,W,92);
    g.fillStyle='rgba(236,244,241,.94)';g.font='900 13px system-ui';g.fillText('J90 SPORTS',22,24);
    g.fillStyle='#44d684';g.font='800 10px system-ui';g.fillText('● AO VIVO',22,42);
    var clock=document.getElementById('j90MatchClock'),score=document.getElementById('j90MatchScore');
    var clockText=clock?clock.textContent:'00:00 / '+String(m.duration||60),scoreText=score?score.textContent:String(m.homeScore||0)+' × '+String(m.awayScore||0);
    g.textAlign='center';g.fillStyle='rgba(5,10,13,.86)';g.beginPath();g.roundRect(W/2-170,12,340,48,14);g.fill();
    g.fillStyle='#f6f7f5';g.font='800 12px system-ui';g.fillText(String(m.home||'CASA')+'   '+scoreText+'   '+String(m.away||'FORA'),W/2,31);
    g.fillStyle='#d7e1dc';g.font='700 10px system-ui';g.fillText(clockText,W/2,48);
    g.textAlign='right';g.fillStyle='rgba(242,200,91,.9)';g.font='800 9px system-ui';g.fillText(cam.mode==='tv'?'TV':cam.mode==='close'?'CÂMERA PRÓXIMA':'TÁTICA',W-22,24);
    g.fillStyle='rgba(234,242,238,.55)';g.font='600 8px system-ui';g.fillText('JORNADA 90',W-22,39);
    g.restore();
  }

  function draw(){
    var st=state(),m=st&&st.match2d;if(!m)return;
    var c=ensure(m);if(!c||!m._ctx)return;
    var g=m._ctx,now=performance.now(),t0=now;if(!g){m._j90RenderError='Canvas 2D unavailable';return}
    var low=!!(window.__J90_PERF&&window.__J90_PERF.low)||!!m._j90AutoLow,cam=cameraState(m);
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);g.drawImage(fieldCache(m),0,0);
    var home=m.players||[],away=m.oppPlayers||[];
    for(var i=0;i<home.length;i++)drawPlayer(g,home[i],'home',m,now,low,cam);
    for(var j=0;j<away.length;j++)drawPlayer(g,away[j],'away',m,now,low,cam);
    drawBall(g,m,low,cam);
    if(!low){
      var sweep=(now/3600)%1;g.fillStyle='rgba(255,255,255,.045)';g.fillRect(sweep*W-260,238,150,4);
      var vg=g.createRadialGradient(W/2,310,170,W/2,310,520);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.28)');g.fillStyle=vg;g.fillRect(0,0,W,H);
    }
    drawTVOverlay(g,m,cam);
    m._j90v3Frames=(m._j90v3Frames||0)+1;
    var cost=performance.now()-t0;m._j90v3RenderMsAvg=m._j90v3RenderMsAvg?m._j90v3RenderMsAvg*.9+cost*.1:cost;
    m._j90RenderSamples=(m._j90RenderSamples||0)+1;
    if(m._j90RenderSamples%24===0)m._j90AutoLow=Number(m._j90v3RenderMsAvg||0)>12;
    m._j90v3Mode='broadcast-tv';m._j90v3LastFrame=now;m._j90AnimationProfile='broadcast-smooth';m._j90BroadcastReady=true;m._j90CameraMode=cam.mode;
    var label=document.getElementById('j90MatchCameraLabel');if(label)label.textContent=cam.mode==='tv'?'TV':cam.mode==='close'?'Próxima':'Tática';
  }

  function cycleCamera(){
    var st=state(),m=st&&st.match2d;if(!m)return '';
    var modes=['tv','tactical','close'],cur=m.cameraMode||'tv',next=modes[(modes.indexOf(cur)+1)%modes.length];
    m.cameraMode=next;draw();try{if(typeof save==='function')save()}catch(e){}return next;
  }

  function hook(){
    if(typeof window.mgrDraw2D==='function'&&!window.mgrDraw2D.__j90broadcast){
      var old=window.mgrDraw2D,wrapped=function(){draw()};wrapped.__j90broadcast=true;wrapped.__original=old;window.mgrDraw2D=wrapped;try{mgrDraw2D=wrapped}catch(e){}
    }else if(typeof window.mgrDraw2D!=='function')window.mgrDraw2D=draw;
    var c=document.getElementById('j90MatchCanvas');
    if(c&&!c.__j90BroadcastResize){c.__j90BroadcastResize=true;if(window.ResizeObserver){var ro=new ResizeObserver(function(){var st=state(),m=st&&st.match2d;if(m){m._pitch=null;ensure(m);draw()}});ro.observe(c)}}
  }

  window.j90MatchCameraCycle=cycleCamera;
  window.J90Match2DV3={version:'4.0',mode:'broadcast-tv',animationProfile:'broadcast-smooth',cameraModes:['tv','tactical','close'],draw:draw,ensure:ensure,cycleCamera:cycleCamera};

  var tries=0;
  function boot(){hook();if(tries++<60&&!document.getElementById('j90MatchCanvas'))setTimeout(boot,120)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();