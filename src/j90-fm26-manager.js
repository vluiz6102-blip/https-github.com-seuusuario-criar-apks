/* Jornada 90 Manager Core
 * FM26 migration layer: career, squad, scouting, transfers, training,
 * finance, competitions and adaptive tactical AI.
 * Mobile-first implementation for Capacitor/WebView.
 */
(function(){
  'use strict';

  const VERSION='1.0.0-fm26-mobile';
  const KEY='j90.fm26.state.v1';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
  const uid=(p='j90')=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);

  const ATTRS=['pace','acceleration','stamina','strength','passing','vision','dribbling','finishing','positioning','marking','tackling','decision','workRate','composure'];
  const FORMATIONS={
    '4-3-3':{def:4,mid:3,att:3,width:72},
    '4-2-3-1':{def:4,mid:5,att:1,width:66},
    '4-4-2':{def:4,mid:4,att:2,width:68},
    '3-5-2':{def:3,mid:5,att:2,width:76},
    '5-3-2':{def:5,mid:3,att:2,width:58}
  };

  function defaultState(){
    return {
      version:VERSION,
      season:1, week:1, day:1,
      club:{id:'j90-player',name:'Jornada FC',reputation:65,balance:50000000,transferBudget:15000000,wageBudget:500000},
      manager:{name:'Victor Luiz',reputation:50,points:0,trophies:0},
      tactics:{formation:'4-3-3',mentality:'Balanced',pressing:'Medium',defensiveLine:'Standard',width:'Standard',tempo:'Standard'},
      squad:[], market:[], transfers:[], training:{focus:'balanced',intensity:'normal'}, injuries:[],
      competitions:{league:{name:'Liga Nacional',table:[],fixtures:[]},cups:[]},
      calendar:[], history:[], news:[],
      finance:{transactions:[],income:0,expense:0},
      scouting:{shortlist:[],assignments:[]},
      settings:{difficulty:1,autosave:true}
    };
  }

  function load(){
    try{
      const raw=localStorage.getItem(KEY);
      if(!raw)return defaultState();
      const s=JSON.parse(raw), d=defaultState();
      return Object.assign(d,s,{
        club:Object.assign(d.club,s.club||{}),
        manager:Object.assign(d.manager,s.manager||{}),
        tactics:Object.assign(d.tactics,s.tactics||{}),
        training:Object.assign(d.training,s.training||{}),
        finance:Object.assign(d.finance,s.finance||{}),
        scouting:Object.assign(d.scouting,s.scouting||{}),
        settings:Object.assign(d.settings,s.settings||{})
      });
    }catch(e){return defaultState();}
  }

  let state=load();
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(e){return false;}}
  function emit(){try{window.dispatchEvent(new CustomEvent('j90:fm26',{detail:api.summary()}));}catch(e){}}

  function normalizePlayer(p,i=0){
    const x=Object.assign({},p||{});
    x.id=String(x.id||x.uid||uid('player'));
    x.name=String(x.name||x.player_name||('Jogador '+(i+1)));
    x.position=String(x.position||'MC');
    x.age=clamp(num(x.age,21),15,45);
    x.ca=clamp(num(x.ca||x.overall,60),1,200);
    x.pa=clamp(num(x.pa||x.potential,x.ca),-200,200);
    x.club=x.club||'Jornada FC';
    x.value=Math.max(0,num(x.value||x.price,Math.round(x.ca*x.ca*1200)));
    x.wage=Math.max(0,num(x.wage,Math.round(x.ca*150)));
    x.fitness=clamp(num(x.fitness,100),0,100);
    x.morale=clamp(num(x.morale,75),0,100);
    x.attributes=x.attributes||{};
    for(const a of ATTRS)x.attributes[a]=clamp(num(x.attributes[a],Math.round(x.ca/10)),1,20);
    return x;
  }

  function seedSquad(){
    if(state.squad.length)return;
    const pos=['GK','RB','CB','CB','LB','DM','MC','MC','RW','ST','LW','GK','CB','LB','MC','RW','ST','CB'];
    state.squad=pos.map((p,i)=>normalizePlayer({id:'j90p'+i,name:'Jogador '+(i+1),position:p,age:18+(i%15),ca:62+(i%28),pa:70+(i%35),club:state.club.name},i));
  }
  seedSquad();

  function allPlayers(){
    const roster=Array.isArray(window.J90_ROSTERS)?window.J90_ROSTERS:[];
    const arr=[];
    if(Array.isArray(roster))for(const t of roster)for(const p of (t.players||[]))arr.push(normalizePlayer(p,arr.length));
    return state.squad.concat(arr);
  }

  function searchPlayers(filters={}){
    const q=String(filters.search||filters.search_text||'').toLowerCase().trim();
    let a=allPlayers().filter(p=>{
      if(q&&!([p.name,p.position,p.club,p.nationality].join(' ').toLowerCase().includes(q)))return false;
      if(filters.position&&!p.position.toLowerCase().includes(String(filters.position).toLowerCase()))return false;
      if(filters.minAge!=null&&p.age<num(filters.minAge))return false;
      if(filters.maxAge!=null&&p.age>num(filters.maxAge))return false;
      if(filters.minCA!=null&&p.ca<num(filters.minCA))return false;
      if(filters.maxCA!=null&&p.ca>num(filters.maxCA))return false;
      if(filters.nationality&&p.nationality!==filters.nationality)return false;
      if(filters.club&&p.club!==filters.club)return false;
      return true;
    });
    const sort=filters.sort||'relevance';
    a.sort((x,y)=>sort==='age'?x.age-y.age:sort==='name'?x.name.localeCompare(y.name):sort==='ca'?y.ca-x.ca:sort==='pa'?y.pa-x.pa:(y.ca-x.ca));
    const offset=Math.max(0,num(filters.offset,0)),limit=clamp(num(filters.limit,50),1,200);
    return {items:a.slice(offset,offset+limit),total:a.length,hasMore:offset+limit<a.length};
  }

  function player(id){return allPlayers().find(p=>String(p.id)===String(id))||null;}

  function recordFinance(amount,type,category,description){
    amount=num(amount); if(!amount)return;
    const tx={id:uid('tx'),date:new Date().toISOString(),amount,type,category,description};
    state.finance.transactions.unshift(tx);
    if(type==='income'){state.finance.income+=amount;state.club.balance+=amount;}
    else {state.finance.expense+=Math.abs(amount);state.club.balance-=Math.abs(amount);}
  }

  function canSpend(amount,type='general'){
    amount=Math.max(0,num(amount));
    if(state.club.balance<amount)return {ok:false,reason:'Saldo insuficiente'};
    if(type==='transfer'&&state.club.transferBudget<amount)return {ok:false,reason:'Orçamento de transferências insuficiente'};
    return {ok:true};
  }

  function listPlayer(id,askingPrice){
    const p=player(id); if(!p)return {ok:false,reason:'Jogador não encontrado'};
    const price=Math.max(1,num(askingPrice,p.value));
    state.market=state.market.filter(x=>x.playerId!==p.id);
    state.market.push({playerId:p.id,askingPrice:price,listedAt:Date.now(),club:state.club.name});
    return {ok:true,player:p,askingPrice:price};
  }

  function submitBid(playerId,amount,fromClub='Jornada FC'){
    const p=player(playerId); amount=Math.max(0,num(amount));
    if(!p)return {ok:false,accepted:false,message:'Jogador não encontrado'};
    const check=canSpend(amount,'transfer'); if(!check.ok)return {ok:false,accepted:false,message:check.reason};
    const strength=clamp(amount/Math.max(1,p.value),0.25,2);
    const probability=clamp(.2+strength*.42+(p.morale<50?.08:0),.05,.95);
    const accepted=Math.random()<probability;
    if(accepted){
      state.club.transferBudget-=amount;
      const own=state.squad.find(x=>x.id===p.id);
      if(!own){const copy=normalizePlayer(p);copy.club=state.club.name;state.squad.push(copy);}
      state.transfers.push({id:uid('transfer'),playerId:p.id,playerName:p.name,from:p.club,to:state.club.name,amount,type:'transfer',date:new Date().toISOString()});
      recordFinance(-amount,'expense','transfer','Contratação de '+p.name);
    }
    return {ok:true,accepted,message:accepted?'Transferência aceita':'Oferta recusada',bidAmount:amount,acceptanceProbability:probability,fromClub};
  }

  function trainWeek(){
    const focus=state.training.focus||'balanced', intensity=state.training.intensity||'normal';
    const mult=intensity==='heavy'?1.35:intensity==='light'?.7:1;
    let points=0;
    for(const p of state.squad){
      p.fitness=clamp(p.fitness-(intensity==='heavy'?5:intensity==='light'?1:3),0,100);
      if(p.age<24&&p.fitness>45){
        const chance=(p.age<=18?.75:.48)*mult;
        if(Math.random()<chance){
          const attr=focus==='attack'?['finishing','dribbling','pace']:focus==='defense'?['marking','tackling','positioning']:focus==='fitness'?['stamina','endurance','strength']:['passing','vision','decision'];
          const key=attr[Math.floor(Math.random()*attr.length)];
          p.attributes[key]=clamp(num(p.attributes[key],10)+1,1,20);
          p.ca=clamp(p.ca+.2,1,200); points++;
        }
      }
      if(p.age>30&&Math.random()<.12)p.ca=Math.max(1,p.ca-.2);
    }
    state.news.unshift({type:'training',week:state.week,text:points+' melhorias de treino registradas.'});
    return {players:state.squad.length,improvementPoints:points,focus,intensity};
  }

  function aiTacticalAdjustment(ctx={}){
    const minute=num(ctx.minute,0),diff=num(ctx.scoreDifference,0),pos=num(ctx.possession,50);
    const sot=num(ctx.shotsOnTarget,0),oppSot=num(ctx.opponentShotsOnTarget,0),danger=num(ctx.dangerousAttacks,0),oppDanger=num(ctx.opponentDangerousAttacks,0);
    let t=Object.assign({},state.tactics),reason='Equilíbrio mantido';
    if(minute>=60&&diff<0){
      t.mentality=minute>=78?'Very Attacking':'Attacking';t.pressing='High';t.tempo='Fast';reason='Busca pelo empate/vitória';
    }else if(minute>=65&&diff>0){
      t.mentality='Cautious';t.pressing='Medium';t.tempo='Slow';t.defensiveLine='Deep';reason='Proteção da vantagem';
    }else if(oppSot>sot+2||oppDanger>danger+3){
      t.defensiveLine='Deep';t.pressing='Medium';reason='Redução da vulnerabilidade defensiva';
    }else if(pos<42){
      t.mentality='Positive';t.tempo='Fast';reason='Recuperação do controle territorial';
    }
    state.tactics=t; return {changed:JSON.stringify(t)!==JSON.stringify(state.tactics),tactics:t,reason,urgency:clamp(Math.abs(diff)*.25+(oppSot-sot)*.08,0,1)};
  }

  function simulateMatch(home=state.club.name,away='Adversário',homeCA=70,awayCA=70,opts={}){
    const hc=Math.max(1,num(homeCA,70)),ac=Math.max(1,num(awayCA,70));
    const hExp=clamp(1.25*(hc/(hc+ac))*(opts.homeAdvantage===false?1:1.15)*2.1,.15,4.5);
    const aExp=clamp(1.25*(ac/(hc+ac))*2.1,.15,4.5);
    const poisson=lambda=>{let L=Math.exp(-lambda),k=0,p=1;do{k++;p*=Math.random();}while(p>L);return k-1;};
    const hs=poisson(hExp),as=poisson(aExp);
    const events=[]; for(let i=0;i<hs;i++)events.push({minute:8+Math.floor(Math.random()*82),type:'goal',team:'home'});
    for(let i=0;i<as;i++)events.push({minute:8+Math.floor(Math.random()*82),type:'goal',team:'away'});
    events.sort((a,b)=>a.minute-b.minute);
    const possession=clamp(Math.round(50+(hc-ac)*.12),25,75);
    const shotsH=Math.max(hs+1,Math.round(8+hc/12+Math.random()*7)),shotsA=Math.max(as+1,Math.round(8+ac/12+Math.random()*7));
    return {homeTeam:home,awayTeam:away,homeScore:hs,awayScore:as,events,possessionHome:possession,possessionAway:100-possession,shotsHome:shotsH,shotsAway:shotsA,shotsOnTargetHome:Math.min(shotsH,Math.max(hs,Math.round(shotsH*.35))),shotsOnTargetAway:Math.min(shotsA,Math.max(as,Math.round(shotsA*.35)))};
  }

  function advanceWeek(){
    state.week++;
    if(state.week>38){state.week=1;state.season++;}
    for(const p of state.squad)p.fitness=clamp(p.fitness+12,0,100);
    const training=trainWeek();
    save();emit();
    return {season:state.season,week:state.week,training};
  }

  function addScoutingTarget(playerId){
    if(!state.scouting.shortlist.includes(String(playerId)))state.scouting.shortlist.push(String(playerId));
    save();emit();return state.scouting.shortlist.slice();
  }

  function summary(){
    return {version:VERSION,season:state.season,week:state.week,club:state.club,manager:state.manager,tactics:state.tactics,squadSize:state.squad.length,marketSize:state.market.length,shortlistSize:state.scouting.shortlist.length,balance:state.club.balance};
  }

  const api={
    version:VERSION,state,save,summary,player,searchPlayers,recordFinance,canSpend,
    listPlayer,submitBid,trainWeek,aiTacticalAdjustment,simulateMatch,advanceWeek,
    addScoutingTarget,
    getSquad:()=>state.squad.slice(),
    getMarket:()=>state.market.slice(),
    getFinance:()=>Object.assign({},state.finance),
    getCompetitions:()=>state.competitions,
    reset:()=>{state=defaultState();seedSquad();save();emit();return summary();}
  };
  window.J90FM26=api;
  window.J90ManagerCore=api;
  save();
  emit();
})();