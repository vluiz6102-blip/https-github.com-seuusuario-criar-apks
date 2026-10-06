import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const INDEX='index.html';
const OUT='data/rosters.json';
const BASES=['https://api.sofascore.com/api/v1','https://www.sofascore.com/api/v1'];
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36';
const SKIP=new Set(['Rival FC','United FC']);
const ALIASES={
  'Bayern':'Bayern Munich',
  'Inter':'Inter Milan',
  'Milan':'AC Milan',
  'PSG':'Paris Saint-Germain',
  'Lyon':'Olympique Lyonnais',
  'Roma':'AS Roma',
  'Sporting':'Sporting CP',
  'Betis':'Real Betis'
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

async function getJson(path){
  let last;
  for(const base of BASES){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),7000);
    try{
      const res=await fetch(base+path,{headers:{'User-Agent':UA,'Accept':'application/json'},signal:controller.signal});
      if(!res.ok)throw new Error('HTTP '+res.status);
      return await res.json();
    }catch(e){
      last=e?.name==='AbortError'?new Error('timeout 7s'):e;
    }finally{
      clearTimeout(timer);
    }
  }
  throw last||new Error('request failed');
}
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
  const national=['Brasil','México','Japão','Suíça','Marrocos','Coreia do Sul','Estados Unidos','Senegal','Austrália','Equador','Canadá','Argentina','França','Inglaterra','Espanha','Alemanha','Portugal','Uruguai','Holanda','Itália','Croácia','Bélgica'];
  national.forEach(x=>names.add(x));
  for(const x of SKIP)names.delete(x);
  return [...names].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function pickTeam(results,target){
  const items=Array.isArray(results?.results)?results.results:[];
  const teams=items.filter(x=>!x?.type||x.type==='team').map(x=>x?.entity||x?.team||x).filter(x=>x&&(x.id||x.team?.id));
  const exact=teams.find(x=>norm(x.name)===norm(target));
  if(exact)return exact;
  const alias=ALIASES[target]||target;
  const aliasExact=teams.find(x=>norm(x.name)===norm(alias));
  if(aliasExact)return aliasExact;
  return teams.find(x=>norm(x.name).includes(norm(alias))||norm(alias).includes(norm(x.name)))||null;
}
function rosterEntries(payload){
  const list=Array.isArray(payload?.players)?payload.players:[];
  const out=[],seen=new Set();
  for(const item of list){
    const p=item?.player||item;
    if(!p?.name)continue;
    const key=p.id||norm(p.name);
    if(seen.has(key))continue;
    seen.add(key);
    out.push({id:p.id??null,name:String(p.name),position:String(p.position||p.positionCode||''),number:p.jerseyNumber??p.shirtNumber??item?.jerseyNumber??item?.shirtNumber??null});
  }
  return out;
}
const existing=existsSync(OUT)?JSON.parse(readFileSync(OUT,'utf8')):{};
const source=readFileSync(INDEX,'utf8');
const teams=gameTeams(source);
const next={...existing};
const unresolved=[];
console.log('Elencos a sincronizar: '+teams.length);
let cursor=0;
async function worker(){
  while(true){
    const i=cursor++;
    if(i>=teams.length)return;
    const name=teams[i];
    try{
      const query=encodeURIComponent(ALIASES[name]||name);
      const search=await getJson('/search/all?q='+query);
      const found=pickTeam(search,name);
      if(!found?.id)throw new Error('time não localizado');
      const roster=await getJson('/team/'+found.id+'/players');
      const players=rosterEntries(roster);
      if(!players.length)throw new Error('elenco vazio');
      next[name]={teamId:found.id,teamName:String(found.name||name),source:'Sofascore',fetchedAt:new Date().toISOString(),players};
      console.log('OK '+name+' | '+players.length+' jogadores | '+found.id);
    }catch(error){
      unresolved.push({name,error:String(error?.message||error)});
      console.warn('PENDENTE '+name+' | '+String(error?.message||error));
    }
    await sleep(150);
  }
}
await Promise.all(Array.from({length:6},()=>worker()));
mkdirSync('data',{recursive:true});
writeFileSync(OUT,JSON.stringify(next,null,2)+'\n');
const resolved=teams.filter(t=>Array.isArray(next[t]?.players)&&next[t].players.length).length;
const players=teams.reduce((n,t)=>n+(next[t]?.players?.length||0),0);
console.log('Elencos resolvidos: '+resolved+'/'+teams.length+' | jogadores registrados: '+players);
if(unresolved.length)console.warn('Times pendentes: '+unresolved.map(x=>x.name).join(', '));
