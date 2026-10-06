/* Jornada 90 AI 2.0
 * Hybrid adaptive football intelligence.
 * Runs offline, learns bounded tactical preferences in localStorage,
 * and feeds the existing single-Raf 2D match renderer.
 */
(function(){
  'use strict';

  var VERSION='2.5.0';
  var STORE='j90_ai_learning_v25';
  var ACTIONS=['short_pass','progressive_pass','carry','dribble','through_ball','cross','switch','backpass','shot','clearance','tackle','hold','one_two','cutback','run_in_behind','hold_up','keeper_release','punch'];
  var ROLE_ACTIONS={GK:['short_pass','backpass','clearance','hold','keeper_release','punch'],DEF:['short_pass','progressive_pass','switch','backpass','clearance','tackle','carry','cross','hold'],MID:['short_pass','progressive_pass','carry','dribble','through_ball','cross','switch','backpass','shot','tackle','hold','one_two'],ATT:['short_pass','progressive_pass','carry','dribble','through_ball','cross','switch','shot','hold','one_two','cutback','run_in_behind','hold_up']};
  var MAX_TEAMS=160, MAX_ACTION_MEMORY=24;

  function num(v,f){v=Number(v);return Number.isFinite(v)?v:f}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function lerp(a,b,t){return a+(b-a)*t}
  function hash(s){var h=2166136261>>>0,sx=String(s||'');for(var i=0;i<sx.length;i++){h^=sx.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  function escLocal(v){return typeof esc==='function'?esc(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
  function storageRead(){
    try{var raw=localStorage.getItem(STORE);if(raw){var x=JSON.parse(raw);if(x&&typeof x==='object')return x}}catch(e){}
    return {version:VERSION,matches:0,teams:{},global:{},updatedAt:0}
  }
  var LEARN=storageRead();

  function normalizeLearning(){
    if(!LEARN||typeof LEARN!=='object')LEARN={version:VERSION,matches:0,teams:{},global:{},updatedAt:0};
    if(!LEARN.teams||typeof LEARN.teams!=='object')LEARN.teams={};
    if(!LEARN.global||typeof LEARN.global!=='object')LEARN.global={};
    LEARN.version=VERSION;
  }
  normalizeLearning();

  function persistLearning(){
    try{
      var names=Object.keys(LEARN.teams);
      if(names.length>MAX_TEAMS){
        names.sort(function(a,b){return num(LEARN.teams[b].lastSeen,0)-num(LEARN.teams[a].lastSeen,0)});
        names.slice(MAX_TEAMS).forEach(function(k){delete LEARN.teams[k]});
      }
      LEARN.updatedAt=Date.now();
      localStorage.setItem(STORE,JSON.stringify(LEARN));
    }catch(e){}
  }

  function teamMemory(team){
    normalizeLearning();
    var k=String(team||'Adversário');
    var t=LEARN.teams[k];
    if(!t)t=LEARN.teams[k]={matches:0,reward:0,lastSeen:Date.now(),styleBias:{},action:{},opponent:{},mistakes:0,successes:0};
    if(!t.action)t.action={};
    if(!t.styleBias)t.styleBias={};
    if(!t.opponent)t.opponent={};
    t.lastSeen=Date.now();
    return t;
  }

  function learnAction(mem,action,reward){
    mem.action[action]=mem.action[action]||{n:0,success:0,bias:1};
    var a=mem.action[action];
    a.n=num(a.n,0)+1;
    if(reward>0)a.success=num(a.success,0)+1;
    var rate=a.n>0?a.success/a.n:.5;
    var target=clamp(.82+rate*.46,.82,1.24);
    a.bias=clamp(lerp(num(a.bias,1),target,.06),.70,1.32);
  }

  function teamPalette(team){
    var n=String(team||'').toLowerCase();
    var map=[
      [/\bbrasil\b|brazil/,['#009c3b','#ffdf00','#002776']],
      [/argentina/,['#74acdf','#ffffff','#75aadb']],
      [/fran[cç]a|france/,['#1d4ed8','#ef233c','#ffffff']],
      [/inglaterra|england/,['#ffffff','#ce1126','#1d4ed8']],
      [/espanha|spain/,['#aa151b','#f1bf00','#ffffff']],
      [/alemanha|germany/,['#111111','#dd0000','#ffce00']],
      [/portugal/,['#c8102e','#046a38','#f5f5f5']],
      [/uruguai|uruguay/,['#5ca9e6','#ffffff','#ffd700']],
      [/it[aá]lia|italy/,['#008c45','#ffffff','#cd212a']],
      [/holanda|netherlands/,['#ae1c28','#ff8c00','#ffffff']],
      [/jap[aã]o|japan/,['#bc002d','#ffffff','#00205b']],
      [/m[eé]xico|mexico/,['#006847','#ce1126','#ffffff']],
      [/marrocos|morocco/,['#c1272d','#006233','#ffffff']],
      [/coreia do sul|south korea/,['#c60c30','#111111','#ffffff']],
      [/estados unidos|united states/,['#b22234','#3c3b6e','#ffffff']],
      [/senegal/,['#00853f','#fdef42','#e31b23']],
      [/austr[aá]lia|australia/,['#012169','#ffcd00','#ffffff']],
      [/equador|ecuador/,['#ffdd00','#034ea2','#d60f2b']],
      [/canad[aá]|canada/,['#d80621','#ffffff','#d80621']],
      [/real madrid/,['#f5f5f5','#7b1fa2','#c9b458']],
      [/barcelona|barça/,['#a50044','#004d98','#edbb00']],
      [/atl[eé]tico de madrid/,['#c8102e','#ffffff','#1b3d91']],
      [/psg|paris saint/,['#004170','#da291c','#ffffff']],
      [/manchester city/,['#6cabdd','#ffffff','#00285e']],
      [/manchester united/,['#da291c','#fbe122','#111111']],
      [/liverpool/,['#c8102e','#00a398','#ffffff']],
      [/arsenal/,['#db0007','#ffffff','#023474']],
      [/chelsea/,['#034694','#d1d3d4','#001489']],
      [/bayern/,['#dc052d','#0066b3','#ffffff']],
      [/dortmund/,['#fdeb00','#111111','#ffffff']],
      [/leverkusen/,['#e32221','#111111','#ffffff']],
      [/inter/,['#0068d9','#111111','#ffffff']],
      [/milan/,['#fb090b','#111111','#ffffff']],
      [/juventus/,['#111111','#ffffff','#b0b0b0']],
      [/napoli/,['#12a0d7','#ffffff','#0b3954']],
      [/roma/,['#8e1f2f','#f4b41a','#ffffff']],
      [/lazio/,['#9ec7e8','#ffffff','#0e3764']],
      [/ajax/,['#d2122e','#ffffff','#111111']],
      [/porto/,['#00428c','#ffffff','#6f8fae']],
      [/benfica/,['#e30613','#ffffff','#009b3a']],
      [/sporting/,['#008e3c','#ffffff','#111111']],
      [/braga/,['#e30613','#111111','#ffffff']],
      [/flamengo/,['#e31b23','#111111','#ffffff']],
      [/palmeiras/,['#006437','#ffffff','#007a4d']],
      [/corinthians/,['#111111','#ffffff','#c7c7c7']],
      [/s[aã]o paulo|sao paulo/,['#ffffff','#d8212b','#111111']],
      [/gr[eê]mio|gremio/,['#1d428a','#111111','#b0b7bd']],
      [/internacional/,['#c8102e','#ffffff','#111111']],
      [/cruzeiro/,['#003da5','#ffffff','#9bc4ff']],
      [/atl[eé]tico-mg|atletico-mg/,['#111111','#ffffff','#c0c0c0']],
      [/bahia/,['#d90429','#0060a9','#ffffff']],
      [/fortaleza/,['#0057a7','#d90026','#ffffff']],
      [/goi[aá]s|goias/,['#00843d','#ffffff','#ffd100']],
      [/cear[aá]/,['#111111','#ffffff','#c5c5c5']],
      [/sport/,['#d91f26','#111111','#ffffff']],
      [/ava[ií]/,['#005ca9','#ffffff','#cf2030']],
      [/al-hilal/,['#0046a8','#ffffff','#67a8ff']],
      [/al-nassr/,['#f7d117','#00529b','#ffffff']],
      [/al-ittihad/,['#f4d03f','#111111','#ffffff']],
      [/al-ahli/,['#006f4e','#ffffff','#111111']]
    ];
    for(var i=0;i<map.length;i++)if(map[i][0].test(n))return map[i][1].slice();
    var h=hash(n),base=(h%360),accent=(base+46)%360;
    return ['hsl('+base+' 72% 52%)','hsl('+accent+' 68% 44%)','#ffffff'];
  }

  function competitionName(){
    try{
      var tier=num(S&&S.club&&S.club.tier,-1);
      if(typeof TIERS!=='undefined'&&TIERS[tier])return String(TIERS[tier]);
    }catch(e){}
    if(S&&S.competition)return String(S.competition);
    if(S&&S.match2d&&S.match2d.competition)return String(S.match2d.competition);
    return 'Competição';
  }

  function matchCompetitionProfile(m){
    var n=String(competitionName()).toLowerCase();
    var profile={tempo:1,press:1,risk:1,discipline:1,goal:1,duel:1};
    if(/premier|premier league/.test(n)){profile.tempo=1.09;profile.press=1.08;profile.duel=1.04}
    else if(/liga portugal|portugal/.test(n)){profile.tempo=.98;profile.press=1.00;profile.risk=.97}
    else if(/ligue 1|fran[cç]a|france/.test(n)){profile.tempo=1.02;profile.risk=1.03}
    else if(/bundes|alem[aã]nha|germany/.test(n)){profile.tempo=1.10;profile.press=1.10;profile.risk=1.04}
    else if(/la liga|espanha|spain/.test(n)){profile.tempo=1.00;profile.risk=1.04;profile.discipline=.98}
    else if(/serie a italiana|italy|it[aá]lia/.test(n)){profile.tempo=.94;profile.discipline=1.08;profile.duel=1.02}
    else if(/s[eé]rie a|s[eé]rie b|s[eé]rie c/.test(n)){profile.tempo=.98;profile.duel=1.06;profile.risk=1.01}
    else if(/mundial|world cup|sele[cç][aã]o|selection/.test(n)){profile.tempo=1.03;profile.goal=1.02}
    else if(/copa|continental|champions|libertadores/.test(n)){profile.tempo=1.04;profile.risk=1.03}
    else if(/v[aá]rzea/.test(n)){profile.tempo=1.02;profile.duel=1.12;profile.discipline=.88}
    return profile;
  }

  function styleForPlayer(p){
    var s=String(p&&p.style||p&&p.playStyle||'').toLowerCase();
    var pos=String(p&&p.position||'').toUpperCase();
    if(/dribl|wing|ponta|extremo|vini|yamal|liso/.test(s)||/PON|PE|PD|EXT/.test(pos))return 'dribbler';
    if(/speed|veloc|f[aá]cio|rapid/.test(s))return 'runner';
    if(/play|creator|armad|maker|pass/.test(s)||/MEI|MC|VOL/.test(pos))return 'creator';
    if(/target|fin|killer|final/.test(s)||/ATA|CF|ST/.test(pos))return 'finisher';
    if(/def|marker|stop/.test(s)||/ZAG|LAT/.test(pos))return 'defender';
    return 'balanced';
  }

  function roleWeight(p,action,ctx){
    var role=styleForPlayer(p),x=1;
    if(role==='dribbler')x+=action==='dribble'?.34:action==='carry'?.16:action==='cross'?.06:-.01;
    if(role==='runner')x+=action==='through_ball'?.14:action==='carry'?.13:action==='shot'?.06:0;
    if(role==='creator')x+=action==='progressive_pass'?.17:action==='through_ball'?.18:action==='switch'?.12:0;
    if(role==='finisher')x+=action==='shot'?.28:action==='hold'?.08:action==='cross'?-0.04:0;
    if(role==='defender')x+=action==='clearance'?.26:action==='backpass'?.13:action==='tackle'?.15:action==='dribble'?.-0.08:0;
    if(ctx&&ctx.nearGoal)x+=action==='shot'?.18:action==='through_ball'?.08:0;
    if(ctx&&ctx.underPressure)x+=action==='backpass'?.18:action==='short_pass'?.06:action==='dribble'?.-.08:0;
    return x;
  }

  function playerRole(p){
    var pos=String(p&&p.position||p&&p.role||'').toUpperCase();
    if(/GOL|GK|GOAL/.test(pos))return 'GK';
    if(/ZAG|CB|LAT|LD|LE|RB|LB|DEF/.test(pos))return 'DEF';
    if(/MEI|MC|VOL|MD|ME|MID|CAM|CM|DM/.test(pos))return 'MID';
    if(/ATA|CF|ST|CA|PE|PD|PON|EXT|FW/.test(pos))return 'ATT';
    return 'MID';
  }
  function hydratePlayer(m,side,p){
    if(!p)return p;
    try{
      var src=side==='home'&&S&&Array.isArray(S.roster)?S.roster.find(function(x){return x.id===p.id}):null;
      if(src){
        var keep={x:p.x,y:p.y,tx:p.tx,ty:p.ty};
        Object.keys(src).forEach(function(k){if(p[k]==null)p[k]=src[k]});
        p.x=keep.x;p.y=keep.y;p.tx=keep.tx;p.ty=keep.ty;
      }
    }catch(e){}
    p.roleAI=playerRole(p);
    p.ai=p.ai||{};
    p.ai.role=p.roleAI;p.ai.lastAction=p.ai.lastAction||null;
    p.ai.confidence=clamp(num(p.ai.confidence,.62),.35,.98);
    p.ai.heat=clamp(num(p.ai.heat,0),0,1);
    p.energy=clamp(num(p.energy,num(p.form,70)),16,100);
    return p;
  }
  function ratingAny(p,keys,fallback){
    for(var i=0;i<keys.length;i++){var v=Number(p&&p[keys[i]]);if(Number.isFinite(v)&&v>0)return v}
    return fallback;
  }
  function keeperRating(p,key){
    var map={reflex:['reflex','handling','gkReflex','goalkeeping'],handling:['handling','catching','gkHandling'],positioning:['positioning','gkPositioning'],oneOnOne:['oneOnOne','oneonone','duel'],aerial:['aerial','heading'],command:['command','leadership']};
    return ratingAny(p,map[key]||[key],num(p&&p.ovr,65));
  }
  function defenders(m,side){return (getTeamPlayers(m,side)||[]).filter(function(p){return playerRole(p)==='DEF'})}
  function midfielders(m,side){return (getTeamPlayers(m,side)||[]).filter(function(p){return playerRole(p)==='MID'})}
  function attackers(m,side){return (getTeamPlayers(m,side)||[]).filter(function(p){return playerRole(p)==='ATT'})}
  function goalkeeper(m,side){var a=getTeamPlayers(m,side)||[];for(var i=0;i<a.length;i++)if(playerRole(a[i])==='GK')return a[i];return a[0]||null}
  function playerRating(p,key,fallback){
    if(!p)return fallback;
    var candidates={
      technical:['tec','technique','technical'],
      dribble:['drible','dribbling'],
      pass:['pas','pass','passing'],
      pace:['pac','pace','vel'],
      shoot:['fin','shoot','shot'],
      defend:['def','defesa','tackle'],
      physical:['fis','physical'],
      form:['form'],
      morale:['morale']
    }[key]||[key];
    for(var i=0;i<candidates.length;i++)if(Number.isFinite(Number(p[candidates[i]])))return Number(p[candidates[i]]);
    return num(p.ovr,fallback);
  }

  function dist(a,b){var dx=(a.x||0)-(b.x||0),dy=(a.y||0)-(b.y||0);return Math.sqrt(dx*dx+dy*dy)}
  function nearest(arr,x,y){
    var best=null,bd=Infinity;
    for(var i=0;i<arr.length;i++){var d=dist({x:arr[i].x,y:arr[i].y},{x:x,y:y});if(d<bd){bd=d;best=arr[i]}}
    return best;
  }

  function ensureMatch(m){
    if(!m)return;
    m.competition=m.competition||competitionName();
    m._compProfile=m._compProfile||matchCompetitionProfile(m);
    var h1=teamPalette(m.home),h2=teamPalette(m.away);
    m.palette={home:h1,away:h2};var ch=hash(m.competition||'Competição')%360;m.compAccent=m.compAccent||'hsl('+ch+' 72% 58%)';
    if(!m.stats)m.stats={
      possessionHome:0,possessionAway:0,passes:0,passSuccess:0,progressivePasses:0,
      carries:0,dribbles:0,dribbleSuccess:0,crosses:0,shots:0,shotsOnTarget:0,
      tackles:0,interceptions:0,clearances:0,throughBalls:0,switches:0,errors:0
    };
    m.possessionTeam=m.possessionTeam||'home';
    m.possessionPlayerId=m.possessionPlayerId||null;
    m.possessionName=m.possessionName||m.home;
    m.possessionSince=num(m.possessionSince,0);
    m.action=m.action||{name:'build_up',until:0};
    m.cooldowns=m.cooldowns||{};
    m.chain=num(m.chain,0);
    m.danger={home:num(m.danger&&m.danger.home,.2),away:num(m.danger&&m.danger.away,.2)};
    m.learning=m.learning||{};
    m.learning.home=teamMemory(m.home);
    m.learning.away=teamMemory(m.away);
    if(!m._rngState)m._rngState=hash(m.home+'|'+m.away+'|'+num(S&&S.managerRound,0)+'|'+m.competition);
    if(!m._ai2Ready){
      m._ai2Ready=true;
      initFormations(m);
      setPossession(m,'home',nearest(m.players,m.ball.x,m.ball.y)||m.players[0],false);
    }
  }

  function rnd(m){
    m._rngState=(Math.imul(1664525,m._rngState>>>0)+1013904223)>>>0;
    return (m._rngState>>>0)/4294967296;
  }

  function formationAnchor(m,side,index){
    var form=side==='home'?S.lineup.formation:(m._awayFormation||'4-3-3');
    var slots=(typeof MGR_FORMATIONS!=='undefined'&&MGR_FORMATIONS[form])||[
      {x:10,y:50},{x:25,y:22},{x:25,y:40},{x:25,y:60},{x:25,y:78},
      {x:45,y:30},{x:45,y:50},{x:45,y:70},{x:68,y:24},{x:70,y:50},{x:68,y:76}
    ];
    var z=slots[index]||slots[slots.length-1];
    var x=Number(z.x)/100,y=Number(z.y)/100;
    if(side==='away')x=1-x;
    return {x:x,y:y};
  }

  function initFormations(m){
    if(!Array.isArray(m.players))m.players=[];
    if(!Array.isArray(m.oppPlayers))m.oppPlayers=[];
    m.players.forEach(function(p,i){var a=formationAnchor(m,'home',i);p.baseX=p.baseX??a.x;p.baseY=p.baseY??a.y;p.x=p.x??a.x;p.y=p.y??a.y;p.tx=p.tx??a.x;p.ty=p.ty??a.y});
    m.oppPlayers.forEach(function(p,i){var a=formationAnchor(m,'away',i);p.baseX=p.baseX??a.x;p.baseY=p.baseY??a.y;p.x=p.x??a.x;p.y=p.y??a.y;p.tx=p.tx??a.x;p.ty=p.ty??a.y});
  }

  function getTeamPlayers(m,side){return side==='home'?m.players:m.oppPlayers}
  function getPlayer(m,side,id){
    var a=getTeamPlayers(m,side)||[];
    return a.find(function(p){return p.id===id})||null;
  }

  function pressureAt(m,side,p){
    var opp=getTeamPlayers(m,side==='home'?'away':'home'),min=1;
    for(var i=0;i<opp.length;i++)min=Math.min(min,dist(p,opp[i]));
    return clamp(1-min*3.6,0,1);
  }

  function teamBrainEnhanced(m,side){
    var base=side==='home'?m._homeBrain:m._awayBrain;
    var mem=side==='home'?m.learning.home:m.learning.away;
    var players=getTeamPlayers(m,side)||[];
    var avg=players.length?players.reduce(function(n,p){return n+num(p.ovr,65)},0)/players.length:65;
    var energy=players.length?players.reduce(function(n,p){return n+num(p.energy,70)},0)/players.length:70;
    var diff=(side==='home'?m.homeScore-m.awayScore:m.awayScore-m.homeScore);
    var minute=((m.half===2?45:0)+m.elapsed/Math.max(1,m.duration)*45);
    var cp=m._compProfile||matchCompetitionProfile(m);
    var quality=clamp(num(base&&base.quality,.6)+mem.reward/(Math.max(4,mem.matches)*120),.3,1);
    var chase=diff<0?1:diff>0?-1:0;
    var late=minute>=72?1:0;
    var adaptation=num(base&&base.adapt,.6);
    var homeBoost=side==='home'?(num(base&&base.external&&base.external.attributes&&base.external.attributes.homeBoost,5)/100):0;
    var risk=clamp(num(base&&base.risk,.5)+chase*.17+late*chase*.12+mem.styleBias.risk||0,.08,.98);
    return {
      quality:quality,attack:clamp(num(base&&base.attack,.6)+cp.goal*(quality-.6)*.16+homeBoost,.3,.99),
      defense:clamp(num(base&&base.defense,.6)+((energy-70)/500),.3,.99),
      press:clamp(num(base&&base.press,.55)*cp.press+chase*.14+late*chase*.08,.2,.98),
      tempo:clamp(num(base&&base.tempo,.55)*cp.tempo+chase*.13+late*chase*.08,.2,.99),
      risk:clamp(risk*num(cp.risk,1),.08,.98),
      width:clamp(num(base&&base.external&&base.external.attributes&&base.external.attributes.width,58)/100,.25,.95),
      directness:clamp(num(base&&base.external&&base.external.attributes&&base.external.attributes.directness,50)/100,.2,.95),
      buildUp:clamp(num(base&&base.external&&base.external.attributes&&base.external.attributes.buildUp,55)/100,.2,.97),
      transition:clamp(num(base&&base.external&&base.external.attributes&&base.external.attributes.transition,58)/100,.2,.98),
      adaptability:clamp(adaptation,.2,.98),
      fatigue:clamp((100-energy)/100,.05,.8),
      memory:mem
    };
  }

  function actionScore(m,side,p,action,brain){
    var cp=m._compProfile||matchCompetitionProfile(m);
    var goalX=side==='home'?.98:.02;
    var nearGoal=side==='home'?p.x>.73:p.x<.27;
    var central=1-Math.abs(p.y-.5)*1.55;
    var pressure=pressureAt(m,side,p);
    var under=pressure>.44;
    var fatigue=1-clamp(num(p.energy,75)/100,0,1);
    var score=(brain.attack*.18+brain.quality*.16);
    var ctx={nearGoal:nearGoal,underPressure:under};
    score*=roleWeight(p,action,ctx);
    if(action==='short_pass')score+=brain.buildUp*.38+central*.08+pressure*.04;
    if(action==='progressive_pass')score+=brain.buildUp*.29+brain.tempo*.16+(nearGoal?.10:0)-pressure*.10;
    if(action==='carry')score+=brain.transition*.17+(1-pressure)*.15+central*.05-fatigue*.12;
    if(action==='dribble')score+=(styleForPlayer(p)==='dribbler'?.40:.06)+(1-pressure)*.20+(nearGoal?.13:.04)-fatigue*.18;
    if(action==='through_ball')score+=brain.directness*.20+brain.attack*.18+nearGoal*.18-pressure*.07;
    if(action==='cross')score+=brain.width*.28+nearGoal*.20+(Math.abs(p.y-.5)*.25)-fatigue*.08;
    if(action==='switch')score+=brain.width*.20+(1-central)*.13;
    if(action==='backpass')score+=brain.defense*.17+pressure*.24+(brain.risk<.38?.13:0);
    if(action==='shot')score+=(nearGoal?brain.attack*.56:brain.attack*.10)+num(cp.goal,1)*.08-(pressure*.16)-fatigue*.22;
    if(action==='clearance')score+=brain.defense*.39+pressure*.24+(p.x<(side==='home'?.28:.72)?0:.1);
    if(action==='tackle')score+=brain.defense*.28+pressure*.22+(1-fatigue)*.08;
    if(action==='hold')score+=brain.quality*.25+(1-brain.risk)*.20+(nearGoal?.08:0);
    var mem=brain.memory&&brain.memory.action&&brain.memory.action[action];
    if(mem)score*=clamp(num(mem.bias,1),.72,1.32);
    score*=1+(brain.adaptability-.5)*.08;
    return score;
  }

  function chooseAction(m,side,p,brain){
    var best=[],top=-Infinity;
    for(var i=0;i<ACTIONS.length;i++){
      var a=ACTIONS[i],s=actionScore(m,side,p,a,brain);
      if(s>top+0.03){top=s;best=[a]}else if(Math.abs(s-top)<=0.12)best.push(a)
    }
    var idx=best.length?Math.floor(rnd(m)*best.length):0;
    return best[idx]||'short_pass';
  }

  function setPossession(m,side,p,emit){
    if(!p)return;
    m.possessionTeam=side;
    m.possessionPlayerId=p.id;
    m.possessionName=p.name||((side==='home'?m.home:m.away));
    m.possessionSince=num(m._simClock,0);
    var arr=getTeamPlayers(m,side);
    var other=getTeamPlayers(m,side==='home'?'away':'home');
    m.ball.ownerId=p.id;m.ball.ownerTeam=side;
    var color=m.palette&&m.palette[side]?m.palette[side][0]:(side==='home'?'#e6b33f':'#e8e8e8');
    m.ball.ownerColor=color;
    if(emit&&typeof mgrMatchEvent==='function'&&m._lastPossEvent!==p.id){
      m._lastPossEvent=p.id;
    }
    var s=side==='home'?'possessionHome':'possessionAway';
    m._lastPossessionClock=num(m._simClock,0);
    m._possTransition=true;
    if(arr&&other&&other.length){}
  }

  function transferPossession(m,side,preferred,reason){
    var arr=getTeamPlayers(m,side)||[];
    var p=preferred||nearest(arr,m.ball.x,m.ball.y);
    if(!p)return;
    setPossession(m,side,p,false);
    m.chain=reason==='interception'?0:num(m.chain,0)+1;
    if(reason)m.lastAction=reason;
  }

  function eventCooldown(m,key,seconds){
    var last=num(m.cooldowns[key],-999);
    if(num(m._simClock,0)-last<seconds)return false;
    m.cooldowns[key]=num(m._simClock,0);
    return true;
  }

  function emit(m,text,key,cd){
    if(!text||typeof mgrMatchEvent!=='function')return;
    if(key&&cd&&!eventCooldown(m,key,cd))return;
    mgrMatchEvent(text);
  }

  function chooseNextReceiver(m,side,owner,kind){
    var arr=getTeamPlayers(m,side)||[],goalX=side==='home'?.98:.02,best=null,bs=-Infinity;
    for(var i=0;i<arr.length;i++){
      var p=arr[i];if(!p||p.id===owner.id)continue;
      var forward=side==='home'?p.x-owner.x:owner.x-p.x;
      var space=1-pressureAt(m,side,p);
      var central=1-Math.abs(p.y-.5);
      var role=styleForPlayer(p);
      var s=forward*.65+space*.28+central*.10+(role==='creator'&&kind==='progressive_pass'?.10:0);
      if(kind==='switch')s+=(Math.abs(p.y-owner.y))*.2;
      if(kind==='through_ball')s+=(forward>0?.16:-.08);
      if(s>bs){bs=s;best=p}
    }
    return best||nearest(arr,goalX,.5)||arr[0];
  }

  function outcomeChance(m,side,owner,action,receiver,brain,oppBrain){
    var skill={
      short_pass:playerRating(owner,'pass',owner.ovr),
      progressive_pass:playerRating(owner,'pass',owner.ovr),
      carry:playerRating(owner,'technical',owner.ovr),
      dribble:playerRating(owner,'dribble',owner.ovr),
      through_ball:playerRating(owner,'pass',owner.ovr),
      cross:playerRating(owner,'pass',owner.ovr),
      switch:playerRating(owner,'pass',owner.ovr),
      backpass:playerRating(owner,'pass',owner.ovr),
      shot:playerRating(owner,'shoot',owner.ovr),
      clearance:playerRating(owner,'defend',owner.ovr),
      tackle:playerRating(owner,'defend',owner.ovr),
      hold:playerRating(owner,'technical',owner.ovr)
    }[action]||num(owner.ovr,65);
    var press=pressureAt(m,side,owner),fat=clamp(1-num(owner.energy,75)/100,0,1),cp=m._compProfile||{duel:1,discipline:1};
    var base=clamp(.54+(skill-65)/210+(brain.quality-.55)*.18-press*.22-fat*.18, .12,.93);
    if(action==='dribble')base=clamp(base+(styleForPlayer(owner)==='dribbler'?.16:0),.14,.94);
    if(action==='shot')base=clamp(base+(brain.attack*.08)-press*.10,.12,.91);
    if(action==='tackle')base=clamp(base+(brain.defense*.10)*num(cp.duel,1),.15,.94);
    if(action==='clearance')base=clamp(base+.12+press*.08,.22,.97);
    if(oppBrain)base=clamp(base-(oppBrain.press*.10),.10,.95);
    if(receiver&&action!=='shot'&&action!=='clearance'&&action!=='tackle')base=clamp(base+(num(receiver.ovr,65)-65)/500,.12,.95);
    return base;
  }

  function moveToward(p,x,y,amount){
    p.tx=clamp(lerp(num(p.tx,p.x),x,amount),.035,.965);
    p.ty=clamp(lerp(num(p.ty,p.y),y,amount),.045,.955);
  }

  function releaseBall(m,side,owner,receiver,kind,success){
    var other=side==='home'?'away':'home';
    if(success&&receiver){
      var distGoal=side==='home'?.98:0;
      var push=kind==='switch'?.20:kind==='through_ball'?.18:kind==='progressive_pass'?.14:.08;
      var tx=receiver.x+(distGoal-receiver.x)*push;
      var ty=receiver.y;
      m.ball.tx=clamp(tx,.06,.94);m.ball.ty=clamp(ty,.08,.92);
      m.ball.x=owner.x;m.ball.y=owner.y;
      m.ball.flight={from:[owner.x,owner.y],to:[m.ball.tx,m.ball.ty],until:num(m._simClock,0)+.34};
      setPossession(m,side,receiver,false);
      if(kind==='through_ball')m.stats.throughBalls++;
      if(kind==='switch')m.stats.switches++;
      if(kind==='progressive_pass')m.stats.progressivePasses++;
      m.stats.passes++;m.stats.passSuccess++;
      if(kind==='cross')m.stats.crosses++;
      return;
    }
    m.stats.errors++;
    var oppArr=getTeamPlayers(m,other),inter=nearest(oppArr,m.ball.x,m.ball.y);
    transferPossession(m,other,inter,'interception');
  }

  function resolveAction(m,side,owner,action,brain,oppBrain){
    var receiver=(action==='shot'||action==='clearance'||action==='tackle')?null:chooseNextReceiver(m,side,owner,action);
    var chance=outcomeChance(m,side,owner,action,receiver,brain,oppBrain);
    var roll=rnd(m);
    var good=roll<chance;
    var other=side==='home'?'away':'home';
    var otherArr=getTeamPlayers(m,other);
    var otherNear=nearest(otherArr,owner.x,owner.y);
    var cp=m._compProfile||matchCompetitionProfile(m);
    owner.energy=cl(num(owner.energy,70)-(.18+chance*.17),18,100);
    m.actionHistory.push({team:side,player:owner.id,action:action,success:!!good,clock:num(m._simClock,0)});if(m.actionHistory.length>MAX_ACTION_MEMORY)m.actionHistory.shift();

    if(action==='shot'){
      m.stats.shots++;
      var onTarget=good||roll<chance+.10;
      if(onTarget)m.stats.shotsOnTarget++;
      var xg=cl(.10+playerRating(owner,'shoot',owner.ovr)/1400+brain.attack*.17+(side==='home'?owner.x:1-owner.x)*.26+num(m.danger[side],.2)*.12-(pressureAt(m,side,owner)*.12),.03,.72);
      if(onTarget&&rnd(m)<xg){
        if(side==='home')m.homeScore++;else m.awayScore++;
        m.lastAction='goal';m.danger.home=.18;m.danger.away=.18;
        emit(m,'GOOOL! '+escLocal(owner.name||'Jogador')+' finaliza e marca!','goal',0);
        m.ball.x=.5;m.ball.y=.5;m.ball.tx=.5;m.ball.ty=.5;
        var kickoff=getTeamPlayers(m,other)[0]||otherNear;
        transferPossession(m,other,kickoff,'kickoff');
        return;
      }
      m.danger[side]=cl(num(m.danger[side],.2)+.13,.05,.95);
      if(onTarget)emit(m,'Defesaça! '+escLocal(m.away)+' segura o chute de '+escLocal(owner.name||'atacante')+'.','save',1.7);
      else emit(m,(good?'Chute perigoso de ':'Finalização ruim de ')+escLocal(owner.name||'atacante')+'.','shot',2.2);
      if(onTarget&&otherNear&&rnd(m)<.42)transferPossession(m,other,otherNear,'rebound');
      return;
    }

    if(action==='dribble'){
      m.stats.dribbles++;if(good)m.stats.dribbleSuccess++;
      if(good){
        m.chain++;moveToward(owner,cl(owner.x+(side==='home'?.055:-.055),.04,.96),cl(owner.y+(rnd(m)-.5)*.08,.06,.94),.75);
        m.ball.tx=owner.tx;m.ball.ty=owner.ty;
        if(m.chain>=2)emit(m,escLocal(owner.name||'Jogador')+' passa pelo marcador e continua a jogada.','dribble',1.4);
      }else{
        emit(m,escLocal(owner.name||'Jogador')+' tenta o drible, mas perde a bola.','dribble_fail',1.6);
        transferPossession(m,other,otherNear,'tackle');
        return;
      }
      return;
    }

    if(action==='carry'){
      m.stats.carries++;
      if(good){
        var gx=side==='home'?.76:.24;
        moveToward(owner,lerp(owner.x,gx,.15),clamp(owner.y+(rnd(m)-.5)*.12,.06,.94),.7);
        m.ball.tx=owner.tx;m.ball.ty=owner.ty;
        if(rnd(m)<.12)emit(m,escLocal(owner.name||'Jogador')+' conduz e rompe a primeira linha de pressão.','carry',2.0);
      }else if(otherNear&&rnd(m)<.55)transferPossession(m,other,otherNear,'tackle');
      return;
    }

    if(action==='tackle'){
      m.stats.tackles++;
      if(good){
        transferPossession(m,other,otherNear,'tackle_success');
        emit(m,escLocal(owner.name||'Defensor')+' faz o desarme e recupera a posse.','tackle',1.3);
      }else if(rnd(m)<.18*cp.discipline){
        emit(m,'Falta no duelo de '+escLocal(owner.name||'defensor')+'.','foul',2.0);
      }
      return;
    }

    if(action==='clearance'){
      m.stats.clearances++;
      if(good){
        m.ball.tx=cl(owner.x+(side==='home'?.22:-.22),.05,.95);m.ball.ty=cl(owner.y+(rnd(m)-.5)*.45,.06,.94);
        transferPossession(m,side,owner,'clearance');
        emit(m,escLocal(owner.name||'Defensor')+' afasta o perigo.','clear',1.8);
      }else transferPossession(m,other,otherNear,'interception');
      return;
    }

    if(action==='hold'){
      owner.energy=cl(owner.energy-.06,18,100);
      if(rnd(m)<.10)emit(m,escLocal(owner.name||'Jogador')+' prende a bola e espera apoio.','hold',2.2);
      return;
    }

    if(receiver){
      if(good){
        releaseBall(m,side,owner,receiver,action,true);
        if(action==='cross')emit(m,escLocal(owner.name||'Jogador')+' cruza para a área.','cross',1.7);
        else if(action==='through_ball')emit(m,escLocal(owner.name||'Jogador')+' encontra um passe em profundidade.','through',1.8);
        else if(action==='switch')emit(m,escLocal(owner.name||'Jogador')+' inverte o jogo.','switch',2.2);
        else if(action==='progressive_pass'&&rnd(m)<.22)emit(m,escLocal(owner.name||'Jogador')+' quebra uma linha com passe progressivo.','progressive',1.8);
      }else{
        emit(m,escLocal(owner.name||'Jogador')+' erra o passe e entrega a bola.','pass_error',1.6);
        releaseBall(m,side,owner,receiver,action,false);
      }
    }
  }

  function updateOffBall(m,side,brain){
    var arr=getTeamPlayers(m,side)||[],ball=m.ball,goalX=side==='home'?.98:.02;
    arr.forEach(function(p){
      var isOwner=p.id===m.possessionPlayerId&&side===m.possessionTeam;
      var dx=goalX-p.x,advance=cl(dx, -.4,.4);
      var driftX=p.baseX||p.x,driftY=p.baseY||p.y;
      if(isOwner){
        var push=side==='home'?.09:-.09;
        driftX=cl(p.x+push+advance*.07,.05,.95);
        driftY=cl(p.y+(rnd(m)-.5)*.03,.06,.94);
      }else{
        var support=1-dist(p,ball);
        driftX=cl(lerp(driftX,ball.x+(side==='home'?-.04:.04),support*.11+brain.tempo*.025),.04,.96);
        driftY=cl(lerp(driftY,ball.y+(p.baseY-.5)*.22,.08),.05,.95);
        if(brain.width>.68&&Math.abs(p.baseY-.5)>.18)driftY=cl(driftY+(p.baseY-.5)*.018,.05,.95);
      }
      moveToward(p,driftX,driftY,.18+brain.tempo*.08);
      p.energy=cl(num(p.energy,70)-.015-brain.press*.008,16,100);
    });
  }

  function chooseNewActionIfNeeded(m,side,owner,brain){
    if(!owner)return;
    var now=num(m._simClock,0);
    if(num(m.action.until,0)>now)return;
    var action=chooseAction(m,side,owner,brain);
    m.action={name:action,until:now+.35+rnd(m)*.9};
    resolveAction(m,side,owner,action,brain,teamBrainEnhanced(m,side==='home'?'away':'home'));
  }

  function integratePossession(m,dt){
    var key=m.possessionTeam==='home'?'possessionHome':'possessionAway';
    if(m.stats&&m.stats[key]!=null)m.stats[key]+=dt;
    if(m.ball&&m.possessionPlayerId){
      var p=getPlayer(m,m.possessionTeam,m.possessionPlayerId);
      if(p){
        m.ball.tx=cl(p.x+(m.possessionTeam==='home'?.012:-.012),.035,.965);
        m.ball.ty=cl(p.y+.008*Math.sin(num(m._simClock,0)*8),.035,.965);
      }
    }
  }

  function tick(m,now){
    ensureMatch(m);
    var p=window.__J90_PERF||j90PerfState(),prev=m._lastTick||now,dt=Math.max(1,Math.min(50,now-prev));
    m._lastTick=now;
    if((m._perfCounter=(m._perfCounter||0)+1)%8===0)j90PerfSample(dt);
    m._simAcc=(m._simAcc||0)+dt;
    m.elapsed=(Date.now()-m.startedAt)/1000;
    var local=m.elapsed;
    if(local>=m.duration){
      if(m.half===1){
        m.half=2;m.elapsed=0;m.startedAt=Date.now();m._simClock=0;m._simAcc=0;m.paused=true;
        emit(m,'Intervalo: ajuste a tática, pressão ou faça substituições.',null,0);
        if(typeof render==='function')render(1);
        return;
      }
      if(typeof mgrMatchFinish==='function')mgrMatchFinish();
      return;
    }

    var stepMs=p.low?50:33.333;
    while(m._simAcc>=stepMs){
      m._simAcc-=stepMs;m._simClock+=stepMs/1000;
      integratePossession(m,stepMs/1000);

      var hb=teamBrainEnhanced(m,'home'),ab=teamBrainEnhanced(m,'away');
      m._ai2={home:hb,away:ab};

      updateOffBall(m,'home',hb);updateOffBall(m,'away',ab);

      var possSide=m.possessionTeam||'home',owner=getPlayer(m,possSide,m.possessionPlayerId);
      if(!owner){
        transferPossession(m,possSide,nearest(getTeamPlayers(m,possSide),m.ball.x,m.ball.y),'loose');
        owner=getPlayer(m,possSide,m.possessionPlayerId);
      }

      if(owner){
        var opp=nearest(getTeamPlayers(m,possSide==='home'?'away':'home'),owner.x,owner.y);
        var press=pressureAt(m,possSide,owner);
        if(press>.74&&rnd(m)<.07*hb.adaptability+0.015){
          var rescue=chooseNextReceiver(m,possSide,owner,'backpass');
          if(rescue){m.action={name:'backpass',until:m._simClock+.4};resolveAction(m,possSide,owner,'backpass',hb,ab)}
        }else chooseNewActionIfNeeded(m,possSide,owner,possSide==='home'?hb:ab);
        if(opp&&press>.82&&rnd(m)<.025*(m._compProfile?.duel||1)){
          emit(m,escLocal(owner.name||'Jogador')+' é pressionado por '+escLocal(opp.name||'marcador')+'.','pressing',1.7);
        }
      }

      // Loose-ball contests can transfer possession naturally.
      if(!m.possessionPlayerId||!owner){
        var nh=nearest(m.players,m.ball.x,m.ball.y),na=nearest(m.oppPlayers,m.ball.x,m.ball.y);
        if(nh&&na){
          var dh=dist(nh,m.ball),da=dist(na,m.ball);
          if(Math.min(dh,da)<.09)transferPossession(m,dh<=da?'home':'away',dh<=da?nh:na,'loose');
        }
      }

      // Contextual team events are sparse and cooldown protected.
      var minute=((m.half===2?45:0)+m._simClock/Math.max(1,m.duration)*45);
      if(minute>82&&m.homeScore!==m.awayScore&&rnd(m)<.0035){
        var chaseSide=m.homeScore<m.awayScore?'home':m.awayScore<m.homeScore?'away':null;
        if(chaseSide){var chaseBrain=chaseSide==='home'?hb:ab;emit(m,escLocal(chaseSide==='home'?m.home:m.away)+' aumenta a pressão nos minutos finais.','late_pressure',5);chaseBrain.risk=cl(chaseBrain.risk+.08,.08,.99)}
      }
    }

    var smooth=p.low?.16:.24;
    for(var i=0;i<m.players.length;i++){var a=m.players[i];a.x=lerp(a.x,a.tx,smooth);a.y=lerp(a.y,a.ty,smooth)}
    for(var j=0;j<m.oppPlayers.length;j++){var b=m.oppPlayers[j];b.x=lerp(b.x,b.tx,smooth);b.y=lerp(b.y,b.ty,smooth)}
    if(m.ball.flight&&num(m.ball.flight.until,0)>m._simClock){
      var f=m.ball.flight,t=1-(f.until-m._simClock)/.34;t=cl(t,0,1);
      m.ball.x=lerp(f.from[0],f.to[0],t);m.ball.y=lerp(f.from[1],f.to[1],t);
    }else{
      m.ball.x=lerp(m.ball.x,m.ball.tx,smooth);m.ball.y=lerp(m.ball.y,m.ball.ty,smooth);
    }
    if(m.possessionPlayerId){
      var op=getPlayer(m,m.possessionTeam,m.possessionPlayerId);
      if(op&&(!m.ball.flight||m.ball.flight.until<=m._simClock)){m.ball.x=op.x+(m.possessionTeam==='home'?.012:-.012);m.ball.y=op.y+.006}
    }

    if(typeof mgrMatchHud==='function')mgrMatchHud();
    if(typeof mgrDraw2D==='function')mgrDraw2D();
  }

  function adaptFinish(m){
    ensureMatch(m);
    var rewardH=m.homeScore>m.awayScore?1:m.homeScore===m.awayScore?.15:-1;
    var rewardA=-rewardH;
    ['home','away'].forEach(function(side){
      var mem=side==='home'?m.learning.home:m.learning.away;
      var reward=side==='home'?rewardH:rewardA;
      mem.matches=num(mem.matches,0)+1;mem.reward=num(mem.reward,0)*.92+reward;
      mem.successes=num(mem.successes,0)+(reward>0?1:0);
      var last=(m.action&&m.action.name)||'short_pass';
      for(var hi=0;hi<m.actionHistory.length;hi++){var h=m.actionHistory[hi];if(h.team===side)learnAction(mem,h.action,h.success?(reward>0?1:.25):(reward>0?.15:-.35))}
      learnAction(mem,last,reward);
      if(reward>0){mem.styleBias.risk=cl(num(mem.styleBias.risk,0)+.01,.0,.16);mem.mistakes=Math.max(0,num(mem.mistakes,0)-1)}
      else{mem.styleBias.risk=cl(num(mem.styleBias.risk,0)-.008,-.14,.16);mem.mistakes=num(mem.mistakes,0)+1}
    });
    LEARN.matches=num(LEARN.matches,0)+1;
    LEARN.global.lastResult={home:m.home,away:m.away,homeScore:m.homeScore,awayScore:m.awayScore,competition:m.competition};
    LEARN.global.competitions=LEARN.global.competitions||{};var ck=String(m.competition||'Competição');LEARN.global.competitions[ck]=num(LEARN.global.competitions[ck],0)+1;
    persistLearning();
  }

  function addMatchCss(){
    if(document.getElementById('j90-ai2-style'))return;
    var s=document.createElement('style');s.id='j90-ai2-style';
    s.textContent=[
      '.j90MatchWrap{position:relative;width:100%;}',
      '.j90CrowdStrip{display:grid;grid-template-columns:1fr auto 1fr;gap:4px;align-items:center;margin:4px 0;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:#070a0b;overflow:hidden;box-shadow:inset 0 2px 0 var(--comp,#f5b942);}',
      '.j90CrowdSide{position:relative;min-height:30px;padding:5px 7px;overflow:hidden;font-size:7px;font-weight:800;letter-spacing:.25px;}',
      '.j90CrowdSide:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,var(--c1),var(--c2));opacity:.34;}',
      '.j90CrowdSide:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(255,255,255,.14) 0 2px,transparent 2px 7px);opacity:.17;transform:translateX(0);animation:j90CrowdWave 2.6s linear infinite;}',
      '.j90CrowdSide span{position:relative;z-index:1;text-shadow:0 1px 3px #000;}',
      '.j90CrowdComp{font-size:6px;color:#b6c3ca;padding:0 4px;text-align:center;white-space:nowrap;}',
      '.j90MatchPoss{display:flex;align-items:center;justify-content:space-between;gap:5px;padding:5px 7px;margin-top:4px;border:1px solid rgba(255,255,255,.07);border-radius:7px;background:#080d0f;font-size:7px;}',
      '.j90MatchPoss b{font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.j90PossDot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;box-shadow:0 0 0 2px rgba(255,255,255,.08);vertical-align:-1px;}',
      '.j90MatchStatLine{display:grid;grid-template-columns:1fr auto 1fr;gap:4px;align-items:center;padding-top:3px;font-size:6px;color:#7e8b92;}',
      '.j90MatchStatLine i{height:3px;border-radius:3px;background:#192124;overflow:hidden;display:block;}',
      '.j90MatchStatLine i:before{content:"";display:block;width:var(--w,50%);height:100%;background:var(--c,#4dd58a);}',
      '.j90MatchCanvas{background:linear-gradient(180deg,#13472c,#0d3824)!important;box-shadow:inset 0 0 0 999px rgba(0,0,0,.03);}',
      '@keyframes j90CrowdWave{0%{transform:translateX(-8px)}100%{transform:translateX(8px)}}',
      '@media(prefers-reduced-motion:reduce){.j90CrowdSide:after{animation:none!important}}'
    ].join('');
    document.head.appendChild(s);
  }

  function patchView(){
    if(typeof mgrMatchView!=='function'||mgrMatchView.__j90ai2)return;
    var old=mgrMatchView;
    function wrapped(){
      var html=old.apply(this,arguments),m=S&&S.match2d;
      if(!html||!m)return html;
      ensureMatch(m);
      var hp=m.palette.home,ap=m.palette.away,comp=escLocal(m.competition);
      var strip='<div class="j90MatchWrap"><div class="j90CrowdStrip" style="--comp:'+escLocal(m.compAccent||'#f5b942')+'">'+
        '<div class="j90CrowdSide" style="--c1:'+hp[0]+';--c2:'+hp[1]+'"><span>TORCIDA · '+escLocal(m.home)+'</span></div>'+
        '<div class="j90CrowdComp">'+comp+'</div>'+
        '<div class="j90CrowdSide" style="--c1:'+ap[0]+';--c2:'+ap[1]+';text-align:right"><span>'+escLocal(m.away)+' · TORCIDA</span></div>'+
      '</div><div id="j90MatchPoss" class="j90MatchPoss"><span>POSSE</span><b>Preparando…</b></div><div class="j90MatchStatLine"><span id="j90HomePossStat">50%</span><i id="j90PossBar" style="--w:50%;--c:'+hp[0]+'"></i><span id="j90AwayPossStat">50%</span></div>';
      return html.replace('<canvas id="j90MatchCanvas"',strip+'<canvas id="j90MatchCanvas"');
    }
    wrapped.__j90ai2=true;wrapped.__original=old;
    mgrMatchView=wrapped;
    addMatchCss();
  }

  function patchHud(){
    if(typeof mgrMatchHud!=='function'||mgrMatchHud.__j90ai2)return;
    var old=mgrMatchHud;
    function wrapped(){
      old.apply(this,arguments);
      var m=S&&S.match2d,d=m&&m._dom;if(!m||!d)return;
      ensureMatch(m);
      var poss=document.getElementById('j90MatchPoss'),hp=document.getElementById('j90HomePossStat'),ap=document.getElementById('j90AwayPossStat'),bar=document.getElementById('j90PossBar');
      if(poss)poss.innerHTML='<span>POSSE</span><b><i class="j90PossDot" style="background:'+(m.possessionTeam==='home'?m.palette.home[0]:m.palette.away[0])+'"></i>'+escLocal(m.possessionName||'Disputa')+'</b>';
      var total=num(m.stats.possessionHome,0)+num(m.stats.possessionAway,0),homePct=total>0?Math.round(num(m.stats.possessionHome,0)/total*100):50,awayPct=100-homePct;
      if(hp)hp.textContent=homePct+'%';if(ap)ap.textContent=awayPct+'%';if(bar){bar.style.setProperty('--w',homePct+'%');bar.style.setProperty('--c',m.palette.home[0])}
      if(d.canvas)d.canvas.setAttribute('aria-label','Campo 2D. Posse atual: '+(m.possessionName||'disputa'));
    }
    wrapped.__j90ai2=true;wrapped.__original=old;mgrMatchHud=wrapped;
  }

  function patchDraw(){
    if(typeof mgrDraw2D!=='function'||mgrDraw2D.__j90ai2)return;
    var old=mgrDraw2D;
    function wrapped(){
      var m=S&&S.match2d;if(!m){old.apply(this,arguments);return}
      ensureMatch(m);
      var p=window.__J90_PERF||j90PerfState(),d=m._dom||{},c=d.canvas;
      if(!c){old.apply(this,arguments);return}
      var w=m._cw||c.clientWidth,h=m._ch||c.clientHeight,g=m._ctx||(c.getContext('2d',{alpha:false}));
      if(!w||!h||!g){old.apply(this,arguments);return}
      // Custom field + players. The old atlas remains an atmospheric layer only.
      if(!m._fieldCacheAI||m._fieldCacheAI.width!==Math.round(w)||m._fieldCacheAI.height!==Math.round(h)){
        var bg=document.createElement('canvas');bg.width=Math.round(w);bg.height=Math.round(h);var b=bg.getContext('2d');
        b.fillStyle='#124529';b.fillRect(0,0,w,h);
        for(var stripe=0;stripe<12;stripe++){b.fillStyle=stripe%2?'rgba(255,255,255,.018)':'rgba(0,0,0,.018)';b.fillRect(stripe*w/12,0,w/12,h)}
        b.strokeStyle='rgba(255,255,255,.52)';b.lineWidth=1.2;b.strokeRect(7,7,w-14,h-14);
        b.beginPath();b.moveTo(w/2,7);b.lineTo(w/2,h-7);b.stroke();b.beginPath();b.arc(w/2,h/2,Math.min(w,h)*.13,0,Math.PI*2);b.stroke();b.beginPath();b.arc(w/2,h/2,2,0,Math.PI*2);b.fillStyle='rgba(255,255,255,.5)';b.fill();
        function box(x1,x2){var bw=Math.abs(x2-x1);b.strokeRect(Math.min(x1,x2),h*.30,bw,h*.40);b.strokeRect(Math.min(x1,x2),h*.405,bw*.46,h*.19)}
        b.lineWidth=1;b.strokeStyle='rgba(255,255,255,.42)';box(7,w*.20);box(w*.80,w-7);
        b.beginPath();b.arc(w*.20,h*.5,Math.min(w,h)*.065, -Math.PI*.28,Math.PI*.28);b.stroke();b.beginPath();b.arc(w*.80,h*.5,Math.min(w,h)*.065,Math.PI*.72,Math.PI*1.28);b.stroke();
        m._fieldCacheAI=bg;
      }
      g.drawImage(m._fieldCacheAI,0,0,w,h);
      var camX=(.5-m.ball.x)*w*.16,camY=(.5-m.ball.y)*h*.10;g.save();g.translate(camX,camY);
      var pscale=p.low?.84:1;
      function drawPlayer(q,side){
        var pal=m.palette[side],isPoss=(m.possessionTeam===side&&m.possessionPlayerId===q.id);
        var x=q.x*w,y=q.y*h,r=p.low?5.5:7.3;
        g.save();
        if(isPoss){
          g.globalAlpha=.28+.08*Math.sin(performance.now()/120);
          g.fillStyle=pal[0];g.beginPath();g.arc(x,y,r+7,0,Math.PI*2);g.fill();
          g.globalAlpha=1;g.strokeStyle=pal[2];g.lineWidth=2;g.beginPath();g.arc(x,y,r+5,0,Math.PI*2);g.stroke();
        }
        g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(x,y+r*.7,r*.9,r*.32,0,0,Math.PI*2);g.fill();
        g.fillStyle=pal[0];g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
        if(!p.low){
          var v=q.visual||{};g.fillStyle=v.skin||'#9b6a4a';g.beginPath();g.arc(x,y-1.5,r*.55,0,Math.PI*2);g.fill();
          g.fillStyle=v.hair||'#171717';g.beginPath();g.arc(x,y-4,r*.5,Math.PI,Math.PI*2);g.fill();
          g.fillStyle=pal[1];g.fillRect(x-r*.28,y+2,r*.56,r*.78);
          if(isPoss){g.fillStyle='#fff';g.font='700 7px system-ui';g.textAlign='center';g.fillText('●',x,y-r-10)}
          if(!p.low&&q.number!=null){g.fillStyle=pal[2];g.font='700 6px system-ui';g.textAlign='center';g.fillText(String(q.number),x,y+2)}
          g.fillStyle='#e9eef0';g.font='600 7px system-ui';g.textAlign='center';g.globalAlpha=isPoss?1:.72;g.fillText(String(q.name||'').slice(0,13),x,y+r+11);g.globalAlpha=1;
        }
        g.restore();
      }
      for(var i=0;i<m.players.length;i++)drawPlayer(m.players[i],'home');
      for(var j=0;j<m.oppPlayers.length;j++)drawPlayer(m.oppPlayers[j],'away');
      // Ball is deliberately drawn last so possession is unambiguous.
      var owner=getPlayer(m,m.possessionTeam,m.possessionPlayerId);
      var bx=m.ball.x*w,by=m.ball.y*h;
      if(owner&&!m.ball.flight){bx=owner.x*w+(m.possessionTeam==='home'?4:-4);by=owner.y*h-2}
      g.fillStyle='rgba(255,255,255,.96)';g.beginPath();g.arc(bx,by,p.low?2.8:3.6,0,Math.PI*2);g.fill();
      if(!p.low){g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.beginPath();g.arc(bx,by,7,0,Math.PI*2);g.stroke()}
      g.restore();
      if(m._possTransition){m._possTransition=false}
    }
    wrapped.__j90ai2=true;wrapped.__original=old;mgrDraw2D=wrapped;
  }

  function patchTick(){
    if(typeof mgrMatchTick!=='function'||mgrMatchTick.__j90ai2)return;
    mgrMatchTick.__original=mgrMatchTick;mgrMatchTick=tick;mgrMatchTick.__j90ai2=true;
  }

  function patchStart(){
    if(typeof mgrStartMatch!=='function'||mgrStartMatch.__j90ai2)return;
    var old=mgrStartMatch;
    async function wrapped(){
      var out=await old.apply(this,arguments);
      if(S&&S.match2d)ensureMatch(S.match2d);
      return out;
    }
    wrapped.__j90ai2=true;wrapped.__original=old;mgrStartMatch=wrapped;
  }

  function patchTactic(){
    if(typeof mgrMatchTactic!=='function'||mgrMatchTactic.__j90ai2)return;
    var old=mgrMatchTactic;
    function wrapped(t){
      var out=old.apply(this,arguments);
      if(S&&S.match2d){ensureMatch(S.match2d);S.match2d.tactic=t;S.match2d._manualTacticAt=S.match2d._simClock||0;S.match2d._manualTactic=t}
      return out;
    }
    wrapped.__j90ai2=true;wrapped.__original=old;mgrMatchTactic=wrapped;
  }

  function patchSub(){
    if(typeof mgrMatchSub!=='function'||mgrMatchSub.__j90ai2)return;
    var old=mgrMatchSub;
    function wrapped(id){
      var out=old.apply(this,arguments);
      if(S&&S.match2d)ensureMatch(S.match2d);
      return out;
    }
    wrapped.__j90ai2=true;wrapped.__original=old;mgrMatchSub=wrapped;
  }

  function patchFinish(){
    if(typeof mgrMatchFinish!=='function'||mgrMatchFinish.__j90ai2)return;
    var old=mgrMatchFinish;
    function wrapped(){
      var m=S&&S.match2d;
      if(m)adaptFinish(m);
      return old.apply(this,arguments);
    }
    wrapped.__j90ai2=true;wrapped.__original=old;mgrMatchFinish=wrapped;
  }

  function primeCurrent(){
    addMatchCss();
    try{patchView();patchHud();patchDraw();patchTick();patchStart();patchTactic();patchSub();patchFinish()}catch(e){console.warn('J90 AI 2.0 patch:',e)}
  }

  window.J90AI2={
    version:VERSION,
    status:function(){return{version:VERSION,matches:num(LEARN.matches,0),teams:Object.keys(LEARN.teams).length,storageKey:STORE}},
    learning:function(){return LEARN},
    reset:function(){try{localStorage.removeItem(STORE)}catch(e){}LEARN={version:VERSION,matches:0,teams:{},global:{},updatedAt:0};return true},
    teamProfile:function(team){return teamMemory(team)},
    palette:teamPalette,
    competition:function(){return competitionName()}
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',primeCurrent,{once:true});
  else primeCurrent();
  // Some manager functions are declared later in the same inline script, so retry
  // once without creating another animation loop or timer.
  Promise.resolve().then(primeCurrent);
})();
