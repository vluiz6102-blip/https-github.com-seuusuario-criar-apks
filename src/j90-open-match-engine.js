/*
 * Jornada 90 Advanced Match Engine Plus
 *
 * Integrates/adapts open-source football-engine techniques from:
 * - haeretici/soccer-js (MIT, copyright Thiago Campos Viana, 2026)
 * - cfpperche/2d-soccer-ai (MIT, copyright cfpperche, 2026)
 *
 * Only the MIT-compatible concepts/algorithms selected for this layer are used.
 * The original projects and licenses are documented in docs/THIRD_PARTY_NOTICES.md.
 *
 * No second canvas, no second requestAnimationFrame and no interval loop.
 */
(function(){
  'use strict';

  if(window.J90OpenMatchEngine) return;

  var VERSION='1.0.0';
  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
  var n=function(v,d){return Number.isFinite(Number(v))?Number(v):(d||0)};
  var dist=function(a,b){var dx=n(a.x)-n(b.x),dy=n(a.y)-n(b.y);return Math.sqrt(dx*dx+dy*dy)};
  var pos=function(p){return String(p&&p.position||p&&p.role||'').toUpperCase()};

  function hashSeed(value){
    var s=String(value||'J90'),h=2166136261>>>0;
    for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
    return h>>>0;
  }

  function rngFromSeed(seed){
    var x=(seed>>>0)||1;
    return function(){
      x=(Math.imul(1664525,x)+1013904223)>>>0;
      return x/4294967296;
    };
  }

  function ensure(m){
    if(!m)return null;
    m._j90OpenMatch=m._j90OpenMatch||{};
    var s=m._j90OpenMatch;
    if(!Number.isFinite(s.seed))s.seed=hashSeed((m.home||'home')+'|'+(m.away||'away'));
    if(!Number.isFinite(s.rngState))s.rngState=s.seed>>>0;
    if(!Number.isFinite(s.acc))s.acc=0;
    if(!Number.isFinite(s.lastCarrierTick))s.lastCarrierTick=-1;
    if(!s.markingMap)s.markingMap={home:{},away:{}};
    if(!s.metrics)s.metrics={markingAssignments:0,firstTouches:0,fumbles:0,restarts:0,safePasses:0,deterministicSeed:s.seed>>>0};
    return s;
  }

  function nextRandom(s){
    s.rngState=(Math.imul(1664525,(s.rngState>>>0))+1013904223)>>>0;
    return s.rngState/4294967296;
  }

  function isKeeper(p){return /GK|GOL|KEEP/.test(pos(p))}
  function markerFitness(p){
    var r=pos(p);
    if(isKeeper(p))return 0;
    if(/CB|ZAG|DFC/.test(r))return 1;
    if(/LB|RB|LWB|RWB|DM|VOL|CDM/.test(r))return .9;
    if(/CM|MC|CAM|MEI/.test(r))return .58;
    return .25;
  }
  function threatScore(attacker,carrier,defenderSide){
    if(!attacker||isKeeper(attacker))return -999;
    var ownGoal=defenderSide==='home'?0:1;
    var advanced=defenderSide==='home'?n(attacker.x,.5):1-n(attacker.x,.5);
    var carrierX=carrier?n(carrier.x,.5):.5;
    var carrierY=carrier?n(carrier.y,.5):.5;
    var lane=Math.max(0,1-Math.abs(n(attacker.y,.5)-carrierY)/.5);
    var proximity=clamp(advanced,0,1);
    var farPost=(Math.sign(n(attacker.y,.5)-.5)!==Math.sign(carrierY-.5)&&Math.abs(n(attacker.y,.5)-.5)>.18)?.22:0;
    var role=/ST|CF|LW|RW|PONTA|ATA|CAM|MEI/.test(pos(attacker))?.22:.05;
    return proximity*5+lane*1.7+farPost+role+(ownGoal===0?carrierX:1-carrierX)*.8;
  }

  function coverPoint(mark,side){
    var goalX=side==='home'?.03:.97;
    var dx=n(mark.x,.5)-goalX,dy=n(mark.y,.5)-.5,d=Math.sqrt(dx*dx+dy*dy)||1;
    var ratio=clamp(.34+.16*(1-Math.min(1,d)),.34,.5),x=n(mark.x,.5)-dx*ratio,y=n(mark.y,.5)-dy*ratio;
    return {x:clamp(x,.04,.96),y:clamp(y,.06,.94)};
  }

  function applyMarking(m){
    var s=ensure(m),home=m.players||[],away=m.oppPlayers||[];
    var configs=[['home',home,away],['away',away,home]];
    for(var c=0;c<configs.length;c++){
      var side=configs[c][0],defenders=configs[c][1],attackers=configs[c][2];
      var carrierId=m.possessionTeam===side?m.possessionPlayerId:null;
      var carrier=attackers.find(function(p){return p&&p.id===carrierId})||null;
      var threats=attackers.filter(function(p){return p&&p.id!==carrierId&&!isKeeper(p)&&!p.isSentOff});
      threats.sort(function(a,b){var d=threatScore(b,carrier,side)-threatScore(a,carrier,side);return d||String(a.name||'').localeCompare(String(b.name||''))});
      var top=threats.slice(0,2);
      var eligible=defenders.filter(function(p){return p&&!p.isSentOff&&!isKeeper(p)});
      for(var i=0;i<eligible.length;i++){
        var marker=eligible[i],best=null,bestScore=-999;
        for(var j=0;j<top.length;j++){
          var att=top[j],d=dist(marker,att),score=markerFitness(marker)*2+(6/(1+d))-j*.45;
          if(score>bestScore){bestScore=score;best=att}
        }
        if(!best)continue;
        var cp=coverPoint(best,side);
        var blend=.26+markerFitness(marker)*.18;
        var tx=n(marker.tx,n(marker.x,.5)),ty=n(marker.ty,n(marker.y,.5));
        marker.tx=clamp(tx*(1-blend)+cp.x*blend,.04,.96);
        marker.ty=clamp(ty*(1-blend)+cp.y*blend,.06,.94);
        marker._j90MarkId=best.id;
        marker._j90MarkRole=pos(best);
        s.markingMap[side][marker.id]=best.id;
        s.metrics.markingAssignments++;
      }
    }
  }

  function dribbling(p){
    var a=p&&p.attributes||p&&p.stats||{};
    return clamp(n(p&&p.dribbling,n(a.dribbling,n(a.dri,n(p&&p.ovr,65)))),1,100);
  }

  function firstTouch(m,carrier,prevCarrier){
    var s=ensure(m);
    if(!carrier||carrier.id===prevCarrier||isKeeper(carrier))return false;
    var b=m.ball||{},vx=n(b.vx,0),vy=n(b.vy,0),speed=Math.sqrt(vx*vx+vy*vy);
    var control=clamp(dribbling(carrier)/100,0.08,1)*clamp(1-speed/28,.18,1);
    var chance=speed<5?0:clamp(.03+(1-control)*.32+(speed>14?.08:0)+(speed>22?.06:0),0,.4);
    s.metrics.firstTouches++;
    if(nextRandom(s)>=chance)return false;
    b.owner=null;
    var base=.28+(1-control)*.27,mag=speed>1e-6?base:1;
    var angle=nextRandom(s)*Math.PI*2;
    if(speed>1e-6){b.vx=vx*mag+(nextRandom(s)-.5)*.85;b.vy=vy*mag+(nextRandom(s)-.5)*.85}
    else {b.vx=Math.cos(angle)*1.1;b.vy=Math.sin(angle)*1.1}
    carrier.kickerClaimCooldown=Math.max(n(carrier.kickerClaimCooldown,0),.28);
    m._j90OpenMatch.looseUntil=(n(m._simClock,n(m.elapsed,0))+.45);
    s.metrics.fumbles++;
    return true;
  }

  function lineBlocked(from,to,opponents,speed){
    var fx=n(from.x),fy=n(from.y),tx=n(to.x),ty=n(to.y),dx=tx-fx,dy=ty-fy,len=Math.sqrt(dx*dx+dy*dy)||1;
    for(var i=0;i<(opponents||[]).length;i++){
      var p=opponents[i];if(!p||p.isSentOff)continue;
      var px=n(p.x),py=n(p.y),proj=((px-fx)*dx+(py-fy)*dy)/(len*len);
      if(proj<=0||proj>=1)continue;
      var qx=fx+dx*proj,qy=fy+dy*proj,d=Math.sqrt((px-qx)*(px-qx)+(py-qy)*(py-qy));
      var reaction=clamp(1.4+n(p.speed,55)/130,.85,2.35);
      var arrival=Math.max(0,len*proj/Math.max(0.1,n(speed,12)));
      if(d<.75+reaction*arrival*.12)return true;
    }
    return false;
  }

  function chooseSafePass(carrier,teammates,opponents){
    if(!carrier)return null;
    var list=(teammates||[]).filter(function(p){return p&&p!==carrier&&!p.isSentOff});
    var best=null,bestScore=-999;
    for(var i=0;i<list.length;i++){
      var p=list[i],d=dist(carrier,p);if(d<.5||d>34)continue;
      var safe=!lineBlocked(carrier,p,opponents,8.5+dribbling(carrier)*.08);
      var forward=n(p.x,.5)-n(carrier.x,.5);
      var score=(safe?4:-4)+forward*.9+(1-Math.min(1,Math.abs(n(p.y,.5)-.5)))*.25-d*.03;
      if(score>bestScore){bestScore=score;best={player:p,safe:safe,score:score}}
    }
    return best;
  }

  function restartFromEvent(m,text){
    var s=ensure(m),t=String(text||'').toLowerCase();
    var type=null;
    if(/escanteio|corner/.test(t))type='corner';
    else if(/lateral|throw.?in/.test(t))type='throwin';
    else if(/falta|free.?kick/.test(t))type='freekick';
    else if(/p[eê]nalti|penalty/.test(t))type='penalty';
    else if(/tiro de meta|goal.?kick/.test(t))type='goalkick';
    if(!type)return;
    if(m._j90OpenMatch.restart&&m._j90OpenMatch.restart.type===type)return;
    var side=m.possessionTeam==='away'?'away':'home';
    s.restart={type:type,team:side,until:n(m._simClock,n(m.elapsed,0))+.9,playbook:['short','near','far','direct','recycle'][Math.floor(nextRandom(s)*5)]};
    s.metrics.restarts++;
    m._j90RestartState=s.restart;
  }

  function substitutionSuggestion(m,side,minute){
    var starters=side==='home'?(m.players||[]):(m.oppPlayers||[]);
    var list=starters.filter(function(p){return p&&!p.isSentOff&&!isKeeper(p)});
    if(minute<60||!list.length)return null;
    list.sort(function(a,b){return n(a.energy,100)-n(b.energy,100)});
    var tired=list[0];if(!tired||n(tired.energy,100)>48)return null;
    return {side:side,minute:minute,playerId:tired.id,playerName:tired.name||'Jogador',reason:n(tired.energy,100)<35?'fadiga alta':'fadiga'};
  }

  function tick(m,dt){
    if(!m||m.paused)return;
    var s=ensure(m);
    s.acc+=Math.max(0,n(dt,0));
    if(s.acc<.08)return;
    s.acc=0;
    var now=n(m._simClock,n(m.elapsed,0));
    var minute=(m.half===2?45:0)+Math.floor(45*clamp(n(m.elapsed,0)/Math.max(1,n(m.duration,540)),0,1));
    var carrierId=m.possessionPlayerId||null;
    var carrier=(m.possessionTeam==='away'?(m.oppPlayers||[]):(m.players||[])).find(function(p){return p&&p.id===carrierId})||null;
    if(firstTouch(m,carrier,s.lastCarrierId)){m._j90PlusLastEvent='Primeiro toque pesado, posse perdida.'}
    if(carrierId&&carrierId!==s.lastCarrierId)s.lastCarrierId=carrierId;

    applyMarking(m);

    if(carrier&&m.possessionTeam==='home'){
      var safe=chooseSafePass(carrier,m.players,m.oppPlayers);
      if(safe){m._j90OpenMatch.safePassTarget=safe.player.id;s.metrics.safePasses+=safe.safe?1:0}
    } else if(carrier&&m.possessionTeam==='away'){
      var safeA=chooseSafePass(carrier,m.oppPlayers,m.players);
      if(safeA)m._j90OpenMatch.safePassTarget=safeA.player.id;
    }

    if(m.currentEvent&&m.currentEvent.t){
      restartFromEvent(m,m.currentEvent.t);
      s.lastEventText=m.currentEvent.t;
    }
    if(s.restart&&now>s.restart.until){s.restart=null;m._j90RestartState=null}

    var sh=substitutionSuggestion(m,'away',minute);
    if(sh){m._j90OpenMatch.substitutionSuggestion=sh}
    var shH=substitutionSuggestion(m,'home',minute);
    if(shH&&!m._j90OpenMatch.substitutionSuggestion)m._j90OpenMatch.substitutionSuggestion=shH;

    m._j90OpenMatch.telemetry={
      marking:Object.keys(s.markingMap.home).length+Object.keys(s.markingMap.away).length,
      firstTouches:s.metrics.firstTouches,
      fumbles:s.metrics.fumbles,
      restarts:s.metrics.restarts,
      safePasses:s.metrics.safePasses,
      seed:s.seed>>>0
    };
  }

  function simulateDeterministic(opts){
    opts=opts||{};
    var seed=Number.isFinite(Number(opts.seed))?Number(opts.seed)>>>0:hashSeed((opts.home||'HOME')+'|'+(opts.away||'AWAY'));
    var r=rngFromSeed(seed);
    var homeCA=Math.max(1,n(opts.homeCA,70)),awayCA=Math.max(1,n(opts.awayCA,70)),minutes=Math.max(1,n(opts.minutes,90));
    var hExp=clamp(1.25*(homeCA/(homeCA+awayCA))*2.4,.12,4.2),aExp=clamp(1.25*(awayCA/(homeCA+awayCA))*2.1,.12,4.2);
    function poisson(lambda){
      var p=1,k=0,L=Math.exp(-lambda);
      do{k++;p*=r()}while(p>L);
      return k-1;
    }
    var home=poisson(hExp),away=poisson(aExp);
    var events=[],count=home+away;
    for(var i=0;i<count;i++){
      var isHome=i<home;
      events.push({minute:1+Math.floor(r()*minutes),team:isHome?'home':'away',type:'goal'});
    }
    events.sort(function(a,b){return a.minute-b.minute});
    return {
      seed:seed>>>0,homeTeam:opts.home||'HOME',awayTeam:opts.away||'AWAY',
      homeScore:home,awayScore:away,events:events,
      possessionHome:clamp(Math.round(50+(homeCA-awayCA)*.12),25,75),
      possessionAway:100-clamp(Math.round(50+(homeCA-awayCA)*.12),25,75)
    };
  }

  function coverage(){
    return {
      marking:true,
      safePassing:true,
      firstTouch:true,
      setPieces:true,
      deterministicSimulation:true,
      substitutionAdvisor:true,
      fixedTimestepCompatible:true,
      secondCanvas:false,
      secondLoop:false
    };
  }

  window.J90OpenMatchEngine={
    version:VERSION,
    ensure:ensure,
    tick:tick,
    applyMarking:applyMarking,
    chooseSafePass:chooseSafePass,
    firstTouch:firstTouch,
    restartFromEvent:restartFromEvent,
    simulateDeterministic:simulateDeterministic,
    coverage:coverage
  };
})();