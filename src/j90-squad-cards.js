/* Jornada 90 Mobile Squad Cards 2.0
 * Responsive gold/silver/bronze player cards.
 * Canvas remains touch-safe; all text is clipped inside the card.
 */
(function(){
  'use strict';
  if(window.__J90_SQUAD_CARDS__)return;
  window.__J90_SQUAD_CARDS__=true;

  var SAMPLE=[
    ['Alisson',87,'GK',50,87,82,89,50,88],
    ["O'Reilly",83,'LB',85,60,78,82,74,76],
    ['Lacroix',82,'CB',79,43,72,63,84,82],
    ['Khusanov',82,'CB',78,38,70,58,86,84],
    ['Frimpong',81,'RB',95,58,76,87,72,78],
    ['Tonali',85,'CM',82,67,89,84,79,82],
    ['Szoboszlai',86,'CAM',76,84,91,86,55,77],
    ['Gravenberch',85,'CM',82,71,86,88,63,82],
    ['Rashford',82,'LW',93,84,78,88,45,76],
    ['Ekitike',85,'ST',91,88,73,84,43,82],
    ['Doku',84,'RW',95,78,79,93,42,68]
  ];
  var POS=[[.50,.86],[.13,.69],[.37,.72],[.63,.72],[.87,.69],[.29,.51],[.50,.45],[.71,.51],[.18,.22],[.50,.15],[.82,.22]];
  function tier(ovr){return ovr>=80?'gold':ovr>=70?'silver':'bronze';}
  function esc3(v){return typeof esc==='function'?esc(v):String(v==null?'':v);}
  function rosterData(){
    var out=[];
    try{
      var r=S&&Array.isArray(S.roster)?S.roster:[];
      var club=S&&S.managerClub||'Clube';
      var plan=window.J90_LINEUP_AI&&r.length?window.J90_LINEUP_AI.get(club,r,S&&S.tacticPlan&&S.tacticPlan.formation):null;
      if(plan&&Array.isArray(plan.players)&&plan.players.length>=11)return plan.players.slice(0,11);
      var ids=S&&S.lineup&&Array.isArray(S.lineup.slots)?S.lineup.slots:[];
      for(var i=0;i<ids.length;i++){var p=r.find(function(x){return x.id===ids[i]});if(p)out.push(p);}
    }catch(e){}
    if(out.length>=11)return out.slice(0,11);
    return SAMPLE.map(function(a,i){return{id:'sample_'+i,name:a[0],ovr:a[1],position:a[2],pac:a[3],sho:a[4],pas:a[5],dri:a[6],def:a[7],phy:a[8],sample:true};});
  }
  function tierStyle(g,t,left,top,cw,ch){
    var cfg=t==='gold'?['#f8e6a9','#b88720','#6c5118','#fff1b8']:t==='silver'?['#f0f3f6','#9ba4ad','#5a636d','#fff']:['#d9a071','#8a4d22','#5b2e14','#f2c49b'];
    var grad=g.createLinearGradient(left,top,left,top+ch);grad.addColorStop(0,cfg[0]);grad.addColorStop(.42,cfg[1]);grad.addColorStop(1,cfg[2]);
    g.fillStyle='rgba(0,0,0,.42)';g.beginPath();g.roundRect(left+3,top+4,cw,ch,12);g.fill();
    g.fillStyle=grad;g.beginPath();g.roundRect(left,top,cw,ch,12);g.fill();
    g.strokeStyle=cfg[3];g.lineWidth=1.2;g.stroke();
    return cfg;
  }
  function fitText(g,text,maxWidth,maxSize,minSize,weight){
    var size=maxSize;g.font=(weight||900)+' '+size+'px system-ui';
    while(size>minSize&&g.measureText(text).width>maxWidth){size--;g.font=(weight||900)+' '+size+'px system-ui';}
    return size;
  }
  function draw(){
    var c=document.getElementById('j90SquadCanvas');if(!c)return;
    var box=c.parentElement,w=Math.max(300,Math.floor(box.clientWidth)),h=Math.max(480,Math.floor(box.clientHeight));
    var d=Math.min(2,window.devicePixelRatio||1);
    if(c.width!==Math.round(w*d)||c.height!==Math.round(h*d)){c.width=Math.round(w*d);c.height=Math.round(h*d);}
    var g=c.getContext('2d');if(!g)return;
    g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);
    g.fillStyle='#0a4a2c';g.fillRect(0,0,w,h);
    for(var i=0;i<12;i++){g.fillStyle=i%2?'rgba(255,255,255,.016)':'rgba(0,0,0,.023)';g.fillRect(i*w/12,0,w/12,h);}
    g.strokeStyle='rgba(255,255,255,.58)';g.lineWidth=1;g.strokeRect(7,7,w-14,h-14);
    g.beginPath();g.moveTo(7,h/2);g.lineTo(w-7,h/2);g.stroke();g.beginPath();g.arc(w/2,h/2,Math.min(w,h)*.10,0,Math.PI*2);g.stroke();
    var players=rosterData(),cw=Math.max(88,Math.min(118,w*.245)),ch=Math.max(112,Math.min(142,h*.205));
    c.__j90Cards=[];
    players.forEach(function(p,i){
      var pos=POS[i]||[.5,.5],x=pos[0]*w,y=pos[1]*h,left=x-cw/2,top=y-ch/2,ovr=Number(p.ovr)||60,t=tier(ovr);
      var cfg=tierStyle(g,t,left,top,cw,ch);
      g.save();
      g.beginPath();g.roundRect(left,top,cw,ch,12);g.clip();

      g.fillStyle='rgba(255,255,255,.14)';g.beginPath();g.arc(x,top+ch*.46,cw*.24,0,Math.PI*2);g.fill();
      g.fillStyle='#111';g.font='900 '+Math.max(22,cw*.25)+'px system-ui';g.textAlign='left';g.textBaseline='alphabetic';g.fillText(String(ovr),left+8,top+30);
      g.font='800 9px system-ui';g.fillText(String(p.position||'').toUpperCase().slice(0,6),left+9,top+43);

      var first=String(p.name||'Jogador').trim().split(' ')[0].toUpperCase(),last=String(p.name||'Jogador').trim().split(' ').slice(-1)[0].toUpperCase();
      var nm=(first===last?last:first+' '+last);
      var ns=fitText(g,nm,cw-14,12,8,900);
      g.font='900 '+ns+'px system-ui';g.textAlign='center';g.fillStyle='#fff';g.fillText(nm,x,top+ch-42);

      var small='PAC '+(p.pac||p.pace||78)+' · SHO '+(p.sho||p.shoot||72)+' · PAS '+(p.pas||p.pass||72);
      var small2='DRI '+(p.dri||p.dribble||72)+' · DEF '+(p.def||p.defend||55)+' · PHY '+(p.phy||p.physical||75);
      g.font='800 '+Math.max(7,Math.min(9,cw*.09))+'px system-ui';g.fillStyle='rgba(255,255,255,.94)';
      g.fillText(small,x,top+ch-24);g.fillText(small2,x,top+ch-10);

      var badge=t==='gold'?'OURO':t==='silver'?'PRATA':'BRONZE';
      g.fillStyle='rgba(0,0,0,.28)';g.fillRect(left,top+ch*.52,cw,18);
      g.font='900 8px system-ui';g.fillStyle='#fff';g.textAlign='center';g.fillText(badge,x,top+ch*.52+12);
      g.restore();

      c.__j90Cards.push({p:p,x:left,y:top,w:cw,h:ch,index:i});
    });
  }

  function mount(){
    if(document.getElementById('j90SquadCards'))return;
    if(typeof window.mgrLineupView!=='function')return;
    var old=window.mgrLineupView;
    function wrapped(){
      var base=old.apply(this,arguments);
      var html='<section id="j90SquadCards" class="j90SquadCards"><div class="j90SquadHead"><div><b>ESCALAÇÃO 2D · CARDS</b><small>Ouro, prata e bronze. Texto adaptável e sempre preso dentro da carta.</small></div><span>IA READY</span></div><div class="j90SquadLegend"><span class="gold">OURO · 80+</span><span class="silver">PRATA · 70–79</span><span class="bronze">BRONZE · 69−</span></div><div class="j90SquadCanvasWrap"><canvas id="j90SquadCanvas"></canvas></div><div class="j90SquadHint">Toque para detalhes. Arraste uma carta sobre outra para trocar posições.</div></section>';
      setTimeout(function(){
        var c=document.getElementById('j90SquadCanvas');if(!c)return;draw();
        if(!c.__j90Pointer){
          c.__j90Pointer=true;var drag=null;
          c.addEventListener('pointerdown',function(e){var r=c.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;drag=(c.__j90Cards||[]).find(function(z){return x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h;});if(drag){try{c.setPointerCapture(e.pointerId);}catch(_){} }});
          c.addEventListener('pointerup',function(e){if(!drag)return;var r=c.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,hit=(c.__j90Cards||[]).find(function(z){return z!==drag&&x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h;});
            if(hit&&drag.p&&hit.p){var a=drag.p,b=hit.p;drag.p=b;hit.p=a;draw();if(typeof toast==='function')toast('Posições trocadas',a.name+' ↔ '+b.name);}
            else if(typeof toast==='function')toast(drag.p.name,(drag.p.position||'Jogador')+' · OVR '+drag.p.ovr);
            drag=null;
          });
        }
      },0);
      return html+base;
    }
    wrapped.__j90SquadCards=true;wrapped.__original=old;window.mgrLineupView=wrapped;
    var s=document.createElement('style');s.id='j90-squad-cards-style';
    s.textContent=[
      '.j90SquadCards{background:#07130d;border:1px solid #214f35;border-radius:18px;padding:14px;margin-bottom:12px;overflow:hidden}',
      '.j90SquadHead{display:flex;justify-content:space-between;gap:12px;align-items:center;color:#f4f4f4;font:900 14px system-ui}',
      '.j90SquadHead>div{min-width:0}.j90SquadHead small{display:block;color:#a8b8ae;font:700 11px system-ui;line-height:1.35;margin-top:5px}',
      '.j90SquadHead span{flex:0 0 auto;color:#66e69d;font:900 10px system-ui;border:1px solid #286443;border-radius:999px;padding:7px 9px}',
      '.j90SquadLegend{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.j90SquadLegend span{border-radius:999px;padding:6px 9px;font:900 9px system-ui}.j90SquadLegend .gold{background:#7d611f;color:#ffe9a1}.j90SquadLegend .silver{background:#59616a;color:#f2f5f8}.j90SquadLegend .bronze{background:#6d3c1e;color:#f4c39d}',
      '.j90SquadCanvasWrap{width:100%;height:560px;border-radius:14px;overflow:hidden;margin-top:10px;background:#0b4b2d;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}',
      '.j90SquadCanvas{display:block;width:100%;height:100%;touch-action:none}.j90SquadHint{color:#a6b5ac;font:700 11px system-ui;line-height:1.42;margin-top:8px}',
      '@media(max-width:390px){.j90SquadCanvasWrap{height:520px}.j90SquadHead{align-items:flex-start}.j90SquadHead span{font-size:9px}}'
    ].join('');
    document.head.appendChild(s);
  }
  function boot(){mount();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.J90SquadCards={draw:draw,version:'2.0'};
})();