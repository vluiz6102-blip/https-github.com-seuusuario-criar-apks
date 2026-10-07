/* Jornada 90 Match Renderer V5
 * WebGL1 primary renderer for Android/WebView + Canvas2D fallback.
 * Uses the existing shared match loop: no extra RAF, no timers.
 */
(function(){
  'use strict';
  if(window.__J90_MATCH2D_V5__) return;
  window.__J90_MATCH2D_V5__=true;

  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v));};
  var esc=function(v){return typeof window.esc==='function'?window.esc(v):String(v==null?'':v);};

  function palette(name){
    try{ if(window.J90AI2&&typeof J90AI2.palette==='function') return J90AI2.palette(name); }catch(e){}
    var n=String(name||'').toLowerCase();
    if(/real madrid/.test(n)) return ['#f5f5f5','#7b1fa2','#c9b458'];
    if(/barcelona|barça/.test(n)) return ['#a50044','#004d98','#edbb00'];
    if(/psg|paris saint/.test(n)) return ['#004170','#da291c','#fff'];
    if(/flamengo/.test(n)) return ['#e31b23','#111','#fff'];
    if(/palmeiras/.test(n)) return ['#006437','#fff','#69a87f'];
    return ['#25a45b','#143d28','#fff'];
  }
  function color(hex,a){
    var h=String(hex||'#fff').replace('#','');
    if(h.length===3) h=h.split('').map(function(x){return x+x;}).join('');
    return [
      parseInt(h.slice(0,2),16)/255||1,
      parseInt(h.slice(2,4),16)/255||1,
      parseInt(h.slice(4,6),16)/255||1,
      a==null?1:a
    ];
  }

  var VS=[
    'attribute vec2 aPos;',
    'attribute vec4 aColor;',
    'uniform vec2 uSize;',
    'varying vec4 vColor;',
    'void main(){',
    '  vec2 p=(aPos/uSize)*2.0-1.0;',
    '  gl_Position=vec4(p.x,-p.y,0.0,1.0);',
    '  vColor=aColor;',
    '}'
  ].join('\n');
  var FS=[
    'precision mediump float;',
    'varying vec4 vColor;',
    'void main(){gl_FragColor=vColor;}'
  ].join('\n');

  function compile(gl,type,source){
    var sh=gl.createShader(type); gl.shaderSource(sh,source); gl.compileShader(sh);
    if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){ console.warn('J90 WebGL shader:',gl.getShaderInfoLog(sh)); gl.deleteShader(sh); return null; }
    return sh;
  }
  function initGL(c){
    var gl=null;
    try{
      gl=c.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:false,powerPreference:'high-performance'})
        ||c.getContext('experimental-webgl');
    }catch(e){}
    if(!gl) return null;
    var vs=compile(gl,gl.VERTEX_SHADER,VS),fs=compile(gl,gl.FRAGMENT_SHADER,FS);
    if(!vs||!fs) return null;
    var p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)) return null;
    var out={gl:gl,program:p,pos:gl.getAttribLocation(p,'aPos'),col:gl.getAttribLocation(p,'aColor'),size:gl.getUniformLocation(p,'uSize'),
      posBuf:gl.createBuffer(),colBuf:gl.createBuffer(),ready:true};
    gl.useProgram(p);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);
    c.addEventListener('webglcontextlost',function(e){e.preventDefault();out.ready=false;},false);
    c.addEventListener('webglcontextrestored',function(){var fresh=initGL(c);if(fresh){Object.keys(out).forEach(function(k){out[k]=fresh[k];});out.ready=true;}},false);
    return out;
  }

  function ensureCanvas(m){
    /* Canvas 2D is the stable Android path. WebGL remains available only for explicit diagnostics. */
    var c=document.getElementById('j90MatchCanvas'); if(!c) return null;
    c.style.display='block';c.style.visibility='visible';c.style.opacity='1';
    c.style.width='100%';c.style.height='clamp(260px,42vw,360px)';c.style.minHeight='260px';
    var parent=c.parentElement;
    var w=Math.max(280,Math.floor(c.clientWidth||parent&&parent.clientWidth||320));
    var h=Math.max(260,Math.floor(c.clientHeight||300));
    var dpr=Math.min(2,window.devicePixelRatio||1);
    if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}
    m._cw=w;m._ch=h;m._dpr=dpr;m._dom=m._dom||{};m._dom.canvas=c;
    if(!m._ctx){
      try{m._ctx=c.getContext('2d',{alpha:false,desynchronized:true,willReadFrequently:false})||c.getContext('2d',{alpha:false});}catch(e){m._ctx=null;}
    }
    if(window.J90_USE_WEBGL===true && (!m._j90gl||!m._j90gl.ready)){
      try{m._j90gl=initGL(c);}catch(e){m._j90gl=null;}
    }
    return c;
  }

  function pushRect(v,co,x,y,w,h,c){
    v.push(x,y,x+w,y,x+w,y+h,x,y,x+w,y+h,x,y+h);
    for(var i=0;i<6;i++) co.push(c[0],c[1],c[2],c[3]);
  }
  function pushCircle(v,co,cx,cy,r,col,segments){
    segments=segments||16;
    for(var i=0;i<segments;i++){
      var a0=i/segments*Math.PI*2,a1=(i+1)/segments*Math.PI*2;
      v.push(cx,cy,cx+Math.cos(a0)*r,cy+Math.sin(a0)*r,cx+Math.cos(a1)*r,cy+Math.sin(a1)*r);
      for(var j=0;j<3;j++)co.push(col[0],col[1],col[2],col[3]);
    }
  }
  function line(v,co,x1,y1,x2,y2,col,width){
    var dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy)||1,hw=(width||1.1)/2,nx=-dy/len*hw,ny=dx/len*hw;
    v.push(x1+nx,y1+ny,x2+nx,y2+ny,x2-nx,y2-ny,x1+nx,y1+ny,x2-nx,y2-ny,x1-nx,y1-ny);
    for(var i=0;i<6;i++)co.push(col[0],col[1],col[2],col[3]);
  }

  function field(g,v,co,w,h){
    pushRect(v,co,0,0,w,h,color('#0d4a2b',1));
    for(var i=0;i<12;i++) pushRect(v,co,i*w/12,0,w/12+1,h,color(i%2?'#0e512f':'#0b4528',.62));
    var white=color('#d8f2df',.66);
    line(v,co,7,7,w-7,7,white,1.2);line(v,co,w-7,7,w-7,h-7,white,1.2);line(v,co,w-7,h-7,7,h-7,white,1.2);line(v,co,7,h-7,7,7,white,1.2);
    line(v,co,w/2,7,w/2,h-7,white);
    for(var s=0;s<32;s++){var a=s/32*Math.PI*2;line(v,co,w/2+Math.cos(a)*Math.min(w,h)*.115,h/2+Math.sin(a)*Math.min(w,h)*.115,w/2+Math.cos(a+.2)*Math.min(w,h)*.115,h/2+Math.sin(a+.2)*Math.min(w,h)*.115,white);}
    pushCircle(v,co,w/2,h/2,2,color('#fff',.9),12);
    var boxW=w*.18,boxH=h*.40;
    line(v,co,7,h*.30,7+boxW,h*.30,white);line(v,co,7+boxW,h*.30,7+boxW,h*.70,white);line(v,co,7+boxW,h*.70,7,h*.70,white);
    line(v,co,w-7-boxW,h*.30,w-7,h*.30,white);line(v,co,w-7,h*.30,w-7,h*.70,white);line(v,co,w-7,h*.70,w-7-boxW,h*.70,white);
  }

  function renderWebGL(m){
    var c=ensureCanvas(m); if(!c||!m._j90gl||!m._j90gl.ready) return false;
    var R=m._j90gl,gl=R.gl,w=m._cw,h=m._ch,dpr=m._dpr||1;
    gl.viewport(0,0,c.width,c.height);gl.clearColor(.02,.04,.025,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(R.program);
    gl.uniform2f(R.size,w*dpr,h*dpr);

    var v=[],co=[];
    field(gl,v,co,w*dpr,h*dpr);
    var low=!!(window.__J90_PERF&&window.__J90_PERF.low);
    var now=performance.now(),home=palette(m.home),away=palette(m.away);
    var camX=(.5-(Number(m.ball&&m.ball.x)||.5))*w*.06*dpr;
    var camY=(.5-(Number(m.ball&&m.ball.y)||.5))*h*.035*dpr;

    function player(p,side){
      var pal=side==='home'?home:away, px=clamp(Number(p.x)||.5,.025,.975)*w*dpr+camX,py=clamp(Number(p.y)||.5,.045,.955)*h*dpr+camY;
      var active=m.possessionTeam===side&&m.possessionPlayerId===p.id;
      var r=Math.max(7,(Math.min(w,h)/260)*(low?.80:1))*dpr;
      var body=color(pal[0],.98),dark=color(pal[1],.98),white=color('#fff',.92);
      if(active) pushCircle(v,co,px,py,r+8*dpr,color(pal[0],.19),18);
      pushCircle(v,co,px,py,r,body,18);
      pushRect(v,co,px-r*.52,py+r*.35,r*1.04,r*.70,dark);
      pushRect(v,co,px-r*.34,py+r*.39,r*.68,r*.18,white);
      var stride=Math.sin(now/110+(Number(p.id)||0))*r*.32;
      line(v,co,px-r*.22,py+r*.86,px-r*.38+stride,py+r*1.28,color('#171717',.95));
      line(v,co,px+r*.22,py+r*.86,px+r*.38-stride,py+r*1.28,color('#171717',.95));
      if(active) pushCircle(v,co,px,py-r-10*dpr,2.7*dpr,white,12);
    }
    (m.players||[]).forEach(function(p){player(p,'home');});
    (m.oppPlayers||[]).forEach(function(p){player(p,'away');});
    var bx=Number(m.ball&&m.ball.x)||.5,by=Number(m.ball&&m.ball.y)||.5;
    var owner=null;try{if(typeof getPlayer==='function'&&m.possessionPlayerId)owner=getPlayer(m,m.possessionTeam,m.possessionPlayerId);}catch(e){}
    if(owner&&!m.ball.flight){bx=owner.x+(m.possessionTeam==='home'?.018:-.018);by=owner.y-.012;}
    pushCircle(v,co,clamp(bx,.01,.99)*w*dpr+camX,clamp(by,.01,.99)*h*dpr+camY,low?3*dpr:4*dpr,color('#fff',1),16);

    var vb=new Float32Array(v),cb=new Float32Array(co);
    gl.bindBuffer(gl.ARRAY_BUFFER,R.posBuf);gl.bufferData(gl.ARRAY_BUFFER,vb,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(R.pos);gl.vertexAttribPointer(R.pos,2,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,R.colBuf);gl.bufferData(gl.ARRAY_BUFFER,cb,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(R.col);gl.vertexAttribPointer(R.col,4,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,v.length/2);
    return true;
  }

  function renderStableCanvas(m){
    var c=ensureCanvas(m); if(!c||!m._ctx)return false;
    var g=m._ctx,w=m._cw||c.clientWidth,h=m._ch||c.clientHeight,dpr=m._dpr||1;
    try{
      g.setTransform(dpr,0,0,dpr,0,0);
      g.globalCompositeOperation='source-over';
      g.globalAlpha=1;
      g.clearRect(0,0,w,h);
      g.fillStyle='#0a1417';g.fillRect(0,0,w,h);
      var stripeW=w/12;
      for(var s=0;s<12;s++){g.fillStyle=s%2?'#164b31':'#12502f';g.fillRect(s*stripeW,0,stripeW+1,h);}
      g.strokeStyle='rgba(255,255,255,.72)';g.lineWidth=1;
      g.strokeRect(7,7,w-14,h-14);
      g.beginPath();g.moveTo(w/2,7);g.lineTo(w/2,h-7);g.stroke();
      var rr=Math.min(w,h)*.105;g.beginPath();g.arc(w/2,h/2,rr,0,Math.PI*2);g.stroke();
      g.beginPath();g.arc(w/2,h/2,2,0,Math.PI*2);g.fillStyle='#fff';g.fill();
      g.strokeStyle='rgba(255,255,255,.58)';
      var bw=w*.18,bh=h*.40;
      g.strokeRect(7,(h-bh)/2,bw,bh);g.strokeRect(w-7-bw,(h-bh)/2,bw,bh);
      var now=performance.now(),low=!!(window.__J90_PERF&&window.__J90_PERF.low);
      var ballX=Number(m.ball&&m.ball.x)||.5,ballY=Number(m.ball&&m.ball.y)||.5;
      var camX=(.5-ballX)*w*.12,camY=(.5-ballY)*h*.08;
      g.save();g.translate(camX,camY);
      if(window.j90TechAtlas){
        try{
          var meta=window.j90TechAtlasMeta||{frames:32,cols:8,rows:4,frameRate:60},cols=Math.max(1,meta.cols),rows=Math.max(1,meta.rows),frames=Math.max(1,Math.min(meta.frames,cols*rows));
          var img=window.j90TechAtlas,fw=img.width/cols,fh=img.height/rows,fi=Math.floor(((now-(window.j90TechAtlasTimer||now))/1000)*Math.max(1,meta.frameRate))%frames;
          g.globalAlpha=low?.018:.035;g.drawImage(img,(fi%cols)*fw,Math.floor(fi/cols)*fh,fw,fh,0,0,w,h);g.globalAlpha=1;
        }catch(e){}
      }
      function player(p,side){
        if(!p)return;
        var pal=side==='home'?palette(m.home):palette(m.away);
        var x=clamp(Number(p.x)||.5,.025,.975)*w,y=clamp(Number(p.y)||.5,.045,.955)*h;
        var active=m.possessionTeam===side&&m.possessionPlayerId===p.id;
        var r=low?6.2:7.2;
        if(active){g.beginPath();g.strokeStyle='rgba(255,255,255,.92)';g.lineWidth=2;g.arc(x,y,r+5,0,Math.PI*2);g.stroke();}
        g.fillStyle=pal[0];g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
        g.fillStyle='#e4b98a';g.beginPath();g.arc(x,y-1,r*.56,0,Math.PI*2);g.fill();
        g.fillStyle=pal[1];g.fillRect(x-r*.48,y+r*.18,r*.96,r*.68);
        g.fillStyle='#fff';g.fillRect(x-r*.34,y+r*.30,r*.68,r*.12);
        g.fillStyle='#1b1b1b';g.fillRect(x-r*.28,y+r*.83,r*.22,r*.38);g.fillRect(x+r*.06,y+r*.83,r*.22,r*.38);
        var n=String(p.name||'');if(n&&!low){
          g.font='800 8px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillStyle='rgba(255,255,255,.94)';
          var label=n.length>13?n.slice(0,12)+'…':n;g.fillText(label,x,y-r-10);
        }
      }
      (m.players||[]).forEach(function(p){player(p,'home');});
      (m.oppPlayers||[]).forEach(function(p){player(p,'away');});
      var owner=null;try{if(typeof getPlayer==='function'&&m.possessionPlayerId)owner=getPlayer(m,m.possessionTeam,m.possessionPlayerId);}catch(e){}
      var bx=owner&&!m.ball.flight?owner.x+(m.possessionTeam==='home'?.018:-.018):ballX,by=owner&&!m.ball.flight?owner.y-.012:ballY;
      g.fillStyle='#fff';g.beginPath();g.arc(clamp(bx,.01,.99)*w,clamp(by,.01,.99)*h,low?3:4,0,Math.PI*2);g.fill();
      g.restore();
      return true;
    }catch(e){console.warn('J90 stable 2D render:',e?.message||e);return false;}
  }

  function renderFallback(m){
    var c=ensureCanvas(m); if(!c||!m._ctx)return;
    var g=m._ctx,w=m._cw,h=m._ch,dpr=m._dpr||1;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
    g.fillStyle='#0d4a2b';g.fillRect(0,0,w,h);g.strokeStyle='rgba(255,255,255,.68)';g.lineWidth=1;g.strokeRect(7,7,w-14,h-14);g.beginPath();g.moveTo(w/2,7);g.lineTo(w/2,h-7);g.stroke();g.beginPath();g.arc(w/2,h/2,Math.min(w,h)*.12,0,Math.PI*2);g.stroke();
    var draw=function(p,side){var pal=side==='home'?palette(m.home):palette(m.away),x=clamp(p.x,.02,.98)*w,y=clamp(p.y,.04,.96)*h,r=7;
      g.fillStyle=pal[0];g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();g.fillStyle=pal[1];g.fillRect(x-5,y+3,10,6);
      if(m.possessionTeam===side&&m.possessionPlayerId===p.id){g.strokeStyle='#fff';g.beginPath();g.arc(x,y,r+5,0,Math.PI*2);g.stroke();}
    };
    (m.players||[]).forEach(function(p){draw(p,'home');});(m.oppPlayers||[]).forEach(function(p){draw(p,'away');});
    var owner=null;try{if(typeof getPlayer==='function'&&m.possessionPlayerId)owner=getPlayer(m,m.possessionTeam,m.possessionPlayerId);}catch(e){}
    var bx=owner&&!m.ball.flight?owner.x+(m.possessionTeam==='home'?.018:-.018):m.ball.x,by=owner&&!m.ball.flight?owner.y-.012:m.ball.y;
    g.fillStyle='#fff';g.beginPath();g.arc(clamp(bx,.01,.99)*w,clamp(by,.01,.99)*h,3.5,0,Math.PI*2);g.fill();
  }

  function updateBadge(){
    var bar=document.getElementById('j90V3MatchBar');if(!bar)return;
    var webgl=false,m=window.S&&S.match2d;
    try{webgl=!!(m&&m._j90gl&&m._j90gl.ready);}catch(e){}
    var b=bar.querySelector('.j90V4Renderer');
    if(!b){b=document.createElement('b');b.className='j90V4Renderer';bar.querySelector('.j90V3Live')?.appendChild(b);}
    if(b)b.textContent=webgl?'WEBGL ATIVO':'CANVAS 2D';
  }

  function draw(){
    var m=window.S&&S.match2d;if(!m)return;
    /* Stable Canvas2D first prevents black/green blank frames on WebView GPU quirks. */
    var ok=renderStableCanvas(m);
    if(!ok && window.J90_USE_WEBGL===true) ok=renderWebGL(m);
    if(!ok)renderFallback(m);
    updateBadge();
  }

  function hook(){
    if(typeof window.mgrDraw2D==='function'&&!window.mgrDraw2D.__j90v4){
      var old=window.mgrDraw2D;
      var wrapped=function(){draw();};
      wrapped.__j90v4=true;wrapped.__original=old;window.mgrDraw2D=wrapped;
    }
    var c=document.getElementById('j90MatchCanvas');
    if(c&&!c.__j90v4Resize){
      c.__j90v4Resize=true;
      if(window.ResizeObserver) new ResizeObserver(function(){var m=window.S&&S.match2d;if(m){m._cw=0;m._ch=0;ensureCanvas(m);draw();}}).observe(c);
      window.addEventListener('orientationchange',function(){setTimeout(function(){var m=window.S&&S.match2d;if(m){m._cw=0;m._ch=0;ensureCanvas(m);draw();}},120);},{passive:true});
    }
    var m=window.S&&S.match2d;if(m)draw();
  }
  var tries=0;
  function boot(){if(tries++<50){hook();if(!document.getElementById('j90MatchCanvas'))setTimeout(boot,160);}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.J90Match2DV4={version:'5.0',draw:draw,ensure:ensureCanvas};window.J90Match2DV5=window.J90Match2DV4;
})();