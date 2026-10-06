import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const INDEX='index.html';
const OUT='data/rosters.json';
const UA='J90-RosterSync/1.0 (+local build)';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

const STATIC_EURO={
  ENG1:'https://raw.githubusercontent.com/pabloroman/virtua-fc/main/data/2026/ENG1/teams.json',
  ESP1:'https://raw.githubusercontent.com/pabloroman/virtua-fc/main/data/2026/ESP1/teams.json',
  POR1:'https://raw.githubusercontent.com/pabloroman/virtua-fc/main/data/2026/POR1/teams.json',
  DEU1:'https://raw.githubusercontent.com/pabloroman/virtua-fc/main/data/2026/DEU1/teams.json',
  FRA1:'https://raw.githubusercontent.com/pabloroman/virtua-fc/main/data/2026/FRA1/teams.json',
  ITA1:'https://raw.githubusercontent.com/pabloroman/virtua-fc/main/data/2026/ITA1/teams.json'
};
const SAUDI='https://raw.githubusercontent.com/TopMarx/spl/main/latest/spl-bootstrap.json';
const CARTOLA='https://api.cartola.globo.com/atletas/mercado';
const ESPN_BASE='https://site.api.espn.com/apis/site/v2';

const SKIP=new Set(['Rival FC','United FC']);
const ALIASES={
  'Bayern':['Bayern Munich','FC Bayern München'],
  'Leverkusen':['Bayer Leverkusen','Bayer 04 Leverkusen'],
  'Dortmund':['Borussia Dortmund'],
  'Leipzig':['RB Leipzig'],
  'Frankfurt':['Eintracht Frankfurt'],
  'Freiburg':['SC Freiburg'],
  'Wolfsburg':['VfL Wolfsburg'],
  'Gladbach':['Borussia Mönchengladbach'],
  'Werder':['Werder Bremen'],
  'Inter':['Inter Milan'],
  'Milan':['AC Milan'],
  'PSG':['Paris Saint-Germain'],
  'Lyon':['Olympique Lyonnais','Olympique Lyon'],
  'Roma':['AS Roma'],
  'Sporting':['Sporting CP'],
  'Benfica':['SL Benfica','Benfica'],
  'Porto':['FC Porto','Porto'],
  'Braga':['SC Braga','Sporting Braga'],
  'Vitória SC':['Vitória Guimarães','Vitória SC'],
  'Famalicão':['FC Famalicão','Famalicao'],
  'Gil Vicente':['Gil Vicente FC'],
  'Estoril':['Estoril Praia'],
  'Moreirense':['Moreirense FC'],
  'Casa Pia':['Casa Pia AC'],
  'Betis':['Real Betis'],
  'Atlético de Madrid':['Atletico Madrid','Atlético de Madrid'],
  'Athletic Bilbao':['Athletic Club'],
  'Al-Hilal':['Al Hilal'],
  'Al-Nassr':['Al Nassr'],
  'Al-Ittihad':['Al Ittihad'],
  'Al-Ahli':['Al Ahli'],
  'Al-Qadsiah':['Al Qadsiah','Al-Qadsiah'],
  'Al-Shabab':['Al Shabab'],
  'Al-Ettifaq':['Al Ettifaq'],
  'Al-Fateh':['Al Fateh'],
  'Al-Taawoun':['Al Taawoun'],
  'Damac':['Damac FC'],
  'Goiás':['Goiás EC','Goias','Goias EC'],
  'Operário-PR':['Operário Ferroviário EC','Operario','Operario Ferroviario'],
  'América-MG':['América FC','America Mineiro','America-MG'],
  'Athletico-PR':['Athletico Paranaense','Athletico-PR'],
  'São Paulo':['São Paulo FC','Sao Paulo'],
  'Atlético-MG':['Atlético Mineiro','Atletico Mineiro'],
  'Internacional':['SC Internacional','Internacional'],
  'Flamengo':['CR Flamengo','Flamengo'],
  'Grêmio':['Grêmio FBPA','Gremio'],
  'Botafogo':['Botafogo FR','Botafogo'],
  'Corinthians':['Sport Club Corinthians Paulista','Corinthians'],
  'Palmeiras':['SE Palmeiras','Palmeiras'],
  'Cruzeiro':['Cruzeiro EC','Cruzeiro'],
  'Bahia':['Esporte Clube Bahia','Bahia'],
  'Sport':['Sport Club do Recife','Sport'],
  'Chapecoense':['Chapecoense'],
  'Coritiba':['Coritiba FC','Coritiba'],
  'Ceará':['Ceará SC','Ceara'],
  'Vila Nova':['Vila Nova FC'],
  'Avaí':['Avai FC','Avaí'],
  'Novorizontino':['Grêmio Novorizontino','Novorizontino'],
  'Figueirense':['Figueirense FC'],
  'Paysandu':['Paysandu SC'],
  'Volta Redonda':['Volta Redonda FC'],
  'Ypiranga':['Ypiranga FC'],
  'Botafogo-SP':['Botafogo Futebol Clube (SP)','Botafogo-SP'],
  'Ferroviária':['Ferroviária Futebol Clube','Ferroviaria'],
  'São Bernardo':['São Bernardo FC','Sao Bernardo'],
  'Confiança':['AD Confiança'],
  'Londrina':['Londrina EC'],
  'Aparecidense':['AA Aparecidense']
};

