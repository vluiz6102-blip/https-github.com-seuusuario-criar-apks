/* Jornada 90 Manager Plus
 * Lightweight expansion systems. No RAF loop, no heavyweight framework.
 * Uses a separate localStorage save layer so the core manager remains stable.
 */
(function(){
  'use strict';

  var KEY_PREFIX='j90_plus_v2:';
  var active='club';
  var sceneIndex=0;
  var archiveCache={};
  var missionTick=null;

  function bridge(){return window.J90ManagerBridge||null}
  function manager(){var b=bridge();return b&&typeof b.getState==='function'?b.getState():null}
  function clubName(){
    var s=manager();
    return String(s&&((s.managerClub)||(s.club&&s.club.n))||'Clube Jornada 90');
  }
  function key(){return KEY_PREFIX+clubName().toLowerCase().replace(/[^a-z0-9]+/g,'_')}
  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
    })
  }
  function money(v){
    var n=Number(v)||0;
    var sign=n<0?'-':'';
    n=Math.abs(n);
    if(n>=1000000)return sign+'R$ '+(n/1000000).toFixed(2).replace('.',',')+' mi';
    if(n>=1000)return sign+'R$ '+Math.round(n/1000)+' mil';
    return sign+'R$ '+Math.round(n);
  }
  function plus(){
    return {
      v:2,
      reputation:12,
      momentum:0,
      facilities:{training:1,academy:1,medical:1,analysis:1,stadium:1},
      staff:{assistant:0,scout:0,analyst:0,physio:0},
      youth:[],
      missions:[],
      sponsors:[],
      press:[],
      awards:[],
      messages:[],
      records:{matches:0,wins:0,draws:0,losses:0,bestOvr:0,transferValue:0,academyPromotions:0},
      sceneIndex:0
    }
  }
  function state(){
    var s=manager(), d=plus();
    if(!s)return d;
    try{
      var raw=localStorage.getItem(key());
      if(raw){
        var saved=JSON.parse(raw)||{};
        Object.keys(d).forEach(function(k){
          if(saved[k]!==undefined)d[k]=saved[k]
        })
      }
    }catch(e){}
    d.facilities=d.facilities||plus().facilities;
    d.staff=d.staff||plus().staff;
    d.youth=Array.isArray(d.youth)?d.youth:[];
    d.missions=Array.isArray(d.missions)?d.missions:[];
    d.sponsors=Array.isArray(d.sponsors)?d.sponsors:[];
    d.press=Array.isArray(d.press)?d.press:[];
    d.awards=Array.isArray(d.awards)?d.awards:[];
    d.messages=Array.isArray(d.messages)?d.messages:[];
    d.records=Object.assign(plus().records,d.records||{});
    syncAccrual(d,s);
    return d
  }
  function persist(d){
    try{localStorage.setItem(key(),JSON.stringify(d))}catch(e){}
  }
  function syncAccrual(d,s){
    var round=Number(s&&s.managerRound)||0;
    d.sponsors.forEach(function(sp){
      if(!sp.active)return;
      var last=Number(sp.lastRound)||0;
      var delta=Math.max(0,round-last);
      if(delta>0){
        var amount=delta*(Number(sp.weekly)||0);
        if(amount){
          s.finance=s.finance||{budget:0,revenue:0,expenses:0,debt:0};
          s.finance.budget=(Number(s.finance.budget)||0)+amount;
          s.finance.revenue=(Number(s.finance.revenue)||0)+amount;
        }
        sp.lastRound=round
      }
    })
  }
  function commit(d,msg){
    var s=manager();
    if(!s)return;
    persist(d);
    var b=bridge();
    if(b&&typeof b.save==='function')b.save();
    if(msg){
      s.managerNews=Array.isArray(s.managerNews)?s.managerNews:[];
      s.managerNews.unshift({y:s.year,r:s.managerRound,t:'CENTRO JORNADA 90',b:msg});
      s.managerNews=s.managerNews.slice(0,20)
    }
    if(b&&typeof b.render==='function')b.render(1);
    renderPanel()
  }
  function spend(cost){
    var s=manager();
    if(!s)return false;
    s.finance=s.finance||{budget:0,revenue:0,expenses:0,debt:0};
    if((Number(s.finance.budget)||0)<cost){
      if(typeof window.toast==='function')window.toast('Caixa insuficiente',money(cost)+' necessários.');
      return false
    }
    s.finance.budget-=cost;
    s.finance.expenses=(Number(s.finance.expenses)||0)+cost;
    return true
  }
  function reward(amount){
    var s=manager();
    if(!s)return;
    s.finance=s.finance||{budget:0,revenue:0,expenses:0,debt:0};
    s.finance.budget=(Number(s.finance.budget)||0)+amount;
    s.finance.revenue=(Number(s.finance.revenue)||0)+amount
  }
  function toast(title,body){
    if(typeof window.toast==='function'){window.toast(title,body);return}
    var old=document.getElementById('j90PlusToast');if(old)old.remove();
    var el=document.createElement('div');el.id='j90PlusToast';
    el.textContent=title+(body?' · '+body:'');
    el.style.cssText='position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:10050;padding:10px 14px;border-radius:12px;background:#f5b942;color:#101418;font:800 12px system-ui;box-shadow:0 8px 28px rgba(0,0,0,.35)';
    document.body.appendChild(el);setTimeout(function(){el.remove()},2400)
  }
  function statPill(label,value){
    return '<div class="j90xStat"><b>'+esc(value)+'</b><small>'+esc(label)+'</small></div>'
  }
  function facilityCost(level){return [0,120,190,280,390,0][Math.min(5,Number(level)||1)]||0}
  function facilityLabel(k){
    return {training:'CT de treino',academy:'Academia',medical:'Centro médico',analysis:'Analítica',stadium:'Estádio'}[k]||k
  }
  function facilityEffect(k,l){
    var effects={
      training:'+'+((l-1)*2)+' forma em treinos',
      academy:'+'+((l-1)*3)+' potencial médio',
      medical:'-'+((l-1)*5)+'% risco de lesão',
      analysis:'+'+((l-1)*2)+' precisão no scout',
      stadium:'+'+((l-1)*4)+'% receita de bilheteria'
    };
    return effects[k]||''
  }
  function upgrade(k){
    var d=state(), l=Number(d.facilities[k])||1, cost=facilityCost(l);
    if(l>=5){toast('Instalação máxima','Nível 5 já alcançado.');return}
    if(!spend(cost))return;
    d.facilities[k]=l+1;
    d.momentum=Math.min(100,(Number(d.momentum)||0)+3);
    d.messages.unshift('Upgrade: '+facilityLabel(k)+' nível '+(l+1));
    commit(d,facilityLabel(k)+' evoluiu para o nível '+(l+1)+'.')
  }
  function hire(role){
    var d=state(), l=Number(d.staff[role])||0;
    var caps={assistant:3,scout:4,analyst:4,physio:4};
    var costs={assistant:[70,110,165],scout:[90,140,210,0],analyst:[85,130,190,0],physio:[80,125,180,0]};
    if(l>=caps[role]){toast('Equipe completa','Nível máximo alcançado.');return}
    var cost=costs[role][l]||100;
    if(!spend(cost))return;
    d.staff[role]=l+1;
    d.reputation=Math.min(100,(Number(d.reputation)||0)+1);
    commit(d,'Novo reforço na equipe: '+role+'.')
  }
  var firstNames=['Lucas','Rafael','Caio','Mateus','João','Enzo','Arthur','Pedro','Samuel','Guilherme','Heitor','Davi','Miguel','Vitor','Murilo','Nicolas','Luan','Yuri','Ryan','Theo'];
  var lastNames=['Silva','Oliveira','Souza','Costa','Almeida','Pereira','Santos','Ribeiro','Carvalho','Mendes','Barros','Ferreira','Lima','Machado','Teixeira','Nunes','Rocha','Moura','Azevedo','Borges'];
  var positions=['GOL','ZAG','LAT','VOL','MEI','PE','PD','ATA'];
  function hashText(t){
    var h=2166136261;
    for(var i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}
    return (h>>>0)
  }
  function rnd(seed,max){return Math.abs(Math.sin(seed*12.9898)*43758.5453)%1*max}
  function youthProspect(d,index){
    var seed=hashText(clubName()+'|'+(manager()?.year||2026)+'|'+(manager()?.managerRound||0)+'|'+index);
    var age=15+Math.floor(rnd(seed+1,4));
    var pos=positions[Math.floor(rnd(seed+2,positions.length))];
    var ovr=48+Math.floor(rnd(seed+3,17))+(Number(d.facilities.academy)||1);
    var potential=Math.min(92,ovr+14+Math.floor(rnd(seed+4,24))+(Number(d.facilities.academy)||1)*2);
    var name=firstNames[Math.floor(rnd(seed+5,firstNames.length))]+' '+lastNames[Math.floor(rnd(seed+6,lastNames.length))];
    return {
      id:'j90y_'+Date.now().toString(36)+'_'+index+'_'+Math.floor(seed),
      name:name,position:pos,age:age,ovr:ovr,potential:potential,
      nationality:'Brasil',salary:5+Math.floor(rnd(seed+7,15)),value:Math.max(20,ovr*2),
      form:68+Math.floor(rnd(seed+8,20)),morale:72,injury:0,sus:0,loaned:false,
      club:clubName(),style:['Criador','Velocista','Marcador','Finalizador','Construtor'][Math.floor(rnd(seed+9,5))]
    }
  }
  function academyIntake(){
    var d=state();
    if(d.youth.length>4){toast('Base cheia','Promova ou descarte uma leva antes de criar outra.');return}
    var cost=45;
    if(!spend(cost))return;
    var start=d.youth.length;
    for(var i=0;i<5;i++)d.youth.push(youthProspect(d,start+i));
    d.youth.sort(function(a,b){return b.potential-a.potential});
    d.messages.unshift('Nova geração da academia: 5 prospects.');
    commit(d,'A academia entregou uma nova geração de 5 jovens.')
  }
  function releaseYouth(id){
    var d=state();d.youth=d.youth.filter(function(p){return p.id!==id});persist(d);renderPanel()
  }
  function promote(id){
    var d=state(),p=d.youth.find(function(x){return x.id===id}),s=manager();
    if(!p||!s)return;
    s.roster=Array.isArray(s.roster)?s.roster:[];
    if(s.roster.length>=32){toast('Elenco cheio','Libere ou empreste alguém antes de promover.');return}
    if(!spend(30))return;
    var n=Object.assign({},p,{id:p.id,number:null,visual:{skin:'#9b6a48',hair:'#171717',hairStyle:'short'},important:false,star:false});
    s.roster.push(n);
    d.youth=d.youth.filter(function(x){return x.id!==id});
    d.records.academyPromotions=(Number(d.records.academyPromotions)||0)+1;
    d.reputation=Math.min(100,(Number(d.reputation)||0)+2);
    commit(d,p.name+' promovido ao elenco principal.')
  }
  var regions=[
    {id:'br',name:'Brasil',cost:30,reward:95,skill:'talentos nacionais'},
    {id:'latam',name:'América do Sul',cost:45,reward:130,skill:'mercado sul-americano'},
    {id:'eu',name:'Europa',cost:65,reward:190,skill:'mercado europeu'},
    {id:'africa',name:'África',cost:55,reward:155,skill:'potenciais físicos'},
  ];
  function mission(id){
    var d=state(),m=regions.find(function(x){return x.id===id});
    if(!m)return;
    if(d.missions.some(function(x){return x.id===id&&x.active})){toast('Scout ocupado','Essa missão já está em andamento.');return}
    if(!spend(m.cost))return;
    d.missions.push({id:id,region:m.name,active:true,startedAt:Date.now(),endsAt:Date.now()+45000+(m.cost*250),reward:m.reward+(Number(d.staff.scout)||0)*25});
    commit(d,'Scout enviado para '+m.name+'.')
  }
  function claimMission(index){
    var d=state(),m=d.missions[index];
    if(!m||!m.active)return;
    if(Date.now()<Number(m.endsAt)){toast('Ainda trabalhando','Volte após concluir a missão.');return}
    reward(Number(m.reward)||0);
    m.active=false;m.claimed=true;
    d.reputation=Math.min(100,(Number(d.reputation)||0)+1);
    d.records.transferValue=(Number(d.records.transferValue)||0)+(Number(m.reward)||0);
    d.messages.unshift('Scout concluído: '+m.region+' · '+money(m.reward));
    commit(d,'Relatório de scout concluído.')
  }
  var sponsors=[
    {id:'local',name:'Patrocinador local',upfront:90,weekly:18,rep:1},
    {id:'regional',name:'Marca regional',upfront:170,weekly:32,rep:2},
    {id:'elite',name:'Parceiro premium',upfront:320,weekly:55,rep:4}
  ];
  function signSponsor(id){
    var d=state(),s=sponsors.find(function(x){return x.id===id});
    if(!s)return;
    d.sponsors=d.sponsors.filter(function(x){return !x.active});
    reward(s.upfront);
    d.sponsors.push({id:s.id,name:s.name,upfront:s.upfront,weekly:s.weekly,active:true,lastRound:Number(manager()?.managerRound)||0});
    d.reputation=Math.min(100,(Number(d.reputation)||0)+s.rep);
    commit(d,'Novo contrato de patrocínio: '+s.name+'.')
  }
  function press(kind){
    var d=state(),s=manager();
    var map={
      calm:{title:'Coletiva equilibrada',rep:2,board:2,text:'Você prometeu consistência e evitou pressão desnecessária.'},
      bold:{title:'Coletiva ambiciosa',rep:4,board:-1,text:'Você elevou a expectativa pública para a temporada.'},
      youth:{title:'Coletiva da base',rep:3,board:1,text:'Você colocou a formação de jovens no centro do projeto.'}
    };
    var p=map[kind];if(!p||!s)return;
    d.reputation=Math.max(0,Math.min(100,(Number(d.reputation)||0)+p.rep));
    if(s.board){s.board.confidence=Math.max(0,Math.min(100,(Number(s.board.confidence)||0)+p.board))}
    d.press.unshift({y:s.year,r:s.managerRound,t:p.title});
    d.press=d.press.slice(0,8);
    commit(d,p.text)
  }
  function computedRecords(d,s){
    var h=Array.isArray(s&&s.managerHistory)?s.managerHistory:[];
    d.records.matches=h.length;
    d.records.wins=h.filter(function(x){return x.result==='Vitória'}).length;
    d.records.draws=h.filter(function(x){return x.result==='Empate'}).length;
    d.records.losses=h.filter(function(x){return x.result==='Derrota'}).length;
    var ro=Array.isArray(s&&s.roster)?s.roster:[];
    d.records.bestOvr=ro.reduce(function(n,p){return Math.max(n,Number(p.ovr)||0)},Number(d.records.bestOvr)||0);
    if(h.length>=18&&d.records.wins>=12&&!d.awards.includes('Temporada de elite')){
      d.awards.push('Temporada de elite')
    }
    if(d.records.academyPromotions>=3&&!d.awards.includes('Olho para a base'))d.awards.push('Olho para a base');
    if(d.reputation>=50&&!d.awards.includes('Nome forte na mídia'))d.awards.push('Nome forte na mídia');
  }
  function historyArchive(){
    var content=window.J90_CONTENT||{}, list=Array.isArray(content.openFootball)?content.openFootball:[];
    if(!list.length)return '<div class="j90xEmpty">Nenhum arquivo externo foi empacotado nesta build.</div>';
    var first=list[0];
    if(!archiveCache[first.file]){
      archiveCache[first.file]='loading';
      fetch('assets/j90-content/openfootball/'+first.file,{cache:'force-cache'}).then(function(r){return r.json()}).then(function(json){
        archiveCache[first.file]=json;renderPanel()
      }).catch(function(){archiveCache[first.file]=null;renderPanel()})
    }
    var data=archiveCache[first.file];
    if(data==='loading')return '<div class="j90xNote">Carregando arquivo '+esc(first.name)+'...</div>';
    if(!data)return '<div class="j90xNote">O arquivo histórico não pôde ser lido nesta execução.</div>';
    var games=[];
    if(Array.isArray(data.games))games=data.games;
    if(Array.isArray(data.rounds))data.rounds.forEach(function(r){if(Array.isArray(r.games))games=games.concat(r.games)});
    games=games.slice(-8).reverse();
    return '<div class="j90xArchive"><div><b>ARQUIVO '+esc(first.name)+'</b><small>Dados públicos empacotados para consulta offline</small></div>'+
      (games.length?games.map(function(g){
        var home=(g.team1&&g.team1.name)||g.homeTeam||g.home||'?';
        var away=(g.team2&&g.team2.name)||g.awayTeam||g.away||'?';
        var score=g.score&&g.score.ft?g.score.ft.join(' × '):(g.result||'');
        return '<div class="j90xArchiveRow"><span>'+esc(home)+' × '+esc(away)+'</span><b>'+esc(score)+'</b></div>'
      }).join(''):'<div class="j90xNote">Arquivo disponível, formato de resultados sem partidas interpretáveis.</div>')+
      '</div>'
  }
  function sceneList(){
    var c=window.J90_CONTENT||{};
    var by=(c.byTeam||{})[clubName()];
    if(Array.isArray(by)&&by.length)return by;
    var all=Array.isArray(c.scenes)?c.scenes.map(function(x){return x.file}):[];
    return all
  }
  function stadiumPane(d,s){
    var list=sceneList();
    if(list.length)sceneIndex=Math.min(Math.max(0,Number(d.sceneIndex)||0),list.length-1);
    var file=list[sceneIndex]||'';
    var src=file?'assets/j90-content/'+file:'';
    var count=(window.J90_CONTENT&&Number(window.J90_CONTENT.sceneCount))||list.length;
    return '<div class="j90xHeroMedia">'+
      (src?'<img src="'+esc(src)+'" alt="Cena de estádio Jornada 90" loading="lazy" decoding="async">':'<div class="j90xMediaFallback">90</div>')+
      '<div class="j90xMediaOverlay"><b>'+esc(clubName())+'</b><span>'+esc(file.split('/').pop()||'CENA')+'</span></div>'+
      '</div><div class="j90xMediaControls"><button data-j90x="scenePrev">‹ anterior</button><strong>'+Math.min(sceneIndex+1,count)+' / '+count+'</strong><button data-j90x="sceneNext">próxima ›</button></div>'+
      '<div class="j90xNote">O pack é carregado sob demanda. O app não decodifica centenas de imagens ao abrir.</div>'
  }
  function clubPane(d,s){
    var snap=null;
    try{snap=window.J90Ambience&&window.J90Ambience.snapshot?window.J90Ambience.snapshot():null}catch(e){}
    var activeSponsor=d.sponsors.find(function(x){return x.active});
    return '<div class="j90xStatGrid">'+
      statPill('REPUTAÇÃO',d.reputation+'/100')+
      statPill('MOMENTUM',d.momentum+'/100')+
      statPill('RODADA',(Number(s.managerRound)||0)+'/18')+
      statPill('ELENCO',(s.roster||[]).length)+'</div>'+
      '<div class="j90xCard"><div class="j90xTitle"><b>COLETIVA</b><small>Impacte a narrativa do clube</small></div><div class="j90xGrid3">'+
      '<button data-j90x="press:calm"><b>Equilíbrio</b><small>+estabilidade</small></button>'+
      '<button data-j90x="press:bold"><b>Ambição</b><small>+reputação</small></button>'+
      '<button data-j90x="press:youth"><b>Base</b><small>+projeto jovem</small></button>'+
      '</div></div>'+
      '<div class="j90xCard"><div class="j90xTitle"><b>AMBIENTE</b><small>Soundscape real do jogo</small></div>'+
      '<div class="j90xAmbient">'+
      statPill('CLIMA',snap&&snap.weather||'offline')+
      statPill('QUALIDADE',snap&&snap.quality||'auto')+
      statPill('CAMADAS',snap&&snap.activeAudioSources||0)+
      '</div>'+
      '<div class="j90xGrid4"><button data-j90x="weather:clear">Céu limpo</button><button data-j90x="weather:cloudy">Nublado</button><button data-j90x="weather:lightRain">Chuva leve</button><button data-j90x="weather:heavyRain">Chuva forte</button></div></div>'+
      '<div class="j90xCard"><div class="j90xTitle"><b>CONTRATO ATIVO</b><small>'+(activeSponsor?esc(activeSponsor.name):'Nenhum')+'</small></div>'+
      (activeSponsor?'<div class="j90xNote">Entrada '+money(activeSponsor.upfront)+' · '+money(activeSponsor.weekly)+' por rodada.</div>':
      '<div class="j90xGrid3">'+sponsors.map(function(x){return '<button data-j90x="sponsor:'+x.id+'"><b>'+esc(x.name)+'</b><small>+'+money(x.upfront)+' · '+money(x.weekly)+'/R</small></button>'}).join('')+'</div>')+
      '</div>'
  }
  function facilitiesPane(d){
    var keys=['training','academy','medical','analysis','stadium'];
    return '<div class="j90xFacilityGrid">'+keys.map(function(k){
      var l=Number(d.facilities[k])||1,cost=facilityCost(l);
      return '<div class="j90xFacility"><div><b>'+esc(facilityLabel(k))+'</b><span>Nível '+l+'/5</span></div><small>'+esc(facilityEffect(k,l))+'</small><button '+(l>=5?'disabled ':'')+' data-j90x="upgrade:'+k+'">'+(l>=5?'MÁXIMO':'Evoluir · '+money(cost))+'</button></div>'
    }).join('')+'</div>'
  }
  function academyPane(d){
    var y=d.youth||[];
    return '<div class="j90xTopAction"><div><b>ACADEMIA</b><small>Geração de jovens a cada ciclo</small></div><button data-j90x="academyIntake">Nova geração · R$ 45</button></div>'+
      (y.length?y.map(function(p){return '<div class="j90xPerson"><div><b>'+esc(p.name)+'</b><small>'+p.position+' · '+p.age+' anos · OVR '+p.ovr+'</small></div><span>POT '+p.potential+'</span><button data-j90x="promote:'+p.id+'">Promover</button><button data-j90x="releaseYouth:'+p.id+'">Descartar</button></div>'}).join(''):
      '<div class="j90xEmpty">Nenhuma leva ativa. Gere uma nova geração.</div>')
  }
  function staffPane(d){
    var roles=[['assistant','Assistente','Ajuda geral'],['scout','Olheiro','Mercado e potencial'],['analyst','Analista','Leitura de adversários'],['physio','Fisiologista','Recuperação']];
    return roles.map(function(r){
      var l=Number(d.staff[r[0]])||0,cost=({assistant:[70,110,165],scout:[90,140,210,0],analyst:[85,130,190,0],physio:[80,125,180,0]})[r[0]][l]||100,max=({assistant:3,scout:4,analyst:4,physio:4})[r[0]];
      return '<div class="j90xStaff"><div><b>'+esc(r[1])+'</b><small>'+esc(r[2])+' · Nível '+l+'/'+max+'</small></div><strong>'+l+'</strong><button '+(l>=max?'disabled ':'')+' data-j90x="hire:'+r[0]+'">'+(l>=max?'MÁX':'Contratar · '+money(cost))+'</button></div>'
    }).join('')
  }
  function scoutPane(d){
    var cards=d.missions.slice().reverse().map(function(m,i){
      var remaining=Math.max(0,Number(m.endsAt)-Date.now());
      return '<div class="j90xMission"><div><b>'+esc(m.region)+'</b><small>'+(m.active?(remaining?'Em andamento':'Pronto para relatório'):(m.claimed?'Concluída':'Parada'))+'</small></div>'+
        (m.active?'<button data-j90x="claim:'+d.missions.indexOf(m)+'">'+(remaining?'Verificar':'Receber · '+money(m.reward))+'</button>':'<span>✓</span>')+
        '</div>'
    }).join('');
    return '<div class="j90xMissionGrid">'+regions.map(function(r){
      return '<button data-j90x="mission:'+r.id+'"><b>'+esc(r.name)+'</b><small>'+money(r.cost)+' · '+money(r.reward)+' base</small></button>'
    }).join('')+'</div>'+cards+
      '<div class="j90xNote">As missões usam o relógio real e podem ser consultadas quando você retornar ao Centro.</div>'
  }
  function financePane(d,s){
    var budget=Number(s.finance&&s.finance.budget)||0,rep=Number(d.reputation)||0,stad=Number(d.facilities.stadium)||1;
    var ticket=Math.round(70+(stad-1)*28+(rep*.35));
    var wage=(s.roster||[]).reduce(function(n,p){return n+(Number(p.salary)||0)},0);
    return '<div class="j90xStatGrid">'+statPill('CAIXA',money(budget))+statPill('FOLHA',money(wage)+'/R')+statPill('BILHETERIA',money(ticket)+'/R')+statPill('DÍVIDA',money(Number(s.finance&&s.finance.debt)||0))+'</div>'+
      '<div class="j90xCard"><div class="j90xTitle"><b>PROJEÇÃO</b><small>18 rodadas</small></div><div class="j90xRows"><div><span>Receita anual estimada</span><b>'+money(ticket*18)+'</b></div><div><span>Folha estimada</span><b>'+money(wage*18)+'</b></div><div><span>Saldo projetado</span><b>'+money((ticket-wage)*18)+'</b></div></div></div>'+
      '<div class="j90xCard"><div class="j90xTitle"><b>PREMIUM</b><small>O Centro complementa, não substitui, o Caixa do Manager.</small></div><div class="j90xNote">Instalações aumentam receita e qualidade. Patrocínios pagam entrada e valor por rodada.</div></div>'
  }
  function historyPane(d,s){
    computedRecords(d,s);
    return '<div class="j90xStatGrid">'+
      statPill('JOGOS',d.records.matches)+statPill('VITÓRIAS',d.records.wins)+statPill('MELHOR OVR',d.records.bestOvr)+statPill('PROMOÇÕES',d.records.academyPromotions)+'</div>'+
      '<div class="j90xCard"><div class="j90xTitle"><b>CONQUISTAS</b><small>Marcos do projeto</small></div>'+
      (d.awards.length?d.awards.map(function(a){return '<div class="j90xAward">90 · '+esc(a)+'</div>'}).join(''):'<div class="j90xEmpty">Ainda não há conquistas. A temporada escreve o arquivo.</div>')+
      '</div>'+
      '<div class="j90xCard">'+historyArchive()+'</div>'+
      '<div class="j90xCard"><div class="j90xTitle"><b>LOG DO CLUBE</b><small>Últimos acontecimentos do Centro</small></div>'+
      (d.messages.slice(0,8).map(function(m){return '<div class="j90xLog">'+esc(m)+'</div>').join('')||'<div class="j90xEmpty">Sem registros ainda.</div>')+
      '</div>'
  }
  function panelBody(d,s){
    if(active==='club')return clubPane(d,s);
    if(active==='facilities')return facilitiesPane(d,s);
    if(active==='academy')return academyPane(d,s);
    if(active==='staff')return staffPane(d,s);
    if(active==='scout')return scoutPane(d,s);
    if(active==='finance')return financePane(d,s);
    if(active==='history')return historyPane(d,s);
    if(active==='stadium')return stadiumPane(d,s);
    return clubPane(d,s)
  }
  var NAV=[['club','Clube'],['facilities','Instalações'],['academy','Academia'],['staff','Staff'],['scout','Scout'],['finance','Finanças'],['history','História'],['stadium','Estádio']];
  function ensureStyle(){
    if(document.getElementById('j90xStyle'))return;
    var st=document.createElement('style');st.id='j90xStyle';
    st.textContent=
      '#j90Expansion{position:fixed;inset:0;z-index:10000;background:rgba(2,6,9,.97);color:#f2f5f6;font:14px/1.35 system-ui,sans-serif;display:grid;grid-template-rows:auto auto minmax(0,1fr);overscroll-behavior:contain}'+
      '.j90xHeader{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid #202830;background:#0a0f14}'+
      '.j90xHeader b{display:block;font-size:15px}.j90xHeader small{display:block;color:#8d9aa2;font-size:10px;margin-top:2px}'+
      '.j90xClose{border:1px solid #38434b;background:#141b22;color:#f5b942;border-radius:10px;padding:9px 12px;font-weight:900}'+
      '.j90xNav{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px;padding:6px;background:#081018;border-bottom:1px solid #1a252c}'+
      '.j90xNav button{min-width:0;min-height:42px;border:1px solid #202a31;border-radius:8px;background:#0d151b;color:#8d9aa2;font-size:10px;padding:4px 3px}.j90xNav button.on{color:#f5b942;border-color:#6c5527;background:#17140d;font-weight:900}'+
      '.j90xBody{overflow:auto;min-height:0;padding:8px 10px 18px;scrollbar-width:thin}'+
      '.j90xStatGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}.j90xStat{padding:7px;border:1px solid #202a31;border-radius:9px;background:#0d151b;text-align:center}.j90xStat b{display:block;font-size:11px;color:#f5b942}.j90xStat small{display:block;font-size:7px;color:#87939b;margin-top:2px}'+
      '.j90xCard{border:1px solid #202a31;border-radius:10px;background:#0d151b;padding:9px;margin-bottom:8px}.j90xTitle{display:flex;justify-content:space-between;gap:8px;align-items:end;margin-bottom:7px}.j90xTitle b{font-size:10px}.j90xTitle small{font-size:8px;color:#87939b;text-align:right}'+
      '.j90xGrid3,.j90xGrid4{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.j90xGrid4{grid-template-columns:repeat(4,1fr)}.j90xGrid3 button,.j90xGrid4 button,.j90xTopAction button,.j90xFacility button,.j90xStaff button,.j90xMission button,.j90xMissionGrid button{border:1px solid #29343c;background:#121a21;color:#dfe5e7;border-radius:9px;min-height:42px;padding:6px;font-size:9px}.j90xGrid3 button b,.j90xGrid3 button small,.j90xMissionGrid button b,.j90xMissionGrid button small{display:block}.j90xGrid3 button small,.j90xMissionGrid button small{color:#84919a;margin-top:2px;font-size:7px}'+
      '.j90xAmbient{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:7px}.j90xFacilityGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px}.j90xFacility,.j90xStaff,.j90xMission,.j90xPerson{border:1px solid #202a31;border-radius:9px;background:#0d151b;padding:8px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center}.j90xFacility>div b,.j90xStaff>div b,.j90xMission>div b,.j90xPerson>div b{display:block;font-size:10px}.j90xFacility>div span,.j90xStaff>div small,.j90xMission>div small,.j90xPerson>div small{display:block;color:#87939b;font-size:7px;margin-top:2px}.j90xFacility>small{grid-column:1 / -1;color:#a7b2b8;font-size:8px}.j90xFacility button,.j90xStaff button,.j90xMission button{grid-column:1 / -1;width:100%}.j90xStaff strong{color:#f5b942;font-size:18px}'+
      '.j90xTopAction{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px}.j90xTopAction b{display:block;font-size:11px}.j90xTopAction small{display:block;color:#87939b;font-size:8px}.j90xPerson{margin-bottom:6px;grid-template-columns:minmax(0,1fr) auto auto}.j90xPerson>span{font-size:9px;color:#f5b942}.j90xPerson button{min-height:30px;border:1px solid #29343c;background:#121a21;color:#dfe5e7;border-radius:7px;padding:4px 6px;font-size:8px}.j90xMissionGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:8px}.j90xMission{margin-bottom:6px}.j90xNote,.j90xEmpty{padding:9px;border-radius:8px;background:#090f14;color:#87939b;font-size:9px;border:1px solid #1b242a}.j90xRows>div,.j90xLog{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid #1d272e;font-size:9px}.j90xRows>div:last-child{border-bottom:0}.j90xRows b{color:#f5b942}.j90xAward{padding:8px;margin:5px 0;border:1px solid #51431f;border-radius:8px;background:#15130d;color:#f5b942;font-weight:800;font-size:9px}.j90xArchive>div:first-child b{display:block;font-size:9px}.j90xArchive>div:first-child small{display:block;color:#87939b;font-size:7px;margin:2px 0 7px}.j90xArchiveRow{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #1d272e;font-size:8px}.j90xHeroMedia{position:relative;aspect-ratio:16/9;border-radius:10px;overflow:hidden;border:1px solid #29343c;background:#0c1218}.j90xHeroMedia img{width:100%;height:100%;object-fit:cover;display:block}.j90xMediaFallback{display:grid;place-items:center;height:100%;font-size:48px;color:#f5b942;background:linear-gradient(135deg,#121c25,#23373e)}.j90xMediaOverlay{position:absolute;left:0;right:0;bottom:0;padding:28px 10px 10px;background:linear-gradient(transparent,rgba(0,0,0,.78))}.j90xMediaOverlay b{display:block;font-size:12px}.j90xMediaOverlay span{display:block;color:#b8c1c5;font-size:7px;margin-top:2px}.j90xMediaControls{display:grid;grid-template-columns:1fr auto 1fr;gap:7px;align-items:center;margin:7px 0}.j90xMediaControls button{border:1px solid #29343c;background:#121a21;color:#e1e7e8;border-radius:8px;min-height:34px;font-size:8px}.j90xMediaControls strong{text-align:center;color:#f5b942;font-size:9px}'+
      '@media(max-width:600px){.j90xNav button{font-size:8px}.j90xFacilityGrid{grid-template-columns:1fr}.j90xGrid4{grid-template-columns:repeat(2,1fr)}.j90xPerson{grid-template-columns:minmax(0,1fr) auto auto}.j90xBody{padding-left:8px;padding-right:8px}}';
    document.head.appendChild(st)
  }
  function open(){
    var s=manager();if(!s||!s.manager){toast('Entre em uma carreira','O Centro Plus fica disponível no Manager.');return}
    ensureStyle();
    var old=document.getElementById('j90Expansion');if(old){old.remove();return}
    var el=document.createElement('section');el.id='j90Expansion';
    el.innerHTML='<header class="j90xHeader"><div><b>CENTRO JORNADA 90</b><small>'+esc(clubName())+' · sistemas avançados</small></div><button class="j90xClose" data-j90x="close">FECHAR</button></header><nav class="j90xNav">'+NAV.map(function(x){return '<button class="'+(active===x[0]?'on':'')+'" data-j90x="tab:'+x[0]+'">'+esc(x[1])+'</button>'}).join('')+'</nav><main class="j90xBody"></main>';
    document.body.appendChild(el);
    el.addEventListener('click',handleClick);
    renderPanel()
  }
  function close(){
    var el=document.getElementById('j90Expansion');if(el)el.remove()
  }
  function rerender(){
    var b=bridge();if(b&&typeof b.save==='function')b.save();
    var rb=bridge();if(rb&&typeof rb.render==='function')rb.render(1);
    renderPanel()
  }
  function handleWeather(k){
    var a=window.J90Ambience;
    if(a&&typeof a.setWeather==='function'){a.setWeather(k,k==='heavyRain'?.9:k==='lightRain'?.4:0);toast('Ambiente atualizado',k);renderPanel()}
  }
  function handleClick(ev){
    var a=ev.target.closest&&ev.target.closest('[data-j90x]');if(!a)return;
    var action=a.getAttribute('data-j90x')||'';
    if(action==='close'){close();return}
    if(action.indexOf('tab:')===0){active=action.slice(4);renderPanel();return}
    if(action==='scenePrev'){sceneIndex=Math.max(0,sceneIndex-1);var d=state();d.sceneIndex=sceneIndex;persist(d);renderPanel();return}
    if(action==='sceneNext'){var list=sceneList();sceneIndex=Math.min(Math.max(0,list.length-1),sceneIndex+1);var d2=state();d2.sceneIndex=sceneIndex;persist(d2);renderPanel();return}
    var parts=action.split(':');var cmd=parts[0],arg=parts.slice(1).join(':');
    if(cmd==='upgrade'){upgrade(arg);return}
    if(cmd==='hire'){hire(arg);return}
    if(cmd==='academyIntake'){academyIntake();return}
    if(cmd==='releaseYouth'){releaseYouth(arg);return}
    if(cmd==='promote'){promote(arg);return}
    if(cmd==='mission'){mission(arg);return}
    if(cmd==='claim'){claimMission(Number(arg));return}
    if(cmd==='sponsor'){signSponsor(arg);return}
    if(cmd==='press'){press(arg);return}
    if(cmd==='weather'){handleWeather(arg);return}
  }
  function renderPanel(){
    var el=document.getElementById('j90Expansion'),s=manager();if(!el||!s)return;
    var d=state();computedRecords(d,s);persist(d);
    var nav=el.querySelector('.j90xNav'),body=el.querySelector('.j90xBody');
    if(nav)nav.innerHTML=NAV.map(function(x){return '<button class="'+(active===x[0]?'on':'')+'" data-j90x="tab:'+x[0]+'">'+esc(x[1])+'</button>'}).join('');
    if(body)body.innerHTML=panelBody(d,s)
  }
  window.J90Expansion={open:open,close:close,render:renderPanel,state:state};
})();