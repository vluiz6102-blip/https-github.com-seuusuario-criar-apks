/* Jornada 90 Mobile Squad Cards 1.0
 * Canvas tactical lineup preview, touch-safe and lightweight.
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
  var POS=[
    [.50,.86], [.13,.69],[.37,.72],[.63,.72],[.87,.69],
    [.29,.51],[.50,.45],[.71,.51],
    [.18,.22],[.50,.15],[.82,.22]
  ];

  function esc3(v){return typeof esc==='function'?esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
  function rosterData(){
    var out=[];
    try{
      var r=S&&Array.isArray(S.roster)?S.roster:[];
      var ids=S&&S.lineup&&Array.isArray(S.lineup.slots)?S.lineup.slots:[];
      for(var i=0;i<ids.length;i++){var p=r.find(function(x){return x.id===ids[i]});if(p)out.push(p)}
    }catch(e){}
    if(out.length>=11)return out.slice(0,11);
    return SAMPLE.map(function(a,i){return{id:'sample_'+i,name:a[0],ovr:a[1],position:a[2],pac:a[3],sho:a[4],pas:a[5],dri:a[6],def:a[7],phy:a[8],sample:true}})
  }

  function draw(){
    var c=document.getElementById('j90SquadCanvas');if(!c)return;
    var box=c.parentElement,w=Math.max(300,Math.floor(box.clientWidth)),h=Math.max(420,Math.floor(box.clientHeight));
    var d=Math.min(2,devicePixelRatio||1);
    if(c.width!==Math.round(w*d)||c.height!==Math.round(h*d)){c.width=Math.round(w*d);c.height=Math.round(h*d)}
    var g=c.getContext('2d');g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);
    g.fillStyle='#0b4b2d';g.fillRect(0,0,w,h);
    for(var i=0;i<12;i++){g.fillStyle=i%2?'rgba(255,255,255,.018)':'rgba(0,0,0,.02)';g.fillRect(i*w/12,0,w/12,h)}
    g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1;g.strokeRect(7,7,w-14,h-14);
    g.beginPath();g.moveTo(7,h/2);g.lineTo(w-7,h/2);g.stroke();g.beginPath();g.arc(w/2,h/2,Math.min(w,h)*.10,0,Math.PI*2);g.stroke();
    var players=rosterData(),cw=Math.max(76,Math.min(104,w*.20)),ch=Math.max(92,Math.min(122,h*.18));
    c.__j90Cards=[];
    players.forEach(function(p,i){
      var pos=POS[i]||[.5,.5],x=pos[0]*w,y=pos[1]*h;
      var rating=Number(p.ovr)||82,position=String(p.position||'').toUpperCase();
      var col=/GK|GOL/.test(position)?'#c99b32':'#caa13e';
      var left=x-cw/2,top=y-ch/2;
      g.save();
      g.fillStyle='rgba(0,0,0,.42)';g.beginPath();g.roundRect(left+3,top+4,cw,ch,10);g.fill();
      var grad=g.createLinearGradient(left,top,left,top+ch);grad.addColorStop(0,'#ead38b');grad.addColorStop(.42,'#b89442');grad.addColorStop(1,'#6d5524');
      g.fillStyle=grad;g.beginPath();g.roundRect(left,top,cw,ch,10);g.fill();
      g.strokeStyle='#f6e4a7';g.lineWidth=1;g.stroke();
      g.fillStyle='#151515';g.font='900 '+Math.max(20,cw*.27)+'px system-ui';g.textAlign='left';g.fillText(String(rating),left+8,top+28);
      g.font='800 10px system-ui';g.fillText(position,left+9,top+42);
      g.fillStyle='#fff';g.font='900 '+Math.max(9,cw*.105)+'px system-ui';g.textAlign='center';
      var name=String(p.name||'Jogador').split(' ').slice(-1)[0].toUpperCase();
      g.fillText(name.slice(0,13),x,top+ch-31);
      g.font='800 8px system-ui';g.fillStyle='rgba(255,255,255,.92)';
      g.fillText('PAC '+(p.pac||85)+'  SHO '+(p.sho||80)+'  PAS '+(p.pas||80),x,top+ch-17);
      g.fillText('DRI '+(p.dri||82)+'  DEF '+(p.def||55)+'  PHY '+(p.phy||78),x,top+ch-7);
      g.fillStyle='rgba(255,255,255,.28)';g.beginPath();g.arc(x,top+ch*.48,cw*.16,0,Math.PI*2);g.fill();
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
      var html='<section id="j90SquadCards" class="j90SquadCards"><div class="j90SquadHead"><div><b>ESCALAÇÃO 2D · 4-3-3</b><small>Cards grandes, toque para detalhes e arraste para trocar posições.</small></div><span>IA READY</span></div><div class="j90SquadCanvasWrap"><canvas id="j90SquadCanvas"></canvas></div><div class="j90SquadHint">Prévia visual inspirada no modelo solicitado. A escalação real do clube continua ligada ao elenco salvo.</div></section>';
      setTimeout(function(){
        var c=document.getElementById('j90SquadCanvas');if(!c)return;
        draw();
        if(!c.__j90Pointer){
          c.__j90Pointer=true;
          var drag=null;
          c.addEventListener('pointerdown',function(e){
            var r=c.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
            drag=(c.__j90Cards||[]).find(function(z){return x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h});
            if(drag)c.setPointerCapture(e.pointerId);
          });
          c.addEventListener('pointerup',function(e){
            if(!drag)return;
            var r=c.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
            var hit=(c.__j90Cards||[]).find(function(z){return z!==drag&&x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h});
            if(hit&&drag.p&&hit.p){
              var a=drag.p,b=hit.p;drag.p=b;hit.p=a;
              draw();
              if(typeof toast==='function')toast('Posições trocadas',a.name+' ↔ '+b.name);
            }else if(typeof toast==='function'){
              toast(drag.p.name,(drag.p.position||'Jogador')+' · OVR '+drag.p.ovr);
            }
            drag=null;
          });
        }
      },0);
      return html+base;
    }
    wrapped.__j90SquadCards=true;wrapped.__original=old;window.mgrLineupView=wrapped;
    var s=document.createElement('style');s.id='j90-squad-cards-style';s.textContent='.j90SquadCards{background:#07130d;border:1px solid #214f35;border-radius:16px;padding:10px;margin-bottom:10px}.j90SquadHead{display:flex;justify-content:space-between;gap:8px;align-items:center;color:#f4f4f4;font:900 13px system-ui}.j90SquadHead small{display:block;color:#8fa99b;font:700 9px system-ui;margin-top:3px}.j90SquadHead span{color:#58e69a;font:900 8px system-ui;border:1px solid #286443;border-radius:99px;padding:5px 7px}.j90SquadCanvasWrap{width:100%;height:520px;border-radius:12px;overflow:hidden;margin-top:8px;background:#0b4b2d}.j90SquadCanvas{display:block;width:100%;height:100%}.j90SquadHint{color:#93aa9d;font:700 9px system-ui;line-height:1.35;margin-top:6px}@media(max-width:390px){.j90SquadCanvasWrap{height:500px}}';
    document.head.appendChild(s);
  }
  function boot(){mount()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.J90SquadCards={draw:draw,version:'1.0'};
})();