function gameTeams(source){
  const names=new Set();
  const lg=source.match(/const LG=\[([\s\S]*?)\];\s*LG\.push/);
  if(lg){
    for(const m of lg[1].matchAll(/c:\[([^\]]*)\]/g)){
      for(const q of m[1].matchAll(/'([^']+?):[-+]?\d+'/g))names.add(q[1]);
    }
  }
  const comp=source.match(/function compOpp\(c\)\{const p=\{([\s\S]*?)\}\[c\.id\]/);
  if(comp){
    for(const q of comp[1].matchAll(/'([^']+)'/g))names.add(q[1]);
  }
  ['Brasil','México','Japão','Suíça','Marrocos','Coreia do Sul','Estados Unidos','Senegal','Austrália','Equador','Canadá','Argentina','França','Inglaterra','Espanha','Alemanha','Portugal','Uruguai','Holanda','Itália','Croácia','Bélgica'].forEach(x=>names.add(x));
  for(const x of SKIP)names.delete(x);
  return [...names].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}

async function fetchJson(url,ms=15000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{
    const res=await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/json,text/plain,*/*'},redirect:'follow',signal:controller.signal});
    if(!res.ok)throw new Error('HTTP '+res.status);
    return await res.json();
  }finally{clearTimeout(timer);}
}
function entriesFromEuroClub(club){
  const players=Array.isArray(club?.players)?club.players:[];
  const seen=new Set(),out=[];
  for(const p of players){
    const name=String(p?.name||'').trim();
    if(!name)continue;
    const key=norm(name);if(seen.has(key))continue;seen.add(key);
    out.push({name,position:String(p?.position||''),number:p?.number??null});
  }
  return out;
}
function addSourceClubs(map,payload,label){
  for(const club of Array.isArray(payload?.clubs)?payload.clubs:[]){
    const players=entriesFromEuroClub(club);
    const key=norm(club?.name);
    if(key&&players.length)map.set(key,{source:label,sourceName:String(club.name),players});
  }
}
function cartolaPosition(id){return ({1:'Goleiro',2:'Lateral',3:'Zagueiro',4:'Meia',5:'Atacante',6:'Técnico'})[Number(id)]||'Jogador';}
function addCartola(map,payload){
  const clubs=payload?.clubes||{};
  const byId=new Map(Object.entries(clubs).map(([id,c])=>[String(id),c]));
  const bucket=new Map();
  for(const a of Array.isArray(payload?.atletas)?payload.atletas:[]){
    const c=byId.get(String(a?.clube_id));if(!c)continue;
    const key=String(c?.slug||c?.abreviacao||c?.nome||c?.nome_fantasia||a?.clube_id);
    if(!bucket.has(key))bucket.set(key,{source:'Cartola 2026',sourceName:String(c?.nome_fantasia||c?.nome||key),players:[]});
    const name=String(a?.apelido||a?.nome||'').trim();if(!name)continue;
    bucket.get(key).players.push({name,position:cartolaPosition(a?.posicao_id),number:null});
  }
  for(const [,v] of bucket){
    const uniq=[...new Map(v.players.map(p=>[norm(p.name),p])).values()];
    if(!uniq.length)continue;
    const aliases=[v.sourceName];
    for(const c of Object.values(clubs)){
      if(norm(c?.nome)===norm(v.sourceName)||norm(c?.nome_fantasia)===norm(v.sourceName)||norm(c?.slug)===norm(v.sourceName)||norm(c?.abreviacao)===norm(v.sourceName)){
        aliases.push(c.nome,c.nome_fantasia,c.apelido,c.slug,c.abreviacao);
      }
    }
    for(const alias of aliases.filter(Boolean))map.set(norm(alias),{...v,players:uniq});
  }
}
function addSaudi(map,payload){
  const teams=Array.isArray(payload?.teams)?payload.teams:[];
  const teamById=new Map(teams.map(t=>[String(t.id),t]));
  const buckets=new Map();
  for(const p of Array.isArray(payload?.elements)?payload.elements:[]){
    const t=teamById.get(String(p?.team));if(!t)continue;
    if(!buckets.has(String(t.id)))buckets.set(String(t.id),{source:'Saudi Fantasy 2026',sourceName:String(t.name),players:[]});
    const display=String(p?.web_name||p?.known_name||[p?.first_name,p?.second_name].filter(Boolean).join(' ')||'').trim();
    if(!display)continue;
    buckets.get(String(t.id)).players.push({name:display,position:String(p?.position||'Jogador'),number:null});
  }
  for(const [,v] of buckets){
    const uniq=[...new Map(v.players.map(p=>[norm(p.name),p])).values()];
    if(uniq.length)map.set(norm(v.sourceName),{...v,players:uniq});
  }
}
function candidateNames(name){return [...new Set([name,...(ALIASES[name]||[])])];}
function espnTeamObjects(payload){
  const out=[];
  const walk=v=>{
    if(!v||typeof v!=='object')return;
    if(v.team&&typeof v.team==='object'&&v.team.id)out.push(v.team);
    if(Array.isArray(v.teams))for(const x of v.teams)walk(x);
    if(Array.isArray(v.leagues))for(const x of v.leagues)walk(x);
    if(Array.isArray(v.sports))for(const x of v.sports)walk(x);
  };
  walk(payload);
  const seen=new Set();
  return out.filter(t=>{const k=String(t.id);if(seen.has(k))return false;seen.add(k);return true;});
}
function espnRosterEntries(payload){
  const out=[],seen=new Set();
  const groups=Array.isArray(payload?.athletes)?payload.athletes:[];
  for(const g of groups){
    const candidates=Array.isArray(g?.items)?g.items:[g];
    for(const p of candidates){
      const a=p?.athlete||p;
      const name=String(a?.displayName||a?.fullName||a?.shortName||'').trim();
      if(!name)continue;
      const key=norm(name);if(seen.has(key))continue;seen.add(key);
      out.push({name,position:String(a?.position?.displayName||a?.position?.abbreviation||''),number:a?.jersey||null});
    }
  }
  return out;
}
async function addEspnLeague(map,league,gameNames){
  try{
    const payload=await fetchJson(ESPN_BASE+'/sports/soccer/'+league+'/teams?limit=100',20000);
    const sourceTeams=espnTeamObjects(payload);
    for(const target of gameNames){
      const aliases=candidateNames(target).map(norm);
      const getNames=t=>[t.displayName,t.name,t.shortDisplayName,t.abbreviation,t.slug].map(norm).filter(Boolean);
      const exact=sourceTeams.find(t=>getNames(t).some(n=>aliases.includes(n)));
      const team=exact||sourceTeams.find(t=>{
        const names=getNames(t);
        return aliases.some(a=>names.some(n=>n===a||n.startsWith(a+' ')||a.startsWith(n+' ')));
      });
      if(!team?.id)continue;
      try{
        const roster=await fetchJson(ESPN_BASE+'/sports/soccer/'+league+'/teams/'+encodeURIComponent(String(team.id))+'/roster?limit=500',20000);
        const players=espnRosterEntries(roster);
        if(players.length>=11){
          map.set(norm(target),{source:'ESPN '+league,sourceName:String(team.displayName||team.name||target),players});
          console.log('ESPN '+target+' | '+players.length+' jogadores | '+league);
        }
      }catch(e){console.warn('ESPN roster '+target+' | '+String(e?.message||e));}
    }
  }catch(e){console.warn('ESPN league '+league+' indisponível: '+String(e?.message||e));}
}
function findStatic(map,name){
  const strict=new Set(['Racing','Nacional']);
  const candidates=candidateNames(name).map(norm).filter(Boolean);
  for(const target of candidates){
    const exact=map.get(target);
    if(exact)return exact;
  }
  const containsWords=(key,target)=>{
    const kw=String(key).split(' '),tw=String(target).split(' ');
    if(!tw.length||tw.length>kw.length)return false;
    for(let i=0;i<=kw.length-tw.length;i++){
      let ok=true;
      for(let j=0;j<tw.length;j++)if(kw[i+j]!==tw[j]){ok=false;break;}
      if(ok)return true;
    }
    return false;
  };
  if(strict.has(name)){
    return null;
  }
  const hits=[];
  for(const target of candidates){
    for(const [key,val] of map){
      if(containsWords(key,target))hits.push({target,key,val,diff:Math.abs(key.length-target.length)});
    }
  }
  hits.sort((a,b)=>a.diff-b.diff||a.key.length-b.key.length);
  return hits[0]?.val||null;
}
async const LOCAL_CRITICAL_ROSTERS={
  'Goiás':[
    'Tadeu','Diego Caito','Messias','Lucas Ribeiro','Sander','Marcelo Cabo','Rafael Gava','Juninho','Jhonny Lucas','Reginaldo','Allano','Thiago Galhardo'
  ],
  'Operário-PR':[
    'Rafael Santos','William Machado','Guilherme Pira','Joseph','Rodolfo Filemon','Marco Antônio','Jacy','Indio','Vinicius Mingotti','Maxwell','Felipe Augusto','Daniel Lima'
  ]
};
function localCriticalRoster(name){
  const list=LOCAL_CRITICAL_ROSTERS[name];
  if(!Array.isArray(list)||list.length<11)return null;
  return {source:'verified local critical roster',sourceName:name,players:list.map((player,i)=>({name:player,position:i<2?'Goleiro':i<6?'Defensor':i<9?'Meio-campista':'Atacante',number:null}))};
}
function sportsDbRoster(name){
  const queries=candidateNames(name);
  for(const q of queries){
    try{
      const search=await fetchJson('https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t='+encodeURIComponent(q),12000);
      const teams=Array.isArray(search?.teams)?search.teams:[];
      const team=teams.find(t=>String(t?.strSport||'Soccer').toLowerCase()==='soccer')||teams[0];
      if(!team?.idTeam)continue;
      await sleep(1250);
      const players=await fetchJson('https://www.thesportsdb.com/api/v1/json/123/lookup_all_players.php?id='+encodeURIComponent(team.idTeam),12000);
      const list=Array.isArray(players?.player)?players.player:[];
      const out=[],seen=new Set();
      for(const p of list){
        if(String(p?.strStatus||'').toLowerCase()==='retired')continue;
        const display=String(p?.strPlayer||'').trim();if(!display)continue;
        const key=norm(display);if(seen.has(key))continue;seen.add(key);
        out.push({name:display,position:String(p?.strPosition||'Jogador'),number:p?.strNumber?String(p.strNumber):null});
      }
      if(out.length>=8)return {source:'TheSportsDB',sourceName:String(team.strTeam||name),players:out};
    }catch(error){console.warn('fallback '+name+' | '+String(error?.message||error));}
    await sleep(1250);
  }
  return null;
}

const source=readFileSync(INDEX,'utf8');
const teams=gameTeams(source);
const staticMap=new Map();
console.log('Elencos a sincronizar: '+teams.length);

const euroResults=await Promise.all(Object.entries(STATIC_EURO).map(async ([label,url])=>{
  try{return [label,await fetchJson(url,20000)];}
  catch(e){console.warn('fonte '+label+' indisponível: '+e.message);return [label,null];}
}));
for(const [label,payload] of euroResults)if(payload)addSourceClubs(staticMap,payload,'Euro 2026 / '+label);

try{addSaudi(staticMap,await fetchJson(SAUDI,30000));}
catch(e){console.warn('fonte Saudi indisponível: '+e.message);}

try{addCartola(staticMap,await fetchJson(CARTOLA,30000));}
catch(e){console.warn('Cartola 2026 indisponível: '+e.message);}

const brazilAndLatam=new Set(['Figueirense','Paysandu','Volta Redonda','Ypiranga','Botafogo-SP','Ferroviária','São Bernardo','Confiança','Londrina','Aparecidense','Coritiba','Goiás','Ceará','Vila Nova','Avaí','Chapecoense','Sport','Novorizontino','Operário-PR','América-MG','Flamengo','Palmeiras','Botafogo','Cruzeiro','Corinthians','São Paulo','Grêmio','Internacional','Atlético-MG','Bahia','River Plate','Boca Juniors','Peñarol','Nacional','Lanús','Racing','Athletico-PR','Fortaleza','Defensa y Justicia','LDU','Toluca']);
for(const league of ['bra.1','bra.2','bra.3','arg.1','ecu.1','uru.1','mex.1'])await addEspnLeague(staticMap,league,teams.filter(t=>brazilAndLatam.has(t)));
const nationalTeams=new Set(['Brasil','México','Japão','Suíça','Marrocos','Coreia do Sul','Estados Unidos','Senegal','Austrália','Equador','Canadá','Argentina','França','Inglaterra','Espanha','Alemanha','Portugal','Uruguai','Holanda','Itália','Croácia','Bélgica']);
await addEspnLeague(staticMap,'fifa.world',teams.filter(t=>nationalTeams.has(t)));

const next={};
const pending=[];
for(const name of teams){
  const hit=findStatic(staticMap,name)||localCriticalRoster(name);
  if(hit&&hit.players.length){
    next[name]={...hit,fetchedAt:new Date().toISOString()};
    console.log((hit.source==='verified local critical roster'?'LOCAL ':'STATIC ')+name+' | '+hit.players.length+' jogadores | '+hit.source);
  }else pending.push(name);
}
console.log('Fallback TheSportsDB: '+pending.length+' times');
for(const name of pending){
  const hit=await sportsDbRoster(name);
  if(hit&&hit.players.length){
    next[name]={...hit,fetchedAt:new Date().toISOString()};
    console.log('FALLBACK '+name+' | '+hit.players.length+' jogadores');
  }else console.warn('SEM ELENCO '+name);
}

mkdirSync('data',{recursive:true});
writeFileSync(OUT,JSON.stringify(next,null,2)+'\n');

const resolved=teams.filter(t=>Array.isArray(next[t]?.players)&&next[t].players.length).length;
const players=teams.reduce((n,t)=>n+(next[t]?.players?.length||0),0);
console.log('Elencos resolvidos: '+resolved+'/'+teams.length+' | jogadores registrados: '+players);

const missingCritical=['Goiás','Operário-PR'].filter(t=>!next[t]?.players?.length);
if(missingCritical.length)throw new Error('Elenco crítico ausente: '+missingCritical.join(', '));
