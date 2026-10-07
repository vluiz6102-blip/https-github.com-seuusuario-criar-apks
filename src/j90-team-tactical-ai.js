/* Jornada 90 Team Tactical AI 1.0
 * Converts each club's own XI/bench/traits into a distinct match behaviour.
 */
(function(){
  'use strict';
  if(window.__J90_TEAM_TACTICAL_AI__)return;
  window.__J90_TEAM_TACTICAL_AI__=true;

  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v));};
  var lower=function(v){return String(v||'').toLowerCase();};
  var named={
    'real madrid':{tempo:.78,press:.62,risk:.72,width:.82,transition:.88,build:.76},
    'barcelona':{tempo:.72,press:.76,risk:.62,width:.78,transition:.70,build:.91},
    'manchester city':{tempo:.66,press:.82,risk:.56,width:.86,transition:.64,build:.94},
    'liverpool':{tempo:.82,press:.88,risk:.68,width:.84,transition:.92,build:.67},
    'arsenal':{tempo:.68,press:.79,risk:.58,width:.81,transition:.70,build:.84},
    'chelsea':{tempo:.70,press:.74,risk:.59,width:.80,transition:.73,build:.80},
    'psg':{tempo:.76,press:.72,risk:.70,width:.88,transition:.86,build:.78},
    'paris saint-germain':{tempo:.76,press:.72,risk:.70,width:.88,transition:.86,build:.78},
    'bayern':{tempo:.82,press:.86,risk:.69,width:.84,transition:.79,build:.84},
    'inter':{tempo:.63,press:.68,risk:.50,width:.72,transition:.78,build:.70},
    'milan':{tempo:.67,press:.66,risk:.55,width:.76,transition:.72,build:.72},
    'juventus':{tempo:.59,press:.60,risk:.43,width:.68,transition:.72,build:.67},
    'manchester united':{tempo:.73,press:.67,risk:.66,width:.80,transition:.83,build:.66},
    'tottenham':{tempo:.80,press:.78,risk:.70,width:.86,transition:.86,build:.68},
    'palmeiras':{tempo:.64,press:.72,risk:.53,width:.74,transition:.78,build:.68},
    'flamengo':{tempo:.75,press:.75,risk:.66,width:.82,transition:.78,build:.77},
    'botafogo':{tempo:.61,press:.64,risk:.54,width:.72,transition:.74,build:.63},
    'atletico mineiro':{tempo:.71,press:.71,risk:.62,width:.77,transition:.76,build:.66},
    'sao paulo':{tempo:.61,press:.66,risk:.48,width:.70,transition:.68,build:.70},
    'corinthians':{tempo:.58,press:.61,risk:.45,width:.68,transition:.71,build:.61}
  };

  function profileFor(team,plan){
    var n=lower(team),p=null;
    Object.keys(named).some(function(k){if(n===k||n.indexOf(k)>=0){p=named[k];return true}return false;});
    if(!p)p={tempo:.62,press:.58,risk:.50,width:.68,transition:.64,build:.60};
    p=Object.assign({},p);
    if(plan){
      var st=lower(plan.style),tr=plan.traits||{};
      if(st==='elite'){p.build+=.04;p.press+=.03}
      if(st==='development'){p.risk-=.05;p.tempo-=.04}
      if(tr.amplitude)p.width+=Number(tr.amplitude)*.10;
      if(tr.centralProtection)p.build+=Number(tr.centralProtection)*.07;
      if(tr.depthAttack)p.transition+=Number(tr.depthAttack)*.09;
      if(tr.betweenLines)p.risk+=Number(tr.betweenLines)*.08;
      if(/4-2-3-1/.test(String(plan.formation||'')))p.build+=.03;
      if(/4-3-3/.test(String(plan.formation||'')))p.width+=.04;
      if(/5-3-2|4-4-2/.test(String(plan.formation||'')))p.transition+=.03;
    }
    return p;
  }

  function install(){
    if(typeof window.j90TeamBrain!=='function'||window.j90TeamBrain.__j90TeamAI)return false;
    var old=window.j90TeamBrain;
    if(old.__j90TeamAI)return true;
    var wrapped=function(team,players,tactic){
      var base=old.apply(this,arguments)||{};
      var plan=null;
      try{plan=window.J90_LINEUP_AI&&window.J90_LINEUP_AI.get?window.J90_LINEUP_AI.get(team,Array.isArray(players)?players:[],null):null}catch(e){}
      var p=profileFor(team,plan),avg=Array.isArray(players)&&players.length?players.reduce(function(s,x){return s+(Number(x.ovr)||65)},0)/players.length:65;
      var fit=Array.isArray(players)&&players.length?players.reduce(function(s,x){return s+(Number(x.form)||70)},0)/players.length:70;
      var formBoost=(fit-70)/180,quality=(avg-65)/160;
      var t=lower(tactic),attackBias=/ofens|ataque|agress/.test(t)?.08:/defens|recu/.test(t)?-.07:0;
      return Object.assign({},base,{
        quality:cl(.48+quality+formBoost,.35,.98),
        attack:cl(.42+p.transition*.18+p.build*.16+p.risk*.10+quality*.32+attackBias,.30,.99),
        defense:cl(.44+(1-p.risk)*.18+p.press*.16+quality*.28+(fit-70)/250,.30,.99),
        press:cl(p.press+attackBias*.4,.20,.98),
        tempo:cl(p.tempo+attackBias*.35,.20,.98),
        risk:cl(p.risk+attackBias,.10,.95),
        width:cl(p.width,.25,.98),
        directness:cl(p.transition*.72+p.risk*.28,.20,.98),
        buildUp:cl(p.build,.20,.98),
        transition:cl(p.transition,.20,.99),
        adapt:cl(.55+p.press*.15+p.build*.10,.25,.98),
        fatigue:cl((100-fit)/100,.05,.82),
        tacticalProfile:p,
        lineupPlan:plan,
        identity:'club-specific'
      });
    };
    wrapped.__j90TeamAI=true;wrapped.__original=old;window.j90TeamBrain=wrapped;return true;
  }
  var n=0;(function retry(){if(!install()&&n++<100)setTimeout(retry,100);})();
  window.J90TeamTacticalAI={profile:profileFor,version:'1.0'};
})();