/* Jornada 90 Match 2D renderer 4.1
 * Top-down circular-player presentation for a comfortable manager-style match.
 * Reuses/adapts the circular Canvas 2D presentation pattern from davidgomes/gball.
 * gball README identifies the project as MIT; attribution is recorded in
 * third_party/gball-NOTICE.md. No proprietary HaxBall source/assets are used.
 * Canvas 2D only, no renderer-owned RAF. The shared application loop owns the tick.
 */
(function(){
  'use strict';
  if(window.J90Match2DV3&&window.J90Match2DV3.version==='4.1')return;

  var W=960,H=540;
  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
  var lerp=function(a,b,t){return a+(b-a)*t};

  function hash(v){
    var s=String(v||'player'),h=2166136261>>>0;
    for(var i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;
    return h>>>0;
  }
  function percentile95(values){
    if(!values.length)return 0;
    var a=values.slice().sort(function(x,y){return x-y}),idx=Math.max(0,Math.ceil(a.length*.95)-1);
    return Number(a[idx]||0);
  }
  function state(){
    try{if(typeof S!=='undefined'&&S)return S}catch(e){}
    try{return window.J90ManagerBridge&&window.J90ManagerBridge.getState?window.J90ManagerBridge.getState():null}catch(e){return null}
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
    m._j90Dpr=Math.min(1.5,Math.max(.90,low?.90:1));
    return low;
  }

  function ensure(m,now,recordFrame){
    var c=document.getElementById('j90MatchCanvas');if(!m||!c)return null;
    if(recordFrame)updateFrameQuality(m,Number.isFinite(now)?now:performance.now());
    var dpr=Math.min(1.5,Math.max(.90,Number(m._j90Dpr)||1));
    c.style.display='block';
    c.style.visibility='visible';
    c.style.opacity='1';
    c.style.width='100%';
    c.style.height='100%';
    c.style.minHeight='180px';
    c.style.maxHeight='none';
    c.style.imageRendering='auto';
    var rect=c.getBoundingClientRect();
    var cssW=Math.max(240,Math.round(rect.width||c.clientWidth||m._cw||360));
    var cssH=Math.max(180,Math.round(rect.height||c.clientHeight||m._ch||210));
    var targetW=Math.max(240,Math.round(cssW*dpr));
    var targetH=Math.max(150,Math.round(cssH*dpr));
    if(c.width!==targetW||c.height!==targetH||!m._ctx){
      c.width=targetW;c.height=targetH;
      try{m._ctx=c.getContext('2d',{alpha:false,desynchronized:true})||c.getContext('2d',{alpha:false})||c.getContext('2d')}catch(e){try{m._ctx=c.getContext('2d')}catch(_){m._ctx=null}}
    }
    if(m._ctx){
      m._ctx.imageSmoothingEnabled=true;
      try{m._ctx.imageSmoothingQuality='medium'}catch(e){}
    }
    m._cw=cssW;m._ch=cssH;m._dpr=dpr;
    m._j90CanvasScaleX=dpr*cssW/W;m._j90CanvasScaleY=dpr*cssH/H;
    m._dom=m._dom||{};m._dom.canvas=c;
    if(!m.cameraMode)m.cameraMode='tv';
    return c;
  }

  function teamPalette(team){
    var n=String(team||'').toLowerCase(),h=hash(n);
    if(/real madrid/.test(n))return ['#f6f6f4','#b7a26d'];
    if(/barcelona|barça/.test(n))return ['#a50044','#17408b'];
    if(/psg|paris saint/.test(n))return ['#004170','#da291c'];
    if(/manchester city/.test(n))return ['#6cabdd','#173a63'];
    if(/liverpool/.test(n))return ['#c8102e','#f2f2f2'];
    if(/arsenal/.test(n))return ['#db0007','#f2f2f2'];
    if(/chelsea/.test(n))return ['#034694','#8cc7f0'];
    if(/sport/.test(n))return ['#27a75c','#f0d458'];
    var palettes=[['#2f7edb','#f2f4f5'],['#e05252','#f4f4f4'],['#38a56a','#f3f1dd'],['#8d5bd1','#f4f0ff'],['#e58b32','#f4f0e6']];
    return palettes[h%palettes.length];
  }

  function buildPitch(m){
    if(m._j90TopDownPitch)return m._j90TopDownPitch;
    var o=document.createElement('canvas');o.width=W;o.height=H;
    var g=o.getContext('2d',{alpha:false});
    g.fillStyle='#082016';g.fillRect(0,0,W,H);

    var stand='#111b18',grass='#2e8c50',grass2='#348f53',white='rgba(246,249,246,.90)';
    g.fillStyle=stand;g.fillRect(0,0,W,H);
    g.fillStyle='#17231f';g.fillRect(16,16,W-32,H-32);
    g.fillStyle=grass;g.fillRect(58,58,W-116,H-116);

    for(var y=58;y<H-58;y+=52){
      g.fillStyle=(Math.floor((y-58)/52)%2===0)?grass2:'#2a854b';
      g.fillRect(58,y,W-116,26);
    }

    var fx=58,fy=58,fw=W-116,fh=H-116,midX=W/2,midY=H/2;
    g.strokeStyle=white;g.lineWidth=3;g.strokeRect(fx,fy,fw,fh);
    g.beginPath();g.moveTo(midX,fy);g.lineTo(midX,fy+fh);g.stroke();
    g.beginPath();g.arc(midX,midY,70,0,Math.PI*2);g.stroke();
    g.fillStyle=white;g.beginPath();g.arc(midX,midY,4,0,Math.PI*2);g.fill();

    function area(left){
      var ax=left?fx:W-fx-170;
      g.strokeStyle=white;g.lineWidth=3;g.strokeRect(ax,midY-118,170,236);
      var gx=left?fx:W-fx;
      g.beginPath();g.arc(left?gx+102:gx-102,midY,44, left?-.95:Math.PI-.95, left?.95:Math.PI+.95);g.stroke();
      g.strokeRect(left?fx-12:W-fx-12,midY-60,12,120);
    }
    area(true);area(false);

    for(var i=0;i<9;i++){
      var sx=18+i*116,light=(i%2===0)?'#d9c26b':'#8aa391';
      g.fillStyle=light;g.fillRect(sx,24,56,5);g.fillRect(sx,H-29,56,5);
    }

    var label=String(m&&m.home||'J90 SPORTS').toUpperCase().slice(0,24);
    g.fillStyle='rgba(8,12,12,.72)';g.fillRect(330,27,300,28);
    g.fillStyle='#f0f4f2';g.font='800 12px system-ui';g.textAlign='center';g.fillText(label,midX,46);
    m._j90TopDownPitch=o;return o;
  }

  function roleColor(role){
    var r=String(role||'').toUpperCase();
    if(/GOL|GK|KEEP/.test(r))return '#f4ca45';
    if(/ATA|FWD|ST|CF/.test(r))return '#f4f4ef';
    if(/MEI|MID|MC|AM|VOL/.test(r))return '#d9ead9';
    return '#d8dfdc';
  }

  function drawCircularPlayer(g,p,side,m,now,low,selected){
    var x=clamp(Number(p&&p.x)||.5,.02,.98)*W;
    var y=clamp(Number(p&&p.y)||.5,.05,.95)*H;
    var id=String(p&&p.id||p&&p.name||'player'),h=hash(id);
    var pal=teamPalette(side==='home'?m.home:m.away);
    var depth=clamp(Number(p&&p.y)||.5,.05,.95);
    var radius=selected?17:15;
    radius*=.92+.18*depth;
    var moving=Math.abs((Number(p&&p.tx)||x/W)-(Number(p&&p.x)||x/W))+Math.abs((Number(p&&p.ty)||y/H)-(Number(p&&p.y)||y/H))>.002;
    var phase=Math.floor(now/(low?260:150))%2;
    var owner=(m.possessionTeam===side&&m.possessionPlayerId===p.id);

    g.save();
    g.translate(x,y);

    g.fillStyle='rgba(0,0,0,.30)';
    g.beginPath();g.ellipse(0,radius*.52,radius*1.02,radius*.34,0,0,Math.PI*2);g.fill();

    if(owner||selected){
      g.strokeStyle=selected?'#fff':'#ffe38b';
      g.lineWidth=selected?2.6:2;
      g.beginPath();g.arc(0,0,radius+5+(phase?1:0),0,Math.PI*2);g.stroke();
    }

    g.fillStyle=pal[0];g.beginPath();g.arc(0,0,radius,0,Math.PI*2);g.fill();
    g.strokeStyle=pal[1];g.lineWidth=2;g.stroke();

    g.fillStyle=roleColor(p&&p.position);
    g.beginPath();g.arc(0,-radius*.08,radius*.52,0,Math.PI*2);g.fill();

    g.fillStyle='#1d2421';
    g.beginPath();g.arc(0,-radius*.18,radius*.22,0,Math.PI*2);g.fill();
    g.fillStyle='rgba(255,255,255,.78)';
    g.beginPath();g.arc(-radius*.22,-radius*.26,radius*.10,0,Math.PI*2);g.fill();
    g.beginPath();g.arc(radius*.22,-radius*.26,radius*.10,0,Math.PI*2);g.fill();

    if(moving&&!low){
      g.strokeStyle='rgba(255,255,255,.48)';g.lineWidth=2;
      g.beginPath();
      g.moveTo(-radius*.55,radius*.80);
      g.lineTo(0,(phase?1:-1)*radius*1.05);
      g.lineTo(radius*.55,radius*.80);
      g.stroke();
    }

    var num=String(p&&p.number!=null?p.number:'');
    if(num){
      g.fillStyle='#101614';g.font='800 '+Math.max(8,Math.round(radius*.62))+'px system-ui';
      g.textAlign='center';g.textBaseline='middle';g.fillText(num.slice(0,2),0,radius*.34);
    }

    if(owner&&!low){
      var label=String(p&&p.name||'Jogador');
      if(label.length>15)label=label.slice(0,14)+'…';
      g.fillStyle='rgba(7,12,10,.84)';g.beginPath();g.roundRect(-42,-radius-24,84,13,6);g.fill();
      g.fillStyle='#f6f8f7';g.font='700 8px system-ui';g.fillText(label,0,-radius-15);
    }
    g.restore();
  }

  function drawBall(g,m,low){
    var x=clamp(Number(m.ball&&m.ball.x)||.5,.015,.985)*W;
    var y=clamp(Number(m.ball&&m.ball.y)||.5,.03,.97)*H;
    var z=Math.max(0,Number(m.ball&&m.ball.z)||0),r=5+Math.min(3,z);
    g.fillStyle='rgba(0,0,0,.34)';g.beginPath();g.ellipse(x,y+6,r*1.45,r*.48,0,0,Math.PI*2);g.fill();
    if(m.ball&&m.ball.flight&&!low){
      g.strokeStyle='rgba(255,255,255,.34)';g.lineWidth=2;g.beginPath();g.moveTo(x,y);
      var f=m.ball.flight;
      g.lineTo(clamp(Number(f.to&&f.to[0])||.5,0,1)*W,clamp(Number(f.to&&f.to[1])||.5,0,1)*H);g.stroke();
    }
    g.fillStyle='#fff';g.beginPath();g.arc(x,y-r*.12,r,0,Math.PI*2);g.fill();
    g.strokeStyle='#252c2a';g.lineWidth=1.5;g.stroke();
    g.fillStyle='#232b29';g.beginPath();g.arc(x-r*.18,y-r*.18,r*.26,0,Math.PI*2);g.fill();
  }

  function drawTVOverlay(g,m){
    g.fillStyle='rgba(5,10,9,.72)';g.fillRect(0,0,W,64);
    g.fillStyle='#ecf2ef';g.font='900 12px system-ui';g.textAlign='left';g.fillText('J90 SPORTS',18,20);
    g.fillStyle='#65d999';g.font='800 9px system-ui';g.fillText('● AO VIVO · 2D',18,37);
    var score=String(m.homeScore||0)+' × '+String(m.awayScore||0);
    var clock=document.getElementById('j90MatchClock'),clockText=clock?clock.textContent:'00:00';
    g.textAlign='center';g.fillStyle='rgba(3,7,6,.90)';g.beginPath();g.roundRect(W/2-142,9,284,40,11);g.fill();
    g.fillStyle='#f2f5f3';g.font='900 11px system-ui';g.fillText(String(m.home||'CASA')+'   '+score+'   '+String(m.away||'FORA'),W/2,26);
    g.fillStyle='#ccd8d1';g.font='700 9px system-ui';g.fillText(clockText,W/2,41);
    g.textAlign='right';g.fillStyle='#f1cd61';g.font='800 9px system-ui';g.fillText('BOLINHAS',W-18,20);
    g.fillStyle='rgba(240,245,242,.55)';g.font='600 8px system-ui';g.fillText('CONFORTO + FLUIDEZ',W-18,35);
  }

  function draw(){
    var st=state(),m=st&&st.match2d;if(!m)return false;
    var now=performance.now(),stage='ensure';
    try{
      var c=ensure(m,now,true);if(!c)return false;
      var g=m._ctx;if(!g){m._j90RenderError='Canvas 2D unavailable';m._j90RenderErrorStage='context';return false}
      var t0=performance.now(),low=!!m._j90AutoLow||!!(window.__J90_PERF&&window.__J90_PERF.low);
      stage='field';g.setTransform(m._j90CanvasScaleX||1,0,0,m._j90CanvasScaleY||1,0,0);g.clearRect(0,0,W,H);g.drawImage(buildPitch(m),0,0);
      stage='players';
      var home=m.players||[],away=m.oppPlayers||[],selectedId=String(window.__J90_SELECTED_PLAYER||'');
      for(var i=0;i<home.length;i++)drawCircularPlayer(g,home[i],'home',m,now,low,String(home[i].id||'')===selectedId);
      for(var j=0;j<away.length;j++)drawCircularPlayer(g,away[j],'away',m,now,low,String(away[j].id||'')===selectedId);
      stage='ball';drawBall(g,m,low);
      stage='overlay';if(!low)drawTVOverlay(g,m);
      stage='commit';
      m._j90v3Frames=(m._j90v3Frames||0)+1;
      var cost=performance.now()-t0;
      m._j90v3RenderMsAvg=m._j90v3RenderMsAvg?m._j90v3RenderMsAvg*.9+cost*.1:cost;
      m._j90RenderSamples=(m._j90RenderSamples||0)+1;
      m._j90RenderError='';m._j90RenderErrorStage='';m._j90RenderErrorStack='';
      m._j90v3Mode='broadcast-tv';m._j90v3LastFrame=now;m._j90AnimationProfile='broadcast-smooth';m._j90BroadcastReady=true;m._j90CameraMode=m.cameraMode||'tv';
      var label=document.getElementById('j90MatchCameraLabel');if(label)label.textContent='Bolinhas';
      return true;
    }catch(e){
      m._j90RenderError=String(e&&e.message||e);m._j90RenderErrorStage=stage;m._j90RenderErrorStack=String(e&&e.stack||'').slice(0,4000);
      try{console.warn('[J90 Match Renderer]',stage,m._j90RenderError)}catch(_){}
      return false;
    }
  }

  function cycleCamera(){
    var st=state(),m=st&&st.match2d;if(!m)return '';
    var modes=['tv','tactical','close'],cur=m.cameraMode||'tv',next=modes[(modes.indexOf(cur)+1)%modes.length];
    m.cameraMode=next;draw();try{if(typeof save==='function')save()}catch(e){}
    return next;
  }

  function hook(){
    if(typeof window.mgrDraw2D==='function'&&!window.mgrDraw2D.__j90circle){
      var old=window.mgrDraw2D,wrapped=function(){return draw()};wrapped.__j90circle=true;wrapped.__original=old;window.mgrDraw2D=wrapped;try{mgrDraw2D=wrapped}catch(e){}
    }else if(typeof window.mgrDraw2D!=='function')window.mgrDraw2D=draw;
    var c=document.getElementById('j90MatchCanvas');
    if(c&&!c.__j90CircleResize){
      c.__j90CircleResize=true;
      if(window.ResizeObserver){
        var ro=new ResizeObserver(function(){
          var st=state(),m=st&&st.match2d;
          if(m){m._j90TopDownPitch=null;ensure(m,performance.now(),false);draw()}
        });
        ro.observe(c);
      }
    }
  }

  window.j90MatchCameraCycle=cycleCamera;
  window.J90Match2DV3={version:'4.1',mode:'broadcast-tv',animationProfile:'broadcast-smooth',cameraModes:['tv','tactical','close'],draw:draw,ensure:ensure,cycleCamera:cycleCamera};

  var tries=0;
  function boot(){hook();if(tries++<60&&!document.getElementById('j90MatchCanvas'))setTimeout(boot,120)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
