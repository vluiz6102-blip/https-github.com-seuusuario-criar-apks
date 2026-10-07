/* Jornada 90 Match Events 1.0
 * Referee, semi-automatic offside AI, discipline, injuries and stadium incidents.
 * Presentation-only event layer: it observes the existing match simulation and never
 * creates a second animation loop.
 */
(function(){
  'use strict';
  if(window.__J90_MATCH_EVENTS__) return;
  window.__J90_MATCH_EVENTS__=true;

  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
  var escLocal=function(v){
    return typeof esc==='function'?esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  };
  var role=function(p){return String(p&&p.position||p&&p.role||p&&p.aiRole||'').toUpperCase()};
  var players=function(m,side){return side==='home'?(m.players||[]):(m.oppPlayers||[])};
  var allPlayers=function(m){return (m.players||[]).concat(m.oppPlayers||[])};
  var rnd=function(m){
    m._j90EventSeed=(Math.imul(1664525,(m._j90EventSeed==null?((Date.now()/1000)|0):m._j90EventSeed)>>>0)+1013904223)>>>0;
    return (m._j90EventSeed>>>0)/4294967296;
  };
  function event(m,text,key,cd){
    if(!m||typeof mgrMatchEvent!=='function')return;
    m._j90EventCD=m._j90EventCD||{};
    var now=Number(m._simClock)||0,last=Number(m._j90EventCD[key])||-999;
    if(cd&&now-last<cd)return;
    m._j90EventCD[key]=now;
    mgrMatchEvent(text);
  }
  function find(m,side,id){return players(m,side).find(function(p){return p&&p.id===id})||null}
  function opponent(side){return side==='home'?'away':'home'}

  function ensure(m){
    if(!m)return;
    if(!m._j90EventState)m._j90EventState={
      processedActions:0,seenActions:{},processedPassClock:-1,lastClock:-1,
      cards:{},injuries:{},offside:null,referee:{x:.5,y:.45},
      invader:null,flare:null,crowd:0,incidentUntil:0,lastInjuryClock:-999,
      nextCrowdPulse:0,lastScore:Number(m.homeScore||0)+':'+Number(m.awayScore||0),
      events:0,
      refereeAI:{strictness:.52,advantage:0,pressure:0,varReviews:0,decisions:0,lastDecision:-999,lastVAR:-999,profile:'equilibrado'},
      crowdMomentum:0,crowdBase:0,crowdNoise:0,crowdAttendance:0,crowdCapacity:0,
      crowdProfile:null,stadiumProfile:null
    };
    m._j90EventState.crowd=cl(Number(m._j90EventState.crowd)||0,0,1);
    m._j90EventState.referee=m._j90EventState.referee||{x:.5,y:.45};
  }

  function crowdProfile(m){
    var n=String(m&&m.home||'').toLowerCase();
    var p={base:.48,energy:.50,ultras:.22,capacity:18000,style:'regional',name:'Estádio local'};
    if(/real madrid/.test(n))p={base:.94,energy:.88,ultras:.48,capacity:76000,style:'gigante',name:'Santiago Bernabéu'};
    else if(/paris saint-germain|\bpsg\b/.test(n))p={base:.86,energy:.92,ultras:.88,capacity:48000,style:'ultras',name:'Parc des Princes'};
    else if(/flamengo/.test(n))p={base:.93,energy:.97,ultras:.78,capacity:78838,style:'popular',name:'Maracanã'};
    else if(/corinthians/.test(n))p={base:.94,energy:.99,ultras:.84,capacity:49205,style:'popular',name:'Neo Química Arena'};
    else if(/palmeiras/.test(n))p={base:.90,energy:.91,ultras:.76,capacity:43713,style:'popular',name:'Allianz Parque'};
    else if(/barcelona|barça/.test(n))p={base:.91,energy:.84,ultras:.44,capacity:99354,style:'gigante',name:'Spotify Camp Nou'};
    else if(/liverpool/.test(n))p={base:.90,energy:.95,ultras:.70,capacity:61276,style:'kop',name:'Anfield'};
    else if(/borussia dortmund/.test(n))p={base:.93,energy:.98,ultras:.90,capacity:81365,style:'terrace',name:'Signal Iduna Park'};
    else if(/bayern/.test(n))p={base:.91,energy:.86,ultras:.48,capacity:75024,style:'gigante',name:'Allianz Arena'};
    else if(/boca juniors/.test(n))p={base:.92,energy:.99,ultras:.92,capacity:54000,style:'popular',name:'La Bombonera'};
    else if(/river plate/.test(n))p={base:.92,energy:.95,ultras:.76,capacity:84567,style:'gigante',name:'Monumental'};
    else if(/são paulo/.test(n))p={base:.88,energy:.86,ultras:.60,capacity:66795,style:'popular',name:'MorumBIS'};
    else if(/grêmio/.test(n))p={base:.86,energy:.90,ultras:.70,capacity:55662,style:'popular',name:'Arena do Grêmio'};
    else if(/internacional/.test(n))p={base:.86,energy:.88,ultras:.62,capacity:50842,style:'popular',name:'Beira-Rio'};
    else if(/atlético-mg|atletico mineiro/.test(n))p={base:.89,energy:.96,ultras:.78,capacity:46000,style:'popular',name:'Arena MRV'};
    else if(/cruzeiro/.test(n))p={base:.87,energy:.90,ultras:.70,capacity:61600,style:'popular',name:'Mineirão'};
    else if(/benfica/.test(n))p={base:.91,energy:.86,ultras:.62,capacity:65647,style:'gigante',name:'Estádio da Luz'};
    else if(/ajax/.test(n))p={base:.82,energy:.78,ultras:.42,capacity:55865,style:'ultras',name:'Johan Cruyff Arena'};
    else if(/galatasaray/.test(n))p={base:.90,energy:.99,ultras:.92,capacity:53537,style:'ultras',name:'RAMS Park'};
    else if(/celtic/.test(n))p={base:.88,energy:.98,ultras:.88,capacity:60411,style:'terrace',name:'Celtic Park'};
    else if(/seleção|brazil|brasil/.test(n))p={base:.96,energy:.96,ultras:.58,capacity:70000,style:'national',name:'Estádio da Seleção'};
    else if(/argentina/.test(n))p={base:.95,energy:.99,ultras:.70,capacity:70000,style:'national',name:'Estádio da Seleção'};
    return p;
  }
  function crowdAI(m,reason){
    ensure(m);
    var st=m._j90EventState,p=st.crowdProfile||crowdProfile(m);
    st.crowdProfile=p;
    st.stadiumProfile={name:p.name,capacity:p.capacity,style:p.style};
    var momentum=cl(Number(st.crowdMomentum)||0,0,1);
    var noise=cl(p.base*.52+p.energy*.25+p.ultras*.13+momentum*.24,0,1);
    if(reason==='danger')noise=cl(noise+.18,0,1);
    if(reason==='shot')noise=cl(noise+.10,0,1);
    if(reason==='goal')noise=cl(noise+.38,0,1);
    if(reason==='save')noise=cl(noise+.16,0,1);
    if(reason==='red')noise=cl(noise+.20,0,1);
    st.crowdBase=p.base;
    st.crowdNoise=noise;
    st.crowdAttendance=Math.round(p.capacity*(.72+.24*p.base));
    st.crowd=cl(Math.max(st.crowd,noise),0,1);
    if(window.J90Ambience&&typeof window.J90Ambience.setCrowdLevel==='function')window.J90Ambience.setCrowdLevel(st.crowd);
    if(reason==='goal'&&window.J90Ambience&&typeof window.J90Ambience.setGoalLevel==='function')window.J90Ambience.setGoalLevel(cl(st.crowd+.18,0,1));
  }

  function refereeAI(m){
    ensure(m);
    var st=m._j90EventState,now=Number(m._simClock)||0;
    if(!st.refereeAI)st.refereeAI={strictness:.52,advantage:0,pressure:0,varReviews:0,decisions:0,lastDecision:-999,lastVAR:-999,profile:'equilibrado'};
    var r=st.refereeAI;
    r.pressure=cl((Number(st.crowd)||0)*.52+(Number(st.crowdMomentum)||0)*.34,0,1);
    r.strictness=cl(.48+r.pressure*.10,0,1);
    if(now-r.lastDecision>5)r.advantage=cl(r.advantage*.94,0,1);
  }
  function refereeDecision(m,ctx){
    ensure(m);refereeAI(m);
    var st=m._j90EventState,r=st.refereeAI,now=Number(m._simClock)||0;
    if(!ctx||now-r.lastDecision<.35)return null;
    var severity=cl(Number(ctx.severity)||0,0,1),area=Number(ctx.areaX),decision='play_on',confidence=.58;
    if(ctx.foul!==false){
      if(severity>.82){decision='red';confidence=.88}
      else if(severity>.55){decision='yellow';confidence=.78}
      else if(Number.isFinite(area)&&area>.86){decision='penalty';confidence=.82}
      else {decision='foul';confidence=.72}
    }
    if(decision==='foul'&&severity<.30&&Number(ctx.attackingAdvantage||0)>.55){decision='advantage';confidence=.76;r.advantage=1}
    r.lastDecision=now;r.decisions++;
    return {decision:decision,confidence:confidence,pressure:r.pressure};
  }
  function varReview(m,decision,ctx){
    ensure(m);var st=m._j90EventState,r=st.refereeAI,now=Number(m._simClock)||0;
    if(!ctx||!decision||now-(r.lastVAR||-999)<6)return decision;
    if(!/penalty|red|goal/.test(decision.decision||'')||Number(ctx.ambiguity||0)<.42)return decision;
    r.lastVAR=now;r.varReviews++;
    var corrected=decision.decision;
    if(decision.decision==='penalty'&&Number(ctx.areaX)<.86)corrected='foul';
    if(decision.decision==='red'&&Number(ctx.severity)<.88)corrected='yellow';
    if(corrected!==decision.decision){
      event(m,'🖥️ VAR: decisão corrigida após revisão.','var_'+Math.floor(now),5);
      return {decision:corrected,confidence:.91,reviewed:true};
    }
    event(m,'🖥️ VAR: decisão de campo mantida após revisão.','var_hold_'+Math.floor(now),5);
    return {decision:decision.decision,confidence:.90,reviewed:true};
  }
  function crowdPressuresReferee(m,decision,ctx){
    ensure(m);var st=m._j90EventState,profile=st.crowdProfile||crowdProfile(m);
    var level=cl(Number(st.crowd)||0,0,1),pressure=cl(level*.60+Number(profile.ultras||0)*.30+(Number(st.crowdMomentum)||0)*.20,0,1);
    st.refereeAI=st.refereeAI||{strictness:.52,advantage:0,pressure:0,varReviews:0,decisions:0,lastDecision:-999,lastVAR:-999};
    st.refereeAI.pressure=pressure;
    if(level>.82&&ctx&&ctx.attackingTeam==='home'&&decision&&decision.decision==='foul')event(m,'🗣️ A torcida pressiona o árbitro por uma decisão favorável.','ref_pressure_'+Math.floor(Number(m._simClock)||0),3);
    if(level>.90&&decision&&decision.decision==='play_on')event(m,'📣 Vaias e protestos aumentam a pressão sobre a arbitragem.','ref_boo_'+Math.floor(Number(m._simClock)||0),4);
  }


  /* Dynamic stadium mosaic / tifo layer. Uses procedural vector art inspired by documented
     supporter traditions, not copied photographic assets. It adapts to club + occasion. */
  function mosaicProfile(m,occasion){
    var n=String(m&&m.home||'').toLowerCase(),o=String(occasion||'').toLowerCase();
    var p={style:'crest',colors:['#e8e8e8','#164b31','#0b0b0b'],title:'DIA DE JOGO',intensity:.35};
    if(/corinthians/.test(n))p={style:'gaviao',colors:['#050505','#f4f4f4','#bcbcbc'],title:/flamengo|palmeiras|sao paulo|são paulo/.test(String(m.away||'').toLowerCase())?'BANDO DE LOUCOS':'VAI PRA CIMA, TIMÃO',intensity:.95};
    else if(/flamengo/.test(n))p={style:'rubro',colors:['#111','#e31b23','#fff'],title:/final|copa|libertadores|decis/.test(o)?'MENGÃO':'NAÇÃO RUBRO-NEGRA',intensity:.92};
    else if(/palmeiras/.test(n))p={style:'caravela',colors:['#006437','#fff','#b8d9c5'],title:'AVANTI PALESTRA',intensity:.82};
    else if(/real madrid/.test(n))p={style:'crown',colors:['#f7f7f7','#7b1fa2','#c9b458'],title:'HALA MADRID',intensity:.82};
    else if(/paris saint-germain|\\bpsg\\b/.test(n))p={style:'ultras',colors:['#004170','#da291c','#fff'],title:'ICI C\'EST PARIS',intensity:.94};
    else if(/borussia dortmund/.test(n))p={style:'wall',colors:['#ffd500','#111','#f2f2f2'],title:'DIE GELBE WAND',intensity:1};
    else if(/galatasaray/.test(n))p={style:'lion',colors:['#a90432','#f5b335','#fff'],title:'CIM BOM BOM',intensity:.98};
    else if(/liverpool/.test(n))p={style:'kop',colors:['#c8102e','#fff','#f2c75c'],title:'YOU\'LL NEVER WALK ALONE',intensity:.88};
    else if(/boca juniors/.test(n))p={style:'bluegold',colors:['#003b7a','#f6c800','#fff'],title:'BOCA',intensity:.94};
    else if(/river plate/.test(n))p={style:'band',colors:['#fff','#d71920','#111'],title:'RIVER PLATE',intensity:.90};
    else if(/barcelona|barça/.test(n))p={style:'senyera',colors:['#a50044','#004d98','#edbb00'],title:'MÉS QUE UN CLUB',intensity:.82};
    return p;
  }
  function drawMosaic(m){
    try{
      var st=m&&m._j90EventState;if(!st||!st.mosaic||!st.mosaic.active)return;
      var c=document.getElementById('j90EventOverlayCanvas');if(!c)return;var g=c.getContext('2d');if(!g)return;
      var w=c.clientWidth||c.width,h=c.clientHeight||c.height;if(!w||!h)return;
      var q=st.mosaic,p=q.profile||mosaicProfile(m,q.occasion),t=Math.max(0,Math.min(1,(Number(q.t)||0))),cols=p.colors;
      g.save();g.globalAlpha=.82*(1-Math.abs(t-.55)*.12);g.clearRect(0,0,w,h);
      var top=h*.06,bottom=h*.31,left=w*.04,right=w*.96,rows=7,columns=48,cw=(right-left)/columns,ch=(bottom-top)/rows;
      for(var y=0;y<rows;y++)for(var x=0;x<columns;x++){
        var nx=x/columns,ny=y/rows,sel=0;
        if(p.style==='wall')sel=(x+y)%2;
        else if(p.style==='gaviao')sel=Math.abs(ny-.5)<.23&&Math.abs(nx-.5)<.20?1:0;
        else if(p.style==='crown')sel=ny<.25&&(nx>.30&&nx<.70)?2:((x+y)%3===0?1:0);
        else if(p.style==='caravela')sel=(nx>.28&&nx<.72&&ny>.12&&ny<.88)?1:((x+2*y)%4===0?2:0);
        else if(p.style==='lion')sel=Math.abs(nx-.5)<.16&&Math.abs(ny-.52)<.42?1:2;
        else if(p.style==='kop')sel=(y===3||x%9<2)?1:0;
        else if(p.style==='ultras')sel=(Math.abs(nx-.5)<.10||y===3)?1:(x+y)%5===0?2:0;
        else if(p.style==='senyera')sel=x%4<2?0:(x%4===2?1:2);
        else if(p.style==='band')sel=Math.abs(ny-.5)<.20?1:(x+y)%5===0?2:0;
        else if(p.style==='bluegold')sel=x%3===0?1:0;
        else sel=(x+y)%3===0?1:((x*3+y)%7===0?2:0);
        g.fillStyle=cols[sel];g.fillRect(left+x*cw,top+y*ch,cw+.6,ch+.6);
      }
      g.fillStyle='rgba(0,0,0,.42)';g.fillRect(w*.16,bottom+h*.018,w*.68,h*.055);
      g.fillStyle='#fff';g.font='900 '+Math.max(9,Math.round(h*.045))+'px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(p.title,w*.5,bottom+h*.045);
      g.restore();
    }catch(e){}
  }
  function updateMosaic(m){
    ensure(m);var st=m._j90EventState,now=Number(m._simClock)||0;
    var score=String(m.homeScore||0)+':'+String(m.awayScore||0),profile=st.crowdProfile||crowdProfile(m);
    var derby=String(m.home||'').toLowerCase()===String(m.away||'').toLowerCase()?false:/derby|clássico|classico|final|semifinal|quartas|libertadores|copa do brasil|champions/.test(String(m.competition||m.stage||m.matchType||'').toLowerCase());
    var big=Number(profile.capacity||0)>=45000||derby;
    if(!st.mosaic&&big){st.mosaic={active:true,shown:false,occasion:String(m.competition||m.stage||'jogo grande'),profile:mosaicProfile(m,String(m.competition||m.stage||'')),start:now,t:0,score:score};}
    if(st.mosaic){
      if(score!==st.mosaic.score){st.mosaic.score=score;st.mosaic.active=false;st.mosaic.celebrationUntil=now+5;}
      if(st.mosaic.active)st.mosaic.t=cl((now-st.mosaic.start)/4,0,1);
      drawMosaic(m);
    }
  }

  function discipline(m,side,p,kind){
    if(!p)return;
    ensure(m);
    var id=String(p.id),s=m._j90EventState.cards;
    s[id]=s[id]||{yellow:0,red:0};
    if(s[id].red)return;
    if(kind==='second'){
      s[id].yellow=2;s[id].red=1;
      p.j90Red=true;p.j90Suspended=true;
      event(m,'🟥 Expulsão! '+escLocal(p.name||'Jogador')+' recebe o segundo amarelo.','red_'+id,0);
      m._j90EventState.crowd=1;crowdAI(m,'red');
      return;
    }
    if(kind==='red'){
      s[id].red=1;p.j90Red=true;p.j90Suspended=true;
      event(m,'🟥 Cartão vermelho! '+escLocal(p.name||'Jogador')+' é expulso.','red_'+id,0);
      m._j90EventState.crowd=1;
      return;
    }
    if(s[id].yellow>=1){discipline(m,side,p,'second');return}
    s[id].yellow=1;p.j90Yellow=true;
    event(m,'🟨 Cartão amarelo para '+escLocal(p.name||'Jogador')+'.','yellow_'+id,0);
    m._j90EventState.crowd=.82;crowdAI(m,'base');
  }

  function processActions(m){
    var st=m._j90EventState,h=m.actionHistory||[];
    for(var i=0;i<h.length;i++){
      var a=h[i]||{},sig=String(a.clock)+'|'+String(a.team)+'|'+String(a.player)+'|'+String(a.action);
      if(st.seenActions[sig])continue;
      st.seenActions[sig]=1;
      var side=a.team,p=find(m,side,a.player);
      if(!p)continue;
      if(a.action==='tackle'&&!a.success){
        var severity=rnd(m);
        var decision=refereeDecision(m,{severity:severity,areaX:Number(p.x),attackingAdvantage:Number(a.advantage||0),attackingTeam:side,foul:true});
        decision=varReview(m,decision,{severity:severity,areaX:Number(p.x),ambiguity:.35+rnd(m)*.55});
        crowdPressuresReferee(m,decision,{attackingTeam:side});
        if(decision&&decision.decision==='red')discipline(m,side,p,'red');
        else if(decision&&decision.decision==='yellow')discipline(m,side,p,'yellow');
        else if(decision&&decision.decision==='penalty')event(m,'⚽ Pênalti! O árbitro aponta para a marca da cal.','penalty_'+Math.floor(Number(a.clock)||0),0);
        else if(decision&&decision.decision==='advantage')event(m,'▶️ Lei da vantagem: o árbitro deixa o jogo seguir.','advantage_'+Math.floor(Number(a.clock)||0),2);
        else if(decision&&decision.decision==='foul')event(m,'O árbitro marca falta no duelo de '+escLocal(p.name||'jogador')+'.','foul_'+Math.floor(Number(a.clock)||0),1.4);
      }
      if(a.action==='shot'&&a.success){st.crowdMomentum=cl(st.crowdMomentum+.16,0,1);crowdAI(m,'shot');}
      if(a.action==='dribble'&&a.success&&rnd(m)<.18){st.crowdMomentum=cl(st.crowdMomentum+.12,0,1);crowdAI(m,'danger');}
      if(a.action==='cross'&&a.success&&rnd(m)<.08)event(m,'O cruzamento encontra a área e a torcida cresce.','cross_crowd',2.5);
    }
    st.processedActions=h.length;
    var keys=Object.keys(st.seenActions);if(keys.length>80)keys.slice(0,keys.length-60).forEach(function(k){delete st.seenActions[k]});
  }

  function defendersLine(m,side){
    return players(m,opponent(side)).filter(function(p){return role(p).indexOf('GK')<0});
  }

  function offsideCheck(m,ctx){
    if(!ctx||!ctx.receiver||!ctx.passer)return;
    var side=ctx.team,def=defendersLine(m,side),passerX=Number(ctx.passerX),receiverX=Number(ctx.receiverX);
    if(!Number.isFinite(passerX)||!Number.isFinite(receiverX)||def.length<2)return;
    var sorted=def.slice().sort(function(a,b){
      var ax=side==='home'?Number(a.x):1-Number(a.x),bx=side==='home'?Number(b.x):1-Number(b.x);
      return bx-ax;
    });
    var second=side==='home'?Number(sorted[1].x):1-Number(sorted[1].x);
    var atk=side==='home'?receiverX:1-receiverX;
    var passer=side==='home'?passerX:1-passerX;
    var margin=.018;
    var isAhead=atk>second+margin&&atk>passer+margin;
    if(!isAhead)return;
    var confidence=cl(.68+Math.abs(atk-second)*2.8+(ctx.kind==='through_ball'?.08:0),.70,.98);
    m._j90EventState.offside={
      active:true,team:side,player:ctx.receiver,confidence:confidence,
      until:(Number(m._simClock)||0)+2.8,clock:Number(ctx.clock)||0
    };
    event(m,'🚩 IA do árbitro: possível impedimento detectado ('+Math.round(confidence*100)+'%).','offside_'+Math.floor(Number(ctx.clock)||0),0);
    m._j90EventState.crowd=.9;
    if(m._j90EventState.offside){
      m._j90EventState.offside.confirmed=true;
      event(m,'🚩 Impedimento assinalado. O ataque é interrompido.','offside_confirm_'+Math.floor(Number(ctx.clock)||0),0);
    }
  }

  function injuryCheck(m){
    var st=m._j90EventState,now=Number(m._simClock)||0;
    if(now-st.lastInjuryClock<18)return;
    if(rnd(m)>.055)return;
    var pool=allPlayers(m).filter(function(p){
      return p&&!p.j90Red&&!st.injuries[String(p.id)]&&Number(p.energy||70)<48;
    });
    if(!pool.length)return;
    var p=pool[Math.floor(rnd(m)*pool.length)],sev=rnd(m);
    var type=sev<.58?'desconforto muscular':sev<.86?'torção leve':'lesão muscular';
    var recovery=sev<.58?2:sev<.86?5:12;
    st.injuries[String(p.id)]={name:p.name||'Jogador',type:type,recovery:recovery,clock:now};
    p.j90Injured=true;p.j90Injury=type;
    st.lastInjuryClock=now;
    event(m,'🚑 Lesão! '+escLocal(p.name||'Jogador')+' sente '+type+' e precisa de atendimento.','injury_'+p.id,0);
    st.crowd=1;
    if(typeof window.J90MatchEvents.onInjury==='function')window.J90MatchEvents.onInjury(m,p,recovery);
  }

  function pitchInvader(m){
    var st=m._j90EventState,now=Number(m._simClock)||0;
    if(st.invader&&now<st.invader.until)return;
    if(st.invader&&now>=st.invader.until)st.invader=null;
    if(now<28||rnd(m)>.006)return;
    st.invader={x:.18+rnd(m)*.64,y:.22+rnd(m)*.56,until:now+4.5};
    st.incidentUntil=now+4.5;st.crowd=1;
    event(m,'🚨 Invasão de campo! Um torcedor entra no gramado e os seguranças correm atrás.','pitch_invader',0);
  }

  function flare(m){
    var st=m._j90EventState,now=Number(m._simClock)||0;
    if(st.flare&&now<st.flare.until)return;
    if(st.flare&&now>=st.flare.until)st.flare=null;
    if(now<12||rnd(m)>.012)return;
    st.flare={side:rnd(m)<.5?'home':'away',until:now+6.5};
    st.crowd=1;
    event(m,'🔥 Sinalizadores acesos na arquibancada. A torcida aumenta o barulho.','flare',0);
  }

  function scorePulse(m){
    var st=m._j90EventState,score=Number(m.homeScore||0)+':'+Number(m.awayScore||0);
    if(score===st.lastScore)return;
    st.lastScore=score;st.crowdMomentum=1;crowdAI(m,'goal');st.crowd=1;
    event(m,'🏟️ O estádio explode após o gol!','goal_crowd',0);
  }

  function refereeFollow(m){
    var st=m._j90EventState,b=m.ball||{};
    st.referee.x=cl(Number(b.x||.5)+.035*(m.possessionTeam==='home'?-1:1),.08,.92);
    st.referee.y=cl(Number(b.y||.5)+.07,.08,.92);
  }

  function update(m){
    if(!m)return;
    ensure(m);
    var st=m._j90EventState,now=Number(m._simClock)||0;
    if(now===st.lastClock)return;
    st.lastClock=now;
    processActions(m);
    crowdAI(m,'base');
    scorePulse(m);
    updateMosaic(m);
    refereeFollow(m);
    if(now>=st.nextCrowdPulse){
      st.crowdMomentum=cl(st.crowdMomentum-.055,0,1);
      st.crowd=cl(st.crowd-.035,0,1);
      if(st.crowdMomentum>0)crowdAI(m,'base');
      st.nextCrowdPulse=now+.55;
    }
    injuryCheck(m);
    pitchInvader(m);
    flare(m);
    if(m._lastPassContext&&Number(m._lastPassContext.clock)!==st.processedPassClock){
      st.processedPassClock=Number(m._lastPassContext.clock);
      offsideCheck(m,m._lastPassContext);
    }
    if(st.offside&&now>=st.offside.until)st.offside=null;
  }

  function drawReferee(g,m,w,h){
    var st=m._j90EventState;if(!st)return;
    var x=st.referee.x*w,y=st.referee.y*h,s=Math.max(1,Math.min(w,h)/300);
    g.save();g.translate(x,y);
    g.fillStyle='rgba(0,0,0,.32)';g.beginPath();g.ellipse(0,18*s,8*s,3*s,0,0,Math.PI*2);g.fill();
    g.strokeStyle='#e7b64a';g.lineWidth=3*s;g.beginPath();g.moveTo(-3*s,3*s);g.lineTo(-5*s,16*s);g.moveTo(3*s,3*s);g.lineTo(5*s,16*s);g.stroke();
    g.fillStyle='#111';g.fillRect(-7*s,-7*s,14*s,13*s);
    g.fillStyle='#f0b38f';g.beginPath();g.arc(0,-12*s,5*s,0,Math.PI*2);g.fill();
    g.fillStyle='#e7b64a';g.fillRect(-10*s,-4*s,3*s,3*s);
    g.fillRect(7*s,-4*s,3*s,3*s);
    g.restore();
  }

  function drawAssistant(g,x,y,s){
    g.save();g.translate(x,y);
    g.strokeStyle='#f0b34a';g.lineWidth=3*s;g.beginPath();g.moveTo(0,0);g.lineTo(0,-15*s);g.stroke();
    g.fillStyle='#ffdb58';g.fillRect(-4*s,-18*s,8*s,5*s);
    g.fillStyle='#111';g.beginPath();g.arc(0,5*s,3*s,0,Math.PI*2);g.fill();
    g.restore();
  }

  function drawCrowd(g,m,w,h){
    var st=m._j90EventState;if(!st)return;
    var level=cl(st.crowd,0,1);
    var n=Math.max(10,Math.floor(w/13));
    for(var i=0;i<n;i++){
      var side=i%2===0?'home':'away',x=(i+.5)*w/n,y=side==='home'?h*.06:h*.94;
      var bob=Math.sin((Number(m._simClock)||0)*3+i)*level*2;
      g.fillStyle=level>.72?'rgba(255,225,110,.72)':'rgba(230,230,230,.38)';
      g.beginPath();g.arc(x,y+bob,2.1,0,Math.PI*2);g.fill();
      if(level>.8&&i%4===0){g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-7);g.stroke()}
    }
  }

  function drawFlare(g,m,w,h){
    var f=m._j90EventState.flare;if(!f)return;
    var y=f.side==='home'?h*.09:h*.91;
    for(var i=0;i<5;i++){
      var x=w*(.28+i*.11),r=4+Math.sin((Number(m._simClock)||0)*7+i)*2;
      g.fillStyle='rgba(255,90,35,.18)';g.beginPath();g.arc(x,y,r*2.6,0,Math.PI*2);g.fill();
      g.fillStyle='#ff8b38';g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
    }
  }

  function drawInvader(g,m,w,h){
    var v=m._j90EventState.invader;if(!v)return;
    var x=v.x*w,y=v.y*h,t=Number(m._simClock)||0;
    g.save();
    g.strokeStyle='#f2c14e';g.lineWidth=2;
    g.beginPath();g.moveTo(x,y);g.lineTo(x+(Math.sin(t*8)*8),y+(Math.cos(t*7)*5));g.stroke();
    g.fillStyle='#f0b38f';g.beginPath();g.arc(x,y-10,5,0,Math.PI*2);g.fill();
    g.fillStyle='#222';g.fillRect(x-5,y-5,10,13);
    for(var i=0;i<2;i++){
      var sx=x-22+i*44,sy=y+12+Math.sin(t*7+i)*3;
      g.fillStyle='#17202b';g.fillRect(sx-4,sy-12,8,15);
      g.fillStyle='#e9b58d';g.beginPath();g.arc(sx,sy-16,4,0,Math.PI*2);g.fill();
    }
    g.restore();
  }

  function ensureOverlay(c){
    if(!c||!c.parentElement)return null;
    var o=document.getElementById('j90EventOverlayCanvas');
    if(!o){
      if(getComputedStyle(c.parentElement).position==='static')c.parentElement.style.position='relative';
      o=document.createElement('canvas');o.id='j90EventOverlayCanvas';
      o.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:8;';
      c.parentElement.appendChild(o);
    }
    var w=Math.max(1,c.clientWidth||320),h=Math.max(1,c.clientHeight||220),dpr=Math.min(2,window.devicePixelRatio||1);
    if(o.width!==Math.round(w*dpr)||o.height!==Math.round(h*dpr)){o.width=Math.round(w*dpr);o.height=Math.round(h*dpr)}
    o.style.width=w+'px';o.style.height=h+'px';
    return {canvas:o,ctx:o.getContext('2d'),w:w,h:h,dpr:dpr};
  }

  function renderOverlay(m){
    var c=document.getElementById('j90MatchCanvas'),box=ensureOverlay(c);
    if(!box||!box.ctx)return;
    var g=box.ctx,w=box.w,h=box.h,dpr=box.dpr;
    g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
    drawCrowd(g,m,w,h);drawOverlay(g,m,w,h);
  }

  function drawOverlay(g,m,w,h){
    var st=m._j90EventState;if(!st)return;
    var now=Number(m._simClock)||0;
    if(st.offside){
      g.save();g.fillStyle='rgba(8,15,12,.82)';g.fillRect(10,h-36,w-20,25);
      g.fillStyle='#ffd24d';g.font='900 11px system-ui';g.textAlign='center';
      g.fillText('🚩 IA SEMIAUTOMÁTICA • IMPEDIMENTO '+Math.round(st.offside.confidence*100)+'%',w/2,h-20);
      g.restore();
    }
    if(st.invader){
      g.save();g.fillStyle='rgba(120,20,20,.86)';g.fillRect(10,10,w-20,26);
      g.fillStyle='#fff';g.font='900 11px system-ui';g.textAlign='center';
      g.fillText('🚨 JOGO PARADO • SEGURANÇA EM CAMPO',w/2,28);g.restore();
    }
    if(st.flare){
      g.save();g.fillStyle='rgba(110,40,10,.55)';g.fillRect(10,10,w-20,26);
      g.fillStyle='#ffd27a';g.font='900 10px system-ui';g.textAlign='center';
      g.fillText('🔥 SINALIZADORES • TORCIDA EM ALTA',w/2,28);g.restore();
    }
    if(st.crowd>.82&&!st.invader&&!st.offside){
      g.save();g.fillStyle='rgba(255,213,71,.9)';g.font='900 9px system-ui';g.textAlign='center';
      g.fillText('TORCIDA: '+(st.crowd>.94?'MÁXIMO BARULHO':'GRITANDO'),w/2,12);g.restore();
    }
    drawInvader(g,m,w,h);drawFlare(g,m,w,h);drawReferee(g,m,w,h);
    drawAssistant(g,w*.035,h*.5,Math.max(1,w/390));drawAssistant(g,w*.965,h*.5,Math.max(1,w/390));
  }

  function hook(){
    if(typeof window.mgrDraw2D!=='function')return;
    if(window.mgrDraw2D.__j90Events)return;
    var old=window.mgrDraw2D;
    var wrapped=function(){
      var m=window.S&&S.match2d;
      if(m)update(m);
      old.apply(this,arguments);
      if(m)renderOverlay(m);
    };
    wrapped.__j90Events=true;wrapped.__original=old;
    window.mgrDraw2D=wrapped;
  }

  function boot(){
    hook();
    if(!window.mgrDraw2D)setTimeout(boot,120);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.J90MatchEvents={
    version:'1.1',
    state:function(){var m=window.S&&S.match2d;return m&&m._j90EventState||null;},
    onInjury:null
  };
})();
