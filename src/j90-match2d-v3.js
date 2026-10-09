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
  function percentile95(values){
    if(!values.length)return 0;
    var a=values.slice().sort(function(x,y){return x-y}),idx=Math.max(0,Math.ceil(a.length*.95)-1);
    return Number(a[idx]||0);
  }
  function updateFrameQuality(m,now){
    var list=m._j90FrameIntervals||(m._j90FrameIntervals=[]),prev=Number(m._j90FrameLastAt)||0;
    if(prev>0){
      var delta=Math.max(0,Math.min(250,now-prev));
      list.push(delta);if(list.length>60)list.shift();
    }
    m._j90FrameLastAt=now;
    if(list.length>=8){
      var sum=0;for(var i=0;i<list.length;i++)sum+=list[i];
      var avg=sum/list.length,p95=percentile95(list),fps=avg>0?1000/avg:0;
      m._j90FrameP95=p95;m._j90Fps=fps;
      var externalLow=!!(window.__J90_PERF&&window.__J90_PERF.low);
      if(p95>50||fps<20)m._j90AutoLow=true;
      else if(p95<40&&fps>24&&!externalLow)m._j90AutoLow=false;
    }
    var low=!!m._j90AutoLow||!!(window.__J90_PERF&&window.__J90_PERF.low);
    m._j90Dpr=Math.min(1.5,Math.max(.75,low?.75:1));
    return low;
  }

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
  function ensure(m,now,recordFrame){
    var c=document.getElementById('j90MatchCanvas');if(!m||!c)return null;
    if(recordFrame)updateFrameQuality(m,Number.isFinite(now)?now:performance.now());
    var dpr=Math.min(1.5,Math.max(.75,Number(m._j90Dpr)||1));
    c.style.display='block';c.style.visibility='visible';c.style.opacity='1';
    c.style.width='100%';c.style.height='100%';c.style.minHeight='0';
    c.style.imageRendering='auto';
    var rect=c.getBoundingClientRect(),cssW=Math.max(240,Math.round(rect.width||c.clientWidth||m._cw||360)),cssH=Math.max(180,Math.round(rect.height||c.clientHeight||m._ch||220));
    var targetW=Math.max(1,Math.round(cssW*dpr)),targetH=Math.max(1,Math.round(cssH*dpr));
    if(c.width!==targetW||c.height!==targetH||!m._ctx){
      c.width=targetW;c.height=targetH;
      try{m._ctx=c.getContext('2d',{alpha:false,desynchronized:true})||c.getContext('2d',{alpha:false})||c.getContext('2d')}catch(e){try{m._ctx=c.getContext('2d')}catch(_){m._ctx=null}}
    }
    if(m._ctx)m._ctx.imageSmoothingEnabled=!((window.__J90_PERF&&window.__J90_PERF.low)||m._j90AutoLow);
    m._cw=cssW;m._ch=cssH;m._dpr=dpr;
    m._j90CanvasScaleX=dpr*cssW/W;m._j90CanvasScaleY=dpr*cssH/H;
    m._dom=m._dom||{};m._dom.canvas=c;
    if(!m.cameraMode)m.cameraMode='tv';
    return c;
  }

  function fieldCache(m){
    if(m._pitch)return m._pitch;
    var o=document.createElement('canvas');o.width=W;o.height=H;
    var g=o.getContext('2d',{alpha:false});g.imageSmoothingEnabled=false;
    g.fillStyle='#071017';g.fillRect(0,0,W,H);

    var sky=g.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#101f2c');sky.addColorStop(.55,'#101b22');sky.addColorStop(1,'#071015');
    g.fillStyle=sky;g.fillRect(0,0,W,H);

    // Stadium bowl and tiny, deterministic crowd pixels. This is original J90 artwork.
    g.fillStyle='#050a0e';g.beginPath();g.moveTo(0,78);g.lineTo(290,55);g.lineTo(480,78);g.lineTo(670,55);g.lineTo(960,78);g.lineTo(960,470);g.lineTo(700,493);g.lineTo(480,474);g.lineTo(260,493);g.lineTo(0,470);g.closePath();g.fill();
    g.fillStyle='#18262d';g.beginPath();g.moveTo(0,95);g.lineTo(295,72);g.lineTo(480,92);g.lineTo(665,72);g.lineTo(960,95);g.lineTo(960,450);g.lineTo(700,475);g.lineTo(480,455);g.lineTo(260,475);g.lineTo(0,450);g.closePath();g.fill();

    var seatColors=['#34454b','#43565a','#23363d','#536267','#75694d','#243f45','#4a3c3b'];
    for(var row=0;row<24;row++){
      var sy=79+row*15;
      var half=0;
      if(sy>=90&&sy<=440)half=Math.max(0,Math.min((sy-90)*2.31,(440-sy)*2.31));
      for(var side=0;side<2;side++){
        var start=side===0?8:952,step=side===0?9:-9;
        for(var q=0;q<106;q++){
          var sx=start+step*q;
          if(sy>=90&&sy<=440){
            if(side===0&&sx>480-half-10)break;
            if(side===1&&sx<480+half+10)break;
          }
          var h=hash('crowd:'+row+':'+q+':'+side+':'+String(m.home||''));
          g.fillStyle=seatColors[h%seatColors.length];
          g.fillRect(sx,sy+((h>>>5)%4),4,4);
          if((h%17)===0){g.fillStyle='#c1a95f';g.fillRect(sx,sy+1,4,2)}
        }
      }
    }

    // Roofline and floodlights.
    g.fillStyle='#03070a';g.fillRect(0,62,960,10);
    g.fillStyle='#d8e7de';
    for(var lx=0;lx<8;lx++)g.fillRect(70+lx*118,70,3,2);
    var lamp=g.createRadialGradient(90,116,2,90,116,80);
    lamp.addColorStop(0,'rgba(255,239,185,.18)');lamp.addColorStop(1,'rgba(255,239,185,0)');
    g.fillStyle=lamp;g.fillRect(15,68,150,150);
    var lamp2=g.createRadialGradient(870,116,2,870,116,80);
    lamp2.addColorStop(0,'rgba(255,239,185,.18)');lamp2.addColorStop(1,'rgba(255,239,185,0)');
    g.fillStyle=lamp2;g.fillRect(795,68,150,150);

    function p(x,y){return {x:480+(x-y)*405,y:265+(x+y-1)*175}}
    function polygon(points,fill,stroke,width){
      g.beginPath();g.moveTo(points[0].x,points[0].y);
      for(var i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
      g.closePath();if(fill){g.fillStyle=fill;g.fill()}
      if(stroke){g.strokeStyle=stroke;g.lineWidth=width||2;g.stroke()}
    }

    var turf=g.createLinearGradient(120,90,820,452);
    turf.addColorStop(0,'#277b45');turf.addColorStop(.5,'#309050');turf.addColorStop(1,'#1d6438');
    polygon([p(0,0),p(1,0),p(1,1),p(0,1)],turf,'#a7c9aa',2);

    // Alternating bands are cached once, so the live renderer stays lightweight.
    for(var band=0;band<10;band++){
      if(band%2===0){
        polygon([p(0,band/10),p(1,band/10),p(1,(band+1)/10),p(0,(band+1)/10)],'rgba(230,255,227,.045)');
      }
    }

    var white='rgba(242,249,238,.92)';
    function line(a,b,w){g.strokeStyle=white;g.lineWidth=w||2;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke()}
    // Touchlines, goal lines, halfway line and lengthwise centre guide.
    line(p(0,0),p(1,0),2.6);line(p(1,0),p(1,1),2.6);
    line(p(1,1),p(0,1),2.6);line(p(0,1),p(0,0),2.6);
    line(p(0,.5),p(1,.5),2.2);
    line(p(.5,0),p(.5,1),1.7);

    g.strokeStyle=white;g.lineWidth=2;
    g.beginPath();g.ellipse(480,265,47,21,0,0,Math.PI*2);g.stroke();
    var centre=p(.5,.5);g.fillStyle=white;g.fillRect(centre.x-2,centre.y-2,4,4);
    g.fillRect(p(.5,.12).x-2,p(.5,.12).y-2,4,4);g.fillRect(p(.5,.88).x-2,p(.5,.88).y-2,4,4);

    // Penalty areas, six-yard boxes and goals, all positioned in pitch coordinates.
    polygon([p(.24,0),p(.76,0),p(.76,.17),p(.24,.17)],null,white,2);
    polygon([p(.39,0),p(.61,0),p(.61,.065),p(.39,.065)],null,white,1.8);
    polygon([p(.24,.83),p(.76,.83),p(.76,1),p(.24,1)],null,white,2);
    polygon([p(.39,.935),p(.61,.935),p(.61,1),p(.39,1)],null,white,1.8);

    // Pixel-clean nets extend just outside the end lines.
    polygon([p(.42,-.035),p(.58,-.035),p(.58,.005),p(.42,.005)],'rgba(220,236,226,.12)',white,1.8);
    polygon([p(.42,.995),p(.58,.995),p(.58,1.035),p(.42,1.035)],'rgba(220,236,226,.12)',white,1.8);
    g.strokeStyle='rgba(238,247,239,.4)';g.lineWidth=1;
    for(var net=0;net<5;net++){
      var nx=.42+net*.04;
      line(p(nx,-.03),p(nx,.004),1);
      line(p(nx,.996),p(nx,1.03),1);
    }

    // Corner flags make the pitch readable on small portrait screens.
    [[0,0],[1,0],[0,1],[1,1]].forEach(function(c){
      var cp=p(c[0],c[1]);g.fillStyle='#eee5b2';g.fillRect(Math.round(cp.x)-2,Math.round(cp.y)-2,4,4);
    });

    m._pitch=o;return o;
  }  function worldPoint(x,y,cameraX,cameraY,mode,zoom){
    x=clamp(Number(x)||.5,0,1);y=clamp(Number(y)||.5,0,1);
    // Original J90 isometric projection. No borrowed engine or image assets.
    var px=480+(x-y)*405,py=265+(x+y-1)*175;
    var panX=(Number(cameraX)||0)*100,panY=(Number(cameraY)||0)*66;
    if(mode==='close'){panX*=1.25;panY*=1.2}
    if(mode==='tactical'){panX*=.65;panY*=.65}
    var z=clamp(Number(zoom)||1,.88,1.14);
    px=480+(px-panX-480)*z;
    py=265+(py-panY-265)*z;
    return {x:px,y:py};
  }

  function cameraState(m){
    var bx=Number(m.ball&&m.ball.x),by=Number(m.ball&&m.ball.y);
    if(!Number.isFinite(bx))bx=.5;if(!Number.isFinite(by))by=.5;
    var dangerHome=Number(m.danger&&m.danger.home)||.5,dangerAway=Number(m.danger&&m.danger.away)||.5;
    var totalDanger=dangerHome+dangerAway;
    var activeDanger=totalDanger>0?Math.max(dangerHome,dangerAway)/totalDanger:.5;
    var desiredX=clamp(((bx-.5)-(by-.5))*.56,-.32,.32);
    var desiredY=clamp(((bx-.5)+(by-.5))*.42,-.32,.32);
    var attacking=String(m.action&&m.action.name||'').toLowerCase();
    var eventZoom=/shot|chute|goal|cross|corner|free|penalty|final/.test(attacking)?1.10:(activeDanger>.62?1.06:.98);
    var mode=m.cameraMode||'tv';
    if(mode==='close')eventZoom=Math.max(eventZoom,1.10);
    if(mode==='tactical')eventZoom=.94;
    if(!Number.isFinite(m._cameraX))m._cameraX=desiredX;
    if(!Number.isFinite(m._cameraY))m._cameraY=desiredY;
    if(!Number.isFinite(m._cameraZoom))m._cameraZoom=1;
    var smooth=mode==='close'?.16:mode==='tactical'?.075:.12;
    var verticalSmooth=mode==='close'?.13:mode==='tactical'?.06:.085;
    m._cameraX=lerp(m._cameraX,desiredX,smooth);
    m._cameraY=lerp(m._cameraY,desiredY,verticalSmooth);
    m._cameraZoom=lerp(m._cameraZoom,eventZoom,.10);
    return {x:m._cameraX,y:m._cameraY,zoom:m._cameraZoom,mode:mode};
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
    var pos=worldPoint(p&&p.x,p&&p.y,cam.x,cam.y,cam.mode,cam.zoom);
    var id=String(p&&p.id||p&&p.name||'player'),num=String(p&&p.number!=null?p.number:'');
    var h=hash(id),pc=colors(side==='home'?m.home:m.away),role=String(p&&p.position||p&&p.role||'').toUpperCase();
    var keeper=/GOL|GK|KEEP/.test(role),depth=clamp(((Number(p&&p.x)||.5)+(Number(p&&p.y)||.5))*.5,.05,.95);
    var s=(.83+.20*depth)*(cam.mode==='close'?1.08:cam.mode==='tactical'?.94:1);
    var x=Math.round(pos.x),y=Math.round(pos.y);
    var act=actionFor(p,m,now,low),f=act[1];
    var skin=['#70422f','#915538','#b8734e','#d89a72','#ebb18d'][h%5];
    var hair=['#171717','#38251c','#5b3724','#8a572c','#c8c8c8'][(h>>>5)%5];
    var kit=keeper?'#e4a62d':pc[0],short=keeper?'#d99d28':(pc[2]||pc[1]||'#263747');
    var armStep=act[0]==='run'&&!low?(f%2?2:0):act[0]==='kick'?2:0;
    var legStep=act[0]==='run'&&!low?(f%2?2:0):act[0]==='kick'?2:0;

    g.save();g.translate(x,y);g.scale(s,s);
    // Small pixel-art characters: crisp rectangles, deterministic palettes, no external sprites.
    g.fillStyle='rgba(0,0,0,.32)';g.beginPath();g.ellipse(0,3,10,4,0,0,Math.PI*2);g.fill();
    var owner=m.possessionTeam===side&&m.possessionPlayerId===p.id;
    if(owner){
      g.strokeStyle='#ffe58a';g.lineWidth=1.5;g.beginPath();g.ellipse(0,2,12,4.5,0,0,Math.PI*2);g.stroke();
      if(!low){g.fillStyle='rgba(255,225,133,.13)';g.fillRect(-10,-1,20,5)}
    }

    // Boots, socks and alternating running legs.
    g.fillStyle='#e8e6d7';
    g.fillRect(-4+legStep,3,3,7);g.fillRect(1-legStep,3,3,7);
    g.fillStyle='#161d20';g.fillRect(-5+legStep,9,4,2);g.fillRect(1-legStep,9,4,2);
    g.fillStyle=short;g.fillRect(-5,0,10,4);

    // Arms behind the shirt.
    g.fillStyle=skin;
    g.fillRect(-8-armStep,-8,3,9);g.fillRect(5+armStep,-8,3,9);
    g.fillStyle='#e5dfd2';g.fillRect(-8-armStep,-1,3,3);g.fillRect(5+armStep,-1,3,3);

    // Shirt body and sleeves. A central stripe differentiates the club kit.
    g.fillStyle=kit;g.fillRect(-6,-11,12,12);
    g.fillStyle=pc[1]||'#f2f2f2';g.fillRect(-1,-10,2,10);
    g.fillStyle=keeper?'#f3c96d':pc[2]||'#183044';g.fillRect(-6,-2,12,3);
    g.fillStyle=kit;g.fillRect(-8,-9,3,6);g.fillRect(5,-9,3,6);
    g.fillStyle='#f4f1e7';g.fillRect(-6,-11,12,1);

    // Neck, face and hair are individually shaded pixel blocks.
    g.fillStyle=skin;g.fillRect(-2,-14,4,3);g.fillRect(-4,-19,8,6);
    g.fillStyle=hair;g.fillRect(-4,-20,8,2);g.fillRect(-5,-18,2,3);
    g.fillStyle='#30251f';g.fillRect(-2,-17,1,1);g.fillRect(2,-17,1,1);
    if(num&&depth>.34){
      g.fillStyle='#ffffff';g.font='bold 5px monospace';g.textAlign='center';g.textBaseline='middle';g.fillText(num.slice(0,2),0,-6);
    }
    if(owner&&!low){
      g.fillStyle='rgba(5,11,14,.86)';g.fillRect(-26,-31,52,9);
      g.fillStyle='#f7f7f3';g.font='bold 6px system-ui';g.textAlign='center';g.textBaseline='middle';
      var label=String(p&&p.name||'Jogador');if(label.length>12)label=label.slice(0,11)+'…';g.fillText(label,0,-26.5);
    }
    g.restore();
  }  function drawBall(g,m,low,cam){
    var p=worldPoint(m.ball&&m.ball.x,m.ball&&m.ball.y,cam.x,cam.y,cam.mode,cam.zoom);
    var z=Number(m.ball&&m.ball.z)||0,r=3.1+Math.max(0,z)*1.6;
    g.fillStyle='rgba(0,0,0,.38)';g.beginPath();g.ellipse(p.x,p.y+4,5.5,2,0,0,Math.PI*2);g.fill();
    if(m.ball&&m.ball.flight&&!low){
      var f=m.ball.flight;
      if(Array.isArray(f.from)&&Array.isArray(f.to)){
        var a=worldPoint(f.from[0],f.from[1],cam.x,cam.y,cam.mode,cam.zoom);
        var b=worldPoint(f.to[0],f.to[1],cam.x,cam.y,cam.mode,cam.zoom);
        g.strokeStyle='rgba(255,255,255,.36)';g.lineWidth=1.5;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
      }
    }
    g.fillStyle='#fffdf1';g.beginPath();g.arc(p.x,p.y-r*.2,r,0,Math.PI*2);g.fill();
    g.fillStyle='#253137';
    g.fillRect(Math.round(p.x-1),Math.round(p.y-1),2,2);
    g.fillRect(Math.round(p.x-r*.55),Math.round(p.y-r*.4),2,2);
    g.fillRect(Math.round(p.x+r*.25),Math.round(p.y+r*.25),2,2);
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
    var st=state(),m=st&&st.match2d;if(!m)return false;
    var now=performance.now(),stage='ensure';
    try{
      var c=ensure(m,now,true);if(!c)return false;
      var g=m._ctx;if(!g){m._j90RenderError='Canvas 2D unavailable';m._j90RenderErrorStage='context';return false}
      var t0=now,low=!!m._j90AutoLow||!!(window.__J90_PERF&&window.__J90_PERF.low),cam;
      stage='camera';cam=cameraState(m);
      stage='canvas-state';g.setTransform(m._j90CanvasScaleX||1,0,0,m._j90CanvasScaleY||1,0,0);g.clearRect(0,0,W,H);g.drawImage(fieldCache(m),0,0,W,H);
      stage='players';
      var home=m.players||[],away=m.oppPlayers||[];
      for(var i=0;i<home.length;i++)drawPlayer(g,home[i],'home',m,now,low,cam);
      for(var j=0;j<away.length;j++)drawPlayer(g,away[j],'away',m,now,low,cam);
      stage='ball';drawBall(g,m,low,cam);
      stage='presentation';
      if(!low){
        var sweep=(now/3600)%1;g.fillStyle='rgba(255,255,255,.045)';g.fillRect(sweep*W-260,238,150,4);
        var vg=g.createRadialGradient(W/2,310,170,W/2,310,520);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.28)');g.fillStyle=vg;g.fillRect(0,0,W,H);
      }
      drawTVOverlay(g,m,cam);
      stage='commit';
      m._j90v3Frames=(m._j90v3Frames||0)+1;
      var cost=performance.now()-t0;
      m._j90v3RenderMsAvg=m._j90v3RenderMsAvg?m._j90v3RenderMsAvg*.9+cost*.1:cost;
      m._j90RenderSamples=(m._j90RenderSamples||0)+1;
      m._j90RenderError='';m._j90RenderErrorStage='';m._j90RenderErrorStack='';
      m._j90v3Mode='broadcast-tv';m._j90v3LastFrame=now;m._j90AnimationProfile='broadcast-smooth';m._j90BroadcastReady=true;m._j90CameraMode=cam.mode;
      var label=document.getElementById('j90MatchCameraLabel');if(label)label.textContent=cam.mode==='tv'?'TV':cam.mode==='close'?'Próxima':'Tática';
      return true;
    }catch(e){
      m._j90RenderError=String(e&&e.message||e);
      m._j90RenderErrorStage=stage;
      m._j90RenderErrorStack=String(e&&e.stack||'').slice(0,4000);
      try{console.warn('[J90 Match Renderer]',stage,m._j90RenderError)}catch(_){}
      return false;
    }
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
    if(c&&!c.__j90BroadcastResize){c.__j90BroadcastResize=true;if(window.ResizeObserver){var ro=new ResizeObserver(function(){var st=state(),m=st&&st.match2d;if(m){m._pitch=null;ensure(m,performance.now(),false);draw()}});ro.observe(c)}}
  }

  window.j90MatchCameraCycle=cycleCamera;
  window.J90Match2DV3={version:'4.0',mode:'broadcast-tv',animationProfile:'broadcast-smooth',cameraModes:['tv','tactical','close'],draw:draw,ensure:ensure,cycleCamera:cycleCamera};

  var tries=0;
  function boot(){hook();if(tries++<60&&!document.getElementById('j90MatchCanvas'))setTimeout(boot,120)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();